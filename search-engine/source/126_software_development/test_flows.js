// Test runner for business logic
// NOTE: Designed to run in Node.js with a global BusinessLogic and localStorage implementation.

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];

    // Clear localStorage before tests
    this.clearStorage();
    // Initialize test data
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
    // IMPORTANT: Use the Generated Data exactly as provided for initial population
    const generatedData = {
      hardware_models: [
        {
          id: 'prorack_server_x200',
          name: 'ProRack Server X200',
          code: 'PRX200',
          type: 'server',
          series: 'ProRack X-Series',
          description: '2U rack-mounted enterprise server optimized for virtualization and high-density workloads.',
          status: 'active'
        },
        {
          id: 'rack_server_r500_hw',
          name: 'Rack Server R500',
          code: 'RSR500',
          type: 'server',
          series: 'R-Series',
          description: 'Mid-range rack server for SMB datacenters with balanced performance and expandability.',
          status: 'active'
        },
        {
          id: 'bizbook_14_pro',
          name: 'BizBook 14 Pro',
          code: 'BB14P',
          type: 'laptop',
          series: 'BizBook',
          description: '14-inch ultraportable business laptop with extended battery life and enterprise security features.',
          status: 'active'
        }
      ],
      it_support_plans: [
        {
          id: 'basic_remote',
          name: 'Basic Remote Support',
          code: 'BASIC_REMOTE',
          monthlyPrice: 299,
          has24x7Support: false,
          includesOnSiteVisits: false,
          features: [
            'Business hours helpdesk (9x5)',
            'Remote troubleshooting',
            'Patch management for servers and workstations',
            'Monthly health reports'
          ],
          description: 'Entry-level managed IT plan with remote-only support during business hours.',
          status: 'active',
          sortOrder: 1
        },
        {
          id: 'business_plus',
          name: 'Business Plus',
          code: 'BUSINESS_PLUS',
          monthlyPrice: 599,
          has24x7Support: true,
          includesOnSiteVisits: true,
          features: [
            '24/7 remote support',
            'Quarterly on-site visits included',
            'Proactive monitoring and alerting',
            'Managed backups and recovery testing'
          ],
          description: 'Best-value plan for growing businesses requiring 24/7 coverage and included on-site visits.',
          status: 'active',
          sortOrder: 2
        },
        {
          id: 'enterprise_premium',
          name: 'Enterprise Premium',
          code: 'ENT_PREMIUM',
          monthlyPrice: 999,
          has24x7Support: true,
          includesOnSiteVisits: true,
          features: [
            'Dedicated technical account manager',
            'Unlimited 24/7 support',
            'Priority on-site response within 4 hours',
            'Advanced security monitoring and compliance reporting'
          ],
          description: 'Comprehensive coverage for enterprises with strict uptime and compliance requirements.',
          status: 'active',
          sortOrder: 3
        }
      ],
      maintenance_plans: [
        {
          id: 'srv_1y_basic',
          name: '1-Year Basic Server Maintenance',
          durationYears: 1,
          price: 180,
          supportLevel: 'basic',
          applicableProductType: 'server',
          isDefault: false
        },
        {
          id: 'srv_3y_standard',
          name: '3-Year Standard Server Maintenance',
          durationYears: 3,
          price: 450,
          supportLevel: 'standard',
          applicableProductType: 'server',
          isDefault: true
        },
        {
          id: 'srv_5y_premium',
          name: '5-Year Premium Server Maintenance',
          durationYears: 5,
          price: 780,
          supportLevel: 'premium',
          applicableProductType: 'server',
          isDefault: false
        }
      ],
      product_categories: [
        {
          id: 'laptops',
          slug: 'laptops',
          name: 'Laptops',
          description: 'Business and developer-grade laptops with configurable performance, storage, and displays.',
          image: 'https://images.clickittech.com/2020/wp-content/uploads/2021/02/04163034/home-development-06.png'
        },
        {
          id: 'accessories',
          slug: 'accessories',
          name: 'Accessories',
          description: 'Keyboards, mice, cables, and other hardware accessories for your workspace and datacenter.',
          image: 'https://pd12m.s3.us-west-2.amazonaws.com/images/f543ba04-333c-5664-ac62-676c0ab0d3d9.jpeg'
        },
        {
          id: 'servers',
          slug: 'servers',
          name: 'Servers',
          description: 'Rack, tower, and blade servers for virtualization, storage, and compute-intensive workloads.',
          image: 'https://www.hostingadvice.com/images/uploads/2017/05/datacenter-admins.jpg?width=694&height=462'
        }
      ],
      promo_codes: [
        {
          id: 'save10_all',
          code: 'SAVE10',
          description: 'Save 10% on your entire order for a limited time.',
          discountType: 'percentage',
          discountValue: 10,
          isActive: true,
          validFrom: '2025-01-01T00:00:00Z',
          validTo: '2026-12-31T23:59:59Z',
          minOrderAmount: 0,
          appliesToType: 'all_products',
          appliesToProductIds: []
        },
        {
          id: 'accessories5',
          code: 'ACC5OFF',
          description: 'Get 5 dollars off accessory orders over 50.',
          discountType: 'fixed_amount',
          discountValue: 5,
          isActive: true,
          validFrom: '2025-06-01T00:00:00Z',
          validTo: '2027-01-01T00:00:00Z',
          minOrderAmount: 50,
          appliesToType: 'category',
          appliesToCategorySlug: 'accessories',
          appliesToProductIds: []
        },
        {
          id: 'servers200',
          code: 'SERVER200',
          description: '200 dollars off high-value server purchases.',
          discountType: 'fixed_amount',
          discountValue: 200,
          isActive: false,
          validFrom: '2024-01-01T00:00:00Z',
          validTo: '2025-12-31T23:59:59Z',
          minOrderAmount: 3000,
          appliesToType: 'category',
          appliesToCategorySlug: 'servers',
          appliesToProductIds: []
        }
      ],
      server_base_models: [
        {
          id: 'rack_r500',
          name: 'Rack Server R500',
          code: 'RACKR500',
          formFactor: 'rack',
          basePrice: 2400,
          defaultRamGB: 16,
          defaultStorageTB: 1,
          description: '2U rack server with dual CPU sockets and flexible storage, ideal for virtualization and line-of-business applications.',
          isActive: true
        },
        {
          id: 'rack_r700',
          name: 'Rack Server R700',
          code: 'RACKR700',
          formFactor: 'rack',
          basePrice: 3200,
          defaultRamGB: 32,
          defaultStorageTB: 2,
          description: 'High-performance 2U rack server for dense compute and memory-intensive workloads.',
          isActive: true
        },
        {
          id: 'tower_t300',
          name: 'Tower Server T300',
          code: 'TOWERT300',
          formFactor: 'tower',
          basePrice: 1800,
          defaultRamGB: 16,
          defaultStorageTB: 2,
          description: 'Quiet tower server designed for small offices and branch locations.',
          isActive: true
        }
      ],
      server_memory_options: [
        {
          id: 'ram_16gb',
          label: '16GB DDR5 ECC',
          sizeGB: 16,
          additionalPrice: 0,
          compatibleBaseModelIds: ['rack_r500', 'rack_r700', 'tower_t300']
        },
        {
          id: 'ram_32gb',
          label: '32GB DDR5 ECC',
          sizeGB: 32,
          additionalPrice: 300,
          compatibleBaseModelIds: ['rack_r500', 'rack_r700', 'tower_t300', 'blade_b250']
        },
        {
          id: 'ram_64gb',
          label: '64GB DDR5 ECC',
          sizeGB: 64,
          additionalPrice: 650,
          compatibleBaseModelIds: ['rack_r500', 'rack_r700', 'blade_b250']
        }
      ],
      server_optional_components: [
        {
          id: 'gpu_a2000',
          name: 'NVIDIA A2000 12GB GPU',
          type: 'gpu',
          additionalPrice: 900,
          defaultIncluded: true,
          compatibleBaseModelIds: ['rack_r500', 'rack_r700']
        },
        {
          id: 'nic_10gbe_dual',
          name: 'Dual-Port 10GbE Network Adapter',
          type: 'network_card',
          additionalPrice: 260,
          defaultIncluded: false,
          compatibleBaseModelIds: ['rack_r500', 'rack_r700', 'blade_b250']
        },
        {
          id: 'raid_h700',
          name: 'RAID H700 Controller with 2GB Cache',
          type: 'raid_controller',
          additionalPrice: 320,
          defaultIncluded: true,
          compatibleBaseModelIds: ['rack_r500', 'rack_r700', 'tower_t300']
        }
      ],
      server_storage_options: [
        {
          id: 'ssd_1tb_x2',
          label: '2 x 1TB Enterprise SSD (RAID 1)',
          capacityTB: 2,
          type: 'ssd',
          additionalPrice: 500,
          compatibleBaseModelIds: ['rack_r500', 'rack_r700', 'blade_b250']
        },
        {
          id: 'hdd_2tb_x2',
          label: '2 x 2TB 7.2K HDD (RAID 1)',
          capacityTB: 4,
          type: 'hdd',
          additionalPrice: 260,
          compatibleBaseModelIds: ['rack_r500', 'rack_r700', 'tower_t300']
        },
        {
          id: 'ssd_4tb',
          label: '1 x 4TB Enterprise SSD',
          capacityTB: 4,
          type: 'ssd',
          additionalPrice: 820,
          compatibleBaseModelIds: ['rack_r700', 'blade_b250']
        }
      ],
      shipping_methods: [
        {
          id: 'standard_free',
          name: 'Standard Shipping',
          type: 'standard',
          description: 'Ground shipping with tracking for most products.',
          cost: 0,
          isFree: true,
          estimatedDeliveryDays: 5,
          isDefault: true
        },
        {
          id: 'express_2day',
          name: 'Express 2-Day',
          type: 'express',
          description: 'Expedited shipping with 2 business day delivery to most metro areas.',
          cost: 29,
          isFree: false,
          estimatedDeliveryDays: 2,
          isDefault: false
        },
        {
          id: 'overnight_air',
          name: 'Overnight Air',
          type: 'overnight',
          description: 'Next business day delivery for eligible items.',
          cost: 59,
          isFree: false,
          estimatedDeliveryDays: 1,
          isDefault: false
        }
      ],
      time_slots: [
        {
          id: 'morning_9_12',
          label: '9:00 AM – 12:00 PM',
          timeOfDay: 'morning',
          startTime: '09:00',
          endTime: '12:00',
          isDefault: true
        },
        {
          id: 'afternoon_1_4',
          label: '1:00 PM – 4:00 PM',
          timeOfDay: 'afternoon',
          startTime: '13:00',
          endTime: '16:00',
          isDefault: false
        },
        {
          id: 'evening_4_7',
          label: '4:00 PM – 7:00 PM',
          timeOfDay: 'evening',
          startTime: '16:00',
          endTime: '19:00',
          isDefault: false
        }
      ],
      knowledge_base_articles: [
        {
          id: 'kb_prorack_x200_overheating',
          title: 'Troubleshooting Overheating on ProRack Server X200',
          slug: 'prorack-server-x200-overheating-troubleshooting',
          content: 'This article helps you diagnose and resolve overheating issues on the ProRack Server X200.',
          excerpt: 'Learn how to diagnose and fix overheating issues on the ProRack Server X200, including airflow, cleaning, and firmware recommendations.',
          modelId: 'prorack_server_x200',
          modelName: 'ProRack Server X200',
          keywords: ['server overheating', 'ProRack Server X200', 'thermal shutdown', 'rack airflow'],
          category: 'Servers > Hardware > Cooling',
          createdAt: '2025-05-10T09:15:00Z',
          updatedAt: '2025-11-20T14:30:00Z',
          recommendedNextSteps: 'If your ProRack Server X200 continues to overheat after basic cleaning and airflow checks, export the latest BMC or iDRAC hardware logs, create a support case with those logs and recent thermal graphs, and schedule a rack-level airflow assessment. In environments with sustained high load, evaluate moving high-heat components to a different chassis or reducing the ambient intake temperature by 2–3 degrees C.',
          isPublished: true,
          relatedArticleIds: ['kb_server_rack_airflow', 'kb_prorack_x200_disk_errors']
        },
        {
          id: 'kb_prorack_x200_installation',
          title: 'ProRack Server X200 Rack Installation Best Practices',
          slug: 'prorack-server-x200-rack-installation',
          content: 'This guide walks through the recommended steps for installing a ProRack Server X200 into a standard 19-inch rack.',
          excerpt: 'Follow these best practices when mounting a ProRack Server X200 in your datacenter rack.',
          modelId: 'prorack_server_x200',
          modelName: 'ProRack Server X200',
          keywords: ['ProRack Server X200', 'rack installation', 'rails', 'datacenter'],
          category: 'Servers > Deployment',
          createdAt: '2025-03-01T11:00:00Z',
          updatedAt: '2025-07-18T08:45:00Z',
          recommendedNextSteps: 'Verify that the rack rails are properly locked, the server weight is evenly distributed, and that both power supplies are connected to independent PDUs before powering on.',
          isPublished: true,
          relatedArticleIds: ['kb_prorack_x200_overheating', 'kb_server_rack_airflow']
        },
        {
          id: 'kb_r500_firmware_update',
          title: 'Updating Firmware on Rack Server R500',
          slug: 'rack-server-r500-firmware-update',
          content: 'This article describes how to update BIOS, BMC, and storage controller firmware on the Rack Server R500.',
          excerpt: 'Step-by-step instructions to safely update firmware on Rack Server R500 systems.',
          modelId: 'rack_server_r500_hw',
          modelName: 'Rack Server R500',
          keywords: ['Rack Server R500', 'firmware update', 'BIOS', 'BMC'],
          category: 'Servers > Firmware & BIOS',
          createdAt: '2025-02-12T16:20:00Z',
          updatedAt: '2025-02-20T09:05:00Z',
          recommendedNextSteps: 'After the update completes, verify firmware versions in the BMC, run a full reboot test, and monitor hardware logs for at least 24 hours.',
          isPublished: true,
          relatedArticleIds: ['kb_generic_server_backup']
        }
      ],
      products: [
        {
          id: 'prod_bizbook14pro_i5_16_512',
          name: 'BizBook 14 Pro (Core i5, 16GB RAM, 512GB SSD)',
          categorySlug: 'laptops',
          sku: 'BB14P-I5-16-512',
          description: '14-inch BizBook 14 Pro business laptop with Intel Core i5 processor, 16GB DDR5 RAM, and fast 512GB NVMe SSD. Ideal for productivity and light development workloads.',
          imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=600&fit=crop&auto=format&q=80',
          price: 899,
          currency: 'usd',
          rating: 4.5,
          numReviews: 124,
          usageType: 'business',
          ramGB: 16,
          storageCapacityGB: 512,
          storageType: 'ssd',
          screenSizeInches: 14,
          freeShipping: true,
          shippingCost: 0,
          shippingMethodIds: ['standard_free', 'express_2day', 'overnight_air'],
          isServerConfigurable: false,
          tags: ['bizbook', 'ultraportable', 'windows'],
          createdAt: '2025-04-01T10:00:00Z',
          updatedAt: '2025-10-15T12:30:00Z'
        },
        {
          id: 'prod_bizbook14pro_i7_16_512',
          name: 'BizBook 14 Pro (Core i7, 16GB RAM, 512GB SSD)',
          categorySlug: 'laptops',
          sku: 'BB14P-I7-16-512',
          description: 'Premium configuration of BizBook 14 Pro with Intel Core i7, 16GB RAM, and 512GB SSD for power users and remote professionals.',
          imageUrl: 'https://pd12m.s3.us-west-2.amazonaws.com/images/cbad517d-8bb9-5362-b490-2d1ceaac3562.jpeg',
          price: 1049,
          currency: 'usd',
          rating: 4.7,
          numReviews: 86,
          usageType: 'business',
          ramGB: 16,
          storageCapacityGB: 512,
          storageType: 'ssd',
          screenSizeInches: 14,
          freeShipping: true,
          shippingCost: 0,
          shippingMethodIds: ['standard_free', 'express_2day', 'overnight_air'],
          isServerConfigurable: false,
          tags: ['bizbook', 'intel-core-i7', 'remote-work'],
          createdAt: '2025-04-01T10:15:00Z',
          updatedAt: '2025-09-20T09:45:00Z'
        },
        {
          id: 'prod_edgebook15biz_16_512',
          name: 'EdgeBook 15 Business (16GB RAM, 512GB SSD)',
          categorySlug: 'laptops',
          sku: 'EB15B-16-512',
          description: '15.6-inch EdgeBook 15 Business with numeric keypad, 16GB RAM, and 512GB SSD. Designed for spreadsheets, dashboards, and line-of-business apps.',
          imageUrl: 'http://s.alicdn.com/@sc01/kf/HTB1qkajB5CYBuNkHFCcq6AHtVXam.jpg',
          price: 949,
          currency: 'usd',
          rating: 4.6,
          numReviews: 203,
          usageType: 'business',
          ramGB: 16,
          storageCapacityGB: 512,
          storageType: 'ssd',
          screenSizeInches: 15.6,
          freeShipping: true,
          shippingCost: 0,
          shippingMethodIds: ['standard_free', 'express_2day', 'overnight_air'],
          isServerConfigurable: false,
          tags: ['edgebook', 'numeric-keypad', 'office'],
          createdAt: '2025-03-20T09:00:00Z',
          updatedAt: '2025-11-02T11:20:00Z'
        }
      ],
      training_events: [
        {
          id: 'evt_cloud_migration_fundamentals_apr2026',
          title: 'Cloud Migration Fundamentals for IT Teams',
          description: 'A practical introduction to planning and executing cloud migrations, covering assessment, readiness, and phased rollout strategies for small and mid-sized environments.',
          eventType: 'webinar',
          topic: 'cloud migration',
          startDateTime: '2026-04-15T15:00:00Z',
          endDateTime: '2026-04-15T16:30:00Z',
          isOnline: true,
          location: 'Online - Live Webinar',
          baseTimeZone: 'utc_minus_05_00',
          registrationUrl: 'training_events.html?eventId=evt_cloud_migration_fundamentals_apr2026',
          status: 'scheduled',
          capacity: 250,
          seatsAvailable: 248
        },
        {
          id: 'evt_cloud_migration_hands_on_workshop_apr2026',
          title: 'Hands-On Cloud Migration Workshop: Lift-and-Shift to Azure',
          description: 'Instructor-led hands-on lab guiding you through migrating a sample line-of-business application to Azure using a lift-and-shift approach.',
          eventType: 'workshop',
          topic: 'cloud migration',
          startDateTime: '2026-04-20T13:00:00Z',
          endDateTime: '2026-04-20T17:00:00Z',
          isOnline: false,
          location: 'San Francisco Training Center, Room 3B',
          baseTimeZone: 'utc_minus_05_00',
          registrationUrl: 'training_events.html?eventId=evt_cloud_migration_hands_on_workshop_apr2026',
          status: 'scheduled',
          capacity: 30,
          seatsAvailable: 29
        },
        {
          id: 'evt_cloud_migration_advanced_patterns_may2026',
          title: 'Advanced Cloud Migration Patterns and Zero-Downtime Cutovers',
          description: 'Deep dive into re-platforming, re-architecting, and blue/green deployment strategies for complex cloud migrations.',
          eventType: 'webinar',
          topic: 'cloud migration',
          startDateTime: '2026-05-10T16:00:00Z',
          endDateTime: '2026-05-10T18:00:00Z',
          isOnline: true,
          location: 'Online - Live Webinar',
          baseTimeZone: 'utc',
          registrationUrl: 'training_events.html?eventId=evt_cloud_migration_advanced_patterns_may2026',
          status: 'scheduled',
          capacity: 300,
          seatsAvailable: 297
        }
      ],
      event_registrations: [
        {
          id: 'reg_001',
          eventId: 'evt_cloud_migration_fundamentals_apr2026',
          attendeeName: 'Jordan Ellis',
          attendeeEmail: 'jordan.ellis@example.com',
          numSeats: 2,
          attendeeTimeZone: 'utc_minus_05_00',
          experienceLevel: 'beginner',
          registeredAt: '2026-02-28T14:10:00Z'
        },
        {
          id: 'reg_002',
          eventId: 'evt_cloud_migration_hands_on_workshop_apr2026',
          attendeeName: 'Priya Desai',
          attendeeEmail: 'priya.desai@example.com',
          numSeats: 1,
          attendeeTimeZone: 'utc_plus_01_00',
          experienceLevel: 'intermediate',
          registeredAt: '2026-03-01T09:25:00Z'
        },
        {
          id: 'reg_003',
          eventId: 'evt_cloud_migration_advanced_patterns_may2026',
          attendeeName: 'Liam Nguyen',
          attendeeEmail: 'liam.nguyen@example.com',
          numSeats: 3,
          attendeeTimeZone: 'utc',
          experienceLevel: 'advanced',
          registeredAt: '2026-03-02T11:40:00Z'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:22:55.798375'
      }
    };

    // Persist generated data to localStorage using storage keys
    localStorage.setItem('hardware_models', JSON.stringify(generatedData.hardware_models || []));
    localStorage.setItem('it_support_plans', JSON.stringify(generatedData.it_support_plans || []));
    localStorage.setItem('maintenance_plans', JSON.stringify(generatedData.maintenance_plans || []));
    localStorage.setItem('product_categories', JSON.stringify(generatedData.product_categories || []));
    localStorage.setItem('promo_codes', JSON.stringify(generatedData.promo_codes || []));
    localStorage.setItem('server_base_models', JSON.stringify(generatedData.server_base_models || []));
    localStorage.setItem('server_memory_options', JSON.stringify(generatedData.server_memory_options || []));
    localStorage.setItem('server_optional_components', JSON.stringify(generatedData.server_optional_components || []));
    localStorage.setItem('server_storage_options', JSON.stringify(generatedData.server_storage_options || []));
    localStorage.setItem('shipping_methods', JSON.stringify(generatedData.shipping_methods || []));
    localStorage.setItem('time_slots', JSON.stringify(generatedData.time_slots || []));
    localStorage.setItem('knowledge_base_articles', JSON.stringify(generatedData.knowledge_base_articles || []));
    localStorage.setItem('training_events', JSON.stringify(generatedData.training_events || []));
    localStorage.setItem('event_registrations', JSON.stringify(generatedData.event_registrations || []));

    // Products: use generated data and add a few accessories under 50 dollars with 4+ stars and free shipping
    const products = (generatedData.products || []).slice();
    const accessories = [
      {
        id: 'acc_basic_keyboard',
        name: 'Essential Wired Keyboard',
        categorySlug: 'accessories',
        sku: 'ACC-KB-ESSENTIAL',
        description: 'Full-size wired keyboard for everyday office use.',
        imageUrl: '',
        price: 29.99,
        currency: 'usd',
        rating: 4.2,
        numReviews: 42,
        usageType: 'accessory',
        freeShipping: true,
        shippingCost: 0,
        shippingMethodIds: ['standard_free'],
        isServerConfigurable: false,
        tags: ['keyboard']
      },
      {
        id: 'acc_wireless_mouse',
        name: 'Precision Wireless Mouse',
        categorySlug: 'accessories',
        sku: 'ACC-MOUSE-WL',
        description: 'Ergonomic wireless mouse with adjustable DPI.',
        imageUrl: '',
        price: 24.5,
        currency: 'usd',
        rating: 4.5,
        numReviews: 65,
        usageType: 'accessory',
        freeShipping: true,
        shippingCost: 0,
        shippingMethodIds: ['standard_free'],
        isServerConfigurable: false,
        tags: ['mouse']
      },
      {
        id: 'acc_hdmi_cable',
        name: '2m High-Speed HDMI Cable',
        categorySlug: 'accessories',
        sku: 'ACC-HDMI-2M',
        description: 'High-speed HDMI cable suitable for 4K displays.',
        imageUrl: '',
        price: 12.99,
        currency: 'usd',
        rating: 4.4,
        numReviews: 88,
        usageType: 'accessory',
        freeShipping: true,
        shippingCost: 0,
        shippingMethodIds: ['standard_free'],
        isServerConfigurable: false,
        tags: ['cable']
      }
    ];
    products.push.apply(products, accessories);
    localStorage.setItem('products', JSON.stringify(products));

    // Ensure other storage collections exist as arrays
    const emptyCollections = [
      'carts',
      'cart_items',
      'software_quote_requests',
      'onsite_maintenance_bookings',
      'it_support_signups',
      'knowledge_base_folders',
      'saved_articles',
      'quote_carts',
      'quote_cart_items',
      'server_configurations',
      'server_quote_requests'
    ];
    emptyCollections.forEach(key => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_AddBusinessLaptopToCart();
    this.testTask2_SubmitCRMQuoteRequest();
    this.testTask3_ScheduleOnsiteMaintenance();
    this.testTask4_SelectCheapestITSupportPlan();
    this.testTask5_SaveKnowledgeBaseArticle();
    this.testTask6_AddAccessoriesAndApplyPromo();
    this.testTask7_RegisterCloudMigrationTraining();
    this.testTask8_ConfigureServerAndRequestQuote();

    return this.results;
  }

  // Task 1: Add a 16GB RAM business laptop under 1200 with 4+ stars (qty 2) to cart
  testTask1_AddBusinessLaptopToCart() {
    const testName = 'Task 1: Add 16GB business laptop under 1200 to cart (qty 2)';
    console.log('Testing:', testName);

    try {
      const homeSummary = this.logic.getHomeSummary();
      this.assert(homeSummary && homeSummary.headerStatus, 'Home summary should include headerStatus');

      const categories = this.logic.getProductCategories();
      const laptopsCategory = categories.find(c => c.slug === 'laptops');
      this.assert(!!laptopsCategory, 'Laptops category should exist');

      const filterOptions = this.logic.getProductFilterOptions('laptops');
      this.assert(filterOptions && Array.isArray(filterOptions.ramOptionsGB), 'Laptop filter options should include RAM options');

      const filters = {
        usageType: 'business',
        minRamGB: 16,
        minStorageGB: 512,
        minScreenSizeInches: 14,
        maxScreenSizeInches: 15.6,
        maxPrice: 1200,
        minRating: 4
      };

      const searchResult = this.logic.searchProducts('laptops', null, filters, 'price_asc', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.items) && searchResult.items.length > 0, 'Search should return at least one matching laptop');

      const cheapestItem = searchResult.items[0];
      const laptop = cheapestItem.product;
      this.assert(laptop.ramGB >= 16, 'Selected laptop should have at least 16GB RAM');
      this.assert(laptop.storageCapacityGB >= 512, 'Selected laptop should have at least 512GB storage');
      this.assert(laptop.screenSizeInches >= 14 && laptop.screenSizeInches <= 15.6, 'Selected laptop should have 14-15.6 inch screen');
      this.assert(laptop.price <= 1200, 'Selected laptop price should be under or equal to 1200');
      this.assert(laptop.rating >= 4, 'Selected laptop rating should be 4.0 or higher');

      const details = this.logic.getProductDetails(laptop.id);
      this.assert(details && details.product && details.product.id === laptop.id, 'Product details should match laptop id');

      const quantity = 2;
      const addResult = this.logic.addToCart(laptop.id, quantity);
      this.assert(addResult && addResult.success === true, 'addToCart should succeed');
      this.assert(addResult.cart && addResult.cart.status === 'open', 'Cart should be open');
      this.assert(addResult.cartItem && addResult.cartItem.productId === laptop.id, 'CartItem should reference correct product');

      const cartSummary = this.logic.getCartSummary();
      this.assert(cartSummary && cartSummary.cart, 'Cart summary should return a cart');
      const addedLine = cartSummary.items.find(i => i.product.id === laptop.id);
      this.assert(!!addedLine, 'Cart should contain the added laptop');
      this.assert(addedLine.cartItem.quantity === quantity, 'Cart item quantity should be 2');

      const unitPrice = laptop.price;
      const expectedSubtotal = unitPrice * quantity;
      this.assert(typeof addedLine.lineSubtotal === 'number', 'lineSubtotal should be a number');
      this.assert(cartSummary.totals && typeof cartSummary.totals.subtotal === 'number', 'Cart totals should include subtotal');
      this.assert(Math.abs(cartSummary.totals.subtotal - expectedSubtotal) < 0.0001, 'Cart subtotal should equal unit price times quantity');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Submit a quote request for a custom CRM integration project
  testTask2_SubmitCRMQuoteRequest() {
    const testName = 'Task 2: Submit CRM integration quote request';
    console.log('Testing:', testName);

    try {
      const homeSummary = this.logic.getHomeSummary();
      this.assert(homeSummary && Array.isArray(homeSummary.featuredServices), 'Home summary should include featuredServices');

      const sdOverview = this.logic.getSoftwareDevelopmentOverview();
      this.assert(sdOverview && Array.isArray(sdOverview.serviceCards), 'Software development overview should include service cards');
      const crmCard = sdOverview.serviceCards.find(c => c.serviceCategory === 'crm_integration');
      this.assert(!!crmCard, 'Should find CRM integration service card');

      const crmDetails = this.logic.getCRMIntegrationDetails();
      this.assert(crmDetails && typeof crmDetails.headline === 'string', 'CRM integration details should include a headline');

      const formOptions = this.logic.getCRMQuoteFormOptions();
      this.assert(formOptions && Array.isArray(formOptions.projectTypes), 'Form options should include projectTypes');
      this.assert(Array.isArray(formOptions.budgetRanges), 'Form options should include budgetRanges');
      this.assert(Array.isArray(formOptions.preferredContactMethods), 'Form options should include preferredContactMethods');

      const projectTypeOption = formOptions.projectTypes.find(p => p.value === 'custom_crm_integration') || formOptions.projectTypes[0];
      this.assert(!!projectTypeOption, 'Should have at least one project type option');

      const desiredMin = 15000;
      const desiredMax = 25000;
      let budgetOption = formOptions.budgetRanges.find(b => b.min >= desiredMin && b.max <= desiredMax);
      if (!budgetOption) {
        budgetOption = formOptions.budgetRanges[0];
      }
      this.assert(!!budgetOption, 'Should have at least one budget option');

      const contactMethodOption = formOptions.preferredContactMethods.find(m => m.value === 'phone') || formOptions.preferredContactMethods[0];
      this.assert(!!contactMethodOption, 'Should have at least one contact method option');

      // Desired start date: pick 10th of next month
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      const nextMonthDate = new Date(Date.UTC(year, month + 1, 10));
      const desiredStartDateIso = nextMonthDate.toISOString();

      const request = {
        serviceCategory: 'crm_integration',
        projectType: projectTypeOption.value,
        fullName: 'Alex Johnson',
        email: 'alex.johnson@example.com',
        estimatedBudgetLabel: budgetOption.label,
        estimatedBudgetMin: budgetOption.min,
        estimatedBudgetMax: budgetOption.max,
        desiredStartDate: desiredStartDateIso,
        preferredContactMethod: contactMethodOption.value,
        phone: '555-123-4567',
        projectDescription: 'Integrate our existing CRM with our billing system and automate data sync.'
      };

      const submitResult = this.logic.submitSoftwareQuoteRequest(request);
      this.assert(submitResult && submitResult.success === true, 'Quote request submission should succeed');
      this.assert(submitResult.quoteRequest, 'Quote request response should include quoteRequest');

      const qr = submitResult.quoteRequest;
      this.assert(qr.fullName === request.fullName, 'Full name should match submitted value');
      this.assert(qr.email === request.email, 'Email should match submitted value');
      this.assert(qr.serviceCategory === request.serviceCategory, 'Service category should match submitted value');
      this.assert(qr.projectType === request.projectType, 'Project type should match submitted value');
      this.assert(qr.preferredContactMethod === request.preferredContactMethod, 'Preferred contact method should match');
      this.assert(qr.phone === request.phone, 'Phone should match submitted value');
      this.assert(typeof qr.createdAt === 'string', 'Quote request should have createdAt');

      // Verify it is persisted in storage using storage key
      const stored = JSON.parse(localStorage.getItem('software_quote_requests') || '[]');
      const storedQr = stored.find(x => x.id === qr.id);
      this.assert(!!storedQr, 'Stored software_quote_requests should include the new quote');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Schedule an on-site hardware maintenance visit
  testTask3_ScheduleOnsiteMaintenance() {
    const testName = 'Task 3: Schedule on-site hardware maintenance visit';
    console.log('Testing:', testName);

    try {
      const homeSummary = this.logic.getHomeSummary();
      this.assert(homeSummary && homeSummary.headerStatus, 'Home summary should be available');

      const hwOverview = this.logic.getHardwareServicesOverview();
      this.assert(hwOverview && Array.isArray(hwOverview.serviceTypes), 'Hardware services overview should include serviceTypes');
      const workstationService = hwOverview.serviceTypes.find(s => s.serviceType === 'workstation_maintenance') || hwOverview.serviceTypes[0];
      this.assert(!!workstationService, 'Should have a workstation maintenance or similar service type');

      const formOptions = this.logic.getMaintenanceBookingFormOptions();
      this.assert(formOptions && Array.isArray(formOptions.serviceTypeOptions), 'Booking form options should include serviceTypeOptions');
      this.assert(Array.isArray(formOptions.timeSlots), 'Booking form options should include timeSlots');

      const serviceTypeOption = formOptions.serviceTypeOptions.find(o => o.value === 'workstation_maintenance') || formOptions.serviceTypeOptions[0];
      this.assert(!!serviceTypeOption, 'Should have at least one service type option');

      const morningSlot = formOptions.timeSlots.find(ts => ts.timeOfDay === 'morning') || formOptions.timeSlots[0];
      this.assert(!!morningSlot, 'Should have at least one time slot');

      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      const preferredDate = new Date(Date.UTC(year, month + 1, 12)); // between 10 and 20
      const preferredDateIso = preferredDate.toISOString();

      const bookingPayload = {
        serviceType: serviceTypeOption.value,
        numDevices: 15,
        preferredDate: preferredDateIso,
        timeSlotId: morningSlot.id,
        officeAddressLine1: '1200 Market Street, Suite 500',
        officeAddressLine2: '',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94103',
        country: formOptions.defaultCountry || 'United States',
        contactName: 'Morgan Lee',
        contactEmail: 'morgan.lee@example.com'
      };

      const submitResult = this.logic.submitOnsiteMaintenanceBooking(bookingPayload);
      this.assert(submitResult && submitResult.success === true, 'Maintenance booking submission should succeed');
      this.assert(submitResult.booking, 'Booking response should include booking');

      const booking = submitResult.booking;
      this.assert(booking.serviceType === bookingPayload.serviceType, 'Booking serviceType should match payload');
      this.assert(booking.numDevices === bookingPayload.numDevices, 'Booking numDevices should match payload');
      this.assert(booking.timeSlotId === bookingPayload.timeSlotId, 'Booking timeSlotId should match payload');

      // Verify timeSlot relationship
      const timeSlots = JSON.parse(localStorage.getItem('time_slots') || '[]');
      const storedSlot = timeSlots.find(ts => ts.id === booking.timeSlotId);
      this.assert(!!storedSlot, 'Stored time_slots should contain the selected time slot');

      // Verify persisted booking
      const storedBookings = JSON.parse(localStorage.getItem('onsite_maintenance_bookings') || '[]');
      const storedBooking = storedBookings.find(b => b.id === booking.id);
      this.assert(!!storedBooking, 'onsite_maintenance_bookings should include the new booking');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Choose the cheapest IT support plan with 24/7 support and on-site visits and start sign-up
  testTask4_SelectCheapestITSupportPlan() {
    const testName = 'Task 4: Select cheapest IT support plan with 24/7 and on-site visits';
    console.log('Testing:', testName);

    try {
      const plansResult = this.logic.getITSupportPlans();
      this.assert(Array.isArray(plansResult) && plansResult.length > 0, 'Should return IT support plans');

      const eligiblePlans = plansResult.filter(p => p.plan && p.plan.status === 'active' && p.has24x7Support && p.includesOnSiteVisits);
      this.assert(eligiblePlans.length > 0, 'Should have at least one plan with 24/7 support and on-site visits');

      let cheapest = eligiblePlans[0];
      eligiblePlans.forEach(p => {
        if (p.plan.monthlyPrice < cheapest.plan.monthlyPrice) {
          cheapest = p;
        }
      });

      const chosenPlan = cheapest.plan;
      this.assert(!!chosenPlan && chosenPlan.id, 'Chosen plan should have an id');

      const planDetails = this.logic.getITSupportPlanDetails(chosenPlan.id);
      this.assert(planDetails && planDetails.plan && planDetails.plan.id === chosenPlan.id, 'Plan details should match chosen plan');

      const signupOptions = this.logic.getITSupportSignupFormOptions();
      this.assert(signupOptions && Array.isArray(signupOptions.companySizeOptions), 'Signup options should include companySizeOptions');
      this.assert(Array.isArray(signupOptions.countryOptions), 'Signup options should include countryOptions');

      let companySizeOption = signupOptions.companySizeOptions.find(o => typeof o.label === 'string' && o.label.indexOf('25') !== -1 && o.label.indexOf('50') !== -1);
      if (!companySizeOption) {
        companySizeOption = signupOptions.companySizeOptions[0];
      }
      this.assert(!!companySizeOption, 'Should have at least one company size option');

      let countryOption = signupOptions.countryOptions.find(o => o.value === 'united_states') || signupOptions.countryOptions[0];
      this.assert(!!countryOption, 'Should have at least one country option');

      const signupPayload = {
        planId: chosenPlan.id,
        companyName: 'Brightline Analytics LLC',
        companySizeLabel: companySizeOption.label,
        companySizeRange: companySizeOption.range,
        contactName: 'Jamie Carter',
        businessEmail: 'jamie.carter@example.com',
        businessPhone: '555-987-6543',
        country: countryOption.value
      };

      const signupResult = this.logic.submitITSupportSignup(signupPayload);
      this.assert(signupResult && signupResult.success === true, 'IT support signup should succeed');
      this.assert(signupResult.signup, 'Signup response should include signup');

      const signup = signupResult.signup;
      this.assert(signup.planId === signupPayload.planId, 'Signup planId should match payload');
      this.assert(signup.companyName === signupPayload.companyName, 'Signup company name should match payload');
      this.assert(signup.companySizeRange === signupPayload.companySizeRange, 'Signup company size range should match payload');
      this.assert(signup.country === signupPayload.country, 'Signup country should match payload');

      const storedSignups = JSON.parse(localStorage.getItem('it_support_signups') || '[]');
      const storedSignup = storedSignups.find(s => s.id === signup.id);
      this.assert(!!storedSignup, 'it_support_signups should include the new signup');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Save a knowledge base article on server overheating and reopen from saved items
  testTask5_SaveKnowledgeBaseArticle() {
    const testName = 'Task 5: Save KB article on ProRack Server X200 overheating and reopen';
    console.log('Testing:', testName);

    try {
      const homeSummary = this.logic.getHomeSummary();
      this.assert(homeSummary && homeSummary.headerStatus, 'Home summary should be available');

      const searchOptions = this.logic.getKnowledgeBaseSearchOptions();
      this.assert(searchOptions && Array.isArray(searchOptions.hardwareModels), 'KB search options should include hardwareModels');
      const x200Model = searchOptions.hardwareModels.find(m => m.name === 'ProRack Server X200');
      this.assert(!!x200Model, 'Should find ProRack Server X200 hardware model');

      const searchResult = this.logic.searchKnowledgeBaseArticles('server overheating', x200Model.id, null, 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.items) && searchResult.items.length > 0, 'KB search should return results');

      const matchingItem = searchResult.items.find(i => {
        const title = (i.article.title || '').toLowerCase();
        return title.indexOf('overheating') !== -1 && (title.indexOf('x200') !== -1 || title.indexOf('prorack server') !== -1);
      }) || searchResult.items[0];
      this.assert(!!matchingItem, 'Should have at least one overheating article');

      const articleId = matchingItem.article.id;
      const articleDetails = this.logic.getKnowledgeBaseArticle(articleId);
      this.assert(articleDetails && articleDetails.article && articleDetails.article.id === articleId, 'KB article details should match id');

      // Check or create folder Server Issues
      const existingFolders = this.logic.getSavedArticleFolders();
      let folderId = null;
      let folder = null;
      if (Array.isArray(existingFolders)) {
        const serverIssuesFolder = existingFolders.find(f => f.name === 'Server Issues');
        if (serverIssuesFolder) {
          folderId = serverIssuesFolder.id;
          folder = serverIssuesFolder;
        }
      }

      let saveResult;
      if (folderId) {
        saveResult = this.logic.saveKnowledgeBaseArticle(articleId, { folderId: folderId });
      } else {
        saveResult = this.logic.saveKnowledgeBaseArticle(articleId, { newFolderName: 'Server Issues' });
      }

      this.assert(saveResult && saveResult.success === true, 'Saving knowledge base article should succeed');
      this.assert(saveResult.savedArticle, 'Save result should include savedArticle');
      if (saveResult.folder) {
        folder = saveResult.folder;
        folderId = folder.id;
      }

      const savedArticle = saveResult.savedArticle;
      if (folderId) {
        this.assert(savedArticle.folderId === folderId, 'Saved article should reference the Server Issues folder');
      }

      const savedLists = this.logic.getSavedArticles();
      this.assert(savedLists && (Array.isArray(savedLists.folders) || Array.isArray(savedLists.ungroupedArticles)), 'getSavedArticles should return folders or ungroupedArticles');

      let reopenedArticleId = null;
      if (Array.isArray(savedLists.folders)) {
        savedLists.folders.forEach(fgroup => {
          fgroup.articles.forEach(a => {
            if (a.article.id === articleId) {
              reopenedArticleId = a.article.id;
            }
          });
        });
      }
      if (!reopenedArticleId && Array.isArray(savedLists.ungroupedArticles)) {
        const match = savedLists.ungroupedArticles.find(a => a.article.id === articleId);
        if (match) {
          reopenedArticleId = match.article.id;
        }
      }

      this.assert(!!reopenedArticleId, 'Saved articles should contain the overheating article');

      const reopenedDetails = this.logic.getKnowledgeBaseArticle(reopenedArticleId);
      this.assert(reopenedDetails && reopenedDetails.article && reopenedDetails.article.id === articleId, 'Reopened article should match original');
      this.assert(typeof reopenedDetails.article.recommendedNextSteps === 'string' && reopenedDetails.article.recommendedNextSteps.length > 0, 'Article should include recommended next steps');

      // Verify SavedArticle persisted
      const storedSaved = JSON.parse(localStorage.getItem('saved_articles') || '[]');
      const storedSavedArticle = storedSaved.find(sa => sa.id === savedArticle.id);
      this.assert(!!storedSavedArticle, 'saved_articles should include the saved article');
      if (folderId) {
        const storedFolders = JSON.parse(localStorage.getItem('knowledge_base_folders') || '[]');
        const storedFolder = storedFolders.find(f => f.id === folderId);
        this.assert(!!storedFolder, 'knowledge_base_folders should include Server Issues folder');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Add three accessories under 50 dollars with 4+ stars and free shipping, apply SAVE10, select free shipping, go to checkout
  testTask6_AddAccessoriesAndApplyPromo() {
    const testName = 'Task 6: Add 3 accessories under 50 with 4+ stars and free shipping, apply SAVE10';
    console.log('Testing:', testName);

    try {
      const homeSummary = this.logic.getHomeSummary();
      this.assert(homeSummary && homeSummary.headerStatus, 'Home summary should be available');

      const categories = this.logic.getProductCategories();
      const accessoriesCategory = categories.find(c => c.slug === 'accessories');
      this.assert(!!accessoriesCategory, 'Accessories category should exist');

      const filterOptions = this.logic.getProductFilterOptions('accessories');
      this.assert(filterOptions && Array.isArray(filterOptions.priceRanges), 'Accessory filter options should include priceRanges');

      const filters = {
        minPrice: 0,
        maxPrice: 50,
        minRating: 4,
        freeShippingOnly: true
      };

      const searchResult = this.logic.searchProducts('accessories', null, filters, 'price_asc', 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.items) && searchResult.items.length >= 3, 'Should have at least 3 accessories matching filters');

      const firstProduct = searchResult.items[0].product;
      const secondProduct = searchResult.items[1].product;
      const thirdProduct = searchResult.items[2].product;

      this.assert(firstProduct.price <= 50 && firstProduct.rating >= 4 && firstProduct.freeShipping === true, 'First accessory should match price/rating/free shipping constraints');
      this.assert(secondProduct.price <= 50 && secondProduct.rating >= 4 && secondProduct.freeShipping === true, 'Second accessory should match constraints');
      this.assert(thirdProduct.price <= 50 && thirdProduct.rating >= 4 && thirdProduct.freeShipping === true, 'Third accessory should match constraints');

      const add1 = this.logic.addToCart(firstProduct.id, 1);
      this.assert(add1 && add1.success === true, 'Adding first accessory should succeed');
      const add2 = this.logic.addToCart(secondProduct.id, 1);
      this.assert(add2 && add2.success === true, 'Adding second accessory should succeed');
      const add3 = this.logic.addToCart(thirdProduct.id, 1);
      this.assert(add3 && add3.success === true, 'Adding third accessory should succeed');

      const cartBeforePromo = this.logic.getCartSummary();
      this.assert(cartBeforePromo && Array.isArray(cartBeforePromo.items), 'Cart summary should include items');

      const idsAdded = [firstProduct.id, secondProduct.id, thirdProduct.id];
      const addedItems = cartBeforePromo.items.filter(i => idsAdded.indexOf(i.product.id) !== -1);
      this.assert(addedItems.length === 3, 'Cart should contain three distinct accessories');

      const promoResult = this.logic.applyPromoCodeToCart('SAVE10');
      this.assert(promoResult && promoResult.success === true, 'Applying SAVE10 promo should succeed');
      this.assert(promoResult.promoCode && promoResult.promoCode.code === 'SAVE10', 'Promo code in response should be SAVE10');

      const cartAfterPromo = this.logic.getCartSummary();
      this.assert(cartAfterPromo && cartAfterPromo.appliedPromoCode && cartAfterPromo.appliedPromoCode.code === 'SAVE10', 'Cart summary should show SAVE10 as applied promo');
      this.assert(cartAfterPromo.totals && cartAfterPromo.totals.discountTotal > 0, 'Discount total should be greater than 0 after applying promo');

      const shippingMethods = cartAfterPromo.availableShippingMethods || [];
      this.assert(shippingMethods.length > 0, 'There should be available shipping methods');
      const freeMethod = shippingMethods.find(m => m.isFree || m.cost === 0);
      this.assert(!!freeMethod, 'There should be a free shipping method');

      const setShipResult = this.logic.setCartShippingMethod(freeMethod.id);
      this.assert(setShipResult && setShipResult.success === true, 'Setting free shipping method should succeed');
      this.assert(setShipResult.selectedShippingMethod && (setShipResult.selectedShippingMethod.isFree || setShipResult.selectedShippingMethod.cost === 0), 'Selected shipping method should be free');

      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && checkoutSummary.cart && checkoutSummary.totals, 'Checkout summary should include cart and totals');
      this.assert(checkoutSummary.appliedPromoCode && checkoutSummary.appliedPromoCode.code === 'SAVE10', 'Checkout summary should carry over SAVE10 promo');
      this.assert(checkoutSummary.selectedShippingMethod && (checkoutSummary.selectedShippingMethod.isFree || checkoutSummary.selectedShippingMethod.cost === 0), 'Checkout summary should use free shipping');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Register for an upcoming cloud migration training session and set experience level
  testTask7_RegisterCloudMigrationTraining() {
    const testName = 'Task 7: Register for cloud migration training (1 seat, intermediate, ET)';
    console.log('Testing:', testName);

    try {
      const homeSummary = this.logic.getHomeSummary();
      this.assert(homeSummary && homeSummary.headerStatus, 'Home summary should be available');

      const searchResult = this.logic.searchTrainingEvents('cloud migration', true, 1, 20);
      this.assert(searchResult && Array.isArray(searchResult.events) && searchResult.events.length > 0, 'Training event search should return future cloud migration events');

      const event = searchResult.events[0];
      this.assert(!!event.id, 'Selected training event should have an id');

      const eventDetails = this.logic.getTrainingEventDetails(event.id);
      this.assert(eventDetails && eventDetails.event && eventDetails.event.id === event.id, 'Event details should match selected event');

      const attendeeName = 'Taylor Morgan';
      const attendeeEmail = 'taylor.morgan@example.com';
      const numSeats = 1;
      const timeZone = 'utc_minus_05_00';
      const experienceLevel = 'intermediate';

      const regResult = this.logic.registerForTrainingEvent(event.id, attendeeName, attendeeEmail, numSeats, timeZone, experienceLevel);
      this.assert(regResult && regResult.success === true, 'Event registration should succeed');
      this.assert(regResult.registration, 'Registration response should include registration');

      const reg = regResult.registration;
      this.assert(reg.eventId === event.id, 'Registration eventId should match selected event');
      this.assert(reg.attendeeName === attendeeName, 'Registration attendeeName should match');
      this.assert(reg.attendeeEmail === attendeeEmail, 'Registration attendeeEmail should match');
      this.assert(reg.numSeats === numSeats, 'Registration numSeats should match');
      this.assert(reg.attendeeTimeZone === timeZone, 'Registration time zone should match');
      this.assert(reg.experienceLevel === experienceLevel, 'Registration experience level should match');

      const storedRegs = JSON.parse(localStorage.getItem('event_registrations') || '[]');
      const storedReg = storedRegs.find(r => r.id === reg.id);
      this.assert(!!storedReg, 'event_registrations should include the new registration');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Configure a custom server between 3000 and 4000 and add it to quote cart with 3-year maintenance
  testTask8_ConfigureServerAndRequestQuote() {
    const testName = 'Task 8: Configure custom rack server 3k-4k with 3-year maintenance and request quote';
    console.log('Testing:', testName);

    try {
      const baseModels = this.logic.getServerBaseModels('rack');
      this.assert(Array.isArray(baseModels) && baseModels.length > 0, 'Should return rack server base models');

      let chosenConfig = null;

      for (let i = 0; i < baseModels.length && !chosenConfig; i++) {
        const baseModel = baseModels[i];
        const options = this.logic.getServerConfigurationOptions(baseModel.id);
        this.assert(options && options.baseModel && options.baseModel.id === baseModel.id, 'Configuration options should match base model');

        const memoryOptions = (options.memoryOptions || []).filter(m => m.sizeGB >= 32);
        const storageOptions = (options.storageOptions || []).filter(s => s.capacityTB >= 2);
        const maintenanceOptions = (options.maintenancePlans || []).filter(mp => mp.durationYears === 3);

        if (memoryOptions.length === 0 || storageOptions.length === 0 || maintenanceOptions.length === 0) {
          continue;
        }

        const maintenancePlan = maintenanceOptions[0];

        outerLoop: for (let mi = 0; mi < memoryOptions.length && !chosenConfig; mi++) {
          for (let si = 0; si < storageOptions.length && !chosenConfig; si++) {
            const mem = memoryOptions[mi];
            const stor = storageOptions[si];

            const optionalSets = [
              [],
              (options.optionalComponents || []).length > 0 ? [options.optionalComponents[0].id] : []
            ];

            for (let oi = 0; oi < optionalSets.length && !chosenConfig; oi++) {
              const optIds = optionalSets[oi];
              const preview = this.logic.previewServerConfiguration(baseModel.id, mem.id, [stor.id], optIds, maintenancePlan.id);
              this.assert(preview && typeof preview.totalPrice === 'number', 'Preview should return totalPrice');

              if (preview.totalPrice >= 3000 && preview.totalPrice <= 4000) {
                chosenConfig = {
                  baseModel: baseModel,
                  memory: mem,
                  storage: stor,
                  optionalComponentIds: optIds,
                  maintenancePlan: maintenancePlan,
                  preview: preview
                };
                break outerLoop;
              }
            }
          }
        }
      }

      this.assert(!!chosenConfig, 'Should find at least one server configuration with total between 3000 and 4000');
      this.assert(chosenConfig.memory.sizeGB >= 32, 'Chosen config should have at least 32GB RAM');
      this.assert(chosenConfig.storage.capacityTB >= 2, 'Chosen config should have at least 2TB storage');
      this.assert(chosenConfig.maintenancePlan.durationYears === 3, 'Chosen config should use 3-year maintenance plan');

      const createResult = this.logic.createServerConfiguration(
        chosenConfig.baseModel.id,
        chosenConfig.memory.id,
        [chosenConfig.storage.id],
        chosenConfig.optionalComponentIds,
        chosenConfig.maintenancePlan.id
      );

      this.assert(createResult && createResult.success === true, 'Creating server configuration should succeed');
      this.assert(createResult.configuration, 'createServerConfiguration should return configuration');

      const config = createResult.configuration;
      this.assert(config.baseModelId === chosenConfig.baseModel.id, 'Configuration baseModelId should match chosen base model');
      this.assert(config.memoryOptionId === chosenConfig.memory.id, 'Configuration memoryOptionId should match');
      this.assert(Array.isArray(config.storageOptionIds) && config.storageOptionIds.indexOf(chosenConfig.storage.id) !== -1, 'Configuration should include chosen storage option');
      this.assert(config.maintenancePlanId === chosenConfig.maintenancePlan.id, 'Configuration should use chosen maintenance plan');
      this.assert(Math.abs(config.totalPrice - chosenConfig.preview.totalPrice) < 0.0001, 'Configuration totalPrice should match preview');

      // Verify it is persisted
      const storedConfigs = JSON.parse(localStorage.getItem('server_configurations') || '[]');
      const storedConfig = storedConfigs.find(c => c.id === config.id);
      this.assert(!!storedConfig, 'server_configurations should include the new configuration');

      const addQuoteResult = this.logic.addServerConfigurationToQuoteCart(config.id, 1);
      this.assert(addQuoteResult && addQuoteResult.success === true, 'Adding configuration to quote cart should succeed');
      this.assert(addQuoteResult.quoteCart && addQuoteResult.quoteCartItem, 'Quote cart result should include cart and item');

      const quoteCartSummary = this.logic.getQuoteCartSummary();
      this.assert(quoteCartSummary && quoteCartSummary.quoteCart, 'Quote cart summary should include quoteCart');
      const quoteItemWrapper = quoteCartSummary.items.find(i => i.serverConfiguration && i.serverConfiguration.id === config.id);
      this.assert(!!quoteItemWrapper, 'Quote cart should contain the new server configuration');

      const qcMaintenancePlan = quoteItemWrapper.maintenancePlan;
      this.assert(qcMaintenancePlan && qcMaintenancePlan.id === chosenConfig.maintenancePlan.id, 'Quote cart maintenance plan should match chosen plan');
      this.assert(qcMaintenancePlan.durationYears === 3, 'Quote cart maintenance plan should be 3 years');

      // Submit formal quote request
      const contact = {
        contactName: 'Server Quote Test',
        companyName: 'Example Data Center Inc.',
        email: 'quotes@example.com',
        phone: '555-000-1234'
      };

      const quoteRequestResult = this.logic.submitServerQuoteRequest(contact);
      this.assert(quoteRequestResult && quoteRequestResult.success === true, 'Server quote request submission should succeed');
      this.assert(quoteRequestResult.serverQuoteRequest, 'Server quote request response should include serverQuoteRequest');

      const serverQuoteRequest = quoteRequestResult.serverQuoteRequest;
      this.assert(serverQuoteRequest.contactName === contact.contactName, 'Server quote request contactName should match payload');
      this.assert(serverQuoteRequest.companyName === contact.companyName, 'Server quote request companyName should match payload');
      this.assert(serverQuoteRequest.email === contact.email, 'Server quote request email should match payload');

      const storedQuoteRequests = JSON.parse(localStorage.getItem('server_quote_requests') || '[]');
      const storedSqr = storedQuoteRequests.find(q => q.id === serverQuoteRequest.id);
      this.assert(!!storedSqr, 'server_quote_requests should include the new quote request');

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
    console.log('OK   -', testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('FAIL -', testName + ':', error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
