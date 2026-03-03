class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];

    // For cross-test data sharing (integration between flows)
    this.subscriptionId = null;
    this.selectedPlanId = null;
    this.storeSupportBotId = null;
    this.weekdaySalesRuleId = null;

    // Clear and initialize storage
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    // Reinitialize storage structure in business logic
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // IMPORTANT: Use the Generated Data exactly as provided, but only here
    var generatedData = {
      chatbot_templates: [
        {
          id: 'ecommerce_support_assistant',
          name: 'E-commerce Support Assistant',
          description: 'AI agent specialized in handling online store customer support, including orders, shipping, returns, and product FAQs.',
          primary_use_case: 'E-commerce Support',
          categories: ['Customer Support', 'E-commerce'],
          tags: ['support', 'e_commerce', 'online_store', 'order_tracking', 'returns'],
          default_language: 'English',
          default_greeting: 'Hi there! I can help you with your orders, shipping questions, and returns.',
          status: 'active',
          created_at: '2025-08-10T09:15:00Z'
        },
        {
          id: 'saas_customer_support',
          name: 'SaaS Customer Support Bot',
          description: 'Support bot for software-as-a-service products, handling onboarding, billing, and troubleshooting questions.',
          primary_use_case: 'SaaS Customer Support',
          categories: ['Customer Support', 'SaaS'],
          tags: ['support', 'saas', 'onboarding', 'billing'],
          default_language: 'English',
          default_greeting: 'Hello! Im here to help with your account, billing, and product questions.',
          status: 'active',
          created_at: '2025-07-22T14:30:00Z'
        },
        {
          id: 'lead_qualification_b2b',
          name: 'B2B Lead Qualification Bot',
          description: 'Conversational lead qualifier for B2B websites that asks routing questions and captures contact details.',
          primary_use_case: 'Lead Qualification',
          categories: ['Lead Generation', 'B2B'],
          tags: ['lead_capture', 'qualification', 'b2b', 'sales'],
          default_language: 'English',
          default_greeting: 'Hi! I can help you find the right solution and connect you with our team.',
          status: 'active',
          created_at: '2025-06-05T11:10:00Z'
        }
      ],
      pricing_plans: [
        {
          id: 'free',
          name: 'Free',
          code: 'free',
          description: 'Get started with a single chatbot and basic features.',
          monthly_price: 0,
          billing_period: 'monthly',
          max_chatbots: 1,
          includes_conversation_analytics: false,
          feature_list: [
            '1 chatbot',
            'Up to 100 conversations / month',
            'Basic widget customization',
            'Email support'
          ],
          status: 'active',
          is_most_popular: false,
          created_at: '2025-01-05T09:00:00Z'
        },
        {
          id: 'starter',
          name: 'Starter',
          code: 'starter',
          description: 'For individuals and small projects that need more volume and integrations.',
          monthly_price: 19,
          billing_period: 'monthly',
          max_chatbots: 1,
          includes_conversation_analytics: false,
          feature_list: [
            '1 chatbot',
            'Up to 1,000 conversations / month',
            'Widget appearance customization',
            'Basic integrations (Slack, Zapier)',
            'Email support'
          ],
          status: 'active',
          is_most_popular: false,
          created_at: '2025-01-05T09:05:00Z'
        },
        {
          id: 'growth',
          name: 'Growth',
          code: 'growth',
          description: 'Best for growing teams that need multiple chatbots and analytics.',
          monthly_price: 29,
          billing_period: 'monthly',
          max_chatbots: 3,
          includes_conversation_analytics: true,
          feature_list: [
            '3 chatbots',
            'Up to 5,000 conversations / month',
            'Advanced widget customization',
            'Conversation analytics dashboard',
            'Team inbox & assignments',
            'Email and chat support'
          ],
          status: 'active',
          is_most_popular: true,
          created_at: '2025-01-05T09:10:00Z'
        }
      ],
      teams: [
        {
          id: 'sales',
          name: 'Sales',
          description: 'Handles pre-sales questions, demos, and pricing inquiries.',
          is_default: false,
          created_at: '2025-02-01T10:00:00Z'
        },
        {
          id: 'support',
          name: 'Support',
          description: 'Primary team for handling customer support conversations.',
          is_default: true,
          created_at: '2025-02-01T10:05:00Z'
        },
        {
          id: 'marketing',
          name: 'Marketing',
          description: 'Focuses on campaigns, lead generation, and website optimization.',
          is_default: false,
          created_at: '2025-02-01T10:10:00Z'
        }
      ],
      team_members: [
        {
          id: 'owner_1',
          name: 'Jordan Owner',
          email: 'jordan.owner@example.com',
          role: 'admin',
          status: 'active',
          invited_at: '2025-01-10T09:00:00Z'
        },
        {
          id: 'support_lead_1',
          name: 'Taylor Support',
          email: 'taylor.support@example.com',
          role: 'editor',
          status: 'active',
          invited_at: '2025-01-12T11:30:00Z'
        },
        {
          id: 'analyst_1',
          name: 'Morgan Analyst',
          email: 'morgan.analyst@example.com',
          role: 'viewer',
          status: 'active',
          invited_at: '2025-01-15T14:20:00Z'
        }
      ],
      chatbots: [
        {
          id: 'main_store_bot',
          name: 'Main Store Bot',
          primary_language: 'English',
          greeting_message: 'Hi! I can help you with orders, shipping, and returns.',
          template_id: 'ecommerce_support_assistant',
          status: 'active',
          description: 'Primary customer support chatbot for the main online store.',
          created_at: '2025-09-01T10:00:00Z',
          updated_at: '2025-11-15T09:30:00Z'
        },
        {
          id: 'intl_store_bot',
          name: 'International Store Bot',
          primary_language: 'Spanish',
          greeting_message: '\u0000a1Hola! Puedo ayudarte con tus pedidos internacionales, env\u0000edos y devoluciones.',
          template_id: 'multilingual_store_support',
          status: 'active',
          description: 'Multilingual support bot for international storefronts.',
          created_at: '2025-09-10T13:20:00Z',
          updated_at: '2025-12-02T16:45:00Z'
        },
        {
          id: 'saas_support_bot',
          name: 'SaaS Support Bot',
          primary_language: 'English',
          greeting_message: 'Hello! I can help with your account, billing, and product questions.',
          template_id: 'saas_customer_support',
          status: 'active',
          description: 'Handles support for the company\u0019s SaaS product.',
          created_at: '2025-08-05T09:15:00Z',
          updated_at: '2025-10-18T11:10:00Z'
        }
      ],
      daily_analytics_summaries: [
        {
          id: '2026-02-01_all',
          date: '2026-02-01T00:00:00Z',
          chatbot_id: null,
          total_conversations: 80,
          total_messages: 360,
          average_messages_per_conversation: 4.5,
          resolved_conversations: 60,
          created_at: '2026-03-01T00:00:00Z'
        },
        {
          id: '2026-02-02_all',
          date: '2026-02-02T00:00:00Z',
          chatbot_id: null,
          total_conversations: 95,
          total_messages: 475,
          average_messages_per_conversation: 5.0,
          resolved_conversations: 72,
          created_at: '2026-03-01T00:00:00Z'
        },
        {
          id: '2026-02-03_all',
          date: '2026-02-03T00:00:00Z',
          chatbot_id: null,
          total_conversations: 110,
          total_messages: 605,
          average_messages_per_conversation: 5.5,
          resolved_conversations: 83,
          created_at: '2026-03-01T00:00:00Z'
        }
      ]
    };

    // Populate localStorage with generated data using storage keys
    localStorage.setItem('chatbot_templates', JSON.stringify(generatedData.chatbot_templates));
    localStorage.setItem('pricing_plans', JSON.stringify(generatedData.pricing_plans));
    localStorage.setItem('teams', JSON.stringify(generatedData.teams));
    localStorage.setItem('team_members', JSON.stringify(generatedData.team_members));
    localStorage.setItem('chatbots', JSON.stringify(generatedData.chatbots));
    localStorage.setItem('daily_analytics_summaries', JSON.stringify(generatedData.daily_analytics_summaries));

    // Initialize other storage collections as empty arrays
    var emptyCollections = [
      'subscriptions',
      'kb_categories',
      'kb_articles',
      'chatbot_appearances',
      'lead_capture_forms',
      'lead_capture_fields',
      'leads',
      'routing_rules',
      'chatbot_members'
    ];
    emptyCollections.forEach(function (key) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });
  }

  // Run all tests in flow order
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1ChooseCheapestPlanUnder40WithAnalytics();
    this.testTask2CreateStoreSupportBotFromEcommerceTemplate();
    this.testTask3AddFaqEntriesToKnowledgeBase();
    this.testTask4CustomizeChatWidgetAppearance();
    this.testTask5SetupBusinessHoursRoutingToSales();
    this.testTask6ConfigureLeadCaptureForm();
    this.testTask7AnalyticsHighestAverageMessagesDay();
    this.testTask8AddTeamMembersAndAssignEditorToChatbot();

    return this.results;
  }

  // Task 1: Choose the cheapest monthly plan under 40 that supports at least 3 chatbots with analytics
  testTask1ChooseCheapestPlanUnder40WithAnalytics() {
    var testName = 'Task 1: Choose cheapest qualifying plan and start signup flow';
    console.log('Testing:', testName);

    try {
      // Simulate visiting homepage
      var homeContent = this.logic.getMarketingPageContent('home');
      this.assert(!!homeContent, 'Home content should be returned');
      this.assert(!!homeContent.title, 'Home content should have title');

      // Simulate going to pricing: fetch monthly plans with filters
      var pricingPlans = this.logic.getPricingPlansForDisplay('monthly', {
        maxMonthlyPrice: 40,
        minChatbots: 3,
        requiresAnalytics: true
      });

      this.assert(Array.isArray(pricingPlans), 'Pricing plans response should be an array');
      this.assert(pricingPlans.length > 0, 'There should be at least one qualifying pricing plan');

      // Find the cheapest qualifying plan based on returned data
      var cheapestPlan = pricingPlans.reduce(function (min, plan) {
        if (!min) return plan;
        return plan.monthly_price < min.monthly_price ? plan : min;
      }, null);

      this.assert(!!cheapestPlan, 'Cheapest qualifying plan should be determined');
      this.assert(cheapestPlan.monthly_price <= 40, 'Cheapest plan price should be <= 40, got ' + cheapestPlan.monthly_price);
      this.assert(cheapestPlan.max_chatbots >= 3, 'Cheapest plan should support at least 3 chatbots, got ' + cheapestPlan.max_chatbots);
      this.assert(cheapestPlan.includes_conversation_analytics === true, 'Cheapest plan should include conversation analytics');

      this.selectedPlanId = cheapestPlan.id;

      // Load plan signup data for header
      var signupData = this.logic.getPlanSignupData(cheapestPlan.id);
      this.assert(signupData.plan_id === cheapestPlan.id, 'Signup data plan id should match selected plan');
      this.assert(signupData.plan_name === cheapestPlan.name, 'Signup data plan name should match selected plan');

      // Start signup flow: create subscription and account
      var companyName = 'Test Company Inc';
      var contactEmail = 'user@example.com';
      var password = 'Password123!';

      var signupResult = this.logic.createSubscriptionAndAccount(
        cheapestPlan.id,
        companyName,
        contactEmail,
        password
      );

      this.assert(signupResult.success === true, 'Subscription creation should succeed');
      this.assert(!!signupResult.subscription, 'Subscription object should be returned');
      this.assert(signupResult.subscription.plan_id === cheapestPlan.id, 'Subscription plan id should match selected plan');
      this.assert(!!signupResult.subscription.billing_period, 'Subscription billing period should be set');
      this.assert(signupResult.subscription.contact_email === contactEmail, 'Subscription contact email should match input email');

      if (typeof signupResult.redirect_to_dashboard !== 'undefined') {
        this.assert(signupResult.redirect_to_dashboard === true, 'Redirect to dashboard should be true after signup');
      }

      this.subscriptionId = signupResult.subscription.id;

      // Verify subscription persisted in storage using actual subscription id
      var storedSubscriptions = JSON.parse(localStorage.getItem('subscriptions') || '[]');
      var storedSubscription = storedSubscriptions.find(function (s) {
        return s.id === signupResult.subscription.id;
      });
      this.assert(!!storedSubscription, 'Stored subscriptions should contain the newly created subscription');
      this.assert(storedSubscription.plan_id === cheapestPlan.id, 'Stored subscription plan id should match selected plan');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Create a new customer support chatbot for an online store using an e-commerce template
  testTask2CreateStoreSupportBotFromEcommerceTemplate() {
    var testName = 'Task 2: Create Store Support Bot from e-commerce template';
    console.log('Testing:', testName);

    try {
      // After signup, dashboard overview should be available
      var dashboard = this.logic.getDashboardOverview();
      this.assert(!!dashboard, 'Dashboard overview should be returned');

      // Simulate navigating to chatbots list
      var chatbotsListBefore = this.logic.getChatbotsList();
      this.assert(Array.isArray(chatbotsListBefore), 'Chatbots list should be an array');

      // New chatbot options
      var newChatbotOptions = this.logic.getNewChatbotOptions();
      this.assert(Array.isArray(newChatbotOptions.available_creation_modes), 'New chatbot creation modes should be an array');
      this.assert(
        newChatbotOptions.available_creation_modes.indexOf('from_template') !== -1,
        'from_template mode should be available'
      );

      // Browse templates with filters for Customer Support and E-commerce
      var templateResult = this.logic.getChatbotTemplates({
        categories: ['Customer Support', 'E-commerce'],
        tags: ['support', 'e_commerce']
      });

      this.assert(!!templateResult, 'Template result should be returned');
      this.assert(Array.isArray(templateResult.templates), 'Template list should be an array');
      this.assert(templateResult.templates.length > 0, 'There should be at least one filtered template');

      // Choose the first template from the filtered list
      var selectedTemplate = templateResult.templates[0];
      this.assert(!!selectedTemplate.id, 'Selected template should have an id');

      var botName = 'Store Support Bot';
      var primaryLanguage = 'English';
      var greeting = 'Hi! I can help you with orders, shipping, and returns today.';

      var createResult = this.logic.createChatbotFromTemplate(
        selectedTemplate.id,
        botName,
        primaryLanguage,
        greeting
      );

      this.assert(!!createResult, 'Create chatbot result should be returned');
      this.assert(!!createResult.chatbot, 'Created chatbot should be returned');
      this.assert(createResult.chatbot.name === botName, 'Chatbot name should match input');
      this.assert(createResult.chatbot.primary_language === primaryLanguage, 'Chatbot primary language should match input');
      this.assert(createResult.chatbot.greeting_message === greeting, 'Chatbot greeting should match input');
      this.assert(createResult.chatbot.template_id === selectedTemplate.id, 'Chatbot template id should match selected template');

      this.storeSupportBotId = createResult.chatbot.id;

      // Verify chatbot appears in chatbots list
      var chatbotsListAfter = this.logic.getChatbotsList();
      var createdBotFromList = chatbotsListAfter.find(function (bot) {
        return bot.id === createResult.chatbot.id;
      });
      this.assert(!!createdBotFromList, 'Created chatbot should appear in chatbots list');
      this.assert(createdBotFromList.name === botName, 'Chatbots list entry should have correct name');

      // Verify chatbot settings can be loaded
      var settings = this.logic.getChatbotSettings(this.storeSupportBotId);
      this.assert(!!settings, 'Chatbot settings should be loaded for the new bot');
      this.assert(settings.general.id === this.storeSupportBotId, 'Settings general id should match chatbot id');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Add three FAQ entries to the chatbot knowledge base
  testTask3AddFaqEntriesToKnowledgeBase() {
    var testName = 'Task 3: Add shipping, returns, and order status FAQs';
    console.log('Testing:', testName);

    try {
      this.assert(!!this.storeSupportBotId, 'Store Support Bot id should be available from Task 2');
      var chatbotId = this.storeSupportBotId;

      // Ensure settings are available
      var settings = this.logic.getChatbotSettings(chatbotId);
      this.assert(!!settings, 'Chatbot settings should load before configuring knowledge base');

      // Create Shipping FAQ
      var shippingQuestion = 'How long does shipping take?';
      var shippingAnswer = 'Standard shipping takes 35 business days within the US.';
      var shippingResult = this.logic.createKnowledgeBaseArticle(
        chatbotId,
        shippingQuestion,
        shippingAnswer,
        null,
        'Shipping',
        true
      );

      this.assert(!!shippingResult.article, 'Shipping article should be created');
      this.assert(!!shippingResult.category, 'Shipping category should be created or returned');
      this.assert(shippingResult.article.category_id === shippingResult.category.id, 'Shipping article category id should match category');

      // Create Returns FAQ
      var returnsQuestion = 'What is your return policy?';
      var returnsAnswer = 'You can return unused items within 30 days for a full refund.';
      var returnsResult = this.logic.createKnowledgeBaseArticle(
        chatbotId,
        returnsQuestion,
        returnsAnswer,
        null,
        'Returns',
        true
      );

      this.assert(!!returnsResult.article, 'Returns article should be created');
      this.assert(!!returnsResult.category, 'Returns category should be created or returned');
      this.assert(returnsResult.article.category_id === returnsResult.category.id, 'Returns article category id should match category');

      // Create Orders FAQ
      var ordersQuestion = 'How can I check my order status?';
      var ordersAnswer = 'You can track your order using the tracking link sent after purchase or by providing your order ID in the chat.';
      var ordersResult = this.logic.createKnowledgeBaseArticle(
        chatbotId,
        ordersQuestion,
        ordersAnswer,
        null,
        'Orders',
        true
      );

      this.assert(!!ordersResult.article, 'Orders article should be created');
      this.assert(!!ordersResult.category, 'Orders category should be created or returned');
      this.assert(ordersResult.article.category_id === ordersResult.category.id, 'Orders article category id should match category');

      // Verify categories exist via API
      var categories = this.logic.getKnowledgeBaseCategories(chatbotId);
      this.assert(Array.isArray(categories), 'Knowledge base categories should be an array');

      var shippingCategory = categories.find(function (c) { return c.name === 'Shipping'; });
      var returnsCategory = categories.find(function (c) { return c.name === 'Returns'; });
      var ordersCategory = categories.find(function (c) { return c.name === 'Orders'; });

      this.assert(!!shippingCategory, 'Shipping category should exist in categories list');
      this.assert(!!returnsCategory, 'Returns category should exist in categories list');
      this.assert(!!ordersCategory, 'Orders category should exist in categories list');

      // Verify articles via API list
      var articles = this.logic.getChatbotKnowledgeBaseArticles(chatbotId);
      this.assert(Array.isArray(articles), 'Knowledge base articles list should be an array');

      var shippingArticle = articles.find(function (a) { return a.question === shippingQuestion; });
      var returnsArticle = articles.find(function (a) { return a.question === returnsQuestion; });
      var ordersArticle = articles.find(function (a) { return a.question === ordersQuestion; });

      this.assert(!!shippingArticle, 'Shipping article should be present in articles list');
      this.assert(!!returnsArticle, 'Returns article should be present in articles list');
      this.assert(!!ordersArticle, 'Orders article should be present in articles list');

      this.assert(shippingArticle.category_name === 'Shipping', 'Shipping article should be in Shipping category');
      this.assert(returnsArticle.category_name === 'Returns', 'Returns article should be in Returns category');
      this.assert(ordersArticle.category_name === 'Orders', 'Orders article should be in Orders category');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Customize the chat widget appearance
  testTask4CustomizeChatWidgetAppearance() {
    var testName = 'Task 4: Customize chat widget appearance for Store Support Bot';
    console.log('Testing:', testName);

    try {
      this.assert(!!this.storeSupportBotId, 'Store Support Bot id should be available from Task 2');
      var chatbotId = this.storeSupportBotId;

      // Load current appearance (may be default)
      var currentAppearance = this.logic.getChatbotAppearance(chatbotId);
      this.assert(!!currentAppearance || currentAppearance === null, 'Appearance fetch should not throw');

      var accentColor = '#1A73E8';
      var position = 'bottom_right';
      var headerTitle = 'Need help with your order?';

      var updateResult = this.logic.updateChatbotAppearance(
        chatbotId,
        accentColor,
        position,
        headerTitle,
        true
      );

      this.assert(updateResult.success === true, 'Appearance update should succeed');
      this.assert(!!updateResult.appearance, 'Updated appearance object should be returned');
      this.assert(updateResult.appearance.chatbot_id === chatbotId, 'Appearance chatbot id should match');
      this.assert(updateResult.appearance.accent_color === accentColor, 'Accent color should match input');
      this.assert(updateResult.appearance.position === position, 'Position should be bottom_right');
      this.assert(updateResult.appearance.header_title === headerTitle, 'Header title should match input');
      this.assert(updateResult.appearance.show_title === true, 'Show title should be enabled');

      // Verify persisted via getChatbotAppearance
      var persistedAppearance = this.logic.getChatbotAppearance(chatbotId);
      this.assert(!!persistedAppearance, 'Persisted appearance should be retrievable');
      this.assert(persistedAppearance.accent_color === accentColor, 'Persisted accent color should match');
      this.assert(persistedAppearance.position === position, 'Persisted position should match');
      this.assert(persistedAppearance.header_title === headerTitle, 'Persisted header title should match');
      this.assert(persistedAppearance.show_title === true, 'Persisted show_title should be true');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Setup business hours routing rule
  testTask5SetupBusinessHoursRoutingToSales() {
    var testName = 'Task 5: Setup weekday business hours routing to Sales';
    console.log('Testing:', testName);

    try {
      // Load routing rule editor data for a new rule
      var editorData = this.logic.getRoutingRuleEditorData();
      this.assert(!!editorData, 'Routing rule editor data should be returned');
      this.assert(Array.isArray(editorData.teams), 'Editor data teams should be an array');

      // Find Sales team from editor data
      var salesTeam = editorData.teams.find(function (t) { return t.name === 'Sales'; });
      this.assert(!!salesTeam, 'Sales team should be available in teams list');

      var daysOfWeek = ['mon', 'tue', 'wed', 'thu', 'fri'];

      var saveResult = this.logic.saveRoutingRule(
        null,
        'Weekday Sales Hours',
        null,
        'business_hours',
        daysOfWeek,
        '09:00',
        '17:00',
        'route_to_team',
        salesTeam.id,
        'bot_only',
        null,
        'enabled'
      );

      this.assert(!!saveResult, 'Save routing rule result should be returned');
      this.assert(saveResult.success === true, 'Routing rule save should succeed');
      this.assert(!!saveResult.rule, 'Routing rule object should be returned');

      var rule = saveResult.rule;
      this.weekdaySalesRuleId = rule.id;

      this.assert(rule.name === 'Weekday Sales Hours', 'Rule name should match input');
      this.assert(rule.status === 'enabled', 'Rule status should be enabled');
      this.assert(rule.condition_type === 'business_hours', 'Condition type should be business_hours');

      // Verify days of week and times
      this.assert(Array.isArray(rule.days_of_week), 'Rule days_of_week should be an array');
      daysOfWeek.forEach(function (d) {
        if (rule.days_of_week.indexOf(d) === -1) {
          throw new Error('Rule days_of_week should contain ' + d);
        }
      });
      this.assert(rule.start_time === '09:00', 'Rule start time should be 09:00');
      this.assert(rule.end_time === '17:00', 'Rule end time should be 17:00');

      // Verify actions
      this.assert(rule.match_action_type === 'route_to_team', 'Match action should be route_to_team');
      this.assert(rule.match_team_id === salesTeam.id, 'Match team id should be Sales team id');
      this.assert(rule.fallback_action_type === 'bot_only', 'Fallback action should be bot_only');

      // Confirm rule appears in routing rules list
      var routingRules = this.logic.getRoutingRules();
      this.assert(Array.isArray(routingRules), 'Routing rules list should be an array');

      var storedRule = routingRules.find(function (r) { return r.id === rule.id; });
      this.assert(!!storedRule, 'Stored routing rules should contain the new rule');
      this.assert(storedRule.status === 'enabled', 'Stored rule status should be enabled');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Enable and configure lead capture flow
  testTask6ConfigureLeadCaptureForm() {
    var testName = 'Task 6: Enable lead capture and configure name, email, company fields';
    console.log('Testing:', testName);

    try {
      this.assert(!!this.storeSupportBotId, 'Store Support Bot id should be available from Task 2');
      var chatbotId = this.storeSupportBotId;

      // Configure lead capture with three fields in order
      var fieldsConfig = [
        {
          label: 'Full Name',
          fieldType: 'text',
          required: true,
          orderIndex: 1
        },
        {
          label: 'Email',
          fieldType: 'email',
          required: true,
          orderIndex: 2
        },
        {
          label: 'Company',
          fieldType: 'text',
          required: false,
          orderIndex: 3
        }
      ];

      var configResult = this.logic.configureLeadCaptureForm(
        chatbotId,
        true,
        fieldsConfig
      );

      this.assert(!!configResult, 'Lead capture config result should be returned');
      this.assert(configResult.success === true, 'Lead capture configuration should succeed');
      this.assert(!!configResult.form, 'Lead capture form should be returned');
      this.assert(configResult.form.chatbot_id === chatbotId, 'Lead form chatbot id should match');
      this.assert(configResult.form.enabled === true, 'Lead capture form should be enabled');
      this.assert(Array.isArray(configResult.fields), 'Lead capture fields should be an array');

      var fields = configResult.fields;

      var fullNameField = fields.find(function (f) { return f.label === 'Full Name'; });
      var emailField = fields.find(function (f) { return f.label === 'Email'; });
      var companyField = fields.find(function (f) { return f.label === 'Company'; });

      this.assert(!!fullNameField, 'Full Name field should exist');
      this.assert(!!emailField, 'Email field should exist');
      this.assert(!!companyField, 'Company field should exist');

      this.assert(fullNameField.field_type === 'text', 'Full Name field type should be text');
      this.assert(fullNameField.required === true, 'Full Name should be required');
      this.assert(fullNameField.order_index === 1, 'Full Name should be first');

      this.assert(emailField.field_type === 'email', 'Email field type should be email');
      this.assert(emailField.required === true, 'Email should be required');
      this.assert(emailField.order_index === 2, 'Email should be second');

      this.assert(companyField.field_type === 'text', 'Company field type should be text');
      this.assert(companyField.required === false, 'Company should be optional');
      this.assert(companyField.order_index === 3, 'Company should be third');

      // Verify via getLeadCaptureConfig
      var persistedConfig = this.logic.getLeadCaptureConfig(chatbotId);
      this.assert(!!persistedConfig, 'Persisted lead capture config should be returned');
      this.assert(!!persistedConfig.form, 'Persisted lead form should exist');
      this.assert(persistedConfig.form.enabled === true, 'Persisted form should be enabled');
      this.assert(Array.isArray(persistedConfig.fields), 'Persisted lead fields should be an array');

      var persistedFullName = persistedConfig.fields.find(function (f) { return f.label === 'Full Name'; });
      var persistedEmail = persistedConfig.fields.find(function (f) { return f.label === 'Email'; });
      var persistedCompany = persistedConfig.fields.find(function (f) { return f.label === 'Company'; });

      this.assert(!!persistedFullName && !!persistedEmail && !!persistedCompany, 'All three fields should persist');
      this.assert(persistedFullName.order_index === 1, 'Persisted Full Name order should be 1');
      this.assert(persistedEmail.order_index === 2, 'Persisted Email order should be 2');
      this.assert(persistedCompany.order_index === 3, 'Persisted Company order should be 3');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Review analytics to find day last month with highest average messages per conversation
  testTask7AnalyticsHighestAverageMessagesDay() {
    var testName = 'Task 7: Analytics previous month highest average messages per conversation';
    console.log('Testing:', testName);

    try {
      // Get date range presets
      var presets = this.logic.getAnalyticsDateRangePresets();
      this.assert(Array.isArray(presets), 'Analytics presets should be an array');

      var previousMonthPreset = presets.find(function (p) { return p.key === 'previous_month'; });
      this.assert(!!previousMonthPreset, 'Previous month preset should be available');
      this.assert(!!previousMonthPreset.start_date, 'Previous month preset should have start_date');
      this.assert(!!previousMonthPreset.end_date, 'Previous month preset should have end_date');

      var startDate = previousMonthPreset.start_date;
      var endDate = previousMonthPreset.end_date;

      // Fetch daily analytics summaries for previous month
      var summaries = this.logic.getDailyAnalyticsSummaries(startDate, endDate);
      this.assert(Array.isArray(summaries), 'Daily analytics summaries should be an array');
      this.assert(summaries.length > 0, 'There should be at least one daily summary in previous month');

      // Find the day with highest average_messages_per_conversation
      var highestDay = summaries.reduce(function (max, day) {
        if (!max) return day;
        return day.average_messages_per_conversation > max.average_messages_per_conversation ? day : max;
      }, null);

      this.assert(!!highestDay, 'Highest average messages day should be determined');

      // Click into details using the daily summary id
      var detail = this.logic.getDailyAnalyticsDetail(highestDay.id);
      this.assert(!!detail, 'Daily analytics detail should be returned');
      this.assert(!!detail.summary, 'Daily analytics detail should include summary');
      this.assert(detail.summary.id === highestDay.id, 'Detail summary id should match selected daily summary id');
      this.assert(
        detail.summary.average_messages_per_conversation === highestDay.average_messages_per_conversation,
        'Detail average_messages_per_conversation should match summary value'
      );

      this.assert(Array.isArray(detail.breakdown_by_chatbot), 'Detail breakdown_by_chatbot should be an array');
      this.assert(Array.isArray(detail.breakdown_by_hour), 'Detail breakdown_by_hour should be an array');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Add two team members and assign one to a chatbot
  testTask8AddTeamMembersAndAssignEditorToChatbot() {
    var testName = 'Task 8: Invite Admin and Editor team members and assign Editor to chatbot';
    console.log('Testing:', testName);

    try {
      this.assert(!!this.storeSupportBotId, 'Store Support Bot id should be available from Task 2');
      var chatbotId = this.storeSupportBotId;

      // Baseline team members
      var initialMembers = this.logic.getTeamMembers();
      this.assert(Array.isArray(initialMembers), 'Initial team members list should be an array');

      // Invite Admin member
      var alexName = 'Alex Admin';
      var alexEmail = 'alex.admin@example.com';
      var alexInviteResult = this.logic.inviteTeamMember(
        alexName,
        alexEmail,
        'admin'
      );

      this.assert(alexInviteResult.success === true, 'Alex Admin invite should succeed');
      this.assert(!!alexInviteResult.member, 'Alex Admin member object should be returned');
      this.assert(alexInviteResult.member.email === alexEmail, 'Alex Admin email should match');
      this.assert(alexInviteResult.member.role === 'admin', 'Alex Admin role should be admin');

      var alexId = alexInviteResult.member.id;

      // Invite Editor member
      var emmaName = 'Emma Editor';
      var emmaEmail = 'emma.editor@example.com';
      var emmaInviteResult = this.logic.inviteTeamMember(
        emmaName,
        emmaEmail,
        'editor'
      );

      this.assert(emmaInviteResult.success === true, 'Emma Editor invite should succeed');
      this.assert(!!emmaInviteResult.member, 'Emma Editor member object should be returned');
      this.assert(emmaInviteResult.member.email === emmaEmail, 'Emma Editor email should match');
      this.assert(emmaInviteResult.member.role === 'editor', 'Emma Editor role should be editor');

      var emmaId = emmaInviteResult.member.id;

      // Verify both members appear in team member list
      var allMembers = this.logic.getTeamMembers();
      var alexFromList = allMembers.find(function (m) { return m.id === alexId; });
      var emmaFromList = allMembers.find(function (m) { return m.id === emmaId; });

      this.assert(!!alexFromList, 'Alex Admin should appear in team members list');
      this.assert(!!emmaFromList, 'Emma Editor should appear in team members list');

      // Assign Emma Editor to Store Support Bot as editor
      var addMemberResult = this.logic.addChatbotMember(
        chatbotId,
        emmaId,
        'editor'
      );

      this.assert(addMemberResult.success === true, 'Adding Emma Editor to chatbot should succeed');
      this.assert(!!addMemberResult.chatbot_member, 'Chatbot member object should be returned');
      this.assert(addMemberResult.chatbot_member.chatbot_id === chatbotId, 'Chatbot member chatbot id should match');
      this.assert(addMemberResult.chatbot_member.team_member_id === emmaId, 'Chatbot member team_member_id should be Emma Editor');
      this.assert(addMemberResult.chatbot_member.permission_level === 'editor', 'Chatbot member permission level should be editor');

      // Verify via getChatbotMembers
      var chatbotMembers = this.logic.getChatbotMembers(chatbotId);
      this.assert(Array.isArray(chatbotMembers), 'Chatbot members list should be an array');

      var emmaChatbotMember = chatbotMembers.find(function (cm) { return cm.member_email === emmaEmail; });
      this.assert(!!emmaChatbotMember, 'Emma Editor should be in chatbot members list');
      this.assert(emmaChatbotMember.permission_level === 'editor', 'Emma Editor chatbot permission level should be editor');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper: assertion
  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  // Helper: record success
  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('6 ' + testName);
  }

  // Helper: record failure
  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('b ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (CommonJS)
module.exports = TestRunner;
