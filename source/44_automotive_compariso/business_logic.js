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
  }

  // Initialize all data tables in localStorage if not exist
  _initStorage() {
    const keys = [
      "vehicle_reviews",
      "brands",
      "vehicle_categories",
      "tags",
      "articles",
      "reading_list_items",
      "comparison_states",
      "comments",
      "ownership_cost_calculations",
      "tools",
      "newsletter_subscriptions",
      "share_actions",
      "informational_pages",
      "contact_messages"
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
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
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _now() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _isWithinDatePreset(dateStr, preset) {
    if (!preset || preset === "all_time") return true;
    const date = this._parseDate(dateStr);
    if (!date) return false;
    const now = new Date();
    const msInDay = 24 * 60 * 60 * 1000;
    const diffDays = (now.getTime() - date.getTime()) / msInDay;
    if (preset === "last_6_months") {
      return diffDays <= 6 * 30.5;
    }
    if (preset === "last_12_months") {
      return diffDays <= 12 * 30.5;
    }
    return true;
  }

  _compareNullableNumber(a, b, direction) {
    // direction: 'asc' or 'desc'
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return direction === "asc" ? a - b : b - a;
  }

  _compareDateString(a, b, direction) {
    const da = this._parseDate(a);
    const db = this._parseDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return direction === "asc" ? da - db : db - da;
  }

  // =====================
  // Helper: ComparisonState
  // =====================

  _getOrCreateComparisonState() {
    let states = this._getFromStorage("comparison_states");
    let state = states.find((s) => s.id === "current");
    if (!state) {
      state = {
        id: "current",
        vehicle_review_ids: [],
        created_at: this._now(),
        updated_at: this._now()
      };
      states.push(state);
      this._saveToStorage("comparison_states", states);
    }
    return state;
  }

  _persistComparisonState(state) {
    let states = this._getFromStorage("comparison_states");
    const idx = states.findIndex((s) => s.id === state.id);
    if (idx >= 0) {
      states[idx] = state;
    } else {
      states.push(state);
    }
    this._saveToStorage("comparison_states", states);
  }

  // =====================
  // Helper: Reading List
  // =====================

  _getReadingListStore() {
    return this._getFromStorage("reading_list_items");
  }

  _saveReadingListStore(items) {
    this._saveToStorage("reading_list_items", items);
  }

  // =====================
  // Helper: Ownership cost
  // =====================

  _calculateOwnershipCosts(purchase_price, average_mpg, annual_miles, gas_price_per_gallon, years) {
    if (!average_mpg || average_mpg <= 0) {
      return {
        estimated_fuel_cost_total: 0,
        estimated_ownership_cost_total: purchase_price || 0
      };
    }
    const gallonsPerYear = annual_miles / average_mpg;
    const fuelCostPerYear = gallonsPerYear * gas_price_per_gallon;
    const totalFuelCost = fuelCostPerYear * years;
    const totalOwnershipCost = (purchase_price || 0) + totalFuelCost;
    return {
      estimated_fuel_cost_total: totalFuelCost,
      estimated_ownership_cost_total: totalOwnershipCost
    };
  }

  // =====================
  // Helper: Vehicle cards
  // =====================

  _buildVehicleCardsFromReviews(reviews) {
    const brands = this._getFromStorage("brands");
    const categories = this._getFromStorage("vehicle_categories");
    const readingList = this._getReadingListStore();
    const comparisonState = this._getOrCreateComparisonState();
    const comparisonIds = comparisonState.vehicle_review_ids || [];

    const bookmarkedMap = new Set(
      readingList
        .filter((item) => item.content_type === "vehicle_review")
        .map((item) => item.content_id)
    );

    const brandById = {};
    for (const b of brands) {
      if (b && b.id) brandById[b.id] = b;
    }

    const categoryBySlugOrId = {};
    for (const c of categories) {
      if (!c) continue;
      if (c.slug) categoryBySlugOrId[c.slug] = c;
      if (c.id) categoryBySlugOrId[c.id] = c;
    }

    return reviews.map((review) => {
      const brand = brandById[review.brand_id] || null;
      const category = categoryBySlugOrId[review.category_id] || null;
      return {
        id: review.id,
        title: review.title,
        slug: review.slug,
        brand_name: brand ? brand.name : "",
        model_name: review.model_name,
        model_year: review.model_year,
        category_slug: review.category_id,
        category_name: category ? category.name : "",
        thumbnail_image_url: review.thumbnail_image_url || null,
        base_price: review.base_price,
        price_currency: review.price_currency || "USD",
        overall_rating: review.overall_rating != null ? review.overall_rating : null,
        expert_rating: review.expert_rating != null ? review.expert_rating : null,
        owner_rating: review.owner_rating != null ? review.owner_rating : null,
        safety_rating: review.safety_rating != null ? review.safety_rating : null,
        overall_score: review.overall_score != null ? review.overall_score : null,
        powertrain: review.powertrain || null,
        driving_range_miles:
          review.driving_range_miles != null ? review.driving_range_miles : null,
        combined_mpg: review.combined_mpg != null ? review.combined_mpg : null,
        published_at: review.published_at || null,
        summary: review.summary || "",
        bookmarked: bookmarkedMap.has(review.id),
        in_comparison: comparisonIds.indexOf(review.id) !== -1
      };
    });
  }

  // =====================
  // Helper: Best-in-class metrics
  // =====================

  _determineBestInClassMetrics(vehicles) {
    const result = {
      lowest_price_vehicle_ids: [],
      highest_combined_mpg_vehicle_ids: [],
      longest_range_vehicle_ids: [],
      highest_safety_rating_vehicle_ids: [],
      highest_expert_rating_vehicle_ids: [],
      highest_owner_rating_vehicle_ids: []
    };

    if (!vehicles || vehicles.length === 0) {
      return result;
    }

    const metrics = {
      lowest_price_vehicle_ids: {
        field: "base_price",
        comparator: (a, b) => this._compareNullableNumber(a, b, "asc")
      },
      highest_combined_mpg_vehicle_ids: {
        field: "combined_mpg",
        comparator: (a, b) => this._compareNullableNumber(a, b, "desc")
      },
      longest_range_vehicle_ids: {
        field: "driving_range_miles",
        comparator: (a, b) => this._compareNullableNumber(a, b, "desc")
      },
      highest_safety_rating_vehicle_ids: {
        field: "safety_rating",
        comparator: (a, b) => this._compareNullableNumber(a, b, "desc")
      },
      highest_expert_rating_vehicle_ids: {
        field: "expert_rating",
        comparator: (a, b) => this._compareNullableNumber(a, b, "desc")
      },
      highest_owner_rating_vehicle_ids: {
        field: "owner_rating",
        comparator: (a, b) => this._compareNullableNumber(a, b, "desc")
      }
    };

    for (const key in metrics) {
      const { field, comparator } = metrics[key];
      let bestValue = null;
      let bestIds = [];
      for (const v of vehicles) {
        const val = v[field];
        if (val == null) continue;
        if (bestValue == null) {
          bestValue = val;
          bestIds = [v.id];
        } else {
          const cmp = comparator(val, bestValue);
          if (cmp < 0) {
            bestValue = val;
            bestIds = [v.id];
          } else if (cmp === 0) {
            bestIds.push(v.id);
          }
        }
      }
      result[key] = bestIds;
    }

    return result;
  }

  // =====================
  // Interface: getVehicleCategories
  // =====================

  getVehicleCategories() {
    // Returns all vehicle categories as stored
    const categories = this._getFromStorage("vehicle_categories");
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || ""
    }));
  }

  // =====================
  // Interface: getPopularTags
  // =====================

  getPopularTags() {
    // No popularity metric in schema; return all tags
    return this._getFromStorage("tags");
  }

  // =====================
  // Interface: getHomepageHighlights
  // =====================

  getHomepageHighlights() {
    const reviews = this._getFromStorage("vehicle_reviews");
    const now = new Date();

    // Recent: sort by published_at desc
    const recentSorted = [...reviews].sort((a, b) =>
      this._compareDateString(a.published_at, b.published_at, "desc")
    );

    // Family-focused vehicles
    const familyReviews = reviews.filter((r) => r.is_family_focused);

    // Electric vehicles
    const evReviews = reviews.filter((r) => r.powertrain === "electric");

    // Featured: take top by overall_score (fallback to recent)
    const featuredSorted = [...reviews].sort((a, b) =>
      this._compareNullableNumber(a.overall_score, b.overall_score, "desc")
    );

    const featured_cards = this._buildVehicleCardsFromReviews(featuredSorted.slice(0, 10));
    const recent_cards = this._buildVehicleCardsFromReviews(recentSorted.slice(0, 10));
    const family_cards = this._buildVehicleCardsFromReviews(familyReviews.slice(0, 10));
    const ev_cards = this._buildVehicleCardsFromReviews(evReviews.slice(0, 10));

    return {
      featured_reviews: featured_cards,
      recent_reviews: recent_cards,
      family_focused_vehicles: family_cards,
      electric_vehicles: ev_cards
    };
  }

  // =====================
  // Interface: searchContent
  // =====================

  searchContent(query, filters, sort_by, page, page_size) {
    const q = (query || "").trim().toLowerCase();
    const f = filters || {};
    const sortBy = sort_by || "relevance";
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    const allReviews = this._getFromStorage("vehicle_reviews");
    const allArticles = this._getFromStorage("articles");
    const brands = this._getFromStorage("brands");
    const tags = this._getFromStorage("tags");

    const brandById = {};
    for (const b of brands) {
      if (b && b.id) brandById[b.id] = b;
    }

    const tagById = {};
    for (const t of tags) {
      if (t && t.id) tagById[t.id] = t;
    }

    const contentType = f.content_type || "all";

    // ---- Filter vehicles ----
    let vehicleResults = [];
    if (contentType === "all" || contentType === "vehicle_review") {
      vehicleResults = allReviews.filter((r) => {
        // Keyword match
        if (q) {
          const brand = brandById[r.brand_id];
          const haystack = [
            r.title,
            r.model_name,
            r.full_model_name,
            brand ? brand.name : "",
            r.summary || "",
            r.content || ""
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }

        if (f.powertrain && r.powertrain !== f.powertrain) return false;

        if (f.driving_range_miles_min != null) {
          if (r.driving_range_miles == null) return false;
          if (r.driving_range_miles < f.driving_range_miles_min) return false;
        }

        if (f.max_price != null && r.base_price != null) {
          if (r.base_price > f.max_price) return false;
        }

        if (f.owner_rating_min != null && r.owner_rating != null) {
          if (r.owner_rating < f.owner_rating_min) return false;
        } else if (f.owner_rating_min != null && r.owner_rating == null) {
          return false;
        }

        if (f.overall_rating_min != null && r.overall_rating != null) {
          if (r.overall_rating < f.overall_rating_min) return false;
        } else if (f.overall_rating_min != null && r.overall_rating == null) {
          return false;
        }

        if (f.expert_rating_min != null && r.expert_rating != null) {
          if (r.expert_rating < f.expert_rating_min) return false;
        } else if (f.expert_rating_min != null && r.expert_rating == null) {
          return false;
        }

        if (f.model_year_min != null && r.model_year != null) {
          if (r.model_year < f.model_year_min) return false;
        }
        if (f.model_year_max != null && r.model_year != null) {
          if (r.model_year > f.model_year_max) return false;
        }

        if (f.published_date_preset) {
          if (!this._isWithinDatePreset(r.published_at, f.published_date_preset)) {
            return false;
          }
        }

        return true;
      });

      // Sorting for vehicles
      vehicleResults.sort((a, b) => {
        if (sortBy === "price_asc") {
          return this._compareNullableNumber(a.base_price, b.base_price, "asc");
        }
        if (sortBy === "price_desc") {
          return this._compareNullableNumber(a.base_price, b.base_price, "desc");
        }
        if (sortBy === "range_desc") {
          return this._compareNullableNumber(
            a.driving_range_miles,
            b.driving_range_miles,
            "desc"
          );
        }
        if (sortBy === "rating_desc") {
          return this._compareNullableNumber(
            a.overall_rating,
            b.overall_rating,
            "desc"
          );
        }
        if (sortBy === "newest_first") {
          return this._compareDateString(a.published_at, b.published_at, "desc");
        }
        // relevance
        if (!q) {
          return this._compareDateString(a.published_at, b.published_at, "desc");
        }
        const brandA = brandById[a.brand_id];
        const brandB = brandById[b.brand_id];
        const hayA = [
          a.title,
          a.model_name,
          a.full_model_name,
          brandA ? brandA.name : "",
          a.summary || ""
        ]
          .join(" ")
          .toLowerCase();
        const hayB = [
          b.title,
          b.model_name,
          b.full_model_name,
          brandB ? brandB.name : "",
          b.summary || ""
        ]
          .join(" ")
          .toLowerCase();
        const scoreA = hayA.includes(q) ? 1 : 0;
        const scoreB = hayB.includes(q) ? 1 : 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return this._compareDateString(a.published_at, b.published_at, "desc");
      });
    }

    // ---- Filter articles ----
    let articleResults = [];
    if (contentType === "all" || contentType === "article") {
      articleResults = allArticles.filter((a) => {
        if (q) {
          const haystack = [a.title, a.summary || "", a.content || ""].join(" ").toLowerCase();
          if (!haystack.includes(q)) return false;
        }

        if (f.published_date_preset) {
          if (!this._isWithinDatePreset(a.published_at, f.published_date_preset)) {
            return false;
          }
        }

        return true;
      });

      articleResults.sort((a, b) => {
        if (sortBy === "newest_first") {
          return this._compareDateString(a.published_at, b.published_at, "desc");
        }
        if (sortBy === "most_popular") {
          return this._compareNullableNumber(
            a.popularity_score,
            b.popularity_score,
            "desc"
          );
        }
        // relevance
        if (!q) {
          return this._compareDateString(a.published_at, b.published_at, "desc");
        }
        const hayA = [a.title, a.summary || ""].join(" ").toLowerCase();
        const hayB = [b.title, b.summary || ""].join(" ").toLowerCase();
        const scoreA = hayA.includes(q) ? 1 : 0;
        const scoreB = hayB.includes(q) ? 1 : 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        return this._compareDateString(a.published_at, b.published_at, "desc");
      });
    }

    const totalVehicleCount = vehicleResults.length;
    const totalArticleCount = articleResults.length;

    const vStart = (pageNum - 1) * size;
    const vEnd = vStart + size;
    const pagedVehicles = vehicleResults.slice(vStart, vEnd);

    const aStart = (pageNum - 1) * size;
    const aEnd = aStart + size;
    const pagedArticles = articleResults.slice(aStart, aEnd);

    const vehicleCards = this._buildVehicleCardsFromReviews(pagedVehicles);

    const readingList = this._getReadingListStore();
    const bookmarkedArticleIds = new Set(
      readingList
        .filter((item) => item.content_type === "article")
        .map((item) => item.content_id)
    );

    const articleCards = pagedArticles.map((a) => {
      let primaryTagName = "";
      if (a.primary_tag_id && tagById[a.primary_tag_id]) {
        primaryTagName = tagById[a.primary_tag_id].name;
      } else if (Array.isArray(a.tag_ids) && a.tag_ids.length > 0) {
        const t = tagById[a.tag_ids[0]];
        primaryTagName = t ? t.name : "";
      }
      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        summary: a.summary || "",
        thumbnail_image_url: a.thumbnail_image_url || null,
        hero_image_url: a.hero_image_url || null,
        published_at: a.published_at || null,
        year: a.year,
        popularity_score: a.popularity_score != null ? a.popularity_score : null,
        primary_tag_name: primaryTagName,
        bookmarked: bookmarkedArticleIds.has(a.id)
      };
    });

    return {
      vehicles: vehicleCards,
      articles: articleCards,
      total_vehicle_count: totalVehicleCount,
      total_article_count: totalArticleCount,
      applied_filters: {
        content_type: contentType,
        powertrain: f.powertrain || null,
        driving_range_miles_min: f.driving_range_miles_min != null ? f.driving_range_miles_min : null,
        max_price: f.max_price != null ? f.max_price : null,
        owner_rating_min: f.owner_rating_min != null ? f.owner_rating_min : null,
        overall_rating_min: f.overall_rating_min != null ? f.overall_rating_min : null,
        expert_rating_min: f.expert_rating_min != null ? f.expert_rating_min : null,
        model_year_min: f.model_year_min != null ? f.model_year_min : null,
        model_year_max: f.model_year_max != null ? f.model_year_max : null,
        published_date_preset: f.published_date_preset || null
      }
    };
  }

  // =====================
  // Interface: getSearchFilterOptions
  // =====================

  getSearchFilterOptions() {
    const reviews = this._getFromStorage("vehicle_reviews");

    let minPrice = null;
    let maxPrice = null;
    const yearsSet = new Set();

    for (const r of reviews) {
      if (r.base_price != null) {
        if (minPrice == null || r.base_price < minPrice) minPrice = r.base_price;
        if (maxPrice == null || r.base_price > maxPrice) maxPrice = r.base_price;
      }
      if (r.model_year != null) yearsSet.add(r.model_year);
    }

    const price_ranges = [];
    if (minPrice != null && maxPrice != null) {
      const range = maxPrice - minPrice;
      const step = range / 3 || range || minPrice;
      price_ranges.push(
        { label: "All", min: minPrice, max: maxPrice },
        { label: "Low", min: minPrice, max: minPrice + step },
        { label: "Mid", min: minPrice + step, max: minPrice + 2 * step },
        { label: "High", min: minPrice + 2 * step, max: maxPrice }
      );
    }

    const rating_thresholds = [
      { label: "3.0+", overall_rating_min: 3.0, owner_rating_min: 3.0, expert_rating_min: 3.0 },
      { label: "3.5+", overall_rating_min: 3.5, owner_rating_min: 3.5, expert_rating_min: 3.5 },
      { label: "4.0+", overall_rating_min: 4.0, owner_rating_min: 4.0, expert_rating_min: 4.0 },
      { label: "4.5+", overall_rating_min: 4.5, owner_rating_min: 4.5, expert_rating_min: 4.5 }
    ];

    const driving_range_buckets = [
      { label: "0-150 mi", min: 0, max: 150 },
      { label: "150-250 mi", min: 150, max: 250 },
      { label: "250-350 mi", min: 250, max: 350 },
      { label: "350+ mi", min: 350, max: 10000 }
    ];

    const powertrain_options = [
      { value: "gas", label: "Gas" },
      { value: "diesel", label: "Diesel" },
      { value: "hybrid", label: "Hybrid" },
      { value: "electric", label: "Electric" },
      { value: "plug_in_hybrid", label: "Plug-in Hybrid" },
      { value: "other", label: "Other" }
    ];

    const model_years = Array.from(yearsSet).sort((a, b) => b - a);

    const date_presets = [
      { value: "last_6_months", label: "Last 6 months" },
      { value: "last_12_months", label: "Last 12 months" },
      { value: "all_time", label: "All time" }
    ];

    const sort_options = [
      { value: "relevance", label: "Relevance" },
      { value: "price_asc", label: "Price: Low to High" },
      { value: "price_desc", label: "Price: High to Low" },
      { value: "range_desc", label: "Range: High to Low" },
      { value: "rating_desc", label: "Rating: High to Low" },
      { value: "newest_first", label: "Newest first" }
    ];

    return {
      price_ranges,
      rating_thresholds,
      driving_range_buckets,
      powertrain_options,
      model_years,
      date_presets,
      sort_options
    };
  }

  // =====================
  // Interface: getVehicleCategoryListings
  // =====================

  getVehicleCategoryListings(category_slug, filters, sort_by, page, page_size) {
    const f = filters || {};
    const sortBy = sort_by || "overall_score_desc";
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    const reviews = this._getFromStorage("vehicle_reviews");
    const categories = this._getFromStorage("vehicle_categories");

    const category = categories.find(
      (c) => c.slug === category_slug || c.id === category_slug
    );
    const categoryName = category ? category.name : category_slug;

    let filtered = reviews.filter((r) => r.category_id === category_slug);

    if (f.min_price != null) {
      filtered = filtered.filter((r) => r.base_price != null && r.base_price >= f.min_price);
    }
    if (f.max_price != null) {
      filtered = filtered.filter((r) => r.base_price != null && r.base_price <= f.max_price);
    }
    if (f.model_year_min != null) {
      filtered = filtered.filter(
        (r) => r.model_year != null && r.model_year >= f.model_year_min
      );
    }
    if (f.model_year_max != null) {
      filtered = filtered.filter(
        (r) => r.model_year != null && r.model_year <= f.model_year_max
      );
    }
    if (f.model_year != null) {
      filtered = filtered.filter((r) => r.model_year === f.model_year);
    }
    if (f.body_size) {
      filtered = filtered.filter((r) => r.body_size === f.body_size);
    }
    if (f.body_style) {
      filtered = filtered.filter((r) => r.body_style === f.body_style);
    }
    if (f.length_max_inches != null) {
      filtered = filtered.filter(
        (r) => r.length_inches != null && r.length_inches <= f.length_max_inches
      );
    }
    if (f.overall_rating_min != null) {
      filtered = filtered.filter(
        (r) => r.overall_rating != null && r.overall_rating >= f.overall_rating_min
      );
    }
    if (f.expert_rating_min != null) {
      filtered = filtered.filter(
        (r) => r.expert_rating != null && r.expert_rating >= f.expert_rating_min
      );
    }
    if (f.owner_rating_min != null) {
      filtered = filtered.filter(
        (r) => r.owner_rating != null && r.owner_rating >= f.owner_rating_min
      );
    }
    if (f.safety_rating_min != null) {
      filtered = filtered.filter(
        (r) => r.safety_rating != null && r.safety_rating >= f.safety_rating_min
      );
    }
    if (f.published_date_preset) {
      filtered = filtered.filter((r) =>
        this._isWithinDatePreset(r.published_at, f.published_date_preset)
      );
    }
    if (f.is_family_focused != null) {
      filtered = filtered.filter((r) => !!r.is_family_focused === !!f.is_family_focused);
    }

    filtered.sort((a, b) => {
      if (sortBy === "expert_rating_desc") {
        return this._compareNullableNumber(a.expert_rating, b.expert_rating, "desc");
      }
      if (sortBy === "price_asc") {
        return this._compareNullableNumber(a.base_price, b.base_price, "asc");
      }
      if (sortBy === "price_desc") {
        return this._compareNullableNumber(a.base_price, b.base_price, "desc");
      }
      if (sortBy === "newest_first") {
        return this._compareDateString(a.published_at, b.published_at, "desc");
      }
      // overall_score_desc default
      return this._compareNullableNumber(a.overall_score, b.overall_score, "desc");
    });

    const totalCount = filtered.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const paged = filtered.slice(start, end);

    const items = this._buildVehicleCardsFromReviews(paged);

    const sort_options = [
      { value: "overall_score_desc", label: "Overall score: High to Low" },
      { value: "expert_rating_desc", label: "Expert rating: High to Low" },
      { value: "price_asc", label: "Price: Low to High" },
      { value: "price_desc", label: "Price: High to Low" },
      { value: "newest_first", label: "Newest first" }
    ];

    return {
      category_name: categoryName,
      items,
      total_count: totalCount,
      applied_filters: {
        min_price: f.min_price != null ? f.min_price : null,
        max_price: f.max_price != null ? f.max_price : null,
        model_year_min: f.model_year_min != null ? f.model_year_min : null,
        model_year_max: f.model_year_max != null ? f.model_year_max : null,
        model_year: f.model_year != null ? f.model_year : null,
        body_size: f.body_size || null,
        body_style: f.body_style || null,
        length_max_inches: f.length_max_inches != null ? f.length_max_inches : null,
        overall_rating_min: f.overall_rating_min != null ? f.overall_rating_min : null,
        expert_rating_min: f.expert_rating_min != null ? f.expert_rating_min : null,
        owner_rating_min: f.owner_rating_min != null ? f.owner_rating_min : null,
        safety_rating_min: f.safety_rating_min != null ? f.safety_rating_min : null,
        published_date_preset: f.published_date_preset || null,
        is_family_focused: f.is_family_focused != null ? !!f.is_family_focused : null
      },
      sort_options
    };
  }

  // =====================
  // Interface: getVehicleCategoryFilterOptions
  // =====================

  getVehicleCategoryFilterOptions(category_slug) {
    const reviews = this._getFromStorage("vehicle_reviews").filter(
      (r) => r.category_id === category_slug
    );

    let minPrice = null;
    let maxPrice = null;
    let minYear = null;
    let maxYear = null;
    let minLength = null;
    let maxLength = null;

    const bodySizeSet = new Set();
    const bodyStyleSet = new Set();

    for (const r of reviews) {
      if (r.base_price != null) {
        if (minPrice == null || r.base_price < minPrice) minPrice = r.base_price;
        if (maxPrice == null || r.base_price > maxPrice) maxPrice = r.base_price;
      }
      if (r.model_year != null) {
        if (minYear == null || r.model_year < minYear) minYear = r.model_year;
        if (maxYear == null || r.model_year > maxYear) maxYear = r.model_year;
      }
      if (r.length_inches != null) {
        if (minLength == null || r.length_inches < minLength) minLength = r.length_inches;
        if (maxLength == null || r.length_inches > maxLength) maxLength = r.length_inches;
      }
      if (r.body_size) bodySizeSet.add(r.body_size);
      if (r.body_style) bodyStyleSet.add(r.body_style);
    }

    const price_ranges = [];
    if (minPrice != null && maxPrice != null) {
      price_ranges.push({ label: "All", min: minPrice, max: maxPrice });
    }

    const model_year_range = {
      min_year: minYear != null ? minYear : null,
      max_year: maxYear != null ? maxYear : null
    };

    const body_size_options = Array.from(bodySizeSet).map((val) => ({
      value: val,
      label: val
        .split("_")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ")
    }));

    const body_style_options = Array.from(bodyStyleSet).map((val) => ({
      value: val,
      label: val
        .split("_")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ")
    }));

    const length_range_inches = {
      min: minLength != null ? minLength : null,
      max: maxLength != null ? maxLength : null
    };

    const rating_thresholds = [
      {
        label: "4.0+ overall",
        overall_rating_min: 4.0,
        expert_rating_min: null,
        owner_rating_min: null,
        safety_rating_min: null
      },
      {
        label: "4.0+ expert",
        overall_rating_min: null,
        expert_rating_min: 4.0,
        owner_rating_min: null,
        safety_rating_min: null
      },
      {
        label: "4.0+ owner",
        overall_rating_min: null,
        expert_rating_min: null,
        owner_rating_min: 4.0,
        safety_rating_min: null
      },
      {
        label: "4.5+ safety",
        overall_rating_min: null,
        expert_rating_min: null,
        owner_rating_min: null,
        safety_rating_min: 4.5
      }
    ];

    const date_presets = [
      { value: "last_6_months", label: "Last 6 months" },
      { value: "last_12_months", label: "Last 12 months" },
      { value: "all_time", label: "All time" }
    ];

    return {
      price_ranges,
      model_year_range,
      body_size_options,
      body_style_options,
      length_range_inches,
      rating_thresholds,
      date_presets
    };
  }

  // =====================
  // Interface: getBrands
  // =====================

  getBrands() {
    return this._getFromStorage("brands");
  }

  // =====================
  // Interface: getBrandVehicles
  // =====================

  getBrandVehicles(brand_slug, filters, sort_by, page, page_size) {
    const f = filters || {};
    const sortBy = sort_by || "price_asc";
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    const brands = this._getFromStorage("brands");
    const brand = brands.find((b) => b.slug === brand_slug);
    const brandId = brand ? brand.id : null;

    const reviews = this._getFromStorage("vehicle_reviews");
    let filtered = reviews;
    if (brandId) {
      filtered = filtered.filter((r) => r.brand_id === brandId);
    } else {
      // If brand not found, no vehicles
      filtered = [];
    }

    if (f.powertrain) {
      filtered = filtered.filter((r) => r.powertrain === f.powertrain);
    }
    if (f.overall_rating_min != null) {
      filtered = filtered.filter(
        (r) => r.overall_rating != null && r.overall_rating >= f.overall_rating_min
      );
    }
    if (f.model_year_min != null) {
      filtered = filtered.filter(
        (r) => r.model_year != null && r.model_year >= f.model_year_min
      );
    }
    if (f.model_year_max != null) {
      filtered = filtered.filter(
        (r) => r.model_year != null && r.model_year <= f.model_year_max
      );
    }
    if (f.body_style) {
      filtered = filtered.filter((r) => r.body_style === f.body_style);
    }
    if (f.min_price != null) {
      filtered = filtered.filter((r) => r.base_price != null && r.base_price >= f.min_price);
    }
    if (f.max_price != null) {
      filtered = filtered.filter((r) => r.base_price != null && r.base_price <= f.max_price);
    }

    filtered.sort((a, b) => {
      if (sortBy === "price_asc") {
        return this._compareNullableNumber(a.base_price, b.base_price, "asc");
      }
      if (sortBy === "price_desc") {
        return this._compareNullableNumber(a.base_price, b.base_price, "desc");
      }
      if (sortBy === "rating_desc") {
        return this._compareNullableNumber(a.overall_rating, b.overall_rating, "desc");
      }
      if (sortBy === "newest_first") {
        return this._compareDateString(a.published_at, b.published_at, "desc");
      }
      return 0;
    });

    const totalCount = filtered.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const paged = filtered.slice(start, end);

    const readingList = this._getReadingListStore();
    const comparisonState = this._getOrCreateComparisonState();
    const comparisonIds = comparisonState.vehicle_review_ids || [];

    const bookmarkedSet = new Set(
      readingList
        .filter((item) => item.content_type === "vehicle_review")
        .map((item) => item.content_id)
    );

    const items = paged.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      model_name: r.model_name,
      model_year: r.model_year,
      thumbnail_image_url: r.thumbnail_image_url || null,
      base_price: r.base_price,
      price_currency: r.price_currency || "USD",
      overall_rating: r.overall_rating != null ? r.overall_rating : null,
      expert_rating: r.expert_rating != null ? r.expert_rating : null,
      owner_rating: r.owner_rating != null ? r.owner_rating : null,
      safety_rating: r.safety_rating != null ? r.safety_rating : null,
      powertrain: r.powertrain || null,
      body_style: r.body_style || null,
      combined_mpg: r.combined_mpg != null ? r.combined_mpg : null,
      driving_range_miles:
        r.driving_range_miles != null ? r.driving_range_miles : null,
      bookmarked: bookmarkedSet.has(r.id),
      in_comparison: comparisonIds.indexOf(r.id) !== -1
    }));

    const sort_options = [
      { value: "price_asc", label: "Price: Low to High" },
      { value: "price_desc", label: "Price: High to Low" },
      { value: "rating_desc", label: "Rating: High to Low" },
      { value: "newest_first", label: "Newest first" }
    ];

    return {
      brand: brand || null,
      items,
      total_count: totalCount,
      applied_filters: {
        powertrain: f.powertrain || null,
        overall_rating_min: f.overall_rating_min != null ? f.overall_rating_min : null,
        model_year_min: f.model_year_min != null ? f.model_year_min : null,
        model_year_max: f.model_year_max != null ? f.model_year_max : null,
        body_style: f.body_style || null,
        min_price: f.min_price != null ? f.min_price : null,
        max_price: f.max_price != null ? f.max_price : null
      },
      sort_options
    };
  }

  // =====================
  // Interface: getBrandFilterOptions
  // =====================

  getBrandFilterOptions(brand_slug) {
    const brands = this._getFromStorage("brands");
    const brand = brands.find((b) => b.slug === brand_slug);
    const brandId = brand ? brand.id : null;
    const reviews = this._getFromStorage("vehicle_reviews");

    const brandReviews = brandId
      ? reviews.filter((r) => r.brand_id === brandId)
      : [];

    const powertrainSet = new Set();
    const bodyStyleSet = new Set();
    const yearsSet = new Set();
    let minYear = null;
    let maxYear = null;
    let minPrice = null;
    let maxPrice = null;

    for (const r of brandReviews) {
      if (r.powertrain) powertrainSet.add(r.powertrain);
      if (r.body_style) bodyStyleSet.add(r.body_style);
      if (r.model_year != null) {
        yearsSet.add(r.model_year);
        if (minYear == null || r.model_year < minYear) minYear = r.model_year;
        if (maxYear == null || r.model_year > maxYear) maxYear = r.model_year;
      }
      if (r.base_price != null) {
        if (minPrice == null || r.base_price < minPrice) minPrice = r.base_price;
        if (maxPrice == null || r.base_price > maxPrice) maxPrice = r.base_price;
      }
    }

    const powertrain_options = Array.from(powertrainSet).map((val) => ({
      value: val,
      label: val
        .split("_")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ")
    }));

    const overall_rating_thresholds = [
      { label: "3.5+", min: 3.5 },
      { label: "4.0+", min: 4.0 },
      { label: "4.5+", min: 4.5 }
    ];

    const model_year_range = {
      min_year: minYear != null ? minYear : null,
      max_year: maxYear != null ? maxYear : null
    };

    const body_style_options = Array.from(bodyStyleSet).map((val) => ({
      value: val,
      label: val
        .split("_")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ")
    }));

    const price_ranges = [];
    if (minPrice != null && maxPrice != null) {
      price_ranges.push({ label: "All", min: minPrice, max: maxPrice });
    }

    return {
      powertrain_options,
      overall_rating_thresholds,
      model_year_range,
      body_style_options,
      price_ranges
    };
  }

  // =====================
  // Interface: getVehicleReviewDetail
  // =====================

  getVehicleReviewDetail(vehicle_review_id) {
    const reviews = this._getFromStorage("vehicle_reviews");
    const brands = this._getFromStorage("brands");
    const categories = this._getFromStorage("vehicle_categories");
    const readingList = this._getReadingListStore();
    const comparisonState = this._getOrCreateComparisonState();

    const vehicle_review = reviews.find((r) => r.id === vehicle_review_id) || null;

    let brand = null;
    let category = null;
    if (vehicle_review) {
      brand = brands.find((b) => b.id === vehicle_review.brand_id) || null;
      category =
        categories.find(
          (c) => c.slug === vehicle_review.category_id || c.id === vehicle_review.category_id
        ) || null;
    }

    const is_bookmarked = readingList.some(
      (item) => item.content_type === "vehicle_review" && item.content_id === vehicle_review_id
    );

    const in_comparison =
      comparisonState.vehicle_review_ids &&
      comparisonState.vehicle_review_ids.indexOf(vehicle_review_id) !== -1;

    return {
      vehicle_review,
      brand,
      category,
      is_bookmarked,
      in_comparison
    };
  }

  // =====================
  // Interface: addVehicleToComparison
  // =====================

  addVehicleToComparison(vehicle_review_id) {
    const reviews = this._getFromStorage("vehicle_reviews");
    const brands = this._getFromStorage("brands");
    const review = reviews.find((r) => r.id === vehicle_review_id);

    if (!review) {
      return {
        success: false,
        message: "Vehicle review not found",
        comparison_state: {
          vehicle_review_ids: [],
          count: 0,
          previews: []
        }
      };
    }

    const state = this._getOrCreateComparisonState();
    if (!state.vehicle_review_ids) state.vehicle_review_ids = [];

    if (state.vehicle_review_ids.indexOf(vehicle_review_id) === -1) {
      state.vehicle_review_ids.push(vehicle_review_id);
      state.updated_at = this._now();
      this._persistComparisonState(state);
    }

    const previews = state.vehicle_review_ids.map((id) => {
      const r = reviews.find((x) => x.id === id) || {};
      const b = brands.find((bb) => bb.id === r.brand_id) || null;
      return {
        vehicle_review_id: id,
        title: r.title || "",
        brand_name: b ? b.name : "",
        thumbnail_image_url: r.thumbnail_image_url || null
      };
    });

    return {
      success: true,
      message: "Added to comparison",
      comparison_state: {
        vehicle_review_ids: state.vehicle_review_ids.slice(),
        count: state.vehicle_review_ids.length,
        previews
      }
    };
  }

  // =====================
  // Interface: removeVehicleFromComparison
  // =====================

  removeVehicleFromComparison(vehicle_review_id) {
    const reviews = this._getFromStorage("vehicle_reviews");
    const brands = this._getFromStorage("brands");
    const state = this._getOrCreateComparisonState();

    if (!state.vehicle_review_ids) state.vehicle_review_ids = [];

    const idx = state.vehicle_review_ids.indexOf(vehicle_review_id);
    if (idx !== -1) {
      state.vehicle_review_ids.splice(idx, 1);
      state.updated_at = this._now();
      this._persistComparisonState(state);
    }

    const previews = state.vehicle_review_ids.map((id) => {
      const r = reviews.find((x) => x.id === id) || {};
      const b = brands.find((bb) => bb.id === r.brand_id) || null;
      return {
        vehicle_review_id: id,
        title: r.title || "",
        brand_name: b ? b.name : "",
        thumbnail_image_url: r.thumbnail_image_url || null
      };
    });

    return {
      success: true,
      message: "Removed from comparison",
      comparison_state: {
        vehicle_review_ids: state.vehicle_review_ids.slice(),
        count: state.vehicle_review_ids.length,
        previews
      }
    };
  }

  // =====================
  // Interface: getComparisonState
  // =====================

  getComparisonState() {
    const state = this._getOrCreateComparisonState();
    const reviews = this._getFromStorage("vehicle_reviews");
    const brands = this._getFromStorage("brands");
    const categories = this._getFromStorage("vehicle_categories");

    const categoryMap = {};
    for (const c of categories) {
      if (!c) continue;
      if (c.slug) categoryMap[c.slug] = c;
      if (c.id) categoryMap[c.id] = c;
    }

    const vehicle_reviews = (state.vehicle_review_ids || []).map((id) => {
      const r = reviews.find((x) => x.id === id) || null;
      if (!r) return null;
      const b = brands.find((bb) => bb.id === r.brand_id) || null;
      const c = categoryMap[r.category_id] || null;
      return {
        vehicle_review: r,
        brand: b,
        category: c
      };
    }).filter((x) => x !== null);

    return {
      id: state.id,
      vehicle_review_ids: state.vehicle_review_ids.slice(),
      created_at: state.created_at,
      updated_at: state.updated_at,
      vehicle_reviews
    };
  }

  // =====================
  // Interface: getComparisonTable
  // =====================

  getComparisonTable() {
    const state = this._getOrCreateComparisonState();
    const reviews = this._getFromStorage("vehicle_reviews");
    const brands = this._getFromStorage("brands");

    const brandById = {};
    for (const b of brands) {
      if (b && b.id) brandById[b.id] = b;
    }

    const vehicles = (state.vehicle_review_ids || []).map((id) => {
      const r = reviews.find((x) => x.id === id);
      if (!r) return null;
      const brand = brandById[r.brand_id] || null;
      return {
        id: r.id,
        title: r.title,
        slug: r.slug,
        brand_name: brand ? brand.name : "",
        model_name: r.model_name,
        model_year: r.model_year,
        base_price: r.base_price,
        price_currency: r.price_currency || "USD",
        combined_mpg: r.combined_mpg != null ? r.combined_mpg : null,
        driving_range_miles:
          r.driving_range_miles != null ? r.driving_range_miles : null,
        safety_rating: r.safety_rating != null ? r.safety_rating : null,
        expert_rating: r.expert_rating != null ? r.expert_rating : null,
        owner_rating: r.owner_rating != null ? r.owner_rating : null,
        length_inches: r.length_inches != null ? r.length_inches : null,
        powertrain: r.powertrain || null,
        thumbnail_image_url: r.thumbnail_image_url || null
      };
    }).filter((v) => v !== null);

    const best_in_class = this._determineBestInClassMetrics(vehicles);

    let summaryText = "";
    if (vehicles.length > 0) {
      const names = vehicles.map((v) => v.model_year + " " + v.brand_name + " " + v.model_name);
      summaryText = "Comparison of " + names.join(", ") + ".";
    }

    return {
      vehicles,
      best_in_class,
      summary: {
        text: summaryText
      }
    };
  }

  // =====================
  // Interface: saveToReadingList
  // =====================

  saveToReadingList(content_type, content_id) {
    const type = content_type;
    const id = content_id;
    let items = this._getReadingListStore();

    let existing = items.find(
      (item) => item.content_type === type && item.content_id === id
    );

    if (!existing) {
      // Resolve title and thumbnail
      let title = "";
      let thumbnail = null;
      if (type === "vehicle_review") {
        const reviews = this._getFromStorage("vehicle_reviews");
        const r = reviews.find((x) => x.id === id);
        if (r) {
          title = r.title || "";
          thumbnail = r.thumbnail_image_url || null;
        }
      } else if (type === "article") {
        const articles = this._getFromStorage("articles");
        const a = articles.find((x) => x.id === id);
        if (a) {
          title = a.title || "";
          thumbnail = a.thumbnail_image_url || null;
        }
      }

      existing = {
        id: this._generateId("reading_list_item"),
        content_type: type,
        content_id: id,
        title,
        thumbnail_image_url: thumbnail,
        added_at: this._now()
      };
      items.push(existing);
      this._saveReadingListStore(items);
    }

    return {
      success: true,
      message: "Saved to reading list",
      reading_list_item: existing,
      reading_list_count: items.length
    };
  }

  // =====================
  // Interface: removeFromReadingList
  // =====================

  removeFromReadingList(reading_list_item_id) {
    let items = this._getReadingListStore();
    const idx = items.findIndex((item) => item.id === reading_list_item_id);
    if (idx !== -1) {
      items.splice(idx, 1);
      this._saveReadingListStore(items);
      return {
        success: true,
        message: "Removed from reading list",
        reading_list_count: items.length
      };
    }
    return {
      success: false,
      message: "Reading list item not found",
      reading_list_count: items.length
    };
  }

  // =====================
  // Interface: getReadingListItems
  // =====================

  getReadingListItems() {
    const items = this._getReadingListStore();
    const reviews = this._getFromStorage("vehicle_reviews");
    const articles = this._getFromStorage("articles");

    const resultItems = items.map((item) => {
      let content = null;
      let slug = "";
      let thumbnail = item.thumbnail_image_url || null;
      if (item.content_type === "vehicle_review") {
        const r = reviews.find((x) => x.id === item.content_id);
        if (r) {
          content = r;
          slug = r.slug || "";
          if (!thumbnail) thumbnail = r.thumbnail_image_url || null;
        }
      } else if (item.content_type === "article") {
        const a = articles.find((x) => x.id === item.content_id);
        if (a) {
          content = a;
          slug = a.slug || "";
          if (!thumbnail) thumbnail = a.thumbnail_image_url || null;
        }
      }

      const content_type_label =
        item.content_type === "vehicle_review" ? "Vehicle review" : "Article";

      const base = {
        reading_list_item_id: item.id,
        content_type: item.content_type,
        content_type_label,
        content_id: item.content_id,
        title: item.title || (content ? content.title : ""),
        slug,
        thumbnail_image_url: thumbnail,
        added_at: item.added_at
      };

      if (item.content_type === "vehicle_review") {
        return Object.assign({}, base, { vehicle_review: content });
      }
      if (item.content_type === "article") {
        return Object.assign({}, base, { article: content });
      }
      return base;
    });

    return {
      items: resultItems,
      total_count: resultItems.length
    };
  }

  // =====================
  // Interface: getToolsList
  // =====================

  getToolsList() {
    return this._getFromStorage("tools");
  }

  // =====================
  // Interface: runOwnershipCostCalculation
  // =====================

  runOwnershipCostCalculation(
    model_name,
    purchase_price,
    average_mpg,
    annual_miles,
    gas_price_per_gallon,
    calculation_period_years,
    vehicle_review_id
  ) {
    const years =
      calculation_period_years != null && calculation_period_years > 0
        ? calculation_period_years
        : 5;

    const costs = this._calculateOwnershipCosts(
      purchase_price,
      average_mpg,
      annual_miles,
      gas_price_per_gallon,
      years
    );

    const calc = {
      id: this._generateId("ownership_cost"),
      model_name,
      vehicle_review_id: vehicle_review_id || null,
      purchase_price,
      average_mpg,
      annual_miles,
      gas_price_per_gallon,
      calculation_period_years: years,
      estimated_fuel_cost_total: costs.estimated_fuel_cost_total,
      estimated_ownership_cost_total: costs.estimated_ownership_cost_total,
      created_at: this._now()
    };

    const calcs = this._getFromStorage("ownership_cost_calculations");
    calcs.push(calc);
    this._saveToStorage("ownership_cost_calculations", calcs);

    // Foreign key resolution: include vehicle_review if present
    if (calc.vehicle_review_id) {
      const reviews = this._getFromStorage("vehicle_reviews");
      const vr = reviews.find((r) => r.id === calc.vehicle_review_id) || null;
      return Object.assign({}, calc, { vehicle_review: vr });
    }

    return calc;
  }

  // =====================
  // Interface: getGuidesListing
  // =====================

  getGuidesListing(filters, sort_by, page, page_size) {
    const f = filters || {};
    const sortBy = sort_by || "newest_first";
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    const articles = this._getFromStorage("articles");
    const tags = this._getFromStorage("tags");
    const tagBySlug = {};
    const tagById = {};

    for (const t of tags) {
      if (!t) continue;
      if (t.slug) tagBySlug[t.slug] = t;
      if (t.id) tagById[t.id] = t;
    }

    let filtered = articles;

    if (f.tag_slug) {
      const tag = tagBySlug[f.tag_slug];
      if (tag) {
        const tagId = tag.id;
        filtered = filtered.filter((a) =>
          Array.isArray(a.tag_ids) && a.tag_ids.indexOf(tagId) !== -1
        );
      } else {
        filtered = [];
      }
    }

    if (f.year != null) {
      filtered = filtered.filter((a) => a.year === f.year);
    }

    filtered.sort((a, b) => {
      if (sortBy === "most_popular") {
        return this._compareNullableNumber(
          a.popularity_score,
          b.popularity_score,
          "desc"
        );
      }
      // newest_first default
      return this._compareDateString(a.published_at, b.published_at, "desc");
    });

    const totalCount = filtered.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const paged = filtered.slice(start, end);

    const readingList = this._getReadingListStore();
    const bookmarkedSet = new Set(
      readingList
        .filter((item) => item.content_type === "article")
        .map((item) => item.content_id)
    );

    const items = paged.map((a) => {
      let primaryTagName = "";
      if (a.primary_tag_id && tagById[a.primary_tag_id]) {
        primaryTagName = tagById[a.primary_tag_id].name;
      } else if (Array.isArray(a.tag_ids) && a.tag_ids.length > 0) {
        const t = tagById[a.tag_ids[0]];
        primaryTagName = t ? t.name : "";
      }
      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        summary: a.summary || "",
        thumbnail_image_url: a.thumbnail_image_url || null,
        hero_image_url: a.hero_image_url || null,
        published_at: a.published_at || null,
        year: a.year,
        popularity_score: a.popularity_score != null ? a.popularity_score : null,
        primary_tag_name: primaryTagName,
        bookmarked: bookmarkedSet.has(a.id)
      };
    });

    const sort_options = [
      { value: "most_popular", label: "Most popular" },
      { value: "newest_first", label: "Newest first" }
    ];

    return {
      items,
      total_count: totalCount,
      applied_filters: {
        tag_slug: f.tag_slug || null,
        year: f.year != null ? f.year : null
      },
      sort_options
    };
  }

  // =====================
  // Interface: getGuideFilterOptions
  // =====================

  getGuideFilterOptions() {
    const tags = this._getFromStorage("tags");
    const articles = this._getFromStorage("articles");

    const yearsSet = new Set();
    for (const a of articles) {
      if (a.year != null) yearsSet.add(a.year);
    }
    const years = Array.from(yearsSet).sort((a, b) => b - a);

    const sort_options = [
      { value: "most_popular", label: "Most popular" },
      { value: "newest_first", label: "Newest first" }
    ];

    return {
      tags,
      years,
      sort_options
    };
  }

  // =====================
  // Interface: getArticleDetail
  // =====================

  getArticleDetail(article_id) {
    const articles = this._getFromStorage("articles");
    const tags = this._getFromStorage("tags");
    const readingList = this._getReadingListStore();

    const article = articles.find((a) => a.id === article_id) || null;

    let primary_tag = null;
    const other_tags = [];

    if (article) {
      const tagById = {};
      for (const t of tags) {
        if (t && t.id) tagById[t.id] = t;
      }

      if (article.primary_tag_id && tagById[article.primary_tag_id]) {
        primary_tag = tagById[article.primary_tag_id];
      }
      if (Array.isArray(article.tag_ids)) {
        for (const tid of article.tag_ids) {
          const t = tagById[tid];
          if (!t) continue;
          if (primary_tag && t.id === primary_tag.id) continue;
          other_tags.push(t);
        }
      }
    }

    const is_bookmarked = readingList.some(
      (item) => item.content_type === "article" && item.content_id === article_id
    );

    // Instrumentation for task completion tracking
    try {
      if (article) {
        let isRoadTripArticle = false;

        // Check if primary_tag has slug 'road-trip'
        if (primary_tag && primary_tag.slug === "road-trip") {
          isRoadTripArticle = true;
        } else if (Array.isArray(article.tag_ids) && article.tag_ids.length > 0) {
          // Check any tag referenced in article.tag_ids for slug 'road-trip'
          for (const tid of article.tag_ids) {
            const tag = tags.find((t) => t && t.id === tid);
            if (tag && tag.slug === "road-trip") {
              isRoadTripArticle = true;
              break;
            }
          }
        }

        if (isRoadTripArticle) {
          let stored = localStorage.getItem("task9_roadTripArticleViews");
          let obj;
          try {
            obj = stored ? JSON.parse(stored) : null;
          } catch (_e) {
            obj = null;
          }
          if (!obj || typeof obj !== "object" || !Array.isArray(obj.viewed_article_ids)) {
            obj = { viewed_article_ids: [] };
          }
          if (obj.viewed_article_ids.indexOf(article_id) === -1) {
            obj.viewed_article_ids.push(article_id);
            localStorage.setItem("task9_roadTripArticleViews", JSON.stringify(obj));
          }
        }
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      article,
      primary_tag,
      other_tags,
      is_bookmarked
    };
  }

  // =====================
  // Interface: postComment
  // =====================

  postComment(content_type, content_id, author_name, text) {
    const comments = this._getFromStorage("comments");
    const comment = {
      id: this._generateId("comment"),
      content_type,
      content_id,
      author_name,
      text,
      created_at: this._now()
    };
    comments.push(comment);
    this._saveToStorage("comments", comments);
    return comment;
  }

  // =====================
  // Interface: getCommentsForContent
  // =====================

  getCommentsForContent(content_type, content_id) {
    const comments = this._getFromStorage("comments").filter(
      (c) => c.content_type === content_type && c.content_id === content_id
    );

    const reviews = this._getFromStorage("vehicle_reviews");
    const articles = this._getFromStorage("articles");

    return comments.map((c) => {
      let content = null;
      if (c.content_type === "vehicle_review") {
        content = reviews.find((r) => r.id === c.content_id) || null;
      } else if (c.content_type === "article") {
        content = articles.find((a) => a.id === c.content_id) || null;
      }
      return Object.assign({}, c, { content });
    });
  }

  // =====================
  // Interface: createShareActionCopyLink
  // =====================

  createShareActionCopyLink(content_type, content_id) {
    const reviews = this._getFromStorage("vehicle_reviews");
    const articles = this._getFromStorage("articles");

    let url = "";
    let content = null;

    if (content_type === "vehicle_review") {
      const r = reviews.find((x) => x.id === content_id);
      content = r || null;
      if (r && r.slug) {
        url = "/vehicles/" + r.slug;
      }
    } else if (content_type === "article") {
      const a = articles.find((x) => x.id === content_id);
      content = a || null;
      if (a && a.slug) {
        url = "/articles/" + a.slug;
      }
    }

    const share = {
      id: this._generateId("share_action"),
      content_type,
      content_id,
      method: "copy_link",
      url,
      created_at: this._now()
    };

    const actions = this._getFromStorage("share_actions");
    actions.push(share);
    this._saveToStorage("share_actions", actions);

    return Object.assign({}, share, { content });
  }

  // =====================
  // Interface: subscribeToNewsletterFromArticle
  // =====================

  subscribeToNewsletterFromArticle(name, email, article_id) {
    const subscriptions = this._getFromStorage("newsletter_subscriptions");
    const sub = {
      id: this._generateId("newsletter_subscription"),
      name,
      email,
      source_type: "article",
      source_article_id: article_id,
      created_at: this._now()
    };
    subscriptions.push(sub);
    this._saveToStorage("newsletter_subscriptions", subscriptions);

    const articles = this._getFromStorage("articles");
    const article = articles.find((a) => a.id === article_id) || null;

    return Object.assign({}, sub, { source_article: article });
  }

  // =====================
  // Interface: getInformationalPageContent
  // =====================

  getInformationalPageContent(page_slug) {
    const pages = this._getFromStorage("informational_pages");
    const page = pages.find((p) => p.slug === page_slug);
    if (page) {
      return {
        slug: page.slug,
        title: page.title || "",
        content_html: page.content_html || "",
        last_updated: page.last_updated || ""
      };
    }
    // If not found, return minimal structure without mocking content
    return {
      slug: page_slug,
      title: "",
      content_html: "",
      last_updated: ""
    };
  }

  // =====================
  // Interface: submitContactForm
  // =====================

  submitContactForm(name, email, subject, message) {
    const messages = this._getFromStorage("contact_messages");
    const ticketId = this._generateId("contact");
    const record = {
      id: ticketId,
      name,
      email,
      subject,
      message,
      created_at: this._now()
    };
    messages.push(record);
    this._saveToStorage("contact_messages", messages);

    return {
      success: true,
      message: "Your message has been submitted.",
      ticket_id: ticketId
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