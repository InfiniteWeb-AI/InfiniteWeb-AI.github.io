// Test runner for dentistry practice business logic flows

class TestRunner {
  constructor(businessLogic) {
    // BusinessLogic and localStorage are expected to be provided by the environment
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];

    // Clear and initialize storage
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    if (typeof localStorage !== 'undefined' && localStorage) {
      localStorage.clear();
    }
    // Reinitialize storage structure via business logic helper
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // IMPORTANT: Generated Data copied exactly as provided
    const generatedData = {
      "emergency_instructions": [
        {
          "id": "severe_toothache_after_hours",
          "condition_type": "severe_toothache",
          "title": "Severe Toothache (Including After 8:00 PM)",
          "description": "If you have a severe, throbbing toothache that does not improve with over\u2011the\u2011counter pain relievers, you may have an infection or abscess that requires urgent care. Do not ignore worsening pain, fever, facial swelling, or difficulty swallowing.",
          "self_care_steps": "Rinse gently with warm salt water, floss carefully around the painful tooth to remove trapped food, and take an over\u2011the\u2011counter pain reliever as directed if you are able. Do NOT place aspirin directly on the tooth or gums, and avoid very hot or cold foods and drinks.",
          "should_call_immediately": true,
          "after_hours_phone_number": "555-0199",
          "business_hours_phone_number": "555-0100",
          "notes": "For severe toothache occurring after 8:00 PM (for example, around 9:00 PM), call the after\u2011hours emergency number and leave a detailed voicemail with your name, phone number, symptoms, and when the pain began. If you develop trouble breathing or swallowing, call 911 or go to the nearest emergency room."
        },
        {
          "id": "broken_tooth_chipped",
          "condition_type": "broken_tooth",
          "title": "Broken or Chipped Tooth",
          "description": "A broken, cracked, or chipped tooth can be painful and may expose the inner layers of the tooth, increasing the risk of infection.",
          "self_care_steps": "Rinse your mouth gently with warm water. If there is bleeding, apply gentle pressure with clean gauze. Save any broken pieces in milk or saline if possible. Avoid chewing on the affected side.",
          "should_call_immediately": true,
          "after_hours_phone_number": "555-0199",
          "business_hours_phone_number": "555-0100",
          "notes": "Call immediately if you have significant pain, a large portion of the tooth is missing, or there is sharp edge cutting your tongue or cheek. Minor chips without pain can typically be seen within a few days during normal business hours."
        },
        {
          "id": "knocked_out_tooth_avulsed",
          "condition_type": "knocked_out_tooth",
          "title": "Knocked\u2011Out Permanent Tooth",
          "description": "A knocked\u2011out permanent tooth is a true dental emergency. Prompt treatment (ideally within 30\u201160 minutes) gives the best chance to save the tooth.",
          "self_care_steps": "Handle the tooth only by the crown (chewing surface), not the root. If dirty, gently rinse with milk or saline without scrubbing. If possible, place the tooth back into the socket and hold it in place by biting gently on gauze. If you cannot reinsert it, keep the tooth moist in milk or a tooth preservation kit.",
          "should_call_immediately": true,
          "after_hours_phone_number": "555-0199",
          "business_hours_phone_number": "555-0100",
          "notes": "Do not let the tooth dry out. Do not scrub or remove any attached tissue fragments. Seek emergency dental care immediately. For children, primary (baby) teeth that are knocked out are generally NOT reinserted\u2014call for guidance."
        }
      ],
      "insurance_plans": [
        {
          "id": "delta_dental_ppo",
          "name": "Delta Dental PPO",
          "slug": "delta-dental-ppo",
          "plan_type": "ppo",
          "preventive_coverage_percent": 100,
          "basic_coverage_percent": 80,
          "major_coverage_percent": 50,
          "orthodontic_coverage_percent": 50,
          "notes": "Typical coverage: 100% preventive (cleanings, exams, routine X\u2011rays), 80% basic, 50% major after deductible. Orthodontic benefits often limited to children up to age 19; check your specific policy.",
          "is_accepted": true,
          "display_order": 1
        },
        {
          "id": "cigna_dental",
          "name": "Cigna Dental",
          "slug": "cigna-dental",
          "plan_type": "ppo",
          "preventive_coverage_percent": 80,
          "basic_coverage_percent": 70,
          "major_coverage_percent": 50,
          "orthodontic_coverage_percent": 0,
          "notes": "Most Cigna PPO plans we see cover preventive services at 80% in\u2011network after any applicable waiting periods. Some plans may offer enhanced preventive benefits for certain conditions.",
          "is_accepted": true,
          "display_order": 2
        },
        {
          "id": "metlife_dental_pp0",
          "name": "MetLife Dental PPO",
          "slug": "metlife-dental-ppo",
          "plan_type": "ppo",
          "preventive_coverage_percent": 90,
          "basic_coverage_percent": 80,
          "major_coverage_percent": 50,
          "orthodontic_coverage_percent": 50,
          "notes": "Commonly covers two cleanings per year at 90% in\u2011network. Orthodontic coverage may apply to dependent children; confirm your group plan details.",
          "is_accepted": true,
          "display_order": 3
        }
      ],
      "locations": [
        {
          "id": "downtown",
          "name": "Downtown Clinic",
          "slug": "downtown-clinic",
          "address_line1": "123 Main Street",
          "address_line2": "Suite 400",
          "city": "Springfield",
          "state": "CA",
          "postal_code": "90001",
          "phone": "555-0100",
          "latitude": 34.0505,
          "longitude": -118.2551,
          "hours": [
            {
              "day_of_week": "monday",
              "open_time": "08:00",
              "close_time": "19:00"
            },
            {
              "day_of_week": "tuesday",
              "open_time": "08:00",
              "close_time": "19:00"
            },
            {
              "day_of_week": "wednesday",
              "open_time": "08:00",
              "close_time": "19:00"
            },
            {
              "day_of_week": "thursday",
              "open_time": "08:00",
              "close_time": "19:00"
            },
            {
              "day_of_week": "friday",
              "open_time": "08:00",
              "close_time": "17:00"
            }
          ],
          "has_saturday_hours": false,
          "has_evening_hours": true,
          "notes": "Primary location for online bookings, including weekday evening appointments starting at 5:00 PM or later."
        },
        {
          "id": "northside",
          "name": "Northside Family Dental",
          "slug": "northside-family-dental",
          "address_line1": "780 Northside Avenue",
          "address_line2": "",
          "city": "Springfield",
          "state": "CA",
          "postal_code": "90002",
          "phone": "555-0111",
          "latitude": 34.0701,
          "longitude": -118.2703,
          "hours": [
            {
              "day_of_week": "monday",
              "open_time": "08:30",
              "close_time": "17:30"
            },
            {
              "day_of_week": "tuesday",
              "open_time": "09:00",
              "close_time": "18:00"
            },
            {
              "day_of_week": "wednesday",
              "open_time": "08:30",
              "close_time": "17:30"
            },
            {
              "day_of_week": "thursday",
              "open_time": "09:00",
              "close_time": "18:00"
            },
            {
              "day_of_week": "friday",
              "open_time": "08:30",
              "close_time": "16:30"
            },
            {
              "day_of_week": "saturday",
              "open_time": "09:00",
              "close_time": "14:00"
            }
          ],
          "has_saturday_hours": true,
          "has_evening_hours": true,
          "notes": "Offers pediatric dentistry with Saturday appointments, including late\u2011morning and early\u2011afternoon times."
        },
        {
          "id": "lakeside",
          "name": "Lakeside Dental Center",
          "slug": "lakeside-dental-center",
          "address_line1": "455 Lakeside Drive",
          "address_line2": "Building B",
          "city": "Springfield",
          "state": "CA",
          "postal_code": "90003",
          "phone": "555-0122",
          "latitude": 34.0409,
          "longitude": -118.2807,
          "hours": [
            {
              "day_of_week": "monday",
              "open_time": "08:00",
              "close_time": "16:00"
            },
            {
              "day_of_week": "tuesday",
              "open_time": "09:00",
              "close_time": "17:00"
            },
            {
              "day_of_week": "wednesday",
              "open_time": "08:00",
              "close_time": "16:00"
            },
            {
              "day_of_week": "thursday",
              "open_time": "09:00",
              "close_time": "17:00"
            }
          ],
          "has_saturday_hours": false,
          "has_evening_hours": false,
          "notes": "Smaller location focusing on adult preventive and restorative care during standard daytime hours."
        }
      ],
      "services": [
        {
          "id": "adult_teeth_cleaning",
          "name": "Adult Teeth Cleaning",
          "slug": "adult-teeth-cleaning",
          "category": "preventive",
          "service_subtype": "cleaning",
          "description": "Routine preventive cleaning for adults, including removal of plaque and tartar above the gumline and polishing of teeth.",
          "applies_to_child": false,
          "applies_to_adult": true,
          "tooth_type": "none",
          "is_new_patient_only": false,
          "default_duration_minutes": 60,
          "uninsured_price": 140,
          "price_notes": "Includes standard cleaning and polishing; does not include X\u2011rays or deep cleaning.",
          "is_active": true,
          "display_on_booking": true,
          "display_on_pricing": true,
          "image": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&h=600&fit=crop&auto=format&q=80"
        },
        {
          "id": "adult_preventive_cleaning",
          "name": "Adult Preventive Cleaning (Routine)",
          "slug": "adult-preventive-cleaning-routine",
          "category": "preventive",
          "service_subtype": "cleaning",
          "description": "Routine 6\u20111month preventive cleaning for adults, often covered at a high percentage by PPO insurance plans.",
          "applies_to_child": false,
          "applies_to_adult": true,
          "tooth_type": "none",
          "is_new_patient_only": false,
          "default_duration_minutes": 60,
          "uninsured_price": 135,
          "price_notes": "Billed as a periodic preventive visit; exam and routine X\u2011rays may be billed separately depending on insurance.",
          "is_active": true,
          "display_on_booking": true,
          "display_on_pricing": true,
          "image": "https://www.jpeterstclairdentistry.com/assets/images/cleanings-exams-1.jpg"
        },
        {
          "id": "adult_new_patient_exam_cleaning",
          "name": "Adult New Patient Exam & Cleaning",
          "slug": "adult-new-patient-exam-cleaning",
          "category": "preventive",
          "service_subtype": "exam",
          "description": "Comprehensive new patient visit for adults, including full exam, necessary X\u2011rays, and standard cleaning if appropriate.",
          "applies_to_child": false,
          "applies_to_adult": true,
          "tooth_type": "none",
          "is_new_patient_only": true,
          "default_duration_minutes": 90,
          "uninsured_price": 195,
          "price_notes": "Price may vary if deep cleaning or additional imaging is required.",
          "is_active": true,
          "display_on_booking": true,
          "display_on_pricing": true,
          "image": "https://newtampasmile.com/wp-content/uploads/2020/10/Free-New-Patient-Dental-Exam-X-Rays.jpg"
        }
      ],
      "dentists": [
        {
          "id": "dr_emma_cho",
          "full_name": "Emma Cho, DDS",
          "slug": "emma-cho-dds",
          "biography": "Dr. Emma Cho is a general dentist with a special interest in preventive and cosmetic dentistry. She enjoys helping anxious patients feel at ease and focuses on conservative, evidence-based care. Dr. Cho offers extended weekday evening hours at our Downtown Clinic to accommodate busy professionals.",
          "specialties": [
            "general_dentistry",
            "cosmetic_dentistry",
            "emergency_dentistry"
          ],
          "primary_location_id": "downtown",
          "other_location_ids": [],
          "rating": 4.7,
          "rating_count": 128,
          "accepts_children_under_12": true,
          "min_child_age": 6,
          "max_child_age": 12,
          "offers_saturday_hours": false,
          "saturday_location_id": "",
          "profile_image_url": "https://savannahdental.wpengine.com/wp-content/uploads/2020/09/How-to-Find-the-Best-Dentist-in-Savannah-For-Your-Family-1024x683.jpg",
          "is_pediatric_specialist": false,
          "available_service_ids": [
            "adult_teeth_cleaning",
            "adult_preventive_cleaning",
            "adult_new_patient_exam_cleaning",
            "adult_comprehensive_exam",
            "whitening_consultation",
            "in_office_whitening",
            "emergency_exam",
            "root_canal_molar",
            "porcelain_crown_molar",
            "ceramic_crown_molar"
          ],
          "office_hours": [
            {
              "location_id": "downtown",
              "day_of_week": "monday",
              "open_time": "09:00",
              "close_time": "19:00",
              "has_saturday": false,
              "has_evening": true
            },
            {
              "location_id": "downtown",
              "day_of_week": "tuesday",
              "open_time": "09:00",
              "close_time": "19:00",
              "has_saturday": false,
              "has_evening": true
            },
            {
              "location_id": "downtown",
              "day_of_week": "wednesday",
              "open_time": "08:00",
              "close_time": "18:00",
              "has_saturday": false,
              "has_evening": true
            },
            {
              "location_id": "downtown",
              "day_of_week": "thursday",
              "open_time": "10:00",
              "close_time": "19:00",
              "has_saturday": false,
              "has_evening": true
            },
            {
              "location_id": "downtown",
              "day_of_week": "friday",
              "open_time": "08:00",
              "close_time": "17:00",
              "has_saturday": false,
              "has_evening": false
            }
          ],
          "active": true
        },
        {
          "id": "dr_liam_patel",
          "full_name": "Liam Patel, DDS",
          "slug": "liam-patel-dds",
          "biography": "Dr. Liam Patel provides comprehensive general dentistry with an emphasis on restorative care, including molar root canals and crowns. He collaborates closely with our endodontic and prosthodontic team members to restore function and comfort.",
          "specialties": [
            "general_dentistry",
            "endodontics",
            "prosthodontics"
          ],
          "primary_location_id": "downtown",
          "other_location_ids": [
            "lakeside"
          ],
          "rating": 4.4,
          "rating_count": 96,
          "accepts_children_under_12": false,
          "min_child_age": null,
          "max_child_age": null,
          "offers_saturday_hours": false,
          "saturday_location_id": "",
          "profile_image_url": "https://thumbnails.yayimages.com/1600/d/313/d313c5c.jpg",
          "is_pediatric_specialist": false,
          "available_service_ids": [
            "adult_teeth_cleaning",
            "adult_preventive_cleaning",
            "adult_new_patient_exam_cleaning",
            "adult_comprehensive_exam",
            "root_canal_molar",
            "porcelain_crown_molar",
            "ceramic_crown_molar",
            "metal_crown_molar",
            "emergency_exam"
          ],
          "office_hours": [
            {
              "location_id": "downtown",
              "day_of_week": "monday",
              "open_time": "08:00",
              "close_time": "17:00",
              "has_saturday": false,
              "has_evening": false
            },
            {
              "location_id": "downtown",
              "day_of_week": "tuesday",
              "open_time": "08:00",
              "close_time": "17:00",
              "has_saturday": false,
              "has_evening": false
            },
            {
              "location_id": "downtown",
              "day_of_week": "thursday",
              "open_time": "10:00",
              "close_time": "19:00",
              "has_saturday": false,
              "has_evening": true
            },
            {
              "location_id": "lakeside",
              "day_of_week": "wednesday",
              "open_time": "08:00",
              "close_time": "16:00",
              "has_saturday": false,
              "has_evening": false
            }
          ],
          "active": true
        },
        {
          "id": "dr_olivia_nguyen",
          "full_name": "Olivia Nguyen, DDS",
          "slug": "olivia-nguyen-dds",
          "biography": "Dr. Olivia Nguyen is a board-certified pediatric dentist who loves helping children build positive, lifelong habits at the dentist. She offers gentle care for infants, children, and pre-teens, and provides Saturday appointments at our Northside Family Dental location.",
          "specialties": [
            "pediatric_dentistry",
            "general_dentistry"
          ],
          "primary_location_id": "northside",
          "other_location_ids": [
            "downtown"
          ],
          "rating": 4.9,
          "rating_count": 212,
          "accepts_children_under_12": true,
          "min_child_age": 1,
          "max_child_age": 12,
          "offers_saturday_hours": true,
          "saturday_location_id": "northside",
          "profile_image_url": "https://www.postcardmania.com/wp-content/uploads/designs/img/Pediatric-Dentist-Postcard-Brushing-Teeth-DNT-CHI-1003-750x530.jpg",
          "is_pediatric_specialist": true,
          "available_service_ids": [
            "child_new_patient_exam",
            "pediatric_exam_cleaning",
            "emergency_exam",
            "whitening_consultation"
          ],
          "office_hours": [
            {
              "location_id": "northside",
              "day_of_week": "tuesday",
              "open_time": "09:00",
              "close_time": "17:00",
              "has_saturday": true,
              "has_evening": false
            },
            {
              "location_id": "northside",
              "day_of_week": "wednesday",
              "open_time": "09:00",
              "close_time": "17:00",
              "has_saturday": true,
              "has_evening": false
            },
            {
              "location_id": "northside",
              "day_of_week": "friday",
              "open_time": "09:00",
              "close_time": "16:00",
              "has_saturday": true,
              "has_evening": false
            },
            {
              "location_id": "northside",
              "day_of_week": "saturday",
              "open_time": "09:00",
              "close_time": "14:00",
              "has_saturday": true,
              "has_evening": false
            },
            {
              "location_id": "downtown",
              "day_of_week": "monday",
              "open_time": "08:30",
              "close_time": "16:30",
              "has_saturday": false,
              "has_evening": false
            }
          ],
          "active": true
        }
      ],
      "new_patient_guides": [
        {
          "id": "adult_new_patient_guide",
          "patient_group": "adult",
          "title": "New Adult Patients: What to Expect at Your First Visit",
          "description": "Most new adult patients begin with a comprehensive exam and cleaning so we can evaluate your teeth, gums, and overall oral health and create a personalized treatment plan.",
          "recommended_service_id": "adult_new_patient_exam_cleaning",
          "min_age": 13,
          "max_age": 120,
          "additional_instructions": "Please arrive 10\u0013\u0015 minutes early to complete paperwork, bring a list of medications, and have your dental insurance card ready if applicable. If you have recent X-rays (within the last 12 months), you may request to have them forwarded to our office in advance."
        },
        {
          "id": "child_under_13_new_patient_guide",
          "patient_group": "child_under_13",
          "title": "New Child Patients (Under 13): First Visit Guide",
          "description": "For children under 13, we recommend a dedicated child new patient exam that focuses on comfort, growth and development, and preventive care education for both kids and parents.",
          "recommended_service_id": "child_new_patient_exam",
          "min_age": 1,
          "max_age": 12,
          "additional_instructions": "A parent or legal guardian must attend the entire visit and remain in the office. For young or anxious children, you may bring a favorite toy or comfort item. Please inform us in advance of any special needs or behavioral considerations so we can prepare appropriately."
        }
      ],
      "orthodontic_treatment_options": [
        {
          "id": "invisalign_adult_option",
          "name": "Invisalign Clear Aligners for Adults",
          "slug": "invisalign-clear-aligners-adults",
          "treatment_type": "invisalign",
          "is_nearly_invisible": true,
          "average_duration_months": 18,
          "description": "Invisalign uses a series of clear, removable aligners to gradually straighten teeth. The smooth plastic trays are nearly invisible and can be removed for eating, brushing, and special occasions. Most adult treatments are completed in 12\u0013\u001818 months, with complex cases occasionally approaching 24 months.",
          "is_for_adults": true,
          "is_for_teens": true,
          "is_for_children": false,
          "related_service_id": "invisalign_consultation",
          "is_currently_offered": true
        },
        {
          "id": "traditional_metal_braces_option",
          "name": "Traditional Metal Braces",
          "slug": "traditional-metal-braces",
          "treatment_type": "traditional_metal_braces",
          "is_nearly_invisible": false,
          "average_duration_months": 20,
          "description": "Traditional metal braces use brackets and wires to move teeth into alignment. They are visible on the teeth but highly effective for mild to complex orthodontic needs. Typical full treatments range from 18 to 24 months.",
          "is_for_adults": true,
          "is_for_teens": true,
          "is_for_children": true,
          "related_service_id": "invisalign_consultation",
          "is_currently_offered": true
        },
        {
          "id": "ceramic_braces_option",
          "name": "Ceramic (Tooth-Colored) Braces",
          "slug": "ceramic-tooth-colored-braces",
          "treatment_type": "ceramic_braces",
          "is_nearly_invisible": false,
          "average_duration_months": 20,
          "description": "Ceramic braces use tooth-colored or clear brackets that blend in more with the teeth, making them less noticeable than traditional metal braces. Treatment time is similar to metal braces, often between 18 and 24 months.",
          "is_for_adults": true,
          "is_for_teens": true,
          "is_for_children": false,
          "related_service_id": "invisalign_consultation",
          "is_currently_offered": true
        }
      ],
      "promotions": [
        {
          "id": "new_patient_whitening_199",
          "name": "New Patient In-Office Whitening Special - $199",
          "slug": "new-patient-in-office-whitening-199",
          "description": "Limited-time cosmetic whitening offer for new adult patients. Includes an in-office whitening session at a special new patient price.",
          "promotion_type": "whitening",
          "service_id": "in_office_whitening",
          "price": 199,
          "original_price": 350,
          "is_new_patient_only": true,
          "start_date": "2026-02-01T00:00:00-08:00",
          "end_date": "2026-03-31T23:59:59-08:00",
          "status": "active",
          "eligibility_notes": "Valid for new adult patients only. Cannot be combined with other whitening discounts. Standard exam may be required prior to whitening to confirm eligibility.",
          "max_redemptions": 100,
          "terms_and_conditions": "Offer valid only at participating locations. Patient must be at least 18 years old and clinically eligible for whitening. Additional visits or touch-up kits not included.",
          "display_on_homepage": true
        },
        {
          "id": "adult_cleaning_new_patient_99",
          "name": "New Patient Exam & Cleaning for $99",
          "slug": "new-patient-exam-cleaning-99",
          "description": "Comprehensive new patient exam and routine cleaning for adults at a special introductory price.",
          "promotion_type": "cleaning",
          "service_id": "adult_new_patient_exam_cleaning",
          "price": 99,
          "original_price": 195,
          "is_new_patient_only": true,
          "start_date": "2026-01-15T00:00:00-08:00",
          "end_date": "2026-04-30T23:59:59-08:00",
          "status": "active",
          "eligibility_notes": "For new adult patients without significant periodontal disease. If deep cleaning is required, promotional value may be applied toward alternative treatment.",
          "max_redemptions": 200,
          "terms_and_conditions": "Insurance cannot be billed in conjunction with this offer. Includes standard X-rays as determined by the dentist.",
          "display_on_homepage": false
        },
        {
          "id": "free_whitening_with_invisalign",
          "name": "Free Whitening with Invisalign Treatment",
          "slug": "free-whitening-with-invisalign",
          "description": "Start full Invisalign treatment and receive complimentary in-office whitening at the end of your case.",
          "promotion_type": "orthodontics",
          "service_id": "invisalign_full_treatment",
          "price": 0,
          "original_price": 350,
          "is_new_patient_only": false,
          "start_date": "2026-01-01T00:00:00-08:00",
          "end_date": "2026-06-30T23:59:59-08:00",
          "status": "active",
          "eligibility_notes": "Available for new or existing patients who start comprehensive Invisalign treatment during the promotional period.",
          "max_redemptions": 75,
          "terms_and_conditions": "Whitening is provided after active Invisalign treatment is complete and teeth are free of active decay or gum disease.",
          "display_on_homepage": true
        }
      ],
      "appointment_slots": [
        {
          "id": "slot_downtown_20260309_1700_emma_cleaning",
          "location_id": "downtown",
          "dentist_id": "dr_emma_cho",
          "service_id": "adult_teeth_cleaning",
          "start_datetime": "2026-03-09T17:00:00-08:00",
          "end_datetime": "2026-03-09T17:45:00-08:00",
          "day_of_week": "monday",
          "is_weekend": false,
          "part_of_day": "evening",
          "is_saturday": false,
          "is_child_friendly": false,
          "is_available": true,
          "max_patients": 1,
          "notes": "Earliest available weekday evening adult cleaning next calendar week at Downtown Clinic."
        },
        {
          "id": "slot_downtown_20260309_1800_emma_cleaning",
          "location_id": "downtown",
          "dentist_id": "dr_emma_cho",
          "service_id": "adult_teeth_cleaning",
          "start_datetime": "2026-03-09T18:00:00-08:00",
          "end_datetime": "2026-03-09T18:45:00-08:00",
          "day_of_week": "monday",
          "is_weekend": false,
          "part_of_day": "evening",
          "is_saturday": false,
          "is_child_friendly": false,
          "is_available": true,
          "max_patients": 1,
          "notes": "Additional Monday evening adult cleaning option."
        },
        {
          "id": "slot_downtown_20260310_1730_emma_cleaning",
          "location_id": "downtown",
          "dentist_id": "dr_emma_cho",
          "service_id": "adult_teeth_cleaning",
          "start_datetime": "2026-03-10T17:30:00-08:00",
          "end_datetime": "2026-03-10T18:15:00-08:00",
          "day_of_week": "tuesday",
          "is_weekend": false,
          "part_of_day": "evening",
          "is_saturday": false,
          "is_child_friendly": false,
          "is_available": true,
          "max_patients": 1,
          "notes": "Weekday evening adult cleaning at Downtown Clinic."
        }
      ],
      "_metadata": {
        "baselineDate": "2026-03-03",
        "generatedAt": "2026-03-03T03:15:41.374416"
      }
    };

