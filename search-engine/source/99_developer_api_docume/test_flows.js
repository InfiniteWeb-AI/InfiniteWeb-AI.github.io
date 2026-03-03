if (typeof localStorage === 'undefined' || localStorage === null) {
  function LocalStoragePolyfill() {
    this._data = {};
  }
  LocalStoragePolyfill.prototype.setItem = function (key, value) {
    this._data[key] = String(value);
  };
  LocalStoragePolyfill.prototype.getItem = function (key) {
    return Object.prototype.hasOwnProperty.call(this._data, key)
      ? this._data[key]
      : null;
  };
  LocalStoragePolyfill.prototype.removeItem = function (key) {
    delete this._data[key];
  };
  LocalStoragePolyfill.prototype.clear = function () {
    this._data = {};
  };
  Object.defineProperty(LocalStoragePolyfill.prototype, 'length', {
    get: function () {
      return Object.keys(this._data).length;
    },
  });
  LocalStoragePolyfill.prototype.key = function (i) {
    return Object.keys(this._data)[i] || null;
  };
  global.localStorage = new LocalStoragePolyfill();
}

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    localStorage.clear();
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Generated Data copied exactly as provided
    const generatedData = {
      sdk_code_examples: [
        {
          id: 'ex_customers_delete_python',
          methodId: 'customers_delete',
          language: 'python',
          title: 'Delete a customer by ID',
          code:
            'import acme_api\n\nclient = acme_api.Client(api_key="sk_test_123")\n\n# Delete an existing customer by ID\nclient.customers.delete_customer(customer_id="cus_123456789")\n',
          hasCopyButton: true,
          isDefault: true,
        },
        {
          id: 'ex_customers_get_python',
          methodId: 'customers_get',
          language: 'python',
          title: 'Retrieve a customer',
          code:
            'import acme_api\n\nclient = acme_api.Client(api_key="sk_test_123")\n\ncustomer = client.customers.get_customer(customer_id="cus_123456789")\nprint(customer.id, customer.email)\n',
          hasCopyButton: true,
          isDefault: true,
        },
        {
          id: 'ex_orders_get_python',
          methodId: 'orders_get',
          language: 'python',
          title: 'Get order details',
          code:
            'import acme_api\n\nclient = acme_api.Client(api_key="sk_test_123")\n\norder = client.orders.get_order(order_id="ord_987654321", include=["items"]) \nprint(order.id, order.status, len(order.items))\n',
          hasCopyButton: true,
          isDefault: true,
        },
      ],
      navigation_links: [
        {
          id: 'nav_home_header',
          text: 'Home',
          pageId: 'home',
          url: 'index.html',
          location: 'header',
          description: 'Documentation homepage',
          position: 1,
        },
        {
          id: 'nav_api_reference_header',
          text: 'API Reference',
          pageId: 'api_reference',
          url: 'api_reference.html',
          location: 'header',
          description:
            'Endpoint reference with Try-It console and code samples',
          position: 2,
        },
        {
          id: 'nav_guides_header',
          text: 'Guides',
          pageId: 'guides',
          url: 'guides.html',
          location: 'header',
          description:
            'Conceptual guides, including links to Rate Limits and other topics',
          position: 3,
        },
      ],
      webhook_events: [
        {
          id: 'wh_event_invoice_paid',
          groupId: 'invoice_events',
          name: 'invoice.paid',
          displayName: 'Invoice paid',
          description:
            'Triggered when an invoice has been successfully paid and the payment is captured.',
          isActive: true,
          docsUrl: 'webhooks_invoice_paid.html',
        },
        {
          id: 'wh_event_invoice_created',
          groupId: 'invoice_events',
          name: 'invoice.created',
          displayName: 'Invoice created',
          description:
            'Occurs whenever a new invoice is created, before any payment attempt.',
          isActive: true,
          docsUrl: 'webhooks_invoice_created.html',
        },
        {
          id: 'wh_event_invoice_finalized',
          groupId: 'invoice_events',
          name: 'invoice.finalized',
          displayName: 'Invoice finalized',
          description:
            'Sent when a draft invoice is finalized and ready to be sent or paid.',
          isActive: true,
          docsUrl: 'webhooks_invoice_finalized.html',
        },
      ],
      webhook_payload_examples: [
        {
          id: 'wh_payload_invoice_paid_json',
          webhookEventId: 'wh_event_invoice_paid',
          format: 'json',
          title: 'Invoice paid event payload (JSON)',
          payloadJson:
            '{\n  "id": "evt_0000000001",\n  "type": "invoice.paid",\n  "created": 1706803200,\n  "livemode": false,\n  "data": {\n    "object": {\n      "id": "inv_00001",\n      "number": "2024-0001",\n      "customer_id": "cus_123456789",\n      "status": "paid",\n      "currency": "usd",\n      "total": 4999,\n      "subtotal": 4999,\n      "tax": 0,\n      "discount_total": 0,\n      "due_date": "2024-02-01T00:00:00Z",\n      "paid_at": "2024-02-01T10:15:30Z",\n      "lines": [\n        {\n          "id": "il_001",\n          "description": "Pro plan (Feb 2024)",\n          "quantity": 1,\n          "unit_amount": 4999,\n          "amount": 4999\n        }\n      ],\n      "metadata": {\n        "environment": "sandbox"\n      }\n    }\n  },\n  "request": {\n    "id": "req_0000000001",\n    "idempotency_key": "a1b2c3d4-invoice-paid"\n  }\n}',
          hasCopyButton: true,
          isDefault: true,
        },
        {
          id: 'wh_payload_invoice_created_json',
          webhookEventId: 'wh_event_invoice_created',
          format: 'json',
          title: 'Invoice created event payload (JSON)',
          payloadJson:
            '{\n  "id": "evt_0000000002",\n  "type": "invoice.created",\n  "created": 1706716800,\n  "livemode": false,\n  "data": {\n    "object": {\n      "id": "inv_00002",\n      "number": "2024-0002",\n      "customer_id": "cus_987654321",\n      "status": "draft",\n      "currency": "usd",\n      "total": 1299,\n      "subtotal": 1299,\n      "tax": 0,\n      "discount_total": 0,\n      "due_date": "2024-02-05T00:00:00Z",\n      "lines": [\n        {\n          "id": "il_002",\n          "description": "Addon storage (Feb 2024)",\n          "quantity": 1,\n          "unit_amount": 1299,\n          "amount": 1299\n        }\n      ],\n      "metadata": {}\n    }\n  },\n  "request": {\n    "id": "req_0000000002",\n    "idempotency_key": null\n  }\n}',
          hasCopyButton: true,
          isDefault: true,
        },
        {
          id: 'wh_payload_invoice_payment_failed_json',
          webhookEventId: 'wh_event_invoice_payment_failed',
          format: 'json',
          title: 'Invoice payment failed event payload (JSON)',
          payloadJson:
            '{\n  "id": "evt_0000000003",\n  "type": "invoice.payment_failed",\n  "created": 1706893200,\n  "livemode": false,\n  "data": {\n    "object": {\n      "id": "inv_00003",\n      "number": "2024-0003",\n      "customer_id": "cus_123456789",\n      "status": "open",\n      "currency": "usd",\n      "total": 4999,\n      "attempt_count": 1,\n      "next_payment_attempt": "2024-02-03T09:00:00Z",\n      "last_payment_error": {\n        "code": "card_declined",\n        "message": "Your card was declined.",\n        "decline_code": "insufficient_funds"\n      }\n    }\n  },\n  "request": {\n    "id": "req_0000000003",\n    "idempotency_key": "retry-01"\n  }\n}',
          hasCopyButton: true,
          isDefault: true,
        },
      ],
      try_it_consoles: [
        {
          id: 'tryit_get_users_v1',
          endpointVersionId: 'get_users_v1',
          isEnabled: true,
          methodSelectorEnabled: true,
          defaultQueryParams: ['per_page=20', 'page=1'],
          supportsAuth: true,
          lastUsedAt: '2026-02-28T15:30:00Z',
        },
        {
          id: 'tryit_get_orders_v1',
          endpointVersionId: 'get_orders_v1',
          isEnabled: true,
          methodSelectorEnabled: true,
          defaultQueryParams: ['status=all', 'per_page=25', 'page=1'],
          supportsAuth: true,
          lastUsedAt: '2026-02-28T16:05:00Z',
        },
        {
          id: 'tryit_get_order_by_id_v1',
          endpointVersionId: 'get_order_by_id_v1',
          isEnabled: true,
          methodSelectorEnabled: true,
          defaultQueryParams: [],
          supportsAuth: true,
          lastUsedAt: '2026-02-27T09:45:00Z',
        },
      ],
      api_endpoints: [
        {
          id: 'ep_create_project',
          resourceId: 'projects',
          name: 'Create Project',
          pathTemplate: '/projects',
          primaryHttpMethod: 'post',
          summary: 'Create a new project',
          description:
            'Creates a new project with the provided name and optional metadata.',
          hasVersioning: false,
          sidebarOrder: 1,
          hasTryItConsole: false,
        },
        {
          id: 'ep_list_projects',
          resourceId: 'projects',
          name: 'List Projects',
          pathTemplate: '/projects',
          primaryHttpMethod: 'get',
          summary: 'List projects',
          description:
            'Returns a paginated list of projects visible to the authenticated account.',
          hasVersioning: false,
          sidebarOrder: 2,
          hasTryItConsole: false,
        },
        {
          id: 'ep_get_project',
          resourceId: 'projects',
          name: 'Retrieve Project',
          pathTemplate: '/projects/{id}',
          primaryHttpMethod: 'get',
          summary: 'Retrieve a project',
          description: 'Fetches the details for a single project by its ID.',
          hasVersioning: false,
          sidebarOrder: 3,
          hasTryItConsole: false,
        },
      ],
      api_endpoint_versions: [
        {
          id: 'get_users_v1',
          endpointId: 'ep_list_users',
          apiVersion: 'v1',
          httpMethod: 'get',
          path: '/users',
          description:
            'List users with pagination and optional filters such as created_after, email, and status. Supports created_after and per_page parameters used in the Try-It console examples.',
          isDefault: true,
          docsPageId: 'api_reference',
          hasTryItConsole: true,
          hasCodeSamples: true,
        },
        {
          id: 'get_orders_v1',
          endpointId: 'ep_list_orders',
          apiVersion: 'v1',
          httpMethod: 'get',
          path: '/orders',
          description:
            'List orders with pagination, status filter, and sorting. Supports status, per_page, page, and sort (e.g., -created_at) query parameters used by the Try-It console.',
          isDefault: true,
          docsPageId: 'api_reference',
          hasTryItConsole: true,
          hasCodeSamples: true,
        },
        {
          id: 'get_order_by_id_v1',
          endpointId: 'ep_get_order',
          apiVersion: 'v1',
          httpMethod: 'get',
          path: '/orders/{id}',
          description:
            'Retrieve an order by ID. The v1 version returns core order fields and basic totals without expandable related collections.',
          isDefault: true,
          docsPageId: 'api_reference',
          hasTryItConsole: true,
          hasCodeSamples: true,
        },
      ],
      api_code_samples: [
        {
          id: 'cs_post_projects_node',
          endpointVersionId: 'post_projects_unversioned',
          language: 'node_js',
          title: 'Create a project (Node.js)',
          sampleType: 'request',
          code:
            "const fetch = require('node-fetch');\n\nasync function createProject() {\n  const response = await fetch('https://api.acme.com/projects', {\n    method: 'POST',\n    headers: {\n      'Authorization': 'Bearer YOUR_API_KEY',\n      'Content-Type': 'application/json',\n    },\n    body: JSON.stringify({\n      name: 'My First Project',\n      metadata: {\n        env: 'sandbox'\n      }\n    }),\n  });\n\n  const project = await response.json();\n  console.log(project.id, project.name);\n}\n\ncreateProject().catch(console.error);\n",
          isEditable: true,
          hasCopyButton: true,
          isDefault: true,
        },
        {
          id: 'cs_post_projects_curl',
          endpointVersionId: 'post_projects_unversioned',
          language: 'curl',
          title: 'Create a project (cURL)',
          sampleType: 'request',
          code:
            "curl https://api.acme.com/projects \\\n  -X POST \\\n  -H \"Authorization: Bearer YOUR_API_KEY\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\n    \"name\": \"My First Project\",\n    \"metadata\": {\n      \"env\": \"sandbox\"\n    }\n  }'\n",
          isEditable: false,
          hasCopyButton: true,
          isDefault: false,
        },
        {
          id: 'cs_get_users_curl',
          endpointVersionId: 'get_users_v1',
          language: 'curl',
          title: 'List users created after a specific date (cURL)',
          sampleType: 'request',
          code:
            'curl "https://api.acme.com/users?created_after=2023-01-01&per_page=25" \\\n  -H "Authorization: Bearer YOUR_API_KEY"\n',
          isEditable: false,
          hasCopyButton: true,
          isDefault: true,
        },
      ],
      api_parameters: [
        {
          id: 'param_get_users_created_after',
          endpointVersionId: 'get_users_v1',
          name: 'created_after',
          location: 'query',
          dataType: 'datetime',
          required: false,
          description:
            'Return only users created on or after this ISO 8601 date.',
          allowedValues: [],
          exampleValue: '2023-01-01',
          defaultValue: '',
        },
        {
          id: 'param_get_users_per_page',
          endpointVersionId: 'get_users_v1',
          name: 'per_page',
          location: 'query',
          dataType: 'number',
          required: false,
          description: 'Number of users to return per page.',
          allowedValues: [],
          exampleValue: '25',
          defaultValue: '20',
        },
        {
          id: 'param_get_users_page',
          endpointVersionId: 'get_users_v1',
          name: 'page',
          location: 'query',
          dataType: 'number',
          required: false,
          description: 'Page number to retrieve.',
          allowedValues: [],
          exampleValue: '1',
          defaultValue: '1',
        },
      ],
      pages: [
        {
          id: 'home',
          name: 'Home',
          filename: 'index.html',
          pageType: 'home',
          description:
            'Landing page for the Acme API documentation, with quick links to API Reference, Guides, Webhooks, SDKs, and Authentication.',
          hasSidebar: false,
          hasTryItConsole: false,
          hasCodeSamples: false,
        },
        {
          id: 'api_reference',
          name: 'API Reference',
          filename: 'api_reference.html',
          pageType: 'api_reference',
          description:
            'Complete reference for all REST API endpoints, including Try-It consoles and language-specific code samples.',
          hasSidebar: true,
          hasTryItConsole: true,
          hasCodeSamples: true,
        },
        {
          id: 'guides',
          name: 'Guides',
          filename: 'guides.html',
          pageType: 'guides_overview',
          description:
            'High-level conceptual documentation and how-to guides, including authentication, pagination, and rate limiting.',
          hasSidebar: true,
          hasTryItConsole: false,
          hasCodeSamples: false,
        },
      ],
      api_resources: [
        {
          id: 'projects',
          pageId: 'api_reference',
          name: 'Projects',
          slug: 'projects',
          description:
            'Endpoints for creating and managing projects, including POST /projects used in the Node.js code sample.',
          sidebarOrder: 1,
        },
        {
          id: 'users',
          pageId: 'api_reference',
          name: 'Users',
          slug: 'users',
          description:
            'Endpoints for listing and managing users, including GET /users with created_after and per_page filters.',
          sidebarOrder: 2,
        },
        {
          id: 'orders',
          pageId: 'api_reference',
          name: 'Orders',
          slug: 'orders',
          description:
            'Endpoints for listing and retrieving orders, including GET /orders and GET /orders/{id} with versioned behavior.',
          sidebarOrder: 3,
        },
      ],
      rate_limit_rules: [
        {
          id: 'rl_global_per_minute',
          scope: 'global',
          limitPerTimeWindow: 600,
          timeWindow: 'per_minute',
          description:
            'Default global rate limit of 600 requests per minute across all endpoints, unless overridden by a more specific rule.',
          docsPageId: 'rate_limits',
        },
        {
          id: 'rl_global_per_second',
          scope: 'global',
          limitPerTimeWindow: 10,
          timeWindow: 'per_second',
          description: 'Soft limit of 10 requests per second per API key.',
          docsPageId: 'rate_limits',
        },
        {
          id: 'rl_post_payments_per_minute',
          scope: 'endpoint',
          endpointId: 'ep_create_payment',
          httpMethod: 'post',
          path: '/payments',
          limitPerTimeWindow: 120,
          timeWindow: 'per_minute',
          description:
            'POST /payments is limited to 120 requests per minute per account to protect payment processing systems.',
          docsPageId: 'rate_limits',
        },
      ],
      sdks: [
        {
          id: 'sdk_python_official',
          pageId: 'sdk_python',
          name: 'Python SDK',
          language: 'python',
          description:
            'Official Python client library for the Acme API, including a Customers client with a delete_customer(customer_id=...) method and comprehensive examples.',
        },
        {
          id: 'sdk_node_official',
          pageId: 'sdk_node',
          name: 'Node.js SDK',
          language: 'node_js',
          description:
            'Official Node.js client library for the Acme API, with helpers for working with projects, users, orders, and payments.',
        },
      ],
      webhook_event_groups: [
        {
          id: 'invoice_events',
          pageId: 'webhooks_invoices',
          name: 'Invoice events',
          slug: 'invoice_events',
          description:
            'Webhook events related to invoices, including invoice.paid, invoice.created, and invoice.payment_failed, each with example JSON payloads.',
          sidebarOrder: 1,
        },
        {
          id: 'payment_events',
          pageId: 'webhooks_payments',
          name: 'Payment events',
          slug: 'payment_events',
          description:
            'Webhook events related to payments, such as payment.succeeded, payment.failed, and refund.created.',
          sidebarOrder: 2,
        },
        {
          id: 'customer_events',
          pageId: 'webhooks',
          name: 'Customer events',
          slug: 'customer_events',
          description:
            'Customer lifecycle webhook events, including customer.created, customer.updated, and customer.deleted.',
          sidebarOrder: 3,
        },
      ],
      sdk_modules: [
        {
          id: 'py_customers_module',
          sdkId: 'sdk_python_official',
          name: 'Customers',
          slug: 'customers',
          description:
            'Manage customer records, including create, retrieve, list, update, and delete_customer(customer_id=...).',
          sidebarOrder: 1,
        },
        {
          id: 'py_orders_module',
          sdkId: 'sdk_python_official',
          name: 'Orders',
          slug: 'orders',
          description:
            'Create and manage orders, including listing orders and retrieving individual orders.',
          sidebarOrder: 2,
        },
        {
          id: 'py_payments_module',
          sdkId: 'sdk_python_official',
          name: 'Payments',
          slug: 'payments',
          description:
            'Create and retrieve payments associated with invoices or orders.',
          sidebarOrder: 3,
        },
      ],
      sdk_methods: [
        {
          id: 'customers_delete',
          moduleId: 'py_customers_module',
          name: 'delete_customer',
          httpMethod: 'delete',
          apiEndpointId: 'ep_delete_customer',
          description:
            'Deletes (archives) a customer by ID. This method maps to the DELETE /customers/{id} endpoint and is demonstrated in the Python SDK docs.',
          takesIdParameter: true,
          idParameterName: 'customer_id',
        },
        {
          id: 'customers_get',
          moduleId: 'py_customers_module',
          name: 'get_customer',
          httpMethod: 'get',
          description:
            'Retrieves a single customer by ID and returns the full customer object.',
          takesIdParameter: true,
          idParameterName: 'customer_id',
        },
        {
          id: 'customers_list',
          moduleId: 'py_customers_module',
          name: 'list_customers',
          httpMethod: 'get',
          apiEndpointId: 'ep_list_customers',
          description: 'Lists customers with pagination and optional filters.',
          takesIdParameter: false,
        },
      ],
      auth_code_examples: [
        {
          id: 'auth_api_key_curl',
          authMethodId: 'auth_api_key',
          language: 'curl',
          title: 'Authenticate with API key using Bearer token (cURL)',
          code:
            'curl https://api.acme.com/users \\\n  -H "Authorization: Bearer <api_key>" \\\n  -H "Accept: application/json"',
          hasCopyButton: true,
          includesAuthorizationHeader: true,
        },
        {
          id: 'auth_api_key_node',
          authMethodId: 'auth_api_key',
          language: 'node_js',
          title: 'Authenticate with API key (Node.js)',
          code:
            "const fetch = require('node-fetch');\n\nasync function getCurrentUser() {\n  const response = await fetch('https://api.acme.com/users/me', {\n    headers: {\n      'Authorization': 'Bearer <api_key>',\n      'Accept': 'application/json',\n    },\n  });\n\n  const me = await response.json();\n  console.log(me.id, me.email);\n}\n\ngetCurrentUser().catch(console.error);",
          hasCopyButton: true,
          includesAuthorizationHeader: true,
        },
        {
          id: 'auth_api_key_python',
          authMethodId: 'auth_api_key',
          language: 'python',
          title: 'Authenticate with API key (Python requests)',
          code:
            'import requests\n\nheaders = {\n    "Authorization": "Bearer <api_key>",\n    "Accept": "application/json",\n}\n\nresponse = requests.get("https://api.acme.com/projects", headers=headers)\nresponse.raise_for_status()\n\nfor project in response.json()["data"]:\n    print(project["id"], project["name"]) ',
          hasCopyButton: true,
          includesAuthorizationHeader: true,
        },
      ],
      auth_methods: [
        {
          id: 'auth_api_key',
          pageId: 'authentication',
          name: 'API Key / Bearer Token',
          scheme: 'api_key',
          description:
            'Use your secret API key as a bearer token in the Authorization header (Authorization: Bearer <api_key>) for all requests. This method is shown in the cURL, Node.js, Python, Ruby, Go, and Java examples.',
          hasCodeExamples: true,
        },
        {
          id: 'auth_oauth2',
          pageId: 'authentication',
          name: 'OAuth 2.0 Access Token',
          scheme: 'oauth2',
          description:
            'Authenticate using an OAuth 2.0 access token obtained via the OAuth flow. The access token is sent as a Bearer token in the Authorization header.',
          hasCodeExamples: true,
        },
        {
          id: 'auth_basic',
          pageId: 'authentication',
          name: 'API Key via HTTP Basic Auth',
          scheme: 'api_key',
          description:
            'Authenticate by sending your API key as the HTTP Basic Auth username (and an empty password). This is equivalent in privileges to using the API key as a bearer token.',
          hasCodeExamples: true,
        },
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:22:50.549057',
      },
    };

    // Persist all generated data into localStorage using storage keys
    localStorage.setItem('sdk_code_examples', JSON.stringify(generatedData.sdk_code_examples || []));
    localStorage.setItem('navigation_links', JSON.stringify(generatedData.navigation_links || []));
    localStorage.setItem('webhook_events', JSON.stringify(generatedData.webhook_events || []));
    localStorage.setItem('webhook_payload_examples', JSON.stringify(generatedData.webhook_payload_examples || []));
    localStorage.setItem('try_it_consoles', JSON.stringify(generatedData.try_it_consoles || []));
    localStorage.setItem('api_endpoints', JSON.stringify(generatedData.api_endpoints || []));
    localStorage.setItem('api_endpoint_versions', JSON.stringify(generatedData.api_endpoint_versions || []));
    localStorage.setItem('api_code_samples', JSON.stringify(generatedData.api_code_samples || []));
    localStorage.setItem('api_parameters', JSON.stringify(generatedData.api_parameters || []));
    localStorage.setItem('pages', JSON.stringify(generatedData.pages || []));
    localStorage.setItem('api_resources', JSON.stringify(generatedData.api_resources || []));
    localStorage.setItem('rate_limit_rules', JSON.stringify(generatedData.rate_limit_rules || []));
    localStorage.setItem('sdks', JSON.stringify(generatedData.sdks || []));
    localStorage.setItem('webhook_event_groups', JSON.stringify(generatedData.webhook_event_groups || []));
    localStorage.setItem('sdk_modules', JSON.stringify(generatedData.sdk_modules || []));
    localStorage.setItem('sdk_methods', JSON.stringify(generatedData.sdk_methods || []));
    localStorage.setItem('auth_code_examples', JSON.stringify(generatedData.auth_code_examples || []));
    localStorage.setItem('auth_methods', JSON.stringify(generatedData.auth_methods || []));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_CopyNodeJsCreateProjectSample();
    this.testTask2_TryItListUsersCreatedAfterDate();
    this.testTask3_CompareOrderDetailsEndpointVersions();
    this.testTask4_PaymentsRateLimitPerMinute();
    this.testTask5_CopyInvoicePaidWebhookPayload();
    this.testTask6_PythonSdkDeleteCustomerById();
    this.testTask7_CopyCurlApiKeyAuthExample();
    this.testTask8_TryItPaginatedPendingOrders();

    return this.results;
  }

  // ----- Task 1 -----
  testTask1_CopyNodeJsCreateProjectSample() {
    const testName = 'Task 1: Copy Node.js create project sample with custom name';
    try {
      const pages = JSON.parse(localStorage.getItem('pages') || '[]');
      const apiRefPage = pages.find(function (p) {
        return p.pageType === 'api_reference';
      });
      this.assert(apiRefPage, 'API Reference page should exist');

      const resources = this.logic.getApiResourcesForSidebar(apiRefPage.id);
      this.assert(Array.isArray(resources) && resources.length > 0, 'Should load API resources for sidebar');
      const projectsResource = resources.find(function (r) {
        return r.slug === 'projects' || r.name === 'Projects';
      });
      this.assert(projectsResource, 'Projects resource should be available');

      const endpoints = this.logic.getApiEndpointsForResource(projectsResource.id);
      this.assert(Array.isArray(endpoints) && endpoints.length > 0, 'Should list endpoints for Projects');
      const createEndpoint = endpoints.find(function (e) {
        return (
          String(e.primaryHttpMethod).toLowerCase() === 'post' &&
          e.pathTemplate === '/projects'
        );
      });
      this.assert(createEndpoint, 'POST /projects endpoint should be present');

      const versionsInfo = this.logic.getApiEndpointVersions(createEndpoint.id);
      this.assert(versionsInfo && Array.isArray(versionsInfo.versions), 'Should return versions for POST /projects');

      let selectedVersion = null;
      if (versionsInfo.defaultVersionId) {
        selectedVersion = versionsInfo.versions.find(function (v) {
          return v.id === versionsInfo.defaultVersionId;
        });
      }
      if (!selectedVersion) {
        selectedVersion = versionsInfo.versions.find(function (v) {
          return String(v.httpMethod).toLowerCase() === 'post';
        }) || versionsInfo.versions[0];
      }
      this.assert(selectedVersion, 'A concrete endpoint version should be selected');

      const samples = this.logic.getApiEndpointCodeSamples(selectedVersion.id);
      this.assert(Array.isArray(samples) && samples.length > 0, 'Code samples should be available for POST /projects');
      const nodeSample = samples.find(function (s) {
        return s.language === 'node_js';
      });
      this.assert(nodeSample, 'Node.js sample should exist for POST /projects');

      const originalCode = nodeSample.code || '';
      let modifiedCode = originalCode;
      if (originalCode.indexOf('My First Project') !== -1) {
        modifiedCode = originalCode.replace(/My First Project/g, 'Sample Project A');
      } else {
        modifiedCode = originalCode + '\n// Project name: Sample Project A';
      }
      this.assert(
        modifiedCode.indexOf('Sample Project A') !== -1,
        'Modified code should contain the project name Sample Project A'
      );

      const copyResult = this.logic.performCopyCodeSnippet(
        'api_code_sample',
        nodeSample.id,
        'node_js',
        modifiedCode
      );
      this.assert(copyResult && copyResult.success === true, 'Copy operation should succeed');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----- Task 2 -----
  testTask2_TryItListUsersCreatedAfterDate() {
    const testName = 'Task 2: Try-It GET /users with created_after and per_page';
    try {
      const endpointVersions = JSON.parse(
        localStorage.getItem('api_endpoint_versions') || '[]'
      );
      const usersVersion = endpointVersions.find(function (v) {
        return v.path === '/users' && String(v.httpMethod).toLowerCase() === 'get';
      });
      this.assert(usersVersion, 'GET /users endpoint version should exist');

      const consoleConfig = this.logic.getTryItConsoleConfig(usersVersion.id);
      this.assert(consoleConfig && consoleConfig.console, 'Try-It console config should be returned');
      this.assert(consoleConfig.console.isEnabled, 'Try-It console for GET /users should be enabled');

      let params = consoleConfig.parameters || [];
      if (!params.length) {
        const allParams = JSON.parse(localStorage.getItem('api_parameters') || '[]');
        params = allParams.filter(function (p) {
          return p.endpointVersionId === usersVersion.id;
        });
      }
      this.assert(params.length > 0, 'Parameters metadata for GET /users should be available');

      const createdAfterParam = params.find(function (p) {
        return p.name === 'created_after';
      });
      const perPageParam = params.find(function (p) {
        return p.name === 'per_page';
      });
      this.assert(createdAfterParam, 'created_after parameter should exist');
      this.assert(perPageParam, 'per_page parameter should exist');

      const queryParams = [
        { name: createdAfterParam.name, value: '2023-01-01' },
        { name: perPageParam.name, value: '25' },
      ];

      const response = this.logic.executeTryItRequest(
        usersVersion.id,
        'GET',
        [],
        queryParams,
        [],
        null
      );

      this.assert(response, 'Try-It response should be returned');
      this.assert(response.success === true, 'GET /users Try-It call should succeed');
      if (typeof response.statusCode === 'number') {
        this.assert(
          response.statusCode >= 200 && response.statusCode < 300,
          'Status code should indicate success'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----- Task 3 -----
  testTask3_CompareOrderDetailsEndpointVersions() {
    const testName = 'Task 3: Compare GET /orders/{id} v1 vs v2 include=items';
    try {
      const endpointVersions = JSON.parse(
        localStorage.getItem('api_endpoint_versions') || '[]'
      );
      const v1Local = endpointVersions.find(function (v) {
        return v.path === '/orders/{id}' && String(v.httpMethod).toLowerCase() === 'get';
      });
      this.assert(v1Local, 'Local v1 definition for GET /orders/{id} should exist');

      const v1Details = this.logic.getApiEndpointVersionDetails(v1Local.id);
      this.assert(v1Details && v1Details.endpoint && v1Details.endpointVersion, 'Endpoint version details should be loaded for v1');

      const endpoint = v1Details.endpoint;
      const versionsInfo = this.logic.getApiEndpointVersions(endpoint.id);
      this.assert(versionsInfo && Array.isArray(versionsInfo.versions), 'Should retrieve version list for GET /orders/{id}');

      const v1Version = versionsInfo.versions.find(function (v) {
        return v.apiVersion === 'v1';
      });
      this.assert(v1Version, 'v1 version should be present in version selector');

      const v2Version = versionsInfo.versions.find(function (v) {
        return v.apiVersion === 'v2';
      });
      this.assert(v2Version, 'v2 version should be present in version selector');

      const v2Details = this.logic.getApiEndpointVersionDetails(v2Version.id);
      this.assert(v2Details && Array.isArray(v2Details.parameters), 'v2 endpoint parameters should be returned');

      const includeParam = v2Details.parameters.find(function (p) {
        return p.name === 'include';
      });
      this.assert(includeParam, "v2 should define an 'include' query parameter");

      const allowedValues = includeParam.allowedValues || [];
      this.assert(
        Array.isArray(allowedValues) && allowedValues.indexOf('items') !== -1,
        "include parameter should allow 'items' as a value"
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----- Task 4 -----
  testTask4_PaymentsRateLimitPerMinute() {
    const testName = 'Task 4: Identify per-minute rate limit for POST /payments';
    try {
      const pageContent = this.logic.getRateLimitsPageContent(undefined);
      this.assert(pageContent, 'Rate limits page content should be available');

      const rules = this.logic.getRateLimitRules(undefined);
      this.assert(Array.isArray(rules) && rules.length > 0, 'Rate limit rules table should be returned');

      const paymentsRuleEntry = rules.find(function (entry) {
        const rule = entry.rule || {};
        const method = (entry.primaryHttpMethod || '').toLowerCase();
        const pathTemplate = entry.pathTemplate || rule.path || '';
        return (
          rule.scope === 'endpoint' &&
          method === 'post' &&
          pathTemplate === '/payments'
        );
      });

      this.assert(paymentsRuleEntry, 'Endpoint-specific rule for POST /payments should exist');
      const rule = paymentsRuleEntry.rule;
      this.assert(rule.timeWindow === 'per_minute', 'Time window for POST /payments should be per_minute');
      this.assert(
        typeof rule.limitPerTimeWindow === 'number' && rule.limitPerTimeWindow > 0,
        'Per-minute limit for POST /payments should be a positive number'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----- Task 5 -----
  testTask5_CopyInvoicePaidWebhookPayload() {
    const testName = "Task 5: Copy 'invoice.paid' webhook JSON payload";
    try {
      const groupsOverview = this.logic.getWebhookEventGroupsForOverview(undefined);
      this.assert(
        Array.isArray(groupsOverview) && groupsOverview.length > 0,
        'Webhook event groups should be listed on overview'
      );

      const invoiceGroupEntry = groupsOverview.find(function (g) {
        return g.group && (g.group.slug === 'invoice_events' || g.group.name === 'Invoice events');
      });
      this.assert(invoiceGroupEntry && invoiceGroupEntry.group, 'Invoice events group should be present');

      const groupDetails = this.logic.getWebhookEventGroupDetails(invoiceGroupEntry.group.id);
      this.assert(
        groupDetails && Array.isArray(groupDetails.events) && groupDetails.events.length > 0,
        'Invoice event group should contain events'
      );

      const invoicePaidEvent = groupDetails.events.find(function (e) {
        return e.name === 'invoice.paid';
      });
      this.assert(invoicePaidEvent, "'invoice.paid' event should exist in group");

      const eventDetails = this.logic.getWebhookEventDetails(invoicePaidEvent.id);
      this.assert(
        eventDetails && Array.isArray(eventDetails.payloadExamples),
        'Webhook event details should include payload examples'
      );

      const jsonExample = eventDetails.payloadExamples.find(function (ex) {
        return ex.format === 'json' && ex.isDefault;
      }) || eventDetails.payloadExamples[0];
      this.assert(jsonExample, 'A JSON payload example should be available');
      this.assert(jsonExample.hasCopyButton, 'JSON payload example should have a copy button');

      const payloadJson = jsonExample.payloadJson || '';
      this.assert(payloadJson.indexOf('invoice.paid') !== -1, 'Payload should describe invoice.paid event');

      const copyResult = this.logic.performCopyCodeSnippet(
        'webhook_payload_example',
        jsonExample.id,
        'json',
        payloadJson
      );
      this.assert(copyResult && copyResult.success === true, 'Copy webhook payload action should succeed');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----- Task 6 -----
  testTask6_PythonSdkDeleteCustomerById() {
    const testName = 'Task 6: Locate Python SDK delete_customer example and copy it';
    try {
      const sdksOverview = this.logic.getSdksOverview();
      this.assert(sdksOverview && Array.isArray(sdksOverview.sdks), 'SDKs overview should list SDKs');

      const pythonSdk = sdksOverview.sdks.find(function (sdk) {
        return sdk.language === 'python';
      });
      this.assert(pythonSdk, 'Python SDK should be present');

      const sdkPageDetails = this.logic.getSdkPageDetails(pythonSdk.id);
      this.assert(sdkPageDetails && sdkPageDetails.sdk, 'Python SDK page details should be returned');

      const modules = this.logic.getSdkModules(pythonSdk.id);
      this.assert(Array.isArray(modules) && modules.length > 0, 'Python SDK modules should be listed');

      const customersModule = modules.find(function (m) {
        return m.slug === 'customers' || m.name === 'Customers';
      });
      this.assert(customersModule, 'Customers module should exist in Python SDK');

      const moduleDetails = this.logic.getSdkModuleDetails(customersModule.id);
      this.assert(
        moduleDetails && Array.isArray(moduleDetails.methods) && moduleDetails.methods.length > 0,
        'Customers module should contain methods'
      );

      const deleteMethod = moduleDetails.methods.find(function (m) {
        return m.name === 'delete_customer';
      });
      this.assert(deleteMethod, 'delete_customer method should be present');
      this.assert(deleteMethod.takesIdParameter, 'delete_customer should require an ID parameter');

      const methodDetails = this.logic.getSdkMethodDetails(deleteMethod.id);
      this.assert(
        methodDetails && Array.isArray(methodDetails.codeExamples),
        'SDK method details should include code examples'
      );

      const pythonExample = methodDetails.codeExamples.find(function (ex) {
        return ex.language === 'python';
      }) || methodDetails.codeExamples[0];
      this.assert(pythonExample, 'Python delete_customer example should exist');

      const code = pythonExample.code || '';
      const idParamName = deleteMethod.idParameterName || 'customer_id';
      this.assert(
        code.indexOf(idParamName) !== -1,
        'Example code should reference the customer ID parameter name'
      );

      const copyResult = this.logic.performCopyCodeSnippet(
        'sdk_code_example',
        pythonExample.id,
        'python',
        code
      );
      this.assert(copyResult && copyResult.success === true, 'Copy Python delete_customer example should succeed');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----- Task 7 -----
  testTask7_CopyCurlApiKeyAuthExample() {
    const testName = 'Task 7: Copy cURL API key auth example with Authorization header';
    try {
      const authOverview = this.logic.getAuthenticationOverview(undefined);
      this.assert(authOverview && Array.isArray(authOverview.methods), 'Authentication overview should list methods');

      const apiKeyMethod = authOverview.methods.find(function (m) {
        return m.scheme === 'api_key';
      });
      this.assert(apiKeyMethod, 'API Key / Bearer Token auth method should be present');

      const methodDetails = this.logic.getAuthMethodDetails(apiKeyMethod.id);
      this.assert(methodDetails && methodDetails.method, 'Auth method details should be returned');

      const codeExamples = this.logic.getAuthCodeExamplesForMethod(apiKeyMethod.id);
      this.assert(Array.isArray(codeExamples) && codeExamples.length > 0, 'Auth code examples should be available');

      const curlExample = codeExamples.find(function (ex) {
        return ex.language === 'curl' && ex.includesAuthorizationHeader;
      }) || codeExamples.find(function (ex) {
        return ex.language === 'curl';
      });
      this.assert(curlExample, 'cURL auth example should exist');

      const curlCode = curlExample.code || '';
      this.assert(
        curlCode.indexOf('Authorization: Bearer') !== -1,
        'cURL example should send Authorization: Bearer <api_key> header'
      );

      const copyResult = this.logic.performCopyCodeSnippet(
        'auth_code_example',
        curlExample.id,
        'curl',
        curlCode
      );
      this.assert(copyResult && copyResult.success === true, 'Copy cURL auth example should succeed');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----- Task 8 -----
  testTask8_TryItPaginatedPendingOrders() {
    const testName = 'Task 8: Try-It GET /orders for pending orders with pagination and sorting';
    try {
      const endpointVersions = JSON.parse(
        localStorage.getItem('api_endpoint_versions') || '[]'
      );
      const ordersVersion = endpointVersions.find(function (v) {
        return v.path === '/orders' && String(v.httpMethod).toLowerCase() === 'get';
      });
      this.assert(ordersVersion, 'GET /orders endpoint version should exist');

      const consoleConfig = this.logic.getTryItConsoleConfig(ordersVersion.id);
      this.assert(consoleConfig && consoleConfig.console, 'Try-It console config for GET /orders should be returned');
      this.assert(consoleConfig.console.isEnabled, 'Try-It console for GET /orders should be enabled');

      let params = consoleConfig.parameters || [];
      if (!params.length) {
        const allParams = JSON.parse(localStorage.getItem('api_parameters') || '[]');
        params = allParams.filter(function (p) {
          return p.endpointVersionId === ordersVersion.id;
        });
      }

      const statusParam = params.find(function (p) {
        return p.name === 'status';
      });
      const perPageParam = params.find(function (p) {
        return p.name === 'per_page';
      });
      const pageParam = params.find(function (p) {
        return p.name === 'page';
      });
      const sortParam = params.find(function (p) {
        return p.name === 'sort';
      });

      // status, per_page, and page must exist for this flow; sort is optional but expected
      this.assert(statusParam, 'status parameter should exist for GET /orders');
      this.assert(perPageParam, 'per_page parameter should exist for GET /orders');
      this.assert(pageParam, 'page parameter should exist for GET /orders');

      const sortValue = '-created_at';
      const queryParams = [
        { name: statusParam.name, value: 'pending' },
        { name: perPageParam.name, value: '50' },
        { name: pageParam.name, value: '3' },
      ];
      if (sortParam) {
        queryParams.push({ name: sortParam.name, value: sortValue });
      }

      const headers = [
        { name: 'Authorization', value: 'Bearer test_api_key_for_try_it' },
      ];

      const response = this.logic.executeTryItRequest(
        ordersVersion.id,
        'GET',
        [],
        queryParams,
        headers,
        null
      );

      this.assert(response, 'Try-It response should be returned for GET /orders');
      this.assert(response.success === true, 'GET /orders Try-It call should succeed');
      if (typeof response.statusCode === 'number') {
        this.assert(
          response.statusCode >= 200 && response.statusCode < 300,
          'Status code for GET /orders should indicate success'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ----- Helpers -----
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

module.exports = TestRunner;
