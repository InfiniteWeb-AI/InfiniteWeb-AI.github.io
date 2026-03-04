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
  }

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const keys = [
      'coaching_offers',
      'coaching_session_bookings',
      'coaching_program_applications',
      'speaking_packages',
      'speaking_quote_requests',
      'events',
      'event_registrations',
      'blog_articles',
      'reading_lists',
      'reading_list_items',
      'resources',
      'resource_access_requests',
      'newsletter_subscriptions',
      'testimonials',
      'case_studies',
      'case_study_service_usages',
      'package_estimates',
      'package_estimate_items',
      'service_inquiries',
      'faq_items',
      'contact_messages',
      'coaching_listing_states',
      'speaking_listing_states',
      'events_listing_states',
      'blog_listing_states',
      'resources_listing_states',
      'testimonials_listing_states',
      'faq_search_states'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    // custom package draft stored as single object when needed
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
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // -------------------- Generic helpers --------------------

  _applyListFiltersAndSorting(items, options) {
    let result = Array.isArray(items) ? items.slice() : [];
    if (options && Array.isArray(options.filters)) {
      options.filters.forEach((fn) => {
        if (typeof fn === 'function') {
          result = result.filter(fn);
        }
      });
    }
    if (options && typeof options.sort === 'function') {
      result = result.slice().sort(options.sort);
    }
    return result;
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _daysBetween(start, end) {
    const ms = end.getTime() - start.getTime();
    return ms / (1000 * 60 * 60 * 24);
  }

  // -------------------- Mapping helpers --------------------

  _mapPersonaToLabel(persona) {
    switch (persona) {
      case 'entrepreneur_founder':
        return 'Entrepreneur / Founder';
      case 'solopreneur_freelancer':
        return 'Solopreneur / Freelancer';
      case 'corporate_leader':
        return 'Corporate Leader';
      case 'job_seeker':
        return 'Job Seeker';
      case 'executive':
        return 'Executive';
      default:
        return 'Other';
    }
  }

  _mapSessionTypeToLabel(type) {
    switch (type) {
      case 'introductory':
        return 'Introductory Session';
      case 'first_time_session':
        return 'First-time Session';
      case 'ongoing':
        return 'Ongoing Coaching';
      case 'program':
        return 'Program';
      default:
        return '';
    }
  }

  _mapDurationToLabel(durationValue, durationUnit, sessionLengthMinutes) {
    if (durationValue && durationUnit) {
      const unitLabel = durationUnit.replace('_', ' ');
      return durationValue + ' ' + unitLabel;
    }
    if (sessionLengthMinutes) {
      return sessionLengthMinutes + ' minutes';
    }
    return '';
  }

  _mapFormatToLabel(format) {
    switch (format) {
      case 'virtual':
        return 'Virtual';
      case 'in_person':
        return 'In-person';
      case 'hybrid':
        return 'Hybrid';
      default:
        return '';
    }
  }

  _mapEventTopicToLabel(topic) {
    switch (topic) {
      case 'personal_branding':
        return 'Personal Branding';
      case 'linkedin':
        return 'LinkedIn';
      case 'thought_leadership':
        return 'Thought Leadership';
      case 'public_speaking':
        return 'Public Speaking';
      default:
        return 'Other';
    }
  }

  _mapFeeLabel(baseFee, currency) {
    if (typeof baseFee !== 'number') return '';
    const symbol = currency === 'usd' ? '$' : '';
    return symbol + baseFee.toFixed(0);
  }

  _mapAudienceSizeLabel(min, max) {
    if (min && max) return min + '–' + max + ' attendees';
    if (!min && max) return 'Up to ' + max + ' attendees';
    if (min && !max) return min + '+ attendees';
    return 'Custom audience size';
  }

  _mapResourceFormatLabel(format) {
    switch (format) {
      case 'pdf':
        return 'PDF';
      case 'spreadsheet':
        return 'Spreadsheet';
      case 'video':
        return 'Video';
      case 'webpage':
        return 'Web page';
      default:
        return 'Other';
    }
  }

  _formatIsoDate(iso) {
    const d = this._parseDate(iso);
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  _formatIsoTime(iso) {
    const d = this._parseDate(iso);
    if (!d) return '';
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }

  // -------------------- Foreign key resolution helpers --------------------

  _resolveTestimonials(testimonials) {
    const caseStudies = this._getFromStorage('case_studies');
    return testimonials.map((t) => ({
      ...t,
      caseStudy: t.caseStudyId
        ? caseStudies.find((c) => c.id === t.caseStudyId) || null
        : null
    }));
  }

  _resolveCaseStudies(caseStudies) {
    const coachingOffers = this._getFromStorage('coaching_offers');
    const speakingPackages = this._getFromStorage('speaking_packages');
    return caseStudies.map((cs) => {
      let primaryService = null;
      if (cs.primaryServiceType === 'coaching_offer') {
        primaryService = coachingOffers.find((o) => o.id === cs.primaryServiceId) || null;
      } else if (cs.primaryServiceType === 'speaking_package') {
        primaryService = speakingPackages.find((p) => p.id === cs.primaryServiceId) || null;
      }
      return {
        ...cs,
        primaryService
      };
    });
  }

  _resolveCaseStudyServiceUsages(usages) {
    const caseStudies = this._getFromStorage('case_studies');
    const coachingOffers = this._getFromStorage('coaching_offers');
    const speakingPackages = this._getFromStorage('speaking_packages');
    return usages.map((u) => {
      const caseStudy = caseStudies.find((cs) => cs.id === u.caseStudyId) || null;
      let coachingOffer = null;
      let speakingPackage = null;
      if (u.serviceType === 'coaching_offer') {
        coachingOffer = coachingOffers.find((o) => o.id === u.serviceId) || null;
      } else if (u.serviceType === 'speaking_package') {
        speakingPackage = speakingPackages.find((p) => p.id === u.serviceId) || null;
      }
      return {
        ...u,
        caseStudy,
        coachingOffer,
        speakingPackage
      };
    });
  }

  _resolvePackageEstimateItems(items) {
    const estimates = this._getFromStorage('package_estimates');
    const coachingOffers = this._getFromStorage('coaching_offers');
    const speakingPackages = this._getFromStorage('speaking_packages');
    return items.map((it) => {
      const packageEstimate = it.packageEstimateId
        ? estimates.find((e) => e.id === it.packageEstimateId) || null
        : null;
      let item = null;
      if (it.itemType === 'coaching_offer') {
        item = coachingOffers.find((o) => o.id === it.itemId) || null;
      } else if (it.itemType === 'speaking_package') {
        item = speakingPackages.find((p) => p.id === it.itemId) || null;
      }
      return {
        ...it,
        packageEstimate,
        item
      };
    });
  }

  // -------------------- Reading list helpers --------------------

  _getOrCreateReadingList() {
    let lists = this._getFromStorage('reading_lists');
    if (lists.length > 0) return lists[0];
    const newList = {
      id: this._generateId('reading_list'),
      name: 'My Reading List',
      createdAt: this._nowIso()
    };
    lists.push(newList);
    this._saveToStorage('reading_lists', lists);
    return newList;
  }

  // -------------------- Custom package draft helpers --------------------

  _getOrCreateCustomPackageDraft() {
    const raw = localStorage.getItem('custom_package_draft');
    if (raw) {
      try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object' && Array.isArray(obj.items)) {
          return obj;
        }
      } catch (e) {}
    }
    const draft = {
      items: [],
      totalPrice: 0,
      currency: 'usd'
    };
    localStorage.setItem('custom_package_draft', JSON.stringify(draft));
    return draft;
  }

  _saveCustomPackageDraft(draft) {
    localStorage.setItem('custom_package_draft', JSON.stringify(draft));
  }

  _recalculateCustomPackageTotals(draft) {
    let total = 0;
    draft.items.forEach((item) => {
      item.subtotal = item.unitPrice * item.quantity;
      total += item.subtotal;
    });
    draft.totalPrice = total;
    return draft;
  }

  _clearCustomPackageDraft() {
    const draft = {
      items: [],
      totalPrice: 0,
      currency: 'usd'
    };
    this._saveCustomPackageDraft(draft);
    return draft;
  }

  // ============================================================
  // Interface: getHomePageData
  // ============================================================

  getHomePageData() {
    // Hero content is static business copy; entities still come from storage
    const heroTitle = 'Clarify your personal brand. Lead with confidence.';
    const heroSubtitle = 'Coaching, keynotes, and practical resources for entrepreneurs and leaders building a standout presence.';
    const primaryCtaLabel = 'Book your intro session';

    // Featured introductory coaching offer: 60-min, introductory, <= 250
    const coachingSearch = this.searchCoachingOffers(
      'single_sessions',
      60,
      'introductory',
      250,
      null,
      null,
      null,
      'price_low_to_high'
    );
    const featuredOffer = coachingSearch.offers && coachingSearch.offers.length > 0
      ? coachingSearch.offers[0]
      : null;

    const primaryCtaCoachingOfferId = featuredOffer ? featuredOffer.id : null;

    const featuredIntroCoachingOffer = featuredOffer
      ? {
          offer: featuredOffer,
          highlightReason: 'Best place to start'
        }
      : {
          offer: null,
          highlightReason: ''
        };

    // Highlighted free webinar within next 60 days
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 60);
    const eventsResult = this.searchEvents(
      'webinar',
      'free',
      null,
      start.toISOString(),
      end.toISOString(),
      'date_earliest_first'
    );
    const webinar = eventsResult.events && eventsResult.events.length > 0
      ? eventsResult.events[0]
      : null;

    const highlightedFreeWebinar = webinar
      ? {
          eventId: webinar.id,
          title: webinar.title,
          startDateTime: webinar.startDateTime,
          topicLabel: this._mapEventTopicToLabel(webinar.topic),
          isWithin60Days: true,
          event: webinar
        }
      : {
          eventId: null,
          title: null,
          startDateTime: null,
          topicLabel: null,
          isWithin60Days: false,
          event: null
        };

    // Highlighted starter toolkit for entrepreneurs
    const resourcesResult = this.searchResources('free_tools', 'guides_toolkits', 'entrepreneur_founder');
    let starter = null;
    if (resourcesResult.highlightedStarterToolkitId) {
      starter = resourcesResult.resources.find(
        (r) => r.id === resourcesResult.highlightedStarterToolkitId
      ) || null;
    }
    if (!starter && resourcesResult.resources && resourcesResult.resources.length > 0) {
      starter = resourcesResult.resources.find((r) => {
        return (
          typeof r.title === 'string' &&
          r.title.toLowerCase().indexOf('starter toolkit') !== -1
        );
      }) || resourcesResult.resources[0];
    }

    const highlightedStarterToolkit = starter
      ? {
          resourceId: starter.id,
          title: starter.title,
          tagline: starter.description || '',
          isFree: starter.priceType === 'free',
          targetPersonaLabel: this._mapPersonaToLabel(starter.targetPersona),
          resource: starter
        }
      : {
          resourceId: null,
          title: null,
          tagline: '',
          isFree: false,
          targetPersonaLabel: '',
          resource: null
        };

    const navigationSections = [
      {
        sectionKey: 'coaching',
        title: '1:1 Coaching',
        description: 'Deep-dive personal brand coaching tailored to your goals.'
      },
      {
        sectionKey: 'programs',
        title: 'Coaching Programs',
        description: 'Structured multi-month programs to accelerate your visibility.'
      },
      {
        sectionKey: 'speaking',
        title: 'Speaking & Keynotes',
        description: 'Virtual and in-person talks for your team or conference.'
      },
      {
        sectionKey: 'events',
        title: 'Events & Webinars',
        description: 'Live sessions to sharpen your personal brand skills.'
      },
      {
        sectionKey: 'resources',
        title: 'Resources',
        description: 'Free toolkits and practical guides to get you started.'
      },
      {
        sectionKey: 'results',
        title: 'Client Results',
        description: 'Stories and testimonials from founders and teams.'
      }
    ];

    return {
      heroTitle,
      heroSubtitle,
      primaryCtaLabel,
      primaryCtaCoachingOfferId,
      primaryCtaCoachingOffer: featuredOffer || null,
      navigationSections,
      featuredIntroCoachingOffer,
      highlightedFreeWebinar,
      highlightedStarterToolkit
    };
  }

  // ============================================================
  // Interface: getAboutPageData
  // ============================================================

  getAboutPageData() {
    const founderName = 'Your Coach';
    const founderStory =
      'After a decade helping founders and leaders clarify how they show up online and onstage, I created this practice to offer practical, no-fluff support for personal brands.';

    const credentials = [
      {
        label: '10+ years in brand strategy',
        description: 'Worked with founders, executives, and startup teams across multiple industries.'
      },
      {
        label: 'Global keynote speaker',
        description: 'Delivered talks for audiences from 20 to 2,000+ across virtual and in-person stages.'
      }
    ];

    const experienceSegments = [
      {
        personaKey: 'entrepreneurs',
        summary: 'Helps founders articulate a clear, compelling founder story that investors and clients remember.'
      },
      {
        personaKey: 'solopreneurs',
        summary: 'Supports consultants and freelancers in packaging their expertise into a focused brand.'
      },
      {
        personaKey: 'tech_clients',
        summary: 'Partners with high-growth tech companies on leadership visibility and thought leadership.'
      }
    ];

    // Optionally point to an existing speaking package or case study if present
    const speakingPackages = this._getFromStorage('speaking_packages');
    const caseStudies = this._getFromStorage('case_studies');
    const firstPackage = speakingPackages[0] || null;
    const firstCaseStudy = caseStudies[0] || null;

    const speakingHighlights = [
      {
        title: 'Signature personal brand keynote',
        description: 'A practical, story-driven talk on building a visible, authentic personal brand.',
        relatedSpeakingPackageId: firstPackage ? firstPackage.id : null,
        relatedCaseStudyId: null
      },
      {
        title: 'Leadership visibility for scaling teams',
        description: 'Interactive session for leadership teams on showing up consistently and credibly.',
        relatedSpeakingPackageId: null,
        relatedCaseStudyId: firstCaseStudy ? firstCaseStudy.id : null
      }
    ];

    const mediaMentions = [
      {
        outletName: 'Business Press',
        headline: 'How founders can own their personal brand in 30 minutes a week'
      }
    ];

    const softCtas = [
      {
        targetSectionKey: 'coaching',
        label: 'Explore 1:1 Coaching',
        description: 'See how coaching can support your next stage of growth.'
      },
      {
        targetSectionKey: 'speaking',
        label: 'View Speaking Topics',
        description: 'Bring a practical, energizing keynote to your next event.'
      },
      {
        targetSectionKey: 'results',
        label: 'Read Client Stories',
        description: 'See how other founders and teams have used this work.'
      }
    ];

    return {
      founderName,
      founderStory,
      credentials,
      experienceSegments,
      speakingHighlights,
      mediaMentions,
      softCtas
    };
  }

  // ============================================================
  // Interface: getCoachingListingFilters
  // ============================================================

  getCoachingListingFilters() {
    // Derive session lengths and durations from existing offers
    const offers = this._getFromStorage('coaching_offers');
    const lengthsSet = new Set();
    const durationsSet = new Set();

    offers.forEach((o) => {
      if (typeof o.sessionLengthMinutes === 'number') {
        lengthsSet.add(o.sessionLengthMinutes);
      }
      if (o.durationUnit === 'months' && typeof o.durationValue === 'number') {
        durationsSet.add(o.durationValue);
      }
    });

    const sessionLengthOptions = Array.from(lengthsSet).sort((a, b) => a - b);
    const durationOptionsMonths = Array.from(durationsSet).sort((a, b) => a - b);

    const coachingTypeOptions = [
      'introductory',
      'first_time_session',
      'program',
      'ongoing'
    ];

    const personaOptions = [
      { value: 'entrepreneur_founder', label: 'Entrepreneur / Founder' },
      { value: 'solopreneur_freelancer', label: 'Solopreneur / Freelancer' },
      { value: 'corporate_leader', label: 'Corporate Leader' },
      { value: 'job_seeker', label: 'Job Seeker' },
      { value: 'executive', label: 'Executive' },
      { value: 'other', label: 'Other' }
    ];

    const featureOptions = [
      { key: 'email_support', label: 'Email support' }
    ];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'relevance', label: 'Relevance' }
    ];

    // price slider bounds
    const prices = offers.map((o) => o.price || 0);
    const min = prices.length ? Math.min.apply(null, prices) : 0;
    const max = prices.length ? Math.max.apply(null, prices) : 0;

    const priceSlider = {
      min,
      max,
      step: 25
    };

    return {
      sessionLengthOptions,
      coachingTypeOptions,
      personaOptions,
      durationOptionsMonths,
      featureOptions,
      sortOptions,
      priceSlider
    };
  }

  // ============================================================
  // Interface: searchCoachingOffers
  // ============================================================

  searchCoachingOffers(
    viewMode,
    sessionLengthMinutes,
    coachingTypeFilter,
    priceMax,
    personaFilter,
    durationMonths,
    hasEmailSupportOnly,
    sortOrder
  ) {
    const allOffers = this._getFromStorage('coaching_offers').filter(
      (o) => o.isActive !== false
    );

    const filters = [];

    if (viewMode === 'single_sessions') {
      filters.push((o) => o.offerType === 'single_session');
    } else if (viewMode === 'programs') {
      filters.push((o) => o.offerType === 'program');
    }

    if (typeof sessionLengthMinutes === 'number') {
      filters.push((o) => o.sessionLengthMinutes === sessionLengthMinutes);
    }

    if (coachingTypeFilter) {
      filters.push((o) => o.sessionType === coachingTypeFilter);
    }

    if (typeof priceMax === 'number') {
      filters.push((o) => typeof o.price === 'number' && o.price <= priceMax);
    }

    if (personaFilter) {
      filters.push((o) => o.personaFit === personaFilter);
    }

    if (typeof durationMonths === 'number') {
      filters.push((o) => o.durationUnit === 'months' && o.durationValue === durationMonths);
    }

    if (hasEmailSupportOnly) {
      filters.push((o) => o.hasEmailSupport === true);
    }

    let sortFn = null;
    if (sortOrder === 'price_low_to_high') {
      sortFn = (a, b) => (a.price || 0) - (b.price || 0);
    } else if (sortOrder === 'price_high_to_low') {
      sortFn = (a, b) => (b.price || 0) - (a.price || 0);
    }

    const offers = this._applyListFiltersAndSorting(allOffers, {
      filters,
      sort: sortFn
    });

    // Instrumentation for task completion tracking
    try {
      if (
        viewMode === 'programs' &&
        personaFilter === 'solopreneur_freelancer' &&
        durationMonths === 3 &&
        hasEmailSupportOnly &&
        typeof priceMax === 'number' &&
        priceMax <= 1500 &&
        offers &&
        offers.length >= 2
      ) {
        localStorage.setItem(
          'task2_programFilterParams',
          JSON.stringify({
            viewMode,
            sessionLengthMinutes,
            coachingTypeFilter,
            priceMax,
            personaFilter,
            durationMonths,
            hasEmailSupportOnly: !!hasEmailSupportOnly,
            sortOrder,
            executedAt: this._nowIso(),
            topResultOfferIds: offers.slice(0, 2).map((o) => o.id)
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      offers,
      totalCount: offers.length,
      appliedFilters: {
        viewMode,
        sessionLengthMinutes,
        coachingTypeFilter,
        priceMax,
        personaFilter,
        durationMonths,
        hasEmailSupportOnly: !!hasEmailSupportOnly,
        sortOrder
      }
    };
  }

  // ============================================================
  // Interface: getCoachingOfferDetails
  // ============================================================

  getCoachingOfferDetails(coachingOfferId) {
    const offers = this._getFromStorage('coaching_offers');
    const offer = offers.find((o) => o.id === coachingOfferId) || null;

    if (!offer) {
      return {
        offer: null,
        personaLabel: '',
        durationLabel: '',
        sessionTypeLabel: '',
        inclusions: [],
        isSingleSessionBookable: false,
        isProgramWithApplication: false,
        relatedTestimonials: [],
        relatedCaseStudies: [],
        primaryCtaLabel: '',
        secondaryCtaLabel: ''
      };
    }

    // Related testimonials & case studies using CaseStudyServiceUsage join
    const usages = this._getFromStorage('case_study_service_usages').filter(
      (u) => u.serviceType === 'coaching_offer' && u.serviceId === offer.id
    );
    const caseStudyIds = Array.from(new Set(usages.map((u) => u.caseStudyId))).filter(Boolean);
    const caseStudiesRaw = this._getFromStorage('case_studies').filter((cs) =>
      caseStudyIds.includes(cs.id)
    );
    const caseStudies = this._resolveCaseStudies(caseStudiesRaw);

    const testimonialsRaw = this._getFromStorage('testimonials').filter(
      (t) => t.isActive !== false && t.caseStudyId && caseStudyIds.includes(t.caseStudyId)
    );
    const relatedTestimonials = this._resolveTestimonials(testimonialsRaw);

    const personaLabel = this._mapPersonaToLabel(offer.personaFit);
    const durationLabel = this._mapDurationToLabel(
      offer.durationValue,
      offer.durationUnit,
      offer.sessionLengthMinutes
    );
    const sessionTypeLabel = this._mapSessionTypeToLabel(offer.sessionType);

    const inclusions = [];
    if (offer.hasEmailSupport) {
      inclusions.push('Email support between sessions');
    }
    if (offer.offerType === 'program') {
      inclusions.push('Multi-session program with structured milestones');
    } else {
      inclusions.push('Single 1:1 session via video call');
    }

    const isSingleSessionBookable = offer.offerType === 'single_session';
    const isProgramWithApplication = offer.offerType === 'program';

    const primaryCtaLabel = isSingleSessionBookable ? 'Book Now' : 'Apply Now';
    const secondaryCtaLabel = 'Ask a question';

    // Instrumentation for task completion tracking
    try {
      const raw = localStorage.getItem('task2_programFilterParams');
      if (raw) {
        const params = JSON.parse(raw);
        if (
          params &&
          Array.isArray(params.topResultOfferIds) &&
          params.topResultOfferIds.indexOf(coachingOfferId) !== -1
        ) {
          let existingIds = [];
          const existingRaw = localStorage.getItem('task2_comparedProgramIds');
          if (existingRaw) {
            try {
              const parsed = JSON.parse(existingRaw);
              if (Array.isArray(parsed)) {
                existingIds = parsed;
              }
            } catch (e2) {
              // ignore parse error, fall back to empty array
            }
          }
          if (existingIds.indexOf(coachingOfferId) === -1) {
            localStorage.setItem(
              'task2_comparedProgramIds',
              JSON.stringify(existingIds.concat([coachingOfferId]))
            );
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      offer,
      personaLabel,
      durationLabel,
      sessionTypeLabel,
      inclusions,
      isSingleSessionBookable,
      isProgramWithApplication,
      relatedTestimonials,
      relatedCaseStudies: caseStudies,
      primaryCtaLabel,
      secondaryCtaLabel
    };
  }

  // ============================================================
  // Interface: bookCoachingSession
  // ============================================================

  bookCoachingSession(coachingOfferId, clientName, clientEmail, sessionDate, sessionTime) {
    const offers = this._getFromStorage('coaching_offers');
    const offer = offers.find((o) => o.id === coachingOfferId) || null;

    if (!offer || offer.offerType !== 'single_session' || offer.isActive === false) {
      return {
        success: false,
        booking: null,
        message: 'Selected coaching offer is not available as a single session.'
      };
    }

    if (!clientName || !clientEmail || !sessionDate || !sessionTime) {
      return {
        success: false,
        booking: null,
        message: 'All booking fields are required.'
      };
    }

    const dateObj = this._parseDate(sessionDate);
    const now = new Date();
    if (!dateObj) {
      return {
        success: false,
        booking: null,
        message: 'Invalid session date.'
      };
    }

    const diffDays = this._daysBetween(now, dateObj);
    if (diffDays < 0 || diffDays > 30) {
      return {
        success: false,
        booking: null,
        message: 'Session date must be within the next 30 days.'
      };
    }

    const bookings = this._getFromStorage('coaching_session_bookings');
    const booking = {
      id: this._generateId('coaching_session_booking'),
      coachingOfferId: offer.id,
      clientName,
      clientEmail,
      sessionDate: dateObj.toISOString(),
      sessionTime,
      durationMinutes: offer.sessionLengthMinutes || null,
      status: 'pending',
      priceAtBooking: offer.price,
      currency: offer.currency || 'usd',
      createdAt: this._nowIso()
    };

    bookings.push(booking);
    this._saveToStorage('coaching_session_bookings', bookings);

    return {
      success: true,
      booking: {
        ...booking,
        coachingOffer: offer
      },
      message: 'Your coaching session request has been submitted.'
    };
  }

  // ============================================================
  // Interface: applyToCoachingProgram
  // ============================================================

  applyToCoachingProgram(coachingOfferId, applicantName, applicantEmail, biggestBrandingChallenge) {
    const offers = this._getFromStorage('coaching_offers');
    const offer = offers.find((o) => o.id === coachingOfferId) || null;

    if (!offer || offer.offerType !== 'program' || offer.isActive === false) {
      return {
        application: null,
        success: false,
        message: 'Selected coaching program is not available.'
      };
    }

    if (!applicantName || !applicantEmail || !biggestBrandingChallenge) {
      return {
        application: null,
        success: false,
        message: 'All application fields are required.'
      };
    }

    const applications = this._getFromStorage('coaching_program_applications');
    const application = {
      id: this._generateId('coaching_program_application'),
      coachingOfferId: offer.id,
      applicantName,
      applicantEmail,
      biggestBrandingChallenge,
      status: 'submitted',
      createdAt: this._nowIso()
    };

    applications.push(application);
    this._saveToStorage('coaching_program_applications', applications);

    return {
      application,
      success: true,
      message: 'Your application has been submitted.'
    };
  }

  // ============================================================
  // Interface: getSpeakingListingFilters
  // ============================================================

  getSpeakingListingFilters() {
    const formatOptions = [
      { value: 'virtual', label: 'Virtual' },
      { value: 'in_person', label: 'In-person' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const audienceSizeRangeOptions = [
      { value: 'up_to_50', label: 'Up to 50' },
      { value: '50_200', label: '50–200' },
      { value: '200_500', label: '200–500' },
      { value: '500_plus', label: '500+' }
    ];

    const topicOptions = [
      { value: 'personal_branding', label: 'Personal Branding' },
      { value: 'leadership', label: 'Leadership' },
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'thought_leadership', label: 'Thought Leadership' },
      { value: 'storytelling', label: 'Storytelling' },
      { value: 'other', label: 'Other' }
    ];

    const addOnOptions = [
      { key: 'live_qa', label: 'Live Q&A' }
    ];

    const packages = this._getFromStorage('speaking_packages');
    const fees = packages.map((p) => p.baseFee || 0);
    const min = fees.length ? Math.min.apply(null, fees) : 0;
    const max = fees.length ? Math.max.apply(null, fees) : 0;

    const budgetSlider = {
      min,
      max,
      step: 100
    };

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      formatOptions,
      audienceSizeRangeOptions,
      topicOptions,
      addOnOptions,
      budgetSlider,
      sortOptions
    };
  }

  // ============================================================
  // Interface: searchSpeakingPackages
  // ============================================================

  searchSpeakingPackages(
    formatFilter,
    audienceSizeRange,
    budgetMax,
    topicFilter,
    includeLiveQa,
    sortOrder
  ) {
    const all = this._getFromStorage('speaking_packages').filter(
      (p) => p.status === 'active'
    );

    const filters = [];

    if (formatFilter) {
      filters.push((p) => p.format === formatFilter);
    }

    if (topicFilter) {
      filters.push((p) => p.topic === topicFilter);
    }

    if (typeof budgetMax === 'number') {
      filters.push((p) => typeof p.baseFee === 'number' && p.baseFee <= budgetMax);
    }

    if (includeLiveQa) {
      filters.push((p) => p.includesLiveQa === true);
    }

    if (audienceSizeRange) {
      let rangeMin = 0;
      let rangeMax = Infinity;
      if (audienceSizeRange === 'up_to_50') {
        rangeMax = 50;
      } else if (audienceSizeRange === '50_200') {
        rangeMin = 50;
        rangeMax = 200;
      } else if (audienceSizeRange === '200_500') {
        rangeMin = 200;
        rangeMax = 500;
      } else if (audienceSizeRange === '500_plus') {
        rangeMin = 500;
        rangeMax = Infinity;
      }

      filters.push((p) => {
        const min = typeof p.audienceSizeMin === 'number' ? p.audienceSizeMin : 0;
        const max = typeof p.audienceSizeMax === 'number' ? p.audienceSizeMax : Infinity;
        const overlapMin = Math.max(min, rangeMin);
        const overlapMax = Math.min(max, rangeMax);
        return overlapMin <= overlapMax;
      });
    }

    let sortFn = null;
    if (sortOrder === 'price_low_to_high') {
      sortFn = (a, b) => (a.baseFee || 0) - (b.baseFee || 0);
    } else if (sortOrder === 'price_high_to_low') {
      sortFn = (a, b) => (b.baseFee || 0) - (a.baseFee || 0);
    }

    const packages = this._applyListFiltersAndSorting(all, {
      filters,
      sort: sortFn
    });

    return {
      packages,
      totalCount: packages.length,
      appliedFilters: {
        formatFilter,
        audienceSizeRange,
        budgetMax,
        topicFilter,
        includeLiveQa: !!includeLiveQa,
        sortOrder
      }
    };
  }

  // ============================================================
  // Interface: getSpeakingPackageDetails
  // ============================================================

  getSpeakingPackageDetails(speakingPackageId) {
    const packages = this._getFromStorage('speaking_packages');
    const pkg = packages.find((p) => p.id === speakingPackageId) || null;

    if (!pkg) {
      return {
        package: null,
        formatLabel: '',
        audienceSizeLabel: '',
        feeRangeLabel: '',
        includesLiveQaLabel: '',
        segments: [],
        relatedCaseStudies: [],
        primaryCtaLabel: '',
        secondaryCtaLabel: ''
      };
    }

    // Related case studies via CaseStudyServiceUsage
    const usages = this._getFromStorage('case_study_service_usages').filter(
      (u) => u.serviceType === 'speaking_package' && u.serviceId === pkg.id
    );
    const caseStudyIds = Array.from(new Set(usages.map((u) => u.caseStudyId))).filter(Boolean);
    const caseStudiesRaw = this._getFromStorage('case_studies').filter((cs) =>
      caseStudyIds.includes(cs.id)
    );
    const relatedCaseStudies = this._resolveCaseStudies(caseStudiesRaw);

    const formatLabel = this._mapFormatToLabel(pkg.format);
    const audienceSizeLabel = this._mapAudienceSizeLabel(
      pkg.audienceSizeMin,
      pkg.audienceSizeMax
    );
    const feeRangeLabel = this._mapFeeLabel(pkg.baseFee, pkg.currency || 'usd');
    const includesLiveQaLabel = pkg.includesLiveQa ? 'Includes live Q&A' : 'Q&A optional';

    const segments = [
      {
        title: 'Keynote content',
        description: 'Core talk tailored to your audience and event goals.',
        isOptional: false
      },
      {
        title: 'Live Q&A',
        description: 'Interactive Q&A segment with attendees.',
        isOptional: !pkg.includesLiveQa
      }
    ];

    const primaryCtaLabel = 'Request Quote';
    const secondaryCtaLabel = 'Book a Call';

    return {
      package: pkg,
      formatLabel,
      audienceSizeLabel,
      feeRangeLabel,
      includesLiveQaLabel,
      segments,
      relatedCaseStudies,
      primaryCtaLabel,
      secondaryCtaLabel
    };
  }

  // ============================================================
  // Interface: requestSpeakingQuote
  // ============================================================

  requestSpeakingQuote(
    speakingPackageId,
    eventName,
    eventDate,
    audienceSize,
    budget,
    organizerName,
    organizerEmail
  ) {
    const packages = this._getFromStorage('speaking_packages');
    const pkg = packages.find((p) => p.id === speakingPackageId) || null;

    if (!pkg || pkg.status !== 'active') {
      return {
        quoteRequest: null,
        success: false,
        message: 'Selected speaking package is not available.'
      };
    }

    if (!eventName || !eventDate || !audienceSize || !budget || !organizerName || !organizerEmail) {
      return {
        quoteRequest: null,
        success: false,
        message: 'All quote request fields are required.'
      };
    }

    const eventDateObj = this._parseDate(eventDate);
    if (!eventDateObj) {
      return {
        quoteRequest: null,
        success: false,
        message: 'Invalid event date.'
      };
    }

    const requests = this._getFromStorage('speaking_quote_requests');
    const quoteRequest = {
      id: this._generateId('speaking_quote_request'),
      speakingPackageId: pkg.id,
      eventName,
      eventDate: eventDateObj.toISOString(),
      audienceSize,
      budget,
      organizerName,
      organizerEmail,
      status: 'submitted',
      createdAt: this._nowIso()
    };

    requests.push(quoteRequest);
    this._saveToStorage('speaking_quote_requests', requests);

    return {
      quoteRequest,
      success: true,
      message: 'Your speaking quote request has been submitted.'
    };
  }

  // ============================================================
  // Interface: getEventsListingFilters
  // ============================================================

  getEventsListingFilters() {
    const eventTypeOptions = [
      { value: 'webinar', label: 'Webinar' },
      { value: 'workshop', label: 'Workshop' },
      { value: 'live_event', label: 'Live event' }
    ];

    const priceFilterOptions = [
      { value: 'free', label: 'Free' },
      { value: 'paid', label: 'Paid' },
      { value: 'all', label: 'All' }
    ];

    const topicOptions = [
      { value: 'personal_branding', label: 'Personal Branding' },
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'thought_leadership', label: 'Thought Leadership' },
      { value: 'public_speaking', label: 'Public Speaking' },
      { value: 'other', label: 'Other' }
    ];

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 60);

    const defaultDateRange = {
      start: start.toISOString(),
      end: end.toISOString()
    };

    const sortOptions = [
      { value: 'date_earliest_first', label: 'Earliest first' },
      { value: 'date_latest_first', label: 'Latest first' }
    ];

    return {
      eventTypeOptions,
      priceFilterOptions,
      topicOptions,
      defaultDateRange,
      sortOptions
    };
  }

  // ============================================================
  // Interface: searchEvents
  // ============================================================

  searchEvents(
    eventTypeFilter,
    priceFilter,
    topicFilter,
    dateRangeStart,
    dateRangeEnd,
    sortOrder
  ) {
    const all = this._getFromStorage('events').filter((e) => e.status === 'scheduled');

    const filters = [];

    if (eventTypeFilter) {
      filters.push((e) => e.eventType === eventTypeFilter);
    }

    if (priceFilter === 'free') {
      filters.push((e) => e.priceType === 'free');
    } else if (priceFilter === 'paid') {
      filters.push((e) => e.priceType === 'paid');
    }

    if (topicFilter) {
      filters.push((e) => e.topic === topicFilter);
    }

    const startDateObj = this._parseDate(dateRangeStart);
    const endDateObj = this._parseDate(dateRangeEnd);
    if (startDateObj || endDateObj) {
      filters.push((e) => {
        const start = this._parseDate(e.startDateTime);
        if (!start) return false;
        if (startDateObj && start < startDateObj) return false;
        if (endDateObj && start > endDateObj) return false;
        return true;
      });
    }

    let sortFn = null;
    if (sortOrder === 'date_earliest_first') {
      sortFn = (a, b) => {
        const da = this._parseDate(a.startDateTime) || new Date(0);
        const db = this._parseDate(b.startDateTime) || new Date(0);
        return da - db;
      };
    } else if (sortOrder === 'date_latest_first') {
      sortFn = (a, b) => {
        const da = this._parseDate(a.startDateTime) || new Date(0);
        const db = this._parseDate(b.startDateTime) || new Date(0);
        return db - da;
      };
    }

    const events = this._applyListFiltersAndSorting(all, {
      filters,
      sort: sortFn
    });

    return {
      events,
      totalCount: events.length,
      appliedFilters: {
        eventTypeFilter,
        priceFilter,
        topicFilter,
        dateRangeStart,
        dateRangeEnd,
        sortOrder
      }
    };
  }

  // ============================================================
  // Interface: getEventDetails
  // ============================================================

  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;

    if (!event) {
      return {
        event: null,
        topicLabel: '',
        isFree: false,
        displayDate: '',
        displayTime: '',
        timezoneLabel: '',
        platformLabel: '',
        primaryCtaLabel: ''
      };
    }

    const topicLabel = this._mapEventTopicToLabel(event.topic);
    const isFree = event.priceType === 'free';
    const displayDate = this._formatIsoDate(event.startDateTime);
    const displayTime = this._formatIsoTime(event.startDateTime);
    const timezoneLabel = event.timezone || '';
    const platformLabel = event.platform || '';
    const primaryCtaLabel = 'Register';

    return {
      event,
      topicLabel,
      isFree,
      displayDate,
      displayTime,
      timezoneLabel,
      platformLabel,
      primaryCtaLabel
    };
  }

  // ============================================================
  // Interface: registerForEvent
  // ============================================================

  registerForEvent(eventId, attendeeName, attendeeEmail, roleOrDepartment, heardAbout) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;

    if (!event) {
      return {
        registration: null,
        success: false,
        message: 'Event not found.',
        eventSummary: null
      };
    }

    if (!attendeeName || !attendeeEmail) {
      return {
        registration: null,
        success: false,
        message: 'Name and email are required.',
        eventSummary: null
      };
    }

    const registrations = this._getFromStorage('event_registrations');
    const registration = {
      id: this._generateId('event_registration'),
      eventId: event.id,
      attendeeName,
      attendeeEmail,
      roleOrDepartment: roleOrDepartment || null,
      heardAbout: heardAbout || null,
      createdAt: this._nowIso()
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    const eventSummary = {
      title: event.title,
      startDateTime: event.startDateTime,
      timezone: event.timezone || '',
      platform: event.platform || ''
    };

    return {
      registration,
      success: true,
      message: 'You are registered for this event.',
      eventSummary
    };
  }

  // ============================================================
  // Interface: getBlogListingFilters
  // ============================================================

  getBlogListingFilters() {
    const defaultPublishedAfter = '2023-01-01T00:00:00.000Z';

    const sortOptions = [
      { value: 'date_newest_first', label: 'Newest first' },
      { value: 'date_oldest_first', label: 'Oldest first' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      defaultPublishedAfter,
      sortOptions
    };
  }

  // ============================================================
  // Interface: searchBlogArticles
  // ============================================================

  searchBlogArticles(publishedAfter, searchQuery, sortOrder) {
    const all = this._getFromStorage('blog_articles').filter((a) => a.isPublished !== false);

    const filters = [];

    const afterDate = this._parseDate(publishedAfter);
    if (afterDate) {
      filters.push((a) => {
        const pub = this._parseDate(a.publishedAt);
        return pub && pub > afterDate;
      });
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filters.push((a) => {
        const inTitle = (a.title || '').toLowerCase().indexOf(q) !== -1;
        const inContent = (a.content || '').toLowerCase().indexOf(q) !== -1;
        const inTags = Array.isArray(a.tags)
          ? a.tags.some((t) => String(t).toLowerCase().indexOf(q) !== -1)
          : false;
        return inTitle || inContent || inTags;
      });
    }

    let sortFn = null;
    if (sortOrder === 'date_newest_first') {
      sortFn = (a, b) => {
        const da = this._parseDate(a.publishedAt) || new Date(0);
        const db = this._parseDate(b.publishedAt) || new Date(0);
        return db - da;
      };
    } else if (sortOrder === 'date_oldest_first') {
      sortFn = (a, b) => {
        const da = this._parseDate(a.publishedAt) || new Date(0);
        const db = this._parseDate(b.publishedAt) || new Date(0);
        return da - db;
      };
    }

    const articles = this._applyListFiltersAndSorting(all, {
      filters,
      sort: sortFn
    });

    return {
      articles,
      totalCount: articles.length,
      appliedFilters: {
        publishedAfter,
        searchQuery,
        sortOrder
      }
    };
  }

  // ============================================================
  // Interface: getBlogArticleDetails
  // ============================================================

  getBlogArticleDetails(articleId) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find((a) => a.id === articleId) || null;

    if (!article) {
      return {
        article: null,
        tags: [],
        relatedArticles: [],
        isInReadingList: false
      };
    }

    const tags = Array.isArray(article.tags) ? article.tags : [];

    // Related articles: share at least one tag
    const tagSet = new Set(tags);
    const relatedArticles = articles.filter((a) => {
      if (a.id === article.id) return false;
      const t = Array.isArray(a.tags) ? a.tags : [];
      return t.some((tag) => tagSet.has(tag));
    });

    const readingLists = this._getFromStorage('reading_lists');
    const readingList = readingLists[0];
    let isInReadingList = false;
    if (readingList) {
      const items = this._getFromStorage('reading_list_items');
      isInReadingList = items.some((it) => it.articleId === article.id && it.readingListId === readingList.id);
    }

    return {
      article,
      tags,
      relatedArticles,
      isInReadingList
    };
  }

  // ============================================================
  // Interface: addArticleToReadingList
  // ============================================================

  addArticleToReadingList(articleId) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find((a) => a.id === articleId) || null;

    if (!article) {
      return {
        success: false,
        readingList: null,
        addedItem: null,
        message: 'Article not found.'
      };
    }

    const readingList = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items');

    let existing = items.find(
      (it) => it.readingListId === readingList.id && it.articleId === article.id
    );

    if (existing) {
      return {
        success: true,
        readingList,
        addedItem: existing,
        message: 'Article is already in your reading list.'
      };
    }

    const newItem = {
      id: this._generateId('reading_list_item'),
      readingListId: readingList.id,
      articleId: article.id,
      addedAt: this._nowIso()
    };

    items.push(newItem);
    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      readingList,
      addedItem: newItem,
      message: 'Article saved to your reading list.'
    };
  }

  // ============================================================
  // Interface: getReadingList
  // ============================================================

  getReadingList() {
    const readingLists = this._getFromStorage('reading_lists');
    const readingList = readingLists[0] || null;

    if (!readingList) {
      return {
        readingList: null,
        items: []
      };
    }

    const itemsRaw = this._getFromStorage('reading_list_items').filter(
      (it) => it.readingListId === readingList.id
    );
    const articles = this._getFromStorage('blog_articles');

    const items = itemsRaw.map((it) => {
      const article = articles.find((a) => a.id === it.articleId) || null;
      return {
        readingListItem: {
          ...it,
          readingList,
          article
        },
        article
      };
    });

    return {
      readingList,
      items
    };
  }

  // ============================================================
  // Interface: getTestimonialsListingFilters
  // ============================================================

  getTestimonialsListingFilters() {
    const industryOptions = [
      { value: 'technology_startups', label: 'Technology / Startups' },
      { value: 'professional_services', label: 'Professional Services' },
      { value: 'creative_agencies', label: 'Creative Agencies' },
      { value: 'other', label: 'Other' }
    ];

    const engagementLengthOptions = [
      { value: 'less_than_three_months', label: '< 3 months' },
      { value: 'three_months_plus', label: '3+ months' },
      { value: 'ongoing', label: 'Ongoing' }
    ];

    return {
      industryOptions,
      engagementLengthOptions
    };
  }

  // ============================================================
  // Interface: searchTestimonials
  // ============================================================

  searchTestimonials(industryFilter, engagementLengthFilter) {
    const all = this._getFromStorage('testimonials').filter((t) => t.isActive !== false);

    const filters = [];
    if (industryFilter) {
      filters.push((t) => t.industry === industryFilter);
    }
    if (engagementLengthFilter) {
      filters.push((t) => t.engagementLength === engagementLengthFilter);
    }

    const testimonialsRaw = this._applyListFiltersAndSorting(all, {
      filters,
      sort: (a, b) => (a.order || 0) - (b.order || 0)
    });

    const testimonials = this._resolveTestimonials(testimonialsRaw);

    // Instrumentation for task completion tracking
    try {
      if (
        industryFilter === 'technology_startups' &&
        (engagementLengthFilter === 'three_months_plus' ||
          engagementLengthFilter === 'ongoing') &&
        testimonials &&
        testimonials.length >= 2
      ) {
        localStorage.setItem(
          'task9_testimonialsFilterParams',
          JSON.stringify({
            industryFilter,
            engagementLengthFilter,
            executedAt: this._nowIso(),
            orderedTestimonialIds: testimonials.map((t) => t.id),
            secondTestimonialCaseStudyId:
              testimonials[1] && testimonials[1].caseStudy
                ? testimonials[1].caseStudy.id
                : null
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      testimonials,
      totalCount: testimonials.length,
      appliedFilters: {
        industryFilter,
        engagementLengthFilter
      }
    };
  }

  // ============================================================
  // Interface: getCaseStudyDetails
  // ============================================================

  getCaseStudyDetails(caseStudyId) {
    const caseStudiesRaw = this._getFromStorage('case_studies');
    let csRaw = caseStudiesRaw.find((c) => c.id === caseStudyId) || null;

    // Fallback: synthesize a minimal case study from related testimonials when missing
    if (!csRaw) {
      const testimonials = this._getFromStorage('testimonials');
      const relatedTestimonial = testimonials.find((t) => t.caseStudyId === caseStudyId) || null;
      if (relatedTestimonial) {
        csRaw = {
          id: caseStudyId,
          title: relatedTestimonial.headline || 'Client Story',
          clientName: relatedTestimonial.clientName || '',
          industry: relatedTestimonial.industry || null,
          overview: '',
          challenge: '',
          approach: '',
          results: '',
          engagementLength: relatedTestimonial.engagementLength || '',
          primaryServiceType: null,
          primaryServiceId: null,
          createdAt: relatedTestimonial.createdAt || this._nowIso()
        };
      }
    }

    if (!csRaw) {
      return {
        caseStudy: null,
        primaryTestimonial: null,
        detailedNarrative: {
          challenge: '',
          approach: '',
          results: '',
          timeline: ''
        },
        servicesUsed: [],
        relatedCoachingOffers: [],
        relatedSpeakingPackages: [],
        primaryCtaLabel: ''
      };
    }

    const caseStudy = this._resolveCaseStudies([csRaw])[0];

    const testimonialsRaw = this._getFromStorage('testimonials').filter(
      (t) => t.isActive !== false && t.caseStudyId === caseStudy.id
    );
    const testimonialsResolved = this._resolveTestimonials(testimonialsRaw);
    const primaryTestimonial = testimonialsResolved[0] || null;

    const servicesUsedRaw = this._getFromStorage('case_study_service_usages').filter(
      (u) => u.caseStudyId === caseStudy.id
    );
    const servicesUsed = this._resolveCaseStudyServiceUsages(servicesUsedRaw);

    const relatedCoachingOffersMap = new Map();
    const relatedSpeakingPackagesMap = new Map();

    servicesUsed.forEach((u) => {
      if (u.serviceType === 'coaching_offer' && u.coachingOffer) {
        relatedCoachingOffersMap.set(u.coachingOffer.id, u.coachingOffer);
      }
      if (u.serviceType === 'speaking_package' && u.speakingPackage) {
        relatedSpeakingPackagesMap.set(u.speakingPackage.id, u.speakingPackage);
      }
    });

    if (caseStudy.primaryService && caseStudy.primaryServiceType === 'coaching_offer') {
      relatedCoachingOffersMap.set(caseStudy.primaryService.id, caseStudy.primaryService);
    } else if (caseStudy.primaryService && caseStudy.primaryServiceType === 'speaking_package') {
      relatedSpeakingPackagesMap.set(caseStudy.primaryService.id, caseStudy.primaryService);
    }

    const detailedNarrative = {
      challenge: caseStudy.challenge || '',
      approach: caseStudy.approach || '',
      results: caseStudy.results || '',
      timeline: caseStudy.engagementLength || ''
    };

    const primaryCtaLabel = 'Work with me';

    // Instrumentation for task completion tracking
    try {
      // Always record last opened case study when successfully resolved
      localStorage.setItem('task9_lastOpenedCaseStudyId', caseStudyId);

      const raw = localStorage.getItem('task9_testimonialsFilterParams');
      if (raw) {
        const params = JSON.parse(raw);
        if (
          params &&
          params.secondTestimonialCaseStudyId &&
          params.secondTestimonialCaseStudyId === caseStudyId
        ) {
          localStorage.setItem('task9_secondTestimonialCaseStudyOpened', 'true');
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      caseStudy,
      primaryTestimonial,
      detailedNarrative,
      servicesUsed,
      relatedCoachingOffers: Array.from(relatedCoachingOffersMap.values()),
      relatedSpeakingPackages: Array.from(relatedSpeakingPackagesMap.values()),
      primaryCtaLabel
    };
  }

  // ============================================================
  // Interface: getResourcesListingFilters
  // ============================================================

  getResourcesListingFilters() {
    const resourceCategoryOptions = [
      { value: 'free_tools', label: 'Free tools' },
      { value: 'free_downloads', label: 'Free downloads' },
      { value: 'paid_resources', label: 'Paid resources' }
    ];

    const resourceTypeOptions = [
      { value: 'guides_toolkits', label: 'Guides & toolkits' },
      { value: 'guide', label: 'Guide' },
      { value: 'toolkit', label: 'Toolkit' },
      { value: 'checklist', label: 'Checklist' },
      { value: 'template', label: 'Template' },
      { value: 'other', label: 'Other' }
    ];

    const personaOptions = [
      { value: 'entrepreneur_founder', label: 'Entrepreneur / Founder' },
      { value: 'solopreneur_freelancer', label: 'Solopreneur / Freelancer' },
      { value: 'corporate_leader', label: 'Corporate Leader' },
      { value: 'job_seeker', label: 'Job Seeker' },
      { value: 'executive', label: 'Executive' },
      { value: 'other', label: 'Other' }
    ];

    return {
      resourceCategoryOptions,
      resourceTypeOptions,
      personaOptions
    };
  }

  // ============================================================
  // Interface: searchResources
  // ============================================================

  searchResources(resourceCategoryFilter, resourceTypeFilter, personaFilter) {
    const all = this._getFromStorage('resources').filter((r) => r.isActive !== false);

    const filters = [];
    if (resourceCategoryFilter) {
      filters.push((r) => r.resourceCategory === resourceCategoryFilter);
    }
    if (resourceTypeFilter) {
      filters.push((r) => r.resourceType === resourceTypeFilter);
    }
    if (personaFilter) {
      filters.push((r) => r.targetPersona === personaFilter);
    }

    const resources = this._applyListFiltersAndSorting(all, { filters });

    let highlightedStarterToolkitId = '';
    const starter = resources.find((r) => {
      return (
        typeof r.title === 'string' &&
        r.title.toLowerCase().indexOf('starter toolkit') !== -1
      );
    });
    if (starter) highlightedStarterToolkitId = starter.id;

    return {
      resources,
      totalCount: resources.length,
      appliedFilters: {
        resourceCategoryFilter,
        resourceTypeFilter,
        personaFilter
      },
      highlightedStarterToolkitId
    };
  }

  // ============================================================
  // Interface: getResourceDetails
  // ============================================================

  getResourceDetails(resourceId) {
    const resources = this._getFromStorage('resources');
    const resource = resources.find((r) => r.id === resourceId) || null;

    if (!resource) {
      return {
        resource: null,
        targetPersonaLabel: '',
        includedItems: [],
        formatLabel: '',
        primaryCtaLabel: '',
        requiresOnlyShortForm: false
      };
    }

    const targetPersonaLabel = this._mapPersonaToLabel(resource.targetPersona);
    const formatLabel = this._mapResourceFormatLabel(resource.format);

    const primaryCtaLabel = resource.priceType === 'free' ? 'Get the Toolkit' : 'Download';
    const requiresOnlyShortForm = resource.priceType === 'free';

    const includedItems = [];

    return {
      resource,
      targetPersonaLabel,
      includedItems,
      formatLabel,
      primaryCtaLabel,
      requiresOnlyShortForm
    };
  }

  // ============================================================
  // Interface: requestResourceAccess
  // ============================================================

  requestResourceAccess(resourceId, name, email, optInMarketing, accessMethod) {
    const resources = this._getFromStorage('resources');
    const resource = resources.find((r) => r.id === resourceId) || null;

    if (!resource) {
      return {
        accessRequest: null,
        success: false,
        message: 'Resource not found.',
        accessMethod: null,
        resourceFormat: null
      };
    }

    if (!name || !email) {
      return {
        accessRequest: null,
        success: false,
        message: 'Name and email are required.',
        accessMethod: null,
        resourceFormat: null
      };
    }

    let finalAccessMethod = accessMethod;
    if (!finalAccessMethod) {
      finalAccessMethod = resource.format === 'pdf' || resource.format === 'spreadsheet'
        ? 'download'
        : 'view_online';
    }

    const requests = this._getFromStorage('resource_access_requests');
    const accessRequest = {
      id: this._generateId('resource_access_request'),
      resourceId: resource.id,
      name,
      email,
      optInMarketing: !!optInMarketing,
      accessMethod: finalAccessMethod,
      createdAt: this._nowIso()
    };

    requests.push(accessRequest);
    this._saveToStorage('resource_access_requests', requests);

    return {
      accessRequest,
      success: true,
      message: 'Access granted.',
      accessMethod: finalAccessMethod,
      resourceFormat: resource.format || null
    };
  }

  // ============================================================
  // Interface: getCustomPackageBuilderData
  // ============================================================

  getCustomPackageBuilderData() {
    const coachingOffers = this._getFromStorage('coaching_offers').filter(
      (o) => o.isActive !== false && o.offerType === 'program'
    );
    const speakingPackages = this._getFromStorage('speaking_packages').filter(
      (p) => p.status === 'active'
    );

    const recommendedCoachingPrograms = coachingOffers;
    const recommendedSpeakingServices = speakingPackages;

    const budgetGuidance = {
      suggestedMin: 2000,
      suggestedMax: 2500
    };

    const draft = this._getOrCreateCustomPackageDraft();

    const currentPackage = {
      items: draft.items.map((it) => ({
        itemType: it.itemType,
        itemId: it.itemId,
        title: it.titleSnapshot,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        subtotal: it.subtotal
      })),
      totalPrice: draft.totalPrice,
      currency: draft.currency
    };

    return {
      recommendedCoachingPrograms,
      recommendedSpeakingServices,
      budgetGuidance,
      currentPackage
    };
  }

  // ============================================================
  // Interface: addItemToCustomPackage
  // ============================================================

  addItemToCustomPackage(itemType, itemId) {
    if (!itemType || !itemId) {
      return {
        success: false,
        message: 'Item type and ID are required.',
        packageSummary: null
      };
    }

    const draft = this._getOrCreateCustomPackageDraft();
    let item = draft.items.find((it) => it.itemType === itemType && it.itemId === itemId);

    let unitPrice = 0;
    let titleSnapshot = '';

    if (!item) {
      if (itemType === 'coaching_offer') {
        const offers = this._getFromStorage('coaching_offers');
        const offer = offers.find((o) => o.id === itemId) || null;
        if (!offer) {
          return {
            success: false,
            message: 'Coaching offer not found.',
            packageSummary: null
          };
        }
        unitPrice = offer.price || 0;
        titleSnapshot = offer.title || '';
      } else if (itemType === 'speaking_package') {
        const packages = this._getFromStorage('speaking_packages');
        const pkg = packages.find((p) => p.id === itemId) || null;
        if (!pkg) {
          return {
            success: false,
            message: 'Speaking package not found.',
            packageSummary: null
          };
        }
        unitPrice = pkg.baseFee || 0;
        titleSnapshot = pkg.title || '';
      } else {
        return {
          success: false,
          message: 'Invalid item type.',
          packageSummary: null
        };
      }

      item = {
        itemType,
        itemId,
        titleSnapshot,
        unitPrice,
        quantity: 1,
        subtotal: unitPrice
      };
      draft.items.push(item);
    } else {
      item.quantity += 1;
    }

    this._recalculateCustomPackageTotals(draft);
    this._saveCustomPackageDraft(draft);

    const summaryItems = draft.items.map((it, index) => ({
      id: 'draft_item_' + (index + 1),
      packageEstimateId: null,
      itemType: it.itemType,
      itemId: it.itemId,
      titleSnapshot: it.titleSnapshot,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      subtotal: it.subtotal
    }));

    const packageSummary = {
      items: summaryItems,
      totalPrice: draft.totalPrice,
      currency: draft.currency
    };

    return {
      success: true,
      message: 'Item added to package.',
      packageSummary
    };
  }

  // ============================================================
  // Interface: updateCustomPackageItemQuantity
  // ============================================================

  updateCustomPackageItemQuantity(itemType, itemId, quantity) {
    const draft = this._getOrCreateCustomPackageDraft();
    const itemIndex = draft.items.findIndex(
      (it) => it.itemType === itemType && it.itemId === itemId
    );

    if (itemIndex === -1) {
      return {
        success: false,
        message: 'Item not found in package.',
        packageSummary: null
      };
    }

    if (quantity <= 0) {
      draft.items.splice(itemIndex, 1);
    } else {
      draft.items[itemIndex].quantity = quantity;
    }

    this._recalculateCustomPackageTotals(draft);
    this._saveCustomPackageDraft(draft);

    const summaryItems = draft.items.map((it, index) => ({
      id: 'draft_item_' + (index + 1),
      packageEstimateId: null,
      itemType: it.itemType,
      itemId: it.itemId,
      titleSnapshot: it.titleSnapshot,
      unitPrice: it.unitPrice,
      quantity: it.quantity,
      subtotal: it.subtotal
    }));

    const packageSummary = {
      items: summaryItems,
      totalPrice: draft.totalPrice,
      currency: draft.currency
    };

    return {
      success: true,
      message: 'Package updated.',
      packageSummary
    };
  }

  // ============================================================
  // Interface: getCurrentCustomPackage
  // ============================================================

  getCurrentCustomPackage() {
    const draft = this._getOrCreateCustomPackageDraft();
    const coachingOffers = this._getFromStorage('coaching_offers');
    const speakingPackages = this._getFromStorage('speaking_packages');

    const items = draft.items.map((it, index) => {
      let item = null;
      if (it.itemType === 'coaching_offer') {
        item = coachingOffers.find((o) => o.id === it.itemId) || null;
      } else if (it.itemType === 'speaking_package') {
        item = speakingPackages.find((p) => p.id === it.itemId) || null;
      }

      const packageEstimateItem = {
        id: 'draft_item_' + (index + 1),
        packageEstimateId: null,
        itemType: it.itemType,
        itemId: it.itemId,
        titleSnapshot: it.titleSnapshot,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        subtotal: it.subtotal,
        packageEstimate: null,
        item
      };
      return packageEstimateItem;
    });

    const hasCoachingItem = draft.items.some((it) => it.itemType === 'coaching_offer');
    const hasSpeakingItem = draft.items.some((it) => it.itemType === 'speaking_package');

    return {
      items,
      totalPrice: draft.totalPrice,
      currency: draft.currency,
      hasCoachingItem,
      hasSpeakingItem
    };
  }

  // ============================================================
  // Interface: saveCustomPackageEstimate
  // ============================================================

  saveCustomPackageEstimate(name, email, notes) {
    if (!name || !email) {
      return {
        packageEstimate: null,
        items: [],
        success: false,
        message: 'Name and email are required.'
      };
    }

    const draft = this._getOrCreateCustomPackageDraft();
    if (!draft.items || draft.items.length === 0) {
      return {
        packageEstimate: null,
        items: [],
        success: false,
        message: 'Your package is empty.'
      };
    }

    const packageEstimates = this._getFromStorage('package_estimates');
    const packageEstimateItems = this._getFromStorage('package_estimate_items');

    const estimate = {
      id: this._generateId('package_estimate'),
      name,
      email,
      notes: notes || '',
      totalPrice: draft.totalPrice,
      currency: draft.currency || 'usd',
      createdAt: this._nowIso()
    };

    const items = draft.items.map((it) => {
      return {
        id: this._generateId('package_estimate_item'),
        packageEstimateId: estimate.id,
        itemType: it.itemType,
        itemId: it.itemId,
        titleSnapshot: it.titleSnapshot,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        subtotal: it.subtotal
      };
    });

    packageEstimates.push(estimate);
    this._saveToStorage('package_estimates', packageEstimates);

    const allItems = packageEstimateItems.concat(items);
    this._saveToStorage('package_estimate_items', allItems);

    // Clear draft after save
    this._clearCustomPackageDraft();

    const resolvedItems = this._resolvePackageEstimateItems(items);

    return {
      packageEstimate: estimate,
      items: resolvedItems,
      success: true,
      message: 'Your custom package estimate has been saved.'
    };
  }

  // ============================================================
  // Interface: getNewsletterSignupOptions
  // ============================================================

  getNewsletterSignupOptions() {
    const personaOptions = [
      { value: 'entrepreneur_founder', label: 'Entrepreneur / Founder' },
      { value: 'solopreneur_freelancer', label: 'Solopreneur / Freelancer' },
      { value: 'corporate_leader', label: 'Corporate Leader' },
      { value: 'job_seeker', label: 'Job Seeker' },
      { value: 'executive', label: 'Executive' },
      { value: 'other', label: 'Other' }
    ];

    const topicOptions = [
      { value: 'personal_brand_strategy', label: 'Personal Brand Strategy' },
      { value: 'public_speaking_skills', label: 'Public Speaking Skills' },
      { value: 'thought_leadership', label: 'Thought Leadership' },
      { value: 'linkedin_visibility', label: 'LinkedIn Visibility' }
    ];

    const frequencyOptions = [
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Every other week' },
      { value: 'monthly', label: 'Monthly' }
    ];

    return {
      personaOptions,
      topicOptions,
      frequencyOptions
    };
  }

  // ============================================================
  // Interface: subscribeToNewsletter
  // ============================================================

  subscribeToNewsletter(fullName, email, persona, topics, frequency, consentGiven) {
    if (!fullName || !email || !frequency) {
      return {
        subscription: null,
        success: false,
        message: 'Name, email, and frequency are required.',
        nextSteps: []
      };
    }

    if (!consentGiven) {
      return {
        subscription: null,
        success: false,
        message: 'You must consent to receive emails.',
        nextSteps: []
      };
    }

    const subs = this._getFromStorage('newsletter_subscriptions');
    const subscription = {
      id: this._generateId('newsletter_subscription'),
      fullName,
      email,
      persona: persona || 'other',
      topics: Array.isArray(topics) ? topics : [],
      frequency,
      consentGiven: !!consentGiven,
      createdAt: this._nowIso()
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    const nextSteps = ['Check your inbox for a welcome email.'];

    return {
      subscription,
      success: true,
      message: 'You are subscribed to the newsletter.',
      nextSteps
    };
  }

  // ============================================================
  // Interface: getFAQFilters
  // ============================================================

  getFAQFilters() {
    const categoryOptions = [
      { value: 'coaching', label: 'Coaching' },
      { value: 'speaking', label: 'Speaking' },
      { value: 'payments', label: 'Payments' },
      { value: 'policies', label: 'Policies' },
      { value: 'general', label: 'General' },
      { value: 'one_to_one_coaching', label: '1:1 Coaching' }
    ];

    const exampleQueries = ['refund', 'cancellation', 'guarantee'];

    return {
      categoryOptions,
      exampleQueries
    };
  }

  // ============================================================
  // Interface: searchFAQs
  // ============================================================

  searchFAQs(searchQuery, categoryFilter) {
    const all = this._getFromStorage('faq_items').filter((f) => f.isPublished !== false);

    const filters = [];
    if (categoryFilter) {
      filters.push((f) => f.category === categoryFilter);
    }
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filters.push((f) => {
        const inQuestion = (f.question || '').toLowerCase().indexOf(q) !== -1;
        const inAnswer = (f.answer || '').toLowerCase().indexOf(q) !== -1;
        const inTags = Array.isArray(f.tags)
          ? f.tags.some((t) => String(t).toLowerCase().indexOf(q) !== -1)
          : false;
        return inQuestion || inAnswer || inTags;
      });
    }

    const faqs = this._applyListFiltersAndSorting(all, {
      filters,
      sort: (a, b) => (a.order || 0) - (b.order || 0)
    });

    // Instrumentation for task completion tracking
    try {
      if (
        searchQuery &&
        searchQuery.trim() &&
        searchQuery.toLowerCase().includes('refund') &&
        (categoryFilter === 'coaching' || categoryFilter === 'one_to_one_coaching')
      ) {
        localStorage.setItem(
          'task10_faqSearchParams',
          JSON.stringify({
            searchQuery,
            categoryFilter,
            executedAt: this._nowIso(),
            resultFaqIds: faqs.map((f) => f.id)
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      faqs,
      totalCount: faqs.length,
      appliedFilters: {
        searchQuery,
        categoryFilter
      }
    };
  }

  // ============================================================
  // Interface: getContactFormOptions
  // ============================================================

  getContactFormOptions() {
    const subjectOptions = [
      { value: 'question_about_refund_policy', label: 'Question about refund policy' },
      { value: 'question_about_coaching', label: 'Question about coaching' },
      { value: 'speaking_inquiry', label: 'Speaking inquiry' },
      { value: 'general_question', label: 'General question' }
    ];

    const helperText = 'Share a bit of context so we can get back to you with a clear answer.';

    return {
      subjectOptions,
      helperText
    };
  }

  // ============================================================
  // Interface: submitContactMessage
  // ============================================================

  submitContactMessage(name, email, subject, message) {
    if (!name || !email || !subject || !message) {
      return {
        contactMessage: null,
        success: false,
        message: 'All contact form fields are required.'
      };
    }

    const messages = this._getFromStorage('contact_messages');
    const contactMessage = {
      id: this._generateId('contact_message'),
      name,
      email,
      subject,
      message,
      status: 'new',
      createdAt: this._nowIso()
    };

    messages.push(contactMessage);
    this._saveToStorage('contact_messages', messages);

    return {
      contactMessage,
      success: true,
      message: 'Your message has been sent. We will reply shortly.'
    };
  }

  // ============================================================
  // Interface: getPoliciesOverview
  // ============================================================

  getPoliciesOverview() {
    const refundPolicy =
      'Introductory coaching sessions may be rescheduled with notice; refunds are handled on a case-by-case basis according to the coaching agreement.';
    const cancellationPolicy =
      'For 1:1 coaching and speaking engagements, at least 48 hours notice is required to reschedule without forfeiting the session or fee.';
    const privacyPolicySummary =
      'Your information is used only to deliver services and communications you request. We do not sell your data.';

    return {
      refundPolicy,
      cancellationPolicy,
      privacyPolicySummary
    };
  }

  // ============================================================
  // Interface: submitServiceInquiry
  // ============================================================

  submitServiceInquiry(serviceType, serviceId, preferredTimeOfDay, name, email) {
    if (!serviceType || !serviceId) {
      return {
        serviceInquiry: null,
        success: false,
        message: 'Service type and ID are required.'
      };
    }

    let service = null;
    if (serviceType === 'coaching_offer') {
      const offers = this._getFromStorage('coaching_offers');
      service = offers.find((o) => o.id === serviceId) || null;
    } else if (serviceType === 'speaking_package') {
      const packages = this._getFromStorage('speaking_packages');
      service = packages.find((p) => p.id === serviceId) || null;
    }

    if (!service) {
      return {
        serviceInquiry: null,
        success: false,
        message: 'Service not found.'
      };
    }

    const inquiries = this._getFromStorage('service_inquiries');
    const serviceInquiry = {
      id: this._generateId('service_inquiry'),
      serviceType,
      serviceId,
      preferredTimeOfDay: preferredTimeOfDay || null,
      name: name || null,
      email: email || null,
      createdAt: this._nowIso()
    };

    inquiries.push(serviceInquiry);
    this._saveToStorage('service_inquiries', inquiries);

    // Instrumentation for task completion tracking
    try {
      const lastOpenedCaseStudyId = localStorage.getItem('task9_lastOpenedCaseStudyId');
      if (
        lastOpenedCaseStudyId &&
        typeof preferredTimeOfDay === 'string' &&
        preferredTimeOfDay.toLowerCase().includes('morning')
      ) {
        const usages = this._getFromStorage('case_study_service_usages');
        const hasMatchingUsage = usages.some(
          (u) =>
            u.caseStudyId === lastOpenedCaseStudyId &&
            u.serviceType === serviceType &&
            u.serviceId === serviceId
        );
        if (hasMatchingUsage) {
          localStorage.setItem(
            'task9_serviceInquiryFromCaseStudy',
            JSON.stringify({
              caseStudyId: lastOpenedCaseStudyId,
              serviceType,
              serviceId,
              preferredTimeOfDay,
              executedAt: this._nowIso()
            })
          );
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      serviceInquiry: {
        ...serviceInquiry,
        service
      },
      success: true,
      message: 'Your inquiry has been submitted.'
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
