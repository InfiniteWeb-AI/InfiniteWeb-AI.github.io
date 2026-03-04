// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
  // Simple in-memory polyfill
  var store = {};
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem: function (key, value) {
      store[key] = String(value);
    },
    removeItem: function (key) {
      delete store[key];
    },
    clear: function () {
      store = {};
    },
    key: function (index) {
      return Object.keys(store)[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    }
  };
})();

class BusinessLogic {
  constructor() {
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    // Array-backed tables
    const arrayTables = [
      'brands',
      'categories',
      'vehicles',
      'products',
      'fitments',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'compare_lists',
      'compare_items',
      'vin_lookup_results',
      'shipping_methods',
      'delivery_estimates',
      'stores',
      'addresses',
      'checkout_sessions',
      'documentation_assets',
      'request_part_submissions',
      'static_pages'
    ];

    arrayTables.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Singleton objects
    const singletonTables = ['cart', 'current_vehicle_context'];
    singletonTables.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, 'null');
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Seed baseline domain data required by tests if missing
    try {
      const readArray = (key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          return [];
        }
      };
      const writeArray = (key, arr) => {
        localStorage.setItem(key, JSON.stringify(arr));
      };

      const nowIso = new Date().toISOString();

      // -----------------
      // Brands
      // -----------------
      let brands = readArray('brands');
      const ensureBrand = (brand) => {
        if (!brands.some((b) => b.id === brand.id)) {
          brands.push(brand);
        }
      };
      ensureBrand({
        id: 'victor_reinz',
        name: 'Victor Reinz',
        is_oem: false,
        is_premium: true
      });
      ensureBrand({
        id: 'fel_pro',
        name: 'Fel-Pro',
        is_oem: false,
        is_premium: true
      });
      writeArray('brands', brands);

      // -----------------
      // Categories
      // -----------------
      let categories = readArray('categories');
      const ensureCategory = (cat) => {
        if (!categories.some((c) => c.id === cat.id)) {
          categories.push(cat);
        }
      };
      ensureCategory({
        id: 'oil_filters',
        slug: 'oil_filters',
        name: 'Oil Filters',
        parent_category_id: 'engine',
        description: 'Spin-on and cartridge oil filters.',
        is_active: true,
        display_order: 10
      });
      ensureCategory({
        id: 'spark_plugs',
        slug: 'spark_plugs',
        name: 'Spark Plugs',
        parent_category_id: 'ignition_spark',
        description: 'Copper, platinum and iridium spark plugs.',
        is_active: true,
        display_order: 20
      });
      ensureCategory({
        id: 'timing_components',
        slug: 'timing_components',
        name: 'Timing Components',
        parent_category_id: 'engine',
        description: 'Timing belts, chains, tensioners and water pumps.',
        is_active: true,
        display_order: 30
      });
      ensureCategory({
        id: 'belts_timing',
        slug: 'belts_timing',
        name: 'Belts & Timing',
        parent_category_id: 'timing_components',
        description: 'Timing belts and related components.',
        is_active: true,
        display_order: 31
      });
      ensureCategory({
        id: 'timing_belts',
        slug: 'timing_belts',
        name: 'Timing Belts',
        parent_category_id: 'timing_components',
        description: 'Timing belts for interference and non-interference engines.',
        is_active: true,
        display_order: 32
      });
      ensureCategory({
        id: 'water_pumps',
        slug: 'water_pumps',
        name: 'Water Pumps',
        parent_category_id: 'timing_components',
        description: 'Engine water pumps and related components.',
        is_active: true,
        display_order: 33
      });
      ensureCategory({
        id: 'belt_tensioners',
        slug: 'belt_tensioners',
        name: 'Belt Tensioners',
        parent_category_id: 'timing_components',
        description: 'Automatic and manual belt tensioners.',
        is_active: true,
        display_order: 34
      });
      ensureCategory({
        id: 'fuel_injectors',
        slug: 'fuel_injectors',
        name: 'Fuel Injectors',
        parent_category_id: 'engine',
        description: 'Gasoline and diesel fuel injectors and sets.',
        is_active: true,
        display_order: 40
      });
      ensureCategory({
        id: 'serpentine_belts',
        slug: 'serpentine_belts',
        name: 'Serpentine Belts',
        parent_category_id: 'belts_timing',
        description: 'Accessory drive belts.',
        is_active: true,
        display_order: 50
      });
      ensureCategory({
        id: 'engine_gasket_sets',
        slug: 'engine_gasket_sets',
        name: 'Engine Gasket Sets',
        parent_category_id: 'engine',
        description: 'Head gasket and full engine gasket sets.',
        is_active: true,
        display_order: 60
      });
      ensureCategory({
        id: 'gaskets_seals',
        slug: 'gaskets_seals',
        name: 'Gaskets & Seals',
        parent_category_id: 'engine',
        description: 'Individual gaskets and seals.',
        is_active: true,
        display_order: 61
      });
      ensureCategory({
        id: 'thermostats',
        slug: 'thermostats',
        name: 'Thermostats',
        parent_category_id: 'engine',
        description: 'Engine thermostats and housings.',
        is_active: true,
        display_order: 70
      });
      ensureCategory({
        id: 'cooling_system',
        slug: 'cooling_system',
        name: 'Cooling System',
        parent_category_id: 'engine',
        description: 'Radiators, thermostats and cooling components.',
        is_active: true,
        display_order: 71
      });
      writeArray('categories', categories);

      // -----------------
      // Vehicles
      // -----------------
      let vehicles = readArray('vehicles');
      const ensureVehicle = (veh) => {
        if (!vehicles.some((v) => v.id === veh.id)) {
          vehicles.push(veh);
        }
      };
      ensureVehicle({
        id: 'veh_2018_ford_mustang_5_0',
        year: 2018,
        make: 'Ford',
        model: 'Mustang',
        engine_description: '5.0L',
        engine_displacement_liters: 5.0,
        fuel_type: 'gasoline',
        notes: '2018 Ford Mustang GT 5.0L used for performance intake selection.'
      });
      ensureVehicle({
        id: 'veh_2016_ram_2500_6_7_diesel',
        year: 2016,
        make: 'Ram',
        model: '2500',
        engine_description: '6.7L Diesel',
        engine_displacement_liters: 6.7,
        fuel_type: 'diesel',
        notes: '2016 Ram 2500 6.7L Cummins diesel for injector set selection.'
      });
      ensureVehicle({
        id: 'veh_2008_bmw_328i_3_0',
        year: 2008,
        make: 'BMW',
        model: '328i',
        engine_description: '3.0L',
        engine_displacement_liters: 3.0,
        fuel_type: 'gasoline',
        notes: '2008 BMW 328i 3.0L used for premium gasket sets.'
      });
      ensureVehicle({
        id: 'veh_2010_chevrolet_silverado_1500_5_3',
        year: 2010,
        make: 'Chevrolet',
        model: 'Silverado 1500',
        engine_description: '5.3L',
        engine_displacement_liters: 5.3,
        fuel_type: 'gasoline',
        notes: '2010 Chevy Silverado 1500 5.3L for thermostat selection.'
      });
      writeArray('vehicles', vehicles);

      // -----------------
      // VIN lookup results
      // -----------------
      let vinResults = readArray('vin_lookup_results');
      if (!vinResults.some((r) => r.vin === '1HGCM82633A004352')) {
        vinResults.push({
          id: 'vin_result_1HGCM82633A004352',
          vin: '1HGCM82633A004352',
          vehicle_id: 'veh_2012_honda_civic_1_8',
          decoded_at: nowIso,
          source: 'test_fixture'
        });
      }
      writeArray('vin_lookup_results', vinResults);

      // -----------------
      // Products
      // -----------------
      let products = readArray('products');
      const ensureProduct = (prod) => {
        if (!products.some((p) => p.id === prod.id)) {
          products.push(prod);
        }
      };

