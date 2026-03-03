// Test runner for business logic

// Simple in-memory localStorage polyfill for Node.js
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    _data: {},
    setItem: function (key, value) {
      this._data[key] = String(value);
    },
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(this._data, key)
        ? this._data[key]
        : null;
    },
    removeItem: function (key) {
      delete this._data[key];
    },
    clear: function () {
      this._data = {};
    }
  };
}

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    localStorage.clear();
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Generated Data from prompt - used ONLY here
    const generatedData = {
      blog_categories: [
        {
          id: 'kitchen_organization',
          name: 'Kitchen Organization',
          description: 'Tips, strategies, and product recommendations for organizing pantries, cabinets, drawers, and small kitchens.'
        },
        {
          id: 'closet_organization',
          name: 'Closet & Wardrobe Organization',
          description: 'Ideas and step-by-step guides for decluttering and organizing closets, wardrobes, and entryway storage.'
        },
        {
          id: 'home_office_organization',
          name: 'Home Office Organization',
          description: 'Advice on creating efficient, clutter-free home offices, including paper management and digital organization.'
        }
      ],
      gift_card_designs: [
        {
          id: 'neutral_stone_minimal',
          style: 'neutral',
          name: 'Neutral Stone Minimal',
          description: 'A clean, neutral design with soft stone tones suitable for any occasion.',
          image_url: 'https://i.poweredtemplates.com/p/print-templates/br/08/812/prt_slide_h_1.png',
          is_neutral: true
        },
        {
          id: 'minimal_line_art',
          style: 'minimal',
          name: 'Minimal Line Art',
          description: 'Simple line art on a white background for a modern, understated look.',
          image_url: 'https://pd12m.s3.us-west-2.amazonaws.com/images/6494ea2a-79c4-5223-98de-8882951806c2.jpeg',
          is_neutral: true
        },
        {
          id: 'subtle_birthday_confetti',
          style: 'birthday',
          name: 'Subtle Birthday Confetti',
          description: 'A light, tasteful confetti design with muted colors for birthdays.',
          image_url: 'https://pd12m.s3.us-west-2.amazonaws.com/images/67f74ce7-ff64-5a2e-8ad6-bb38cd76fa22.jpeg',
          is_neutral: false
        }
      ],
      package_categories: [
        {
          id: 'whole_home',
          name: 'Whole Home',
          description: 'Multi-room organizing packages designed to refresh your entire home, including bedrooms, living areas, and common spaces.',
          is_virtual: false
        },
        {
          id: 'closet_wardrobe_organization',
          name: 'Closet & Wardrobe Organization',
          description: 'Focused packages for closets, wardrobes, and dressing areas, from small reach-ins to full walk-in closets.',
          is_virtual: false
        },
        {
          id: 'virtual_decluttering_coaching',
          name: 'Virtual Decluttering Coaching',
          description: 'Remote coaching bundles delivered over video to guide you through decluttering and organizing your space.',
          is_virtual: true
        }
      ],
      payment_methods: [
        {
          id: 'pm_credit_card',
          code: 'credit_card',
          name: 'Credit Card',
          description: 'Pay securely online using a major credit card.',
          is_online: true,
          is_active: true
        },
        {
          id: 'pm_paypal',
          code: 'paypal',
          name: 'PayPal',
          description: 'Checkout quickly with your PayPal account.',
          is_online: true,
          is_active: true
        },
        {
          id: 'pm_apple_pay',
          code: 'apple_pay',
          name: 'Apple Pay',
          description: 'Use Apple Pay for a fast, secure checkout on supported devices.',
          is_online: true,
          is_active: true
        }
      ],
      product_categories: [
        {
          id: 'closet_wardrobe_storage',
          name: 'Closet & Wardrobe Storage',
          description: 'Bins, baskets, hangers, and organizers designed for closets and wardrobes.',
          image: 'https://i.pinimg.com/originals/26/71/44/267144978acfdbb3f8a8be0b5a462052.jpg'
        },
        {
          id: 'kitchen_storage',
          name: 'Kitchen & Pantry Storage',
          description: 'Canisters, racks, and organizers for kitchens, pantries, and cupboards.',
          image: 'https://www.thedesigntwins.com/wp-content/uploads/2019/01/IMG_4859.jpg'
        },
        {
          id: 'office_storage',
          name: 'Office & Paper Storage',
          description: 'File boxes, desktop organizers, and storage solutions for home offices.',
          image: 'https://images-na.ssl-images-amazon.com/images/I/61owJOhYwHL._SL3000_.jpg'
        }
      ],
      promo_codes: [
        {
          id: 'tidy10',
          code: 'TIDY10',
          description: 'Save 10% on eligible virtual services and packages.',
          discount_type: 'percentage',
          discount_value: 10,
          is_active: true,
          valid_from: '2026-01-01T00:00:00Z',
          valid_to: '2026-12-31T23:59:59Z',
          max_uses: 1000,
          applies_to: 'all'
        },
        {
          id: 'welcome15',
          code: 'WELCOME15',
          description: '15% off your first organizing product order.',
          discount_type: 'percentage',
          discount_value: 15,
          is_active: true,
          valid_from: '2025-10-01T00:00:00Z',
          valid_to: '2026-06-30T23:59:59Z',
          max_uses: 500,
          applies_to: 'products'
        },
        {
          id: 'bundle25',
          code: 'BUNDLE25',
          description: '$25 off select multi-session organizing packages.',
          discount_type: 'fixed_amount',
          discount_value: 25,
          is_active: false,
          valid_from: '2025-01-01T00:00:00Z',
          valid_to: '2025-12-31T23:59:59Z',
          max_uses: 200,
          applies_to: 'packages'
        }
      ],
      service_categories: [
        {
          id: 'home_office',
          name: 'Home Office Decluttering',
          description: 'In-home decluttering and organizing for home offices, desks, and paperwork.',
          is_virtual: false,
          image: 'https://certinspectors.com/wp-content/uploads/2020/08/home-office-tidy-desk-1080x675.jpg'
        },
        {
          id: 'closet_wardrobe_organization',
          name: 'Closet & Wardrobe Organization',
          description: 'Hands-on closet and wardrobe decluttering, sorting, and storage optimization.',
          is_virtual: false,
          image: 'https://i.pinimg.com/originals/26/71/44/267144978acfdbb3f8a8be0b5a462052.jpg'
        },
        {
          id: 'virtual_decluttering_coaching',
          name: 'Virtual Decluttering Coaching',
          description: 'Live video sessions to coach you through decluttering and organizing any space in your home.',
          is_virtual: true,
          image: 'https://pd12m.s3.us-west-2.amazonaws.com/images/2db0849a-f773-5f7e-86da-ca08165a1de0.jpeg'
        }
      ],
      shipping_methods: [
        {
          id: 'ship_standard',
          code: 'standard',
          name: 'Standard Shipping',
          description: 'Economy ground shipping for physical products and gift cards, typically 5–7 business days.',
          price: 6.95,
          is_default: true,
          is_available_for_products: true,
          is_available_for_gift_cards: true,
          is_free: false
        },
        {
          id: 'ship_express',
          code: 'express',
          name: 'Express Shipping',
          description: 'Faster shipping with delivery in 2–3 business days.',
          price: 14.95,
          is_default: false,
          is_available_for_products: true,
          is_available_for_gift_cards: true,
          is_free: false
        },
        {
          id: 'ship_overnight',
          code: 'overnight',
          name: 'Overnight Shipping',
          description: 'Next business day delivery for urgent physical orders.',
          price: 24.95,
          is_default: false,
          is_available_for_products: true,
          is_available_for_gift_cards: true,
          is_free: false
        }
      ],
      tags: [
        {
          id: 'small_kitchens',
          name: 'Small Kitchens',
          description: 'Content focused on organizing and maximizing storage in compact or small kitchens.'
        },
        {
          id: 'decluttering',
          name: 'Decluttering',
          description: 'Articles and resources centered on reducing clutter before organizing.'
        },
        {
          id: 'checklists',
          name: 'Checklists',
          description: 'Printable checklists and step-by-step guides for organizing projects.'
        }
      ],
      gift_card_products: [
        {
          id: 'giftcard_physical_classic',
          type: 'physical',
          name: 'Physical Gift Card',
          description: 'A premium, mailed gift card printed on heavyweight cardstock. Ideal for birthdays, holidays, and special occasions. Redeemable toward any in-home or virtual organizing service. Ships via Standard, Express, or Overnight Shipping.',
          min_amount: 50,
          max_amount: 500,
          predefined_amounts: [50, 75, 100, 150, 200, 250],
          is_active: true,
          image: 'https://cdn.shopify.com/s/files/1/0334/0078/2981/products/the-crest-physical-gift-card-gift-card-the-crest-home-772776_800x800.jpg?v=1603395232'
        },
        {
          id: 'giftcard_digital_instant',
          type: 'digital',
          name: 'Digital EGift Card',
          description: 'An instant egift card delivered by email, perfect for lastminute gifting. Can be used for services, packages, or products in the shop. Delivered via Digital Delivery.',
          min_amount: 25,
          max_amount: 500,
          predefined_amounts: [25, 50, 75, 100, 150, 200],
          is_active: true,
          image: 'https://173c3904f92a94b2216e-89dfc7b5924a3944d10ad3f86609d850.ssl.cf2.rackcdn.com/content/giftcards/sites/9/2019/10/wounded-warrior-egift-card-on-mobile-phone-digital.jpg'
        },
        {
          id: 'giftcard_physical_seasonal',
          type: 'physical',
          name: 'Seasonal Physical Gift Card',
          description: 'A limited-run physical gift card with a subtle seasonal design. Redeemable just like our classic card. Ships with Standard, Express, or Overnight Shipping options.',
          min_amount: 50,
          max_amount: 300,
          predefined_amounts: [50, 100, 150, 200],
          is_active: false,
          image: 'https://pd12m.s3.us-west-2.amazonaws.com/images/fa540bbc-dcba-5233-ac32-00eb13c619de.jpeg'
        }
      ],
      packages: [
        {
          id: 'pkg_whole_home_refresh',
          category_id: 'whole_home',
          name: 'Whole Home Refresh',
          slug: 'whole-home-refresh',
          description: 'A flexible whole-home organizing package ideal for small to mid-size homes. Includes planning, hands-on decluttering, and organizing for 2–4 bedrooms plus shared living spaces.',
          is_virtual: false,
          base_price: 549,
          total_hours: 12,
          session_count: 3,
          session_length_minutes: 240,
          min_bedrooms: 1,
          max_bedrooms: 5,
          base_bedrooms_included: 3,
          price_per_additional_bedroom: 85,
          status: 'active',
          can_be_booked: true,
          can_be_added_to_cart: true
        },
        {
          id: 'pkg_whole_home_reset_lite',
          category_id: 'whole_home',
          name: 'Whole Home Reset Lite',
          slug: 'whole-home-reset-lite',
          description: 'An 8-hour whole-home reset focused on the highest-impact areas such as the kitchen, living room, and primary bedroom.',
          is_virtual: false,
          base_price: 429,
          total_hours: 8,
          session_count: 2,
          session_length_minutes: 240,
          min_bedrooms: 1,
          max_bedrooms: 3,
          base_bedrooms_included: 2,
          price_per_additional_bedroom: 90,
          status: 'active',
          can_be_booked: true,
          can_be_added_to_cart: true
        },
        {
          id: 'pkg_whole_home_premium_plus',
          category_id: 'whole_home',
          name: 'Whole Home Premium Plus',
          slug: 'whole-home-premium-plus',
          description: 'An in-depth 18-hour whole-home transformation for larger homes or more complex projects. Ideal for 3–6 bedrooms and multiple living areas.',
          is_virtual: false,
          base_price: 799,
          total_hours: 18,
          session_count: 4,
          session_length_minutes: 270,
          min_bedrooms: 3,
          max_bedrooms: 6,
          base_bedrooms_included: 4,
          price_per_additional_bedroom: 95,
          status: 'active',
          can_be_booked: true,
          can_be_added_to_cart: true
        }
      ],
      products: [
        {
          id: 'prod_clear_bin_24l_stackable',
          category_id: 'closet_wardrobe_storage',
          name: 'Clear Stackable Storage Bin – 24L',
          slug: 'clear-stackable-storage-bin-24l',
          description: 'A crystal-clear 24L storage bin with a hinged lid, perfect for closets and wardrobes. Stackable design keeps contents visible and dust-free.',
          price: 19.99,
          capacity_liters: 24,
          dimensions: '16" L x 12" W x 10" H',
          color: 'Clear',
          material: 'BPA-free plastic',
          style: 'Modern clear',
          free_shipping: true,
          shipping_weight: 1.1,
          status: 'active',
          image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop&auto=format&q=80',
          created_at: '2025-11-15T10:00:00Z'
        },
        {
          id: 'prod_clear_bin_22l_with_lid',
          category_id: 'closet_wardrobe_storage',
          name: 'Clear Closet Bin with Lid – 22L',
          slug: 'clear-closet-bin-with-lid-22l',
          description: 'A 22L clear bin with snap-on lid ideal for seasonal clothing, handbags, or accessories in your closet.',
          price: 24.5,
          capacity_liters: 22,
          dimensions: '18" L x 11" W x 8" H',
          color: 'Clear',
          material: 'PET plastic',
          style: 'Clear lidded bin',
          free_shipping: true,
          shipping_weight: 1.0,
          status: 'active',
          image_url: 'https://images.unsplash.com/photo-1598966734799-f9c5c2b201f5?w=800&h=600&fit=crop&auto=format&q=80',
          created_at: '2025-10-02T09:30:00Z'
        },
        {
          id: 'prod_fabric_bin_28l_gray',
          category_id: 'closet_wardrobe_storage',
          name: 'Foldable Fabric Storage Cube – 28L, Gray',
          slug: 'foldable-fabric-storage-cube-28l-gray',
          description: 'A soft-sided 28L fabric cube with handle, great for shelves and cubbies in closets or living rooms.',
          price: 21.99,
          capacity_liters: 28,
          dimensions: '13" L x 13" W x 11" H',
          color: 'Gray',
          material: 'Polyester fabric',
          style: 'Fabric cube',
          free_shipping: false,
          shipping_weight: 0.8,
          status: 'active',
          image_url: 'https://images.unsplash.com/photo-1600585154084-4e5fe7c39198?w=800&h=600&fit=crop&auto=format&q=80',
          created_at: '2025-08-20T14:00:00Z'
        }
      ],
      services: [
        {
          id: 'svc_home_office_declutter',
          category_id: 'home_office',
          name: 'Home Office Decluttering Session',
          slug: 'home-office-decluttering-session',
          description: 'A focused decluttering and organizing session for your home office, including desk surfaces, drawers, and critical paperwork.',
          base_rate_per_hour: 95,
          default_duration_minutes: 120,
          is_bookable: true,
          is_virtual: false,
          status: 'active',
          image: 'https://images.unsplash.com/photo-1594904351111-7bcd590d0186?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'svc_home_office_paper_management',
          category_id: 'home_office',
          name: 'Paper Management & Filing Setup',
          slug: 'paper-management-filing-setup',
          description: 'Hands-on support to sort, purge, and file paperwork, and set up simple systems for incoming mail and documents.',
          base_rate_per_hour: 99,
          default_duration_minutes: 180,
          is_bookable: true,
          is_virtual: false,
          status: 'active',
          image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'svc_closet_refresh_session',
          category_id: 'closet_wardrobe_organization',
          name: 'Closet Refresh Session',
          slug: 'closet-refresh-session',
          description: 'A 3-hour in-home session to edit clothing, optimize hanging space, and introduce better storage solutions in one closet.',
          base_rate_per_hour: 90,
          default_duration_minutes: 180,
          is_bookable: true,
          is_virtual: false,
          status: 'active',
          image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=600&fit=crop&auto=format&q=80'
        }
      ],
      addon_services: [
        {
          id: 'addon_donation_dropoff_basic',
          name: 'Donation Drop-Off (Up to 1 Car Load)',
          description: 'We pack and transport one car load of donated items to a local charity partner after your session.',
          price: 35,
          applicable_package_ids: [
            'pkg_whole_home_refresh',
            'pkg_whole_home_reset_lite',
            'pkg_whole_home_premium_plus',
            'pkg_closet_confidence_10h',
            'pkg_walkin_transform_12h',
            'pkg_reachin_refresh_8h',
            'pkg_wardrobe_edit_6h'
          ],
          is_active: true,
          image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'addon_donation_dropoff_plus',
          name: 'Donation Drop-Off Plus (Up to 2 Car Loads)',
          description: 'Extended donation drop-off service for larger projects, covering up to two car loads.',
          price: 55,
          applicable_package_ids: [
            'pkg_whole_home_refresh',
            'pkg_whole_home_reset_lite',
            'pkg_whole_home_premium_plus',
            'pkg_closet_confidence_10h',
            'pkg_walkin_transform_12h'
          ],
          is_active: true,
          image: 'https://g5-assets-cld-res.cloudinary.com/image/upload/x_0,y_205,h_406,w_720,c_crop/q_auto,f_auto,fl_lossy,c_fill,g_center,h_406,w_720/v1581360471/g5/g5-c-5h4clywzg-apple-self-self-storage-client/g5-cl-1ir7jfmmxk-apple-self-storage/services/cardboard-boxes-in-home_buyzbx.jpg'
        },
        {
          id: 'addon_product_shopping_list',
          name: 'Product Shopping List & Links',
          description: 'Curated shopping list with links to storage products tailored to your space and budget.',
          price: 40,
          applicable_package_ids: [
            'pkg_whole_home_refresh',
            'pkg_whole_home_reset_lite',
            'pkg_closet_confidence_10h',
            'pkg_walkin_transform_12h',
            'pkg_virtual_coaching_3x60_basic',
            'pkg_virtual_coaching_3x60_plus',
            'pkg_virtual_coaching_3x45_starter'
          ],
          is_active: true,
          image: 'https://static.wixstatic.com/media/e4b968_28c06ab4858f4375b5b40fbbeaa2eac6.jpg'
        }
      ],
      product_variants: [
        {
          id: 'var_clear_bin_24l_single',
          product_id: 'prod_clear_bin_24l_stackable',
          name: 'Single Bin',
          color: 'Clear',
          material: 'BPA-free plastic',
          style: 'Stackable clear bin',
          sku: 'CB24L-CLR-1',
          is_default: true,
          image: 'https://article.images.consumerreports.org/f_auto/prod/content/dam/CRO-Images-2021/Home/04Apr/CR-Shopping-Inlinehero-under-bed-storage-0421'
        },
        {
          id: 'var_clear_bin_24l_2pack',
          product_id: 'prod_clear_bin_24l_stackable',
          name: '2-Pack',
          color: 'Clear',
          material: 'BPA-free plastic',
          style: 'Stackable clear bin (2-pack)',
          price_override: 36.99,
          sku: 'CB24L-CLR-2',
          is_default: false,
          free_shipping_override: true,
          image: 'https://images.unsplash.com/photo-1598966734799-f9c5c2b201f5?w=800&h=600&fit=crop&auto=format&q=80'
        },
        {
          id: 'var_clear_bin_22l_single',
          product_id: 'prod_clear_bin_22l_with_lid',
          name: 'Single Bin with Lid',
          color: 'Clear',
          material: 'PET plastic',
          style: 'Clear bin with snap lid',
          sku: 'CB22L-CLR-LID-1',
          is_default: true,
          image: 'https://declutterinminutes.com/wp-content/uploads/2019/07/jeans-in-closet-2.jpg'
        }
      ],
      session_options: [
        {
          id: 'sess_home_office_120',
          service_id: 'svc_home_office_declutter',
          name: '2-hour session',
          duration_minutes: 120,
          base_price: 190,
          description: 'Ideal for a focused declutter of a small home office or workspace zone.',
          is_default: true,
          is_active: true
        },
        {
          id: 'sess_home_office_180',
          service_id: 'svc_home_office_declutter',
          name: '3-hour deep dive session',
          duration_minutes: 180,
          base_price: 280,
          description: 'Extra time for paper sorting and drawer organization.',
          is_default: false,
          is_active: true
        },
        {
          id: 'sess_home_office_240',
          service_id: 'svc_home_office_declutter',
          name: '4-hour power session',
          duration_minutes: 240,
          base_price: 360,
          description: 'Best for a full home office reset including paper, supplies, and digital planning.',
          is_default: false,
          is_active: true
        }
      ],
      availability_slots: [
        {
          id: 'slot_svc_home_office_20260918_1000',
          service_id: 'svc_home_office_declutter',
          session_option_id: 'sess_home_office_120',
          start_datetime: '2026-09-18T10:00:00Z',
          end_datetime: '2026-09-18T12:00:00Z',
          duration_minutes: 120,
          price_total: 170,
          location_type: 'in_home',
          is_available: true,
          notes: 'Morning availability for home office decluttering.'
        },
        {
          id: 'slot_svc_home_office_20260918_1400',
          service_id: 'svc_home_office_declutter',
          session_option_id: 'sess_home_office_120',
          start_datetime: '2026-09-18T14:00:00Z',
          end_datetime: '2026-09-18T16:00:00Z',
          duration_minutes: 120,
          price_total: 175,
          location_type: 'in_home',
          is_available: true,
          notes: 'Afternoon slot eligible for 2:00–6:00 pm window.'
        },
        {
          id: 'slot_svc_home_office_20260918_1430',
          service_id: 'svc_home_office_declutter',
          session_option_id: 'sess_home_office_120',
          start_datetime: '2026-09-18T14:30:00Z',
          end_datetime: '2026-09-18T16:30:00Z',
          duration_minutes: 120,
          price_total: 185,
          location_type: 'in_home',
          is_available: true,
          notes: 'Staggered afternoon start time.'
        }
      ],
      articles: [
        {
          id: 'art_small_kitchen_big_impact',
          title: 'Small Kitchen, Big Impact: 7 Steps to a Clutter-Free Cooking Space',
          slug: 'small-kitchen-big-impact-7-steps-clutter-free-cooking-space',
          category_id: 'kitchen_organization',
          tag_ids: ['small_kitchens', 'decluttering', 'checklists'],
          excerpt: 'Working with a tiny kitchen? Use these seven practical steps to clear counters, reclaim cabinets, and make cooking feel easy again.',
          content: 'If you have a compact kitchen, every square inch matters. The goal isn’t to add more stuff – it’s to make what you already own easier to see, reach, and put away.\n\nStep 1: Do a quick sweep of obvious clutter. Recycle takeout menus you never use, expired coupons, and broken gadgets.\nStep 2: Empty one zone at a time (like the utensil drawer) so you don’t overwhelm the whole space.\nStep 3: Use a simple three-pile system: everyday, occasional, and donate.\nStep 4: Contain by category. Clear bins for baking, snacks, or grab-and-go breakfast keep tiny cabinets under control.\nStep 5: Claim vertical space with shelf risers and hooks.\nStep 6: Set a “max capacity” rule for mugs, water bottles, and food storage containers.\nStep 7: Finish with a five-minute reset routine you can repeat every night.\n\nUse the accompanying checklist to move through your small kitchen in logical order and track your progress.',
          hero_image_url: 'https://designingidea.com/wp-content/uploads/2019/05/organized-modern-kitchen-with-open-shelving-ss.jpg',
          published_at: '2026-02-20T09:00:00Z',
          reading_time_minutes: 8,
          is_featured: true,
          related_download_ids: []
        },
        {
          id: 'art_studio_kitchen_storage',
          title: 'Smart Storage for Studio Apartment Kitchens',
          slug: 'smart-storage-for-studio-apartment-kitchens',
          category_id: 'kitchen_organization',
          tag_ids: ['small_kitchens', 'decluttering'],
          excerpt: 'Turn a one-wall or corner kitchen into a functional cooking zone with a few simple storage upgrades.',
          content: 'In a studio apartment, your kitchen often shares visual space with your living and sleeping areas. That makes visual clutter even more stressful.\n\nStart by limiting each category to what fits in its assigned home: one bin for snacks, one for baking, one for coffee and tea. Add stackable clear bins inside cabinets to create levels, and use the inside of doors for slim organizers. A rolling cart can act as a flexible pantry or coffee station that tucks against the wall when not in use.\n\nThe key is choosing storage that matches how you actually cook and shop, not how you think you should.',
          hero_image_url: 'https://justagirlandherblog.com/wp-content/uploads/2020/09/White-Towels-453x680.jpg',
          published_at: '2025-11-05T14:30:00Z',
          reading_time_minutes: 7,
          is_featured: false,
          related_download_ids: []
        },
        {
          id: 'art_pantry_zones_101',
          title: 'Pantry Zones 101: How to Organize Food So You Actually Use It',
          slug: 'pantry-zones-101-organize-food-use-it',
          category_id: 'kitchen_organization',
          tag_ids: ['decluttering'],
          excerpt: 'Create simple zones so you can see what you have, avoid overbuying, and make weeknight meals easier.',
          content: 'A zoned pantry isn’t about matching containers; it’s about making decisions once so you don’t have to keep re-organizing.\n\nGroup items into broad categories—such as breakfasts, baking, snacks, dinners, and backstock—and assign each a shelf or bin. Declutter as you go, checking expiration dates and removing foods your household no longer eats. Store everyday items at eye level and place backstock higher or lower.\n\nOnce zones are set, label shelves or bins so everyone knows where items belong.',
          hero_image_url: 'https://homemadeourway.com/wp-content/uploads/2018/04/Top-Pantry-Filled.jpg',
          published_at: '2025-08-10T10:00:00Z',
          reading_time_minutes: 9,
          is_featured: false,
          related_download_ids: []
        }
      ],
      downloads: [
        {
          id: 'dl_kitchen_declutter_checklist',
          title: 'Small Kitchen Decluttering Checklist',
          slug: 'small-kitchen-decluttering-checklist',
          description: 'A step-by-step printable checklist that walks you through decluttering a small or galley kitchen, one zone at a time.',
          price: 0,
          is_free: true,
          file_format: 'pdf',
          download_url: 'https://arxiv.org/pdf/2404.07972',
          preview_image_url: 'https://pd12m.s3.us-west-2.amazonaws.com/images/981e1d57-97cc-515f-91b5-54251e4eca8c.png',
          created_at: '2026-02-18T09:00:00Z',
          related_article_ids: [
            'art_small_kitchen_big_impact',
            'art_tiny_galley_makeover',
            'art_holiday_kitchen_prep'
          ],
          type: 'checklist'
        },
        {
          id: 'dl_studio_kitchen_space_planner',
          title: 'Studio Kitchen Space Planner',
          slug: 'studio-kitchen-space-planner',
          description: 'Use this printable planner to map zones, measure cabinets, and plan storage for one-wall or corner studio kitchens.',
          price: 4.0,
          is_free: false,
          file_format: 'pdf',
          download_url: 'https://arxiv.org/pdf/2404.07972',
          preview_image_url: 'https://www.digsdigs.com/photos/2020/08/02-The-whole-apartment-is-an-open-layout-with-a-kitchen-a-dining-working-space-and-a-sleeping-zone-775x517.jpg',
          created_at: '2025-11-06T10:15:00Z',
          related_article_ids: ['art_studio_kitchen_storage'],
          type: 'guide'
        },
        {
          id: 'dl_pantry_zone_labels',
          title: 'Printable Pantry Zone Labels (Minimal Style)',
          slug: 'printable-pantry-zone-labels-minimal',
          description: 'A set of minimalist labels for common pantry zones like snacks, baking, dinners, and backstock.',
          price: 5.0,
          is_free: false,
          file_format: 'pdf',
          download_url: 'https://arxiv.org/pdf/2404.07972',
          preview_image_url: 'https://i.pinimg.com/originals/9a/cd/cd/9acdcdccbcbc602714521c571b8ea08e.jpg',
          created_at: '2025-08-12T09:30:00Z',
          related_article_ids: ['art_pantry_zones_101'],
          type: 'template'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:17:43.224966'
      }
    };

    // Copy generated data into localStorage using storage keys
    localStorage.setItem('blog_categories', JSON.stringify(generatedData.blog_categories));
    localStorage.setItem('gift_card_designs', JSON.stringify(generatedData.gift_card_designs));
    localStorage.setItem('package_categories', JSON.stringify(generatedData.package_categories));
    localStorage.setItem('payment_methods', JSON.stringify(generatedData.payment_methods));
    localStorage.setItem('product_categories', JSON.stringify(generatedData.product_categories));
    localStorage.setItem('promo_codes', JSON.stringify(generatedData.promo_codes));
    localStorage.setItem('service_categories', JSON.stringify(generatedData.service_categories));
    localStorage.setItem('shipping_methods', JSON.stringify(generatedData.shipping_methods));
    localStorage.setItem('tags', JSON.stringify(generatedData.tags));
    localStorage.setItem('gift_card_products', JSON.stringify(generatedData.gift_card_products));
    localStorage.setItem('packages', JSON.stringify(generatedData.packages));
    localStorage.setItem('products', JSON.stringify(generatedData.products));
    localStorage.setItem('services', JSON.stringify(generatedData.services));
    localStorage.setItem('addon_services', JSON.stringify(generatedData.addon_services));
    localStorage.setItem('product_variants', JSON.stringify(generatedData.product_variants));
    localStorage.setItem('session_options', JSON.stringify(generatedData.session_options));
    localStorage.setItem('availability_slots', JSON.stringify(generatedData.availability_slots));
    localStorage.setItem('articles', JSON.stringify(generatedData.articles));
    localStorage.setItem('downloads', JSON.stringify(generatedData.downloads));
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
  }

  // Run all flow tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_BookHomeOfficeSessionUnder200();
    this.testTask2_CustomWholeHomePackageWithAddons();
    this.testTask3_BuyClearStorageBinsWithFilters();
    this.testTask4_VirtualCoachingBundleWithPromo();
    this.testTask5_SubmitInHomeAssessmentRequest();
    this.testTask6_SaveArticleAndAddFreeChecklist();
    this.testTask7_BuyPhysicalGiftCardWithShipping();
    this.testTask8_SelectLongHoursPackageAndCheckAvailability();

    return this.results;
  }

  // Task 1: Book a 2-hour home office decluttering session under $200
  testTask1_BookHomeOfficeSessionUnder200() {
    const testName = 'Task 1: Book 2-hour home office session under $200';
    try {
      // Simulate homepage -> Book Now
      const homeSummary = this.logic.getHomePageSummary();
      this.assert(homeSummary && homeSummary.primary_cta, 'Homepage summary should include primary CTA');

      // Booking entry: list bookable services/packages
      const bookable = this.logic.getBookableServicesAndPackages();
      this.assert(bookable && Array.isArray(bookable.services), 'Bookable services list should be returned');

      // Find a home office service dynamically
      const homeOfficeService = bookable.services.find(function (s) {
        const name = (s.name || '').toLowerCase();
        const cat = (s.category_name || '').toLowerCase();
        return name.indexOf('home office') !== -1 || cat.indexOf('home office') !== -1;
      });
      this.assert(homeOfficeService, 'Should find a Home Office service to book');

      // Get booking options and session options for that service
      const bookingOptions = this.logic.getBookingOptions(homeOfficeService.service_id, null);
      this.assert(
        bookingOptions && Array.isArray(bookingOptions.session_options) && bookingOptions.session_options.length > 0,
        'Booking options should include at least one session option'
      );

      // Select 2-hour session (120 minutes) if available
      const sessionOption =
        bookingOptions.session_options.find(function (opt) {
          return opt.duration_minutes === 120 || (opt.name || '').toLowerCase().indexOf('2-hour') !== -1;
        }) || bookingOptions.session_options[0];
      this.assert(sessionOption && sessionOption.session_option_id, 'Selected session option should be valid');

      const sessionOptionId = sessionOption.session_option_id;

      // First, get all slots for this service + session option to locate an afternoon slot under $200
      const allSlotsResponse = this.logic.getAvailabilitySlots(
        homeOfficeService.service_id,
        null,
        sessionOptionId,
        null,
        null,
        null,
        null,
        null
      );
      this.assert(allSlotsResponse && Array.isArray(allSlotsResponse.slots), 'All slots response should contain slots array');

      let afternoonCandidate = null;
      for (let i = 0; i < allSlotsResponse.slots.length; i++) {
        const slot = allSlotsResponse.slots[i];
        if (!slot.is_available) continue;
        const start = new Date(slot.start_datetime);
        const hour = start.getUTCHours();
        if (hour >= 14 && hour < 17 && slot.price_total < 200) {
          afternoonCandidate = slot;
          break;
        }
      }
      this.assert(afternoonCandidate, 'Should find at least one afternoon slot under $200');

      const targetDate = afternoonCandidate.start_datetime.substring(0, 10); // YYYY-MM-DD

      // Now query specifically for that date and 2–5 pm window, sorted by price low->high
      const filteredSlotsResponse = this.logic.getAvailabilitySlots(
        homeOfficeService.service_id,
        null,
        sessionOptionId,
        targetDate,
        '14:00',
        '17:00',
        null,
        'price_low_to_high'
      );
      this.assert(
        filteredSlotsResponse &&
          Array.isArray(filteredSlotsResponse.slots) &&
          filteredSlotsResponse.slots.length > 0,
        'Filtered afternoon slots should be available'
      );

      const selectedSlot = filteredSlotsResponse.slots[0];
      this.assert(selectedSlot.price_total < 200, 'Selected slot price should be under $200');

      // Get payment options for direct bookings
      const paymentOptions = this.logic.getBookingPaymentOptions();
      this.assert(Array.isArray(paymentOptions) && paymentOptions.length > 0, 'Booking payment options should be returned');

      const payAtAppt =
        paymentOptions.find(function (p) {
          return p.code === 'pay_at_appointment';
        }) || paymentOptions[0];
      this.assert(payAtAppt && payAtAppt.code, 'Should have a payment option to use');

      // Create booking
      const bookingResult = this.logic.createBooking(
        selectedSlot.availability_slot_id,
        sessionOptionId,
        'Alex Rivera',
        'alex.rivera@example.com',
        '555-123-7890',
        payAtAppt.code,
        null
      );

      this.assert(bookingResult && bookingResult.success === true, 'Booking should succeed');
      this.assert(bookingResult.booking && bookingResult.booking.booking_id, 'Booking should have an ID');
      this.assert(
        bookingResult.booking.customer_name === 'Alex Rivera',
        'Booking customer name should match input'
      );

      // Verify booking persisted in storage
      const bookingsRaw = localStorage.getItem('bookings') || '[]';
      const bookings = JSON.parse(bookingsRaw);
      const storedBooking = bookings.find(function (b) {
        return b.id === bookingResult.booking.booking_id;
      });
      this.assert(storedBooking, 'Stored booking should be found in localStorage');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Customize Whole Home package with 3 bedrooms and limited-cost add-ons
  testTask2_CustomWholeHomePackageWithAddons() {
    const testName = 'Task 2: Customize Whole Home package with 3 bedrooms and add-ons';
    try {
      // Simulate navigation to Packages and Whole Home category
      const categories = this.logic.getPackageCategories();
      this.assert(Array.isArray(categories) && categories.length > 0, 'Package categories should be returned');

      const wholeHomeCategory = categories.find(function (c) {
        return c.category_id === 'whole_home' || (c.name || '').toLowerCase().indexOf('whole home') !== -1;
      });
      this.assert(wholeHomeCategory, 'Whole Home package category should exist');

      // List packages in Whole Home category
      const packages = this.logic.listPackages(
        wholeHomeCategory.category_id,
        null,
        null,
        null,
        null,
        'price_low_to_high'
      );
      this.assert(Array.isArray(packages) && packages.length > 0, 'Whole Home packages should be listed');

      // Select "Whole Home Refresh" if available, otherwise the first package
      const targetPackage =
        packages.find(function (p) {
          return (p.name || '').toLowerCase().indexOf('refresh') !== -1;
        }) || packages[0];
      this.assert(targetPackage && targetPackage.package_id, 'Target Whole Home package should be selected');

      const packageId = targetPackage.package_id;

      // Load package details to configure bedrooms and add-ons
      const details = this.logic.getPackageDetails(packageId);
      this.assert(details && details.package_id === packageId, 'Package details should match selected package');

      const bedrooms = 3;

      const addons = Array.isArray(details.applicable_addons) ? details.applicable_addons : [];
      const affordableAddons = addons.filter(function (a) {
        return a.is_active && a.price < 50;
      });
      this.assert(affordableAddons.length >= 2, 'There should be at least two add-ons under $50');

      const addon1 = affordableAddons[0];
      let addon2 = null;
      for (let i = 1; i < affordableAddons.length; i++) {
        const candidate = affordableAddons[i];
        if (addon1.addon_id !== candidate.addon_id && addon1.price + candidate.price < 80) {
          addon2 = candidate;
          break;
        }
      }
      this.assert(addon2, 'Should find a second add-on so combined price is under $80');

      const selectedAddonIds = [addon1.addon_id, addon2.addon_id];

      // Preview configuration pricing and summary
      const preview = this.logic.previewPackageConfiguration(packageId, bedrooms, selectedAddonIds);
      this.assert(preview && preview.package_id === packageId, 'Preview should reference correct package');
      this.assert(preview.bedrooms === bedrooms, 'Preview bedrooms should match configuration');
      this.assert(
        Array.isArray(preview.selected_addons) && preview.selected_addons.length === 2,
        'Preview should list exactly two selected add-ons'
      );

      const computedAddonsTotal = preview.selected_addons.reduce(function (sum, a) {
        return sum + a.price;
      }, 0);
      this.assert(
        preview.addons_total_price === computedAddonsTotal,
        'addons_total_price should equal sum of selected add-on prices'
      );

      // Add configured package to cart
      const addResult = this.logic.addPackageToCartFromConfiguration(
        packageId,
        bedrooms,
        selectedAddonIds,
        1
      );
      this.assert(addResult && addResult.success === true, 'Adding configured package to cart should succeed');
      this.assert(addResult.cart_id && addResult.cart_item_id, 'Cart ID and cart item ID should be returned');

      const cart = this.logic.getCart();
      this.assert(cart && Array.isArray(cart.items), 'Cart should be retrievable with items array');

      const addedItem = cart.items.find(function (item) {
        return item.cart_item_id === addResult.cart_item_id;
      });
      this.assert(addedItem, 'Configured package cart item should be present in cart');
      this.assert(addedItem.item_type === 'package', 'Cart item should be of type package');
      this.assert(addedItem.quantity === 1, 'Package quantity should be 1');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Buy 4 clear storage bins with rating, capacity, price, and free shipping filters
  testTask3_BuyClearStorageBinsWithFilters() {
    const testName = 'Task 3: Buy 4 clear storage bins with filters';
    try {
      // Navigate to Shop -> Closet & Wardrobe Storage category
      const categories = this.logic.getProductCategories();
      this.assert(Array.isArray(categories) && categories.length > 0, 'Product categories should be returned');

      const closetCategory = categories.find(function (c) {
        return (
          c.category_id === 'closet_wardrobe_storage' ||
          (c.name || '').toLowerCase().indexOf('closet') !== -1
        );
      });
      this.assert(closetCategory, 'Closet & Wardrobe Storage category should exist');

      // Inspect filter options and pick a rating threshold >= 4 if available
      const filterOptions = this.logic.getProductFilterOptions(closetCategory.category_id);
      let minRating = null;
      if (filterOptions && Array.isArray(filterOptions.rating_options) && filterOptions.rating_options.length > 0) {
        const sortedRatings = filterOptions.rating_options.slice().sort(function (a, b) {
          return a - b;
        });
        for (let i = 0; i < sortedRatings.length; i++) {
          if (sortedRatings[i] >= 4) {
            minRating = sortedRatings[i];
            break;
          }
        }
      }

      const minPrice = 15;
      const maxPrice = 30;
      const minCapacity = 20;
      const color = 'Clear';

      // Search products with filters; if overly strict (minRating) returns none, retry without rating filter
      let products = this.logic.searchProducts(
        closetCategory.category_id,
        minPrice,
        maxPrice,
        minRating,
        minCapacity,
        color,
        null,
        null,
        true,
        'price_low_to_high'
      );

      if (!products || products.length === 0) {
        products = this.logic.searchProducts(
          closetCategory.category_id,
          minPrice,
          maxPrice,
          null,
          minCapacity,
          color,
          null,
          null,
          true,
          'price_low_to_high'
        );
      }

      this.assert(Array.isArray(products) && products.length > 0, 'At least one filtered product should be returned');

      const selectedProduct = products[0];
      this.assert(selectedProduct.product_id, 'Selected product should have an ID');

      // Verify product actually meets constraints using returned data
      this.assert(
        selectedProduct.price >= minPrice && selectedProduct.price <= maxPrice,
        'Selected product price should be within range'
      );
      if (typeof selectedProduct.capacity_liters === 'number') {
        this.assert(
          selectedProduct.capacity_liters >= minCapacity,
          'Selected product capacity should be at least minimum'
        );
      }
      this.assert(
        (selectedProduct.color || '').toLowerCase().indexOf('clear') !== -1,
        'Selected product color should indicate clear'
      );
      this.assert(selectedProduct.free_shipping === true, 'Selected product should have free shipping');

      // Add quantity 4 of the selected product to the cart
      const quantity = 4;
      const addResult = this.logic.addProductToCart(selectedProduct.product_id, null, quantity);
      this.assert(addResult && addResult.success === true, 'Adding product to cart should succeed');
      this.assert(addResult.cart_id && addResult.cart_item_id, 'Cart ID and cart item ID should be returned');

      const cart = this.logic.getCart();
      this.assert(cart && Array.isArray(cart.items), 'Cart should be retrievable');

      const cartItem = cart.items.find(function (item) {
        return item.cart_item_id === addResult.cart_item_id;
      });
      this.assert(cartItem, 'Added product should appear in cart');
      this.assert(cartItem.quantity === quantity, 'Cart quantity should match requested quantity');
      this.assert(cartItem.item_type === 'product', 'Cart item type should be product');

      const expectedLineSubtotal = cartItem.unit_price * quantity;
      this.assert(
        Math.abs(cartItem.line_subtotal - expectedLineSubtotal) < 0.0001,
        'Cart line subtotal should equal unit_price * quantity'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Purchase cheapest 3-session virtual coaching bundle (adapted) and apply promo code
  testTask4_VirtualCoachingBundleWithPromo() {
    const testName = 'Task 4: Virtual coaching bundle with promo code TIDY10';
    try {
      // Try to list 3x60 virtual coaching bundles; adapt if data is limited
      let bundles = this.logic.listVirtualCoachingBundles(3, 60, null, null, 'price_low_to_high');

      if (!bundles || bundles.length === 0) {
        // Try listing all virtual bundles without filters
        bundles = this.logic.listVirtualCoachingBundles(null, null, null, null, 'price_low_to_high');
      }

      if (!bundles || bundles.length === 0) {
        // Fallback: use general packages as stand-in bundles (adapted to limited data)
        const virtualPackages = this.logic.listPackages(
          'virtual_decluttering_coaching',
          null,
          null,
          null,
          null,
          'price_low_to_high'
        );
        if (virtualPackages && virtualPackages.length > 0) {
          bundles = virtualPackages;
        } else {
          const allPackages = this.logic.listPackages(null, null, null, null, null, 'price_low_to_high');
          this.assert(allPackages && allPackages.length > 0, 'At least one package must exist for fallback bundle test');
          bundles = allPackages;
        }
      }

      this.assert(Array.isArray(bundles) && bundles.length > 0, 'At least one bundle/package should be available');

      const cheapestBundle = bundles[0];
      this.assert(cheapestBundle.package_id, 'Selected bundle/package should have an ID');

      const packageId = cheapestBundle.package_id;

      // Add this bundle/package to cart (no bedrooms/add-ons for this flow)
      const addResult = this.logic.addPackageToCartFromConfiguration(packageId, null, null, 1);
      this.assert(addResult && addResult.success === true, 'Adding bundle/package to cart should succeed');

      // Apply promo code TIDY10 at checkout
      const promoResult = this.logic.applyPromoCodeToCart('TIDY10');
      this.assert(promoResult && promoResult.success === true, 'Applying promo code TIDY10 should succeed');
      this.assert(
        promoResult.cart && promoResult.cart.applied_promo_code === 'TIDY10',
        'Cart should record applied promo code TIDY10'
      );

      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && checkoutSummary.cart_id, 'Checkout summary should return a cart ID');
      this.assert(
        checkoutSummary.applied_promo_code === 'TIDY10',
        'Checkout summary should reflect applied promo code'
      );

      if (checkoutSummary.subtotal > 0) {
        this.assert(
          checkoutSummary.discount_total > 0,
          'Discount total should be greater than zero when promo is applied to non-free items'
        );
        this.assert(
          checkoutSummary.total ===
            checkoutSummary.subtotal + checkoutSummary.shipping_total - checkoutSummary.discount_total,
          'Total should equal subtotal + shipping - discount'
        );
      }

      // Start checkout (proceed to payment step)
      const startResult = this.logic.startCheckout('Jordan Kim', 'jordan.kim@example.com');
      this.assert(startResult && startResult.success === true, 'startCheckout should succeed');
      this.assert(startResult.order_id, 'Order ID should be returned');

      const paymentSummary = this.logic.getPaymentSummary(startResult.order_id);
      this.assert(paymentSummary && paymentSummary.order_id === startResult.order_id, 'Payment summary should match order ID');
      this.assert(
        paymentSummary.promo_code === 'TIDY10',
        'Payment summary should carry through applied promo code'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Submit an in-home assessment request for a 2-bedroom, 900 sq ft apartment with budget note
  testTask5_SubmitInHomeAssessmentRequest() {
    const testName = 'Task 5: Submit in-home assessment request';
    try {
      // Load assessment information content
      const assessmentInfo = this.logic.getAssessmentInfo();
      this.assert(assessmentInfo && assessmentInfo.headline, 'Assessment info should include a headline');

      // Submit assessment request with provided details
      const notesText =
        'Looking for an initial assessment for a 2-bedroom, 900 sq ft apartment. My budget for the first project is under $400.';

      const submitResult = this.logic.submitAssessmentRequest(
        'Taylor Morgan',
        'taylor.morgan@example.com',
        '555-222-3344',
        'Downtown District',
        'apartment',
        2,
        900,
        'wednesday',
        'evening_5_8',
        notesText,
        400
      );

      this.assert(submitResult && submitResult.success === true, 'Assessment request submission should succeed');
      this.assert(submitResult.assessment_request_id, 'Assessment request ID should be returned');
      this.assert(submitResult.status === 'submitted', 'Initial assessment request status should be submitted');

      // Verify assessment request persisted in storage
      const raw = localStorage.getItem('assessment_requests') || '[]';
      const requests = JSON.parse(raw);
      const stored = requests.find(function (r) {
        return r.id === submitResult.assessment_request_id;
      });
      this.assert(stored, 'Stored assessment request should be found');
      this.assert(stored.name === 'Taylor Morgan', 'Stored request name should match input');
      this.assert(stored.home_type === 'apartment', 'Stored home type should be apartment');
      this.assert(stored.bedrooms === 2, 'Stored bedrooms should be 2');
      this.assert(stored.square_footage === 900, 'Stored square footage should be 900');
      this.assert(
        (stored.notes || '').indexOf('under $400') !== -1,
        'Stored notes should mention budget under $400'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Save recent small-kitchen article and add a free checklist to cart
  testTask6_SaveArticleAndAddFreeChecklist() {
    const testName = 'Task 6: Save small-kitchen article and add free checklist to cart';
    try {
      // Navigate to blog/resources and get filter options
      const filterOptions = this.logic.getBlogFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.categories), 'Blog filter categories should be returned');

      const kitchenCategory = filterOptions.categories.find(function (c) {
        return (
          c.category_id === 'kitchen_organization' ||
          (c.name || '').toLowerCase().indexOf('kitchen') !== -1
        );
      });
      this.assert(kitchenCategory, 'Kitchen Organization blog category should exist');

      const smallKitchensTag = filterOptions.tags.find(function (t) {
        return t.tag_id === 'small_kitchens' || (t.name || '').toLowerCase().indexOf('small kitchen') !== -1;
      });
      this.assert(smallKitchensTag, 'Small Kitchens tag should exist');

      // List articles for category+tag within last 6 months, newest first
      const articles = this.logic.listArticles(
        kitchenCategory.category_id,
        smallKitchensTag.tag_id,
        'last_6_months',
        'newest_first'
      );
      this.assert(Array.isArray(articles) && articles.length > 0, 'There should be at least one recent small-kitchen article');

      const selectedArticle = articles[0];
      this.assert(selectedArticle.article_id, 'Selected article should have an ID');

      // Open article details
      const articleDetails = this.logic.getArticleDetails(selectedArticle.article_id);
      this.assert(articleDetails && articleDetails.article_id === selectedArticle.article_id, 'Article details should match selected article');

      // Save to reading list
      const saveResult = this.logic.saveArticleToReadingList(selectedArticle.article_id);
      this.assert(saveResult && saveResult.success === true, 'Saving article to reading list should succeed');

      const readingList = this.logic.getReadingList();
      this.assert(Array.isArray(readingList) && readingList.length > 0, 'Reading list should contain at least one item');
      const savedItem = readingList.find(function (item) {
        return item.article_id === selectedArticle.article_id;
      });
      this.assert(savedItem, 'Selected article should be present in reading list');

      // Locate a free checklist related resource from article details
      const related = Array.isArray(articleDetails.related_resources)
        ? articleDetails.related_resources
        : [];
      let freeChecklist = related.find(function (r) {
        return r.is_free && (r.type === 'checklist' || (r.title || '').toLowerCase().indexOf('checklist') !== -1);
      });

      // If article did not directly list related resources, fall back to downloads data to find a suitable checklist
      if (!freeChecklist) {
        const downloadsRaw = localStorage.getItem('downloads') || '[]';
        const downloads = JSON.parse(downloadsRaw);
        const candidate = downloads.find(function (d) {
          const isLinked = Array.isArray(d.related_article_ids)
            ? d.related_article_ids.indexOf(selectedArticle.article_id) !== -1
            : false;
          return isLinked && d.is_free && d.type === 'checklist';
        });
        if (candidate) {
          freeChecklist = {
            download_id: candidate.id,
            title: candidate.title,
            type: candidate.type,
            price: candidate.price,
            is_free: candidate.is_free
          };
        }
      }

      this.assert(freeChecklist && freeChecklist.download_id, 'A free checklist related to the article should be found');

      // Open checklist detail and add to cart
      const downloadDetails = this.logic.getDownloadDetails(freeChecklist.download_id);
      this.assert(downloadDetails && downloadDetails.download_id === freeChecklist.download_id, 'Download details should match selected checklist');
      this.assert(downloadDetails.is_free === true, 'Checklist should be free');
      this.assert(downloadDetails.price === 0, 'Checklist price should be 0');

      const addResult = this.logic.addDownloadToCart(freeChecklist.download_id, 1);
      this.assert(addResult && addResult.success === true, 'Adding free checklist to cart should succeed');

      const cart = this.logic.getCart();
      this.assert(cart && Array.isArray(cart.items), 'Cart should be retrievable');

      const cartItem = cart.items.find(function (item) {
        return item.cart_item_id === addResult.cart_item_id;
      });
      this.assert(cartItem, 'Checklist cart item should be present');
      this.assert(cartItem.item_type === 'download', 'Checklist cart item type should be download');
      this.assert(cartItem.is_free === true, 'Checklist cart item should be marked free');
      this.assert(cartItem.unit_price === 0, 'Checklist unit price should be 0');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Purchase a $150 physical gift card with neutral design and standard shipping under $8
  testTask7_BuyPhysicalGiftCardWithShipping() {
    const testName = 'Task 7: Buy $150 physical gift card with neutral design and standard shipping';
    try {
      // Navigate to Gift Cards page and load options
      const options = this.logic.getGiftCardOptions();
      this.assert(options && Array.isArray(options.gift_card_products), 'Gift card products should be returned');
      this.assert(Array.isArray(options.designs), 'Gift card designs should be returned');

      // Choose an active physical gift card product
      const physicalProduct = options.gift_card_products.find(function (p) {
        return p.type === 'physical' && p.is_active;
      });
      this.assert(physicalProduct, 'An active physical gift card product should exist');

      const amount = 150;
      if (typeof physicalProduct.min_amount === 'number') {
        this.assert(amount >= physicalProduct.min_amount, 'Gift card amount should be >= min_amount');
      }
      if (typeof physicalProduct.max_amount === 'number') {
        this.assert(amount <= physicalProduct.max_amount, 'Gift card amount should be <= max_amount');
      }

      // Choose a neutral/minimal design
      const neutralDesign = options.designs.find(function (d) {
        return d.is_neutral || d.style === 'neutral' || d.style === 'minimal';
      });
      this.assert(neutralDesign, 'A neutral or minimal gift card design should be available');

      // Add configured gift card to cart
      const addResult = this.logic.addGiftCardToCart(
        physicalProduct.gift_card_product_id || physicalProduct.id,
        neutralDesign.design_id,
        amount,
        'birthday',
        'Sam Lee',
        'Pat Jordan',
        'Happy birthday – enjoy a clutter-free home!',
        1
      );

      this.assert(addResult && addResult.success === true, 'Adding gift card to cart should succeed');
      this.assert(addResult.cart_item_id && addResult.gift_card_configuration_id, 'Gift card cart item and configuration IDs should be returned');

      const cart = this.logic.getCart();
      this.assert(cart && Array.isArray(cart.items), 'Cart should be retrievable');

      const giftCardItem = cart.items.find(function (item) {
        return item.cart_item_id === addResult.cart_item_id;
      });
      this.assert(giftCardItem, 'Gift card cart item should be present');
      this.assert(giftCardItem.item_type === 'gift_card', 'Cart item should be of type gift_card');
      this.assert(giftCardItem.quantity === 1, 'Gift card quantity should be 1');
      this.assert(giftCardItem.unit_price === amount, 'Gift card unit price should match configured amount');

      // Get available shipping methods for this cart item and choose Standard under $8
      const shippingMethods = this.logic.getShippingMethodsForCartItem(giftCardItem.cart_item_id);
      this.assert(Array.isArray(shippingMethods) && shippingMethods.length > 0, 'Shipping methods should be available for gift card');

      const standard = shippingMethods.find(function (m) {
        return m.code === 'standard' && m.price < 8;
      });
      this.assert(standard, 'Standard shipping under $8 should be available for gift card');

      const setShipResult = this.logic.setCartItemShippingMethod(giftCardItem.cart_item_id, standard.shipping_method_id);
      this.assert(setShipResult && setShipResult.success === true, 'Setting shipping method should succeed');
      this.assert(setShipResult.cart && setShipResult.cart.shipping_total === standard.price, 'Cart shipping total should equal selected shipping price');

      const checkoutSummary = this.logic.getCheckoutSummary();
      this.assert(checkoutSummary && checkoutSummary.cart_id, 'Checkout summary should be retrievable');
      this.assert(
        checkoutSummary.shipping_total === standard.price,
        'Checkout shipping total should reflect standard shipping price'
      );

      // Proceed to checkout (but do not submit payment)
      const startResult = this.logic.startCheckout('Pat Jordan', 'pat.jordan@example.com');
      this.assert(startResult && startResult.success === true, 'startCheckout for gift card should succeed');
      this.assert(startResult.order_id, 'Order ID should be created for gift card purchase');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Select closet organization-like package with >=10 hours under $600 and check Saturday morning availability next month
  testTask8_SelectLongHoursPackageAndCheckAvailability() {
    const testName = 'Task 8: Select long-hours package under $600 and check Saturday morning availability';
    try {
      // List service categories (simulating Services nav)
      const serviceCategories = this.logic.getServiceCategories();
      this.assert(Array.isArray(serviceCategories) && serviceCategories.length > 0, 'Service categories should be returned');

      // Prefer Closet & Wardrobe Organization category if exists
      const closetCategory = serviceCategories.find(function (c) {
        return (
          c.category_id === 'closet_wardrobe_organization' ||
          (c.name || '').toLowerCase().indexOf('closet') !== -1
        );
      });

      // First try closet packages; if none match, fall back to Whole Home category (adapted to limited data)
      let packagesResult = this.logic.listServicesAndPackages(
        null,
        closetCategory ? closetCategory.category_id : null,
        10,
        600,
        null,
        'rating_high_to_low'
      );

      if (!packagesResult || !Array.isArray(packagesResult.packages) || packagesResult.packages.length === 0) {
        // Fallback to Whole Home packages with same constraints
        const wholeHomeCategory = serviceCategories.find(function (c) {
          return c.category_id === 'home_office' || (c.name || '').toLowerCase().indexOf('home office') === -1;
        });
        const fallbackCategoryId = 'whole_home';

        packagesResult = this.logic.listServicesAndPackages(
          null,
          fallbackCategoryId,
          10,
          600,
          null,
          'rating_high_to_low'
        );
      }

      this.assert(
        packagesResult && Array.isArray(packagesResult.packages) && packagesResult.packages.length > 0,
        'At least one package with >=10 hours and under $600 should be available (possibly Whole Home)'
      );

      // All returned packages should respect filters according to their own data
      for (let i = 0; i < packagesResult.packages.length; i++) {
        const pkg = packagesResult.packages[i];
        if (typeof pkg.total_hours === 'number') {
          this.assert(pkg.total_hours >= 10, 'Package total_hours should be >= 10');
        }
        if (typeof pkg.base_price === 'number') {
          this.assert(pkg.base_price <= 600, 'Package base_price should be <= 600');
        }
      }

      const topPackage = packagesResult.packages[0];
      this.assert(topPackage.package_id, 'Selected package should have an ID');

      const packageId = topPackage.package_id;

      // Load booking options for this package
      const bookingOptions = this.logic.getBookingOptions(null, packageId);
      this.assert(bookingOptions && bookingOptions.package && bookingOptions.package.package_id === packageId, 'Booking options should reference selected package');

      // Compute a Saturday date in the next calendar month relative to metadata baseline
      const metadataRaw = localStorage.getItem('_metadata') || '{}';
      const metadata = JSON.parse(metadataRaw);
      const baselineDate = metadata.baselineDate || '2026-03-03';
      const base = new Date(baselineDate + 'T00:00:00Z');
      const year = base.getUTCFullYear();
      const month = base.getUTCMonth(); // 0-based
      const nextMonthDate = new Date(Date.UTC(year, month + 1, 1));

      // Find first Saturday of next month
      while (nextMonthDate.getUTCDay() !== 6) {
        nextMonthDate.setUTCDate(nextMonthDate.getUTCDate() + 1);
      }
      const yyyy = nextMonthDate.getUTCFullYear();
      const mm = String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(nextMonthDate.getUTCDate()).padStart(2, '0');
      const saturdayNextMonth = yyyy + '-' + mm + '-' + dd;

      // Request availability for Saturday between 9:00 and 13:00 (9am–1pm)
      const slotsResponse = this.logic.getAvailabilitySlots(
        null,
        packageId,
        null,
        saturdayNextMonth,
        '09:00',
        '13:00',
        null,
        'time_earliest'
      );

      this.assert(slotsResponse && Array.isArray(slotsResponse.slots), 'Availability slots response should contain slots array (possibly empty)');

      if (slotsResponse.slots.length > 0) {
        const firstSlot = slotsResponse.slots[0];
        this.assert(firstSlot.start_datetime && firstSlot.end_datetime, 'First returned slot should have start and end times');
      }

      // We only verify that the system can search for availability for the chosen package; actual booking
      // is already tested in Task 1 with concrete availability data.

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
