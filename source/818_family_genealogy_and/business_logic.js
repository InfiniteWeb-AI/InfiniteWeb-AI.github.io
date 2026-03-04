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
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    const defaultArrays = [
      'users',
      'products',
      'carts',
      'cartItems',
      'family_trees',
      'tree_people',
      'person_relationships',
      'historical_records',
      'record_attachments',
      'bookmarks',
      'saved_searches',
      'membership_plans',
      'subscriptions',
      'payment_methods',
      'payment_transactions',
      'events',
      'event_registrations',
      'branch_groups',
      'branch_memberships',
      'forum_categories',
      'forum_topics',
      'forum_posts',
      'topic_subscriptions',
      'public_trees',
      'tree_manager_profiles',
      'message_threads',
      'messages',
      'research_lists',
      'research_tasks'
    ];

    const defaultNulls = [
      'notification_settings',
      'account_profile'
    ];

    for (const key of defaultArrays) {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    for (const key of defaultNulls) {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, 'null');
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null || parsed === undefined) {
        return defaultValue !== undefined ? defaultValue : [];
      }
      return parsed;
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  _now() {
    return new Date().toISOString();
  }

  _toIsoDate(value) {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    return null;
  }

  _addMonths(dateIso, months) {
    const d = new Date(dateIso);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const day = d.getUTCDate();
    const target = new Date(Date.UTC(year, month + months, day));
    return target.toISOString();
  }

  // -------------------- Helper: Primary tree & people --------------------

  _getOrCreatePrimaryTree() {
    const trees = this._getFromStorage('family_trees', []);
    let primary = trees.find(t => t.isPrimary === true);
    if (!primary) {
      primary = {
        id: this._generateId('tree'),
        name: 'My Family Tree',
        description: '',
        visibility: 'private',
        surnameFocus: '',
        personCount: 0,
        isPrimary: true,
        createdAt: this._now(),
        updatedAt: null
      };
      trees.push(primary);
      this._saveToStorage('family_trees', trees);
    }
    return primary;
  }

  _recalculateTreePersonCount(treeId) {
    const trees = this._getFromStorage('family_trees', []);
    const people = this._getFromStorage('tree_people', []);
    const tree = trees.find(t => t.id === treeId);
    if (!tree) return;
    const count = people.filter(p => p.treeId === treeId).length;
    tree.personCount = count;
    tree.updatedAt = this._now();
    this._saveToStorage('family_trees', trees);
  }

  _createPersonRelationshipPair(treeId, relationshipType, personAId, personBId, isBiological) {
    const relationships = this._getFromStorage('person_relationships', []);
    const now = this._now();

    const makeRel = (fromId, toId, type) => ({
      id: this._generateId('rel'),
      treeId: treeId,
      fromPersonId: fromId,
      toPersonId: toId,
      relationshipType: type,
      isBiological: typeof isBiological === 'boolean' ? isBiological : undefined,
      notes: ''
    });

    let rel1, rel2;
    switch (relationshipType) {
      case 'parent':
        rel1 = makeRel(personAId, personBId, 'parent');
        rel2 = makeRel(personBId, personAId, 'child');
        break;
      case 'child':
        rel1 = makeRel(personAId, personBId, 'child');
        rel2 = makeRel(personBId, personAId, 'parent');
        break;
      case 'spouse':
        rel1 = makeRel(personAId, personBId, 'spouse');
        rel2 = makeRel(personBId, personAId, 'spouse');
        break;
      case 'grandparent':
        rel1 = makeRel(personAId, personBId, 'grandparent');
        rel2 = makeRel(personBId, personAId, 'grandchild');
        break;
      case 'grandchild':
        rel1 = makeRel(personAId, personBId, 'grandchild');
        rel2 = makeRel(personBId, personAId, 'grandparent');
        break;
      case 'sibling':
        rel1 = makeRel(personAId, personBId, 'sibling');
        rel2 = makeRel(personBId, personAId, 'sibling');
        break;
      case 'other':
      default:
        rel1 = makeRel(personAId, personBId, 'other');
        rel2 = makeRel(personBId, personAId, 'other');
        break;
    }

    relationships.push(rel1, rel2);
    this._saveToStorage('person_relationships', relationships);
    return [rel1, rel2];
  }

  // -------------------- Helper: Subscription & payments --------------------

  _getCurrentSubscription() {
    const subs = this._getFromStorage('subscriptions', []);
    if (!subs.length) return null;
    // Prefer active, then pending, then most recent
    const active = subs.filter(s => s.status === 'active');
    if (active.length) {
      active.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      return active[0];
    }
    const pending = subs.filter(s => s.status === 'pending');
    if (pending.length) {
      pending.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      return pending[0];
    }
    subs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    return subs[0];
  }

  _createOrUpdatePaymentMethodFromCardInput(card) {
    const paymentMethods = this._getFromStorage('payment_methods', []);
    const last4 = card.cardNumber ? String(card.cardNumber).slice(-4) : '';
    const expiryMonth = card.expiryMonth;
    const expiryYear = card.expiryYear;
    const cardholderName = card.cardholderName || '';

    let brand = 'unknown';
    const firstDigit = card.cardNumber ? String(card.cardNumber)[0] : '';
    if (firstDigit === '4') brand = 'visa';
    else if (firstDigit === '5') brand = 'mastercard';
    else if (firstDigit === '3') brand = 'amex';

    let existing = paymentMethods.find(pm =>
      pm.cardLast4 === last4 &&
      pm.cardholderName === cardholderName &&
      pm.expiryMonth === expiryMonth &&
      pm.expiryYear === expiryYear
    );

    if (!existing) {
      existing = {
        id: this._generateId('paym'),
        cardholderName,
        cardLast4: last4,
        cardBrand: brand,
        expiryMonth,
        expiryYear,
        isDefault: true,
        createdAt: this._now()
      };
      // Clear previous default
      paymentMethods.forEach(pm => {
        pm.isDefault = false;
      });
      paymentMethods.push(existing);
      this._saveToStorage('payment_methods', paymentMethods);
    }

    return existing.id;
  }

  // -------------------- Helper: Events distance --------------------

  _calculateEventDistanceMiles(event, location) {
    if (!event || typeof event.latitude !== 'number' || typeof event.longitude !== 'number') {
      return null;
    }

    const locationMap = {
      'Chicago, IL': { lat: 41.8781, lon: -87.6298 }
      // Additional locations can be added here as needed
    };

    const loc = locationMap[location];
    if (!loc) return null;

    const toRad = deg => (deg * Math.PI) / 180;
    const R = 3958.8; // miles
    const dLat = toRad(event.latitude - loc.lat);
    const dLon = toRad(event.longitude - loc.lon);
    const lat1 = toRad(loc.lat);
    const lat2 = toRad(event.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // -------------------- Helper: Notifications --------------------

  _getOrCreateNotificationSettings() {
    let settings = this._getFromStorage('notification_settings', null);
    if (!settings) {
      settings = {
        id: this._generateId('notif'),
        emailForSubscribedTopics: true,
        emailForDirectMessages: true,
        emailForEventReminders: true,
        updatedAt: this._now()
      };
      this._saveToStorage('notification_settings', settings);
    }
    return settings;
  }

  // -------------------- Helper: Messaging --------------------

  _startOrGetMessageThreadWithManager(managerProfileId, subject) {
    const managerProfiles = this._getFromStorage('tree_manager_profiles', []);
    const threads = this._getFromStorage('message_threads', []);
    const manager = managerProfiles.find(m => m.id === managerProfileId);
    const participantName = manager ? manager.name : 'Unknown';

    let thread = threads.find(t => t.managerProfileId === managerProfileId && t.subject === subject);
    if (!thread) {
      const now = this._now();
      thread = {
        id: this._generateId('thread'),
        subject,
        participantName,
        managerProfileId,
        unread: false,
        createdAt: now,
        updatedAt: now
      };
      threads.push(thread);
      this._saveToStorage('message_threads', threads);
    }
    return thread;
  }

  // -------------------- Interface: registerAccount --------------------

  registerAccount(fullName, email, password) {
    const now = this._now();
    const profile = {
      fullName,
      email,
      createdAt: now
    };
    this._saveToStorage('account_profile', profile);

    // Also keep a simple users list for potential multi-user scenarios
    const users = this._getFromStorage('users', []);
    let existing = users.find(u => u.email === email);
    if (!existing) {
      existing = {
        id: this._generateId('user'),
        fullName,
        email,
        password,
        createdAt: now
      };
      users.push(existing);
      this._saveToStorage('users', users);
    } else {
      existing.fullName = fullName;
      existing.password = password;
      this._saveToStorage('users', users);
    }

    return {
      success: true,
      message: 'Account registered',
      profile
    };
  }

  // -------------------- Interface: getHomeOverview --------------------

  getHomeOverview() {
    const trees = this._getFromStorage('family_trees', []);
    const people = this._getFromStorage('tree_people', []);
    const events = this._getFromStorage('events', []);

    const primaryTree = trees.find(t => t.isPrimary === true) || null;
    const hasPrimaryTree = !!primaryTree;
    let rootPerson = null;

    if (primaryTree) {
      rootPerson = people.find(p => p.treeId === primaryTree.id && p.isRootPerson === true) || null;
      if (rootPerson) {
        rootPerson = { ...rootPerson, tree: primaryTree };
      }
    }

    const now = new Date();
    const upcomingEvents = events
      .filter(e => new Date(e.startDateTime).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
      .slice(0, 5);

    const primaryCallToAction = hasPrimaryTree && rootPerson
      ? 'Continue exploring your family tree'
      : 'Start your family tree';

    const quickLinks = [
      { sectionKey: 'my_tree', label: 'My Tree' },
      { sectionKey: 'search_records', label: 'Search Records' },
      { sectionKey: 'events', label: 'Events' }
    ];

    const importantShortcuts = [
      { key: 'membership', label: 'Membership & Billing' },
      { key: 'research', label: 'Research To-Do' },
      { key: 'community', label: 'Community Forum' }
    ];

    return {
      primaryCallToAction,
      hasPrimaryTree,
      primaryTree: primaryTree || null,
      rootPerson,
      upcomingEvents,
      quickLinks,
      importantShortcuts
    };
  }

  // -------------------- Interface: getAccountDashboard --------------------

  getAccountDashboard() {
    const plans = this._getFromStorage('membership_plans', []);
    const subscription = this._getCurrentSubscription();

    let currentPlan = null;
    let subscriptionEnriched = null;
    if (subscription) {
      currentPlan = plans.find(p => p.id === subscription.membershipPlanId) || null;
      subscriptionEnriched = {
        ...subscription,
        membershipPlan: currentPlan
      };
    }

    const paymentMethods = this._getFromStorage('payment_methods', []);

    const activePlans = plans.filter(p => p.isActive === true);
    const canUpgrade = activePlans.length > 0;

    // Choose recommended plan: highlighted active plan, else cheapest active annual
    let recommendedPlan = null;
    const highlighted = activePlans.filter(p => p.isHighlighted === true);
    if (highlighted.length) {
      // Take cheapest among highlighted
      highlighted.sort((a, b) => a.price - b.price);
      recommendedPlan = highlighted[0];
    } else {
      const annual = activePlans.filter(p => p.billingPeriod === 'annual');
      if (annual.length) {
        annual.sort((a, b) => a.price - b.price);
        recommendedPlan = annual[0];
      } else if (activePlans.length) {
        activePlans.sort((a, b) => a.price - b.price);
        recommendedPlan = activePlans[0];
      }
    }

    return {
      currentPlan,
      subscription: subscriptionEnriched,
      paymentMethods,
      canUpgrade,
      recommendedPlan
    };
  }

  // -------------------- Interface: getMembershipPlans --------------------

  getMembershipPlans(billingPeriod, minTreeLimit, includeInactive) {
    const plans = this._getFromStorage('membership_plans', []);
    return plans.filter(p => {
      if (!includeInactive && p.isActive === false) return false;
      if (billingPeriod && p.billingPeriod !== billingPeriod) return false;
      if (typeof minTreeLimit === 'number' && p.treeLimit < minTreeLimit) return false;
      return true;
    });
  }

  // -------------------- Interface: getMembershipPlanComparison --------------------

  getMembershipPlanComparison(planIds) {
    const plans = this._getFromStorage('membership_plans', []);
    const selected = plans.filter(p => planIds.includes(p.id));

    // Instrumentation for task completion tracking (task_3)
    try {
      if (!localStorage.getItem('task3_comparedPlanIds') && Array.isArray(planIds) && planIds.length > 0) {
        const qualifying = plans
          .filter(p => p.isActive === true && p.billingPeriod === 'annual' && p.treeLimit >= 5)
          .map(p => p.id);
        if (qualifying.length > 0) {
          const allIdsInQualifying = planIds.every(id => qualifying.includes(id));
          const allQualifyingInIds = qualifying.every(id => planIds.includes(id));
          if (allIdsInQualifying && allQualifyingInIds) {
            localStorage.setItem('task3_comparedPlanIds', JSON.stringify(planIds));
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error (task_3):', e);
    }

    const featureMatrix = [
      { featureKey: 'tree_limit', label: 'Number of Trees' },
      { featureKey: 'billing_period', label: 'Billing Period' },
      { featureKey: 'price', label: 'Price' },
      { featureKey: 'currency', label: 'Currency' }
    ];

    return {
      plans: selected,
      featureMatrix
    };
  }

  // -------------------- Interface: upgradeMembership --------------------

  upgradeMembership(membershipPlanId, billingFrequency, card, autoRenew = true) {
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find(p => p.id === membershipPlanId && p.isActive === true);
    if (!plan) {
      return {
        success: false,
        message: 'Membership plan not found or inactive',
        subscription: null,
        paymentTransaction: null
      };
    }

    const paymentMethodId = this._createOrUpdatePaymentMethodFromCardInput(card);
    const paymentTransactions = this._getFromStorage('payment_transactions', []);

    const now = this._now();

    const paymentTransaction = {
      id: this._generateId('paytx'),
      membershipPlanId: plan.id,
      paymentMethodId,
      amount: plan.price,
      currency: plan.currency,
      status: 'succeeded',
      description: 'Membership upgrade',
      createdAt: now
    };

    paymentTransactions.push(paymentTransaction);
    this._saveToStorage('payment_transactions', paymentTransactions);

    const subs = this._getFromStorage('subscriptions', []);
    const currentSub = this._getCurrentSubscription();
    if (currentSub) {
      const idx = subs.findIndex(s => s.id === currentSub.id);
      if (idx !== -1) {
        subs[idx] = {
          ...subs[idx],
          status: 'expired'
        };
      }
    }

    const startedAt = now;
    const expiresAt = billingFrequency === 'annual'
      ? this._addMonths(startedAt, 12)
      : this._addMonths(startedAt, 1);

    const newSub = {
      id: this._generateId('sub'),
      membershipPlanId: plan.id,
      status: 'active',
      billingFrequency,
      startedAt,
      renewedAt: startedAt,
      expiresAt,
      autoRenew: !!autoRenew
    };

    subs.push(newSub);
    this._saveToStorage('subscriptions', subs);

    const subscriptionEnriched = {
      ...newSub,
      membershipPlan: plan
    };

    return {
      success: true,
      message: 'Membership upgraded',
      subscription: subscriptionEnriched,
      paymentTransaction
    };
  }

  // -------------------- Interface: getMyTreeOverview --------------------

  getMyTreeOverview() {
    const trees = this._getFromStorage('family_trees', []);
    const people = this._getFromStorage('tree_people', []);
    const tree = trees.find(t => t.isPrimary === true) || null;
    const hasPrimaryTree = !!tree;

    let rootPerson = null;
    if (tree) {
      const rp = people.find(p => p.treeId === tree.id && p.isRootPerson === true) || null;
      if (rp) {
        rootPerson = { ...rp, tree };
      }
    }

    return {
      hasPrimaryTree,
      tree,
      hasRootPerson: !!rootPerson,
      rootPerson
    };
  }

  // -------------------- Interface: createOrUpdateRootPerson --------------------

  createOrUpdateRootPerson(firstName, lastName, birthYear, birthDate, birthPlace, gender, isLiving) {
    const tree = this._getOrCreatePrimaryTree();
    const people = this._getFromStorage('tree_people', []);

    let rootPerson = people.find(p => p.treeId === tree.id && p.isRootPerson === true) || null;
    if (!rootPerson) {
      rootPerson = {
        id: this._generateId('person'),
        treeId: tree.id,
        firstName,
        middleName: '',
        lastName,
        suffix: '',
        birthYear,
        birthDate: this._toIsoDate(birthDate),
        birthPlace: birthPlace || '',
        deathYear: undefined,
        deathDate: undefined,
        deathPlace: '',
        gender: gender || 'unknown',
        isLiving: typeof isLiving === 'boolean' ? isLiving : true,
        isRootPerson: true,
        notes: ''
      };
      people.push(rootPerson);
    } else {
      rootPerson.firstName = firstName;
      rootPerson.lastName = lastName;
      rootPerson.birthYear = birthYear;
      rootPerson.birthDate = this._toIsoDate(birthDate);
      rootPerson.birthPlace = birthPlace || rootPerson.birthPlace || '';
      if (gender) rootPerson.gender = gender;
      if (typeof isLiving === 'boolean') rootPerson.isLiving = isLiving;
    }

    tree.surnameFocus = lastName;
    tree.updatedAt = this._now();

    this._saveToStorage('tree_people', people);
    const trees = this._getFromStorage('family_trees', []);
    const idx = trees.findIndex(t => t.id === tree.id);
    if (idx !== -1) {
      trees[idx] = tree;
      this._saveToStorage('family_trees', trees);
    }

    this._recalculateTreePersonCount(tree.id);

    return {
      tree,
      rootPerson
    };
  }

  // -------------------- Interface: getTreeGenerationalView --------------------

  getTreeGenerationalView(treeId, rootPersonId, generationDepth) {
    const depth = typeof generationDepth === 'number' ? generationDepth : 3;
    const trees = this._getFromStorage('family_trees', []);
    const allPeople = this._getFromStorage('tree_people', []);
    const allRelationships = this._getFromStorage('person_relationships', []);

    let tree = null;
    if (treeId) {
      tree = trees.find(t => t.id === treeId) || null;
    } else {
      tree = trees.find(t => t.isPrimary === true) || null;
    }

    if (!tree) {
      return {
        tree: null,
        rootPerson: null,
        people: [],
        relationships: []
      };
    }

    let rootPerson = null;
    if (rootPersonId) {
      rootPerson = allPeople.find(p => p.id === rootPersonId && p.treeId === tree.id) || null;
    } else {
      rootPerson = allPeople.find(p => p.treeId === tree.id && p.isRootPerson === true) || null;
    }

    if (!rootPerson) {
      return {
        tree,
        rootPerson: null,
        people: [],
        relationships: []
      };
    }

    const peopleById = new Map();
    allPeople
      .filter(p => p.treeId === tree.id)
      .forEach(p => peopleById.set(p.id, p));

    const relsForTree = allRelationships.filter(r => r.treeId === tree.id);

    // BFS up to generationDepth
    const visited = new Set();
    let frontier = [rootPerson.id];
    visited.add(rootPerson.id);

    for (let level = 0; level < depth - 1; level++) {
      const next = [];
      for (const pid of frontier) {
        const rels = relsForTree.filter(r => r.fromPersonId === pid);
        for (const r of rels) {
          const otherId = r.toPersonId;
          if (!visited.has(otherId)) {
            visited.add(otherId);
            next.push(otherId);
          }
        }
      }
      if (!next.length) break;
      frontier = next;
    }

    const people = Array.from(visited)
      .map(id => ({ ...peopleById.get(id), tree }))
      .filter(p => !!p.id);

    const relationships = relsForTree
      .filter(r => visited.has(r.fromPersonId) && visited.has(r.toPersonId))
      .map(r => {
        const fromPerson = peopleById.get(r.fromPersonId) || null;
        const toPerson = peopleById.get(r.toPersonId) || null;
        return {
          ...r,
          tree,
          fromPerson,
          toPerson
        };
      });

    const rootPersonEnriched = { ...rootPerson, tree };

    return {
      tree,
      rootPerson: rootPersonEnriched,
      people,
      relationships
    };
  }

  // -------------------- Interface: addTreePersonWithRelationship --------------------

  addTreePersonWithRelationship(
    treeId,
    firstName,
    lastName,
    birthYear,
    birthDate,
    birthPlace,
    deathYear,
    deathDate,
    deathPlace,
    gender,
    relationshipContext
  ) {
    let tree = null;
    if (treeId) {
      const trees = this._getFromStorage('family_trees', []);
      tree = trees.find(t => t.id === treeId) || null;
    } else {
      tree = this._getOrCreatePrimaryTree();
    }

    if (!tree) {
      throw new Error('Tree not found');
    }

    const people = this._getFromStorage('tree_people', []);

    const person = {
      id: this._generateId('person'),
      treeId: tree.id,
      firstName,
      middleName: '',
      lastName,
      suffix: '',
      birthYear,
      birthDate: this._toIsoDate(birthDate),
      birthPlace: birthPlace || '',
      deathYear: typeof deathYear === 'number' ? deathYear : undefined,
      deathDate: this._toIsoDate(deathDate),
      deathPlace: deathPlace || '',
      gender: gender || 'unknown',
      isLiving: typeof deathYear === 'number' || deathDate ? false : true,
      isRootPerson: false,
      notes: ''
    };

    people.push(person);
    this._saveToStorage('tree_people', people);

    let relationships = [];
    if (relationshipContext && relationshipContext.targetPersonId && relationshipContext.relationshipType) {
      relationships = this._createPersonRelationshipPair(
        tree.id,
        relationshipContext.relationshipType,
        person.id,
        relationshipContext.targetPersonId,
        relationshipContext.isBiological
      );
    }

    this._recalculateTreePersonCount(tree.id);

    return {
      person,
      relationships
    };
  }

  // -------------------- Interface: updateTreePerson --------------------

  updateTreePerson(
    personId,
    firstName,
    lastName,
    birthYear,
    birthDate,
    birthPlace,
    deathYear,
    deathDate,
    deathPlace,
    gender,
    isLiving,
    notes
  ) {
    const people = this._getFromStorage('tree_people', []);
    const idx = people.findIndex(p => p.id === personId);
    if (idx === -1) return null;

    const person = { ...people[idx] };

    if (firstName !== undefined) person.firstName = firstName;
    if (lastName !== undefined) person.lastName = lastName;
    if (birthYear !== undefined) person.birthYear = birthYear;
    if (birthDate !== undefined) person.birthDate = this._toIsoDate(birthDate);
    if (birthPlace !== undefined) person.birthPlace = birthPlace;
    if (deathYear !== undefined) person.deathYear = deathYear;
    if (deathDate !== undefined) person.deathDate = this._toIsoDate(deathDate);
    if (deathPlace !== undefined) person.deathPlace = deathPlace;
    if (gender !== undefined) person.gender = gender;
    if (isLiving !== undefined) person.isLiving = isLiving;
    if (notes !== undefined) person.notes = notes;

    people[idx] = person;
    this._saveToStorage('tree_people', people);

    return person;
  }

  // -------------------- Interface: removeTreePerson --------------------

  removeTreePerson(personId, removeRelationships) {
    const people = this._getFromStorage('tree_people', []);
    const idx = people.findIndex(p => p.id === personId);
    if (idx === -1) {
      return { success: false, message: 'Person not found' };
    }

    const person = people[idx];
    const treeId = person.treeId;

    people.splice(idx, 1);
    this._saveToStorage('tree_people', people);

    if (removeRelationships === undefined || removeRelationships === true) {
      const relationships = this._getFromStorage('person_relationships', []);
      const filtered = relationships.filter(r => r.fromPersonId !== personId && r.toPersonId !== personId);
      this._saveToStorage('person_relationships', filtered);

      const attachments = this._getFromStorage('record_attachments', []);
      const filteredAtt = attachments.filter(a => a.treePersonId !== personId);
      this._saveToStorage('record_attachments', filteredAtt);
    }

    if (treeId) this._recalculateTreePersonCount(treeId);

    return { success: true, message: 'Person removed' };
  }

  // -------------------- Interface: getTreePersonDetails --------------------

  getTreePersonDetails(personId) {
    const people = this._getFromStorage('tree_people', []);
    const relationships = this._getFromStorage('person_relationships', []);
    const attachments = this._getFromStorage('record_attachments', []);
    const records = this._getFromStorage('historical_records', []);

    const person = people.find(p => p.id === personId) || null;
    if (!person) {
      return {
        person: null,
        parents: [],
        spouses: [],
        children: [],
        recordAttachments: []
      };
    }

    const parentRels = relationships.filter(r => r.relationshipType === 'parent' && r.toPersonId === personId);
    const parents = parentRels
      .map(r => people.find(p => p.id === r.fromPersonId))
      .filter(p => !!p);

    const childRels = relationships.filter(r => r.relationshipType === 'parent' && r.fromPersonId === personId);
    const children = childRels
      .map(r => people.find(p => p.id === r.toPersonId))
      .filter(p => !!p);

    const spouseRels = relationships.filter(r => r.relationshipType === 'spouse' && (r.fromPersonId === personId || r.toPersonId === personId));
    const spouseIds = new Set();
    spouseRels.forEach(r => {
      const otherId = r.fromPersonId === personId ? r.toPersonId : r.fromPersonId;
      spouseIds.add(otherId);
    });
    const spouses = people.filter(p => spouseIds.has(p.id));

    const myAttachments = attachments.filter(a => a.treePersonId === personId);
    const recordAttachments = myAttachments.map(a => {
      const record = records.find(r => r.id === a.recordId) || null;
      const enrichedAttachment = {
        ...a,
        record,
        treePerson: person
      };
      return {
        attachment: enrichedAttachment,
        record
      };
    });

    return {
      person,
      parents,
      spouses,
      children,
      recordAttachments
    };
  }

  // -------------------- Interface: searchHistoricalRecords --------------------

  searchHistoricalRecords(firstName, lastName, birthYearMin, birthYearMax, birthplace, country, sortOption, page, pageSize) {
    const records = this._getFromStorage('historical_records', []);
    const bookmarks = this._getFromStorage('bookmarks', []);
    const attachments = this._getFromStorage('record_attachments', []);

    const fn = firstName ? String(firstName).toLowerCase() : null;
    const ln = lastName ? String(lastName).toLowerCase() : null;
    const bp = birthplace ? String(birthplace).toLowerCase() : null;
    const ctry = country ? String(country).toLowerCase() : null;

    const minYear = typeof birthYearMin === 'number' ? birthYearMin : null;
    const maxYear = typeof birthYearMax === 'number' ? birthYearMax : null;

    let filtered = records.filter(rec => {
      if (fn && (!rec.firstName || String(rec.firstName).toLowerCase() !== fn)) return false;
      if (ln && (!rec.lastName || String(rec.lastName).toLowerCase() !== ln)) return false;

      if (bp) {
        const place = rec.birthPlace ? String(rec.birthPlace).toLowerCase() : '';
        if (!place.includes(bp)) return false;
      }

      if (ctry) {
        const rc = rec.birthCountry ? String(rec.birthCountry).toLowerCase() : '';
        if (!rc.includes(ctry)) return false;
      }

      if (minYear !== null || maxYear !== null) {
        const rMin = rec.birthYearMin != null ? rec.birthYearMin : rec.birthYear != null ? rec.birthYear : null;
        const rMax = rec.birthYearMax != null ? rec.birthYearMax : rec.birthYear != null ? rec.birthYear : null;
        if (rMin == null && rMax == null) return false;
        const from = rMin != null ? rMin : rMax;
        const to = rMax != null ? rMax : rMin;
        if (minYear != null && to < minYear) return false;
        if (maxYear != null && from > maxYear) return false;
      }

      return true;
    });

    const sort = sortOption || 'relevance';
    if (sort === 'birth_year_oldest_first' || sort === 'birth_year_newest_first') {
      filtered.sort((a, b) => {
        const ay = a.birthYear != null ? a.birthYear : (a.birthYearMin != null ? a.birthYearMin : 9999);
        const by = b.birthYear != null ? b.birthYear : (b.birthYearMin != null ? b.birthYearMin : 9999);
        return ay - by;
      });
      if (sort === 'birth_year_newest_first') filtered.reverse();
    }

    const total = filtered.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIdx = (pg - 1) * ps;
    const pageItems = filtered.slice(startIdx, startIdx + ps);

    const results = pageItems.map(record => {
      const isBookmarked = bookmarks.some(b => b.recordId === record.id);
      const isAttachedToTree = attachments.some(a => a.recordId === record.id);
      return {
        record,
        isBookmarked,
        isAttachedToTree
      };
    });

    // Instrumentation for task completion tracking (task_2)
    try {
      if (!localStorage.getItem('task2_mariaSearchParams')) {
        const fnArg = firstName != null ? String(firstName).toLowerCase() : '';
        const bpArg = birthplace != null ? String(birthplace).toLowerCase() : '';
        const countryArg = country != null ? String(country).toLowerCase() : '';
        const mexicoInArgs = (bpArg && bpArg.includes('mexico')) || (countryArg && countryArg.includes('mexico'));
        if (
          fnArg === 'maria' &&
          birthYearMin === 1900 &&
          birthYearMax === 1930 &&
          mexicoInArgs
        ) {
          const payload = {
            firstName,
            lastName,
            birthYearMin,
            birthYearMax,
            birthplace,
            country,
            sortOption
          };
          localStorage.setItem('task2_mariaSearchParams', JSON.stringify(payload));
        }
      }
    } catch (e) {
      console.error('Instrumentation error (task_2):', e);
    }

    return {
      results,
      total,
      page: pg,
      pageSize: ps,
      appliedFilters: {
        firstName: firstName || null,
        lastName: lastName || null,
        birthYearMin: minYear,
        birthYearMax: maxYear,
        birthplace: birthplace || null,
        country: country || null,
        sortOption: sort
      }
    };
  }

  // -------------------- Interface: getRecordSearchFilterOptions --------------------

  getRecordSearchFilterOptions() {
    const records = this._getFromStorage('historical_records', []);

    const countriesSet = new Set();
    const birthplacesSet = new Set();
    let minYear = null;
    let maxYear = null;

    records.forEach(r => {
      if (r.birthCountry) countriesSet.add(r.birthCountry);
      if (r.birthPlace) birthplacesSet.add(r.birthPlace);
      const years = [];
      if (typeof r.birthYear === 'number') years.push(r.birthYear);
      if (typeof r.birthYearMin === 'number') years.push(r.birthYearMin);
      if (typeof r.birthYearMax === 'number') years.push(r.birthYearMax);
      years.forEach(y => {
        if (minYear === null || y < minYear) minYear = y;
        if (maxYear === null || y > maxYear) maxYear = y;
      });
    });

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'birth_year_oldest_first', label: 'Birth Year (Oldest First)' },
      { value: 'birth_year_newest_first', label: 'Birth Year (Newest First)' }
    ];

    return {
      availableCountries: Array.from(countriesSet),
      birthYearRange: {
        min: minYear,
        max: maxYear
      },
      commonBirthplaces: Array.from(birthplacesSet),
      sortOptions
    };
  }

  // -------------------- Interface: saveRecordSearch --------------------

  saveRecordSearch(name, filters) {
    const saved = this._getFromStorage('saved_searches', []);
    const now = this._now();

    const item = {
      id: this._generateId('srch'),
      name,
      firstName: filters.firstName || null,
      lastName: filters.lastName || null,
      birthYearMin: typeof filters.birthYearMin === 'number' ? filters.birthYearMin : null,
      birthYearMax: typeof filters.birthYearMax === 'number' ? filters.birthYearMax : null,
      birthplace: filters.birthplace || null,
      country: filters.country || null,
      sortOption: filters.sortOption || 'relevance',
      createdAt: now,
      lastRunAt: null
    };

    saved.push(item);
    this._saveToStorage('saved_searches', saved);

    return item;
  }

  // -------------------- Interface: getSavedSearches --------------------

  getSavedSearches() {
    return this._getFromStorage('saved_searches', []);
  }

  // -------------------- Interface: getHistoricalRecordDetails --------------------

  getHistoricalRecordDetails(recordId) {
    const records = this._getFromStorage('historical_records', []);
    const bookmarks = this._getFromStorage('bookmarks', []);
    const attachments = this._getFromStorage('record_attachments', []);
    const people = this._getFromStorage('tree_people', []);

    const record = records.find(r => r.id === recordId) || null;
    const isBookmarked = bookmarks.some(b => b.recordId === recordId);

    const existingAttachmentsRaw = attachments.filter(a => a.recordId === recordId);
    const existingAttachments = existingAttachmentsRaw.map(a => {
      const person = people.find(p => p.id === a.treePersonId) || null;
      const enrichedAttachment = {
        ...a,
        record,
        treePerson: person
      };
      return {
        attachment: enrichedAttachment,
        person
      };
    });

    return {
      record,
      isBookmarked,
      existingAttachments
    };
  }

  // -------------------- Interface: attachRecordToTreePerson --------------------

  attachRecordToTreePerson(recordId, treePersonId, relationshipType, notes) {
    const attachments = this._getFromStorage('record_attachments', []);
    const people = this._getFromStorage('tree_people', []);
    const records = this._getFromStorage('historical_records', []);

    const now = this._now();

    const attachment = {
      id: this._generateId('ratt'),
      recordId,
      treePersonId,
      attachedAt: now,
      relationshipType,
      notes: notes || ''
    };

    attachments.push(attachment);
    this._saveToStorage('record_attachments', attachments);

    const linkedPerson = people.find(p => p.id === treePersonId) || null;

    return {
      attachment,
      linkedPerson
    };
  }

  // -------------------- Interface: bookmarkRecord --------------------

  bookmarkRecord(recordId, note, label) {
    const bookmarks = this._getFromStorage('bookmarks', []);
    const bookmark = {
      id: this._generateId('bkmk'),
      recordId,
      createdAt: this._now(),
      note: note || '',
      label: label || ''
    };
    bookmarks.push(bookmark);
    this._saveToStorage('bookmarks', bookmarks);
    return bookmark;
  }

  // -------------------- Interface: unbookmarkRecord --------------------

  unbookmarkRecord(bookmarkId, recordId) {
    const bookmarks = this._getFromStorage('bookmarks', []);
    let removed = false;
    let remaining;

    if (bookmarkId) {
      remaining = bookmarks.filter(b => {
        if (b.id === bookmarkId) {
          removed = true;
          return false;
        }
        return true;
      });
    } else if (recordId) {
      let removedOnce = false;
      remaining = bookmarks.filter(b => {
        if (!removedOnce && b.recordId === recordId) {
          removed = true;
          removedOnce = true;
          return false;
        }
        return true;
      });
    } else {
      return { success: false, message: 'No identifier provided' };
    }

    if (removed) {
      this._saveToStorage('bookmarks', remaining);
      return { success: true, message: 'Bookmark removed' };
    }
    return { success: false, message: 'Bookmark not found' };
  }

  // -------------------- Interface: searchEvents --------------------

  searchEvents(location, radiusMiles, startDate, endDate, sortBy, page, pageSize) {
    const events = this._getFromStorage('events', []);
    const registrations = this._getFromStorage('event_registrations', []);

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const radius = typeof radiusMiles === 'number' ? radiusMiles : null;
    const sort = sortBy || 'date_soonest_first';

    let filtered = events.filter(ev => {
      const evDate = new Date(ev.startDateTime);
      if (start && evDate.getTime() < start.getTime()) return false;
      if (end && evDate.getTime() > end.getTime()) return false;
      if (location && radius !== null) {
        const dist = this._calculateEventDistanceMiles(ev, location);
        if (dist !== null && dist > radius) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      const da = new Date(a.startDateTime).getTime();
      const db = new Date(b.startDateTime).getTime();
      if (sort === 'date_latest_first') return db - da;
      return da - db;
    });

    const total = filtered.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIdx = (pg - 1) * ps;
    const pageItems = filtered.slice(startIdx, startIdx + ps);

    const results = pageItems.map(ev => {
      const dist = location ? this._calculateEventDistanceMiles(ev, location) : null;
      const isRegistered = registrations.some(r => r.eventId === ev.id && r.registrationStatus === 'registered');
      return {
        event: ev,
        distanceMiles: dist,
        isRegistered
      };
    });

    // Instrumentation for task completion tracking (task_4)
    try {
      if (!localStorage.getItem('task4_eventSearchParams')) {
        let startMatches = false;
        if (start instanceof Date && !isNaN(start.getTime())) {
          const y = start.getUTCFullYear();
          const m = start.getUTCMonth() + 1;
          const d = start.getUTCDate();
          if (y === 2025 && m === 8 && d === 16) {
            startMatches = true;
          }
        }
        if (
          location === 'Chicago, IL' &&
          radiusMiles === 200 &&
          startMatches &&
          sortBy === 'date_soonest_first'
        ) {
          const payload = { location, radiusMiles, startDate, endDate, sortBy };
          localStorage.setItem('task4_eventSearchParams', JSON.stringify(payload));
        }
      }
    } catch (e) {
      console.error('Instrumentation error (task_4):', e);
    }

    return {
      results,
      total,
      page: pg,
      pageSize: ps,
      appliedFilters: {
        location: location || null,
        radiusMiles: radius,
        startDate: startDate || null,
        endDate: endDate || null,
        sortBy: sort
      }
    };
  }

  // -------------------- Interface: getEventFilterOptions --------------------

  getEventFilterOptions() {
    const distanceOptions = [
      { value: 10, label: 'Within 10 miles' },
      { value: 25, label: 'Within 25 miles' },
      { value: 50, label: 'Within 50 miles' },
      { value: 100, label: 'Within 100 miles' },
      { value: 200, label: 'Within 200 miles' }
    ];

    const sortOptions = [
      { value: 'date_soonest_first', label: 'Date (Soonest First)' },
      { value: 'date_latest_first', label: 'Date (Latest First)' }
    ];

    return {
      distanceOptions,
      sortOptions
    };
  }

  // -------------------- Interface: getEventDetails --------------------

  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const registrations = this._getFromStorage('event_registrations', []);

    const event = events.find(e => e.id === eventId) || null;
    const registrationRaw = registrations.find(r => r.eventId === eventId) || null;
    const isRegistered = !!registrationRaw && registrationRaw.registrationStatus === 'registered';

    const registration = registrationRaw
      ? { ...registrationRaw, event }
      : null;

    return {
      event,
      isRegistered,
      registration
    };
  }

  // -------------------- Interface: registerForEvent --------------------

  registerForEvent(eventId, attendeeName, attendeeCount) {
    const registrations = this._getFromStorage('event_registrations', []);
    const now = this._now();

    const existingIdx = registrations.findIndex(r => r.eventId === eventId);
    let registration;
    if (existingIdx !== -1) {
      registration = {
        ...registrations[existingIdx],
        attendeeName,
        attendeeCount,
        registrationStatus: 'registered',
        registeredAt: now
      };
      registrations[existingIdx] = registration;
    } else {
      registration = {
        id: this._generateId('ereg'),
        eventId,
        attendeeName,
        attendeeCount,
        registrationStatus: 'registered',
        registeredAt: now
      };
      registrations.push(registration);
    }

    this._saveToStorage('event_registrations', registrations);

    return {
      registration,
      message: 'Registered for event'
    };
  }

  // -------------------- Interface: getMyEventRegistrations --------------------

  getMyEventRegistrations() {
    const registrations = this._getFromStorage('event_registrations', []);
    const events = this._getFromStorage('events', []);

    return registrations.map(r => {
      const event = events.find(e => e.id === r.eventId) || null;
      const registration = { ...r, event };
      return {
        registration,
        event
      };
    });
  }

  // -------------------- Interface: searchBranchGroups --------------------

  searchBranchGroups(query, minMemberCount, sortBy, page, pageSize) {
    const branches = this._getFromStorage('branch_groups', []);
    const memberships = this._getFromStorage('branch_memberships', []);

    const q = query ? String(query).toLowerCase() : null;
    const minMembers = typeof minMemberCount === 'number' ? minMemberCount : 0;
    const sort = sortBy || 'most_members';

    let filtered = branches.filter(b => {
      if (q && !String(b.name).toLowerCase().includes(q)) return false;
      if (b.memberCount < minMembers) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (sort === 'name_az') {
        return String(a.name).localeCompare(String(b.name));
      }
      if (sort === 'recently_created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // most_members
      return b.memberCount - a.memberCount;
    });

    const total = filtered.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIdx = (pg - 1) * ps;
    const pageItems = filtered.slice(startIdx, startIdx + ps);

    const results = pageItems.map(branch => {
      const isMember = memberships.some(m => m.branchGroupId === branch.id && m.isActive === true);
      return {
        branch,
        isMember
      };
    });

    return {
      results,
      total,
      page: pg,
      pageSize: ps
    };
  }

  // -------------------- Interface: getBranchFilterOptions --------------------

  getBranchFilterOptions() {
    const memberCountOptions = [
      { label: 'Any size', minMembers: 0 },
      { label: '10+ members', minMembers: 10 },
      { label: '50+ members', minMembers: 50 },
      { label: '100+ members', minMembers: 100 }
    ];

    const sortOptions = [
      { value: 'most_members', label: 'Most Members' },
      { value: 'name_az', label: 'Name (A-Z)' },
      { value: 'recently_created', label: 'Recently Created' }
    ];

    return {
      memberCountOptions,
      sortOptions
    };
  }

  // -------------------- Interface: getBranchDetails --------------------

  getBranchDetails(branchGroupId) {
    const branches = this._getFromStorage('branch_groups', []);
    const memberships = this._getFromStorage('branch_memberships', []);

    const branch = branches.find(b => b.id === branchGroupId) || null;
    const membershipRaw = memberships.find(m => m.branchGroupId === branchGroupId && m.isActive === true) || null;
    const membership = membershipRaw ? { ...membershipRaw, branch } : null;

    return {
      branch,
      membership
    };
  }

  // -------------------- Interface: joinBranchGroup --------------------

  joinBranchGroup(branchGroupId, role) {
    const memberships = this._getFromStorage('branch_memberships', []);

    const existingIdx = memberships.findIndex(m => m.branchGroupId === branchGroupId);
    const now = this._now();

    if (existingIdx !== -1) {
      const updated = {
        ...memberships[existingIdx],
        role,
        isActive: true,
        joinedAt: now
      };
      memberships[existingIdx] = updated;
      this._saveToStorage('branch_memberships', memberships);
      return updated;
    }

    const membership = {
      id: this._generateId('bmem'),
      branchGroupId,
      role,
      joinedAt: now,
      isActive: true
    };

    memberships.push(membership);
    this._saveToStorage('branch_memberships', memberships);

    return membership;
  }

  // -------------------- Interface: leaveBranchGroup --------------------

  leaveBranchGroup(branchGroupId) {
    const memberships = this._getFromStorage('branch_memberships', []);
    const idx = memberships.findIndex(m => m.branchGroupId === branchGroupId && m.isActive === true);
    if (idx === -1) {
      return { success: false, message: 'Membership not found' };
    }

    memberships[idx].isActive = false;
    this._saveToStorage('branch_memberships', memberships);

    return { success: true, message: 'Left branch group' };
  }

  // -------------------- Interface: getMyBranches --------------------

  getMyBranches() {
    const memberships = this._getFromStorage('branch_memberships', []);
    const branches = this._getFromStorage('branch_groups', []);

    const active = memberships.filter(m => m.isActive === true);
    return active.map(m => {
      const branch = branches.find(b => b.id === m.branchGroupId) || null;
      const membership = { ...m, branch };
      return { branch, membership };
    });
  }

  // -------------------- Interface: getForumCategories --------------------

  getForumCategories() {
    return this._getFromStorage('forum_categories', []);
  }

  // -------------------- Interface: getForumTopicsForCategory --------------------

  getForumTopicsForCategory(categorySlug, page, pageSize) {
    const categories = this._getFromStorage('forum_categories', []);
    const topics = this._getFromStorage('forum_topics', []);

    const category = categories.find(c => c.slug === categorySlug) || null;
    if (!category) {
      return {
        category: null,
        topics: [],
        total: 0,
        page: page || 1,
        pageSize: pageSize || 20
      };
    }

    const catTopics = topics.filter(t => t.categoryId === category.id);
    catTopics.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = catTopics.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIdx = (pg - 1) * ps;
    const pageItems = catTopics.slice(startIdx, startIdx + ps).map(t => ({ ...t, category }));

    return {
      category,
      topics: pageItems,
      total,
      page: pg,
      pageSize: ps
    };
  }

  // -------------------- Interface: createForumTopic --------------------

  createForumTopic(categoryId, title, body) {
    const topics = this._getFromStorage('forum_topics', []);
    const posts = this._getFromStorage('forum_posts', []);

    const now = this._now();

    const topic = {
      id: this._generateId('ftopic'),
      categoryId,
      title,
      body,
      replyCount: 0,
      isLocked: false,
      isPinned: false,
      createdAt: now,
      updatedAt: null
    };

    topics.push(topic);
    this._saveToStorage('forum_topics', topics);

    const firstPost = {
      id: this._generateId('fpost'),
      topicId: topic.id,
      body,
      isOriginalPost: true,
      createdAt: now,
      updatedAt: null
    };

    posts.push(firstPost);
    this._saveToStorage('forum_posts', posts);

    return {
      topic,
      firstPost
    };
  }

  // -------------------- Interface: getForumTopicDetails --------------------

  getForumTopicDetails(topicId) {
    const topics = this._getFromStorage('forum_topics', []);
    const posts = this._getFromStorage('forum_posts', []);
    const subscriptions = this._getFromStorage('topic_subscriptions', []);
    const categories = this._getFromStorage('forum_categories', []);

    let topic = topics.find(t => t.id === topicId) || null;
    if (!topic) {
      return {
        topic: null,
        posts: [],
        subscription: null
      };
    }

    const category = categories.find(c => c.id === topic.categoryId) || null;
    topic = { ...topic, category };

    const topicPosts = posts
      .filter(p => p.topicId === topicId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(p => ({ ...p, topic }));

    const subscriptionRaw = subscriptions.find(s => s.topicId === topicId) || null;
    const subscription = subscriptionRaw ? { ...subscriptionRaw, topic } : null;

    return {
      topic,
      posts: topicPosts,
      subscription
    };
  }

  // -------------------- Interface: replyToForumTopic --------------------

  replyToForumTopic(topicId, body) {
    const topics = this._getFromStorage('forum_topics', []);
    const posts = this._getFromStorage('forum_posts', []);

    const topicIdx = topics.findIndex(t => t.id === topicId);
    if (topicIdx === -1) return null;

    const now = this._now();

    const post = {
      id: this._generateId('fpost'),
      topicId,
      body,
      isOriginalPost: false,
      createdAt: now,
      updatedAt: null
    };

    posts.push(post);
    this._saveToStorage('forum_posts', posts);

    const topic = { ...topics[topicIdx] };
    topic.replyCount = (topic.replyCount || 0) + 1;
    topic.updatedAt = now;
    topics[topicIdx] = topic;
    this._saveToStorage('forum_topics', topics);

    return post;
  }

  // -------------------- Interface: subscribeToForumTopic --------------------

  subscribeToForumTopic(topicId, notificationLevel) {
    const subscriptions = this._getFromStorage('topic_subscriptions', []);
    const now = this._now();

    const idx = subscriptions.findIndex(s => s.topicId === topicId);
    if (idx !== -1) {
      const updated = {
        ...subscriptions[idx],
        notificationLevel,
        subscribedAt: now
      };
      subscriptions[idx] = updated;
      this._saveToStorage('topic_subscriptions', subscriptions);
      return updated;
    }

    const sub = {
      id: this._generateId('tsub'),
      topicId,
      notificationLevel,
      subscribedAt: now
    };

    subscriptions.push(sub);
    this._saveToStorage('topic_subscriptions', subscriptions);

    return sub;
  }

  // -------------------- Interface: getNotificationSettings --------------------

  getNotificationSettings() {
    return this._getOrCreateNotificationSettings();
  }

  // -------------------- Interface: updateNotificationSettings --------------------

  updateNotificationSettings(emailForSubscribedTopics, emailForDirectMessages, emailForEventReminders) {
    let settings = this._getOrCreateNotificationSettings();

    if (typeof emailForSubscribedTopics === 'boolean') {
      settings.emailForSubscribedTopics = emailForSubscribedTopics;
    }
    if (typeof emailForDirectMessages === 'boolean') {
      settings.emailForDirectMessages = emailForDirectMessages;
    }
    if (typeof emailForEventReminders === 'boolean') {
      settings.emailForEventReminders = emailForEventReminders;
    }

    settings.updatedAt = this._now();
    this._saveToStorage('notification_settings', settings);

    return settings;
  }

  // -------------------- Interface: searchPublicTrees --------------------

  searchPublicTrees(surname, sortBy, page, pageSize) {
    const trees = this._getFromStorage('public_trees', []);
    const managers = this._getFromStorage('tree_manager_profiles', []);

    const sname = surname ? String(surname).toLowerCase() : null;
    const sort = sortBy || 'most_people';

    let filtered = trees.filter(t => {
      if (!sname) return true;
      const sf = t.surnameFocus ? String(t.surnameFocus).toLowerCase() : '';
      const name = t.name ? String(t.name).toLowerCase() : '';
      return sf === sname || name.includes(sname);
    });

    filtered.sort((a, b) => {
      if (sort === 'name_az') {
        return String(a.name).localeCompare(String(b.name));
      }
      if (sort === 'recently_added') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // most_people
      return b.personCount - a.personCount;
    });

    const total = filtered.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIdx = (pg - 1) * ps;
    const pageItems = filtered.slice(startIdx, startIdx + ps);

    const results = pageItems.map(t => {
      const managerProfile = managers.find(m => m.id === t.managerProfileId) || null;
      return { ...t, managerProfile };
    });

    return {
      results,
      total,
      page: pg,
      pageSize: ps
    };
  }

  // -------------------- Interface: getPublicTreeDetails --------------------

  getPublicTreeDetails(publicTreeId) {
    const trees = this._getFromStorage('public_trees', []);
    const managers = this._getFromStorage('tree_manager_profiles', []);

    const treeRaw = trees.find(t => t.id === publicTreeId) || null;
    if (!treeRaw) {
      return {
        tree: null,
        managerProfile: null
      };
    }

    const managerProfile = managers.find(m => m.id === treeRaw.managerProfileId) || null;
    const tree = { ...treeRaw, managerProfile };

    return {
      tree,
      managerProfile
    };
  }

  // -------------------- Interface: getTreeManagerProfileDetails --------------------

  getTreeManagerProfileDetails(managerProfileId) {
    const managers = this._getFromStorage('tree_manager_profiles', []);
    return managers.find(m => m.id === managerProfileId) || null;
  }

  // -------------------- Interface: sendMessageToTreeManager --------------------

  sendMessageToTreeManager(managerProfileId, subject, body) {
    const thread = this._startOrGetMessageThreadWithManager(managerProfileId, subject);
    const messages = this._getFromStorage('messages', []);

    const msg = {
      id: this._generateId('msg'),
      threadId: thread.id,
      body,
      direction: 'sent',
      sentAt: this._now()
    };

    messages.push(msg);
    this._saveToStorage('messages', messages);

    const threads = this._getFromStorage('message_threads', []);
    const idx = threads.findIndex(t => t.id === thread.id);
    if (idx !== -1) {
      threads[idx] = {
        ...threads[idx],
        unread: false,
        updatedAt: this._now()
      };
      this._saveToStorage('message_threads', threads);
    }

    const managers = this._getFromStorage('tree_manager_profiles', []);
    const managerProfile = managers.find(m => m.id === managerProfileId) || null;
    const enrichedThread = { ...thread, managerProfile };

    return {
      thread: enrichedThread,
      message: msg
    };
  }

  // -------------------- Interface: getMessageThreads --------------------

  getMessageThreads() {
    const threads = this._getFromStorage('message_threads', []);
    const managers = this._getFromStorage('tree_manager_profiles', []);

    return threads.map(t => {
      const managerProfile = t.managerProfileId
        ? managers.find(m => m.id === t.managerProfileId) || null
        : null;
      return { ...t, managerProfile };
    });
  }

  // -------------------- Interface: getMessageThreadMessages --------------------

  getMessageThreadMessages(threadId) {
    const threads = this._getFromStorage('message_threads', []);
    const messages = this._getFromStorage('messages', []);
    const managers = this._getFromStorage('tree_manager_profiles', []);

    const threadRaw = threads.find(t => t.id === threadId) || null;
    if (!threadRaw) {
      return {
        thread: null,
        messages: []
      };
    }

    const managerProfile = threadRaw.managerProfileId
      ? managers.find(m => m.id === threadRaw.managerProfileId) || null
      : null;
    const thread = { ...threadRaw, managerProfile };

    const threadMessages = messages
      .filter(m => m.threadId === threadId)
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
      .map(m => ({ ...m, thread }));

    return {
      thread,
      messages: threadMessages
    };
  }

  // -------------------- Interface: replyToMessageThread --------------------

  replyToMessageThread(threadId, body) {
    const threads = this._getFromStorage('message_threads', []);
    const idx = threads.findIndex(t => t.id === threadId);
    if (idx === -1) return null;

    const messages = this._getFromStorage('messages', []);
    const msg = {
      id: this._generateId('msg'),
      threadId,
      body,
      direction: 'sent',
      sentAt: this._now()
    };

    messages.push(msg);
    this._saveToStorage('messages', messages);

    threads[idx] = {
      ...threads[idx],
      unread: false,
      updatedAt: this._now()
    };
    this._saveToStorage('message_threads', threads);

    return msg;
  }

  // -------------------- Interface: getResearchLists --------------------

  getResearchLists() {
    return this._getFromStorage('research_lists', []);
  }

  // -------------------- Interface: createResearchList --------------------

  createResearchList(name, description) {
    const lists = this._getFromStorage('research_lists', []);
    const list = {
      id: this._generateId('rlist'),
      name,
      description: description || '',
      createdAt: this._now(),
      updatedAt: null
    };
    lists.push(list);
    this._saveToStorage('research_lists', lists);
    return list;
  }

  // -------------------- Interface: getResearchListDetails --------------------

  getResearchListDetails(researchListId, sortBy) {
    const lists = this._getFromStorage('research_lists', []);
    const tasks = this._getFromStorage('research_tasks', []);
    const people = this._getFromStorage('tree_people', []);

    const list = lists.find(l => l.id === researchListId) || null;
    if (!list) {
      return {
        list: null,
        tasks: []
      };
    }

    let listTasks = tasks.filter(t => t.researchListId === researchListId);

    const sort = sortBy || 'due_date_soonest_first';
    if (sort === 'due_date_latest_first' || sort === 'due_date_soonest_first') {
      listTasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      if (sort === 'due_date_latest_first') listTasks.reverse();
    } else if (sort === 'status') {
      const order = { 'not_started': 1, 'in_progress': 2, 'completed': 3 };
      listTasks.sort((a, b) => (order[a.status] || 99) - (order[b.status] || 99));
    }

    const enriched = listTasks.map(t => {
      const linkedPerson = people.find(p => p.id === t.linkedPersonId) || null;
      const task = { ...t, list, linkedPerson };
      return { task, linkedPerson };
    });

    return {
      list,
      tasks: enriched
    };
  }

  // -------------------- Interface: createResearchTask --------------------

  createResearchTask(researchListId, title, description, linkedPersonId, dueDate, status) {
    const tasks = this._getFromStorage('research_tasks', []);
    const people = this._getFromStorage('tree_people', []);
    const lists = this._getFromStorage('research_lists', []);

    const list = lists.find(l => l.id === researchListId) || null;
    if (!list) throw new Error('Research list not found');

    const person = people.find(p => p.id === linkedPersonId) || null;
    if (!person) throw new Error('Linked person not found');

    const now = this._now();
    const task = {
      id: this._generateId('rtask'),
      researchListId,
      title,
      description: description || '',
      linkedPersonId,
      dueDate: this._toIsoDate(dueDate) || now,
      status: status || 'not_started',
      sortOrder: null,
      createdAt: now
    };

    tasks.push(task);
    this._saveToStorage('research_tasks', tasks);

    const linkedPerson = person;
    return {
      task,
      linkedPerson
    };
  }

  // -------------------- Interface: updateResearchTaskStatus --------------------

  updateResearchTaskStatus(taskId, status) {
    const tasks = this._getFromStorage('research_tasks', []);
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return null;
    tasks[idx] = {
      ...tasks[idx],
      status
    };
    this._saveToStorage('research_tasks', tasks);
    return tasks[idx];
  }

  // -------------------- Interface: getTreePeopleForSelection --------------------

  getTreePeopleForSelection(filters) {
    const people = this._getFromStorage('tree_people', []);
    const trees = this._getFromStorage('family_trees', []);

    let filtered = people;
    if (filters) {
      if (typeof filters.birthYearMin === 'number') {
        filtered = filtered.filter(p => p.birthYear >= filters.birthYearMin);
      }
      if (typeof filters.birthYearMax === 'number') {
        filtered = filtered.filter(p => p.birthYear <= filters.birthYearMax);
      }
      if (filters.lastName) {
        const ln = String(filters.lastName).toLowerCase();
        filtered = filtered.filter(p => String(p.lastName).toLowerCase() === ln);
      }
    }

    return filtered.map(p => {
      const tree = trees.find(t => t.id === p.treeId) || null;
      return { ...p, tree };
    });
  }

  // -------------------- Interface: getAboutContent --------------------

  getAboutContent() {
    const profile = this._getFromStorage('account_profile', null);
    return {
      title: 'About This Genealogy & Membership Site',
      body:
        'This site helps you build and explore your family genealogy, collaborate with relatives, and manage your research and events. All data is stored locally using your browser\'s storage for quick access.',
      contactEmail: profile && profile.email ? profile.email : 'support@example.com',
      supportLinks: [
        { sectionKey: 'help_center', label: 'Help Center' },
        { sectionKey: 'community_forum', label: 'Community Forum' },
        { sectionKey: 'contact_support', label: 'Contact Support' }
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