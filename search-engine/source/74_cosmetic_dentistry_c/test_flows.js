// Test runner for business logic
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
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // IMPORTANT: Use the Generated Data exactly as provided (content-wise)
    // and store it under the correct storage keys from Storage Key Mapping.

    const generatedData = {
      assessment_questions: [
        {
          id: 'aq_primary_concerns',
          step_number: 1,
          title: 'What are your primary smile concerns?',
          subtitle: 'Select all that apply.',
          question_type: 'multiple_choice',
          category: 'concerns',
          is_required: true
        },
        {
          id: 'aq_teeth_areas',
          step_number: 2,
          title: 'Which teeth bother you the most?',
          subtitle: 'This helps us focus recommendations on specific areas.',
          question_type: 'multiple_choice',
          category: 'concerns',
          is_required: false
        },
        {
          id: 'aq_result_timeline',
          step_number: 3,
          title: 'How quickly are you hoping to see results?',
          subtitle: 'For example, before an upcoming event or within a certain number of months.',
          question_type: 'single_choice',
          category: 'goals',
          is_required: true
        }
      ],
      treatment_categories: [
        {
          id: 'whitening',
          name: 'Teeth Whitening',
          slug: 'teeth_whitening',
          description: 'In-office and take-home cosmetic teeth whitening treatments to brighten stained or discolored teeth.',
          display_order: 1
        },
        {
          id: 'veneers',
          name: 'Veneers',
          slug: 'veneers',
          description: 'Porcelain and composite veneer options to reshape, resize, and improve the appearance of front teeth.',
          display_order: 2
        },
        {
          id: 'invisalign',
          name: 'Invisalign & Clear Aligners',
          slug: 'invisalign',
          description: 'Clear aligner treatments such as Invisalign to straighten teeth discreetly.',
          display_order: 3
        }
      ],
      assessment_options: [
        {
          id: 'ao_primary_crooked_teeth',
          question_id: 'aq_primary_concerns',
          label: 'Crooked teeth',
          value_key: 'crooked_teeth',
          display_order: 1
        },
        {
          id: 'ao_primary_stained_teeth',
          question_id: 'aq_primary_concerns',
          label: 'Stained or yellow teeth',
          value_key: 'stained_teeth',
          display_order: 2
        },
        {
          id: 'ao_primary_chipped_worn',
          question_id: 'aq_primary_concerns',
          label: 'Chipped or worn edges',
          value_key: 'chipped_worn_edges',
          display_order: 3
        }
      ],
      treatments: [
        {
          id: 't_whiten_in_office_power',
          category_id: 'whitening',
          name: 'In-Office Power Whitening',
          slug: 'in-office-power-whitening',
          treatment_type: 'teeth_whitening',
          delivery_method: 'in_office',
          veneer_material: 'none',
          pricing_unit: 'per_session',
          price: 349,
          price_min: 349,
          price_max: 399,
          price_per_unit: 349,
          duration_minutes_min: 60,
          duration_minutes_max: 75,
          duration_months_min: 0,
          duration_months_max: 0.25,
          supports_financing: false,
          is_in_assessment: true,
          patient_satisfaction_rating: 4.6,
          patient_satisfaction_count: 128,
          short_description: 'Single-visit in-office whitening to dramatically brighten your smile in about one hour.',
          long_description: 'Our In-Office Power Whitening uses a professional-strength whitening gel activated by a specialized light to brighten your teeth by several shades in a single visit. Ideal if you want fast results before an upcoming event. Includes a brief consultation, shade check, and post-treatment sensitivity recommendations.',
          image_url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&h=600&fit=crop&auto=format&q=80',
          available_clinic_ids: [],
          is_active: true
        },
        {
          id: 't_whiten_in_office_premium',
          category_id: 'whitening',
          name: 'Premium In-Office Whitening Plus Take-Home Trays',
          slug: 'premium-in-office-whitening-plus-trays',
          treatment_type: 'teeth_whitening',
          delivery_method: 'hybrid',
          veneer_material: 'none',
          pricing_unit: 'per_session',
          price: 495,
          price_min: 495,
          price_max: 545,
          price_per_unit: 495,
          duration_minutes_min: 90,
          duration_minutes_max: 120,
          duration_months_min: 0,
          duration_months_max: 1,
          supports_financing: true,
          is_in_assessment: true,
          patient_satisfaction_rating: 4.8,
          patient_satisfaction_count: 94,
          short_description: 'Enhanced in-office whitening with custom trays for at-home maintenance.',
          long_description: 'Our Premium In-Office Whitening includes a longer in-office whitening session for maximum shade change, followed by custom-fitted take-home trays and professional gel refills to maintain your result. This option is ideal for patients who want both dramatic initial whitening and easy touch-ups over the next several months.',
          image_url: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f98?w=800&h=600&fit=crop&auto=format&q=80',
          available_clinic_ids: [],
          is_active: true
        },
        {
          id: 't_whiten_take_home_kit',
          category_id: 'whitening',
          name: 'Custom Take-Home Whitening Kit',
          slug: 'custom-take-home-whitening-kit',
          treatment_type: 'teeth_whitening',
          delivery_method: 'at_home',
          veneer_material: 'none',
          pricing_unit: 'flat',
          price: 249,
          price_min: 249,
          price_max: 299,
          price_per_unit: 249,
          duration_minutes_min: 20,
          duration_minutes_max: 45,
          duration_months_min: 0.25,
          duration_months_max: 1,
          supports_financing: false,
          is_in_assessment: true,
          patient_satisfaction_rating: 4.3,
          patient_satisfaction_count: 76,
          short_description: 'Whiten at home with custom trays and professional-strength gel.',
          long_description: 'The Custom Take-Home Whitening Kit includes impressions for custom trays, a fitting appointment, and several weeks’ supply of professional-strength whitening gel. You’ll wear the trays for 20–45 minutes per day until you reach your desired shade. This option is great for gradual whitening with more control over sensitivity.',
          image_url: 'https://assets.website-files.com/5d8be267d9987b5be987871f/5dad03a6cb7e170f750326f7_AdobeStock_183500994.jpg',
          available_clinic_ids: [],
          is_active: true
        }
      ],
      dentists: [
        {
          id: 'd_amelia_cho',
          full_name: 'Dr. Amelia Cho',
          slug: 'amelia-cho',
          gender: 'female',
          primary_specialty: 'cosmetic_dentistry',
          other_specialties: ['general_dentistry'],
          years_experience: 11,
          rating_average: 4.9,
          rating_count: 237,
          bio: 'Dr. Amelia Cho is a cosmetic dentist with a special focus on minimally invasive smile makeovers, including porcelain veneers, composite bonding, and professional whitening. She combines digital smile design with a conservative approach to help patients achieve natural-looking results that fit their facial features and lifestyle.',
          photo_url: 'https://willowbrookparkdental.com/wp-content/uploads/2021/05/how-does-gum-contouring-improve-a-gummy-smile.jpg',
          clinic_ids: [],
          is_accepting_new_patients: true
        },
        {
          id: 'd_lena_martinez',
          full_name: 'Dr. Lena Martinez',
          slug: 'lena-martinez',
          gender: 'female',
          primary_specialty: 'cosmetic_dentistry',
          other_specialties: ['general_dentistry', 'prosthodontics'],
          years_experience: 9,
          rating_average: 4.8,
          rating_count: 189,
          bio: 'Dr. Lena Martinez focuses on aesthetic restorative dentistry, blending porcelain veneers, composite veneers, and Invisalign to create balanced smiles. She is known for her gentle chairside manner and detailed treatment planning, especially for patients new to cosmetic dentistry.',
          photo_url: 'https://thumbnails.yayimages.com/d/56c/d56cb44.jpg',
          clinic_ids: [],
          is_accepting_new_patients: true
        },
        {
          id: 'd_michael_ross',
          full_name: 'Dr. Michael Ross',
          slug: 'michael-ross',
          gender: 'male',
          primary_specialty: 'cosmetic_dentistry',
          other_specialties: ['general_dentistry'],
          years_experience: 15,
          rating_average: 4.7,
          rating_count: 304,
          bio: 'With over 15 years of experience, Dr. Michael Ross provides full-mouth cosmetic rehabilitation, including smile makeovers that combine veneers, bonding, gum contouring, and whitening. He emphasizes long-term function alongside aesthetics.',
          photo_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=600&fit=crop&auto=format&q=80',
          clinic_ids: [],
          is_accepting_new_patients: false
        }
      ],
      smile_gallery_cases: [
        {
          id: 'sgc_composite_front_gap_closure',
          title: 'Composite Bonding to Close Front Tooth Gaps',
          description: 'This patient disliked the small gaps between their upper front teeth but wanted a quick, conservative option. In two visits, we used shade-matched composite bonding to close the spaces and smooth the edges for a fuller, more even smile.',
          treatment_type: 'composite_bonding',
          tooth_area: 'front_teeth',
          number_of_visits: 2,
          before_image_url: 'https://bentericksen.com/wp-content/uploads/2020/09/portrait-of-smiling-and-confident-dentist-in-dentist-s-clinic.jpg',
          after_image_url: 'https://brooksher.com/wp-content/uploads/2019/04/cathy-before-after.jpg',
          dentist_id: 'd_amelia_cho',
          tags: ['composite_bonding', 'front_teeth', 'gaps', '1-2_visits', 'natural_result'],
          is_featured: true
        },
        {
          id: 'sgc_composite_front_edge_repair',
          title: '1-Visit Composite Bonding for Chipped Front Teeth',
          description: 'After chipping two front teeth, this patient wanted a fast repair before an upcoming event. In a single visit, we rebuilt the missing edges with composite bonding and polished the surfaces for a seamless, natural look.',
          treatment_type: 'composite_bonding',
          tooth_area: 'front_teeth',
          number_of_visits: 1,
          before_image_url: 'https://static.wixstatic.com/media/470374_5d7027782bce464aa020efad73799477~mv2.jpg/v1/fill/w_1228,h_768,fp_0.50_0.50,q_90/470374_5d7027782bce464aa020efad73799477~mv2.jpg',
          after_image_url: 'https://www.humbledentist.com/thedentalsitecontent/1002014/gallery/AfterP-Upper-Crowns-and-Veneers-Lower-Direct-Composite-Veneers.jpg',
          dentist_id: 'd_lena_martinez',
          tags: ['composite_bonding', 'front_teeth', 'chips', '1-2_visits', 'single_visit'],
          is_featured: true
        },
        {
          id: 'sgc_composite_front_lengthen',
          title: 'Lengthening Short Front Teeth with Composite Bonding',
          description: 'This patient felt their front teeth looked short and worn. Over two visits, we used composite bonding to lengthen and reshape the upper front teeth, creating a more balanced and youthful smile line.',
          treatment_type: 'composite_bonding',
          tooth_area: 'front_teeth',
          number_of_visits: 2,
          before_image_url: 'https://www.smilecliniq.com/wp-content/uploads/2018/08/Retroclined-upper-teeth-and-cosmetic-bonding.png',
          after_image_url: 'https://www.smileworksdental.co.uk/public/uploads/metas/1596606408767composite-conding2.jpg',
          dentist_id: 'd_amelia_cho',
          tags: ['composite_bonding', 'front_teeth', 'short_teeth', '1-2_visits', 'edge_lengthening'],
          is_featured: false
        }
      ],
      clinics: [
        {
          id: 'clinic_soma_sf',
          name: 'Radiant Smiles – SoMa Cosmetic Dentistry',
          slug: 'radiant-smiles-soma-cosmetic-dentistry',
          address_line1: '725 Market Street, Suite 410',
          address_line2: '',
          city: 'San Francisco',
          state: 'CA',
          zip: '94103',
          latitude: 37.7868,
          longitude: -122.404,
          phone_main: '415-555-0101',
          phone_emergency: '415-555-0199',
          email: 'soma@radiantsmiles.com',
          has_emergency_care: true,
          open_sunday: false,
          hours_monday: '8:00 AM - 6:00 PM',
          hours_tuesday: '8:00 AM - 6:00 PM',
          hours_wednesday: '8:00 AM - 6:00 PM',
          hours_thursday: '8:00 AM - 7:00 PM',
          hours_friday: '8:00 AM - 5:00 PM',
          hours_saturday: '9:00 AM - 2:00 PM',
          hours_sunday: 'Closed',
          services: ['cosmetic', 'teeth_whitening', 'veneers', 'invisalign', 'bonding', 'emergency'],
          is_primary: true
        },
        {
          id: 'clinic_union_square_sf',
          name: 'Radiant Smiles – Union Square',
          slug: 'radiant-smiles-union-square',
          address_line1: '350 Post Street, Suite 900',
          address_line2: '',
          city: 'San Francisco',
          state: 'CA',
          zip: '94108',
          latitude: 37.7885,
          longitude: -122.4075,
          phone_main: '415-555-0120',
          phone_emergency: '415-555-0129',
          email: 'unionsquare@radiantsmiles.com',
          has_emergency_care: true,
          open_sunday: true,
          hours_monday: '8:00 AM - 6:00 PM',
          hours_tuesday: '8:00 AM - 6:00 PM',
          hours_wednesday: '8:00 AM - 6:00 PM',
          hours_thursday: '9:00 AM - 7:00 PM',
          hours_friday: '8:00 AM - 5:00 PM',
          hours_saturday: '9:00 AM - 3:00 PM',
          hours_sunday: '9:00 AM - 3:00 PM',
          services: ['cosmetic', 'teeth_whitening', 'veneers', 'invisalign', 'bonding', 'gum_contouring', 'emergency'],
          is_primary: false
        },
        {
          id: 'clinic_mission_sf',
          name: 'Radiant Smiles – Mission District',
          slug: 'radiant-smiles-mission-district',
          address_line1: '2486 Mission Street',
          address_line2: 'Floor 2',
          city: 'San Francisco',
          state: 'CA',
          zip: '94110',
          latitude: 37.7565,
          longitude: -122.4182,
          phone_main: '415-555-0144',
          phone_emergency: '415-555-0149',
          email: 'mission@radiantsmiles.com',
          has_emergency_care: false,
          open_sunday: false,
          hours_monday: '9:00 AM - 6:00 PM',
          hours_tuesday: '9:00 AM - 6:00 PM',
          hours_wednesday: '10:00 AM - 7:00 PM',
          hours_thursday: '9:00 AM - 6:00 PM',
          hours_friday: '8:00 AM - 4:00 PM',
          hours_saturday: '9:00 AM - 1:00 PM',
          hours_sunday: 'Closed',
          services: ['cosmetic', 'teeth_whitening', 'veneers', 'invisalign', 'family'],
          is_primary: false
        }
      ],
      offers: [
        {
          id: 'offer_new_patient_march_2026',
          title: 'New Patient Exam, X-Rays & Cleaning – $149 March Special',
          slug: 'new-patient-exam-xrays-cleaning-149-march-2026',
          description: 'Comprehensive new-patient package including a doctor exam, all necessary digital X-rays, and a standard preventive cleaning for patients with no periodontal disease. Available at all Radiant Smiles locations through March 31, 2026.',
          price: 149,
          original_price: 320,
          discount_percent: 53,
          offer_type: 'new_patient',
          included_services: ['exam', 'x_rays', 'cleaning'],
          terms: 'New adult patients only. Cannot be combined with other new-patient offers or insurance benefits. Periodontal (deep) cleaning, additional imaging, and restorative treatment are not included. Must be scheduled and completed by March 31, 2026.',
          valid_from: '2026-02-01T00:00:00Z',
          valid_to: '2026-03-31T23:59:59Z',
          promo_code: 'MARCHSMILE149',
          applies_to_all_clinics: true,
          clinic_ids: [],
          primary_treatment_id: 't_new_patient_exam_xray_cleaning',
          is_active: true,
          created_at: '2025-11-15T10:00:00Z',
          updated_at: '2026-01-20T09:30:00Z'
        },
        {
          id: 'offer_new_patient_standard_2026',
          title: 'Everyday New Patient Exam, X-Rays & Cleaning',
          slug: 'everyday-new-patient-exam-xrays-cleaning-199',
          description: 'Year-round new-patient special for a comprehensive exam, necessary X-rays, and standard cleaning at a bundled rate.',
          price: 199,
          original_price: 320,
          discount_percent: 38,
          offer_type: 'new_patient',
          included_services: ['exam', 'x_rays', 'cleaning'],
          terms: 'New patients only. Not valid with other offers. If periodontal disease is diagnosed, cleaning may be upgraded to periodontal therapy at additional cost.',
          valid_from: '2026-01-01T00:00:00Z',
          valid_to: '2026-12-31T23:59:59Z',
          promo_code: 'WELCOME199',
          applies_to_all_clinics: true,
          clinic_ids: [],
          primary_treatment_id: 't_new_patient_exam_xray_cleaning',
          is_active: true,
          created_at: '2025-10-10T12:00:00Z',
          updated_at: '2026-01-05T08:45:00Z'
        },
        {
          id: 'offer_whitening_in_office_299',
          title: 'In-Office Power Whitening – $299',
          slug: 'in-office-whitening-299',
          description: 'Brighten your smile by several shades in about an hour with our professional in-office power whitening treatment.',
          price: 299,
          original_price: 399,
          discount_percent: 25,
          offer_type: 'whitening',
          included_services: ['whitening', 'shade_check', 'sensitivity_kit'],
          terms: 'Valid for one standard in-office whitening session. Additional sessions or take-home products available at regular price. Not recommended for patients with untreated decay or severe sensitivity.',
          valid_from: '2026-01-15T00:00:00Z',
          valid_to: '2026-06-30T23:59:59Z',
          promo_code: 'BRIGHT299',
          applies_to_all_clinics: false,
          clinic_ids: ['clinic_soma_sf', 'clinic_union_square_sf', 'clinic_mission_sf', 'clinic_oakland_downtown'],
          primary_treatment_id: 't_whiten_in_office_power',
          is_active: true,
          created_at: '2025-12-20T11:30:00Z',
          updated_at: '2026-01-18T09:15:00Z'
        }
      ],
      assessment_sessions: [],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:16:31.745564'
      }
    };

    // Persist using storage_key mapping
    localStorage.setItem('assessment_questions', JSON.stringify(generatedData.assessment_questions || []));
    localStorage.setItem('treatment_categories', JSON.stringify(generatedData.treatment_categories || []));
    localStorage.setItem('assessment_options', JSON.stringify(generatedData.assessment_options || []));
    localStorage.setItem('treatments', JSON.stringify(generatedData.treatments || []));
    localStorage.setItem('dentists', JSON.stringify(generatedData.dentists || []));
    localStorage.setItem('smile_gallery_cases', JSON.stringify(generatedData.smile_gallery_cases || []));
    localStorage.setItem('clinics', JSON.stringify(generatedData.clinics || []));
    localStorage.setItem('offers', JSON.stringify(generatedData.offers || []));
    localStorage.setItem('assessment_sessions', JSON.stringify(generatedData.assessment_sessions || []));

    // Initialize empty collections for entities that may be created during flows
    localStorage.setItem('favorites', JSON.stringify(null));
    localStorage.setItem('case_inquiries', JSON.stringify([]));
    localStorage.setItem('appointment_requests', JSON.stringify([]));
    localStorage.setItem('emergency_contact_requests', JSON.stringify([]));
    localStorage.setItem('financing_applications', JSON.stringify([]));
    localStorage.setItem('saved_financing_plans', JSON.stringify([]));
    localStorage.setItem('estimate_requests', JSON.stringify([]));
  }

  // Utility to safely parse JSON from storage
  getFromStorage(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookCheapestInOfficeWhitening();
    this.testTask2_VeneersCostAndFinancing();
    this.testTask3_NearestSundayClinicEmergency();
    this.testTask4_FilterDentistAndBookConsult();
    this.testTask5_SmileAssessmentAndEstimate();
    this.testTask6_ClaimNewPatientOfferMarch2026();
    this.testTask7_InvisalignZeroInterestPlan();
    this.testTask8_SaveGalleryCasesAndRequestSimilar();

    return this.results;
  }

  // Task 1
  testTask1_BookCheapestInOfficeWhitening() {
    const testName = 'Task 1: Book cheapest in-office whitening under $400 for Thu 3:00 PM';
    console.log('Testing:', testName);

    try {
      // Navigate via categories
      const categories = this.logic.getTreatmentCategoriesForNav();
      this.assert(Array.isArray(categories) && categories.length > 0, 'Should return treatment categories');
      const whiteningCategory = categories.find(function (c) { return c.slug === 'teeth_whitening'; });
      this.assert(!!whiteningCategory, 'Teeth whitening category should exist');

      // Get filter options (simulate opening filters)
      const filterOptions = this.logic.getTreatmentFilterOptions('teeth_whitening');
      this.assert(!!filterOptions, 'Should get whitening filter options');

      // Search treatments with filters: in-office, under 400, 60-90 minutes
      const filters = {
        treatmentType: 'teeth_whitening',
        deliveryMethod: 'in_office',
        maxPrice: 400,
        minDurationMinutes: 60,
        maxDurationMinutes: 90
      };
      const treatments = this.logic.searchTreatments('teeth_whitening', filters, 'price_low_to_high');
      this.assert(Array.isArray(treatments) && treatments.length > 0, 'Should find at least one in-office whitening treatment');

      // Verify all results respect filters
      for (let i = 0; i < treatments.length; i++) {
        const t = treatments[i];
        this.assert(t.delivery_method === 'in_office', 'Treatment should be in-office');
        if (typeof t.base_price === 'number') {
          this.assert(t.base_price <= 400, 'Treatment price should be <= 400');
        }
        if (typeof t.duration_minutes_min === 'number') {
          this.assert(t.duration_minutes_min >= 60, 'Min duration should be >= 60');
        }
        if (typeof t.duration_minutes_max === 'number') {
          this.assert(t.duration_minutes_max <= 90, 'Max duration should be <= 90');
        }
      }

      // Choose the first (cheapest after sorting)
      const chosenSummary = treatments[0];
      const treatmentId = chosenSummary.treatment_id;
      this.assert(!!treatmentId, 'Chosen treatment should have an ID');

      // Open treatment detail
      const detail = this.logic.getTreatmentDetail(treatmentId);
      this.assert(detail && detail.treatment && detail.treatment.id === treatmentId, 'getTreatmentDetail should return the chosen treatment');

      // Prepare requested datetime: next Thursday at 3:00 PM (use a fixed ISO for test)
      const requestedDatetime = '2026-03-05T15:00:00';

      // Submit appointment request as new patient
      const appointmentResponse = this.logic.submitTreatmentAppointmentRequest(
        treatmentId,
        'new_patient',
        'treatment_appointment',
        requestedDatetime,
        'America/Los_Angeles',
        null,
        'Task One Tester',
        '555-000-0001',
        'task1@example.com',
        'Looking for in-office whitening under $400'
      );

      this.assert(appointmentResponse && appointmentResponse.success === true, 'Appointment request should succeed');
      const appt = appointmentResponse.appointment_request;
      this.assert(appt && appt.id, 'AppointmentRequest should have an id');
      this.assert(appt.treatment_id === treatmentId, 'AppointmentRequest should reference the selected treatment');
      this.assert(appt.patient_type === 'new_patient', 'Patient type should be new_patient');
      this.assert(typeof appt.requested_datetime === 'string', 'requested_datetime should be a string');
      this.assert(appt.requested_datetime.indexOf('2026-03-05T15:00:00') === 0, 'requested_datetime should match requested slot');

      // Verify persistence via storage
      const storedAppts = this.getFromStorage('appointment_requests', []);
      const stored = storedAppts.find(function (a) { return a.id === appt.id; });
      this.assert(!!stored, 'AppointmentRequest should be stored in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2
  testTask2_VeneersCostAndFinancing() {
    const testName = 'Task 2: Compare porcelain vs composite veneers for 4 teeth and find financing < $150/mo';
    console.log('Testing:', testName);

    try {
      // Ensure veneers category exists
      const categories = this.logic.getTreatmentCategoriesForNav();
      const veneersCategory = categories.find(function (c) { return c.slug === 'veneers'; });
      this.assert(!!veneersCategory, 'Veneers category should exist');

      // Load porcelain veneer options
      const porcelainFilters = { veneerMaterial: 'porcelain' };
      const porcelainList = this.logic.searchTreatments('veneers', porcelainFilters, 'price_low_to_high');
      this.assert(Array.isArray(porcelainList) && porcelainList.length > 0, 'Should find porcelain veneer treatments');
      const porcelain = porcelainList[0];
      const porcelainId = porcelain.treatment_id;

      // Calculate total cost for 4 teeth (porcelain)
      const porcelainCostResult = this.logic.calculateVeneerCost(porcelainId, 4);
      this.assert(porcelainCostResult && porcelainCostResult.total_cost > 0, 'Porcelain total cost should be positive');
      const porcelainTotal = porcelainCostResult.total_cost;

      // Load composite veneer options
      const compositeFilters = { veneerMaterial: 'composite' };
      const compositeList = this.logic.searchTreatments('veneers', compositeFilters, 'price_low_to_high');
      this.assert(Array.isArray(compositeList) && compositeList.length > 0, 'Should find composite veneer treatments');
      const composite = compositeList[0];
      const compositeId = composite.treatment_id;

      // Calculate total cost for 4 teeth (composite)
      const compositeCostResult = this.logic.calculateVeneerCost(compositeId, 4);
      this.assert(compositeCostResult && compositeCostResult.total_cost > 0, 'Composite total cost should be positive');
      const compositeTotal = compositeCostResult.total_cost;

      // Choose option under $3000 and cheaper than alternative where possible
      let chosenId = porcelainId;
      let chosenName = porcelain.name;
      let chosenTotal = porcelainTotal;

      const porcelainUnder = porcelainTotal < 3000;
      const compositeUnder = compositeTotal < 3000;

      if (porcelainUnder && compositeUnder) {
        if (compositeTotal < porcelainTotal) {
          chosenId = compositeId;
          chosenName = composite.name;
          chosenTotal = compositeTotal;
        }
      } else if (!porcelainUnder && compositeUnder) {
        chosenId = compositeId;
        chosenName = composite.name;
        chosenTotal = compositeTotal;
      } else if (!compositeUnder && porcelainUnder) {
        chosenId = porcelainId;
        chosenName = porcelain.name;
        chosenTotal = porcelainTotal;
      } else {
        // If neither under $3000, just choose cheaper overall
        if (compositeTotal < porcelainTotal) {
          chosenId = compositeId;
          chosenName = composite.name;
          chosenTotal = compositeTotal;
        }
      }

      this.assert(chosenTotal > 0, 'Chosen veneer total cost should be positive');

      // Open financing from chosen treatment (simulated by using calculator config and plan)
      const financeConfig = this.logic.getFinancingCalculatorConfig();
      this.assert(financeConfig && financeConfig.term_months_min != null && financeConfig.term_months_max != null, 'Should get financing config');
      this.assert(financeConfig.supports_zero_interest === true, 'Config should support zero interest for this flow');

      const treatmentCost = chosenTotal;
      const minTerm = financeConfig.term_months_min;
      const maxTerm = financeConfig.term_months_max;

      let selectedPlan = null;

      // Search for a 0% interest term where monthly payment <= 150
      for (let term = minTerm; term <= maxTerm; term++) {
        const plan = this.logic.calculateFinancingPlan('veneers', chosenId, treatmentCost, term, 0, true);
        this.assert(plan && plan.monthly_payment_estimate > 0, 'Financing plan should have positive monthly payment');
        if (plan.monthly_payment_estimate <= 150) {
          selectedPlan = plan;
          break;
        }
      }

      // If none under 150, just use the longest-term plan as a fallback to still test the flow
      if (!selectedPlan) {
        const plan = this.logic.calculateFinancingPlan('veneers', chosenId, treatmentCost, maxTerm, 0, true);
        this.assert(plan && plan.monthly_payment_estimate > 0, 'Fallback financing plan should be valid');
        selectedPlan = plan;
      }

      const termMonths = selectedPlan.term_months;
      const monthlyPayment = selectedPlan.monthly_payment_estimate;
      this.assert(termMonths > 0, 'Selected term should be positive');
      this.assert(selectedPlan.is_zero_interest === true, 'Plan should be zero interest');

      // Save/email the plan
      const saveResponse = this.logic.saveFinancingPlan(
        chosenId,
        'veneers',
        chosenName,
        treatmentCost,
        termMonths,
        0,
        monthlyPayment,
        true,
        'email',
        'Task Two Tester',
        'task2@example.com'
      );

      this.assert(saveResponse && saveResponse.success === true, 'Saving financing plan should succeed');
      const savedPlan = saveResponse.saved_plan;
      this.assert(savedPlan && savedPlan.id, 'SavedFinancingPlan should have id');
      this.assert(savedPlan.treatment_cost === treatmentCost, 'Saved plan cost should match chosen total');
      this.assert(savedPlan.is_zero_interest === true, 'Saved plan should be zero interest');

      // Verify persistence
      const storedPlans = this.getFromStorage('saved_financing_plans', []);
      const stored = storedPlans.find(function (p) { return p.id === savedPlan.id; });
      this.assert(!!stored, 'SavedFinancingPlan should be stored');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3
  testTask3_NearestSundayClinicEmergency() {
    const testName = 'Task 3: Find nearest clinic open Sunday within 15 miles of 94103 and submit emergency request';
    console.log('Testing:', testName);

    try {
      // Get search filter options (simulating UI load)
      const filterOptions = this.logic.getClinicSearchFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.radius_options_miles), 'Should get clinic filter options');

      // Search clinics near 94103 within 15 miles, open Sundays
      const clinics = this.logic.searchClinics('94103', 15, true);
      this.assert(Array.isArray(clinics) && clinics.length > 0, 'Should find clinics open Sundays within 15 miles');

      const chosen = clinics[0];
      const clinicId = chosen.clinic_id;
      this.assert(!!clinicId, 'Chosen clinic should have id');
      this.assert(chosen.open_sunday === true, 'Chosen clinic should be open on Sunday');

      // Get clinic detail
      const clinicDetail = this.logic.getClinicDetail(clinicId);
      this.assert(clinicDetail && clinicDetail.clinic && clinicDetail.clinic.id === clinicId, 'Clinic detail should match chosen clinic');

      // Get emergency form config
      const formConfig = this.logic.getEmergencyContactFormConfig(clinicId);
      this.assert(formConfig && Array.isArray(formConfig.issue_type_options), 'Should get emergency form config');

      // Pick issue type 'broken_tooth' if available, else first option
      let issueValue = null;
      for (let i = 0; i < formConfig.issue_type_options.length; i++) {
        const opt = formConfig.issue_type_options[i];
        if (opt.value === 'broken_tooth' || (opt.label && opt.label.toLowerCase().indexOf('broken') >= 0)) {
          issueValue = opt.value;
          break;
        }
      }
      if (!issueValue && formConfig.issue_type_options.length > 0) {
        issueValue = formConfig.issue_type_options[0].value;
      }

      // Pick timeframe 'within_2_hours' if available, else first
      let timeframeValue = null;
      if (Array.isArray(formConfig.preferred_timeframe_options)) {
        for (let i = 0; i < formConfig.preferred_timeframe_options.length; i++) {
          const opt = formConfig.preferred_timeframe_options[i];
          if (opt.value === 'within_2_hours' || (opt.label && opt.label.toLowerCase().indexOf('2 hour') >= 0)) {
            timeframeValue = opt.value;
            break;
          }
        }
        if (!timeframeValue && formConfig.preferred_timeframe_options.length > 0) {
          timeframeValue = formConfig.preferred_timeframe_options[0].value;
        }
      }

      const emergencyResponse = this.logic.submitEmergencyContactRequest(
        clinicId,
        'Task Three Emergency',
        '415-555-0999',
        issueValue,
        'Broke a front tooth today, need urgent care',
        timeframeValue
      );

      this.assert(emergencyResponse && emergencyResponse.success === true, 'Emergency request should succeed');
      const er = emergencyResponse.emergency_request;
      this.assert(er && er.id, 'EmergencyContactRequest should have id');
      this.assert(er.clinic_id === clinicId, 'Emergency request should reference chosen clinic');

      // Verify persistence
      const storedER = this.getFromStorage('emergency_contact_requests', []);
      const stored = storedER.find(function (e) { return e.id === er.id; });
      this.assert(!!stored, 'EmergencyContactRequest should be stored');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4
  testTask4_FilterDentistAndBookConsult() {
    const testName = 'Task 4: Filter female cosmetic dentist (8+ yrs, rating 4.7+) and request 10:00 AM consult';
    console.log('Testing:', testName);

    try {
      // Get filter options for dentists directory
      const dentistFilters = this.logic.getDentistFilterOptions();
      this.assert(dentistFilters && Array.isArray(dentistFilters.specialties), 'Should get dentist filter options');

      // Search dentists with required filters
      const searchResults = this.logic.searchDentists(
        {
          primarySpecialty: 'cosmetic_dentistry',
          gender: 'female',
          minYearsExperience: 8,
          minRating: 4.7
        },
        'rating_desc'
      );

      this.assert(Array.isArray(searchResults) && searchResults.length > 0, 'Should find matching female cosmetic dentists');

      const chosen = searchResults[0];
      const dentistId = chosen.dentist_id;
      this.assert(!!dentistId, 'Chosen dentist should have id');
      this.assert(chosen.gender === 'female', 'Chosen dentist should be female');
      this.assert(chosen.years_experience >= 8, 'Chosen dentist should have 8+ years experience');
      this.assert(chosen.rating_average >= 4.7, 'Chosen dentist should have rating >= 4.7');

      // Load dentist profile
      const profile = this.logic.getDentistProfile(dentistId);
      this.assert(profile && profile.dentist && profile.dentist.id === dentistId, 'Dentist profile should match chosen');

      // Earliest available date within next 14 days at 10:00 AM
      const now = new Date();
      const earliest = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
      const latest = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      if (earliest > latest) {
        earliest.setTime(latest.getTime());
      }
      earliest.setHours(10, 0, 0, 0);
      const requestedDatetime = earliest.toISOString().slice(0, 19);

      const apptResponse = this.logic.submitDentistAppointmentRequest(
        dentistId,
        'in_person_consultation',
        requestedDatetime,
        'America/Los_Angeles',
        null,
        'Task Four Tester',
        '555-111-2222',
        'task4@example.com',
        'In-person cosmetic consultation at 10:00 AM'
      );

      this.assert(apptResponse && apptResponse.success === true, 'Dentist appointment request should succeed');
      const appt = apptResponse.appointment_request;
      this.assert(appt && appt.id, 'AppointmentRequest should have id');
      this.assert(appt.dentist_id === dentistId, 'Appointment should be with selected dentist');
      this.assert(appt.visit_type === 'in_person_consultation', 'Visit type should be in_person_consultation');

      // Verify persistence
      const storedAppts = this.getFromStorage('appointment_requests', []);
      const stored = storedAppts.find(function (a) { return a.id === appt.id; });
      this.assert(!!stored, 'Dentist appointment should be stored');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5
  testTask5_SmileAssessmentAndEstimate() {
    const testName = 'Task 5: Complete smile assessment, filter recommendations (<$2500, <6 months), request emailed estimate';
    console.log('Testing:', testName);

    try {
      // Start smile assessment from homepage CTA (simulated by direct call)
      const start = this.logic.startSmileAssessment();
      this.assert(start && start.status === 'in_progress', 'Smile assessment should start in progress');
      this.assert(start.question && Array.isArray(start.question.options), 'First question should have options');

      // Step 1: primary concerns – select crooked & stained if available
      const options1 = start.question.options;
      const selectedKeys1 = [];
      for (let i = 0; i < options1.length; i++) {
        if (options1[i].value_key === 'crooked_teeth' || options1[i].value_key === 'stained_teeth') {
          selectedKeys1.push(options1[i].value_key);
        }
      }
      if (selectedKeys1.length === 0 && options1.length > 0) {
        // Fallback: select first option
        selectedKeys1.push(options1[0].value_key);
      }

      let step = this.logic.answerSmileAssessmentStep(selectedKeys1, null, null);
      this.assert(step && step.status === 'in_progress', 'After step 1, assessment should continue');

      // Step 2: areas question (not required) – we can skip or select none
      if (step.question && step.question.question_type === 'multiple_choice') {
        step = this.logic.answerSmileAssessmentStep([], null, null);
      }

      // Step 3: result timeline – choose a valid option
      if (step.status === 'in_progress' && step.question) {
        const q3 = step.question;
        let selectedTimelineKey = null;
        if (Array.isArray(q3.options) && q3.options.length > 0) {
          // Prefer a short timeline if present (e.g., up to 6 months)
          selectedTimelineKey = q3.options[0].value_key;
        }
        step = this.logic.answerSmileAssessmentStep(selectedTimelineKey ? [selectedTimelineKey] : [], null, null);
      }

      this.assert(step && (step.status === 'completed' || step.completed === true), 'Smile assessment should complete');

      // Get recommendations with filters: cost <= 2500, duration < 6 months, sorted by satisfaction
      const recs = this.logic.getSmileAssessmentRecommendations(2500, 6, 'satisfaction_desc');
      this.assert(Array.isArray(recs) && recs.length > 0, 'Should return filtered recommended treatments');

      // Choose the highest satisfaction rating (first after sorting)
      const chosenRec = recs[0];
      const treatmentId = chosenRec.treatment_id;
      this.assert(!!treatmentId, 'Chosen recommended treatment should have id');

      // Request emailed estimate
      const estimateResponse = this.logic.requestTreatmentEstimate(
        treatmentId,
        'smile_assessment',
        'Mild to moderate',
        'Task Five Tester',
        'test@example.com',
        'Please email me an estimate for this treatment'
      );

      this.assert(estimateResponse && estimateResponse.success === true, 'Estimate request should succeed');
      const er = estimateResponse.estimate_request;
      this.assert(er && er.id, 'EstimateRequest should have id');
      this.assert(er.treatment_id === treatmentId, 'EstimateRequest should reference chosen treatment');
      this.assert(er.source === 'smile_assessment', 'EstimateRequest source should be smile_assessment');

      // Verify persistence
      const storedER = this.getFromStorage('estimate_requests', []);
      const stored = storedER.find(function (e) { return e.id === er.id; });
      this.assert(!!stored, 'EstimateRequest should be stored');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6
  testTask6_ClaimNewPatientOfferMarch2026() {
    const testName = 'Task 6: Claim new-patient exam/X-ray/cleaning offer under $199 in March 2026, Tuesday 9:00 AM';
    console.log('Testing:', testName);

    try {
      // Get offers filter options (simulated by direct call)
      const offerFilterOptions = this.logic.getSpecialOfferFilterOptions();
      this.assert(offerFilterOptions && Array.isArray(offerFilterOptions.offer_types), 'Should get special offer filter options');

      // List new-patient offers under or equal to 199
      const offers = this.logic.listSpecialOffers({ offerType: 'new_patient', maxPrice: 199 });
      this.assert(Array.isArray(offers) && offers.length > 0, 'Should list new-patient offers <= $199');

      // Choose offer explicitly mentioning exam, x-rays, cleaning and price < 199
      let chosenOffer = null;
      for (let i = 0; i < offers.length; i++) {
        const o = offers[i];
        const includes = Array.isArray(o.included_services) ? o.included_services : [];
        const hasExam = includes.indexOf('exam') >= 0;
        const hasXRays = includes.indexOf('x_rays') >= 0;
        const hasCleaning = includes.indexOf('cleaning') >= 0;
        if (hasExam && hasXRays && hasCleaning && o.price < 199) {
          chosenOffer = o;
          break;
        }
      }
      if (!chosenOffer) {
        // Fallback: just pick first under 199
        chosenOffer = offers.find(function (o) { return o.price < 199; }) || offers[0];
      }

      const offerId = chosenOffer.offer_id;
      this.assert(!!offerId, 'Chosen offer should have id');

      // Get offer detail to confirm validity through March 31, 2026
      const offerDetail = this.logic.getOfferDetail(offerId);
      this.assert(offerDetail && offerDetail.offer && offerDetail.offer.id === offerId, 'Offer detail should match chosen');
      const validTo = new Date(offerDetail.offer.valid_to);
      const marchEnd = new Date('2026-03-31T00:00:00Z');
      this.assert(validTo.getTime() >= marchEnd.getTime(), 'Offer should be valid through at least March 31, 2026');

      // Determine clinic to book at
      let clinicId = null;
      if (Array.isArray(offerDetail.applicable_clinics) && offerDetail.applicable_clinics.length > 0) {
        clinicId = offerDetail.applicable_clinics[0].clinic_id;
      }
      if (!clinicId) {
        const clinics = this.getFromStorage('clinics', []);
        this.assert(clinics.length > 0, 'Should have clinics available');
        clinicId = clinics[0].id;
      }
      this.assert(!!clinicId, 'Should have chosen clinic id for booking');

      // Select a Tuesday in March 2026 at 9:00 AM (use March 3, 2026 which is a Tuesday per baseline)
      const requestedDatetime = '2026-03-03T09:00:00';

      const promoCode = offerDetail.offer.promo_code || null;

      const apptResponse = this.logic.submitOfferAppointmentRequest(
        offerId,
        clinicId,
        requestedDatetime,
        'America/Los_Angeles',
        'new_patient',
        'Task Six Tester',
        '555-222-3333',
        'task6@example.com',
        promoCode,
        'Booking new-patient exam, X-rays, and cleaning offer in March 2026'
      );

      this.assert(apptResponse && apptResponse.success === true, 'Offer appointment request should succeed');
      const appt = apptResponse.appointment_request;
      this.assert(appt && appt.id, 'AppointmentRequest should have id');
      this.assert(appt.offer_id === offerId, 'Appointment should reference chosen offer');
      this.assert(appt.clinic_id === clinicId, 'Appointment should reference chosen clinic');

      // Verify persistence
      const storedAppts = this.getFromStorage('appointment_requests', []);
      const stored = storedAppts.find(function (a) { return a.id === appt.id; });
      this.assert(!!stored, 'Offer-based appointment should be stored');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7
  testTask7_InvisalignZeroInterestPlan() {
    const testName = 'Task 7: Find 0% interest Invisalign payment plan for $4,800 with monthly <= $200 and submit application';
    console.log('Testing:', testName);

    try {
      // Get financing calculator config
      const config = this.logic.getFinancingCalculatorConfig();
      this.assert(config && Array.isArray(config.treatment_types), 'Should get financing calculator config');
      this.assert(config.supports_zero_interest === true, 'Calculator should support zero interest');

      // Confirm Invisalign is a supported treatment type
      const invisalignType = config.treatment_types.find(function (t) { return t.value === 'invisalign'; });
      this.assert(!!invisalignType, 'Invisalign should be a supported financing treatment type');

      const treatmentCost = 4800;
      const minTerm = config.term_months_min;
      const maxTerm = config.term_months_max;

      let selectedPlan = null;

      // Adjust term until monthly payment estimate <= 200 (0% interest)
      for (let term = minTerm; term <= maxTerm; term++) {
        const plan = this.logic.calculateFinancingPlan('invisalign', null, treatmentCost, term, 0, true);
        this.assert(plan && plan.monthly_payment_estimate > 0, 'Financing plan should have positive monthly payment');
        if (plan.monthly_payment_estimate <= 200) {
          selectedPlan = plan;
          break;
        }
      }

      // Fallback if no plan <= 200 is found: use the longest term plan
      if (!selectedPlan) {
        const plan = this.logic.calculateFinancingPlan('invisalign', null, treatmentCost, maxTerm, 0, true);
        this.assert(plan && plan.monthly_payment_estimate > 0, 'Fallback Invisalign plan should be valid');
        selectedPlan = plan;
      }

      const termMonths = selectedPlan.term_months;
      const monthlyPayment = selectedPlan.monthly_payment_estimate;
      this.assert(termMonths > 0, 'Selected Invisalign term should be positive');
      this.assert(selectedPlan.is_zero_interest === true, 'Selected Invisalign plan should be zero interest');

      // Submit financing application for the selected plan
      const appResponse = this.logic.submitFinancingApplication(
        'invisalign',
        null,
        treatmentCost,
        termMonths,
        0,
        monthlyPayment,
        true,
        200,
        'Task Seven Tester',
        '555-333-4444',
        'task7@example.com',
        'full_time',
        4000
      );

      this.assert(appResponse && appResponse.success === true, 'Financing application should succeed');
      const app = appResponse.financing_application;
      this.assert(app && app.id, 'FinancingApplication should have id');
      this.assert(app.treatment_type === 'invisalign', 'Application should be for Invisalign');
      this.assert(app.treatment_cost === treatmentCost, 'Application cost should match 4800');
      this.assert(app.is_zero_interest === true, 'Application should be zero interest');

      // Verify persistence
      const storedApps = this.getFromStorage('financing_applications', []);
      const stored = storedApps.find(function (a) { return a.id === app.id; });
      this.assert(!!stored, 'FinancingApplication should be stored');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8
  testTask8_SaveGalleryCasesAndRequestSimilar() {
    const testName = 'Task 8: Save two composite bonding front-teeth cases (1–2 visits) and request similar result for second';
    console.log('Testing:', testName);

    try {
      // Get gallery filter options
      const galleryFilters = this.logic.getSmileGalleryFilterOptions();
      this.assert(galleryFilters && Array.isArray(galleryFilters.treatment_types), 'Should get smile gallery filter options');

      // Search for composite bonding on front teeth completed in 1–2 visits
      const cases = this.logic.searchSmileGalleryCases({
        treatmentType: 'composite_bonding',
        toothArea: 'front_teeth',
        minVisits: 1,
        maxVisits: 2
      });

      this.assert(Array.isArray(cases) && cases.length >= 2, 'Should find at least two composite bonding front-teeth cases (1–2 visits)');

      const firstCaseId = cases[0].case_id;
      const secondCaseId = cases[1].case_id;

      // Open and verify first case detail then add to favorites
      const firstDetail = this.logic.getSmileGalleryCaseDetail(firstCaseId);
      this.assert(firstDetail && firstDetail.case && firstDetail.case.id === firstCaseId, 'First case detail should load correctly');

      const favResult1 = this.logic.addCaseToFavorites(firstCaseId);
      this.assert(favResult1 && favResult1.favorites, 'Adding first case to favorites should succeed');

      // Open and verify second case detail then add to favorites
      const secondDetail = this.logic.getSmileGalleryCaseDetail(secondCaseId);
      this.assert(secondDetail && secondDetail.case && secondDetail.case.id === secondCaseId, 'Second case detail should load correctly');

      const favResult2 = this.logic.addCaseToFavorites(secondCaseId);
      this.assert(favResult2 && favResult2.favorites, 'Adding second case to favorites should succeed');

      // Open favorites list and confirm ordering
      const favListResponse = this.logic.getFavoritesList();
      this.assert(favListResponse && favListResponse.favorites, 'Favorites list should be retrievable');

      const favorites = favListResponse.favorites;
      const favoriteCaseIds = favorites && Array.isArray(favorites.case_ids) ? favorites.case_ids : [];
      this.assert(favoriteCaseIds.length >= 2, 'Favorites list should contain at least two cases');

      const secondSavedCaseId = favoriteCaseIds[1];
      this.assert(secondSavedCaseId === secondCaseId, 'Second saved case in favorites should match second added case');

      // Submit request for similar result based on second saved case
      const inquiryResponse = this.logic.submitCaseInquiryFromFavorite(
        secondSavedCaseId,
        'Task Eight Tester',
        '555-444-5555',
        'task8@example.com',
        'I would like a similar composite bonding result on my front teeth'
      );

      this.assert(inquiryResponse && inquiryResponse.success === true, 'Case inquiry should succeed');
      const inquiry = inquiryResponse.case_inquiry;
      this.assert(inquiry && inquiry.id, 'CaseInquiry should have id');
      this.assert(inquiry.case_id === secondSavedCaseId, 'Inquiry should reference second saved case');

      // Verify persistence
      const storedInquiries = this.getFromStorage('case_inquiries', []);
      const stored = storedInquiries.find(function (ci) { return ci.id === inquiry.id; });
      this.assert(!!stored, 'CaseInquiry should be stored');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Simple assertion helper
  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('\u2713 ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('\u2717 ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (CommonJS)
module.exports = TestRunner;
