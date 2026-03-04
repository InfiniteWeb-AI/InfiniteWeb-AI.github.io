/// localStorage polyfill for Node.js and environments without localStorage
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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Core entity tables (arrays)
    this._ensureStorageKey("my_profiles", []);
    this._ensureStorageKey("member_profiles", []);
    this._ensureStorageKey("languages", []);
    this._ensureStorageKey("interests", []);
    this._ensureStorageKey("match_preferences", []);
    this._ensureStorageKey("saved_profiles", []);
    this._ensureStorageKey("conversations", []);
    this._ensureStorageKey("messages", []);
    this._ensureStorageKey("events", []);
    this._ensureStorageKey("event_registrations", []);
    this._ensureStorageKey("subscription_plans", []);
    this._ensureStorageKey("subscriptions", []);
    this._ensureStorageKey("subscription_checkout_sessions", []);
    this._ensureStorageKey("privacy_settings", []);
    this._ensureStorageKey("blocked_profiles", []);
    this._ensureStorageKey("user_reports", []);
    this._ensureStorageKey("contact_tickets", []);

    // Content / config objects (may be filled by a CMS elsewhere)
    this._ensureStorageKey("home_page_content", null);
    this._ensureStorageKey("about_page_content", null);
    this._ensureStorageKey("help_faq_content", null);
    this._ensureStorageKey("contact_page_config", null);
    this._ensureStorageKey("terms_of_use_content", null);
    this._ensureStorageKey("privacy_policy_content", null);
    this._ensureStorageKey("safety_tips_content", null);

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _ensureStorageKey(key, defaultValue) {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  _getObjectFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // ----------------------
  // Location & distance helpers
  // ----------------------

  /**
   * Normalize location input using existing MemberProfile data.
   * Attempts to find coordinates for the given city/country from member_profiles.
   */
  _resolveLocationInput(location_city, location_country) {
    const city = (location_city || "").trim();
    const country = (location_country || "").trim();
    const members = this._getFromStorage("member_profiles");

    const match = members.find(m => {
      const mc = (m.location_city || "").trim();
      const mco = (m.location_country || "").trim();
      return mc.toLowerCase() === city.toLowerCase() && mco.toLowerCase() === country.toLowerCase() &&
        typeof m.latitude === "number" && typeof m.longitude === "number";
    });

    return {
      location_city: city,
      location_country: country,
      latitude: match ? match.latitude : null,
      longitude: match ? match.longitude : null
    };
  }

  _toRadians(deg) {
    return (deg * Math.PI) / 180;
  }

  _calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (
      typeof lat1 !== "number" || typeof lon1 !== "number" ||
      typeof lat2 !== "number" || typeof lon2 !== "number"
    ) {
      return null;
    }
    const R = 6371; // Earth radius in km
    const dLat = this._toRadians(lat2 - lat1);
    const dLon = this._toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRadians(lat1)) *
        Math.cos(this._toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // ----------------------
  // Messaging helpers
  // ----------------------

  _getOrCreateConversationWithMember(member_profile_id) {
    let conversations = this._getFromStorage("conversations");
    const now = this._nowIso();

    let conversation = conversations.find(
      c => c.member_profile_id === member_profile_id
    );

    if (!conversation) {
      conversation = {
        id: this._generateId("conv"),
        member_profile_id,
        started_at: now,
        last_message_at: now,
        last_message_preview: "",
        unread_count: 0,
        is_muted: false
      };
      conversations.push(conversation);
      this._saveToStorage("conversations", conversations);
    }

    return conversation;
  }

  /**
   * Apply current user's messaging restrictions to a potential sender.
   * Returns true if the member is allowed to start a new conversation with me.
   */
  _applyMessagingRestrictions(memberProfile) {
    const settingsArr = this._getFromStorage("privacy_settings");
    const settings = settingsArr[0];
    if (!settings) {
      return true;
    }
    if (!settings.message_restrictions_enabled) {
      return true;
    }

    const age = memberProfile && typeof memberProfile.age === "number" ? memberProfile.age : null;
    const region = memberProfile && memberProfile.region ? memberProfile.region : null;

    if (
      typeof settings.message_allowed_age_min === "number" &&
      (age === null || age < settings.message_allowed_age_min)
    ) {
      return false;
    }
    if (
      typeof settings.message_allowed_age_max === "number" &&
      (age === null || age > settings.message_allowed_age_max)
    ) {
      return false;
    }
    if (Array.isArray(settings.message_allowed_regions) && settings.message_allowed_regions.length > 0) {
      if (!region || !settings.message_allowed_regions.includes(region)) {
        return false;
      }
    }

    return true;
  }

  // ----------------------
  // Subscription helpers
  // ----------------------

  _calculateSubscriptionTotalAmount(plan, billing_period) {
    if (!plan || typeof plan.monthly_price !== "number") {
      return 0;
    }
    let months = 1;
    switch (billing_period) {
      case "three_months":
        months = 3;
        break;
      case "six_months":
        months = 6;
        break;
      case "twelve_months":
        months = 12;
        break;
      case "one_month":
      default:
        months = 1;
        break;
    }
    return plan.monthly_price * months;
  }

  _addMonthsToDate(startIso, months) {
    const d = new Date(startIso);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const day = d.getUTCDate();
    const newMonthIndex = month + months;
    const result = new Date(Date.UTC(year, newMonthIndex, day));
    return result.toISOString();
  }

  // ----------------------
  // Event helpers
  // ----------------------

  _enforceEventRegistrationLimits(event) {
    if (!event) {
      return {
        canRegister: false,
        registrationStatus: "waitlisted",
        message: "event_not_found"
      };
    }

    const limit = typeof event.participant_limit === "number" ? event.participant_limit : null;
    const currentCount = typeof event.participants_count === "number" ? event.participants_count : 0;

    if (limit === null) {
      // No limit => direct registration
      return {
        canRegister: true,
        registrationStatus: "registered",
        message: "registered"
      };
    }

    if (currentCount < limit) {
      return {
        canRegister: true,
        registrationStatus: "registered",
        message: "registered"
      };
    }

    return {
      canRegister: true,
      registrationStatus: "waitlisted",
      message: "waitlisted"
    };
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomePageContent
  getHomePageContent() {
    const stored = this._getObjectFromStorage("home_page_content", null) || {};

    const myProfiles = this._getFromStorage("my_profiles");
    const profile = myProfiles[0] || null;

    let totalFields = 7;
    let filled = 0;
    if (profile && profile.display_name) filled++;
    if (profile && profile.gender) filled++;
    if (profile && profile.location_city && profile.location_country) filled++;
    if (profile && profile.relationship_goal) filled++;
    if (profile && Array.isArray(profile.languages) && profile.languages.length > 0) filled++;
    if (profile && Array.isArray(profile.interests) && profile.interests.length > 0) filled++;
    if (profile && profile.bio) filled++;

    const profile_completion_percent = totalFields > 0 ? Math.round((filled / totalFields) * 100) : 0;

    // Derive quick search defaults from match preferences if present
    const matchPrefsArr = this._getFromStorage("match_preferences");
    const prefs = matchPrefsArr[0] || null;

    const quick_search_defaults = {
      location_city: prefs && prefs.location_city ? prefs.location_city : (profile ? profile.location_city : ""),
      location_country: prefs && prefs.location_country ? prefs.location_country : (profile ? profile.location_country : ""),
      age_min_default: prefs && typeof prefs.age_min === "number" ? prefs.age_min : 25,
      age_max_default: prefs && typeof prefs.age_max === "number" ? prefs.age_max : 40
    };

    let primary_cta_label = stored.primary_cta_label || "join_now";
    if (profile && profile_completion_percent < 100) {
      primary_cta_label = "complete_profile";
    } else if (profile && profile_completion_percent === 100) {
      primary_cta_label = "discover_matches";
    }

    return {
      hero_title: stored.hero_title || "Meet people around the world",
      hero_subtitle: stored.hero_subtitle || "Find meaningful connections across borders.",
      primary_cta_label,
      profile_completion_percent,
      quick_search_defaults,
      highlighted_sections: Array.isArray(stored.highlighted_sections) ? stored.highlighted_sections : []
    };
  }

  // getMyProfileForEdit
  getMyProfileForEdit() {
    const myProfiles = this._getFromStorage("my_profiles");
    const profile = myProfiles[0] || null;

    let is_complete = false;
    if (profile) {
      let totalFields = 7;
      let filled = 0;
      if (profile.display_name) filled++;
      if (profile.gender) filled++;
      if (profile.location_city && profile.location_country) filled++;
      if (profile.relationship_goal) filled++;
      if (Array.isArray(profile.languages) && profile.languages.length > 0) filled++;
      if (Array.isArray(profile.interests) && profile.interests.length > 0) filled++;
      if (profile.bio) filled++;
      is_complete = filled === totalFields;
    }

    return {
      profile,
      is_complete
    };
  }

  // getProfileFormOptions
  getProfileFormOptions() {
    const language_options = this._getFromStorage("languages");
    const interest_options = this._getFromStorage("interests");

    const gender_options = [
      { value: "man", label: "Man" },
      { value: "woman", label: "Woman" },
      { value: "non_binary", label: "Non-binary" },
      { value: "other", label: "Other" },
      { value: "prefer_not_to_say", label: "Prefer not to say" }
    ];

    const looking_for_options = [
      { value: "men", label: "Men" },
      { value: "women", label: "Women" },
      { value: "everyone", label: "Everyone" },
      { value: "custom", label: "Custom" }
    ];

    const relationship_goal_options = [
      { value: "long_term_relationship", label: "Long-term relationship" },
      { value: "short_term_dating", label: "Short-term dating" },
      { value: "friendship", label: "Friendship" },
      { value: "casual_dating", label: "Casual dating" },
      { value: "marriage", label: "Marriage" },
      { value: "unsure", label: "Unsure" }
    ];

    return {
      gender_options,
      looking_for_options,
      relationship_goal_options,
      language_options,
      interest_options
    };
  }

  // updateMyProfile
  updateMyProfile(
    display_name,
    password,
    gender,
    looking_for,
    location_city,
    location_country,
    preferred_match_age_min,
    preferred_match_age_max,
    relationship_goal,
    language_codes,
    interest_codes,
    bio
  ) {
    const now = this._nowIso();
    let myProfiles = this._getFromStorage("my_profiles");
    let profile = myProfiles[0] || null;

    if (!profile) {
      profile = {
        id: this._generateId("myprof"),
        display_name: "",
        password: "",
        gender: null,
        looking_for: null,
        age: null,
        birthdate: null,
        location_city: "",
        location_country: "",
        preferred_match_age_min: null,
        preferred_match_age_max: null,
        relationship_goal: null,
        languages: [],
        interests: [],
        bio: "",
        last_online_at: null,
        created_at: now,
        updated_at: now
      };
      myProfiles.push(profile);
    }

    if (typeof display_name !== "undefined") profile.display_name = display_name;
    if (typeof password !== "undefined") profile.password = password;
    if (typeof gender !== "undefined") profile.gender = gender;
    if (typeof looking_for !== "undefined") profile.looking_for = looking_for;
    if (typeof location_city !== "undefined") profile.location_city = location_city;
    if (typeof location_country !== "undefined") profile.location_country = location_country;
    if (typeof preferred_match_age_min !== "undefined") profile.preferred_match_age_min = preferred_match_age_min;
    if (typeof preferred_match_age_max !== "undefined") profile.preferred_match_age_max = preferred_match_age_max;
    if (typeof relationship_goal !== "undefined") profile.relationship_goal = relationship_goal;
    if (typeof language_codes !== "undefined" && Array.isArray(language_codes)) profile.languages = language_codes;
    if (typeof interest_codes !== "undefined" && Array.isArray(interest_codes)) profile.interests = interest_codes;
    if (typeof bio !== "undefined") profile.bio = bio;

    profile.updated_at = now;

    myProfiles[0] = profile;
    this._saveToStorage("my_profiles", myProfiles);

    return {
      success: true,
      profile,
      message: "profile_updated"
    };
  }

  // getMatchPreferencesForEdit
  getMatchPreferencesForEdit() {
    let prefsArr = this._getFromStorage("match_preferences");
    let preferences = prefsArr[0] || null;

    if (!preferences) {
      const myProfiles = this._getFromStorage("my_profiles");
      const profile = myProfiles[0] || null;
      const now = this._nowIso();
      preferences = {
        id: this._generateId("matchpref"),
        location_city: profile ? profile.location_city || "" : "",
        location_country: profile ? profile.location_country || "" : "",
        location_radius_km: 50,
        age_min: profile && typeof profile.preferred_match_age_min === "number" ? profile.preferred_match_age_min : 25,
        age_max: profile && typeof profile.preferred_match_age_max === "number" ? profile.preferred_match_age_max : 40,
        relationship_goal: profile && profile.relationship_goal ? profile.relationship_goal : "long_term_relationship",
        show_me: profile && profile.looking_for ? profile.looking_for : "everyone",
        match_frequency: "medium",
        created_at: now,
        updated_at: now
      };
      prefsArr.push(preferences);
      this._saveToStorage("match_preferences", prefsArr);
    }

    return { preferences };
  }

  // updateMatchPreferences
  updateMatchPreferences(
    location_city,
    location_country,
    location_radius_km,
    age_min,
    age_max,
    relationship_goal,
    show_me,
    match_frequency
  ) {
    const now = this._nowIso();
    let prefsArr = this._getFromStorage("match_preferences");
    let preferences = prefsArr[0] || null;

    if (!preferences) {
      preferences = {
        id: this._generateId("matchpref"),
        location_city: "",
        location_country: "",
        location_radius_km: 50,
        age_min: 25,
        age_max: 40,
        relationship_goal: "long_term_relationship",
        show_me: "everyone",
        match_frequency: "medium",
        created_at: now,
        updated_at: now
      };
      prefsArr.push(preferences);
    }

    if (typeof location_city !== "undefined") preferences.location_city = location_city;
    if (typeof location_country !== "undefined") preferences.location_country = location_country;
    if (typeof location_radius_km !== "undefined") preferences.location_radius_km = location_radius_km;
    if (typeof age_min !== "undefined") preferences.age_min = age_min;
    if (typeof age_max !== "undefined") preferences.age_max = age_max;
    if (typeof relationship_goal !== "undefined") preferences.relationship_goal = relationship_goal;
    if (typeof show_me !== "undefined") preferences.show_me = show_me;
    if (typeof match_frequency !== "undefined") preferences.match_frequency = match_frequency;

    preferences.updated_at = now;
    prefsArr[0] = preferences;
    this._saveToStorage("match_preferences", prefsArr);

    return {
      success: true,
      preferences,
      message: "match_preferences_updated"
    };
  }

  // getSearchFilterOptions
  getSearchFilterOptions() {
    const language_options = this._getFromStorage("languages");

    const relationship_goal_options = [
      { value: "long_term_relationship", label: "Long-term relationship" },
      { value: "short_term_dating", label: "Short-term dating" },
      { value: "friendship", label: "Friendship" },
      { value: "casual_dating", label: "Casual dating" },
      { value: "marriage", label: "Marriage" },
      { value: "unsure", label: "Unsure" }
    ];

    const marital_status_options = [
      { value: "never_married", label: "Never married" },
      { value: "married", label: "Married" },
      { value: "divorced", label: "Divorced" },
      { value: "widowed", label: "Widowed" },
      { value: "separated", label: "Separated" },
      { value: "in_a_relationship", label: "In a relationship" },
      { value: "prefer_not_to_say", label: "Prefer not to say" }
    ];

    const smoking_status_options = [
      { value: "non_smoker", label: "Non-smoker" },
      { value: "occasional_smoker", label: "Occasional smoker" },
      { value: "regular_smoker", label: "Regular smoker" },
      { value: "prefer_not_to_say", label: "Prefer not to say" }
    ];

    const children_preference_options = [
      { value: "wants_children", label: "Wants children" },
      { value: "does_not_want_children", label: "Does not want children" },
      { value: "open_to_children", label: "Open to children" },
      { value: "has_children_and_wants_more", label: "Has children & wants more" },
      { value: "has_children_and_does_not_want_more", label: "Has children & does not want more" },
      { value: "has_children_unsure", label: "Has children, unsure" },
      { value: "prefer_not_to_say", label: "Prefer not to say" }
    ];

    const height_range_default = {
      min_cm: 140,
      max_cm: 210
    };

    const age_range_default = {
      min_age: 18,
      max_age: 99
    };

    const distance_default_km = 50;

    const sort_options = [
      { value: "last_active_desc", label: "Last active (newest first)", is_default: true },
      { value: "distance_asc", label: "Distance (nearest first)", is_default: false }
    ];

    return {
      language_options,
      relationship_goal_options,
      marital_status_options,
      smoking_status_options,
      children_preference_options,
      height_range_default,
      age_range_default,
      distance_default_km,
      sort_options
    };
  }

  // searchMemberProfiles
  searchMemberProfiles(
    location_country,
    location_city,
    location_radius_km,
    age_min,
    age_max,
    language_codes,
    require_all_languages,
    relationship_goal,
    marital_status,
    smoking_status,
    min_height_cm,
    children_preference,
    sort_by,
    page,
    page_size
  ) {
    const members = this._getFromStorage("member_profiles");

    const country = (location_country || "").trim();
    const city = (location_city || "").trim();
    const hasRadius = typeof location_radius_km === "number" && location_radius_km > 0;

    let center = null;
    if (city || country) {
      center = this._resolveLocationInput(city, country);
    }

    const langCodes = Array.isArray(language_codes) ? language_codes : [];
    const requireAll = !!require_all_languages;

    let filtered = members.filter(m => {
      // Location country
      if (country) {
        const mc = (m.location_country || "").trim();
        if (mc.toLowerCase() !== country.toLowerCase()) return false;
      }
      // Location city (if radius not used or no coords)
      if (city && (!hasRadius || !center || center.latitude === null || center.longitude === null)) {
        const mcity = (m.location_city || "").trim();
        if (mcity.toLowerCase() !== city.toLowerCase()) return false;
      }

      // Age
      if (typeof age_min === "number" && (typeof m.age !== "number" || m.age < age_min)) return false;
      if (typeof age_max === "number" && (typeof m.age !== "number" || m.age > age_max)) return false;

      // Languages
      if (langCodes.length > 0) {
        const memberLangs = Array.isArray(m.languages) ? m.languages : [];
        if (requireAll) {
          const allPresent = langCodes.every(lc => memberLangs.includes(lc));
          if (!allPresent) return false;
        } else {
          const anyPresent = langCodes.some(lc => memberLangs.includes(lc));
          if (!anyPresent) return false;
        }
      }

      // Relationship goal
      if (relationship_goal) {
        if (!m.relationship_goal || m.relationship_goal !== relationship_goal) return false;
      }

      // Marital status
      if (marital_status) {
        if (!m.marital_status || m.marital_status !== marital_status) return false;
      }

      // Smoking status
      if (smoking_status) {
        if (!m.smoking_status || m.smoking_status !== smoking_status) return false;
      }

      // Height
      if (typeof min_height_cm === "number") {
        if (typeof m.height_cm !== "number" || m.height_cm < min_height_cm) return false;
      }

      // Children preference
      if (children_preference) {
        if (!m.children_preference || m.children_preference !== children_preference) return false;
      }

      return true;
    });

    // Compute distances if possible and apply radius filter
    let resultsWithDistance = filtered.map(m => {
      let distance_km = null;
      if (
        hasRadius &&
        center &&
        center.latitude !== null &&
        center.longitude !== null &&
        typeof m.latitude === "number" &&
        typeof m.longitude === "number"
      ) {
        distance_km = this._calculateDistanceKm(
          center.latitude,
          center.longitude,
          m.latitude,
          m.longitude
        );
      }
      return { member_profile: m, distance_km };
    });

    if (hasRadius && center && center.latitude !== null && center.longitude !== null) {
      resultsWithDistance = resultsWithDistance.filter(r => {
        if (r.distance_km === null) return false;
        return r.distance_km <= location_radius_km;
      });
    }

    // Sorting
    const sort = sort_by || "last_active_desc";
    if (sort === "distance_asc") {
      resultsWithDistance.sort((a, b) => {
        const da = a.distance_km;
        const db = b.distance_km;
        if (da === null && db === null) return 0;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      });
    } else if (sort === "last_active_desc") {
      resultsWithDistance.sort((a, b) => {
        const ta = a.member_profile.last_active_at || "";
        const tb = b.member_profile.last_active_at || "";
        return tb.localeCompare(ta);
      });
    }

    const total_results = resultsWithDistance.length;
    const pg = typeof page === "number" && page > 0 ? page : 1;
    const ps = typeof page_size === "number" && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const pagedResults = resultsWithDistance.slice(start, end);

    return {
      total_results,
      page: pg,
      page_size: ps,
      results: pagedResults
    };
  }

  // getMemberProfileDetails
  getMemberProfileDetails(member_profile_id) {
    const members = this._getFromStorage("member_profiles");
    const profile = members.find(m => m.id === member_profile_id) || null;

    const savedProfiles = this._getFromStorage("saved_profiles");
    const blockedProfiles = this._getFromStorage("blocked_profiles");

    const is_favorite = savedProfiles.some(
      s => s.member_profile_id === member_profile_id && s.list_type === "favorite"
    );
    const is_shortlisted = savedProfiles.some(
      s => s.member_profile_id === member_profile_id && s.list_type === "shortlist"
    );
    const is_blocked = blockedProfiles.some(
      b => b.member_profile_id === member_profile_id
    );

    let can_message = !is_blocked;
    if (profile) {
      // can this member message me according to my restrictions
      if (!this._applyMessagingRestrictions(profile)) {
        can_message = false;
      }
    } else {
      can_message = false;
    }

    return {
      profile,
      relationship_to_me: {
        is_favorite,
        is_shortlisted,
        is_blocked,
        can_message
      }
    };
  }

  // addProfileToFavorites
  addProfileToFavorites(member_profile_id) {
    const now = this._nowIso();
    let savedProfiles = this._getFromStorage("saved_profiles");

    let saved = savedProfiles.find(
      s => s.member_profile_id === member_profile_id
    );

    if (saved) {
      saved.list_type = "favorite";
      saved.added_at = now;
    } else {
      saved = {
        id: this._generateId("saved"),
        member_profile_id,
        list_type: "favorite",
        added_at: now
      };
      savedProfiles.push(saved);
    }

    this._saveToStorage("saved_profiles", savedProfiles);

    return {
      success: true,
      saved_profile: saved,
      message: "added_to_favorites"
    };
  }

  // addProfileToShortlist
  addProfileToShortlist(member_profile_id) {
    const now = this._nowIso();
    let savedProfiles = this._getFromStorage("saved_profiles");

    let saved = savedProfiles.find(
      s => s.member_profile_id === member_profile_id
    );

    if (saved) {
      saved.list_type = "shortlist";
      saved.added_at = now;
    } else {
      saved = {
        id: this._generateId("saved"),
        member_profile_id,
        list_type: "shortlist",
        added_at: now
      };
      savedProfiles.push(saved);
    }

    this._saveToStorage("saved_profiles", savedProfiles);

    return {
      success: true,
      saved_profile: saved,
      message: "added_to_shortlist"
    };
  }

  // removeSavedProfile
  removeSavedProfile(saved_profile_id) {
    let savedProfiles = this._getFromStorage("saved_profiles");
    const initialLength = savedProfiles.length;
    savedProfiles = savedProfiles.filter(s => s.id !== saved_profile_id);
    this._saveToStorage("saved_profiles", savedProfiles);

    const success = savedProfiles.length < initialLength;
    return {
      success,
      message: success ? "saved_profile_removed" : "saved_profile_not_found"
    };
  }

  // updateSavedProfileListType
  updateSavedProfileListType(saved_profile_id, list_type) {
    if (list_type !== "favorite" && list_type !== "shortlist") {
      return {
        success: false,
        saved_profile: null,
        message: "invalid_list_type"
      };
    }

    let savedProfiles = this._getFromStorage("saved_profiles");
    const saved = savedProfiles.find(s => s.id === saved_profile_id) || null;

    if (!saved) {
      return {
        success: false,
        saved_profile: null,
        message: "saved_profile_not_found"
      };
    }

    saved.list_type = list_type;
    this._saveToStorage("saved_profiles", savedProfiles);

    return {
      success: true,
      saved_profile: saved,
      message: "saved_profile_updated"
    };
  }

  // sendMessageToMemberProfile
  sendMessageToMemberProfile(member_profile_id, content) {
    if (!content || typeof content !== "string") {
      return {
        success: false,
        conversation: null,
        sent_message: null,
        message: "content_required"
      };
    }

    const blockedProfiles = this._getFromStorage("blocked_profiles");
    const isBlocked = blockedProfiles.some(b => b.member_profile_id === member_profile_id);
    if (isBlocked) {
      return {
        success: false,
        conversation: null,
        sent_message: null,
        message: "member_blocked"
      };
    }

    let conversations = this._getFromStorage("conversations");
    let messages = this._getFromStorage("messages");

    let conversation = this._getOrCreateConversationWithMember(member_profile_id);
    const now = this._nowIso();

    const sent_message = {
      id: this._generateId("msg"),
      conversation_id: conversation.id,
      sender_type: "me",
      content,
      sent_at: now,
      status: "sent"
    };

    messages.push(sent_message);

    // Update conversation
    conversations = this._getFromStorage("conversations");
    const convIndex = conversations.findIndex(c => c.id === conversation.id);
    if (convIndex !== -1) {
      conversations[convIndex].last_message_at = now;
      conversations[convIndex].last_message_preview = content.substring(0, 140);
    }

    this._saveToStorage("messages", messages);
    this._saveToStorage("conversations", conversations);

    // Re-fetch updated conversation
    conversation = conversations.find(c => c.id === conversation.id) || conversation;

    return {
      success: true,
      conversation,
      sent_message,
      message: "message_sent"
    };
  }

  // blockMemberProfile
  blockMemberProfile(member_profile_id, reason) {
    const now = this._nowIso();
    let blockedProfiles = this._getFromStorage("blocked_profiles");

    let blocked = blockedProfiles.find(b => b.member_profile_id === member_profile_id);
    if (!blocked) {
      blocked = {
        id: this._generateId("block"),
        member_profile_id,
        blocked_at: now,
        reason: typeof reason === "string" ? reason : null
      };
      blockedProfiles.push(blocked);
      this._saveToStorage("blocked_profiles", blockedProfiles);
    }

    return {
      success: true,
      blocked_profile: blocked,
      message: "member_blocked"
    };
  }

  // reportMemberProfile
  reportMemberProfile(member_profile_id, reason, description) {
    const now = this._nowIso();
    let reports = this._getFromStorage("user_reports");

    const report = {
      id: this._generateId("report"),
      member_profile_id,
      reason,
      description: typeof description === "string" ? description : null,
      created_at: now,
      status: "open"
    };

    reports.push(report);
    this._saveToStorage("user_reports", reports);

    return {
      success: true,
      report,
      message: "report_submitted"
    };
  }

  // getConversationsList
  getConversationsList() {
    const conversations = this._getFromStorage("conversations");
    const members = this._getFromStorage("member_profiles");

    const sortedConvs = conversations.slice().sort((a, b) => {
      const ta = a.last_message_at || "";
      const tb = b.last_message_at || "";
      return tb.localeCompare(ta);
    });

    return sortedConvs.map(conv => {
      const member = members.find(m => m.id === conv.member_profile_id) || null;
      const member_profile = member
        ? {
            id: member.id,
            display_name: member.display_name,
            profile_photo_url: member.profile_photo_url || null,
            is_online: !!member.is_online,
            location_city: member.location_city,
            location_country: member.location_country
          }
        : null;

      return {
        conversation: conv,
        member_profile
      };
    });
  }

  // getConversationThread
  getConversationThread(conversation_id) {
    const conversations = this._getFromStorage("conversations");
    const messages = this._getFromStorage("messages");
    const members = this._getFromStorage("member_profiles");

    const conversation = conversations.find(c => c.id === conversation_id) || null;
    if (!conversation) {
      return {
        conversation: null,
        messages: [],
        member_profile: null
      };
    }

    const threadMessages = messages
      .filter(m => m.conversation_id === conversation_id)
      .sort((a, b) => (a.sent_at || "").localeCompare(b.sent_at || ""));

    const member_profile =
      members.find(m => m.id === conversation.member_profile_id) || null;

    return {
      conversation,
      messages: threadMessages,
      member_profile
    };
  }

  // sendMessageInConversation
  sendMessageInConversation(conversation_id, content) {
    if (!content || typeof content !== "string") {
      return {
        success: false,
        sent_message: null,
        updated_conversation: null,
        message: "content_required"
      };
    }

    let conversations = this._getFromStorage("conversations");
    let messages = this._getFromStorage("messages");

    const conversation = conversations.find(c => c.id === conversation_id) || null;
    if (!conversation) {
      return {
        success: false,
        sent_message: null,
        updated_conversation: null,
        message: "conversation_not_found"
      };
    }

    const now = this._nowIso();
    const sent_message = {
      id: this._generateId("msg"),
      conversation_id,
      sender_type: "me",
      content,
      sent_at: now,
      status: "sent"
    };
    messages.push(sent_message);

    const convIndex = conversations.findIndex(c => c.id === conversation_id);
    if (convIndex !== -1) {
      conversations[convIndex].last_message_at = now;
      conversations[convIndex].last_message_preview = content.substring(0, 140);
    }

    this._saveToStorage("messages", messages);
    this._saveToStorage("conversations", conversations);

    const updated_conversation = conversations.find(c => c.id === conversation_id) || conversation;

    return {
      success: true,
      sent_message,
      updated_conversation,
      message: "message_sent"
    };
  }

  // updateConversationSettings
  updateConversationSettings(conversation_id, is_muted) {
    let conversations = this._getFromStorage("conversations");
    const conv = conversations.find(c => c.id === conversation_id) || null;
    if (!conv) {
      return {
        success: false,
        conversation: null,
        message: "conversation_not_found"
      };
    }

    conv.is_muted = !!is_muted;
    this._saveToStorage("conversations", conversations);

    return {
      success: true,
      conversation: conv,
      message: "conversation_updated"
    };
  }

  // getSavedProfiles
  getSavedProfiles() {
    const savedProfiles = this._getFromStorage("saved_profiles");
    const members = this._getFromStorage("member_profiles");

    const favoritesArr = [];
    const shortlistArr = [];

    savedProfiles.forEach(sp => {
      const member_profile = members.find(m => m.id === sp.member_profile_id) || null;
      const bundle = { saved_profile: sp, member_profile };
      if (sp.list_type === "favorite") {
        favoritesArr.push(bundle);
      } else if (sp.list_type === "shortlist") {
        shortlistArr.push(bundle);
      }
    });

    return {
      favorites: favoritesArr,
      shortlist: shortlistArr
    };
  }

  // getEventFilterOptions
  getEventFilterOptions() {
    const event_type_options = [
      { value: "online", label: "Online" },
      { value: "in_person", label: "In person" },
      { value: "hybrid", label: "Hybrid" }
    ];

    const category_options = [
      { value: "international", label: "International" },
      { value: "local", label: "Local" },
      { value: "theme", label: "Theme" },
      { value: "speed_dating", label: "Speed dating" },
      { value: "other", label: "Other" }
    ];

    const age_group_presets = [
      { id: "18_25", label: "Ages 18-25", age_min: 18, age_max: 25 },
      { id: "25_35", label: "Ages 25-35", age_min: 25, age_max: 35 },
      { id: "30_40", label: "Ages 30-40", age_min: 30, age_max: 40 },
      { id: "40_55", label: "Ages 40-55", age_min: 40, age_max: 55 }
    ];

    const today = new Date();
    const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const date_range_default = {
      start_date: today.toISOString().slice(0, 10),
      end_date: endDate.toISOString().slice(0, 10)
    };

    return {
      event_type_options,
      category_options,
      age_group_presets,
      date_range_default
    };
  }

  // searchEvents
  searchEvents(
    event_type,
    category,
    date_start,
    date_end,
    age_min,
    age_max,
    max_participant_limit,
    sort_by,
    page,
    page_size
  ) {
    let events = this._getFromStorage("events");

    let startTime = date_start ? new Date(date_start).toISOString() : null;
    let endTime = date_end ? new Date(date_end).toISOString() : null;

    events = events.filter(e => {
      if (event_type && e.type !== event_type) return false;
      if (category && e.category !== category) return false;

      if (startTime && e.start_datetime < startTime) return false;
      if (endTime && e.start_datetime > endTime) return false;

      if (typeof age_min === "number" && typeof age_max === "number") {
        // Event age range must cover the requested range
        if (!(e.age_min <= age_min && e.age_max >= age_max)) return false;
      } else if (typeof age_min === "number") {
        if (!(e.age_min <= age_min && e.age_max >= age_min)) return false;
      } else if (typeof age_max === "number") {
        if (!(e.age_min <= age_max && e.age_max >= age_max)) return false;
      }

      if (typeof max_participant_limit === "number") {
        if (typeof e.participant_limit === "number" && e.participant_limit > max_participant_limit) {
          return false;
        }
      }

      return true;
    });

    const sort = sort_by || "start_datetime_asc";
    if (sort === "start_datetime_asc") {
      events.sort((a, b) => (a.start_datetime || "").localeCompare(b.start_datetime || ""));
    } else if (sort === "start_datetime_desc") {
      events.sort((a, b) => (b.start_datetime || "").localeCompare(a.start_datetime || ""));
    }

    const total_results = events.length;
    const pg = typeof page === "number" && page > 0 ? page : 1;
    const ps = typeof page_size === "number" && page_size > 0 ? page_size : 20;
    const startIdx = (pg - 1) * ps;
    const endIdx = startIdx + ps;
    const pageEvents = events.slice(startIdx, endIdx);

    return {
      total_results,
      page: pg,
      page_size: ps,
      events: pageEvents
    };
  }

  // getEventDetails
  getEventDetails(event_id) {
    const events = this._getFromStorage("events");
    const registrations = this._getFromStorage("event_registrations");

    const event = events.find(e => e.id === event_id) || null;
    if (!event) {
      return {
        event: null,
        is_registered: false,
        registration_status: "",
        spots_remaining: null
      };
    }

    const myReg = registrations.find(r => r.event_id === event_id && r.status !== "cancelled") || null;
    const is_registered = !!myReg;
    const registration_status = myReg ? myReg.status : "";

    const limit = typeof event.participant_limit === "number" ? event.participant_limit : null;
    const count = typeof event.participants_count === "number" ? event.participants_count : 0;
    const spots_remaining = limit === null ? null : Math.max(limit - count, 0);

    return {
      event,
      is_registered,
      registration_status,
      spots_remaining
    };
  }

  // registerForEvent
  registerForEvent(event_id) {
    let events = this._getFromStorage("events");
    let registrations = this._getFromStorage("event_registrations");

    const event = events.find(e => e.id === event_id) || null;
    if (!event) {
      return {
        success: false,
        registration: null,
        message: "event_not_found"
      };
    }

    const existing = registrations.find(r => r.event_id === event_id && r.status !== "cancelled");
    if (existing) {
      return {
        success: true,
        registration: existing,
        message: "already_registered"
      };
    }

    const decision = this._enforceEventRegistrationLimits(event);
    if (!decision.canRegister) {
      return {
        success: false,
        registration: null,
        message: decision.message || "cannot_register"
      };
    }

    const now = this._nowIso();
    const registration = {
      id: this._generateId("ereg"),
      event_id,
      registered_at: now,
      status: decision.registrationStatus,
      notes: null
    };

    registrations.push(registration);

    // Update event participants_count if registered
    const eventIndex = events.findIndex(e => e.id === event_id);
    if (eventIndex !== -1 && decision.registrationStatus === "registered") {
      const currentCount = typeof events[eventIndex].participants_count === "number" ? events[eventIndex].participants_count : 0;
      events[eventIndex].participants_count = currentCount + 1;
    }

    this._saveToStorage("event_registrations", registrations);
    this._saveToStorage("events", events);

    return {
      success: true,
      registration,
      message: decision.message || "registered"
    };
  }

  // getSubscriptionPlansOverview
  getSubscriptionPlansOverview() {
    const plansAll = this._getFromStorage("subscription_plans");
    const subs = this._getFromStorage("subscriptions");

    const plans = plansAll.filter(p => p.status === "active");

    // Determine current subscription (active/trial/past_due with latest start_date)
    const currentCandidates = subs.filter(s => s.status === "active" || s.status === "trial" || s.status === "past_due");
    let current_subscription = null;
    if (currentCandidates.length > 0) {
      currentCandidates.sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""));
      current_subscription = currentCandidates[0];
    }

    if (current_subscription) {
      const plan = plansAll.find(p => p.id === current_subscription.plan_id) || null;
      current_subscription = Object.assign({}, current_subscription, { plan });
    }

    return {
      current_subscription,
      plans
    };
  }

  // createSubscriptionCheckoutSession
  createSubscriptionCheckoutSession(plan_id, billing_period, payment_method) {
    const plans = this._getFromStorage("subscription_plans");
    let sessions = this._getFromStorage("subscription_checkout_sessions");

    const plan = plans.find(p => p.id === plan_id && p.status === "active") || null;
    if (!plan) {
      return {
        success: false,
        checkout_session: null,
        message: "plan_not_found"
      };
    }

    const total_amount = this._calculateSubscriptionTotalAmount(plan, billing_period);
    const now = this._nowIso();

    const checkout_session = {
      id: this._generateId("subsess"),
      plan_id,
      selected_billing_period: billing_period,
      payment_method,
      total_amount,
      currency: plan.currency,
      created_at: now,
      status: "initiated"
    };

    sessions.push(checkout_session);
    this._saveToStorage("subscription_checkout_sessions", sessions);

    return {
      success: true,
      checkout_session,
      message: "checkout_initiated"
    };
  }

  // confirmSubscriptionCheckout
  confirmSubscriptionCheckout(checkout_session_id) {
    let sessions = this._getFromStorage("subscription_checkout_sessions");
    let subs = this._getFromStorage("subscriptions");
    const plans = this._getFromStorage("subscription_plans");

    const session = sessions.find(s => s.id === checkout_session_id) || null;
    if (!session) {
      return {
        success: false,
        subscription: null,
        message: "checkout_session_not_found"
      };
    }

    if (session.status !== "initiated") {
      return {
        success: false,
        subscription: null,
        message: "checkout_already_processed"
      };
    }

    const plan = plans.find(p => p.id === session.plan_id) || null;
    if (!plan) {
      return {
        success: false,
        subscription: null,
        message: "plan_not_found"
      };
    }

    const now = this._nowIso();
    const monthsMap = {
      one_month: 1,
      three_months: 3,
      six_months: 6,
      twelve_months: 12
    };
    const months = monthsMap[session.selected_billing_period] || 1;
    const end_date = this._addMonthsToDate(now, months);

    // Optionally mark previous active subscriptions as canceled/expired
    subs.forEach(s => {
      if (s.status === "active" || s.status === "trial") {
        s.status = "canceled";
      }
    });

    const subscription = {
      id: this._generateId("sub"),
      plan_id: session.plan_id,
      status: "active",
      billing_period: session.selected_billing_period,
      start_date: now,
      end_date,
      auto_renew: true
    };

    subs.push(subscription);

    // Update session status
    session.status = "confirmed";

    this._saveToStorage("subscription_checkout_sessions", sessions);
    this._saveToStorage("subscriptions", subs);

    return {
      success: true,
      subscription,
      message: "subscription_activated"
    };
  }

  // getPrivacySettingsForEdit
  getPrivacySettingsForEdit() {
    let settingsArr = this._getFromStorage("privacy_settings");
    let settings = settingsArr[0] || null;

    if (!settings) {
      const now = this._nowIso();
      settings = {
        id: this._generateId("privacy"),
        show_age: true,
        location_visibility: "show_city_country",
        show_last_online: "visible_to_everyone",
        message_restrictions_enabled: false,
        message_allowed_age_min: null,
        message_allowed_age_max: null,
        message_allowed_regions: [],
        created_at: now,
        updated_at: now
      };
      settingsArr.push(settings);
      this._saveToStorage("privacy_settings", settingsArr);
    }

    return { settings };
  }

  // updatePrivacySettings
  updatePrivacySettings(
    show_age,
    location_visibility,
    show_last_online,
    message_restrictions_enabled,
    message_allowed_age_min,
    message_allowed_age_max,
    message_allowed_regions
  ) {
    const now = this._nowIso();
    let settingsArr = this._getFromStorage("privacy_settings");
    let settings = settingsArr[0] || null;

    if (!settings) {
      settings = {
        id: this._generateId("privacy"),
        show_age: true,
        location_visibility: "show_city_country",
        show_last_online: "visible_to_everyone",
        message_restrictions_enabled: false,
        message_allowed_age_min: null,
        message_allowed_age_max: null,
        message_allowed_regions: [],
        created_at: now,
        updated_at: now
      };
      settingsArr.push(settings);
    }

    if (typeof show_age !== "undefined") settings.show_age = !!show_age;
    if (typeof location_visibility !== "undefined") settings.location_visibility = location_visibility;
    if (typeof show_last_online !== "undefined") settings.show_last_online = show_last_online;
    if (typeof message_restrictions_enabled !== "undefined") settings.message_restrictions_enabled = !!message_restrictions_enabled;
    if (typeof message_allowed_age_min !== "undefined") settings.message_allowed_age_min = message_allowed_age_min;
    if (typeof message_allowed_age_max !== "undefined") settings.message_allowed_age_max = message_allowed_age_max;
    if (typeof message_allowed_regions !== "undefined" && Array.isArray(message_allowed_regions)) {
      settings.message_allowed_regions = message_allowed_regions;
    }

    settings.updated_at = now;
    settingsArr[0] = settings;
    this._saveToStorage("privacy_settings", settingsArr);

    return {
      success: true,
      settings,
      message: "privacy_settings_updated"
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const stored = this._getObjectFromStorage("about_page_content", null) || {};
    return {
      title: stored.title || "",
      sections: Array.isArray(stored.sections) ? stored.sections : []
    };
  }

  // getHelpFaqContent
  getHelpFaqContent() {
    const stored = this._getObjectFromStorage("help_faq_content", null) || {};
    const sections = Array.isArray(stored.sections) ? stored.sections : [];
    return { sections };
  }

  // getContactPageConfig
  getContactPageConfig() {
    const stored = this._getObjectFromStorage("contact_page_config", null) || {};
    return {
      contact_reasons: Array.isArray(stored.contact_reasons) ? stored.contact_reasons : [],
      support_email: stored.support_email || "",
      expected_response_time_hours: typeof stored.expected_response_time_hours === "number" ? stored.expected_response_time_hours : 0
    };
  }

  // submitContactForm
  submitContactForm(reason_id, subject, message) {
    if (!reason_id || !subject || !message) {
      return {
        success: false,
        ticket_id: null,
        message: "missing_required_fields"
      };
    }

    const now = this._nowIso();
    let tickets = this._getFromStorage("contact_tickets");
    const ticket = {
      id: this._generateId("ticket"),
      reason_id,
      subject,
      message,
      created_at: now,
      status: "open"
    };

    tickets.push(ticket);
    this._saveToStorage("contact_tickets", tickets);

    return {
      success: true,
      ticket_id: ticket.id,
      message: "contact_submitted"
    };
  }

  // getTermsOfUseContent
  getTermsOfUseContent() {
    const stored = this._getObjectFromStorage("terms_of_use_content", null) || {};
    return {
      last_updated: stored.last_updated || "",
      sections: Array.isArray(stored.sections) ? stored.sections : []
    };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const stored = this._getObjectFromStorage("privacy_policy_content", null) || {};
    return {
      last_updated: stored.last_updated || "",
      sections: Array.isArray(stored.sections) ? stored.sections : []
    };
  }

  // getSafetyTipsContent
  getSafetyTipsContent() {
    const stored = this._getObjectFromStorage("safety_tips_content", null) || {};
    const categories = Array.isArray(stored.categories) ? stored.categories : [];
    return { categories };
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