      // Spark plugs for 2015 Camry
      ensureProduct({
        id: 'prod_spark_iridium_camry15',
        sku: 'SP-IR-2015CAM',
        name: 'Iridium Spark Plug Set - 2015 Camry 2.5L',
        brand_id: 'toyota_genuine',
        category_id: 'spark_plugs',
        part_number: 'IR-CAM-2015',
        description: 'Iridium spark plug engineered for long-life service in 2015 Toyota Camry 2.5L.',
        price: 12.99,
        currency: 'usd',
        status: 'active',
        is_oem: true,
        condition: 'new',
        set_size: 1,
        is_kit: false,
        kit_type: 'none',
        material: 'iridium',
        warranty_years: 5,
        free_shipping: false,
        supports_store_pickup: true,
        shipping_weight_lbs: 0.2,
        is_performance_part: false,
        created_at: nowIso,
        rating_average: 4.6,
        review_count: 18
      });
      ensureProduct({
        id: 'prod_spark_platinum_camry15',
        sku: 'SP-PL-2015CAM',
        name: 'Platinum Spark Plug Set - 2015 Camry 2.5L',
        brand_id: 'toyota_genuine',
        category_id: 'spark_plugs',
        part_number: 'PL-CAM-2015',
        description: 'Platinum spark plug option for 2015 Toyota Camry 2.5L.',
        price: 9.99,
        currency: 'usd',
        status: 'active',
        is_oem: true,
        condition: 'new',
        set_size: 1,
        is_kit: false,
        kit_type: 'none',
        material: 'platinum',
        warranty_years: 3,
        free_shipping: false,
        supports_store_pickup: true,
        shipping_weight_lbs: 0.2,
        is_performance_part: false,
        created_at: nowIso,
        rating_average: 4.4,
        review_count: 12
      });

      // Timing components for 2012 Civic
      ensureProduct({
        id: 'prod_timing_belt_civic12_oem',
        sku: 'TB-CIV-2012-OEM',
        name: 'OEM Timing Belt - 2012 Civic 1.8L',
        brand_id: 'honda_genuine',
        category_id: 'timing_belts',
        part_number: 'TB-CIV-2012',
        description: 'OEM-quality timing belt for 2012 Honda Civic 1.8L.',
        price: 120.0,
        currency: 'usd',
        status: 'active',
        is_oem: true,
        condition: 'new',
        set_size: 1,
        is_kit: false,
        kit_type: 'none',
        material: 'rubber',
        warranty_years: 3,
        free_shipping: false,
        supports_store_pickup: true,
        shipping_weight_lbs: 1.2,
        is_performance_part: false,
        created_at: nowIso,
        rating_average: 4.5,
        review_count: 20
      });
      ensureProduct({
        id: 'prod_water_pump_civic12_oem',
        sku: 'WP-CIV-2012-OEM',
        name: 'OEM Water Pump - 2012 Civic 1.8L',
        brand_id: 'honda_genuine',
        category_id: 'water_pumps',
        part_number: 'WP-CIV-2012',
        description: 'OEM water pump for 2012 Honda Civic 1.8L.',
        price: 110.0,
        currency: 'usd',
        status: 'active',
        is_oem: true,
        condition: 'new',
        set_size: 1,
        is_kit: false,
        kit_type: 'none',
        material: 'aluminum',
        warranty_years: 3,
        free_shipping: false,
        supports_store_pickup: true,
        shipping_weight_lbs: 3.5,
        is_performance_part: false,
        created_at: nowIso,
        rating_average: 4.3,
        review_count: 14
      });
      ensureProduct({
        id: 'prod_tensioner_civic12_oem',
        sku: 'TS-CIV-2012-OEM',
        name: 'OEM Timing Belt Tensioner - 2012 Civic 1.8L',
        brand_id: 'honda_genuine',
        category_id: 'belt_tensioners',
        part_number: 'TS-CIV-2012',
        description: 'Timing belt tensioner for 2012 Honda Civic 1.8L.',
        price: 60.0,
        currency: 'usd',
        status: 'active',
        is_oem: true,
        condition: 'new',
        set_size: 1,
        is_kit: false,
        kit_type: 'none',
        material: 'steel',
        warranty_years: 3,
        free_shipping: false,
        supports_store_pickup: true,
        shipping_weight_lbs: 1.0,
        is_performance_part: false,
        created_at: nowIso,
        rating_average: 4.2,
        review_count: 11
      });

      // Performance air intake for 2018 Mustang
      ensureProduct({
        id: 'prod_air_intake_mustang18',
        sku: 'AI-MUS-2018-50',
        name: 'Performance Air Intake Kit - 2018 Mustang 5.0L',
        brand_id: 'ford_genuine',
        category_id: 'performance_intakes',
        part_number: 'AI-MUS-2018',
        description: 'High-flow performance air intake kit for 2018 Ford Mustang 5.0L.',
        price: 349.99,
        currency: 'usd',
        status: 'active',
        is_oem: false,
        condition: 'new',
        set_size: 1,
        is_kit: true,
        kit_type: 'air_intake_kit',
        material: 'aluminum',
        warranty_years: 1,
        free_shipping: true,
        supports_store_pickup: true,
        shipping_weight_lbs: 12.0,
        is_performance_part: true,
        created_at: nowIso,
        rating_average: 4.8,
        review_count: 52
      });

      // Injector set for 2016 Ram 2500 6.7L
      ensureProduct({
        id: 'prod_injector_set_ram_cummins_fast',
        sku: 'INJ-RAM-2016-67-SET',
        name: 'Remanufactured Injector Set (6) - 2016 Ram 2500 6.7L',
        brand_id: 'ford_genuine',
        category_id: 'fuel_injectors',
        part_number: 'INJ-RAM-2016-SET',
        description: 'Remanufactured diesel fuel injector set of 6 for 2016 Ram 2500 6.7L Cummins.',
        price: 1899.0,
        currency: 'usd',
        status: 'active',
        is_oem: false,
        condition: 'remanufactured',
        set_size: 6,
        is_kit: true,
        kit_type: 'injector_set',
        material: 'steel',
        warranty_years: 2,
        free_shipping: false,
        supports_store_pickup: false,
        shipping_weight_lbs: 18.0,
        is_performance_part: false,
        created_at: nowIso,
        rating_average: 4.1,
        review_count: 8
      });

      // Serpentine belts for VIN-decoded Civic
      ensureProduct({
        id: 'prod_serp_belt_mid_civic12_a',
        sku: 'SB-CIV-2012-A',
        name: 'Serpentine Belt A - 2012 Civic 1.8L',
        brand_id: 'honda_genuine',
        category_id: 'serpentine_belts',
        part_number: 'SB-CIV-A',
        description: 'Accessory serpentine belt option A for 2012 Civic 1.8L.',
        price: 35.0,
        currency: 'usd',
        status: 'active',
        is_oem: true,
        condition: 'new',
        set_size: 1,
        is_kit: false,
        kit_type: 'none',
        material: 'rubber',
        warranty_years: 2,
        free_shipping: false,
        supports_store_pickup: true,
        shipping_weight_lbs: 1.1,
        is_performance_part: false,
        created_at: nowIso,
        rating_average: 4.0,
        review_count: 10
      });
      ensureProduct({
        id: 'prod_serp_belt_mid_civic12_b',
        sku: 'SB-CIV-2012-B',
        name: 'Serpentine Belt B - 2012 Civic 1.8L',
        brand_id: 'honda_genuine',
        category_id: 'serpentine_belts',
        part_number: 'SB-CIV-B',
        description: 'Accessory serpentine belt option B for 2012 Civic 1.8L.',
        price: 45.0,
        currency: 'usd',
        status: 'active',
        is_oem: true,
        condition: 'new',
        set_size: 1,
        is_kit: false,
        kit_type: 'none',
        material: 'rubber',
        warranty_years: 2,
        free_shipping: false,
        supports_store_pickup: true,
        shipping_weight_lbs: 1.1,
        is_performance_part: false,
        created_at: nowIso,
        rating_average: 4.1,
        review_count: 12
      });
      ensureProduct({
        id: 'prod_serp_belt_mid_civic12_c',
        sku: 'SB-CIV-2012-C',
        name: 'Serpentine Belt C - 2012 Civic 1.8L',
        brand_id: 'honda_genuine',
        category_id: 'serpentine_belts',
        part_number: 'SB-CIV-C',
        description: 'Accessory serpentine belt option C for 2012 Civic 1.8L.',
        price: 55.0,
        currency: 'usd',
        status: 'active',
        is_oem: true,
        condition: 'new',
        set_size: 1,
        is_kit: false,
        kit_type: 'none',
        material: 'rubber',
        warranty_years: 2,
        free_shipping: false,
        supports_store_pickup: true,
        shipping_weight_lbs: 1.1,
        is_performance_part: false,
        created_at: nowIso,
        rating_average: 4.2,
        review_count: 9
      });

