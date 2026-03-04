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
    const tables = [
      'projects',
      'environments',
      'feature_flags',
      'flag_variations',
      'flag_environment_settings',
      'flag_environment_variation_rollouts',
      'targeting_rules',
      'targeting_conditions',
      'user_overrides',
      'segments',
      'segment_members',
      'tags',
      'flag_tags',
      'scheduled_changes',
      'metric_definitions',
      'automation_rules',
      'audit_events',
      'roles',
      'project_role_assignments',
      'static_pages'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

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

  _nowISO() {
    return new Date().toISOString();
  }

  _findById(array, id) {
    return array.find(function (item) { return item.id === id; }) || null;
  }

  _getProjectById(projectId) {
    const projects = this._getFromStorage('projects');
    return this._findById(projects, projectId);
  }

  _getFlagById(flagId) {
    const flags = this._getFromStorage('feature_flags');
    return this._findById(flags, flagId);
  }

  _resolveVariationKeysToIds(flagId) {
    const allVariations = this._getFromStorage('flag_variations');
    const variations = allVariations.filter(function (v) { return v.flagId === flagId; });
    const byKey = {};
    for (let i = 0; i < variations.length; i++) {
      const v = variations[i];
      byKey[v.key] = v;
    }
    return { variations: variations, byKey: byKey };
  }

  _applyRolloutValidation(flag, rolloutMode, variationRollouts) {
    // Ensure rolloutMode matches flag type
    if (flag && flag.type === 'boolean' && rolloutMode !== 'boolean_percentage') {
      rolloutMode = 'boolean_percentage';
    }
    if (flag && flag.type === 'multivariate' && rolloutMode !== 'multivariate_percentage') {
      rolloutMode = 'multivariate_percentage';
    }

    if (!Array.isArray(variationRollouts) || variationRollouts.length === 0) {
      return { rolloutMode: rolloutMode, variationRollouts: variationRollouts };
    }

    let total = 0;
    for (let i = 0; i < variationRollouts.length; i++) {
      const pct = Number(variationRollouts[i].percentage) || 0;
      variationRollouts[i].percentage = pct;
      total += pct;
    }

    // Normalize to 100 if needed
    if (total === 0 && variationRollouts.length > 0) {
      // All zero, set first to 100
      variationRollouts[0].percentage = 100;
      for (let j = 1; j < variationRollouts.length; j++) {
        variationRollouts[j].percentage = 0;
      }
    } else if (Math.abs(total - 100) > 0.01) {
      const diff = 100 - total;
      variationRollouts[variationRollouts.length - 1].percentage += diff;
    }

    return { rolloutMode: rolloutMode, variationRollouts: variationRollouts };
  }

  _getProjectIdFromResource(resourceType, resourceId) {
    if (!resourceType || !resourceId) {
      return null;
    }
    if (resourceType === 'project') {
      return resourceId;
    }

    if (resourceType === 'feature_flag') {
      const flag = this._getFlagById(resourceId);
      return flag ? flag.projectId : null;
    }

    if (resourceType === 'segment') {
      const segments = this._getFromStorage('segments');
      const segment = this._findById(segments, resourceId);
      return segment ? segment.projectId : null;
    }

    if (resourceType === 'automation_rule') {
      const automationRules = this._getFromStorage('automation_rules');
      const rule = this._findById(automationRules, resourceId);
      if (!rule) return null;
      const fesList = this._getFromStorage('flag_environment_settings');
      const fes = this._findById(fesList, rule.flagEnvironmentSettingsId);
      if (!fes) return null;
      const flag = this._getFlagById(fes.flagId);
      return flag ? flag.projectId : null;
    }

    if (resourceType === 'scheduled_change') {
      const scheduledChanges = this._getFromStorage('scheduled_changes');
      const sc = this._findById(scheduledChanges, resourceId);
      if (!sc) return null;
      const fesList = this._getFromStorage('flag_environment_settings');
      const fes = this._findById(fesList, sc.flagEnvironmentSettingsId);
      if (!fes) return null;
      const flag = this._getFlagById(fes.flagId);
      return flag ? flag.projectId : null;
    }

    if (resourceType === 'role_assignment') {
      const assignments = this._getFromStorage('project_role_assignments');
      const assn = this._findById(assignments, resourceId);
      return assn ? assn.projectId : null;
    }

    if (resourceType === 'environment') {
      const envs = this._getFromStorage('environments');
      const env = this._findById(envs, resourceId);
      return env ? env.projectId : null;
    }

    if (resourceType === 'metric_definition') {
      return null;
    }

    return null;
  }

  _recordAuditEvent(resourceType, resourceId, actionType, summary, details, previousValue, newValue, projectId) {
    const auditEvents = this._getFromStorage('audit_events');
    const occurredAt = this._nowISO();

    let resolvedProjectId = projectId || this._getProjectIdFromResource(resourceType, resourceId);

    const event = {
      id: this._generateId('audit'),
      occurredAt: occurredAt,
      actorIdentifier: 'system',
      projectId: resolvedProjectId || null,
      resourceType: resourceType || null,
      resourceId: resourceId || null,
      actionType: actionType,
      summary: summary || '',
      details: details || null,
      previousValue: previousValue || null,
      newValue: newValue || null
    };

    auditEvents.push(event);
    this._saveToStorage('audit_events', auditEvents);
    return event;
  }

  _ensureFlagEnvironmentSettings(flagId, environmentId) {
    const fesList = this._getFromStorage('flag_environment_settings');
    let settings = fesList.find(function (s) {
      return s.flagId === flagId && s.environmentId === environmentId;
    });

    if (settings) {
      return settings;
    }

    const flag = this._getFlagById(flagId);
    const variationInfo = this._resolveVariationKeysToIds(flagId);
    const variations = variationInfo.variations;

    let defaultVariation = null;
    for (let i = 0; i < variations.length; i++) {
      if (variations[i].isDefault) {
        defaultVariation = variations[i];
        break;
      }
    }
    if (!defaultVariation && variations.length > 0) {
      // For boolean, prefer 'off' if present
      if (flag && flag.type === 'boolean') {
        const offVar = variations.find(function (v) { return v.key === 'off'; });
        defaultVariation = offVar || variations[0];
      } else {
        defaultVariation = variations[0];
      }
    }

    const now = this._nowISO();
    let rolloutMode = flag && flag.type === 'boolean' ? 'boolean_percentage' : 'multivariate_percentage';

    settings = {
      id: this._generateId('fes'),
      flagId: flagId,
      environmentId: environmentId,
      status: 'off',
      rolloutMode: rolloutMode,
      defaultRuleVariationId: defaultVariation ? defaultVariation.id : null,
      description: null,
      createdAt: now,
      updatedAt: now
    };

    fesList.push(settings);
    this._saveToStorage('flag_environment_settings', fesList);

    // Initialize default rollouts
    const rollouts = this._getFromStorage('flag_environment_variation_rollouts');
    if (variations.length > 0) {
      for (let i = 0; i < variations.length; i++) {
        const v = variations[i];
        const percentage = defaultVariation && v.id === defaultVariation.id ? 100 : 0;
        const rollout = {
          id: this._generateId('fevr'),
          flagEnvironmentSettingsId: settings.id,
          variationId: v.id,
          percentage: percentage
        };
        rollouts.push(rollout);
      }
      this._saveToStorage('flag_environment_variation_rollouts', rollouts);
    }

    return settings;
  }

  _getOrCreateMemberRecord(memberIdentifier) {
    if (typeof memberIdentifier === 'string') {
      return memberIdentifier.trim();
    }
    return String(memberIdentifier);
  }

  // ===================== Core interface implementations =====================

  // getDashboardSummary()
  getDashboardSummary() {
    const projects = this._getFromStorage('projects');
    const flags = this._getFromStorage('feature_flags');
    const tags = this._getFromStorage('tags');
    const flagTags = this._getFromStorage('flag_tags');
    const scheduledChanges = this._getFromStorage('scheduled_changes');
    const environments = this._getFromStorage('environments');
    const fesList = this._getFromStorage('flag_environment_settings');
    const automationRules = this._getFromStorage('automation_rules');
    const metricDefinitions = this._getFromStorage('metric_definitions');

    // Recent feature flags (sorted by last modified desc)
    const sortedFlags = flags.slice().sort(function (a, b) {
      const ad = a.updatedAt || a.createdAt || '';
      const bd = b.updatedAt || b.createdAt || '';
      return bd.localeCompare(ad);
    });

    const recentFeatureFlags = sortedFlags.map(function (flag) {
      const project = projects.find(function (p) { return p.id === flag.projectId; }) || null;
      const relatedFlagTags = flagTags.filter(function (ft) { return ft.flagId === flag.id; });
      const tagObjs = relatedFlagTags
        .map(function (ft) { return tags.find(function (t) { return t.id === ft.tagId; }); })
        .filter(function (t) { return !!t; });
      const lastModifiedAt = flag.updatedAt || flag.createdAt || null;
      return {
        flag: flag,
        project: project,
        tags: tagObjs,
        lastModifiedAt: lastModifiedAt
      };
    });

    const now = new Date();

    const upcomingScheduledChanges = scheduledChanges
      .filter(function (sc) {
        if (sc.isExecuted) return false;
        if (!sc.scheduledAt) return false;
        const d = new Date(sc.scheduledAt);
        return d > now;
      })
      .sort(function (a, b) {
        return new Date(a.scheduledAt) - new Date(b.scheduledAt);
      })
      .map(function (sc) {
        const fes = fesList.find(function (s) { return s.id === sc.flagEnvironmentSettingsId; }) || null;
        let flag = null;
        let environment = null;
        let project = null;
        if (fes) {
          flag = flags.find(function (f) { return f.id === fes.flagId; }) || null;
          environment = environments.find(function (e) { return e.id === fes.environmentId; }) || null;
          if (flag) {
            project = projects.find(function (p) { return p.id === flag.projectId; }) || null;
          }
        }
        const scheduledChangeWithFES = Object.assign({}, sc, { flagEnvironmentSettings: fes || null });
        return {
          scheduledChange: scheduledChangeWithFES,
          flag: flag,
          environment: environment,
          project: project
        };
      });

    const recentAutomationActivity = automationRules
      .map(function (rule) {
        const fes = fesList.find(function (s) { return s.id === rule.flagEnvironmentSettingsId; }) || null;
        let flag = null;
        let environment = null;
        let project = null;
        if (fes) {
          flag = flags.find(function (f) { return f.id === fes.flagId; }) || null;
          environment = environments.find(function (e) { return e.id === fes.environmentId; }) || null;
          if (flag) {
            project = projects.find(function (p) { return p.id === flag.projectId; }) || null;
          }
        }
        const metric = metricDefinitions.find(function (m) { return m.id === rule.metricDefinitionId; }) || null;
        const lastTriggeredAt = rule.updatedAt || rule.createdAt || null;
        return {
          automationRule: rule,
          flag: flag,
          environment: environment,
          project: project,
          lastTriggeredAt: lastTriggeredAt,
          metricDefinition: metric
        };
      })
      .sort(function (a, b) {
        const ad = a.lastTriggeredAt || '';
               const bd = b.lastTriggeredAt || '';
        return bd.localeCompare(ad);
      });

    return {
      projects: projects,
      recentFeatureFlags: recentFeatureFlags,
      upcomingScheduledChanges: upcomingScheduledChanges,
      recentAutomationActivity: recentAutomationActivity
    };
  }

  // getProjects(searchQuery)
  getProjects(searchQuery) {
    const projects = this._getFromStorage('projects');
    if (!searchQuery) {
      return projects;
    }
    const q = String(searchQuery).toLowerCase();
    return projects.filter(function (p) {
      return (p.name && p.name.toLowerCase().indexOf(q) !== -1) ||
             (p.key && p.key.toLowerCase().indexOf(q) !== -1);
    });
  }

  // getProjectOverview(projectId)
  getProjectOverview(projectId) {
    const project = this._getProjectById(projectId) || null;
    const allEnvs = this._getFromStorage('environments');
    const allFlags = this._getFromStorage('feature_flags');
    const allSegments = this._getFromStorage('segments');

    const environments = allEnvs.filter(function (e) { return e.projectId === projectId; });

    const projectFlags = allFlags.filter(function (f) { return f.projectId === projectId; });
    const featureFlagCount = projectFlags.length;
    const activeFlagCount = projectFlags.filter(function (f) { return f.status === 'active'; }).length;
    const archivedFlagCount = projectFlags.filter(function (f) { return f.status === 'archived'; }).length;

    const segmentCount = allSegments.filter(function (s) { return s.projectId === projectId; }).length;

    const recentFlags = projectFlags.slice().sort(function (a, b) {
      const ad = a.updatedAt || a.createdAt || '';
           const bd = b.updatedAt || b.createdAt || '';
      return bd.localeCompare(ad);
    });

    // Foreign key expansion for recentFlags (attach project)
    const recentFlagsWithProject = recentFlags.map(function (flag) {
      return Object.assign({}, flag, { project: project });
    });

    return {
      project: project,
      environments: environments,
      featureFlagCount: featureFlagCount,
      activeFlagCount: activeFlagCount,
      archivedFlagCount: archivedFlagCount,
      segmentCount: segmentCount,
      recentFlags: recentFlagsWithProject
    };
  }

  // getProjectEnvironments(projectId)
  getProjectEnvironments(projectId) {
    const project = this._getProjectById(projectId) || null;
    const envs = this._getFromStorage('environments');
    const environments = envs
      .filter(function (e) { return e.projectId === projectId; })
      .sort(function (a, b) {
        const sa = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const sb = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        return sa - sb;
      })
      .map(function (env) {
        return Object.assign({}, env, { project: project });
      });
    return environments;
  }

  // getProjectFeatureFlags(projectId, searchQuery, tagIds, sortBy)
  getProjectFeatureFlags(projectId, searchQuery, tagIds, sortBy) {
    const projects = this._getFromStorage('projects');
    const project = projects.find(function (p) { return p.id === projectId; }) || null;
    const flags = this._getFromStorage('feature_flags');
    const tags = this._getFromStorage('tags');
    const flagTags = this._getFromStorage('flag_tags');

    let projectFlags = flags.filter(function (f) { return f.projectId === projectId; });

    if (searchQuery) {
      const q = String(searchQuery).toLowerCase();
      projectFlags = projectFlags.filter(function (f) {
        return (f.name && f.name.toLowerCase().indexOf(q) !== -1) ||
               (f.key && f.key.toLowerCase().indexOf(q) !== -1);
      });
    }

    if (Array.isArray(tagIds) && tagIds.length > 0) {
      const tagIdSet = {};
      for (let i = 0; i < tagIds.length; i++) {
        tagIdSet[tagIds[i]] = true;
      }
      const flagIds = {};
      for (let j = 0; j < flagTags.length; j++) {
        const ft = flagTags[j];
        if (tagIdSet[ft.tagId]) {
          flagIds[ft.flagId] = true;
        }
      }
      projectFlags = projectFlags.filter(function (f) { return !!flagIds[f.id]; });
    }

    if (sortBy === 'name_asc') {
      projectFlags.sort(function (a, b) {
        return (a.name || '').localeCompare(b.name || '');
      });
    } else if (sortBy === 'name_desc') {
      projectFlags.sort(function (a, b) {
        return (b.name || '').localeCompare(a.name || '');
      });
    } else if (sortBy === 'last_modified_oldest_first') {
      projectFlags.sort(function (a, b) {
        const ad = a.updatedAt || a.createdAt || '';
        const bd = b.updatedAt || b.createdAt || '';
        return ad.localeCompare(bd);
      });
    } else {
      // default or 'last_modified_newest_first'
      projectFlags.sort(function (a, b) {
        const ad = a.updatedAt || a.createdAt || '';
        const bd = b.updatedAt || b.createdAt || '';
        return bd.localeCompare(ad);
      });
    }

    const result = projectFlags.map(function (flag) {
      const relatedFlagTags = flagTags.filter(function (ft) { return ft.flagId === flag.id; });
      const tagObjs = relatedFlagTags
        .map(function (ft) { return tags.find(function (t) { return t.id === ft.tagId; }); })
        .filter(function (t) { return !!t; });
      const lastModifiedAt = flag.updatedAt || flag.createdAt || null;
      return {
        flag: flag,
        project: project,
        tags: tagObjs,
        lastModifiedAt: lastModifiedAt
      };
    });

    return result;
  }

  // getProjectTags(projectId)
  getProjectTags(projectId) {
    const project = this._getProjectById(projectId) || null;
    const tags = this._getFromStorage('tags');
    return tags
      .filter(function (t) { return t.projectId === projectId; })
      .map(function (tag) {
        return Object.assign({}, tag, { project: project });
      });
  }

  // getFlagDetails(flagId)
  getFlagDetails(flagId) {
    const flag = this._getFlagById(flagId) || null;
    if (!flag) {
      return {
        flag: null,
        project: null,
        variations: [],
        environments: [],
        environmentConfigurations: [],
        availableSegments: [],
        availableMetricDefinitions: [],
        availableTags: []
      };
    }

    const project = this._getProjectById(flag.projectId) || null;
    const allVariations = this._getFromStorage('flag_variations');
    const variations = allVariations.filter(function (v) { return v.flagId === flagId; });
    const allEnvironments = this._getFromStorage('environments');
    const environments = allEnvironments.filter(function (e) { return e.projectId === flag.projectId; });
    const fesList = this._getFromStorage('flag_environment_settings');
    const allRollouts = this._getFromStorage('flag_environment_variation_rollouts');
    const allRules = this._getFromStorage('targeting_rules');
    const allConditions = this._getFromStorage('targeting_conditions');
    const allOverrides = this._getFromStorage('user_overrides');
    const allScheduledChanges = this._getFromStorage('scheduled_changes');
    const allAutomationRules = this._getFromStorage('automation_rules');
    const allSegments = this._getFromStorage('segments');
    const allMetricDefinitions = this._getFromStorage('metric_definitions');
    const allTags = this._getFromStorage('tags');
    const allFlagTags = this._getFromStorage('flag_tags');

    const environmentConfigurations = [];

    for (let i = 0; i < environments.length; i++) {
      const env = environments[i];
      const settings = this._ensureFlagEnvironmentSettings(flagId, env.id);

      const variationRollouts = allRollouts
        .filter(function (r) { return r.flagEnvironmentSettingsId === settings.id; })
        .map(function (r) {
          const variation = variations.find(function (v) { return v.id === r.variationId; }) || null;
          return Object.assign({}, r, { variation: variation });
        });

      const rulesForEnv = allRules.filter(function (r) { return r.flagEnvironmentSettingsId === settings.id; });
      const targetingRules = rulesForEnv.map(function (rule) {
        const conditions = allConditions
          .filter(function (c) { return c.targetingRuleId === rule.id; })
          .map(function (c) {
            let segment = null;
            if (c.segmentId) {
              segment = allSegments.find(function (s) { return s.id === c.segmentId; }) || null;
            }
            return Object.assign({}, c, { segment: segment });
          });
        return {
          rule: rule,
          conditions: conditions
        };
      });

      const userOverrides = allOverrides
        .filter(function (o) { return o.flagEnvironmentSettingsId === settings.id; });

      const scheduledChanges = allScheduledChanges
        .filter(function (sc) { return sc.flagEnvironmentSettingsId === settings.id; })
        .map(function (sc) {
          return Object.assign({}, sc, { flagEnvironmentSettings: settings });
        });

      const automationRules = allAutomationRules
        .filter(function (ar) { return ar.flagEnvironmentSettingsId === settings.id; })
        .map(function (ar) {
          const metric = allMetricDefinitions.find(function (m) { return m.id === ar.metricDefinitionId; }) || null;
          return Object.assign({}, ar, { metricDefinition: metric, flagEnvironmentSettings: settings });
        });

      environmentConfigurations.push({
        environment: env,
        settings: settings,
        variationRollouts: variationRollouts,
        targetingRules: targetingRules,
        userOverrides: userOverrides,
        scheduledChanges: scheduledChanges,
        automationRules: automationRules
      });
    }

    const availableSegments = allSegments
      .filter(function (s) { return s.projectId === flag.projectId; })
      .map(function (s) { return Object.assign({}, s, { project: project }); });

    const availableMetricDefinitions = allMetricDefinitions;

    const availableTags = (function () {
      const relatedFlagTags = allFlagTags.filter(function (ft) { return ft.flagId === flag.id; });
      const tagSet = {};
      const result = [];
      for (let i = 0; i < relatedFlagTags.length; i++) {
        const tag = allTags.find(function (t) { return t.id === relatedFlagTags[i].tagId; });
        if (tag && !tagSet[tag.id]) {
          tagSet[tag.id] = true;
          result.push(Object.assign({}, tag, { project: project }));
        }
      }
      return result;
    })();

    return {
      flag: flag,
      project: project,
      variations: variations,
      environments: environments,
      environmentConfigurations: environmentConfigurations,
      availableSegments: availableSegments,
      availableMetricDefinitions: availableMetricDefinitions,
      availableTags: availableTags
    };
  }

  // createFeatureFlag(projectId, name, key, description, type, variations, initialEnvironmentSettings, tagIds)
  createFeatureFlag(projectId, name, key, description, type, variations, initialEnvironmentSettings, tagIds) {
    const now = this._nowISO();
    const flags = this._getFromStorage('feature_flags');
    const flagVariations = this._getFromStorage('flag_variations');
    const fesList = this._getFromStorage('flag_environment_settings');
    const rollouts = this._getFromStorage('flag_environment_variation_rollouts');
    const flagTags = this._getFromStorage('flag_tags');

    const flag = {
      id: this._generateId('flag'),
      projectId: projectId,
      name: name,
      key: key,
      description: description || '',
      type: type === 'multivariate' ? 'multivariate' : 'boolean',
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    flags.push(flag);
    this._saveToStorage('feature_flags', flags);

    const createdVariations = [];

    if (flag.type === 'boolean' && (!Array.isArray(variations) || variations.length === 0)) {
      const offVar = {
        id: this._generateId('var'),
        flagId: flag.id,
        key: 'off',
        name: 'Off',
        description: 'Feature disabled',
        isDefault: true,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now
      };
      const onVar = {
        id: this._generateId('var'),
        flagId: flag.id,
        key: 'on',
        name: 'On',
        description: 'Feature enabled',
        isDefault: false,
        sortOrder: 1,
        createdAt: now,
        updatedAt: now
      };
      flagVariations.push(offVar, onVar);
      createdVariations.push(offVar, onVar);
    } else if (Array.isArray(variations)) {
      for (let i = 0; i < variations.length; i++) {
        const v = variations[i];
        const newVar = {
          id: this._generateId('var'),
          flagId: flag.id,
          key: v.key,
          name: v.name || v.key,
          description: v.description || '',
          isDefault: !!v.isDefault,
          sortOrder: typeof v.sortOrder === 'number' ? v.sortOrder : i,
          createdAt: now,
          updatedAt: now
        };
        flagVariations.push(newVar);
        createdVariations.push(newVar);
      }
    }

    this._saveToStorage('flag_variations', flagVariations);

    const variationInfo = this._resolveVariationKeysToIds(flag.id);
    const variationsMap = variationInfo.byKey;

    const createdEnvironmentSettings = [];

    if (Array.isArray(initialEnvironmentSettings)) {
      for (let i = 0; i < initialEnvironmentSettings.length; i++) {
        const envConf = initialEnvironmentSettings[i];

        let defaultVarKey = envConf.defaultRuleVariationKey;
        if (!defaultVarKey) {
          // choose default from variations
          let defaultVar = null;
          const all = variationInfo.variations;
          for (let j = 0; j < all.length; j++) {
            if (all[j].isDefault) {
              defaultVar = all[j];
              break;
            }
          }
          if (!defaultVar && all.length > 0) {
            defaultVar = all[0];
          }
          defaultVarKey = defaultVar ? defaultVar.key : null;
        }

        const defaultVar = defaultVarKey ? variationsMap[defaultVarKey] : null;

        const fes = {
          id: this._generateId('fes'),
          flagId: flag.id,
          environmentId: envConf.environmentId,
          status: envConf.status === 'on' ? 'on' : 'off',
          rolloutMode: envConf.rolloutMode || (flag.type === 'boolean' ? 'boolean_percentage' : 'multivariate_percentage'),
          defaultRuleVariationId: defaultVar ? defaultVar.id : null,
          description: null,
          createdAt: now,
          updatedAt: now
        };

        fesList.push(fes);
        createdEnvironmentSettings.push(fes);

        const rolloutSpecs = Array.isArray(envConf.variationRollouts) ? envConf.variationRollouts.slice() : [];
        const validated = this._applyRolloutValidation(flag, fes.rolloutMode, rolloutSpecs);
        const finalRollouts = validated.variationRollouts;

        for (let r = 0; r < finalRollouts.length; r++) {
          const rr = finalRollouts[r];
          const variation = variationsMap[rr.variationKey];
          if (!variation) continue;
          const rollout = {
            id: this._generateId('fevr'),
            flagEnvironmentSettingsId: fes.id,
            variationId: variation.id,
            percentage: rr.percentage
          };
          rollouts.push(rollout);
        }
      }

      this._saveToStorage('flag_environment_settings', fesList);
      this._saveToStorage('flag_environment_variation_rollouts', rollouts);
    }

    if (Array.isArray(tagIds)) {
      for (let i = 0; i < tagIds.length; i++) {
        const tagId = tagIds[i];
        const flagTag = {
          id: this._generateId('flagt'),
          flagId: flag.id,
          tagId: tagId
        };
        flagTags.push(flagTag);
      }
      this._saveToStorage('flag_tags', flagTags);
    }

    this._recordAuditEvent(
      'feature_flag',
      flag.id,
      'create',
      'Created feature flag ' + flag.name,
      null,
      null,
      JSON.stringify(flag)
    );

    return {
      success: true,
      flag: flag,
      variations: createdVariations,
      environmentSettings: createdEnvironmentSettings
    };
  }

  // updateFeatureFlagMetadata(flagId, name, description, tagIds)
  updateFeatureFlagMetadata(flagId, name, description, tagIds) {
    const flags = this._getFromStorage('feature_flags');
    const flag = this._findById(flags, flagId);
    if (!flag) return null;

    const previousValue = JSON.stringify(flag);

    if (typeof name !== 'undefined') {
      flag.name = name;
    }
    if (typeof description !== 'undefined') {
      flag.description = description;
    }
    flag.updatedAt = this._nowISO();

    this._saveToStorage('feature_flags', flags);

    if (Array.isArray(tagIds)) {
      const flagTags = this._getFromStorage('flag_tags');
      const remaining = flagTags.filter(function (ft) { return ft.flagId !== flagId; });
      for (let i = 0; i < tagIds.length; i++) {
        const tagId = tagIds[i];
        remaining.push({
          id: this._generateId('flagt'),
          flagId: flagId,
          tagId: tagId
        });
      }
      this._saveToStorage('flag_tags', remaining);
    }

    this._recordAuditEvent(
      'feature_flag',
      flag.id,
      'update',
      'Updated feature flag metadata for ' + flag.name,
      null,
      previousValue,
      JSON.stringify(flag)
    );

    return flag;
  }

  // updateFlagEnvironmentSettings(flagId, environmentId, status, rolloutMode, defaultRuleVariationKey, variationRollouts)
  updateFlagEnvironmentSettings(flagId, environmentId, status, rolloutMode, defaultRuleVariationKey, variationRollouts) {
    const flags = this._getFromStorage('feature_flags');
    const flag = this._findById(flags, flagId);
    if (!flag) return null;

    const fesList = this._getFromStorage('flag_environment_settings');
    const allRollouts = this._getFromStorage('flag_environment_variation_rollouts');

    let settings = fesList.find(function (s) {
      return s.flagId === flagId && s.environmentId === environmentId;
    });

    if (!settings) {
      settings = this._ensureFlagEnvironmentSettings(flagId, environmentId);
    }

    const previousSettings = JSON.stringify(settings);

    const variationInfo = this._resolveVariationKeysToIds(flagId);
    const variationsMap = variationInfo.byKey;

    settings.status = status === 'on' ? 'on' : 'off';
    settings.rolloutMode = rolloutMode || (flag.type === 'boolean' ? 'boolean_percentage' : 'multivariate_percentage');

    if (defaultRuleVariationKey) {
      const defaultVar = variationsMap[defaultRuleVariationKey] || null;
      settings.defaultRuleVariationId = defaultVar ? defaultVar.id : settings.defaultRuleVariationId;
    }

    settings.updatedAt = this._nowISO();

    const rolloutSpecs = Array.isArray(variationRollouts) ? variationRollouts.slice() : [];
    const validated = this._applyRolloutValidation(flag, settings.rolloutMode, rolloutSpecs);
    const finalRollouts = validated.variationRollouts;

    // Remove existing rollouts for this env settings
    const remainingRollouts = allRollouts.filter(function (r) { return r.flagEnvironmentSettingsId !== settings.id; });

    const newRollouts = [];
    for (let i = 0; i < finalRollouts.length; i++) {
      const rr = finalRollouts[i];
      const variation = variationsMap[rr.variationKey];
      if (!variation) continue;
      const rollout = {
        id: this._generateId('fevr'),
        flagEnvironmentSettingsId: settings.id,
        variationId: variation.id,
        percentage: rr.percentage
      };
      remainingRollouts.push(rollout);
      newRollouts.push(rollout);
    }

    this._saveToStorage('flag_environment_settings', fesList);
    this._saveToStorage('flag_environment_variation_rollouts', remainingRollouts);

    this._recordAuditEvent(
      'feature_flag',
      flagId,
      'change_rollout',
      'Updated environment settings for flag ' + flag.name,
      null,
      previousSettings,
      JSON.stringify({ settings: settings, rollouts: newRollouts })
    );

    return {
      settings: settings,
      variationRollouts: newRollouts
    };
  }

  // updateFlagTargetingConfiguration(flagId, environmentId, rules, userOverrides, defaultRuleVariationKey)
  updateFlagTargetingConfiguration(flagId, environmentId, rules, userOverrides, defaultRuleVariationKey) {
    const flags = this._getFromStorage('feature_flags');
    const flag = this._findById(flags, flagId);
    if (!flag) return null;

    const fesList = this._getFromStorage('flag_environment_settings');
    const allRules = this._getFromStorage('targeting_rules');
    const allConditions = this._getFromStorage('targeting_conditions');
    const allOverrides = this._getFromStorage('user_overrides');

    let settings = fesList.find(function (s) {
      return s.flagId === flagId && s.environmentId === environmentId;
    });

    if (!settings) {
      settings = this._ensureFlagEnvironmentSettings(flagId, environmentId);
    }

    const previousValue = JSON.stringify({ settings: settings });

    // Remove existing rules and conditions for this env settings
    const existingRuleIds = allRules
      .filter(function (r) { return r.flagEnvironmentSettingsId === settings.id; })
      .map(function (r) { return r.id; });

    const newRulesArray = allRules.filter(function (r) { return r.flagEnvironmentSettingsId !== settings.id; });
    const newConditionsArray = allConditions.filter(function (c) {
      return existingRuleIds.indexOf(c.targetingRuleId) === -1;
    });

    // Remove existing overrides for this env settings
    const remainingOverrides = allOverrides.filter(function (o) { return o.flagEnvironmentSettingsId !== settings.id; });

    const variationInfo = this._resolveVariationKeysToIds(flagId);
    const variationsMap = variationInfo.byKey;

    const createdRules = [];
    const createdConditions = [];

    if (Array.isArray(rules)) {
      for (let i = 0; i < rules.length; i++) {
        const rSpec = rules[i];
        const variation = variationsMap[rSpec.serveVariationKey];
        const rule = {
          id: this._generateId('tr'),
          flagEnvironmentSettingsId: settings.id,
          ruleType: rSpec.ruleType === 'segment_based' ? 'segment_based' : 'attribute_based',
          name: rSpec.name || null,
          order: typeof rSpec.order === 'number' ? rSpec.order : i,
          isEnabled: typeof rSpec.isEnabled === 'boolean' ? rSpec.isEnabled : true,
          serveVariationId: variation ? variation.id : null,
          description: rSpec.description || null,
          createdAt: this._nowISO(),
          updatedAt: this._nowISO()
        };
        newRulesArray.push(rule);
        createdRules.push(rule);

        if (Array.isArray(rSpec.conditions)) {
          for (let j = 0; j < rSpec.conditions.length; j++) {
            const cSpec = rSpec.conditions[j];
            const condition = {
              id: this._generateId('tc'),
              targetingRuleId: rule.id,
              conditionType: cSpec.conditionType || 'attribute',
              attributeName: cSpec.attributeName || null,
              operator: cSpec.operator,
              value: typeof cSpec.value !== 'undefined' ? cSpec.value : null,
              values: Array.isArray(cSpec.values) ? cSpec.values : null,
              segmentId: cSpec.segmentId || null
            };
            newConditionsArray.push(condition);
            createdConditions.push(condition);
          }
        }
      }
    }

    const createdOverrides = [];

    if (Array.isArray(userOverrides)) {
      for (let i = 0; i < userOverrides.length; i++) {
        const oSpec = userOverrides[i];
        const variation = variationsMap[oSpec.variationKey];
        const override = {
          id: this._generateId('uo'),
          flagEnvironmentSettingsId: settings.id,
          userKey: oSpec.userKey,
          variationId: variation ? variation.id : null,
          description: oSpec.description || null,
          createdAt: this._nowISO(),
          updatedAt: this._nowISO()
        };
        remainingOverrides.push(override);
        createdOverrides.push(override);
      }
    }

    if (defaultRuleVariationKey) {
      const defaultVar = variationsMap[defaultRuleVariationKey] || null;
      settings.defaultRuleVariationId = defaultVar ? defaultVar.id : settings.defaultRuleVariationId;
    }

    settings.updatedAt = this._nowISO();

    this._saveToStorage('targeting_rules', newRulesArray);
    this._saveToStorage('targeting_conditions', newConditionsArray);
    this._saveToStorage('user_overrides', remainingOverrides);
    this._saveToStorage('flag_environment_settings', fesList);

    this._recordAuditEvent(
      'feature_flag',
      flagId,
      'update',
      'Updated targeting configuration for flag ' + flag.name,
      null,
      previousValue,
      JSON.stringify({ rules: createdRules, conditions: createdConditions, overrides: createdOverrides })
    );

    return {
      targetingRules: createdRules,
      conditions: createdConditions,
      userOverrides: createdOverrides,
      defaultRuleVariationId: settings.defaultRuleVariationId
    };
  }

  // archiveFeatureFlag(flagId, reason)
  archiveFeatureFlag(flagId, reason) {
    const flags = this._getFromStorage('feature_flags');
    const flag = this._findById(flags, flagId);
    if (!flag) return null;

    const previousValue = JSON.stringify(flag);

    flag.status = 'archived';
    flag.updatedAt = this._nowISO();

    this._saveToStorage('feature_flags', flags);

    this._recordAuditEvent(
      'feature_flag',
      flagId,
      'archive',
      'Archived feature flag ' + flag.name + (reason ? ': ' + reason : ''),
      null,
      previousValue,
      JSON.stringify(flag)
    );

    return flag;
  }

  // unarchiveFeatureFlag(flagId)
  unarchiveFeatureFlag(flagId) {
    const flags = this._getFromStorage('feature_flags');
    const flag = this._findById(flags, flagId);
    if (!flag) return null;

    const previousValue = JSON.stringify(flag);

    flag.status = 'active';
    flag.updatedAt = this._nowISO();

    this._saveToStorage('feature_flags', flags);

    this._recordAuditEvent(
      'feature_flag',
      flagId,
      'update',
      'Unarchived feature flag ' + flag.name,
      null,
      previousValue,
      JSON.stringify(flag)
    );

    return flag;
  }

  // createScheduledChange(flagId, environmentId, actionType, scheduledAt, timezone, description)
  createScheduledChange(flagId, environmentId, actionType, scheduledAt, timezone, description) {
    const fes = this._ensureFlagEnvironmentSettings(flagId, environmentId);
    const scheduledChanges = this._getFromStorage('scheduled_changes');
    const now = this._nowISO();

    const scheduledChange = {
      id: this._generateId('sc'),
      flagEnvironmentSettingsId: fes.id,
      actionType: actionType,
      scheduledAt: scheduledAt,
      timezone: timezone,
      isExecuted: false,
      executedAt: null,
      description: description || null,
      createdAt: now,
      updatedAt: now
    };

    scheduledChanges.push(scheduledChange);
    this._saveToStorage('scheduled_changes', scheduledChanges);

    this._recordAuditEvent(
      'scheduled_change',
      scheduledChange.id,
      'create',
      'Created scheduled change for flag environment settings ' + fes.id,
      null,
      null,
      JSON.stringify(scheduledChange)
    );

    return scheduledChange;
  }

  // deleteScheduledChange(scheduledChangeId)
  deleteScheduledChange(scheduledChangeId) {
    const scheduledChanges = this._getFromStorage('scheduled_changes');
    const index = scheduledChanges.findIndex(function (sc) { return sc.id === scheduledChangeId; });
    if (index === -1) {
      return { success: false };
    }

    const sc = scheduledChanges[index];
    if (sc.isExecuted) {
      return { success: false };
    }

    scheduledChanges.splice(index, 1);
    this._saveToStorage('scheduled_changes', scheduledChanges);

    this._recordAuditEvent(
      'scheduled_change',
      scheduledChangeId,
      'delete',
      'Deleted scheduled change',
      null,
      JSON.stringify(sc),
      null
    );

    return { success: true };
  }

  // createAutomationRule(flagId, environmentId, name, metricDefinitionId, thresholdOperator, thresholdValue, actionType, isEnabled)
  createAutomationRule(flagId, environmentId, name, metricDefinitionId, thresholdOperator, thresholdValue, actionType, isEnabled) {
    const fes = this._ensureFlagEnvironmentSettings(flagId, environmentId);
    const automationRules = this._getFromStorage('automation_rules');
    const now = this._nowISO();

    const rule = {
      id: this._generateId('ar'),
      flagEnvironmentSettingsId: fes.id,
      name: name || null,
      metricDefinitionId: metricDefinitionId,
      thresholdOperator: thresholdOperator,
      thresholdValue: thresholdValue,
      actionType: actionType,
      isEnabled: !!isEnabled,
      createdAt: now,
      updatedAt: now
    };

    automationRules.push(rule);
    this._saveToStorage('automation_rules', automationRules);

    this._recordAuditEvent(
      'automation_rule',
      rule.id,
      'create',
      'Created automation rule',
      null,
      null,
      JSON.stringify(rule)
    );

    return rule;
  }

  // updateAutomationRule(automationRuleId, name, thresholdOperator, thresholdValue, actionType, isEnabled)
  updateAutomationRule(automationRuleId, name, thresholdOperator, thresholdValue, actionType, isEnabled) {
    const automationRules = this._getFromStorage('automation_rules');
    const rule = this._findById(automationRules, automationRuleId);
    if (!rule) return null;

    const previousValue = JSON.stringify(rule);

    if (typeof name !== 'undefined') {
      rule.name = name;
    }
    if (typeof thresholdOperator !== 'undefined') {
      rule.thresholdOperator = thresholdOperator;
    }
    if (typeof thresholdValue !== 'undefined') {
      rule.thresholdValue = thresholdValue;
    }
    if (typeof actionType !== 'undefined') {
      rule.actionType = actionType;
    }
    if (typeof isEnabled !== 'undefined') {
      rule.isEnabled = !!isEnabled;
    }

    rule.updatedAt = this._nowISO();

    this._saveToStorage('automation_rules', automationRules);

    this._recordAuditEvent(
      'automation_rule',
      rule.id,
      'update',
      'Updated automation rule',
      null,
      previousValue,
      JSON.stringify(rule)
    );

    return rule;
  }

  // getMetricDefinitions()
  getMetricDefinitions() {
    const metrics = this._getFromStorage('metric_definitions');
    return metrics;
  }

  // getProjectSegments(projectId)
  getProjectSegments(projectId) {
    const project = this._getProjectById(projectId) || null;
    const segments = this._getFromStorage('segments');
    return segments
      .filter(function (s) { return s.projectId === projectId; })
      .map(function (s) { return Object.assign({}, s, { project: project }); });
  }

  // createSegment(projectId, name, key, description, memberUserKeys)
  createSegment(projectId, name, key, description, memberUserKeys) {
    const segments = this._getFromStorage('segments');
    const segmentMembers = this._getFromStorage('segment_members');
    const now = this._nowISO();

    const segment = {
      id: this._generateId('seg'),
      projectId: projectId,
      name: name,
      key: key,
      description: description || null,
      createdAt: now,
      updatedAt: now
    };

    segments.push(segment);
    this._saveToStorage('segments', segments);

    const members = [];
    if (Array.isArray(memberUserKeys)) {
      for (let i = 0; i < memberUserKeys.length; i++) {
        const m = {
          id: this._generateId('segm'),
          segmentId: segment.id,
          userKey: memberUserKeys[i],
          addedAt: now
        };
        segmentMembers.push(m);
        members.push(m);
      }
      this._saveToStorage('segment_members', segmentMembers);
    }

    this._recordAuditEvent(
      'segment',
      segment.id,
      'create',
      'Created segment ' + segment.name,
      null,
      null,
      JSON.stringify(segment)
    );

    return {
      segment: segment,
      members: members
    };
  }

  // updateSegmentMembers(segmentId, memberUserKeys)
  updateSegmentMembers(segmentId, memberUserKeys) {
    const segmentMembers = this._getFromStorage('segment_members');
    const remaining = segmentMembers.filter(function (m) { return m.segmentId !== segmentId; });
    const now = this._nowISO();

    const newMembers = [];
    if (Array.isArray(memberUserKeys)) {
      for (let i = 0; i < memberUserKeys.length; i++) {
        const m = {
          id: this._generateId('segm'),
          segmentId: segmentId,
          userKey: memberUserKeys[i],
          addedAt: now
        };
        remaining.push(m);
        newMembers.push(m);
      }
    }

    this._saveToStorage('segment_members', remaining);

    this._recordAuditEvent(
      'segment',
      segmentId,
      'update',
      'Updated segment members',
      null,
      null,
      JSON.stringify(newMembers)
    );

    return newMembers;
  }

  // getSegmentDetails(segmentId)
  getSegmentDetails(segmentId) {
    const segments = this._getFromStorage('segments');
    const segmentMembers = this._getFromStorage('segment_members');

    const segment = this._findById(segments, segmentId) || null;
    const members = segmentMembers
      .filter(function (m) { return m.segmentId === segmentId; })
      .map(function (m) {
        return Object.assign({}, m, { segment: segment });
      });

    return {
      segment: segment,
      members: members
    };
  }

  // getAuditEvents(fromDate, toDate, actorIdentifier, projectId, resourceType, sortBy, limit, offset)
  getAuditEvents(fromDate, toDate, actorIdentifier, projectId, resourceType, sortBy, limit, offset) {
    const events = this._getFromStorage('audit_events');
    const projects = this._getFromStorage('projects');
    const flags = this._getFromStorage('feature_flags');
    const segments = this._getFromStorage('segments');
    const automationRules = this._getFromStorage('automation_rules');
    const scheduledChanges = this._getFromStorage('scheduled_changes');
    const assignments = this._getFromStorage('project_role_assignments');
    const environments = this._getFromStorage('environments');
    const metrics = this._getFromStorage('metric_definitions');

    let filtered = events.slice();

    if (fromDate) {
      const from = new Date(fromDate);
      filtered = filtered.filter(function (e) { return new Date(e.occurredAt) >= from; });
    }

    if (toDate) {
      const to = new Date(toDate);
      filtered = filtered.filter(function (e) { return new Date(e.occurredAt) <= to; });
    }

    if (actorIdentifier) {
      filtered = filtered.filter(function (e) { return e.actorIdentifier === actorIdentifier; });
    }

    if (projectId) {
      filtered = filtered.filter(function (e) { return e.projectId === projectId; });
    }

    if (resourceType) {
      filtered = filtered.filter(function (e) { return e.resourceType === resourceType; });
    }

    if (sortBy === 'date_oldest_first') {
      filtered.sort(function (a, b) {
        return new Date(a.occurredAt) - new Date(b.occurredAt);
      });
    } else {
      // default or 'date_newest_first'
      filtered.sort(function (a, b) {
        return new Date(b.occurredAt) - new Date(a.occurredAt);
      });
    }

    const start = typeof offset === 'number' && offset > 0 ? offset : 0;
    const end = typeof limit === 'number' && limit > 0 ? start + limit : undefined;
    const paged = typeof end !== 'undefined' ? filtered.slice(start, end) : filtered.slice(start);

    const result = paged.map(function (e) {
      const project = e.projectId ? projects.find(function (p) { return p.id === e.projectId; }) || null : null;
      let resource = null;
      if (e.resourceType === 'feature_flag') {
        resource = flags.find(function (f) { return f.id === e.resourceId; }) || null;
      } else if (e.resourceType === 'segment') {
        resource = segments.find(function (s) { return s.id === e.resourceId; }) || null;
      } else if (e.resourceType === 'automation_rule') {
        resource = automationRules.find(function (r) { return r.id === e.resourceId; }) || null;
      } else if (e.resourceType === 'scheduled_change') {
        resource = scheduledChanges.find(function (sc) { return sc.id === e.resourceId; }) || null;
      } else if (e.resourceType === 'role_assignment') {
        resource = assignments.find(function (a) { return a.id === e.resourceId; }) || null;
      } else if (e.resourceType === 'environment') {
        resource = environments.find(function (env) { return env.id === e.resourceId; }) || null;
      } else if (e.resourceType === 'metric_definition') {
        resource = metrics.find(function (m) { return m.id === e.resourceId; }) || null;
      } else if (e.resourceType === 'project') {
        resource = projects.find(function (p) { return p.id === e.resourceId; }) || null;
      }

      return Object.assign({}, e, {
        project: project,
        resource: resource
      });
    });

    // Instrumentation for task completion tracking
    try {
      // Record last-used filters
      localStorage.setItem(
        'task7_lastAuditFilterParams',
        JSON.stringify({ fromDate, toDate, actorIdentifier, projectId, resourceType, sortBy })
      );

      // Check if the correct filter set was used
      const fromStr =
        typeof fromDate === 'string'
          ? fromDate
          : (fromDate && fromDate.toISOString ? fromDate.toISOString() : '');
      const toStr =
        typeof toDate === 'string'
          ? toDate
          : (toDate && toDate.toISOString ? toDate.toISOString() : '');
      const sortIsNewestFirst =
        typeof sortBy === 'undefined' || sortBy === null || sortBy === 'date_newest_first';

      if (
        fromStr.indexOf('2026-01-01') === 0 &&
        toStr.indexOf('2026-01-31') === 0 &&
        actorIdentifier === 'alex.smith' &&
        sortIsNewestFirst
      ) {
        localStorage.setItem('task7_usedCorrectAuditFilter', 'true');

        let expectedId = '';
        if (Array.isArray(result) && result.length > 0 && result[0] && result[0].id) {
          expectedId = String(result[0].id);
        }
        localStorage.setItem('task7_expectedMostRecentAuditEventId', expectedId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // getAuditEventDetails(auditEventId)
  getAuditEventDetails(auditEventId) {
    const events = this._getFromStorage('audit_events');
    const event = this._findById(events, auditEventId);

    // Instrumentation for task completion tracking
    try {
      const expectedId = localStorage.getItem('task7_expectedMostRecentAuditEventId');
      if (expectedId && auditEventId === expectedId) {
        localStorage.setItem('task7_openedCorrectAuditEventDetails', 'true');
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    if (!event) return null;

    const projects = this._getFromStorage('projects');
    const flags = this._getFromStorage('feature_flags');
    const segments = this._getFromStorage('segments');
    const automationRules = this._getFromStorage('automation_rules');
    const scheduledChanges = this._getFromStorage('scheduled_changes');
    const assignments = this._getFromStorage('project_role_assignments');
    const environments = this._getFromStorage('environments');
    const metrics = this._getFromStorage('metric_definitions');

    const project = event.projectId ? projects.find(function (p) { return p.id === event.projectId; }) || null : null;
    let resource = null;
    if (event.resourceType === 'feature_flag') {
      resource = flags.find(function (f) { return f.id === event.resourceId; }) || null;
    } else if (event.resourceType === 'segment') {
      resource = segments.find(function (s) { return s.id === event.resourceId; }) || null;
    } else if (event.resourceType === 'automation_rule') {
      resource = automationRules.find(function (r) { return r.id === event.resourceId; }) || null;
    } else if (event.resourceType === 'scheduled_change') {
      resource = scheduledChanges.find(function (sc) { return sc.id === event.resourceId; }) || null;
    } else if (event.resourceType === 'role_assignment') {
      resource = assignments.find(function (a) { return a.id === event.resourceId; }) || null;
    } else if (event.resourceType === 'environment') {
      resource = environments.find(function (env) { return env.id === event.resourceId; }) || null;
    } else if (event.resourceType === 'metric_definition') {
      resource = metrics.find(function (m) { return m.id === event.resourceId; }) || null;
    } else if (event.resourceType === 'project') {
      resource = projects.find(function (p) { return p.id === event.resourceId; }) || null;
    }

    return Object.assign({}, event, {
      project: project,
      resource: resource
    });
  }

  // getAccessControlOverview()
  getAccessControlOverview() {
    const assignments = this._getFromStorage('project_role_assignments');
    const roles = this._getFromStorage('roles');
    const projects = this._getFromStorage('projects');
    const environments = this._getFromStorage('environments');

    return assignments.map(function (assignment) {
      const role = roles.find(function (r) { return r.id === assignment.roleId; }) || null;
      const project = projects.find(function (p) { return p.id === assignment.projectId; }) || null;
      let envs = [];
      if (assignment.allEnvironments) {
        envs = environments.filter(function (e) { return e.projectId === assignment.projectId; });
      } else if (Array.isArray(assignment.environmentIds) && assignment.environmentIds.length > 0) {
        envs = environments.filter(function (e) { return assignment.environmentIds.indexOf(e.id) !== -1; });
      }
      return {
        assignment: assignment,
        role: role,
        project: project,
        environments: envs
      };
    });
  }

  // getAvailableRoles()
  getAvailableRoles() {
    const roles = this._getFromStorage('roles');
    return roles;
  }

  // assignProjectRole(memberIdentifier, roleId, projectId, allEnvironments, environmentIds)
  assignProjectRole(memberIdentifier, roleId, projectId, allEnvironments, environmentIds) {
    const assignments = this._getFromStorage('project_role_assignments');
    const canonicalMember = this._getOrCreateMemberRecord(memberIdentifier);
    const now = this._nowISO();

    const assignment = {
      id: this._generateId('pra'),
      memberIdentifier: canonicalMember,
      roleId: roleId,
      projectId: projectId,
      allEnvironments: !!allEnvironments,
      environmentIds: allEnvironments ? [] : (Array.isArray(environmentIds) ? environmentIds : []),
      createdAt: now
    };

    assignments.push(assignment);
    this._saveToStorage('project_role_assignments', assignments);

    this._recordAuditEvent(
      'role_assignment',
      assignment.id,
      'assign_role',
      'Assigned role to member ' + canonicalMember,
      null,
      null,
      JSON.stringify(assignment)
    );

    return assignment;
  }

  // updateProjectRoleAssignment(projectRoleAssignmentId, roleId, allEnvironments, environmentIds)
  updateProjectRoleAssignment(projectRoleAssignmentId, roleId, allEnvironments, environmentIds) {
    const assignments = this._getFromStorage('project_role_assignments');
    const assignment = this._findById(assignments, projectRoleAssignmentId);
    if (!assignment) return null;

    const previousValue = JSON.stringify(assignment);

    if (typeof roleId !== 'undefined') {
      assignment.roleId = roleId;
    }
    if (typeof allEnvironments !== 'undefined') {
      assignment.allEnvironments = !!allEnvironments;
      if (assignment.allEnvironments) {
        assignment.environmentIds = [];
      }
    }
    if (typeof environmentIds !== 'undefined' && !assignment.allEnvironments) {
      assignment.environmentIds = Array.isArray(environmentIds) ? environmentIds : [];
    }

    this._saveToStorage('project_role_assignments', assignments);

    this._recordAuditEvent(
      'role_assignment',
      assignment.id,
      'update',
      'Updated role assignment',
      null,
      previousValue,
      JSON.stringify(assignment)
    );

    return assignment;
  }

  // removeProjectRoleAssignment(projectRoleAssignmentId)
  removeProjectRoleAssignment(projectRoleAssignmentId) {
    const assignments = this._getFromStorage('project_role_assignments');
    const index = assignments.findIndex(function (a) { return a.id === projectRoleAssignmentId; });
    if (index === -1) {
      return { success: false };
    }

    const removed = assignments[index];
    assignments.splice(index, 1);
    this._saveToStorage('project_role_assignments', assignments);

    this._recordAuditEvent(
      'role_assignment',
      projectRoleAssignmentId,
      'unassign_role',
      'Removed role assignment',
      null,
      JSON.stringify(removed),
      null
    );

    return { success: true };
  }

  // getStaticPageContent(pageKey)
  getStaticPageContent(pageKey) {
    const pages = this._getFromStorage('static_pages');
    const page = pages.find(function (p) { return p.pageKey === pageKey; });
    if (page) {
      return {
        title: page.title || '',
        bodyMarkdown: page.bodyMarkdown || '',
        lastUpdatedAt: page.lastUpdatedAt || ''
      };
    }
    // No mocking of content; just return empty fields derived from key
    return {
      title: pageKey || '',
      bodyMarkdown: '',
      lastUpdatedAt: ''
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