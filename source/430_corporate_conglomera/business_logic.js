// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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

// Enum constants based on data model
const ENUMS = {
  subsidiaryIndustry: [
    'renewable_energy',
    'consumer_goods',
    'industrial_manufacturing',
    'automotive',
    'healthcare',
    'information_technology',
    'financial_services',
    'logistics',
    'chemicals',
    'other'
  ],
  subsidiaryRegion: [
    'asia',
    'europe',
    'north_america',
    'south_america',
    'middle_east',
    'africa',
    'oceania',
    'global'
  ],
  subsidiaryCountry: [
    'united_states',
    'germany',
    'china',
    'india',
    'japan',
    'united_kingdom',
    'france',
    'brazil',
    'canada',
    'australia',
    'other'
  ],
  revenueBracket: [
    'under_usd_100m',
    'usd_100m_500m',
    'usd_500m_2b',
    'over_usd_500m',
    'over_usd_2b'
  ],
  reportType: [
    'annual_report',
    'quarterly_report',
    'sustainability_report',
    'earnings_release',
    'other_financial_report',
    'other'
  ],
  eventType: [
    'earnings_call',
    'investor_meeting_day',
    'investor_conference',
    'shareholder_meeting',
    'other'
  ],
  eventFormat: ['in_person', 'virtual', 'hybrid'],
  jobDepartment: [
    'information_technology',
    'finance',
    'operations',
    'marketing',
    'sales',
    'human_resources',
    'sustainability',
    'legal',
    'other'
  ],
  jobExperienceLevel: [
    'entry_level',
    'mid_level_3_5_years',
    'senior_level',
    'executive'
  ],
  jobLocationType: ['onsite', 'hybrid', 'remote'],
  jobEmploymentType: [
    'full_time',
    'part_time',
    'contract',
    'internship',
    'temporary'
  ],
  sustainabilitySection: [
    'climate_energy',
    'circular_economy',
    'social_impact',
    'governance_ethics',
    'other'
  ],
  savedItemType: ['report', 'subsidiary', 'job', 'event', 'page', 'other'],
  pageBookmarkSource: [
    'sustainability_page',
    'generic_page',
    'report_page',
    'job_page',
    'event_page',
    'subsidiary_page',
    'other'
  ],
  eventRegistrationStatus: ['submitted', 'confirmed', 'cancelled'],
  contactInquiryType: [
    'partnership',
    'sales',
    'procurement',
    'media',
    'careers',
    'other'
  ],
  contactInquiryStatus: ['submitted', 'in_review', 'closed'],
  supplierCategory: [
    'it_services',
    'raw_materials',
    'logistics',
    'professional_services',
    'manufacturing_services',
    'marketing_services',
    'facilities_management',
    'other'
  ],
  supplierRegion: [
    'asia',
    'europe',
    'north_america',
    'south_america',
    'middle_east',
    'africa',
    'oceania',
    'global'
  ],
  supplierRevenueRange: [
    'under_usd_10m',
    'usd_10m_50m',
    'usd_50m_250m',
    'over_usd_250m'
  ],
  supplierRegistrationStatus: [
    'submitted',
    'under_review',
    'approved',
    'rejected'
  ],
  emailTopics: [
    'sustainability',
    'financial_results',
    'corporate_news',
    'careers',
    'events',
    'suppliers',
    'governance',
    'other'
  ],
  emailFrequency: [
    'real_time',
    'daily',
    'weekly',
    'monthly_digest',
    'quarterly_digest'
  ],
  subsidiaryComparisonStatus: ['active', 'completed', 'archived']
};

