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

  _initStorage() {
    const keys = [
      'programming_languages',
      'categories',
      'tags',
      'posts',
      'code_blocks',
      'comments',
      'bookmarks',
      'reading_list_items',
      'series',
      'series_parts',
      'newsletter_subscriptions',
      'contact_messages',
      'about_page_content'
    ];
    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        if (key === 'about_page_content') {
          // Seed minimal about page content if missing
          const about = {
            title: 'About this blog',
            body: 'Welcome to this programming tutorials blog. Content is loaded from localStorage.',
            author_name: 'Blog Author',
            author_bio: 'Software developer sharing tutorials and articles about programming.'
          };
          localStorage.setItem(key, JSON.stringify(about));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
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

  _getOrCreateBookmarkStore() {
    let bookmarks = this._getFromStorage('bookmarks');
    if (!Array.isArray(bookmarks)) {
      bookmarks = [];
      this._saveToStorage('bookmarks', bookmarks);
    }
    return bookmarks;
  }

  _getOrCreateReadingListStore() {
    let items = this._getFromStorage('reading_list_items');
    if (!Array.isArray(items)) {
      items = [];
      this._saveToStorage('reading_list_items', items);
    }
    return items;
  }

  _calculateNextReadingListPosition(readingListItems) {
    if (!Array.isArray(readingListItems) || readingListItems.length === 0) {
      return 1;
    }
    const maxPos = readingListItems.reduce(function (max, item) {
      return item.position > max ? item.position : max;
    }, 0);
    return maxPos + 1;
  }

  _incrementPostCommentCount(postId) {
    const posts = this._getFromStorage('posts');
    let updatedCount = 0;
    const updatedPosts = posts.map(function (post) {
      if (post.id === postId) {
        const current = typeof post.comment_count === 'number' ? post.comment_count : 0;
        const next = current + 1;
        updatedCount = next;
        return Object.assign({}, post, { comment_count: next });
      }
      return post;
    });
    this._saveToStorage('posts', updatedPosts);
    return updatedCount;
  }

  _getMonthLabel(month) {
    const labels = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ];
    return labels[month - 1] || String(month);
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  // Interface: getHomePageContent()
  getHomePageContent() {
    const posts = this._getFromStorage('posts');
    const languages = this._getFromStorage('programming_languages');
    const categories = this._getFromStorage('categories');
    const tags = this._getFromStorage('tags');

    const tutorials = posts.filter(function (p) {
      return p.content_type === 'tutorial';
    });

    // featured_posts: top 5 by comment_count
    const featuredSorted = tutorials.slice().sort(function (a, b) {
      return (b.comment_count || 0) - (a.comment_count || 0);
    });
    const featured_posts = featuredSorted.slice(0, 5).map(function (post) {
      const lang = languages.find(function (l) { return l.id === post.language_id; });
      const cat = categories.find(function (c) { return c.id === post.category_id; });
      return {
        post_id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        reading_time_minutes: post.reading_time_minutes,
        comment_count: post.comment_count,
        published_at: post.published_at,
        language_name: lang ? lang.name : null,
        category_name: cat ? cat.name : null,
        difficulty: post.difficulty,
        content_type: post.content_type
      };
    });

    // latest_posts: latest 10 by published_at
    const latestSorted = tutorials.slice().sort(function (a, b) {
      const da = new Date(a.published_at);
      const db = new Date(b.published_at);
      return db.getTime() - da.getTime();
    });
    const latest_posts = latestSorted.slice(0, 10).map(function (post) {
      const lang = languages.find(function (l) { return l.id === post.language_id; });
      const cat = categories.find(function (c) { return c.id === post.category_id; });
      return {
        post_id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        reading_time_minutes: post.reading_time_minutes,
        comment_count: post.comment_count,
        published_at: post.published_at,
        language_name: lang ? lang.name : null,
        category_name: cat ? cat.name : null,
        difficulty: post.difficulty,
        content_type: post.content_type
      };
    });

    // popular_languages with post_count
    const languagePostCounts = {};
    tutorials.forEach(function (post) {
      if (post.language_id) {
        languagePostCounts[post.language_id] = (languagePostCounts[post.language_id] || 0) + 1;
      }
    });
    const popular_languages = languages
      .map(function (lang) {
        return {
          language_id: lang.id,
          name: lang.name,
          slug: lang.slug,
          description: lang.description || '',
          post_count: languagePostCounts[lang.id] || 0
        };
      })
      .sort(function (a, b) {
        return (b.post_count || 0) - (a.post_count || 0);
      });

    // popular_categories with post_count
    const categoryPostCounts = {};
    tutorials.forEach(function (post) {
      if (post.category_id) {
        categoryPostCounts[post.category_id] = (categoryPostCounts[post.category_id] || 0) + 1;
      }
    });
    const popular_categories = categories
      .map(function (cat) {
        return {
          category_id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description || '',
          post_count: categoryPostCounts[cat.id] || 0
        };
      })
      .sort(function (a, b) {
        return (b.post_count || 0) - (a.post_count || 0);
      });

    // popular_tags: Tag objects with computed post_count
    const tagPostCounts = {};
    tutorials.forEach(function (post) {
      if (Array.isArray(post.tags)) {
        post.tags.forEach(function (tagId) {
          tagPostCounts[tagId] = (tagPostCounts[tagId] || 0) + 1;
        });
      }
    });
    const popular_tags = tags
      .map(function (tag) {
        return Object.assign({}, tag, {
          post_count: tagPostCounts[tag.id] || 0
        });
      })
      .sort(function (a, b) {
        return (b.post_count || 0) - (a.post_count || 0);
      });

    return {
      featured_posts: featured_posts,
      latest_posts: latest_posts,
      popular_languages: popular_languages,
      popular_categories: popular_categories,
      popular_tags: popular_tags
    };
  }

  // Interface: getPostFilterOptions(context, categoryId, tagId)
  getPostFilterOptions(context, categoryId, tagId) {
    const posts = this._getFromStorage('posts');
    const languages = this._getFromStorage('programming_languages');
    const categories = this._getFromStorage('categories');
    const tags = this._getFromStorage('tags');

    let relevantPosts = posts.slice();

    if (context === 'category' && categoryId) {
      relevantPosts = relevantPosts.filter(function (p) {
        return p.category_id === categoryId;
      });
    } else if (context === 'tag' && tagId) {
      relevantPosts = relevantPosts.filter(function (p) {
        if (!Array.isArray(p.tags)) return false;
        return p.tags.indexOf(tagId) !== -1;
      });
    }

    // languages present in relevant posts
    const languageIdsSet = {};
    relevantPosts.forEach(function (post) {
      if (post.language_id) {
        languageIdsSet[post.language_id] = true;
      }
    });
    const languagesResult = languages.filter(function (lang) {
      return languageIdsSet[lang.id];
    });

    // categories present in relevant posts
    const categoryIdsSet = {};
    relevantPosts.forEach(function (post) {
      if (post.category_id) {
        categoryIdsSet[post.category_id] = true;
      }
    });
    const categoriesResult = categories.filter(function (cat) {
      return categoryIdsSet[cat.id];
    });

    // difficulties list (all possible values)
    const difficulties = ['beginner', 'intermediate', 'advanced'];

    // content types list (all possible)
    const content_types = ['tutorial', 'article'];

    // years and months from relevant posts
    const yearMap = {};
    relevantPosts.forEach(function (post) {
      const d = new Date(post.published_at);
      if (isNaN(d.getTime())) return;
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      if (!yearMap[year]) {
        yearMap[year] = {};
      }
      if (!yearMap[year][month]) {
        yearMap[year][month] = 0;
      }
      yearMap[year][month] += 1;
    });

    const years = Object.keys(yearMap)
      .map(function (yearStr) { return parseInt(yearStr, 10); })
      .sort(function (a, b) { return b - a; }) // newest year first
      .map(function (year) {
        const monthsMap = yearMap[year];
        const months = Object.keys(monthsMap)
          .map(function (mStr) { return parseInt(mStr, 10); })
          .sort(function (a, b) { return a - b; })
          .map(function (month) {
            return {
              month: month,
              label: this._getMonthLabel(month),
              post_count: monthsMap[month] || 0
            };
          }, this);
        return {
          year: year,
          months: months
        };
      }, this);

    return {
      languages: languagesResult,
      categories: categoriesResult,
      difficulties: difficulties,
      content_types: content_types,
      years: years
    };
  }

  // Interface: getTutorialsList(filters, sortOrder, page, pageSize)
  getTutorialsList(filters, sortOrder, page, pageSize) {
    filters = filters || {};
    sortOrder = sortOrder || 'date_newest';
    page = page || 1;
    pageSize = pageSize || 20;

    const posts = this._getFromStorage('posts');
    const languages = this._getFromStorage('programming_languages');
    const categories = this._getFromStorage('categories');
    const tags = this._getFromStorage('tags');

    let items = posts.filter(function (post) {
      // default to tutorials if contentType not specified
      if (filters.contentType) {
        if (post.content_type !== filters.contentType) return false;
      } else if (post.content_type !== 'tutorial') {
        return false;
      }
      if (filters.languageId && post.language_id !== filters.languageId) {
        return false;
      }
      if (filters.categoryId && post.category_id !== filters.categoryId) {
        return false;
      }
      if (filters.difficulty && post.difficulty !== filters.difficulty) {
        return false;
      }
      if (typeof filters.maxReadingTimeMinutes === 'number' &&
          post.reading_time_minutes > filters.maxReadingTimeMinutes) {
        return false;
      }
      if (filters.year || filters.month) {
        const d = new Date(post.published_at);
        if (isNaN(d.getTime())) return false;
        if (filters.year && d.getFullYear() !== filters.year) {
          return false;
        }
        if (filters.month && (d.getMonth() + 1) !== filters.month) {
          return false;
        }
      }
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        const text = (post.title || '') + ' ' + (post.excerpt || '') + ' ' + (post.content || '');
        if (text.toLowerCase().indexOf(kw) === -1) {
          return false;
        }
      }
      return true;
    });

    // sorting
    items = items.slice();
    if (sortOrder === 'reading_time_asc') {
      items.sort(function (a, b) {
        return (a.reading_time_minutes || 0) - (b.reading_time_minutes || 0);
      });
    } else if (sortOrder === 'reading_time_desc') {
      items.sort(function (a, b) {
        return (b.reading_time_minutes || 0) - (a.reading_time_minutes || 0);
      });
    } else if (sortOrder === 'date_oldest') {
      items.sort(function (a, b) {
        const da = new Date(a.published_at);
        const db = new Date(b.published_at);
        return da.getTime() - db.getTime();
      });
    } else if (sortOrder === 'date_newest') {
      items.sort(function (a, b) {
        const da = new Date(a.published_at);
        const db = new Date(b.published_at);
        return db.getTime() - da.getTime();
      });
    } else if (sortOrder === 'most_commented') {
      items.sort(function (a, b) {
        return (b.comment_count || 0) - (a.comment_count || 0);
      });
    }

    const total_count = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    const mappedItems = paged.map(function (post) {
      const lang = languages.find(function (l) { return l.id === post.language_id; });
      const cat = categories.find(function (c) { return c.id === post.category_id; });
      const postTags = Array.isArray(post.tags) ? post.tags : [];
      const tagEntries = postTags.map(function (tagId) {
        const tag = tags.find(function (t) { return t.id === tagId; });
        if (!tag) return null;
        return {
          tag_id: tag.id,
          tag_name: tag.name,
          tag_slug: tag.slug,
          tag: tag
        };
      }).filter(function (t) { return t !== null; });

      return {
        post_id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        reading_time_minutes: post.reading_time_minutes,
        comment_count: post.comment_count,
        published_at: post.published_at,
        language_name: lang ? lang.name : null,
        category_name: cat ? cat.name : null,
        difficulty: post.difficulty,
        content_type: post.content_type,
        tags: tagEntries
      };
    });

    return {
      items: mappedItems,
      total_count: total_count,
      page: page,
      page_size: pageSize
    };
  }

  // Interface: getCategoriesOverview()
  getCategoriesOverview() {
    const categories = this._getFromStorage('categories');
    return categories;
  }

  // Interface: getCategoryListing(categorySlug, filters, sortOrder, page, pageSize)
  getCategoryListing(categorySlug, filters, sortOrder, page, pageSize) {
    filters = filters || {};
    sortOrder = sortOrder || 'date_newest';
    page = page || 1;
    pageSize = pageSize || 20;

    const categories = this._getFromStorage('categories');
    const posts = this._getFromStorage('posts');
    const languages = this._getFromStorage('programming_languages');

    const category = categories.find(function (c) { return c.slug === categorySlug; }) || null;

    let items = [];
    if (category) {
      items = posts.filter(function (post) {
        if (post.category_id !== category.id) return false;
        if (filters.difficulty && post.difficulty !== filters.difficulty) return false;
        if (filters.contentType && post.content_type !== filters.contentType) return false;
        if (filters.year) {
          const d = new Date(post.published_at);
          if (isNaN(d.getTime()) || d.getFullYear() !== filters.year) {
            return false;
          }
        }
        if (filters.keyword) {
          const kw = filters.keyword.toLowerCase();
          const text = (post.title || '') + ' ' + (post.excerpt || '') + ' ' + (post.content || '');
          if (text.toLowerCase().indexOf(kw) === -1) {
            return false;
          }
        }
        return true;
      });
    }

    items = items.slice();
    if (sortOrder === 'reading_time_asc') {
      items.sort(function (a, b) {
        return (a.reading_time_minutes || 0) - (b.reading_time_minutes || 0);
      });
    } else if (sortOrder === 'reading_time_desc') {
      items.sort(function (a, b) {
        return (b.reading_time_minutes || 0) - (a.reading_time_minutes || 0);
      });
    } else if (sortOrder === 'date_oldest') {
      items.sort(function (a, b) {
        const da = new Date(a.published_at);
        const db = new Date(b.published_at);
        return da.getTime() - db.getTime();
      });
    } else if (sortOrder === 'date_newest') {
      items.sort(function (a, b) {
        const da = new Date(a.published_at);
        const db = new Date(b.published_at);
        return db.getTime() - da.getTime();
      });
    } else if (sortOrder === 'most_commented') {
      items.sort(function (a, b) {
        return (b.comment_count || 0) - (a.comment_count || 0);
      });
    }

    const total_count = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    const mappedItems = paged.map(function (post) {
      const lang = languages.find(function (l) { return l.id === post.language_id; });
      return {
        post_id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        reading_time_minutes: post.reading_time_minutes,
        comment_count: post.comment_count,
        published_at: post.published_at,
        language_name: lang ? lang.name : null,
        difficulty: post.difficulty,
        content_type: post.content_type
      };
    });

    const categoryInfo = category
      ? {
          category_id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description || ''
        }
      : null;

    return {
      category: categoryInfo,
      items: mappedItems,
      total_count: total_count,
      page: page,
      page_size: pageSize
    };
  }

  // Interface: getTagsOverview()
  getTagsOverview() {
    const tags = this._getFromStorage('tags');
    const posts = this._getFromStorage('posts');
    const tagPostCounts = {};
    posts.forEach(function (post) {
      if (Array.isArray(post.tags)) {
        post.tags.forEach(function (tagId) {
          tagPostCounts[tagId] = (tagPostCounts[tagId] || 0) + 1;
        });
      }
    });
    return tags.map(function (tag) {
      return Object.assign({}, tag, {
        post_count: tagPostCounts[tag.id] || 0
      });
    });
  }

  // Interface: getTagListing(tagSlug, filters, sortOrder, page, pageSize)
  getTagListing(tagSlug, filters, sortOrder, page, pageSize) {
    filters = filters || {};
    sortOrder = sortOrder || 'date_newest';
    page = page || 1;
    pageSize = pageSize || 20;

    const tags = this._getFromStorage('tags');
    const posts = this._getFromStorage('posts');
    const languages = this._getFromStorage('programming_languages');
    const categories = this._getFromStorage('categories');

    const tag = tags.find(function (t) { return t.slug === tagSlug; }) || null;

    let items = [];
    if (tag) {
      items = posts.filter(function (post) {
        if (!Array.isArray(post.tags) || post.tags.indexOf(tag.id) === -1) {
          return false;
        }
        if (filters.difficulty && post.difficulty !== filters.difficulty) return false;
        if (filters.contentType && post.content_type !== filters.contentType) return false;
        if (filters.year) {
          const d = new Date(post.published_at);
          if (isNaN(d.getTime()) || d.getFullYear() !== filters.year) {
            return false;
          }
        }
        return true;
      });
    }

    items = items.slice();
    if (sortOrder === 'reading_time_asc') {
      items.sort(function (a, b) {
        return (a.reading_time_minutes || 0) - (b.reading_time_minutes || 0);
      });
    } else if (sortOrder === 'reading_time_desc') {
      items.sort(function (a, b) {
        return (b.reading_time_minutes || 0) - (a.reading_time_minutes || 0);
      });
    } else if (sortOrder === 'date_oldest') {
      items.sort(function (a, b) {
        const da = new Date(a.published_at);
        const db = new Date(b.published_at);
        return da.getTime() - db.getTime();
      });
    } else if (sortOrder === 'date_newest') {
      items.sort(function (a, b) {
        const da = new Date(a.published_at);
        const db = new Date(b.published_at);
        return db.getTime() - da.getTime();
      });
    } else if (sortOrder === 'most_commented') {
      items.sort(function (a, b) {
        return (b.comment_count || 0) - (a.comment_count || 0);
      });
    }

    const total_count = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    const mappedItems = paged.map(function (post) {
      const lang = languages.find(function (l) { return l.id === post.language_id; });
      const cat = categories.find(function (c) { return c.id === post.category_id; });
      return {
        post_id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        reading_time_minutes: post.reading_time_minutes,
        comment_count: post.comment_count,
        published_at: post.published_at,
        language_name: lang ? lang.name : null,
        category_name: cat ? cat.name : null,
        difficulty: post.difficulty,
        content_type: post.content_type
      };
    });

    return {
      tag: tag,
      items: mappedItems,
      total_count: total_count,
      page: page,
      page_size: pageSize
    };
  }

  // Interface: searchPosts(query, filters, sortOrder, page, pageSize)
  searchPosts(query, filters, sortOrder, page, pageSize) {
    query = query || '';
    filters = filters || {};
    sortOrder = sortOrder || 'relevance';
    page = page || 1;
    pageSize = pageSize || 20;

    const posts = this._getFromStorage('posts');
    const languages = this._getFromStorage('programming_languages');
    const categories = this._getFromStorage('categories');

    const qLower = query.toLowerCase();

    let items = posts.filter(function (post) {
      if (filters.difficulty && post.difficulty !== filters.difficulty) return false;
      if (filters.contentType && post.content_type !== filters.contentType) return false;
      if (filters.languageId && post.language_id !== filters.languageId) return false;
      if (filters.categoryId && post.category_id !== filters.categoryId) return false;
      if (filters.tagId) {
        if (!Array.isArray(post.tags) || post.tags.indexOf(filters.tagId) === -1) {
          return false;
        }
      }
      if (qLower) {
        const text = (post.title || '') + ' ' + (post.excerpt || '') + ' ' + (post.content || '');
        if (text.toLowerCase().indexOf(qLower) === -1) {
          return false;
        }
      }
      return true;
    });

    // sorting
    if (sortOrder === 'reading_time_asc') {
      items.sort(function (a, b) {
        return (a.reading_time_minutes || 0) - (b.reading_time_minutes || 0);
      });
    } else if (sortOrder === 'reading_time_desc') {
      items.sort(function (a, b) {
        return (b.reading_time_minutes || 0) - (a.reading_time_minutes || 0);
      });
    } else if (sortOrder === 'date_oldest') {
      items.sort(function (a, b) {
        const da = new Date(a.published_at);
        const db = new Date(b.published_at);
        return da.getTime() - db.getTime();
      });
    } else if (sortOrder === 'date_newest') {
      items.sort(function (a, b) {
        const da = new Date(a.published_at);
        const db = new Date(b.published_at);
        return db.getTime() - da.getTime();
      });
    } else {
      // 'relevance' or unknown: simple heuristic - keep current order
    }

    const total_count = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    const mappedItems = paged.map(function (post) {
      const lang = languages.find(function (l) { return l.id === post.language_id; });
      const cat = categories.find(function (c) { return c.id === post.category_id; });

      let matched_snippet = post.excerpt || '';
      if (qLower) {
        const text = post.content || '';
        const index = text.toLowerCase().indexOf(qLower);
        if (index !== -1) {
          const snippetStart = Math.max(0, index - 40);
          const snippetEnd = Math.min(text.length, index + qLower.length + 40);
          matched_snippet = text.substring(snippetStart, snippetEnd);
        }
      }

      return {
        post_id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        reading_time_minutes: post.reading_time_minutes,
        comment_count: post.comment_count,
        published_at: post.published_at,
        language_name: lang ? lang.name : null,
        category_name: cat ? cat.name : null,
        difficulty: post.difficulty,
        content_type: post.content_type,
        matched_snippet: matched_snippet
      };
    });

    return {
      items: mappedItems,
      total_count: total_count,
      page: page,
      page_size: pageSize
    };
  }

  // Interface: getPostDetail(postSlug)
  getPostDetail(postSlug) {
    const posts = this._getFromStorage('posts');
    const languages = this._getFromStorage('programming_languages');
    const categories = this._getFromStorage('categories');
    const tags = this._getFromStorage('tags');
    const codeBlocks = this._getFromStorage('code_blocks');
    const seriesList = this._getFromStorage('series');
    const seriesParts = this._getFromStorage('series_parts');
    const bookmarks = this._getFromStorage('bookmarks');
    const readingListItems = this._getFromStorage('reading_list_items');

    const post = posts.find(function (p) { return p.slug === postSlug; });
    if (!post) {
      return null;
    }

    const language = languages.find(function (l) { return l.id === post.language_id; }) || null;
    const category = categories.find(function (c) { return c.id === post.category_id; }) || null;

    const tagEntries = Array.isArray(post.tags)
      ? post.tags.map(function (tagId) {
          const tag = tags.find(function (t) { return t.id === tagId; });
          if (!tag) return null;
          return {
            tag_id: tag.id,
            name: tag.name,
            slug: tag.slug,
            tag: tag
          };
        }).filter(function (t) { return t !== null; })
      : [];

    const postCodeBlocks = codeBlocks
      .filter(function (cb) { return cb.post_id === post.id; })
      .sort(function (a, b) { return a.order_index - b.order_index; })
      .map(function (cb) {
        return {
          code_block_id: cb.id,
          order_index: cb.order_index,
          language: cb.language || null
        };
      });

    // series information
    let seriesInfo = {
      is_in_series: false,
      series_id: null,
      series_title: null,
      parts: [],
      previous_part: null,
      next_part: null
    };

    const thisPart = seriesParts.find(function (sp) { return sp.post_id === post.id; });
    if (thisPart) {
      const series = seriesList.find(function (s) { return s.id === thisPart.series_id; }) || null;
      const allParts = seriesParts
        .filter(function (sp) { return sp.series_id === thisPart.series_id; })
        .sort(function (a, b) { return a.part_number - b.part_number; });

      const partsDetailed = allParts.map(function (sp) {
        const spPost = posts.find(function (p) { return p.id === sp.post_id; });
        return {
          part_number: sp.part_number,
          post_id: sp.post_id,
          title: sp.title,
          slug: spPost ? spPost.slug : null,
          is_current: sp.post_id === post.id
        };
      });

      let previous_part = null;
      let next_part = null;
      const currentPartNumber = thisPart.part_number;
      allParts.forEach(function (sp) {
        if (sp.part_number === currentPartNumber - 1) {
          const prevPost = posts.find(function (p) { return p.id === sp.post_id; });
          previous_part = {
            part_number: sp.part_number,
            post_id: sp.post_id,
            title: sp.title,
            slug: prevPost ? prevPost.slug : null
          };
        } else if (sp.part_number === currentPartNumber + 1) {
          const nextPost = posts.find(function (p) { return p.id === sp.post_id; });
          next_part = {
            part_number: sp.part_number,
            post_id: sp.post_id,
            title: sp.title,
            slug: nextPost ? nextPost.slug : null
          };
        }
      });

      seriesInfo = {
        is_in_series: true,
        series_id: thisPart.series_id,
        series_title: series ? series.title : null,
        parts: partsDetailed,
        previous_part: previous_part,
        next_part: next_part
      };
    }

    const breadcrumbs = [
      { label: 'Home', type: 'home' },
      { label: 'Tutorials', type: 'tutorials' }
    ];
    if (category) {
      breadcrumbs.push({ label: category.name, type: 'category' });
    }
    breadcrumbs.push({ label: post.title, type: 'post' });

    const is_bookmarked = bookmarks.some(function (b) { return b.post_id === post.id; });
    const in_reading_list = readingListItems.some(function (item) { return item.post_id === post.id; });

    return {
      post_id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      reading_time_minutes: post.reading_time_minutes,
      published_at: post.published_at,
      language: language
        ? { language_id: language.id, name: language.name, slug: language.slug }
        : null,
      category: category
        ? { category_id: category.id, name: category.name, slug: category.slug }
        : null,
      difficulty: post.difficulty,
      content_type: post.content_type,
      comment_count: post.comment_count,
      tags: tagEntries,
      code_blocks: postCodeBlocks,
      series: seriesInfo,
      breadcrumbs: breadcrumbs,
      is_bookmarked: is_bookmarked,
      in_reading_list: in_reading_list
    };
  }

  // Interface: copyCodeBlock(codeBlockId)
  copyCodeBlock(codeBlockId) {
    const codeBlocks = this._getFromStorage('code_blocks');
    const block = codeBlocks.find(function (cb) { return cb.id === codeBlockId; });
    if (!block) {
      return {
        success: false,
        code: '',
        message: 'Code block not found'
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task3_codeCopyEvent',
        JSON.stringify({
          "code_block_id": codeBlockId,
          "post_id": block.post_id,
          "copied_at": new Date().toISOString()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      code: block.code || '',
      message: 'Code retrieved successfully'
    };
  }

  // Interface: getPostComments(postId, page, pageSize)
  getPostComments(postId, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 20;

    const comments = this._getFromStorage('comments');
    const posts = this._getFromStorage('posts');

    const post = posts.find(function (p) { return p.id === postId; }) || null;

    let items = comments.filter(function (c) { return c.post_id === postId; });

    items.sort(function (a, b) {
      const da = new Date(a.created_at);
      const db = new Date(b.created_at);
      return da.getTime() - db.getTime();
    });

    const total_count = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    const mappedItems = paged.map(function (c) {
      return Object.assign({}, c, {
        post: post
      });
    });

    return {
      items: mappedItems,
      total_count: total_count,
      page: page,
      page_size: pageSize
    };
  }

  // Interface: addCommentToPost(postId, name, email, content)
  addCommentToPost(postId, name, email, content) {
    const comments = this._getFromStorage('comments');

    const comment = {
      id: this._generateId('comment'),
      post_id: postId,
      name: name,
      email: email,
      content: content,
      created_at: new Date().toISOString()
    };

    comments.push(comment);
    this._saveToStorage('comments', comments);

    const updated_comment_count = this._incrementPostCommentCount(postId);

    return {
      comment: comment,
      updated_comment_count: updated_comment_count
    };
  }

  // Interface: addBookmark(postId)
  addBookmark(postId) {
    const bookmarks = this._getOrCreateBookmarkStore();
    const existing = bookmarks.find(function (b) { return b.post_id === postId; });
    if (existing) {
      return {
        bookmark: existing,
        is_new: false,
        total_bookmarks: bookmarks.length
      };
    }

    const bookmark = {
      id: this._generateId('bookmark'),
      post_id: postId,
      created_at: new Date().toISOString()
    };
    bookmarks.push(bookmark);
    this._saveToStorage('bookmarks', bookmarks);

    return {
      bookmark: bookmark,
      is_new: true,
      total_bookmarks: bookmarks.length
    };
  }

  // Interface: removeBookmark(postId)
  removeBookmark(postId) {
    const bookmarks = this._getOrCreateBookmarkStore();
    const originalLength = bookmarks.length;
    const remaining = bookmarks.filter(function (b) { return b.post_id !== postId; });
    this._saveToStorage('bookmarks', remaining);
    return {
      success: remaining.length !== originalLength,
      total_bookmarks: remaining.length
    };
  }

  // Interface: getBookmarks()
  getBookmarks() {
    const bookmarks = this._getOrCreateBookmarkStore();
    const posts = this._getFromStorage('posts');

    return bookmarks.map(function (b) {
      const post = posts.find(function (p) { return p.id === b.post_id; }) || null;
      return {
        bookmark_id: b.id,
        post_id: b.post_id,
        title: post ? post.title : null,
        slug: post ? post.slug : null,
        excerpt: post ? post.excerpt : null,
        reading_time_minutes: post ? post.reading_time_minutes : null,
        comment_count: post ? post.comment_count : null,
        created_at: b.created_at,
        post: post
      };
    });
  }

  // Interface: addToReadingList(postId)
  addToReadingList(postId) {
    const readingListItems = this._getOrCreateReadingListStore();
    const existing = readingListItems.find(function (item) { return item.post_id === postId; });
    if (false && existing) {
      return {
        item: existing,
        position: existing.position,
        total_items: readingListItems.length
      };
    }

    const position = this._calculateNextReadingListPosition(readingListItems);
    const item = {
      id: this._generateId('reading_item'),
      post_id: postId,
      added_at: new Date().toISOString(),
      position: position
    };
    readingListItems.push(item);
    this._saveToStorage('reading_list_items', readingListItems);

    return {
      item: item,
      position: position,
      total_items: readingListItems.length
    };
  }

  // Interface: removeFromReadingList(postId)
  removeFromReadingList(postId) {
    let readingListItems = this._getOrCreateReadingListStore();
    const originalLength = readingListItems.length;
    readingListItems = readingListItems.filter(function (item) {
      return item.post_id !== postId;
    });

    // re-sequence positions
    readingListItems.sort(function (a, b) { return a.position - b.position; });
    readingListItems = readingListItems.map(function (item, index) {
      return Object.assign({}, item, { position: index + 1 });
    });

    this._saveToStorage('reading_list_items', readingListItems);

    return {
      success: readingListItems.length !== originalLength,
      total_items: readingListItems.length
    };
  }

  // Interface: getReadingList()
  getReadingList() {
    let readingListItems = this._getOrCreateReadingListStore();
    const posts = this._getFromStorage('posts');

    readingListItems = readingListItems.slice().sort(function (a, b) {
      return a.position - b.position;
    });

    return readingListItems.map(function (item) {
      const post = posts.find(function (p) { return p.id === item.post_id; }) || null;
      return {
        item_id: item.id,
        position: item.position,
        added_at: item.added_at,
        post_id: item.post_id,
        title: post ? post.title : null,
        slug: post ? post.slug : null,
        excerpt: post ? post.excerpt : null,
        reading_time_minutes: post ? post.reading_time_minutes : null,
        comment_count: post ? post.comment_count : null,
        post: post
      };
    });
  }

  // Interface: subscribeToNewsletter(email)
  subscribeToNewsletter(email) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions');

    const existing = subscriptions.find(function (s) {
      return s.email && s.email.toLowerCase() === (email || '').toLowerCase();
    });

    if (existing) {
      return {
        subscription: existing,
        is_new: false,
        message: 'Email is already subscribed.'
      };
    }

    const subscription = {
      id: this._generateId('newsletter'),
      email: email,
      subscribed_at: new Date().toISOString()
    };
    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      subscription: subscription,
      is_new: true,
      message: 'Subscription successful.'
    };
  }

  // Interface: sendContactMessage(name, email, message, referencedPostId, referencedPostTitle)
  sendContactMessage(name, email, messageText, referencedPostId, referencedPostTitle) {
    const contactMessages = this._getFromStorage('contact_messages');
    const posts = this._getFromStorage('posts');

    const msg = {
      id: this._generateId('contact'),
      name: name,
      email: email,
      message: messageText,
      created_at: new Date().toISOString(),
      referenced_post_id: referencedPostId || null,
      referenced_post_title: referencedPostTitle || null
    };

    contactMessages.push(msg);
    this._saveToStorage('contact_messages', contactMessages);

    const referencedPost = referencedPostId
      ? posts.find(function (p) { return p.id === referencedPostId; }) || null
      : null;

    const contact_message = Object.assign({}, msg, {
      referenced_post: referencedPost
    });

    return {
      contact_message: contact_message,
      success: true
    };
  }

  // Interface: getAboutPageContent()
  getAboutPageContent() {
    const data = localStorage.getItem('about_page_content');
    let about;
    try {
      about = data ? JSON.parse(data) : null;
    } catch (e) {
      about = null;
    }
    if (!about) {
      about = {
        title: 'About this blog',
        body: 'Welcome to this programming tutorials blog. Content is loaded from localStorage.',
        author_name: 'Blog Author',
        author_bio: 'Software developer sharing tutorials and articles about programming.'
      };
      localStorage.setItem('about_page_content', JSON.stringify(about));
    }
    return {
      title: about.title,
      body: about.body,
      author_name: about.author_name,
      author_bio: about.author_bio
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