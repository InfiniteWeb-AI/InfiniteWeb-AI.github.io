/*
  BusinessLogic implementation for Estate Liquidation Services website
  - Uses localStorage (with Node-safe polyfill)
  - Implements all specified interfaces
  - Pure business logic: no DOM access
*/

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
    // Core tables based on data models
    const tableKeys = [
      'service_packages',
      'service_features',
      'booking_requests',
      'estate_sales',
      'items',
      'favorite_items',
      'proceeds_estimates',
      'faqs',
      'contact_messages',
      'professional_partner_applications',
      'service_wizard_results',
      'blog_articles',
      'carts',
      'cart_items'
    ];

    for (let i = 0; i < tableKeys.length; i++) {
      const key = tableKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Content / configuration-like structures
    if (!localStorage.getItem('homepage_content')) {
      const defaultHomepage = {
        hero_title: '',
        hero_subtitle: '',
        value_propositions: [],
        primary_ctas: [],
        quick_links: []
      };
      localStorage.setItem('homepage_content', JSON.stringify(defaultHomepage));
    }

    if (!localStorage.getItem('partner_program_overview')) {
      const defaultPartnerOverview = {
        headline: '',
        intro: '',
        benefits: [],
        collaboration_models: [],
        highlighted_support: []
      };
      localStorage.setItem('partner_program_overview', JSON.stringify(defaultPartnerOverview));
    }

    if (!localStorage.getItem('about_page_content')) {
      const defaultAbout = {
        company_name: '',
        mission: '',
        history: '',
        service_areas: [],
        team_highlights: [],
        testimonials: [],
        affiliations: []
      };
      localStorage.setItem('about_page_content', JSON.stringify(defaultAbout));
    }

    // Consultation availability slots (for getConsultationAvailability)
    if (!localStorage.getItem('consultation_availability')) {
      localStorage.setItem('consultation_availability', JSON.stringify([]));
    }

    // Generic id counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue !== undefined ? defaultValue : [];
    }
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

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _toISODate(date) {
    if (!date) return null;
    const d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  _normalizeString(str) {
    return (str || '').toString().toLowerCase();
  }

  // -------------------- Helper functions from spec --------------------

  // Internal helper to retrieve the current Cart for the single user or create a new one if none exists.
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let cart = null;

    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'open') {
        cart = carts[i];
        break;
      }
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        payment_method: null,
        items: [], // array of CartItem ids
        subtotal: 0,
        tax: 0,
        total: 0,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }

    return cart;
  }

  // Internal helper to persist changes to the current Cart and its CartItems.
  _saveCart(cart) {
    if (!cart || !cart.id) return;

    let carts = this._getFromStorage('carts', []);
    let cartItems = this._getFromStorage('cart_items', []);

    // Recalculate financials based on cartItems belonging to this cart
    let subtotal = 0;
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cart_id === cart.id) {
        const qty = typeof ci.quantity === 'number' ? ci.quantity : 1;
        const price = typeof ci.unit_price === 'number' ? ci.unit_price : 0;
        subtotal += qty * price;
      }
    }

    cart.subtotal = subtotal;
    // Simple tax model: 0 for now (could be extended)
    cart.tax = 0;
    cart.total = subtotal + cart.tax;
    cart.updated_at = new Date().toISOString();

    // Ensure items list contains all cart_item ids for this cart
    const itemIds = [];
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id === cart.id) {
        itemIds.push(cartItems[i].id);
      }
    }
    cart.items = itemIds;

    // Persist updates
    let updated = false;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i] = cart;
        updated = true;
        break;
      }
    }
    if (!updated) {
      carts.push(cart);
    }

    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', cartItems);
  }

  // Internal helper to load the current user's FavoriteItem records.
  _getCurrentFavorites() {
    const favorites = this._getFromStorage('favorite_items', []);
    return favorites;
  }

  // Internal helper encapsulating financial logic for calculating proceeds.
  _calculateProceedsInternal(property_zip, home_size_sq_ft, number_bedrooms, estimated_sellable_value, additional_services, target_sale_date, urgency) {
    const baseSellable = typeof estimated_sellable_value === 'number' ? estimated_sellable_value : parseFloat(estimated_sellable_value || '0');

    // Assume 90% of sellable value actually sells
    const sellThroughRate = 0.9;
    const estimatedGross = baseSellable * sellThroughRate;

    // Base commission rate depending on estate size
    let commissionRate = 0.35; // 35%
    if (baseSellable > 50000) commissionRate = 0.3;
    if (baseSellable > 150000) commissionRate = 0.25;

    // Adjust commission based on urgency
    if (urgency === 'within_1_week') {
      commissionRate += 0.05; // rush premium
    } else if (urgency === 'within_2_4_weeks') {
      commissionRate += 0.02;
    } else if (urgency === 'more_than_2_months') {
      commissionRate -= 0.02;
    }

    // Additional service flat fees
    let additionalFees = 0;
    const services = Array.isArray(additional_services) ? additional_services : [];
    for (let i = 0; i < services.length; i++) {
      const svc = services[i];
      if (svc === 'post_sale_cleanout') {
        additionalFees += 750;
      } else if (svc === 'donation_pickup') {
        additionalFees += 250;
      } else {
        additionalFees += 150; // generic add-on fee
      }
    }

    const commissionFees = estimatedGross * commissionRate;
    const totalFees = commissionFees + additionalFees;
    const netProceeds = estimatedGross - totalFees;

    const notesParts = [];
    notesParts.push('Estimate based on ' + home_size_sq_ft + ' sq ft, ' + number_bedrooms + ' bedrooms in ZIP ' + property_zip + '.');
    if (target_sale_date) {
      notesParts.push('Target sale date: ' + target_sale_date + '.');
    }
    if (services.length) {
      notesParts.push('Includes additional services: ' + services.join(', ') + '.');
    }

    return {
      estimated_gross_proceeds: estimatedGross,
      estimated_fees: totalFees,
      estimated_net_proceeds: netProceeds,
      commission_rate: commissionRate,
      notes: notesParts.join(' ')
    };
  }

  // Internal helper that maps Service Selector Wizard inputs into a ServiceWizardResult recommendation.
  _recommendServiceInternal(project_type, inventory_size, timeline, owner_location) {
    // Default recommendation
    let recommended_service_type = 'consultation_only';
    let notes = '';

    // Simple rule-based mapping
    if (project_type === 'full_estate_liquidation') {
      recommended_service_type = 'full_estate_liquidation';
      notes = 'Full estate liquidation is recommended based on project type.';
    } else if (project_type === 'downsizing_moving') {
      if (inventory_size === 'fewer_than_50_items') {
        recommended_service_type = 'managed_online_estate_sale';
        notes = 'Managed online estate sale recommended for small downsizing projects.';
      } else {
        recommended_service_type = 'in_person_estate_sale';
        notes = 'In-person estate sale recommended for larger downsizing inventory.';
      }
    } else if (project_type === 'cleanout_only') {
      recommended_service_type = 'cleanout_only';
      notes = 'Cleanout-only service recommended based on project type.';
    } else if (project_type === 'donation_only') {
      recommended_service_type = 'donation_only';
      notes = 'Donation-only service recommended based on project type.';
    } else if (project_type === 'valuation_only') {
      recommended_service_type = 'consultation_only';
      notes = 'Consultation-only service recommended for valuation projects.';
    }

    // Adjust notes for timeline and owner_location
    if (timeline === 'more_than_60_days') {
      notes += ' Extended timeline allows for more marketing and flexible sale formats.';
    } else if (timeline === 'less_than_2_weeks') {
      notes += ' Tight timeline may limit sale format options.';
    }

    if (owner_location === 'out_of_state' || owner_location === 'international') {
      notes += ' Remote-owner friendly processes will be emphasized.';
    }

    return {
      recommended_service_type: recommended_service_type,
      recommended_package_id: null,
      notes: notes.trim()
    };
  }

  // -------------------- Core interface implementations --------------------

  // getHomepageContent
  getHomepageContent() {
    const content = this._getFromStorage('homepage_content', {
      hero_title: '',
      hero_subtitle: '',
      value_propositions: [],
      primary_ctas: [],
      quick_links: []
    });
    return content;
  }

  // getServicePackageFilterOptions
  getServicePackageFilterOptions() {
    return {
      estate_value_tiers: [
        {
          value: 'under_50000',
          label: 'Under $50,000',
          description: 'Best for smaller estates and downsizing projects under $50,000 in total value.'
        },
        {
          value: 'between_50000_150000',
          label: '$50,000–$150,000',
          description: 'For typical full-home estates with moderate inventories.'
        },
        {
          value: 'over_150000',
          label: 'Over $150,000',
          description: 'For high-value estates or collections requiring specialized handling.'
        }
      ]
    };
  }

  // getServicePackages(estate_value_tier, status)
  getServicePackages(estate_value_tier, status) {
    let packages = this._getFromStorage('service_packages', []);

    if (estate_value_tier) {
      packages = packages.filter(function (p) {
        return p.estate_value_tier === estate_value_tier;
      });
    }

    const effectiveStatus = status || 'active';
    if (effectiveStatus) {
      packages = packages.filter(function (p) {
        // Some records might not have status set; default them to 'active'
        const st = p.status || 'active';
        return st === effectiveStatus;
      });
    }

    return packages;
  }

  // getServicePackageDetails(service_package_id)
  getServicePackageDetails(service_package_id) {
    const packages = this._getFromStorage('service_packages', []);
    for (let i = 0; i < packages.length; i++) {
      if (packages[i].id === service_package_id) {
        return packages[i];
      }
    }
    return null;
  }

  // getConsultationAvailability(service_type, property_zip, start_date, end_date)
  getConsultationAvailability(service_type, property_zip, start_date, end_date) {
    let allSlots = this._getFromStorage('consultation_availability', []);
    const start = this._parseDate(start_date);
    const end = this._parseDate(end_date);

    // If no slots are configured, generate default weekday 10:00 AM slots
    if (allSlots.length === 0 && start && end && start <= end) {
      const generated = [];
      const cursor = new Date(start.getTime());
      while (cursor <= end) {
        const day = cursor.getDay(); // 0=Sun, 1=Mon, ... (local time)
        if (day >= 1 && day <= 5) { // weekdays only
          const year = cursor.getFullYear();
          const month = String(cursor.getMonth() + 1).padStart(2, '0');
          const date = String(cursor.getDate()).padStart(2, '0');
          const datePart = year + '-' + month + '-' + date;

          generated.push({
            start_datetime: datePart + 'T10:00:00', // 10:00 AM local time
            end_datetime: datePart + 'T11:00:00',   // 1-hour slot
            is_weekday: true,
            is_available: true,
            service_type: null,
            property_zip: null
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      allSlots = generated;
    }

    const slots = [];
    for (let i = 0; i < allSlots.length; i++) {
      const slot = allSlots[i];
      if (slot.service_type && slot.service_type !== service_type) continue;
      if (slot.property_zip && slot.property_zip !== property_zip) continue;

      const slotStart = this._parseDate(slot.start_datetime);
      if (!slotStart) continue;
      if (start && slotStart < start) continue;
      if (end && slotStart > end) continue;

      const d = slotStart;
      const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
      const isWeekday = (day >= 1 && day <= 5);

      slots.push({
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        is_weekday: typeof slot.is_weekday === 'boolean' ? slot.is_weekday : isWeekday,
        is_available: typeof slot.is_available === 'boolean' ? slot.is_available : true
      });
    }

    return { slots: slots };
  }

  // createBookingRequest(...)
  createBookingRequest(
    source,
    service_type,
    package_id,
    recommended_service_type,
    wizard_result_id,
    blog_article_id,
    project_nickname,
    property_zip,
    estate_value_estimate,
    number_bedrooms,
    home_size_sq_ft,
    item_count_estimate,
    inventory_size_description,
    brief_description,
    preferred_appointment_datetime,
    target_sale_date,
    additional_services,
    owner_location,
    contact_name,
    contact_email,
    contact_phone,
    preferred_contact_method,
    notes
  ) {
    const bookingRequests = this._getFromStorage('booking_requests', []);
    const id = this._generateId('booking');

    const record = {
      id: id,
      source: source,
      service_type: service_type,
      package_id: package_id || null,
      recommended_service_type: recommended_service_type || null,
      wizard_result_id: wizard_result_id || null,
      blog_article_id: blog_article_id || null,
      project_nickname: project_nickname || null,
      property_zip: property_zip || null,
      estate_value_estimate: typeof estate_value_estimate === 'number' ? estate_value_estimate : (estate_value_estimate != null ? Number(estate_value_estimate) : null),
      number_bedrooms: typeof number_bedrooms === 'number' ? number_bedrooms : (number_bedrooms != null ? Number(number_bedrooms) : null),
      home_size_sq_ft: typeof home_size_sq_ft === 'number' ? home_size_sq_ft : (home_size_sq_ft != null ? Number(home_size_sq_ft) : null),
      item_count_estimate: typeof item_count_estimate === 'number' ? item_count_estimate : (item_count_estimate != null ? Number(item_count_estimate) : null),
      inventory_size_description: inventory_size_description || null,
      brief_description: brief_description || null,
      preferred_appointment_datetime: preferred_appointment_datetime || null,
      target_sale_date: target_sale_date || null,
      additional_services: Array.isArray(additional_services) ? additional_services : [],
      owner_location: owner_location || null,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      preferred_contact_method: preferred_contact_method || null,
      notes: notes || null,
      status: 'new',
      created_at: new Date().toISOString()
    };

    bookingRequests.push(record);
    this._saveToStorage('booking_requests', bookingRequests);

    return {
      success: true,
      booking_request_id: id,
      status: record.status,
      message: 'Booking request created.'
    };
  }

  // searchEstateSales(zip, radius_miles, start_date, end_date, only_upcoming)
  searchEstateSales(zip, radius_miles, start_date, end_date, only_upcoming) {
    let sales = this._getFromStorage('estate_sales', []);
    const start = this._parseDate(start_date);
    const end = this._parseDate(end_date);

    const onlyUpcomingEffective = (typeof only_upcoming === 'boolean') ? only_upcoming : true;

    const result = [];
    for (let i = 0; i < sales.length; i++) {
      const sale = sales[i];

      // ZIP filter (simplified: exact match)
      if (zip && sale.zip && sale.zip !== zip) continue;

      // Status filter
      if (onlyUpcomingEffective) {
        if (sale.status && sale.status !== 'upcoming' && sale.status !== 'active') continue;
      }

      // Date range overlap
      const saleStart = this._parseDate(sale.start_date);
      const saleEnd = this._parseDate(sale.end_date);
      if (!saleStart || !saleEnd) continue;
      if (start && saleEnd < start) continue;
      if (end && saleStart > end) continue;

      // Radius is accepted but not strictly enforced due to lack of geo for ZIP
      result.push(sale);
    }

    return result;
  }

  // getEstateSaleDetail(estate_sale_id)
  getEstateSaleDetail(estate_sale_id) {
    const sales = this._getFromStorage('estate_sales', []);
    for (let i = 0; i < sales.length; i++) {
      if (sales[i].id === estate_sale_id) {
        return sales[i];
      }
    }
    return null;
  }

  // getEstateSaleItems(estate_sale_id, category, min_price, max_price, sort)
  getEstateSaleItems(estate_sale_id, category, min_price, max_price, sort) {
    let items = this._getFromStorage('items', []);

    items = items.filter(function (item) {
      if (item.estate_sale_id !== estate_sale_id) return false;
      if (item.is_active === false) return false;
      return true;
    });

    if (category) {
      items = items.filter(function (item) {
        return item.category === category;
      });
    }

    if (typeof min_price === 'number') {
      items = items.filter(function (item) {
        return typeof item.price === 'number' && item.price >= min_price;
      });
    }

    if (typeof max_price === 'number') {
      items = items.filter(function (item) {
        return typeof item.price === 'number' && item.price <= max_price;
      });
    }

    if (sort === 'price_low_to_high') {
      items.sort(function (a, b) {
        return (a.price || 0) - (b.price || 0);
      });
    } else if (sort === 'price_high_to_low') {
      items.sort(function (a, b) {
        return (b.price || 0) - (a.price || 0);
      });
    } else if (sort === 'newest') {
      items.sort(function (a, b) {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
    }

    return items;
  }

  // addFavoriteItem(item_id)
  addFavoriteItem(item_id) {
    const items = this._getFromStorage('items', []);
    const favorites = this._getCurrentFavorites();

    let item = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === item_id) {
        item = items[i];
        break;
      }
    }
    if (!item) {
      return { success: false, favorite: null };
    }

    // Avoid duplicate favorites for the same item
    for (let j = 0; j < favorites.length; j++) {
      if (favorites[j].item_id === item_id) {
        return { success: true, favorite: favorites[j] };
      }
    }

    const favorite = {
      id: this._generateId('fav'),
      item_id: item_id,
      estate_sale_id: item.estate_sale_id || null,
      added_at: new Date().toISOString()
    };

    favorites.push(favorite);
    this._saveToStorage('favorite_items', favorites);

    return { success: true, favorite: favorite };
  }

  // removeFavoriteItem(favorite_id)
  removeFavoriteItem(favorite_id) {
    const favorites = this._getFromStorage('favorite_items', []);
    let removed = false;
    const newFavs = [];

    for (let i = 0; i < favorites.length; i++) {
      if (favorites[i].id === favorite_id) {
        removed = true;
        continue;
      }
      newFavs.push(favorites[i]);
    }

    if (removed) {
      this._saveToStorage('favorite_items', newFavs);
      return { success: true, message: 'Favorite removed.' };
    }

    return { success: false, message: 'Favorite not found.' };
  }

  // getFavoritesList()
  getFavoritesList() {
    const favorites = this._getFromStorage('favorite_items', []);
    const items = this._getFromStorage('items', []);
    const sales = this._getFromStorage('estate_sales', []);

    const result = [];

    for (let i = 0; i < favorites.length; i++) {
      const fav = favorites[i];
      let item = null;
      let sale = null;

      for (let j = 0; j < items.length; j++) {
        if (items[j].id === fav.item_id) {
          item = items[j];
          break;
        }
      }

      if (fav.estate_sale_id) {
        for (let k = 0; k < sales.length; k++) {
          if (sales[k].id === fav.estate_sale_id) {
            sale = sales[k];
            break;
          }
        }
      }

      result.push({
        favorite: fav,
        item: item,
        estate_sale: sale
      });
    }

    return result;
  }

  // calculateProceedsEstimate(...)
  calculateProceedsEstimate(property_zip, home_size_sq_ft, number_bedrooms, estimated_sellable_value, additional_services, target_sale_date, urgency) {
    const estimates = this._getFromStorage('proceeds_estimates', []);

    const calc = this._calculateProceedsInternal(
      property_zip,
      home_size_sq_ft,
      number_bedrooms,
      estimated_sellable_value,
      additional_services,
      target_sale_date,
      urgency
    );

    const id = this._generateId('estimate');

    const record = {
      id: id,
      created_at: new Date().toISOString(),
      property_zip: property_zip,
      home_size_sq_ft: typeof home_size_sq_ft === 'number' ? home_size_sq_ft : Number(home_size_sq_ft || 0),
      number_bedrooms: typeof number_bedrooms === 'number' ? number_bedrooms : Number(number_bedrooms || 0),
      estimated_sellable_value: typeof estimated_sellable_value === 'number' ? estimated_sellable_value : Number(estimated_sellable_value || 0),
      additional_services: Array.isArray(additional_services) ? additional_services : [],
      target_sale_date: target_sale_date || null,
      urgency: urgency,
      estimated_gross_proceeds: calc.estimated_gross_proceeds,
      estimated_fees: calc.estimated_fees,
      estimated_net_proceeds: calc.estimated_net_proceeds,
      commission_rate: calc.commission_rate,
      notes: calc.notes,
      email_to_send: null,
      email_sent_at: null
    };

    estimates.push(record);
    this._saveToStorage('proceeds_estimates', estimates);

    return record;
  }

  // emailProceedsEstimate(estimate_id, email)
  emailProceedsEstimate(estimate_id, email) {
    const estimates = this._getFromStorage('proceeds_estimates', []);
    let sentAt = null;
    let found = false;

    for (let i = 0; i < estimates.length; i++) {
      if (estimates[i].id === estimate_id) {
        estimates[i].email_to_send = email;
        sentAt = new Date().toISOString();
        estimates[i].email_sent_at = sentAt;
        found = true;
        break;
      }
    }

    if (!found) {
      return {
        success: false,
        estimate_id: estimate_id,
        email_sent_at: null
      };
    }

    this._saveToStorage('proceeds_estimates', estimates);

    return {
      success: true,
      estimate_id: estimate_id,
      email_sent_at: sentAt
    };
  }

  // searchFaq(query, category)
  searchFaq(query, category) {
    const faqs = this._getFromStorage('faqs', []);
    const q = this._normalizeString(query);
    const cat = category || null;

    const result = [];
    for (let i = 0; i < faqs.length; i++) {
      const faq = faqs[i];
      if (cat && faq.category && faq.category !== cat) continue;

      if (!q) {
        result.push(faq);
        continue;
      }

      const inQuestion = this._normalizeString(faq.question).indexOf(q) !== -1;
      const inAnswer = this._normalizeString(faq.answer).indexOf(q) !== -1;
      const keywords = Array.isArray(faq.keywords) ? faq.keywords : [];
      let inKeywords = false;
      for (let j = 0; j < keywords.length; j++) {
        if (this._normalizeString(keywords[j]).indexOf(q) !== -1) {
          inKeywords = true;
          break;
        }
      }

      if (inQuestion || inAnswer || inKeywords) {
        result.push(faq);
      }
    }

    return result;
  }

  // getFaqById(faq_id)
  getFaqById(faq_id) {
    const faqs = this._getFromStorage('faqs', []);
    for (let i = 0; i < faqs.length; i++) {
      if (faqs[i].id === faq_id) {
        return faqs[i];
      }
    }
    return null;
  }

  // submitContactMessage(topic, message, name, email, related_faq_id, source_page)
  submitContactMessage(topic, message, name, email, related_faq_id, source_page) {
    const messages = this._getFromStorage('contact_messages', []);
    const id = this._generateId('contact');

    const record = {
      id: id,
      topic: topic,
      message: message,
      name: name,
      email: email,
      related_faq_id: related_faq_id || null,
      source_page: source_page,
      status: 'new',
      created_at: new Date().toISOString()
    };

    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return { success: true, contact_message_id: id };
  }

  // getPartnerProgramOverview()
  getPartnerProgramOverview() {
    const overview = this._getFromStorage('partner_program_overview', {
      headline: '',
      intro: '',
      benefits: [],
      collaboration_models: [],
      highlighted_support: []
    });
    return overview;
  }

  // submitProfessionalPartnerApplication(...)
  submitProfessionalPartnerApplication(
    role,
    estate_clients_per_year,
    primary_service_zip,
    partnership_interests,
    full_name,
    business_email,
    company_name,
    phone
  ) {
    const apps = this._getFromStorage('professional_partner_applications', []);
    const id = this._generateId('partner');

    const record = {
      id: id,
      role: role,
      estate_clients_per_year: estate_clients_per_year != null ? Number(estate_clients_per_year) : null,
      primary_service_zip: primary_service_zip || null,
      partnership_interests: Array.isArray(partnership_interests) ? partnership_interests : [],
      full_name: full_name,
      business_email: business_email,
      company_name: company_name || null,
      phone: phone || null,
      status: 'submitted',
      notes: null,
      created_at: new Date().toISOString()
    };

    apps.push(record);
    this._saveToStorage('professional_partner_applications', apps);

    return {
      success: true,
      application_id: id,
      status: record.status
    };
  }

  // getServiceWizardOptions()
  getServiceWizardOptions() {
    return {
      project_types: [
        {
          value: 'downsizing_moving',
          label: 'Downsizing / moving',
          description: 'For partial moves, condo downsizing, and smaller projects.'
        },
        {
          value: 'full_estate_liquidation',
          label: 'Full estate liquidation',
          description: 'For whole-home estates, typically after a major life event.'
        },
        {
          value: 'cleanout_only',
          label: 'Cleanout only',
          description: 'For situations where items are not being sold, only removed.'
        },
        {
          value: 'donation_only',
          label: 'Donation only',
          description: 'For coordinating charitable donations without a sale.'
        },
        {
          value: 'valuation_only',
          label: 'Valuation / consultation only',
          description: 'For appraisals and advice without a sale.'
        }
      ],
      inventory_size_options: [
        {
          value: 'fewer_than_50_items',
          label: 'Fewer than 50 items'
        },
        {
          value: 'between_50_200_items',
          label: '50–200 items'
        },
        {
          value: 'between_200_500_items',
          label: '200–500 items'
        },
        {
          value: 'more_than_500_items',
          label: 'More than 500 items'
        }
      ],
      timeline_options: [
        {
          value: 'less_than_2_weeks',
          label: 'Less than 2 weeks'
        },
        {
          value: 'between_2_4_weeks',
          label: '2–4 weeks'
        },
        {
          value: 'between_1_2_months',
          label: '1–2 months'
        },
        {
          value: 'more_than_60_days',
          label: 'More than 60 days'
        }
      ],
      owner_location_options: [
        {
          value: 'local',
          label: 'I live near the property'
        },
        {
          value: 'out_of_state',
          label: 'I live out of state'
        },
        {
          value: 'international',
          label: 'I live outside the country'
        }
      ]
    };
  }

  // getServiceRecommendationFromWizard(project_type, inventory_size, timeline, owner_location)
  getServiceRecommendationFromWizard(project_type, inventory_size, timeline, owner_location) {
    const wizardResults = this._getFromStorage('service_wizard_results', []);
    const rec = this._recommendServiceInternal(project_type, inventory_size, timeline, owner_location);

    const id = this._generateId('wizard');

    const record = {
      id: id,
      project_type: project_type,
      inventory_size: inventory_size,
      timeline: timeline,
      owner_location: owner_location,
      recommended_service_type: rec.recommended_service_type,
      recommended_package_id: rec.recommended_package_id,
      notes: rec.notes,
      created_at: new Date().toISOString()
    };

    wizardResults.push(record);
    this._saveToStorage('service_wizard_results', wizardResults);

    return record;
  }

  // searchBlogArticles(query, primary_topic, status)
  searchBlogArticles(query, primary_topic, status) {
    let articles = this._getFromStorage('blog_articles', []);
    const q = this._normalizeString(query);
    const topic = primary_topic || null;
    const effectiveStatus = status || 'published';

    const result = [];

    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];

      if (effectiveStatus && a.status && a.status !== effectiveStatus) continue;
      if (topic && a.primary_topic && a.primary_topic !== topic) continue;

      if (!q) {
        result.push(a);
        continue;
      }

      const inTitle = this._normalizeString(a.title).indexOf(q) !== -1;
      const inExcerpt = this._normalizeString(a.excerpt).indexOf(q) !== -1;
      const inContent = this._normalizeString(a.content).indexOf(q) !== -1;
      const tags = Array.isArray(a.tags) ? a.tags : [];
      let inTags = false;
      for (let j = 0; j < tags.length; j++) {
        if (this._normalizeString(tags[j]).indexOf(q) !== -1) {
          inTags = true;
          break;
        }
      }

      if (inTitle || inExcerpt || inContent || inTags) {
        result.push(a);
      }
    }

    return result;
  }

  // getBlogArticle(article_id)
  getBlogArticle(article_id) {
    const articles = this._getFromStorage('blog_articles', []);
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === article_id) {
        return articles[i];
      }
    }
    return null;
  }

  // getMarketplaceFilterOptions()
  getMarketplaceFilterOptions() {
    return {
      price: {
        min_default: 0,
        max_default: 1000,
        step: 5
      },
      rating_options: [
        { value: 4, label: '4 stars & up' },
        { value: 3, label: '3 stars & up' },
        { value: 2, label: '2 stars & up' },
        { value: 1, label: '1 star & up' }
      ],
      sort_options: [
        { value: 'newest_listings', label: 'Newest listings' },
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' }
      ],
      category_options: [
        { value: 'furniture', label: 'Furniture' },
        { value: 'art', label: 'Art' },
        { value: 'jewelry', label: 'Jewelry' },
        { value: 'collectibles', label: 'Collectibles' },
        { value: 'tools', label: 'Tools' },
        { value: 'appliances', label: 'Appliances' },
        { value: 'home_decor', label: 'Home decor' },
        { value: 'electronics', label: 'Electronics' },
        { value: 'vehicles', label: 'Vehicles' },
        { value: 'other', label: 'Other' }
      ]
    };
  }

  // searchMarketplaceItems(query, min_price, max_price, min_rating, category, only_vintage, sort)
  searchMarketplaceItems(query, min_price, max_price, min_rating, category, only_vintage, sort) {
    const items = this._getFromStorage('items', []);
    const sales = this._getFromStorage('estate_sales', []);
    const q = this._normalizeString(query);
    const minPrice = typeof min_price === 'number' ? min_price : null;
    const maxPrice = typeof max_price === 'number' ? max_price : null;
    const minRating = typeof min_rating === 'number' ? min_rating : null;
    const onlyVintage = !!only_vintage;

    const saleById = {};
    for (let i = 0; i < sales.length; i++) {
      saleById[sales[i].id] = sales[i];
    }

    const filtered = [];
    for (let j = 0; j < items.length; j++) {
      const item = items[j];

      if (item.is_active === false) continue;

      // Hierarchical: ensure associated estate sale is not cancelled
      const sale = saleById[item.estate_sale_id];
      if (!sale) continue;
      if (sale.status && sale.status === 'cancelled') continue;

      if (onlyVintage && !item.is_vintage) continue;

      if (category && item.category !== category) continue;

      if (minPrice != null && (!(typeof item.price === 'number') || item.price < minPrice)) continue;
      if (maxPrice != null && (!(typeof item.price === 'number') || item.price > maxPrice)) continue;

      if (minRating != null) {
        const ratingValue = typeof item.rating === 'number' ? item.rating : 0;
        if (ratingValue < minRating) continue;
      }

      if (q) {
        const inTitle = this._normalizeString(item.title).indexOf(q) !== -1;
        const inDesc = this._normalizeString(item.description).indexOf(q) !== -1;
        if (!inTitle && !inDesc) continue;
      }

      filtered.push(item);
    }

    if (sort === 'price_low_to_high') {
      filtered.sort(function (a, b) {
        return (a.price || 0) - (b.price || 0);
      });
    } else if (sort === 'price_high_to_low') {
      filtered.sort(function (a, b) {
        return (b.price || 0) - (a.price || 0);
      });
    } else if (sort === 'newest_listings') {
      filtered.sort(function (a, b) {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
    }

    return {
      items: filtered,
      total_results: filtered.length
    };
  }

  // getItemDetail(item_id)
  getItemDetail(item_id) {
    const items = this._getFromStorage('items', []);
    const sales = this._getFromStorage('estate_sales', []);

    let item = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === item_id) {
        item = items[i];
        break;
      }
    }
    if (!item) {
      return { item: null, estate_sale: null };
    }

    let sale = null;
    for (let j = 0; j < sales.length; j++) {
      if (sales[j].id === item.estate_sale_id) {
        sale = sales[j];
        break;
      }
    }

    return {
      item: item,
      estate_sale: sale
    };
  }

  // addItemToCart(item_id, quantity)
  addItemToCart(item_id, quantity) {
    const items = this._getFromStorage('items', []);
    let item = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === item_id) {
        item = items[i];
        break;
      }
    }
    if (!item) {
      return { success: false, cart: null };
    }

    const qty = (typeof quantity === 'number' && quantity > 0) ? quantity : 1;

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    let existing = null;
    for (let j = 0; j < cartItems.length; j++) {
      if (cartItems[j].cart_id === cart.id && cartItems[j].item_id === item_id) {
        existing = cartItems[j];
        break;
      }
    }

    if (existing) {
      existing.quantity = (existing.quantity || 1) + qty;
    } else {
      const cartItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        item_id: item_id,
        estate_sale_id: item.estate_sale_id || null,
        quantity: qty,
        unit_price: typeof item.price === 'number' ? item.price : 0,
        added_at: new Date().toISOString()
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveCart(cart);

    // Return updated cart
    const updatedCartData = this.getCart();
    return { success: true, cart: updatedCartData.cart };
  }

  // getCart()
  getCart() {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const items = this._getFromStorage('items', []);
    const sales = this._getFromStorage('estate_sales', []);

    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'open') {
        cart = carts[i];
        break;
      }
    }

    if (!cart) {
      return { cart: null, line_items: [] };
    }

    const line_items = [];
    for (let j = 0; j < cartItems.length; j++) {
      const ci = cartItems[j];
      if (ci.cart_id !== cart.id) continue;

      let item = null;
      let sale = null;

      for (let k = 0; k < items.length; k++) {
        if (items[k].id === ci.item_id) {
          item = items[k];
          break;
        }
      }

      if (ci.estate_sale_id) {
        for (let m = 0; m < sales.length; m++) {
          if (sales[m].id === ci.estate_sale_id) {
            sale = sales[m];
            break;
          }
        }
      }

      line_items.push({
        cart_item: ci,
        item: item,
        estate_sale: sale
      });
    }

    // Ensure financials are up to date
    this._saveCart(cart);
    const refreshedCarts = this._getFromStorage('carts', []);
    for (let n = 0; n < refreshedCarts.length; n++) {
      if (refreshedCarts[n].id === cart.id) {
        cart = refreshedCarts[n];
        break;
      }
    }

    return { cart: cart, line_items: line_items };
  }

  // setCartPaymentMethod(payment_method)
  setCartPaymentMethod(payment_method) {
    const cart = this._getOrCreateCart();
    cart.payment_method = payment_method;
    this._saveCart(cart);

    const updated = this.getCart();
    return { success: true, cart: updated.cart };
  }

  // updateCartItemQuantity(cart_item_id, quantity)
  updateCartItemQuantity(cart_item_id, quantity) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      // Treat non-positive quantity as removal
      return this.removeCartItem(cart_item_id);
    }

    let cartItems = this._getFromStorage('cart_items', []);
    let target = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cart_item_id) {
        cartItems[i].quantity = quantity;
        target = cartItems[i];
        break;
      }
    }

    if (!target) {
      return { success: false, cart: null };
    }

    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    this._saveCart(cart);

    const updated = this.getCart();
    return { success: true, cart: updated.cart };
  }

  // removeCartItem(cart_item_id)
  removeCartItem(cart_item_id) {
    let cartItems = this._getFromStorage('cart_items', []);
    let removed = false;

    const remaining = [];
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cart_item_id) {
        removed = true;
        continue;
      }
      remaining.push(cartItems[i]);
    }

    if (!removed) {
      return { success: false, cart: null };
    }

    this._saveToStorage('cart_items', remaining);

    const cart = this._getOrCreateCart();
    this._saveCart(cart);

    const updated = this.getCart();
    return { success: true, cart: updated.cart };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const about = this._getFromStorage('about_page_content', {
      company_name: '',
      mission: '',
      history: '',
      service_areas: [],
      team_highlights: [],
      testimonials: [],
      affiliations: []
    });
    return about;
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