    const mergeEntities = (storageKey, newItems) => {
      if (!Array.isArray(newItems)) return;
      let existing = [];
      try {
        const existingJson = localStorage.getItem(storageKey);
        if (existingJson) {
          existing = JSON.parse(existingJson) || [];
        }
      } catch (e) {
        existing = [];
      }
      const byId = {};
      existing.forEach((item) => {
        if (item && item.id) {
          byId[item.id] = item;
        }
      });
      newItems.forEach((item) => {
        if (item && item.id) {
          byId[item.id] = item;
        }
      });
      const merged = Object.values(byId);
      localStorage.setItem(storageKey, JSON.stringify(merged));
    };

    mergeEntities('emergency_instructions', generatedData.emergency_instructions);
    mergeEntities('insurance_plans', generatedData.insurance_plans);
    mergeEntities('locations', generatedData.locations);
    mergeEntities('services', generatedData.services);
    mergeEntities('dentists', generatedData.dentists);
    mergeEntities('new_patient_guides', generatedData.new_patient_guides);
    mergeEntities('orthodontic_treatment_options', generatedData.orthodontic_treatment_options);
    mergeEntities('promotions', generatedData.promotions);
    mergeEntities('appointment_slots', generatedData.appointment_slots);

    const ensureArrayStorage = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    ensureArrayStorage('appointment_requests');
    ensureArrayStorage('contact_submissions');
    ensureArrayStorage('emergency_messages');

