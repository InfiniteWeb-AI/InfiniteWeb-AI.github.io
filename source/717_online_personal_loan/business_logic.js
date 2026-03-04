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
  }

  // ==========================
  // Storage & ID helpers
  // ==========================

  _initStorage() {
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Core entity tables
    ensureArrayKey('loan_offers');
    ensureArrayKey('loan_applications');
    ensureArrayKey('co_applicants');
    ensureArrayKey('loans');
    ensureArrayKey('bank_accounts');
    ensureArrayKey('saved_offers');
    ensureArrayKey('calculator_scenarios');
    ensureArrayKey('eligibility_sessions');
    ensureArrayKey('profiles');
    ensureArrayKey('communication_preferences');
    ensureArrayKey('support_requests');

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Auth state
    if (!localStorage.getItem('auth')) {
      localStorage.setItem('auth', JSON.stringify({ isAuthenticated: false, username: null }));
    }

    // Static-ish content (seed once, then editable if caller overwrites storage directly)
    if (!localStorage.getItem('home_page_content')) {
      localStorage.setItem(
        'home_page_content',
        JSON.stringify({
          heroTitle: 'Flexible Personal Loans, Simplified',
          heroSubtitle: 'Compare offers, check eligibility, and manage your loan in one place.',
          benefitBullets: [
            'Check rates without impacting your credit score',
            'No hidden fees or prepayment penalties on eligible offers',
            'Secure online application and document upload'
          ],
          highlightedFeatures: [
            {
              title: 'Debt Consolidation',
              description: 'Combine multiple payments into a single, predictable monthly payment.'
            },
            {
              title: 'Home Improvement Financing',
              description: 'Fund renovations, repairs, and upgrades with fixed-rate financing.'
            }
          ]
        })
      );
    }

    if (!localStorage.getItem('personal_loan_overview_content')) {
      localStorage.setItem(
        'personal_loan_overview_content',
        JSON.stringify({
          loanCategories: [
            {
              loanPurpose: 'debt_consolidation',
              displayName: 'Debt Consolidation',
              description: 'Pay off multiple debts with one fixed-rate personal loan.'
            },
            {
              loanPurpose: 'credit_card_consolidation',
              displayName: 'Credit Card Consolidation',
              description: 'Reduce interest and simplify credit card payments.'
            },
            {
              loanPurpose: 'home_improvement',
              displayName: 'Home Improvement',
              description: 'Finance home repairs, upgrades, and renovations.'
            },
            {
              loanPurpose: 'car_repair',
              displayName: 'Car Repair',
              description: 'Cover unexpected auto repair expenses.'
            },
            {
              loanPurpose: 'personal_loan',
              displayName: 'Personal Loan',
              description: 'Flexible funds for major purchases or expenses.'
            },
            {
              loanPurpose: 'other',
              displayName: 'Other',
              description: 'Use a personal loan for other eligible purposes.'
            }
          ],
          termsSummary: 'Terms typically range from 24 to 60 months, with fixed monthly payments.',
          rateTypesSummary: 'Most offers use fixed rates, so your monthly payment will not change.',
          feesSummary: 'Some lenders may charge origination fees; many offers have no prepayment penalty.',
          startApplicationHelpText: 'Choose a loan purpose to see personalized offers and begin your application.'
        })
      );
    }

    if (!localStorage.getItem('help_and_contact_content')) {
      localStorage.setItem(
        'help_and_contact_content',
        JSON.stringify({
          faqSections: [
            {
              title: 'Applications & Eligibility',
              questions: [
                {
                  question: 'Will checking my rate affect my credit score?',
                  answer: 'Checking your rate through the eligibility checker typically uses a soft inquiry and does not impact your credit score.'
                }
              ]
            }
          ],
          contactEmail: 'support@exampleloans.com',
          contactPhone: '1-800-555-1234',
          supportHours: 'Mon–Fri, 9:00 AM–6:00 PM (local time)'
        })
      );
    }

    if (!localStorage.getItem('legal_rates_privacy_content')) {
      localStorage.setItem(
        'legal_rates_privacy_content',
        JSON.stringify({
          ratesDisclosure: 'APR ranges are determined by lender partners and depend on credit profile, income, and other factors.',
          feePolicies: 'Some loans may include origination fees; late payment and returned payment fees may also apply.',
          termsOfUse: 'By using this site, you agree to the terms and conditions governing our services.',
          privacyPolicy: 'We take your privacy seriously and only share information with partners as described in this policy.',
          regulatoryDisclosures: 'All loans are subject to credit approval and may not be available in all states.'
        })
      );
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
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

  // ==========================
  // Auth helpers
  // ==========================

  _getAuth() {
    const raw = localStorage.getItem('auth');
    if (!raw) return { isAuthenticated: false, username: null };
    try {
      const parsed = JSON.parse(raw);
      return {
        isAuthenticated: !!parsed.isAuthenticated,
        username: parsed.username || null
      };
    } catch (e) {
      return { isAuthenticated: false, username: null };
    }
  }

  _setAuth(auth) {
    localStorage.setItem('auth', JSON.stringify(auth));
  }

  _ensureAuthenticated() {
    const auth = this._getAuth();
    if (!auth.isAuthenticated) {
      throw new Error('Authentication required');
    }
  }

  // ==========================
  // Calculation helpers
  // ==========================

  _calculateMonthlyPayment(loanAmount, apr, termMonths) {
    const principal = Number(loanAmount) || 0;
    const annualRate = Number(apr) || 0;
    const n = Number(termMonths) || 0;

    if (principal <= 0 || n <= 0) {
      return { monthlyPayment: 0, totalRepayment: 0 };
    }

    const monthlyRate = annualRate > 0 ? annualRate / 100 / n : 0;
    let monthlyPayment;

    if (monthlyRate === 0) {
      monthlyPayment = principal / n;
    } else {
      const r = monthlyRate;
      monthlyPayment = (principal * r) / (1 - Math.pow(1 + r, -n));
    }

    // Round to 2 decimals
    monthlyPayment = Math.round(monthlyPayment * 100) / 100;
    const totalRepayment = Math.round(monthlyPayment * n * 100) / 100;
    return { monthlyPayment, totalRepayment };
  }

  _inferAprForEligibility(loanPurpose, termMonths) {
    const offers = this._getFromStorage('loan_offers');
    const filtered = offers.filter((o) => {
      if (loanPurpose && o.loan_purpose !== loanPurpose) return false;
      if (termMonths && o.term_months !== termMonths) return false;
      return true;
    });
    if (filtered.length === 0) {
      return 10; // fallback APR when no data is available
    }
    const sum = filtered.reduce((acc, o) => acc + (Number(o.apr) || 0), 0);
    return sum / filtered.length;
  }

  // ==========================
  // Augmentation helpers (FK resolution)
  // ==========================

  _augmentApplication(application) {
    if (!application) return null;
    const offers = this._getFromStorage('loan_offers');
    const coApplicants = this._getFromStorage('co_applicants');

    const selectedOffer = application.selected_offer_id
      ? offers.find((o) => o.id === application.selected_offer_id) || null
      : null;

    const coApplicant = application.co_applicant_id
      ? coApplicants.find((c) => c.id === application.co_applicant_id) || null
      : null;

    const augmented = Object.assign({}, application);
    augmented.selected_offer = selectedOffer;
    augmented.co_applicant = this._augmentCoApplicant(coApplicant);
    return augmented;
  }

  _augmentCoApplicant(coApplicant) {
    if (!coApplicant) return null;
    const applications = this._getFromStorage('loan_applications');
    const application = coApplicant.application_id
      ? applications.find((a) => a.id === coApplicant.application_id) || null
      : null;
    const augmented = Object.assign({}, coApplicant);
    // Avoid recursive augmentation between application and co-applicant
    augmented.application = application;
    return augmented;
  }

  _augmentLoan(loan) {
    if (!loan) return null;
    const applications = this._getFromStorage('loan_applications');
    const offers = this._getFromStorage('loan_offers');
    const bankAccounts = this._getFromStorage('bank_accounts');

    const application = loan.application_id
      ? applications.find((a) => a.id === loan.application_id) || null
      : null;
    const selectedOffer = loan.selected_offer_id
      ? offers.find((o) => o.id === loan.selected_offer_id) || null
      : null;
    const paymentMethod = loan.payment_method_id
      ? bankAccounts.find((b) => b.id === loan.payment_method_id) || null
      : null;

    const augmented = Object.assign({}, loan);
    augmented.application = application ? this._augmentApplication(application) : null;
    augmented.selected_offer = selectedOffer;
    augmented.payment_method = paymentMethod;
    return augmented;
  }

  _augmentSavedOffer(savedOffer) {
    if (!savedOffer) return null;
    const offers = this._getFromStorage('loan_offers');
    const offer = savedOffer.offer_id
      ? offers.find((o) => o.id === savedOffer.offer_id) || null
      : null;
    const augmented = Object.assign({}, savedOffer);
    augmented.offer = offer;
    return augmented;
  }

  _augmentCommunicationPreference(pref) {
    if (!pref) return null;
    const profiles = this._getFromStorage('profiles');
    const profile = pref.profile_id
      ? profiles.find((p) => p.id === pref.profile_id) || null
      : null;
    const augmented = Object.assign({}, pref);
    augmented.profile = profile;
    return augmented;
  }

  _buildApplicationNavigationSteps(currentStep) {
    const stepsOrder = [
      'loan_details',
      'personal_information',
      'employment_information',
      'co_applicant',
      'offers',
      'review',
      'submitted'
    ];
    const labels = {
      loan_details: 'Loan Details',
      personal_information: 'Personal Information',
      employment_information: 'Employment Information',
      co_applicant: 'Co-applicant',
      offers: 'Offers',
      review: 'Review & Submit',
      submitted: 'Submitted'
    };
    const currentIndex = stepsOrder.indexOf(currentStep);

    return stepsOrder.map((stepId, index) => ({
      stepId,
      label: labels[stepId] || stepId,
      isCompleted: currentIndex >= 0 ? index <= currentIndex : false,
      isCurrent: stepId === currentStep
    }));
  }

  _getOrCreateProfileForCurrentUser() {
    const profiles = this._getFromStorage('profiles');
    if (profiles.length > 0) {
      return profiles[0];
    }
    const profile = {
      id: this._generateId('profile'),
      full_name: null,
      phone_number: null,
      street_address: null,
      city: null,
      state_region: null,
      postal_code: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    profiles.push(profile);
    this._saveToStorage('profiles', profiles);
    return profile;
  }

  _buildApplicationTitleFromPurpose(loanPurpose) {
    const map = {
      debt_consolidation: 'Debt Consolidation Loan',
      credit_card_consolidation: 'Credit Card Consolidation Loan',
      home_improvement: 'Home Improvement Loan',
      car_repair: 'Car Repair Loan',
      personal_loan: 'Personal Loan',
      other: 'Personal Loan'
    };
    return (map[loanPurpose] || 'Personal Loan') + ' - Draft';
  }

  // ==========================
  // Auth interfaces
  // ==========================

  // signIn(username, password)
  signIn(username, password) {
    const valid = typeof username === 'string' && username.length > 0 && typeof password === 'string' && password.length > 0;
    if (!valid) {
      this._setAuth({ isAuthenticated: false, username: null });
      return { success: false, isAuthenticated: false, message: 'Invalid credentials' };
    }
    this._setAuth({ isAuthenticated: true, username: username });
    return { success: true, isAuthenticated: true, message: 'Signed in' };
  }

  // signOut()
  signOut() {
    this._setAuth({ isAuthenticated: false, username: null });
    return { success: true };
  }

  // getAuthStatus()
  getAuthStatus() {
    const auth = this._getAuth();
    return { isAuthenticated: auth.isAuthenticated };
  }

  // ==========================
  // Home & overview content
  // ==========================

  // getHomePageContent()
  getHomePageContent() {
    const raw = localStorage.getItem('home_page_content');
    return raw ? JSON.parse(raw) : { heroTitle: '', heroSubtitle: '', benefitBullets: [], highlightedFeatures: [] };
  }

  // getHomeUserSnapshot()
  getHomeUserSnapshot() {
    const auth = this._getAuth();
    const isAuthenticated = auth.isAuthenticated;

    const applications = this._getFromStorage('loan_applications');
    const loans = this._getFromStorage('loans');
    const savedOffers = this._getFromStorage('saved_offers');

    // Recent draft applications (draft or incomplete), most recent first
    const draftStatuses = ['draft', 'incomplete'];
    const draftApplications = applications
      .filter((a) => draftStatuses.includes(a.status))
      .sort((a, b) => {
        const ad = a.updated_at || a.created_at || '';
        const bd = b.updated_at || b.created_at || '';
        return bd.localeCompare(ad);
      })
      .slice(0, 5)
      .map((a) => this._augmentApplication(a));

    const activeLoans = loans
      .filter((l) => l.status === 'active')
      .map((l) => this._augmentLoan(l));

    return {
      isAuthenticated,
      recentDraftApplications: draftApplications,
      activeLoans,
      savedOffersCount: savedOffers.length,
      alerts: []
    };
  }

  // getPersonalLoanOverviewContent()
  getPersonalLoanOverviewContent() {
    const raw = localStorage.getItem('personal_loan_overview_content');
    return raw
      ? JSON.parse(raw)
      : {
          loanCategories: [],
          termsSummary: '',
          rateTypesSummary: '',
          feesSummary: '',
          startApplicationHelpText: ''
        };
  }

  // ==========================
  // Loan offer filters & search
  // ==========================

  // getLoanOfferFilterOptions()
  getLoanOfferFilterOptions() {
    const offers = this._getFromStorage('loan_offers');

    const rateTypesSet = new Set();
    const termSet = new Set();
    let minApr = null;
    let maxApr = null;
    let minAmount = null;
    let maxAmount = null;

    offers.forEach((o) => {
      if (o.rate_type) rateTypesSet.add(o.rate_type);
      if (typeof o.term_months === 'number') termSet.add(o.term_months);
      if (typeof o.apr === 'number') {
        if (minApr === null || o.apr < minApr) minApr = o.apr;
        if (maxApr === null || o.apr > maxApr) maxApr = o.apr;
      }
      if (typeof o.loan_amount === 'number') {
        if (minAmount === null || o.loan_amount < minAmount) minAmount = o.loan_amount;
        if (maxAmount === null || o.loan_amount > maxAmount) maxAmount = o.loan_amount;
      }
    });

    const rateTypeOptions = Array.from(rateTypesSet).map((rt) => ({ value: rt, label: rt === 'fixed' ? 'Fixed rate' : 'Variable rate' }));
    const termOptionsMonths = Array.from(termSet).sort((a, b) => a - b);

    return {
      rateTypeOptions,
      termOptionsMonths,
      aprRange: {
        min: minApr !== null ? minApr : 0,
        max: maxApr !== null ? maxApr : 0
      },
      loanAmountRange: {
        min: minAmount !== null ? minAmount : 0,
        max: maxAmount !== null ? maxAmount : 0,
        step: 500
      },
      feeFilters: {
        noOriginationFeeLabel: 'No origination fee',
        noPrepaymentPenaltyLabel: 'No prepayment penalty'
      },
      sortOptions: [
        { value: 'apr_low_to_high', label: 'APR - Low to High' },
        { value: 'recommended', label: 'Recommended' },
        { value: 'shortest_term_first', label: 'Shortest term first' },
        { value: 'loan_amount_high_to_low', label: 'Loan Amount - High to Low' }
      ]
    };
  }

  // searchLoanOffers(loanPurpose, requestedLoanAmount, termMonths, rateType, aprMin, aprMax, amountRangeMin, amountRangeMax, noOriginationFee, noPrepaymentPenalty, sortBy, sourceContext, eligibilitySessionId, applicationId)
  searchLoanOffers(
    loanPurpose,
    requestedLoanAmount,
    termMonths,
    rateType,
    aprMin,
    aprMax,
    amountRangeMin,
    amountRangeMax,
    noOriginationFee,
    noPrepaymentPenalty,
    sortBy,
    sourceContext,
    eligibilitySessionId,
    applicationId
  ) {
    let offers = this._getFromStorage('loan_offers').filter((o) => o.is_active !== false);

    // If scoped by eligibility session, override filters from the session
    let session = null;
    if (eligibilitySessionId) {
      const sessions = this._getFromStorage('eligibility_sessions');
      session = sessions.find((s) => s.id === eligibilitySessionId) || null;
      if (session) {
        loanPurpose = session.loan_purpose;
        requestedLoanAmount = session.selected_loan_amount;
        termMonths = session.term_months;
      }
    }

    // If scoped by application, override from application
    let application = null;
    if (applicationId) {
      const applications = this._getFromStorage('loan_applications');
      application = applications.find((a) => a.id === applicationId) || null;
      if (application) {
        loanPurpose = application.loan_purpose;
        requestedLoanAmount = application.loan_amount_requested;
        termMonths = application.loan_term_months;
        if (!rateType && application.rate_type) {
          rateType = application.rate_type;
        }
      }
    }

    // Filter by purpose
    if (loanPurpose) {
      offers = offers.filter((o) => o.loan_purpose === loanPurpose);
    }

    // Filter by term
    if (typeof termMonths === 'number' && !isNaN(termMonths)) {
      offers = offers.filter((o) => o.term_months === termMonths);
    }

    // Filter by rate type
    if (rateType) {
      offers = offers.filter((o) => o.rate_type === rateType);
    }

    // Filter by APR range
    if (typeof aprMin === 'number') {
      offers = offers.filter((o) => typeof o.apr === 'number' && o.apr >= aprMin);
    }
    if (typeof aprMax === 'number') {
      offers = offers.filter((o) => typeof o.apr === 'number' && o.apr <= aprMax);
    }

    // Filter by amount range
    if (typeof amountRangeMin === 'number') {
      offers = offers.filter((o) => typeof o.loan_amount === 'number' && o.loan_amount >= amountRangeMin);
    }
    if (typeof amountRangeMax === 'number') {
      offers = offers.filter((o) => typeof o.loan_amount === 'number' && o.loan_amount <= amountRangeMax);
    }

    // Fee filters
    if (noOriginationFee === true) {
      offers = offers.filter((o) => o.has_origination_fee === false);
    }
    if (noPrepaymentPenalty === true) {
      offers = offers.filter((o) => o.has_prepayment_penalty === false);
    }

    // If no offers match, fallback to synthetic offers derived from existing loans
    if (offers.length === 0) {
      const loans = this._getFromStorage('loans');
      let synthetic = loans.map((l) => {
        const calc = this._calculateMonthlyPayment(l.original_principal, l.apr, l.term_months);
        return {
          id: 'loan_offer_' + l.id,
          lender_name: l.loan_number || 'Existing Loan',
          loan_purpose: l.loan_purpose,
          rate_type: l.rate_type || 'fixed',
          loan_amount: l.original_principal,
          term_months: l.term_months,
          apr: l.apr,
          monthly_payment: calc.monthlyPayment,
          total_repayment: calc.totalRepayment,
          has_origination_fee: false,
          origination_fee_percentage: 0,
          origination_fee_amount: 0,
          has_prepayment_penalty: false,
          recommended_score: 50,
          is_active: true
        };
      });

      // Persist synthetic offers into loan_offers so they can be reused elsewhere
      const existingOffers = this._getFromStorage('loan_offers');
      const mergedOffers = existingOffers.slice();
      synthetic.forEach((s) => {
        if (!mergedOffers.some((o) => o.id === s.id)) {
          mergedOffers.push(s);
        }
      });
      this._saveToStorage('loan_offers', mergedOffers);

      // Reapply filters to synthetic offers
      if (loanPurpose) {
        synthetic = synthetic.filter((o) => o.loan_purpose === loanPurpose);
      }
      if (typeof termMonths === 'number' && !isNaN(termMonths)) {
        synthetic = synthetic.filter((o) => o.term_months === termMonths);
      }
      if (rateType) {
        synthetic = synthetic.filter((o) => o.rate_type === rateType);
      }
      if (typeof aprMin === 'number') {
        synthetic = synthetic.filter((o) => typeof o.apr === 'number' && o.apr >= aprMin);
      }
      if (typeof aprMax === 'number') {
        synthetic = synthetic.filter((o) => typeof o.apr === 'number' && o.apr <= aprMax);
      }
      if (typeof amountRangeMin === 'number') {
        synthetic = synthetic.filter((o) => typeof o.loan_amount === 'number' && o.loan_amount >= amountRangeMin);
      }
      if (typeof amountRangeMax === 'number') {
        synthetic = synthetic.filter((o) => typeof o.loan_amount === 'number' && o.loan_amount <= amountRangeMax);
      }
      if (noOriginationFee === true) {
        synthetic = synthetic.filter((o) => o.has_origination_fee === false);
      }
      if (noPrepaymentPenalty === true) {
        synthetic = synthetic.filter((o) => o.has_prepayment_penalty === false);
      }

      offers = synthetic;
    }

    // If still no offers and we have an application context, synthesize an offer from the application itself
    if (offers.length === 0 && application) {
      const inferredApr = typeof application.apr === 'number'
        ? application.apr
        : this._inferAprForEligibility(application.loan_purpose, application.loan_term_months);
      const calcFromApp = this._calculateMonthlyPayment(
        application.loan_amount_requested,
        inferredApr,
        application.loan_term_months
      );
      const offerFromApp = {
        id: 'app_offer_' + application.id,
        lender_name: 'Draft Application Offer',
        loan_purpose: application.loan_purpose,
        rate_type: application.rate_type || 'fixed',
        loan_amount: application.loan_amount_requested,
        term_months: application.loan_term_months,
        apr: inferredApr,
        monthly_payment: calcFromApp.monthlyPayment,
        total_repayment: calcFromApp.totalRepayment,
        has_origination_fee: false,
        origination_fee_percentage: 0,
        origination_fee_amount: 0,
        has_prepayment_penalty: false,
        recommended_score: 75,
        is_active: true
      };

      // Persist synthetic application-based offer into loan_offers
      const existingOffers = this._getFromStorage('loan_offers');
      if (!existingOffers.some((o) => o.id === offerFromApp.id)) {
        existingOffers.push(offerFromApp);
        this._saveToStorage('loan_offers', existingOffers);
      }

      offers = [offerFromApp];
    }

    // Sorting
    const sortKey = sortBy || 'recommended';
    if (sortKey === 'apr_low_to_high') {
      offers.sort((a, b) => {
        const aApr = typeof a.apr === 'number' ? a.apr : Number.POSITIVE_INFINITY;
        const bApr = typeof b.apr === 'number' ? b.apr : Number.POSITIVE_INFINITY;
        if (aApr !== bApr) return aApr - bApr;
        return (a.total_repayment || 0) - (b.total_repayment || 0);
      });
    } else if (sortKey === 'recommended') {
      offers.sort((a, b) => {
        const aScore = typeof a.recommended_score === 'number' ? a.recommended_score : -Infinity;
        const bScore = typeof b.recommended_score === 'number' ? b.recommended_score : -Infinity;
        return bScore - aScore;
      });
    } else if (sortKey === 'shortest_term_first') {
      offers.sort((a, b) => (a.term_months || 0) - (b.term_months || 0));
    } else if (sortKey === 'loan_amount_high_to_low') {
      offers.sort((a, b) => (b.loan_amount || 0) - (a.loan_amount || 0));
    }

    return {
      offers,
      totalOffers: offers.length,
      appliedFilters: {
        loanPurpose: loanPurpose || null,
        requestedLoanAmount: typeof requestedLoanAmount === 'number' ? requestedLoanAmount : null,
        termMonths: typeof termMonths === 'number' ? termMonths : null,
        rateType: rateType || null,
        aprMin: typeof aprMin === 'number' ? aprMin : null,
        aprMax: typeof aprMax === 'number' ? aprMax : null,
        amountRangeMin: typeof amountRangeMin === 'number' ? amountRangeMin : null,
        amountRangeMax: typeof amountRangeMax === 'number' ? amountRangeMax : null,
        noOriginationFee: !!noOriginationFee,
        noPrepaymentPenalty: !!noPrepaymentPenalty
      },
      sortBy: sortKey
    };
  }

  // getLoanOfferDetail(offerId)
  getLoanOfferDetail(offerId) {
    const offers = this._getFromStorage('loan_offers');
    const offer = offers.find((o) => o.id === offerId) || null;
    if (!offer) {
      return {
        offer: null,
        repaymentSummary: {
          monthlyPayment: 0,
          totalRepayment: 0,
          termMonths: null,
          apr: null,
          hasOriginationFee: false,
          originationFeeAmount: 0,
          hasPrepaymentPenalty: false
        }
      };
    }
    return {
      offer,
      repaymentSummary: {
        monthlyPayment: offer.monthly_payment || 0,
        totalRepayment: offer.total_repayment || 0,
        termMonths: offer.term_months || null,
        apr: offer.apr || null,
        hasOriginationFee: !!offer.has_origination_fee,
        originationFeeAmount: offer.origination_fee_amount || 0,
        hasPrepaymentPenalty: !!offer.has_prepayment_penalty
      }
    };
  }

  // ==========================
  // Applications from offers / saved offers
  // ==========================

  // startApplicationFromOffer(offerId, flowType)
  startApplicationFromOffer(offerId, flowType) {
    const offers = this._getFromStorage('loan_offers');
    const applications = this._getFromStorage('loan_applications');

    const offer = offers.find((o) => o.id === offerId) || null;
    if (!offer) {
      throw new Error('Offer not found');
    }

    const now = new Date().toISOString();
    const application = {
      id: this._generateId('app'),
      application_title: this._buildApplicationTitleFromPurpose(offer.loan_purpose),
      loan_purpose: offer.loan_purpose,
      status: 'draft',
      loan_amount_requested: offer.loan_amount,
      loan_term_months: offer.term_months,
      rate_type: offer.rate_type,
      selected_offer_id: offer.id,
      apr: offer.apr,
      estimated_monthly_payment: offer.monthly_payment,
      autopay_preference_enabled: null,
      personal_first_name: null,
      personal_last_name: null,
      personal_date_of_birth: null,
      annual_income: null,
      monthly_housing_payment: null,
      employment_status: null,
      employer_name: null,
      has_co_applicant: false,
      co_applicant_id: null,
      last_completed_step: 'loan_details',
      created_at: now,
      updated_at: now
    };

    applications.push(application);
    this._saveToStorage('loan_applications', applications);

    const augmented = this._augmentApplication(application);
    return {
      application: augmented,
      nextStep: 'personal_information'
    };
  }

  // saveOfferAsFavorite(offerId, savedLabel, notes)
  saveOfferAsFavorite(offerId, savedLabel, notes) {
    // Authentication not required for saving favorite offers
    const offers = this._getFromStorage('loan_offers');
    const offer = offers.find((o) => o.id === offerId) || null;
    if (!offer) {
      throw new Error('Offer not found');
    }
    const savedOffers = this._getFromStorage('saved_offers');
    const saved = {
      id: this._generateId('saved_offer'),
      offer_id: offerId,
      saved_label: savedLabel || null,
      notes: notes || null,
      created_at: new Date().toISOString()
    };
    savedOffers.push(saved);
    this._saveToStorage('saved_offers', savedOffers);
    return { savedOffer: this._augmentSavedOffer(saved) };
  }

  // getSavedOffers()
  getSavedOffers() {
    // Authentication not required for retrieving saved offers
    const savedOffers = this._getFromStorage('saved_offers');
    const offers = this._getFromStorage('loan_offers');

    return savedOffers
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      .map((s) => {
        const offer = offers.find((o) => o.id === s.offer_id) || null;
        return {
          savedOfferId: s.id,
          offerId: s.offer_id,
          savedLabel: s.saved_label || null,
          notes: s.notes || null,
          savedAt: s.created_at || null,
          lenderName: offer ? offer.lender_name : null,
          loanPurpose: offer ? offer.loan_purpose : null,
          loanAmount: offer ? offer.loan_amount : null,
          termMonths: offer ? offer.term_months : null,
          apr: offer ? offer.apr : null,
          monthlyPayment: offer ? offer.monthly_payment : null,
          totalRepayment: offer ? offer.total_repayment : null,
          offer: offer
        };
      });
  }

  // deleteSavedOffer(savedOfferId)
  deleteSavedOffer(savedOfferId) {
    // Authentication not required for deleting saved offers
    const savedOffers = this._getFromStorage('saved_offers');
    const before = savedOffers.length;
    const afterList = savedOffers.filter((s) => s.id !== savedOfferId);
    this._saveToStorage('saved_offers', afterList);
    return { success: afterList.length < before };
  }

  // startApplicationFromSavedOffer(savedOfferId, flowType)
  startApplicationFromSavedOffer(savedOfferId, flowType) {
    // Authentication not required for starting application from saved offer
    const savedOffers = this._getFromStorage('saved_offers');
    const saved = savedOffers.find((s) => s.id === savedOfferId) || null;
    if (!saved) {
      throw new Error('Saved offer not found');
    }
    return this.startApplicationFromOffer(saved.offer_id, flowType);
  }

  // ==========================
  // My Applications & drafts
  // ==========================

  // getMyApplications(statusFilter, sortBy)
  getMyApplications(statusFilter, sortBy) {
    this._ensureAuthenticated();
    const applications = this._getFromStorage('loan_applications');
    let list = applications;

    if (Array.isArray(statusFilter) && statusFilter.length > 0) {
      const set = new Set(statusFilter);
      list = list.filter((a) => set.has(a.status));
    }

    const sortKey = sortBy || 'most_recent';
    if (sortKey === 'most_recent') {
      list = list.sort((a, b) => {
        const ad = a.updated_at || a.created_at || '';
        const bd = b.updated_at || b.created_at || '';
        return bd.localeCompare(ad);
      });
    } else if (sortKey === 'status') {
      list = list.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
    }

    return list.map((a) => this._augmentApplication(a));
  }

  // getApplicationDraftDetail(applicationId)
  getApplicationDraftDetail(applicationId) {
    this._ensureAuthenticated();
    const applications = this._getFromStorage('loan_applications');
    const offers = this._getFromStorage('loan_offers');

    const application = applications.find((a) => a.id === applicationId) || null;
    if (!application) {
      return { application: null, selectedOffer: null, navigationSteps: [] };
    }

    const selectedOffer = application.selected_offer_id
      ? offers.find((o) => o.id === application.selected_offer_id) || null
      : null;

    const selectedOfferSummary = selectedOffer
      ? {
          offerId: selectedOffer.id,
          lenderName: selectedOffer.lender_name,
          loanAmount: selectedOffer.loan_amount,
          termMonths: selectedOffer.term_months,
          apr: selectedOffer.apr,
          monthlyPayment: selectedOffer.monthly_payment
        }
      : null;

    const navigationSteps = this._buildApplicationNavigationSteps(application.last_completed_step || 'loan_details');

    return {
      application: this._augmentApplication(application),
      selectedOffer: selectedOfferSummary,
      navigationSteps
    };
  }

  // updateDraftLoanAmount(applicationId, loanAmount)
  updateDraftLoanAmount(applicationId, loanAmount) {
    this._ensureAuthenticated();
    const applications = this._getFromStorage('loan_applications');
    const idx = applications.findIndex((a) => a.id === applicationId);
    if (idx === -1) {
      throw new Error('Application not found');
    }
    const app = applications[idx];
    const amount = Number(loanAmount) || 0;
    app.loan_amount_requested = amount;

    const apr = typeof app.apr === 'number' ? app.apr : this._inferAprForEligibility(app.loan_purpose, app.loan_term_months);
    const calc = this._calculateMonthlyPayment(amount, apr, app.loan_term_months);
    app.estimated_monthly_payment = calc.monthlyPayment;
    app.updated_at = new Date().toISOString();

    applications[idx] = app;
    this._saveToStorage('loan_applications', applications);

    const augmented = this._augmentApplication(app);
    return {
      application: augmented,
      estimatedMonthlyPayment: calc.monthlyPayment
    };
  }

  // saveApplicationDraft(applicationId)
  saveApplicationDraft(applicationId) {
    this._ensureAuthenticated();
    const applications = this._getFromStorage('loan_applications');
    const idx = applications.findIndex((a) => a.id === applicationId);
    if (idx === -1) {
      return { success: false, savedAt: null };
    }
    const now = new Date().toISOString();
    applications[idx].updated_at = now;
    this._saveToStorage('loan_applications', applications);
    return { success: true, savedAt: now };
  }

  // getApplicationPersonalInformationStep(applicationId)
  getApplicationPersonalInformationStep(applicationId) {
    // Authentication not required for accessing personal information step
    const applications = this._getFromStorage('loan_applications');
    const offers = this._getFromStorage('loan_offers');

    const application = applications.find((a) => a.id === applicationId) || null;
    if (!application) {
      return { application: null, offerSummary: null, progressSteps: [] };
    }

    const offer = application.selected_offer_id
      ? offers.find((o) => o.id === application.selected_offer_id) || null
      : null;

    const offerSummary = offer
      ? {
          offerId: offer.id,
          loanAmount: offer.loan_amount,
          termMonths: offer.term_months,
          apr: offer.apr,
          monthlyPayment: offer.monthly_payment
        }
      : null;

    const progressSteps = this._buildApplicationNavigationSteps('personal_information');

    return {
      application: this._augmentApplication(application),
      offerSummary,
      progressSteps
    };
  }

  // updateApplicationPersonalInformation(applicationId, firstName, lastName, dateOfBirth, autopayPreferenceEnabled)
  updateApplicationPersonalInformation(applicationId, firstName, lastName, dateOfBirth, autopayPreferenceEnabled) {
    // Authentication not required for updating personal information in this flow
    const applications = this._getFromStorage('loan_applications');
    const idx = applications.findIndex((a) => a.id === applicationId);
    if (idx === -1) {
      throw new Error('Application not found');
    }
    const app = applications[idx];
    app.personal_first_name = firstName;
    app.personal_last_name = lastName;
    app.personal_date_of_birth = dateOfBirth || null; // ISO date string expected
    if (typeof autopayPreferenceEnabled === 'boolean') {
      app.autopay_preference_enabled = autopayPreferenceEnabled;
    }
    app.last_completed_step = 'personal_information';
    app.updated_at = new Date().toISOString();

    applications[idx] = app;
    this._saveToStorage('loan_applications', applications);

    return {
      application: this._augmentApplication(app),
      nextStep: 'employment_information'
    };
  }

  // getApplicationEmploymentInformationStep(applicationId)
  getApplicationEmploymentInformationStep(applicationId) {
    // Authentication not required for accessing employment information step
    const applications = this._getFromStorage('loan_applications');
    const offers = this._getFromStorage('loan_offers');

    const application = applications.find((a) => a.id === applicationId) || null;
    if (!application) {
      return { application: null, offerSummary: null, progressSteps: [] };
    }

    const offer = application.selected_offer_id
      ? offers.find((o) => o.id === application.selected_offer_id) || null
      : null;

    const offerSummary = offer
      ? {
          loanAmount: offer.loan_amount,
          termMonths: offer.term_months,
          apr: offer.apr,
          monthlyPayment: offer.monthly_payment
        }
      : null;

    const progressSteps = this._buildApplicationNavigationSteps('employment_information');

    return {
      application: this._augmentApplication(application),
      offerSummary,
      progressSteps
    };
  }

  // updateApplicationEmploymentInformation(applicationId, employmentStatus, employerName, annualIncome, monthlyHousingPayment)
  updateApplicationEmploymentInformation(applicationId, employmentStatus, employerName, annualIncome, monthlyHousingPayment) {
    // Authentication not required for updating employment information in this flow
    const applications = this._getFromStorage('loan_applications');
    const idx = applications.findIndex((a) => a.id === applicationId);
    if (idx === -1) {
      throw new Error('Application not found');
    }
    const app = applications[idx];
    app.employment_status = employmentStatus;
    app.employer_name = employerName || null;
    app.annual_income = Number(annualIncome) || 0;
    app.monthly_housing_payment = Number(monthlyHousingPayment) || 0;
    app.last_completed_step = 'employment_information';
    app.updated_at = new Date().toISOString();

    applications[idx] = app;
    this._saveToStorage('loan_applications', applications);

    return {
      application: this._augmentApplication(app),
      nextStep: 'review'
    };
  }

  // getApplicationCoApplicantStep(applicationId)
  getApplicationCoApplicantStep(applicationId) {
    this._ensureAuthenticated();
    const applications = this._getFromStorage('loan_applications');
    const coApplicants = this._getFromStorage('co_applicants');

    const application = applications.find((a) => a.id === applicationId) || null;
    if (!application) {
      return { application: null, hasCoApplicant: false, coApplicant: null };
    }

    const coApplicant = application.co_applicant_id
      ? coApplicants.find((c) => c.id === application.co_applicant_id) || null
      : null;

    return {
      application: this._augmentApplication(application),
      hasCoApplicant: !!application.has_co_applicant,
      coApplicant: this._augmentCoApplicant(coApplicant)
    };
  }

  // saveCoApplicantAndRecalculateOffers(applicationId, hasCoApplicant, firstName, lastName, annualIncome)
  saveCoApplicantAndRecalculateOffers(applicationId, hasCoApplicant, firstName, lastName, annualIncome) {
    this._ensureAuthenticated();
    const applications = this._getFromStorage('loan_applications');
    const coApplicants = this._getFromStorage('co_applicants');

    const idx = applications.findIndex((a) => a.id === applicationId);
    if (idx === -1) {
      throw new Error('Application not found');
    }

    const app = applications[idx];

    let coApplicantRecord = null;
    if (hasCoApplicant) {
      if (app.co_applicant_id) {
        const cidx = coApplicants.findIndex((c) => c.id === app.co_applicant_id);
        if (cidx !== -1) {
          coApplicants[cidx].first_name = firstName || coApplicants[cidx].first_name;
          coApplicants[cidx].last_name = lastName || coApplicants[cidx].last_name;
          coApplicants[cidx].annual_income = Number(annualIncome) || 0;
          coApplicants[cidx].updated_at = new Date().toISOString();
          coApplicantRecord = coApplicants[cidx];
        }
      }
      if (!coApplicantRecord) {
        coApplicantRecord = {
          id: this._generateId('coapp'),
          application_id: app.id,
          first_name: firstName || '',
          last_name: lastName || '',
          annual_income: Number(annualIncome) || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        coApplicants.push(coApplicantRecord);
        app.co_applicant_id = coApplicantRecord.id;
      }
      app.has_co_applicant = true;
    } else {
      app.has_co_applicant = false;
      app.co_applicant_id = null;
      coApplicantRecord = null;
    }

    app.updated_at = new Date().toISOString();
    applications[idx] = app;
    this._saveToStorage('loan_applications', applications);
    this._saveToStorage('co_applicants', coApplicants);

    // Recalculate offers scoped to this application
    const offersResult = this.searchLoanOffers(
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      'loan_amount_high_to_low',
      'application_draft',
      null,
      app.id
    );

    return {
      application: this._augmentApplication(app),
      coApplicant: this._augmentCoApplicant(coApplicantRecord),
      offers: offersResult.offers
    };
  }

  // getApplicationReview(applicationId)
  getApplicationReview(applicationId) {
    // Authentication not required for accessing application review
    const applications = this._getFromStorage('loan_applications');
    const offers = this._getFromStorage('loan_offers');
    const coApplicants = this._getFromStorage('co_applicants');

    const application = applications.find((a) => a.id === applicationId) || null;
    if (!application) {
      return {
        application: null,
        offer: null,
        coApplicant: null,
        disclosures: [],
        consentText: ''
      };
    }

    const offer = application.selected_offer_id
      ? offers.find((o) => o.id === application.selected_offer_id) || null
      : null;

    const coApplicant = application.co_applicant_id
      ? coApplicants.find((c) => c.id === application.co_applicant_id) || null
      : null;

    const disclosures = [
      'All loans are subject to credit approval.',
      'APR and terms may vary based on your credit profile and lender policies.'
    ];
    const consentText = 'By submitting this application, you certify that the information provided is accurate and authorize us and our lending partners to obtain your credit report.';

    return {
      application: this._augmentApplication(application),
      offer,
      coApplicant: this._augmentCoApplicant(coApplicant),
      disclosures,
      consentText
    };
  }

  // submitApplication(applicationId, consentAccepted)
  submitApplication(applicationId, consentAccepted) {
    this._ensureAuthenticated();
    const applications = this._getFromStorage('loan_applications');
    const idx = applications.findIndex((a) => a.id === applicationId);
    if (idx === -1) {
      return { application: null, success: false, message: 'Application not found' };
    }
    if (!consentAccepted) {
      return { application: this._augmentApplication(applications[idx]), success: false, message: 'Consent is required to submit the application.' };
    }

    const app = applications[idx];
    app.status = 'submitted';
    app.last_completed_step = 'submitted';
    app.updated_at = new Date().toISOString();
    applications[idx] = app;
    this._saveToStorage('loan_applications', applications);

    return {
      application: this._augmentApplication(app),
      success: true,
      message: 'Application submitted successfully.'
    };
  }

  // ==========================
  // Eligibility checker
  // ==========================

  // getEligibilityCheckerConfig()
  getEligibilityCheckerConfig() {
    const offers = this._getFromStorage('loan_offers');

    const termSet = new Set();
    let minAmount = null;
    let maxAmount = null;
    offers.forEach((o) => {
      if (typeof o.term_months === 'number') termSet.add(o.term_months);
      if (typeof o.loan_amount === 'number') {
        if (minAmount === null || o.loan_amount < minAmount) minAmount = o.loan_amount;
        if (maxAmount === null || o.loan_amount > maxAmount) maxAmount = o.loan_amount;
      }
    });

    const termOptions = Array.from(termSet).sort((a, b) => a - b);

    return {
      loanPurposes: [
        { value: 'debt_consolidation', label: 'Debt Consolidation' },
        { value: 'credit_card_consolidation', label: 'Credit Card Consolidation' },
        { value: 'home_improvement', label: 'Home Improvement' },
        { value: 'car_repair', label: 'Car Repair' },
        { value: 'personal_loan', label: 'Personal Loan' },
        { value: 'other', label: 'Other' }
      ],
      termOptionsMonths: termOptions.length > 0 ? termOptions : [24, 36, 48, 60],
      amountRange: {
        min: minAmount !== null ? minAmount : 1000,
        max: maxAmount !== null ? maxAmount : 50000,
        step: 500
      }
    };
  }

  // startEligibilityCheck(loanPurpose, annualIncome, monthlyHousingPayment, creditScore, termMonths, initialLoanAmount, maxMonthlyPayment)
  startEligibilityCheck(loanPurpose, annualIncome, monthlyHousingPayment, creditScore, termMonths, initialLoanAmount, maxMonthlyPayment) {
    const sessions = this._getFromStorage('eligibility_sessions');
    const apr = this._inferAprForEligibility(loanPurpose, termMonths);
    const calc = this._calculateMonthlyPayment(initialLoanAmount, apr, termMonths);

    const session = {
      id: this._generateId('elig'),
      loan_purpose: loanPurpose,
      annual_income: Number(annualIncome) || 0,
      monthly_housing_payment: Number(monthlyHousingPayment) || 0,
      credit_score: Number(creditScore) || 0,
      term_months: Number(termMonths) || 0,
      selected_loan_amount: Number(initialLoanAmount) || 0,
      max_monthly_payment: typeof maxMonthlyPayment === 'number' ? maxMonthlyPayment : null,
      estimated_monthly_payment: calc.monthlyPayment,
      created_at: new Date().toISOString()
    };

    sessions.push(session);
    this._saveToStorage('eligibility_sessions', sessions);

    return { session };
  }

  // updateEligibilityLoanAmount(sessionId, loanAmount)
  updateEligibilityLoanAmount(sessionId, loanAmount) {
    const sessions = this._getFromStorage('eligibility_sessions');
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) {
      throw new Error('Eligibility session not found');
    }
    const session = sessions[idx];
    const amount = Number(loanAmount) || 0;
    session.selected_loan_amount = amount;

    const apr = this._inferAprForEligibility(session.loan_purpose, session.term_months);
    const calc = this._calculateMonthlyPayment(amount, apr, session.term_months);
    session.estimated_monthly_payment = calc.monthlyPayment;

    sessions[idx] = session;
    this._saveToStorage('eligibility_sessions', sessions);

    return { session };
  }

  // getOffersFromEligibilitySession(sessionId, sortBy)
  getOffersFromEligibilitySession(sessionId, sortBy) {
    const sessions = this._getFromStorage('eligibility_sessions');
    const session = sessions.find((s) => s.id === sessionId) || null;
    if (!session) {
      return { session: null, offers: [] };
    }

    const result = this.searchLoanOffers(
      session.loan_purpose,
      session.selected_loan_amount,
      session.term_months,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      sortBy || 'recommended',
      'eligibility_checker',
      session.id,
      null
    );

    let offers = result.offers || [];

    // If no matching offers are found, synthesize a generic offer based on the eligibility session
    if (offers.length === 0) {
      const apr = this._inferAprForEligibility(session.loan_purpose, session.term_months);
      const calc = this._calculateMonthlyPayment(session.selected_loan_amount, apr, session.term_months);
      const offerFromSession = {
        id: 'elig_offer_' + session.id,
        lender_name: 'Eligibility Partner',
        loan_purpose: session.loan_purpose,
        rate_type: 'fixed',
        loan_amount: session.selected_loan_amount,
        term_months: session.term_months,
        apr,
        monthly_payment: calc.monthlyPayment,
        total_repayment: calc.totalRepayment,
        has_origination_fee: false,
        origination_fee_percentage: 0,
        origination_fee_amount: 0,
        has_prepayment_penalty: false,
        recommended_score: 100,
        is_active: true
      };

      // Persist eligibility-based synthetic offer into loan_offers
      const existingOffers = this._getFromStorage('loan_offers');
      if (!existingOffers.some((o) => o.id === offerFromSession.id)) {
        existingOffers.push(offerFromSession);
        this._saveToStorage('loan_offers', existingOffers);
      }

      offers = [offerFromSession];
    }

    return {
      session,
      offers
    };
  }

  // ==========================
  // Calculator
  // ==========================

  // getPersonalLoanCalculatorConfig()
  getPersonalLoanCalculatorConfig() {
    return {
      defaultLoanAmount: 10000,
      defaultApr: 9,
      termOptionsMonths: [24, 36, 48, 60]
    };
  }

  // calculatePersonalLoanPayment(loanAmount, apr, termMonths)
  calculatePersonalLoanPayment(loanAmount, apr, termMonths) {
    const calc = this._calculateMonthlyPayment(loanAmount, apr, termMonths);
    return {
      monthlyPayment: calc.monthlyPayment,
      totalRepayment: calc.totalRepayment
    };
  }

  // saveLoanCalculatorScenario(name, loanAmount, apr, termMonths)
  saveLoanCalculatorScenario(name, loanAmount, apr, termMonths) {
    const scenarios = this._getFromStorage('calculator_scenarios');
    const calc = this._calculateMonthlyPayment(loanAmount, apr, termMonths);
    const scenario = {
      id: this._generateId('calc'),
      name,
      loan_amount: Number(loanAmount) || 0,
      apr: Number(apr) || 0,
      term_months: Number(termMonths) || 0,
      monthly_payment: calc.monthlyPayment,
      total_repayment: calc.totalRepayment,
      created_at: new Date().toISOString()
    };
    scenarios.push(scenario);
    this._saveToStorage('calculator_scenarios', scenarios);
    return { scenario };
  }

  // getSavedLoanCalculatorScenarios()
  getSavedLoanCalculatorScenarios() {
    return this._getFromStorage('calculator_scenarios');
  }

  // ==========================
  // Account dashboard & loans
  // ==========================

  // getAccountDashboardSummary()
  getAccountDashboardSummary() {
    this._ensureAuthenticated();
    const applications = this._getFromStorage('loan_applications');
    const loans = this._getFromStorage('loans');
    const savedOffers = this._getFromStorage('saved_offers');

    const draftStatuses = ['draft', 'incomplete'];
    const draftApplications = applications
      .filter((a) => draftStatuses.includes(a.status))
      .map((a) => this._augmentApplication(a));

    const activeApplications = applications
      .filter((a) => !draftStatuses.includes(a.status))
      .map((a) => this._augmentApplication(a));

    const activeLoans = loans
      .filter((l) => l.status === 'active')
      .map((l) => this._augmentLoan(l));

    return {
      activeApplications,
      draftApplications,
      activeLoans,
      savedOffersCount: savedOffers.length,
      alerts: []
    };
  }

  // getMyLoans(statusFilter)
  getMyLoans(statusFilter) {
    this._ensureAuthenticated();
    const loans = this._getFromStorage('loans');
    let list = loans;
    if (Array.isArray(statusFilter) && statusFilter.length > 0) {
      const set = new Set(statusFilter);
      list = list.filter((l) => set.has(l.status));
    }
    return list.map((l) => this._augmentLoan(l));
  }

  // getLoanDetailAndPaymentSettings(loanId)
  getLoanDetailAndPaymentSettings(loanId) {
    this._ensureAuthenticated();
    const loans = this._getFromStorage('loans');
    const loan = loans.find((l) => l.id === loanId) || null;
    if (!loan) {
      return { loan: null, dueDateOptionsDayOfMonth: [], reminderTimingOptions: [] };
    }
    const dueDateOptionsDayOfMonth = [1, 5, 10, 15, 20, 25];
    const reminderTimingOptions = ['none', 'same_day', '1_day_before', '3_days_before', '7_days_before'];
    return {
      loan: this._augmentLoan(loan),
      dueDateOptionsDayOfMonth,
      reminderTimingOptions
    };
  }

  // getAvailablePaymentMethods()
  getAvailablePaymentMethods() {
    this._ensureAuthenticated();
    const bankAccounts = this._getFromStorage('bank_accounts');
    return bankAccounts.filter((b) => b.is_active !== false);
  }

  // updateLoanPaymentSettings(loanId, paymentDueDateDay, paymentMethodId, autopayEnabled, emailRemindersEnabled, reminderTiming)
  updateLoanPaymentSettings(loanId, paymentDueDateDay, paymentMethodId, autopayEnabled, emailRemindersEnabled, reminderTiming) {
    this._ensureAuthenticated();
    const loans = this._getFromStorage('loans');
    const idx = loans.findIndex((l) => l.id === loanId);
    if (idx === -1) {
      throw new Error('Loan not found');
    }
    const loan = loans[idx];
    loan.payment_due_date_day = Number(paymentDueDateDay) || loan.payment_due_date_day;
    loan.payment_method_id = paymentMethodId || null;
    loan.autopay_enabled = !!autopayEnabled;
    loan.email_reminders_enabled = !!emailRemindersEnabled;
    loan.reminder_timing = reminderTiming || 'none';
    loan.updated_at = new Date().toISOString();

    loans[idx] = loan;
    this._saveToStorage('loans', loans);

    return { loan: this._augmentLoan(loan) };
  }

  // ==========================
  // Profile & communication
  // ==========================

  // getProfileAndCommunicationPreferences()
  getProfileAndCommunicationPreferences() {
    this._ensureAuthenticated();
    const profile = this._getOrCreateProfileForCurrentUser();
    const prefs = this._getFromStorage('communication_preferences');
    let pref = prefs.find((p) => p.profile_id === profile.id) || null;
    if (!pref) {
      pref = {
        id: this._generateId('cpref'),
        profile_id: profile.id,
        primary_method: 'email',
        in_app_enabled: true,
        sms_enabled: false,
        email_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      prefs.push(pref);
      this._saveToStorage('communication_preferences', prefs);
    }

    return {
      profile,
      communicationPreference: this._augmentCommunicationPreference(pref)
    };
  }

  // updateProfileContactInformation(phoneNumber, streetAddress, city, stateRegion, postalCode)
  updateProfileContactInformation(phoneNumber, streetAddress, city, stateRegion, postalCode) {
    this._ensureAuthenticated();
    const profiles = this._getFromStorage('profiles');
    let profile = profiles.length > 0 ? profiles[0] : null;
    if (!profile) {
      profile = this._getOrCreateProfileForCurrentUser();
    }
    const idx = profiles.findIndex((p) => p.id === profile.id);

    profile.phone_number = typeof phoneNumber === 'string' ? phoneNumber : profile.phone_number;
    profile.street_address = typeof streetAddress === 'string' ? streetAddress : profile.street_address;
    profile.city = typeof city === 'string' ? city : profile.city;
    profile.state_region = typeof stateRegion === 'string' ? stateRegion : profile.state_region;
    profile.postal_code = typeof postalCode === 'string' ? postalCode : profile.postal_code;
    profile.updated_at = new Date().toISOString();

    if (idx === -1) {
      profiles.push(profile);
    } else {
      profiles[idx] = profile;
    }
    this._saveToStorage('profiles', profiles);

    return { profile };
  }

  // updateCommunicationPreferences(primaryMethod, inAppEnabled, smsEnabled, emailEnabled)
  updateCommunicationPreferences(primaryMethod, inAppEnabled, smsEnabled, emailEnabled) {
    this._ensureAuthenticated();
    const profile = this._getOrCreateProfileForCurrentUser();
    const prefs = this._getFromStorage('communication_preferences');
    let prefIdx = prefs.findIndex((p) => p.profile_id === profile.id);
    let pref = prefIdx !== -1 ? prefs[prefIdx] : null;

    if (!pref) {
      pref = {
        id: this._generateId('cpref'),
        profile_id: profile.id,
        primary_method: primaryMethod,
        in_app_enabled: !!inAppEnabled,
        sms_enabled: !!smsEnabled,
        email_enabled: !!emailEnabled,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      prefs.push(pref);
    } else {
      pref.primary_method = primaryMethod;
      pref.in_app_enabled = !!inAppEnabled;
      pref.sms_enabled = !!smsEnabled;
      pref.email_enabled = !!emailEnabled;
      pref.updated_at = new Date().toISOString();
      prefs[prefIdx] = pref;
    }

    this._saveToStorage('communication_preferences', prefs);

    return { communicationPreference: this._augmentCommunicationPreference(pref) };
  }

  // ==========================
  // Help & support
  // ==========================

  // getHelpAndContactContent()
  getHelpAndContactContent() {
    const raw = localStorage.getItem('help_and_contact_content');
    return raw
      ? JSON.parse(raw)
      : {
          faqSections: [],
          contactEmail: '',
          contactPhone: '',
          supportHours: ''
        };
  }

  // submitSupportRequest(subject, message, preferredContactMethod)
  submitSupportRequest(subject, message, preferredContactMethod) {
    const requests = this._getFromStorage('support_requests');
    const ticketId = this._generateId('ticket');
    const req = {
      id: ticketId,
      subject,
      message,
      preferred_contact_method: preferredContactMethod || null,
      created_at: new Date().toISOString()
    };
    requests.push(req);
    this._saveToStorage('support_requests', requests);
    return { success: true, ticketId };
  }

  // ==========================
  // Legal / rates / privacy
  // ==========================

  // getLegalRatesAndPrivacyContent()
  getLegalRatesAndPrivacyContent() {
    const raw = localStorage.getItem('legal_rates_privacy_content');
    return raw
      ? JSON.parse(raw)
      : {
          ratesDisclosure: '',
          feePolicies: '',
          termsOfUse: '',
          privacyPolicy: '',
          regulatoryDisclosures: ''
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
