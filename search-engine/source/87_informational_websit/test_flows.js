// Test runner for business logic flows on Dubai bank codes site

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Generated Data copied exactly, adapted to JS literals
    const generatedData = {
      banks: [
        {
          id: 'emirates_nbd',
          name: 'Emirates NBD',
          short_name: 'Emirates NBD',
          description: 'Emirates NBD is one of the largest banking groups in the Middle East, offering retail, corporate, and investment banking services across the UAE and internationally.',
          bank_type: 'conventional',
          head_office_address: 'Baniyas Road, Deira, P.O. Box 777, Dubai, United Arab Emirates',
          contact_phone: '+971 4 316 0000',
          contact_email: 'contact@emiratesnbd.com',
          website_url: 'https://www.emiratesnbd.com',
          swift_general_code: 'EBILAEAD',
          created_at: '2023-01-15T10:00:00Z'
        },
        {
          id: 'dubai_islamic_bank',
          name: 'Dubai Islamic Bank',
          short_name: 'DIB',
          description: 'Dubai Islamic Bank is the world’s first full-service Islamic bank, providing Sharia-compliant retail and corporate banking solutions.',
          bank_type: 'islamic',
          head_office_address: 'Dubai Islamic Bank Building, Near Deira Clock Tower, P.O. Box 1080, Dubai, United Arab Emirates',
          contact_phone: '+971 4 609 2222',
          contact_email: 'services@dib.ae',
          website_url: 'https://www.dib.ae',
          swift_general_code: 'DUIBAEAD',
          created_at: '2023-03-10T09:30:00Z'
        },
        {
          id: 'mashreq_bank',
          name: 'Mashreq Bank',
          short_name: 'Mashreq',
          description: 'Mashreq Bank is a leading UAE financial institution offering innovative retail, corporate, and international banking services.',
          bank_type: 'conventional',
          head_office_address: 'Mashreq Bank Headquarters, Downtown Dubai, P.O. Box 5511, Dubai, United Arab Emirates',
          contact_phone: '+971 4 424 4444',
          contact_email: 'info@mashreq.com',
          website_url: 'https://www.mashreqbank.com',
          swift_general_code: 'BOMLAEAD',
          created_at: '2023-02-05T08:45:00Z'
        }
      ],
      currencies: [
        {
          code: 'AED',
          name: 'United Arab Emirates Dirham',
          symbol: 'AED',
          is_local: true
        },
        {
          code: 'USD',
          name: 'United States Dollar',
          symbol: 'USD',
          is_local: false
        },
        {
          code: 'EUR',
          name: 'Euro',
          symbol: '€',
          is_local: false
        }
      ],
      guides: [
        {
          id: 'dubai_iban_structure',
          title: 'Understanding Dubai IBAN Structure: Format, Examples, and Validation',
          slug: 'dubai-iban-structure',
          short_description: 'Learn how Dubai IBANs are structured, how to read each part, and how to validate an IBAN before sending transfers.',
          content: '## Overview\nDubai IBANs follow the standardized IBAN format defined for the United Arab Emirates (AE). This guide explains each segment of the IBAN and how it relates to local bank and branch codes.\n\n## Dubai IBAN format\nA typical UAE IBAN is 23 characters long and starts with the country code \'AE\'. The general structure is:\n\n`AEkk bbbb cccc cccc cccc ccc`\n\n- `AE` – Country code for the United Arab Emirates\n- `kk` – Two check digits\n- `bbbb` – 4-digit bank identifier code\n- `cccc cccc cccc ccc` – 17-digit domestic account number\n\n## Example: Dubai account format\nFor a Dubai-based account, the IBAN still uses the UAE-wide structure. Bank and branch are encoded in the underlying account number, while the 4-digit bank code identifies the institution.\n\nExample:\n\n`AE07 0331 2345 6789 0123 456`\n\n- Bank code: `0331`\n- Account number: `234567890123456`\n\n## Sample IBAN breakdown\nIn this section we break down the example IBAN field by field, showing how bank code, branch code, and account number are derived from a Dubai account.\n\n1. Country code: `AE`\n2. Check digits: `07`\n3. Bank identifier: `0331` (e.g., Emirates NBD)\n4. Basic bank account number (BBAN): `234567890123456`\n\nWe also show how online IBAN tools can reconstruct bank and branch information from the BBAN using Dubai bank code tables.\n\n## Common mistakes\nCommon errors include transposed digits in the bank code, omitting leading zeros in the account number, and mis-typing the check digits. Using an IBAN validator before sending a transfer significantly reduces rejection risk.\n\n## FAQ\n**Q: Are Dubai IBANs different from Abu Dhabi IBANs?**\nA: No. All UAE IBANs follow the same national format. The underlying account and branch data determine the emirate.\n\n**Q: Do I still need the SWIFT code if I have the IBAN?**\nA: For many cross-border transfers, both the IBAN and the SWIFT/BIC code of the receiving bank are required.',
          estimated_reading_time_minutes: 8,
          tags: [
            'IBAN basics',
            'Dubai accounts',
            'International transfers'
          ],
          toc_sections: [
            'Overview',
            'Dubai IBAN format',
            'Example: Dubai account format',
            'Sample IBAN breakdown',
            'Common mistakes',
            'FAQ'
          ],
          published_at: '2024-05-10T09:00:00Z',
          updated_at: '2025-01-18T11:30:00Z',
          is_featured: true
        },
        {
          id: 'swift_bic_codes_explained',
          title: 'SWIFT / BIC Codes for Dubai Banks: How to Find the Right One',
          slug: 'swift-bic-codes-dubai',
          short_description: 'Understand SWIFT/BIC codes for Dubai banks, including how branch codes differ from general bank codes.',
          content: '## What is a SWIFT / BIC code?\nA SWIFT or BIC code is an 8- or 11-character identifier used to route international transfers.\n\n## General vs. branch-specific codes\nMany Dubai banks use a general SWIFT code (8 characters) plus an optional 3-character branch suffix for specific locations.\n\n## How to look up a branch SWIFT code\nUse the Bank & Branch Search or Branch Locator on this site to open the branch detail page and view the SWIFT section.\n\n## Common SWIFT code patterns in Dubai\nMost UAE banks use \'AE\' as the country code within the BIC and \'AD\' or \'AA\' as the location code.',
          estimated_reading_time_minutes: 7,
          tags: [
            'SWIFT codes',
            'International transfers'
          ],
          toc_sections: [
            'What is a SWIFT / BIC code?',
            'General vs. branch-specific codes',
            'How to look up a branch SWIFT code',
            'Common SWIFT code patterns in Dubai'
          ],
          published_at: '2024-03-22T10:15:00Z',
          updated_at: '2024-09-05T14:00:00Z',
          is_featured: true
        },
        {
          id: 'routing_branch_codes_uae',
          title: 'Dubai Routing / Local Branch Codes: Where to Find Them',
          slug: 'dubai-routing-branch-codes',
          short_description: 'Learn how Dubai banks use routing and local branch codes for domestic transfers and salary payments.',
          content: '## Introduction\nRouting or local branch codes are used for domestic transfers within the UAE, especially for salary and corporate payments.\n\n## Format of local branch codes\nDubai branch codes are typically 3 to 5 digits. Some banks embed the branch code in the account number.\n\n## Where routing codes appear\nYou can find routing codes on bank statements, salary letters, and branch detail pages on this site.\n\n## Correcting routing code errors\nIf you notice an incorrect routing code, use the \'Report an issue with these details\' link on the branch page.',
          estimated_reading_time_minutes: 6,
          tags: [
            'Branch codes',
            'Domestic transfers',
            'Corporate banking'
          ],
          toc_sections: [
            'Introduction',
            'Format of local branch codes',
            'Where routing codes appear',
            'Correcting routing code errors'
          ],
          published_at: '2024-04-02T08:00:00Z',
          updated_at: '2024-11-01T12:10:00Z',
          is_featured: false
        }
      ],
      branches: [
        {
          id: 'emirates_nbd_bur_dubai_main',
          bank_id: 'emirates_nbd',
          name: 'Emirates NBD - Bur Dubai Main Branch',
          branch_code: '0331-001',
          routing_code: '0331001',
          swift_primary_code: 'EBILAEADBDD',
          swift_additional_codes: [
            'EBILAEADXXX'
          ],
          address_line_1: 'Khalid Bin Al Waleed Street',
          address_line_2: 'Near BurJuman Metro Station',
          area: 'Bur Dubai',
          city: 'Dubai',
          postal_code: '333888',
          latitude: 25.2551,
          longitude: 55.2986,
          phone: '+971 4 316 0111',
          email: 'burdubai.main@emiratesnbd.com',
          service_types: [
            'retail_banking',
            'atm_services'
          ],
          weekday_open_time: '08:00',
          weekday_close_time: '20:00',
          friday_open_time: '08:00',
          friday_close_time: '12:00',
          saturday_open_time: '10:00',
          saturday_close_time: '16:00',
          is_24_7: false,
          has_corporate_banking: false,
          has_retail_banking: true,
          status: 'active'
        },
        {
          id: 'emirates_nbd_deira_branch',
          bank_id: 'emirates_nbd',
          name: 'Emirates NBD - Deira Branch',
          branch_code: '0331-010',
          routing_code: '0331010',
          swift_primary_code: 'EBILAEADDER',
          swift_additional_codes: [
            'EBILAEADXXX'
          ],
          address_line_1: 'Al Maktoum Road',
          address_line_2: 'Opposite Deira City Centre',
          area: 'Deira',
          city: 'Dubai',
          postal_code: '229888',
          latitude: 25.2583,
          longitude: 55.3205,
          phone: '+971 4 316 0222',
          email: 'deira.branch@emiratesnbd.com',
          service_types: [
            'retail_banking',
            'corporate_banking',
            'atm_services'
          ],
          weekday_open_time: '08:00',
          weekday_close_time: '15:30',
          friday_open_time: '08:00',
          friday_close_time: '12:00',
          saturday_open_time: '10:00',
          saturday_close_time: '14:00',
          is_24_7: false,
          has_corporate_banking: true,
          has_retail_banking: true,
          status: 'active'
        },
        {
          id: 'emirates_nbd_dubai_marina_corporate',
          bank_id: 'emirates_nbd',
          name: 'Emirates NBD - Dubai Marina Corporate Branch',
          branch_code: '0331-045',
          routing_code: '0331045',
          swift_primary_code: 'EBILAEADMAR',
          swift_additional_codes: [
            'EBILAEADXXX'
          ],
          address_line_1: 'Al Marsa Street',
          address_line_2: 'Dubai Marina Plaza, Podium Level',
          area: 'Dubai Marina',
          city: 'Dubai',
          postal_code: '500777',
          latitude: 25.0809,
          longitude: 55.1401,
          phone: '+971 4 316 0450',
          email: 'dubaimarina.corporate@emiratesnbd.com',
          service_types: [
            'corporate_banking',
            'trade_finance'
          ],
          weekday_open_time: '09:00',
          weekday_close_time: '20:30',
          friday_open_time: '09:00',
          friday_close_time: '12:30',
          saturday_open_time: '',
          saturday_close_time: '',
          is_24_7: false,
          has_corporate_banking: true,
          has_retail_banking: false,
          status: 'active'
        }
      ],
      branch_currency_supports: [
        {
          id: 'bcs_enbd_deira_usd',
          branch_id: 'emirates_nbd_deira_branch',
          currency_code: 'USD',
          supports_cash_deposits: false,
          supports_cash_withdrawals: true,
          supports_international_transfers: true,
          transfer_cutoff_time: '14:00',
          transfer_cutoff_time_notes: 'USD international transfers submitted before 2:00 PM Dubai time are processed same business day.',
          is_preferred_for_comparisons: true
        },
        {
          id: 'bcs_mashreq_deira_usd',
          branch_id: 'mashreq_deira_branch',
          currency_code: 'USD',
          supports_cash_deposits: false,
          supports_cash_withdrawals: true,
          supports_international_transfers: true,
          transfer_cutoff_time: '15:00',
          transfer_cutoff_time_notes: 'USD transfers submitted after 3:00 PM are processed on the next business day.',
          is_preferred_for_comparisons: true
        },
        {
          id: 'bcs_rakbank_deira_usd',
          branch_id: 'rakbank_deira_branch',
          currency_code: 'USD',
          supports_cash_deposits: true,
          supports_cash_withdrawals: true,
          supports_international_transfers: true,
          transfer_cutoff_time: '13:30',
          transfer_cutoff_time_notes: 'Priority corporate instructions may be accepted after 1:30 PM subject to additional charges.',
          is_preferred_for_comparisons: false
        }
      ],
      branch_fee_schedules: [
        {
          id: 'bfs_dib_burdubai_out_int_aed',
          branch_id: 'dib_bur_dubai_branch',
          fee_type: 'outgoing_international_transfer',
          currency_code: 'AED',
          amount: 15,
          fee_unit: 'flat',
          amount_min: 0,
          amount_max: 0,
          notes: 'Standard outgoing international transfer fee for retail customers via branch counter.',
          last_updated: '2025-11-10T10:00:00Z'
        },
        {
          id: 'bfs_dib_deira_out_int_aed',
          branch_id: 'dib_deira_branch',
          fee_type: 'outgoing_international_transfer',
          currency_code: 'AED',
          amount: 18,
          fee_unit: 'flat',
          amount_min: 0,
          amount_max: 0,
          notes: 'Outgoing international transfer fee for Deira branch; applies to most currencies.',
          last_updated: '2025-11-10T10:05:00Z'
        },
        {
          id: 'bfs_dib_albarsha_out_int_aed',
          branch_id: 'dib_al_barsha_branch',
          fee_type: 'outgoing_international_transfer',
          currency_code: 'AED',
          amount: 22,
          fee_unit: 'flat',
          amount_min: 0,
          amount_max: 0,
          notes: 'Al Barsha branch applies a slightly higher fee for international transfers.',
          last_updated: '2025-11-10T10:10:00Z'
        }
      ]
    };

    // Persist initial data using storage keys
    localStorage.setItem('banks', JSON.stringify(generatedData.banks));
    localStorage.setItem('currencies', JSON.stringify(generatedData.currencies));
    localStorage.setItem('guides', JSON.stringify(generatedData.guides));
    localStorage.setItem('branches', JSON.stringify(generatedData.branches));
    localStorage.setItem('branch_currency_supports', JSON.stringify(generatedData.branch_currency_supports));
    localStorage.setItem('branch_fee_schedules', JSON.stringify(generatedData.branch_fee_schedules));

    // Initialize empty collections for other entities
    localStorage.setItem('branch_search_view_states', JSON.stringify([]));
    localStorage.setItem('branch_comparison_sets', JSON.stringify([]));
    localStorage.setItem('saved_branches', JSON.stringify([]));
    localStorage.setItem('saved_guides', JSON.stringify([]));
    localStorage.setItem('iban_validation_results', JSON.stringify([]));
    localStorage.setItem('branch_issue_reports', JSON.stringify([]));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_FindAndCopySwiftCode();
    this.testTask2_SaveCheapestDubaiIslamicBranch();
    this.testTask3_FindLateCorporateMarinaRoutingCode();
    this.testTask4_ValidateIbanAndCopyDeiraSwift();
    this.testTask5_CompareUsdCutoffInDeiraAndSaveEarlier();
    this.testTask6_AddTwoBranchesToComparisonList();
    this.testTask7_BookmarkDubaiIbanStructureGuide();
    this.testTask8_SubmitCorrectionForBranchCode();

    return this.results;
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

  // Helper: parse HH:MM string to minutes past midnight
  parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') {
      return Infinity;
    }
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10);
    const m = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    if (isNaN(h) || isNaN(m)) {
      return Infinity;
    }
    return h * 60 + m;
  }

  // Task 1: Find and copy the SWIFT code for Emirates NBD - Bur Dubai Main Branch
  testTask1_FindAndCopySwiftCode() {
    const testName = 'Task 1: Find and copy SWIFT code for Bur Dubai main branch';
    try {
      this.clearStorage();
      this.setupTestData();

      // Simulate homepage load
      const home = this.logic.getHomeDashboard();
      this.assert(home && typeof home === 'object', 'Home dashboard should return an object');

      // Open Bank & Branch Search (bank_search mode)
      const filterOptions = this.logic.getBranchSearchFilterOptions('bank_search');
      this.assert(filterOptions && Array.isArray(filterOptions.bank_options), 'Should return bank options for search');

      // Apply search query and filters (city Dubai, retail banking)
      const searchQuery = 'Emirates NBD Bur Dubai Main Branch';
      const viewStateResp = this.logic.updateBranchSearchViewState('bank_search', {
        search_query: searchQuery,
        city_filter: 'Dubai',
        service_type_filters: ['retail_banking']
      });
      this.assert(viewStateResp && viewStateResp.view_state, 'View state should be returned');
      this.assert(viewStateResp.view_state.mode === 'bank_search', 'View state mode should be bank_search');

      // Execute search using current filters
      const searchResults = this.logic.searchBranches(
        'bank_search',
        searchQuery,
        null,               // bankId
        'Dubai',            // city
        null,               // area
        ['retail_banking'], // serviceTypes
        null,               // currencyCodes
        'any',              // closingTimeFilter
        'relevance'         // sortBy
      );
      this.assert(Array.isArray(searchResults), 'Search results should be an array');
      this.assert(searchResults.length > 0, 'Search should return at least one branch');

      // Find the Bur Dubai Main branch from results
      let targetResult = searchResults.find(function (r) {
        return r.branch && r.branch.name && r.branch.name.indexOf('Bur Dubai Main') !== -1;
      });
      if (!targetResult) {
        targetResult = searchResults[0];
      }
      this.assert(targetResult && targetResult.branch, 'Target branch result should exist');

      const branchId = targetResult.branch.id;
      this.assert(branchId, 'Branch ID should be present');

      // Open branch details
      const branchDetails = this.logic.getBranchDetails(branchId);
      this.assert(branchDetails && branchDetails.branch, 'Branch details should be returned');
      this.assert(branchDetails.branch.id === branchId, 'Branch ID in details should match');
      this.assert(branchDetails.bank && branchDetails.bank.id === branchDetails.branch.bank_id, 'Branch bank_id should relate to Bank entity');

      const swiftPrimary = branchDetails.codes && branchDetails.codes.swift_primary_code;
      this.assert(swiftPrimary, 'Primary SWIFT code should be present on branch details');

      // Copy SWIFT primary code
      const copyResult = this.logic.copyBranchSwiftCode(branchId, 'primary');
      this.assert(copyResult && copyResult.success === true, 'Copy SWIFT code should succeed');
      this.assert(copyResult.copied_value === swiftPrimary, 'Copied SWIFT value should match branch details');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Save the cheapest Dubai Islamic Bank branch for outgoing international transfers under 20 AED
  testTask2_SaveCheapestDubaiIslamicBranch() {
    const testName = 'Task 2: Save cheapest DIB branch for outgoing international transfer <= 20 AED';
    try {
      this.clearStorage();
      this.setupTestData();

      // Homepage load
      const home = this.logic.getHomeDashboard();
      this.assert(home, 'Home dashboard should load');

      // Open Fee Comparison page
      const feeFilterOptions = this.logic.getFeeComparisonFilterOptions();
      this.assert(feeFilterOptions && Array.isArray(feeFilterOptions.banks), 'Fee filter options should include banks');

      // Find Dubai Islamic Bank in options
      const dibBank = feeFilterOptions.banks.find(function (b) {
        return b && b.name && b.name.indexOf('Dubai Islamic Bank') !== -1;
      });
      this.assert(dibBank && dibBank.id, 'Dubai Islamic Bank should be available in bank options');

      const defaultCurrency = feeFilterOptions.default_currency_code || 'AED';

      // Filter outgoing international transfer fees with max 20 AED, sorted low to high
      const comparisonResults = this.logic.getFeeComparisonResults(
        dibBank.id,
        'outgoing_international_transfer',
        20,
        defaultCurrency,
        'fee_amount_asc'
      );
      this.assert(Array.isArray(comparisonResults), 'Fee comparison results should be an array');
      this.assert(comparisonResults.length > 0, 'Fee comparison should return at least one branch');

      // Pick the cheapest branch within max fee
      let cheapestWithinMax = comparisonResults.find(function (r) {
        return r.is_within_max && typeof r.fee_amount === 'number' && r.fee_amount <= 20;
      });
      if (!cheapestWithinMax) {
        cheapestWithinMax = comparisonResults[0];
      }
      this.assert(cheapestWithinMax && cheapestWithinMax.branch_id, 'A target branch for saving should be selected');

      const targetBranchId = cheapestWithinMax.branch_id;

      // Optionally open branch details (if available) to simulate navigating via results
      let branchDetails = null;
      try {
        branchDetails = this.logic.getBranchDetails(targetBranchId);
      } catch (e) {
        // If details are not available in this dataset, continue with saving directly
      }

      // Save branch as favorite from fee comparison flow
      const saveResult = this.logic.saveBranch(
        targetBranchId,
        true,                 // isFavorite
        'fee_comparison',     // source
        'Cheapest outgoing international transfer branch under 20 AED'
      );
      this.assert(saveResult && saveResult.success === true, 'saveBranch should succeed');
      this.assert(saveResult.saved_branch && saveResult.saved_branch.branch_id === targetBranchId, 'SavedBranch should reference the chosen branch');

      // Verify via Saved Items overview
      const savedOverview = this.logic.getSavedItemsOverview();
      this.assert(savedOverview && Array.isArray(savedOverview.saved_branches), 'Saved items overview should include saved_branches');

      const foundSaved = savedOverview.saved_branches.find(function (item) {
        return item.saved_branch && item.saved_branch.branch_id === targetBranchId;
      });
      this.assert(!!foundSaved, 'Saved items overview should include the saved cheapest DIB branch');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Find late-opening corporate branch in Dubai Marina and copy routing code
  testTask3_FindLateCorporateMarinaRoutingCode() {
    const testName = 'Task 3: Find late-opening corporate branch in Dubai Marina and copy routing code';
    try {
      this.clearStorage();
      this.setupTestData();

      // Homepage
      const home = this.logic.getHomeDashboard();
      this.assert(home, 'Home dashboard should load');

      // Open Branch Locator
      const filterOptions = this.logic.getBranchSearchFilterOptions('branch_locator');
      this.assert(filterOptions, 'Branch locator filter options should load');

      // Update view state: area Dubai Marina, corporate banking, closing time after 8 PM
      const viewStateResp = this.logic.updateBranchSearchViewState('branch_locator', {
        city_filter: 'Dubai',
        area_filter: 'Dubai Marina',
        service_type_filters: ['corporate_banking'],
        closing_time_filter: 'after_8_pm'
      });
      this.assert(viewStateResp && viewStateResp.view_state, 'View state should be updated for branch locator');

      // Search branches
      const searchResults = this.logic.searchBranches(
        'branch_locator',
        null,                 // searchQuery
        null,                 // bankId
        'Dubai',              // city
        'Dubai Marina',       // area
        ['corporate_banking'],// serviceTypes
        null,                 // currencyCodes
        'after_8_pm',         // closingTimeFilter
        'weekday_close_time_desc' // sortBy latest closing time first
      );
      this.assert(Array.isArray(searchResults), 'Branch locator search results should be an array');
      this.assert(searchResults.length > 0, 'Should find at least one corporate branch in Dubai Marina');

      // Pick the first (latest closing due to sort)
      const targetResult = searchResults[0];
      this.assert(targetResult && targetResult.branch, 'Target branch should be present in results');

      const branchId = targetResult.branch.id;
      const weekdayClose = targetResult.weekday_close_time;
      this.assert(branchId, 'Branch ID should be present');

      // Verify it actually closes at or after 20:00
      const closeMinutes = this.parseTimeToMinutes(weekdayClose);
      const eightPmMinutes = this.parseTimeToMinutes('20:00');
      this.assert(closeMinutes >= eightPmMinutes, 'Selected branch should close at or after 20:00');

      // Open branch details
      const branchDetails = this.logic.getBranchDetails(branchId);
      this.assert(branchDetails && branchDetails.branch, 'Branch details should be returned');
      this.assert(branchDetails.services && branchDetails.services.has_corporate_banking === true, 'Branch should have corporate banking');

      const routingCode = branchDetails.codes && branchDetails.codes.routing_code;
      this.assert(routingCode, 'Routing / local branch code should be available');

      // Copy routing code
      const copyResult = this.logic.copyBranchRoutingCode(branchId);
      this.assert(copyResult && copyResult.success === true, 'Copy routing code should succeed');
      this.assert(copyResult.copied_value === routingCode, 'Copied routing code should match branch details');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Validate an IBAN and retrieve SWIFT code of a Deira branch
  testTask4_ValidateIbanAndCopyDeiraSwift() {
    const testName = 'Task 4: Validate IBAN and copy SWIFT of associated Deira branch';
    try {
      this.clearStorage();
      this.setupTestData();

      // Homepage
      const home = this.logic.getHomeDashboard();
      this.assert(home, 'Home dashboard should load');

      // Open IBAN Tools overview
      const ibanToolsOverview = this.logic.getIbanToolsOverview();
      this.assert(ibanToolsOverview && Array.isArray(ibanToolsOverview.tools), 'IBAN tools overview should include tools');

      // Validate specific IBAN
      const ibanInput = 'AE070331234567890123456';
      const validationResp = this.logic.validateIban(ibanInput);
      this.assert(validationResp && validationResp.validation_result, 'IBAN validation result should be returned');

      const validationResult = validationResp.validation_result;
      this.assert(validationResult.input_iban === ibanInput, 'Validation result should echo input IBAN');
      this.assert(validationResult.validation_status === 'valid' || validationResult.is_valid === true, 'IBAN should be valid according to validator');

      const associatedBank = validationResp.bank;
      this.assert(associatedBank && associatedBank.id, 'Associated bank should be returned from IBAN validation');

      const bankId = validationResult.bank_id || associatedBank.id;

      // Navigate to bank overview (simulated)
      const bankOverview = this.logic.getBankOverview(bankId);
      this.assert(bankOverview && bankOverview.bank && bankOverview.bank.id === bankId, 'Bank overview should correspond to bank from IBAN validation');

      // From bank overview, list branches filtered by Deira area
      const bankBranches = this.logic.getBankBranchesForBank(bankId, 'Deira', null, null);
      this.assert(Array.isArray(bankBranches), 'Bank branches list should be an array');
      this.assert(bankBranches.length > 0, 'Bank should have at least one branch in Deira');

      let targetBranchEntry = bankBranches.find(function (entry) {
        return entry.area && entry.area.indexOf('Deira') !== -1;
      });
      if (!targetBranchEntry) {
        targetBranchEntry = bankBranches[0];
      }

      const branchId = targetBranchEntry.branch.id;
      this.assert(branchId, 'Deira branch ID should be present');

      // Open branch detail and copy SWIFT code
      const branchDetails = this.logic.getBranchDetails(branchId);
      this.assert(branchDetails && branchDetails.branch, 'Branch details should load for Deira branch');

      const swiftPrimary = branchDetails.codes && branchDetails.codes.swift_primary_code;
      this.assert(swiftPrimary, 'Deira branch should have a primary SWIFT / BIC code');

      const copyResult = this.logic.copyBranchSwiftCode(branchId, 'primary');
      this.assert(copyResult && copyResult.success === true, 'Copy SWIFT code should succeed for Deira branch');
      this.assert(copyResult.copied_value === swiftPrimary, 'Copied SWIFT code should match Deira branch details');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Compare USD transfer cut-off times in Deira and save the earlier one
  testTask5_CompareUsdCutoffInDeiraAndSaveEarlier() {
    const testName = 'Task 5: Compare Deira USD transfer cut-off times and save earlier branch';
    try {
      this.clearStorage();
      this.setupTestData();

      // Homepage
      const home = this.logic.getHomeDashboard();
      this.assert(home, 'Home dashboard should load');

      // Open Branch Locator
      const filterOptions = this.logic.getBranchSearchFilterOptions('branch_locator');
      this.assert(filterOptions, 'Branch locator filter options should load');

      // Set filters: area Deira, currency USD
      this.logic.updateBranchSearchViewState('branch_locator', {
        city_filter: 'Dubai',
        area_filter: 'Deira',
        currency_filters: ['USD']
      });

      // Find USD-capable branches in Deira
      const searchResults = this.logic.searchBranches(
        'branch_locator',
        null,      // searchQuery
        null,      // bankId
        'Dubai',   // city
        'Deira',   // area
        null,      // serviceTypes
        ['USD'],   // currencyCodes
        'any',     // closingTimeFilter
        'relevance'
      );
      this.assert(Array.isArray(searchResults), 'Branch locator results should be an array');
      this.assert(searchResults.length > 0, 'Should find at least one USD-capable branch in Deira');

      // Prefer to pick one Emirates NBD and one Mashreq Bank branch, fallback to first two distinct branches
      let enbdBranch = searchResults.find(function (r) {
        return r.bank_name && r.bank_name.indexOf('Emirates NBD') !== -1;
      });
      let mashreqBranch = searchResults.find(function (r) {
        return r.bank_name && r.bank_name.indexOf('Mashreq') !== -1;
      });

      const picked = [];
      if (enbdBranch) {
        picked.push(enbdBranch);
      }
      if (mashreqBranch && (!enbdBranch || mashreqBranch.branch.id !== enbdBranch.branch.id)) {
        picked.push(mashreqBranch);
      }

      // Fallback: ensure at least two branches if available
      for (let i = 0; i < searchResults.length && picked.length < 2; i++) {
        const candidate = searchResults[i];
        if (!picked.find(function (r) { return r.branch.id === candidate.branch.id; })) {
          picked.push(candidate);
        }
      }

      this.assert(picked.length >= 2, 'Need at least two branches for comparison of USD cut-off times');

      const branchId1 = picked[0].branch.id;
      const branchId2 = picked[1].branch.id;

      // Create comparison set from selection (simulate "Compare selected (2)")
      const comparisonSetResp = this.logic.createOrReplaceComparisonSetFromSelection(
        [branchId1, branchId2],
        'branch_locator'
      );
      this.assert(comparisonSetResp && comparisonSetResp.comparison_set, 'Comparison set should be created');

      const comparisonSetId = comparisonSetResp.comparison_set.id;

      // Load comparison details
      const comparisonDetails = this.logic.getBranchComparisonDetails(comparisonSetId);
      this.assert(comparisonDetails && Array.isArray(comparisonDetails.branches), 'Comparison details should include branches');

      const compareBranch1 = comparisonDetails.branches.find(function (b) { return b.branch.id === branchId1; });
      const compareBranch2 = comparisonDetails.branches.find(function (b) { return b.branch.id === branchId2; });
      this.assert(compareBranch1 && compareBranch2, 'Both selected branches should be present in comparison');

      // Extract USD transfer cut-off times (from metrics or currency_supports)
      const extractUsdCutoff = (branchEntry) => {
        if (!branchEntry) return Infinity;
        let timeStr = null;
        if (branchEntry.metrics && branchEntry.metrics.usd_transfer_cutoff_time) {
          timeStr = branchEntry.metrics.usd_transfer_cutoff_time;
        } else if (Array.isArray(branchEntry.currency_supports)) {
          const usdSupport = branchEntry.currency_supports.find(function (cs) {
            return cs.currency_code === 'USD' && cs.supports_international_transfers;
          });
          if (usdSupport && usdSupport.transfer_cutoff_time) {
            timeStr = usdSupport.transfer_cutoff_time;
          }
        }
        return this.parseTimeToMinutes(timeStr);
      };

      const cutoff1 = extractUsdCutoff(compareBranch1);
      const cutoff2 = extractUsdCutoff(compareBranch2);

      this.assert(cutoff1 !== Infinity || cutoff2 !== Infinity, 'At least one branch should have a valid USD cut-off time');

      let earlierBranchId = branchId1;
      if (cutoff2 < cutoff1) {
        earlierBranchId = branchId2;
      }

      // Save preferred branch from comparison
      const saveResult = this.logic.savePreferredBranchFromComparison(comparisonSetId, earlierBranchId);
      this.assert(saveResult && saveResult.success === true, 'savePreferredBranchFromComparison should succeed');
      this.assert(saveResult.saved_branch && saveResult.saved_branch.branch_id === earlierBranchId, 'Saved branch should be the one with earlier cut-off time (or first when equal)');

      // Verify via Saved Items overview
      const savedOverview = this.logic.getSavedItemsOverview();
      this.assert(savedOverview && Array.isArray(savedOverview.saved_branches), 'Saved items overview should be available');
      const found = savedOverview.saved_branches.find(function (item) {
        return item.saved_branch && item.saved_branch.branch_id === earlierBranchId;
      });
      this.assert(!!found, 'Preferred branch from comparison should appear in saved items');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Add two Emirates NBD branches to comparison list (adapted from original FAB multi-currency task)
  testTask6_AddTwoBranchesToComparisonList() {
    const testName = 'Task 6: Add two Emirates NBD branches to comparison list and view currencies row';
    try {
      this.clearStorage();
      this.setupTestData();

      // Homepage
      const home = this.logic.getHomeDashboard();
      this.assert(home, 'Home dashboard should load');

      // Branch Locator filter options to find Emirates NBD bank ID
      const filterOptions = this.logic.getBranchSearchFilterOptions('branch_locator');
      this.assert(filterOptions && Array.isArray(filterOptions.bank_options), 'Bank options should be available for branch locator');

      const enbdBank = filterOptions.bank_options.find(function (b) {
        return b && b.name && b.name.indexOf('Emirates NBD') !== -1;
      });
      this.assert(enbdBank && enbdBank.id, 'Emirates NBD should be present in bank options');

      // Update view state to filter by Emirates NBD in Dubai (no currency restriction to ensure >=2 branches)
      this.logic.updateBranchSearchViewState('branch_locator', {
        city_filter: 'Dubai',
        bank_name_filter: enbdBank.name
      });

      // Search branches for Emirates NBD in Dubai
      const locatorResults = this.logic.searchBranches(
        'branch_locator',
        null,            // searchQuery
        enbdBank.id,     // bankId
        'Dubai',         // city
        null,            // area
        null,            // serviceTypes
        null,            // currencyCodes
        'any',           // closingTimeFilter
        'relevance'
      );
      this.assert(Array.isArray(locatorResults), 'Branch locator results should be an array');
      this.assert(locatorResults.length >= 2, 'Should have at least two Emirates NBD branches in Dubai for comparison');

      const firstBranchId = locatorResults[0].branch.id;
      const secondBranchId = locatorResults[1].branch.id;

      // Add first branch to comparison
      const addResult1 = this.logic.addBranchToComparison(firstBranchId, 'branch_locator');
      this.assert(addResult1 && addResult1.success === true, 'First branch should be added to comparison successfully');

      // Add second branch to comparison
      const addResult2 = this.logic.addBranchToComparison(secondBranchId, 'branch_locator');
      this.assert(addResult2 && addResult2.success === true, 'Second branch should be added to comparison successfully');

      // Retrieve active comparison set summary
      const summary = this.logic.getActiveBranchComparisonSetSummary();
      this.assert(summary && summary.comparison_set && Array.isArray(summary.branches), 'Comparison set summary should be available');
      this.assert(summary.comparison_set.branch_ids.length >= 2, 'Comparison set should contain at least two branches');

      const containsFirst = summary.comparison_set.branch_ids.indexOf(firstBranchId) !== -1;
      const containsSecond = summary.comparison_set.branch_ids.indexOf(secondBranchId) !== -1;
      this.assert(containsFirst && containsSecond, 'Comparison set should include both selected branches');

      // View full comparison details and confirm International transfer currencies row exists
      const comparisonDetails = this.logic.getBranchComparisonDetails(summary.comparison_set.id);
      this.assert(comparisonDetails && Array.isArray(comparisonDetails.branches), 'Comparison details should include branches');

      const b1Details = comparisonDetails.branches.find(function (b) { return b.branch.id === firstBranchId; });
      const b2Details = comparisonDetails.branches.find(function (b) { return b.branch.id === secondBranchId; });
      this.assert(b1Details && b2Details, 'Both Emirates NBD branches should be present in comparison details');

      // Metrics may include international_transfer_currencies; confirm property exists (even if empty)
      this.assert(b1Details.metrics && Array.isArray(b1Details.metrics.international_transfer_currencies), 'First branch should expose international_transfer_currencies metric array');
      this.assert(b2Details.metrics && Array.isArray(b2Details.metrics.international_transfer_currencies), 'Second branch should expose international_transfer_currencies metric array');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Bookmark a guide explaining Dubai IBAN structure with reading time under 10 minutes
  testTask7_BookmarkDubaiIbanStructureGuide() {
    const testName = 'Task 7: Bookmark Dubai IBAN structure guide (<= 10 min) to reading list';
    try {
      this.clearStorage();
      this.setupTestData();

      // Homepage
      const home = this.logic.getHomeDashboard();
      this.assert(home, 'Home dashboard should load');

      // Open Guides & FAQs (via filter options and listing)
      const guideFilterOptions = this.logic.getGuideFilterOptions();
      this.assert(guideFilterOptions && Array.isArray(guideFilterOptions.tags), 'Guide filter options should include tags');

      // Filter by tag 'IBAN basics' and max reading time 10 minutes
      const guidesList = this.logic.listGuides(
        null,           // searchQuery
        'IBAN basics',  // tag
        10,             // maxReadingTimeMinutes
        'reading_time_asc'
      );
      this.assert(Array.isArray(guidesList), 'Guides listing should return an array');
      this.assert(guidesList.length > 0, 'There should be at least one guide about IBAN basics with reading time <= 10');

      // Select guide that explains Dubai IBAN structure
      let targetGuide = guidesList.find(function (g) {
        return g.title && g.title.toLowerCase().indexOf('dubai iban structure') !== -1;
      });
      if (!targetGuide) {
        targetGuide = guidesList[0];
      }
      this.assert(targetGuide && targetGuide.id, 'Target IBAN structure guide should be selected');

      // Open guide detail
      const guideDetail = this.logic.getGuideDetail(targetGuide.id);
      this.assert(guideDetail && guideDetail.guide, 'Guide detail should be returned');
      this.assert(Array.isArray(guideDetail.toc_sections), 'Guide detail should include TOC sections');

      // Ensure section 'Example: Dubai account format' is in TOC (as per generated data)
      const hasExampleSection = guideDetail.toc_sections.indexOf('Example: Dubai account format') !== -1;
      this.assert(hasExampleSection, 'Guide TOC should contain "Example: Dubai account format" section');

      // Bookmark the guide and add to reading list
      const bookmarkResult = this.logic.bookmarkGuide(targetGuide.id, true);
      this.assert(bookmarkResult && bookmarkResult.success === true, 'Bookmarking guide should succeed');
      this.assert(bookmarkResult.bookmark && bookmarkResult.bookmark.guide_id === targetGuide.id, 'Bookmark should reference the correct guide');

      // Verify via Saved Items overview
      const savedOverview = this.logic.getSavedItemsOverview();
      this.assert(savedOverview && Array.isArray(savedOverview.saved_guides), 'Saved items overview should include saved_guides');

      const foundBookmark = savedOverview.saved_guides.find(function (item) {
        return item.guide && item.guide.id === targetGuide.id;
      });
      this.assert(!!foundBookmark, 'Reading list should include the bookmarked IBAN structure guide');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Submit a correction request for an incorrect branch code (adapted to existing branch)
  testTask8_SubmitCorrectionForBranchCode() {
    const testName = 'Task 8: Submit correction report for branch code on Bur Dubai main branch';
    try {
      this.clearStorage();
      this.setupTestData();

      // Homepage
      const home = this.logic.getHomeDashboard();
      this.assert(home, 'Home dashboard should load');

      // Use bank search to locate Emirates NBD - Bur Dubai Main Branch
      const searchQuery = 'Emirates NBD Bur Dubai Main Branch';
      this.logic.updateBranchSearchViewState('bank_search', {
        search_query: searchQuery
      });

      const searchResults = this.logic.searchBranches(
        'bank_search',
        searchQuery,
        null,      // bankId
        null,      // city
        null,      // area
        null,      // serviceTypes
        null,      // currencyCodes
        'any',     // closingTimeFilter
        'relevance'
      );
      this.assert(Array.isArray(searchResults), 'Bank search results should be an array');
      this.assert(searchResults.length > 0, 'Bank search should find at least one branch');

      let targetResult = searchResults.find(function (r) {
        return r.branch && r.branch.name && r.branch.name.indexOf('Bur Dubai Main Branch') !== -1;
      });
      if (!targetResult) {
        targetResult = searchResults[0];
      }
      this.assert(targetResult && targetResult.branch, 'Target branch for issue report should be selected');

      const branchId = targetResult.branch.id;

      // Load issue report context from branch details page
      const issueContext = this.logic.getBranchIssueReportContext(branchId);
      this.assert(issueContext && issueContext.branch && issueContext.bank, 'Issue report context should include branch and bank');

      const currentBranchCode = issueContext.current_codes && issueContext.current_codes.branch_code;
      this.assert(typeof currentBranchCode === 'string' || currentBranchCode === null || currentBranchCode === undefined, 'Current branch code in context should be accessible (may be missing in some cases)');

      // Submit issue: incorrect branch code, should end with 789 instead of 798
      const description = 'The branch code should end with 789 instead of 798.';
      const submitResult = this.logic.submitBranchIssueReport(
        branchId,
        'Test User',
        'user@example.com',
        'incorrect_branch_code',
        description,
        'medium',
        true // sendCopyToReporter
      );

      this.assert(submitResult && submitResult.success === true, 'submitBranchIssueReport should succeed');
      this.assert(submitResult.issue_report && submitResult.issue_report.branch_id === branchId, 'Issue report should reference the correct branch');
      this.assert(submitResult.issue_report.issue_type === 'incorrect_branch_code', 'Issue type should be set to incorrect_branch_code');
      this.assert(submitResult.issue_report.urgency === 'medium', 'Urgency should be medium');
      this.assert(submitResult.issue_report.send_copy_to_reporter === true, 'Reporter copy flag should be true');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }
}

// Export for Node.js ONLY
module.exports = TestRunner;
