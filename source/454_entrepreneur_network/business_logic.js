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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Core entity tables
    ensureArrayKey('profiles');
    ensureArrayKey('membership_plans');
    ensureArrayKey('groups');
    ensureArrayKey('group_memberships');
    ensureArrayKey('group_posts');
    ensureArrayKey('events');
    ensureArrayKey('event_registrations');
    ensureArrayKey('members');
    ensureArrayKey('event_attendees');
    ensureArrayKey('connections');
    ensureArrayKey('message_threads');
    ensureArrayKey('messages');
    ensureArrayKey('bookmark_lists');
    ensureArrayKey('bookmarks');
    ensureArrayKey('notification_preferences');

    // Additional internal tables
    ensureArrayKey('group_post_comments');
    ensureArrayKey('group_post_reactions');
    ensureArrayKey('contact_submissions');
    ensureArrayKey('auth_users'); // {id, profile_id, email, password}

    // Static pages stored as map object (not an array)
    if (!localStorage.getItem('static_pages')) {
      localStorage.setItem('static_pages', JSON.stringify({}));
    }

    // Auth state object
    if (!localStorage.getItem('auth_state')) {
      localStorage.setItem(
        'auth_state',
        JSON.stringify({ isAuthenticated: false, profileId: null })
      );
    }

    // Global ID counter
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

  _nowIso() {
    return new Date().toISOString();
  }

  // -------------------- Expansion helpers (FK resolution) --------------------

  _expandProfile(profile) {
    if (!profile) return null;
    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find((p) => p.id === profile.current_membership_plan_id) || null;
    return {
      ...profile,
      current_membership_plan: plan
    };
  }

  _expandGroupMembership(membership) {
    if (!membership) return null;
    const groups = this._getFromStorage('groups');
    const group = groups.find((g) => g.id === membership.group_id) || null;
    return {
      ...membership,
      group
    };
  }

  _expandGroupPost(post) {
    if (!post) return null;
    const groups = this._getFromStorage('groups');
    const group = groups.find((g) => g.id === post.group_id) || null;
    return {
      ...post,
      group
    };
  }

  _expandEventRegistration(reg) {
    if (!reg) return null;
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === reg.event_id) || null;
    return {
      ...reg,
      event
    };
  }

  _expandEventAttendee(att) {
    if (!att) return null;
    const events = this._getFromStorage('events');
    const members = this._getFromStorage('members');
    const connections = this._getFromStorage('connections');
    const event = events.find((e) => e.id === att.event_id) || null;
    const member = members.find((m) => m.id === att.member_id) || null;
    const connection = connections.find((c) => c.member_id === att.member_id) || null;
    return {
      ...att,
      event,
      member,
      connection
    };
  }

  _expandConnection(conn) {
    if (!conn) return null;
    const members = this._getFromStorage('members');
    const member = members.find((m) => m.id === conn.member_id) || null;
    return {
      ...conn,
      member
    };
  }

  _expandMessageThread(thread) {
    if (!thread) return null;
    const members = this._getFromStorage('members');
    const member = members.find((m) => m.id === thread.member_id) || null;
    return {
      ...thread,
      member
    };
  }

  _expandMessage(msg) {
    if (!msg) return null;
    const threads = this._getFromStorage('message_threads');
    const thread = threads.find((t) => t.id === msg.thread_id) || null;
    const expandedThread = this._expandMessageThread(thread);
    return {
      ...msg,
      thread: expandedThread
    };
  }

  _expandBookmark(bookmark) {
    if (!bookmark) return null;
    const members = this._getFromStorage('members');
    const lists = this._getFromStorage('bookmark_lists');
    const member = members.find((m) => m.id === bookmark.member_id) || null;
    const list = bookmark.list_id
      ? lists.find((l) => l.id === bookmark.list_id) || null
      : null;
    return {
      ...bookmark,
      member,
      list
    };
  }

  // -------------------- Auth helper functions --------------------

  _getCurrentAuthState() {
    const raw = localStorage.getItem('auth_state');
    let state;
    try {
      state = raw ? JSON.parse(raw) : null;
    } catch (e) {
      state = null;
    }
    if (!state || !state.isAuthenticated || !state.profileId) {
      return { isAuthenticated: false, profile: null };
    }
    const profiles = this._getFromStorage('profiles');
    const profile = profiles.find((p) => p.id === state.profileId) || null;
    if (!profile) {
      return { isAuthenticated: false, profile: null };
    }
    return { isAuthenticated: true, profile: this._expandProfile(profile) };
  }

  _persistAuthState(state) {
    localStorage.setItem('auth_state', JSON.stringify(state));
  }

  // Single local profile helper (not strictly required for multi-user, but kept for convenience)
  _getOrCreateProfile() {
    let profiles = this._getFromStorage('profiles');
    if (profiles.length > 0) {
      return profiles[0];
    }
    const profile = {
      id: this._generateId('profile'),
      full_name: '',
      email: '',
      location: '',
      industry: '',
      title: '',
      bio: '',
      years_experience: null,
      mentoring_interest: 'not_interested',
      current_membership_plan_id: null,
      membership_status: 'trial',
      avatar_url: '',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    profiles.push(profile);
    this._saveToStorage('profiles', profiles);
    return profile;
  }

  _getOrCreateNotificationPreferences() {
    let prefs = this._getFromStorage('notification_preferences');
    if (prefs.length > 0) {
      return prefs[0];
    }
    const pref = {
      id: this._generateId('notifpref'),
      email_messages_enabled: true,
      email_events_enabled: true,
      email_groups_enabled: true,
      inapp_messages_enabled: true,
      inapp_events_enabled: true,
      inapp_groups_enabled: true,
      updated_at: this._nowIso()
    };
    prefs.push(pref);
    this._saveToStorage('notification_preferences', prefs);
    return pref;
  }

  _getOrCreateMessageThreadWithMember(memberId) {
    let threads = this._getFromStorage('message_threads');
    let thread = threads.find((t) => t.member_id === memberId) || null;
    if (thread) return thread;
    thread = {
      id: this._generateId('thread'),
      member_id: memberId,
      last_message_preview: '',
      last_message_at: null,
      unread_count: 0
    };
    threads.push(thread);
    this._saveToStorage('message_threads', threads);
    return thread;
  }

  _getOrCreateBookmarkListByName(name) {
    let lists = this._getFromStorage('bookmark_lists');
    let list = lists.find((l) => l.name.toLowerCase() === String(name).toLowerCase());
    if (list) return list;
    list = {
      id: this._generateId('bmlist'),
      name,
      description: '',
      created_at: this._nowIso()
    };
    lists.push(list);
    this._saveToStorage('bookmark_lists', lists);
    return list;
  }

  _recommendGroupsForUser(limit) {
    const groups = this._getFromStorage('groups');
    const { isAuthenticated, profile } = this._getCurrentAuthState();
    let recommended = groups;

    if (isAuthenticated && profile && profile.industry) {
      const industry = (profile.industry || '').toLowerCase();
      if (industry === 'technology') {
        recommended = groups.filter((g) => g.is_technology_focused === true);
      } else if (industry === 'marketing' || industry === 'growth') {
        recommended = groups.filter((g) => g.is_marketing_or_growth_focused === true);
      }
      if (recommended.length === 0) {
        recommended = groups;
      }
    }

    // Sort by member_count desc by default
    recommended = recommended.slice().sort((a, b) => (b.member_count || 0) - (a.member_count || 0));

    if (typeof limit === 'number') {
      recommended = recommended.slice(0, limit);
    }
    return recommended;
  }

  _buildDashboardActivityFeed(limit) {
    const feed = [];
    const groupPosts = this._getFromStorage('group_posts');
    const groups = this._getFromStorage('groups');
    const connections = this._getFromStorage('connections');
    const members = this._getFromStorage('members');
    const eventRegistrations = this._getFromStorage('event_registrations');
    const events = this._getFromStorage('events');

    // Group posts
    for (const post of groupPosts) {
      const group = groups.find((g) => g.id === post.group_id) || null;
      feed.push({
        type: 'group_post',
        createdAt: post.created_at,
        groupPost: { ...post, group },
        event: null,
        member: null,
        description: group
          ? `New post in ${group.name}: ${post.title}`
          : `New group post: ${post.title}`
      });
    }

    // New connections
    for (const conn of connections) {
      if (conn.status === 'connected') {
        const member = members.find((m) => m.id === conn.member_id) || null;
        feed.push({
          type: 'new_connection',
          createdAt: conn.created_at,
          groupPost: null,
          event: null,
          member,
          description: member
            ? `You connected with ${member.full_name}`
            : 'New connection'
        });
      }
    }

    // Event registrations
    for (const reg of eventRegistrations) {
      if (reg.registration_status === 'registered') {
        const event = events.find((e) => e.id === reg.event_id) || null;
        feed.push({
          type: 'event_registration',
          createdAt: reg.registered_at,
          groupPost: null,
          event,
          member: null,
          description: event
            ? `Registered for event: ${event.title}`
            : 'Event registration'
        });
      }
    }

    // Sort by createdAt desc
    feed.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });

    if (typeof limit === 'number') {
      return feed.slice(0, limit);
    }
    return feed;
  }

  // -------------------- Core interface implementations --------------------

  // getAuthStatus(): { isAuthenticated, profile }
  getAuthStatus() {
    return this._getCurrentAuthState();
  }

  // registerAccount(email, fullName, password)
  registerAccount(email, fullName, password) {
    const authUsers = this._getFromStorage('auth_users');
    const profiles = this._getFromStorage('profiles');

    const existingUser = authUsers.find((u) => u.email === email);
    if (existingUser) {
      const profile = profiles.find((p) => p.id === existingUser.profile_id) || null;
      return {
        success: false,
        profile: profile ? this._expandProfile(profile) : null,
        message: 'Email already registered.'
      };
    }

    const profileId = this._generateId('profile');
    const now = this._nowIso();
    const profile = {
      id: profileId,
      full_name: fullName,
      email: email,
      location: '',
      industry: '',
      title: '',
      bio: '',
      years_experience: null,
      mentoring_interest: 'not_interested',
      current_membership_plan_id: null,
      membership_status: 'trial',
      avatar_url: '',
      created_at: now,
      updated_at: now
    };

    profiles.push(profile);
    this._saveToStorage('profiles', profiles);

    const user = {
      id: this._generateId('authuser'),
      profile_id: profileId,
      email,
      password
    };
    authUsers.push(user);
    this._saveToStorage('auth_users', authUsers);

    this._persistAuthState({ isAuthenticated: true, profileId });

    return {
      success: true,
      profile: this._expandProfile(profile),
      message: 'Account registered successfully.'
    };
  }

  // login(email, password)
  login(email, password) {
    const authUsers = this._getFromStorage('auth_users');
    const profiles = this._getFromStorage('profiles');

    const user = authUsers.find((u) => u.email === email && u.password === password);
    if (!user) {
      return {
        success: false,
        profile: null,
        message: 'Invalid email or password.'
      };
    }

    const profile = profiles.find((p) => p.id === user.profile_id) || null;
    if (!profile) {
      return {
        success: false,
        profile: null,
        message: 'Account profile not found.'
      };
    }

    this._persistAuthState({ isAuthenticated: true, profileId: profile.id });

    return {
      success: true,
      profile: this._expandProfile(profile),
      message: 'Logged in successfully.'
    };
  }

  // logout()
  logout() {
    this._persistAuthState({ isAuthenticated: false, profileId: null });
    return { success: true };
  }

  // getMembershipPlans()
  getMembershipPlans() {
    return this._getFromStorage('membership_plans');
  }

  // getMyProfile()
  getMyProfile() {
    const { isAuthenticated, profile } = this._getCurrentAuthState();
    if (!isAuthenticated || !profile) return null;
    return this._expandProfile(profile);
  }

  // updateMyProfile(fullName?, location?, industry?, title?, bio?, yearsExperience?, mentoringInterest?)
  updateMyProfile(fullName, location, industry, title, bio, yearsExperience, mentoringInterest) {
    const auth = this._getCurrentAuthState();
    if (!auth.isAuthenticated || !auth.profile) return null;

    const profiles = this._getFromStorage('profiles');
    const idx = profiles.findIndex((p) => p.id === auth.profile.id);
    if (idx === -1) return null;

    const profile = { ...profiles[idx] };

    if (typeof fullName !== 'undefined') profile.full_name = fullName;
    if (typeof location !== 'undefined') profile.location = location;
    if (typeof industry !== 'undefined') profile.industry = industry;
    if (typeof title !== 'undefined') profile.title = title;
    if (typeof bio !== 'undefined') profile.bio = bio;
    if (typeof yearsExperience !== 'undefined') profile.years_experience = yearsExperience;
    if (typeof mentoringInterest !== 'undefined') profile.mentoring_interest = mentoringInterest;

    profile.updated_at = this._nowIso();
    profiles[idx] = profile;
    this._saveToStorage('profiles', profiles);

    return this._expandProfile(profile);
  }

  // completeOnboarding(membershipPlanId, location, industry, bio)
  completeOnboarding(membershipPlanId, location, industry, bio) {
    const auth = this._getCurrentAuthState();
    if (!auth.isAuthenticated || !auth.profile) {
      return { profile: null, selectedPlan: null };
    }

    const profiles = this._getFromStorage('profiles');
    const plans = this._getFromStorage('membership_plans');

    const idx = profiles.findIndex((p) => p.id === auth.profile.id);
    if (idx === -1) {
      return { profile: null, selectedPlan: null };
    }

    const profile = { ...profiles[idx] };
    profile.current_membership_plan_id = membershipPlanId;
    profile.membership_status = 'active';
    profile.location = location;
    profile.industry = industry;
    profile.bio = bio;
    profile.updated_at = this._nowIso();

    profiles[idx] = profile;
    this._saveToStorage('profiles', profiles);

    const plan = plans.find((p) => p.id === membershipPlanId) || null;

    return {
      profile: this._expandProfile(profile),
      selectedPlan: plan
    };
  }

  // getMyMembershipSummary()
  getMyMembershipSummary() {
    const { isAuthenticated, profile } = this._getCurrentAuthState();
    if (!isAuthenticated || !profile) {
      return {
        currentPlan: null,
        membershipStatus: null,
        nextBillingDate: null,
        billingPeriod: null
      };
    }

    const plans = this._getFromStorage('membership_plans');
    const currentPlan = plans.find((p) => p.id === profile.current_membership_plan_id) || null;

    return {
      currentPlan,
      membershipStatus: profile.membership_status || null,
      nextBillingDate: null,
      billingPeriod: currentPlan ? currentPlan.billing_period : null
    };
  }

  // changeMembershipPlan(membershipPlanId)
  changeMembershipPlan(membershipPlanId) {
    const { isAuthenticated, profile } = this._getCurrentAuthState();
    if (!isAuthenticated || !profile) {
      return {
        success: false,
        newPlan: null,
        message: 'Not authenticated.'
      };
    }

    const profiles = this._getFromStorage('profiles');
    const plans = this._getFromStorage('membership_plans');

    const newPlan = plans.find((p) => p.id === membershipPlanId) || null;
    if (!newPlan) {
      return {
        success: false,
        newPlan: null,
        message: 'Membership plan not found.'
      };
    }

    const idx = profiles.findIndex((p) => p.id === profile.id);
    if (idx === -1) {
      return {
        success: false,
        newPlan: null,
        message: 'Profile not found.'
      };
    }

    const updated = { ...profiles[idx] };
    updated.current_membership_plan_id = membershipPlanId;
    if (updated.membership_status === 'cancelled') {
      updated.membership_status = 'active';
    }
    updated.updated_at = this._nowIso();
    profiles[idx] = updated;
    this._saveToStorage('profiles', profiles);

    return {
      success: true,
      newPlan,
      message: 'Membership plan updated.'
    };
  }

  // getUpcomingRegisteredEvents(limit?)
  getUpcomingRegisteredEvents(limit) {
    const events = this._getFromStorage('events');
    const regs = this._getFromStorage('event_registrations');
    const nowTs = Date.now();

    const upcomingEvents = [];

    for (const reg of regs) {
      if (reg.registration_status !== 'registered') continue;
      const event = events.find((e) => e.id === reg.event_id);
      if (!event) continue;
      if (event.is_cancelled) continue;
      const startTs = new Date(event.start_datetime).getTime();
      if (startTs >= nowTs) {
        upcomingEvents.push(event);
      }
    }

    upcomingEvents.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());

    if (typeof limit === 'number') {
      return upcomingEvents.slice(0, limit);
    }
    return upcomingEvents;
  }

  // getRecommendedGroups(limit?)
  getRecommendedGroups(limit) {
    return this._recommendGroupsForUser(limit);
  }

  // getRecentActivityFeed(limit?)
  getRecentActivityFeed(limit) {
    return this._buildDashboardActivityFeed(limit);
  }

  // searchGroups(query?, filters?)
  searchGroups(query, filters) {
    const groups = this._getFromStorage('groups');
    let results = groups.slice();

    if (query) {
      const q = query.toLowerCase();
      results = results.filter((g) => {
        const name = (g.name || '').toLowerCase();
        const desc = (g.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    if (filters && typeof filters === 'object') {
      if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
        results = results.filter((g) => {
          const tags = Array.isArray(g.tags) ? g.tags : [];
          return filters.tags.every((t) => tags.includes(t));
        });
      }
      if (filters.category) {
        results = results.filter((g) => g.category === filters.category);
      }
      if (typeof filters.minMemberCount === 'number') {
        results = results.filter((g) => (g.member_count || 0) >= filters.minMemberCount);
      }
      if (typeof filters.isTechnologyFocused === 'boolean') {
        results = results.filter((g) => g.is_technology_focused === filters.isTechnologyFocused);
      }
      if (typeof filters.isMarketingOrGrowthFocused === 'boolean') {
        results = results.filter(
          (g) => g.is_marketing_or_growth_focused === filters.isMarketingOrGrowthFocused
        );
      }
    }

    return results;
  }

  // joinGroup(groupId)
  joinGroup(groupId) {
    const groups = this._getFromStorage('groups');
    const group = groups.find((g) => g.id === groupId) || null;
    if (!group) {
      return null;
    }

    let memberships = this._getFromStorage('group_memberships');
    let membership = memberships.find((m) => m.group_id === groupId) || null;
    const now = this._nowIso();

    if (!membership) {
      const status = group.visibility === 'private' ? 'requested' : 'joined';
      membership = {
        id: this._generateId('groupmem'),
        group_id: groupId,
        status,
        joined_at: status === 'joined' ? now : null
      };
      memberships.push(membership);
    } else {
      if (membership.status === 'left') {
        membership.status = group.visibility === 'private' ? 'requested' : 'joined';
        membership.joined_at = membership.status === 'joined' ? now : membership.joined_at;
      }
    }

    this._saveToStorage('group_memberships', memberships);
    return this._expandGroupMembership(membership);
  }

  // leaveGroup(groupId)
  leaveGroup(groupId) {
    let memberships = this._getFromStorage('group_memberships');
    const idx = memberships.findIndex((m) => m.group_id === groupId);
    if (idx === -1) return null;

    const membership = { ...memberships[idx], status: 'left' };
    memberships[idx] = membership;
    this._saveToStorage('group_memberships', memberships);

    return this._expandGroupMembership(membership);
  }

  // getGroupDetail(groupId) -> { group, membership }
  getGroupDetail(groupId) {
    const groups = this._getFromStorage('groups');
    const group = groups.find((g) => g.id === groupId) || null;
    const memberships = this._getFromStorage('group_memberships');
    const membershipRaw = memberships.find((m) => m.group_id === groupId && m.status !== 'left') || null;
    const membership = membershipRaw ? this._expandGroupMembership(membershipRaw) : null;
    return { group, membership };
  }

  // getGroupPosts(groupId, sortBy?, limit?, offset?)
  getGroupPosts(groupId, sortBy, limit, offset) {
    let posts = this._getFromStorage('group_posts').filter((p) => p.group_id === groupId);

    if (sortBy === 'newest_first') {
      posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      // default newest_first
      posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    if (typeof offset === 'number' && offset > 0) {
      posts = posts.slice(offset);
    }
    if (typeof limit === 'number') {
      posts = posts.slice(0, limit);
    }

    return posts.map((p) => this._expandGroupPost(p));
  }

  // createGroupPost(groupId, title, content, category?, tags?, isCollaborationRequest?, budgetAmount?, timelineDescription?)
  createGroupPost(
    groupId,
    title,
    content,
    category,
    tags,
    isCollaborationRequest,
    budgetAmount,
    timelineDescription
  ) {
    const posts = this._getFromStorage('group_posts');
    const now = this._nowIso();

    const post = {
      id: this._generateId('gpost'),
      group_id: groupId,
      title,
      content,
      category: typeof category !== 'undefined' && category !== null ? category : null,
      tags: Array.isArray(tags) ? tags : [],
      is_collaboration_request: !!isCollaborationRequest,
      budget_amount:
        typeof budgetAmount === 'number' && !Number.isNaN(budgetAmount) ? budgetAmount : null,
      timeline_description:
        typeof timelineDescription !== 'undefined' && timelineDescription !== null
          ? timelineDescription
          : null,
      created_at: now,
      updated_at: now
    };

    posts.push(post);
    this._saveToStorage('group_posts', posts);

    return this._expandGroupPost(post);
  }

  // addCommentToGroupPost(postId, content)
  addCommentToGroupPost(postId, content) {
    const posts = this._getFromStorage('group_posts');
    const post = posts.find((p) => p.id === postId);
    if (!post) {
      return { success: false, message: 'Post not found.' };
    }

    const comments = this._getFromStorage('group_post_comments');
    const comment = {
      id: this._generateId('gcomment'),
      post_id: postId,
      content,
      created_at: this._nowIso()
    };
    comments.push(comment);
    this._saveToStorage('group_post_comments', comments);

    return { success: true, message: 'Comment added.' };
  }

  // reactToGroupPost(postId, reactionType)
  reactToGroupPost(postId, reactionType) {
    const posts = this._getFromStorage('group_posts');
    const post = posts.find((p) => p.id === postId);
    if (!post) {
      return { success: false };
    }

    let reactions = this._getFromStorage('group_post_reactions');
    let reaction = reactions.find((r) => r.post_id === postId) || null;
    if (!reaction) {
      reaction = {
        id: this._generateId('greaction'),
        post_id: postId,
        reaction_type: reactionType
      };
      reactions.push(reaction);
    } else {
      reaction.reaction_type = reactionType;
    }
    this._saveToStorage('group_post_reactions', reactions);

    return { success: true };
  }

  // searchEvents(filters?, sortBy?)
  searchEvents(filters, sortBy) {
    let events = this._getFromStorage('events').filter((e) => !e.is_cancelled);

    if (filters && typeof filters === 'object') {
      if (filters.format) {
        events = events.filter((e) => e.format === filters.format);
      }
      if (filters.startDate) {
        const startTs = new Date(filters.startDate).getTime();
        events = events.filter((e) => new Date(e.start_datetime).getTime() >= startTs);
      }
      if (filters.endDate) {
        const endTs = new Date(filters.endDate).getTime();
        events = events.filter((e) => new Date(e.start_datetime).getTime() <= endTs);
      }
      if (typeof filters.minPrice === 'number') {
        events = events.filter((e) => (e.price || 0) >= filters.minPrice);
      }
      if (typeof filters.maxPrice === 'number') {
        events = events.filter((e) => (e.price || 0) <= filters.maxPrice);
      }
      if (filters.onlyRegistered) {
        const regs = this._getFromStorage('event_registrations');
        const registeredIds = new Set(
          regs.filter((r) => r.registration_status === 'registered').map((r) => r.event_id)
        );
        events = events.filter((e) => registeredIds.has(e.id));
      }
    }

    if (sortBy === 'start_date_asc') {
      events.sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime());
    } else if (sortBy === 'start_date_desc') {
      events.sort((a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime());
    } else if (sortBy === 'price_low_to_high') {
      events.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      events.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return events;
  }

  // getEventDetail(eventId) -> { event, registration }
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const regs = this._getFromStorage('event_registrations');

    const event = events.find((e) => e.id === eventId) || null;
    const regRaw = regs.find((r) => r.event_id === eventId) || null;
    const registration = regRaw ? this._expandEventRegistration(regRaw) : null;

    return { event, registration };
  }

  // registerForEvent(eventId)
  registerForEvent(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;
    if (!event || event.is_cancelled) {
      return null;
    }

    let regs = this._getFromStorage('event_registrations');
    let reg = regs.find((r) => r.event_id === eventId) || null;
    const now = this._nowIso();

    if (!reg) {
      reg = {
        id: this._generateId('ereg'),
        event_id: eventId,
        registration_status: 'registered',
        registered_at: now,
        ticket_price_paid: event.price || 0
      };
      regs.push(reg);
    } else {
      reg.registration_status = 'registered';
      reg.registered_at = now;
      reg.ticket_price_paid = event.price || reg.ticket_price_paid || 0;
    }

    this._saveToStorage('event_registrations', regs);
    return this._expandEventRegistration(reg);
  }

  // getEventAttendees(eventId, onlyConnections?)
  getEventAttendees(eventId, onlyConnections) {
    let attendees = this._getFromStorage('event_attendees').filter((a) => a.event_id === eventId);

    // Only include registered
    attendees = attendees.filter((a) => a.registration_status === 'registered');

    if (onlyConnections) {
      const connections = this._getFromStorage('connections');
      const connectionMemberIds = new Set(
        connections.filter((c) => c.status === 'connected').map((c) => c.member_id)
      );
      attendees = attendees.filter(
        (a) => a.is_connection === true || connectionMemberIds.has(a.member_id)
      );
    }

    return attendees.map((a) => this._expandEventAttendee(a));
  }

  // searchMembers(query?, filters?, limit?, offset?)
  searchMembers(query, filters, limit, offset) {
    let members = this._getFromStorage('members');

    if (query) {
      const q = query.toLowerCase();
      members = members.filter((m) => {
        const name = (m.full_name || '').toLowerCase();
        const title = (m.title || '').toLowerCase();
        const bio = (m.bio || '').toLowerCase();
        return name.includes(q) || title.includes(q) || bio.includes(q);
      });
    }

    if (filters && typeof filters === 'object') {
      if (filters.location) {
        members = members.filter((m) => m.location === filters.location);
      }
      if (filters.industry) {
        members = members.filter((m) => m.industry === filters.industry);
      }
      if (typeof filters.minYearsExperience === 'number') {
        members = members.filter(
          (m) => (typeof m.years_experience === 'number' ? m.years_experience : 0) >= filters.minYearsExperience
        );
      }
      if (filters.mentoringInterest) {
        members = members.filter((m) => m.mentoring_interest === filters.mentoringInterest);
      }
      if (typeof filters.isFounder === 'boolean') {
        members = members.filter((m) => m.is_founder === filters.isFounder);
      }
    }

    if (typeof offset === 'number' && offset > 0) {
      members = members.slice(offset);
    }
    if (typeof limit === 'number') {
      members = members.slice(0, limit);
    }

    return members;
  }

  // getMemberProfile(memberId)
  getMemberProfile(memberId) {
    let members = this._getFromStorage('members');
    let member = members.find((m) => m.id === memberId) || null;
    if (member) {
      return member;
    }

    // Fallback: if member appears only in connections or event attendees, create a minimal profile
    const connections = this._getFromStorage('connections');
    const hasConnection = connections.some((c) => c.member_id === memberId);
    const attendees = this._getFromStorage('event_attendees');
    const hasAttendee = attendees.some((a) => a.member_id === memberId);

    if (!hasConnection && !hasAttendee) {
      return null;
    }

    member = {
      id: memberId,
      full_name: '',
      title: '',
      location: '',
      industry: '',
      bio: '',
      years_experience: null,
      mentoring_interest: 'not_interested',
      is_founder: false,
      avatar_url: ''
    };

    members.push(member);
    this._saveToStorage('members', members);
    return member;
  }

  // sendConnectionRequest(memberId)
  sendConnectionRequest(memberId) {
    let connections = this._getFromStorage('connections');
    let conn = connections.find((c) => c.member_id === memberId) || null;
    const now = this._nowIso();

    if (!conn) {
      conn = {
        id: this._generateId('conn'),
        member_id: memberId,
        status: 'pending',
        created_at: now
      };
      connections.push(conn);
    } else if (conn.status === 'blocked') {
      // Keep blocked state
    } else {
      // If already pending/connected, keep as-is
    }

    this._saveToStorage('connections', connections);
    return this._expandConnection(conn);
  }

  // getMessageThreads()
  getMessageThreads() {
    let threads = this._getFromStorage('message_threads');
    threads = threads.slice().sort((a, b) => {
      const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return tb - ta;
    });
    return threads.map((t) => this._expandMessageThread(t));
  }

  // getThreadMessages(threadId)
  getThreadMessages(threadId) {
    let messages = this._getFromStorage('messages').filter((m) => m.thread_id === threadId);
    messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return messages.map((m) => this._expandMessage(m));
  }

  // sendMessageInThread(threadId, content)
  sendMessageInThread(threadId, content) {
    const threads = this._getFromStorage('message_threads');
    const idx = threads.findIndex((t) => t.id === threadId);
    if (idx === -1) {
      return null;
    }

    let messages = this._getFromStorage('messages');
    const now = this._nowIso();
    const message = {
      id: this._generateId('msg'),
      thread_id: threadId,
      sender_type: 'self',
      content,
      created_at: now
    };
    messages.push(message);
    this._saveToStorage('messages', messages);

    const thread = { ...threads[idx] };
    thread.last_message_preview = content.slice(0, 200);
    thread.last_message_at = now;
    thread.unread_count = 0;
    threads[idx] = thread;
    this._saveToStorage('message_threads', threads);

    return this._expandMessage(message);
  }

  // sendMessageToMember(memberId, content) -> { thread, message }
  sendMessageToMember(memberId, content) {
    const thread = this._getOrCreateMessageThreadWithMember(memberId);

    let messages = this._getFromStorage('messages');
    const now = this._nowIso();

    const message = {
      id: this._generateId('msg'),
      thread_id: thread.id,
      sender_type: 'self',
      content,
      created_at: now
    };
    messages.push(message);
    this._saveToStorage('messages', messages);

    // Update thread
    const threads = this._getFromStorage('message_threads');
    const idx = threads.findIndex((t) => t.id === thread.id);
    if (idx !== -1) {
      const updatedThread = { ...threads[idx] };
      updatedThread.last_message_preview = content.slice(0, 200);
      updatedThread.last_message_at = now;
      updatedThread.unread_count = 0;
      threads[idx] = updatedThread;
      this._saveToStorage('message_threads', threads);
    }

    const expandedThread = this._expandMessageThread(thread);
    const expandedMessage = this._expandMessage(message);

    return {
      thread: expandedThread,
      message: expandedMessage
    };
  }

  // getBookmarkListsWithMembers()
  getBookmarkListsWithMembers() {
    const lists = this._getFromStorage('bookmark_lists');
    const bookmarks = this._getFromStorage('bookmarks');
    const members = this._getFromStorage('members');

    return lists.map((list) => {
      const listBookmarksRaw = bookmarks.filter((b) => b.list_id === list.id);
      const listBookmarks = listBookmarksRaw.map((bookmark) => ({
        bookmark,
        member: members.find((m) => m.id === bookmark.member_id) || null
      }));
      return { list, bookmarks: listBookmarks };
    });
  }

  // createBookmarkList(name, description?)
  createBookmarkList(name, description) {
    const lists = this._getFromStorage('bookmark_lists');
    const list = {
      id: this._generateId('bmlist'),
      name,
      description: typeof description !== 'undefined' ? description : '',
      created_at: this._nowIso()
    };
    lists.push(list);
    this._saveToStorage('bookmark_lists', lists);
    return list;
  }

  // updateBookmarkList(listId, name?, description?)
  updateBookmarkList(listId, name, description) {
    const lists = this._getFromStorage('bookmark_lists');
    const idx = lists.findIndex((l) => l.id === listId);
    if (idx === -1) return null;

    const list = { ...lists[idx] };
    if (typeof name !== 'undefined') list.name = name;
    if (typeof description !== 'undefined') list.description = description;
    lists[idx] = list;
    this._saveToStorage('bookmark_lists', lists);
    return list;
  }

  // deleteBookmarkList(listId, deleteBookmarks?)
  deleteBookmarkList(listId, deleteBookmarks) {
    let lists = this._getFromStorage('bookmark_lists');
    const beforeLen = lists.length;
    lists = lists.filter((l) => l.id !== listId);
    this._saveToStorage('bookmark_lists', lists);

    let bookmarks = this._getFromStorage('bookmarks');
    if (deleteBookmarks) {
      bookmarks = bookmarks.filter((b) => b.list_id !== listId);
    } else {
      bookmarks = bookmarks.map((b) => (b.list_id === listId ? { ...b, list_id: null } : b));
    }
    this._saveToStorage('bookmarks', bookmarks);

    return { success: lists.length !== beforeLen };
  }

  // bookmarkMember(memberId, listId?, note?)
  bookmarkMember(memberId, listId, note) {
    const bookmarks = this._getFromStorage('bookmarks');
    const now = this._nowIso();

    const bookmark = {
      id: this._generateId('bmk'),
      member_id: memberId,
      list_id: listId || null,
      note: typeof note !== 'undefined' ? note : '',
      created_at: now
    };

    bookmarks.push(bookmark);
    this._saveToStorage('bookmarks', bookmarks);

    return this._expandBookmark(bookmark);
  }

  // moveBookmarkToList(bookmarkId, targetListId)
  moveBookmarkToList(bookmarkId, targetListId) {
    const bookmarks = this._getFromStorage('bookmarks');
    const idx = bookmarks.findIndex((b) => b.id === bookmarkId);
    if (idx === -1) return null;

    const bookmark = { ...bookmarks[idx], list_id: targetListId };
    bookmarks[idx] = bookmark;
    this._saveToStorage('bookmarks', bookmarks);

    return this._expandBookmark(bookmark);
  }

  // deleteBookmark(bookmarkId)
  deleteBookmark(bookmarkId) {
    let bookmarks = this._getFromStorage('bookmarks');
    const beforeLen = bookmarks.length;
    bookmarks = bookmarks.filter((b) => b.id !== bookmarkId);
    this._saveToStorage('bookmarks', bookmarks);
    return { success: bookmarks.length !== beforeLen };
  }

  // getNotificationPreferences()
  getNotificationPreferences() {
    const pref = this._getOrCreateNotificationPreferences();
    return pref;
  }

  // updateNotificationPreferences(preferences)
  updateNotificationPreferences(preferences) {
    if (!preferences || typeof preferences !== 'object') {
      return this._getOrCreateNotificationPreferences();
    }

    let prefs = this._getFromStorage('notification_preferences');
    let pref;
    if (prefs.length === 0) {
      pref = this._getOrCreateNotificationPreferences();
      prefs = this._getFromStorage('notification_preferences');
    } else {
      pref = { ...prefs[0] };
    }

    const map = {
      emailMessagesEnabled: 'email_messages_enabled',
      emailEventsEnabled: 'email_events_enabled',
      emailGroupsEnabled: 'email_groups_enabled',
      inappMessagesEnabled: 'inapp_messages_enabled',
      inappEventsEnabled: 'inapp_events_enabled',
      inappGroupsEnabled: 'inapp_groups_enabled'
    };

    for (const [inputKey, storageKey] of Object.entries(map)) {
      if (Object.prototype.hasOwnProperty.call(preferences, inputKey)) {
        const val = preferences[inputKey];
        if (typeof val === 'boolean') {
          pref[storageKey] = val;
        }
      }
    }

    pref.updated_at = this._nowIso();
    prefs[0] = pref;
    this._saveToStorage('notification_preferences', prefs);

    return pref;
  }

  // getStaticPageContent(pageKey)
  getStaticPageContent(pageKey) {
    const raw = localStorage.getItem('static_pages');
    let pages;
    try {
      pages = raw ? JSON.parse(raw) : {};
    } catch (e) {
      pages = {};
    }
    const page = pages[pageKey] || { title: '', contentHtml: '' };
    return page;
  }

  // submitContactForm(name, email, subject, category?, message)
  submitContactForm(name, email, subject, category, message) {
    const submissions = this._getFromStorage('contact_submissions');
    const submission = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      category: typeof category !== 'undefined' ? category : null,
      message,
      created_at: this._nowIso()
    };
    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);
    return { success: true, message: 'Contact form submitted.' };
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