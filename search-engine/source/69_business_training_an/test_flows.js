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
    // Reinitialize storage structure via business logic helper
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      "articles": [
        {
          "id": "art_remote_1",
          "title": "Leading Remote Teams: A Practical Playbook for Managers",
          "slug": "leading-remote-teams-practical-playbook",
          "excerpt": "Specific tools and rituals to help managers lead remote teams with clarity, trust, and accountability.",
          "content": "Remote leadership requires intentional structure and communication. In this playbook, we break down weekly rhythms, meeting cadences, and feedback loops that keep distributed teams aligned without burning people out...",
          "tags": [
            "remote_work",
            "remote_teams",
            "leadership",
            "team_productivity"
          ],
          "author_name": "Alex Rivera",
          "featured_image_url": "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop&auto=format&q=80",
          "popularity_score": 98,
          "views": 18452,
          "published_date": "2025-11-10T09:00:00Z",
          "status": "published",
          "is_featured": true
        },
        {
          "id": "art_remote_2",
          "title": "5 Rituals of High-Trust Remote Teams",
          "slug": "5-rituals-of-high-trust-remote-teams",
          "excerpt": "Trust is harder\u2014but not impossible\u2014when your team is remote. These five rituals make it visible and measurable.",
          "content": "High-trust remote teams share a set of observable behaviors: transparent decisions, shared planning, consistent follow-up, and space for informal connection. This article outlines five simple rituals you can install over the next 30 days...",
          "tags": [
            "remote_work",
            "remote_teams",
            "team_culture",
            "leadership"
          ],
          "author_name": "Priya Desai",
          "featured_image_url": "https://images.unsplash.com/photo-1522202195461-43c74b3a9fa6?w=800&h=600&fit=crop&auto=format&q=80",
          "popularity_score": 92,
          "views": 15677,
          "published_date": "2025-09-22T15:30:00Z",
          "status": "published",
          "is_featured": true
        },
        {
          "id": "art_remote_3",
          "title": "Remote Team Leadership Fundamentals: From One-on-Ones to Outcomes",
          "slug": "remote-team-leadership-fundamentals",
          "excerpt": "A fundamentals guide for managers newly responsible for leading remote teams across time zones.",
          "content": "If you are transitioning from in-office to remote leadership, the fundamentals matter more than ever: clear expectations, structured one-on-ones, reliable decision paths, and predictable feedback. This guide walks through each element with templates you can adapt immediately...",
          "tags": [
            "remote_work",
            "remote_teams",
            "remote_leadership",
            "manager_training"
          ],
          "author_name": "Jordan Blake",
          "featured_image_url": "https://www.saviom.com/blog/wp-content/uploads/2019/04/blog-iamge1-2.jpg",
          "popularity_score": 87,
          "views": 12104,
          "published_date": "2025-08-05T12:00:00Z",
          "status": "published",
          "is_featured": false
        }
      ],
      "services": [
        {
          "id": "svc_1_1_coaching",
          "name": "1:1 Coaching Session",
          "slug": "1-1-coaching-session",
          "service_type": "coaching_session",
          "description": "A focused 60-minute 1:1 coaching session to work through leadership challenges, role transitions, or team issues.",
          "default_duration_minutes": 60,
          "is_active": true,
          "image": "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop&auto=format&q=80"
        },
        {
          "id": "svc_executive_strategy_call",
          "name": "Executive Strategy Call",
          "slug": "executive-strategy-call",
          "service_type": "consulting_call",
          "description": "A 90-minute strategy consultation for senior leaders to clarify priorities and align stakeholders.",
          "default_duration_minutes": 90,
          "is_active": true,
          "image": "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=800&h=600&fit=crop&auto=format&q=80"
        },
        {
          "id": "svc_workshop_briefing",
          "name": "Workshop Planning Briefing",
          "slug": "workshop-planning-briefing",
          "service_type": "workshop_briefing",
          "description": "A 45-minute briefing to scope objectives, participants, and logistics for an upcoming workshop or training series.",
          "default_duration_minutes": 45,
          "is_active": true,
          "image": "https://www.ageing-better.org.uk/sites/default/files/styles/hero_image_16by9/public/media/image_hero/images/2020-09/innovation-3840x2160.jpg?itok=ufSkqvyv"
        }
      ],
      "case_studies": [
        {
          "id": "cs_tech_remote_1",
          "title": "Scaling Remote Engineering Teams for a SaaS Platform",
          "slug": "scaling-remote-engineering-teams-saas-platform",
          "summary": "Helped a 120-person technology company redesign its leadership and communication approach as it shifted to remote-first.",
          "full_content": "The client, a fast-growing SaaS company, needed to scale its remote engineering organization without losing quality or speed. Over a 4-month engagement we implemented a leadership development program for 30 managers, redesigned rituals, and coached the executive team...",
          "industry": "technology",
          "client_name": "Northwind SaaS Corp",
          "budget": 45000,
          "currency": "usd",
          "duration_months": 4,
          "duration_bucket": "less_than_6_months",
          "services_provided": [
            "leadership_development",
            "remote_work_strategy",
            "team_coaching"
          ],
          "results": "Improved on-time delivery by 18% and increased eNPS for engineering managers by 21 points within six months.",
          "published_date": "2025-12-01T10:00:00Z",
          "is_featured": true,
          "status": "published"
        },
        {
          "id": "cs_tech_change_2",
          "title": "Leading a Cloud Migration with Cross-Functional Alignment",
          "slug": "leading-cloud-migration-cross-functional-alignment",
          "summary": "Supported a mid-sized technology firm through a complex cloud migration with structured change management.",
          "full_content": "A 600-person software company was moving its core product to a new cloud infrastructure. We partnered with technology and business leaders to design a governance structure, stakeholder communications, and a series of change leadership workshops...",
          "industry": "technology",
          "client_name": "BlueSky Systems",
          "budget": 72000,
          "currency": "usd",
          "duration_months": 5,
          "duration_bucket": "less_than_6_months",
          "services_provided": [
            "change_management",
            "leadership_workshops",
            "communication_planning"
          ],
          "results": "Migration completed on schedule with minimal disruption and a 9.1/10 average readiness score from impacted teams.",
          "published_date": "2025-10-15T09:30:00Z",
          "is_featured": true,
          "status": "published"
        },
        {
          "id": "cs_tech_agile_3",
          "title": "Installing Agile Leadership in a Data Platform Startup",
          "slug": "installing-agile-leadership-data-platform-startup",
          "summary": "Equipped startup founders and leads with agile leadership skills to support rapid product iteration.",
          "full_content": "The client, a 40-person data platform startup, needed its leaders to support continuous discovery and delivery. Over a 3-month engagement we ran leadership sprints, coached squads, and co-designed a lightweight OKR process...",
          "industry": "technology",
          "client_name": "SignalGrid Analytics",
          "budget": 32000,
          "currency": "usd",
          "duration_months": 3,
          "duration_bucket": "less_than_6_months",
          "services_provided": [
            "leadership_coaching",
            "agile_transformation",
            "okrs"
          ],
          "results": "Reduced cycle time by 24% and increased on-time roadmap delivery by 30% within two quarters.",
          "published_date": "2025-08-20T11:15:00Z",
          "is_featured": false,
          "status": "published"
        }
      ],
      "consultants": [
        {
          "id": "consult_jordan_nguyen",
          "full_name": "Jordan Nguyen",
          "slug": "jordan-nguyen",
          "title": "Principal Consultant, Leadership & Culture",
          "bio": "Jordan is a leadership development consultant based in North America with 16+ years of experience helping technology and professional services organizations build high-performing, human-centered teams.",
          "expertise_areas": [
            "leadership_development",
            "culture_transformation",
            "change_management"
          ],
          "region": "north_america",
          "years_experience": 16,
          "client_logos": [
            "https://via.placeholder.com/160x80/0F766E/FFFFFF?text=Northwind",
            "https://via.placeholder.com/160x80/4F46E5/FFFFFF?text=BlueSky",
            "https://via.placeholder.com/160x80/F97316/FFFFFF?text=SignalGrid",
            "https://via.placeholder.com/160x80/1D4ED8/FFFFFF?text=Orion",
            "https://via.placeholder.com/160x80/DB2777/FFFFFF?text=Riverview",
            "https://via.placeholder.com/160x80/059669/FFFFFF?text=Insight+LLP"
          ],
          "client_names": [
            "Northwind SaaS Corp",
            "BlueSky Systems",
            "SignalGrid Analytics",
            "Orion Digital",
            "Riverview Health",
            "Insight Partners LLP"
          ],
          "profile_image_url": "https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?w=800&h=600&fit=crop&auto=format&q=80",
          "is_featured": true,
          "status": "active"
        },
        {
          "id": "consult_emma_carter",
          "full_name": "Emma Carter",
          "slug": "emma-carter",
          "title": "Senior Consultant, Change & Transformation",
          "bio": "Emma specializes in large-scale change management and leadership alignment in healthcare and finance organizations.",
          "expertise_areas": [
            "change_management",
            "leadership_development",
            "facilitation"
          ],
          "region": "north_america",
          "years_experience": 12,
          "client_logos": [
            "https://via.placeholder.com/160x80/4B5563/FFFFFF?text=Continental+Bank",
            "https://via.placeholder.com/160x80/2563EB/FFFFFF?text=Riverview",
            "https://via.placeholder.com/160x80/F59E0B/FFFFFF?text=Prime+Industrial",
            "https://via.placeholder.com/160x80/10B981/FFFFFF?text=Impact+Alliance",
            "https://via.placeholder.com/160x80/EC4899/FFFFFF?text=Health+Plus"
          ],
          "client_names": [
            "Continental Bank Group",
            "Riverview Health",
            "Prime Industrial Co.",
            "Impact Nonprofit Alliance",
            "Health Plus Network"
          ],
          "profile_image_url": "https://1f35b45f214b134327a3-b8b2147e5030e9b0721a7af27dc09dcc.ssl.cf1.rackcdn.com/jedshare_photographer_seattle_5002644-copy2.jpg",
          "is_featured": false,
          "status": "active"
        },
        {
          "id": "consult_alejandro_ruiz",
          "full_name": "Alejandro Ruiz",
          "slug": "alejandro-ruiz",
          "title": "Executive Coach & Strategy Advisor",
          "bio": "Alejandro works with senior executives on strategy, influence, and stakeholder management across North and Latin America.",
          "expertise_areas": [
            "executive_coaching",
            "strategy",
            "stakeholder_management"
          ],
          "region": "latin_america",
          "years_experience": 20,
          "client_logos": [
            "https://via.placeholder.com/160x80/1F2937/FFFFFF?text=Global+Bank",
            "https://via.placeholder.com/160x80/6D28D9/FFFFFF?text=Andes+Energy"
          ],
          "client_names": [
            "Global Bank Group",
            "Andes Energy"
          ],
          "profile_image_url": "https://marcybrowe.com/wp-content/uploads/2017/06/VRS-headshot-Michael-6097-websize-682x1024.jpg",
          "is_featured": true,
          "status": "active"
        }
      ],
      "consulting_packages": [
        {
          "id": "pkg_small_starter",
          "name": "Starter Advisory - Small Business",
          "slug": "starter-advisory-small-business",
          "summary": "Lightweight advisory support for small businesses establishing leadership and people practices.",
          "description": "Includes monthly check-ins focused on priority leadership and team topics, plus email support for quick questions in between calls.",
          "audience": "small_business_1_50",
          "industry_focus": [
            "professional_services",
            "technology",
            "other"
          ],
          "monthly_price": 650,
          "currency": "usd",
          "hours_per_month": 6,
          "min_commitment_months": 3,
          "is_featured": false,
          "status": "active",
          "created_at": "2025-01-10T09:00:00Z",
          "updated_at": "2025-10-01T12:00:00Z"
        },
        {
          "id": "pkg_small_growth_leadership",
          "name": "Growth Leadership Support - Small Business",
          "slug": "growth-leadership-support-small-business",
          "summary": "Hands-on leadership and people advisory for growing small businesses.",
          "description": "Designed for organizations with 1\u201350 employees that need a dedicated leadership advisor each month. Includes structured consulting hours for leadership team meetings, manager coaching, and people-strategy support.",
          "audience": "small_business_1_50",
          "industry_focus": [
            "technology",
            "professional_services",
            "healthcare"
          ],
          "monthly_price": 1100,
          "currency": "usd",
          "hours_per_month": 12,
          "min_commitment_months": 6,
          "is_featured": true,
          "status": "active",
          "created_at": "2025-02-05T10:30:00Z",
          "updated_at": "2025-11-20T15:45:00Z"
        },
        {
          "id": "pkg_small_premium",
          "name": "Premium People & Culture Partner - Small Business",
          "slug": "premium-people-culture-partner-small-business",
          "summary": "Fractional people & culture leadership support for complex small businesses.",
          "description": "Ideal for small organizations navigating rapid growth or significant change. Includes strategic advisories, change planning, and support with leadership communication.",
          "audience": "small_business_1_50",
          "industry_focus": [
            "technology",
            "finance"
          ],
          "monthly_price": 1850,
          "currency": "usd",
          "hours_per_month": 18,
          "min_commitment_months": 6,
          "is_featured": false,
          "status": "active",
          "created_at": "2025-02-20T09:15:00Z",
          "updated_at": "2025-11-01T09:15:00Z"
        }
      ],
      "courses": [
        {
          "id": "course_lead_fund_1",
          "title": "Leadership Fundamentals: Core Skills for New Managers",
          "slug": "leadership-fundamentals-core-skills-new-managers",
          "short_description": "A practical, beginner-level course covering the essential skills for first-time managers.",
          "full_description": "This beginner-friendly online course helps new managers master the fundamentals: setting expectations, running effective one-on-ones, giving feedback, and managing performance. Includes templates, scripts, and practice scenarios.",
          "level": "beginner",
          "topics": [
            "leadership",
            "manager_training"
          ],
          "delivery_format": "online_self_paced",
          "price": 49,
          "currency": "usd",
          "rating": 4.6,
          "rating_count": 214,
          "duration_hours": 6,
          "instructor_name": "Alex Rivera",
          "thumbnail_url": "https://images.unsplash.com/photo-1542744173-05336fcc7ad4?w=800&h=600&fit=crop&auto=format&q=80",
          "is_featured": true,
          "status": "active",
          "created_at": "2025-05-15T09:00:00Z",
          "updated_at": "2025-11-01T09:00:00Z"
        },
        {
          "id": "course_lead_fund_live",
          "title": "Leadership Fundamentals Bootcamp (Live Online)",
          "slug": "leadership-fundamentals-bootcamp-live-online",
          "short_description": "A live, instructor-led beginner bootcamp for new and aspiring people managers.",
          "full_description": "Join a small cohort of new managers for a live, interactive bootcamp. Across four sessions you will practice real conversations, get peer feedback, and build a 90-day leadership plan.",
          "level": "beginner",
          "topics": [
            "leadership",
            "communication"
          ],
          "delivery_format": "online_live",
          "price": 79,
          "currency": "usd",
          "rating": 4.5,
          "rating_count": 163,
          "duration_hours": 8,
          "instructor_name": "Priya Desai",
          "thumbnail_url": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop&auto=format&q=80",
          "is_featured": true,
          "status": "active",
          "created_at": "2025-06-10T10:00:00Z",
          "updated_at": "2025-11-05T10:00:00Z"
        },
        {
          "id": "course_lead_foundations",
          "title": "Essential Leadership Foundations",
          "slug": "essential-leadership-foundations",
          "short_description": "Build confidence with the core foundations of people leadership.",
          "full_description": "This course walks through mindset shifts, trust-building, and coaching techniques to help you transition into leadership with confidence.",
          "level": "beginner",
          "topics": [
            "leadership",
            "trust_building"
          ],
          "delivery_format": "online_self_paced",
          "price": 99,
          "currency": "usd",
          "rating": 4.2,
          "rating_count": 98,
          "duration_hours": 7,
          "instructor_name": "Jordan Blake",
          "thumbnail_url": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop&auto=format&q=80",
          "is_featured": false,
          "status": "active",
          "created_at": "2025-03-20T09:30:00Z",
          "updated_at": "2025-10-12T09:30:00Z"
        }
      ],
      "pricing_calculator_settings": [
        {
          "id": "calc_on_site_standard",
          "name": "On-Site Workshop Standard Rates",
          "description": "Standard pricing model for on-site, in-house workshops with optional follow-up group coaching and online pre-work.",
          "base_daily_rate": 2500,
          "per_participant_fee": 80,
          "per_coaching_session_fee": 900,
          "online_prework_module_fee": 150,
          "max_participants_included": 20,
          "currency": "usd",
          "created_at": "2024-10-01T09:00:00Z",
          "updated_at": "2025-10-15T09:00:00Z"
        },
        {
          "id": "calc_virtual_standard",
          "name": "Virtual Workshop Standard Rates",
          "description": "Pricing model for virtual live workshops with optional coaching follow-up.",
          "base_daily_rate": 1800,
          "per_participant_fee": 40,
          "per_coaching_session_fee": 600,
          "online_prework_module_fee": 100,
          "max_participants_included": 25,
          "currency": "usd",
          "created_at": "2024-10-01T09:00:00Z",
          "updated_at": "2025-08-20T09:00:00Z"
        }
      ],
      "workshops": [
        {
          "id": "ws_lead_inperson_2day_1",
          "title": "Leading with Clarity: Core Leadership Skills Intensive",
          "slug": "leading-with-clarity-core-leadership-skills-intensive",
          "summary": "A 2-day in-person intensive covering the fundamentals of people leadership.",
          "description": "Designed for new and emerging managers, this in-person intensive focuses on setting direction, coaching, feedback, and building trust. Participants leave with a 90-day action plan and practical tools.",
          "categories": [
            "leadership"
          ],
          "format": "in_person",
          "duration_type": "2_day",
          "duration_days": 2,
          "rating": 4.9,
          "rating_count": 182,
          "price_per_session": 6200,
          "currency": "usd",
          "max_participants": 24,
          "location_type": "on_site_at_client",
          "next_start_date": "2026-04-08T09:00:00Z",
          "thumbnail_url": "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=600&fit=crop&auto=format&q=80",
          "is_featured": true,
          "status": "active",
          "created_at": "2024-11-01T10:00:00Z",
          "updated_at": "2025-10-05T10:00:00Z"
        },
        {
          "id": "ws_change_inperson_2day_1",
          "title": "Leading Change in Real Time",
          "slug": "leading-change-in-real-time",
          "summary": "A 2-day experiential workshop on practical change leadership skills.",
          "description": "Participants work on their own live change initiatives while learning frameworks for stakeholder mapping, messaging, and resistance management.",
          "categories": [
            "change_management",
            "leadership"
          ],
          "format": "in_person",
          "duration_type": "2_day",
          "duration_days": 2,
          "rating": 4.8,
          "rating_count": 143,
          "price_per_session": 6400,
          "currency": "usd",
          "max_participants": 22,
          "location_type": "on_site_at_client",
          "next_start_date": "2026-04-15T09:00:00Z",
          "thumbnail_url": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&h=600&fit=crop&auto=format&q=80",
          "is_featured": true,
          "status": "active",
          "created_at": "2024-10-10T09:00:00Z",
          "updated_at": "2025-09-20T09:00:00Z"
        },
        {
          "id": "ws_lead_inperson_1day_1",
          "title": "Leadership Essentials: 1-Day Kickstart",
          "slug": "leadership-essentials-1-day-kickstart",
          "summary": "A fast-paced 1-day workshop for new and aspiring leaders.",
          "description": "Ideal for organizations that want to give first-time managers a strong foundation in a single day. Covers expectation-setting, feedback, and time management.",
          "categories": [
            "leadership"
          ],
          "format": "in_person",
          "duration_type": "1_day",
          "duration_days": 1,
          "rating": 4.7,
          "rating_count": 210,
          "price_per_session": 3400,
          "currency": "usd",
          "max_participants": 26,
          "location_type": "on_site_at_client",
          "next_start_date": "2026-04-02T09:00:00Z",
          "thumbnail_url": "https://images.unsplash.com/photo-1542744173-05336fcc7ad4?w=800&h=600&fit=crop&auto=format&q=80",
          "is_featured": false,
          "status": "active",
          "created_at": "2024-09-15T09:00:00Z",
          "updated_at": "2025-08-10T09:00:00Z"
        }
      ],
      "availability_slots": [
        {
          "id": "slot_coach_20260309_0900",
          "service_id": "svc_1_1_coaching",
          "start_datetime": "2026-03-09T09:00:00Z",
          "end_datetime": "2026-03-09T10:00:00Z",
          "time_of_day": "morning",
          "timezone": "UTC",
          "is_booked": false,
          "created_at": "2026-02-20T08:00:00Z"
        },
        {
          "id": "slot_coach_20260309_1100",
          "service_id": "svc_1_1_coaching",
          "start_datetime": "2026-03-09T11:00:00Z",
          "end_datetime": "2026-03-09T12:00:00Z",
          "time_of_day": "morning",
          "timezone": "UTC",
          "is_booked": true,
          "created_at": "2026-02-20T08:00:00Z"
        },
        {
          "id": "slot_coach_20260310_0900",
          "service_id": "svc_1_1_coaching",
          "start_datetime": "2026-03-10T09:00:00Z",
          "end_datetime": "2026-03-10T10:00:00Z",
          "time_of_day": "morning",
          "timezone": "UTC",
          "is_booked": false,
          "created_at": "2026-02-20T08:00:00Z"
        }
      ],
      "_metadata": {
        "baselineDate": "2026-03-03",
        "generatedAt": "2026-03-03T03:47:06.423135"
      }
    };

    // Populate localStorage using correct storage keys
    localStorage.setItem('articles', JSON.stringify(generatedData.articles || []));
    localStorage.setItem('services', JSON.stringify(generatedData.services || []));
    localStorage.setItem('case_studies', JSON.stringify(generatedData.case_studies || []));
    localStorage.setItem('consultants', JSON.stringify(generatedData.consultants || []));
    localStorage.setItem('consulting_packages', JSON.stringify(generatedData.consulting_packages || []));
    localStorage.setItem('courses', JSON.stringify(generatedData.courses || []));
    localStorage.setItem('pricing_calculator_settings', JSON.stringify(generatedData.pricing_calculator_settings || []));
    localStorage.setItem('workshops', JSON.stringify(generatedData.workshops || []));
    localStorage.setItem('availability_slots', JSON.stringify(generatedData.availability_slots || []));

    // Ensure other collections exist as empty arrays if not already initialized
    const keysToEnsure = [
      'cart',
      'cart_items',
      'training_plan',
      'training_plan_items',
      'bookings',
      'saved_items',
      'newsletter_subscriptions',
      'custom_training_configurations',
      'proposal_requests',
      'consultant_contact_requests'
    ];
    for (const key of keysToEnsure) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_AddCheapestBeginnerCoursesToCart();
    this.testTask2_RequestSmallBusinessConsultingProposal();
    this.testTask3_CreateSavedTrainingPlanWithTopWorkshops();
    this.testTask4_BookEarliestCoachingSessionNextWeek();
    this.testTask5_SaveTechnologyCaseStudies();
    this.testTask6_SubscribeWeeklyRemoteLeadershipNewsletter();
    this.testTask7_ConfigureOnsiteTrainingUnderBudget();
    this.testTask8_ContactNorthAmericaLeadershipConsultant();

    return this.results;
  }

  // Task 1: Add the two cheapest beginner leadership courses under $100 each to the cart
  testTask1_AddCheapestBeginnerCoursesToCart() {
    const testName = 'Task 1: Add two cheapest beginner leadership courses under $100 to cart';
    try {
      // Search courses like the UI flow
      const searchResult = this.logic.searchCourses(
        'leadership fundamentals',
        {
          level: 'beginner',
          maxPrice: 100,
          minRating: 4,
          onlyActive: true
        },
        'price_asc',
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.items), 'searchCourses should return items array');
      this.assert(searchResult.items.length >= 2, 'Should find at least two matching beginner courses');

      const firstCourse = searchResult.items[0];
      const secondCourse = searchResult.items[1];

      // Optional sanity checks from actual data
      this.assert(firstCourse.price <= 100, 'First course price should be <= 100');
      this.assert(secondCourse.price <= 100, 'Second course price should be <= 100');
      this.assert(firstCourse.rating >= 4, 'First course rating >= 4');
      this.assert(secondCourse.rating >= 4, 'Second course rating >= 4');

      // Open course details (simulating navigation)
      const details1 = this.logic.getCourseDetails(firstCourse.id);
      this.assert(details1 && details1.course && details1.course.id === firstCourse.id, 'getCourseDetails should return first course');

      // Add first course to cart
      const addResult1 = this.logic.addCourseToCart(firstCourse.id, 1);
      this.assert(addResult1 && addResult1.success === true, 'First addCourseToCart should succeed');
      this.assert(addResult1.cart && Array.isArray(addResult1.items), 'First addCourseToCart should return cart and items');

      // Add second course: simulate returning to list and opening second details
      const details2 = this.logic.getCourseDetails(secondCourse.id);
      this.assert(details2 && details2.course && details2.course.id === secondCourse.id, 'getCourseDetails should return second course');

      const addResult2 = this.logic.addCourseToCart(secondCourse.id, 1);
      this.assert(addResult2 && addResult2.success === true, 'Second addCourseToCart should succeed');

      // Verify cart contents via API
      const cartDetails = this.logic.getCartDetails();
      this.assert(cartDetails && cartDetails.cart, 'getCartDetails should return cart');
      this.assert(Array.isArray(cartDetails.items), 'getCartDetails.items should be array');

      const cartCourseIds = cartDetails.items.map((entry) => entry.course && entry.course.id);
      this.assert(
        cartCourseIds.includes(firstCourse.id) && cartCourseIds.includes(secondCourse.id),
        'Cart should contain both selected courses'
      );

      this.assert(cartDetails.total >= firstCourse.price + secondCourse.price, 'Cart total should be at least sum of course prices');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Request a proposal for a small-business consulting package with at least 10 hours under $1,200 per month
  testTask2_RequestSmallBusinessConsultingProposal() {
    const testName = 'Task 2: Request proposal for small-business consulting package (>=10 hours, < $1200)';
    try {
      // Filter packages similar to UI flow
      const searchResult = this.logic.searchConsultingPackages(
        {
          audience: 'small_business_1_50',
          maxMonthlyPrice: 1200,
          minHoursPerMonth: 10,
          onlyActive: true
        },
        'monthly_price_asc',
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.items), 'searchConsultingPackages should return items array');
      this.assert(searchResult.items.length > 0, 'Should find at least one qualifying consulting package');

      // Pick the first qualifying package from actual data
      const pkg = searchResult.items.find(
        (p) => p.monthly_price < 1200 && p.hours_per_month >= 10
      ) || searchResult.items[0];

      this.assert(pkg, 'Should select a consulting package');

      // Open package details
      const pkgDetails = this.logic.getConsultingPackageDetails(pkg.id);
      this.assert(
        pkgDetails && pkgDetails.consultingPackage && pkgDetails.consultingPackage.id === pkg.id,
        'getConsultingPackageDetails should return correct package'
      );

      // Load proposal context for this package
      const context = this.logic.getProposalContext('consulting_package', pkg.id, undefined);
      this.assert(context, 'getProposalContext should return context');
      this.assert(
        context.sourceType === 'consulting_package',
        'Context sourceType should be consulting_package'
      );
      this.assert(
        context.consultingPackage && context.consultingPackage.id === pkg.id,
        'Context should reference selected package'
      );

      // Compute project start date exactly 30 days from now
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 30);
      const preferredStartIso = startDate.toISOString();

      // Submit proposal request
      const proposalResult = this.logic.submitProposalRequest(
        'consulting_package', // sourceType
        pkg.id,               // consultingPackageId
        undefined,            // customTrainingConfigurationId
        'Sample Company',     // companyName
        '21_50_employees',    // companySize
        'Jordan Test',        // contactName
        'sample_company@example.com', // email
        undefined,            // phone
        undefined,            // projectGoals
        undefined,            // projectScope
        preferredStartIso     // preferredStartDate
      );

      this.assert(proposalResult && proposalResult.success === true, 'submitProposalRequest should succeed');
      this.assert(proposalResult.proposalRequest, 'submitProposalRequest should return proposalRequest');

      const pr = proposalResult.proposalRequest;
      this.assert(pr.source_type === 'consulting_package', 'ProposalRequest.source_type should be consulting_package');
      this.assert(pr.consulting_package_id === pkg.id, 'ProposalRequest.consulting_package_id should match selected package');
      this.assert(pr.email === 'sample_company@example.com', 'ProposalRequest email should match submitted');
      this.assert(pr.preferred_start_date, 'ProposalRequest should store preferred_start_date');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Create a saved training plan with three top-rated in-person leadership/change-management workshops
  testTask3_CreateSavedTrainingPlanWithTopWorkshops() {
    const testName = 'Task 3: Create saved training plan with three top-rated in-person workshops';
    try {
      // Search workshops with leadership & change management categories, in-person, 1-2 day, sorted by rating
      const searchResult = this.logic.searchWorkshops(
        {
          categories: ['leadership', 'change_management'],
          format: 'in_person',
          durationTypes: ['1_day', '2_day'],
          onlyActive: true
        },
        'rating_desc',
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.items), 'searchWorkshops should return items array');
      this.assert(searchResult.items.length >= 3, 'Should find at least three matching workshops');

      const topThree = searchResult.items.slice(0, 3);

      for (let i = 0; i < topThree.length; i++) {
        const ws = topThree[i];
        // Open workshop details
        const wsDetails = this.logic.getWorkshopDetails(ws.id);
        this.assert(
          wsDetails && wsDetails.workshop && wsDetails.workshop.id === ws.id,
          'getWorkshopDetails should return correct workshop'
        );

        // Save to training plan
        const addResult = this.logic.addWorkshopToTrainingPlan(ws.id, i === 0 ? 'high' : 'medium', undefined);
        this.assert(addResult && addResult.success === true, 'addWorkshopToTrainingPlan should succeed');

        const items = addResult.items || [];
        const matchingItem = items.find((it) => it.workshop_id === ws.id);
        this.assert(matchingItem, 'Training plan items should include added workshop');
      }

      // Verify training plan via API
      const planResult = this.logic.getTrainingPlan();
      this.assert(planResult && planResult.trainingPlan, 'getTrainingPlan should return trainingPlan');
      this.assert(Array.isArray(planResult.items), 'getTrainingPlan.items should be array');
      this.assert(planResult.items.length >= 3, 'Training plan should contain at least three items');

      const planWorkshopIds = planResult.items.map((entry) => entry.workshop && entry.workshop.id);
      topThree.forEach((ws) => {
        this.assert(planWorkshopIds.includes(ws.id), 'Training plan should contain workshop: ' + ws.id);
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Book the earliest 60-minute coaching session next week between 9:00 AM and 12:00 PM
  testTask4_BookEarliestCoachingSessionNextWeek() {
    const testName = 'Task 4: Book earliest 60-minute 1:1 coaching session next week (morning)';
    try {
      // Get booking services and choose a coaching session service
      const services = this.logic.getBookingServices();
      this.assert(Array.isArray(services), 'getBookingServices should return array');
      const coachingService = services.find((s) => s.service_type === 'coaching_session') || services[0];
      this.assert(coachingService, 'Should find a coaching session service');

      const serviceId = coachingService.id;

      // Get available durations for this service and choose 60 minutes where possible
      const durations = this.logic.getServiceDurations(serviceId);
      this.assert(Array.isArray(durations) && durations.length > 0, 'getServiceDurations should return durations');
      let chosenDuration = durations.find((d) => d.durationMinutes === 60) || durations[0];
      this.assert(chosenDuration.durationMinutes > 0, 'Chosen duration should be positive');

      const durationMinutes = chosenDuration.durationMinutes;

      // Determine the weekStartDate for the earliest available morning slot for this service
      const allSlotsRaw = JSON.parse(localStorage.getItem('availability_slots') || '[]');
      const relevantSlots = allSlotsRaw.filter(
        (slot) => slot.service_id === serviceId && slot.time_of_day === 'morning' && slot.is_booked === false
      );
      this.assert(relevantSlots.length > 0, 'There should be at least one available morning slot');

      // Find earliest by start_datetime
      relevantSlots.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
      const earliestSlot = relevantSlots[0];

      const startDateObj = new Date(earliestSlot.start_datetime);
      const day = startDateObj.getUTCDay(); // 0=Sun, 1=Mon,...
      const diffToMonday = (day + 6) % 7; // days from current day back to Monday
      const monday = new Date(startDateObj);
      monday.setUTCDate(startDateObj.getUTCDate() - diffToMonday);
      const weekStartDate = monday.toISOString().slice(0, 10); // YYYY-MM-DD

      // Get availability slots for that week, filtered to morning
      const availability = this.logic.getAvailabilitySlots(serviceId, weekStartDate, 'morning');
      this.assert(availability && Array.isArray(availability.slots), 'getAvailabilitySlots should return slots array');

      const availableSlots = availability.slots.filter((slot) => slot.is_booked === false);
      this.assert(availableSlots.length > 0, 'Should have at least one unbooked morning slot');

      // Choose the earliest slot in that week (by start_datetime)
      availableSlots.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
      const chosenSlot = availableSlots[0];

      // Ensure chosen slot is between 9:00 and 12:00 based on actual time
      const chosenStart = new Date(chosenSlot.start_datetime);
      const hourUtc = chosenStart.getUTCHours();
      this.assert(hourUtc >= 9 && hourUtc < 12, 'Chosen slot should start between 9:00 and 12:00 UTC');

      // Create booking
      const bookingResult = this.logic.createBooking(
        serviceId,
        chosenSlot.id,
        durationMinutes,
        'Jordan Lee',
        'jordan.lee@example.com',
        'Jordan Consulting Test'
      );

      this.assert(bookingResult && bookingResult.success === true, 'createBooking should succeed');
      this.assert(bookingResult.booking, 'createBooking should return booking');

      const booking = bookingResult.booking;
      this.assert(booking.service_id === serviceId, 'Booking.service_id should match selected service');
      this.assert(booking.slot_id === chosenSlot.id, 'Booking.slot_id should match chosen slot');
      this.assert(booking.duration_minutes === durationMinutes, 'Booking duration should match chosen duration');
      this.assert(booking.client_full_name === 'Jordan Lee', 'Booking client name should match submitted');

      // Verify slot is now marked as booked in storage (relationship validation)
      const slotsAfterRaw = JSON.parse(localStorage.getItem('availability_slots') || '[]');
      const updatedSlot = slotsAfterRaw.find((s) => s.id === chosenSlot.id);
      this.assert(updatedSlot && updatedSlot.is_booked === true, 'Chosen slot should now be marked as booked');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Save three technology industry case studies with budgets over $20,000 and durations under six months
  testTask5_SaveTechnologyCaseStudies() {
    const testName = 'Task 5: Save three technology case studies over $20k and under 6 months';
    try {
      const searchResult = this.logic.searchCaseStudies(
        {
          industry: 'technology',
          minBudget: 20000,
          durationBucket: 'less_than_6_months',
          onlyPublished: true
        },
        'newest_first',
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.items), 'searchCaseStudies should return items array');
      this.assert(searchResult.items.length >= 3, 'Should find at least three matching case studies');

      const firstThree = searchResult.items.slice(0, 3);

      for (let i = 0; i < firstThree.length; i++) {
        const cs = firstThree[i];
        // Open case study details
        const csDetails = this.logic.getCaseStudyDetails(cs.id);
        this.assert(csDetails && csDetails.id === cs.id, 'getCaseStudyDetails should return correct case study');

        // Save case study
        const saveResult = this.logic.saveCaseStudy(cs.id);
        this.assert(saveResult && saveResult.success === true, 'saveCaseStudy should succeed');
        this.assert(saveResult.savedItem, 'saveCaseStudy should return savedItem');

        const savedItem = saveResult.savedItem;
        this.assert(savedItem.content_type === 'case_study', 'SavedItem.content_type should be case_study');
        this.assert(savedItem.content_id === cs.id, 'SavedItem.content_id should match case study id');
      }

      // Verify via getSavedItems
      const savedList = this.logic.getSavedItems();
      this.assert(savedList && Array.isArray(savedList.items), 'getSavedItems should return items array');
      this.assert(savedList.items.length >= 3, 'Saved items should contain at least three entries');

      // Validate relationships: each SavedItem links to a technology CaseStudy
      let techCount = 0;
      for (const entry of savedList.items) {
        if (entry.caseStudy && entry.caseStudy.industry === 'technology') {
          techCount++;
        }
      }
      this.assert(techCount >= 3, 'At least three saved items should be technology case studies');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Subscribe to a weekly newsletter focused on remote leadership after opening the third 'remote teams' article
  testTask6_SubscribeWeeklyRemoteLeadershipNewsletter() {
    const testName = 'Task 6: Subscribe weekly newsletter from third remote teams article';
    try {
      // Search blog for "remote teams" with Remote Work tag, sorted by most popular
      const searchResult = this.logic.searchArticles(
        'remote teams',
        {
          tags: ['remote_work'],
          onlyPublished: true
        },
        'most_popular',
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.items), 'searchArticles should return items array');
      this.assert(searchResult.items.length >= 3, 'Should find at least three remote teams articles');

      const thirdArticle = searchResult.items[2];

      // Open article details
      const articleDetails = this.logic.getArticleDetails(thirdArticle.id);
      this.assert(articleDetails && articleDetails.id === thirdArticle.id, 'getArticleDetails should return correct article');

      // Subscribe via embedded newsletter form
      const topics = ['remote_leadership', 'team_productivity'];
      const subscriptionResult = this.logic.createNewsletterSubscription(
        'user_remote@example.com',
        topics,
        'weekly',
        'blog_article',
        thirdArticle.id
      );

      this.assert(subscriptionResult && subscriptionResult.success === true, 'createNewsletterSubscription should succeed');
      this.assert(subscriptionResult.subscription, 'createNewsletterSubscription should return subscription');

      const sub = subscriptionResult.subscription;
      this.assert(sub.email === 'user_remote@example.com', 'Subscription email should match submitted');
      this.assert(sub.frequency === 'weekly', 'Subscription frequency should be weekly');
      this.assert(Array.isArray(sub.topics), 'Subscription.topics should be array');
      this.assert(sub.topics.includes('remote_leadership'), 'Subscription topics should include remote_leadership');
      this.assert(sub.topics.includes('team_productivity'), 'Subscription topics should include team_productivity');
      this.assert(sub.source === 'blog_article', 'Subscription source should be blog_article');
      this.assert(sub.article_id === thirdArticle.id, 'Subscription.article_id should match article id');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Configure an on-site 2-day training for 25 employees with follow-up coaching under an $8,000 estimate
  testTask7_ConfigureOnsiteTrainingUnderBudget() {
    const testName = 'Task 7: Configure on-site 2-day training for 25 with coaching under $8,000';
    try {
      // Optionally inspect pricing overview (ensures calculator settings load correctly)
      const pricingOverview = this.logic.getPricingOverview();
      this.assert(pricingOverview && pricingOverview.calculatorSettings, 'getPricingOverview should return calculatorSettings');

      const budgetLimit = 8000;
      let sessions = 3; // start with 3 follow-up group coaching sessions as in task description
      let configuration = null;

      // Adjust number of coaching sessions until estimate is under budget
      while (sessions >= 0) {
        const updateResult = this.logic.updateCustomTrainingConfiguration(
          'on_site_at_office', // deliveryFormat
          25,                  // numParticipants
          2,                   // workshopLengthDays
          '2_day',             // workshopLengthLabel
          true,                // includeFollowupGroupCoaching
          sessions,            // followupGroupCoachingSessions
          false,               // includeOnlinePreworkModules (left unchecked to keep total lower)
          budgetLimit          // budgetLimit
        );

        this.assert(updateResult && updateResult.configuration, 'updateCustomTrainingConfiguration should return configuration');
        configuration = updateResult.configuration;

        if (typeof configuration.estimated_total === 'number') {
          if (configuration.is_under_budget === true && configuration.estimated_total <= budgetLimit) {
            break;
          }
        }
        sessions -= 1;
      }

      this.assert(configuration, 'Configuration should be defined after updates');
      this.assert(configuration.delivery_format === 'on_site_at_office', 'Configuration.delivery_format should be on_site_at_office');
      this.assert(configuration.num_participants === 25, 'Configuration.num_participants should be 25');
      this.assert(configuration.workshop_length_days === 2, 'Configuration.workshop_length_days should be 2');
      this.assert(configuration.include_followup_group_coaching === true, 'Configuration should include follow-up group coaching');
      this.assert(configuration.estimated_total <= budgetLimit, 'Estimated total should be under or equal to budget limit');
      this.assert(configuration.is_under_budget === true, 'Configuration.is_under_budget should be true');

      // Get proposal context for this custom training configuration
      const ctx = this.logic.getProposalContext('custom_training_configuration', undefined, configuration.id);
      this.assert(ctx, 'getProposalContext should return context for custom training configuration');
      this.assert(ctx.customTrainingConfiguration && ctx.customTrainingConfiguration.id === configuration.id, 'Context should reference the custom configuration');
      if (typeof ctx.estimateTotal === 'number') {
        this.assert(ctx.estimateTotal === configuration.estimated_total, 'Context estimateTotal should match configuration.estimated_total');
      }

      // Submit proposal request using this configuration
      const proposalResult = this.logic.submitProposalRequest(
        'custom_training_configuration', // sourceType
        undefined,                       // consultingPackageId
        configuration.id,                // customTrainingConfigurationId
        'Onsite 2-Day Training Test Co', // companyName
        '21_50_employees',               // companySize
        'Jordan Test',                   // contactName
        'onsite@example.com',            // email
        undefined,                       // phone
        undefined,                       // projectGoals
        undefined,                       // projectScope
        undefined                        // preferredStartDate
      );

      this.assert(proposalResult && proposalResult.success === true, 'submitProposalRequest (custom config) should succeed');
      this.assert(proposalResult.proposalRequest, 'submitProposalRequest should return proposalRequest');

      const pr = proposalResult.proposalRequest;
      this.assert(pr.source_type === 'custom_training_configuration', 'ProposalRequest.source_type should be custom_training_configuration');
      this.assert(pr.custom_training_configuration_id === configuration.id, 'ProposalRequest.custom_training_configuration_id should match configuration');
      this.assert(pr.email === 'onsite@example.com', 'ProposalRequest email should match submitted');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Contact a North America–based leadership consultant with 10+ years of experience and at least 5 listed clients
  testTask8_ContactNorthAmericaLeadershipConsultant() {
    const testName = 'Task 8: Contact North America leadership consultant (10+ years, 5+ clients)';
    try {
      // Search consultants with leadership_development expertise in North America, min 10 years
      const searchResult = this.logic.searchConsultants(
        {
          expertiseAreas: ['leadership_development'],
          region: 'north_america',
          minYearsExperience: 10,
          onlyActive: true
        },
        'experience_desc',
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.items), 'searchConsultants should return items array');
      this.assert(searchResult.items.length > 0, 'Should find at least one consultant');

      // Select the first consultant meeting the explicit client count criteria
      let consultant = null;
      for (const c of searchResult.items) {
        const logosCount = Array.isArray(c.client_logos) ? c.client_logos.length : 0;
        const namesCount = Array.isArray(c.client_names) ? c.client_names.length : 0;
        const clientCount = Math.max(logosCount, namesCount);
        if (c.years_experience >= 10 && clientCount >= 5) {
          consultant = c;
          break;
        }
      }

      this.assert(consultant, 'Should find a consultant with >=10 years experience and >=5 clients');

      // Open consultant details
      const consultantDetails = this.logic.getConsultantDetails(consultant.id);
      this.assert(consultantDetails && consultantDetails.id === consultant.id, 'getConsultantDetails should return correct consultant');

      // Submit contact request
      const contactResult = this.logic.submitConsultantContactRequest(
        consultant.id,
        'Leadership program for mid-level managers',
        'video_call',
        'Test inquiry about a leadership development program for mid-level managers.'
      );

      this.assert(contactResult && contactResult.success === true, 'submitConsultantContactRequest should succeed');
      this.assert(contactResult.contactRequest, 'submitConsultantContactRequest should return contactRequest');

      const cr = contactResult.contactRequest;
      this.assert(cr.consultant_id === consultant.id, 'ContactRequest.consultant_id should match selected consultant');
      this.assert(cr.subject === 'Leadership program for mid-level managers', 'ContactRequest.subject should match submitted');
      this.assert(cr.preferred_contact_method === 'video_call', 'ContactRequest.preferred_contact_method should be video_call');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper assertion & result recording
  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('[OK] ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('[FAIL] ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
