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
    this._getNextIdCounter(); // ensure counter initialized
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const keysToInitAsArray = [
      "deals",
      "watchlist_items",
      "portfolios",
      "portfolio_items",
      "investment_orders",
      "calculator_scenarios",
      "investor_profiles",
      "events",
      "event_registrations",
      "consultation_requests",
      "articles",
      "reading_list_collections",
      "reading_list_items",
      "faq_entries"
      // "legal_content" is treated as an object map, not initialized here
    ];

    keysToInitAsArray.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem("legal_content")) {
      // store as object map: { sectionKey: { title, content, last_updated } }
      localStorage.setItem("legal_content", JSON.stringify({}));
    }

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) {
      return Array.isArray(defaultValue) ? [] : defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return Array.isArray(defaultValue) ? [] : defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  // ----------------------
  // Small utility helpers
  // ----------------------

  _humanizeEnum(value) {
    if (!value || typeof value !== "string") return "";
    return value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  _getPropertyTypeLabel(property_type) {
    return this._humanizeEnum(property_type);
  }

  _getLocationDisplay(dealOrEvent) {
    if (!dealOrEvent) return "";
    const city = dealOrEvent.city;
    const state = dealOrEvent.state;
    const country = dealOrEvent.country;
    if (city && state) return city + ", " + state;
    if (city && country) return city + ", " + country;
    if (state && country) return state + ", " + country;
    return city || state || country || "";
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // ----------------------
  // Helper functions (from spec)
  // ----------------------

  _getOrCreateDefaultPortfolio() {
    let portfolios = this._getFromStorage("portfolios", []);
    if (portfolios.length > 0) {
      return portfolios[0];
    }
    const now = new Date().toISOString();
    const portfolio = {
      id: this._generateId("portfolio"),
      name: "Sample Portfolio",
      description: "",
      created_at: now,
      updated_at: now
    };
    portfolios.push(portfolio);
    this._saveToStorage("portfolios", portfolios);
    return portfolio;
  }

  _recalculatePortfolioDiversification(portfolioId) {
    const portfolios = this._getFromStorage("portfolios", []);
    const portfolio = portfolios.find((p) => p.id === portfolioId) || null;
    const portfolio_items = this._getFromStorage("portfolio_items", []);
    const deals = this._getFromStorage("deals", []);

    const itemsForPortfolio = portfolio_items.filter(
      (item) => item.portfolioId === portfolioId
    );

    let total_allocation_amount = 0;
    const byPropertyType = {};
    const byState = {};

    itemsForPortfolio.forEach((item) => {
      const deal = deals.find((d) => d.id === item.dealId);
      if (!deal) return;
      const amount = Number(item.allocation_amount) || 0;
      total_allocation_amount += amount;

      const pt = deal.property_type || "other";
      if (!byPropertyType[pt]) {
        byPropertyType[pt] = {
          property_type: pt,
          property_type_label: this._getPropertyTypeLabel(pt),
          allocation_amount: 0
        };
      }
      byPropertyType[pt].allocation_amount += amount;

      const state = deal.state || "Unknown";
      if (!byState[state]) {
        byState[state] = {
          state: state,
          state_label: state,
          allocation_amount: 0
        };
      }
      byState[state].allocation_amount += amount;
    });

    const diversification_by_property_type = Object.values(byPropertyType).map(
      (entry) => ({
        property_type: entry.property_type,
        property_type_label: entry.property_type_label,
        allocation_amount: entry.allocation_amount,
        allocation_percent:
          total_allocation_amount > 0
            ? (entry.allocation_amount / total_allocation_amount) * 100
            : 0
      })
    );

    const diversification_by_state = Object.values(byState).map((entry) => ({
      state: entry.state,
      state_label: entry.state_label,
      allocation_amount: entry.allocation_amount,
      allocation_percent:
        total_allocation_amount > 0
          ? (entry.allocation_amount / total_allocation_amount) * 100
          : 0
    }));

    return {
      portfolio,
      total_allocation_amount,
      diversification_by_property_type,
      diversification_by_state
    };
  }

  _getOrCreateInvestorProfile() {
    let profiles = this._getFromStorage("investor_profiles", []);
    if (profiles.length > 0) {
      return profiles[0];
    }
    const now = new Date().toISOString();
    const profile = {
      id: this._generateId("investor_profile"),
      full_name: "",
      email: "",
      password: "",
      risk_tolerance: null,
      investment_horizon_min_years: null,
      investment_horizon_max_years: null,
      communication_channel: null,
      deal_update_frequency: null,
      created_at: now,
      updated_at: now
    };
    profiles.push(profile);
    this._saveToStorage("investor_profiles", profiles);
    return profile;
  }

  _getOrCreateWatchlist() {
    // In this design, watchlist is just the watchlist_items array
    const items = this._getFromStorage("watchlist_items", []);
    if (!Array.isArray(items)) {
      this._saveToStorage("watchlist_items", []);
      return [];
    }
    return items;
  }

  _getOrCreateReadingCollections() {
    let collections = this._getFromStorage("reading_list_collections", []);
    if (!Array.isArray(collections)) {
      collections = [];
    }
    if (collections.length === 0) {
      const now = new Date().toISOString();
      const defaultCollection = {
        id: this._generateId("reading_collection"),
        name: "Default",
        description: "Default reading list",
        created_at: now
      };
      collections.push(defaultCollection);
      this._saveToStorage("reading_list_collections", collections);
    }
    return collections;
  }

  _getOrCreateReadingListCollectionByName(name) {
    if (!name) return null;
    let collections = this._getOrCreateReadingCollections();
    let collection = collections.find(
      (c) => c.name.toLowerCase() === String(name).toLowerCase()
    );
    if (collection) return collection;
    const now = new Date().toISOString();
    collection = {
      id: this._generateId("reading_collection"),
      name: name,
      description: "",
      created_at: now
    };
    collections.push(collection);
    this._saveToStorage("reading_list_collections", collections);
    return collection;
  }

  _getOrCreateInvestmentOrder(dealId) {
    let orders = this._getFromStorage("investment_orders", []);
    let order = orders.find(
      (o) => o.dealId === dealId && (o.status === "draft" || o.status === "review")
    );
    if (order) return order;
    const now = new Date().toISOString();
    order = {
      id: this._generateId("investment_order"),
      dealId: dealId,
      investment_amount: 0,
      status: "draft",
      created_at: now,
      updated_at: now,
      projected_irr_5yr_percent_snapshot: null,
      projected_cash_yield_percent_snapshot: null
    };
    orders.push(order);
    this._saveToStorage("investment_orders", orders);
    return order;
  }

  _calculateReturnProjectionInternal(
    investment_amount,
    holding_period_years,
    leverage_percent
  ) {
    const amount = Number(investment_amount) || 0;
    const years = Number(holding_period_years) || 0;
    const lev = Number(leverage_percent) || 0;

    const leverageFraction = lev / 100;
    const baseReturn = 0.05; // 5%
    const leverageFactor = 0.06; // +6% * leverage fraction
    const annualRate = baseReturn + leverageFraction * leverageFactor; // e.g., 70% -> 0.05 + 0.7*0.06 = 0.092

    const projected_annualized_return_percent = annualRate * 100;

    const projected_cash_flows = [];
    let cumulative_value = amount;
    for (let year = 1; year <= years; year++) {
      const cash_flow = amount * annualRate;
      cumulative_value = amount * Math.pow(1 + annualRate, year);
      projected_cash_flows.push({
        year,
        cash_flow,
        cumulative_value
      });
    }

    const assumptions_summary =
      "Projection assumes a base annual return of " +
      (baseReturn * 100).toFixed(2) +
      "% plus a leverage-driven increment, with constant annual compounding.";

    return {
      investment_amount: amount,
      holding_period_years: years,
      leverage_percent: lev,
      projected_annualized_return_percent,
      projected_cash_flows,
      assumptions_summary
    };
  }

  _validateConsultationPreferredDatetimeWithinNext7Days(preferred_datetime) {
    if (!preferred_datetime) return true;
    const dt = new Date(preferred_datetime);
    if (isNaN(dt.getTime())) return false;

    const now = new Date();
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (dt < now || dt > inSevenDays) return false;

    const hour = dt.getHours();
    // Accept start time between 10:00 (inclusive) and 12:00 (exclusive)
    if (hour < 10 || hour >= 12) return false;

    return true;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // 1. getHomePageSummary
  getHomePageSummary() {
    const deals = this._getFromStorage("deals", []);
    const events = this._getFromStorage("events", []);

    const featured_deals = deals
      .filter((d) => d.status === "live" && d.is_featured)
      .map((deal) => ({
        deal,
        highlight_reason: "Featured live offering",
        location_display: this._getLocationDisplay(deal),
        property_type_label: this._getPropertyTypeLabel(deal.property_type)
      }));

    const now = new Date();
    const upcoming_multifamily_webinars = events
      .filter(
        (e) =>
          e.event_type === "webinar" &&
          e.status === "upcoming" &&
          e.topic === "multifamily" &&
          this._parseDate(e.start_datetime) &&
          this._parseDate(e.start_datetime) > now
      )
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime);
        const db = this._parseDate(b.start_datetime);
        return da - db;
      });

    const investorProfileResult = this.getInvestorProfile();
    const has_profile = investorProfileResult.has_profile;
    const profile = investorProfileResult.profile;

    let investment_horizon_display = "";
    if (profile && profile.investment_horizon_min_years && profile.investment_horizon_max_years) {
      investment_horizon_display =
        profile.investment_horizon_min_years +
        "-" +
        profile.investment_horizon_max_years +
        " years";
    }

    const investor_profile_summary = {
      has_profile: has_profile,
      full_name: profile ? profile.full_name : "",
      risk_tolerance: profile ? profile.risk_tolerance : null,
      investment_horizon_display,
      communication_channel: profile ? profile.communication_channel : null,
      deal_update_frequency: profile ? profile.deal_update_frequency : null
    };

    return {
      featured_deals,
      upcoming_multifamily_webinars,
      investor_profile_summary
    };
  }

  // 2. getLiveOfferingsFilterOptions
  getLiveOfferingsFilterOptions() {
    const deals = this._getFromStorage("deals", []);

    const propertyTypesSet = new Set();
    const countriesSet = new Set();
    const statesSet = new Set();
    const citiesMap = new Map(); // key: city|state|country

    let minYield = null;
    let maxYield = null;
    let minMinInvestment = null;
    let maxMinInvestment = null;
    let minPurchasePrice = null;
    let maxPurchasePrice = null;

    deals.forEach((d) => {
      if (d.property_type) propertyTypesSet.add(d.property_type);
      if (d.country) countriesSet.add(d.country);
      if (d.state) statesSet.add(d.state);
      if (d.city) {
        const key = [d.city, d.state || "", d.country || ""].join("|");
        if (!citiesMap.has(key)) {
          citiesMap.set(key, {
            city: d.city,
            state_code: d.state || "",
            country_code: d.country || ""
          });
        }
      }

      if (typeof d.projected_cash_yield_percent === "number") {
        if (minYield === null || d.projected_cash_yield_percent < minYield) {
          minYield = d.projected_cash_yield_percent;
        }
        if (maxYield === null || d.projected_cash_yield_percent > maxYield) {
          maxYield = d.projected_cash_yield_percent;
        }
      }

      if (typeof d.minimum_investment_amount === "number") {
        if (minMinInvestment === null || d.minimum_investment_amount < minMinInvestment) {
          minMinInvestment = d.minimum_investment_amount;
        }
        if (maxMinInvestment === null || d.minimum_investment_amount > maxMinInvestment) {
          maxMinInvestment = d.minimum_investment_amount;
        }
      }

      if (typeof d.purchase_price === "number") {
        if (minPurchasePrice === null || d.purchase_price < minPurchasePrice) {
          minPurchasePrice = d.purchase_price;
        }
        if (maxPurchasePrice === null || d.purchase_price > maxPurchasePrice) {
          maxPurchasePrice = d.purchase_price;
        }
      }
    });

    const property_type_options = Array.from(propertyTypesSet).map((value) => ({
      value,
      label: this._getPropertyTypeLabel(value)
    }));

    const location_options = {
      countries: Array.from(countriesSet).map((code) => ({ code, name: code })),
      states: Array.from(statesSet).map((code) => ({ code, name: code })),
      cities: Array.from(citiesMap.values())
    };

    const projected_cash_yield_range = {
      min_percent: minYield,
      max_percent: maxYield
    };

    const minimum_investment_range = {
      min_amount: minMinInvestment,
      max_amount: maxMinInvestment
    };

    const purchase_price_range = {
      min_amount: minPurchasePrice,
      max_amount: maxPurchasePrice
    };

    const sort_options = [
      {
        value: "minimum_investment",
        label: "Minimum Investment",
        default_direction: "asc"
      },
      {
        value: "projected_irr_5yr",
        label: "Projected 5-Year IRR",
        default_direction: "desc"
      },
      {
        value: "projected_cash_yield",
        label: "Projected Cash Yield",
        default_direction: "desc"
      },
      {
        value: "purchase_price",
        label: "Purchase Price",
        default_direction: "asc"
      }
    ];

    return {
      property_type_options,
      location_options,
      projected_cash_yield_range,
      minimum_investment_range,
      purchase_price_range,
      sort_options
    };
  }

  // 3. getLiveOfferings
  getLiveOfferings(filters, sort_by, sort_direction = "asc", page = 1, page_size = 20) {
    const rawDeals = this._getFromStorage("deals", []);
    const deals = rawDeals.filter((d) => d.status === "live");
    const f = filters || {};

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        "task1_filterParams",
        JSON.stringify({ filters: f, sort_by, sort_direction, page })
      );
      localStorage.setItem(
        "task2_filterParams",
        JSON.stringify({ filters: f, sort_by, sort_direction, page })
      );
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    let filtered = deals.filter((d) => {
      if (f.property_type && d.property_type !== f.property_type) return false;
      if (f.city && d.city !== f.city) return false;
      if (f.state && d.state !== f.state) return false;
      if (f.country && d.country !== f.country) return false;

      if (
        typeof f.min_projected_cash_yield_percent === "number" &&
        (typeof d.projected_cash_yield_percent !== "number" ||
          d.projected_cash_yield_percent < f.min_projected_cash_yield_percent)
      ) {
        return false;
      }

      if (
        typeof f.max_projected_cash_yield_percent === "number" &&
        (typeof d.projected_cash_yield_percent !== "number" ||
          d.projected_cash_yield_percent > f.max_projected_cash_yield_percent)
      ) {
        return false;
      }

      if (
        typeof f.min_minimum_investment_amount === "number" &&
        (typeof d.minimum_investment_amount !== "number" ||
          d.minimum_investment_amount < f.min_minimum_investment_amount)
      ) {
        return false;
      }

      if (
        typeof f.max_minimum_investment_amount === "number" &&
        (typeof d.minimum_investment_amount !== "number" ||
          d.minimum_investment_amount > f.max_minimum_investment_amount)
      ) {
        return false;
      }

      if (
        typeof f.min_purchase_price === "number" &&
        (typeof d.purchase_price !== "number" || d.purchase_price < f.min_purchase_price)
      ) {
        return false;
      }

      if (
        typeof f.max_purchase_price === "number" &&
        (typeof d.purchase_price !== "number" ||
          d.purchase_price > f.max_purchase_price)
      ) {
        return false;
      }

      return true;
    });

    if (sort_by) {
      const dir = sort_direction === "desc" ? -1 : 1;
      filtered.sort((a, b) => {
        let va;
        let vb;
        if (sort_by === "minimum_investment") {
          va = typeof a.minimum_investment_amount === "number" ? a.minimum_investment_amount : Infinity;
          vb = typeof b.minimum_investment_amount === "number" ? b.minimum_investment_amount : Infinity;
        } else if (sort_by === "projected_irr_5yr") {
          va = typeof a.projected_irr_5yr_percent === "number" ? a.projected_irr_5yr_percent : -Infinity;
          vb = typeof b.projected_irr_5yr_percent === "number" ? b.projected_irr_5yr_percent : -Infinity;
        } else if (sort_by === "projected_cash_yield") {
          va = typeof a.projected_cash_yield_percent === "number" ? a.projected_cash_yield_percent : -Infinity;
          vb = typeof b.projected_cash_yield_percent === "number" ? b.projected_cash_yield_percent : -Infinity;
        } else if (sort_by === "purchase_price") {
          va = typeof a.purchase_price === "number" ? a.purchase_price : Infinity;
          vb = typeof b.purchase_price === "number" ? b.purchase_price : Infinity;
        } else {
          va = 0;
          vb = 0;
        }
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      });
    }

    const total_count = filtered.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const pageDeals = filtered.slice(startIndex, endIndex);

    const resultDeals = pageDeals.map((deal) => ({
      deal,
      location_display: this._getLocationDisplay(deal),
      property_type_label: this._getPropertyTypeLabel(deal.property_type),
      key_metrics: {
        projected_cash_yield_percent: deal.projected_cash_yield_percent,
        projected_irr_5yr_percent: deal.projected_irr_5yr_percent,
        minimum_investment_amount: deal.minimum_investment_amount,
        purchase_price: deal.purchase_price
      },
      is_featured: !!deal.is_featured
    }));

    return {
      deals: resultDeals,
      total_count,
      page,
      page_size,
      sort_by: sort_by || null,
      sort_direction,
      applied_filters: {
        property_type: f.property_type || null,
        city: f.city || null,
        state: f.state || null,
        country: f.country || null,
        min_projected_cash_yield_percent: f.min_projected_cash_yield_percent,
        max_projected_cash_yield_percent: f.max_projected_cash_yield_percent,
        min_minimum_investment_amount: f.min_minimum_investment_amount,
        max_minimum_investment_amount: f.max_minimum_investment_amount,
        min_purchase_price: f.min_purchase_price,
        max_purchase_price: f.max_purchase_price
      }
    };
  }

  // 4. getDealDetail
  getDealDetail(dealId, slug) {
    const deals = this._getFromStorage("deals", []);
    let deal = null;
    if (dealId) {
      deal = deals.find((d) => d.id === dealId) || null;
    } else if (slug) {
      deal = deals.find((d) => d.slug === slug) || null;
    }

    if (!deal) {
      return {
        deal: null,
        location_display: "",
        property_type_label: "",
        offering_status_label: "",
        projected_returns: {
          projected_cash_yield_percent: null,
          projected_irr_5yr_percent: null
        },
        realized_performance: {
          realized_irr_percent: null,
          realized_equity_multiple: null,
          realized_hold_period_years: null
        },
        can_invest: false,
        in_watchlist: false,
        in_portfolio: false,
        portfolio_allocation_amount: 0,
        minimum_investment_amount: null
      };
    }

    const location_display = this._getLocationDisplay(deal);
    const property_type_label = this._getPropertyTypeLabel(deal.property_type);
    let offering_status_label = "";
    if (deal.status === "live") offering_status_label = "Live Offering";
    else if (deal.status === "closed") offering_status_label = "Closed";
    else if (deal.status === "coming_soon") offering_status_label = "Coming Soon";

    const watchlist_items = this._getOrCreateWatchlist();
    const in_watchlist = !!watchlist_items.find((w) => w.dealId === deal.id);

    const portfolio = this._getOrCreateDefaultPortfolio();
    const portfolio_items = this._getFromStorage("portfolio_items", []);
    const itemsForDeal = portfolio_items.filter(
      (item) => item.portfolioId === portfolio.id && item.dealId === deal.id
    );
    const portfolio_allocation_amount = itemsForDeal.reduce(
      (sum, item) => sum + (Number(item.allocation_amount) || 0),
      0
    );
    const in_portfolio = portfolio_allocation_amount > 0;

    // Instrumentation for task completion tracking
    try {
      // Task 2: track compared office deals under $40M
      if (
        deal &&
        deal.status === "live" &&
        deal.property_type === "office" &&
        typeof deal.purchase_price === "number" &&
        deal.purchase_price <= 40000000
      ) {
        let comparedRaw = localStorage.getItem("task2_comparedDealIds");
        let comparedIds = [];
        if (comparedRaw) {
          try {
            const parsed = JSON.parse(comparedRaw);
            if (Array.isArray(parsed)) {
              comparedIds = parsed;
            }
          } catch (e2) {}
        }
        if (!comparedIds.includes(deal.id)) {
          comparedIds.push(deal.id);
          localStorage.setItem(
            "task2_comparedDealIds",
            JSON.stringify(comparedIds)
          );
        }
      }

      // Task 8: detect top historical deal opened
      if (deal && deal.status === "closed") {
        const allDeals = this._getFromStorage("deals", []);
        const now = new Date();
        const twoYearsAgo = new Date(
          now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000
        );
        const qualifying = allDeals.filter((d) => {
          if (d.status !== "closed") return false;
          if (
            typeof d.realized_irr_percent !== "number" ||
            d.realized_irr_percent < 12
          ) {
            return false;
          }
          const closing = this._parseDate(d.closing_date);
          if (!closing) return false;
          return closing >= twoYearsAgo && closing <= now;
        });

        if (qualifying.length > 0) {
          qualifying.sort((a, b) => {
            const ia =
              typeof a.realized_irr_percent === "number"
                ? a.realized_irr_percent
                : -Infinity;
            const ib =
              typeof b.realized_irr_percent === "number"
                ? b.realized_irr_percent
                : -Infinity;
            if (ia < ib) return 1;
            if (ia > ib) return -1;
            return 0;
          });
          const topDeal = qualifying[0];
          if (topDeal && topDeal.id === deal.id) {
            localStorage.setItem("task8_topDealId", deal.id);
            localStorage.setItem("task8_topDealOpened", "true");
          }
        }
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      deal,
      location_display,
      property_type_label,
      offering_status_label,
      projected_returns: {
        projected_cash_yield_percent: deal.projected_cash_yield_percent,
        projected_irr_5yr_percent: deal.projected_irr_5yr_percent
      },
      realized_performance: {
        realized_irr_percent: deal.realized_irr_percent,
        realized_equity_multiple: deal.realized_equity_multiple,
        realized_hold_period_years: deal.realized_hold_period_years
      },
      can_invest: deal.status === "live",
      in_watchlist,
      in_portfolio,
      portfolio_allocation_amount,
      minimum_investment_amount: deal.minimum_investment_amount
    };
  }

  // 5. addDealToWatchlist
  addDealToWatchlist(dealId, source) {
    if (!dealId) {
      return { success: false, watchlist_item: null, message: "dealId is required" };
    }

    const deals = this._getFromStorage("deals", []);
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) {
      return { success: false, watchlist_item: null, message: "Deal not found" };
    }

    let watchlist_items = this._getOrCreateWatchlist();
    let existing = watchlist_items.find((w) => w.dealId === dealId);
    if (existing) {
      return {
        success: true,
        watchlist_item: existing,
        message: "Deal is already in watchlist"
      };
    }

    const now = new Date().toISOString();
    const item = {
      id: this._generateId("watchlist_item"),
      dealId,
      source: source || "deal_detail",
      added_at: now
    };
    watchlist_items.push(item);
    this._saveToStorage("watchlist_items", watchlist_items);

    // Instrumentation for task completion tracking
    try {
      const qualifyingDeals = deals.filter((d) => {
        if (d.status !== "live") return false;
        if (d.property_type !== "multifamily") return false;
        if (d.city !== "Austin" && d.state !== "TX") return false;
        if (
          typeof d.projected_cash_yield_percent !== "number" ||
          d.projected_cash_yield_percent < 5
        ) {
          return false;
        }
        if (
          typeof d.minimum_investment_amount !== "number" ||
          d.minimum_investment_amount > 25000
        ) {
          return false;
        }
        return true;
      });

      let lowestDeal = null;
      qualifyingDeals.forEach((d) => {
        if (
          !lowestDeal ||
          d.minimum_investment_amount < lowestDeal.minimum_investment_amount
        ) {
          lowestDeal = d;
        }
      });

      if (lowestDeal && lowestDeal.id === dealId) {
        localStorage.setItem("task1_selectedDealId", dealId);
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      success: true,
      watchlist_item: item,
      message: "Deal added to watchlist"
    };
  }

  // 6. removeDealFromWatchlist
  removeDealFromWatchlist(watchlistItemId, dealId) {
    let watchlist_items = this._getFromStorage("watchlist_items", []);
    const beforeCount = watchlist_items.length;

    if (watchlistItemId) {
      watchlist_items = watchlist_items.filter((w) => w.id !== watchlistItemId);
    } else if (dealId) {
      watchlist_items = watchlist_items.filter((w) => w.dealId !== dealId);
    } else {
      return { success: false, message: "Either watchlistItemId or dealId is required" };
    }

    const afterCount = watchlist_items.length;
    this._saveToStorage("watchlist_items", watchlist_items);

    const removed = beforeCount > afterCount;
    return {
      success: removed,
      message: removed ? "Removed from watchlist" : "Item not found in watchlist"
    };
  }

  // 7. getWatchlist
  getWatchlist() {
    const watchlist_items = this._getFromStorage("watchlist_items", []);
    const deals = this._getFromStorage("deals", []);

    const items = watchlist_items.map((watchlist_item) => {
      const deal = deals.find((d) => d.id === watchlist_item.dealId) || null;
      // Foreign key resolution inside the item
      const resolved_watchlist_item = {
        ...watchlist_item,
        deal
      };
      return {
        watchlist_item: resolved_watchlist_item,
        deal,
        location_display: deal ? this._getLocationDisplay(deal) : "",
        property_type_label: deal ? this._getPropertyTypeLabel(deal.property_type) : "",
        key_metrics: {
          projected_cash_yield_percent: deal ? deal.projected_cash_yield_percent : null,
          projected_irr_5yr_percent: deal ? deal.projected_irr_5yr_percent : null,
          realized_irr_percent: deal ? deal.realized_irr_percent : null
        }
      };
    });

    return { items };
  }

  // 8. addDealToPortfolio
  addDealToPortfolio(dealId, allocation_amount) {
    if (!dealId) {
      return { success: false, portfolio_item: null, portfolio_summary: null };
    }

    const deals = this._getFromStorage("deals", []);
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) {
      return {
        success: false,
        portfolio_item: null,
        portfolio_summary: null,
        message: "Deal not found"
      };
    }

    const portfolio = this._getOrCreateDefaultPortfolio();
    let portfolio_items = this._getFromStorage("portfolio_items", []);
    const now = new Date().toISOString();
    const amount = Number(allocation_amount) || 0;

    let portfolio_item = portfolio_items.find(
      (item) => item.portfolioId === portfolio.id && item.dealId === dealId
    );

    if (portfolio_item) {
      portfolio_item.allocation_amount = amount;
      // keep existing added_at
    } else {
      portfolio_item = {
        id: this._generateId("portfolio_item"),
        portfolioId: portfolio.id,
        dealId,
        allocation_amount: amount,
        added_at: now
      };
      portfolio_items.push(portfolio_item);
    }

    this._saveToStorage("portfolio_items", portfolio_items);
    const portfolio_summary = this._recalculatePortfolioDiversification(portfolio.id);

    return {
      success: true,
      portfolio_item,
      portfolio_summary
    };
  }

  // 9. updatePortfolioItemAllocation
  updatePortfolioItemAllocation(portfolioItemId, allocation_amount) {
    let portfolio_items = this._getFromStorage("portfolio_items", []);
    const item = portfolio_items.find((pi) => pi.id === portfolioItemId);
    if (!item) {
      return {
        success: false,
        portfolio_item: null,
        portfolio_summary: null,
        message: "Portfolio item not found"
      };
    }

    item.allocation_amount = Number(allocation_amount) || 0;
    this._saveToStorage("portfolio_items", portfolio_items);

    const portfolio_summary = this._recalculatePortfolioDiversification(
      item.portfolioId
    );

    return {
      success: true,
      portfolio_item: item,
      portfolio_summary
    };
  }

  // 10. removePortfolioItem
  removePortfolioItem(portfolioItemId) {
    let portfolio_items = this._getFromStorage("portfolio_items", []);
    const item = portfolio_items.find((pi) => pi.id === portfolioItemId);
    if (!item) {
      return {
        success: false,
        portfolio_summary: null,
        message: "Portfolio item not found"
      };
    }

    portfolio_items = portfolio_items.filter((pi) => pi.id !== portfolioItemId);
    this._saveToStorage("portfolio_items", portfolio_items);

    const portfolio_summary = this._recalculatePortfolioDiversification(
      item.portfolioId
    );

    return {
      success: true,
      portfolio_summary
    };
  }

  // 11. getPortfolioOverview
  getPortfolioOverview() {
    const portfolio = this._getOrCreateDefaultPortfolio();
    const portfolio_items = this._getFromStorage("portfolio_items", []);
    const deals = this._getFromStorage("deals", []);

    const itemsForPortfolio = portfolio_items.filter(
      (item) => item.portfolioId === portfolio.id
    );

    const items = itemsForPortfolio.map((portfolio_item) => {
      const deal = deals.find((d) => d.id === portfolio_item.dealId) || null;
      const resolved_portfolio_item = {
        ...portfolio_item,
        deal
      }; // foreign key resolution
      return {
        portfolio_item: resolved_portfolio_item,
        deal,
        location_display: deal ? this._getLocationDisplay(deal) : "",
        property_type_label: deal ? this._getPropertyTypeLabel(deal.property_type) : ""
      };
    });

    const summary = this._recalculatePortfolioDiversification(portfolio.id);

    return {
      portfolio: summary.portfolio,
      items,
      total_allocation_amount: summary.total_allocation_amount,
      diversification_by_property_type: summary.diversification_by_property_type,
      diversification_by_state: summary.diversification_by_state
    };
  }

  // 12. startInvestmentOrder
  startInvestmentOrder(dealId, investment_amount) {
    if (!dealId) {
      return {
        success: false,
        investment_order: null,
        deal_summary: null,
        review: null,
        message: "dealId is required"
      };
    }

    const deals = this._getFromStorage("deals", []);
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) {
      return {
        success: false,
        investment_order: null,
        deal_summary: null,
        review: null,
        message: "Deal not found"
      };
    }

    const amount = Number(investment_amount) || 0;
    let order = this._getOrCreateInvestmentOrder(dealId);
    let orders = this._getFromStorage("investment_orders", []);

    order.investment_amount = amount;
    order.status = "review";
    order.updated_at = new Date().toISOString();
    order.projected_irr_5yr_percent_snapshot = deal.projected_irr_5yr_percent || null;
    order.projected_cash_yield_percent_snapshot =
      deal.projected_cash_yield_percent || null;

    // ensure persisted order is updated
    orders = orders.map((o) => (o.id === order.id ? order : o));
    this._saveToStorage("investment_orders", orders);

    const deal_summary = {
      deal,
      location_display: this._getLocationDisplay(deal),
      property_type_label: this._getPropertyTypeLabel(deal.property_type)
    };

    // Foreign key resolution inside order
    const orderWithDeal = { ...order, deal };

    const review = {
      investment_amount: amount,
      minimum_investment_amount: deal.minimum_investment_amount,
      projected_cash_yield_percent:
        order.projected_cash_yield_percent_snapshot ||
        deal.projected_cash_yield_percent ||
        null,
      projected_irr_5yr_percent:
        order.projected_irr_5yr_percent_snapshot || deal.projected_irr_5yr_percent || null
    };

    // Instrumentation for task completion tracking
    try {
      if (
        amount === 25000 &&
        deal &&
        deal.property_type === "office" &&
        typeof deal.purchase_price === "number" &&
        deal.purchase_price <= 40000000
      ) {
        let comparedIds = [];
        const raw = localStorage.getItem("task2_comparedDealIds");
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              comparedIds = parsed;
            }
          } catch (e2) {}
        }

        if (comparedIds.includes(deal.id)) {
          const allDeals = this._getFromStorage("deals", []);
          const comparedDeals = allDeals.filter(
            (d) =>
              comparedIds.includes(d.id) &&
              d.property_type === "office" &&
              typeof d.purchase_price === "number" &&
              d.purchase_price <= 40000000
          );

          const citySet = new Set(
            comparedDeals
              .map((d) => d.city)
              .filter((c) => c !== undefined && c !== null)
          );

          if (comparedDeals.length > 0 && citySet.size >= 2) {
            let bestDeal = null;
            let bestIrr = -Infinity;
            comparedDeals.forEach((d) => {
              const irr =
                typeof d.projected_irr_5yr_percent === "number"
                  ? d.projected_irr_5yr_percent
                  : -Infinity;
              if (irr > bestIrr) {
                bestIrr = irr;
                bestDeal = d;
              }
            });

            if (bestDeal && bestDeal.id === deal.id) {
              localStorage.setItem("task2_selectedDealId", deal.id);
              localStorage.setItem("task2_investmentOrderId", order.id);
            }
          }
        }
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      success: true,
      investment_order: orderWithDeal,
      deal_summary,
      review,
      message: "Investment order moved to review stage"
    };
  }

  // 13. getInvestmentOrderReview
  getInvestmentOrderReview(orderId) {
    const orders = this._getFromStorage("investment_orders", []);
    const deals = this._getFromStorage("deals", []);
    const order = orders.find((o) => o.id === orderId) || null;

    if (!order) {
      return {
        investment_order: null,
        deal_summary: null,
        review: null
      };
    }

    const deal = deals.find((d) => d.id === order.dealId) || null;
    const deal_summary = deal
      ? {
          deal,
          location_display: this._getLocationDisplay(deal),
          property_type_label: this._getPropertyTypeLabel(deal.property_type)
        }
      : null;

    const investment_order = { ...order, deal };

    const review = {
      investment_amount: order.investment_amount,
      minimum_investment_amount: deal ? deal.minimum_investment_amount : null,
      projected_cash_yield_percent:
        order.projected_cash_yield_percent_snapshot ||
        (deal ? deal.projected_cash_yield_percent : null),
      projected_irr_5yr_percent:
        order.projected_irr_5yr_percent_snapshot ||
        (deal ? deal.projected_irr_5yr_percent : null)
    };

    return {
      investment_order,
      deal_summary,
      review
    };
  }

  // 14. cancelInvestmentOrder
  cancelInvestmentOrder(orderId) {
    let orders = this._getFromStorage("investment_orders", []);
    const deals = this._getFromStorage("deals", []);
    const order = orders.find((o) => o.id === orderId) || null;
    if (!order) {
      return {
        success: false,
        investment_order: null,
        message: "Investment order not found"
      };
    }

    order.status = "cancelled";
    order.updated_at = new Date().toISOString();
    orders = orders.map((o) => (o.id === order.id ? order : o));
    this._saveToStorage("investment_orders", orders);

    const deal = deals.find((d) => d.id === order.dealId) || null;
    const investment_order = { ...order, deal };

    return {
      success: true,
      investment_order,
      message: "Investment order cancelled"
    };
  }

  // 15. calculateReturnProjection
  calculateReturnProjection(investment_amount, holding_period_years, leverage_percent) {
    const result = this._calculateReturnProjectionInternal(
      investment_amount,
      holding_period_years,
      leverage_percent
    );

    // Instrumentation for task completion tracking
    try {
      const amount = Number(investment_amount);
      const years = Number(holding_period_years);
      const leverage = Number(leverage_percent);
      if (
        amount === 50000 &&
        years === 10 &&
        (leverage === 50 || leverage === 70)
      ) {
        let existing = [];
        const raw = localStorage.getItem("task3_testedLeverages");
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              existing = parsed;
            }
          } catch (e2) {}
        }
        if (!existing.includes(leverage)) {
          existing.push(leverage);
          localStorage.setItem(
            "task3_testedLeverages",
            JSON.stringify(existing)
          );
        }
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return result;
  }

  // 16. saveCalculatorScenario
  saveCalculatorScenario(
    name,
    investment_amount,
    holding_period_years,
    leverage_percent,
    projected_annualized_return_percent
  ) {
    if (!name) {
      return {
        success: false,
        scenario: null,
        message: "Scenario name is required"
      };
    }

    const scenarios = this._getFromStorage("calculator_scenarios", []);
    const now = new Date().toISOString();

    const scenario = {
      id: this._generateId("calculator_scenario"),
      name,
      investment_amount: Number(investment_amount) || 0,
      holding_period_years: Number(holding_period_years) || 0,
      leverage_percent: Number(leverage_percent) || 0,
      projected_annualized_return_percent:
        Number(projected_annualized_return_percent) || 0,
      created_at: now,
      last_calculated_at: now
    };

    scenarios.push(scenario);
    this._saveToStorage("calculator_scenarios", scenarios);

    // Instrumentation for task completion tracking
    try {
      const invAmount = Number(investment_amount) || 0;
      const years = Number(holding_period_years) || 0;
      const projected =
        Number(projected_annualized_return_percent) || 0;
      if (
        name === "50k_10yr_9pct+" &&
        invAmount === 50000 &&
        years === 10 &&
        projected >= 9
      ) {
        localStorage.setItem("task3_savedScenarioId", scenario.id);
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      success: true,
      scenario,
      message: "Scenario saved"
    };
  }

  // 17. getCalculatorScenarios
  getCalculatorScenarios() {
    const scenarios = this._getFromStorage("calculator_scenarios", []);
    // Optionally sort by created_at desc
    scenarios.sort((a, b) => {
      const da = this._parseDate(b.created_at) || 0;
      const db = this._parseDate(a.created_at) || 0;
      return da - db;
    });
    return scenarios;
  }

  // 18. saveInvestorProfile
  saveInvestorProfile(
    full_name,
    email,
    password,
    risk_tolerance,
    investment_horizon_min_years,
    investment_horizon_max_years,
    communication_channel,
    deal_update_frequency
  ) {
    let profiles = this._getFromStorage("investor_profiles", []);
    let profile = profiles.length > 0 ? profiles[0] : null;
    const now = new Date().toISOString();

    if (!profile) {
      profile = this._getOrCreateInvestorProfile();
      profiles = this._getFromStorage("investor_profiles", []);
    }

    if (typeof full_name === "string") profile.full_name = full_name;
    if (typeof email === "string") profile.email = email;
    if (typeof password === "string" && password !== "") profile.password = password;
    if (risk_tolerance !== undefined) profile.risk_tolerance = risk_tolerance;

    if (investment_horizon_min_years !== undefined) {
      profile.investment_horizon_min_years = Number(investment_horizon_min_years);
    }
    if (investment_horizon_max_years !== undefined) {
      profile.investment_horizon_max_years = Number(investment_horizon_max_years);
    }

    if (communication_channel !== undefined) {
      profile.communication_channel = communication_channel;
    }
    if (deal_update_frequency !== undefined) {
      profile.deal_update_frequency = deal_update_frequency;
    }

    profile.updated_at = now;

    profiles[0] = profile;
    this._saveToStorage("investor_profiles", profiles);

    return {
      success: true,
      profile,
      message: "Investor profile saved"
    };
  }

  // 19. getInvestorProfile
  getInvestorProfile() {
    const profiles = this._getFromStorage("investor_profiles", []);
    if (profiles.length === 0) {
      return { has_profile: false, profile: null };
    }
    return { has_profile: true, profile: profiles[0] };
  }

  // 20. getEventsFilterOptions
  getEventsFilterOptions() {
    const topic_values = [
      "multifamily",
      "office",
      "industrial",
      "1031_exchange",
      "tax_strategies",
      "general_education",
      "other"
    ];
    const event_type_values = ["webinar", "in_person", "virtual_event"];
    const status_values = ["upcoming", "past", "cancelled"];

    const topic_options = topic_values.map((value) => ({
      value,
      label: this._humanizeEnum(value)
    }));

    const event_type_options = event_type_values.map((value) => ({
      value,
      label: this._humanizeEnum(value)
    }));

    const status_options = status_values.map((value) => ({
      value,
      label: this._humanizeEnum(value)
    }));

    return {
      topic_options,
      event_type_options,
      status_options
    };
  }

  // 21. getEventsList
  getEventsList(
    filters,
    search_query,
    sort_by,
    sort_direction = "asc",
    page = 1,
    page_size = 20
  ) {
    const events = this._getFromStorage("events", []);
    const f = filters || {};
    const query = (search_query || "").toLowerCase();

    let filtered = events.filter((e) => {
      if (f.topic && e.topic !== f.topic) return false;
      if (f.event_type && e.event_type !== f.event_type) return false;
      if (f.status && e.status !== f.status) return false;

      const start = this._parseDate(e.start_datetime);
      if (f.start_from) {
        const from = this._parseDate(f.start_from);
        if (from && start && start < from) return false;
      }
      if (f.start_to) {
        const to = this._parseDate(f.start_to);
        if (to && start && start > to) return false;
      }

      if (query) {
        const title = (e.title || "").toLowerCase();
        const description = (e.description || "").toLowerCase();
        if (!title.includes(query) && !description.includes(query)) return false;
      }

      return true;
    });

    if (!sort_by) sort_by = "start_datetime";
    const dir = sort_direction === "desc" ? -1 : 1;

    filtered.sort((a, b) => {
      let va;
      let vb;
      if (sort_by === "start_datetime") {
        va = this._parseDate(a.start_datetime) || 0;
        vb = this._parseDate(b.start_datetime) || 0;
      } else if (sort_by === "title") {
        va = (a.title || "").toLowerCase();
        vb = (b.title || "").toLowerCase();
      } else {
        va = 0;
        vb = 0;
      }

      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    const total_count = filtered.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const pageEvents = filtered.slice(startIndex, endIndex);

    return {
      events: pageEvents,
      total_count,
      page,
      page_size
    };
  }

  // 22. getNextUpcomingWebinar
  getNextUpcomingWebinar(topic) {
    const events = this._getFromStorage("events", []);
    const now = new Date();

    const filtered = events
      .filter((e) => {
        if (e.event_type !== "webinar") return false;
        if (e.status !== "upcoming") return false;
        const start = this._parseDate(e.start_datetime);
        if (!start || start <= now) return false;
        if (topic && e.topic !== topic) return false;
        return true;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime);
        const db = this._parseDate(b.start_datetime);
        return da - db;
      });

    return {
      event: filtered.length > 0 ? filtered[0] : null
    };
  }

  // 23. getEventDetail
  getEventDetail(eventId) {
    const events = this._getFromStorage("events", []);
    const event = events.find((e) => e.id === eventId) || null;

    const registrationStatus = this.getEventRegistrationStatus(eventId);

    return {
      event,
      is_registered: registrationStatus.is_registered
    };
  }

  // 24. registerForEvent
  registerForEvent(
    eventId,
    registrant_name,
    registrant_email,
    investor_type,
    experience_level,
    consent_to_terms
  ) {
    if (!eventId) {
      return {
        success: false,
        registration: null,
        message: "eventId is required"
      };
    }
    if (!registrant_name || !registrant_email) {
      return {
        success: false,
        registration: null,
        message: "Name and email are required"
      };
    }

    const events = this._getFromStorage("events", []);
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return {
        success: false,
        registration: null,
        message: "Event not found"
      };
    }

    if (event.status !== "upcoming") {
      return {
        success: false,
        registration: null,
        message: "Cannot register for non-upcoming event"
      };
    }

    let registrations = this._getFromStorage("event_registrations", []);
    const now = new Date().toISOString();

    const registration = {
      id: this._generateId("event_registration"),
      eventId,
      registrant_name,
      registrant_email,
      investor_type: investor_type || null,
      experience_level: experience_level || null,
      consent_to_terms: !!consent_to_terms,
      registered_at: now
    };

    registrations.push(registration);
    this._saveToStorage("event_registrations", registrations);

    // foreign key resolution
    const registrationWithEvent = { ...registration, event };

    return {
      success: true,
      registration: registrationWithEvent,
      message: "Registered for event"
    };
  }

  // 25. getEventRegistrationStatus
  getEventRegistrationStatus(eventId) {
    const registrations = this._getFromStorage("event_registrations", []);
    const profileResult = this.getInvestorProfile();
    const email = profileResult.has_profile && profileResult.profile
      ? profileResult.profile.email
      : null;

    let registration = null;
    if (email) {
      registration = registrations.find(
        (r) => r.eventId === eventId && r.registrant_email === email
      );
    }

    // Fallback: if no profile-based match, use any registration for this event
    if (!registration) {
      registration = registrations.find((r) => r.eventId === eventId) || null;
    }

    const events = this._getFromStorage("events", []);
    const event = events.find((e) => e.id === eventId) || null;

    if (registration) {
      registration = { ...registration, event };
    }

    return {
      is_registered: !!registration,
      registration: registration || null
    };
  }

  // 26. submitConsultationRequest
  submitConsultationRequest(
    topic,
    name,
    email,
    portfolio_size,
    preferred_datetime,
    message
  ) {
    if (!topic || !name || !email) {
      return {
        success: false,
        consultation_request: null,
        message: "topic, name, and email are required"
      };
    }

    if (preferred_datetime) {
      const valid = this._validateConsultationPreferredDatetimeWithinNext7Days(
        preferred_datetime
      );
      if (!valid) {
        return {
          success: false,
          consultation_request: null,
          message:
            "Preferred datetime must be within the next 7 days between 10:00 AM and 12:00 PM"
        };
      }
    }

    let requests = this._getFromStorage("consultation_requests", []);
    const now = new Date().toISOString();

    const consultation_request = {
      id: this._generateId("consultation_request"),
      topic,
      name,
      email,
      portfolio_size: portfolio_size !== undefined ? Number(portfolio_size) : null,
      preferred_datetime: preferred_datetime || null,
      message: message || "",
      status: "submitted",
      created_at: now
    };

    requests.push(consultation_request);
    this._saveToStorage("consultation_requests", requests);

    return {
      success: true,
      consultation_request,
      message: "Consultation request submitted"
    };
  }

  // 27. getTrackRecordFilterOptions
  getTrackRecordFilterOptions() {
    const deals = this._getFromStorage("deals", []);
    const closedDeals = deals.filter((d) => d.status === "closed");

    const propertyTypeSet = new Set();
    const yearsSet = new Set();
    let minIrr = null;
    let maxIrr = null;

    closedDeals.forEach((d) => {
      if (d.property_type) propertyTypeSet.add(d.property_type);
      const closingDate = this._parseDate(d.closing_date);
      if (closingDate) yearsSet.add(closingDate.getFullYear());
      if (typeof d.realized_irr_percent === "number") {
        if (minIrr === null || d.realized_irr_percent < minIrr) {
          minIrr = d.realized_irr_percent;
        }
        if (maxIrr === null || d.realized_irr_percent > maxIrr) {
          maxIrr = d.realized_irr_percent;
        }
      }
    });

    const property_type_options = Array.from(propertyTypeSet).map((value) => ({
      value,
      label: this._getPropertyTypeLabel(value)
    }));

    const closing_year_options = Array.from(yearsSet).sort((a, b) => a - b);

    const realized_irr_range = {
      min_percent: minIrr,
      max_percent: maxIrr
    };

    const sort_options = [
      {
        value: "realized_irr",
        label: "Realized IRR",
        default_direction: "desc"
      },
      {
        value: "closing_date",
        label: "Closing Date",
        default_direction: "desc"
      },
      {
        value: "purchase_price",
        label: "Purchase Price",
        default_direction: "desc"
      }
    ];

    return {
      property_type_options,
      closing_year_options,
      realized_irr_range,
      sort_options
    };
  }

  // 28. getTrackRecordDeals
  getTrackRecordDeals(
    filters,
    sort_by,
    sort_direction = "desc",
    page = 1,
    page_size = 20
  ) {
    const deals = this._getFromStorage("deals", []);
    const f = filters || {};

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        "task8_filterParams",
        JSON.stringify({ filters: f, sort_by, sort_direction, page })
      );
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    let filtered = deals.filter((d) => {
      if (f.property_type && d.property_type !== f.property_type) return false;
      if (f.city && d.city !== f.city) return false;
      if (f.state && d.state !== f.state) return false;
      if (f.country && d.country !== f.country) return false;

      if (
        typeof f.min_realized_irr_percent === "number" &&
        (typeof d.realized_irr_percent !== "number" ||
          d.realized_irr_percent < f.min_realized_irr_percent)
      ) {
        return false;
      }

      if (
        typeof f.max_realized_irr_percent === "number" &&
        (typeof d.realized_irr_percent !== "number" ||
          d.realized_irr_percent > f.max_realized_irr_percent)
      ) {
        return false;
      }

      const closingDate = this._parseDate(d.closing_date);
      if (f.closing_date_from) {
        const from = this._parseDate(f.closing_date_from);
        if (from && closingDate && closingDate < from) return false;
      }
      if (f.closing_date_to) {
        const to = this._parseDate(f.closing_date_to);
        if (to && closingDate && closingDate > to) return false;
      }

      return true;
    });

    if (!sort_by) sort_by = "realized_irr";
    const dir = sort_direction === "asc" ? 1 : -1;

    filtered.sort((a, b) => {
      let va;
      let vb;
      if (sort_by === "realized_irr") {
        va = typeof a.realized_irr_percent === "number" ? a.realized_irr_percent : -Infinity;
        vb = typeof b.realized_irr_percent === "number" ? b.realized_irr_percent : -Infinity;
      } else if (sort_by === "closing_date") {
        va = this._parseDate(a.closing_date) || 0;
        vb = this._parseDate(b.closing_date) || 0;
      } else if (sort_by === "purchase_price") {
        va = typeof a.purchase_price === "number" ? a.purchase_price : 0;
        vb = typeof b.purchase_price === "number" ? b.purchase_price : 0;
      } else {
        va = 0;
        vb = 0;
      }

      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    const total_count = filtered.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const pageDeals = filtered.slice(startIndex, endIndex);

    return {
      deals: pageDeals,
      total_count,
      page,
      page_size
    };
  }

  // 29. getArticlesFilterOptions
  getArticlesFilterOptions() {
    const category_values = [
      "multifamily",
      "office",
      "industrial",
      "1031_exchange",
      "tax_strategies",
      "general_education",
      "platform_updates",
      "other"
    ];

    const category_options = category_values.map((value) => ({
      value,
      label: this._humanizeEnum(value)
    }));

    const articles = this._getFromStorage("articles", []);
    const tagSet = new Set();
    articles.forEach((a) => {
      if (Array.isArray(a.tags)) {
        a.tags.forEach((t) => tagSet.add(t));
      }
    });

    const tag_options = Array.from(tagSet);

    return {
      category_options,
      tag_options
    };
  }

  // 30. getArticlesList
  getArticlesList(
    filters,
    search_query,
    sort_by,
    sort_direction = "desc",
    page = 1,
    page_size = 20
  ) {
    const articles = this._getFromStorage("articles", []);
    const f = filters || {};
    const query = (search_query || "").toLowerCase();

    let filtered = articles.filter((a) => {
      if (f.category && a.category !== f.category) return false;

      if (Array.isArray(f.tags) && f.tags.length > 0) {
        const tags = Array.isArray(a.tags) ? a.tags : [];
        const hasAll = f.tags.every((t) => tags.includes(t));
        if (!hasAll) return false;
      }

      const publishedAt = this._parseDate(a.published_at);
      if (f.published_after) {
        const pa = this._parseDate(f.published_after);
        if (pa && publishedAt && publishedAt < pa) return false;
      }
      if (f.published_before) {
        const pb = this._parseDate(f.published_before);
        if (pb && publishedAt && publishedAt > pb) return false;
      }

      if (query) {
        const title = (a.title || "").toLowerCase();
        const summary = (a.summary || "").toLowerCase();
        const content = (a.content || "").toLowerCase();
        if (!title.includes(query) && !summary.includes(query) && !content.includes(query)) {
          return false;
        }
      }

      return true;
    });

    if (!sort_by) sort_by = "published_at";
    const dir = sort_direction === "asc" ? 1 : -1;

    filtered.sort((a, b) => {
      let va;
      let vb;
      if (sort_by === "published_at") {
        va = this._parseDate(a.published_at) || 0;
        vb = this._parseDate(b.published_at) || 0;
      } else if (sort_by === "title") {
        va = (a.title || "").toLowerCase();
        vb = (b.title || "").toLowerCase();
      } else {
        va = 0;
        vb = 0;
      }

      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    const total_count = filtered.length;
    const startIndex = (page - 1) * page_size;
    const endIndex = startIndex + page_size;
    const pageArticles = filtered.slice(startIndex, endIndex);

    return {
      articles: pageArticles,
      total_count,
      page,
      page_size
    };
  }

  // 31. getArticleDetail
  getArticleDetail(articleId, slug) {
    const articles = this._getFromStorage("articles", []);
    let article = null;
    if (articleId) {
      article = articles.find((a) => a.id === articleId) || null;
    } else if (slug) {
      article = articles.find((a) => a.slug === slug) || null;
    }

    if (!article) {
      return {
        article: null,
        in_reading_list: false,
        collections: []
      };
    }

    const reading_list_items = this._getFromStorage("reading_list_items", []);
    const reading_list_collections = this._getFromStorage("reading_list_collections", []);

    const itemsForArticle = reading_list_items.filter(
      (item) => item.articleId === article.id
    );

    const collectionIds = Array.from(
      new Set(itemsForArticle.map((i) => i.collectionId).filter((id) => !!id))
    );
    const collections = reading_list_collections.filter((c) =>
      collectionIds.includes(c.id)
    );

    return {
      article,
      in_reading_list: itemsForArticle.length > 0,
      collections
    };
  }

  // 32. saveArticleToReadingList
  saveArticleToReadingList(articleId, collectionId, collectionName, notes) {
    if (!articleId) {
      return {
        success: false,
        reading_list_item: null,
        collection: null,
        message: "articleId is required"
      };
    }

    const articles = this._getFromStorage("articles", []);
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        reading_list_item: null,
        collection: null,
        message: "Article not found"
      };
    }

    let collections = this._getOrCreateReadingCollections();
    let collection = null;

    if (collectionId) {
      collection = collections.find((c) => c.id === collectionId) || null;
    } else if (collectionName) {
      collection = this._getOrCreateReadingListCollectionByName(collectionName);
      collections = this._getFromStorage("reading_list_collections", []);
    } else {
      // default collection
      collection = collections[0];
    }

    let reading_list_items = this._getFromStorage("reading_list_items", []);
    const now = new Date().toISOString();

    const reading_list_item = {
      id: this._generateId("reading_list_item"),
      articleId,
      collectionId: collection ? collection.id : null,
      saved_at: now,
      notes: notes || ""
    };

    reading_list_items.push(reading_list_item);
    this._saveToStorage("reading_list_items", reading_list_items);

    return {
      success: true,
      reading_list_item,
      collection,
      message: "Article saved to reading list"
    };
  }

  // 33. getReadingListOverview
  getReadingListOverview() {
    const collections = this._getOrCreateReadingCollections();
    const reading_list_items = this._getFromStorage("reading_list_items", []);
    const articles = this._getFromStorage("articles", []);

    const grouped = collections.map((collection) => {
      const itemsForCollection = reading_list_items.filter(
        (item) => item.collectionId === collection.id
      );

      const items = itemsForCollection.map((reading_list_item) => {
        const article = articles.find((a) => a.id === reading_list_item.articleId) || null;
        const resolved_item = {
          ...reading_list_item,
          article,
          collection
        }; // foreign key resolution
        return {
          reading_list_item: resolved_item,
          article
        };
      });

      return {
        collection,
        items
      };
    });

    return {
      collections: grouped
    };
  }

  // 34. removeReadingListItem
  removeReadingListItem(readingListItemId) {
    let items = this._getFromStorage("reading_list_items", []);
    const before = items.length;
    items = items.filter((i) => i.id !== readingListItemId);
    const after = items.length;
    this._saveToStorage("reading_list_items", items);

    const removed = after < before;
    return {
      success: removed,
      message: removed ? "Reading list item removed" : "Reading list item not found"
    };
  }

  // 35. moveReadingListItemToCollection
  moveReadingListItemToCollection(readingListItemId, targetCollectionId) {
    let items = this._getFromStorage("reading_list_items", []);
    const collections = this._getOrCreateReadingCollections();

    const item = items.find((i) => i.id === readingListItemId);
    if (!item) {
      return {
        success: false,
        reading_list_item: null,
        from_collection: null,
        to_collection: null
      };
    }

    const from_collection = collections.find((c) => c.id === item.collectionId) || null;
    const to_collection = collections.find((c) => c.id === targetCollectionId) || null;

    if (!to_collection) {
      return {
        success: false,
        reading_list_item: null,
        from_collection,
        to_collection: null
      };
    }

    item.collectionId = to_collection.id;
    items = items.map((i) => (i.id === item.id ? item : i));
    this._saveToStorage("reading_list_items", items);

    const articles = this._getFromStorage("articles", []);
    const article = articles.find((a) => a.id === item.articleId) || null;
    const resolved_item = { ...item, article, collection: to_collection };

    return {
      success: true,
      reading_list_item: resolved_item,
      from_collection,
      to_collection
    };
  }

  // 36. getAboutUsContent
  getAboutUsContent() {
    // about_us_content is stored as a single object if present
    const raw = localStorage.getItem("about_us_content");
    let stored = null;
    if (raw) {
      try {
        stored = JSON.parse(raw);
      } catch (e) {
        stored = null;
      }
    }

    const mission = stored && stored.mission ? stored.mission : "";
    const investment_philosophy =
      stored && stored.investment_philosophy ? stored.investment_philosophy : "";
    const differentiators =
      stored && Array.isArray(stored.differentiators) ? stored.differentiators : [];
    const team_members =
      stored && Array.isArray(stored.team_members) ? stored.team_members : [];
    const track_record_summary = stored && stored.track_record_summary
      ? stored.track_record_summary
      : {
          total_deals: 0,
          total_equity_raised: 0,
          average_realized_irr_percent: 0,
          focus_areas: []
        };

    return {
      mission,
      investment_philosophy,
      differentiators,
      team_members,
      track_record_summary
    };
  }

  // 37. getFaqEntries
  getFaqEntries(category) {
    const faqs = this._getFromStorage("faq_entries", []);
    if (!category) return faqs;
    return faqs.filter((f) => f.category === category);
  }

  // 38. getLegalContent
  getLegalContent(section) {
    const all = this._getFromStorage("legal_content", {});
    const entry = all[section] || {};
    return {
      section,
      title: entry.title || "",
      content: entry.content || "",
      last_updated: entry.last_updated || ""
    };
  }
}

// Browser global + Node.js export
if (typeof window !== "undefined") {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = BusinessLogic;
}
