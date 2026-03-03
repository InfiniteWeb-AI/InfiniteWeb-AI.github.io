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
  }

  // -------------------- Storage Helpers --------------------

  _initStorage() {
    const keys = [
      'channels',
      'inboxes',
      'bots',
      'bot_flow_steps',
      'targeting_rules',
      'condition_groups',
      'conditions',
      'chat_message_templates',
      'automations',
      'automation_actions',
      'email_templates',
      'conversations',
      'routing_rules',
      'analytics_reports',
      'dashboard_widgets',
      'integrations',
      'integration_field_mappings',
      'knowledge_bases',
      'knowledge_base_articles',
      'knowledge_base_settings',
      'agents',
      'pricing_plans',
      'trial_signups',
      'contact_messages'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
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

  _nowIso() {
    return new Date().toISOString();
  }

  _findByIdFromStorage(key, id) {
    const list = this._getFromStorage(key);
    return list.find(item => item.id === id) || null;
  }

  // -------------------- Private Helpers from spec --------------------

  // Load an existing draft bot or create a new one
  _getOrCreateDraftBot() {
    const bots = this._getFromStorage('bots');
    let draft = bots.find(b => b.status === 'draft');
    if (draft) return draft;

    const id = this._generateId('bot');
    const now = this._nowIso();
    const newBot = {
      id,
      name: '',
      type: 'website_chatbot',
      channel_id: '',
      template_name: null,
      status: 'draft',
      greeting_message: '',
      audience_rule_ids: [],
      flow_step_ids: [],
      availability_enabled: false,
      business_hours: [],
      timezone: 'America/New_York',
      offline_message_template_id: null,
      show_to_new_visitors_only: false,
      repeat_after_days: null,
      use_knowledge_base: false,
      knowledge_source_preference: 'knowledge_base_first_then_history',
      created_at: now,
      updated_at: now
    };

    bots.push(newBot);
    this._saveToStorage('bots', bots);
    return newBot;
  }

  // Persist condition groups and conditions for a given owner
  _applyConditionGroupsToOwner(ownerType, ownerId, conditionGroupsInput) {
    const conditionGroups = this._getFromStorage('condition_groups');
    const conditions = this._getFromStorage('conditions');

    // Remove existing groups & their conditions for this owner
    const existingGroupIds = conditionGroups
      .filter(g => g.owner_type === ownerType && g.owner_id === ownerId)
      .map(g => g.id);

    const filteredGroups = conditionGroups.filter(
      g => !(g.owner_type === ownerType && g.owner_id === ownerId)
    );
    const filteredConditions = conditions.filter(
      c => !(c.owner_type === 'condition_group' && existingGroupIds.includes(c.owner_id))
    );

    const now = this._nowIso();
    const newGroups = [];

    (conditionGroupsInput || []).forEach((groupInput, index) => {
      const groupId = this._generateId('cgrp');
      const group = {
        id: groupId,
        owner_type: ownerType,
        owner_id: ownerId,
        logic_within_group: groupInput.logicWithinGroup || 'and',
        connector_with_previous: groupInput.connectorWithPrevious || (index === 0 ? 'none' : 'and'),
        condition_ids: []
      };
      newGroups.push(group);
      filteredGroups.push(group);

      (groupInput.conditions || []).forEach(condInput => {
        const condId = this._generateId('cond');
        const cond = {
          id: condId,
          owner_type: 'condition_group',
          owner_id: groupId,
          field: condInput.field,
          operator: condInput.operator,
          value: condInput.value !== undefined ? String(condInput.value) : undefined,
          values: condInput.values || undefined,
          created_at: now
        };
        group.condition_ids.push(condId);
        filteredConditions.push(cond);
      });
    });

    this._saveToStorage('condition_groups', filteredGroups);
    this._saveToStorage('conditions', filteredConditions);

    return newGroups;
  }

  // Choose cheapest plan that satisfies constraints
  _resolveCheapestPlanUnderConstraints(billingType, maxPricePerMonth, requiresAiAssistant, minSeats) {
    const plans = this._getFromStorage('pricing_plans');
    const eligible = plans.filter(p => {
      if (!p.is_active) return false;
      if (p.billing_type !== billingType) return false;
      if (p.price_per_month > maxPricePerMonth) return false;
      if (requiresAiAssistant && !p.includes_ai_assistant) return false;
      if (p.included_seats < minSeats) return false;
      return true;
    });

    if (eligible.length === 0) return null;

    let cheapest = eligible[0];
    for (let i = 1; i < eligible.length; i++) {
      if (eligible[i].price_per_month < cheapest.price_per_month) {
        cheapest = eligible[i];
      }
    }
    return cheapest;
  }

  // Pin report to dashboard at next position
  _pinReportToDashboardInternal(report) {
    const widgets = this._getFromStorage('dashboard_widgets');
    const existing = widgets.find(w => w.report_id === report.id);
    const now = this._nowIso();

    if (existing) {
      existing.title = report.name;
      this._saveToStorage('dashboard_widgets', widgets);
      return existing;
    }

    const row = widgets.length; // simple next row
    const widget = {
      id: this._generateId('dw'),
      report_id: report.id,
      title: report.name,
      row,
      column: 0,
      width: 1,
      created_at: now
    };
    widgets.push(widget);
    this._saveToStorage('dashboard_widgets', widgets);
    return widget;
  }

  // Aggregate counts for home overview
  _calculateHomeOverviewStats() {
    const bots = this._getFromStorage('bots');
    const automations = this._getFromStorage('automations');
    const routingRules = this._getFromStorage('routing_rules');
    const integrations = this._getFromStorage('integrations');

    const activeBotsCount = bots.filter(b => b.status === 'active').length;
    const activeAutomationsCount = automations.filter(a => a.status === 'active').length;
    const activeRoutingRulesCount = routingRules.filter(r => r.status === 'active').length;
    const connectedIntegrationsCount = integrations.filter(i => i.status === 'connected').length;

    return {
      activeBotsCount,
      activeAutomationsCount,
      activeRoutingRulesCount,
      connectedIntegrationsCount
    };
  }

  // -------------------- Interfaces Implementation --------------------

  // getHomeOverview()
  getHomeOverview() {
    const stats = this._calculateHomeOverviewStats();

    const headline = 'AI customer communication control center';
    const subheadline = 'Configure bots, automations, routing, and analytics for your B2B SaaS workspace.';

    const quickLinks = [
      { label: 'Bots', page: 'bots' },
      { label: 'Automations', page: 'automations' },
      { label: 'Routing rules', page: 'routing_rules' },
      { label: 'Analytics', page: 'analytics' },
      { label: 'Integrations', page: 'integrations' },
      { label: 'Pricing', page: 'pricing' }
    ];

    const suggestedNextSteps = [];

    if (stats.activeBotsCount === 0) {
      suggestedNextSteps.push({
        stepId: 'setup_website_bot',
        title: 'Create your first website bot',
        description: 'Configure a website chatbot to capture leads and answer common questions.',
        relatedTaskId: 'task_1'
      });
    }

    if (stats.activeAutomationsCount === 0) {
      suggestedNextSteps.push({
        stepId: 'setup_urgent_auto_reply',
        title: 'Set up urgent support auto-replies',
        description: 'Automatically acknowledge urgent tickets within minutes using AI.',
        relatedTaskId: 'task_2'
      });
    }

    if (stats.activeRoutingRulesCount === 0) {
      suggestedNextSteps.push({
        stepId: 'configure_routing',
        title: 'Route conversations to the right inbox',
        description: 'Automatically send pricing questions to Sales and bugs to Support.',
        relatedTaskId: 'task_3'
      });
    }

    return {
      headline,
      subheadline,
      keyStats: stats,
      quickLinks,
      suggestedNextSteps
    };
  }

  // getBotsOverview()
  getBotsOverview() {
    const bots = this._getFromStorage('bots');
    const channels = this._getFromStorage('channels');
    const conversations = this._getFromStorage('conversations');

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    return bots.map(bot => {
      const channel = channels.find(c => c.id === bot.channel_id) || null;
      const botConvs = conversations.filter(c => c.source_bot_id === bot.id && c.created_at);

      const recentConvs = botConvs.filter(c => {
        const t = Date.parse(c.created_at);
        return !Number.isNaN(t) && now - t <= sevenDaysMs;
      });

      const conversationsLast7Days = recentConvs.length;

      const aiResolvedCount = recentConvs.filter(c => {
        if (typeof c.ai_resolved === 'boolean') return c.ai_resolved;
        return c.resolution_channel === 'ai';
      }).length;

      const aiResolutionRate = conversationsLast7Days > 0
        ? Math.round((aiResolvedCount / conversationsLast7Days) * 100)
        : 0;

      return {
        bot,
        channel,
        status: bot.status,
        conversationsLast7Days,
        aiResolutionRate
      };
    });
  }

  // getBotBuilderState(botId)
  getBotBuilderState(botId) {
    const channels = this._getFromStorage('channels');
    const inboxes = this._getFromStorage('inboxes');
    const offlineMessageTemplates = this._getFromStorage('chat_message_templates').filter(
      t => t.template_type === 'offline'
    );
    const knowledgeBases = this._getFromStorage('knowledge_bases');
    const kbSettingsList = this._getFromStorage('knowledge_base_settings');

    let bot = null;
    if (botId) {
      bot = this._findByIdFromStorage('bots', botId);
    } else {
      bot = this._getOrCreateDraftBot();
    }

    // Choose settings for first KB if any
    let currentKnowledgeBaseSettings = null;
    if (knowledgeBases.length > 0) {
      const kb = knowledgeBases[0];
      currentKnowledgeBaseSettings = kbSettingsList.find(s => s.knowledge_base_id === kb.id) || null;
    }

    const botTemplates = [
      {
        templateName: 'Lead Generation',
        supportedTypes: ['website_chatbot', 'messaging_bot'],
        description: 'Capture visitor details and qualify leads automatically.'
      },
      {
        templateName: 'Support FAQ',
        supportedTypes: ['website_chatbot', 'messaging_bot'],
        description: 'Answer common support questions using your knowledge base.'
      }
    ];

    return {
      bot,
      channels,
      inboxes,
      botTemplates,
      offlineMessageTemplates,
      knowledgeBases,
      currentKnowledgeBaseSettings
    };
  }

  // createOrUpdateBotBasics(botId, name, type, channelId, templateName, greetingMessage)
  createOrUpdateBotBasics(botId, name, type, channelId, templateName, greetingMessage) {
    const bots = this._getFromStorage('bots');
    const now = this._nowIso();
    let bot;
    let message;

    if (botId) {
      bot = bots.find(b => b.id === botId) || null;
      if (!bot) {
        return { success: false, bot: null, message: 'Bot not found' };
      }
      bot.name = name;
      bot.type = type;
      bot.channel_id = channelId;
      bot.template_name = templateName || null;
      bot.greeting_message = greetingMessage || '';
      bot.updated_at = now;
      message = 'Bot updated';
    } else {
      const id = this._generateId('bot');
      bot = {
        id,
        name,
        type,
        channel_id: channelId,
        template_name: templateName || null,
        status: 'draft',
        greeting_message: greetingMessage || '',
        audience_rule_ids: [],
        flow_step_ids: [],
        availability_enabled: false,
        business_hours: [],
        timezone: 'America/New_York',
        offline_message_template_id: null,
        show_to_new_visitors_only: false,
        repeat_after_days: null,
        use_knowledge_base: false,
        knowledge_source_preference: 'knowledge_base_first_then_history',
        created_at: now,
        updated_at: now
      };
      bots.push(bot);
      message = 'Bot created';
    }

    this._saveToStorage('bots', bots);
    return { success: true, bot, message };
  }

  // configureBotTargetingRules(botId, baseAudience, conditionGroups, activateTargetingRule)
  configureBotTargetingRules(botId, baseAudience, conditionGroups, activateTargetingRule) {
    if (activateTargetingRule === undefined) activateTargetingRule = true;

    const bots = this._getFromStorage('bots');
    const targetingRules = this._getFromStorage('targeting_rules');
    const bot = bots.find(b => b.id === botId) || null;
    if (!bot) {
      return { success: false, targetingRule: null, conditionGroups: [] };
    }

    let rule = targetingRules.find(r => r.bot_id === botId) || null;
    const now = this._nowIso();

    if (!rule) {
      rule = {
        id: this._generateId('trg'),
        bot_id: botId,
        base_audience: baseAudience,
        condition_group_id: null,
        is_active: !!activateTargetingRule
      };
      targetingRules.push(rule);
    } else {
      rule.base_audience = baseAudience;
      rule.is_active = !!activateTargetingRule;
    }

    // Apply condition groups
    const groupsForHelper = (conditionGroups || []).map((g, idx) => ({
      logicWithinGroup: g.logicWithinGroup || 'and',
      connectorWithPrevious: g.connectorWithPrevious || (idx === 0 ? 'none' : 'and'),
      conditions: g.conditions || []
    }));

    const createdGroups = this._applyConditionGroupsToOwner('targeting_rule', rule.id, groupsForHelper);
    rule.condition_group_id = createdGroups.length > 0 ? createdGroups[0].id : null;

    this._saveToStorage('targeting_rules', targetingRules);

    // Maintain reference from bot to audience_rule_ids for completeness
    bot.audience_rule_ids = bot.audience_rule_ids || [];
    if (!bot.audience_rule_ids.includes(rule.id)) {
      bot.audience_rule_ids.push(rule.id);
      bot.updated_at = now;
      this._saveToStorage('bots', bots);
    }

    return { success: true, targetingRule: rule, conditionGroups: createdGroups };
  }

  // configureBotFlow(botId, steps)
  configureBotFlow(botId, steps) {
    const bots = this._getFromStorage('bots');
    const bot = bots.find(b => b.id === botId) || null;
    if (!bot) {
      return { success: false, steps: [] };
    }

    let botFlowSteps = this._getFromStorage('bot_flow_steps');
    // Remove existing steps for this bot
    botFlowSteps = botFlowSteps.filter(s => s.bot_id !== botId);

    const createdSteps = [];

    (steps || []).forEach(step => {
      const id = this._generateId('bfs');
      const transformedConditionActions = (step.conditionActions || []).map(ca => ({
        comparison_operator: ca.comparisonOperator,
        comparison_value: ca.comparisonValue,
        action_type: ca.actionType,
        target_inbox_id: ca.targetInboxId || null,
        target_priority: ca.targetPriority || null
      }));

      const newStep = {
        id,
        bot_id: botId,
        step_type: step.stepType,
        label: step.label || null,
        field_key: step.fieldKey || null,
        question_type: step.questionType || null,
        required: step.required !== undefined ? !!step.required : undefined,
        order: step.order,
        prompt_text: step.promptText || null,
        condition_actions: transformedConditionActions.length > 0 ? transformedConditionActions : []
      };

      createdSteps.push(newStep);
      botFlowSteps.push(newStep);
    });

    bot.flow_step_ids = createdSteps.map(s => s.id);
    bot.updated_at = this._nowIso();

    this._saveToStorage('bot_flow_steps', botFlowSteps);
    this._saveToStorage('bots', bots);

    return { success: true, steps: createdSteps };
  }

  // configureBotAvailabilityAndBehavior(botId, availabilityEnabled, businessHours, timezone, offlineMessageTemplateId, showToNewVisitorsOnly, repeatAfterDays)
  configureBotAvailabilityAndBehavior(
    botId,
    availabilityEnabled,
    businessHours,
    timezone,
    offlineMessageTemplateId,
    showToNewVisitorsOnly,
    repeatAfterDays
  ) {
    const bots = this._getFromStorage('bots');
    const bot = bots.find(b => b.id === botId) || null;
    if (!bot) {
      return { success: false, bot: null };
    }

    bot.availability_enabled = !!availabilityEnabled;

    bot.business_hours = (businessHours || []).map(bh => ({
      day_of_week: bh.dayOfWeek,
      start_time: bh.startTime,
      end_time: bh.endTime
    }));

    bot.timezone = timezone;
    bot.offline_message_template_id = offlineMessageTemplateId || null;
    bot.show_to_new_visitors_only = !!showToNewVisitorsOnly;
    bot.repeat_after_days = repeatAfterDays !== undefined ? repeatAfterDays : bot.repeat_after_days;
    bot.updated_at = this._nowIso();

    this._saveToStorage('bots', bots);
    return { success: true, bot };
  }

  // configureBotKnowledgeBaseUsage(botId, useKnowledgeBase, knowledgeSourcePreference)
  configureBotKnowledgeBaseUsage(botId, useKnowledgeBase, knowledgeSourcePreference) {
    const bots = this._getFromStorage('bots');
    const bot = bots.find(b => b.id === botId) || null;
    if (!bot) {
      return { success: false, bot: null };
    }

    bot.use_knowledge_base = !!useKnowledgeBase;
    bot.knowledge_source_preference = knowledgeSourcePreference;
    bot.updated_at = this._nowIso();
    this._saveToStorage('bots', bots);

    return { success: true, bot };
  }

  // activateBot(botId, status)
  activateBot(botId, status) {
    const bots = this._getFromStorage('bots');
    const bot = bots.find(b => b.id === botId) || null;
    if (!bot) {
      return { success: false, bot: null, message: 'Bot not found' };
    }

    bot.status = status;
    bot.updated_at = this._nowIso();
    this._saveToStorage('bots', bots);

    const message = status === 'active' ? 'Bot activated' : 'Bot updated';
    return { success: true, bot, message };
  }

  // getAutomationsOverview()
  getAutomationsOverview() {
    const automations = this._getFromStorage('automations');
    return automations.map(a => ({
      automationRule: a,
      triggerType: a.trigger_type,
      status: a.status,
      lastUpdatedAt: a.updated_at
    }));
  }

  // getAutomationEditorState(automationRuleId)
  getAutomationEditorState(automationRuleId) {
    const automations = this._getFromStorage('automations');
    const channels = this._getFromStorage('channels');
    const emailTemplates = this._getFromStorage('email_templates');

    const automationRule = automationRuleId
      ? automations.find(a => a.id === automationRuleId) || null
      : null;

    return {
      automationRule,
      channels,
      emailTemplates
    };
  }

  // saveAutomationRule(automationRuleId, name, description, triggerType, status, conditions, actions)
  saveAutomationRule(automationRuleId, name, description, triggerType, status, conditions, actions) {
    const automations = this._getFromStorage('automations');
    let automationRule = null;
    const now = this._nowIso();

    if (automationRuleId) {
      automationRule = automations.find(a => a.id === automationRuleId) || null;
      if (!automationRule) {
        return { success: false, automationRule: null, actions: [] };
      }
      automationRule.name = name;
      automationRule.description = description || null;
      automationRule.trigger_type = triggerType;
      automationRule.status = status;
      automationRule.updated_at = now;
    } else {
      automationRule = {
        id: this._generateId('aut'),
        name,
        description: description || null,
        trigger_type: triggerType,
        status,
        condition_group_ids: [],
        action_ids: [],
        created_at: now,
        updated_at: now
      };
      automations.push(automationRule);
    }

    // Apply conditions as a single group linked to this automation rule
    const groupsInput = [
      {
        logicWithinGroup: 'and',
        connectorWithPrevious: 'none',
        conditions: conditions || []
      }
    ];
    const createdGroups = this._applyConditionGroupsToOwner('automation_rule', automationRule.id, groupsInput);
    automationRule.condition_group_ids = createdGroups.map(g => g.id);

    // Manage actions
    let automationActions = this._getFromStorage('automation_actions');
    // Remove existing actions for this rule
    automationActions = automationActions.filter(a => a.automation_rule_id !== automationRule.id);

    const newActions = [];
    (actions || []).forEach(a => {
      const id = this._generateId('aact');
      const act = {
        id,
        automation_rule_id: automationRule.id,
        action_type: a.actionType,
        email_template_id: a.emailTemplateId || null,
        sender_address: a.senderAddress || null,
        subject_template: a.subjectTemplate || null,
        body_template: a.bodyTemplate || null,
        send_without_review: a.sendWithoutReview !== undefined ? !!a.sendWithoutReview : null,
        delay_minutes: a.delayMinutes !== undefined ? a.delayMinutes : null,
        target_inbox_id: a.targetInboxId || null,
        position: a.position
      };
      newActions.push(act);
      automationActions.push(act);
    });

    automationRule.action_ids = newActions.map(a => a.id);
    automationRule.updated_at = now;

    this._saveToStorage('automation_actions', automationActions);
    this._saveToStorage('automations', automations);

    return { success: true, automationRule, actions: newActions };
  }

  // toggleAutomationStatus(automationRuleId, status)
  toggleAutomationStatus(automationRuleId, status) {
    const automations = this._getFromStorage('automations');
    const rule = automations.find(a => a.id === automationRuleId) || null;
    if (!rule) {
      return { success: false, automationRule: null };
    }
    rule.status = status;
    rule.updated_at = this._nowIso();
    this._saveToStorage('automations', automations);
    return { success: true, automationRule: rule };
  }

  // getRoutingRulesOverview()
  getRoutingRulesOverview() {
    return this._getFromStorage('routing_rules');
  }

  // getRoutingRuleEditorState(routingRuleId)
  getRoutingRuleEditorState(routingRuleId) {
    const routingRules = this._getFromStorage('routing_rules');
    const inboxes = this._getFromStorage('inboxes');

    const routingRule = routingRuleId
      ? routingRules.find(r => r.id === routingRuleId) || null
      : null;

    return { routingRule, inboxes };
  }

  // saveRoutingRule(routingRuleId, name, description, status, evaluationEvent, schedule, scope, conditionGroups, branchActions, order)
  saveRoutingRule(
    routingRuleId,
    name,
    description,
    status,
    evaluationEvent,
    schedule,
    scope,
    conditionGroups,
    branchActions,
    order
  ) {
    const routingRules = this._getFromStorage('routing_rules');
    let routingRule = null;
    const now = this._nowIso();

    if (routingRuleId) {
      routingRule = routingRules.find(r => r.id === routingRuleId) || null;
      if (!routingRule) {
        return { success: false, routingRule: null };
      }
      routingRule.name = name;
      routingRule.description = description || null;
      routingRule.status = status;
      routingRule.evaluation_event = evaluationEvent;
      routingRule.schedule = schedule;
      routingRule.scope = scope;
      routingRule.updated_at = now;
    } else {
      routingRule = {
        id: this._generateId('rr'),
        name,
        description: description || null,
        status,
        evaluation_event: evaluationEvent,
        schedule,
        scope,
        condition_group_ids: [],
        branch_actions: [],
        order: 0,
        created_at: now,
        updated_at: now
      };
      routingRules.push(routingRule);
    }

    // Apply condition groups
    const groupsInput = (conditionGroups || []).map((g, idx) => ({
      logicWithinGroup: g.logicWithinGroup || 'and',
      connectorWithPrevious: g.connectorWithPrevious || (idx === 0 ? 'none' : 'or'),
      conditions: g.conditions || []
    }));

    const createdGroups = this._applyConditionGroupsToOwner('routing_rule', routingRule.id, groupsInput);
    routingRule.condition_group_ids = createdGroups.map(g => g.id);

    // Map branch actions to created condition groups
    const branchActionsMapped = (branchActions || []).map(ba => {
      const idx = ba.conditionGroupIndex;
      const group = createdGroups[idx] || null;
      return {
        condition_group_id: group ? group.id : null,
        assign_inbox_id: ba.targetInboxId || null,
        priority: ba.priority || 'normal'
      };
    });

    routingRule.branch_actions = branchActionsMapped;

    if (order !== undefined && order !== null) {
      routingRule.order = order;
    } else {
      // set to last
      const maxOrder = routingRules.reduce(
        (max, r) => (typeof r.order === 'number' && r.order > max ? r.order : max),
        -1
      );
      routingRule.order = maxOrder + 1;
    }

    routingRule.updated_at = now;
    this._saveToStorage('routing_rules', routingRules);

    return { success: true, routingRule };
  }

  // reorderRoutingRules(orderedRuleIds)
  reorderRoutingRules(orderedRuleIds) {
    const routingRules = this._getFromStorage('routing_rules');
    const idToRule = new Map();
    routingRules.forEach(r => idToRule.set(r.id, r));

    orderedRuleIds.forEach((id, index) => {
      const rule = idToRule.get(id);
      if (rule) {
        rule.order = index;
        rule.updated_at = this._nowIso();
      }
    });

    // For rules not in orderedRuleIds, append after
    let nextOrder = orderedRuleIds.length;
    routingRules
      .filter(r => !orderedRuleIds.includes(r.id))
      .forEach(r => {
        r.order = nextOrder++;
        r.updated_at = this._nowIso();
      });

    // Save and return sorted by order
    this._saveToStorage('routing_rules', routingRules);
    const sorted = [...routingRules].sort((a, b) => (a.order || 0) - (b.order || 0));
    return { success: true, routingRules: sorted };
  }

  // toggleRoutingRuleStatus(routingRuleId, status)
  toggleRoutingRuleStatus(routingRuleId, status) {
    const routingRules = this._getFromStorage('routing_rules');
    const rule = routingRules.find(r => r.id === routingRuleId) || null;
    if (!rule) {
      return { success: false, routingRule: null };
    }
    rule.status = status;
    rule.updated_at = this._nowIso();
    this._saveToStorage('routing_rules', routingRules);
    return { success: true, routingRule: rule };
  }

  // getAnalyticsDashboard()
  getAnalyticsDashboard() {
    const widgets = this._getFromStorage('dashboard_widgets');
    const reports = this._getFromStorage('analytics_reports');

    const items = widgets.map(widget => ({
      widget,
      report: reports.find(r => r.id === widget.report_id) || null
    }));

    return { widgets: items };
  }

  // getAnalyticsReportBuilderState(reportId)
  getAnalyticsReportBuilderState(reportId) {
    const reports = this._getFromStorage('analytics_reports');
    const report = reportId ? reports.find(r => r.id === reportId) || null : null;

    const availableReportTypes = ['conversations', 'ai_performance', 'routing', 'bot_performance'];
    const availableMetrics = [
      'ai_resolution_rate',
      'ai_resolved_conversations',
      'conversation_volume',
      'first_response_time'
    ];
    const availableGroupByDimensions = ['channel', 'inbox', 'bot'];

    return {
      report,
      availableReportTypes,
      availableMetrics,
      availableGroupByDimensions
    };
  }

  // saveAnalyticsReport(reportId, ...)
  saveAnalyticsReport(
    reportId,
    name,
    description,
    reportType,
    primaryMetric,
    secondaryMetrics,
    dateRangeType,
    startDate,
    endDate,
    filterConditionGroup,
    groupBy,
    sortByField,
    sortOrder,
    pinToDashboard
  ) {
    const reports = this._getFromStorage('analytics_reports');
    let report = null;
    const now = this._nowIso();

    if (reportId) {
      report = reports.find(r => r.id === reportId) || null;
      if (!report) {
        return { success: false, report: null, dashboardWidget: null };
      }
      report.name = name;
      report.description = description || null;
      report.report_type = reportType;
      report.primary_metric = primaryMetric;
      report.secondary_metrics = secondaryMetrics || [];
      report.date_range_type = dateRangeType;
      report.start_date = dateRangeType === 'custom' ? startDate || null : null;
      report.end_date = dateRangeType === 'custom' ? endDate || null : null;
      report.group_by = groupBy || [];
      report.sort_by_field = sortByField || null;
      report.sort_order = sortOrder || null;
      report.updated_at = now;
    } else {
      report = {
        id: this._generateId('rep'),
        name,
        description: description || null,
        report_type: reportType,
        primary_metric: primaryMetric,
        secondary_metrics: secondaryMetrics || [],
        date_range_type: dateRangeType,
        start_date: dateRangeType === 'custom' ? startDate || null : null,
        end_date: dateRangeType === 'custom' ? endDate || null : null,
        filter_condition_group_id: null,
        group_by: groupBy || [],
        sort_by_field: sortByField || null,
        sort_order: sortOrder || null,
        is_pinned: false,
        created_at: now,
        updated_at: now
      };
      reports.push(report);
    }

    // Apply filter condition group
    if (filterConditionGroup && filterConditionGroup.conditions && filterConditionGroup.conditions.length > 0) {
      const groupsInput = [
        {
          logicWithinGroup: filterConditionGroup.logicWithinGroup || 'and',
          connectorWithPrevious: 'none',
          conditions: filterConditionGroup.conditions || []
        }
      ];
      const createdGroups = this._applyConditionGroupsToOwner('analytics_report', report.id, groupsInput);
      report.filter_condition_group_id = createdGroups.length > 0 ? createdGroups[0].id : null;
    } else {
      report.filter_condition_group_id = null;
      // Remove existing filter groups if any
      this._applyConditionGroupsToOwner('analytics_report', report.id, []);
    }

    let dashboardWidget = null;
    if (pinToDashboard) {
      report.is_pinned = true;
      dashboardWidget = this._pinReportToDashboardInternal(report);
    }

    this._saveToStorage('analytics_reports', reports);

    return { success: true, report, dashboardWidget };
  }

  // updateDashboardWidgetLayout(widgetId, row, column, width)
  updateDashboardWidgetLayout(widgetId, row, column, width) {
    const widgets = this._getFromStorage('dashboard_widgets');
    const widget = widgets.find(w => w.id === widgetId) || null;
    if (!widget) {
      return { success: false, widget: null };
    }
    widget.row = row;
    widget.column = column;
    if (width !== undefined && width !== null) {
      widget.width = width;
    }
    this._saveToStorage('dashboard_widgets', widgets);
    return { success: true, widget };
  }

  // getIntegrationsOverview()
  getIntegrationsOverview() {
    return this._getFromStorage('integrations');
  }

  // getIntegrationConfigState(integrationId)
  getIntegrationConfigState(integrationId) {
    const integrations = this._getFromStorage('integrations');
    const integration = integrations.find(i => i.id === integrationId) || null;

    const availablePlatformFields = ['Customer email', 'Customer full name', 'Company name'];
    const availableCrmFieldsByObject = {
      contact: ['Contact Email', 'Contact Name'],
      account: ['Account Name']
    };

    return {
      integration,
      availablePlatformFields,
      availableCrmFieldsByObject
    };
  }

  // configureCrmIntegration(integrationId, apiKey, environment, syncNewConversations, autoCreateContacts, fieldMappings)
  configureCrmIntegration(
    integrationId,
    apiKey,
    environment,
    syncNewConversations,
    autoCreateContacts,
    fieldMappings
  ) {
    const integrations = this._getFromStorage('integrations');
    let integration = integrations.find(i => i.id === integrationId) || null;
    if (!integration) {
      return { success: false, integration: null, fieldMappings: [] };
    }

    integration.api_key = apiKey;
    integration.environment = environment;
    integration.sync_new_conversations = !!syncNewConversations;
    integration.auto_create_contacts = !!autoCreateContacts;
    integration.status = 'connected';
    integration.updated_at = this._nowIso();

    let mappings = this._getFromStorage('integration_field_mappings');
    // Remove existing mappings for this integration
    mappings = mappings.filter(m => m.integration_id !== integrationId);

    const newMappings = [];
    (fieldMappings || []).forEach(m => {
      const id = this._generateId('ifm');
      const rec = {
        id,
        integration_id: integrationId,
        platform_field: m.platformField,
        crm_object_type: m.crmObjectType,
        crm_field: m.crmField,
        is_primary: !!m.isPrimary
      };
      newMappings.push(rec);
      mappings.push(rec);
    });

    this._saveToStorage('integration_field_mappings', mappings);
    this._saveToStorage('integrations', integrations);

    return { success: true, integration, fieldMappings: newMappings };
  }

  // getKnowledgeBaseOverview()
  getKnowledgeBaseOverview() {
    const knowledgeBases = this._getFromStorage('knowledge_bases');
    return { knowledgeBases };
  }

  // getKnowledgeBaseArticles(knowledgeBaseId)
  getKnowledgeBaseArticles(knowledgeBaseId) {
    const knowledgeBases = this._getFromStorage('knowledge_bases');
    const articlesAll = this._getFromStorage('knowledge_base_articles');

    const knowledgeBase = knowledgeBases.find(kb => kb.id === knowledgeBaseId) || null;
    const articles = articlesAll.filter(a => a.knowledge_base_id === knowledgeBaseId);

    return { knowledgeBase, articles };
  }

  // createOrUpdateKnowledgeBaseArticle(articleId, knowledgeBaseId, title, content, visibility, keywords, status)
  createOrUpdateKnowledgeBaseArticle(
    articleId,
    knowledgeBaseId,
    title,
    content,
    visibility,
    keywords,
    status
  ) {
    const articles = this._getFromStorage('knowledge_base_articles');
    const now = this._nowIso();
    let article = null;

    if (articleId) {
      article = articles.find(a => a.id === articleId) || null;
      if (!article) {
        return { success: false, article: null };
      }
      article.knowledge_base_id = knowledgeBaseId;
      article.title = title;
      article.content = content;
      article.visibility = visibility;
      article.keywords = keywords || [];
      article.status = status;
      article.updated_at = now;
    } else {
      const id = this._generateId('kba');
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      article = {
        id,
        knowledge_base_id: knowledgeBaseId,
        title,
        slug,
        content,
        visibility,
        keywords: keywords || [],
        status,
        created_at: now,
        updated_at: now
      };
      articles.push(article);
    }

    this._saveToStorage('knowledge_base_articles', articles);
    return { success: true, article };
  }

  // getKnowledgeBaseSettingsState(knowledgeBaseId)
  getKnowledgeBaseSettingsState(knowledgeBaseId) {
    const knowledgeBases = this._getFromStorage('knowledge_bases');
    const settingsList = this._getFromStorage('knowledge_base_settings');
    const knowledgeBase = knowledgeBases.find(kb => kb.id === knowledgeBaseId) || null;
    const settings = settingsList.find(s => s.knowledge_base_id === knowledgeBaseId) || null;
    return {
      knowledgeBase,
      settings
    };
  }

  // updateKnowledgeBaseSettings(knowledgeBaseId, useForAiAnswers, preferredSource, applyToBots)
  updateKnowledgeBaseSettings(knowledgeBaseId, useForAiAnswers, preferredSource, applyToBots) {
    const settingsList = this._getFromStorage('knowledge_base_settings');
    let settings = settingsList.find(s => s.knowledge_base_id === knowledgeBaseId) || null;
    const now = this._nowIso();

    if (!settings) {
      settings = {
        id: this._generateId('kbs'),
        knowledge_base_id: knowledgeBaseId,
        use_for_ai_answers: !!useForAiAnswers,
        preferred_source: preferredSource,
        apply_to_bots: !!applyToBots,
        last_updated: now
      };
      settingsList.push(settings);
    } else {
      settings.use_for_ai_answers = !!useForAiAnswers;
      settings.preferred_source = preferredSource;
      settings.apply_to_bots = !!applyToBots;
      settings.last_updated = now;
    }

    this._saveToStorage('knowledge_base_settings', settingsList);
    return settings;
  }

  // getUsersAndTeamOverview()
  getUsersAndTeamOverview() {
    const agents = this._getFromStorage('agents');
    const inboxes = this._getFromStorage('inboxes');
    return {
      agents,
      inboxes
    };
  }

  // getInboxSettings(inboxId)
  getInboxSettings(inboxId) {
    const inboxes = this._getFromStorage('inboxes');
    const agents = this._getFromStorage('agents');

    const inbox = inboxes.find(i => i.id === inboxId) || null;
    const teamMembers = agents.filter(a =>
      Array.isArray(a.assigned_inbox_ids) && a.assigned_inbox_ids.includes(inboxId)
    );

    return {
      inbox,
      teamMembers
    };
  }

  // updateInboxTeamMembers(inboxId, memberIds)
  updateInboxTeamMembers(inboxId, memberIds) {
    const inboxes = this._getFromStorage('inboxes');
    const agents = this._getFromStorage('agents');

    const inbox = inboxes.find(i => i.id === inboxId) || null;
    if (!inbox) {
      return { success: false, inbox: null, teamMembers: [] };
    }

    const memberIdSet = new Set(memberIds || []);

    agents.forEach(agent => {
      if (!Array.isArray(agent.assigned_inbox_ids)) {
        agent.assigned_inbox_ids = [];
      }
      if (memberIdSet.has(agent.id)) {
        if (!agent.assigned_inbox_ids.includes(inboxId)) {
          agent.assigned_inbox_ids.push(inboxId);
        }
      } else {
        // Remove inboxId from agents no longer in the list
        agent.assigned_inbox_ids = agent.assigned_inbox_ids.filter(id => id !== inboxId);
      }
    });

    this._saveToStorage('agents', agents);

    const teamMembers = agents.filter(a =>
      Array.isArray(a.assigned_inbox_ids) && a.assigned_inbox_ids.includes(inboxId)
    );

    return { success: true, inbox, teamMembers };
  }

  // getPricingPlans(billingType)
  getPricingPlans(billingType) {
    const plans = this._getFromStorage('pricing_plans');
    if (!billingType) return plans;
    return plans.filter(p => p.billing_type === billingType);
  }

  // startTrialForPlan(planId)
  startTrialForPlan(planId) {
    const plans = this._getFromStorage('pricing_plans');
    const plan = plans.find(p => p.id === planId) || null;
    if (!plan) {
      return { plan: null, trialSignup: null };
    }

    const trialSignups = this._getFromStorage('trial_signups');
    const now = this._nowIso();
    const id = this._generateId('trial');

    const trialSignup = {
      id,
      plan_id: planId,
      started_at: now,
      company_name: null,
      company_size: null,
      email: null,
      role: null,
      use_ai_features: null,
      submitted_at: null
    };

    trialSignups.push(trialSignup);
    this._saveToStorage('trial_signups', trialSignups);

    return { plan, trialSignup };
  }

  // submitTrialSignupForm(trialId, companyName, companySize, email, role, useAiFeatures)
  submitTrialSignupForm(trialId, companyName, companySize, email, role, useAiFeatures) {
    const trialSignups = this._getFromStorage('trial_signups');
    const signup = trialSignups.find(t => t.id === trialId) || null;
    if (!signup) {
      return null;
    }

    signup.company_name = companyName;
    signup.company_size = companySize;
    signup.email = email;
    signup.role = role;
    signup.use_ai_features = !!useAiFeatures;
    signup.submitted_at = this._nowIso();

    this._saveToStorage('trial_signups', trialSignups);
    return signup;
  }
}


// For browser environment
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}

// For Node.js environment (testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}