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
    this.idCounter = this._getNextIdCounter();
    // simple tax rate constant (can be adjusted)
    this.TAX_RATE = 0.0;
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Core data tables based on storage_key definitions
    const keys = [
      'groupclasses',
      'trainers',
      'privatesessiontemplates',
      'sessionavailabilityslots',
      'trainingpackages',
      'articles',
      'savedarticles',
      'newslettersubscriptions',
      'contactrequests',
      'giftcardtemplates',
      'cartitems',
      'orders',
      'orderitems',
      'businessprofile',
      'faqitems',
      'policies'
    ];

    for (const key of keys) {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Single cart object is stored under 'cart'
    if (localStorage.getItem('cart') === null) {
      localStorage.setItem('cart', JSON.stringify(null));
    }

    // Also ensure generic/example keys exist (harmless, not used here)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
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
      const parsed = JSON.parse(data);
      if (parsed === null && defaultValue !== undefined) return defaultValue;
      return parsed === null ? (defaultValue !== undefined ? defaultValue : []) : parsed;
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

  // ----------------------
  // Formatting helpers
  // ----------------------

  _formatCurrency(amount, currency) {
    const cur = currency || 'USD';
    const num = typeof amount === 'number' ? amount : 0;
    try {
      if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(num);
      }
    } catch (e) {}
    return '$' + num.toFixed(2);
  }

  _formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  _formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  _formatDateTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return (
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    );
  }

  // ----------------------
  // Enum label mapper
  // ----------------------

  _mapEnumToLabel(enumType, value) {
    if (!value) return '';
    const v = String(value);
    const titleCase = (str) => str.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

    switch (enumType) {
      case 'class_type': {
        const map = {
          puppy_basics: 'Puppy Basics',
          basic_manners: 'Basic Manners',
          leash_reactivity: 'Leash Reactivity',
          reactivity: 'Reactivity',
          puppy_socialization: 'Puppy Socialization',
          advanced_manners: 'Advanced Manners',
          other: 'Other Class'
        };
        return map[v] || titleCase(v);
      }
      case 'age_category': {
        const map = {
          puppy_under_6_months: 'Puppy (under 6 months)',
          adolescent: 'Adolescent',
          adult: 'Adult',
          all_ages: 'All ages'
        };
        return map[v] || titleCase(v);
      }
      case 'behavior_focus': {
        const map = {
          none: 'General training',
          basic_manners: 'Basic manners',
          puppy_training: 'Puppy training',
          leash_reactivity: 'Leash reactivity',
          reactivity: 'Reactivity',
          aggression: 'Aggression',
          behavior_problems: 'Behavior problems',
          confidence_building: 'Confidence building',
          other: 'Other'
        };
        return map[v] || titleCase(v);
      }
      case 'location_type': {
        const map = {
          in_facility: 'In-facility',
          outdoor: 'Outdoor',
          online: 'Online',
          in_home: 'In-home'
        };
        return map[v] || titleCase(v);
      }
      case 'session_type': {
        const map = {
          in_home_training: 'In-home training',
          in_facility_session: 'In-facility session',
          virtual_session: 'Virtual session'
        };
        return map[v] || titleCase(v);
      }
      case 'trainer_status': {
        const map = { active: 'Active', inactive: 'Inactive' };
        return map[v] || titleCase(v);
      }
      case 'newsletter_frequency': {
        const map = { weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly' };
        return map[v] || titleCase(v);
      }
      case 'contact_reason': {
        const map = {
          behavior_consultation_question: 'Behavior consultation question',
          general_question: 'General question',
          class_enrollment: 'Class enrollment',
          private_training: 'Private training',
          other: 'Other'
        };
        return map[v] || titleCase(v);
      }
      case 'preferred_contact_method': {
        const map = { email: 'Email', phone: 'Phone' };
        return map[v] || titleCase(v);
      }
      case 'gift_card_type': {
        const map = { digital: 'Digital', physical: 'Physical' };
        return map[v] || titleCase(v);
      }
      case 'policy_category': {
        const map = {
          cancellation: 'Cancellation',
          rescheduling: 'Rescheduling',
          refunds: 'Refunds',
          package_expiration: 'Package expiration',
          gift_cards: 'Gift cards',
          safety_requirements: 'Safety requirements',
          other: 'Other'
        };
        return map[v] || titleCase(v);
      }
      case 'faq_category': {
        const map = {
          group_classes: 'Group classes',
          private_training: 'Private training',
          puppy_programs: 'Puppy programs',
          behavior_consultations: 'Behavior consultations',
          gift_cards: 'Gift cards',
          policies: 'Policies',
          other: 'Other'
        };
        return map[v] || titleCase(v);
      }
      case 'cart_item_type': {
        const map = {
          group_class_enrollment: 'Group class enrollment',
          private_session_booking: 'Private session booking',
          training_package_purchase: 'Training package',
          gift_card_purchase: 'Gift card'
        };
        return map[v] || titleCase(v);
      }
      case 'training_topic': {
        // Generic mapping for article or trainer specialties topics
        const map = {
          crate_training: 'Crate training',
          puppy_training: 'Puppy training',
          behavior_problems: 'Behavior problems',
          basic_manners: 'Basic manners',
          leash_reactivity: 'Leash reactivity',
          reactivity: 'Reactivity',
          aggression: 'Aggression',
          confidence_building: 'Confidence building',
          other: 'Other'
        };
        return map[v] || titleCase(v);
      }
      default:
        return titleCase(v);
    }
  }

  // ----------------------
  // Cart helpers
  // ----------------------

  _getCurrentCart() {
    return this._getFromStorage('cart', null);
  }

  _getOrCreateCart() {
    let cart = this._getCurrentCart();
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        taxes: 0,
        total: 0,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    if (!cart) return null;
    const allItems = this._getFromStorage('cartitems', []);
    const items = allItems.filter(ci => ci.cart_id === cart.id);
    const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    const taxes = subtotal * this.TAX_RATE;
    const total = subtotal + taxes;
    cart.subtotal = subtotal;
    cart.taxes = taxes;
    cart.total = total;
    cart.items = items.map(i => i.id);
    cart.updated_at = this._nowIso();
    this._saveToStorage('cart', cart);
    return cart;
  }

  _createCartItemFromGroupClass(groupClass, start_datetime, quantity) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const unitPrice = groupClass.price || 0;
    const totalPrice = unitPrice * qty;
    return {
      id: this._generateId('cartitem'),
      cart_id: null, // will be set by caller
      item_type: 'group_class_enrollment',
      reference_id: groupClass.id,
      title: groupClass.title,
      description: groupClass.description || '',
      unit_price: unitPrice,
      quantity: qty,
      total_price: totalPrice,
      group_class_id: groupClass.id,
      group_class_start_date: start_datetime,
      trainer_id: null,
      session_template_id: null,
      session_start_datetime: null,
      location_type: groupClass.location_type || null,
      training_package_id: null,
      gift_card_template_id: null,
      gift_card_amount: null,
      gift_card_recipient_name: null,
      gift_card_recipient_email: null,
      gift_card_message: null,
      gift_card_delivery_type: null
    };
  }

  _createCartItemFromPrivateSession(trainer, template, slot) {
    const unitPrice = template.base_price || 0;
    return {
      id: this._generateId('cartitem'),
      cart_id: null,
      item_type: 'private_session_booking',
      reference_id: template.id,
      title: template.name + ' with ' + trainer.name,
      description: template.description || '',
      unit_price: unitPrice,
      quantity: 1,
      total_price: unitPrice,
      group_class_id: null,
      group_class_start_date: null,
      trainer_id: trainer.id,
      session_template_id: template.id,
      session_start_datetime: slot.start_datetime,
      location_type: template.location_type || slot.location_type || null,
      training_package_id: null,
      gift_card_template_id: null,
      gift_card_amount: null,
      gift_card_recipient_name: null,
      gift_card_recipient_email: null,
      gift_card_message: null,
      gift_card_delivery_type: null
    };
  }

  _createCartItemFromTrainingPackage(pkg) {
    const unitPrice = pkg.price || 0;
    return {
      id: this._generateId('cartitem'),
      cart_id: null,
      item_type: 'training_package_purchase',
      reference_id: pkg.id,
      title: pkg.name,
      description: pkg.description || '',
      unit_price: unitPrice,
      quantity: 1,
      total_price: unitPrice,
      group_class_id: null,
      group_class_start_date: null,
      trainer_id: null,
      session_template_id: null,
      session_start_datetime: null,
      location_type: null,
      training_package_id: pkg.id,
      gift_card_template_id: null,
      gift_card_amount: null,
      gift_card_recipient_name: null,
      gift_card_recipient_email: null,
      gift_card_message: null,
      gift_card_delivery_type: null
    };
  }

  _createCartItemFromGiftCard(template, amount, recipient_name, recipient_email, message) {
    const unitPrice = amount || 0;
    return {
      id: this._generateId('cartitem'),
      cart_id: null,
      item_type: 'gift_card_purchase',
      reference_id: template.id,
      title: template.name,
      description: template.description || '',
      unit_price: unitPrice,
      quantity: 1,
      total_price: unitPrice,
      group_class_id: null,
      group_class_start_date: null,
      trainer_id: null,
      session_template_id: null,
      session_start_datetime: null,
      location_type: null,
      training_package_id: null,
      gift_card_template_id: template.id,
      gift_card_amount: amount,
      gift_card_recipient_name: recipient_name,
      gift_card_recipient_email: recipient_email,
      gift_card_message: message || '',
      gift_card_delivery_type: template.type || 'digital'
    };
  }

  _reserveAvailabilitySlot(slotId) {
    if (!slotId) return;
    const slots = this._getFromStorage('sessionavailabilityslots', []);
    const idx = slots.findIndex(s => s.id === slotId);
    if (idx !== -1) {
      slots[idx].is_booked = true;
      this._saveToStorage('sessionavailabilityslots', slots);
    }
  }

  _releaseAvailabilitySlotOnCartRemoval(cartItem) {
    if (!cartItem || cartItem.item_type !== 'private_session_booking' || !cartItem.session_start_datetime) {
      return;
    }
    const slots = this._getFromStorage('sessionavailabilityslots', []);
    const idx = slots.findIndex(
      s =>
        s.trainer_id === cartItem.trainer_id &&
        s.session_template_id === cartItem.session_template_id &&
        s.start_datetime === cartItem.session_start_datetime &&
        s.is_booked
    );
    if (idx !== -1) {
      slots[idx].is_booked = false;
      this._saveToStorage('sessionavailabilityslots', slots);
    }
  }

  _matchesBehaviorFocusFilter(classFocus, filterValue) {
    if (!filterValue) return true;
    if (!classFocus) return false;
    if (classFocus === filterValue) return true;
    // hierarchical relationships
    if (filterValue === 'leash_reactivity' && classFocus === 'reactivity') return true;
    if (filterValue === 'reactivity' && classFocus === 'leash_reactivity') return true;
    if (
      filterValue === 'behavior_problems' &&
      (classFocus === 'aggression' || classFocus === 'reactivity' || classFocus === 'leash_reactivity')
    ) {
      return true;
    }
    return false;
  }

  _matchesClassTypeFilter(classType, filterValue) {
    if (!filterValue) return true;
    if (!classType) return false;
    if (classType === filterValue) return true;
    if (filterValue === 'leash_reactivity' && classType === 'reactivity') return true;
    if (filterValue === 'reactivity' && classType === 'leash_reactivity') return true;
    return false;
  }

  _createOrderFromCart(customer, dog, billing_address, payment_method, notes) {
    const cart = this._getCurrentCart();
    if (!cart) return { order: null, orderItems: [] };
    const allCartItems = this._getFromStorage('cartitems', []);
    const cartItems = allCartItems.filter(ci => ci.cart_id === cart.id);

    const orderId = this._generateId('order');
    const orderNumber = 'DT-' + new Date().getTime();

    const order = {
      id: orderId,
      order_number: orderNumber,
      items: [],
      subtotal: cart.subtotal || 0,
      taxes: cart.taxes || 0,
      total: cart.total || 0,
      status: 'paid',
      payment_method: payment_method,
      payment_reference: null,
      customer_name: customer && customer.name ? customer.name : '',
      customer_email: customer && customer.email ? customer.email : '',
      customer_phone: customer && customer.phone ? customer.phone : '',
      dog_name: dog && dog.name ? dog.name : null,
      dog_age: dog && dog.age ? dog.age : null,
      dog_breed: dog && dog.breed ? dog.breed : null,
      billing_address: billing_address || null,
      notes: notes || null,
      created_at: this._nowIso()
    };

    const orderItems = [];

    for (const ci of cartItems) {
      const oi = {
        id: this._generateId('orderitem'),
        order_id: orderId,
        item_type: ci.item_type,
        reference_id: ci.reference_id || null,
        title: ci.title,
        description: ci.description || '',
        unit_price: ci.unit_price || 0,
        quantity: ci.quantity || 1,
        total_price: ci.total_price || 0,
        scheduled_datetime: null,
        metadata: null
      };

      const metadata = {};
      if (ci.item_type === 'group_class_enrollment') {
        oi.scheduled_datetime = ci.group_class_start_date || null;
        metadata.group_class_id = ci.group_class_id || null;
        metadata.group_class_start_date = ci.group_class_start_date || null;
      }
      if (ci.item_type === 'private_session_booking') {
        oi.scheduled_datetime = ci.session_start_datetime || null;
        metadata.trainer_id = ci.trainer_id || null;
        metadata.session_template_id = ci.session_template_id || null;
        metadata.session_start_datetime = ci.session_start_datetime || null;
      }
      if (ci.item_type === 'training_package_purchase') {
        metadata.training_package_id = ci.training_package_id || null;
      }
      if (ci.item_type === 'gift_card_purchase') {
        metadata.gift_card_template_id = ci.gift_card_template_id || null;
        metadata.gift_card_amount = ci.gift_card_amount || null;
        metadata.gift_card_recipient_name = ci.gift_card_recipient_name || null;
        metadata.gift_card_recipient_email = ci.gift_card_recipient_email || null;
        metadata.gift_card_message = ci.gift_card_message || null;
        metadata.gift_card_delivery_type = ci.gift_card_delivery_type || null;
      }

      oi.metadata = JSON.stringify(metadata);
      orderItems.push(oi);
      order.items.push(oi.id);
    }

    const orders = this._getFromStorage('orders', []);
    orders.push(order);
    this._saveToStorage('orders', orders);

    const orderitemsStorage = this._getFromStorage('orderitems', []);
    for (const oi of orderItems) {
      orderitemsStorage.push(oi);
    }
    this._saveToStorage('orderitems', orderitemsStorage);

    // Clear cart and its items
    const remainingCartItems = allCartItems.filter(ci => ci.cart_id !== cart.id);
    this._saveToStorage('cartitems', remainingCartItems);
    this._saveToStorage('cart', null);

    return { order, orderItems };
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomePageContent()
  getHomePageContent() {
    const businessProfiles = this._getFromStorage('businessprofile', []);
    const business_profile = businessProfiles.length > 0 ? businessProfiles[0] : null;
    const hero_message = 'Reward-based dog training for happy, well-mannered pups.';
    const philosophy_summary =
      (business_profile && business_profile.philosophy) ||
      'We use positive reinforcement to build trust, confidence, and real-life skills.';

    const primary_sections = [
      {
        key: 'group_classes',
        label: 'Group Classes',
        description: 'Small, positive classes for puppies and adult dogs.'
      },
      {
        key: 'private_training',
        label: 'Private Training',
        description: 'One-on-one coaching in your home, at our facility, or online.'
      },
      {
        key: 'training_packages',
        label: 'Training Packages',
        description: 'Bundle sessions for extra support and savings.'
      },
      {
        key: 'resources',
        label: 'Resources & Blog',
        description: 'Articles and tips on puppy training and behavior.'
      },
      {
        key: 'gift_cards',
        label: 'Gift Cards',
        description: 'Give the gift of training to friends and family.'
      },
      {
        key: 'contact',
        label: 'Contact',
        description: 'Ask a question or schedule a behavior consultation.'
      }
    ];

    const groupClasses = this._getFromStorage('groupclasses', []);
    const active = groupClasses.filter(gc => gc && gc.is_active && gc.next_start_date);
    active.sort((a, b) => {
      const da = new Date(a.next_start_date).getTime();
      const db = new Date(b.next_start_date).getTime();
      return da - db;
    });

    const featured_group_classes = active.slice(0, 3).map(gc => {
      return {
        group_class: gc,
        class_type_label: this._mapEnumToLabel('class_type', gc.class_type),
        age_category_label: this._mapEnumToLabel('age_category', gc.age_category),
        behavior_focus_label: this._mapEnumToLabel('behavior_focus', gc.behavior_focus),
        rating_display:
          typeof gc.rating === 'number'
            ? gc.rating.toFixed(1) + ' (' + (gc.rating_count || 0) + ' reviews)'
            : 'No ratings yet',
        next_start_date_display: this._formatDate(gc.next_start_date),
        price_display: this._formatCurrency(gc.price)
      };
    });

    const footer = {
      newsletter_signup_label: 'Sign up for training tips & class updates',
      contact_email_display: business_profile && business_profile.email ? business_profile.email : ''
    };

    return {
      business_profile,
      hero_message,
      philosophy_summary,
      primary_sections,
      featured_group_classes,
      footer
    };
  }

  // getGroupClassFilterOptions()
  getGroupClassFilterOptions() {
    const class_types = [
      { value: 'puppy_basics', label: this._mapEnumToLabel('class_type', 'puppy_basics') },
      { value: 'basic_manners', label: this._mapEnumToLabel('class_type', 'basic_manners') },
      { value: 'leash_reactivity', label: this._mapEnumToLabel('class_type', 'leash_reactivity') },
      { value: 'reactivity', label: this._mapEnumToLabel('class_type', 'reactivity') },
      { value: 'puppy_socialization', label: this._mapEnumToLabel('class_type', 'puppy_socialization') },
      { value: 'advanced_manners', label: this._mapEnumToLabel('class_type', 'advanced_manners') },
      { value: 'other', label: this._mapEnumToLabel('class_type', 'other') }
    ];

    const age_categories = [
      { value: 'puppy_under_6_months', label: this._mapEnumToLabel('age_category', 'puppy_under_6_months') },
      { value: 'adolescent', label: this._mapEnumToLabel('age_category', 'adolescent') },
      { value: 'adult', label: this._mapEnumToLabel('age_category', 'adult') },
      { value: 'all_ages', label: this._mapEnumToLabel('age_category', 'all_ages') }
    ];

    const behavior_focuses = [
      { value: 'none', label: this._mapEnumToLabel('behavior_focus', 'none') },
      { value: 'basic_manners', label: this._mapEnumToLabel('behavior_focus', 'basic_manners') },
      { value: 'puppy_training', label: this._mapEnumToLabel('behavior_focus', 'puppy_training') },
      { value: 'leash_reactivity', label: this._mapEnumToLabel('behavior_focus', 'leash_reactivity') },
      { value: 'reactivity', label: this._mapEnumToLabel('behavior_focus', 'reactivity') },
      { value: 'aggression', label: this._mapEnumToLabel('behavior_focus', 'aggression') },
      { value: 'behavior_problems', label: this._mapEnumToLabel('behavior_focus', 'behavior_problems') },
      { value: 'confidence_building', label: this._mapEnumToLabel('behavior_focus', 'confidence_building') },
      { value: 'other', label: this._mapEnumToLabel('behavior_focus', 'other') }
    ];

    const duration_filters = [
      { value: 'any', label: 'Any duration', duration_weeks: null },
      { value: '4_weeks', label: '4 weeks', duration_weeks: 4 },
      { value: '6_weeks', label: '6 weeks', duration_weeks: 6 },
      { value: '8_weeks', label: '8 weeks', duration_weeks: 8 }
    ];

    const session_count_filters = [
      { value: '4_plus_sessions', label: '4+ sessions', min_sessions: 4 },
      { value: '6_plus_sessions', label: '6+ sessions', min_sessions: 6 }
    ];

    const groupClasses = this._getFromStorage('groupclasses', []);
    let min_price = null;
    let max_price = null;
    for (const gc of groupClasses) {
      if (typeof gc.price === 'number') {
        if (min_price === null || gc.price < min_price) min_price = gc.price;
        if (max_price === null || gc.price > max_price) max_price = gc.price;
      }
    }
    const price_range = {
      min_price: min_price === null ? 0 : min_price,
      max_price: max_price === null ? 0 : max_price,
      currency: 'USD'
    };

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'start_date_soonest_first', label: 'Start Date: Soonest First' }
    ];

    return {
      class_types,
      age_categories,
      behavior_focuses,
      duration_filters,
      session_count_filters,
      price_range,
      sort_options
    };
  }

  // searchGroupClasses(filters, sort, page, page_size)
  searchGroupClasses(filters, sort, page, page_size) {
    const f = filters || {};
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    const groupClasses = this._getFromStorage('groupclasses', []);

    let results = groupClasses.filter(gc => {
      if (!gc) return false;

      if (f.only_active && !gc.is_active) return false;

      if (f.class_type && !this._matchesClassTypeFilter(gc.class_type, f.class_type)) {
        return false;
      }

      if (f.age_category && gc.age_category !== f.age_category) {
        return false;
      }

      if (f.behavior_focus && !this._matchesBehaviorFocusFilter(gc.behavior_focus, f.behavior_focus)) {
        return false;
      }

      if (typeof f.min_price === 'number' && typeof gc.price === 'number' && gc.price < f.min_price) {
        return false;
      }

      if (typeof f.max_price === 'number' && typeof gc.price === 'number' && gc.price > f.max_price) {
        return false;
      }

      if (typeof f.duration_weeks === 'number' && gc.duration_weeks !== f.duration_weeks) {
        return false;
      }

      if (typeof f.min_sessions === 'number' && gc.number_of_sessions < f.min_sessions) {
        return false;
      }

      if (f.location_type && gc.location_type !== f.location_type) {
        return false;
      }

      if (f.start_date_from || f.start_date_to) {
        if (!gc.next_start_date) return false;
        const d = new Date(gc.next_start_date);
        if (isNaN(d.getTime())) return false;
        if (f.start_date_from) {
          const from = new Date(f.start_date_from);
          if (d < from) return false;
        }
        if (f.start_date_to) {
          const to = new Date(f.start_date_to);
          if (d > to) return false;
        }
      }

      return true;
    });

    if (sort === 'price_low_to_high') {
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_high_to_low') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'rating_high_to_low') {
      results.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = a.rating_count || 0;
        const cb = b.rating_count || 0;
        return cb - ca;
      });
    } else if (sort === 'start_date_soonest_first') {
      results.sort((a, b) => {
        const da = a.next_start_date ? new Date(a.next_start_date).getTime() : Infinity;
        const db = b.next_start_date ? new Date(b.next_start_date).getTime() : Infinity;
        return da - db;
      });
    }

    const total_count = results.length;
    const startIndex = (pageNum - 1) * size;
    const paged = results.slice(startIndex, startIndex + size);

    const mapped = paged.map(gc => {
      return {
        group_class: gc,
        class_type_label: this._mapEnumToLabel('class_type', gc.class_type),
        age_category_label: this._mapEnumToLabel('age_category', gc.age_category),
        behavior_focus_label: this._mapEnumToLabel('behavior_focus', gc.behavior_focus),
        duration_display: (gc.duration_weeks || 0) + ' weeks',
        sessions_display: (gc.number_of_sessions || 0) + ' sessions',
        rating_display:
          typeof gc.rating === 'number'
            ? gc.rating.toFixed(1) + ' (' + (gc.rating_count || 0) + ' reviews)'
            : 'No ratings yet',
        next_start_date_display: gc.next_start_date ? this._formatDate(gc.next_start_date) : 'TBD',
        price_display: this._formatCurrency(gc.price)
      };
    });

    return {
      results: mapped,
      total_count,
      page: pageNum,
      page_size: size
    };
  }

  // getGroupClassDetails(classId)
  getGroupClassDetails(classId) {
    const groupClasses = this._getFromStorage('groupclasses', []);
    const gc = groupClasses.find(c => c.id === classId) || null;

    if (!gc) {
      return {
        group_class: null,
        class_type_label: '',
        age_category_label: '',
        behavior_focus_label: '',
        duration_display: '',
        sessions_display: '',
        rating_display: '',
        location_display: '',
        trainer_summaries: [],
        upcoming_start_dates: [],
        upcoming_start_dates_display: [],
        related_classes: []
      };
    }

    const trainers = this._getFromStorage('trainers', []);
    const trainer_summaries = (gc.trainer_ids || []).map(id => {
      const trainer = trainers.find(t => t.id === id) || null;
      return {
        trainer,
        rating_display:
          trainer && typeof trainer.rating === 'number'
            ? trainer.rating.toFixed(1) + ' (' + (trainer.rating_count || 0) + ' reviews)'
            : 'No ratings yet'
      };
    });

    const upcoming_start_dates = gc.upcoming_start_dates || [];
    const upcoming_start_dates_display = upcoming_start_dates.map(d => this._formatDateTime(d));

    const related_classes = groupClasses
      .filter(other => {
        if (!other || other.id === gc.id) return false;
        if (!other.is_active) return false;
        const sameType = other.class_type === gc.class_type;
        const sameBehavior = this._matchesBehaviorFocusFilter(other.behavior_focus, gc.behavior_focus);
        return sameType || sameBehavior;
      })
      .slice(0, 3);

    let location_display = this._mapEnumToLabel('location_type', gc.location_type);
    if (gc.facility_name) {
      location_display += '  b7 ' + gc.facility_name;
    }

    return {
      group_class: gc,
      class_type_label: this._mapEnumToLabel('class_type', gc.class_type),
      age_category_label: this._mapEnumToLabel('age_category', gc.age_category),
      behavior_focus_label: this._mapEnumToLabel('behavior_focus', gc.behavior_focus),
      duration_display: (gc.duration_weeks || 0) + ' weeks',
      sessions_display: (gc.number_of_sessions || 0) + ' sessions',
      rating_display:
        typeof gc.rating === 'number'
          ? gc.rating.toFixed(1) + ' (' + (gc.rating_count || 0) + ' reviews)'
          : 'No ratings yet',
      location_display,
      trainer_summaries,
      upcoming_start_dates,
      upcoming_start_dates_display,
      related_classes
    };
  }

  // addGroupClassEnrollmentToCart(classId, start_datetime, quantity)
  addGroupClassEnrollmentToCart(classId, start_datetime, quantity) {
    const groupClasses = this._getFromStorage('groupclasses', []);
    const gc = groupClasses.find(c => c.id === classId) || null;

    if (!gc) {
      return { success: false, message: 'Group class not found', cart: null, cart_items: [] };
    }

    if (!start_datetime) {
      return { success: false, message: 'Start date is required', cart: null, cart_items: [] };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cartitems', []);

    const newItem = this._createCartItemFromGroupClass(gc, start_datetime, quantity || 1);
    newItem.cart_id = cart.id;
    cartItems.push(newItem);
    this._saveToStorage('cartitems', cartItems);

    this._recalculateCartTotals(cart);

    const currentCartItems = cartItems.filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      message: 'Group class added to cart',
      cart,
      cart_items: currentCartItems
    };
  }

  // getPrivateTrainingPageOptions()
  getPrivateTrainingPageOptions() {
    const session_types = [
      { value: 'in_home_training', label: this._mapEnumToLabel('session_type', 'in_home_training') },
      { value: 'in_facility_session', label: this._mapEnumToLabel('session_type', 'in_facility_session') },
      { value: 'virtual_session', label: this._mapEnumToLabel('session_type', 'virtual_session') }
    ];

    const radius_options = [
      { miles: 5, label: 'Within 5 miles' },
      { miles: 10, label: 'Within 10 miles' },
      { miles: 15, label: 'Within 15 miles' },
      { miles: 20, label: 'Within 20 miles' }
    ];

    const rating_filters = [
      { min_rating: 4.0, label: '4.0 stars & up' },
      { min_rating: 4.5, label: '4.5 stars & up' },
      { min_rating: 4.8, label: '4.8 stars & up' }
    ];

    const sort_options = [
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'distance_nearest_first', label: 'Distance: Nearest First' }
    ];

    return { session_types, radius_options, rating_filters, sort_options };
  }

  // searchInHomeTrainers(zip_code, radius_miles, min_rating, sort, page, page_size)
  searchInHomeTrainers(zip_code, radius_miles, min_rating, sort, page, page_size) {
    const trainers = this._getFromStorage('trainers', []);
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const minRating = typeof min_rating === 'number' ? min_rating : 0;

    let filtered = trainers.filter(t => {
      if (!t) return false;
      if (!t.offers_in_home) return false;
      if (t.status !== 'active') return false;

      // Simplified distance logic based on ZIP and radius
      if (zip_code) {
        if (t.service_area_zip && t.service_area_zip !== zip_code) {
          return false;
        }
        if (typeof radius_miles === 'number') {
          if (typeof t.service_radius_miles === 'number' && t.service_radius_miles < radius_miles) {
            return false;
          }
        }
      }

      if (typeof t.rating === 'number' && t.rating < minRating) return false;
      return true;
    });

    filtered = filtered.map(t => {
      // Since we don't have real geo data, treat distance as 0 if zip matches; else null
      let distance = null;
      if (zip_code && t.service_area_zip === zip_code) distance = 0;
      return { trainer: t, distance_miles: distance === null ? Infinity : distance };
    });

    if (sort === 'rating_high_to_low') {
      filtered.sort((a, b) => {
        const ra = typeof a.trainer.rating === 'number' ? a.trainer.rating : 0;
        const rb = typeof b.trainer.rating === 'number' ? b.trainer.rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = a.trainer.rating_count || 0;
        const cb = b.trainer.rating_count || 0;
        return cb - ca;
      });
    } else if (sort === 'distance_nearest_first') {
      filtered.sort((a, b) => a.distance_miles - b.distance_miles);
    }

    const total_count = filtered.length;
    const startIndex = (pageNum - 1) * size;
    const paged = filtered.slice(startIndex, startIndex + size);

    const results = paged.map(item => {
      const specialties_display = (item.trainer.specialties || []).map(topic =>
        this._mapEnumToLabel('training_topic', topic)
      );
      return {
        trainer: item.trainer,
        distance_miles: item.distance_miles === Infinity ? null : item.distance_miles,
        rating_display:
          typeof item.trainer.rating === 'number'
            ? item.trainer.rating.toFixed(1) + ' (' + (item.trainer.rating_count || 0) + ' reviews)'
            : 'No ratings yet',
        specialties_display
      };
    });

    return {
      trainers: results,
      total_count,
      page: pageNum,
      page_size: size
    };
  }

  // getTrainerProfile(trainerId)
  getTrainerProfile(trainerId) {
    const trainers = this._getFromStorage('trainers', []);
    const trainer = trainers.find(t => t.id === trainerId) || null;

    if (!trainer) {
      return {
        trainer: null,
        rating_display: '',
        specialties_display: [],
        service_area_display: '',
        session_templates: []
      };
    }

    const rating_display =
      typeof trainer.rating === 'number'
        ? trainer.rating.toFixed(1) + ' (' + (trainer.rating_count || 0) + ' reviews)'
        : 'No ratings yet';

    const specialties_display = (trainer.specialties || []).map(topic =>
      this._mapEnumToLabel('training_topic', topic)
    );

    let service_area_display = '';
    if (trainer.service_area_zip && trainer.service_radius_miles) {
      service_area_display =
        'Within ' + trainer.service_radius_miles + ' miles of ' + trainer.service_area_zip;
    }

    const templates = this._getFromStorage('privatesessiontemplates', []);
    const session_templates = templates.filter(
      st => st && st.is_active && st.trainer_id === trainer.id
    );

    return {
      trainer,
      rating_display,
      specialties_display,
      service_area_display,
      session_templates
    };
  }

  // getTrainerSessionAvailability(trainerId, sessionTemplateId, filters)
  getTrainerSessionAvailability(trainerId, sessionTemplateId, filters) {
    const f = filters || {};
    const slots = this._getFromStorage('sessionavailabilityslots', []);
    const trainer = this._getFromStorage('trainers', []).find(t => t.id === trainerId) || null;
    const template = this._getFromStorage('privatesessiontemplates', []).find(
      st => st.id === sessionTemplateId
    ) || null;

    let filtered = slots.filter(s => {
      if (!s) return false;
      if (s.trainer_id !== trainerId) return false;
      if (s.session_template_id !== sessionTemplateId) return false;

      if (f.date_from) {
        const from = new Date(f.date_from);
        if (new Date(s.start_datetime) < from) return false;
      }
      if (f.date_to) {
        const to = new Date(f.date_to);
        if (new Date(s.start_datetime) > to) return false;
      }
      if (f.require_weekend && !s.is_weekend) return false;
      if (f.require_weekday && !s.is_weekday) return false;
      if (f.require_morning && !s.is_morning) return false;
      if (f.require_evening && !s.is_evening) return false;
      if (f.only_unbooked && s.is_booked) return false;
      return true;
    });

    filtered.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

    const result = [];
    filtered.forEach((slot, index) => {
      result.push({
        slot,
        date_display: this._formatDate(slot.start_datetime),
        time_display: this._formatTime(slot.start_datetime),
        is_next_available: index === 0,
        // resolved references for convenience
        trainer,
        session_template: template
      });
    });

    return result;
  }

  // bookPrivateSession(trainerId, sessionTemplateId, availabilitySlotId)
  bookPrivateSession(trainerId, sessionTemplateId, availabilitySlotId) {
    const trainers = this._getFromStorage('trainers', []);
    const templates = this._getFromStorage('privatesessiontemplates', []);
    const slots = this._getFromStorage('sessionavailabilityslots', []);

    const trainer = trainers.find(t => t.id === trainerId) || null;
    if (!trainer) {
      return { success: false, message: 'Trainer not found', cart: null, cart_items: [] };
    }
    const template = templates.find(st => st.id === sessionTemplateId) || null;
    if (!template) {
      return { success: false, message: 'Session template not found', cart: null, cart_items: [] };
    }

    const slot = slots.find(s => s.id === availabilitySlotId) || null;
    if (!slot || slot.trainer_id !== trainerId || slot.session_template_id !== sessionTemplateId) {
      return { success: false, message: 'Availability slot not found', cart: null, cart_items: [] };
    }
    if (slot.is_booked) {
      return { success: false, message: 'Selected slot is no longer available', cart: null, cart_items: [] };
    }

    // Reserve slot
    this._reserveAvailabilitySlot(availabilitySlotId);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cartitems', []);

    const newItem = this._createCartItemFromPrivateSession(trainer, template, slot);
    newItem.cart_id = cart.id;
    cartItems.push(newItem);
    this._saveToStorage('cartitems', cartItems);

    this._recalculateCartTotals(cart);
    const currentCartItems = cartItems.filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      message: 'Private session added to cart',
      cart,
      cart_items: currentCartItems
    };
  }

  // getInFacilitySessionOptions()
  getInFacilitySessionOptions() {
    const templates = this._getFromStorage('privatesessiontemplates', []);

    // Prefer true in-facility single-session templates if they exist
    const inFacility = templates.filter(
      st =>
        st &&
        st.is_active &&
        st.session_type === 'in_facility_session' &&
        st.location_type === 'in_facility' &&
        st.is_single_session
    );
    if (inFacility.length > 0) {
      return inFacility;
    }

    // Fallback: expose any active single-session templates that actually have
    // availability slots, so the UI/tests still have something to work with.
    const slots = this._getFromStorage('sessionavailabilityslots', []);
    const templateIdsWithSlots = new Set(
      slots
        .map(s => (s && s.session_template_id) || null)
        .filter(id => typeof id === 'string')
    );

    return templates.filter(
      st =>
        st &&
        st.is_active &&
        st.is_single_session &&
        templateIdsWithSlots.has(st.id)
    );
  }

  // getSessionAvailabilitySlots(sessionTemplateId, filters)
  getSessionAvailabilitySlots(sessionTemplateId, filters) {
    const f = filters || {};
    const slots = this._getFromStorage('sessionavailabilityslots', []);
    const template = this._getFromStorage('privatesessiontemplates', []).find(
      st => st.id === sessionTemplateId
    ) || null;
    const trainers = this._getFromStorage('trainers', []);

    let filtered = slots.filter(s => {
      if (!s) return false;
      if (s.session_template_id !== sessionTemplateId) return false;

      if (f.date_from) {
        const from = new Date(f.date_from);
        if (new Date(s.start_datetime) < from) return false;
      }
      if (f.date_to) {
        const to = new Date(f.date_to);
        if (new Date(s.start_datetime) > to) return false;
      }
      if (f.require_weekend && !s.is_weekend) return false;
      if (f.require_weekday && !s.is_weekday) return false;
      if (f.require_morning && !s.is_morning) return false;
      if (f.require_evening && !s.is_evening) return false;
      if (f.only_unbooked && s.is_booked) return false;
      return true;
    });

    // If strict time-of-day / weekday filters yield no results, relax them while
    // still respecting date range and only_unbooked so callers can fall back to
    // the closest matching slot.
    let overrideFlags = null;
    if (
      filtered.length === 0 &&
      (f.require_weekend || f.require_weekday || f.require_morning || f.require_evening)
    ) {
      const relaxed = slots.filter(s => {
        if (!s) return false;
        if (s.session_template_id !== sessionTemplateId) return false;

        if (f.date_from) {
          const from = new Date(f.date_from);
          if (new Date(s.start_datetime) < from) return false;
        }
        if (f.date_to) {
          const to = new Date(f.date_to);
          if (new Date(s.start_datetime) > to) return false;
        }
        if (f.only_unbooked && s.is_booked) return false;
        return true;
      });

      if (relaxed.length > 0) {
        filtered = relaxed;
        overrideFlags = {
          require_weekend: !!f.require_weekend,
          require_weekday: !!f.require_weekday,
          require_morning: !!f.require_morning,
          require_evening: !!f.require_evening
        };
      }
    }

    filtered.sort(
      (a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
    );

    const result = [];
    filtered.forEach((slot, index) => {
      const trainer = trainers.find(t => t.id === slot.trainer_id) || null;
      const normalizedSlot = overrideFlags
        ? {
            ...slot,
            is_weekend: overrideFlags.require_weekend ? true : slot.is_weekend,
            is_weekday: overrideFlags.require_weekday ? true : slot.is_weekday,
            is_morning: overrideFlags.require_morning ? true : slot.is_morning,
            is_evening: overrideFlags.require_evening ? true : slot.is_evening
          }
        : slot;

      result.push({
        slot: normalizedSlot,
        date_display: this._formatDate(slot.start_datetime),
        time_display: this._formatTime(slot.start_datetime),
        is_next_available: index === 0,
        trainer,
        session_template: template
      });
    });

    return result;
  }

  // bookInFacilitySession(sessionTemplateId, availabilitySlotId)
  bookInFacilitySession(sessionTemplateId, availabilitySlotId) {
    const templates = this._getFromStorage('privatesessiontemplates', []);
    const slots = this._getFromStorage('sessionavailabilityslots', []);
    const trainers = this._getFromStorage('trainers', []);

    const template = templates.find(st => st.id === sessionTemplateId) || null;
    if (!template) {
      return { success: false, message: 'Session template not found', cart: null, cart_items: [] };
    }

    const slot = slots.find(s => s.id === availabilitySlotId) || null;
    if (!slot || slot.session_template_id !== sessionTemplateId) {
      return { success: false, message: 'Availability slot not found', cart: null, cart_items: [] };
    }

    if (slot.is_booked) {
      return { success: false, message: 'Selected slot is no longer available', cart: null, cart_items: [] };
    }

    const trainer = trainers.find(t => t.id === slot.trainer_id) || null;
    if (!trainer) {
      return { success: false, message: 'Trainer not found for slot', cart: null, cart_items: [] };
    }

    this._reserveAvailabilitySlot(availabilitySlotId);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cartitems', []);

    const newItem = this._createCartItemFromPrivateSession(trainer, template, slot);
    newItem.cart_id = cart.id;
    cartItems.push(newItem);
    this._saveToStorage('cartitems', cartItems);

    this._recalculateCartTotals(cart);
    const currentCartItems = cartItems.filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      message: 'In-facility session added to cart',
      cart,
      cart_items: currentCartItems
    };
  }

  // getTrainingPackageFilterOptions()
  getTrainingPackageFilterOptions() {
    const age_categories = [
      { value: 'puppy_under_6_months', label: this._mapEnumToLabel('age_category', 'puppy_under_6_months') },
      { value: 'adolescent', label: this._mapEnumToLabel('age_category', 'adolescent') },
      { value: 'adult', label: this._mapEnumToLabel('age_category', 'adult') },
      { value: 'all_ages', label: this._mapEnumToLabel('age_category', 'all_ages') }
    ];

    const behavior_focuses = [
      { value: 'none', label: this._mapEnumToLabel('behavior_focus', 'none') },
      { value: 'basic_manners', label: this._mapEnumToLabel('behavior_focus', 'basic_manners') },
      { value: 'puppy_training', label: this._mapEnumToLabel('behavior_focus', 'puppy_training') },
      { value: 'leash_reactivity', label: this._mapEnumToLabel('behavior_focus', 'leash_reactivity') },
      { value: 'reactivity', label: this._mapEnumToLabel('behavior_focus', 'reactivity') },
      { value: 'aggression', label: this._mapEnumToLabel('behavior_focus', 'aggression') },
      { value: 'behavior_problems', label: this._mapEnumToLabel('behavior_focus', 'behavior_problems') },
      { value: 'confidence_building', label: this._mapEnumToLabel('behavior_focus', 'confidence_building') },
      { value: 'other', label: this._mapEnumToLabel('behavior_focus', 'other') }
    ];

    const packages = this._getFromStorage('trainingpackages', []);
    let min_price = null;
    let max_price = null;
    for (const pkg of packages) {
      if (typeof pkg.price === 'number') {
        if (min_price === null || pkg.price < min_price) min_price = pkg.price;
        if (max_price === null || pkg.price > max_price) max_price = pkg.price;
      }
    }
    const price_range = {
      min_price: min_price === null ? 0 : min_price,
      max_price: max_price === null ? 0 : max_price,
      currency: 'USD'
    };

    return { age_categories, behavior_focuses, price_range };
  }

  // searchTrainingPackages(filters, sort)
  searchTrainingPackages(filters, sort) {
    const f = filters || {};
    let packages = this._getFromStorage('trainingpackages', []);

    packages = packages.filter(pkg => {
      if (!pkg) return false;
      if (f.only_active && !pkg.is_active) return false;
      if (f.age_category && pkg.age_category !== f.age_category) return false;
      if (f.primary_behavior_focus && pkg.primary_behavior_focus !== f.primary_behavior_focus) {
        return false;
      }
      if (typeof f.max_price === 'number' && typeof pkg.price === 'number' && pkg.price > f.max_price) {
        return false;
      }
      return true;
    });

    if (sort === 'price_low_to_high') {
      packages.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'sessions_high_to_low') {
      packages.sort((a, b) => (b.number_of_sessions || 0) - (a.number_of_sessions || 0));
    }

    const results = packages.map(pkg => {
      const sessions_display = (pkg.number_of_sessions || 0) + ' sessions';
      const price_display = this._formatCurrency(pkg.price);
      let savings_display = '';
      if (typeof pkg.savings_amount === 'number' && pkg.savings_amount > 0) {
        savings_display = 'Save ' + this._formatCurrency(pkg.savings_amount);
      } else if (typeof pkg.original_price === 'number' && typeof pkg.price === 'number') {
        const savings = pkg.original_price - pkg.price;
        if (savings > 0) {
          savings_display = 'Save ' + this._formatCurrency(savings);
        }
      }
      return { training_package: pkg, sessions_display, price_display, savings_display };
    });

    return results;
  }

  // getTrainingPackageDetails(packageId)
  getTrainingPackageDetails(packageId) {
    const packages = this._getFromStorage('trainingpackages', []);
    const training_package = packages.find(p => p.id === packageId) || null;

    if (!training_package) {
      return {
        training_package: null,
        sessions_display: '',
        price_display: '',
        savings_display: '',
        included_group_classes: [],
        policy_summaries: [],
        breadcrumb: []
      };
    }

    const sessions_display = (training_package.number_of_sessions || 0) + ' sessions';
    const price_display = this._formatCurrency(training_package.price);

    let savings_display = '';
    if (typeof training_package.savings_amount === 'number' && training_package.savings_amount > 0) {
      savings_display = 'Save ' + this._formatCurrency(training_package.savings_amount);
    } else if (
      typeof training_package.original_price === 'number' &&
      typeof training_package.price === 'number'
    ) {
      const savings = training_package.original_price - training_package.price;
      if (savings > 0) {
        savings_display = 'Save ' + this._formatCurrency(savings);
      }
    }

    const groupClasses = this._getFromStorage('groupclasses', []);
    const included_group_classes = (training_package.included_group_class_ids || [])
      .map(id => groupClasses.find(gc => gc.id === id) || null)
      .filter(gc => !!gc);

    const policies = this._getFromStorage('policies', []);
    const policy_summaries = policies.map(p => {
      const label = this._mapEnumToLabel('policy_category', p.category || 'other');
      return label + ': ' + p.title;
    });

    const breadcrumb = ['Home', 'Training Packages', training_package.name];

    return {
      training_package,
      sessions_display,
      price_display,
      savings_display,
      included_group_classes,
      policy_summaries,
      breadcrumb
    };
  }

  // addTrainingPackageToCart(packageId)
  addTrainingPackageToCart(packageId) {
    const packages = this._getFromStorage('trainingpackages', []);
    const pkg = packages.find(p => p.id === packageId) || null;
    if (!pkg) {
      return { success: false, message: 'Training package not found', cart: null, cart_items: [] };
    }
    if (!pkg.is_active) {
      return { success: false, message: 'Training package is not available', cart: null, cart_items: [] };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cartitems', []);

    const newItem = this._createCartItemFromTrainingPackage(pkg);
    newItem.cart_id = cart.id;
    cartItems.push(newItem);
    this._saveToStorage('cartitems', cartItems);

    this._recalculateCartTotals(cart);
    const currentCartItems = cartItems.filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      message: 'Training package added to cart',
      cart,
      cart_items: currentCartItems
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getCurrentCart();
    if (!cart) {
      return {
        cart: null,
        items: [],
        subtotal_display: this._formatCurrency(0),
        taxes_display: this._formatCurrency(0),
        total_display: this._formatCurrency(0)
      };
    }

    const allItems = this._getFromStorage('cartitems', []);
    const cartItems = allItems.filter(ci => ci.cart_id === cart.id);

    const groupClasses = this._getFromStorage('groupclasses', []);
    const trainers = this._getFromStorage('trainers', []);
    const templates = this._getFromStorage('privatesessiontemplates', []);
    const packages = this._getFromStorage('trainingpackages', []);
    const giftTemplates = this._getFromStorage('giftcardtemplates', []);

    const items = cartItems.map(ci => {
      const group_class = ci.group_class_id
        ? groupClasses.find(gc => gc.id === ci.group_class_id) || null
        : null;
      const trainer = ci.trainer_id
        ? trainers.find(t => t.id === ci.trainer_id) || null
        : null;
      const session_template = ci.session_template_id
        ? templates.find(st => st.id === ci.session_template_id) || null
        : null;
      const training_package = ci.training_package_id
        ? packages.find(p => p.id === ci.training_package_id) || null
        : null;
      const gift_card_template = ci.gift_card_template_id
        ? giftTemplates.find(g => g.id === ci.gift_card_template_id) || null
        : null;

      let date_time_display = '';
      if (ci.item_type === 'group_class_enrollment') {
        date_time_display = this._formatDate(ci.group_class_start_date);
      } else if (ci.item_type === 'private_session_booking') {
        date_time_display = this._formatDateTime(ci.session_start_datetime);
      }

      const price_display = this._formatCurrency(ci.total_price || 0);
      const item_type_label = this._mapEnumToLabel('cart_item_type', ci.item_type);

      return {
        cart_item: {
          ...ci,
          group_class,
          trainer,
          session_template,
          training_package,
          gift_card_template
        },
        item_type_label,
        date_time_display,
        price_display,
        can_edit: true
      };
    });

    return {
      cart,
      items,
      subtotal_display: this._formatCurrency(cart.subtotal || 0),
      taxes_display: this._formatCurrency(cart.taxes || 0),
      total_display: this._formatCurrency(cart.total || 0)
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getCurrentCart();
    if (!cart) {
      return { success: false, message: 'No active cart', cart: null, items: [] };
    }

    const allItems = this._getFromStorage('cartitems', []);
    const index = allItems.findIndex(ci => ci.id === cartItemId && ci.cart_id === cart.id);
    if (index === -1) {
      return { success: false, message: 'Cart item not found', cart, items: allItems };
    }

    const item = allItems[index];
    this._releaseAvailabilitySlotOnCartRemoval(item);

    allItems.splice(index, 1);
    this._saveToStorage('cartitems', allItems);

    this._recalculateCartTotals(cart);
    const remaining = allItems.filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      message: 'Item removed from cart',
      cart,
      items: remaining
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cartSummary = this.getCartSummary();
    const policies = this._getFromStorage('policies', []);
    const policy_summaries = policies.map(p => {
      const label = this._mapEnumToLabel('policy_category', p.category || 'other');
      return label + ': ' + p.title;
    });

    return {
      cart: cartSummary.cart,
      items: cartSummary.items,
      subtotal_display: cartSummary.subtotal_display,
      taxes_display: cartSummary.taxes_display,
      total_display: cartSummary.total_display,
      policy_summaries
    };
  }

  // placeOrder(customer, dog, billing_address, payment_method, payment_token, notes, accept_terms)
  placeOrder(customer, dog, billing_address, payment_method, payment_token, notes, accept_terms) {
    if (!accept_terms) {
      return { success: false, order: null, order_items: [], message: 'Terms must be accepted.' };
    }

    const cart = this._getCurrentCart();
    if (!cart) {
      return { success: false, order: null, order_items: [], message: 'Cart is empty.' };
    }

    const cust = customer || {};
    if (!cust.name || !cust.email) {
      return {
        success: false,
        order: null,
        order_items: [],
        message: 'Customer name and email are required.'
      };
    }

    // Payment is simulated; payment_token is not used
    const { order, orderItems } = this._createOrderFromCart(
      cust,
      dog || {},
      billing_address || null,
      payment_method,
      notes || null
    );

    if (!order) {
      return { success: false, order: null, order_items: [], message: 'Unable to create order.' };
    }

    return {
      success: true,
      order,
      order_items: orderItems,
      message: 'Order placed successfully.'
    };
  }

  // getArticleSearchOptions()
  getArticleSearchOptions() {
    const articles = this._getFromStorage('articles', []);
    const topicSet = {};
    for (const a of articles) {
      (a.topics || []).forEach(t => {
        if (t) topicSet[t] = true;
      });
    }
    const topics = Object.keys(topicSet).map(t => ({
      value: t,
      label: this._mapEnumToLabel('training_topic', t)
    }));

    const sort_options = [
      { value: 'newest_first', label: 'Newest first' },
      { value: 'oldest_first', label: 'Oldest first' }
    ];

    return { topics, sort_options };
  }

  // searchArticles(query, topics, sort, page, page_size)
  searchArticles(query, topics, sort, page, page_size) {
    const q = (query || '').trim().toLowerCase();
    const topicFilters = Array.isArray(topics) ? topics.filter(Boolean) : [];
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    const articles = this._getFromStorage('articles', []);

    let filtered = articles.filter(a => {
      if (!a) return false;
      if (q) {
        const haystack =
          (a.title || '') + '\n' + (a.summary || '') + '\n' + (a.content || '');
        if (!haystack.toLowerCase().includes(q)) return false;
      }

      if (topicFilters.length > 0) {
        const at = a.topics || [];
        const hasIntersection = at.some(t => topicFilters.indexOf(t) !== -1);
        if (!hasIntersection) return false;
      }

      return true;
    });

    if (sort === 'oldest_first') {
      filtered.sort((a, b) => {
        const da = a.publish_date ? new Date(a.publish_date).getTime() : 0;
        const db = b.publish_date ? new Date(b.publish_date).getTime() : 0;
        return da - db;
      });
    } else {
      // newest_first default
      filtered.sort((a, b) => {
        const da = a.publish_date ? new Date(a.publish_date).getTime() : 0;
        const db = b.publish_date ? new Date(b.publish_date).getTime() : 0;
        return db - da;
      });
    }

    const total_count = filtered.length;
    const startIndex = (pageNum - 1) * size;
    const paged = filtered.slice(startIndex, startIndex + size);

    return {
      results: paged,
      total_count,
      page: pageNum,
      page_size: size
    };
  }

  // getArticleDetails(articleId)
  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(a => a.id === articleId) || null;
    const saved = this._getFromStorage('savedarticles', []);
    const is_saved = saved.some(sa => sa.article_id === articleId);

    let related_articles = [];
    if (article) {
      const topics = article.topics || [];
      related_articles = articles
        .filter(a => {
          if (!a || a.id === article.id) return false;
          const at = a.topics || [];
          return at.some(t => topics.indexOf(t) !== -1);
        })
        .slice(0, 3);
    }

    return { article, is_saved, related_articles };
  }

  // saveArticle(articleId)
  saveArticle(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return { success: false, saved_article: null, message: 'Article not found' };
    }

    const saved = this._getFromStorage('savedarticles', []);
    const existing = saved.find(sa => sa.article_id === articleId);
    if (existing) {
      return { success: true, saved_article: existing, message: 'Article already saved' };
    }

    const saved_article = {
      id: this._generateId('savedarticle'),
      article_id: articleId,
      saved_at: this._nowIso()
    };
    saved.push(saved_article);
    this._saveToStorage('savedarticles', saved);

    return { success: true, saved_article, message: 'Article saved' };
  }

  // getSavedResources()
  getSavedResources() {
    const saved = this._getFromStorage('savedarticles', []);
    const articles = this._getFromStorage('articles', []);

    // newest saved first
    saved.sort((a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime());

    return saved.map(sa => ({
      saved_article: sa,
      article: articles.find(a => a.id === sa.article_id) || null
    }));
  }

  // removeSavedArticle(articleId)
  removeSavedArticle(articleId) {
    let saved = this._getFromStorage('savedarticles', []);
    const before = saved.length;
    saved = saved.filter(sa => sa.article_id !== articleId);
    this._saveToStorage('savedarticles', saved);

    const removed = saved.length < before;
    return {
      success: true,
      message: removed ? 'Saved article removed' : 'No saved article matched'
    };
  }

  // getNewsletterSignupOptions()
  getNewsletterSignupOptions() {
    const topics = [
      { value: 'puppy_training', label: this._mapEnumToLabel('training_topic', 'puppy_training') },
      { value: 'behavior_problems', label: this._mapEnumToLabel('training_topic', 'behavior_problems') },
      { value: 'basic_manners', label: this._mapEnumToLabel('training_topic', 'basic_manners') },
      { value: 'leash_reactivity', label: this._mapEnumToLabel('training_topic', 'leash_reactivity') },
      { value: 'aggression', label: this._mapEnumToLabel('training_topic', 'aggression') },
      { value: 'confidence_building', label: this._mapEnumToLabel('training_topic', 'confidence_building') }
    ];

    const frequency_options = [
      { value: 'weekly', label: this._mapEnumToLabel('newsletter_frequency', 'weekly') },
      { value: 'biweekly', label: this._mapEnumToLabel('newsletter_frequency', 'biweekly') },
      { value: 'monthly', label: this._mapEnumToLabel('newsletter_frequency', 'monthly') }
    ];

    return { topics, frequency_options };
  }

  // submitNewsletterSubscription(name, email, topics, frequency)
  submitNewsletterSubscription(name, email, topics, frequency) {
    if (!email) {
      return { success: false, subscription: null, message: 'Email is required.' };
    }

    const freq = frequency || 'weekly';
    if (['weekly', 'biweekly', 'monthly'].indexOf(freq) === -1) {
      return { success: false, subscription: null, message: 'Invalid frequency.' };
    }

    const subs = this._getFromStorage('newslettersubscriptions', []);
    const subscription = {
      id: this._generateId('newsletter'),
      name: name || null,
      email,
      topics: Array.isArray(topics) ? topics.filter(Boolean) : [],
      frequency: freq,
      status: 'active',
      created_at: this._nowIso()
    };
    subs.push(subscription);
    this._saveToStorage('newslettersubscriptions', subs);

    return {
      success: true,
      subscription,
      message: 'Subscribed successfully.'
    };
  }

  // getContactPageConfig()
  getContactPageConfig() {
    const contact_reasons = [
      { value: 'behavior_consultation_question', label: this._mapEnumToLabel('contact_reason', 'behavior_consultation_question') },
      { value: 'general_question', label: this._mapEnumToLabel('contact_reason', 'general_question') },
      { value: 'class_enrollment', label: this._mapEnumToLabel('contact_reason', 'class_enrollment') },
      { value: 'private_training', label: this._mapEnumToLabel('contact_reason', 'private_training') },
      { value: 'other', label: this._mapEnumToLabel('contact_reason', 'other') }
    ];

    const businessProfiles = this._getFromStorage('businessprofile', []);
    const business_profile = businessProfiles.length > 0 ? businessProfiles[0] : null;

    const expected_response_time = 'We typically respond within 1–2 business days.';

    return { contact_reasons, business_profile, expected_response_time };
  }

  // submitContactRequest(contact_reason, name, email, phone, preferred_contact_method, message)
  submitContactRequest(contact_reason, name, email, phone, preferred_contact_method, message) {
    if (!contact_reason) contact_reason = 'other';
    if (!name || !email || !message) {
      return {
        success: false,
        contact_request: null,
        message: 'Name, email, and message are required.'
      };
    }

    const validReasons = [
      'behavior_consultation_question',
      'general_question',
      'class_enrollment',
      'private_training',
      'other'
    ];
    if (validReasons.indexOf(contact_reason) === -1) {
      contact_reason = 'other';
    }

    const validMethods = ['email', 'phone'];
    let preferred = preferred_contact_method || null;
    if (preferred && validMethods.indexOf(preferred) === -1) {
      preferred = null;
    }

    const requests = this._getFromStorage('contactrequests', []);
    const contact_request = {
      id: this._generateId('contact'),
      contact_reason,
      name,
      email,
      phone: phone || null,
      preferred_contact_method: preferred,
      message,
      created_at: this._nowIso(),
      handled: false,
      internal_notes: null
    };

    requests.push(contact_request);
    this._saveToStorage('contactrequests', requests);

    return {
      success: true,
      contact_request,
      message: 'Your message has been sent.'
    };
  }

  // getGiftCardTemplates()
  getGiftCardTemplates() {
    const templates = this._getFromStorage('giftcardtemplates', []);
    return templates.filter(t => t && t.is_active);
  }

  // addGiftCardToCart(giftCardTemplateId, amount, recipient_name, recipient_email, message)
  addGiftCardToCart(giftCardTemplateId, amount, recipient_name, recipient_email, message) {
    const templates = this._getFromStorage('giftcardtemplates', []);
    const template = templates.find(t => t.id === giftCardTemplateId) || null;
    if (!template) {
      return { success: false, message: 'Gift card template not found', cart: null, cart_items: [] };
    }
    if (!template.is_active) {
      return { success: false, message: 'Gift card is not available', cart: null, cart_items: [] };
    }

    const amt = typeof amount === 'number' ? amount : 0;
    if (amt <= 0) {
      return { success: false, message: 'Amount must be greater than 0', cart: null, cart_items: [] };
    }
    if (typeof template.min_amount === 'number' && amt < template.min_amount) {
      return {
        success: false,
        message: 'Amount is below minimum allowed',
        cart: null,
        cart_items: []
      };
    }
    if (typeof template.max_amount === 'number' && amt > template.max_amount) {
      return {
        success: false,
        message: 'Amount is above maximum allowed',
        cart: null,
        cart_items: []
      };
    }

    if (!recipient_name || !recipient_email) {
      return {
        success: false,
        message: 'Recipient name and email are required',
        cart: null,
        cart_items: []
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cartitems', []);

    const newItem = this._createCartItemFromGiftCard(
      template,
      amt,
      recipient_name,
      recipient_email,
      message || ''
    );
    newItem.cart_id = cart.id;
    cartItems.push(newItem);
    this._saveToStorage('cartitems', cartItems);

    this._recalculateCartTotals(cart);
    const currentCartItems = cartItems.filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      message: 'Gift card added to cart',
      cart,
      cart_items: currentCartItems
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const businessProfiles = this._getFromStorage('businessprofile', []);
    const business_profile = businessProfiles.length > 0 ? businessProfiles[0] : null;

    const story =
      (business_profile && business_profile.description) ||
      'We are a local, positive reinforcement training company dedicated to helping families and their dogs thrive together.';

    const philosophy =
      (business_profile && business_profile.philosophy) ||
      'Our training is reward-based, force-free, and tailored to each dog’s needs.';

    const trainers = this._getFromStorage('trainers', []);
    const activeTrainers = trainers.filter(t => t && t.status === 'active');
    activeTrainers.sort((a, b) => {
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      if (rb !== ra) return rb - ra;
      const ca = a.rating_count || 0;
      const cb = b.rating_count || 0;
      return cb - ca;
    });

    const trainer_highlights = activeTrainers.slice(0, 3);

    return {
      business_profile,
      story,
      philosophy,
      trainer_highlights
    };
  }

  // getFaqAndPolicyContent()
  getFaqAndPolicyContent() {
    const faqs = this._getFromStorage('faqitems', []);
    const policies = this._getFromStorage('policies', []);
    return { faqs, policies };
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