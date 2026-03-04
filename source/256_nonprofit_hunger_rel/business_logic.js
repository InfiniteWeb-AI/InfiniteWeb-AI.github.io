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
  }

  // ====== Storage helpers ======
  _initStorage() {
    // Array-based tables from data model
    const arrayKeys = [
      'program_categories',
      'programs',
      'meal_bundles',
      'family_profiles',
      'volunteer_opportunities',
      'volunteer_shifts',
      'volunteer_registrations',
      'campaigns',
      'cover_images',
      'fundraisers',
      'stories',
      'newsletter_subscriptions',
      'events',
      'event_registrations',
      'donation_carts',
      'cart_items',
      'donation_orders',
      'donation_allocations',
      'recurring_donations'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Object-style config content (kept minimal, not mocked with real text)
    if (!localStorage.getItem('homepage_content')) {
      const defaultHomepage = {
        missionSummary: '',
        impactStats: {
          mealsServedToDate: 0,
          childrenServedLastYear: 0,
          countriesServedCount: 0
        }
      };
      localStorage.setItem('homepage_content', JSON.stringify(defaultHomepage));
    }

    if (!localStorage.getItem('fundraising_landing_content')) {
      const defaultFundraisingLanding = {
        introText: '',
        howItWorksSteps: []
      };
      localStorage.setItem('fundraising_landing_content', JSON.stringify(defaultFundraisingLanding));
    }

    // Optional postal geocode cache used by _geocodePostalCode
    if (!localStorage.getItem('postal_geocodes')) {
      localStorage.setItem('postal_geocodes', JSON.stringify({}));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
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
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _toDateOnly(isoString) {
    if (!isoString) return null;
    return isoString.slice(0, 10);
  }

  // ===== Enum label helpers =====
  _mapBeneficiaryLabel(code) {
    const map = {
      children_0_17: 'Children (0–17)',
      adults: 'Adults',
      families: 'Families',
      seniors: 'Seniors',
      communities: 'Communities'
    };
    return map[code] || code || '';
  }

  _mapFrequencyLabel(code) {
    const map = {
      one_time: 'One-time',
      monthly: 'Monthly',
      annual: 'Annual'
    };
    return map[code] || code || '';
  }

  _mapActivityTypeLabel(code) {
    const map = {
      food_packing: 'Food Packing',
      meal_service: 'Meal Service',
      distribution: 'Distribution',
      fundraising_support: 'Fundraising Support',
      administration: 'Administration',
      other: 'Other'
    };
    return map[code] || code || '';
  }

  _mapStoryCategoryLabel(code) {
    const map = {
      community_gardens: 'Community Gardens',
      school_meals: 'School Meals',
      emergency_relief: 'Emergency Relief',
      volunteer_spotlight: 'Volunteer Spotlight',
      family_sponsorship: 'Family Sponsorship',
      organizational_news: 'Organizational News'
    };
    return map[code] || code || '';
  }

  _mapEventTopicCategoryLabel(code) {
    const map = {
      hunger_awareness: 'Hunger Awareness',
      education_awareness: 'Education & Awareness',
      fundraising_event: 'Fundraising Event',
      volunteer_training: 'Volunteer Training',
      community_event: 'Community Event',
      other: 'Other'
    };
    return map[code] || code || '';
  }

  _mapTimeOfDayLabel(code) {
    const map = {
      morning_9_12: 'Morning (9 AM – 12 PM)',
      afternoon_12_5: 'Afternoon (12 PM – 5 PM)',
      evening_5_9: 'Evening (5 PM – 9 PM)',
      full_day: 'Full Day',
      other: 'Other'
    };
    return map[code] || code || '';
  }

  _mapCostTypeLabel(code) {
    const map = {
      free: 'Free',
      paid: 'Paid',
      donation_optional: 'Donation Optional'
    };
    return map[code] || code || '';
  }

  _mapRegionLabel(code) {
    const map = {
      africa: 'Africa',
      asia: 'Asia',
      latin_america: 'Latin America',
      north_america: 'North America',
      europe: 'Europe',
      middle_east: 'Middle East',
      global: 'Global'
    };
    return map[code] || code || '';
  }

  // ===== Foreign key resolution helpers =====
  _resolveProgram(program, categories) {
    if (!program) return null;
    const cats = categories || this._getFromStorage('program_categories', []);
    const category = cats.find((c) => c.id === program.categoryId) || null;
    return { ...program, category };
  }

  _resolveStory(story, coverImages) {
    if (!story) return null;
    const images = coverImages || this._getFromStorage('cover_images', []);
    const featuredImage = story.featuredImageId
      ? images.find((img) => img.id === story.featuredImageId) || null
      : null;
    return { ...story, featuredImage };
  }

  _resolveCampaign(campaign, coverImages) {
    if (!campaign) return null;
    const images = coverImages || this._getFromStorage('cover_images', []);
    const defaultCoverImage = campaign.defaultCoverImageId
      ? images.find((img) => img.id === campaign.defaultCoverImageId) || null
      : null;
    return { ...campaign, defaultCoverImage };
  }

  _resolveFundraiser(fundraiser, campaigns, coverImages) {
    if (!fundraiser) return null;
    const allCampaigns = campaigns || this._getFromStorage('campaigns', []);
    const allImages = coverImages || this._getFromStorage('cover_images', []);
    const campaign = allCampaigns.find((c) => c.id === fundraiser.campaignId) || null;
    const coverImage = fundraiser.coverImageId
      ? allImages.find((i) => i.id === fundraiser.coverImageId) || null
      : null;
    return { ...fundraiser, campaign, coverImage };
  }

  _resolveNewsletterSubscription(subscription, stories) {
    if (!subscription) return null;
    const allStories = stories || this._getFromStorage('stories', []);
    const sourceStory = subscription.sourceStoryId
      ? allStories.find((s) => s.id === subscription.sourceStoryId) || null
      : null;
    return { ...subscription, sourceStory };
  }

  _resolveEvent(event) {
    if (!event) return null;
    return { ...event };
  }

  _resolveVolunteerShift(shift, opportunities) {
    if (!shift) return null;
    const allOpps = opportunities || this._getFromStorage('volunteer_opportunities', []);
    const opportunity = allOpps.find((o) => o.id === shift.volunteerOpportunityId) || null;
    return { ...shift, volunteerOpportunity: opportunity };
  }

  _resolveDonationOrder(order, carts) {
    if (!order) return null;
    const allCarts = carts || this._getFromStorage('donation_carts', []);
    const cart = allCarts.find((c) => c.id === order.cartId) || null;
    return { ...order, cart };
  }

  _resolveDonationAllocation(allocation, programs, bundles, families, recurring) {
    if (!allocation) return null;
    const allPrograms = programs || this._getFromStorage('programs', []);
    const allBundles = bundles || this._getFromStorage('meal_bundles', []);
    const allFamilies = families || this._getFromStorage('family_profiles', []);
    const allRecurring = recurring || this._getFromStorage('recurring_donations', []);
    const program = allocation.programId
      ? allPrograms.find((p) => p.id === allocation.programId) || null
      : null;
    const mealBundle = allocation.mealBundleId
      ? allBundles.find((b) => b.id === allocation.mealBundleId) || null
      : null;
    const family = allocation.familyId
      ? allFamilies.find((f) => f.id === allocation.familyId) || null
      : null;
    const recurringDonation = allocation.recurringDonationId
      ? allRecurring.find((r) => r.id === allocation.recurringDonationId) || null
      : null;
    return { ...allocation, program, mealBundle, family, recurringDonation };
  }

  _resolveRecurringDonation(recurringDonation, programs, families) {
    if (!recurringDonation) return null;
    const allPrograms = programs || this._getFromStorage('programs', []);
    const allFamilies = families || this._getFromStorage('family_profiles', []);
    const program = recurringDonation.programId
      ? allPrograms.find((p) => p.id === recurringDonation.programId) || null
      : null;
    const family = recurringDonation.familyId
      ? allFamilies.find((f) => f.id === recurringDonation.familyId) || null
      : null;
    return { ...recurringDonation, program, family };
  }

  // ===== Cart helpers =====
  _getOpenCart() {
    const carts = this._getFromStorage('donation_carts', []);
    return carts.find((c) => c.status === 'open') || null;
  }

  _getOrCreateCart() {
    let carts = this._getFromStorage('donation_carts', []);
    let cart = carts.find((c) => c.status === 'open') || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        createdAt: this._nowIso(),
        updatedAt: this._nowIso(),
        status: 'open',
        totalAmount: 0
      };
      carts.push(cart);
      this._saveToStorage('donation_carts', carts);
    }
    return cart;
  }

  _recalculateCartTotal(cart) {
    if (!cart) return 0;
    const allItems = this._getFromStorage('cart_items', []);
    const items = allItems.filter((ci) => ci.cartId === cart.id);
    let total = 0;
    items.forEach((item) => {
      const qty = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
      const amount = typeof item.amount === 'number' ? item.amount : 0;
      total += amount * qty;
    });
    cart.totalAmount = total;
    cart.updatedAt = this._nowIso();
    const carts = this._getFromStorage('donation_carts', []);
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('donation_carts', carts);
    }
    return total;
  }

  _buildCartItemView(cartItem) {
    const programs = this._getFromStorage('programs', []);
    const categories = this._getFromStorage('program_categories', []);
    const bundles = this._getFromStorage('meal_bundles', []);
    const families = this._getFromStorage('family_profiles', []);

    let displayName = '';
    let impactSummary = '';
    let program = null;
    let mealBundle = null;
    let family = null;

    if (cartItem.programId) {
      const p = programs.find((pr) => pr.id === cartItem.programId) || null;
      program = this._resolveProgram(p, categories);
    }
    if (cartItem.mealBundleId) {
      mealBundle = bundles.find((b) => b.id === cartItem.mealBundleId) || null;
    }
    if (cartItem.familyId) {
      family = families.find((f) => f.id === cartItem.familyId) || null;
    }

    const qty = typeof cartItem.quantity === 'number' && cartItem.quantity > 0 ? cartItem.quantity : 1;

    switch (cartItem.itemType) {
      case 'program_donation':
      case 'recurring_program_donation': {
        displayName = program ? program.name : 'Program Donation';
        if (program && typeof program.mealsPer10Dollars === 'number' && cartItem.amount) {
          const meals = (program.mealsPer10Dollars / 10) * cartItem.amount;
          impactSummary = `${meals.toFixed(0)} meals estimated`;
        }
        break;
      }
      case 'meal_bundle': {
        if (mealBundle) {
          const totalMeals = (mealBundle.mealsCount || 0) * qty;
          displayName = mealBundle.name;
          impactSummary = `${totalMeals} meals total`;
        } else {
          displayName = 'Meal Bundle';
        }
        break;
      }
      case 'family_sponsorship': {
        if (family) {
          displayName = family.familyName || 'Family Sponsorship';
          impactSummary = `${family.childrenCount || 0} children supported monthly`;
        } else {
          displayName = 'Family Sponsorship';
        }
        break;
      }
      default:
        displayName = 'Donation Item';
    }

    const itemTypeLabelMap = {
      program_donation: 'Program Donation',
      recurring_program_donation: 'Recurring Program Donation',
      meal_bundle: 'Meal Bundle',
      family_sponsorship: 'Family Sponsorship'
    };

    return {
      cartItem: { ...cartItem },
      displayName,
      itemTypeLabel: itemTypeLabelMap[cartItem.itemType] || 'Donation',
      impactSummary,
      program,
      mealBundle,
      family,
      frequencyLabel: this._mapFrequencyLabel(cartItem.frequency)
    };
  }

  _buildCartResponse(cart) {
    if (!cart) {
      return {
        cart: null,
        items: [],
        totalAmount: 0
      };
    }
    const allItems = this._getFromStorage('cart_items', []);
    const items = allItems
      .filter((ci) => ci.cartId === cart.id)
      .map((ci) => this._buildCartItemView(ci));
    return {
      cart: { ...cart },
      items,
      totalAmount: cart.totalAmount || 0
    };
  }

  // ===== Geocode & volunteer helpers =====
  _geocodePostalCode(postalCode) {
    if (!postalCode) return null;
    const cache = this._getFromStorage('postal_geocodes', {});
    if (cache && cache[postalCode]) {
      return cache[postalCode];
    }
    // No external API calls allowed; return null when unknown.
    return null;
  }

  _haversineDistanceMiles(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Earth radius in miles
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _findMatchingVolunteerShifts(shifts, date, timeOfDay) {
    if (!Array.isArray(shifts)) return [];
    return shifts.filter((shift) => {
      if (!shift.isActive) return false;
      if (date) {
        const shiftDate = this._toDateOnly(shift.startDateTime);
        if (shiftDate !== date) return false;
      }
      if (timeOfDay && shift.timeOfDay !== timeOfDay) return false;
      return true;
    });
  }

  _buildRecurringDonationPreviews(cartItems) {
    if (!Array.isArray(cartItems)) return [];
    const programs = this._getFromStorage('programs', []);
    const families = this._getFromStorage('family_profiles', []);
    const previews = [];

    cartItems.forEach((item) => {
      if (item.frequency === 'monthly' || item.frequency === 'annual') {
        let targetType = null;
        let program = null;
        let family = null;
        if (item.programId) {
          targetType = 'program';
          const p = programs.find((pr) => pr.id === item.programId) || null;
          program = p || null;
        }
        if (item.familyId) {
          targetType = 'family';
          family = families.find((f) => f.id === item.familyId) || null;
        }
        previews.push({
          targetType,
          program,
          family,
          amount: item.amount || 0,
          billingDayOfMonth: item.billingDayOfMonth || 1,
          frequencyLabel: this._mapFrequencyLabel(item.frequency)
        });
      }
    });

    return previews;
  }

  // ===== Interface implementations =====

  // --- getHomepageContent ---
  getHomepageContent() {
    const homepage = this._getFromStorage('homepage_content', {
      missionSummary: '',
      impactStats: {
        mealsServedToDate: 0,
        childrenServedLastYear: 0,
        countriesServedCount: 0
      }
    });

    const programs = this._getFromStorage('programs', []);
    const categories = this._getFromStorage('program_categories', []);
    const stories = this._getFromStorage('stories', []);
    const coverImages = this._getFromStorage('cover_images', []);
    const events = this._getFromStorage('events', []);

    const featuredProgramsRaw = programs.filter((p) => p.isActive && p.isFeatured);
    const featuredPrograms = featuredProgramsRaw.map((p) => {
      const rp = this._resolveProgram(p, categories);
      const categoryName = rp.category ? rp.category.name : '';
      const primaryBeneficiaryLabel = this._mapBeneficiaryLabel(rp.primaryBeneficiary);
      return {
        program: rp,
        categoryName,
        primaryBeneficiaryLabel
      };
    });

    const featuredStoriesRaw = stories
      .filter((s) => s.isPublished)
      .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
      .slice(0, 5);

    const featuredStories = featuredStoriesRaw.map((s) => {
      const rs = this._resolveStory(s, coverImages);
      const categoryLabel = this._mapStoryCategoryLabel(rs.category);
      return {
        story: rs,
        categoryLabel
      };
    });

    const nowIso = this._nowIso();
    const upcomingEventsRaw = events
      .filter((e) => e.isActive && e.startDateTime > nowIso)
      .sort((a, b) => (a.startDateTime > b.startDateTime ? 1 : -1))
      .slice(0, 5);

    const upcomingEvents = upcomingEventsRaw.map((ev) => {
      const dateLabel = this._toDateOnly(ev.startDateTime) || '';
      const timeLabel = this._mapTimeOfDayLabel(ev.timeOfDay);
      const costLabel = this._mapCostTypeLabel(ev.costType);
      return {
        event: this._resolveEvent(ev),
        dateLabel,
        timeLabel,
        costLabel
      };
    });

    return {
      missionSummary: homepage.missionSummary || '',
      impactStats: homepage.impactStats || {
        mealsServedToDate: 0,
        childrenServedLastYear: 0,
        countriesServedCount: 0
      },
      featuredPrograms,
      featuredStories,
      upcomingEvents
    };
  }

  // --- getProgramFilterOptions ---
  getProgramFilterOptions() {
    const categories = this._getFromStorage('program_categories', []);
    const programs = this._getFromStorage('programs', []);

    // Regions from data if possible, otherwise full enum list
    let regionsSet = new Set();
    programs.forEach((p) => {
      if (p.isActive && p.region) regionsSet.add(p.region);
    });
    if (regionsSet.size === 0) {
      regionsSet = new Set([
        'africa',
        'asia',
        'latin_america',
        'north_america',
        'europe',
        'middle_east',
        'global'
      ]);
    }
    const regions = Array.from(regionsSet);

    const beneficiaries = [
      { value: 'children_0_17', label: 'Children (0–17)' },
      { value: 'adults', label: 'Adults' },
      { value: 'families', label: 'Families' },
      { value: 'seniors', label: 'Seniors' },
      { value: 'communities', label: 'Communities' }
    ];

    const sortOptions = [
      { value: 'meals_per_10_dollars_desc', label: 'Meals per $10 – Highest first' },
      { value: 'name_asc', label: 'Name A–Z' }
    ];

    // Resolve FK for categories if any (none here, but keep consistent)
    const resolvedCategories = categories.map((c) => ({ ...c }));

    return {
      categories: resolvedCategories,
      regions,
      beneficiaries,
      sortOptions
    };
  }

  // --- searchPrograms ---
  searchPrograms(
    textQuery,
    categoryCodes,
    region,
    city,
    country,
    primaryBeneficiary,
    isFeaturedOnly = false,
    sortBy = 'meals_per_10_dollars_desc',
    page = 1,
    pageSize = 20
  ) {
    const programs = this._getFromStorage('programs', []);
    const categories = this._getFromStorage('program_categories', []);

    let results = programs.filter((p) => p.isActive);

    const q = (textQuery || '').toLowerCase().trim();
    if (q) {
      results = results.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    if (categoryCodes && categoryCodes.length) {
      results = results.filter((p) => {
        const cat = categories.find((c) => c.id === p.categoryId);
        return cat && categoryCodes.includes(cat.code);
      });
    }

    if (region) {
      results = results.filter((p) => p.region === region);
    }

    if (city) {
      const cityLc = city.toLowerCase();
      results = results.filter((p) => (p.city || '').toLowerCase() === cityLc);
    }

    if (country) {
      const countryLc = country.toLowerCase();
      results = results.filter((p) => (p.country || '').toLowerCase() === countryLc);
    }

    if (primaryBeneficiary) {
      results = results.filter((p) => p.primaryBeneficiary === primaryBeneficiary);
    }

    if (isFeaturedOnly) {
      results = results.filter((p) => p.isFeatured);
    }

    if (sortBy === 'name_asc') {
      results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'meals_per_10_dollars_desc') {
      results.sort((a, b) => {
        const av = typeof a.mealsPer10Dollars === 'number' ? a.mealsPer10Dollars : 0;
        const bv = typeof b.mealsPer10Dollars === 'number' ? b.mealsPer10Dollars : 0;
        return bv - av;
      });
    }

    const totalCount = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    const items = paged.map((p) => {
      const rp = this._resolveProgram(p, categories);
      const categoryName = rp.category ? rp.category.name : '';
      const primaryBeneficiaryLabel = this._mapBeneficiaryLabel(rp.primaryBeneficiary);
      const parts = [];
      if (rp.city) parts.push(rp.city);
      if (rp.state) parts.push(rp.state);
      if (rp.country) parts.push(rp.country);
      const locationLabel = parts.join(', ');
      const mealsPer10DollarsLabel =
        typeof rp.mealsPer10Dollars === 'number'
          ? `${rp.mealsPer10Dollars} meals / $10`
          : '';
      return {
        program: rp,
        categoryName,
        primaryBeneficiaryLabel,
        locationLabel,
        mealsPer10DollarsLabel
      };
    });

    return {
      programs: items,
      totalCount
    };
  }

  // --- getProgramDetail ---
  getProgramDetail(programId) {
    const programs = this._getFromStorage('programs', []);
    const categories = this._getFromStorage('program_categories', []);
    const programRaw = programs.find((p) => p.id === programId) || null;

    if (!programRaw) {
      return {
        program: null,
        category: null,
        impactMetrics: null,
        locationsServedLabel: '',
        recommendedOneTimeAmounts: [],
        recommendedMonthlyAmounts: [],
        allowedFrequencies: ['one_time', 'monthly', 'annual'],
        defaultBillingDayOfMonth: 1
      };
    }

    const program = this._resolveProgram(programRaw, categories);
    const category = program.category || null;

    const impactMetrics = {
      mealsPer10Dollars: program.mealsPer10Dollars || 0,
      mealsPer10DollarsLabel:
        typeof program.mealsPer10Dollars === 'number'
          ? `${program.mealsPer10Dollars} meals per $10`
          : '',
      costPerMeal: program.costPerMeal || null
    };

    const locParts = [];
    if (program.city) locParts.push(program.city);
    if (program.state) locParts.push(program.state);
    if (program.country) locParts.push(program.country);
    const locationsServedLabel = locParts.join(', ');

    const recommendedOneTimeAmounts = [25, 50, 75, 100];
    const recommendedMonthlyAmounts = [10, 25, 50];

    return {
      program,
      category,
      impactMetrics,
      locationsServedLabel,
      recommendedOneTimeAmounts,
      recommendedMonthlyAmounts,
      allowedFrequencies: ['one_time', 'monthly', 'annual'],
      defaultBillingDayOfMonth: 1
    };
  }

  // --- getDonatePageConfig ---
  getDonatePageConfig() {
    const programs = this._getFromStorage('programs', []);
    const categories = this._getFromStorage('program_categories', []);

    const generalCategory = categories.find((c) => c.code === 'general_support');
    let generalFundProgram = null;
    if (generalCategory) {
      const prog = programs.find(
        (p) => p.categoryId === generalCategory.id && p.isActive
      );
      if (prog) {
        generalFundProgram = {
          program: this._resolveProgram(prog, categories),
          displayName: prog.name
        };
      }
    }

    const suggestedOneTimeAmounts = [25, 50, 100];
    const suggestedMonthlyAmounts = [10, 25, 50];
    const multiProgramMaxAllocations = 10;

    const regionOptionsCodes = [
      'africa',
      'asia',
      'latin_america',
      'north_america',
      'europe',
      'middle_east',
      'global'
    ];
    const regionOptions = regionOptionsCodes.map((value) => ({
      value,
      label: this._mapRegionLabel(value)
    }));

    const programTypeCategories = categories.map((c) => ({ ...c }));

    return {
      generalFundProgram,
      suggestedOneTimeAmounts,
      suggestedMonthlyAmounts,
      multiProgramMaxAllocations,
      regionOptions,
      programTypeCategories
    };
  }

  // --- addProgramDonationToCart ---
  addProgramDonationToCart(
    programId,
    amount,
    frequency,
    billingDayOfMonth,
    description
  ) {
    if (!programId || typeof amount !== 'number' || amount <= 0) {
      return { success: false, message: 'Invalid program or amount', cart: null, items: [], totalAmount: 0 };
    }

    if (!['one_time', 'monthly', 'annual'].includes(frequency)) {
      return { success: false, message: 'Invalid frequency', cart: null, items: [], totalAmount: 0 };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const itemType = frequency === 'one_time' ? 'program_donation' : 'recurring_program_donation';

    const cartItem = {
      id: this._generateId('ci'),
      cartId: cart.id,
      itemType,
      programId,
      mealBundleId: null,
      familyId: null,
      amount,
      quantity: 1,
      frequency,
      billingDayOfMonth: frequency === 'one_time' ? null : (billingDayOfMonth || 1),
      description: description || ''
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const totalAmount = this._recalculateCartTotal(cart);
    const { items } = this._buildCartResponse(cart);

    return {
      success: true,
      message: 'Program donation added to cart',
      cart: { ...cart },
      items,
      totalAmount
    };
  }

  // --- createMultiProgramDonationInCart ---
  createMultiProgramDonationInCart(allocations, clearExistingProgramDonations = true) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    if (clearExistingProgramDonations) {
      cartItems = cartItems.filter(
        (ci) =>
          ci.cartId !== cart.id ||
          (ci.itemType !== 'program_donation' && ci.itemType !== 'recurring_program_donation')
      );
    }

    if (Array.isArray(allocations)) {
      allocations.forEach((alloc) => {
        if (!alloc || !alloc.programId || typeof alloc.amount !== 'number' || alloc.amount <= 0) {
          return;
        }
        const item = {
          id: this._generateId('ci'),
          cartId: cart.id,
          itemType: 'program_donation',
          programId: alloc.programId,
          mealBundleId: null,
          familyId: null,
          amount: alloc.amount,
          quantity: 1,
          frequency: 'one_time',
          billingDayOfMonth: null,
          description: alloc.description || ''
        };
        cartItems.push(item);
      });
    }

    this._saveToStorage('cart_items', cartItems);
    const totalAmount = this._recalculateCartTotal(cart);

    const { items } = this._buildCartResponse(cart);
    return {
      cart: { ...cart },
      items,
      totalAmount
    };
  }

  // --- getMealBundles ---
  getMealBundles() {
    const bundlesRaw = this._getFromStorage('meal_bundles', []);
    const bundles = bundlesRaw
      .filter((b) => b.isActive)
      .sort((a, b) => {
        const sa = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const sb = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        return sa - sb;
      })
      .map((b) => {
        const priceLabel = typeof b.price === 'number' ? `$${b.price.toFixed(2)}` : '';
        const mealsLabel = typeof b.mealsCount === 'number' ? `${b.mealsCount} meals` : '';
        return {
          bundle: { ...b },
          priceLabel,
          mealsLabel
        };
      });

    return { bundles };
  }

  // --- addMealBundleToCart ---
  addMealBundleToCart(mealBundleId, quantity = 1) {
    if (!mealBundleId || typeof quantity !== 'number' || quantity <= 0) {
      return { success: false, message: 'Invalid bundle or quantity', cart: null, items: [], totalAmount: 0 };
    }

    const cart = this._getOrCreateCart();
    const bundles = this._getFromStorage('meal_bundles', []);
    const bundle = bundles.find((b) => b.id === mealBundleId);
    if (!bundle) {
      return { success: false, message: 'Bundle not found', cart: null, items: [], totalAmount: 0 };
    }

    let cartItems = this._getFromStorage('cart_items', []);
    const existing = cartItems.find(
      (ci) => ci.cartId === cart.id && ci.itemType === 'meal_bundle' && ci.mealBundleId === mealBundleId
    );

    if (existing) {
      existing.quantity = (existing.quantity || 1) + quantity;
    } else {
      const item = {
        id: this._generateId('ci'),
        cartId: cart.id,
        itemType: 'meal_bundle',
        programId: null,
        mealBundleId,
        familyId: null,
        amount: bundle.price || 0,
        quantity,
        frequency: 'one_time',
        billingDayOfMonth: null,
        description: ''
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    const totalAmount = this._recalculateCartTotal(cart);
    const { items } = this._buildCartResponse(cart);

    return {
      success: true,
      message: 'Meal bundle added to cart',
      cart: { ...cart },
      items,
      totalAmount
    };
  }

  // --- searchFamilyProfiles ---
  searchFamilyProfiles(
    region,
    minChildrenCount,
    maxMonthlyCost,
    isAvailableOnly = true,
    page = 1,
    pageSize = 20
  ) {
    const families = this._getFromStorage('family_profiles', []);

    let results = families.slice();

    if (region) {
      results = results.filter((f) => f.region === region);
    }

    if (typeof minChildrenCount === 'number') {
      results = results.filter((f) => (f.childrenCount || 0) >= minChildrenCount);
    }

    if (typeof maxMonthlyCost === 'number') {
      results = results.filter((f) => (f.monthlyCost || 0) <= maxMonthlyCost);
    }

    if (isAvailableOnly) {
      results = results.filter((f) => f.isAvailableForSponsorship);
    }

    const totalCount = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    const items = paged.map((family) => {
      const parts = [];
      if (family.city) parts.push(family.city);
      if (family.country) parts.push(family.country);
      const locationLabel = parts.join(', ');
      const childrenLabel = `${family.childrenCount || 0} children`;
      const monthlyCostLabel = typeof family.monthlyCost === 'number'
        ? `$${family.monthlyCost.toFixed(2)} / month`
        : '';
      return {
        family: { ...family },
        locationLabel,
        childrenLabel,
        monthlyCostLabel
      };
    });

    return {
      families: items,
      totalCount
    };
  }

  // --- getFamilyDetail ---
  getFamilyDetail(familyId) {
    const families = this._getFromStorage('family_profiles', []);
    const familyRaw = families.find((f) => f.id === familyId) || null;

    if (!familyRaw) {
      return {
        family: null,
        locationLabel: '',
        householdSummary: '',
        impactDescription: '',
        recommendedMonthlyAmount: 0,
        minMonthlyAmount: 0,
        maxMonthlyAmount: 0,
        defaultBillingDayOfMonth: 1
      };
    }

    const family = { ...familyRaw };
    const parts = [];
    if (family.city) parts.push(family.city);
    if (family.country) parts.push(family.country);
    const locationLabel = parts.join(', ');

    const adults = typeof family.adultsCount === 'number' ? family.adultsCount : 0;
    const children = family.childrenCount || 0;
    const householdSummary = `${children} children, ${adults} adults`;

    const base = family.monthlyCost || 0;
    const recommendedMonthlyAmount = family.preferredMonthlyAmount || base;
    const minMonthlyAmount = base * 0.5;
    const maxMonthlyAmount = base * 2;

    const impactDescription = base
      ? `A monthly gift of around $${base.toFixed(0)} helps cover staple foods and school meals for this family.`
      : 'Your monthly sponsorship helps provide stable access to food for this family.';

    return {
      family,
      locationLabel,
      householdSummary,
      impactDescription,
      recommendedMonthlyAmount,
      minMonthlyAmount,
      maxMonthlyAmount,
      defaultBillingDayOfMonth: 1
    };
  }

  // --- addFamilySponsorshipToCart ---
  addFamilySponsorshipToCart(familyId, amount, billingDayOfMonth, description) {
    if (!familyId || typeof amount !== 'number' || amount <= 0) {
      return { success: false, message: 'Invalid family or amount', cart: null, items: [], totalAmount: 0 };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const cartItem = {
      id: this._generateId('ci'),
      cartId: cart.id,
      itemType: 'family_sponsorship',
      programId: null,
      mealBundleId: null,
      familyId,
      amount,
      quantity: 1,
      frequency: 'monthly',
      billingDayOfMonth: billingDayOfMonth || 1,
      description: description || ''
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    const totalAmount = this._recalculateCartTotal(cart);

    const { items } = this._buildCartResponse(cart);
    return {
      success: true,
      message: 'Family sponsorship added to cart',
      cart: { ...cart },
      items,
      totalAmount
    };
  }

  // --- searchVolunteerOpportunities ---
  searchVolunteerOpportunities(
    postalCode,
    distanceMiles,
    date,
    timeOfDay,
    activityType,
    page = 1,
    pageSize = 20
  ) {
    const opportunities = this._getFromStorage('volunteer_opportunities', []);
    const shifts = this._getFromStorage('volunteer_shifts', []);

    let opps = opportunities.filter((o) => o.isActive);

    if (activityType) {
      opps = opps.filter((o) => o.activityType === activityType);
    }

    // Location filtering: prefer geocode + lat/lng, fall back to postal equality
    let center = null;
    if (postalCode && typeof distanceMiles === 'number' && distanceMiles > 0) {
      center = this._geocodePostalCode(postalCode);
    }

    if (center && typeof center.latitude === 'number' && typeof center.longitude === 'number') {
      opps = opps.filter((o) => {
        if (typeof o.latitude !== 'number' || typeof o.longitude !== 'number') return false;
        const dist = this._haversineDistanceMiles(
          center.latitude,
          center.longitude,
          o.latitude,
          o.longitude
        );
        return dist <= distanceMiles;
      });
    } else if (postalCode) {
      opps = opps.filter((o) => (o.postalCode || '') === postalCode);
    }

    const dateFilter = date || null;
    const timeFilter = timeOfDay || null;

    const oppWithShifts = opps
      .map((o) => {
        const oppShifts = shifts.filter((s) => s.volunteerOpportunityId === o.id);
        const matchingShiftsRaw = this._findMatchingVolunteerShifts(
          oppShifts,
          dateFilter,
          timeFilter
        );
        const matchingShifts = matchingShiftsRaw.map((s) =>
          this._resolveVolunteerShift(s, opportunities)
        );
        const locationParts = [];
        if (o.addressLine1) locationParts.push(o.addressLine1);
        if (o.city) locationParts.push(o.city);
        if (o.state) locationParts.push(o.state);
        if (o.postalCode) locationParts.push(o.postalCode);
        const locationLabel = locationParts.join(', ');
        return {
          opportunity: { ...o },
          locationLabel,
          matchingShifts
        };
      })
      .filter((o) => o.matchingShifts.length > 0);

    const totalCount = oppWithShifts.length;
    const start = (page - 1) * pageSize;
    const paged = oppWithShifts.slice(start, start + pageSize);

    return {
      opportunities: paged,
      totalCount
    };
  }

  // --- getVolunteerOpportunityDetail ---
  getVolunteerOpportunityDetail(volunteerOpportunityId) {
    const opportunities = this._getFromStorage('volunteer_opportunities', []);
    const shifts = this._getFromStorage('volunteer_shifts', []);

    const oppRaw = opportunities.find((o) => o.id === volunteerOpportunityId) || null;

    if (!oppRaw) {
      return {
        opportunity: null,
        locationLabel: '',
        activityTypeLabel: '',
        shifts: []
      };
    }

    const locationParts = [];
    if (oppRaw.addressLine1) locationParts.push(oppRaw.addressLine1);
    if (oppRaw.city) locationParts.push(oppRaw.city);
    if (oppRaw.state) locationParts.push(oppRaw.state);
    if (oppRaw.postalCode) locationParts.push(oppRaw.postalCode);
    const locationLabel = locationParts.join(', ');

    const activityTypeLabel = this._mapActivityTypeLabel(oppRaw.activityType);

    const shiftsForOpp = shifts
      .filter((s) => s.volunteerOpportunityId === oppRaw.id)
      .map((s) => this._resolveVolunteerShift(s, opportunities));

    return {
      opportunity: { ...oppRaw },
      locationLabel,
      activityTypeLabel,
      shifts: shiftsForOpp
    };
  }

  // --- registerForVolunteerShift ---
  registerForVolunteerShift(volunteerShiftId, fullName, email, groupSize) {
    const shifts = this._getFromStorage('volunteer_shifts', []);
    const opportunities = this._getFromStorage('volunteer_opportunities', []);
    const registrations = this._getFromStorage('volunteer_registrations', []);

    const shiftIdx = shifts.findIndex((s) => s.id === volunteerShiftId);
    if (shiftIdx === -1) {
      return {
        registration: null,
        shift: null,
        opportunity: null,
        confirmationMessage: 'Shift not found'
      };
    }

    const shift = shifts[shiftIdx];
    const opportunity = opportunities.find((o) => o.id === shift.volunteerOpportunityId) || null;

    let status = 'confirmed';
    if (typeof shift.spotsRemaining === 'number') {
      if (groupSize > shift.spotsRemaining) {
        status = 'waitlisted';
      } else {
        shift.spotsRemaining = shift.spotsRemaining - groupSize;
        shifts[shiftIdx] = shift;
        this._saveToStorage('volunteer_shifts', shifts);
      }
    }

    const registration = {
      id: this._generateId('volreg'),
      volunteerShiftId,
      fullName,
      email,
      groupSize,
      registrationDateTime: this._nowIso(),
      status
    };

    registrations.push(registration);
    this._saveToStorage('volunteer_registrations', registrations);

    const resolvedRegistration = {
      ...registration,
      volunteerShift: this._resolveVolunteerShift(shift, opportunities)
    };

    const confirmationMessage =
      status === 'confirmed'
        ? 'Your volunteer shift is confirmed.'
        : 'The shift is full; you have been added to the waitlist.';

    return {
      registration: resolvedRegistration,
      shift: this._resolveVolunteerShift(shift, opportunities),
      opportunity,
      confirmationMessage
    };
  }

  // --- getFundraisingLandingContent ---
  getFundraisingLandingContent() {
    const content = this._getFromStorage('fundraising_landing_content', {
      introText: '',
      howItWorksSteps: []
    });

    const campaignsRaw = this._getFromStorage('campaigns', []);
    const coverImages = this._getFromStorage('cover_images', []);
    const storiesRaw = this._getFromStorage('stories', []);

    const featuredCampaigns = campaignsRaw
      .filter((c) => c.isActive)
      .map((c) => this._resolveCampaign(c, coverImages));

    const successStories = storiesRaw
      .filter((s) => s.isPublished)
      .map((s) => this._resolveStory(s, coverImages));

    return {
      introText: content.introText || '',
      howItWorksSteps: Array.isArray(content.howItWorksSteps) ? content.howItWorksSteps : [],
      featuredCampaigns,
      successStories
    };
  }

  // --- getFundraiserCreationOptions ---
  getFundraiserCreationOptions() {
    const campaignsRaw = this._getFromStorage('campaigns', []);
    const coverImagesRaw = this._getFromStorage('cover_images', []);

    const campaigns = campaignsRaw.filter((c) => c.isActive).map((c) => ({ ...c }));
    const coverImages = coverImagesRaw
      .filter((img) => img.isActive && img.usageType === 'fundraiser_cover')
      .map((img) => ({ ...img }));

    return {
      campaigns,
      coverImages
    };
  }

  // --- createFundraiser ---
  createFundraiser(campaignId, title, goalAmount, story, coverImageId) {
    const campaigns = this._getFromStorage('campaigns', []);
    const coverImages = this._getFromStorage('cover_images', []);
    const fundraisers = this._getFromStorage('fundraisers', []);

    const campaign = campaigns.find((c) => c.id === campaignId) || null;
    if (!campaign) {
      return {
        fundraiser: null,
        shareUrl: '',
        confirmationMessage: 'Campaign not found'
      };
    }

    const now = this._nowIso();
    const id = this._generateId('fund');
    const shareUrl = `/fundraisers/${id}`;

    const fundraiser = {
      id,
      campaignId,
      title,
      goalAmount,
      story: story || '',
      coverImageId: coverImageId || campaign.defaultCoverImageId || null,
      status: 'published',
      shareUrl,
      createdAt: now,
      updatedAt: now,
      amountRaised: 0
    };

    fundraisers.push(fundraiser);
    this._saveToStorage('fundraisers', fundraisers);

    const resolvedFundraiser = this._resolveFundraiser(fundraiser, campaigns, coverImages);

    return {
      fundraiser: resolvedFundraiser,
      shareUrl,
      confirmationMessage: 'Your fundraising page has been created.'
    };
  }

  // --- getStoriesFilterOptions ---
  getStoriesFilterOptions() {
    const categories = [
      { value: 'community_gardens', label: 'Community Gardens' },
      { value: 'school_meals', label: 'School Meals' },
      { value: 'emergency_relief', label: 'Emergency Relief' },
      { value: 'volunteer_spotlight', label: 'Volunteer Spotlight' },
      { value: 'family_sponsorship', label: 'Family Sponsorship' },
      { value: 'organizational_news', label: 'Organizational News' }
    ];

    const dateRangePresets = [
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_6_months', label: 'Last 6 months' },
      { value: 'last_12_months', label: 'Last 12 months' },
      { value: 'all_time', label: 'All time' }
    ];

    return {
      categories,
      dateRangePresets
    };
  }

  // --- searchStories ---
  searchStories(
    category,
    dateRangePreset,
    publishedFrom,
    publishedTo,
    page = 1,
    pageSize = 20
  ) {
    const storiesRaw = this._getFromStorage('stories', []);
    const coverImages = this._getFromStorage('cover_images', []);

    let stories = storiesRaw.filter((s) => s.isPublished);

    if (category) {
      stories = stories.filter((s) => s.category === category);
    }

    let fromDate = null;
    let toDate = null;
    const now = new Date();

    if (dateRangePreset && dateRangePreset !== 'all_time') {
      if (dateRangePreset === 'last_30_days') {
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (dateRangePreset === 'last_6_months') {
        fromDate = new Date(now);
        fromDate.setMonth(fromDate.getMonth() - 6);
      } else if (dateRangePreset === 'last_12_months') {
        fromDate = new Date(now);
        fromDate.setMonth(fromDate.getMonth() - 12);
      }
      toDate = now;
    }

    if (publishedFrom) {
      fromDate = new Date(publishedFrom + 'T00:00:00.000Z');
    }
    if (publishedTo) {
      toDate = new Date(publishedTo + 'T23:59:59.999Z');
    }

    if (fromDate) {
      const fromIso = fromDate.toISOString();
      stories = stories.filter((s) => s.publishedAt >= fromIso);
    }
    if (toDate) {
      const toIso = toDate.toISOString();
      stories = stories.filter((s) => s.publishedAt <= toIso);
    }

    stories.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

    const totalCount = stories.length;
    const start = (page - 1) * pageSize;
    const paged = stories.slice(start, start + pageSize);

    const items = paged.map((s) => {
      const rs = this._resolveStory(s, coverImages);
      const categoryLabel = this._mapStoryCategoryLabel(rs.category);
      const publishedDateLabel = this._toDateOnly(rs.publishedAt) || '';
      return {
        story: rs,
        categoryLabel,
        publishedDateLabel
      };
    });

    return {
      stories: items,
      totalCount
    };
  }

  // --- getStoryDetail ---
  getStoryDetail(storyId) {
    const stories = this._getFromStorage('stories', []);
    const coverImages = this._getFromStorage('cover_images', []);

    const storyRaw = stories.find((s) => s.id === storyId) || null;

    if (!storyRaw) {
      return {
        story: null,
        featuredImage: null,
        categoryLabel: '',
        publishedDateLabel: '',
        shareUrl: ''
      };
    }

    const story = this._resolveStory(storyRaw, coverImages);
    const featuredImage = story.featuredImage || null;
    const categoryLabel = this._mapStoryCategoryLabel(story.category);
    const publishedDateLabel = this._toDateOnly(story.publishedAt) || '';
    const shareUrl = story.shareUrl || `/stories/${story.id}`;

    return {
      story,
      featuredImage,
      categoryLabel,
      publishedDateLabel,
      shareUrl
    };
  }

  // --- subscribeToNewsletterFromStory ---
  subscribeToNewsletterFromStory(storyId, fullName, email, monthlyImpactUpdates = false) {
    const stories = this._getFromStorage('stories', []);
    const subs = this._getFromStorage('newsletter_subscriptions', []);

    const story = stories.find((s) => s.id === storyId) || null;
    if (!story) {
      return {
        subscription: null,
        confirmationMessage: 'Story not found'
      };
    }

    const subscription = {
      id: this._generateId('nl'),
      fullName,
      email,
      monthlyImpactUpdates: !!monthlyImpactUpdates,
      createdAt: this._nowIso(),
      source: 'story_page',
      sourceStoryId: storyId
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    const resolvedSubscription = this._resolveNewsletterSubscription(subscription, stories);

    return {
      subscription: resolvedSubscription,
      confirmationMessage: 'You have been subscribed to our newsletter.'
    };
  }

  // --- getEventsFilterOptions ---
  getEventsFilterOptions() {
    const topicCategories = [
      { value: 'hunger_awareness', label: 'Hunger Awareness' },
      { value: 'education_awareness', label: 'Education & Awareness' },
      { value: 'fundraising_event', label: 'Fundraising Event' },
      { value: 'volunteer_training', label: 'Volunteer Training' },
      { value: 'community_event', label: 'Community Event' },
      { value: 'other', label: 'Other' }
    ];

    const timeOfDayOptions = [
      { value: 'morning_9_12', label: 'Morning (9 AM – 12 PM)' },
      { value: 'afternoon_12_5', label: 'Afternoon (12 PM – 5 PM)' },
      { value: 'evening_5_9', label: 'Evening (5 PM – 9 PM)' },
      { value: 'full_day', label: 'Full Day' },
      { value: 'other', label: 'Other' }
    ];

    const costTypeOptions = [
      { value: 'free', label: 'Free' },
      { value: 'paid', label: 'Paid' },
      { value: 'donation_optional', label: 'Donation Optional' }
    ];

    return {
      topicCategories,
      timeOfDayOptions,
      costTypeOptions
    };
  }

  // --- searchEvents ---
  searchEvents(
    month,
    timeOfDay,
    topicCategory,
    costType,
    page = 1,
    pageSize = 20
  ) {
    const eventsRaw = this._getFromStorage('events', []);

    let events = eventsRaw.filter((e) => e.isActive);

    if (month) {
      // month in 'yyyy-mm'
      events = events.filter((e) => {
        const d = new Date(e.startDateTime);
        const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        return ym === month;
      });
    }

    if (timeOfDay) {
      events = events.filter((e) => e.timeOfDay === timeOfDay);
    }

    if (topicCategory) {
      events = events.filter((e) => e.topicCategory === topicCategory);
    }

    if (costType) {
      events = events.filter((e) => e.costType === costType);
    }

    events.sort((a, b) => (a.startDateTime > b.startDateTime ? 1 : -1));

    const totalCount = events.length;
    const start = (page - 1) * pageSize;
    const paged = events.slice(start, start + pageSize);

    const items = paged.map((ev) => {
      const dateLabel = this._toDateOnly(ev.startDateTime) || '';
      const timeLabel = this._mapTimeOfDayLabel(ev.timeOfDay);
      const locationParts = [];
      if (ev.addressLine1) locationParts.push(ev.addressLine1);
      if (ev.city) locationParts.push(ev.city);
      if (ev.state) locationParts.push(ev.state);
      if (ev.postalCode) locationParts.push(ev.postalCode);
      const locationLabel = ev.isVirtual ? 'Online' : locationParts.join(', ');
      const costLabel = this._mapCostTypeLabel(ev.costType);
      return {
        event: this._resolveEvent(ev),
        dateLabel,
        timeLabel,
        locationLabel,
        costLabel
      };
    });

    return {
      events: items,
      totalCount
    };
  }

  // --- getEventDetail ---
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const eventRaw = events.find((e) => e.id === eventId) || null;

    if (!eventRaw) {
      return {
        event: null,
        dateLabel: '',
        timeLabel: '',
        locationLabel: '',
        costLabel: '',
        logisticsNotes: ''
      };
    }

    const dateLabel = this._toDateOnly(eventRaw.startDateTime) || '';
    const timeLabel = this._mapTimeOfDayLabel(eventRaw.timeOfDay);
    const locationParts = [];
    if (eventRaw.addressLine1) locationParts.push(eventRaw.addressLine1);
    if (eventRaw.city) locationParts.push(eventRaw.city);
    if (eventRaw.state) locationParts.push(eventRaw.state);
    if (eventRaw.postalCode) locationParts.push(eventRaw.postalCode);
    const locationLabel = eventRaw.isVirtual ? 'Online' : locationParts.join(', ');
    const costLabel = this._mapCostTypeLabel(eventRaw.costType);

    const logisticsNotes = eventRaw.isVirtual
      ? 'This is a virtual event. Connection details will be emailed after registration.'
      : 'Please arrive 10–15 minutes early for check-in. Detailed directions will be emailed after registration.';

    return {
      event: this._resolveEvent(eventRaw),
      dateLabel,
      timeLabel,
      locationLabel,
      costLabel,
      logisticsNotes
    };
  }

  // --- registerForEvent ---
  registerForEvent(eventId, fullName, email, quantity) {
    const events = this._getFromStorage('events', []);
    const regs = this._getFromStorage('event_registrations', []);

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        registration: null,
        event: null,
        confirmationMessage: 'Event not found'
      };
    }

    const registration = {
      id: this._generateId('evreg'),
      eventId,
      fullName,
      email,
      quantity,
      registrationDateTime: this._nowIso(),
      status: 'confirmed'
    };

    regs.push(registration);
    this._saveToStorage('event_registrations', regs);

    const resolvedRegistration = {
      ...registration,
      event: this._resolveEvent(event)
    };

    return {
      registration: resolvedRegistration,
      event: this._resolveEvent(event),
      confirmationMessage: 'You are registered for this event.'
    };
  }

  // --- getDonationCart ---
  getDonationCart() {
    const cart = this._getOpenCart();
    const res = this._buildCartResponse(cart);
    return res;
  }

  // --- updateCartItemQuantity ---
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      const cart = this._getOpenCart();
      const res = this._buildCartResponse(cart);
      return {
        cart: res.cart,
        items: res.items,
        totalAmount: res.totalAmount
      };
    }

    const item = cartItems[idx];
    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      item.quantity = quantity;
      cartItems[idx] = item;
    }

    this._saveToStorage('cart_items', cartItems);
    const cart = this._getOpenCart();
    if (cart) {
      this._recalculateCartTotal(cart);
    }

    const res = this._buildCartResponse(cart);
    return {
      cart: res.cart,
      items: res.items,
      totalAmount: res.totalAmount
    };
  }

  // --- updateCartItemAmount ---
  updateCartItemAmount(cartItemId, amount, frequency, billingDayOfMonth) {
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      const cart = this._getOpenCart();
      const res = this._buildCartResponse(cart);
      return {
        cart: res.cart,
        items: res.items,
        totalAmount: res.totalAmount
      };
    }

    const item = cartItems[idx];
    if (typeof amount === 'number' && amount > 0) {
      item.amount = amount;
    }
    if (frequency) {
      item.frequency = frequency;
    }
    if (typeof billingDayOfMonth === 'number') {
      item.billingDayOfMonth = billingDayOfMonth;
    }

    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOpenCart();
    if (cart) {
      this._recalculateCartTotal(cart);
    }

    const res = this._buildCartResponse(cart);
    return {
      cart: res.cart,
      items: res.items,
      totalAmount: res.totalAmount
    };
  }

  // --- removeCartItem ---
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx !== -1) {
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);
    }

    const cart = this._getOpenCart();
    if (cart) {
      this._recalculateCartTotal(cart);
    }

    const res = this._buildCartResponse(cart);
    return {
      cart: res.cart,
      items: res.items,
      totalAmount: res.totalAmount
    };
  }

  // --- getCheckoutSummary ---
  getCheckoutSummary() {
    const cart = this._getOpenCart();
    if (!cart) {
      return {
        cart: null,
        lineItems: [],
        recurringPreview: [],
        totalAmount: 0,
        supportedPaymentMethods: ['credit_card', 'bank_transfer', 'paypal', 'other']
      };
    }

    const allItems = this._getFromStorage('cart_items', []);
    const cartItems = allItems.filter((ci) => ci.cartId === cart.id);
    const lineItems = cartItems.map((ci) => this._buildCartItemView(ci));
    const recurringPreview = this._buildRecurringDonationPreviews(cartItems);

    return {
      cart: { ...cart },
      lineItems,
      recurringPreview,
      totalAmount: cart.totalAmount || 0,
      supportedPaymentMethods: ['credit_card', 'bank_transfer', 'paypal', 'other']
    };
  }

  // --- completeCheckout ---
  completeCheckout(donorFullName, donorEmail, paymentMethod, paymentDetails) {
    const allowedMethods = ['credit_card', 'bank_transfer', 'paypal', 'other'];
    if (!allowedMethods.includes(paymentMethod)) {
      return {
        success: false,
        order: null,
        allocations: [],
        recurringDonations: [],
        confirmationMessage: 'Unsupported payment method'
      };
    }

    const cart = this._getOpenCart();
    if (!cart) {
      return {
        success: false,
        order: null,
        allocations: [],
        recurringDonations: [],
        confirmationMessage: 'No open cart to checkout'
      };
    }

    const allItems = this._getFromStorage('cart_items', []);
    const cartItems = allItems.filter((ci) => ci.cartId === cart.id);

    const orders = this._getFromStorage('donation_orders', []);
    const allocationsRaw = this._getFromStorage('donation_allocations', []);
    const recurringRaw = this._getFromStorage('recurring_donations', []);

    const now = this._nowIso();
    const orderId = this._generateId('order');

    const order = {
      id: orderId,
      cartId: cart.id,
      totalAmount: cart.totalAmount || 0,
      currency: 'USD',
      paymentMethod,
      status: 'completed',
      createdAt: now,
      completedAt: now,
      donorFullName: donorFullName || '',
      donorEmail: donorEmail || ''
    };

    orders.push(order);
    this._saveToStorage('donation_orders', orders);

    const programs = this._getFromStorage('programs', []);
    const bundles = this._getFromStorage('meal_bundles', []);
    const families = this._getFromStorage('family_profiles', []);

    const newRecurring = [];

    const allocations = cartItems.map((item) => {
      let allocationType = 'program';
      let programId = null;
      let mealBundleId = null;
      let familyId = null;
      let quantity = null;
      let amount = item.amount || 0;
      let recurringDonationId = null;

      if (item.itemType === 'meal_bundle') {
        allocationType = 'meal_bundle';
        mealBundleId = item.mealBundleId;
        quantity = item.quantity || 1;
        amount = (item.amount || 0) * (item.quantity || 1);
      } else if (item.itemType === 'family_sponsorship') {
        allocationType = 'family';
        familyId = item.familyId;
      } else {
        allocationType = 'program';
        programId = item.programId;
      }

      if (item.frequency === 'monthly' || item.frequency === 'annual') {
        const rdId = this._generateId('rec');
        const rd = {
          id: rdId,
          targetType: item.familyId ? 'family' : 'program',
          programId: item.familyId ? null : item.programId,
          familyId: item.familyId ? item.familyId : null,
          amount: item.amount || 0,
          currency: 'USD',
          frequency: item.frequency,
          billingDayOfMonth: item.billingDayOfMonth || 1,
          startDate: now,
          nextChargeDate: null,
          status: 'active',
          description: item.description || ''
        };

        // Simple nextChargeDate: next occurrence of billingDayOfMonth
        const today = new Date();
        const next = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
        const day = rd.billingDayOfMonth;
        next.setUTCDate(day);
        if (next < today) {
          if (item.frequency === 'monthly') {
            next.setUTCMonth(next.getUTCMonth() + 1);
          } else if (item.frequency === 'annual') {
            next.setUTCFullYear(next.getUTCFullYear() + 1);
          }
        }
        rd.nextChargeDate = next.toISOString();

        recurringRaw.push(rd);
        newRecurring.push(rd);
        recurringDonationId = rdId;
      }

      const allocation = {
        id: this._generateId('alloc'),
        orderId,
        allocationType,
        programId,
        mealBundleId,
        familyId,
        recurringDonationId,
        amount,
        quantity,
        description: item.description || ''
      };

      allocationsRaw.push(allocation);
      return allocation;
    });

    this._saveToStorage('donation_allocations', allocationsRaw);
    this._saveToStorage('recurring_donations', recurringRaw);

    // Mark cart as checked_out
    const carts = this._getFromStorage('donation_carts', []);
    const cartIdx = carts.findIndex((c) => c.id === cart.id);
    if (cartIdx !== -1) {
      carts[cartIdx].status = 'checked_out';
      carts[cartIdx].updatedAt = now;
      this._saveToStorage('donation_carts', carts);
    }

    const resolvedOrder = this._resolveDonationOrder(order, carts);
    const resolvedAllocations = allocations.map((a) =>
      this._resolveDonationAllocation(a, programs, bundles, families, recurringRaw)
    );
    const resolvedRecurring = newRecurring.map((r) =>
      this._resolveRecurringDonation(r, programs, families)
    );

    return {
      success: true,
      order: resolvedOrder,
      allocations: resolvedAllocations,
      recurringDonations: resolvedRecurring,
      confirmationMessage: 'Thank you for your donation.'
    };
  }

  // --- getAboutPageContent ---
  getAboutPageContent() {
    // Not specified in data model; keep minimal and stored via localStorage if customized externally.
    const existing = this._getFromStorage('about_page_content', null);
    if (existing) {
      return existing;
    }
    const defaultContent = {
      mission: '',
      history: '',
      approach: '',
      contactInfo: {
        email: '',
        phone: '',
        address: ''
      },
      policySummaries: {
        privacy: '',
        termsOfUse: ''
      }
    };
    this._saveToStorage('about_page_content', defaultContent);
    return defaultContent;
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
