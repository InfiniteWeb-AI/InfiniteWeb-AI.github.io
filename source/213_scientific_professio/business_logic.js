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
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    this.idCounter = parseInt(localStorage.getItem('idCounter') || '1000', 10);
  }

  // ------------------------
  // Initialization & helpers
  // ------------------------

  _initStorage() {
    // Initialize all data tables/collections in localStorage if not exist
    const arrayKeys = [
      'membership_plans',
      'carts',
      'cart_items',
      'conferences',
      'conference_sessions',
      'conference_registrations',
      'conference_session_registrations',
      'journals',
      'journal_articles',
      'reading_list_items',
      'job_postings',
      'saved_jobs',
      'committees',
      'committee_volunteer_interests',
      'research_grants',
      'saved_grant_opportunities',
      'store_categories',
      'products',
      'resources',
      'resource_collections',
      'resource_collection_items',
      'profiles',
      'topics',
      'announcements',
      'common_tasks'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Optional single-object configs (do not seed with domain data)
    if (!localStorage.getItem('society_info')) {
      // leave null; getters will handle absence
    }
    if (!localStorage.getItem('help_and_policies_content')) {
      // leave null; getters will handle absence
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    this.idCounter = next;
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _now() {
    return new Date().toISOString();
  }

  // ------------------------
  // Shared domain helpers
  // ------------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts', []);
    let cart = carts.find(c => c.status === 'open');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        items_count: 0,
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _persistCart(cart) {
    const carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  _loadProfile() {
    const profiles = this._getFromStorage('profiles', []);
    return profiles.length > 0 ? profiles[0] : null;
  }

  _saveProfile(profile) {
    const profiles = [profile];
    this._saveToStorage('profiles', profiles);
  }

  _getReadingListStorage() {
    const items = this._getFromStorage('reading_list_items', []);
    return items;
  }

  _setReadingListStorage(items) {
    this._saveToStorage('reading_list_items', items);
  }

  _getSavedJobsStorage() {
    return this._getFromStorage('saved_jobs', []);
  }

  _setSavedJobsStorage(items) {
    this._saveToStorage('saved_jobs', items);
  }

  _getSavedOpportunitiesStorage() {
    return this._getFromStorage('saved_grant_opportunities', []);
  }

  _setSavedOpportunitiesStorage(items) {
    this._saveToStorage('saved_grant_opportunities', items);
  }

  _getResourceCollectionsStorage() {
    const collections = this._getFromStorage('resource_collections', []);
    const items = this._getFromStorage('resource_collection_items', []);
    return { collections, items };
  }

  _setResourceCollectionsStorage(collections, items) {
    this._saveToStorage('resource_collections', collections);
    this._saveToStorage('resource_collection_items', items);
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getHomeFeaturedContent
  getHomeFeaturedContent() {
    const conferences = this._getFromStorage('conferences', []);
    const researchGrants = this._getFromStorage('research_grants', []);
    const conferenceSessions = this._getFromStorage('conference_sessions', []);
    const announcements = this._getFromStorage('announcements', []);
    const commonTasks = this._getFromStorage('common_tasks', []);

    const activeConfs = conferences.filter(c => c.is_active);
    activeConfs.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const featuredConference = activeConfs[0] || null;

    let featuredWorkshops = [];
    if (featuredConference) {
      featuredWorkshops = conferenceSessions
        .filter(s => s.conference_id === featuredConference.id)
        .filter(s => s.format === 'in_person_workshop')
        .slice(0, 5);
    }

    const activeGrants = researchGrants.filter(g => g.is_active);
    activeGrants.sort((a, b) => (b.award_amount_min || 0) - (a.award_amount_min || 0));
    const featuredGrants = activeGrants.slice(0, 5);

    return {
      featured_conference: featuredConference || null,
      featured_workshops: featuredWorkshops,
      featured_grants: featuredGrants,
      announcements: announcements,
      common_tasks: commonTasks
    };
  }

  // getMembershipOverview
  getMembershipOverview() {
    const plans = this._getFromStorage('membership_plans', []);
    const activePlans = plans.filter(p => p.is_active);

    const stageLabels = {
      early_career_within_10_years_phd: 'Early-career (within 10 years of PhD)',
      student: 'Student',
      regular: 'Regular',
      retired: 'Retired',
      affiliate: 'Affiliate',
      other: 'Other'
    };

    const stageMap = {};
    for (const plan of activePlans) {
      if (!stageMap[plan.career_stage]) {
        stageMap[plan.career_stage] = [];
      }
      stageMap[plan.career_stage].push(plan);
    }

    const categories = Object.keys(stageMap).map(stage => {
      const list = stageMap[stage];
      list.sort((a, b) => a.annual_price - b.annual_price);
      const first = list[0];
      return {
        career_stage: stage,
        label: stageLabels[stage] || stage,
        description: '',
        starting_annual_price: first ? first.annual_price : 0,
        currency: first ? first.currency : 'usd'
      };
    });

    // Derive top benefits from existing plans
    const benefitCounts = {};
    for (const plan of activePlans) {
      if (Array.isArray(plan.benefits)) {
        for (const b of plan.benefits) {
          benefitCounts[b] = (benefitCounts[b] || 0) + 1;
        }
      }
    }
    const top_benefits = Object.keys(benefitCounts)
      .sort((a, b) => benefitCounts[b] - benefitCounts[a])
      .slice(0, 5);

    // Highlight cheapest active plans overall
    const highlight_plans = activePlans
      .slice()
      .sort((a, b) => a.annual_price - b.annual_price)
      .slice(0, 5);

    return {
      categories,
      top_benefits,
      highlight_plans
    };
  }

  // getMembershipFilterOptions
  getMembershipFilterOptions() {
    const career_stage_options = [
      { value: 'early_career_within_10_years_phd', label: 'Early-career (within 10 years of PhD)' },
      { value: 'student', label: 'Student' },
      { value: 'regular', label: 'Regular' },
      { value: 'retired', label: 'Retired' },
      { value: 'affiliate', label: 'Affiliate' },
      { value: 'other', label: 'Other' }
    ];

    const benefit_options = [
      {
        key: 'online_journal_access',
        label: 'Online journal access included',
        description: 'Membership includes access to online journal content.'
      },
      {
        key: 'discounted_conference_registration',
        label: 'Discounted conference registration',
        description: 'Reduced registration fees for society conferences.'
      }
    ];

    const sort_options = [
      { value: 'annual_price_low_to_high', label: 'Annual price: Low to High' },
      { value: 'annual_price_high_to_low', label: 'Annual price: High to Low' },
      { value: 'name_az', label: 'Name A–Z' }
    ];

    return {
      career_stage_options,
      benefit_options,
      sort_options
    };
  }

  // searchMembershipPlans
  searchMembershipPlans(careerStage, includesOnlineJournalAccess, minAnnualPrice, maxAnnualPrice, sortBy) {
    let plans = this._getFromStorage('membership_plans', []).filter(p => p.is_active);

    if (careerStage) {
      plans = plans.filter(p => p.career_stage === careerStage);
    }
    if (typeof includesOnlineJournalAccess === 'boolean') {
      plans = plans.filter(p => p.includes_online_journal_access === includesOnlineJournalAccess);
    }
    if (typeof minAnnualPrice === 'number') {
      plans = plans.filter(p => p.annual_price >= minAnnualPrice);
    }
    if (typeof maxAnnualPrice === 'number') {
      plans = plans.filter(p => p.annual_price <= maxAnnualPrice);
    }

    if (sortBy === 'annual_price_low_to_high') {
      plans.sort((a, b) => a.annual_price - b.annual_price);
    } else if (sortBy === 'annual_price_high_to_low') {
      plans.sort((a, b) => b.annual_price - a.annual_price);
    } else if (sortBy === 'name_az') {
      plans.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return plans;
  }

  // getMembershipPlanDetails
  getMembershipPlanDetails(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans', []);
    return plans.find(p => p.id === membershipPlanId) || null;
  }

  // addMembershipToCartWithApplication
  addMembershipToCartWithApplication(
    membershipPlanId,
    applicantFirstName,
    applicantLastName,
    applicantInstitution,
    applicantEmail,
    paymentMethod
  ) {
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find(p => p.id === membershipPlanId && p.is_active);
    if (!plan) {
      return {
        success: false,
        cart_id: null,
        cart_items_count: 0,
        added_cart_item_id: null,
        message: 'Membership plan not found or inactive.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const now = this._now();
    const unitPrice = plan.annual_price || 0;
    const quantity = 1;
    const totalPrice = unitPrice * quantity;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'membership',
      membership_plan_id: plan.id,
      product_id: null,
      conference_session_id: null,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      added_at: now,
      applicant_first_name: applicantFirstName,
      applicant_last_name: applicantLastName,
      applicant_institution: applicantInstitution || '',
      applicant_email: applicantEmail,
      payment_method: paymentMethod
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.items_count = cartItems.filter(ci => ci.cart_id === cart.id).length;
    cart.updated_at = now;
    this._persistCart(cart);

    return {
      success: true,
      cart_id: cart.id,
      cart_items_count: cart.items_count,
      added_cart_item_id: cartItem.id,
      message: 'Membership added to cart.'
    };
  }

  // getCartDetails
  getCartDetails() {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const membershipPlans = this._getFromStorage('membership_plans', []);
    const products = this._getFromStorage('products', []);
    const sessions = this._getFromStorage('conference_sessions', []);

    const cart = carts.find(c => c.status === 'open');
    if (!cart) {
      return {
        cart_id: null,
        status: 'open',
        items_count: 0,
        currency: 'usd',
        subtotal: 0,
        tax: 0,
        total: 0,
        items: []
      };
    }

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    let subtotal = 0;
    const items = itemsForCart.map(ci => {
      let name = '';
      let description = '';
      let metadata = {};
      let currency = 'usd';

      if (ci.item_type === 'membership') {
        const plan = membershipPlans.find(p => p.id === ci.membership_plan_id) || null;
        if (plan) {
          name = plan.name || '';
          description = plan.description || '';
          currency = plan.currency || 'usd';
          metadata = {
            membership_career_stage: plan.career_stage
          };
        }
      } else if (ci.item_type === 'product') {
        const product = products.find(p => p.id === ci.product_id) || null;
        if (product) {
          name = product.name || '';
          description = product.description || '';
          currency = product.currency || 'usd';
          metadata = {
            product_format: product.format
          };
        }
      } else if (ci.item_type === 'conference_session') {
        const session = sessions.find(s => s.id === ci.conference_session_id) || null;
        if (session) {
          name = session.title || '';
          description = session.description || '';
          currency = session.currency || 'usd';
          metadata = {
            session_start_datetime: session.start_datetime,
            session_location_room: session.location_room || ''
          };
        }
      }

      subtotal += ci.total_price || 0;

      return {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        reference_id:
          ci.item_type === 'membership'
            ? ci.membership_plan_id
            : ci.item_type === 'product'
            ? ci.product_id
            : ci.conference_session_id,
        name,
        description,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        total_price: ci.total_price,
        metadata
      };
    });

    const tax = 0;
    const total = subtotal + tax;

    return {
      cart_id: cart.id,
      status: cart.status,
      items_count: items.length,
      currency: items[0] ? items[0].currency || 'usd' : 'usd',
      subtotal,
      tax,
      total,
      items
    };
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    if (quantity <= 0) {
      return this.removeCartItem(cartItemId);
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('carts', []);

    const ciIndex = cartItems.findIndex(ci => ci.id === cartItemId);
    if (ciIndex === -1) {
      return {
        success: false,
        cart_id: null,
        items_count: 0,
        updated_item: null,
        subtotal: 0,
        tax: 0,
        total: 0
      };
    }

    const ci = cartItems[ciIndex];
    ci.quantity = quantity;
    ci.total_price = (ci.unit_price || 0) * quantity;
    cartItems[ciIndex] = ci;
    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find(c => c.id === ci.cart_id) || this._getOrCreateCart();
    cart.items_count = cartItems.filter(x => x.cart_id === cart.id).length;
    cart.updated_at = this._now();
    this._persistCart(cart);

    const itemsForCart = cartItems.filter(x => x.cart_id === cart.id);
    const subtotal = itemsForCart.reduce((sum, x) => sum + (x.total_price || 0), 0);
    const tax = 0;
    const total = subtotal + tax;

    return {
      success: true,
      cart_id: cart.id,
      items_count: cart.items_count,
      updated_item: {
        cart_item_id: ci.id,
        quantity: ci.quantity,
        total_price: ci.total_price
      },
      subtotal,
      tax,
      total
    };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    const carts = this._getFromStorage('carts', []);

    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        cart_id: null,
        items_count: 0,
        subtotal: 0,
        tax: 0,
        total: 0
      };
    }

    const cartId = cartItems[idx].cart_id;
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find(c => c.id === cartId) || this._getOrCreateCart();
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    cart.items_count = itemsForCart.length;
    cart.updated_at = this._now();
    this._persistCart(cart);

    const subtotal = itemsForCart.reduce((sum, x) => sum + (x.total_price || 0), 0);
    const tax = 0;
    const total = subtotal + tax;

    return {
      success: true,
      cart_id: cart.id,
      items_count: cart.items_count,
      subtotal,
      tax,
      total
    };
  }

  // getConferenceOverview
  getConferenceOverview(eventKey) {
    const conferences = this._getFromStorage('conferences', []);
    const conference = conferences.find(c => c.event_key === eventKey) || null;
    return conference;
  }

  // getConferenceProgramFilters
  getConferenceProgramFilters(conferenceId) {
    const sessions = this._getFromStorage('conference_sessions', []).filter(
      s => s.conference_id === conferenceId
    );

    const format_options = [
      { value: 'in_person_workshop', label: 'In-person workshop' },
      { value: 'virtual_workshop', label: 'Virtual workshop' },
      { value: 'hybrid_workshop', label: 'Hybrid workshop' },
      { value: 'plenary_talk', label: 'Plenary talk' },
      { value: 'poster_session', label: 'Poster session' },
      { value: 'panel_discussion', label: 'Panel discussion' },
      { value: 'tutorial', label: 'Tutorial' },
      { value: 'networking_event', label: 'Networking event' }
    ];

    let minFee = 0;
    let maxFee = 0;
    let currency = 'usd';
    if (sessions.length > 0) {
      minFee = Math.min.apply(
        null,
        sessions.map(s => s.fee || 0)
      );
      maxFee = Math.max.apply(
        null,
        sessions.map(s => s.fee || 0)
      );
      currency = sessions[0].currency || 'usd';
    }

    let start_date = null;
    let end_date = null;
    if (sessions.length > 0) {
      start_date = sessions
        .map(s => s.start_datetime)
        .sort((a, b) => new Date(a) - new Date(b))[0];
      end_date = sessions
        .map(s => s.end_datetime)
        .sort((a, b) => new Date(b) - new Date(a))[0];
    }

    const sort_options = [
      { value: 'start_time_earliest_first', label: 'Start time: earliest first' },
      { value: 'start_time_latest_first', label: 'Start time: latest first' },
      { value: 'fee_low_to_high', label: 'Fee: low to high' }
    ];

    return {
      format_options,
      fee_range: {
        min_fee: minFee,
        max_fee: maxFee,
        currency
      },
      default_date_range: {
        start_date,
        end_date
      },
      sort_options
    };
  }

  // searchConferenceSessions
  searchConferenceSessions(
    conferenceId,
    keyword,
    startDate,
    endDate,
    format,
    maxFee,
    sortBy
  ) {
    const sessions = this._getFromStorage('conference_sessions', []).filter(
      s => s.conference_id === conferenceId
    );

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    let filtered = sessions.filter(s => {
      const startDt = new Date(s.start_datetime);
      if (start && startDt < start) return false;
      if (end && startDt > end) return false;
      return true;
    });

    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(s => {
        const inTitle = (s.title || '').toLowerCase().includes(kw);
        const inDesc = (s.description || '').toLowerCase().includes(kw);
        const inKeywords = Array.isArray(s.keywords)
          ? s.keywords.some(k => (k || '').toLowerCase().includes(kw))
          : false;
        return inTitle || inDesc || inKeywords;
      });
    }

    if (format) {
      filtered = filtered.filter(s => s.format === format);
    }

    if (typeof maxFee === 'number') {
      filtered = filtered.filter(s => (s.fee || 0) <= maxFee);
    }

    if (sortBy === 'start_time_earliest_first') {
      filtered.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    } else if (sortBy === 'start_time_latest_first') {
      filtered.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime));
    } else if (sortBy === 'fee_low_to_high') {
      filtered.sort((a, b) => (a.fee || 0) - (b.fee || 0));
    }

    const conferences = this._getFromStorage('conferences', []);

    return filtered.map(s => {
      const conference = conferences.find(c => c.id === s.conference_id) || null;
      const sessionWithConference = Object.assign({}, s, { conference });
      return {
        session: sessionWithConference,
        format_label: s.format,
        is_in_person: !!s.is_in_person,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        fee: s.fee,
        currency: s.currency,
        location_room: s.location_room || ''
      };
    });
  }

  // getConferenceSessionDetails
  getConferenceSessionDetails(conferenceSessionId) {
    const sessions = this._getFromStorage('conference_sessions', []);
    const conferences = this._getFromStorage('conferences', []);
    const session = sessions.find(s => s.id === conferenceSessionId) || null;
    if (!session) return null;
    const conference = conferences.find(c => c.id === session.conference_id) || null;
    return Object.assign({}, session, { conference });
  }

  // registerForConferenceSession
  registerForConferenceSession(conferenceSessionId, registrationOption) {
    const sessions = this._getFromStorage('conference_sessions', []);
    const regs = this._getFromStorage('conference_registrations', []);
    const sessionRegs = this._getFromStorage('conference_session_registrations', []);

    const session = sessions.find(s => s.id === conferenceSessionId);
    if (!session) {
      return {
        success: false,
        conference_registration_id: null,
        conference_session_registration_id: null,
        updated_total_fee: 0,
        currency: 'usd',
        message: 'Conference session not found.'
      };
    }

    let conferenceRegistration = null;

    if (registrationOption === 'add_to_existing_conference_registration') {
      conferenceRegistration = regs.find(
        r =>
          r.conference_id === session.conference_id &&
          r.registration_status !== 'cancelled'
      );
    }

    if (!conferenceRegistration) {
      conferenceRegistration = {
        id: this._generateId('conf_reg'),
        conference_id: session.conference_id,
        registration_type:
          registrationOption === 'new_conference_registration'
            ? 'workshop_only'
            : 'full_conference',
        registration_status: 'pending',
        total_fee: session.fee || 0,
        currency: session.currency || 'usd',
        created_at: this._now(),
        updated_at: this._now()
      };
      regs.push(conferenceRegistration);
    } else {
      conferenceRegistration.total_fee = (conferenceRegistration.total_fee || 0) + (session.fee || 0);
      conferenceRegistration.updated_at = this._now();
    }

    const sessionReg = {
      id: this._generateId('conf_sess_reg'),
      conference_registration_id: conferenceRegistration.id,
      conference_session_id: session.id,
      registration_option: registrationOption,
      fee: session.fee || 0,
      currency: session.currency || 'usd',
      added_at: this._now()
    };

    sessionRegs.push(sessionReg);

    this._saveToStorage('conference_registrations', regs);
    this._saveToStorage('conference_session_registrations', sessionRegs);

    return {
      success: true,
      conference_registration_id: conferenceRegistration.id,
      conference_session_registration_id: sessionReg.id,
      updated_total_fee: conferenceRegistration.total_fee || 0,
      currency: conferenceRegistration.currency || 'usd',
      message: 'Session registered successfully.'
    };
  }

  // getJournalOverview
  getJournalOverview(journalKey) {
    const journals = this._getFromStorage('journals', []);
    const journal = journals.find(j => j.journal_key === journalKey) || null;
    return journal;
  }

  // getJournalSearchOptions
  getJournalSearchOptions(journalId) {
    const access_type_options = [
      { value: 'open_access', label: 'Open access' },
      { value: 'subscription', label: 'Subscription' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const sort_options = [
      { value: 'most_cited', label: 'Most cited' },
      { value: 'newest_first', label: 'Newest first' },
      { value: 'relevance', label: 'Relevance' }
    ];

    // journalId not used directly here but included for interface completeness
    void journalId;

    return {
      access_type_options,
      sort_options
    };
  }

  // searchJournalArticles
  searchJournalArticles(journalId, keyword, startDate, endDate, accessType, sortBy) {
    let articles = this._getFromStorage('journal_articles', []).filter(
      a => a.journal_id === journalId
    );

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start || end) {
      articles = articles.filter(a => {
        const pub = new Date(a.publication_date);
        if (start && pub < start) return false;
        if (end && pub > end) return false;
        return true;
      });
    }

    if (accessType) {
      articles = articles.filter(a => a.access_type === accessType);
    }

    if (keyword) {
      const kw = keyword.toLowerCase();
      articles = articles.filter(a => {
        const inTitle = (a.title || '').toLowerCase().includes(kw);
        const inAbs = (a.abstract || '').toLowerCase().includes(kw);
        const inKeywords = Array.isArray(a.keywords)
          ? a.keywords.some(k => (k || '').toLowerCase().includes(kw))
          : false;
        return inTitle || inAbs || inKeywords;
      });
    }

    if (sortBy === 'most_cited') {
      articles.sort((a, b) => (b.citation_count || 0) - (a.citation_count || 0));
    } else if (sortBy === 'newest_first') {
      articles.sort((a, b) => new Date(b.publication_date) - new Date(a.publication_date));
    } else if (sortBy === 'relevance' && keyword) {
      const kw = keyword.toLowerCase();
      const score = a => {
        let s = 0;
        if ((a.title || '').toLowerCase().includes(kw)) s += 3;
        if ((a.abstract || '').toLowerCase().includes(kw)) s += 2;
        if (
          Array.isArray(a.keywords) &&
          a.keywords.some(k => (k || '').toLowerCase().includes(kw))
        ) {
          s += 1;
        }
        return s;
      };
      articles.sort((a, b) => score(b) - score(a));
    }

    const journals = this._getFromStorage('journals', []);
    return articles.map(a => {
      const journal = journals.find(j => j.id === a.journal_id) || null;
      return Object.assign({}, a, { journal });
    });
  }

  // saveArticleToReadingList
  saveArticleToReadingList(journalArticleId) {
    const articles = this._getFromStorage('journal_articles', []);
    const article = articles.find(a => a.id === journalArticleId);
    if (!article) {
      return {
        success: false,
        reading_list_item_id: null,
        saved_at: null,
        message: 'Article not found.'
      };
    }

    const items = this._getReadingListStorage();
    const existing = items.find(i => i.journal_article_id === journalArticleId);
    if (existing) {
      return {
        success: true,
        reading_list_item_id: existing.id,
        saved_at: existing.saved_at,
        message: 'Article already in reading list.'
      };
    }

    const now = this._now();
    const item = {
      id: this._generateId('reading_item'),
      journal_article_id: journalArticleId,
      saved_at: now
    };
    items.push(item);
    this._setReadingListStorage(items);

    return {
      success: true,
      reading_list_item_id: item.id,
      saved_at: item.saved_at,
      message: 'Article saved to reading list.'
    };
  }

  // getReadingListItems
  getReadingListItems() {
    const items = this._getReadingListStorage();
    const articles = this._getFromStorage('journal_articles', []);
    const journals = this._getFromStorage('journals', []);

    return items.map(i => {
      const article = articles.find(a => a.id === i.journal_article_id) || null;
      let articleWithJournal = article;
      if (article) {
        const journal = journals.find(j => j.id === article.journal_id) || null;
        articleWithJournal = Object.assign({}, article, { journal });
      }
      return {
        reading_list_item_id: i.id,
        saved_at: i.saved_at,
        article: articleWithJournal
      };
    });
  }

  // getJobBoardFilters
  getJobBoardFilters() {
    const job_type_options = [
      { value: 'postdoctoral', label: 'Postdoctoral' },
      { value: 'faculty', label: 'Faculty' },
      { value: 'industry', label: 'Industry' },
      { value: 'government', label: 'Government' },
      { value: 'internship', label: 'Internship' },
      { value: 'fellowship', label: 'Fellowship' },
      { value: 'staff_scientist', label: 'Staff scientist' },
      { value: 'other', label: 'Other' }
    ];

    const region_options = [
      { value: 'europe', label: 'Europe' },
      { value: 'north_america', label: 'North America' },
      { value: 'south_america', label: 'South America' },
      { value: 'asia', label: 'Asia' },
      { value: 'africa', label: 'Africa' },
      { value: 'oceania', label: 'Oceania' },
      { value: 'middle_east', label: 'Middle East' },
      { value: 'remote', label: 'Remote' }
    ];

    const jobs = this._getFromStorage('job_postings', []).filter(j => j.is_active);

    let minSalary = 0;
    let maxSalary = 0;
    let currency = 'usd';
    if (jobs.length > 0) {
      const mins = jobs.map(j => (j.salary_min != null ? j.salary_min : 0));
      const maxs = jobs.map(j => (j.salary_max != null ? j.salary_max : j.salary_min || 0));
      minSalary = Math.min.apply(null, mins);
      maxSalary = Math.max.apply(null, maxs);
      currency = jobs[0].currency || 'usd';
    }

    let earliestDeadline = null;
    let latestDeadline = null;
    const jobsWithDeadline = jobs.filter(j => j.application_deadline);
    if (jobsWithDeadline.length > 0) {
      earliestDeadline = jobsWithDeadline
        .map(j => j.application_deadline)
        .sort((a, b) => new Date(a) - new Date(b))[0];
      latestDeadline = jobsWithDeadline
        .map(j => j.application_deadline)
        .sort((a, b) => new Date(b) - new Date(a))[0];
    }

    const sort_options = [
      { value: 'deadline_soonest_first', label: 'Deadline: soonest first' },
      { value: 'posted_date_newest_first', label: 'Posted date: newest first' },
      { value: 'salary_high_to_low', label: 'Salary: high to low' }
    ];

    return {
      job_type_options,
      region_options,
      salary_defaults: {
        min_salary: minSalary,
        max_salary: maxSalary,
        currency
      },
      deadline_defaults: {
        earliest_deadline: earliestDeadline,
        latest_deadline: latestDeadline
      },
      sort_options
    };
  }

  // searchJobPostings
  searchJobPostings(jobType, region, minSalary, minDeadlineDate, sortBy) {
    let jobs = this._getFromStorage('job_postings', []).filter(j => j.is_active);

    if (jobType) {
      jobs = jobs.filter(j => j.job_type === jobType);
    }
    if (region) {
      jobs = jobs.filter(j => j.region === region);
    }
    if (typeof minSalary === 'number') {
      jobs = jobs.filter(j => (j.salary_min != null ? j.salary_min : 0) >= minSalary);
    }
    if (minDeadlineDate) {
      const d = new Date(minDeadlineDate);
      jobs = jobs.filter(j => {
        if (!j.application_deadline) return false;
        return new Date(j.application_deadline) >= d;
      });
    }

    if (sortBy === 'deadline_soonest_first') {
      jobs.sort((a, b) => {
        const da = a.application_deadline ? new Date(a.application_deadline) : new Date(8640000000000000);
        const db = b.application_deadline ? new Date(b.application_deadline) : new Date(8640000000000000);
        return da - db;
      });
    } else if (sortBy === 'posted_date_newest_first') {
      jobs.sort((a, b) => {
        const da = a.posted_date ? new Date(a.posted_date) : new Date(0);
        const db = b.posted_date ? new Date(b.posted_date) : new Date(0);
        return db - da;
      });
    } else if (sortBy === 'salary_high_to_low') {
      jobs.sort((a, b) => {
        const sa = a.salary_max != null ? a.salary_max : a.salary_min || 0;
        const sb = b.salary_max != null ? b.salary_max : b.salary_min || 0;
        return sb - sa;
      });
    }

    return jobs;
  }

  // getJobPostingDetails
  getJobPostingDetails(jobPostingId) {
    const jobs = this._getFromStorage('job_postings', []);
    return jobs.find(j => j.id === jobPostingId) || null;
  }

  // saveJobToFavorites
  saveJobToFavorites(jobPostingId) {
    const jobs = this._getFromStorage('job_postings', []);
    const job = jobs.find(j => j.id === jobPostingId);
    if (!job) {
      return {
        success: false,
        saved_job_id: null,
        saved_at: null,
        message: 'Job not found.'
      };
    }

    const saved = this._getSavedJobsStorage();
    const existing = saved.find(s => s.job_posting_id === jobPostingId);
    if (existing) {
      return {
        success: true,
        saved_job_id: existing.id,
        saved_at: existing.saved_at,
        message: 'Job already saved.'
      };
    }

    const now = this._now();
    const item = {
      id: this._generateId('saved_job'),
      job_posting_id: jobPostingId,
      saved_at: now
    };
    saved.push(item);
    this._setSavedJobsStorage(saved);

    return {
      success: true,
      saved_job_id: item.id,
      saved_at: item.saved_at,
      message: 'Job saved to favorites.'
    };
  }

  // getSavedJobs
  getSavedJobs() {
    const saved = this._getSavedJobsStorage();
    const jobs = this._getFromStorage('job_postings', []);

    return saved.map(s => {
      const job = jobs.find(j => j.id === s.job_posting_id) || null;
      return {
        saved_job_id: s.id,
        saved_at: s.saved_at,
        job
      };
    });
  }

  // getCommitteeFilters
  getCommitteeFilters() {
    const focus_area_options = [
      { value: 'education_outreach', label: 'Education & Outreach' },
      { value: 'research', label: 'Research' },
      { value: 'policy_advocacy', label: 'Policy & Advocacy' },
      { value: 'membership_engagement', label: 'Membership Engagement' },
      { value: 'diversity_inclusion', label: 'Diversity & Inclusion' },
      { value: 'awards', label: 'Awards' },
      { value: 'communications', label: 'Communications' }
    ];

    const term_length_options = [
      { max_years: 1, label: 'Up to 1 year' },
      { max_years: 3, label: 'Up to 3 years' },
      { max_years: 5, label: 'Up to 5 years' }
    ];

    const sort_options = [
      { value: 'member_openings_high_to_low', label: 'Member openings: High to Low' },
      { value: 'name_az', label: 'Name A–Z' }
    ];

    return {
      focus_area_options,
      term_length_options,
      sort_options
    };
  }

  // searchCommittees
  searchCommittees(focusArea, maxTermLengthYears, sortBy) {
    let committees = this._getFromStorage('committees', []).filter(c => c.is_active);

    if (focusArea) {
      committees = committees.filter(c => c.focus_area === focusArea);
    }
    if (typeof maxTermLengthYears === 'number') {
      committees = committees.filter(c => c.term_length_years <= maxTermLengthYears);
    }

    if (sortBy === 'member_openings_high_to_low') {
      committees.sort((a, b) => b.member_openings - a.member_openings);
    } else if (sortBy === 'name_az') {
      committees.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return committees;
  }

  // getCommitteeDetails
  getCommitteeDetails(committeeId) {
    const committees = this._getFromStorage('committees', []);
    return committees.find(c => c.id === committeeId) || null;
  }

  // submitCommitteeVolunteerInterest
  submitCommitteeVolunteerInterest(
    committeeId,
    firstName,
    lastName,
    email,
    expertiseArea,
    availabilityHoursPerMonth,
    comments
  ) {
    const committees = this._getFromStorage('committees', []);
    const committee = committees.find(c => c.id === committeeId);
    if (!committee) {
      return {
        success: false,
        interest_id: null,
        status: null,
        submitted_at: null,
        message: 'Committee not found.'
      };
    }

    const interests = this._getFromStorage('committee_volunteer_interests', []);
    const now = this._now();
    const interest = {
      id: this._generateId('committee_interest'),
      committee_id: committeeId,
      first_name: firstName,
      last_name: lastName,
      email,
      expertise_area: expertiseArea,
      availability_hours_per_month: availabilityHoursPerMonth,
      comments: comments || '',
      submitted_at: now,
      status: 'submitted'
    };

    interests.push(interest);
    this._saveToStorage('committee_volunteer_interests', interests);

    return {
      success: true,
      interest_id: interest.id,
      status: interest.status,
      submitted_at: interest.submitted_at,
      message: 'Volunteer interest submitted.'
    };
  }

  // getResearchGrantsFilters
  getResearchGrantsFilters() {
    const career_stage_options = [
      { value: 'early_career', label: 'Early-career' },
      { value: 'mid_career', label: 'Mid-career' },
      { value: 'senior', label: 'Senior' },
      { value: 'student', label: 'Student' },
      { value: 'any', label: 'Any career stage' }
    ];

    const grants = this._getFromStorage('research_grants', []).filter(g => g.is_active);

    const deadline_year_set = new Set();
    for (const g of grants) {
      if (g.application_deadline_year != null) {
        deadline_year_set.add(g.application_deadline_year);
      }
    }
    const deadline_year_options = Array.from(deadline_year_set).sort((a, b) => a - b);

    let minAward = 0;
    let maxAward = 0;
    let currency = 'usd';
    if (grants.length > 0) {
      minAward = Math.min.apply(
        null,
        grants.map(g => g.award_amount_min || 0)
      );
      maxAward = Math.max.apply(
        null,
        grants.map(g => (g.award_amount_max != null ? g.award_amount_max : g.award_amount_min || 0))
      );
      currency = grants[0].currency || 'usd';
    }

    const sort_options = [
      { value: 'award_amount_high_to_low', label: 'Award amount: High to Low' },
      { value: 'deadline_soonest_first', label: 'Deadline: soonest first' }
    ];

    return {
      career_stage_options,
      deadline_year_options,
      award_amount_defaults: {
        min_award: minAward,
        max_award: maxAward,
        currency
      },
      sort_options
    };
  }

  // searchResearchGrants
  searchResearchGrants(careerStage, minAwardAmount, deadlineYear, sortBy) {
    let grants = this._getFromStorage('research_grants', []).filter(g => g.is_active);

    if (careerStage) {
      grants = grants.filter(g => g.career_stage === careerStage);
    }
    if (typeof minAwardAmount === 'number') {
      grants = grants.filter(g => (g.award_amount_min || 0) >= minAwardAmount);
    }
    if (typeof deadlineYear === 'number') {
      grants = grants.filter(g => g.application_deadline_year === deadlineYear);
    }

    if (sortBy === 'award_amount_high_to_low') {
      grants.sort((a, b) => (b.award_amount_min || 0) - (a.award_amount_min || 0));
    } else if (sortBy === 'deadline_soonest_first') {
      grants.sort((a, b) => new Date(a.application_deadline) - new Date(b.application_deadline));
    }

    return grants;
  }

  // getResearchGrantDetails
  getResearchGrantDetails(researchGrantId) {
    const grants = this._getFromStorage('research_grants', []);
    return grants.find(g => g.id === researchGrantId) || null;
  }

  // addGrantToMyOpportunities
  addGrantToMyOpportunities(researchGrantId) {
    const grants = this._getFromStorage('research_grants', []);
    const grant = grants.find(g => g.id === researchGrantId);
    if (!grant) {
      return {
        success: false,
        saved_grant_opportunity_id: null,
        saved_at: null,
        message: 'Grant not found.'
      };
    }

    const saved = this._getSavedOpportunitiesStorage();
    const existing = saved.find(s => s.research_grant_id === researchGrantId);
    if (existing) {
      return {
        success: true,
        saved_grant_opportunity_id: existing.id,
        saved_at: existing.saved_at,
        message: 'Grant already in My Opportunities.'
      };
    }

    const now = this._now();
    const item = {
      id: this._generateId('saved_grant'),
      research_grant_id: researchGrantId,
      saved_at: now
    };
    saved.push(item);
    this._setSavedOpportunitiesStorage(saved);

    return {
      success: true,
      saved_grant_opportunity_id: item.id,
      saved_at: item.saved_at,
      message: 'Grant added to My Opportunities.'
    };
  }

  // getMyOpportunities
  getMyOpportunities() {
    const saved = this._getSavedOpportunitiesStorage();
    const grants = this._getFromStorage('research_grants', []);

    return saved.map(s => {
      const grant = grants.find(g => g.id === s.research_grant_id) || null;
      return {
        saved_grant_opportunity_id: s.id,
        saved_at: s.saved_at,
        grant
      };
    });
  }

  // getStoreCategories
  getStoreCategories() {
    return this._getFromStorage('store_categories', []);
  }

  // getStoreFilterOptions
  getStoreFilterOptions(categorySlug) {
    // categorySlug is not strictly needed for static options but included for completeness
    void categorySlug;

    const format_options = [
      { value: 'hardcover', label: 'Hardcover' },
      { value: 'paperback', label: 'Paperback' },
      { value: 'ebook', label: 'eBook' },
      { value: 'spiral_bound', label: 'Spiral-bound' },
      { value: 'looseleaf', label: 'Looseleaf' },
      { value: 'other', label: 'Other' }
    ];

    const products = this._getFromStorage('products', []).filter(p => p.is_active);
    let minPrice = 0;
    let maxPrice = 0;
    let currency = 'usd';
    if (products.length > 0) {
      minPrice = Math.min.apply(
        null,
        products.map(p => p.price || 0)
      );
      maxPrice = Math.max.apply(
        null,
        products.map(p => p.price || 0)
      );
      currency = products[0].currency || 'usd';
    }

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'title_az', label: 'Title A–Z' }
    ];

    return {
      format_options,
      price_defaults: {
        min_price: minPrice,
        max_price: maxPrice,
        currency
      },
      sort_options
    };
  }

  // searchStoreProducts
  searchStoreProducts(query, categoryId, format, minPrice, maxPrice, sortBy) {
    const products = this._getFromStorage('products', []).filter(p => p.is_active);
    const categories = this._getFromStorage('store_categories', []);

    let filtered = products;

    if (categoryId) {
      filtered = filtered.filter(p => p.category_id === categoryId);
    }

    if (format) {
      filtered = filtered.filter(p => p.format === format);
    }

    if (typeof minPrice === 'number') {
      filtered = filtered.filter(p => (p.price || 0) >= minPrice);
    }
    if (typeof maxPrice === 'number') {
      filtered = filtered.filter(p => (p.price || 0) <= maxPrice);
    }

    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(p => {
        const inName = (p.name || '').toLowerCase().includes(q);
        const inDesc = (p.description || '').toLowerCase().includes(q);
        const inKeywords = Array.isArray(p.keywords)
          ? p.keywords.some(k => (k || '').toLowerCase().includes(q))
          : false;
        return inName || inDesc || inKeywords;
      });
    }

    if (sortBy === 'price_low_to_high') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'title_az') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return filtered.map(p => {
      const category = categories.find(c => c.id === p.category_id) || null;
      const productWithCategory = Object.assign({}, p, {
        category
      });
      return {
        product: productWithCategory,
        category_name: category ? category.name : null
      };
    });
  }

  // getProductDetails
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const categories = this._getFromStorage('store_categories', []);

    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { product: null, category_name: null };
    }
    const category = categories.find(c => c.id === product.category_id) || null;
    const productWithCategory = Object.assign({}, product, { category });
    return {
      product: productWithCategory,
      category_name: category ? category.name : null
    };
  }

  // addProductToCart
  addProductToCart(productId, quantity) {
    if (!quantity || quantity <= 0) quantity = 1;

    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId && p.is_active);
    if (!product) {
      return {
        success: false,
        cart_id: null,
        cart_items_count: 0,
        added_cart_item_id: null,
        message: 'Product not found or inactive.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const existingIndex = cartItems.findIndex(
      ci => ci.cart_id === cart.id && ci.item_type === 'product' && ci.product_id === productId
    );

    const now = this._now();
    let cartItem;

    if (existingIndex >= 0) {
      cartItem = cartItems[existingIndex];
      cartItem.quantity += quantity;
      cartItem.total_price = (cartItem.unit_price || 0) * cartItem.quantity;
      cartItems[existingIndex] = cartItem;
    } else {
      const unitPrice = product.price || 0;
      const totalPrice = unitPrice * quantity;
      cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'product',
        membership_plan_id: null,
        product_id: productId,
        conference_session_id: null,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        added_at: now,
        applicant_first_name: null,
        applicant_last_name: null,
        applicant_institution: null,
        applicant_email: null,
        payment_method: null
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);

    cart.items_count = cartItems.filter(ci => ci.cart_id === cart.id).length;
    cart.updated_at = now;
    this._persistCart(cart);

    return {
      success: true,
      cart_id: cart.id,
      cart_items_count: cart.items_count,
      added_cart_item_id: cartItem.id,
      message: 'Product added to cart.'
    };
  }

  // getResourceFilterOptions
  getResourceFilterOptions() {
    const resource_type_options = [
      { value: 'guideline_checklist', label: 'Guideline/Checklist' },
      { value: 'toolkit', label: 'Toolkit' },
      { value: 'webinar', label: 'Webinar' },
      { value: 'training_slide', label: 'Training slide' },
      { value: 'policy_document', label: 'Policy document' },
      { value: 'case_study', label: 'Case study' },
      { value: 'infographic', label: 'Infographic' },
      { value: 'checklist', label: 'Checklist' },
      { value: 'other', label: 'Other' }
    ];

    const resources = this._getFromStorage('resources', []);

    let earliest_date = null;
    let latest_date = null;
    if (resources.length > 0) {
      earliest_date = resources
        .map(r => r.publication_date)
        .sort((a, b) => new Date(a) - new Date(b))[0];
      latest_date = resources
        .map(r => r.publication_date)
        .sort((a, b) => new Date(b) - new Date(a))[0];
    }

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'newest_first', label: 'Newest first' },
      { value: 'oldest_first', label: 'Oldest first' }
    ];

    return {
      resource_type_options,
      publication_date_defaults: {
        earliest_date,
        latest_date
      },
      sort_options
    };
  }

  // searchResources
  searchResources(query, resourceType, publicationDateFrom, publicationDateTo, sortBy) {
    let resources = this._getFromStorage('resources', []);

    if (resourceType) {
      resources = resources.filter(r => r.resource_type === resourceType);
    }

    const from = publicationDateFrom ? new Date(publicationDateFrom) : null;
    const to = publicationDateTo ? new Date(publicationDateTo) : null;

    if (from || to) {
      resources = resources.filter(r => {
        const d = new Date(r.publication_date);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    if (query) {
      const q = query.toLowerCase();
      resources = resources.filter(r => {
        const inTitle = (r.title || '').toLowerCase().includes(q);
        const inDesc = (r.description || '').toLowerCase().includes(q);
        const inKeywords = Array.isArray(r.keywords)
          ? r.keywords.some(k => (k || '').toLowerCase().includes(q))
          : false;
        return inTitle || inDesc || inKeywords;
      });
    }

    if (sortBy === 'newest_first') {
      resources.sort((a, b) => new Date(b.publication_date) - new Date(a.publication_date));
    } else if (sortBy === 'oldest_first') {
      resources.sort((a, b) => new Date(a.publication_date) - new Date(b.publication_date));
    }

    return resources;
  }

  // createResourceCollection
  createResourceCollection(name, description) {
    const { collections, items } = this._getResourceCollectionsStorage();
    void items; // not used here

    const collection = {
      id: this._generateId('resource_collection'),
      name,
      description: description || '',
      created_at: this._now()
    };

    collections.push(collection);
    this._setResourceCollectionsStorage(collections, this._getFromStorage('resource_collection_items', []));

    return collection;
  }

  // getResourceCollections
  getResourceCollections() {
    const { collections } = this._getResourceCollectionsStorage();
    return collections;
  }

  // addResourceToCollection
  addResourceToCollection(resourceId, resourceCollectionId) {
    const resources = this._getFromStorage('resources', []);
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) {
      return {
        success: false,
        resource_collection_item_id: null,
        added_at: null,
        message: 'Resource not found.'
      };
    }

    const { collections, items } = this._getResourceCollectionsStorage();
    const collection = collections.find(c => c.id === resourceCollectionId);
    if (!collection) {
      return {
        success: false,
        resource_collection_item_id: null,
        added_at: null,
        message: 'Collection not found.'
      };
    }

    const existing = items.find(
      i => i.resource_collection_id === resourceCollectionId && i.resource_id === resourceId
    );
    if (existing) {
      return {
        success: true,
        resource_collection_item_id: existing.id,
        added_at: existing.added_at,
        message: 'Resource already in collection.'
      };
    }

    const now = this._now();
    const item = {
      id: this._generateId('resource_collection_item'),
      resource_collection_id: resourceCollectionId,
      resource_id: resourceId,
      added_at: now
    };

    items.push(item);
    this._setResourceCollectionsStorage(collections, items);

    return {
      success: true,
      resource_collection_item_id: item.id,
      added_at: item.added_at,
      message: 'Resource added to collection.'
    };
  }

  // getResourceCollectionDetails
  getResourceCollectionDetails(resourceCollectionId) {
    const { collections, items } = this._getResourceCollectionsStorage();
    const resources = this._getFromStorage('resources', []);

    const collection = collections.find(c => c.id === resourceCollectionId) || null;
    const collectionItems = items.filter(i => i.resource_collection_id === resourceCollectionId);

    const mapped = collectionItems.map(i => {
      const resource = resources.find(r => r.id === i.resource_id) || null;
      return {
        resource_collection_item_id: i.id,
        added_at: i.added_at,
        resource
      };
    });

    return {
      collection,
      items: mapped
    };
  }

  // getAvailableTopics
  getAvailableTopics() {
    return this._getFromStorage('topics', []);
  }

  // createProfileAndPreferences
  createProfileAndPreferences(
    firstName,
    lastName,
    email,
    password,
    primaryDiscipline,
    topicsOfInterest,
    emailMonthlyNewsletter,
    emailDailyJobAlerts,
    emailWeeklyEventDigest
  ) {
    const now = this._now();
    const profile = {
      id: this._generateId('profile'),
      first_name: firstName,
      last_name: lastName,
      email,
      password,
      primary_discipline: primaryDiscipline,
      topics_of_interest: Array.isArray(topicsOfInterest) ? topicsOfInterest : [],
      email_monthly_newsletter: !!emailMonthlyNewsletter,
      email_daily_job_alerts: !!emailDailyJobAlerts,
      email_weekly_event_digest: !!emailWeeklyEventDigest,
      created_at: now,
      updated_at: now
    };

    this._saveProfile(profile);
    return profile;
  }

  // getProfile
  getProfile() {
    const profile = this._loadProfile();
    return {
      has_profile: !!profile,
      profile: profile
    };
  }

  // updateProfileAndPreferences
  updateProfileAndPreferences(
    firstName,
    lastName,
    email,
    password,
    primaryDiscipline,
    topicsOfInterest,
    emailMonthlyNewsletter,
    emailDailyJobAlerts,
    emailWeeklyEventDigest
  ) {
    let profile = this._loadProfile();
    if (!profile) {
      // No existing profile; create a minimal one using provided fields
      return this.createProfileAndPreferences(
        firstName || '',
        lastName || '',
        email || '',
        password || '',
        primaryDiscipline || 'other',
        Array.isArray(topicsOfInterest) ? topicsOfInterest : [],
        !!emailMonthlyNewsletter,
        !!emailDailyJobAlerts,
        !!emailWeeklyEventDigest
      );
    }

    if (firstName !== undefined) profile.first_name = firstName;
    if (lastName !== undefined) profile.last_name = lastName;
    if (email !== undefined) profile.email = email;
    if (password !== undefined) profile.password = password;
    if (primaryDiscipline !== undefined) profile.primary_discipline = primaryDiscipline;
    if (topicsOfInterest !== undefined && topicsOfInterest !== null) {
      profile.topics_of_interest = topicsOfInterest;
    }
    if (typeof emailMonthlyNewsletter === 'boolean') {
      profile.email_monthly_newsletter = emailMonthlyNewsletter;
    }
    if (typeof emailDailyJobAlerts === 'boolean') {
      profile.email_daily_job_alerts = emailDailyJobAlerts;
    }
    if (typeof emailWeeklyEventDigest === 'boolean') {
      profile.email_weekly_event_digest = emailWeeklyEventDigest;
    }

    profile.updated_at = this._now();
    this._saveProfile(profile);
    return profile;
  }

  // getDashboardSummary
  getDashboardSummary() {
    const profile = this._loadProfile();

    const readingItems = this._getReadingListStorage();
    const readingCount = readingItems.length;

    const savedJobs = this._getSavedJobsStorage();
    const savedJobsCount = savedJobs.length;

    const savedOpps = this._getSavedOpportunitiesStorage();
    const oppsCount = savedOpps.length;

    const { collections } = this._getResourceCollectionsStorage();

    // Build recent_reading_list_items
    const articles = this._getFromStorage('journal_articles', []);
    const journals = this._getFromStorage('journals', []);
    const sortedReading = readingItems
      .slice()
      .sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at))
      .slice(0, 5)
      .map(i => {
        const article = articles.find(a => a.id === i.journal_article_id) || null;
        let articleWithJournal = article;
        if (article) {
          const journal = journals.find(j => j.id === article.journal_id) || null;
          articleWithJournal = Object.assign({}, article, { journal });
        }
        return {
          reading_list_item_id: i.id,
          saved_at: i.saved_at,
          article: articleWithJournal
        };
      });

    // Build saved_jobs_preview
    const jobPostings = this._getFromStorage('job_postings', []);
    const savedJobsPreview = savedJobs
      .slice()
      .sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at))
      .slice(0, 5)
      .map(s => {
        const job = jobPostings.find(j => j.id === s.job_posting_id) || null;
        return {
          saved_job_id: s.id,
          saved_at: s.saved_at,
          job
        };
      });

    // Build opportunities_preview
    const grants = this._getFromStorage('research_grants', []);
    const opportunitiesPreview = savedOpps
      .slice()
      .sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at))
      .slice(0, 5)
      .map(s => {
        const grant = grants.find(g => g.id === s.research_grant_id) || null;
        return {
          saved_grant_opportunity_id: s.id,
          saved_at: s.saved_at,
          grant
        };
      });

    // Membership status based on cart membership items (no full membership system modeled)
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const openCart = carts.find(c => c.status === 'open');
    let membership_status = 'not_a_member';
    if (openCart) {
      const hasMembershipItem = cartItems.some(
        ci => ci.cart_id === openCart.id && ci.item_type === 'membership'
      );
      if (hasMembershipItem) {
        membership_status = 'membership_in_cart';
      }
    }

    const upcoming_conference_registrations = this._getFromStorage(
      'conference_registrations',
      []
    );

    const cart_items_count = openCart
      ? cartItems.filter(ci => ci.cart_id === openCart.id).length
      : 0;

    return {
      profile,
      reading_list_count: readingCount,
      saved_jobs_count: savedJobsCount,
      my_opportunities_count: oppsCount,
      resource_collections: collections,
      recent_reading_list_items: sortedReading,
      saved_jobs_preview: savedJobsPreview,
      opportunities_preview: opportunitiesPreview,
      membership_status,
      upcoming_conference_registrations,
      cart_items_count
    };
  }

  // getSocietyInfo
  getSocietyInfo() {
    const raw = localStorage.getItem('society_info');
    let info = null;
    if (raw) {
      try {
        info = JSON.parse(raw);
      } catch (e) {
        info = null;
      }
    }

    // Normalize to expected shape
    if (!info || typeof info !== 'object') {
      info = {};
    }

    return {
      mission: info.mission || '',
      vision: info.vision || '',
      scientific_focus_areas: Array.isArray(info.scientific_focus_areas)
        ? info.scientific_focus_areas
        : [],
      leadership: Array.isArray(info.leadership) ? info.leadership : [],
      governance_summary: info.governance_summary || '',
      contact_email: info.contact_email || '',
      contact_address: info.contact_address || '',
      contact_phone: info.contact_phone || '',
      key_committees_overview: Array.isArray(info.key_committees_overview)
        ? info.key_committees_overview
        : []
    };
  }

  // getHelpAndPoliciesContent
  getHelpAndPoliciesContent() {
    const raw = localStorage.getItem('help_and_policies_content');
    let data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch (e) {
        data = null;
      }
    }

    if (!data || typeof data !== 'object') {
      data = {};
    }

    return {
      faqs: Array.isArray(data.faqs) ? data.faqs : [],
      policy_summaries: Array.isArray(data.policy_summaries) ? data.policy_summaries : [],
      support_contact: {
        email: data.support_contact && data.support_contact.email
          ? data.support_contact.email
          : '',
        instructions: data.support_contact && data.support_contact.instructions
          ? data.support_contact.instructions
          : ''
      }
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
