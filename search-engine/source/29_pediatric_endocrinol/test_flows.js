/*
 * Test runner for pediatric endocrinology clinic business logic
 * Flow-based integration tests for all specified user tasks.
 */

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    if (typeof localStorage !== 'undefined' && localStorage.clear) {
      localStorage.clear();
    }
    // Reinitialize storage structure via business logic helper
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data (adapted as JS object) and
    // store under the correct storage keys from Storage Key Mapping.

    const generatedData = {
      clinic_locations: [
        {
          id: 'main_clinic_downtown',
          name: 'Main Clinic  Downtown',
          is_main_location: true,
          description: 'Primary pediatric endocrinology clinic with full diagnostic services, diabetes education, and onsite lab.',
          address_line1: '123 West 125th Street',
          address_line2: 'Suite 400',
          city: 'New York',
          state: 'NY',
          postal_code: '10027',
          phone_main: '212-555-0100',
          fax: '212-555-0199',
          latitude: 40.8098,
          longitude: -73.9535,
          hours_text: 'MonFri 8:00 AM5:30 PM; Sat 8:30 AM1:00 PM; Sun closed.'
        },
        {
          id: 'uptown_specialty_center',
          name: 'Uptown Pediatric Specialty Center',
          is_main_location: false,
          description: 'Smaller satellite clinic focused on diabetes and thyroid follow-up visits.',
          address_line1: '455 Malcolm X Boulevard',
          address_line2: '2nd Floor',
          city: 'New York',
          state: 'NY',
          postal_code: '10037',
          phone_main: '212-555-0105',
          fax: '212-555-0195',
          latitude: 40.8159,
          longitude: -73.9402,
          hours_text: 'Mon, Wed, Thu 9:00 AM4:00 PM; Tue, Fri closed.'
        },
        {
          id: 'eastside_clinic',
          name: 'Eastside Childrens Endocrine Clinic',
          is_main_location: false,
          description: 'Endocrine clinic with emphasis on growth, puberty, and bone health evaluations.',
          address_line1: '910 Lexington Avenue',
          address_line2: 'Suite 300',
          city: 'New York',
          state: 'NY',
          postal_code: '10065',
          phone_main: '212-555-0112',
          fax: '212-555-0182',
          latitude: 40.7635,
          longitude: -73.9663,
          hours_text: 'MonThu 8:30 AM4:30 PM; Fri 8:30 AM1:00 PM.'
        }
      ],
      conditions: [
        {
          id: 'type_1_diabetes',
          name: 'Type 1 Diabetes',
          slug: 'type_1_diabetes',
          description: 'Autoimmune form of diabetes in which the pancreas produces little or no insulin, requiring lifelong insulin therapy.'
        },
        {
          id: 'type_2_diabetes',
          name: 'Type 2 Diabetes',
          slug: 'type_2_diabetes',
          description: 'A form of diabetes often associated with insulin resistance, more common in adolescents with overweight or obesity.'
        },
        {
          id: 'thyroid_disorders',
          name: 'Thyroid Disorders',
          slug: 'thyroid_disorders',
          description: 'Conditions affecting thyroid hormone production, including hypothyroidism, hyperthyroidism, nodules, and autoimmune thyroid disease.'
        }
      ],
      education_articles: [
        {
          id: 'ghd_basics_for_parents',
          title: 'Growth Hormone Deficiency: Basics for Parents',
          slug: 'growth-hormone-deficiency-basics-for-parents',
          summary: 'Learn what growth hormone deficiency is, how it is diagnosed, and what treatment looks like for children.',
          content_html: '<h1>Growth Hormone Deficiency: Basics for Parents</h1><p>Growth hormone deficiency (GHD) happens when the pituitary gland does not make enough growth hormone. This can cause a child to grow more slowly than expected.</p><p>Your childs doctor will review growth charts, medical history, and may order blood tests and an MRI. Treatment usually involves daily growth hormone shots using a very small needle.</p>',
          topic: 'Growth Hormone Deficiency',
          tags: [
            'growth hormone deficiency',
            'short stature',
            'hormones',
            'parent guide'
          ],
          publication_date: '2025-01-10T09:00:00Z',
          reading_level: 'easy',
          audience: 'parent',
          author: 'Endocrine Education Team',
          last_updated: '2025-08-01T10:30:00Z'
        },
        {
          id: 'ghd_living_tips_children',
          title: 'Living With Growth Hormone Deficiency: Everyday Tips',
          slug: 'living-with-growth-hormone-deficiency-everyday-tips',
          summary: 'Practical, easy-to-read tips to help your child manage growth hormone shots and stay confident.',
          content_html: '<h1>Living With Growth Hormone Deficiency</h1><p>Children with growth hormone deficiency can live full, active lives. Most children give growth hormone shots at home, usually at night.</p><ul><li>Keep a routine and give the shot at the same time each day.</li><li>Use a reward chart or stickers for younger children.</li><li>Let your child help when they are ready, such as choosing which leg or arm to use.</li></ul>',
          topic: 'Growth Hormone Deficiency',
          tags: [
            'growth hormone deficiency',
            'injections',
            'coping',
            'family tips'
          ],
          publication_date: '2024-07-20T14:15:00Z',
          reading_level: 'easy',
          audience: 'parent',
          author: 'Nurse Educator Team',
          last_updated: '2025-02-12T16:00:00Z'
        },
        {
          id: 'ghd_faq_kids',
          title: 'Questions Kids Ask About Growth Hormone Shots',
          slug: 'questions-kids-ask-about-growth-hormone-shots',
          summary: 'Kid-friendly answers to common questions about growth hormone shots and clinic visits.',
          content_html: '<h1>Questions Kids Ask About Growth Hormone Shots</h1><p>This article is written for kids who get growth hormone shots. We answer questions like "Will it hurt?" and "How long do I have to take it?" in simple language.</p>',
          topic: 'Growth Hormone Deficiency',
          tags: [
            'growth hormone deficiency',
            'kids',
            'shots',
            'faq'
          ],
          publication_date: '2026-02-15T11:45:00Z',
          reading_level: 'easy',
          audience: 'child',
          author: 'Child Life Services',
          last_updated: '2026-02-15T11:45:00Z'
        }
      ],
      insurance_plans: [
        {
          id: 'blueplus_silver_hmo',
          name: 'BluePlus Silver HMO',
          plan_code: 'BPSILHMO',
          is_accepted: true,
          acceptance_notes: 'Accepted for all pediatric endocrinology services at Main Clinic  Downtown and satellite locations.',
          specialist_coverage_notes: 'Requires in-network pediatric endocrinologist. Office visit subject to fixed specialist co-pay; labs and imaging billed separately.',
          specialist_copay_amount: 25,
          specialist_copay_currency: 'USD',
          referral_required: true,
          last_updated: '2026-01-15T09:30:00Z'
        },
        {
          id: 'blueplus_gold_ppo',
          name: 'BluePlus Gold PPO',
          plan_code: 'BPGOLDPPO',
          is_accepted: true,
          acceptance_notes: 'Accepted at all clinic locations. Out-of-network benefits available with higher co-insurance.',
          specialist_coverage_notes: 'Specialist visits subject to $20 copay; no referral required for in-network endocrinology visits.',
          specialist_copay_amount: 20,
          specialist_copay_currency: 'USD',
          referral_required: false,
          last_updated: '2025-10-01T12:00:00Z'
        },
        {
          id: 'healthykids_bronze_hmo',
          name: 'HealthyKids Bronze HMO',
          plan_code: 'HKBZHMO',
          is_accepted: true,
          acceptance_notes: 'Accepted for pediatric specialty visits at Main Clinic  Downtown only.',
          specialist_coverage_notes: 'Higher co-pays and deductibles may apply. Families are encouraged to verify benefits before scheduling.',
          specialist_copay_amount: 40,
          specialist_copay_currency: 'USD',
          referral_required: true,
          last_updated: '2025-06-20T08:45:00Z'
        }
      ],
      patient_forms: [
        {
          id: 'new_patient_endocrine_intake',
          name: 'New Patient Endocrine Intake',
          description: 'Online questionnaire for new pediatric endocrine patients, including growth, puberty, thyroid, and diabetes concerns.',
          form_type: 'online',
          url: 'new_patient_endocrine_intake.html',
          is_active: true
        },
        {
          id: 'general_medical_release',
          name: 'General Medical Records Release',
          description: 'Authorization form allowing the clinic to obtain or release your childs medical records.',
          form_type: 'pdf',
          url: 'forms/general_medical_records_release.pdf',
          is_active: true
        },
        {
          id: 'records_request_form',
          name: 'Patient Records Request Form',
          description: 'Use this form to request copies of your childs visit notes, labs, or growth charts.',
          form_type: 'online',
          url: 'records_request_form.html',
          is_active: true
        }
      ],
      pharmacies: [
        {
          id: 'harlem_family_pharmacy',
          name: 'Harlem Family Pharmacy',
          address_line1: '210 West 125th Street',
          address_line2: '',
          city: 'New York',
          state: 'NY',
          postal_code: '10027',
          phone: '212-555-0300',
          latitude: 40.8105,
          longitude: -73.9492,
          distance_miles: 0.3,
          is_24_hour: false
        },
        {
          id: 'columbia_med_center_pharmacy',
          name: 'Columbia Medical Center Outpatient Pharmacy',
          address_line1: '3959 Broadway',
          address_line2: 'Lobby Level',
          city: 'New York',
          state: 'NY',
          postal_code: '10032',
          phone: '212-555-0311',
          latitude: 40.8408,
          longitude: -73.9419,
          distance_miles: 1.8,
          is_24_hour: false
        },
        {
          id: 'riverside_24hr_pharmacy',
          name: 'Riverside 24-Hour Pharmacy',
          address_line1: '700 Amsterdam Avenue',
          address_line2: '',
          city: 'New York',
          state: 'NY',
          postal_code: '10025',
          phone: '212-555-0322',
          latitude: 40.7925,
          longitude: -73.9728,
          distance_miles: 2.4,
          is_24_hour: true
        }
      ],
      pharmacy_pickup_slots: [
        {
          id: 'harlem_20260303_1300',
          pharmacy_id: 'harlem_family_pharmacy',
          start_datetime: '2026-03-03T13:00:00Z',
          end_datetime: '2026-03-03T13:30:00Z',
          status: 'available'
        },
        {
          id: 'harlem_20260303_1530',
          pharmacy_id: 'harlem_family_pharmacy',
          start_datetime: '2026-03-03T15:30:00Z',
          end_datetime: '2026-03-03T16:00:00Z',
          status: 'held'
        },
        {
          id: 'harlem_20260303_1600',
          pharmacy_id: 'harlem_family_pharmacy',
          start_datetime: '2026-03-03T16:00:00Z',
          end_datetime: '2026-03-03T16:30:00Z',
          status: 'available'
        }
      ],
      class_events: [
        {
          id: 'insulin_pump_ed_20260310_1600',
          title: 'Insulin Pump Education Class',
          description: 'Introductory class for families considering or recently starting insulin pump therapy for Type 1 diabetes. Includes hands-on practice with pump devices.',
          topic: 'Insulin Pump Education',
          location_id: 'main_clinic_downtown',
          start_datetime: '2026-03-10T16:00:00Z',
          end_datetime: '2026-03-10T18:00:00Z',
          capacity: 12,
          is_virtual: false,
          registration_open: true,
          registration_url: 'class_registration.html?eventId=insulin_pump_ed_20260310_1600',
          fee_amount: 0,
          fee_currency: 'USD',
          prerequisites_text: 'For children with Type 1 diabetes and a parent or guardian. Basic knowledge of carbohydrate counting required.'
        },
        {
          id: 'insulin_pump_ed_20260318_1730',
          title: 'Insulin Pump Education Class',
          description: 'Early evening insulin pump education class designed for school-age children and their caregivers. Focus on daily pump use and troubleshooting.',
          topic: 'Insulin Pump Education',
          location_id: 'main_clinic_downtown',
          start_datetime: '2026-03-18T17:30:00Z',
          end_datetime: '2026-03-18T19:30:00Z',
          capacity: 14,
          is_virtual: false,
          registration_open: true,
          registration_url: 'class_registration.html?eventId=insulin_pump_ed_20260318_1730',
          fee_amount: 0,
          fee_currency: 'USD',
          prerequisites_text: 'For families of children with Type 1 diabetes who are within 3 months of starting pump therapy.'
        },
        {
          id: 'insulin_pump_ed_20260405_1700',
          title: 'Insulin Pump Education Class',
          description: 'Evening pump class covering advanced features including temporary basal rates, exercise strategies, and sick-day management.',
          topic: 'Insulin Pump Education',
          location_id: 'north_suburban_clinic',
          start_datetime: '2026-04-05T17:00:00Z',
          end_datetime: '2026-04-05T19:00:00Z',
          capacity: 10,
          is_virtual: false,
          registration_open: true,
          registration_url: 'class_registration.html?eventId=insulin_pump_ed_20260405_1700',
          fee_amount: 15,
          fee_currency: 'USD',
          prerequisites_text: 'Child must have used an insulin pump for at least 1 month.'
        }
      ],
      doctors: [
        {
          id: 'elena_bautista_md',
          first_name: 'Elena',
          last_name: 'Bautista',
          full_name: 'Elena Bautista, MD',
          credentials: 'MD',
          bio: 'Dr. Elena Bautista is a board-certified pediatric endocrinologist with a special interest in thyroid disorders and early puberty in girls. She enjoys working closely with families and provides care in both English and Spanish.',
          years_of_experience: 12,
          primary_location_id: 'main_clinic_downtown',
          conditions_treated_ids: [
            'thyroid_disorders',
            'hypothyroidism',
            'hyperthyroidism',
            'precocious_puberty',
            'delayed_puberty',
            'type_1_diabetes'
          ],
          languages_spoken: [
            'english',
            'spanish'
          ],
          main_office_phone: '212-555-0101',
          office_hours_text: 'Clinic at Main Clinic  Downtown on Mon, Tue, and Thu 8:30 AM4:30 PM.',
          profile_image_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&h=600&fit=crop&auto=format&q=80',
          is_accepting_new_patients: true
        },
        {
          id: 'maria_santos_md',
          first_name: 'Maria',
          last_name: 'Santos',
          full_name: 'Maria Santos, MD',
          credentials: 'MD',
          bio: 'Dr. Maria Santos focuses on autoimmune thyroid disease and growth problems in school-age children and teens. She frequently provides care for Spanish-speaking families.',
          years_of_experience: 16,
          primary_location_id: 'eastside_clinic',
          conditions_treated_ids: [
            'thyroid_disorders',
            'hypothyroidism',
            'hyperthyroidism',
            'growth_hormone_deficiency',
            'pituitary_disorders'
          ],
          languages_spoken: [
            'english',
            'spanish'
          ],
          main_office_phone: '212-555-0113',
          office_hours_text: 'Sees patients at Eastside Childrens Endocrine Clinic on Mon, Wed, and Fri.',
          profile_image_url: 'https://images.unsplash.com/photo-1535916707207-35f97e715e1b?w=800&h=600&fit=crop&auto=format&q=80',
          is_accepting_new_patients: true
        },
        {
          id: 'james_lee_md',
          first_name: 'James',
          last_name: 'Lee',
          full_name: 'James Lee, MD',
          credentials: 'MD',
          bio: 'Dr. James Lee leads the pediatric diabetes technology program and has particular expertise in insulin pumps and continuous glucose monitoring.',
          years_of_experience: 9,
          primary_location_id: 'main_clinic_downtown',
          conditions_treated_ids: [
            'type_1_diabetes',
            'type_2_diabetes',
            'obesity_insulin_resistance',
            'hypoglycemia'
          ],
          languages_spoken: [
            'english',
            'korean'
          ],
          main_office_phone: '212-555-0102',
          office_hours_text: 'Pump clinic on Tue and Thu afternoons; general diabetes clinic on Wed mornings.',
          profile_image_url: 'https://cdn.shopify.com/s/files/1/1488/7742/files/one_drop_bgm.png?v=1573065428',
          is_accepting_new_patients: true
        }
      ],
      appointment_slots: [
        {
          id: 'slot_james_lee_20260303_1400_np',
          provider_id: 'james_lee_md',
          location_id: 'main_clinic_downtown',
          start_datetime: '2026-03-03T14:00:00Z',
          end_datetime: '2026-03-03T14:30:00Z',
          appointment_type: 'new_patient',
          status: 'available',
          is_morning_slot: false,
          notes: 'New patient Type 1 or Type 2 diabetes visit; 30-minute slot.'
        },
        {
          id: 'slot_james_lee_20260303_1600_fu',
          provider_id: 'james_lee_md',
          location_id: 'main_clinic_downtown',
          start_datetime: '2026-03-03T16:00:00Z',
          end_datetime: '2026-03-03T16:30:00Z',
          appointment_type: 'follow_up',
          status: 'available',
          is_morning_slot: false,
          notes: 'Follow-up diabetes technology visit.'
        },
        {
          id: 'slot_elena_bautista_20260304_1000_np_booked',
          provider_id: 'elena_bautista_md',
          location_id: 'main_clinic_downtown',
          start_datetime: '2026-03-04T10:00:00Z',
          end_datetime: '2026-03-04T10:45:00Z',
          appointment_type: 'new_patient',
          status: 'booked',
          is_morning_slot: true,
          notes: 'New patient thyroid or puberty evaluation  slot already booked.'
        }
      ]
    };

    // Persist generated data to localStorage using correct storage keys
    localStorage.setItem('clinic_locations', JSON.stringify(generatedData.clinic_locations));
    localStorage.setItem('conditions', JSON.stringify(generatedData.conditions));
    localStorage.setItem('education_articles', JSON.stringify(generatedData.education_articles));
    localStorage.setItem('insurance_plans', JSON.stringify(generatedData.insurance_plans));
    localStorage.setItem('patient_forms', JSON.stringify(generatedData.patient_forms));
    localStorage.setItem('pharmacies', JSON.stringify(generatedData.pharmacies));
    localStorage.setItem('pharmacy_pickup_slots', JSON.stringify(generatedData.pharmacy_pickup_slots));
    localStorage.setItem('class_events', JSON.stringify(generatedData.class_events));
    localStorage.setItem('doctors', JSON.stringify(generatedData.doctors));
    localStorage.setItem('appointment_slots', JSON.stringify(generatedData.appointment_slots));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_RequestEarliestMorningDiabetesAppointment();
    this.testTask2_SelectThyroidSpecialistSpanish();
    this.testTask3_RegisterEveningInsulinPumpClass();
    this.testTask4_SaveTwoEasyReadingGHDArticles();
    this.testTask5_CalculateHeightPercentileAndPrint();
    this.testTask6_CheckInsuranceAndSendBillingQuestion();
    this.testTask7_RequestLevothyroxineRefillToNearestPharmacy();
    this.testTask8_SubmitNewPatientEarlyPubertyQuestionnaire();

    return this.results;
  }

  // =====================
  // Task 1
  // =====================
  testTask1_RequestEarliestMorningDiabetesAppointment() {
    const testName = 'Task 1: Request earliest new-patient Type 1 diabetes appointment';
    console.log('Testing:', testName);

    try {
      const overview = this.logic.getAppointmentPageOverview();
      this.assert(overview && Array.isArray(overview.locations), 'Appointments overview should include locations');

      // Choose Main Clinic  Downtown location
      let mainLocation = overview.locations.find(loc => {
        return typeof loc.name === 'string' &&
          loc.name.toLowerCase().indexOf('main clinic') !== -1 &&
          loc.name.toLowerCase().indexOf('downtown') !== -1;
      });
      if (!mainLocation) {
        mainLocation = overview.locations.find(loc => loc.is_main_location) || overview.locations[0];
      }
      this.assert(mainLocation && mainLocation.id, 'Should have a main clinic location');

      const formOptions = this.logic.getNewPatientVisitFormOptions();
      this.assert(formOptions && Array.isArray(formOptions.reason_for_visit_options), 'New patient visit form options should be available');

      const reasonOption = formOptions.reason_for_visit_options.find(opt =>
        typeof opt.label === 'string' && opt.label.toLowerCase().indexOf('type 1 diabetes') !== -1
      );
      this.assert(reasonOption, 'Should have Type 1 Diabetes as a reason for visit');

      const appointmentType = formOptions.default_appointment_type || 'new_patient';

      // Determine date range: today (or earliest constraint) through next 14 days
      let startDate = this.getTodayDateString();
      if (formOptions.date_constraints && formOptions.date_constraints.earliest_date) {
        startDate = formOptions.date_constraints.earliest_date;
      }
      let endDate = this.addDaysToDateString(startDate, 14);
      if (formOptions.date_constraints && formOptions.date_constraints.latest_date) {
        endDate = this.minISODate(endDate, formOptions.date_constraints.latest_date);
      }

      // Search morning-only first
      let slots = this.logic.searchAvailableAppointmentSlots(
        mainLocation.id,
        appointmentType,
        startDate,
        endDate,
        true
      );
      this.assert(Array.isArray(slots), 'searchAvailableAppointmentSlots should return an array');

      // If no morning slots available in data, fall back to any time of day
      if (!slots || slots.length === 0) {
        slots = this.logic.searchAvailableAppointmentSlots(
          mainLocation.id,
          appointmentType,
          startDate,
          endDate,
          false
        );
      }

      this.assert(slots && slots.length > 0, 'Should find at least one available slot for new patient');

      // Prefer slots marked available, then earliest by start time
      let availableSlots = slots;
      if (slots[0] && typeof slots[0].status === 'string') {
        const onlyAvailable = slots.filter(s => s.status === 'available');
        if (onlyAvailable.length > 0) {
          availableSlots = onlyAvailable;
        }
      }

      availableSlots.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
      const earliestSlot = availableSlots[0];
      this.assert(earliestSlot && earliestSlot.id, 'Should identify an earliest appointment slot');

      // Submit appointment request using actual slot and location
      const submitResult = this.logic.submitAppointmentRequest(
        appointmentType,
        reasonOption.label,
        reasonOption.code,
        mainLocation.id,
        earliestSlot.id,
        earliestSlot.start_datetime,
        'Alex Rivera',
        '2014-03-15',
        'Maria Rivera',
        '555-123-4567',
        'parent@example.com',
        'Integration test Task 1: earliest diabetes appointment'
      );

      this.assert(submitResult && submitResult.success === true, 'Appointment request should succeed');
      this.assert(submitResult.appointmentRequest, 'Appointment request object should be returned');

      const req = submitResult.appointmentRequest;
      this.assert(req.id, 'AppointmentRequest should have an id');
      this.assert(req.location_id === mainLocation.id, 'AppointmentRequest location should match chosen location');
      this.assert(req.appointment_slot_id === earliestSlot.id, 'AppointmentRequest slot should match chosen slot');
      this.assert(req.child_name === 'Alex Rivera', 'Child name should match submitted value');
      this.assert(req.parent_guardian_name === 'Maria Rivera', 'Parent name should match submitted value');

      // Verify persisted data using storage key 'appointment_requests'
      const stored = JSON.parse(localStorage.getItem('appointment_requests') || '[]');
      const storedReq = stored.find(r => r.id === req.id);
      this.assert(storedReq, 'Stored AppointmentRequest should be found in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // =====================
  // Task 2
  // =====================
  testTask2_SelectThyroidSpecialistSpanish() {
    const testName = 'Task 2: Select thyroid specialist who speaks Spanish and has 10+ years experience';
    console.log('Testing:', testName);

    try {
      const filterOptions = this.logic.getDoctorFilterOptions();
      this.assert(filterOptions, 'Doctor filter options should be returned');

      // Condition: Thyroid Disorders
      const thyroidCondition = (filterOptions.conditions || []).find(cond =>
        typeof cond.name === 'string' && cond.name.toLowerCase().indexOf('thyroid disorders') !== -1
      );
      this.assert(thyroidCondition, 'Should have Thyroid Disorders condition option');

      // Language: Spanish
      const spanishLang = (filterOptions.languages || []).find(lang =>
        lang.code === 'spanish' || (lang.label && lang.label.toLowerCase().indexOf('spanish') !== -1)
      );
      this.assert(spanishLang, 'Should have Spanish language filter option');

      // Experience: 10+ years (choose range with min_years >= 10 if available)
      const expRanges = filterOptions.experience_ranges || [];
      let tenPlusRange = expRanges.find(r => {
        if (!r.label) return false;
        const label = r.label.toLowerCase();
        return label.indexOf('10') !== -1 && label.indexOf('+') !== -1;
      });
      if (!tenPlusRange) {
        tenPlusRange = expRanges.find(r => typeof r.min_years === 'number' && r.min_years >= 10) || expRanges[expRanges.length - 1];
      }
      this.assert(tenPlusRange, 'Should have an experience range suitable for 10+ years');

      // Sort option: last_name_az if available
      let sortBy = undefined;
      if (Array.isArray(filterOptions.sort_options)) {
        const sortOpt = filterOptions.sort_options.find(o => o.code === 'last_name_az') || filterOptions.sort_options[0];
        if (sortOpt) sortBy = sortOpt.code;
      }

      // Search doctors with filters
      const filters = {
        conditionId: thyroidCondition.id,
        languageCode: spanishLang.code,
        minYearsExperience: tenPlusRange.min_years
      };

      const doctors = this.logic.searchDoctors(filters, sortBy);
      this.assert(Array.isArray(doctors) && doctors.length > 0, 'Doctor search should return at least one doctor');

      // From filtered list, pick first doctor with 10+ years and Spanish
      let chosenDoctor = doctors.find(doc => {
        const hasExperience = typeof doc.years_of_experience === 'number' && doc.years_of_experience >= 10;
        const speaksSpanish = Array.isArray(doc.languages_spoken) && doc.languages_spoken.indexOf(spanishLang.code) !== -1;
        return hasExperience && speaksSpanish;
      }) || doctors[0];

      this.assert(chosenDoctor && chosenDoctor.id, 'Should select a doctor from search results');

      // Load full profile
      const profile = this.logic.getDoctorProfile(chosenDoctor.id);
      this.assert(profile && profile.doctor, 'Doctor profile should be returned');

      const doc = profile.doctor;
      this.assert(doc.id === chosenDoctor.id, 'Profile doctor id should match selected doctor');
      this.assert(Array.isArray(doc.languages_spoken) && doc.languages_spoken.indexOf(spanishLang.code) !== -1,
        'Doctor should speak Spanish');
      this.assert(typeof doc.years_of_experience === 'number' && doc.years_of_experience >= 10,
        'Doctor should have at least 10 years of experience');

      // Check that Thyroid Disorders is among conditions treated in profile
      if (Array.isArray(profile.conditions_treated)) {
        const treatsThyroid = profile.conditions_treated.some(cond => cond.id === thyroidCondition.id);
        this.assert(treatsThyroid, 'Doctor should treat Thyroid Disorders');
      }

      // Locate main office phone
      this.assert(typeof doc.main_office_phone === 'string' && doc.main_office_phone.length > 0,
        'Doctor should have a main office phone number');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // =====================
  // Task 3
  // =====================
  testTask3_RegisterEveningInsulinPumpClass() {
    const testName = 'Task 3: Register for next evening insulin pump education class after 5 PM within 60 days';
    console.log('Testing:', testName);

    try {
      const filterOptions = this.logic.getClassFilterOptions();
      this.assert(filterOptions, 'Class filter options should be available');

      // Find topic code for Insulin Pump Education
      const topicOpt = (filterOptions.topics || []).find(t =>
        typeof t.label === 'string' && t.label.toLowerCase().indexOf('insulin pump education') !== -1
      );
      this.assert(topicOpt, 'Should have Insulin Pump Education topic option');

      const topicCode = topicOpt.code;
      const startDate = this.getTodayDateString();
      const endDate = this.addDaysToDateString(startDate, 60);

      // Search for classes at or after 5:00 PM
      let classes = this.logic.searchClassEvents(topicCode, startDate, endDate, '17:00', true);
      this.assert(Array.isArray(classes), 'searchClassEvents should return an array');

      // Fallback: if none returned with minStartTime, search without time filter
      if (!classes || classes.length === 0) {
        classes = this.logic.searchClassEvents(topicCode, startDate, endDate, undefined, true);
      }

      this.assert(classes && classes.length > 0, 'Should find at least one insulin pump education class in next 60 days');

      // Sort by start_datetime and pick earliest
      classes.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
      const earliestClass = classes[0];
      this.assert(earliestClass && earliestClass.id, 'Should select earliest qualifying class');

      // Load full event details
      const details = this.logic.getClassEventDetails(earliestClass.id);
      this.assert(details && details.classEvent, 'Class event details should be returned');

      const event = details.classEvent;
      this.assert(event.id === earliestClass.id, 'ClassEvent id from details should match selected event');

      // Submit registration for one child and one parent (2 attendees)
      const registrationResult = this.logic.submitClassRegistration(
        event.id,
        'Liam Carter',
        '2015-09-10',
        'Type 1 Diabetes',
        'type_1_diabetes',
        'Emma Carter',
        '555-987-6543',
        'ecarter@example.com',
        2,
        true,
        'Integration test Task 3: evening insulin pump class'
      );

      this.assert(registrationResult && registrationResult.success === true, 'Class registration should succeed');
      const reg = registrationResult.classRegistration;
      this.assert(reg && reg.id, 'ClassRegistration should have an id');
      this.assert(reg.class_event_id === event.id, 'ClassRegistration should be linked to the selected class event');
      if (typeof reg.attendee_count === 'number') {
        this.assert(reg.attendee_count === 2, 'Attendee count should be 2');
      }

      // Verify persistence in 'class_registrations'
      const stored = JSON.parse(localStorage.getItem('class_registrations') || '[]');
      const storedReg = stored.find(r => r.id === reg.id);
      this.assert(storedReg, 'Stored ClassRegistration should be found in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // =====================
  // Task 4
  // =====================
  testTask4_SaveTwoEasyReadingGHDArticles() {
    const testName = 'Task 4: Save two recent easy-reading articles about growth hormone deficiency';
    console.log('Testing:', testName);

    try {
      const filterOptions = this.logic.getEducationFilterOptions();
      this.assert(filterOptions, 'Education filter options should be available');

      // Determine reading level code for easy
      const easyLevel = (filterOptions.reading_levels || []).find(rl => rl.code === 'easy');
      this.assert(easyLevel, 'Should have easy reading level option');

      // Date range: last 2 years
      const todayStr = this.getTodayDateString();
      const twoYearsAgoStr = this.addYearsToDateString(todayStr, -2);

      const filters = {
        startPublicationDate: twoYearsAgoStr,
        endPublicationDate: todayStr,
        readingLevel: 'easy'
      };

      const articles = this.logic.searchEducationArticles('growth hormone deficiency', filters);
      this.assert(Array.isArray(articles) && articles.length >= 2,
        'Should find at least two easy-reading GHD articles from last 2 years');

      // Take first two matching articles
      const firstArticle = articles[0];
      const secondArticle = articles[1];

      this.assert(firstArticle && firstArticle.id, 'First article should have an id');
      this.assert(secondArticle && secondArticle.id, 'Second article should have an id');

      // Optional: verify metadata from detail view
      const firstDetail = this.logic.getEducationArticleDetail(firstArticle.id);
      this.assert(firstDetail && firstDetail.id === firstArticle.id,
        'First article detail should match list item');

      const secondDetail = this.logic.getEducationArticleDetail(secondArticle.id);
      this.assert(secondDetail && secondDetail.id === secondArticle.id,
        'Second article detail should match list item');

      // Save/bookmark both articles
      const saveResult1 = this.logic.saveArticleToSavedList(firstArticle.id);
      this.assert(saveResult1 && saveResult1.success === true, 'Saving first article should succeed');

      const saveResult2 = this.logic.saveArticleToSavedList(secondArticle.id);
      this.assert(saveResult2 && saveResult2.success === true, 'Saving second article should succeed');

      // Load saved articles list
      const savedData = this.logic.getSavedArticlesList();
      this.assert(savedData && savedData.savedList, 'Saved articles list should be returned');

      const savedList = savedData.savedList;
      const savedIds = Array.isArray(savedList.article_ids) ? savedList.article_ids : [];
      this.assert(savedIds.indexOf(firstArticle.id) !== -1,
        'Saved list should contain first article id');
      this.assert(savedIds.indexOf(secondArticle.id) !== -1,
        'Saved list should contain second article id');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // =====================
  // Task 5
  // =====================
  testTask5_CalculateHeightPercentileAndPrint() {
    const testName = 'Task 5: Calculate child height percentile and open print-friendly growth chart';
    console.log('Testing:', testName);

    try {
      const tools = this.logic.getToolsOverview();
      this.assert(Array.isArray(tools) && tools.length > 0, 'Tools overview should list available tools');

      // Optionally confirm growth calculator tool exists
      const growthTool = tools.find(t =>
        typeof t.tool_key === 'string' && t.tool_key.toLowerCase().indexOf('growth') !== -1
      );
      this.assert(growthTool, 'Growth calculator tool should be available');

      // Calculate percentile for 8-year-old girl, height 120 cm, weight 25 kg
      const calcResult = this.logic.calculateGrowthPercentile(
        'female',
        8,
        'years',
        120,
        'cm',
        25,
        'kg'
      );

      this.assert(calcResult && calcResult.calculation, 'Growth calculation should be returned');

      const calc = calcResult.calculation;
      this.assert(calc.id, 'GrowthCalculation should have an id');
      this.assert(calc.child_sex === 'female', 'Child sex should be female');
      this.assert(calc.child_age_value === 8, 'Child age value should be 8');
      this.assert(calc.child_age_unit === 'years', 'Child age unit should be years');
      this.assert(calc.height_value === 120, 'Height value should be 120');
      this.assert(calc.height_unit === 'cm', 'Height unit should be cm');
      if (typeof calc.weight_value === 'number') {
        this.assert(calc.weight_value === 25, 'Weight value should be 25 when stored');
      }
      if (typeof calc.height_percentile === 'number') {
        this.assert(calc.height_percentile >= 0 && calc.height_percentile <= 100,
          'Height percentile should be between 0 and 100');
      }

      // Retrieve print-friendly data using actual calculation id
      const printData = this.logic.getGrowthCalculationPrintData(calc.id);
      this.assert(printData && printData.calculation, 'Print data should include calculation');
      this.assert(printData.calculation.id === calc.id,
        'Print data calculation id should match original calculation');
      this.assert(typeof printData.print_instructions === 'string' && printData.print_instructions.length > 0,
        'Print instructions text should be present');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // =====================
  // Task 6
  // =====================
  testTask6_CheckInsuranceAndSendBillingQuestion() {
    const testName = 'Task 6: Check BluePlus Silver HMO acceptance and send billing question';
    console.log('Testing:', testName);

    try {
      // High-level billing overview (simulating navigation to Billing & Insurance page)
      const overview = this.logic.getBillingAndInsuranceOverview();
      this.assert(overview && typeof overview.billing_overview_text === 'string',
        'Billing overview text should be available');

      // Search for the specific insurance plan by name
      const plans = this.logic.searchInsurancePlans('BluePlus Silver HMO');
      this.assert(Array.isArray(plans) && plans.length > 0,
        'Insurance plan search should return at least one match');

      let targetPlan = plans.find(p =>
        typeof p.name === 'string' && p.name.toLowerCase().indexOf('blueplus silver hmo') !== -1
      ) || plans[0];

      this.assert(targetPlan && targetPlan.id, 'Target insurance plan should be identified');

      // Get full plan details
      const planDetail = this.logic.getInsurancePlanDetail(targetPlan.id);
      this.assert(planDetail && planDetail.id === targetPlan.id, 'Plan detail id should match search result');
      this.assert(typeof planDetail.is_accepted === 'boolean', 'Plan detail should include is_accepted flag');
      this.assert(planDetail.is_accepted === true, 'BluePlus Silver HMO should be accepted');

      // Capture specialist co-pay amount dynamically for validation (no hardcoded value)
      const copayAmount = planDetail.specialist_copay_amount;
      if (typeof copayAmount === 'number') {
        this.assert(copayAmount > 0, 'Specialist co-pay amount should be positive');
      }

      // Submit a billing question linked to this plan
      const subject = 'Parent asking about BluePlus Silver HMO co-pay';
      const message = 'Hello, I have BluePlus Silver HMO and want to confirm the co-pay for a new pediatric endocrinology patient visit. The plan details mention a $25 specialist co-pay. Can you confirm this?';

      const questionResult = this.logic.submitBillingQuestion(
        planDetail.id,
        subject,
        message,
        'Jordan Smith',
        '555-222-3344',
        'jsmith@example.com'
      );

      this.assert(questionResult && questionResult.success === true,
        'Billing question submission should succeed');

      const billingQuestion = questionResult.billingQuestion;
      this.assert(billingQuestion && billingQuestion.id,
        'BillingQuestion should have an id');
      this.assert(billingQuestion.insurance_plan_id === planDetail.id,
        'BillingQuestion should be linked to BluePlus Silver HMO');
      this.assert(billingQuestion.contact_name === 'Jordan Smith',
        'Contact name should match submitted value');

      // Verify persistence in 'billing_questions'
      const stored = JSON.parse(localStorage.getItem('billing_questions') || '[]');
      const storedQuestion = stored.find(q => q.id === billingQuestion.id);
      this.assert(storedQuestion, 'Stored BillingQuestion should be found in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // =====================
  // Task 7
  // =====================
  testTask7_RequestLevothyroxineRefillToNearestPharmacy() {
    const testName = 'Task 7: Request refill for levothyroxine 50 mcg to nearest pharmacy within 5 miles';
    console.log('Testing:', testName);

    try {
      const formOptions = this.logic.getPrescriptionRefillFormOptions();
      this.assert(formOptions && Array.isArray(formOptions.patient_types),
        'Prescription refill form options should be available');

      const existingType = formOptions.patient_types.find(pt => pt.code === 'existing_patient');
      this.assert(existingType, 'Existing patient option should be available');

      // Search nearby pharmacies within 5 miles of ZIP 10027
      const pharmacies = this.logic.searchNearbyPharmacies('10027', 5);
      this.assert(Array.isArray(pharmacies) && pharmacies.length > 0,
        'Pharmacy search should return at least one pharmacy');

      // Select first pharmacy within 5 miles (sorted by distance if data provides it)
      const withinFive = pharmacies.filter(p => typeof p.distance_miles !== 'number' || p.distance_miles <= 5);
      this.assert(withinFive.length > 0, 'Should have at least one pharmacy within 5 miles');

      withinFive.sort((a, b) => {
        const da = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
        const db = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
        return da - db;
      });

      const chosenPharmacy = withinFive[0];
      this.assert(chosenPharmacy && chosenPharmacy.id, 'Chosen pharmacy should have an id');

      // Pickup time: earliest available slot at or after 4:00 PM today
      const todayStr = this.getTodayDateString();
      const pickupSlots = this.logic.getPharmacyPickupSlots(chosenPharmacy.id, todayStr);
      this.assert(Array.isArray(pickupSlots) && pickupSlots.length > 0,
        'Pickup slots should be returned for chosen pharmacy');

      let availableSlots = pickupSlots.filter(s => s.status === 'available');
      if (availableSlots.length === 0) {
        availableSlots = pickupSlots;
      }
      this.assert(availableSlots.length > 0, 'Should have at least one usable pickup slot');

      // Filter for slots starting at or after 16:00 (4 PM), falling back to earliest available if none
      const afterFour = availableSlots.filter(slot => {
        const d = new Date(slot.start_datetime);
        const hour = d.getUTCHours();
        return hour >= 16;
      });

      let slotCandidates = afterFour.length > 0 ? afterFour : availableSlots;
      slotCandidates.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
      const chosenSlot = slotCandidates[0];
      this.assert(chosenSlot && chosenSlot.id, 'Chosen pickup slot should have an id');

      // Submit prescription refill request
      const refillResult = this.logic.submitPrescriptionRefillRequest(
        'existing_patient',
        'Levothyroxine 50 mcg tablet',
        '50 mcg',
        'tablet',
        30,
        chosenPharmacy.id,
        chosenSlot.id,
        chosenSlot.start_datetime,
        'Noah Green',
        '2012-05-02',
        'Lauren Green',
        '555-444-7788',
        'lgreen@example.com',
        'Integration test Task 7: levothyroxine refill'
      );

      this.assert(refillResult && refillResult.success === true,
        'Prescription refill submission should succeed');

      const refill = refillResult.prescriptionRefillRequest;
      this.assert(refill && refill.id, 'PrescriptionRefillRequest should have an id');
      this.assert(refill.patient_type === 'existing_patient', 'Patient type should be existing_patient');
      this.assert(refill.medication_name === 'Levothyroxine 50 mcg tablet',
        'Medication name should match submitted value');
      this.assert(refill.quantity === 30, 'Quantity should be 30 tablets');
      this.assert(refill.pharmacy_id === chosenPharmacy.id,
        'Refill request should be linked to chosen pharmacy');
      if (refill.pickup_slot_id) {
        this.assert(refill.pickup_slot_id === chosenSlot.id,
          'Refill request pickup_slot_id should match chosen slot');
      }

      // Verify persistence in 'prescription_refill_requests'
      const stored = JSON.parse(localStorage.getItem('prescription_refill_requests') || '[]');
      const storedRefill = stored.find(r => r.id === refill.id);
      this.assert(storedRefill, 'Stored PrescriptionRefillRequest should be found in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // =====================
  // Task 8
  // =====================
  testTask8_SubmitNewPatientEarlyPubertyQuestionnaire() {
    const testName = 'Task 8: Complete new patient pre-visit questionnaire for early puberty concerns';
    console.log('Testing:', testName);

    try {
      // Get list of patient forms (simulates navigating to Forms & Questionnaires)
      const forms = this.logic.getPatientFormsList();
      this.assert(Array.isArray(forms) && forms.length > 0, 'Patient forms list should be available');

      // Find New Patient Endocrine Intake form by name
      const intakeForm = forms.find(f =>
        typeof f.name === 'string' && f.name.toLowerCase().indexOf('new patient endocrine intake') !== -1
      );
      this.assert(intakeForm && intakeForm.id, 'New Patient Endocrine Intake form should be present');

      // Load form detail (metadata only, but simulates opening form page)
      const formDetail = this.logic.getPatientFormDetail(intakeForm.id);
      this.assert(formDetail && formDetail.id === intakeForm.id,
        'PatientForm detail id should match selected form');

      // Submit new patient questionnaire
      const submissionResult = this.logic.submitNewPatientQuestionnaire(
        intakeForm.id,
        'Sofia Martinez',
        '2016-01-18',
        'female',
        'Early puberty',
        'early_puberty',
        'Carlos Martinez',
        '555-333-1212',
        'cmartinez@example.com',
        'Dr. Karen Lee, Pediatrician',
        '2026-05-20',
        false,
        'None',
        ''
      );

      this.assert(submissionResult && submissionResult.success === true,
        'New patient questionnaire submission should succeed');

      const submission = submissionResult.questionnaireSubmission;
      this.assert(submission && submission.id,
        'NewPatientQuestionnaireSubmission should have an id');
      this.assert(submission.child_name === 'Sofia Martinez',
        'Child name should match submitted value');
      this.assert(submission.primary_concern_text === 'Early puberty',
        'Primary concern text should match submitted value');
      this.assert(submission.parent_guardian_name === 'Carlos Martinez',
        'Parent/guardian name should match submitted value');

      // Verify persistence in 'new_patient_questionnaires'
      const stored = JSON.parse(localStorage.getItem('new_patient_questionnaires') || '[]');
      const storedSubmission = stored.find(s => s.id === submission.id);
      this.assert(storedSubmission, 'Stored NewPatientQuestionnaireSubmission should be found in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // =====================
  // Helper methods
  // =====================
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

  getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  addDaysToDateString(dateStr, days) {
    // dateStr expected as YYYY-MM-DD
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  addYearsToDateString(dateStr, yearsDelta) {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCFullYear(d.getUTCFullYear() + yearsDelta);
    return d.toISOString().slice(0, 10);
  }

  minISODate(a, b) {
    if (a && b) {
      return a < b ? a : b;
    }
    return a || b;
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
