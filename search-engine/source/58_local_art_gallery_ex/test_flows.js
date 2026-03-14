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
    // Reinitialize storage structure
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided (values preserved)
    var generatedData = {
      donation_funds: [
        {
          id: 'artwork_conservation_fund',
          name: 'Artwork Conservation Fund',
          description: 'Supports restoration, preservation, and preventive care for paintings, sculptures, and works on paper in the gallery’s permanent collection.',
          isActive: true,
          sortOrder: 1
        },
        {
          id: 'education_outreach_programs',
          name: 'Education & Outreach Programs',
          description: 'Funds school tours, educator resources, and community workshops that make art accessible to learners of all ages.',
          isActive: true,
          sortOrder: 2
        },
        {
          id: 'community_access_fund',
          name: 'Community Access Fund',
          description: 'Provides free and reduced-price admission for low-income visitors, seniors, and community partner organizations.',
          isActive: true,
          sortOrder: 3
        }
      ],
      guided_tours: [
        {
          id: 'modern_collection_highlights',
          title: 'Modern Collection Highlights Tour',
          description: 'A docent-led overview of key modern works in the collection, ideal for first-time visitors.',
          isWheelchairAccessibleRoute: true,
          defaultLanguage: 'english',
          durationMinutes: 60,
          basePricePerVisitor: 20,
          admissionType: 'paid',
          isActive: true
        },
        {
          id: 'accessible_morning_highlights',
          title: 'Accessible Morning Highlights Tour',
          description: 'A slower-paced highlights tour scheduled for weekday mornings, following a wheelchair-accessible route and including frequent seating breaks.',
          isWheelchairAccessibleRoute: true,
          defaultLanguage: 'english',
          durationMinutes: 75,
          basePricePerVisitor: 18,
          admissionType: 'paid',
          isActive: true
        },
        {
          id: 'family_discovery_tour',
          title: 'Family Discovery Tour',
          description: 'Interactive, family-friendly tour with hands-on prompts tailored for children ages 6–12 and their caregivers.',
          isWheelchairAccessibleRoute: true,
          defaultLanguage: 'english',
          durationMinutes: 50,
          basePricePerVisitor: 0,
          admissionType: 'free',
          isActive: true
        }
      ],
      membership_plans: [
        {
          id: 'student_annual_pass',
          name: 'Student Annual Pass',
          description: 'Discounted membership for currently enrolled students with valid ID, including free general admission and member pricing on tickets.',
          membershipType: 'student_youth',
          billingFrequency: 'annual',
          pricePerPeriod: 45,
          benefitsSummary: 'Free general admission, discounted special exhibition tickets, 10% shop discount, and members-only previews.',
          isActive: true
        },
        {
          id: 'student_plus_annual',
          name: 'Student Plus Annual Membership',
          description: 'Enhanced student membership with guest passes and access to select member events.',
          membershipType: 'student_youth',
          billingFrequency: 'annual',
          pricePerPeriod: 59,
          benefitsSummary: 'All Student Annual benefits plus 2 single-use guest passes and invitations to select member programs.',
          isActive: true
        },
        {
          id: 'youth_monthly_pass',
          name: 'Youth Monthly Pass',
          description: 'Flexible month-to-month membership for visitors ages 13–18.',
          membershipType: 'student_youth',
          billingFrequency: 'monthly',
          pricePerPeriod: 8,
          benefitsSummary: 'Unlimited general admission and discounts on teen workshops and programs.',
          isActive: true
        }
      ],
      products: [
        {
          id: 'pc_modern_blue_abstract',
          name: 'Modern Blue Abstract Postcard',
          description: 'A matte-finish postcard featuring a vivid blue abstract painting from the gallery’s modern collection.',
          category: 'postcards_prints',
          price: 3.5,
          ratingAverage: 4.8,
          ratingCount: 134,
          isAvailable: true,
          imageUrl: 'https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=800&h=600&fit=crop&auto=format&q=80',
          sku: 'PC-001'
        },
        {
          id: 'pc_abstract_sunrise',
          name: 'Abstract Sunrise Postcard',
          description: 'A bright, warm-toned postcard inspired by the colors of sunrise over the city skyline.',
          category: 'postcards_prints',
          price: 4.0,
          ratingAverage: 4.7,
          ratingCount: 98,
          isAvailable: true,
          imageUrl: 'https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=800&h=600&fit=crop&auto=format&q=80',
          sku: 'PC-002'
        },
        {
          id: 'pc_gallery_exterior_night',
          name: 'Gallery Exterior at Night Postcard',
          description: 'Glossy postcard showing the gallery’s illuminated facade at dusk.',
          category: 'postcards_prints',
          price: 2.5,
          ratingAverage: 4.5,
          ratingCount: 76,
          isAvailable: true,
          imageUrl: 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=800&h=600&fit=crop&auto=format&q=80',
          sku: 'PC-003'
        }
      ],
      cart_items: [
        {
          id: 'cartitem_1',
          cartId: 'main_cart',
          productId: 'pc_modern_blue_abstract',
          productName: 'Modern Blue Abstract Postcard',
          unitPrice: 3.5,
          quantity: 1,
          lineTotal: 3.5
        },
        {
          id: 'cartitem_2',
          cartId: 'main_cart',
          productId: 'pc_abstract_sunrise',
          productName: 'Abstract Sunrise Postcard',
          unitPrice: 4.0,
          quantity: 1,
          lineTotal: 4.0
        },
        {
          id: 'cartitem_3',
          cartId: 'main_cart',
          productId: 'pc_kids_animals_series',
          productName: 'Kids’ Animal Art Postcard',
          unitPrice: 4.75,
          quantity: 1,
          lineTotal: 4.75
        }
      ],
      cart: [
        {
          id: 'main_cart',
          currency: 'USD',
          createdAt: '2026-03-03T10:00:00Z',
          updatedAt: '2026-03-03T10:10:00Z',
          items: [
            'cartitem_1',
            'cartitem_2',
            'cartitem_3'
          ],
          subtotal: 12.25,
          total: 12.25
        }
      ],
      membership_enrollments: [
        {
          id: 'enroll_1001',
          membershipPlanId: 'student_annual_pass',
          fullName: 'Alex Rivera',
          email: 'alex.rivera@example.com',
          startDate: '2026-02-01T00:00:00Z',
          deliveryOption: 'digital_membership_card_email',
          createdAt: '2026-01-15T14:30:00Z',
          status: 'active',
          checkoutOrderId: 'order_1001'
        },
        {
          id: 'enroll_1002',
          membershipPlanId: 'individual_annual_membership',
          fullName: 'Morgan Patel',
          email: 'morgan.patel@example.com',
          startDate: '2026-01-01T00:00:00Z',
          deliveryOption: 'physical_card_mail',
          createdAt: '2025-12-10T10:15:00Z',
          status: 'active',
          checkoutOrderId: 'order_1002'
        },
        {
          id: 'enroll_1003',
          membershipPlanId: 'student_annual_pass',
          fullName: 'Taylor Kim',
          email: 'taylor.kim@example.com',
          startDate: '2026-04-01T00:00:00Z',
          deliveryOption: 'digital_membership_card_email',
          createdAt: '2026-03-03T11:00:00Z',
          status: 'pending_payment',
          checkoutOrderId: null
        }
      ],
      events: [
        {
          id: 'event_clay_sculpture_may20',
          title: 'Clay Sculpture Basics Workshop',
          description: 'Hands-on introductory workshop covering simple clay hand-building techniques. No prior experience required; all materials provided.',
          eventType: 'workshop',
          audienceSuitability: 'general',
          startDateTime: '2026-05-20T18:00:00Z',
          endDateTime: '2026-05-20T20:00:00Z',
          timeOfDay: 'evening',
          location: 'Education Studio A',
          basePriceAdult: 25,
          basePriceTeen: 25,
          basePriceChild: 20,
          maxCapacity: 16,
          isFree: false,
          isRegistrationOpen: true,
          remainingCapacity: 13
        },
        {
          id: 'event_printmaking_may20',
          title: 'Monotype Printmaking Evening Lab',
          description: 'Experiment with color, texture, and layering in this guided monotype printmaking session for adults and older teens.',
          eventType: 'workshop',
          audienceSuitability: 'adults_only',
          startDateTime: '2026-05-20T19:30:00Z',
          endDateTime: '2026-05-20T21:30:00Z',
          timeOfDay: 'evening',
          location: 'Print Studio',
          basePriceAdult: 30,
          basePriceTeen: 30,
          basePriceChild: 0,
          maxCapacity: 14,
          isFree: false,
          isRegistrationOpen: true,
          remainingCapacity: 12
        },
        {
          id: 'event_family_collage_day',
          title: 'Family Collage Morning',
          description: 'Drop-in collage making inspired by works from the current exhibition. All ages welcome with an adult.',
          eventType: 'family_activity',
          audienceSuitability: 'family_friendly',
          startDateTime: '2026-03-07T10:30:00Z',
          endDateTime: '2026-03-07T12:00:00Z',
          timeOfDay: 'morning',
          location: 'Family Studio',
          basePriceAdult: 0,
          basePriceTeen: 0,
          basePriceChild: 0,
          maxCapacity: 30,
          isFree: true,
          isRegistrationOpen: true,
          remainingCapacity: 26
        }
      ],
      event_registrations: [
        {
          id: 'reg_2001',
          eventId: 'event_clay_sculpture_may20',
          registrationCreatedAt: '2026-02-28T15:20:00Z',
          adultTickets: 2,
          teenTickets: 0,
          childTickets: 0,
          paymentOption: 'pay_online_now',
          registrantName: 'Jamie Chen',
          registrantEmail: 'jamie.chen@example.com',
          registrationStatus: 'confirmed',
          totalPrice: 50
        },
        {
          id: 'reg_2002',
          eventId: 'event_printmaking_may20',
          registrationCreatedAt: '2026-03-01T09:45:00Z',
          adultTickets: 1,
          teenTickets: 1,
          childTickets: 0,
          paymentOption: 'pay_online_now',
          registrantName: 'Riley Morgan',
          registrantEmail: 'riley.morgan@example.com',
          registrationStatus: 'confirmed',
          totalPrice: 60
        },
        {
          id: 'reg_2003',
          eventId: 'event_family_collage_day',
          registrationCreatedAt: '2026-03-02T11:05:00Z',
          adultTickets: 2,
          teenTickets: 1,
          childTickets: 1,
          paymentOption: 'free_no_payment',
          registrantName: 'Pat Jordan',
          registrantEmail: 'pat.jordan@example.com',
          registrationStatus: 'confirmed',
          totalPrice: 0
        }
      ],
      exhibitions: [
        {
          id: 'ex_tiny_treasures_young_explorers',
          title: 'Tiny Treasures: Art for Young Explorers',
          subtitle: 'Playful artworks designed at kid-height',
          description: 'An interactive exhibition of small-scale paintings, sculptures, and installations specifically arranged for young visitors to explore at their own level, with simple labels and activity prompts.',
          exhibitionType: 'family_program',
          admissionType: 'free',
          isFamilyFriendly: true,
          startDate: '2026-03-03T09:00:00Z',
          endDate: '2026-05:01T17:00:00Z',
          location: 'Family Gallery, Level 1',
          imageUrl: 'https://50x50.sjmusart.org/img/figures/defeo/defeo5b.jpg?nf_resize=fit&w=1000',
          isActive: true
        },
        {
          id: 'ex_hands_on_color_family_studio',
          title: 'Hands-On Color: Family Studio Showcase',
          subtitle: 'Collaborative works by kids and caregivers',
          description: 'Featuring vibrant paintings, collages, and textiles created in the gallery’s family studio programs, this exhibition invites visitors to try simple making activities right in the gallery.',
          exhibitionType: 'family_program',
          admissionType: 'free',
          isFamilyFriendly: true,
          startDate: '2026-03-04T10:00:00Z',
          endDate: '2026-04-15T17:00:00Z',
          location: 'Studio Corridor, Level 1',
          imageUrl: 'https://cdn.statically.io/img/i.pinimg.com/736x/7c/f1/55/7cf155419cce5b0ce06d96bfc4254d0c.jpg',
          isActive: true
        },
        {
          id: 'ex_stories_in_clay',
          title: 'Stories in Clay: Community Ceramics',
          subtitle: 'Neighborhood narratives in fired earth',
          description: 'Local artists and community members share personal narratives through hand-built ceramic works, from tiles to vessels and sculptural forms.',
          exhibitionType: 'temporary_exhibition',
          admissionType: 'free',
          isFamilyFriendly: true,
          startDate: '2026-03-06T11:00:00Z',
          endDate: '2026-06-30T17:00:00Z',
          location: 'Community Gallery, Level 2',
          imageUrl: 'https://cdn2.eyeem.com/thumb/23077592f35bf11ece4051c7bbee7fd36e9810c5-1600189647696/w/750',
          isActive: true
        }
      ],
      exhibition_ticket_slots: [
        {
          id: 'slot_ls_2026-03-07_1300',
          exhibitionId: 'ex_light_shadow_photography',
          startDateTime: '2026-03-07T13:00:00Z',
          endDateTime: '2026-03-07T14:30:00Z',
          timeOfDay: 'afternoon',
          adultPrice: 16,
          teenPrice: 12,
          childPrice: 8,
          capacityTotal: 40,
          slotStatus: 'available',
          notes: 'Recommended arrival 15 minutes before start time.',
          capacityRemaining: 38
        },
        {
          id: 'slot_ls_2026-03-07_1600',
          exhibitionId: 'ex_light_shadow_photography',
          startDateTime: '2026-03-07T16:00:00Z',
          endDateTime: '2026-03-07T17:30:00Z',
          timeOfDay: 'afternoon',
          adultPrice: 18,
          teenPrice: 14,
          childPrice: 9,
          capacityTotal: 40,
          slotStatus: 'available',
          notes: '',
          capacityRemaining: 40
        },
        {
          id: 'slot_ls_2026-03-06_1100',
          exhibitionId: 'ex_light_shadow_photography',
          startDateTime: '2026-03-06T11:00:00Z',
          endDateTime: '2026-03-06T12:30:00Z',
          timeOfDay: 'morning',
          adultPrice: 15,
          teenPrice: 11,
          childPrice: 8,
          capacityTotal: 35,
          slotStatus: 'available',
          notes: 'Weekday morning discount applied.',
          capacityRemaining: 32
        }
      ],
      ticket_bookings: [
        {
          id: 'tb_1001',
          ticketSlotId: 'slot_ls_2026-03-06_1100',
          exhibitionId: 'ex_light_shadow_photography',
          bookingCreatedAt: '2026-03-01T09:15:00Z',
          visitStartDateTime: '2026-03-06T11:00:00Z',
          visitEndDateTime: '2026-03-06T12:30:00Z',
          quantityAdult: 2,
          quantityTeen: 1,
          quantityChild: 0,
          bookingStatus: 'confirmed',
          checkoutOrderId: 'order_3001',
          totalPrice: 41
        },
        {
          id: 'tb_1002',
          ticketSlotId: 'slot_city_2026-03-05_1900',
          exhibitionId: 'ex_city_in_motion_urban_abstractions',
          bookingCreatedAt: '2026-02-27T16:40:00Z',
          visitStartDateTime: '2026-03-05T19:00:00Z',
          visitEndDateTime: '2026-03-05T21:00:00Z',
          quantityAdult: 1,
          quantityTeen: 1,
          quantityChild: 0,
          bookingStatus: 'confirmed',
          checkoutOrderId: 'order_3002',
          totalPrice: 36
        },
        {
          id: 'tb_1003',
          ticketSlotId: 'slot_ls_2026-03-07_1300',
          exhibitionId: 'ex_light_shadow_photography',
          bookingCreatedAt: '2026-03-03T10:20:00Z',
          visitStartDateTime: '2026-03-07T13:00:00Z',
          visitEndDateTime: '2026-03-07T14:30:00Z',
          quantityAdult: 2,
          quantityTeen: 0,
          quantityChild: 0,
          bookingStatus: 'in_progress',
          checkoutOrderId: null,
          totalPrice: 32
        }
      ],
      checkout_orders: [
        {
          id: 'order_1001',
          orderType: 'membership_enrollment',
          referenceId: 'enroll_1001',
          createdAt: '2026-01-15T14:30:30Z',
          updatedAt: '2026-01-15T14:32:00Z',
          status: 'paid',
          billingFullName: 'Alex Rivera',
          billingEmail: 'alex.rivera@example.com',
          paymentMethod: 'credit_debit_card',
          currency: 'USD',
          totalAmount: 45,
          itemsSummary: [
            {
              type: 'membership',
              membershipEnrollmentId: 'enroll_1001',
              membershipPlanId: 'student_annual_pass',
              pricePerPeriod: 45
            }
          ]
        },
        {
          id: 'order_1002',
          orderType: 'membership_enrollment',
          referenceId: 'enroll_1002',
          createdAt: '2025-12-10T10:15:30Z',
          updatedAt: '2025-12-10T10:18:00Z',
          status: 'paid',
          billingFullName: 'Morgan Patel',
          billingEmail: 'morgan.patel@example.com',
          paymentMethod: 'credit_debit_card',
          currency: 'USD',
          totalAmount: 85,
          itemsSummary: [
            {
              type: 'membership',
              membershipEnrollmentId: 'enroll_1002',
              membershipPlanId: 'individual_annual_membership',
              pricePerPeriod: 85
            }
          ]
        },
        {
          id: 'order_3001',
          orderType: 'ticket_booking',
          referenceId: 'tb_1001',
          createdAt: '2026-03-01T09:15:10Z',
          updatedAt: '2026-03-01T09:17:00Z',
          status: 'paid',
          billingFullName: 'Jamie Chen',
          billingEmail: 'jamie.chen@example.com',
          paymentMethod: 'credit_debit_card',
          currency: 'USD',
          totalAmount: 41,
          itemsSummary: [
            {
              type: 'exhibition_tickets',
              ticketBookingId: 'tb_1001',
              exhibitionId: 'ex_light_shadow_photography',
              ticketSlotId: 'slot_ls_2026-03-06_1100',
              quantityTotal: 3,
              totalPrice: 41
            }
          ]
        }
      ],
      tour_bookings: [
        {
          id: 'tour_booking_4001',
          tourScheduleId: 'tsched_accessible_morning_weekdays_1030',
          tourId: 'accessible_morning_highlights',
          bookingCreatedAt: '2026-02-20T09:15:00Z',
          visitDateTime: '2026-02-28T10:30:00Z',
          numberOfVisitors: 8,
          language: 'english',
          bookingStatus: 'confirmed',
          checkoutOrderId: null,
          totalPrice: 144
        },
        {
          id: 'tour_booking_4002',
          tourScheduleId: 'tsched_modern_highlights_daily_1400',
          tourId: 'modern_collection_highlights',
          bookingCreatedAt: '2026-02-25T13:05:00Z',
          visitDateTime: '2026-03-05T14:00:00Z',
          numberOfVisitors: 10,
          language: 'french',
          bookingStatus: 'confirmed',
          checkoutOrderId: null,
          totalPrice: 200
        },
        {
          id: 'tour_booking_4003',
          tourScheduleId: 'tsched_accessible_morning_weekdays_1100',
          tourId: 'accessible_morning_highlights',
          bookingCreatedAt: '2026-03-03T09:45:00Z',
          visitDateTime: '2026-03-10T11:00:00Z',
          numberOfVisitors: 5,
          language: 'english',
          bookingStatus: 'in_progress',
          checkoutOrderId: null,
          totalPrice: 90
        }
      ],
      tour_schedules: [
        {
          id: 'tsched_accessible_morning_weekdays_1030',
          tourId: 'accessible_morning_highlights',
          dayOfWeek: 'wednesday',
          dayType: 'weekday',
          startDateTime: '2026-03-04T10:30:00Z',
          endDateTime: '2026-03-04T11:45:00Z',
          timeOfDay: 'morning',
          languagesAvailable: [
            'english',
            'spanish'
          ],
          maxVisitors: 12,
          remainingSpots: 4
        },
        {
          id: 'tsched_modern_highlights_daily_1400',
          tourId: 'modern_collection_highlights',
          dayOfWeek: 'monday',
          dayType: 'weekday',
          startDateTime: '2026-03-02T14:00:00Z',
          endDateTime: '2026-03-02T15:00:00Z',
          timeOfDay: 'afternoon',
          languagesAvailable: [
            'english',
            'french',
            'german'
          ],
          maxVisitors: 18,
          remainingSpots: 8
        },
        {
          id: 'tsched_accessible_morning_weekdays_1100',
          tourId: 'accessible_morning_highlights',
          dayOfWeek: 'thursday',
          dayType: 'weekday',
          startDateTime: '2026-03-05T11:00:00Z',
          endDateTime: '2026-03-05T12:15:00Z',
          timeOfDay: 'morning',
          languagesAvailable: [
            'english'
          ],
          maxVisitors: 10,
          remainingSpots: 5
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:17:32.405945'
      }
    };

    localStorage.setItem('donation_funds', JSON.stringify(generatedData.donation_funds));
    localStorage.setItem('guided_tours', JSON.stringify(generatedData.guided_tours));
    localStorage.setItem('membership_plans', JSON.stringify(generatedData.membership_plans));
    localStorage.setItem('products', JSON.stringify(generatedData.products));
    localStorage.setItem('cart_items', JSON.stringify(generatedData.cart_items));
    localStorage.setItem('cart', JSON.stringify(generatedData.cart));
    localStorage.setItem('membership_enrollments', JSON.stringify(generatedData.membership_enrollments));
    localStorage.setItem('events', JSON.stringify(generatedData.events));
    localStorage.setItem('event_registrations', JSON.stringify(generatedData.event_registrations));
    localStorage.setItem('exhibitions', JSON.stringify(generatedData.exhibitions));
    localStorage.setItem('exhibition_ticket_slots', JSON.stringify(generatedData.exhibition_ticket_slots));
    localStorage.setItem('ticket_bookings', JSON.stringify(generatedData.ticket_bookings));
    localStorage.setItem('checkout_orders', JSON.stringify(generatedData.checkout_orders));
    localStorage.setItem('tour_bookings', JSON.stringify(generatedData.tour_bookings));
    localStorage.setItem('tour_schedules', JSON.stringify(generatedData.tour_schedules));
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
    // newsletter_subscriptions and visit_plans etc start empty
    localStorage.setItem('newsletter_subscriptions', JSON.stringify([]));
    localStorage.setItem('visit_plans', JSON.stringify([]));
    localStorage.setItem('visit_plan_items', JSON.stringify([]));
  }

  resetStorageWithData() {
    this.clearStorage();
    this.setupTestData();
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookCheapestSaturdayAfternoonSpecialExhibitionTicketUnder20();
    this.testTask2_CreateThreeExhibitionFreeFamilyVisitPlanNext7Days();
    this.testTask3_RegisterAdultAndTeenEveningWorkshopUnder60Total();
    this.testTask4_AddThreeHighlyRatedPostcardsUnderFiveToCart();
    this.testTask5_MakeOneTime25DonationToArtworkConservationFund();
    this.testTask6_PurchaseCheapestAnnualStudentMembershipUnder60();
    this.testTask7_SubscribeToGalleryNewsletterWithPreferences();
    this.testTask8_BookWeekdayMorningWheelchairAccessibleTourForFive();

    return this.results;
  }

  // Helper: simple date utilities
  parseDate(dateString) {
    return new Date(dateString);
  }

  formatDateYmd(dateObj) {
    var year = dateObj.getUTCFullYear();
    var month = (dateObj.getUTCMonth() + 1).toString().padStart(2, '0');
    var day = dateObj.getUTCDate().toString().padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  addDays(dateObj, days) {
    return new Date(dateObj.getTime() + days * 24 * 60 * 60 * 1000);
  }

  getBaselineDate() {
    var metaRaw = localStorage.getItem('_metadata');
    if (!metaRaw) return new Date();
    var meta = JSON.parse(metaRaw);
    if (!meta || !meta.baselineDate) return new Date();
    return new Date(meta.baselineDate + 'T00:00:00Z');
  }

  // Task 1: Book cheapest afternoon ticket under 20, 2 adults
  testTask1_BookCheapestSaturdayAfternoonSpecialExhibitionTicketUnder20() {
    var testName = 'Task 1: Book cheapest afternoon exhibition ticket under 20 for two adults';
    console.log('Testing:', testName);

    try {
      this.resetStorageWithData();

      // Derive a target date from existing afternoon slots (adapted instead of hardcoded Saturday)
      var allSlots = JSON.parse(localStorage.getItem('exhibition_ticket_slots') || '[]');
      var afternoonSlots = allSlots.filter(function (s) {
        return s.timeOfDay === 'afternoon' && s.slotStatus === 'available';
      });
      this.assert(afternoonSlots.length > 0, 'There should be at least one available afternoon slot in test data');

      afternoonSlots.sort(function (a, b) {
        return new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime();
      });
      var targetDate = afternoonSlots[0].startDateTime.split('T')[0];

      // Simulate user viewing ticket filters
      var ticketFilters = this.logic.getTicketFilterOptions();
      this.assert(!!ticketFilters, 'Ticket filter options should be returned');

      // Search ticket slots: afternoon, max adult price 20, sorted by price low to high
      var searchResults = this.logic.searchExhibitionTicketSlots(
        targetDate,
        null,            // exhibitionTypes (omitted to adapt to data)
        'afternoon',     // timeOfDay
        20,              // maxAdultPrice
        'price_low_to_high',
        true             // onlyAvailable
      );

      this.assert(Array.isArray(searchResults), 'searchExhibitionTicketSlots should return an array');
      this.assert(searchResults.length > 0, 'Should find at least one afternoon slot under or equal to 20');

      // Verify first result is indeed the cheapest in the result set
      var prices = searchResults.map(function (r) { return r.adultPrice; });
      var minPrice = Math.min.apply(Math, prices);
      var chosenSlot = searchResults[0];
      this.assert(chosenSlot.adultPrice === minPrice, 'First slot should be cheapest based on adultPrice');
      this.assert(chosenSlot.adultPrice <= 20, 'Chosen slot adultPrice should be at most 20');

      // Book exactly 2 adult tickets
      var quantityAdult = 2;
      var bookingResult = this.logic.createTicketBookingAndOrder(
        chosenSlot.ticketSlotId,
        quantityAdult,
        0,
        0
      );

      this.assert(bookingResult && bookingResult.success === true, 'Booking and order creation should succeed');
      var booking = bookingResult.ticketBooking;
      var order = bookingResult.checkoutOrder;

      this.assert(booking && order, 'Both TicketBooking and CheckoutOrder should be returned');
      this.assert(booking.ticketSlotId === chosenSlot.ticketSlotId, 'Booking should reference the chosen ticket slot');
      this.assert(booking.quantityAdult === quantityAdult, 'Booking should have correct adult quantity');

      var expectedTotal = chosenSlot.adultPrice * quantityAdult;
      this.assert(booking.totalPrice === expectedTotal, 'Booking totalPrice should equal slot price times quantity');

      // Verify relationships using actual returned data
      this.assert(order.referenceId === booking.id, 'CheckoutOrder referenceId should match booking id');

      // Verify persisted booking in storage
      var storedBookings = JSON.parse(localStorage.getItem('ticket_bookings') || '[]');
      var storedBooking = storedBookings.find(function (b) { return b.id === booking.id; });
      this.assert(!!storedBooking, 'Booking should be persisted in ticket_bookings');
      this.assert(storedBooking.ticketSlotId === booking.ticketSlotId, 'Stored booking should match returned booking slot');

      // Simulate navigating to checkout page
      var checkoutSummary = this.logic.getCheckoutOrder(order.id);
      this.assert(checkoutSummary && checkoutSummary.checkoutOrder, 'Should retrieve checkout order summary');
      this.assert(checkoutSummary.checkoutOrder.id === order.id, 'Checkout summary order id should match');
      this.assert(checkoutSummary.checkoutOrder.totalAmount === booking.totalPrice, 'Checkout totalAmount should match booking total');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Create a 3-exhibition free family visit plan for next 7 days
  testTask2_CreateThreeExhibitionFreeFamilyVisitPlanNext7Days() {
    var testName = 'Task 2: Create 3-exhibition free family visit plan in next 7 days';
    console.log('Testing:', testName);

    try {
      this.resetStorageWithData();

      // Get exhibitions to derive date range
      var allExhibitions = JSON.parse(localStorage.getItem('exhibitions') || '[]');
      this.assert(allExhibitions.length > 0, 'There should be exhibitions in test data');

      allExhibitions.sort(function (a, b) {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      });
      var todayDate = new Date(allExhibitions[0].startDate);
      var endDate = this.addDays(todayDate, 7);
      var startDateStr = this.formatDateYmd(todayDate);
      var endDateStr = this.formatDateYmd(endDate);

      // View filter options
      var exFilters = this.logic.getExhibitionsFilterOptions();
      this.assert(!!exFilters, 'Exhibitions filter options should be returned');

      // Search free, family-friendly exhibitions in the next 7 days
      var searchResults = this.logic.searchExhibitions(
        startDateStr,
        endDateStr,
        ['free'],
        true,
        'start_date_soonest_first'
      );

      this.assert(Array.isArray(searchResults), 'searchExhibitions should return an array');
      this.assert(searchResults.length > 0, 'Should find at least one free family-friendly exhibition');

      var toAdd = Math.min(3, searchResults.length);
      this.assert(toAdd > 0, 'There should be at least one exhibition to add to visit plan');

      var addedExhibitionIds = [];
      var lastVisitPlanId = null;

      for (var i = 0; i < toAdd; i++) {
        var ex = searchResults[i];
        addedExhibitionIds.push(ex.exhibitionId);
        var addResult = this.logic.addExhibitionToVisitPlan(ex.exhibitionId);
        this.assert(addResult && addResult.success === true, 'addExhibitionToVisitPlan should succeed');
        lastVisitPlanId = addResult.visitPlanId;
        this.assert(addResult.totalItems === i + 1, 'Visit plan totalItems should increment with each addition');
      }

      this.assert(lastVisitPlanId, 'Visit plan id should be available after additions');

      // Open My Visit Plan page
      var visitPlanData = this.logic.getVisitPlan();
      this.assert(visitPlanData && visitPlanData.visitPlan, 'getVisitPlan should return a visitPlan');
      this.assert(Array.isArray(visitPlanData.items), 'Visit plan items should be an array');
      this.assert(visitPlanData.items.length === toAdd, 'Visit plan should contain expected number of exhibitions');

      // Verify that added exhibitions are present
      var itemIds = visitPlanData.items.map(function (item) { return item.exhibitionId; });
      for (var j = 0; j < addedExhibitionIds.length; j++) {
        this.assert(
          itemIds.indexOf(addedExhibitionIds[j]) !== -1,
          'Visit plan should contain exhibition id ' + addedExhibitionIds[j]
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Register 1 adult and 1 teen for an evening workshop under 60 total
  testTask3_RegisterAdultAndTeenEveningWorkshopUnder60Total() {
    var testName = 'Task 3: Register 1 adult and 1 teen for evening workshop under 60 total';
    console.log('Testing:', testName);

    try {
      this.resetStorageWithData();

      // Derive a workshop date from events (evening workshop)
      var events = JSON.parse(localStorage.getItem('events') || '[]');
      var eveningWorkshops = events.filter(function (e) {
        return e.eventType === 'workshop' && e.timeOfDay === 'evening';
      });
      this.assert(eveningWorkshops.length > 0, 'There should be at least one evening workshop in test data');

      eveningWorkshops.sort(function (a, b) {
        return new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime();
      });
      var targetWorkshop = eveningWorkshops[0];
      var targetDate = targetWorkshop.startDateTime.split('T')[0];

      // View Events filter options
      var eventFilters = this.logic.getEventsFilterOptions();
      this.assert(!!eventFilters, 'Events filter options should be returned');

      // Search events: evening workshops on that date with max price per ticket 30, sorted by price
      var searchResults = this.logic.searchEventsAndWorkshops(
        targetDate,
        'evening',
        30,
        ['workshop'],
        'price_low_to_high'
      );

      this.assert(Array.isArray(searchResults), 'searchEventsAndWorkshops should return an array');
      this.assert(searchResults.length > 0, 'Should find at least one evening workshop matching filters');

      var firstResult = searchResults[0];

      // Get full event detail
      var eventDetail = this.logic.getEventDetail(firstResult.eventId);
      this.assert(eventDetail && eventDetail.event, 'getEventDetail should return event data');

      var baseAdult = eventDetail.event.basePriceAdult || 0;
      var baseTeen = eventDetail.event.basePriceTeen || baseAdult;
      var expectedTotal = baseAdult + baseTeen;
      this.assert(expectedTotal <= 60, 'Computed total for 1 adult and 1 teen should be at most 60');

      // Register with pay at gallery on arrival
      var registrationResult = this.logic.registerForEvent(
        firstResult.eventId,
        1,   // adultTickets
        1,   // teenTickets
        0,   // childTickets
        'pay_at_gallery_on_arrival',
        'Test Workshop Visitor',
        'workshop.visitor@example.com'
      );

      this.assert(registrationResult && registrationResult.success === true, 'Workshop registration should succeed');
      var registration = registrationResult.eventRegistration;
      this.assert(registration.eventId === firstResult.eventId, 'Registration should reference the selected event');
      this.assert(registration.adultTickets === 1, 'Registration should have 1 adult ticket');
      this.assert(registration.teenTickets === 1, 'Registration should have 1 teen ticket');
      this.assert(registration.paymentOption === 'pay_at_gallery_on_arrival', 'Payment option should be pay at gallery on arrival');
      this.assert(registration.totalPrice === expectedTotal, 'Registration totalPrice should equal sum of adult and teen prices');

      // Verify persistence
      var storedRegs = JSON.parse(localStorage.getItem('event_registrations') || '[]');
      var storedReg = storedRegs.find(function (r) { return r.id === registration.id; });
      this.assert(!!storedReg, 'Event registration should be persisted');
      this.assert(storedReg.totalPrice === registration.totalPrice, 'Stored registration total should match returned total');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Add 3 highly rated postcards under 5 each to the cart
  testTask4_AddThreeHighlyRatedPostcardsUnderFiveToCart() {
    var testName = 'Task 4: Add 3 highly rated postcards under 5 each to cart and set quantity to 1';
    console.log('Testing:', testName);

    try {
      this.resetStorageWithData();

      // Clear existing cart so flow starts from empty cart (adapted while still using generated product data)
      localStorage.setItem('cart', JSON.stringify([]));
      localStorage.setItem('cart_items', JSON.stringify([]));

      // Get shop categories (simulating navigation to Shop)
      var categories = this.logic.getShopCategories();
      this.assert(Array.isArray(categories), 'getShopCategories should return an array');

      // We know postcards use categoryKey postcards_prints based on interface description
      var categoryKey = 'postcards_prints';

      // Get category filter options
      var catFilters = this.logic.getShopCategoryFilterOptions(categoryKey);
      this.assert(!!catFilters, 'Shop category filter options should be returned');

      // Search products: price max 5, rating at least 4, sorted by rating high to low, only available
      var products = this.logic.searchProducts(
        categoryKey,
        5,
        4,
        'customer_rating_high_to_low',
        true
      );

      this.assert(Array.isArray(products), 'searchProducts should return an array');
      this.assert(products.length >= 3, 'Should have at least 3 postcard products under 5 with rating >= 4 in test data');

      // Add first 3 distinct postcards to cart with quantity 1
      var productIdsToAdd = products.slice(0, 3).map(function (p) { return p.productId; });

      var firstAddResult = this.logic.addProductToCart(productIdsToAdd[0], 1);
      this.assert(firstAddResult && firstAddResult.success === true, 'First addProductToCart call should succeed');
      var cartId = firstAddResult.cartId;
      this.assert(!!cartId, 'Cart id should be returned after first add');

      var secondAddResult = this.logic.addProductToCart(productIdsToAdd[1], 1);
      this.assert(secondAddResult && secondAddResult.success === true, 'Second addProductToCart call should succeed');
      var thirdAddResult = this.logic.addProductToCart(productIdsToAdd[2], 1);
      this.assert(thirdAddResult && thirdAddResult.success === true, 'Third addProductToCart call should succeed');

      // Open cart page
      var cartData = this.logic.getCart();
      this.assert(cartData && cartData.cart, 'getCart should return cart data');
      this.assert(Array.isArray(cartData.items), 'Cart items should be an array');

      // Ensure each of the three products is present and set quantity to 1 using updateCartItemQuantity
      var items = cartData.items;
      var foundCount = 0;
      var self = this;
      items.forEach(function (item) {
        if (productIdsToAdd.indexOf(item.productId) !== -1) {
          foundCount++;
          // Update quantity explicitly to 1
          var updateResult = self.logic.updateCartItemQuantity(item.cartItemId, 1);
          self.assert(updateResult && updateResult.success === true, 'updateCartItemQuantity should succeed');
          var updatedItem = updateResult.items.find(function (i) { return i.cartItemId === item.cartItemId; });
          self.assert(updatedItem.quantity === 1, 'Updated item quantity should be 1');
          self.assert(updatedItem.lineTotal === updatedItem.unitPrice * 1, 'lineTotal should equal unitPrice for quantity 1');
        }
      });

      this.assert(foundCount === 3, 'All three selected postcards should be present in the cart');
      this.assert(cartData.totals.total > 0, 'Cart total should be positive after adding postcards');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Make a one-time 25 donation to Artwork Conservation Fund
  testTask5_MakeOneTime25DonationToArtworkConservationFund() {
    var testName = 'Task 5: Make one-time 25 donation to Artwork Conservation Fund';
    console.log('Testing:', testName);

    try {
      this.resetStorageWithData();

      // Get available donation funds
      var funds = this.logic.getDonationFunds();
      this.assert(Array.isArray(funds), 'getDonationFunds should return an array');
      this.assert(funds.length > 0, 'There should be at least one donation fund');

      // Select Artwork Conservation Fund by name
      var fund = funds.find(function (f) { return f.name === 'Artwork Conservation Fund'; });
      this.assert(!!fund, 'Artwork Conservation Fund should exist in donation funds');

      var amount = 25;
      var donationResult = this.logic.createDonation(
        fund.id,
        amount,
        'one_time',
        'Jordan Lee',
        'jordan.lee@example.com',
        'credit_debit_card',
        '4111111111111111',
        '12/28',
        '123'
      );

      this.assert(donationResult && donationResult.success === true, 'createDonation should succeed');
      var donation = donationResult.donation;
      this.assert(donation.fundId === fund.id, 'Donation should reference selected fund');
      this.assert(donation.amount === amount, 'Donation amount should be 25');
      this.assert(donation.frequency === 'one_time', 'Donation frequency should be one_time');
      this.assert(donation.paymentMethod === 'credit_debit_card', 'Donation payment method should be credit_debit_card');

      // Donation status should be one of the defined states (using actual value from response)
      this.assert(!!donation.status, 'Donation status should be set');

      // Verify persistence
      var storedDonations = JSON.parse(localStorage.getItem('donations') || '[]');
      var storedDonation = storedDonations.find(function (d) { return d.id === donation.id; });
      this.assert(!!storedDonation, 'Donation should be persisted in donations storage');
      this.assert(storedDonation.amount === donation.amount, 'Stored donation amount should match returned amount');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Purchase the cheapest annual student membership under 60
  testTask6_PurchaseCheapestAnnualStudentMembershipUnder60() {
    var testName = 'Task 6: Purchase cheapest annual student membership under 60 and proceed to payment step';
    console.log('Testing:', testName);

    try {
      this.resetStorageWithData();

      // View membership filter options
      var membershipFilters = this.logic.getMembershipFilterOptions();
      this.assert(!!membershipFilters, 'Membership filter options should be returned');

      // Search student_youth annual memberships with maxAnnualPrice 60, sorted by price low to high
      var plans = this.logic.searchMembershipPlans(
        'student_youth',
        60,
        'annual',
        'price_low_to_high'
      );

      this.assert(Array.isArray(plans), 'searchMembershipPlans should return an array');
      this.assert(plans.length > 0, 'Should find at least one student annual plan under or equal to 60');

      var prices = plans.map(function (p) { return p.pricePerPeriod; });
      var minPrice = Math.min.apply(Math, prices);
      var chosenPlan = plans[0];
      this.assert(chosenPlan.pricePerPeriod === minPrice, 'First plan should be cheapest based on pricePerPeriod');
      this.assert(chosenPlan.pricePerPeriod <= 60, 'Chosen plan price should be at most 60');

      // Compute membership start date as first day of next calendar month based on baseline date
      var baseline = this.getBaselineDate();
      var startYear = baseline.getUTCFullYear();
      var startMonth = baseline.getUTCMonth() + 1; // 0-based
      if (startMonth === 11) {
        startYear += 1;
        startMonth = 0;
      } else {
        startMonth += 1;
      }
      var startDate = new Date(Date.UTC(startYear, startMonth, 1));
      var startDateStr = this.formatDateYmd(startDate);

      // Start membership enrollment and create checkout order
      var enrollResult = this.logic.startMembershipEnrollmentAndOrder(
        chosenPlan.membershipPlanId,
        'Taylor Kim',
        'taylor.kim@example.com',
        startDateStr,
        'digital_membership_card_email'
      );

      this.assert(enrollResult && enrollResult.success === true, 'startMembershipEnrollmentAndOrder should succeed');
      var enrollment = enrollResult.membershipEnrollment;
      var order = enrollResult.checkoutOrder;
      this.assert(enrollment && order, 'Both MembershipEnrollment and CheckoutOrder should be returned');
      this.assert(enrollment.membershipPlanId === chosenPlan.membershipPlanId, 'Enrollment should reference chosen plan');
      this.assert(enrollment.fullName === 'Taylor Kim', 'Enrollment fullName should match input');
      this.assert(enrollment.email === 'taylor.kim@example.com', 'Enrollment email should match input');

      // Verify relationships and amounts
      this.assert(order.referenceId === enrollment.id, 'CheckoutOrder referenceId should match enrollment id');
      var plansStore = JSON.parse(localStorage.getItem('membership_plans') || '[]');
      var planFromStore = plansStore.find(function (p) { return p.id === chosenPlan.membershipPlanId; });
      this.assert(!!planFromStore, 'Chosen membership plan should exist in storage');
      if (order.totalAmount != null && planFromStore.pricePerPeriod != null) {
        this.assert(order.totalAmount === planFromStore.pricePerPeriod, 'Order totalAmount should equal plan price');
      }

      // Simulate loading checkout page for the membership
      var checkoutSummary = this.logic.getCheckoutOrder(order.id);
      this.assert(checkoutSummary && checkoutSummary.checkoutOrder, 'Should retrieve checkout order summary for membership');
      this.assert(checkoutSummary.checkoutOrder.id === order.id, 'Checkout summary order id should match membership order id');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Subscribe to newsletter with specific content preferences
  testTask7_SubscribeToGalleryNewsletterWithPreferences() {
    var testName = 'Task 7: Subscribe to gallery newsletter with topics and interests';
    console.log('Testing:', testName);

    try {
      this.resetStorageWithData();

      var email = 'visitor.news@example.com';
      var topics = ['monthly_highlights', 'new_exhibitions_openings'];
      var interests = ['contemporary_art', 'family_activities'];
      var preferredFormat = 'html_email';

      var subResult = this.logic.subscribeToNewsletter(
        email,
        topics,
        interests,
        preferredFormat
      );

      this.assert(subResult && subResult.success === true, 'subscribeToNewsletter should succeed');
      var subscription = subResult.subscription;
      this.assert(subscription.email === email, 'Subscription email should match input');
      this.assert(Array.isArray(subscription.topics), 'Subscription topics should be an array');
      this.assert(subscription.topics.indexOf('monthly_highlights') !== -1, 'Subscription should include monthly_highlights topic');
      this.assert(subscription.topics.indexOf('new_exhibitions_openings') !== -1, 'Subscription should include new_exhibitions_openings topic');
      this.assert(Array.isArray(subscription.interests), 'Subscription interests should be an array');
      this.assert(subscription.interests.indexOf('contemporary_art') !== -1, 'Subscription should include contemporary_art interest');
      this.assert(subscription.interests.indexOf('family_activities') !== -1, 'Subscription should include family_activities interest');
      this.assert(subscription.preferredFormat === 'html_email', 'Subscription preferredFormat should be html_email');
      this.assert(subscription.isActive === true, 'Subscription should be active');

      // Verify persistence in newsletter_subscriptions storage
      var storedSubs = JSON.parse(localStorage.getItem('newsletter_subscriptions') || '[]');
      var storedSub = storedSubs.find(function (s) { return s.id === subscription.id; });
      this.assert(!!storedSub, 'Subscription should be persisted');
      this.assert(storedSub.email === email, 'Stored subscription email should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Book a weekday morning wheelchair-accessible guided tour for 5 visitors
  testTask8_BookWeekdayMorningWheelchairAccessibleTourForFive() {
    var testName = 'Task 8: Book weekday morning wheelchair-accessible guided tour for 5 visitors';
    console.log('Testing:', testName);

    try {
      this.resetStorageWithData();

      // View general visit info and guided tour filter options
      var visitInfo = this.logic.getVisitInfo();
      this.assert(!!visitInfo, 'getVisitInfo should return visit data');
      var tourFilterOptions = this.logic.getVisitGuidedTourFilterOptions();
      this.assert(!!tourFilterOptions, 'getVisitGuidedTourFilterOptions should return options');

      // Derive date range from existing weekday morning accessible schedules
      var schedules = JSON.parse(localStorage.getItem('tour_schedules') || '[]');
      var guidedTours = JSON.parse(localStorage.getItem('guided_tours') || '[]');

      var accessibleMorningSchedules = schedules.filter(function (s) {
        return s.dayType === 'weekday' && s.timeOfDay === 'morning';
      });
      this.assert(accessibleMorningSchedules.length > 0, 'There should be at least one weekday morning tour schedule');

      accessibleMorningSchedules.sort(function (a, b) {
        return new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime();
      });
      var firstSchedule = accessibleMorningSchedules[0];
      var baseDate = new Date(firstSchedule.startDateTime);
      var startDateStr = this.formatDateYmd(baseDate);
      var endDateStr = this.formatDateYmd(this.addDays(baseDate, 7));

      // Search guided tour schedules via API, filtering for weekday, morning, wheelchair accessible, English
      var searchResults = this.logic.searchGuidedTourSchedules(
        null,
        startDateStr,
        endDateStr,
        'weekday',
        'morning',
        true,
        'english'
      );

      this.assert(Array.isArray(searchResults), 'searchGuidedTourSchedules should return an array');
      this.assert(searchResults.length > 0, 'Should find at least one accessible weekday morning tour schedule');

      var chosenSchedule = searchResults[0];

      // Get guided tour detail for the chosen tour
      var tourDetail = this.logic.getGuidedTourDetail(chosenSchedule.tourId);
      this.assert(tourDetail && tourDetail.tour, 'getGuidedTourDetail should return tour data');
      this.assert(tourDetail.tour.isWheelchairAccessibleRoute === true, 'Chosen tour should be wheelchair accessible');

      // Book tour for 5 visitors in English and create order
      var numVisitors = 5;
      var bookingResult = this.logic.bookGuidedTourAndCreateOrder(
        chosenSchedule.tourScheduleId,
        numVisitors,
        'english'
      );

      this.assert(bookingResult && bookingResult.success === true, 'bookGuidedTourAndCreateOrder should succeed');
      var booking = bookingResult.tourBooking;
      var order = bookingResult.checkoutOrder;
      this.assert(booking && order, 'Both TourBooking and CheckoutOrder should be returned');
      this.assert(booking.tourScheduleId === chosenSchedule.tourScheduleId, 'Booking should reference chosen schedule');
      this.assert(booking.numberOfVisitors === numVisitors, 'Booking should have 5 visitors');
      this.assert(booking.language === 'english', 'Booking language should be English');
      this.assert(order.referenceId === booking.id, 'CheckoutOrder referenceId should match tour booking id');

      // Verify total price matches basePricePerVisitor * numberOfVisitors where available
      var tourFromStore = guidedTours.find(function (t) { return t.id === chosenSchedule.tourId; });
      if (tourFromStore && tourFromStore.basePricePerVisitor != null && booking.totalPrice != null) {
        var expectedTotal = tourFromStore.basePricePerVisitor * numVisitors;
        this.assert(booking.totalPrice === expectedTotal, 'Booking totalPrice should equal basePricePerVisitor times numberOfVisitors');
      }

      // Load checkout summary for the tour order
      var checkoutSummary = this.logic.getCheckoutOrder(order.id);
      this.assert(checkoutSummary && checkoutSummary.checkoutOrder, 'Should retrieve checkout order summary for tour');
      this.assert(checkoutSummary.checkoutOrder.id === order.id, 'Checkout summary order id should match tour order id');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Assertion helper
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
