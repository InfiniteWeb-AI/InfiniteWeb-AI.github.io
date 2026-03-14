// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this._signedIn = false;
    // Clear localStorage before tests
    this.clearStorage();
    // Initialize test data
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    localStorage.clear();
    // Reinitialize storage structure
    this.logic._initStorage();
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      "billing_settings": [
        {
          "id": "user_default",
          "billing_cycle": "monthly",
          "next_charge_date": "2026-03-15T10:00:00Z",
          "current_amount": 24.99,
          "currency": "USD",
          "payment_method_summary": "Visa ending 4242",
          "last_promo_code": "WELCOME10",
          "created_at": "2025-11-10T09:00:00Z",
          "updated_at": "2026-02-20T14:30:00Z"
        }
      ],
      "channels": [
        {
          "id": "silver_screen_hd",
          "name": "Silver Screen HD",
          "logo_url": "https://1.bp.blogspot.com/-FfNUBmy4PRk/XdhLkRTPm-I/AAAAAAAAAiw/NhhDCUa95uQpg41kfVmOMAkqhKSvCpygQCEwYBhgL/s1600/c727f0d1-0bee-44d4-a561-0dafd3f0b398.jpg",
          "genre": "movies",
          "primary_language": "English",
          "rating": "tv_pg",
          "is_hd": true,
          "is_4k": false,
          "channel_number": 101,
          "description": "Blockbuster movies and classic films 24/7 in HD.",
          "is_sports": false,
          "created_at": "2025-10-01T08:00:00Z",
          "updated_at": "2026-01-15T12:00:00Z"
        },
        {
          "id": "cine_mundo_es",
          "name": "Cine Mundo ES",
          "logo_url": "https://pd12m.s3.us-west-2.amazonaws.com/images/48639a28-c00b-50af-91b9-8dffed045f9d.jpeg",
          "genre": "movies",
          "primary_language": "Spanish",
          "rating": "tv_14",
          "is_hd": true,
          "is_4k": false,
          "channel_number": 102,
          "description": "Películas taquilleras y cine independiente en español.",
          "is_sports": false,
          "created_at": "2025-10-02T08:00:00Z",
          "updated_at": "2026-01-10T11:00:00Z"
        },
        {
          "id": "global_news_en",
          "name": "Global News",
          "logo_url": "https://pd12m.s3.us-west-2.amazonaws.com/images/e20c0e13-54c1-51fb-8f6c-e12913eeef52.jpeg",
          "genre": "news",
          "primary_language": "English",
          "rating": "tv_pg",
          "is_hd": true,
          "is_4k": false,
          "channel_number": 201,
          "description": "24-hour international news coverage in English.",
          "is_sports": false,
          "created_at": "2025-09-15T07:30:00Z",
          "updated_at": "2026-02-01T09:15:00Z"
        }
      ],
      "promo_codes": [
        {
          "id": "SAVE20",
          "code": "SAVE20",
          "description": "Save 20% on eligible annual plans.",
          "discount_type": "percentage",
          "discount_value": 20,
          "applies_to_billing_cycle": "annual",
          "applicable_plan_ids": [],
          "max_uses": 1,
          "valid_from": "2025-01-01T00:00:00Z",
          "valid_to": "2027-01-01T00:00:00Z",
          "is_active": true,
          "created_at": "2024-12-15T10:00:00Z",
          "updated_at": "2025-12-31T09:00:00Z"
        },
        {
          "id": "WELCOME10",
          "code": "WELCOME10",
          "description": "10% off your first month on any plan.",
          "discount_type": "percentage",
          "discount_value": 10,
          "applies_to_billing_cycle": "monthly",
          "applicable_plan_ids": [],
          "max_uses": 1,
          "valid_from": "2024-01-01T00:00:00Z",
          "valid_to": "2027-01-01T00:00:00Z",
          "is_active": true,
          "created_at": "2023-12-20T12:00:00Z",
          "updated_at": "2025-06-10T08:30:00Z"
        },
        {
          "id": "SPORTS10",
          "code": "SPORTS10",
          "description": "Get $10 off select sports add-on bundles.",
          "discount_type": "fixed_amount",
          "discount_value": 10,
          "applies_to_billing_cycle": "both",
          "applicable_plan_ids": [],
          "max_uses": 3,
          "valid_from": "2025-06-01T00:00:00Z",
          "valid_to": "2026-12-31T23:59:59Z",
          "is_active": true,
          "created_at": "2025-05-15T09:00:00Z",
          "updated_at": "2025-11-01T11:45:00Z"
        }
      ],
      "series": [
        {
          "id": "wild_earth_4k",
          "title": "Wild Earth",
          "synopsis": "Travel across mountains, forests, and deserts to explore the wildest places on Earth in stunning 4K.",
          "genre": "documentary",
          "tags": [
            "nature",
            "wildlife",
            "landscapes",
            "4k"
          ],
          "resolution": "4k",
          "content_type": "series",
          "popularity_score": 95,
          "is_active": true,
          "created_at": "2025-09-01T10:00:00Z",
          "updated_at": "2026-02-20T12:00:00Z"
        },
        {
          "id": "planet_oceans_4k",
          "title": "Planet Oceans",
          "synopsis": "Dive into the hidden world beneath the waves with breathtaking 4K underwater cinematography.",
          "genre": "documentary",
          "tags": [
            "nature",
            "ocean",
            "wildlife",
            "4k"
          ],
          "resolution": "4k",
          "content_type": "series",
          "popularity_score": 90,
          "is_active": true,
          "created_at": "2025-09-10T10:00:00Z",
          "updated_at": "2026-02-18T11:00:00Z"
        },
        {
          "id": "forest_secrets_hd",
          "title": "Forest Secrets",
          "synopsis": "A journey into the mysterious life of ancient forests and their hidden inhabitants.",
          "genre": "documentary",
          "tags": [
            "nature",
            "forest",
            "wildlife"
          ],
          "resolution": "full_hd",
          "content_type": "series",
          "popularity_score": 82,
          "is_active": true,
          "created_at": "2025-08-15T09:30:00Z",
          "updated_at": "2026-01-25T14:20:00Z"
        }
      ],
      "episodes": [
        {
          "id": "wild_earth_s01e01",
          "series_id": "wild_earth_4k",
          "season_number": 1,
          "episode_number": 1,
          "title": "Mountains Above the Clouds",
          "synopsis": "Soar over snow-capped peaks and witness the wildlife that thrives in the planet's highest places.",
          "duration_minutes": 52,
          "playback_url": "https://stream.example.com/v1/wild_earth/s01e01",
          "release_date": "2025-09-01T10:00:00Z",
          "episode_order": 1,
          "created_at": "2025-09-01T10:00:00Z",
          "updated_at": "2026-02-20T12:00:00Z"
        },
        {
          "id": "wild_earth_s01e02",
          "series_id": "wild_earth_4k",
          "season_number": 1,
          "episode_number": 2,
          "title": "Desert Survivors",
          "synopsis": "Discover how plants and animals endure extreme heat and scarce water in the world's driest deserts.",
          "duration_minutes": 51,
          "playback_url": "https://stream.example.com/v1/wild_earth/s01e02",
          "release_date": "2025-09-08T10:00:00Z",
          "episode_order": 2,
          "created_at": "2025-09-01T10:10:00Z",
          "updated_at": "2026-02-20T12:00:00Z"
        },
        {
          "id": "wild_earth_s01e03",
          "series_id": "wild_earth_4k",
          "season_number": 1,
          "episode_number": 3,
          "title": "Frozen Frontiers",
          "synopsis": "Travel to the polar regions where ice and snow dominate, yet life finds a way to adapt.",
          "duration_minutes": 53,
          "playback_url": "https://stream.example.com/v1/wild_earth/s01e03",
          "release_date": "2025-09-15T10:00:00Z",
          "episode_order": 3,
          "created_at": "2025-09-01T10:20:00Z",
          "updated_at": "2026-02-20T12:00:00Z"
        }
      ],
      "programs": [
        {
          "id": "sp_plus_20260306_1800",
          "channel_id": "sports_plus_hd",
          "title": "GameTime Countdown",
          "description": "Experts break down the biggest matchups of the night with live reports from the stadium.",
          "genre": "sports",
          "start_time": "2026-03-06T18:00:00Z",
          "end_time": "2026-03-06T20:00:00Z",
          "is_live": true,
          "rating": "tv_pg",
          "season_number": null,
          "episode_number": null
        },
        {
          "id": "sp_plus_20260306_2000",
          "channel_id": "sports_plus_hd",
          "title": "Friday Night Football Live",
          "description": "Live coverage of a prime-time football showdown with real-time analysis.",
          "genre": "sports",
          "start_time": "2026-03-06T20:00:00Z",
          "end_time": "2026-03-06T22:30:00Z",
          "is_live": true,
          "rating": "tv_pg",
          "season_number": null,
          "episode_number": null
        },
        {
          "id": "arena1_20260306_2000",
          "channel_id": "arena_sports_1",
          "title": "Court Clash Live",
          "description": "Top-seeded basketball teams face off in a high-stakes matchup.",
          "genre": "sports",
          "start_time": "2026-03-06T20:00:00Z",
          "end_time": "2026-03-06T22:00:00Z",
          "is_live": true,
          "rating": "tv_pg",
          "season_number": null,
          "episode_number": null
        }
      ],
      "subscriptions": [
        {
          "id": "sub_trial_2025",
          "is_current": false,
          "current_plan_id": "starter_hd",
          "billing_cycle": "monthly",
          "status": "trial",
          "start_date": "2025-11-10T09:00:00Z",
          "end_date": "2025-11-24T09:00:00Z",
          "next_billing_date": "2025-11-24T09:00:00Z",
          "last_updated_source": "trial_conversion",
          "created_at": "2025-11-10T09:00:00Z",
          "updated_at": "2025-11-24T09:05:00Z",
          "base_monthly_price": 14.99,
          "base_annual_price": 149.99,
          "simultaneous_streams_limit": 1,
          "total_monthly_price": 14.99,
          "total_annual_price": 149.99
        },
        {
          "id": "sub_standard_2025",
          "is_current": false,
          "current_plan_id": "standard_hd",
          "billing_cycle": "monthly",
          "status": "canceled",
          "start_date": "2025-11-24T09:05:00Z",
          "end_date": "2025-12-01T09:00:00Z",
          "next_billing_date": "2025-12-01T09:00:00Z",
          "last_updated_source": "plan_upgrade",
          "created_at": "2025-11-24T09:05:00Z",
          "updated_at": "2025-12-01T09:10:00Z",
          "base_monthly_price": 19.99,
          "base_annual_price": 199.99,
          "simultaneous_streams_limit": 2,
          "total_monthly_price": 19.99,
          "total_annual_price": 199.99
        },
        {
          "id": "sub_current_monthly",
          "is_current": true,
          "current_plan_id": "family_hd",
          "billing_cycle": "monthly",
          "status": "active",
          "start_date": "2025-12-01T09:10:00Z",
          "end_date": null,
          "next_billing_date": "2026-03-15T10:00:00Z",
          "last_updated_source": "billing_change",
          "created_at": "2025-12-01T09:10:00Z",
          "updated_at": "2026-02-20T14:30:00Z",
          "base_monthly_price": 27.99,
          "base_annual_price": 279.99,
          "simultaneous_streams_limit": 3,
          "total_monthly_price": 36.97,
          "total_annual_price": 387.75
        }
      ],
      "plan_channels": [
        {
          "id": "starter_hd_silver_screen_hd",
          "plan_id": "starter_hd",
          "channel_id": "silver_screen_hd",
          "is_core": true
        },
        {
          "id": "starter_hd_global_news_en",
          "plan_id": "starter_hd",
          "channel_id": "global_news_en",
          "is_core": true
        },
        {
          "id": "starter_hd_kids_time",
          "plan_id": "starter_hd",
          "channel_id": "kids_time",
          "is_core": true
        }
      ],
      "plans": [
        {
          "id": "starter_hd",
          "name": "Starter HD",
          "description": "Entry-level HD package with popular entertainment, news, and kids channels.",
          "monthly_price": 14.99,
          "annual_price": 149.99,
          "max_simultaneous_streams": 1,
          "billing_cycles_available": [
            "monthly",
            "annual"
          ],
          "status": "active",
          "is_featured": false,
          "sort_order": 1,
          "tags": [
            "budget",
            "starter"
          ],
          "created_at": "2025-01-05T10:00:00Z",
          "updated_at": "2026-02-10T12:00:00Z",
          "channel_count": 6
        },
        {
          "id": "standard_hd",
          "name": "Standard HD",
          "description": "Expanded HD lineup with more movies, news, and documentary channels.",
          "monthly_price": 19.99,
          "annual_price": 199.99,
          "max_simultaneous_streams": 2,
          "billing_cycles_available": [
            "monthly",
            "annual"
          ],
          "status": "active",
          "is_featured": true,
          "sort_order": 2,
          "tags": [
            "best_value",
            "hd"
          ],
          "created_at": "2025-01-10T10:00:00Z",
          "updated_at": "2026-02-10T12:05:00Z",
          "channel_count": 5
        },
        {
          "id": "family_hd",
          "name": "Family HD",
          "description": "Family-focused package with extra kids, news, and sports channels.",
          "monthly_price": 27.99,
          "annual_price": 279.99,
          "max_simultaneous_streams": 3,
          "billing_cycles_available": [
            "monthly",
            "annual"
          ],
          "status": "active",
          "is_featured": true,
          "sort_order": 3,
          "tags": [
            "family",
            "kids_friendly"
          ],
          "created_at": "2025-01-15T10:00:00Z",
          "updated_at": "2026-02-15T09:30:00Z",
          "channel_count": 6
        }
      ],
      "addon_channels": [
        {
          "id": "sports_fan_hd_sports_plus_hd",
          "addon_id": "sports_fan_hd",
          "channel_id": "sports_plus_hd"
        },
        {
          "id": "sports_fan_hd_arena_sports_1",
          "addon_id": "sports_fan_hd",
          "channel_id": "arena_sports_1"
        },
        {
          "id": "sports_fan_hd_arena_sports_2",
          "addon_id": "sports_fan_hd",
          "channel_id": "arena_sports_2"
        }
      ],
      "addons": [
        {
          "id": "sports_fan_hd",
          "name": "Sports Fan HD",
          "description": "Compact sports bundle with the most-watched HD sports networks, perfect for everyday fans.",
          "category": "sports",
          "monthly_price": 8.99,
          "has_hd_channels": true,
          "has_4k_channels": false,
          "marketing_highlight": "Includes 5+ HD sports channels for one low monthly price",
          "status": "active",
          "sort_order": 1,
          "created_at": "2025-04-10T10:00:00Z",
          "updated_at": "2026-02-18T09:15:00Z",
          "included_channels_count": 6
        },
        {
          "id": "sports_global_plus",
          "name": "Sports Global Plus",
          "description": "Expanded international sports coverage with extra soccer and global sports news.",
          "category": "sports",
          "monthly_price": 11.99,
          "has_hd_channels": true,
          "has_4k_channels": false,
          "marketing_highlight": "HD coverage of global football, live studio shows, and 24/7 sports news.",
          "status": "active",
          "sort_order": 2,
          "created_at": "2025-05-01T11:30:00Z",
          "updated_at": "2026-02-18T09:20:00Z",
          "included_channels_count": 3
        },
        {
          "id": "movies_plus",
          "name": "Movies Plus",
          "description": "Add-on movie pack with blockbuster premieres, classics, and international cinema.",
          "category": "movies",
          "monthly_price": 6.99,
          "has_hd_channels": true,
          "has_4k_channels": false,
          "marketing_highlight": "Non-stop movies in HD, from Hollywood hits to Latin favorites.",
          "status": "active",
          "sort_order": 3,
          "created_at": "2025-03-15T09:45:00Z",
          "updated_at": "2026-02-12T13:05:00Z",
          "included_channels_count": 3
        }
      ],
      "subscription_addons": [
        {
          "id": "sa_sub_current_kids_family",
          "subscription_id": "sub_current_monthly",
          "addon_id": "kids_family",
          "added_at": "2025-12-05T10:15:00Z",
          "is_active": true
        },
        {
          "id": "sa_sub_current_latin_news_pack",
          "subscription_id": "sub_current_monthly",
          "addon_id": "latin_news_pack",
          "added_at": "2026-01-10T14:30:00Z",
          "is_active": true
        },
        {
          "id": "sa_sub_current_movies_plus_inactive",
          "subscription_id": "sub_current_monthly",
          "addon_id": "movies_plus",
          "added_at": "2025-12-10T18:45:00Z",
          "is_active": false
        }
      ]
    };

    // Persist to localStorage using correct storage keys
    localStorage.setItem('billing_settings', JSON.stringify(generatedData.billing_settings));
    localStorage.setItem('channels', JSON.stringify(generatedData.channels));
    localStorage.setItem('promo_codes', JSON.stringify(generatedData.promo_codes));
    localStorage.setItem('series', JSON.stringify(generatedData.series));
    localStorage.setItem('episodes', JSON.stringify(generatedData.episodes));
    localStorage.setItem('programs', JSON.stringify(generatedData.programs));
    localStorage.setItem('subscriptions', JSON.stringify(generatedData.subscriptions));
    localStorage.setItem('plan_channels', JSON.stringify(generatedData.plan_channels));
    localStorage.setItem('plans', JSON.stringify(generatedData.plans));
    localStorage.setItem('addon_channels', JSON.stringify(generatedData.addon_channels));
    localStorage.setItem('addons', JSON.stringify(generatedData.addons));
    localStorage.setItem('subscription_addons', JSON.stringify(generatedData.subscription_addons));

    // Empty collections for entities without pre-generated data
    localStorage.setItem('subscription_changes', JSON.stringify([]));
    localStorage.setItem('favorite_channels', JSON.stringify([]));
    localStorage.setItem('parental_controls', JSON.stringify([]));
    localStorage.setItem('recordings', JSON.stringify([]));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SelectBasePlanUnder20Annual();
    this.testTask2_AddSportsAddonUnder10();
    this.testTask3_FavoriteThreeChannels();
    this.testTask4_SetParentalControlsWithPin();
    this.testTask5_UpgradePlanMoreStreamsUnder30();
    this.testTask6_ScheduleSportsRecordingNextFriday();
    this.testTask7_SwitchToAnnualBillingWithPromo();
    this.testTask8_Find4KNatureSeriesPlayFirstEpisode();

    return this.results;
  }

  // Helper: simple auth for flows that require signed-in state
  ensureSignedIn() {
    if (this._signedIn) return;
    const res = this.logic.signInUser('parent@example.com', 'Parent123!');
    this.assert(res && res.success === true, 'Sign-in should succeed');
    this.assert(res.is_authenticated === true, 'User should be authenticated');
    this._signedIn = true;
  }

  // Task 1: Choose a base IPTV plan under $20/month billed yearly and go to checkout
  testTask1_SelectBasePlanUnder20Annual() {
    const testName = 'Task 1 - Select base plan under $20/month with annual billing and open checkout';
    console.log('Testing:', testName);

    try {
      // Simulate homepage visit
      const home = this.logic.getHomePageContent();
      this.assert(home != null, 'Homepage content should be returned');

      // Load plan filter metadata
      const filterOptions = this.logic.getPlanFilterOptions();
      this.assert(filterOptions != null, 'Plan filter options should be available');

      const maxMonthlyPrice = 20;
      const minChannelCount = 1; // Adapted from 100+ due to limited test data
      const billingCycle = 'annual';

      // Get filtered, sorted plans for new subscription flow
      const plansResult = this.logic.getPlansForListing(
        {
          maxMonthlyPrice: maxMonthlyPrice,
          minChannelCount: minChannelCount,
          billingCycle: billingCycle,
          onlyActive: true
        },
        'price_low_to_high',
        'new_subscription'
      );

      this.assert(plansResult && Array.isArray(plansResult.plans), 'Plans listing response should contain plans array');
      this.assert(plansResult.plans.length > 0, 'There should be at least one plan matching filters');

      const selectedPlan = plansResult.plans[0];
      this.assert(selectedPlan.monthly_price <= maxMonthlyPrice, 'Selected plan monthly_price should respect max filter');
      this.assert(
        Array.isArray(selectedPlan.billing_cycles_available) &&
          selectedPlan.billing_cycles_available.indexOf(billingCycle) !== -1,
        'Selected plan should support annual billing'
      );

      // Start a draft subscription change for this plan on annual billing
      const startChangeRes = this.logic.startPlanChange(selectedPlan.id, billingCycle, 'plans_page');
      this.assert(startChangeRes && startChangeRes.success === true, 'startPlanChange should succeed');

      const change = startChangeRes.subscription_change;
      this.assert(change != null, 'SubscriptionChange object should be returned');
      this.assert(change.selected_plan_id === selectedPlan.id, 'SubscriptionChange should reference selected plan');
      this.assert(change.selected_billing_cycle === billingCycle, 'SubscriptionChange should have annual billing cycle');

      // Simulate proceeding to checkout by loading checkout summary
      const checkout = this.logic.getCheckoutSummary();
      this.assert(checkout != null, 'Checkout summary should be returned');
      this.assert(checkout.has_pending_change === true, 'Checkout should indicate pending subscription change');
      this.assert(
        checkout.selected_plan && checkout.selected_plan.id === selectedPlan.id,
        'Checkout selected_plan should match chosen plan'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Add a sports add-on under $10 with 5+ HD sports channels and save
  testTask2_AddSportsAddonUnder10() {
    const testName = 'Task 2 - Add sports add-on under $10 with 5+ HD sports channels and confirm';
    console.log('Testing:', testName);

    try {
      this.ensureSignedIn();

      // Navigate to Add-ons page and load filter options
      const addonFilterOpts = this.logic.getAddonFilterOptions();
      this.assert(addonFilterOpts != null, 'Add-on filter options should be available');

      let sportsCategory = 'sports';
      if (Array.isArray(addonFilterOpts.categories)) {
        const sports = addonFilterOpts.categories.find(c => c.value === 'sports' || /sport/i.test(c.label || ''));
        if (sports) sportsCategory = sports.value;
      }

      const maxMonthlyPrice = 10;

      // List sports add-ons with filters applied
      const addonsListing = this.logic.getAddonsForListing(
        sportsCategory,
        {
          maxMonthlyPrice: maxMonthlyPrice,
          hasHdChannels: true,
          has4kChannels: false,
          onlyActive: true,
          onlyAvailableToAdd: true
        },
        'price_low_to_high'
      );

      this.assert(addonsListing && Array.isArray(addonsListing.addons), 'Add-ons listing should contain addons array');
      this.assert(addonsListing.addons.length > 0, 'There should be at least one sports add-on under price filter');

      // Prefer an add-on whose marketing text mentions "5+ HD sports channels"
      let selectedAddon = addonsListing.addons.find(
        a => typeof a.marketing_highlight === 'string' && /5\+\s*HD sports channels/i.test(a.marketing_highlight)
      );
      if (!selectedAddon) {
        selectedAddon = addonsListing.addons[0];
      }

      this.assert(selectedAddon.monthly_price <= maxMonthlyPrice, 'Selected add-on price should be within max');
      this.assert(selectedAddon.has_hd_channels === true, 'Selected add-on should have HD channels');

      // Load add-on detail to simulate detail page
      const addonDetail = this.logic.getAddonDetail(selectedAddon.id);
      this.assert(addonDetail && addonDetail.addon, 'Add-on detail should be returned');
      this.assert(addonDetail.addon.id === selectedAddon.id, 'Detail add-on id should match selected');

      // Add add-on to draft subscription change
      const addDraftRes = this.logic.addAddonToDraftSubscription(selectedAddon.id);
      this.assert(addDraftRes && addDraftRes.success === true, 'addAddonToDraftSubscription should succeed');
      const draftChange = addDraftRes.subscription_change;
      this.assert(draftChange != null, 'Draft SubscriptionChange should be returned');
      this.assert(
        Array.isArray(draftChange.selected_addon_ids) &&
          draftChange.selected_addon_ids.indexOf(selectedAddon.id) !== -1,
        'Draft change should include selected add-on id'
      );

      // View updated plan summary
      const myPlan = this.logic.getMyPlanSummary();
      this.assert(myPlan != null, 'My Plan summary should be returned');
      this.assert(
        myPlan.pending_subscription_change && myPlan.pending_subscription_change.exists === true,
        'My Plan should indicate a pending subscription change'
      );
      this.assert(
        Array.isArray(myPlan.pending_subscription_change.change.selected_addon_ids) &&
          myPlan.pending_subscription_change.change.selected_addon_ids.indexOf(selectedAddon.id) !== -1,
        'Pending change in My Plan should include selected add-on'
      );

      // Proceed to checkout / review changes
      const checkout = this.logic.getCheckoutSummary();
      this.assert(checkout != null, 'Checkout summary should be available');
      const addonInCheckout = (checkout.selected_addons || []).find(a => a.id === selectedAddon.id);
      this.assert(addonInCheckout != null, 'Checkout should list the selected sports add-on');

      // Confirm the change (simulate Save/Confirm)
      const confirmRes = this.logic.confirmSubscriptionChange('immediately', 'checkout_page');
      this.assert(confirmRes && confirmRes.success === true, 'confirmSubscriptionChange should succeed');
      this.assert(confirmRes.updated_subscription != null, 'Updated subscription should be returned after confirmation');

      // Verify from dashboard that add-on is now active
      const dashboard = this.logic.getDashboardOverview();
      this.assert(dashboard && dashboard.subscription_summary, 'Dashboard overview should be available');
      const activeAddon = (dashboard.subscription_summary.active_addons || []).find(a => a.id === selectedAddon.id);
      this.assert(activeAddon != null, 'Active add-ons on dashboard should include newly added sports add-on');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Favorite 3 channels (adapted to available data) and verify favorites list
  testTask3_FavoriteThreeChannels() {
    const testName = 'Task 3 - Favorite 3 channels via filters and verify Favorites list';
    console.log('Testing:', testName);

    try {
      this.ensureSignedIn();

      // Load channel filter options (genres/languages/ratings)
      const channelFilterOpts = this.logic.getChannelFilterOptions();
      this.assert(channelFilterOpts != null, 'Channel filter options should be available');

      let englishCode = null;
      let spanishCode = null;
      if (Array.isArray(channelFilterOpts.languages)) {
        const enOpt = channelFilterOpts.languages.find(l => /english/i.test(l.label || ''));
        const esOpt = channelFilterOpts.languages.find(l => /spanish/i.test(l.label || ''));
        if (enOpt) englishCode = enOpt.code;
        if (esOpt) spanishCode = esOpt.code;
      }

      const favoriteChannelIds = [];

      // 1) English-language movie channel
      const englishMovieFilters = { genre: 'movies' };
      if (englishCode) englishMovieFilters.language = englishCode;

      const englishMovies = this.logic.getChannelsForListing(englishMovieFilters, 'name_az');
      this.assert(englishMovies && Array.isArray(englishMovies.channels), 'English movies channel list should be returned');
      this.assert(englishMovies.channels.length > 0, 'There should be at least one movie channel in English');

      const englishMovieChannel = englishMovies.channels[0];
      favoriteChannelIds.push(englishMovieChannel.id);

      const englishDetail = this.logic.getChannelDetailWithSchedule(englishMovieChannel.id);
      this.assert(englishDetail && englishDetail.channel, 'English movie channel detail should load');

      const favRes1 = this.logic.addChannelToFavorites(englishMovieChannel.id);
      this.assert(favRes1 && favRes1.success === true, 'Adding English movie channel to favorites should succeed');

      // 2) Spanish-language channel (adapted: movie channel due to limited data)
      const spanishFiltersPrimary = { genre: 'news' };
      if (spanishCode) spanishFiltersPrimary.language = spanishCode;

      let spanishListing = this.logic.getChannelsForListing(spanishFiltersPrimary, 'name_az');
      let spanishChannel = null;
      if (spanishListing && Array.isArray(spanishListing.channels) && spanishListing.channels.length > 0) {
        spanishChannel = spanishListing.channels[0];
      } else {
        // Fallback: Spanish movies if no Spanish news channels in dataset
        const spanishMovieFilters = { genre: 'movies' };
        if (spanishCode) spanishMovieFilters.language = spanishCode;
        spanishListing = this.logic.getChannelsForListing(spanishMovieFilters, 'name_az');
        this.assert(
          spanishListing && Array.isArray(spanishListing.channels) && spanishListing.channels.length > 0,
          'There should be at least one Spanish-language channel (movies) available'
        );
        spanishChannel = spanishListing.channels[0];
      }

      if (favoriteChannelIds.indexOf(spanishChannel.id) === -1) {
        favoriteChannelIds.push(spanishChannel.id);
      }

      const spanishDetail = this.logic.getChannelDetailWithSchedule(spanishChannel.id);
      this.assert(spanishDetail && spanishDetail.channel, 'Spanish channel detail should load');

      const favRes2 = this.logic.addChannelToFavorites(spanishChannel.id);
      this.assert(favRes2 && favRes2.success === true, 'Adding Spanish channel to favorites should succeed');

      // 3) Kids/all-ages-like channel (adapted: any remaining channel, preferring non-news movies)
      let kidsChannel = null;
      const kidsListing = this.logic.getChannelsForListing({ genre: 'kids' }, 'name_az');
      if (kidsListing && Array.isArray(kidsListing.channels) && kidsListing.channels.length > 0) {
        kidsChannel = kidsListing.channels[0];
      } else {
        // Fallback: pick any channel not already favorited
        const allChannelsListing = this.logic.getChannelsForListing({}, 'name_az');
        this.assert(
          allChannelsListing && Array.isArray(allChannelsListing.channels) && allChannelsListing.channels.length > 0,
          'There should be at least one channel available for kids/family selection'
        );
        kidsChannel = allChannelsListing.channels.find(c => favoriteChannelIds.indexOf(c.id) === -1) ||
          allChannelsListing.channels[0];
      }

      if (favoriteChannelIds.indexOf(kidsChannel.id) === -1) {
        favoriteChannelIds.push(kidsChannel.id);
      }

      const kidsDetail = this.logic.getChannelDetailWithSchedule(kidsChannel.id);
      this.assert(kidsDetail && kidsDetail.channel, 'Kids/family channel detail should load');

      const favRes3 = this.logic.addChannelToFavorites(kidsChannel.id);
      this.assert(favRes3 && favRes3.success === true, 'Adding kids/family channel to favorites should succeed');

      // Open Favorites list and verify channels are present
      const favoritesList = this.logic.getFavoriteChannelsList();
      this.assert(favoritesList && Array.isArray(favoritesList.favorites), 'Favorites list should be returned');
      this.assert(favoritesList.favorites.length >= 3, 'Favorites list should contain at least 3 channels');

      favoriteChannelIds.forEach(id => {
        const found = favoritesList.favorites.find(f => f.channel_id === id);
        this.assert(found != null, 'Favorites list should contain channel id: ' + id);
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Set up parental controls with PIN 1234, TV-14 limit and block purchases
  testTask4_SetParentalControlsWithPin() {
    const testName = 'Task 4 - Configure parental controls with PIN 1234, TV-14 limit, and purchase blocking';
    console.log('Testing:', testName);

    try {
      // Sign in as parent user
      const signInResult = this.logic.signInUser('parent@example.com', 'Parent123!');
      this.assert(signInResult && signInResult.success === true, 'Sign-in should succeed for parental controls');
      this.assert(signInResult.is_authenticated === true, 'User should be authenticated');

      // Load any existing parental controls
      const beforeSettings = this.logic.getParentalControlsSetting();
      this.assert(beforeSettings != null, 'Parental controls setting response should be available');

      // Create/update parental controls
      const pin = '1234';
      const updateResult = this.logic.updateParentalControlsSetting(pin, pin, 'tv_14', true);
      this.assert(updateResult && updateResult.success === true, 'Updating parental controls should succeed');
      this.assert(updateResult.settings != null, 'Updated parental controls settings should be returned');

      const settings = updateResult.settings;
      this.assert(settings.pin === pin, 'Parental controls PIN should match input');
      this.assert(settings.max_content_rating === 'tv_14', 'Max content rating should be TV-14');
      this.assert(settings.block_purchases_without_pin === true, 'Purchases should be blocked without PIN');

      // Verify persisted settings via getter
      const afterSettings = this.logic.getParentalControlsSetting();
      this.assert(afterSettings.has_parental_controls_configured === true, 'Parental controls should now be configured');
      this.assert(afterSettings.settings != null, 'Parental controls settings should be present after update');
      this.assert(afterSettings.settings.pin === pin, 'Loaded PIN should match updated PIN');
      this.assert(afterSettings.settings.max_content_rating === 'tv_14', 'Loaded rating limit should be TV-14');
      this.assert(
        afterSettings.settings.block_purchases_without_pin === true,
        'Loaded settings should have purchase blocking enabled'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Upgrade to plan with more simultaneous streams under $30/month
  testTask5_UpgradePlanMoreStreamsUnder30() {
    const testName = 'Task 5 - Compare plans under $30 and switch to one with more simultaneous streams';
    console.log('Testing:', testName);

    try {
      this.ensureSignedIn();

      // Load dashboard to get current subscription context
      const dashboardBefore = this.logic.getDashboardOverview();
      this.assert(dashboardBefore && dashboardBefore.subscription_summary, 'Dashboard overview should be available');
      const currentPlanBefore = dashboardBefore.subscription_summary.current_plan;
      this.assert(currentPlanBefore != null, 'Current plan should be present before change');

      const maxMonthlyPrice = 30;

      // List eligible plans under $30/month, for change-plan context
      const plansResult = this.logic.getPlansForListing(
        {
          maxMonthlyPrice: maxMonthlyPrice,
          minChannelCount: 0,
          billingCycle: 'monthly',
          onlyActive: true
        },
        'price_low_to_high',
        'change_plan'
      );

      this.assert(plansResult && Array.isArray(plansResult.plans), 'Plans listing for change-plan should return plans array');
      this.assert(plansResult.plans.length >= 2, 'There should be at least two plans to compare under $30');

      const planId1 = plansResult.plans[0].id;
      const planId2 = plansResult.plans[1].id;

      // Compare first two plans
      const comparedPlans = this.logic.comparePlans([planId1, planId2]);
      this.assert(Array.isArray(comparedPlans) && comparedPlans.length >= 2, 'comparePlans should return both plans');

      // Select the plan with higher max_simultaneous_streams
      let targetPlan = comparedPlans[0];
      comparedPlans.forEach(p => {
        if (p.max_simultaneous_streams > targetPlan.max_simultaneous_streams) {
          targetPlan = p;
        }
      });

      // Ensure target plan is under the price cap
      this.assert(targetPlan.monthly_price <= maxMonthlyPrice, 'Target plan monthly price should be <= $30');

      // Start plan change to the selected plan (monthly billing)
      const startChangeRes = this.logic.startPlanChange(targetPlan.id, 'monthly', 'change_plan');
      this.assert(startChangeRes && startChangeRes.success === true, 'startPlanChange should succeed for upgrade');
      const change = startChangeRes.subscription_change;
      this.assert(change != null, 'SubscriptionChange should be returned');
      this.assert(change.selected_plan_id === targetPlan.id, 'SubscriptionChange should reference target plan id');

      // Load checkout summary and verify selected plan there
      const checkout = this.logic.getCheckoutSummary();
      this.assert(checkout && checkout.has_pending_change === true, 'Checkout should indicate pending change');
      this.assert(
        checkout.selected_plan && checkout.selected_plan.id === targetPlan.id,
        'Checkout selected_plan should match target plan'
      );

      // Confirm upgrade to start immediately
      const confirmRes = this.logic.confirmSubscriptionChange('immediately', 'checkout_page');
      this.assert(confirmRes && confirmRes.success === true, 'confirmSubscriptionChange should succeed for plan upgrade');
      this.assert(confirmRes.updated_subscription != null, 'Updated subscription should be returned after upgrade');

      const updatedSub = confirmRes.updated_subscription;
      this.assert(updatedSub.current_plan_id === targetPlan.id, 'Updated subscription current_plan_id should match target plan');
      if (typeof targetPlan.max_simultaneous_streams === 'number') {
        this.assert(
          updatedSub.simultaneous_streams_limit === targetPlan.max_simultaneous_streams,
          'Updated subscription streams limit should match plan max_simultaneous_streams'
        );
      }

      // Verify via dashboard after upgrade
      const dashboardAfter = this.logic.getDashboardOverview();
      this.assert(dashboardAfter && dashboardAfter.subscription_summary, 'Dashboard overview after upgrade should be available');
      const currentPlanAfter = dashboardAfter.subscription_summary.current_plan;
      this.assert(currentPlanAfter && currentPlanAfter.id === targetPlan.id, 'Dashboard current plan should be updated to target plan');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Schedule a recording of a sports program next Friday at 8:00 PM and keep it for 7 days
  testTask6_ScheduleSportsRecordingNextFriday() {
    const testName = 'Task 6 - Schedule sports recording next Friday at 8:00 PM and keep for 7 days';
    console.log('Testing:', testName);

    try {
      this.ensureSignedIn();

      // Get baseline recording counts from dashboard
      const dashboardBefore = this.logic.getDashboardOverview();
      this.assert(dashboardBefore && dashboardBefore.usage_indicators, 'Dashboard overview should be available');
      const beforeScheduledCount = dashboardBefore.usage_indicators.scheduled_recordings_count || 0;

      // Use known guide date from generated data: 2026-03-06 is a Friday
      const guideDate = '2026-03-06';

      const guide = this.logic.getTvGuideGrid(guideDate, 'sports', '20:00', '22:30');
      this.assert(guide != null, 'TV guide grid should be returned');
      this.assert(Array.isArray(guide.channels) && guide.channels.length > 0, 'TV guide should include sports channels for the date');

      // Find a sports program starting around 8:00 PM
      let targetProgram = null;
      for (let i = 0; i < guide.channels.length && !targetProgram; i++) {
        const row = guide.channels[i];
        const programs = row.programs || [];
        for (let j = 0; j < programs.length; j++) {
          const prog = programs[j];
          const startTimeStr = prog.start_time || '';
          if (startTimeStr.indexOf('T20:00') !== -1) {
            targetProgram = prog;
            break;
          }
        }
      }

      // Fallback: any sports program in the grid if exact 8:00 PM not found
      if (!targetProgram) {
        for (let i = 0; i < guide.channels.length && !targetProgram; i++) {
          const row = guide.channels[i];
          const programs = row.programs || [];
          if (programs.length > 0) {
            targetProgram = programs[0];
            break;
          }
        }
      }

      this.assert(targetProgram != null, 'A target sports program should be found in the guide');

      // Load program details
      const programDetails = this.logic.getProgramDetails(targetProgram.id);
      this.assert(programDetails && programDetails.program, 'Program details should be returned');

      // Schedule recording with keepDays = 7
      const keepDays = 7;
      const scheduleRes = this.logic.scheduleRecording(targetProgram.id, keepDays);
      this.assert(scheduleRes && scheduleRes.success === true, 'scheduleRecording should succeed');
      this.assert(scheduleRes.recording != null, 'Recording object should be returned');

      const recording = scheduleRes.recording;
      this.assert(recording.program_id === targetProgram.id, 'Recording program_id should match target program');
      this.assert(recording.keep_days === keepDays, 'Recording keep_days should match requested value 7');
      this.assert(recording.status === 'scheduled', 'Recording status should be scheduled');

      // Verify dashboard counters increased
      const dashboardAfter = this.logic.getDashboardOverview();
      this.assert(dashboardAfter && dashboardAfter.usage_indicators, 'Dashboard after scheduling should be available');
      const afterScheduledCount = dashboardAfter.usage_indicators.scheduled_recordings_count || 0;
      this.assert(
        afterScheduledCount >= beforeScheduledCount + 1,
        'Scheduled recordings count should increase after scheduling'
      );

      const upcomingList = dashboardAfter.upcoming_recordings || [];
      const upcomingMatch = upcomingList.find(item => item.recording && item.recording.id === recording.id);
      this.assert(upcomingMatch != null, 'Upcoming recordings list should include newly scheduled recording');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Switch to annual billing, apply promo code SAVE20, and select plan under $200/year
  testTask7_SwitchToAnnualBillingWithPromo() {
    const testName = 'Task 7 - Switch to annual billing, apply SAVE20, choose plan under $200/year, and update';
    console.log('Testing:', testName);

    try {
      this.ensureSignedIn();

      // Load billing overview
      const billingOverviewBefore = this.logic.getBillingOverview();
      this.assert(billingOverviewBefore && billingOverviewBefore.billing_settings, 'Billing overview should be available');

      // Update draft billing cycle to annual
      const draftCycleRes = this.logic.updateDraftBillingCycle('annual');
      this.assert(draftCycleRes && draftCycleRes.success === true, 'updateDraftBillingCycle should succeed');
      this.assert(draftCycleRes.subscription_change != null, 'Draft subscription_change should be returned after billing cycle update');
      this.assert(
        draftCycleRes.subscription_change.selected_billing_cycle === 'annual',
        'Draft subscription_change should reflect annual billing cycle'
      );

      // Apply promo code SAVE20 to draft
      const promoApplyRes = this.logic.applyPromoCodeToDraft('SAVE20');
      this.assert(promoApplyRes && promoApplyRes.success === true, 'Applying promo code SAVE20 should succeed');
      this.assert(promoApplyRes.promo != null, 'Promo metadata should be returned');
      this.assert(promoApplyRes.promo.code === 'SAVE20', 'Applied promo code should be SAVE20');
      this.assert(
        promoApplyRes.subscription_change &&
          promoApplyRes.subscription_change.promo_code_code === 'SAVE20',
        'Draft subscription_change should reference SAVE20 promo'
      );

      // List annual plans for billing selection, sorted by estimated annual total, with maxAnnualTotal filter
      const maxAnnualTotal = 200;
      const billingPlans = this.logic.getPlansForBillingSelection('annual', 'annual_total_low_to_high', maxAnnualTotal);
      this.assert(billingPlans && Array.isArray(billingPlans.plans), 'Plans for billing selection should be returned');
      this.assert(billingPlans.plans.length > 0, 'There should be at least one annual plan under max annual total');
      this.assert(Array.isArray(billingPlans.estimated_annual_totals), 'Estimated annual totals should be provided');

      // Build map of estimated totals keyed by plan_id
      const totalsByPlanId = {};
      billingPlans.estimated_annual_totals.forEach(item => {
        totalsByPlanId[item.plan_id] = item.estimated_annual_total;
      });

      // Choose the first plan in sorted list that respects < $200/year (already filtered by maxAnnualTotal)
      const chosenPlan = billingPlans.plans[0];
      const chosenEstimatedTotal = totalsByPlanId[chosenPlan.id];
      this.assert(typeof chosenEstimatedTotal === 'number', 'Chosen plan should have an estimated annual total');
      this.assert(chosenEstimatedTotal <= maxAnnualTotal, 'Chosen plan estimated annual total should be <= $200');

      // Start or update plan change in billing context with annual billing
      const startChangeRes = this.logic.startPlanChange(chosenPlan.id, 'annual', 'billing_page');
      this.assert(startChangeRes && startChangeRes.success === true, 'startPlanChange from billing page should succeed');
      const change = startChangeRes.subscription_change;
      this.assert(change != null, 'SubscriptionChange should be returned for billing page change');
      this.assert(change.selected_plan_id === chosenPlan.id, 'SubscriptionChange should reference chosen annual plan');
      this.assert(change.selected_billing_cycle === 'annual', 'SubscriptionChange should reflect annual billing cycle');
      if (change.promo_code_code) {
        this.assert(change.promo_code_code === 'SAVE20', 'SubscriptionChange should preserve SAVE20 promo');
      }

      // Checkout summary should show new annual total with promo applied
      const checkout = this.logic.getCheckoutSummary();
      this.assert(checkout && checkout.has_pending_change === true, 'Checkout should indicate pending change after billing update');
      this.assert(
        checkout.selected_plan && checkout.selected_plan.id === chosenPlan.id,
        'Checkout selected_plan should match chosen annual plan'
      );
      if (checkout.pricing_summary && typeof checkout.pricing_summary.new_annual_total === 'number') {
        this.assert(
          checkout.pricing_summary.new_annual_total <= maxAnnualTotal,
          'Checkout new annual total should be <= $200 with promo applied'
        );
      }
      if (checkout.pricing_summary && checkout.pricing_summary.promo_code) {
        this.assert(
          checkout.pricing_summary.promo_code === 'SAVE20',
          'Checkout pricing summary should display SAVE20 promo code'
        );
      }

      // Confirm subscription change (simulate Update Subscription)
      const confirmRes = this.logic.confirmSubscriptionChange('immediately', 'billing_page');
      this.assert(confirmRes && confirmRes.success === true, 'confirmSubscriptionChange from billing page should succeed');
      this.assert(confirmRes.updated_subscription != null, 'Updated subscription should be returned after billing change');

      const updatedSub = confirmRes.updated_subscription;
      this.assert(updatedSub.billing_cycle === 'annual', 'Updated subscription billing_cycle should be annual');
      this.assert(updatedSub.current_plan_id === chosenPlan.id, 'Updated subscription current_plan_id should match chosen plan');

      // Verify billing overview reflects annual billing
      const billingOverviewAfter = this.logic.getBillingOverview();
      this.assert(billingOverviewAfter && billingOverviewAfter.billing_settings, 'Billing overview after change should be available');
      this.assert(
        billingOverviewAfter.billing_settings.billing_cycle === 'annual',
        'Billing settings should now indicate annual billing cycle'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Find a 4K nature documentary series and start playing the first episode
  testTask8_Find4KNatureSeriesPlayFirstEpisode() {
    const testName = 'Task 8 - Find 4K nature documentary series and play first episode';
    console.log('Testing:', testName);

    try {
      // Simulate homepage access (search bar availability)
      const home = this.logic.getHomePageContent();
      this.assert(home != null, 'Homepage content should be returned before search');

      // Search for nature-related series in 4K documentary category
      const searchResults = this.logic.searchSeries(
        'nature',
        {
          resolution: '4k',
          contentType: 'series',
          genre: 'documentary',
          tags: null
        },
        'most_popular'
      );

      this.assert(searchResults && Array.isArray(searchResults.results), 'searchSeries should return results array');
      this.assert(searchResults.results.length > 0, 'There should be at least one 4K documentary series in search results');

      // Choose the top documentary series from results
      let selectedSeries = searchResults.results.find(s => s.genre === 'documentary') || searchResults.results[0];
      this.assert(selectedSeries != null, 'A series should be selected from search results');
      this.assert(selectedSeries.resolution === '4k', 'Selected series should be 4K resolution');
      this.assert(selectedSeries.content_type === 'series', 'Selected content should be of type series');

      // Load series details with episodes
      const seriesDetail = this.logic.getSeriesDetailWithEpisodes(selectedSeries.id);
      this.assert(seriesDetail && seriesDetail.series, 'Series detail should be returned');
      this.assert(Array.isArray(seriesDetail.seasons) && seriesDetail.seasons.length > 0, 'Series should have at least one season');

      // Find Season 1 (or earliest season) and Episode 1 (or first ordered episode)
      const seasons = seriesDetail.seasons.slice().sort((a, b) => (a.season_number || 0) - (b.season_number || 0));
      const firstSeason = seasons[0];
      this.assert(firstSeason && Array.isArray(firstSeason.episodes) && firstSeason.episodes.length > 0, 'First season should have episodes');

      let episode1 = firstSeason.episodes.find(e => e.episode_number === 1);
      if (!episode1) {
        episode1 = firstSeason.episodes.slice().sort((a, b) => (a.episode_order || 0) - (b.episode_order || 0))[0];
      }
      this.assert(episode1 != null, 'An episode should be selected for playback');

      // Start playback for the selected episode
      const playbackRes = this.logic.startEpisodePlayback(episode1.id);
      this.assert(playbackRes && playbackRes.success === true, 'startEpisodePlayback should succeed');
      this.assert(typeof playbackRes.playback_url === 'string' && playbackRes.playback_url.length > 0, 'Playback URL should be returned');

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

// Export for Node.js ONLY
module.exports = TestRunner;
