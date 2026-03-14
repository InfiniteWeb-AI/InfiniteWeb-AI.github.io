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
    // Reinitialize storage structure from business logic
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided (adapted as JS objects)

    const generatedData = {
      activity_tags: [
        {
          id: 'weave_poles',
          name: 'Weave Poles',
          description: 'Focused practice on weave pole entries, footwork, and speed for competition agility.',
          isActive: true
        },
        {
          id: 'jumping',
          name: 'Jumping',
          description: 'Bar jumps, panel jumps, and spread jumps used in agility courses.',
          isActive: true
        },
        {
          id: 'relay_teams',
          name: 'Relay Teams',
          description: 'Team-based relay agility runs with baton-style handoffs between dogs.',
          isActive: true
        }
      ],
      ad_addons: [
        {
          id: 'foil_title',
          name: 'Foil Title',
          description: 'Adds a metallic foil effect to your ad’s main title line.',
          price: 10,
          isActive: true
        },
        {
          id: 'extra_icons',
          name: 'Extra Icons',
          description: 'Includes additional paw print and ribbon icons in your layout.',
          price: 5,
          isActive: true
        },
        {
          id: 'photo_retouch',
          name: 'Photo Retouch',
          description: 'Light color correction and minor blemish removal on one featured photo.',
          price: 12,
          isActive: true
        }
      ],
      ad_placement_options: [
        {
          id: 'general_dog_tributes',
          name: 'General Dog Tributes',
          description: 'Standard section for member dog tribute ads, grouped alphabetically.',
          sortOrder: 1,
          isActive: true
        },
        {
          id: 'agility_highlights',
          name: 'Agility Highlights',
          description: 'Placed near the Agility Stars competition results and features.',
          sortOrder: 2,
          isActive: true
        },
        {
          id: 'in_memoriam',
          name: 'In Memoriam',
          description: 'Reserved section to honor dogs who have crossed the rainbow bridge.',
          sortOrder: 3,
          isActive: true
        }
      ],
      ad_sizes: [
        {
          id: 'full_page_90',
          code: 'full_page',
          name: 'Full Page - $90',
          category: 'full_page',
          price: 90,
          maxWords: 300,
          isActive: true
        },
        {
          id: 'half_page_classic_55',
          code: 'half_page_classic',
          name: 'Half Page Classic - $55',
          category: 'half_page',
          price: 55,
          maxWords: 160,
          isActive: true
        },
        {
          id: 'half_page_premium_65',
          code: 'half_page_premium',
          name: 'Half Page Premium - $65',
          category: 'half_page',
          price: 65,
          maxWords: 180,
          isActive: true
        }
      ],
      dog_breeds: [
        {
          id: 'border_collie',
          name: 'Border Collie',
          group: 'Herding',
          isActive: true
        },
        {
          id: 'golden_retriever',
          name: 'Golden Retriever',
          group: 'Sporting',
          isActive: true
        },
        {
          id: 'labrador_retriever',
          name: 'Labrador Retriever',
          group: 'Sporting',
          isActive: true
        }
      ],
      layouts: [
        {
          id: 'single_classic_150',
          name: 'Single Dog Classic',
          spreadType: 'single_dog_feature',
          supportsDogCount: 1,
          minTextWords: 120,
          maxTextWords: 220,
          price: 40,
          description: 'Clean single-dog feature with one large photo and space for 120–220 words of bio text.',
          isActive: true
        },
        {
          id: 'single_gallery_100',
          name: 'Single Dog Gallery',
          spreadType: 'single_dog_feature',
          supportsDogCount: 1,
          minTextWords: 80,
          maxTextWords: 180,
          price: 35,
          description: 'Photo-forward layout with three images and a shorter 80–180 word story.',
          isActive: true
        },
        {
          id: 'two_dog_story_150',
          name: 'Two-Dog Story Spread',
          spreadType: 'two_dog_feature',
          supportsDogCount: 2,
          minTextWords: 150,
          maxTextWords: 260,
          price: 50,
          description: 'Side-by-side feature for 2 dogs with a shared 150–260 word narrative.',
          isActive: true
        }
      ],
      shipping_methods: [
        {
          id: 'economy',
          name: 'Economy',
          description: 'Budget-friendly ground shipping; typically 7–10 business days.',
          baseCost: 7.99,
          costPerAdditionalCopy: 1.5,
          isActive: true
        },
        {
          id: 'standard',
          name: 'Standard',
          description: 'Standard tracked shipping; typically 4–6 business days.',
          baseCost: 10.99,
          costPerAdditionalCopy: 2,
          isActive: true
        },
        {
          id: 'expedited',
          name: 'Expedited',
          description: 'Faster delivery with priority handling; typically 2–3 business days.',
          baseCost: 18.5,
          costPerAdditionalCopy: 3.5,
          isActive: true
        }
      ],
      sponsorship_packages: [
        {
          id: 'puppy_pal_25',
          name: 'Puppy Pal',
          description: 'Entry-level sponsorship for members who want to show a little extra support.',
          price: 25,
          benefits: [
            'Name listed on sponsorship page',
            'Digital thank-you badge for social media'
          ],
          sortOrder: 1,
          isActive: true
        },
        {
          id: 'friend_of_club_50',
          name: 'Friend of the Club',
          description: 'Support the club’s training equipment and trial expenses.',
          price: 50,
          benefits: [
            'Bold name listing on sponsorship page',
            'One small paw icon next to dog’s profile',
            'Thank-you mention at annual banquet'
          ],
          sortOrder: 2,
          isActive: true
        },
        {
          id: 'bronze_paw_70',
          name: 'Bronze Paw Sponsor',
          description: 'Highlighted sponsorship level ideal for families backing a special dog.',
          price: 70,
          benefits: [
            'Name and short message near dog’s profile',
            'Bronze paw icon in yearbook',
            'Listing on club website sponsor page'
          ],
          sortOrder: 3,
          isActive: true
        }
      ],
      yearbook_editions: [
        {
          id: '2023_club_yearbook',
          name: '2023 Club Yearbook',
          year: 2023,
          basePrice: 32,
          isActive: true
        },
        {
          id: '2024_club_yearbook',
          name: '2024 Club Yearbook',
          year: 2024,
          basePrice: 34,
          isActive: true
        },
        {
          id: '2025_club_yearbook',
          name: '2025 Club Yearbook',
          year: 2025,
          basePrice: 36,
          isActive: true
        }
      ],
      yearbook_sections: [
        {
          id: 'agility_stars',
          name: 'Agility Stars',
          description: 'Profiles and features of dogs competing in agility trials and games.',
          code: 'agility_stars',
          sortOrder: 1,
          isActive: true
        },
        {
          id: 'companions_families',
          name: 'Companions & Families',
          description: 'Stories celebrating the everyday lives of dogs with their families.',
          code: 'companions_families',
          sortOrder: 2,
          isActive: true
        },
        {
          id: 'general_tributes',
          name: 'General Tributes',
          description: 'Short tributes, thank-you notes, and member shout-outs.',
          code: 'general_tributes',
          sortOrder: 3,
          isActive: true
        }
      ],
      dog_profiles: [
        {
          id: 'bella',
          name: 'Bella',
          breedId: 'golden_retriever',
          birthYear: 2017,
          sectionId: 'companions_families',
          biography: 'Bella came into our lives as a fluffy golden retriever puppy who believed every person she met was her new best friend. Over the years she has grown into the heart of our household, greeting guests with a wagging tail and a favorite squeaky toy. Bella loves gentle games of fetch at the park, swimming after sticks, and curling up with the kids during movie nights. Though she dabbles in agility tunnels and low jumps, her true talent is spreading calm, joyful energy wherever she goes. At club events, Bella is the dog who checks on nervous handlers, leans in for quiet hugs, and reminds everyone why we fell in love with dogs in the first place.',
          bioWordCount: 117,
          visibility: 'club_members',
          status: 'draft',
          isLocked: false,
          defaultPhotoUrl: 'https://i.pinimg.com/originals/00/79/7f/00797f9b314a32de4572097ca5d17c37.jpg',
          createdAt: '2025-10-12T14:35:00Z',
          updatedAt: '2026-02-20T09:30:00Z'
        },
        {
          id: 'milo',
          name: 'Milo',
          breedId: 'border_collie',
          birthYear: 2019,
          sectionId: 'agility_stars',
          biography: 'Milo is a quick, thoughtful Border Collie who treats every agility course like a puzzle waiting to be solved. At home he is gentle and affectionate, but the moment we step onto the start line his eyes light up and his tail starts helicoptering. Milo’s favorite obstacles are the weave poles and the A-frame, where he can show off his speed and focus. Outside of training, he loves long off-leash hikes, splashing through creek crossings, and curling up with a chew after a busy day. Milo is my first competition dog and my steady partner in every run.',
          bioWordCount: 98,
          visibility: 'club_members',
          status: 'draft',
          isLocked: false,
          defaultPhotoUrl: 'https://s3.amazonaws.com/cdn-origin-etr.akc.org/wp-content/uploads/2018/03/14150241/border-collie-agility-pole-jump.jpg',
          createdAt: '2025-09-05T11:10:00Z',
          updatedAt: '2026-01-18T16:22:00Z'
        },
        {
          id: 'luna',
          name: 'Luna',
          breedId: 'australian_shepherd',
          birthYear: 2020,
          sectionId: 'companions_families',
          biography: 'Luna is our blue-merle Australian Shepherd with one brown eye, one blue eye, and a bottomless supply of enthusiasm. She is the family clown, always tossing toys in the air or inventing new games with the kids. At the training field, Luna channels that silliness into beautiful heeling, fast recalls, and joyful little hops between exercises. She is learning novice agility and already flies over low jumps with her tail streaming like a flag. At home, Luna is the first one to notice when someone feels sad and quietly leans against their legs.',
          bioWordCount: 93,
          visibility: 'club_members',
          status: 'draft',
          isLocked: false,
          defaultPhotoUrl: 'https://i.pinimg.com/originals/5a/d0/7d/5ad07d3a9a952547bdf1b86e111dce97.jpg',
          createdAt: '2025-11-02T09:45:00Z',
          updatedAt: '2026-02-10T13:05:00Z'
        }
      ],
      spreads: [
        {
          id: 'milo_luna_park_adventures',
          title: 'Milo & Luna: Park Adventures',
          spreadType: 'two_dog_feature',
          layoutId: 'two_dog_classic_200',
          yearbookEditionId: '2025_club_yearbook',
          sectionId: 'companions_families',
          dog1Id: 'milo',
          dog2Id: 'luna',
          text: 'Milo and Luna have turned our neighborhood parks into their own adventure kingdom. Every weekend begins with eager noses pressed to the car windows as we pull into the gravel lot. Milo immediately scans for the nearest open space where he can stretch into a full-speed sprint, tail flying like a banner behind him. Luna, ever the social butterfly, trots toward the families and children, checking in with everyone before she returns to our side. Once we reach the big field, the real fun begins. We set up a few practice jumps, a tunnel, and a low wobble board so the dogs can play at agility without the pressure of a trial. Between runs, they share water bowls, chase leaves, and pose patiently while the kids take photos for the yearbook. These simple park mornings have become our favorite family tradition.',
          textWordCount: 222,
          status: 'complete',
          createdAt: '2026-02-18T10:15:00Z',
          updatedAt: '2026-02-21T09:45:00Z'
        },
        {
          id: 'bella_garden_smiles',
          title: 'Bella: Garden Smiles with Willow',
          spreadType: 'two_dog_feature',
          layoutId: 'two_dog_story_150',
          yearbookEditionId: '2025_club_yearbook',
          sectionId: 'companions_families',
          dog1Id: 'bella',
          dog2Id: 'willow',
          text: 'Bella and Willow are the unofficial gardening committee at our house. Bella supervises from the shade, carefully watching each shovel of dirt, while Willow waits for the magic moment when she is allowed to splash in the watering can. Together they make even routine yard work feel like a celebration. When we bring out the camera, Bella offers her soft golden smile and Willow tilts her head just so, as if she knows this photo might end up in the yearbook. Their favorite time is late evening, when the vegetables are watered, the flowers are glowing, and the last rays of sun turn their fur into halos. In that quiet light, these two gentle companions remind us that the best moments are often slow, simple, and shared.',
          textWordCount: 187,
          status: 'pending_proof',
          createdAt: '2026-01-30T14:20:00Z',
          updatedAt: '2026-02-22T08:05:00Z'
        },
        {
          id: 'nova_zara_speed_demons',
          title: 'Nova & Zara: Little Speed Demons',
          spreadType: 'two_dog_feature',
          layoutId: 'two_dog_premium_200',
          yearbookEditionId: '2025_club_yearbook',
          sectionId: 'agility_stars',
          dog1Id: 'nova',
          dog2Id: 'zara',
          text: 'Nova and Zara prove that small dogs can pack serious power into tiny frames. Nova, with her flashy Sheltie coat and bright eyes, threads the weave poles like a needle, tail flicking in perfect rhythm. Zara charges into every course with terrier confidence, barking happily as she explodes out of tunnels and over jumps. At practice they push each other to be braver and faster. When Zara hesitates on the teeter, Nova demonstrates, calmly holding position until the board touches the ground. When Nova worries about a tight turn, Zara barrels through first, showing that the line really is safe. Their handlers have become close friends, trading training tips and video clips after every run. Together, these little speed demons remind everyone at the club that grit, heart, and partnership matter far more than size.',
          textWordCount: 210,
          status: 'complete',
          createdAt: '2026-01-05T17:40:00Z',
          updatedAt: '2026-02-19T11:30:00Z'
        }
      ],
      yearbook_ad_addons: [],
      yearbook_ads: [
        {
          id: 'bella_2025_half_premium',
          dogProfileId: 'bella',
          yearbookEditionId: '2025_club_yearbook',
          adSizeId: 'half_page_premium_65',
          placementOptionId: 'agility_highlights',
          adText: 'Sweet Bella has a smile that shows up in almost every family photo, so it felt only natural to give her a special place in the yearbook. She may not be the fastest dog on the agility field, but she is always the one cheering the loudest from the sidelines, tail thumping the grass while she waits for her turn. Bella loves swimming, rolling in fresh snow, and sneaking onto the couch for bedtime stories with the kids. This ad is our way of thanking her for every comforting snuggle, muddy paw print, and quiet moment when she simply rests her head in our hands.',
          adTextWordCount: 105,
          proofingMethod: 'print_and_mail',
          basePrice: 65,
          totalPrice: 80,
          status: 'draft',
          createdAt: '2026-01-25T10:15:00Z',
          updatedAt: '2026-02-20T08:40:00Z',
          addonsTotal: 0.0
        },
        {
          id: 'nova_2025_quarter_agility',
          dogProfileId: 'nova',
          yearbookEditionId: '2025_club_yearbook',
          adSizeId: 'quarter_page_35',
          placementOptionId: 'agility_highlights',
          adText: 'Nova is our little rocket in the agility ring, and this ad celebrates the countless hours she has spent learning how to fly over jumps and hold perfect contacts. From her first wobbly puppy tunnel to her latest masters run, Nova always gives her whole heart. She may be small, but her determination, goofy grin, and dramatic victory zoomies make her unforgettable.',
          adTextWordCount: 79,
          proofingMethod: 'online_only',
          basePrice: 35,
          totalPrice: 35,
          status: 'submitted',
          createdAt: '2025-12-01T09:30:00Z',
          updatedAt: '2026-02-01T11:05:00Z',
          addonsTotal: 0.0
        },
        {
          id: 'milo_2025_half_classic',
          dogProfileId: 'milo',
          yearbookEditionId: '2025_club_yearbook',
          adSizeId: 'half_page_classic_55',
          placementOptionId: 'agility_highlights',
          adText: 'To Milo, every start line is the doorway to another grand adventure. He tackles weave poles, tunnels, and tricky lines with the same bright-eyed joy he brings to chasing leaves in the backyard. This year he earned his first titles, but the real victory has been the partnership we have built together. Milo reminds us that even when we miss a cue or drop a bar, we still get to run with our best friend.',
          adTextWordCount: 86,
          proofingMethod: 'online_only',
          basePrice: 55,
          totalPrice: 55,
          status: 'approved',
          createdAt: '2025-11-10T14:05:00Z',
          updatedAt: '2026-02-12T16:20:00Z',
          addonsTotal: 0.0
        }
      ],
      proofs: [
        {
          id: 'proof_bella_profile_2025',
          itemType: 'dog_profile',
          itemId: 'bella',
          title: 'Bella – Profile Proof',
          status: 'pending_review',
          approvalDecision: 'none',
          autoApprovalEnabled: false,
          createdAt: '2026-02-25T09:10:00Z',
          updatedAt: '2026-02-25T09:10:00Z'
        },
        {
          id: 'proof_nova_profile_2025',
          itemType: 'dog_profile',
          itemId: 'nova',
          title: 'Nova – Profile Proof',
          status: 'auto_approved',
          approvalDecision: 'approve_as_is',
          autoApprovalEnabled: true,
          autoApprovalDays: 7,
          autoApprovalDate: '2026-01-29T12:00:00Z',
          createdAt: '2026-01-22T12:00:00Z',
          updatedAt: '2026-01-29T12:05:00Z'
        },
        {
          id: 'proof_rex_profile_2024',
          itemType: 'dog_profile',
          itemId: 'rex',
          title: 'Rex – Profile Proof',
          status: 'approved',
          approvalDecision: 'approve_as_is',
          autoApprovalEnabled: false,
          createdAt: '2025-11-05T15:30:00Z',
          updatedAt: '2025-12-01T10:20:00Z'
        }
      ]
    };

    // Copy generated data into localStorage using correct storage keys
    localStorage.setItem('activity_tags', JSON.stringify(generatedData.activity_tags));
    localStorage.setItem('ad_addons', JSON.stringify(generatedData.ad_addons));
    localStorage.setItem('ad_placement_options', JSON.stringify(generatedData.ad_placement_options));
    localStorage.setItem('ad_sizes', JSON.stringify(generatedData.ad_sizes));
    localStorage.setItem('dog_breeds', JSON.stringify(generatedData.dog_breeds));
    localStorage.setItem('layouts', JSON.stringify(generatedData.layouts));
    localStorage.setItem('shipping_methods', JSON.stringify(generatedData.shipping_methods));
    localStorage.setItem('sponsorship_packages', JSON.stringify(generatedData.sponsorship_packages));
    localStorage.setItem('yearbook_editions', JSON.stringify(generatedData.yearbook_editions));
    localStorage.setItem('yearbook_sections', JSON.stringify(generatedData.yearbook_sections));
    localStorage.setItem('dog_profiles', JSON.stringify(generatedData.dog_profiles));
    localStorage.setItem('spreads', JSON.stringify(generatedData.spreads));
    localStorage.setItem('yearbook_ad_addons', JSON.stringify(generatedData.yearbook_ad_addons));
    localStorage.setItem('yearbook_ads', JSON.stringify(generatedData.yearbook_ads));
    localStorage.setItem('proofs', JSON.stringify(generatedData.proofs));

    // Initialize empty collections for entities not present in generated data
    localStorage.setItem('dog_activities', JSON.stringify([]));
    localStorage.setItem('achievements', JSON.stringify([]));
    localStorage.setItem('yearbook_orders', JSON.stringify([]));
    localStorage.setItem('yearbook_order_items', JSON.stringify([]));
    localStorage.setItem('sponsorships', JSON.stringify([]));
    localStorage.setItem('proof_comments', JSON.stringify([]));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_CreateAgilityDogProfile();
    this.testTask2_UpgradeBellaAd();
    this.testTask3_CreateTwoDogSpread();
    this.testTask4_AddAchievementsAndSort();
    this.testTask5_BellaProofApproval();
    this.testTask6_OrderYearbooks();
    this.testTask7_FinalizeAndLockProfiles();
    this.testTask8_PurchaseSponsorshipForRex();

    return this.results;
  }

  // Task 1: Create a new agility dog profile with a 120–150 word story and 3 activities
  testTask1_CreateAgilityDogProfile() {
    const testName = 'Task 1 - Create agility profile for Riley';
    console.log('Testing:', testName);

    try {
      // Login flow
      const loginResult = this.logic.memberLogin('test_member', 'Password123!');
      this.assert(loginResult && loginResult.success === true, 'Login should succeed for test_member');

      // Get edit data for a new profile
      const editData = this.logic.getDogProfileEditData(null);
      this.assert(editData && editData.breedOptions && editData.sectionOptions, 'Profile edit data should include options');

      const borderCollieOption = editData.breedOptions.find(b => b.name === 'Border Collie') || editData.breedOptions[0];
      this.assert(borderCollieOption, 'Border Collie breed option should be available');

      const agilitySectionOption = editData.sectionOptions.find(s => s.name === 'Agility Stars') || editData.sectionOptions[0];
      this.assert(agilitySectionOption, 'Agility Stars section should be available');

      let visibility = 'club_members';
      if (Array.isArray(editData.visibilityOptions) && editData.visibilityOptions.length > 0) {
        visibility = editData.visibilityOptions.includes('club_members')
          ? 'club_members'
          : editData.visibilityOptions[0];
      }

      // Build a biography around 130 words (between 120 and 150)
      const baseBio = (
        'Riley is a young Border Collie who loves learning new agility skills at the club. ' +
        'In practice, Riley works on weave poles, jumping grids, and tight turns with patience and enthusiasm. ' +
        'Riley enjoys running full courses with focus, driving ahead to each obstacle while still checking in with gentle eye contact. ' +
        'Between training sessions, Riley plays fetch, walks with family, and relaxes on the couch to recover tired muscles. ' +
        'Our goal this year is to enter local trials, support teammates, and celebrate every small success together in the ring and at home.'
      );
      const baseWords = baseBio.split(/\s+/);
      const bioWords = [];
      while (bioWords.length < 130) {
        for (let i = 0; i < baseWords.length && bioWords.length < 130; i++) {
          bioWords.push(baseWords[i]);
        }
      }
      const biography = bioWords.slice(0, 130).join(' ');

      // Search and select exactly three activity tags
      const weaveResults = this.logic.searchActivityTags('Weave');
      const weaveTag = weaveResults && weaveResults.find(t => t.name === 'Weave Poles') || (weaveResults && weaveResults[0]);
      this.assert(weaveTag, 'Weave Poles tag should be found');

      const jumpingResults = this.logic.searchActivityTags('Jump');
      const jumpingTag = jumpingResults && jumpingResults.find(t => t.name === 'Jumping') || (jumpingResults && jumpingResults[0]);
      this.assert(jumpingTag, 'Jumping tag should be found');

      const relayResults = this.logic.searchActivityTags('Relay');
      const relayTag = relayResults && relayResults.find(t => t.name === 'Relay Teams') || (relayResults && relayResults[0]);
      this.assert(relayTag, 'Relay Teams tag should be found');

      const activityTagIds = [weaveTag.id, jumpingTag.id, relayTag.id];

      // Create the new profile for Riley
      const saveResult = this.logic.saveDogProfile({
        id: null,
        name: 'Riley',
        breedId: borderCollieOption.id,
        birthYear: 2021,
        sectionId: agilitySectionOption.id,
        biography: biography,
        visibility: visibility,
        status: 'draft',
        activityTagIds: activityTagIds
      });

      this.assert(saveResult && saveResult.profileId, 'saveDogProfile should return a profileId');
      this.assert(
        typeof saveResult.biographyWordCount === 'number',
        'Biography word count should be returned'
      );
      this.assert(
        saveResult.biographyWordCount >= 120 && saveResult.biographyWordCount <= 150,
        'Biography word count should be between 120 and 150, got ' + saveResult.biographyWordCount
      );
      this.assert(saveResult.activityCount === 3, 'Activity count should be exactly 3, got ' + saveResult.activityCount);

      const rileyId = saveResult.profileId;

      // Verify via detail API
      const detail = this.logic.getDogProfileDetail(rileyId);
      this.assert(detail && detail.profile, 'Dog profile detail should be returned');
      this.assert(detail.profile.name === 'Riley', 'Profile name should be Riley');
      this.assert(
        detail.profile.sectionName === agilitySectionOption.name,
        'Section should be ' + agilitySectionOption.name + ', got ' + detail.profile.sectionName
      );
      this.assert(detail.profile.visibility === visibility, 'Visibility should match chosen value');
      this.assert(
        Array.isArray(detail.activities) && detail.activities.length === 3,
        'Riley should have exactly 3 activities linked'
      );

      // Also verify Riley appears in My Dogs list
      const myDogs = this.logic.getMyDogProfiles(null);
      const rileyRow = myDogs && myDogs.dogs && myDogs.dogs.find(d => d.id === rileyId);
      this.assert(rileyRow, 'Riley should appear in My Dogs list');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Upgrade Bella’s ad to cheapest half-page option under $60 with 100+ words and no add-ons
  testTask2_UpgradeBellaAd() {
    const testName = 'Task 2 - Upgrade Bella ad to cheapest half-page under $60';
    console.log('Testing:', testName);

    try {
      // Navigate through dashboard concepts by fetching ads list
      const adsListResult = this.logic.getYearbookAdsList(null);
      this.assert(adsListResult && Array.isArray(adsListResult.ads), 'Yearbook ads list should be returned');

      const bellaAdRow = adsListResult.ads.find(a => a.dogName === 'Bella');
      this.assert(bellaAdRow, 'Bella ad row should exist in ads list');

      const adId = bellaAdRow.adId;

      // Load ad edit data
      const editData = this.logic.getYearbookAdEditData(adId);
      this.assert(editData && editData.ad && Array.isArray(editData.adSizeOptions), 'Ad edit data should include ad and size options');

      // Find the cheapest half-page option with price <= 60
      const halfPageUnder60 = editData.adSizeOptions
        .filter(o => o.category === 'half_page' && typeof o.price === 'number' && o.price <= 60)
        .sort((a, b) => a.price - b.price);

      this.assert(halfPageUnder60.length > 0, 'There should be at least one half-page option under or equal to $60');
      const chosenSize = halfPageUnder60[0];

      // Find placement option General Dog Tributes
      const generalPlacement = editData.placementOptions.find(p => p.name === 'General Dog Tributes') || editData.placementOptions[0];
      this.assert(generalPlacement, 'General Dog Tributes placement option should be available');

      // Extend Bella’s ad text to stay within 100–130 words
      const originalText = editData.ad.adText || '';
      const extraSentence = ' Bella is a steady, joyful presence at every club event, bringing a calm wag and soft golden smile to nervous handlers and excited kids alike.';
      const updatedText = originalText + extraSentence;

      const saveResult = this.logic.saveYearbookAd({
        id: editData.ad.id,
        adSizeId: chosenSize.id,
        placementOptionId: generalPlacement.id,
        adText: updatedText,
        proofingMethod: 'online_only',
        selectedAddonIds: []
      });

      this.assert(saveResult && saveResult.adId, 'saveYearbookAd should return adId');
      this.assert(
        typeof saveResult.adTextWordCount === 'number',
        'Ad text word count should be returned'
      );
      this.assert(
        saveResult.adTextWordCount >= 100 && saveResult.adTextWordCount < 130,
        'Ad text word count should be between 100 and 129, got ' + saveResult.adTextWordCount
      );

      this.assert(saveResult.basePrice === chosenSize.price, 'Base price should match chosen ad size price');
      this.assert(saveResult.addonsTotal === 0, 'Addons total should be 0 when no add-ons selected');
      this.assert(saveResult.totalPrice <= 60, 'Total ad price should not exceed $60, got ' + saveResult.totalPrice);

      // Reload to verify persisted configuration
      const verifyData = this.logic.getYearbookAdEditData(adId);
      this.assert(verifyData.ad.adSizeId === chosenSize.id, 'Ad size should match chosen half-page option');
      this.assert(verifyData.ad.placementOptionId === generalPlacement.id, 'Placement should be General Dog Tributes');
      this.assert(verifyData.ad.proofingMethod === 'online_only', 'Proofing method should be Online Only');
      this.assert(
        Array.isArray(verifyData.ad.selectedAddonIds) && verifyData.ad.selectedAddonIds.length === 0,
        'No add-ons should be selected on Bella ad'
      );
      this.assert(verifyData.ad.totalPrice <= 60, 'Persisted total price should not exceed $60');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Create a two-dog spread for Milo and Luna using cheapest 2-dog layout (adapted to 150+ words available)
  testTask3_CreateTwoDogSpread() {
    const testName = 'Task 3 - Create two-dog spread for Milo and Luna';
    console.log('Testing:', testName);

    try {
      // Get dog profiles for Milo and Luna
      const dogsResult = this.logic.getMyDogProfiles(null);
      this.assert(dogsResult && Array.isArray(dogsResult.dogs), 'My Dogs list should be returned');

      const miloRow = dogsResult.dogs.find(d => d.name === 'Milo');
      const lunaRow = dogsResult.dogs.find(d => d.name === 'Luna');
      this.assert(miloRow, 'Milo should exist in My Dogs list');
      this.assert(lunaRow, 'Luna should exist in My Dogs list');

      const miloId = miloRow.id;
      const lunaId = lunaRow.id;

      // Find layouts supporting 2 dogs and at least 150 words (adapted from 200+ to available data)
      const layouts = this.logic.searchLayoutsForSpread(
        {
          spreadType: 'two_dog_feature',
          minSupportedDogs: 2,
          minTextWords: 150
        },
        'price_low_to_high'
      );

      this.assert(Array.isArray(layouts) && layouts.length > 0, 'Should find at least one two-dog layout with min text >=150');
      const chosenLayout = layouts[0];

      // Get spread editor data to obtain section options
      const editorData = this.logic.getSpreadEditorData(null);
      this.assert(editorData && Array.isArray(editorData.sectionOptions), 'Spread editor data should include section options');

      const companionsSection = editorData.sectionOptions.find(s => s.name === 'Companions & Families') || editorData.sectionOptions[0];
      this.assert(companionsSection, 'Companions & Families section should be available');

      // Use a narrative text of sufficient length (> chosenLayout.minTextWords)
      const spreadText = 'Milo and Luna have turned our neighborhood parks into their own adventure kingdom. ' +
        'Every weekend begins with eager noses pressed to the car windows as we pull into the gravel lot. ' +
        'Milo immediately scans for the nearest open space where he can stretch into a full-speed sprint, tail flying like a banner behind him. ' +
        'Luna, ever the social butterfly, trots toward the families and children, checking in with everyone before she returns to our side. ' +
        'Once we reach the big field, the real fun begins. We set up a few practice jumps, a tunnel, and a low wobble board so the dogs can play at agility without the pressure of a trial. ' +
        'Between runs, they share water bowls, chase leaves, and pose patiently while the kids take photos for the yearbook. ' +
        'These simple park mornings have become our favorite family tradition, reminding us that the best victories are shared in muddy shoes, tired smiles, and two happily wagging tails.';

      const saveResult = this.logic.saveSpread({
        id: null,
        title: 'Milo & Luna: Park Adventures',
        spreadType: 'two_dog_feature',
        layoutId: chosenLayout.layoutId,
        sectionId: companionsSection.id,
        dog1Id: miloId,
        dog2Id: lunaId,
        text: spreadText
      });

      this.assert(saveResult && saveResult.spreadId, 'saveSpread should return a spreadId');
      this.assert(
        typeof saveResult.textWordCount === 'number',
        'Spread text word count should be returned'
      );
      this.assert(
        saveResult.validation && saveResult.validation.meetsMinTextRequirement === true,
        'Spread should meet minimum text requirement according to validation'
      );
      this.assert(
        saveResult.textWordCount >= chosenLayout.minTextWords,
        'Spread text word count should be >= layout minTextWords; got ' + saveResult.textWordCount + ' vs min ' + chosenLayout.minTextWords
      );

      // Verify spread exists in spreads list
      const spreadsList = this.logic.getSpreadsList({ spreadType: 'two_dog_feature' });
      this.assert(spreadsList && Array.isArray(spreadsList.spreads), 'Spreads list should be returned');
      const createdSpreadRow = spreadsList.spreads.find(s => s.id === saveResult.spreadId);
      this.assert(createdSpreadRow, 'Created Milo & Luna spread should appear in spreads list');
      this.assert(
        createdSpreadRow.sectionName === companionsSection.name,
        'Spread section should be Companions & Families'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Add 4 achievements (adapted to Milo) between 2020–2024 and sort oldest-first
  testTask4_AddAchievementsAndSort() {
    const testName = 'Task 4 - Add 4 achievements for Milo and sort oldest-first';
    console.log('Testing:', testName);

    try {
      // Use existing dog Milo (adapting task from Nova to available data)
      const dogsResult = this.logic.getMyDogProfiles(null);
      this.assert(dogsResult && Array.isArray(dogsResult.dogs), 'My Dogs list should be returned');

      const miloRow = dogsResult.dogs.find(d => d.name === 'Milo');
      this.assert(miloRow, 'Milo should exist for achievements test');
      const miloId = miloRow.id;

      // Add four achievements: two agility, two obedience
      const a1 = this.logic.addDogAchievement(
        miloId,
        'Agility Trial Win',
        'agility',
        '2020-05-10',
        'Milo earned a first place ribbon at a local spring trial.'
      );
      this.assert(a1 && a1.achievementId, 'First agility achievement should be created');

      const a2 = this.logic.addDogAchievement(
        miloId,
        'Agility Speed Title',
        'agility',
        '2021-09-18',
        'Milo completed the runs needed for his first agility title.'
      );
      this.assert(a2 && a2.achievementId, 'Second agility achievement should be created');

      const a3 = this.logic.addDogAchievement(
        miloId,
        'Obedience Fun Match',
        'obedience',
        '2022-03-22',
        'Milo practiced focused heeling and stays at a club fun match.'
      );
      this.assert(a3 && a3.achievementId, 'First obedience achievement should be created');

      const a4 = this.logic.addDogAchievement(
        miloId,
        'Obedience Rally Trial',
        'obedience',
        '2024-01-05',
        'Milo completed a rally course with confident fronts and finishes.'
      );
      this.assert(a4 && a4.achievementId, 'Second obedience achievement should be created');

      // Filter 2020–2024, min events 4, sort oldest-first
      const listResult = this.logic.listDogAchievements(miloId, {
        fromYear: 2020,
        toYear: 2024,
        minEvents: 4,
        sortBy: 'date',
        sortDirection: 'asc'
      });

      this.assert(listResult && Array.isArray(listResult.achievements), 'Achievements list should be returned');
      this.assert(
        listResult.achievements.length >= 4,
        'Should have at least 4 achievements in range, got ' + listResult.achievements.length
      );

      const totals = listResult.totalsInRange || {};
      this.assert(typeof totals.total === 'number', 'Totals in range should be returned');
      this.assert(totals.total >= 4, 'Total achievements in range should be at least 4, got ' + totals.total);
      this.assert(totals.agility >= 2, 'There should be at least 2 agility achievements, got ' + totals.agility);
      this.assert(totals.obedience >= 2, 'There should be at least 2 obedience achievements, got ' + totals.obedience);

      // Verify oldest-first sorting by date
      const ach = listResult.achievements;
      for (let i = 1; i < ach.length; i++) {
        const prev = new Date(ach[i - 1].date);
        const curr = new Date(ach[i].date);
        this.assert(prev <= curr, 'Achievements should be sorted oldest-first by date');
      }

      // Save sort preference
      const sortSave = this.logic.saveDogAchievementsSortPreference(miloId, 'date', 'asc');
      this.assert(sortSave && sortSave.dogProfileId === miloId, 'Sort preference should save for Milo');
      this.assert(sortSave.sortBy === 'date' && sortSave.sortDirection === 'asc', 'Sort preference should be date asc');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Submit proof approval for Bella with editor-only comments and 3-day auto-approval
  testTask5_BellaProofApproval() {
    const testName = 'Task 5 - Bella proof approval with comments and auto-approval';
    console.log('Testing:', testName);

    try {
      const proofsList = this.logic.getProofsList({ itemType: 'dog_profile' });
      this.assert(proofsList && Array.isArray(proofsList.proofs), 'Proofs list should be returned');

      const bellaProofRow = proofsList.proofs.find(p => p.dogName === 'Bella' || (p.itemTitle && p.itemTitle.indexOf('Bella') !== -1));
      this.assert(bellaProofRow, 'Bella profile proof should exist');

      const proofId = bellaProofRow.proofId;

      // Load full proof detail
      const proofDetail = this.logic.getProofDetail(proofId);
      this.assert(proofDetail && proofDetail.proof, 'Proof detail should be returned');

      // Add editor-only comment on main bio
      const editorComment = this.logic.addProofComment(
        proofId,
        'Please soften the wording around her speed so it feels encouraging rather than critical.',
        'editors_only',
        'main_bio'
      );
      this.assert(editorComment && editorComment.commentId, 'Editor-only comment should be created');

      // Add private note in footer
      const privateComment = this.logic.addProofComment(
        proofId,
        'Personal reminder: upload a newer photo of Bella before final print.',
        'private',
        'footer'
      );
      this.assert(privateComment && privateComment.commentId, 'Private comment should be created');

      // Update approval to Approve with Changes and enable auto-approval in 3 days
      const approvalUpdate = this.logic.updateProofApproval(
        proofId,
        'approve_with_changes',
        true,
        3
      );

      this.assert(approvalUpdate && approvalUpdate.proofId === proofId, 'Approval update should return correct proofId');
      this.assert(
        approvalUpdate.approvalDecision === 'approve_with_changes',
        'Approval decision should be approve_with_changes'
      );
      this.assert(approvalUpdate.autoApprovalEnabled === true, 'Auto-approval should be enabled');
      this.assert(approvalUpdate.autoApprovalDays === 3, 'Auto-approval days should be set to 3');
      this.assert(approvalUpdate.autoApprovalDate, 'Auto-approval date should be calculated');

      // Re-fetch to confirm persisted
      const verifyDetail = this.logic.getProofDetail(proofId);
      this.assert(
        verifyDetail.proof.approvalDecision === 'approve_with_changes',
        'Persisted approval decision should be approve_with_changes'
      );
      this.assert(
        verifyDetail.proof.autoApprovalEnabled === true && verifyDetail.proof.autoApprovalDays === 3,
        'Persisted auto-approval settings should match 3-day window'
      );

      // Confirm comments are present with correct visibilities
      const comments = verifyDetail.comments || [];
      const hasEditorOnly = comments.some(c => c.visibility === 'editors_only');
      const hasPrivate = comments.some(c => c.visibility === 'private');
      this.assert(hasEditorOnly, 'At least one editors-only comment should exist on proof');
      this.assert(hasPrivate, 'At least one private comment should exist on proof');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Order 3 softcover yearbooks with cheapest shipping under $10 and pay by invoice
  testTask6_OrderYearbooks() {
    const testName = 'Task 6 - Order 3 softcover 2025 yearbooks with cheap shipping and invoice payment';
    console.log('Testing:', testName);

    try {
      // Get yearbook edition and binding options
      const options = this.logic.getYearbookOrderOptions();
      this.assert(options && Array.isArray(options.editionOptions), 'Yearbook edition options should be returned');
      this.assert(Array.isArray(options.bindingOptions), 'Binding options should be returned');

      const edition2025 = options.editionOptions.find(e => e.name === '2025 Club Yearbook');
      this.assert(edition2025, '2025 Club Yearbook edition should be available');

      this.assert(options.bindingOptions.indexOf('softcover') !== -1, 'Softcover binding should be supported');

      const editionId = edition2025.id;
      const quantity = 3;
      const binding = 'softcover';

      // Get shipping options and find cheapest under $10
      const shippingOptions = this.logic.getShippingOptionsForOrder(editionId, quantity, binding);
      this.assert(Array.isArray(shippingOptions) && shippingOptions.length > 0, 'Shipping options should be returned');

      const underTen = shippingOptions.filter(o => typeof o.calculatedCost === 'number' && o.calculatedCost < 10);
      this.assert(underTen.length > 0, 'There should be at least one shipping option under $10');

      underTen.sort((a, b) => a.calculatedCost - b.calculatedCost);
      const chosenShipping = underTen[0];

      // Place order with pay-later invoice
      const orderResult = this.logic.placeYearbookOrder(
        editionId,
        quantity,
        binding,
        chosenShipping.shippingMethodId,
        'pay_later_invoice'
      );

      this.assert(orderResult && orderResult.orderId, 'Order should be created with an orderId');
      this.assert(orderResult.editionName === edition2025.name, 'Order edition name should match selected edition');
      this.assert(orderResult.quantity === quantity, 'Order quantity should be 3');
      this.assert(orderResult.binding === binding, 'Order binding should be softcover');
      this.assert(orderResult.shippingMethodName === chosenShipping.name, 'Order shipping method should match chosen method');
      this.assert(
        typeof orderResult.shippingCost === 'number' && orderResult.shippingCost === chosenShipping.calculatedCost,
        'Order shipping cost should equal chosen shipping option cost'
      );
      this.assert(
        typeof orderResult.subtotal === 'number' && orderResult.subtotal > 0,
        'Subtotal should be positive'
      );
      this.assert(
        typeof orderResult.total === 'number' && orderResult.total > orderResult.subtotal,
        'Total should be greater than subtotal when shipping is added'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Finalize only dog profiles with bios of 80+ words and lock them
  testTask7_FinalizeAndLockProfiles() {
    const testName = 'Task 7 - Finalize and lock only profiles with 80+ word bios';
    console.log('Testing:', testName);

    try {
      const dogsResult = this.logic.getMyDogProfiles(null);
      this.assert(dogsResult && Array.isArray(dogsResult.dogs), 'My Dogs list should be returned');

      const finalIds = [];
      for (const dog of dogsResult.dogs) {
        const targetStatus = dog.bioWordCount >= 80 ? 'final' : 'draft';
        const updateResult = this.logic.updateDogProfileStatus(dog.id, targetStatus);
        this.assert(updateResult && updateResult.dogProfileId === dog.id, 'Status update should return dogProfileId');
        this.assert(updateResult.status === targetStatus, 'Status should update to ' + targetStatus);
        if (targetStatus === 'final') {
          finalIds.push(dog.id);
        }
      }

      this.assert(finalIds.length > 0, 'There should be at least one profile with bioWordCount >= 80 to finalize');

      // Lock only final profiles via bulk action
      const lockResult = this.logic.bulkLockFinalDogProfiles(finalIds);
      this.assert(lockResult && Array.isArray(lockResult.lockedProfiles), 'Bulk lock result should include lockedProfiles array');

      const lockedMap = {};
      for (const lp of lockResult.lockedProfiles) {
        lockedMap[lp.dogProfileId] = lp;
      }

      for (const id of finalIds) {
        const lp = lockedMap[id];
        this.assert(lp && lp.wasLocked === true, 'Final profile ' + id + ' should be locked');
      }

      // Verify final profiles are locked in My Dogs list
      const finalDogsResult = this.logic.getMyDogProfiles({ status: 'final' });
      this.assert(finalDogsResult && Array.isArray(finalDogsResult.dogs), 'Final-only My Dogs list should be returned');
      for (const dog of finalDogsResult.dogs) {
        this.assert(dog.isLocked === true, 'Final profile ' + dog.name + ' should be marked as locked');
        this.assert(dog.bioWordCount >= 80, 'Locked profile ' + dog.name + ' should have bioWordCount >= 80');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Purchase most expensive sponsorship package under $75 and assign it to Rex
  testTask8_PurchaseSponsorshipForRex() {
    const testName = 'Task 8 - Purchase sponsorship under $75 for Rex';
    console.log('Testing:', testName);

    try {
      // Ensure a dog profile for Rex exists (create if missing)
      let dogsResult = this.logic.getMyDogProfiles(null);
      this.assert(dogsResult && Array.isArray(dogsResult.dogs), 'My Dogs list should be returned');

      let rexRow = dogsResult.dogs.find(d => d.name === 'Rex');
      if (!rexRow) {
        // Create Rex profile
        const editData = this.logic.getDogProfileEditData(null);
        this.assert(editData && Array.isArray(editData.breedOptions) && Array.isArray(editData.sectionOptions), 'Profile edit data should be available for Rex');

        const someBreed = editData.breedOptions[0];
        const companionsSection = editData.sectionOptions.find(s => s.name === 'Companions & Families') || editData.sectionOptions[0];
        let visibility = 'club_members';
        if (Array.isArray(editData.visibilityOptions) && editData.visibilityOptions.length > 0) {
          visibility = editData.visibilityOptions.includes('club_members')
            ? 'club_members'
            : editData.visibilityOptions[0];
        }

        const rexBio = 'Rex is a cheerful family dog who supports us at home and at the club. He loves jogging, hiking, and learning new tricks with patient practice. Rex enjoys greeting volunteers, watching runs from the sidelines, and curling up for quiet naps after long training days.';

        const saveResult = this.logic.saveDogProfile({
          id: null,
          name: 'Rex',
          breedId: someBreed.id,
          birthYear: 2018,
          sectionId: companionsSection.id,
          biography: rexBio,
          visibility: visibility,
          status: 'draft',
          activityTagIds: []
        });

        this.assert(saveResult && saveResult.profileId, 'Rex profile should be created');

        // Reload My Dogs list to get Rex row with section and word count
        dogsResult = this.logic.getMyDogProfiles(null);
        rexRow = dogsResult.dogs.find(d => d.id === saveResult.profileId);
      }

      this.assert(rexRow, 'Rex profile should now exist for sponsorship');
      const rexId = rexRow.id;

      // Get sponsorship packages sorted by price low to high
      const packages = this.logic.getSponsorshipPackages('price_low_to_high');
      this.assert(Array.isArray(packages) && packages.length > 0, 'Sponsorship packages should be returned');

      // Find most expensive package priced at or under $75
      let chosenPackage = null;
      for (const pkg of packages) {
        if (typeof pkg.price === 'number' && pkg.price <= 75) {
          if (!chosenPackage || pkg.price > chosenPackage.price) {
            chosenPackage = pkg;
          }
        }
      }
      this.assert(chosenPackage, 'There should be at least one sponsorship package under or equal to $75');

      const sponsorMessage = 'The Miller Family proudly celebrates Rex and the club community he enjoys so much, supporting the friends, volunteers, and trainers who help every team grow with patience, kindness, and shared joy in each run.';

      const sponsorshipResult = this.logic.createSponsorship(
        chosenPackage.packageId,
        rexId,
        'The Miller Family',
        sponsorMessage
      );

      this.assert(sponsorshipResult && sponsorshipResult.sponsorshipId, 'Sponsorship should be created with an ID');
      this.assert(
        typeof sponsorshipResult.sponsorMessageWordCount === 'number',
        'Sponsor message word count should be returned'
      );
      this.assert(
        sponsorshipResult.sponsorMessageWordCount >= 30 && sponsorshipResult.sponsorMessageWordCount <= 40,
        'Sponsor message word count should be between 30 and 40, got ' + sponsorshipResult.sponsorMessageWordCount
      );
      this.assert(
        sponsorshipResult.totalPrice === chosenPackage.price,
        'Sponsorship total price should match chosen package price'
      );
      this.assert(sponsorshipResult.status, 'Sponsorship status should be set');

      // Verify via sponsorships list
      const sponsorshipsList = this.logic.getSponsorshipsList();
      this.assert(sponsorshipsList && Array.isArray(sponsorshipsList.sponsorships), 'Sponsorships list should be returned');

      const createdRow = sponsorshipsList.sponsorships.find(s => s.sponsorshipId === sponsorshipResult.sponsorshipId);
      this.assert(createdRow, 'Created sponsorship should appear in sponsorships list');
      this.assert(createdRow.dogName === rexRow.name, 'Sponsorship should be associated with Rex');
      this.assert(createdRow.packageName === chosenPackage.name, 'Sponsorship package name should match chosen package');

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

// Export for Node.js ONLY (CommonJS)
module.exports = TestRunner;