      // Full gasket sets for 2008 BMW 328i
      ensureProduct({
        id: 'prod_gasket_set_vr_full_bmw',
        sku: 'GS-BMW-3000-VR',
        name: 'Victor Reinz Full Engine Gasket Set - BMW 3.0L',
        brand_id: 'victor_reinz',
        category_id: 'engine_gasket_sets',
        part_number: 'GS-BMW-VR',
        description: 'Full engine gasket set by Victor Reinz for BMW 3.0L engines.',
        price: 240.0,
        currency: 'usd',
        status: 'active',
        is_oem: false,
        condition: 'new',
        set_size: 1,
        is_kit: true,
        kit_type: 'gasket_set',
        material: 'multi-layer steel',
        warranty_years: 1,
        free_shipping: false,
        supports_store_pickup: false,
        shipping_weight_lbs: 6.0,
        is_performance_part: false,
        is_full_gasket_set: true,
        created_at: nowIso,
        rating_average: 4.4,
        review_count: 22
      });
      ensureProduct({
        id: 'prod_gasket_set_felpro_full_bmw',
        sku: 'GS-BMW-3000-FP',
        name: 'Fel-Pro Full Engine Gasket Set - BMW 3.0L',
        brand_id: 'fel_pro',
        category_id: 'engine_gasket_sets',
        part_number: 'GS-BMW-FP',
        description: 'Fel-Pro full engine gasket set for BMW 3.0L applications.',
        price: 260.0,
        currency: 'usd',
        status: 'active',
        is_oem: false,
        condition: 'new',
        set_size: 1,
        is_kit: true,
        kit_type: 'gasket_set',
        material: 'composite',
        warranty_years: 1,
        free_shipping: false,
        supports_store_pickup: false,
        shipping_weight_lbs: 6.0,
        is_performance_part: false,
        is_full_gasket_set: true,
        created_at: nowIso,
        rating_average: 4.6,
        review_count: 30
      });

      // Thermostat for 2010 Silverado
      ensureProduct({
        id: 'prod_thermostat_silverado10',
        sku: 'TH-SILV-2010-53',
        name: 'Engine Thermostat - 2010 Silverado 5.3L',
        brand_id: 'ford_genuine',
        category_id: 'thermostats',
        part_number: 'TH-SILV-2010',
        description: 'Engine thermostat for 2010 Chevrolet Silverado 1500 5.3L.',
        price: 49.99,
        currency: 'usd',
        status: 'active',
        is_oem: false,
        condition: 'new',
        set_size: 1,
        is_kit: false,
        kit_type: 'none',
        material: 'stainless_steel',
        warranty_years: 2,
        free_shipping: false,
        supports_store_pickup: true,
        shipping_weight_lbs: 0.8,
        is_performance_part: false,
        created_at: nowIso,
        rating_average: 4.5,
        review_count: 28
      });

      writeArray('products', products);

      // -----------------
      // Fitments
      // -----------------
      let fitments = readArray('fitments');
      const ensureFitment = (fit) => {
        if (!fitments.some((f) => f.id === fit.id)) {
          fitments.push(fit);
        }
      };

      // Camry spark plugs
      ensureFitment({
        id: 'fit_sp_iridium_camry15',
        product_id: 'prod_spark_iridium_camry15',
        vehicle_id: 'veh_2015_toyota_camry_2_5',
        notes: 'Iridium spark plug fitment for 2015 Camry 2.5L.'
      });
      ensureFitment({
        id: 'fit_sp_platinum_camry15',
        product_id: 'prod_spark_platinum_camry15',
        vehicle_id: 'veh_2015_toyota_camry_2_5',
        notes: 'Platinum spark plug fitment for 2015 Camry 2.5L.'
      });

      // Civic timing kit
      ensureFitment({
        id: 'fit_tb_civic12',
        product_id: 'prod_timing_belt_civic12_oem',
        vehicle_id: 'veh_2012_honda_civic_1_8',
        notes: 'Timing belt for 2012 Civic 1.8L.'
      });
      ensureFitment({
        id: 'fit_wp_civic12',
        product_id: 'prod_water_pump_civic12_oem',
        vehicle_id: 'veh_2012_honda_civic_1_8',
        notes: 'Water pump for 2012 Civic 1.8L.'
      });
      ensureFitment({
        id: 'fit_ts_civic12',
        product_id: 'prod_tensioner_civic12_oem',
        vehicle_id: 'veh_2012_honda_civic_1_8',
        notes: 'Timing belt tensioner for 2012 Civic 1.8L.'
      });

      // Mustang intake
      ensureFitment({
        id: 'fit_ai_mustang18',
        product_id: 'prod_air_intake_mustang18',
        vehicle_id: 'veh_2018_ford_mustang_5_0',
        notes: 'Performance air intake kit for 2018 Mustang 5.0L.'
      });

      // Ram injectors
      ensureFitment({
        id: 'fit_inj_ram16',
        product_id: 'prod_injector_set_ram_cummins_fast',
        vehicle_id: 'veh_2016_ram_2500_6_7_diesel',
        notes: 'Injector set fitment for 2016 Ram 2500 6.7L diesel.'
      });

      // Serpentine belts
      ensureFitment({
        id: 'fit_sb_civic12_a',
        product_id: 'prod_serp_belt_mid_civic12_a',
        vehicle_id: 'veh_2012_honda_civic_1_8',
        notes: 'Serpentine belt A for 2012 Civic 1.8L.'
      });
      ensureFitment({
        id: 'fit_sb_civic12_b',
        product_id: 'prod_serp_belt_mid_civic12_b',
        vehicle_id: 'veh_2012_honda_civic_1_8',
        notes: 'Serpentine belt B for 2012 Civic 1.8L.'
      });
      ensureFitment({
        id: 'fit_sb_civic12_c',
        product_id: 'prod_serp_belt_mid_civic12_c',
        vehicle_id: 'veh_2012_honda_civic_1_8',
        notes: 'Serpentine belt C for 2012 Civic 1.8L.'
      });

      // BMW gasket sets
      ensureFitment({
        id: 'fit_gasket_vr_bmw',
        product_id: 'prod_gasket_set_vr_full_bmw',
        vehicle_id: 'veh_2008_bmw_328i_3_0',
        notes: 'Victor Reinz full gasket set for BMW 3.0L.'
      });
      ensureFitment({
        id: 'fit_gasket_fp_bmw',
        product_id: 'prod_gasket_set_felpro_full_bmw',
        vehicle_id: 'veh_2008_bmw_328i_3_0',
        notes: 'Fel-Pro full gasket set for BMW 3.0L.'
      });

