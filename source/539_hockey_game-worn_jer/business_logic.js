// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    const keys = [
      "teams",
      "articles",
      "comments",
      "listings",
      "events",
      "rsvps",
      "profiles",
      "notes",
      "lists",
      "list_items",
      "direct_messages",
      "contact_messages"
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }

    if (!localStorage.getItem("current_username")) {
      localStorage.setItem("current_username", "");
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
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _nowISOString() {
    return new Date().toISOString();
  }

  _findTeamById(teamId) {
    if (!teamId) return null;
    const teams = this._getFromStorage("teams");
    return teams.find((t) => t.id === teamId) || null;
  }

  _getTeamName(teamId) {
    const team = this._findTeamById(teamId);
    return team ? team.name : null;
  }

  _attachTeamInfoToArticle(article) {
    if (!article) return null;
    const team = this._findTeamById(article.team_id);
    return Object.assign({}, article, {
      team_name: team ? team.name : article.team_name || null,
      league: article.league || (team ? team.league : null),
      team: team || null
    });
  }

  _attachTeamInfoToListing(listing) {
    if (!listing) return null;
    const team = this._findTeamById(listing.team_id);
    return Object.assign({}, listing, {
      team_name: team ? team.name : listing.team_name || null,
      league: listing.league || (team ? team.league : null),
      team: team || null
    });
  }

  _getCurrentUsername() {
    return localStorage.getItem("current_username") || "";
  }

  _setCurrentUsername(username) {
    localStorage.setItem("current_username", username || "");
  }

  _getOrCreateProfile(username) {
    let profiles = this._getFromStorage("profiles");
    let profile = profiles.find((p) => p.username === username);
    if (!profile) {
      profile = {
        id: this._generateId("profile"),
        username: username,
        favorite_team_id: null,
        preferred_era: null,
        typical_budget: null,
        notify_new_marketplace_posts: false,
        notify_authentication_guides: false
      };
      profiles.push(profile);
      this._saveToStorage("profiles", profiles);
    }
    const team = this._findTeamById(profile.favorite_team_id);
    return Object.assign({}, profile, {
      favorite_team: team || null,
      favorite_team_name: team ? team.name : null
    });
  }

  _getOrCreateSystemList(type, defaultName) {
    let lists = this._getFromStorage("lists");
    let list = lists.find((l) => l.type === type && l.is_system === true);
    if (!list) {
      list = {
        id: this._generateId("list"),
        name: defaultName,
        type: type,
        is_system: true,
        created_at: this._nowISOString(),
        updated_at: this._nowISOString()
      };
      lists.push(list);
      this._saveToStorage("lists", lists);
    }
    return list;
  }

  _addItemToList(listId, itemType, itemId) {
    let listItems = this._getFromStorage("list_items");
    const existing = listItems.find(
      (li) => li.list_id === listId && li.item_type === itemType && li.item_id === itemId
    );
    if (existing) {
      return existing;
    }
    const listItem = {
      id: this._generateId("listitem"),
      list_id: listId,
      item_type: itemType,
      item_id: itemId,
      added_at: this._nowISOString()
    };
    listItems.push(listItem);
    this._saveToStorage("list_items", listItems);

    let lists = this._getFromStorage("lists");
    const list = lists.find((l) => l.id === listId);
    if (list) {
      list.updated_at = this._nowISOString();
      this._saveToStorage("lists", lists);
    }

    return listItem;
  }

  _removeItemFromListById(listItemId) {
    let listItems = this._getFromStorage("list_items");
    const idx = listItems.findIndex((li) => li.id === listItemId);
    if (idx === -1) return false;
    listItems.splice(idx, 1);
    this._saveToStorage("list_items", listItems);
    return true;
  }

  _filterAndSortArticles(articles, filters, sort) {
    let items = (articles || []).slice();
    const f = filters || {};

    if (f.category) {
      const cat = String(f.category).toLowerCase();
      items = items.filter((a) => (a.category || "").toLowerCase() === cat);
    }
    if (f.topic) {
      const topic = String(f.topic).toLowerCase();
      items = items.filter((a) => (a.topic || "").toLowerCase() === topic);
    }
    if (f.league) {
      const league = String(f.league).toLowerCase();
      items = items.filter((a) => {
        const team = this._findTeamById(a.team_id);
        const articleLeague = (a.league || (team ? team.league : null) || "").toLowerCase();
        return articleLeague === league;
      });
    }
    if (f.contentType) {
      const ct = String(f.contentType).toLowerCase();
      items = items.filter((a) => (a.content_type || "").toLowerCase() === ct);
    }
    if (f.publishedFrom) {
      const fromTs = Date.parse(f.publishedFrom);
      if (!isNaN(fromTs)) {
        items = items.filter((a) => Date.parse(a.published_at) >= fromTs);
      }
    }
    if (f.publishedTo) {
      const toTs = Date.parse(f.publishedTo);
      if (!isNaN(toTs)) {
        items = items.filter((a) => Date.parse(a.published_at) <= toTs);
      }
    }
    if (typeof f.minCommentCount === "number") {
      items = items.filter((a) => (a.comment_count || 0) >= f.minCommentCount);
    }
    if (typeof f.minEstimatedPrice === "number") {
      items = items.filter(
        (a) => typeof a.estimated_price === "number" && a.estimated_price >= f.minEstimatedPrice
      );
    }
    if (typeof f.maxEstimatedPrice === "number") {
      items = items.filter(
        (a) => typeof a.estimated_price === "number" && a.estimated_price <= f.maxEstimatedPrice
      );
    }
    if (f.playerName) {
      const pn = String(f.playerName).toLowerCase();
      items = items.filter((a) => (a.player_name || "").toLowerCase().indexOf(pn) !== -1);
    }
    if (Array.isArray(f.tags) && f.tags.length > 0) {
      const wanted = f.tags.map((t) => String(t).toLowerCase());
      items = items.filter((a) => {
        const tags = Array.isArray(a.tags)
          ? a.tags.map((t) => String(t).toLowerCase())
          : [];
        return wanted.every((w) => tags.indexOf(w) !== -1);
      });
    }

    switch (sort) {
      case "price_low_to_high":
        items.sort((a, b) => {
          const ap = typeof a.estimated_price === "number" ? a.estimated_price : Infinity;
          const bp = typeof b.estimated_price === "number" ? b.estimated_price : Infinity;
          return ap - bp;
        });
        break;
      case "price_high_to_low":
        items.sort((a, b) => {
          const ap = typeof a.estimated_price === "number" ? a.estimated_price : -Infinity;
          const bp = typeof b.estimated_price === "number" ? b.estimated_price : -Infinity;
          return bp - ap;
        });
        break;
      case "most_commented":
        items.sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0));
        break;
      case "newest":
        items.sort(
          (a, b) => Date.parse(b.published_at || 0) - Date.parse(a.published_at || 0)
        );
        break;
      case "oldest_first":
        items.sort(
          (a, b) => Date.parse(a.published_at || 0) - Date.parse(b.published_at || 0)
        );
        break;
      case "user_rating_high_to_low":
        items.sort((a, b) => (b.user_rating || 0) - (a.user_rating || 0));
        break;
      default:
        break;
    }

    return items;
  }

  _filterAndSortListings(listings, filters, sort) {
    let items = (listings || []).slice();
    const f = filters || {};

    if (f.jerseyType) {
      const jt = String(f.jerseyType).toLowerCase();
      items = items.filter((l) => (l.jersey_type || "").toLowerCase() === jt);
    }
    if (f.position) {
      const pos = String(f.position).toLowerCase();
      items = items.filter((l) => (l.position || "").toLowerCase() === pos);
    }
    if (typeof f.minPrice === "number") {
      items = items.filter((l) => typeof l.price === "number" && l.price >= f.minPrice);
    }
    if (typeof f.maxPrice === "number") {
      items = items.filter((l) => typeof l.price === "number" && l.price <= f.maxPrice);
    }
    if (Array.isArray(f.leagues) && f.leagues.length > 0) {
      const leagues = f.leagues.map((x) => String(x).toLowerCase());
      items = items.filter((l) => {
        const team = this._findTeamById(l.team_id);
        const listingLeague = (l.league || (team ? team.league : null) || "").toLowerCase();
        return leagues.indexOf(listingLeague) !== -1;
      });
    }
    if (Array.isArray(f.eras) && f.eras.length > 0) {
      const eras = f.eras.map((e) => String(e));
      items = items.filter((l) => eras.indexOf(l.era) !== -1);
    }

    switch (sort) {
      case "most_commented":
        items.sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0));
        break;
      case "newest":
        items.sort(
          (a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0)
        );
        break;
      case "price_low_to_high":
        items.sort((a, b) => {
          const ap = typeof a.price === "number" ? a.price : Infinity;
          const bp = typeof b.price === "number" ? b.price : Infinity;
          return ap - bp;
        });
        break;
      case "price_high_to_low":
        items.sort((a, b) => {
          const ap = typeof a.price === "number" ? a.price : -Infinity;
          const bp = typeof b.price === "number" ? b.price : -Infinity;
          return bp - ap;
        });
        break;
      default:
        break;
    }

    return items;
  }

  _resolveLocationToCoordinates(locationText) {
    if (!locationText) return null;
    const text = String(locationText).trim().toLowerCase();
    const map = {
      chicago: { latitude: 41.8781, longitude: -87.6298 }
    };
    return map[text] || null;
  }

  _calculateDistanceMiles(lat1, lon1, lat2, lon2) {
    function toRad(v) {
      return (v * Math.PI) / 180;
    }
    const R = 3958.8;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _searchIndex(query) {
    const q = query ? String(query).trim().toLowerCase() : "";
    const results = [];
    const includeAll = !q;

    const articles = this._getFromStorage("articles");
    const listings = this._getFromStorage("listings");
    const events = this._getFromStorage("events");
    const teams = this._getFromStorage("teams");

    const findTeamNameById = (teamId) => {
      const t = teams.find((tt) => tt.id === teamId);
      return t ? t.name : null;
    };

    if (includeAll || articles.length) {
      articles.forEach((a) => {
        const haystack = [
          a.title || "",
          a.content || "",
          a.category || "",
          a.topic || "",
          a.player_name || "",
          Array.isArray(a.tags) ? a.tags.join(" ") : ""
        ]
          .join(" ")
          .toLowerCase();
        if (includeAll || haystack.indexOf(q) !== -1) {
          results.push({
            id: a.id,
            type: "article",
            title: a.title,
            snippet: (a.content || "").substring(0, 200),
            section: a.section,
            content_type: a.content_type,
            league: a.league,
            team_name: findTeamNameById(a.team_id),
            estimated_price: a.estimated_price,
            price: null,
            start_datetime: null,
            url: a.url
          });
        }
      });
    }

    if (includeAll || listings.length) {
      listings.forEach((l) => {
        const teamName = findTeamNameById(l.team_id);
        const haystack = [
          l.title || "",
          l.description || "",
          teamName || "",
          Array.isArray(l.tags) ? l.tags.join(" ") : ""
        ]
          .join(" ")
          .toLowerCase();
        if (includeAll || haystack.indexOf(q) !== -1) {
          results.push({
            id: l.id,
            type: "listing",
            title: l.title,
            snippet: (l.description || "").substring(0, 200),
            section: "marketplace",
            content_type: null,
            league: l.league,
            team_name: teamName,
            estimated_price: null,
            price: l.price,
            start_datetime: null,
            url: "/listings/" + l.id
          });
        }
      });
    }

    if (includeAll || events.length) {
      events.forEach((ev) => {
        const haystack = [
          ev.title || "",
          ev.description || "",
          ev.location_name || "",
          ev.location_city || "",
          ev.location_state || "",
          ev.location_country || ""
        ]
          .join(" ")
          .toLowerCase();
        if (includeAll || haystack.indexOf(q) !== -1) {
          results.push({
            id: ev.id,
            type: "event",
            title: ev.title,
            snippet: (ev.description || "").substring(0, 200),
            section: "events",
            content_type: null,
            league: null,
            team_name: null,
            estimated_price: null,
            price: null,
            start_datetime: ev.start_datetime,
            url: "/events/" + ev.id
          });
        }
      });
    }

    return { results, total: results.length };
  }

  // signIn(username, password)
  signIn(username, password) {
    const expectedUsername = "testcollector";
    const expectedPassword = "Password123!";
    if (username !== expectedUsername || password !== expectedPassword) {
      return {
        success: false,
        message: "Invalid username or password",
        profile: null
      };
    }

    this._setCurrentUsername(username);
    const profile = this._getOrCreateProfile(username);

    return {
      success: true,
      message: "Signed in successfully",
      profile: {
        username: profile.username,
        favorite_team_id: profile.favorite_team_id,
        favorite_team_name: profile.favorite_team ? profile.favorite_team.name : null,
        favorite_team: profile.favorite_team || null,
        preferred_era: profile.preferred_era,
        typical_budget: profile.typical_budget,
        notify_new_marketplace_posts: profile.notify_new_marketplace_posts,
        notify_authentication_guides: profile.notify_authentication_guides
      }
    };
  }

  // getHomepageFeaturedContent()
  getHomepageFeaturedContent() {
    const articlesRaw = this._getFromStorage("articles");
    const listingsRaw = this._getFromStorage("listings");
    const eventsRaw = this._getFromStorage("events");

    const featuredArticles = articlesRaw
      .slice()
      .sort(
        (a, b) => Date.parse(b.published_at || 0) - Date.parse(a.published_at || 0)
      )
      .slice(0, 10)
      .map((a) => {
        const withTeam = this._attachTeamInfoToArticle(a);
        return {
          id: withTeam.id,
          title: withTeam.title,
          section: withTeam.section,
          content_type: withTeam.content_type,
          category: withTeam.category,
          league: withTeam.league,
          team_name: withTeam.team_name,
          team: withTeam.team || null,
          estimated_price: withTeam.estimated_price,
          published_at: withTeam.published_at,
          comment_count: withTeam.comment_count,
          user_rating: withTeam.user_rating,
          url: withTeam.url
        };
      });

    const featuredListings = listingsRaw
      .slice()
      .sort((a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0))
      .slice(0, 10)
      .map((l) => {
        const withTeam = this._attachTeamInfoToListing(l);
        return {
          id: withTeam.id,
          title: withTeam.title,
          team_name: withTeam.team_name,
          team: withTeam.team || null,
          league: withTeam.league,
          era: withTeam.era,
          price: withTeam.price,
          currency: withTeam.currency,
          position: withTeam.position,
          jersey_type: withTeam.jersey_type,
          created_at: withTeam.created_at,
          image_url: withTeam.image_url
        };
      });

    const nowTs = Date.now();
    const upcomingEvents = eventsRaw
      .filter((ev) => Date.parse(ev.start_datetime || 0) >= nowTs)
      .sort((a, b) => Date.parse(a.start_datetime || 0) - Date.parse(b.start_datetime || 0))
      .slice(0, 10)
      .map((ev) => ({
        id: ev.id,
        title: ev.title,
        start_datetime: ev.start_datetime,
        location_city: ev.location_city,
        location_state: ev.location_state,
        location_country: ev.location_country
      }));

    return {
      featuredArticles,
      featuredListings,
      upcomingEvents
    };
  }

  // searchSite(query, filters, sort)
  searchSite(query, filters, sort) {
    const base = this._searchIndex(query || "");
    let results = base.results.slice();
    const f = filters || {};

    if (f.contentTypes && Array.isArray(f.contentTypes) && f.contentTypes.length > 0) {
      const allowed = f.contentTypes.map((ct) => String(ct).toLowerCase());
      results = results.filter((r) => {
        if (r.type === "article") {
          const ct = (r.content_type || "").toLowerCase();
          return allowed.indexOf(ct) !== -1;
        }
        if (r.type === "listing") {
          return allowed.indexOf("listing") !== -1;
        }
        if (r.type === "event") {
          return allowed.indexOf("event") !== -1;
        }
        return false;
      });
    }

    if (f.section) {
      const sec = String(f.section).toLowerCase();
      results = results.filter((r) => (r.section || "").toLowerCase() === sec);
    }

    if (f.league) {
      const league = String(f.league).toLowerCase();
      results = results.filter((r) => (r.league || "").toLowerCase() === league);
    }

    if (typeof f.minPrice === "number") {
      results = results.filter((r) => {
        const price = r.type === "article" ? r.estimated_price : r.price;
        return typeof price === "number" && price >= f.minPrice;
      });
    }

    if (typeof f.maxPrice === "number") {
      results = results.filter((r) => {
        const price = r.type === "article" ? r.estimated_price : r.price;
        return typeof price === "number" && price <= f.maxPrice;
      });
    }

    if (f.dateFrom) {
      const fromTs = Date.parse(f.dateFrom);
      if (!isNaN(fromTs)) {
        results = results.filter((r) => {
          const dateStr = r.type === "event" ? r.start_datetime : null;
          if (!dateStr) return true;
          return Date.parse(dateStr) >= fromTs;
        });
      }
    }

    if (f.dateTo) {
      const toTs = Date.parse(f.dateTo);
      if (!isNaN(toTs)) {
        results = results.filter((r) => {
          const dateStr = r.type === "event" ? r.start_datetime : null;
          if (!dateStr) return true;
          return Date.parse(dateStr) <= toTs;
        });
      }
    }

    switch (sort) {
      case "newest":
        results.sort((a, b) => {
          const da = a.type === "event" ? a.start_datetime : null;
          const db = b.type === "event" ? b.start_datetime : null;
          return Date.parse(db || 0) - Date.parse(da || 0);
        });
        break;
      case "oldest_first":
        results.sort((a, b) => {
          const da = a.type === "event" ? a.start_datetime : null;
          const db = b.type === "event" ? b.start_datetime : null;
          return Date.parse(da || 0) - Date.parse(db || 0);
        });
        break;
      case "price_low_to_high":
        results.sort((a, b) => {
          const pa = a.type === "article" ? a.estimated_price : a.price;
          const pb = b.type === "article" ? b.estimated_price : b.price;
          const ap = typeof pa === "number" ? pa : Infinity;
          const bp = typeof pb === "number" ? pb : Infinity;
          return ap - bp;
        });
        break;
      case "price_high_to_low":
        results.sort((a, b) => {
          const pa = a.type === "article" ? a.estimated_price : a.price;
          const pb = b.type === "article" ? b.estimated_price : b.price;
          const ap = typeof pa === "number" ? pa : -Infinity;
          const bp = typeof pb === "number" ? pb : -Infinity;
          return bp - ap;
        });
        break;
      case "relevance":
      default:
        break;
    }

    return {
      results,
      total: results.length
    };
  }

  // getTeamsDirectory()
  getTeamsDirectory() {
    const teams = this._getFromStorage("teams");
    const leagueLabelMap = {
      nhl: "NHL",
      ahl: "AHL",
      khl: "KHL",
      ncaa: "NCAA",
      other: "Other"
    };
    const grouped = {};
    teams.forEach((t) => {
      const league = t.league || "other";
      if (!grouped[league]) {
        grouped[league] = [];
      }
      grouped[league].push({
        id: t.id,
        name: t.name,
        location_city: t.location_city || null,
        location_country: t.location_country || null
      });
    });
    const leagues = Object.keys(grouped)
      .sort()
      .map((league) => ({
        league: league,
        league_label: leagueLabelMap[league] || league.toUpperCase(),
        teams: grouped[league]
      }));
    return { leagues };
  }

  // getTeamArticleFilterOptions(teamId)
  getTeamArticleFilterOptions(teamId) {
    const articles = this._getFromStorage("articles").filter((a) => a.team_id === teamId);
    const categoriesSet = {};
    articles.forEach((a) => {
      if (a.category) {
        categoriesSet[a.category] = true;
      }
    });
    const categories = Object.keys(categoriesSet).map((c) => ({ value: c, label: c }));

    const priceRanges = [
      { min: 0, max: 199, label: "Under $200" },
      { min: 200, max: 499, label: "$200 - $499" },
      { min: 500, max: 999, label: "$500 - $999" },
      { min: 1000, max: null, label: "$1000+" }
    ];

    const sortOptions = [
      { value: "price_low_to_high", label: "Price: Low to High" },
      { value: "price_high_to_low", label: "Price: High to Low" },
      { value: "most_commented", label: "Most Commented" },
      { value: "newest", label: "Newest" },
      { value: "oldest_first", label: "Oldest First" }
    ];

    return {
      categories,
      priceRanges,
      sortOptions
    };
  }

  // getTeamArticles(teamId, filters, sort, page, pageSize)
  getTeamArticles(teamId, filters, sort, page, pageSize) {
    const allArticles = this._getFromStorage("articles").filter((a) => a.team_id === teamId);
    const filtered = this._filterAndSortArticles(allArticles, filters, sort);
    const total = filtered.length;
    const pg = typeof page === "number" && page > 0 ? page : 1;
    const ps = typeof pageSize === "number" && pageSize > 0 ? pageSize : total;
    const start = (pg - 1) * ps;
    const itemsPage = filtered.slice(start, start + ps).map((a) => {
      const withTeam = this._attachTeamInfoToArticle(a);
      return {
        id: withTeam.id,
        title: withTeam.title,
        category: withTeam.category,
        topic: withTeam.topic,
        league: withTeam.league,
        team_name: withTeam.team_name,
        team: withTeam.team || null,
        estimated_price: withTeam.estimated_price,
        published_at: withTeam.published_at,
        comment_count: withTeam.comment_count,
        user_rating: withTeam.user_rating,
        url: withTeam.url
      };
    });

    return {
      items: itemsPage,
      total: total
    };
  }

  // getArticlesIndexFilters(section)
  getArticlesIndexFilters(section) {
    const sec = section;
    const articles = this._getFromStorage("articles").filter((a) => a.section === sec);
    const categoriesSet = {};
    const topicsSet = {};
    const leaguesSet = {};
    const contentTypesSet = {};

    articles.forEach((a) => {
      if (a.category) categoriesSet[a.category] = true;
      if (a.topic) topicsSet[a.topic] = true;
      const league = a.league || (this._findTeamById(a.team_id) || {}).league;
      if (league) leaguesSet[league] = true;
      if (a.content_type) contentTypesSet[a.content_type] = true;
    });

    const categories = Object.keys(categoriesSet).map((v) => ({ value: v, label: v }));
    const topics = Object.keys(topicsSet).map((v) => ({ value: v, label: v }));
    const leagues = Object.keys(leaguesSet).map((v) => ({ value: v, label: v.toUpperCase() }));
    const contentTypes = Object.keys(contentTypesSet).map((v) => ({ value: v, label: v }));

    const sortOptions = [
      { value: "most_commented", label: "Most Commented" },
      { value: "newest", label: "Newest" },
      { value: "oldest_first", label: "Oldest First" },
      { value: "user_rating_high_to_low", label: "User Rating: High to Low" }
    ];

    return {
      categories,
      topics,
      leagues,
      contentTypes,
      sortOptions
    };
  }

  // getArticles(section, filters, sort, page, pageSize)
  getArticles(section, filters, sort, page, pageSize) {
    const allArticles = this._getFromStorage("articles").filter((a) => a.section === section);
    const filtered = this._filterAndSortArticles(allArticles, filters, sort);
    const total = filtered.length;
    const pg = typeof page === "number" && page > 0 ? page : 1;
    const ps = typeof pageSize === "number" && pageSize > 0 ? pageSize : total;
    const start = (pg - 1) * ps;
    const itemsPage = filtered.slice(start, start + ps).map((a) => {
      const withTeam = this._attachTeamInfoToArticle(a);
      return {
        id: withTeam.id,
        title: withTeam.title,
        section: withTeam.section,
        content_type: withTeam.content_type,
        category: withTeam.category,
        topic: withTeam.topic,
        league: withTeam.league,
        team_name: withTeam.team_name,
        team: withTeam.team || null,
        player_name: withTeam.player_name,
        estimated_price: withTeam.estimated_price,
        published_at: withTeam.published_at,
        comment_count: withTeam.comment_count,
        user_rating: withTeam.user_rating,
        url: withTeam.url
      };
    });

    return {
      items: itemsPage,
      total: total
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage("articles");
    const article = articles.find((a) => a.id === articleId);
    if (!article) return null;

    const withTeam = this._attachTeamInfoToArticle(article);

    const lists = this._getFromStorage("lists");
    const listItems = this._getFromStorage("list_items");

    let is_in_reading_list = false;
    let is_favorited = false;
    const collection_ids = [];

    listItems.forEach((li) => {
      if (li.item_type === "article" && li.item_id === articleId) {
        const list = lists.find((l) => l.id === li.list_id);
        if (!list) return;
        if (list.type === "reading_list" && list.is_system) {
          is_in_reading_list = true;
        } else if (list.type === "favorites" && list.is_system) {
          is_favorited = true;
        } else if (list.type === "collection") {
          collection_ids.push(list.id);
        }
      }
    });

    return {
      id: withTeam.id,
      title: withTeam.title,
      slug: withTeam.slug,
      section: withTeam.section,
      content_type: withTeam.content_type,
      category: withTeam.category,
      topic: withTeam.topic,
      team_name: withTeam.team_name,
      team: withTeam.team || null,
      league: withTeam.league,
      player_name: withTeam.player_name,
      estimated_price: withTeam.estimated_price,
      content: withTeam.content,
      tags: withTeam.tags || [],
      published_at: withTeam.published_at,
      comment_count: withTeam.comment_count,
      user_rating: withTeam.user_rating,
      url: withTeam.url,
      is_in_reading_list: is_in_reading_list,
      is_favorited: is_favorited,
      collection_ids: collection_ids
    };
  }

  // getArticleComments(articleId, sort, page, pageSize)
  getArticleComments(articleId, sort, page, pageSize) {
    const allComments = this._getFromStorage("comments").filter(
      (c) => c.article_id === articleId
    );
    let comments = allComments.slice();

    switch (sort) {
      case "oldest":
        comments.sort(
          (a, b) => Date.parse(a.created_at || 0) - Date.parse(b.created_at || 0)
        );
        break;
      case "newest":
      default:
        comments.sort(
          (a, b) => Date.parse(b.created_at || 0) - Date.parse(a.created_at || 0)
        );
        break;
    }

    const articles = this._getFromStorage("articles");
    const articleMeta = articles.find((a) => a.id === articleId) || null;
    const total =
      articleMeta && typeof articleMeta.comment_count === "number"
        ? articleMeta.comment_count
        : comments.length;
    const pg = typeof page === "number" && page > 0 ? page : 1;
    const ps = typeof pageSize === "number" && pageSize > 0 ? pageSize : total;
    const start = (pg - 1) * ps;
    const commentsPage = comments.slice(start, start + ps).map((c) => {
      const article = articles.find((a) => a.id === c.article_id) || null;
      return {
        id: c.id,
        author_name: c.author_name,
        body: c.body,
        created_at: c.created_at,
        notify_replies: c.notify_replies,
        article: article
      };
    });

    return {
      comments: commentsPage,
      total: total
    };
  }

  // postArticleComment(articleId, authorName, body, notifyReplies)
  postArticleComment(articleId, authorName, body, notifyReplies) {
    const articles = this._getFromStorage("articles");
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        comment: null,
        new_comment_count: 0,
        message: "Article not found"
      };
    }

    const comments = this._getFromStorage("comments");
    const comment = {
      id: this._generateId("comment"),
      article_id: articleId,
      author_name: authorName,
      body: body,
      created_at: this._nowISOString(),
      notify_replies: !!notifyReplies
    };
    comments.push(comment);
    this._saveToStorage("comments", comments);

    article.comment_count = (article.comment_count || 0) + 1;
    this._saveToStorage("articles", articles);

    return {
      success: true,
      comment: {
        id: comment.id,
        author_name: comment.author_name,
        body: comment.body,
        created_at: comment.created_at,
        notify_replies: comment.notify_replies
      },
      new_comment_count: article.comment_count,
      message: "Comment posted"
    };
  }

  // addArticleToReadingList(articleId)
  addArticleToReadingList(articleId) {
    const articles = this._getFromStorage("articles");
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        list_id: null,
        list_item_id: null,
        message: "Article not found"
      };
    }

    const list = this._getOrCreateSystemList("reading_list", "Reading List");
    const listItem = this._addItemToList(list.id, "article", articleId);

    return {
      success: true,
      list_id: list.id,
      list_item_id: listItem.id,
      message: "Article added to Reading List"
    };
  }

  // addArticleToFavorites(articleId)
  addArticleToFavorites(articleId) {
    const articles = this._getFromStorage("articles");
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        list_id: null,
        list_item_id: null,
        message: "Article not found"
      };
    }

    const list = this._getOrCreateSystemList("favorites", "Favorites");
    const listItem = this._addItemToList(list.id, "article", articleId);

    return {
      success: true,
      list_id: list.id,
      list_item_id: listItem.id,
      message: "Article added to Favorites"
    };
  }

  // getUserCollections()
  getUserCollections() {
    const lists = this._getFromStorage("lists");
    const listItems = this._getFromStorage("list_items");
    const collectionsRaw = lists.filter((l) => l.type === "collection");
    const collections = collectionsRaw.map((c) => {
      const count = listItems.filter((li) => li.list_id === c.id).length;
      return {
        id: c.id,
        name: c.name,
        created_at: c.created_at,
        updated_at: c.updated_at,
        item_count: count
      };
    });
    return { collections };
  }

  // createCollection(name)
  createCollection(name) {
    let lists = this._getFromStorage("lists");
    const now = this._nowISOString();
    const collection = {
      id: this._generateId("list"),
      name: name,
      type: "collection",
      is_system: false,
      created_at: now,
      updated_at: now
    };
    lists.push(collection);
    this._saveToStorage("lists", lists);

    return {
      success: true,
      collection: {
        id: collection.id,
        name: collection.name,
        created_at: collection.created_at,
        updated_at: collection.updated_at,
        item_count: 0
      },
      message: "Collection created"
    };
  }

  // saveArticleToCollection(articleId, collectionId)
  saveArticleToCollection(articleId, collectionId) {
    const articles = this._getFromStorage("articles");
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        list_item_id: null,
        message: "Article not found"
      };
    }

    const lists = this._getFromStorage("lists");
    const collection = lists.find((l) => l.id === collectionId && l.type === "collection");
    if (!collection) {
      return {
        success: false,
        list_item_id: null,
        message: "Collection not found"
      };
    }

    const listItem = this._addItemToList(collection.id, "article", articleId);

    return {
      success: true,
      list_item_id: listItem.id,
      message: "Article saved to collection"
    };
  }

  // sendArticleAsDirectMessage(articleId, toUsername, messageText)
  sendArticleAsDirectMessage(articleId, toUsername, messageText) {
    const articles = this._getFromStorage("articles");
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        direct_message_id: null,
        sent_at: null,
        message: "Article not found"
      };
    }

    const directMessages = this._getFromStorage("direct_messages");
    const sent_at = this._nowISOString();
    const dm = {
      id: this._generateId("dm"),
      to_username: toUsername,
      message_text: messageText,
      article_id: articleId,
      listing_id: null,
      sent_at: sent_at
    };
    directMessages.push(dm);
    this._saveToStorage("direct_messages", directMessages);

    return {
      success: true,
      direct_message_id: dm.id,
      sent_at: sent_at,
      message: "Direct message sent"
    };
  }

  // getMarketplaceFilterOptions()
  getMarketplaceFilterOptions() {
    const jerseyTypes = [
      { value: "game_worn", label: "Game-Worn" },
      { value: "replica", label: "Replica" },
      { value: "other", label: "Other" }
    ];
    const positions = [
      { value: "goalie", label: "Goalie" },
      { value: "forward", label: "Forward" },
      { value: "defense", label: "Defense" },
      { value: "other", label: "Other" }
    ];
    const leagues = [
      { value: "nhl", label: "NHL" },
      { value: "ahl", label: "AHL" },
      { value: "khl", label: "KHL" },
      { value: "ncaa", label: "NCAA" },
      { value: "other", label: "Other" }
    ];
    const eras = [
      { value: "1970s", label: "1970s" },
      { value: "1980s", label: "1980s" },
      { value: "1990s", label: "1990s" },
      { value: "2000s", label: "2000s" },
      { value: "2010s", label: "2010s" },
      { value: "2020s", label: "2020s" }
    ];
    const sortOptions = [
      { value: "most_commented", label: "Most Commented" },
      { value: "newest", label: "Newest" },
      { value: "price_low_to_high", label: "Price: Low to High" },
      { value: "price_high_to_low", label: "Price: High to Low" }
    ];
    const priceRanges = [
      { min: 0, max: 99, label: "Under $100" },
      { min: 100, max: 199, label: "$100 - $199" },
      { min: 200, max: 399, label: "$200 - $399" },
      { min: 400, max: 599, label: "$400 - $599" },
      { min: 600, max: null, label: "$600+" }
    ];

    return {
      jerseyTypes,
      positions,
      leagues,
      eras,
      sortOptions,
      priceRanges
    };
  }

  // getMarketplaceListings(filters, sort, page, pageSize)
  getMarketplaceListings(filters, sort, page, pageSize) {
    const listingsRaw = this._getFromStorage("listings");
    const filtered = this._filterAndSortListings(listingsRaw, filters, sort);
    const total = filtered.length;
    const pg = typeof page === "number" && page > 0 ? page : 1;
    const ps = typeof pageSize === "number" && pageSize > 0 ? pageSize : total;
    const start = (pg - 1) * ps;

    const lists = this._getFromStorage("lists");
    const listItems = this._getFromStorage("list_items");
    const watchlist = lists.find((l) => l.type === "watchlist" && l.is_system === true);
    const wishlist = lists.find((l) => l.type === "wishlist" && l.is_system === true);

    const pageItems = filtered.slice(start, start + ps).map((l) => {
      const withTeam = this._attachTeamInfoToListing(l);
      const is_in_watchlist = !!(
        watchlist &&
        listItems.find(
          (li) => li.list_id === watchlist.id && li.item_type === "listing" && li.item_id === l.id
        )
      );
      const is_in_wishlist = !!(
        wishlist &&
        listItems.find(
          (li) => li.list_id === wishlist.id && li.item_type === "listing" && li.item_id === l.id
        )
      );
      return {
        id: withTeam.id,
        title: withTeam.title,
        team_name: withTeam.team_name,
        team: withTeam.team || null,
        league: withTeam.league,
        era: withTeam.era,
        price: withTeam.price,
        currency: withTeam.currency,
        position: withTeam.position,
        jersey_type: withTeam.jersey_type,
        tags: withTeam.tags || [],
        comment_count: withTeam.comment_count,
        created_at: withTeam.created_at,
        image_url: withTeam.image_url,
        is_in_watchlist: is_in_watchlist,
        is_in_wishlist: is_in_wishlist
      };
    });

    return {
      items: pageItems,
      total: total
    };
  }

  // getListingDetail(listingId)
  getListingDetail(listingId) {
    const listings = this._getFromStorage("listings");
    const listing = listings.find((l) => l.id === listingId);
    if (!listing) return null;

    const withTeam = this._attachTeamInfoToListing(listing);

    const lists = this._getFromStorage("lists");
    const listItems = this._getFromStorage("list_items");
    const watchlist = lists.find((l) => l.type === "watchlist" && l.is_system === true);
    const wishlist = lists.find((l) => l.type === "wishlist" && l.is_system === true);

    const is_in_watchlist = !!(
      watchlist &&
      listItems.find(
        (li) => li.list_id === watchlist.id && li.item_type === "listing" && li.item_id === listingId
      )
    );
    const is_in_wishlist = !!(
      wishlist &&
      listItems.find(
        (li) => li.list_id === wishlist.id && li.item_type === "listing" && li.item_id === listingId
      )
    );

    return {
      id: withTeam.id,
      title: withTeam.title,
      description: withTeam.description,
      team_name: withTeam.team_name,
      team: withTeam.team || null,
      league: withTeam.league,
      era: withTeam.era,
      price: withTeam.price,
      currency: withTeam.currency,
      position: withTeam.position,
      jersey_type: withTeam.jersey_type,
      tags: withTeam.tags || [],
      comment_count: withTeam.comment_count,
      created_at: withTeam.created_at,
      image_url: withTeam.image_url,
      is_in_watchlist: is_in_watchlist,
      is_in_wishlist: is_in_wishlist
    };
  }

  // getSimilarListings(listingId)
  getSimilarListings(listingId) {
    const listings = this._getFromStorage("listings");
    const listing = listings.find((l) => l.id === listingId);
    if (!listing) {
      return { items: [] };
    }

    let similarIds = Array.isArray(listing.similar_listing_ids)
      ? listing.similar_listing_ids
      : [];
    let similarItems = listings.filter(
      (l) => similarIds.indexOf(l.id) !== -1 && l.id !== listingId
    );

    if (similarItems.length === 0) {
      similarItems = listings
        .filter(
          (l) =>
            l.id !== listingId && (l.team_id === listing.team_id || l.league === listing.league)
        )
        .slice(0, 10);
    }

    const items = similarItems.map((l) => {
      const withTeam = this._attachTeamInfoToListing(l);
      return {
        id: withTeam.id,
        title: withTeam.title,
        team_name: withTeam.team_name,
        team: withTeam.team || null,
        league: withTeam.league,
        era: withTeam.era,
        price: withTeam.price,
        currency: withTeam.currency,
        position: withTeam.position,
        jersey_type: withTeam.jersey_type,
        tags: withTeam.tags || [],
        image_url: withTeam.image_url
      };
    });

    return { items };
  }

  // addListingToWatchlist(listingId)
  addListingToWatchlist(listingId) {
    const listings = this._getFromStorage("listings");
    const listing = listings.find((l) => l.id === listingId);
    if (!listing) {
      return {
        success: false,
        list_id: null,
        list_item_id: null,
        message: "Listing not found"
      };
    }

    const list = this._getOrCreateSystemList("watchlist", "Watchlist");
    const listItem = this._addItemToList(list.id, "listing", listingId);

    return {
      success: true,
      list_id: list.id,
      list_item_id: listItem.id,
      message: "Listing added to Watchlist"
    };
  }

  // addListingToWishlist(listingId)
  addListingToWishlist(listingId) {
    const listings = this._getFromStorage("listings");
    const listing = listings.find((l) => l.id === listingId);
    if (!listing) {
      return {
        success: false,
        list_id: null,
        list_item_id: null,
        message: "Listing not found"
      };
    }

    const list = this._getOrCreateSystemList("wishlist", "Wishlist");
    const listItem = this._addItemToList(list.id, "listing", listingId);

    return {
      success: true,
      list_id: list.id,
      list_item_id: listItem.id,
      message: "Listing added to Wishlist"
    };
  }

  // getEvents(filters, sort, page, pageSize)
  getEvents(filters, sort, page, pageSize) {
    const eventsRaw = this._getFromStorage("events");
    const f = filters || {};
    let events = eventsRaw.slice();

    if (f.locationText) {
      const locText = String(f.locationText).toLowerCase();
      events = events.filter((ev) => {
        return (
          (ev.location_city && ev.location_city.toLowerCase().indexOf(locText) !== -1) ||
          (ev.location_state && ev.location_state.toLowerCase().indexOf(locText) !== -1) ||
          (ev.location_country && ev.location_country.toLowerCase().indexOf(locText) !== -1) ||
          (ev.location_name && ev.location_name.toLowerCase().indexOf(locText) !== -1)
        );
      });

      if (typeof f.radiusMiles === "number") {
        const center = this._resolveLocationToCoordinates(f.locationText);
        if (center) {
          events = events.filter((ev) => {
            if (
              typeof ev.latitude === "number" &&
              typeof ev.longitude === "number"
            ) {
              const dist = this._calculateDistanceMiles(
                center.latitude,
                center.longitude,
                ev.latitude,
                ev.longitude
              );
              return dist <= f.radiusMiles;
            }
            return true;
          });
        }
      }
    }

    if (f.dateFrom) {
      const fromTs = Date.parse(f.dateFrom);
      if (!isNaN(fromTs)) {
        events = events.filter((ev) => Date.parse(ev.start_datetime || 0) >= fromTs);
      }
    }

    if (f.dateTo) {
      const toTs = Date.parse(f.dateTo);
      if (!isNaN(toTs)) {
        events = events.filter((ev) => Date.parse(ev.start_datetime || 0) <= toTs);
      }
    }

    if (f.category) {
      const cat = String(f.category).toLowerCase();
      events = events.filter((ev) => (ev.category || "").toLowerCase() === cat);
    }

    switch (sort) {
      case "soonest_first":
        events.sort(
          (a, b) => Date.parse(a.start_datetime || 0) - Date.parse(b.start_datetime || 0)
        );
        break;
      case "newest":
        events.sort(
          (a, b) => Date.parse(b.start_datetime || 0) - Date.parse(a.start_datetime || 0)
        );
        break;
      case "oldest_first":
        events.sort(
          (a, b) => Date.parse(a.start_datetime || 0) - Date.parse(b.start_datetime || 0)
        );
        break;
      default:
        break;
    }

    const total = events.length;
    const pg = typeof page === "number" && page > 0 ? page : 1;
    const ps = typeof pageSize === "number" && pageSize > 0 ? pageSize : total;
    const start = (pg - 1) * ps;
    const pageEvents = events.slice(start, start + ps);

    return {
      events: pageEvents,
      total: total
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage("events");
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return null;
    return Object.assign({}, ev);
  }

  // submitEventRsvp(eventId, status, name, email)
  submitEventRsvp(eventId, status, name, email) {
    const events = this._getFromStorage("events");
    const ev = events.find((e) => e.id === eventId);
    if (!ev) {
      return {
        success: false,
        rsvp: null,
        message: "Event not found"
      };
    }

    const rsvps = this._getFromStorage("rsvps");
    const rsvp = {
      id: this._generateId("rsvp"),
      event_id: eventId,
      status: status,
      name: name,
      email: email,
      submitted_at: this._nowISOString()
    };
    rsvps.push(rsvp);
    this._saveToStorage("rsvps", rsvps);

    return {
      success: true,
      rsvp: Object.assign({}, rsvp, { event: ev }),
      message: "RSVP submitted"
    };
  }

  // getProfileSettings()
  getProfileSettings() {
    let username = this._getCurrentUsername();
    if (!username) {
      username = "testcollector";
    }
    const profile = this._getOrCreateProfile(username);
    return {
      username: profile.username,
      favorite_team_id: profile.favorite_team_id,
      favorite_team_name: profile.favorite_team ? profile.favorite_team.name : null,
      favorite_team: profile.favorite_team || null,
      preferred_era: profile.preferred_era,
      typical_budget: profile.typical_budget,
      notify_new_marketplace_posts: profile.notify_new_marketplace_posts,
      notify_authentication_guides: profile.notify_authentication_guides
    };
  }

  // updateProfileSettings(favoriteTeamId, preferredEra, typicalBudget, notifyNewMarketplacePosts, notifyAuthenticationGuides)
  updateProfileSettings(
    favoriteTeamId,
    preferredEra,
    typicalBudget,
    notifyNewMarketplacePosts,
    notifyAuthenticationGuides
  ) {
    let username = this._getCurrentUsername();
    if (!username) {
      username = "testcollector";
    }
    let profiles = this._getFromStorage("profiles");
    let profile = profiles.find((p) => p.username === username);
    if (!profile) {
      profile = {
        id: this._generateId("profile"),
        username: username,
        favorite_team_id: null,
        preferred_era: null,
        typical_budget: null,
        notify_new_marketplace_posts: false,
        notify_authentication_guides: false
      };
      profiles.push(profile);
    }

    if (typeof favoriteTeamId !== "undefined") {
      profile.favorite_team_id = favoriteTeamId;
    }
    if (typeof preferredEra !== "undefined") {
      profile.preferred_era = preferredEra;
    }
    if (typeof typicalBudget === "number") {
      profile.typical_budget = typicalBudget;
    }
    if (typeof notifyNewMarketplacePosts === "boolean") {
      profile.notify_new_marketplace_posts = notifyNewMarketplacePosts;
    }
    if (typeof notifyAuthenticationGuides === "boolean") {
      profile.notify_authentication_guides = notifyAuthenticationGuides;
    }

    this._saveToStorage("profiles", profiles);

    const team = this._findTeamById(profile.favorite_team_id);

    return {
      success: true,
      profile: {
        username: profile.username,
        favorite_team_id: profile.favorite_team_id,
        favorite_team_name: team ? team.name : null,
        favorite_team: team || null,
        preferred_era: profile.preferred_era,
        typical_budget: profile.typical_budget,
        notify_new_marketplace_posts: profile.notify_new_marketplace_posts,
        notify_authentication_guides: profile.notify_authentication_guides
      },
      message: "Profile updated"
    };
  }

  // getProfileNotes()
  getProfileNotes() {
    const notes = this._getFromStorage("notes");
    return { notes };
  }

  // createProfileNote(title, content)
  createProfileNote(title, content) {
    const notes = this._getFromStorage("notes");
    const note = {
      id: this._generateId("note"),
      title: title || null,
      content: content,
      created_at: this._nowISOString()
    };
    notes.push(note);
    this._saveToStorage("notes", notes);

    return {
      success: true,
      note: note,
      message: "Note created"
    };
  }

  // updateProfileNote(noteId, title, content)
  updateProfileNote(noteId, title, content) {
    const notes = this._getFromStorage("notes");
    const note = notes.find((n) => n.id === noteId);
    if (!note) {
      return {
        success: false,
        note: null,
        message: "Note not found"
      };
    }

    if (typeof title !== "undefined") {
      note.title = title;
    }
    if (typeof content !== "undefined") {
      note.content = content;
    }
    this._saveToStorage("notes", notes);

    return {
      success: true,
      note: note,
      message: "Note updated"
    };
  }

  // deleteProfileNote(noteId)
  deleteProfileNote(noteId) {
    const notes = this._getFromStorage("notes");
    const idx = notes.findIndex((n) => n.id === noteId);
    if (idx === -1) {
      return {
        success: false,
        message: "Note not found"
      };
    }
    notes.splice(idx, 1);
    this._saveToStorage("notes", notes);
    return {
      success: true,
      message: "Note deleted"
    };
  }

  // getUserListsSummary()
  getUserListsSummary() {
    const lists = this._getFromStorage("lists");
    const listItems = this._getFromStorage("list_items");
    const summary = lists.map((l) => {
      const count = listItems.filter((li) => li.list_id === l.id).length;
      return {
        id: l.id,
        name: l.name,
        type: l.type,
        is_system: l.is_system,
        created_at: l.created_at,
        updated_at: l.updated_at,
        item_count: count
      };
    });
    return { lists: summary };
  }

  // getListItems(listId, page, pageSize)
  getListItems(listId, page, pageSize) {
    const listItemsAll = this._getFromStorage("list_items").filter(
      (li) => li.list_id === listId
    );
    const articles = this._getFromStorage("articles");
    const listings = this._getFromStorage("listings");

    const total = listItemsAll.length;
    const pg = typeof page === "number" && page > 0 ? page : 1;
    const ps = typeof pageSize === "number" && pageSize > 0 ? pageSize : total;
    const start = (pg - 1) * ps;

    const items = listItemsAll.slice(start, start + ps).map((li) => {
      let item = null;
      let title = null;
      let section = null;
      let content_type = null;
      let team_name = null;
      let league = null;
      let era = null;
      let estimated_price = null;
      let price = null;
      let currency = null;
      let url = null;

      if (li.item_type === "article") {
        const a = articles.find((x) => x.id === li.item_id) || null;
        item = a;
        if (a) {
          const withTeam = this._attachTeamInfoToArticle(a);
          title = withTeam.title;
          section = withTeam.section;
          content_type = withTeam.content_type;
          team_name = withTeam.team_name;
          league = withTeam.league;
          estimated_price = withTeam.estimated_price;
          url = withTeam.url;
        }
      } else if (li.item_type === "listing") {
        const l = listings.find((x) => x.id === li.item_id) || null;
        item = l;
        if (l) {
          const withTeam = this._attachTeamInfoToListing(l);
          title = withTeam.title;
          section = "marketplace";
          team_name = withTeam.team_name;
          league = withTeam.league;
          era = withTeam.era;
          price = withTeam.price;
          currency = withTeam.currency;
          url = "/listings/" + withTeam.id;
        }
      }

      return {
        list_item_id: li.id,
        item_type: li.item_type,
        item_id: li.item_id,
        item: item,
        title: title,
        section: section,
        content_type: content_type,
        team_name: team_name,
        league: league,
        era: era,
        estimated_price: estimated_price,
        price: price,
        currency: currency,
        added_at: li.added_at,
        url: url
      };
    });

    return {
      items: items,
      total: total
    };
  }

  // removeListItem(listItemId)
  removeListItem(listItemId) {
    const success = this._removeItemFromListById(listItemId);
    return {
      success: success,
      message: success ? "List item removed" : "List item not found"
    };
  }

  // submitContactMessage(name, email, subject, message)
  submitContactMessage(name, email, subject, message) {
    const messages = this._getFromStorage("contact_messages");
    const msg = {
      id: this._generateId("contact"),
      name: name,
      email: email,
      subject: subject,
      message: message,
      created_at: this._nowISOString()
    };
    messages.push(msg);
    this._saveToStorage("contact_messages", messages);

    return {
      success: true,
      message: "Contact message submitted"
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
