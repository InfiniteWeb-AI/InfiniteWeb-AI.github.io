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
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }
    // Reinitialize storage structure in business logic
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      agents: [
        {
          id: 'agent_1',
          name: 'Lake Union Marine Insurance',
          officePhonePrimary: '206-555-0101',
          officePhoneSecondary: '206-555-1101',
          email: 'info@lakeunionmarine.com',
          officeAddressLine1: '1200 Westlake Ave N Suite 300',
          officeAddressLine2: '',
          officeCity: 'Seattle',
          officeState: 'WA',
          officeZip: '98109',
          latitude: 47.6275,
          longitude: -122.3383,
          serviceRadiusMiles: 20,
          isActive: true
        },
        {
          id: 'agent_2',
          name: 'Queen Anne Harbor Insurance',
          officePhonePrimary: '206-555-0102',
          officePhoneSecondary: '',
          email: 'contact@qaharborins.com',
          officeAddressLine1: '500 Queen Anne Ave N',
          officeAddressLine2: 'Suite 210',
          officeCity: 'Seattle',
          officeState: 'WA',
          officeZip: '98109',
          latitude: 47.6239,
          longitude: -122.356,
          serviceRadiusMiles: 15,
          isActive: true
        },
        {
          id: 'agent_3',
          name: 'Downtown Seattle Boat & Home',
          officePhonePrimary: '206-555-0103',
          officePhoneSecondary: '206-555-2103',
          email: 'downtown@seaboathome.com',
          officeAddressLine1: '801 2nd Ave',
          officeAddressLine2: 'Floor 4',
          officeCity: 'Seattle',
          officeState: 'WA',
          officeZip: '98104',
          latitude: 47.6032,
          longitude: -122.3345,
          serviceRadiusMiles: 18,
          isActive: true
        }
      ],
      boats: [
        {
          id: 'boat_22ft_sail_98109',
          type: 'sailboat',
          lengthFeet: 22,
          value: 35000,
          primaryZip: '98109',
          usage: 'pleasure_personal_use_only',
          year: 2018,
          make: 'Beneteau',
          model: 'First 22A',
          hullMaterial: 'fiberglass'
        },
        {
          id: 'boat_20ft_motor_98109',
          type: 'motorboat',
          lengthFeet: 20,
          value: 30000,
          primaryZip: '98109',
          usage: 'pleasure_personal_use_only',
          year: 2020,
          make: 'Bayliner',
          model: 'Element E5',
          hullMaterial: 'fiberglass'
        },
        {
          id: 'boat_24ft_pontoon_98107',
          type: 'pontoon',
          lengthFeet: 24,
          value: 28000,
          primaryZip: '98107',
          usage: 'pleasure_personal_use_only',
          year: 2019,
          make: 'Sun Tracker',
          model: 'Party Barge 24',
          hullMaterial: 'aluminum'
        }
      ],
      coverage_features: [
        {
          id: 'feature_on_water_towing',
          code: 'on_water_towing',
          name: 'On-Water Towing',
          description: 'Covers the cost of towing your boat to the nearest repair facility or safe harbor if it becomes disabled on the water.',
          category: 'optional',
          isOptional: true
        },
        {
          id: 'feature_uninsured_boater',
          code: 'uninsured_boater_coverage',
          name: 'Uninsured Boater Coverage',
          description: 'Provides coverage if you are injured or your boat is damaged by a boater who has no insurance or insufficient insurance.',
          category: 'core',
          isOptional: false
        },
        {
          id: 'feature_personal_effects',
          code: 'personal_effects',
          name: 'Personal Effects Coverage',
          description: 'Helps replace personal items on board such as fishing gear, electronics, and life jackets if they are stolen or damaged.',
          category: 'optional',
          isOptional: true
        }
      ],
      discounts: [
        {
          id: 'discount_boating_safety_course',
          code: 'boating_safety_course',
          name: 'Boating Safety Course Discount',
          shortDescription: 'Save when you complete an approved boating safety course.',
          eligibilityDescription: 'Available to primary operators who have successfully completed a state-approved or NASBLA-certified boating safety course within the last 5 years. Proof of completion may be required.',
          maxSavingsPercent: 10,
          isActive: true,
          detailArticleSlug: 'about_us'
        },
        {
          id: 'discount_multi_policy',
          code: 'multi_policy',
          name: 'Multi-Policy Discount',
          shortDescription: 'Bundle boat insurance with home, renters, or auto and save.',
          eligibilityDescription: 'Applies when you have an active homeowners, condo, renters, or auto insurance policy with our company in addition to your boat policy. All policies must be in the same household.',
          maxSavingsPercent: 15,
          isActive: true,
          detailArticleSlug: 'about_us'
        },
        {
          id: 'discount_claims_free',
          code: 'claims_free',
          name: 'Claims-Free Discount',
          shortDescription: 'Reward for maintaining a claims-free boating record.',
          eligibilityDescription: 'Eligible after 3 consecutive years with no at-fault claims or major violations on any insured watercraft.',
          maxSavingsPercent: 8,
          isActive: true,
          detailArticleSlug: 'about_us'
        }
      ],
      help_articles: [
        {
          id: 'about_us',
          slug: 'about_us',
          title: 'About Our Boat Insurance Company',
          content: 'We are a Pacific Northwestbased insurer specializing in boat and marine coverage for local lakes, rivers, and coastal waters. Our dedicated team of licensed agents understands the unique risks of boating around Seattle, including Lake Union, Puget Sound, and surrounding waterways.\n\nWe offer a range of coverage options from basic liability-only policies to comprehensive hull coverage with optional towing, personal effects, and more. Our online tools make it easy to get a quote, manage your policy, and file a claim 24/7.\n\nIf you prefer personal guidance, our local agent network can help you compare policy types, apply discounts such as Boating Safety Course or Multi-Policy, and tailor protection to your specific boat and usage.',
          topic: 'about',
          maxOnlineQuoteBoatLengthFeet: null,
          isPublished: true,
          createdAt: '2024-01-10T10:00:00Z',
          updatedAt: '2025-06-15T09:30:00Z'
        },
        {
          id: 'contact_us',
          slug: 'contact_us',
          title: 'Contact Us',
          content: 'Need help with a quote, claim, or existing boat policy? You can reach our customer care team in several ways:\n\nd Phone: 1-800-555-0199 (MonFri, 8 a.m.6 p.m. PT)\nd Email: support@exampleboatins.com (responses within 1 business day)\nd Mail: Example Boat Insurance, PO Box 12345, Seattle, WA 98101\n\nFor fast service on an existing policy, have your policy number ready. For online claims and quote questions, you can also use the Help & FAQs section or send a secure message from the My Policy dashboard after signing in.',
          topic: 'contact',
          maxOnlineQuoteBoatLengthFeet: null,
          isPublished: true,
          createdAt: '2024-01-15T11:00:00Z',
          updatedAt: '2025-05-20T14:45:00Z'
        },
        {
          id: 'privacy_policy',
          slug: 'privacy_policy',
          title: 'Privacy Policy',
          content: 'This Privacy Policy explains how we collect, use, and safeguard your personal information when you visit our website, request a quote, purchase a policy, or file a claim.\n\nWe collect information you provide directly (such as your name, address, and details about your boat) and information collected automatically (such as device and usage data). We use this information to provide insurance quotes, service your policies, comply with legal obligations, and improve our services.\n\nWe do not sell your personal information. We may share it with service providers, reinsurers, or regulators as permitted or required by law. You can learn more about your privacy choices and how to contact us with questions in this full policy document.',
          topic: 'legal',
          maxOnlineQuoteBoatLengthFeet: null,
          isPublished: true,
          createdAt: '2024-02-01T09:00:00Z',
          updatedAt: '2025-02-10T16:00:00Z'
        }
      ],
      optional_coverages: [
        {
          id: 'optional_towing_assistance',
          code: 'towing_assistance',
          name: 'Towing & Assistance',
          description: 'Provides reimbursement for on-water towing, jump starts, fuel delivery, and soft ungrounding when your boat becomes disabled on the water.',
          hasLimit: false,
          limitOptions: [],
          isAvailableForPolicyTypeIds: ['standard', 'premium'],
          isActive: true
        },
        {
          id: 'optional_personal_effects',
          code: 'personal_effects',
          name: 'Personal Effects Coverage',
          description: 'Covers personal belongings such as fishing gear, coolers, electronics, and safety equipment while on board or being loaded or unloaded from your boat.',
          hasLimit: true,
          limitOptions: [1000, 2000, 3000],
          isAvailableForPolicyTypeIds: ['standard', 'premium'],
          isActive: true
        },
        {
          id: 'optional_trailer_coverage',
          code: 'trailer_coverage',
          name: 'Boat Trailer Coverage',
          description: 'Adds physical damage coverage for your boat trailer when it is damaged by a covered cause such as collision, theft, or vandalism.',
          hasLimit: true,
          limitOptions: [1500, 3000, 5000],
          isAvailableForPolicyTypeIds: ['liability_only', 'standard', 'premium'],
          isActive: true
        }
      ],
      policy_types: [
        {
          id: 'liability_only',
          code: 'liability_only',
          name: 'Liability Only',
          description: 'Affordable protection focused on bodily injury and property damage you may cause to others while operating your boat.',
          relativePriceRank: 1,
          allowedLiabilityLimits: [100000, 300000, 500000],
          allowedDeductibles: [500, 1000, 2000],
          includesOnWaterTowing: false,
          includesUninsuredBoaterCoverage: true,
          isActive: true
        },
        {
          id: 'standard',
          code: 'standard',
          name: 'Standard',
          description: 'Balanced coverage that includes liability, hull damage, uninsured boater coverage, and on-water towing for most recreational boaters.',
          relativePriceRank: 2,
          allowedLiabilityLimits: [300000, 500000, 1000000],
          allowedDeductibles: [250, 500, 1000],
          includesOnWaterTowing: true,
          includesUninsuredBoaterCoverage: true,
          isActive: true
        },
        {
          id: 'premium',
          code: 'premium',
          name: 'Premium',
          description: 'Enhanced protection with higher liability limits, broader hull coverage, and extra benefits for frequent boaters and larger vessels.',
          relativePriceRank: 3,
          allowedLiabilityLimits: [500000, 1000000, 2000000],
          allowedDeductibles: [250, 500, 1000],
          includesOnWaterTowing: true,
          includesUninsuredBoaterCoverage: true,
          isActive: true
        }
      ],
      insurance_plans: [
        {
          id: 'plan_liab_value_300_1000',
          name: 'Liability Value 300 / 1000',
          policyTypeId: 'liability_only',
          description: 'Entry-level liability-only plan with $300,000 liability and a $1,000 deductible for budget-conscious boaters.',
          basePriceMonthly: 22,
          basePriceAnnual: 242,
          liabilityLimit: 300000,
          deductible: 1000,
          includedOptionalCoverageIds: [],
          displayOrder: 1,
          isFeatured: true,
          isAvailableOnline: true
        },
        {
          id: 'plan_std_value_300_1000',
          name: 'Standard Value 300 / 1000',
          policyTypeId: 'standard',
          description: 'Balanced protection with hull coverage, towing, and $300,000 liability with a $1,000 deductible.',
          basePriceMonthly: 35,
          basePriceAnnual: 378,
          liabilityLimit: 300000,
          deductible: 1000,
          includedOptionalCoverageIds: [],
          displayOrder: 2,
          isFeatured: true,
          isAvailableOnline: true
        },
        {
          id: 'plan_prem_value_300_1000',
          name: 'Premium Value 300 / 1000',
          policyTypeId: 'premium',
          description: 'Premium plan with enhanced hull protection and included towing and personal effects coverage.',
          basePriceMonthly: 49,
          basePriceAnnual: 529,
          liabilityLimit: 300000,
          deductible: 1000,
          includedOptionalCoverageIds: ['optional_towing_assistance', 'optional_personal_effects'],
          displayOrder: 3,
          isFeatured: true,
          isAvailableOnline: true
        }
      ],
      policies: [
        {
          id: 'BP-10001',
          policyNumber: 'BP-10001',
          policyTypeId: 'standard',
          boatId: 'boat_20ft_motor_98109',
          status: 'active',
          effectiveDate: '2025-04-01T00:00:00Z',
          expirationDate: '2026-04-01T00:00:00Z',
          liabilityLimit: 300000,
          deductible: 500,
          usage: 'pleasure_personal_use_only',
          billingFrequency: 'monthly',
          primaryZip: '98109',
          mailingAddressLine1: '789 Harbor Lane',
          mailingAddressLine2: 'Apt 5B',
          mailingCity: 'Seattle',
          mailingState: 'WA',
          mailingZip: '98101',
          lastAddressUpdatedAt: '2025-04-01T08:00:00Z'
        },
        {
          id: 'BP-10002',
          policyNumber: 'BP-10002',
          policyTypeId: 'premium',
          boatId: 'boat_22ft_sail_98109',
          status: 'expired',
          effectiveDate: '2023-03-15T00:00:00Z',
          expirationDate: '2024-03-15T00:00:00Z',
          liabilityLimit: 500000,
          deductible: 500,
          usage: 'pleasure_personal_use_only',
          billingFrequency: 'annually',
          primaryZip: '98109',
          mailingAddressLine1: '456 Lakeshore Drive',
          mailingAddressLine2: '',
          mailingCity: 'Seattle',
          mailingState: 'WA',
          mailingZip: '98109',
          lastAddressUpdatedAt: '2023-03-01T10:30:00Z'
        },
        {
          id: 'BP-10003',
          policyNumber: 'BP-10003',
          policyTypeId: 'liability_only',
          boatId: 'boat_11ft_pwc_98118',
          status: 'active',
          effectiveDate: '2024-08-10T00:00:00Z',
          expirationDate: '2025-08-10T00:00:00Z',
          liabilityLimit: 100000,
          deductible: 1000,
          usage: 'pleasure_personal_use_only',
          billingFrequency: 'annually',
          primaryZip: '98118',
          mailingAddressLine1: '1020 Rainier Ave S',
          mailingAddressLine2: 'Unit 210',
          mailingCity: 'Seattle',
          mailingState: 'WA',
          mailingZip: '98118',
          lastAddressUpdatedAt: '2024-08-01T14:15:00Z'
        }
      ],
      policy_type_features: [
        {
          id: 'liability_only_on_water_towing',
          policyTypeId: 'liability_only',
          coverageFeatureId: 'feature_on_water_towing',
          included: false
        },
        {
          id: 'liability_only_uninsured_boater',
          policyTypeId: 'liability_only',
          coverageFeatureId: 'feature_uninsured_boater',
          included: true
        },
        {
          id: 'liability_only_personal_effects',
          policyTypeId: 'liability_only',
          coverageFeatureId: 'feature_personal_effects',
          included: false
        }
      ],
      policy_documents: [
        {
          id: 'doc_BP-10001_idcard_current',
          policyId: 'BP-10001',
          type: 'id_card',
          title: 'Boat Insurance ID Card - Policy BP-10001',
          description: 'Current digital ID card for your boat policy. Show this as proof of insurance when requested.',
          documentFormat: 'html',
          viewUrl: 'id_card.html?policyId=BP-10001',
          isCurrent: true,
          createdAt: '2025-04-01T08:05:00Z'
        },
        {
          id: 'doc_BP-10001_declarations_current',
          policyId: 'BP-10001',
          type: 'declarations_page',
          title: 'Declarations Page - Policy BP-10001',
          description: 'Summary of coverages, limits, deductibles, and insured boat details for policy BP-10001.',
          documentFormat: 'pdf',
          viewUrl: 'documents/declarations.html?policyId=BP-10001',
          isCurrent: true,
          createdAt: '2025-04-01T08:02:00Z'
        },
        {
          id: 'doc_BP-10001_billing_feb2026',
          policyId: 'BP-10001',
          type: 'billing_statement',
          title: 'Billing Statement - February 2026 - Policy BP-10001',
          description: 'Monthly billing statement showing charges and payments for February 2026.',
          documentFormat: 'pdf',
          viewUrl: 'documents/billing_statement.html?policyId=BP-10001&cycle=2026-02',
          isCurrent: false,
          createdAt: '2026-02-05T06:00:00Z'
        }
      ]
    };

    // Persist generated data into localStorage using storage keys
    const set = (key, value) => {
      if (typeof localStorage !== 'undefined' && localStorage.setItem) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    };

    set('agents', generatedData.agents || []);
    set('boats', generatedData.boats || []);
    set('coverage_features', generatedData.coverage_features || []);
    set('discounts', generatedData.discounts || []);
    set('help_articles', generatedData.help_articles || []);
    set('optional_coverages', generatedData.optional_coverages || []);
    set('policy_types', generatedData.policy_types || []);
    set('insurance_plans', generatedData.insurance_plans || []);
    set('policies', generatedData.policies || []);
    set('policy_type_features', generatedData.policy_type_features || []);
    set('policy_documents', generatedData.policy_documents || []);

    // Initialize empty collections for dynamic entities if not already set by _initStorage
    set('quotes', JSON.parse(localStorage.getItem('quotes') || '[]'));
    set('quote_optional_coverages', JSON.parse(localStorage.getItem('quote_optional_coverages') || '[]'));
    set('claims', JSON.parse(localStorage.getItem('claims') || '[]'));
    set('agent_consultation_requests', JSON.parse(localStorage.getItem('agent_consultation_requests') || '[]'));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_GetOnlineQuoteCheapestPlan300k500Annual();
    this.testTask2_CustomizeOptionalCoveragesUnder20();
    this.testTask3_LoginUpdateMailingAddressViewIdCard();
    this.testTask4_FileOnlineClaimHullDamageNoInjuries();
    this.testTask5_FindLocalAgentAndSendConsultation();
    this.testTask6_ComparePolicyTypesAndStartQuote500k();
    this.testTask7_ApplySafetyAndMultiPolicyDiscountsAndSaveQuote();
    this.testTask8_UseFaqMaxBoatLengthAndStartQuote();

    return this.results;
  }

  // Task 1: Get an online quote and select the cheapest plan with $300,000 liability and $500 deductible
  testTask1_GetOnlineQuoteCheapestPlan300k500Annual() {
    const testName = 'Task 1: Online quote, choose cheapest 300k/500 plan with annual billing';
    try {
      this.clearStorage();
      this.setupTestData();

      // Homepage content
      const home = this.logic.getHomepageContent();
      this.assert(!!home && typeof home.heroTitle === 'string', 'Homepage content should be available');

      // Start new quote from homepage CTA
      const startResult = this.logic.startNewQuote('homepage_cta', null, []);
      this.assert(startResult.success === true, 'startNewQuote should succeed');
      this.assert(!!startResult.quoteNumber, 'startNewQuote should return quoteNumber');

      // Boat details: 22-foot sailboat, $35,000, ZIP 98109, pleasure use
      const boatDetailsResult = this.logic.updateQuoteBoatDetails(
        'sailboat',
        22,
        35000,
        '98109',
        'pleasure_personal_use_only',
        2018,
        'Beneteau',
        'First 22A',
        'fiberglass'
      );
      this.assert(boatDetailsResult.success === true, 'Boat details update should succeed');
      this.assert(
        boatDetailsResult.eligibility && boatDetailsResult.eligibility.isEligibleOnline === true,
        'Boat should be eligible for online quote'
      );
      this.assert(
        boatDetailsResult.nextStep === 'coverage_options',
        'Next step after boat details should be coverage_options'
      );

      // Coverage options
      const coverageOptions = this.logic.getQuoteCoverageOptions();
      this.assert(coverageOptions && coverageOptions.quoteNumber, 'Coverage options should return quoteNumber');

      const liabilityOption300 = (coverageOptions.liabilityLimitOptions || []).find(
        (opt) => opt.value === 300000
      );
      this.assert(!!liabilityOption300, '300,000 liability option should be available');

      const deductibleOption500 = (coverageOptions.deductibleOptions || []).find(
        (opt) => opt.value === 500
      );
      this.assert(!!deductibleOption500, '500 deductible option should be available');

      const selectedPolicyTypeId = coverageOptions.selectedPolicyType
        ? coverageOptions.selectedPolicyType.id
        : (coverageOptions.availablePolicyTypes && coverageOptions.availablePolicyTypes[0]
          ? coverageOptions.availablePolicyTypes[0].id
          : null);
      this.assert(!!selectedPolicyTypeId, 'A policy type should be selected or available');

      // Set liability 300,000 and deductible 500 then view plans
      const coverageUpdate = this.logic.updateQuoteCoverageSelections(
        300000,
        500,
        selectedPolicyTypeId,
        null
      );
      this.assert(coverageUpdate.success === true, 'Coverage selections update should succeed');
      this.assert(
        coverageUpdate.selectedLiabilityLimit === 300000,
        'Selected liability limit should be 300,000'
      );
      this.assert(
        coverageUpdate.selectedDeductible === 500,
        'Selected deductible should be 500'
      );

      // Get plans sorted by price low to high
      const plansResult = this.logic.getQuotePlans('price_low_to_high');
      this.assert(plansResult && Array.isArray(plansResult.plans), 'Plans list should be returned');
      this.assert(plansResult.plans.length > 0, 'At least one plan should be available');

      const cheapestPlan = plansResult.plans[0];
      this.assert(!!cheapestPlan.planId, 'Cheapest plan should have a planId');
      // Ensure plan matches selected coverage (at least liability)
      this.assert(
        cheapestPlan.liabilityLimit === coverageUpdate.selectedLiabilityLimit,
        'Cheapest plan liability should match selected coverage liability'
      );

      // Select cheapest plan
      const selectPlanRes = this.logic.selectPlanForCurrentQuote(cheapestPlan.planId);
      this.assert(selectPlanRes.success === true, 'Selecting plan should succeed');
      this.assert(
        selectPlanRes.selectedPlanId === cheapestPlan.planId,
        'Selected planId should match the chosen cheapest plan'
      );

      // Plan summary & billing options
      const planSummaryRes = this.logic.getSelectedPlanSummaryAndOptions();
      this.assert(planSummaryRes && planSummaryRes.plan && planSummaryRes.plan.id, 'Plan summary should be available');

      // Set billing to annually
      const billingRes = this.logic.setQuoteBillingFrequency('annually');
      this.assert(billingRes.success === true, 'Setting billing frequency to annually should succeed');
      this.assert(billingRes.billingFrequency === 'annually', 'Billing frequency should be annually');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Customize optional coverages while keeping added cost under $20 per month
  testTask2_CustomizeOptionalCoveragesUnder20() {
    const testName = 'Task 2: Customize optional coverages with towing and personal effects under $20/month';
    try {
      this.clearStorage();
      this.setupTestData();

      // Start new quote from homepage
      const startResult = this.logic.startNewQuote('homepage_cta', null, []);
      this.assert(startResult.success === true, 'startNewQuote should succeed');

      // Initial boat form: motorboat, 20 ft, $30,000, 98109, pleasure use
      const boatDetailsResult = this.logic.updateQuoteBoatDetails(
        'motorboat',
        20,
        30000,
        '98109',
        'pleasure_personal_use_only',
        2020,
        'Bayliner',
        'Element E5',
        'fiberglass'
      );
      this.assert(boatDetailsResult.success === true, 'Boat details update should succeed');
      this.assert(
        boatDetailsResult.eligibility && boatDetailsResult.eligibility.isEligibleOnline === true,
        'Boat should be eligible for online quote'
      );

      // Coverage options - leave defaults, but we still need to confirm them
      const coverageOptions = this.logic.getQuoteCoverageOptions();
      this.assert(coverageOptions && coverageOptions.quoteNumber, 'Coverage options should be available');

      const currentLiability = coverageOptions.selectedLiabilityLimit || (
        (coverageOptions.liabilityLimitOptions && coverageOptions.liabilityLimitOptions[0]
          ? coverageOptions.liabilityLimitOptions[0].value
          : null)
      );
      const currentDeductible = coverageOptions.selectedDeductible || (
        (coverageOptions.deductibleOptions && coverageOptions.deductibleOptions[0]
          ? coverageOptions.deductibleOptions[0].value
          : null)
      );
      const policyTypeId = coverageOptions.selectedPolicyType
        ? coverageOptions.selectedPolicyType.id
        : (coverageOptions.availablePolicyTypes && coverageOptions.availablePolicyTypes[0]
          ? coverageOptions.availablePolicyTypes[0].id
          : null);

      this.assert(!!currentLiability, 'A liability limit should be selected');
      this.assert(!!currentDeductible, 'A deductible should be selected');
      this.assert(!!policyTypeId, 'A policy type should be selected');

      const coverageUpdate = this.logic.updateQuoteCoverageSelections(
        currentLiability,
        currentDeductible,
        policyTypeId,
        null
      );
      this.assert(coverageUpdate.success === true, 'Coverage update should succeed');

      // Plans: select middle-priced (second) plan if available
      const plansResult = this.logic.getQuotePlans('price_low_to_high');
      this.assert(plansResult && Array.isArray(plansResult.plans), 'Plans list should be returned');
      this.assert(plansResult.plans.length > 0, 'At least one plan should be available');

      const planIndex = plansResult.plans.length >= 2 ? 1 : 0;
      const chosenPlan = plansResult.plans[planIndex];
      const selectPlanRes = this.logic.selectPlanForCurrentQuote(chosenPlan.planId);
      this.assert(selectPlanRes.success === true, 'Selecting plan should succeed');

      // Plan summary & optional coverages
      let planSummaryRes = this.logic.getSelectedPlanSummaryAndOptions();
      this.assert(planSummaryRes && planSummaryRes.plan && planSummaryRes.plan.id, 'Plan summary should be available');

      const optionalCoveragesList = planSummaryRes.optionalCoverages || [];
      const towingOpt = optionalCoveragesList.find((c) => c.code === 'towing_assistance');
      const personalEffectsOpt = optionalCoveragesList.find((c) => c.code === 'personal_effects');

      this.assert(!!towingOpt, 'Towing & Assistance optional coverage should be available');
      this.assert(!!personalEffectsOpt, 'Personal Effects optional coverage should be available');

      // Turn on towing
      let updateRes = this.logic.updateQuoteOptionalCoverage(
        towingOpt.optionalCoverageId,
        true,
        towingOpt.selectedLimit || undefined
      );
      this.assert(updateRes.success === true, 'Enabling towing coverage should succeed');

      // Turn on personal effects with $2,000 limit initially
      updateRes = this.logic.updateQuoteOptionalCoverage(
        personalEffectsOpt.optionalCoverageId,
        true,
        2000
      );
      this.assert(updateRes.success === true, 'Enabling personal effects coverage should succeed');

      let optionalTotal = updateRes.optionalCoveragesTotalMonthly || 0;

      // If total extra cost exceeds $20, reduce to $1,000
      if (optionalTotal > 20) {
        updateRes = this.logic.updateQuoteOptionalCoverage(
          personalEffectsOpt.optionalCoverageId,
          true,
          1000
        );
        this.assert(updateRes.success === true, 'Adjusting personal effects limit to 1,000 should succeed');
        optionalTotal = updateRes.optionalCoveragesTotalMonthly || 0;
      }

      // If still above $20, turn Personal Effects off
      if (optionalTotal > 20) {
        updateRes = this.logic.updateQuoteOptionalCoverage(
          personalEffectsOpt.optionalCoverageId,
          false,
          null
        );
        this.assert(updateRes.success === true, 'Disabling personal effects should succeed');
        optionalTotal = updateRes.optionalCoveragesTotalMonthly || 0;
      }

      // Re-fetch plan summary to confirm final state
      planSummaryRes = this.logic.getSelectedPlanSummaryAndOptions();
      const finalOptionalCoverages = planSummaryRes.optionalCoverages || [];
      const finalTowing = finalOptionalCoverages.find((c) => c.code === 'towing_assistance');
      const finalPersonalEffects = finalOptionalCoverages.find((c) => c.code === 'personal_effects');

      this.assert(finalTowing && finalTowing.selected === true, 'Towing must remain enabled');

      if (finalPersonalEffects && finalPersonalEffects.selected) {
        this.assert(
          finalPersonalEffects.selectedLimit >= 1000,
          'Personal effects limit should be at least 1,000 when enabled'
        );
        this.assert(
          (planSummaryRes.optionalCoveragesTotalMonthly || 0) <= 20,
          'Optional coverages total monthly cost should be under or equal to $20 when personal effects is enabled'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Log in and update the mailing address for an existing boat policy
  testTask3_LoginUpdateMailingAddressViewIdCard() {
    const testName = 'Task 3: Login, update mailing address, and view digital ID card';
    try {
      this.clearStorage();
      this.setupTestData();

      // Login with demo credentials
      const loginRes = this.logic.login('demo_user', 'DemoPass123!');
      this.assert(loginRes.success === true, 'Login with demo credentials should succeed');

      // Dashboard summary
      const dashboard = this.logic.getAccountDashboardSummary();
      this.assert(dashboard && Array.isArray(dashboard.policies), 'Dashboard should return policies');
      this.assert(dashboard.policies.length > 0, 'At least one policy should be on dashboard');

      // Pick an active boat policy (or first)
      const policySummary =
        dashboard.policies.find((p) => p.status === 'active') || dashboard.policies[0];
      this.assert(!!policySummary && !!policySummary.policyId, 'A policy should be selected from dashboard');

      const policyId = policySummary.policyId;

      // Policy detail
      const policyDetail = this.logic.getPolicyDetail(policyId);
      this.assert(policyDetail && policyDetail.policyId === policyId, 'Policy detail should match selected policy');

      // Update mailing address
      const updateAddrRes = this.logic.updatePolicyMailingAddress(
        policyId,
        '123 Marina Way',
        '',
        'Seattle',
        'WA',
        '98109'
      );
      this.assert(updateAddrRes.success === true, 'Updating mailing address should succeed');
      this.assert(updateAddrRes.mailingAddress.line1 === '123 Marina Way', 'Mailing line1 should be updated');
      this.assert(updateAddrRes.mailingAddress.city === 'Seattle', 'Mailing city should be Seattle');
      this.assert(updateAddrRes.mailingAddress.state === 'WA', 'Mailing state should be WA');
      this.assert(updateAddrRes.mailingAddress.zip === '98109', 'Mailing ZIP should be 98109');

      // Get ID card documents list
      const docsList = this.logic.getPolicyDocuments(policyId, 'id_card');
      this.assert(docsList && Array.isArray(docsList.documents), 'Policy documents list should be available');
      this.assert(docsList.documents.length > 0, 'At least one ID card document should be listed');

      const currentIdCardDoc = docsList.documents.find((d) => d.isCurrent === true) || docsList.documents[0];
      this.assert(!!currentIdCardDoc, 'There should be a current ID card document');

      // View digital ID card
      const idCardView = this.logic.getPolicyIdCard(policyId);
      this.assert(idCardView && idCardView.policyId === policyId, 'ID card view should match policyId');
      this.assert(!!idCardView.viewUrl, 'ID card viewUrl should be provided');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: File an online claim for $3,200 hull damage with no injuries
  testTask4_FileOnlineClaimHullDamageNoInjuries() {
    const testName = 'Task 4: File online claim for $3,200 hull damage with no injuries';
    try {
      this.clearStorage();
      this.setupTestData();

      // Claim start options
      const startOptions = this.logic.getClaimStartOptions();
      this.assert(startOptions && Array.isArray(startOptions.claimTypes), 'Claim types should be available');
      const boatClaimType = startOptions.claimTypes.find((c) => c.claimTypeCode === 'boat_insurance');
      this.assert(!!boatClaimType, 'Boat insurance claim type should be available');

      // Choose an existing policy number from storage
      const policies = JSON.parse(localStorage.getItem('policies') || '[]');
      this.assert(policies.length > 0, 'There should be at least one policy in storage');
      const targetPolicy = policies.find((p) => p.status === 'active') || policies[0];
      const policyNumber = targetPolicy.policyNumber;

      // Start boat claim
      const startClaimRes = this.logic.startBoatClaim(policyNumber);
      this.assert(startClaimRes.success === true, 'Starting boat claim should succeed');
      this.assert(!!startClaimRes.claimId, 'ClaimId should be returned');

      // Incident details
      const incidentUpdateRes = this.logic.updateCurrentClaimIncidentDetails(
        '2025-08-15',
        'Lake Union, Seattle, WA',
        'collision_with_dock',
        3200,
        'no_injuries',
        'not_reported'
      );
      this.assert(incidentUpdateRes.success === true, 'Incident details update should succeed');
      this.assert(incidentUpdateRes.nextStep === 'owner_details', 'Next step should be owner_details');

      // Owner details
      const ownerUpdateRes = this.logic.updateCurrentClaimOwnerDetails(
        'Alex',
        'Rivera',
        '2065550199',
        'alex.rivera@example.com'
      );
      this.assert(ownerUpdateRes.success === true, 'Owner details update should succeed');

      // Incident description
      const descriptionText = 'While docking at Lake Union, the boat made hard contact with the dock. The bow and port side hull show visible cracks and scraped gelcoat. No passengers were injured and no other property was damaged.';
      const descUpdateRes = this.logic.updateCurrentClaimIncidentDescription(descriptionText);
      this.assert(descUpdateRes.success === true, 'Incident description update should succeed');
      this.assert(descUpdateRes.nextStep === 'review', 'Next step should be review');

      // Review summary
      const reviewSummary = this.logic.getCurrentClaimReviewSummary();
      this.assert(reviewSummary && reviewSummary.policySummary, 'Claim review summary should be available');
      this.assert(reviewSummary.policySummary.policyNumber === policyNumber, 'Claim should reference correct policy number');
      this.assert(
        reviewSummary.incidentDetails.estimatedDamageAmount === 3200,
        'Estimated damage should be $3,200'
      );
      this.assert(
        reviewSummary.incidentDetails.injuriesStatus === 'no_injuries',
        'Injuries status should be no_injuries'
      );

      // Submit claim
      const submitRes = this.logic.submitCurrentClaim();
      this.assert(submitRes.success === true, 'Submitting claim should succeed');
      this.assert(!!submitRes.claimNumber, 'Claim number should be returned on submission');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Find a local agent within 15 miles of ZIP 98109 and send a consultation request
  testTask5_FindLocalAgentAndSendConsultation() {
    const testName = 'Task 5: Find local agent within 15 miles of 98109 and send consultation request';
    try {
      this.clearStorage();
      this.setupTestData();

      // Search agents near 98109 within 15 miles sorted by nearest
      const searchRes = this.logic.searchAgents('98109', 15, 'distance_asc');
      this.assert(searchRes && Array.isArray(searchRes.agents), 'Agent search should return results');
      this.assert(searchRes.agents.length > 0, 'At least one agent should be returned');

      const nearestAgent = searchRes.agents[0];
      this.assert(!!nearestAgent.agentId, 'Nearest agent should have an ID');
      this.assert(nearestAgent.distanceMiles <= 15, 'Nearest agent should be within 15 miles');

      const agentId = nearestAgent.agentId;

      // Agent detail
      const agentDetail = this.logic.getAgentDetail(agentId);
      this.assert(agentDetail && agentDetail.agentId === agentId, 'Agent detail should match agentId');
      this.assert(!!agentDetail.officePhonePrimary, 'Agent should have a primary office phone');

      // Submit consultation request
      const message = 'Interested in boat insurance for a 22-foot sailboat in ZIP 98109';
      const consultRes = this.logic.submitAgentConsultationRequest(
        agentId,
        'Jordan Lee',
        'jordan.lee@example.com',
        '',
        message
      );
      this.assert(consultRes.success === true, 'Submitting agent consultation request should succeed');
      this.assert(!!consultRes.requestId, 'Consultation requestId should be returned');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Compare policy types and start a quote for the lowest-priced plan with towing and uninsured boater coverage and $500,000 liability
  testTask6_ComparePolicyTypesAndStartQuote500k() {
    const testName = 'Task 6: Compare policy types, choose lowest-priced with towing+uninsured, start quote with >=$500k liability';
    try {
      this.clearStorage();
      this.setupTestData();

      // Coverage overview (for navigation simulation)
      const coverageOverview = this.logic.getCoverageOverview();
      this.assert(!!coverageOverview && Array.isArray(coverageOverview.policyTypeSummaries), 'Coverage overview should be available');

      // Policy comparison, highlighting towing and uninsured boater coverage
      const comparison = this.logic.getPolicyComparison(
        ['on_water_towing', 'uninsured_boater_coverage'],
        true
      );
      this.assert(comparison && Array.isArray(comparison.policyTypes), 'Policy comparison should return policy types');

      let policyTypeId = comparison.recommendedPolicyTypeId || null;
      if (!policyTypeId) {
        const qualifying = comparison.policyTypes.filter(
          (pt) => pt.meetsHighlightedCriteria || (pt.includesOnWaterTowing && pt.includesUninsuredBoaterCoverage)
        );
        this.assert(qualifying.length > 0, 'There should be at least one policy type with both towing and uninsured coverage');
        qualifying.sort((a, b) => (a.relativePriceRank || 0) - (b.relativePriceRank || 0));
        policyTypeId = qualifying[0].policyTypeId;
      }
      this.assert(!!policyTypeId, 'A policyTypeId should be chosen for quote');

      // Policy type detail to find allowed liability limits
      const policyTypeDetail = this.logic.getPolicyTypeDetail(policyTypeId);
      this.assert(policyTypeDetail && policyTypeDetail.policyTypeId === policyTypeId, 'Policy type detail should match');
      const allowedLimits = policyTypeDetail.allowedLiabilityLimits || [];
      this.assert(allowedLimits.length > 0, 'Allowed liability limits should be present');

      const limitObjAtLeast500k = allowedLimits.find((l) => l.value >= 500000) || allowedLimits[allowedLimits.length - 1];
      const preferredLiabilityLimit = limitObjAtLeast500k.value;
      this.assert(preferredLiabilityLimit >= 500000, 'Chosen liability limit should be at least 500,000');

      // Start quote for this policy type with preferred liability
      const startQuoteRes = this.logic.startQuoteForPolicyType(
        policyTypeId,
        preferredLiabilityLimit,
        'policy_comparison_page'
      );
      this.assert(startQuoteRes.success === true, 'Starting quote for policy type should succeed');
      this.assert(startQuoteRes.selectedLiabilityLimit >= 500000, 'Quote should have liability >= 500,000');

      // Boat details for quote
      const boatDetailsRes = this.logic.updateQuoteBoatDetails(
        'sailboat',
        22,
        35000,
        '98109',
        'pleasure_personal_use_only',
        2018,
        'Beneteau',
        'First 22A',
        'fiberglass'
      );
      this.assert(boatDetailsRes.success === true, 'Boat details update for policy-type quote should succeed');

      // Coverage options should reflect selected policy type and >=500k liability
      const coverageOptions = this.logic.getQuoteCoverageOptions();
      this.assert(coverageOptions && coverageOptions.selectedPolicyType, 'Coverage options should have selected policy type');
      this.assert(
        coverageOptions.selectedPolicyType.id === policyTypeId,
        'Selected policy type on coverage options should match chosen type'
      );
      this.assert(
        coverageOptions.selectedLiabilityLimit >= 500000,
        'Coverage options selected liability should be at least 500,000'
      );

      const currentLiability = coverageOptions.selectedLiabilityLimit;
      const currentDeductible = coverageOptions.selectedDeductible || (
        coverageOptions.deductibleOptions && coverageOptions.deductibleOptions[0]
          ? coverageOptions.deductibleOptions[0].value
          : null
      );
      this.assert(!!currentDeductible, 'A deductible must be selected for policy-type quote');

      // Proceed to plans list
      const covUpdate = this.logic.updateQuoteCoverageSelections(
        currentLiability,
        currentDeductible,
        policyTypeId,
        null
      );
      this.assert(covUpdate.success === true, 'Coverage selections update for policy-type quote should succeed');

      const plansResult = this.logic.getQuotePlans('recommended');
      this.assert(plansResult && plansResult.plans && plansResult.plans.length > 0, 'Plans should be available for policy-type quote');
      const chosenPlan = plansResult.plans[0];

      const selectPlanRes = this.logic.selectPlanForCurrentQuote(chosenPlan.planId);
      this.assert(selectPlanRes.success === true, 'Selecting plan for policy-type quote should succeed');

      // Move to applicant info step
      const appInfoRes = this.logic.beginApplicantInfoForCurrentQuote();
      this.assert(appInfoRes.success === true, 'Begin applicant info should succeed');
      this.assert(appInfoRes.step === 'applicant_info', 'Step should be applicant_info');
      this.assert(Array.isArray(appInfoRes.requiredFields), 'Required fields list should be provided');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Apply boating safety and multi-policy discounts to a quote and save it with a label
  testTask7_ApplySafetyAndMultiPolicyDiscountsAndSaveQuote() {
    const testName = 'Task 7: Apply boating safety + multi-policy discounts, choose monthly payments, save quote with label';
    try {
      this.clearStorage();
      this.setupTestData();

      // Discounts overview
      const discountsOverview = this.logic.getDiscountsOverview();
      this.assert(discountsOverview && Array.isArray(discountsOverview.discounts), 'Discounts overview should be available');

      const safetyDiscount = discountsOverview.discounts.find((d) => d.discountCode === 'boating_safety_course');
      const multiDiscount = discountsOverview.discounts.find((d) => d.discountCode === 'multi_policy');
      this.assert(!!safetyDiscount, 'Boating Safety Course discount should be listed');
      this.assert(!!multiDiscount, 'Multi-Policy discount should be listed');

      // Learn more for safety discount
      const safetyDetail = this.logic.getDiscountDetail('boating_safety_course');
      this.assert(safetyDetail && safetyDetail.discountCode === 'boating_safety_course', 'Safety discount detail should load');

      // Start a quote from discounts page with potential discounts preselected
      const startQuoteRes = this.logic.startNewQuote(
        'discounts_page',
        null,
        ['boating_safety_course', 'multi_policy']
      );
      this.assert(startQuoteRes.success === true, 'Starting quote from discounts page should succeed');

      // Boat details: ZIP 98109, boat value 25,000
      const boatDetailsRes = this.logic.updateQuoteBoatDetails(
        'motorboat',
        20,
        25000,
        '98109',
        'pleasure_personal_use_only',
        2020,
        'Bayliner',
        'Element E5',
        'fiberglass'
      );
      this.assert(boatDetailsRes.success === true, 'Boat details update for discount quote should succeed');

      // Coverage options and discount eligibility step
      const coverageOptions = this.logic.getQuoteCoverageOptions();
      this.assert(coverageOptions && Array.isArray(coverageOptions.discountEligibilityOptions), 'Coverage options should include discount eligibility');

      const hasSafetyOption = coverageOptions.discountEligibilityOptions.some(
        (opt) => opt.code === 'boating_safety_course'
      );
      const hasMultiOption = coverageOptions.discountEligibilityOptions.some(
        (opt) => opt.code === 'multi_policy'
      );
      this.assert(hasSafetyOption, 'Coverage options should include boating safety course discount flag');
      this.assert(hasMultiOption, 'Coverage options should include multi-policy discount flag');

      // Apply both discounts
      const discUpdateRes = this.logic.updateQuoteDiscountEligibility({
        boating_safety_course: true,
        multi_policy: true,
        claims_free: false,
        early_quote: false,
        paid_in_full: false
      });
      this.assert(discUpdateRes.success === true, 'Applying discounts should succeed');
      this.assert(
        Array.isArray(discUpdateRes.appliedDiscountCodes),
        'Applied discount codes should be returned'
      );
      this.assert(
        discUpdateRes.appliedDiscountCodes.includes('boating_safety_course'),
        'Boating safety course discount should be applied'
      );
      this.assert(
        discUpdateRes.appliedDiscountCodes.includes('multi_policy'),
        'Multi-policy discount should be applied'
      );

      const currentLiability = coverageOptions.selectedLiabilityLimit || (
        coverageOptions.liabilityLimitOptions && coverageOptions.liabilityLimitOptions[0]
          ? coverageOptions.liabilityLimitOptions[0].value
          : null
      );
      const currentDeductible = coverageOptions.selectedDeductible || (
        coverageOptions.deductibleOptions && coverageOptions.deductibleOptions[0]
          ? coverageOptions.deductibleOptions[0].value
          : null
      );
      const policyTypeId = coverageOptions.selectedPolicyType
        ? coverageOptions.selectedPolicyType.id
        : (coverageOptions.availablePolicyTypes && coverageOptions.availablePolicyTypes[0]
          ? coverageOptions.availablePolicyTypes[0].id
          : null);

      this.assert(!!currentLiability, 'Liability should be selected for discount quote');
      this.assert(!!currentDeductible, 'Deductible should be selected for discount quote');
      this.assert(!!policyTypeId, 'Policy type should be selected for discount quote');

      const covUpdate = this.logic.updateQuoteCoverageSelections(
        currentLiability,
        currentDeductible,
        policyTypeId,
        null
      );
      this.assert(covUpdate.success === true, 'Coverage selections update for discount quote should succeed');

      // Plans
      const plansResult = this.logic.getQuotePlans('price_low_to_high');
      this.assert(plansResult && plansResult.plans && plansResult.plans.length > 0, 'Plans should be available for discount quote');
      const chosenPlan = plansResult.plans[0];

      const selectPlanRes = this.logic.selectPlanForCurrentQuote(chosenPlan.planId);
      this.assert(selectPlanRes.success === true, 'Selecting plan for discount quote should succeed');

      // Plan summary, set monthly billing
      this.logic.getSelectedPlanSummaryAndOptions();
      const billingRes = this.logic.setQuoteBillingFrequency('monthly');
      this.assert(billingRes.success === true, 'Setting billing frequency to monthly should succeed');
      this.assert(billingRes.billingFrequency === 'monthly', 'Billing frequency should be monthly');

      // Save quote with label
      const label = 'Safety + Multi-Policy Discounts';
      const saveRes = this.logic.saveCurrentQuote(label);
      this.assert(saveRes.success === true, 'Saving quote should succeed');
      this.assert(saveRes.label === label, 'Saved quote label should match input label');
      this.assert(!!saveRes.referenceNumber, 'Saved quote should have a reference number');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Use the FAQ to find the maximum boat length allowed for online quotes and start a qualifying quote
  testTask8_UseFaqMaxBoatLengthAndStartQuote() {
    const testName = 'Task 8: Use FAQ to find max boat length for online quotes and start qualifying quote';
    try {
      this.clearStorage();
      this.setupTestData();

      // Help center overview (navigation simulation)
      const helpOverview = this.logic.getHelpCenterOverview();
      this.assert(helpOverview && Array.isArray(helpOverview.topics), 'Help center overview should be available');

      // Search for maximum boat length
      const searchRes = this.logic.searchHelpArticles('maximum boat length');
      this.assert(searchRes && Array.isArray(searchRes.results), 'Help article search should return results array');

      let targetSlug = null;
      const preferredSlugs = ['boat_eligibility_for_online_quotes', 'faq_maximum_boat_length'];
      for (const slug of preferredSlugs) {
        if (searchRes.results.find((r) => r.slug === slug)) {
          targetSlug = slug;
          break;
        }
      }

      // If search results did not include the expected article, fall back to direct slug check
      if (!targetSlug) {
        for (const slug of preferredSlugs) {
          try {
            const art = this.logic.getHelpArticleBySlug(slug);
            if (art && art.slug === slug && typeof art.maxOnlineQuoteBoatLengthFeet === 'number') {
              targetSlug = slug;
              break;
            }
          } catch (e) {
            // ignore and try next
          }
        }
      }

      let maxFeet = null;
      if (targetSlug) {
        const article = this.logic.getHelpArticleBySlug(targetSlug);
        this.assert(article && article.slug === targetSlug, 'Help article for boat eligibility should be retrievable');
        if (typeof article.maxOnlineQuoteBoatLengthFeet === 'number') {
          maxFeet = article.maxOnlineQuoteBoatLengthFeet;
        }
      }

      // If article did not provide a max length, fall back to form config
      if (!maxFeet) {
        const formConfig = this.logic.getQuoteBoatDetailsFormConfig();
        this.assert(
          formConfig && typeof formConfig.maxOnlineBoatLengthFeet === 'number',
          'Form config should provide maxOnlineBoatLengthFeet as fallback'
        );
        maxFeet = formConfig.maxOnlineBoatLengthFeet;
      }

      this.assert(typeof maxFeet === 'number' && maxFeet > 1, 'Maximum boat length should be a positive number greater than 1');

      const qualifyingLength = maxFeet - 1;

      // Start new quote from homepage
      const startQuoteRes = this.logic.startNewQuote('homepage_cta', null, []);
      this.assert(startQuoteRes.success === true, 'Starting quote for FAQ-based length should succeed');

      // Enter boat details with qualifying length exactly 1 foot less than max
      const boatDetailsRes = this.logic.updateQuoteBoatDetails(
        'motorboat',
        qualifyingLength,
        25000,
        '98109',
        'pleasure_personal_use_only',
        2021,
        'Generic',
        'Model X',
        'fiberglass'
      );
      this.assert(boatDetailsRes.success === true, 'Boat details update with qualifying length should succeed');
      this.assert(
        boatDetailsRes.eligibility && boatDetailsRes.eligibility.isEligibleOnline === true,
        'Boat of qualifying length should be eligible online'
      );
      this.assert(
        boatDetailsRes.nextStep === 'coverage_options',
        'Next step after qualifying boat details should be coverage_options'
      );

      // Confirm we can reach coverage options page
      const coverageOptions = this.logic.getQuoteCoverageOptions();
      this.assert(coverageOptions && coverageOptions.quoteNumber, 'Coverage options should load after qualifying boat details');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper methods
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
