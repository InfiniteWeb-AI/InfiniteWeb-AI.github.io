// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // IMPORTANT: Use Generated Data ONLY here for initial localStorage population
    const generatedData = {
      financing_plans: [
        {
          id: 'zero_apr_12mo',
          name: '12-Month 0% APR Equal Payments',
          description: 'Pay over 12 months with no interest on qualifying new system purchases.',
          aprPercent: 0,
          termMonths: 12,
          isZeroApr: true,
          minPurchaseAmount: 1000,
          maxPurchaseAmount: 10000,
          eligiblePurchaseTypes: [
            'new_air_conditioner',
            'new_hvac_system',
            'system_replacement',
            'indoor_air_quality_upgrade'
          ],
          isFeatured: true,
          isActive: true
        },
        {
          id: 'zero_apr_18mo',
          name: '18-Month 0% APR Promotional Plan',
          description: 'Extended 0% APR promotional financing for larger projects.',
          aprPercent: 0,
          termMonths: 18,
          isZeroApr: true,
          minPurchaseAmount: 3000,
          maxPurchaseAmount: 15000,
          eligiblePurchaseTypes: [
            'new_air_conditioner',
            'new_hvac_system',
            'ductless_system',
            'indoor_air_quality_upgrade'
          ],
          isFeatured: true,
          isActive: true
        },
        {
          id: 'low_apr_36mo',
          name: '36-Month Low APR Plan',
          description: 'Fixed low-interest payments over 36 months.',
          aprPercent: 4.99,
          termMonths: 36,
          isZeroApr: false,
          minPurchaseAmount: 1500,
          maxPurchaseAmount: 20000,
          eligiblePurchaseTypes: [
            'new_air_conditioner',
            'new_hvac_system',
            'system_replacement',
            'major_repair'
          ],
          isFeatured: false,
          isActive: true
        }
      ],
      maintenance_plans: [
        {
          id: 'comfort_guard_hc_annual',
          name: 'ComfortGuard Heating & Cooling Plan',
          description: 'Annual tune-ups for both your furnace and air conditioner, plus priority service.',
          coverageType: 'heating_cooling',
          billingTerm: 'annual',
          pricePerYear: 179,
          visitsPerYear: 2,
          includesHeating: true,
          includesCooling: true,
          terms: 'Includes one heating and one cooling precision tune-up per year, priority scheduling, and 10% off repairs.',
          isActive: true,
          isFeatured: true
        },
        {
          id: 'comfort_guard_heating_annual',
          name: 'ComfortGuard Heating Plan',
          description: 'Annual furnace tune-up and safety inspection.',
          coverageType: 'heating_only',
          billingTerm: 'annual',
          pricePerYear: 129,
          visitsPerYear: 1,
          includesHeating: true,
          includesCooling: false,
          terms: 'One furnace tune-up per year and 10% discount on heating repairs.',
          isActive: true,
          isFeatured: false
        },
        {
          id: 'comfort_guard_cooling_annual',
          name: 'ComfortGuard Cooling Plan',
          description: 'Annual air conditioner tune-up and cleaning.',
          coverageType: 'cooling_only',
          billingTerm: 'annual',
          pricePerYear: 129,
          visitsPerYear: 1,
          includesHeating: false,
          includesCooling: true,
          terms: 'One AC tune-up per year and 10% discount on cooling repairs.',
          isActive: true,
          isFeatured: false
        }
      ],
      product_categories: [
        {
          id: 'heating_systems',
          urlParamValue: 'heating_systems',
          name: 'Heating Systems',
          description: 'High-efficiency furnaces, heat pumps, and other heating equipment.',
          isActive: true,
          image: 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'cooling_systems',
          urlParamValue: 'cooling_systems',
          name: 'Cooling Systems',
          description: 'Central air conditioners and cooling systems for every home size.',
          isActive: true,
          image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'thermostats',
          urlParamValue: 'thermostats',
          name: 'Thermostats',
          description: 'Smart and programmable thermostats with Wi-Fi and zoning options.',
          isActive: true,
          image: 'https://images.unsplash.com/photo-1517244861293-07cda5bcd0a4?w=800&h=600&fit=crop&auto=format&q=80'
        }
      ],
      services: [
        {
          id: 'heating_repair',
          name: 'Heating & Furnace Repair',
          category: 'heating',
          shortDescription: 'Fast, reliable repairs for furnaces and heating systems.',
          longDescription: 'Our certified technicians diagnose and repair all makes and models of gas furnaces, heat pumps, and electric heating systems. We offer same-day and emergency evening service throughout the Atlanta area.',
          basePrice: 129,
          durationMinutes: 90,
          isEmergencyAvailable: true,
          hasStandardBooking: true,
          hasConsultationOption: false,
          isActive: true,
          image: 'https://images.unsplash.com/photo-1605146769289-440113cc3d00?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'air_conditioning_repair',
          name: 'Air Conditioning Repair',
          category: 'cooling',
          shortDescription: 'AC repair for central air and heat pump systems.',
          longDescription: 'From no-cool calls to strange noises and poor airflow, we troubleshoot and repair air conditioning systems quickly. Standard daytime appointments and limited after-hours emergency service are available.',
          basePrice: 129,
          durationMinutes: 90,
          isEmergencyAvailable: true,
          hasStandardBooking: true,
          hasConsultationOption: false,
          isActive: true,
          image: 'https://i.pinimg.com/originals/cb/65/86/cb6586c2139632d461d4858492c4548d.png'
        },
        {
          id: 'duct_cleaning',
          name: 'Professional Duct Cleaning',
          category: 'duct_services',
          shortDescription: 'Whole-home duct cleaning to improve airflow and reduce dust.',
          longDescription: 'Our duct cleaning service uses negative air machines and rotary brushes to remove dust, debris, and allergens from your supply and return ductwork. Great for allergy sufferers and after renovations.',
          basePrice: 350,
          durationMinutes: 180,
          isEmergencyAvailable: false,
          hasStandardBooking: true,
          hasConsultationOption: false,
          isActive: true,
          image: 'https://cleanductsorlando.com/wp-content/uploads/2020/08/air-duct-cleaning-dirty-vents-1-768x576.jpg'
        }
      ],
      service_areas: [
        {
          id: 'atlanta_core',
          name: 'Atlanta Core Service Area',
          city: 'Atlanta',
          state: 'GA',
          zipCodes: ['30301', '30302', '30303', '30304', '30305', '30309'],
          isActive: true,
          image: 'https://www.ucasset.com/wp-content/uploads/2017/07/ATLANTA-2-e1597243322134.jpg'
        },
        {
          id: 'atlanta_north',
          name: 'North Atlanta',
          city: 'Atlanta',
          state: 'GA',
          zipCodes: ['30326', '30327', '30328', '30342'],
          isActive: true,
          image: 'https://pd12m.s3.us-west-2.amazonaws.com/images/ddc18aa2-be21-5fc1-9ceb-bba05f3dcf39.jpeg'
        },
        {
          id: 'atlanta_east',
          name: 'Eastside Atlanta',
          city: 'Atlanta',
          state: 'GA',
          zipCodes: ['30306', '30307', '30317'],
          isActive: true,
          image: 'https://static.neighborhoods.com/blog/media/edgewood_atlanta_homes_hero-4bbb35f2957824bf496a38e19ff0fbb3.jpg'
        }
      ],
      blog_articles: [
        {
          id: 'indoor-air-quality-atlanta-home',
          title: '10 Ways to Improve Indoor Air Quality in Your Atlanta Home',
          slug: 'improve-indoor-air-quality-atlanta-home',
          excerpt: 'Learn practical steps to reduce dust, allergens, and pollutants in your home and when to consider professional indoor air quality upgrades.',
          content: 'Indoor air quality plays a major role in your familys comfort and healthespecially during Atlantas long cooling season when windows stay closed.\n\nIn this guide, we cover ten proven ways to improve indoor air quality:\n\n1. **Upgrade your air filters**  Standard 1-inch filters often only capture large particles. High-MERV media filters capture much smaller particles, including pollen and pet dander.\n2. **Run your system fan more often**  Using the "circulate" or low-speed fan setting can help continuously filter air.\n3. **Schedule regular HVAC maintenance**  Clean coils and blowers help your system filter air more effectively.\n4. **Seal duct leaks**  Leaky ducts can pull dusty air from attics and crawlspaces.\n5. **Consider a whole-home air purifier**  These systems are installed in your ductwork and can capture a large percentage of airborne particles.\n6. **Add a UV air cleaner**  UV lamps target airborne bacteria and viruses passing through your HVAC system.\n7. **Upgrade to better air filtration**  Media cabinets and HEPA bypass filters greatly increase filtration surface area.\n8. **Control humidity**  Too much humidity encourages mold; too little can irritate sinuses.\n9. **Reduce indoor sources of pollution**  Avoid smoking indoors and limit aerosols and harsh cleaners.\n10. **Schedule a professional IAQ consultation**  An expert can test your air and recommend the right combination of solutions.\n\nFor many homes, the best results come from combining upgraded filtration with a **whole-home air purifier** or **UV air cleaner**. Our team offers:\n\n- Whole-home **Air Purifier Installation**\n- **UV Air Cleaner Installation** in your ductwork\n- **Air Filtration Upgrades** with high-MERV or HEPA options\n\nClick the button below to learn more about each service and request a consultation.',
          heroImageUrl: 'https://images.unsplash.com/photo-1582719478250-cc0aadd573f4?w=800&h=600&fit=crop&auto=format&q=80',
          publishedAt: '2025-11-10T14:30:00Z',
          tags: ['indoor_air_quality', 'cooling', 'heating', 'allergies'],
          recommendedServiceIds: [
            'air_purifier_installation',
            'uv_air_cleaner',
            'air_filtration_upgrade'
          ],
          isFeatured: true
        },
        {
          id: 'benefits-of-duct-cleaning',
          title: 'Are Your Air Ducts Making You Sick? The Benefits of Professional Duct Cleaning',
          slug: 'benefits-of-professional-duct-cleaning',
          excerpt: 'Dusty vents, musty smells, and worsening allergies are all signs it may be time for a duct cleaning.',
          content: 'If you notice dust building up quickly around your vents, musty odors when your system runs, or worsening allergy symptoms at home, your ductwork may be to blame.\n\nOver time, dust, pet hair, construction debris, and other contaminants can accumulate inside your duct system. In some cases, moisture can even allow mold to develop.\n\nProfessional **duct cleaning** uses specialized equipment to safely remove built-up debris from your supply and return ducts. The benefits can include:\n\n- Reduced dust circulating throughout your home\n- Improved airflow from clogged vents\n- Less strain on your HVAC equipment\n- A cleaner environment for allergy and asthma sufferers\n\nOur **Professional Duct Cleaning** service includes a full system inspection, cleaning of accessible supply and return ducts, and before/after photos so you can see the difference.\n\nIf it has been more than 57 years since your last duct cleaningor youve recently completed a renovationschedule a duct cleaning visit to restore cleaner air and proper airflow.',
          heroImageUrl: 'https://img.grouponcdn.com/bynder/WiVoPCSeiijNwxbvfqAFqV6Mfgw/Wi-2048x1229/v1/c700x420.jpg',
          publishedAt: '2025-09-05T10:15:00Z',
          tags: ['indoor_air_quality', 'duct_cleaning', 'maintenance'],
          recommendedServiceIds: ['duct_cleaning'],
          isFeatured: false
        },
        {
          id: 'signs-you-need-furnace-repair',
          title: '7 Signs You Need Furnace Repair Before the Next Cold Front',
          slug: 'signs-you-need-furnace-repair',
          excerpt: 'Strange noises, cold spots, and rising utility bills can all point to a furnace that needs attention.',
          content: 'A reliable furnace is essential during Atlantas cold snaps. Ignoring small issues can lead to inconvenient breakdownsor even safety risks.\n\nHere are seven common signs its time to schedule **Heating & Furnace Repair**:\n\n1. Unusual banging, scraping, or whistling noises\n2. Rooms that never seem to get warm enough\n3. Frequent on/off cycling\n4. A yellow or flickering burner flame\n5. Unexplained spikes in your gas or power bill\n6. A burning or electrical smell when the heat runs\n7. The system is more than 1015 years old and hasnt been serviced\n\nOur technicians provide thorough diagnostics and up-front pricing for all **Heating & Furnace Repair** visits. If we find that replacement makes more sense, well walk you through high-efficiency furnace options that can lower your energy bills.',
          heroImageUrl: 'https://images.unsplash.com/photo-1608219959301-3bdbcbd26f86?w=800&h=600&fit=crop&auto=format&q=80',
          publishedAt: '2025-10-20T09:00:00Z',
          tags: ['heating', 'repair', 'safety'],
          recommendedServiceIds: ['heating_repair'],
          isFeatured: false
        }
      ],
      products: [
        {
          id: 'comfortmax-96-gas-furnace',
          name: 'ComfortMax 96 High-Efficiency Gas Furnace',
          sku: 'FUR-CM96-080',
          categoryKey: 'heating_systems',
          shortDescription: '96% AFUE two-stage gas furnace for quiet, efficient heating.',
          longDescription: 'The ComfortMax 96 features a 96% AFUE rating, two-stage gas valve, and variable-speed blower for even, energy-efficient comfort. Ideal for most Atlanta-area homes looking to lower winter energy bills.',
          price: 3200,
          efficiencyType: 'afue',
          efficiencyValue: 96,
          isHighEfficiency: true,
          featureTags: ['two_stage', 'variable_speed_blower', 'high_efficiency'],
          ratingAverage: 4.8,
          ratingCount: 210,
          imageUrl: 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?w=800&h=600&fit=crop&auto=format&q=80',
          isActive: true,
          createdAt: '2025-10-15T10:00:00Z'
        },
        {
          id: 'ecoheat-98-modulating-furnace',
          name: 'EcoHeat 98 Modulating Gas Furnace',
          sku: 'FUR-EH98-100',
          categoryKey: 'heating_systems',
          shortDescription: 'Ultra high-efficiency 98% AFUE modulating furnace.',
          longDescription: 'For homeowners who want maximum efficiency and comfort, the EcoHeat 98 offers 98% AFUE performance with a fully modulating gas valve. It automatically adjusts output to match your homes heating needs.',
          price: 3399,
          efficiencyType: 'afue',
          efficiencyValue: 98,
          isHighEfficiency: true,
          featureTags: ['modulating', 'variable_speed_blower', 'quiet_operation', 'high_efficiency'],
          ratingAverage: 4.7,
          ratingCount: 145,
          imageUrl: 'https://img.hunkercdn.com/640/cme-data/getty%2Fcc4b2c96c708475d9dcf3fd4fb61a8ae.jpg',
          isActive: true,
          createdAt: '2025-11-02T11:30:00Z'
        },
        {
          id: 'valueheat-95-gas-furnace',
          name: 'ValueHeat 95 Gas Furnace',
          sku: 'FUR-VH95-070',
          categoryKey: 'heating_systems',
          shortDescription: 'Budget-friendly 95% AFUE gas furnace.',
          longDescription: 'The ValueHeat 95 delivers 95% AFUE efficiency in a compact design, ideal for homeowners upgrading from an older 80% furnace without breaking the budget.',
          price: 2899,
          efficiencyType: 'afue',
          efficiencyValue: 95,
          isHighEfficiency: true,
          featureTags: ['single_stage', 'compact', 'high_efficiency'],
          ratingAverage: 4.3,
          ratingCount: 98,
          imageUrl: 'https://www.griffithenergyservices.com/wp-content/uploads/2020/05/heating-installation.jpg',
          isActive: true,
          createdAt: '2025-09-20T09:45:00Z'
        }
      ],
      special_offers: [
        {
          id: 'spring_duct_cleaning_20off',
          title: 'Spring Duct Cleaning Special  20% Off',
          shortDescription: 'Save 20% on whole-home duct cleaning this spring.',
          longDescription: 'Breathe easier this season with our Spring Duct Cleaning Special. For a limited time, get 20% off our Professional Duct Cleaning service for single-system homes. Includes full inspection, cleaning of accessible supply and return ducts, and before/after photos.',
          category: 'duct_services',
          discountType: 'percentage',
          discountPercent: 20,
          promotionalPrice: null,
          minimumPurchaseAmount: 300,
          serviceIds: ['duct_cleaning'],
          productCategoryKeys: [],
          promoCode: 'SPRINGDUCT20',
          startDate: '2026-02-01T00:00:00Z',
          endDate: '2026-05-31T23:59:59Z',
          isActive: true
        },
        {
          id: 'whole_home_duct_cleaning_249',
          title: 'Whole-Home Duct Cleaning for $249',
          shortDescription: 'Limited-time flat rate for standard single-system duct cleaning.',
          longDescription: 'For qualifying homes with a single HVAC system and up to 12 vents per level, schedule complete duct cleaning for just $249. Extra systems and vents available at an additional charge.',
          category: 'duct_services',
          discountType: 'fixed_price',
          discountPercent: null,
          promotionalPrice: 249,
          minimumPurchaseAmount: null,
          serviceIds: ['duct_cleaning'],
          productCategoryKeys: [],
          promoCode: 'DUCT249',
          startDate: '2026-01-10T00:00:00Z',
          endDate: '2026-04-30T23:59:59Z',
          isActive: true
        },
        {
          id: 'iaq_bundle_savings_150off',
          title: 'Indoor Air Quality Bundle  Save $150',
          shortDescription: 'Save $150 when you bundle an air purifier with a UV air cleaner.',
          longDescription: 'Upgrade your homes indoor air quality with a whole-home air purifier and UV air cleaner installed together and save $150 on the combined package.',
          category: 'indoor_air_quality',
          discountType: 'amount_off',
          discountPercent: null,
          promotionalPrice: null,
          minimumPurchaseAmount: 1200,
          serviceIds: ['air_purifier_installation', 'uv_air_cleaner'],
          productCategoryKeys: [],
          promoCode: 'IAQBUNDLE150',
          startDate: '2025-11-01T00:00:00Z',
          endDate: '2026-06-30T23:59:59Z',
          isActive: true
        }
      ]
    };

    const set = (key, value) => {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(value));
    };

    set('financing_plans', generatedData.financing_plans);
    set('maintenance_plans', generatedData.maintenance_plans);
    set('product_categories', generatedData.product_categories);
    set('services', generatedData.services);
    set('service_areas', generatedData.service_areas);
    set('blog_articles', generatedData.blog_articles);
    set('products', generatedData.products);
    set('special_offers', generatedData.special_offers);
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_ScheduleStandardAcRepair();
    this.testTask2_RequestFurnaceInstallQuote();
    this.testTask3_PurchaseCheapestAnnualMaintenancePlan();
    this.testTask4_BookDuctCleaningWithPromotion();
    this.testTask5_SubmitEmergencyHeatingRequest();
    this.testTask6_ScheduleSmartThermostatInstallation();
    this.testTask7_StartFinancingRequestForNewAC();
    this.testTask8_RequestIndoorAirQualityConsultation();

    return this.results;
  }

  // ---------- Helper methods ----------

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

  formatDate(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  getNextSaturday(fromDate) {
    const d = new Date(fromDate.getTime());
    const day = d.getDay(); // 0=Sun, 6=Sat
    const diff = (6 - day + 7) % 7;
    d.setDate(d.getDate() + diff);
    return d;
  }

  getFifteenthOfNextMonth(fromDate) {
    const year = fromDate.getFullYear();
    const month = fromDate.getMonth();
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    return new Date(nextYear, nextMonth, 15, 0, 0, 0, 0);
  }

  getNextWeekdayWithin7Days(fromDate) {
    // Return the earliest weekday (Mon-Fri) within the next 7 days (including today)
    for (let i = 0; i <= 7; i++) {
      const d = this.addDays(fromDate, i);
      const day = d.getDay();
      if (day >= 1 && day <= 5) {
        return d;
      }
    }
    return this.addDays(fromDate, 1);
  }

  findSlotWithinWindow(timeSlots, minStartHour, maxEndHour) {
    if (!Array.isArray(timeSlots)) return null;
    const available = timeSlots.filter(s => s && s.isAvailable);
    available.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    for (let i = 0; i < available.length; i++) {
      const slot = available[i];
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      const sh = start.getHours();
      const eh = end.getHours();
      if (sh >= minStartHour && eh <= maxEndHour) {
        return slot;
      }
    }
    return null;
  }

  findSlotStartingAtOrAfter(timeSlots, minStartHour) {
    if (!Array.isArray(timeSlots)) return null;
    const available = timeSlots.filter(s => s && s.isAvailable);
    available.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    for (let i = 0; i < available.length; i++) {
      const slot = available[i];
      const start = new Date(slot.start);
      const sh = start.getHours();
      if (sh >= minStartHour) {
        return slot;
      }
    }
    return null;
  }

  findAfternoonSlot(timeSlots) {
    // Afternoon ~ 12:00-17:00 start
    if (!Array.isArray(timeSlots)) return null;
    const available = timeSlots.filter(s => s && s.isAvailable);
    available.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    for (let i = 0; i < available.length; i++) {
      const slot = available[i];
      const start = new Date(slot.start);
      const sh = start.getHours();
      if (sh >= 12 && sh < 17) {
        return slot;
      }
    }
    return null;
  }

  // ---------- Task 1 ----------
  // Schedule the earliest standard AC repair appointment this Saturday between 9–11 AM
  testTask1_ScheduleStandardAcRepair() {
    const testName = 'Task 1: Schedule earliest standard AC repair on Saturday 9-11 AM';
    try {
      const zip = '30301';

      // Validate service area
      const areaResult = this.logic.validateServiceAreaByZip(zip);
      this.assert(areaResult && areaResult.isServiceable === true, 'ZIP ' + zip + ' should be serviceable');
      const city = areaResult.city || undefined;
      const state = areaResult.state || undefined;

      // Get bookable services and find Air Conditioning Repair
      const bookingOptions = this.logic.getBookableServicesAndOptions();
      this.assert(bookingOptions && Array.isArray(bookingOptions.services), 'Should return bookable services');
      const acServiceEntry = bookingOptions.services.find(s => s.serviceName && s.serviceName.toLowerCase().indexOf('air conditioning repair') !== -1);
      this.assert(acServiceEntry, 'Air Conditioning Repair service should be available for booking');
      const serviceId = acServiceEntry.serviceId;

      // Date: nearest upcoming Saturday
      const today = new Date();
      const saturday = this.getNextSaturday(today);
      const dateStr = this.formatDate(saturday);

      // Get available standard service time slots
      const slotsResult = this.logic.getAvailableTimeSlots(
        serviceId,
        dateStr,
        'service',
        'standard',
        zip,
        acServiceEntry.durationMinutes || undefined,
        undefined,
        undefined
      );
      this.assert(slotsResult && Array.isArray(slotsResult.timeSlots), 'Should return AC repair time slots');

      // Find earliest available slot between 9-11 AM
      const chosenSlot = this.findSlotWithinWindow(slotsResult.timeSlots, 9, 11);
      this.assert(chosenSlot, 'Should find available AC repair slot between 9-11 AM');

      // Create booking
      const bookingResult = this.logic.createBooking(
        'service',
        'standard',
        serviceId,
        undefined,
        undefined,
        chosenSlot.start,
        chosenSlot.end,
        chosenSlot.label,
        'morning',
        zip,
        city,
        state,
        undefined,
        'Alex Johnson',
        '4045557890',
        'alex@example.com',
        undefined,
        undefined
      );

      this.assert(bookingResult && bookingResult.success === true, 'AC repair booking should succeed');
      this.assert(bookingResult.bookingId, 'AC repair booking should return bookingId');

      // Verify booking details
      const details = this.logic.getBookingDetails(bookingResult.bookingId);
      this.assert(details && details.booking, 'Should load booking details');
      const booking = details.booking;
      this.assert(booking.serviceId === serviceId, 'Booking serviceId should match AC repair service');
      this.assert(booking.zip === zip, 'Booking ZIP should match input ZIP');
      this.assert(new Date(booking.appointmentStart).getDay() === 6, 'Appointment should be on Saturday');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 2 ----------
  // Request a quote for the highest-rated high-efficiency furnace under $3,500
  testTask2_RequestFurnaceInstallQuote() {
    const testName = 'Task 2: Request quote for highest-rated high-efficiency furnace under 3500';
    try {
      // Search for furnaces in heating_systems category
      const searchResult = this.logic.searchProducts(
        undefined,
        'heating_systems',
        {
          maxPrice: 3500,
          isHighEfficiency: true,
          onlyActive: true
        },
        'customer_rating_high_to_low',
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.products), 'Furnace search should return products');
      this.assert(searchResult.products.length > 0, 'There should be at least one high-efficiency furnace under $3,500');

      const topProduct = searchResult.products[0];
      this.assert(topProduct.price <= 3500, 'Top furnace price should be <= 3500');
      if (typeof topProduct.efficiencyValue === 'number') {
        this.assert(topProduct.efficiencyValue >= 95, 'Top furnace efficiency should be >= 95');
      }

      // Ensure it is highest-rated within this filtered result
      for (let i = 1; i < searchResult.products.length; i++) {
        const p = searchResult.products[i];
        if (typeof p.ratingAverage === 'number') {
          this.assert(
            topProduct.ratingAverage >= p.ratingAverage,
            'Top furnace should have rating >= any other filtered furnace'
          );
        }
      }

      // Get product details
      const details = this.logic.getProductDetails(topProduct.id);
      this.assert(details && details.product, 'Should load furnace product details');
      this.assert(details.product.id === topProduct.id, 'Product details id should match selected furnace');

      // Submit installation quote request
      const quoteResult = this.logic.createInstallationQuoteRequest(
        topProduct.id,
        'Jordan Smith',
        '123 Oak Street',
        'Atlanta',
        undefined,
        '30301',
        '4045551122',
        'jordan@example.com',
        undefined
      );

      this.assert(quoteResult && quoteResult.success === true, 'Installation quote request should succeed');
      this.assert(quoteResult.quoteRequestId, 'Quote request should return quoteRequestId');

      // Verify persisted quote using storage key
      const storedRaw = localStorage.getItem('installation_quote_requests') || '[]';
      const stored = JSON.parse(storedRaw);
      const storedRequest = stored.find(r => r.id === quoteResult.quoteRequestId);
      this.assert(storedRequest, 'Stored installation quote request should exist');
      this.assert(storedRequest.productId === topProduct.id, 'Stored quote should reference selected furnace product');
      this.assert(storedRequest.contactName === 'Jordan Smith', 'Stored quote contactName should match input');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 3 ----------
  // Purchase the cheapest annual maintenance plan covering both heating and cooling under $200
  testTask3_PurchaseCheapestAnnualMaintenancePlan() {
    const testName = 'Task 3: Purchase cheapest annual heating & cooling maintenance plan under 200';
    try {
      // Get maintenance plans filtered and sorted
      const plansResult = this.logic.getMaintenancePlans(
        {
          coverageTypes: ['heating_cooling', 'whole_home_heating_cooling'],
          billingTerm: 'annual',
          maxPricePerYear: 200,
          includesHeating: true,
          includesCooling: true,
          onlyActive: true
        },
        'price_low_to_high'
      );

      this.assert(plansResult && Array.isArray(plansResult.plans), 'Maintenance plan search should return plans');
      this.assert(plansResult.plans.length > 0, 'There should be at least one qualifying maintenance plan');

      const chosenPlan = plansResult.plans[0];
      this.assert(chosenPlan.pricePerYear <= 200, 'Chosen plan pricePerYear should be <= 200');
      this.assert(chosenPlan.includesHeating && chosenPlan.includesCooling, 'Chosen plan should cover both heating and cooling');

      // View plan details
      const planDetails = this.logic.getMaintenancePlanDetails(chosenPlan.id);
      this.assert(planDetails && planDetails.plan, 'Should load maintenance plan details');
      this.assert(planDetails.plan.id === chosenPlan.id, 'Plan details id should match chosen plan');

      // Add plan to cart
      const addResult = this.logic.addMaintenancePlanToCart(chosenPlan.id, 1);
      this.assert(addResult && addResult.success === true, 'Adding maintenance plan to cart should succeed');
      this.assert(addResult.cartId, 'addMaintenancePlanToCart should return cartId');

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && Array.isArray(cartSummary.items), 'Cart summary should return items');
      const cartItem = cartSummary.items.find(it => it.name === chosenPlan.name);
      this.assert(cartItem, 'Cart should contain chosen maintenance plan');
      this.assert(cartItem.quantity === 1, 'Cart quantity for maintenance plan should be 1');

      // Checkout summary
      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && checkoutSummary.cartSummary, 'Checkout summary should include cartSummary');
      this.assert(
        checkoutSummary.cartSummary.total === cartSummary.total,
        'Checkout total should match cart summary total'
      );

      // Place order
      const orderResult = this.logic.placeOrder(
        'Taylor',
        'Green',
        'taylor@example.com',
        '4045553344',
        '456 Pine Avenue',
        'Atlanta',
        undefined,
        '30302',
        'credit_card',
        '4111111111111111',
        '12/28',
        '123',
        true
      );

      this.assert(orderResult && orderResult.success === true, 'Order placement should succeed');
      this.assert(orderResult.orderId, 'Order placement should return orderId');
      this.assert(orderResult.total === cartSummary.total, 'Order total should match cart total');

      // Verify Order persisted
      const ordersRaw = localStorage.getItem('orders') || '[]';
      const orders = JSON.parse(ordersRaw);
      const storedOrder = orders.find(o => o.id === orderResult.orderId);
      this.assert(storedOrder, 'Stored order should exist');
      this.assert(storedOrder.cartId, 'Stored order should reference a cartId');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 4 ----------
  // Book a duct cleaning service using a promotion with at least 15% discount or price <= $250
  testTask4_BookDuctCleaningWithPromotion() {
    const testName = 'Task 4: Book duct cleaning with qualifying promotion';
    try {
      // Get special offers for duct services
      const offersResult = this.logic.getSpecialOffers(
        {
          category: 'duct_services',
          onlyActive: true
        },
        undefined
      );

      this.assert(offersResult && Array.isArray(offersResult.offers), 'Special offers search should return offers');
      this.assert(offersResult.offers.length > 0, 'There should be at least one duct services offer');

      // Find first qualifying duct cleaning promotion
      let chosenOffer = null;
      for (let i = 0; i < offersResult.offers.length; i++) {
        const o = offersResult.offers[i];
        const title = (o.title || '').toLowerCase();
        const desc = (o.shortDescription || '').toLowerCase();
        const mentionsDuct = title.indexOf('duct cleaning') !== -1 || desc.indexOf('duct cleaning') !== -1;
        const hasPercent = typeof o.discountPercent === 'number' && o.discountPercent >= 15;
        const hasPromoPrice = typeof o.promotionalPrice === 'number' && o.promotionalPrice <= 250;
        if (mentionsDuct && (hasPercent || hasPromoPrice)) {
          chosenOffer = o;
          break;
        }
      }
      this.assert(chosenOffer, 'Should find a qualifying duct cleaning promotion');

      // Load offer details to get applicable service
      const offerDetails = this.logic.getSpecialOfferDetails(chosenOffer.id);
      this.assert(offerDetails && offerDetails.offer, 'Should load special offer details');
      this.assert(
        Array.isArray(offerDetails.applicableServices) && offerDetails.applicableServices.length > 0,
        'Offer should have applicable services'
      );
      const ductServiceRef = offerDetails.applicableServices.find(s => (s.category || '').toLowerCase().indexOf('duct') !== -1) || offerDetails.applicableServices[0];
      const serviceId = ductServiceRef.serviceId;

      // Validate ZIP and get city/state
      const zip = '30303';
      const areaResult = this.logic.validateServiceAreaByZip(zip);
      this.assert(areaResult && areaResult.isServiceable === true, 'ZIP ' + zip + ' should be serviceable');
      const city = areaResult.city || undefined;
      const state = areaResult.state || undefined;

      // Date: 15th of next month
      const today = new Date();
      const targetDate = this.getFifteenthOfNextMonth(today);
      const dateStr = this.formatDate(targetDate);

      // Get time slots for promotion booking
      const slotsResult = this.logic.getAvailableTimeSlots(
        serviceId,
        dateStr,
        'promotion_booking',
        'standard',
        zip,
        undefined,
        undefined,
        chosenOffer.id
      );
      this.assert(slotsResult && Array.isArray(slotsResult.timeSlots), 'Should return duct cleaning time slots');

      // Choose an afternoon slot
      const chosenSlot = this.findAfternoonSlot(slotsResult.timeSlots);
      this.assert(chosenSlot, 'Should find an afternoon time slot for duct cleaning');

      // Create booking with promotion
      const bookingResult = this.logic.createBooking(
        'promotion_booking',
        'standard',
        serviceId,
        undefined,
        chosenOffer.id,
        chosenSlot.start,
        chosenSlot.end,
        chosenSlot.label,
        'afternoon',
        zip,
        city,
        state,
        '789 Maple Drive',
        'Morgan Lee',
        '4045556677',
        'morgan@example.com',
        undefined,
        undefined
      );

      this.assert(bookingResult && bookingResult.success === true, 'Duct cleaning promotion booking should succeed');
      this.assert(bookingResult.bookingId, 'Promotion booking should return bookingId');
      this.assert(bookingResult.promotionApplied === true || bookingResult.summary.offerTitle, 'Promotion should be reflected in booking result');

      // Verify booking stored with offerId
      const bookingsRaw = localStorage.getItem('bookings') || '[]';
      const bookings = JSON.parse(bookingsRaw);
      const storedBooking = bookings.find(b => b.id === bookingResult.bookingId);
      this.assert(storedBooking, 'Stored booking should exist for duct cleaning promotion');
      this.assert(storedBooking.offerId === chosenOffer.id, 'Stored booking should reference chosen offer');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 5 ----------
  // Submit an emergency heating service request for tonight after 8:00 PM
  testTask5_SubmitEmergencyHeatingRequest() {
    const testName = 'Task 5: Submit emergency heating service request after 8 PM';
    try {
      const zip = '30309';
      const areaResult = this.logic.validateServiceAreaByZip(zip);
      this.assert(areaResult && areaResult.isServiceable === true, 'ZIP ' + zip + ' should be serviceable');
      const city = areaResult.city || undefined;
      const state = areaResult.state || undefined;

      // Get heating repair service from bookable services
      const bookingOptions = this.logic.getBookableServicesAndOptions();
      this.assert(bookingOptions && Array.isArray(bookingOptions.services), 'Should return bookable services');
      const heatingServiceEntry = bookingOptions.services.find(s => (s.category || '').toLowerCase() === 'heating' || (s.serviceName || '').toLowerCase().indexOf('heating') !== -1);
      this.assert(heatingServiceEntry, 'Heating repair service should be available');
      const serviceId = heatingServiceEntry.serviceId;

      // Confirm emergency options
      const serviceDetails = this.logic.getServiceDetails(serviceId);
      this.assert(serviceDetails && serviceDetails.service, 'Should load heating service details');
      this.assert(
        serviceDetails.emergencyOptions && serviceDetails.emergencyOptions.isEmergencyAvailable === true,
        'Heating repair should support emergency service'
      );

      // Date: today
      const today = new Date();
      const dateStr = this.formatDate(today);

      // Get emergency time slots for today
      const slotsResult = this.logic.getAvailableTimeSlots(
        serviceId,
        dateStr,
        'emergency',
        'emergency',
        zip,
        heatingServiceEntry.durationMinutes || undefined,
        undefined,
        undefined
      );
      this.assert(slotsResult && Array.isArray(slotsResult.timeSlots), 'Should return emergency heating time slots');

      // Pick an emergency slot starting at or after 8 PM (20:00)
      const chosenSlot = this.findSlotStartingAtOrAfter(slotsResult.timeSlots, 20);
      this.assert(chosenSlot, 'Should find an emergency slot starting at or after 8 PM');

      const problemDescription = 'No heat, furnace not turning on since this evening.';

      // Create emergency booking
      const bookingResult = this.logic.createBooking(
        'emergency',
        'emergency',
        serviceId,
        undefined,
        undefined,
        chosenSlot.start,
        chosenSlot.end,
        chosenSlot.label,
        'evening',
        zip,
        city,
        state,
        undefined,
        'Chris Martinez',
        '4045559900',
        'chris@example.com',
        problemDescription,
        undefined
      );

      this.assert(bookingResult && bookingResult.success === true, 'Emergency heating booking should succeed');
      this.assert(bookingResult.bookingId, 'Emergency booking should return bookingId');

      // Verify booking details
      const details = this.logic.getBookingDetails(bookingResult.bookingId);
      this.assert(details && details.booking, 'Should load emergency booking details');
      const booking = details.booking;
      this.assert(booking.serviceId === serviceId, 'Emergency booking serviceId should match heating repair');
      this.assert(booking.zip === zip, 'Emergency booking ZIP should match input');
      this.assert(booking.problemDescription === problemDescription, 'Problem description should be stored correctly');
      const startHour = new Date(booking.appointmentStart).getHours();
      this.assert(startHour >= 20, 'Emergency appointment should start at or after 8 PM');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 6 ----------
  // Schedule installation of a smart thermostat under $250 with Wi-Fi and 4+ star rating
  testTask6_ScheduleSmartThermostatInstallation() {
    const testName = 'Task 6: Schedule installation of qualifying smart thermostat';
    try {
      // Search for smart thermostats
      const searchResult = this.logic.searchProducts(
        'smart thermostat',
        'thermostats',
        {
          maxPrice: 250,
          minRating: 4,
          onlyActive: true
        },
        'price_low_to_high',
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.products), 'Smart thermostat search should return products');
      this.assert(searchResult.products.length > 0, 'There should be at least one smart thermostat result');

      // Filter client-side for Wi-Fi / smart feature tags and rating>=4, price<=250
      const qualifying = searchResult.products.filter(p => {
        const priceOk = typeof p.price === 'number' && p.price <= 250;
        const ratingOk = typeof p.ratingAverage === 'number' && p.ratingAverage >= 4;
        const tags = Array.isArray(p.featureTags) ? p.featureTags : [];
        const wifiOk = tags.some(t => t === 'wifi_enabled' || t === 'smart_connected' || t.toLowerCase().indexOf('wifi') !== -1);
        return priceOk && ratingOk && wifiOk;
      });

      this.assert(qualifying.length > 0, 'There should be at least one Wi-Fi smart thermostat under $250 with rating >= 4');

      // Choose the cheapest qualifying (search already sorted by price_low_to_high)
      const chosenThermostat = qualifying[0];

      // Get product details to find installation service
      const details = this.logic.getProductDetails(chosenThermostat.id);
      this.assert(details && details.product, 'Should load thermostat product details');
      this.assert(details.installationServiceId, 'Thermostat product should provide installationServiceId');
      const installationServiceId = details.installationServiceId;
      const installationServiceName = details.installationServiceName || '';

      // Validate service area for thermostat installation address
      const zip = '30304';
      const areaResult = this.logic.validateServiceAreaByZip(zip);
      this.assert(areaResult && areaResult.isServiceable === true, 'ZIP ' + zip + ' should be serviceable');
      const city = areaResult.city || undefined;
      const state = areaResult.state || undefined;

      // Date: two weeks from today
      const today = new Date();
      const installDate = this.addDays(today, 14);
      const dateStr = this.formatDate(installDate);

      // Get installation time slots
      const slotsResult = this.logic.getAvailableTimeSlots(
        installationServiceId,
        dateStr,
        'installation',
        'standard',
        zip,
        undefined,
        chosenThermostat.id,
        undefined
      );
      this.assert(slotsResult && Array.isArray(slotsResult.timeSlots), 'Should return installation time slots');

      // Find a 10:00-12:00 window (approx: start at 10, end <=12)
      const chosenSlot = this.findSlotWithinWindow(slotsResult.timeSlots, 10, 12);
      this.assert(chosenSlot, 'Should find a 10:00 AM – 12:00 PM installation time slot');

      // Create installation booking
      const bookingResult = this.logic.createBooking(
        'installation',
        'standard',
        installationServiceId,
        chosenThermostat.id,
        undefined,
        chosenSlot.start,
        chosenSlot.end,
        chosenSlot.label,
        undefined,
        zip,
        city,
        state,
        '321 Birch Lane',
        'Jamie Parker',
        '4045552211',
        'jamie@example.com',
        undefined,
        undefined
      );

      this.assert(bookingResult && bookingResult.success === true, 'Thermostat installation booking should succeed');
      this.assert(bookingResult.bookingId, 'Installation booking should return bookingId');

      // Verify booking details link product and service
      const detailsBooking = this.logic.getBookingDetails(bookingResult.bookingId);
      this.assert(detailsBooking && detailsBooking.booking, 'Should load installation booking details');
      const booking = detailsBooking.booking;
      this.assert(booking.productId === chosenThermostat.id, 'Installation booking should reference chosen thermostat product');
      this.assert(booking.serviceId === installationServiceId, 'Installation booking should reference thermostat installation service');
      if (detailsBooking.serviceName) {
        this.assert(detailsBooking.serviceName === installationServiceName, 'Service name snapshot should match installation service name');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 7 ----------
  // Start a financing request for a $5,000 new air conditioner using a 12-month 0% APR plan
  testTask7_StartFinancingRequestForNewAC() {
    const testName = 'Task 7: Start financing request for $5000 new air conditioner using 0% APR plan';
    try {
      // Get zero APR plans with at least 12 months term for new_air_conditioner
      const plansResult = this.logic.getFinancingPlans(
        {
          isZeroApr: true,
          minTermMonths: 12,
          purpose: 'new_air_conditioner'
        },
        'term_short_to_long'
      );

      this.assert(plansResult && Array.isArray(plansResult.plans), 'Financing plan search should return plans');
      this.assert(plansResult.plans.length > 0, 'There should be at least one zero APR plan with term >= 12 months');

      // Choose first qualifying plan with term >=12 and isZeroApr true
      const qualifyingPlans = plansResult.plans.filter(p => p.isZeroApr === true && p.termMonths >= 12);
      this.assert(qualifyingPlans.length > 0, 'There should be at least one qualifying zero APR 12+ month plan');
      const plan = qualifyingPlans[0];

      // Verify 5000 is within min/max purchase range if defined
      const amount = 5000;
      if (typeof plan.minPurchaseAmount === 'number') {
        this.assert(amount >= plan.minPurchaseAmount, 'Purchase amount should be >= plan.minPurchaseAmount');
      }
      if (typeof plan.maxPurchaseAmount === 'number') {
        this.assert(amount <= plan.maxPurchaseAmount, 'Purchase amount should be <= plan.maxPurchaseAmount');
      }

      // Get plan details
      const planDetails = this.logic.getFinancingPlanDetails(plan.id);
      this.assert(planDetails && planDetails.plan, 'Should load financing plan details');
      this.assert(planDetails.plan.id === plan.id, 'Financing plan details id should match selected plan');

      // Create financing application
      const appResult = this.logic.createFinancingApplication(
        plan.id,
        amount,
        'new_air_conditioner',
        'Riley Thompson',
        '852 Cedar Street',
        'Atlanta',
        undefined,
        '30305',
        '4045557788',
        'riley@example.com',
        '1234',
        'email'
      );

      this.assert(appResult && appResult.success === true, 'Financing application should succeed');
      this.assert(appResult.financingApplicationId, 'Financing application should return ID');

      // Verify application stored with correct plan and amount
      const appsRaw = localStorage.getItem('financing_applications') || '[]';
      const apps = JSON.parse(appsRaw);
      const storedApp = apps.find(a => a.id === appResult.financingApplicationId);
      this.assert(storedApp, 'Stored financing application should exist');
      this.assert(storedApp.financingPlanId === plan.id, 'Stored application should reference selected plan');
      this.assert(storedApp.purchaseAmount === amount, 'Stored application purchaseAmount should be 5000');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ---------- Task 8 ----------
  // Request a consultation for an indoor air quality service recommended in an article
  testTask8_RequestIndoorAirQualityConsultation() {
    const testName = 'Task 8: Request consultation for IAQ service from article recommendation';
    try {
      // Find indoor air quality article via blog search
      const articlesResult = this.logic.getBlogArticles(
        'indoor air quality',
        undefined,
        'newest',
        1,
        10
      );

      this.assert(articlesResult && Array.isArray(articlesResult.articles), 'Blog search should return articles');
      const iaqArticle = articlesResult.articles.find(a => (a.title || '').toLowerCase().indexOf('indoor air quality') !== -1) || articlesResult.articles[0];
      this.assert(iaqArticle, 'Should find at least one indoor air quality article');

      // Load article details and recommended services
      const articleDetails = this.logic.getArticleDetails(iaqArticle.id);
      this.assert(articleDetails && articleDetails.article, 'Should load article details');
      this.assert(
        Array.isArray(articleDetails.recommendedServices) && articleDetails.recommendedServices.length > 0,
        'Article should include recommended services'
      );

      // Choose first recommended IAQ service
      const iaqService = articleDetails.recommendedServices[0];
      const serviceId = iaqService.id || iaqService.serviceId || iaqService.name && iaqService.name.toLowerCase().indexOf('air') !== -1;
      // If the above heuristic did not resolve id, fall back to iaqService.id
      const resolvedServiceId = iaqService.id || iaqService.serviceId;
      this.assert(resolvedServiceId, 'IAQ service should have an identifiable serviceId');

      // Get service details to ensure consultation option is available
      const serviceDetails = this.logic.getServiceDetails(resolvedServiceId);
      this.assert(serviceDetails && serviceDetails.service, 'Should load IAQ service details');
      this.assert(
        serviceDetails.consultationOptions && serviceDetails.consultationOptions.hasConsultationOption === true,
        'IAQ service should support consultations'
      );

      // Pick an afternoon time-of-day option if available
      const timeOfDayOptions = serviceDetails.consultationOptions.timeOfDayOptions || [];
      let preferredTimeOfDay = 'afternoon';
      const afternoonOption = timeOfDayOptions.find(o => (o.value || '').toLowerCase() === 'afternoon' || (o.label || '').toLowerCase().indexOf('afternoon') !== -1);
      if (afternoonOption && afternoonOption.value) {
        preferredTimeOfDay = afternoonOption.value;
      }

      // Date: weekday within next 7 days
      const today = new Date();
      const preferredDate = this.getNextWeekdayWithin7Days(today);
      const dateStr = this.formatDate(preferredDate);

      // Validate service area (use a core ZIP)
      const zip = '30301';
      const areaResult = this.logic.validateServiceAreaByZip(zip);
      this.assert(areaResult && areaResult.isServiceable === true, 'ZIP ' + zip + ' should be serviceable');
      const city = areaResult.city || undefined;
      const state = areaResult.state || undefined;

      // Get consultation time slots
      const slotsResult = this.logic.getAvailableTimeSlots(
        resolvedServiceId,
        dateStr,
        'consultation',
        'standard',
        zip,
        undefined,
        undefined,
        undefined
      );
      this.assert(slotsResult && Array.isArray(slotsResult.timeSlots), 'Should return IAQ consultation time slots');

      const chosenSlot = this.findAfternoonSlot(slotsResult.timeSlots) || (slotsResult.timeSlots.find(s => s.isAvailable) || null);
      this.assert(chosenSlot, 'Should choose at least one available consultation time slot');

      const message = 'Interested in improving indoor air quality for my home.';

      // Create consultation booking
      const bookingResult = this.logic.createBooking(
        'consultation',
        'standard',
        resolvedServiceId,
        undefined,
        undefined,
        chosenSlot.start,
        chosenSlot.end,
        chosenSlot.label,
        preferredTimeOfDay,
        zip,
        city,
        state,
        undefined,
        'Alexis Rivera',
        '4045555566',
        'alexis@example.com',
        undefined,
        message
      );

      this.assert(bookingResult && bookingResult.success === true, 'IAQ consultation booking should succeed');
      this.assert(bookingResult.bookingId, 'Consultation booking should return bookingId');

      // Verify booking payload
      const detailsBooking = this.logic.getBookingDetails(bookingResult.bookingId);
      this.assert(detailsBooking && detailsBooking.booking, 'Should load consultation booking details');
      const booking = detailsBooking.booking;
      this.assert(booking.serviceId === resolvedServiceId, 'Consultation booking should reference IAQ service');
      this.assert(booking.message === message, 'Consultation message should be stored correctly');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
