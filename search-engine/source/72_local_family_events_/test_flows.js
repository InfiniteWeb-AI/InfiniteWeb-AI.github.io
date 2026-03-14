// Test runner for business logic flows
// Covers all 8 user tasks using flow-based integration tests

class TestRunner {
  constructor(businessLogic) {
    // Simple localStorage polyfill for Node.js
    if (typeof localStorage === 'undefined') {
      global.localStorage = {
        _data: {},
        getItem(key) {
          return Object.prototype.hasOwnProperty.call(this._data, key)
            ? this._data[key]
            : null;
        },
        setItem(key, value) {
          this._data[key] = String(value);
        },
        removeItem(key) {
          delete this._data[key];
        },
        clear() {
          this._data = {};
        }
      };
    }

    this.logic = businessLogic || new BusinessLogic();
    this.results = [];

    // Clean storage and seed data
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
    // IMPORTANT: Use the Generated Data exactly as provided
    // and then augment with additional records needed for flows

    const generatedData = {
      locations: [
        {
          id: 'riverside_park',
          name: 'Riverside Park',
          address_line1: '100 Riverside Park Way',
          address_line2: '',
          city: 'Maple Grove',
          state: 'CA',
          postal_code: '94010',
          neighborhood: 'Riverside Park',
          latitude: 37.6105,
          longitude: -122.4102,
          has_free_parking: true,
          parking_details: 'Free surface lot off Riverside Park Way; overflow street parking available on weekends.',
          indoor_outdoor_type: 'outdoor',
          created_at: '2025-01-10T09:15:00Z'
        },
        {
          id: 'riverside_community_center',
          name: 'Riverside Community Center',
          address_line1: '120 Riverside Park Way',
          address_line2: '',
          city: 'Maple Grove',
          state: 'CA',
          postal_code: '94010',
          neighborhood: 'Riverside Park',
          latitude: 37.6112,
          longitude: -122.409,
          has_free_parking: true,
          parking_details: 'Small free lot behind the center; additional parking along Oak Lane.',
          indoor_outdoor_type: 'mixed',
          created_at: '2025-02-03T14:22:00Z'
        },
        {
          id: 'riverside_playground',
          name: 'Riverside Adventure Playground',
          address_line1: '150 Riverside Park Way',
          address_line2: '',
          city: 'Maple Grove',
          state: 'CA',
          postal_code: '94010',
          neighborhood: 'Riverside Park',
          latitude: 37.6098,
          longitude: -122.4081,
          has_free_parking: true,
          parking_details: 'Shared with Riverside Park main lot; look for Playground Entrance signs.',
          indoor_outdoor_type: 'outdoor',
          created_at: '2025-03-15T11:05:00Z'
        }
      ],
      memberships: [
        {
          id: 'family_fun_basic',
          name: 'Family Fun Basic Membership',
          description: 'Perfect for families who attend a few events each season. Includes discounted tickets and a handful of free family days throughout the year.',
          membership_type: 'family',
          price: 89,
          currency: 'USD',
          billing_period_default: 'annual',
          billing_period_options: ['annual'],
          included_free_events_per_year: 4,
          benefits: [
            '4 free family event admissions per year',
            '10% discount on all regular event tickets',
            'Early access to seasonal event registration',
            'Members-only email newsletter with weekly highlights'
          ],
          is_active: true,
          image_url: 'https://ehq-production-australia.imgix.net/fc5b4a56fd1c3f9641fe3fd261e1c5e320c7a0a4/photos/images/000/050/178/original/IMG_8166.JPG?auto=compress',
          created_at: '2025-01-05T10:00:00Z',
          updated_at: '2025-09-10T09:30:00Z'
        },
        {
          id: 'family_adventure_plus',
          name: 'Family Adventure Plus Membership',
          description: 'Our most popular family plan with more free events, bigger discounts, and extra perks for busy families who love to explore.',
          membership_type: 'family',
          price: 129,
          currency: 'USD',
          billing_period_default: 'annual',
          billing_period_options: ['annual', 'monthly'],
          included_free_events_per_year: 8,
          benefits: [
            '8 free family event admissions per year',
            '15% discount on all regular event tickets',
            'Priority booking for workshops & camps',
            'Free parking at select partner venues',
            'Member pricing on up to 4 guest tickets per event'
          ],
          is_active: true,
          image_url: 'https://www.mamavation.com/wp-content/uploads/2019/04/Depositphotos_200764832_l-2015.jpg',
          created_at: '2025-01-15T11:20:00Z',
          updated_at: '2025-10-01T08:45:00Z'
        },
        {
          id: 'family_explorer_premium',
          name: 'Family Explorer Premium Membership',
          description: 'Best value for families who attend events regularly all year. Maximizes free events and access to special members-only experiences.',
          membership_type: 'family',
          price: 149,
          currency: 'USD',
          billing_period_default: 'monthly',
          billing_period_options: ['annual', 'monthly'],
          included_free_events_per_year: 12,
          benefits: [
            '12 free family event admissions per year',
            '20% discount on all regular event tickets',
            'Unlimited free admission to select indoor play mornings',
            'Exclusive members-only holiday preview night',
            'Waived registration fees for up to 3 workshops per year',
            'Priority phone support for booking changes'
          ],
          is_active: true,
          image_url: 'https://www.omnihotels.com/-/media/images/globals/specials/family-city-38646992.jpg?h=406&la=en&w=720',
          created_at: '2025-02-01T14:10:00Z',
          updated_at: '2025-11-05T12:00:00Z'
        }
      ],
      activities: [
        {
          id: 'riverside_bug_safari',
          title: 'Riverside Park Bug Safari',
          subtitle: 'Guided nature walk for curious kids',
          short_description: 'Join a naturalist-led walk to hunt for beetles, butterflies, and more along the Riverside Park trails.',
          description: 'Bring your magnifying glass and curiosity for this kid-friendly bug safari at Riverside Park. Families will explore easy, stroller-friendly paths while our guide helps kids spot beetles, butterflies, ladybugs, and other tiny critters. Short stops include hands-on observation with bug viewers and simple nature games. Perfect for ages 5–8; younger siblings welcome with supervision.',
          content_group: 'events',
          activity_category: 'outdoor',
          min_age: 5,
          max_age: 8,
          price_type: 'free',
          price_min: 0,
          price_max: 0,
          price_currency: 'USD',
          price_unit: 'per_family',
          schedule_recurrence: 'one_time',
          location_id: 'riverside_park',
          tags: [],
          accessibility_features: ['stroller_friendly'],
          rating: 4.2,
          rating_count: 34,
          is_featured: true,
          image_url: 'https://s.alicdn.com/@sc01/kf/HTB1jtxHPCzqK1RjSZFpq6ykSXXaQ.jpg',
          booking_required: false,
          registration_available: false,
          created_at: '2025-12-15T09:00:00Z',
          updated_at: '2026-01-20T11:30:00Z',
          first_start_datetime: '2026-03-07T10:30:00Z',
          last_end_datetime: '2026-03-07T12:00:00Z'
        },
        {
          id: 'willow_creek_scavenger_hunt',
          title: 'Willow Creek Nature Scavenger Hunt',
          subtitle: 'Free outdoor adventure for elementary-age kids',
          short_description: 'Explore Willow Creek Park with a guided scavenger hunt designed for ages 5–10.',
          description: 'Families receive a colorful scavenger hunt card featuring leaves, birds, park landmarks, and sounds to discover around Willow Creek Park. A host will lead a gentle loop walk with check-in stops for group games and nature facts. Kids who complete the card can pick a small nature-themed prize at the end. Dress for outdoor play.',
          content_group: 'events',
          activity_category: 'outdoor',
          min_age: 5,
          max_age: 10,
          price_type: 'free',
          price_min: 0,
          price_max: 0,
          price_currency: 'USD',
          price_unit: 'per_family',
          schedule_recurrence: 'one_time',
          location_id: 'willow_creek_park',
          tags: [],
          accessibility_features: [],
          rating: 4.5,
          rating_count: 51,
          is_featured: true,
          image_url: 'https://treasureseekr.com/wp-content/uploads/2020/06/Children-as-Detectives-on-a-Treasure-Hunt.jpg',
          booking_required: false,
          registration_available: false,
          created_at: '2026-01-05T10:15:00Z',
          updated_at: '2026-02-10T08:45:00Z',
          first_start_datetime: '2026-03-07T09:00:00Z',
          last_end_datetime: '2026-03-07T10:30:00Z'
        },
        {
          id: 'morning_makers_craft_time',
          title: 'Morning Makers Indoor Play & Craft Time',
          subtitle: 'Cozy indoor play with guided art projects',
          short_description: 'Drop-in play, sensory bins, and a simple take-home craft at Little Oaks Play Café.',
          description: 'Ease into Sunday with an indoor play session at Little Oaks Play Café. Kids can rotate between open play structures, sensory bins, and a hosted craft table with a new project each week. A quieter corner with dimmed lighting is available for kids who need a break. Coffee and snacks available for purchase.',
          content_group: 'events',
          activity_category: 'indoor',
          min_age: 3,
          max_age: 8,
          price_type: 'paid',
          price_min: 12,
          price_max: 18,
          price_currency: 'USD',
          price_unit: 'per_family',
          schedule_recurrence: 'weekly',
          location_id: 'little_oaks_play_cafe',
          tags: [],
          accessibility_features: ['sensory_friendly', 'stroller_friendly'],
          rating: 4.6,
          rating_count: 89,
          is_featured: true,
          image_url: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800&h=600&fit=crop&auto=format&q=80',
          booking_required: true,
          registration_available: true,
          created_at: '2025-11-20T14:00:00Z',
          updated_at: '2026-02-28T09:20:00Z',
          first_start_datetime: '2026-03-08T10:00:00Z',
          last_end_datetime: '2026-03-15T11:30:00Z'
        }
      ],
      registrations: [
        {
          id: 'reg_001',
          activity_id: 'intro_robotics_saturday_lab',
          session_id: 'intro_robotics_2026-04-04_0900',
          created_at: '2026-02-20T14:15:00Z',
          participants_count: 1,
          parent_guardian_name: 'Jordan Lee',
          contact_phone: '555-0172',
          contact_email: 'jordan.lee@example.com',
          currency: 'USD',
          registration_status: 'confirmed',
          total_price: 22
        },
        {
          id: 'reg_002',
          activity_id: 'creative_writing_quest',
          session_id: 'creative_writing_2026-03-14_0930',
          created_at: '2026-02-25T09:40:00Z',
          participants_count: 2,
          parent_guardian_name: 'Morgan Patel',
          contact_phone: '555-0198',
          contact_email: 'morgan.patel@example.com',
          currency: 'USD',
          registration_status: 'confirmed',
          total_price: 70
        },
        {
          id: 'reg_003',
          activity_id: 'tiny_tumblers_gym_class',
          session_id: 'tiny_tumblers_2026-03-10_1630',
          created_at: '2026-03-01T11:05:00Z',
          participants_count: 1,
          parent_guardian_name: 'Casey Nguyen',
          contact_phone: '555-0144',
          contact_email: 'casey.nguyen@example.com',
          currency: 'USD',
          registration_status: 'cancelled',
          total_price: 20
        }
      ],
      activity_sessions: [
        {
          id: 'intro_robotics_2026-04-04_0900',
          activity_id: 'intro_robotics_saturday_lab',
          start_datetime: '2026-04-04T09:00:00Z',
          end_datetime: '2026-04-04T11:00:00Z',
          day_of_week: 'saturday',
          time_of_day_bucket: 'morning',
          is_weekend: true,
          capacity_total: 16,
          is_registration_open: true,
          capacity_available: 15
        },
        {
          id: 'creative_writing_2026-03-14_0930',
          activity_id: 'creative_writing_quest',
          start_datetime: '2026-03-14T09:30:00Z',
          end_datetime: '2026-03-14T12:00:00Z',
          day_of_week: 'saturday',
          time_of_day_bucket: 'morning',
          is_weekend: true,
          capacity_total: 18,
          is_registration_open: true,
          capacity_available: 16
        },
        {
          id: 'tiny_tumblers_2026-03-10_1630',
          activity_id: 'tiny_tumblers_gym_class',
          start_datetime: '2026-03-10T16:30:00Z',
          end_datetime: '2026-03-10T17:15:00Z',
          day_of_week: 'tuesday',
          time_of_day_bucket: 'after_4pm',
          is_weekend: false,
          capacity_total: 10,
          is_registration_open: true,
          capacity_available: 9
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:48:03.725863'
      }
    };

    // Copy generated data to localStorage using correct storage keys
    localStorage.setItem('locations', JSON.stringify(generatedData.locations));
    localStorage.setItem('memberships', JSON.stringify(generatedData.memberships));
    localStorage.setItem('activities', JSON.stringify(generatedData.activities));
    localStorage.setItem('registrations', JSON.stringify(generatedData.registrations));
    localStorage.setItem('activity_sessions', JSON.stringify(generatedData.activity_sessions));

    // Augment data to ensure all flows have matching records
    const activities = JSON.parse(localStorage.getItem('activities') || '[]');
    const activitySessions = JSON.parse(localStorage.getItem('activity_sessions') || '[]');

    // Use date shortcuts from business logic so new activities align with filters
    const shortcuts = this.logic.getDateShortcuts();
    const upcomingSaturday = shortcuts && shortcuts.upcoming_saturday;
    const upcomingSunday = shortcuts && shortcuts.upcoming_sunday;
    const weekendStart = shortcuts && shortcuts.this_weekend_start_date;
    const weekendEnd = shortcuts && shortcuts.this_weekend_end_date;

    // Helper to build ISO datetimes from a date string
    const buildDateTime = (dateStr, timeStr) => {
      if (!dateStr) return undefined;
      return dateStr + 'T' + timeStr + 'Z';
    };

    // Look up existing sessions from generated data
    const roboticsSession = generatedData.activity_sessions.find(s => s.id === 'intro_robotics_2026-04-04_0900');
    const writingSession = generatedData.activity_sessions.find(s => s.id === 'creative_writing_2026-03-14_0930');
    const tumblersSession = generatedData.activity_sessions.find(s => s.id === 'tiny_tumblers_2026-03-10_1630');

    // 1) Workshop: Intro Robotics Saturday Lab (for Task 3)
    activities.push({
      id: 'intro_robotics_saturday_lab',
      title: 'Intro Robotics Saturday Lab',
      subtitle: 'Hands-on robots for kids',
      short_description: 'Build and program beginner-friendly robots in a small-group lab.',
      description: 'Kids experiment with simple robots, sensors, and coding challenges in a supervised lab. Designed for older elementary kids ready for guided STEM projects.',
      content_group: 'workshops_camps',
      activity_category: 'indoor',
      min_age: 10,
      max_age: 12,
      price_type: 'paid',
      price_min: 22,
      price_max: 22,
      price_currency: 'USD',
      price_unit: 'per_ticket',
      schedule_recurrence: 'one_time',
      location_id: 'riverside_community_center',
      tags: [],
      accessibility_features: [],
      rating: 4.7,
      rating_count: 40,
      is_featured: false,
      image_url: '',
      booking_required: true,
      registration_available: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      first_start_datetime: roboticsSession ? roboticsSession.start_datetime : buildDateTime(shortcuts.next_month_start_date, '09:00:00'),
      last_end_datetime: roboticsSession ? roboticsSession.end_datetime : buildDateTime(shortcuts.next_month_start_date, '11:00:00')
    });

    // 2) Workshop: Creative Writing Quest (same family, also for Task 3 but may be filtered out by date)
    activities.push({
      id: 'creative_writing_quest',
      title: 'Creative Writing Quest',
      subtitle: 'Story-building workshop for tweens',
      short_description: 'Collaborative story games and writing prompts in a fun workshop setting.',
      description: 'Kids explore character creation, world building, and story structure through games and guided writing prompts.',
      content_group: 'workshops_camps',
      activity_category: 'indoor',
      min_age: 9,
      max_age: 12,
      price_type: 'paid',
      price_min: 35,
      price_max: 35,
      price_currency: 'USD',
      price_unit: 'per_ticket',
      schedule_recurrence: 'one_time',
      location_id: 'riverside_community_center',
      tags: [],
      accessibility_features: [],
      rating: 4.5,
      rating_count: 32,
      is_featured: false,
      image_url: '',
      booking_required: true,
      registration_available: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      first_start_datetime: writingSession ? writingSession.start_datetime : buildDateTime(weekendStart, '09:30:00'),
      last_end_datetime: writingSession ? writingSession.end_datetime : buildDateTime(weekendStart, '12:00:00')
    });

    // 3) Weekly class: Tiny Tumblers Gym Class (for Task 5)
    activities.push({
      id: 'tiny_tumblers_gym_class',
      title: 'Tiny Tumblers Gym Class',
      subtitle: 'Beginning tumbling for toddlers',
      short_description: 'Soft play tumbling, balance beams, and movement games for little ones.',
      description: 'A weekly active class focused on gross motor skills, balance, and fun movement for toddlers and preschoolers.',
      content_group: 'classes_programs',
      activity_category: 'indoor',
      min_age: 3,
      max_age: 4,
      price_type: 'paid',
      price_min: 20,
      price_max: 20,
      price_currency: 'USD',
      price_unit: 'per_ticket',
      schedule_recurrence: 'weekly',
      location_id: 'riverside_community_center',
      tags: [],
      accessibility_features: [],
      rating: 4.3,
      rating_count: 21,
      is_featured: false,
      image_url: '',
      booking_required: true,
      registration_available: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      first_start_datetime: tumblersSession ? tumblersSession.start_datetime : buildDateTime(weekendStart, '16:30:00'),
      last_end_datetime: tumblersSession ? tumblersSession.end_datetime : buildDateTime(weekendStart, '17:15:00')
    });

    // 4) Map playground event (for Task 6)
    const playgroundActivityId = 'riverside_playground_meetup';
    activities.push({
      id: playgroundActivityId,
      title: 'Riverside Playground Meetup',
      subtitle: 'Casual meetup at the adventure playground',
      short_description: 'Open play with other families at Riverside Adventure Playground.',
      description: 'Bring snacks and let the kids explore the climbing structures and slides while parents connect.',
      content_group: 'events',
      activity_category: 'playground',
      min_age: 2,
      max_age: 8,
      price_type: 'free',
      price_min: 0,
      price_max: 0,
      price_currency: 'USD',
      price_unit: 'per_family',
      schedule_recurrence: 'one_time',
      location_id: 'riverside_playground',
      tags: [],
      accessibility_features: [],
      rating: 4.1,
      rating_count: 10,
      is_featured: false,
      image_url: '',
      booking_required: false,
      registration_available: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      first_start_datetime: buildDateTime(weekendStart || upcomingSaturday, '14:00:00'),
      last_end_datetime: buildDateTime(weekendStart || upcomingSaturday, '16:00:00')
    });

    activitySessions.push({
      id: playgroundActivityId + '_session1',
      activity_id: playgroundActivityId,
      start_datetime: buildDateTime(weekendStart || upcomingSaturday, '14:00:00'),
      end_datetime: buildDateTime(weekendStart || upcomingSaturday, '16:00:00'),
      day_of_week: 'saturday',
      time_of_day_bucket: 'afternoon',
      is_weekend: true,
      capacity_total: 50,
      capacity_available: 50,
      is_registration_open: false
    });

    // 5) Map storytime event (for Task 6)
    const storytimeActivityId = 'riverside_park_storytime';
    activities.push({
      id: storytimeActivityId,
      title: 'Riverside Park Storytime Under the Trees',
      subtitle: 'Outdoor storytime for little ones',
      short_description: 'Librarian-led stories and songs in the picnic grove.',
      description: 'Families gather on picnic blankets for a selection of picture books, songs, and fingerplays.',
      content_group: 'events',
      activity_category: 'storytime',
      min_age: 2,
      max_age: 6,
      price_type: 'free',
      price_min: 0,
      price_max: 0,
      price_currency: 'USD',
      price_unit: 'per_family',
      schedule_recurrence: 'one_time',
      location_id: 'riverside_park',
      tags: [],
      accessibility_features: ['stroller_friendly'],
      rating: 4.4,
      rating_count: 18,
      is_featured: false,
      image_url: '',
      booking_required: false,
      registration_available: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      first_start_datetime: buildDateTime(weekendStart || upcomingSaturday, '10:00:00'),
      last_end_datetime: buildDateTime(weekendStart || upcomingSaturday, '11:00:00')
    });

    activitySessions.push({
      id: storytimeActivityId + '_session1',
      activity_id: storytimeActivityId,
      start_datetime: buildDateTime(weekendStart || upcomingSaturday, '10:00:00'),
      end_datetime: buildDateTime(weekendStart || upcomingSaturday, '11:00:00'),
      day_of_week: 'saturday',
      time_of_day_bucket: 'morning',
      is_weekend: true,
      capacity_total: 60,
      capacity_available: 60,
      is_registration_open: false
    });

    // 6) Holiday daytime parade (for Task 7)
    const holidayParadeId = 'downtown_holiday_parade';
    activities.push({
      id: holidayParadeId,
      title: 'Downtown Holiday Parade',
      subtitle: 'Daytime family parade with bands and floats',
      short_description: 'Festive holiday parade with marching bands, dancers, and community groups.',
      description: 'Line the streets for a cheerful holiday parade featuring local schools, bands, and community organizations.',
      content_group: 'seasonal_holiday',
      activity_category: 'outdoor',
      min_age: 0,
      max_age: 99,
      price_type: 'free',
      price_min: 0,
      price_max: 0,
      price_currency: 'USD',
      price_unit: 'per_family',
      schedule_recurrence: 'seasonal',
      location_id: 'riverside_park',
      tags: ['holiday', 'free_parking'],
      accessibility_features: [],
      rating: 4.6,
      rating_count: 120,
      is_featured: true,
      image_url: '',
      booking_required: false,
      registration_available: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      first_start_datetime: '2026-12-22T16:00:00Z',
      last_end_datetime: '2026-12-22T18:00:00Z'
    });

    activitySessions.push({
      id: holidayParadeId + '_session1',
      activity_id: holidayParadeId,
      start_datetime: '2026-12-22T16:00:00Z',
      end_datetime: '2026-12-22T18:00:00Z',
      day_of_week: 'tuesday',
      time_of_day_bucket: 'daytime',
      is_weekend: false,
      capacity_total: 0,
      capacity_available: 0,
      is_registration_open: false
    });

    // 7) Holiday evening lights display (for Task 7)
    const holidayLightsId = 'riverside_winter_lights_trail';
    activities.push({
      id: holidayLightsId,
      title: 'Riverside Winter Lights Trail',
      subtitle: 'Evening holiday lights walk',
      short_description: 'Stroll through a glowing trail of lights and seasonal displays.',
      description: 'Follow a one-way path through themed light displays, photo spots, and gentle music.',
      content_group: 'seasonal_holiday',
      activity_category: 'outdoor',
      min_age: 0,
      max_age: 99,
      price_type: 'paid',
      price_min: 20,
      price_max: 24,
      price_currency: 'USD',
      price_unit: 'per_ticket',
      schedule_recurrence: 'seasonal',
      location_id: 'riverside_park',
      tags: ['holiday'],
      accessibility_features: ['stroller_friendly'],
      rating: 4.8,
      rating_count: 210,
      is_featured: true,
      image_url: '',
      booking_required: true,
      registration_available: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      first_start_datetime: '2026-12-23T19:00:00Z',
      last_end_datetime: '2026-12-23T21:00:00Z'
    });

    activitySessions.push({
      id: holidayLightsId + '_session1',
      activity_id: holidayLightsId,
      start_datetime: '2026-12-23T19:00:00Z',
      end_datetime: '2026-12-23T21:00:00Z',
      day_of_week: 'wednesday',
      time_of_day_bucket: 'evening',
      is_weekend: false,
      capacity_total: 200,
      capacity_available: 200,
      is_registration_open: true
    });

    // 8) Extra sensory-friendly indoor event for Task 8
    const sensoryEventId = 'sensory_sing_and_play';
    activities.push({
      id: sensoryEventId,
      title: 'Sensory Sing & Play',
      subtitle: 'Indoor music and play session',
      short_description: 'Gentle music, movement, and sensory play for little ones.',
      description: 'A structured but flexible indoor session with songs, bubbles, and soft sensory materials.',
      content_group: 'events',
      activity_category: 'indoor',
      min_age: 1,
      max_age: 5,
      price_type: 'paid',
      price_min: 15,
      price_max: 15,
      price_currency: 'USD',
      price_unit: 'per_family',
      schedule_recurrence: 'one_time',
      location_id: 'riverside_community_center',
      tags: [],
      accessibility_features: ['sensory_friendly', 'stroller_friendly'],
      rating: 4.9,
      rating_count: 40,
      is_featured: false,
      image_url: '',
      booking_required: true,
      registration_available: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      first_start_datetime: buildDateTime(weekendEnd || upcomingSunday, '09:30:00'),
      last_end_datetime: buildDateTime(weekendEnd || upcomingSunday, '11:00:00')
    });

    activitySessions.push({
      id: sensoryEventId + '_session1',
      activity_id: sensoryEventId,
      start_datetime: buildDateTime(weekendEnd || upcomingSunday, '09:30:00'),
      end_datetime: buildDateTime(weekendEnd || upcomingSunday, '11:00:00'),
      day_of_week: 'sunday',
      time_of_day_bucket: 'morning',
      is_weekend: true,
      capacity_total: 30,
      capacity_available: 30,
      is_registration_open: true
    });

    // 9) Ensure Morning Makers has an explicit session for weekend (helps time-of-day filters)
    activitySessions.push({
      id: 'morning_makers_session_weekend',
      activity_id: 'morning_makers_craft_time',
      start_datetime: buildDateTime(weekendEnd || upcomingSunday, '10:00:00'),
      end_datetime: buildDateTime(weekendEnd || upcomingSunday, '11:30:00'),
      day_of_week: 'sunday',
      time_of_day_bucket: 'morning',
      is_weekend: true,
      capacity_total: 40,
      capacity_available: 40,
      is_registration_open: true
    });

    // Save augmented arrays back to storage
    localStorage.setItem('activities', JSON.stringify(activities));
    localStorage.setItem('activity_sessions', JSON.stringify(activitySessions));

    // Ensure other entity collections exist
    if (!localStorage.getItem('cart')) localStorage.setItem('cart', JSON.stringify([]));
    if (!localStorage.getItem('cart_items')) localStorage.setItem('cart_items', JSON.stringify([]));
    if (!localStorage.getItem('favorites_lists')) localStorage.setItem('favorites_lists', JSON.stringify([]));
    if (!localStorage.getItem('favorite_items')) localStorage.setItem('favorite_items', JSON.stringify([]));
    if (!localStorage.getItem('day_plans')) localStorage.setItem('day_plans', JSON.stringify([]));
    if (!localStorage.getItem('day_plan_items')) localStorage.setItem('day_plan_items', JSON.stringify([]));
    if (!localStorage.getItem('watchlists')) localStorage.setItem('watchlists', JSON.stringify([]));
    if (!localStorage.getItem('watchlist_items')) localStorage.setItem('watchlist_items', JSON.stringify([]));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_Favorite2FreeOutdoorEvents();
    this.testTask2_DayPlanFullSunday();
    this.testTask3_RegisterCheapestWorkshopNextMonth();
    this.testTask4_ChooseBestFamilyMembershipAndAddToCart();
    this.testTask5_SaveWeeklyClassesToWatchlist();
    this.testTask6_AddMapEventsToDayPlan();
    this.testTask7_FavoriteHolidayEvents();
    this.testTask8_FavoriteSensoryFriendlyIndoorEvents();

    return this.results;
  }

  // Task 1: Favorite 2 free outdoor events for ages 5–8 within 10 miles this Saturday
  testTask1_Favorite2FreeOutdoorEvents() {
    const testName = 'Task 1: Favorite free outdoor events for ages 5–8 on Saturday';

    try {
      const sectionsResult = this.logic.getHomeSections();
      this.assert(sectionsResult && Array.isArray(sectionsResult.sections), 'getHomeSections should return sections array');

      const shortcuts = this.logic.getDateShortcuts();
      this.assert(shortcuts && shortcuts.upcoming_saturday, 'getDateShortcuts should provide upcoming_saturday');
      const upcomingSaturday = shortcuts.upcoming_saturday;

      const filterOptions = this.logic.getActivityFilterOptions('browse', 'events');
      this.assert(filterOptions && Array.isArray(filterOptions.category_options), 'getActivityFilterOptions should return category_options');

      const toolsBefore = this.logic.getUserToolSummaries();
      const favoritesBefore = toolsBefore && typeof toolsBefore.favorites_count === 'number'
        ? toolsBefore.favorites_count
        : 0;

      // Search for outdoor free events for ages 5–8 on upcoming Saturday within 10 miles
      const searchResult = this.logic.searchActivities(
        'outdoor',                    // keyword
        upcomingSaturday,             // date_start
        upcomingSaturday,             // date_end
        ['events'],                   // content_groups
        ['outdoor'],                  // activity_categories
        5,                            // min_age
        8,                            // max_age
        'free',                       // price_type
        undefined,                    // price_max
        undefined,                    // time_of_day_buckets
        ['saturday'],                 // days_of_week
        'any',                        // schedule_recurrence
        10,                           // distance_max_miles
        undefined,                    // tags
        undefined,                    // accessibility_features
        undefined,                    // rating_min
        'start_time_earliest',        // sort_by
        1,                            // page
        10                            // page_size
      );

      this.assert(searchResult && Array.isArray(searchResult.items), 'searchActivities should return items array');
      this.assert(searchResult.items.length > 0, 'Expected at least one free outdoor result');

      const itemsToFavorite = searchResult.items.slice(0, 2);
      let actuallyAdded = 0;

      for (let i = 0; i < itemsToFavorite.length; i++) {
        const item = itemsToFavorite[i];
        const details = this.logic.getActivityDetails(item.activity_id);
        this.assert(details && details.activity && details.activity.id === item.activity_id, 'getActivityDetails should return matching activity');
        // Basic constraint checks (dynamic, no hardcoded expected values)
        this.assert(details.activity.price_type === 'free', 'Favorited event should be free');
        if (typeof details.activity.min_age === 'number' && typeof details.activity.max_age === 'number') {
          this.assert(details.activity.min_age <= 8 && details.activity.max_age >= 5, 'Age range should cover 5–8');
        }

        const addResult = this.logic.addActivityToFavorites(item.activity_id);
        this.assert(addResult && addResult.success === true, 'addActivityToFavorites should succeed');
        this.assert(addResult.favorite_item_id, 'Should return favorite_item_id');
        actuallyAdded += 1;
      }

      this.assert(actuallyAdded > 0, 'Should add at least one favorite');

      const toolsAfter = this.logic.getUserToolSummaries();
      const favoritesAfter = toolsAfter && typeof toolsAfter.favorites_count === 'number'
        ? toolsAfter.favorites_count
        : 0;
      this.assert(
        favoritesAfter === favoritesBefore + actuallyAdded,
        'favorites_count should increase by number of favorited items'
      );

      const favoritesList = this.logic.getFavoritesList();
      this.assert(favoritesList && Array.isArray(favoritesList.items), 'getFavoritesList should return items');
      const favoritedIds = favoritesList.items.map(it => it.activity_summary.activity_id);
      itemsToFavorite.slice(0, actuallyAdded).forEach(it => {
        this.assert(favoritedIds.indexOf(it.activity_id) !== -1, 'Favorites list should contain added activities');
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Plan a full Sunday with 3 events in a day plan
  testTask2_DayPlanFullSunday() {
    const testName = 'Task 2: Plan a full Sunday with 3 events in day plan';

    try {
      const shortcuts = this.logic.getDateShortcuts();
      this.assert(shortcuts && shortcuts.upcoming_sunday, 'getDateShortcuts should provide upcoming_sunday');
      const sundayDate = shortcuts.upcoming_sunday;

      // Starting state of day plan
      const initialPlan = this.logic.getDayPlan(sundayDate);
      const initialCount = initialPlan && initialPlan.summary && typeof initialPlan.summary.total_items === 'number'
        ? initialPlan.summary.total_items
        : 0;

      // 1) Indoor event under or equal to 20 for morning
      const indoorSearch = this.logic.searchActivities(
        undefined,                    // keyword
        undefined,                    // date_start
        undefined,                    // date_end
        ['events'],                   // content_groups
        ['indoor'],                   // activity_categories
        undefined,                    // min_age
        undefined,                    // max_age
        'any',                        // price_type
        20,                           // price_max
        undefined,                    // time_of_day_buckets
        undefined,                    // days_of_week
        'any',                        // schedule_recurrence
        undefined,                    // distance_max_miles
        undefined,                    // tags
        undefined,                    // accessibility_features
        undefined,                    // rating_min
        'relevance',                  // sort_by
        1,                            // page
        20                            // page_size
      );

      this.assert(indoorSearch && Array.isArray(indoorSearch.items), 'Indoor search should return items array');
      this.assert(indoorSearch.items.length > 0, 'Expected at least one indoor event under or equal to 20');
      const morningEvent = indoorSearch.items[0];

      const addMorningResult = this.logic.addActivityToDayPlan(
        sundayDate,
        morningEvent.activity_id,
        undefined,
        'morning'
      );
      this.assert(addMorningResult && addMorningResult.success === true, 'Should add morning event to day plan');

      const selectedIds = [morningEvent.activity_id];

      // 2) Afternoon outdoor or park event
      const outdoorSearch = this.logic.searchActivities(
        undefined,
        undefined,
        undefined,
        ['events'],
        ['outdoor'],
        undefined,
        undefined,
        'any',
        undefined,
        undefined,
        undefined,
        'any',
        undefined,
        undefined,
        undefined,
        undefined,
        'relevance',
        1,
        20
      );
      this.assert(outdoorSearch && Array.isArray(outdoorSearch.items), 'Outdoor search should return items array');
      this.assert(outdoorSearch.items.length > 0, 'Expected at least one outdoor event');
      let afternoonEvent = null;
      for (let i = 0; i < outdoorSearch.items.length; i++) {
        if (selectedIds.indexOf(outdoorSearch.items[i].activity_id) === -1) {
          afternoonEvent = outdoorSearch.items[i];
          break;
        }
      }
      this.assert(afternoonEvent, 'Should find a distinct afternoon event');
      selectedIds.push(afternoonEvent.activity_id);

      const addAfternoonResult = this.logic.addActivityToDayPlan(
        sundayDate,
        afternoonEvent.activity_id,
        undefined,
        'afternoon'
      );
      this.assert(addAfternoonResult && addAfternoonResult.success === true, 'Should add afternoon event to day plan');

      // 3) Evening event under or equal to 50
      const eveningSearch = this.logic.searchActivities(
        undefined,
        undefined,
        undefined,
        ['events'],
        undefined,                    // any category
        undefined,
        undefined,
        'any',
        50,                           // price_max
        undefined,
        undefined,
        'any',
        undefined,
        undefined,
        undefined,
        undefined,
        'price_low_to_high',
        1,
        20
      );
      this.assert(eveningSearch && Array.isArray(eveningSearch.items), 'Evening search should return items array');
      this.assert(eveningSearch.items.length > 0, 'Expected at least one event under or equal to 50');
      let eveningEvent = null;
      for (let i = 0; i < eveningSearch.items.length; i++) {
        if (selectedIds.indexOf(eveningSearch.items[i].activity_id) === -1) {
          eveningEvent = eveningSearch.items[i];
          break;
        }
      }
      this.assert(eveningEvent, 'Should find a distinct evening event');
      selectedIds.push(eveningEvent.activity_id);

      const addEveningResult = this.logic.addActivityToDayPlan(
        sundayDate,
        eveningEvent.activity_id,
        undefined,
        'evening'
      );
      this.assert(addEveningResult && addEveningResult.success === true, 'Should add evening event to day plan');

      // Verify final day plan state
      const finalPlan = this.logic.getDayPlan(sundayDate);
      this.assert(finalPlan && Array.isArray(finalPlan.items), 'getDayPlan should return items');
      const finalCount = finalPlan.summary && typeof finalPlan.summary.total_items === 'number'
        ? finalPlan.summary.total_items
        : finalPlan.items.length;
      this.assert(finalCount >= initialCount + 3, 'Day plan should contain at least three more items');

      const byId = finalPlan.items.reduce((acc, item) => {
        if (item.activity_summary && item.activity_summary.activity_id) {
          acc[item.activity_summary.activity_id] = item;
        }
        return acc;
      }, {});

      selectedIds.forEach(id => {
        this.assert(byId[id], 'Day plan should contain planned activity ' + id);
      });

      const hasMorning = finalPlan.items.some(it => it.time_of_day_bucket === 'morning');
      const hasAfternoon = finalPlan.items.some(it => it.time_of_day_bucket === 'afternoon');
      const hasEvening = finalPlan.items.some(it => it.time_of_day_bucket === 'evening');
      this.assert(hasMorning, 'Day plan should have a morning item');
      this.assert(hasAfternoon, 'Day plan should have an afternoon item');
      this.assert(hasEvening, 'Day plan should have an evening item');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Register two children for cheapest Saturday morning workshop next month under 40
  testTask3_RegisterCheapestWorkshopNextMonth() {
    const testName = 'Task 3: Register for cheapest Saturday morning workshop next month';

    try {
      const shortcuts = this.logic.getDateShortcuts();
      this.assert(shortcuts && shortcuts.next_month_start_date && shortcuts.next_month_end_date, 'getDateShortcuts should provide next month range');

      const dateStart = shortcuts.next_month_start_date;
      const dateEnd = shortcuts.next_month_end_date;

      // Search for workshops in next month, ages 10–12, Saturday morning, under or equal to 40
      const searchResult = this.logic.searchActivities(
        undefined,                    // keyword
        dateStart,
        dateEnd,
        ['workshops_camps'],          // content_groups
        undefined,                    // activity_categories
        10,                           // min_age
        12,                           // max_age
        'any',                        // price_type
        40,                           // price_max
        ['morning'],                  // time_of_day_buckets
        ['saturday'],                 // days_of_week
        'any',                        // schedule_recurrence
        undefined,                    // distance
        undefined,                    // tags
        undefined,                    // accessibility_features
        undefined,                    // rating_min
        'price_low_to_high',          // sort_by
        1,
        20
      );

      this.assert(searchResult && Array.isArray(searchResult.items), 'Workshop search should return items array');
      this.assert(searchResult.items.length > 0, 'Expected at least one matching workshop');

      const cheapestWorkshop = searchResult.items[0];
      const workshopDetails = this.logic.getActivityDetails(cheapestWorkshop.activity_id);
      this.assert(workshopDetails && workshopDetails.activity, 'getActivityDetails should return workshop activity');

      // Select a Saturday morning session for registration
      let selectedSession = null;
      if (Array.isArray(workshopDetails.sessions)) {
        for (let i = 0; i < workshopDetails.sessions.length; i++) {
          const s = workshopDetails.sessions[i];
          const isSaturday = s.day_of_week === 'saturday';
          const isMorning = s.time_of_day_bucket === 'morning';
          const inRange = (!dateStart || s.start_datetime >= dateStart) && (!dateEnd || s.start_datetime <= dateEnd + 'T23:59:59Z');
          if (isSaturday && isMorning && inRange) {
            selectedSession = s;
            break;
          }
        }
        if (!selectedSession && workshopDetails.sessions.length > 0) {
          selectedSession = workshopDetails.sessions[0];
        }
      }

      this.assert(selectedSession, 'Should find a session to register for');

      // Get registration form defaults for activity and session
      const formDefaults = this.logic.getRegistrationFormDefaults(
        cheapestWorkshop.activity_id,
        selectedSession.id
      );
      this.assert(formDefaults && formDefaults.activity_summary, 'getRegistrationFormDefaults should return activity_summary');
      this.assert(Array.isArray(formDefaults.session_options), 'getRegistrationFormDefaults should return session_options');

      const sessionFromDefaults = formDefaults.session_options.find(s => s.id === selectedSession.id) || formDefaults.session_options[0];
      let capacityBefore = typeof sessionFromDefaults.capacity_available === 'number'
        ? sessionFromDefaults.capacity_available
        : undefined;

      // Submit registration for 2 participants
      const participantsCount = 2;
      const regResult = this.logic.submitRegistration(
        cheapestWorkshop.activity_id,
        selectedSession.id,
        participantsCount,
        'Alex Rivera',
        '555-0123',
        undefined
      );

      this.assert(regResult && regResult.success === true, 'submitRegistration should succeed');
      this.assert(regResult.registration && regResult.registration.id, 'Registration result should include a registration id');
      this.assert(regResult.registration.activity_id === cheapestWorkshop.activity_id, 'Registration activity_id should match selected workshop');
      this.assert(regResult.registration.session_id === selectedSession.id, 'Registration session_id should match selected session');
      this.assert(regResult.registration.participants_count === participantsCount, 'Registration participants_count should match requested');

      // Verify capacity decreased if capacity numbers are tracked
      const formDefaultsAfter = this.logic.getRegistrationFormDefaults(
        cheapestWorkshop.activity_id,
        selectedSession.id
      );
      const sessionAfter = formDefaultsAfter.session_options.find(s => s.id === selectedSession.id) || formDefaultsAfter.session_options[0];
      if (typeof capacityBefore === 'number' && typeof sessionAfter.capacity_available === 'number') {
        this.assert(
          sessionAfter.capacity_available === capacityBefore - participantsCount,
          'Capacity should decrease by number of registered participants'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Choose best family membership under 150 with most free events and add to cart
  testTask4_ChooseBestFamilyMembershipAndAddToCart() {
    const testName = 'Task 4: Choose best family membership under 150 and add to cart';

    try {
      const filterOptions = this.logic.getMembershipFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.membership_type_options), 'getMembershipFilterOptions should return membership_type_options');

      // Get family memberships under or equal to 150
      const membershipsResult = this.logic.getMemberships(
        'family',   // membership_type
        150,        // price_max
        true,       // is_active_only
        'price_low_to_high',
        1,
        20
      );

      this.assert(membershipsResult && Array.isArray(membershipsResult.items), 'getMemberships should return items');
      this.assert(membershipsResult.items.length > 0, 'Expected at least one family membership');

      const firstThree = membershipsResult.items.slice(0, 3);
      const membershipIds = firstThree.map(m => m.membership_id);

      // Identify membership with highest included_free_events_per_year
      let bestMembership = null;
      for (let i = 0; i < firstThree.length; i++) {
        const m = firstThree[i];
        if (!bestMembership || m.included_free_events_per_year > bestMembership.included_free_events_per_year) {
          bestMembership = m;
        }
      }
      this.assert(bestMembership, 'Should identify best membership by included free events');

      // Compare selected memberships
      const comparison = this.logic.getMembershipComparison(membershipIds);
      this.assert(comparison && Array.isArray(comparison.memberships), 'getMembershipComparison should return memberships array');
      const comparedBest = comparison.memberships.reduce((acc, m) => {
        if (!acc || m.included_free_events_per_year > acc.included_free_events_per_year) {
          return m;
        }
        return acc;
      }, null);
      this.assert(comparedBest && comparedBest.id === bestMembership.membership_id, 'Comparison best should match chosen best membership');

      // Load membership details
      const bestDetails = this.logic.getMembershipDetails(bestMembership.membership_id);
      this.assert(bestDetails && bestDetails.membership && bestDetails.membership.id === bestMembership.membership_id, 'getMembershipDetails should return selected membership');

      // Add membership to cart with annual billing period
      const addResult = this.logic.addMembershipToCart(
        bestMembership.membership_id,
        'annual',
        1
      );
      this.assert(addResult && addResult.success === true, 'addMembershipToCart should succeed');
      this.assert(addResult.cart && addResult.cart.cart_id, 'Cart id should be present after adding membership');
      this.assert(Array.isArray(addResult.cart.items) && addResult.cart.items.length > 0, 'Cart should contain items');

      const cartItem = addResult.cart.items.find(it => it.membership_id === bestMembership.membership_id);
      this.assert(cartItem, 'Cart should contain the selected membership');
      this.assert(cartItem.billing_period === 'annual', 'Cart item billing period should be annual');
      this.assert(cartItem.quantity === 1, 'Cart item quantity should be 1');

      const cartFromGet = this.logic.getCart();
      this.assert(cartFromGet && cartFromGet.cart_id === addResult.cart.cart_id, 'getCart should return same cart id');
      const cartItemFromGet = cartFromGet.items.find(it => it.membership_id === bestMembership.membership_id);
      this.assert(cartItemFromGet, 'getCart should include selected membership item');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Save up to 3 weekly weekday classes for ages 3–4 after 4 PM within 5 miles to watchlist
  testTask5_SaveWeeklyClassesToWatchlist() {
    const testName = 'Task 5: Save weekly weekday classes for ages 3–4 after 4 PM to watchlist';

    try {
      const filterOptions = this.logic.getActivityFilterOptions('browse', 'classes_programs');
      this.assert(filterOptions && Array.isArray(filterOptions.age_ranges), 'getActivityFilterOptions for classes_programs should return age_ranges');

      const toolsBefore = this.logic.getUserToolSummaries();
      const watchlistBefore = toolsBefore && typeof toolsBefore.watchlist_count === 'number'
        ? toolsBefore.watchlist_count
        : 0;

      // Search for weekly classes, ages 3–4, weekdays after 4 PM within 5 miles
      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const searchResult = this.logic.searchActivities(
        undefined,                    // keyword
        undefined,                    // date_start
        undefined,                    // date_end
        ['classes_programs'],         // content_groups
        undefined,                    // activity_categories
        3,                            // min_age
        4,                            // max_age
        'any',                        // price_type
        undefined,                    // price_max
        ['after_4pm'],                // time_of_day_buckets
        daysOfWeek,                   // days_of_week
        'weekly',                     // schedule_recurrence
        5,                            // distance_max_miles
        undefined,                    // tags
        undefined,                    // accessibility_features
        undefined,                    // rating_min
        'distance_nearest_first',     // sort_by
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.items), 'Class search should return items array');
      this.assert(searchResult.items.length > 0, 'Expected at least one matching class');

      const itemsToSave = searchResult.items.slice(0, 3);
      let actuallyAdded = 0;

      for (let i = 0; i < itemsToSave.length; i++) {
        const item = itemsToSave[i];
        const details = this.logic.getActivityDetails(item.activity_id);
        this.assert(details && details.activity && details.activity.id === item.activity_id, 'getActivityDetails should return class activity');

        const addResult = this.logic.addActivityToWatchlist(item.activity_id);
        this.assert(addResult && addResult.success === true, 'addActivityToWatchlist should succeed');
        this.assert(addResult.watchlist_item_id, 'Watchlist item id should be returned');
        actuallyAdded += 1;
      }

      this.assert(actuallyAdded > 0, 'Should add at least one class to watchlist');

      const toolsAfter = this.logic.getUserToolSummaries();
      const watchlistAfter = toolsAfter && typeof toolsAfter.watchlist_count === 'number'
        ? toolsAfter.watchlist_count
        : 0;
      this.assert(
        watchlistAfter === watchlistBefore + actuallyAdded,
        'watchlist_count should increase by number of added classes'
      );

      const watchlist = this.logic.getWatchlist();
      this.assert(watchlist && Array.isArray(watchlist.items), 'getWatchlist should return items');
      const watchlistActivityIds = watchlist.items.map(it => it.activity_summary.activity_id);
      itemsToSave.slice(0, actuallyAdded).forEach(it => {
        this.assert(watchlistActivityIds.indexOf(it.activity_id) !== -1, 'Watchlist should contain added class');
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Add 2 nearby events (playground and storytime) within 2 miles of Riverside Park to day plan using map view
  testTask6_AddMapEventsToDayPlan() {
    const testName = 'Task 6: Add playground and storytime from map view to day plan';

    try {
      const sectionsResult = this.logic.getHomeSections();
      this.assert(sectionsResult && Array.isArray(sectionsResult.sections), 'getHomeSections should return sections');

      // Search for Riverside Park location
      const locations = this.logic.searchLocations('Riverside Park', 10);
      this.assert(Array.isArray(locations) && locations.length > 0, 'searchLocations should find Riverside Park');
      const centerLocation = locations[0];

      const centerLat = centerLocation.latitude;
      const centerLng = centerLocation.longitude;
      this.assert(typeof centerLat === 'number' && typeof centerLng === 'number', 'Center location should have coordinates');

      // Map search for playground events within 2 miles
      const playgroundMapResult = this.logic.getMapActivities(
        centerLat,
        centerLng,
        2,                 // radius_miles
        undefined,         // date_start
        undefined,         // date_end
        ['playground'],    // activity_categories
        ['events'],        // content_groups
        undefined,         // time_of_day_buckets
        undefined,         // days_of_week
        undefined,         // tags
        undefined,         // accessibility_features
        'any',             // price_type
        undefined          // price_max
      );

      this.assert(playgroundMapResult && Array.isArray(playgroundMapResult.markers), 'getMapActivities for playground should return markers');
      this.assert(playgroundMapResult.markers.length > 0, 'Expected at least one playground marker');
      const playgroundMarker = playgroundMapResult.markers[0];

      const markerDate = playgroundMarker.start_datetime
        ? playgroundMarker.start_datetime.substring(0, 10)
        : (this.logic.getDateShortcuts().this_weekend_start_date);
      this.assert(markerDate, 'Marker date should be available or inferred');

      const addPlaygroundResult = this.logic.addActivityToDayPlan(
        markerDate,
        playgroundMarker.activity_id,
        undefined,
        playgroundMarker.time_of_day_bucket || 'daytime'
      );
      this.assert(addPlaygroundResult && addPlaygroundResult.success === true, 'Should add playground marker to day plan');

      // Map search for storytime events within 2 miles
      const storytimeMapResult = this.logic.getMapActivities(
        centerLat,
        centerLng,
        2,
        undefined,
        undefined,
        ['storytime'],
        ['events'],
        undefined,
        undefined,
        undefined,
        undefined,
        'any',
        undefined
      );

      this.assert(storytimeMapResult && Array.isArray(storytimeMapResult.markers), 'getMapActivities for storytime should return markers');
      this.assert(storytimeMapResult.markers.length > 0, 'Expected at least one storytime marker');
      const storytimeMarker = storytimeMapResult.markers[0];

      const addStorytimeResult = this.logic.addActivityToDayPlan(
        markerDate,
        storytimeMarker.activity_id,
        undefined,
        storytimeMarker.time_of_day_bucket || 'daytime'
      );
      this.assert(addStorytimeResult && addStorytimeResult.success === true, 'Should add storytime marker to day plan');

      // Verify day plan contains both activities
      const dayPlan = this.logic.getDayPlan(markerDate);
      this.assert(dayPlan && Array.isArray(dayPlan.items), 'getDayPlan should return items');
      const idsInPlan = dayPlan.items.map(it => it.activity_summary.activity_id);

      this.assert(idsInPlan.indexOf(playgroundMarker.activity_id) !== -1, 'Day plan should contain playground activity');
      this.assert(idsInPlan.indexOf(storytimeMarker.activity_id) !== -1, 'Day plan should contain storytime activity');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Favorite holiday parade with free parking and holiday lights display under 25 between Dec 20–24
  testTask7_FavoriteHolidayEvents() {
    const testName = 'Task 7: Favorite holiday parade with free parking and holiday lights display under 25';

    try {
      const toolsBefore = this.logic.getUserToolSummaries();
      const favoritesBefore = toolsBefore && typeof toolsBefore.favorites_count === 'number'
        ? toolsBefore.favorites_count
        : 0;

      const dateStart = '2026-12-20';
      const dateEnd = '2026-12-24';

      // 1) Find daytime holiday parade with free parking
      const paradeSearch = this.logic.searchActivities(
        'parade',                 // keyword
        dateStart,
        dateEnd,
        ['seasonal_holiday'],     // content_groups
        undefined,                // categories
        undefined,
        undefined,
        'any',
        undefined,
        ['daytime'],              // time_of_day_buckets
        undefined,
        'any',
        undefined,
        ['holiday'],              // tags
        undefined,
        undefined,
        'relevance',
        1,
        20
      );

      this.assert(paradeSearch && Array.isArray(paradeSearch.items), 'Parade search should return items');
      this.assert(paradeSearch.items.length > 0, 'Expected at least one holiday parade result');

      let paradeActivityId = null;
      for (let i = 0; i < paradeSearch.items.length; i++) {
        const item = paradeSearch.items[i];
        const details = this.logic.getActivityDetails(item.activity_id);
        this.assert(details && details.activity && details.location, 'getActivityDetails should return activity and location');
        const hasHolidayTag = Array.isArray(details.activity.tags) && details.activity.tags.indexOf('holiday') !== -1;
        const hasFreeParkingTag = Array.isArray(details.activity.tags) && details.activity.tags.indexOf('free_parking') !== -1;
        const locationFreeParking = !!details.location.has_free_parking;
        if (hasHolidayTag && (hasFreeParkingTag || locationFreeParking)) {
          paradeActivityId = details.activity.id;
          break;
        }
      }
      this.assert(paradeActivityId, 'Should find a holiday parade with free parking');

      const addParadeResult = this.logic.addActivityToFavorites(paradeActivityId);
      this.assert(addParadeResult && addParadeResult.success === true, 'Should favorite holiday parade');

      // 2) Find evening holiday lights display under or equal to 25
      const lightsSearch = this.logic.searchActivities(
        'lights',
        dateStart,
        dateEnd,
        ['seasonal_holiday'],
        undefined,
        undefined,
        undefined,
        'any',
        25,                         // price_max
        ['evening'],                // time_of_day_buckets
        undefined,
        'any',
        undefined,
        ['holiday'],
        undefined,
        undefined,
        'price_low_to_high',
        1,
        20
      );

      this.assert(lightsSearch && Array.isArray(lightsSearch.items), 'Lights search should return items');
      this.assert(lightsSearch.items.length > 0, 'Expected at least one holiday lights result');

      let lightsActivityId = null;
      for (let i = 0; i < lightsSearch.items.length; i++) {
        const item = lightsSearch.items[i];
        const details = this.logic.getActivityDetails(item.activity_id);
        this.assert(details && details.activity, 'getActivityDetails should return lights activity');
        const priceMin = typeof details.activity.price_min === 'number' ? details.activity.price_min : Infinity;
        const priceMax = typeof details.activity.price_max === 'number' ? details.activity.price_max : priceMin;
        if (Math.min(priceMin, priceMax) <= 25) {
          lightsActivityId = details.activity.id;
          break;
        }
      }

      this.assert(lightsActivityId, 'Should find a holiday lights display under or equal to 25');

      const addLightsResult = this.logic.addActivityToFavorites(lightsActivityId);
      this.assert(addLightsResult && addLightsResult.success === true, 'Should favorite holiday lights display');

      const toolsAfter = this.logic.getUserToolSummaries();
      const favoritesAfter = toolsAfter && typeof toolsAfter.favorites_count === 'number'
        ? toolsAfter.favorites_count
        : 0;
      this.assert(
        favoritesAfter === favoritesBefore + 2,
        'favorites_count should increase by 2 for parade and lights display'
      );

      const favoritesList = this.logic.getFavoritesList();
      this.assert(favoritesList && Array.isArray(favoritesList.items), 'getFavoritesList should return items');
      const favoriteIds = favoritesList.items.map(it => it.activity_summary.activity_id);
      this.assert(favoriteIds.indexOf(paradeActivityId) !== -1, 'Favorites should contain holiday parade');
      this.assert(favoriteIds.indexOf(lightsActivityId) !== -1, 'Favorites should contain holiday lights display');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Save 2 highly rated sensory-friendly indoor events for this weekend to favorites
  testTask8_FavoriteSensoryFriendlyIndoorEvents() {
    const testName = 'Task 8: Favorite sensory-friendly indoor events for this weekend';

    try {
      const shortcuts = this.logic.getDateShortcuts();
      this.assert(shortcuts && shortcuts.this_weekend_start_date && shortcuts.this_weekend_end_date, 'getDateShortcuts should provide this weekend range');

      const weekendStart = shortcuts.this_weekend_start_date;
      const weekendEnd = shortcuts.this_weekend_end_date;

      const toolsBefore = this.logic.getUserToolSummaries();
      const favoritesBefore = toolsBefore && typeof toolsBefore.favorites_count === 'number'
        ? toolsBefore.favorites_count
        : 0;

      // Search indoor, sensory-friendly, stroller-friendly, rating >= 4.5 for this weekend
      const searchResult = this.logic.searchActivities(
        undefined,                    // keyword
        weekendStart,
        weekendEnd,
        ['events'],                   // content_groups
        ['indoor'],                   // activity_categories
        undefined,
        undefined,
        'any',
        undefined,
        undefined,
        undefined,
        'any',
        undefined,
        undefined,                    // tags
        ['sensory_friendly', 'stroller_friendly'], // accessibility_features
        4.5,                          // rating_min
        'rating_high_to_low',         // sort_by
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.items), 'Sensory-friendly search should return items');
      this.assert(searchResult.items.length > 0, 'Expected at least one sensory-friendly indoor event');

      const itemsToFavorite = searchResult.items.slice(0, 2);
      let actuallyAdded = 0;

      for (let i = 0; i < itemsToFavorite.length; i++) {
        const item = itemsToFavorite[i];
        const details = this.logic.getActivityDetails(item.activity_id);
        this.assert(details && details.activity, 'getActivityDetails should return event');

        const rating = typeof details.activity.rating === 'number' ? details.activity.rating : 0;
        this.assert(rating >= 4.5, 'Event rating should be at least 4.5');
        this.assert(
          Array.isArray(details.activity.accessibility_features) &&
          details.activity.accessibility_features.indexOf('sensory_friendly') !== -1 &&
          details.activity.accessibility_features.indexOf('stroller_friendly') !== -1,
          'Event should be sensory-friendly and stroller-friendly'
        );

        const addResult = this.logic.addActivityToFavorites(item.activity_id);
        this.assert(addResult && addResult.success === true, 'addActivityToFavorites should succeed');
        actuallyAdded += 1;
      }

      const toolsAfter = this.logic.getUserToolSummaries();
      const favoritesAfter = toolsAfter && typeof toolsAfter.favorites_count === 'number'
        ? toolsAfter.favorites_count
        : 0;
      this.assert(
        favoritesAfter === favoritesBefore + actuallyAdded,
        'favorites_count should increase by number of sensory-friendly events added'
      );

      const favoritesList = this.logic.getFavoritesList();
      this.assert(favoritesList && Array.isArray(favoritesList.items), 'getFavoritesList should return items');
      const favoriteIds = favoritesList.items.map(it => it.activity_summary.activity_id);
      itemsToFavorite.slice(0, actuallyAdded).forEach(it => {
        this.assert(favoriteIds.indexOf(it.activity_id) !== -1, 'Favorites should contain added sensory-friendly event');
      });

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper assertion
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