class BusinessLogic {
  constructor() {
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const tables = [
      'subsidiaries',
      'reports',
      'events',
      'jobs',
      'sustainability_pages',
      'subsidiary_lists',
      'subsidiary_list_items',
      'saved_items',
      'page_bookmarks',
      'job_shortlist_entries',
      'site_calendar_entries',
      'event_registrations',
      'contact_inquiries',
      'supplier_registrations',
      'email_subscriptions',
      'subsidiary_comparisons',
      // simple store for news/media items used by searchNewsAndMedia
      'news_items'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // active comparison pointer
    if (!localStorage.getItem('activeSubsidiaryComparisonId')) {
      localStorage.setItem('activeSubsidiaryComparisonId', '');
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

  _nowTimestamp() {
    return new Date().toISOString();
  }

  // -------------------- Generic formatting helpers --------------------

  _enumToLabel(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map(function (part) {
        if (!part) return '';
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  _formatCurrencyAmount(amount, currency) {
    if (typeof amount !== 'number') return '';
    const cur = (currency || 'usd').toUpperCase();
    try {
      // Using default locale for portability
      const formatted = amount.toLocaleString(undefined, {
        maximumFractionDigits: 0
      });
      return cur + ' ' + formatted;
    } catch (e) {
      return cur + ' ' + String(amount);
    }
  }

  _formatEmployeeCount(count) {
    if (typeof count !== 'number') return '';
    try {
      return count.toLocaleString();
    } catch (e) {
      return String(count);
    }
  }

  _countryLabel(value) {
    return this._enumToLabel(value);
  }

  _regionLabel(value) {
    return this._enumToLabel(value);
  }

  _industryLabel(value) {
    return this._enumToLabel(value);
  }

  _formatLocationFromEvent(event) {
    if (!event) return '';
    const city = event.locationCity || '';
    const countryLabel = this._countryLabel(event.locationCountry);
    if (city && countryLabel) return city + ', ' + countryLabel;
    if (countryLabel) return countryLabel;
    return city || '';
  }

  _formatJobLocation(job) {
    if (!job) return '';
    const city = job.locationCity || '';
    const countryLabel = this._countryLabel(job.locationCountry);
    if (city && countryLabel) return city + ', ' + countryLabel;
    if (countryLabel) return countryLabel;
    return city || '';
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _dateInRange(dateStr, startDateStr, endDateStr) {
    const date = this._parseDate(dateStr);
    if (!date) return false;
    if (startDateStr) {
      const start = this._parseDate(startDateStr);
      if (start && date < start) return false;
    }
    if (endDateStr) {
      const end = this._parseDate(endDateStr);
      if (end && date > end) return false;
    }
    return true;
  }

  _isoDateOnlyToRange(dateStr) {
    // Helper: 'YYYY-MM-DD' => {start: Date, end: Date}
    if (!dateStr) return { start: null, end: null };
    const start = new Date(dateStr + 'T00:00:00.000Z');
    const end = new Date(dateStr + 'T23:59:59.999Z');
    return { start: start, end: end };
  }

  _dateWithinIsoRange(dateTimeStr, startDate, endDate) {
    const dt = this._parseDate(dateTimeStr);
    if (!dt) return false;
    if (startDate) {
      const start = new Date(startDate + 'T00:00:00.000Z');
      if (dt < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate + 'T23:59:59.999Z');
      if (dt > end) return false;
    }
    return true;
  }

  _formatDateTimeDisplay(dateTimeStr) {
    const d = this._parseDate(dateTimeStr);
    if (!d) return '';
    try {
      return d.toISOString();
    } catch (e) {
      return String(dateTimeStr);
    }
  }

  _getOrCreateSavedItemsState() {
    // Ensures saved_items array exists; returns current array
    let saved = this._getFromStorage('saved_items');
    if (!Array.isArray(saved)) {
      saved = [];
      this._saveToStorage('saved_items', saved);
    }
    return saved;
  }

  // -------------------- Subsidiary comparison helpers --------------------

  _getOrCreateActiveSubsidiaryComparison() {
    let comparisons = this._getFromStorage('subsidiary_comparisons');
    let activeId = localStorage.getItem('activeSubsidiaryComparisonId') || '';
    let comparison = null;

    if (activeId) {
      for (let i = 0; i < comparisons.length; i++) {
        if (comparisons[i].id === activeId) {
          comparison = comparisons[i];
          break;
        }
      }
    }

    if (!comparison) {
      // find an active one if exists
      for (let i = 0; i < comparisons.length; i++) {
        if (comparisons[i].status === 'active') {
          comparison = comparisons[i];
          activeId = comparison.id;
          localStorage.setItem('activeSubsidiaryComparisonId', activeId);
          break;
        }
      }
    }

    let createdNew = false;

    if (!comparison) {
      comparison = {
        id: this._generateId('subsidiarycomparison'),
        subsidiaryIds: [],
        status: 'active',
        createdAt: this._nowTimestamp()
      };
      comparisons.push(comparison);
      this._saveToStorage('subsidiary_comparisons', comparisons);
      localStorage.setItem('activeSubsidiaryComparisonId', comparison.id);
      createdNew = true;
    }

    return { comparison: comparison, createdNew: createdNew };
  }

  _getActiveSubsidiaryComparisonRecord() {
    const comparisons = this._getFromStorage('subsidiary_comparisons');
    const activeId = localStorage.getItem('activeSubsidiaryComparisonId') || '';
    if (activeId) {
      for (let i = 0; i < comparisons.length; i++) {
        if (comparisons[i].id === activeId) return comparisons[i];
      }
    }
    // fallback: first active
    for (let j = 0; j < comparisons.length; j++) {
      if (comparisons[j].status === 'active') return comparisons[j];
    }
    return null;
  }

  // -------------------- Interface implementations --------------------

  // getHomeFeaturedContent()
  getHomeFeaturedContent() {
    const reports = this._getFromStorage('reports');
    const pages = this._getFromStorage('sustainability_pages');
    const events = this._getFromStorage('events');
    const now = new Date();

    // Featured reports: group-level, newest years first
    const featuredReports = reports
      .filter(function (r) {
        return r.isGroupLevel === true;
      })
      .sort(function (a, b) {
        if (a.year !== b.year) return b.year - a.year;
        const da = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
        const db = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
        return db - da;
      })
      .slice(0, 5)
      .map(
        function (r) {
          return {
            report: r,
            title: r.title,
            year: r.year,
            reportTypeLabel: this._enumToLabel(r.reportType),
            isGroupLevel: r.isGroupLevel === true
          };
        }.bind(this)
      );

    // Sustainability highlights: pick most recently updated pages
    const sustainabilityHighlights = pages
      .slice()
      .sort(function (a, b) {
        const da = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
        const db = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
        return db - da;
      })
      .slice(0, 5)
      .map(function (p) {
        return {
          page: p,
          title: p.title,
          summary: p.summary || ''
        };
      });

    // Upcoming investor events
    const upcomingInvestorEvents = events
      .filter(function (e) {
        if (!e.isInvestorEvent) return false;
        const d = e.startDateTime ? new Date(e.startDateTime) : null;
        if (!d || isNaN(d.getTime())) return false;
        return d >= now;
      })
      .sort(function (a, b) {
        const da = new Date(a.startDateTime).getTime();
        const db = new Date(b.startDateTime).getTime();
        return da - db;
      })
      .slice(0, 5)
      .map(
        function (e) {
          return {
            event: e,
            title: e.title,
            startDateTime: e.startDateTime,
            eventTypeLabel: this._enumToLabel(e.eventType),
            locationDisplay: this._formatLocationFromEvent(e)
          };
        }.bind(this)
      );

    return {
      featuredReports: featuredReports,
      sustainabilityHighlights: sustainabilityHighlights,
      upcomingInvestorEvents: upcomingInvestorEvents
    };
  }

  // getSubsidiaryDirectoryFilters()
  getSubsidiaryDirectoryFilters() {
    const industryOptions = ENUMS.subsidiaryIndustry.map(
      function (v) {
        return { value: v, label: this._industryLabel(v) };
      }.bind(this)
    );
    const regionOptions = ENUMS.subsidiaryRegion.map(
      function (v) {
        return { value: v, label: this._regionLabel(v) };
      }.bind(this)
    );
    const countryOptions = ENUMS.subsidiaryCountry.map(
      function (v) {
        return { value: v, label: this._countryLabel(v) };
      }.bind(this)
    );
    const revenueBracketOptions = ENUMS.revenueBracket.map(
      function (v) {
        return { value: v, label: this._enumToLabel(v) };
      }.bind(this)
    );
    const sortOptions = [
      { value: 'annual_revenue_desc', label: 'Annual Revenue - High to Low' },
      { value: 'annual_revenue_asc', label: 'Annual Revenue - Low to High' },
      { value: 'name_asc', label: 'Name A-Z' },
      { value: 'name_desc', label: 'Name Z-A' },
      { value: 'employee_count_desc', label: 'Employees - High to Low' },
      { value: 'employee_count_asc', label: 'Employees - Low to High' }
    ];
    return {
      industryOptions: industryOptions,
      regionOptions: regionOptions,
      countryOptions: countryOptions,
      revenueBracketOptions: revenueBracketOptions,
      sortOptions: sortOptions
    };
  }

  // searchSubsidiaries(industry, region, country, annualRevenueBracket, minAnnualRevenue, maxAnnualRevenue, sortBy, sortDirection, page, pageSize)
  searchSubsidiaries(
    industry,
    region,
    country,
    annualRevenueBracket,
    minAnnualRevenue,
    maxAnnualRevenue,
    sortBy,
    sortDirection,
    page,
    pageSize
  ) {
    const subsidiaries = this._getFromStorage('subsidiaries');
    const listItems = this._getFromStorage('subsidiary_list_items');
    const comparison = this._getActiveSubsidiaryComparisonRecord();

    const sortField = sortBy || 'annual_revenue';
    const direction = sortDirection === 'asc' ? 'asc' : 'desc';

    const filtered = subsidiaries.filter(function (s) {
      if (industry && s.industry !== industry) return false;
      if (region && s.region !== region) return false;
      if (country && s.country !== country) return false;
      if (annualRevenueBracket) {
        if (annualRevenueBracket === 'over_usd_500m') {
          // Treat 'over_usd_500m' as including higher brackets such as 'over_usd_2b'
          if (!(s.revenueBracket === 'over_usd_500m' || s.revenueBracket === 'over_usd_2b')) {
            return false;
          }
        } else if (s.revenueBracket !== annualRevenueBracket) {
          return false;
        }
      }
      if (typeof minAnnualRevenue === 'number' && s.annualRevenue < minAnnualRevenue) {
        return false;
      }
      if (typeof maxAnnualRevenue === 'number' && s.annualRevenue > maxAnnualRevenue) {
        return false;
      }
      return true;
    });

    filtered.sort(function (a, b) {
      let valA;
      let valB;
      if (sortField === 'name') {
        valA = a.name || '';
        valB = b.name || '';
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      }
      if (sortField === 'employee_count') {
        valA = typeof a.employeeCount === 'number' ? a.employeeCount : 0;
        valB = typeof b.employeeCount === 'number' ? b.employeeCount : 0;
      } else {
        // default: annual_revenue
        valA = typeof a.annualRevenue === 'number' ? a.annualRevenue : 0;
        valB = typeof b.annualRevenue === 'number' ? b.annualRevenue : 0;
      }
      return direction === 'asc' ? valA - valB : valB - valA;
    });

    const totalCount = filtered.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (currentPage - 1) * size;
    const endIndex = startIndex + size;
    const slice = filtered.slice(startIndex, endIndex);

    const comparisonIds = comparison && Array.isArray(comparison.subsidiaryIds)
      ? comparison.subsidiaryIds
      : [];

    const results = slice.map(
      function (s) {
        const listsCount = listItems.filter(function (li) {
          return li.subsidiaryId === s.id;
        }).length;
        const isInComparison = comparisonIds.indexOf(s.id) !== -1;
        return {
          subsidiary: s,
          industryLabel: this._industryLabel(s.industry),
          regionLabel: this._regionLabel(s.region),
          countryLabel: this._countryLabel(s.country),
          annualRevenueDisplay: this._formatCurrencyAmount(
            s.annualRevenue,
            s.revenueCurrency
          ),
          employeeCountDisplay: this._formatEmployeeCount(s.employeeCount),
          isInComparison: isInComparison,
          listsCount: listsCount
        };
      }.bind(this)
    );

    return {
      results: results,
      totalCount: totalCount,
      page: currentPage,
      pageSize: size
    };
  }

  // getSubsidiaryDetails(subsidiaryId)
  getSubsidiaryDetails(subsidiaryId) {
    const subsidiaries = this._getFromStorage('subsidiaries');
    const subsidiary = subsidiaries.find(function (s) {
      return s.id === subsidiaryId;
    }) || null;

    const comparison = this._getActiveSubsidiaryComparisonRecord();
    const comparisonIds = comparison && Array.isArray(comparison.subsidiaryIds)
      ? comparison.subsidiaryIds
      : [];
    const isInComparison = !!(subsidiary && comparisonIds.indexOf(subsidiary.id) !== -1);

    // All possible inquiry types
    const availableInquiryTypes = ENUMS.contactInquiryType.map(
      function (v) {
        return { value: v, label: this._enumToLabel(v) };
      }.bind(this)
    );

    if (!subsidiary) {
      return {
        subsidiary: null,
        industryLabel: '',
        regionLabel: '',
        countryLabel: '',
        annualRevenueDisplay: '',
        employeeCountDisplay: '',
        isInComparison: false,
        availableInquiryTypes: availableInquiryTypes
      };
    }

    return {
      subsidiary: subsidiary,
      industryLabel: this._industryLabel(subsidiary.industry),
      regionLabel: this._regionLabel(subsidiary.region),
      countryLabel: this._countryLabel(subsidiary.country),
      annualRevenueDisplay: this._formatCurrencyAmount(
        subsidiary.annualRevenue,
        subsidiary.revenueCurrency
      ),
      employeeCountDisplay: this._formatEmployeeCount(subsidiary.employeeCount),
      isInComparison: isInComparison,
      availableInquiryTypes: availableInquiryTypes
    };
  }

  // getSubsidiaryReportsForDownloads(subsidiaryId, reportType, year)
  getSubsidiaryReportsForDownloads(subsidiaryId, reportType, year) {
    const reports = this._getFromStorage('reports');
    const savedItems = this._getOrCreateSavedItemsState();

    const filtered = reports
      .filter(function (r) {
        // Include subsidiary-specific reports and group-level reports
        const matchesSubsidiary = r.subsidiaryId === subsidiaryId;
        const matchesGroupLevel = r.isGroupLevel === true && !r.subsidiaryId;
        if (!matchesSubsidiary && !matchesGroupLevel) return false;
        if (reportType && r.reportType !== reportType) return false;
        if (typeof year === 'number' && r.year !== year) return false;
        return true;
      })
      .sort(function (a, b) {
        if (a.year !== b.year) return b.year - a.year;
        const da = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
        const db = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
        return db - da;
      });

    const out = filtered.map(function (r) {
      const isSaved = savedItems.some(function (si) {
        return si.itemType === 'report' && si.reportId === r.id;
      });
      return {
        report: r,
        title: r.title,
        year: r.year,
        reportTypeLabel: this._enumToLabel(r.reportType),
        isSaved: isSaved
      };
    }, this);

    return out;
  }

  // addSubsidiaryToComparison(subsidiaryId)
  addSubsidiaryToComparison(subsidiaryId) {
    const subsidiaries = this._getFromStorage('subsidiaries');
    const s = subsidiaries.find(function (x) {
      return x.id === subsidiaryId;
    });

    const state = this._getOrCreateActiveSubsidiaryComparison();
    let comparison = state.comparison;

    if (!Array.isArray(comparison.subsidiaryIds)) {
      comparison.subsidiaryIds = [];
    }

    if (s && comparison.subsidiaryIds.indexOf(subsidiaryId) === -1) {
      comparison.subsidiaryIds.push(subsidiaryId);
    }

    // persist updated comparison
    const comparisons = this._getFromStorage('subsidiary_comparisons');
    const updated = comparisons.map(function (c) {
      if (c.id === comparison.id) return comparison;
      return c;
    });
    this._saveToStorage('subsidiary_comparisons', updated);
    localStorage.setItem('activeSubsidiaryComparisonId', comparison.id);

    const comparisonSubsidiaries = comparison.subsidiaryIds
      .map(function (id) {
        return subsidiaries.find(function (x) {
          return x.id === id;
        }) || null;
      })
      .filter(function (x) {
        return !!x;
      });

    const message = s
      ? 'Subsidiary added to comparison.'
      : 'Active comparison returned (subsidiary not found).';

    return {
      comparison: comparison,
      subsidiaries: comparisonSubsidiaries,
      message: message
    };
  }

  // getActiveSubsidiaryComparison()
  getActiveSubsidiaryComparison() {
    const subsidiaries = this._getFromStorage('subsidiaries');
    const comparison = this._getActiveSubsidiaryComparisonRecord();

    if (!comparison) {
      return {
        comparison: null,
        items: []
      };
    }

    const items = comparison.subsidiaryIds.map(
      function (id) {
        const s = subsidiaries.find(function (x) {
          return x.id === id;
        }) || null;
        if (!s) {
          return {
            subsidiary: null,
            industryLabel: '',
            regionLabel: '',
            countryLabel: '',
            annualRevenueDisplay: '',
            employeeCountDisplay: ''
          };
        }
        return {
          subsidiary: s,
          industryLabel: this._industryLabel(s.industry),
          regionLabel: this._regionLabel(s.region),
          countryLabel: this._countryLabel(s.country),
          annualRevenueDisplay: this._formatCurrencyAmount(
            s.annualRevenue,
            s.revenueCurrency
          ),
          employeeCountDisplay: this._formatEmployeeCount(s.employeeCount)
        };
      }.bind(this)
    );

    return {
      comparison: comparison,
      items: items
    };
  }

  // clearSubsidiaryComparison()
  clearSubsidiaryComparison() {
    let comparisons = this._getFromStorage('subsidiary_comparisons');
    const activeId = localStorage.getItem('activeSubsidiaryComparisonId') || '';
    let found = false;
    comparisons = comparisons.map(function (c) {
      if (c.id === activeId && c.status === 'active') {
        found = true;
        return Object.assign({}, c, { status: 'archived' });
      }
      return c;
    });
    this._saveToStorage('subsidiary_comparisons', comparisons);
    localStorage.setItem('activeSubsidiaryComparisonId', '');

    return {
      success: true,
      message: found ? 'Active comparison cleared.' : 'No active comparison to clear.'
    };
  }

  // addSubsidiaryToList(subsidiaryId, listId, newListName)
  addSubsidiaryToList(subsidiaryId, listId, newListName) {
    let lists = this._getFromStorage('subsidiary_lists');
    let items = this._getFromStorage('subsidiary_list_items');

    let targetList = null;

    if (newListName && newListName.trim()) {
      targetList = {
        id: this._generateId('subsidiarylist'),
        name: newListName.trim(),
        description: '',
        createdAt: this._nowTimestamp()
      };
      lists.push(targetList);
      this._saveToStorage('subsidiary_lists', lists);
    } else if (listId) {
      targetList = lists.find(function (l) {
        return l.id === listId;
      }) || null;
    }

    if (!targetList) {
      return {
        list: null,
        listItem: null,
        message: 'List not found and no new list name provided.'
      };
    }

    let listItem = items.find(function (li) {
      return li.listId === targetList.id && li.subsidiaryId === subsidiaryId;
    }) || null;

    if (!listItem) {
      listItem = {
        id: this._generateId('subsidiarylistitem'),
        listId: targetList.id,
        subsidiaryId: subsidiaryId,
        addedAt: this._nowTimestamp()
      };
      items.push(listItem);
      this._saveToStorage('subsidiary_list_items', items);
      return {
        list: targetList,
        listItem: listItem,
        message: 'Subsidiary added to list.'
      };
    }

    return {
      list: targetList,
      listItem: listItem,
      message: 'Subsidiary already in list.'
    };
  }

  // getUserSubsidiaryLists()
  getUserSubsidiaryLists() {
    const lists = this._getFromStorage('subsidiary_lists');
    const items = this._getFromStorage('subsidiary_list_items');

    return lists.map(function (list) {
      const count = items.filter(function (li) {
        return li.listId === list.id;
      }).length;
      return {
        list: list,
        subsidiaryCount: count
      };
    });
  }

  // getSubsidiaryListDetail(listId)
  getSubsidiaryListDetail(listId) {
    const lists = this._getFromStorage('subsidiary_lists');
    const items = this._getFromStorage('subsidiary_list_items');
    const subsidiaries = this._getFromStorage('subsidiaries');

    const list = lists.find(function (l) {
      return l.id === listId;
    }) || null;

    const listItems = items.filter(function (li) {
      return li.listId === listId;
    });

    const detailedItems = listItems.map(
      function (li) {
        const s = subsidiaries.find(function (x) {
          return x.id === li.subsidiaryId;
        }) || null;
        return {
          listItem: li,
          subsidiary: s,
          industryLabel: s ? this._industryLabel(s.industry) : '',
          regionLabel: s ? this._regionLabel(s.region) : '',
          annualRevenueDisplay: s
            ? this._formatCurrencyAmount(s.annualRevenue, s.revenueCurrency)
            : ''
        };
      }.bind(this)
    );

    // Instrumentation for task completion tracking (task_9)
    try {
      if (list) {
        localStorage.setItem(
          'task9_openedListInfo',
          JSON.stringify({
            listId: list.id,
            listName: list.name,
            openedAt: this._nowTimestamp()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      list: list,
      items: detailedItems
    };
  }

  // updateSubsidiaryListName(listId, newName)
  updateSubsidiaryListName(listId, newName) {
    let lists = this._getFromStorage('subsidiary_lists');
    let updatedList = null;

    lists = lists.map(function (l) {
      if (l.id === listId) {
        updatedList = Object.assign({}, l, { name: newName });
        return updatedList;
      }
      return l;
    });

    this._saveToStorage('subsidiary_lists', lists);

    return {
      list: updatedList,
      message: updatedList ? 'List name updated.' : 'List not found.'
    };
  }

  // removeSubsidiaryFromList(listId, subsidiaryId)
  removeSubsidiaryFromList(listId, subsidiaryId) {
    const items = this._getFromStorage('subsidiary_list_items');
    const before = items.length;
    const filtered = items.filter(function (li) {
      return !(li.listId === listId && li.subsidiaryId === subsidiaryId);
    });
    const after = filtered.length;
    this._saveToStorage('subsidiary_list_items', filtered);

    return {
      success: before !== after,
      message: before !== after ? 'Subsidiary removed from list.' : 'No matching list item found.'
    };
  }

  // saveReport(reportId, label)
  saveReport(reportId, label) {
    const savedItems = this._getOrCreateSavedItemsState();

    let existing = savedItems.find(function (si) {
      return si.itemType === 'report' && si.reportId === reportId;
    }) || null;

    if (existing) {
      if (label) existing.label = label;
      existing.savedAt = this._nowTimestamp();
      this._saveToStorage('saved_items', savedItems);
      return {
        savedItem: existing,
        message: 'Report already saved; metadata updated.'
      };
    }

    const savedItem = {
      id: this._generateId('saveditem'),
      itemType: 'report',
      reportId: reportId,
      subsidiaryId: null,
      jobId: null,
      eventId: null,
      pageId: null,
      label: label || null,
      savedAt: this._nowTimestamp()
    };

    savedItems.push(savedItem);
    this._saveToStorage('saved_items', savedItems);

    return {
      savedItem: savedItem,
      message: 'Report saved.'
    };
  }

  // getSavedItems()
  getSavedItems() {
    const savedItems = this._getOrCreateSavedItemsState();
    const reports = this._getFromStorage('reports');
    const subsidiaries = this._getFromStorage('subsidiaries');
    const jobs = this._getFromStorage('jobs');
    const events = this._getFromStorage('events');
    const pages = this._getFromStorage('sustainability_pages');

    return savedItems.map(
      function (si) {
        let report = null;
        let subsidiary = null;
        let job = null;
        let event = null;
        let page = null;
        let displayTitle = '';
        let displaySubtitle = '';

        if (si.itemType === 'report' && si.reportId) {
          report = reports.find(function (r) {
            return r.id === si.reportId;
          }) || null;
          if (report) {
            displayTitle = report.title;
            displaySubtitle = String(report.year || '') + ' ' + this._enumToLabel(report.reportType);
          }
        } else if (si.itemType === 'subsidiary' && si.subsidiaryId) {
          subsidiary = subsidiaries.find(function (s) {
            return s.id === si.subsidiaryId;
          }) || null;
          if (subsidiary) {
            displayTitle = subsidiary.name;
            displaySubtitle = this._industryLabel(subsidiary.industry);
          }
        } else if (si.itemType === 'job' && si.jobId) {
          job = jobs.find(function (j) {
            return j.id === si.jobId;
          }) || null;
          if (job) {
            displayTitle = job.title;
            displaySubtitle = this._formatJobLocation(job);
          }
        } else if (si.itemType === 'event' && si.eventId) {
          event = events.find(function (e) {
            return e.id === si.eventId;
          }) || null;
          if (event) {
            displayTitle = event.title;
            displaySubtitle = this._formatDateTimeDisplay(event.startDateTime);
          }
        } else if (si.itemType === 'page' && si.pageId) {
          page = pages.find(function (p) {
            return p.id === si.pageId;
          }) || null;
          if (page) {
            displayTitle = page.title;
            displaySubtitle = page.summary || '';
          }
        }

        if (si.label) {
          // label overrides title if provided
          displayTitle = si.label;
        }

        return {
          savedItem: si,
          report: report,
          subsidiary: subsidiary,
          job: job,
          event: event,
          page: page,
          displayTitle: displayTitle,
          displaySubtitle: displaySubtitle
        };
      }.bind(this)
    );
  }

  // submitSubsidiaryContactInquiry(subsidiaryId, inquiryType, name, email, company, message)
  submitSubsidiaryContactInquiry(subsidiaryId, inquiryType, name, email, company, message) {
    const subsidiaries = this._getFromStorage('subsidiaries');
    const exists = subsidiaries.some(function (s) {
      return s.id === subsidiaryId;
    });

    const inquiries = this._getFromStorage('contact_inquiries');
    const inquiry = {
      id: this._generateId('contactinquiry'),
      subsidiaryId: subsidiaryId,
      inquiryType: inquiryType,
      name: name,
      email: email,
      company: company || null,
      message: message,
      status: 'submitted',
      createdAt: this._nowTimestamp()
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      inquiry: inquiry,
      message: exists
        ? 'Contact inquiry submitted.'
        : 'Contact inquiry submitted (warning: subsidiary not found).'
    };
  }

  // getReportFilterOptions()
  getReportFilterOptions() {
    const reports = this._getFromStorage('reports');
    const typeSet = {};
    const yearSet = {};

    reports.forEach(function (r) {
      if (r.reportType) typeSet[r.reportType] = true;
      if (typeof r.year === 'number') yearSet[r.year] = true;
    });

    const reportTypeOptions = Object.keys(typeSet).map(
      function (v) {
        return { value: v, label: this._enumToLabel(v) };
      }.bind(this)
    );

    const yearOptions = Object.keys(yearSet)
      .map(function (v) {
        return parseInt(v, 10);
      })
      .sort(function (a, b) {
        return b - a;
      });

    return {
      reportTypeOptions: reportTypeOptions,
      yearOptions: yearOptions
    };
  }

  // searchFinancialReports(reportType, year, isGroupLevel)
  searchFinancialReports(reportType, year, isGroupLevel) {
    const reports = this._getFromStorage('reports');

    const filtered = reports
      .filter(function (r) {
        if (reportType && r.reportType !== reportType) return false;
        if (typeof year === 'number' && r.year !== year) return false;
        if (typeof isGroupLevel === 'boolean' && r.isGroupLevel !== isGroupLevel) {
          return false;
        }
        return true;
      })
      .sort(function (a, b) {
        if (a.year !== b.year) return b.year - a.year;
        const da = a.publishedDate ? new Date(a.publishedDate).getTime() : 0;
        const db = b.publishedDate ? new Date(b.publishedDate).getTime() : 0;
        return db - da;
      });

    return filtered.map(
      function (r) {
        return {
          report: r,
          title: r.title,
          year: r.year,
          reportTypeLabel: this._enumToLabel(r.reportType)
        };
      }.bind(this)
    );
  }

  // getReportDetails(reportId)
  getReportDetails(reportId) {
    const reports = this._getFromStorage('reports');
    const report = reports.find(function (r) {
      return r.id === reportId;
    }) || null;

    if (!report) {
      return {
        report: null,
        title: '',
        year: null,
        reportTypeLabel: '',
        summary: '',
        downloadAvailable: false
      };
    }

    return {
      report: report,
      title: report.title,
      year: report.year,
      reportTypeLabel: this._enumToLabel(report.reportType),
      summary: report.description || '',
      downloadAvailable: !!report.fileUrl
    };
  }

  // downloadReportPdf(reportId)
  downloadReportPdf(reportId) {
    const reports = this._getFromStorage('reports');
    const report = reports.find(function (r) {
      return r.id === reportId;
    }) || null;

    if (!report) {
      return { fileUrl: '', fileName: '' };
    }

    // Instrumentation for task completion tracking (task_3)
    try {
      localStorage.setItem(
        'task3_downloadedReportInfo',
        JSON.stringify({
          reportId: report.id,
          title: report.title,
          year: report.year,
          reportType: report.reportType,
          isGroupLevel: !!report.isGroupLevel,
          downloadedAt: this._nowTimestamp()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    let fileName = '';
    if (report.fileUrl) {
      const parts = report.fileUrl.split('/');
      fileName = parts[parts.length - 1] || '';
    }
    if (!fileName) {
      const safeTitle = (report.title || 'report').replace(/\s+/g, '_');
      fileName = safeTitle + '.pdf';
    }

    // Only metadata returned; no file data stored in localStorage
    return {
      fileUrl: report.fileUrl || '',
      fileName: fileName
    };
  }

  // getUpcomingFinancialEventsForReport(reportId, limit)
  getUpcomingFinancialEventsForReport(reportId, limit) {
    const events = this._getFromStorage('events');
    const now = new Date();
    const max = typeof limit === 'number' && limit > 0 ? limit : 5;

    const filtered = events
      .filter(function (e) {
        if (!e.isInvestorEvent) return false;
        const d = e.startDateTime ? new Date(e.startDateTime) : null;
        if (!d || isNaN(d.getTime())) return false;
        return d >= now;
      })
      .sort(function (a, b) {
        const da = new Date(a.startDateTime).getTime();
        const db = new Date(b.startDateTime).getTime();
        return da - db;
      })
      .slice(0, max);

    return filtered.map(
      function (e) {
        return {
          event: e,
          title: e.title,
          startDateTime: e.startDateTime,
          eventTypeLabel: this._enumToLabel(e.eventType)
        };
      }.bind(this)
    );
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const eventTypeOptions = ENUMS.eventType.map(
      function (v) {
        return { value: v, label: this._enumToLabel(v) };
      }.bind(this)
    );
    const formatOptions = ENUMS.eventFormat.map(
      function (v) {
        return { value: v, label: this._enumToLabel(v) };
      }.bind(this)
    );
    const countryOptions = ENUMS.subsidiaryCountry.map(
      function (v) {
        return { value: v, label: this._countryLabel(v) };
      }.bind(this)
    );

    const events = this._getFromStorage('events');
    const citySet = {};
    events.forEach(function (e) {
      if (e.locationCity) citySet[e.locationCity] = true;
    });
    const cityOptions = Object.keys(citySet);

    const sortOptions = [
      { value: 'date_soonest_first', label: 'Date - Soonest first' },
      { value: 'date_latest_first', label: 'Date - Latest first' }
    ];

    return {
      eventTypeOptions: eventTypeOptions,
      formatOptions: formatOptions,
      countryOptions: countryOptions,
      cityOptions: cityOptions,
      sortOptions: sortOptions
    };
  }

  // searchInvestorEvents(eventType, locationCountry, locationCity, format, startDate, endDate, sortBy, sortDirection)
  searchInvestorEvents(
    eventType,
    locationCountry,
    locationCity,
    format,
    startDate,
    endDate,
    sortBy,
    sortDirection
  ) {
    const events = this._getFromStorage('events');
    const direction = sortDirection === 'desc' ? 'desc' : 'asc';

    const filtered = events.filter(
      function (e) {
        if (!e.isInvestorEvent) return false;
        if (eventType && e.eventType !== eventType) return false;
        if (locationCountry && e.locationCountry !== locationCountry) return false;
        if (locationCity && e.locationCity !== locationCity) return false;
        if (format && e.format !== format) return false;
        if (startDate || endDate) {
          if (!this._dateWithinIsoRange(e.startDateTime, startDate, endDate)) {
            return false;
          }
        }
        return true;
      }.bind(this)
    );

    filtered.sort(function (a, b) {
      const da = a.startDateTime ? new Date(a.startDateTime).getTime() : 0;
      const db = b.startDateTime ? new Date(b.startDateTime).getTime() : 0;
      return direction === 'asc' ? da - db : db - da;
    });

    return filtered.map(
      function (e) {
        const canRegister = !!e.canRegisterOnline;
        const canAddToCalendar = true;
        return {
          event: e,
          title: e.title,
          eventTypeLabel: this._enumToLabel(e.eventType),
          formatLabel: this._enumToLabel(e.format),
          dateTimeDisplay: this._formatDateTimeDisplay(e.startDateTime),
          locationDisplay: this._formatLocationFromEvent(e),
          canRegister: canRegister,
          canAddToCalendar: canAddToCalendar
        };
      }.bind(this)
    );
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(function (e) {
      return e.id === eventId;
    }) || null;

    if (!event) {
      return {
        event: null,
        title: '',
        eventTypeLabel: '',
        formatLabel: '',
        dateTimeDisplay: '',
        locationDisplay: '',
        registrationOpen: false
      };
    }

    return {
      event: event,
      title: event.title,
      eventTypeLabel: this._enumToLabel(event.eventType),
      formatLabel: this._enumToLabel(event.format),
      dateTimeDisplay: this._formatDateTimeDisplay(event.startDateTime),
      locationDisplay: this._formatLocationFromEvent(event),
      registrationOpen: !!event.canRegisterOnline
    };
  }

  // addEventToSiteCalendar(eventId, source)
  addEventToSiteCalendar(eventId, source) {
    const entries = this._getFromStorage('site_calendar_entries');
    let entry = entries.find(function (e) {
      return e.eventId === eventId;
    }) || null;

    if (entry) {
      return {
        calendarEntry: entry,
        message: 'Event is already in calendar.'
      };
    }

    entry = {
      id: this._generateId('sitecalendarentry'),
      eventId: eventId,
      source: source,
      addedAt: this._nowTimestamp()
    };
    entries.push(entry);
    this._saveToStorage('site_calendar_entries', entries);

    return {
      calendarEntry: entry,
      message: 'Event added to site calendar.'
    };
  }

  // getSiteCalendarEntries(startDate, endDate)
  getSiteCalendarEntries(startDate, endDate) {
    const entries = this._getFromStorage('site_calendar_entries');
    const events = this._getFromStorage('events');

    const filteredEntries = entries.filter(
      function (entry) {
        if (!startDate && !endDate) return true;
        const event = events.find(function (e) {
          return e.id === entry.eventId;
        });
        if (!event) return false;
        return this._dateWithinIsoRange(event.startDateTime, startDate, endDate);
      }.bind(this)
    );

    return filteredEntries.map(
      function (entry) {
        const event = events.find(function (e) {
          return e.id === entry.eventId;
        }) || null;
        return {
          entry: entry,
          event: event,
          title: event ? event.title : '',
          dateTimeDisplay: event
            ? this._formatDateTimeDisplay(event.startDateTime)
            : ''
        };
      }.bind(this)
    );
  }

  // registerForEvent(eventId, attendanceMode, name, email, organization)
  registerForEvent(eventId, attendanceMode, name, email, organization) {
    const registrations = this._getFromStorage('event_registrations');
    const registration = {
      id: this._generateId('eventregistration'),
      eventId: eventId,
      attendanceMode: attendanceMode,
      name: name,
      email: email,
      organization: organization || null,
      status: 'submitted',
      registeredAt: this._nowTimestamp()
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      registration: registration,
      message: 'Event registration submitted.'
    };
  }

  // getJobSearchFilterOptions()
  getJobSearchFilterOptions() {
    const countryOptions = ENUMS.subsidiaryCountry.map(
      function (v) {
        return { value: v, label: this._countryLabel(v) };
      }.bind(this)
    );
    const departmentOptions = ENUMS.jobDepartment.map(
      function (v) {
        return { value: v, label: this._enumToLabel(v) };
      }.bind(this)
    );
    const experienceLevelOptions = ENUMS.jobExperienceLevel.map(
      function (v) {
        return { value: v, label: this._enumToLabel(v) };
      }.bind(this)
    );
    const datePostedOptions = [
      { value: 'last_24_hours', label: 'Last 24 hours' },
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'all', label: 'All' }
    ];
    const sortOptions = [
      { value: 'posting_date_desc', label: 'Posting date - Newest first' },
      { value: 'posting_date_asc', label: 'Posting date - Oldest first' }
    ];

    return {
      countryOptions: countryOptions,
      departmentOptions: departmentOptions,
      experienceLevelOptions: experienceLevelOptions,
      datePostedOptions: datePostedOptions,
      sortOptions: sortOptions
    };
  }

  // searchJobs(locationCountry, department, experienceLevel, datePostedRange, sortBy, sortDirection, page, pageSize)
  searchJobs(
    locationCountry,
    department,
    experienceLevel,
    datePostedRange,
    sortBy,
    sortDirection,
    page,
    pageSize
  ) {
    const jobs = this._getFromStorage('jobs');
    const shortlist = this._getFromStorage('job_shortlist_entries');
    const direction = sortDirection === 'asc' ? 'asc' : 'desc';

    const now = new Date();
    const filtered = jobs.filter(function (j) {
      if (!j.isActive) return false;
      if (locationCountry && j.locationCountry !== locationCountry) return false;
      if (department && j.department !== department) return false;
      if (experienceLevel && j.experienceLevel !== experienceLevel) return false;

      if (datePostedRange && datePostedRange !== 'all') {
        const posted = j.datePosted ? new Date(j.datePosted) : null;
        if (!posted || isNaN(posted.getTime())) return false;
        let days = 0;
        if (datePostedRange === 'last_24_hours') days = 1;
        else if (datePostedRange === 'last_7_days') days = 7;
        else if (datePostedRange === 'last_30_days') days = 30;
        if (days > 0) {
          const threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
          if (posted < threshold) return false;
        }
      }

      return true;
    });

    filtered.sort(function (a, b) {
      const da = a.datePosted ? new Date(a.datePosted).getTime() : 0;
      const db = b.datePosted ? new Date(b.datePosted).getTime() : 0;
      return direction === 'asc' ? da - db : db - da;
    });

    const totalCount = filtered.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (currentPage - 1) * size;
    const endIndex = startIndex + size;
    const slice = filtered.slice(startIndex, endIndex);

    const results = slice.map(
      function (j) {
        const isShortlisted = shortlist.some(function (s) {
          return s.jobId === j.id;
        });
        return {
          job: j,
          title: j.title,
          locationDisplay: this._formatJobLocation(j),
          departmentLabel: this._enumToLabel(j.department),
          experienceLevelLabel: this._enumToLabel(j.experienceLevel),
          postingDateDisplay: this._formatDateTimeDisplay(j.datePosted),
          isShortlisted: isShortlisted
        };
      }.bind(this)
    );

    return {
      results: results,
      totalCount: totalCount,
      page: currentPage,
      pageSize: size
    };
  }

  // getJobDetails(jobId)
  getJobDetails(jobId) {
    const jobs = this._getFromStorage('jobs');
    const shortlist = this._getFromStorage('job_shortlist_entries');
    const job = jobs.find(function (j) {
      return j.id === jobId;
    }) || null;

    if (!job) {
      return {
        job: null,
        title: '',
        locationDisplay: '',
        departmentLabel: '',
        experienceLevelLabel: '',
        employmentTypeLabel: '',
        isShortlisted: false
      };
    }

    const isShortlisted = shortlist.some(function (s) {
      return s.jobId === job.id;
    });

    return {
      job: job,
      title: job.title,
      locationDisplay: this._formatJobLocation(job),
      departmentLabel: this._enumToLabel(job.department),
      experienceLevelLabel: this._enumToLabel(job.experienceLevel),
      employmentTypeLabel: this._enumToLabel(job.employmentType),
      isShortlisted: isShortlisted
    };
  }

  // addJobToShortlist(jobId)
  addJobToShortlist(jobId) {
    let shortlist = this._getFromStorage('job_shortlist_entries');

    let entry = shortlist.find(function (s) {
      return s.jobId === jobId;
    }) || null;

    if (entry) {
      return {
        shortlistEntry: entry,
        message: 'Job already in shortlist.'
      };
    }

    entry = {
      id: this._generateId('jobshortlistentry'),
      jobId: jobId,
      addedAt: this._nowTimestamp()
    };
    shortlist.push(entry);
    this._saveToStorage('job_shortlist_entries', shortlist);

    return {
      shortlistEntry: entry,
      message: 'Job added to shortlist.'
    };
  }

  // getJobShortlist()
  getJobShortlist() {
    const shortlist = this._getFromStorage('job_shortlist_entries');
    const jobs = this._getFromStorage('jobs');

    return shortlist.map(
      function (entry) {
        const job = jobs.find(function (j) {
          return j.id === entry.jobId;
        }) || null;
        return {
          shortlistEntry: entry,
          job: job,
          title: job ? job.title : '',
          locationDisplay: job ? this._formatJobLocation(job) : ''
        };
      }.bind(this)
    );
  }

  // getNewsFilterOptions()
  getNewsFilterOptions() {
    const topicOptions = ENUMS.emailTopics.map(
      function (v) {
        return { value: v, label: this._enumToLabel(v) };
      }.bind(this)
    );
    return {
      topicOptions: topicOptions
    };
  }

  // searchNewsAndMedia(topic, query, page, pageSize)
  searchNewsAndMedia(topic, query, page, pageSize) {
    const items = this._getFromStorage('news_items');
    const q = query ? String(query).toLowerCase() : '';

    const filtered = items.filter(function (item) {
      if (topic && item.topic !== topic) return false;
      if (q) {
        const combined = ((item.title || '') + ' ' + (item.summary || '')).toLowerCase();
        if (combined.indexOf(q) === -1) return false;
      }
      return true;
    });

    const totalCount = filtered.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (currentPage - 1) * size;
    const endIndex = startIndex + size;
    const slice = filtered.slice(startIndex, endIndex);

    const results = slice.map(
      function (item) {
        return {
          id: item.id,
          title: item.title,
          topic: item.topic,
          topicLabel: this._enumToLabel(item.topic),
          publishDate: item.publishDate || '',
          summary: item.summary || ''
        };
      }.bind(this)
    );

    return {
      results: results,
      totalCount: totalCount,
      page: currentPage,
      pageSize: size
    };
  }

  // getEmailSubscriptionTopics()
  getEmailSubscriptionTopics() {
    const topicOptions = ENUMS.emailTopics.map(
      function (v) {
        return { value: v, label: this._enumToLabel(v) };
      }.bind(this)
    );
    const frequencyOptions = ENUMS.emailFrequency.map(
      function (v) {
        return { value: v, label: this._enumToLabel(v) };
      }.bind(this)
    );

    return {
      topicOptions: topicOptions,
      frequencyOptions: frequencyOptions
    };
  }

  // createEmailSubscription(fullName, email, topics, frequency)
  createEmailSubscription(fullName, email, topics, frequency) {
    const subscriptions = this._getFromStorage('email_subscriptions');

    const subscription = {
      id: this._generateId('emailsubscription'),
      fullName: fullName,
      email: email,
      topics: Array.isArray(topics) ? topics.slice() : [],
      topicEnum: null,
      frequency: frequency,
      isActive: true,
      createdAt: this._nowTimestamp()
    };

    subscriptions.push(subscription);
    this._saveToStorage('email_subscriptions', subscriptions);

    return {
      subscription: subscription,
      message: 'Email subscription created.'
    };
  }

  // getSustainabilityOverview()
  getSustainabilityOverview() {
    const pages = this._getFromStorage('sustainability_pages');

    const sections = ENUMS.sustainabilitySection.map(
      function (sec) {
        return {
          id: sec,
          slug: sec,
          title: this._enumToLabel(sec),
          description: ''
        };
      }.bind(this)
    );

    const featuredPages = pages
      .slice()
      .sort(function (a, b) {
        const da = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
        const db = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
        return db - da;
      })
      .slice(0, 10);

    return {
      sections: sections,
      featuredPages: featuredPages
    };
  }

  // getClimateAndEnergyContent(query)
  getClimateAndEnergyContent(query) {
    const pages = this._getFromStorage('sustainability_pages');
    const q = query ? String(query).toLowerCase() : '';

    const filtered = pages.filter(function (p) {
      if (p.section !== 'climate_energy') return false;
      if (!q) return true;
      const text = (
        (p.title || '') +
        ' ' +
        (p.summary || '') +
        ' ' +
        (p.content || '') +
        ' ' +
        (Array.isArray(p.searchKeywords) ? p.searchKeywords.join(' ') : '')
      ).toLowerCase();
      return text.indexOf(q) !== -1;
    });

    return filtered;
  }

  // getSustainabilityPageDetails(pageId, slug)
  getSustainabilityPageDetails(pageId, slug) {
    const pages = this._getFromStorage('sustainability_pages');
    const bookmarks = this._getFromStorage('page_bookmarks');

    let page = null;
    if (pageId) {
      page = pages.find(function (p) {
        return p.id === pageId;
      }) || null;
    } else if (slug) {
      page = pages.find(function (p) {
        return p.slug === slug;
      }) || null;
    }

    if (!page) {
      return {
        page: null,
        title: '',
        content: '',
        hasScope1Targets: false,
        hasScope2Targets: false,
        isBookmarked: false
      };
    }

    const isBookmarked = bookmarks.some(function (b) {
      return b.pageId === page.id;
    });

    return {
      page: page,
      title: page.title,
      content: page.content || '',
      hasScope1Targets: !!page.hasScope1Targets,
      hasScope2Targets: !!page.hasScope2Targets,
      isBookmarked: isBookmarked
    };
  }

  // bookmarkSustainabilityPage(pageId)
  bookmarkSustainabilityPage(pageId) {
    const pages = this._getFromStorage('sustainability_pages');
    const page = pages.find(function (p) {
      return p.id === pageId;
    }) || null;

    let bookmarks = this._getFromStorage('page_bookmarks');
    let bookmark = bookmarks.find(function (b) {
      return b.pageId === pageId;
    }) || null;

    if (bookmark) {
      return {
        bookmark: bookmark,
        message: 'Page already bookmarked.'
      };
    }

    bookmark = {
      id: this._generateId('pagebookmark'),
      pageId: pageId,
      pageTitle: page ? page.title : '',
      pageUrl: page ? page.url : '',
      source: 'sustainability_page',
      createdAt: this._nowTimestamp()
    };
    bookmarks.push(bookmark);
    this._saveToStorage('page_bookmarks', bookmarks);

    return {
      bookmark: bookmark,
      message: 'Page added to bookmarks.'
    };
  }

  // getPageBookmarks()
  getPageBookmarks() {
    const bookmarks = this._getFromStorage('page_bookmarks');
    const pages = this._getFromStorage('sustainability_pages');

    return bookmarks.map(function (b) {
      const page = pages.find(function (p) {
        return p.id === b.pageId;
      }) || null;
      return {
        bookmark: b,
        page: page
      };
    });
  }

  // getSupplierRegistrationOptions()
  getSupplierRegistrationOptions() {
    const supplierCategoryOptions = ENUMS.supplierCategory.map(
      function (v) {
        return { value: v, label: this._enumToLabel(v) };
      }.bind(this)
    );
    const regionOptions = ENUMS.supplierRegion.map(
      function (v) {
        return { value: v, label: this._regionLabel(v) };
      }.bind(this)
    );
    const annualRevenueRangeOptions = ENUMS.supplierRevenueRange.map(
      function (v) {
        return { value: v, label: this._enumToLabel(v) };
      }.bind(this)
    );

    return {
      supplierCategoryOptions: supplierCategoryOptions,
      regionOptions: regionOptions,
      annualRevenueRangeOptions: annualRevenueRangeOptions
    };
  }

  // submitSupplierRegistration(supplierCategory, primaryRegion, annualRevenueRange, companyName, website, contactName, contactEmail)
  submitSupplierRegistration(
    supplierCategory,
    primaryRegion,
    annualRevenueRange,
    companyName,
    website,
    contactName,
    contactEmail
  ) {
    const registrations = this._getFromStorage('supplier_registrations');

    const registration = {
      id: this._generateId('supplierregistration'),
      supplierCategory: supplierCategory,
      primaryRegion: primaryRegion,
      annualRevenueRange: annualRevenueRange,
      companyName: companyName,
      website: website || null,
      contactName: contactName,
      contactEmail: contactEmail,
      status: 'submitted',
      submittedAt: this._nowTimestamp()
    };

    registrations.push(registration);
    this._saveToStorage('supplier_registrations', registrations);

    return {
      registration: registration,
      message: 'Supplier registration submitted.'
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