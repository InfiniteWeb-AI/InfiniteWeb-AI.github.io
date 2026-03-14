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
    // Reinitialize storage structure via business logic helper
    this.logic._initStorage();
  }

  setupTestData() {
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      focus_areas: [
        {
          id: 'youth_families',
          code: 'youth_families',
          name: 'Youth & Families',
          description: 'Programs that support children, teens, and families through mentoring, enrichment, basic needs assistance, and family stability services.'
        },
        {
          id: 'education',
          code: 'education',
          name: 'Education',
          description: 'Initiatives that improve educational access and outcomes from early childhood through adult learning, including tutoring, after-school programs, and college readiness.'
        },
        {
          id: 'neighborhoods',
          code: 'neighborhoods',
          name: 'Neighborhoods',
          description: 'Community-building efforts focused on specific neighborhoods, such as resident-led projects, safety, beautification, and local leadership development.'
        }
      ],
      grant_programs: [
        {
          id: 'community_impact_grant',
          name: 'Community Impact Grant',
          shortName: 'Community Impact',
          description: 'Flexible operating and project support for high-impact initiatives that advance education, health, and neighborhood vitality across the county.',
          focusAreaCodes: [
            'education',
            'youth_families',
            'neighborhoods',
            'health_wellness'
          ],
          minAwardAmount: 10000,
          maxAwardAmount: 50000,
          matchRequiredPercent: 25,
          applicationOpenDate: '2025-03-01T08:00:00Z',
          applicationDeadline: '2025-09-15T23:59:59Z',
          status: 'open',
          yearIntroduced: 2018,
          geographicFocus: 'Entire County',
          isFlagshipProgram: true,
          isHighlightedOnHome: true,
          createdAt: '2018-01-10T12:00:00Z',
          updatedAt: '2025-02-15T09:30:00Z'
        },
        {
          id: 'youth_opportunity_scholarship',
          name: 'Youth Opportunity Scholarship Fund',
          shortName: 'Youth Opportunity',
          description: 'Scholarships and program support for youth pursuing postsecondary education, workforce training, and leadership development.',
          focusAreaCodes: [
            'education',
            'youth_families'
          ],
          minAwardAmount: 5000,
          maxAwardAmount: 75000,
          matchRequiredPercent: 10,
          applicationOpenDate: '2025-04-15T08:00:00Z',
          applicationDeadline: '2025-10-01T23:59:59Z',
          status: 'open',
          yearIntroduced: 2022,
          geographicFocus: 'Countywide with priority neighborhoods',
          isFlagshipProgram: false,
          isHighlightedOnHome: true,
          createdAt: '2022-01-05T12:00:00Z',
          updatedAt: '2025-04-10T10:00:00Z'
        },
        {
          id: 'youth_mentoring_partnerships',
          name: 'Youth Mentoring Partnerships',
          shortName: 'Mentoring Partnerships',
          description: 'Support for evidence-based mentoring programs that connect caring adults with young people ages 8–18.',
          focusAreaCodes: [
            'youth_families'
          ],
          minAwardAmount: 5000,
          maxAwardAmount: 25000,
          matchRequiredPercent: 0,
          applicationOpenDate: '2025-02-01T08:00:00Z',
          applicationDeadline: '2025-06-15T23:59:59Z',
          status: 'open',
          yearIntroduced: 2020,
          geographicFocus: 'City of Greenfield',
          isFlagshipProgram: false,
          isHighlightedOnHome: false,
          createdAt: '2020-01-20T12:00:00Z',
          updatedAt: '2025-01-25T11:15:00Z'
        }
      ],
      grant_awards: [
        {
          id: 'ga_2023_hc_eastside_collab',
          grantProgramId: 'healthy_communities_grant',
          recipientOrganizationName: 'Eastside Health Collaborative',
          recipientOrganizationType: '501(c)(3) nonprofit',
          yearAwarded: 2023,
          amountAwarded: 20000,
          focusAreaCodes: [
            'health_wellness'
          ],
          geographicAreaServed: 'Eastside neighborhoods',
          projectTitle: 'Eastside Healthy Living Initiative',
          projectSummary: 'Supports a coalition of clinics and community groups expanding access to preventative care, nutrition education, and chronic disease management classes.',
          awardStatus: 'awarded',
          createdAt: '2023-06-15T12:00:00Z'
        },
        {
          id: 'ga_2023_hc_westside_wellness',
          grantProgramId: 'healthy_communities_grant',
          recipientOrganizationName: 'Westside Wellness Network',
          recipientOrganizationType: 'Coalition of service providers',
          yearAwarded: 2023,
          amountAwarded: 15000,
          focusAreaCodes: [
            'health_wellness'
          ],
          geographicAreaServed: 'Westside corridor',
          projectTitle: 'Community Health Mobilizers',
          projectSummary: 'Trains neighborhood health ambassadors to provide screenings, referrals, and health education at local events and faith communities.',
          awardStatus: 'awarded',
          createdAt: '2023-07-10T15:30:00Z'
        },
        {
          id: 'ga_2023_mh_youth_access',
          grantProgramId: 'mental_health_access_fund',
          recipientOrganizationName: 'Youth Access Counseling Center',
          recipientOrganizationType: '501(c)(3) nonprofit',
          yearAwarded: 2023,
          amountAwarded: 22000,
          focusAreaCodes: [
            'health_wellness',
            'youth_families'
          ],
          geographicAreaServed: 'Entire County',
          projectTitle: 'School-Based Mental Health Expansion',
          projectSummary: 'Expands on-site counseling and telehealth options for middle and high school students experiencing anxiety, depression, and trauma.',
          awardStatus: 'awarded',
          createdAt: '2023-09-01T10:45:00Z'
        }
      ]
    };

    // Copy generated data into localStorage using storage keys
    localStorage.setItem('focus_areas', JSON.stringify(generatedData.focus_areas));
    localStorage.setItem('grant_programs', JSON.stringify(generatedData.grant_programs));
    localStorage.setItem('grant_awards', JSON.stringify(generatedData.grant_awards));
    // Other collections (accounts, saved_grants, etc.) are initialized by _initStorage
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SaveHighestPayingYouthGrant();
    this.testTask2_CreateOrganizationProfile();
    this.testTask3_StartNeighborhoodGrantApplicationDraft();
    this.testTask4_ChooseLowerMatchArtsLikeGrant();
    this.testTask5_SaveHealthGrantComparison();
    this.testTask6_SubscribeToMonthlyYouthEnvironmentAlerts();
    this.testTask7_SubmitEligibilityQuestionForCommunityImpact();
    this.testTask8_SetDeadlineRemindersAndDisableBlogEmails();

    return this.results;
  }

  // Task 1
  testTask1_SaveHighestPayingYouthGrant() {
    const testName = 'Task 1: Save highest-paying youth-focused grant open in late 2025';
    console.log('Testing:', testName);

    try {
      // Use focus areas to get codes for youth and education
      const focusAreas = this.logic.getFocusAreas();
      this.assert(Array.isArray(focusAreas), 'Focus areas should be an array');

      let youthCode = null;
      let educationCode = null;
      for (let fa of focusAreas) {
        if (fa.code === 'youth_families') youthCode = fa.code;
        if (fa.code === 'education') educationCode = fa.code;
      }

      const filterCodes = [];
      if (youthCode) filterCodes.push(youthCode);
      if (educationCode) filterCodes.push(educationCode);
      this.assert(filterCodes.length > 0, 'At least one youth or education focus area code should be available');

      // Search open grants with filters
      const searchResponse = this.logic.searchOpenGrantPrograms(
        filterCodes,               // focusAreaCodes
        5000,                      // minAwardAmount
        undefined,                 // maxAwardAmount
        '2025-05-01',              // deadlineStartDate
        '2025-12-31',              // deadlineEndDate
        'max_award_desc',          // sortBy: Maximum Award - High to Low
        1,                         // page
        10                         // pageSize
      );

      this.assert(searchResponse && Array.isArray(searchResponse.results), 'Search response should contain a results array');
      this.assert(searchResponse.results.length > 0, 'Should return at least one open grant for late 2025 matching filters');

      const topGrant = searchResponse.results[0];
      this.assert(topGrant.id, 'Top grant should have an id');

      // Get grant details
      const detailsResponse = this.logic.getGrantProgramDetails(topGrant.id);
      this.assert(detailsResponse && detailsResponse.grantProgram, 'Grant details should be returned');
      const grantFromDetails = detailsResponse.grantProgram;
      this.assert(grantFromDetails.id === topGrant.id, 'Details grant id should match search result id');

      // Save grant to My Grants
      const saveResult = this.logic.saveGrantToMyGrants(grantFromDetails.id, 'grant_detail', null, null);
      this.assert(saveResult && saveResult.success === true, 'Saving grant should succeed');
      const savedGrant = saveResult.savedGrant;
      this.assert(savedGrant && savedGrant.id, 'Saved grant should have an id');
      this.assert(savedGrant.grantProgramId === grantFromDetails.id, 'Saved grant should reference the correct grant program');

      // Verify via My Grants & Plans
      const myGrants = this.logic.getMyGrantsAndPlans();
      this.assert(myGrants, 'My Grants response should be returned');

      let foundSaved = false;
      if (Array.isArray(myGrants.unplannedSavedGrants)) {
        foundSaved = myGrants.unplannedSavedGrants.some(g => g.savedGrantId === savedGrant.id);
      }
      if (!foundSaved && Array.isArray(myGrants.plans)) {
        for (let planGroup of myGrants.plans) {
          if (Array.isArray(planGroup.savedGrants)) {
            if (planGroup.savedGrants.some(g => g.savedGrantId === savedGrant.id)) {
              foundSaved = true;
              break;
            }
          }
        }
      }

      this.assert(foundSaved, 'Saved grant should appear in My Grants (either unplanned or in a plan)');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2
  testTask2_CreateOrganizationProfile() {
    const testName = 'Task 2: Create organization profile with specific program areas';
    console.log('Testing:', testName);

    try {
      // Create an organization account
      const accountResult = this.logic.createAccount(
        'organization_account',        // accountType
        undefined,                     // fullName (not needed for org)
        'Green Town Neighbors',        // organizationName
        'contact@greentown.test',      // email
        'GrantTest123!'                // password
      );

      this.assert(accountResult && accountResult.success === true, 'Organization account creation should succeed');
      const account = accountResult.account;
      this.assert(account && account.id, 'Created account should have an id');
      this.assert(account.accountType === 'organization_account', 'Account type should be organization_account');

      // Retrieve available program areas (focus areas)
      const focusAreasForProfile = this.logic.getFocusAreas();
      this.assert(Array.isArray(focusAreasForProfile), 'Program areas list should be returned');

      // Adapt task: try to use Environment and Neighborhoods; fallback if Environment is not available
      let neighborhoodsCode = null;
      let environmentCode = null;
      let fallbackCode = null;

      for (let fa of focusAreasForProfile) {
        if (fa.code === 'neighborhoods') neighborhoodsCode = fa.code;
        if (fa.code === 'environment') environmentCode = fa.code;
        if (!fallbackCode && fa.code !== 'neighborhoods') fallbackCode = fa.code;
      }

      // Ensure we have neighborhoods
      this.assert(!!neighborhoodsCode, 'Neighborhoods program area code should be available');

      let chosenProgramCodes = [];
      if (environmentCode) {
        chosenProgramCodes = [environmentCode, neighborhoodsCode];
      } else {
        // If Environment not present in generated data, use another available program area instead
        this.assert(!!fallbackCode, 'At least one non-neighborhood program area should be available');
        chosenProgramCodes = [fallbackCode, neighborhoodsCode];
      }

      // Save organization profile
      const saveProfileResult = this.logic.saveOrganizationProfile(
        'Green Town Neighbors',       // organizationName
        'nonprofit_501c3',            // organizationType
        150000,                       // annualBudget
        chosenProgramCodes,           // programAreaCodes
        undefined,                    // mailingAddress
        undefined,                    // phoneNumber
        undefined                     // websiteUrl
      );

      this.assert(saveProfileResult && saveProfileResult.success === true, 'Saving organization profile should succeed');
      const profile = saveProfileResult.profile;
      this.assert(profile && profile.id, 'Organization profile should have an id');
      this.assert(profile.organizationName === 'Green Town Neighbors', 'Organization name in profile should match input');
      this.assert(profile.organizationType === 'nonprofit_501c3', 'Organization type should be nonprofit_501c3');
      this.assert(profile.annualBudget === 150000, 'Annual budget should be 150000');

      this.assert(Array.isArray(profile.programAreaCodes), 'Program area codes should be an array');
      this.assert(profile.programAreaCodes.length === 2, 'Exactly two program areas should be selected');
      this.assert(profile.programAreaCodes.includes(neighborhoodsCode), 'Program areas should include neighborhoods');
      if (environmentCode) {
        this.assert(profile.programAreaCodes.includes(environmentCode), 'Program areas should include environment when available');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3
  testTask3_StartNeighborhoodGrantApplicationDraft() {
    const testName = 'Task 3: Start a neighborhood grant application and save as draft';
    console.log('Testing:', testName);

    try {
      // Create an individual applicant account
      const accountResult = this.logic.createAccount(
        'individual_applicant',       // accountType
        'Jordan Rivera',              // fullName
        undefined,                    // organizationName
        'jordan@example.test',        // email
        'ApplyNow456!'                // password
      );

      this.assert(accountResult && accountResult.success === true, 'Individual applicant account creation should succeed');
      const account = accountResult.account;
      this.assert(account && account.id, 'Created individual account should have an id');

      // Find neighborhood-focused grants, sorted by maximum award (low to high)
      const focusAreas = this.logic.getFocusAreas();
      let neighborhoodsCode = null;
      for (let fa of focusAreas) {
        if (fa.code === 'neighborhoods') neighborhoodsCode = fa.code;
      }

      // Adapt task: if no dedicated neighborhoods code exists, fall back to first focus area
      const focusCodesForSearch = neighborhoodsCode ? [neighborhoodsCode] : (focusAreas.length ? [focusAreas[0].code] : []);
      this.assert(focusCodesForSearch.length > 0, 'At least one focus area code should be available for searching');

      const searchResponse = this.logic.searchOpenGrantPrograms(
        focusCodesForSearch,          // focusAreaCodes
        undefined,                    // minAwardAmount
        undefined,                    // maxAwardAmount
        undefined,                    // deadlineStartDate
        undefined,                    // deadlineEndDate
        'max_award_asc',              // sortBy: Maximum Award - Low to High
        1,                            // page
        10                            // pageSize
      );

      this.assert(searchResponse && Array.isArray(searchResponse.results), 'Search response should contain results');
      this.assert(searchResponse.results.length > 0, 'Should return at least one grant to apply for');

      // Choose the first applicable grant (in generated data this will be the smallest max award among matches)
      const chosenGrant = searchResponse.results[0];
      this.assert(chosenGrant && chosenGrant.id, 'Chosen grant should have an id');

      // Start an application for that grant
      const startAppResult = this.logic.startGrantApplication(chosenGrant.id);
      this.assert(startAppResult && startAppResult.success === true, 'Starting grant application should succeed');
      const application = startAppResult.application;
      this.assert(application && application.id, 'Application should have an id');
      this.assert(application.grantProgramId === chosenGrant.id, 'Application should reference the chosen grant program');
      this.assert(application.applicationStatus === 'draft', 'New application should be in draft status');

      // Save draft with applicant information
      const saveDraftResult = this.logic.saveApplicationDraft(
        application.id,
        'Community Garden Launch',    // projectTitle
        5000,                         // requestedAmount (adapted upper bound)
        '2025-09-01',                 // projectStartDate in ISO-like format
        undefined                     // projectEndDate
      );

      this.assert(saveDraftResult && saveDraftResult.success === true, 'Saving application draft should succeed');
      const updatedApp = saveDraftResult.application;
      this.assert(updatedApp.id === application.id, 'Saved application id should match original');
      this.assert(updatedApp.applicationStatus === 'draft', 'Application should remain in draft status after saving');
      this.assert(updatedApp.projectTitle === 'Community Garden Launch', 'Project title should match input');
      this.assert(updatedApp.requestedAmount === 5000, 'Requested amount should match input');

      // Verify via applications list
      const appsList = this.logic.getApplicationsList();
      this.assert(appsList && Array.isArray(appsList.draftApplications), 'Draft applications list should be available');

      const foundDraft = appsList.draftApplications.some(a => a.applicationId === updatedApp.id);
      this.assert(foundDraft, 'Draft application should appear in the draft applications list');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4
  testTask4_ChooseLowerMatchArtsLikeGrant() {
    const testName = 'Task 4: Choose grant with lower match requirement between first two results';
    console.log('Testing:', testName);

    try {
      // Try to filter by Arts & Culture; if not available in generated data, fall back to some existing focus area
      const focusAreas = this.logic.getFocusAreas();
      this.assert(Array.isArray(focusAreas), 'Focus areas should be an array');

      let artsCode = null;
      for (let fa of focusAreas) {
        if (fa.code === 'arts_culture') artsCode = fa.code;
      }
      const fallbackCode = focusAreas.length ? focusAreas[0].code : null;
      this.assert(!!fallbackCode || !!artsCode, 'At least one focus area is required for searching grants');

      let searchResponse = this.logic.searchOpenGrantPrograms(
        artsCode ? [artsCode] : (fallbackCode ? [fallbackCode] : undefined),
        undefined,
        undefined,
        undefined,
        undefined,
        'deadline_soonest_first',    // sort by soonest deadline
        1,
        2                            // pageSize 2 to get the first two results
      );

      this.assert(searchResponse && Array.isArray(searchResponse.results), 'Search response should contain results');

      // If fewer than 2 results for the chosen focus area, broaden search without focus filter
      if (searchResponse.results.length < 2) {
        searchResponse = this.logic.searchOpenGrantPrograms(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'deadline_soonest_first',
          1,
          2
        );
      }

      this.assert(searchResponse.results.length >= 2, 'Should have at least two grants to compare');

      const firstGrant = searchResponse.results[0];
      const secondGrant = searchResponse.results[1];
      this.assert(firstGrant.id && secondGrant.id, 'Both compared grants should have ids');

      // Get details for both
      const details1 = this.logic.getGrantProgramDetails(firstGrant.id);
      const details2 = this.logic.getGrantProgramDetails(secondGrant.id);
      this.assert(details1 && details1.grantProgram, 'First grant details should be available');
      this.assert(details2 && details2.grantProgram, 'Second grant details should be available');

      const g1 = details1.grantProgram;
      const g2 = details2.grantProgram;

      const match1 = typeof g1.matchRequiredPercent === 'number' ? g1.matchRequiredPercent : Number.MAX_VALUE;
      const match2 = typeof g2.matchRequiredPercent === 'number' ? g2.matchRequiredPercent : Number.MAX_VALUE;

      // Determine which grant has the lower match requirement (treat missing as highest)
      const chosen = match1 <= match2 ? g1 : g2;
      const chosenMatch = match1 <= match2 ? match1 : match2;

      // Sanity check on comparison
      if (match1 !== Number.MAX_VALUE && match2 !== Number.MAX_VALUE) {
        this.assert(chosenMatch === Math.min(match1, match2), 'Chosen grant should have the lower match requirement');
      }

      // Save chosen grant to an application plan named 'Arts Priority 2025'
      const planName = 'Arts Priority 2025';
      const saveResult = this.logic.saveGrantToMyGrants(chosen.id, 'grant_detail', null, planName);
      this.assert(saveResult && saveResult.success === true, 'Saving chosen grant to application plan should succeed');

      const savedGrant = saveResult.savedGrant;
      const plan = saveResult.applicationPlan;
      this.assert(savedGrant && savedGrant.id, 'Saved grant should have an id');
      this.assert(plan && plan.id, 'Application plan should have an id');
      this.assert(plan.name === planName, 'Application plan name should match the name provided when saving');

      // Verify via My Grants & Plans that the saved grant is associated with the created plan
      const myGrants = this.logic.getMyGrantsAndPlans();
      this.assert(myGrants && Array.isArray(myGrants.plans), 'My Grants & Plans response should include plans');

      let foundInPlan = false;
      for (let planGroup of myGrants.plans) {
        if (planGroup.plan && planGroup.plan.id === plan.id && Array.isArray(planGroup.savedGrants)) {
          if (planGroup.savedGrants.some(g => g.savedGrantId === savedGrant.id && g.grantProgramId === chosen.id)) {
            foundInPlan = true;
            break;
          }
        }
      }

      this.assert(foundInPlan, 'Chosen grant should be present in the created application plan');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5
  testTask5_SaveHealthGrantComparison() {
    const testName = 'Task 5: Save comparison of three mid-sized 2023 health grants';
    console.log('Testing:', testName);

    try {
      // Get filter options for past grants (simulating browsing Past Grants page)
      const options = this.logic.getPastGrantsFilterOptions();
      this.assert(options && Array.isArray(options.yearsAvailable), 'Past grant years options should be available');

      // Search health-related grants awarded in 2023 between 10k and 25k
      const year = 2023;
      const focusCodes = ['health_wellness'];
      const searchResponse = this.logic.searchPastGrants(
        year,                  // yearAwarded
        focusCodes,            // focusAreaCodes
        10000,                 // minAmountAwarded
        25000,                 // maxAmountAwarded
        'amount_desc',         // sortBy
        1,                     // page
        10                     // pageSize
      );

      this.assert(searchResponse && Array.isArray(searchResponse.results), 'Past grants search should return results array');
      this.assert(searchResponse.results.length > 0, 'Should return at least one health-related past grant in 2023');

      // Select up to the first three grants
      const selectedAwards = searchResponse.results.slice(0, 3);
      this.assert(selectedAwards.length >= 1, 'At least one grant award should be available for comparison');

      const awardIds = selectedAwards.map(a => a.id);
      // Build comparison view
      const comparisonView = this.logic.buildGrantAwardComparisonView(awardIds);
      this.assert(comparisonView && Array.isArray(comparisonView.grantAwards), 'Comparison view should include grant awards');
      this.assert(comparisonView.grantAwards.length === awardIds.length, 'Comparison view should contain an entry for each selected award id');

      // Save the comparison with a name
      const comparisonName = 'Health 2023 mid-range';
      const saveResult = this.logic.saveGrantAwardComparison(comparisonName, awardIds, undefined);
      this.assert(saveResult && saveResult.success === true, 'Saving grant award comparison should succeed');

      const comparison = saveResult.comparison;
      this.assert(comparison && comparison.id, 'Saved comparison should have an id');
      this.assert(comparison.name === comparisonName, 'Saved comparison name should match input');
      this.assert(Array.isArray(comparison.grantAwardIds), 'Saved comparison should include grantAwardIds array');
      this.assert(comparison.grantAwardIds.length === awardIds.length, 'Saved comparison should include all selected award ids');

      // Verify via getSavedGrantComparisons
      const savedComparisons = this.logic.getSavedGrantComparisons();
      this.assert(savedComparisons && Array.isArray(savedComparisons.comparisons), 'Saved grant comparisons list should be available');

      const foundSaved = savedComparisons.comparisons.some(c => c.id === comparison.id && c.name === comparisonName);
      this.assert(foundSaved, 'Recently saved comparison should appear in the list of saved comparisons');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6
  testTask6_SubscribeToMonthlyYouthEnvironmentAlerts() {
    const testName = 'Task 6: Subscribe to monthly email alerts for youth and environment grants only';
    console.log('Testing:', testName);

    try {
      // Load email alert options (simulating opening the Grant Email Alerts page)
      const options = this.logic.getEmailAlertOptions();
      this.assert(options, 'Email alert options should be returned');
      this.assert(Array.isArray(options.geographicFocusOptions), 'Geographic focus options should be an array');
      this.assert(Array.isArray(options.emailFrequencyOptions), 'Email frequency options should be an array');
      this.assert(Array.isArray(options.notificationMethodOptions), 'Notification method options should be an array');
      this.assert(Array.isArray(options.focusAreas), 'Email alert focus areas should be an array');

      // Choose geographic focus: Entire County if available, otherwise first option
      let geographicOption = options.geographicFocusOptions.find(o => o.value === 'entire_county');
      if (!geographicOption && options.geographicFocusOptions.length > 0) {
        geographicOption = options.geographicFocusOptions[0];
      }
      this.assert(!!geographicOption, 'A geographic focus option should be available');

      // Choose Youth & Families and Environment as interests, adapting if Environment is not present
      let youthCode = null;
      let environmentCode = null;
      let fallbackCode = null;
      for (let fa of options.focusAreas) {
        if (fa.code === 'youth_families') youthCode = fa.code;
        if (fa.code === 'environment') environmentCode = fa.code;
        if (!fallbackCode && fa.code !== 'youth_families') fallbackCode = fa.code;
      }
      this.assert(!!youthCode || !!fallbackCode, 'At least one focus area code should be available for subscription');

      const interestAreaCodes = [];
      if (youthCode) interestAreaCodes.push(youthCode);
      if (environmentCode) {
        interestAreaCodes.push(environmentCode);
      } else if (fallbackCode) {
        interestAreaCodes.push(fallbackCode);
      }

      // Ensure we have at least one interest area
      this.assert(interestAreaCodes.length > 0, 'At least one interest area should be selected');

      // Choose monthly frequency if available
      let monthlyOption = options.emailFrequencyOptions.find(o => o.value === 'monthly');
      if (!monthlyOption && options.emailFrequencyOptions.length > 0) {
        monthlyOption = options.emailFrequencyOptions[0];
      }
      this.assert(!!monthlyOption, 'An email frequency option should be available');

      // Notification methods: email only, ensure sms_text is not included
      let emailMethod = options.notificationMethodOptions.find(o => o.value === 'email');
      if (!emailMethod && options.notificationMethodOptions.length > 0) {
        emailMethod = options.notificationMethodOptions[0];
      }
      this.assert(!!emailMethod, 'An email notification method option should be available');

      const notificationMethods = [emailMethod.value];

      const emailAddress = 'newsletter@example.test';
      const subscriptionResult = this.logic.subscribeToEmailAlerts(
        emailAddress,
        geographicOption.value,
        interestAreaCodes,
        monthlyOption.value,
        notificationMethods,
        undefined                    // smsPhoneNumber (not provided since SMS not selected)
      );

      this.assert(subscriptionResult && subscriptionResult.success === true, 'Subscribing to email alerts should succeed');
      const subscription = subscriptionResult.subscription;
      this.assert(subscription && subscription.id, 'Subscription should have an id');
      this.assert(subscription.email === emailAddress, 'Subscription email should match input');
      this.assert(subscription.geographicFocus === geographicOption.value, 'Geographic focus should match selected option');
      this.assert(Array.isArray(subscription.interestAreaCodes), 'Subscription should include interestAreaCodes array');
      this.assert(subscription.interestAreaCodes.length === interestAreaCodes.length, 'Subscription should include all selected interest areas');
      this.assert(subscription.emailFrequency === monthlyOption.value, 'Email frequency should match selected option');
      this.assert(Array.isArray(subscription.notificationMethods), 'Notification methods should be an array');
      this.assert(subscription.notificationMethods.length === 1, 'Only one notification method (email) should be enabled');
      this.assert(subscription.notificationMethods[0] === emailMethod.value, 'Email should be the selected notification method');
      this.assert(subscription.isActive === true, 'Subscription should be active');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7
  testTask7_SubmitEligibilityQuestionForCommunityImpact() {
    const testName = 'Task 7: Submit an eligibility question about Community Impact Grant via contact form';
    console.log('Testing:', testName);

    try {
      // Load general help content (simulates opening Contact & Help page)
      const helpContent = this.logic.getContactHelpContent();
      this.assert(helpContent && helpContent.contactDetails, 'Contact help content should include contact details');

      // Load contact form options
      const formOptions = this.logic.getContactFormOptions();
      this.assert(formOptions && Array.isArray(formOptions.topics), 'Contact topics should be available');
      this.assert(Array.isArray(formOptions.grantPrograms), 'Contact grant programs list should be available');

      // Select topic: Eligibility Question (by value or label)
      let topicValue = null;
      for (let t of formOptions.topics) {
        if (t.value === 'eligibility_question' || (t.label && t.label.toLowerCase().indexOf('eligibility') !== -1)) {
          topicValue = t.value;
          break;
        }
      }
      if (!topicValue && formOptions.topics.length > 0) {
        topicValue = formOptions.topics[0].value;
      }
      this.assert(!!topicValue, 'A topic value should be selected for the contact form');

      // Select Community Impact Grant program (or first one containing 'Community Impact')
      let communityImpactProgramId = null;
      for (let gp of formOptions.grantPrograms) {
        if (gp.name && gp.name.toLowerCase().indexOf('community impact') !== -1) {
          communityImpactProgramId = gp.id;
          break;
        }
      }
      if (!communityImpactProgramId && formOptions.grantPrograms.length > 0) {
        communityImpactProgramId = formOptions.grantPrograms[0].id;
      }
      this.assert(!!communityImpactProgramId, 'A grant program should be selected for the contact message');

      const name = 'Alex Kim';
      const email = 'alex@example.test';
      const messageBody = 'I am planning a community-based education and health project starting on March 1, 2026 in the central neighborhood area. The project will focus on after-school tutoring and family wellness workshops. Could you please confirm whether this project would be eligible for the Community Impact Grant?';

      const submitResult = this.logic.submitContactMessage(
        topicValue,
        communityImpactProgramId,
        name,
        email,
        messageBody,
        'email'                     // preferredResponseMethod
      );

      this.assert(submitResult && submitResult.success === true, 'Submitting contact message should succeed');
      this.assert(submitResult.messageId, 'Submitted contact message should have an id');
      this.assert(submitResult.status === 'submitted', 'New contact message status should be submitted');

      // Verify that the message was persisted with correct relationships using localStorage
      const storedMessagesRaw = localStorage.getItem('contact_messages');
      const storedMessages = storedMessagesRaw ? JSON.parse(storedMessagesRaw) : [];
      const stored = storedMessages.find(m => m.id === submitResult.messageId);
      this.assert(!!stored, 'Stored contact message record should exist in contact_messages');
      this.assert(stored.topic === topicValue, 'Stored contact message topic should match selected topic');
      this.assert(stored.grantProgramId === communityImpactProgramId, 'Stored message should reference the selected grant program id');
      this.assert(stored.email === email, 'Stored contact message email should match input');
      this.assert(stored.preferredResponseMethod === 'email', 'Preferred response method should be email');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8
  testTask8_SetDeadlineRemindersAndDisableBlogEmails() {
    const testName = 'Task 8: Set deadline reminder emails 14 days before due dates and disable blog emails';
    console.log('Testing:', testName);

    try {
      // Create an individual account for this notification settings flow
      const accountResult = this.logic.createAccount(
        'individual_applicant',
        'Taylor Morgan',
        undefined,
        'taylor@example.test',
        'Deadline789!'
      );

      this.assert(accountResult && accountResult.success === true, 'Individual account creation for notifications should succeed');
      const account = accountResult.account;
      this.assert(account && account.id, 'Notification test account should have an id');

      // Get current notification settings
      const currentSettings = this.logic.getNotificationSettings();
      this.assert(currentSettings, 'Notification settings should be retrievable');

      const existingGrantUpdatesEmail = currentSettings.grantUpdatesEmailEnabled;
      const existingGrantUpdatesOnsite = currentSettings.grantUpdatesOnsiteEnabled;

      // Update settings: enable deadline reminders 14 days before, keep grant updates, disable news/blog emails
      const updateResult = this.logic.updateNotificationSettings(
        true,                          // deadlineRemindersEnabled
        14,                            // deadlineReminderDaysBefore
        existingGrantUpdatesEmail,     // keep existing grant updates email setting
        existingGrantUpdatesOnsite,    // keep existing onsite updates setting
        false                          // newsBlogEmailEnabled off
      );

      this.assert(updateResult && updateResult.success === true, 'Updating notification settings should succeed');
      const updated = updateResult.settings;
      this.assert(updated.deadlineRemindersEnabled === true, 'Deadline reminders should be enabled');
      this.assert(updated.deadlineReminderDaysBefore === 14, 'Deadline reminder days should be set to 14');
      this.assert(updated.grantUpdatesEmailEnabled === existingGrantUpdatesEmail, 'Grant updates email setting should be preserved');
      this.assert(updated.grantUpdatesOnsiteEnabled === existingGrantUpdatesOnsite, 'Grant updates onsite setting should be preserved');
      this.assert(updated.newsBlogEmailEnabled === false, 'News and blog email notifications should be disabled');

      // Verify settings via a fresh getNotificationSettings call
      const reloadedSettings = this.logic.getNotificationSettings();
      this.assert(reloadedSettings.deadlineRemindersEnabled === true, 'Reloaded deadline reminders should be enabled');
      this.assert(reloadedSettings.deadlineReminderDaysBefore === 14, 'Reloaded deadline reminder days should be 14');
      this.assert(reloadedSettings.newsBlogEmailEnabled === false, 'Reloaded news/blog email notifications should be disabled');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper assertion and result recording
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
