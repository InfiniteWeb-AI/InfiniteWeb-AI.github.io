/* localStorage polyfill for Node.js and environments without localStorage */
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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const tables = [
      'campaigns',
      'donations',
      'recurring_sponsorships',
      'animals',
      'foster_interests',
      'wishlist_categories',
      'wishlist_items',
      'carts',
      'cart_items',
      'promo_codes',
      'wishlist_orders',
      'wishlist_order_items',
      'events',
      'event_registrations',
      'newsletter_subscriptions',
      'ecard_templates',
      'tribute_donations'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const currentRaw = localStorage.getItem('idCounter');
    const current = parseInt(currentRaw || '1000', 10);
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

  _findById(list, id) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  // ---------------------- Cart helpers ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
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
        promo_code: null,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _getCurrentCart() {
    const carts = this._getFromStorage('carts');
    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'open') {
        cart = carts[i];
        break;
      }
    }
    if (!cart) {
      return { cart: null, items: [] };
    }
    const allItems = this._getFromStorage('cart_items');
    const items = [];
    for (let j = 0; j < allItems.length; j++) {
      if (allItems[j].cart_id === cart.id) {
        items.push(allItems[j]);
      }
    }
    return { cart, items };
  }

  _saveCartChanges(cart, cartItems) {
    // Save cart
    const carts = this._getFromStorage('carts');
    let found = false;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i] = cart;
        found = true;
        break;
      }
    }
    if (!found) {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);

    // Save cart items
    const allItems = this._getFromStorage('cart_items');
    const remaining = [];
    for (let j = 0; j < allItems.length; j++) {
      if (allItems[j].cart_id !== cart.id) {
        remaining.push(allItems[j]);
      }
    }
    const merged = remaining.concat(cartItems || []);
    this._saveToStorage('cart_items', merged);
  }

  _calculateCartTotals(cart, cartItems) {
    if (!cart) {
      return {
        subtotal: 0,
        discountTotal: 0,
        total: 0,
        currency: 'USD',
        promoCode: null,
        totalQuantity: 0,
        distinctItemCount: 0
      };
    }

    let items = cartItems;
    if (!items) {
      const allItems = this._getFromStorage('cart_items');
      items = [];
      for (let i = 0; i < allItems.length; i++) {
        if (allItems[i].cart_id === cart.id) {
          items.push(allItems[i]);
        }
      }
    }

    let subtotal = 0;
    let totalQuantity = 0;
    for (let j = 0; j < items.length; j++) {
      const it = items[j];
      subtotal += it.line_total || 0;
      totalQuantity += it.quantity || 0;
    }

    let discountTotal = 0;
    const promos = this._getFromStorage('promo_codes');
    let appliedPromo = null;
    if (cart.promo_code) {
      const codeUpper = String(cart.promo_code).toUpperCase();
      for (let k = 0; k < promos.length; k++) {
        const pc = promos[k];
        if (pc.is_active && String(pc.code).toUpperCase() === codeUpper) {
          appliedPromo = pc;
          break;
        }
      }
    }
    if (appliedPromo && (appliedPromo.applies_to === 'wishlist_only' || appliedPromo.applies_to === 'all')) {
      if (appliedPromo.discount_type === 'percentage') {
        discountTotal = subtotal * (appliedPromo.discount_value / 100);
      } else if (appliedPromo.discount_type === 'fixed_amount') {
        discountTotal = appliedPromo.discount_value;
      }
    }
    if (discountTotal > subtotal) {
      discountTotal = subtotal;
    }

    const total = subtotal - discountTotal;

    return {
      subtotal: subtotal,
      discountTotal: discountTotal,
      total: total,
      currency: 'USD',
      promoCode: cart.promo_code || null,
      totalQuantity: totalQuantity,
      distinctItemCount: items.length
    };
  }

  // ---------------------- Payment & record helpers ----------------------

  _maskCardNumber(cardNumber) {
    const num = String(cardNumber || '');
    if (num.length < 4) return '****';
    const last4 = num.slice(-4);
    return '**** **** **** ' + last4;
  }

  _detectCardBrand(cardNumber) {
    const num = String(cardNumber || '');
    if (num[0] === '4') return 'visa';
    if (num[0] === '5') return 'mastercard';
    if (num[0] === '3') return 'amex';
    return 'unknown';
  }

  _processCreditCardPayment(cardNumber, cardExpirationMonth, cardExpirationYear, cardCvv, billingPostalCode) {
    // Simulated payment processing; always succeeds for non-empty cardNumber
    const num = String(cardNumber || '').replace(/\s+/g, '');
    if (!num) {
      return { success: false, message: 'Missing card number' };
    }
    const last4 = num.slice(-4);
    const cardBrand = this._detectCardBrand(num);
    const masked = this._maskCardNumber(num);
    return {
      success: true,
      cardBrand: cardBrand,
      cardLast4: last4,
      cardNumberMasked: masked
    };
  }

  _createDonationRecord(params) {
    const donations = this._getFromStorage('donations');
    const donation = {
      id: this._generateId('donation'),
      campaign_id: params.campaignId || null,
      donation_type: params.donationType,
      amount: params.amount,
      currency: params.currency || 'USD',
      donor_full_name: params.donorFullName,
      donor_email: params.donorEmail,
      newsletter_opt_in: !!params.newsletterOptIn,
      payment_method: params.paymentMethod || 'credit_card',
      card_number_masked: params.cardNumberMasked || null,
      card_last4: params.cardLast4 || null,
      card_brand: params.cardBrand || null,
      card_expiration_month: params.cardExpirationMonth || null,
      card_expiration_year: params.cardExpirationYear || null,
      billing_postal_code: params.billingPostalCode || null,
      status: params.status || 'completed',
      source: params.source,
      recurring_sponsorship_id: params.recurringSponsorshipId || null,
      event_registration_id: params.eventRegistrationId || null,
      wishlist_order_id: params.wishlistOrderId || null,
      created_at: this._nowIso()
    };
    donations.push(donation);
    this._saveToStorage('donations', donations);
    return donation;
  }

  _createRecurringSponsorshipRecord(params) {
    const recs = this._getFromStorage('recurring_sponsorships');
    const sponsorship = {
      id: this._generateId('sponsorship'),
      animal_id: params.animalId,
      sponsor_name: params.sponsorName,
      sponsor_email: params.sponsorEmail,
      amount: params.amount,
      currency: params.currency || 'USD',
      frequency: 'monthly',
      billing_day_of_month: params.billingDayOfMonth,
      payment_method: params.paymentMethod || 'credit_card',
      card_number_masked: params.cardNumberMasked || null,
      card_last4: params.cardLast4 || null,
      card_brand: params.cardBrand || null,
      card_expiration_month: params.cardExpirationMonth || null,
      card_expiration_year: params.cardExpirationYear || null,
      billing_postal_code: params.billingPostalCode || null,
      status: 'active',
      start_date: this._nowIso(),
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    recs.push(sponsorship);
    this._saveToStorage('recurring_sponsorships', recs);
    return sponsorship;
  }

  _createWishlistOrderFromCart(cart, cartItems, totals, donorFullName, donorEmail, billingPostalCode, paymentInfo) {
    const orders = this._getFromStorage('wishlist_orders');
    const orderItems = this._getFromStorage('wishlist_order_items');

    const order = {
      id: this._generateId('worder'),
      cart_id: cart.id,
      total_before_discount: totals.subtotal,
      discount_total: totals.discountTotal,
      total_paid: totals.total,
      currency: totals.currency || 'USD',
      promo_code: cart.promo_code || null,
      donor_name: donorFullName,
      donor_email: donorEmail,
      billing_postal_code: billingPostalCode || null,
      payment_method: paymentInfo.paymentMethod || 'credit_card',
      card_number_masked: paymentInfo.cardNumberMasked || null,
      card_last4: paymentInfo.cardLast4 || null,
      card_brand: paymentInfo.cardBrand || null,
      card_expiration_month: paymentInfo.cardExpirationMonth || null,
      card_expiration_year: paymentInfo.cardExpirationYear || null,
      status: 'paid',
      created_at: this._nowIso()
    };
    orders.push(order);

    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      const orderItem = {
        id: this._generateId('witem'),
        order_id: order.id,
        wishlist_item_id: ci.wishlist_item_id || null,
        item_name_snapshot: ci.item_name_snapshot,
        category_key_snapshot: ci.category_key_snapshot,
        unit_price_snapshot: ci.unit_price_snapshot,
        quantity: ci.quantity,
        line_total: ci.line_total
      };
      orderItems.push(orderItem);
    }

    this._saveToStorage('wishlist_orders', orders);
    this._saveToStorage('wishlist_order_items', orderItems);
    return order;
  }

  _createEventRegistrationRecord(params) {
    const events = this._getFromStorage('events');
    const event = this._findById(events, params.eventId);
    if (!event) {
      return { registration: null, updatedEvent: null };
    }
    const regs = this._getFromStorage('event_registrations');
    const registration = {
      id: this._generateId('ereg'),
      event_id: params.eventId,
      registrant_name: params.registrantName,
      registrant_email: params.registrantEmail,
      num_attendees: params.numAttendees,
      has_additional_donation: !!params.addDonation,
      additional_donation_amount: params.addDonation ? params.additionalDonationAmount || 0 : 0,
      status: 'registered',
      created_at: this._nowIso()
    };
    regs.push(registration);

    // Update event available slots if capacity tracking is used
    if (typeof event.available_slots === 'number') {
      event.available_slots = Math.max(0, event.available_slots - params.numAttendees);
    }
    event.updated_at = this._nowIso();

    // Persist event update
    for (let i = 0; i < events.length; i++) {
      if (events[i].id === event.id) {
        events[i] = event;
        break;
      }
    }

    this._saveToStorage('event_registrations', regs);
    this._saveToStorage('events', events);

    return { registration: registration, updatedEvent: event };
  }

  _createFosterInterestRecord(params) {
    const fosters = this._getFromStorage('foster_interests');
    const animals = this._getFromStorage('animals');
    const animal = this._findById(animals, params.animalId);
    const record = {
      id: this._generateId('foster'),
      animal_id: params.animalId,
      animal_name_snapshot: animal ? animal.name : null,
      fosterer_name: params.fostererName,
      fosterer_email: params.fostererEmail,
      fosterer_phone: params.fostererPhone,
      start_date: params.startDateIso,
      duration_option: params.durationOption,
      home_description: params.homeDescription,
      status: 'submitted',
      created_at: this._nowIso()
    };
    fosters.push(record);
    this._saveToStorage('foster_interests', fosters);
    return record;
  }

  _createNewsletterSubscriptionRecord(params) {
    const subs = this._getFromStorage('newsletter_subscriptions');
    let sub = null;
    for (let i = 0; i < subs.length; i++) {
      if (subs[i].email === params.email) {
        sub = subs[i];
        break;
      }
    }
    if (sub) {
      sub.full_name = params.fullName || sub.full_name || null;
      sub.interests = params.interests || [];
      sub.frequency = params.frequency;
      sub.wants_urgent_alerts = !!params.wantsUrgentAlerts;
      sub.status = 'subscribed';
    } else {
      sub = {
        id: this._generateId('nsub'),
        email: params.email,
        full_name: params.fullName || null,
        interests: params.interests || [],
        frequency: params.frequency,
        wants_urgent_alerts: !!params.wantsUrgentAlerts,
        status: 'subscribed',
        created_at: this._nowIso()
      };
      subs.push(sub);
    }
    this._saveToStorage('newsletter_subscriptions', subs);
    return sub;
  }

  _scheduleEcardSend(tributeDonation) {
    // Simulate scheduling by just returning true; actual sending would be handled elsewhere.
    return true;
  }

  // ---------------------- Interface implementations ----------------------

  // getHomePageContent
  getHomePageContent() {
    const animals = this._getFromStorage('animals');
    const campaigns = this._getFromStorage('campaigns');

    // Featured animals: available, sorted by priority_score desc then days_at_sanctuary desc
    const availableAnimals = [];
    for (let i = 0; i < animals.length; i++) {
      const a = animals[i];
      if (a.adoption_status === 'available') {
        availableAnimals.push(a);
      }
    }
    availableAnimals.sort(function (a, b) {
      const pa = typeof a.priority_score === 'number' ? a.priority_score : 0;
      const pb = typeof b.priority_score === 'number' ? b.priority_score : 0;
      if (pb !== pa) return pb - pa;
      const da = typeof a.days_at_sanctuary === 'number' ? a.days_at_sanctuary : 0;
      const db = typeof b.days_at_sanctuary === 'number' ? b.days_at_sanctuary : 0;
      return db - da;
    });
    const featuredAnimals = availableAnimals.slice(0, 4);

    // Featured campaigns: active & is_featured, fallback to first 3 active
    const activeCampaigns = [];
    const featuredCampaignsList = [];
    for (let j = 0; j < campaigns.length; j++) {
      const c = campaigns[j];
      if (c.status === 'active') {
        activeCampaigns.push(c);
        if (c.is_featured) {
          featuredCampaignsList.push(c);
        }
      }
    }
    let featuredCampaigns = featuredCampaignsList;
    if (featuredCampaigns.length === 0) {
      featuredCampaigns = activeCampaigns.slice(0, 3);
    }

    const result = {
      missionStatement: 'Providing lifelong sanctuary and medical care for vulnerable animals through community support.',
      impactHighlights: [
        {
          key: 'animals_rescued',
          label: 'Animals Rescued',
          value: 'N/A',
          description: 'Total animals helped is based on current sanctuary records.'
        },
        {
          key: 'meals_served',
          label: 'Meals Provided',
          value: 'N/A',
          description: 'Every wishlist gift helps provide daily meals and treats.'
        }
      ],
      featuredAnimals: featuredAnimals,
      featuredCampaigns: featuredCampaigns,
      newsletterTeaser: {
        headline: 'Get rescue stories in your inbox',
        description: 'Sign up for monthly updates on the animals you are helping.'
      }
    };

    return result;
  }

  // getDonateLandingData
  getDonateLandingData() {
    const campaigns = this._getFromStorage('campaigns');
    const featured = [];
    for (let i = 0; i < campaigns.length; i++) {
      const c = campaigns[i];
      if (c.status === 'active' && c.is_featured) {
        featured.push(c);
      }
    }
    if (featured.length === 0) {
      for (let j = 0; j < campaigns.length; j++) {
        if (campaigns[j].status === 'active') {
          featured.push(campaigns[j]);
        }
      }
    }

    return {
      featuredCampaigns: featured,
      generalDonationOptions: {
        defaultAmount: 50,
        suggestedAmounts: [25, 50, 100],
        supportedFrequencies: ['one_time', 'monthly'],
        currency: 'USD'
      },
      tributePromo: {
        headline: 'Give in honor or memory of someone special',
        description: 'Celebrate a loved one with a tribute gift that helps animals in need.',
        ctaLabel: 'Send a tribute e-card'
      }
    };
  }

  // submitGeneralDonation
  submitGeneralDonation(
    donationType,
    amount,
    currency,
    donorFullName,
    donorEmail,
    newsletterOptIn,
    paymentMethod,
    cardNumber,
    cardExpirationMonth,
    cardExpirationYear,
    cardCvv,
    billingPostalCode
  ) {
    if (!amount || amount <= 0) {
      return { success: false, donation: null, message: 'Invalid donation amount' };
    }

    const payment = this._processCreditCardPayment(
      cardNumber,
      cardExpirationMonth,
      cardExpirationYear,
      cardCvv,
      billingPostalCode
    );
    if (!payment.success) {
      return { success: false, donation: null, message: payment.message || 'Payment failed' };
    }

    const donation = this._createDonationRecord({
      campaignId: null,
      donationType: donationType,
      amount: amount,
      currency: currency || 'USD',
      donorFullName: donorFullName,
      donorEmail: donorEmail,
      newsletterOptIn: !!newsletterOptIn,
      paymentMethod: paymentMethod || 'credit_card',
      cardNumberMasked: payment.cardNumberMasked,
      cardLast4: payment.cardLast4,
      cardBrand: payment.cardBrand,
      cardExpirationMonth: cardExpirationMonth,
      cardExpirationYear: cardExpirationYear,
      billingPostalCode: billingPostalCode,
      status: 'completed',
      source: 'donate_landing',
      recurringSponsorshipId: null,
      eventRegistrationId: null,
      wishlistOrderId: null
    });

    return { success: true, donation: donation, message: 'Donation completed' };
  }

  // getCampaignsList
  getCampaignsList(status, includeInactive) {
    const campaigns = this._getFromStorage('campaigns');
    const includeInactiveBool = !!includeInactive;
    const result = [];

    for (let i = 0; i < campaigns.length; i++) {
      const c = campaigns[i];
      if (status && c.status !== status) {
        continue;
      }
      if (!status && !includeInactiveBool && c.status !== 'active') {
        continue;
      }
      let progressPercent = 0;
      if (typeof c.goal_amount === 'number' && c.goal_amount > 0 && typeof c.amount_raised === 'number') {
        progressPercent = (c.amount_raised / c.goal_amount) * 100;
      }
      let smallestSuggested = null;
      if (c.suggested_donation_amounts && c.suggested_donation_amounts.length) {
        for (let j = 0; j < c.suggested_donation_amounts.length; j++) {
          const v = c.suggested_donation_amounts[j];
          if (typeof v === 'number') {
            if (smallestSuggested === null || v < smallestSuggested) {
              smallestSuggested = v;
            }
          }
        }
      }
      result.push({
        campaign: c,
        progressPercent: progressPercent,
        smallestSuggestedAmount: smallestSuggested
      });
    }

    return { campaigns: result };
  }

  // getCampaignDetail
  getCampaignDetail(campaignId) {
    const campaigns = this._getFromStorage('campaigns');
    const campaign = this._findById(campaigns, campaignId);
    if (!campaign) {
      return {
        campaign: null,
        suggestedAmounts: [],
        smallestSuggestedAmount: null,
        minimumDonationAmount: 0,
        canAcceptRecurring: false
      };
    }
    const suggestedAmounts = campaign.suggested_donation_amounts || [];
    let smallestSuggested = null;
    for (let i = 0; i < suggestedAmounts.length; i++) {
      const v = suggestedAmounts[i];
      if (typeof v === 'number') {
        if (smallestSuggested === null || v < smallestSuggested) {
          smallestSuggested = v;
        }
      }
    }
    const minimumDonationAmount = typeof campaign.minimum_donation_amount === 'number' ? campaign.minimum_donation_amount : 0;
    const canAcceptRecurring = campaign.status === 'active';

    return {
      campaign: campaign,
      suggestedAmounts: suggestedAmounts,
      smallestSuggestedAmount: smallestSuggested,
      minimumDonationAmount: minimumDonationAmount,
      canAcceptRecurring: canAcceptRecurring
    };
  }

  // submitCampaignDonation
  submitCampaignDonation(
    campaignId,
    donationType,
    amount,
    currency,
    donorFullName,
    donorEmail,
    newsletterOptIn,
    paymentMethod,
    cardNumber,
    cardExpirationMonth,
    cardExpirationYear,
    cardCvv,
    billingPostalCode
  ) {
    const campaigns = this._getFromStorage('campaigns');
    const campaign = this._findById(campaigns, campaignId);
    if (!campaign) {
      return { success: false, donation: null, message: 'Campaign not found' };
    }
    if (!amount || amount <= 0) {
      return { success: false, donation: null, message: 'Invalid donation amount' };
    }

    const payment = this._processCreditCardPayment(
      cardNumber,
      cardExpirationMonth,
      cardExpirationYear,
      cardCvv,
      billingPostalCode
    );
    if (!payment.success) {
      return { success: false, donation: null, message: payment.message || 'Payment failed' };
    }

    const donation = this._createDonationRecord({
      campaignId: campaignId,
      donationType: donationType,
      amount: amount,
      currency: currency || 'USD',
      donorFullName: donorFullName,
      donorEmail: donorEmail,
      newsletterOptIn: !!newsletterOptIn,
      paymentMethod: paymentMethod || 'credit_card',
      cardNumberMasked: payment.cardNumberMasked,
      cardLast4: payment.cardLast4,
      cardBrand: payment.cardBrand,
      cardExpirationMonth: cardExpirationMonth,
      cardExpirationYear: cardExpirationYear,
      billingPostalCode: billingPostalCode,
      status: 'completed',
      source: 'campaign_page',
      recurringSponsorshipId: null,
      eventRegistrationId: null,
      wishlistOrderId: null
    });

    // Update campaign amount_raised
    if (typeof campaign.amount_raised !== 'number') {
      campaign.amount_raised = 0;
    }
    campaign.amount_raised += amount;
    campaign.updated_at = this._nowIso();
    for (let i = 0; i < campaigns.length; i++) {
      if (campaigns[i].id === campaign.id) {
        campaigns[i] = campaign;
        break;
      }
    }
    this._saveToStorage('campaigns', campaigns);

    return { success: true, donation: donation, message: 'Donation completed' };
  }

  // getTributeDonationConfig
  getTributeDonationConfig() {
    const templates = this._getFromStorage('ecard_templates');
    const activeTemplates = [];
    for (let i = 0; i < templates.length; i++) {
      if (templates[i].is_active) activeTemplates.push(templates[i]);
    }
    return {
      minimumAmount: 10,
      defaultAmount: 50,
      currency: 'USD',
      tributeTypes: ['in_honor_of', 'in_memory_of'],
      ecardTemplates: activeTemplates,
      timezone: 'UTC'
    };
  }

  // submitTributeDonation
  submitTributeDonation(
    tributeType,
    honoreeName,
    amount,
    currency,
    ecardTemplateId,
    ecardSendDate,
    recipientEmail,
    message,
    donorFullName,
    donorEmail,
    newsletterOptIn,
    paymentMethod,
    cardNumber,
    cardExpirationMonth,
    cardExpirationYear,
    cardCvv,
    billingPostalCode
  ) {
    if (!amount || amount <= 0) {
      return { success: false, donation: null, tribute: null, message: 'Invalid donation amount' };
    }
    if (tributeType !== 'in_honor_of' && tributeType !== 'in_memory_of') {
      return { success: false, donation: null, tribute: null, message: 'Invalid tribute type' };
    }

    const templates = this._getFromStorage('ecard_templates');
    const template = this._findById(templates, ecardTemplateId);
    if (!template) {
      return { success: false, donation: null, tribute: null, message: 'E-card template not found' };
    }

    const payment = this._processCreditCardPayment(
      cardNumber,
      cardExpirationMonth,
      cardExpirationYear,
      cardCvv,
      billingPostalCode
    );
    if (!payment.success) {
      return { success: false, donation: null, tribute: null, message: payment.message || 'Payment failed' };
    }

    const donation = this._createDonationRecord({
      campaignId: null,
      donationType: 'tribute',
      amount: amount,
      currency: currency || 'USD',
      donorFullName: donorFullName,
      donorEmail: donorEmail,
      newsletterOptIn: !!newsletterOptIn,
      paymentMethod: paymentMethod || 'credit_card',
      cardNumberMasked: payment.cardNumberMasked,
      cardLast4: payment.cardLast4,
      cardBrand: payment.cardBrand,
      cardExpirationMonth: cardExpirationMonth,
      cardExpirationYear: cardExpirationYear,
      billingPostalCode: billingPostalCode,
      status: 'completed',
      source: 'tribute_page',
      recurringSponsorshipId: null,
      eventRegistrationId: null,
      wishlistOrderId: null
    });

    const tributes = this._getFromStorage('tribute_donations');
    const sendDateObj = new Date(ecardSendDate + 'T09:00:00Z');
    const tribute = {
      id: this._generateId('tribute'),
      base_donation_id: donation.id,
      tribute_type: tributeType,
      honoree_name: honoreeName,
      ecard_template_id: template.id,
      ecard_design_name_snapshot: template.name,
      ecard_send_datetime: sendDateObj.toISOString(),
      recipient_email: recipientEmail,
      message: message || null,
      status: 'scheduled',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    tributes.push(tribute);
    this._saveToStorage('tribute_donations', tributes);

    this._scheduleEcardSend(tribute);

    return { success: true, donation: donation, tribute: tribute, message: 'Tribute donation scheduled' };
  }

  // getAnimalsFilterOptions
  getAnimalsFilterOptions(viewMode) {
    const speciesOptions = [
      { value: 'cat', label: 'Cats' },
      { value: 'dog', label: 'Dogs' },
      { value: 'rabbit', label: 'Rabbits' },
      { value: 'bird', label: 'Birds' },
      { value: 'other', label: 'Other' }
    ];
    const ageGroupOptions = [
      { value: 'baby', label: 'Baby' },
      { value: 'young', label: 'Young' },
      { value: 'adult_2_8_years', label: 'Adult (2–8 years)' },
      { value: 'senior_8_plus', label: 'Senior (8+ years)' }
    ];
    const temperamentOptions = [
      { value: 'shy', label: 'Shy' },
      { value: 'outgoing', label: 'Outgoing' },
      { value: 'calm', label: 'Calm' },
      { value: 'energetic', label: 'Energetic' },
      { value: 'independent', label: 'Independent' }
    ];
    const healthOptions = [
      { value: 'special_medical_needs', label: 'Special medical needs' }
    ];
    const homePreferenceOptions = [
      { value: 'none', label: 'No specific preference' },
      { value: 'quiet_home_preferred', label: 'Quiet home preferred' },
      { value: 'active_home_ok', label: 'Active home ok' },
      { value: 'adult_only_home', label: 'Adult-only home' },
      { value: 'no_other_pets', label: 'No other pets' },
      { value: 'no_dogs', label: 'No dogs' },
      { value: 'no_cats', label: 'No cats' },
      { value: 'no_children_under_12', label: 'No children under 12' }
    ];
    const sortOptions = [
      { value: 'highest_priority', label: 'Highest priority' },
      { value: 'longest_at_sanctuary', label: 'Longest at sanctuary' }
    ];

    return {
      speciesOptions: speciesOptions,
      ageGroupOptions: ageGroupOptions,
      temperamentOptions: temperamentOptions,
      healthOptions: healthOptions,
      homePreferenceOptions: homePreferenceOptions,
      sortOptions: sortOptions
    };
  }

  // getAnimalsListing
  getAnimalsListing(
    viewMode,
    species,
    ageGroup,
    temperament,
    hasSpecialMedicalNeeds,
    homePreference,
    sortBy,
    page,
    pageSize
  ) {
    const animalsAll = this._getFromStorage('animals');
    const mode = viewMode || 'adopt';
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const filtered = [];
    for (let i = 0; i < animalsAll.length; i++) {
      const a = animalsAll[i];
      if (mode === 'adopt' && a.adoption_status !== 'available') continue;
      if (mode === 'sponsor' && a.sponsorship_status && a.sponsorship_status !== 'available') continue;
      if (species && a.species !== species) continue;
      if (ageGroup && a.age_group !== ageGroup) continue;
      if (typeof hasSpecialMedicalNeeds === 'boolean') {
        const flag = !!a.has_special_medical_needs;
        if (flag !== hasSpecialMedicalNeeds) continue;
      }
      if (temperament && a.temperament_primary !== temperament) continue;
      if (homePreference && a.home_preference !== homePreference) continue;
      filtered.push(a);
    }

    if (sortBy === 'highest_priority') {
      filtered.sort(function (a, b) {
        const pa = typeof a.priority_score === 'number' ? a.priority_score : 0;
        const pb = typeof b.priority_score === 'number' ? b.priority_score : 0;
        if (pb !== pa) return pb - pa;
        const da = typeof a.days_at_sanctuary === 'number' ? a.days_at_sanctuary : 0;
        const db = typeof b.days_at_sanctuary === 'number' ? b.days_at_sanctuary : 0;
        return db - da;
      });
    } else if (sortBy === 'longest_at_sanctuary') {
      filtered.sort(function (a, b) {
        const da = typeof a.days_at_sanctuary === 'number' ? a.days_at_sanctuary : 0;
        const db = typeof b.days_at_sanctuary === 'number' ? b.days_at_sanctuary : 0;
        return db - da;
      });
    }

    const totalCount = filtered.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageItems = filtered.slice(start, end);

    const results = [];
    for (let j = 0; j < pageItems.length; j++) {
      const a = pageItems[j];
      const ageLabel = this._buildAgeLabel(a);
      const speciesLabel = this._buildSpeciesLabel(a.species);
      const primaryPhotoUrl = a.photo_urls && a.photo_urls.length ? a.photo_urls[0] : null;
      results.push({
        animal: a,
        ageLabel: ageLabel,
        speciesLabel: speciesLabel,
        primaryPhotoUrl: primaryPhotoUrl
      });
    }

    return {
      animals: results,
      totalCount: totalCount,
      page: pageNum,
      pageSize: size
    };
  }

  _buildAgeLabel(animal) {
    if (!animal) return '';
    if (typeof animal.age_years === 'number') {
      if (animal.age_years < 1) return 'Under 1 year';
      if (animal.age_years === 1) return '1 year old';
      return animal.age_years + ' years old';
    }
    if (animal.age_group === 'baby') return 'Baby';
    if (animal.age_group === 'young') return 'Young';
    if (animal.age_group === 'adult_2_8_years') return 'Adult (2–8 years)';
    if (animal.age_group === 'senior_8_plus') return 'Senior (8+ years)';
    return '';
  }

  _buildSpeciesLabel(species) {
    if (species === 'cat') return 'Cat';
    if (species === 'dog') return 'Dog';
    if (species === 'rabbit') return 'Rabbit';
    if (species === 'bird') return 'Bird';
    if (species === 'other') return 'Other';
    return '';
  }

  // getAnimalDetail
  getAnimalDetail(animalId) {
    const animals = this._getFromStorage('animals');
    const animal = this._findById(animals, animalId);
    if (!animal) {
      return {
        animal: null,
        ageLabel: '',
        speciesLabel: '',
        primaryPhotoUrl: null,
        sponsorshipAvailable: false,
        sponsorshipDefaults: {
          minimumAmount: 10,
          suggestedAmounts: [15, 25, 50],
          currency: 'USD',
          allowedFrequencies: ['monthly'],
          defaultBillingDayOfMonth: 1
        },
        fosterAvailable: false
      };
    }
    const ageLabel = this._buildAgeLabel(animal);
    const speciesLabel = this._buildSpeciesLabel(animal.species);
    const primaryPhotoUrl = animal.photo_urls && animal.photo_urls.length ? animal.photo_urls[0] : null;
    const sponsorshipAvailable = animal.sponsorship_status === 'available';
    const fosterAvailable = animal.adoption_status !== 'adopted';

    return {
      animal: animal,
      ageLabel: ageLabel,
      speciesLabel: speciesLabel,
      primaryPhotoUrl: primaryPhotoUrl,
      sponsorshipAvailable: sponsorshipAvailable,
      sponsorshipDefaults: {
        minimumAmount: 10,
        suggestedAmounts: [15, 25, 50],
        currency: 'USD',
        allowedFrequencies: ['monthly'],
        defaultBillingDayOfMonth: 1
      },
      fosterAvailable: fosterAvailable
    };
  }

  // startAnimalSponsorship
  startAnimalSponsorship(
    animalId,
    amount,
    currency,
    frequency,
    billingDayOfMonth,
    sponsorName,
    sponsorEmail,
    newsletterOptIn,
    paymentMethod,
    cardNumber,
    cardExpirationMonth,
    cardExpirationYear,
    cardCvv,
    billingPostalCode
  ) {
    if (frequency !== 'monthly') {
      return { success: false, sponsorship: null, initialDonation: null, message: 'Only monthly frequency is supported' };
    }
    if (!amount || amount <= 0) {
      return { success: false, sponsorship: null, initialDonation: null, message: 'Invalid sponsorship amount' };
    }

    const animals = this._getFromStorage('animals');
    const animal = this._findById(animals, animalId);
    if (!animal) {
      return { success: false, sponsorship: null, initialDonation: null, message: 'Animal not found' };
    }

    const payment = this._processCreditCardPayment(
      cardNumber,
      cardExpirationMonth,
      cardExpirationYear,
      cardCvv,
      billingPostalCode
    );
    if (!payment.success) {
      return { success: false, sponsorship: null, initialDonation: null, message: payment.message || 'Payment failed' };
    }

    const sponsorship = this._createRecurringSponsorshipRecord({
      animalId: animalId,
      sponsorName: sponsorName,
      sponsorEmail: sponsorEmail,
      amount: amount,
      currency: currency || 'USD',
      billingDayOfMonth: billingDayOfMonth,
      paymentMethod: paymentMethod || 'credit_card',
      cardNumberMasked: payment.cardNumberMasked,
      cardLast4: payment.cardLast4,
      cardBrand: payment.cardBrand,
      cardExpirationMonth: cardExpirationMonth,
      cardExpirationYear: cardExpirationYear,
      billingPostalCode: billingPostalCode
    });

    const donation = this._createDonationRecord({
      campaignId: null,
      donationType: 'recurring',
      amount: amount,
      currency: currency || 'USD',
      donorFullName: sponsorName,
      donorEmail: sponsorEmail,
      newsletterOptIn: !!newsletterOptIn,
      paymentMethod: paymentMethod || 'credit_card',
      cardNumberMasked: payment.cardNumberMasked,
      cardLast4: payment.cardLast4,
      cardBrand: payment.cardBrand,
      cardExpirationMonth: cardExpirationMonth,
      cardExpirationYear: cardExpirationYear,
      billingPostalCode: billingPostalCode,
      status: 'completed',
      source: 'animal_sponsorship',
      recurringSponsorshipId: sponsorship.id,
      eventRegistrationId: null,
      wishlistOrderId: null
    });

    return {
      success: true,
      sponsorship: sponsorship,
      initialDonation: donation,
      message: 'Monthly sponsorship started'
    };
  }

  // getFosterFormData
  getFosterFormData(animalId) {
    const animals = this._getFromStorage('animals');
    const animal = this._findById(animals, animalId);

    const animalSummary = animal
      ? {
          id: animal.id,
          name: animal.name,
          speciesLabel: this._buildSpeciesLabel(animal.species),
          ageLabel: this._buildAgeLabel(animal),
          primaryPhotoUrl: animal.photo_urls && animal.photo_urls.length ? animal.photo_urls[0] : null
        }
      : {
          id: null,
          name: null,
          speciesLabel: '',
          ageLabel: '',
          primaryPhotoUrl: null
        };

    const allowedDurations = [
      { value: '1_month', label: '1 month' },
      { value: '2_months', label: '2 months' },
      { value: '3_months', label: '3 months' },
      { value: '6_months', label: '6 months' },
      { value: 'other', label: 'Other' }
    ];
    const defaultDurationValue = '3_months';

    const suggestedStartDates = [];
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    for (let i = 1; i <= 3; i++) {
      const d = new Date(Date.UTC(year, month + i, 1));
      const iso = d.toISOString().slice(0, 10);
      suggestedStartDates.push(iso);
    }

    return {
      animalSummary: animalSummary,
      allowedDurations: allowedDurations,
      defaultDurationValue: defaultDurationValue,
      suggestedStartDates: suggestedStartDates
    };
  }

  // submitFosterInterest
  submitFosterInterest(
    animalId,
    fostererName,
    fostererEmail,
    fostererPhone,
    startDate,
    durationOption,
    homeDescription
  ) {
    if (!startDate) {
      return { success: false, fosterInterest: null, message: 'Start date is required' };
    }
    const startDateIso = new Date(startDate + 'T09:00:00Z').toISOString();

    const record = this._createFosterInterestRecord({
      animalId: animalId,
      fostererName: fostererName,
      fostererEmail: fostererEmail,
      fostererPhone: fostererPhone,
      startDateIso: startDateIso,
      durationOption: durationOption,
      homeDescription: homeDescription
    });

    return { success: true, fosterInterest: record, message: 'Foster interest submitted' };
  }

  // getWishlistFilterOptions
  getWishlistFilterOptions() {
    const categories = this._getFromStorage('wishlist_categories');
    const items = this._getFromStorage('wishlist_items');
    let min = null;
    let max = null;
    for (let i = 0; i < items.length; i++) {
      const price = items[i].price;
      if (typeof price === 'number') {
        if (min === null || price < min) min = price;
        if (max === null || price > max) max = price;
      }
    }
    if (min === null) min = 0;
    if (max === null) max = 0;

    const sortOptions = [
      { value: 'most_needed', label: 'Most needed' },
      { value: 'price_low_to_high', label: 'Price: low to high' },
      { value: 'price_high_to_low', label: 'Price: high to low' },
      { value: 'name_az', label: 'Name A–Z' }
    ];

    return {
      categories: categories,
      priceRange: {
        min: min,
        max: max,
        currency: 'USD'
      },
      sortOptions: sortOptions
    };
  }

  // getWishlistItems
  getWishlistItems(
    categoryKey,
    minPrice,
    maxPrice,
    sortBy,
    page,
    pageSize
  ) {
    const itemsAll = this._getFromStorage('wishlist_items');
    const categories = this._getFromStorage('wishlist_categories');
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const filtered = [];
    for (let i = 0; i < itemsAll.length; i++) {
      const it = itemsAll[i];
      if (!it.is_active) continue;
      if (categoryKey && it.category_key !== categoryKey) continue;
      if (typeof minPrice === 'number' && it.price < minPrice) continue;
      if (typeof maxPrice === 'number' && it.price > maxPrice) continue;
      filtered.push(it);
    }

    if (sortBy === 'most_needed') {
      filtered.sort(function (a, b) {
        const na = typeof a.need_priority_score === 'number' ? a.need_priority_score : 0;
        const nb = typeof b.need_priority_score === 'number' ? b.need_priority_score : 0;
        return nb - na;
      });
    } else if (sortBy === 'price_low_to_high') {
      filtered.sort(function (a, b) {
        return a.price - b.price;
      });
    } else if (sortBy === 'price_high_to_low') {
      filtered.sort(function (a, b) {
        return b.price - a.price;
      });
    } else if (sortBy === 'name_az') {
      filtered.sort(function (a, b) {
        const na = a.name || '';
        const nb = b.name || '';
        return na.localeCompare(nb);
      });
    }

    const totalCount = filtered.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageItems = filtered.slice(start, end);

    const resultItems = [];
    for (let j = 0; j < pageItems.length; j++) {
      const it = pageItems[j];
      let categoryName = '';
      for (let k = 0; k < categories.length; k++) {
        if (categories[k].key === it.category_key) {
          categoryName = categories[k].name;
          break;
        }
      }
      resultItems.push({
        item: it,
        categoryName: categoryName
      });
    }

    return {
      items: resultItems,
      totalCount: totalCount,
      page: pageNum,
      pageSize: size
    };
  }

  // getWishlistItemDetail
  getWishlistItemDetail(wishlistItemId) {
    const items = this._getFromStorage('wishlist_items');
    const categories = this._getFromStorage('wishlist_categories');
    const item = this._findById(items, wishlistItemId);
    if (!item) {
      return {
        item: null,
        categoryName: '',
        needDescription: '',
        minQuantity: 1,
        maxQuantityPerOrder: null,
        recommendedQuantity: 1
      };
    }

    let categoryName = '';
    for (let i = 0; i < categories.length; i++) {
      if (categories[i].key === item.category_key) {
        categoryName = categories[i].name;
        break;
      }
    }

    const minQuantity = typeof item.min_quantity === 'number' && item.min_quantity > 0 ? item.min_quantity : 1;
    const maxQuantityPerOrder = typeof item.max_quantity_per_order === 'number' ? item.max_quantity_per_order : null;
    let recommendedQuantity = minQuantity;
    if (maxQuantityPerOrder && maxQuantityPerOrder > minQuantity) {
      recommendedQuantity = Math.round((minQuantity + maxQuantityPerOrder) / 2);
    }

    return {
      item: item,
      categoryName: categoryName,
      needDescription: item.description || '',
      minQuantity: minQuantity,
      maxQuantityPerOrder: maxQuantityPerOrder,
      recommendedQuantity: recommendedQuantity
    };
  }

  // addWishlistItemToCart
  addWishlistItemToCart(wishlistItemId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();
    const items = this._getFromStorage('wishlist_items');
    const product = this._findById(items, wishlistItemId);
    if (!product || !product.is_active) {
      return { success: false, cartId: cart.id, cartItem: null, cartSummary: null, message: 'Wishlist item not available' };
    }

    const allCartItems = this._getFromStorage('cart_items');
    const cartItemsForCart = [];
    let existing = null;
    for (let i = 0; i < allCartItems.length; i++) {
      const ci = allCartItems[i];
      if (ci.cart_id === cart.id) {
        if (ci.wishlist_item_id === wishlistItemId && !existing) {
          existing = ci;
        }
        cartItemsForCart.push(ci);
      }
    }

    let cartItem = null;
    if (existing) {
      existing.quantity += qty;
      existing.line_total = existing.unit_price_snapshot * existing.quantity;
      cartItem = existing;
    } else {
      cartItem = {
        id: this._generateId('citem'),
        cart_id: cart.id,
        wishlist_item_id: product.id,
        item_name_snapshot: product.name,
        category_key_snapshot: product.category_key,
        unit_price_snapshot: product.price,
        quantity: qty,
        line_total: product.price * qty,
        created_at: this._nowIso()
      };
      cartItemsForCart.push(cartItem);
    }

    cart.updated_at = this._nowIso();
    this._saveCartChanges(cart, cartItemsForCart);

    const totals = this._calculateCartTotals(cart, cartItemsForCart);
    const cartSummary = {
      totalItems: totals.distinctItemCount,
      totalQuantity: totals.totalQuantity,
      subtotal: totals.subtotal,
      currency: totals.currency
    };

    return {
      success: true,
      cartId: cart.id,
      cartItem: cartItem,
      cartSummary: cartSummary,
      message: 'Item added to cart'
    };
  }

  // getDonationCart
  getDonationCart() {
    const current = this._getCurrentCart();
    let cart = current.cart;
    let cartItems = current.items;

    // If there is no open cart, fall back to the most recently updated cart (e.g., a checked-out cart)
    if (!cart) {
      const allCarts = this._getFromStorage('carts');
      let latestCart = null;
      for (let i = 0; i < allCarts.length; i++) {
        const c = allCarts[i];
        if (!latestCart || (c.updated_at && (!latestCart.updated_at || c.updated_at > latestCart.updated_at))) {
          latestCart = c;
        }
      }
      if (latestCart) {
        cart = latestCart;
        const allItems = this._getFromStorage('cart_items');
        cartItems = [];
        for (let j = 0; j < allItems.length; j++) {
          if (allItems[j].cart_id === cart.id) {
            cartItems.push(allItems[j]);
          }
        }
      }
    }

    if (!cart) {
      return {
        cart: null,
        items: [],
        totals: {
          subtotal: 0,
          discountTotal: 0,
          total: 0,
          currency: 'USD',
          promoCode: null,
          totalQuantity: 0,
          distinctItemCount: 0
        }
      };
    }

    const wishlistItems = this._getFromStorage('wishlist_items');
    const categories = this._getFromStorage('wishlist_categories');

    const itemsDetailed = [];
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      let witem = null;
      for (let j = 0; j < wishlistItems.length; j++) {
        if (wishlistItems[j].id === ci.wishlist_item_id) {
          witem = wishlistItems[j];
          break;
        }
      }
      let categoryName = '';
      if (witem) {
        for (let k = 0; k < categories.length; k++) {
          if (categories[k].key === witem.category_key) {
            categoryName = categories[k].name;
            break;
          }
        }
      }
      itemsDetailed.push({
        cartItem: ci,
        wishlistItem: witem,
        categoryName: categoryName
      });
    }

    const totals = this._calculateCartTotals(cart, cartItems);

    return {
      cart: cart,
      items: itemsDetailed,
      totals: totals
    };
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    const current = this._getCurrentCart();
    const cart = current.cart;
    if (!cart) {
      return {
        success: false,
        cart: null,
        updatedItem: null,
        totals: {
          subtotal: 0,
          discountTotal: 0,
          total: 0,
          currency: 'USD',
          promoCode: null,
          totalQuantity: 0,
          distinctItemCount: 0
        },
        message: 'No active cart'
      };
    }
    const qty = typeof quantity === 'number' ? quantity : 0;

    const allItems = this._getFromStorage('cart_items');
    const cartItemsForCart = [];
    let updatedItem = null;
    for (let i = 0; i < allItems.length; i++) {
      const ci = allItems[i];
      if (ci.cart_id !== cart.id) continue;
      if (ci.id === cartItemId) {
        if (qty <= 0) {
          // skip to remove
          continue;
        }
        ci.quantity = qty;
        ci.line_total = ci.unit_price_snapshot * qty;
        updatedItem = ci;
      }
      cartItemsForCart.push(ci);
    }

    cart.updated_at = this._nowIso();
    this._saveCartChanges(cart, cartItemsForCart);
    const totals = this._calculateCartTotals(cart, cartItemsForCart);

    return {
      success: true,
      cart: cart,
      updatedItem: updatedItem,
      totals: totals,
      message: 'Cart updated'
    };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    const current = this._getCurrentCart();
    const cart = current.cart;
    if (!cart) {
      return {
        success: false,
        cart: null,
        totals: {
          subtotal: 0,
          discountTotal: 0,
          total: 0,
          currency: 'USD',
          promoCode: null,
          totalQuantity: 0,
          distinctItemCount: 0
        },
        remainingItemsCount: 0,
        message: 'No active cart'
      };
    }

    const allItems = this._getFromStorage('cart_items');
    const cartItemsForCart = [];
    for (let i = 0; i < allItems.length; i++) {
      const ci = allItems[i];
      if (ci.cart_id !== cart.id) continue;
      if (ci.id === cartItemId) continue;
      cartItemsForCart.push(ci);
    }

    cart.updated_at = this._nowIso();
    this._saveCartChanges(cart, cartItemsForCart);
    const totals = this._calculateCartTotals(cart, cartItemsForCart);

    return {
      success: true,
      cart: cart,
      totals: totals,
      remainingItemsCount: cartItemsForCart.length,
      message: 'Item removed from cart'
    };
  }

  // applyPromoCodeToCart
  applyPromoCodeToCart(code) {
    const current = this._getCurrentCart();
    const cart = current.cart;
    const cartItems = current.items;
    if (!cart) {
      return {
        success: false,
        cart: null,
        promoCode: null,
        totals: {
          subtotal: 0,
          discountTotal: 0,
          total: 0,
          currency: 'USD',
          promoCode: null,
          totalQuantity: 0,
          distinctItemCount: 0
        },
        message: 'No active cart'
      };
    }

    const promos = this._getFromStorage('promo_codes');
    const codeUpper = String(code || '').toUpperCase();
    let promo = null;
    for (let i = 0; i < promos.length; i++) {
      const p = promos[i];
      if (p.is_active && String(p.code).toUpperCase() === codeUpper) {
        promo = p;
        break;
      }
    }
    if (!promo) {
      return {
        success: false,
        cart: cart,
        promoCode: null,
        totals: this._calculateCartTotals(cart, cartItems),
        message: 'Promo code not found or inactive'
      };
    }
    if (!(promo.applies_to === 'wishlist_only' || promo.applies_to === 'all')) {
      return {
        success: false,
        cart: cart,
        promoCode: null,
        totals: this._calculateCartTotals(cart, cartItems),
        message: 'Promo code not applicable to wishlist cart'
      };
    }

    cart.promo_code = promo.code;
    cart.updated_at = this._nowIso();
    this._saveCartChanges(cart, cartItems);
    const totals = this._calculateCartTotals(cart, cartItems);

    return {
      success: true,
      cart: cart,
      promoCode: promo,
      totals: totals,
      message: 'Promo code applied'
    };
  }

  // getWishlistCheckoutSummary
  getWishlistCheckoutSummary() {
    const current = this._getCurrentCart();
    const cart = current.cart;
    const cartItems = current.items;

    if (!cart) {
      return {
        cart: null,
        items: [],
        totals: {
          subtotal: 0,
          discountTotal: 0,
          total: 0,
          currency: 'USD',
          promoCode: null
        }
      };
    }

    const wishlistItems = this._getFromStorage('wishlist_items');
    const categories = this._getFromStorage('wishlist_categories');

    const itemsSummary = [];
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      let witem = null;
      for (let j = 0; j < wishlistItems.length; j++) {
        if (wishlistItems[j].id === ci.wishlist_item_id) {
          witem = wishlistItems[j];
          break;
        }
      }
      let categoryName = '';
      if (witem) {
        for (let k = 0; k < categories.length; k++) {
          if (categories[k].key === witem.category_key) {
            categoryName = categories[k].name;
            break;
          }
        }
      }
      const snapshot = {
        itemName: ci.item_name_snapshot,
        categoryName: categoryName,
        unitPrice: ci.unit_price_snapshot,
        quantity: ci.quantity,
        lineTotal: ci.line_total
      };
      itemsSummary.push({
        cartItem: ci,
        itemSnapshot: snapshot
      });
    }

    const totals = this._calculateCartTotals(cart, cartItems);

    return {
      cart: cart,
      items: itemsSummary,
      totals: {
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        total: totals.total,
        currency: totals.currency,
        promoCode: totals.promoCode
      }
    };
  }

  // submitWishlistCheckout
  submitWishlistCheckout(
    donorFullName,
    donorEmail,
    billingPostalCode,
    paymentMethod,
    cardNumber,
    cardExpirationMonth,
    cardExpirationYear,
    cardCvv
  ) {
    const current = this._getCurrentCart();
    const cart = current.cart;
    const cartItems = current.items;

    if (!cart || cartItems.length === 0) {
      return { success: false, wishlistOrder: null, donation: null, message: 'Cart is empty' };
    }

    const totals = this._calculateCartTotals(cart, cartItems);
    if (totals.total <= 0) {
      return { success: false, wishlistOrder: null, donation: null, message: 'Cart total must be greater than zero' };
    }

    const payment = this._processCreditCardPayment(
      cardNumber,
      cardExpirationMonth,
      cardExpirationYear,
      cardCvv,
      billingPostalCode
    );
    if (!payment.success) {
      return { success: false, wishlistOrder: null, donation: null, message: payment.message || 'Payment failed' };
    }

    const order = this._createWishlistOrderFromCart(
      cart,
      cartItems,
      totals,
      donorFullName,
      donorEmail,
      billingPostalCode,
      {
        paymentMethod: paymentMethod || 'credit_card',
        cardNumberMasked: payment.cardNumberMasked,
        cardLast4: payment.cardLast4,
        cardBrand: payment.cardBrand,
        cardExpirationMonth: cardExpirationMonth,
        cardExpirationYear: cardExpirationYear
      }
    );

    // Create associated donation
    const donation = this._createDonationRecord({
      campaignId: null,
      donationType: 'wishlist',
      amount: totals.total,
      currency: totals.currency || 'USD',
      donorFullName: donorFullName,
      donorEmail: donorEmail,
      newsletterOptIn: false,
      paymentMethod: paymentMethod || 'credit_card',
      cardNumberMasked: payment.cardNumberMasked,
      cardLast4: payment.cardLast4,
      cardBrand: payment.cardBrand,
      cardExpirationMonth: cardExpirationMonth,
      cardExpirationYear: cardExpirationYear,
      billingPostalCode: billingPostalCode,
      status: 'completed',
      source: 'wishlist_checkout',
      recurringSponsorshipId: null,
      eventRegistrationId: null,
      wishlistOrderId: order.id
    });

    // Mark cart as checked out
    const carts = this._getFromStorage('carts');
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i].status = 'checked_out';
        carts[i].updated_at = this._nowIso();
        break;
      }
    }
    this._saveToStorage('carts', carts);

    return {
      success: true,
      wishlistOrder: order,
      donation: donation,
      message: 'Wishlist checkout completed'
    };
  }

  // getEventsFilterOptions
  getEventsFilterOptions() {
    const events = this._getFromStorage('events');
    let earliest = null;
    let latest = null;
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!e.start_datetime) continue;
      const dateStr = String(e.start_datetime).slice(0, 10);
      if (!earliest || dateStr < earliest) earliest = dateStr;
      if (!latest || dateStr > latest) latest = dateStr;
    }

    const eventTypeOptions = [
      { value: 'on_site_tour', label: 'On-site tour' },
      { value: 'virtual_tour', label: 'Virtual tour' },
      { value: 'fundraiser', label: 'Fundraiser' },
      { value: 'workshop', label: 'Workshop' },
      { value: 'other', label: 'Other' }
    ];

    return {
      eventTypeOptions: eventTypeOptions,
      dateRange: {
        earliestDate: earliest,
        latestDate: latest
      }
    };
  }

  // getEventsList
  getEventsList(eventType, date, onlyUpcoming) {
    const events = this._getFromStorage('events');
    const onlyUpcomingBool = typeof onlyUpcoming === 'boolean' ? onlyUpcoming : true;
    const todayStr = new Date().toISOString().slice(0, 10);

    const result = [];
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.status !== 'scheduled') continue;
      if (eventType && e.event_type !== eventType) continue;
      if (date) {
        const dStr = String(e.start_datetime).slice(0, 10);
        if (dStr !== date) continue;
      }
      if (onlyUpcomingBool) {
        const dStr2 = String(e.start_datetime).slice(0, 10);
        if (dStr2 < todayStr) continue;
      }
      result.push(e);
    }

    return {
      events: result,
      totalCount: result.length
    };
  }

  // getEventDetail
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const event = this._findById(events, eventId);
    if (!event) {
      return {
        event: null,
        formattedDate: '',
        formattedTime: '',
        isFull: false,
        remainingSlots: 0,
        registrationOpen: false,
        allowsAdditionalDonation: false,
        additionalDonationSuggestedAmounts: []
      };
    }

    let formattedDate = '';
    let formattedTime = '';
    if (event.start_datetime) {
      const d = new Date(event.start_datetime);
      formattedDate = d.toLocaleDateString('en-US');
      formattedTime = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    const isFull = typeof event.available_slots === 'number' && event.available_slots <= 0;
    const remainingSlots = typeof event.available_slots === 'number' ? event.available_slots : null;
    const registrationOpen = event.registration_required && event.status === 'scheduled' && !isFull;
    const allowsAdditionalDonation = !!event.is_free;

    return {
      event: event,
      formattedDate: formattedDate,
      formattedTime: formattedTime,
      isFull: isFull,
      remainingSlots: remainingSlots,
      registrationOpen: registrationOpen,
      allowsAdditionalDonation: allowsAdditionalDonation,
      additionalDonationSuggestedAmounts: allowsAdditionalDonation ? [10, 25, 50] : []
    };
  }

  // registerForEvent
  registerForEvent(
    eventId,
    registrantName,
    registrantEmail,
    numAttendees,
    addDonation,
    additionalDonationAmount,
    paymentMethod,
    cardNumber,
    cardExpirationMonth,
    cardExpirationYear,
    cardCvv,
    billingPostalCode
  ) {
    const events = this._getFromStorage('events');
    const event = this._findById(events, eventId);
    if (!event) {
      return { success: false, registration: null, additionalDonation: null, message: 'Event not found' };
    }

    const detail = this.getEventDetail(eventId);
    if (!detail.registrationOpen) {
      return { success: false, registration: null, additionalDonation: null, message: 'Registration is closed for this event' };
    }

    if (typeof event.available_slots === 'number' && numAttendees > event.available_slots) {
      return { success: false, registration: null, additionalDonation: null, message: 'Not enough available slots' };
    }

    let donationRecord = null;
    let addDonationBool = !!addDonation;
    let addAmount = additionalDonationAmount || 0;

    if (addDonationBool && addAmount > 0) {
      const payment = this._processCreditCardPayment(
        cardNumber,
        cardExpirationMonth,
        cardExpirationYear,
        cardCvv,
        billingPostalCode
      );
      if (!payment.success) {
        return { success: false, registration: null, additionalDonation: null, message: payment.message || 'Payment failed' };
      }

      // First create registration to link donation to it
      const regResult = this._createEventRegistrationRecord({
        eventId: eventId,
        registrantName: registrantName,
        registrantEmail: registrantEmail,
        numAttendees: numAttendees,
        addDonation: true,
        additionalDonationAmount: addAmount
      });
      const registration = regResult.registration;
      if (!registration) {
        return { success: false, registration: null, additionalDonation: null, message: 'Could not create registration' };
      }

      donationRecord = this._createDonationRecord({
        campaignId: null,
        donationType: 'event_addon',
        amount: addAmount,
        currency: 'USD',
        donorFullName: registrantName,
        donorEmail: registrantEmail,
        newsletterOptIn: false,
        paymentMethod: paymentMethod || 'credit_card',
        cardNumberMasked: payment.cardNumberMasked,
        cardLast4: payment.cardLast4,
        cardBrand: payment.cardBrand,
        cardExpirationMonth: cardExpirationMonth,
        cardExpirationYear: cardExpirationYear,
        billingPostalCode: billingPostalCode,
        status: 'completed',
        source: 'event_registration',
        recurringSponsorshipId: null,
        eventRegistrationId: registration.id,
        wishlistOrderId: null
      });

      return {
        success: true,
        registration: registration,
        additionalDonation: donationRecord,
        message: 'Event registration completed with additional donation'
      };
    } else {
      // Registration without donation
      const regResult = this._createEventRegistrationRecord({
        eventId: eventId,
        registrantName: registrantName,
        registrantEmail: registrantEmail,
        numAttendees: numAttendees,
        addDonation: false,
        additionalDonationAmount: 0
      });
      const registration = regResult.registration;
      if (!registration) {
        return { success: false, registration: null, additionalDonation: null, message: 'Could not create registration' };
      }
      return {
        success: true,
        registration: registration,
        additionalDonation: null,
        message: 'Event registration completed'
      };
    }
  }

  // getNewsletterSignupOptions
  getNewsletterSignupOptions() {
    const interestOptions = [
      {
        value: 'rescue_stories',
        label: 'Rescue Stories',
        description: 'Heartwarming updates on animals saved and rehabilitated.'
      },
      {
        value: 'volunteer_opportunities',
        label: 'Volunteer Opportunities',
        description: 'Ways to help at the sanctuary and special events.'
      }
    ];
    const frequencyOptions = [
      { value: 'instant', label: 'Instant', description: 'Get updates as soon as they happen.' },
      { value: 'weekly', label: 'Weekly', description: 'A weekly roundup of news.' },
      { value: 'monthly_summary', label: 'Monthly summary', description: 'A monthly overview of major stories.' },
      { value: 'quarterly', label: 'Quarterly', description: 'Highlights each season.' }
    ];

    return {
      interestOptions: interestOptions,
      frequencyOptions: frequencyOptions,
      defaultFrequencyValue: 'monthly_summary',
      urgentAlertsDefault: true
    };
  }

  // submitNewsletterSubscription
  submitNewsletterSubscription(email, fullName, interests, frequency, wantsUrgentAlerts) {
    if (!email) {
      return { success: false, subscription: null, message: 'Email is required' };
    }
    if (!frequency) {
      return { success: false, subscription: null, message: 'Frequency is required' };
    }

    const subscription = this._createNewsletterSubscriptionRecord({
      email: email,
      fullName: fullName,
      interests: interests || [],
      frequency: frequency,
      wantsUrgentAlerts: !!wantsUrgentAlerts
    });

    return { success: true, subscription: subscription, message: 'Subscription saved' };
  }

  // getAboutPageContent
  getAboutPageContent() {
    return {
      mission: 'We provide lifelong sanctuary, medical care, and advocacy for animals in need.',
      values: [
        { title: 'Compassion', description: 'Every animal is treated as an individual with unique needs.' },
        { title: 'Transparency', description: 'We are open about how donations are used to help animals.' },
        { title: 'Community', description: 'We partner with our community to create lasting change for animals.' }
      ],
      impactMetrics: [
        { key: 'lives_saved', label: 'Lives saved', value: 'N/A' },
        { key: 'medical_cases', label: 'Medical cases treated', value: 'N/A' }
      ],
      programOverviews: [
        { key: 'rescue', name: 'Rescue & Sanctuary', description: 'Providing lifetime care for animals who have nowhere else to go.' },
        { key: 'medical', name: 'Emergency Medical Fund', description: 'Covering urgent surgeries, medications, and specialized care.' },
        { key: 'community', name: 'Community Programs', description: 'Education, outreach, and support to keep animals with their families.' }
      ]
    };
  }

  // getContactPageContent
  getContactPageContent() {
    return {
      email: 'info@example-sanctuary.org',
      phone: '+1 (555) 000-0000',
      mailingAddress: '123 Sanctuary Lane, Kindness City, ST 00000',
      locationDescription: 'We are located just outside of town in a quiet rural setting.',
      responseTimeDescription: 'We aim to respond to messages within 2–3 business days.',
      urgentConcernsInstructions: 'If you believe an animal is in immediate danger, please contact local animal control or law enforcement first.'
    };
  }

  // submitContactForm
  submitContactForm(name, email, subject, topic, message) {
    if (!name || !email || !subject || !message) {
      return { success: false, ticketId: null, message: 'All required fields must be filled in' };
    }
    const ticketId = this._generateId('ticket');
    // No persistence required; assume ticket is passed to an external system.
    return { success: true, ticketId: ticketId, message: 'Your message has been received' };
  }

  // getPrivacyAndTermsContent
  getPrivacyAndTermsContent() {
    const today = new Date().toISOString().slice(0, 10);
    return {
      privacyPolicyHtml: '<p>We respect your privacy and use your information only to support the sanctuary\'s mission.</p>',
      termsOfUseHtml: '<p>By using this site you agree to use it in a way that supports the safety and wellbeing of animals.</p>',
      lastUpdated: today,
      privacyContactEmail: 'privacy@example-sanctuary.org'
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
