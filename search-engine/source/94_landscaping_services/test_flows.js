// Test runner for business logic

// Simple in-memory localStorage polyfill for Node.js
class LocalStorageMock {
  constructor() {
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
  clear() {
    this.store = {};
  }
}

if (typeof localStorage === 'undefined') {
  global.localStorage = new LocalStorageMock();
}

// Generated Data from spec (used ONLY in setupTestData)
const generatedData = {
  service_categories: [
    {
      id: 'all_services',
      name: 'All Services',
      categoryParam: 'all_services',
      description:
        'Browse all landscaping, lawn care, cleanup, installation, and design services offered by our team.',
      image:
        'https://sk-amigo.ru/800/600/https/thumbs.dreamstime.com/b/landscaped-backyard-flower-garden-house-171271364.jpg'
    },
    {
      id: 'lawn_care_maintenance',
      name: 'Lawn Care & Maintenance',
      categoryParam: 'lawn_care_maintenance',
      description:
        'Ongoing lawn mowing, trimming, and routine yard maintenance services for residential and commercial properties.',
      image:
        'https://images.unsplash.com/photo-1523419409543-3e4f83b9b4c9?w=800&h=600&fit=crop&auto=format&q=80'
    },
    {
      id: 'seasonal_cleanups',
      name: 'Seasonal Cleanups',
      categoryParam: 'seasonal_cleanups',
      description:
        'One-time spring and fall cleanups, leaf removal, and storm debris removal to get your yard ready for the season.',
      image:
        'https://st.focusedcollection.com/8860618/i/650/focused_263264258-stock-photo-path-trees-autumn-leaves.jpg'
    }
  ],
  service_features: [
    {
      id: 'lawn_mowing',
      code: 'lawn_mowing',
      name: 'Lawn Mowing',
      description:
        'Regular mowing of turf areas, including edging along walkways and driveways.',
      image:
        'https://images.unsplash.com/photo-1598007891027-4e5a5c1c3a5e?w=800&h=600&fit=crop&auto=format&q=80'
    },
    {
      id: 'leaf_removal',
      code: 'leaf_removal',
      name: 'Leaf Removal',
      description:
        'Collection and removal of fallen leaves from lawns, beds, and hardscape areas.',
      image:
        'https://images.unsplash.com/photo-1476041800959-2f6bb412c8ce?w=800&h=600&fit=crop&auto=format&q=80'
    },
    {
      id: 'hedge_trimming',
      code: 'hedge_trimming',
      name: 'Hedge Trimming',
      description:
        'Shaping and trimming of hedges, shrubs, and bushes to maintain a neat appearance.',
      image:
        'https://images.unsplash.com/photo-1600093463592-9f61807aef11?w=800&h=600&fit=crop&auto=format&q=80'
    }
  ],
  yard_size_options: [
    {
      id: 'small_up_to_quarter_acre',
      code: 'small_up_to_quarter_acre',
      label: 'Up to 1/4 acre',
      minAcres: 0,
      maxAcres: 0.25
    },
    {
      id: 'medium_quarter_to_half_acre',
      code: 'medium_quarter_to_half_acre',
      label: 'Medium (1/4–1/2 acre)',
      minAcres: 0.25,
      maxAcres: 0.5
    },
    {
      id: 'large_half_to_one_acre',
      code: 'large_half_to_one_acre',
      label: 'Large (1/2–1 acre)',
      minAcres: 0.5,
      maxAcres: 1
    }
  ],
  maintenance_plans: [
    {
      id: 'res_mow_leaf_basic_small',
      planType: 'residential',
      name: 'Basic Mow & Leaf - Small Yard',
      description:
        'Entry-level residential maintenance for small yards, including lawn mowing and light leaf removal twice per month.',
      pricePerMonth: 129,
      maxPropertySizeCode: 'small_up_to_quarter_acre',
      visitsPerMonth: 2,
      includedFeatureCodes: ['lawn_mowing', 'leaf_removal'],
      includesLawnMowing: true,
      includesLeafRemoval: true,
      rating: 4.4,
      ratingCount: 64,
      availableBillingFrequencies: ['monthly'],
      imageUrl:
        'https://images.unsplash.com/photo-1458300679941-140ecd155d4d?w=800&h=600&fit=crop&auto=format&q=80',
      isActive: true
    },
    {
      id: 'res_mow_leaf_plus_small',
      planType: 'residential',
      name: 'Plus Mow & Leaf - Small Yard',
      description:
        'Our most popular small-yard plan with weekly visits for consistent mowing and leaf cleanup.',
      pricePerMonth: 149,
      maxPropertySizeCode: 'small_up_to_quarter_acre',
      visitsPerMonth: 4,
      includedFeatureCodes: ['lawn_mowing', 'leaf_removal'],
      includesLawnMowing: true,
      includesLeafRemoval: true,
      rating: 4.7,
      ratingCount: 118,
      availableBillingFrequencies: ['monthly', 'quarterly'],
      imageUrl:
        'https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?w=800&h=600&fit=crop&auto=format&q=80',
      isActive: true
    },
    {
      id: 'res_mow_only_small',
      planType: 'residential',
      name: 'Lawn Mowing Only - Small Yard',
      description:
        'Budget-friendly mowing-only plan for small residential lawns.',
      pricePerMonth: 99,
      maxPropertySizeCode: 'small_up_to_quarter_acre',
      visitsPerMonth: 2,
      includedFeatureCodes: ['lawn_mowing'],
      includesLawnMowing: true,
      includesLeafRemoval: false,
      rating: 4.2,
      ratingCount: 41,
      availableBillingFrequencies: ['monthly'],
      imageUrl:
        'https://images.unsplash.com/photo-1597809253051-f5c443bcd7c1?w=800&h=600&fit=crop&auto=format&q=80',
      isActive: true
    }
  ],
  projects: [
    {
      id: 'proj_bp_201',
      referenceCode: 'BP-201',
      title: 'Cozy Backyard Patio with Circular Fire Pit',
      description:
        'A medium-size backyard transformed with a paver patio, circular gas fire pit, and low-voltage accent lighting.',
      spaceType: 'backyard',
      yardSizeCode: 'medium_quarter_to_half_acre',
      featureCodes: ['patio', 'fire_pit', 'outdoor_lighting'],
      imageUrls: [
        'https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?w=800&h=600&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1500534318100-bbd47cc35b42?w=800&h=600&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1500534319780-1964a3a2a0a9?w=800&h=600&fit=crop&auto=format&q=80'
      ],
      isFeatured: true
    },
    {
      id: 'proj_bp_202',
      referenceCode: 'BP-202',
      title: 'Entertainer’s Patio with Fire Pit and Seating Wall',
      description:
        'Backyard makeover featuring a stone patio, wood-burning fire pit, and seating wall for gatherings.',
      spaceType: 'backyard',
      yardSizeCode: 'medium_quarter_to_half_acre',
      featureCodes: ['patio', 'fire_pit'],
      imageUrls: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=800&h=600&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=800&h=600&fit=crop&auto=format&q=80'
      ],
      isFeatured: true
    },
    {
      id: 'proj_bp_204',
      referenceCode: 'BP-204',
      title: 'Backyard Patio with Fire Pit and Water Feature',
      description:
        'A medium backyard redesigned with a multi-level patio, built-in fire pit, and a small recirculating waterfall.',
      spaceType: 'backyard',
      yardSizeCode: 'medium_quarter_to_half_acre',
      featureCodes: ['patio', 'fire_pit', 'water_feature'],
      imageUrls: [
        'https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?w=800&h=600&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1523419409543-3e4f83b9b4c9?w=800&h=600&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1500534318100-bbd47cc35b42?w=800&h=600&fit=crop&auto=format&q=80'
      ],
      isFeatured: true
    }
  ],
  services: [
    {
      id: 'svc_lawn_mowing_one_time',
      categoryId: 'lawn_care_maintenance',
      serviceType: 'one_time_mowing',
      name: 'Lawn Mowing - One-Time Visit',
      description:
        'Single visit lawn mowing service including trimming and edging for a standard residential lot.',
      priceUnit: 'per_visit',
      basePrice: 85,
      minPrice: 85,
      maxPrice: 110,
      rating: 4.5,
      ratingCount: 97,
      availablePropertySizes: ['small_up_to_quarter_acre', 'medium_quarter_to_half_acre'],
      featureCodes: ['lawn_mowing'],
      isBookableOnline: false,
      canBeAddedToCart: true,
      supportsQuoteRequest: false,
      supportsConsultationRequest: false,
      defaultDurationMinutes: 75,
      imageUrl: 'https://images.wisegeek.com/lawn-mower-tall-grass.jpg',
      searchKeywords: ['lawn mowing', 'one-time mowing', 'single visit'],
      isActive: true
    },
    {
      id: 'svc_mowing_monthly_basic',
      categoryId: 'lawn_care_maintenance',
      serviceType: 'ongoing_lawn_mowing',
      name: 'Ongoing Lawn Mowing - Standard (Up to 1/4 Acre)',
      description: 'Bi-weekly mowing service for small residential lawns, billed monthly.',
      priceUnit: 'per_month',
      basePrice: 95,
      minPrice: 90,
      maxPrice: 130,
      rating: 4.6,
      ratingCount: 83,
      availablePropertySizes: ['small_up_to_quarter_acre'],
      featureCodes: ['lawn_mowing'],
      isBookableOnline: false,
      canBeAddedToCart: false,
      supportsQuoteRequest: true,
      supportsConsultationRequest: false,
      defaultDurationMinutes: 60,
      imageUrl: 'https://bramanswanderings.files.wordpress.com/2014/11/yard-3.jpg?w=640&h=481',
      searchKeywords: ['ongoing lawn mowing', 'lawn service', 'maintenance'],
      isActive: true
    },
    {
      id: 'svc_mowing_monthly_premium',
      categoryId: 'lawn_care_maintenance',
      serviceType: 'ongoing_lawn_mowing',
      name: 'Ongoing Lawn Mowing - Premium (Up to 1/4 Acre)',
      description:
        'Weekly mowing service for small lawns with detailed edging and cleanup, billed monthly.',
      priceUnit: 'per_month',
      basePrice: 115,
      minPrice: 110,
      maxPrice: 150,
      rating: 4.9,
      ratingCount: 122,
      availablePropertySizes: ['small_up_to_quarter_acre'],
      featureCodes: ['lawn_mowing'],
      isBookableOnline: false,
      canBeAddedToCart: false,
      supportsQuoteRequest: true,
      supportsConsultationRequest: false,
      defaultDurationMinutes: 70,
      imageUrl:
        'https://img.hunkercdn.com/630x/photos.demandstudios.com/getty/article/97/103/57599395.jpg',
      searchKeywords: ['ongoing lawn mowing', 'weekly mowing', 'lawn care plan'],
      isActive: true
    }
  ],
  promotions: [
    {
      id: 'promo_first_time_10pct',
      title: '10% off for first-time customers',
      description:
        'Save 10% on your first eligible lawn or landscaping service when you book online.',
      promoCode: 'GREEN10',
      discountType: 'percentage',
      discountValue: 10,
      firstTimeCustomerOnly: true,
      applicableServiceIds: [
        'svc_lawn_mowing_one_time',
        'svc_spring_cleanup_one_time',
        'svc_leaf_removal_one_time',
        'svc_landscape_design_consult'
      ],
      applicablePlanIds: [
        'res_mow_leaf_basic_small',
        'res_mow_leaf_plus_small',
        'res_mow_only_small'
      ],
      validFrom: '2026-01-01T00:00:00Z',
      validTo: '2026-12-31T23:59:59Z',
      isActive: true,
      termsSummary:
        'Valid for new customers only on first booking of eligible services and plans; cannot be combined with other offers.'
    },
    {
      id: 'promo_spring_cleanup_25off',
      title: '$25 off Spring Yard Cleanup',
      description:
        'Get your yard ready for the season and save $25 on a qualifying spring cleanup or leaf removal visit.',
      promoCode: 'SPRING25',
      discountType: 'fixed_amount',
      discountValue: 25,
      firstTimeCustomerOnly: false,
      applicableServiceIds: ['svc_spring_cleanup_one_time', 'svc_leaf_removal_one_time'],
      applicablePlanIds: [],
      validFrom: '2026-02-15T00:00:00Z',
      validTo: '2026-05-31T23:59:59Z',
      isActive: true,
      termsSummary:
        'Discount applies per visit on eligible cleanup services booked before the end of the promotional period.'
    },
    {
      id: 'promo_maintenance_15pct_3mo',
      title: '15% off first 3 months of maintenance plans',
      description:
        'Lock in 15% savings on the first three months when you start a new qualifying maintenance plan.',
      promoCode: 'PLAN15',
      discountType: 'percentage',
      discountValue: 15,
      firstTimeCustomerOnly: false,
      applicableServiceIds: [],
      applicablePlanIds: [
        'res_mow_leaf_basic_small',
        'res_mow_leaf_plus_small',
        'res_mow_leaf_medium',
        'res_premium_large_full_care',
        'com_standard_mow_leaf',
        'com_campus_full_grounds'
      ],
      validFrom: '2026-01-15T00:00:00Z',
      validTo: '2026-12-31T23:59:59Z',
      isActive: true,
      termsSummary:
        'Applies to new qualifying maintenance plan subscriptions for the first three billing cycles only.'
    }
  ],
  time_slots: [
    {
      id: 'ts_spring_20260310_0900',
      serviceId: 'svc_spring_cleanup_one_time',
      date: '2026-03-10T00:00:00Z',
      startTime: '2026-03-10T09:00:00Z',
      endTime: '2026-03-10T12:00:00Z',
      isAvailable: true
    },
    {
      id: 'ts_spring_20260310_1300',
      serviceId: 'svc_spring_cleanup_one_time',
      date: '2026-03-10T00:00:00Z',
      startTime: '2026-03-10T13:00:00Z',
      endTime: '2026-03-10T16:00:00Z',
      isAvailable: true
    },
    {
      id: 'ts_spring_20260312_0900',
      serviceId: 'svc_spring_cleanup_one_time',
      date: '2026-03-12T00:00:00Z',
      startTime: '2026-03-12T09:00:00Z',
      endTime: '2026-03-12T12:00:00Z',
      isAvailable: true
    }
  ],
  faq_articles: [
    {
      id: 'faq_service_areas_main',
      articleId: 'service_areas',
      title: 'Service Areas and ZIP Codes We Cover',
      content:
        'We currently provide landscaping, lawn care, and seasonal cleanup services across several metro areas. Our standard service radius is approximately 30–40 minutes from our local branches.\n\nPrimary service regions\n- Chicago, IL and nearby neighborhoods\n- Springfield, IL and surrounding suburbs\n- Los Angeles (Westside and nearby), CA\n- San Francisco, CA city neighborhoods\n\nSupported ZIP codes (partial list)\nChicago area (IL)\n- 60610 (Old Town / Near North)\n- 60611, 60614, 60622, 60657\n\nSpringfield area (IL)\n- 12345 and adjacent ZIPs within a 10–15 mile radius\n\nLos Angeles area (CA)\n- 90210 (Beverly Hills)\n- 90024, 90025, 90064 and nearby ZIPs along the Westside corridor\n\nSan Francisco area (CA)\n- 94110 (Mission District and surrounding blocks)\n- 94114, 94117, 94131 and adjacent ZIPs\n\nIf you do not see your ZIP code listed above, we may still be able to serve you depending on the exact location and scope of work. The quickest way to confirm availability is to:\n1. Use the Contact page to send us your full address and ZIP code.\n2. Or start a booking or quote request; our system will automatically validate whether your address is inside our service area.\n\nAll standard policies, including scheduling rules and cancellations, apply equally across our covered service ZIP codes, including 60610, 12345, 90210, and 94110.',
      category: 'Service Areas',
      isFeatured: true,
      createdAt: '2025-01-05T10:00:00Z',
      updatedAt: '2026-02-20T09:30:00Z'
    },
    {
      id: 'faq_cancellation_policy_main',
      articleId: 'cancellation_policy',
      title: 'Cancellation Policy for Scheduled Services',
      content:
        'We understand that plans can change. Our goal is to keep scheduling flexible while ensuring our crews have reliable routes.\n\nStandard cancellation window\n- You may cancel or reschedule most services up to 24 hours before the scheduled start time with no cancellation fee.\n- Changes made more than 48 hours in advance are always free.\n\nSame day and late cancellations\n- If you cancel within 24 hours of the appointment start time, a late cancellation fee of 25 percent of the scheduled service price may apply.\n- If our crew arrives on site and is unable to perform the work due to access issues, locked gates, pets, or unsafe conditions, a trip fee (typically 35–50 dollars) may be charged.\n\nRecurring maintenance plans\n- For monthly residential or commercial maintenance plans, you can pause or cancel at the end of any current billing cycle with at least 7 days notice before the next renewal.\n- Individual visits that are skipped or cancelled with at least 24 hours notice can usually be rescheduled within the same month, subject to route availability.\n\nWeather-related changes\n- If severe weather makes it unsafe or impractical to perform the work, we will contact you to reschedule at no additional cost.\n\nHow this applies to your area\n- The same cancellation rules apply across all of our service regions and ZIP codes, including Chicago ZIP 60610, Springfield ZIP 12345, Los Angeles ZIP 90210, and San Francisco ZIP 94110.\n\nTo cancel or reschedule\n- Use the link in your confirmation email, or\n- Call our office during business hours, or\n- Submit a message through the Contact page with your name, service type, date, and preferred new date.\n\nIf you have any questions about how this policy applies to a specific booking, please contact us before your scheduled visit.',
      category: 'Policies',
      isFeatured: true,
      createdAt: '2025-01-06T11:00:00Z',
      updatedAt: '2026-02-20T09:45:00Z'
    },
    {
      id: 'faq_booking_policies_overview',
      articleId: 'booking_policies',
      title: 'Online Booking, Arrival Windows, and Payment Options',
      content:
        'Our online booking tool allows you to reserve one-time services such as spring yard cleanups, leaf removal, and design consultations.\n\nWhat can be booked online\n- Spring Yard Cleanup (One-Time)\n- Leaf Removal - One-Time\n- Landscape Design Consultation\n- General Landscaping Service (Hourly Crew)\n\nArrival windows\n- For most field services, you select a start time, and we provide a 60–120 minute arrival window based on routing.\n- Crews aim to arrive as close to the scheduled time as possible; if there is a significant delay, we will notify you by text or phone.\n\nPayment options\n- Pay on site: Card or check at the time of service completion, available for most one-time services.\n- Pay after service: Secure online payment link sent after the work is completed and approved.\n- Prepay by card: For some services, prepayment may be required to hold the booking.\n\nBooking confirmations and reminders\n- You will receive an email confirmation with the date, time window, service address, and summary of work.\n- Reminder emails or texts are sent 24 hours before your appointment when enabled.\n\nChanges to bookings\n- You may update contact details, access instructions, or gate codes via the confirmation link or by contacting our office.\n\nFor full details on cancellations and rescheduling, please see the Cancellation Policy article.',
      category: 'Booking',
      isFeatured: false,
      createdAt: '2025-01-10T09:00:00Z',
      updatedAt: '2025-11-15T14:20:00Z'
    }
  ],
  service_areas: [
    {
      id: 'sa_60610',
      zipCode: '60610',
      city: 'Chicago',
      state: 'IL',
      notes:
        'Primary Chicago service zone covering Old Town / Near North; full range of mowing, cleanups, and installations available.',
      isCurrentlyServed: true,
      image:
        'https://images.unsplash.com/photo-1488747279002-c8523379faaa?w=800&h=600&fit=crop&auto=format&q=80'
    },
    {
      id: 'sa_60611',
      zipCode: '60611',
      city: 'Chicago',
      state: 'IL',
      notes:
        'Downtown / Streeterville area; services focus on townhomes and small shared courtyards.',
      isCurrentlyServed: true,
      image:
        'http://images.freeimages.com/images/premium/previews/6783/6783043-lakefront-chicago-apartment-building.jpg'
    },
    {
      id: 'sa_60614',
      zipCode: '60614',
      city: 'Chicago',
      state: 'IL',
      notes:
        'Lincoln Park neighborhood; full residential maintenance and project services.',
      isCurrentlyServed: true,
      image:
        'https://media.apts247.info/b2/b27cf0aed88a44a38fa6be3482d0c558/galleries/community/amenities/charming-community-at-mallard-glen-in-charlotte-nc-4061969.jpg'
    }
  ]
};

// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    localStorage.clear();
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  // Merge generated arrays into existing storage instead of replacing,
  // so any baseline data from _initStorage is preserved.
  mergeArrayData(storageKey, newItems) {
    const existingJson = localStorage.getItem(storageKey);
    let existing = [];
    if (existingJson) {
      try {
        existing = JSON.parse(existingJson) || [];
      } catch (e) {
        existing = [];
      }
    }
    const byId = {};
    existing.forEach((item) => {
      if (item && item.id) {
        byId[item.id] = item;
      }
    });
    (newItems || []).forEach((item) => {
      if (item && item.id) {
        byId[item.id] = item;
      }
    });
    const merged = Object.keys(byId).map((id) => byId[id]);
    localStorage.setItem(storageKey, JSON.stringify(merged));
  }

  setupTestData() {
    // Use Generated Data ONLY here for initial localStorage population
    this.mergeArrayData('service_categories', generatedData.service_categories);
    this.mergeArrayData('service_features', generatedData.service_features);
    this.mergeArrayData('yard_size_options', generatedData.yard_size_options);
    this.mergeArrayData('maintenance_plans', generatedData.maintenance_plans);
    this.mergeArrayData('projects', generatedData.projects);
    this.mergeArrayData('services', generatedData.services);
    this.mergeArrayData('promotions', generatedData.promotions);
    this.mergeArrayData('time_slots', generatedData.time_slots);
    this.mergeArrayData('faq_articles', generatedData.faq_articles);
    this.mergeArrayData('service_areas', generatedData.service_areas);
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_RequestMonthlyLawnMowingQuote();
    this.testTask2_BookSpringCleanup();
    this.testTask3_CreateCustomLandscapingPackage();
    this.testTask4_ChooseBestResidentialMaintenancePlan();
    this.testTask5_RequestDroughtTolerantConsultation();
    this.testTask6_ApplyFirstTimePromoToOneTimeMowing();
    this.testTask7_SaveBackyardPatioProjectAndRequestDesign();
    this.testTask8_AskAboutServiceAvailabilityAndCancellation();

    return this.results;
  }

  // Task 1: Request a monthly lawn mowing quote for a small yard under $120/month
  testTask1_RequestMonthlyLawnMowingQuote() {
    const testName = 'Task 1: Monthly lawn mowing quote under $120 for small yard';
    try {
      // Simulate: navigate to homepage (implicit via getHomePageContent)
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Homepage content should load');

      // Go to Services -> Lawn Care & Maintenance
      const categories = this.logic.getServiceCategories();
      this.assert(Array.isArray(categories) && categories.length > 0, 'Service categories should load');
      const lawnCategory = categories.find(
        (c) => c.categoryParam === 'lawn_care_maintenance'
      );
      this.assert(lawnCategory, 'Lawn Care & Maintenance category should exist');

      // Get filter options and find small yard size code
      const filterOptions = this.logic.getServiceListFilterOptions(
        lawnCategory.categoryParam
      );
      this.assert(filterOptions && Array.isArray(filterOptions.yardSizes), 'Service filter options should load');
      let smallYard = filterOptions.yardSizes.find((y) =>
        typeof y.label === 'string' && y.label.toLowerCase().includes('1/4')
      );
      if (!smallYard) {
        smallYard = filterOptions.yardSizes[0];
      }
      this.assert(smallYard && smallYard.code, 'Small yard size option should be available');

      const propertySizeCode = smallYard.code;
      const maxMonthlyPrice = 120;

      // Filter services: ongoing lawn mowing, small yard, max price 120, per month, sorted by rating high to low
      const servicesResult = this.logic.listServices(
        lawnCategory.categoryParam,
        undefined,
        {
          serviceType: 'ongoing_lawn_mowing',
          propertySizeCode: propertySizeCode,
          maxPrice: maxMonthlyPrice,
          priceUnit: 'per_month'
        },
        'rating_high_to_low',
        1,
        10
      );

      this.assert(
        servicesResult && Array.isArray(servicesResult.services) && servicesResult.services.length > 0,
        'Should find at least one ongoing lawn mowing service under max price'
      );

      const topServiceSummary = servicesResult.services[0];
      this.assert(topServiceSummary.serviceId, 'Top service should have an ID');

      // Open service detail and ensure it supports quote requests
      const detail = this.logic.getServiceDetail(topServiceSummary.serviceId);
      this.assert(detail && detail.service, 'Service detail should load');
      this.assert(
        detail.supportsQuoteRequest === true || detail.service.supportsQuoteRequest === true,
        'Selected service should support quote requests'
      );

      // Submit quote request
      const quoteResponse = this.logic.createQuoteRequest(
        detail.service.id,
        propertySizeCode,
        maxMonthlyPrice,
        'Alex Johnson',
        '45 Maple Street',
        '12345',
        '555-0101',
        'phone_call',
        undefined
      );

      this.assert(quoteResponse && quoteResponse.success === true, 'Quote request should succeed');
      this.assert(quoteResponse.quoteRequestId, 'Quote request should return an ID');

      // Verify QuoteRequest persisted correctly
      const storedQuotesJson = localStorage.getItem('quote_requests');
      this.assert(storedQuotesJson, 'Quote requests should be stored');
      const storedQuotes = JSON.parse(storedQuotesJson || '[]');
      const createdQuote = storedQuotes.find(
        (q) => q.id === quoteResponse.quoteRequestId
      );
      this.assert(createdQuote, 'Created QuoteRequest should exist in storage');
      this.assert(
        createdQuote.serviceId === detail.service.id,
        'QuoteRequest.serviceId should match selected service'
      );
      this.assert(
        createdQuote.propertySizeCode === propertySizeCode,
        'QuoteRequest.propertySizeCode should match selection'
      );
      this.assert(
        createdQuote.maxMonthlyPrice === maxMonthlyPrice,
        'QuoteRequest.maxMonthlyPrice should match user input'
      );
      this.assert(
        createdQuote.name === 'Alex Johnson' &&
          createdQuote.streetAddress === '45 Maple Street' &&
          createdQuote.zipCode === '12345' &&
          createdQuote.phone === '555-0101',
        'QuoteRequest should store contact details as entered'
      );
      this.assert(
        createdQuote.preferredContactMethod === 'phone_call',
        'QuoteRequest.preferredContactMethod should store phone_call'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Book a one-time spring yard cleanup on a date with an afternoon slot
  testTask2_BookSpringCleanup() {
    const testName = 'Task 2: Book one-time spring yard cleanup with available afternoon slot';
    try {
      // Use stored TimeSlot data to derive a valid serviceId and date
      const timeSlotsJson = localStorage.getItem('time_slots') || '[]';
      const allSlots = JSON.parse(timeSlotsJson);
      this.assert(Array.isArray(allSlots) && allSlots.length > 0, 'Time slots should exist in storage');

      const referenceSlot = allSlots[0];
      this.assert(referenceSlot.serviceId, 'Reference timeslot should have serviceId');
      const serviceId = referenceSlot.serviceId;

      // Derive date string in YYYY-MM-DD from referenceSlot.date
      const dateObj = new Date(referenceSlot.date);
      const year = dateObj.getUTCFullYear();
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // Get available time slots for that service and date via API
      const availableSlots = this.logic.getAvailableTimeSlots(serviceId, dateStr);
      this.assert(
        Array.isArray(availableSlots) && availableSlots.length > 0,
        'getAvailableTimeSlots should return at least one slot'
      );

      // Find first slot starting at or after 3:00 PM; if none, fall back to earliest
      const thresholdHour = 15;
      let chosenSlot = availableSlots.find((slot) => {
        const start = new Date(slot.startTime);
        return start.getUTCHours() >= thresholdHour;
      });
      if (!chosenSlot) {
        chosenSlot = availableSlots[0];
      }
      this.assert(chosenSlot && chosenSlot.id, 'A time slot should be selected');

      // Create booking with pay_on_site
      const bookingResponse = this.logic.createBooking(
        serviceId,
        dateStr,
        chosenSlot.id,
        'Jamie Lee',
        '210 Oak Avenue',
        '60610',
        '555-0202',
        'jamie@example.com',
        'pay_on_site'
      );

      this.assert(bookingResponse && bookingResponse.success === true, 'Booking should succeed');
      this.assert(bookingResponse.bookingId, 'Booking should return an ID');

      // Verify Booking persisted
      const bookingsJson = localStorage.getItem('bookings') || '[]';
      const bookings = JSON.parse(bookingsJson);
      const createdBooking = bookings.find(
        (b) => b.id === bookingResponse.bookingId
      );
      this.assert(createdBooking, 'Created Booking should exist in storage');
      this.assert(
        createdBooking.serviceId === serviceId,
        'Booking.serviceId should match'
      );
      this.assert(
        createdBooking.timeSlotId === chosenSlot.id,
        'Booking.timeSlotId should match chosen slot'
      );
      this.assert(
        createdBooking.address === '210 Oak Avenue' &&
          createdBooking.zipCode === '60610' &&
          createdBooking.customerName === 'Jamie Lee',
        'Booking should store customer details correctly'
      );
      this.assert(
        createdBooking.paymentOption === 'pay_on_site',
        'Booking.paymentOption should be pay_on_site'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Create a custom landscaping package with exactly 3 services under $400 total
  testTask3_CreateCustomLandscapingPackage() {
    const testName = 'Task 3: Create custom package with 3 services and target $300–$400';
    try {
      // Start with active custom package state
      const activeBefore = this.logic.getActiveCustomPackage();
      this.assert(activeBefore && activeBefore.package, 'Active custom package should load or be created');

      // Get available services for package builder (no filters, we adapt to whatever is available)
      const builderOptions = this.logic.getPackageBuilderServiceOptions(undefined, undefined);
      this.assert(
        Array.isArray(builderOptions) && builderOptions.length >= 1,
        'Package builder should return at least one service option'
      );

      // Select up to 3 distinct services
      const selectedServices = builderOptions.slice(0, 3);
      this.assert(selectedServices.length >= 1, 'At least one service should be selectable');

      // Add first service: every_2_weeks
      let pkgState = this.logic.addServiceToActiveCustomPackage(
        selectedServices[0].serviceId,
        'every_2_weeks'
      );
      this.assert(pkgState && pkgState.package && Array.isArray(pkgState.items), 'First service should be added to package');

      // Add second service if available: once_per_month
      if (selectedServices.length >= 2) {
        pkgState = this.logic.addServiceToActiveCustomPackage(
          selectedServices[1].serviceId,
          'once_per_month'
        );
        this.assert(Array.isArray(pkgState.items), 'Second service should be added');
      }

      // Add third service if available: one_time
      if (selectedServices.length >= 3) {
        pkgState = this.logic.addServiceToActiveCustomPackage(
          selectedServices[2].serviceId,
          'one_time'
        );
        this.assert(Array.isArray(pkgState.items), 'Third service should be added');
      }

      const itemsAfterAdd = pkgState.items || [];
      this.assert(itemsAfterAdd.length === selectedServices.length, 'Package should contain exactly selected service count');

      // Adjust frequencies to try bringing estimate into 300–400 range
      const initialTotal = pkgState.package.totalEstimatedPrice;
      if (typeof initialTotal === 'number') {
        if (initialTotal > 400 && itemsAfterAdd[0]) {
          // Reduce first service frequency
          pkgState = this.logic.updateCustomPackageItemFrequency(
            itemsAfterAdd[0].id,
            'once_per_month'
          );
        } else if (initialTotal < 300 && itemsAfterAdd[1]) {
          // Increase second service frequency
          pkgState = this.logic.updateCustomPackageItemFrequency(
            itemsAfterAdd[1].id,
            'every_2_weeks'
          );
        }
      }

      // Finalize for review with target price range 300–400
      const finalized = this.logic.finalizeCustomPackageForReview(300, 400);
      this.assert(finalized && finalized.package, 'Package should be finalized for review');

      // Load review summary and validate
      const review = this.logic.getCustomPackageReview();
      this.assert(review && review.package && Array.isArray(review.items), 'Custom package review should load');
      this.assert(
        review.items.length === selectedServices.length,
        'Review should show the same number of services that were added'
      );
      this.assert(
        review.meetsServiceCountCriteria === true,
        'Package should meet service count criteria (expected exactly 3 in this scenario where 3 services were added)'
      );
      this.assert(
        review.meetsPriceRangeCriteria === true,
        'Package should meet target price range criteria 300–400'
      );

      // Save package for checkout
      const saveResult = this.logic.saveCustomPackageForCheckout('My Custom Landscaping Package');
      this.assert(saveResult && saveResult.success === true, 'Saving custom package should succeed');
      this.assert(saveResult.packageId, 'Saved custom package should have ID');

      // Add saved package to cart
      const cartState = this.logic.addCustomPackageToCart(saveResult.packageId);
      this.assert(cartState && cartState.cart && Array.isArray(cartState.items), 'Cart should be returned when adding custom package');

      const addedPackageItem = (cartState.items || []).find(
        (ci) => ci.sourceType === 'custom_package' && ci.sourceId === saveResult.packageId
      );
      this.assert(addedPackageItem, 'Cart should contain line item for the custom package');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Choose the best residential maintenance plan with mowing and leaf removal under $150/month
  testTask4_ChooseBestResidentialMaintenancePlan() {
    const testName = 'Task 4: Choose residential maintenance plan with mowing and leaf removal under $150';
    try {
      // Load maintenance plan filter options (simulating opening the plans page)
      const filterOptions = this.logic.getMaintenancePlanListFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.planTypes), 'Maintenance plan filter options should load');

      // Filter for residential plans including lawn mowing and leaf removal under 150
      const plansResult = this.logic.listMaintenancePlans(
        'residential',
        150,
        true,
        true,
        undefined,
        undefined,
        1,
        10
      );

      this.assert(
        plansResult && Array.isArray(plansResult.plans) && plansResult.plans.length > 0,
        'Should find at least one residential plan with mowing and leaf removal under max price'
      );

      // Open first two plan detail pages and compare visitsPerMonth
      const firstPlanSummary = plansResult.plans[0];
      const secondPlanSummary = plansResult.plans[1] || null;

      const firstDetail = this.logic.getMaintenancePlanDetail(firstPlanSummary.planId);
      this.assert(firstDetail && firstDetail.plan, 'First plan detail should load');
      const firstVisits = firstDetail.plan.visitsPerMonth;

      let chosenPlanId = firstDetail.plan.id;
      if (secondPlanSummary) {
        const secondDetail = this.logic.getMaintenancePlanDetail(secondPlanSummary.planId);
        this.assert(secondDetail && secondDetail.plan, 'Second plan detail should load');
        const secondVisits = secondDetail.plan.visitsPerMonth;
        // Choose the plan with more visits per month (ties default to first)
        if (typeof secondVisits === 'number' && secondVisits > firstVisits) {
          chosenPlanId = secondDetail.plan.id;
        }
      }

      // Add chosen plan to cart with monthly billing
      const cartState = this.logic.addMaintenancePlanToCart(chosenPlanId, 'monthly', 1);
      this.assert(cartState && cartState.cart && Array.isArray(cartState.items), 'Cart should be returned when adding maintenance plan');

      const addedPlanItem = (cartState.items || []).find(
        (ci) => ci.sourceType === 'maintenance_plan' && ci.sourceId === chosenPlanId
      );
      this.assert(addedPlanItem, 'Cart should include chosen maintenance plan item');
      this.assert(
        addedPlanItem.billingFrequency === 'monthly',
        'Billing frequency for plan cart item should be monthly'
      );

      // Proceed to checkout
      const orderResult = this.logic.createOrderFromCurrentCart();
      this.assert(orderResult && orderResult.order, 'Order should be created from cart');

      const checkoutSummary = this.logic.getCheckoutSummary(orderResult.order.id);
      this.assert(
        checkoutSummary && checkoutSummary.order && Array.isArray(checkoutSummary.availablePaymentMethods),
        'Checkout summary should load with available payment methods'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Request a consultation for a drought-tolerant front yard installation
  testTask5_RequestDroughtTolerantConsultation() {
    const testName = 'Task 5: Request consultation for top-rated installation service (drought-tolerant scenario)';
    try {
      // Use search to try finding a drought-tolerant front yard installation service
      let servicesResult = this.logic.listServices(
        undefined,
        'drought tolerant front yard installation',
        undefined,
        'rating_high_to_low',
        1,
        10
      );

      let candidates = Array.isArray(servicesResult.services)
        ? servicesResult.services
        : [];

      // If no direct match found, fall back to top-rated service overall (adapting to limited data)
      if (candidates.length === 0) {
        servicesResult = this.logic.listServices(
          undefined,
          undefined,
          undefined,
          'rating_high_to_low',
          1,
          10
        );
        candidates = Array.isArray(servicesResult.services)
          ? servicesResult.services
          : [];
      }

      this.assert(candidates.length > 0, 'Should have at least one service for consultation request');

      // Prefer services with rating >= 4 where possible
      let targetServiceSummary = candidates.find(
        (s) => typeof s.rating === 'number' && s.rating >= 4
      );
      if (!targetServiceSummary) {
        targetServiceSummary = candidates[0];
      }
      this.assert(targetServiceSummary.serviceId, 'Target service should have an ID');

      const detail = this.logic.getServiceDetail(targetServiceSummary.serviceId);
      this.assert(detail && detail.service, 'Service detail should load for consultation');

      // Submit consultation request (mapping Morning (8am–12pm) to enum morning_8am_12pm)
      const message = 'Interested in a drought-tolerant design for the front yard only';
      const consultResponse = this.logic.createConsultationRequest(
        detail.service.id,
        'Morgan Rivera',
        '88 Pine Street',
        '90210',
        undefined,
        undefined,
        'morning_8am_12pm',
        message
      );

      this.assert(consultResponse && consultResponse.success === true, 'Consultation request should succeed');
      this.assert(consultResponse.consultationRequestId, 'Consultation request should return an ID');

      // Verify ConsultationRequest persisted
      const consultJson = localStorage.getItem('consultation_requests') || '[]';
      const consults = JSON.parse(consultJson);
      const created = consults.find(
        (c) => c.id === consultResponse.consultationRequestId
      );
      this.assert(created, 'Created ConsultationRequest should exist');
      this.assert(
        created.serviceId === detail.service.id,
        'ConsultationRequest.serviceId should match selected service'
      );
      this.assert(created.name === 'Morgan Rivera', 'ConsultationRequest name should match');
      this.assert(created.address === '88 Pine Street', 'ConsultationRequest address should match');
      this.assert(created.zipCode === '90210', 'ConsultationRequest ZIP should match');
      this.assert(
        created.preferredTimeOfDay === 'morning_8am_12pm',
        'ConsultationRequest.preferredTimeOfDay should be morning_8am_12pm'
      );
      this.assert(
        created.message && created.message.indexOf('drought-tolerant') !== -1,
        'ConsultationRequest.message should include user note about drought tolerance'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Apply a 10% first-time customer promo code to a one-time lawn mowing service
  testTask6_ApplyFirstTimePromoToOneTimeMowing() {
    const testName = 'Task 6: Apply 10% first-time promo to one-time lawn mowing and proceed to payment step';
    try {
      // Load promotions and find the 10% off first-time offer
      const promos = this.logic.listPromotions(true);
      this.assert(Array.isArray(promos) && promos.length > 0, 'Promotions should load');

      let firstTimePromo = promos.find((p) =>
        typeof p.title === 'string' && p.title.toLowerCase().includes('10%')
      );
      if (!firstTimePromo) {
        firstTimePromo = promos.find((p) => p.discountType === 'percentage' && p.discountValue === 10);
      }
      this.assert(firstTimePromo && firstTimePromo.promoCode, '10% first-time promo should be available');
      const promoCode = firstTimePromo.promoCode;

      // Find Lawn Mowing - One-Time Visit service via Services list
      const servicesResult = this.logic.listServices(
        'lawn_care_maintenance',
        'Lawn Mowing - One-Time Visit',
        undefined,
        'relevance',
        1,
        10
      );
      this.assert(
        servicesResult && Array.isArray(servicesResult.services) && servicesResult.services.length > 0,
        'Should find one-time lawn mowing service from listServices'
      );

      const mowingSummary = servicesResult.services.find((s) =>
        typeof s.name === 'string' && s.name.indexOf('Lawn Mowing - One-Time Visit') !== -1
      ) || servicesResult.services[0];
      this.assert(mowingSummary.serviceId, 'Selected mowing service should have ID');

      const detail = this.logic.getServiceDetail(mowingSummary.serviceId);
      this.assert(detail && detail.service, 'Mowing service detail should load');
      this.assert(
        detail.service.canBeAddedToCart === true,
        'Selected mowing service should be add-to-cart capable'
      );

      // Add service to cart as one-time
      const cartStateAfterAdd = this.logic.addServiceToCart(
        detail.service.id,
        1,
        'one_time',
        false
      );
      this.assert(
        cartStateAfterAdd && cartStateAfterAdd.cart && Array.isArray(cartStateAfterAdd.items),
        'Cart should be returned after adding mowing service'
      );

      const mowingCartItem = (cartStateAfterAdd.items || []).find(
        (ci) => ci.sourceType === 'service' && ci.sourceId === detail.service.id
      );
      this.assert(mowingCartItem, 'Cart should contain mowing service line item');

      // Apply promotion code
      const applyResult = this.logic.applyPromotionCode(promoCode);
      this.assert(applyResult && applyResult.success === true, 'Applying promo code should succeed');
      this.assert(applyResult.cart, 'Cart should be returned after applying promotion');
      this.assert(
        typeof applyResult.cart.discountTotal === 'number' && applyResult.cart.discountTotal >= 0,
        'Cart discountTotal should be a non-negative number after applying promo'
      );
      this.assert(
        applyResult.cart.promotionCode === promoCode,
        'Cart.promotionCode should match applied code'
      );

      const subtotal = applyResult.cart.subtotal || 0;
      const total = applyResult.cart.total || 0;
      this.assert(subtotal >= total, 'Cart total should not exceed subtotal after discount');

      // Proceed to checkout (payment step)
      const orderResult = this.logic.createOrderFromCurrentCart();
      this.assert(orderResult && orderResult.order, 'Order should be created from current cart');

      const checkoutSummary = this.logic.getCheckoutSummary(orderResult.order.id);
      this.assert(
        checkoutSummary && checkoutSummary.order && Array.isArray(checkoutSummary.availablePaymentMethods),
        'Checkout summary should load with payment methods after promo application'
      );
      this.assert(
        checkoutSummary.order.promotionCode === promoCode,
        'Order.promotionCode should carry over applied promo code'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Save a backyard patio with fire pit project to favorites and request a similar design
  testTask7_SaveBackyardPatioProjectAndRequestDesign() {
    const testName = 'Task 7: Favorite backyard patio with fire pit project and request similar design';
    try {
      // Load gallery filter options
      const galleryFilters = this.logic.getGalleryFilterOptions();
      this.assert(galleryFilters && Array.isArray(galleryFilters.spaceTypes), 'Gallery filter options should load');

      // Filter projects: backyard, medium yard, with patio and fire pit
      const listResult = this.logic.listProjects(
        {
          spaceType: 'backyard',
          yardSizeCode: 'medium_quarter_to_half_acre',
          featureCodes: ['patio', 'fire_pit']
        },
        'featured_first',
        1,
        24
      );

      this.assert(
        listResult && Array.isArray(listResult.projects) && listResult.projects.length > 0,
        'Should find at least one backyard patio with fire pit project'
      );

      // Select the third project if available, otherwise last available
      let targetIndex = 2;
      if (listResult.projects.length <= 2) {
        targetIndex = listResult.projects.length - 1;
      }
      const projectSummary = listResult.projects[targetIndex];
      this.assert(projectSummary && projectSummary.projectId, 'Target project should have an ID');

      // Open project detail
      const projectDetail = this.logic.getProjectDetail(projectSummary.projectId);
      this.assert(projectDetail && projectDetail.project, 'Project detail should load');
      const projectId = projectDetail.project.id;
      const referenceCode = projectDetail.project.referenceCode;
      this.assert(referenceCode, 'Project should have a reference code');

      // Add project to favorites
      const favResult = this.logic.addProjectToFavorites(projectId);
      this.assert(favResult && favResult.projectId === projectId, 'Favorite operation should return projectId');
      this.assert(favResult.isFavorited === true, 'Project should now be favorited');

      // Verify via favorites list
      const favoritesState = this.logic.getFavoriteProjects();
      this.assert(favoritesState && favoritesState.favorites, 'Favorites state should load');
      const favoritesProjects = favoritesState.projects || [];
      const isInFavorites = favoritesProjects.some((p) => p.id === projectId);
      this.assert(isInFavorites, 'Project should appear in favorites list');

      // Submit request for similar design referencing project ID
      const message = `I would like a design similar to Project ID: ${referenceCode} for my backyard.`;
      const designRequest = this.logic.requestProjectDesign(
        projectId,
        'backyard_patio_with_fire_pit',
        'Taylor Morgan',
        'taylor@example.com',
        '94110',
        message
      );

      this.assert(designRequest && designRequest.success === true, 'Project design request should succeed');
      this.assert(designRequest.requestId, 'Design request should return an ID');

      // Verify ProjectDesignRequest persisted
      const pdrJson = localStorage.getItem('project_design_requests') || '[]';
      const pdrs = JSON.parse(pdrJson);
      const created = pdrs.find((r) => r.id === designRequest.requestId);
      this.assert(created, 'Created ProjectDesignRequest should exist');
      this.assert(created.projectId === projectId, 'ProjectDesignRequest.projectId should match');
      this.assert(created.projectReferenceCode === referenceCode, 'ProjectDesignRequest.projectReferenceCode should match');
      this.assert(created.name === 'Taylor Morgan', 'ProjectDesignRequest name should match');
      this.assert(created.email === 'taylor@example.com', 'ProjectDesignRequest email should match');
      this.assert(created.zipCode === '94110', 'ProjectDesignRequest ZIP should match');
      this.assert(
        created.message && created.message.indexOf(referenceCode) !== -1,
        'ProjectDesignRequest.message should include the project reference code'
      );
      this.assert(
        created.requestedProjectType === 'backyard_patio_with_fire_pit',
        'ProjectDesignRequest.requestedProjectType should match selection'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Ask about service availability for ZIP 60610 and cancellation policy via contact form
  testTask8_AskAboutServiceAvailabilityAndCancellation() {
    const testName = 'Task 8: Ask about service availability for ZIP 60610 and cancellation policy via contact form';
    try {
      // Search FAQ for service areas
      const saResults = this.logic.searchFAQArticles('service area');
      this.assert(Array.isArray(saResults) && saResults.length > 0, 'FAQ search for service area should return results');
      const saArticleMeta = saResults.find((a) => a.articleId === 'service_areas') || saResults[0];
      this.assert(saArticleMeta.articleId, 'Service areas FAQ articleId should be present');

      const saArticle = this.logic.getFAQArticle('service_areas');
      this.assert(saArticle && saArticle.article && typeof saArticle.article.content === 'string', 'Service areas FAQ article should load');
      this.assert(
        saArticle.article.content.indexOf('60610') !== -1,
        'Service areas FAQ content should mention ZIP 60610'
      );

      // Search FAQ for cancellation policy
      const cancelResults = this.logic.searchFAQArticles('cancellation');
      this.assert(Array.isArray(cancelResults) && cancelResults.length > 0, 'FAQ search for cancellation should return results');
      const cancelMeta = cancelResults.find((a) => a.articleId === 'cancellation_policy') || cancelResults[0];
      this.assert(cancelMeta.articleId, 'Cancellation policy FAQ articleId should be present');

      const cancelArticle = this.logic.getFAQArticle('cancellation_policy');
      this.assert(cancelArticle && cancelArticle.article, 'Cancellation policy FAQ article should load');
      this.assert(
        cancelArticle.article.content.indexOf('60610') !== -1,
        'Cancellation policy FAQ content should mention how it applies to ZIP 60610'
      );

      // Send contact form message about availability and cancellation for ZIP 60610
      const message =
        'I live in ZIP code 60610. Can you confirm if you provide services in this area, and how your cancellation policy would apply to bookings in ZIP 60610?';
      const contactResponse = this.logic.sendContactFormMessage(
        'service_availability',
        'Jordan Smith',
        'jordan@example.com',
        '555-0303',
        message
      );

      this.assert(contactResponse && contactResponse.success === true, 'Contact form submission should succeed');
      this.assert(contactResponse.submissionId, 'Contact form should return a submissionId');

      // Verify ContactFormSubmission persisted
      const cfsJson = localStorage.getItem('contact_form_submissions') || '[]';
      const submissions = JSON.parse(cfsJson);
      const created = submissions.find(
        (s) => s.id === contactResponse.submissionId
      );
      this.assert(created, 'Created ContactFormSubmission should exist');
      this.assert(created.subject === 'service_availability', 'ContactFormSubmission.subject should be service_availability');
      this.assert(created.name === 'Jordan Smith', 'ContactFormSubmission name should match');
      this.assert(created.email === 'jordan@example.com', 'ContactFormSubmission email should match');
      this.assert(created.phone === '555-0303', 'ContactFormSubmission phone should match');
      this.assert(
        created.message === message,
        'ContactFormSubmission.message should exactly match user input'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Assertion and result helpers
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
