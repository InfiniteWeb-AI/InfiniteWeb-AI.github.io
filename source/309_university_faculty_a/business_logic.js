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

  // =======================
  // Storage initialization
  // =======================
  _initStorage() {
    const keys = [
      'departments',
      'faculties',
      'courses',
      'publications',
      'office_hour_slots',
      'office_hour_bookings',
      'events',
      'reading_lists',
      'notes',
      'contacts',
      'thesis_advisor_shortlists',
      'publications_export_lists',
      'planned_courses_lists',
      'bookmarked_events_lists',
      'contact_messages',
      'static_pages'
    ];

    keys.forEach((key) => {
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

  _nowISO() {
    return new Date().toISOString();
  }

  // =======================
  // Helper: term & time
  // =======================
  _normalizeTerm(term) {
    if (!term) return '';
    return String(term).trim().toLowerCase().replace(/\s+/g, '_');
  }

  _timeStringToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  // Internal helper to normalize 'HH:MM' time strings and compare
  _normalizeAndCompareTimes(a, b) {
    const ma = this._timeStringToMinutes(a);
    const mb = this._timeStringToMinutes(b);
    if (ma == null && mb == null) return 0;
    if (ma == null) return -1;
    if (mb == null) return 1;
    return ma - mb;
  }

  // =======================
  // Helper: singleton lists
  // =======================
  _getOrCreateReadingList() {
    const key = 'reading_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists)) lists = [];
    if (lists.length === 0) {
      const now = this._nowISO();
      const readingList = {
        id: this._generateId('readinglist'),
        publication_ids: [],
        created_at: now,
        updated_at: now,
        // extra map for read status per publication
        publication_status: {}
      };
      lists.push(readingList);
      this._saveToStorage(key, lists);
      return readingList;
    }
    return lists[0];
  }

  _updateReadingList(readingList) {
    const key = 'reading_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists) || lists.length === 0) {
      lists = [readingList];
    } else {
      lists[0] = readingList;
    }
    this._saveToStorage(key, lists);
  }

  _getOrCreatePublicationsExportList() {
    const key = 'publications_export_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists)) lists = [];
    if (lists.length === 0) {
      const now = this._nowISO();
      const exportList = {
        id: this._generateId('pubexport'),
        publication_ids: [],
        citation_style: 'apa',
        created_at: now,
        updated_at: now
      };
      lists.push(exportList);
      this._saveToStorage(key, lists);
      return exportList;
    }
    return lists[0];
  }

  _updatePublicationsExportList(exportList) {
    const key = 'publications_export_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists) || lists.length === 0) {
      lists = [exportList];
    } else {
      lists[0] = exportList;
    }
    this._saveToStorage(key, lists);
  }

  _getOrCreatePlannedCoursesList() {
    const key = 'planned_courses_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists)) lists = [];
    if (lists.length === 0) {
      const now = this._nowISO();
      const planned = {
        id: this._generateId('plannedcourses'),
        course_ids: [],
        created_at: now,
        updated_at: now
      };
      lists.push(planned);
      this._saveToStorage(key, lists);
      return planned;
    }
    return lists[0];
  }

  _updatePlannedCoursesList(planned) {
    const key = 'planned_courses_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists) || lists.length === 0) {
      lists = [planned];
    } else {
      lists[0] = planned;
    }
    this._saveToStorage(key, lists);
  }

  _getOrCreateThesisAdvisorShortlist() {
    const key = 'thesis_advisor_shortlists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists)) lists = [];
    if (lists.length === 0) {
      const now = this._nowISO();
      const shortlist = {
        id: this._generateId('thesisshortlist'),
        faculty_ids: [],
        created_at: now,
        updated_at: now
      };
      lists.push(shortlist);
      this._saveToStorage(key, lists);
      return shortlist;
    }
    return lists[0];
  }

  _updateThesisAdvisorShortlist(shortlist) {
    const key = 'thesis_advisor_shortlists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists) || lists.length === 0) {
      lists = [shortlist];
    } else {
      lists[0] = shortlist;
    }
    this._saveToStorage(key, lists);
  }

  _getOrCreateBookmarkedEventsList() {
    const key = 'bookmarked_events_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists)) lists = [];
    if (lists.length === 0) {
      const now = this._nowISO();
      const bookmarks = {
        id: this._generateId('bookmarks'),
        event_ids: [],
        created_at: now,
        updated_at: now,
        // extra map for status per event
        event_status: {}
      };
      lists.push(bookmarks);
      this._saveToStorage(key, lists);
      return bookmarks;
    }
    return lists[0];
  }

  _updateBookmarkedEventsList(list) {
    const key = 'bookmarked_events_lists';
    let lists = this._getFromStorage(key);
    if (!Array.isArray(lists) || lists.length === 0) {
      lists = [list];
    } else {
      lists[0] = list;
    }
    this._saveToStorage(key, lists);
  }

  _getOrCreateNotesStore() {
    let notes = this._getFromStorage('notes');
    if (!Array.isArray(notes)) {
      notes = [];
      this._saveToStorage('notes', notes);
    }
    return notes;
  }

  _updateNotesStore(notes) {
    this._saveToStorage('notes', notes);
  }

  _getOrCreateContactsStore() {
    let contacts = this._getFromStorage('contacts');
    if (!Array.isArray(contacts)) {
      contacts = [];
      this._saveToStorage('contacts', contacts);
    }
    return contacts;
  }

  _updateContactsStore(contacts) {
    this._saveToStorage('contacts', contacts);
  }

  // =======================
  // Helper: citation formatting
  // =======================
  _formatCitation(style, pub) {
    if (!pub) return '';
    const title = pub.title || '';
    const venue = pub.journal_or_venue || '';
    const year = pub.year || '';
    const doi = pub.doi || '';

    if (style === 'bibtex') {
      const key = (pub.journal_or_venue || 'key').toLowerCase().replace(/[^a-z0-9]+/g, '') + year;
      return '@article{' + key + ',\n' +
        '  title={' + title + '},\n' +
        (venue ? '  journal={' + venue + '},\n' : '') +
        (year ? '  year={' + year + '},\n' : '') +
        (doi ? '  doi={' + doi + '},\n' : '') +
        '}';
    }

    // Simple other-style placeholder
    return title + (year ? ' (' + year + ')' : '') + (venue ? ', ' + venue : '') + (doi ? '. doi:' + doi : '');
  }

  // =======================
  // Core interface implementations
  // =======================

  // searchFacultyByName(query, departmentId)
  searchFacultyByName(query, departmentId) {
    const faculties = this._getFromStorage('faculties');
    const departments = this._getFromStorage('departments');
    const q = (query || '').toLowerCase().trim();

    let results = faculties.filter((f) => {
      if (!q) return true;
      const fields = [f.full_name, f.first_name, f.last_name].filter(Boolean).map((s) => String(s).toLowerCase());
      return fields.some((s) => s.includes(q));
    });

    if (departmentId) {
      results = results.filter((f) => {
        return f.primary_department_id === departmentId || f.secondary_department_id === departmentId;
      });
    }

    return results.map((f) => {
      const primaryDept = departments.find((d) => d.id === f.primary_department_id) || null;
      const secondaryDept = f.secondary_department_id ? (departments.find((d) => d.id === f.secondary_department_id) || null) : null;
      return {
        faculty_id: f.id,
        full_name: f.full_name,
        display_title: f.display_title || '',
        primary_department_name: primaryDept ? primaryDept.name : null,
        secondary_department_name: secondaryDept ? secondaryDept.name : null,
        appointment_type: f.appointment_type,
        teaching_status: f.teaching_status,
        is_graduate_faculty: !!f.is_graduate_faculty,
        accepting_new_phd_students: !!f.accepting_new_phd_students
      };
    });
  }

  // getHomeToolsSummary()
  getHomeToolsSummary() {
    const readingList = this._getOrCreateReadingList();
    const planned = this._getOrCreatePlannedCoursesList();
    const shortlist = this._getOrCreateThesisAdvisorShortlist();
    const bookmarks = this._getOrCreateBookmarkedEventsList();
    const notes = this._getOrCreateNotesStore();
    const contacts = this._getOrCreateContactsStore();

    return {
      reading_list_count: Array.isArray(readingList.publication_ids) ? readingList.publication_ids.length : 0,
      planned_courses_count: Array.isArray(planned.course_ids) ? planned.course_ids.length : 0,
      thesis_advisor_shortlist_count: Array.isArray(shortlist.faculty_ids) ? shortlist.faculty_ids.length : 0,
      bookmarked_events_count: Array.isArray(bookmarks.event_ids) ? bookmarks.event_ids.length : 0,
      notes_count: notes.length,
      contacts_count: contacts.length
    };
  }

  // getSiteGuidance()
  getSiteGuidance() {
    return {
      homepage_intro_text: 'Use the faculty directory to explore departments, view faculty profiles, plan courses, and keep track of publications and events.',
      faculty_search_tips: [
        'Search by full or partial faculty name.',
        'Use department and appointment filters to narrow results.',
        'Advanced search lets you filter by research keywords and courses taught.'
      ],
      course_planning_tips: [
        'Use the Courses tab on a faculty profile to see what they are teaching in each term.',
        'Filter by term, meeting days, and time windows to avoid schedule conflicts.',
        'Add interesting courses to your Planned Courses list to build a draft schedule.'
      ],
      publications_tips: [
        'Filter publications by type and year range on the Publications tab.',
        'Save key papers to your Reading List for quick access later.',
        'Use the Export List to generate citations in your preferred style.'
      ],
      office_hours_and_contact_tips: [
        'View office hours on the Office Hours & Appointments tab for each faculty member.',
        'Filter office-hours slots by day and time to find appointments that fit your schedule.',
        'Use the internal contact form on a profile to send messages to faculty.'
      ]
    };
  }

  // getDirectoryFilterOptions()
  getDirectoryFilterOptions() {
    const departments = this._getFromStorage('departments');
    const courses = this._getFromStorage('courses');
    const faculties = this._getFromStorage('faculties');

    const termSet = new Set();
    courses.forEach((c) => {
      if (c.term) {
        termSet.add(this._normalizeTerm(c.term));
      }
    });

    const keywordSet = new Set();
    faculties.forEach((f) => {
      if (Array.isArray(f.research_keywords)) {
        f.research_keywords.forEach((kw) => {
          if (kw) keywordSet.add(String(kw));
        });
      }
    });

    return {
      departments: departments,
      roles: ['graduate_faculty'],
      teaching_statuses: [
        'currently_teaching_this_semester',
        'not_currently_teaching',
        'on_leave'
      ],
      appointment_types: ['single_appointment', 'joint_appointment'],
      terms: Array.from(termSet),
      research_keyword_suggestions: Array.from(keywordSet)
    };
  }

  // searchFacultyDirectory(filters, sort_by, page, page_size)
  searchFacultyDirectory(filters, sort_by, page, page_size) {
    const faculties = this._getFromStorage('faculties');
    const departments = this._getFromStorage('departments');
    const courses = this._getFromStorage('courses');
    const publications = this._getFromStorage('publications');

    const f = filters || {};
    let results = faculties.slice();

    // name_query
    if (f.name_query) {
      const q = String(f.name_query).toLowerCase().trim();
      results = results.filter((fac) => {
        const fields = [fac.full_name, fac.first_name, fac.last_name]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase());
        return fields.some((s) => s.includes(q));
      });
    }

    // department_id (basic primary department filter)
    if (f.department_id) {
      results = results.filter((fac) => fac.primary_department_id === f.department_id);
    }

    // role (only graduate_faculty supported)
    if (f.role === 'graduate_faculty') {
      results = results.filter((fac) => !!fac.is_graduate_faculty);
    }

    // teaching_status
    if (f.teaching_status) {
      results = results.filter((fac) => fac.teaching_status === f.teaching_status);
    }

    // accepting_new_phd_students
    if (typeof f.accepting_new_phd_students === 'boolean') {
      results = results.filter((fac) => !!fac.accepting_new_phd_students === f.accepting_new_phd_students);
    }

    // research_keyword
    if (f.research_keyword) {
      const kw = String(f.research_keyword).toLowerCase().trim();
      results = results.filter((fac) => {
        if (!Array.isArray(fac.research_keywords)) return false;
        return fac.research_keywords.some((rk) => String(rk).toLowerCase().includes(kw));
      });
    }

    // publications since year + min publications count
    if (f.publications_since_year && f.min_publications_count_since_year) {
      const sinceYear = Number(f.publications_since_year);
      const minCount = Number(f.min_publications_count_since_year);
      results = results.filter((fac) => {
        const count = publications.filter((p) => p.faculty_id === fac.id && p.year >= sinceYear).length;
        return count >= minCount;
      });
    }

    // appointment_type
    if (f.appointment_type) {
      results = results.filter((fac) => fac.appointment_type === f.appointment_type);
    }

    // primary_department_id (advanced)
    if (f.primary_department_id) {
      results = results.filter((fac) => fac.primary_department_id === f.primary_department_id);
    }

    // secondary_department_id (advanced)
    if (f.secondary_department_id) {
      results = results.filter((fac) => fac.secondary_department_id === f.secondary_department_id);
    }

    // term / courses_taught_keyword filters (hierarchical via Course)
    const termFilterNorm = f.term ? String(f.term).toLowerCase().trim() : null;
    const courseKw = f.courses_taught_keyword ? String(f.courses_taught_keyword).toLowerCase().trim() : null;

    if (termFilterNorm || courseKw) {
      results = results.filter((fac) => {
        const facCourses = courses.filter((c) => c.instructor_id === fac.id);
        if (facCourses.length === 0) return false;
        return facCourses.some((c) => {
          // term check
          if (termFilterNorm) {
            const courseTermNorm = this._normalizeTerm(c.term);
            if (courseTermNorm !== termFilterNorm) return false;
          }
          // keyword check
          if (courseKw) {
            const fields = [c.title, c.description]
              .filter(Boolean)
              .map((s) => String(s).toLowerCase());
            return fields.some((s) => s.includes(courseKw));
          }
          return true;
        });
      });
    }

    // sorting
    if (sort_by === 'last_promotion_year_newest_first') {
      results.sort((a, b) => {
        const ay = typeof a.last_promotion_year === 'number' ? a.last_promotion_year : 0;
        const by = typeof b.last_promotion_year === 'number' ? b.last_promotion_year : 0;
        return by - ay;
      });
    } else if (sort_by === 'name_a_to_z') {
      results.sort((a, b) => {
        const an = (a.full_name || '').toLowerCase();
        const bn = (b.full_name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    }

    const total_count = results.length;
    const pg = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : total_count;
    const start = (pg - 1) * size;
    const end = start + size;
    const slice = results.slice(start, end);

    const mapped = slice.map((fac) => {
      const primaryDept = departments.find((d) => d.id === fac.primary_department_id) || null;
      const secondaryDept = fac.secondary_department_id ? (departments.find((d) => d.id === fac.secondary_department_id) || null) : null;
      return {
        faculty_id: fac.id,
        full_name: fac.full_name,
        display_title: fac.display_title || '',
        primary_department_name: primaryDept ? primaryDept.name : null,
        secondary_department_name: secondaryDept ? secondaryDept.name : null,
        appointment_type: fac.appointment_type,
        teaching_status: fac.teaching_status,
        is_graduate_faculty: !!fac.is_graduate_faculty,
        accepting_new_phd_students: !!fac.accepting_new_phd_students,
        rank: fac.rank || null,
        last_promotion_year: typeof fac.last_promotion_year === 'number' ? fac.last_promotion_year : null,
        research_keywords: Array.isArray(fac.research_keywords) ? fac.research_keywords : []
      };
    });

    return {
      results: mapped,
      total_count: total_count
    };
  }

  // getFacultyProfileOverview(facultyId)
  getFacultyProfileOverview(facultyId) {
    const faculties = this._getFromStorage('faculties');
    const departments = this._getFromStorage('departments');
    const fac = faculties.find((f) => f.id === facultyId);
    if (!fac) return null;

    const primaryDept = departments.find((d) => d.id === fac.primary_department_id) || null;
    const secondaryDept = fac.secondary_department_id ? (departments.find((d) => d.id === fac.secondary_department_id) || null) : null;

    return {
      faculty_id: fac.id,
      full_name: fac.full_name,
      first_name: fac.first_name || null,
      last_name: fac.last_name || null,
      display_title: fac.display_title || '',
      appointment_type: fac.appointment_type,
      teaching_status: fac.teaching_status,
      is_graduate_faculty: !!fac.is_graduate_faculty,
      accepting_new_phd_students: !!fac.accepting_new_phd_students,
      rank: fac.rank || null,
      last_promotion_year: typeof fac.last_promotion_year === 'number' ? fac.last_promotion_year : null,
      primary_department: primaryDept
        ? { id: primaryDept.id, name: primaryDept.name, code: primaryDept.code || null }
        : null,
      secondary_department: secondaryDept
        ? { id: secondaryDept.id, name: secondaryDept.name, code: secondaryDept.code || null }
        : null,
      office_location: fac.office_location || null,
      phone_extension: fac.phone_extension || null,
      email: fac.email || null,
      research_keywords: Array.isArray(fac.research_keywords) ? fac.research_keywords : [],
      profile_url: fac.profile_url || null
    };
  }

  // getFacultyCourses(facultyId, term, level, meeting_days, start_time_from, end_time_to)
  getFacultyCourses(facultyId, term, level, meeting_days, start_time_from, end_time_to) {
    const courses = this._getFromStorage('courses');
    const departments = this._getFromStorage('departments');

    let list = courses.filter((c) => c.instructor_id === facultyId);

    if (term) {
      const termNorm = String(term).toLowerCase().trim();
      list = list.filter((c) => this._normalizeTerm(c.term) === termNorm);
    }

    if (level) {
      list = list.filter((c) => c.level === level);
    }

    if (Array.isArray(meeting_days) && meeting_days.length > 0) {
      const daysLower = meeting_days.map((d) => String(d).toLowerCase());
      list = list.filter((c) => {
        if (!Array.isArray(c.meeting_days)) return false;
        const cd = c.meeting_days.map((d) => String(d).toLowerCase());
        return daysLower.every((d) => cd.includes(d));
      });
    }

    if (start_time_from) {
      const minMinutes = this._timeStringToMinutes(start_time_from);
      if (minMinutes != null) {
        list = list.filter((c) => {
          const cMin = this._timeStringToMinutes(c.start_time);
          return cMin == null ? false : cMin >= minMinutes;
        });
      }
    }

    if (end_time_to) {
      const maxMinutes = this._timeStringToMinutes(end_time_to);
      if (maxMinutes != null) {
        list = list.filter((c) => {
          const cEnd = this._timeStringToMinutes(c.end_time);
          return cEnd == null ? false : cEnd <= maxMinutes;
        });
      }
    }

    // sort by start_time ascending
    list.sort((a, b) => this._normalizeAndCompareTimes(a.start_time, b.start_time));

    return list.map((c) => {
      const dept = c.department_id ? (departments.find((d) => d.id === c.department_id) || null) : null;
      return {
        course_id: c.id,
        title: c.title,
        code: c.code || null,
        description: c.description || null,
        term: c.term,
        level: c.level,
        department_name: dept ? dept.name : null,
        meeting_days: Array.isArray(c.meeting_days) ? c.meeting_days : [],
        start_time: c.start_time || null,
        end_time: c.end_time || null,
        location: c.location || null,
        credits: typeof c.credits === 'number' ? c.credits : null
      };
    });
  }

  // getCourseDetail(courseId)
  getCourseDetail(courseId) {
    const courses = this._getFromStorage('courses');
    const faculties = this._getFromStorage('faculties');
    const departments = this._getFromStorage('departments');

    const c = courses.find((course) => course.id === courseId);
    if (!c) return null;

    const dept = c.department_id ? (departments.find((d) => d.id === c.department_id) || null) : null;
    const fac = faculties.find((f) => f.id === c.instructor_id) || null;

    return {
      course_id: c.id,
      title: c.title,
      code: c.code || null,
      description: c.description || null,
      term: c.term,
      level: c.level,
      department_name: dept ? dept.name : null,
      meeting_days: Array.isArray(c.meeting_days) ? c.meeting_days : [],
      start_time: c.start_time || null,
      end_time: c.end_time || null,
      location: c.location || null,
      credits: typeof c.credits === 'number' ? c.credits : null,
      instructor_faculty_id: fac ? fac.id : null,
      instructor_name: fac ? fac.full_name : null
    };
  }

  // addCourseToPlannedCourses(courseId)
  addCourseToPlannedCourses(courseId) {
    const planned = this._getOrCreatePlannedCoursesList();
    if (!Array.isArray(planned.course_ids)) planned.course_ids = [];

    const already_present = planned.course_ids.includes(courseId);
    if (!already_present) {
      planned.course_ids.push(courseId);
      planned.updated_at = this._nowISO();
      this._updatePlannedCoursesList(planned);
    }

    return {
      success: true,
      message: already_present ? 'Course already in planned list.' : 'Course added to planned list.',
      planned_courses_count: planned.course_ids.length,
      already_present: already_present
    };
  }

  // getFacultyPublications(facultyId, publication_type, year_from, year_to, title_keyword, sort_by)
  getFacultyPublications(facultyId, publication_type, year_from, year_to, title_keyword, sort_by) {
    const publications = this._getFromStorage('publications');
    const readingList = this._getOrCreateReadingList();
    const exportList = this._getOrCreatePublicationsExportList();

    let list = publications.filter((p) => p.faculty_id === facultyId);

    if (publication_type) {
      list = list.filter((p) => p.publication_type === publication_type);
    }

    if (typeof year_from === 'number') {
      list = list.filter((p) => p.year >= year_from);
    }

    if (typeof year_to === 'number') {
      list = list.filter((p) => p.year <= year_to);
    }

    if (title_keyword) {
      const q = String(title_keyword).toLowerCase().trim();
      list = list.filter((p) => String(p.title || '').toLowerCase().includes(q));
    }

    if (sort_by === 'year_newest_first') {
      list.sort((a, b) => b.year - a.year);
    } else if (sort_by === 'year_oldest_first') {
      list.sort((a, b) => a.year - b.year);
    } else if (sort_by === 'title_a_to_z') {
      list.sort((a, b) => {
        const at = (a.title || '').toLowerCase();
        const bt = (b.title || '').toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      });
    }

    const readingIds = Array.isArray(readingList.publication_ids) ? readingList.publication_ids : [];
    const exportIds = Array.isArray(exportList.publication_ids) ? exportList.publication_ids : [];

    return list.map((p) => ({
      publication_id: p.id,
      title: p.title,
      publication_type: p.publication_type,
      year: p.year,
      journal_or_venue: p.journal_or_venue || null,
      volume: p.volume || null,
      issue: p.issue || null,
      pages: p.pages || null,
      doi: p.doi || null,
      url: p.url || null,
      abstract: p.abstract || null,
      is_in_reading_list: readingIds.includes(p.id),
      is_in_export_list: exportIds.includes(p.id)
    }));
  }

  // savePublicationToReadingList(publicationId)
  savePublicationToReadingList(publicationId) {
    const publications = this._getFromStorage('publications');
    const pubExists = publications.some((p) => p.id === publicationId);
    if (!pubExists) {
      const readingList = this._getOrCreateReadingList();
      return {
        success: false,
        message: 'Publication not found.',
        reading_list_count: Array.isArray(readingList.publication_ids) ? readingList.publication_ids.length : 0
      };
    }

    const readingList = this._getOrCreateReadingList();
    if (!Array.isArray(readingList.publication_ids)) readingList.publication_ids = [];
    if (!readingList.publication_status || typeof readingList.publication_status !== 'object') {
      readingList.publication_status = {};
    }

    if (!readingList.publication_ids.includes(publicationId)) {
      readingList.publication_ids.push(publicationId);
      readingList.updated_at = this._nowISO();
      // default unread
      readingList.publication_status[publicationId] = false;
      this._updateReadingList(readingList);
    }

    return {
      success: true,
      message: 'Publication saved to reading list.',
      reading_list_count: readingList.publication_ids.length
    };
  }

  // addPublicationToExportList(publicationId)
  addPublicationToExportList(publicationId) {
    const publications = this._getFromStorage('publications');
    const pubExists = publications.some((p) => p.id === publicationId);
    if (!pubExists) {
      const exportList = this._getOrCreatePublicationsExportList();
      return {
        success: false,
        message: 'Publication not found.',
        export_list_size: Array.isArray(exportList.publication_ids) ? exportList.publication_ids.length : 0
      };
    }

    const exportList = this._getOrCreatePublicationsExportList();
    if (!Array.isArray(exportList.publication_ids)) exportList.publication_ids = [];

    if (!exportList.publication_ids.includes(publicationId)) {
      exportList.publication_ids.push(publicationId);
      exportList.updated_at = this._nowISO();
      this._updatePublicationsExportList(exportList);
    }

    return {
      success: true,
      message: 'Publication added to export list.',
      export_list_size: exportList.publication_ids.length
    };
  }

  // getFacultyOfficeHours(facultyId, day_of_week, min_start_time, only_available)
  getFacultyOfficeHours(facultyId, day_of_week, min_start_time, only_available) {
    const slots = this._getFromStorage('office_hour_slots');
    const bookings = this._getFromStorage('office_hour_bookings');

    let list = slots.filter((s) => s.faculty_id === facultyId);

    if (day_of_week) {
      const d = String(day_of_week).toLowerCase();
      list = list.filter((s) => String(s.day_of_week).toLowerCase() === d);
    }

    if (min_start_time) {
      const minMinutes = this._timeStringToMinutes(min_start_time);
      if (minMinutes != null) {
        list = list.filter((s) => {
          const sm = this._timeStringToMinutes(s.start_time);
          return sm == null ? false : sm >= minMinutes;
        });
      }
    }

    if (only_available) {
      list = list.filter((s) => !!s.is_available);
    }

    // sort by start_time
    list.sort((a, b) => this._normalizeAndCompareTimes(a.start_time, b.start_time));

    return list.map((s) => {
      const booked = bookings.find((b) => b.office_hour_slot_id === s.id && b.status === 'booked');
      return {
        slot_id: s.id,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        location: s.location || null,
        is_available: !!s.is_available,
        is_booked_by_user: !!booked
      };
    });
  }

  // bookOfficeHourSlot(officeHourSlotId)
  bookOfficeHourSlot(officeHourSlotId) {
    const slots = this._getFromStorage('office_hour_slots');
    const bookings = this._getFromStorage('office_hour_bookings');

    const slotIndex = slots.findIndex((s) => s.id === officeHourSlotId);
    if (slotIndex === -1) {
      return {
        success: false,
        message: 'Office-hour slot not found.',
        booking: null
      };
    }

    const slot = slots[slotIndex];
    if (!slot.is_available) {
      return {
        success: false,
        message: 'Office-hour slot is no longer available.',
        booking: null
      };
    }

    const bookingId = this._generateId('officehourbooking');
    const now = this._nowISO();
    const booking = {
      id: bookingId,
      office_hour_slot_id: slot.id,
      faculty_id: slot.faculty_id,
      status: 'booked',
      created_at: now,
      notes: ''
    };
    bookings.push(booking);
    this._saveToStorage('office_hour_bookings', bookings);

    // update slot availability
    slots[slotIndex] = Object.assign({}, slot, { is_available: false });
    this._saveToStorage('office_hour_slots', slots);

    return {
      success: true,
      message: 'Office-hour slot booked.',
      booking: {
        booking_id: booking.id,
        office_hour_slot_id: booking.office_hour_slot_id,
        faculty_id: booking.faculty_id,
        status: booking.status,
        created_at: booking.created_at
      }
    };
  }

  // getFacultyEvents(facultyId, audience, date_from, date_to)
  getFacultyEvents(facultyId, audience, date_from, date_to) {
    const events = this._getFromStorage('events');
    const bookmarks = this._getOrCreateBookmarkedEventsList();

    let list = events.filter((e) => e.faculty_id === facultyId);

    if (audience) {
      list = list.filter((e) => e.audience === audience);
    }

    if (date_from) {
      const df = String(date_from);
      list = list.filter((e) => {
        const d = (e.start_datetime || '').slice(0, 10);
        return d >= df;
      });
    }

    if (date_to) {
      const dt = String(date_to);
      list = list.filter((e) => {
        const d = (e.start_datetime || '').slice(0, 10);
        return d <= dt;
      });
    }

    const bookmarkedIds = Array.isArray(bookmarks.event_ids) ? bookmarks.event_ids : [];

    list.sort((a, b) => {
      const ad = a.start_datetime || '';
      const bd = b.start_datetime || '';
      if (ad < bd) return -1;
      if (ad > bd) return 1;
      return 0;
    });

    return list.map((e) => ({
      event_id: e.id,
      title: e.title,
      description: e.description || null,
      start_datetime: e.start_datetime,
      end_datetime: e.end_datetime || null,
      location: e.location || null,
      audience: e.audience,
      is_bookmarked: bookmarkedIds.includes(e.id)
    }));
  }

  // bookmarkEvent(eventId)
  bookmarkEvent(eventId) {
    const events = this._getFromStorage('events');
    const exists = events.some((e) => e.id === eventId);
    if (!exists) {
      const bookmarks = this._getOrCreateBookmarkedEventsList();
      return {
        success: false,
        message: 'Event not found.',
        bookmarked_events_count: Array.isArray(bookmarks.event_ids) ? bookmarks.event_ids.length : 0
      };
    }

    const bookmarks = this._getOrCreateBookmarkedEventsList();
    if (!Array.isArray(bookmarks.event_ids)) bookmarks.event_ids = [];
    if (!bookmarks.event_status || typeof bookmarks.event_status !== 'object') {
      bookmarks.event_status = {};
    }

    if (!bookmarks.event_ids.includes(eventId)) {
      bookmarks.event_ids.push(eventId);
      bookmarks.updated_at = this._nowISO();
      bookmarks.event_status[eventId] = 'interested';
      this._updateBookmarkedEventsList(bookmarks);
    }

    return {
      success: true,
      message: 'Event bookmarked.',
      bookmarked_events_count: bookmarks.event_ids.length
    };
  }

  // removeBookmarkedEvent(eventId)
  removeBookmarkedEvent(eventId) {
    const bookmarks = this._getOrCreateBookmarkedEventsList();
    if (!Array.isArray(bookmarks.event_ids)) bookmarks.event_ids = [];
    if (!bookmarks.event_status || typeof bookmarks.event_status !== 'object') {
      bookmarks.event_status = {};
    }

    const before = bookmarks.event_ids.length;
    bookmarks.event_ids = bookmarks.event_ids.filter((id) => id !== eventId);
    delete bookmarks.event_status[eventId];
    bookmarks.updated_at = this._nowISO();
    this._updateBookmarkedEventsList(bookmarks);

    return {
      success: true,
      message: before === bookmarks.event_ids.length ? 'Event was not bookmarked.' : 'Event removed from bookmarks.',
      bookmarked_events_count: bookmarks.event_ids.length
    };
  }

  // sendFacultyContactMessage(facultyId, subject, body)
  sendFacultyContactMessage(facultyId, subject, body) {
    const faculties = this._getFromStorage('faculties');
    const facultyExists = faculties.some((f) => f.id === facultyId);
    if (!facultyExists) {
      return {
        success: false,
        message_id: null,
        status: 'failed',
        sent_at: null
      };
    }

    const messages = this._getFromStorage('contact_messages');
    const id = this._generateId('contactmsg');
    const now = this._nowISO();
    const msg = {
      id: id,
      faculty_id: facultyId,
      subject: subject,
      body: body,
      sent_at: now,
      status: 'sent'
    };
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message_id: id,
      status: 'sent',
      sent_at: now
    };
  }

  // addFacultyToThesisAdvisorShortlist(facultyId)
  addFacultyToThesisAdvisorShortlist(facultyId) {
    const shortlist = this._getOrCreateThesisAdvisorShortlist();
    if (!Array.isArray(shortlist.faculty_ids)) shortlist.faculty_ids = [];

    const already = shortlist.faculty_ids.includes(facultyId);
    if (!already) {
      shortlist.faculty_ids.push(facultyId);
      shortlist.updated_at = this._nowISO();
      this._updateThesisAdvisorShortlist(shortlist);
    }

    return {
      success: true,
      message: already ? 'Faculty already in shortlist.' : 'Faculty added to shortlist.',
      shortlist_count: shortlist.faculty_ids.length
    };
  }

  // removeFacultyFromThesisAdvisorShortlist(facultyId)
  removeFacultyFromThesisAdvisorShortlist(facultyId) {
    const shortlist = this._getOrCreateThesisAdvisorShortlist();
    if (!Array.isArray(shortlist.faculty_ids)) shortlist.faculty_ids = [];

    const before = shortlist.faculty_ids.length;
    shortlist.faculty_ids = shortlist.faculty_ids.filter((id) => id !== facultyId);
    shortlist.updated_at = this._nowISO();
    this._updateThesisAdvisorShortlist(shortlist);

    return {
      success: true,
      message: before === shortlist.faculty_ids.length ? 'Faculty was not in shortlist.' : 'Faculty removed from shortlist.',
      shortlist_count: shortlist.faculty_ids.length
    };
  }

  // getThesisAdvisorShortlist()
  getThesisAdvisorShortlist() {
    const shortlist = this._getOrCreateThesisAdvisorShortlist();
    const faculties = this._getFromStorage('faculties');
    const departments = this._getFromStorage('departments');

    if (!Array.isArray(shortlist.faculty_ids) || shortlist.faculty_ids.length === 0) {
      return [];
    }

    return shortlist.faculty_ids.map((fid) => {
      const fac = faculties.find((f) => f.id === fid);
      if (!fac) {
        return {
          faculty_id: fid,
          full_name: null,
          display_title: null,
          primary_department_name: null,
          secondary_department_name: null,
          is_graduate_faculty: null,
          accepting_new_phd_students: null,
          rank: null,
          last_promotion_year: null
        };
      }
      const primaryDept = departments.find((d) => d.id === fac.primary_department_id) || null;
      const secondaryDept = fac.secondary_department_id ? (departments.find((d) => d.id === fac.secondary_department_id) || null) : null;
      return {
        faculty_id: fac.id,
        full_name: fac.full_name,
        display_title: fac.display_title || '',
        primary_department_name: primaryDept ? primaryDept.name : null,
        secondary_department_name: secondaryDept ? secondaryDept.name : null,
        is_graduate_faculty: !!fac.is_graduate_faculty,
        accepting_new_phd_students: !!fac.accepting_new_phd_students,
        rank: fac.rank || null,
        last_promotion_year: typeof fac.last_promotion_year === 'number' ? fac.last_promotion_year : null
      };
    });
  }

  // getReadingListContents(filters, sort_by)
  getReadingListContents(filters, sort_by) {
    const readingList = this._getOrCreateReadingList();
    const publications = this._getFromStorage('publications');
    const faculties = this._getFromStorage('faculties');

    const f = filters || {};
    const ids = Array.isArray(readingList.publication_ids) ? readingList.publication_ids : [];
    const statusMap = readingList.publication_status && typeof readingList.publication_status === 'object'
      ? readingList.publication_status
      : {};

    let list = ids
      .map((id) => publications.find((p) => p.id === id))
      .filter(Boolean);

    if (f.publication_type) {
      list = list.filter((p) => p.publication_type === f.publication_type);
    }

    if (typeof f.year_from === 'number') {
      list = list.filter((p) => p.year >= f.year_from);
    }

    if (typeof f.year_to === 'number') {
      list = list.filter((p) => p.year <= f.year_to);
    }

    if (typeof f.is_marked_read === 'boolean') {
      list = list.filter((p) => {
        const st = !!statusMap[p.id];
        return st === f.is_marked_read;
      });
    }

    if (sort_by === 'year_newest_first') {
      list.sort((a, b) => b.year - a.year);
    } else if (sort_by === 'title_a_to_z') {
      list.sort((a, b) => {
        const at = (a.title || '').toLowerCase();
        const bt = (b.title || '').toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      });
    }

    return list.map((p) => {
      const fac = faculties.find((f0) => f0.id === p.faculty_id) || null;
      return {
        publication_id: p.id,
        title: p.title,
        publication_type: p.publication_type,
        year: p.year,
        journal_or_venue: p.journal_or_venue || null,
        doi: p.doi || null,
        url: p.url || null,
        faculty_id: p.faculty_id || null,
        faculty_name: fac ? fac.full_name : null,
        is_marked_read: !!statusMap[p.id]
      };
    });
  }

  // removePublicationFromReadingList(publicationId)
  removePublicationFromReadingList(publicationId) {
    const readingList = this._getOrCreateReadingList();
    if (!Array.isArray(readingList.publication_ids)) readingList.publication_ids = [];
    if (!readingList.publication_status || typeof readingList.publication_status !== 'object') {
      readingList.publication_status = {};
    }

    const before = readingList.publication_ids.length;
    readingList.publication_ids = readingList.publication_ids.filter((id) => id !== publicationId);
    delete readingList.publication_status[publicationId];
    readingList.updated_at = this._nowISO();
    this._updateReadingList(readingList);

    return {
      success: true,
      message: before === readingList.publication_ids.length ? 'Publication was not in reading list.' : 'Publication removed from reading list.',
      reading_list_count: readingList.publication_ids.length
    };
  }

  // markReadingListPublicationStatus(publicationId, is_read)
  markReadingListPublicationStatus(publicationId, is_read) {
    const readingList = this._getOrCreateReadingList();
    if (!Array.isArray(readingList.publication_ids)) readingList.publication_ids = [];
    if (!readingList.publication_status || typeof readingList.publication_status !== 'object') {
      readingList.publication_status = {};
    }

    if (!readingList.publication_ids.includes(publicationId)) {
      return {
        success: false,
        message: 'Publication is not in the reading list.'
      };
    }

    readingList.publication_status[publicationId] = !!is_read;
    readingList.updated_at = this._nowISO();
    this._updateReadingList(readingList);

    return {
      success: true,
      message: 'Reading status updated.'
    };
  }

  // getPublicationsExportList()
  getPublicationsExportList() {
    const exportList = this._getOrCreatePublicationsExportList();
    const publications = this._getFromStorage('publications');

    const pubs = Array.isArray(exportList.publication_ids)
      ? exportList.publication_ids
        .map((id) => publications.find((p) => p.id === id))
        .filter(Boolean)
      : [];

    const mapped = pubs.map((p) => ({
      publication_id: p.id,
      title: p.title,
      publication_type: p.publication_type,
      year: p.year,
      journal_or_venue: p.journal_or_venue || null,
      doi: p.doi || null,
      formatted_citation: this._formatCitation(exportList.citation_style, p)
    }));

    return {
      citation_style: exportList.citation_style,
      publications: mapped
    };
  }

  // removePublicationFromExportList(publicationId)
  removePublicationFromExportList(publicationId) {
    const exportList = this._getOrCreatePublicationsExportList();
    if (!Array.isArray(exportList.publication_ids)) exportList.publication_ids = [];

    const before = exportList.publication_ids.length;
    exportList.publication_ids = exportList.publication_ids.filter((id) => id !== publicationId);
    exportList.updated_at = this._nowISO();
    this._updatePublicationsExportList(exportList);

    return {
      success: true,
      message: before === exportList.publication_ids.length ? 'Publication was not in export list.' : 'Publication removed from export list.',
      export_list_size: exportList.publication_ids.length
    };
  }

  // reorderPublicationsExportList(publicationIds)
  reorderPublicationsExportList(publicationIds) {
    const exportList = this._getOrCreatePublicationsExportList();
    if (!Array.isArray(exportList.publication_ids)) exportList.publication_ids = [];

    const currentSet = new Set(exportList.publication_ids);
    const newOrder = [];
    if (Array.isArray(publicationIds)) {
      publicationIds.forEach((id) => {
        if (currentSet.has(id)) newOrder.push(id);
      });
    }

    // Append any remaining ids that were not mentioned
    exportList.publication_ids.forEach((id) => {
      if (!newOrder.includes(id)) newOrder.push(id);
    });

    exportList.publication_ids = newOrder;
    exportList.updated_at = this._nowISO();
    this._updatePublicationsExportList(exportList);

    return {
      success: true,
      message: 'Export list reordered.'
    };
  }

  // updateExportListCitationStyle(citation_style)
  updateExportListCitationStyle(citation_style) {
    const exportList = this._getOrCreatePublicationsExportList();
    exportList.citation_style = citation_style;
    exportList.updated_at = this._nowISO();
    this._updatePublicationsExportList(exportList);

    return {
      success: true,
      citation_style: exportList.citation_style
    };
  }

  // getBookmarkedEvents()
  getBookmarkedEvents() {
    const bookmarks = this._getOrCreateBookmarkedEventsList();
    const events = this._getFromStorage('events');
    const faculties = this._getFromStorage('faculties');

    const ids = Array.isArray(bookmarks.event_ids) ? bookmarks.event_ids : [];
    const statusMap = bookmarks.event_status && typeof bookmarks.event_status === 'object'
      ? bookmarks.event_status
      : {};

    return ids
      .map((id) => events.find((e) => e.id === id))
      .filter(Boolean)
      .map((e) => {
        const fac = faculties.find((f) => f.id === e.faculty_id) || null;
        return {
          event_id: e.id,
          title: e.title,
          start_datetime: e.start_datetime,
          end_datetime: e.end_datetime || null,
          location: e.location || null,
          audience: e.audience,
          faculty_id: e.faculty_id,
          faculty_name: fac ? fac.full_name : null,
          bookmark_status: statusMap[e.id] || 'none'
        };
      });
  }

  // updateBookmarkedEventStatus(eventId, bookmark_status)
  updateBookmarkedEventStatus(eventId, bookmark_status) {
    const bookmarks = this._getOrCreateBookmarkedEventsList();
    if (!Array.isArray(bookmarks.event_ids)) bookmarks.event_ids = [];
    if (!bookmarks.event_status || typeof bookmarks.event_status !== 'object') {
      bookmarks.event_status = {};
    }

    if (!bookmarks.event_ids.includes(eventId)) {
      return {
        success: false,
        message: 'Event is not bookmarked.'
      };
    }

    bookmarks.event_status[eventId] = bookmark_status;
    bookmarks.updated_at = this._nowISO();
    this._updateBookmarkedEventsList(bookmarks);

    return {
      success: true,
      message: 'Bookmarked event status updated.'
    };
  }

  // getPlannedCourses()
  getPlannedCourses() {
    const planned = this._getOrCreatePlannedCoursesList();
    const courses = this._getFromStorage('courses');
    const faculties = this._getFromStorage('faculties');
    const departments = this._getFromStorage('departments');

    const ids = Array.isArray(planned.course_ids) ? planned.course_ids : [];

    return ids
      .map((id) => courses.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => {
        const fac = faculties.find((f) => f.id === c.instructor_id) || null;
        const dept = c.department_id ? (departments.find((d) => d.id === c.department_id) || null) : null;
        return {
          course_id: c.id,
          title: c.title,
          code: c.code || null,
          term: c.term,
          level: c.level,
          meeting_days: Array.isArray(c.meeting_days) ? c.meeting_days : [],
          start_time: c.start_time || null,
          end_time: c.end_time || null,
          location: c.location || null,
          instructor_faculty_id: fac ? fac.id : null,
          instructor_name: fac ? fac.full_name : null,
          department_name: dept ? dept.name : null
        };
      });
  }

  // removeCourseFromPlannedCourses(courseId)
  removeCourseFromPlannedCourses(courseId) {
    const planned = this._getOrCreatePlannedCoursesList();
    if (!Array.isArray(planned.course_ids)) planned.course_ids = [];

    const before = planned.course_ids.length;
    planned.course_ids = planned.course_ids.filter((id) => id !== courseId);
    planned.updated_at = this._nowISO();
    this._updatePlannedCoursesList(planned);

    return {
      success: true,
      message: before === planned.course_ids.length ? 'Course was not in planned list.' : 'Course removed from planned list.',
      planned_courses_count: planned.course_ids.length
    };
  }

  // reorderPlannedCourses(courseIds)
  reorderPlannedCourses(courseIds) {
    const planned = this._getOrCreatePlannedCoursesList();
    if (!Array.isArray(planned.course_ids)) planned.course_ids = [];

    const currentSet = new Set(planned.course_ids);
    const newOrder = [];
    if (Array.isArray(courseIds)) {
      courseIds.forEach((id) => {
        if (currentSet.has(id)) newOrder.push(id);
      });
    }

    planned.course_ids.forEach((id) => {
      if (!newOrder.includes(id)) newOrder.push(id);
    });

    planned.course_ids = newOrder;
    planned.updated_at = this._nowISO();
    this._updatePlannedCoursesList(planned);

    return {
      success: true,
      message: 'Planned courses reordered.'
    };
  }

  // listNotes()
  listNotes() {
    const notes = this._getOrCreateNotesStore();
    return notes.map((n) => ({
      note_id: n.id,
      title: n.title,
      snippet: (n.body || '').slice(0, 120),
      created_at: n.created_at || null,
      updated_at: n.updated_at || null
    }));
  }

  // getNoteDetail(noteId)
  getNoteDetail(noteId) {
    const notes = this._getOrCreateNotesStore();
    const n = notes.find((note) => note.id === noteId);
    if (!n) return null;
    return {
      note_id: n.id,
      title: n.title,
      body: n.body,
      created_at: n.created_at || null,
      updated_at: n.updated_at || null
    };
  }

  // createNote(title, body)
  createNote(title, body) {
    const notes = this._getOrCreateNotesStore();
    const id = this._generateId('note');
    const now = this._nowISO();
    const note = {
      id: id,
      title: title,
      body: body,
      created_at: now,
      updated_at: now
    };
    notes.push(note);
    this._updateNotesStore(notes);

    return {
      success: true,
      note_id: id,
      message: 'Note created.'
    };
  }

  // updateNote(noteId, title, body)
  updateNote(noteId, title, body) {
    const notes = this._getOrCreateNotesStore();
    const index = notes.findIndex((n) => n.id === noteId);
    if (index === -1) {
      return {
        success: false,
        message: 'Note not found.'
      };
    }

    if (typeof title === 'string') {
      notes[index].title = title;
    }
    if (typeof body === 'string') {
      notes[index].body = body;
    }
    notes[index].updated_at = this._nowISO();
    this._updateNotesStore(notes);

    return {
      success: true,
      message: 'Note updated.'
    };
  }

  // deleteNote(noteId)
  deleteNote(noteId) {
    const notes = this._getOrCreateNotesStore();
    const before = notes.length;
    const filtered = notes.filter((n) => n.id !== noteId);
    this._updateNotesStore(filtered);

    return {
      success: true,
      message: before === filtered.length ? 'Note not found.' : 'Note deleted.'
    };
  }

  // listContacts()
  listContacts() {
    const contacts = this._getOrCreateContactsStore();
    const faculties = this._getFromStorage('faculties');
    const departments = this._getFromStorage('departments');

    return contacts.map((c) => {
      const fac = c.faculty_id ? (faculties.find((f) => f.id === c.faculty_id) || null) : null;
      const dept = fac && fac.primary_department_id
        ? (departments.find((d) => d.id === fac.primary_department_id) || null)
        : null;
      return {
        contact_id: c.id,
        name: c.name,
        faculty_id: c.faculty_id || null,
        primary_department_name: dept ? dept.name : null,
        notes_snippet: (c.notes || '').slice(0, 120),
        office_location: c.office_location || null,
        phone_extension: c.phone_extension || null,
        email: c.email || (fac ? fac.email || null : null)
      };
    });
  }

  // getContactDetail(contactId)
  getContactDetail(contactId) {
    const contacts = this._getOrCreateContactsStore();
    const c = contacts.find((ct) => ct.id === contactId);
    if (!c) return null;

    return {
      contact_id: c.id,
      name: c.name,
      faculty_id: c.faculty_id || null,
      notes: c.notes || '',
      office_location: c.office_location || null,
      phone_extension: c.phone_extension || null,
      email: c.email || null,
      created_at: c.created_at || null,
      updated_at: c.updated_at || null
    };
  }

  // createContact(name, facultyId, notes, office_location, phone_extension, email)
  createContact(name, facultyId, notes, office_location, phone_extension, email) {
    const contacts = this._getOrCreateContactsStore();
    const id = this._generateId('contact');
    const now = this._nowISO();
    const contact = {
      id: id,
      name: name,
      faculty_id: facultyId || null,
      notes: notes || '',
      office_location: office_location || null,
      phone_extension: phone_extension || null,
      email: email || null,
      created_at: now,
      updated_at: now
    };
    contacts.push(contact);
    this._updateContactsStore(contacts);

    return {
      success: true,
      contact_id: id,
      message: 'Contact created.'
    };
  }

  // updateContact(contactId, name, facultyId, notes, office_location, phone_extension, email)
  updateContact(contactId, name, facultyId, notes, office_location, phone_extension, email) {
    const contacts = this._getOrCreateContactsStore();
    const index = contacts.findIndex((c) => c.id === contactId);
    if (index === -1) {
      return {
        success: false,
        message: 'Contact not found.'
      };
    }

    if (typeof name === 'string') contacts[index].name = name;
    if (typeof facultyId === 'string') contacts[index].faculty_id = facultyId;
    if (typeof notes === 'string') contacts[index].notes = notes;
    if (typeof office_location === 'string') contacts[index].office_location = office_location;
    if (typeof phone_extension === 'string') contacts[index].phone_extension = phone_extension;
    if (typeof email === 'string') contacts[index].email = email;
    contacts[index].updated_at = this._nowISO();
    this._updateContactsStore(contacts);

    return {
      success: true,
      message: 'Contact updated.'
    };
  }

  // deleteContact(contactId)
  deleteContact(contactId) {
    const contacts = this._getOrCreateContactsStore();
    const before = contacts.length;
    const filtered = contacts.filter((c) => c.id !== contactId);
    this._updateContactsStore(filtered);

    return {
      success: true,
      message: before === filtered.length ? 'Contact not found.' : 'Contact deleted.'
    };
  }

  // getStaticPageContent(page_slug)
  getStaticPageContent(page_slug) {
    const pages = this._getFromStorage('static_pages');
    const slug = String(page_slug);
    const page = Array.isArray(pages) ? pages.find((p) => p.slug === slug) : null;
    if (!page) return null;
    return {
      title: page.title || '',
      body_html: page.body_html || '',
      last_updated: page.last_updated || null
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