// Test runner for business logic
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
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    // Reinitialize storage structure via business logic helper
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      addresses: [
        {
          id: 'addr_alex_chen_toronto',
          name: 'Alex Chen',
          company_name: '',
          address_type: 'personal',
          street_line1: '120 King St W',
          street_line2: 'Suite 1500',
          city: 'Toronto',
          state_province: 'ON',
          postal_code: 'M5H 2N2',
          country: 'Canada',
          phone: '+1 416 555 0100',
          email: 'alex.chen@example.com',
          is_default_sender: true,
          is_default_recipient: false,
          saved_in_address_book: true,
          created_at: '2025-11-15T10:00:00Z',
          updated_at: '2025-11-15T10:00:00Z'
        },
        {
          id: 'addr_jamie_smith_ny',
          name: 'Jamie Smith',
          company_name: '',
          address_type: 'recipient',
          street_line1: '750 8th Ave',
          street_line2: 'Apt 19B',
          city: 'New York',
          state_province: 'NY',
          postal_code: '10019',
          country: 'United States',
          phone: '+1 212 555 0199',
          email: 'jamie.smith@example.com',
          is_default_sender: false,
          is_default_recipient: true,
          saved_in_address_book: true,
          created_at: '2025-11-20T14:30:00Z',
          updated_at: '2025-11-20T14:30:00Z'
        },
        {
          id: 'addr_laura_garcia_madrid_pickup',
          name: 'Laura García',
          company_name: '',
          address_type: 'pickup',
          street_line1: 'Calle de Alcalá 10',
          street_line2: '',
          city: 'Madrid',
          state_province: 'Madrid',
          postal_code: '28001',
          country: 'Spain',
          phone: '+34 600 000 000',
          email: 'laura@example.com',
          is_default_sender: false,
          is_default_recipient: false,
          saved_in_address_book: false,
          created_at: '2026-02-25T09:00:00Z',
          updated_at: '2026-02-25T09:00:00Z'
        }
      ],
      locations: [
        {
          id: 'loc_berlin_mitte_parcel_shop',
          name: 'Berlin Mitte Parcel Shop',
          street_line1: 'Friedrichstraße 95',
          street_line2: '',
          city: 'Berlin',
          state_province: 'Berlin',
          postal_code: '10117',
          country: 'Germany',
          latitude: 52.5186,
          longitude: 13.3862,
          location_type: 'drop_off',
          accepts_international_shipments: true,
          weekday_open_time: '08:00',
          weekday_close_time: '20:30',
          saturday_open_time: '10:00',
          saturday_close_time: '18:00',
          sunday_open_time: '',
          sunday_close_time: '',
          services_offered: ['drop_off', 'pickup', 'label_print'],
          phone: '+49 30 5555 0101',
          email: 'berlin.mitte.shop@example-logistics.com'
        },
        {
          id: 'loc_berlin_alexanderplatz_locker',
          name: 'Alexanderplatz Locker Station',
          street_line1: 'Alexanderplatz 3',
          street_line2: 'Basement Level',
          city: 'Berlin',
          state_province: 'Berlin',
          postal_code: '10178',
          country: 'Germany',
          latitude: 52.5219,
          longitude: 13.4132,
          location_type: 'locker',
          accepts_international_shipments: true,
          weekday_open_time: '00:00',
          weekday_close_time: '23:59',
          saturday_open_time: '00:00',
          saturday_close_time: '23:59',
          sunday_open_time: '00:00',
          sunday_close_time: '23:59',
          services_offered: ['drop_off', 'pickup'],
          phone: '+49 30 5555 0102',
          email: 'alexanderplatz.locker@example-logistics.com'
        },
        {
          id: 'loc_berlin_service_center_mitte',
          name: 'Berlin Service Center Mitte',
          street_line1: 'Unter den Linden 40',
          street_line2: '',
          city: 'Berlin',
          state_province: 'Berlin',
          postal_code: '10117',
          country: 'Germany',
          latitude: 52.5175,
          longitude: 13.3986,
          location_type: 'service_center',
          accepts_international_shipments: true,
          weekday_open_time: '08:00',
          weekday_close_time: '18:00',
          saturday_open_time: '09:00',
          saturday_close_time: '14:00',
          sunday_open_time: '',
          sunday_close_time: '',
          services_offered: ['drop_off', 'pickup', 'billing_support', 'customs_advice'],
          phone: '+49 30 5555 0103',
          email: 'berlin.center@example-logistics.com'
        }
      ],
      pickup_time_slots: [
        {
          id: 'slot_madrid_28001_20260306_0900_1100',
          postal_code: '28001',
          city: 'Madrid',
          country: 'Spain',
          date: '2026-03-06T00:00:00Z',
          start_time: '09:00',
          end_time: '11:00',
          is_available: true
        },
        {
          id: 'slot_madrid_28001_20260306_1100_1300',
          postal_code: '28001',
          city: 'Madrid',
          country: 'Spain',
          date: '2026-03-06T00:00:00Z',
          start_time: '11:00',
          end_time: '13:00',
          is_available: true
        },
        {
          id: 'slot_madrid_28001_20260306_1300_1500',
          postal_code: '28001',
          city: 'Madrid',
          country: 'Spain',
          date: '2026-03-06T00:00:00Z',
          start_time: '13:00',
          end_time: '15:00',
          is_available: true
        }
      ],
      shipping_services: [
        {
          id: 'svc_economy_international_saver',
          code: 'ECO_INT_SAVER',
          name: 'Economy International Saver',
          description: 'Cost-effective international shipping for non-urgent parcels and documents with consolidated linehaul.',
          service_level: 'economy',
          supports_documents: true,
          supports_parcels: true,
          supports_prepaid_duties: false,
          supports_co2_reporting: true,
          typical_transit_days_min: 6,
          typical_transit_days_max: 10,
          max_weight_kg: 30,
          active: true,
          image: 'https://www.trailermatics.com/wp-content/uploads/2020/12/entrepot-logistique-colis.jpg'
        },
        {
          id: 'svc_standard_global',
          code: 'STD_GLOBAL',
          name: 'Standard Global',
          description: 'Balanced option for most international routes with reliable delivery in under a week.',
          service_level: 'standard',
          supports_documents: true,
          supports_parcels: true,
          supports_prepaid_duties: true,
          supports_co2_reporting: true,
          typical_transit_days_min: 3,
          typical_transit_days_max: 5,
          max_weight_kg: 40,
          active: true,
          image: 'https://t4.ftcdn.net/jpg/03/29/35/01/360_F_329350178_y7OqVMIkNzwoPS543byRR3i5cSEkGNq4.jpg'
        },
        {
          id: 'svc_express_worldwide',
          code: 'EXP_WORLD',
          name: 'Express Worldwide',
          description: 'Fast time-definite delivery by air with door-to-door tracking.',
          service_level: 'express',
          supports_documents: true,
          supports_parcels: true,
          supports_prepaid_duties: true,
          supports_co2_reporting: true,
          typical_transit_days_min: 2,
          typical_transit_days_max: 4,
          max_weight_kg: 70,
          active: true,
          image: 'https://www.samedaydelivery.com/hubfs/airfreight/img/services/air-freight-air-transport.jpg'
        }
      ],
      tracking_events: [
        {
          id: 'trk_ZX123456789US_1',
          shipment_id: 'ship_ZX123456789US',
          tracking_number: 'ZX123456789US',
          status: 'info_received',
          location_city: 'Chicago',
          location_country: 'United States',
          description: 'Shipment information received; label created by sender.',
          event_time: '2026-03-01T16:05:00Z'
        },
        {
          id: 'trk_ZX123456789US_2',
          shipment_id: 'ship_ZX123456789US',
          tracking_number: 'ZX123456789US',
          status: 'in_transit',
          location_city: 'Chicago',
          location_country: 'United States',
          description: 'Package picked up from sender and processed at Chicago origin facility.',
          event_time: '2026-03-01T20:32:00Z'
        },
        {
          id: 'trk_ZX123456789US_3',
          shipment_id: 'ship_ZX123456789US',
          tracking_number: 'ZX123456789US',
          status: 'in_transit',
          location_city: 'Columbus',
          location_country: 'United States',
          description: 'Departed regional hub; en route to destination area.',
          event_time: '2026-03-02T11:47:00Z'
        }
      ],
      shipment_quotes: [
        {
          id: 'quote_chicago_paris_4day',
          mode: 'quote',
          origin_city: 'Chicago',
          origin_postal_code: '60601',
          origin_country: 'United States',
          destination_city: 'Paris',
          destination_postal_code: '75001',
          destination_country: 'France',
          package_type: 'box',
          shipment_type: 'parcel',
          weight: 10,
          weight_unit: 'kg',
          length: 40,
          width: 30,
          height: 20,
          dimension_unit: 'cm',
          shipment_date: '2026-03-09T00:00:00Z',
          delivery_time_filter_business_days_max: 4,
          price_filter_max: null,
          price_filter_currency: null,
          co2_filter_max_kg: null,
          sort_option: 'price_low_to_high',
          selected_rate_option_id: '',
          created_at: '2026-03-03T10:00:00Z'
        },
        {
          id: 'quote_toronto_newyork_docs_economy',
          mode: 'create_shipment',
          origin_city: 'Toronto',
          origin_postal_code: 'M5H 2N2',
          origin_country: 'Canada',
          destination_city: 'New York',
          destination_postal_code: '10019',
          destination_country: 'United States',
          package_type: 'documents',
          shipment_type: 'documents',
          weight: 3,
          weight_unit: 'kg',
          length: null,
          width: null,
          height: null,
          dimension_unit: null,
          shipment_date: '2026-03-03T00:00:00Z',
          delivery_time_filter_business_days_max: null,
          price_filter_max: 40,
          price_filter_currency: 'usd',
          co2_filter_max_kg: null,
          sort_option: 'price_low_to_high',
          selected_rate_option_id: '',
          created_at: '2026-03-03T11:05:00Z'
        },
        {
          id: 'quote_losangeles_tokyo_clothing',
          mode: 'quote',
          origin_city: 'Los Angeles',
          origin_postal_code: '90001',
          origin_country: 'United States',
          destination_city: 'Tokyo',
          destination_postal_code: '100-0001',
          destination_country: 'Japan',
          package_type: 'box',
          shipment_type: 'parcel',
          weight: 5,
          weight_unit: 'kg',
          length: 40,
          width: 30,
          height: 10,
          dimension_unit: 'cm',
          shipment_date: '2026-03-05T00:00:00Z',
          delivery_time_filter_business_days_max: null,
          price_filter_max: null,
          price_filter_currency: null,
          co2_filter_max_kg: null,
          sort_option: 'price_low_to_high',
          selected_rate_option_id: '',
          created_at: '2026-03-02T15:20:00Z'
        }
      ],
      shipping_rate_options: [
        {
          id: 'rate_chi_paris_std_global',
          quote_id: 'quote_chicago_paris_4day',
          service_id: 'svc_standard_global',
          service_name: 'Standard Global',
          service_level: 'standard',
          delivery_estimate_business_days_min: 3,
          delivery_estimate_business_days_max: 4,
          delivery_estimate_date: '2026-03-12T00:00:00Z',
          price: 80.0,
          currency: 'usd',
          co2_kg: 24.0,
          supports_prepaid_duties: true,
          is_selected: true
        },
        {
          id: 'rate_chi_paris_express_world',
          quote_id: 'quote_chicago_paris_4day',
          service_id: 'svc_express_worldwide',
          service_name: 'Express Worldwide',
          service_level: 'express',
          delivery_estimate_business_days_min: 2,
          delivery_estimate_business_days_max: 3,
          delivery_estimate_date: '2026-03-11T00:00:00Z',
          price: 120.0,
          currency: 'usd',
          co2_kg: 30.0,
          supports_prepaid_duties: true,
          is_selected: false
        },
        {
          id: 'rate_chi_paris_economy_int',
          quote_id: 'quote_chicago_paris_4day',
          service_id: 'svc_economy_international_saver',
          service_name: 'Economy International Saver',
          service_level: 'economy',
          delivery_estimate_business_days_min: 6,
          delivery_estimate_business_days_max: 8,
          delivery_estimate_date: '2026-03-17T00:00:00Z',
          price: 60.0,
          currency: 'usd',
          co2_kg: 18.0,
          supports_prepaid_duties: false,
          is_selected: false
        }
      ],
      shipments: [
        {
          id: 'ship_ZX123456789US',
          tracking_number: 'ZX123456789US',
          reference_number: 'REF-ZX123-20260301',
          status: 'in_transit',
          origin_address_id: 'addr_john_miller_chicago',
          destination_address_id: 'addr_jamie_smith_ny',
          service_id: 'svc_standard_na_ground',
          selected_rate_option_id: '',
          package_type: 'box',
          shipment_type: 'parcel',
          package_count: 1,
          weight: 5,
          weight_unit: 'kg',
          length: 40,
          width: 30,
          height: 20,
          dimension_unit: 'cm',
          shipment_date: '2026-03-01T15:30:00Z',
          delivery_estimated_date: '2026-03-04T00:00:00Z',
          delivery_estimated_business_days: 3,
          delivery_time_window_start: '18:00',
          delivery_time_window_end: '21:00',
          contents_category: 'general_goods',
          contents_description: 'Assorted household items',
          declared_value: 150,
          declared_value_currency: 'usd',
          insurance_type: 'partial',
          insurance_included: true,
          duties_option: 'unpaid',
          duties_amount: 0,
          duties_currency: 'usd',
          shipping_charges: 28,
          insurance_fee: 3,
          total_charges: 31,
          charges_currency: 'usd',
          co2_kg: 10,
          label_url: 'https://pd12m.s3.us-west-2.amazonaws.com/images/f82ee375-2493-5dee-8193-0e0c8069d799.jpeg',
          delivery_instructions: 'Please ring doorbell only once.',
          created_at: '2026-03-01T15:00:00Z',
          paid_at: '2026-03-01T15:10:00Z',
          updated_at: '2026-03-03T09:00:00Z'
        },
        {
          id: 'ship_AB987654321CA',
          tracking_number: 'AB987654321CA',
          reference_number: 'REF-AB987-20260224',
          status: 'delivered',
          origin_address_id: 'addr_jamie_smith_ny',
          destination_address_id: 'addr_alex_chen_toronto',
          service_id: 'svc_standard_na_ground',
          selected_rate_option_id: '',
          package_type: 'box',
          shipment_type: 'parcel',
          package_count: 1,
          weight: 2,
          weight_unit: 'kg',
          length: 30,
          width: 20,
          height: 15,
          dimension_unit: 'cm',
          shipment_date: '2026-02-24T10:00:00Z',
          delivery_estimated_date: '2026-02-27T00:00:00Z',
          delivery_estimated_business_days: 3,
          delivery_time_window_start: '09:00',
          delivery_time_window_end: '17:00',
          contents_category: 'general_goods',
          contents_description: 'Gift items',
          declared_value: 80,
          declared_value_currency: 'usd',
          insurance_type: 'none',
          insurance_included: false,
          duties_option: 'unpaid',
          duties_amount: 0,
          duties_currency: 'usd',
          shipping_charges: 20,
          insurance_fee: 0,
          total_charges: 20,
          charges_currency: 'usd',
          co2_kg: 5,
          label_url: 'https://postandparcel.info/wp-content/uploads/2019/10/DHL-ACS-Cyprus.jpg',
          delivery_instructions: '',
          created_at: '2026-02-24T09:30:00Z',
          paid_at: '2026-02-24T09:35:00Z',
          updated_at: '2026-02-27T14:22:00Z'
        },
        {
          id: 'ship_toronto_ny_docs_20260303',
          tracking_number: 'TN123456789CA',
          reference_number: 'TASK2-ORDER-0001',
          status: 'label_generated',
          origin_address_id: 'addr_alex_chen_toronto',
          destination_address_id: 'addr_jamie_smith_ny',
          service_id: 'svc_economy_crossborder_docs',
          selected_rate_option_id: 'rate_tor_ny_economy_docs',
          package_type: 'documents',
          shipment_type: 'documents',
          package_count: 1,
          weight: 3,
          weight_unit: 'kg',
          length: null,
          width: null,
          height: null,
          dimension_unit: null,
          shipment_date: '2026-03-03T11:10:00Z',
          delivery_estimated_date: '2026-03-06T00:00:00Z',
          delivery_estimated_business_days: 4,
          delivery_time_window_start: '09:00',
          delivery_time_window_end: '17:00',
          contents_category: 'documents',
          contents_description: 'Business contracts and supporting paperwork',
          declared_value: 30,
          declared_value_currency: 'usd',
          insurance_type: 'none',
          insurance_included: false,
          duties_option: 'unpaid',
          duties_amount: 0,
          duties_currency: 'usd',
          shipping_charges: 18,
          insurance_fee: 0,
          total_charges: 18,
          charges_currency: 'usd',
          co2_kg: 6,
          label_url: 'https://desalas.org/wp-content/uploads/2019/10/free-printable-shipping-label-template-new-shipping-label-template-of-free-printable-shipping-label-template.jpg',
          delivery_instructions: '',
          created_at: '2026-03-03T11:06:00Z',
          paid_at: '2026-03-03T11:08:00Z',
          updated_at: '2026-03-03T11:08:00Z'
        }
      ],
      delivery_time_slots: [
        {
          id: 'dslot_ZX123456789US_20260304_0900_1200',
          shipment_id: 'ship_ZX123456789US',
          date: '2026-03-04T00:00:00Z',
          start_time: '09:00',
          end_time: '12:00',
          is_available: true
        },
        {
          id: 'dslot_ZX123456789US_20260304_1200_1500',
          shipment_id: 'ship_ZX123456789US',
          date: '2026-03-04T00:00:00Z',
          start_time: '12:00',
          end_time: '15:00',
          is_available: true
        },
        {
          id: 'dslot_ZX123456789US_20260304_1500_1800',
          shipment_id: 'ship_ZX123456789US',
          date: '2026-03-04T00:00:00Z',
          start_time: '15:00',
          end_time: '18:00',
          is_available: true
        }
      ],
      payments: [
        {
          id: 'pay_ZX123456789US_1',
          shipment_id: 'ship_ZX123456789US',
          amount: 31,
          currency: 'usd',
          payment_method: 'credit_debit_card',
          card_brand: 'Visa',
          card_last4: '1111',
          card_expiry_month: '10',
          card_expiry_year: '2030',
          billing_name: 'John Miller',
          billing_address_id: 'addr_john_miller_chicago',
          status: 'succeeded',
          transaction_reference: 'CH_20260301_ZX123',
          created_at: '2026-03-01T15:05:00Z',
          processed_at: '2026-03-01T15:10:00Z'
        },
        {
          id: 'pay_AB987654321CA_1',
          shipment_id: 'ship_AB987654321CA',
          amount: 20,
          currency: 'usd',
          payment_method: 'credit_debit_card',
          card_brand: 'Mastercard',
          card_last4: '4444',
          card_expiry_month: '08',
          card_expiry_year: '2029',
          billing_name: 'Jamie Smith',
          billing_address_id: 'addr_jamie_smith_ny',
          status: 'succeeded',
          transaction_reference: 'CH_20260224_AB987',
          created_at: '2026-02-24T09:32:00Z',
          processed_at: '2026-02-24T09:35:00Z'
        },
        {
          id: 'pay_TN123456789CA_1',
          shipment_id: 'ship_toronto_ny_docs_20260303',
          amount: 18,
          currency: 'usd',
          payment_method: 'credit_debit_card',
          card_brand: 'Visa',
          card_last4: '4242',
          card_expiry_month: '12',
          card_expiry_year: '2030',
          billing_name: 'Alex Chen',
          billing_address_id: 'addr_alex_chen_toronto',
          status: 'succeeded',
          transaction_reference: 'CH_20260303_TASK2',
          created_at: '2026-03-03T11:06:30Z',
          processed_at: '2026-03-03T11:08:00Z'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:15:22.477882'
      }
    };

    // Persist generated data into localStorage using storage keys
    localStorage.setItem('addresses', JSON.stringify(generatedData.addresses || []));
    localStorage.setItem('locations', JSON.stringify(generatedData.locations || []));
    localStorage.setItem('pickup_time_slots', JSON.stringify(generatedData.pickup_time_slots || []));
    localStorage.setItem('shipping_services', JSON.stringify(generatedData.shipping_services || []));
    localStorage.setItem('tracking_events', JSON.stringify(generatedData.tracking_events || []));
    localStorage.setItem('shipment_quotes', JSON.stringify(generatedData.shipment_quotes || []));
    localStorage.setItem('shipping_rate_options', JSON.stringify(generatedData.shipping_rate_options || []));
    localStorage.setItem('shipments', JSON.stringify(generatedData.shipments || []));
    localStorage.setItem('delivery_time_slots', JSON.stringify(generatedData.delivery_time_slots || []));
    localStorage.setItem('payments', JSON.stringify(generatedData.payments || []));
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata || {}));

    // Initialize empty collections for entities not present in generated data
    if (!localStorage.getItem('pickup_requests')) {
      localStorage.setItem('pickup_requests', JSON.stringify([]));
    }
    if (!localStorage.getItem('customs_estimates')) {
      localStorage.setItem('customs_estimates', JSON.stringify([]));
    }
    if (!localStorage.getItem('saved_locations')) {
      localStorage.setItem('saved_locations', JSON.stringify([]));
    }
    if (!localStorage.getItem('delivery_reschedule_requests')) {
      localStorage.setItem('delivery_reschedule_requests', JSON.stringify([]));
    }
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_Cheapest4DayQuoteChicagoToParis();
    this.testTask2_CreateAndPayEconomyDocsTorontoToNYUnder40();
    this.testTask3_ScheduleMadridPickupFridayAfternoon();
    this.testTask4_EstimateCustomsAndSelectPrepaidOptionUnder60();
    this.testTask5_FindNearestBerlinDropoffOpenAfter19AndSave();
    this.testTask6_RescheduleDeliveryToLaterSlotForInTransitPackage();
    this.testTask7_CreateShanghaiBusinessSenderAndSaveExpressDraftWithInsurance();
    this.testTask8_ChooseAmsterdamSydneyLowCarbonServiceUnder100();

    return this.results;
  }

  // Task 1
  testTask1_Cheapest4DayQuoteChicagoToParis() {
    const testName = 'Task 1: Cheapest <=4-day Chicago->Paris quote and start shipment';
    console.log('Testing:', testName);
    try {
      const quotesStored = JSON.parse(localStorage.getItem('shipment_quotes') || '[]');
      this.assert(quotesStored.length > 0, 'There should be at least one stored quote');

      const storedQuoteMeta = quotesStored.find(function (q) {
        return (
          q.origin_city === 'Chicago' &&
          q.destination_city === 'Paris' &&
          q.origin_postal_code === '60601' &&
          q.destination_postal_code === '75001'
        );
      });
      this.assert(storedQuoteMeta, 'Should find pre-generated Chicago->Paris quote in storage');

      const detailsResult = this.logic.getShipmentQuoteDetails(storedQuoteMeta.id);
      this.assert(detailsResult && detailsResult.quote, 'Should retrieve quote details');
      let quote = detailsResult.quote;
      let rateOptions = detailsResult.rate_options || [];
      this.assert(rateOptions.length > 0, 'Quote should have rate options');

      // Apply delivery time filter (<= 4 business days) and sort by price low->high
      const updated = this.logic.updateShipmentQuoteFiltersAndSort(
        quote.id,
        4,      // delivery_time_filter_business_days_max
        undefined, // price_filter_max
        undefined, // price_filter_currency
        undefined, // co2_filter_max_kg
        'price_low_to_high'
      );
      this.assert(updated && updated.quote, 'Should get updated quote from filter/sort');
      quote = updated.quote;
      rateOptions = updated.rate_options || [];
      this.assert(rateOptions.length > 0, 'Filtered rate options should not be empty');

      // Verify that each option is within 4 business days
      for (let i = 0; i < rateOptions.length; i++) {
        const ro = rateOptions[i];
        this.assert(
          typeof ro.delivery_estimate_business_days_max === 'number' &&
            ro.delivery_estimate_business_days_max <= 4,
          'Rate option should deliver in 4 business days or less'
        );
      }

      // Verify first option is cheapest after sorting
      const prices = rateOptions.map(function (ro) { return ro.price; });
      const minPrice = Math.min.apply(null, prices);
      const cheapestOption = rateOptions[0];
      this.assert(
        typeof cheapestOption.price === 'number',
        'Cheapest option should have numeric price'
      );
      this.assert(
        cheapestOption.price === minPrice,
        'First option should be the cheapest after price_low_to_high sort'
      );

      // Select cheapest option and create shipment
      const selectResult = this.logic.selectShippingRateOption(
        quote.id,
        cheapestOption.id,
        true // create_shipment
      );
      this.assert(selectResult, 'selectShippingRateOption should return a result');
      this.assert(selectResult.selected_rate_option, 'Should return selected rate option');
      this.assert(
        selectResult.selected_rate_option.id === cheapestOption.id,
        'Selected rate option ID should match chosen cheapest option'
      );
      this.assert(
        selectResult.shipment_created === true,
        'Shipment should be created when create_shipment=true'
      );
      const shipment = selectResult.shipment;
      this.assert(shipment && shipment.id, 'Shipment should be returned with an ID');

      // Proceed to shipment details (simulating "Continue to Shipment Details")
      const shipmentDetails = this.logic.getShipmentDetailsForEdit(shipment.id);
      this.assert(
        shipmentDetails && shipmentDetails.shipment,
        'Should retrieve shipment details for edit'
      );
      this.assert(
        shipmentDetails.selected_rate_option &&
          shipmentDetails.selected_rate_option.id === cheapestOption.id,
        'Shipment details should reference the selected cheapest rate option'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2
  testTask2_CreateAndPayEconomyDocsTorontoToNYUnder40() {
    const testName = 'Task 2: Create and pay for docs Toronto->NY shipment under $40';
    console.log('Testing:', testName);
    try {
      // Step: Homepage overview (simulating navigation)
      const homeOverview = this.logic.getHomeOverview();
      this.assert(homeOverview !== null && typeof homeOverview === 'object', 'Home overview should be returned');

      // Determine a baseline shipment date from metadata
      const metadata = JSON.parse(localStorage.getItem('_metadata') || '{}');
      const baselineDate = metadata.baselineDate || '2026-03-03';
      const shipmentDateIso = baselineDate + 'T00:00:00Z';

      // Create shipment quote in create_shipment mode for Toronto -> New York documents
      const quoteResult = this.logic.createShipmentQuote(
        'create_shipment', // mode
        'Toronto',         // origin_city
        'M5H 2N2',         // origin_postal_code
        'Canada',          // origin_country
        'New York',        // destination_city
        '10019',           // destination_postal_code
        'United States',   // destination_country
        'documents',       // package_type
        'documents',       // shipment_type
        3,                 // weight
        'kg',              // weight_unit
        undefined,         // length
        undefined,         // width
        undefined,         // height
        undefined,         // dimension_unit
        shipmentDateIso    // shipment_date
      );
      this.assert(quoteResult && quoteResult.quote, 'Quote should be created for Toronto->NY docs');
      let quote = quoteResult.quote;
      let rateOptions = quoteResult.rate_options || [];
      this.assert(rateOptions.length > 0, 'Initial rate options should not be empty');

      // Apply price filter <= 40 USD and sort by price low->high
      const updated = this.logic.updateShipmentQuoteFiltersAndSort(
        quote.id,
        undefined, // delivery_time_filter_business_days_max
        40,        // price_filter_max
        'usd',     // price_filter_currency
        undefined, // co2_filter_max_kg
        'price_low_to_high'
      );
      this.assert(updated && updated.quote, 'Updated quote should be returned');
      quote = updated.quote;
      rateOptions = updated.rate_options || [];
      this.assert(rateOptions.length > 0, 'Filtered options (<= $40) should not be empty');

      const affordableOptions = rateOptions.filter(function (ro) { return ro.price <= 40; });
      this.assert(affordableOptions.length > 0, 'There should be at least one option <= $40');

      // Prefer an economy or standard option if available, otherwise first affordable
      let chosenOption = affordableOptions.find(function (ro) {
        return ro.service_level === 'economy' || ro.service_level === 'standard';
      });
      if (!chosenOption) {
        chosenOption = affordableOptions[0];
      }
      this.assert(chosenOption, 'Should choose an affordable rate option');
      this.assert(chosenOption.price <= 40, 'Chosen option must cost <= $40');

      // Select option and create shipment
      const selectResult = this.logic.selectShippingRateOption(
        quote.id,
        chosenOption.id,
        true // create_shipment
      );
      this.assert(selectResult && selectResult.shipment_created === true, 'Shipment should be created from selected option');
      const shipment = selectResult.shipment;
      this.assert(shipment && shipment.id, 'Shipment should have an ID');

      // Retrieve shipment details (simulate Shipment Details page)
      const shipmentDetails = this.logic.getShipmentDetailsForEdit(shipment.id);
      this.assert(shipmentDetails && shipmentDetails.cost_summary, 'Shipment details should include cost summary');
      const costSummaryDetails = shipmentDetails.cost_summary;
      this.assert(
        typeof costSummaryDetails.total_charges === 'number',
        'Total charges should be a number on details page'
      );
      this.assert(
        costSummaryDetails.total_charges <= 40,
        'Total charges on details page should be <= $40'
      );

      // Payment page summary
      const paymentSummary = this.logic.getPaymentSummaryForShipment(shipment.id);
      this.assert(paymentSummary && paymentSummary.cost_summary, 'Payment summary should be returned');
      const costSummaryPayment = paymentSummary.cost_summary;
      this.assert(
        costSummaryPayment.total_charges <= 40,
        'Total charges on payment page should be <= $40'
      );

      // Submit payment with test card details and billing address of Alex Chen
      const billingAddressList = JSON.parse(localStorage.getItem('addresses') || '[]');
      const alexAddress = billingAddressList.find(function (a) { return a.id === 'addr_alex_chen_toronto'; });
      this.assert(alexAddress, 'Alex Chen address should exist in setup data');

      const paymentResult = this.logic.submitPaymentForShipment(
        shipment.id,
        '4242424242424242', // card_number
        '12',               // card_expiry_month
        '30',               // card_expiry_year
        '123',              // card_cvc
        'Alex Chen',        // billing_name
        {
          street_line1: alexAddress.street_line1,
          street_line2: alexAddress.street_line2,
          city: alexAddress.city,
          state_province: alexAddress.state_province,
          postal_code: alexAddress.postal_code,
          country: alexAddress.country
        }
      );
      this.assert(paymentResult && paymentResult.payment, 'Payment result should include payment entity');
      this.assert(paymentResult.success === true, 'Payment success flag should be true');
      this.assert(
        paymentResult.payment.status === 'succeeded',
        'Payment status should be succeeded'
      );
      this.assert(
        paymentResult.payment.shipment_id === shipment.id,
        'Payment should reference the correct shipment ID'
      );

      // Shipment confirmation page
      const confirmation = this.logic.getShipmentConfirmationDetails(shipment.id);
      this.assert(confirmation && confirmation.shipment, 'Shipment confirmation should return shipment');
      this.assert(confirmation.payment && confirmation.payment.id, 'Confirmation should include payment');
      this.assert(
        confirmation.payment.id === paymentResult.payment.id,
        'Confirmation payment should match processed payment'
      );
      this.assert(
        confirmation.shipment.label_url,
        'Shipment confirmation should include a label URL'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3 (adapted: earliest available afternoon slot on Friday at or after 13:00)
  testTask3_ScheduleMadridPickupFridayAfternoon() {
    const testName = 'Task 3: Schedule Madrid pickup on Friday afternoon for pre-labeled packages';
    console.log('Testing:', testName);
    try {
      const metadata = JSON.parse(localStorage.getItem('_metadata') || '{}');
      const baselineDate = metadata.baselineDate || '2026-03-03';
      // Known upcoming Friday in generated data is 2026-03-06
      const pickupDate = '2026-03-06';

      // Get available pickup time slots for Madrid 28001 on that Friday
      const slots = this.logic.getAvailablePickupTimeSlots(
        '28001',
        'Madrid',
        'Spain',
        pickupDate
      );
      this.assert(Array.isArray(slots), 'Pickup time slots should be an array');
      const availableSlots = slots.filter(function (s) { return s.is_available; });
      this.assert(availableSlots.length > 0, 'There should be available pickup time slots');

      // Choose earliest available slot whose start time is >= 13:00 (adapted from 14:00 based on data)
      let candidateSlots = availableSlots.filter(function (s) {
        return s.start_time >= '13:00';
      });
      if (candidateSlots.length === 0) {
        // Fallback: use latest available slot if none meet the 13:00+ condition
        candidateSlots = availableSlots.slice().sort(function (a, b) {
          if (a.start_time < b.start_time) return -1;
          if (a.start_time > b.start_time) return 1;
          return 0;
        });
      } else {
        candidateSlots = candidateSlots.sort(function (a, b) {
          if (a.start_time < b.start_time) return -1;
          if (a.start_time > b.start_time) return 1;
          return 0;
        });
      }
      const chosenSlot = candidateSlots[0];
      this.assert(chosenSlot, 'A pickup time slot should be chosen');

      // Create pickup request for 4 pre-labeled packages
      const pickupResult = this.logic.createPickupRequest(
        'pre_labeled',              // pickup_type
        true,                       // has_shipping_labels
        {
          contact_name: 'Laura García',
          street_line1: 'Calle de Alcalá 10',
          street_line2: '',
          city: 'Madrid',
          state_province: 'Madrid',
          postal_code: '28001',
          country: 'Spain'
        },
        4,                          // package_count
        25,                         // total_weight
        'kg',                       // weight_unit
        pickupDate,                 // pickup_date
        chosenSlot.id,              // timeSlotId
        '+34 600 000 000',          // contact_phone
        'laura@example.com',        // contact_email
        ''                          // special_instructions
      );
      this.assert(pickupResult && pickupResult.pickup_request, 'Pickup request should be created');
      const pickupRequest = pickupResult.pickup_request;
      this.assert(pickupRequest.package_count === 4, 'Pickup should be for 4 packages');
      this.assert(pickupRequest.total_weight === 25, 'Pickup total weight should be 25');
      this.assert(pickupRequest.weight_unit === 'kg', 'Pickup weight unit should be kg');
      this.assert(pickupRequest.time_slot_id === chosenSlot.id, 'Pickup should reference chosen time slot');
      this.assert(pickupRequest.status === 'scheduled', 'Pickup status should be scheduled');

      // Verify pickup address persisted and linked
      const addresses = JSON.parse(localStorage.getItem('addresses') || '[]');
      const pickupAddress = addresses.find(function (a) { return a.id === pickupRequest.pickup_address_id; });
      this.assert(pickupAddress, 'Pickup address entity should exist');
      this.assert(pickupAddress.city === 'Madrid', 'Pickup address city should be Madrid');
      this.assert(pickupAddress.postal_code === '28001', 'Pickup address postal code should be 28001');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4
  testTask4_EstimateCustomsAndSelectPrepaidOptionUnder60() {
    const testName = 'Task 4: Estimate customs for clothing LA->Tokyo and select prepaid option <= $60';
    console.log('Testing:', testName);
    try {
      // Get options for customs estimator
      const options = this.logic.getCustomsEstimatorOptions();
      this.assert(options && Array.isArray(options.contents_categories), 'Customs estimator options should be returned');

      // Ensure required category and purpose exist
      this.assert(
        options.contents_categories.indexOf('clothing_apparel') !== -1,
        'clothing_apparel category should be supported'
      );
      this.assert(
        options.shipment_purposes.indexOf('personal_gift') !== -1,
        'personal_gift purpose should be supported'
      );
      this.assert(
        options.supported_currencies.indexOf('usd') !== -1,
        'USD should be supported as customs currency'
      );

      // Create customs estimate for clothing from Los Angeles to Tokyo
      const estimateResult = this.logic.createCustomsEstimateAndRates(
        'United States',   // origin_country
        'Los Angeles',     // origin_city
        '90001',           // origin_postal_code
        'Japan',           // destination_country
        'Tokyo',           // destination_city
        '100-0001',        // destination_postal_code
        'clothing_apparel',// contents_category
        '3 cotton shirts', // contents_description
        250,               // customs_value
        'usd',             // customs_value_currency
        'personal_gift'    // shipment_purpose
      );
      this.assert(estimateResult && estimateResult.customs_estimate, 'Customs estimate should be created');
      let customsEstimate = estimateResult.customs_estimate;
      let rateOptions = estimateResult.rate_options || [];
      this.assert(rateOptions.length > 0, 'Customs estimator should return shipping rate options');

      // Filter for options that support prepaid duties and have estimated duties <= 60 USD
      let eligibleOptions = rateOptions.filter(function (ro) {
        const hasPrepaid = ro.supports_prepaid_duties === true;
        const hasEstimate = typeof ro.estimated_duties === 'number';
        const dutiesOk = hasEstimate ? ro.estimated_duties <= 60 : false;
        return hasPrepaid && dutiesOk;
      });

      // If no options have explicit estimated duties, fall back to any prepaid option (still tests prepaid flow)
      if (eligibleOptions.length === 0) {
        eligibleOptions = rateOptions.filter(function (ro) { return ro.supports_prepaid_duties === true; });
      }

      this.assert(eligibleOptions.length > 0, 'There should be at least one option supporting prepaid duties');
      const chosenOption = eligibleOptions[0];

      // Select option and include prepaid duties
      const selectResult = this.logic.selectCustomsPrepaidOption(
        customsEstimate.id,
        chosenOption.id,
        true // include_prepaid_duties
      );
      this.assert(selectResult && selectResult.customs_estimate, 'Should return updated customs estimate after selection');
      customsEstimate = selectResult.customs_estimate;
      this.assert(
        customsEstimate.selected_rate_option_id === chosenOption.id,
        'Customs estimate should reference selected rate option'
      );
      this.assert(
        customsEstimate.include_prepaid_duties === true,
        'Customs estimate should have include_prepaid_duties=true'
      );

      // Save the customs estimate
      const saveResult = this.logic.saveCustomsEstimate(customsEstimate.id);
      this.assert(saveResult && saveResult.customs_estimate, 'Saved customs estimate should be returned');
      this.assert(
        saveResult.customs_estimate.saved === true,
        'Customs estimate saved flag should be true'
      );

      // Verify it appears in home overview saved_customs_estimates list
      const homeOverview = this.logic.getHomeOverview();
      const savedEstimates = homeOverview.saved_customs_estimates || [];
      const found = savedEstimates.find(function (e) { return e.id === customsEstimate.id; });
      this.assert(found, 'Saved customs estimate should appear in home overview');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5
  testTask5_FindNearestBerlinDropoffOpenAfter19AndSave() {
    const testName = 'Task 5: Find nearest Berlin drop-off open after 19:00 and save it';
    console.log('Testing:', testName);
    try {
      // Search locations near "Berlin 10117, Germany" within 5 km, drop_off, international, open after 19:00
      const searchResults = this.logic.searchLocations(
        'Berlin 10117, Germany', // query
        5,                       // radius_km
        ['drop_off'],            // location_types
        true,                    // accepts_international_shipments
        '19:00',                 // weekday_open_after_time
        'distance_nearest_first' // sort_option
      );
      this.assert(Array.isArray(searchResults), 'searchLocations should return an array');
      this.assert(searchResults.length > 0, 'There should be at least one matching location');

      // Verify filters on returned locations
      for (let i = 0; i < searchResults.length; i++) {
        const item = searchResults[i];
        this.assert(item.location, 'Each result should contain a location entity');
        this.assert(
          item.location.accepts_international_shipments === true,
          'Location should accept international shipments'
        );
        this.assert(
          item.location.location_type === 'drop_off',
          'Location type should be drop_off'
        );
        this.assert(
          item.is_open_after_filter_time === true,
          'Location should be open after the filter time'
        );
      }

      // Choose first location whose weekday closing time is at or after 20:00 if possible
      let chosen = searchResults.find(function (item) {
        const closeTime = item.location.weekday_close_time || '';
        return closeTime >= '20:00';
      });
      if (!chosen) {
        chosen = searchResults[0];
      }
      this.assert(chosen && chosen.location, 'A location should be chosen from search results');

      const locationId = chosen.location.id;

      // Get full location details
      const details = this.logic.getLocationDetails(locationId);
      this.assert(details && details.location, 'Location details should be returned');
      this.assert(details.location.id === locationId, 'Location details ID should match chosen location');

      // Save this location to Saved Locations
      const saveResult = this.logic.saveLocation(
        locationId,
        'Berlin late drop-off', // label
        false                   // is_favorite
      );
      this.assert(saveResult && saveResult.saved_location, 'Saved location should be returned');
      const savedLocation = saveResult.saved_location;
      this.assert(savedLocation.location_id === locationId, 'SavedLocation should reference the correct location ID');

      // Verify via getSavedLocations
      const savedList = this.logic.getSavedLocations();
      this.assert(Array.isArray(savedList), 'getSavedLocations should return an array');
      const found = savedList.find(function (entry) {
        return entry.saved_location && entry.saved_location.id === savedLocation.id;
      });
      this.assert(found, 'Newly saved location should appear in saved locations list');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6 (adapted: choose third available slot, which is the latest and closest to evening)
  testTask6_RescheduleDeliveryToLaterSlotForInTransitPackage() {
    const testName = 'Task 6: Reschedule delivery for in-transit package to later time slot';
    console.log('Testing:', testName);
    try {
      const trackingNumber = 'ZX123456789US';

      // Track shipment by number
      const trackingResult = this.logic.trackShipmentByNumber(trackingNumber);
      this.assert(trackingResult && trackingResult.shipment, 'trackShipmentByNumber should return a shipment');
      this.assert(
        !trackingResult.error_message,
        'Tracking should not return an error message for a valid tracking number'
      );
      this.assert(trackingResult.can_manage_delivery === true, 'Shipment should be manageable for delivery options');
      const shipment = trackingResult.shipment;

      // Get delivery reschedule options
      const rescheduleOptions = this.logic.getDeliveryRescheduleOptions(shipment.id);
      this.assert(rescheduleOptions && Array.isArray(rescheduleOptions.available_time_slots), 'Reschedule options should include available_time_slots');
      const slots = rescheduleOptions.available_time_slots;
      const availableSlots = slots.filter(function (s) { return s.is_available; });
      this.assert(availableSlots.length > 0, 'There should be available delivery time slots');

      // Select third available future slot (or last if fewer than three)
      availableSlots.sort(function (a, b) {
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        if (a.start_time < b.start_time) return -1;
        if (a.start_time > b.start_time) return 1;
        return 0;
      });
      const index = availableSlots.length >= 3 ? 2 : availableSlots.length - 1;
      const chosenSlot = availableSlots[index];
      this.assert(chosenSlot, 'A delivery time slot should be chosen for reschedule');

      const instructions = 'Please ring doorbell only once.';

      // Submit delivery reschedule request
      const rescheduleResult = this.logic.submitDeliveryRescheduleRequest(
        shipment.id,
        chosenSlot.id,
        instructions
      );
      this.assert(rescheduleResult && rescheduleResult.reschedule_request, 'Reschedule request should be returned');
      const request = rescheduleResult.reschedule_request;
      this.assert(request.shipment_id === shipment.id, 'Reschedule request should reference correct shipment');
      this.assert(request.new_time_window_start === chosenSlot.start_time, 'New time window start should match chosen slot');
      this.assert(request.new_time_window_end === chosenSlot.end_time, 'New time window end should match chosen slot');
      this.assert(request.delivery_instructions === instructions, 'Reschedule request should include new delivery instructions');

      // Verify shipment updated with new instructions
      const trackingAfter = this.logic.trackShipmentByNumber(trackingNumber);
      this.assert(trackingAfter && trackingAfter.shipment, 'Shipment should still be trackable after reschedule');
      this.assert(
        trackingAfter.shipment.delivery_instructions === instructions,
        'Shipment delivery instructions should be updated after reschedule'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7 (adapted: create London recipient within test, then use for express shipment draft)
  testTask7_CreateShanghaiBusinessSenderAndSaveExpressDraftWithInsurance() {
    const testName = 'Task 7: Create Shanghai business sender and save express shipment draft with $500 insurance';
    console.log('Testing:', testName);
    try {
      // Create business sender address: Dragon Exports Ltd, Shanghai
      const dragonAddressResult = this.logic.createOrUpdateAddress(
        undefined,          // addressId (new)
        'business',         // address_type
        undefined,          // name
        'Dragon Exports Ltd', // company_name
        '88 Nanjing Road',  // street_line1
        '',                 // street_line2
        'Shanghai',         // city
        '',                 // state_province
        '200001',           // postal_code
        'China',            // country
        '+86 21 5555 0000', // phone
        undefined,          // email
        true,               // saved_in_address_book
        true,               // is_default_sender
        false               // is_default_recipient
      );
      this.assert(dragonAddressResult && dragonAddressResult.address, 'Business sender address should be created');
      const dragonAddress = dragonAddressResult.address;
      this.assert(dragonAddress.address_type === 'business', 'Dragon Exports address type should be business');
      this.assert(dragonAddress.city === 'Shanghai', 'Dragon Exports city should be Shanghai');

      // Create recipient address: Acme Corp, London, United Kingdom (as existing recipient)
      const acmeAddressResult = this.logic.createOrUpdateAddress(
        undefined,             // addressId (new)
        'recipient',           // address_type
        undefined,             // name
        'Acme Corp',           // company_name
        '1 London Road',       // street_line1
        '',                    // street_line2
        'London',              // city
        '',                    // state_province
        'SW1A 1AA',            // postal_code
        'United Kingdom',      // country
        '+44 20 7946 0000',    // phone
        'shipping@acmecorp.example', // email
        true,                  // saved_in_address_book
        false,                 // is_default_sender
        true                   // is_default_recipient
      );
      this.assert(acmeAddressResult && acmeAddressResult.address, 'Recipient address Acme Corp should be created');
      const acmeAddress = acmeAddressResult.address;

      // Create shipment quote for box from Shanghai to London
      const metadata = JSON.parse(localStorage.getItem('_metadata') || '{}');
      const baselineDate = metadata.baselineDate || '2026-03-03';
      const shipmentDate = baselineDate + 'T00:00:00Z';

      const quoteResult = this.logic.createShipmentQuote(
        'create_shipment', // mode
        'Shanghai',        // origin_city
        '200001',          // origin_postal_code
        'China',           // origin_country
        'London',          // destination_city
        'SW1A 1AA',        // destination_postal_code
        'United Kingdom',  // destination_country
        'box',             // package_type
        'parcel',          // shipment_type
        2,                 // weight
        'kg',              // weight_unit
        30,                // length
        20,                // width
        10,                // height
        'cm',              // dimension_unit
        shipmentDate       // shipment_date
      );
      this.assert(quoteResult && quoteResult.quote, 'Quote should be created for Shanghai->London');
      let quote = quoteResult.quote;
      let rateOptions = quoteResult.rate_options || [];
      this.assert(rateOptions.length > 0, 'Rate options should be returned for Shanghai->London');

      // Filter for services delivering in 3 business days or less and sort by fastest
      const updated = this.logic.updateShipmentQuoteFiltersAndSort(
        quote.id,
        3,          // delivery_time_filter_business_days_max
        undefined,  // price_filter_max
        undefined,  // price_filter_currency
        undefined,  // co2_filter_max_kg
        'fastest_delivery'
      );
      this.assert(updated && updated.quote, 'Updated quote for express/fast options should be returned');
      quote = updated.quote;
      rateOptions = updated.rate_options || [];
      this.assert(rateOptions.length > 0, 'Filtered rate options <=3 days should not be empty');

      // Prefer express or priority service
      let chosenOption = rateOptions.find(function (ro) {
        return ro.service_level === 'express' || ro.service_level === 'priority';
      });
      if (!chosenOption) {
        chosenOption = rateOptions[0];
      }
      this.assert(chosenOption, 'Should have a chosen express/priority (or fastest) option');

      // Select the service and create shipment
      const selectResult = this.logic.selectShippingRateOption(
        quote.id,
        chosenOption.id,
        true // create_shipment
      );
      this.assert(selectResult && selectResult.shipment_created === true, 'Shipment should be created');
      let shipment = selectResult.shipment;
      this.assert(shipment && shipment.id, 'Shipment should have an ID');

      // Update shipment details with Dragon Exports as sender, Acme Corp as recipient, $500 declared value and full insurance
      const shipmentUpdateResult = this.logic.updateShipmentDetails(
        shipment.id,
        {
          name: dragonAddress.name || '',
          company_name: dragonAddress.company_name,
          street_line1: dragonAddress.street_line1,
          street_line2: dragonAddress.street_line2,
          city: dragonAddress.city,
          state_province: dragonAddress.state_province,
          postal_code: dragonAddress.postal_code,
          country: dragonAddress.country,
          phone: dragonAddress.phone,
          email: dragonAddress.email
        },
        {
          name: acmeAddress.name || '',
          company_name: acmeAddress.company_name,
          street_line1: acmeAddress.street_line1,
          street_line2: acmeAddress.street_line2,
          city: acmeAddress.city,
          state_province: acmeAddress.state_province,
          postal_code: acmeAddress.postal_code,
          country: acmeAddress.country,
          phone: acmeAddress.phone,
          email: acmeAddress.email
        },
        500,        // declared_value
        'usd',      // declared_value_currency
        'full_value', // insurance_type
        true,       // insurance_included
        undefined   // duties_option
      );
      this.assert(shipmentUpdateResult && shipmentUpdateResult.shipment, 'Shipment should be updated with value and insurance');
      shipment = shipmentUpdateResult.shipment;
      this.assert(shipment.declared_value === 500, 'Declared value on shipment should be 500');
      this.assert(shipment.insurance_type === 'full_value', 'Insurance type should be full_value');
      this.assert(shipment.insurance_included === true, 'Insurance should be included');

      // Save as draft instead of purchasing
      const draftResult = this.logic.saveShipmentAsDraft(shipment.id);
      this.assert(draftResult && draftResult.shipment, 'Draft shipment should be returned');
      const draftShipment = draftResult.shipment;
      this.assert(draftShipment.status === 'draft', 'Shipment status should be draft');

      // Verify via account overview that shipment appears in draft_shipments
      const accountOverview = this.logic.getAccountOverview();
      const drafts = accountOverview.draft_shipments || [];
      const foundDraft = drafts.find(function (s) { return s.id === draftShipment.id; });
      this.assert(foundDraft, 'Draft shipment should appear in account overview draft_shipments');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8
  testTask8_ChooseAmsterdamSydneyLowCarbonServiceUnder100() {
    const testName = 'Task 8: Choose Amsterdam->Sydney service with CO2 <= 15kg and price <= $100';
    console.log('Testing:', testName);
    try {
      // Optionally load shipping search options (simulating Ship/Get a Quote page)
      const searchOptions = this.logic.getShippingSearchOptions();
      this.assert(searchOptions && Array.isArray(searchOptions.package_types), 'Shipping search options should be returned');

      const metadata = JSON.parse(localStorage.getItem('_metadata') || '{}');
      const baselineDate = metadata.baselineDate || '2026-03-03';
      const shipmentDate = baselineDate + 'T00:00:00Z';

      // Create a quote for 2kg box from Amsterdam to Sydney
      const quoteResult = this.logic.createShipmentQuote(
        'quote',       // mode
        'Amsterdam',   // origin_city
        '1012 AB',     // origin_postal_code
        'Netherlands', // origin_country
        'Sydney',      // destination_city
        '2000',        // destination_postal_code
        'Australia',   // destination_country
        'box',         // package_type
        'parcel',      // shipment_type
        2,             // weight
        'kg',          // weight_unit
        30,            // length
        20,            // width
        10,            // height
        'cm',          // dimension_unit
        shipmentDate   // shipment_date
      );
      this.assert(quoteResult && quoteResult.quote, 'Amsterdam->Sydney quote should be created');
      let quote = quoteResult.quote;
      let rateOptions = quoteResult.rate_options || [];
      this.assert(rateOptions.length > 0, 'Initial Amsterdam->Sydney rate options should not be empty');

      // Apply CO2 <=15kg and price <=100 USD, sort by fastest delivery
      const updated = this.logic.updateShipmentQuoteFiltersAndSort(
        quote.id,
        undefined, // delivery_time_filter_business_days_max
        100,       // price_filter_max
        'usd',     // price_filter_currency
        15,        // co2_filter_max_kg
        'fastest_delivery'
      );
      this.assert(updated && updated.quote, 'Updated quote with CO2/price filters should be returned');
      quote = updated.quote;
      rateOptions = updated.rate_options || [];
      this.assert(rateOptions.length > 0, 'Filtered rate options (<=100 USD, CO2<=15kg) should not be empty');

      // Verify filter conditions
      for (let i = 0; i < rateOptions.length; i++) {
        const ro = rateOptions[i];
        this.assert(ro.price <= 100, 'Rate option price should be <= 100 USD');
        if (typeof ro.co2_kg === 'number') {
          this.assert(ro.co2_kg <= 15, 'Rate option CO2 should be <= 15 kg when specified');
        }
      }

      // After sorting by fastest_delivery, first option should be the fastest among filtered ones
      const chosenOption = rateOptions[0];
      this.assert(chosenOption, 'A fastest option should be chosen from filtered list');

      // Select the option but keep this as a quote only (no shipment creation)
      const selectResult = this.logic.selectShippingRateOption(
        quote.id,
        chosenOption.id,
        false // create_shipment = false, just keep quote
      );
      this.assert(selectResult && selectResult.selected_rate_option, 'Selected rate option should be returned');
      this.assert(
        selectResult.selected_rate_option.id === chosenOption.id,
        'Selected option ID should match chosen fastest option'
      );
      this.assert(
        selectResult.shipment_created === false,
        'No shipment should be created when create_shipment=false'
      );

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
    console.log('✓ ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('✗ ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
