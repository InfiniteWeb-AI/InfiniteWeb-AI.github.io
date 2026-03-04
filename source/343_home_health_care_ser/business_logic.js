        // localStorage polyfill for Node.js and environments without localStorage
        const localStorage = (function () {
          try {
            if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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
            // Initialize localStorage with default data structures
            this._initStorage();
            this.idCounter = this._getNextIdCounter();
          }

          _initStorage() {
            const tables = [
              'caregivers',
              'caregiver_availabilities',
              'visit_requests',
              'plans',
              'plan_enrollments',
              'assessment_requests',
              'invoices',
              'payment_methods',
              'invoice_payments',
              'care_schedules',
              'service_blocks',
              'schedule_requests',
              'articles',
              'saved_resources',
              'help_categories',
              'help_faqs',
              'favorite_caregivers',
              'profiles',
              'caregiver_search_queries',
              'resource_search_queries'
            ];

            for (const key of tables) {
              if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify([]));
              }
            }

            if (!localStorage.getItem('idCounter')) {
              localStorage.setItem('idCounter', '1000');
            }
          }

          _getFromStorage(key) {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
          }

          _saveToStorage(key, data) {
            localStorage.setItem(key, JSON.stringify(data));
          }

          _getNextIdCounter() {
            const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
            const next = current + 1;
            localStorage.setItem('idCounter', next.toString());
            return next;
          }

          _generateId(prefix) {
            return prefix + '_' + this._getNextIdCounter();
          }

          // ---------------------- Private helpers ----------------------

          _logCaregiverSearchQuery(
            mode,
            service_type,
            zip_code,
            distance_miles,
            date,
            time_window,
            days_of_week,
            min_rating,
            max_hourly_rate,
            languages,
            sort_by
          ) {
            const queries = this._getFromStorage('caregiver_search_queries');
            const id = this._generateId('cgsq');
            const record = {
              id,
              mode: mode || 'find_caregiver',
              service_type: service_type || null,
              zip_code: zip_code || null,
              distance_miles: typeof distance_miles === 'number' ? distance_miles : null,
              date: date || null,
              time_window: time_window || null,
              days_of_week: Array.isArray(days_of_week) ? days_of_week : [],
              min_rating: typeof min_rating === 'number' ? min_rating : null,
              max_hourly_rate: typeof max_hourly_rate === 'number' ? max_hourly_rate : null,
              languages: Array.isArray(languages) ? languages : [],
              sort_by: sort_by || null,
              created_at: new Date().toISOString()
            };
            queries.push(record);
            this._saveToStorage('caregiver_search_queries', queries);
            return id;
          }

          _logResourceSearchQuery(query_text, category) {
            const queries = this._getFromStorage('resource_search_queries');
            const id = this._generateId('rsq');
            const record = {
              id,
              query_text: query_text || null,
              category: category || null,
              created_at: new Date().toISOString()
            };
            queries.push(record);
            this._saveToStorage('resource_search_queries', queries);
            return id;
          }

          _getOrCreateCurrentCareSchedule() {
            let care_schedules = this._getFromStorage('care_schedules');
            let currentId = localStorage.getItem('current_care_schedule_id');
            let care_schedule = null;

            if (currentId) {
              care_schedule = care_schedules.find((cs) => cs.id === currentId) || null;
              if (care_schedule && care_schedule.status !== 'draft') {
                care_schedule = null;
              }
            }

            if (!care_schedule) {
              const drafts = care_schedules.filter((cs) => cs.status === 'draft');
              if (drafts.length > 0) {
                drafts.sort((a, b) => {
                  const da = a.created_at || '';
                  const db = b.created_at || '';
                  return da < db ? 1 : da > db ? -1 : 0;
                });
                care_schedule = drafts[0];
              }
            }

            if (!care_schedule) {
              care_schedule = {
                id: this._generateId('care_schedule'),
                name: null,
                description: null,
                status: 'draft',
                created_at: new Date().toISOString()
              };
              care_schedules.push(care_schedule);
              this._saveToStorage('care_schedules', care_schedules);
              localStorage.setItem('current_care_schedule_id', care_schedule.id);
            }

            const allBlocks = this._getFromStorage('service_blocks');
            const service_blocks = allBlocks.filter(
              (b) => b.care_schedule_id === care_schedule.id
            );
            return { care_schedule, service_blocks };
          }

          _parseTimeToHour(timeStr) {
            if (!timeStr || typeof timeStr !== 'string') return null;
            const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (!match) return null;
            let hour = parseInt(match[1], 10);
            const meridiem = match[3].toUpperCase();
            if (meridiem === 'PM' && hour < 12) hour += 12;
            if (meridiem === 'AM' && hour === 12) hour = 0;
            return hour;
          }

          _determineTimeWindowFromTimes(start_time, end_time) {
            const hour = this._parseTimeToHour(start_time) ?? this._parseTimeToHour(end_time);
            if (hour === null) return 'morning';
            if (hour < 12) return 'morning';
            if (hour < 17) return 'afternoon';
            return 'evening';
          }

          _applyInvoicePaymentAndUpdateStatus(invoice, paymentMethodId, amount) {
            const nowIso = new Date().toISOString();
            const invoice_payments = this._getFromStorage('invoice_payments');
            const invoices = this._getFromStorage('invoices');

            const payment = {
              id: this._generateId('invoice_payment'),
              invoice_id: invoice.id,
              payment_method_id: paymentMethodId,
              amount: amount,
              created_at: nowIso,
              status: 'succeeded',
              confirmation_code: 'CONF-' + Math.random().toString(36).substring(2, 10).toUpperCase()
            };
            invoice_payments.push(payment);

            const existing = invoices.find((i) => i.id === invoice.id);
            if (existing) {
              const currentDue = typeof existing.amount_due === 'number' ? existing.amount_due : 0;
              const newDue = Math.max(0, currentDue - amount);
              existing.amount_due = newDue;
              existing.status = newDue === 0 ? 'paid' : 'partially_paid';
            }

            this._saveToStorage('invoice_payments', invoice_payments);
            this._saveToStorage('invoices', invoices);

            const updated_invoice = invoices.find((i) => i.id === invoice.id) || invoice;
            return { invoice_payment: payment, updated_invoice };
          }

          _getDayOfWeekString(dateStr) {
            if (!dateStr) return null;
            const d = new Date(dateStr + 'T00:00:00Z');
            if (Number.isNaN(d.getTime())) return null;
            const day = d.getUTCDay(); // 0-6, Sunday=0
            const map = [
              'sunday',
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
              'saturday'
            ];
            return map[day];
          }

          _updateProfileFields(fields) {
            let profiles = this._getFromStorage('profiles');
            let profile = profiles[0] || null;
            if (!profile) {
              profile = {
                id: this._generateId('profile'),
                full_name: null,
                email: null,
                phone: null,
                address: null,
                preferred_contact_method: null,
                after_hours_care_phone_number: null,
                communication_opt_in_email: false,
                communication_opt_in_sms: false
              };
              profiles.push(profile);
            }

            const updated = { ...profile, ...fields };
            profiles[0] = updated;
            this._saveToStorage('profiles', profiles);
            return updated;
          }

          _getServiceTypeDisplay(service_type) {
            const map = {
              personal_care: {
                label: 'Personal care',
                description: 'Bathing, dressing, grooming, and daily living support.'
              },
              memory_dementia_care: {
                label: 'Memory / Dementia care',
                description: 'Specialized support for Alzheimer\'s and dementia.'
              },
              post_surgery_recovery: {
                label: 'Post-surgery recovery',
                description: 'Support after hospital discharge or surgery.'
              },
              light_housekeeping: {
                label: 'Light housekeeping',
                description: 'Laundry, tidying, dishes, and light chores.'
              },
              companionship: {
                label: 'Companionship',
                description: 'Social visits, conversation, and activities.'
              }
            };
            return map[service_type] || { label: service_type, description: '' };
          }

          _getLanguageDisplay(code) {
            const map = {
              english: 'English',
              spanish: 'Spanish',
              chinese: 'Chinese',
              french: 'French'
            };
            return map[code] || code;
          }

          _getPlanFeatureDisplay(code) {
            const map = {
              medication_reminders: {
                label: 'Medication reminders',
                description: 'Gentle reminders to take medications on time.'
              },
              transportation_to_appointments: {
                label: 'Transportation to appointments',
                description: 'Safe rides to and from medical visits.'
              },
              personal_care_hours: {
                label: 'Personal care hours',
                description: 'Hands-on support with activities of daily living.'
              },
              light_housekeeping_hours: {
                label: 'Light housekeeping hours',
                description: 'Help with household tasks and chores.'
              }
            };
            return map[code] || { label: code, description: '' };
          }

          // ---------------------- Core interface implementations ----------------------

          // getHomepageContent
          getHomepageContent() {
            const caregivers = this._getFromStorage('caregivers');
            const activeCaregivers = caregivers.filter((c) => c.is_active !== false);

            let average_rating = 0;
            let review_count = 0;
            if (activeCaregivers.length > 0) {
              const sumRatings = activeCaregivers.reduce(
                (sum, c) => sum + (typeof c.rating === 'number' ? c.rating : 0),
                0
              );
              average_rating = sumRatings / activeCaregivers.length;
              review_count = activeCaregivers.reduce(
                (sum, c) => sum + (typeof c.review_count === 'number' ? c.review_count : 0),
                0
              );
            }

            const featured_caregivers = [...activeCaregivers]
              .sort((a, b) => {
                if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0);
                return (b.review_count || 0) - (a.review_count || 0);
              })
              .slice(0, 3)
              .map((caregiver) => ({
                caregiver,
                highlight_reason: 'Top-rated caregiver in your area'
              }));

            const plans = this._getFromStorage('plans');
            let featuredPlansRaw = plans.filter((p) => p.status === 'active' && p.is_featured);
            if (featuredPlansRaw.length === 0) {
              featuredPlansRaw = plans
                .filter((p) => p.status === 'active' && typeof p.monthly_price === 'number')
                .sort((a, b) => a.monthly_price - b.monthly_price)
                .slice(0, 3);
            }

            const featured_plans = featuredPlansRaw.map((plan) => ({
              plan,
              highlight_badge: plan.is_featured ? 'Most popular' : 'Best value'
            }));

            const service_overview = [
              'personal_care',
              'memory_dementia_care',
              'post_surgery_recovery',
              'light_housekeeping',
              'companionship'
            ].map((type) => {
              const info = this._getServiceTypeDisplay(type);
              return {
                service_type: type,
                name: info.label,
                description: info.description,
                icon_name: type
              };
            });

            return {
              hero_message: 'Reliable home care, right when you need it',
              hero_subtitle:
                'Personalized in-home support from vetted caregivers for you and your loved ones.',
              primary_ctas: [
                { id: 'cta_book_visit', label: 'Book a visit', target_page_key: 'book_visit' },
                { id: 'cta_find_caregiver', label: 'Find a caregiver', target_page_key: 'find_caregiver' },
                { id: 'cta_pricing', label: 'Pricing & plans', target_page_key: 'pricing_plans' },
                { id: 'cta_assessment', label: 'Free in-home assessment', target_page_key: 'free_assessment' }
              ],
              service_overview,
              trust_highlights: {
                average_rating,
                review_count,
                caregivers_vetted_percentage: activeCaregivers.length > 0 ? 100 : 0,
                insurance_bonded: true,
                background_checks_description:
                  'All caregivers complete comprehensive background and reference checks.',
                safety_practices_summary:
                  'We follow strict infection-control, fall-prevention, and home safety protocols.'
              },
              featured_caregivers,
              featured_plans
            };
          }

          // loginClientPortal
          loginClientPortal(email, password) {
            if (!email || !password) {
              return { success: false, message: 'Email and password are required.' };
            }
            const session = {
              email,
              logged_in_at: new Date().toISOString()
            };
            localStorage.setItem('client_portal_session', JSON.stringify(session));
            return { success: true, message: 'Logged in.' };
          }

          // getCaregiverSearchFilterOptions
          getCaregiverSearchFilterOptions(mode) {
            const service_types = [
              'personal_care',
              'memory_dementia_care',
              'post_surgery_recovery',
              'light_housekeeping',
              'companionship'
            ].map((value) => {
              const info = this._getServiceTypeDisplay(value);
              return { value, label: info.label, description: info.description };
            });

            const languages = [
              { code: 'english', label: 'English' },
              { code: 'spanish', label: 'Spanish' },
              { code: 'chinese', label: 'Chinese' },
              { code: 'french', label: 'French' }
            ];

            const rating_thresholds = [
              { value: 3.0, label: '3.0 stars and up' },
              { value: 4.0, label: '4.0 stars and up' },
              { value: 4.5, label: '4.5 stars and up' }
            ];

            const hourly_rate_ranges = [
              { min: 0, max: 25, label: 'Up to $25/hour' },
              { min: 0, max: 40, label: 'Up to $40/hour' },
              { min: 0, max: 50, label: 'Up to $50/hour' },
              { min: 0, max: 75, label: 'Up to $75/hour' }
            ];

            const time_windows = [
              { value: 'morning', label: 'Morning (8am-12pm)', start_time: '08:00', end_time: '12:00' },
              { value: 'afternoon', label: 'Afternoon (12pm-5pm)', start_time: '12:00', end_time: '17:00' },
              { value: 'evening', label: 'Evening (5pm-9pm)', start_time: '17:00', end_time: '21:00' }
            ];

            const days_of_week = [
              { value: 'monday', label: 'Monday', short_label: 'Mon' },
              { value: 'tuesday', label: 'Tuesday', short_label: 'Tue' },
              { value: 'wednesday', label: 'Wednesday', short_label: 'Wed' },
              { value: 'thursday', label: 'Thursday', short_label: 'Thu' },
              { value: 'friday', label: 'Friday', short_label: 'Fri' },
              { value: 'saturday', label: 'Saturday', short_label: 'Sat' },
              { value: 'sunday', label: 'Sunday', short_label: 'Sun' }
            ];

            const distance_options_miles = [
              { value: 5, label: 'Within 5 miles' },
              { value: 10, label: 'Within 10 miles' },
              { value: 25, label: 'Within 25 miles' },
              { value: 50, label: 'Within 50 miles' }
            ];

            const sort_options = [
              { value: 'price_low_to_high', label: 'Price: Low to High' },
              { value: 'price_high_to_low', label: 'Price: High to Low' },
              { value: 'rating_high_to_low', label: 'Rating: High to Low' },
              { value: 'rating_low_to_high', label: 'Rating: Low to High' },
              { value: 'most_reviews', label: 'Most reviews' }
            ];

            return {
              service_types,
              languages,
              rating_thresholds,
              hourly_rate_ranges,
              time_windows,
              days_of_week,
              distance_options_miles,
              sort_options
            };
          }

          // searchCaregivers
          searchCaregivers(
            mode,
            service_type,
            zip_code,
            distance_miles,
            date,
            time_window,
            days_of_week,
            min_rating,
            max_hourly_rate,
            languages,
            sort_by,
            page,
            page_size
          ) {
            const caregivers = this._getFromStorage('caregivers');
            const availabilities = this._getFromStorage('caregiver_availabilities');
            const favorites = this._getFromStorage('favorite_caregivers');

            const daysArray = Array.isArray(days_of_week) ? days_of_week : [];
            const langsArray = Array.isArray(languages) ? languages : [];
            const pageNum = page && page > 0 ? page : 1;
            const sizeNum = page_size && page_size > 0 ? page_size : 20;

            this._logCaregiverSearchQuery(
              mode,
              service_type,
              zip_code,
              distance_miles,
              date,
              time_window,
              daysArray,
              min_rating,
              max_hourly_rate,
              langsArray,
              sort_by
            );

            const activeCaregivers = caregivers.filter((c) => c.is_active !== false);

            const resultsAll = [];
            const dateDayOfWeek = date ? this._getDayOfWeekString(date) : null;

            for (const c of activeCaregivers) {
              if (service_type && (!Array.isArray(c.specialties) || !c.specialties.includes(service_type))) {
                continue;
              }

              if (typeof min_rating === 'number' && (typeof c.rating !== 'number' || c.rating < min_rating)) {
                continue;
              }

              if (
                typeof max_hourly_rate === 'number' &&
                (typeof c.hourly_rate !== 'number' || c.hourly_rate > max_hourly_rate)
              ) {
                continue;
              }

              if (langsArray.length > 0) {
                const caregiverLangs = Array.isArray(c.languages) ? c.languages : [];
                const matchesLang = langsArray.some((lng) => caregiverLangs.includes(lng));
                if (!matchesLang) continue;
              }

              let matches_search_area = true;
              let distanceVal = null;
              if (zip_code) {
                if (c.base_zip_code === zip_code) {
                  matches_search_area = true;
                  distanceVal = 0;
                } else {
                  const canTravel =
                    typeof c.max_travel_distance_miles === 'number' &&
                    typeof distance_miles === 'number' &&
                    c.max_travel_distance_miles >= distance_miles;
                  matches_search_area = canTravel;
                  distanceVal = canTravel ? distance_miles || null : null;
                }
              } else if (typeof distance_miles === 'number') {
                distanceVal = distance_miles;
              }

              if (zip_code && !matches_search_area) {
                continue;
              }

              const caregiverAvail = availabilities.filter((a) => a.caregiver_id === c.id);

              let matches_availability = true;
              let next_available_slot = null;

              if (dateDayOfWeek || (daysArray.length > 0) || time_window) {
                const requiredDays = [];
                if (dateDayOfWeek) requiredDays.push(dateDayOfWeek);
                for (const d of daysArray) {
                  if (!requiredDays.includes(d)) requiredDays.push(d);
                }

                if (requiredDays.length === 0 && time_window) {
                  const hasAny = caregiverAvail.some((a) => a.time_window === time_window);
                  matches_availability = hasAny;
                } else {
                  matches_availability = requiredDays.every((day) => {
                    return caregiverAvail.some((a) => {
                      if (a.day_of_week !== day) return false;
                      if (time_window && a.time_window !== time_window) return false;
                      return true;
                    });
                  });
                }
              }

              if ((dateDayOfWeek || daysArray.length > 0 || time_window) && !matches_availability) {
                // Availability mismatches are informational only and do not exclude caregivers from results.
              }

              if (caregiverAvail.length > 0) {
                let chosen = null;
                if (dateDayOfWeek) {
                  chosen = caregiverAvail.find((a) => a.day_of_week === dateDayOfWeek && (!time_window || a.time_window === time_window));
                }
                if (!chosen) {
                  chosen = caregiverAvail[0];
                }
                if (chosen) {
                  next_available_slot = {
                    date: date || null,
                    time_window: chosen.time_window,
                    start_time: chosen.start_time || null,
                    end_time: chosen.end_time || null
                  };
                }
              }

              const is_favorited = favorites.some((f) => f.caregiver_id === c.id);

              resultsAll.push({
                caregiver: c,
                distance_miles: distanceVal,
                matches_search_area,
                matches_availability,
                next_available_slot,
                is_favorited
              });
            }

            const sortVal = sort_by || 'most_reviews';
            resultsAll.sort((a, b) => {
              const ca = a.caregiver;
              const cb = b.caregiver;
              switch (sortVal) {
                case 'price_low_to_high':
                  return (ca.hourly_rate || 0) - (cb.hourly_rate || 0);
                case 'price_high_to_low':
                  return (cb.hourly_rate || 0) - (ca.hourly_rate || 0);
                case 'rating_high_to_low': {
                  const rDiff = (cb.rating || 0) - (ca.rating || 0);
                  if (rDiff !== 0) return rDiff;
                  return (cb.review_count || 0) - (ca.review_count || 0);
                }
                case 'rating_low_to_high':
                  return (ca.rating || 0) - (cb.rating || 0);
                case 'most_reviews':
                default:
                  return (cb.review_count || 0) - (ca.review_count || 0);
              }
            });

            const total_results = resultsAll.length;
            const startIdx = (pageNum - 1) * sizeNum;
            const endIdx = startIdx + sizeNum;
            const results = resultsAll.slice(startIdx, endIdx);

            return {
              results,
              total_results,
              applied_filters: {
                service_type: service_type || null,
                zip_code: zip_code || null,
                distance_miles: typeof distance_miles === 'number' ? distance_miles : null,
                date: date || null,
                time_window: time_window || null,
                days_of_week: daysArray,
                min_rating: typeof min_rating === 'number' ? min_rating : null,
                max_hourly_rate: typeof max_hourly_rate === 'number' ? max_hourly_rate : null,
                languages: langsArray,
                sort_by: sortVal
              }
            };
          }

          // saveCaregiverToFavorites
          saveCaregiverToFavorites(caregiverId) {
            const caregivers = this._getFromStorage('caregivers');
            const caregiver = caregivers.find((c) => c.id === caregiverId);
            if (!caregiver) {
              return { success: false, favorite_id: null, message: 'Caregiver not found.' };
            }
            const favorites = this._getFromStorage('favorite_caregivers');
            const existing = favorites.find((f) => f.caregiver_id === caregiverId);
            if (existing) {
              return {
                success: true,
                favorite_id: existing.id,
                message: 'Caregiver already in favorites.'
              };
            }
            const favorite = {
              id: this._generateId('favorite'),
              caregiver_id: caregiverId,
              created_at: new Date().toISOString()
            };
            favorites.push(favorite);
            this._saveToStorage('favorite_caregivers', favorites);
            return { success: true, favorite_id: favorite.id, message: 'Added to favorites.' };
          }

          // removeCaregiverFromFavorites
          removeCaregiverFromFavorites(caregiverId) {
            const favorites = this._getFromStorage('favorite_caregivers');
            const before = favorites.length;
            const remaining = favorites.filter((f) => f.caregiver_id !== caregiverId);
            this._saveToStorage('favorite_caregivers', remaining);
            const removed = before !== remaining.length;
            return {
              success: removed,
              message: removed ? 'Removed from favorites.' : 'Favorite not found.'
            };
          }

          // getFavoriteCaregivers
          getFavoriteCaregivers() {
            const favorites = this._getFromStorage('favorite_caregivers');
            const caregivers = this._getFromStorage('caregivers');
            return favorites.map((favorite) => ({
              favorite,
              caregiver: caregivers.find((c) => c.id === favorite.caregiver_id) || null
            }));
          }

          // getCaregiverProfile
          getCaregiverProfile(caregiverId) {
            const caregivers = this._getFromStorage('caregivers');
            const caregiver = caregivers.find((c) => c.id === caregiverId) || null;
            const availabilities = this._getFromStorage('caregiver_availabilities').filter(
              (a) => a.caregiver_id === caregiverId
            );
            const favorites = this._getFromStorage('favorite_caregivers');
            const is_favorited = favorites.some((f) => f.caregiver_id === caregiverId);

            if (!caregiver) {
              return {
                caregiver: null,
                specialties_display: [],
                languages_display: [],
                hourly_rate_display: '',
                rating_summary: { rating: 0, review_count: 0 },
                availability_summary: [],
                is_favorited
              };
            }

            const specialties_display = (Array.isArray(caregiver.specialties)
              ? caregiver.specialties
              : []
            ).map((code) => {
              const info = this._getServiceTypeDisplay(code);
              return { code, label: info.label, description: info.description };
            });

            const languages_display = (Array.isArray(caregiver.languages)
              ? caregiver.languages
              : []
            ).map((code) => ({ code, label: this._getLanguageDisplay(code) }));

            const hourly_rate_display =
              typeof caregiver.hourly_rate === 'number'
                ? '$' + caregiver.hourly_rate.toFixed(2) + '/hour'
                : '';

            const rating_summary = {
              rating: typeof caregiver.rating === 'number' ? caregiver.rating : 0,
              review_count: typeof caregiver.review_count === 'number' ? caregiver.review_count : 0
            };

            const availability_summary = availabilities.map((a) => ({
              ...a,
              caregiver
            }));

            return {
              caregiver,
              specialties_display,
              languages_display,
              hourly_rate_display,
              rating_summary,
              availability_summary,
              is_favorited
            };
          }

          // getVisitRequestPrefill
          getVisitRequestPrefill(caregiverId, request_type, service_type) {
            const caregivers = this._getFromStorage('caregivers');
            const caregiver = caregivers.find((c) => c.id === caregiverId) || null;
            const availabilities = this._getFromStorage('caregiver_availabilities').filter(
              (a) => a.caregiver_id === caregiverId
            );

            let default_service_type = service_type || null;
            if (!default_service_type && caregiver) {
              if (Array.isArray(caregiver.specialties) && caregiver.specialties.length > 0) {
                if (caregiver.specialties.includes('personal_care')) {
                  default_service_type = 'personal_care';
                } else {
                  default_service_type = caregiver.specialties[0];
                }
              }
            }

            const allowed_time_windows = Array.from(
              new Set(availabilities.map((a) => a.time_window).filter(Boolean))
            );

            const visit_requests = this._getFromStorage('visit_requests').filter(
              (vr) => vr.caregiver_id === caregiverId
            );
            let previous_location = null;
            if (visit_requests.length > 0) {
              visit_requests.sort((a, b) => {
                const da = a.created_at || '';
                const db = b.created_at || '';
                return da < db ? 1 : da > db ? -1 : 0;
              });
              const last = visit_requests[0];
              previous_location = {
                address: last.location_address || null,
                zip_code: last.location_zip || null
              };
            }

            return {
              caregiver,
              default_service_type,
              allowed_time_windows,
              suggested_duration_hours: 2,
              previous_location
            };
          }

          // submitVisitRequest
          submitVisitRequest(
            caregiverId,
            request_type,
            service_type,
            location_address,
            location_zip,
            requested_date,
            requested_start_datetime,
            requested_time_window,
            duration_hours,
            recurrence_days_of_week,
            recurrence_start_date,
            recurrence_end_date,
            recurrence_interval_weeks,
            client_name,
            client_phone,
            client_email,
            care_notes
          ) {
            const caregivers = this._getFromStorage('caregivers');
            const caregiver = caregivers.find((c) => c.id === caregiverId);
            if (!caregiver) {
              return { success: false, visit_request: null, message: 'Caregiver not found.' };
            }
            if (!service_type) {
              return { success: false, visit_request: null, message: 'Service type is required.' };
            }
            if (!requested_time_window) {
              return {
                success: false,
                visit_request: null,
                message: 'Requested time window is required.'
              };
            }
            if (typeof duration_hours !== 'number' || duration_hours <= 0) {
              return { success: false, visit_request: null, message: 'Invalid duration.' };
            }

            const nowIso = new Date().toISOString();
            const visit_requests = this._getFromStorage('visit_requests');
            const vr = {
              id: this._generateId('visit_request'),
              caregiver_id: caregiverId,
              service_type,
              request_type,
              location_address: location_address || null,
              location_zip: location_zip || null,
              requested_date: requested_date || null,
              requested_start_datetime: requested_start_datetime || null,
              requested_time_window,
              duration_hours,
              recurrence_days_of_week: Array.isArray(recurrence_days_of_week)
                ? recurrence_days_of_week
                : null,
              recurrence_start_date: recurrence_start_date || null,
              recurrence_end_date: recurrence_end_date || null,
              recurrence_interval_weeks:
                typeof recurrence_interval_weeks === 'number'
                  ? recurrence_interval_weeks
                  : request_type === 'recurring'
                  ? 1
                  : null,
              client_name: client_name || null,
              client_phone: client_phone || null,
              client_email: client_email || null,
              care_notes: care_notes || null,
              status: 'requested',
              created_at: nowIso
            };

            visit_requests.push(vr);
            this._saveToStorage('visit_requests', visit_requests);

            return { success: true, visit_request: vr, message: 'Visit request submitted.' };
          }

          // getPlansFilterOptions
          getPlansFilterOptions() {
            const plan_types = [
              {
                value: 'monthly',
                label: 'Monthly plans',
                description: 'Flat monthly pricing with included hours and services.'
              },
              {
                value: 'hourly',
                label: 'Hourly plans',
                description: 'Pay per hour of care as you go.'
              },
              {
                value: 'package',
                label: 'Care packages',
                description: 'Bundles of visits at a discounted rate.'
              },
              { value: 'other', label: 'Other', description: 'Specialized or custom plans.' }
            ];

            const price_ranges = [
              { min_monthly_price: 0, max_monthly_price: 600, label: 'Up to $600/month' },
              { min_monthly_price: 0, max_monthly_price: 1000, label: 'Up to $1,000/month' },
              { min_monthly_price: 0, max_monthly_price: 1500, label: 'Up to $1,500/month' }
            ];

            const included_features = [
              this._getPlanFeatureDisplay('medication_reminders'),
              this._getPlanFeatureDisplay('transportation_to_appointments'),
              this._getPlanFeatureDisplay('personal_care_hours'),
              this._getPlanFeatureDisplay('light_housekeeping_hours')
            ].map((f) => ({ code: Object.keys({ [f.label]: f })[0], label: f.label, description: f.description }));

            // The above mapping is odd due to generic helper; override with explicit
            const included_features_fixed = [
              {
                code: 'medication_reminders',
                label: 'Medication reminders',
                description: 'Gentle reminders to take medications on time.'
              },
              {
                code: 'transportation_to_appointments',
                label: 'Transportation to appointments',
                description: 'Safe rides to and from medical visits.'
              },
              {
                code: 'personal_care_hours',
                label: 'Personal care hours',
                description: 'Hands-on support with activities of daily living.'
              },
              {
                code: 'light_housekeeping_hours',
                label: 'Light housekeeping hours',
                description: 'Help with household tasks and chores.'
              }
            ];

            const sort_options = [
              { value: 'price_low_to_high', label: 'Price: Low to High' },
              { value: 'price_high_to_low', label: 'Price: High to Low' },
              { value: 'featured_first', label: 'Featured first' }
            ];

            return {
              plan_types,
              price_ranges,
              included_features: included_features_fixed,
              sort_options
            };
          }

          // getPlans
          getPlans(
            plan_type,
            min_monthly_price,
            max_monthly_price,
            included_features,
            status_filter,
            sort_by
          ) {
            const plans = this._getFromStorage('plans');
            const featuresArray = Array.isArray(included_features) ? included_features : [];
            const statusVal = status_filter || 'active';

            let filtered = plans.filter((p) => !statusVal || p.status === statusVal);

            if (plan_type) {
              filtered = filtered.filter((p) => p.plan_type === plan_type);
            }

            if (typeof min_monthly_price === 'number') {
              filtered = filtered.filter((p) => typeof p.monthly_price === 'number' && p.monthly_price >= min_monthly_price);
            }
            if (typeof max_monthly_price === 'number') {
              filtered = filtered.filter((p) => typeof p.monthly_price === 'number' && p.monthly_price <= max_monthly_price);
            }

            if (featuresArray.length > 0) {
              filtered = filtered.filter((p) => {
                const planFeatures = Array.isArray(p.included_features) ? p.included_features : [];
                return featuresArray.every((f) => planFeatures.includes(f));
              });
            }

            const sortVal = sort_by || 'featured_first';
            filtered.sort((a, b) => {
              switch (sortVal) {
                case 'price_low_to_high':
                  return (a.monthly_price || 0) - (b.monthly_price || 0);
                case 'price_high_to_low':
                  return (b.monthly_price || 0) - (a.monthly_price || 0);
                case 'featured_first':
                default:
                  if (!!b.is_featured !== !!a.is_featured) {
                    return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
                  }
                  return (a.monthly_price || 0) - (b.monthly_price || 0);
              }
            });

            const resultPlans = filtered.map((plan) => ({
              plan,
              monthly_price_display:
                typeof plan.monthly_price === 'number'
                  ? '$' + plan.monthly_price.toFixed(2) + '/month'
                  : '',
              is_featured: !!plan.is_featured
            }));

            return { plans: resultPlans, total_results: resultPlans.length };
          }

          // getPlanDetail
          getPlanDetail(planId) {
            const plans = this._getFromStorage('plans');
            const plan = plans.find((p) => p.id === planId) || null;
            if (!plan) {
              return {
                plan: null,
                included_features_display: [],
                limitations: '',
                eligibility: '',
                commitment_terms: ''
              };
            }

            const included_features_display = (Array.isArray(plan.included_features)
              ? plan.included_features
              : []
            ).map((code) => {
              const info = this._getPlanFeatureDisplay(code);
              return { code, label: info.label, description: info.description };
            });

            const limitations = 'Plan availability and included hours may vary based on care needs.';
            const eligibility = 'Subject to initial assessment and service area availability.';
            const commitment_terms = plan.min_commitment_months
              ? 'Minimum commitment of ' + plan.min_commitment_months + ' months.'
              : 'No long-term commitment required.';

            return {
              plan,
              included_features_display,
              limitations,
              eligibility,
              commitment_terms
            };
          }

          // submitPlanEnrollment
          submitPlanEnrollment(
            planId,
            care_for,
            start_date,
            contact_name,
            contact_phone,
            contact_email,
            care_location_address,
            care_location_zip,
            notes,
            accept_terms
          ) {
            const plans = this._getFromStorage('plans');
            const plan = plans.find((p) => p.id === planId);
            if (!plan) {
              return {
                success: false,
                plan_enrollment: null,
                message: 'Plan not found.',
                next_steps: ''
              };
            }
            if (!accept_terms) {
              return {
                success: false,
                plan_enrollment: null,
                message: 'You must accept the terms to enroll.',
                next_steps: ''
              };
            }
            if (!start_date) {
              return {
                success: false,
                plan_enrollment: null,
                message: 'Start date is required.',
                next_steps: ''
              };
            }

            const enrollments = this._getFromStorage('plan_enrollments');
            const nowIso = new Date().toISOString();
            const enrollment = {
              id: this._generateId('plan_enrollment'),
              plan_id: planId,
              care_for,
              start_date,
              contact_name: contact_name || null,
              contact_phone: contact_phone || null,
              contact_email: contact_email || null,
              care_location_address: care_location_address || null,
              care_location_zip: care_location_zip || null,
              notes: notes || null,
              created_at: nowIso,
              status: 'pending'
            };

            enrollments.push(enrollment);
            this._saveToStorage('plan_enrollments', enrollments);

            return {
              success: true,
              plan_enrollment: enrollment,
              message: 'Plan enrollment submitted.',
              next_steps: 'Our care team will contact you to finalize your enrollment and schedule.'
            };
          }

          // getAssessmentFormOptions
          getAssessmentFormOptions() {
            const assessment_types = [
              {
                value: 'at_home_visit',
                label: 'At home visit',
                description: 'A care coordinator visits your home to assess needs.'
              },
              {
                value: 'phone_consultation',
                label: 'Phone consultation',
                description: 'Discuss care options over the phone.'
              },
              {
                value: 'video_visit',
                label: 'Video visit',
                description: 'Meet with a care coordinator via secure video.'
              }
            ];

            const who_for_options = [
              { value: 'for_myself', label: 'For myself' },
              { value: 'my_parent_relative', label: 'My parent / relative' },
              { value: 'other', label: 'Someone else' }
            ];

            const care_needs_options = [
              {
                code: 'mobility_support',
                label: 'Mobility support',
                description: 'Help with walking, transfers, and fall prevention.'
              },
              {
                code: 'medication_management',
                label: 'Medication management',
                description: 'Organization and reminders for medications.'
              },
              {
                code: 'household_help',
                label: 'Household help',
                description: 'Light housekeeping, laundry, and errands.'
              }
            ];

            const preferred_contact_methods = [
              { value: 'phone_call', label: 'Phone call' },
              { value: 'email', label: 'Email' },
              { value: 'text_message', label: 'Text message' }
            ];

            const time_windows = [
              { value: 'morning', label: 'Morning (8am-12pm)', start_time: '08:00', end_time: '12:00' },
              { value: 'afternoon', label: 'Afternoon (12pm-5pm)', start_time: '12:00', end_time: '17:00' },
              { value: 'evening', label: 'Evening (5pm-8pm)', start_time: '17:00', end_time: '20:00' }
            ];

            return {
              assessment_types,
              who_for_options,
              care_needs_options,
              preferred_contact_methods,
              time_windows
            };
          }

          // getAssessmentAvailableSlots
          getAssessmentAvailableSlots(assessment_type, preferred_time_window, days_ahead) {
            const windowVal = preferred_time_window || 'morning';
            const days = typeof days_ahead === 'number' && days_ahead > 0 ? days_ahead : 14;
            const slots = [];
            const now = new Date();

            const windowToTime = (tw) => {
              if (tw === 'afternoon') return { start: '01:00 PM', end: '02:00 PM' };
              if (tw === 'evening') return { start: '06:00 PM', end: '07:00 PM' };
              return { start: '09:00 AM', end: '10:00 AM' };
            };

            const time = windowToTime(windowVal);

            for (let i = 1; i <= days; i++) {
              const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
              const dateStr = d.toISOString().slice(0, 10);
              slots.push({
                date: dateStr,
                start_time: time.start,
                end_time: time.end,
                time_window: windowVal,
                is_earliest_available: false
              });
            }

            if (slots.length > 0) {
              slots[0].is_earliest_available = true;
            }

            return { slots };
          }

          // submitAssessmentRequest
          submitAssessmentRequest(
            assessment_type,
            who_for,
            requested_date,
            requested_start_time,
            requested_end_time,
            requested_time_window,
            contact_name,
            contact_phone,
            contact_email,
            contact_address,
            care_needs,
            preferred_contact_method,
            additional_notes
          ) {
            if (!assessment_type || !who_for || !requested_date) {
              return {
                success: false,
                assessment_request: null,
                message: 'Assessment type, who for, and requested date are required.'
              };
            }

            const needsArray = Array.isArray(care_needs) ? care_needs : [];
            if (needsArray.length === 0) {
              return {
                success: false,
                assessment_request: null,
                message: 'At least one care need must be selected.'
              };
            }

            const time_window_val =
              requested_time_window || this._determineTimeWindowFromTimes(requested_start_time, requested_end_time);

            const assessment_requests = this._getFromStorage('assessment_requests');
            const nowIso = new Date().toISOString();

            const ar = {
              id: this._generateId('assessment_request'),
              assessment_type,
              who_for,
              requested_date,
              requested_start_time: requested_start_time || null,
              requested_end_time: requested_end_time || null,
              requested_time_window: time_window_val || null,
              contact_name,
              contact_phone,
              contact_email,
              contact_address,
              care_needs: needsArray,
              preferred_contact_method,
              additional_notes: additional_notes || null,
              status: 'requested',
              created_at: nowIso
            };

            assessment_requests.push(ar);
            this._saveToStorage('assessment_requests', assessment_requests);

            return { success: true, assessment_request: ar, message: 'Assessment requested.' };
          }

          // getClientDashboardSummary
          getClientDashboardSummary() {
            const visit_requests = this._getFromStorage('visit_requests');
            const caregivers = this._getFromStorage('caregivers');
            const plan_enrollments = this._getFromStorage('plan_enrollments');
            const plans = this._getFromStorage('plans');
            const invoices = this._getFromStorage('invoices');

            const upcoming_raw = visit_requests.filter((vr) =>
              vr.status === 'requested' || vr.status === 'confirmed'
            );

            upcoming_raw.sort((a, b) => {
              const da = a.requested_date || a.recurrence_start_date || '';
              const db = b.requested_date || b.recurrence_start_date || '';
              return da < db ? -1 : da > db ? 1 : 0;
            });

            const upcoming_visits = upcoming_raw.slice(0, 5).map((vr) => {
              const caregiver = caregivers.find((c) => c.id === vr.caregiver_id) || null;
              return {
                date: vr.requested_date || vr.recurrence_start_date || null,
                time_window: vr.requested_time_window || null,
                service_type: vr.service_type || null,
                caregiver_name: caregiver ? caregiver.full_name : null,
                status: vr.status
              };
            });

            const activePlanEnrollments = plan_enrollments.filter((pe) =>
              pe.status === 'active' || pe.status === 'pending'
            );

            const active_plans = activePlanEnrollments.map((pe) => {
              const plan = plans.find((p) => p.id === pe.plan_id) || null;
              let next_billing_date = null;
              if (pe.start_date) {
                const d = new Date(pe.start_date);
                if (!Number.isNaN(d.getTime())) {
                  const next = new Date(d.getTime() + 30 * 24 * 60 * 60 * 1000);
                  next_billing_date = next.toISOString().slice(0, 10);
                }
              }
              return {
                plan,
                status: pe.status,
                next_billing_date
              };
            });

            const unpaid = invoices.filter(
              (inv) => inv.status === 'unpaid' || inv.status === 'partially_paid'
            );
            const unpaid_invoice_count = unpaid.length;
            const total_unpaid_amount = unpaid.reduce(
              (sum, inv) => sum + (typeof inv.amount_due === 'number' ? inv.amount_due : 0),
              0
            );

            const alerts = [];
            if (unpaid_invoice_count > 0) {
              alerts.push({
                id: 'billing_unpaid',
                type: 'billing',
                message:
                  'You have ' +
                  unpaid_invoice_count +
                  ' unpaid invoice(s) totaling $' +
                  total_unpaid_amount.toFixed(2) +
                  '.',
                severity: 'warning'
              });
            }

            return {
              upcoming_visits,
              active_plans,
              alerts,
              billing_summary: {
                unpaid_invoice_count,
                total_unpaid_amount
              }
            };
          }

          // getInvoiceFiltersOptions
          getInvoiceFiltersOptions() {
            const status_options = [
              { value: 'unpaid', label: 'Unpaid' },
              { value: 'paid', label: 'Paid' },
              { value: 'partially_paid', label: 'Partially paid' },
              { value: 'void', label: 'Void' }
            ];

            const sort_options = [
              { value: 'amount_high_to_low', label: 'Amount: High to Low' },
              { value: 'amount_low_to_high', label: 'Amount: Low to High' },
              { value: 'due_date_soonest_first', label: 'Due date: Soonest first' }
            ];

            return { status_options, sort_options };
          }

          // getInvoices
          getInvoices(status, sort_by, page, page_size) {
            let invoices = this._getFromStorage('invoices');
            if (status) {
              invoices = invoices.filter((inv) => inv.status === status);
            }

            const sortVal = sort_by || 'due_date_soonest_first';
            invoices.sort((a, b) => {
              switch (sortVal) {
                case 'amount_high_to_low':
                  return (b.amount_due || 0) - (a.amount_due || 0);
                case 'amount_low_to_high':
                  return (a.amount_due || 0) - (b.amount_due || 0);
                case 'due_date_soonest_first':
                default: {
                  const da = a.due_date || '';
                  const db = b.due_date || '';
                  if (!da && !db) return 0;
                  if (!da) return 1;
                  if (!db) return -1;
                  return da < db ? -1 : da > db ? 1 : 0;
                }
              }
            });

            const total_results = invoices.length;
            const pageNum = page && page > 0 ? page : 1;
            const sizeNum = page_size && page_size > 0 ? page_size : 20;
            const startIdx = (pageNum - 1) * sizeNum;
            const endIdx = startIdx + sizeNum;
            const paged = invoices.slice(startIdx, endIdx);

            return { invoices: paged, total_results };
          }

          // getInvoicePaymentOptions
          getInvoicePaymentOptions(invoiceId) {
            const invoices = this._getFromStorage('invoices');
            const invoice = invoices.find((inv) => inv.id === invoiceId) || null;
            const payment_methods = this._getFromStorage('payment_methods');
            const amount_due_display = invoice
              ? '$' + (invoice.amount_due || 0).toFixed(2)
              : '$0.00';
            return { invoice, amount_due_display, payment_methods };
          }

          // submitInvoicePayment
          submitInvoicePayment(invoiceId, paymentMethodId, amount) {
            if (typeof amount !== 'number' || amount <= 0) {
              return {
                success: false,
                invoice_payment: null,
                updated_invoice: null,
                message: 'Invalid payment amount.'
              };
            }

            const invoices = this._getFromStorage('invoices');
            const payment_methods = this._getFromStorage('payment_methods');
            const invoice = invoices.find((inv) => inv.id === invoiceId) || null;
            const payment_method = payment_methods.find((pm) => pm.id === paymentMethodId) || null;

            if (!invoice) {
              return {
                success: false,
                invoice_payment: null,
                updated_invoice: null,
                message: 'Invoice not found.'
              };
            }
            if (!payment_method) {
              return {
                success: false,
                invoice_payment: null,
                updated_invoice: null,
                message: 'Payment method not found.'
              };
            }

            const { invoice_payment, updated_invoice } = this._applyInvoicePaymentAndUpdateStatus(
              invoice,
              paymentMethodId,
              amount
            );

            return {
              success: true,
              invoice_payment,
              updated_invoice,
              message: 'Payment submitted successfully.'
            };
          }

          // getCurrentCareSchedule
          getCurrentCareSchedule() {
            return this._getOrCreateCurrentCareSchedule();
          }

          // addServiceBlockToCurrentSchedule
          addServiceBlockToCurrentSchedule(service_type, day_of_week, start_time, end_time) {
            if (!service_type || !day_of_week || !start_time || !end_time) {
              return {
                success: false,
                care_schedule: null,
                service_block: null,
                all_blocks: [],
                message: 'Service type, day, and times are required.'
              };
            }

            const { care_schedule, service_blocks } = this._getOrCreateCurrentCareSchedule();
            const allBlocks = this._getFromStorage('service_blocks');
            const time_window = this._determineTimeWindowFromTimes(start_time, end_time);

            const block = {
              id: this._generateId('service_block'),
              care_schedule_id: care_schedule.id,
              service_type,
              day_of_week,
              start_time,
              end_time,
              time_window
            };

            allBlocks.push(block);
            this._saveToStorage('service_blocks', allBlocks);

            const updatedBlocks = allBlocks.filter((b) => b.care_schedule_id === care_schedule.id);

            return {
              success: true,
              care_schedule,
              service_block: block,
              all_blocks: updatedBlocks
            };
          }

          // updateServiceBlockInCurrentSchedule
          updateServiceBlockInCurrentSchedule(
            service_block_id,
            service_type,
            day_of_week,
            start_time,
            end_time
          ) {
            const { care_schedule } = this._getOrCreateCurrentCareSchedule();
            const allBlocks = this._getFromStorage('service_blocks');
            const block = allBlocks.find((b) => b.id === service_block_id);
            if (!block) {
              return {
                success: false,
                care_schedule,
                service_blocks: [],
                message: 'Service block not found.'
              };
            }

            if (service_type) block.service_type = service_type;
            if (day_of_week) block.day_of_week = day_of_week;
            if (start_time) block.start_time = start_time;
            if (end_time) block.end_time = end_time;
            if (start_time || end_time) {
              block.time_window = this._determineTimeWindowFromTimes(
                block.start_time,
                block.end_time
              );
            }

            this._saveToStorage('service_blocks', allBlocks);
            const scheduleBlocks = allBlocks.filter((b) => b.care_schedule_id === care_schedule.id);

            return {
              success: true,
              care_schedule,
              service_blocks: scheduleBlocks
            };
          }

          // removeServiceBlockFromCurrentSchedule
          removeServiceBlockFromCurrentSchedule(service_block_id) {
            const { care_schedule } = this._getOrCreateCurrentCareSchedule();
            const allBlocks = this._getFromStorage('service_blocks');
            const before = allBlocks.length;
            const remaining = allBlocks.filter((b) => b.id !== service_block_id);
            const removed = before !== remaining.length;
            this._saveToStorage('service_blocks', remaining);
            const scheduleBlocks = remaining.filter((b) => b.care_schedule_id === care_schedule.id);
            return {
              success: removed,
              care_schedule,
              service_blocks: scheduleBlocks
            };
          }

          // submitCurrentScheduleRequest
          submitCurrentScheduleRequest(client_name, client_phone, start_option, start_date) {
            if (!client_name || !client_phone || !start_option) {
              return {
                success: false,
                schedule_request: null,
                message: 'Client name, phone, and start option are required.'
              };
            }

            const { care_schedule } = this._getOrCreateCurrentCareSchedule();
            const schedule_requests = this._getFromStorage('schedule_requests');
            const nowIso = new Date().toISOString();

            const sr = {
              id: this._generateId('schedule_request'),
              care_schedule_id: care_schedule.id,
              client_name,
              client_phone,
              start_option,
              start_date: start_option === 'start_on_date' ? start_date || null : null,
              status: 'requested',
              created_at: nowIso
            };

            schedule_requests.push(sr);
            this._saveToStorage('schedule_requests', schedule_requests);

            // Update care schedule status
            const care_schedules = this._getFromStorage('care_schedules');
            const cs = care_schedules.find((c) => c.id === care_schedule.id);
            if (cs) {
              cs.status = 'requested';
              this._saveToStorage('care_schedules', care_schedules);
            }

            return { success: true, schedule_request: sr, message: 'Schedule request submitted.' };
          }

          // getResourceSearchOptions
          getResourceSearchOptions() {
            const categories = [
              {
                value: 'for_seniors_at_home',
                label: 'For seniors at home',
                description: 'Guides to staying safe, healthy, and independent at home.'
              },
              {
                value: 'home_safety',
                label: 'Home safety',
                description: 'Tips to prevent falls and injuries in the home.'
              },
              {
                value: 'caregiver_tips',
                label: 'Caregiver tips',
                description: 'Support and education for family caregivers.'
              },
              {
                value: 'company_news',
                label: 'Company news',
                description: 'Updates and announcements from our team.'
              },
              {
                value: 'dementia_care',
                label: 'Dementia care',
                description: 'Resources for Alzheimer\'s and dementia care.'
              }
            ];

            const popular_tags = [
              { value: 'fall prevention', label: 'Fall prevention' },
              { value: 'home safety', label: 'Home safety' },
              { value: 'dementia', label: 'Dementia' },
              { value: 'family caregiver', label: 'Family caregiver' }
            ];

            return { categories, popular_tags };
          }

          // searchArticles
          searchArticles(query_text, category, page, page_size) {
            const articles = this._getFromStorage('articles');
            const q = (query_text || '').toLowerCase();
            const cat = category || null;

            let filtered = articles.filter((a) => a.is_published !== false);
            if (cat) {
              filtered = filtered.filter((a) => a.category === cat);
            }
            if (q) {
              filtered = filtered.filter((a) => {
                const title = (a.title || '').toLowerCase();
                const content = (a.content || '').toLowerCase();
                const summary = (a.summary || '').toLowerCase();
                const tags = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
                return (
                  title.includes(q) ||
                  content.includes(q) ||
                  summary.includes(q) ||
                  tags.includes(q)
                );
              });
            }

            const total_results = filtered.length;
            const pageNum = page && page > 0 ? page : 1;
            const sizeNum = page_size && page_size > 0 ? page_size : 20;
            const startIdx = (pageNum - 1) * sizeNum;
            const endIdx = startIdx + sizeNum;
            const paged = filtered.slice(startIdx, endIdx);

            const recorded_search_id = this._logResourceSearchQuery(query_text, category);

            return { articles: paged, total_results, recorded_search_id };
          }

          // getArticleDetail
          getArticleDetail(articleId) {
            const articles = this._getFromStorage('articles');

            // Instrumentation for task completion tracking (task_8: opened saved article)
            try {
              const task8Viewed = !!localStorage.getItem('task8_savedResourcesViewed');
              if (task8Viewed) {
                const saved_resources = this._getFromStorage('saved_resources');
                const isSaved = saved_resources.some((sr) => sr.article_id === articleId);
                if (isSaved) {
                  localStorage.setItem(
                    'task8_openedSavedArticle',
                    JSON.stringify({
                      articleId: articleId,
                      opened_at: new Date().toISOString()
                    })
                  );
                }
              }
            } catch (e) {
              console.error('Instrumentation error:', e);
            }

            return articles.find((a) => a.id === articleId) || null;
          }

          // saveArticleToResources
          saveArticleToResources(articleId) {
            const articles = this._getFromStorage('articles');
            const article = articles.find((a) => a.id === articleId);
            if (!article) {
              return { success: false, saved_resource: null, message: 'Article not found.' };
            }
            const saved_resources = this._getFromStorage('saved_resources');
            const existing = saved_resources.find((sr) => sr.article_id === articleId);
            if (existing) {
              return {
                success: true,
                saved_resource: existing,
                message: 'Article already saved.'
              };
            }
            const saved = {
              id: this._generateId('saved_resource'),
              article_id: articleId,
              saved_at: new Date().toISOString()
            };
            saved_resources.push(saved);
            this._saveToStorage('saved_resources', saved_resources);
            return { success: true, saved_resource: saved, message: 'Article saved.' };
          }

          // removeArticleFromResources
          removeArticleFromResources(articleId) {
            const saved_resources = this._getFromStorage('saved_resources');
            const before = saved_resources.length;
            const remaining = saved_resources.filter((sr) => sr.article_id !== articleId);
            this._saveToStorage('saved_resources', remaining);
            const removed = before !== remaining.length;
            return {
              success: removed,
              message: removed ? 'Article removed from saved resources.' : 'Saved article not found.'
            };
          }

          // getSavedResources
          getSavedResources() {
            const saved_resources = this._getFromStorage('saved_resources');
            const articles = this._getFromStorage('articles');

            // Instrumentation for task completion tracking (task_8: visited saved resources)
            try {
              localStorage.setItem('task8_savedResourcesViewed', 'true');
            } catch (e) {
              console.error('Instrumentation error:', e);
            }

            return saved_resources.map((saved_resource) => ({
              saved_resource,
              article: articles.find((a) => a.id === saved_resource.article_id) || null
            }));
          }

          // getHelpCategories
          getHelpCategories() {
            return this._getFromStorage('help_categories');
          }

          // getFAQsByCategory
          getFAQsByCategory(help_category_key, search_query) {
            const categories = this._getFromStorage('help_categories');
            const category = categories.find((c) => c.key === help_category_key) || null;
            if (!category) return [];

            const faqs = this._getFromStorage('help_faqs').filter(
              (f) => f.help_category_id === category.id && f.is_active !== false
            );

            const q = (search_query || '').toLowerCase();
            const filtered = q
              ? faqs.filter((f) => {
                  const question = (f.question || '').toLowerCase();
                  const answer = (f.answer || '').toLowerCase();
                  return question.includes(q) || answer.includes(q);
                })
              : faqs;

            // Resolve foreign key: include category object in each FAQ
            return filtered.map((f) => ({ ...f, category }));
          }

          // searchFAQs
          searchFAQs(query_text) {
            const q = (query_text || '').toLowerCase();
            const categories = this._getFromStorage('help_categories');
            const faqs = this._getFromStorage('help_faqs').filter((f) => f.is_active !== false);

            const matched = faqs.filter((f) => {
              const question = (f.question || '').toLowerCase();
              const answer = (f.answer || '').toLowerCase();
              return question.includes(q) || answer.includes(q);
            });

            return matched.map((faq) => ({
              faq,
              category: categories.find((c) => c.id === faq.help_category_id) || null
            }));
          }

          // getProfile
          getProfile() {
            const profiles = this._getFromStorage('profiles');
            if (profiles.length > 0) return profiles[0];
            const profile = {
              id: this._generateId('profile'),
              full_name: null,
              email: null,
              phone: null,
              address: null,
              preferred_contact_method: null,
              after_hours_care_phone_number: null,
              communication_opt_in_email: false,
              communication_opt_in_sms: false
            };
            profiles.push(profile);
            this._saveToStorage('profiles', profiles);
            return profile;
          }

          // updateProfile
          updateProfile(
            full_name,
            email,
            phone,
            address,
            preferred_contact_method,
            after_hours_care_phone_number,
            communication_opt_in_email,
            communication_opt_in_sms
          ) {
            const fields = {};
            if (typeof full_name !== 'undefined') fields.full_name = full_name;
            if (typeof email !== 'undefined') fields.email = email;
            if (typeof phone !== 'undefined') fields.phone = phone;
            if (typeof address !== 'undefined') fields.address = address;
            if (typeof preferred_contact_method !== 'undefined') {
              fields.preferred_contact_method = preferred_contact_method;
            }
            if (typeof after_hours_care_phone_number !== 'undefined') {
              fields.after_hours_care_phone_number = after_hours_care_phone_number;
            }
            if (typeof communication_opt_in_email !== 'undefined') {
              fields.communication_opt_in_email = communication_opt_in_email;
            }
            if (typeof communication_opt_in_sms !== 'undefined') {
              fields.communication_opt_in_sms = communication_opt_in_sms;
            }

            const profile = this._updateProfileFields(fields);
            return { success: true, profile, message: 'Profile updated.' };
          }

          // updateEmergencyContactPhone
          updateEmergencyContactPhone(after_hours_care_phone_number) {
            if (!after_hours_care_phone_number) {
              return {
                success: false,
                profile: null,
                message: 'Emergency phone number is required.'
              };
            }
            const profile = this._updateProfileFields({
              after_hours_care_phone_number
            });
            return { success: true, profile, message: 'Emergency contact phone updated.' };
          }

          // getAboutUsContent
          getAboutUsContent() {
            return {
              mission:
                'To help older adults live safely and comfortably at home through reliable, compassionate care.',
              values: [
                {
                  title: 'Compassion',
                  description: 'We care for every client as we would for our own family.'
                },
                {
                  title: 'Reliability',
                  description: 'On-time, consistent care from a dedicated team you can trust.'
                },
                {
                  title: 'Safety',
                  description: 'We prioritize safety in every visit and every care plan.'
                }
              ],
              experience_summary:
                'Our leadership team brings years of experience in home health, nursing, and senior care coordination.',
              caregiver_qualifications:
                'All caregivers complete background checks, reference checks, and skills verification, and receive ongoing training.',
              accreditations: [
                {
                  name: 'Licensed Home Care Provider',
                  description: 'State-licensed provider meeting regulatory standards for home care.'
                }
              ],
              service_area_description:
                'We currently serve clients across the greater metropolitan area and surrounding communities.',
              safety_practices:
                'We follow strict infection-control protocols, conduct regular safety trainings, and design care plans with fall prevention in mind.'
            };
          }

          // getLegalContent
          getLegalContent(page_key) {
            const nowIso = new Date().toISOString().slice(0, 10);
            let title = '';
            let content_html = '';

            switch (page_key) {
              case 'privacy_policy':
                title = 'Privacy Policy';
                content_html =
                  '<p>We respect your privacy and are committed to protecting your personal information. This policy explains what data we collect, how we use it, and your choices.</p>';
                break;
              case 'terms_of_service':
                title = 'Terms of Service';
                content_html =
                  '<p>These terms govern your use of our website and services. By using our services, you agree to these terms.</p>';
                break;
              case 'billing_and_cancellation':
                title = 'Billing and Cancellation Policy';
                content_html =
                  '<p>Our billing and cancellation policies describe how invoices are issued, when payments are due, and how to make changes to your services.</p>';
                break;
              case 'refund_policy':
                title = 'Refund Policy';
                content_html =
                  '<p>Refunds may be issued in certain circumstances as outlined in this policy. Please contact our support team with any questions.</p>';
                break;
              default:
                title = 'Legal';
                content_html = '<p>Legal information.</p>';
                break;
            }

            return {
              title,
              last_updated: nowIso,
              content_html
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