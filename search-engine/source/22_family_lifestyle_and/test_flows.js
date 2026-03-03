// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    // BusinessLogic is expected to be available in the environment
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
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
    // IMPORTANT: Use the Generated Data (adapted to JS literals) only here
    const generatedData = {
      activities: [
        {
          id: 'act_rainy_pillow_fort',
          title: 'Rainy Day Pillow Fort Adventure',
          summary: 'Build a cozy indoor fort and turn it into a storytelling and snack nook.',
          description:
            'Transform your living room into a magical hideout using pillows, blankets, and chairs. Kids help design and build the fort, then enjoy story time, quiet play, or a snack inside.',
          imageUrl:
            'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&h=600&fit=crop&auto=format&q=80',
          ageGroup: 'years_5_8',
          minAge: 5,
          maxAge: 8,
          location: 'indoors',
          costType: 'free',
          costAmount: 0,
          durationMinutes: 45,
          materials: [
            'Pillows',
            'Blankets or sheets',
            'Chairs or couch',
            'Flashlight or string lights (optional)',
            'Books or quiet toys'
          ],
          instructions: [
            'Clear a safe area in the living room by moving small tables or breakable items.',
            'Invite kids to help gather pillows, blankets, and chairs.',
            'Work together to drape blankets over the chairs and couch to form a fort structure.',
            'Add pillows inside for comfy seating and bring in a flashlight or string lights if desired.',
            'Let kids choose a few books or quiet toys to enjoy inside the fort.',
            'End the activity with a short tidy-up, putting all pillows and blankets back.'
          ],
          tags: ['rainy_day', 'cozy', 'imaginative_play', 'indoor_fun'],
          createdAt: '2024-09-15T10:00:00Z',
          updatedAt: '2025-01-05T12:30:00Z'
        },
        {
          id: 'act_diy_storytelling_circle',
          title: 'DIY Storytelling Circle',
          summary: 'Take turns adding silly twists to a shared family story.',
          description:
            'This simple storytelling game gets everyone laughing and practicing creativity. Each person adds a sentence to an ongoing story using picture prompts or random words.',
          imageUrl:
            'https://www.5minutesformom.com/wp-content/uploads/2018/04/circleround2-1024x683.jpg',
          ageGroup: 'years_5_8',
          minAge: 5,
          maxAge: 8,
          location: 'indoors',
          costType: 'free',
          costAmount: 0,
          durationMinutes: 30,
          materials: ['Paper', 'Markers or crayons', 'Small bowl or basket'],
          instructions: [
            'Sit in a circle on the floor or around a table.',
            'Ask each person to draw or write one simple word on a small piece of paper, then fold it and put it in the bowl.',
            'Choose one person to start the story using the phrase Once upon a time....',
            'Pass the bowl around; each person draws a word and must include it in their next sentence of the story.',
            'Continue until everyone has had several turns or until the story naturally comes to an end.',
            'Invite kids to give the story a title and, if they want, draw a quick cover picture.'
          ],
          tags: ['creative_writing', 'language_skills', 'rainy_day', 'indoor_fun'],
          createdAt: '2024-10-02T15:20:00Z',
          updatedAt: '2025-02-10T09:45:00Z'
        },
        {
          id: 'act_shape_hunt_scavenger',
          title: 'Shape Hunt Indoor Scavenger Game',
          summary: 'Kids race to find objects that match different shapes around the house.',
          description:
            'Turn a rainy afternoon into a playful math game. Children search for circles, squares, rectangles, and triangles using a simple checklist.',
          imageUrl: 'https://edc.org/sites/default/files/SEL-Mathematics.jpg',
          ageGroup: 'years_5_8',
          minAge: 5,
          maxAge: 8,
          location: 'indoors',
          costType: 'free',
          costAmount: 0,
          durationMinutes: 40,
          materials: ['Paper shape checklist', 'Pencil or crayon', 'Timer (optional)'],
          instructions: [
            'Create a simple checklist with shapes like circles, squares, rectangles, and triangles with a few boxes next to each.',
            'Explain that kids will search for household objects that match each shape.',
            'Set a timer for 5–10 minutes and start the shape hunt.',
            'When time is up, gather together and have each child share what they found for each shape.',
            'Count how many items match each shape and talk about where shapes show up in everyday life.',
            'Optional: Repeat with colors or textures for an extra round.'
          ],
          tags: ['math_skills', 'indoor_game', 'rainy_day', 'scavenger_hunt'],
          createdAt: '2024-11-10T11:00:00Z',
          updatedAt: '2025-01-20T08:15:00Z'
        }
      ],
      products: [
        {
          id: 'family_yoga_mat_cloud',
          name: 'CloudSoft Family Yoga Mat',
          slug: 'cloudsoft-family-yoga-mat',
          description:
            'An extra-long, extra-wide yoga mat designed for family stretches and playful poses. Non-slip surface, easy to wipe clean, and thick enough for toddler tumbles.',
          imageUrl:
            'https://pd12m.s3.us-west-2.amazonaws.com/images/64b7ab8e-3478-5329-ab84-3ee8a8e00703.jpeg',
          category: 'fitness_and_yoga',
          subcategory: 'yoga_mats',
          price: 49.99,
          currency: 'USD',
          rating: 4.8,
          ratingCount: 214,
          features: [
            'Extra-large 80 x 36 surface for family use',
            '8mm cushioning for joint comfort',
            'Non-slip, sweat-resistant texture',
            'Rolls up with included carrying strap',
            'Wipes clean with mild soap and water'
          ],
          tags: ['family_yoga_mat', 'home_workout', 'kids_friendly', 'non_toxic'],
          isFamilyFocused: true,
          createdAt: '2024-06-10T10:00:00Z',
          updatedAt: '2025-01-15T12:30:00Z'
        },
        {
          id: 'family_yoga_mat_play',
          name: 'Play & Stretch Kids + Parents Yoga Mat',
          slug: 'play-and-stretch-kids-parents-yoga-mat',
          description:
            'A playful, double-sided yoga mat with game prompts and pose illustrations to keep kids engaged during family yoga time.',
          imageUrl:
            'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=800&h=600&fit=crop&auto=format&q=80',
          category: 'fitness_and_yoga',
          subcategory: 'yoga_mats',
          price: 39.95,
          currency: 'USD',
          rating: 4.7,
          ratingCount: 162,
          features: [
            'Printed with kid-friendly yoga poses and simple prompts',
            'Reversible design with calm, solid color on the back',
            'Lightweight and easy for kids to carry',
            'Made from PVC-free, non-toxic materials',
            'Includes digital guide for 15-minute family routines'
          ],
          tags: ['family_yoga_mat', 'kids_yoga', 'mindfulness', 'family_workout'],
          isFamilyFocused: true,
          createdAt: '2024-07-05T11:15:00Z',
          updatedAt: '2025-01-20T09:45:00Z'
        },
        {
          id: 'family_yoga_mat_pro',
          name: 'Family Flow Pro Yoga Mat',
          slug: 'family-flow-pro-yoga-mat',
          description:
            'A studio-grade family yoga mat with extra grip, ideal for parents who practice regularly with kids.',
          imageUrl:
            'https://cdn.shopify.com/s/files/1/0041/7205/4626/files/home_yoga_practice_with_cork_yoga_mat_1024x1024.jpg?v=1555755377',
          category: 'fitness_and_yoga',
          subcategory: 'yoga_mats',
          price: 69.0,
          currency: 'USD',
          rating: 4.9,
          ratingCount: 88,
          features: [
            'High-density rubber for superior grip',
            'Eco-conscious, recyclable materials',
            'Laser-etched alignment guides for poses',
            'Long-lasting durability for daily practice',
            'Includes strap and storage bag'
          ],
          tags: ['family_yoga_mat', 'premium', 'home_studio'],
          isFamilyFocused: true,
          createdAt: '2024-08-01T14:25:00Z',
          updatedAt: '2025-01-25T16:05:00Z'
        }
      ],
      reading_lists: [
        {
          id: 'default_reading_list',
          name: 'Reading List',
          description: 'Your saved articles and resources for later reading.',
          source: 'system_default',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z'
        },
        {
          id: 'mindfulness_reads',
          name: 'Mindfulness & Wellbeing Reads',
          description: 'Articles and guides to support calm, connection, and self-care.',
          source: 'user_created',
          createdAt: '2024-09-10T14:20:00Z',
          updatedAt: '2025-02-05T11:35:00Z'
        },
        {
          id: 'parenting_toolkit',
          name: 'Parenting Toolkit',
          description: 'Saved parenting strategies, scripts, and how-to guides.',
          source: 'user_created',
          createdAt: '2024-11-03T09:10:00Z',
          updatedAt: '2025-01-18T18:45:00Z'
        }
      ],
      recipes: [
        {
          id: 'dinner_lemon_herb_chicken',
          title: 'One-Pan Lemon Herb Chicken & Veggies',
          slug: 'one-pan-lemon-herb-chicken-veggies',
          description:
            'A quick, low-calorie sheet-pan dinner with juicy chicken and colorful veggies that the whole family will love.',
          imageUrl:
            'https://thecleaneatingcouple.com/wp-content/uploads/2019/10/healthy-sheet-pan-dinners-5-683x1024.jpg',
          mealType: 'dinner',
          prepTimeMinutes: 10,
          cookTimeMinutes: 30,
          totalTimeMinutes: 40,
          servings: 4,
          caloriesPerServing: 420,
          rating: 4.9,
          ratingCount: 326,
          healthTags: ['low_calorie', 'high_protein', 'gluten_free'],
          ingredients: [
            '4 small boneless, skinless chicken breasts',
            '2 cups broccoli florets',
            '1 red bell pepper, sliced',
            '1 yellow bell pepper, sliced',
            '2 tbsp olive oil',
            '2 tbsp lemon juice',
            '1 tsp dried oregano',
            '1 tsp dried thyme',
            '1/2 tsp garlic powder',
            'Salt and pepper to taste'
          ],
          instructions: [
            'Preheat the oven to 400°F (200°C) and line a large sheet pan with parchment.',
            'Place chicken breasts in the center of the pan and scatter chopped vegetables around them.',
            'Whisk together olive oil, lemon juice, oregano, thyme, garlic powder, salt, and pepper.',
            'Drizzle the mixture over the chicken and veggies, tossing the vegetables to coat.',
            'Bake for 25–30 minutes, or until the chicken reaches 165°F and vegetables are tender.',
            'Let rest 5 minutes, then slice chicken and serve with pan juices spooned over the top.'
          ],
          nutritionSummary:
            'Approx. 420 calories, 38g protein, 13g carbs, 22g fat per serving.',
          tags: ['sheet_pan', 'weeknight_dinner', 'quick', 'family_friendly'],
          createdAt: '2024-09-12T10:00:00Z',
          updatedAt: '2025-01-14T09:30:00Z'
        },
        {
          id: 'dinner_turkey_taco_lettuce_wraps',
          title: '30-Minute Turkey Taco Lettuce Wraps',
          slug: '30-minute-turkey-taco-lettuce-wraps',
          description:
            'All the taco flavors kids love, served in crunchy lettuce cups for a lighter family dinner.',
          imageUrl:
            'https://hips.hearstapps.com/hmg-prod.s3.amazonaws.com/images/best-black-bean-recipes-turkey-taco-lettuce-wraps-1626896533.jpeg?crop=1.00xw:0.672xh;0,0.207xh&resize=640:*',
          mealType: 'dinner',
          prepTimeMinutes: 10,
          cookTimeMinutes: 20,
          totalTimeMinutes: 30,
          servings: 4,
          caloriesPerServing: 380,
          rating: 4.8,
          ratingCount: 289,
          healthTags: ['low_calorie', 'high_protein'],
          ingredients: [
            '1 lb lean ground turkey',
            '1 tbsp olive oil',
            '1 small onion, diced',
            '2 cloves garlic, minced',
            '2 tbsp taco seasoning (low sodium)',
            '1/2 cup tomato sauce',
            '1 head romaine or butter lettuce, leaves separated',
            '1/2 cup shredded cheese',
            '1/2 cup diced tomatoes',
            '1/4 cup plain Greek yogurt or sour cream'
          ],
          instructions: [
            'Heat olive oil in a large skillet over medium heat.',
            'Add onion and cook 3–4 minutes until softened, then stir in garlic.',
            'Add ground turkey and cook, breaking it up, until no longer pink.',
            'Stir in taco seasoning and tomato sauce; simmer 5 minutes.',
            'Arrange lettuce leaves on a platter and spoon turkey mixture into each leaf.',
            'Top with cheese, tomatoes, and a dollop of yogurt or sour cream before serving.'
          ],
          nutritionSummary:
            'Approx. 380 calories, 33g protein, 12g carbs, 20g fat per serving.',
          tags: ['tacos', 'kid_favorite', 'gluten_free', 'weeknight_dinner'],
          createdAt: '2024-08-20T12:15:00Z',
          updatedAt: '2025-01-10T11:40:00Z'
        },
        {
          id: 'dinner_garlic_shrimp_zoodle',
          title: 'Garlic Shrimp Zucchini Pasta',
          slug: 'garlic-shrimp-zucchini-pasta',
          description:
            'A light, garlicky shrimp dinner tossed with zucchini noodles for a veggie-packed meal.',
          imageUrl:
            'https://images.unsplash.com/photo-1604908176997-1251884b08a3?w=800&h=600&fit=crop&auto=format&q=80',
          mealType: 'dinner',
          prepTimeMinutes: 10,
          cookTimeMinutes: 15,
          totalTimeMinutes: 25,
          servings: 4,
          caloriesPerServing: 310,
          rating: 4.8,
          ratingCount: 174,
          healthTags: ['low_calorie', 'high_protein', 'gluten_free'],
          ingredients: [
            '1 lb large shrimp, peeled and deveined',
            '4 medium zucchini, spiralized',
            '2 tbsp olive oil',
            '3 cloves garlic, minced',
            '1/4 tsp red pepper flakes (optional)',
            'Juice of 1 lemon',
            'Salt and pepper to taste',
            '2 tbsp chopped fresh parsley',
            '2 tbsp grated Parmesan cheese (optional)'
          ],
          instructions: [
            'Pat shrimp dry and season with salt and pepper.',
            'Heat 1 tbsp olive oil in a large skillet over medium-high heat.',
            'Add shrimp and cook 2–3 minutes per side until pink and opaque; transfer to a plate.',
            'Reduce heat to medium, add remaining oil and garlic, and cook 30 seconds until fragrant.',
            'Add zucchini noodles and toss 2–3 minutes until just tender.',
            'Return shrimp to the pan, stir in lemon juice, red pepper flakes, and parsley; toss to combine and serve with Parmesan if using.'
          ],
          nutritionSummary:
            'Approx. 310 calories, 32g protein, 8g carbs, 16g fat per serving.',
          tags: ['zoodles', 'seafood', 'quick', 'weeknight_dinner'],
          createdAt: '2024-10-05T17:40:00Z',
          updatedAt: '2025-02-02T18:10:00Z'
        }
      ],
      articles: [
        {
          id: 'art_family_mindfulness_10min',
          title: 'Beginner Family Mindfulness Routine: 10 Minutes to Unwind Together',
          slug: 'beginner-family-mindfulness-routine-10-minutes',
          summary:
            'A simple, beginner-friendly family mindfulness routine you can do in 10–15 minutes with kids of different ages.',
          content:
            'This beginner family mindfulness routine is designed for busy evenings when everyone is a little tired and a little wired. You do not need special cushions, apps, or candles—just a few minutes of shared attention. The goal is not quiet perfection; the goal is to practice noticing your bodies and feelings together.\n\nStep 1 (3 minutes): Get comfortable in a circle on the floor or around the couch. Invite everyone to place a hand on their belly and take five slow breaths, feeling the hand move in and out. You can cue kids with phrases like, Smell the flower on the inhale and Blow out the candle on the exhale.\n\nStep 2 (4 minutes): Do a short senses check-in. Ask, What are three things you can see right now? Two things you can hear? One thing you can feel on your skin? Go around the circle, letting each person share if they want to. There are no wrong answers—curiosity is the point.\n\nStep 3 (3–5 minutes): End with a simple gratitude and preview. Each person shares one small thing they are grateful for from today and one thing they are looking forward to tomorrow. Keep the pace gentle, especially with younger kids, and allow anyone to pass.\n\nYou can repeat this family mindfulness routine a few evenings each week. Over time, kids begin to recognize it as a signal that the day is winding down, and parents get a built-in pause before the bedtime rush. If you miss a night, simply pick it up again without guilt—the practice is there to support your family, not add pressure.',
          imageUrl:
            'https://trustmark.com/content/dam/trustmark/wealth/private-banking/private-banking-accounts_3_medium.jpg',
          category: 'wellbeing',
          level: 'beginner',
          ageGroup: 'all_ages',
          sessionLengthMinutes: 12,
          publishDate: '2025-05-10T10:00:00Z',
          authorName: 'Leah Martin',
          tags: [
            'mindfulness',
            'family_mindfulness_routine',
            'evening_ritual',
            'beginner'
          ],
          isFeatured: true,
          createdAt: '2025-05-01T09:00:00Z',
          updatedAt: '2025-12-15T08:30:00Z',
          commentCount: 10
        },
        {
          id: 'art_family_mindfulness_20min',
          title: 'Level Up Your Family Mindfulness: A 20-Minute Weekend Reset',
          slug: 'family-mindfulness-20-minute-weekend-reset',
          summary:
            'An intermediate family mindfulness flow for weekends when you have a bit more time to slow down together.',
          content:
            'Once a basic 10-minute practice feels comfortable, your family may be ready for a slightly longer weekend mindfulness reset. This 20-minute flow weaves together breathing, light movement, and reflection so kids do not have to sit still the entire time.\n\nBegin with five minutes of gentle stretching—reach for the sky, fold to touch toes, and circle shoulders. Then move into a short body scan where you invite kids to imagine a warm flashlight of attention moving from their toes to their head. Finish with a guided visualization, such as visiting a calm place in their imagination where they can return mentally before tests, games, or bedtime.\n\nAs children grow, you can invite them to help lead parts of the routine, choosing stretches or questions for the reflection round. Let the practice evolve with your family rather than trying to make it perfect. The real skill is noticing together when you feel overwhelmed and choosing to pause.',
          imageUrl:
            'https://empoweryourwellness.online/wp-content/uploads/2020/08/Childspose-1024x768.jpg',
          category: 'wellbeing',
          level: 'intermediate',
          ageGroup: 'all_ages',
          sessionLengthMinutes: 20,
          publishDate: '2023-11-02T09:30:00Z',
          authorName: 'Leah Martin',
          tags: ['mindfulness', 'family_routine', 'weekend_reset'],
          isFeatured: false,
          createdAt: '2023-10-20T08:30:00Z',
          updatedAt: '2024-12-01T07:45:00Z',
          commentCount: 0
        },
        {
          id: 'art_screen_time_rules_9_12',
          title: 'Screen Time Rules That Work for Ages 9–12',
          slug: 'screen-time-rules-that-work-ages-9-12',
          summary:
            'Practical, age-specific screen time rules for 9–12 year olds, plus a sample family agreement you can adapt.',
          content:
            'Between ages 9 and 12, kids are beginning to text friends, play online games, and use school devices more independently. Simple no screens rules rarely work at this stage. Instead, focus on clear expectations, shared problem-solving, and a written family agreement everyone can see.\n\nStart by talking about your values: sleep, school focus, family time, and friendships. Together with your child, list times when screens are okay (for example, after homework, on weekend mornings) and times when screens are off-limits (during meals, overnight, before school). Aim for rules that are specific, such as No personal devices in bedrooms overnight rather than Use screens wisely.\n\nNext, create a one-page family agreement. Include limits on daily entertainment screen time, where devices are stored at night, how new apps or games are approved, and what happens if a rule is broken. Invite your child to suggest at least one rule that supports their own wellbeing—like If I feel overwhelmed by group chats, I can take a 24-hour break. Post the agreement where everyone can see it and revisit it every few months as school demands, sports, and friendships change.\n\nFinally, model the behavior you want to see. If you ask kids to park phones during dinner, do the same yourself. Consistency makes your screen time rules feel fair and builds trust, especially for this age group, who are paying close attention to what adults actually do.',
          imageUrl:
            'https://cdn.shopify.com/s/files/1/0257/4614/5368/articles/1_ce9eff0e-a1f8-4866-af73-9e8318c0808e_2048x.PNG?v=1589071656',
          category: 'parenting',
          level: 'beginner',
          ageGroup: 'years_9_12',
          sessionLengthMinutes: 8,
          publishDate: '2025-11-03T14:15:00Z',
          authorName: 'Marcus Chen',
          tags: [
            'screen_time_rules',
            'digital_parenting',
            'family_agreement',
            'tweens'
          ],
          isFeatured: true,
          createdAt: '2025-10-20T09:15:00Z',
          updatedAt: '2026-01-05T10:40:00Z',
          commentCount: 3
        }
      ],
      comments: [
        {
          id: 'c_mind_01',
          articleId: 'art_family_mindfulness_10min',
          authorName: 'Rachel',
          text:
            'We tried this routine before bed tonight and my kids actually asked for an extra round of the senses check-in. I loved how simple it was to follow without needing a script.',
          createdAt: '2025-05-12T19:45:00Z',
          isApproved: true
        },
        {
          id: 'c_mind_02',
          articleId: 'art_family_mindfulness_10min',
          authorName: 'Amit',
          text:
            'The smell the flower, blow out the candle cue finally clicked for my 4-year-old. This made mindfulness feel doable instead of like another big project.',
          createdAt: '2025-05-14T07:15:00Z',
          isApproved: true
        },
        {
          id: 'c_mind_03',
          articleId: 'art_family_mindfulness_10min',
          authorName: 'Claire',
          text:
            'I appreciate the reminder that missing a night isn’t failure. Taking that pressure off is what convinced my partner to try this with us.',
          createdAt: '2025-05-16T21:05:00Z',
          isApproved: true
        }
      ]
    };

    // Copy data to localStorage using correct storage keys
    localStorage.setItem('activities', JSON.stringify(generatedData.activities || []));
    localStorage.setItem('products', JSON.stringify(generatedData.products || []));
    localStorage.setItem('reading_lists', JSON.stringify(generatedData.reading_lists || []));
    localStorage.setItem('recipes', JSON.stringify(generatedData.recipes || []));
    localStorage.setItem('articles', JSON.stringify(generatedData.articles || []));
    localStorage.setItem('comments', JSON.stringify(generatedData.comments || []));

    // Ensure other collections exist as empty arrays/objects if not already
    const emptyKeys = [
      'recipe_collections',
      'recipe_collection_items',
      'activity_lists',
      'activity_list_items',
      'reading_list_items',
      'product_lists',
      'product_list_items',
      'planner_plans',
      'planner_plan_items',
      'wellness_budgets',
      'wellness_budget_categories',
      'newsletter_preferences'
    ];

    emptyKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SaveWeeknightDinnersCollection();
    this.testTask2_CreateRainyDayPlanList();
    this.testTask3_BookmarkMindfulnessArticle();
    this.testTask4_AddCheaperYogaMatToHomeGymList();
    this.testTask5_SetNewsletterPreferences();
    this.testTask6_PostScreenTimeComment();
    this.testTask7_BuildWeekendFunPlan();
    this.testTask8_CreateMonthlyWellnessBudget();

    return this.results;
  }

  // Task 1: Save 3 dinner recipes into Weeknight Dinners collection
  testTask1_SaveWeeknightDinnersCollection() {
    const testName = 'Task 1: Save 3 quick, low-calorie family dinner recipes to Weeknight Dinners collection';

    try {
      // Filter dinner recipes per requirements
      const listResult = this.logic.listRecipes(
        'dinner', // mealType
        45, // maxCookTimeMinutes
        undefined, // maxPrepTimeMinutes
        undefined, // maxTotalTimeMinutes
        600, // maxCaloriesPerServing
        4.0, // minRating
        4, // servings
        undefined, // healthTag
        'rating_desc', // sortBy
        1, // page
        20 // pageSize
      );

      const recipes = (listResult && listResult.recipes) || [];
      this.assert(recipes.length >= 3, 'Should have at least 3 matching dinner recipes');

      const toSave = recipes.slice(0, 3);
      let collectionId;
      let finalCount = 0;

      toSave.forEach((recipe, index) => {
        const saveResult = this.logic.saveRecipeToCollection(
          recipe.id,
          collectionId || undefined,
          collectionId ? undefined : 'Weeknight Dinners'
        );

        this.assert(saveResult && saveResult.success === true, 'saveRecipeToCollection should succeed');
        this.assert(saveResult.collection && saveResult.collection.id, 'Should return a collection');
        this.assert(saveResult.item && saveResult.item.id, 'Should return a collection item');

        collectionId = saveResult.collection.id;
        finalCount = saveResult.collectionItemCount;

        this.assert(
          finalCount === index + 1,
          'Collection item count should equal number of recipes saved so far'
        );
      });

      // Verify collection detail
      const collectionDetail = this.logic.getRecipeCollectionDetail(collectionId);
      this.assert(collectionDetail && collectionDetail.collection, 'Should load collection detail');
      this.assert(
        Array.isArray(collectionDetail.items),
        'Collection detail should include items array'
      );
      this.assert(
        collectionDetail.items.length === toSave.length,
        'Collection should contain exactly ' + toSave.length + ' recipes'
      );

      const savedRecipeIds = toSave.map((r) => r.id);

      collectionDetail.items.forEach((entry) => {
        const recipe = entry.recipe;
        this.assert(recipe, 'Each collection item should resolve a recipe');
        this.assert(
          savedRecipeIds.indexOf(recipe.id) !== -1,
          'Saved recipe id should match one of selected recipes'
        );
        this.assert(recipe.mealType === 'dinner', 'Saved recipe should be dinner');
        this.assert(
          typeof recipe.cookTimeMinutes === 'number' && recipe.cookTimeMinutes <= 45,
          'Saved recipe cook time should be 45 minutes or less'
        );
        this.assert(recipe.servings === 4, 'Saved recipe should serve 4');
        if (typeof recipe.caloriesPerServing === 'number') {
          this.assert(
            recipe.caloriesPerServing <= 600,
            'Saved recipe should have at most 600 calories per serving'
          );
        }
        if (typeof recipe.rating === 'number') {
          this.assert(recipe.rating >= 4.0, 'Saved recipe rating should be 4+ stars');
        }
      });

      // Verify via collections overview
      if (typeof this.logic.getRecipeCollectionsOverview === 'function') {
        const overview = this.logic.getRecipeCollectionsOverview();
        const found = overview.find((c) => c.collection.id === collectionId);
        this.assert(found, 'Weeknight Dinners collection should appear in overview');
        this.assert(
          found.itemCount === toSave.length,
          'Overview itemCount should match number of saved recipes'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Create Rainy Day Plan list with indoor free activities (up to available count)
  testTask2_CreateRainyDayPlanList() {
    const testName = 'Task 2: Create Rainy Day Plan list with indoor free activities for ages 5–8';

    try {
      const listResult = this.logic.listActivities(
        'years_5_8', // ageGroup adapted from 5–8
        'indoors', // location
        'free', // costType
        60, // maxDurationMinutes
        undefined, // tags
        'relevance', // sortBy
        1, // page
        20 // pageSize
      );

      const activities = (listResult && listResult.activities) || [];
      this.assert(activities.length > 0, 'Should return at least one matching activity');

      const maxToAdd = 5; // original requirement
      const toAddCount = Math.min(maxToAdd, activities.length);
      const toAdd = activities.slice(0, toAddCount);

      let listId;
      let finalCount = 0;

      toAdd.forEach((activity, index) => {
        const saveResult = this.logic.saveActivityToList(
          activity.id,
          listId || undefined,
          listId ? undefined : 'Rainy Day Plan'
        );

        this.assert(saveResult && saveResult.success === true, 'saveActivityToList should succeed');
        this.assert(saveResult.list && saveResult.list.id, 'Should return list');
        this.assert(saveResult.item && saveResult.item.id, 'Should return list item');

        listId = saveResult.list.id;
        finalCount = saveResult.listItemCount;
        this.assert(
          finalCount === index + 1,
          'List item count should equal number of activities saved so far'
        );
      });

      const listDetail = this.logic.getActivityListDetail(listId);
      this.assert(listDetail && listDetail.list, 'Should load activity list detail');
      this.assert(Array.isArray(listDetail.items), 'Activity list should have items array');
      this.assert(
        listDetail.items.length === toAdd.length,
        'Activity list should contain expected number of activities'
      );

      const savedIds = toAdd.map((a) => a.id);
      listDetail.items.forEach((entry) => {
        const activity = entry.activity;
        this.assert(activity, 'Each list entry should resolve an activity');
        this.assert(
          savedIds.indexOf(activity.id) !== -1,
          'Saved activity id should match one of selected activities'
        );
        this.assert(activity.ageGroup === 'years_5_8', 'Activity age group should be years_5_8');
        this.assert(activity.location === 'indoors', 'Activity should be indoors');
        this.assert(activity.costType === 'free', 'Activity costType should be free');
        this.assert(
          typeof activity.durationMinutes === 'number' &&
            activity.durationMinutes <= 60,
          'Activity duration should be 60 minutes or less'
        );
      });

      if (typeof this.logic.getActivityListsOverview === 'function') {
        const overview = this.logic.getActivityListsOverview();
        const found = overview.find((l) => l.list.id === listId);
        this.assert(found, 'Rainy Day Plan list should appear in overview');
        this.assert(
          found.itemCount === toAdd.length,
          'Overview count should match number of saved activities'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper to get date string yearsAgo in YYYY-MM-DD
  getDateYearsAgo(yearsAgo) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - yearsAgo);
    const iso = d.toISOString();
    return iso.slice(0, 10);
  }

  // Task 3: Bookmark beginner family mindfulness routine article
  testTask3_BookmarkMindfulnessArticle() {
    const testName = 'Task 3: Bookmark a beginner family mindfulness routine article';

    try {
      const minPublishDate = this.getDateYearsAgo(2); // Last 2 years

      const searchResult = this.logic.searchArticles(
        'family mindfulness routine', // query
        'wellbeing', // category
        'beginner', // level
        minPublishDate, // minPublishDate
        undefined, // maxPublishDate
        undefined, // ageGroup
        10, // minSessionLengthMinutes
        15, // maxSessionLengthMinutes
        10, // minCommentCount
        'relevance', // sortBy
        1, // page
        20 // pageSize
      );

      const articles = (searchResult && searchResult.articles) || [];
      this.assert(articles.length > 0, 'Should find at least one matching mindfulness article');

      let candidate = articles.find(
        (a) => typeof a.commentCount === 'number' && a.commentCount >= 10
      );
      if (!candidate) {
        candidate = articles[0];
      }

      const detail = this.logic.getArticleDetail(candidate.id);
      this.assert(detail && detail.article, 'Should load article detail');
      this.assert(detail.article.id === candidate.id, 'Detail article id should match');
      this.assert(detail.article.category === 'wellbeing', 'Article should be in wellbeing category');
      this.assert(
        detail.article.level === 'beginner',
        'Article level should be beginner'
      );
      if (typeof detail.article.sessionLengthMinutes === 'number') {
        this.assert(
          detail.article.sessionLengthMinutes >= 10 &&
            detail.article.sessionLengthMinutes <= 15,
          'Session length should be between 10 and 15 minutes'
        );
      }

      const saveResult = this.logic.saveArticleToReadingList(
        candidate.id,
        undefined, // readingListId
        'Reading List' // readingListName - will use or create
      );

      this.assert(saveResult && saveResult.success === true, 'Bookmarking should succeed');
      this.assert(
        saveResult.readingList && saveResult.readingList.id,
        'Should return a reading list'
      );
      this.assert(saveResult.item && saveResult.item.id, 'Should return a reading list item');

      const readingListId = saveResult.readingList.id;
      const listDetail = this.logic.getReadingListDetail(readingListId);
      this.assert(listDetail && listDetail.readingList, 'Should load reading list detail');
      this.assert(Array.isArray(listDetail.items), 'Reading list items should be array');

      const saved = listDetail.items.find((it) => it.article.id === candidate.id);
      this.assert(saved, 'Reading list should contain the bookmarked article');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Add cheaper of two yoga mats under 60 to Home Gym list
  testTask4_AddCheaperYogaMatToHomeGymList() {
    const testName = 'Task 4: Add cheaper of two highly rated family yoga mats under 60 to Home Gym list';

    try {
      const listResult = this.logic.listProducts(
        'fitness_and_yoga', // category
        'family yoga mat', // query
        undefined, // minPrice
        60, // maxPrice
        4.5, // minRating
        undefined, // tags
        'relevance', // sortBy
        1, // page
        20 // pageSize
      );

      const products = (listResult && listResult.products) || [];
      this.assert(products.length >= 2, 'Should have at least two matching yoga mats');

      const firstTwo = products.slice(0, 2);

      // Optionally fetch detailed info (simulating opening product pages)
      const detail1 = this.logic.getProductDetail(firstTwo[0].id);
      const detail2 = this.logic.getProductDetail(firstTwo[1].id);

      const prod1 = detail1.product;
      const prod2 = detail2.product;

      this.assert(prod1 && prod2, 'Both product details should load');

      this.assert(prod1.price <= 60, 'First product price should be under or equal to 60');
      this.assert(prod2.price <= 60, 'Second product price should be under or equal to 60');
      if (typeof prod1.rating === 'number') {
        this.assert(prod1.rating >= 4.5, 'First product rating should be at least 4.5');
      }
      if (typeof prod2.rating === 'number') {
        this.assert(prod2.rating >= 4.5, 'Second product rating should be at least 4.5');
      }

      const cheaper = prod1.price <= prod2.price ? prod1 : prod2;

      const saveResult = this.logic.saveProductToList(
        cheaper.id,
        undefined, // listId
        'Home Gym' // listName
      );

      this.assert(saveResult && saveResult.success === true, 'saveProductToList should succeed');
      this.assert(saveResult.list && saveResult.list.id, 'Should return a product list');
      this.assert(saveResult.item && saveResult.item.id, 'Should return product list item');

      const listId = saveResult.list.id;
      const listDetail = this.logic.getProductListDetail(listId);
      this.assert(listDetail && listDetail.list, 'Should load product list detail');
      this.assert(Array.isArray(listDetail.items), 'Product list items should be array');

      const saved = listDetail.items.find((it) => it.product.id === cheaper.id);
      this.assert(saved, 'Home Gym list should contain the cheaper yoga mat');

      if (typeof this.logic.getSavedListsAndCollectionsOverview === 'function') {
        const overview = this.logic.getSavedListsAndCollectionsOverview();
        const found =
          overview.productLists &&
          overview.productLists.find((p) => p.list.id === listId);
        this.assert(found, 'Home Gym product list should appear in saved lists overview');
        this.assert(
          typeof found.itemCount === 'number' && found.itemCount >= 1,
          'Overview item count for Home Gym should be at least 1'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Set newsletter preferences
  testTask5_SetNewsletterPreferences() {
    const testName = 'Task 5: Set newsletter preferences for 3 topics with weekly Monday delivery at 08:00';

    try {
      const topics = [
        'healthy_recipes',
        'parenting_tips',
        'mindfulness_and_self_care'
      ];

      const updateResult = this.logic.updateNewsletterPreferences(
        'weekly', // frequency
        'monday', // dayOfWeek
        '08:00', // timeOfDay
        topics, // topics
        'family_tester@example.com' // email
      );

      this.assert(updateResult && updateResult.success === true, 'updateNewsletterPreferences should succeed');
      const prefs = updateResult.preferences;
      this.assert(prefs, 'Should return updated preferences');
      this.assert(prefs.frequency === 'weekly', 'Frequency should be weekly');
      this.assert(prefs.dayOfWeek === 'monday', 'Day of week should be Monday');
      this.assert(prefs.timeOfDay === '08:00', 'Time of day should be 08:00');
      this.assert(prefs.email === 'family_tester@example.com', 'Email should match input');
      this.assert(Array.isArray(prefs.topics), 'Topics should be an array');
      this.assert(prefs.topics.length === topics.length, 'Should have exactly 3 topics');
      topics.forEach((t) => {
        this.assert(prefs.topics.indexOf(t) !== -1, 'Topic ' + t + ' should be selected');
      });

      const getResult = this.logic.getNewsletterPreferences();
      this.assert(getResult && getResult.preferences, 'Should fetch saved newsletter preferences');
      const stored = getResult.preferences;
      this.assert(stored.frequency === prefs.frequency, 'Stored frequency should match updated');
      this.assert(stored.dayOfWeek === prefs.dayOfWeek, 'Stored day should match updated');
      this.assert(stored.timeOfDay === prefs.timeOfDay, 'Stored time should match updated');
      this.assert(stored.email === prefs.email, 'Stored email should match updated');
      topics.forEach((t) => {
        this.assert(
          stored.topics.indexOf(t) !== -1,
          'Stored topics should include ' + t
        );
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Post targeted comment on screen-time parenting article for ages 9–12
  testTask6_PostScreenTimeComment() {
    const testName = 'Task 6: Post comment on recent screen-time parenting article for ages 9–12';

    try {
      const minPublishDate = this.getDateYearsAgo(1); // Past 12 months

      const searchResult = this.logic.searchArticles(
        'screen time rules', // query
        'parenting', // category
        undefined, // level
        minPublishDate, // minPublishDate
        undefined, // maxPublishDate
        'years_9_12', // ageGroup
        undefined, // minSessionLengthMinutes
        undefined, // maxSessionLengthMinutes
        undefined, // minCommentCount
        'relevance', // sortBy
        1, // page
        20 // pageSize
      );

      const articles = (searchResult && searchResult.articles) || [];
      this.assert(articles.length > 0, 'Should find at least one screen-time parenting article');

      const article = articles[0];
      const articleDetail = this.logic.getArticleDetail(article.id);
      this.assert(articleDetail && articleDetail.article, 'Should load article detail');
      this.assert(
        articleDetail.article.ageGroup === 'years_9_12',
        'Article age group should be years_9_12'
      );
      this.assert(
        articleDetail.article.category === 'parenting',
        'Article category should be parenting'
      );

      const initialComments = this.logic.getArticleComments(article.id);
      const initialCount = initialComments && initialComments.commentCount
        ? initialComments.commentCount
        : 0;

      const commentText =
        'We created a family agreement to guide screen time for our kids. ' +
        'The clear limits in our family agreement help keep expectations consistent.';

      const addResult = this.logic.addCommentToArticle(
        article.id,
        'Jordan',
        commentText
      );

      this.assert(addResult && addResult.success === true, 'addCommentToArticle should succeed');
      this.assert(addResult.comment && addResult.comment.id, 'Should return created comment');
      this.assert(addResult.comment.articleId === article.id, 'Comment articleId should match');
      this.assert(addResult.comment.authorName === 'Jordan', 'Comment authorName should match');
      this.assert(addResult.comment.text === commentText, 'Comment text should match input');
      this.assert(
        addResult.comment.text.indexOf('family agreement') !== -1,
        'Comment should contain phrase family agreement'
      );

      const afterComments = this.logic.getArticleComments(article.id);
      const newCount = afterComments && afterComments.commentCount
        ? afterComments.commentCount
        : 0;
      this.assert(
        newCount === initialCount + 1,
        'Comment count should increase by 1 after posting'
      );

      const saved = (afterComments.comments || []).find(
        (c) => c.id === addResult.comment.id
      );
      this.assert(saved, 'Newly added comment should be present in comments list');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Build Weekend Fun plan with activities and recipes
  testTask7_BuildWeekendFunPlan() {
    const testName = 'Task 7: Build Weekend Fun plan with 2 activities and 2 recipes scheduled on correct days';

    try {
      // Create planner plan
      const createResult = this.logic.createPlannerPlan(
        'Weekend Fun', // name
        undefined, // description
        undefined, // startDate
        undefined // endDate
      );

      this.assert(createResult && createResult.success === true, 'createPlannerPlan should succeed');
      const plan = createResult.plan;
      this.assert(plan && plan.id, 'Planner plan should have an id');
      const planId = plan.id;

      // Activities tab: filter for age group and indoors (adapting to available data)
      const activitiesResult = this.logic.listActivities(
        'years_5_8', // ageGroup adapted
        'indoors', // location
        undefined, // costType
        120, // maxDurationMinutes under 2 hours
        undefined, // tags
        'relevance', // sortBy
        1, // page
        20 // pageSize
      );

      const activities = (activitiesResult && activitiesResult.activities) || [];
      this.assert(activities.length >= 2, 'Should have at least 2 activities to add');

      const activitySelections = activities.slice(0, 2);
      const activityIds = [];

      activitySelections.forEach((act) => {
        const addResult = this.logic.addItemToPlannerPlan(
          planId,
          'activity', // itemType
          act.id, // activityId
          undefined, // recipeId
          'saturday', // dayOfWeek
          undefined // notes
        );
        this.assert(addResult && addResult.success === true, 'addItemToPlannerPlan for activity should succeed');
        this.assert(addResult.planItem && addResult.planItem.id, 'Plan item should have id');
        this.assert(
          addResult.planItem.itemType === 'activity',
          'Plan item type should be activity'
        );
        this.assert(addResult.planItem.dayOfWeek === 'saturday', 'Activity should be scheduled on Saturday');
        activityIds.push(act.id);
      });

      // Recipes tab: filter for quick, healthy dinners (used as snacks in planner context)
      const recipesResult = this.logic.listRecipes(
        'dinner', // mealType adapted from snacks to available data
        undefined, // maxCookTimeMinutes
        20, // maxPrepTimeMinutes
        undefined, // maxTotalTimeMinutes
        undefined, // maxCaloriesPerServing
        4.0, // minRating
        undefined, // servings
        'low_calorie', // healthTag
        'rating_desc', // sortBy
        1, // page
        20 // pageSize
      );

      const recipes = (recipesResult && recipesResult.recipes) || [];
      this.assert(recipes.length >= 2, 'Should have at least 2 recipes to add');

      const recipeSelections = recipes.slice(0, 2);
      const recipeIds = [];

      recipeSelections.forEach((rec) => {
        const addResult = this.logic.addItemToPlannerPlan(
          planId,
          'recipe', // itemType
          undefined, // activityId
          rec.id, // recipeId
          'sunday', // dayOfWeek
          undefined // notes
        );
        this.assert(addResult && addResult.success === true, 'addItemToPlannerPlan for recipe should succeed');
        this.assert(addResult.planItem && addResult.planItem.id, 'Plan item should have id');
        this.assert(
          addResult.planItem.itemType === 'recipe',
          'Plan item type should be recipe'
        );
        this.assert(addResult.planItem.dayOfWeek === 'sunday', 'Recipe should be scheduled on Sunday');
        recipeIds.push(rec.id);
      });

      // Verify schedule view
      const schedule = this.logic.getPlannerPlanSchedule(planId);
      this.assert(schedule && schedule.plan, 'Should load planner plan schedule');
      this.assert(Array.isArray(schedule.days), 'Schedule days should be array');

      const saturday = schedule.days.find((d) => d.dayOfWeek === 'saturday');
      const sunday = schedule.days.find((d) => d.dayOfWeek === 'sunday');
      this.assert(saturday, 'Schedule should include Saturday');
      this.assert(sunday, 'Schedule should include Sunday');

      const saturdayItems = saturday.items || [];
      const sundayItems = sunday.items || [];

      this.assert(
        saturdayItems.length === activityIds.length,
        'Saturday should have expected number of activities'
      );
      this.assert(
        sundayItems.length === recipeIds.length,
        'Sunday should have expected number of recipes'
      );

      saturdayItems.forEach((entry) => {
        this.assert(
          entry.planItem && entry.planItem.itemType === 'activity',
          'Saturday items should be activities'
        );
        this.assert(
          entry.activity && activityIds.indexOf(entry.activity.id) !== -1,
          'Saturday activity should match one of selected activities'
        );
      });

      sundayItems.forEach((entry) => {
        this.assert(
          entry.planItem && entry.planItem.itemType === 'recipe',
          'Sunday items should be recipes'
        );
        this.assert(
          entry.recipe && recipeIds.indexOf(entry.recipe.id) !== -1,
          'Sunday recipe should match one of selected recipes'
        );
      });

      // Cross-check using detailed plan view
      if (typeof this.logic.getPlannerPlanDetail === 'function') {
        const detail = this.logic.getPlannerPlanDetail(planId);
        this.assert(detail && Array.isArray(detail.items), 'Plan detail should include items');
        this.assert(
          detail.items.length === activityIds.length + recipeIds.length,
          'Total plan items should match number of activities plus recipes added'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper to compute upcoming month key and year
  getUpcomingMonthKeyAndYear() {
    const now = new Date();
    let monthIndex = now.getMonth(); // 0–11
    let year = now.getFullYear();
    monthIndex += 1; // upcoming month
    if (monthIndex > 11) {
      monthIndex = 0;
      year += 1;
    }
    const monthKeys = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december'
    ];
    const monthKey = monthKeys[monthIndex];
    return { monthKey, year };
  }

  // Task 8: Create monthly wellness budget of 200 across 3 categories
  testTask8_CreateMonthlyWellnessBudget() {
    const testName = 'Task 8: Create monthly wellness budget of 200 across 3 categories';

    try {
      const upcoming = this.getUpcomingMonthKeyAndYear();
      const monthKey = upcoming.monthKey;
      const year = upcoming.year;

      // Optional: check existing budget
      const existing = this.logic.getWellnessBudgetForMonth(monthKey, year);
      // No assertion here; it may or may not exist

      const categoriesInput = [
        { name: 'Healthy Groceries', amount: 80, position: 1 },
        { name: 'Family Activities', amount: 70, position: 2 },
        { name: 'Subscriptions', amount: 50, position: 3 }
      ];

      const totalAmount = 200;

      const saveResult = this.logic.saveWellnessBudget(
        totalAmount,
        monthKey,
        year,
        categoriesInput,
        undefined // notes
      );

      this.assert(saveResult && saveResult.success === true, 'saveWellnessBudget should succeed');
      const budget = saveResult.budget;
      const categories = saveResult.categories || [];

      this.assert(budget && budget.id, 'Saved budget should have id');
      this.assert(budget.totalAmount === totalAmount, 'Budget totalAmount should equal 200');
      this.assert(budget.month === monthKey, 'Budget month should match requested month');
      this.assert(budget.year === year, 'Budget year should match requested year');
      this.assert(categories.length === categoriesInput.length, 'Should have 3 budget categories');

      // Verify each category round-trips correctly
      categoriesInput.forEach((inputCat) => {
        const storedCat = categories.find((c) => c.name === inputCat.name);
        this.assert(storedCat, 'Budget should contain category ' + inputCat.name);
        this.assert(
          storedCat.amount === inputCat.amount,
          'Category ' + inputCat.name + ' amount should match input'
        );
      });

      const sum = categories.reduce((acc, c) => acc + (c.amount || 0), 0);
      this.assert(
        sum === budget.totalAmount,
        'Sum of category amounts should equal budget totalAmount'
      );

      const getResult = this.logic.getWellnessBudgetForMonth(monthKey, year);
      this.assert(getResult && getResult.budget, 'Should fetch saved budget for month');
      this.assert(
        getResult.budget.id === budget.id,
        'Fetched budget id should match saved budget id'
      );
      this.assert(
        Array.isArray(getResult.categories) &&
          getResult.categories.length === categoriesInput.length,
        'Fetched categories length should match saved categories'
      );

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
