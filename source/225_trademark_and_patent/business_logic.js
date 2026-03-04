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

  // -------------------------
  // Storage helpers
  // -------------------------

  _initStorage() {
    // Core id counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Entity tables (arrays)
    const arrayKeys = [
      'trademark_filing_packages',
      'trademark_search_packages',
      'trademark_monitoring_plans',
      'patent_filing_options',
      'consultation_types',
      'consultation_time_slots',
      'patents',
      'watchlists',
      'trademark_records',
      'trademark_renewal_options',
      'trademark_drafts',
      'trademark_search_orders',
      'trademark_monitoring_setups',
      'patent_drafts',
      'consultation_bookings',
      'patent_search_queries',
      'watchlist_items',
      'cart_items',
      'orders',
      'order_items'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Single cart object (or null)
    if (!localStorage.getItem('cart')) {
      localStorage.setItem('cart', 'null');
    }

    // Content / config objects with safe empty defaults
    if (!localStorage.getItem('home_content')) {
      this._saveToStorage('home_content', {
        hero: {
          title: '',
          subtitle: '',
          primaryCtaLabel: '',
          primaryCtaTargetPage: '',
          secondaryCtaLabel: '',
          secondaryCtaTargetPage: ''
        },
        serviceHighlights: [],
        highlightedJourneys: [],
        quickLinks: []
      });
    }

    if (!localStorage.getItem('trademark_services_overview')) {
      this._saveToStorage('trademark_services_overview', {
        introText: '',
        serviceBlocks: [],
        featuredFilingPackages: [],
        hasStartNewTrademarkCta: true
      });
    }

    if (!localStorage.getItem('trademark_application_form_config')) {
      this._saveToStorage('trademark_application_form_config', {
        markTypes: [
          {
            code: 'word_mark',
            label: 'Word mark',
            description: 'Protect the word or phrase regardless of stylization.'
          },
          {
            code: 'logo_design_mark',
            label: 'Logo / design mark',
            description: 'Protect stylized logos or design elements.'
          }
        ],
        goodsServicesCategories: [
          { code: 'clothing_apparel_and_footwear', label: 'Clothing, apparel, and footwear' },
          { code: 'home_goods_and_decor', label: 'Home goods and decor' },
          { code: 'cosmetics_and_skincare', label: 'Cosmetics and skincare' },
          { code: 'energy_and_environmental_services', label: 'Energy and environmental services' },
          { code: 'other', label: 'Other' }
        ],
        defaultJurisdiction: 'united_states'
      });
    }

    if (!localStorage.getItem('trademark_search_page_config')) {
      this._saveToStorage('trademark_search_page_config', {
        territoryOptions: [
          { code: 'united_states', label: 'United States' },
          { code: 'european_union', label: 'European Union' }
        ],
        defaultTerritories: ['united_states']
      });
    }

    if (!localStorage.getItem('trademark_monitoring_page_config')) {
      this._saveToStorage('trademark_monitoring_page_config', {
        jurisdictionOptions: [
          { code: 'united_states_only', label: 'United States only' },
          { code: 'north_america', label: 'North America' },
          { code: 'european_union_only', label: 'European Union only' },
          { code: 'worldwide', label: 'Worldwide' }
        ],
        billingFrequencies: [
          { code: 'monthly', label: 'Monthly billing' },
          { code: 'annual', label: 'Annual billing' }
        ]
      });
    }

    if (!localStorage.getItem('patent_services_overview')) {
      this._saveToStorage('patent_services_overview', {
        introText: '',
        serviceBlocks: []
      });
    }

    if (!localStorage.getItem('patent_application_form_config')) {
      this._saveToStorage('patent_application_form_config', {
        patentTypes: [
          { code: 'utility', label: 'Utility patent' },
          { code: 'design', label: 'Design patent' }
        ],
        applicationTypes: [
          { code: 'provisional', label: 'Provisional application' },
          { code: 'non_provisional', label: 'Non-provisional application' }
        ]
      });
    }

    if (!localStorage.getItem('consultations_overview')) {
      this._saveToStorage('consultations_overview', {
        // Only consultationTypes is required by interface
        consultationTypes: []
      });
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || typeof raw === 'undefined') {
      return typeof defaultValue !== 'undefined' ? defaultValue : null;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : null;
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

  // -------------------------
  // Private helpers (business)
  // -------------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    const now = new Date().toISOString();
    if (!cart || !cart.id) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        createdAt: now,
        updatedAt: now
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _getCurrentOrderDraft() {
    let currentOrderId = this._getFromStorage('current_order_id', null);
    let orders = this._getFromStorage('orders', []);
    let order = null;

    if (currentOrderId) {
      order = orders.find((o) => o.id === currentOrderId && o.status === 'draft') || null;
    }

    if (!order) {
      const now = new Date().toISOString();
      order = {
        id: this._generateId('order'),
        status: 'draft',
        currency: 'USD',
        subtotal: 0,
        tax: 0,
        total: 0,
        items: [],
        createdAt: now,
        updatedAt: now
      };
      orders.push(order);
      this._saveToStorage('orders', orders);
      this._saveToStorage('current_order_id', order.id);
    }

    return order;
  }

  _calculateTrademarkPackageEligibility(draft, pkg) {
    if (!pkg || pkg.isActive === false) return false;

    // Mark type compatibility
    if (Array.isArray(pkg.supportedMarkTypes) && pkg.supportedMarkTypes.length > 0) {
      if (!pkg.supportedMarkTypes.includes(draft.markType)) {
        return false;
      }
    }

    // Additional eligibility rules can be added here (e.g., jurisdiction or category)

    return true;
  }

  _filterMonitoringPlansByMarks(plans, jurisdiction, numberOfTrademarks, desiredDurationMonths) {
    return plans.filter((plan) => {
      if (!plan.isActive) return false;
      if (plan.supportedJurisdiction !== jurisdiction) return false;
      if (numberOfTrademarks < plan.minMarks || numberOfTrademarks > plan.maxMarks) return false;
      if (typeof desiredDurationMonths === 'number' && plan.durationMonths !== desiredDurationMonths) return false;
      return true;
    });
  }

  _enrichCartItemsForDisplay(cart, cartItems) {
    const trademarkDrafts = this._getFromStorage('trademark_drafts', []);
    const patentDrafts = this._getFromStorage('patent_drafts', []);
    const monitoringSetups = this._getFromStorage('trademark_monitoring_setups', []);
    const searchOrders = this._getFromStorage('trademark_search_orders', []);
    const consultationBookings = this._getFromStorage('consultation_bookings', []);

    const filingPackages = this._getFromStorage('trademark_filing_packages', []);
    const monitoringPlans = this._getFromStorage('trademark_monitoring_plans', []);
    const searchPackages = this._getFromStorage('trademark_search_packages', []);
    const patentFilingOptions = this._getFromStorage('patent_filing_options', []);
    const consultationTypes = this._getFromStorage('consultation_types', []);

    const items = cartItems.map((ci) => {
      let displayLabel = ''; 
      let reference = null;

      if (ci.serviceType === 'trademark_filing') {
        reference = trademarkDrafts.find((d) => d.id === ci.referenceId) || null;
        const pkg = reference && reference.selectedPackageId
          ? filingPackages.find((p) => p.id === reference.selectedPackageId) || null
          : null;
        const brandName = reference ? reference.brandName : 'Trademark filing';
        displayLabel = 'Trademark filing: ' + brandName;
        if (pkg && pkg.name) {
          displayLabel += ' (' + pkg.name + ')';
        }
      } else if (ci.serviceType === 'patent_filing') {
        reference = patentDrafts.find((d) => d.id === ci.referenceId) || null;
        const option = reference && reference.selectedFilingOptionId
          ? patentFilingOptions.find((o) => o.id === reference.selectedFilingOptionId) || null
          : null;
        const title = reference ? reference.inventionTitle : 'Patent filing';
        displayLabel = 'Patent filing: ' + title;
        if (option && option.name) {
          displayLabel += ' (' + option.name + ')';
        }
      } else if (ci.serviceType === 'trademark_monitoring') {
        reference = monitoringSetups.find((m) => m.id === ci.referenceId) || null;
        const plan = reference && reference.planId
          ? monitoringPlans.find((p) => p.id === reference.planId) || null
          : null;
        const marks = reference && Array.isArray(reference.marks) ? reference.marks.join(', ') : '';
        displayLabel = 'Trademark monitoring';
        if (marks) displayLabel += ': ' + marks;
        if (plan && plan.name) displayLabel += ' (' + plan.name + ')';
      } else if (ci.serviceType === 'trademark_search') {
        reference = searchOrders.find((s) => s.id === ci.referenceId) || null;
        const pkg = reference && reference.packageId
          ? searchPackages.find((p) => p.id === reference.packageId) || null
          : null;
        const mark = reference ? reference.markName : 'Trademark search';
        displayLabel = 'Trademark search: ' + mark;
        if (pkg && pkg.name) displayLabel += ' (' + pkg.name + ')';
      } else if (ci.serviceType === 'consultation') {
        reference = consultationBookings.find((b) => b.id === ci.referenceId) || null;
        const type = reference && reference.consultationTypeId
          ? consultationTypes.find((t) => t.id === reference.consultationTypeId) || null
          : null;
        displayLabel = 'Consultation';
        if (type && type.name) displayLabel += ': ' + type.name;
      } else {
        displayLabel = ci.description || 'Service item';
      }

      return {
        cartItem: ci,
        displayLabel: displayLabel,
        serviceType: ci.serviceType,
        serviceFee: ci.serviceFee,
        governmentFee: ci.governmentFee || 0,
        totalPrice: ci.totalPrice || (ci.serviceFee + (ci.governmentFee || 0)),
        // Foreign key resolution for referenceId
        reference: reference
      };
    });

    const totalServiceFees = items.reduce((sum, it) => sum + (it.serviceFee || 0), 0);
    const totalGovernmentFees = items.reduce((sum, it) => sum + (it.governmentFee || 0), 0);

    return {
      cart: cart,
      items: items,
      totalServiceFees: totalServiceFees,
      totalGovernmentFees: totalGovernmentFees,
      grandTotal: totalServiceFees + totalGovernmentFees
    };
  }

  _enrichOrderItemsForDisplay(order, orderItems) {
    const trademarkDrafts = this._getFromStorage('trademark_drafts', []);
    const patentDrafts = this._getFromStorage('patent_drafts', []);
    const monitoringSetups = this._getFromStorage('trademark_monitoring_setups', []);
    const searchOrders = this._getFromStorage('trademark_search_orders', []);
    const consultationBookings = this._getFromStorage('consultation_bookings', []);
    const trademarks = this._getFromStorage('trademark_records', []);

    const filingPackages = this._getFromStorage('trademark_filing_packages', []);
    const monitoringPlans = this._getFromStorage('trademark_monitoring_plans', []);
    const searchPackages = this._getFromStorage('trademark_search_packages', []);
    const patentFilingOptions = this._getFromStorage('patent_filing_options', []);
    const consultationTypes = this._getFromStorage('consultation_types', []);
    const renewalOptions = this._getFromStorage('trademark_renewal_options', []);

    const items = orderItems.map((oi) => {
      let displayLabel = '';
      let reference = null;
      const referenceSummary = {
        markName: undefined,
        inventionTitle: undefined,
        serviceDescription: undefined
      };

      if (oi.serviceType === 'trademark_filing') {
        reference = trademarkDrafts.find((d) => d.id === oi.referenceId) || null;
        const pkg = reference && reference.selectedPackageId
          ? filingPackages.find((p) => p.id === reference.selectedPackageId) || null
          : null;
        const brandName = reference ? reference.brandName : 'Trademark filing';
        displayLabel = 'Trademark filing: ' + brandName;
        if (pkg && pkg.name) displayLabel += ' (' + pkg.name + ')';
        referenceSummary.markName = brandName;
        referenceSummary.serviceDescription = 'Trademark filing';
      } else if (oi.serviceType === 'patent_filing') {
        reference = patentDrafts.find((d) => d.id === oi.referenceId) || null;
        const option = reference && reference.selectedFilingOptionId
          ? patentFilingOptions.find((o) => o.id === reference.selectedFilingOptionId) || null
          : null;
        const title = reference ? reference.inventionTitle : 'Patent filing';
        displayLabel = 'Patent filing: ' + title;
        if (option && option.name) displayLabel += ' (' + option.name + ')';
        referenceSummary.inventionTitle = title;
        referenceSummary.serviceDescription = 'Patent filing';
      } else if (oi.serviceType === 'trademark_monitoring') {
        reference = monitoringSetups.find((m) => m.id === oi.referenceId) || null;
        const plan = reference && reference.planId
          ? monitoringPlans.find((p) => p.id === reference.planId) || null
          : null;
        const marks = reference && Array.isArray(reference.marks) ? reference.marks.join(', ') : '';
        displayLabel = 'Trademark monitoring';
        if (marks) displayLabel += ': ' + marks;
        if (plan && plan.name) displayLabel += ' (' + plan.name + ')';
        referenceSummary.serviceDescription = 'Trademark monitoring';
      } else if (oi.serviceType === 'trademark_search') {
        reference = searchOrders.find((s) => s.id === oi.referenceId) || null;
        const pkg = reference && reference.packageId
          ? searchPackages.find((p) => p.id === reference.packageId) || null
          : null;
        const mark = reference ? reference.markName : 'Trademark search';
        displayLabel = 'Trademark search: ' + mark;
        if (pkg && pkg.name) displayLabel += ' (' + pkg.name + ')';
        referenceSummary.markName = mark;
        referenceSummary.serviceDescription = 'Trademark search';
      } else if (oi.serviceType === 'trademark_renewal') {
        const option = renewalOptions.find((r) => r.id === oi.referenceId) || null;
        if (option) {
          reference = option;
          const tm = trademarks.find((t) => t.id === option.trademarkId) || null;
          const markName = tm ? tm.markName : 'Trademark renewal';
          displayLabel = 'Trademark renewal: ' + markName;
          referenceSummary.markName = markName;
          referenceSummary.serviceDescription = 'Trademark renewal';
        } else {
          displayLabel = oi.description || 'Trademark renewal';
        }
      } else if (oi.serviceType === 'consultation') {
        reference = consultationBookings.find((b) => b.id === oi.referenceId) || null;
        const type = reference && reference.consultationTypeId
          ? consultationTypes.find((t) => t.id === reference.consultationTypeId) || null
          : null;
        displayLabel = 'Consultation';
        if (type && type.name) displayLabel += ': ' + type.name;
        referenceSummary.serviceDescription = 'Consultation';
      } else {
        displayLabel = oi.description || 'Service item';
      }

      return {
        orderItem: oi,
        displayLabel: displayLabel,
        serviceType: oi.serviceType,
        referenceSummary: referenceSummary,
        // Foreign key resolution for referenceId
        reference: reference
      };
    });

    return {
      order: order,
      items: items
    };
  }

  // -------------------------
  // Interface implementations
  // -------------------------

  // getHomeContent
  getHomeContent() {
    return this._getFromStorage('home_content', {
      hero: {
        title: '',
        subtitle: '',
        primaryCtaLabel: '',
        primaryCtaTargetPage: '',
        secondaryCtaLabel: '',
        secondaryCtaTargetPage: ''
      },
      serviceHighlights: [],
      highlightedJourneys: [],
      quickLinks: []
    });
  }

  // getTrademarkServicesOverview
  getTrademarkServicesOverview() {
    const overview = this._getFromStorage('trademark_services_overview', {
      introText: '',
      serviceBlocks: [],
      featuredFilingPackages: [],
      hasStartNewTrademarkCta: true
    });

    // Ensure featuredFilingPackages are full objects from trademark_filing_packages if they are ids
    const allPackages = this._getFromStorage('trademark_filing_packages', []);
    if (Array.isArray(overview.featuredFilingPackages) && overview.featuredFilingPackages.length > 0) {
      if (typeof overview.featuredFilingPackages[0] === 'string') {
        overview.featuredFilingPackages = overview.featuredFilingPackages
          .map((id) => allPackages.find((p) => p.id === id))
          .filter((p) => !!p);
      }
    }

    return overview;
  }

  // getTrademarkApplicationFormConfig
  getTrademarkApplicationFormConfig() {
    return this._getFromStorage('trademark_application_form_config', {
      markTypes: [],
      goodsServicesCategories: [],
      defaultJurisdiction: 'united_states'
    });
  }

  // saveTrademarkDraft
  saveTrademarkDraft(trademarkDraftId, brandName, markType, goodsServicesCategory, logoImageUrl, notes) {
    let drafts = this._getFromStorage('trademark_drafts', []);
    const now = new Date().toISOString();
    let draft;

    if (trademarkDraftId) {
      draft = drafts.find((d) => d.id === trademarkDraftId) || null;
      if (!draft) {
        // If not found, create new
        draft = {
          id: trademarkDraftId,
          brandName: brandName,
          markType: markType,
          goodsServicesCategory: goodsServicesCategory,
          logoImageUrl: logoImageUrl || null,
          selectedPackageId: null,
          brandAvailabilityChecked: false,
          brandAvailabilityStatus: 'not_checked',
          status: 'draft',
          notes: notes || null,
          createdAt: now,
          updatedAt: now
        };
        drafts.push(draft);
      } else {
        draft.brandName = brandName;
        draft.markType = markType;
        draft.goodsServicesCategory = goodsServicesCategory;
        draft.logoImageUrl = logoImageUrl || null;
        draft.notes = notes || draft.notes || null;
        draft.updatedAt = now;
      }
    } else {
      draft = {
        id: this._generateId('trademark_draft'),
        brandName: brandName,
        markType: markType,
        goodsServicesCategory: goodsServicesCategory,
        logoImageUrl: logoImageUrl || null,
        selectedPackageId: null,
        brandAvailabilityChecked: false,
        brandAvailabilityStatus: 'not_checked',
        status: 'draft',
        notes: notes || null,
        createdAt: now,
        updatedAt: now
      };
      drafts.push(draft);
    }

    this._saveToStorage('trademark_drafts', drafts);
    return draft;
  }

  // getTrademarkDraftDetails
  getTrademarkDraftDetails(trademarkDraftId) {
    const drafts = this._getFromStorage('trademark_drafts', []);
    const draft = drafts.find((d) => d.id === trademarkDraftId) || null;
    if (!draft) return null;

    const packages = this._getFromStorage('trademark_filing_packages', []);
    const selectedPackage = draft.selectedPackageId
      ? packages.find((p) => p.id === draft.selectedPackageId) || null
      : null;

    // Foreign key resolution for selectedPackageId
    return Object.assign({}, draft, {
      selectedPackage: selectedPackage
    });
  }

  // checkTrademarkAvailability
  checkTrademarkAvailability(trademarkDraftId) {
    let drafts = this._getFromStorage('trademark_drafts', []);
    const records = this._getFromStorage('trademark_records', []);

    const draftIndex = drafts.findIndex((d) => d.id === trademarkDraftId);
    if (draftIndex === -1) {
      return {
        draft: null,
        availabilityStatus: 'not_checked',
        conflictSummary: 'Draft not found.'
      };
    }

    const draft = drafts[draftIndex];
    const normalizedName = (draft.brandName || '').trim().toLowerCase();

    const conflicts = records.filter((r) => {
      const name = (r.markName || '').trim().toLowerCase();
      if (!name) return false;
      if (name !== normalizedName) return false;
      // Consider only active or pending in US for basic check
      return (
        (r.status === 'active' || r.status === 'pending') &&
        r.primaryJurisdiction === 'united_states'
      );
    });

    let status = 'clear';
    let conflictSummary = 'No conflicting trademarks found.';

    if (conflicts.length > 0) {
      status = 'possible_conflicts';
      conflictSummary = 'Found ' + conflicts.length + ' existing trademarks with the same name.';
    }

    draft.brandAvailabilityChecked = true;
    draft.brandAvailabilityStatus = status;
    draft.updatedAt = new Date().toISOString();
    drafts[draftIndex] = draft;
    this._saveToStorage('trademark_drafts', drafts);

    return {
      draft: draft,
      availabilityStatus: status,
      conflictSummary: conflictSummary
    };
  }

  // getTrademarkFilingPackagesForDraft
  getTrademarkFilingPackagesForDraft(trademarkDraftId) {
    const drafts = this._getFromStorage('trademark_drafts', []);
    const draft = drafts.find((d) => d.id === trademarkDraftId) || null;
    if (!draft) return [];

    const packages = this._getFromStorage('trademark_filing_packages', []);
    return packages.filter((pkg) => this._calculateTrademarkPackageEligibility(draft, pkg));
  }

  // selectTrademarkFilingPackageForDraft
  selectTrademarkFilingPackageForDraft(trademarkDraftId, packageId) {
    let drafts = this._getFromStorage('trademark_drafts', []);
    const packages = this._getFromStorage('trademark_filing_packages', []);

    const draftIndex = drafts.findIndex((d) => d.id === trademarkDraftId);
    if (draftIndex === -1) {
      return { draft: null, selectedPackage: null };
    }

    const pkg = packages.find((p) => p.id === packageId) || null;
    const draft = drafts[draftIndex];
    draft.selectedPackageId = packageId;
    draft.updatedAt = new Date().toISOString();
    drafts[draftIndex] = draft;
    this._saveToStorage('trademark_drafts', drafts);

    return {
      draft: Object.assign({}, draft, { selectedPackage: pkg }),
      selectedPackage: pkg
    };
  }

  // addTrademarkFilingToCart
  addTrademarkFilingToCart(trademarkDraftId) {
    const drafts = this._getFromStorage('trademark_drafts', []);
    const packages = this._getFromStorage('trademark_filing_packages', []);
    let cartItems = this._getFromStorage('cart_items', []);

    const draft = drafts.find((d) => d.id === trademarkDraftId) || null;
    if (!draft) {
      return { success: false, cart: null, addedItem: null, message: 'Trademark draft not found.' };
    }
    if (!draft.selectedPackageId) {
      return { success: false, cart: null, addedItem: null, message: 'No filing package selected for this draft.' };
    }

    const pkg = packages.find((p) => p.id === draft.selectedPackageId) || null;
    if (!pkg) {
      return { success: false, cart: null, addedItem: null, message: 'Selected filing package not found.' };
    }

    const cart = this._getOrCreateCart();
    const now = new Date().toISOString();

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      serviceType: 'trademark_filing',
      referenceId: draft.id,
      description: 'Trademark filing for ' + draft.brandName,
      serviceFee: pkg.serviceFee,
      governmentFee: pkg.governmentFee,
      totalPrice: pkg.totalPrice || (pkg.serviceFee + pkg.governmentFee),
      billingFrequency: 'one_time',
      durationMonths: pkg.defaultMonitoringDurationMonths || null,
      quantity: 1
    };

    cartItems.push(cartItem);
    cart.items = cart.items || [];
    cart.items.push(cartItem.id);
    cart.updatedAt = now;

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', cart);

    return {
      success: true,
      cart: cart,
      addedItem: cartItem,
      message: 'Trademark filing added to cart.'
    };
  }

  // getTrademarkSearchPageConfig
  getTrademarkSearchPageConfig() {
    return this._getFromStorage('trademark_search_page_config', {
      territoryOptions: [],
      defaultTerritories: []
    });
  }

  // getTrademarkSearchPackages
  getTrademarkSearchPackages(territories) {
    const packages = this._getFromStorage('trademark_search_packages', []);
    const territoriesArr = Array.isArray(territories) ? territories : [];

    if (territoriesArr.length === 0) {
      return packages.filter((p) => p.isActive !== false);
    }

    return packages.filter((p) => {
      if (p.isActive === false) return false;
      if (!Array.isArray(p.territories) || p.territories.length === 0) return true;
      // Require that all selected territories are covered by the package
      return territoriesArr.every((t) => p.territories.indexOf(t) !== -1);
    });
  }

  // createTrademarkSearchOrder
  createTrademarkSearchOrder(markName, selectedTerritories, packageId) {
    let orders = this._getFromStorage('trademark_search_orders', []);
    const now = new Date().toISOString();

    const order = {
      id: this._generateId('tm_search_order'),
      markName: markName,
      selectedTerritories: Array.isArray(selectedTerritories) ? selectedTerritories : [],
      packageId: packageId,
      industryCategory: 'other',
      status: 'draft',
      createdAt: now,
      updatedAt: now
    };

    orders.push(order);
    this._saveToStorage('trademark_search_orders', orders);

    return order;
  }

  // getTrademarkSearchOrderDetails
  getTrademarkSearchOrderDetails(trademarkSearchOrderId) {
    const orders = this._getFromStorage('trademark_search_orders', []);
    const packages = this._getFromStorage('trademark_search_packages', []);

    const order = orders.find((o) => o.id === trademarkSearchOrderId) || null;
    if (!order) {
      return { order: null, package: null };
    }

    const pkg = packages.find((p) => p.id === order.packageId) || null;

    // Foreign key resolution for packageId inside order
    const enrichedOrder = Object.assign({}, order, { package: pkg });

    return {
      order: enrichedOrder,
      package: pkg
    };
  }

  // updateTrademarkSearchOrderDetails
  updateTrademarkSearchOrderDetails(trademarkSearchOrderId, industryCategory, notes) {
    let orders = this._getFromStorage('trademark_search_orders', []);
    const idx = orders.findIndex((o) => o.id === trademarkSearchOrderId);
    if (idx === -1) return null;

    const now = new Date().toISOString();
    const order = orders[idx];
    order.industryCategory = industryCategory;
    if (typeof notes !== 'undefined') {
      order.notes = notes;
    }
    order.updatedAt = now;
    orders[idx] = order;
    this._saveToStorage('trademark_search_orders', orders);
    return order;
  }

  // getTrademarkMonitoringPageConfig
  getTrademarkMonitoringPageConfig() {
    return this._getFromStorage('trademark_monitoring_page_config', {
      jurisdictionOptions: [],
      billingFrequencies: []
    });
  }

  // getTrademarkMonitoringPlans
  getTrademarkMonitoringPlans(jurisdiction, numberOfTrademarks, desiredDurationMonths) {
    const plans = this._getFromStorage('trademark_monitoring_plans', []);
    return this._filterMonitoringPlansByMarks(plans, jurisdiction, numberOfTrademarks, desiredDurationMonths);
  }

  // configureTrademarkMonitoringSetup
  configureTrademarkMonitoringSetup(monitoringSetupId, numberOfTrademarks, marks, jurisdiction, planId, billingFrequency) {
    let setups = this._getFromStorage('trademark_monitoring_setups', []);
    const now = new Date().toISOString();
    let setup;

    if (monitoringSetupId) {
      const idx = setups.findIndex((s) => s.id === monitoringSetupId);
      if (idx !== -1) {
        setup = setups[idx];
        setup.numberOfTrademarks = numberOfTrademarks;
        setup.marks = Array.isArray(marks) ? marks : [];
        setup.jurisdiction = jurisdiction;
        setup.planId = planId;
        setup.billingFrequency = billingFrequency;
        setup.updatedAt = now;
        setups[idx] = setup;
      } else {
        setup = {
          id: monitoringSetupId,
          numberOfTrademarks: numberOfTrademarks,
          marks: Array.isArray(marks) ? marks : [],
          jurisdiction: jurisdiction,
          planId: planId,
          billingFrequency: billingFrequency,
          status: 'draft',
          createdAt: now,
          updatedAt: now
        };
        setups.push(setup);
      }
    } else {
      setup = {
        id: this._generateId('tm_monitoring_setup'),
        numberOfTrademarks: numberOfTrademarks,
        marks: Array.isArray(marks) ? marks : [],
        jurisdiction: jurisdiction,
        planId: planId,
        billingFrequency: billingFrequency,
        status: 'draft',
        createdAt: now,
        updatedAt: now
      };
      setups.push(setup);
    }

    this._saveToStorage('trademark_monitoring_setups', setups);
    return setup;
  }

  // getPatentServicesOverview
  getPatentServicesOverview() {
    return this._getFromStorage('patent_services_overview', {
      introText: '',
      serviceBlocks: []
    });
  }

  // getPatentApplicationFormConfig
  getPatentApplicationFormConfig() {
    return this._getFromStorage('patent_application_form_config', {
      patentTypes: [],
      applicationTypes: []
    });
  }

  // savePatentDraft
  savePatentDraft(patentDraftId, inventionTitle, patentType, applicationType, numberOfInventors, shortDescription) {
    let drafts = this._getFromStorage('patent_drafts', []);
    const now = new Date().toISOString();
    let draft;

    if (patentDraftId) {
      const idx = drafts.findIndex((d) => d.id === patentDraftId);
      if (idx !== -1) {
        draft = drafts[idx];
        draft.inventionTitle = inventionTitle;
        draft.patentType = patentType;
        draft.applicationType = applicationType;
        draft.numberOfInventors = numberOfInventors;
        draft.shortDescription = shortDescription || draft.shortDescription || null;
        draft.updatedAt = now;
        drafts[idx] = draft;
      } else {
        draft = {
          id: patentDraftId,
          inventionTitle: inventionTitle,
          patentType: patentType,
          applicationType: applicationType,
          selectedFilingOptionId: null,
          numberOfInventors: numberOfInventors,
          shortDescription: shortDescription || null,
          status: 'draft',
          createdAt: now,
          updatedAt: now
        };
        drafts.push(draft);
      }
    } else {
      draft = {
        id: this._generateId('patent_draft'),
        inventionTitle: inventionTitle,
        patentType: patentType,
        applicationType: applicationType,
        selectedFilingOptionId: null,
        numberOfInventors: numberOfInventors,
        shortDescription: shortDescription || null,
        status: 'draft',
        createdAt: now,
        updatedAt: now
      };
      drafts.push(draft);
    }

    this._saveToStorage('patent_drafts', drafts);
    return draft;
  }

  // getPatentDraftDetails
  getPatentDraftDetails(patentDraftId) {
    const drafts = this._getFromStorage('patent_drafts', []);
    const draft = drafts.find((d) => d.id === patentDraftId) || null;
    if (!draft) return null;

    const options = this._getFromStorage('patent_filing_options', []);
    const selectedOption = draft.selectedFilingOptionId
      ? options.find((o) => o.id === draft.selectedFilingOptionId) || null
      : null;

    // Foreign key resolution for selectedFilingOptionId
    return Object.assign({}, draft, {
      selectedFilingOption: selectedOption
    });
  }

  // getPatentFilingOptions
  getPatentFilingOptions(patentType, applicationType) {
    const options = this._getFromStorage('patent_filing_options', []);
    return options.filter((o) => {
      if (o.isActive === false) return false;
      if (o.patentType !== patentType) return false;
      if (applicationType && o.applicationType !== applicationType) return false;
      return true;
    });
  }

  // selectPatentFilingOptionForDraft
  selectPatentFilingOptionForDraft(patentDraftId, patentFilingOptionId) {
    let drafts = this._getFromStorage('patent_drafts', []);
    const options = this._getFromStorage('patent_filing_options', []);

    const idx = drafts.findIndex((d) => d.id === patentDraftId);
    if (idx === -1) {
      return { draft: null, selectedFilingOption: null };
    }

    const draft = drafts[idx];
    draft.selectedFilingOptionId = patentFilingOptionId;
    draft.updatedAt = new Date().toISOString();
    drafts[idx] = draft;
    this._saveToStorage('patent_drafts', drafts);

    const option = options.find((o) => o.id === patentFilingOptionId) || null;

    return {
      draft: Object.assign({}, draft, { selectedFilingOption: option }),
      selectedFilingOption: option
    };
  }

  // addPatentFilingToCart
  addPatentFilingToCart(patentDraftId) {
    const drafts = this._getFromStorage('patent_drafts', []);
    const options = this._getFromStorage('patent_filing_options', []);
    let cartItems = this._getFromStorage('cart_items', []);

    const draft = drafts.find((d) => d.id === patentDraftId) || null;
    if (!draft) {
      return { success: false, cart: null, addedItem: null, message: 'Patent draft not found.' };
    }
    if (!draft.selectedFilingOptionId) {
      return { success: false, cart: null, addedItem: null, message: 'No filing option selected for this draft.' };
    }

    const option = options.find((o) => o.id === draft.selectedFilingOptionId) || null;
    if (!option) {
      return { success: false, cart: null, addedItem: null, message: 'Selected filing option not found.' };
    }

    const cart = this._getOrCreateCart();
    const now = new Date().toISOString();

    const cartItem = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      serviceType: 'patent_filing',
      referenceId: draft.id,
      description: 'Patent filing for ' + draft.inventionTitle,
      serviceFee: option.serviceFee,
      governmentFee: option.governmentFee,
      totalPrice: option.totalPrice || (option.serviceFee + option.governmentFee),
      billingFrequency: 'one_time',
      durationMonths: null,
      quantity: 1
    };

    cartItems.push(cartItem);
    cart.items = cart.items || [];
    cart.items.push(cartItem.id);
    cart.updatedAt = now;

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', cart);

    return {
      success: true,
      cart: cart,
      addedItem: cartItem,
      message: 'Patent filing added to cart.'
    };
  }

  // getConsultationsOverview
  getConsultationsOverview() {
    // Interface specifies only consultationTypes are required
    const types = this._getFromStorage('consultation_types', []);
    return {
      consultationTypes: types.filter((t) => t.isActive !== false)
    };
  }

  // getConsultationTimeSlotsForWeek
  getConsultationTimeSlotsForWeek(consultationTypeId, weekStartDate, weekEndDate) {
    const slots = this._getFromStorage('consultation_time_slots', []);
    const types = this._getFromStorage('consultation_types', []);
    const type = types.find((t) => t.id === consultationTypeId) || null;

    const start = new Date(weekStartDate + 'T00:00:00Z').getTime();
    const end = new Date(weekEndDate + 'T23:59:59Z').getTime();

    const filtered = slots.filter((slot) => {
      if (slot.consultationTypeId !== consultationTypeId) return false;
      const slotStart = new Date(slot.startDateTime).getTime();
      return slotStart >= start && slotStart <= end;
    });

    // Foreign key resolution for consultationTypeId
    return filtered.map((slot) => Object.assign({}, slot, { consultationType: type }));
  }

  // saveConsultationBookingDraft
  saveConsultationBookingDraft(consultationBookingId, consultationTypeId, timeSlotId, durationMinutes, format, contactName, contactEmail, country) {
    let bookings = this._getFromStorage('consultation_bookings', []);
    const slots = this._getFromStorage('consultation_time_slots', []);

    const slot = slots.find((s) => s.id === timeSlotId) || null;
    const now = new Date().toISOString();

    let booking;
    if (consultationBookingId) {
      const idx = bookings.findIndex((b) => b.id === consultationBookingId);
      if (idx !== -1) {
        booking = bookings[idx];
        booking.consultationTypeId = consultationTypeId;
        booking.timeSlotId = timeSlotId;
        booking.durationMinutes = durationMinutes;
        booking.scheduledStart = slot ? slot.startDateTime : booking.scheduledStart;
        booking.scheduledEnd = slot ? slot.endDateTime : booking.scheduledEnd;
        booking.timeZone = slot ? slot.timeZone : booking.timeZone;
        booking.format = format;
        booking.contactName = contactName;
        booking.contactEmail = contactEmail;
        booking.country = country;
        booking.status = 'draft';
        booking.updatedAt = now;
        bookings[idx] = booking;
      } else {
        booking = {
          id: consultationBookingId,
          consultationTypeId: consultationTypeId,
          timeSlotId: timeSlotId,
          durationMinutes: durationMinutes,
          scheduledStart: slot ? slot.startDateTime : null,
          scheduledEnd: slot ? slot.endDateTime : null,
          timeZone: slot ? slot.timeZone : 'UTC',
          format: format,
          contactName: contactName,
          contactEmail: contactEmail,
          country: country,
          status: 'draft',
          createdAt: now
        };
        bookings.push(booking);
      }
    } else {
      booking = {
        id: this._generateId('consult_booking'),
        consultationTypeId: consultationTypeId,
        timeSlotId: timeSlotId,
        durationMinutes: durationMinutes,
        scheduledStart: slot ? slot.startDateTime : null,
        scheduledEnd: slot ? slot.endDateTime : null,
        timeZone: slot ? slot.timeZone : 'UTC',
        format: format,
        contactName: contactName,
        contactEmail: contactEmail,
        country: country,
        status: 'draft',
        createdAt: now
      };
      bookings.push(booking);
    }

    this._saveToStorage('consultation_bookings', bookings);
    return booking;
  }

  // getConsultationBookingSummary
  getConsultationBookingSummary(consultationBookingId) {
    const bookings = this._getFromStorage('consultation_bookings', []);
    const types = this._getFromStorage('consultation_types', []);
    const slots = this._getFromStorage('consultation_time_slots', []);

    const booking = bookings.find((b) => b.id === consultationBookingId) || null;
    if (!booking) {
      return { booking: null, consultationType: null, timeSlot: null };
    }

    const consultationType = types.find((t) => t.id === booking.consultationTypeId) || null;
    const timeSlot = slots.find((s) => s.id === booking.timeSlotId) || null;

    // Foreign key resolution inside booking
    const enrichedBooking = Object.assign({}, booking, {
      consultationType: consultationType,
      timeSlot: timeSlot
    });

    return {
      booking: enrichedBooking,
      consultationType: consultationType,
      timeSlot: timeSlot
    };
  }

  // confirmConsultationBooking
  confirmConsultationBooking(consultationBookingId) {
    let bookings = this._getFromStorage('consultation_bookings', []);
    let slots = this._getFromStorage('consultation_time_slots', []);

    const idx = bookings.findIndex((b) => b.id === consultationBookingId);
    if (idx === -1) return null;

    const booking = bookings[idx];
    booking.status = 'confirmed';
    bookings[idx] = booking;

    // Mark slot as booked
    const slotIdx = slots.findIndex((s) => s.id === booking.timeSlotId);
    if (slotIdx !== -1) {
      slots[slotIdx].isBooked = true;
    }

    this._saveToStorage('consultation_bookings', bookings);
    this._saveToStorage('consultation_time_slots', slots);

    return booking;
  }

  // getMyTrademarks
  getMyTrademarks(statusFilter) {
    const records = this._getFromStorage('trademark_records', []);
    if (!statusFilter) return records;
    return records.filter((r) => r.status === statusFilter);
  }

  // getTrademarkDetails
  getTrademarkDetails(trademarkId) {
    const records = this._getFromStorage('trademark_records', []);
    return records.find((r) => r.id === trademarkId) || null;
  }

  // getTrademarkRenewalOptions
  getTrademarkRenewalOptions(trademarkId) {
    const options = this._getFromStorage('trademark_renewal_options', []);
    const records = this._getFromStorage('trademark_records', []);
    const tm = records.find((r) => r.id === trademarkId) || null;

    const filtered = options.filter((o) => o.trademarkId === trademarkId && o.isActive !== false);

    // Foreign key resolution for trademarkId
    return filtered.map((opt) => Object.assign({}, opt, { trademark: tm }));
  }

  // continueTrademarkRenewalToPaymentSummary
  continueTrademarkRenewalToPaymentSummary(trademarkId, renewalOptionId, contactPhone) {
    // Use generic order draft creation
    const order = this.createOrderDraftFromServiceSelection('trademark_renewal', renewalOptionId);

    // Attach contact phone directly to order for summary context
    let orders = this._getFromStorage('orders', []);
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx !== -1) {
      orders[idx].contactPhone = contactPhone;
      orders[idx].updatedAt = new Date().toISOString();
      this._saveToStorage('orders', orders);
      return orders[idx];
    }

    return order;
  }

  // searchPatents
  searchPatents(keywords, filedDateStart, filedDateEnd, sortBy) {
    const patents = this._getFromStorage('patents', []);
    let results = patents.slice();

    const kw = (keywords || '').trim().toLowerCase();
    if (kw) {
      const parts = kw.split(/\s+/).filter(Boolean);
      results = results.filter((p) => {
        const text = ((p.title || '') + ' ' + (p.abstract || '')).toLowerCase();
        return parts.every((part) => text.indexOf(part) !== -1);
      });
    }

    if (filedDateStart) {
      const start = new Date(filedDateStart).getTime();
      results = results.filter((p) => {
        if (!p.filingDate) return false;
        const t = new Date(p.filingDate).getTime();
        return t >= start;
      });
    }

    if (filedDateEnd) {
      const end = new Date(filedDateEnd).getTime();
      results = results.filter((p) => {
        if (!p.filingDate) return false;
        const t = new Date(p.filingDate).getTime();
        return t <= end;
      });
    }

    if (sortBy === 'most_recent') {
      results.sort((a, b) => {
        const ta = a.filingDate ? new Date(a.filingDate).getTime() : 0;
        const tb = b.filingDate ? new Date(b.filingDate).getTime() : 0;
        return tb - ta;
      });
    } else if (sortBy === 'most_cited') {
      results.sort((a, b) => {
        const ca = typeof a.citationCount === 'number' ? a.citationCount : 0;
        const cb = typeof b.citationCount === 'number' ? b.citationCount : 0;
        return cb - ca;
      });
    } // relevance: keep insertion order

    const query = {
      id: this._generateId('patent_search_query'),
      keywords: keywords,
      filedDateStart: filedDateStart ? new Date(filedDateStart).toISOString() : null,
      filedDateEnd: filedDateEnd ? new Date(filedDateEnd).toISOString() : null,
      sortBy: sortBy,
      createdAt: new Date().toISOString()
    };

    let queries = this._getFromStorage('patent_search_queries', []);
    queries.push(query);
    this._saveToStorage('patent_search_queries', queries);

    return {
      query: query,
      results: results
    };
  }

  // getPatentDetails
  getPatentDetails(patentId) {
    const patents = this._getFromStorage('patents', []);
    return patents.find((p) => p.id === patentId) || null;
  }

  // getWatchlists
  getWatchlists() {
    const lists = this._getFromStorage('watchlists', []);
    return lists;
  }

  // addPatentToWatchlist
  addPatentToWatchlist(patentId, watchlistId) {
    let items = this._getFromStorage('watchlist_items', []);
    const now = new Date().toISOString();

    const item = {
      id: this._generateId('watchlist_item'),
      watchlistId: watchlistId,
      patentId: patentId,
      addedAt: now
    };

    items.push(item);
    this._saveToStorage('watchlist_items', items);
    return item;
  }

  // getAccountDashboardOverview
  getAccountDashboardOverview() {
    const trademarks = this._getFromStorage('trademark_records', []);
    const trademarkDrafts = this._getFromStorage('trademark_drafts', []);
    const patentDrafts = this._getFromStorage('patent_drafts', []);

    const counts = {
      active: 0,
      expiring_within_12_months: 0,
      expired: 0,
      pending: 0
    };

    trademarks.forEach((tm) => {
      if (counts.hasOwnProperty(tm.status)) {
        counts[tm.status] += 1;
      }
    });

    const combinedDrafts = [];
    trademarkDrafts.forEach((d) => {
      combinedDrafts.push({
        type: 'trademark',
        id: d.id,
        title: d.brandName,
        updatedAt: d.updatedAt || d.createdAt || ''
      });
    });
    patentDrafts.forEach((d) => {
      combinedDrafts.push({
        type: 'patent',
        id: d.id,
        title: d.inventionTitle,
        updatedAt: d.updatedAt || d.createdAt || ''
      });
    });

    combinedDrafts.sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });

    return {
      trademarkCountsByStatus: counts,
      draftCounts: {
        trademarkDrafts: trademarkDrafts.length,
        patentDrafts: patentDrafts.length
      },
      recentDrafts: combinedDrafts
    };
  }

  // getDraftsList
  getDraftsList() {
    const trademarkDrafts = this._getFromStorage('trademark_drafts', []);
    const patentDrafts = this._getFromStorage('patent_drafts', []);

    const filingPackages = this._getFromStorage('trademark_filing_packages', []);
    const patentOptions = this._getFromStorage('patent_filing_options', []);

    const enrichedTrademarkDrafts = trademarkDrafts.map((d) => {
      const pkg = d.selectedPackageId
        ? filingPackages.find((p) => p.id === d.selectedPackageId) || null
        : null;
      return Object.assign({}, d, { selectedPackage: pkg });
    });

    const enrichedPatentDrafts = patentDrafts.map((d) => {
      const opt = d.selectedFilingOptionId
        ? patentOptions.find((o) => o.id === d.selectedFilingOptionId) || null
        : null;
      return Object.assign({}, d, { selectedFilingOption: opt });
    });

    return {
      trademarkDrafts: enrichedTrademarkDrafts,
      patentDrafts: enrichedPatentDrafts
    };
  }

  // renameTrademarkDraft
  renameTrademarkDraft(trademarkDraftId, newBrandName) {
    let drafts = this._getFromStorage('trademark_drafts', []);
    const idx = drafts.findIndex((d) => d.id === trademarkDraftId);
    if (idx === -1) return null;

    drafts[idx].brandName = newBrandName;
    drafts[idx].updatedAt = new Date().toISOString();
    this._saveToStorage('trademark_drafts', drafts);
    return drafts[idx];
  }

  // deleteTrademarkDraft
  deleteTrademarkDraft(trademarkDraftId) {
    let drafts = this._getFromStorage('trademark_drafts', []);
    const initialLength = drafts.length;
    drafts = drafts.filter((d) => d.id !== trademarkDraftId);
    this._saveToStorage('trademark_drafts', drafts);
    return { success: drafts.length < initialLength };
  }

  // duplicateTrademarkDraft
  duplicateTrademarkDraft(trademarkDraftId) {
    let drafts = this._getFromStorage('trademark_drafts', []);
    const original = drafts.find((d) => d.id === trademarkDraftId) || null;
    if (!original) return null;

    const now = new Date().toISOString();
    const copy = Object.assign({}, original, {
      id: this._generateId('trademark_draft'),
      brandAvailabilityChecked: false,
      brandAvailabilityStatus: 'not_checked',
      createdAt: now,
      updatedAt: now
    });

    drafts.push(copy);
    this._saveToStorage('trademark_drafts', drafts);
    return copy;
  }

  // renamePatentDraft
  renamePatentDraft(patentDraftId, newInventionTitle) {
    let drafts = this._getFromStorage('patent_drafts', []);
    const idx = drafts.findIndex((d) => d.id === patentDraftId);
    if (idx === -1) return null;

    drafts[idx].inventionTitle = newInventionTitle;
    drafts[idx].updatedAt = new Date().toISOString();
    this._saveToStorage('patent_drafts', drafts);
    return drafts[idx];
  }

  // deletePatentDraft
  deletePatentDraft(patentDraftId) {
    let drafts = this._getFromStorage('patent_drafts', []);
    const initialLength = drafts.length;
    drafts = drafts.filter((d) => d.id !== patentDraftId);
    this._saveToStorage('patent_drafts', drafts);
    return { success: drafts.length < initialLength };
  }

  // duplicatePatentDraft
  duplicatePatentDraft(patentDraftId) {
    let drafts = this._getFromStorage('patent_drafts', []);
    const original = drafts.find((d) => d.id === patentDraftId) || null;
    if (!original) return null;

    const now = new Date().toISOString();
    const copy = Object.assign({}, original, {
      id: this._generateId('patent_draft'),
      createdAt: now,
      updatedAt: now
    });

    drafts.push(copy);
    this._saveToStorage('patent_drafts', drafts);
    return copy;
  }

  // getCartContents
  getCartContents() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);
    return this._enrichCartItemsForDisplay(cart, itemsForCart);
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const initialLength = cartItems.length;
    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const cart = this._getOrCreateCart();
    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter((id) => id !== cartItemId);
      cart.updatedAt = new Date().toISOString();
      this._saveToStorage('cart', cart);
    }

    return { success: cartItems.length < initialLength, cart: cart };
  }

  // createOrUpdateOrderDraftFromCart
  createOrUpdateOrderDraftFromCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);

    let order = this._getCurrentOrderDraft();
    let orderItems = this._getFromStorage('order_items', []);

    // Remove existing items for this order
    orderItems = orderItems.filter((oi) => oi.orderId !== order.id);

    const now = new Date().toISOString();
    const newOrderItemIds = [];
    let subtotal = 0;
    let totalGovernment = 0;

    itemsForCart.forEach((ci) => {
      const totalPrice = ci.totalPrice || (ci.serviceFee + (ci.governmentFee || 0));
      const oi = {
        id: this._generateId('order_item'),
        orderId: order.id,
        serviceType: ci.serviceType,
        referenceId: ci.referenceId,
        description: ci.description,
        serviceFee: ci.serviceFee,
        governmentFee: ci.governmentFee || 0,
        totalPrice: totalPrice,
        billingFrequency: ci.billingFrequency || 'one_time',
        durationMonths: typeof ci.durationMonths === 'number' ? ci.durationMonths : null,
        quantity: ci.quantity || 1
      };
      orderItems.push(oi);
      newOrderItemIds.push(oi.id);
      subtotal += oi.serviceFee * oi.quantity;
      totalGovernment += (oi.governmentFee || 0) * oi.quantity;
    });

    order.items = newOrderItemIds;
    order.subtotal = subtotal;
    order.tax = 0;
    order.total = subtotal + totalGovernment;
    order.currency = order.currency || 'USD';
    order.updatedAt = now;

    this._saveToStorage('order_items', orderItems);

    let orders = this._getFromStorage('orders', []);
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx === -1) {
      orders.push(order);
    } else {
      orders[idx] = order;
    }
    this._saveToStorage('orders', orders);

    return order;
  }

  // createOrderDraftFromServiceSelection
  createOrderDraftFromServiceSelection(serviceType, referenceId) {
    let order = this._getCurrentOrderDraft();
    let orderItems = this._getFromStorage('order_items', []);
    const now = new Date().toISOString();

    // Clear existing items for this order (single-service summary)
    orderItems = orderItems.filter((oi) => oi.orderId !== order.id);

    let serviceFee = 0;
    let governmentFee = 0;
    let totalPrice = 0;
    let description = '';
    let billingFrequency = 'one_time';
    let durationMonths = null;
    let currency = 'USD';

    if (serviceType === 'trademark_search') {
      const searchOrders = this._getFromStorage('trademark_search_orders', []);
      const packages = this._getFromStorage('trademark_search_packages', []);
      const so = searchOrders.find((s) => s.id === referenceId) || null;
      const pkg = so ? packages.find((p) => p.id === so.packageId) || null : null;
      serviceFee = pkg ? pkg.price : 0;
      governmentFee = 0;
      totalPrice = serviceFee;
      description = so ? 'Trademark search for ' + so.markName : 'Trademark search';
      currency = (pkg && pkg.currency) || 'USD';
    } else if (serviceType === 'trademark_monitoring') {
      const setups = this._getFromStorage('trademark_monitoring_setups', []);
      const plans = this._getFromStorage('trademark_monitoring_plans', []);
      const setup = setups.find((s) => s.id === referenceId) || null;
      const plan = setup ? plans.find((p) => p.id === setup.planId) || null : null;
      if (plan) {
        serviceFee = plan.monthlyPrice * plan.durationMonths;
        governmentFee = 0;
        totalPrice = serviceFee;
        billingFrequency = setup ? setup.billingFrequency : 'monthly';
        durationMonths = plan.durationMonths;
        currency = plan.currency || 'USD';
      }
      const marks = setup && Array.isArray(setup.marks) ? setup.marks.join(', ') : '';
      description = 'Trademark monitoring';
      if (marks) description += ': ' + marks;
    } else if (serviceType === 'trademark_renewal') {
      const options = this._getFromStorage('trademark_renewal_options', []);
      const trademarks = this._getFromStorage('trademark_records', []);
      const option = options.find((o) => o.id === referenceId) || null;
      if (option) {
        const tm = trademarks.find((t) => t.id === option.trademarkId) || null;
        const markName = tm ? tm.markName : 'Trademark renewal';
        description = 'Trademark renewal for ' + markName;
        serviceFee = option.serviceFee;
        governmentFee = option.governmentFee;
        totalPrice = option.totalPrice || (option.serviceFee + option.governmentFee);
        currency = option.currency || 'USD';
      } else {
        description = 'Trademark renewal';
      }
    } else if (serviceType === 'patent_filing') {
      const drafts = this._getFromStorage('patent_drafts', []);
      const options = this._getFromStorage('patent_filing_options', []);
      const draft = drafts.find((d) => d.id === referenceId) || null;
      const option = draft && draft.selectedFilingOptionId
        ? options.find((o) => o.id === draft.selectedFilingOptionId) || null
        : null;
      const title = draft ? draft.inventionTitle : 'Patent filing';
      description = 'Patent filing for ' + title;
      if (option) {
        serviceFee = option.serviceFee;
        governmentFee = option.governmentFee;
        totalPrice = option.totalPrice || (option.serviceFee + option.governmentFee);
        currency = option.currency || 'USD';
      }
    } else if (serviceType === 'trademark_filing') {
      const drafts = this._getFromStorage('trademark_drafts', []);
      const packages = this._getFromStorage('trademark_filing_packages', []);
      const draft = drafts.find((d) => d.id === referenceId) || null;
      const pkg = draft && draft.selectedPackageId
        ? packages.find((p) => p.id === draft.selectedPackageId) || null
        : null;
      const name = draft ? draft.brandName : 'Trademark filing';
      description = 'Trademark filing for ' + name;
      if (pkg) {
        serviceFee = pkg.serviceFee;
        governmentFee = pkg.governmentFee;
        totalPrice = pkg.totalPrice || (pkg.serviceFee + pkg.governmentFee);
        currency = pkg.currency || 'USD';
      }
    } else if (serviceType === 'consultation') {
      const bookings = this._getFromStorage('consultation_bookings', []);
      const types = this._getFromStorage('consultation_types', []);
      const booking = bookings.find((b) => b.id === referenceId) || null;
      const type = booking
        ? types.find((t) => t.id === booking.consultationTypeId) || null
        : null;
      const basePrice = type && typeof type.basePricePerMinute === 'number'
        ? type.basePricePerMinute
        : 0;
      serviceFee = basePrice * (booking ? booking.durationMinutes : 0);
      governmentFee = 0;
      totalPrice = serviceFee;
      billingFrequency = 'one_time';
      durationMonths = null;
      currency = type && type.currency ? type.currency : 'USD';
      description = 'Consultation';
      if (type && type.name) description += ': ' + type.name;
    } else {
      description = 'Service selection';
    }

    const orderItem = {
      id: this._generateId('order_item'),
      orderId: order.id,
      serviceType: serviceType,
      referenceId: referenceId,
      description: description,
      serviceFee: serviceFee,
      governmentFee: governmentFee,
      totalPrice: totalPrice,
      billingFrequency: billingFrequency,
      durationMonths: durationMonths,
      quantity: 1
    };

    orderItems.push(orderItem);
    this._saveToStorage('order_items', orderItems);

    order.items = [orderItem.id];
    order.subtotal = serviceFee;
    order.tax = 0;
    order.total = totalPrice;
    order.currency = currency;
    order.updatedAt = now;

    let orders = this._getFromStorage('orders', []);
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx === -1) {
      orders.push(order);
    } else {
      orders[idx] = order;
    }
    this._saveToStorage('orders', orders);

    return order;
  }

  // getOrderSummary
  getOrderSummary(orderId) {
    const orders = this._getFromStorage('orders', []);
    const order = orders.find((o) => o.id === orderId) || null;
    if (!order) {
      return { order: null, items: [] };
    }

    const orderItems = this._getFromStorage('order_items', []).filter((oi) => oi.orderId === order.id);
    return this._enrichOrderItemsForDisplay(order, orderItems);
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
