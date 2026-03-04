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

  // -------------------- Storage Helpers --------------------
  _initStorage() {
    const listKeys = [
      // Sample keys from template (kept for compatibility, unused)
      'users',
      'products',
      'carts',
      'cartItems',
      // Domain-specific storage tables
      'credit_cards',
      'savings_accounts',
      'travel_plans',
      'travel_plan_notes',
      'health_plans',
      'articles',
      'reading_lists',
      'reading_list_items',
      'auto_loan_scenarios',
      'refinance_scenarios',
      'comparison_lists',
      'comparison_items',
      'bookmarks',
      'shortlist_items',
      'budgets',
      'budget_categories',
      'health_quotes',
      'recommended_articles',
      'newsletter_subscriptions'
    ];

    listKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      // Ensure arrays where we expect arrays
      return Array.isArray(parsed) ? parsed : [];
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

  // -------------------- Internal Helpers --------------------

  _getOrCreateComparisonList(compareType) {
    let lists = this._getFromStorage('comparison_lists');
    let list = lists.find((l) => l.compareType === compareType);
    if (!list) {
      const now = new Date().toISOString();
      list = {
        id: this._generateId('comparisonlist'),
        compareType: compareType,
        name:
          compareType === 'credit_cards'
            ? 'Credit Card Comparison'
            : 'Travel Insurance Comparison',
        createdAt: now,
        updatedAt: now
      };
      lists.push(list);
      this._saveToStorage('comparison_lists', lists);
    }
    return list;
  }

  _getOrCreateBookmarksStore() {
    let bookmarks = this._getFromStorage('bookmarks');
    if (!Array.isArray(bookmarks)) {
      bookmarks = [];
      this._saveToStorage('bookmarks', bookmarks);
    }
    return bookmarks;
  }

  _getOrCreateNewsletterSubscription() {
    let subs = this._getFromStorage('newsletter_subscriptions');
    if (subs.length > 0) {
      return subs[0];
    }
    const now = new Date().toISOString();
    const subscription = {
      id: this._generateId('newsletter'),
      email: '',
      frequency: 'weekly',
      topics: [],
      createdAt: now,
      updatedAt: now
    };
    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);
    return subscription;
  }

  _calculateLoanMetrics(principal, termMonths, annualRatePercent) {
    const n = termMonths;
    const r = (annualRatePercent || 0) / 100 / 12;
    if (n <= 0) {
      return {
        monthlyPayment: 0,
        totalInterest: 0
      };
    }
    let monthlyPayment;
    if (r === 0) {
      monthlyPayment = principal / n;
    } else {
      const pow = Math.pow(1 + r, -n);
      monthlyPayment = (principal * r) / (1 - pow);
    }
    const totalPaid = monthlyPayment * n;
    const totalInterest = totalPaid - principal;
    return {
      monthlyPayment,
      totalInterest
    };
  }

  _calculateRefinanceMetrics(currentLoanBalance, currentInterestRatePercent, newInterestRatePercent, remainingTermMonths, estimatedClosingCosts) {
    const principal = currentLoanBalance;
    const n = remainingTermMonths;

    const current = this._calculateLoanMetrics(principal, n, currentInterestRatePercent);
    const next = this._calculateLoanMetrics(principal, n, newInterestRatePercent);

    const currentMonthly = current.monthlyPayment;
    const newMonthly = next.monthlyPayment;

    const totalRemainingCurrent = currentMonthly * n;
    const totalNew = newMonthly * n + estimatedClosingCosts;
    const totalSavings = totalRemainingCurrent - totalNew;

    let breakEvenMonths = null;
    const monthlySavings = currentMonthly - newMonthly;
    if (monthlySavings > 0) {
      breakEvenMonths = Math.ceil(estimatedClosingCosts / monthlySavings);
    }

    return {
      newMonthlyPayment: newMonthly,
      totalSavings,
      breakEvenMonths
    };
  }

  _recomputeBudgetTotals(budget, categories, targetMaxExpenses) {
    const totalExpenses = (categories || []).reduce((sum, c) => {
      const amt = typeof c.amount === 'number' ? c.amount : parseFloat(c.amount) || 0;
      return sum + amt;
    }, 0);
    const hasTarget = typeof targetMaxExpenses === 'number';
    const isWithinTarget = hasTarget ? totalExpenses <= targetMaxExpenses : true;
    if (budget) {
      budget.totalExpenses = totalExpenses;
      if (hasTarget) budget.targetMaxExpenses = targetMaxExpenses;
    }
    return { totalExpenses, isWithinTarget };
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _sortByDateDesc(items, field) {
    return items.slice().sort((a, b) => {
      const da = this._parseDate(a[field]);
      const db = this._parseDate(b[field]);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });
  }

  // -------------------- Interface Implementations --------------------

  // getHomepageOverview
  getHomepageOverview() {
    const creditCards = this._getFromStorage('credit_cards').filter((c) => c.status === 'active');
    const savingsAccounts = this._getFromStorage('savings_accounts').filter((a) => a.status === 'active');
    const travelPlans = this._getFromStorage('travel_plans').filter((p) => p.status === 'active');
    const healthPlans = this._getFromStorage('health_plans').filter((p) => p.status === 'active');
    const articles = this._getFromStorage('articles');

    const featuredCreditCards = creditCards
      .slice()
      .sort((a, b) => (b.userRating || 0) - (a.userRating || 0))
      .slice(0, 3);

    const featuredSavingsAccounts = savingsAccounts
      .slice()
      .sort((a, b) => (b.apyPercent || 0) - (a.apyPercent || 0))
      .slice(0, 3);

    const featuredTravelPlans = travelPlans
      .slice()
      .sort((a, b) => (b.medicalCoverageAmount || 0) - (a.medicalCoverageAmount || 0))
      .slice(0, 3);

    const featuredHealthPlans = healthPlans
      .slice()
      .sort((a, b) => (a.monthlyPremium || 0) - (b.monthlyPremium || 0))
      .slice(0, 3);

    const recentArticles = this._sortByDateDesc(articles, 'publishedAt').slice(0, 5);

    const featuredTools = [
      {
        toolType: 'auto_loan_calculator',
        title: 'Auto Loan Calculator',
        description: 'Estimate monthly payments and total interest on your next car.'
      },
      {
        toolType: 'budget_planner',
        title: 'Budget Planner',
        description: 'Build a realistic monthly budget for your goals.'
      },
      {
        toolType: 'refinance_calculator',
        title: 'Refinance Calculator',
        description: 'See if refinancing your mortgage could save you money.'
      }
    ];

    return {
      featuredCreditCards,
      featuredSavingsAccounts,
      featuredTravelPlans,
      featuredHealthPlans,
      featuredTools,
      recentArticles
    };
  }

  // -------------------- Credit Cards --------------------

  // getCreditCardFilterOptions
  getCreditCardFilterOptions() {
    return {
      cardTypes: [
        { value: 'cash_back', label: 'Cash-back' },
        { value: 'travel', label: 'Travel' },
        { value: 'balance_transfer', label: 'Balance transfer' },
        { value: 'student', label: 'Student' },
        { value: 'business', label: 'Business' },
        { value: 'secured', label: 'Secured' },
        { value: 'other', label: 'Other' }
      ],
      primaryCategories: [
        { value: 'general', label: 'General' },
        { value: 'student', label: 'Student' },
        { value: 'business', label: 'Business' },
        { value: 'travel', label: 'Travel' },
        { value: 'premium', label: 'Premium' },
        { value: 'other', label: 'Other' }
      ],
      bonusCategoryOptions: [
        {
          id: 'groceries_3_plus',
          label: 'Groceries (3%+)',
          minRatePercent: 3
        }
      ],
      annualFeeRanges: [
        { label: 'No annual fee ($0)', maxFee: 0 },
        { label: 'Up to $99', maxFee: 99 },
        { label: 'Up to $199', maxFee: 199 },
        { label: 'Any annual fee', maxFee: Infinity }
      ],
      aprMaxOptions: [
        { label: 'Up to 20%', aprMaxPercent: 20 },
        { label: 'Up to 25%', aprMaxPercent: 25 },
        { label: 'Up to 30%', aprMaxPercent: 30 }
      ],
      ratingMinOptions: [
        { label: '3+', ratingMin: 3 },
        { label: '3.5+', ratingMin: 3.5 },
        { label: '4+', ratingMin: 4 },
        { label: '4.5+', ratingMin: 4.5 }
      ],
      foreignTransactionFeeOptions: [
        { label: '0% (No foreign transaction fees)', maxFeePercent: 0 },
        { label: 'Up to 1%', maxFeePercent: 1 },
        { label: 'Up to 3%', maxFeePercent: 3 }
      ],
      sortOptions: [
        { value: 'grocery_cash_back_high_to_low', label: 'Grocery cash-back: High to Low' },
        { value: 'overall_rating_high_to_low', label: 'Overall rating: High to Low' },
        { value: 'apr_low_to_high', label: 'APR: Low to High' }
      ]
    };
  }

  // listCreditCards(filters, sort, page, pageSize)
  listCreditCards(filters, sort, page, pageSize) {
    const cardsAll = this._getFromStorage('credit_cards');
    filters = filters || {};
    sort = sort || null;
    page = page && page > 0 ? page : 1;
    pageSize = pageSize && pageSize > 0 ? pageSize : 20;

    let cards = cardsAll.filter((card) => {
      if (filters.status && card.status !== filters.status) return false;
      if (!filters.status && card.status !== 'active') return false;

      if (filters.cardType && card.cardType !== filters.cardType) return false;
      if (filters.primaryCategory && card.primaryCategory !== filters.primaryCategory) return false;

      if (
        typeof filters.hasGroceriesBonusMinPercent === 'number' &&
        filters.hasGroceriesBonusMinPercent > 0
      ) {
        const bonuses = Array.isArray(card.bonusCategories) ? card.bonusCategories : [];
        const hasGrocery = bonuses.some(
          (b) => b && b.category === 'groceries' && (b.ratePercent || 0) >= filters.hasGroceriesBonusMinPercent
        );
        if (!hasGrocery) return false;
      }

      if (typeof filters.annualFeeMax === 'number') {
        if ((card.annualFee || 0) > filters.annualFeeMax) return false;
      }

      if (typeof filters.aprMaxPercent === 'number') {
        if ((card.aprMaxPercent || 0) > filters.aprMaxPercent) return false;
      }

      if (typeof filters.userRatingMin === 'number') {
        if ((card.userRating || 0) < filters.userRatingMin) return false;
      }

      if (typeof filters.foreignTransactionFeePercentMax === 'number') {
        if ((card.foreignTransactionFeePercent || 0) > filters.foreignTransactionFeePercentMax) return false;
      }

      if (Array.isArray(filters.perksIncludes) && filters.perksIncludes.length > 0) {
        const cardPerks = Array.isArray(card.perks) ? card.perks : [];
        const hasAny = filters.perksIncludes.some((p) => cardPerks.includes(p));
        if (!hasAny) return false;
      }

      return true;
    });

    // Sorting
    if (sort === 'grocery_cash_back_high_to_low') {
      cards.sort((a, b) => {
        const getGroceryRate = (card) => {
          const bonuses = Array.isArray(card.bonusCategories) ? card.bonusCategories : [];
          const g = bonuses.find((b) => b && b.category === 'groceries');
          return g ? g.ratePercent || 0 : 0;
        };
        return getGroceryRate(b) - getGroceryRate(a);
      });
    } else if (sort === 'overall_rating_high_to_low') {
      cards.sort((a, b) => (b.userRating || 0) - (a.userRating || 0));
    } else if (sort === 'apr_low_to_high') {
      cards.sort((a, b) => (a.aprMaxPercent || 0) - (b.aprMaxPercent || 0));
    }

    const totalCount = cards.length;
    const start = (page - 1) * pageSize;
    const paged = cards.slice(start, start + pageSize);

    return {
      totalCount,
      page,
      pageSize,
      cards: paged
    };
  }

  // getCreditCardDetail(creditCardId)
  getCreditCardDetail(creditCardId) {
    const cards = this._getFromStorage('credit_cards');
    const card = cards.find((c) => c.id === creditCardId) || null;
    if (!card) {
      return {
        card: null,
        rewardsSummary: '',
        feesSummary: '',
        aprRangeDisplay: '',
        bonusCategoriesDisplay: [],
        canAddToComparison: false,
        isInShortlist: false,
        relatedCards: []
      };
    }

    const bonuses = Array.isArray(card.bonusCategories) ? card.bonusCategories : [];
    const bonusCategoriesDisplay = bonuses.map((b) => {
      if (!b) return '';
      return `${b.ratePercent || 0}% back on ${b.category}`;
    });
    const rewardsSummary =
      bonusCategoriesDisplay.length > 0
        ? 'Bonus categories: ' + bonusCategoriesDisplay.join(', ')
        : 'No specified bonus categories.';

    const feesSummary = `Annual fee: $${card.annualFee || 0}. Foreign transaction fee: ${
      card.foreignTransactionFeePercent != null ? card.foreignTransactionFeePercent : 0
    }%.`;

    let aprRangeDisplay = '';
    if (card.aprMinPercent != null) {
      aprRangeDisplay = `${card.aprMinPercent.toFixed(2)}%–${card.aprMaxPercent.toFixed(2)}% variable`;
    } else if (card.aprMaxPercent != null) {
      aprRangeDisplay = `${card.aprMaxPercent.toFixed(2)}% variable`;
    }

    const shortlistItems = this._getFromStorage('shortlist_items');
    const isInShortlist = shortlistItems.some((s) => s.creditCardId === creditCardId);

    const relatedCards = cards
      .filter((c) => c.id !== creditCardId && c.status === 'active' && c.cardType === card.cardType)
      .sort((a, b) => (b.userRating || 0) - (a.userRating || 0))
      .slice(0, 3);

    return {
      card,
      rewardsSummary,
      feesSummary,
      aprRangeDisplay,
      bonusCategoriesDisplay,
      canAddToComparison: card.status === 'active',
      isInShortlist,
      relatedCards
    };
  }

  // addCreditCardToComparison(creditCardId)
  addCreditCardToComparison(creditCardId) {
    const cards = this._getFromStorage('credit_cards');
    const card = cards.find((c) => c.id === creditCardId);
    if (!card) {
      return { success: false, message: 'Credit card not found', comparisonListId: null, compareType: 'credit_cards', items: [] };
    }

    const list = this._getOrCreateComparisonList('credit_cards');
    let items = this._getFromStorage('comparison_items');

    const exists = items.some(
      (i) => i.compareType === 'credit_cards' && i.comparisonListId === list.id && i.itemId === creditCardId
    );
    if (!exists) {
      const now = new Date().toISOString();
      const comparisonItem = {
        id: this._generateId('comparisonitem'),
        comparisonListId: list.id,
        compareType: 'credit_cards',
        itemId: creditCardId,
        addedAt: now
      };
      items.push(comparisonItem);
      this._saveToStorage('comparison_items', items);
    }

    // Build resolved items
    const resolvedItems = items
      .filter((i) => i.compareType === 'credit_cards' && i.comparisonListId === list.id)
      .map((i) => ({
        comparisonItemId: i.id,
        card: cards.find((c) => c.id === i.itemId) || null
      }));

    return {
      success: true,
      message: 'Added to comparison',
      comparisonListId: list.id,
      compareType: 'credit_cards',
      items: resolvedItems
    };
  }

  // getCreditCardComparison()
  getCreditCardComparison() {
    const list = this._getOrCreateComparisonList('credit_cards');
    const items = this._getFromStorage('comparison_items');
    const cards = this._getFromStorage('credit_cards');

    const resolvedItems = items
      .filter((i) => i.compareType === 'credit_cards' && i.comparisonListId === list.id)
      .map((i) => ({
        comparisonItemId: i.id,
        card: cards.find((c) => c.id === i.itemId) || null
      }));

    return {
      comparisonListId: list.id,
      compareType: 'credit_cards',
      items: resolvedItems
    };
  }

  // removeCreditCardFromComparison(comparisonItemId)
  removeCreditCardFromComparison(comparisonItemId) {
    let items = this._getFromStorage('comparison_items');
    const cards = this._getFromStorage('credit_cards');

    const idx = items.findIndex((i) => i.id === comparisonItemId && i.compareType === 'credit_cards');
    if (idx === -1) {
      return { success: false, message: 'Comparison item not found', remainingItems: [] };
    }

    const listId = items[idx].comparisonListId;
    items.splice(idx, 1);
    this._saveToStorage('comparison_items', items);

    const remainingItems = items
      .filter((i) => i.compareType === 'credit_cards' && i.comparisonListId === listId)
      .map((i) => ({
        comparisonItemId: i.id,
        card: cards.find((c) => c.id === i.itemId) || null
      }));

    return {
      success: true,
      message: 'Removed from comparison',
      remainingItems
    };
  }

  // addCreditCardToShortlist(creditCardId)
  addCreditCardToShortlist(creditCardId) {
    const cards = this._getFromStorage('credit_cards');
    const card = cards.find((c) => c.id === creditCardId);
    if (!card) {
      return { success: false, message: 'Credit card not found', shortlistItemId: null };
    }

    let items = this._getFromStorage('shortlist_items');
    const existing = items.find((i) => i.creditCardId === creditCardId);
    if (existing) {
      return { success: true, message: 'Already in shortlist', shortlistItemId: existing.id };
    }

    const now = new Date().toISOString();
    const item = {
      id: this._generateId('shortlistitem'),
      creditCardId,
      addedAt: now
    };
    items.push(item);
    this._saveToStorage('shortlist_items', items);

    return {
      success: true,
      message: 'Added to shortlist',
      shortlistItemId: item.id
    };
  }

  // getShortlist()
  getShortlist() {
    const items = this._getFromStorage('shortlist_items');
    const cards = this._getFromStorage('credit_cards');

    const resolved = items.map((i) => ({
      shortlistItemId: i.id,
      card: cards.find((c) => c.id === i.creditCardId) || null
    }));

    return { items: resolved };
  }

  // removeFromShortlist(shortlistItemId)
  removeFromShortlist(shortlistItemId) {
    let items = this._getFromStorage('shortlist_items');
    const idx = items.findIndex((i) => i.id === shortlistItemId);
    if (idx === -1) {
      return { success: false, message: 'Shortlist item not found' };
    }
    items.splice(idx, 1);
    this._saveToStorage('shortlist_items', items);
    return { success: true, message: 'Removed from shortlist' };
  }

  // -------------------- Savings Accounts & Bookmarks --------------------

  // getSavingsAccountFilterOptions
  getSavingsAccountFilterOptions() {
    const accounts = this._getFromStorage('savings_accounts').filter((a) => a.status === 'active');

    let minBalance = 0;
    let maxBalance = 10000;
    if (accounts.length > 0) {
      minBalance = accounts.reduce((min, a) => Math.min(min, a.minimumBalance || 0), accounts[0].minimumBalance || 0);
      maxBalance = accounts.reduce((max, a) => Math.max(max, a.minimumBalance || 0), accounts[0].minimumBalance || 0);
    }

    return {
      accountTypes: [
        { value: 'savings', label: 'Savings' },
        { value: 'high_yield_savings', label: 'High-yield savings' },
        { value: 'money_market', label: 'Money market' },
        { value: 'checking', label: 'Checking' },
        { value: 'cd', label: 'CD' }
      ],
      institutionTypes: [
        { value: 'bank', label: 'Banks' },
        { value: 'credit_union', label: 'Credit unions' }
      ],
      minimumBalanceSlider: {
        min: minBalance,
        max: maxBalance,
        step: 50
      },
      sortOptions: [
        { value: 'apy_high_to_low', label: 'APY: High to Low' },
        { value: 'apy_low_to_high', label: 'APY: Low to High' },
        { value: 'fees_low_to_high', label: 'Monthly fees: Low to High' }
      ]
    };
  }

  // listSavingsAccounts(filters, sort, page, pageSize)
  listSavingsAccounts(filters, sort, page, pageSize) {
    const all = this._getFromStorage('savings_accounts');
    filters = filters || {};
    sort = sort || null;
    page = page && page > 0 ? page : 1;
    pageSize = pageSize && pageSize > 0 ? pageSize : 20;

    let accounts = all.filter((acc) => {
      if (filters.status && acc.status !== filters.status) return false;
      if (!filters.status && acc.status !== 'active') return false;

      if (filters.accountType && acc.accountType !== filters.accountType) return false;
      if (filters.institutionType && acc.institutionType !== filters.institutionType) return false;

      if (typeof filters.minimumBalanceMax === 'number') {
        if ((acc.minimumBalance || 0) > filters.minimumBalanceMax) return false;
      }

      if (typeof filters.apyMinPercent === 'number') {
        if ((acc.apyPercent || 0) < filters.apyMinPercent) return false;
      }

      return true;
    });

    if (sort === 'apy_high_to_low') {
      accounts.sort((a, b) => (b.apyPercent || 0) - (a.apyPercent || 0));
    } else if (sort === 'apy_low_to_high') {
      accounts.sort((a, b) => (a.apyPercent || 0) - (b.apyPercent || 0));
    } else if (sort === 'fees_low_to_high') {
      accounts.sort((a, b) => (a.monthlyFee || 0) - (b.monthlyFee || 0));
    }

    const totalCount = accounts.length;
    const start = (page - 1) * pageSize;
    const paged = accounts.slice(start, start + pageSize);

    return {
      totalCount,
      page,
      pageSize,
      accounts: paged
    };
  }

  // getSavingsAccountDetail(savingsAccountId)
  getSavingsAccountDetail(savingsAccountId) {
    const accounts = this._getFromStorage('savings_accounts');
    const account = accounts.find((a) => a.id === savingsAccountId) || null;
    if (!account) {
      return {
        account: null,
        apyDisplay: '',
        feesSummary: '',
        institutionDisplayName: '',
        isBookmarked: false,
        relatedAccounts: []
      };
    }

    const apyDisplay = `${(account.apyPercent || 0).toFixed(2)}% APY`;
    const fee = account.monthlyFee || 0;
    const feesSummary = fee === 0 ? 'No monthly maintenance fee.' : `$${fee} monthly maintenance fee.`;
    const institutionDisplayName = account.institutionName || '';

    const bookmarks = this._getFromStorage('bookmarks');
    const isBookmarked = bookmarks.some(
      (b) => b.itemType === 'savings_account' && b.itemId === savingsAccountId
    );

    const relatedAccounts = accounts
      .filter((a) => a.id !== savingsAccountId && a.institutionType === account.institutionType)
      .sort((a, b) => (b.apyPercent || 0) - (a.apyPercent || 0))
      .slice(0, 3);

    return {
      account,
      apyDisplay,
      feesSummary,
      institutionDisplayName,
      isBookmarked,
      relatedAccounts
    };
  }

  // addBookmark(itemType, itemId)
  addBookmark(itemType, itemId) {
    let bookmarks = this._getOrCreateBookmarksStore();

    const existing = bookmarks.find((b) => b.itemType === itemType && b.itemId === itemId);
    if (existing) {
      return { success: true, bookmarkId: existing.id, message: 'Already bookmarked' };
    }

    const now = new Date().toISOString();
    const bookmark = {
      id: this._generateId('bookmark'),
      itemType,
      itemId,
      bookmarkedAt: now
    };
    bookmarks.push(bookmark);
    this._saveToStorage('bookmarks', bookmarks);

    return { success: true, bookmarkId: bookmark.id, message: 'Bookmarked' };
  }

  // getBookmarks()
  getBookmarks() {
    const bookmarks = this._getFromStorage('bookmarks');
    const savingsAccounts = this._getFromStorage('savings_accounts');
    const creditCards = this._getFromStorage('credit_cards');
    const travelPlans = this._getFromStorage('travel_plans');
    const healthPlans = this._getFromStorage('health_plans');

    const items = bookmarks.map((b) => {
      let savingsAccount = null;
      let creditCard = null;
      let travelPlan = null;
      let healthPlan = null;
      if (b.itemType === 'savings_account') {
        savingsAccount = savingsAccounts.find((a) => a.id === b.itemId) || null;
      } else if (b.itemType === 'credit_card') {
        creditCard = creditCards.find((c) => c.id === b.itemId) || null;
      } else if (b.itemType === 'travel_plan') {
        travelPlan = travelPlans.find((p) => p.id === b.itemId) || null;
      } else if (b.itemType === 'health_plan') {
        healthPlan = healthPlans.find((p) => p.id === b.itemId) || null;
      }

      return {
        bookmarkId: b.id,
        itemType: b.itemType,
        savingsAccount,
        creditCard,
        travelPlan,
        healthPlan
      };
    });

    return { items };
  }

  // removeBookmark(bookmarkId)
  removeBookmark(bookmarkId) {
    let bookmarks = this._getFromStorage('bookmarks');
    const idx = bookmarks.findIndex((b) => b.id === bookmarkId);
    if (idx === -1) {
      return { success: false, message: 'Bookmark not found' };
    }
    bookmarks.splice(idx, 1);
    this._saveToStorage('bookmarks', bookmarks);
    return { success: true, message: 'Bookmark removed' };
  }

  // -------------------- Auto Loan Calculator --------------------

  // calculateAutoLoan(loanAmount, termMonths, interestRatePercent, downPayment)
  calculateAutoLoan(loanAmount, termMonths, interestRatePercent, downPayment) {
    const dp = typeof downPayment === 'number' ? downPayment : 0;
    const principal = Math.max(0, (loanAmount || 0) - dp);
    const metrics = this._calculateLoanMetrics(principal, termMonths, interestRatePercent);

    const totalPaid = metrics.monthlyPayment * termMonths;
    const amortizationSummary = `Total of ${termMonths} payments: $${totalPaid.toFixed(
      2
    )}; total interest: $${metrics.totalInterest.toFixed(2)}.`;

    return {
      monthlyPayment: metrics.monthlyPayment,
      totalInterest: metrics.totalInterest,
      amortizationSummary
    };
  }

  // saveAutoLoanScenario(loanAmount, termMonths, interestRatePercent, downPayment, monthlyPayment, totalInterest)
  saveAutoLoanScenario(loanAmount, termMonths, interestRatePercent, downPayment, monthlyPayment, totalInterest) {
    const dp = typeof downPayment === 'number' ? downPayment : 0;
    const principal = Math.max(0, (loanAmount || 0) - dp);

    let mp = monthlyPayment;
    let ti = totalInterest;
    if (typeof mp !== 'number' || typeof ti !== 'number') {
      const metrics = this._calculateLoanMetrics(principal, termMonths, interestRatePercent);
      mp = metrics.monthlyPayment;
      ti = metrics.totalInterest;
    }

    const now = new Date().toISOString();
    const scenario = {
      id: this._generateId('autoloan'),
      loanAmount,
      termMonths,
      interestRatePercent,
      downPayment: dp,
      monthlyPayment: mp,
      totalInterest: ti,
      createdAt: now
    };

    const scenarios = this._getFromStorage('auto_loan_scenarios');
    scenarios.push(scenario);
    this._saveToStorage('auto_loan_scenarios', scenarios);

    return { scenario };
  }

  // getSavedAutoLoanScenarios()
  getSavedAutoLoanScenarios() {
    const scenarios = this._getFromStorage('auto_loan_scenarios');
    return this._sortByDateDesc(scenarios, 'createdAt');
  }

  // -------------------- Travel Insurance --------------------

  // getTravelInsuranceFilterOptions
  getTravelInsuranceFilterOptions() {
    const plans = this._getFromStorage('travel_plans').filter((p) => p.status === 'active');
    let minPremium = 0;
    let maxPremium = 2000;
    if (plans.length > 0) {
      minPremium = plans.reduce((min, p) => Math.min(min, p.totalPremium || 0), plans[0].totalPremium || 0);
      maxPremium = plans.reduce((max, p) => Math.max(max, p.totalPremium || 0), plans[0].totalPremium || 0);
    }

    return {
      totalPremiumSlider: {
        min: minPremium,
        max: maxPremium,
        step: 5
      },
      sortOptions: [
        { value: 'medical_coverage_high_to_low', label: 'Medical coverage: High to Low' },
        { value: 'price_low_to_high', label: 'Price: Low to High' }
      ]
    };
  }

  // listTravelPlans(tripCost, durationDays, filters, sort, page, pageSize)
  listTravelPlans(tripCost, durationDays, filters, sort, page, pageSize) {
    const all = this._getFromStorage('travel_plans');
    filters = filters || {};
    sort = sort || null;
    page = page && page > 0 ? page : 1;
    pageSize = pageSize && pageSize > 0 ? pageSize : 20;

    let plans = all.filter((p) => {
      if (filters.status && p.status !== filters.status) return false;
      if (!filters.status && p.status !== 'active') return false;

      if (typeof filters.totalPremiumMax === 'number') {
        if ((p.totalPremium || 0) > filters.totalPremiumMax) return false;
      }

      return true;
    });

    if (sort === 'medical_coverage_high_to_low') {
      plans.sort((a, b) => (b.medicalCoverageAmount || 0) - (a.medicalCoverageAmount || 0));
    } else if (sort === 'price_low_to_high') {
      plans.sort((a, b) => (a.totalPremium || 0) - (b.totalPremium || 0));
    }

    const totalCount = plans.length;
    const start = (page - 1) * pageSize;
    const paged = plans.slice(start, start + pageSize);

    return {
      totalCount,
      page,
      pageSize,
      plans: paged
    };
  }

  // addTravelPlanToComparison(travelPlanId)
  addTravelPlanToComparison(travelPlanId) {
    const plans = this._getFromStorage('travel_plans');
    const plan = plans.find((p) => p.id === travelPlanId);
    if (!plan) {
      return { success: false, comparisonListId: null, compareType: 'travel_insurance', items: [] };
    }

    const list = this._getOrCreateComparisonList('travel_insurance');
    let items = this._getFromStorage('comparison_items');

    const exists = items.some(
      (i) => i.compareType === 'travel_insurance' && i.comparisonListId === list.id && i.itemId === travelPlanId
    );

    if (!exists) {
      const now = new Date().toISOString();
      const item = {
        id: this._generateId('comparisonitem'),
        comparisonListId: list.id,
        compareType: 'travel_insurance',
        itemId: travelPlanId,
        addedAt: now
      };
      items.push(item);
      this._saveToStorage('comparison_items', items);
    }

    const resolvedItems = items
      .filter((i) => i.compareType === 'travel_insurance' && i.comparisonListId === list.id)
      .map((i) => ({
        comparisonItemId: i.id,
        plan: plans.find((p) => p.id === i.itemId) || null
      }));

    return {
      success: true,
      comparisonListId: list.id,
      compareType: 'travel_insurance',
      items: resolvedItems
    };
  }

  // getTravelPlanComparison()
  getTravelPlanComparison() {
    const list = this._getOrCreateComparisonList('travel_insurance');
    const items = this._getFromStorage('comparison_items');
    const plans = this._getFromStorage('travel_plans');

    const resolvedItems = items
      .filter((i) => i.compareType === 'travel_insurance' && i.comparisonListId === list.id)
      .map((i) => ({
        comparisonItemId: i.id,
        plan: plans.find((p) => p.id === i.itemId) || null
      }));

    return {
      comparisonListId: list.id,
      compareType: 'travel_insurance',
      items: resolvedItems
    };
  }

  // removeTravelPlanFromComparison(comparisonItemId)
  removeTravelPlanFromComparison(comparisonItemId) {
    let items = this._getFromStorage('comparison_items');
    const idx = items.findIndex(
      (i) => i.id === comparisonItemId && i.compareType === 'travel_insurance'
    );
    if (idx === -1) {
      return { success: false, message: 'Comparison item not found' };
    }
    items.splice(idx, 1);
    this._saveToStorage('comparison_items', items);
    return { success: true, message: 'Removed from comparison' };
  }

  // getTravelPlanDetail(travelPlanId)
  getTravelPlanDetail(travelPlanId) {
    const plans = this._getFromStorage('travel_plans');
    const plan = plans.find((p) => p.id === travelPlanId) || null;

    const notes = this._getFromStorage('travel_plan_notes').filter(
      (n) => n.travelPlanId === travelPlanId
    );

    const bookmarks = this._getFromStorage('bookmarks');
    const isBookmarked = bookmarks.some(
      (b) => b.itemType === 'travel_plan' && b.itemId === travelPlanId
    );

    let coverageSummary = '';
    if (plan) {
      coverageSummary = `Medical: $${plan.medicalCoverageAmount || 0}`;
      if (plan.evacuationCoverageAmount != null) {
        coverageSummary += `, Evacuation: $${plan.evacuationCoverageAmount}`;
      }
      if (plan.tripCancellationCoverageAmount != null) {
        coverageSummary += `, Trip cancellation: $${plan.tripCancellationCoverageAmount}`;
      }
      coverageSummary += '.';
    }

    return {
      plan,
      coverageSummary,
      notes,
      isBookmarked
    };
  }

  // addTravelPlanNote(travelPlanId, noteText)
  addTravelPlanNote(travelPlanId, noteText) {
    const now = new Date().toISOString();
    const note = {
      id: this._generateId('travelplannote'),
      travelPlanId,
      noteText,
      createdAt: now,
      updatedAt: now
    };
    const notes = this._getFromStorage('travel_plan_notes');
    notes.push(note);
    this._saveToStorage('travel_plan_notes', notes);
    return { note };
  }

  // updateTravelPlanNote(noteId, noteText)
  updateTravelPlanNote(noteId, noteText) {
    let notes = this._getFromStorage('travel_plan_notes');
    const idx = notes.findIndex((n) => n.id === noteId);
    if (idx === -1) {
      return { note: null };
    }
    const note = notes[idx];
    note.noteText = noteText;
    note.updatedAt = new Date().toISOString();
    notes[idx] = note;
    this._saveToStorage('travel_plan_notes', notes);
    return { note };
  }

  // getTravelPlanNotes(travelPlanId)
  getTravelPlanNotes(travelPlanId) {
    const notes = this._getFromStorage('travel_plan_notes').filter(
      (n) => n.travelPlanId === travelPlanId
    );
    return notes;
  }

  // -------------------- Articles & Reading Lists --------------------

  // searchArticles(query, filters, page, pageSize)
  searchArticles(query, filters, page, pageSize) {
    const all = this._getFromStorage('articles');
    filters = filters || {};
    page = page && page > 0 ? page : 1;
    pageSize = pageSize && pageSize > 0 ? pageSize : 20;
    const q = (query || '').toLowerCase();

    const now = new Date();
    const oneYearAgo = new Date(now.getTime());
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    let articles = all.filter((a) => {
      if (q) {
        const topicsText = Array.isArray(a.topics) ? ' ' + a.topics.join(' ') : '';
        const text = `${a.title || ''} ${(a.summary || '')} ${(a.content || '')}${topicsText}`.toLowerCase();
        const terms = q.split(/\s+/).filter((t) => t.length > 2);
        const matches = terms.length === 0 ? text.includes(q) : terms.every((t) => text.includes(t));
        if (!matches) return false;
      }

      if (filters.dateRange === 'past_12_months') {
        const d = this._parseDate(a.publishedAt);
        if (!d || d < oneYearAgo) return false;
      }

      if (typeof filters.minRating === 'number') {
        if ((a.averageRating || 0) < filters.minRating) return false;
      }

      if (Array.isArray(filters.topics) && filters.topics.length > 0) {
        const at = Array.isArray(a.topics) ? a.topics : [];
        const hasAny = filters.topics.some((t) => at.includes(t));
        if (!hasAny) return false;
      }

      return true;
    });

    // Recent first
    articles = this._sortByDateDesc(articles, 'publishedAt');

    const totalCount = articles.length;
    const start = (page - 1) * pageSize;
    const paged = articles.slice(start, start + pageSize);

    return {
      totalCount,
      page,
      pageSize,
      articles: paged
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const all = this._getFromStorage('articles');
    const article = all.find((a) => a.id === articleId) || null;

    let ratingDisplay = '';
    if (article) {
      const avg = article.averageRating || 0;
      const count = article.ratingCount || 0;
      if (count > 0) {
        ratingDisplay = `${avg.toFixed(1)} out of 5 (${count} reviews)`;
      } else {
        ratingDisplay = 'No ratings yet';
      }
    }

    let relatedArticles = [];
    if (article) {
      const topics = Array.isArray(article.topics) ? article.topics : [];
      relatedArticles = all
        .filter((a) => a.id !== article.id)
        .filter((a) => {
          const at = Array.isArray(a.topics) ? a.topics : [];
          return topics.some((t) => at.includes(t));
        })
        .slice(0, 5);
    }

    return {
      article,
      ratingDisplay,
      relatedArticles
    };
  }

  // getReadingLists()
  getReadingLists() {
    return this._getFromStorage('reading_lists');
  }

  // createReadingList(name, description)
  createReadingList(name, description) {
    const now = new Date().toISOString();
    const readingList = {
      id: this._generateId('readinglist'),
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now
    };
    const lists = this._getFromStorage('reading_lists');
    lists.push(readingList);
    this._saveToStorage('reading_lists', lists);
    return { readingList };
  }

  // addArticleToReadingList(readingListId, articleId)
  addArticleToReadingList(readingListId, articleId) {
    const now = new Date().toISOString();
    const item = {
      id: this._generateId('readinglistitem'),
      readingListId,
      articleId,
      addedAt: now
    };
    const items = this._getFromStorage('reading_list_items');
    items.push(item);
    this._saveToStorage('reading_list_items', items);
    return { item };
  }

  // getReadingListDetail(readingListId)
  getReadingListDetail(readingListId) {
    const lists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    const readingList = lists.find((l) => l.id === readingListId) || null;
    const resolvedItems = items
      .filter((i) => i.readingListId === readingListId)
      .map((i) => ({
        readingListItemId: i.id,
        article: articles.find((a) => a.id === i.articleId) || null
      }));

    return {
      readingList,
      items: resolvedItems
    };
  }

  // -------------------- Budget Planner --------------------

  // saveBudget(name, categories, targetMaxExpenses)
  saveBudget(name, categories, targetMaxExpenses) {
    categories = Array.isArray(categories) ? categories : [];
    const now = new Date().toISOString();

    const budget = {
      id: this._generateId('budget'),
      name,
      totalExpenses: 0,
      targetMaxExpenses: typeof targetMaxExpenses === 'number' ? targetMaxExpenses : undefined,
      createdAt: now,
      updatedAt: now
    };

    // Compute totals
    const { totalExpenses, isWithinTarget } = this._recomputeBudgetTotals(
      budget,
      categories,
      targetMaxExpenses
    );

    budget.totalExpenses = totalExpenses;

    const budgets = this._getFromStorage('budgets');
    budgets.push(budget);
    this._saveToStorage('budgets', budgets);

    const existingCats = this._getFromStorage('budget_categories');
    const createdCategories = categories.map((c) => {
      return {
        id: this._generateId('budgetcat'),
        budgetId: budget.id,
        name: c.name,
        amount: typeof c.amount === 'number' ? c.amount : parseFloat(c.amount) || 0
      };
    });
    const allCats = existingCats.concat(createdCategories);
    this._saveToStorage('budget_categories', allCats);

    return {
      budget,
      categories: createdCategories,
      isWithinTarget
    };
  }

  // getBudgetDetail(budgetId)
  getBudgetDetail(budgetId) {
    const budgets = this._getFromStorage('budgets');
    const cats = this._getFromStorage('budget_categories');
    const budget = budgets.find((b) => b.id === budgetId) || null;
    const categories = cats.filter((c) => c.budgetId === budgetId);
    return { budget, categories };
  }

  // getBudgets()
  getBudgets() {
    const budgets = this._getFromStorage('budgets');
    return this._sortByDateDesc(budgets, 'createdAt');
  }

  // -------------------- Health Insurance --------------------

  // listHealthPlans(age, filters, sort, page, pageSize)
  listHealthPlans(age, filters, sort, page, pageSize) {
    const all = this._getFromStorage('health_plans');
    filters = filters || {};
    sort = sort || null;
    page = page && page > 0 ? page : 1;
    pageSize = pageSize && pageSize > 0 ? pageSize : 20;

    let plans = all.filter((p) => {
      if (filters.status && p.status !== filters.status) return false;
      if (!filters.status && p.status !== 'active') return false;

      if (typeof age === 'number') {
        if (typeof p.ageMin === 'number' && age < p.ageMin) return false;
        if (typeof p.ageMax === 'number' && age > p.ageMax) return false;
      }

      if (filters.metalTier && p.metalTier !== filters.metalTier) return false;

      if (typeof filters.monthlyPremiumMax === 'number') {
        if ((p.monthlyPremium || 0) > filters.monthlyPremiumMax) return false;
      }

      if (typeof filters.deductibleMax === 'number') {
        if ((p.deductible || 0) > filters.deductibleMax) return false;
      }

      return true;
    });

    if (sort === 'monthly_premium_low_to_high') {
      plans.sort((a, b) => (a.monthlyPremium || 0) - (b.monthlyPremium || 0));
    }

    const totalCount = plans.length;
    const start = (page - 1) * pageSize;
    const paged = plans.slice(start, start + pageSize);

    return {
      totalCount,
      page,
      pageSize,
      plans: paged
    };
  }

  // getHealthPlanDetail(healthPlanId)
  getHealthPlanDetail(healthPlanId) {
    const plans = this._getFromStorage('health_plans');
    const plan = plans.find((p) => p.id === healthPlanId) || null;
    let coverageSummary = '';
    if (plan) {
      coverageSummary = `Monthly premium: $${plan.monthlyPremium || 0}, deductible: $${
        plan.deductible || 0
      }.`;
    }
    return {
      plan,
      coverageSummary
    };
  }

  // startHealthQuote(healthPlanId, age, zipCode, state, dateOfBirth)
  startHealthQuote(healthPlanId, age, zipCode, state, dateOfBirth) {
    const plans = this._getFromStorage('health_plans');
    const plan = plans.find((p) => p.id === healthPlanId) || null;

    const now = new Date().toISOString();
    const quote = {
      id: this._generateId('healthquote'),
      healthPlanId,
      age,
      zipCode,
      state: state || undefined,
      dateOfBirth,
      quoteResultSummary: plan
        ? `Quote started for ${plan.name} at approximately $${plan.monthlyPremium || 0} per month.`
        : 'Quote started.',
      createdAt: now
    };

    const quotes = this._getFromStorage('health_quotes');
    quotes.push(quote);
    this._saveToStorage('health_quotes', quotes);

    const quoteSummaryDisplay = quote.quoteResultSummary;

    return {
      quote,
      quoteSummaryDisplay
    };
  }

  // -------------------- Refinance Calculator --------------------

  // calculateRefinance(currentLoanBalance, currentInterestRatePercent, newInterestRatePercent, remainingTermMonths, estimatedClosingCosts)
  calculateRefinance(currentLoanBalance, currentInterestRatePercent, newInterestRatePercent, remainingTermMonths, estimatedClosingCosts) {
    const metrics = this._calculateRefinanceMetrics(
      currentLoanBalance,
      currentInterestRatePercent,
      newInterestRatePercent,
      remainingTermMonths,
      estimatedClosingCosts
    );

    const summaryDisplay = `New monthly payment: $${metrics.newMonthlyPayment.toFixed(
      2
    )}. Estimated total savings: $${(metrics.totalSavings || 0).toFixed(2)}. Break-even in ${
      metrics.breakEvenMonths != null ? metrics.breakEvenMonths : 'N/A'
    } months.`;

    return {
      newMonthlyPayment: metrics.newMonthlyPayment,
      totalSavings: metrics.totalSavings,
      breakEvenMonths: metrics.breakEvenMonths,
      summaryDisplay
    };
  }

  // saveRefinanceScenario(currentLoanBalance, currentInterestRatePercent, newInterestRatePercent, remainingTermMonths, estimatedClosingCosts, newMonthlyPayment, totalSavings, breakEvenMonths)
  saveRefinanceScenario(currentLoanBalance, currentInterestRatePercent, newInterestRatePercent, remainingTermMonths, estimatedClosingCosts, newMonthlyPayment, totalSavings, breakEvenMonths) {
    let nm = newMonthlyPayment;
    let ts = totalSavings;
    let be = breakEvenMonths;

    if (
      typeof nm !== 'number' ||
      typeof ts !== 'number' ||
      (be == null && be !== 0)
    ) {
      const metrics = this._calculateRefinanceMetrics(
        currentLoanBalance,
        currentInterestRatePercent,
        newInterestRatePercent,
        remainingTermMonths,
        estimatedClosingCosts
      );
      nm = metrics.newMonthlyPayment;
      ts = metrics.totalSavings;
      be = metrics.breakEvenMonths;
    }

    const now = new Date().toISOString();
    const scenario = {
      id: this._generateId('refinancescenario'),
      currentLoanBalance,
      currentInterestRatePercent,
      newInterestRatePercent,
      remainingTermMonths,
      estimatedClosingCosts,
      newMonthlyPayment: nm,
      totalSavings: ts,
      breakEvenMonths: be,
      createdAt: now
    };

    const scenarios = this._getFromStorage('refinance_scenarios');
    scenarios.push(scenario);
    this._saveToStorage('refinance_scenarios', scenarios);

    return { scenario };
  }

  // getSavedRefinanceScenarios()
  getSavedRefinanceScenarios() {
    const scenarios = this._getFromStorage('refinance_scenarios');
    return this._sortByDateDesc(scenarios, 'createdAt');
  }

  // getRecommendedArticlesForTool(toolType)
  getRecommendedArticlesForTool(toolType) {
    const links = this._getFromStorage('recommended_articles').filter(
      (r) => r.toolType === toolType
    );
    let articles = this._getFromStorage('articles');
    let changed = false;

    const result = links
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((l) => {
        let article = articles.find((a) => a.id === l.articleId);
        if (!article) {
          article = {
            id: l.articleId,
            title: '',
            summary: '',
            content: '',
            authorName: '',
            publishedAt: new Date().toISOString(),
            averageRating: 0,
            ratingCount: 0,
            topics: []
          };
          articles.push(article);
          changed = true;
        }
        return {
          order: l.order,
          article
        };
      });

    if (changed) {
      this._saveToStorage('articles', articles);
    }

    return result;
  }

  // -------------------- Newsletter Subscription --------------------

  // getNewsletterSubscription()
  getNewsletterSubscription() {
    const subscription = this._getOrCreateNewsletterSubscription();
    return { subscription };
  }

  // saveNewsletterSubscription(email, frequency, topics)
  saveNewsletterSubscription(email, frequency, topics) {
    const subs = this._getFromStorage('newsletter_subscriptions');
    let subscription;
    if (subs.length > 0) {
      subscription = subs[0];
      subscription.email = email;
      subscription.frequency = frequency;
      subscription.topics = Array.isArray(topics) ? topics : [];
      subscription.updatedAt = new Date().toISOString();
      subs[0] = subscription;
    } else {
      const now = new Date().toISOString();
      subscription = {
        id: this._generateId('newsletter'),
        email,
        frequency,
        topics: Array.isArray(topics) ? topics : [],
        createdAt: now,
        updatedAt: now
      };
      subs.push(subscription);
    }
    this._saveToStorage('newsletter_subscriptions', subs);
    return { subscription };
  }

  // -------------------- Placeholder for original sample interface --------------------
  // Not used in this domain but kept to match provided structure
  addToCart(userId, productId, quantity) {
    // No-op implementation for compatibility
    return { success: true, cartId: 'cart_id' };
  }

  _findOrCreateCart(userId) {
    // No-op placeholder
    return null;
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
