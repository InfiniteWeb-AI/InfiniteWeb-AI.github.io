class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key)
      ? this.store[key]
      : null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }
}

class TestRunner {
  constructor(businessLogic) {
    if (typeof localStorage === 'undefined') {
      global.localStorage = new LocalStorageMock();
    }

    this.logic = businessLogic || new BusinessLogic();
    this.results = [];

    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    localStorage.clear();
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Generated Data: used ONLY here for initial localStorage population
    const generatedData = {
      "articles": [
        {
          "id": "xr-museums-storytelling-2025",
          "title": "Reimagining Museum Storytelling with Immersive XR",
          "slug": "reimagining-museum-storytelling-with-immersive-xr",
          "summary": "How museums and galleries are using VR and AR to turn static exhibits into interactive, narrative-driven journeys.",
          "content": "Museums around the world are embracing XR to extend their narratives beyond the glass case. From room-scale VR recreations of historical events to AR layers that reveal hidden details on artifacts, immersive technologies are transforming passive visits into participatory experiences. In this article we break down successful concepts, hardware considerations, visitor flow design, and accessibility best practices for curators planning their first XR pilot.",
          "author": "Dana Morales",
          "published_at": "2025-11-15T10:00:00Z",
          "topic": "museums_exhibitions",
          "tags": [
            "museum",
            "exhibition",
            "curation",
            "storytelling",
            "xr"
          ],
          "reading_time_minutes": 9,
          "hero_image": "https://damassets.autodesk.net/content/dam/autodesk/www/solutions/virtual-reality/immersive-storytelling-large-1920x960-1.jpg",
          "is_featured": true
        },
        {
          "id": "ar-gallery-tours-2025",
          "title": "Designing AR Gallery Tours That Don’t Distract from the Art",
          "slug": "designing-ar-gallery-tours-that-dont-distract-from-the-art",
          "summary": "A practical guide for galleries using mobile AR and headsets to enhance, not overshadow, exhibitions.",
          "content": "When introducing AR into gallery spaces, curators often worry that screens will pull attention away from the art itself. The key is to design a companion experience: light-touch overlays, context-aware prompts, and audio-first storytelling that supports the work on the wall. This guide explores optimal interaction patterns, device policies, and analytics for AR gallery tours, with examples from pilot programs across Europe and North America.",
          "author": "Leah Anders",
          "published_at": "2025-10-02T14:30:00Z",
          "topic": "museums_exhibitions",
          "tags": [
            "ar",
            "gallery",
            "museum",
            "mobile",
            "visitor-experience"
          ],
          "reading_time_minutes": 7,
          "hero_image": "https://pd12m.s3.us-west-2.amazonaws.com/images/8a3f2633-65a0-5334-a609-fe89aeb44fdf.jpeg",
          "is_featured": false
        },
        {
          "id": "immersive-exhibition-roadmap",
          "title": "From Static Exhibit to Immersive Installation: A 6-Month Roadmap",
          "slug": "from-static-exhibit-to-immersive-installation-roadmap",
          "summary": "Timeline, roles, and budget checkpoints for turning a traditional exhibition into an immersive XR installation.",
          "content": "Transitioning from traditional vitrines to immersive XR spaces doesn’t have to be overwhelming. In this roadmap we outline a practical six-month plan: discovery and stakeholder alignment, concept prototyping, content production, technical integration, on-site testing, and launch. We highlight decision points unique to museums, like conservation concerns, visitor safety, and staffing models.",
          "author": "Dana Morales",
          "published_at": "2025-08-20T09:15:00Z",
          "topic": "museums_exhibitions",
          "tags": [
            "exhibition",
            "project-planning",
            "budgeting",
            "museums",
            "xr"
          ],
          "reading_time_minutes": 11,
          "hero_image": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&h=600&fit=crop&auto=format&q=80",
          "is_featured": false
        }
      ],
      "experience_modules": [
        {
          "id": "immersive_tunnel_standard",
          "name": "Immersive Tunnel",
          "slug": "immersive-tunnel",
          "module_type": "interactive_zone",
          "description": "A walkthrough LED and projection-mapped tunnel with synchronized soundscapes, ideal for high-impact entrances and brand reveals.",
          "base_price": 12000,
          "capacity_min": 300,
          "capacity_max": 1000,
          "is_premium": true,
          "status": "active"
        },
        {
          "id": "interactive_game_zone_arcade",
          "name": "Interactive Game Zone",
          "slug": "interactive-game-zone",
          "module_type": "interactive_zone",
          "description": "A compact XR arcade with gesture-based and controller-based games tailored to your brand narrative.",
          "base_price": 9000,
          "capacity_min": 200,
          "capacity_max": 800,
          "is_premium": false,
          "status": "active"
        },
        {
          "id": "ar_product_demo_zone",
          "name": "AR Product Demo Zone",
          "slug": "ar-product-demo-zone",
          "module_type": "interactive_zone",
          "description": "Tablet and smartphone-based AR product visualizations for retail and product launch environments.",
          "base_price": 8000,
          "capacity_min": 150,
          "capacity_max": 700,
          "is_premium": false,
          "status": "active"
        }
      ],
      "jobs": [
        {
          "id": "ux_designer_xr_mid_remote",
          "title": "UX Designer – XR Products (Mid-Level)",
          "slug": "ux-designer-xr-products-mid-level",
          "department": "ux_ui_design",
          "seniority_level": "mid_level",
          "description": "We’re looking for a mid-level UX Designer to shape interfaces and interactions for our VR and AR products across training, retail, and cultural experiences.",
          "responsibilities": "Collaborate with product managers, 3D artists, and engineers to design user journeys for XR applications. Produce user flows, wireframes, and interaction specs for VR and AR. Conduct usability testing with head-mounted displays. Iterate designs based on qualitative and quantitative feedback.",
          "requirements": "3–5 years of professional UX design experience, including at least 2 years working on XR, gaming, or 3D interfaces. Strong portfolio showcasing interaction design for AR/VR or immersive experiences. Proficiency with Figma or similar tools and familiarity with Unity or Unreal workflows.",
          "experience_min_years": 3,
          "experience_max_years": 5,
          "location_type": "remote",
          "location": "Remote, USA or Europe",
          "is_xr_related": true,
          "is_active": true,
          "posted_at": "2026-02-15T09:00:00Z"
        },
        {
          "id": "product_designer_xr_platform_mid",
          "title": "Product Designer – XR Platforms (Mid-Level)",
          "slug": "product-designer-xr-platforms-mid-level",
          "department": "design",
          "seniority_level": "mid_level",
          "description": "Join our design team to define end-to-end product experiences for our XR training and marketing platforms.",
          "responsibilities": "Own design for key product areas, from discovery through detailed interaction design. Collaborate with engineering on implementation for WebXR and native applications. Create prototypes for VR and AR flows and document patterns in our XR design system.",
          "requirements": "3+ years of product design experience with shipped digital products. Experience designing for 3D or immersive interactions is strongly preferred. Ability to present and explain design decisions to non-design stakeholders.",
          "experience_min_years": 3,
          "experience_max_years": 6,
          "location_type": "hybrid",
          "location": "New York, NY, USA",
          "is_xr_related": true,
          "is_active": true,
          "posted_at": "2026-01-20T11:30:00Z"
        },
        {
          "id": "senior_ux_lead_xr",
          "title": "Senior UX Lead – Immersive Experiences",
          "slug": "senior-ux-lead-immersive-experiences",
          "department": "ux_ui_design",
          "seniority_level": "senior",
          "description": "Lead the UX discipline across complex XR programs spanning training, retail, and cultural installations.",
          "responsibilities": "Define UX vision and standards for XR projects. Mentor a team of UX and interaction designers. Partner with strategy and engineering to scope and deliver multi-track initiatives.",
          "requirements": "7+ years of UX experience, including 3+ years in XR or 3D interactive environments. Demonstrated leadership on multi-disciplinary teams.",
          "experience_min_years": 7,
          "experience_max_years": 12,
          "location_type": "hybrid",
          "location": "London, UK",
          "is_xr_related": true,
          "is_active": true,
          "posted_at": "2026-01-05T10:15:00Z"
        }
      ],
      "service_categories": [
        {
          "id": "training_simulation",
          "name": "Training & Simulation",
          "slug": "training_simulation",
          "description": "Immersive VR and AR training solutions for safety, operations, onboarding, and soft skills.",
          "intro_content": "Our Training & Simulation team builds high-impact VR and AR experiences that let people practice real-world scenarios in safe, controlled environments. From OSHA-aligned safety modules to bespoke role-play simulations, we help organizations upskill their workforce at scale.",
          "hero_image": "http://www.igs.com.ar/wp-content/uploads/2018/08/ar-vr-simulation.jpg",
          "is_active": true
        },
        {
          "id": "marketing_brand",
          "name": "Marketing & Brand Experiences",
          "slug": "marketing_brand",
          "description": "AR and XR campaigns for product launches, brand activations, and retail experiences.",
          "intro_content": "We concept and deliver XR-powered brand stories that audiences remember and share. From AR product launch campaigns reaching hundreds of thousands of people to in-store experiential zones, our team blends creativity, technology, and measurable performance.",
          "hero_image": "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800&h=600&fit=crop&auto=format&q=80",
          "is_active": true
        },
        {
          "id": "pop_up_installations",
          "name": "Pop-up Installations",
          "slug": "pop_up_installations",
          "description": "Configurable immersive pop-up installations and touring experiences.",
          "intro_content": "Use our Pop-up Installations configurator to design immersive experiences for festivals, retail, and one-off events. Combine interactive zones, photo booths, and lounge areas to create a bespoke installation with real-time budget estimates.",
          "hero_image": "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=600&fit=crop&auto=format&q=80",
          "is_active": true
        }
      ],
      "case_studies": [
        {
          "id": "cs_vr_retail_safety_warehouses",
          "title": "VR Safety Training for Retail Distribution Warehouses",
          "slug": "vr-safety-training-retail-distribution-warehouses",
          "summary": "A large retail chain reduced incident rates by 32% across three regional distribution centers using VR safety simulations.",
          "technology": "vr",
          "industry": "retail",
          "client_name": "Northline Retail Group",
          "challenge": "Northline operated multiple high-throughput warehouses with rising minor incidents and inconsistent safety training quality across locations.",
          "solution": "We designed a series of VR safety modules covering pedestrian–forklift interactions, pallet stacking, and emergency evacuations. The content aligned with OSHA standards and ran on standalone headsets to simplify deployment.",
          "results": "Within six months, incident rates fell significantly and managers reported higher engagement with mandatory safety training.",
          "metrics": [
            "32% reduction in recordable safety incidents in 6 months",
            "94% training completion rate within first rollout wave",
            "87% of staff reported higher confidence in handling emergencies"
          ],
          "media_gallery": [
            "https://images.unsplash.com/photo-1581090700227-1e37b190418e?w=800&h=600&fit=crop&auto=format&q=80",
            "https://images.unsplash.com/photo-1581090700227-1e37b190418e?w=800&h=600&fit=crop&auto=format&q=80"
          ],
          "related_service_category_id": "training_simulation",
          "published_at": "2025-11-05T10:00:00Z",
          "is_featured": true
        },
        {
          "id": "cs_vr_retail_flagship_preview",
          "title": "VR Flagship Store Preview for a Sportswear Brand",
          "slug": "vr-flagship-store-preview-sportswear-brand",
          "summary": "An immersive VR walkthrough let VIP customers explore a new flagship store before opening day.",
          "technology": "vr",
          "industry": "retail",
          "client_name": "Velocity Sportswear",
          "challenge": "Velocity wanted to build buzz for its new flagship store but the space was still under construction during the global press tour.",
          "solution": "We created a high-fidelity VR replica of the store, allowing buyers and media to walk through planned merchandising zones, test interactive displays, and preview launch-day activations.",
          "results": "The VR experience generated strong pre-launch coverage and helped the brand validate store layouts before physical build-out was complete.",
          "metrics": [
            "1,200+ VR walkthroughs completed in 3 weeks",
            "18% increase in pre-orders from key wholesale partners",
            "Coverage secured in 15 industry publications"
          ],
          "media_gallery": [
            "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=800&h=600&fit=crop&auto=format&q=80",
            "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop&auto=format&q=80"
          ],
          "related_service_category_id": "marketing_brand",
          "published_at": "2025-06-22T09:30:00Z",
          "is_featured": false
        },
        {
          "id": "cs_vr_healthcare_er_sim",
          "title": "VR Emergency Room Simulation for Hospital Staff",
          "slug": "vr-emergency-room-simulation-hospital-staff",
          "summary": "A series of VR simulations helped ER staff practice high-pressure scenarios without impacting patient flow.",
          "technology": "vr",
          "industry": "healthcare",
          "client_name": "MetroCare Health System",
          "challenge": "MetroCare needed a way to train multidisciplinary ER teams on rare but critical scenarios without disrupting day-to-day operations.",
          "solution": "We built branching VR scenarios covering stroke triage, mass-casualty incidents, and cardiac arrest response, with analytics dashboards for educators to review team performance.",
          "results": "Staff demonstrated faster decision-making in drills and reported feeling better prepared for complex emergencies.",
          "metrics": [
            "21% faster average decision time in simulation assessments",
            "96% of participants rated the VR training as more engaging than traditional drills",
            "Rolled out to 5 hospitals within 4 months"
          ],
          "media_gallery": [
            "https://images.unsplash.com/photo-1581090700227-1e37b190418e?w=800&h=600&fit=crop&auto=format&q=80",
            "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8e?w=800&h=600&fit=crop&auto=format&q=80"
          ],
          "related_service_category_id": "training_simulation",
          "published_at": "2025-10-10T12:15:00Z",
          "is_featured": true
        }
      ],
      "service_packages": [
        {
          "id": "vr_safety_starter_50",
          "service_category_id": "training_simulation",
          "name": "VR Safety Fundamentals – 50-Person Starter Pack",
          "slug": "vr-safety-fundamentals-50-person-starter-pack",
          "package_type": "training_package",
          "technology": "vr",
          "experience_type": "training",
          "short_summary": "A turnkey VR safety training package for up to 50 employees, focused on core warehouse and manufacturing risks.",
          "description": "This starter package includes three VR safety modules (general awareness, hazard identification, and emergency response), onboarding support, and facilitator materials. It is optimized for a cohort of up to 50 employees using standalone headsets.",
          "objectives": "Improve safety awareness, standardize training content across sites, and reduce incident rates through realistic practice.",
          "inclusions": "3 VR modules, facilitator guide, implementation checklist, remote onboarding session, and 12-month content license for one site.",
          "min_participants": 20,
          "max_participants": 60,
          "base_price": 9000,
          "price_type": "fixed",
          "expected_reach": 0,
          "location_constraints": "Available for onsite or remote facilitation in North America and Europe.",
          "duration_days": 2,
          "image": "https://images.sampletemplates.com/wp-content/uploads/2017/05/Traffic-Control-Plan.jpg",
          "is_featured": true,
          "status": "active"
        },
        {
          "id": "vr_safety_plus_200",
          "service_category_id": "training_simulation",
          "name": "VR Safety Academy – Multi-Site Program (Up to 200 Learners)",
          "slug": "vr-safety-academy-multi-site-200",
          "package_type": "training_package",
          "technology": "vr",
          "experience_type": "training",
          "short_summary": "A multi-site VR safety training rollout for up to 200 employees across 2–4 locations.",
          "description": "Designed for organizations ready to scale VR safety training, this package includes 6 modules, LMS integration, train-the-trainer sessions, and analytics dashboards for leadership.",
          "objectives": "Standardize safety training at scale, enable local facilitators, and provide leadership with measurable ROI.",
          "inclusions": "6 VR modules, LMS integration support, 3 train-the-trainer sessions, analytics dashboard setup, 24-month license.",
          "min_participants": 80,
          "max_participants": 220,
          "base_price": 26000,
          "price_type": "starting_from",
          "expected_reach": 0,
          "location_constraints": "Global availability; travel and hardware costs quoted separately.",
          "duration_days": 4,
          "image": "https://images.unsplash.com/photo-1581090700227-1e37b190418e?w=800&h=600&fit=crop&auto=format&q=80",
          "is_featured": false,
          "status": "active"
        },
        {
          "id": "vr_operations_onboarding_30",
          "service_category_id": "training_simulation",
          "name": "VR Operations Onboarding – Intensive Cohort (Up to 30)",
          "slug": "vr-operations-onboarding-intensive-30",
          "package_type": "training_package",
          "technology": "vr",
          "experience_type": "training",
          "short_summary": "A focused VR onboarding program for new hires in operations roles.",
          "description": "This package helps new hires learn equipment operation, site layouts, and SOPs through VR walkthroughs and practice scenarios.",
          "objectives": "Reduce time-to-productivity for new hires and minimize early-stage errors.",
          "inclusions": "Custom site walkthrough, 2 operations modules, facilitator support, and 6-month content access.",
          "min_participants": 8,
          "max_participants": 30,
          "base_price": 14000,
          "price_type": "fixed",
          "expected_reach": 0,
          "location_constraints": "Onsite delivery recommended; remote option available with client-provided headsets.",
          "duration_days": 2,
          "image": "https://uploads-ssl.webflow.com/5e42f03c40f4172abfd1ecee/5ee16e83e06ee0a299f876be_business%20team%20analyzing%20graphs.jpg",
          "is_featured": false,
          "status": "active"
        }
      ],
      "events": [
        {
          "id": "ev_xr_strategy_beginner_online_2026_03_20",
          "title": "Beginner XR Strategy Workshop: From Ideas to 60-Day Roadmap",
          "slug": "beginner-xr-strategy-workshop-60-day-roadmap-2026-03-20",
          "description": "A live, beginner-friendly XR strategy workshop for teams taking their first steps into VR and AR. We cover fundamentals, use-case brainstorming, and a practical 60-day pilot planning framework aligned with our \"Your First XR Strategy in 60 Days\" playbook.",
          "topic": "xr_strategy",
          "level": "beginner",
          "start_datetime": "2026-03-20T16:00:00Z",
          "end_datetime": "2026-03-20T20:00:00Z",
          "price": 195,
          "currency": "usd",
          "format": "online",
          "location": "Online (live virtual session)",
          "capacity": 40,
          "is_featured": true,
          "remaining_spots": 33.0
        },
        {
          "id": "ev_xr_strategy_intermediate_online_2026_03_27",
          "title": "XR Strategy Lab: Prioritizing Use Cases and Pilots",
          "slug": "xr-strategy-lab-prioritizing-use-cases-2026-03-27",
          "description": "An intermediate-level lab for teams that have already run at least one XR pilot and want to prioritize their next wave of use cases across training, marketing, and operations.",
          "topic": "xr_strategy",
          "level": "intermediate",
          "start_datetime": "2026-03-27T15:00:00Z",
          "end_datetime": "2026-03-27T19:00:00Z",
          "price": 320,
          "currency": "usd",
          "format": "online",
          "location": "Online (live virtual session)",
          "capacity": 35,
          "is_featured": false,
          "remaining_spots": 35.0
        },
        {
          "id": "ev_xr_strategy_beginner_hybrid_2026_05_10",
          "title": "Intro to XR Strategy for Retail & Museums",
          "slug": "intro-xr-strategy-retail-museums-2026-05-10",
          "description": "A cross-industry beginner session focused on how retail brands and museums can frame their first XR pilots, secure stakeholder buy-in, and choose between AR and VR.",
          "topic": "xr_strategy",
          "level": "beginner",
          "start_datetime": "2026-05-10T13:00:00Z",
          "end_datetime": "2026-05-10T17:00:00Z",
          "price": 250,
          "currency": "usd",
          "format": "hybrid",
          "location": "New York, NY, USA & online streaming",
          "capacity": 60,
          "is_featured": false,
          "remaining_spots": 57.0
        }
      ],
      "event_registrations": [
        {
          "id": "reg_001_ev_xr_strategy_beginner_online_2026_03_20_a",
          "event_id": "ev_xr_strategy_beginner_online_2026_03_20",
          "full_name": "Leslie Grant",
          "email": "leslie.grant@example.com",
          "number_of_tickets": 5,
          "notes": "Team from retail innovation group attending together.",
          "status": "confirmed",
          "registered_at": "2026-02-10T15:20:00Z"
        },
        {
          "id": "reg_002_ev_xr_strategy_beginner_online_2026_03_20_b",
          "event_id": "ev_xr_strategy_beginner_online_2026_03_20",
          "full_name": "Priya Nair",
          "email": "priya.nair@example.com",
          "number_of_tickets": 2,
          "notes": "Interested in museum-focused XR case studies.",
          "status": "confirmed",
          "registered_at": "2026-02-18T09:45:00Z"
        },
        {
          "id": "reg_003_ev_xr_strategy_beginner_hybrid_2026_05_10",
          "event_id": "ev_xr_strategy_beginner_hybrid_2026_05_10",
          "full_name": "Daniel Ortiz",
          "email": "daniel.ortiz@example.com",
          "number_of_tickets": 3,
          "notes": "Two colleagues will join onsite, one will join remotely.",
          "status": "confirmed",
          "registered_at": "2026-03-01T11:05:00Z"
        }
      ],
      "_metadata": {
        "baselineDate": "2026-03-03",
        "generatedAt": "2026-03-03T03:47:35.560645"
      }
    };

    // Populate localStorage using storage_key mapping
    localStorage.setItem('articles', JSON.stringify(generatedData.articles || []));
    localStorage.setItem('experience_modules', JSON.stringify(generatedData.experience_modules || []));
    localStorage.setItem('jobs', JSON.stringify(generatedData.jobs || []));
    localStorage.setItem('service_categories', JSON.stringify(generatedData.service_categories || []));
    localStorage.setItem('case_studies', JSON.stringify(generatedData.case_studies || []));
    localStorage.setItem('service_packages', JSON.stringify(generatedData.service_packages || []));
    localStorage.setItem('events', JSON.stringify(generatedData.events || []));
    localStorage.setItem('event_registrations', JSON.stringify(generatedData.event_registrations || []));
    // Store metadata for date-based tests
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata || {}));
  }

  // Run all flow-based tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_RequestQuoteCheapestVRSafetyTraining();
    this.testTask2_SubmitProjectBriefForCampaignUnderBudget();
    this.testTask3_CreateShortlistOfVRCasestudies();
    this.testTask4_ConfigurePopupInstallationAndRequestQuote();
    this.testTask5_RegisterForBeginnerXRStrategyWorkshop();
    this.testTask6_ApplyForMidLevelUXDesignerRoleWithoutCV();
    this.testTask7_SubmitAgencyPartnershipInquiryWhiteLabelXR();
    this.testTask8_SaveArticlesToXRInspirationReadingList();

    return this.results;
  }

  // ===== Helper utilities =====

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

  getBaselineDate() {
    const raw = localStorage.getItem('_metadata');
    if (!raw) return new Date();
    try {
      const meta = JSON.parse(raw);
      if (meta && meta.baselineDate) {
        return new Date(meta.baselineDate);
      }
    } catch (e) {
      // ignore and fall through
    }
    return new Date();
  }

  addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  // ===== Task 1 =====
  // Request a quote for the cheapest VR safety training package for 50 employees under $15,000
  testTask1_RequestQuoteCheapestVRSafetyTraining() {
    const testName = 'Task 1: Request quote for cheapest VR safety training package under $15,000 for 50 employees';
    try {
      // Navigate: load services overview and training category
      const servicesOverview = this.logic.getServicesOverview();
      this.assert(servicesOverview && Array.isArray(servicesOverview.serviceCategories), 'Services overview should include service categories');
      const trainingCategory = servicesOverview.serviceCategories.find(c => c.slug === 'training_simulation');
      this.assert(trainingCategory, 'Training & Simulation category should be present');

      const categoryIntro = this.logic.getServiceCategoryIntro('training_simulation');
      this.assert(categoryIntro && categoryIntro.serviceCategory && categoryIntro.serviceCategory.slug === 'training_simulation', 'Should load Training & Simulation intro content');

      const filterOptions = this.logic.getServiceCategoryFilterOptions('training_simulation');
      this.assert(filterOptions && Array.isArray(filterOptions.technologyOptions), 'Should return technology options for training_simulation');
      this.assert(filterOptions.technologyOptions.indexOf('vr') !== -1, 'Technology options should include vr');

      // Filter: VR training, at least 50 participants, budget cap 15000, sort price low to high
      const filters = {
        technology: 'vr',
        experienceType: 'training',
        minParticipants: 50,
        maxBudget: 15000
      };
      const searchResult = this.logic.searchServicePackages('training_simulation', filters, 'price_low_to_high', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.results), 'Service package search should return results array');
      this.assert(searchResult.results.length > 0, 'Should find at least one VR training package matching filters');

      const cheapestResult = searchResult.results[0];
      const selectedPackage = cheapestResult.servicePackage;
      this.assert(selectedPackage, 'First search result should include a servicePackage');
      this.assert(selectedPackage.technology === 'vr', 'Selected package should be VR');

      if (typeof selectedPackage.min_participants === 'number' && typeof selectedPackage.max_participants === 'number') {
        this.assert(
          selectedPackage.min_participants <= 50 && selectedPackage.max_participants >= 50,
          'Selected package should support 50 participants based on min/max'
        );
      }

      if (typeof selectedPackage.base_price === 'number') {
        this.assert(selectedPackage.base_price <= 15000, 'Selected package base price should be <= 15000');
      }

      // Verify sorting: no later package is cheaper
      const cheapestPrice = typeof selectedPackage.base_price === 'number' ? selectedPackage.base_price : 0;
      for (let i = 1; i < searchResult.results.length; i++) {
        const pkg = searchResult.results[i].servicePackage;
        if (pkg && typeof pkg.base_price === 'number') {
          this.assert(pkg.base_price >= cheapestPrice, 'Packages should be sorted by price low to high');
        }
      }

      // Open detail page
      const detail = this.logic.getServicePackageDetail(selectedPackage.id);
      this.assert(detail && detail.servicePackage && detail.servicePackage.id === selectedPackage.id, 'Detail should match selected package ID');

      // Submit quote request
      const quoteNote = 'Need onsite VR safety training for 50 employees under $15,000';
      const quoteResponse = this.logic.submitServicePackageQuoteRequest(
        selectedPackage.id,
        'Alex Rivera',
        'Rivera Manufacturing',
        'alex.rivera@example.com',
        null,
        50,
        '2025-03-01',
        15000,
        quoteNote
      );

      this.assert(quoteResponse && quoteResponse.success === true, 'Quote request submission should succeed');
      const quoteRequest = quoteResponse.quoteRequest;
      this.assert(quoteRequest, 'Quote request object should be returned');
      this.assert(quoteRequest.service_package_id === selectedPackage.id, 'QuoteRequest.service_package_id should match selected package');
      this.assert(quoteRequest.contact_name === 'Alex Rivera', 'QuoteRequest.contact_name should match input');
      this.assert(quoteRequest.number_of_participants === 50, 'QuoteRequest.number_of_participants should be 50');
      if (quoteRequest.preferred_start_date) {
        this.assert(String(quoteRequest.preferred_start_date).indexOf('2025-03-01') === 0, 'Preferred start date should start with 2025-03-01');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 2 =====
  // Adapted: submit a project brief for an XR campaign-like service package under $40,000
  testTask2_SubmitProjectBriefForCampaignUnderBudget() {
    const testName = 'Task 2: Submit project brief for XR campaign-style package under $40,000';
    try {
      // NOTE: Generated data has only training_simulation packages.
      // We adapt the flow to still test filtering, selection, and submitProjectBriefForCampaign.

      const categoryIntro = this.logic.getServiceCategoryIntro('training_simulation');
      this.assert(categoryIntro && categoryIntro.serviceCategory, 'Should load service category intro for training_simulation');

      const filterOptions = this.logic.getServiceCategoryFilterOptions('training_simulation');
      this.assert(filterOptions && Array.isArray(filterOptions.technologyOptions), 'Should get filter options for campaign-like selection');

      const filters = {
        technology: 'vr',
        experienceType: 'training', // Used as stand-in for product_launch in limited dataset
        maxBudget: 40000,
        minExpectedReach: 0
      };

      const searchResult = this.logic.searchServicePackages('training_simulation', filters, 'price_low_to_high', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.results) && searchResult.results.length > 0, 'Should find at least one package under $40,000');

      // Select first package that meets budget and any expected reach >= 0
      let selectedPackage = null;
      for (let i = 0; i < searchResult.results.length; i++) {
        const candidate = searchResult.results[i].servicePackage;
        if (!candidate) continue;
        const priceOk = typeof candidate.base_price !== 'number' || candidate.base_price < 40000;
        const reachOk = typeof candidate.expected_reach !== 'number' || candidate.expected_reach >= 0;
        if (priceOk && reachOk) {
          selectedPackage = candidate;
          break;
        }
      }

      this.assert(selectedPackage !== null, 'Should select a package meeting adapted criteria');

      if (typeof selectedPackage.base_price === 'number') {
        this.assert(selectedPackage.base_price < 40000, 'Selected package base price should be < 40000');
      }

      const detail = this.logic.getServicePackageDetail(selectedPackage.id);
      this.assert(detail && detail.servicePackage && detail.servicePackage.id === selectedPackage.id, 'Detail should match selected campaign package');

      // Start project brief for chosen package
      const briefResponse = this.logic.submitProjectBriefForCampaign(
        selectedPackage.id,
        'Jordan Lee',
        'Nova Electronics', // brandName
        'Nova Electronics', // company (same as brand for this test)
        'jordan.lee@example.com',
        null,
        38000,
        '2025-09-01',
        'Launch new product line with immersive XR touchpoints',
        'Automated test brief for XR campaign-style package.'
      );

      this.assert(briefResponse && briefResponse.success === true, 'Project brief submission should succeed');
      const projectBrief = briefResponse.projectBrief;
      this.assert(projectBrief, 'ProjectBrief object should be returned');
      this.assert(projectBrief.related_service_package_id === selectedPackage.id, 'ProjectBrief.related_service_package_id should match selected package');
      this.assert(projectBrief.contact_name === 'Jordan Lee', 'ProjectBrief.contact_name should match input');
      this.assert(projectBrief.brand_name === 'Nova Electronics', 'ProjectBrief.brand_name should match input');
      this.assert(projectBrief.campaign_budget === 38000, 'ProjectBrief.campaign_budget should match input');
      if (projectBrief.desired_launch_month) {
        this.assert(String(projectBrief.desired_launch_month).indexOf('2025-09-01') === 0, 'desired_launch_month should start with 2025-09-01');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 3 =====
  // Create a shortlist of 3 VR case studies (retail, healthcare, plus another VR case study)
  testTask3_CreateShortlistOfVRCasestudies() {
    const testName = 'Task 3: Create shortlist "Training ideas" with 3 VR case studies';
    try {
      const filterOptions = this.logic.getCaseStudyFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.technologyOptions), 'Case study filter options should include technologyOptions');

      // Get all VR case studies to support flexible industry selection
      const searchAll = this.logic.searchCaseStudies({ technology: 'vr' }, 1, 20);
      this.assert(searchAll && Array.isArray(searchAll.results) && searchAll.results.length > 0, 'Should find VR case studies');

      const allCases = searchAll.results;
      const shortlist = [];

      // Helper to pick by industry if available
      const pickByIndustry = (industry) => {
        if (shortlist.length >= 3) return;
        const cs = allCases.find(c => c.industry === industry && !shortlist.some(s => s.id === c.id));
        if (cs) shortlist.push(cs);
      };

      // Attempt to follow original intent: retail, healthcare, education (if any)
      pickByIndustry('retail');
      pickByIndustry('healthcare');
      pickByIndustry('education');

      // If fewer than 3, fill with remaining VR case studies
      for (let i = 0; i < allCases.length && shortlist.length < 3; i++) {
        const cs = allCases[i];
        if (!shortlist.some(s => s.id === cs.id)) {
          shortlist.push(cs);
        }
      }

      this.assert(shortlist.length >= 3, 'Should have at least 3 VR case studies to add to shortlist');

      // Save all shortlisted case studies into "Training ideas" collection
      let createdCollectionId = null;
      for (let i = 0; i < shortlist.length; i++) {
        const cs = shortlist[i];
        const saveResult = this.logic.saveItemToNamedCollection(
          'case_study',
          cs.id,
          'Training ideas',
          'case_study_shortlist'
        );
        this.assert(saveResult && saveResult.success === true, 'Saving case study to collection should succeed');
        this.assert(saveResult.collection, 'Should return collection metadata');
        this.assert(saveResult.collectionItem, 'Should return collection item');
        if (i === 0) {
          this.assert(saveResult.createdNewCollection === true, 'First save should create new "Training ideas" collection');
          createdCollectionId = saveResult.collection.id;
        } else {
          this.assert(saveResult.collection.id === createdCollectionId, 'Subsequent saves should use same collection');
        }
        this.assert(saveResult.collectionItem.collection_id === saveResult.collection.id, 'CollectionItem.collection_id should match SavedCollection.id');
        this.assert(saveResult.collectionItem.item_id === cs.id, 'CollectionItem.item_id should match CaseStudy.id');
      }

      // Verify collection contents via overview
      const overview = this.logic.getSavedCollectionsOverview();
      this.assert(overview && Array.isArray(overview.collections), 'Saved collections overview should return collections array');
      const trainingIdeasEntry = overview.collections.find(entry => entry.collection && entry.collection.name === 'Training ideas');
      this.assert(trainingIdeasEntry, 'Saved collections should include "Training ideas"');
      this.assert(Array.isArray(trainingIdeasEntry.items), 'Training ideas collection should include items array');
      this.assert(trainingIdeasEntry.items.length >= 3, 'Training ideas collection should contain at least 3 items');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 4 =====
  // Configure an immersive pop-up installation with estimate between $25,000 and $35,000 and save for quote
  testTask4_ConfigurePopupInstallationAndRequestQuote() {
    const testName = 'Task 4: Configure pop-up installation and submit configuration for quote';
    try {
      const categoryIntro = this.logic.getServiceCategoryIntro('pop_up_installations');
      this.assert(categoryIntro && categoryIntro.serviceCategory && categoryIntro.serviceCategory.slug === 'pop_up_installations', 'Should load Pop-up Installations intro');

      const options = this.logic.getPopupConfiguratorOptions();
      this.assert(options && Array.isArray(options.experienceModules), 'Configurator options should include experienceModules');

      const modules = options.experienceModules;
      this.assert(modules.length > 0, 'There should be at least one experience module');

      const interactiveModules = modules.filter(m => m.module_type === 'interactive_zone');
      const photoBoothModules = modules.filter(m => m.module_type === 'photo_booth');

      this.assert(interactiveModules.length > 0, 'Should have at least one interactive zone module available');

      // Start with up to 2 interactive zones
      const selectedModuleObjects = [];
      if (interactiveModules.length >= 2) {
        selectedModuleObjects.push(interactiveModules[0], interactiveModules[1]);
      } else {
        selectedModuleObjects.push(interactiveModules[0]);
      }

      // Try to add a photo booth if available, otherwise add another distinct module
      if (photoBoothModules.length > 0) {
        selectedModuleObjects.push(photoBoothModules[0]);
      } else {
        const extra = modules.find(m => !selectedModuleObjects.some(sm => sm.id === m.id));
        if (extra) {
          selectedModuleObjects.push(extra);
        }
      }

      // Build initial configuration
      const eventDateStr = '2025-06-15';
      const buildConfigFromModules = (moduleObjs) => {
        return {
          eventDate: eventDateStr,
          audienceMin: 500,
          audienceMax: 800,
          modules: moduleObjs.map(m => ({
            experienceModuleId: m.id,
            quantity: 1,
            customLabel: m.name
          }))
        };
      };

      let configModules = selectedModuleObjects.slice();
      let estimateResponse = this.logic.calculatePopupConfigurationEstimate(buildConfigFromModules(configModules));
      this.assert(estimateResponse && typeof estimateResponse.estimatedTotal === 'number', 'Estimate response should include numeric estimatedTotal');

      // Adjust modules to try to get estimate within [25000, 35000]
      // Using simple strategy: if below range, add more modules if possible; if above, reduce.
      let guard = 0;
      while ((estimateResponse.estimatedTotal < 25000 || estimateResponse.estimatedTotal > 35000) && guard < 10) {
        guard++;
        if (estimateResponse.estimatedTotal < 25000) {
          // Try adding another module if available
          const extra = modules.find(m => !configModules.some(cm => cm.id === m.id));
          if (extra) {
            configModules.push(extra);
          } else {
            // If no extra modules left, break to avoid infinite loop
            break;
          }
        } else if (estimateResponse.estimatedTotal > 35000) {
          // Try removing the last module if more than one selected
          if (configModules.length > 1) {
            configModules.pop();
          } else {
            break;
          }
        }
        estimateResponse = this.logic.calculatePopupConfigurationEstimate(buildConfigFromModules(configModules));
        this.assert(estimateResponse && typeof estimateResponse.estimatedTotal === 'number', 'Recalculated estimate should include numeric estimatedTotal');
      }

      const estimatedTotal = estimateResponse.estimatedTotal;
      this.assert(estimatedTotal > 0, 'Estimated total should be positive');
      // Core goal: estimate should fall between 25k and 35k after adjustments
      this.assert(
        estimatedTotal >= 25000 && estimatedTotal <= 35000,
        'Estimated total should be between 25,000 and 35,000 after module adjustments; actual: ' + estimatedTotal
      );

      // Save configuration and request quote
      const saveConfigObj = {
        locationDisplay: 'New York, NY, USA',
        locationCity: 'New York',
        locationCountry: 'USA',
        eventDate: eventDateStr,
        audienceMin: 500,
        audienceMax: 800,
        notes: 'Automated test configuration for pop-up installation.',
        modules: configModules.map(m => ({
          experienceModuleId: m.id,
          quantity: 1,
          customLabel: m.name
        }))
      };

      const saveResponse = this.logic.savePopupConfigurationAndRequestQuote(
        saveConfigObj,
        'Morgan Patel',
        'Urban Pop Events',
        'morgan.patel@example.com',
        null
      );

      this.assert(saveResponse && saveResponse.success === true, 'Saving configuration and requesting quote should succeed');
      const experienceConfiguration = saveResponse.experienceConfiguration;
      const quoteRequest = saveResponse.quoteRequest;
      this.assert(experienceConfiguration, 'ExperienceConfiguration should be returned');
      this.assert(quoteRequest, 'QuoteRequest object should be returned');
      this.assert(experienceConfiguration.location_display === 'New York, NY, USA', 'ExperienceConfiguration.location_display should match input');
      this.assert(experienceConfiguration.audience_min === 500, 'ExperienceConfiguration.audience_min should be 500');
      this.assert(experienceConfiguration.audience_max === 800, 'ExperienceConfiguration.audience_max should be 800');
      this.assert(experienceConfiguration.is_submitted_for_quote === true, 'ExperienceConfiguration.is_submitted_for_quote should be true');
      this.assert(
        typeof experienceConfiguration.estimated_total === 'number' && experienceConfiguration.estimated_total > 0,
        'ExperienceConfiguration.estimated_total should be a positive number'
      );

      if (quoteRequest.experience_configuration_id) {
        this.assert(
          quoteRequest.experience_configuration_id === experienceConfiguration.id,
          'QuoteRequest.experience_configuration_id should match ExperienceConfiguration.id'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 5 =====
  // Register for a beginner XR strategy workshop within next 60 days under $300
  testTask5_RegisterForBeginnerXRStrategyWorkshop() {
    const testName = 'Task 5: Register for beginner XR strategy workshop within 60 days under $300';
    try {
      const filterOptions = this.logic.getEventFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.topicOptions), 'Event filter options should include topicOptions');

      const baseline = this.getBaselineDate();
      const startDateFrom = baseline.toISOString().slice(0, 10);
      const startDateTo = this.addDays(baseline, 60).toISOString().slice(0, 10);

      const filters = {
        topic: 'xr_strategy',
        level: 'beginner',
        startDateFrom: startDateFrom,
        startDateTo: startDateTo,
        maxPrice: 300
      };

      const searchResult = this.logic.searchEvents(filters, 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.results), 'Event search should return results array');
      this.assert(searchResult.results.length > 0, 'Should find at least one beginner XR strategy event under $300 within 60 days');

      const selectedEvent = searchResult.results[0];
      this.assert(selectedEvent.topic === 'xr_strategy', 'Selected event should have topic xr_strategy');
      this.assert(selectedEvent.level === 'beginner', 'Selected event should be beginner level');
      this.assert(typeof selectedEvent.price === 'number' && selectedEvent.price <= 300, 'Selected event price should be <= 300');

      const eventStart = new Date(selectedEvent.start_datetime);
      this.assert(eventStart >= new Date(startDateFrom) && eventStart <= new Date(startDateTo), 'Selected event date should fall within 60-day window');

      const detail = this.logic.getEventDetail(selectedEvent.id);
      this.assert(detail && detail.event && detail.event.id === selectedEvent.id, 'Event detail should match selected event');

      const registrationResponse = this.logic.submitEventRegistration(
        selectedEvent.id,
        'Taylor Kim',
        'taylor.kim@example.com',
        1,
        'Interested in beginner XR strategy for retail'
      );

      this.assert(registrationResponse && registrationResponse.success === true, 'Event registration should succeed');
      const eventRegistration = registrationResponse.eventRegistration;
      this.assert(eventRegistration, 'EventRegistration object should be returned');
      this.assert(eventRegistration.event_id === selectedEvent.id, 'EventRegistration.event_id should match selected event');
      this.assert(eventRegistration.full_name === 'Taylor Kim', 'EventRegistration.full_name should match input');
      this.assert(eventRegistration.number_of_tickets === 1, 'EventRegistration.number_of_tickets should be 1');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 6 =====
  // Apply for a mid-level UX Designer role in the XR studio without uploading a file
  testTask6_ApplyForMidLevelUXDesignerRoleWithoutCV() {
    const testName = 'Task 6: Apply for mid-level UX Designer XR role without CV upload';
    try {
      const jobFilterOptions = this.logic.getJobFilterOptions();
      this.assert(jobFilterOptions && Array.isArray(jobFilterOptions.departmentOptions), 'Job filter options should include departmentOptions');

      const filters = {
        department: 'ux_ui_design',
        seniorityLevel: 'mid_level',
        isXrRelatedOnly: true
      };

      const searchResult = this.logic.searchJobs(filters, 1, 50);
      this.assert(searchResult && Array.isArray(searchResult.results), 'Job search should return results array');
      this.assert(searchResult.results.length > 0, 'Should find at least one mid-level XR-related UX/UI job');

      const selectedJob = searchResult.results[0];
      this.assert(selectedJob.is_xr_related === true, 'Selected job should be XR-related');
      this.assert(selectedJob.seniority_level === 'mid_level', 'Selected job should be mid_level');

      if (typeof selectedJob.experience_min_years === 'number') {
        this.assert(selectedJob.experience_min_years >= 2, 'Min experience should be at least around 2-3 years');
      }
      if (typeof selectedJob.experience_max_years === 'number') {
        this.assert(selectedJob.experience_max_years >= 3, 'Max experience should allow 3+ years');
      }

      const detail = this.logic.getJobDetail(selectedJob.id);
      this.assert(detail && detail.job && detail.job.id === selectedJob.id, 'Job detail should match selected job');

      const coverMessage = 'I have 4 years of UX experience focused on XR products, including VR training tools and AR retail apps. I collaborate closely with 3D artists and engineers to design intuitive spatial interfaces. I’m excited about contributing to your XR studio’s cross-industry projects.';

      const applicationResponse = this.logic.submitJobApplication(
        selectedJob.id,
        'Sam Jordan',
        'sam.jordan@example.com',
        'UX Designer with 4 years of XR experience',
        'https://www.samuxxrportfolio.com',
        coverMessage,
        'Remote, USA',
        'https://www.linkedin.com/in/samjordan',
        false // cvUploaded explicitly false to represent no file upload
      );

      this.assert(applicationResponse && applicationResponse.success === true, 'Job application submission should succeed');
      const jobApplication = applicationResponse.jobApplication;
      this.assert(jobApplication, 'JobApplication object should be returned');
      this.assert(jobApplication.job_id === selectedJob.id, 'JobApplication.job_id should match selected job');
      this.assert(jobApplication.full_name === 'Sam Jordan', 'JobApplication.full_name should match input');
      this.assert(jobApplication.email === 'sam.jordan@example.com', 'JobApplication.email should match input');
      this.assert(jobApplication.cv_uploaded === false, 'JobApplication.cv_uploaded should be false when skipping upload');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 7 =====
  // Submit a partnership inquiry as an agency partner for white-label XR production with budget over $60,000
  testTask7_SubmitAgencyPartnershipInquiryWhiteLabelXR() {
    const testName = 'Task 7: Submit agency partnership inquiry for white-label XR production over $60,000';
    try {
      const options = this.logic.getContactInquiryOptions();
      this.assert(options && Array.isArray(options.inquiryTypeOptions), 'Contact inquiry options should include inquiryTypeOptions');

      // Submit contact/partnership inquiry
      const areasOfInterest = ['white_label_production', 'white_label_xr_production'];
      const regions = ['united_states', 'european_union'];

      const inquiryResponse = this.logic.submitContactInquiry(
        'agency_partner',
        areasOfInterest,
        60000,
        regions,
        'United States and European Union',
        'Jamie Chen',
        'Alliance Creative Agency',
        'jamie.chen@example.com',
        null,
        'We are a creative agency seeking a long-term white-label XR production partner for projects over $60,000 in the US and EU markets.'
      );

      this.assert(inquiryResponse && inquiryResponse.success === true, 'Contact inquiry submission should succeed');
      const contactInquiry = inquiryResponse.contactInquiry;
      this.assert(contactInquiry, 'ContactInquiry object should be returned');
      this.assert(contactInquiry.inquiry_type === 'agency_partner', 'ContactInquiry.inquiry_type should be agency_partner');
      this.assert(Array.isArray(contactInquiry.areas_of_interest), 'ContactInquiry.areas_of_interest should be an array');
      this.assert(contactInquiry.areas_of_interest.length >= 1, 'ContactInquiry.areas_of_interest should not be empty');
      this.assert(contactInquiry.budget_minimum >= 60000, 'ContactInquiry.budget_minimum should be >= 60000');
      this.assert(Array.isArray(contactInquiry.regions), 'ContactInquiry.regions should be an array');
      this.assert(contactInquiry.contact_name === 'Jamie Chen', 'ContactInquiry.contact_name should match input');
      this.assert(contactInquiry.company === 'Alliance Creative Agency', 'ContactInquiry.company should match input');
      this.assert(contactInquiry.email === 'jamie.chen@example.com', 'ContactInquiry.email should match input');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ===== Task 8 =====
  // Save 3 articles about XR for museums/exhibitions (adapted: all 3 from museums_exhibitions topic) to a reading list
  testTask8_SaveArticlesToXRInspirationReadingList() {
    const testName = 'Task 8: Save 3 XR museum/exhibition articles to "XR Inspiration" reading list';
    try {
      const articleFilterOptions = this.logic.getArticleFilterOptions();
      this.assert(articleFilterOptions && Array.isArray(articleFilterOptions.topicOptions), 'Article filter options should include topicOptions');

      // Search for museum/exhibition-related articles (limited dataset does not include retail topic)
      const museumSearch = this.logic.searchArticles({ topic: 'museums_exhibitions', query: 'museum' }, 1, 20);
      this.assert(museumSearch && Array.isArray(museumSearch.results), 'Article search should return results array');
      this.assert(museumSearch.results.length >= 3, 'Should have at least 3 museum/exhibition articles in test data');

      const selectedArticles = museumSearch.results.slice(0, 3);

      let createdCollectionId = null;
      for (let i = 0; i < selectedArticles.length; i++) {
        const article = selectedArticles[i];
        const saveResult = this.logic.saveItemToNamedCollection(
          'article',
          article.id,
          'XR Inspiration',
          'reading_list'
        );

        this.assert(saveResult && saveResult.success === true, 'Saving article to reading list should succeed');
        this.assert(saveResult.collection, 'Should return SavedCollection object');
        this.assert(saveResult.collectionItem, 'Should return SavedCollectionItem object');

        if (i === 0) {
          this.assert(saveResult.createdNewCollection === true, 'First article save should create new XR Inspiration reading list');
          createdCollectionId = saveResult.collection.id;
        } else {
          this.assert(saveResult.collection.id === createdCollectionId, 'Subsequent article saves should use same XR Inspiration collection');
        }

        this.assert(saveResult.collectionItem.collection_id === saveResult.collection.id, 'SavedCollectionItem.collection_id should match collection.id');
        this.assert(saveResult.collectionItem.item_id === article.id, 'SavedCollectionItem.item_id should match Article.id');
      }

      // Verify XR Inspiration reading list contents
      const overview = this.logic.getSavedCollectionsOverview();
      this.assert(overview && Array.isArray(overview.collections), 'Saved collections overview should return collections array');
      const xrInspirationEntry = overview.collections.find(entry => entry.collection && entry.collection.name === 'XR Inspiration');
      this.assert(xrInspirationEntry, 'XR Inspiration reading list should appear in collections overview');
      this.assert(Array.isArray(xrInspirationEntry.items), 'XR Inspiration should contain items array');
      this.assert(xrInspirationEntry.items.length >= 3, 'XR Inspiration should contain at least 3 articles');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }
}

// Export for Node.js ONLY (CommonJS)
module.exports = TestRunner;
