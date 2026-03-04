// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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
    this._getNextIdCounter(); // ensure counter exists
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const ensure = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core data tables based on data models
    ensure('campaigns', [
      {
        id: 'music_program',
        name: 'Music Program',
        slug: 'music-program',
        description: 'Support instruments, sheet music, and performances for the school music program.',
        type: 'arts',
        goal_amount: 10000,
        end_date: null,
        status: 'active',
        allow_recurring: true,
        allow_pledges: false,
        allow_cart: true,
        allow_dedications: true,
        allow_public_messages: true,
        allow_promo_codes: true,
        preset_amounts: [25, 50, 75, 100],
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        amount_raised: 0,
        percent_funded: 0,
        promo_codes: ['ARTMUSIC5']
      },
      {
        id: 'art_supplies',
        name: 'Art Supplies',
        slug: 'art-supplies',
        description: 'Provide brushes, canvases, and other supplies for the art program.',
        type: 'arts',
        goal_amount: 8000,
        end_date: null,
        status: 'active',
        allow_recurring: true,
        allow_pledges: false,
        allow_cart: true,
        allow_dedications: true,
        allow_public_messages: true,
        allow_promo_codes: true,
        preset_amounts: [20, 40, 60, 100],
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        amount_raised: 0,
        percent_funded: 0,
        promo_codes: ['ARTMUSIC5']
      },
      {
        id: 'technology_upgrade',
        name: 'Technology Upgrade',
        slug: 'technology-upgrade',
        description: 'Upgrade classroom technology including laptops, tablets, and interactive displays.',
        type: 'technology',
        goal_amount: 20000,
        end_date: null,
        status: 'active',
        allow_recurring: true,
        allow_pledges: true,
        allow_cart: true,
        allow_dedications: true,
        allow_public_messages: true,
        allow_promo_codes: false,
        preset_amounts: [40, 80, 120, 200],
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        amount_raised: 0,
        percent_funded: 0,
        promo_codes: []
      }
    ]);
    ensure('student_fundraisers', []);
    ensure('cart', null); // single cart object or null
    ensure('cart_items', []);
    ensure('donations', []);
    ensure('recurring_donations', []);
    ensure('pledges', []);
    ensure('sponsorship_levels', []);
    ensure('sponsorships', []);
    ensure('promo_codes', []);

    // Content / auxiliary tables
    ensure('about_page_content', {
      mission_html: '',
      impact_stories_html: '',
      impact_stats: {
        students_supported: 0,
        campaigns_funded: 0,
        total_raised: 0
      }
    });

    ensure('contact_page_content', {
      office_email: '',
      office_phone: '',
      mailing_address: '',
      faq_page_slug: '',
      policies_page_slug: ''
    });

    ensure('faq_content', {
      sections: []
    });

    // policies_content: map of policy_type -> { title, body_html, last_updated }
    ensure('policies_content', {});

    ensure('contact_inquiries', []);

    // Generic ID counter
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return defaultValue;
    try {
      return JSON.parse(raw);
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
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(dateString) {
    if (!dateString) return null;
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? null : d;
  }

  _computeDaysRemaining(endDate, now = new Date()) {
    if (!endDate) return null;
    const diffMs = endDate.getTime() - now.getTime();
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.ceil(diffMs / msPerDay);
  }

  _computePercentFunded(obj) {
    const goal = typeof obj.goal_amount === 'number' ? obj.goal_amount : 0;
    const raised = typeof obj.amount_raised === 'number' ? obj.amount_raised : 0;
    if (goal <= 0) return 0;
    const pct = (raised / goal) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }

  _typeLabelForCampaignType(type) {
    switch (type) {
      case 'general_fund': return 'General Fund';
      case 'athletics': return 'Athletics';
      case 'program': return 'Program';
      case 'technology': return 'Technology';
      case 'arts': return 'Arts';
      case 'classroom': return 'Classroom';
      default: return 'Campaign';
    }
  }

  // Normalize campaign object for outputs (percent_funded, days_remaining, is_ending_soon)
  _normalizeCampaign(campaign, withinDays = 7, now = new Date()) {
    const endDate = this._parseDate(campaign.end_date);
    const daysRemaining = this._computeDaysRemaining(endDate, now);
    const isEndingSoon = typeof daysRemaining === 'number' && daysRemaining >= 0 && daysRemaining <= withinDays;
    const percentFunded = typeof campaign.percent_funded === 'number'
      ? campaign.percent_funded
      : this._computePercentFunded(campaign);

    return {
      ...campaign,
      percent_funded: percentFunded,
      days_remaining: daysRemaining,
      is_ending_soon: isEndingSoon
    };
  }

  // Normalize student fundraiser
  _normalizeStudent(student, now = new Date()) {
    const endDate = this._parseDate(student.end_date);
    const daysRemaining = this._computeDaysRemaining(endDate, now);
    const percentFunded = typeof student.percent_funded === 'number'
      ? student.percent_funded
      : this._computePercentFunded(student);

    return {
      ...student,
      percent_funded: percentFunded,
      days_remaining: daysRemaining
    };
  }

  // ----------------------
  // Helper: ending soon flagger
  // ----------------------

  _flagEndingSoonCampaigns(campaigns, withinDays = 7) {
    const now = new Date();
    return campaigns.map(c => this._normalizeCampaign(c, withinDays, now));
  }

  // ----------------------
  // Helper: cart management
  // ----------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [], // array of cart_item ids
        total_amount: 0,
        currency: 'USD',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart, cartItems) {
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    const total = itemsForCart.reduce((sum, ci) => sum + (ci.amount || 0), 0);
    cart.total_amount = total;
    cart.updated_at = this._nowIso();
    this._saveToStorage('cart', cart);
    return cart;
  }

  // ----------------------
  // Helper: promo code logic
  // ----------------------

  _findPromoCodeForCampaign(campaignId, promoCodeRaw) {
    if (!promoCodeRaw) return null;
    const promoCode = String(promoCodeRaw).trim();
    if (!promoCode) return null;
    const promos = this._getFromStorage('promo_codes', []);
    const now = new Date();
    const lower = promoCode.toLowerCase();

    const promo = promos.find(p =>
      p.active === true &&
      typeof p.code === 'string' &&
      p.code.toLowerCase() === lower &&
      (!Array.isArray(p.applicable_campaign_ids) || p.applicable_campaign_ids.includes(campaignId)) &&
      (!p.valid_from || this._parseDate(p.valid_from) <= now) &&
      (!p.valid_to || this._parseDate(p.valid_to) >= now) &&
      (typeof p.max_uses !== 'number' || typeof p.used_count !== 'number' || p.used_count < p.max_uses)
    );

    return promo || null;
  }

  _incrementPromoUsage(promoId) {
    if (!promoId) return;
    const promos = this._getFromStorage('promo_codes', []);
    const idx = promos.findIndex(p => p.id === promoId);
    if (idx === -1) return;
    const promo = promos[idx];
    const currentUsed = typeof promo.used_count === 'number' ? promo.used_count : 0;
    promo.used_count = currentUsed + 1;
    promos[idx] = promo;
    this._saveToStorage('promo_codes', promos);
  }

  _calculateFee(amount) {
    const rate = 0.03; // 3% simulated fee
    return Math.round(amount * rate * 100) / 100; // 2 decimals
  }

  _applyPromoCodeLogic(campaignId, baseAmount, coverFees, promoCodeRaw) {
    const result = {
      promo: null,
      adjustedAmount: baseAmount,
      feeAmount: 0,
      feeWaived: false
    };

    const promo = this._findPromoCodeForCampaign(campaignId, promoCodeRaw);
    if (!promo) {
      // No valid promo, just calculate fees
      if (coverFees) {
        result.feeAmount = this._calculateFee(baseAmount);
      }
      return result;
    }

    result.promo = promo;
    let adjusted = baseAmount;

    switch (promo.discount_type) {
      case 'amount_off': {
        const value = typeof promo.discount_value === 'number' ? promo.discount_value : 0;
        adjusted = Math.max(0, baseAmount - value);
        break;
      }
      case 'percent_off': {
        const pct = typeof promo.discount_value === 'number' ? promo.discount_value : 0;
        adjusted = Math.max(0, baseAmount - (baseAmount * pct / 100));
        break;
      }
      case 'fee_waiver': {
        // Donation amount unchanged; fees waived regardless of coverFees
        adjusted = baseAmount;
        result.feeWaived = true;
        break;
      }
      default: {
        adjusted = baseAmount;
        break;
      }
    }

    result.adjustedAmount = adjusted;

    if (!result.feeWaived && coverFees) {
      result.feeAmount = this._calculateFee(adjusted);
    } else {
      result.feeAmount = 0;
    }

    return result;
  }

  // ----------------------
  // Helper: funding updates
  // ----------------------

  _updateCampaignRaised(campaignId, deltaAmount) {
    if (!campaignId || !deltaAmount) return;
    const campaigns = this._getFromStorage('campaigns', []);
    const idx = campaigns.findIndex(c => c.id === campaignId);
    if (idx === -1) return;
    const campaign = campaigns[idx];
    const currentRaised = typeof campaign.amount_raised === 'number' ? campaign.amount_raised : 0;
    campaign.amount_raised = currentRaised + deltaAmount;
    campaign.percent_funded = this._computePercentFunded(campaign);
    campaign.updated_at = this._nowIso();
    campaigns[idx] = campaign;
    this._saveToStorage('campaigns', campaigns);
  }

  _updateStudentRaised(studentId, deltaAmount) {
    if (!studentId || !deltaAmount) return;
    const students = this._getFromStorage('student_fundraisers', []);
    const idx = students.findIndex(s => s.id === studentId);
    if (idx === -1) return;
    const student = students[idx];
    const currentRaised = typeof student.amount_raised === 'number' ? student.amount_raised : 0;
    student.amount_raised = currentRaised + deltaAmount;
    student.percent_funded = this._computePercentFunded(student);
    student.updated_at = this._nowIso();
    students[idx] = student;
    this._saveToStorage('student_fundraisers', students);
  }

  _findCampaignById(campaignId) {
    const campaigns = this._getFromStorage('campaigns', []);
    return campaigns.find(c => c.id === campaignId) || null;
  }

  _findStudentById(studentId) {
    const students = this._getFromStorage('student_fundraisers', []);
    return students.find(s => s.id === studentId) || null;
  }

  // ----------------------
  // Interface: getHomePageSummary
  // ----------------------

  getHomePageSummary() {
    const campaignsRaw = this._getFromStorage('campaigns', []);
    const campaigns = this._flagEndingSoonCampaigns(campaignsRaw, 7);

    const activeCampaigns = campaigns.filter(c => c.status === 'active');

    // General fund campaign (first active of type general_fund)
    const generalFundCampaign = activeCampaigns.find(c => c.type === 'general_fund') || null;
    const general_fund = generalFundCampaign
      ? {
          campaign_id: generalFundCampaign.id,
          name: generalFundCampaign.name,
          slug: generalFundCampaign.slug || null,
          description: generalFundCampaign.description || '',
          goal_amount: generalFundCampaign.goal_amount || 0,
          amount_raised: generalFundCampaign.amount_raised || 0,
          percent_funded: generalFundCampaign.percent_funded || this._computePercentFunded(generalFundCampaign),
          allow_recurring: !!generalFundCampaign.allow_recurring,
          preset_amounts: Array.isArray(generalFundCampaign.preset_amounts) ? generalFundCampaign.preset_amounts : []
        }
      : null;

    // Featured campaigns: top 3 by amount_raised among active
    const featured_campaigns = activeCampaigns
      .slice()
      .sort((a, b) => (b.amount_raised || 0) - (a.amount_raised || 0))
      .slice(0, 3)
      .map(c => ({
        campaign_id: c.id,
        name: c.name,
        slug: c.slug || null,
        type: c.type,
        type_label: this._typeLabelForCampaignType(c.type),
        short_description: c.description || '',
        image_url: c.image_url || null,
        goal_amount: c.goal_amount || 0,
        amount_raised: c.amount_raised || 0,
        percent_funded: c.percent_funded || this._computePercentFunded(c),
        end_date: c.end_date || null,
        days_remaining: c.days_remaining,
        is_ending_soon: c.is_ending_soon
      }));

    // Ending soon campaigns: within next 7 days
    const ending_soon_campaigns = activeCampaigns
      .filter(c => c.is_ending_soon)
      .slice()
      .sort((a, b) => {
        const da = typeof a.days_remaining === 'number' ? a.days_remaining : Number.POSITIVE_INFINITY;
        const db = typeof b.days_remaining === 'number' ? b.days_remaining : Number.POSITIVE_INFINITY;
        return da - db;
      })
      .map(c => ({
        campaign_id: c.id,
        name: c.name,
        slug: c.slug || null,
        type: c.type,
        type_label: this._typeLabelForCampaignType(c.type),
        goal_amount: c.goal_amount || 0,
        amount_raised: c.amount_raised || 0,
        percent_funded: c.percent_funded || this._computePercentFunded(c),
        end_date: c.end_date || null,
        days_remaining: c.days_remaining,
        is_ending_soon: c.is_ending_soon
      }));

    return {
      featured_campaigns,
      general_fund,
      ending_soon_campaigns
    };
  }

  // ----------------------
  // Interface: searchFundraising
  // ----------------------

  searchFundraising(query) {
    const q = (query || '').trim().toLowerCase();
    const campaignsRaw = this._getFromStorage('campaigns', []);
    const studentsRaw = this._getFromStorage('student_fundraisers', []);

    const campaigns = !q
      ? []
      : campaignsRaw
          .filter(c =>
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.description && c.description.toLowerCase().includes(q))
          )
          .map(c => ({
            campaign_id: c.id,
            name: c.name,
            slug: c.slug || null,
            type: c.type,
            type_label: this._typeLabelForCampaignType(c.type),
            short_description: c.description || '',
            percent_funded: c.percent_funded || this._computePercentFunded(c)
          }));

    const students = !q
      ? []
      : studentsRaw
          .filter(s => s.name && s.name.toLowerCase().includes(q))
          .map(s => ({
            student_id: s.id,
            name: s.name,
            slug: s.slug || null,
            grade_level: typeof s.grade_level === 'number' ? s.grade_level : null,
            homeroom: s.homeroom || null,
            percent_funded: s.percent_funded || this._computePercentFunded(s),
            photo_url: s.photo_url || null
          }));

    return { campaigns, students };
  }

  // ----------------------
  // Interface: getCampaignList
  // ----------------------

  getCampaignList(
    search_query,
    type_filter,
    grade_level,
    min_percent_funded,
    max_percent_funded,
    only_ending_soon,
    ending_within_days,
    sort_by,
    page,
    page_size
  ) {
    const rawCampaigns = this._getFromStorage('campaigns', []);
    const withinDays = typeof ending_within_days === 'number' && ending_within_days > 0 ? ending_within_days : 7;
    const campaigns = this._flagEndingSoonCampaigns(rawCampaigns, withinDays);

    const q = (search_query || '').trim().toLowerCase();
    const typeFilter = (type_filter || 'all');
    const gradeFilter = typeof grade_level === 'number' ? grade_level : null;
    const minPct = typeof min_percent_funded === 'number' ? min_percent_funded : null;
    const maxPct = typeof max_percent_funded === 'number' ? max_percent_funded : null;
    const onlyEnding = !!only_ending_soon;

    let filtered = campaigns.filter(c => c.status === 'active');

    if (q) {
      filtered = filtered.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q))
      );
    }

    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter(c => c.type === typeFilter);
    }

    if (gradeFilter !== null) {
      filtered = filtered.filter(c => typeof c.grade_level === 'number' && c.grade_level === gradeFilter);
    }

    filtered = filtered.map(c => ({
      ...c,
      percent_funded: typeof c.percent_funded === 'number' ? c.percent_funded : this._computePercentFunded(c)
    }));

    if (minPct !== null) {
      filtered = filtered.filter(c => c.percent_funded >= minPct);
    }

    if (maxPct !== null) {
      filtered = filtered.filter(c => c.percent_funded <= maxPct);
    }

    if (onlyEnding) {
      filtered = filtered.filter(c => c.is_ending_soon);
    }

    if (typeof ending_within_days === 'number') {
      filtered = filtered.filter(c => {
        if (typeof c.days_remaining !== 'number') return false;
        return c.days_remaining >= 0 && c.days_remaining <= ending_within_days;
      });
    }

    const sortBy = sort_by || 'default';
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'percent_funded_desc':
          return (b.percent_funded || 0) - (a.percent_funded || 0);
        case 'goal_amount_desc':
          return (b.goal_amount || 0) - (a.goal_amount || 0);
        case 'end_date_asc': {
          const da = this._parseDate(a.end_date) || new Date('9999-12-31');
          const db = this._parseDate(b.end_date) || new Date('9999-12-31');
          return da - db;
        }
        case 'end_date_desc': {
          const da = this._parseDate(a.end_date) || new Date('0001-01-01');
          const db = this._parseDate(b.end_date) || new Date('0001-01-01');
          return db - da;
        }
        default: {
          const ta = this._parseDate(a.created_at) || new Date('0001-01-01');
          const tb = this._parseDate(b.created_at) || new Date('0001-01-01');
          return tb - ta;
        }
      }
    });

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const total_count = filtered.length;
    const start = (currentPage - 1) * size;
    const sliced = filtered.slice(start, start + size);

    const items = sliced.map(c => ({
      campaign_id: c.id,
      name: c.name,
      slug: c.slug || null,
      description: c.description || '',
      type: c.type,
      type_label: this._typeLabelForCampaignType(c.type),
      grade_level: typeof c.grade_level === 'number' ? c.grade_level : null,
      goal_amount: c.goal_amount || 0,
      amount_raised: c.amount_raised || 0,
      percent_funded: c.percent_funded,
      end_date: c.end_date || null,
      days_remaining: c.days_remaining,
      is_ending_soon: c.is_ending_soon,
      image_url: c.image_url || null,
      allow_pledges: !!c.allow_pledges
    }));

    return {
      items,
      total_count,
      page: currentPage,
      page_size: size
    };
  }

  // ----------------------
  // Interface: getCampaignDetail
  // ----------------------

  getCampaignDetail(campaignId) {
    const campaign = this._findCampaignById(campaignId);
    if (!campaign) return null;
    const norm = this._normalizeCampaign(campaign);

    return {
      campaign_id: norm.id,
      name: norm.name,
      slug: norm.slug || null,
      description: norm.description || '',
      type: norm.type,
      type_label: this._typeLabelForCampaignType(norm.type),
      grade_level: typeof norm.grade_level === 'number' ? norm.grade_level : null,
      image_url: norm.image_url || null,
      goal_amount: norm.goal_amount || 0,
      amount_raised: norm.amount_raised || 0,
      percent_funded: norm.percent_funded,
      end_date: norm.end_date || null,
      days_remaining: norm.days_remaining,
      status: norm.status,
      allow_recurring: !!norm.allow_recurring,
      allow_pledges: !!norm.allow_pledges,
      allow_cart: !!norm.allow_cart,
      allow_dedications: !!norm.allow_dedications,
      allow_public_messages: !!norm.allow_public_messages,
      allow_promo_codes: !!norm.allow_promo_codes,
      preset_amounts: Array.isArray(norm.preset_amounts) ? norm.preset_amounts : [],
      promo_codes: Array.isArray(norm.promo_codes) ? norm.promo_codes : []
    };
  }

  // ----------------------
  // Interface: submitCampaignOneTimeDonation
  // ----------------------

  submitCampaignOneTimeDonation(
    campaignId,
    amount,
    dedication_type,
    dedication_honoree_name,
    recognition_setting,
    public_message,
    promo_code,
    cover_fees,
    donor_name,
    donor_email,
    donor_phone,
    donor_address_line1,
    donor_city,
    donor_postal_code,
    email_updates_opt_in,
    text_updates_opt_in,
    newsletter_opt_in
  ) {
    const campaign = this._findCampaignById(campaignId);
    if (!campaign) {
      return {
        success: false,
        donation_id: null,
        amount_charged: 0,
        fee_amount: 0,
        order_group_id: null,
        confirmation_message: 'Campaign not found',
        receipt_email: null
      };
    }

    const baseAmount = Number(amount) || 0;
    if (baseAmount <= 0) {
      return {
        success: false,
        donation_id: null,
        amount_charged: 0,
        fee_amount: 0,
        order_group_id: null,
        confirmation_message: 'Invalid donation amount',
        receipt_email: null
      };
    }

    const coverFeesFlag = !!cover_fees;
    const promoLogic = this._applyPromoCodeLogic(campaignId, baseAmount, coverFeesFlag, promo_code);
    const adjustedAmount = promoLogic.adjustedAmount;
    const feeAmount = promoLogic.feeAmount;
    const promo = promoLogic.promo;

    const amountCharged = adjustedAmount + feeAmount;

    const donationId = this._generateId('donation');
    const orderGroupId = this._generateId('order');

    const donation = {
      id: donationId,
      target_type: 'campaign',
      campaign_id: campaignId,
      student_id: null,
      donation_type: 'one_time',
      amount: adjustedAmount,
      currency: 'USD',
      dedication_type: campaign.allow_dedications ? dedication_type : 'none',
      dedication_honoree_name: campaign.allow_dedications ? (dedication_honoree_name || null) : null,
      recognition_setting: recognition_setting || 'show_name_and_amount',
      public_message: campaign.allow_public_messages ? (public_message || null) : null,
      promo_code: promo ? promo.code : null,
      cover_fees: coverFeesFlag,
      fee_amount: feeAmount,
      donor_name,
      donor_email,
      donor_phone: donor_phone || null,
      donor_address_line1: donor_address_line1 || null,
      donor_city: donor_city || null,
      donor_postal_code: donor_postal_code || null,
      email_updates_opt_in: !!email_updates_opt_in,
      text_updates_opt_in: !!text_updates_opt_in,
      newsletter_opt_in: !!newsletter_opt_in,
      order_group_id: orderGroupId,
      status: 'completed',
      created_at: this._nowIso(),
      completed_at: this._nowIso()
    };

    const donations = this._getFromStorage('donations', []);
    donations.push(donation);
    this._saveToStorage('donations', donations);

    // Update campaign funding
    this._updateCampaignRaised(campaignId, adjustedAmount);

    // If promo used, increment usage
    if (promo) {
      this._incrementPromoUsage(promo.id);
    }

    return {
      success: true,
      donation_id: donationId,
      amount_charged: amountCharged,
      fee_amount: feeAmount,
      order_group_id: orderGroupId,
      confirmation_message: 'Thank you for your donation!',
      receipt_email: donor_email
    };
  }

  // ----------------------
  // Interface: createRecurringDonationPlan
  // ----------------------

  createRecurringDonationPlan(
    campaignId,
    amount,
    frequency,
    start_date,
    number_of_payments,
    end_date,
    cover_fees,
    donor_name,
    donor_email,
    donor_phone,
    email_updates_opt_in,
    text_updates_opt_in,
    newsletter_opt_in
  ) {
    const campaign = this._findCampaignById(campaignId);
    if (!campaign) {
      return {
        success: false,
        recurring_donation_plan_id: null,
        schedule_summary: '',
        first_charge_date: null,
        confirmation_message: 'Campaign not found'
      };
    }

    if (!campaign.allow_recurring) {
      return {
        success: false,
        recurring_donation_plan_id: null,
        schedule_summary: '',
        first_charge_date: null,
        confirmation_message: 'Recurring donations are not enabled for this campaign.'
      };
    }

    const amt = Number(amount) || 0;
    if (amt <= 0) {
      return {
        success: false,
        recurring_donation_plan_id: null,
        schedule_summary: '',
        first_charge_date: null,
        confirmation_message: 'Invalid recurring amount'
      };
    }

    const planId = this._generateId('recur');
    const startDateIso = start_date || this._nowIso();

    const plan = {
      id: planId,
      campaign_id: campaignId,
      amount: amt,
      frequency: frequency || 'monthly',
      start_date: startDateIso,
      number_of_payments: typeof number_of_payments === 'number' ? number_of_payments : null,
      end_date: end_date || null,
      cover_fees: !!cover_fees,
      donor_name,
      donor_email,
      donor_phone: donor_phone || null,
      email_updates_opt_in: !!email_updates_opt_in,
      text_updates_opt_in: !!text_updates_opt_in,
      newsletter_opt_in: !!newsletter_opt_in,
      status: 'active',
      created_at: this._nowIso()
    };

    const recurs = this._getFromStorage('recurring_donations', []);
    recurs.push(plan);
    this._saveToStorage('recurring_donations', recurs);

    const schedule_summary = `Recurring ${plan.frequency} donation of $${amt} starting on ${startDateIso}` +
      (plan.number_of_payments ? ` for ${plan.number_of_payments} payments` : '');

    return {
      success: true,
      recurring_donation_plan_id: planId,
      schedule_summary,
      first_charge_date: startDateIso,
      confirmation_message: 'Your recurring donation plan has been created.'
    };
  }

  // ----------------------
  // Interface: createCampaignPledge
  // ----------------------

  createCampaignPledge(
    campaignId,
    total_amount,
    frequency,
    installment_count,
    installment_amount,
    start_date,
    donor_name,
    donor_email,
    donor_phone,
    reminders_enabled
  ) {
    const campaign = this._findCampaignById(campaignId);
    if (!campaign) {
      return {
        success: false,
        pledge_id: null,
        schedule_summary: '',
        confirmation_message: 'Campaign not found'
      };
    }

    if (!campaign.allow_pledges) {
      return {
        success: false,
        pledge_id: null,
        schedule_summary: '',
        confirmation_message: 'Pledges are not enabled for this campaign.'
      };
    }

    const total = Number(total_amount) || 0;
    const count = Number(installment_count) || 0;
    const per = Number(installment_amount) || 0;

    if (total <= 0 || count <= 0 || per <= 0) {
      return {
        success: false,
        pledge_id: null,
        schedule_summary: '',
        confirmation_message: 'Invalid pledge configuration.'
      };
    }

    // Allow small rounding differences
    const expectedTotal = per * count;
    if (Math.abs(expectedTotal - total) > 0.01) {
      // Adjust total to match installments
      total_amount = expectedTotal;
    }

    const pledgeId = this._generateId('pledge');
    const startDateIso = start_date || this._nowIso();

    const pledge = {
      id: pledgeId,
      campaign_id: campaignId,
      total_amount: Number(total_amount),
      frequency: frequency || 'monthly',
      installment_count: count,
      installment_amount: per,
      start_date: startDateIso,
      donor_name,
      donor_email,
      donor_phone: donor_phone || null,
      reminders_enabled: !!reminders_enabled,
      status: 'active',
      created_at: this._nowIso()
    };

    const pledges = this._getFromStorage('pledges', []);
    pledges.push(pledge);
    this._saveToStorage('pledges', pledges);

    const schedule_summary = `Pledge of $${pledge.total_amount} in ${pledge.installment_count} ${pledge.frequency} installments of $${pledge.installment_amount}.`;

    return {
      success: true,
      pledge_id: pledgeId,
      schedule_summary,
      confirmation_message: 'Your pledge has been created.'
    };
  }

  // ----------------------
  // Interface: validatePromoCodeForCampaign
  // ----------------------

  validatePromoCodeForCampaign(campaignId, promo_code, base_amount) {
    const baseAmount = Number(base_amount) || 0;
    const promo = this._findPromoCodeForCampaign(campaignId, promo_code);

    if (!promo) {
      return {
        valid: false,
        promo_code: promo_code || null,
        discount_type: null,
        discount_value: 0,
        adjusted_amount: baseAmount,
        fee_waived: false,
        message: 'Promo code is not valid for this campaign or has expired.'
      };
    }

    let adjusted = baseAmount;
    let feeWaived = false;

    switch (promo.discount_type) {
      case 'amount_off': {
        const value = typeof promo.discount_value === 'number' ? promo.discount_value : 0;
        adjusted = Math.max(0, baseAmount - value);
        break;
      }
      case 'percent_off': {
        const pct = typeof promo.discount_value === 'number' ? promo.discount_value : 0;
        adjusted = Math.max(0, baseAmount - (baseAmount * pct / 100));
        break;
      }
      case 'fee_waiver': {
        adjusted = baseAmount;
        feeWaived = true;
        break;
      }
      default: {
        adjusted = baseAmount;
        break;
      }
    }

    return {
      valid: true,
      promo_code: promo.code,
      discount_type: promo.discount_type,
      discount_value: typeof promo.discount_value === 'number' ? promo.discount_value : 0,
      adjusted_amount: adjusted,
      fee_waived: feeWaived,
      message: 'Promo code applied.'
    };
  }

  // ----------------------
  // Interface: addCampaignDonationToCart
  // ----------------------

  addCampaignDonationToCart(campaignId, amount) {
    const campaign = this._findCampaignById(campaignId);
    if (!campaign) {
      return {
        success: false,
        cart_id: null,
        items_count: 0,
        total_amount: 0,
        cart_items: [],
        message: 'Campaign not found'
      };
    }

    if (!campaign.allow_cart) {
      return {
        success: false,
        cart_id: null,
        items_count: 0,
        total_amount: 0,
        cart_items: [],
        message: 'This campaign cannot be added to the cart.'
      };
    }

    const amt = Number(amount) || 0;
    if (amt <= 0) {
      return {
        success: false,
        cart_id: null,
        items_count: 0,
        total_amount: 0,
        cart_items: [],
        message: 'Invalid donation amount'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const cartItemId = this._generateId('cart_item');
    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      target_type: 'campaign',
      campaign_id: campaignId,
      student_id: null,
      amount: amt,
      donation_type: 'one_time',
      created_at: this._nowIso()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.items.push(cartItemId);
    this._recalculateCartTotals(cart, cartItems);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    const cart_items = itemsForCart.map(ci => {
      const camp = ci.campaign_id ? this._findCampaignById(ci.campaign_id) : null;
      const student = ci.student_id ? this._findStudentById(ci.student_id) : null;
      return {
        cart_item_id: ci.id,
        target_type: ci.target_type,
        target_name: camp ? camp.name : (student ? student.name : ''),
        campaign_type: camp ? camp.type : null,
        amount: ci.amount,
        // Foreign key resolution as full objects
        campaign: camp,
        student: student
      };
    });

    return {
      success: true,
      cart_id: cart.id,
      items_count: cart_items.length,
      total_amount: cart.total_amount,
      cart_items,
      message: 'Item added to cart.'
    };
  }

  // ----------------------
  // Interface: getStudentFundraisersList
  // ----------------------

  getStudentFundraisersList(
    search_query,
    grade_level,
    homeroom,
    status_filter,
    page,
    page_size
  ) {
    const raw = this._getFromStorage('student_fundraisers', []);
    const now = new Date();
    const q = (search_query || '').trim().toLowerCase();
    const gradeFilter = typeof grade_level === 'number' ? grade_level : null;
    const homeroomFilter = (homeroom || '').trim().toLowerCase();
    const statusFilter = (status_filter || 'active');

    let items = raw.map(s => this._normalizeStudent(s, now));

    if (statusFilter) {
      items = items.filter(s => s.status === statusFilter);
    }

    if (q) {
      items = items.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.campaign_title && s.campaign_title.toLowerCase().includes(q))
      );
    }

    if (gradeFilter !== null) {
      items = items.filter(s => typeof s.grade_level === 'number' && s.grade_level === gradeFilter);
    }

    if (homeroomFilter) {
      items = items.filter(s => s.homeroom && s.homeroom.toLowerCase().includes(homeroomFilter));
    }

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof page_size === 'number' && page_size > 0 ? page_size : 20;

    const total_count = items.length;
    const start = (currentPage - 1) * size;
    const sliced = items.slice(start, start + size);

    const mapped = sliced.map(s => ({
      student_id: s.id,
      name: s.name,
      slug: s.slug || null,
      photo_url: s.photo_url || null,
      campaign_title: s.campaign_title || null,
      goal_amount: s.goal_amount || 0,
      amount_raised: s.amount_raised || 0,
      percent_funded: s.percent_funded,
      grade_level: typeof s.grade_level === 'number' ? s.grade_level : null,
      homeroom: s.homeroom || null,
      end_date: s.end_date || null,
      status: s.status
    }));

    return {
      items: mapped,
      total_count,
      page: currentPage,
      page_size: size
    };
  }

  // ----------------------
  // Interface: getStudentFundraiserDetail
  // ----------------------

  getStudentFundraiserDetail(studentId) {
    const student = this._findStudentById(studentId);
    if (!student) return null;
    const norm = this._normalizeStudent(student);

    return {
      student_id: norm.id,
      name: norm.name,
      slug: norm.slug || null,
      photo_url: norm.photo_url || null,
      story: norm.story || '',
      campaign_title: norm.campaign_title || null,
      goal_amount: norm.goal_amount || 0,
      amount_raised: norm.amount_raised || 0,
      percent_funded: norm.percent_funded,
      grade_level: typeof norm.grade_level === 'number' ? norm.grade_level : null,
      homeroom: norm.homeroom || null,
      end_date: norm.end_date || null,
      status: norm.status,
      preset_amounts: Array.isArray(norm.preset_amounts) ? norm.preset_amounts : []
    };
  }

  // ----------------------
  // Interface: submitStudentDonation
  // ----------------------

  submitStudentDonation(
    studentId,
    amount,
    public_message,
    recognition_setting,
    cover_fees,
    donor_name,
    donor_email,
    donor_phone,
    donor_city,
    donor_postal_code,
    email_updates_opt_in,
    text_updates_opt_in,
    newsletter_opt_in
  ) {
    const student = this._findStudentById(studentId);
    if (!student) {
      return {
        success: false,
        donation_id: null,
        amount_charged: 0,
        confirmation_message: 'Student fundraiser not found'
      };
    }

    const amt = Number(amount) || 0;
    if (amt <= 0) {
      return {
        success: false,
        donation_id: null,
        amount_charged: 0,
        confirmation_message: 'Invalid donation amount'
      };
    }

    const coverFeesFlag = !!cover_fees;
    const feeAmount = coverFeesFlag ? this._calculateFee(amt) : 0;
    const amountCharged = amt + feeAmount;

    const donationId = this._generateId('donation');

    const donation = {
      id: donationId,
      target_type: 'student',
      campaign_id: null,
      student_id: studentId,
      donation_type: 'one_time',
      amount: amt,
      currency: 'USD',
      dedication_type: 'none',
      dedication_honoree_name: null,
      recognition_setting: recognition_setting || 'show_name_and_amount',
      public_message: public_message || null,
      promo_code: null,
      cover_fees: coverFeesFlag,
      fee_amount: feeAmount,
      donor_name,
      donor_email,
      donor_phone: donor_phone || null,
      donor_address_line1: null,
      donor_city: donor_city || null,
      donor_postal_code: donor_postal_code || null,
      email_updates_opt_in: !!email_updates_opt_in,
      text_updates_opt_in: !!text_updates_opt_in,
      newsletter_opt_in: !!newsletter_opt_in,
      order_group_id: null,
      status: 'completed',
      created_at: this._nowIso(),
      completed_at: this._nowIso()
    };

    const donations = this._getFromStorage('donations', []);
    donations.push(donation);
    this._saveToStorage('donations', donations);

    this._updateStudentRaised(studentId, amt);

    return {
      success: true,
      donation_id: donationId,
      amount_charged: amountCharged,
      confirmation_message: 'Thank you for supporting this student!'
    };
  }

  // ----------------------
  // Interface: getDonationCart
  // ----------------------

  getDonationCart() {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        cart_id: null,
        items: [],
        total_amount: 0,
        currency: 'USD'
      };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    const items = itemsForCart.map(ci => {
      const campaign = ci.campaign_id ? this._findCampaignById(ci.campaign_id) : null;
      const student = ci.student_id ? this._findStudentById(ci.student_id) : null;
      let subtitle = '';
      if (campaign) {
        subtitle = this._typeLabelForCampaignType(campaign.type);
      } else if (student && typeof student.grade_level === 'number') {
        subtitle = `${student.grade_level}th Grade`;
      }

      return {
        cart_item_id: ci.id,
        target_type: ci.target_type,
        target_name: campaign ? campaign.name : (student ? student.name : ''),
        target_subtitle: subtitle,
        amount: ci.amount,
        // Foreign key resolution
        campaign,
        student
      };
    });

    return {
      cart_id: cart.id,
      items,
      total_amount: cart.total_amount || 0,
      currency: cart.currency || 'USD'
    };
  }

  // ----------------------
  // Interface: updateCartItemAmount
  // ----------------------

  updateCartItemAmount(cartItemId, amount) {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);

    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1 || !cart) {
      return {
        success: false,
        cart_id: cart ? cart.id : null,
        updated_item: null,
        total_amount: cart ? cart.total_amount : 0,
        message: 'Cart item or cart not found.'
      };
    }

    const amt = Number(amount) || 0;
    if (amt <= 0) {
      return {
        success: false,
        cart_id: cart.id,
        updated_item: null,
        total_amount: cart.total_amount,
        message: 'Invalid amount.'
      };
    }

    cartItems[idx].amount = amt;
    this._saveToStorage('cart_items', cartItems);

    this._recalculateCartTotals(cart, cartItems);

    return {
      success: true,
      cart_id: cart.id,
      updated_item: {
        cart_item_id: cartItems[idx].id,
        amount: cartItems[idx].amount
      },
      total_amount: cart.total_amount,
      message: 'Cart item updated.'
    };
  }

  // ----------------------
  // Interface: removeCartItem
  // ----------------------

  removeCartItem(cartItemId) {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        success: false,
        cart_id: null,
        items_count: 0,
        total_amount: 0,
        message: 'Cart not found.'
      };
    }

    let cartItems = this._getFromStorage('cart_items', []);
    const existingLength = cartItems.length;

    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    if (existingLength === cartItems.length) {
      return {
        success: false,
        cart_id: cart.id,
        items_count: cart.items.length,
        total_amount: cart.total_amount,
        message: 'Cart item not found.'
      };
    }

    cart.items = cart.items.filter(id => id !== cartItemId);
    this._recalculateCartTotals(cart, cartItems);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      cart_id: cart.id,
      items_count: itemsForCart.length,
      total_amount: cart.total_amount,
      message: 'Cart item removed.'
    };
  }

  // ----------------------
  // Interface: getCheckoutSummary
  // ----------------------

  getCheckoutSummary() {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        cart_id: null,
        line_items: [],
        total_amount: 0,
        currency: 'USD'
      };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    const line_items = itemsForCart.map(ci => {
      const campaign = ci.campaign_id ? this._findCampaignById(ci.campaign_id) : null;
      const student = ci.student_id ? this._findStudentById(ci.student_id) : null;
      return {
        cart_item_id: ci.id,
        target_type: ci.target_type,
        target_name: campaign ? campaign.name : (student ? student.name : ''),
        amount: ci.amount,
        // Foreign key resolution
        campaign,
        student
      };
    });

    return {
      cart_id: cart.id,
      line_items,
      total_amount: cart.total_amount || 0,
      currency: cart.currency || 'USD'
    };
  }

  // ----------------------
  // Interface: completeCartCheckout
  // ----------------------

  completeCartCheckout(
    donor_name,
    donor_email,
    donor_phone,
    donor_address_line1,
    donor_city,
    donor_postal_code,
    email_updates_opt_in,
    text_updates_opt_in,
    newsletter_opt_in,
    payment_token
  ) {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);

    if (!cart) {
      return {
        success: false,
        order_group_id: null,
        total_amount_charged: 0,
        donation_ids: [],
        confirmation_message: 'Cart is empty.'
      };
    }

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    if (itemsForCart.length === 0) {
      return {
        success: false,
        order_group_id: null,
        total_amount_charged: 0,
        donation_ids: [],
        confirmation_message: 'Cart is empty.'
      };
    }

    const orderGroupId = this._generateId('order');
    const donations = this._getFromStorage('donations', []);
    const donationIds = [];
    const createdAt = this._nowIso();

    let totalAmount = 0;

    for (const ci of itemsForCart) {
      const amt = Number(ci.amount) || 0;
      totalAmount += amt;

      const donationId = this._generateId('donation');
      donationIds.push(donationId);

      const donation = {
        id: donationId,
        target_type: ci.target_type,
        campaign_id: ci.campaign_id || null,
        student_id: ci.student_id || null,
        donation_type: 'one_time',
        amount: amt,
        currency: 'USD',
        dedication_type: 'none',
        dedication_honoree_name: null,
        recognition_setting: 'show_name_and_amount',
        public_message: null,
        promo_code: null,
        cover_fees: false,
        fee_amount: 0,
        donor_name,
        donor_email,
        donor_phone: donor_phone || null,
        donor_address_line1: donor_address_line1 || null,
        donor_city: donor_city || null,
        donor_postal_code: donor_postal_code || null,
        email_updates_opt_in: !!email_updates_opt_in,
        text_updates_opt_in: !!text_updates_opt_in,
        newsletter_opt_in: !!newsletter_opt_in,
        order_group_id: orderGroupId,
        status: 'completed',
        created_at: createdAt,
        completed_at: createdAt
      };

      donations.push(donation);

      if (ci.target_type === 'campaign' && ci.campaign_id) {
        this._updateCampaignRaised(ci.campaign_id, amt);
      } else if (ci.target_type === 'student' && ci.student_id) {
        this._updateStudentRaised(ci.student_id, amt);
      }
    }

    this._saveToStorage('donations', donations);

    // Clear cart items for this cart
    const remainingCartItems = cartItems.filter(ci => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', remainingCartItems);

    cart.items = [];
    cart.total_amount = 0;
    cart.updated_at = this._nowIso();
    this._saveToStorage('cart', cart);

    return {
      success: true,
      order_group_id: orderGroupId,
      total_amount_charged: totalAmount,
      donation_ids: donationIds,
      confirmation_message: 'Thank you for your donation!'
    };
  }

  // ----------------------
  // Interface: getSponsorshipLevels
  // ----------------------

  getSponsorshipLevels() {
    const levelsRaw = this._getFromStorage('sponsorship_levels', []);
    const activeLevels = levelsRaw.filter(l => l.status === 'active');

    const levels = activeLevels.map(l => ({
      sponsorship_level_id: l.id,
      name: l.name,
      price: l.price,
      description: l.description || '',
      benefits: Array.isArray(l.benefits) ? l.benefits : [],
      includes_gym_banner: !!l.includes_gym_banner,
      status: l.status,
      display_order: typeof l.display_order === 'number' ? l.display_order : null
    }));

    return { levels };
  }

  // ----------------------
  // Interface: getSponsorshipLevelDetail
  // ----------------------

  getSponsorshipLevelDetail(sponsorshipLevelId) {
    const levelsRaw = this._getFromStorage('sponsorship_levels', []);
    const level = levelsRaw.find(l => l.id === sponsorshipLevelId) || null;
    if (!level) return null;

    return {
      sponsorship_level_id: level.id,
      name: level.name,
      price: level.price,
      description: level.description || '',
      benefits: Array.isArray(level.benefits) ? level.benefits : [],
      includes_gym_banner: !!level.includes_gym_banner,
      status: level.status
    };
  }

  // ----------------------
  // Interface: submitSponsorship
  // ----------------------

  submitSponsorship(
    sponsorshipLevelId,
    company_name,
    contact_name,
    contact_email,
    contact_phone,
    public_recognition_allowed,
    payment_token
  ) {
    const levelsRaw = this._getFromStorage('sponsorship_levels', []);
    const level = levelsRaw.find(l => l.id === sponsorshipLevelId) || null;

    if (!level) {
      return {
        success: false,
        sponsorship_id: null,
        amount_charged: 0,
        confirmation_message: 'Sponsorship level not found.'
      };
    }

    const sponsorshipId = this._generateId('sponsorship');

    const sponsorship = {
      id: sponsorshipId,
      sponsorship_level_id: sponsorshipLevelId,
      amount: level.price,
      company_name,
      contact_name,
      contact_email,
      contact_phone,
      public_recognition_allowed: !!public_recognition_allowed,
      status: 'completed',
      created_at: this._nowIso()
    };

    const sponsorships = this._getFromStorage('sponsorships', []);
    sponsorships.push(sponsorship);
    this._saveToStorage('sponsorships', sponsorships);

    return {
      success: true,
      sponsorship_id: sponsorshipId,
      amount_charged: level.price,
      confirmation_message: 'Thank you for your sponsorship!'
    };
  }

  // ----------------------
  // Interface: getAboutPageContent
  // ----------------------

  getAboutPageContent() {
    const content = this._getFromStorage('about_page_content', {
      mission_html: '',
      impact_stories_html: '',
      impact_stats: {
        students_supported: 0,
        campaigns_funded: 0,
        total_raised: 0
      }
    });

    return {
      mission_html: content.mission_html || '',
      impact_stories_html: content.impact_stories_html || '',
      impact_stats: {
        students_supported: (content.impact_stats && typeof content.impact_stats.students_supported === 'number') ? content.impact_stats.students_supported : 0,
        campaigns_funded: (content.impact_stats && typeof content.impact_stats.campaigns_funded === 'number') ? content.impact_stats.campaigns_funded : 0,
        total_raised: (content.impact_stats && typeof content.impact_stats.total_raised === 'number') ? content.impact_stats.total_raised : 0
      }
    };
  }

  // ----------------------
  // Interface: getContactPageContent
  // ----------------------

  getContactPageContent() {
    const content = this._getFromStorage('contact_page_content', {
      office_email: '',
      office_phone: '',
      mailing_address: '',
      faq_page_slug: '',
      policies_page_slug: ''
    });

    return {
      office_email: content.office_email || '',
      office_phone: content.office_phone || '',
      mailing_address: content.mailing_address || '',
      faq_page_slug: content.faq_page_slug || '',
      policies_page_slug: content.policies_page_slug || ''
    };
  }

  // ----------------------
  // Interface: submitContactInquiry
  // ----------------------

  submitContactInquiry(name, email, topic, message_body) {
    const inquiries = this._getFromStorage('contact_inquiries', []);
    const ticketId = this._generateId('ticket');

    const inquiry = {
      id: ticketId,
      name,
      email,
      topic: topic || 'other',
      message_body,
      created_at: this._nowIso()
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      ticket_id: ticketId,
      confirmation_message: 'Your inquiry has been received.'
    };
  }

  // ----------------------
  // Interface: getFaqContent
  // ----------------------

  getFaqContent() {
    const content = this._getFromStorage('faq_content', { sections: [] });
    return {
      sections: Array.isArray(content.sections) ? content.sections : []
    };
  }

  // ----------------------
  // Interface: getPolicyContent
  // ----------------------

  getPolicyContent(policy_type) {
    const all = this._getFromStorage('policies_content', {});
    const policy = all && all[policy_type] ? all[policy_type] : null;

    if (!policy) {
      return {
        policy_type,
        title: '',
        body_html: '',
        last_updated: null
      };
    }

    return {
      policy_type,
      title: policy.title || '',
      body_html: policy.body_html || '',
      last_updated: policy.last_updated || null
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