        // localStorage polyfill for Node.js and environments without localStorage
        const localStorage = (function () {
          try {
            if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
              return globalThis.localStorage;
            }
          } catch (e) {}
          // Simple in-memory polyfill
          let store = {};
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

          // -------------------- Core storage helpers --------------------

          _initStorage() {
            const keys = [
              'users',
              'products',
              'product_variants',
              'categories',
              'addons',
              'delivery_time_slots',
              'cart',
              'cart_items',
              'promo_codes',
              'orders',
              'order_items',
              'subscription_plans',
              'subscription_variants',
              'subscriptions',
              'static_pages',
              'support_tickets'
            ];

            for (const key of keys) {
              if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify([]));
              }
            }

            if (!localStorage.getItem('idCounter')) {
              localStorage.setItem('idCounter', '1000');
            }
          }

          _getFromStorage(key, defaultValue) {
            const data = localStorage.getItem(key);
            if (!data) return defaultValue !== undefined ? defaultValue : [];
            try {
              return JSON.parse(data);
            } catch (e) {
              return defaultValue !== undefined ? defaultValue : [];
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

          _nowIso() {
            return new Date().toISOString();
          }

          _todayDateOnly() {
            return new Date().toISOString().slice(0, 10); // 'yyyy-mm-dd'
          }

          _parseDateOnly(dateStr) {
            // dateStr expected 'yyyy-mm-dd'
            if (!dateStr) return null;
            const parts = dateStr.split('-').map((p) => parseInt(p, 10));
            if (parts.length !== 3 || parts.some((n) => isNaN(n))) return null;
            return new Date(parts[0], parts[1] - 1, parts[2]);
          }

          // -------------------- Entity lookup helpers --------------------

          _findProductById(productId) {
            const products = this._getFromStorage('products', []);
            return products.find((p) => p.id === productId) || null;
          }

          _findCategoryById(categoryId) {
            const categories = this._getFromStorage('categories', []);
            return categories.find((c) => c.id === categoryId) || null;
          }

          _findProductVariants(productId) {
            const variants = this._getFromStorage('product_variants', []);
            return variants.filter((v) => v.product_id === productId);
          }

          _findVariantById(variantId) {
            if (!variantId) return null;
            const variants = this._getFromStorage('product_variants', []);
            return variants.find((v) => v.id === variantId) || null;
          }

          _findAddonById(addonId) {
            const addons = this._getFromStorage('addons', []);
            return addons.find((a) => a.id === addonId) || null;
          }

          _findDeliveryTimeSlotById(timeSlotId) {
            if (!timeSlotId) return null;
            const slots = this._getFromStorage('delivery_time_slots', []);
            return slots.find((s) => s.id === timeSlotId) || null;
          }

          _findPromoByCode(promoCode) {
            if (!promoCode) return null;
            const codes = this._getFromStorage('promo_codes', []);
            const codeLower = String(promoCode).toLowerCase();
            return (
              codes.find((p) => typeof p.code === 'string' && p.code.toLowerCase() === codeLower) || null
            );
          }

          _findSubscriptionPlanById(planId) {
            const plans = this._getFromStorage('subscription_plans', []);
            return plans.find((p) => p.id === planId) || null;
          }

          _findSubscriptionVariantById(variantId) {
            if (!variantId) return null;
            const variants = this._getFromStorage('subscription_variants', []);
            return variants.find((v) => v.id === variantId) || null;
          }

          // -------------------- Cart helpers --------------------

          _getOrCreateCart() {
            let carts = this._getFromStorage('cart', []); // array of Cart objects
            if (!Array.isArray(carts)) carts = [];

            let cart = carts[0] || null;

            if (!cart) {
              cart = {
                id: this._generateId('cart'),
                items: [], // array of CartItem ids
                created_at: this._nowIso(),
                updated_at: this._nowIso(),
                subtotal: 0,
                discount_total: 0,
                shipping_total: 0,
                tax_total: 0,
                total: 0,
                applied_promo_code_id: null
              };
              carts.push(cart);
              this._saveToStorage('cart', carts);
            }

            return cart;
          }

          _getCartItems(cartId) {
            const cartItems = this._getFromStorage('cart_items', []);
            return cartItems.filter((ci) => ci.cart_id === cartId);
          }

          _getCartItemCount(cartId) {
            const items = this._getCartItems(cartId);
            return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
          }

          _recalculateCartTotals(cart) {
            if (!cart) return null;

            const carts = this._getFromStorage('cart', []);
            const cartItems = this._getFromStorage('cart_items', []);
            const addons = this._getFromStorage('addons', []);

            const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

            let subtotal = 0;

            for (const item of itemsForCart) {
              const addonPricesPerUnit = (item.addon_ids || []).reduce((sum, addonId) => {
                const addon = addons.find((a) => a.id === addonId && a.is_active);
                return sum + (addon ? addon.price || 0 : 0);
              }, 0);

              const unitPrice = item.unit_price || 0;
              const quantity = item.quantity || 0;
              const lineSubtotal = (unitPrice + addonPricesPerUnit) * quantity;

              item.line_subtotal = lineSubtotal;
              subtotal += lineSubtotal;
            }

            cart.items = itemsForCart.map((ci) => ci.id);
            cart.subtotal = subtotal;
            // For this implementation, cart-level discounts, shipping, and tax are kept at 0.
            cart.discount_total = cart.discount_total || 0;
            cart.shipping_total = cart.shipping_total || 0;
            cart.tax_total = cart.tax_total || 0;
            cart.total = cart.subtotal - cart.discount_total + cart.shipping_total + cart.tax_total;
            cart.updated_at = this._nowIso();

            // Persist updates
            this._saveToStorage('cart_items', cartItems);

            const updatedCarts = carts.map((c) => (c.id === cart.id ? cart : c));
            this._saveToStorage('cart', updatedCarts);

            return cart;
          }

          // -------------------- Order helpers --------------------

          _getCurrentDraftOrder() {
            const cart = this._getOrCreateCart();
            let orders = this._getFromStorage('orders', []);
            if (!Array.isArray(orders)) orders = [];

            let order = orders.find(
              (o) => o.cart_id === cart.id && (o.status === 'draft' || o.status === 'pending_payment')
            );

            const orderItemsAll = this._getFromStorage('order_items', []);

            if (!order) {
              // Create new draft order from current cart
              const cartItems = this._getCartItems(cart.id);
              let subtotal = 0;
              const newOrderItemIds = [];

              for (const ci of cartItems) {
                const orderItemId = this._generateId('order_item');
                const orderItem = {
                  id: orderItemId,
                  order_id: null, // temporarily null, set after order id known
                  product_id: ci.product_id,
                  product_name: ci.product_name,
                  variant_id: ci.variant_id || null,
                  variant_name: ci.variant_name || null,
                  quantity: ci.quantity,
                  unit_price: ci.unit_price,
                  line_subtotal: ci.line_subtotal,
                  addon_ids: ci.addon_ids || [],
                  gift_message: ci.gift_message || null,
                  delivery_zip: ci.delivery_zip || null,
                  delivery_date: ci.delivery_date || null,
                  delivery_time_slot_id: ci.delivery_time_slot_id || null
                };
                subtotal += ci.line_subtotal || 0;
                orderItemsAll.push(orderItem);
                newOrderItemIds.push(orderItemId);
              }

              order = {
                id: this._generateId('order'),
                cart_id: cart.id,
                status: 'draft',
                created_at: this._nowIso(),
                updated_at: this._nowIso(),
                item_ids: newOrderItemIds,
                subtotal: subtotal,
                discount_total: 0,
                shipping_total: 0,
                tax_total: 0,
                total: subtotal,
                promo_code_id: null,
                promo_code_code: null,
                contact_name: '',
                contact_email: '',
                contact_phone: '',
                shipping_address_line1: '',
                shipping_address_line2: '',
                shipping_city: '',
                shipping_state: '',
                shipping_postal_code: '',
                shipping_country: ''
              };

              // Update order_id on order items
              for (const oi of orderItemsAll) {
                if (newOrderItemIds.includes(oi.id)) {
                  oi.order_id = order.id;
                }
              }

              orders.push(order);
              this._saveToStorage('order_items', orderItemsAll);
              this._saveToStorage('orders', orders);
            }

            return order;
          }

          _applyPromoCodeIfValid(order, promo, contextType) {
            // contextType: 'order' | 'subscription'
            if (!order || !promo) {
              return { valid: false, message: 'Invalid order or promo code.' };
            }

            if (!promo.is_active) {
              return { valid: false, message: 'Promo code is not active.' };
            }

            if (
              promo.applicable_to !== 'both' &&
              promo.applicable_to !== (contextType === 'order' ? 'order' : 'subscription')
            ) {
              return { valid: false, message: 'Promo code not applicable to this type.' };
            }

            const now = new Date();
            if (promo.start_at) {
              const start = new Date(promo.start_at);
              if (now < start) {
                return { valid: false, message: 'Promo code is not yet valid.' };
              }
            }
            if (promo.end_at) {
              const end = new Date(promo.end_at);
              if (now > end) {
                return { valid: false, message: 'Promo code has expired.' };
              }
            }

            const subtotal = order.subtotal || 0;
            if (promo.min_subtotal && subtotal < promo.min_subtotal) {
              return { valid: false, message: 'Order does not meet minimum subtotal for this promo.' };
            }

            let discountTotal = 0;
            let shippingTotal = order.shipping_total || 0;

            if (promo.discount_type === 'percentage') {
              discountTotal = (subtotal * (promo.discount_value || 0)) / 100;
            } else if (promo.discount_type === 'fixed_amount') {
              discountTotal = Math.min(promo.discount_value || 0, subtotal);
            } else if (promo.discount_type === 'free_shipping') {
              discountTotal = order.shipping_total || 0;
              shippingTotal = 0;
            }

            return {
              valid: true,
              message: 'Promo code applied.',
              discount_total: discountTotal,
              shipping_total: shippingTotal
            };
          }

          // -------------------- Subscription helpers --------------------

          _getOrCreateSubscriptionConfig(planId) {
            let subs = this._getFromStorage('subscriptions', []);
            if (!Array.isArray(subs)) subs = [];

            let sub = subs.find((s) => s.plan_id === planId && s.status === 'configuring');
            const plan = this._findSubscriptionPlanById(planId);
            if (!plan) return null;

            const variants = this._getFromStorage('subscription_variants', []).filter(
              (v) => v.plan_id === planId && v.is_active
            );

            const defaultVariant = variants[0] || null;

            if (!sub) {
              const frequency = 'every_week';
              const deliveriesCount = 4;
              const pricePerDelivery = defaultVariant ? defaultVariant.price_per_delivery || 0 : 0;
              const totalPrice = pricePerDelivery * deliveriesCount;

              sub = {
                id: this._generateId('subscription'),
                plan_id: planId,
                variant_id: defaultVariant ? defaultVariant.id : null,
                frequency: frequency,
                deliveries_count: deliveriesCount,
                price_per_delivery: pricePerDelivery,
                total_price: totalPrice,
                delivery_zip: '',
                delivery_day_of_week: 'friday',
                start_date: null,
                status: 'configuring',
                created_at: this._nowIso(),
                updated_at: this._nowIso(),
                contact_name: '',
                contact_email: '',
                contact_phone: '',
                shipping_address_line1: '',
                shipping_address_line2: '',
                shipping_city: '',
                shipping_state: '',
                shipping_postal_code: '',
                shipping_country: ''
              };

              subs.push(sub);
              this._saveToStorage('subscriptions', subs);
            }

            return sub;
          }

          _selectEarliestSameDaySlot(productId, deliveryZip, deliveryDate) {
            // For this implementation, selection is based solely on DeliveryTimeSlot.sort_order
            const slots = this._getFromStorage('delivery_time_slots', []);
            const sameDaySlots = slots.filter((s) => s.is_same_day);
            sameDaySlots.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            return sameDaySlots.length > 0 ? sameDaySlots[0].id : null;
          }

          // -------------------- Public Interfaces --------------------

          // 1. getHomePageData()
          getHomePageData() {
            const products = this._getFromStorage('products', []);
            const categories = this._getFromStorage('categories', []);
            const promoCodes = this._getFromStorage('promo_codes', []);

            // search_suggestions from product tags and names
            const suggestionSet = new Set();
            for (const p of products) {
              if (Array.isArray(p.tags)) {
                for (const t of p.tags) {
                  if (typeof t === 'string' && t.trim()) suggestionSet.add(t.trim());
                }
              }
              if (p.name) suggestionSet.add(p.name);
            }
            const search_suggestions = Array.from(suggestionSet).slice(0, 20);

            // featured_categories: top-level or occasion-related
            const featured_categories = categories.map((c) => ({
              category_id: c.id,
              category_name: c.name,
              category_description: c.description || ''
            }));

            // featured_products: pick top-rated products
            const productsWithRating = products.slice().sort((a, b) => {
              const ra = a.rating_average || 0;
              const rb = b.rating_average || 0;
              if (rb !== ra) return rb - ra;
              const rc = (b.rating_count || 0) - (a.rating_count || 0);
              return rc;
            });

            const featured_products = productsWithRating.slice(0, 12).map((p) => {
              const category = categories.find((c) => c.id === p.category_id) || null;
              const badgeLabels = [];
              if (p.rating_count && p.rating_count > 50) badgeLabels.push('bestseller');
              if (p.category_id === 'mothers_day') badgeLabels.push('mothers_day');
              if (p.category_id === 'valentines_day') badgeLabels.push('valentines_day');

              return {
                product_id: p.id,
                product_name: p.name,
                product_slug: p.slug || '',
                image_url: p.image_url || '',
                base_price: p.base_price || 0,
                rating_average: p.rating_average || 0,
                rating_count: p.rating_count || 0,
                category_id: p.category_id,
                category_name: category ? category.name : '',
                product_type: p.product_type,
                is_same_day_eligible: !!p.is_same_day_eligible,
                has_free_shipping: !!p.has_free_shipping,
                badge_labels: badgeLabels
              };
            });

            const featured_promotions = promoCodes
              .filter((pc) => pc.is_active)
              .map((pc) => ({
                promo_code: pc.code,
                title: pc.code,
                description: pc.description || '',
                discount_type: pc.discount_type,
                discount_value: pc.discount_value || 0,
                min_subtotal: pc.min_subtotal || 0
              }));

            const cart = this._getOrCreateCart();
            const item_count = this._getCartItemCount(cart.id);
            const hasAppliedPromo = !!cart.applied_promo_code_id;

            const cart_summary = {
              item_count: item_count,
              subtotal: cart.subtotal || 0,
              has_applied_promo: hasAppliedPromo
            };

            return {
              search_suggestions,
              featured_categories,
              featured_products,
              featured_promotions,
              cart_summary
            };
          }

          // 2. getCategoriesForNavigation()
          getCategoriesForNavigation() {
            const categories = this._getFromStorage('categories', []);
            return categories.map((c) => ({
              category_id: c.id,
              category_name: c.name,
              parent_id: c.parent_id || null,
              is_featured: !c.parent_id || c.parent_id === 'occasions'
            }));
          }

          // 3. getProductFilterOptions(context_type, categoryId, searchQuery)
          getProductFilterOptions(context_type, categoryId, searchQuery) {
            const products = this._getFromStorage('products', []);

            let candidates = products;

            if (context_type === 'category' && categoryId) {
              candidates = candidates.filter((p) => p.category_id === categoryId);
            } else if (context_type === 'search' && searchQuery) {
              const q = searchQuery.toLowerCase();
              candidates = candidates.filter((p) => {
                const nameMatch = (p.name || '').toLowerCase().includes(q);
                const descMatch = (p.description || '').toLowerCase().includes(q);
                const tagMatch = Array.isArray(p.tags)
                  ? p.tags.some((t) => (t || '').toLowerCase().includes(q))
                  : false;
                return nameMatch || descMatch || tagMatch;
              });
            }

            if (candidates.length === 0) {
              return {
                price: { min: 0, max: 0, step: 1 },
                rating_thresholds: [
                  { value: 4.5, label: '4.5 stars & up' },
                  { value: 4, label: '4 stars & up' }
                ],
                flower_types: [],
                delivery_options: [{ code: 'same_day', label: 'Same-Day Delivery' }],
                shipping_options: [{ code: 'free_shipping', label: 'Free Shipping' }],
                sort_options: [
                  { code: 'price_low_to_high', label: 'Price: Low to High' },
                  { code: 'price_high_to_low', label: 'Price: High to Low' },
                  { code: 'best_selling', label: 'Best Selling' },
                  { code: 'rating_high_to_low', label: 'Customer Rating: High to Low' }
                ]
              };
            }

            let minPrice = Infinity;
            let maxPrice = -Infinity;
            const flowerSet = new Set();
            let hasSameDay = false;
            let hasFreeShipping = false;

            for (const p of candidates) {
              const price = p.base_price || 0;
              if (price < minPrice) minPrice = price;
              if (price > maxPrice) maxPrice = price;

              if (Array.isArray(p.flower_types)) {
                for (const f of p.flower_types) {
                  if (typeof f === 'string' && f.trim()) flowerSet.add(f.trim());
                }
              }

              if (p.is_same_day_eligible) hasSameDay = true;
              if (p.has_free_shipping) hasFreeShipping = true;
            }

            if (!isFinite(minPrice)) minPrice = 0;
            if (!isFinite(maxPrice)) maxPrice = 0;

            const priceRange = {
              min: Math.floor(minPrice),
              max: Math.ceil(maxPrice),
              step: 5
            };

            const rating_thresholds = [
              { value: 4.5, label: '4.5 stars & up' },
              { value: 4, label: '4 stars & up' },
              { value: 3, label: '3 stars & up' }
            ];

            const delivery_options = hasSameDay
              ? [{ code: 'same_day', label: 'Same-Day Delivery' }]
              : [];

            const shipping_options = hasFreeShipping
              ? [{ code: 'free_shipping', label: 'Free Shipping' }]
              : [];

            const sort_options = [
              { code: 'price_low_to_high', label: 'Price: Low to High' },
              { code: 'price_high_to_low', label: 'Price: High to Low' },
              { code: 'best_selling', label: 'Best Selling' },
              { code: 'rating_high_to_low', label: 'Customer Rating: High to Low' }
            ];

            return {
              price: priceRange,
              rating_thresholds,
              flower_types: Array.from(flowerSet),
              delivery_options,
              shipping_options,
              sort_options
            };
          }

          // 4. listCategoryProducts(categoryId, filters, sort, page, page_size)
          listCategoryProducts(categoryId, filters, sort, page, page_size) {
            const products = this._getFromStorage('products', []);
            const categories = this._getFromStorage('categories', []);

            let filtered = products.filter((p) => p.category_id === categoryId);

            filters = filters || {};
            sort = sort || null;
            page = page || 1;
            page_size = page_size || 20;

            if (filters.min_price != null) {
              filtered = filtered.filter((p) => (p.base_price || 0) >= filters.min_price);
            }
            if (filters.max_price != null) {
              filtered = filtered.filter((p) => (p.base_price || 0) <= filters.max_price);
            }
            if (filters.min_rating != null) {
              filtered = filtered.filter((p) => (p.rating_average || 0) >= filters.min_rating);
            }
            if (filters.flower_types && filters.flower_types.length > 0) {
              const ft = filters.flower_types.map((x) => String(x).toLowerCase());
              filtered = filtered.filter((p) => {
                const types = Array.isArray(p.flower_types) ? p.flower_types : [];
                return types.some((t) => ft.includes(String(t).toLowerCase()));
              });
            }
            if (filters.delivery_option_codes && filters.delivery_option_codes.length > 0) {
              const includesSameDay = filters.delivery_option_codes.includes('same_day');
              if (includesSameDay) {
                filtered = filtered.filter((p) => !!p.is_same_day_eligible);
              }
            }
            if (filters.shipping_option_codes && filters.shipping_option_codes.length > 0) {
              const includesFreeShipping = filters.shipping_option_codes.includes('free_shipping');
              if (includesFreeShipping) {
                filtered = filtered.filter((p) => !!p.has_free_shipping);
              }
            }
            if (filters.search_keyword) {
              const q = filters.search_keyword.toLowerCase();
              filtered = filtered.filter((p) => {
                const nameMatch = (p.name || '').toLowerCase().includes(q);
                const descMatch = (p.description || '').toLowerCase().includes(q);
                const tagMatch = Array.isArray(p.tags)
                  ? p.tags.some((t) => (t || '').toLowerCase().includes(q))
                  : false;
                return nameMatch || descMatch || tagMatch;
              });
            }

            // Sorting
            if (sort === 'price_low_to_high') {
              filtered.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
            } else if (sort === 'price_high_to_low') {
              filtered.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
            } else if (sort === 'rating_high_to_low') {
              filtered.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
            } else if (sort === 'best_selling') {
              filtered.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
            }

            const total_results = filtered.length;
            const start = (page - 1) * page_size;
            const end = start + page_size;
            const pageItems = filtered.slice(start, end);

            const resultProducts = pageItems.map((p) => {
              const category = categories.find((c) => c.id === p.category_id) || null;

              return {
                product_id: p.id,
                product_name: p.name,
                product_slug: p.slug || '',
                short_description: p.description || '',
                image_url: p.image_url || '',
                base_price: p.base_price || 0,
                rating_average: p.rating_average || 0,
                rating_count: p.rating_count || 0,
                category_id: p.category_id,
                category_name: category ? category.name : '',
                product_type: p.product_type,
                flower_types: Array.isArray(p.flower_types) ? p.flower_types : [],
                is_same_day_eligible: !!p.is_same_day_eligible,
                has_free_shipping: !!p.has_free_shipping,
                // Foreign key resolution
                category: category
              };
            });

            const applied_filters = {
              min_price: filters.min_price != null ? filters.min_price : undefined,
              max_price: filters.max_price != null ? filters.max_price : undefined,
              min_rating: filters.min_rating != null ? filters.min_rating : undefined,
              flower_types: filters.flower_types || [],
              delivery_option_codes: filters.delivery_option_codes || [],
              shipping_option_codes: filters.shipping_option_codes || [],
              search_keyword: filters.search_keyword || '',
              sort: sort || ''
            };

            return {
              products: resultProducts,
              total_results,
              page,
              page_size,
              applied_filters
            };
          }

          // 5. searchProducts(query, filters, sort, page, page_size)
          searchProducts(query, filters, sort, page, page_size) {
            const products = this._getFromStorage('products', []);
            const categories = this._getFromStorage('categories', []);

            const q = (query || '').toLowerCase();
            let filtered = products.filter((p) => {
              if (!q) return true;
              const nameMatch = (p.name || '').toLowerCase().includes(q);
              const descMatch = (p.description || '').toLowerCase().includes(q);
              const tagMatch = Array.isArray(p.tags)
                ? p.tags.some((t) => (t || '').toLowerCase().includes(q))
                : false;
              return nameMatch || descMatch || tagMatch;
            });

            filters = filters || {};
            sort = sort || null;
            page = page || 1;
            page_size = page_size || 20;

            if (filters.min_price != null) {
              filtered = filtered.filter((p) => (p.base_price || 0) >= filters.min_price);
            }
            if (filters.max_price != null) {
              filtered = filtered.filter((p) => (p.base_price || 0) <= filters.max_price);
            }
            if (filters.min_rating != null) {
              filtered = filtered.filter((p) => (p.rating_average || 0) >= filters.min_rating);
            }
            if (filters.flower_types && filters.flower_types.length > 0) {
              const ft = filters.flower_types.map((x) => String(x).toLowerCase());
              filtered = filtered.filter((p) => {
                const types = Array.isArray(p.flower_types) ? p.flower_types : [];
                return types.some((t) => ft.includes(String(t).toLowerCase()));
              });
            }
            if (filters.delivery_option_codes && filters.delivery_option_codes.length > 0) {
              const includesSameDay = filters.delivery_option_codes.includes('same_day');
              if (includesSameDay) {
                filtered = filtered.filter((p) => !!p.is_same_day_eligible);
              }
            }
            if (filters.shipping_option_codes && filters.shipping_option_codes.length > 0) {
              const includesFreeShipping = filters.shipping_option_codes.includes('free_shipping');
              if (includesFreeShipping) {
                filtered = filtered.filter((p) => !!p.has_free_shipping);
              }
            }

            // Sorting
            if (sort === 'price_low_to_high') {
              filtered.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
            } else if (sort === 'price_high_to_low') {
              filtered.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
            } else if (sort === 'rating_high_to_low') {
              filtered.sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0));
            } else if (sort === 'best_selling') {
              filtered.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
            }

            const total_results = filtered.length;
            const start = (page - 1) * page_size;
            const end = start + page_size;
            const pageItems = filtered.slice(start, end);

            const resultProducts = pageItems.map((p) => {
              const category = categories.find((c) => c.id === p.category_id) || null;

              return {
                product_id: p.id,
                product_name: p.name,
                product_slug: p.slug || '',
                short_description: p.description || '',
                image_url: p.image_url || '',
                base_price: p.base_price || 0,
                rating_average: p.rating_average || 0,
                rating_count: p.rating_count || 0,
                category_id: p.category_id,
                category_name: category ? category.name : '',
                product_type: p.product_type,
                flower_types: Array.isArray(p.flower_types) ? p.flower_types : [],
                is_same_day_eligible: !!p.is_same_day_eligible,
                has_free_shipping: !!p.has_free_shipping,
                // Foreign key resolution
                category: category
              };
            });

            const applied_filters = {
              min_price: filters.min_price != null ? filters.min_price : undefined,
              max_price: filters.max_price != null ? filters.max_price : undefined,
              min_rating: filters.min_rating != null ? filters.min_rating : undefined,
              flower_types: filters.flower_types || [],
              delivery_option_codes: filters.delivery_option_codes || [],
              shipping_option_codes: filters.shipping_option_codes || [],
              sort: sort || ''
            };

            return {
              products: resultProducts,
              total_results,
              page,
              page_size,
              applied_filters
            };
          }

          // 6. getProductDetails(productId)
          getProductDetails(productId) {
            const product = this._findProductById(productId);
            if (!product) return null;

            const categories = this._getFromStorage('categories', []);
            const category = categories.find((c) => c.id === product.category_id) || null;

            const allVariants = this._getFromStorage('product_variants', []);
            const variantsForProduct = allVariants.filter((v) => v.product_id === product.id);

            const addons = this._getFromStorage('addons', []);
            const availableAddons = Array.isArray(product.available_addon_ids)
              ? addons.filter((a) => product.available_addon_ids.includes(a.id) && a.is_active)
              : [];

            const variantDtos = variantsForProduct.map((v) => ({
              variant_id: v.id,
              size_code: v.size_code,
              display_name: v.display_name,
              stem_count: v.stem_count || null,
              price: v.price || 0,
              is_default: !!v.is_default,
              status: v.status
            }));

            const addonDtos = availableAddons.map((a) => ({
              addon_id: a.id,
              addon_code: a.addon_code,
              name: a.name,
              description: a.description || '',
              price: a.price || 0
            }));

            return {
              product_id: product.id,
              product_name: product.name,
              slug: product.slug || '',
              description: product.description || '',
              category_id: product.category_id,
              category_name: category ? category.name : '',
              product_type: product.product_type,
              flower_types: Array.isArray(product.flower_types) ? product.flower_types : [],
              image_urls: product.image_url ? [product.image_url] : [],
              base_price: product.base_price || 0,
              rating_average: product.rating_average || 0,
              rating_count: product.rating_count || 0,
              tags: Array.isArray(product.tags) ? product.tags : [],
              is_same_day_eligible: !!product.is_same_day_eligible,
              has_free_shipping: !!product.has_free_shipping,
              same_day_zip_codes: Array.isArray(product.same_day_zip_codes)
                ? product.same_day_zip_codes
                : [],
              variants: variantDtos,
              available_addons: addonDtos,
              // Foreign key resolution
              category: category
            };
          }

          // 7. getAvailableDeliveryTimeSlots(productId, deliveryZip, deliveryDate)
          getAvailableDeliveryTimeSlots(productId, deliveryZip, deliveryDate) {
            const product = this._findProductById(productId);
            const slots = this._getFromStorage('delivery_time_slots', []);

            const isSameDayDate = deliveryDate === this._todayDateOnly();

            let availableSlots = [];

            if (product && isSameDayDate && product.is_same_day_eligible) {
              // check zip restriction if present
              const zips = Array.isArray(product.same_day_zip_codes)
                ? product.same_day_zip_codes
                : [];
              const zipOk = zips.length === 0 || zips.includes(deliveryZip);
              if (zipOk) {
                availableSlots = slots.filter((s) => s.is_same_day);
              }
            }

            if (availableSlots.length === 0) {
              // fallback to all non-same-day slots (scheduled) for non-same-day date or ineligible product
              availableSlots = slots.filter((s) => !s.is_same_day);
            }

            availableSlots.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

            const available_time_slots = availableSlots.map((s) => ({
              time_slot_id: s.id,
              label: s.label,
              start_time: s.start_time,
              end_time: s.end_time,
              is_same_day: !!s.is_same_day,
              sort_order: s.sort_order
            }));

            let recommended_time_slot_id = null;
            if (isSameDayDate && product && product.is_same_day_eligible) {
              recommended_time_slot_id = this._selectEarliestSameDaySlot(
                productId,
                deliveryZip,
                deliveryDate
              );
            }

            return {
              is_same_day_date: isSameDayDate,
              available_time_slots,
              recommended_time_slot_id
            };
          }

          // 8. addItemToCart(productId, variantId, quantity, addonIds, giftMessage, deliveryZip, deliveryDate, deliveryTimeSlotId)
          addItemToCart(
            productId,
            variantId,
            quantity,
            addonIds,
            giftMessage,
            deliveryZip,
            deliveryDate,
            deliveryTimeSlotId
          ) {
            const product = this._findProductById(productId);
            if (!product) {
              return { success: false, message: 'Product not found.', cart: null };
            }

            const cart = this._getOrCreateCart();
            const cartItems = this._getFromStorage('cart_items', []);
            const variants = this._getFromStorage('product_variants', []);
            const addons = this._getFromStorage('addons', []);

            let selectedVariant = null;
            if (variantId) {
              selectedVariant = variants.find(
                (v) => v.id === variantId && v.product_id === product.id && v.status === 'active'
              );
            }
            if (!selectedVariant) {
              // try default variant
              selectedVariant = variants.find(
                (v) => v.product_id === product.id && v.is_default && v.status === 'active'
              );
            }

            const unitPrice = selectedVariant ? selectedVariant.price || 0 : product.base_price || 0;
            const qty = quantity != null ? quantity : 1;

            const validAddonIds = Array.isArray(addonIds) ? addonIds : [];
            const addonPricePerUnit = validAddonIds.reduce((sum, aid) => {
              const addon = addons.find((a) => a.id === aid && a.is_active);
              return sum + (addon ? addon.price || 0 : 0);
            }, 0);

            const lineSubtotal = (unitPrice + addonPricePerUnit) * qty;

            const cartItem = {
              id: this._generateId('cart_item'),
              cart_id: cart.id,
              product_id: product.id,
              product_name: product.name,
              variant_id: selectedVariant ? selectedVariant.id : null,
              variant_name: selectedVariant ? selectedVariant.display_name : null,
              quantity: qty,
              unit_price: unitPrice,
              line_subtotal: lineSubtotal,
              addon_ids: validAddonIds,
              gift_message: giftMessage || null,
              delivery_zip: deliveryZip || null,
              delivery_date: deliveryDate || null,
              delivery_time_slot_id: deliveryTimeSlotId || null
            };

            cartItems.push(cartItem);
            this._saveToStorage('cart_items', cartItems);

            // Update cart and totals
            cart.items = cart.items || [];
            cart.items.push(cartItem.id);
            this._recalculateCartTotals(cart);

            const item_count = this._getCartItemCount(cart.id);

            return {
              success: true,
              message: 'Item added to cart.',
              cart: {
                cart_id: cart.id,
                item_count,
                subtotal: cart.subtotal || 0,
                discount_total: cart.discount_total || 0,
                shipping_total: cart.shipping_total || 0,
                tax_total: cart.tax_total || 0,
                total: cart.total || 0
              }
            };
          }

          // 9. getCartSummary()
          getCartSummary() {
            const cart = this._getOrCreateCart();
            const item_count = this._getCartItemCount(cart.id);

            return {
              item_count,
              subtotal: cart.subtotal || 0,
              has_applied_promo: !!cart.applied_promo_code_id
            };
          }

          // 10. getCart()
          getCart() {
            const cart = this._getOrCreateCart();
            const cartItems = this._getFromStorage('cart_items', []);
            const products = this._getFromStorage('products', []);
            const variants = this._getFromStorage('product_variants', []);
            const addons = this._getFromStorage('addons', []);
            const timeSlots = this._getFromStorage('delivery_time_slots', []);
            const promoCodes = this._getFromStorage('promo_codes', []);

            const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

            const items = itemsForCart.map((ci) => {
              const product = products.find((p) => p.id === ci.product_id) || null;
              const variant = ci.variant_id
                ? variants.find((v) => v.id === ci.variant_id) || null
                : null;
              const addonObjs = (ci.addon_ids || [])
                .map((aid) => addons.find((a) => a.id === aid) || null)
                .filter((a) => !!a);
              const timeSlot = ci.delivery_time_slot_id
                ? timeSlots.find((t) => t.id === ci.delivery_time_slot_id) || null
                : null;

              return {
                cart_item_id: ci.id,
                product_id: ci.product_id,
                product_name: ci.product_name,
                variant_name: ci.variant_name || (variant ? variant.display_name : null),
                quantity: ci.quantity,
                unit_price: ci.unit_price,
                addon_names: addonObjs.map((a) => a.name),
                gift_message: ci.gift_message || null,
                delivery_zip: ci.delivery_zip || null,
                delivery_date: ci.delivery_date || null,
                delivery_time_slot_label: timeSlot ? timeSlot.label : null,
                line_subtotal: ci.line_subtotal || 0,
                // Foreign key resolution
                product: product,
                variant: variant,
                addons: addonObjs,
                delivery_time_slot: timeSlot
              };
            });

            const promo = cart.applied_promo_code_id
              ? promoCodes.find((p) => p.id === cart.applied_promo_code_id) || null
              : null;

            return {
              cart_id: cart.id,
              items,
              subtotal: cart.subtotal || 0,
              discount_total: cart.discount_total || 0,
              shipping_total: cart.shipping_total || 0,
              tax_total: cart.tax_total || 0,
              total: cart.total || 0,
              applied_promo_code: promo ? promo.code : null
            };
          }

          // 11. updateCartItemQuantity(cartItemId, quantity)
          updateCartItemQuantity(cartItemId, quantity) {
            const cartItems = this._getFromStorage('cart_items', []);
            const cartItem = cartItems.find((ci) => ci.id === cartItemId);
            if (!cartItem) {
              return { success: false, message: 'Cart item not found.', cart: null };
            }

            const newQty = quantity <= 0 ? 0 : quantity;
            cartItem.quantity = newQty;

            // Save updated items
            this._saveToStorage('cart_items', cartItems);

            const carts = this._getFromStorage('cart', []);
            const cart = carts.find((c) => c.id === cartItem.cart_id) || this._getOrCreateCart();

            if (newQty === 0) {
              // Remove item when quantity is 0
              const remainingItems = cartItems.filter((ci) => ci.id !== cartItemId);
              this._saveToStorage('cart_items', remainingItems);
              if (cart.items) {
                cart.items = cart.items.filter((id) => id !== cartItemId);
              }
            }

            this._recalculateCartTotals(cart);

            const updatedCartItems = this._getCartItems(cart.id);
            const itemsResponse = updatedCartItems.map((ci) => ({
              cart_item_id: ci.id,
              product_name: ci.product_name,
              variant_name: ci.variant_name,
              quantity: ci.quantity,
              unit_price: ci.unit_price,
              line_subtotal: ci.line_subtotal || 0
            }));

            return {
              success: true,
              message: 'Cart updated.',
              cart: {
                cart_id: cart.id,
                items: itemsResponse,
                subtotal: cart.subtotal || 0,
                discount_total: cart.discount_total || 0,
                shipping_total: cart.shipping_total || 0,
                tax_total: cart.tax_total || 0,
                total: cart.total || 0
              }
            };
          }

          // 12. removeCartItem(cartItemId)
          removeCartItem(cartItemId) {
            let cartItems = this._getFromStorage('cart_items', []);
            const cartItem = cartItems.find((ci) => ci.id === cartItemId);
            if (!cartItem) {
              return { success: false, message: 'Cart item not found.', cart: null };
            }

            cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
            this._saveToStorage('cart_items', cartItems);

            const carts = this._getFromStorage('cart', []);
            const cart = carts.find((c) => c.id === cartItem.cart_id) || this._getOrCreateCart();

            cart.items = (cart.items || []).filter((id) => id !== cartItemId);
            this._recalculateCartTotals(cart);

            const updatedCartItems = this._getCartItems(cart.id);
            const itemsResponse = updatedCartItems.map((ci) => ({
              cart_item_id: ci.id,
              product_name: ci.product_name,
              variant_name: ci.variant_name,
              quantity: ci.quantity,
              unit_price: ci.unit_price,
              line_subtotal: ci.line_subtotal || 0
            }));

            return {
              success: true,
              message: 'Item removed from cart.',
              cart: {
                cart_id: cart.id,
                items: itemsResponse,
                subtotal: cart.subtotal || 0,
                discount_total: cart.discount_total || 0,
                shipping_total: cart.shipping_total || 0,
                tax_total: cart.tax_total || 0,
                total: cart.total || 0
              }
            };
          }

          // 13. startCheckoutFromCart()
          startCheckoutFromCart() {
            const order = this._getCurrentDraftOrder();
            const orderItems = this._getFromStorage('order_items', []);
            const timeSlots = this._getFromStorage('delivery_time_slots', []);
            const promoCodes = this._getFromStorage('promo_codes', []);

            const itemsForOrder = orderItems.filter((oi) => oi.order_id === order.id);

            const items = itemsForOrder.map((oi) => {
              const timeSlot = oi.delivery_time_slot_id
                ? timeSlots.find((t) => t.id === oi.delivery_time_slot_id) || null
                : null;

              return {
                product_name: oi.product_name,
                variant_name: oi.variant_name || null,
                quantity: oi.quantity,
                unit_price: oi.unit_price,
                delivery_date: oi.delivery_date || null,
                delivery_zip: oi.delivery_zip || null,
                delivery_time_slot_label: timeSlot ? timeSlot.label : null,
                line_subtotal: oi.line_subtotal || 0,
                // Foreign key resolution
                delivery_time_slot: timeSlot
              };
            });

            const promo = order.promo_code_id
              ? promoCodes.find((p) => p.id === order.promo_code_id) || null
              : null;

            return {
              order_id: order.id,
              status: order.status,
              items,
              subtotal: order.subtotal || 0,
              discount_total: order.discount_total || 0,
              shipping_total: order.shipping_total || 0,
              tax_total: order.tax_total || 0,
              total: order.total || 0,
              applied_promo_code: promo ? promo.code : null
            };
          }

          // 14. getCheckoutOrderSummary()
          getCheckoutOrderSummary() {
            const order = this._getCurrentDraftOrder();
            const orderItems = this._getFromStorage('order_items', []);
            const timeSlots = this._getFromStorage('delivery_time_slots', []);
            const promoCodes = this._getFromStorage('promo_codes', []);

            const itemsForOrder = orderItems.filter((oi) => oi.order_id === order.id);

            const items = itemsForOrder.map((oi) => {
              const timeSlot = oi.delivery_time_slot_id
                ? timeSlots.find((t) => t.id === oi.delivery_time_slot_id) || null
                : null;

              return {
                product_name: oi.product_name,
                variant_name: oi.variant_name || null,
                quantity: oi.quantity,
                unit_price: oi.unit_price,
                delivery_date: oi.delivery_date || null,
                delivery_zip: oi.delivery_zip || null,
                delivery_time_slot_label: timeSlot ? timeSlot.label : null,
                line_subtotal: oi.line_subtotal || 0,
                // Foreign key resolution
                delivery_time_slot: timeSlot
              };
            });

            const promo = order.promo_code_id
              ? promoCodes.find((p) => p.id === order.promo_code_id) || null
              : null;

            return {
              order_id: order.id,
              status: order.status,
              items,
              subtotal: order.subtotal || 0,
              discount_total: order.discount_total || 0,
              shipping_total: order.shipping_total || 0,
              tax_total: order.tax_total || 0,
              total: order.total || 0,
              applied_promo_code: promo ? promo.code : null,
              contact_name: order.contact_name || '',
              contact_email: order.contact_email || '',
              contact_phone: order.contact_phone || '',
              shipping_address_line1: order.shipping_address_line1 || '',
              shipping_address_line2: order.shipping_address_line2 || '',
              shipping_city: order.shipping_city || '',
              shipping_state: order.shipping_state || '',
              shipping_postal_code: order.shipping_postal_code || '',
              shipping_country: order.shipping_country || ''
            };
          }

          // 15. applyPromoCodeToCurrentOrder(promoCode)
          applyPromoCodeToCurrentOrder(promoCode) {
            const order = this._getCurrentDraftOrder();
            const promo = this._findPromoByCode(promoCode);

            const validation = this._applyPromoCodeIfValid(order, promo, 'order');
            if (!validation.valid) {
              return {
                success: false,
                message: validation.message,
                order_summary: null
              };
            }

            order.promo_code_id = promo.id;
            order.promo_code_code = promo.code;
            order.discount_total = validation.discount_total;
            order.shipping_total = validation.shipping_total;
            order.total = order.subtotal - order.discount_total + order.shipping_total + order.tax_total;
            order.updated_at = this._nowIso();

            const orders = this._getFromStorage('orders', []);
            const updatedOrders = orders.map((o) => (o.id === order.id ? order : o));
            this._saveToStorage('orders', updatedOrders);

            const order_summary = {
              order_id: order.id,
              status: order.status,
              applied_promo_code: order.promo_code_code,
              subtotal: order.subtotal || 0,
              discount_total: order.discount_total || 0,
              shipping_total: order.shipping_total || 0,
              tax_total: order.tax_total || 0,
              total: order.total || 0
            };

            return {
              success: true,
              message: validation.message,
              order_summary
            };
          }

          // 16. updateOrderContactAndShipping(contactAndShipping)
          updateOrderContactAndShipping(contactAndShipping) {
            const order = this._getCurrentDraftOrder();

            const data = contactAndShipping || {};
            order.contact_name = data.contact_name || '';
            order.contact_email = data.contact_email || '';
            order.contact_phone = data.contact_phone || '';
            order.shipping_address_line1 = data.shipping_address_line1 || '';
            order.shipping_address_line2 = data.shipping_address_line2 || '';
            order.shipping_city = data.shipping_city || '';
            order.shipping_state = data.shipping_state || '';
            order.shipping_postal_code = data.shipping_postal_code || '';
            order.shipping_country = data.shipping_country || '';
            order.updated_at = this._nowIso();

            const orders = this._getFromStorage('orders', []);
            const updatedOrders = orders.map((o) => (o.id === order.id ? order : o));
            this._saveToStorage('orders', updatedOrders);

            const order_summary = {
              order_id: order.id,
              contact_name: order.contact_name,
              contact_email: order.contact_email,
              contact_phone: order.contact_phone,
              shipping_address_line1: order.shipping_address_line1,
              shipping_address_line2: order.shipping_address_line2,
              shipping_city: order.shipping_city,
              shipping_state: order.shipping_state,
              shipping_postal_code: order.shipping_postal_code,
              shipping_country: order.shipping_country
            };

            return {
              success: true,
              message: 'Contact and shipping information updated.',
              order_summary
            };
          }

          // 17. proceedToPaymentSelection()
          proceedToPaymentSelection() {
            const order = this._getCurrentDraftOrder();
            order.status = 'pending_payment';
            order.updated_at = this._nowIso();

            const orders = this._getFromStorage('orders', []);
            const updatedOrders = orders.map((o) => (o.id === order.id ? order : o));
            this._saveToStorage('orders', updatedOrders);

            return {
              success: true,
              message: 'Order is ready for payment selection.',
              order_id: order.id,
              available_payment_methods: ['credit_card', 'paypal']
            };
          }

          // 18. getSubscriptionPlansOverview()
          getSubscriptionPlansOverview() {
            const plans = this._getFromStorage('subscription_plans', []);

            return plans.map((p) => ({
              plan_id: p.id,
              plan_key: p.plan_key,
              name: p.name,
              description: p.description || '',
              base_price_per_delivery: p.base_price_per_delivery || 0,
              image_url: p.image_url || '',
              is_active: !!p.is_active,
              highlight_text: p.description || ''
            }));
          }

          // 19. getSubscriptionPlanDetails(planId)
          getSubscriptionPlanDetails(planId) {
            const plan = this._findSubscriptionPlanById(planId);
            if (!plan) return null;

            const variants = this._getFromStorage('subscription_variants', []).filter(
              (v) => v.plan_id === planId
            );

            const variantDtos = variants.map((v) => ({
              variant_id: v.id,
              display_name: v.display_name,
              price_per_delivery: v.price_per_delivery || 0,
              is_active: !!v.is_active
            }));

            const allowed_frequencies = ['every_week', 'every_2_weeks', 'every_month'];
            const allowed_deliveries_counts = [4, 8, 12];

            return {
              plan_id: plan.id,
              plan_key: plan.plan_key,
              name: plan.name,
              description: plan.description || '',
              image_url: plan.image_url || '',
              is_active: !!plan.is_active,
              variants: variantDtos,
              allowed_frequencies,
              allowed_deliveries_counts
            };
          }

          // 20. startSubscriptionConfiguration(planId)
          startSubscriptionConfiguration(planId) {
            const plan = this._findSubscriptionPlanById(planId);
            if (!plan) return null;

            const subscription = this._getOrCreateSubscriptionConfig(planId);
            if (!subscription) return null;

            const variant = this._findSubscriptionVariantById(subscription.variant_id);

            const current_configuration = {
              variant_id: subscription.variant_id,
              variant_display_name: variant ? variant.display_name : null,
              frequency: subscription.frequency,
              deliveries_count: subscription.deliveries_count,
              price_per_delivery: subscription.price_per_delivery,
              total_price: subscription.total_price,
              delivery_zip: subscription.delivery_zip,
              delivery_day_of_week: subscription.delivery_day_of_week
            };

            return {
              subscription_id: subscription.id,
              status: subscription.status,
              plan_id: plan.id,
              plan_name: plan.name,
              current_configuration
            };
          }

          // 21. updateSubscriptionConfiguration(subscriptionId, variantId, frequency, deliveriesCount, deliveryZip, deliveryDayOfWeek)
          updateSubscriptionConfiguration(
            subscriptionId,
            variantId,
            frequency,
            deliveriesCount,
            deliveryZip,
            deliveryDayOfWeek
          ) {
            let subs = this._getFromStorage('subscriptions', []);
            let subscription = subs.find((s) => s.id === subscriptionId);
            if (!subscription) {
              return {
                success: false,
                message: 'Subscription not found.',
                subscription_configuration: null
              };
            }

            if (variantId) {
              const variant = this._findSubscriptionVariantById(variantId);
              if (variant && variant.plan_id === subscription.plan_id && variant.is_active) {
                subscription.variant_id = variantId;
                subscription.price_per_delivery = variant.price_per_delivery || 0;
              }
            }

            if (frequency) {
              subscription.frequency = frequency;
            }

            if (deliveriesCount != null) {
              subscription.deliveries_count = deliveriesCount;
            }

            if (deliveryZip != null) {
              subscription.delivery_zip = deliveryZip;
            }

            if (deliveryDayOfWeek) {
              subscription.delivery_day_of_week = deliveryDayOfWeek;
            }

            subscription.total_price = subscription.price_per_delivery * subscription.deliveries_count;
            subscription.updated_at = this._nowIso();

            subs = subs.map((s) => (s.id === subscription.id ? subscription : s));
            this._saveToStorage('subscriptions', subs);

            const plan = this._findSubscriptionPlanById(subscription.plan_id);
            const variant = this._findSubscriptionVariantById(subscription.variant_id);

            const subscription_configuration = {
              subscription_id: subscription.id,
              plan_name: plan ? plan.name : '',
              variant_display_name: variant ? variant.display_name : null,
              frequency: subscription.frequency,
              deliveries_count: subscription.deliveries_count,
              price_per_delivery: subscription.price_per_delivery,
              total_price: subscription.total_price,
              delivery_zip: subscription.delivery_zip,
              delivery_day_of_week: subscription.delivery_day_of_week
            };

            return {
              success: true,
              message: 'Subscription configuration updated.',
              subscription_configuration
            };
          }

          // 22. updateSubscriptionContactAndShipping(subscriptionId, contactAndShipping)
          updateSubscriptionContactAndShipping(subscriptionId, contactAndShipping) {
            let subs = this._getFromStorage('subscriptions', []);
            let subscription = subs.find((s) => s.id === subscriptionId);
            if (!subscription) {
              return { success: false, message: 'Subscription not found.', subscription: null };
            }

            const data = contactAndShipping || {};
            subscription.contact_name = data.contact_name || '';
            subscription.contact_email = data.contact_email || '';
            subscription.contact_phone = data.contact_phone || '';
            subscription.shipping_address_line1 = data.shipping_address_line1 || '';
            subscription.shipping_address_line2 = data.shipping_address_line2 || '';
            subscription.shipping_city = data.shipping_city || '';
            subscription.shipping_state = data.shipping_state || '';
            subscription.shipping_postal_code = data.shipping_postal_code || '';
            subscription.shipping_country = data.shipping_country || '';
            subscription.updated_at = this._nowIso();

            subs = subs.map((s) => (s.id === subscription.id ? subscription : s));
            this._saveToStorage('subscriptions', subs);

            return {
              success: true,
              message: 'Subscription contact and shipping updated.',
              subscription: {
                subscription_id: subscription.id,
                contact_name: subscription.contact_name,
                contact_email: subscription.contact_email,
                contact_phone: subscription.contact_phone,
                shipping_city: subscription.shipping_city,
                shipping_state: subscription.shipping_state,
                shipping_postal_code: subscription.shipping_postal_code,
                shipping_country: subscription.shipping_country
              }
            };
          }

          // 23. getSubscriptionReview(subscriptionId)
          getSubscriptionReview(subscriptionId) {
            const subs = this._getFromStorage('subscriptions', []);
            const subscription = subs.find((s) => s.id === subscriptionId);
            if (!subscription) return null;

            const plan = this._findSubscriptionPlanById(subscription.plan_id);
            const variant = this._findSubscriptionVariantById(subscription.variant_id);

            // Instrumentation for task completion tracking
            try {
              const isSeasonalBouquetPlan =
                plan &&
                (
                  (typeof plan.name === 'string' &&
                    plan.name.toLowerCase().includes('seasonal bouquet')) ||
                  (typeof plan.plan_key === 'string' &&
                    ['seasonal_bouquet', 'seasonal-bouquet', 'seasonalBouquet'].includes(
                      plan.plan_key
                    ))
                );

              if (isSeasonalBouquetPlan) {
                localStorage.setItem(
                  'task7_subscriptionReviewOpened',
                  JSON.stringify({
                    "subscription_id": subscription.id,
                    "plan_id": plan ? plan.id : null,
                    "timestamp": this._nowIso()
                  })
                );
              }
            } catch (e) {
              try {
                console.error('Instrumentation error:', e);
              } catch (e2) {}
            }

            return {
              subscription_id: subscription.id,
              plan_name: plan ? plan.name : '',
              variant_display_name: variant ? variant.display_name : null,
              frequency: subscription.frequency,
              deliveries_count: subscription.deliveries_count,
              price_per_delivery: subscription.price_per_delivery,
              total_price: subscription.total_price,
              delivery_zip: subscription.delivery_zip,
              delivery_day_of_week: subscription.delivery_day_of_week,
              contact_name: subscription.contact_name,
              contact_email: subscription.contact_email,
              contact_phone: subscription.contact_phone,
              shipping_address_line1: subscription.shipping_address_line1,
              shipping_address_line2: subscription.shipping_address_line2,
              shipping_city: subscription.shipping_city,
              shipping_state: subscription.shipping_state,
              shipping_postal_code: subscription.shipping_postal_code,
              shipping_country: subscription.shipping_country
            };
          }

          // 24. proceedToSubscriptionPaymentSelection(subscriptionId)
          proceedToSubscriptionPaymentSelection(subscriptionId) {
            let subs = this._getFromStorage('subscriptions', []);
            let subscription = subs.find((s) => s.id === subscriptionId);
            if (!subscription) {
              return { success: false, message: 'Subscription not found.', subscription_id: null, available_payment_methods: [] };
            }

            // We keep status as 'configuring' until payment is completed externally.
            subscription.updated_at = this._nowIso();
            subs = subs.map((s) => (s.id === subscription.id ? subscription : s));
            this._saveToStorage('subscriptions', subs);

            return {
              success: true,
              message: 'Subscription is ready for payment selection.',
              subscription_id: subscription.id,
              available_payment_methods: ['credit_card', 'paypal']
            };
          }

          // 25. getStaticPageContent(pageKey)
          getStaticPageContent(pageKey) {
            const pages = this._getFromStorage('static_pages', []);
            const page = pages.find((p) => p.page_key === pageKey);
            if (!page) {
              // Return minimal structured object without persisting new data
              return {
                page_key: pageKey,
                title: '',
                sections: [],
                contact_info: {
                  email: '',
                  phone: '',
                  support_hours: ''
                }
              };
            }

            return {
              page_key: page.page_key,
              title: page.title || '',
              sections: Array.isArray(page.sections) ? page.sections : [],
              contact_info: page.contact_info || {
                email: '',
                phone: '',
                support_hours: ''
              }
            };
          }

          // 26. submitContactForm(name, email, phone, subject, message)
          submitContactForm(name, email, phone, subject, message) {
            const tickets = this._getFromStorage('support_tickets', []);

            const ticket = {
              id: this._generateId('ticket'),
              name: name || '',
              email: email || '',
              phone: phone || '',
              subject: subject || '',
              message: message || '',
              created_at: this._nowIso()
            };

            tickets.push(ticket);
            this._saveToStorage('support_tickets', tickets);

            return {
              success: true,
              message: 'Your inquiry has been submitted.',
              ticket_id: ticket.id
            };
          }

          // 27. getDeliveryEligibility(deliveryZip)
          getDeliveryEligibility(deliveryZip) {
            const products = this._getFromStorage('products', []);
            const slots = this._getFromStorage('delivery_time_slots', []);

            let isSameDaySupported = false;
            let hasFreeShippingOption = false;

            for (const p of products) {
              if (p.has_free_shipping) hasFreeShippingOption = true;
              if (p.is_same_day_eligible) {
                const zips = Array.isArray(p.same_day_zip_codes) ? p.same_day_zip_codes : [];
                if (zips.length === 0 || zips.includes(deliveryZip)) {
                  isSameDaySupported = true;
                }
              }
              if (isSameDaySupported && hasFreeShippingOption) break;
            }

            const available_time_slots = slots.map((s) => ({
              time_slot_id: s.id,
              label: s.label,
              start_time: s.start_time,
              end_time: s.end_time
            }));

            return {
              delivery_zip: deliveryZip,
              is_same_day_supported: isSameDaySupported,
              same_day_cutoff_time: '',
              estimated_standard_delivery_days: 0,
              available_time_slots,
              has_free_shipping_option: hasFreeShippingOption
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
