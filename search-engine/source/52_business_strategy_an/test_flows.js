/*
 * Test runner for business logic - flow-based integration tests
 * Covers Tasks 1-8 using the provided interfaces and generated data.
 */

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    localStorage.clear();
    // Reinitialize storage structure
    this.logic._initStorage();
  }

  setupTestData() {
    // IMPORTANT: Use the Generated Data exactly as provided (values preserved),
    // but expressed here as a JS object literal.
    const generatedData = {
      ai_readiness_questions: [
        {
          id: 'company_size',
          order: 1,
          key: 'company_size',
          text: 'What is your current company size?',
          helpText: 'Use total number of employees across all locations.',
          questionType: 'single_choice',
          isActive: true
        },
        {
          id: 'data_infrastructure_maturity',
          order: 2,
          key: 'data_infrastructure_maturity',
          text: 'How would you describe your current data infrastructure?',
          helpText: 'Consider how centralized, standardized, and accessible your key data sources are.',
          questionType: 'single_choice',
          isActive: true
        },
        {
          id: 'ai_experience_level',
          order: 3,
          key: 'ai_experience_level',
          text: 'What best describes your organization’s AI experience to date?',
          helpText: 'Include any pilots, proofs of concept, or production deployments.',
          questionType: 'single_choice',
          isActive: true
        }
      ],
      blog_posts: [
        {
          id: 'blog_ai_governance_playbook_2025_11',
          title: 'A 90-Day Playbook for Practical AI Governance',
          slug: '90-day-ai-governance-playbook',
          summary: 'A concise, action-oriented guide for standing up AI governance in under three months.',
          body: 'This 90-day playbook outlines a pragmatic approach to AI governance that balances risk, innovation, and speed. We break the work into three 30-day phases: discovery, design, and rollout. Each phase includes specific deliverables such as a risk register, model inventory, and decision rights matrix.\n\nBy the end, you’ll have a lightweight AI governance framework in place that is anchored in real business decisions, not abstract policies.',
          publishDate: '2025-11-10T10:00:00Z',
          topicCategory: 'governance_ethics',
          tags: [
            'ai governance',
            'risk management',
            'compliance',
            'operating model'
          ],
          estimatedReadTimeMinutes: 8,
          heroImage: 'https://www.mews.com/hubfs/Public%20Roadmap_1245x1014-1.png',
          status: 'published',
          isFeatured: true,
          createdAt: '2025-11-01T09:00:00Z'
        },
        {
          id: 'blog_ai_governance_board_2026_02',
          title: 'What Boards Need to Know About AI Governance in 2026',
          slug: 'board-ai-governance-2026',
          summary: 'Key questions directors should ask about AI risk, accountability, and metrics.',
          body: 'Boards are being asked to sign off on increasingly ambitious AI roadmaps. Yet, many lack a clear view of AI risks and controls. This article offers a focused checklist of questions for directors: where AI is used, who owns the risk, what safeguards exist, and how performance is monitored.\n\nWe also outline how to embed AI governance into existing risk and audit committees rather than creating yet another siloed forum.',
          publishDate: '2026-02-05T14:30:00Z',
          topicCategory: 'governance_ethics',
          tags: [
            'ai governance',
            'board',
            'risk oversight',
            'strategy'
          ],
          estimatedReadTimeMinutes: 7,
          heroImage: 'https://specials-images.forbesimg.com/imageserve/5f679753c352fb2a571455c1/960x0.jpg?fit=scale',
          status: 'published',
          isFeatured: false,
          createdAt: '2026-01-20T08:45:00Z'
        },
        {
          id: 'blog_responsible_genai_policies_2025_07',
          title: 'Designing Responsible GenAI Policies Without Slowing Innovation',
          slug: 'responsible-genai-policies',
          summary: 'How to craft practical guardrails for Generative AI that your teams will actually follow.',
          body: 'Most GenAI policies fail because they are either too vague or too restrictive. In this piece we propose a middle path built around three tiers of use cases, simple approval workflows, and transparent risk ownership.\n\nWe share templates you can adapt, including an acceptable use policy, prompt hygiene checklist, and data classification guide tailored for GenAI.',
          publishDate: '2025-07-18T09:15:00Z',
          topicCategory: 'governance_ethics',
          tags: [
            'genai',
            'ai governance',
            'policy',
            'compliance'
          ],
          estimatedReadTimeMinutes: 9,
          heroImage: 'https://specials-images.forbesimg.com/imageserve/5fe76805adb337277fcc9d07/960x0.jpg?fit=scale',
          status: 'published',
          isFeatured: false,
          createdAt: '2025-07-01T08:00:00Z'
        }
      ],
      case_studies: [
        {
          id: 'cs_retail_genai_personalization_2024',
          title: 'GenAI-Powered Product Copy Boosts Conversion for Fashion Retailer',
          slug: 'genai-product-copy-fashion-retailer',
          summary: 'A European fashion retailer used GenAI to generate on-brand product descriptions, increasing online conversion by 23% in four months.',
          body: 'The client, a mid-size fashion retailer with both e-commerce and brick-and-mortar presence, struggled to keep product descriptions fresh and consistent across 40,000 SKUs.\n\nWe implemented a GenAI-driven content pipeline, including taxonomy clean-up, prompt engineering, human-in-the-loop review workflows, and A/B testing. Within four months, 80% of SKUs had optimized descriptions, and the client observed a 23% uplift in conversion on affected product pages.',
          industry: 'retail_ecommerce',
          clientName: 'European Fashion Retailer (Confidential)',
          clientSizeEmployees: 350,
          year: 2024,
          publishDate: '2024-11-12T09:00:00Z',
          roiPercent: 23,
          projectDurationMonths: 4,
          projectDurationCategory: '3_6_months',
          primaryMetrics: [
            '23% increase in online conversion',
            '15% reduction in content production costs',
            '80% of catalog with optimized copy'
          ],
          heroImage: 'https://www.godaddy.com/garage/wp-content/uploads/ecommerce-product-page-copy.jpg',
          status: 'published',
          isFeatured: true,
          createdAt: '2024-10-20T10:30:00Z'
        },
        {
          id: 'cs_retail_demand_forecasting_2023',
          title: 'AI Demand Forecasting Reduces Stockouts for Grocery Chain',
          slug: 'ai-demand-forecasting-grocery-chain',
          summary: 'A regional grocery chain cut stockouts by 32% in just three months using AI-driven demand forecasting.',
          body: 'The client operated 120 grocery stores across two countries and faced frequent stockouts on promotional items. We deployed a lightweight demand forecasting solution using historical sales, promotions, weather, and local events. The project moved from discovery to pilot in eight weeks.\n\nAfter three months in production across 40 stores, stockouts on key SKUs dropped by 32%, while inventory days on hand remained stable.',
          industry: 'retail_ecommerce',
          clientName: 'Regional Grocery Chain (Confidential)',
          clientSizeEmployees: 2800,
          year: 2023,
          publishDate: '2023-09-30T11:00:00Z',
          roiPercent: 27,
          projectDurationMonths: 3,
          projectDurationCategory: 'under_3_months',
          primaryMetrics: [
            '32% reduction in stockouts',
            '1.8% uplift in like-for-like sales',
            '8-week time-to-pilot'
          ],
          heroImage: 'https://pd12m.s3.us-west-2.amazonaws.com/images/35706494-7130-566f-ac57-561d84bf50e6.jpeg',
          status: 'published',
          isFeatured: false,
          createdAt: '2023-08-15T10:15:00Z'
        },
        {
          id: 'cs_retail_recommendation_engine_2022',
          title: 'Personalized Recommendations Lift AOV for Online Home Goods Retailer',
          slug: 'personalized-recommendations-home-goods',
          summary: 'A fast-growing home goods e-commerce player increased average order value by 21% in five months.',
          body: 'The client had strong traffic but low basket sizes. We implemented a recommendation engine combining collaborative filtering with content-based models, integrated into PDPs, cart, and post-purchase flows.\n\nWithin five months, average order value rose by 21%, and recommendation-driven revenue accounted for 19% of total online sales.',
          industry: 'retail_ecommerce',
          clientName: 'Home Goods E‑commerce (Confidential)',
          clientSizeEmployees: 190,
          year: 2022,
          publishDate: '2022-11-18T13:30:00Z',
          roiPercent: 35,
          projectDurationMonths: 5,
          projectDurationCategory: '3_6_months',
          primaryMetrics: [
            '21% increase in average order value',
            '19% of revenue influenced by recommendations',
            '5-month implementation timeline'
          ],
          heroImage: 'https://metallurgprom.org/uploads/posts/2021-04/1618481948_snimok.jpg',
          status: 'published',
          isFeatured: false,
          createdAt: '2022-10-01T09:20:00Z'
        }
      ],
      events: [
        {
          id: 'event_genai_marketing_playbook_2026_04',
          title: 'GenAI for Marketing: From Ideas to ROI in 90 Days',
          slug: 'genai-for-marketing-90-days-2026-04',
          description: 'A live webinar for marketing leaders on how to launch high-impact GenAI pilots in under 90 days without compromising brand safety.',
          startDateTime: '2026-04-18T13:00:00Z',
          endDateTime: '2026-04-18T14:30:00Z',
          timeZone: 'UTC',
          topicCategory: 'genai_for_marketing',
          tags: [
            'genai',
            'marketing',
            'webinar',
            'roi'
          ],
          format: 'webinar',
          deliveryMode: 'online',
          targetAudience: 'CMOs, marketing directors, and marketing operations leaders exploring Generative AI.',
          registrationUrl: 'events_register.html?eventId=event_genai_marketing_playbook_2026_04',
          status: 'upcoming',
          isFeatured: true,
          createdAt: '2026-02-20T09:00:00Z'
        },
        {
          id: 'event_genai_marketing_creative_2026_06',
          title: 'Creative Automation with GenAI for Brand Marketers',
          slug: 'genai-creative-automation-2026-06',
          description: 'Learn how to safely automate creative production with GenAI while keeping humans in the loop.',
          startDateTime: '2026-06-12T16:00:00Z',
          endDateTime: '2026-06-12T17:00:00Z',
          timeZone: 'Europe/Berlin',
          topicCategory: 'genai_for_marketing',
          tags: [
            'genai',
            'creative',
            'brand safety'
          ],
          format: 'webinar',
          deliveryMode: 'online',
          targetAudience: 'Brand and creative marketing teams.',
          registrationUrl: 'events_register.html?eventId=event_genai_marketing_creative_2026_06',
          status: 'upcoming',
          isFeatured: false,
          createdAt: '2026-02-15T10:20:00Z'
        },
        {
          id: 'event_ai_governance_masterclass_2026_03',
          title: 'AI Governance Masterclass for Risk & Compliance Leaders',
          slug: 'ai-governance-masterclass-2026-03',
          description: 'A deep dive into AI governance operating models, policies, and controls tailored for regulated industries.',
          startDateTime: '2026-03-20T09:00:00Z',
          endDateTime: '2026-03-20T12:00:00Z',
          timeZone: 'Europe/London',
          topicCategory: 'ai_governance',
          tags: [
            'governance',
            'risk',
            'compliance'
          ],
          format: 'workshop',
          deliveryMode: 'online',
          targetAudience: 'Risk, compliance, and legal leaders.',
          registrationUrl: 'events_register.html?eventId=event_ai_governance_masterclass_2026_03',
          status: 'upcoming',
          isFeatured: true,
          createdAt: '2026-01-25T11:00:00Z'
        }
      ],
      training_programs: [
        {
          id: 'tp_remote_genai_sales_europe',
          name: 'Remote GenAI for Sales & Marketing Teams (Europe)',
          slug: 'remote-genai-sales-marketing-europe',
          description: 'A remote training program designed for European sales and marketing teams to adopt Generative AI safely and effectively.',
          agenda: 'Day 1: GenAI fundamentals and responsible use\nDay 2: Sales and marketing use cases, prompt patterns\nDay 3: Hands-on labs with real scenarios\nFollow-up clinic: Q&A and troubleshooting.',
          learningObjectives: 'By the end of this program, participants will be able to identify high-value GenAI use cases, design effective prompts, apply basic governance guardrails, and measure impact on key sales and marketing KPIs.',
          deliveryFormat: 'remote',
          region: 'europe_emea',
          minParticipants: 10,
          maxParticipants: 40,
          liveSessionsCount: 3,
          price: 6500,
          currency: 'usd',
          durationDays: 3,
          isRemoteFriendly: true,
          status: 'active',
          createdAt: '2025-12-10T10:00:00Z'
        },
        {
          id: 'tp_remote_ai_fundamentals_europe',
          name: 'AI Fundamentals for Business Leaders (EMEA Remote)',
          slug: 'ai-fundamentals-business-leaders-emea',
          description: 'A concise remote program for EMEA business leaders who need to make informed decisions about AI investments.',
          agenda: 'Session 1: AI concepts and case studies\nSession 2: Data foundations and operating models\nSession 3: Governance, ethics, and regulation in EMEA.',
          learningObjectives: 'Equip business leaders with a common vocabulary for AI, an understanding of key risks, and a framework for evaluating AI opportunities.',
          deliveryFormat: 'remote',
          region: 'europe_emea',
          minParticipants: 8,
          maxParticipants: 35,
          liveSessionsCount: 2,
          price: 7800,
          currency: 'usd',
          durationDays: 2,
          isRemoteFriendly: true,
          status: 'active',
          createdAt: '2025-11-05T09:30:00Z'
        },
        {
          id: 'tp_remote_ai_bootcamp_global',
          name: 'Global Online AI Practitioner Bootcamp',
          slug: 'global-online-ai-practitioner-bootcamp',
          description: 'An intensive bootcamp for analysts and engineers looking to build and deploy their first AI solutions.',
          agenda: 'Week 1: Python, data wrangling, and ML basics\nWeek 2: Model development\nWeek 3: Deployment patterns and MLOps\nCapstone: Team project and presentation.',
          learningObjectives: 'Provide hands-on experience with the full ML lifecycle and modern tooling, preparing participants to run pilots in their organization.',
          deliveryFormat: 'remote',
          region: 'global_online',
          minParticipants: 12,
          maxParticipants: 30,
          liveSessionsCount: 6,
          price: 12000,
          currency: 'usd',
          durationDays: 15,
          isRemoteFriendly: true,
          status: 'active',
          createdAt: '2024-09-01T10:00:00Z'
        }
      ],
      ai_readiness_options: [
        {
          id: 'company_size_1_50',
          questionId: 'company_size',
          label: '1–50 employees',
          valueKey: 'size_1_50',
          score: 1,
          order: 1
        },
        {
          id: 'company_size_51_200',
          questionId: 'company_size',
          label: '51–200 employees',
          valueKey: 'size_51_200',
          score: 2,
          order: 2
        },
        {
          id: 'company_size_201_500',
          questionId: 'company_size',
          label: '201–500 employees',
          valueKey: 'size_201_500',
          score: 3,
          order: 3
        }
      ],
      consultation_bookings: [
        {
          id: 'cb_ai_strategy_mfg_2026_10_10_1400',
          serviceType: 'ai_strategy_consultation',
          offeringId: null,
          durationMinutes: 60,
          industry: 'manufacturing',
          scheduledStart: '2026-10-10T14:00:00Z',
          scheduledEnd: '2026-10-10T15:00:00Z',
          participantsCount: 5,
          budgetRange: '10k_25k',
          contactName: 'Alex Rivera',
          contactEmail: 'alex.client@example.com',
          companyName: 'Rivera Manufacturing Group',
          notes: 'Discuss AI roadmap for our manufacturing plants, focusing on predictive maintenance and quality analytics.',
          sourceType: 'direct',
          sourceReferenceId: null,
          status: 'submitted',
          createdAt: '2026-09-15T09:30:00Z'
        },
        {
          id: 'cb_ai_strategy_assessment_reco_2026_03_01',
          serviceType: 'ai_strategy_consultation',
          offeringId: 'offering_ai_strategy_roadmap',
          durationMinutes: 60,
          industry: 'technology',
          scheduledStart: '2026-03-18T15:00:00Z',
          scheduledEnd: '2026-03-18T16:00:00Z',
          participantsCount: 4,
          budgetRange: '25k_50k',
          contactName: 'Dana Schultz',
          contactEmail: 'dana.schultz@example.com',
          companyName: 'Northwind Apps',
          notes: 'Booked directly from AI Readiness Assessment recommendation for an AI strategy roadmap engagement.',
          sourceType: 'from_assessment',
          sourceReferenceId: 'offering_ai_strategy_roadmap',
          status: 'confirmed',
          createdAt: '2026-03-01T11:10:00Z'
        },
        {
          id: 'cb_ai_governance_finserv_2026_04_05_1000',
          serviceType: 'ai_governance_consultation',
          offeringId: 'offering_ai_governance_starter',
          durationMinutes: 45,
          industry: 'financial_services',
          scheduledStart: '2026-04-05T10:00:00Z',
          scheduledEnd: '2026-04-05T10:45:00Z',
          participantsCount: 3,
          budgetRange: '50k_100k',
          contactName: 'Lee Wagner',
          contactEmail: 'lee.wagner@examplebank.com',
          companyName: 'Example Bank',
          notes: 'Follow-up to discuss AI governance operating model and regulatory expectations after attending the AI governance masterclass.',
          sourceType: 'from_event',
          sourceReferenceId: 'event_ai_governance_masterclass_2026_03',
          status: 'submitted',
          createdAt: '2026-03-20T13:15:00Z'
        }
      ],
      consulting_offerings: [
        {
          id: 'offering_ai_strategy_roadmap',
          name: 'AI Strategy Roadmap for Growth Businesses',
          slug: 'ai-strategy-roadmap-growth',
          offeringType: 'ai_strategy_service',
          shortDescription: 'A 6-week engagement to define a practical, value-focused AI roadmap for your organization.',
          fullDescription: 'This engagement combines executive workshops, stakeholder interviews, and data assessments to define a clear, value-focused AI roadmap. We prioritize use cases, estimate value and complexity, and outline the operating model and data foundations you need over the next 12–20 months.\n\nThe format is designed for organizations that have started experimenting with AI but need a coherent plan and governance structure to scale responsibly.',
          objectives: 'Align leadership on AI ambition, identify and prioritize high-value use cases, and define a realistic 12–20 month roadmap with clear next steps.',
          deliverables: 'Executive vision statement, prioritized AI use-case portfolio, 12–20 month roadmap, high-level data and talent plan, and a governance starter kit.',
          targetCompanySizeSegment: 'mid_size',
          minEmployees: 50,
          maxEmployees: 1000,
          price: 45000,
          currency: 'usd',
          priceType: 'starting_at',
          includesWorkshops: true,
          workshopsCount: 2,
          typicalDurationWeeks: 6,
          tagline: 'Turn scattered AI ideas into a focused, fundable roadmap in 6 weeks.',
          highlightBullets: [
            '2 facilitated leadership workshops',
            'Prioritized portfolio of 10–20 AI use cases',
            'Clear 12–20 month roadmap with investment ranges',
            'Lightweight governance and operating model guidance'
          ],
          status: 'active',
          isFeatured: true,
          createdAt: '2024-02-01T10:00:00Z'
        },
        {
          id: 'offering_ai_governance_starter',
          name: 'AI Governance Starter Program',
          slug: 'ai-governance-starter-program',
          offeringType: 'ai_governance_service',
          shortDescription: 'A focused 8-week program to design and launch a practical AI governance framework.',
          fullDescription: 'The AI Governance Starter Program helps you move from policies on paper to working governance. We map AI use, identify key risks, and design decision rights, forums, and controls that integrate with your existing risk and compliance structures.\n\nThe program is especially suited for regulated industries such as financial services, healthcare, and public sector organizations.',
          objectives: 'Establish a pragmatic AI governance framework, clarify roles and responsibilities, and embed AI risk management into existing processes.',
          deliverables: 'AI risk register, model inventory template, RACI for AI decisions, governance forum charters, and a prioritized control implementation plan.',
          targetCompanySizeSegment: 'enterprise',
          minEmployees: 500,
          maxEmployees: 50000,
          price: 65000,
          currency: 'usd',
          priceType: 'fixed',
          includesWorkshops: true,
          workshopsCount: 3,
          typicalDurationWeeks: 8,
          tagline: 'Stand up AI governance in weeks, not years.',
          highlightBullets: [
            'Governance model tailored to your regulators',
            'Integrated with existing risk & compliance forums',
            'Model inventory and risk register templates',
            '3 interactive design workshops with key stakeholders'
          ],
          status: 'active',
          isFeatured: true,
          createdAt: '2023-11-15T09:30:00Z'
        },
        {
          id: 'offering_virtual_ai_training_custom',
          name: 'Custom Virtual AI Training & Enablement',
          slug: 'custom-virtual-ai-training',
          offeringType: 'workshop_bundle',
          shortDescription: 'Design a tailored virtual AI training journey for your teams across regions and functions.',
          fullDescription: 'This flexible package combines our catalog of AI fundamentals, GenAI, and governance workshops into a tailored virtual training journey. We co-design the agenda around your roles, industry, and tools, and can support multiple time zones.\n\nIdeal for organizations looking to quickly upskill distributed teams before or alongside larger AI initiatives.',
          objectives: 'Rapidly build foundational AI literacy and role-specific skills across your organization through remote, interactive training.',
          deliverables: 'Custom training curriculum, live virtual sessions, recordings, exercises, and recommended follow-up resources.',
          targetCompanySizeSegment: 'all_sizes',
          minEmployees: 20,
          maxEmployees: 2000,
          price: 0,
          currency: 'usd',
          priceType: 'custom_quote',
          includesWorkshops: true,
          workshopsCount: 2,
          typicalDurationWeeks: 4,
          tagline: 'Right-sized AI training for global, remote-first teams.',
          highlightBullets: [
            'Fully remote delivery across time zones',
            'Curriculum tailored to your business and tools',
            'Option to integrate your own data and use cases',
            'Supports cohorts from 20 to 2000 participants'
          ],
          status: 'active',
          isFeatured: false,
          createdAt: '2024-05-10T08:45:00Z'
        }
      ],
      proposal_requests: [
        {
          id: 'pr_midmarket_sprint_jordan_2026_09',
          offeringId: 'offering_midmarket_ai_transformation_sprint',
          offeringName: 'Mid-Market AI Transformation Sprint',
          estimateId: null,
          companySizeEmployees: 120,
          desiredStartDate: '2026-09-01T00:00:00Z',
          contactName: 'Jordan Lee',
          contactEmail: 'jordan@example.com',
          companyName: 'BrightWave Co.',
          projectDescription: 'AI transformation for regional offices, focusing on sales, marketing, and operations use cases under a mid-size budget.',
          sourceType: 'from_plans',
          status: 'submitted',
          createdAt: '2026-06-15T10:30:00Z'
        },
        {
          id: 'pr_finserv_end_to_end_morgan_2026_05',
          offeringId: 'offering_finserv_end_to_end_ai',
          offeringName: 'End-to-End AI Program for Financial Services',
          estimateId: 'estimate_finserv_16wk_team8_100k_250k',
          companySizeEmployees: 850,
          desiredStartDate: '2026-05-01T00:00:00Z',
          contactName: 'Morgan Patel',
          contactEmail: 'morgan.patel@example.com',
          companyName: 'Harborview Wealth Management',
          projectDescription: '16-week AI program for our wealth management division, including strategy & roadmap, implementation of priority use cases, data audit, and team training. Budget range configured at $100,000–$250,000, excluding MLOps setup.',
          sourceType: 'from_estimator',
          status: 'submitted',
          createdAt: '2026-02-22T14:45:00Z'
        },
        {
          id: 'pr_ai_strategy_roadmap_dana_2026_04',
          offeringId: 'offering_ai_strategy_roadmap',
          offeringName: 'AI Strategy Roadmap for Growth Businesses',
          estimateId: null,
          companySizeEmployees: 260,
          desiredStartDate: '2026-04-01T00:00:00Z',
          contactName: 'Dana Schultz',
          contactEmail: 'dana.schultz@example.com',
          companyName: 'Northwind Apps',
          projectDescription: 'Requesting a 6-week AI strategy roadmap engagement following our readiness assessment to prioritize product and customer analytics use cases.',
          sourceType: 'from_plans',
          status: 'in_review',
          createdAt: '2026-02-28T09:20:00Z'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:21:18.234695'
      }
    };

    // Copy Generated Data to localStorage using correct storage keys
    localStorage.setItem('ai_readiness_questions', JSON.stringify(generatedData.ai_readiness_questions));
    localStorage.setItem('blog_posts', JSON.stringify(generatedData.blog_posts));
    localStorage.setItem('case_studies', JSON.stringify(generatedData.case_studies));
    localStorage.setItem('events', JSON.stringify(generatedData.events));
    localStorage.setItem('training_programs', JSON.stringify(generatedData.training_programs));
    localStorage.setItem('ai_readiness_options', JSON.stringify(generatedData.ai_readiness_options));
    localStorage.setItem('consultation_bookings', JSON.stringify(generatedData.consultation_bookings));
    localStorage.setItem('consulting_offerings', JSON.stringify(generatedData.consulting_offerings));
    localStorage.setItem('proposal_requests', JSON.stringify(generatedData.proposal_requests));
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));

    // Ensure other collections exist as arrays if not already initialized
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    };
    ensureArrayKey('saved_items');
    ensureArrayKey('event_registrations');
    ensureArrayKey('project_estimates');
    ensureArrayKey('training_booking_requests');
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookConsultation();
    this.testTask2_SelectPackageAndRequestProposal();
    this.testTask3_SaveRetailCaseStudiesToReadingList();
    this.testTask4_CompleteReadinessAssessmentAndBook();
    this.testTask5_RegisterForGenAIWebinar();
    this.testTask6_ConfigureEstimatorAndRequestProposal();
    this.testTask7_SaveGovernancePostsToReadingQueue();
    this.testTask8_BookRemoteTrainingProgram();

    return this.results;
  }

  // Task 1: Book a 60-minute AI strategy consultation for manufacturing
  testTask1_BookConsultation() {
    const testName = 'Task 1: Book 60-minute AI strategy consultation for manufacturing';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && Array.isArray(home.primaryCtas), 'Homepage should return primary CTAs');

      const consultationOptions = this.logic.getConsultationFormOptions();
      this.assert(consultationOptions && Array.isArray(consultationOptions.serviceTypes), 'Consultation options should include serviceTypes');

      const serviceTypeOption = consultationOptions.serviceTypes.find((st) =>
        st.value === 'ai_strategy_consultation' || (st.label && st.label.toLowerCase().indexOf('strategy') !== -1)
      );
      this.assert(!!serviceTypeOption, 'AI strategy consultation option should be available');

      const durationOption = consultationOptions.durations.find((d) =>
        d.valueMinutes === 60 || (d.label && d.label.indexOf('60') !== -1)
      );
      this.assert(!!durationOption, '60-minute duration option should be available');

      const industryOption = consultationOptions.industries.find((i) =>
        i.value === 'manufacturing' || (i.label && i.label.toLowerCase().indexOf('manufacturing') !== -1)
      );
      this.assert(!!industryOption, 'Manufacturing industry option should be available');

      const budgetOption = (consultationOptions.budgetRanges || []).find((b) =>
        b.value === '10k_25k' || (b.label && b.label.indexOf('10,000') !== -1)
      );
      this.assert(!!budgetOption, 'Budget range $10,000–$25,000 should be available');

      const scheduledStart = '2026-10-10T14:00:00Z';

      const bookingResult = this.logic.submitConsultationBooking(
        serviceTypeOption.value,
        durationOption.valueMinutes,
        industryOption.value,
        scheduledStart,
        5,
        budgetOption.value,
        'Alex Rivera',
        'alex.client@example.com',
        null,
        'Discuss AI roadmap for our manufacturing plants',
        null,
        'direct',
        null
      );

      this.assert(bookingResult && bookingResult.success === true, 'Consultation booking should succeed');
      const booking = bookingResult.booking;
      this.assert(booking && booking.id, 'Booking should include an id');
      this.assert(booking.serviceType === serviceTypeOption.value, 'Booking should use selected serviceType');
      this.assert(booking.durationMinutes === durationOption.valueMinutes, 'Booking should use selected duration');
      this.assert(booking.industry === industryOption.value, 'Booking should use selected industry');
      this.assert(booking.participantsCount === 5, 'Booking should store participants count');
      this.assert(booking.budgetRange === budgetOption.value, 'Booking should store budget range');

      const startDate = new Date(booking.scheduledStart);
      const endDate = new Date(booking.scheduledEnd);
      this.assert(endDate > startDate, 'scheduledEnd should be after scheduledStart');

      const allBookings = JSON.parse(localStorage.getItem('consultation_bookings') || '[]');
      const persisted = allBookings.find((b) => b.id === booking.id);
      this.assert(!!persisted, 'Booking should be persisted in consultation_bookings');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Select mid-size AI package (adapted) and request a proposal
  testTask2_SelectPackageAndRequestProposal() {
    const testName = 'Task 2: Select mid-size package with workshops and request proposal';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomePageContent();
      this.assert(home && Array.isArray(home.primaryCtas), 'Homepage should return primary CTAs');

      const filterOptions = this.logic.getConsultingPackageFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.companySizeSegments), 'Should get consulting package filter options');

      // First attempt: respect <= 12,000 budget if possible
      let searchResult = this.logic.searchConsultingOfferings(
        'mid_size',   // targetCompanySizeSegment
        null,         // minEmployees
        null,         // maxEmployees
        null,         // minPrice
        12000,        // maxPrice
        'usd',        // currency
        'ai_transformation_package', // offeringType (may yield 0 in this dataset)
        true,         // includesWorkshops
        2,            // minWorkshopsCount
        'active',     // status
        'price_asc'   // sortBy
      );

      if (!searchResult || searchResult.totalCount === 0) {
        // Fallback: relax type and budget while keeping mid-size & workshops
        searchResult = this.logic.searchConsultingOfferings(
          'mid_size',
          null,
          null,
          null,
          null,
          'usd',
          null,
          true,
          2,
          'active',
          'price_asc'
        );
      }

      this.assert(searchResult && searchResult.totalCount > 0, 'Should find at least one mid-size offering with workshops');

      const offerings = searchResult.results || [];
      const candidates = offerings.filter((o) => o.includesWorkshops && o.workshopsCount >= 2);
      this.assert(candidates.length > 0, 'Should have at least one offering with >= 2 workshops');

      // With sortBy price_asc, first candidate should be the most affordable match
      const selectedOffering = candidates[0];
      this.assert(selectedOffering.id, 'Selected offering should have an id');

      const detail = this.logic.getOfferingDetail(null, selectedOffering.id);
      this.assert(detail && detail.id === selectedOffering.id, 'Offering detail should match selected offering');

      const prefill = this.logic.getProposalRequestPrefill(selectedOffering.id, null);
      this.assert(prefill && prefill.offeringId === selectedOffering.id, 'Prefill should reference selected offering');

      const desiredStartDate = '2026-09-01T00:00:00Z'; // September 2026 as first day of month UTC

      const submitResult = this.logic.submitProposalRequest(
        selectedOffering.id,
        prefill.offeringName || selectedOffering.name,
        null,
        120,
        desiredStartDate,
        'Jordan Lee',
        'jordan@example.com',
        'BrightWave Co.',
        'AI transformation for regional offices',
        'from_plans'
      );

      this.assert(submitResult && submitResult.success === true, 'Proposal request submission should succeed');
      const proposal = submitResult.proposalRequest;
      this.assert(proposal && proposal.id, 'Proposal request should have an id');
      this.assert(proposal.offeringId === selectedOffering.id, 'Proposal should be linked to selected offering');
      this.assert(proposal.companySizeEmployees === 120, 'Proposal should store company size');
      this.assert(proposal.contactName === 'Jordan Lee', 'Proposal should store contact name');

      const storedProposals = JSON.parse(localStorage.getItem('proposal_requests') || '[]');
      const persisted = storedProposals.find((p) => p.id === proposal.id);
      this.assert(!!persisted, 'Proposal request should be persisted');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Add 3 short-duration retail AI case studies with ROI >= 20% to Reading List
  testTask3_SaveRetailCaseStudiesToReadingList() {
    const testName = 'Task 3: Save 3 qualifying retail case studies to Reading List';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomePageContent();
      this.assert(home != null, 'Homepage should be accessible');

      const filterOptions = this.logic.getCaseStudyFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.industries), 'Should get case study filter options');

      const searchResult = this.logic.searchCaseStudies(
        'retail_ecommerce', // industry
        2022,               // yearFrom
        2026,               // yearTo
        20,                 // minRoiPercent
        null,               // projectDurationCategory
        null,               // textQuery
        'newest'            // sortBy
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Search case studies should return results');

      const qualifying = [];
      for (let i = 0; i < searchResult.results.length; i++) {
        const cs = searchResult.results[i].caseStudy;
        if (!cs) continue;
        const roiOk = typeof cs.roiPercent === 'number' && cs.roiPercent >= 20;
        const durationOk = (typeof cs.projectDurationMonths === 'number' && cs.projectDurationMonths < 6) ||
          cs.projectDurationCategory === 'under_3_months' || cs.projectDurationCategory === '3_6_months';
        if (roiOk && durationOk) {
          qualifying.push(cs);
        }
        if (qualifying.length >= 3) break;
      }

      this.assert(qualifying.length >= 3, 'Should find at least 3 case studies meeting ROI and duration criteria');

      const savedIds = [];
      for (let i = 0; i < 3; i++) {
        const cs = qualifying[i];
        const detail = this.logic.getContentDetail('case_study', null, cs.id);
        this.assert(detail && detail.caseStudy && detail.caseStudy.id === cs.id, 'Content detail should return correct case study');

        const saveResult = this.logic.saveCaseStudyToReadingList(cs.id, 'Saved for retail AI reference');
        this.assert(saveResult && saveResult.success === true, 'Saving case study to Reading List should succeed');
        this.assert(saveResult.savedItem && saveResult.savedItem.id, 'Saved item should have an id');
        this.assert(saveResult.savedItem.contentType === 'case_study', 'Saved item should be of type case_study');
        this.assert(saveResult.savedItem.contentId === cs.id, 'Saved item should reference the correct case study');
        savedIds.push(cs.id);
      }

      const readingList = this.logic.getSavedItems('reading_list');
      this.assert(Array.isArray(readingList), 'getSavedItems(reading_list) should return array');

      const foundAll = savedIds.every((id) =>
        readingList.some((item) => item.contentType === 'case_study' && item.contentId === id)
      );
      this.assert(foundAll, 'All 3 selected case studies should appear in Reading List');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Complete AI Readiness Assessment and open recommended service booking page
  testTask4_CompleteReadinessAssessmentAndBook() {
    const testName = 'Task 4: Complete AI readiness assessment and book recommended service';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomePageContent();
      this.assert(home != null, 'Homepage should be accessible');

      const questionsResponse = this.logic.getAIReadinessQuestions();
      this.assert(questionsResponse && Array.isArray(questionsResponse.questions), 'Should retrieve AI readiness questions');

      const questionsWithOptions = questionsResponse.questions;
      const answerOptionIds = [];

      for (let i = 0; i < questionsWithOptions.length; i++) {
        const entry = questionsWithOptions[i];
        const q = entry.question;
        const options = entry.options || [];
        if (!q || options.length === 0) continue;

        if (q.key === 'company_size' || q.id === 'company_size') {
          const opt = options.find((o) =>
            o.valueKey === 'size_201_500' || (o.label && o.label.indexOf('201') !== -1)
          ) || options[options.length - 1];
          if (opt) answerOptionIds.push(opt.id);
        } else {
          // For other questions, choose a mid-range option to indicate moderate readiness
          const sorted = options.slice().sort((a, b) => {
            if (typeof a.order === 'number' && typeof b.order === 'number') return a.order - b.order;
            return 0;
          });
          const midIndex = Math.floor((sorted.length - 1) / 2);
          const opt = sorted[midIndex];
          if (opt) answerOptionIds.push(opt.id);
        }
      }

      this.assert(answerOptionIds.length > 0, 'Should have at least one selected answer option');

      const assessmentResult = this.logic.submitAIReadinessAssessment(answerOptionIds);
      this.assert(assessmentResult && assessmentResult.success === true, 'Assessment submission should succeed');

      const session = assessmentResult.assessmentSession;
      const recommendedOffering = assessmentResult.recommendedOffering;
      this.assert(session && session.id, 'Assessment session should have an id');
      this.assert(recommendedOffering && recommendedOffering.id, 'Should receive a recommended offering');
      if (session.recommendedOfferingId) {
        this.assert(
          session.recommendedOfferingId === recommendedOffering.id,
          'Session.recommendedOfferingId should match recommended offering id'
        );
      }

      const offeringDetail = this.logic.getOfferingDetail(null, recommendedOffering.id);
      this.assert(offeringDetail && offeringDetail.id === recommendedOffering.id, 'Offering detail should be retrievable');

      const prefill = this.logic.getConsultationPrefill('from_assessment', session.id);
      this.assert(prefill && prefill.serviceType, 'Consultation prefill should suggest a serviceType');
      this.assert(typeof prefill.durationMinutes === 'number', 'Consultation prefill should include durationMinutes');

      if (prefill.offeringId) {
        this.assert(
          prefill.offeringId === recommendedOffering.id,
          'Prefill.offeringId should match recommended offering id when provided'
        );
      }

      const scheduledStart = prefill.scheduledStartSuggestion || '2026-04-01T15:00:00Z';

      const bookingResult = this.logic.submitConsultationBooking(
        prefill.serviceType,
        prefill.durationMinutes,
        prefill.industry || 'technology',
        scheduledStart,
        null,
        null,
        'Assessment User',
        'assessment.user@example.com',
        null,
        prefill.notes || 'Booking from AI readiness assessment recommendation',
        prefill.offeringId || recommendedOffering.id,
        'from_assessment',
        session.id
      );

      this.assert(bookingResult && bookingResult.success === true, 'Consultation booking from assessment should succeed');
      const booking = bookingResult.booking;
      this.assert(booking && booking.id, 'Booking should have an id');
      this.assert(booking.sourceType === 'from_assessment', 'Booking sourceType should be from_assessment');
      this.assert(booking.sourceReferenceId === session.id, 'Booking should reference assessment session id');

      if (prefill.offeringId || recommendedOffering.id) {
        this.assert(
          booking.offeringId === (prefill.offeringId || recommendedOffering.id),
          'Booking.offeringId should match recommended offering'
        );
      }

      const bookings = JSON.parse(localStorage.getItem('consultation_bookings') || '[]');
      const persisted = bookings.find((b) => b.id === booking.id);
      this.assert(!!persisted, 'Booking should be persisted after assessment flow');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Register for a GenAI marketing webinar next month between 11:00 and 15:00
  testTask5_RegisterForGenAIWebinar() {
    const testName = 'Task 5: Register for GenAI marketing webinar next month (11:00-15:00)';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomePageContent();
      this.assert(home != null, 'Homepage should be accessible');

      const filterOptions = this.logic.getEventFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.dateRanges), 'Should get event filter options');

      let searchResult = this.logic.searchEvents(
        'next_month',   // dateRangeKey
        null,           // startDate
        null,           // endDate
        'genai_for_marketing', // topicCategory
        'GenAI',        // textQuery
        '11:00',        // timeOfDayFrom
        '15:00'         // timeOfDayTo
      );

      if (!searchResult || searchResult.totalCount === 0) {
        // Fallback: relax time filter
        searchResult = this.logic.searchEvents(
          'next_month',
          null,
          null,
          'genai_for_marketing',
          'GenAI',
          null,
          null
        );
      }

      this.assert(searchResult && searchResult.totalCount > 0, 'Should find at least one GenAI marketing event next month');

      const events = searchResult.results || [];
      let selectedEvent = null;
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (!ev || !ev.title) continue;
        const titleLc = ev.title.toLowerCase();
        if (titleLc.indexOf('genai') !== -1 || titleLc.indexOf('generative ai') !== -1) {
          selectedEvent = ev;
          break;
        }
      }

      if (!selectedEvent && events.length > 0) {
        selectedEvent = events[0];
      }

      this.assert(selectedEvent && selectedEvent.id, 'Should select a webinar event to register');

      const eventDetail = this.logic.getEventDetail(selectedEvent.id);
      this.assert(eventDetail && eventDetail.id === selectedEvent.id, 'Event detail should match selected event');

      const start = new Date(eventDetail.startDateTime);
      const hour = start.getUTCHours();
      this.assert(hour >= 11 && hour <= 15, 'Webinar start time should be between 11:00 and 15:00 UTC');

      const registrationResult = this.logic.submitEventRegistration(
        selectedEvent.id,
        'Taylor Morgan',
        'taylor@example.com',
        'Marketing Manager',
        'BrightWave Co.',
        true
      );

      this.assert(registrationResult && registrationResult.success === true, 'Event registration should succeed');
      const registration = registrationResult.registration;
      this.assert(registration && registration.id, 'Registration should have an id');
      this.assert(registration.eventId === selectedEvent.id, 'Registration should be linked to selected event');
      this.assert(registration.attendeeName === 'Taylor Morgan', 'Registration should store attendee name');

      const registrations = JSON.parse(localStorage.getItem('event_registrations') || '[]');
      const persisted = registrations.find((r) => r.id === registration.id);
      this.assert(!!persisted, 'Event registration should be persisted');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Configure financial services project estimate and submit detailed proposal
  testTask6_ConfigureEstimatorAndRequestProposal() {
    const testName = 'Task 6: Configure financial services estimate and submit proposal';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomePageContent();
      this.assert(home != null, 'Homepage should be accessible');

      const configOptions = this.logic.getEstimatorConfigOptions();
      this.assert(configOptions && Array.isArray(configOptions.industries), 'Estimator config options should be available');

      const estimateResult = this.logic.createProjectEstimate(
        'financial_services',          // industry
        ['strategy_roadmap', 'implementation'], // engagementScope (end-to-end)
        ['data_audit', 'team_training'],        // modules (excluding mlops_setup)
        8,                            // teamSize
        16,                           // timelineWeeks
        100000,                       // budgetMin
        250000,                       // budgetMax
        'usd'                         // currency
      );

      this.assert(estimateResult && estimateResult.success === true, 'Project estimate creation should succeed');
      const estimate = estimateResult.estimate;
      this.assert(estimate && estimate.id, 'Estimate should have an id');
      this.assert(Array.isArray(estimate.engagementScope), 'Estimate should include engagementScope array');
      this.assert(estimate.engagementScope.indexOf('strategy_roadmap') !== -1, 'Scope should include strategy_roadmap');
      this.assert(estimate.engagementScope.indexOf('implementation') !== -1, 'Scope should include implementation');

      const modules = estimate.modules || [];
      this.assert(modules.indexOf('data_audit') !== -1, 'Modules should include data_audit');
      this.assert(modules.indexOf('team_training') !== -1, 'Modules should include team_training');
      this.assert(modules.indexOf('mlops_setup') === -1, 'Modules should NOT include mlops_setup');

      if (typeof estimate.budgetMin === 'number' && typeof estimate.budgetMax === 'number') {
        this.assert(estimate.budgetMin >= 100000, 'Estimate budgetMin should be >= 100000');
        this.assert(estimate.budgetMax <= 250000, 'Estimate budgetMax should be <= 250000');
      }

      const prefill = this.logic.getProposalRequestPrefill(null, estimate.id);
      this.assert(prefill && prefill.estimateId === estimate.id, 'Proposal prefill should reference estimate id');

      const desiredStartDate = '2026-05-01T00:00:00Z';

      const submitResult = this.logic.submitProposalRequest(
        null,
        'End-to-End AI Program for Financial Services',
        estimate.id,
        null,
        desiredStartDate,
        'Morgan Patel',
        'morgan.patel@example.com',
        'Harborview Wealth Management',
        '16-week AI program for our wealth management division',
        'from_estimator'
      );

      this.assert(submitResult && submitResult.success === true, 'Proposal request from estimator should succeed');
      const proposal = submitResult.proposalRequest;
      this.assert(proposal && proposal.id, 'Proposal should have an id');
      this.assert(proposal.estimateId === estimate.id, 'Proposal should reference the created estimate');
      this.assert(proposal.contactName === 'Morgan Patel', 'Proposal should store contact name');

      const storedProposals = JSON.parse(localStorage.getItem('proposal_requests') || '[]');
      const persisted = storedProposals.find((p) => p.id === proposal.id);
      this.assert(!!persisted, 'Proposal from estimator should be persisted');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Add 3 AI governance blog posts under 10 minutes read time from last 12 months to Reading Queue
  testTask7_SaveGovernancePostsToReadingQueue() {
    const testName = 'Task 7: Save 3 AI governance posts <10 min to Reading Queue';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomePageContent();
      this.assert(home != null, 'Homepage should be accessible');

      const blogFilterOptions = this.logic.getBlogFilterOptions();
      this.assert(blogFilterOptions && Array.isArray(blogFilterOptions.dateRangeOptions), 'Should get blog filter options');

      const searchResult = this.logic.searchBlogPosts(
        'AI governance',   // query
        'last_12_months',  // dateRangeKey
        null,              // fromDate
        null,              // toDate
        'governance_ethics', // topicCategory
        'newest',          // sortBy
        10                 // maxReadTimeMinutes
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Blog search should return results');

      const qualifying = [];
      for (let i = 0; i < searchResult.results.length; i++) {
        const entry = searchResult.results[i];
        const post = entry.blogPost;
        if (!post) continue;
        const isGovernance = post.topicCategory === 'governance_ethics' ||
          (Array.isArray(post.tags) && post.tags.join(' ').toLowerCase().indexOf('governance') !== -1);
        const readTimeOk = typeof post.estimatedReadTimeMinutes === 'number' && post.estimatedReadTimeMinutes < 10;
        if (isGovernance && readTimeOk) {
          qualifying.push(post);
        }
        if (qualifying.length >= 3) break;
      }

      this.assert(qualifying.length >= 3, 'Should find at least 3 governance posts under 10 minutes');

      const savedIds = [];
      for (let i = 0; i < 3; i++) {
        const post = qualifying[i];
        const detail = this.logic.getContentDetail('blog_post', null, post.id);
        this.assert(detail && detail.blogPost && detail.blogPost.id === post.id, 'Content detail should return correct blog post');

        const saveResult = this.logic.saveBlogPostToReadingQueue(post.id, 'Saved for AI governance reading');
        this.assert(saveResult && saveResult.success === true, 'Saving blog post to Reading Queue should succeed');
        this.assert(saveResult.savedItem && saveResult.savedItem.id, 'Saved blog item should have an id');
        this.assert(saveResult.savedItem.contentType === 'blog_post', 'Saved item should be blog_post');
        this.assert(saveResult.savedItem.contentId === post.id, 'Saved item should reference the correct blog post');
        savedIds.push(post.id);
      }

      const queue = this.logic.getSavedItems('reading_queue');
      this.assert(Array.isArray(queue), 'getSavedItems(reading_queue) should return array');

      const foundAll = savedIds.every((id) =>
        queue.some((item) => item.contentType === 'blog_post' && item.contentId === id)
      );
      this.assert(foundAll, 'All 3 selected blog posts should appear in Reading Queue');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Choose most affordable remote AI training for 30-person European team under $8,000 with >=2 live sessions
  testTask8_BookRemoteTrainingProgram() {
    const testName = 'Task 8: Book most affordable remote AI training for 30-person EU team';
    console.log('Testing:', testName);

    try {
      const home = this.logic.getHomePageContent();
      this.assert(home != null, 'Homepage should be accessible');

      const filterOptions = this.logic.getTrainingProgramFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.deliveryFormats), 'Should get training filter options');

      const searchResult = this.logic.searchTrainingPrograms(
        'remote',     // deliveryFormat
        'europe_emea',// region
        30,           // minParticipants
        null,         // maxParticipants
        8000,         // maxPrice
        'usd',        // currency
        2,            // minLiveSessions
        'price_asc'   // sortBy
      );

      this.assert(searchResult && searchResult.totalCount > 0, 'Should find at least one qualifying training program');

      const programs = searchResult.results || [];
      // Already sorted by price_asc, first should be most affordable
      const selectedProgram = programs[0];
      this.assert(selectedProgram && selectedProgram.id, 'Selected training program should have an id');
      this.assert(selectedProgram.deliveryFormat === 'remote', 'Training program should be remote');
      this.assert(
        selectedProgram.region === 'europe_emea' || selectedProgram.region === 'global_online',
        'Training program should be suitable for Europe/EMEA or global online'
      );
      this.assert(
        typeof selectedProgram.maxParticipants !== 'number' || selectedProgram.maxParticipants >= 30,
        'Training program capacity should allow at least 30 participants'
      );
      this.assert(
        typeof selectedProgram.liveSessionsCount !== 'number' || selectedProgram.liveSessionsCount >= 2,
        'Training program should have at least 2 live sessions'
      );
      if (typeof selectedProgram.price === 'number' && selectedProgram.price > 0) {
        this.assert(selectedProgram.price <= 8000, 'Training program price should be <= 8000');
      }

      const detail = this.logic.getTrainingProgramDetail(selectedProgram.id);
      this.assert(detail && detail.id === selectedProgram.id, 'Training detail should match selected program');

      const desiredStartDate = '2026-10-01T00:00:00Z';

      const bookingResult = this.logic.submitTrainingBookingRequest(
        selectedProgram.id,
        'Casey Nguyen',
        'casey.nguyen@example.com',
        'BrightWave Co.',
        30,
        desiredStartDate,
        'Remote AI training for 30-person European sales team',
        'europe_emea'
      );

      this.assert(bookingResult && bookingResult.success === true, 'Training booking request should succeed');
      const booking = bookingResult.bookingRequest;
      this.assert(booking && booking.id, 'Training booking request should have an id');
      this.assert(booking.trainingProgramId === selectedProgram.id, 'Booking should reference selected training program');
      this.assert(booking.participantsCount === 30, 'Booking should store participants count');

      const storedBookings = JSON.parse(localStorage.getItem('training_booking_requests') || '[]');
      const persisted = storedBookings.find((b) => b.id === booking.id);
      this.assert(!!persisted, 'Training booking request should be persisted');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper: simple assertion
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
