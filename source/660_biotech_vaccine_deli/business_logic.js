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
            this._initStorage();
            this._getNextIdCounter(); // ensure idCounter exists
          }

          // =====================
          // Initialization & Core Storage Helpers
          // =====================

          _initStorage() {
            // Legacy/sample keys (not used but kept for compatibility)
            if (!localStorage.getItem('users')) {
              localStorage.setItem('users', JSON.stringify([]));
            }
            if (!localStorage.getItem('carts')) {
              localStorage.setItem('carts', JSON.stringify([]));
            }
            if (!localStorage.getItem('cartItems')) {
              localStorage.setItem('cartItems', JSON.stringify([]));
            }

            // Core entity storage based on data model
            const arrayKeys = [
              'products',
              'product_variants',
              'product_documents',
              'quotes',
              'quote_items',
              'cart',
              'cart_items',
              'shipping_options',
              'orders',
              'order_items',
              'consultation_timeslots',
              'consultation_bookings',
              'custom_formulation_requests',
              'events',
              'event_registrations',
              'resources',
              'saved_items',
              'device_comparisons',
              'contact_forms'
            ];

            arrayKeys.forEach((key) => {
              if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify([]));
              }
            });

            // Singleton / structured content buckets
            if (!localStorage.getItem('about_content')) {
              localStorage.setItem('about_content', JSON.stringify({}));
            }
            if (!localStorage.getItem('legal_content')) {
              localStorage.setItem('legal_content', JSON.stringify({
                privacy_policy_html: '',
                cookie_policy_html: '',
                terms_of_use_html: '',
                data_protection_contact: ''
              }));
            }
            if (!localStorage.getItem('homepage_content')) {
              localStorage.setItem('homepage_content', JSON.stringify({
                hero_title: '',
                hero_subtitle: ''
              }));
            }
            if (!localStorage.getItem('product_categories')) {
              localStorage.setItem('product_categories', JSON.stringify([]));
            }

            if (!localStorage.getItem('idCounter')) {
              localStorage.setItem('idCounter', '1000');
            }
          }

          _getFromStorage(key, defaultValue) {
            const data = localStorage.getItem(key);
            if (data === null || data === undefined) {
              return defaultValue !== undefined ? defaultValue : [];
            }
            try {
              return JSON.parse(data);
            } catch (e) {
              // If parsing fails, reset to default to avoid breaking logic
              const reset = defaultValue !== undefined ? defaultValue : [];
              localStorage.setItem(key, JSON.stringify(reset));
              return reset;
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

          _now() {
            return new Date().toISOString();
          }

          // =====================
          // Enum Label Helpers (pure mapping, not stored)
          // =====================

          _mapApplicationLabel(value) {
            const map = {
              preclinical: 'Preclinical',
              clinical: 'Clinical',
              viral_vector: 'Viral Vector',
              other: 'Other'
            };
            return map[value] || '';
          }

          _mapPayloadTypeLabel(value) {
            const map = {
              mrna: 'mRNA',
              dna: 'DNA',
              protein: 'Protein',
              viral_vector: 'Viral Vector',
              small_molecule: 'Small Molecule',
              other: 'Other'
            };
            return map[value] || '';
          }

          _mapRouteLabel(value) {
            const map = {
              intravenous: 'Intravenous',
              intramuscular: 'Intramuscular',
              subcutaneous: 'Subcutaneous',
              intranasal_nasal_spray: 'Intranasal / Nasal Spray',
              oral_capsule: 'Oral / Capsule',
              other: 'Other'
            };
            return map[value] || '';
          }

          _mapIndicationLabel(value) {
            const map = {
              covid_19: 'COVID-19',
              influenza: 'Influenza',
              rsvirus: 'RSV',
              multiple: 'Multiple',
              other: 'Other'
            };
            return map[value] || '';
          }

          _mapResourceTypeLabel(value) {
            const map = {
              case_study: 'Case Study',
              white_paper: 'White Paper',
              article: 'Article',
              application_note: 'Application Note',
              webinar_recording: 'Webinar Recording'
            };
            return map[value] || '';
          }

          _mapDeliveryRouteResourceLabel(value) {
            const map = {
              intranasal: 'Intranasal',
              intramuscular: 'Intramuscular',
              subcutaneous: 'Subcutaneous',
              oral: 'Oral',
              intravenous: 'Intravenous',
              other: 'Other'
            };
            return map[value] || '';
          }

          _mapPriceUnitLabel(value) {
            const map = {
              per_10_ml: 'per 10 mL',
              per_ml: 'per mL',
              per_vial: 'per vial',
              per_kit: 'per kit',
              per_batch: 'per batch',
              per_unit: 'per unit',
              per_package: 'per package'
            };
            return map[value] || '';
          }

          // =====================
          // Private helpers required by spec
          // =====================

          _getOrCreateCart() {
            let carts = this._getFromStorage('cart', []);
            let cart = carts.find((c) => c.status === 'active');
            if (!cart) {
              cart = {
                id: this._generateId('cart'),
                status: 'active',
                selected_shipping_option_code: null,
                created_at: this._now(),
                updated_at: this._now()
              };
              carts.push(cart);
              this._saveToStorage('cart', carts);
            }
            return cart;
          }

          _getOrCreateQuoteRequest() {
            let quotes = this._getFromStorage('quotes', []);
            let quote = quotes.find((q) => q.status === 'draft');
            if (!quote) {
              quote = {
                id: this._generateId('quote'),
                status: 'draft',
                created_at: this._now(),
                submitted_at: null,
                contact_name: null,
                contact_email: null,
                organization: null,
                project_title: null,
                project_description: null
              };
              quotes.push(quote);
              this._saveToStorage('quotes', quotes);
            }
            return quote;
          }

          _getOrCreateDeviceComparison() {
            let comparisons = this._getFromStorage('device_comparisons', []);
            let comparison = comparisons[0];
            if (!comparison) {
              comparison = {
                id: this._generateId('devicecmp'),
                device_ids: [],
                created_at: this._now(),
                updated_at: this._now()
              };
              comparisons.push(comparison);
              this._saveToStorage('device_comparisons', comparisons);
            }
            return comparison;
          }

          _getSavedItemsContainer() {
            return this._getFromStorage('saved_items', []);
          }

          _calculateCartTotals(cart, cartItems, shippingOptions) {
            let subtotal = 0;
            cartItems.forEach((item) => {
              const unitPrice = typeof item.unit_price === 'number' ? item.unit_price : 0;
              const qty = typeof item.quantity === 'number' ? item.quantity : 0;
              subtotal += unitPrice * qty;
            });

            let shipping_cost = 0;
            let selectedShipping = null;
            if (cart && cart.selected_shipping_option_code) {
              selectedShipping = (shippingOptions || []).find(
                (s) => s.code === cart.selected_shipping_option_code
              );
            }
            if (selectedShipping && typeof selectedShipping.cost === 'number') {
              shipping_cost = selectedShipping.cost;
            }
            const total_cost = subtotal + shipping_cost;

            return {
              subtotal,
              shipping_cost,
              total_cost,
              currency: (selectedShipping && selectedShipping.currency) || 'USD'
            };
          }

          _calculateOrderTotals(orderItems, shippingOption) {
            let subtotal = 0;
            orderItems.forEach((item) => {
              const unitPrice = typeof item.unit_price === 'number' ? item.unit_price : 0;
              const qty = typeof item.quantity === 'number' ? item.quantity : 0;
              subtotal += unitPrice * qty;
            });
            const shipping_cost = shippingOption && typeof shippingOption.cost === 'number'
              ? shippingOption.cost
              : 0;
            const total_cost = subtotal + shipping_cost;
            return { subtotal, shipping_cost, total_cost };
          }

          _validateBusinessHoursForEvent(event) {
            if (!event || !event.start_datetime) {
              return { flag: false, display: 'No start time available' };
            }

            const raw = event.start_datetime;
            if (typeof raw !== 'string') {
              return { flag: false, display: 'Invalid start time' };
            }

            // Determine business hours based on the local event time encoded in the
            // timestamp string (the HH:MM portion before any timezone offset), so
            // results are not affected by the runtime's local timezone.
            const timeMatch = raw.match(/T(\d{2}):(\d{2})/);
            if (!timeMatch) {
              const start = new Date(raw);
              if (isNaN(start.getTime())) {
                return { flag: false, display: 'Invalid start time' };
              }
              const hourFallback = start.getHours();
              const flagFallback = hourFallback >= 9 && hourFallback < 18; // 09:00-18:00
              const displayFallback = flagFallback
                ? 'Within business hours (09:00–18:00)'
                : 'Outside business hours (09:00–18:00)';
              return { flag: flagFallback, display: displayFallback };
            }

            const hour = parseInt(timeMatch[1], 10);
            if (isNaN(hour)) {
              return { flag: false, display: 'Invalid start time' };
            }

            const flag = hour >= 9 && hour < 18; // 09:00-18:00 local event time
            const display = flag
              ? 'Within business hours (09:00–18:00)'
              : 'Outside business hours (09:00–18:00)';
            return { flag, display };
          }

          _filterProductsBySpecs(products, specFilters) {
            if (!specFilters) return products;
            return products.filter((p) => {
              // Dose range overlap
              if (specFilters.min_dose_ml != null && p.max_dose_ml != null && p.max_dose_ml < specFilters.min_dose_ml) {
                return false;
              }
              if (specFilters.max_dose_ml != null && p.min_dose_ml != null && p.min_dose_ml > specFilters.max_dose_ml) {
                return false;
              }

              // Needle gauge overlap
              if (
                specFilters.min_needle_gauge != null &&
                p.max_needle_gauge != null &&
                p.max_needle_gauge < specFilters.min_needle_gauge
              ) {
                return false;
              }
              if (
                specFilters.max_needle_gauge != null &&
                p.min_needle_gauge != null &&
                p.min_needle_gauge > specFilters.max_needle_gauge
              ) {
                return false;
              }

              // Storage temperature overlap (product must at least cover requested range)
              if (
                specFilters.storage_min_temp_c != null &&
                p.storage_min_temp_c != null &&
                p.storage_min_temp_c > specFilters.storage_min_temp_c
              ) {
                return false;
              }
              if (
                specFilters.storage_max_temp_c != null &&
                p.storage_max_temp_c != null &&
                p.storage_max_temp_c < specFilters.storage_max_temp_c
              ) {
                return false;
              }

              // Gastro-resistant
              if (specFilters.has_gastro_resistant_feature != null) {
                if (p.has_gastro_resistant_feature !== specFilters.has_gastro_resistant_feature) {
                  return false;
                }
              }

              // Enteric coated
              if (specFilters.is_enteric_coated != null) {
                if (p.is_enteric_coated !== specFilters.is_enteric_coated) {
                  return false;
                }
              }

              // Technical support
              if (specFilters.technical_support_included != null) {
                if (p.technical_support_included !== specFilters.technical_support_included) {
                  return false;
                }
              }

              return true;
            });
          }

          // =====================
          // Interface Implementations
          // =====================

          // 1. getHomepageContent
          getHomepageContent() {
            const homepageContent = this._getFromStorage('homepage_content', {});
            const products = this._getFromStorage('products', []).filter(
              (p) => p && (p.is_active === undefined || p.is_active === true)
            );
            const events = this._getFromStorage('events', []);
            const resources = this._getFromStorage('resources', []);

            const featured_products = products.slice(0, 5);

            const upcoming_webinars = events.filter((e) => {
              if (!e || e.event_type !== 'webinar') return false;
              if (typeof e.is_upcoming === 'boolean') return e.is_upcoming;
              const start = new Date(e.start_datetime);
              return !isNaN(start.getTime()) && start.getTime() > Date.now();
            });

            const featured_case_studies = resources.filter(
              (r) => r && r.resource_type === 'case_study'
            ).slice(0, 5);

            const featured_categories = this.getProductCategories();

            return {
              hero_title: homepageContent.hero_title || '',
              hero_subtitle: homepageContent.hero_subtitle || '',
              featured_categories,
              featured_products,
              upcoming_webinars,
              featured_case_studies
            };
          }

          // 2. getProductCategories
          getProductCategories() {
            // Prefer categories stored in localStorage if present
            const stored = this._getFromStorage('product_categories', []);
            if (stored && stored.length) {
              return stored;
            }

            // Fallback to static mapping based on category_key enum
            return [
              {
                category_key: 'lipid_nanoparticle_formulations',
                category_label: 'Lipid Nanoparticle Formulations',
                description: 'LNP formulations for mRNA, DNA, and other payloads.',
                url_path: '/products/lipid-nanoparticle-formulations'
              },
              {
                category_key: 'delivery_systems',
                category_label: 'Delivery Systems',
                description: 'Complete vaccine delivery systems for nucleic acid and protein payloads.',
                url_path: '/products/delivery-systems'
              },
              {
                category_key: 'delivery_devices',
                category_label: 'Delivery Devices',
                description: 'Devices for intramuscular, subcutaneous, intranasal, and oral delivery.',
                url_path: '/products/delivery-devices'
              },
              {
                category_key: 'buffers_excipients',
                category_label: 'Buffers & Excipients',
                description: 'Buffers and excipients for viral vectors and other modalities.',
                url_path: '/products/buffers-excipients'
              },
              {
                category_key: 'all_products',
                category_label: 'All Products',
                description: 'Browse the full catalog of vaccine delivery offerings.',
                url_path: '/products'
              }
            ];
          }

          // 3. getProductFilterOptions
          getProductFilterOptions(category_key) {
            const products = this._getFromStorage('products', []).filter((p) => {
              if (!p || p.is_active === false) return false;
              if (!category_key || category_key === 'all_products') return true;
              return p.category_key === category_key;
            });

            const unique = (arr) => Array.from(new Set(arr.filter((x) => x !== null && x !== undefined)));

            const application_values = unique(products.map((p) => p.application_category));
            const payload_values = unique(products.map((p) => p.payload_type));
            const route_values = unique(products.map((p) => p.route_of_administration));

            const application_options = application_values.map((v) => ({
              value: v,
              label: this._mapApplicationLabel(v)
            }));

            const payload_type_options = payload_values.map((v) => ({
              value: v,
              label: this._mapPayloadTypeLabel(v)
            }));

            const route_of_administration_options = route_values.map((v) => ({
              value: v,
              label: this._mapRouteLabel(v)
            }));

            const doses = products
              .map((p) => [p.min_dose_ml, p.max_dose_ml])
              .reduce(
                (acc, [min, max]) => {
                  if (typeof min === 'number') acc.mins.push(min);
                  if (typeof max === 'number') acc.maxs.push(max);
                  return acc;
                },
                { mins: [], maxs: [] }
              );

            const needle = products
              .map((p) => [p.min_needle_gauge, p.max_needle_gauge])
              .reduce(
                (acc, [min, max]) => {
                  if (typeof min === 'number') acc.mins.push(min);
                  if (typeof max === 'number') acc.maxs.push(max);
                  return acc;
                },
                { mins: [], maxs: [] }
              );

            const temps = products
              .map((p) => [p.storage_min_temp_c, p.storage_max_temp_c])
              .reduce(
                (acc, [min, max]) => {
                  if (typeof min === 'number') acc.mins.push(min);
                  if (typeof max === 'number') acc.maxs.push(max);
                  return acc;
                },
                { mins: [], maxs: [] }
              );

            const price_units_values = unique(products.map((p) => p.price_unit));
            const price_units = price_units_values.map((v) => ({
              value: v,
              label: this._mapPriceUnitLabel(v)
            }));

            const feature_options = [
              { value: 'gastro_resistant', label: 'Gastro-resistant' },
              { value: 'enteric_coated', label: 'Enteric-coated' }
            ];

            const support_options = [
              { value: 'technical_support_included', label: 'Technical Support Included' }
            ];

            const rating_threshold_options = [
              { min_rating: 3, label: '3+ stars' },
              { min_rating: 4, label: '4+ stars' },
              { min_rating: 4.5, label: '4.5+ stars' }
            ];

            return {
              application_options,
              payload_type_options,
              route_of_administration_options,
              dose_range_limits: {
                min_dose_ml: doses.mins.length ? Math.min.apply(null, doses.mins) : null,
                max_dose_ml: doses.maxs.length ? Math.max.apply(null, doses.maxs) : null
              },
              needle_gauge_range_limits: {
                min_needle_gauge: needle.mins.length ? Math.min.apply(null, needle.mins) : null,
                max_needle_gauge: needle.maxs.length ? Math.max.apply(null, needle.maxs) : null
              },
              storage_temperature_range_limits: {
                min_temp_c: temps.mins.length ? Math.min.apply(null, temps.mins) : null,
                max_temp_c: temps.maxs.length ? Math.max.apply(null, temps.maxs) : null
              },
              price_units,
              feature_options,
              support_options,
              rating_threshold_options
            };
          }

          // 4. listProducts
          listProducts(category_key, search_term, filters, sort, page, page_size) {
            const allProducts = this._getFromStorage('products', []).filter(
              (p) => p && (p.is_active === undefined || p.is_active === true)
            );

            let products = allProducts.filter((p) => {
              if (!category_key || category_key === 'all_products') return true;
              return p.category_key === category_key;
            });

            if (search_term) {
              const term = String(search_term).toLowerCase();
              products = products.filter((p) => {
                const name = (p.name || '').toLowerCase();
                const sd = (p.short_description || '').toLowerCase();
                const ld = (p.long_description || '').toLowerCase();
                return name.includes(term) || sd.includes(term) || ld.includes(term);
              });
            }

            const f = filters || {};

            if (f.application_categories && f.application_categories.length) {
              products = products.filter((p) => f.application_categories.includes(p.application_category));
            }

            if (f.payload_types && f.payload_types.length) {
              products = products.filter((p) => f.payload_types.includes(p.payload_type));
            }

            if (f.routes_of_administration && f.routes_of_administration.length) {
              products = products.filter((p) =>
                f.routes_of_administration.includes(p.route_of_administration)
              );
            }

            products = this._filterProductsBySpecs(products, {
              min_dose_ml: f.min_dose_ml,
              max_dose_ml: f.max_dose_ml,
              min_needle_gauge: f.min_needle_gauge,
              max_needle_gauge: f.max_needle_gauge,
              storage_min_temp_c: f.storage_min_temp_c,
              storage_max_temp_c: f.storage_max_temp_c,
              has_gastro_resistant_feature: f.has_gastro_resistant_feature,
              is_enteric_coated: f.is_enteric_coated,
              technical_support_included: f.technical_support_included
            });

            if (f.max_price != null) {
              products = products.filter((p) => {
                if (typeof p.price_per_unit !== 'number') return false;
                if (f.price_unit && p.price_unit && f.price_unit !== p.price_unit) return false;
                return p.price_per_unit <= f.max_price;
              });
            } else if (f.price_unit) {
              products = products.filter((p) => !p.price_unit || p.price_unit === f.price_unit);
            }

            if (f.min_rating != null) {
              products = products.filter((p) => {
                if (typeof p.rating_average !== 'number') return false;
                return p.rating_average >= f.min_rating;
              });
            }

            if (f.primary_indications && f.primary_indications.length) {
              products = products.filter((p) => {
                const primary = p.primary_indication;
                const tags = Array.isArray(p.indications) ? p.indications : [];
                const set = new Set(tags.concat(primary ? [primary] : []));
                return f.primary_indications.some((pi) => set.has(pi));
              });
            }

            // Sorting
            const sortKey = sort || 'relevance';
            if (sortKey === 'price_low_to_high') {
              products = products.slice().sort((a, b) => {
                const pa = typeof a.price_per_unit === 'number' ? a.price_per_unit : Number.MAX_VALUE;
                const pb = typeof b.price_per_unit === 'number' ? b.price_per_unit : Number.MAX_VALUE;
                return pa - pb;
              });
            } else if (sortKey === 'rating_high_to_low') {
              products = products.slice().sort((a, b) => {
                const ra = typeof a.rating_average === 'number' ? a.rating_average : 0;
                const rb = typeof b.rating_average === 'number' ? b.rating_average : 0;
                return rb - ra;
              });
            } else if (sortKey === 'lead_time_low_to_high') {
              products = products.slice().sort((a, b) => {
                const la = typeof a.lead_time_days_default === 'number'
                  ? a.lead_time_days_default
                  : Number.MAX_VALUE;
                const lb = typeof b.lead_time_days_default === 'number'
                  ? b.lead_time_days_default
                  : Number.MAX_VALUE;
                return la - lb;
              });
            }

            const currentPage = page && page > 0 ? page : 1;
            const size = page_size && page_size > 0 ? page_size : 20;
            const total_items = products.length;
            const total_pages = Math.ceil(total_items / size) || 1;
            const offset = (currentPage - 1) * size;
            const pageProducts = products.slice(offset, offset + size);

            const mappedProducts = pageProducts.map((p) => {
              const price_display = typeof p.price_per_unit === 'number'
                ? `${p.price_currency || 'USD'} ${p.price_per_unit.toFixed(2)} ${this._mapPriceUnitLabel(
                    p.price_unit
                  )}`
                : 'Contact for pricing';

              const rating_display = typeof p.rating_average === 'number'
                ? `${p.rating_average.toFixed(1)} / 5 (${p.rating_count || 0} reviews)`
                : 'No ratings';

              let storage_temperature_display = '';
              if (typeof p.storage_min_temp_c === 'number' && typeof p.storage_max_temp_c === 'number') {
                storage_temperature_display = `${p.storage_min_temp_c}°C to ${p.storage_max_temp_c}°C`;
              } else if (typeof p.storage_min_temp_c === 'number') {
                storage_temperature_display = `≥ ${p.storage_min_temp_c}°C`;
              } else if (typeof p.storage_max_temp_c === 'number') {
                storage_temperature_display = `≤ ${p.storage_max_temp_c}°C`;
              }

              let dose_range_display = '';
              if (typeof p.min_dose_ml === 'number' && typeof p.max_dose_ml === 'number') {
                dose_range_display = `${p.min_dose_ml}–${p.max_dose_ml} mL`;
              }

              let needle_gauge_display = '';
              if (typeof p.min_needle_gauge === 'number' && typeof p.max_needle_gauge === 'number') {
                needle_gauge_display = `${p.min_needle_gauge}G–${p.max_needle_gauge}G`;
              }

              const lead_time_days_display = typeof p.lead_time_days_default === 'number'
                ? `${p.lead_time_days_default} days`
                : '';

              const is_comparable_device = p.product_type === 'delivery_device';

              const can_add_to_cart = p.product_type === 'oral_capsule_kit';
              const can_add_to_quote = !can_add_to_cart;

              return {
                product: p,
                price_display,
                rating_display,
                storage_temperature_display,
                route_label: this._mapRouteLabel(p.route_of_administration),
                dose_range_display,
                needle_gauge_display,
                lead_time_days_display,
                is_comparable_device,
                can_add_to_cart,
                can_add_to_quote
              };
            });

            const categoryLabel = (this.getProductCategories().find((c) => c.category_key === category_key) || {})
              .category_label || '';

            return {
              category_label: categoryLabel,
              products: mappedProducts,
              pagination: {
                page: currentPage,
                page_size: size,
                total_items,
                total_pages
              },
              applied_filters_summary: '',
              sort_label: sortKey
            };
          }

          // 5. getProductDetails
          getProductDetails(productId) {
            const products = this._getFromStorage('products', []);
            const variantsAll = this._getFromStorage('product_variants', []);
            const documentsAll = this._getFromStorage('product_documents', []);

            const product = products.find((p) => p.id === productId) || null;

            if (!product) {
              return {
                product: null,
                category_label: '',
                application_label: '',
                payload_type_label: '',
                route_label: '',
                dose_range_display: '',
                needle_gauge_display: '',
                storage_temperature_display: '',
                rating_display: '',
                technical_support_display: '',
                variants: [],
                documents: [],
                related_products: []
              };
            }

            const category_label = (this.getProductCategories().find(
              (c) => c.category_key === product.category_key
            ) || {}).category_label || '';

            let dose_range_display = '';
            if (typeof product.min_dose_ml === 'number' && typeof product.max_dose_ml === 'number') {
              dose_range_display = `${product.min_dose_ml}–${product.max_dose_ml} mL`;
            }

            let needle_gauge_display = '';
            if (
              typeof product.min_needle_gauge === 'number' &&
              typeof product.max_needle_gauge === 'number'
            ) {
              needle_gauge_display = `${product.min_needle_gauge}G–${product.max_needle_gauge}G`;
            }

            let storage_temperature_display = '';
            if (
              typeof product.storage_min_temp_c === 'number' &&
              typeof product.storage_max_temp_c === 'number'
            ) {
              storage_temperature_display = `${product.storage_min_temp_c}°C to ${product.storage_max_temp_c}°C`;
            }

            const rating_display = typeof product.rating_average === 'number'
              ? `${product.rating_average.toFixed(1)} / 5 (${product.rating_count || 0} reviews)`
              : 'No ratings';

            const technical_support_display = product.technical_support_included
              ? 'Technical support included'
              : 'Technical support not included';

            const variantsRaw = variantsAll.filter((v) => v.product_id === product.id);
            const variants = variantsRaw.map((variant) => {
              const pack_size_display = typeof variant.volume_ml === 'number'
                ? `${variant.volume_ml} mL ${variant.unit_type || ''}`.trim()
                : variant.unit_type || '';

              const price_display = typeof variant.price === 'number'
                ? `${variant.price_currency || product.price_currency || 'USD'} ${variant.price.toFixed(2)} ${this._mapPriceUnitLabel(
                    variant.price_unit
                  )}`
                : '';

              const lead_time_days_display = typeof variant.lead_time_days === 'number'
                ? `${variant.lead_time_days} days`
                : '';

              return {
                variant,
                product, // FK resolution helper
                pack_size_display,
                price_display,
                lead_time_days_display,
                is_default: !!variant.is_default
              };
            });

            const documents = documentsAll.filter((d) => d.product_id === product.id);

            const related_products = products
              .filter((p) => p.id !== product.id && p.category_key === product.category_key)
              .slice(0, 4);

            return {
              product,
              category_label,
              application_label: this._mapApplicationLabel(product.application_category),
              payload_type_label: this._mapPayloadTypeLabel(product.payload_type),
              route_label: this._mapRouteLabel(product.route_of_administration),
              dose_range_display,
              needle_gauge_display,
              storage_temperature_display,
              rating_display,
              technical_support_display,
              variants,
              documents,
              related_products
            };
          }

          // 5a. openProductDocument (helper for UI to open product documents)
          openProductDocument(documentId) {
            const documents = this._getFromStorage('product_documents', []);
            const document = documents.find((d) => d.id === documentId) || null;

            // Instrumentation for task completion tracking
            try {
              if (
                document &&
                (
                  document.document_type === 'stability_data_sheet' ||
                  (typeof document.title === 'string' &&
                    document.title.toLowerCase().includes('stability data sheet'))
                )
              ) {
                localStorage.setItem('task4_openedStabilityDocId', document.id);
              }
            } catch (e) {
              console.error('Instrumentation error:', e);
            }

            return document;
          }

          // 6. addProductToQuote
          addProductToQuote(productId, productVariantId, quantity, unit_label) {
            const qty = quantity && quantity > 0 ? quantity : 1;
            const products = this._getFromStorage('products', []);
            const variants = this._getFromStorage('product_variants', []);
            const product = products.find((p) => p.id === productId);
            if (!product) {
              return { success: false, quote: null, items: [], message: 'Product not found' };
            }
            let variant = null;
            if (productVariantId) {
              variant = variants.find((v) => v.id === productVariantId && v.product_id === productId) || null;
            }

            const quote = this._getOrCreateQuoteRequest();
            let quoteItems = this._getFromStorage('quote_items', []);

            const newItem = {
              id: this._generateId('quoteitem'),
              quote_id: quote.id,
              product_id: product.id,
              product_variant_id: variant ? variant.id : null,
              product_name: product.name,
              configuration_name: variant ? variant.name : null,
              quantity: qty,
              unit_label: unit_label || null,
              notes: null
            };

            quoteItems.push(newItem);
            this._saveToStorage('quote_items', quoteItems);

            const itemsForQuote = quoteItems.filter((i) => i.quote_id === quote.id);

            return {
              success: true,
              quote,
              items: itemsForQuote,
              message: 'Product added to quote'
            };
          }

          // 7. getQuoteOverview
          getQuoteOverview() {
            const quote = this._getOrCreateQuoteRequest();
            const quoteItems = this._getFromStorage('quote_items', []).filter(
              (i) => i.quote_id === quote.id
            );
            const products = this._getFromStorage('products', []);
            const variants = this._getFromStorage('product_variants', []);

            const itemsDetailed = quoteItems.map((qi) => {
              const product = products.find((p) => p.id === qi.product_id) || null;
              const product_variant = qi.product_variant_id
                ? variants.find((v) => v.id === qi.product_variant_id) || null
                : null;

              let spec_summary = '';
              if (product) {
                const route = this._mapRouteLabel(product.route_of_administration);
                const payload = this._mapPayloadTypeLabel(product.payload_type);
                spec_summary = [payload, route].filter(Boolean).join(' | ');
              }

              return {
                quote_item: qi,
                product,
                product_variant,
                spec_summary
              };
            });

            return {
              quote,
              items: itemsDetailed,
              total_line_items: itemsDetailed.length
            };
          }

          // 8. updateQuoteItemQuantity
          updateQuoteItemQuantity(quoteItemId, quantity) {
            const quoteItems = this._getFromStorage('quote_items', []);
            const itemIndex = quoteItems.findIndex((i) => i.id === quoteItemId);
            if (itemIndex === -1) {
              return { quote: null, items: [] };
            }

            const newQty = quantity && quantity > 0 ? quantity : 1;
            quoteItems[itemIndex].quantity = newQty;
            this._saveToStorage('quote_items', quoteItems);

            const quoteId = quoteItems[itemIndex].quote_id;
            const quotes = this._getFromStorage('quotes', []);
            const quote = quotes.find((q) => q.id === quoteId) || null;
            const itemsForQuote = quoteItems.filter((i) => i.quote_id === quoteId);

            return {
              quote,
              items: itemsForQuote
            };
          }

          // 9. removeQuoteItem
          removeQuoteItem(quoteItemId) {
            let quoteItems = this._getFromStorage('quote_items', []);
            const item = quoteItems.find((i) => i.id === quoteItemId) || null;
            if (!item) {
              return { quote: null, items: [] };
            }
            quoteItems = quoteItems.filter((i) => i.id !== quoteItemId);
            this._saveToStorage('quote_items', quoteItems);

            const quoteId = item.quote_id;
            const quotes = this._getFromStorage('quotes', []);
            const quote = quotes.find((q) => q.id === quoteId) || null;
            const itemsForQuote = quoteItems.filter((i) => i.quote_id === quoteId);

            return {
              quote,
              items: itemsForQuote
            };
          }

          // 10. submitQuoteRequest
          submitQuoteRequest(contact_name, contact_email, organization, project_title, project_description) {
            const quotes = this._getFromStorage('quotes', []);
            const quote = quotes.find((q) => q.status === 'draft');
            if (!quote) {
              return {
                quote: null,
                items: [],
                confirmation_message: 'No draft quote to submit.'
              };
            }
            const quoteItems = this._getFromStorage('quote_items', []).filter(
              (i) => i.quote_id === quote.id
            );
            quote.contact_name = contact_name;
            quote.contact_email = contact_email;
            quote.organization = organization || quote.organization;
            quote.project_title = project_title || quote.project_title;
            quote.project_description = project_description || quote.project_description;
            quote.status = 'submitted';
            quote.submitted_at = this._now();

            this._saveToStorage('quotes', quotes);

            return {
              quote,
              items: quoteItems,
              confirmation_message: 'Quote request submitted.'
            };
          }

          // 11. addProductToCart
          addProductToCart(productId, productVariantId, quantity) {
            const qty = quantity && quantity > 0 ? quantity : 1;
            const products = this._getFromStorage('products', []);
            const variants = this._getFromStorage('product_variants', []);
            const product = products.find((p) => p.id === productId);
            if (!product) {
              return { cart: null, items: [], message: 'Product not found' };
            }
            let variant = null;
            if (productVariantId) {
              variant = variants.find((v) => v.id === productVariantId && v.product_id === productId) || null;
            }

            const cart = this._getOrCreateCart();
            let cartItems = this._getFromStorage('cart_items', []);

            const existingIndex = cartItems.findIndex(
              (ci) =>
                ci.cart_id === cart.id &&
                ci.product_id === product.id &&
                (ci.product_variant_id || null) === (variant ? variant.id : null)
            );

            const unit_price = variant && typeof variant.price === 'number'
              ? variant.price
              : typeof product.price_per_unit === 'number'
              ? product.price_per_unit
              : 0;
            const price_currency = (variant && variant.price_currency) || product.price_currency || 'USD';

            if (existingIndex !== -1) {
              const existing = cartItems[existingIndex];
              existing.quantity += qty;
              existing.unit_price = unit_price;
              existing.price_currency = price_currency;
              existing.subtotal = existing.quantity * unit_price;
            } else {
              const newItem = {
                id: this._generateId('cartitem'),
                cart_id: cart.id,
                product_id: product.id,
                product_variant_id: variant ? variant.id : null,
                product_name: product.name,
                configuration_name: variant ? variant.name : null,
                quantity: qty,
                unit_price,
                price_currency,
                subtotal: qty * unit_price
              };
              cartItems.push(newItem);
            }

            cart.updated_at = this._now();
            this._saveToStorage('cart_items', cartItems);

            const carts = this._getFromStorage('cart', []);
            const cartIndex = carts.findIndex((c) => c.id === cart.id);
            if (cartIndex !== -1) {
              carts[cartIndex] = cart;
              this._saveToStorage('cart', carts);
            }

            const itemsForCart = cartItems.filter((i) => i.cart_id === cart.id);
            return {
              cart,
              items: itemsForCart,
              message: 'Product added to cart'
            };
          }

          // 12. getCart
          getCart() {
            const cart = this._getOrCreateCart();
            const cartItems = this._getFromStorage('cart_items', []).filter(
              (i) => i.cart_id === cart.id
            );
            const products = this._getFromStorage('products', []);
            const variants = this._getFromStorage('product_variants', []);
            const shippingOptions = this._getFromStorage('shipping_options', []);

            const itemsDetailed = cartItems.map((ci) => {
              const product = products.find((p) => p.id === ci.product_id) || null;
              const product_variant = ci.product_variant_id
                ? variants.find((v) => v.id === ci.product_variant_id) || null
                : null;
              return {
                cart_item: ci,
                product,
                product_variant
              };
            });

            const totals = this._calculateCartTotals(cart, cartItems, shippingOptions);

            return {
              cart,
              items: itemsDetailed,
              available_shipping_options: shippingOptions,
              totals
            };
          }

          // 13. updateCartItemQuantity
          updateCartItemQuantity(cartItemId, quantity) {
            let cartItems = this._getFromStorage('cart_items', []);
            const index = cartItems.findIndex((i) => i.id === cartItemId);
            if (index === -1) {
              return { cart: null, items: [], totals: { subtotal: 0, shipping_cost: 0, total_cost: 0 } };
            }

            const newQty = quantity && quantity > 0 ? quantity : 1;
            const item = cartItems[index];
            item.quantity = newQty;
            const unitPrice = typeof item.unit_price === 'number' ? item.unit_price : 0;
            item.subtotal = unitPrice * newQty;

            this._saveToStorage('cart_items', cartItems);

            const cartId = item.cart_id;
            const carts = this._getFromStorage('cart', []);
            const cart = carts.find((c) => c.id === cartId) || null;
            const itemsForCart = cartItems.filter((i) => i.cart_id === cartId);
            const shippingOptions = this._getFromStorage('shipping_options', []);
            const totals = cart
              ? this._calculateCartTotals(cart, itemsForCart, shippingOptions)
              : { subtotal: 0, shipping_cost: 0, total_cost: 0 };

            return {
              cart,
              items: itemsForCart,
              totals
            };
          }

          // 14. removeCartItem
          removeCartItem(cartItemId) {
            let cartItems = this._getFromStorage('cart_items', []);
            const item = cartItems.find((i) => i.id === cartItemId) || null;
            if (!item) {
              return { cart: null, items: [], totals: { subtotal: 0, shipping_cost: 0, total_cost: 0 } };
            }

            cartItems = cartItems.filter((i) => i.id !== cartItemId);
            this._saveToStorage('cart_items', cartItems);

            const cartId = item.cart_id;
            const carts = this._getFromStorage('cart', []);
            const cart = carts.find((c) => c.id === cartId) || null;
            const itemsForCart = cartItems.filter((i) => i.cart_id === cartId);
            const shippingOptions = this._getFromStorage('shipping_options', []);
            const totals = cart
              ? this._calculateCartTotals(cart, itemsForCart, shippingOptions)
              : { subtotal: 0, shipping_cost: 0, total_cost: 0 };

            return {
              cart,
              items: itemsForCart,
              totals
            };
          }

          // 15. selectShippingOption
          selectShippingOption(shipping_option_code) {
            const cart = this._getOrCreateCart();
            const shippingOptions = this._getFromStorage('shipping_options', []);
            const selected = shippingOptions.find((s) => s.code === shipping_option_code) || null;

            cart.selected_shipping_option_code = selected ? selected.code : null;
            cart.updated_at = this._now();

            const carts = this._getFromStorage('cart', []);
            const cartIndex = carts.findIndex((c) => c.id === cart.id);
            if (cartIndex !== -1) {
              carts[cartIndex] = cart;
              this._saveToStorage('cart', carts);
            }

            const cartItems = this._getFromStorage('cart_items', []).filter(
              (i) => i.cart_id === cart.id
            );
            const totals = this._calculateCartTotals(cart, cartItems, shippingOptions);

            return {
              cart,
              selected_shipping_option: selected,
              totals
            };
          }

          // 16. getCheckoutSummary
          getCheckoutSummary() {
            const cart = this._getOrCreateCart();
            const cartItems = this._getFromStorage('cart_items', []).filter(
              (i) => i.cart_id === cart.id
            );
            const products = this._getFromStorage('products', []);
            const variants = this._getFromStorage('product_variants', []);
            const shippingOptions = this._getFromStorage('shipping_options', []);

            const itemsDetailed = cartItems.map((ci) => {
              const product = products.find((p) => p.id === ci.product_id) || null;
              const product_variant = ci.product_variant_id
                ? variants.find((v) => v.id === ci.product_variant_id) || null
                : null;
              return {
                cart_item: ci,
                product,
                product_variant
              };
            });

            const selected_shipping_option = cart.selected_shipping_option_code
              ? shippingOptions.find((s) => s.code === cart.selected_shipping_option_code) || null
              : null;

            const totals = this._calculateCartTotals(cart, cartItems, shippingOptions);

            return {
              cart,
              items: itemsDetailed,
              selected_shipping_option,
              totals
            };
          }

          // 17. submitOrder
          submitOrder(billing_name, billing_email, billing_address, shipping_address) {
            const cart = this._getOrCreateCart();
            const cartItems = this._getFromStorage('cart_items', []).filter(
              (i) => i.cart_id === cart.id
            );
            if (!cartItems.length) {
              return {
                order: null,
                order_items: [],
                confirmation_message: 'Cart is empty.'
              };
            }

            const shippingOptions = this._getFromStorage('shipping_options', []);
            const shippingOption = cart.selected_shipping_option_code
              ? shippingOptions.find((s) => s.code === cart.selected_shipping_option_code) || null
              : null;

            const orders = this._getFromStorage('orders', []);
            const order_items_all = this._getFromStorage('order_items', []);

            const orderId = this._generateId('order');
            const orderItems = cartItems.map((ci) => {
              return {
                id: this._generateId('orderitem'),
                order_id: orderId,
                product_id: ci.product_id,
                product_variant_id: ci.product_variant_id,
                product_name: ci.product_name,
                configuration_name: ci.configuration_name,
                quantity: ci.quantity,
                unit_price: ci.unit_price,
                price_currency: ci.price_currency,
                subtotal: ci.subtotal
              };
            });

            const totals = this._calculateOrderTotals(orderItems, shippingOption);

            const total_items = orderItems.reduce((sum, i) => sum + (i.quantity || 0), 0);

            const order = {
              id: orderId,
              cart_id: cart.id,
              status: 'submitted',
              shipping_option_code: shippingOption ? shippingOption.code : null,
              created_at: this._now(),
              submitted_at: this._now(),
              total_items,
              subtotal: totals.subtotal,
              shipping_cost: totals.shipping_cost,
              total_cost: totals.total_cost,
              billing_name,
              billing_email,
              billing_address,
              shipping_address
            };

            orders.push(order);
            this._saveToStorage('orders', orders);
            this._saveToStorage('order_items', order_items_all.concat(orderItems));

            // Update cart status
            const carts = this._getFromStorage('cart', []);
            const cartIndex = carts.findIndex((c) => c.id === cart.id);
            if (cartIndex !== -1) {
              carts[cartIndex].status = 'converted_to_order';
              carts[cartIndex].updated_at = this._now();
              this._saveToStorage('cart', carts);
            }

            return {
              order,
              order_items: orderItems,
              confirmation_message: 'Order submitted.'
            };
          }

          // 18. getConsultationBookingOptions
          getConsultationBookingOptions() {
            const consultation_topics = [
              { value: 'vaccine_delivery', label: 'Vaccine Delivery' },
              { value: 'lnp_optimization', label: 'Lipid Nanoparticle Optimization' },
              { value: 'regulatory_strategy', label: 'Regulatory Strategy' },
              { value: 'other', label: 'Other' }
            ];

            const delivery_route_options = [
              { value: 'intranasal_nasal_spray', label: 'Intranasal / Nasal Spray' },
              { value: 'intramuscular', label: 'Intramuscular' },
              { value: 'subcutaneous', label: 'Subcutaneous' },
              { value: 'oral_capsule', label: 'Oral / Capsule' },
              { value: 'intravenous', label: 'Intravenous' },
              { value: 'other', label: 'Other' }
            ];

            const development_phase_options = [
              { value: 'discovery_preclinical', label: 'Discovery / Preclinical' },
              { value: 'phase_1_clinical', label: 'Phase 1 Clinical' },
              { value: 'phase_2_clinical', label: 'Phase 2 Clinical' },
              { value: 'phase_3_clinical', label: 'Phase 3 Clinical' },
              { value: 'commercial', label: 'Commercial' }
            ];

            return {
              consultation_topics,
              delivery_route_options,
              development_phase_options,
              default_meeting_type: 'virtual'
            };
          }

          // 19. getAvailableConsultationTimeslots
          getAvailableConsultationTimeslots(start_date, end_date, meeting_type) {
            const timeslots = this._getFromStorage('consultation_timeslots', []);
            const start = new Date(start_date + 'T00:00:00Z');
            const end = new Date(end_date + 'T23:59:59Z');

            return timeslots.filter((ts) => {
              if (!ts || ts.status !== 'available') return false;
              if (meeting_type && ts.meeting_type && ts.meeting_type !== meeting_type) return false;
              const tsStart = new Date(ts.start);
              if (isNaN(tsStart.getTime())) return false;
              return tsStart >= start && tsStart <= end;
            });
          }

          // 20. bookConsultation
          bookConsultation(
            consultation_topic,
            delivery_route,
            development_phase,
            project_title,
            project_description,
            timeslotId,
            contact_name,
            contact_email
          ) {
            const timeslots = this._getFromStorage('consultation_timeslots', []);
            const tsIndex = timeslots.findIndex((ts) => ts.id === timeslotId);
            if (tsIndex === -1) {
              return {
                booking: null,
                timeslot: null,
                confirmation_message: 'Selected timeslot not found.'
              };
            }
            const timeslot = timeslots[tsIndex];
            if (timeslot.status !== 'available') {
              return {
                booking: null,
                timeslot,
                confirmation_message: 'Timeslot is not available.'
              };
            }

            const bookings = this._getFromStorage('consultation_bookings', []);
            const booking = {
              id: this._generateId('consult'),
              consultation_topic: consultation_topic || null,
              delivery_route: delivery_route || null,
              development_phase: development_phase || null,
              project_title: project_title || null,
              project_description: project_description || null,
              timeslot_id: timeslot.id,
              scheduled_start: timeslot.start,
              scheduled_end: timeslot.end,
              contact_name,
              contact_email,
              status: 'requested',
              created_at: this._now()
            };

            bookings.push(booking);
            this._saveToStorage('consultation_bookings', bookings);

            timeslot.status = 'booked';
            timeslots[tsIndex] = timeslot;
            this._saveToStorage('consultation_timeslots', timeslots);

            return {
              booking,
              timeslot,
              confirmation_message: 'Consultation requested.'
            };
          }

          // 21. getCustomFormulationOptions
          getCustomFormulationOptions() {
            const route_of_administration_options = [
              { value: 'intravenous', label: 'Intravenous' },
              { value: 'intramuscular', label: 'Intramuscular' },
              { value: 'subcutaneous', label: 'Subcutaneous' },
              { value: 'intranasal_nasal_spray', label: 'Intranasal / Nasal Spray' },
              { value: 'oral_capsule', label: 'Oral / Capsule' },
              { value: 'other', label: 'Other' }
            ];

            const species_options = [
              { value: 'non_human_primate', label: 'Non-human primate' },
              { value: 'mouse', label: 'Mouse' },
              { value: 'rat', label: 'Rat' },
              { value: 'rabbit', label: 'Rabbit' },
              { value: 'human', label: 'Human' },
              { value: 'other', label: 'Other' }
            ];

            const quality_grade_options = [
              { value: 'gmp', label: 'GMP' },
              { value: 'research_use_only', label: 'Research Use Only' },
              { value: 'gmp_like', label: 'GMP-like' },
              { value: 'other', label: 'Other' }
            ];

            const project_stage_options = [
              { value: 'discovery_preclinical', label: 'Discovery / Preclinical' },
              { value: 'phase_1_clinical', label: 'Phase 1 Clinical' },
              { value: 'phase_2_clinical', label: 'Phase 2 Clinical' },
              { value: 'phase_3_clinical', label: 'Phase 3 Clinical' },
              { value: 'commercial', label: 'Commercial' }
            ];

            return {
              route_of_administration_options,
              species_options,
              quality_grade_options,
              project_stage_options
            };
          }

          // 22. submitCustomFormulationRequest
          submitCustomFormulationRequest(
            route_of_administration,
            species,
            target_dose_volume,
            dose_volume_unit,
            quality_grade,
            requested_timeline,
            project_stage,
            additional_details,
            contact_name,
            contact_email
          ) {
            const requests = this._getFromStorage('custom_formulation_requests', []);
            const now = this._now();
            const request = {
              id: this._generateId('cfr'),
              route_of_administration: route_of_administration || null,
              species: species || null,
              target_dose_volume: target_dose_volume != null ? target_dose_volume : null,
              dose_volume_unit: dose_volume_unit || null,
              quality_grade: quality_grade || null,
              requested_timeline: requested_timeline || null,
              project_stage: project_stage || null,
              additional_details: additional_details || null,
              contact_name,
              contact_email,
              status: 'submitted',
              created_at: now,
              submitted_at: now
            };

            requests.push(request);
            this._saveToStorage('custom_formulation_requests', requests);

            return {
              request,
              confirmation_message: 'Custom formulation request submitted.'
            };
          }

          // 23. addDeviceToComparison
          addDeviceToComparison(productId) {
            const comparison = this._getOrCreateDeviceComparison();
            if (!comparison.device_ids.includes(productId)) {
              comparison.device_ids.push(productId);
              comparison.updated_at = this._now();
              const comparisons = this._getFromStorage('device_comparisons', []);
              const idx = comparisons.findIndex((c) => c.id === comparison.id);
              if (idx !== -1) {
                comparisons[idx] = comparison;
                this._saveToStorage('device_comparisons', comparisons);
              }
            }
            return {
              comparison,
              device_ids: comparison.device_ids
            };
          }

          // 24. removeDeviceFromComparison
          removeDeviceFromComparison(productId) {
            const comparison = this._getOrCreateDeviceComparison();
            comparison.device_ids = comparison.device_ids.filter((id) => id !== productId);
            comparison.updated_at = this._now();
            const comparisons = this._getFromStorage('device_comparisons', []);
            const idx = comparisons.findIndex((c) => c.id === comparison.id);
            if (idx !== -1) {
              comparisons[idx] = comparison;
              this._saveToStorage('device_comparisons', comparisons);
            }
            return {
              comparison,
              device_ids: comparison.device_ids
            };
          }

          // 25. getDeviceComparison
          getDeviceComparison() {
            const comparison = this._getOrCreateDeviceComparison();
            const products = this._getFromStorage('products', []);

            const devices = comparison.device_ids
              .map((id) => products.find((p) => p.id === id) || null)
              .filter((p) => !!p)
              .map((product) => {
                let dose_range_display = '';
                if (
                  typeof product.min_dose_ml === 'number' &&
                  typeof product.max_dose_ml === 'number'
                ) {
                  dose_range_display = `${product.min_dose_ml}–${product.max_dose_ml} mL`;
                }

                let needle_gauge_display = '';
                if (
                  typeof product.min_needle_gauge === 'number' &&
                  typeof product.max_needle_gauge === 'number'
                ) {
                  needle_gauge_display = `${product.min_needle_gauge}G–${product.max_needle_gauge}G`;
                }

                const indications = Array.isArray(product.indications)
                  ? product.indications
                  : product.primary_indication
                  ? [product.primary_indication]
                  : [];

                const indications_display = indications
                  .map((ind) => this._mapIndicationLabel(ind))
                  .filter(Boolean)
                  .join(', ');

                return {
                  product,
                  dose_range_display,
                  needle_gauge_display,
                  route_label: this._mapRouteLabel(product.route_of_administration),
                  indications_display
                };
              });

            return {
              comparison,
              devices
            };
          }

          // 26. saveItem
          saveItem(item_type, itemId, notes) {
            const allowedTypes = ['product', 'resource'];
            if (!allowedTypes.includes(item_type)) {
              return {
                saved_item: null,
                all_saved_items: this._getSavedItemsContainer()
              };
            }

            let savedItems = this._getSavedItemsContainer();
            const existing = savedItems.find(
              (si) => si.item_type === item_type && si.item_id === itemId
            );
            if (existing) {
              if (notes !== undefined) {
                existing.notes = notes;
                this._saveToStorage('saved_items', savedItems);
              }
              return {
                saved_item: existing,
                all_saved_items: savedItems
              };
            }

            const saved_item = {
              id: this._generateId('saved'),
              item_type,
              item_id: itemId,
              saved_at: this._now(),
              notes: notes || null
            };

            savedItems.push(saved_item);
            this._saveToStorage('saved_items', savedItems);

            return {
              saved_item,
              all_saved_items: savedItems
            };
          }

          // 27. getSavedItems
          getSavedItems() {
            const savedItems = this._getSavedItemsContainer();
            const products = this._getFromStorage('products', []);
            const resources = this._getFromStorage('resources', []);

            const savedProducts = savedItems
              .filter((si) => si.item_type === 'product')
              .map((si) => {
                const product = products.find((p) => p.id === si.item_id) || null;
                return {
                  saved_item: si,
                  product
                };
              });

            const savedResources = savedItems
              .filter((si) => si.item_type === 'resource')
              .map((si) => {
                const resource = resources.find((r) => r.id === si.item_id) || null;
                return {
                  saved_item: si,
                  resource
                };
              });

            return {
              products: savedProducts,
              resources: savedResources
            };
          }

          // 28. removeSavedItem
          removeSavedItem(savedItemId) {
            let savedItems = this._getSavedItemsContainer();
            savedItems = savedItems.filter((si) => si.id !== savedItemId);
            this._saveToStorage('saved_items', savedItems);
            return savedItems;
          }

          // 29. listEvents
          listEvents(search_term, topic_tags, event_type, month, upcoming_only) {
            const events = this._getFromStorage('events', []);
            const now = Date.now();

            let filtered = events.slice();

            if (search_term) {
              const term = String(search_term).toLowerCase();
              filtered = filtered.filter((e) => {
                const title = (e.title || '').toLowerCase();
                const desc = (e.description || '').toLowerCase();
                return title.includes(term) || desc.includes(term);
              });
            }

            if (topic_tags && topic_tags.length) {
              filtered = filtered.filter((e) => {
                const tags = Array.isArray(e.topic_tags) ? e.topic_tags : [];
                const tagSet = new Set(tags);
                return topic_tags.some((t) => tagSet.has(t));
              });
            }

            if (event_type) {
              filtered = filtered.filter((e) => e.event_type === event_type);
            }

            if (month) {
              const [yearStr, monthStr] = month.split('-');
              const year = parseInt(yearStr, 10);
              const m = parseInt(monthStr, 10) - 1;
              filtered = filtered.filter((e) => {
                const d = new Date(e.start_datetime);
                return !isNaN(d.getTime()) && d.getFullYear() === year && d.getMonth() === m;
              });
            }

            const upcomingFlag = upcoming_only !== undefined ? upcoming_only : true;
            if (upcomingFlag) {
              filtered = filtered.filter((e) => {
                if (typeof e.is_upcoming === 'boolean') return e.is_upcoming;
                const d = new Date(e.start_datetime);
                return !isNaN(d.getTime()) && d.getTime() >= now;
              });
            }

            return filtered;
          }

          // 30. getEventDetails
          getEventDetails(eventId) {
            const events = this._getFromStorage('events', []);
            const event = events.find((e) => e.id === eventId) || null;
            if (!event) {
              return {
                event: null,
                business_hours_flag: false,
                business_hours_display: 'Event not found.'
              };
            }

            const { flag, display } = this._validateBusinessHoursForEvent(event);

            return {
              event,
              business_hours_flag: flag,
              business_hours_display: display
            };
          }

          // 31. registerForEvent
          registerForEvent(eventId, attendee_name, attendee_email, area_of_interest) {
            const events = this._getFromStorage('events', []);
            const event = events.find((e) => e.id === eventId) || null;
            if (!event) {
              return {
                registration: null,
                event: null,
                confirmation_message: 'Event not found.'
              };
            }

            if (event.registration_open === false) {
              return {
                registration: null,
                event,
                confirmation_message: 'Registration is closed.'
              };
            }

            const registrations = this._getFromStorage('event_registrations', []);
            const registration = {
              id: this._generateId('eventreg'),
              event_id: event.id,
              attendee_name,
              attendee_email,
              area_of_interest: area_of_interest || null,
              status: 'registered',
              registered_at: this._now()
            };

            registrations.push(registration);
            this._saveToStorage('event_registrations', registrations);

            return {
              registration,
              event,
              confirmation_message: 'Successfully registered for event.'
            };
          }

          // 32. getResourceFilters
          getResourceFilters() {
            const resources = this._getFromStorage('resources', []);

            const unique = (arr) => Array.from(new Set(arr.filter((x) => x !== null && x !== undefined)));

            const typeValues = unique(resources.map((r) => r.resource_type));
            const deliveryValues = unique(resources.map((r) => r.delivery_route));
            const indicationValues = unique(resources.map((r) => r.indication));

            const resource_type_options = typeValues.map((v) => ({
              value: v,
              label: this._mapResourceTypeLabel(v)
            }));

            const delivery_route_options = deliveryValues.map((v) => ({
              value: v,
              label: this._mapDeliveryRouteResourceLabel(v)
            }));

            const indication_options = indicationValues.map((v) => ({
              value: v,
              label: this._mapIndicationLabel(v)
            }));

            const tagSet = new Set();
            resources.forEach((r) => {
              if (Array.isArray(r.tags)) {
                r.tags.forEach((t) => tagSet.add(t));
              }
            });

            const tag_suggestions = Array.from(tagSet);

            return {
              resource_type_options,
              delivery_route_options,
              indication_options,
              tag_suggestions
            };
          }

          // 33. listResources
          listResources(search_term, resource_type, delivery_route, indication, tags, highlights_mucosal_immunity) {
            const resources = this._getFromStorage('resources', []);
            let filtered = resources.slice();

            if (search_term) {
              const term = String(search_term).toLowerCase();
              filtered = filtered.filter((r) => {
                const title = (r.title || '').toLowerCase();
                const summary = (r.summary || '').toLowerCase();
                const content = (r.content || '').toLowerCase();
                return title.includes(term) || summary.includes(term) || content.includes(term);
              });
            }

            if (resource_type) {
              filtered = filtered.filter((r) => r.resource_type === resource_type);
            }

            if (delivery_route) {
              filtered = filtered.filter((r) => r.delivery_route === delivery_route);
            }

            if (indication) {
              filtered = filtered.filter((r) => r.indication === indication);
            }

            if (tags && tags.length) {
              filtered = filtered.filter((r) => {
                const rTags = Array.isArray(r.tags) ? r.tags : [];
                const rSet = new Set(rTags);
                return tags.some((t) => rSet.has(t));
              });
            }

            if (highlights_mucosal_immunity != null) {
              filtered = filtered.filter(
                (r) => r.highlights_mucosal_immunity === highlights_mucosal_immunity
              );
            }

            return filtered;
          }

          // 34. getResourceDetails
          getResourceDetails(resourceId) {
            const resources = this._getFromStorage('resources', []);
            const resource = resources.find((r) => r.id === resourceId) || null;
            if (!resource) {
              return {
                resource: null,
                delivery_route_label: '',
                indication_label: '',
                highlights_mucosal_immunity: false,
                is_saved: false
              };
            }

            const savedItems = this._getSavedItemsContainer();
            const is_saved = !!savedItems.find(
              (si) => si.item_type === 'resource' && si.item_id === resource.id
            );

            return {
              resource,
              delivery_route_label: this._mapDeliveryRouteResourceLabel(resource.delivery_route),
              indication_label: this._mapIndicationLabel(resource.indication),
              highlights_mucosal_immunity: !!resource.highlights_mucosal_immunity,
              is_saved
            };
          }

          // 35. submitContactForm
          submitContactForm(name, email, subject, message, topic) {
            const forms = this._getFromStorage('contact_forms', []);
            const entry = {
              id: this._generateId('contact'),
              name,
              email,
              subject: subject || null,
              message,
              topic: topic || null,
              created_at: this._now()
            };
            forms.push(entry);
            this._saveToStorage('contact_forms', forms);

            return {
              success: true,
              confirmation_message: 'Your message has been received.'
            };
          }

          // 36. getAboutContent
          getAboutContent() {
            const content = this._getFromStorage('about_content', {});
            return {
              mission_statement: content.mission_statement || '',
              expertise_overview: content.expertise_overview || '',
              quality_and_gmp_summary: content.quality_and_gmp_summary || '',
              leadership_bios: Array.isArray(content.leadership_bios)
                ? content.leadership_bios
                : [],
              facility_overview: content.facility_overview || '',
              key_action_links: Array.isArray(content.key_action_links)
                ? content.key_action_links
                : [],
              compliance_summary: content.compliance_summary || ''
            };
          }

          // 37. getLegalContent
          getLegalContent() {
            const content = this._getFromStorage('legal_content', {});
            return {
              privacy_policy_html: content.privacy_policy_html || '',
              cookie_policy_html: content.cookie_policy_html || '',
              terms_of_use_html: content.terms_of_use_html || '',
              data_protection_contact: content.data_protection_contact || ''
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
