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

  // -------------------- Storage helpers --------------------
  _initStorage() {
    const tables = [
      'conference_packages',
      'conference_quote_requests',
      'sponsorship_packages',
      'sponsorship_holds',
      'city_packages',
      'roadshow_plans',
      'roadshow_plan_items',
      'swag_products',
      'swag_bundles',
      'swag_bundle_items',
      'office_locations',
      'consultation_time_slots',
      'consultation_appointments',
      'town_hall_packages',
      'town_hall_intake_forms',
      'budget_plans',
      'case_studies',
      'case_study_production_elements',
      'collections',
      'collection_items',
      'newsletter_subscriptions',
      'newsletter_topic_preferences'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('current_swag_bundle_id')) {
      localStorage.setItem('current_swag_bundle_id', '');
    }

    if (!localStorage.getItem('roadshow_draft')) {
      localStorage.setItem('roadshow_draft', JSON.stringify(null));
    }

    if (!localStorage.getItem('town_hall_compare_selection')) {
      localStorage.setItem('town_hall_compare_selection', JSON.stringify([]));
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
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

  _nowISOString() {
    return new Date().toISOString();
  }

  // -------------------- Private domain helpers --------------------

  // Swag bundle helpers
  _getOrCreateSwagBundle() {
    let currentId = localStorage.getItem('current_swag_bundle_id') || '';
    let bundles = this._getFromStorage('swag_bundles', []);
    let bundle = currentId ? bundles.find(b => b.id === currentId) : null;

    if (!bundle) {
      const id = this._generateId('swag_bundle');
      const now = this._nowISOString();
      bundle = {
        id: id,
        name: '',
        target_budget: null,
        total_cost: 0,
        created_at: now,
        updated_at: now
      };
      bundles.push(bundle);
      this._saveToStorage('swag_bundles', bundles);
      localStorage.setItem('current_swag_bundle_id', id);
    }

    return bundle;
  }

  _recalculateSwagBundleTotals(swagBundleId) {
    const items = this._getFromStorage('swag_bundle_items', []);
    const bundles = this._getFromStorage('swag_bundles', []);
    const bundle = bundles.find(b => b.id === swagBundleId) || null;

    let total = 0;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.swag_bundle_id === swagBundleId) {
        if (typeof item.line_total !== 'number') {
          item.line_total = item.quantity * item.unit_price_snapshot;
        }
        total += item.line_total;
      }
    }

    if (bundle) {
      bundle.total_cost = total;
      bundle.updated_at = this._nowISOString();
      this._saveToStorage('swag_bundles', bundles);
    }

    this._saveToStorage('swag_bundle_items', items);
    return total;
  }

  // Roadshow draft helpers
  _getOrCreateRoadshowDraft() {
    let draft = this._getFromStorage('roadshow_draft', null);
    if (!draft) {
      draft = {
        id: this._generateId('roadshow_draft'),
        name: '',
        startDate: '', // ISO date string or empty
        endDate: '',
        items: [] // { id, roadshow_plan_id, city_package_id, sequence_order }
      };
      this._saveToStorage('roadshow_draft', draft);
    }
    return draft;
  }

  _calculateRoadshowTotalCost(draft) {
    if (!draft || !draft.items || !draft.items.length) {
      return 0;
    }
    const cityPackages = this._getFromStorage('city_packages', []);
    let total = 0;
    for (let i = 0; i < draft.items.length; i++) {
      const item = draft.items[i];
      const cp = cityPackages.find(c => c.id === item.city_package_id);
      if (cp && typeof cp.estimated_production_cost === 'number') {
        total += cp.estimated_production_cost;
      }
    }
    return total;
  }

  // Town hall compare selection helper
  _getTownHallCompareSelection() {
    return this._getFromStorage('town_hall_compare_selection', []);
  }

  // Consultation availability helper
  _checkConsultationSlotAvailability(officeLocationId, consultationTimeSlotId) {
    const slots = this._getFromStorage('consultation_time_slots', []);
    const slot = slots.find(
      s => s.id === consultationTimeSlotId && s.office_location_id === officeLocationId
    );
    return !!(slot && !slot.is_booked);
  }

  // Budget allocation helper
  _calculateBudgetAllocations(totalBudget, percents) {
    const normalize = function (value) {
      if (typeof value !== 'number' || isNaN(value) || value < 0) return 0;
      return value;
    };

    let av = normalize(percents.avProductionPercent);
    let venue = normalize(percents.venueLodgingPercent);
    let food = normalize(percents.foodBeveragePercent);
    let decor = normalize(percents.decorExperiencesPercent);
    let other = normalize(percents.otherPercent);

    let totalPercent = av + venue + food + decor + other;

    if (totalPercent > 100 && totalPercent > 0) {
      const ratio = 100 / totalPercent;
      av *= ratio;
      venue *= ratio;
      food *= ratio;
      decor *= ratio;
      other *= ratio;
      totalPercent = av + venue + food + decor + other;
    }

    if (totalPercent === 0) {
      return {
        avProductionAmount: 0,
        venueLodgingAmount: 0,
        foodBeverageAmount: 0,
        decorExperiencesAmount: 0,
        otherAmount: 0,
        avProductionPercent: 0,
        venueLodgingPercent: 0,
        foodBeveragePercent: 0,
        decorExperiencesPercent: 0,
        otherPercent: 0
      };
    }

    const amount = function (percent) {
      return Math.round((totalBudget * percent) / 100);
    };

    return {
      avProductionAmount: amount(av),
      venueLodgingAmount: amount(venue),
      foodBeverageAmount: amount(food),
      decorExperiencesAmount: amount(decor),
      otherAmount: amount(other),
      avProductionPercent: av,
      venueLodgingPercent: venue,
      foodBeveragePercent: food,
      decorExperiencesPercent: decor,
      otherPercent: other
    };
  }

  // -------------------- Interface implementations --------------------

  // Homepage
  getHomeFeaturedServices() {
    return [
      {
        id: 'svc_conferences_summits',
        slug: 'conferences_summits',
        title: 'Conferences & Summits',
        subtitle: 'Hybrid, virtual, and in-person',
        description: 'End-to-end production for leadership conferences, user summits, and strategy meetings.',
        primary_cta_label: 'Request a Conference Quote',
        primary_cta_target: 'start_conference_quote'
      },
      {
        id: 'svc_internal_meetings',
        slug: 'internal_meetings_town_halls',
        title: 'Internal Meetings & Town Halls',
        subtitle: 'Keep your teams aligned',
        description: 'Broadcast-ready production support for internal meetings, town halls, and CEO updates.',
        primary_cta_label: 'Explore Town Hall Packages',
        primary_cta_target: 'view_town_hall_packages'
      },
      {
        id: 'svc_roadshows',
        slug: 'roadshows_tours',
        title: 'Roadshows & Tours',
        subtitle: 'Bring your story to multiple cities',
        description: 'Scalable production packages for multi-city customer and partner roadshows.',
        primary_cta_label: 'Plan a Roadshow',
        primary_cta_target: 'open_roadshow_planner'
      },
      {
        id: 'svc_swag_programs',
        slug: 'event_swag_gifts',
        title: 'Event Swag & Gifts',
        subtitle: 'Memorable, eco-conscious swag',
        description: 'Curated swag bundles and gifting programs for conferences, galas, and internal events.',
        primary_cta_label: 'Build a Swag Bundle',
        primary_cta_target: 'build_swag_bundle'
      }
    ];
  }

  getHomeQuickActions() {
    return [
      {
        id: 'qa_start_conference_quote',
        label: 'Request a Conference Quote',
        description: 'Plan a hybrid or in-person conference with full production support.',
        action_type: 'start_conference_quote',
        target_page: 'conferences_summits'
      },
      {
        id: 'qa_plan_roadshow',
        label: 'Plan a Roadshow',
        description: 'Build a multi-city customer or partner roadshow.',
        action_type: 'open_roadshow_planner',
        target_page: 'roadshows_tours'
      },
      {
        id: 'qa_build_swag_bundle',
        label: 'Build a Swag Bundle',
        description: 'Configure eco-friendly swag bundles for your next event.',
        action_type: 'build_swag_bundle',
        target_page: 'event_swag_gifts'
      },
      {
        id: 'qa_schedule_consultation',
        label: 'Schedule a Consultation',
        description: 'Meet with a producer to plan your next event.',
        action_type: 'schedule_consultation',
        target_page: 'locations_consultations'
      },
      {
        id: 'qa_open_budget_calculator',
        label: 'Open Budget Calculator',
        description: 'Rough out budgets for retreats, summits, and sales kickoffs.',
        action_type: 'open_budget_calculator',
        target_page: 'budget_calculator'
      },
      {
        id: 'qa_newsletter_signup',
        label: 'Newsletter Signup',
        description: 'Get quarterly insights on leadership retreats and sales kickoffs.',
        action_type: 'open_newsletter_signup',
        target_page: 'newsletter_signup'
      }
    ];
  }

  // -------------------- Conferences & Summits --------------------

  getConferenceFilterMetadata() {
    return {
      event_formats: [
        { value: 'in_person', label: 'In-person' },
        { value: 'virtual', label: 'Virtual' },
        { value: 'hybrid', label: 'Hybrid (in-person + streaming)' }
      ],
      attendee_ranges: [
        { id: 'under_100', min_attendees: 0, max_attendees: 99, label: 'Under 100 attendees' },
        { id: '100_200', min_attendees: 100, max_attendees: 200, label: '100–200 attendees' },
        { id: '201_300', min_attendees: 201, max_attendees: 300, label: '201–300 attendees' },
        { id: '301_500', min_attendees: 301, max_attendees: 500, label: '301–500 attendees' },
        { id: 'over_500', min_attendees: 501, max_attendees: 1000000, label: '500+ attendees' }
      ],
      budget_presets: [
        { label: 'Under $25k', max_budget: 25000 },
        { label: 'Up to $50k', max_budget: 50000 },
        { label: 'Up to $100k', max_budget: 100000 },
        { label: 'Custom', max_budget: null }
      ],
      date_filter_hint: 'Most conferences require 8–12 weeks of lead time. Weekday availability is typically higher than weekends.'
    };
  }

  getConferenceAvailabilityCalendar(year, month) {
    const result = [];
    const y = Number(year);
    const m = Number(month);
    if (!y || !m) return result;

    const packages = this._getFromStorage('conference_packages', []).filter(p => p.is_active !== false);

    const daysInMonth = new Date(y, m, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(Date.UTC(y, m - 1, day));
      const isoDate = dateObj.toISOString().slice(0, 10);
      const isWeekday = dateObj.getUTCDay() >= 1 && dateObj.getUTCDay() <= 5; // Mon–Fri

      let hasAvailability = false;
      if (isWeekday && packages.length > 0) {
        for (let i = 0; i < packages.length; i++) {
          const p = packages[i];
          const fromOk = !p.available_from || new Date(p.available_from) <= dateObj;
          const toOk = !p.available_to || new Date(p.available_to) >= dateObj;
          if (fromOk && toOk) {
            hasAvailability = true;
            break;
          }
        }
      }

      result.push({
        date: isoDate,
        is_weekday: isWeekday,
        has_availability: hasAvailability
      });
    }

    return result;
  }

  searchConferencePackages(eventFormat, minAttendees, maxAttendees, maxBudget, preferredDate, sortBy) {
    let packages = this._getFromStorage('conference_packages', []).filter(p => p.is_active !== false);

    if (eventFormat) {
      packages = packages.filter(p => p.event_format === eventFormat);
    }

    const minA = typeof minAttendees === 'number' ? minAttendees : null;
    const maxA = typeof maxAttendees === 'number' ? maxAttendees : null;

    if (minA !== null || maxA !== null) {
      packages = packages.filter(p => {
        const pMin = typeof p.min_attendees === 'number' ? p.min_attendees : null;
        const pMax = typeof p.max_attendees === 'number' ? p.max_attendees : null;

        const overlapMin = maxA === null || pMin === null || pMin <= maxA;
        const overlapMax = minA === null || pMax === null || pMax >= minA;
        return overlapMin && overlapMax;
      });
    }

    if (typeof maxBudget === 'number') {
      const maxB = maxBudget;
      packages = packages.filter(p => {
        const price = typeof p.base_price === 'number'
          ? p.base_price
          : (typeof p.max_budget === 'number'
            ? p.max_budget
            : (typeof p.min_budget === 'number' ? p.min_budget : null));
        if (price === null) return true; // unknown price, keep
        return price <= maxB;
      });
    }

    if (preferredDate) {
      const prefDate = new Date(preferredDate);
      if (!isNaN(prefDate.getTime())) {
        packages = packages.filter(p => {
          const fromOk = !p.available_from || new Date(p.available_from) <= prefDate;
          const toOk = !p.available_to || new Date(p.available_to) >= prefDate;
          return fromOk && toOk;
        });
      }
    }

    if (sortBy === 'base_price_asc' || sortBy === 'base_price_desc') {
      const dir = sortBy === 'base_price_asc' ? 1 : -1;
      packages.sort((a, b) => {
        const pa = typeof a.base_price === 'number' ? a.base_price : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.base_price === 'number' ? b.base_price : Number.MAX_SAFE_INTEGER;
        if (pa === pb) return 0;
        return pa < pb ? -1 * dir : 1 * dir;
      });
    }

    return packages;
  }

  getConferencePackageDetails(conferencePackageId) {
    const packages = this._getFromStorage('conference_packages', []);
    const pkg = packages.find(p => p.id === conferencePackageId) || null;

    if (!pkg) {
      return {
        package: null,
        inclusions: [],
        pricing_notes: '',
        recommended_attendee_range_label: '',
        recommended_budget_label: ''
      };
    }

    const inclusions = [];
    if (typeof pkg.min_attendees === 'number' || typeof pkg.max_attendees === 'number') {
      inclusions.push('Scaled production for your attendee range.');
    }
    if (typeof pkg.base_price === 'number') {
      inclusions.push('Base production package with standard AV support.');
    }

    const rangeLabel = (function () {
      const minA = pkg.min_attendees;
      const maxA = pkg.max_attendees;
      if (typeof minA === 'number' && typeof maxA === 'number') {
        return String(minA) + '–' + String(maxA) + ' attendees';
      }
      if (typeof minA === 'number') return 'From ' + String(minA) + ' attendees';
      if (typeof maxA === 'number') return 'Up to ' + String(maxA) + ' attendees';
      return '';
    })();

    const budgetLabel = (function () {
      const minB = pkg.min_budget;
      const maxB = pkg.max_budget;
      if (typeof minB === 'number' && typeof maxB === 'number') {
        return '$' + minB + '–$' + maxB + ' recommended budget';
      }
      if (typeof minB === 'number') return 'From $' + minB + ' recommended budget';
      if (typeof maxB === 'number') return 'Up to $' + maxB + ' recommended budget';
      if (typeof pkg.base_price === 'number') return 'Starting at $' + pkg.base_price;
      return '';
    })();

    const pricingNotes = 'Actual pricing will be confirmed in your custom proposal based on venue, schedule, and production complexity.';

    return {
      package: pkg,
      inclusions: inclusions,
      pricing_notes: pricingNotes,
      recommended_attendee_range_label: rangeLabel,
      recommended_budget_label: budgetLabel
    };
  }

  submitConferenceQuoteRequest(conferencePackageId, eventTitle, attendeeCount, budget, preferredDate) {
    const quoteRequests = this._getFromStorage('conference_quote_requests', []);
    const id = this._generateId('conf_quote');

    let preferredDateISO = null;
    if (preferredDate) {
      const d = new Date(preferredDate);
      if (!isNaN(d.getTime())) {
        preferredDateISO = d.toISOString();
      }
    }

    const record = {
      id: id,
      conference_package_id: conferencePackageId,
      event_title: eventTitle,
      attendee_count: attendeeCount,
      budget: budget,
      preferred_date: preferredDateISO,
      created_at: this._nowISOString()
    };

    quoteRequests.push(record);
    this._saveToStorage('conference_quote_requests', quoteRequests);

    return {
      success: true,
      quoteRequestId: id,
      message: 'Conference quote request submitted.'
    };
  }

  // -------------------- Sponsorship & Partnerships --------------------

  getSponsorshipFilterMetadata() {
    return {
      event_types: [
        { value: 'corporate_gala', label: 'Corporate Gala' },
        { value: 'conference', label: 'Conference' },
        { value: 'trade_show', label: 'Trade Show' },
        { value: 'sports_event', label: 'Sports Event' },
        { value: 'other', label: 'Other' }
      ],
      benefit_flags: [
        { key: 'includes_stage_branding', label: 'Stage branding' },
        { key: 'min_social_posts', label: 'Minimum number of sponsored social posts' }
      ]
    };
  }

  searchSponsorshipPackages(eventType, maxInvestment, requireStageBranding, minSponsoredSocialPosts, sortBy) {
    let packages = this._getFromStorage('sponsorship_packages', []).filter(p => p.is_active !== false);

    if (eventType) {
      packages = packages.filter(p => p.event_type === eventType);
    }

    if (typeof maxInvestment === 'number') {
      packages = packages.filter(p => typeof p.price === 'number' && p.price <= maxInvestment);
    }

    if (requireStageBranding) {
      packages = packages.filter(p => !!p.includes_stage_branding);
    }

    if (typeof minSponsoredSocialPosts === 'number') {
      packages = packages.filter(p => (p.sponsored_social_media_posts_count || 0) >= minSponsoredSocialPosts);
    }

    if (sortBy === 'price_asc' || sortBy === 'price_desc') {
      const dir = sortBy === 'price_asc' ? 1 : -1;
      packages.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.price === 'number' ? b.price : Number.MAX_SAFE_INTEGER;
        if (pa === pb) return 0;
        return pa < pb ? -1 * dir : 1 * dir;
      });
    }

    return packages;
  }

  getSponsorshipPackageDetails(sponsorshipPackageId) {
    const packages = this._getFromStorage('sponsorship_packages', []);
    const pkg = packages.find(p => p.id === sponsorshipPackageId) || null;

    if (!pkg) {
      return { package: null, benefits: [], notes: '' };
    }

    let benefits = [];
    if (typeof pkg.benefits_summary === 'string' && pkg.benefits_summary.trim()) {
      const parts = pkg.benefits_summary.split(/\r?\n/);
      benefits = parts.map(p => p.trim()).filter(Boolean);
    }

    if (pkg.includes_stage_branding && !benefits.includes('Stage branding')) {
      benefits.push('Stage branding');
    }
    if ((pkg.sponsored_social_media_posts_count || 0) > 0) {
      benefits.push(String(pkg.sponsored_social_media_posts_count) + ' sponsored social media posts');
    }

    const notes = 'Availability of sponsorship benefits is subject to event date and production schedule.';

    return {
      package: pkg,
      benefits: benefits,
      notes: notes
    };
  }

  placeSponsorshipHold(sponsorshipPackageId, eventName, eventDate, estimatedGuests) {
    const holds = this._getFromStorage('sponsorship_holds', []);
    const id = this._generateId('sponsorship_hold');

    let eventDateISO = null;
    if (eventDate) {
      const d = new Date(eventDate);
      if (!isNaN(d.getTime())) {
        eventDateISO = d.toISOString();
      }
    }

    const record = {
      id: id,
      sponsorship_package_id: sponsorshipPackageId,
      event_name: eventName,
      event_date: eventDateISO,
      estimated_guests: estimatedGuests,
      created_at: this._nowISOString()
    };

    holds.push(record);
    this._saveToStorage('sponsorship_holds', holds);

    return {
      success: true,
      sponsorshipHoldId: id,
      message: 'Sponsorship package placed on hold.'
    };
  }

  // -------------------- Town Halls --------------------

  getTownHallFilterMetadata() {
    return {
      feature_filters: [
        { key: 'includes_live_audience_qa', label: 'Live audience Q&A' },
        { key: 'includes_recording_post_event_editing', label: 'Recording & post-event editing' }
      ],
      budget_hint: 'Most internal town halls fall between $10k and $50k depending on size and streaming needs.'
    };
  }

  searchTownHallPackages(maxBudget, requireLiveAudienceQa, requireRecording, sortBy) {
    let packages = this._getFromStorage('town_hall_packages', []).filter(p => p.is_active !== false);

    if (typeof maxBudget === 'number') {
      packages = packages.filter(p => typeof p.max_budget !== 'number' || p.max_budget <= maxBudget);
    }

    if (requireLiveAudienceQa) {
      packages = packages.filter(p => !!p.includes_live_audience_qa);
    }

    if (requireRecording) {
      packages = packages.filter(p => !!p.includes_recording_post_event_editing);
    }

    if (sortBy === 'max_budget_asc' || sortBy === 'on_site_support_hours_desc') {
      if (sortBy === 'max_budget_asc') {
        packages.sort((a, b) => {
          const pa = typeof a.max_budget === 'number' ? a.max_budget : Number.MAX_SAFE_INTEGER;
          const pb = typeof b.max_budget === 'number' ? b.max_budget : Number.MAX_SAFE_INTEGER;
          if (pa === pb) return 0;
          return pa < pb ? -1 : 1;
        });
      } else if (sortBy === 'on_site_support_hours_desc') {
        packages.sort((a, b) => {
          const pa = typeof a.on_site_support_hours === 'number' ? a.on_site_support_hours : 0;
          const pb = typeof b.on_site_support_hours === 'number' ? b.on_site_support_hours : 0;
          if (pa === pb) return 0;
          return pa > pb ? -1 : 1;
        });
      }
    }

    return packages;
  }

  toggleTownHallPackageCompareSelection(townHallPackageId, selected) {
    const maxCompareItems = 3;
    let selection = this._getTownHallCompareSelection();

    const idx = selection.indexOf(townHallPackageId);
    if (selected) {
      if (idx === -1) {
        if (selection.length < maxCompareItems) {
          selection.push(townHallPackageId);
        }
      }
    } else {
      if (idx !== -1) {
        selection.splice(idx, 1);
      }
    }

    this._saveToStorage('town_hall_compare_selection', selection);

    return {
      selectedPackageIds: selection,
      maxCompareItems: maxCompareItems
    };
  }

  getTownHallComparisonView() {
    const selection = this._getTownHallCompareSelection();
    const packages = this._getFromStorage('town_hall_packages', []).filter(p => selection.indexOf(p.id) !== -1);

    const comparison_rows = [
      { attribute_key: 'on_site_support_hours', label: 'On-site support hours' },
      { attribute_key: 'includes_live_audience_qa', label: 'Live audience Q&A' },
      { attribute_key: 'includes_recording_post_event_editing', label: 'Recording & post-event editing' }
    ];

    return {
      packages: packages,
      comparison_rows: comparison_rows
    };
  }

  getTownHallPackageDetails(townHallPackageId) {
    const packages = this._getFromStorage('town_hall_packages', []);
    const pkg = packages.find(p => p.id === townHallPackageId) || null;

    if (!pkg) {
      return { package: null, inclusions: [], notes: '' };
    }

    const inclusions = [];
    if (pkg.includes_live_audience_qa) inclusions.push('Live audience Q&A support');
    if (pkg.includes_recording_post_event_editing) inclusions.push('Recording and post-event editing');
    inclusions.push('Production team support for internal town hall messaging.');

    const notes = 'Packages can be tailored based on locations, leadership involvement, and streaming platforms.';

    return {
      package: pkg,
      inclusions: inclusions,
      notes: notes
    };
  }

  submitTownHallIntakeForm(townHallPackageId, eventName, attendeeCount, preferredMonth) {
    const forms = this._getFromStorage('town_hall_intake_forms', []);
    const id = this._generateId('town_hall_intake');

    const record = {
      id: id,
      town_hall_package_id: townHallPackageId,
      event_name: eventName,
      attendee_count: attendeeCount,
      preferred_month: preferredMonth,
      created_at: this._nowISOString()
    };

    forms.push(record);
    this._saveToStorage('town_hall_intake_forms', forms);

    return {
      success: true,
      intakeFormId: id,
      message: 'Town hall package selection submitted.'
    };
  }

  // -------------------- Roadshows & Tours --------------------

  getRoadshowFilterMetadata() {
    return {
      attendee_range_hint: 'Typical roadshow stops host 50–250 attendees per city.',
      budget_hint: 'Production budgets scale with city count; many 3-city tours range from $50k to $150k.'
    };
  }

  searchCityPackages(minAttendees, maxAttendees, maxEstimatedProductionBudget, sortBy) {
    let packages = this._getFromStorage('city_packages', []).filter(p => p.is_active !== false);

    const minA = typeof minAttendees === 'number' ? minAttendees : null;
    const maxA = typeof maxAttendees === 'number' ? maxAttendees : null;

    if (minA !== null || maxA !== null) {
      packages = packages.filter(p => {
        const pMin = typeof p.min_attendees === 'number' ? p.min_attendees : null;
        const pMax = typeof p.max_attendees === 'number' ? p.max_attendees : null;
        const overlapMin = maxA === null || pMin === null || pMin <= maxA;
        const overlapMax = minA === null || pMax === null || pMax >= minA;
        return overlapMin && overlapMax;
      });
    }

    if (typeof maxEstimatedProductionBudget === 'number') {
      const maxB = maxEstimatedProductionBudget;
      packages = packages.filter(p => typeof p.estimated_production_cost === 'number' && p.estimated_production_cost <= maxB);
    }

    if (sortBy === 'estimated_production_cost_asc' || sortBy === 'estimated_production_cost_desc') {
      const dir = sortBy === 'estimated_production_cost_asc' ? 1 : -1;
      packages.sort((a, b) => {
        const pa = typeof a.estimated_production_cost === 'number' ? a.estimated_production_cost : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.estimated_production_cost === 'number' ? b.estimated_production_cost : Number.MAX_SAFE_INTEGER;
        if (pa === pb) return 0;
        return pa < pb ? -1 * dir : 1 * dir;
      });
    }

    return packages;
  }

  addCityPackageToRoadshowDraft(cityPackageId) {
    const draft = this._getOrCreateRoadshowDraft();

    const itemId = this._generateId('roadshow_draft_item');
    const sequenceOrder = draft.items.length + 1;

    draft.items.push({
      id: itemId,
      roadshow_plan_id: draft.id,
      city_package_id: cityPackageId,
      sequence_order: sequenceOrder
    });

    this._saveToStorage('roadshow_draft', draft);

    const totalCost = this._calculateRoadshowTotalCost(draft);

    return {
      roadshowDraftId: draft.id,
      totalCities: draft.items.length,
      totalEstimatedProductionCost: totalCost
    };
  }

  getRoadshowDraftSummary() {
    const draft = this._getOrCreateRoadshowDraft();
    const cityPackagesAll = this._getFromStorage('city_packages', []);

    const cityPackages = draft.items.map(item => {
      const cp = cityPackagesAll.find(c => c.id === item.city_package_id) || null;
      return {
        roadshowPlanItemId: item.id,
        sequenceOrder: item.sequence_order,
        cityPackage: cp
      };
    });

    const totalCost = this._calculateRoadshowTotalCost(draft);

    return {
      roadshowDraftId: draft.id,
      name: draft.name || '',
      startDate: draft.startDate || '',
      endDate: draft.endDate || '',
      cityPackages: cityPackages,
      totalEstimatedProductionCost: totalCost
    };
  }

  updateRoadshowDraft(name, startDate, endDate) {
    const draft = this._getOrCreateRoadshowDraft();

    if (typeof name === 'string') {
      draft.name = name;
    }
    if (typeof startDate === 'string') {
      draft.startDate = startDate;
    }
    if (typeof endDate === 'string') {
      draft.endDate = endDate;
    }

    this._saveToStorage('roadshow_draft', draft);

    return {
      roadshowDraftId: draft.id,
      name: draft.name,
      startDate: draft.startDate,
      endDate: draft.endDate
    };
  }

  removeCityPackageFromRoadshowDraft(cityPackageId) {
    const draft = this._getOrCreateRoadshowDraft();

    let removed = false;
    for (let i = 0; i < draft.items.length; i++) {
      if (draft.items[i].city_package_id === cityPackageId) {
        draft.items.splice(i, 1);
        removed = true;
        break;
      }
    }

    if (removed) {
      for (let j = 0; j < draft.items.length; j++) {
        draft.items[j].sequence_order = j + 1;
      }
    }

    this._saveToStorage('roadshow_draft', draft);

    const totalCost = this._calculateRoadshowTotalCost(draft);

    return {
      roadshowDraftId: draft.id,
      totalCities: draft.items.length,
      totalEstimatedProductionCost: totalCost
    };
  }

  saveRoadshowPlan() {
    const draft = this._getOrCreateRoadshowDraft();
    if (!draft.items || !draft.items.length) {
      return {
        success: false,
        roadshowPlanId: null,
        totalEstimatedProductionCost: 0,
        message: 'No city packages in the roadshow draft.'
      };
    }

    const roadshowPlans = this._getFromStorage('roadshow_plans', []);
    const roadshowPlanItems = this._getFromStorage('roadshow_plan_items', []);

    const totalCost = this._calculateRoadshowTotalCost(draft);
    const planId = this._generateId('roadshow_plan');

    let startDateISO = null;
    let endDateISO = null;
    if (draft.startDate) {
      const d = new Date(draft.startDate);
      if (!isNaN(d.getTime())) startDateISO = d.toISOString();
    }
    if (draft.endDate) {
      const d2 = new Date(draft.endDate);
      if (!isNaN(d2.getTime())) endDateISO = d2.toISOString();
    }

    const plan = {
      id: planId,
      name: draft.name || 'Untitled Roadshow',
      start_date: startDateISO,
      end_date: endDateISO,
      total_estimated_production_cost: totalCost,
      created_at: this._nowISOString()
    };

    roadshowPlans.push(plan);

    for (let i = 0; i < draft.items.length; i++) {
      const item = draft.items[i];
      const itemId = this._generateId('roadshow_plan_item');
      roadshowPlanItems.push({
        id: itemId,
        roadshow_plan_id: planId,
        city_package_id: item.city_package_id,
        sequence_order: item.sequence_order
      });
    }

    this._saveToStorage('roadshow_plans', roadshowPlans);
    this._saveToStorage('roadshow_plan_items', roadshowPlanItems);

    // Clear draft after saving
    const newDraft = {
      id: this._generateId('roadshow_draft'),
      name: '',
      startDate: '',
      endDate: '',
      items: []
    };
    this._saveToStorage('roadshow_draft', newDraft);

    return {
      success: true,
      roadshowPlanId: planId,
      totalEstimatedProductionCost: totalCost,
      message: 'Roadshow plan saved.'
    };
  }

  // -------------------- Swag & Gifts --------------------

  getSwagFilterMetadata() {
    return {
      categories: [
        { value: 'writing_office', label: 'Writing & Office' },
        { value: 'badges_lanyards', label: 'Badges & Lanyards' },
        { value: 'apparel', label: 'Apparel' },
        { value: 'drinkware', label: 'Drinkware' },
        { value: 'tech_accessories', label: 'Tech Accessories' },
        { value: 'other', label: 'Other' }
      ],
      eco_friendly_label: 'Eco-friendly',
      max_price_hint: 'Set a maximum unit price to fit your swag budget per attendee.'
    };
  }

  searchSwagProducts(category, isEcoFriendly, maxUnitPrice, sortBy) {
    let products = this._getFromStorage('swag_products', []).filter(p => p.is_active !== false);

    if (category) {
      products = products.filter(p => p.category === category);
    }

    if (typeof isEcoFriendly === 'boolean') {
      products = products.filter(p => !!p.is_eco_friendly === isEcoFriendly);
    }

    if (typeof maxUnitPrice === 'number') {
      products = products.filter(p => typeof p.unit_price === 'number' && p.unit_price <= maxUnitPrice);
    }

    if (sortBy === 'unit_price_asc') {
      products.sort((a, b) => {
        const pa = typeof a.unit_price === 'number' ? a.unit_price : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.unit_price === 'number' ? b.unit_price : Number.MAX_SAFE_INTEGER;
        if (pa === pb) return 0;
        return pa < pb ? -1 : 1;
      });
    } else if (sortBy === 'unit_price_desc') {
      products.sort((a, b) => {
        const pa = typeof a.unit_price === 'number' ? a.unit_price : 0;
        const pb = typeof b.unit_price === 'number' ? b.unit_price : 0;
        if (pa === pb) return 0;
        return pa > pb ? -1 : 1;
      });
    }

    return products;
  }

  getSwagProductDetails(swagProductId) {
    const products = this._getFromStorage('swag_products', []);
    const product = products.find(p => p.id === swagProductId) || null;

    if (!product) {
      return {
        product: null,
        available_colors: [],
        notes: ''
      };
    }

    // Colors/notes are not stored in the model; return generic placeholders
    return {
      product: product,
      available_colors: [],
      notes: product.is_eco_friendly ? 'Made with eco-conscious materials.' : ''
    };
  }

  addSwagProductToBundle(swagProductId, quantity, color) {
    const bundle = this._getOrCreateSwagBundle();
    const items = this._getFromStorage('swag_bundle_items', []);
    const products = this._getFromStorage('swag_products', []);

    const product = products.find(p => p.id === swagProductId) || null;
    const unitPrice = product && typeof product.unit_price === 'number' ? product.unit_price : 0;

    const itemId = this._generateId('swag_bundle_item');
    const lineTotal = unitPrice * quantity;

    items.push({
      id: itemId,
      swag_bundle_id: bundle.id,
      swag_product_id: swagProductId,
      quantity: quantity,
      unit_price_snapshot: unitPrice,
      line_total: lineTotal,
      color: color || null
    });

    this._saveToStorage('swag_bundle_items', items);

    const totalCost = this._recalculateSwagBundleTotals(bundle.id);

    const allItemsForBundle = items.filter(i => i.swag_bundle_id === bundle.id);
    let totalItemCount = 0;
    for (let i = 0; i < allItemsForBundle.length; i++) {
      totalItemCount += allItemsForBundle[i].quantity;
    }

    return {
      swagBundleId: bundle.id,
      totalItems: totalItemCount,
      totalCost: totalCost
    };
  }

  getCurrentSwagBundleSummary() {
    const bundle = this._getOrCreateSwagBundle();
    const items = this._getFromStorage('swag_bundle_items', []);
    const products = this._getFromStorage('swag_products', []);

    const bundleItems = items.filter(i => i.swag_bundle_id === bundle.id);

    // Ensure totals are up to date
    const totalCost = this._recalculateSwagBundleTotals(bundle.id);

    const mappedItems = bundleItems.map(item => {
      const product = products.find(p => p.id === item.swag_product_id) || null;
      const lineTotal = typeof item.line_total === 'number'
        ? item.line_total
        : item.quantity * item.unit_price_snapshot;
      return {
        swagBundleItemId: item.id,
        quantity: item.quantity,
        unitPrice: item.unit_price_snapshot,
        lineTotal: lineTotal,
        product: product
      };
    });

    return {
      swagBundleId: bundle.id,
      name: bundle.name || '',
      targetBudget: typeof bundle.target_budget === 'number' ? bundle.target_budget : null,
      totalCost: totalCost,
      items: mappedItems
    };
  }

  updateSwagBundleItems(items, targetBudget) {
    const bundle = this._getOrCreateSwagBundle();
    const existingItems = this._getFromStorage('swag_bundle_items', []);

    // Update quantities / remove items
    for (let i = 0; i < items.length; i++) {
      const update = items[i];
      const idx = existingItems.findIndex(it => it.id === update.swagBundleItemId && it.swag_bundle_id === bundle.id);
      if (idx !== -1) {
        if (update.quantity === 0) {
          existingItems.splice(idx, 1);
        } else {
          existingItems[idx].quantity = update.quantity;
          existingItems[idx].line_total = existingItems[idx].unit_price_snapshot * update.quantity;
        }
      }
    }

    this._saveToStorage('swag_bundle_items', existingItems);

    if (typeof targetBudget === 'number') {
      const bundles = this._getFromStorage('swag_bundles', []);
      const b = bundles.find(bd => bd.id === bundle.id) || null;
      if (b) {
        b.target_budget = targetBudget;
        b.updated_at = this._nowISOString();
        this._saveToStorage('swag_bundles', bundles);
      }
    }

    const totalCost = this._recalculateSwagBundleTotals(bundle.id);

    const finalBundle = this._getFromStorage('swag_bundles', []).find(bd => bd.id === bundle.id) || bundle;
    const withinTargetBudget = typeof finalBundle.target_budget === 'number'
      ? totalCost <= finalBundle.target_budget
      : true;

    return {
      swagBundleId: bundle.id,
      totalCost: totalCost,
      withinTargetBudget: withinTargetBudget
    };
  }

  // -------------------- Locations & Consultations --------------------

  searchOfficeLocationsByRadius(postalCode, distanceMiles) {
    const results = [];
    const locations = this._getFromStorage('office_locations', []);

    // Optional coordinates map in localStorage: key 'postal_code_coords'
    const coordsMap = this._getFromStorage('postal_code_coords', {});
    const centerCoords = coordsMap[postalCode] || null;

    const haversine = function (lat1, lon1, lat2, lon2) {
      const toRad = function (deg) { return (deg * Math.PI) / 180; };
      const R = 3958.8; // miles
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      let distance = null;

      if (centerCoords && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        distance = haversine(centerCoords.lat, centerCoords.lon, loc.latitude, loc.longitude);
      } else if (loc.postal_code === postalCode) {
        distance = 0;
      }

      if (distance !== null && distance <= distanceMiles) {
        results.push({
          location: loc,
          distanceMiles: distance
        });
      }
    }

    // Sort by distance ascending
    results.sort((a, b) => {
      const da = typeof a.distanceMiles === 'number' ? a.distanceMiles : Number.MAX_SAFE_INTEGER;
      const db = typeof b.distanceMiles === 'number' ? b.distanceMiles : Number.MAX_SAFE_INTEGER;
      if (da === db) return 0;
      return da < db ? -1 : 1;
    });

    return results;
  }

  getConsultationAvailableDates(officeLocationId, year, month) {
    const slots = this._getFromStorage('consultation_time_slots', []);
    const y = Number(year);
    const m = Number(month);
    if (!y || !m) return [];

    const filtered = slots.filter(s => s.office_location_id === officeLocationId && !s.is_booked);

    const datesMap = {};
    for (let i = 0; i < filtered.length; i++) {
      const s = filtered[i];
      const d = new Date(s.start_datetime);
      if (isNaN(d.getTime())) continue;
      if (d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m) {
        const isoDate = d.toISOString().slice(0, 10);
        datesMap[isoDate] = true;
      }
    }

    const result = [];
    for (const dateKey in datesMap) {
      if (Object.prototype.hasOwnProperty.call(datesMap, dateKey)) {
        result.push({
          date: dateKey,
          hasAvailableSlots: true
        });
      }
    }

    result.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return result;
  }

  getConsultationTimeSlots(officeLocationId, date) {
    const slots = this._getFromStorage('consultation_time_slots', []);
    const locations = this._getFromStorage('office_locations', []);
    const targetDateStr = date;

    const filtered = [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s.office_location_id !== officeLocationId || s.is_booked) continue;
      const d = new Date(s.start_datetime);
      if (isNaN(d.getTime())) continue;
      const isoDate = d.toISOString().slice(0, 10);
      if (isoDate === targetDateStr) {
        const location = locations.find(l => l.id === s.office_location_id) || null;
        // Foreign key resolution: add office_location
        const slotWithLocation = Object.assign({}, s, {
          office_location: location
        });
        filtered.push(slotWithLocation);
      }
    }

    // Sort by time
    filtered.sort((a, b) => {
      const ta = new Date(a.start_datetime).getTime();
      const tb = new Date(b.start_datetime).getTime();
      if (ta === tb) return 0;
      return ta < tb ? -1 : 1;
    });

    return filtered;
  }

  bookConsultationAppointment(officeLocationId, consultationTimeSlotId, contactName, company, email, meetingTopic) {
    const available = this._checkConsultationSlotAvailability(officeLocationId, consultationTimeSlotId);
    if (!available) {
      return {
        success: false,
        consultationAppointmentId: null,
        startDatetime: null,
        endDatetime: null,
        message: 'Selected time slot is no longer available.'
      };
    }

    const slots = this._getFromStorage('consultation_time_slots', []);
    const appointments = this._getFromStorage('consultation_appointments', []);

    const slot = slots.find(s => s.id === consultationTimeSlotId && s.office_location_id === officeLocationId);
    if (!slot) {
      return {
        success: false,
        consultationAppointmentId: null,
        startDatetime: null,
        endDatetime: null,
        message: 'Time slot not found.'
      };
    }

    const id = this._generateId('consultation_appointment');

    const appointment = {
      id: id,
      office_location_id: officeLocationId,
      consultation_time_slot_id: consultationTimeSlotId,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      contact_name: contactName,
      company: company || null,
      email: email,
      meeting_topic: meetingTopic,
      created_at: this._nowISOString()
    };

    appointments.push(appointment);

    // Mark slot as booked
    slot.is_booked = true;

    this._saveToStorage('consultation_appointments', appointments);
    this._saveToStorage('consultation_time_slots', slots);

    return {
      success: true,
      consultationAppointmentId: id,
      startDatetime: slot.start_datetime,
      endDatetime: slot.end_datetime,
      message: 'Consultation appointment confirmed.'
    };
  }

  // -------------------- Budget Calculator --------------------

  getBudgetCalculatorDefaults(eventType, attendeeCount, totalBudget) {
    // Simple heuristic defaults by event type
    let av = 25;
    let venue = 35;
    let food = 25;
    let decor = 10;
    let other = 5;

    if (eventType === 'executive_retreat' || eventType === 'leadership_retreat') {
      av = 30;
      venue = 35;
      food = 25;
      decor = 5;
      other = 5;
    } else if (eventType === 'sales_kickoff') {
      av = 35;
      venue = 30;
      food = 20;
      decor = 10;
      other = 5;
    }

    const total = av + venue + food + decor + other;
    if (total !== 100 && total > 0) {
      const ratio = 100 / total;
      av *= ratio;
      venue *= ratio;
      food *= ratio;
      decor *= ratio;
      other *= ratio;
    }

    return {
      avProductionPercent: av,
      venueLodgingPercent: venue,
      foodBeveragePercent: food,
      decorExperiencesPercent: decor,
      otherPercent: other
    };
  }

  saveBudgetPlan(eventType, attendeeCount, totalBudget, avProductionPercent, venueLodgingPercent, foodBeveragePercent, decorExperiencesPercent, otherPercent, name, email) {
    const allocations = this._calculateBudgetAllocations(totalBudget, {
      avProductionPercent: avProductionPercent,
      venueLodgingPercent: venueLodgingPercent,
      foodBeveragePercent: foodBeveragePercent,
      decorExperiencesPercent: decorExperiencesPercent,
      otherPercent: otherPercent
    });

    const plans = this._getFromStorage('budget_plans', []);
    const id = this._generateId('budget_plan');

    const record = {
      id: id,
      event_type: eventType,
      attendee_count: attendeeCount,
      total_budget: totalBudget,
      av_production_percent: allocations.avProductionPercent,
      av_production_amount: allocations.avProductionAmount,
      venue_lodging_percent: allocations.venueLodgingPercent,
      venue_lodging_amount: allocations.venueLodgingAmount,
      food_beverage_percent: allocations.foodBeveragePercent,
      food_beverage_amount: allocations.foodBeverageAmount,
      decor_experiences_percent: allocations.decorExperiencesPercent,
      decor_experiences_amount: allocations.decorExperiencesAmount,
      other_percent: allocations.otherPercent,
      other_amount: allocations.otherAmount,
      name: name,
      email: email,
      created_at: this._nowISOString()
    };

    plans.push(record);
    this._saveToStorage('budget_plans', plans);

    return {
      success: true,
      budgetPlanId: id,
      message: 'Budget plan saved.'
    };
  }

  // -------------------- Newsletter --------------------

  getNewsletterSignupOptions() {
    return {
      frequencies: [
        { value: 'quarterly_insights', label: 'Quarterly Insights' },
        { value: 'monthly_digest', label: 'Monthly Digest' },
        { value: 'weekly_updates', label: 'Weekly Updates' }
      ],
      roles: [
        { value: 'corporate_event_planner', label: 'Corporate Event Planner' },
        { value: 'marketing_manager', label: 'Marketing Manager' },
        { value: 'hr_leader', label: 'HR Leader' },
        { value: 'sales_leader', label: 'Sales Leader' },
        { value: 'executive_sponsor', label: 'Executive Sponsor' },
        { value: 'other', label: 'Other' }
      ],
      topics: [
        { value: 'leadership_retreats', label: 'Leadership Retreats' },
        { value: 'sales_kickoff_events', label: 'Sales Kickoff Events' },
        { value: 'conferences', label: 'Conferences' },
        { value: 'town_halls', label: 'Town Halls' },
        { value: 'roadshows', label: 'Roadshows' },
        { value: 'swag_programs', label: 'Swag Programs' },
        { value: 'product_launches', label: 'Product Launches' },
        { value: 'internal_meetings', label: 'Internal Meetings' }
      ]
    };
  }

  subscribeToNewsletter(email, frequency, role, topics) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions', []);
    const preferences = this._getFromStorage('newsletter_topic_preferences', []);

    const id = this._generateId('newsletter_subscription');

    const record = {
      id: id,
      email: email,
      frequency: frequency,
      role: role,
      created_at: this._nowISOString()
    };

    subscriptions.push(record);

    // Remove previous preferences for this subscription id (none expected, but safe)
    const newPreferences = preferences.filter(p => p.subscription_id !== id);

    if (Array.isArray(topics)) {
      for (let i = 0; i < topics.length; i++) {
        const topicValue = topics[i];
        newPreferences.push({
          id: this._generateId('newsletter_topic_preference'),
          subscription_id: id,
          topic: topicValue
        });
      }
    }

    this._saveToStorage('newsletter_subscriptions', subscriptions);
    this._saveToStorage('newsletter_topic_preferences', newPreferences);

    return {
      success: true,
      subscriptionId: id,
      message: 'Newsletter subscription saved.'
    };
  }

  // -------------------- Portfolio / Case Studies --------------------

  getPortfolioFilterOptions() {
    return {
      industries: [
        { value: 'technology', label: 'Technology' },
        { value: 'finance', label: 'Finance' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'retail', label: 'Retail' },
        { value: 'manufacturing', label: 'Manufacturing' },
        { value: 'other', label: 'Other' }
      ],
      attendee_count_ranges: [
        { value: 'under_100', label: 'Under 100 attendees' },
        { value: 'between_100_499', label: '100–499 attendees' },
        { value: 'over_500', label: '500+ attendees' }
      ],
      production_elements: [
        { value: 'led_video_wall', label: 'LED video wall' },
        { value: 'stage_lighting', label: 'Stage lighting' },
        { value: 'live_streaming', label: 'Live streaming' },
        { value: 'projection_mapping', label: 'Projection mapping' },
        { value: 'scenic_design', label: 'Scenic design' },
        { value: 'sound_system', label: 'Sound system' },
        { value: 'other', label: 'Other' }
      ]
    };
  }

  searchCaseStudies(industry, attendeeCountRange, requiredProductionElements, sortBy) {
    let studies = this._getFromStorage('case_studies', []);
    const elements = this._getFromStorage('case_study_production_elements', []);

    if (industry) {
      studies = studies.filter(c => c.industry === industry);
    }

    if (attendeeCountRange) {
      studies = studies.filter(c => c.attendee_count_range === attendeeCountRange);
    }

    if (requiredProductionElements && requiredProductionElements.length) {
      studies = studies.filter(c => {
        const caseElements = elements.filter(e => e.case_study_id === c.id);
        for (let i = 0; i < requiredProductionElements.length; i++) {
          const required = requiredProductionElements[i];
          const has = caseElements.some(e => e.element_type === required);
          if (!has) return false;
        }
        return true;
      });
    }

    if (sortBy === 'attendee_count_desc') {
      studies.sort((a, b) => {
        const aa = typeof a.attendee_count === 'number' ? a.attendee_count : 0;
        const bb = typeof b.attendee_count === 'number' ? b.attendee_count : 0;
        if (aa === bb) return 0;
        return aa > bb ? -1 : 1;
      });
    }

    // 'most_recent' not implemented because model has no date field; leave natural order
    return studies;
  }

  getCaseStudyDetails(caseStudyId) {
    const studies = this._getFromStorage('case_studies', []);
    const elements = this._getFromStorage('case_study_production_elements', []);

    const caseStudy = studies.find(c => c.id === caseStudyId) || null;
    const productionElements = elements.filter(e => e.case_study_id === caseStudyId);

    return {
      caseStudy: caseStudy,
      productionElements: productionElements
    };
  }

  getUserCollections() {
    return this._getFromStorage('collections', []);
  }

  saveCaseStudyToExistingCollection(collectionId, caseStudyId) {
    const collections = this._getFromStorage('collections', []);
    const items = this._getFromStorage('collection_items', []);

    const collectionExists = collections.some(c => c.id === collectionId);
    if (!collectionExists) {
      return {
        success: false,
        collectionItemId: null,
        message: 'Collection not found.'
      };
    }

    const id = this._generateId('collection_item');
    const record = {
      id: id,
      collection_id: collectionId,
      case_study_id: caseStudyId,
      saved_at: this._nowISOString()
    };

    items.push(record);
    this._saveToStorage('collection_items', items);

    return {
      success: true,
      collectionItemId: id,
      message: 'Case study saved to collection.'
    };
  }

  createCollectionAndSaveCaseStudy(collectionName, caseStudyId) {
    const collections = this._getFromStorage('collections', []);
    const items = this._getFromStorage('collection_items', []);

    const collectionId = this._generateId('collection');
    const collection = {
      id: collectionId,
      name: collectionName,
      created_at: this._nowISOString()
    };

    collections.push(collection);

    const collectionItemId = this._generateId('collection_item');
    const item = {
      id: collectionItemId,
      collection_id: collectionId,
      case_study_id: caseStudyId,
      saved_at: this._nowISOString()
    };

    items.push(item);

    this._saveToStorage('collections', collections);
    this._saveToStorage('collection_items', items);

    return {
      success: true,
      collectionId: collectionId,
      collectionItemId: collectionItemId,
      message: 'Collection created and case study saved.'
    };
  }

  // -------------------- About Page --------------------

  getAboutPageContent() {
    // Allow override from storage if present
    const stored = this._getFromStorage('about_page_content', null);
    if (stored) return stored;

    return {
      headline: 'Corporate Event Production & Promotions Agency',
      mission: 'We design and deliver high-impact conferences, town halls, roadshows, and brand experiences that align global teams and move business outcomes.',
      services_overview: 'From leadership summits and sales kickoffs to product launches, galas, and multi-city tours, our producers, creatives, and technical teams handle every detail—strategy, content, staging, AV, streaming, and attendee engagement.'
    };
  }

  getAboutTrustSignals() {
    const stored = this._getFromStorage('about_trust_signals', null);
    if (stored) return stored;

    return {
      client_logos: [],
      testimonials: [],
      certifications: []
    };
  }

  getAboutContactInfo() {
    const stored = this._getFromStorage('about_contact_info', null);
    if (stored) return stored;

    const offices = this._getFromStorage('office_locations', []);
    const primaryOffice = offices.length ? offices[0] : null;

    return {
      primary_phone: '',
      primary_email: '',
      primary_office: primaryOffice
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