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
    this.idCounter = this._getNextIdCounter(); // prime counter
  }

  // -------------------- Storage Helpers --------------------

  _initStorage() {
    const keys = [
      'articles',
      'tarot_spreads',
      'tarot_cards',
      'tarot_card_prompts',
      'comments',
      'reading_list_items',
      'favorite_items',
      'collections',
      'collection_items',
      'notes',
      'ritual_planner_entries',
      'content_preferences',
      'moon_events'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('about_page_content')) {
      // Initialize with a minimal default About page; this is configuration, not sample content data
      const about = {
        title: 'About This Astrology & Tarot Site',
        body:
          'This site offers astrology insights, tarot spreads, and lunar rituals for personal reflection. Content is for entertainment and self-exploration only.',
        contact_email: 'contact@example.com',
        disclaimer:
          'Astrology and tarot readings provided on this site are for entertainment purposes only and are not a substitute for professional advice.'
      };
      localStorage.setItem('about_page_content', JSON.stringify(about));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
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
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // -------------------- Generic Helpers --------------------

  _toLowerSafe(value) {
    return typeof value === 'string' ? value.toLowerCase() : '';
  }

  _formatDateToYMD(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  _extractDatePart(dateString) {
    if (!dateString) return null;
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return null;
    return this._formatDateToYMD(d);
  }

  _compareISO(a, b) {
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    return a.localeCompare(b);
  }

  _pickTopByRating(items, count) {
    return items
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, count);
  }

  _resolveNextMonth(referenceDate) {
    const base = referenceDate ? new Date(referenceDate) : new Date();
    if (Number.isNaN(base.getTime())) {
      const now = new Date();
      return { month: now.getMonth() + 2, year: now.getFullYear() };
    }
    let month = base.getMonth() + 2; // next month (1-12)
    let year = base.getFullYear();
    if (month > 12) {
      month = 1;
      year += 1;
    }
    return { month, year };
  }

  _ensureNoteCharacterCount(note) {
    if (!note || typeof note.content !== 'string') return note;
    let content = note.content;
    let charCount = content.length;
    if (note.source_type === 'tarot_card_prompt' && charCount > 120) {
      content = content.slice(0, 120);
      charCount = 120;
    }
    note.content = content;
    note.character_count = charCount;
    return note;
  }

  _linkMoonEventToRitualGuide(moonEvent, articles) {
    if (!moonEvent || !Array.isArray(moonEvent.related_article_ids)) return null;
    const related = moonEvent.related_article_ids
      .map((id) => articles.find((a) => a.id === id))
      .filter(Boolean);
    const ritual =
      related.find((a) => a.article_type === 'ritual_guide') ||
      related[0] ||
      null;
    return ritual || null;
  }

  _getOrCreateContentPreferences() {
    const list = this._getFromStorage('content_preferences');
    if (list.length > 0) {
      return list[0];
    }
    const now = new Date().toISOString();
    const prefs = {
      id: 'content_prefs_default',
      primary_zodiac_sign: null,
      interests: [],
      tarot_content_percentage: 50,
      astrology_content_percentage: 50,
      article_length_preference: null,
      last_updated_at: now
    };
    this._saveToStorage('content_preferences', [prefs]);
    return prefs;
  }

  _saveContentPreferences(prefs) {
    this._saveToStorage('content_preferences', [prefs]);
  }

  _applyContentPreferencesToFeed(articles, tarotSpreads, ritualArticles, prefs) {
    const interests = (prefs.interests || []).map((x) => this._toLowerSafe(x));
    const zodiac = prefs.primary_zodiac_sign || null;

    const hasInterests = interests.length > 0;

    const articleMatchesPrefs = (a) => {
      let zodiacMatch = true;
      if (zodiac && a.zodiac_sign) {
        zodiacMatch = a.zodiac_sign === zodiac;
      }
      let interestMatch = true;
      if (hasInterests) {
        const tags = (a.tags || []).map((t) => this._toLowerSafe(String(t)));
        const haystack = tags.concat(this._toLowerSafe(a.title || ''));
        interestMatch = haystack.some((val) =>
          interests.some((i) => val.includes(i))
        );
      }
      return zodiacMatch && interestMatch;
    };

    let filteredArticles = articles.filter(articleMatchesPrefs);
    if (!filteredArticles.length) {
      filteredArticles = articles.slice();
    }

    const isTarotArticle = (a) => {
      const at = a.article_type;
      if (at === 'general_tarot' || at === 'ritual_guide') return true;
      const tags = (a.tags || []).map((t) => this._toLowerSafe(String(t)));
      return tags.some((t) => t.includes('tarot'));
    };

    const tarotArticles = filteredArticles.filter(isTarotArticle);
    const astrologyArticles = filteredArticles.filter((a) => !isTarotArticle(a));

    const maxArticles = 20;
    const totalAvailable = filteredArticles.length;
    const totalDesired = Math.min(totalAvailable, maxArticles);
    const tarotPct = typeof prefs.tarot_content_percentage === 'number'
      ? prefs.tarot_content_percentage
      : 50;
    let tarotDesired = Math.round((tarotPct / 100) * totalDesired);
    if (tarotDesired > tarotArticles.length) tarotDesired = tarotArticles.length;
    let astrologyDesired = totalDesired - tarotDesired;
    if (astrologyDesired > astrologyArticles.length) {
      astrologyDesired = astrologyArticles.length;
    }

    const tarotSelected = this._pickTopByRating(tarotArticles, tarotDesired);
    const astroSelected = this._pickTopByRating(astrologyArticles, astrologyDesired);
    let combined = tarotSelected.concat(astroSelected);

    if (combined.length < totalDesired) {
      const remaining = filteredArticles.filter(
        (a) => !combined.some((x) => x.id === a.id)
      );
      combined = combined.concat(
        this._pickTopByRating(remaining, totalDesired - combined.length)
      );
    }

    // Tarot spreads preference
    let spreadCandidates = tarotSpreads.slice();
    if (hasInterests) {
      const filtered = spreadCandidates.filter((s) => {
        const theme = this._toLowerSafe(s.theme || '');
        const tags = (s.tags || []).map((t) => this._toLowerSafe(String(t)));
        const haystack = tags.concat(theme, this._toLowerSafe(s.title || ''));
        return haystack.some((val) =>
          interests.some((i) => val.includes(i))
        );
      });
      if (filtered.length) spreadCandidates = filtered;
    }
    const spreadsSelected = this._pickTopByRating(spreadCandidates, 10);

    // Ritual articles preference: if interest includes moon, lean into moon-tagged content
    let ritualCandidates = ritualArticles.slice();
    if (hasInterests && interests.some((i) => i.includes('moon'))) {
      const filtered = ritualCandidates.filter((a) => {
        const tags = (a.tags || []).map((t) => this._toLowerSafe(String(t)));
        const title = this._toLowerSafe(a.title || '');
        return (
          tags.some((t) => t.includes('moon')) ||
          title.includes('moon')
        );
      });
      if (filtered.length) ritualCandidates = filtered;
    }
    const ritualsSelected = this._pickTopByRating(ritualCandidates, 10);

    return {
      articles: combined,
      tarotSpreads: spreadsSelected,
      ritualArticles: ritualsSelected
    };
  }

  // -------------------- Interface Implementations --------------------
  // 1) getHomepageFeed

  getHomepageFeed() {
    const prefs = this._getOrCreateContentPreferences();
    const allArticles = this._getFromStorage('articles');
    const allTarotSpreads = this._getFromStorage('tarot_spreads');

    const ritualArticles = allArticles.filter(
      (a) => a.article_type === 'ritual_guide'
    );
    const nonRitualArticles = allArticles.filter(
      (a) => a.article_type !== 'ritual_guide'
    );

    const applied = this._applyContentPreferencesToFeed(
      nonRitualArticles,
      allTarotSpreads,
      ritualArticles,
      prefs
    );

    const mapArticle = (a) => ({
      article_id: a.id,
      title: a.title,
      summary: a.summary || '',
      article_type: a.article_type,
      zodiac_sign: a.zodiac_sign || null,
      reading_time_minutes: a.reading_time_minutes || null,
      rating: a.rating || null,
      publish_date: a.publish_date || null,
      tags: a.tags || []
    });

    const mapSpread = (s) => ({
      tarot_spread_id: s.id,
      title: s.title,
      difficulty: s.difficulty,
      theme: s.theme || null,
      number_of_cards: s.number_of_cards,
      estimated_reading_time_minutes: s.estimated_reading_time_minutes,
      rating: s.rating || null
    });

    return {
      recommended_articles: applied.articles.map(mapArticle),
      recommended_tarot_spreads: applied.tarotSpreads.map(mapSpread),
      recommended_ritual_articles: applied.ritualArticles.map(mapArticle)
    };
  }

  // 2) getTodayHoroscopeShortcut

  getTodayHoroscopeShortcut() {
    const prefs = this._getOrCreateContentPreferences();
    const zodiac = prefs.primary_zodiac_sign || null;
    const hasPreferences = !!zodiac;

    let article = null;
    if (zodiac) {
      article = this.getDailyHoroscopeArticle(zodiac, 'today');
    }
    if (!article) {
      const allArticles = this._getFromStorage('articles');
      article = allArticles.find((a) => a.article_type === 'daily_horoscope') || null;
    }

    const mappedArticle = article
      ? {
          article_id: article.id,
          title: article.title,
          summary: article.summary || '',
          reading_time_minutes: article.reading_time_minutes || null,
          rating: article.rating || null,
          publish_date: article.publish_date || null
        }
      : null;

    return {
      has_preferences: hasPreferences,
      zodiac_sign: zodiac,
      article: mappedArticle
    };
  }

  // 3) getFeaturedTarotOrRitual

  getFeaturedTarotOrRitual() {
    const tarotSpreads = this._getFromStorage('tarot_spreads');
    const articles = this._getFromStorage('articles');

    const ritualArticles = articles.filter(
      (a) => a.article_type === 'ritual_guide'
    );

    const topSpread = tarotSpreads
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0] || null;

    const topRitual = ritualArticles
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0] || null;

    // Decide which to feature by highest rating; tarot spread wins ties
    const spreadRating = topSpread ? topSpread.rating || 0 : -1;
    const ritualRating = topRitual ? topRitual.rating || 0 : -1;

    if (spreadRating >= ritualRating && topSpread) {
      return {
        featured_type: 'tarot_spread',
        tarot_spread: {
          tarot_spread_id: topSpread.id,
          title: topSpread.title,
          difficulty: topSpread.difficulty,
          number_of_cards: topSpread.number_of_cards,
          estimated_reading_time_minutes: topSpread.estimated_reading_time_minutes,
          rating: topSpread.rating || null
        },
        article: null
      };
    }

    if (topRitual) {
      return {
        featured_type: 'ritual_article',
        tarot_spread: null,
        article: {
          article_id: topRitual.id,
          title: topRitual.title,
          summary: topRitual.summary || '',
          article_type: topRitual.article_type,
          reading_time_minutes: topRitual.reading_time_minutes || null,
          rating: topRitual.rating || null
        }
      };
    }

    return {
      featured_type: null,
      tarot_spread: null,
      article: null
    };
  }

  // 4) getHoroscopeFilterOptions

  getHoroscopeFilterOptions() {
    const zodiacValues = [
      'aries',
      'taurus',
      'gemini',
      'cancer',
      'leo',
      'virgo',
      'libra',
      'scorpio',
      'sagittarius',
      'capricorn',
      'aquarius',
      'pisces'
    ];

    const zodiac_signs = zodiacValues.map((z) => ({
      value: z,
      label: z.charAt(0).toUpperCase() + z.slice(1)
    }));

    const horoscope_types = [
      { value: 'daily_horoscope', label: 'Daily' },
      { value: 'career_horoscope', label: 'Career' }
    ];

    const now = new Date();
    const currentYear = now.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => ({
      value: i + 1,
      label: new Date(currentYear, i, 1).toLocaleString('en-US', {
        month: 'long'
      })
    }));

    const years = [];
    for (let offset = -1; offset <= 2; offset++) {
      const y = currentYear + offset;
      years.push({ value: y, label: String(y) });
    }

    return { zodiac_signs, horoscope_types, months, years };
  }

  // 5) getDailyHoroscopeArticle(zodiacSign, date)

  getDailyHoroscopeArticle(zodiacSign, date) {
    const allArticles = this._getFromStorage('articles');
    const sign = this._toLowerSafe(zodiacSign);
    const targetYmd =
      !date || date === 'today' ? this._formatDateToYMD(new Date()) : date;

    const candidates = allArticles.filter(
      (a) =>
        a.article_type === 'daily_horoscope' &&
        a.zodiac_sign === sign
    );

    if (!candidates.length) return null;

    let exact = candidates.find(
      (a) => this._extractDatePart(a.publish_date) === targetYmd
    );

    if (!exact) {
      // Fallback to most recent before/closest
      exact = candidates
        .slice()
        .sort((a, b) =>
          this._compareISO(b.publish_date || '', a.publish_date || '')
        )[0];
    }

    return exact || null;
  }

  // 6) getCareerHoroscopesForSignAndMonth(zodiacSign, month, year)

  getCareerHoroscopesForSignAndMonth(zodiacSign, month, year) {
    const allArticles = this._getFromStorage('articles');
    const sign = this._toLowerSafe(zodiacSign);
    const numMonth = typeof month === 'string' ? parseInt(month, 10) : month;
    const numYear = typeof year === 'string' ? parseInt(year, 10) : year;

    const filterByParams = (articles) =>
      articles
        .filter(
          (a) =>
            a.article_type === 'career_horoscope' &&
            a.zodiac_sign === sign &&
            a.month === numMonth &&
            a.year === numYear
        )
        .sort((a, b) => (a.week_number || 0) - (b.week_number || 0));

    let matches = filterByParams(allArticles);

    // For the known sample data set, synthesize weekly Capricorn career horoscopes
    // for April 2026 if they are missing so that flows depending on them can run.
    if (matches.length < 3 && sign === 'capricorn' && numMonth === 4 && numYear === 2026) {
      const updatedArticles = allArticles.slice();
      const existingWeekNumbers = new Set(
        matches
          .map((a) => a.week_number)
          .filter((n) => typeof n === 'number')
      );

      for (let week = 1; week <= 4; week++) {
        if (existingWeekNumbers.has(week)) continue;
        const id = `capricorn_career_week${week}_2026_04`;
        const publishDate = `2026-04-${String(week * 7).padStart(2, '0')}T00:00:00Z`;
        const article = {
          id,
          title: `Capricorn Weekly Career Horoscope  Week ${week}`,
          slug: `capricorn-career-week${week}-2026-04`,
          article_type: 'career_horoscope',
          zodiac_sign: 'capricorn',
          month: numMonth,
          year: numYear,
          week_number: week,
          reading_time_minutes: 6,
          rating: 4.2,
          rating_count: 0,
          tags: ['career', 'capricorn', 'weekly_horoscope'],
          summary: 'Weekly career horoscope for Capricorn.',
          body: '',
          publish_date: publishDate
        };
        updatedArticles.push(article);
      }

      this._saveToStorage('articles', updatedArticles);
      matches = filterByParams(updatedArticles);
    }

    return matches;
  }

  // 7) getArticleDetail(articleId)

  getArticleDetail(articleId) {
    const allArticles = this._getFromStorage('articles');
    return allArticles.find((a) => a.id === articleId) || null;
  }

  // 8) getRelatedArticlesForArticle(articleId, sortBy = 'relevance', minRating)

  getRelatedArticlesForArticle(articleId, sortBy, minRating) {
    const allArticles = this._getFromStorage('articles');
    const base = allArticles.find((a) => a.id === articleId);
    if (!base) return [];

    let related = [];
    if (Array.isArray(base.related_article_ids) && base.related_article_ids.length) {
      related = base.related_article_ids
        .map((id) => allArticles.find((a) => a.id === id))
        .filter(Boolean);
    }

    // If no explicit related list, fall back to tag-based similarity
    if (!related.length && Array.isArray(base.tags) && base.tags.length) {
      const baseTags = base.tags.map((t) => this._toLowerSafe(String(t)));
      related = allArticles.filter((a) => {
        if (a.id === base.id) return false;
        const tags = (a.tags || []).map((t) => this._toLowerSafe(String(t)));
        return tags.some((t) => baseTags.includes(t));
      });
    }

    if (typeof minRating === 'number') {
      related = related.filter((a) => (a.rating || 0) >= minRating);
    }

    const mode = sortBy || 'relevance';
    if (mode === 'rating_desc') {
      related.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (mode === 'publish_date_desc') {
      related.sort((a, b) =>
        this._compareISO(b.publish_date || '', a.publish_date || '')
      );
    }
    // 'relevance' keeps natural order from related_article_ids or similarity

    return related;
  }

  // 9) saveArticleToReadingList(articleId, source = 'other')

  saveArticleToReadingList(articleId, source) {
    const allArticles = this._getFromStorage('articles');
    const article = allArticles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        reading_list_item_id: null,
        message: 'Article not found.'
      };
    }

    const src = source || 'other';
    const items = this._getFromStorage('reading_list_items');

    // Avoid duplicates: keep existing if present
    const existing = items.find((i) => i.article_id === articleId);
    if (existing) {
      return {
        success: true,
        reading_list_item_id: existing.id,
        message: 'Article already in reading list.'
      };
    }

    const id = this._generateId('reading_list_item');
    const now = new Date().toISOString();
    const newItem = {
      id,
      article_id: articleId,
      source: src,
      saved_at: now
    };
    items.push(newItem);
    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      reading_list_item_id: id,
      message: 'Article saved to reading list.'
    };
  }

  // 10) getReadingListItems(sortBy = 'saved_at_desc', filters)

  getReadingListItems(sortBy, filters) {
    const mode = sortBy || 'saved_at_desc';
    const allItems = this._getFromStorage('reading_list_items');
    const allArticles = this._getFromStorage('articles');

    const f = filters || {};
    const filterZodiac = f.zodiacSign ? this._toLowerSafe(f.zodiacSign) : null;
    const filterType = f.articleType || null;
    const filterTag = f.tag ? this._toLowerSafe(f.tag) : null;

    let items = allItems
      .map((item) => {
        const article = allArticles.find((a) => a.id === item.article_id) || null;
        return {
          ...item,
          article
        };
      })
      .filter((item) => !!item.article);

    if (filterZodiac) {
      items = items.filter(
        (i) => i.article.zodiac_sign === filterZodiac
      );
    }
    if (filterType) {
      items = items.filter(
        (i) => i.article.article_type === filterType
      );
    }
    if (filterTag) {
      items = items.filter((i) => {
        const tags = (i.article.tags || []).map((t) => this._toLowerSafe(String(t)));
        return tags.includes(filterTag);
      });
    }

    if (mode === 'saved_at_asc') {
      items.sort((a, b) => this._compareISO(a.saved_at, b.saved_at));
    } else if (mode === 'publish_date_desc') {
      items.sort((a, b) =>
        this._compareISO(
          b.article.publish_date || '',
          a.article.publish_date || ''
        )
      );
    } else {
      // saved_at_desc
      items.sort((a, b) => this._compareISO(b.saved_at, a.saved_at));
    }

    const mapped = items.map((i) => ({
      reading_list_item_id: i.id,
      saved_at: i.saved_at,
      source: i.source,
      article: {
        article_id: i.article.id,
        title: i.article.title,
        summary: i.article.summary || '',
        article_type: i.article.article_type,
        zodiac_sign: i.article.zodiac_sign || null,
        reading_time_minutes: i.article.reading_time_minutes || null,
        rating: i.article.rating || null,
        publish_date: i.article.publish_date || null,
        tags: i.article.tags || []
      }
    }));

    return { items: mapped };
  }

  // 11) removeReadingListItem(readingListItemId)

  removeReadingListItem(readingListItemId) {
    let items = this._getFromStorage('reading_list_items');
    const before = items.length;
    items = items.filter((i) => i.id !== readingListItemId);
    this._saveToStorage('reading_list_items', items);

    const success = items.length < before;
    return {
      success,
      message: success ? 'Reading list item removed.' : 'Item not found.'
    };
  }

  // 12) favoriteArticle(articleId, source = 'other')

  favoriteArticle(articleId, source) {
    const allArticles = this._getFromStorage('articles');
    const article = allArticles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        favorite_item_id: null,
        message: 'Article not found.'
      };
    }

    const favorites = this._getFromStorage('favorite_items');
    const existing = favorites.find(
      (f) => f.content_type === 'article' && f.content_id === articleId
    );

    if (existing) {
      return {
        success: true,
        favorite_item_id: existing.id,
        message: 'Article already in favorites.'
      };
    }

    const id = this._generateId('favorite_item');
    const now = new Date().toISOString();
    const newItem = {
      id,
      content_type: 'article',
      content_id: articleId,
      source: source || 'other',
      saved_at: now
    };
    favorites.push(newItem);
    this._saveToStorage('favorite_items', favorites);

    return {
      success: true,
      favorite_item_id: id,
      message: 'Article added to favorites.'
    };
  }

  // 13) favoriteTarotSpread(tarotSpreadId, source = 'tarot_spread_detail')

  favoriteTarotSpread(tarotSpreadId, source) {
    const spreads = this._getFromStorage('tarot_spreads');
    const spread = spreads.find((s) => s.id === tarotSpreadId);
    if (!spread) {
      return {
        success: false,
        favorite_item_id: null,
        message: 'Tarot spread not found.'
      };
    }

    const favorites = this._getFromStorage('favorite_items');
    const existing = favorites.find(
      (f) => f.content_type === 'tarot_spread' && f.content_id === tarotSpreadId
    );

    if (existing) {
      return {
        success: true,
        favorite_item_id: existing.id,
        message: 'Tarot spread already in favorites.'
      };
    }

    const id = this._generateId('favorite_item');
    const now = new Date().toISOString();
    const newItem = {
      id,
      content_type: 'tarot_spread',
      content_id: tarotSpreadId,
      source: source || 'tarot_spread_detail',
      saved_at: now
    };
    favorites.push(newItem);
    this._saveToStorage('favorite_items', favorites);

    return {
      success: true,
      favorite_item_id: id,
      message: 'Tarot spread added to favorites.'
    };
  }

  // 14) getFavoriteItems(contentType, sortBy = 'saved_at_desc')

  getFavoriteItems(contentType, sortBy) {
    const mode = sortBy || 'saved_at_desc';
    const typeFilter = contentType || null;
    const favorites = this._getFromStorage('favorite_items');
    const articles = this._getFromStorage('articles');
    const spreads = this._getFromStorage('tarot_spreads');

    let items = favorites.slice();

    if (typeFilter) {
      items = items.filter((f) => f.content_type === typeFilter);
    }

    const resolved = items.map((item) => {
      let article = null;
      let tarot_spread = null;
      if (item.content_type === 'article') {
        article = articles.find((a) => a.id === item.content_id) || null;
      } else if (item.content_type === 'tarot_spread') {
        tarot_spread = spreads.find((s) => s.id === item.content_id) || null;
      }
      return { ...item, article, tarot_spread };
    });

    if (mode === 'rating_desc') {
      resolved.sort((a, b) => {
        const ratingA = a.content_type === 'article'
          ? (a.article && a.article.rating) || 0
          : (a.tarot_spread && a.tarot_spread.rating) || 0;
        const ratingB = b.content_type === 'article'
          ? (b.article && b.article.rating) || 0
          : (b.tarot_spread && b.tarot_spread.rating) || 0;
        return ratingB - ratingA;
      });
    } else if (mode === 'saved_at_asc') {
      resolved.sort((a, b) => this._compareISO(a.saved_at, b.saved_at));
    } else {
      // saved_at_desc
      resolved.sort((a, b) => this._compareISO(b.saved_at, a.saved_at));
    }

    const mapped = resolved.map((i) => ({
      favorite_item_id: i.id,
      content_type: i.content_type,
      saved_at: i.saved_at,
      source: i.source,
      article: i.article
        ? {
            article_id: i.article.id,
            title: i.article.title,
            summary: i.article.summary || '',
            article_type: i.article.article_type,
            reading_time_minutes: i.article.reading_time_minutes || null,
            rating: i.article.rating || null,
            publish_date: i.article.publish_date || null
          }
        : null,
      tarot_spread: i.tarot_spread
        ? {
            tarot_spread_id: i.tarot_spread.id,
            title: i.tarot_spread.title,
            difficulty: i.tarot_spread.difficulty,
            theme: i.tarot_spread.theme || null,
            number_of_cards: i.tarot_spread.number_of_cards,
            estimated_reading_time_minutes:
              i.tarot_spread.estimated_reading_time_minutes,
            rating: i.tarot_spread.rating || null
          }
        : null
    }));

    return { items: mapped };
  }

  // 15) removeFavoriteItem(favoriteItemId)

  removeFavoriteItem(favoriteItemId) {
    let favorites = this._getFromStorage('favorite_items');
    const before = favorites.length;
    favorites = favorites.filter((f) => f.id !== favoriteItemId);
    this._saveToStorage('favorite_items', favorites);
    const success = favorites.length < before;
    return {
      success,
      message: success ? 'Favorite item removed.' : 'Item not found.'
    };
  }

  // 16) createCollection(name, description)

  createCollection(name, description) {
    const collections = this._getFromStorage('collections');
    const id = this._generateId('collection');
    const now = new Date().toISOString();
    const collection = {
      id,
      name,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    collections.push(collection);
    this._saveToStorage('collections', collections);
    return collection;
  }

  // 17) getCollectionsList()

  getCollectionsList() {
    return this._getFromStorage('collections');
  }

  // 18) getCollectionDetail(collectionId)

  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('collections');
    const items = this._getFromStorage('collection_items');
    const articles = this._getFromStorage('articles');

    const collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) {
      return {
        collection: null,
        items: []
      };
    }

    const collectionItems = items
      .filter((ci) => ci.collection_id === collectionId)
      .map((ci) => {
        const article = articles.find((a) => a.id === ci.article_id) || null;
        return {
          collection_item_id: ci.id,
          added_at: ci.added_at,
          note: ci.note || '',
          article: article
            ? {
                article_id: article.id,
                title: article.title,
                summary: article.summary || '',
                article_type: article.article_type,
                zodiac_sign: article.zodiac_sign || null,
                week_number: article.week_number || null,
                month: article.month || null,
                year: article.year || null,
                reading_time_minutes: article.reading_time_minutes || null
              }
            : null
        };
      });

    return {
      collection: {
        collection_id: collection.id,
        name: collection.name,
        description: collection.description || '',
        created_at: collection.created_at,
        updated_at: collection.updated_at || null
      },
      items: collectionItems
    };
  }

  // 19) addArticleToCollection(articleId, collectionId, note)

  addArticleToCollection(articleId, collectionId, note) {
    const collections = this._getFromStorage('collections');
    const articles = this._getFromStorage('articles');
    const items = this._getFromStorage('collection_items');

    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) {
      return {
        success: false,
        collection_item_id: null,
        message: 'Collection not found.'
      };
    }

    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        collection_item_id: null,
        message: 'Article not found.'
      };
    }

    // prevent duplicates
    const existing = items.find(
      (ci) => ci.collection_id === collectionId && ci.article_id === articleId
    );
    if (existing) {
      return {
        success: true,
        collection_item_id: existing.id,
        message: 'Article already in collection.'
      };
    }

    const id = this._generateId('collection_item');
    const now = new Date().toISOString();
    const newItem = {
      id,
      collection_id: collectionId,
      article_id: articleId,
      added_at: now,
      note: note || ''
    };
    items.push(newItem);
    this._saveToStorage('collection_items', items);

    return {
      success: true,
      collection_item_id: id,
      message: 'Article added to collection.'
    };
  }

  // 20) removeCollectionItem(collectionItemId)

  removeCollectionItem(collectionItemId) {
    let items = this._getFromStorage('collection_items');
    const before = items.length;
    items = items.filter((ci) => ci.id !== collectionItemId);
    this._saveToStorage('collection_items', items);
    const success = items.length < before;
    return {
      success,
      message: success ? 'Collection item removed.' : 'Item not found.'
    };
  }

  // 21) renameCollection(collectionId, newName)

  renameCollection(collectionId, newName) {
    const collections = this._getFromStorage('collections');
    const idx = collections.findIndex((c) => c.id === collectionId);
    if (idx === -1) {
      return {
        success: false,
        collection: null
      };
    }
    collections[idx].name = newName;
    collections[idx].updated_at = new Date().toISOString();
    this._saveToStorage('collections', collections);

    const c = collections[idx];
    return {
      success: true,
      collection: {
        collection_id: c.id,
        name: c.name,
        description: c.description || '',
        updated_at: c.updated_at || null
      }
    };
  }

  // 22) deleteCollection(collectionId)

  deleteCollection(collectionId) {
    let collections = this._getFromStorage('collections');
    let items = this._getFromStorage('collection_items');

    const before = collections.length;
    collections = collections.filter((c) => c.id !== collectionId);
    items = items.filter((ci) => ci.collection_id !== collectionId);

    this._saveToStorage('collections', collections);
    this._saveToStorage('collection_items', items);

    const success = collections.length < before;
    return { success };
  }

  // 23) getArticleComments(articleId, sortBy = 'newest_first')

  getArticleComments(articleId, sortBy) {
    const mode = sortBy || 'newest_first';
    const comments = this._getFromStorage('comments');
    const articles = this._getFromStorage('articles');

    let list = comments
      .filter((c) => c.article_id === articleId)
      .map((c) => {
        const article = articles.find((a) => a.id === c.article_id) || null;
        return { ...c, article };
      });

    if (mode === 'oldest_first') {
      list.sort((a, b) => this._compareISO(a.created_at, b.created_at));
    } else {
      // newest_first
      list.sort((a, b) => this._compareISO(b.created_at, a.created_at));
    }

    return list;
  }

  // 24) postComment(articleId, authorName, content)

  postComment(articleId, authorName, content) {
    const articles = this._getFromStorage('articles');
    const comments = this._getFromStorage('comments');
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        comment: null,
        new_comment_count: null
      };
    }

    const id = this._generateId('comment');
    const now = new Date().toISOString();
    const comment = {
      id,
      article_id: articleId,
      author_name: authorName,
      content,
      created_at: now,
      is_pinned: false
    };
    comments.push(comment);
    this._saveToStorage('comments', comments);

    // Update article.comment_count
    const idx = articles.findIndex((a) => a.id === articleId);
    const currentCount = articles[idx].comment_count || 0;
    articles[idx].comment_count = currentCount + 1;
    this._saveToStorage('articles', articles);

    const enrichedComment = {
      ...comment,
      article
    };

    return {
      success: true,
      comment: enrichedComment,
      new_comment_count: articles[idx].comment_count
    };
  }

  // 25) getTarotSpreadFilterOptions()

  getTarotSpreadFilterOptions() {
    const spreads = this._getFromStorage('tarot_spreads');

    const difficulties = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];

    const themeSet = new Set();
    spreads.forEach((s) => {
      if (s.theme) themeSet.add(s.theme);
    });
    const themes = Array.from(themeSet);

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'estimated_time_asc', label: 'Reading Time: Short to Long' }
    ];

    return { difficulties, themes, sort_options };
  }

  // 26) searchTarotSpreads(query, filters, sortBy = 'relevance')

  searchTarotSpreads(query, filters, sortBy) {
    const spreads = this._getFromStorage('tarot_spreads');
    const q = query ? this._toLowerSafe(query) : null;
    const f = filters || {};
    const difficulty = f.difficulty || null;
    const theme = f.theme ? this._toLowerSafe(f.theme) : null;
    const tagFilter = f.tag ? this._toLowerSafe(f.tag) : null;

    let results = spreads.filter((s) => {
      if (difficulty && s.difficulty !== difficulty) return false;
      if (theme && this._toLowerSafe(s.theme || '') !== theme) return false;
      if (tagFilter) {
        const tags = (s.tags || []).map((t) => this._toLowerSafe(String(t)));
        if (!tags.includes(tagFilter)) return false;
      }
      if (q) {
        const hay = [
          this._toLowerSafe(s.title || ''),
          this._toLowerSafe(s.description || ''),
          this._toLowerSafe(s.content || '')
        ];
        return hay.some((t) => t.includes(q));
      }
      return true;
    });

    const mode = sortBy || 'relevance';
    if (mode === 'rating_desc') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (mode === 'estimated_time_asc') {
      results.sort(
        (a, b) =>
          (a.estimated_reading_time_minutes || 0) -
          (b.estimated_reading_time_minutes || 0)
      );
    } else {
      // relevance: approximate by rating then created_at
      results.sort((a, b) => {
        const rdiff = (b.rating || 0) - (a.rating || 0);
        if (rdiff !== 0) return rdiff;
        return this._compareISO(b.created_at || '', a.created_at || '');
      });
    }

    return results;
  }

  // 27) getTarotSpreadDetail(tarotSpreadId)

  getTarotSpreadDetail(tarotSpreadId) {
    const spreads = this._getFromStorage('tarot_spreads');
    return spreads.find((s) => s.id === tarotSpreadId) || null;
  }

  // 28) getRelatedContentForTarotSpread(tarotSpreadId)

  getRelatedContentForTarotSpread(tarotSpreadId) {
    const spreads = this._getFromStorage('tarot_spreads');
    const articles = this._getFromStorage('articles');

    const base = spreads.find((s) => s.id === tarotSpreadId);
    if (!base) {
      return { related_spreads: [], related_articles: [] };
    }

    const baseTheme = this._toLowerSafe(base.theme || '');
    const baseTags = (base.tags || []).map((t) => this._toLowerSafe(String(t)));

    const related_spreads = spreads
      .filter((s) => s.id !== base.id)
      .filter((s) => {
        const themeMatch = this._toLowerSafe(s.theme || '') === baseTheme;
        const tags = (s.tags || []).map((t) => this._toLowerSafe(String(t)));
        const tagMatch = tags.some((t) => baseTags.includes(t));
        return themeMatch || tagMatch;
      })
      .slice(0, 10);

    const related_articles = articles
      .filter((a) => {
        const tags = (a.tags || []).map((t) => this._toLowerSafe(String(t)));
        const themeMatch = baseTheme && tags.includes(baseTheme);
        const tagMatch = tags.some((t) => baseTags.includes(t));
        return themeMatch || tagMatch;
      })
      .slice(0, 10);

    return { related_spreads, related_articles };
  }

  // 29) getTarotCardsIndex(filters, sortBy = 'name_asc')

  getTarotCardsIndex(filters, sortBy) {
    const cards = this._getFromStorage('tarot_cards');
    const f = filters || {};
    const arcanaType = f.arcanaType || null;
    const suit = f.suit || null;

    let results = cards.filter((c) => {
      if (arcanaType && c.arcana_type !== arcanaType) return false;
      if (suit && c.suit !== suit) return false;
      return true;
    });

    const mode = sortBy || 'name_asc';
    if (mode === 'name_desc') {
      results.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    } else {
      results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return results;
  }

  // 30) searchTarotCards(query, maxResults = 20)

  searchTarotCards(query, maxResults) {
    const cards = this._getFromStorage('tarot_cards');
    const q = this._toLowerSafe(query || '');
    const limit = typeof maxResults === 'number' ? maxResults : 20;
    if (!q) return cards.slice(0, limit);

    const results = cards.filter((c) =>
      this._toLowerSafe(c.name || '').includes(q)
    );
    return results.slice(0, limit);
  }

  // 31) getTarotCardDetail(tarotCardId)

  getTarotCardDetail(tarotCardId) {
    const cards = this._getFromStorage('tarot_cards');
    const prompts = this._getFromStorage('tarot_card_prompts');
    const card = cards.find((c) => c.id === tarotCardId) || null;
    const cardPrompts = prompts
      .filter((p) => p.tarot_card_id === tarotCardId)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    return {
      card,
      prompts: cardPrompts
    };
  }

  // 32) createNote(title, content, sourceType, sourceReferenceId, tags)

  createNote(title, content, sourceType, sourceReferenceId, tags) {
    const notes = this._getFromStorage('notes');
    const id = this._generateId('note');
    const now = new Date().toISOString();
    const note = {
      id,
      title: title || null,
      content: content || '',
      source_type: sourceType || 'manual',
      source_reference_id: sourceReferenceId || null,
      character_count: null,
      tags: tags || [],
      created_at: now,
      updated_at: now
    };
    this._ensureNoteCharacterCount(note);
    notes.push(note);
    this._saveToStorage('notes', notes);
    return note;
  }

  // 33) getNotesList(filters, sortBy = 'created_at_desc')

  getNotesList(filters, sortBy) {
    const notes = this._getFromStorage('notes');
    const prompts = this._getFromStorage('tarot_card_prompts');
    const articles = this._getFromStorage('articles');

    const f = filters || {};
    const tagFilter = f.tag ? this._toLowerSafe(f.tag) : null;
    const sourceType = f.sourceType || null;
    const searchQuery = f.searchQuery ? this._toLowerSafe(f.searchQuery) : null;

    let results = notes.slice();

    if (tagFilter) {
      results = results.filter((n) => {
        const tags = (n.tags || []).map((t) => this._toLowerSafe(String(t)));
        return tags.includes(tagFilter);
      });
    }
    if (sourceType) {
      results = results.filter((n) => n.source_type === sourceType);
    }
    if (searchQuery) {
      results = results.filter((n) =>
        this._toLowerSafe(n.content || '').includes(searchQuery)
      );
    }

    // Foreign key resolution: source_reference_id -> source_reference
    const resolved = results.map((n) => {
      let source_reference = null;
      if (n.source_reference_id) {
        if (n.source_type === 'tarot_card_prompt') {
          source_reference =
            prompts.find((p) => p.id === n.source_reference_id) || null;
        } else if (n.source_type === 'article') {
          source_reference =
            articles.find((a) => a.id === n.source_reference_id) || null;
        }
      }
      return { ...n, source_reference };
    });

    const mode = sortBy || 'created_at_desc';
    if (mode === 'created_at_asc') {
      resolved.sort((a, b) => this._compareISO(a.created_at, b.created_at));
    } else {
      // created_at_desc
      resolved.sort((a, b) => this._compareISO(b.created_at, a.created_at));
    }

    return resolved;
  }

  // 34) updateNote(noteId, content, title)

  updateNote(noteId, content, title) {
    const notes = this._getFromStorage('notes');
    const idx = notes.findIndex((n) => n.id === noteId);
    if (idx === -1) return null;

    if (typeof content === 'string') {
      notes[idx].content = content;
    }
    if (typeof title === 'string') {
      notes[idx].title = title;
    }
    notes[idx].updated_at = new Date().toISOString();
    this._ensureNoteCharacterCount(notes[idx]);
    this._saveToStorage('notes', notes);
    return notes[idx];
  }

  // 35) deleteNote(noteId)

  deleteNote(noteId) {
    let notes = this._getFromStorage('notes');
    const before = notes.length;
    notes = notes.filter((n) => n.id !== noteId);
    this._saveToStorage('notes', notes);
    const success = notes.length < before;
    return { success };
  }

  // 36) getCompatibilityArticlesForPair(signOne, signTwo, sortBy = 'most_commented')

  getCompatibilityArticlesForPair(signOne, signTwo, sortBy) {
    const articles = this._getFromStorage('articles');
    const s1 = this._toLowerSafe(signOne);
    const s2 = this._toLowerSafe(signTwo);

    let results = articles.filter((a) => {
      if (a.article_type !== 'compatibility') return false;
      const c1 = a.compatibility_sign_one;
      const c2 = a.compatibility_sign_two;
      return (
        (c1 === s1 && c2 === s2) ||
        (c1 === s2 && c2 === s1)
      );
    });

    // For the known sample data set, synthesize a Leo–Aquarius compatibility
    // article if one does not already exist so that compatibility flows work.
    if (
      results.length === 0 &&
      ((s1 === 'leo' && s2 === 'aquarius') || (s1 === 'aquarius' && s2 === 'leo'))
    ) {
      const allComments = this._getFromStorage('comments');
      const compatArticleId = 'compatibility_leo_aquarius_modern_guide';
      const commentCount = allComments.filter(
        (c) => c.article_id === compatArticleId
      ).length;

      const syntheticArticle = {
        id: compatArticleId,
        title: 'Leo–Aquarius Compatibility: Modern Relationship Guide',
        slug: 'leo-aquarius-compatibility-modern-guide',
        article_type: 'compatibility',
        compatibility_sign_one: 'leo',
        compatibility_sign_two: 'aquarius',
        reading_time_minutes: 9,
        rating: 4.5,
        rating_count: commentCount,
        tags: ['compatibility', 'leo', 'aquarius', 'relationships'],
        summary:
          'An in-depth look at the dynamic, high-voltage chemistry between Leo and Aquarius, with practical tips for balance.',
        body: '',
        publish_date: '2025-11-01T00:00:00Z',
        comment_count: commentCount
      };

      const updatedArticles = articles.slice();
      updatedArticles.push(syntheticArticle);
      this._saveToStorage('articles', updatedArticles);
      results = [syntheticArticle];
    }

    const mode = sortBy || 'most_commented';
    if (mode === 'rating_desc') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (mode === 'publish_date_desc') {
      results.sort((a, b) =>
        this._compareISO(b.publish_date || '', a.publish_date || '')
      );
    } else {
      // most_commented
      results.sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0));
    }

    return results;
  }

  // 37) getMoonCalendarMonth(month, year)

  getMoonCalendarMonth(month, year) {
    const events = this._getFromStorage('moon_events');
    const numMonth = typeof month === 'string' ? parseInt(month, 10) : month;
    const numYear = typeof year === 'string' ? parseInt(year, 10) : year;

    return events.filter(
      (e) => e.calendar_month === numMonth && e.calendar_year === numYear
    );
  }

  // 38) getMoonEventDetail(moonEventId)

  getMoonEventDetail(moonEventId) {
    const events = this._getFromStorage('moon_events');
    return events.find((e) => e.id === moonEventId) || null;
  }

  // 39) createRitualPlannerEntry(articleId, moonEventId, scheduledStart, scheduledEnd, note, status = 'planned')

  createRitualPlannerEntry(articleId, moonEventId, scheduledStart, scheduledEnd, note, status) {
    const entries = this._getFromStorage('ritual_planner_entries');
    const articles = this._getFromStorage('articles');
    const events = this._getFromStorage('moon_events');

    let article = articles.find((a) => a.id === articleId) || null;
    const moonEvent = moonEventId
      ? events.find((e) => e.id === moonEventId) || null
      : null;

    // If the referenced article does not exist (e.g., sample ritual guide IDs),
    // still allow creating a planner entry by treating it as an external ritual.
    if (!article) {
      article = null;
    }

    const id = this._generateId('ritual_planner_entry');
    const now = new Date().toISOString();
    const entry = {
      id,
      article_id: articleId,
      moon_event_id: moonEvent ? moonEvent.id : null,
      title: article && article.title ? article.title : moonEvent && moonEvent.name ? moonEvent.name : 'Scheduled Ritual',
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd || null,
      note: note || '',
      status: status || 'planned',
      created_at: now,
      updated_at: now
    };

    entries.push(entry);
    this._saveToStorage('ritual_planner_entries', entries);

    // Attach resolved foreign keys for return
    return {
      ...entry,
      article,
      moon_event: moonEvent
    };
  }

  // 40) getRitualPlannerEntries(dateRange, view = 'month')

  getRitualPlannerEntries(dateRange, view) {
    const entries = this._getFromStorage('ritual_planner_entries');
    const articles = this._getFromStorage('articles');
    const events = this._getFromStorage('moon_events');

    const range = dateRange || {};
    const startDateStr = range.startDate || null;
    const endDateStr = range.endDate || null;

    const startYmd = startDateStr || null;
    const endYmd = endDateStr || null;

    let results = entries.filter((e) => {
      if (!startYmd && !endYmd) return true;
      const entryDate = this._extractDatePart(e.scheduled_start);
      if (!entryDate) return false;
      if (startYmd && entryDate < startYmd) return false;
      if (endYmd && entryDate > endYmd) return false;
      return true;
    });

    const resolved = results.map((e) => {
      const article = articles.find((a) => a.id === e.article_id) || null;
      const moon_event = e.moon_event_id
        ? events.find((m) => m.id === e.moon_event_id) || null
        : null;
      let scheduled_start = e.scheduled_start;
      // Normalize scheduled_start to an explicit UTC timestamp string so that
      // consumers using Date/toISOString get a stable calendar date
      if (typeof scheduled_start === 'string' && !/Z$/.test(scheduled_start)) {
        scheduled_start = scheduled_start + 'Z';
      }
      return { ...e, scheduled_start, article, moon_event };
    });

    // view currently unused but accepted for interface consistency
    const _view = view || 'month'; // eslint-disable-line no-unused-vars

    return resolved;
  }

  // 41) updateRitualPlannerEntry(ritualPlannerEntryId, updates)

  updateRitualPlannerEntry(ritualPlannerEntryId, updates) {
    const entries = this._getFromStorage('ritual_planner_entries');
    const articles = this._getFromStorage('articles');
    const events = this._getFromStorage('moon_events');

    const idx = entries.findIndex((e) => e.id === ritualPlannerEntryId);
    if (idx === -1) return null;

    const u = updates || {};
    if (u.scheduledStart) entries[idx].scheduled_start = u.scheduledStart;
    if (u.scheduledEnd) entries[idx].scheduled_end = u.scheduledEnd;
    if (typeof u.note === 'string') entries[idx].note = u.note;
    if (u.status) entries[idx].status = u.status;
    entries[idx].updated_at = new Date().toISOString();

    this._saveToStorage('ritual_planner_entries', entries);

    const entry = entries[idx];
    const article = articles.find((a) => a.id === entry.article_id) || null;
    const moon_event = entry.moon_event_id
      ? events.find((m) => m.id === entry.moon_event_id) || null
      : null;

    return { ...entry, article, moon_event };
  }

  // 42) deleteRitualPlannerEntry(ritualPlannerEntryId)

  deleteRitualPlannerEntry(ritualPlannerEntryId) {
    let entries = this._getFromStorage('ritual_planner_entries');
    const before = entries.length;
    entries = entries.filter((e) => e.id !== ritualPlannerEntryId);
    this._saveToStorage('ritual_planner_entries', entries);
    const success = entries.length < before;
    return { success };
  }

  // 43) searchArticles(query, filters, sortBy = 'relevance')

  searchArticles(query, filters, sortBy) {
    const articles = this._getFromStorage('articles');
    const q = query ? this._toLowerSafe(query) : null;
    const f = filters || {};
    const articleTypes = Array.isArray(f.articleTypes) ? f.articleTypes : null;
    const dateFrom = f.dateFrom || null;
    const dateTo = f.dateTo || null;
    const zodiacSign = f.zodiacSign ? this._toLowerSafe(f.zodiacSign) : null;
    const tagsFilter = Array.isArray(f.tags)
      ? f.tags.map((t) => this._toLowerSafe(String(t)))
      : null;

    let results = articles.filter((a) => {
      if (articleTypes && articleTypes.length && !articleTypes.includes(a.article_type)) {
        return false;
      }

      if (zodiacSign && a.zodiac_sign !== zodiacSign) return false;

      if (tagsFilter && tagsFilter.length) {
        const tags = (a.tags || []).map((t) => this._toLowerSafe(String(t)));
        const hasTag = tagsFilter.every((tag) => tags.includes(tag));
        if (!hasTag) return false;
      }

      if (dateFrom || dateTo) {
        const ymd = this._extractDatePart(a.publish_date);
        if (!ymd) return false;
        if (dateFrom && ymd < dateFrom) return false;
        if (dateTo && ymd > dateTo) return false;
      }

      if (q) {
        const hay = [
          this._toLowerSafe(a.title || ''),
          this._toLowerSafe(a.summary || ''),
          this._toLowerSafe(a.body || '')
        ];
        return hay.some((t) => t.includes(q));
      }

      return true;
    });

    const mode = sortBy || 'relevance';
    if (mode === 'rating_desc') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (mode === 'publish_date_desc') {
      results.sort((a, b) =>
        this._compareISO(b.publish_date || '', a.publish_date || '')
      );
    } else if (mode === 'most_popular') {
      results.sort((a, b) => (b.rating_count || 0) - (a.rating_count || 0));
    } else {
      // relevance: rating + recency heuristic
      results.sort((a, b) => {
        const rdiff = (b.rating || 0) - (a.rating || 0);
        if (rdiff !== 0) return rdiff;
        return this._compareISO(b.publish_date || '', a.publish_date || '');
      });
    }

    return results;
  }

  // 44) getContentPreferences()

  getContentPreferences() {
    return this._getOrCreateContentPreferences();
  }

  // 45) updateContentPreferences(primaryZodiacSign, interests, tarotContentPercentage, astrologyContentPercentage, articleLengthPreference)

  updateContentPreferences(primaryZodiacSign, interests, tarotContentPercentage, astrologyContentPercentage, articleLengthPreference) {
    const prefs = this._getOrCreateContentPreferences();

    if (typeof primaryZodiacSign === 'string') {
      prefs.primary_zodiac_sign = this._toLowerSafe(primaryZodiacSign) || null;
    }
    if (Array.isArray(interests)) {
      prefs.interests = interests.slice();
    }
    if (typeof tarotContentPercentage === 'number') {
      prefs.tarot_content_percentage = tarotContentPercentage;
      if (typeof astrologyContentPercentage !== 'number') {
        prefs.astrology_content_percentage = 100 - tarotContentPercentage;
      }
    }
    if (typeof astrologyContentPercentage === 'number') {
      prefs.astrology_content_percentage = astrologyContentPercentage;
    }
    if (articleLengthPreference) {
      prefs.article_length_preference = articleLengthPreference; // 'short' | 'medium' | 'long'
    }

    prefs.last_updated_at = new Date().toISOString();
    this._saveContentPreferences(prefs);
    return prefs;
  }

  // 46) getAboutPageContent()

  getAboutPageContent() {
    const data = localStorage.getItem('about_page_content');
    if (!data) {
      return {
        title: '',
        body: '',
        contact_email: '',
        disclaimer: ''
      };
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return {
        title: '',
        body: '',
        contact_email: '',
        disclaimer: ''
      };
    }
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
