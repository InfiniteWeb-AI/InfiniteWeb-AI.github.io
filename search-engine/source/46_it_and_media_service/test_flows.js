// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear localStorage before tests
    this.clearStorage();
    // Initialize test data
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    localStorage.clear();
    // Reinitialize storage structure
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      blog_content_plans: [
        {
          id: 'blog_starter',
          name: 'Starter Blog',
          description: 'Perfect for small businesses that want to publish at least one high-quality article per month.',
          posts_per_month: 1,
          monthly_price: 40,
          currency: 'usd',
          features: [
            '1 SEO-optimized blog post per month',
            'Keyword research for each post',
            'Basic stock imagery included',
            'One round of revisions'
          ],
          status: 'active',
          created_at: '2025-01-10T09:00:00Z',
          updated_at: '2025-10-05T11:15:00Z'
        },
        {
          id: 'blog_growth',
          name: 'Growth Blog',
          description: 'Build consistent authority with weekly blog content tailored to your audience.',
          posts_per_month: 4,
          monthly_price: 180,
          currency: 'usd',
          features: [
            '4 SEO-optimized blog posts per month',
            'Keyword & topic clustering',
            'Custom graphics for select posts',
            'Two rounds of revisions',
            'Editorial calendar planning'
          ],
          status: 'active',
          created_at: '2025-01-10T09:05:00Z',
          updated_at: '2025-11-12T14:20:00Z'
        },
        {
          id: 'blog_pro',
          name: 'Pro Blog',
          description: 'For brands that want to dominate organic search with frequent, in-depth content.',
          posts_per_month: 8,
          monthly_price: 320,
          currency: 'usd',
          features: [
            '8 SEO-optimized blog posts per month',
            'Advanced keyword and competitor analysis',
            'Content briefs aligned with buyer journey',
            'Dedicated content strategist',
            'Up to three rounds of revisions'
          ],
          status: 'active',
          created_at: '2025-01-10T09:10:00Z',
          updated_at: '2025-12-18T16:45:00Z'
        }
      ],
      case_studies: [
        {
          id: 'cs_retail_omnichannel_it_video',
          title: 'Omnichannel Retail Refresh with Managed IT and In-Store Video Experiences',
          slug: 'omnichannel-retail-it-video-refresh',
          industry: 'retail',
          services: [
            'it_support',
            'video_production',
            'cloud_services',
            'email_collaboration'
          ],
          client_name: 'UrbanWalk Footwear',
          summary: 'How a national shoe retailer stabilized store IT, launched in-store video walls, and boosted sales 18% in 6 months.',
          content: 'UrbanWalk Footwear operated 60+ locations with aging point-of-sale systems and inconsistent in-store branding. We began with a comprehensive IT audit, then migrated stores to a centralized cloud-based POS and support model. Our media team produced in-store promotional video loops and seasonal campaign content tailored to each region. With 24/7 IT support and proactive monitoring, store downtime dropped by 72%. The new video experiences increased add-on purchases and dwell time, leading to an 18% uplift in same-store sales over six months.',
          hero_image_url: 'https://easyscreen.tv/wp-content/uploads/2019/04/shop.jpg',
          published_at: '2025-09-15T10:00:00Z',
          is_featured: true,
          created_at: '2025-08-20T09:30:00Z',
          updated_at: '2025-11-01T12:00:00Z'
        },
        {
          id: 'cs_retail_pop_up_experience',
          title: 'Pop-Up Retail Experience Powered by IT Support and Launch Video Campaign',
          slug: 'retail-pop-up-it-video-experience',
          industry: 'retail',
          services: [
            'it_support',
            'video_production',
            'web_hosting',
            'social_media_management'
          ],
          client_name: 'BrightCart Collective',
          summary: 'A fashion pop-up concept used our managed IT and video team to launch in three cities in 30 days.',
          content: 'BrightCart Collective needed a repeatable technology and media playbook for rotating pop-up stores. We delivered a turnkey IT kit with secure Wi-Fi, managed tablets, and remote support for each city. Our video crew captured each opening event and produced a 90-second highlight reel and short social clips. Combined with a campaign microsite we hosted and maintained, the brand saw 40% higher engagement than previous launches and collected 12,000 new email subscribers.',
          hero_image_url: 'https://s3-eu-west-1.amazonaws.com/appearhere-blog/Marmalade+London/BR-3.jpg',
          published_at: '2024-06-10T14:00:00Z',
          is_featured: false,
          created_at: '2024-05-18T11:45:00Z',
          updated_at: '2024-12-02T09:20:00Z'
        },
        {
          id: 'cs_healthcare_cloud_rmm',
          title: 'Securing a Multi-Clinic Healthcare Network with Cloud Backup and RMM',
          slug: 'healthcare-cloud-backup-rmm',
          industry: 'healthcare',
          services: [
            'remote_monitoring_management',
            'cloud_services',
            'email_collaboration',
            'it_support'
          ],
          client_name: 'Greenway Family Clinics',
          summary: '24/7 monitoring and cloud backup helped a growing clinic network improve uptime and compliance.',
          content: 'Greenway Family Clinics struggled with inconsistent patching and unreliable local backups. We deployed our Remote Monitoring & Management (RMM) platform across 140 endpoints, automated updates and health checks, and layered in encrypted cloud backup to a HIPAA-ready environment. When a ransomware incident hit a satellite clinic, we restored all impacted systems from immutable backups within two hours and avoided any data loss.',
          hero_image_url: 'https://pd12m.s3.us-west-2.amazonaws.com/images/9153a77c-caad-575e-bc8a-79781a890b52.jpeg',
          published_at: '2025-03-22T09:15:00Z',
          is_featured: true,
          created_at: '2025-02-10T10:10:00Z',
          updated_at: '2025-04-01T08:00:00Z'
        }
      ],
      help_articles: [
        {
          id: 'ha_cloud_backup_getting_started',
          title: 'Getting Started with Cloud Backup for Your Servers and Workstations',
          slug: 'cloud-backup-getting-started',
          content: 'This guide walks you through enabling cloud backup on your first device, choosing backup policies, and running your initial full backup. You will learn how to install the backup agent, select critical folders, and verify that your backup is completing successfully.',
          topic: 'cloud_services',
          tags: [
            'cloud backup',
            'getting started',
            'disaster recovery'
          ],
          published_at: '2026-02-15T09:00:00Z',
          last_updated_at: '2026-02-20T10:30:00Z',
          is_published: true
        },
        {
          id: 'ha_cloud_backup_troubleshooting',
          title: 'Troubleshooting Failed Cloud Backup Jobs',
          slug: 'cloud-backup-troubleshooting',
          content: 'If your cloud backup jobs are failing or stuck in a pending state, use this article to review common causes such as connectivity issues, quota limits, and file permission problems. We also cover how to read backup logs and when to open a support ticket.',
          topic: 'cloud_services',
          tags: [
            'cloud backup',
            'errors',
            'logs',
            'troubleshooting'
          ],
          published_at: '2025-12-01T14:10:00Z',
          last_updated_at: '2025-12-10T08:45:00Z',
          is_published: true
        },
        {
          id: 'ha_cloud_storage_vs_backup',
          title: 'Cloud Storage vs. Cloud Backup: What’s the Difference?',
          slug: 'cloud-storage-vs-cloud-backup',
          content: 'Cloud storage and cloud backup solve different problems. Storage is optimized for collaboration and frequent access, while backup is optimized for version history and recovery. This article explains how to use both services together to protect your data.',
          topic: 'cloud_services',
          tags: [
            'cloud backup',
            'cloud storage',
            'best practices'
          ],
          published_at: '2025-08-20T11:30:00Z',
          last_updated_at: '2025-09-02T09:00:00Z',
          is_published: true
        }
      ],
      hosting_plans: [
        {
          id: 'wp_starter_10',
          name: 'Starter 10GB',
          slug: 'starter-10gb-hosting',
          description: 'Entry-level SSD hosting for simple brochure sites and landing pages.',
          storage_gb: 10,
          storage_type: 'ssd',
          bandwidth_gb: 100,
          websites_included: 1,
          support_tier: 'basic',
          billing_cycle_default: 'monthly',
          monthly_price: 5,
          annual_price: 50,
          currency: 'usd',
          features: [
            'Free SSL certificate',
            'Automatic daily backups',
            '1 email account',
            'Standard control panel'
          ],
          status: 'active',
          is_featured: false,
          created_at: '2024-06-01T09:00:00Z',
          updated_at: '2025-01-15T11:20:00Z'
        },
        {
          id: 'wp_value_50',
          name: 'Value 50GB',
          slug: 'value-50gb-hosting',
          description: 'Affordable SSD hosting for growing small business websites.',
          storage_gb: 50,
          storage_type: 'ssd',
          bandwidth_gb: 500,
          websites_included: 2,
          support_tier: 'standard',
          billing_cycle_default: 'monthly',
          monthly_price: 12,
          annual_price: 120,
          currency: 'usd',
          features: [
            'Free SSL certificate',
            'Automatic daily backups',
            'Up to 10 email accounts',
            'One-click CMS installs',
            'Phone and email support'
          ],
          status: 'active',
          is_featured: true,
          created_at: '2024-06-05T10:15:00Z',
          updated_at: '2025-02-10T09:45:00Z'
        },
        {
          id: 'wp_business_75',
          name: 'Business 75GB NVMe',
          slug: 'business-75gb-nvme-hosting',
          description: 'High-performance NVMe hosting for busy business sites and small e-commerce stores.',
          storage_gb: 75,
          storage_type: 'nvme',
          bandwidth_gb: 1000,
          websites_included: 5,
          support_tier: 'standard',
          billing_cycle_default: 'monthly',
          monthly_price: 18,
          annual_price: 180,
          currency: 'usd',
          features: [
            'NVMe SSD storage for faster IO',
            'HTTP/2 and CDN-ready',
            'Staging environment',
            'Priority email support'
          ],
          status: 'active',
          is_featured: false,
          created_at: '2024-07-01T08:30:00Z',
          updated_at: '2025-01-20T13:00:00Z'
        }
      ],
      navigation_links: [
        {
          id: 'nav_header_home',
          location: 'header',
          text: 'Home',
          url: 'index.html',
          description: 'Homepage and main entry to all services',
          order: 1,
          created_at: '2024-05-01T09:00:00Z'
        },
        {
          id: 'nav_header_it_services_rmm',
          location: 'header',
          text: 'IT Services (RMM)',
          url: 'rmm_plans.html?serviceId=remote_monitoring_management',
          description: 'Remote Monitoring & Management service plans',
          order: 2,
          created_at: '2024-05-01T09:00:00Z'
        },
        {
          id: 'nav_header_web_hosting',
          location: 'header',
          text: 'Web Hosting',
          url: 'web_hosting.html',
          description: 'Web hosting plans and pricing',
          order: 3,
          created_at: '2024-05-01T09:00:00Z'
        }
      ],
      rmm_plans: [
        {
          id: 'rmm_lite',
          name: 'RMM Lite',
          slug: 'rmm-lite',
          description: 'Entry-level remote monitoring for up to 10 devices, ideal for micro-businesses.',
          min_devices: 1,
          max_devices: 10,
          monthly_price: 99,
          currency: 'usd',
          features: [
            'Health and uptime monitoring',
            'Basic alerting and email notifications',
            'Windows and macOS support',
            'Monthly device health report'
          ],
          is_trial_available: true,
          service_key: 'remote_monitoring_management',
          status: 'active',
          created_at: '2024-03-01T09:00:00Z',
          updated_at: '2025-01-10T10:30:00Z'
        },
        {
          id: 'rmm_essentials',
          name: 'RMM Essentials',
          slug: 'rmm-essentials',
          description: 'Core RMM features for small offices that need coverage for up to 25 devices.',
          min_devices: 1,
          max_devices: 25,
          monthly_price: 199,
          currency: 'usd',
          features: [
            'Real-time monitoring and alerting',
            'Automated patch management',
            'Remote access tools',
            'Standard SLA support'
          ],
          is_trial_available: true,
          service_key: 'remote_monitoring_management',
          status: 'active',
          created_at: '2024-03-05T09:10:00Z',
          updated_at: '2025-02-01T11:15:00Z'
        },
        {
          id: 'rmm_growth',
          name: 'RMM Growth',
          slug: 'rmm-growth',
          description: 'Designed for growing organizations that need to protect multiple sites or departments.',
          min_devices: 25,
          max_devices: 50,
          monthly_price: 349,
          currency: 'usd',
          features: [
            'All Essentials features',
            'Advanced reporting and dashboards',
            'Third-party patch catalogs',
            'Integrations with popular ticketing tools'
          ],
          is_trial_available: true,
          service_key: 'remote_monitoring_management',
          status: 'active',
          created_at: '2024-03-10T09:20:00Z',
          updated_at: '2025-02-10T12:00:00Z'
        }
      ],
      seo_plans: [
        {
          id: 'seo_basic',
          name: 'SEO Basic',
          description: 'Foundational SEO for local and small businesses getting started with search.',
          tier: 'basic',
          monthly_price: 200,
          currency: 'usd',
          max_keywords: 20,
          features: [
            'Keyword research for core pages',
            'On-page optimization for up to 5 URLs',
            'Monthly performance summary',
            'Basic Google Business Profile optimization'
          ],
          status: 'active',
          created_at: '2024-09-01T09:00:00Z',
          updated_at: '2025-01-05T10:10:00Z'
        },
        {
          id: 'seo_standard',
          name: 'SEO Standard',
          description: 'Ongoing SEO support for growing brands competing in regional markets.',
          tier: 'standard',
          monthly_price: 350,
          currency: 'usd',
          max_keywords: 50,
          features: [
            'Comprehensive keyword research',
            'On-page optimization for up to 15 URLs',
            'Technical SEO audits each quarter',
            'Monthly reporting and recommendations'
          ],
          status: 'active',
          created_at: '2024-09-01T09:05:00Z',
          updated_at: '2025-01-10T11:20:00Z'
        },
        {
          id: 'seo_premium',
          name: 'SEO Premium',
          description: 'Advanced SEO program for national brands and lead-generation websites.',
          tier: 'premium',
          monthly_price: 500,
          currency: 'usd',
          max_keywords: 120,
          features: [
            'Advanced keyword and competitor analysis',
            'On-page optimization for up to 30 URLs',
            'Technical SEO and schema implementation',
            'Link acquisition strategy and outreach guidance',
            'Monthly strategy call with an SEO specialist'
          ],
          status: 'active',
          created_at: '2024-09-01T09:10:00Z',
          updated_at: '2025-01-20T12:30:00Z'
        }
      ],
      social_media_plans: [
        {
          id: 'smm_basic',
          name: 'Social Basic',
          description: 'Foundational presence on one social network with consistent posting.',
          tier: 'basic',
          monthly_price: 150,
          currency: 'usd',
          max_platforms: 1,
          features: [
            '8 posts per month on one platform',
            'Light community management',
            'Monthly performance summary'
          ],
          status: 'active',
          created_at: '2024-09-05T09:00:00Z',
          updated_at: '2025-01-08T10:00:00Z'
        },
        {
          id: 'smm_standard',
          name: 'Social Standard',
          description: 'Multi-platform management for brands that want steady engagement.',
          tier: 'standard',
          monthly_price: 250,
          currency: 'usd',
          max_platforms: 2,
          features: [
            '12 posts per month across up to 2 platforms',
            'Hashtag and posting-time optimization',
            'Community management during business hours',
            'Monthly performance report with insights'
          ],
          status: 'active',
          created_at: '2024-09-05T09:05:00Z',
          updated_at: '2025-01-12T11:10:00Z'
        },
        {
          id: 'smm_premium',
          name: 'Social Premium',
          description: 'High-touch social media management with campaigns and creative.',
          tier: 'premium',
          monthly_price: 350,
          currency: 'usd',
          max_platforms: 3,
          features: [
            '16 posts per month across up to 3 platforms',
            'Custom creative templates and light video clips',
            'Proactive engagement and community building',
            'Monthly strategy call and A/B testing'
          ],
          status: 'active',
          created_at: '2024-09-05T09:10:00Z',
          updated_at: '2025-01-18T12:20:00Z'
        }
      ],
      consultation_slots: [
        {
          id: 'slot_2026_03_03_1100_dm_online',
          start_datetime: '2026-03-03T11:00:00Z',
          end_datetime: '2026-03-03T12:00:00Z',
          duration_minutes: 60,
          topic: 'digital_marketing',
          meeting_format: 'online',
          created_at: '2025-12-01T09:00:00Z',
          updated_at: '2026-02-15T10:00:00Z',
          is_available: false
        },
        {
          id: 'slot_2026_03_04_1500_wr_online',
          start_datetime: '2026-03-04T15:00:00Z',
          end_datetime: '2026-03-04T15:30:00Z',
          duration_minutes: 30,
          topic: 'website_redesign',
          meeting_format: 'online',
          created_at: '2025-12-01T09:10:00Z',
          updated_at: '2026-02-15T10:05:00Z',
          is_available: false
        },
        {
          id: 'slot_2026_03_05_0900_it_infra_inperson',
          start_datetime: '2026-03-05T09:00:00Z',
          end_datetime: '2026-03-05T10:00:00Z',
          duration_minutes: 60,
          topic: 'it_infrastructure',
          meeting_format: 'in_person',
          created_at: '2025-12-01T09:20:00Z',
          updated_at: '2026-02-15T10:10:00Z',
          is_available: false
        }
      ],
      consultation_bookings: [
        {
          id: 'cb_2026_03_03_dm_online_1100',
          consultation_slot_id: 'slot_2026_03_03_1100_dm_online',
          topic: 'digital_marketing',
          meeting_format: 'online',
          company_size: '1_10',
          contact_name: 'Sandra Miller',
          contact_email: 'sandra.miller@example.com',
          status: 'completed',
          created_at: '2026-02-20T10:00:00Z'
        },
        {
          id: 'cb_2026_03_04_wr_online_1500',
          consultation_slot_id: 'slot_2026_03_04_1500_wr_online',
          topic: 'website_redesign',
          meeting_format: 'online',
          company_size: '51_200',
          contact_name: 'Daniel Wu',
          contact_email: 'daniel.wu@example.com',
          status: 'scheduled',
          created_at: '2026-02-25T09:30:00Z'
        },
        {
          id: 'cb_2026_03_05_it_infra_inperson_0900',
          consultation_slot_id: 'slot_2026_03_05_0900_it_infra_inperson',
          topic: 'it_infrastructure',
          meeting_format: 'in_person',
          company_size: '201_500',
          contact_name: 'Priya Singh',
          contact_email: 'priya.singh@example.com',
          status: 'scheduled',
          created_at: '2026-02-26T08:45:00Z'
        }
      ]
    };

    // Copy all generated data to localStorage using correct storage keys
    localStorage.setItem('blog_content_plans', JSON.stringify(generatedData.blog_content_plans));
    localStorage.setItem('case_studies', JSON.stringify(generatedData.case_studies));
    localStorage.setItem('help_articles', JSON.stringify(generatedData.help_articles));
    localStorage.setItem('hosting_plans', JSON.stringify(generatedData.hosting_plans));
    localStorage.setItem('navigation_links', JSON.stringify(generatedData.navigation_links));
    localStorage.setItem('rmm_plans', JSON.stringify(generatedData.rmm_plans));
    localStorage.setItem('seo_plans', JSON.stringify(generatedData.seo_plans));
    localStorage.setItem('social_media_plans', JSON.stringify(generatedData.social_media_plans));
    localStorage.setItem('consultation_slots', JSON.stringify(generatedData.consultation_slots));
    localStorage.setItem('consultation_bookings', JSON.stringify(generatedData.consultation_bookings));

    // Ensure other collections exist as empty arrays
    const emptyKeys = [
      'cart',
      'cart_items',
      'orders',
      'order_items',
      'video_production_quote_requests',
      'rmm_trial_signups',
      'marketing_bundles',
      'marketing_proposal_requests',
      'case_study_contact_requests',
      'reading_lists',
      'reading_list_items',
      'support_tickets'
    ];
    for (const key of emptyKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, key === 'cart' ? JSON.stringify({}) : '[]');
      }
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_CheapestHostingPlanToCheckout();
    this.testTask2_VideoProductionQuoteRequest();
    this.testTask3_ConsultationBookingWebsiteRedesign();
    this.testTask4_MarketingBundleUnderBudget();
    this.testTask5_RetailCaseStudyAndContactSales();
    this.testTask6_SaveMostRecentCloudBackupArticle();
    this.testTask7_HighPrioritySupportTicketEmailMigration();
    this.testTask8_RmmMostAffordableTrialPlan();

    return this.results;
  }

  // Task 1: Choose the cheapest web hosting plan with at least 50GB storage under $40/month
  testTask1_CheapestHostingPlanToCheckout() {
    const testName = 'Task 1: Cheapest hosting plan (>=50GB, <=$40) added to cart and checkout summary';
    console.log('Testing:', testName);

    try {
      // Simulate homepage navigation
      const homeContent = this.logic.getHomePageContent();
      this.assert(homeContent && Array.isArray(homeContent.services_summary), 'Home content should include services summary');

      // Get hosting filter options (simulating UI filters)
      const hostingFilters = this.logic.getHostingFilterOptions();
      this.assert(hostingFilters && Array.isArray(hostingFilters.sort_options), 'Hosting filter options should be available');

      // List hosting plans with filters approximating: storage >=50GB, monthly billing, price <=40, active, sorted by price low to high
      const listResult = this.logic.listHostingPlans(
        {
          min_storage_gb: 50,
          billing_cycle: 'monthly',
          max_monthly_price: 40,
          status: 'active'
        },
        'price_low_to_high'
      );

      this.assert(listResult && Array.isArray(listResult.plans), 'listHostingPlans should return plans array');
      this.assert(listResult.plans.length > 0, 'There should be at least one hosting plan matching filters');

      const cheapestPlan = listResult.plans[0];
      this.assert(cheapestPlan.storage_gb >= 50, 'Selected plan should have at least 50GB storage');
      this.assert(cheapestPlan.monthly_price <= 40, 'Selected plan monthly price should be <= 40');

      // Get plan details
      const planDetails = this.logic.getHostingPlanDetails(cheapestPlan.id);
      this.assert(planDetails && planDetails.plan && planDetails.plan.id === cheapestPlan.id, 'getHostingPlanDetails should return the correct plan');

      // Add to cart using default/lowest-cost configuration (omit configuration_summary)
      const addResult = this.logic.addHostingPlanToCart(cheapestPlan.id, 'monthly', 1);
      this.assert(addResult && addResult.success === true, 'addHostingPlanToCart should succeed');
      this.assert(addResult.cart && Array.isArray(addResult.items), 'addHostingPlanToCart should return cart and items');
      this.assert(addResult.items.length === 1, 'Cart should contain exactly one item after adding');

      const cartItem = addResult.items[0];
      this.assert(cartItem.product_type === 'hosting_plan', 'Cart item should be of type hosting_plan');
      this.assert(cartItem.product_id === cheapestPlan.id, 'Cart item product_id should match selected plan');
      this.assert(cartItem.quantity === 1, 'Cart item quantity should be 1');

      // Get cart summary
      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart && Array.isArray(cartSummary.items), 'getCartSummary should return cart and items');
      this.assert(cartSummary.items.length === 1, 'Cart summary should list exactly one item');
      const summaryItem = cartSummary.items[0];
      this.assert(summaryItem.product_id === cheapestPlan.id, 'Cart summary item should match selected plan');
      this.assert(cartSummary.recurring_monthly_total > 0, 'Recurring monthly total should be positive');

      // Get checkout summary
      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && checkoutSummary.cart && Array.isArray(checkoutSummary.items), 'getCheckoutSummary should return cart and items');
      this.assert(checkoutSummary.items.length === 1, 'Checkout summary should list exactly one item');
      this.assert(checkoutSummary.billing_cycle === 'monthly', 'Checkout billing_cycle should be monthly');
      this.assert(checkoutSummary.recurring_total <= 40, 'Checkout recurring total should be <= 40');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Request a video production quote for a 90-second promo under $8,000
  testTask2_VideoProductionQuoteRequest() {
    const testName = 'Task 2: Video production quote request for 90-second promo under $8,000';
    console.log('Testing:', testName);

    try {
      // Simulate navigation via homepage services summary
      const homeContent = this.logic.getHomePageContent();
      this.assert(homeContent && Array.isArray(homeContent.services_summary), 'Home content should include services summary');

      // Media services overview
      const mediaOverview = this.logic.getMediaServicesOverview();
      this.assert(mediaOverview && mediaOverview.video_production_summary, 'Media services overview should include video production summary');

      // Submit quote request
      const title = '90-second corporate promo video';
      const description = '90-second corporate promo video';
      const location = 'New York, NY';
      const maxBudget = 8000;
      const estimatedDurationSeconds = 90;

      const quoteResult = this.logic.submitVideoProductionQuoteRequest(
        title,
        description,
        location,
        true, // onsite_filming
        estimatedDurationSeconds,
        maxBudget,
        'ultra_hd_4k',
        'Alex Johnson',
        'Brightline Solutions',
        'alex.johnson@example.com'
      );

      this.assert(quoteResult && quoteResult.success === true, 'submitVideoProductionQuoteRequest should succeed');
      this.assert(quoteResult.quote_request, 'Quote request object should be returned');

      const qr = quoteResult.quote_request;
      this.assert(qr.project_title === title || qr.project_description === description, 'Quote request should contain project info');
      this.assert(qr.location === location, 'Quote request location should match');
      this.assert(qr.max_budget <= maxBudget, 'Quote request max_budget should be <= provided budget');
      this.assert(qr.service_key === 'video_production', 'Quote request service_key should be video_production');
      this.assert(qr.contact_name === 'Alex Johnson', 'Quote request contact_name should match');

      // Verify persistence via localStorage
      const stored = JSON.parse(localStorage.getItem('video_production_quote_requests') || '[]');
      this.assert(stored.length > 0, 'There should be at least one stored video production quote request');
      const storedMatch = stored.find(function (r) { return r.id === qr.id; });
      this.assert(!!storedMatch, 'Stored quote request should match returned quote_request');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Book the earliest 30-minute online consultation for website redesign
  testTask3_ConsultationBookingWebsiteRedesign() {
    const testName = 'Task 3: Book earliest 30-minute online website redesign consultation';
    console.log('Testing:', testName);

    try {
      // Get consultation options (topics, formats, company sizes)
      const options = this.logic.getConsultationOptions();
      this.assert(options && Array.isArray(options.topics), 'Consultation topics should be available');
      this.assert(Array.isArray(options.meeting_formats), 'Consultation meeting formats should be available');
      this.assert(Array.isArray(options.company_sizes), 'Consultation company sizes should be available');

      const topicKey = 'website_redesign';
      const formatKey = 'online';
      const sizeKey = '11_50';

      this.assert(options.topics.some(function (t) { return t.key === topicKey; }), 'website_redesign topic should be supported');
      this.assert(options.meeting_formats.some(function (m) { return m.key === formatKey; }), 'online meeting format should be supported');
      this.assert(options.company_sizes.some(function (c) { return c.key === sizeKey; }), '11_50 company size should be supported');

      // Determine a date range based on existing slots from storage
      const allSlots = JSON.parse(localStorage.getItem('consultation_slots') || '[]');
      this.assert(allSlots.length > 0, 'There should be some consultation slots in storage');

      // Find any slot for website_redesign & online with duration 30 minutes
      const candidate = allSlots.find(function (s) {
        return s.topic === topicKey && s.meeting_format === formatKey && s.duration_minutes === 30;
      });
      this.assert(!!candidate, 'There should be at least one 30-minute online website_redesign slot');

      const startDateObj = new Date(candidate.start_datetime);
      const isoDate = startDateObj.toISOString().slice(0, 10); // YYYY-MM-DD

      // Get availability for that specific date
      const availability = this.logic.getConsultationAvailability(
        topicKey,
        formatKey,
        isoDate,
        isoDate
      );
      this.assert(availability && Array.isArray(availability.slots), 'getConsultationAvailability should return slots array');
      this.assert(availability.slots.length > 0, 'Availability should include at least one slot');

      // From returned slots, pick the earliest that matches topic, format, 30 minutes and between 14:00-17:00 (using UTC hours)
      const matchingSlots = availability.slots.filter(function (s) {
        if (s.topic && s.topic !== topicKey) return false;
        if (s.meeting_format && s.meeting_format !== formatKey) return false;
        if (s.duration_minutes !== 30) return false;
        const d = new Date(s.start_datetime);
        const hour = d.getUTCHours();
        return hour >= 14 && hour <= 17;
      });

      this.assert(matchingSlots.length > 0, 'There should be a matching slot between 2-5 PM (UTC)');

      matchingSlots.sort(function (a, b) {
        return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
      });
      const selectedSlot = matchingSlots[0];

      // Book the consultation
      const bookingResult = this.logic.bookConsultation(
        selectedSlot.id,
        topicKey,
        formatKey,
        sizeKey,
        'Taylor Reed',
        'taylor.reed@example.com'
      );

      this.assert(bookingResult && bookingResult.success === true, 'bookConsultation should succeed');
      this.assert(bookingResult.booking, 'Booking object should be returned');

      const booking = bookingResult.booking;
      this.assert(booking.consultation_slot_id === selectedSlot.id, 'Booking should reference the selected slot');
      this.assert(booking.topic === topicKey, 'Booking topic should match');
      this.assert(booking.meeting_format === formatKey, 'Booking meeting_format should match');
      this.assert(booking.company_size === sizeKey, 'Booking company_size should be 11_50');
      this.assert(booking.contact_name === 'Taylor Reed', 'Booking contact_name should match');

      // Verify persistence
      const storedBookings = JSON.parse(localStorage.getItem('consultation_bookings') || '[]');
      this.assert(storedBookings.length > 0, 'There should be at least one consultation booking stored');
      const storedMatch = storedBookings.find(function (b) { return b.id === booking.id; });
      this.assert(!!storedMatch, 'Stored booking should match returned booking');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Build a digital marketing bundle under $900/month with SEO, social media, and blog content
  testTask4_MarketingBundleUnderBudget() {
    const testName = 'Task 4: Build marketing bundle (SEO, social, blog) under $900 and request proposal';
    console.log('Testing:', testName);

    try {
      // Simulate navigation
      const homeContent = this.logic.getHomePageContent();
      this.assert(homeContent && Array.isArray(homeContent.services_summary), 'Home content should include services summary');

      const marketingOverview = this.logic.getMarketingServicesOverview();
      this.assert(marketingOverview && marketingOverview.seo_summary, 'Marketing overview should include SEO summary');

      // Get plan options
      const planOptions = this.logic.getMarketingPlanOptions();
      this.assert(planOptions && Array.isArray(planOptions.seo_plans), 'SEO plans should be returned');
      this.assert(Array.isArray(planOptions.social_media_plans), 'Social media plans should be returned');
      this.assert(Array.isArray(planOptions.blog_content_plans), 'Blog content plans should be returned');

      const budgetLimit = 900;

      // Choose most advanced SEO plan with monthly_price <= 500
      const seoCandidates = planOptions.seo_plans.filter(function (p) {
        return p.status === 'active' && p.monthly_price <= 500;
      });
      this.assert(seoCandidates.length > 0, 'There should be at least one SEO plan within $500');
      seoCandidates.sort(function (a, b) { return b.monthly_price - a.monthly_price; });
      const selectedSeo = seoCandidates[0];

      // Choose highest-tier social plan that allows a blog plan with at least 1 post/month while total <= 900
      const socialSorted = planOptions.social_media_plans.filter(function (p) { return p.status === 'active'; }).slice();
      // Sort by monthly_price descending to try higher-tier options first
      socialSorted.sort(function (a, b) { return b.monthly_price - a.monthly_price; });

      let selectedSocial = null;
      let selectedBlog = null;

      for (let i = 0; i < socialSorted.length && !selectedSocial; i++) {
        const social = socialSorted[i];
        const remainingBudget = budgetLimit - selectedSeo.monthly_price - social.monthly_price;
        if (remainingBudget <= 0) continue;
        const blogCandidates = planOptions.blog_content_plans.filter(function (b) {
          return b.status === 'active' && b.posts_per_month >= 1 && b.monthly_price <= remainingBudget;
        });
        if (blogCandidates.length === 0) continue;
        // Choose lowest-priced blog plan that satisfies constraints
        blogCandidates.sort(function (a, b) { return a.monthly_price - b.monthly_price; });
        selectedSocial = social;
        selectedBlog = blogCandidates[0];
      }

      this.assert(!!selectedSocial, 'Should find a suitable social media plan within budget');
      this.assert(!!selectedBlog, 'Should find a suitable blog content plan within budget');

      const totalPrice = selectedSeo.monthly_price + selectedSocial.monthly_price + selectedBlog.monthly_price;
      this.assert(totalPrice <= budgetLimit, 'Combined monthly price should be <= budget limit');

      // Create bundle via API
      const bundleResult = this.logic.createMarketingBundle(
        selectedSeo.id,
        selectedSocial.id,
        selectedBlog.id,
        budgetLimit
      );

      this.assert(bundleResult && bundleResult.bundle, 'createMarketingBundle should return a bundle');
      const bundle = bundleResult.bundle;
      this.assert(bundle.total_monthly_price <= budgetLimit, 'Bundle total_monthly_price should be <= budget limit');
      this.assert(bundleResult.is_within_budget === true, 'is_within_budget should be true');
      this.assert(bundle.seo_plan_id === selectedSeo.id, 'Bundle should reference selected SEO plan');
      this.assert(bundle.social_media_plan_id === selectedSocial.id, 'Bundle should reference selected social media plan');
      this.assert(bundle.blog_content_plan_id === selectedBlog.id, 'Bundle should reference selected blog content plan');

      // Submit proposal request
      const proposalResult = this.logic.submitMarketingProposalRequest(
        bundle.id,
        'Jordan Lee',
        'NovaTech Media',
        'jordan.lee@example.com',
        'Please send a detailed proposal for this bundle.'
      );

      this.assert(proposalResult && proposalResult.success === true, 'submitMarketingProposalRequest should succeed');
      this.assert(proposalResult.proposal_request, 'Proposal request object should be returned');

      const proposal = proposalResult.proposal_request;
      this.assert(proposal.marketing_bundle_id === bundle.id, 'Proposal should reference the created bundle');
      this.assert(proposal.contact_name === 'Jordan Lee', 'Proposal contact_name should match');

      // Verify persistence
      const storedBundles = JSON.parse(localStorage.getItem('marketing_bundles') || '[]');
      this.assert(storedBundles.length > 0, 'There should be at least one marketing bundle stored');
      const storedBundle = storedBundles.find(function (b) { return b.id === bundle.id; });
      this.assert(!!storedBundle, 'Stored bundle should match returned bundle');

      const storedProposals = JSON.parse(localStorage.getItem('marketing_proposal_requests') || '[]');
      this.assert(storedProposals.length > 0, 'There should be at least one marketing proposal request stored');
      const storedProposal = storedProposals.find(function (p) { return p.id === proposal.id; });
      this.assert(!!storedProposal, 'Stored proposal should match returned proposal');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Find a retail case study that uses both IT support and video production and contact sales
  testTask5_RetailCaseStudyAndContactSales() {
    const testName = 'Task 5: Find retail case study using IT support & video production and contact sales';
    console.log('Testing:', testName);

    try {
      // Simulate navigation to case studies via home page
      const homeContent = this.logic.getHomePageContent();
      this.assert(homeContent && Array.isArray(homeContent.featured_case_studies), 'Home content should include featured case studies');

      // Get filters
      const filters = this.logic.getCaseStudyFilters();
      this.assert(filters && Array.isArray(filters.industries), 'Case study industries should be available');
      this.assert(Array.isArray(filters.services), 'Case study services should be available');

      const industryValue = 'retail';
      this.assert(filters.industries.some(function (i) { return i.value === industryValue; }), 'Retail industry should be an available filter');

      const itSupportKey = 'it_support';
      const videoProdKey = 'video_production';
      this.assert(filters.services.some(function (s) { return s.key === itSupportKey; }), 'it_support service filter should be available');
      this.assert(filters.services.some(function (s) { return s.key === videoProdKey; }), 'video_production service filter should be available');

      // Search case studies
      const searchResult = this.logic.searchCaseStudies(industryValue, [itSupportKey, videoProdKey], 'most_recent');
      this.assert(searchResult && Array.isArray(searchResult.case_studies), 'searchCaseStudies should return array');
      this.assert(searchResult.case_studies.length > 0, 'There should be at least one retail case study with both services');

      const selectedCaseStudy = searchResult.case_studies[0];
      this.assert(selectedCaseStudy.industry === industryValue, 'Selected case study should be in retail industry');
      this.assert(Array.isArray(selectedCaseStudy.services), 'Case study services should be an array');
      this.assert(selectedCaseStudy.services.indexOf(itSupportKey) !== -1, 'Case study should include it_support');
      this.assert(selectedCaseStudy.services.indexOf(videoProdKey) !== -1, 'Case study should include video_production');

      // Get details
      const caseStudyDetails = this.logic.getCaseStudyDetails(selectedCaseStudy.id);
      this.assert(caseStudyDetails && caseStudyDetails.case_study && caseStudyDetails.case_study.id === selectedCaseStudy.id, 'getCaseStudyDetails should return correct case study');

      // Submit contact request from case study page
      const message = 'We are a retail company interested in IT support and video production services similar to this case study.';
      const contactResult = this.logic.submitCaseStudyContactRequest(
        selectedCaseStudy.id,
        message,
        'Morgan Smith',
        'morgan.smith@example.com'
      );

      this.assert(contactResult && contactResult.success === true, 'submitCaseStudyContactRequest should succeed');
      this.assert(contactResult.contact_request, 'Contact request object should be returned');

      const contact = contactResult.contact_request;
      this.assert(contact.case_study_id === selectedCaseStudy.id, 'Contact request should reference selected case study');
      this.assert(contact.message === message, 'Contact message should match');

      // Verify persistence
      const storedContacts = JSON.parse(localStorage.getItem('case_study_contact_requests') || '[]');
      this.assert(storedContacts.length > 0, 'There should be at least one case study contact request stored');
      const storedMatch = storedContacts.find(function (c) { return c.id === contact.id; });
      this.assert(!!storedMatch, 'Stored contact request should match returned contact_request');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Save the most recent cloud backup help article to a reading list
  testTask6_SaveMostRecentCloudBackupArticle() {
    const testName = 'Task 6: Save most recent cloud backup help article to reading list';
    console.log('Testing:', testName);

    try {
      // Search help articles for cloud backup, topic cloud_services, sorted by most recent
      const searchResult = this.logic.searchHelpArticles('cloud backup', 'cloud_services', 'most_recent');
      this.assert(searchResult && Array.isArray(searchResult.articles), 'searchHelpArticles should return articles array');
      this.assert(searchResult.articles.length > 0, 'There should be at least one cloud backup help article');

      const mostRecentArticle = searchResult.articles[0];

      // Confirm details
      const articleDetails = this.logic.getHelpArticleDetails(mostRecentArticle.id);
      this.assert(articleDetails && articleDetails.article && articleDetails.article.id === mostRecentArticle.id, 'getHelpArticleDetails should return correct article');

      // Check existing reading lists
      const listsResult = this.logic.getReadingLists();
      this.assert(listsResult && Array.isArray(listsResult.reading_lists), 'getReadingLists should return reading_lists array');

      // Save article to a new reading list named 'Cloud Topics'
      const saveResult = this.logic.saveHelpArticleToReadingList(
        mostRecentArticle.id,
        'new',
        null,
        'Cloud Topics'
      );

      this.assert(saveResult && saveResult.success === true, 'saveHelpArticleToReadingList should succeed');
      this.assert(saveResult.reading_list && saveResult.item, 'Should return reading_list and item');
      const list = saveResult.reading_list;
      const item = saveResult.item;

      this.assert(list.name === 'Cloud Topics', 'Reading list name should be Cloud Topics');
      this.assert(item.help_article_id === mostRecentArticle.id, 'ReadingListItem should reference the correct article');

      // Verify persistence
      const storedLists = JSON.parse(localStorage.getItem('reading_lists') || '[]');
      this.assert(storedLists.length > 0, 'There should be at least one reading list stored');
      const storedList = storedLists.find(function (l) { return l.id === list.id; });
      this.assert(!!storedList, 'Stored reading list should match returned list');

      const storedItems = JSON.parse(localStorage.getItem('reading_list_items') || '[]');
      this.assert(storedItems.length > 0, 'There should be at least one reading list item stored');
      const storedItem = storedItems.find(function (i) { return i.id === item.id; });
      this.assert(!!storedItem, 'Stored reading list item should match returned item');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Submit a high-priority support ticket for an email migration issue
  testTask7_HighPrioritySupportTicketEmailMigration() {
    const testName = 'Task 7: Submit high-priority support ticket for email migration issue';
    console.log('Testing:', testName);

    try {
      // Support overview
      const supportOverview = this.logic.getSupportOverview();
      this.assert(supportOverview && Array.isArray(supportOverview.channels), 'Support overview should include channels');

      // Submit support ticket
      const subject = 'Urgent: Email migration not completing';
      const description = 'We started migrating 25 user mailboxes to your hosted email service, and the migration has stalled at 60% for over 4 hours. Please advise on next steps.';

      const ticketResult = this.logic.submitSupportTicket(
        'existing_customer',
        'email_collaboration',
        subject,
        description,
        'high',
        'it.admin@example.com'
      );

      this.assert(ticketResult && ticketResult.success === true, 'submitSupportTicket should succeed');
      this.assert(ticketResult.ticket, 'Support ticket object should be returned');

      const ticket = ticketResult.ticket;
      this.assert(ticket.customer_type === 'existing_customer', 'Ticket customer_type should be existing_customer');
      this.assert(ticket.issue_category === 'email_collaboration', 'Ticket issue_category should be email_collaboration');
      this.assert(ticket.subject === subject, 'Ticket subject should match');
      this.assert(ticket.priority === 'high' || ticket.priority === 'urgent', 'Ticket priority should be high or escalated to urgent');
      this.assert(ticket.contact_email === 'it.admin@example.com', 'Ticket contact_email should match');

      // Verify persistence
      const storedTickets = JSON.parse(localStorage.getItem('support_tickets') || '[]');
      this.assert(storedTickets.length > 0, 'There should be at least one support ticket stored');
      const storedMatch = storedTickets.find(function (t) { return t.id === ticket.id; });
      this.assert(!!storedMatch, 'Stored ticket should match returned ticket');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Start a free trial of the most affordable RMM plan for at least 25 devices under $600/month
  testTask8_RmmMostAffordableTrialPlan() {
    const testName = 'Task 8: Start free trial of most affordable RMM plan for >=25 devices under $600';
    console.log('Testing:', testName);

    try {
      // Simulate navigation via home page
      const homeContent = this.logic.getHomePageContent();
      this.assert(homeContent && Array.isArray(homeContent.services_summary), 'Home content should include services summary');

      // Get RMM filter options
      const rmmFilters = this.logic.getRmmFilterOptions();
      this.assert(rmmFilters && Array.isArray(rmmFilters.sort_options), 'RMM filter options should be available');

      // List RMM plans with filters (active, trial available, price under 600)
      const listResult = this.logic.listRmmPlans(
        {
          status: 'active',
          trial_available_only: true,
          max_monthly_price: 600
        },
        'price_low_to_high'
      );

      this.assert(listResult && Array.isArray(listResult.plans), 'listRmmPlans should return plans array');
      this.assert(listResult.plans.length > 0, 'There should be at least one active RMM plan with trial under $600');

      // From returned plans, find plans that support at least 25 devices
      const candidatePlans = listResult.plans.filter(function (p) {
        const supportsAtLeast25 = (typeof p.max_devices === 'number' && p.max_devices >= 25) || (typeof p.min_devices === 'number' && p.min_devices >= 25);
        return supportsAtLeast25 && p.monthly_price < 600 && p.is_trial_available === true && p.status === 'active';
      });

      this.assert(candidatePlans.length > 0, 'There should be at least one RMM plan supporting >=25 devices under $600 with trial');

      // Select the cheapest candidate by monthly_price
      candidatePlans.sort(function (a, b) { return a.monthly_price - b.monthly_price; });
      const selectedPlan = candidatePlans[0];

      // Confirm details
      const planDetails = this.logic.getRmmPlanDetails(selectedPlan.id);
      this.assert(planDetails && planDetails.plan && planDetails.plan.id === selectedPlan.id, 'getRmmPlanDetails should return correct plan');

      // Start free trial
      const estimatedDevices = 25;
      const trialResult = this.logic.startRmmFreeTrial(
        selectedPlan.id,
        'Chris Alvarez',
        'Northbridge IT',
        'chris.alvarez@example.com',
        estimatedDevices
      );

      this.assert(trialResult && trialResult.success === true, 'startRmmFreeTrial should succeed');
      this.assert(trialResult.trial, 'RMMTrialSignup object should be returned');

      const trial = trialResult.trial;
      this.assert(trial.rmm_plan_id === selectedPlan.id, 'Trial should reference selected RMM plan');
      if (typeof trial.estimated_devices === 'number') {
        this.assert(trial.estimated_devices === estimatedDevices, 'Trial estimated_devices should match input');
      }

      // Verify persistence
      const storedTrials = JSON.parse(localStorage.getItem('rmm_trial_signups') || '[]');
      this.assert(storedTrials.length > 0, 'There should be at least one RMM trial signup stored');
      const storedMatch = storedTrials.find(function (t) { return t.id === trial.id; });
      this.assert(!!storedMatch, 'Stored RMM trial signup should match returned trial');

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