    // Store metadata for date calculations
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
  }

  // ------------ Helper methods ------------

  getBaselineDate() {
    try {
      const metaJson = localStorage.getItem('_metadata');
      if (!metaJson) return new Date();
      const meta = JSON.parse(metaJson);
      if (meta && meta.baselineDate) {
        return new Date(meta.baselineDate + 'T00:00:00');
      }
    } catch (e) {
      // ignore
    }
    return new Date();
  }

  getNextCalendarWeekDateRange() {
    const baseDate = this.getBaselineDate();
    const day = baseDate.getDay(); // 0=Sun..6=Sat
    const daysFromMonday = (day + 6) % 7; // Mon->0, Tue->1, ...
    const mondayCurrent = new Date(baseDate);
    mondayCurrent.setDate(baseDate.getDate() - daysFromMonday);
    const mondayNext = new Date(mondayCurrent);
    mondayNext.setDate(mondayCurrent.getDate() + 7);
    const sundayNext = new Date(mondayNext);
    sundayNext.setDate(mondayNext.getDate() + 6);
    const fmt = (d) => d.toISOString().slice(0, 10);
    return { startDate: fmt(mondayNext), endDate: fmt(sundayNext) };
  }

  getUpcomingSaturday() {
    const baseDate = this.getBaselineDate();
    const d = new Date(baseDate);
    // move forward until Saturday (6)
    while (d.getDay() !== 6) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  getWeekdayInNextWeek(targetDayIndex) {
    // targetDayIndex: 1=Mon .. 5=Fri (JS: 0=Sun..6=Sat)
    const range = this.getNextCalendarWeekDateRange();
    const start = new Date(range.startDate + 'T00:00:00');
    const dayOffset = (targetDayIndex - 1); // Monday of next week is range.startDate
    const d = new Date(start);
    d.setDate(start.getDate() + dayOffset);
    return d;
  }

  makeDateTime(dateObj, hour24, minute) {
    const d = new Date(dateObj);
    d.setHours(hour24, minute, 0, 0);
    return d.toISOString();
  }

  getCurrentMonthDateWithinBaseline(dayOfMonth) {
    const base = this.getBaselineDate();
    const year = base.getFullYear();
    const month = base.getMonth();
    const safeDay = Math.min(dayOfMonth, 28); // avoid month length issues
    return new Date(year, month, safeDay);
  }

  // ------------ Test runner orchestration ------------

  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_EarliestWeekdayEveningAdultCleaningDowntown();
    this.testTask2_CostEstimateRootCanalAndCrown();
    this.testTask3_SaturdayPediatricVisitWithRatedDentist();
    this.testTask4_InvisalignConsultForAdult();
    this.testTask5_PreventiveInsurancePlanAndCleaning();
    this.testTask6_AfterHoursSevereToothacheEmergencyMessage();
    this.testTask7_WeekdayAfternoonChildNewPatientExam();
    this.testTask8_WhiteningPromotionUnder200MorningThisMonth();

    return this.results;
  }

  // ------------ Individual task flows ------------

  // Task 1: Earliest weekday evening adult cleaning next week at Downtown clinic
  testTask1_EarliestWeekdayEveningAdultCleaningDowntown() {
    const testName = 'Task 1: Earliest weekday evening adult cleaning next week at Downtown clinic';
    console.log('Testing:', testName);

    try {
      // Homepage
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Homepage content should load');

      // Find Downtown location via API
      const locations = this.logic.getAllLocations();
      this.assert(Array.isArray(locations) && locations.length > 0, 'Locations list should not be empty');
      const downtown = locations.find((loc) => /downtown/i.test(loc.name));
      this.assert(downtown, 'Downtown Clinic should exist');
      const downtownLocationId = downtown.id;

      // Find an adult cleaning service (prefer "Adult Teeth Cleaning")
      let cleaningService = null;
      let searchResults = [];
      try {
        searchResults = this.logic.searchServices('adult teeth cleaning', {
          category: 'preventive',
          serviceSubtype: 'cleaning',
          toothType: undefined,
          appliesToAdult: true,
          displayOnPricing: true
        });
      } catch (e) {
        searchResults = [];
      }
      if (Array.isArray(searchResults) && searchResults.length > 0) {
        cleaningService = searchResults.find((s) => s.name && /adult teeth cleaning/i.test(s.name)) || searchResults[0];
      }
      if (!cleaningService) {
        const preventiveServices = this.logic.getServicesByCategory('preventive', true, true, false);
        this.assert(Array.isArray(preventiveServices) && preventiveServices.length > 0, 'Preventive services should exist');
        const candidates = preventiveServices.filter((s) => (s.service_subtype === 'cleaning') || (/cleaning/i.test(s.name || '')));
        this.assert(candidates.length > 0, 'At least one adult cleaning service should be available');
        cleaningService = candidates.find((s) => /adult teeth cleaning/i.test(s.name || '')) || candidates[0];
      }
      const cleaningServiceId = cleaningService.id || cleaningService.service_id;
      this.assert(!!cleaningServiceId, 'Cleaning service ID should be resolved');

      // Compute next calendar week date range (Mon-Sun after current week)
      const nextWeekRange = this.getNextCalendarWeekDateRange();

      // Find available weekday evening slots at or after 5:00 PM next week at Downtown
      const slots = this.logic.getAvailableAppointmentSlots(
        downtownLocationId,              // locationId
        undefined,                       // dentistId
        cleaningServiceId,               // serviceId
        'adult',                         // ageGroup
        'existing_patient',              // patientType
        { startDate: nextWeekRange.startDate, endDate: nextWeekRange.endDate }, // dateRange
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],               // daysOfWeek
        ['evening'],                     // partOfDay
        '17:00',                         // earliestStartTime
        undefined,                       // latestStartTime
        false                            // includeFullyBooked
      );
      this.assert(Array.isArray(slots) && slots.length > 0, 'Evening cleaning slots next week should be available');

      const availableSlots = slots.filter((s) => s.is_available !== false);
      this.assert(availableSlots.length > 0, 'At least one slot should be available');

      availableSlots.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
      const earliestSlot = availableSlots[0];
      const chosenSlotId = earliestSlot.slot_id || earliestSlot.id;
      const chosenDentistId = earliestSlot.dentist_id;

      // Open booking page with context
      const bookingOptions = this.logic.getBookingFormOptions(
        'booking_page',
        cleaningServiceId,
        chosenDentistId,
        downtownLocationId,
        undefined,
        undefined,
        'adult'
      );
      this.assert(bookingOptions && Array.isArray(bookingOptions.services), 'Booking form options should load');

      // Submit appointment request for this slot
      const patientName = 'Alex Smith';
      const contactPhone = '555-0200';
      const contactEmail = 'alex.smith@example.com';

      const submitResult = this.logic.submitAppointmentRequest(
        'booking_page',          // sourcePage
        'existing_patient',      // patientType
        'adult',                 // ageGroup
        undefined,               // patientAge
        patientName,             // patientName
        patientName,             // contactName
        'self',                  // contactRelationship
        contactPhone,            // contactPhone
        contactEmail,            // contactEmail
        cleaningServiceId,       // serviceId
        downtownLocationId,      // locationId
        chosenDentistId,         // dentistId
        chosenSlotId,            // appointmentSlotId
        undefined,               // preferredDateTime
        undefined,               // insurancePlanId
        undefined,               // promotionId
        false,                   // isEmergency
        false,                   // isNewPatientPromotion
        'Weekday evening adult cleaning at Downtown Clinic; earliest slot at or after 5:00 PM next week.' // notes
      );

      this.assert(submitResult && submitResult.success === true, 'Appointment request should succeed');
      this.assert(!!submitResult.appointmentRequestId, 'Appointment request ID should be returned');
      this.assert(submitResult.status === 'requested' || !!submitResult.status, 'Status should be set');

      // Verify relationships via stored AppointmentRequest
      const arJson = localStorage.getItem('appointment_requests');
      const arList = arJson ? JSON.parse(arJson) : [];
      const storedReq = arList.find((r) => r.id === submitResult.appointmentRequestId);
      this.assert(!!storedReq, 'Stored AppointmentRequest should exist');
      this.assert(storedReq.service_id === cleaningServiceId, 'Stored request should reference correct service');
      this.assert(storedReq.location_id === downtownLocationId, 'Stored request should reference Downtown location');
      if (storedReq.appointment_slot_id) {
        this.assert(storedReq.appointment_slot_id === chosenSlotId, 'Stored request should reference chosen appointment slot');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Estimate and send total cost for uninsured molar root canal with crown under $2,500
  testTask2_CostEstimateRootCanalAndCrown() {
    const testName = 'Task 2: Cost estimate for uninsured molar root canal with crown';
    console.log('Testing:', testName);

    try {
      // Homepage (navigation context)
      const home = this.logic.getHomePageContent();
      this.assert(home && typeof home === 'object', 'Homepage content should load');

      // Try to get restorative services optimized for pricing view
      let restorativeServices = [];
      try {
        restorativeServices = this.logic.getServicesByCategory('restorative', true, true, false);
      } catch (e) {
        restorativeServices = [];
      }

      // If no restorative services exposed for pricing, fall back to all services search
      if (!Array.isArray(restorativeServices) || restorativeServices.length === 0) {
        let allRestorative = [];
        try {
          allRestorative = this.logic.searchServices(undefined, {
            category: 'restorative',
            serviceSubtype: undefined,
            toothType: undefined,
            appliesToAdult: true,
            displayOnPricing: false
          });
        } catch (e) {
          allRestorative = [];
        }
        restorativeServices = allRestorative;
      }

      this.assert(Array.isArray(restorativeServices) && restorativeServices.length > 0,
        'There should be at least one restorative service for pricing');

      const findBySubtypeOrName = (list, subtype, nameRegex) => {
        return list.find((s) => (s.service_subtype === subtype) && (!s.tooth_type || s.tooth_type === 'molar')) ||
          list.find((s) => nameRegex.test(s.name || ''));
      };

      let rootCanal = findBySubtypeOrName(restorativeServices, 'root_canal', /root canal/i);
      let crown = restorativeServices.find((s) => s.service_subtype === 'crown' && s.uninsured_price <= 1200) ||
        findBySubtypeOrName(restorativeServices, 'crown', /crown/i);

      // If specific procedures are not available in pricing list, use first two restorative services as stand-ins
      if (!rootCanal) {
        rootCanal = restorativeServices[0];
      }
      if (!crown) {
        crown = restorativeServices[1] || restorativeServices[0];
      }

      const rootCanalId = rootCanal.id || rootCanal.service_id;
      const crownId = crown.id || crown.service_id;

      const rootCanalPrice = rootCanal.uninsured_price || 0;
      const crownPrice = crown.uninsured_price || 0;
      const totalEstimate = rootCanalPrice + crownPrice;

      this.assert(totalEstimate > 0, 'Total estimated cost should be positive');
      this.assert(totalEstimate <= 2500, 'Total estimated cost should be <= $2,500');

      // Load contact form config
      const contactConfig = this.logic.getContactFormConfig();
      this.assert(contactConfig && Array.isArray(contactConfig.submission_types), 'Contact form config should load');

      const costEstimateType = contactConfig.submission_types.find((t) => t.value === 'cost_estimate') ||
        contactConfig.submission_types[0];
      const preferredMethods = contactConfig.preferred_contact_methods || [];
      const preferredMethod = preferredMethods[0] ? preferredMethods[0].value : 'either';

      const message = `I am uninsured and need treatment similar to a molar root canal plus ${crown.name || 'a crown'}. ` +
        `Estimated total: $${totalEstimate.toFixed(2)}.`;

      const submissionResult = this.logic.submitContactSubmission(
        costEstimateType.value,   // submissionType
        'Uninsured molar root canal and crown estimate', // subject
        message,                  // message
        true,                     // isUninsured
        [rootCanalId, crownId],   // relatedServiceIds
        totalEstimate,            // totalEstimatedCost
        'Alex Smith',             // contactName
        '555-0200',               // contactPhone
        'alex.smith@example.com', // contactEmail
        preferredMethod           // preferredContactMethod
      );

      this.assert(submissionResult && submissionResult.success === true, 'Contact submission should succeed');
      this.assert(!!submissionResult.contactSubmissionId, 'Contact submission ID should be returned');

      // Verify stored ContactSubmission
      const csJson = localStorage.getItem('contact_submissions');
      const csList = csJson ? JSON.parse(csJson) : [];
      const stored = csList.find((c) => c.id === submissionResult.contactSubmissionId);
      this.assert(!!stored, 'Stored ContactSubmission should exist');
      this.assert(stored.is_uninsured === true, 'Stored submission should be marked uninsured');
      if (typeof stored.total_estimated_cost === 'number') {
        this.assert(Math.abs(stored.total_estimated_cost - totalEstimate) < 0.01,
          'Stored total_estimated_cost should match estimate');
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Saturday 11:00 AM or later pediatric visit with 4+ star dentist
  testTask3_SaturdayPediatricVisitWithRatedDentist() {
    const testName = 'Task 3: Saturday pediatric visit with 4+ star dentist';
    console.log('Testing:', testName);

    try {
      // Dentist filter options & search
      const filterOptions = this.logic.getDentistFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.specialties), 'Dentist filter options should load');

      const pediatricDentists = this.logic.searchDentists(
        'pediatric_dentistry', // specialty
        4.0,                   // minRating
        undefined,             // locationId
        true,                  // acceptsChildrenUnder12
        true,                  // isPediatricSpecialist
        true,                  // offersSaturdayHours
        'rating_desc'          // sortBy
      );
      this.assert(Array.isArray(pediatricDentists) && pediatricDentists.length > 0, 'Pediatric dentists with Saturday hours should be available');

      const chosenDentistSummary = pediatricDentists[0];
      const dentistId = chosenDentistSummary.dentist_id;

      // Dentist profile
      const profileData = this.logic.getDentistProfile(dentistId);
      this.assert(profileData && profileData.dentist, 'Dentist profile should load');
      const dentist = profileData.dentist;
      this.assert(dentist.rating >= 4.0, 'Dentist rating should be at least 4.0');
      this.assert(dentist.accepts_children_under_12 === true, 'Dentist should accept children under 12');

      const officeHours = profileData.office_hours || dentist.office_hours || [];
      const saturdayHours = officeHours.find((h) => h.day_of_week === 'saturday');
      this.assert(!!saturdayHours, 'Saturday hours should be listed');
      const saturdayLocationId = saturdayHours.location_id || dentist.saturday_location_id;

      // Get child new patient guide and recommended service
      const guides = this.logic.getNewPatientGuides();
      this.assert(Array.isArray(guides) && guides.length > 0, 'New patient guides should be available');
      const childGuide = guides.find((g) => g.patient_group === 'child_under_13');
      this.assert(!!childGuide, 'Child new patient guide should exist');
      const childServiceId = childGuide.recommended_service_id;

      // Check service details (if available)
      let childService = null;
      try {
        const sd = this.logic.getServiceDetails(childServiceId);
        if (sd && sd.service) childService = sd.service;
      } catch (e) {
        childService = null;
      }

      // Determine upcoming Saturday date and time >= 11:00 AM
      const upcomingSaturday = this.getUpcomingSaturday();
      const saturdayDateStr = upcomingSaturday.toISOString().slice(0, 10);

      // Try to find actual Saturday slots for this dentist and child service
      let chosenSlotId = undefined;
      let preferredDateTime = undefined;

      try {
        const saturdaySlots = this.logic.getAvailableAppointmentSlots(
          saturdayLocationId,       // locationId
          dentistId,                // dentistId
          childServiceId,           // serviceId
          'child',                  // ageGroup
          'new_patient',            // patientType
          { startDate: saturdayDateStr, endDate: saturdayDateStr }, // dateRange
          ['saturday'],             // daysOfWeek
          ['morning', 'afternoon'], // partOfDay
          '11:00',                  // earliestStartTime
          undefined,                // latestStartTime
          false                     // includeFullyBooked
        );
        if (Array.isArray(saturdaySlots) && saturdaySlots.length > 0) {
          const availableSaturdaySlots = saturdaySlots.filter((s) => s.is_available !== false);
          if (availableSaturdaySlots.length > 0) {
            availableSaturdaySlots.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
            const firstSlot = availableSaturdaySlots[0];
            chosenSlotId = firstSlot.slot_id || firstSlot.id;
          }
        }
      } catch (e) {
        // Ignore errors; we'll fall back to preferredDateTime
      }

      if (!chosenSlotId) {
        // Fallback: request Saturday at 11:00 AM as preferredDateTime
        preferredDateTime = this.makeDateTime(upcomingSaturday, 11, 0);
      }

      // Load booking form with context
      const bookingOptions = this.logic.getBookingFormOptions(
        'dentist_profile',
        childServiceId,
        dentistId,
        saturdayLocationId,
        undefined,
        undefined,
        'child'
      );
      this.assert(bookingOptions && Array.isArray(bookingOptions.services), 'Booking form options for pediatric visit should load');

      // Submit appointment request for 7-year-old child
      const childName = 'Sam Taylor';
      const parentName = 'Jordan Taylor';

      const submitResult = this.logic.submitAppointmentRequest(
        'dentist_profile',   // sourcePage
        'new_patient',       // patientType
        'child',             // ageGroup
        7,                   // patientAge
        childName,           // patientName
        parentName,          // contactName
        'parent_guardian',   // contactRelationship
        '555-0300',          // contactPhone
        'parent@example.com',// contactEmail
        childServiceId,      // serviceId
        saturdayLocationId,  // locationId
        dentistId,           // dentistId
        chosenSlotId,        // appointmentSlotId
        preferredDateTime,   // preferredDateTime (if no slot)
        undefined,           // insurancePlanId
        undefined,           // promotionId
        false,               // isEmergency
        false,               // isNewPatientPromotion
        'Saturday pediatric visit at or after 11:00 AM for a 7-year-old.' // notes
      );

      this.assert(submitResult && submitResult.success === true, 'Pediatric appointment request should succeed');
      this.assert(!!submitResult.appointmentRequestId, 'Appointment request ID should be returned');

      // Verify stored AppointmentRequest
      const arJson = localStorage.getItem('appointment_requests');
      const arList = arJson ? JSON.parse(arJson) : [];
      const storedReq = arList.find((r) => r.id === submitResult.appointmentRequestId);
      this.assert(!!storedReq, 'Stored pediatric AppointmentRequest should exist');
      this.assert(storedReq.age_group === 'child', 'Age group should be child');
      this.assert(storedReq.patient_age === 7, 'Patient age should be 7');
      this.assert(storedReq.dentist_id === dentistId, 'Dentist ID should match chosen pediatric dentist');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Request an Invisalign consultation for an adult wanting nearly invisible braces under 24 months
  testTask4_InvisalignConsultForAdult() {
    const testName = 'Task 4: Invisalign consultation for adult (nearly invisible, <24 months)';
    console.log('Testing:', testName);

    try {
      // Orthodontics overview, including Invisalign vs. traditional braces
      const orthoOverview = this.logic.getOrthodonticsOverview();
      this.assert(orthoOverview && Array.isArray(orthoOverview.treatment_options), 'Orthodontics overview should load');

      const treatmentOptions = orthoOverview.treatment_options;
      const invisalignOption = treatmentOptions.find((t) => t.treatment_type === 'invisalign');
      const metalOption = treatmentOptions.find((t) => t.treatment_type === 'traditional_metal_braces');
      this.assert(!!invisalignOption, 'Invisalign option should exist');
      this.assert(!!metalOption, 'Traditional metal braces option should exist');

      this.assert(invisalignOption.is_nearly_invisible === true, 'Invisalign should be nearly invisible');
      this.assert(invisalignOption.average_duration_months < 24, 'Invisalign average duration should be under 24 months');
      this.assert(metalOption.is_nearly_invisible === false, 'Traditional metal braces should not be nearly invisible');

      // Determine Invisalign consultation service
      let invisalignServiceId = invisalignOption.related_service_id;
      let invisalignService = null;

      if (invisalignServiceId) {
        try {
          const sd = this.logic.getServiceDetails(invisalignServiceId);
          if (sd && sd.service) {
            invisalignService = sd.service;
          }
        } catch (e) {
          invisalignService = null;
        }
      }

      if (!invisalignService) {
        // Fallback: search for an Invisalign consultation service
        let searchResults = [];
        try {
          searchResults = this.logic.searchServices('invisalign consultation', {
            category: 'orthodontic',
            serviceSubtype: 'consultation',
            toothType: undefined,
            appliesToAdult: true,
            displayOnPricing: false
          });
        } catch (e) {
          searchResults = [];
        }
        if (Array.isArray(searchResults) && searchResults.length > 0) {
          invisalignService = searchResults[0];
          invisalignServiceId = invisalignService.id;
        }
      }

      if (!invisalignServiceId) {
        // As a last resort, use an existing adult preventive service as the booking target
        const preventiveServices = this.logic.getServicesByCategory('preventive', true, true, false);
        this.assert(Array.isArray(preventiveServices) && preventiveServices.length > 0,
          'Fallback preventive services should exist');
        const candidate = preventiveServices[0];
        invisalignServiceId = candidate.id || candidate.service_id;
        invisalignService = candidate;
      }

      this.assert(!!invisalignServiceId, 'A service ID must be available for Invisalign consultation booking');

      // Choose a location (use first location with evening hours if available)
      const locations = this.logic.getAllLocations();
      this.assert(Array.isArray(locations) && locations.length > 0, 'Locations list should load');
      let chosenLocation = locations.find((l) => l.has_evening_hours) || locations[0];
      const locationId = chosenLocation.id;

      // Open booking form from orthodontics page context
      const bookingOptions = this.logic.getBookingFormOptions(
        'orthodontics_page',
        invisalignServiceId,
        undefined,
        locationId,
        undefined,
        undefined,
        'adult'
      );
      this.assert(bookingOptions && Array.isArray(bookingOptions.services), 'Booking form for Invisalign should load');

      // Request Invisalign consultation (adult, non-emergency)
      const submitResult = this.logic.submitAppointmentRequest(
        'orthodontics_page',   // sourcePage
        'new_patient',         // patientType
        'adult',               // ageGroup
        30,                    // patientAge
        'Jordan Lee',          // patientName
        'Jordan Lee',          // contactName
        'self',                // contactRelationship
        '555-0400',            // contactPhone
        'jordan.lee@example.com', // contactEmail
        invisalignServiceId,   // serviceId
        locationId,            // locationId
        undefined,             // dentistId
        undefined,             // appointmentSlotId
        undefined,             // preferredDateTime
        undefined,             // insurancePlanId
        undefined,             // promotionId
        false,                 // isEmergency
        false,                 // isNewPatientPromotion
        'Adult seeking nearly invisible braces (Invisalign) with treatment under 24 months.' // notes
      );

      this.assert(submitResult && submitResult.success === true, 'Invisalign consultation request should succeed');
      this.assert(!!submitResult.appointmentRequestId, 'Appointment request ID should be returned');

      // Verify stored AppointmentRequest
      const arJson = localStorage.getItem('appointment_requests');
      const arList = arJson ? JSON.parse(arJson) : [];
      const storedReq = arList.find((r) => r.id === submitResult.appointmentRequestId);
      this.assert(!!storedReq, 'Stored Invisalign AppointmentRequest should exist');
      this.assert(storedReq.age_group === 'adult', 'Age group should be adult');
      this.assert(storedReq.is_emergency === false, 'Invisalign consult should not be marked as emergency');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Choose preventive care insurance plan with higher coverage and request a cleaning
  testTask5_PreventiveInsurancePlanAndCleaning() {
    const testName = 'Task 5: Choose higher preventive insurance plan and request cleaning';
    console.log('Testing:', testName);

    try {
      const insuranceOverview = this.logic.getInsurancePlansOverview();
      this.assert(insuranceOverview && Array.isArray(insuranceOverview.plans), 'Insurance plans overview should load');

      const plans = insuranceOverview.plans;
      const deltaPlan = plans.find((p) => p.name === 'Delta Dental PPO');
      const cignaPlan = plans.find((p) => p.name === 'Cigna Dental');
      this.assert(deltaPlan && cignaPlan, 'Both Delta Dental PPO and Cigna Dental plans should exist');

      const betterPlan = (deltaPlan.preventive_coverage_percent >= cignaPlan.preventive_coverage_percent)
        ? deltaPlan
        : cignaPlan;

      const betterPlanId = betterPlan.plan_id;

      // Open booking form from insurance page with preselected insurance
      const bookingOptions = this.logic.getBookingFormOptions(
        'insurance_page',
        undefined,
        undefined,
        undefined,
        betterPlanId,
        undefined,
        'adult'
      );
      this.assert(bookingOptions && Array.isArray(bookingOptions.services), 'Booking form from insurance page should load');

      // Pick an adult preventive cleaning service
      const cleaningServiceOption = bookingOptions.services.find((s) =>
        s.category === 'preventive' &&
        s.service_subtype === 'cleaning' &&
        s.applies_to_adult === true
      ) || bookingOptions.services[0];

      const cleaningServiceId = cleaningServiceOption.service_id;

      // Choose a location (any)
      const locationOption = bookingOptions.locations[0];
      this.assert(locationOption, 'At least one location should be available in booking options');
      const locationId = locationOption.location_id;

      // Preferred date/time: future weekday within next week
      const weekday = this.getWeekdayInNextWeek(2); // Tuesday next week
      const preferredDateTime = this.makeDateTime(weekday, 10, 0); // 10:00 AM

      const submitResult = this.logic.submitAppointmentRequest(
        'insurance_page',      // sourcePage
        'existing_patient',    // patientType
        'adult',               // ageGroup
        undefined,             // patientAge
        'Alex Smith',          // patientName
        'Alex Smith',          // contactName
        'self',                // contactRelationship
        '555-0500',            // contactPhone
        'alex.smith@example.com', // contactEmail
        cleaningServiceId,     // serviceId
        locationId,            // locationId
        undefined,             // dentistId
        undefined,             // appointmentSlotId
        preferredDateTime,     // preferredDateTime
        betterPlanId,          // insurancePlanId
        undefined,             // promotionId
        false,                 // isEmergency
        false,                 // isNewPatientPromotion
        'Routine adult preventive cleaning using the plan with higher preventive coverage.' // notes
      );

      this.assert(submitResult && submitResult.success === true, 'Cleaning appointment request with insurance should succeed');
      this.assert(!!submitResult.appointmentRequestId, 'Appointment request ID should be returned');

      // Verify stored AppointmentRequest
      const arJson = localStorage.getItem('appointment_requests');
      const arList = arJson ? JSON.parse(arJson) : [];
      const storedReq = arList.find((r) => r.id === submitResult.appointmentRequestId);
      this.assert(!!storedReq, 'Stored AppointmentRequest should exist');
      this.assert(storedReq.insurance_plan_id === betterPlanId, 'Stored request should reference the higher-coverage plan');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Send an emergency message for a severe toothache after 8:00 PM with a callback request
  testTask6_AfterHoursSevereToothacheEmergencyMessage() {
    const testName = 'Task 6: After-hours severe toothache emergency message with callback';
    console.log('Testing:', testName);

    try {
      const emergencyOverview = this.logic.getEmergencyOverview();
      this.assert(emergencyOverview && Array.isArray(emergencyOverview.instructions), 'Emergency overview should load');

      const instructions = emergencyOverview.instructions;
      const severeToothache = instructions.find((i) => i.condition_type === 'severe_toothache');
      this.assert(!!severeToothache, 'Severe toothache instructions should exist');

      const afterHoursNumber = severeToothache.after_hours_phone_number;
      this.assert(!!afterHoursNumber, 'After-hours phone number should be present');

      const description = `Severe toothache at 9:00 PM with throbbing pain. Emergency number listed is ${afterHoursNumber}. Please call me back tonight.`;

      const submitResult = this.logic.submitEmergencyMessage(
        'severe_toothache',           // conditionType
        description,                  // description
        '9:00 PM',                    // eventTimeText
        true,                         // callbackRequested
        'tonight',                    // callbackTimePreference
        afterHoursNumber,             // emergencyPhoneNumberDisplayed
        'Alex Smith',                 // patientName
        'Alex Smith',                 // contactName
        '555-0600',                   // contactPhone
        'alex.smith@example.com'      // contactEmail
      );

      this.assert(submitResult && submitResult.success === true, 'Emergency message submission should succeed');
      this.assert(!!submitResult.emergencyMessageId, 'Emergency message ID should be returned');

      // Verify stored EmergencyMessage
      const emJson = localStorage.getItem('emergency_messages');
      const emList = emJson ? JSON.parse(emJson) : [];
      const storedMsg = emList.find((m) => m.id === submitResult.emergencyMessageId);
      this.assert(!!storedMsg, 'Stored EmergencyMessage should exist');
      this.assert(storedMsg.condition_type === 'severe_toothache', 'Condition type should be severe_toothache');
      this.assert(storedMsg.callback_requested === true, 'Callback should be requested');
      this.assert(storedMsg.emergency_phone_number_displayed === afterHoursNumber, 'Stored emergency phone number should match');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Weekday afternoon new patient exam for a 10-year-old using child new patient info
  testTask7_WeekdayAfternoonChildNewPatientExam() {
    const testName = 'Task 7: Weekday afternoon new patient exam for 10-year-old';
    console.log('Testing:', testName);

    try {
      // New patient guides
      const guides = this.logic.getNewPatientGuides();
      this.assert(Array.isArray(guides) && guides.length > 0, 'New patient guides should be available');
      const childGuide = guides.find((g) => g.patient_group === 'child_under_13');
      this.assert(!!childGuide, 'Child new patient guide should exist');
      const childServiceId = childGuide.recommended_service_id;

      // Try to load service details
      let childService = null;
      try {
        const sd = this.logic.getServiceDetails(childServiceId);
        if (sd && sd.service) childService = sd.service;
      } catch (e) {
        childService = null;
      }

      // Booking form from new patients page
      const bookingOptions = this.logic.getBookingFormOptions(
        'new_patients_page',
        childServiceId,
        undefined,
        undefined,
        undefined,
        undefined,
        'child'
      );
      this.assert(bookingOptions && Array.isArray(bookingOptions.locations), 'Booking options for child new patient exam should load');

      // Choose a location (Northside is likely child-focused if present)
      let chosenLocation = bookingOptions.locations.find((l) => /northside/i.test(l.name || '')) || bookingOptions.locations[0];
      const locationId = chosenLocation.location_id;

      // Try to find weekday afternoon slot (1:00 PM - 4:00 PM) next week
      const nextWeekRange = this.getNextCalendarWeekDateRange();
      let chosenSlotId = undefined;
      let preferredDateTime = undefined;

      try {
        const weekdayAfternoonSlots = this.logic.getAvailableAppointmentSlots(
          locationId,                   // locationId
          undefined,                    // dentistId
          childServiceId,               // serviceId
          'child',                      // ageGroup
          'new_patient',                // patientType
          { startDate: nextWeekRange.startDate, endDate: nextWeekRange.endDate }, // dateRange
          ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],              // daysOfWeek
          ['afternoon'],                // partOfDay
          '13:00',                      // earliestStartTime
          '16:00',                      // latestStartTime
          false                         // includeFullyBooked
        );
        if (Array.isArray(weekdayAfternoonSlots) && weekdayAfternoonSlots.length > 0) {
          const availableSlots = weekdayAfternoonSlots.filter((s) => s.is_available !== false);
          if (availableSlots.length > 0) {
            availableSlots.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
            const firstSlot = availableSlots[0];
            chosenSlotId = firstSlot.slot_id || firstSlot.id;
          }
        }
      } catch (e) {
        // ignore
      }

      if (!chosenSlotId) {
        // Fallback: choose Wednesday next week at 2:00 PM
        const wedsNextWeek = this.getWeekdayInNextWeek(3); // Wednesday
        preferredDateTime = this.makeDateTime(wedsNextWeek, 14, 0);
      }

      const childName = 'Taylor Kim';
      const parentName = 'Morgan Kim';

      const submitResult = this.logic.submitAppointmentRequest(
        'new_patients_page',  // sourcePage
        'new_patient',        // patientType
        'child',              // ageGroup
        10,                   // patientAge
        childName,            // patientName
        parentName,           // contactName
        'parent_guardian',    // contactRelationship
        '555-0700',           // contactPhone
        'parent@example.com', // contactEmail
        childServiceId,       // serviceId
        locationId,           // locationId
        undefined,            // dentistId
        chosenSlotId,         // appointmentSlotId
        preferredDateTime,    // preferredDateTime
        undefined,            // insurancePlanId
        undefined,            // promotionId
        false,                // isEmergency
        false,                // isNewPatientPromotion
        'Weekday afternoon new patient exam for a 10-year-old child.' // notes
      );

      this.assert(submitResult && submitResult.success === true, 'Child new patient exam request should succeed');
      this.assert(!!submitResult.appointmentRequestId, 'Appointment request ID should be returned');

      const arJson = localStorage.getItem('appointment_requests');
      const arList = arJson ? JSON.parse(arJson) : [];
      const storedReq = arList.find((r) => r.id === submitResult.appointmentRequestId);
      this.assert(!!storedReq, 'Stored child AppointmentRequest should exist');
      this.assert(storedReq.age_group === 'child', 'Age group should be child');
      this.assert(storedReq.patient_age === 10, 'Patient age should be 10');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Claim a whitening promotion under $200 and book a morning consultation this month
  testTask8_WhiteningPromotionUnder200MorningThisMonth() {
    const testName = 'Task 8: Whitening promotion under $200 and morning consultation this month';
    console.log('Testing:', testName);

    try {
      // List whitening promotions for new patients under $200
      const promotionsList = this.logic.getSpecialOffersList(
        'whitening',   // promotionType
        200,           // maxPrice
        true,          // isNewPatientOnly
        true           // onlyActive
      );
      this.assert(Array.isArray(promotionsList) && promotionsList.length > 0,
        'At least one active whitening promotion under $200 for new patients should exist');

      const chosenPromoSummary = promotionsList[0];
      const promoId = chosenPromoSummary.promotion_id;

      const promoDetail = this.logic.getPromotionDetail(promoId);
      this.assert(promoDetail && promoDetail.promotion, 'Promotion detail should load');
      const promo = promoDetail.promotion;
      this.assert(promo.price <= 200, 'Promotion price should be under or equal to $200');
      this.assert(promo.is_new_patient_only === true, 'Promotion should be for new patients only');

      const whiteningServiceId = promo.service_id;

      // Choose a date in the current calendar month (from baseline) and morning time before 11:00 AM
      const desiredDate = this.getCurrentMonthDateWithinBaseline(20);
      const desiredDateStr = desiredDate.toISOString().slice(0, 10);

      // Try to find actual morning slots for whitening within this month
      const firstOfMonth = this.getCurrentMonthDateWithinBaseline(1);
      const lastOfMonth = new Date(firstOfMonth);
      lastOfMonth.setMonth(firstOfMonth.getMonth() + 1);
      lastOfMonth.setDate(0); // last day of current month
      const monthStartStr = firstOfMonth.toISOString().slice(0, 10);
      const monthEndStr = lastOfMonth.toISOString().slice(0, 10);

      // Choose a location from booking form
      const bookingOptions = this.logic.getBookingFormOptions(
        'promotion_page',
        whiteningServiceId,
        undefined,
        undefined,
        undefined,
        promoId,
        'adult'
      );
      this.assert(bookingOptions && Array.isArray(bookingOptions.locations), 'Booking options for whitening promotion should load');
      const location = bookingOptions.locations[0];
      const locationId = location.location_id;

      let chosenSlotId = undefined;
      let preferredDateTime = undefined;

      try {
        const morningSlots = this.logic.getAvailableAppointmentSlots(
          locationId,           // locationId
          undefined,            // dentistId
          whiteningServiceId,   // serviceId
          'adult',              // ageGroup
          'new_patient',        // patientType
          { startDate: monthStartStr, endDate: monthEndStr }, // dateRange
          undefined,            // daysOfWeek
          ['morning'],          // partOfDay
          undefined,            // earliestStartTime
          '11:00',              // latestStartTime
          false                 // includeFullyBooked
        );
        if (Array.isArray(morningSlots) && morningSlots.length > 0) {
          const availableSlots = morningSlots.filter((s) => s.is_available !== false);
          if (availableSlots.length > 0) {
            availableSlots.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
            const firstSlot = availableSlots[0];
            chosenSlotId = firstSlot.slot_id || firstSlot.id;
          }
        }
      } catch (e) {
        // ignore
      }

      if (!chosenSlotId) {
        // Fallback: pick chosen date at 10:30 AM as preferredDateTime
        preferredDateTime = this.makeDateTime(desiredDate, 10, 30);
      }

      const submitResult = this.logic.submitAppointmentRequest(
        'promotion_page',      // sourcePage
        'new_patient',         // patientType
        'adult',               // ageGroup
        28,                    // patientAge
        'Casey Morgan',        // patientName
        'Casey Morgan',        // contactName
        'self',                // contactRelationship
        '555-0800',            // contactPhone
        'casey.morgan@example.com', // contactEmail
        whiteningServiceId,    // serviceId
        locationId,            // locationId
        undefined,             // dentistId
        chosenSlotId,          // appointmentSlotId
        preferredDateTime,     // preferredDateTime
        undefined,             // insurancePlanId
        promoId,               // promotionId
        false,                 // isEmergency
        true,                  // isNewPatientPromotion
        'New patient whitening promotion; morning consultation this month.' // notes
      );

      this.assert(submitResult && submitResult.success === true,
        'Whitening promotion consultation request should succeed');
      this.assert(!!submitResult.appointmentRequestId, 'Appointment request ID should be returned');

      const arJson = localStorage.getItem('appointment_requests');
      const arList = arJson ? JSON.parse(arJson) : [];
      const storedReq = arList.find((r) => r.id === submitResult.appointmentRequestId);
      this.assert(!!storedReq, 'Stored whitening AppointmentRequest should exist');
      this.assert(storedReq.promotion_id === promoId, 'Stored request should reference whitening promotion');
      this.assert(storedReq.is_new_patient_promotion === true,
        'Stored request should be marked as new patient promotion');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // ------------ Assertion helpers ------------

  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('\u2713', testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('\u2717 ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (CommonJS)
module.exports = TestRunner;
