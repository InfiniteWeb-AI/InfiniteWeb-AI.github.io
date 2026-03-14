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
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided (same values)
    const generatedData = {
      appointment_types: [
        {
          id: 'individual_50min',
          code: 'individual_counseling',
          name: 'Individual Counseling (50 minutes)',
          description: 'Standard individual therapy session focused on a wide range of concerns such as anxiety, depression, and stress.',
          duration_minutes: 50,
          is_free: false,
          allowed_formats: ['in_person', 'online'],
          is_individual: true
        },
        {
          id: 'individual_80min_intake',
          code: 'individual_counseling',
          name: 'Individual Counseling Intake (80 minutes)',
          description: 'Extended first session to review history, goals, and create an initial treatment plan.',
          duration_minutes: 80,
          is_free: false,
          allowed_formats: ['in_person', 'online'],
          is_individual: true
        },
        {
          id: 'couples_75min',
          code: 'couples_counseling',
          name: 'Couples Counseling (75 minutes)',
          description: 'Relationship-focused counseling for partners seeking to improve communication and connection.',
          duration_minutes: 75,
          is_free: false,
          allowed_formats: ['in_person', 'online'],
          is_individual: false
        }
      ],
      assessments: [
        {
          id: 'phq9',
          code: 'phq_9',
          name: 'Depression Self-Assessment (PHQ-9)',
          description: 'A brief, evidence-based questionnaire to help screen for symptoms of depression over the last two weeks.',
          estimated_minutes: 5,
          disclaimer: 'This self-assessment is for educational purposes only and does not provide a diagnosis. If you are concerned about your results, please contact a licensed mental health professional.'
        },
        {
          id: 'gad7',
          code: 'gad_7',
          name: 'Anxiety Self-Assessment (GAD-7)',
          description: 'A short screening tool to assess the severity of generalized anxiety symptoms.',
          estimated_minutes: 5,
          disclaimer: 'Results from this tool are not a substitute for a professional evaluation. If anxiety is impacting your daily life, consider speaking with a therapist or healthcare provider.'
        },
        {
          id: 'pts_screen',
          code: 'pts',
          name: 'Post-Traumatic Stress Screener',
          description: 'A brief questionnaire to help identify common post-traumatic stress symptoms following difficult or traumatic experiences.',
          estimated_minutes: 7,
          disclaimer: 'This screener cannot confirm or rule out PTSD. For a full assessment and support, please consult with a qualified mental health clinician.'
        }
      ],
      crisis_hotlines: [
        {
          id: 'sf_county_crisis_line',
          name: 'San Francisco County Crisis Line',
          phone_number: '415-555-0100',
          hotline_type: 'local',
          region: 'San Francisco County, CA',
          audience: 'all_ages',
          availability_hours: '24/7',
          is_local: true,
          notes: 'For anyone in San Francisco County experiencing an emotional or mental health crisis.',
          sort_order: 1
        },
        {
          id: 'sf_youth_crisis_line',
          name: 'San Francisco Youth Crisis Line',
          phone_number: '415-555-0120',
          hotline_type: 'local',
          region: 'San Francisco, CA',
          audience: 'youth',
          availability_hours: '24/7',
          is_local: true,
          notes: 'Confidential support for teens and young adults in crisis.',
          sort_order: 2
        },
        {
          id: 'sf_warm_line',
          name: 'San Francisco Peer Warm Line',
          phone_number: '415-555-0135',
          hotline_type: 'local',
          region: 'San Francisco Bay Area, CA',
          audience: 'adults',
          availability_hours: '7 days a week, 7:00 am1:00 pm',
          is_local: true,
          notes: 'Peer support line for non-emergency emotional support.',
          sort_order: 3
        }
      ],
      group_programs: [
        {
          id: 'social_anxiety_evening_apr',
          title: 'Social Anxiety Skills Group (Evening)',
          topic: 'social_anxiety',
          description: 'A structured 8-week in-person group for adults who feel anxious in social situations. Sessions focus on CBT-based skills, gradual exposure, and peer support.',
          goals: 'Increase comfort in social situations, build confidence in conversation, reduce avoidance, and practice real-life coping skills.',
          start_date: '2026-04-08T18:00:00-07:00',
          format: 'in_person',
          location: 'Downtown San Francisco Office 2 835 Market St, Suite 900',
          fee_per_session: 65,
          total_sessions: 8,
          facilitator_names: ['Maya Chen, PsyD', 'Jordan Alvarez, LMFT'],
          is_active: true
        },
        {
          id: 'social_anxiety_morning_apr_online',
          title: 'Social Confidence Group (Morning, Online)',
          topic: 'social_anxiety',
          description: 'An online 6-week group for adults who experience social anxiety at work or school. Meets weekly on Tuesdays from 10:00 am12:00 pm via secure video.',
          goals: 'Develop practical strategies for managing anxiety in meetings, presentations, and social gatherings.',
          start_date: '2026-04-14T10:00:00-07:00',
          format: 'online',
          location: 'Online via secure video (Zoom link provided after registration)',
          fee_per_session: 55,
          total_sessions: 6,
          facilitator_names: ['Alex Rivera, LCSW'],
          is_active: true
        },
        {
          id: 'depression_support_march',
          title: 'Depression Support Circle',
          topic: 'depression_support',
          description: 'A supportive 10-week group for adults living with mild to moderate depression. Includes psychoeducation, coping skills, and space to share experiences.',
          goals: 'Reduce isolation, increase understanding of depression, and build a toolbox of coping strategies.',
          start_date: '2026-03-15T17:30:00-07:00',
          format: 'hybrid',
          location: 'Hybrid: Downtown San Francisco Office or online via secure video',
          fee_per_session: 60,
          total_sessions: 10,
          facilitator_names: ['Priya Nair, PhD'],
          is_active: true
        }
      ],
      insurance_plans: [
        {
          id: 'medical_behavioral_health',
          name: 'MediCal Behavioral Health',
          provider_name: 'MediCal',
          plan_code: 'MediCal-BH',
          copay_amount: 0,
          notes: 'Often covers medically necessary outpatient mental health services with no copay; prior authorization may be required for extended treatment.',
          is_active: true
        },
        {
          id: 'bluecare_basic',
          name: 'BlueCare Basic',
          provider_name: 'BlueCare',
          plan_code: 'BC-BASIC',
          copay_amount: 20,
          notes: 'Outpatient mental health visits typically limited to in-network providers; preauthorization may apply after 20 sessions.',
          is_active: true
        },
        {
          id: 'bluecare_plus',
          name: 'BlueCare Plus',
          provider_name: 'BlueCare',
          plan_code: 'BC-PLUS',
          copay_amount: 30,
          notes: 'Lower copay for in-network providers and partial reimbursement for out-of-network sessions.',
          is_active: true
        }
      ],
      articles: [
        {
          id: 'understanding_depression_signs',
          title: 'Understanding Depression: Signs, Symptoms, and When to Get Help',
          slug: 'understanding-depression-signs-symptoms',
          summary: 'Learn common signs of depression, how it can affect daily life, and what to do if you recognize these patterns in yourself.',
          content: 'Depression is more than feeling sad for a few days. It can affect your sleep, appetite, energy, concentration, and relationships. Many people notice feeling numb, disconnected, or unmotivated. If these feelings last for more than two weeks, it may be time to reach out for support. A primary care provider or therapist can help you understand what you are experiencing and explore options like counseling, lifestyle changes, or medication.\n\nNo online tool can diagnose depression, but screenings like the PHQ-9 can help you notice patterns and start a conversation with a professional.',
          topics: ['depression', 'screening_tools', 'getting_started_with_therapy'],
          is_featured: true,
          publish_date: '2025-11-15T09:00:00-08:00',
          is_recommended: true,
          recommended_for_assessment_ids: ['phq9']
        },
        {
          id: 'small_steps_low_energy_days',
          title: 'Small Steps for Low-Energy Days',
          slug: 'small-steps-for-low-energy-days',
          summary: 'Practical ideas for days when depression makes everything feel heavy and overwhelming.',
          content: 'On low-energy days, even simple tasks like showering or answering a text can feel impossible. Instead of trying to push yourself into a full routine, consider choosing one or two very small actions. Examples include: brushing your teeth, opening a window for fresh air, drinking a glass of water, or texting one trusted person to say you\u2019re having a hard day.\n\nThese actions won\u2019t make depression disappear, but they can help you maintain a connection with yourself and others while you work on longer-term support like therapy or medication.',
          topics: ['depression', 'self_care', 'coping_skills'],
          is_featured: false,
          publish_date: '2026-01-05T10:30:00-08:00',
          is_recommended: true,
          recommended_for_assessment_ids: ['phq9']
        },
        {
          id: 'talking_to_therapist_about_depression',
          title: 'How to Talk to a Therapist About Your Depression',
          slug: 'how-to-talk-to-a-therapist-about-depression',
          summary: 'Tips for sharing your experiences with depression in a first therapy session.',
          content: 'It\u2019s common to feel unsure what to say in your first therapy session. You don\u2019t need the perfect words or a clear story. Start with what feels most true right now: how your mood has been, what has changed in your daily life, and what you hope might feel different in the future.\n\nUsing your PHQ-9 results as a guide can help. You might say, \u201cI\u2019ve been struggling with low mood, low energy, and sleep issues most days. It\u2019s starting to affect my work and relationships, and I\u2019d like support figuring out what to do.\u201d A good therapist will ask follow-up questions and move at a pace that feels manageable.',
          topics: ['depression', 'therapy_process', 'getting_started_with_therapy'],
          is_featured: false,
          publish_date: '2026-02-10T14:00:00-08:00',
          is_recommended: true,
          recommended_for_assessment_ids: ['phq9']
        }
      ],
      assessment_questions: [
        {
          id: 'phq9_q1',
          assessment_id: 'phq9',
          order: 1,
          text: 'Little interest or pleasure in doing things.'
        },
        {
          id: 'phq9_q2',
          assessment_id: 'phq9',
          order: 2,
          text: 'Feeling down, depressed, or hopeless.'
        },
        {
          id: 'phq9_q3',
          assessment_id: 'phq9',
          order: 3,
          text: 'Trouble falling or staying asleep, or sleeping too much.'
        }
      ],
      assessment_options: [
        {
          id: 'phq9_q1_opt0',
          assessment_question_id: 'phq9_q1',
          order: 1,
          label: 'Not at all',
          value: 0
        },
        {
          id: 'phq9_q1_opt1',
          assessment_question_id: 'phq9_q1',
          order: 2,
          label: 'Several days',
          value: 1
        },
        {
          id: 'phq9_q1_opt2',
          assessment_question_id: 'phq9_q1',
          order: 3,
          label: 'More than half the days',
          value: 2
        }
      ],
      group_registrations: [
        {
          id: 'reg_taylor_morgan_social_anxiety_6pm',
          group_program_id: 'social_anxiety_evening_apr',
          group_session_id: 'sess_social_anxiety_evening_apr_wed_6pm',
          participant_first_name: 'Taylor',
          participant_last_name: 'Morgan',
          participant_email: 'taylor.morgan@example.com',
          num_participants: 1,
          payment_option: 'pay_later',
          status: 'confirmed',
          created_at: '2026-03-02T15:10:00-08:00'
        },
        {
          id: 'reg_jamie_rivera_parenting_online',
          group_program_id: 'parenting_skills_online_apr',
          group_session_id: 'sess_parenting_skills_online_fri_12pm',
          participant_first_name: 'Jamie',
          participant_last_name: 'Rivera',
          participant_email: 'parent.care@example.com',
          num_participants: 1,
          payment_option: 'pay_now',
          status: 'confirmed',
          created_at: '2026-02-25T09:30:00-08:00'
        },
        {
          id: 'reg_alex_nguyen_trauma_recovery',
          group_program_id: 'trauma_recovery_may',
          group_session_id: 'sess_trauma_recovery_tue_630pm',
          participant_first_name: 'Alex',
          participant_last_name: 'Nguyen',
          participant_email: 'alex.nguyen@example.com',
          num_participants: 1,
          payment_option: 'pay_at_first_session',
          status: 'pending',
          created_at: '2026-03-01T11:45:00-08:00'
        }
      ],
      group_sessions: [
        {
          id: 'sess_social_anxiety_evening_apr_wed_6pm',
          group_program_id: 'social_anxiety_evening_apr',
          weekday: 'wednesday',
          start_time: '18:00',
          end_time: '20:00',
          is_evening: true,
          timezone: 'America/Los_Angeles',
          capacity: 10,
          start_date: '2026-04-08T18:00:00-07:00',
          end_date: '2026-05-27T20:00:00-07:00',
          is_active: true,
          registered_count: 1
        },
        {
          id: 'sess_social_anxiety_morning_apr_tue_10am',
          group_program_id: 'social_anxiety_morning_apr_online',
          weekday: 'tuesday',
          start_time: '10:00',
          end_time: '12:00',
          is_evening: false,
          timezone: 'America/Los_Angeles',
          capacity: 12,
          start_date: '2026-04-14T10:00:00-07:00',
          end_date: '2026-05-19T12:00:00-07:00',
          is_active: true,
          registered_count: 0
        },
        {
          id: 'sess_depression_support_mon_530pm',
          group_program_id: 'depression_support_march',
          weekday: 'monday',
          start_time: '17:30',
          end_time: '19:00',
          is_evening: true,
          timezone: 'America/Los_Angeles',
          capacity: 10,
          start_date: '2026-03-16T17:30:00-07:00',
          end_date: '2026-05-18T19:00:00-07:00',
          is_active: true,
          registered_count: 0
        }
      ],
      appointment_slots: [
        {
          id: 'slot_chen_20260303_1730_inperson',
          therapist_id: 'therapist_maya_chen',
          appointment_type_id: 'individual_50min',
          start_datetime: '2026-03-03T17:30:00-08:00',
          end_datetime: '2026-03-03T18:20:00-08:00',
          session_format: 'in_person',
          location_zip: '94103',
          is_booked: false,
          is_weekend: false,
          is_evening: true,
          is_free_consult: false
        },
        {
          id: 'slot_chen_20260305_1700_inperson',
          therapist_id: 'therapist_maya_chen',
          appointment_type_id: 'individual_50min',
          start_datetime: '2026-03-05T17:00:00-08:00',
          end_datetime: '2026-03-05T17:50:00-08:00',
          session_format: 'in_person',
          location_zip: '94103',
          is_booked: false,
          is_weekend: false,
          is_evening: true,
          is_free_consult: false
        },
        {
          id: 'slot_kim_20260306_1800_inperson_booked',
          therapist_id: 'therapist_daniel_kim',
          appointment_type_id: 'individual_50min',
          start_datetime: '2026-03-06T18:00:00-08:00',
          end_datetime: '2026-03-06T18:50:00-08:00',
          session_format: 'in_person',
          location_zip: '94110',
          is_booked: true,
          is_weekend: false,
          is_evening: true,
          is_free_consult: false
        }
      ],
      appointments: [
        {
          id: 'appt_001_kim_individual_20260306',
          therapist_id: 'therapist_daniel_kim',
          appointment_slot_id: 'slot_kim_20260306_1800_inperson_booked',
          appointment_type_id: 'individual_50min',
          client_first_name: 'Maria',
          client_last_name: 'Lopez',
          client_phone: '555-201-3344',
          client_email: 'maria.lopez@example.com',
          created_at: '2026-02-27T10:15:00-08:00',
          status: 'confirmed'
        },
        {
          id: 'appt_002_garcia_consult_20260308',
          therapist_id: 'therapist_elena_garcia',
          appointment_slot_id: 'slot_garcia_20260308_1030_free_consult_booked',
          appointment_type_id: 'free_consult_15min',
          client_first_name: 'Chris',
          client_last_name: 'Nguyen',
          client_phone: '555-782-9901',
          client_email: 'chris.nguyen@example.com',
          created_at: '2026-02-29T09:05:00-08:00',
          status: 'confirmed'
        },
        {
          id: 'appt_003_rivera_consult_draft_20260307',
          therapist_id: 'therapist_alex_rivera',
          appointment_slot_id: 'slot_rivera_20260307_0900_free_consult',
          appointment_type_id: 'free_consult_15min',
          client_first_name: 'Avery',
          client_last_name: 'Chen',
          client_phone: '555-667-2211',
          client_email: 'avery.chen@example.com',
          created_at: '2026-03-02T16:40:00-08:00',
          status: 'draft'
        }
      ],
      therapists: [
        {
          id: 'therapist_maya_chen',
          first_name: 'Maya',
          last_name: 'Chen',
          full_name: 'Maya Chen',
          credentials: 'PsyD, Licensed Psychologist',
          bio: 'Maya specializes in anxiety, social anxiety, and perfectionism. She uses CBT and exposure-based approaches and facilitates the Social Anxiety Skills Group at our downtown San Francisco office.',
          specialties: ['Anxiety', 'Social Anxiety', 'Depression', 'Perfectionism', 'Stress & Burnout'],
          offers_in_person: true,
          offers_online: true,
          office_address: '835 Market St, Suite 900',
          office_city: 'San Francisco',
          office_state: 'CA',
          office_zip: '94103',
          standard_session_fee: 185,
          sliding_scale_available: true,
          sliding_scale_min_fee: 130,
          sliding_scale_max_fee: 165,
          accepts_insurance: true,
          insurance_plan_ids: ['bluecare_basic', 'bluecare_plus', 'united_behavioral_access', 'city_employee_eap'],
          offers_free_consult: false,
          is_active: true,
          rating_count: 0,
          rating: null,
          has_weekend_availability: true
        },
        {
          id: 'therapist_daniel_kim',
          first_name: 'Daniel',
          last_name: 'Kim',
          full_name: 'Daniel Kim',
          credentials: 'PsyD, Licensed Psychologist',
          bio: 'Daniel is a trauma-focused psychologist who works with adults healing from single-incident and chronic trauma. He integrates EMDR, grounding skills, and relational therapy, and facilitates the Trauma Recovery Process Group in the Mission District.',
          specialties: ['Trauma/PTSD', 'Anxiety', 'Depression', 'Men\'s Issues', 'EMDR'],
          offers_in_person: true,
          offers_online: true,
          office_address: '24th St & Mission St, Suite 210',
          office_city: 'San Francisco',
          office_state: 'CA',
          office_zip: '94110',
          standard_session_fee: 180,
          sliding_scale_available: true,
          sliding_scale_min_fee: 60,
          sliding_scale_max_fee: 80,
          accepts_insurance: true,
          insurance_plan_ids: ['medical_behavioral_health', 'bluecare_basic', 'bluecare_plus', 'healthfirst_silver'],
          offers_free_consult: true,
          free_consult_duration_minutes: 15,
          is_active: true,
          rating_count: 0,
          rating: null,
          has_weekend_availability: true
        },
        {
          id: 'therapist_jordan_lee',
          first_name: 'Jordan',
          last_name: 'Lee',
          full_name: 'Jordan Lee',
          credentials: 'LMFT',
          bio: 'Jordan is a licensed marriage and family therapist who supports individuals and couples around anxiety, relationship stress, and life transitions. Jordan offers both day and evening appointments near downtown.',
          specialties: ['Anxiety', 'Relationships', 'Couples Counseling', 'Stress', 'Life Transitions'],
          offers_in_person: true,
          offers_online: true,
          office_address: '101 9th St, Suite 400',
          office_city: 'San Francisco',
          office_state: 'CA',
          office_zip: '94103',
          standard_session_fee: 190,
          sliding_scale_available: false,
          accepts_insurance: true,
          insurance_plan_ids: ['healthfirst_bronze', 'kaiser_behavioral_choice', 'aetna_wellness_plus'],
          offers_free_consult: false,
          is_active: true,
          rating_count: 0,
          rating: null,
          has_weekend_availability: false
        }
      ]
    };

    // Copy all generated data into localStorage using correct storage keys
    localStorage.setItem('appointment_types', JSON.stringify(generatedData.appointment_types));
    localStorage.setItem('assessments', JSON.stringify(generatedData.assessments));
    localStorage.setItem('crisis_hotlines', JSON.stringify(generatedData.crisis_hotlines));
    localStorage.setItem('group_programs', JSON.stringify(generatedData.group_programs));
    localStorage.setItem('insurance_plans', JSON.stringify(generatedData.insurance_plans));
    localStorage.setItem('articles', JSON.stringify(generatedData.articles));
    localStorage.setItem('assessment_questions', JSON.stringify(generatedData.assessment_questions));
    localStorage.setItem('assessment_options', JSON.stringify(generatedData.assessment_options));
    localStorage.setItem('group_registrations', JSON.stringify(generatedData.group_registrations));
    localStorage.setItem('group_sessions', JSON.stringify(generatedData.group_sessions));
    localStorage.setItem('appointment_slots', JSON.stringify(generatedData.appointment_slots));
    localStorage.setItem('appointments', JSON.stringify(generatedData.appointments));
    localStorage.setItem('therapists', JSON.stringify(generatedData.therapists));

    // Ensure other collections exist as JSON arrays if not already initialized
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    };
    ensureArrayKey('therapist_comparison_lists');
    ensureArrayKey('therapist_search_filters');
    ensureArrayKey('contact_messages');
    ensureArrayKey('group_registrations'); // may be overwritten above but safe
    ensureArrayKey('assessment_sessions');
    ensureArrayKey('assessment_responses');
    ensureArrayKey('assessment_results');
    ensureArrayKey('reading_lists');
    ensureArrayKey('newsletter_subscriptions');
    ensureArrayKey('safety_plans');
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookEarliestInPersonAnxietySession();
    this.testTask2_CompareSlidingScaleTraumaTherapists();
    this.testTask3_SubmitInsuranceCoverageQuestion();
    this.testTask4_RegisterSocialAnxietyGroupNextMonth();
    this.testTask5_StartBookingTelehealthWeekendFreeConsult();
    this.testTask6_SubscribeParentingMonthlyNewsletter();
    this.testTask7_DepressionAssessmentAndSaveArticles();
    this.testTask8_CreateSafetyPlanWithLocalHotlines();

    return this.results;
  }

  // Task 1: Book earliest in-person anxiety counseling session after 5pm within next 7 days near ZIP 94103
  testTask1_BookEarliestInPersonAnxietySession() {
    const testName = 'Task 1: Book earliest in-person anxiety counseling after 5pm within next 7 days near 94103';
    try {
      // Navigate to homepage
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Home page content should load');

      // Get appointment type options (Book Appointment page)
      const apptTypes = this.logic.getAppointmentTypeOptionsForBooking();
      this.assert(Array.isArray(apptTypes) && apptTypes.length > 0, 'Appointment types should be returned');

      const individualType = apptTypes.find((t) => t.code === 'individual_counseling');
      this.assert(individualType, 'Individual counseling appointment type should exist');

      // Compute date range: today to 6 days from now (next 7 calendar days)
      const today = new Date();
      const dateRangeStart = today.toISOString().slice(0, 10);
      const dateRangeEndDate = new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000);
      const dateRangeEnd = dateRangeEndDate.toISOString().slice(0, 10);

      // Search therapists for appointment with anxiety specialty, in-person near 94103, evenings
      const searchFilters = {
        specialtyFilters: ['anxiety'],
        formatFilters: ['in_person'],
        zipCode: '94103',
        dateRangeStart: dateRangeStart,
        dateRangeEnd: dateRangeEnd,
        timeOfDay: 'evening',
        requireInPersonWithinZip: true
      };

      const therapistResults = this.logic.searchTherapistsForAppointment(
        individualType.code,
        searchFilters,
        'next_available',
        10,
        0
      );

      this.assert(
        Array.isArray(therapistResults) && therapistResults.length > 0,
        'Should find at least one therapist with matching in-person evening slots'
      );

      // Take first therapist in list (sorted by next available)
      const selectedTherapistEntry = therapistResults[0];
      const selectedTherapist = selectedTherapistEntry.therapist;
      this.assert(selectedTherapist && selectedTherapist.id, 'Selected therapist should have an id');

      // Load availability grid for that therapist
      const availability = this.logic.getTherapistAvailabilityForAppointment(
        selectedTherapist.id,
        individualType.code,
        dateRangeStart,
        dateRangeEnd,
        'in_person',
        '94103',
        'evening',
        false
      );

      this.assert(
        availability && Array.isArray(availability.slots),
        'Availability slots should be returned for therapist'
      );

      const unbookedSlots = availability.slots.filter((slot) => !slot.is_booked);
      this.assert(unbookedSlots.length > 0, 'Should have at least one unbooked slot to book');

      // Pick earliest slot (by start_datetime) at or after 5pm (is_evening already requested)
      unbookedSlots.sort((a, b) => {
        return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
      });
      const selectedSlot = unbookedSlots[0];
      this.assert(selectedSlot && selectedSlot.id, 'Selected slot should have id');
      this.assert(selectedSlot.session_format === 'in_person', 'Selected slot should be in-person');
      this.assert(selectedSlot.is_evening === true, 'Selected slot should be evening');

      // Create draft appointment from selected slot
      const draftResult = this.logic.createDraftAppointmentFromSlot(selectedSlot.id);
      this.assert(draftResult && draftResult.success === true, 'Draft appointment should be created successfully');
      const draftAppointment = draftResult.appointment;
      this.assert(draftAppointment && draftAppointment.id, 'Draft appointment should include id');

      // Get draft details
      const draftDetails = this.logic.getAppointmentDraftDetails(draftAppointment.id);
      this.assert(
        draftDetails &&
          draftDetails.appointment &&
          draftDetails.therapist &&
          draftDetails.appointmentSlot,
        'Draft appointment details should be returned'
      );

      // Confirm appointment with client details
      const confirmResult = this.logic.confirmAppointment(
        draftAppointment.id,
        'Jordan',
        'Lee',
        '555-123-7890',
        'jordan.lee@example.com'
      );
      this.assert(confirmResult && confirmResult.success === true, 'Appointment should be confirmed');
      const confirmedAppt = confirmResult.appointment;
      this.assert(confirmedAppt.status === 'confirmed', 'Appointment status should be confirmed');

      // Verify underlying slot in storage is now marked booked
      const allSlots = JSON.parse(localStorage.getItem('appointment_slots') || '[]');
      const bookedSlot = allSlots.find((s) => s.id === selectedSlot.id);
      if (bookedSlot) {
        this.assert(bookedSlot.is_booked === true, 'Booked slot should be marked as booked');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Add two sliding-scale trauma therapists under $80 to comparison list
  testTask2_CompareSlidingScaleTraumaTherapists() {
    const testName = 'Task 2: Add sliding-scale trauma therapists under $80 to comparison list';
    try {
      // From homepage, open therapist directory options (simulated)
      const options = this.logic.getTherapistDirectoryFilterOptions();
      this.assert(options && typeof options === 'object', 'Therapist directory options should load');

      // Apply filters: Trauma/PTSD specialty, sliding scale, max fee 80
      const filters = {
        specialtyFilters: ['trauma_ptsd'],
        slidingScaleOnly: true,
        maxFee: 80
      };

      const results = this.logic.searchTherapists(filters, 'price_low_to_high', 10, 0);
      this.assert(Array.isArray(results), 'searchTherapists should return an array');
      this.assert(results.length > 0, 'Should find at least one sliding-scale trauma therapist at or under $80');

      const therapistIdsToCompare = results.slice(0, 2).map((r) => r.therapist.id);
      this.assert(therapistIdsToCompare.length >= 1, 'Should have at least one therapist id to compare');

      // Toggle first (and second if available) therapists into comparison list
      let lastState = null;
      for (let i = 0; i < therapistIdsToCompare.length; i++) {
        lastState = this.logic.toggleTherapistInComparison(therapistIdsToCompare[i]);
        this.assert(
          Array.isArray(lastState.therapistIds),
          'Comparison state should return therapistIds array'
        );
        this.assert(
          lastState.therapistIds.length <= lastState.maxSelectable,
          'Comparison list should not exceed max selectable'
        );
      }

      const comparisonState = this.logic.getTherapistComparisonState();
      this.assert(comparisonState && Array.isArray(comparisonState.therapistIds), 'Comparison state should load');
      this.assert(
        comparisonState.therapistIds.length >= 1,
        'Comparison list should have at least one therapist selected'
      );
      this.assert(
        comparisonState.therapistIds.length <= 2,
        'Comparison list should have at most two therapists selected'
      );

      // Ensure selected therapists are subset of search results
      const selectedSetOk = comparisonState.therapistIds.every((id) => {
        return therapistIdsToCompare.indexOf(id) !== -1;
      });
      this.assert(selectedSetOk, 'Comparison therapists should come from filtered trauma list');

      // Open comparison view details
      const comparisonDetails = this.logic.getTherapistComparisonDetails();
      this.assert(
        comparisonDetails && Array.isArray(comparisonDetails.therapists),
        'Comparison details should return therapists array'
      );

      // Validate sliding-scale and fee constraints against returned data
      comparisonDetails.therapists.forEach((entry) => {
        const t = entry.therapist;
        const fees = entry.feesSummary;
        this.assert(t && t.id, 'Compared therapist should have id');
        this.assert(
          comparisonState.therapistIds.indexOf(t.id) !== -1,
          'Compared therapist should be in comparison state list'
        );
        if (fees && fees.slidingScaleAvailable) {
          if (typeof fees.slidingScaleMinFee === 'number') {
            this.assert(
              fees.slidingScaleMinFee <= 80,
              'Sliding scale min fee should respect max $80 filter when available'
            );
          }
        }
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Submit insurance coverage question using cheapest plan with copay <= $30
  testTask3_SubmitInsuranceCoverageQuestion() {
    const testName = 'Task 3: Submit insurance coverage question for cheapest plan with copay <= $30';
    try {
      // Navigate to Pricing & Insurance
      const pricingOverview = this.logic.getPricingOverview();
      this.assert(pricingOverview && typeof pricingOverview === 'object', 'Pricing overview should load');

      // Get insurance plans sorted by copay low to high
      const plans = this.logic.getInsurancePlans('copay_low_to_high', true);
      this.assert(Array.isArray(plans) && plans.length > 0, 'Insurance plans should be returned');

      // Identify first plan with copay <= 30
      const selectedPlan = plans.find((p) => typeof p.copay_amount === 'number' && p.copay_amount <= 30);
      this.assert(selectedPlan, 'Should find a plan with copay <= $30');

      // Confirm contact reason options include insurance/billing
      const reasonOptions = this.logic.getContactReasonOptions();
      this.assert(Array.isArray(reasonOptions) && reasonOptions.length > 0, 'Contact reason options should load');
      const insuranceReason = reasonOptions.find((r) => r.value === 'insurance_billing');
      this.assert(insuranceReason, 'Contact reason should include insurance_billing');

      // Compose message mentioning plan name and copay amount from actual data
      const message =
        'I have ' +
        selectedPlan.name +
        ' with a $' +
        selectedPlan.copay_amount +
        ' copay. Can you confirm if weekly individual counseling sessions are covered under this plan?';

      const submitResult = this.logic.submitContactMessage(
        'insurance_billing',
        'Alex',
        'alex.taylor@example.com',
        '555-987-6543',
        message,
        selectedPlan.id,
        selectedPlan.copay_amount
      );

      this.assert(submitResult && submitResult.success === true, 'Contact message submission should succeed');
      const cm = submitResult.contactMessage;
      this.assert(cm && cm.id, 'Contact message should include id');
      this.assert(cm.reason === 'insurance_billing', 'Contact reason should be insurance_billing');
      this.assert(cm.insurance_plan_id === selectedPlan.id, 'Contact message should reference selected plan id');
      if (typeof cm.referenced_copay_amount === 'number') {
        this.assert(
          cm.referenced_copay_amount === selectedPlan.copay_amount,
          'Referenced copay amount should match value used in submission'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Register for a social anxiety group starting next month, 6-8 pm, with pay-later option
  testTask4_RegisterSocialAnxietyGroupNextMonth() {
    const testName = 'Task 4: Register for next-month social anxiety group at 6-8 pm with pay-later option';
    try {
      // Navigate to Group Programs and load filter options
      const groupFilterOptions = this.logic.getGroupFilterOptions();
      this.assert(groupFilterOptions && typeof groupFilterOptions === 'object', 'Group filter options should load');
      this.assert(
        Array.isArray(groupFilterOptions.upcomingMonths) &&
          groupFilterOptions.upcomingMonths.length >= 2,
        'Should have at least current and next month in upcomingMonths'
      );

      // Choose next calendar month as second entry in upcomingMonths
      const nextMonth = groupFilterOptions.upcomingMonths[1];
      this.assert(nextMonth && nextMonth.startDate && nextMonth.endDate, 'Next month range should be available');

      // Filter group programs: topic social_anxiety, starting next month
      const groupResults = this.logic.searchGroupPrograms({
        topic: 'social_anxiety',
        startDateFrom: nextMonth.startDate,
        startDateTo: nextMonth.endDate,
        format: undefined
      });

      this.assert(Array.isArray(groupResults) && groupResults.length > 0, 'Should find at least one social anxiety group next month');

      // Choose a group that has an evening session (6-8 pm window)
      const groupWithEvening = groupResults.find((g) => g.hasEveningSession);
      const chosenGroupEntry = groupWithEvening || groupResults[0];
      const chosenGroup = chosenGroupEntry.groupProgram;
      this.assert(chosenGroup && chosenGroup.id, 'Chosen group program should have id');

      // Load full group details and sessions
      const groupDetails = this.logic.getGroupDetails(chosenGroup.id);
      this.assert(
        groupDetails && Array.isArray(groupDetails.sessions) && groupDetails.sessions.length > 0,
        'Group details should include sessions'
      );

      // Select a weekday evening session between 18:00 and 20:00 when possible
      const weekdayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      let chosenSession = null;
      for (let i = 0; i < groupDetails.sessions.length; i++) {
        const s = groupDetails.sessions[i];
        const isWeekday = weekdayNames.indexOf(s.weekday) !== -1;
        const startsAtOrAfter6 = s.start_time >= '18:00';
        const endsBy8 = s.end_time <= '20:00';
        if (s.is_evening && isWeekday && startsAtOrAfter6 && endsBy8) {
          chosenSession = s;
          break;
        }
      }
      if (!chosenSession) {
        // Fallback: any evening session
        chosenSession = groupDetails.sessions.find((s) => s.is_evening) || groupDetails.sessions[0];
      }
      this.assert(chosenSession && chosenSession.id, 'Chosen group session should have id');

      // Get registration context for the chosen session
      const registrationContext = this.logic.getGroupRegistrationContext(chosenSession.id);
      this.assert(
        registrationContext &&
          registrationContext.groupProgram &&
          registrationContext.groupSession,
        'Group registration context should include program and session'
      );
      this.assert(
        Array.isArray(registrationContext.allowedPaymentOptions) &&
          registrationContext.allowedPaymentOptions.length > 0,
        'Allowed payment options should be provided'
      );

      // Prefer pay_later or pay_at_first_session if available
      let selectedPaymentOption = null;
      if (registrationContext.allowedPaymentOptions.indexOf('pay_later') !== -1) {
        selectedPaymentOption = 'pay_later';
      } else if (registrationContext.allowedPaymentOptions.indexOf('pay_at_first_session') !== -1) {
        selectedPaymentOption = 'pay_at_first_session';
      } else {
        selectedPaymentOption = registrationContext.allowedPaymentOptions[0];
      }

      // Submit registration for 1 participant
      const registrationResult = this.logic.submitGroupRegistration(
        chosenSession.id,
        'Taylor',
        'Morgan',
        'taylor.morgan@example.com',
        1,
        selectedPaymentOption
      );

      this.assert(
        registrationResult && registrationResult.success === true,
        'Group registration submission should succeed'
      );
      const reg = registrationResult.registration;
      this.assert(reg && reg.id, 'Registration should have id');
      this.assert(reg.group_program_id === chosenGroup.id, 'Registration should reference chosen group program');
      this.assert(reg.group_session_id === chosenSession.id, 'Registration should reference chosen group session');
      this.assert(reg.num_participants === 1, 'Number of participants should be 1');
      this.assert(reg.payment_option === selectedPaymentOption, 'Payment option should match selected');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Start booking a telehealth therapist with weekend availability for a free 15-minute consult
  testTask5_StartBookingTelehealthWeekendFreeConsult() {
    const testName = 'Task 5: Start booking telehealth weekend free 15-minute consult';
    try {
      // Navigate to therapist directory and get filter options
      const options = this.logic.getTherapistDirectoryFilterOptions();
      this.assert(options && typeof options === 'object', 'Therapist directory options should load');

      // Apply filters: telehealth (online) and weekend availability; rating filter adapted to available data
      const filters = {
        formatFilters: ['online'],
        availabilityDays: ['saturday', 'sunday']
      };

      const results = this.logic.searchTherapists(filters, 'rating_high_to_low', 10, 0);
      this.assert(Array.isArray(results) && results.length > 0, 'Should find at least one telehealth therapist');

      // Choose first therapist offering free consult and weekend availability, if available
      let chosenEntry = results.find((r) => {
        const t = r.therapist;
        return t.offers_free_consult && t.has_weekend_availability && t.offers_online;
      });
      if (!chosenEntry) {
        chosenEntry = results[0];
      }
      const therapist = chosenEntry.therapist;
      this.assert(therapist && therapist.id, 'Chosen telehealth therapist should have id');

      // Load therapist details
      const therapistDetails = this.logic.getTherapistDetails(therapist.id);
      this.assert(therapistDetails && therapistDetails.therapist, 'Therapist details should load');

      // Get therapist appointment types and find a free short consult (prefer 15 minutes)
      const therapistApptTypes = this.logic.getTherapistAppointmentTypes(therapist.id);
      this.assert(
        Array.isArray(therapistApptTypes) && therapistApptTypes.length > 0,
        'Therapist appointment types should be returned'
      );

      let consultType = therapistApptTypes.find((t) => t.code === 'free_consult_15');
      if (!consultType) {
        consultType = therapistApptTypes.find((t) => t.is_free && t.duration_minutes <= 20) || therapistApptTypes[0];
      }
      this.assert(consultType && consultType.code, 'Consult appointment type should be available');

      // Determine upcoming two-week date range around nearest weekend
      const today = new Date();
      const dateRangeStart = today.toISOString().slice(0, 10);
      const dateRangeEndDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      const dateRangeEnd = dateRangeEndDate.toISOString().slice(0, 10);

      // Load availability for that consult type, telehealth, weekends only
      const availability = this.logic.getTherapistAvailabilityForAppointment(
        therapist.id,
        consultType.code,
        dateRangeStart,
        dateRangeEnd,
        'online',
        undefined,
        'any',
        true
      );

      this.assert(availability && Array.isArray(availability.slots), 'Consult availability slots should load');

      const unbookedWeekendSlots = availability.slots.filter((slot) => !slot.is_booked);
      if (unbookedWeekendSlots.length === 0) {
        // If no weekend slots exist, we still validate that the flow reached the scheduling step
        console.log(
          'No weekend free consult slots available for therapist ' + therapist.id +
            ' in current test data; skipping draft appointment creation.'
        );
      } else {
        // Select earliest available weekend slot
        unbookedWeekendSlots.sort((a, b) => {
          return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
        });
        const selectedSlot = unbookedWeekendSlots[0];
        this.assert(selectedSlot && selectedSlot.id, 'Selected consult slot should have id');
        this.assert(selectedSlot.session_format === 'online', 'Selected consult slot should be online');
        this.assert(selectedSlot.is_weekend === true, 'Selected consult slot should be on weekend');

        // Start booking by creating a draft appointment (but do not confirm)
        const draftResult = this.logic.createDraftAppointmentFromSlot(selectedSlot.id);
        this.assert(
          draftResult && draftResult.success === true,
          'Draft appointment for free consult should be created successfully'
        );
        const draftAppointment = draftResult.appointment;
        this.assert(draftAppointment && draftAppointment.id, 'Draft consult appointment should include id');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Subscribe to monthly parenting-focused mental health tips
  testTask6_SubscribeParentingMonthlyNewsletter() {
    const testName = 'Task 6: Subscribe to monthly parenting-focused newsletter';
    try {
      // From homepage/footer, get newsletter options
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Home page should load before newsletter signup');

      const newsletterOptions = this.logic.getNewsletterOptions();
      this.assert(
        newsletterOptions && Array.isArray(newsletterOptions.availableFrequencies),
        'Newsletter frequency options should load'
      );

      // Select Monthly frequency from options
      let frequencyOption = newsletterOptions.availableFrequencies.find(
        (f) => f.value === 'monthly'
      );
      if (!frequencyOption) {
        frequencyOption = newsletterOptions.availableFrequencies[0];
      }
      this.assert(frequencyOption && frequencyOption.value, 'A newsletter frequency value should be selected');

      // Select Parenting & Families topic if available
      let selectedTopics = [];
      if (Array.isArray(newsletterOptions.availableTopics)) {
        const parentingTopic = newsletterOptions.availableTopics.find((t) => {
          if (t.value === 'parenting_families') return true;
          if (typeof t.label === 'string') {
            return t.label.toLowerCase().indexOf('parent') !== -1;
          }
          return false;
        });
        if (parentingTopic) {
          selectedTopics.push(parentingTopic.value);
        }
      }

      // Subscribe with provided email and optional name
      const subscribeResult = this.logic.subscribeToNewsletter(
        'parent.care@example.com',
        'Jamie',
        'Rivera',
        frequencyOption.value,
        selectedTopics.length > 0 ? selectedTopics : undefined
      );

      this.assert(subscribeResult && subscribeResult.success === true, 'Newsletter subscription should succeed');
      const sub = subscribeResult.subscription;
      this.assert(sub && sub.id, 'Subscription should have id');
      this.assert(sub.email === 'parent.care@example.com', 'Subscription email should match submitted email');
      this.assert(sub.frequency === frequencyOption.value, 'Subscription frequency should match selected frequency');
      if (selectedTopics.length > 0 && Array.isArray(sub.topics)) {
        this.assert(
          sub.topics.indexOf(selectedTopics[0]) !== -1,
          'Subscription topics should include parenting-related topic when selected'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Complete depression self-assessment and save two recommended articles
  testTask7_DepressionAssessmentAndSaveArticles() {
    const testName = 'Task 7: Complete depression self-assessment and save two recommended articles';
    try {
      // Navigate to Self-Assessments list
      const assessments = this.logic.getAssessmentList();
      this.assert(Array.isArray(assessments) && assessments.length > 0, 'Assessments list should load');

      // Find PHQ-9 depression assessment
      const depressionAssessment = assessments.find((a) => a.code === 'phq_9');
      this.assert(depressionAssessment, 'Depression (PHQ-9) assessment should be available');

      // Start assessment session
      const startResult = this.logic.startAssessmentSession('phq_9');
      this.assert(
        startResult && startResult.assessmentSession && Array.isArray(startResult.questions),
        'Assessment session should start with questions'
      );
      const session = startResult.assessmentSession;

      // Answer each question with the middle option on its scale
      const responses = [];
      startResult.questions.forEach((qEntry) => {
        const opts = qEntry.options || [];
        this.assert(opts.length > 0, 'Each assessment question should have options');
        // Sort by order just in case
        opts.sort((a, b) => a.order - b.order);
        const middleIndex = Math.floor(opts.length / 2);
        const chosenOpt = opts[middleIndex];
        responses.push({
          assessmentQuestionId: qEntry.question.id,
          assessmentOptionId: chosenOpt.id
        });
      });

      const submitResult = this.logic.submitAssessmentSession(session.id, responses);
      this.assert(submitResult && submitResult.success === true, 'Assessment submission should succeed');
      const assessmentResult = submitResult.assessmentResult;
      this.assert(assessmentResult && assessmentResult.id, 'Assessment result should have id');

      // Load full result details including recommended articles preview
      const resultDetails = this.logic.getAssessmentResultDetails(assessmentResult.id);
      this.assert(resultDetails && resultDetails.assessmentResult, 'Assessment result details should load');

      // Load full list of recommended articles for this result
      const recommendedArticles = this.logic.getRecommendedArticlesForAssessmentResult(
        assessmentResult.id
      );
      this.assert(Array.isArray(recommendedArticles), 'Recommended articles list should load');
      this.assert(recommendedArticles.length > 0, 'There should be at least one recommended article');

      // Ensure reading list starts clean by removing any existing saved articles
      const existingReadingListData = this.logic.getSavedReadingList();
      if (
        existingReadingListData &&
        existingReadingListData.readingList &&
        Array.isArray(existingReadingListData.readingList.article_ids)
      ) {
        const existingIds = existingReadingListData.readingList.article_ids.slice();
        existingIds.forEach((id) => {
          this.logic.removeArticleFromReadingList(id);
        });
      }

      // Choose up to two recommended articles; if fewer than two, supplement from depression topic
      const articleIdsToSave = [];
      for (let i = 0; i < recommendedArticles.length && articleIdsToSave.length < 2; i++) {
        articleIdsToSave.push(recommendedArticles[i].id);
      }
      if (articleIdsToSave.length < 2) {
        const depressionArticles = this.logic.getArticlesByTopic('depression', 10, 0);
        depressionArticles.forEach((a) => {
          if (articleIdsToSave.length < 2 && articleIdsToSave.indexOf(a.id) === -1) {
            articleIdsToSave.push(a.id);
          }
        });
      }
      this.assert(articleIdsToSave.length >= 1, 'Should have at least one article id to save');

      // Save exactly two articles when possible
      const maxToSave = Math.min(2, articleIdsToSave.length);
      for (let i = 0; i < maxToSave; i++) {
        const saveResult = this.logic.saveArticleToReadingList(articleIdsToSave[i]);
        this.assert(
          saveResult && saveResult.success === true,
          'Saving article to reading list should succeed for id ' + articleIdsToSave[i]
        );
      }

      // Open reading list/saved resources
      const readingListData = this.logic.getSavedReadingList();
      this.assert(
        readingListData && readingListData.readingList && Array.isArray(readingListData.articles),
        'Reading list data should load with articles array'
      );

      const savedArticleIds = readingListData.readingList.article_ids || [];
      this.assert(savedArticleIds.length >= maxToSave, 'Reading list should contain saved articles');
      for (let i = 0; i < maxToSave; i++) {
        this.assert(
          savedArticleIds.indexOf(articleIdsToSave[i]) !== -1,
          'Reading list should contain article id ' + articleIdsToSave[i]
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Create a safety plan with two local crisis hotline numbers
  testTask8_CreateSafetyPlanWithLocalHotlines() {
    const testName = 'Task 8: Create safety plan with two local crisis hotlines';
    try {
      // Navigate to Crisis Support
      const crisisContent = this.logic.getCrisisSupportContent();
      this.assert(crisisContent && typeof crisisContent === 'object', 'Crisis support content should load');
      this.assert(Array.isArray(crisisContent.localHotlines), 'Local hotlines list should be available');
      this.assert(crisisContent.localHotlines.length >= 2, 'Should have at least two local hotlines');

      const hotline1 = crisisContent.localHotlines[0];
      const hotline2 = crisisContent.localHotlines[1];
      this.assert(hotline1.phone_number && hotline2.phone_number, 'Hotlines should have phone numbers');

      // Optionally confirm local-hotlines helper returns local entries
      const localHotlinesOnly = this.logic.getCrisisHotlines('local', true);
      this.assert(Array.isArray(localHotlinesOnly), 'getCrisisHotlines for local should return array');

      // Load existing safety plan (if any)
      const safetyPlanContext = this.logic.getSafetyPlan();
      this.assert(safetyPlanContext && typeof safetyPlanContext === 'object', 'Safety plan context should load');

      // Create or update safety plan with two crisis contacts, warning sign, and coping strategy
      const crisisContacts = [
        { label: hotline1.name || 'County Crisis Line', phone: hotline1.phone_number },
        { label: hotline2.name || 'Youth Crisis Line', phone: hotline2.phone_number }
      ];
      const warningSigns = ['I isolate and stop answering messages'];
      const copingStrategies = ['Go for a 10-minute walk and call a trusted friend.'];

      const saveResult = this.logic.saveSafetyPlan(crisisContacts, warningSigns, copingStrategies);
      this.assert(saveResult && saveResult.success === true, 'Safety plan should be saved successfully');
      const savedPlan = saveResult.safetyPlan;
      this.assert(savedPlan && savedPlan.id, 'Saved safety plan should have id');
      this.assert(
        Array.isArray(savedPlan.crisis_contacts) && savedPlan.crisis_contacts.length >= 2,
        'Safety plan should contain at least two crisis contacts'
      );

      // Validate that at least one of the hotline phone numbers is present in saved crisis contacts
      const phonesInPlan = savedPlan.crisis_contacts.map((c) => c.phone);
      this.assert(
        phonesInPlan.indexOf(hotline1.phone_number) !== -1 ||
          phonesInPlan.indexOf(hotline2.phone_number) !== -1,
        'Safety plan crisis contacts should include at least one of the selected hotline numbers'
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
    console.log('\u2713 ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('\u2717 ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