      // Silverado thermostat
      ensureFitment({
        id: 'fit_thermostat_silverado10',
        product_id: 'prod_thermostat_silverado10',
        vehicle_id: 'veh_2010_chevrolet_silverado_1500_5_3',
        notes: 'Thermostat for 2010 Silverado 5.3L.'
      });

      writeArray('fitments', fitments);

      // -----------------
      // Stores (for pickup)
      // -----------------
      let stores = readArray('stores');
      if (!stores.some((s) => s.id === 'store_atlanta_main_30301')) {
        stores.push({
          id: 'store_atlanta_main_30301',
          name: 'EngineParts Atlanta Main',
          address_line1: '200 Main St',
          address_line2: '',
          city: 'Atlanta',
          state: 'GA',
          zip: '30301',
          latitude: 33.749,
          longitude: -84.388,
          phone: '404-555-0100',
          pickup_available: true
        });
      }
      writeArray('stores', stores);
    } catch (e) {
      // Ignore seeding errors so tests can still run
    }
  }

  _getFromStorage(key, defaultVal = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultVal;
    try {
      const parsed = JSON.parse(data);
      return parsed === null ? defaultVal : parsed;
    } catch (e) {
      return defaultVal;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ------------------------
  // Internal helpers
  // ------------------------

  _getOrCreateCart() {
    let cart = null;
    const raw = localStorage.getItem('cart');
    if (raw && raw !== 'null') {
      try {
        cart = JSON.parse(raw);
      } catch (e) {
        cart = null;
      }
    }
    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        items: [], // array of cart_item ids
        subtotal: 0,
        shipping_cost: 0,
        tax_estimate: 0,
        total: 0,
        created_at: now,
        updated_at: now
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _saveCart(cart) {
    cart.updated_at = new Date().toISOString();
    this._saveToStorage('cart', cart);
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    const subtotal = itemsForCart.reduce((sum, ci) => sum + (ci.line_subtotal || 0), 0);
    cart.subtotal = subtotal;
    if (typeof cart.shipping_cost !== 'number') {
      cart.shipping_cost = 0;
    }
    if (typeof cart.tax_estimate !== 'number') {
      cart.tax_estimate = 0;
    }
    cart.total = cart.subtotal + cart.shipping_cost + cart.tax_estimate;
    this._saveCart(cart);
    return cart;
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists');
    let wishlist = wishlists[0] || null;
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        name: 'Saved Items',
        created_at: new Date().toISOString()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  _getOrCreateCompareList() {
    let compareLists = this._getFromStorage('compare_lists');
    let compareList = compareLists[0] || null;
    if (!compareList) {
      compareList = {
        id: this._generateId('compare_list'),
        created_at: new Date().toISOString()
      };
      compareLists.push(compareList);
      this._saveToStorage('compare_lists', compareLists);
    }
    return compareList;
  }

  _setCurrentVehicleContext(vehicle, source, vinLookupResult) {
    if (!vehicle) {
      localStorage.setItem('current_vehicle_context', 'null');
      return null;
    }
    const context = {
      id: this._generateId('vehicle_context'),
      vehicle_id: vehicle.id,
      source: source, // 'manual_selector' or 'vin_lookup'
      vin_lookup_result_id: vinLookupResult ? vinLookupResult.id : null,
      selected_at: new Date().toISOString()
    };
    this._saveToStorage('current_vehicle_context', context);
    return context;
  }

  _getRawCurrentVehicleContext() {
    const raw = localStorage.getItem('current_vehicle_context');
    if (!raw || raw === 'null') return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  _getCurrentVehicle() {
    const ctx = this._getRawCurrentVehicleContext();
    if (!ctx) return null;
    const vehicles = this._getFromStorage('vehicles');
    return vehicles.find((v) => v.id === ctx.vehicle_id) || null;
  }

  _getFitmentProductIdsForVehicle(vehicleId) {
    if (!vehicleId) return null;
    const fitments = this._getFromStorage('fitments');
    const set = new Set();
    fitments.forEach((f) => {
      if (f.vehicle_id === vehicleId) {
        set.add(f.product_id);
      }
    });
    return set;
  }

  _getFitmentsForProduct(productId) {
    const fitments = this._getFromStorage('fitments');
    return fitments.filter((f) => f.product_id === productId);
  }

  _getCurrentCheckoutSessionOrCreate() {
    const cart = this._getOrCreateCart();
    let sessions = this._getFromStorage('checkout_sessions');
    let session = sessions.find((s) => s.cart_id === cart.id && s.step !== 'completed');
    if (!session) {
      const now = new Date().toISOString();
      session = {
        id: this._generateId('checkout'),
        cart_id: cart.id,
        step: 'shipping',
        fulfillment_type: 'ship_to_address',
        shipping_address_id: null,
        shipping_method_code: null,
        pickup_store_id: null,
        email: null,
        phone: null,
        created_at: now,
        updated_at: now
      };
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
    }
    return session;
  }

  _saveCheckoutSession(session) {
    let sessions = this._getFromStorage('checkout_sessions');
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      sessions[idx] = session;
    } else {
      sessions.push(session);
    }
    session.updated_at = new Date().toISOString();
    this._saveToStorage('checkout_sessions', sessions);
  }

  _resolveBrandAndCategory(product) {
    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');
    const brand = brands.find((b) => b.id === product.brand_id) || null;
    const category = categories.find((c) => c.id === product.category_id) || null;
    return { brand, category };
  }

  _getShippingMethodByCode(code) {
    const methods = this._getFromStorage('shipping_methods');
    return methods.find((m) => m.code === code) || null;
  }

  _compareDatesAsc(a, b) {
    const da = a ? new Date(a).getTime() : Infinity;
    const db = b ? new Date(b).getTime() : Infinity;
    return da - db;
  }

  // ------------------------
  // Vehicle context interfaces
  // ------------------------

  setCurrentVehicleBySelection(year, make, model, engineDescription) {
    const vehicles = this._getFromStorage('vehicles');
    const vehicle = vehicles.find(
      (v) =>
        v.year === year &&
        v.make === make &&
        v.model === model &&
        v.engine_description === engineDescription
    ) || null;

    if (!vehicle) {
      // Clear context if not found
      this._setCurrentVehicleContext(null, 'manual_selector', null);
      return { vehicle_context: null, vehicle: null };
    }

    const vehicle_context = this._setCurrentVehicleContext(vehicle, 'manual_selector', null);
    return { vehicle_context, vehicle };
  }

  getCurrentVehicleContext() {
    const vehicle_context = this._getRawCurrentVehicleContext();
    const vehicle = vehicle_context ? this._getCurrentVehicle() : null;
    return { vehicle_context, vehicle };
  }

  decodeVinAndSetVehicleContext(vin) {
    const vinResults = this._getFromStorage('vin_lookup_results');
    const vin_lookup_result = vinResults.find((r) => r.vin === vin) || null;
    if (!vin_lookup_result) {
      return { vin_lookup_result: null, vehicle: null, vehicle_context: null };
    }
    const vehicles = this._getFromStorage('vehicles');
    const vehicle = vehicles.find((v) => v.id === vin_lookup_result.vehicle_id) || null;
    if (!vehicle) {
      return { vin_lookup_result, vehicle: null, vehicle_context: null };
    }
    const vehicle_context = this._setCurrentVehicleContext(vehicle, 'vin_lookup', vin_lookup_result);
    return { vin_lookup_result, vehicle, vehicle_context };
  }

  // ------------------------
  // Categories and homepage
  // ------------------------

  getVehiclePartCategories() {
    const { vehicle } = this.getCurrentVehicleContext();
    const categories = this._getFromStorage('categories').filter((c) => c.is_active);
    const categoriesById = new Map();
    categories.forEach((c) => categoriesById.set(c.id, c));

    const resultCategories = categories.map((category) => {
      const is_primary = !category.parent_category_id; // top level considered primary
      const parent = category.parent_category_id ? categoriesById.get(category.parent_category_id) : null;
      return {
        category,
        is_primary,
        parent_category_name: parent ? parent.name : null
      };
    });

    return { vehicle, categories: resultCategories };
  }

  getSubcategoriesForCategory(categoryId) {
    const categories = this._getFromStorage('categories');
    return categories.filter((c) => c.parent_category_id === categoryId);
  }

  getHomepageFeaturedProducts(section = 'featured') {
    const { vehicle_context, vehicle } = this.getCurrentVehicleContext();
    const allProducts = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');

    let products = allProducts.filter((p) => p.status === 'active');

    if (vehicle_context && vehicle) {
      const fitProductIds = this._getFitmentProductIdsForVehicle(vehicle.id);
      if (fitProductIds && fitProductIds.size > 0) {
        products = products.filter((p) => fitProductIds.has(p.id));
      }
    }

    // Simple heuristic: sort by created_at desc for 'featured', by review_count for 'popular'
    if (section === 'popular') {
      products.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
    } else {
      products.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
    }

    const brandMap = new Map();
    brands.forEach((b) => brandMap.set(b.id, b));
    const categoryMap = new Map();
    categories.forEach((c) => categoryMap.set(c.id, c));

    const items = products.map((product) => {
      const brand = brandMap.get(product.brand_id) || null;
      const category = categoryMap.get(product.category_id) || null;
      const highlight_badges = [];
      if (product.is_oem || (brand && brand.is_oem)) highlight_badges.push('OEM');
      if (brand && brand.is_premium) highlight_badges.push('Premium Brand');
      if (product.is_performance_part) highlight_badges.push('Performance');
      if (product.free_shipping) highlight_badges.push('Free Shipping');
      return {
        product,
        brand_name: brand ? brand.name : null,
        category_name: category ? category.name : null,
        is_oem_brand: !!(brand && brand.is_oem),
        is_premium_brand: !!(brand && brand.is_premium),
        highlight_badges,
        rating_average: product.rating_average || null,
        review_count: product.review_count || 0
      };
    });

    return { section, vehicle, products: items };
  }

  // ------------------------
  // Category filters and listing
  // ------------------------

  getCategoryFilterOptions(categoryId, shippingZip) {
    const category = this._getFromStorage('categories').find((c) => c.id === categoryId) || null;
    const { vehicle } = this.getCurrentVehicleContext();
    const allProducts = this._getFromStorage('products');

    let products = allProducts.filter((p) => p.category_id === categoryId);
    if (vehicle) {
      const fitProductIds = this._getFitmentProductIdsForVehicle(vehicle.id);
      if (fitProductIds && fitProductIds.size > 0) {
        products = products.filter((p) => fitProductIds.has(p.id));
      }
    }

    const brands = this._getFromStorage('brands');
    const brandCounts = new Map();
    products.forEach((p) => {
      brandCounts.set(p.brand_id, (brandCounts.get(p.brand_id) || 0) + 1);
    });

    const brand_options = [];
    brandCounts.forEach((count, brandId) => {
      const brand = brands.find((b) => b.id === brandId) || null;
      if (brand) {
        brand_options.push({
          brand,
          product_count: count,
          is_oem: !!brand.is_oem,
          is_premium: !!brand.is_premium
        });
      }
    });

    let min_price = null;
    let max_price = null;
    products.forEach((p) => {
      if (typeof p.price === 'number') {
        if (min_price === null || p.price < min_price) min_price = p.price;
        if (max_price === null || p.price > max_price) max_price = p.price;
      }
    });

    const materialSet = new Set();
    const conditionSet = new Set();
    const setSizeSet = new Set();
    const kitTypeSet = new Set();
    let free_shipping_available = false;
    let oem_available = false;
    let premium_brand_available = false;
    let supports_store_pickup_available = false;

    products.forEach((p) => {
      if (p.material) materialSet.add(p.material);
      if (p.condition) conditionSet.add(p.condition);
      if (typeof p.set_size === 'number') setSizeSet.add(p.set_size);
      if (p.kit_type) kitTypeSet.add(p.kit_type);
      if (p.free_shipping) free_shipping_available = true;
      if (p.is_oem) oem_available = true;
      if (p.supports_store_pickup) supports_store_pickup_available = true;
      const brand = brands.find((b) => b.id === p.brand_id);
      if (brand && brand.is_premium) premium_brand_available = true;
    });

    const material_options = Array.from(materialSet);
    const condition_options = Array.from(conditionSet);
    const set_size_options = Array.from(setSizeSet);
    const kit_type_options = Array.from(kitTypeSet);

    // Rating thresholds can be static helper values
    const rating_thresholds = [3, 4, 4.5, 5];

    return {
      category,
      brand_options,
      price_range: { min_price, max_price },
      material_options,
      condition_options,
      rating_thresholds,
      set_size_options,
      kit_type_options,
      free_shipping_available,
      oem_available,
      premium_brand_available,
      supports_store_pickup_available
    };
  }

  listCategoryProducts(categoryId, filters, sort, pagination, shippingZip) {
    const category = this._getFromStorage('categories').find((c) => c.id === categoryId) || null;
    const { vehicle } = this.getCurrentVehicleContext();
    const allProducts = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');
    const deliveryEstimates = this._getFromStorage('delivery_estimates');
    const shippingMethods = this._getFromStorage('shipping_methods');

    const brandMap = new Map();
    brands.forEach((b) => brandMap.set(b.id, b));
    const categoryMap = new Map();
    categories.forEach((c) => categoryMap.set(c.id, c));

    let products = allProducts.filter((p) => p.category_id === categoryId && p.status === 'active');

    if (vehicle) {
      const fitProductIds = this._getFitmentProductIdsForVehicle(vehicle.id);
      if (fitProductIds && fitProductIds.size > 0) {
        products = products.filter((p) => fitProductIds.has(p.id));
      }
    }

    const applied_filters = Object.assign(
      {
        brandIds: undefined,
        minPrice: undefined,
        maxPrice: undefined,
        isOemOnly: undefined,
        isPremiumBrandOnly: undefined,
        material: undefined,
        condition: undefined,
        ratingMin: undefined,
        reviewCountMin: undefined,
        freeShippingOnly: undefined,
        supportsStorePickupOnly: undefined,
        setSize: undefined,
        kitType: undefined,
        isFullGasketSetOnly: undefined,
        isPerformancePartOnly: undefined
      },
      filters || {}
    );

    if (applied_filters.brandIds && applied_filters.brandIds.length > 0) {
      const brandSet = new Set(applied_filters.brandIds);
      products = products.filter((p) => brandSet.has(p.brand_id));
    }
    if (typeof applied_filters.minPrice === 'number') {
      products = products.filter((p) => typeof p.price === 'number' && p.price >= applied_filters.minPrice);
    }
    if (typeof applied_filters.maxPrice === 'number') {
      products = products.filter((p) => typeof p.price === 'number' && p.price <= applied_filters.maxPrice);
    }
    if (applied_filters.isOemOnly) {
      products = products.filter((p) => !!p.is_oem);
    }
    if (applied_filters.isPremiumBrandOnly) {
      products = products.filter((p) => {
        const brand = brandMap.get(p.brand_id);
        return !!(brand && brand.is_premium);
      });
    }
    if (applied_filters.material) {
      products = products.filter((p) => p.material === applied_filters.material);
    }
    if (applied_filters.condition) {
      products = products.filter((p) => p.condition === applied_filters.condition);
    }
    if (typeof applied_filters.ratingMin === 'number') {
      products = products.filter((p) => (p.rating_average || 0) >= applied_filters.ratingMin);
    }
    if (typeof applied_filters.reviewCountMin === 'number') {
      products = products.filter((p) => (p.review_count || 0) >= applied_filters.reviewCountMin);
    }
    if (applied_filters.freeShippingOnly) {
      products = products.filter((p) => !!p.free_shipping);
    }
    if (applied_filters.supportsStorePickupOnly) {
      products = products.filter((p) => !!p.supports_store_pickup);
    }
    if (typeof applied_filters.setSize === 'number') {
      products = products.filter((p) => p.set_size === applied_filters.setSize);
    }
    if (applied_filters.kitType) {
      products = products.filter((p) => p.kit_type === applied_filters.kitType);
    }
    if (applied_filters.isFullGasketSetOnly) {
      products = products.filter((p) => !!p.is_full_gasket_set);
    }
    if (applied_filters.isPerformancePartOnly) {
      products = products.filter((p) => !!p.is_performance_part);
    }

    const shippingZipStr = shippingZip || null;

    const productsWithMeta = products.map((product) => {
      const brand = brandMap.get(product.brand_id) || null;
      const cat = categoryMap.get(product.category_id) || null;

      let earliest_delivery = null;
      if (shippingZipStr) {
        const estimates = deliveryEstimates.filter(
          (d) => d.product_id === product.id && d.zip === shippingZipStr
        );
        if (estimates.length > 0) {
          estimates.sort((a, b) => this._compareDatesAsc(a.estimated_delivery_date, b.estimated_delivery_date));
          const first = estimates[0];
          const method = shippingMethods.find((m) => m.code === first.shipping_method_code) || null;
          earliest_delivery = {
            shipping_method_code: first.shipping_method_code,
            shipping_method_name: method ? method.name : null,
            estimated_delivery_date: first.estimated_delivery_date
          };
        }
      }

      const fits_current_vehicle = !!(
        vehicle && this._getFitmentsForProduct(product.id).some((f) => f.vehicle_id === vehicle.id)
      );

      return {
        product,
        brand_name: brand ? brand.name : null,
        category_name: cat ? cat.name : null,
        is_oem_brand: !!(brand && brand.is_oem),
        is_premium_brand: !!(brand && brand.is_premium),
        fits_current_vehicle,
        earliest_delivery
      };
    });

    const sortConfig = Object.assign({ sortBy: null, sortDirection: 'asc' }, sort || {});
    if (sortConfig.sortBy) {
      const dir = sortConfig.sortDirection === 'desc' ? -1 : 1;
      const key = sortConfig.sortBy;
      productsWithMeta.sort((a, b) => {
        let av;
        let bv;
        if (key === 'price') {
          av = a.product.price || 0;
          bv = b.product.price || 0;
        } else if (key === 'rating') {
          av = a.product.rating_average || 0;
          bv = b.product.rating_average || 0;
        } else if (key === 'popularity') {
          av = a.product.review_count || 0;
          bv = b.product.review_count || 0;
        } else if (key === 'warranty') {
          av = a.product.warranty_years || 0;
          bv = b.product.warranty_years || 0;
        } else if (key === 'delivery_date') {
          const ad = a.earliest_delivery ? a.earliest_delivery.estimated_delivery_date : null;
          const bd = b.earliest_delivery ? b.earliest_delivery.estimated_delivery_date : null;
          return this._compareDatesAsc(ad, bd) * dir;
        } else {
          return 0;
        }
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    const pageCfg = Object.assign({ page: 1, pageSize: 20 }, pagination || {});
    const totalItems = productsWithMeta.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageCfg.pageSize));
    const page = Math.min(Math.max(1, pageCfg.page), totalPages);
    const start = (page - 1) * pageCfg.pageSize;
    const end = start + pageCfg.pageSize;
    const pagedProducts = productsWithMeta.slice(start, end);

    return {
      category,
      vehicle,
      products: pagedProducts,
      pagination: {
        page,
        pageSize: pageCfg.pageSize,
        totalItems,
        totalPages
      },
      applied_filters
    };
  }

  // ------------------------
  // Product details and documentation
  // ------------------------

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        brand: null,
        category: null,
        vehicle_fitment_summary: {
          fits_current_vehicle: false,
          compatible_vehicles_count: 0,
          notes: null
        },
        warranty_years: null,
        rating_average: null,
        review_count: null,
        is_in_wishlist: false,
        can_store_pickup: false,
        documentation_available: false
      };
    }

    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');
    const brand = brands.find((b) => b.id === product.brand_id) || null;
    const category = categories.find((c) => c.id === product.category_id) || null;

    const { vehicle } = this.getCurrentVehicleContext();
    const fitments = this._getFitmentsForProduct(product.id);
    const compatible_vehicles_count = fitments.length;
    const fits_current_vehicle = !!(
      vehicle && fitments.some((f) => f.vehicle_id === vehicle.id)
    );
    const notes = compatible_vehicles_count > 0
      ? 'Fits ' + compatible_vehicles_count + ' vehicle configuration' + (compatible_vehicles_count > 1 ? 's' : '')
      : null;

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');
    const is_in_wishlist = wishlistItems.some(
      (wi) => wi.wishlist_id === wishlist.id && wi.product_id === product.id
    );

    const docs = this._getFromStorage('documentation_assets');
    const documentation_available = docs.some((d) => d.product_id === product.id);

    return {
      product,
      brand,
      category,
      vehicle_fitment_summary: {
        fits_current_vehicle,
        compatible_vehicles_count,
        notes
      },
      warranty_years: product.warranty_years || null,
      rating_average: product.rating_average || null,
      review_count: product.review_count || 0,
      is_in_wishlist,
      can_store_pickup: !!product.supports_store_pickup,
      documentation_available
    };
  }

  getProductDocumentation(productId) {
    const docs = this._getFromStorage('documentation_assets').filter(
      (d) => d.product_id === productId
    );
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;

    // Instrumentation for task completion tracking
    try {
      if (docs && docs.length > 0) {
        let instrumentationObj = null;
        const raw = localStorage.getItem('task7_documentationViewed');
        if (raw) {
          try {
            instrumentationObj = JSON.parse(raw);
          } catch (e) {
            instrumentationObj = null;
          }
        }
        if (!instrumentationObj || typeof instrumentationObj !== 'object') {
          instrumentationObj = { viewedProductIds: [] };
        }
        if (!Array.isArray(instrumentationObj.viewedProductIds)) {
          instrumentationObj.viewedProductIds = [];
        }
        if (!instrumentationObj.viewedProductIds.includes(productId)) {
          instrumentationObj.viewedProductIds.push(productId);
        }
        localStorage.setItem('task7_documentationViewed', JSON.stringify(instrumentationObj));
      }
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (e2) {}
    }

    // Resolve foreign key product_id -> product
    return docs.map((d) => Object.assign({}, d, { product }));
  }

  getProductShippingOptions(productId, zip) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    const shipping_methods = this._getFromStorage('shipping_methods');
    const delivery_estimates = this._getFromStorage('delivery_estimates');

    const methodsWithEstimates = shipping_methods
      .filter((m) => m.code !== 'store_pickup')
      .map((m) => {
        const estimates = delivery_estimates.filter(
          (d) => d.product_id === productId && d.zip === zip && d.shipping_method_code === m.code
        );
        let estimated_delivery_date = null;
        if (estimates.length > 0) {
          estimates.sort((a, b) => this._compareDatesAsc(a.estimated_delivery_date, b.estimated_delivery_date));
          estimated_delivery_date = estimates[0].estimated_delivery_date;
        }
        const base_cost = typeof m.base_cost === 'number' ? m.base_cost : 0;
        const is_free_shipping = !!product && !!product.free_shipping && m.code === 'standard';
        const cost = is_free_shipping ? 0 : base_cost;
        return {
          shipping_method: m,
          estimated_delivery_date,
          cost,
          is_free_shipping
        };
      });

    const stores = this._getFromStorage('stores');
    const store_pickup_available = !!product && !!product.supports_store_pickup && stores.some((s) => s.pickup_available);

    return {
      product,
      zip,
      shipping_methods: methodsWithEstimates,
      store_pickup_available
    };
  }

  // ------------------------
  // Cart operations
  // ------------------------

  addToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;

    if (!product) {
      return { success: false, message: 'Product not found', cart: null, cart_items: [], updated_item: null };
    }

    let cartItem = cartItems.find((ci) => ci.cart_id === cart.id && ci.product_id === productId) || null;
    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.line_subtotal = cartItem.unit_price * cartItem.quantity;
    } else {
      const now = new Date().toISOString();
      cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        unit_price: product.price || 0,
        line_subtotal: (product.price || 0) * qty,
        added_at: now
      };
      cartItems.push(cartItem);
      if (!Array.isArray(cart.items)) cart.items = [];
      if (!cart.items.includes(cartItem.id)) {
        cart.items.push(cartItem.id);
      }
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    return {
      success: true,
      message: 'Added to cart',
      cart,
      cart_items: itemsForCart,
      updated_item: cartItem
    };
  }

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');

    const brandMap = new Map();
    brands.forEach((b) => brandMap.set(b.id, b));
    const categoryMap = new Map();
    categories.forEach((c) => categoryMap.set(c.id, c));

    const items = cartItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const brand = product ? brandMap.get(product.brand_id) || null : null;
      const category = product ? categoryMap.get(product.category_id) || null : null;
      return {
        cart_item: ci,
        product,
        brand_name: brand ? brand.name : null,
        category_name: category ? category.name : null
      };
    });

    const available_shipping_methods = this._getFromStorage('shipping_methods');
    let selected_shipping_method_code = cart.shipping_method_code || null;
    if (!selected_shipping_method_code && available_shipping_methods.length > 0) {
      const def = available_shipping_methods.find((m) => m.is_default) || available_shipping_methods[0];
      selected_shipping_method_code = def.code;
    }

    const { vehicle } = this.getCurrentVehicleContext();

    return {
      cart,
      items,
      available_shipping_methods,
      selected_shipping_method_code,
      vehicle
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      return { success: false, cart, cart_item: null };
    }
    let cartItem = cartItems[idx];

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter((id) => id !== cartItemId);
      }
      cartItem = null;
    } else {
      cartItem.quantity = quantity;
      cartItem.line_subtotal = cartItem.unit_price * cartItem.quantity;
      cartItems[idx] = cartItem;
      if (!Array.isArray(cart.items)) cart.items = [];
      if (!cart.items.includes(cartItemId)) cart.items.push(cartItemId);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    return { success: true, cart, cart_item: cartItem };
  }

  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      return { success: false, cart };
    }
    cartItems.splice(idx, 1);
    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter((id) => id !== cartItemId);
    }
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);
    return { success: true, cart };
  }

  setCartShippingMethod(shippingMethodCode) {
    const cart = this._getOrCreateCart();
    const method = this._getShippingMethodByCode(shippingMethodCode);
    if (!method) {
      return { success: false, cart, selected_shipping_method_code: cart.shipping_method_code || null };
    }
    cart.shipping_method_code = method.code;
    cart.shipping_cost = typeof method.base_cost === 'number' ? method.base_cost : 0;
    this._recalculateCartTotals(cart);
    return { success: true, cart, selected_shipping_method_code: method.code };
  }

  // ------------------------
  // Checkout flow
  // ------------------------

  startGuestCheckout(mode) {
    const cart = this._getOrCreateCart();
    const checkout_session = this._getCurrentCheckoutSessionOrCreate();
    return { success: true, checkout_session, cart };
  }

  setCheckoutShippingAddress(shippingAddress, email, phone) {
    const checkout_session = this._getCurrentCheckoutSessionOrCreate();
    const addresses = this._getFromStorage('addresses');

    const addr = {
      id: this._generateId('address'),
      full_name: shippingAddress.full_name,
      line1: shippingAddress.line1,
      line2: shippingAddress.line2 || null,
      city: shippingAddress.city,
      state: shippingAddress.state,
      zip: shippingAddress.zip,
      country: shippingAddress.country || 'US'
    };
    addresses.push(addr);
    this._saveToStorage('addresses', addresses);

    checkout_session.shipping_address_id = addr.id;
    checkout_session.email = email;
    checkout_session.phone = phone || null;
    checkout_session.step = 'delivery';
    this._saveCheckoutSession(checkout_session);

    return { success: true, checkout_session, shipping_address: addr };
  }

  setCheckoutFulfillmentMethod(fulfillmentType, shippingMethodCode) {
    const checkout_session = this._getCurrentCheckoutSessionOrCreate();
    const available_shipping_methods = this._getFromStorage('shipping_methods');
    const method = available_shipping_methods.find((m) => m.code === shippingMethodCode) || null;

    checkout_session.fulfillment_type = fulfillmentType;
    checkout_session.shipping_method_code = method ? method.code : shippingMethodCode || null;
    checkout_session.step = 'review';
    this._saveCheckoutSession(checkout_session);

    return {
      success: true,
      checkout_session,
      available_shipping_methods,
      selected_shipping_method_code: checkout_session.shipping_method_code
    };
  }

  findPickupStoresByZip(zip, radiusMiles) {
    const radius = typeof radiusMiles === 'number' ? radiusMiles : 25;
    const stores = this._getFromStorage('stores').filter(
      (s) => s.pickup_available && s.zip === zip
    );
    return {
      zip,
      radius_miles: radius,
      stores
    };
  }

  selectCheckoutPickupStore(storeId) {
    const checkout_session = this._getCurrentCheckoutSessionOrCreate();
    const stores = this._getFromStorage('stores');
    const store = stores.find((s) => s.id === storeId) || null;

    checkout_session.pickup_store_id = store ? store.id : null;
    checkout_session.fulfillment_type = 'store_pickup';
    checkout_session.shipping_method_code = 'store_pickup';
    checkout_session.step = 'review';
    this._saveCheckoutSession(checkout_session);

    return {
      success: true,
      checkout_session,
      pickup_store: store
    };
  }

  getCheckoutReview() {
    const checkout_session = this._getCurrentCheckoutSessionOrCreate();
    const cart = this._getOrCreateCart();

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');

    const brandMap = new Map();
    brands.forEach((b) => brandMap.set(b.id, b));

    const items = cartItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const brand = product ? brandMap.get(product.brand_id) || null : null;
      return {
        cart_item: ci,
        product,
        brand_name: brand ? brand.name : null
      };
    });

    const addresses = this._getFromStorage('addresses');
    const stores = this._getFromStorage('stores');
    const shippingMethods = this._getFromStorage('shipping_methods');

    const shipping_address = checkout_session.fulfillment_type === 'ship_to_address'
      ? addresses.find((a) => a.id === checkout_session.shipping_address_id) || null
      : null;

    const pickup_store = checkout_session.fulfillment_type === 'store_pickup'
      ? stores.find((s) => s.id === checkout_session.pickup_store_id) || null
      : null;

    const shipping_method = shippingMethods.find(
      (m) => m.code === checkout_session.shipping_method_code
    ) || null;

    // Ensure cart totals are up to date
    this._recalculateCartTotals(cart);

    const totals = {
      subtotal: cart.subtotal || 0,
      shipping_cost: cart.shipping_cost || 0,
      tax_estimate: cart.tax_estimate || 0,
      total: cart.total || (cart.subtotal || 0) + (cart.shipping_cost || 0) + (cart.tax_estimate || 0)
    };

    return {
      checkout_session,
      cart,
      items,
      shipping_address,
      pickup_store,
      shipping_method,
      totals
    };
  }

  // ------------------------
  // Wishlist operations
  // ------------------------

  getWishlistSummary() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items').filter(
      (wi) => wi.wishlist_id === wishlist.id
    );
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');
    const { vehicle } = this.getCurrentVehicleContext();
    const fitments = this._getFromStorage('fitments');

    const brandMap = new Map();
    brands.forEach((b) => brandMap.set(b.id, b));
    const categoryMap = new Map();
    categories.forEach((c) => categoryMap.set(c.id, c));

    const items = wishlistItems.map((wi) => {
      const product = products.find((p) => p.id === wi.product_id) || null;
      const brand = product ? brandMap.get(product.brand_id) || null : null;
      const category = product ? categoryMap.get(product.category_id) || null : null;
      const fits_current_vehicle = !!(
        vehicle && product && fitments.some(
          (f) => f.product_id === product.id && f.vehicle_id === vehicle.id
        )
      );
      return {
        wishlist_item: wi,
        product,
        brand_name: brand ? brand.name : null,
        category_name: category ? category.name : null,
        rating_average: product ? product.rating_average || 0 : 0,
        review_count: product ? product.review_count || 0 : 0,
        fits_current_vehicle
      };
    });

    return { wishlist, items };
  }

  addProductToWishlist(productId) {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');

    let wishlist_item = wishlistItems.find(
      (wi) => wi.wishlist_id === wishlist.id && wi.product_id === productId
    );

    if (!wishlist_item) {
      wishlist_item = {
        id: this._generateId('wishlist_item'),
        wishlist_id: wishlist.id,
        product_id: productId,
        added_at: new Date().toISOString()
      };
      wishlistItems.push(wishlist_item);
      this._saveToStorage('wishlist_items', wishlistItems);
    }

    return { success: true, wishlist, wishlist_item };
  }

  removeProductFromWishlist(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');
    const idx = wishlistItems.findIndex(
      (wi) => wi.id === wishlistItemId && wi.wishlist_id === wishlist.id
    );
    if (idx === -1) {
      return { success: false, wishlist };
    }
    wishlistItems.splice(idx, 1);
    this._saveToStorage('wishlist_items', wishlistItems);
    return { success: true, wishlist };
  }

  moveWishlistItemToCart(wishlistItemId, quantity) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');
    const idx = wishlistItems.findIndex(
      (wi) => wi.id === wishlistItemId && wi.wishlist_id === wishlist.id
    );
    if (idx === -1) {
      const cart = this._getOrCreateCart();
      return { success: false, wishlist, cart, cart_item: null };
    }

    const wishlistItem = wishlistItems[idx];
    const result = this.addToCart(wishlistItem.product_id, quantity || 1);

    wishlistItems.splice(idx, 1);
    this._saveToStorage('wishlist_items', wishlistItems);

    return {
      success: result.success,
      wishlist,
      cart: result.cart,
      cart_item: result.updated_item
    };
  }

  // ------------------------
  // Compare list operations
  // ------------------------

  addProductToCompareList(productId) {
    const compare_list = this._getOrCreateCompareList();
    const compareItems = this._getFromStorage('compare_items');

    let compare_item = compareItems.find(
      (ci) => ci.compare_list_id === compare_list.id && ci.product_id === productId
    );

    if (!compare_item) {
      compare_item = {
        id: this._generateId('compare_item'),
        compare_list_id: compare_list.id,
        product_id: productId,
        added_at: new Date().toISOString()
      };
      compareItems.push(compare_item);
      this._saveToStorage('compare_items', compareItems);
    }

    return { success: true, compare_list, compare_item };
  }

  removeProductFromCompareList(compareItemId) {
    const compare_list = this._getOrCreateCompareList();
    let compareItems = this._getFromStorage('compare_items');
    const idx = compareItems.findIndex(
      (ci) => ci.id === compareItemId && ci.compare_list_id === compare_list.id
    );
    if (idx === -1) {
      return { success: false, compare_list };
    }
    compareItems.splice(idx, 1);
    this._saveToStorage('compare_items', compareItems);
    return { success: true, compare_list };
  }

  clearCompareList() {
    const compare_list = this._getOrCreateCompareList();
    let compareItems = this._getFromStorage('compare_items');
    compareItems = compareItems.filter((ci) => ci.compare_list_id !== compare_list.id);
    this._saveToStorage('compare_items', compareItems);
    return { success: true, compare_list };
  }

  getCompareListDetails() {
    const compare_list = this._getOrCreateCompareList();
    const compareItems = this._getFromStorage('compare_items').filter(
      (ci) => ci.compare_list_id === compare_list.id
    );
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');
    const fitments = this._getFromStorage('fitments');
    const { vehicle } = this.getCurrentVehicleContext();

    const brandMap = new Map();
    brands.forEach((b) => brandMap.set(b.id, b));
    const categoryMap = new Map();
    categories.forEach((c) => categoryMap.set(c.id, c));

    const items = compareItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const brand = product ? brandMap.get(product.brand_id) || null : null;
      const category = product ? categoryMap.get(product.category_id) || null : null;
      const fits_current_vehicle = !!(
        vehicle && product && fitments.some(
          (f) => f.product_id === product.id && f.vehicle_id === vehicle.id
        )
      );
      return {
        compare_item: ci,
        product,
        brand_name: brand ? brand.name : null,
        category_name: category ? category.name : null,
        material: product ? product.material || null : null,
        warranty_years: product ? product.warranty_years || null : null,
        price: product ? product.price || 0 : 0,
        rating_average: product ? product.rating_average || 0 : 0,
        review_count: product ? product.review_count || 0 : 0,
        fits_current_vehicle
      };
    });

    return { compare_list, items };
  }

  // ------------------------
  // Request a Part / contact
  // ------------------------

  submitRequestPart(
    topic,
    vehicle_year,
    vehicle_make,
    vehicle_model,
    engine_description,
    part_description,
    name,
    email,
    phone,
    additional_notes
  ) {
    const submissions = this._getFromStorage('request_part_submissions');
    const submission = {
      id: this._generateId('request_part'),
      topic: topic,
      vehicle_year: typeof vehicle_year === 'number' ? vehicle_year : undefined,
      vehicle_make: vehicle_make || undefined,
      vehicle_model: vehicle_model || undefined,
      engine_description: engine_description || undefined,
      part_description: part_description,
      name: name,
      email: email,
      phone: phone || undefined,
      additional_notes: additional_notes || undefined,
      created_at: new Date().toISOString(),
      status: 'new'
    };
    submissions.push(submission);
    this._saveToStorage('request_part_submissions', submissions);
    return {
      success: true,
      message: 'Request submitted',
      submission
    };
  }

  getRequestPartTopics() {
    const topics = [
      {
        code: 'part_request',
        label: 'Part Request',
        description: 'Request pricing and availability for a specific part.'
      },
      {
        code: 'cant_find_part',
        label: 'Cannot Find My Part',
        description: 'Get help locating a hard-to-find or rare part.'
      },
      {
        code: 'general_question',
        label: 'General Question',
        description: 'Ask a general question about parts or fitment.'
      },
      {
        code: 'order_issue',
        label: 'Order Issue',
        description: 'Get help with an existing order.'
      },
      {
        code: 'other',
        label: 'Other',
        description: 'Other inquiries.'
      }
    ];
    return { topics };
  }

  // ------------------------
  // Static page content
  // ------------------------

  getStaticPageContent(pageSlug) {
    const pages = this._getFromStorage('static_pages');
    const page = pages.find((p) => p.page_slug === pageSlug) || null;
    if (page) {
      return page;
    }
    // Fallback minimal content if not stored
    return {
      page_slug: pageSlug,
      title: '',
      body_html: '',
      last_updated: new Date().toISOString()
    };
  }
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}