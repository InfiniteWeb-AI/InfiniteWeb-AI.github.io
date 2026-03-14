// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }
    // Reinitialize storage structure via business logic
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      "articles": [
        {
          "id": "art_saas_onboarding_2023",
          "title": "Designing Frictionless SaaS Onboarding Flows in 2023",
          "slug": "saas-onboarding-ux-2023",
          "summary": "A practical guide to crafting SaaS onboarding experiences that activate users quickly without overwhelming them.",
          "content": "In this article we break down the anatomy of an effective SaaS onboarding flow: first-run experience, contextual education, progressive disclosure, and ongoing nudges. We cover patterns for welcome tours, empty states, checklists, and lifecycle emails, including examples from leading SaaS products...",
          "tags": [
            "saas",
            "onboarding",
            "ux",
            "user_experience",
            "product_design"
          ],
          "estimated_read_time_minutes": 9,
          "category": "ux",
          "published_at": "2023-06-15T10:00:00Z",
          "status": "published"
        },
        {
          "id": "art_saas_onboarding_metrics",
          "title": "5 Onboarding Metrics Every SaaS Product Team Should Track",
          "slug": "saas-onboarding-metrics",
          "summary": "How to measure the real impact of your SaaS onboarding with activation, time-to-value, and early retention metrics.",
          "content": "Onboarding is only as good as the outcomes it creates. In this article we outline the core metrics that should sit on every SaaS product team's dashboard...",
          "tags": [
            "saas",
            "onboarding",
            "ux",
            "analytics"
          ],
          "estimated_read_time_minutes": 7,
          "category": "product",
          "published_at": "2023-09-02T14:30:00Z",
          "status": "published"
        },
        {
          "id": "art_ecommerce_ux_patterns",
          "title": "UX Patterns That Boost Ecommerce Conversion Rates",
          "slug": "ecommerce-ux-patterns",
          "summary": "From navigation to checkout, these UX patterns can help lift ecommerce conversion rates without redesigning from scratch.",
          "content": "Small UX improvements compound into meaningful revenue. In this case we review patterns around product discovery, merchandising, and checkout...",
          "tags": [
            "ecommerce",
            "ux",
            "conversion_optimization"
          ],
          "estimated_read_time_minutes": 8,
          "category": "ux",
          "published_at": "2024-03-21T09:15:00Z",
          "status": "published"
        }
      ],
      "branding_add_ons": [
        {
          "id": "addon_social_media_kit",
          "name": "Social Media Launch Kit",
          "description": "Profile and cover images for major social networks, plus 5 announcement templates.",
          "price": 750,
          "is_active": true,
          "image": "https://pd12m.s3.us-west-2.amazonaws.com/images/075b5299-d3b3-5f53-89ba-ee2ae2cdefda.jpeg"
        },
        {
          "id": "addon_extra_logo_concepts",
          "name": "Additional Logo Concepts",
          "description": "Three extra logo concepts beyond the ones included in your package.",
          "price": 600,
          "is_active": true,
          "image": "https://sketchcorp.com/wp-content/uploads/2019/12/Dec-Blog1-VizaGo1.jpg"
        },
        {
          "id": "addon_pitch_deck_design",
          "name": "Investor Pitch Deck Design",
          "description": "Custom 12–16 slide pitch deck aligned with your new brand.",
          "price": 2400,
          "is_active": true,
          "image": "https://i.pinimg.com/originals/60/d5/b6/60d5b6c59193994dc6635a9bec923581.jpg"
        }
      ],
      "branding_packages": [
        {
          "id": "brand_starter",
          "name": "Brand Starter",
          "slug": "brand-starter",
          "description": "A streamlined identity package for early-stage teams who need to look credible fast.",
          "one_time_price": 2800,
          "monthly_price": null,
          "number_of_logo_concepts": 2,
          "includes_brand_guidelines": false,
          "includes_stationery_design": false,
          "includes_website_styleguide": false,
          "is_active": true,
          "image": "https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=800&h=600&fit=crop&auto=format&q=80"
        },
        {
          "id": "brand_core",
          "name": "Brand Core",
          "slug": "brand-core",
          "description": "A robust visual identity with multiple logo directions and a concise brand guidelines document.",
          "one_time_price": 4200,
          "monthly_price": null,
          "number_of_logo_concepts": 3,
          "includes_brand_guidelines": true,
          "includes_stationery_design": true,
          "includes_website_styleguide": false,
          "is_active": true,
          "image": "https://www.mightybytes.com/wp-content/uploads/2020/06/design-workshop-stickies.jpg"
        },
        {
          "id": "brand_plus",
          "name": "Brand Plus",
          "slug": "brand-plus",
          "description": "A comprehensive identity system including digital and print applications plus a website styleguide.",
          "one_time_price": 6800,
          "monthly_price": 650,
          "number_of_logo_concepts": 4,
          "includes_brand_guidelines": true,
          "includes_stationery_design": true,
          "includes_website_styleguide": true,
          "is_active": true,
          "image": "https://inspirationfeed.com/wp-content/uploads/2018/04/Notebook-laptop-and-a-smartphone-laying-together-on-top-of-a-workspace-desk.jpg"
        }
      ],
      "case_studies": [
        {
          "id": "cs_ecom_conversion_aurora",
          "title": "Aurora Market: 32% Conversion Lift from Checkout Redesign",
          "slug": "aurora-market-checkout-optimization",
          "industry": "ecommerce",
          "summary": "A fast-growing DTC brand partnered with us to streamline their checkout and saw a 32% lift in completed orders.",
          "client_name": "Aurora Market",
          "conversion_rate_increase_percent": 32,
          "other_metrics": [
            "-18% cart abandonment",
            "+24% mobile revenue"
          ],
          "thumbnail_image_url": "https://images.unsplash.com/photo-1515165562835-c4c9e0737eaa?w=800&h=600&fit=crop&auto=format&q=80",
          "published_at": "2023-08-10T09:30:00Z",
          "is_featured": true
        },
        {
          "id": "cs_ecom_conversion_brightside",
          "title": "BrightSide Home: 24% Increase in Add-to-Cart Rate",
          "slug": "brightside-home-product-page-refresh",
          "industry": "ecommerce",
          "summary": "Product page and navigation refinements led to a 24% increase in add-to-cart events for a home goods retailer.",
          "client_name": "BrightSide Home",
          "conversion_rate_increase_percent": 24,
          "other_metrics": [
            "+15% average order value",
            "+11% repeat purchases"
          ],
          "thumbnail_image_url": "https://images.unsplash.com/photo-1515165562835-c4c9e0737eaa?w=800&h=600&fit=crop&auto=format&q=80",
          "published_at": "2022-11-19T13:15:00Z",
          "is_featured": false
        },
        {
          "id": "cs_ecom_ux_mobile",
          "title": "Mobile-First UX for StreetWear Co.",
          "slug": "streetwear-mobile-first-ux",
          "industry": "ecommerce",
          "summary": "A mobile-first navigation and filtering redesign that made discovery effortless for a streetwear retailer.",
          "client_name": "StreetWear Co.",
          "conversion_rate_increase_percent": 18,
          "other_metrics": [
            "+40% search usage",
            "+29% product views per session"
          ],
          "thumbnail_image_url": "https://assets.netohq.com/cms/blog/future-of-retail-shopping-mall2.jpeg",
          "published_at": "2021-05-04T16:00:00Z",
          "is_featured": false
        }
      ],
      "discovery_call_slots": [
        {
          "id": "slot_2026_03_04_0900_utc",
          "start_time": "2026-03-04T09:00:00Z",
          "end_time": "2026-03-04T09:30:00Z",
          "duration_minutes": 30,
          "time_zone": "utc",
          "is_morning_slot": true,
          "status": "available"
        },
        {
          "id": "slot_2026_03_04_0930_utc",
          "start_time": "2026-03-04T09:30:00Z",
          "end_time": "2026-03-04T10:00:00Z",
          "duration_minutes": 30,
          "time_zone": "utc",
          "is_morning_slot": true,
          "status": "booked"
        },
        {
          "id": "slot_2026_03_04_1000_utc",
          "start_time": "2026-03-04T10:00:00Z",
          "end_time": "2026-03-04T10:30:00Z",
          "duration_minutes": 30,
          "time_zone": "utc",
          "is_morning_slot": true,
          "status": "available"
        }
      ],
      "maintenance_plans": [
        {
          "id": "maint_essentials_monthly",
          "name": "Essentials Care",
          "slug": "essentials-care-monthly",
          "description": "Baseline maintenance for smaller sites that need security updates and uptime monitoring.",
          "billing_frequency": "monthly",
          "monthly_price": 220,
          "yearly_price": null,
          "support_hours_per_month": 4,
          "response_sla_hours": 24,
          "includes_monitoring": true,
          "includes_security_updates": true,
          "is_active": true
        },
        {
          "id": "maint_growth_monthly",
          "name": "Growth Care",
          "slug": "growth-care-monthly",
          "description": "For growing businesses that need regular content updates and priority support.",
          "billing_frequency": "monthly",
          "monthly_price": 650,
          "yearly_price": null,
          "support_hours_per_month": 10,
          "response_sla_hours": 12,
          "includes_monitoring": true,
          "includes_security_updates": true,
          "is_active": true
        },
        {
          "id": "maint_growth_plus_monthly",
          "name": "Growth Plus Care",
          "slug": "growth-plus-care-monthly",
          "description": "Additional support hours and quarterly UX reviews for marketing-led teams.",
          "billing_frequency": "monthly",
          "monthly_price": 980,
          "yearly_price": null,
          "support_hours_per_month": 15,
          "response_sla_hours": 8,
          "includes_monitoring": true,
          "includes_security_updates": true,
          "is_active": true
        }
      ],
      "pages": [
        {
          "id": "home",
          "name": "Home",
          "filename": "index.html",
          "description": "Homepage introducing the agency, key services, and featured work."
        },
        {
          "id": "services_overview",
          "name": "Services",
          "filename": "services.html",
          "description": "Overview of all services with links to detailed service pages."
        },
        {
          "id": "work_case_studies",
          "name": "Work / Case Studies",
          "filename": "case_studies.html",
          "description": "Grid of case studies and portfolio projects with filtering by industry and outcomes."
        }
      ],
      "ux_hourly_pricing_tiers": [
        {
          "id": "ux_hourly_10_39",
          "name": "Explorer (10–39 hours)",
          "pricing_mode": "hourly",
          "min_hours": 10,
          "max_hours": 39,
          "base_hourly_rate": 240,
          "discounted_hourly_rate": null,
          "requires_commitment_description": "",
          "is_active": true
        },
        {
          "id": "ux_hourly_40_79",
          "name": "Core (40–79 hours)",
          "pricing_mode": "hourly",
          "min_hours": 40,
          "max_hours": 79,
          "base_hourly_rate": 220,
          "discounted_hourly_rate": 205,
          "requires_commitment_description": "Discounted rate applies with a minimum 40-hour block booked in advance.",
          "is_active": true
        },
        {
          "id": "ux_hourly_80_119",
          "name": "Scaling (80–119 hours)",
          "pricing_mode": "hourly",
          "min_hours": 80,
          "max_hours": 119,
          "base_hourly_rate": 210,
          "discounted_hourly_rate": 185,
          "requires_commitment_description": "Sub-$200 rate with an 80+ hour research roadmap commitment.",
          "is_active": true
        }
      ],
      "navigation_links": [
        {
          "id": "nav_header_home",
          "text": "Home",
          "path": "index.html",
          "description": "Homepage",
          "position": "header",
          "order": 1,
          "page_id": "home"
        },
        {
          "id": "nav_header_services",
          "text": "Services",
          "path": "services.html",
          "description": "Overview of all services, with links to individual service pages",
          "position": "header",
          "order": 2,
          "page_id": "services_overview"
        },
        {
          "id": "nav_header_work",
          "text": "Work",
          "path": "case_studies.html",
          "description": "Case studies and portfolio of client projects",
          "position": "header",
          "order": 3,
          "page_id": "work_case_studies"
        }
      ],
      "_metadata": {
        "baselineDate": "2026-03-03",
        "generatedAt": "2026-03-03T03:11:27.096795"
      }
    };

    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage is not available in this environment');
    }

    localStorage.setItem('articles', JSON.stringify(generatedData.articles || []));
    localStorage.setItem('branding_add_ons', JSON.stringify(generatedData.branding_add_ons || []));
    localStorage.setItem('branding_packages', JSON.stringify(generatedData.branding_packages || []));
    localStorage.setItem('case_studies', JSON.stringify(generatedData.case_studies || []));
    localStorage.setItem('discovery_call_slots', JSON.stringify(generatedData.discovery_call_slots || []));
    localStorage.setItem('maintenance_plans', JSON.stringify(generatedData.maintenance_plans || []));
    localStorage.setItem('pages', JSON.stringify(generatedData.pages || []));
    localStorage.setItem('ux_hourly_pricing_tiers', JSON.stringify(generatedData.ux_hourly_pricing_tiers || []));
    localStorage.setItem('navigation_links', JSON.stringify(generatedData.navigation_links || []));
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata || {}));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SubmitWebsiteRedesignQuoteRequest();
    this.testTask2_ChooseCheapestMonthlyMaintenancePlanAtLeast10Hours();
    this.testTask3_SaveEcommerceCaseStudyWith20PercentUplift();
    this.testTask4_Save2023SaasOnboardingUxArticle();
    this.testTask5_CreateMobileAppPlusWebsiteEstimateUnder25k();
    this.testTask6_Book30MinuteDiscoveryCallWednesdayMorning();
    this.testTask7_ConfigureUxHourlyEngagementUnder200();
    this.testTask8_SelectBrandingPackageUnder5kWith3LogosAndGuidelines();

    return this.results;
  }

  // ===== Task 1 =====
  testTask1_SubmitWebsiteRedesignQuoteRequest() {
    const testName = 'Task 1: Submit website redesign quote request for 12 pages with $8,000 budget';
    console.log('Testing:', testName);

    try {
      // Simulate navigation from home to services to web design
      const homeContent = this.logic.getHomeHeroAndServiceLinks();
      this.assert(homeContent && typeof homeContent === 'object', 'Home content should load');

      const servicesOverview = this.logic.getServicesOverviewContent();
      this.assert(servicesOverview && servicesOverview.service_categories, 'Services overview should load');

      // Load web design service content and quote form config
      const webDesignContent = this.logic.getWebDesignServiceContent();
      this.assert(webDesignContent && webDesignContent.project_type_options, 'Web design service content should load');

      // Select project type = website_redesign
      const projectTypeOption = webDesignContent.project_type_options.find(function (opt) {
        return opt.value === 'website_redesign';
      });
      this.assert(projectTypeOption, 'Project type option for website_redesign should exist');

      // Select timeline = within_3_months
      const timelineOption = webDesignContent.timeline_options.find(function (opt) {
        return opt.value === 'within_3_months';
      });
      this.assert(timelineOption, 'Timeline option within_3_months should exist');

      // Submit quote request via API, using actual enum values
      const submitResult = this.logic.submitWebProjectQuoteRequest(
        projectTypeOption.value, // project_type
        12,                      // approximate_number_of_pages
        8000,                    // exact_budget
        timelineOption.value,    // timeline
        'Redesign request via automated test', // additional_details
        'Alex Rivera',           // contact_name
        'alex@example.com',      // contact_email
        '555-0101'               // contact_phone
      );

      this.assert(submitResult && submitResult.success === true, 'Quote submission should succeed');
      this.assert(submitResult.quote_request, 'Quote submission should return quote_request');

      const qr = submitResult.quote_request;
      this.assert(qr.project_type === projectTypeOption.value, 'Quote project_type should match selected option');
      this.assert(qr.approximate_number_of_pages === 12, 'Quote approximate_number_of_pages should be 12');
      this.assert(qr.exact_budget === 8000, 'Quote exact_budget should be 8000');
      this.assert(qr.timeline === timelineOption.value, 'Quote timeline should match selected timeline');
      this.assert(qr.contact_name === 'Alex Rivera', 'Quote contact_name should match');
      this.assert(qr.contact_email === 'alex@example.com', 'Quote contact_email should match');
      this.assert(!!qr.created_at, 'Quote created_at should be set');

      // Verify persistence in storage using storage key
      const storedQuotesRaw = localStorage.getItem('web_project_quote_requests') || '[]';
      const storedQuotes = JSON.parse(storedQuotesRaw);
      const stored = storedQuotes.find(function (item) { return item.id === qr.id; });
      this.assert(!!stored, 'Quote request should be persisted in storage');
      this.assert(stored.exact_budget === 8000, 'Persisted quote should have correct budget');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 2 =====
  testTask2_ChooseCheapestMonthlyMaintenancePlanAtLeast10Hours() {
    const testName = 'Task 2: Choose cheapest monthly maintenance plan with >=10 support hours and start onboarding';
    console.log('Testing:', testName);

    try {
      // From home, navigate to Care & Maintenance
      const homeContent = this.logic.getHomeHeroAndServiceLinks();
      this.assert(homeContent && homeContent.core_services, 'Home core services should load');

      const maintenanceOverview = this.logic.getMaintenanceOverviewContent();
      this.assert(maintenanceOverview && maintenanceOverview.featured_plans, 'Maintenance overview should load');

      const filterOptions = this.logic.getMaintenancePlanFilterOptions();
      this.assert(filterOptions && filterOptions.billing_frequencies, 'Maintenance billing filters should load');
      const monthlyFilter = filterOptions.billing_frequencies.find(function (opt) { return opt.value === 'monthly'; });
      this.assert(monthlyFilter, 'Monthly billing filter should exist');

      // Get monthly plans for comparison
      const monthlyPlans = this.logic.getMaintenancePlansForComparison('monthly');
      this.assert(Array.isArray(monthlyPlans) && monthlyPlans.length > 0, 'Should load monthly maintenance plans');

      // Among visible plans, find cheapest one with >=10 support hours
      let eligiblePlans = monthlyPlans.filter(function (plan) {
        return plan.is_active && plan.support_hours_per_month >= 10;
      });
      this.assert(eligiblePlans.length > 0, 'There should be at least one plan with >=10 support hours');

      let selectedPlan = eligiblePlans.reduce(function (best, plan) {
        if (!best) return plan;
        return (plan.monthly_price < best.monthly_price) ? plan : best;
      }, null);

      this.assert(selectedPlan, 'A maintenance plan should be selected');

      // Load signup context for the selected plan
      const signupContext = this.logic.getMaintenancePlanSignupContext(selectedPlan.id);
      this.assert(signupContext && signupContext.plan, 'Signup context should load');
      this.assert(signupContext.plan.id === selectedPlan.id, 'Signup context plan ID should match selected plan');

      // Compute 1st day of next month (ISO date string)
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth(); // 0-based
      const nextMonthDate = new Date(Date.UTC(year, month + 1, 1));
      const preferredStartDate = this.toISODate(nextMonthDate);

      // Submit onboarding
      const signupResult = this.logic.submitMaintenancePlanSignup(
        selectedPlan.id,
        'Bright Side Studio',
        'https://example-client.com',
        preferredStartDate
      );

      this.assert(signupResult && signupResult.success === true, 'Maintenance plan signup should succeed');
      this.assert(signupResult.signup, 'Signup result should contain signup object');

      const signup = signupResult.signup;
      this.assert(signup.maintenance_plan_id === selectedPlan.id, 'Signup should reference selected plan ID');
      this.assert(signup.company_name === 'Bright Side Studio', 'Signup company_name should match');
      this.assert(signup.primary_website_url === 'https://example-client.com', 'Signup primary_website_url should match');
      this.assert(!!signup.preferred_start_date, 'Signup preferred_start_date should be set');

      // Verify price and hours snapshots copied from selected plan
      this.assert(signup.plan_name_snapshot === selectedPlan.name, 'Signup plan_name_snapshot should match selected plan name');
      this.assert(signup.monthly_price_snapshot === selectedPlan.monthly_price, 'Signup monthly_price_snapshot should match plan monthly price');
      this.assert(signup.support_hours_per_month_snapshot === selectedPlan.support_hours_per_month, 'Signup support hours snapshot should match plan');

      // Verify persistence
      const storedSignupsRaw = localStorage.getItem('maintenance_plan_signups') || '[]';
      const storedSignups = JSON.parse(storedSignupsRaw);
      const storedSignup = storedSignups.find(function (s) { return s.id === signup.id; });
      this.assert(!!storedSignup, 'Maintenance plan signup should be persisted');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 3 =====
  testTask3_SaveEcommerceCaseStudyWith20PercentUplift() {
    const testName = 'Task 3: Save ecommerce case study with >=20% conversion uplift to shortlist and reopen';
    console.log('Testing:', testName);

    try {
      // Navigate to case studies
      const homeContent = this.logic.getHomeHeroAndServiceLinks();
      this.assert(homeContent && homeContent.core_services, 'Home content should load for case studies');

      const filterOptions = this.logic.getCaseStudyFilterOptions();
      this.assert(filterOptions && filterOptions.industries && filterOptions.sort_options, 'Case study filter options should load');

      const ecommerceIndustry = filterOptions.industries.find(function (i) { return i.value === 'ecommerce'; });
      this.assert(ecommerceIndustry, 'Ecommerce industry filter should exist');

      const conversionDescSort = filterOptions.sort_options.find(function (s) { return s.value === 'conversion_uplift_desc'; });
      this.assert(conversionDescSort, 'Conversion uplift descending sort option should exist');

      // Get ecommerce case studies sorted by conversion uplift high to low
      const caseStudiesResult = this.logic.getCaseStudies(
        { industry: 'ecommerce', min_conversion_rate_increase_percent: 20 },
        'conversion_uplift_desc',
        1,
        12
      );

      this.assert(caseStudiesResult && Array.isArray(caseStudiesResult.items), 'Case studies result should have items array');
      this.assert(caseStudiesResult.items.length > 0, 'Should have at least one ecommerce case study with >=20% uplift');

      const selectedCaseStudy = caseStudiesResult.items[0];
      this.assert(selectedCaseStudy.industry === 'ecommerce', 'Selected case study should be ecommerce');
      this.assert(selectedCaseStudy.conversion_rate_increase_percent >= 20, 'Selected case study should have >=20% conversion uplift');

      // Open case study detail
      const detailResult = this.logic.getCaseStudyDetail(selectedCaseStudy.slug);
      this.assert(detailResult && detailResult.case_study, 'Case study detail should load');
      this.assert(detailResult.case_study.id === selectedCaseStudy.id, 'Case study detail should match selected case study');

      // Add to shortlist
      const addShortlistResult = this.logic.addCaseStudyToShortlist(selectedCaseStudy.id);
      this.assert(addShortlistResult && addShortlistResult.success === true, 'Adding case study to shortlist should succeed');
      this.assert(addShortlistResult.shortlist && addShortlistResult.shortlist_item, 'Shortlist and item should be returned');

      const shortlist = addShortlistResult.shortlist;
      const shortlistItem = addShortlistResult.shortlist_item;
      this.assert(shortlistItem.case_study_id === selectedCaseStudy.id, 'Shortlist item should reference selected case study ID');

      // Verify persistence
      const shortlistItemsRaw = localStorage.getItem('shortlist_items') || '[]';
      const shortlistItems = JSON.parse(shortlistItemsRaw);
      const storedItem = shortlistItems.find(function (it) { return it.id === shortlistItem.id; });
      this.assert(!!storedItem, 'Shortlist item should be persisted');

      // Header summary should reflect saved shortlist
      const savedSummary = this.logic.getUserSavedContentSummary();
      this.assert(savedSummary && savedSummary.shortlist, 'Saved content summary should include shortlist');
      this.assert(savedSummary.shortlist.count >= 1, 'Shortlist count should be at least 1');

      const inLatest = savedSummary.shortlist.latest_items.some(function (it) {
        return it.case_study_id === selectedCaseStudy.id;
      });
      this.assert(inLatest, 'Selected case study should appear in shortlist latest_items');

      // Open shortlist page and reopen case study from there
      const shortlistPage = this.logic.getShortlistItems();
      this.assert(shortlistPage && shortlistPage.items, 'Shortlist page items should load');

      const shortlisted = shortlistPage.items.find(function (entry) {
        return entry.case_study && entry.case_study.id === selectedCaseStudy.id;
      });
      this.assert(shortlisted, 'Shortlist page should contain the saved case study');

      // Reopen from shortlist using slug
      const reopenedDetail = this.logic.getCaseStudyDetail(shortlisted.case_study.slug);
      this.assert(reopenedDetail && reopenedDetail.case_study, 'Reopened case study detail should load');
      this.assert(reopenedDetail.case_study.id === selectedCaseStudy.id, 'Reopened case study should match original');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 4 =====
  testTask4_Save2023SaasOnboardingUxArticle() {
    const testName = 'Task 4: Save 2023 SaaS onboarding UX article to reading list and reopen';
    console.log('Testing:', testName);

    try {
      // Navigate to blog/insights
      const homeContent = this.logic.getHomeHeroAndServiceLinks();
      this.assert(homeContent && homeContent.core_services, 'Home content should load for blog navigation');

      const articleFilterOptions = this.logic.getArticleFilterOptions();
      this.assert(articleFilterOptions && articleFilterOptions.years && articleFilterOptions.sort_options, 'Article filter options should load');

      // Search for "SaaS onboarding" in 2023, newest first
      const searchResult = this.logic.searchArticles(
        'SaaS onboarding',
        { year: 2023, tag: undefined, category: undefined },
        'newest_first',
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.items), 'Article search should return items array');
      this.assert(searchResult.items.length > 0, 'Search should return at least one article');

      // Find first article with UX/User Experience tag and read time >=5 minutes
      const selectedArticle = searchResult.items.find(function (article) {
        const tags = article.tags || [];
        const hasUxTag = tags.indexOf('ux') !== -1 || tags.indexOf('user_experience') !== -1;
        return hasUxTag && article.estimated_read_time_minutes >= 5;
      });

      this.assert(selectedArticle, 'Should find SaaS onboarding article with UX tag and >=5 min read time');

      // Open article detail
      const articleDetail = this.logic.getArticleDetail(selectedArticle.slug);
      this.assert(articleDetail && articleDetail.article, 'Article detail should load');
      this.assert(articleDetail.article.id === selectedArticle.id, 'Article detail should match selected article');

      // Save to reading list
      const addResult = this.logic.addArticleToReadingList(selectedArticle.id);
      this.assert(addResult && addResult.success === true, 'Adding article to reading list should succeed');
      this.assert(addResult.reading_list && addResult.reading_list_item, 'Reading list and item should be returned');

      const readingList = addResult.reading_list;
      const readingListItem = addResult.reading_list_item;
      this.assert(readingListItem.article_id === selectedArticle.id, 'Reading list item should reference selected article ID');

      // Verify persistence
      const storedReadingItemsRaw = localStorage.getItem('reading_list_items') || '[]';
      const storedReadingItems = JSON.parse(storedReadingItemsRaw);
      const storedReadingItem = storedReadingItems.find(function (it) { return it.id === readingListItem.id; });
      this.assert(!!storedReadingItem, 'Reading list item should be persisted');

      // Header saved content summary
      const savedSummary = this.logic.getUserSavedContentSummary();
      this.assert(savedSummary && savedSummary.reading_list, 'Saved content summary should include reading list');
      this.assert(savedSummary.reading_list.count >= 1, 'Reading list count should be at least 1');

      const inLatest = savedSummary.reading_list.latest_items.some(function (it) {
        return it.article_id === selectedArticle.id;
      });
      this.assert(inLatest, 'Selected article should appear in reading list latest_items');

      // Open reading list page and reopen article from there
      const readingListPage = this.logic.getReadingListItems();
      this.assert(readingListPage && readingListPage.items, 'Reading list page items should load');

      const savedArticleEntry = readingListPage.items.find(function (entry) {
        return entry.article && entry.article.id === selectedArticle.id;
      });
      this.assert(savedArticleEntry, 'Reading list page should contain the saved article');

      const reopenedDetail = this.logic.getArticleDetail(savedArticleEntry.article.slug);
      this.assert(reopenedDetail && reopenedDetail.article, 'Reopened article detail should load');
      this.assert(reopenedDetail.article.id === selectedArticle.id, 'Reopened article should match original');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 5 =====
  testTask5_CreateMobileAppPlusWebsiteEstimateUnder25k() {
    const testName = 'Task 5: Create and save mobile app + website estimate at or under $25,000';
    console.log('Testing:', testName);

    try {
      // Navigate to project estimator
      const homeContent = this.logic.getHomeHeroAndServiceLinks();
      this.assert(homeContent && homeContent.primary_nav_ctas, 'Home nav CTAs should load for project estimator');

      const estimatorOptions = this.logic.getProjectEstimatorOptions();
      this.assert(estimatorOptions && estimatorOptions.design_complexity_options, 'Estimator options should load');

      // Select both Mobile app and Marketing website (booleans in API)
      const includesMobileApp = true;
      const includesMarketingWebsite = true;
      const includesOther = false;

      // Determine initial design, integrations, analytics, and content options using actual option lists
      const designOptions = estimatorOptions.design_complexity_options || [];
      const integrationOptions = estimatorOptions.integration_options || [];
      const analyticsOptions = estimatorOptions.analytics_options || [];
      const contentOptions = estimatorOptions.content_creation_options || [];

      const designStandard = designOptions.find(function (opt) { return opt.value === 'standard'; }) || designOptions[0];
      this.assert(designStandard, 'Design standard option (or fallback) should exist');

      const integrationsUpTo3 = integrationOptions.find(function (opt) { return opt.value === 'up_to_3_integrations'; }) || integrationOptions[0];
      this.assert(integrationsUpTo3, 'Integrations up_to_3_integrations option (or fallback) should exist');

      const analyticsBasic = analyticsOptions.find(function (opt) { return opt.value === 'basic_analytics'; }) || analyticsOptions[0];
      this.assert(analyticsBasic, 'Analytics basic_analytics option (or fallback) should exist');

      // Lowest-cost content option that includes at least 5 pages of copywriting
      const contentCopywritingOptions = contentOptions.filter(function (opt) {
        return typeof opt.value === 'string' && opt.value.indexOf('copywriting') === 0;
      });
      this.assert(contentCopywritingOptions.length > 0, 'There should be at least one copywriting content option');

      contentCopywritingOptions.sort(function (a, b) {
        return (a.incremental_cost || 0) - (b.incremental_cost || 0);
      });
      const contentChosen = contentCopywritingOptions[0];

      let designValue = designStandard.value;
      let integrationsValue = integrationsUpTo3.value;
      const analyticsValue = analyticsBasic.value;
      const contentValue = contentChosen.value;

      const designOptionsSorted = designOptions.slice().sort(function (a, b) {
        return (a.incremental_cost || 0) - (b.incremental_cost || 0);
      });
      const integrationOptionsSorted = integrationOptions.slice().sort(function (a, b) {
        return (a.incremental_cost || 0) - (b.incremental_cost || 0);
      });

      const targetBudget = 25000;

      // Adjust options down until total_estimated_cost <= 25,000
      let preview = null;
      let attempts = 0;
      var self = this;
      while (attempts < 10) {
        attempts += 1;
        preview = this.logic.calculateProjectEstimatePreview(
          includesMobileApp,
          includesMarketingWebsite,
          includesOther,
          designValue,
          integrationsValue,
          analyticsValue,
          contentValue,
          targetBudget
        );

        this.assert(preview && typeof preview.total_estimated_cost === 'number', 'Estimator preview should return total_estimated_cost');

        if (preview.total_estimated_cost <= targetBudget) {
          break;
        }

        // Try to reduce integrations tier first
        const currentIntegrationIndex = integrationOptionsSorted.findIndex(function (opt) { return opt.value === integrationsValue; });
        if (currentIntegrationIndex > 0) {
          integrationsValue = integrationOptionsSorted[currentIntegrationIndex - 1].value;
          continue;
        }

        // Then reduce design complexity if possible
        const currentDesignIndex = designOptionsSorted.findIndex(function (opt) { return opt.value === designValue; });
        if (currentDesignIndex > 0) {
          designValue = designOptionsSorted[currentDesignIndex - 1].value;
          continue;
        }

        // Cannot reduce further
        break;
      }

      this.assert(preview.total_estimated_cost <= targetBudget, 'Final estimate total should be <= target budget');

      // Save estimate (using on-site save, not email)
      const saveResult = this.logic.saveProjectEstimate(
        includesMobileApp,
        includesMarketingWebsite,
        includesOther,
        designValue,
        integrationsValue,
        analyticsValue,
        contentValue,
        targetBudget,
        'Jordan Kim',
        'jordan@example.com'
      );

      this.assert(saveResult && saveResult.success === true, 'Saving project estimate should succeed');
      this.assert(saveResult.estimate, 'Save result should contain estimate object');

      const estimate = saveResult.estimate;
      this.assert(estimate.includes_mobile_app === true, 'Estimate should include mobile app');
      this.assert(estimate.includes_marketing_website === true, 'Estimate should include marketing website');
      this.assert(estimate.target_budget === targetBudget, 'Estimate target_budget should be 25000');
      this.assert(estimate.total_estimated_cost <= targetBudget, 'Saved estimate total should be <= 25000');
      this.assert(estimate.contact_name === 'Jordan Kim', 'Estimate contact_name should match');
      this.assert(estimate.contact_email === 'jordan@example.com', 'Estimate contact_email should match');

      // Verify persistence
      const storedEstimatesRaw = localStorage.getItem('project_estimates') || '[]';
      const storedEstimates = JSON.parse(storedEstimatesRaw);
      const storedEstimate = storedEstimates.find(function (e) { return e.id === estimate.id; });
      this.assert(!!storedEstimate, 'Project estimate should be persisted');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 6 =====
  testTask6_Book30MinuteDiscoveryCallWednesdayMorning() {
    const testName = 'Task 6: Book 30-minute discovery call on a Wednesday morning using scheduler';
    console.log('Testing:', testName);

    try {
      // Navigate to contact and scheduler
      const homeContent = this.logic.getHomeHeroAndServiceLinks();
      this.assert(homeContent && homeContent.primary_nav_ctas, 'Home nav CTAs should load for contact');

      const contactContent = this.logic.getContactPageContent();
      this.assert(contactContent && contactContent.intro_heading, 'Contact page content should load');

      // Use current month/year in UTC for availability calendar
      const now = new Date();
      const month = now.getUTCMonth() + 1; // API expects 1-12
      const year = now.getUTCFullYear();

      const calendar = this.logic.getDiscoveryCallAvailabilityCalendar(month, year, 'utc');
      this.assert(calendar && Array.isArray(calendar.days), 'Discovery call availability calendar should load');

      // Find earliest day with at least one available morning slot
      const sortedDays = calendar.days.slice().sort(function (a, b) {
        return a.date.localeCompare(b.date);
      });

      let selectedDate = null;
      for (let i = 0; i < sortedDays.length; i++) {
        const day = sortedDays[i];
        if (day.is_available && day.available_morning_slots_count > 0) {
          selectedDate = day.date;
          break;
        }
      }

      this.assert(!!selectedDate, 'There should be at least one date with available morning slots');

      // Get slots for the selected date in UTC
      const slots = this.logic.getDiscoveryCallSlotsForDate(selectedDate, 'utc');
      this.assert(Array.isArray(slots) && slots.length > 0, 'Should load slots for selected date');

      // Choose earliest available 30-minute morning slot between 9:00 and 11:00
      const candidateSlots = slots.filter(function (slot) {
        if (slot.status !== 'available') return false;
        if (slot.duration_minutes !== 30) return false;
        if (slot.is_morning_slot !== true) return false;
        const start = new Date(slot.start_time);
        const hour = start.getUTCHours();
        return hour >= 9 && hour < 11;
      });

      this.assert(candidateSlots.length > 0, 'There should be an available 30-min morning slot between 9:00 and 11:00');

      candidateSlots.sort(function (a, b) {
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      });
      const selectedSlot = candidateSlots[0];

      // Book discovery call
      const bookingResult = this.logic.bookDiscoveryCall(
        selectedSlot.id,
        'utc',
        'Taylor Morgan',
        'taylor@example.com',
        'Northwind Apps',
        'new_product_design'
      );

      this.assert(bookingResult && bookingResult.success === true, 'Discovery call booking should succeed');
      this.assert(bookingResult.booking && bookingResult.slot, 'Booking result should include booking and slot');

      const booking = bookingResult.booking;
      const slotAfterBooking = bookingResult.slot;

      this.assert(booking.slot_id === selectedSlot.id, 'Booking should reference selected slot ID');
      this.assert(booking.selected_time_zone === 'utc', 'Booking selected_time_zone should be UTC');
      this.assert(booking.name === 'Taylor Morgan', 'Booking name should match');
      this.assert(booking.email === 'taylor@example.com', 'Booking email should match');
      this.assert(booking.topic === 'new_product_design', 'Booking topic should be new_product_design');
      this.assert(slotAfterBooking.id === selectedSlot.id, 'Returned slot should match selected slot');

      // Verify persistence of booking
      const storedBookingsRaw = localStorage.getItem('discovery_call_bookings') || '[]';
      const storedBookings = JSON.parse(storedBookingsRaw);
      const storedBooking = storedBookings.find(function (b) { return b.id === booking.id; });
      this.assert(!!storedBooking, 'Discovery call booking should be persisted');

      // Verify that the slot status in storage is updated to booked
      const storedSlotsRaw = localStorage.getItem('discovery_call_slots') || '[]';
      const storedSlots = JSON.parse(storedSlotsRaw);
      const storedSlot = storedSlots.find(function (s) { return s.id === selectedSlot.id; });
      this.assert(!!storedSlot, 'Discovery slot should exist in storage');
      this.assert(storedSlot.status === 'booked', 'Discovery slot status should be updated to booked after booking');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 7 =====
  testTask7_ConfigureUxHourlyEngagementUnder200() {
    const testName = 'Task 7: Configure hourly UX research engagement under $200/hour for ~80 hours and send inquiry';
    console.log('Testing:', testName);

    try {
      // Navigate to UX Research & Testing
      const servicesOverview = this.logic.getServicesOverviewContent();
      this.assert(servicesOverview && servicesOverview.service_categories, 'Services overview should load for UX research');

      const uxContent = this.logic.getUxResearchServiceContent();
      this.assert(uxContent && uxContent.intro_heading, 'UX research service content should load');

      const pricingTiersResult = this.logic.getUxHourlyPricingTiers();
      this.assert(pricingTiersResult && Array.isArray(pricingTiersResult.tiers), 'UX hourly pricing tiers should load');

      const tiers = pricingTiersResult.tiers;
      this.assert(tiers.length > 0, 'There should be at least one UX hourly pricing tier');

      // Set engagement to around 80 hours and find a tier with hourly rate < $200
      let desiredHours = 80;
      let ratePreview = this.logic.getUxHourlyRatePreview(desiredHours);
      this.assert(ratePreview && ratePreview.applicable_tier, 'UX hourly rate preview should return applicable tier');

      // If effective rate is not under $200/hour, try slightly different hours up to 100
      if (!(ratePreview.effective_hourly_rate < 200)) {
        let foundBetter = false;
        for (let hrs = 81; hrs <= 100; hrs++) {
          const previewCandidate = this.logic.getUxHourlyRatePreview(hrs);
          if (previewCandidate && previewCandidate.effective_hourly_rate < 200) {
            desiredHours = hrs;
            ratePreview = previewCandidate;
            foundBetter = true;
            break;
          }
        }
        this.assert(foundBetter, 'Should find a UX hourly configuration under $200/hour for <=100 hours');
      }

      this.assert(ratePreview.effective_hourly_rate < 200, 'Effective hourly rate should be under $200/hour');

      const applicableTier = ratePreview.applicable_tier;
      this.assert(applicableTier && applicableTier.id, 'Applicable pricing tier should be present');

      // Submit hourly UX inquiry referencing this tier
      const inquiryMessage = 'We are looking for up to 80 hours of UX research support at your hourly rate under $200/hour.';
      const inquiryResult = this.logic.submitUxHourlyInquiry(
        applicableTier.id,
        'ux_research_hourly_engagement',
        inquiryMessage,
        'Riley Chen',
        'riley@example.com',
        desiredHours,
        200
      );

      this.assert(inquiryResult && inquiryResult.success === true, 'UX hourly inquiry submission should succeed');
      this.assert(inquiryResult.inquiry, 'Inquiry result should contain inquiry object');

      const inquiry = inquiryResult.inquiry;
      this.assert(inquiry.subject === 'ux_research_hourly_engagement', 'Inquiry subject should match');
      this.assert(inquiry.contact_name === 'Riley Chen', 'Inquiry contact_name should match');
      this.assert(inquiry.contact_email === 'riley@example.com', 'Inquiry contact_email should match');
      this.assert(inquiry.pricing_tier_id === applicableTier.id, 'Inquiry should reference applicable pricing tier ID');
      if (typeof inquiry.estimated_hours === 'number') {
        this.assert(inquiry.estimated_hours === desiredHours, 'Inquiry estimated_hours should match desired hours');
      }
      if (typeof inquiry.desired_hourly_rate_cap === 'number') {
        this.assert(inquiry.desired_hourly_rate_cap === 200, 'Inquiry desired_hourly_rate_cap should be 200');
      }

      // Verify persistence
      const storedInquiriesRaw = localStorage.getItem('ux_hourly_inquiries') || '[]';
      const storedInquiries = JSON.parse(storedInquiriesRaw);
      const storedInquiry = storedInquiries.find(function (i) { return i.id === inquiry.id; });
      this.assert(!!storedInquiry, 'UX hourly inquiry should be persisted');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 8 =====
  testTask8_SelectBrandingPackageUnder5kWith3LogosAndGuidelines() {
    const testName = 'Task 8: Select branding package under $5,000 with >=3 logo concepts and brand guidelines and start onboarding';
    console.log('Testing:', testName);

    try {
      // Navigate to Branding & Visual Identity
      const servicesOverview = this.logic.getServicesOverviewContent();
      this.assert(servicesOverview && servicesOverview.service_categories, 'Services overview should load for branding');

      const brandingContent = this.logic.getBrandingServiceContent();
      this.assert(brandingContent && brandingContent.intro_heading, 'Branding service content should load');

      const comparison = this.logic.getBrandingPackagesComparison();
      this.assert(comparison && Array.isArray(comparison.packages), 'Branding packages comparison should load');

      const allPackages = comparison.packages;
      this.assert(allPackages.length > 0, 'There should be at least one branding package');

      // Identify cheapest package under $5,000 with >=3 logo concepts and brand guidelines
      const qualifyingPackages = allPackages.filter(function (pkg) {
        return pkg.is_active &&
          pkg.one_time_price < 5000 &&
          pkg.number_of_logo_concepts >= 3 &&
          pkg.includes_brand_guidelines === true;
      });

      this.assert(qualifyingPackages.length > 0, 'There should be at least one qualifying branding package under $5,000');

      const selectedPackage = qualifyingPackages.reduce(function (best, pkg) {
        if (!best) return pkg;
        return (pkg.one_time_price < best.one_time_price) ? pkg : best;
      }, null);

      this.assert(selectedPackage, 'A qualifying branding package should be selected');

      // Load package detail (including add-ons and default billing option)
      const packageDetail = this.logic.getBrandingPackageDetail(selectedPackage.slug);
      this.assert(packageDetail && packageDetail.package, 'Branding package detail should load');
      this.assert(packageDetail.package.id === selectedPackage.id, 'Package detail should match selected package');

      const billingOption = 'one_time';
      const selectedAddOnIds = []; // no add-ons

      // Start onboarding with company details and launch date
      const launchDateISO = '2026-10-01';
      const onboardingResult = this.logic.startBrandingOnboarding(
        selectedPackage.id,
        billingOption,
        selectedAddOnIds,
        'Aurora Labs',
        'technology',
        launchDateISO
      );

      this.assert(onboardingResult && onboardingResult.success === true, 'Branding onboarding should succeed');
      this.assert(onboardingResult.onboarding, 'Onboarding result should contain onboarding object');

      const onboarding = onboardingResult.onboarding;
      this.assert(onboarding.branding_package_id === selectedPackage.id, 'Onboarding should reference selected branding package ID');
      this.assert(onboarding.billing_option === billingOption, 'Onboarding billing_option should be one_time');
      this.assert(onboarding.company_name === 'Aurora Labs', 'Onboarding company_name should match');
      this.assert(onboarding.industry === 'technology', 'Onboarding industry should be technology');
      this.assert(!!onboarding.planned_brand_launch_date, 'Onboarding planned_brand_launch_date should be set');

      if (Array.isArray(onboarding.selected_add_on_ids)) {
        this.assert(onboarding.selected_add_on_ids.length === 0, 'Onboarding should have no selected add-ons');
      }

      // Verify persistence
      const storedOnboardingRaw = localStorage.getItem('branding_onboarding_records') || '[]';
      const storedOnboardingRecords = JSON.parse(storedOnboardingRaw);
      const storedRecord = storedOnboardingRecords.find(function (rec) { return rec.id === onboarding.id; });
      this.assert(!!storedRecord, 'Branding onboarding record should be persisted');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Helper methods =====
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

  toISODate(date) {
    const year = date.getUTCFullYear();
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    return year + '-' + month + '-' + day;
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
