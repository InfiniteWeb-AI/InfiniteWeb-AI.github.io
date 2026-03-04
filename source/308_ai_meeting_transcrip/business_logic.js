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
      'users',
      'workspaces',
      'transcription_settings',
      'custom_vocabulary_lists',
      'custom_vocabulary_terms',
      'teams',
      'tags',
      'meetings',
      'transcripts',
      'speakers',
      'transcript_segments',
      'action_items',
      'share_links',
      'plans',
      'plan_trials',
      'billing_settings',
      'templates',
      'template_agenda_sections',
      'template_auto_apply_rules',
      'notification_settings',
      'dashboards',
      'pinned_charts',
      'help_articles',
      'support_tickets'
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

  _now() {
    return new Date().toISOString();
  }

  // Internal helper to get or initialize the single current user
  _getOrCreateCurrentUser() {
    let users = this._getFromStorage('users');
    let currentUserId = localStorage.getItem('currentUserId');
    let user = null;

    if (currentUserId) {
      user = users.find((u) => u.id === currentUserId) || null;
    }

    if (!user) {
      if (users.length > 0) {
        user = users[0];
        localStorage.setItem('currentUserId', user.id);
      } else {
        user = {
          id: this._generateId('user'),
          email: 'guest@example.com',
          password: null,
          created_at: this._now()
        };
        users.push(user);
        this._saveToStorage('users', users);
        localStorage.setItem('currentUserId', user.id);
      }
    }

    return user;
  }

  // Internal helper to get or create current workspace for user
  _getOrCreateCurrentWorkspace() {
    const user = this._getOrCreateCurrentUser();
    let workspaces = this._getFromStorage('workspaces');
    let currentWorkspaceId = localStorage.getItem('currentWorkspaceId');
    let workspace = null;

    if (currentWorkspaceId) {
      workspace = workspaces.find((w) => w.id === currentWorkspaceId) || null;
    }

    if (!workspace) {
      workspace = workspaces.find((w) => w.user_id === user.id) || null;
    }

    if (!workspace) {
      workspace = {
        id: this._generateId('ws'),
        user_id: user.id,
        name: 'My Workspace',
        language: 'English (United States)',
        time_zone: 'Pacific Time (US & Canada)',
        auto_transcription_enabled: false,
        auto_transcription_min_duration_minutes: null,
        speaker_naming_preference: 'full_name',
        created_at: this._now(),
        updated_at: this._now()
      };
      workspaces.push(workspace);
      this._saveToStorage('workspaces', workspaces);
    }

    localStorage.setItem('currentWorkspaceId', workspace.id);
    return workspace;
  }

  // Internal helper to fetch or create the default dashboard
  _getDefaultDashboard() {
    let dashboards = this._getFromStorage('dashboards');
    let dashboard = dashboards.find((d) => d.type === 'default') || null;

    if (!dashboard) {
      dashboard = {
        id: this._generateId('dash'),
        name: 'Default',
        type: 'default',
        created_at: this._now()
      };
      dashboards.push(dashboard);
      this._saveToStorage('dashboards', dashboards);
    }

    const pinnedChartsAll = this._getFromStorage('pinned_charts');
    const pinnedCharts = pinnedChartsAll
      .filter((pc) => pc.dashboard_id === dashboard.id)
      .map((pc) => ({ ...pc, dashboard }));

    return { dashboard, pinnedCharts };
  }

  // Persist notification settings for current user
  _persistNotificationSettings(partial) {
    const user = this._getOrCreateCurrentUser();
    let settingsArr = this._getFromStorage('notification_settings');
    let settings = settingsArr.find((s) => s.user_id === user.id) || null;

    if (!settings) {
      settings = {
        id: this._generateId('notif'),
        user_id: user.id,
        email_summaries_enabled: false,
        email_summary_min_duration_minutes: null,
        email_summary_scope: 'all_meetings',
        desktop_popups_enabled: true,
        daily_digest_enabled: false,
        daily_digest_time: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      settingsArr.push(settings);
    }

    const updated = {
      ...settings,
      ...partial,
      updated_at: this._now()
    };

    settingsArr = settingsArr.map((s) => (s.id === settings.id ? updated : s));
    this._saveToStorage('notification_settings', settingsArr);

    return updated;
  }

  // Internal helper: apply analytics filters and return filtered meetings
  _applyAnalyticsFilters(filters) {
    const meetings = this._getFromStorage('meetings');
    const now = new Date();

    let start = null;
    let end = null;

    if (filters) {
      if (filters.dateRangePreset) {
        const preset = filters.dateRangePreset;
        if (preset === 'last_30_days') {
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (preset === 'last_7_days') {
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (preset === 'this_week') {
          const day = now.getDay();
          const diffToMonday = (day === 0 ? -6 : 1) - day;
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
        } else if (preset === 'this_month') {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
        }
      }

      if (filters.startDate) {
        start = new Date(filters.startDate);
      }
      if (filters.endDate) {
        end = new Date(filters.endDate);
      }
    }

    const teamId = filters && filters.teamId ? filters.teamId : null;
    const tagIds = filters && Array.isArray(filters.tagIds) ? filters.tagIds : [];
    const minDuration = filters && typeof filters.minDurationMinutes === 'number'
      ? filters.minDurationMinutes
      : null;

    return meetings.filter((m) => {
      if (start) {
        if (new Date(m.start_datetime) < start) return false;
      }
      if (end) {
        if (new Date(m.start_datetime) > end) return false;
      }
      if (teamId && m.team_id !== teamId) return false;
      if (minDuration != null && m.duration_minutes < minDuration) return false;
      if (tagIds.length > 0) {
        const meetingTags = Array.isArray(m.tag_ids) ? m.tag_ids : [];
        const hasAnyTag = tagIds.some((id) => meetingTags.includes(id));
        if (!hasAnyTag) return false;
      }
      return true;
    });
  }

  // =========================
  // Core interface implementations
  // =========================

  // signUpWithEmail(email, password)
  signUpWithEmail(email, password) {
    let users = this._getFromStorage('users');
    let existing = users.find((u) => u.email === email) || null;

    if (existing) {
      localStorage.setItem('currentUserId', existing.id);
      const workspaces = this._getFromStorage('workspaces');
      const hasWorkspace = workspaces.some((w) => w.user_id === existing.id);
      return {
        success: true,
        needsWorkspaceSetup: !hasWorkspace,
        message: 'Signed in to existing account'
      };
    }

    const user = {
      id: this._generateId('user'),
      email,
      password,
      created_at: this._now()
    };
    users.push(user);
    this._saveToStorage('users', users);
    localStorage.setItem('currentUserId', user.id);

    return {
      success: true,
      needsWorkspaceSetup: true,
      message: 'Account created successfully'
    };
  }

  // getUserOnboardingState()
  getUserOnboardingState() {
    const users = this._getFromStorage('users');
    const hasAccount = users.length > 0;
    const currentUser = this._getOrCreateCurrentUser();

    const workspaces = this._getFromStorage('workspaces');
    const userWorkspaces = workspaces.filter((w) => w.user_id === currentUser.id);
    const hasWorkspace = userWorkspaces.length > 0;

    const billingSettingsArr = this._getFromStorage('billing_settings');
    const trials = this._getFromStorage('plan_trials');

    const userBilling = billingSettingsArr.find((b) => b.user_id === currentUser.id) || null;
    let hasActivePlanOrTrial = false;

    if (userBilling) {
      if (userBilling.current_plan_id) {
        hasActivePlanOrTrial = true;
      } else if (userBilling.current_trial_id) {
        const trial = trials.find((t) => t.id === userBilling.current_trial_id) || null;
        if (trial && trial.status === 'active') {
          hasActivePlanOrTrial = true;
        }
      }
    }

    return {
      hasAccount,
      hasWorkspace,
      hasActivePlanOrTrial,
      defaultWorkspaceName: hasWorkspace ? userWorkspaces[0].name : '',
      showWorkspaceSetupPrompt: !hasWorkspace
    };
  }

  // getHomePageContent()
  getHomePageContent() {
    return {
      heroTitle: 'AI meeting transcription that your whole team can rely on',
      heroSubtitle: 'Record, transcribe, and summarize every customer call and internal meeting in minutes.',
      primaryCtaLabel: 'Get started free',
      benefits: [
        {
          title: 'Never miss a detail',
          description: 'Accurate transcripts with speaker labels and searchable history for every meeting.'
        },
        {
          title: 'Turn meetings into actions',
          description: 'Automatically highlight action items and decisions so nothing falls through the cracks.'
        },
        {
          title: 'Share securely in seconds',
          description: 'Password-protected, time-limited links make sharing with clients and stakeholders safe.'
        }
      ],
      features: [
        {
          name: 'Auto-join and record',
          summary: 'Connect to your calendar and recording tools to capture meetings automatically.'
        },
        {
          name: 'Speaker-aware transcripts',
          summary: 'Clean transcripts with configurable speaker naming preferences.'
        },
        {
          name: 'Team workspaces',
          summary: 'Organize meetings by team with shared templates, tags, and analytics.'
        }
      ],
      useCasesByRole: [
        {
          role: 'Product',
          headline: 'Capture every customer insight',
          details: 'Keep a searchable record of roadmap discussions, user interviews, and stakeholder reviews.'
        },
        {
          role: 'Sales',
          headline: 'Improve every demo and discovery call',
          details: 'Analyze talk time, call volume, and outcomes to coach reps and refine your pitch.'
        },
        {
          role: 'Customer success',
          headline: 'Track commitments and follow-ups',
          details: 'Action items and summaries make sure every account gets the attention it needs.'
        }
      ]
    };
  }

  // getWorkspaceSetupDefaults()
  getWorkspaceSetupDefaults() {
    const transcriptionSettingsArr = this._getFromStorage('transcription_settings');
    const settings = transcriptionSettingsArr[0] || null;

    const defaultLanguage = settings && settings.default_language
      ? settings.default_language
      : 'English (United States)';
    const defaultTimeZone = settings && settings.default_time_zone
      ? settings.default_time_zone
      : 'Pacific Time (US & Canada)';

    const supportedLanguages = [
      'English (United States)',
      'English (United Kingdom)',
      'Spanish (Spain)',
      'French (France)'
    ];

    const supportedTimeZones = [
      'Pacific Time (US & Canada)',
      'Mountain Time (US & Canada)',
      'Central Time (US & Canada)',
      'Eastern Time (US & Canada)',
      'UTC'
    ];

    const speakerNamingOptions = [
      'full_name',
      'first_name_only',
      'initials',
      'generic_label'
    ];

    return {
      suggestedName: 'My Workspace',
      defaultLanguage,
      defaultTimeZone,
      supportedLanguages,
      supportedTimeZones,
      speakerNamingOptions
    };
  }

  // createWorkspace(name, language, timeZone, autoTranscriptionEnabled, autoTranscriptionMinDurationMinutes, speakerNamingPreference)
  createWorkspace(
    name,
    language,
    timeZone,
    autoTranscriptionEnabled,
    autoTranscriptionMinDurationMinutes,
    speakerNamingPreference
  ) {
    const user = this._getOrCreateCurrentUser();
    let workspaces = this._getFromStorage('workspaces');

    const workspace = {
      id: this._generateId('ws'),
      user_id: user.id,
      name,
      language,
      time_zone: timeZone,
      auto_transcription_enabled: !!autoTranscriptionEnabled,
      auto_transcription_min_duration_minutes: autoTranscriptionEnabled
        ? autoTranscriptionMinDurationMinutes || 0
        : null,
      speaker_naming_preference: speakerNamingPreference,
      created_at: this._now(),
      updated_at: this._now()
    };

    workspaces.push(workspace);
    this._saveToStorage('workspaces', workspaces);
    localStorage.setItem('currentWorkspaceId', workspace.id);

    return {
      workspaceId: workspace.id,
      name: workspace.name,
      language: workspace.language,
      timeZone: workspace.time_zone,
      autoTranscriptionEnabled: workspace.auto_transcription_enabled,
      autoTranscriptionMinDurationMinutes: workspace.auto_transcription_min_duration_minutes,
      speakerNamingPreference: workspace.speaker_naming_preference
    };
  }

  // getDashboardOverview(dateRangePreset)
  getDashboardOverview(dateRangePreset) {
    this._getOrCreateCurrentUser();
    const workspace = this._getOrCreateCurrentWorkspace();
    const { dashboard, pinnedCharts } = this._getDefaultDashboard();

    const meetings = this._getFromStorage('meetings').filter(
      (m) => !m.workspace_id || m.workspace_id === workspace.id
    );

    const now = new Date();
    const upcoming = meetings
      .filter((m) => m.status === 'scheduled' && new Date(m.start_datetime) >= now)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 10)
      .map((m) => {
        const templates = this._getFromStorage('templates');
        const template = templates.find((t) => t.id === m.template_id) || null;
        return {
          meetingId: m.id,
          title: m.title,
          startDatetime: m.start_datetime,
          durationMinutes: m.duration_minutes,
          templateName: template ? template.name : null,
          isDefaultTemplateApplied: !!template
        };
      });

    const recentRangePreset = dateRangePreset || 'last_7_days';
    let start = null;
    if (recentRangePreset === 'last_7_days') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (recentRangePreset === 'last_30_days') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const recent = meetings
      .filter((m) => m.status === 'completed' && (!start || new Date(m.start_datetime) >= start))
      .sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime))
      .slice(0, 10)
      .map((m) => ({
        meetingId: m.id,
        title: m.title,
        startDatetime: m.start_datetime,
        durationMinutes: m.duration_minutes,
        status: m.status
      }));

    const quickLinks = [
      {
        label: 'Schedule a meeting',
        targetPage: 'schedule',
        context: 'primary_action'
      },
      {
        label: 'View recent meetings',
        targetPage: 'meetings',
        context: 'recent_meetings'
      },
      {
        label: 'Analytics overview',
        targetPage: 'analytics',
        context: 'insights'
      }
    ];

    return {
      upcomingMeetings: upcoming,
      recentMeetings: recent,
      pinnedCharts,
      quickLinks
    };
  }

  // getMeetingFilterOptions()
  getMeetingFilterOptions() {
    const teams = this._getFromStorage('teams');
    const tags = this._getFromStorage('tags');
    const meetings = this._getFromStorage('meetings');

    let min = 0;
    let max = 0;
    if (meetings.length > 0) {
      const durations = meetings.map((m) => m.duration_minutes || 0);
      min = Math.min.apply(null, durations);
      max = Math.max.apply(null, durations);
    }

    const participantCountOptions = [
      { label: 'Any', minParticipants: 0 },
      { label: '2+ participants', minParticipants: 2 },
      { label: '3+ participants', minParticipants: 3 },
      { label: '5+ participants', minParticipants: 5 }
    ];

    const dateRangePresets = [
      'last_7_days',
      'last_30_days',
      'this_week',
      'this_month'
    ];

    const sortOptions = [
      { value: 'start_datetime_desc', label: 'Date (newest first)' },
      { value: 'start_datetime_asc', label: 'Date (oldest first)' },
      { value: 'duration_desc', label: 'Duration (longest first)' },
      { value: 'duration_asc', label: 'Duration (shortest first)' }
    ];

    return {
      dateRangePresets,
      teams,
      tags,
      participantCountOptions,
      durationRangeMinutes: { min, max },
      sortOptions
    };
  }

  // searchMeetings(view, query, filters, sortBy, page, pageSize)
  searchMeetings(view, query, filters, sortBy, page, pageSize) {
    const workspace = this._getOrCreateCurrentWorkspace();
    const teams = this._getFromStorage('teams');
    const tags = this._getFromStorage('tags');
    let meetings = this._getFromStorage('meetings');

    const now = new Date();

    if (view === 'upcoming') {
      meetings = meetings.filter(
        (m) => m.status === 'scheduled' && new Date(m.start_datetime) >= now
      );
    } else if (view === 'past') {
      meetings = meetings.filter((m) => m.status === 'completed');
    }

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      meetings = meetings.filter((m) => (m.title || '').toLowerCase().includes(q));
    }

    if (filters) {
      let start = null;
      let end = null;

      if (filters.dateRangePreset) {
        const preset = filters.dateRangePreset;
        if (preset === 'last_30_days') {
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (preset === 'last_7_days') {
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (preset === 'this_week') {
          const day = now.getDay();
          const diffToMonday = (day === 0 ? -6 : 1) - day;
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
        } else if (preset === 'this_month') {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
        }
      }

      if (filters.startDate) {
        start = new Date(filters.startDate);
      }
      if (filters.endDate) {
        end = new Date(filters.endDate);
      }

      if (start) {
        meetings = meetings.filter((m) => new Date(m.start_datetime) >= start);
      }
      if (end) {
        meetings = meetings.filter((m) => new Date(m.start_datetime) <= end);
      }

      if (filters.teamId) {
        meetings = meetings.filter((m) => m.team_id === filters.teamId);
      }

      if (Array.isArray(filters.tagIds) && filters.tagIds.length > 0) {
        meetings = meetings.filter((m) => {
          const meetingTags = Array.isArray(m.tag_ids) ? m.tag_ids : [];
          return filters.tagIds.some((id) => meetingTags.includes(id));
        });
      }

      if (typeof filters.minParticipants === 'number') {
        meetings = meetings.filter((m) => {
          const count = typeof m.participant_count === 'number'
            ? m.participant_count
            : Array.isArray(m.participants)
              ? m.participants.length
              : 0;
          return count >= filters.minParticipants;
        });
      }

      if (typeof filters.maxParticipants === 'number') {
        meetings = meetings.filter((m) => {
          const count = typeof m.participant_count === 'number'
            ? m.participant_count
            : Array.isArray(m.participants)
              ? m.participants.length
              : 0;
          return count <= filters.maxParticipants;
        });
      }

      if (typeof filters.minDurationMinutes === 'number') {
        meetings = meetings.filter((m) => m.duration_minutes >= filters.minDurationMinutes);
      }

      if (typeof filters.maxDurationMinutes === 'number') {
        meetings = meetings.filter((m) => m.duration_minutes <= filters.maxDurationMinutes);
      }
    }

    const sortKey = sortBy || 'start_datetime_desc';
    meetings.sort((a, b) => {
      if (sortKey === 'duration_desc') {
        return b.duration_minutes - a.duration_minutes;
      }
      if (sortKey === 'duration_asc') {
        return a.duration_minutes - b.duration_minutes;
      }
      if (sortKey === 'start_datetime_asc') {
        return new Date(a.start_datetime) - new Date(b.start_datetime);
      }
      return new Date(b.start_datetime) - new Date(a.start_datetime);
    });

    const totalCount = meetings.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (currentPage - 1) * size;
    const endIndex = startIndex + size;

    const pageItems = meetings.slice(startIndex, endIndex).map((m) => {
      const team = teams.find((t) => t.id === m.team_id) || null;
      const teamName = team ? team.name : null;
      const meetingTags = Array.isArray(m.tag_ids) ? m.tag_ids : [];
      const tagNames = meetingTags
        .map((id) => tags.find((t) => t.id === id))
        .filter((t) => !!t)
        .map((t) => t.name);
      const participantCount = typeof m.participant_count === 'number'
        ? m.participant_count
        : Array.isArray(m.participants)
          ? m.participants.length
          : 0;

      return {
        meetingId: m.id,
        title: m.title,
        startDatetime: m.start_datetime,
        durationMinutes: m.duration_minutes,
        status: m.status,
        teamName,
        participantCount,
        tagNames
      };
    });

    return {
      meetings: pageItems,
      totalCount,
      page: currentPage,
      pageSize: size
    };
  }

  // getMeetingFullDetail(meetingId)
  getMeetingFullDetail(meetingId) {
    const meetings = this._getFromStorage('meetings');
    const tagsAll = this._getFromStorage('tags');
    const transcriptsAll = this._getFromStorage('transcripts');
    const speakersAll = this._getFromStorage('speakers');
    const actionItemsAll = this._getFromStorage('action_items');
    const shareLinksAll = this._getFromStorage('share_links');
    const templates = this._getFromStorage('templates');

    const meetingRecord = meetings.find((m) => m.id === meetingId) || null;

    if (!meetingRecord) {
      return {
        meeting: null,
        tags: [],
        transcript: null,
        speakers: [],
        actionItems: [],
        shareLinks: []
      };
    }

    const template = templates.find((t) => t.id === meetingRecord.template_id) || null;

    const meeting = {
      meetingId: meetingRecord.id,
      title: meetingRecord.title,
      description: meetingRecord.description || '',
      startDatetime: meetingRecord.start_datetime,
      endDatetime: meetingRecord.end_datetime || null,
      durationMinutes: meetingRecord.duration_minutes,
      status: meetingRecord.status,
      meetingType: meetingRecord.meeting_type || null,
      participants: Array.isArray(meetingRecord.participants)
        ? meetingRecord.participants
        : [],
      participantCount: typeof meetingRecord.participant_count === 'number'
        ? meetingRecord.participant_count
        : Array.isArray(meetingRecord.participants)
          ? meetingRecord.participants.length
          : 0,
      templateName: template ? template.name : null
    };

    const meetingTagIds = Array.isArray(meetingRecord.tag_ids) ? meetingRecord.tag_ids : [];
    const tags = tagsAll.filter((t) => meetingTagIds.includes(t.id));

    const transcript = transcriptsAll.find((t) => t.meeting_id === meetingRecord.id) || null;
    const transcriptWithFk = transcript
      ? { ...transcript, meeting: meetingRecord }
      : null;

    const speakers = speakersAll
      .filter((s) => s.meeting_id === meetingRecord.id)
      .map((s) => ({ ...s, meeting: meetingRecord }));

    const actionItems = actionItemsAll
      .filter((a) => a.meeting_id === meetingRecord.id)
      .map((a) => ({ ...a, meeting: meetingRecord }));

    const shareLinks = shareLinksAll
      .filter((s) => s.meeting_id === meetingRecord.id)
      .map((s) => ({ ...s, meeting: meetingRecord }));

    return {
      meeting,
      tags,
      transcript: transcriptWithFk,
      speakers,
      actionItems,
      shareLinks
    };
  }

  // getTranscriptSegments(transcriptId, page, pageSize)
  getTranscriptSegments(transcriptId, page, pageSize) {
    const transcripts = this._getFromStorage('transcripts');
    const speakers = this._getFromStorage('speakers');
    const segmentsAll = this._getFromStorage('transcript_segments');

    const transcript = transcripts.find((t) => t.id === transcriptId) || null;

    const filtered = segmentsAll
      .filter((s) => s.transcript_id === transcriptId)
      .sort((a, b) => {
        const aStart = typeof a.start_time_seconds === 'number' ? a.start_time_seconds : 0;
        const bStart = typeof b.start_time_seconds === 'number' ? b.start_time_seconds : 0;
        return aStart - bStart;
      });

    const totalCount = filtered.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 100;
    const startIndex = (currentPage - 1) * size;
    const endIndex = startIndex + size;

    const pageSegments = filtered.slice(startIndex, endIndex).map((seg) => {
      const speaker = speakers.find((sp) => sp.id === seg.speaker_id) || null;
      return {
        ...seg,
        transcript,
        speaker
      };
    });

    return {
      segments: pageSegments,
      page: currentPage,
      pageSize: size,
      totalCount
    };
  }

  // mergeTranscriptSegments(transcriptId, segmentIds)
  mergeTranscriptSegments(transcriptId, segmentIds) {
    if (!Array.isArray(segmentIds) || segmentIds.length < 2) {
      return { success: false, mergedSegment: null, removedSegmentIds: [] };
    }

    const segmentsAll = this._getFromStorage('transcript_segments');
    const relevant = segmentsAll.filter((s) => segmentIds.includes(s.id));

    if (relevant.length !== segmentIds.length) {
      return { success: false, mergedSegment: null, removedSegmentIds: [] };
    }

    if (relevant.some((s) => s.transcript_id !== transcriptId)) {
      return { success: false, mergedSegment: null, removedSegmentIds: [] };
    }

    const sorted = relevant.slice().sort((a, b) => {
      const aStart = typeof a.start_time_seconds === 'number' ? a.start_time_seconds : 0;
      const bStart = typeof b.start_time_seconds === 'number' ? b.start_time_seconds : 0;
      return aStart - bStart;
    });

    const mergedText = sorted.map((s) => s.text).join(' ');
    const startTime = sorted[0].start_time_seconds;
    const endTime = sorted[sorted.length - 1].end_time_seconds;
    const speakerId = sorted[0].speaker_id;

    const mergedSegment = {
      id: this._generateId('seg'),
      transcript_id: transcriptId,
      speaker_id: speakerId,
      start_time_seconds: startTime,
      end_time_seconds: endTime,
      text: mergedText,
      merged_from_segment_ids: segmentIds.slice(),
      created_at: this._now(),
      updated_at: this._now()
    };

    const remaining = segmentsAll.filter((s) => !segmentIds.includes(s.id));
    remaining.push(mergedSegment);
    this._saveToStorage('transcript_segments', remaining);

    return {
      success: true,
      mergedSegment,
      removedSegmentIds: segmentIds.slice()
    };
  }

  // renameSpeaker(speakerId, newName)
  renameSpeaker(speakerId, newName) {
    let speakers = this._getFromStorage('speakers');
    const speaker = speakers.find((s) => s.id === speakerId) || null;

    if (!speaker) {
      return { speaker: null };
    }

    const updated = { ...speaker, name: newName, updated_at: this._now() };
    speakers = speakers.map((s) => (s.id === speakerId ? updated : s));
    this._saveToStorage('speakers', speakers);

    return { speaker: updated };
  }

  // getActionItemsForMeeting(meetingId)
  getActionItemsForMeeting(meetingId) {
    const actionItemsAll = this._getFromStorage('action_items');
    const meetings = this._getFromStorage('meetings');
    const meeting = meetings.find((m) => m.id === meetingId) || null;

    return actionItemsAll
      .filter((a) => a.meeting_id === meetingId)
      .map((a) => ({ ...a, meeting }));
  }

  // createActionItemFromTranscript(meetingId, text, transcriptSegmentIds, ownerName, status)
  createActionItemFromTranscript(meetingId, text, transcriptSegmentIds, ownerName, status) {
    const actionItems = this._getFromStorage('action_items');

    const actionItem = {
      id: this._generateId('act'),
      meeting_id: meetingId,
      transcript_segment_ids: Array.isArray(transcriptSegmentIds)
        ? transcriptSegmentIds.slice()
        : [],
      text,
      owner_name: ownerName,
      status: status || 'open',
      created_at: this._now(),
      updated_at: this._now()
    };

    actionItems.push(actionItem);
    this._saveToStorage('action_items', actionItems);

    return { actionItem };
  }

  // updateActionItemOwner(actionItemId, ownerName)
  updateActionItemOwner(actionItemId, ownerName) {
    let actionItems = this._getFromStorage('action_items');
    const item = actionItems.find((a) => a.id === actionItemId) || null;
    if (!item) {
      return { actionItem: null };
    }

    const updated = { ...item, owner_name: ownerName, updated_at: this._now() };
    actionItems = actionItems.map((a) => (a.id === actionItemId ? updated : a));
    this._saveToStorage('action_items', actionItems);

    return { actionItem: updated };
  }

  // getAvailableTagsForMeetings()
  getAvailableTagsForMeetings() {
    return this._getFromStorage('tags');
  }

  // addTagToMeetingByName(meetingId, tagName)
  addTagToMeetingByName(meetingId, tagName) {
    let tags = this._getFromStorage('tags');
    let meetings = this._getFromStorage('meetings');

    const meeting = meetings.find((m) => m.id === meetingId) || null;
    if (!meeting) {
      return { meetingId, tags: [] };
    }

    const nameNormalized = tagName.trim().toLowerCase();
    let tag = tags.find((t) => t.name.toLowerCase() === nameNormalized) || null;

    if (!tag) {
      tag = {
        id: this._generateId('tag'),
        name: tagName,
        color: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      tags.push(tag);
      this._saveToStorage('tags', tags);
    }

    const meetingTagIds = Array.isArray(meeting.tag_ids) ? meeting.tag_ids.slice() : [];
    if (!meetingTagIds.includes(tag.id)) {
      meetingTagIds.push(tag.id);
    }

    const updatedMeeting = {
      ...meeting,
      tag_ids: meetingTagIds,
      updated_at: this._now()
    };

    meetings = meetings.map((m) => (m.id === meetingId ? updatedMeeting : m));
    this._saveToStorage('meetings', meetings);

    const meetingTags = meetingTagIds
      .map((id) => tags.find((t) => t.id === id))
      .filter((t) => !!t);

    return {
      meetingId,
      tags: meetingTags
    };
  }

  // removeTagFromMeeting(meetingId, tagId)
  removeTagFromMeeting(meetingId, tagId) {
    let meetings = this._getFromStorage('meetings');
    const tags = this._getFromStorage('tags');

    const meeting = meetings.find((m) => m.id === meetingId) || null;
    if (!meeting) {
      return { meetingId, tags: [] };
    }

    const meetingTagIds = Array.isArray(meeting.tag_ids) ? meeting.tag_ids.slice() : [];
    const newTagIds = meetingTagIds.filter((id) => id !== tagId);

    const updatedMeeting = {
      ...meeting,
      tag_ids: newTagIds,
      updated_at: this._now()
    };

    meetings = meetings.map((m) => (m.id === meetingId ? updatedMeeting : m));
    this._saveToStorage('meetings', meetings);

    const meetingTags = newTagIds
      .map((id) => tags.find((t) => t.id === id))
      .filter((t) => !!t);

    return {
      meetingId,
      tags: meetingTags
    };
  }

  // getShareLinksForMeeting(meetingId)
  getShareLinksForMeeting(meetingId) {
    const shareLinks = this._getFromStorage('share_links');
    const meetings = this._getFromStorage('meetings');
    const meeting = meetings.find((m) => m.id === meetingId) || null;

    return shareLinks
      .filter((s) => s.meeting_id === meetingId)
      .map((s) => ({ ...s, meeting }));
  }

  // createShareLink(meetingId, accessLevel, isPasswordProtected, password, expirationMode, customExpiresAt)
  createShareLink(
    meetingId,
    accessLevel,
    isPasswordProtected,
    password,
    expirationMode,
    customExpiresAt
  ) {
    let shareLinks = this._getFromStorage('share_links');

    const now = new Date();
    let expiresAt = null;

    if (expirationMode === 'expires_in_7_days') {
      expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (expirationMode === 'custom_date' && customExpiresAt) {
      expiresAt = new Date(customExpiresAt).toISOString();
    } else {
      expiresAt = null;
    }

    const allowedAccess = ['view_only', 'comment', 'edit'];
    const finalAccess = allowedAccess.includes(accessLevel)
      ? accessLevel
      : 'view_only';

    const shareLink = {
      id: this._generateId('share'),
      meeting_id: meetingId,
      access_level: finalAccess,
      url_token: this._generateId('token'),
      is_password_protected: !!isPasswordProtected,
      password: isPasswordProtected ? password || '' : null,
      expires_at: expiresAt,
      is_active: true,
      created_at: this._now(),
      last_accessed_at: null
    };

    shareLinks.push(shareLink);
    this._saveToStorage('share_links', shareLinks);

    return { shareLink };
  }

  // deactivateShareLink(shareLinkId)
  deactivateShareLink(shareLinkId) {
    let shareLinks = this._getFromStorage('share_links');
    const link = shareLinks.find((s) => s.id === shareLinkId) || null;

    if (!link) {
      return { shareLink: null };
    }

    const updated = { ...link, is_active: false, updated_at: this._now() };
    shareLinks = shareLinks.map((s) => (s.id === shareLinkId ? updated : s));
    this._saveToStorage('share_links', shareLinks);

    return { shareLink: updated };
  }

  // getTemplatesList()
  getTemplatesList() {
    return this._getFromStorage('templates');
  }

  // getTemplateDetail(templateId)
  getTemplateDetail(templateId) {
    const templates = this._getFromStorage('templates');
    const sectionsAll = this._getFromStorage('template_agenda_sections');
    const rulesAll = this._getFromStorage('template_auto_apply_rules');

    const template = templates.find((t) => t.id === templateId) || null;

    const agendaSections = sectionsAll
      .filter((s) => s.template_id === templateId)
      .sort((a, b) => a.order_index - b.order_index)
      .map((s) => ({ ...s, template }));

    const autoApplyRules = rulesAll
      .filter((r) => r.template_id === templateId)
      .map((r) => ({ ...r, template }));

    return {
      template,
      agendaSections,
      autoApplyRules
    };
  }

  // createMeetingTemplate(name, meetingType, defaultDurationMinutes, highlightActionItemsAutomatically, agendaSections, autoApplyRule)
  createMeetingTemplate(
    name,
    meetingType,
    defaultDurationMinutes,
    highlightActionItemsAutomatically,
    agendaSections,
    autoApplyRule
  ) {
    let templates = this._getFromStorage('templates');
    let sectionsAll = this._getFromStorage('template_agenda_sections');
    let rulesAll = this._getFromStorage('template_auto_apply_rules');

    const template = {
      id: this._generateId('tmpl'),
      name,
      meeting_type: meetingType || null,
      default_duration_minutes: defaultDurationMinutes,
      highlight_action_items_automatically: !!highlightActionItemsAutomatically,
      created_at: this._now(),
      updated_at: this._now()
    };

    templates.push(template);
    this._saveToStorage('templates', templates);

    const createdSections = Array.isArray(agendaSections)
      ? agendaSections.map((section, index) => {
          const sec = {
            id: this._generateId('tmpl_sec'),
            template_id: template.id,
            title: section.title,
            description: section.description || '',
            order_index:
              typeof section.orderIndex === 'number' ? section.orderIndex : index,
            created_at: this._now(),
            updated_at: this._now()
          };
          sectionsAll.push(sec);
          return sec;
        })
      : [];

    let createdRules = [];
    if (autoApplyRule && autoApplyRule.dayOfWeek && autoApplyRule.timeOfDay) {
      const rule = {
        id: this._generateId('tmpl_rule'),
        template_id: template.id,
        day_of_week: autoApplyRule.dayOfWeek,
        time_of_day: autoApplyRule.timeOfDay,
        time_zone: autoApplyRule.timeZone || null,
        is_default_for_time_slot: !!autoApplyRule.isDefaultForTimeSlot,
        created_at: this._now(),
        updated_at: this._now()
      };
      rulesAll.push(rule);
      createdRules = [rule];
    }

    this._saveToStorage('template_agenda_sections', sectionsAll);
    this._saveToStorage('template_auto_apply_rules', rulesAll);

    return {
      template,
      agendaSections: createdSections,
      autoApplyRules: createdRules
    };
  }

  // updateMeetingTemplate(templateId, ...)
  updateMeetingTemplate(
    templateId,
    name,
    meetingType,
    defaultDurationMinutes,
    highlightActionItemsAutomatically,
    agendaSections,
    autoApplyRules
  ) {
    let templates = this._getFromStorage('templates');
    let sectionsAll = this._getFromStorage('template_agenda_sections');
    let rulesAll = this._getFromStorage('template_auto_apply_rules');

    const template = templates.find((t) => t.id === templateId) || null;
    if (!template) {
      return {
        template: null,
        agendaSections: [],
        autoApplyRules: []
      };
    }

    const updatedTemplate = {
      ...template,
      name: name != null ? name : template.name,
      meeting_type: meetingType != null ? meetingType : template.meeting_type,
      default_duration_minutes:
        defaultDurationMinutes != null
          ? defaultDurationMinutes
          : template.default_duration_minutes,
      highlight_action_items_automatically:
        highlightActionItemsAutomatically != null
          ? !!highlightActionItemsAutomatically
          : template.highlight_action_items_automatically,
      updated_at: this._now()
    };

    templates = templates.map((t) => (t.id === templateId ? updatedTemplate : t));
    this._saveToStorage('templates', templates);

    if (Array.isArray(agendaSections)) {
      const existingSections = sectionsAll.filter((s) => s.template_id === templateId);
      const incomingIds = agendaSections
        .filter((s) => !!s.id)
        .map((s) => s.id);

      sectionsAll = sectionsAll.filter(
        (s) => s.template_id !== templateId || incomingIds.includes(s.id)
      );

      agendaSections.forEach((sec, index) => {
        if (sec.id) {
          const existing = existingSections.find((s) => s.id === sec.id) || null;
          if (existing) {
            const updatedSec = {
              ...existing,
              title: sec.title != null ? sec.title : existing.title,
              description:
                sec.description != null ? sec.description : existing.description,
              order_index:
                typeof sec.orderIndex === 'number'
                  ? sec.orderIndex
                  : existing.order_index,
              updated_at: this._now()
            };
            sectionsAll.push(updatedSec);
          }
        } else {
          const newSec = {
            id: this._generateId('tmpl_sec'),
            template_id: templateId,
            title: sec.title,
            description: sec.description || '',
            order_index:
              typeof sec.orderIndex === 'number' ? sec.orderIndex : index,
            created_at: this._now(),
            updated_at: this._now()
          };
          sectionsAll.push(newSec);
        }
      });

      this._saveToStorage('template_agenda_sections', sectionsAll);
    }

    if (Array.isArray(autoApplyRules)) {
      const existingRules = rulesAll.filter((r) => r.template_id === templateId);
      const incomingRuleIds = autoApplyRules
        .filter((r) => !!r.id)
        .map((r) => r.id);

      rulesAll = rulesAll.filter(
        (r) => r.template_id !== templateId || incomingRuleIds.includes(r.id)
      );

      autoApplyRules.forEach((rule) => {
        if (rule.id) {
          const existing = existingRules.find((r) => r.id === rule.id) || null;
          if (existing) {
            const updatedRule = {
              ...existing,
              day_of_week:
                rule.dayOfWeek != null ? rule.dayOfWeek : existing.day_of_week,
              time_of_day:
                rule.timeOfDay != null ? rule.timeOfDay : existing.time_of_day,
              time_zone:
                rule.timeZone != null ? rule.timeZone : existing.time_zone,
              is_default_for_time_slot:
                rule.isDefaultForTimeSlot != null
                  ? !!rule.isDefaultForTimeSlot
                  : existing.is_default_for_time_slot,
              updated_at: this._now()
            };
            rulesAll.push(updatedRule);
          }
        } else {
          const newRule = {
            id: this._generateId('tmpl_rule'),
            template_id: templateId,
            day_of_week: rule.dayOfWeek,
            time_of_day: rule.timeOfDay,
            time_zone: rule.timeZone || null,
            is_default_for_time_slot: !!rule.isDefaultForTimeSlot,
            created_at: this._now(),
            updated_at: this._now()
          };
          rulesAll.push(newRule);
        }
      });

      this._saveToStorage('template_auto_apply_rules', rulesAll);
    }

    const finalSections = sectionsAll
      .filter((s) => s.template_id === templateId)
      .sort((a, b) => a.order_index - b.order_index);
    const finalRules = rulesAll.filter((r) => r.template_id === templateId);

    return {
      template: updatedTemplate,
      agendaSections: finalSections,
      autoApplyRules: finalRules
    };
  }

  // getTranscriptionSettings()
  getTranscriptionSettings() {
    const user = this._getOrCreateCurrentUser();
    let settingsArr = this._getFromStorage('transcription_settings');
    let settings = settingsArr.find((s) => s.user_id === user.id) || null;

    if (!settings) {
      settings = {
        id: this._generateId('ts'),
        user_id: user.id,
        default_language: 'English (United States)',
        default_time_zone: 'Pacific Time (US & Canada)',
        use_custom_vocabulary_by_default: false,
        created_at: this._now(),
        updated_at: this._now()
      };
      settingsArr.push(settings);
      this._saveToStorage('transcription_settings', settingsArr);
    }

    const vocabularyLists = this._getFromStorage('custom_vocabulary_lists');
    const activeVocabularyLists = vocabularyLists.filter((v) => v.is_active);

    return {
      settings,
      activeVocabularyLists
    };
  }

  // updateTranscriptionSettings(defaultLanguage, defaultTimeZone, useCustomVocabularyByDefault)
  updateTranscriptionSettings(defaultLanguage, defaultTimeZone, useCustomVocabularyByDefault) {
    const user = this._getOrCreateCurrentUser();
    let settingsArr = this._getFromStorage('transcription_settings');
    let settings = settingsArr.find((s) => s.user_id === user.id) || null;

    if (!settings) {
      settings = {
        id: this._generateId('ts'),
        user_id: user.id,
        default_language: 'English (United States)',
        default_time_zone: 'Pacific Time (US & Canada)',
        use_custom_vocabulary_by_default: false,
        created_at: this._now(),
        updated_at: this._now()
      };
      settingsArr.push(settings);
    }

    const updated = {
      ...settings,
      default_language:
        defaultLanguage != null ? defaultLanguage : settings.default_language,
      default_time_zone:
        defaultTimeZone != null ? defaultTimeZone : settings.default_time_zone,
      use_custom_vocabulary_by_default:
        useCustomVocabularyByDefault != null
          ? !!useCustomVocabularyByDefault
          : settings.use_custom_vocabulary_by_default,
      updated_at: this._now()
    };

    settingsArr = settingsArr.map((s) => (s.id === settings.id ? updated : s));
    this._saveToStorage('transcription_settings', settingsArr);

    return { settings: updated };
  }

  // getCustomVocabularyListsSummary()
  getCustomVocabularyListsSummary() {
    return this._getFromStorage('custom_vocabulary_lists');
  }

  // createCustomVocabularyList(label, language, applyScope, isActive, terms)
  createCustomVocabularyList(label, language, applyScope, isActive, terms) {
    let lists = this._getFromStorage('custom_vocabulary_lists');
    let termRecords = this._getFromStorage('custom_vocabulary_terms');

    const vocabularyList = {
      id: this._generateId('vocab'),
      label: label || null,
      language,
      apply_scope: applyScope,
      is_active: !!isActive,
      created_at: this._now(),
      updated_at: this._now()
    };

    lists.push(vocabularyList);
    this._saveToStorage('custom_vocabulary_lists', lists);

    const createdTerms = Array.isArray(terms)
      ? terms.map((term) => {
          const rec = {
            id: this._generateId('term'),
            vocabulary_list_id: vocabularyList.id,
            term,
            created_at: this._now()
          };
          termRecords.push(rec);
          return rec;
        })
      : [];

    this._saveToStorage('custom_vocabulary_terms', termRecords);

    return {
      vocabularyList,
      createdTerms
    };
  }

  // updateCustomVocabularyList(vocabularyListId, ...)
  updateCustomVocabularyList(
    vocabularyListId,
    label,
    language,
    applyScope,
    isActive,
    terms
  ) {
    let lists = this._getFromStorage('custom_vocabulary_lists');
    let termRecords = this._getFromStorage('custom_vocabulary_terms');

    const existing = lists.find((l) => l.id === vocabularyListId) || null;
    if (!existing) {
      return {
        vocabularyList: null,
        terms: []
      };
    }

    const updatedList = {
      ...existing,
      label: label != null ? label : existing.label,
      language: language != null ? language : existing.language,
      apply_scope: applyScope != null ? applyScope : existing.apply_scope,
      is_active: isActive != null ? !!isActive : existing.is_active,
      updated_at: this._now()
    };

    lists = lists.map((l) => (l.id === vocabularyListId ? updatedList : l));
    this._saveToStorage('custom_vocabulary_lists', lists);

    let termsResult = termRecords.filter((t) => t.vocabulary_list_id === vocabularyListId);

    if (Array.isArray(terms)) {
      termRecords = termRecords.filter((t) => t.vocabulary_list_id !== vocabularyListId);
      termsResult = terms.map((term) => {
        const rec = {
          id: this._generateId('term'),
          vocabulary_list_id: vocabularyListId,
          term,
          created_at: this._now()
        };
        termRecords.push(rec);
        return rec;
      });
      this._saveToStorage('custom_vocabulary_terms', termRecords);
    }

    return {
      vocabularyList: updatedList,
      terms: termsResult
    };
  }

  // getNotificationSettings()
  getNotificationSettings() {
    const settings = this._persistNotificationSettings({});
    return { settings };
  }

  // updateNotificationSettings(...)
  updateNotificationSettings(
    emailSummariesEnabled,
    emailSummaryMinDurationMinutes,
    emailSummaryScope,
    desktopPopupsEnabled,
    dailyDigestEnabled,
    dailyDigestTime
  ) {
    const partial = {};

    if (emailSummariesEnabled != null) {
      partial.email_summaries_enabled = !!emailSummariesEnabled;
    }
    if (typeof emailSummaryMinDurationMinutes === 'number') {
      partial.email_summary_min_duration_minutes = emailSummaryMinDurationMinutes;
    }
    if (emailSummaryScope != null) {
      partial.email_summary_scope = emailSummaryScope;
    }
    if (desktopPopupsEnabled != null) {
      partial.desktop_popups_enabled = !!desktopPopupsEnabled;
    }
    if (dailyDigestEnabled != null) {
      partial.daily_digest_enabled = !!dailyDigestEnabled;
    }
    if (dailyDigestTime != null) {
      partial.daily_digest_time = dailyDigestTime;
    }

    const settings = this._persistNotificationSettings(partial);
    return { settings };
  }

  // getBillingOverview()
  getBillingOverview() {
    const user = this._getOrCreateCurrentUser();
    let billingSettingsArr = this._getFromStorage('billing_settings');
    const plans = this._getFromStorage('plans');
    let trials = this._getFromStorage('plan_trials');

    let billingSettings = billingSettingsArr.find((b) => b.user_id === user.id) || null;

    if (!billingSettings) {
      billingSettings = {
        id: this._generateId('bill'),
        user_id: user.id,
        current_plan_id: null,
        current_trial_id: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      billingSettingsArr.push(billingSettings);
      this._saveToStorage('billing_settings', billingSettingsArr);
    }

    const currentPlan = billingSettings.current_plan_id
      ? plans.find((p) => p.id === billingSettings.current_plan_id) || null
      : null;

    let currentTrial = billingSettings.current_trial_id
      ? trials.find((t) => t.id === billingSettings.current_trial_id) || null
      : null;

    if (currentTrial) {
      const plan = plans.find((p) => p.id === currentTrial.plan_id) || null;
      currentTrial = { ...currentTrial, plan };
    }

    return {
      billingSettings,
      currentPlan,
      currentTrial
    };
  }

  // getAvailablePlans(includeDeprecated)
  getAvailablePlans(includeDeprecated) {
    const plans = this._getFromStorage('plans');
    if (includeDeprecated) return plans;
    return plans.filter((p) => p.status === 'active');
  }

  // getPlanDetail(planId)
  getPlanDetail(planId) {
    const plans = this._getFromStorage('plans');
    const plan = plans.find((p) => p.id === planId) || null;

    if (!plan) {
      return {
        plan: null,
        featureList: [],
        supportedBillingCycles: []
      };
    }

    const featureList = [];
    const supportedBillingCycles = Array.isArray(plan.billing_cycle_options)
      ? plan.billing_cycle_options.slice()
      : [];

    return {
      plan,
      featureList,
      supportedBillingCycles
    };
  }

  // startFreeTrialForPlan(planId, billingCycle, teamSize)
  startFreeTrialForPlan(planId, billingCycle, teamSize) {
    const user = this._getOrCreateCurrentUser();
    const plans = this._getFromStorage('plans');
    let trials = this._getFromStorage('plan_trials');
    let billingSettingsArr = this._getFromStorage('billing_settings');

    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      return {
        trial: null,
        billingSettings: null
      };
    }

    const allowedCycles = ['monthly', 'yearly'];
    const cycle = allowedCycles.includes(billingCycle) ? billingCycle : 'monthly';

    const trial = {
      id: this._generateId('trial'),
      plan_id: plan.id,
      status: 'active',
      billing_cycle: cycle,
      team_size: typeof teamSize === 'number' ? teamSize : 1,
      start_date: this._now(),
      end_date: null
    };

    trials.push(trial);
    this._saveToStorage('plan_trials', trials);

    let billingSettings = billingSettingsArr.find((b) => b.user_id === user.id) || null;
    if (!billingSettings) {
      billingSettings = {
        id: this._generateId('bill'),
        user_id: user.id,
        current_plan_id: null,
        current_trial_id: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      billingSettingsArr.push(billingSettings);
    }

    const updatedBilling = {
      ...billingSettings,
      current_trial_id: trial.id,
      current_plan_id: plan.id,
      updated_at: this._now()
    };

    billingSettingsArr = billingSettingsArr.map((b) =>
      b.id === billingSettings.id ? updatedBilling : b
    );
    this._saveToStorage('billing_settings', billingSettingsArr);

    return {
      trial,
      billingSettings: updatedBilling
    };
  }

  // getAnalyticsFilterOptions()
  getAnalyticsFilterOptions() {
    const teams = this._getFromStorage('teams');
    const tags = this._getFromStorage('tags');
    const meetings = this._getFromStorage('meetings');

    let min = 0;
    let max = 0;
    if (meetings.length > 0) {
      const durations = meetings.map((m) => m.duration_minutes || 0);
      min = Math.min.apply(null, durations);
      max = Math.max.apply(null, durations);
    }

    const dateRangePresets = ['last_7_days', 'last_30_days', 'this_week', 'this_month'];

    return {
      dateRangePresets,
      teams,
      tags,
      durationRangeMinutes: { min, max }
    };
  }

  // getAnalyticsCharts(filters)
  getAnalyticsCharts(filters) {
    const filteredMeetings = this._applyAnalyticsFilters(filters || {});
    const teams = this._getFromStorage('teams');

    // totalMeetingTimeByUser
    const userTimeMap = new Map();
    filteredMeetings.forEach((m) => {
      const participants = Array.isArray(m.participants) ? m.participants : [];
      if (participants.length === 0) {
        const key = 'Unknown';
        const prev = userTimeMap.get(key) || 0;
        userTimeMap.set(key, prev + (m.duration_minutes || 0));
      } else {
        participants.forEach((p) => {
          const key = p || 'Unknown';
          const prev = userTimeMap.get(key) || 0;
          userTimeMap.set(key, prev + (m.duration_minutes || 0));
        });
      }
    });

    const totalMeetingTimeByUser = Array.from(userTimeMap.entries()).map(
      ([userName, totalMinutes]) => ({ userName, totalMinutes })
    );

    // meetingCountOverTime
    const dateCountMap = new Map();
    filteredMeetings.forEach((m) => {
      const d = new Date(m.start_datetime);
      const key = d.toISOString().slice(0, 10);
      const prev = dateCountMap.get(key) || 0;
      dateCountMap.set(key, prev + 1);
    });

    const meetingCountOverTime = Array.from(dateCountMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([date, meetingCount]) => ({ date, meetingCount }));

    // averageDurationByTeam
    const teamDurations = new Map();
    filteredMeetings.forEach((m) => {
      const teamId = m.team_id || 'none';
      const current = teamDurations.get(teamId) || { total: 0, count: 0 };
      current.total += m.duration_minutes || 0;
      current.count += 1;
      teamDurations.set(teamId, current);
    });

    const averageDurationByTeam = Array.from(teamDurations.entries()).map(
      ([teamId, { total, count }]) => {
        const team = teams.find((t) => t.id === teamId) || null;
        const teamName = team ? team.name : 'Unassigned';
        const averageMinutes = count > 0 ? total / count : 0;
        return { teamName, averageMinutes };
      }
    );

    return {
      totalMeetingTimeByUser,
      meetingCountOverTime,
      averageDurationByTeam
    };
  }

  // getDashboardsList()
  getDashboardsList() {
    return this._getFromStorage('dashboards');
  }

  // pinChartToDashboard(chartType, filters, dashboardId)
  pinChartToDashboard(chartType, filters, dashboardId) {
    let pinnedCharts = this._getFromStorage('pinned_charts');

    const pinnedChart = {
      id: this._generateId('chart'),
      dashboard_id: dashboardId,
      chart_type: chartType,
      filters_json: JSON.stringify(filters || {}),
      created_at: this._now()
    };

    pinnedCharts.push(pinnedChart);
    this._saveToStorage('pinned_charts', pinnedCharts);

    return { pinnedChart };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    return {
      mission:
        'We help teams make every conversation searchable, shareable, and actionable without extra work.',
      approach:
        'Our AI joins your calls, captures high-quality transcripts, and automatically surfaces the moments that matter.',
      valueByRole: [
        {
          role: 'Executives',
          summary: 'Understand how your teams spend meeting time and where decisions are made.'
        },
        {
          role: 'Managers',
          summary: 'Keep projects on track with reliable records of commitments and risks.'
        },
        {
          role: 'ICs',
          summary: 'Focus on the conversation instead of taking notes.'
        }
      ],
      resourceLinks: [
        { label: 'Help Center', targetPage: 'help' },
        { label: 'Privacy Policy', targetPage: 'privacy' },
        { label: 'Terms of Service', targetPage: 'terms' }
      ]
    };
  }

  // getHelpCenterOverview()
  getHelpCenterOverview() {
    // For simplicity, use static categories and articles; they are not persisted
    const categories = [
      {
        categoryId: 'getting_started',
        name: 'Getting started',
        description: 'Create workspaces, invite teammates, and connect your calendar.'
      },
      {
        categoryId: 'transcription',
        name: 'Transcription',
        description: 'Recording, accuracy, speakers, and custom vocabulary.'
      },
      {
        categoryId: 'billing',
        name: 'Billing',
        description: 'Plans, trials, and invoices.'
      }
    ];

    const featuredArticles = [
      {
        articleId: 'setup-workspace',
        title: 'Set up your first workspace',
        categoryName: 'Getting started'
      },
      {
        articleId: 'share-transcripts',
        title: 'Share transcripts securely with clients',
        categoryName: 'Transcription'
      }
    ];

    const commonWorkflows = [
      {
        name: 'Auto-transcribe recurring meetings',
        description:
          'Use templates and auto-join rules to capture weekly standups and check-ins.'
      },
      {
        name: 'Track follow-ups after calls',
        description:
          'Highlight action items and export them to your task manager.'
      }
    ];

    return {
      categories,
      featuredArticles,
      commonWorkflows
    };
  }

  // searchHelpContent(query, categoryId)
  searchHelpContent(query, categoryId) {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();

    const allArticles = [
      {
        articleId: 'setup-workspace',
        title: 'Set up your first workspace',
        snippet: 'Create a workspace, choose your language, and configure transcription.',
        categoryId: 'getting_started',
        categoryName: 'Getting started'
      },
      {
        articleId: 'speaker-labels',
        title: 'Configure speaker labels',
        snippet: 'Choose between full names, first names, initials, or generic labels.',
        categoryId: 'transcription',
        categoryName: 'Transcription'
      },
      {
        articleId: 'billing-trials',
        title: 'Manage free trials and plans',
        snippet: 'Learn how to start, upgrade, or cancel a trial.',
        categoryId: 'billing',
        categoryName: 'Billing'
      }
    ];

    return allArticles.filter((a) => {
      if (categoryId && a.categoryId !== categoryId) return false;
      return (
        a.title.toLowerCase().includes(q) ||
        a.snippet.toLowerCase().includes(q) ||
        a.categoryName.toLowerCase().includes(q)
      );
    });
  }

  // submitSupportRequest(subject, description, category)
  submitSupportRequest(subject, description, category) {
    const user = this._getOrCreateCurrentUser();
    let tickets = this._getFromStorage('support_tickets');

    const ticket = {
      id: this._generateId('ticket'),
      user_id: user.id,
      subject,
      description,
      category: category || null,
      status: 'open',
      created_at: this._now()
    };

    tickets.push(ticket);
    this._saveToStorage('support_tickets', tickets);

    return {
      ticketId: ticket.id,
      status: ticket.status,
      message: 'Support request submitted'
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          title: 'Overview',
          body:
            'We collect and process meeting data solely to provide and improve the transcription service.'
        },
        {
          title: 'Data retention',
          body:
            'You control how long recordings and transcripts are retained. Deleted data is removed from active systems within a reasonable period.'
        },
        {
          title: 'Your rights',
          body:
            'You can request access, correction, or deletion of your personal data at any time.'
        }
      ],
      contactEmail: 'privacy@example.com'
    };
  }

  // getTermsOfServiceContent()
  getTermsOfServiceContent() {
    return {
      lastUpdated: '2024-01-01',
      sections: [
        {
          title: 'Acceptance of terms',
          body:
            'By using the service, you agree to these terms and any policies referenced here.'
        },
        {
          title: 'Acceptable use',
          body:
            'You are responsible for ensuring you have consent to record and transcribe meetings.'
        },
        {
          title: 'Billing and trials',
          body:
            'Free trials may be limited in duration. Paid plans renew automatically unless cancelled.'
        }
      ]
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
