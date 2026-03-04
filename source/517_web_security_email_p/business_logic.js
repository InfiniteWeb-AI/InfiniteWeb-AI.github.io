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

class BusinessLogic {
  constructor() {
    this._initStorage();
    this.idCounter = parseInt(localStorage.getItem('idCounter') || '1000');
  }

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const ensure = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core entity tables
    ensure('plans', []); // Plan
    ensure('trial_signups', []); // TrialSignup
    ensure('mail_folders', []); // MailFolder
    ensure('spam_filtering_policies', []); // SpamFilteringPolicy
    ensure('attachment_control_rules', []); // AttachmentControlRule
    ensure('alert_rules', []); // AlertRule
    ensure('allowed_domains', []); // AllowedDomain
    ensure('blocked_email_addresses', []); // BlockedEmailAddress
    ensure('blocked_domains', []); // BlockedDomain
    ensure('email_log_entries', []); // EmailLogEntry
    ensure('scheduled_reports', []); // ScheduledReport
    ensure('protection_policies', []); // ProtectionPolicy
    ensure('mailboxes', []); // Mailbox
    ensure('temporary_allow_rules', []); // TemporaryAllowRule

    // Additional tables for non-entity interfaces
    ensure('contact_requests', []); // For submitContactRequest

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (raw === null || typeof raw === 'undefined') return defaultValue;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    this.idCounter = next;
    return next;
  }

  // Internal helper to generate unique identifiers for new entities
  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // Internal helper to compute concrete from/to timestamps from UI presets
  _computeDateRange(presetOrRange) {
    if (presetOrRange && typeof presetOrRange === 'object') {
      return {
        from: presetOrRange.from,
        to: presetOrRange.to
      };
    }

    const now = new Date();
    let from;

    if (presetOrRange === 'last_24_hours') {
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (presetOrRange === 'last_7_days') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (presetOrRange === 'last_30_days') {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      // Default to last 24 hours
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return {
      from: from.toISOString(),
      to: now.toISOString()
    };
  }

  _nowISO() {
    return new Date().toISOString();
  }

  // -------------------- Marketing / static content interfaces --------------------

  // getHomeContent()
  getHomeContent() {
    return {
      headline: 'Protect every mailbox from phishing, malware and spam',
      subheadline: 'Cloud-native email security that stops advanced threats before they reach your users.',
      bullet_points: [
        'Advanced phishing and impersonation protection',
        'Real-time malware and ransomware blocking',
        'Policy-based controls for attachments and marketing spam',
        'Detailed quarantine visibility and alerting'
      ],
      primary_cta_label: 'View Pricing',
      primary_cta_target: 'view_pricing',
      secondary_cta_label: 'Start Free Trial',
      secondary_cta_target: 'start_trial',
      show_dashboard_link: true
    };
  }

  // getPricingPlansForDisplay(includeInactive = false)
  getPricingPlansForDisplay(includeInactive) {
    const plans = this._getFromStorage('plans', []);
    const include = typeof includeInactive === 'boolean' ? includeInactive : false;
    if (include) return plans;
    return plans.filter(p => p.status === 'active');
  }

  // startTrialSignup(full_name, business_email, num_mailboxes, selected_plan_id)
  startTrialSignup(full_name, business_email, num_mailboxes, selected_plan_id) {
    const plans = this._getFromStorage('plans', []);

    if (!full_name || !business_email || !selected_plan_id || !num_mailboxes) {
      return {
        success: false,
        message: 'Missing required fields.',
        trial_signup_id: null,
        selected_plan_name: null,
        status: null
      };
    }

    const emailValid = typeof business_email === 'string' && business_email.indexOf('@') !== -1;
    if (!emailValid) {
      return {
        success: false,
        message: 'Invalid email address.',
        trial_signup_id: null,
        selected_plan_name: null,
        status: null
      };
    }

    const plan = plans.find(p => p.id === selected_plan_id);
    if (!plan) {
      return {
        success: false,
        message: 'Selected plan not found.',
        trial_signup_id: null,
        selected_plan_name: null,
        status: null
      };
    }

    if (plan.status !== 'active') {
      return {
        success: false,
        message: 'Selected plan is not active.',
        trial_signup_id: null,
        selected_plan_name: plan.name,
        status: null
      };
    }

    if (!plan.is_trial_available) {
      return {
        success: false,
        message: 'Free trial is not available for this plan.',
        trial_signup_id: null,
        selected_plan_name: plan.name,
        status: null
      };
    }

    if (num_mailboxes > plan.max_mailboxes_supported) {
      return {
        success: false,
        message: 'Number of mailboxes exceeds plan limit.',
        trial_signup_id: null,
        selected_plan_name: plan.name,
        status: null
      };
    }

    const trial_signups = this._getFromStorage('trial_signups', []);
    const id = this._generateId('trial_signup');
    const created_at = this._nowISO();
    const status = 'submitted';

    const trial = {
      id,
      full_name,
      business_email,
      num_mailboxes,
      selected_plan_id,
      created_at,
      status
    };

    trial_signups.push(trial);
    this._saveToStorage('trial_signups', trial_signups);

    return {
      success: true,
      message: 'Trial signup submitted.',
      trial_signup_id: id,
      selected_plan_name: plan.name,
      status
    };
  }

  // getFeaturesContent()
  getFeaturesContent() {
    return {
      feature_groups: [
        {
          group_title: 'Threat Protection',
          group_description: 'Defend users against phishing, malware and account takeover.',
          features: [
            {
              title: 'Advanced phishing protection',
              description: 'Detects and blocks targeted phishing, impersonation and business email compromise attacks.',
              icon_key: 'phishing_protection'
            },
            {
              title: 'Malware and ransomware blocking',
              description: 'Multi-engine malware scanning with sandboxing and file-type controls.',
              icon_key: 'malware_blocking'
            }
          ]
        },
        {
          group_title: 'Policy & Control',
          group_description: 'Fine-grained controls for attachments, spam and marketing mail.',
          features: [
            {
              title: 'Spam filtering policies',
              description: 'Create policies by sender, subject, or content and route messages to the right folders.',
              icon_key: 'spam_filtering'
            },
            {
              title: 'Attachment control',
              description: 'Block, quarantine or allow attachments based on size, type or origin.',
              icon_key: 'attachment_control'
            }
          ]
        },
        {
          group_title: 'Visibility & Reporting',
          group_description: 'Stay ahead of threats with logs, alerts and scheduled reports.',
          features: [
            {
              title: 'Email logs',
              description: 'Search every message and see exactly which policy took action.',
              icon_key: 'email_logs'
            },
            {
              title: 'Alerts & reports',
              description: 'Get notified about unusual activity and receive daily quarantine summaries.',
              icon_key: 'alerts_reports'
            }
          ]
        }
      ],
      cta_to_pricing_label: 'Compare plans',
      cta_to_trial_label: 'Start your free trial'
    };
  }

  // getHowItWorksContent()
  getHowItWorksContent() {
    return {
      flow_steps: [
        {
          step_number: 1,
          title: 'Connect your email domain',
          description: 'Point MX records or connect via API to start routing mail through the security service.'
        },
        {
          step_number: 2,
          title: 'Apply protection policies',
          description: 'Assign protection bundles and create spam, attachment and allow/block policies.'
        },
        {
          step_number: 3,
          title: 'Monitor threats and adjust',
          description: 'Use logs, alerts and reports to fine-tune policies and stay ahead of emerging threats.'
        }
      ],
      use_cases: [
        {
          use_case_key: 'blocking_malware',
          title: 'Block malware before it hits inboxes',
          summary: 'Automatically detect and block malicious attachments and URLs using multi-layer inspection.'
        },
        {
          use_case_key: 'marketing_spam_management',
          title: 'Tame marketing and promotional email',
          summary: 'Route low-value but legitimate promotions into dedicated folders instead of cluttering inboxes.'
        }
      ],
      cta_to_dashboard_label: 'Go to dashboard',
      cta_to_pricing_label: 'View pricing'
    };
  }

  // getDashboardOverview()
  getDashboardOverview() {
    const time_window_label = 'last_24_hours';
    const range = this._computeDateRange(time_window_label);
    const logs = this._getFromStorage('email_log_entries', []);

    const fromTime = new Date(range.from).getTime();
    const toTime = new Date(range.to).getTime();

    const inWindow = logs.filter(entry => {
      const ts = new Date(entry.timestamp).getTime();
      return ts >= fromTime && ts <= toTime;
    });

    let quarantined_messages_count = 0;
    let blocked_malware_count = 0;
    let blocked_spam_count = 0;

    const domainCountMap = {};

    for (const entry of inWindow) {
      if (entry.status === 'quarantined') quarantined_messages_count++;
      if (entry.status === 'blocked_malware') blocked_malware_count++;
      if (entry.status === 'blocked_spam') blocked_spam_count++;

      const domain = entry.sender_domain || '';
      if (!domain) continue;
      if (!domainCountMap[domain]) {
        domainCountMap[domain] = 0;
      }
      // Count all threat-related outcomes
      if (
        entry.status === 'blocked_malware' ||
        entry.status === 'quarantined' ||
        entry.status === 'blocked_spam' ||
        entry.status === 'blocked_policy'
      ) {
        domainCountMap[domain] += 1;
      }
    }

    const top_threat_sender_domains = Object.keys(domainCountMap)
      .map(domain => ({ sender_domain: domain, message_count: domainCountMap[domain] }))
      .sort((a, b) => b.message_count - a.message_count)
      .slice(0, 5);

    const alert_rules = this._getFromStorage('alert_rules', []);
    const recent_alerts = alert_rules.map(rule => ({
      alert_rule_id: rule.id,
      alert_name: rule.name,
      last_triggered_at: '', // No event storage; derived purely from stored rules
      status: rule.is_enabled ? 'active' : 'muted'
    }));

    const open_alerts_count = alert_rules.filter(r => r.is_enabled).length;

    const quick_links = [
      { target: 'policies', label: 'Manage policies' },
      { target: 'alerts', label: 'Configure alerts' },
      { target: 'reports', label: 'View reports' },
      { target: 'email_logs', label: 'Search email logs' },
      { target: 'users', label: 'Users & mailboxes' },
      { target: 'settings', label: 'Settings' }
    ];

    return {
      time_window_label,
      quarantined_messages_count,
      blocked_malware_count,
      blocked_spam_count,
      open_alerts_count,
      top_threat_sender_domains,
      recent_alerts,
      quick_links
    };
  }

  // -------------------- Policies: Spam Filtering --------------------

  // getPoliciesOverview()
  getPoliciesOverview() {
    const spamPolicies = this._getFromStorage('spam_filtering_policies', []);
    const attachmentRules = this._getFromStorage('attachment_control_rules', []);
    const folders = this._getFromStorage('mail_folders', []);

    const spam_filtering_policies = spamPolicies.map(policy => {
      const folder = folders.find(f => f.id === policy.target_folder_id) || null;
      return {
        id: policy.id,
        name: policy.name,
        sender_scope: policy.sender_scope,
        action_type: policy.action_type,
        spam_sensitivity_level: policy.spam_sensitivity_level,
        is_enabled: policy.is_enabled,
        target_folder_id: policy.target_folder_id || null,
        target_folder_name: folder ? folder.name : null,
        target_folder: folder || null,
        created_at: policy.created_at
      };
    });

    const attachment_control_rules = attachmentRules.map(rule => ({
      id: rule.id,
      name: rule.name,
      sender_scope: rule.sender_scope,
      size_condition_type: rule.size_condition_type,
      size_threshold: rule.size_threshold,
      size_unit: rule.size_unit,
      action_type: rule.action_type,
      notify_recipient: rule.notify_recipient,
      is_enabled: rule.is_enabled,
      created_at: rule.created_at
    }));

    return {
      spam_filtering_policies,
      attachment_control_rules
    };
  }

  // getSpamFilteringPolicyEditorData()
  getSpamFilteringPolicyEditorData() {
    const available_folders = this._getFromStorage('mail_folders', []);
    const subject_match_logic_options = ['any_keyword', 'all_keywords'];
    const sender_scope_options = ['external_senders_only', 'internal_senders_only', 'all_senders'];
    const action_type_options = ['move_to_folder', 'quarantine', 'delete_message', 'mark_as_spam', 'allow'];

    // Derive default spam sensitivity from a default protection policy if present
    const protection_policies = this._getFromStorage('protection_policies', []);
    let default_spam_sensitivity_level = 5;
    const defaultPolicy = protection_policies.find(p => p.is_default && typeof p.default_spam_sensitivity_level === 'number');
    if (defaultPolicy) {
      default_spam_sensitivity_level = defaultPolicy.default_spam_sensitivity_level;
    }

    return {
      available_folders,
      subject_match_logic_options,
      sender_scope_options,
      action_type_options,
      default_spam_sensitivity_level
    };
  }

  // createSpamFilteringPolicy(name, description, subject_keywords, subject_match_logic, sender_scope, action_type, target_folder_id, spam_sensitivity_level, is_enabled)
  createSpamFilteringPolicy(name, description, subject_keywords, subject_match_logic, sender_scope, action_type, target_folder_id, spam_sensitivity_level, is_enabled) {
    if (!name) {
      return { success: false, message: 'Policy name is required.', policy_id: null, policy_name: null };
    }

    const senderScopes = ['external_senders_only', 'internal_senders_only', 'all_senders'];
    const actionTypes = ['move_to_folder', 'quarantine', 'delete_message', 'mark_as_spam', 'allow'];

    if (senderScopes.indexOf(sender_scope) === -1) {
      return { success: false, message: 'Invalid sender_scope.', policy_id: null, policy_name: null };
    }
    if (actionTypes.indexOf(action_type) === -1) {
      return { success: false, message: 'Invalid action_type.', policy_id: null, policy_name: null };
    }

    if (typeof spam_sensitivity_level !== 'number' || spam_sensitivity_level < 1 || spam_sensitivity_level > 10) {
      return { success: false, message: 'spam_sensitivity_level must be between 1 and 10.', policy_id: null, policy_name: null };
    }

    const folders = this._getFromStorage('mail_folders', []);
    let resolved_target_folder_id = null;

    if (action_type === 'move_to_folder') {
      const folder = folders.find(f => f.id === target_folder_id);
      if (!folder) {
        return { success: false, message: 'target_folder_id is required for move_to_folder and must exist.', policy_id: null, policy_name: null };
      }
      resolved_target_folder_id = folder.id;
    }

    const policies = this._getFromStorage('spam_filtering_policies', []);
    const id = this._generateId('spam_policy');

    const policy = {
      id,
      name,
      description: description || '',
      subject_keywords: Array.isArray(subject_keywords) ? subject_keywords : [],
      subject_match_logic: subject_match_logic || 'any_keyword',
      sender_scope,
      action_type,
      target_folder_id: resolved_target_folder_id,
      spam_sensitivity_level,
      is_enabled: typeof is_enabled === 'boolean' ? is_enabled : true,
      created_at: this._nowISO(),
      updated_at: null
    };

    policies.push(policy);
    this._saveToStorage('spam_filtering_policies', policies);

    return {
      success: true,
      message: 'Spam filtering policy created.',
      policy_id: id,
      policy_name: name
    };
  }

  // updateSpamFilteringPolicy(policyId, ...)
  updateSpamFilteringPolicy(policyId, name, description, subject_keywords, subject_match_logic, sender_scope, action_type, target_folder_id, spam_sensitivity_level, is_enabled) {
    const policies = this._getFromStorage('spam_filtering_policies', []);
    const index = policies.findIndex(p => p.id === policyId);
    if (index === -1) {
      return { success: false, message: 'Policy not found.' };
    }

    const policy = policies[index];

    if (typeof name !== 'undefined') policy.name = name;
    if (typeof description !== 'undefined') policy.description = description;
    if (typeof subject_keywords !== 'undefined') policy.subject_keywords = Array.isArray(subject_keywords) ? subject_keywords : [];
    if (typeof subject_match_logic !== 'undefined') policy.subject_match_logic = subject_match_logic;

    const senderScopes = ['external_senders_only', 'internal_senders_only', 'all_senders'];
    const actionTypes = ['move_to_folder', 'quarantine', 'delete_message', 'mark_as_spam', 'allow'];

    if (typeof sender_scope !== 'undefined') {
      if (senderScopes.indexOf(sender_scope) === -1) {
        return { success: false, message: 'Invalid sender_scope.' };
      }
      policy.sender_scope = sender_scope;
    }

    if (typeof action_type !== 'undefined') {
      if (actionTypes.indexOf(action_type) === -1) {
        return { success: false, message: 'Invalid action_type.' };
      }
      policy.action_type = action_type;
    }

    if (typeof spam_sensitivity_level !== 'undefined') {
      if (typeof spam_sensitivity_level !== 'number' || spam_sensitivity_level < 1 || spam_sensitivity_level > 10) {
        return { success: false, message: 'spam_sensitivity_level must be between 1 and 10.' };
      }
      policy.spam_sensitivity_level = spam_sensitivity_level;
    }

    const folders = this._getFromStorage('mail_folders', []);
    if (policy.action_type === 'move_to_folder') {
      const finalTargetFolderId = typeof target_folder_id !== 'undefined' ? target_folder_id : policy.target_folder_id;
      const folder = folders.find(f => f.id === finalTargetFolderId);
      if (!folder) {
        return { success: false, message: 'target_folder_id is required for move_to_folder and must exist.' };
      }
      policy.target_folder_id = folder.id;
    } else if (typeof target_folder_id !== 'undefined') {
      // If action is not move_to_folder, ignore target_folder_id but allow clearing it
      policy.target_folder_id = null;
    }

    if (typeof is_enabled !== 'undefined') {
      policy.is_enabled = !!is_enabled;
    }

    policy.updated_at = this._nowISO();
    policies[index] = policy;
    this._saveToStorage('spam_filtering_policies', policies);

    return { success: true, message: 'Spam filtering policy updated.' };
  }

  // setSpamFilteringPolicyEnabledStatus(policyId, is_enabled)
  setSpamFilteringPolicyEnabledStatus(policyId, is_enabled) {
    const policies = this._getFromStorage('spam_filtering_policies', []);
    const index = policies.findIndex(p => p.id === policyId);
    if (index === -1) {
      return { success: false };
    }
    policies[index].is_enabled = !!is_enabled;
    policies[index].updated_at = this._nowISO();
    this._saveToStorage('spam_filtering_policies', policies);
    return { success: true };
  }

  // -------------------- Policies: Attachment Control --------------------

  // getAttachmentControlRuleEditorData()
  getAttachmentControlRuleEditorData() {
    const sender_scope_options = ['external_senders_only', 'internal_senders_only', 'all_senders'];
    const size_condition_type_options = ['larger_than', 'smaller_than_or_equal', 'equal_to'];
    const size_unit_options = ['kb', 'mb', 'gb'];
    const action_type_options = ['block_message', 'allow', 'quarantine'];

    const protection_policies = this._getFromStorage('protection_policies', []);
    let default_size_threshold_mb = 10;
    const defaultPolicy = protection_policies.find(p => p.is_default && typeof p.default_attachment_size_limit_mb === 'number');
    if (defaultPolicy) {
      default_size_threshold_mb = defaultPolicy.default_attachment_size_limit_mb;
    }

    return {
      sender_scope_options,
      size_condition_type_options,
      size_unit_options,
      action_type_options,
      default_size_threshold_mb
    };
  }

  // createAttachmentControlRule(name, description, sender_scope, size_condition_type, size_threshold, size_unit, action_type, notify_recipient, notification_message, is_enabled)
  createAttachmentControlRule(name, description, sender_scope, size_condition_type, size_threshold, size_unit, action_type, notify_recipient, notification_message, is_enabled) {
    if (!name) {
      return { success: false, message: 'Rule name is required.', rule_id: null, rule_name: null };
    }

    const senderScopes = ['external_senders_only', 'internal_senders_only', 'all_senders'];
    const sizeConditions = ['larger_than', 'smaller_than_or_equal', 'equal_to'];
    const sizeUnits = ['kb', 'mb', 'gb'];
    const actionTypes = ['block_message', 'allow', 'quarantine'];

    if (senderScopes.indexOf(sender_scope) === -1) {
      return { success: false, message: 'Invalid sender_scope.', rule_id: null, rule_name: null };
    }
    if (sizeConditions.indexOf(size_condition_type) === -1) {
      return { success: false, message: 'Invalid size_condition_type.', rule_id: null, rule_name: null };
    }
    if (sizeUnits.indexOf(size_unit) === -1) {
      return { success: false, message: 'Invalid size_unit.', rule_id: null, rule_name: null };
    }
    if (actionTypes.indexOf(action_type) === -1) {
      return { success: false, message: 'Invalid action_type.', rule_id: null, rule_name: null };
    }
    if (typeof size_threshold !== 'number' || size_threshold <= 0) {
      return { success: false, message: 'size_threshold must be a positive number.', rule_id: null, rule_name: null };
    }

    const rules = this._getFromStorage('attachment_control_rules', []);
    const id = this._generateId('attachment_rule');

    const rule = {
      id,
      name,
      description: description || '',
      sender_scope,
      size_condition_type,
      size_threshold,
      size_unit,
      action_type,
      notify_recipient: !!notify_recipient,
      notification_message: notification_message || '',
      is_enabled: typeof is_enabled === 'boolean' ? is_enabled : true,
      created_at: this._nowISO(),
      updated_at: null
    };

    rules.push(rule);
    this._saveToStorage('attachment_control_rules', rules);

    return {
      success: true,
      message: 'Attachment control rule created.',
      rule_id: id,
      rule_name: name
    };
  }

  // updateAttachmentControlRule(ruleId, ...)
  updateAttachmentControlRule(ruleId, name, description, sender_scope, size_condition_type, size_threshold, size_unit, action_type, notify_recipient, notification_message, is_enabled) {
    const rules = this._getFromStorage('attachment_control_rules', []);
    const index = rules.findIndex(r => r.id === ruleId);
    if (index === -1) {
      return { success: false };
    }

    const rule = rules[index];

    const senderScopes = ['external_senders_only', 'internal_senders_only', 'all_senders'];
    const sizeConditions = ['larger_than', 'smaller_than_or_equal', 'equal_to'];
    const sizeUnits = ['kb', 'mb', 'gb'];
    const actionTypes = ['block_message', 'allow', 'quarantine'];

    if (typeof name !== 'undefined') rule.name = name;
    if (typeof description !== 'undefined') rule.description = description;

    if (typeof sender_scope !== 'undefined') {
      if (senderScopes.indexOf(sender_scope) === -1) return { success: false };
      rule.sender_scope = sender_scope;
    }

    if (typeof size_condition_type !== 'undefined') {
      if (sizeConditions.indexOf(size_condition_type) === -1) return { success: false };
      rule.size_condition_type = size_condition_type;
    }

    if (typeof size_threshold !== 'undefined') {
      if (typeof size_threshold !== 'number' || size_threshold <= 0) return { success: false };
      rule.size_threshold = size_threshold;
    }

    if (typeof size_unit !== 'undefined') {
      if (sizeUnits.indexOf(size_unit) === -1) return { success: false };
      rule.size_unit = size_unit;
    }

    if (typeof action_type !== 'undefined') {
      if (actionTypes.indexOf(action_type) === -1) return { success: false };
      rule.action_type = action_type;
    }

    if (typeof notify_recipient !== 'undefined') rule.notify_recipient = !!notify_recipient;
    if (typeof notification_message !== 'undefined') rule.notification_message = notification_message;
    if (typeof is_enabled !== 'undefined') rule.is_enabled = !!is_enabled;

    rule.updated_at = this._nowISO();
    rules[index] = rule;
    this._saveToStorage('attachment_control_rules', rules);

    return { success: true };
  }

  // setAttachmentControlRuleEnabledStatus(ruleId, is_enabled)
  setAttachmentControlRuleEnabledStatus(ruleId, is_enabled) {
    const rules = this._getFromStorage('attachment_control_rules', []);
    const index = rules.findIndex(r => r.id === ruleId);
    if (index === -1) {
      return { success: false };
    }
    rules[index].is_enabled = !!is_enabled;
    rules[index].updated_at = this._nowISO();
    this._saveToStorage('attachment_control_rules', rules);
    return { success: true };
  }

  // -------------------- Alerts --------------------

  // getAlertRules()
  getAlertRules() {
    const alertRules = this._getFromStorage('alert_rules', []);
    return alertRules.map(rule => ({
      id: rule.id,
      name: rule.name,
      metric: rule.metric,
      condition_operator: rule.condition_operator,
      threshold: rule.threshold,
      time_window_minutes: rule.time_window_minutes,
      recipient_emails: rule.recipient_emails,
      delivery_method: rule.delivery_method,
      is_enabled: rule.is_enabled,
      created_at: rule.created_at
    }));
  }

  // getAlertRuleEditorOptions()
  getAlertRuleEditorOptions() {
    const metric_options = ['quarantined_messages_count', 'delivery_failures', 'malware_detections'];
    const condition_operator_options = [
      'greater_than',
      'greater_than_or_equal_to',
      'less_than',
      'less_than_or_equal_to',
      'equal_to'
    ];
    const time_window_presets = [
      { label: '15 minutes', minutes: 15 },
      { label: '1 hour', minutes: 60 },
      { label: '24 hours', minutes: 1440 }
    ];
    const delivery_method_options = ['email_notification', 'sms_notification', 'webhook', 'dashboard_only'];

    return {
      metric_options,
      condition_operator_options,
      time_window_presets,
      delivery_method_options
    };
  }

  // createAlertRule(name, metric, condition_operator, threshold, time_window_minutes, recipient_emails, delivery_method, is_enabled)
  createAlertRule(name, metric, condition_operator, threshold, time_window_minutes, recipient_emails, delivery_method, is_enabled) {
    if (!name) {
      return { success: false, message: 'Alert name is required.', alert_rule_id: null, alert_rule_name: null };
    }

    const metric_options = ['quarantined_messages_count', 'delivery_failures', 'malware_detections'];
    const condition_operator_options = [
      'greater_than',
      'greater_than_or_equal_to',
      'less_than',
      'less_than_or_equal_to',
      'equal_to'
    ];
    const delivery_method_options = ['email_notification', 'sms_notification', 'webhook', 'dashboard_only'];

    if (metric_options.indexOf(metric) === -1) {
      return { success: false, message: 'Invalid metric.', alert_rule_id: null, alert_rule_name: null };
    }
    if (condition_operator_options.indexOf(condition_operator) === -1) {
      return { success: false, message: 'Invalid condition_operator.', alert_rule_id: null, alert_rule_name: null };
    }
    if (delivery_method_options.indexOf(delivery_method) === -1) {
      return { success: false, message: 'Invalid delivery_method.', alert_rule_id: null, alert_rule_name: null };
    }
    if (typeof threshold !== 'number') {
      return { success: false, message: 'Threshold must be numeric.', alert_rule_id: null, alert_rule_name: null };
    }
    if (typeof time_window_minutes !== 'number' || time_window_minutes <= 0) {
      return { success: false, message: 'time_window_minutes must be positive.', alert_rule_id: null, alert_rule_name: null };
    }
    if (!Array.isArray(recipient_emails) || recipient_emails.length === 0) {
      return { success: false, message: 'recipient_emails must be a non-empty array.', alert_rule_id: null, alert_rule_name: null };
    }

    const alert_rules = this._getFromStorage('alert_rules', []);
    const id = this._generateId('alert_rule');

    const rule = {
      id,
      name,
      metric,
      condition_operator,
      threshold,
      time_window_minutes,
      recipient_emails,
      delivery_method,
      is_enabled: typeof is_enabled === 'boolean' ? is_enabled : true,
      created_at: this._nowISO(),
      updated_at: null
    };

    alert_rules.push(rule);
    this._saveToStorage('alert_rules', alert_rules);

    return {
      success: true,
      message: 'Alert rule created.',
      alert_rule_id: id,
      alert_rule_name: name
    };
  }

  // updateAlertRule(alertRuleId, ...)
  updateAlertRule(alertRuleId, name, metric, condition_operator, threshold, time_window_minutes, recipient_emails, delivery_method, is_enabled) {
    const alert_rules = this._getFromStorage('alert_rules', []);
    const index = alert_rules.findIndex(r => r.id === alertRuleId);
    if (index === -1) {
      return { success: false };
    }

    const rule = alert_rules[index];

    const metric_options = ['quarantined_messages_count', 'delivery_failures', 'malware_detections'];
    const condition_operator_options = [
      'greater_than',
      'greater_than_or_equal_to',
      'less_than',
      'less_than_or_equal_to',
      'equal_to'
    ];
    const delivery_method_options = ['email_notification', 'sms_notification', 'webhook', 'dashboard_only'];

    if (typeof name !== 'undefined') rule.name = name;

    if (typeof metric !== 'undefined') {
      if (metric_options.indexOf(metric) === -1) return { success: false };
      rule.metric = metric;
    }

    if (typeof condition_operator !== 'undefined') {
      if (condition_operator_options.indexOf(condition_operator) === -1) return { success: false };
      rule.condition_operator = condition_operator;
    }

    if (typeof threshold !== 'undefined') {
      if (typeof threshold !== 'number') return { success: false };
      rule.threshold = threshold;
    }

    if (typeof time_window_minutes !== 'undefined') {
      if (typeof time_window_minutes !== 'number' || time_window_minutes <= 0) return { success: false };
      rule.time_window_minutes = time_window_minutes;
    }

    if (typeof recipient_emails !== 'undefined') {
      if (!Array.isArray(recipient_emails) || recipient_emails.length === 0) return { success: false };
      rule.recipient_emails = recipient_emails;
    }

    if (typeof delivery_method !== 'undefined') {
      if (delivery_method_options.indexOf(delivery_method) === -1) return { success: false };
      rule.delivery_method = delivery_method;
    }

    if (typeof is_enabled !== 'undefined') rule.is_enabled = !!is_enabled;

    rule.updated_at = this._nowISO();
    alert_rules[index] = rule;
    this._saveToStorage('alert_rules', alert_rules);

    return { success: true };
  }

  // deleteAlertRule(alertRuleId)
  deleteAlertRule(alertRuleId) {
    const alert_rules = this._getFromStorage('alert_rules', []);
    const newRules = alert_rules.filter(r => r.id !== alertRuleId);
    const success = newRules.length !== alert_rules.length;
    if (success) {
      this._saveToStorage('alert_rules', newRules);
    }
    return { success };
  }

  // -------------------- Reports --------------------

  // getReportSnapshot(report_type, date_range)
  getReportSnapshot(report_type, date_range) {
    const supported_report_types = ['quarantine_summary', 'threat_trends', 'policy_changes', 'alert_activity'];
    if (supported_report_types.indexOf(report_type) === -1) {
      report_type = 'quarantine_summary';
    }

    const range = this._computeDateRange(date_range);
    const fromTime = new Date(range.from).getTime();
    const toTime = new Date(range.to).getTime();

    const logs = this._getFromStorage('email_log_entries', []);
    const inRange = logs.filter(entry => {
      const ts = new Date(entry.timestamp).getTime();
      return ts >= fromTime && ts <= toTime;
    });

    let summary = '';
    const rows = [];

    if (report_type === 'quarantine_summary') {
      let quarantined = 0;
      let blockedMalware = 0;
      let blockedSpam = 0;
      let blockedPolicy = 0;

      for (const e of inRange) {
        if (e.status === 'quarantined') quarantined++;
        if (e.status === 'blocked_malware') blockedMalware++;
        if (e.status === 'blocked_spam') blockedSpam++;
        if (e.status === 'blocked_policy') blockedPolicy++;
      }

      summary = 'Quarantine activity for selected period.';
      rows.push(
        { label: 'Quarantined messages', value: quarantined, unit: 'emails' },
        { label: 'Blocked - Malware', value: blockedMalware, unit: 'emails' },
        { label: 'Blocked - Spam', value: blockedSpam, unit: 'emails' },
        { label: 'Blocked - Policy', value: blockedPolicy, unit: 'emails' }
      );
    } else if (report_type === 'threat_trends') {
      let malware = 0;
      let spam = 0;
      for (const e of inRange) {
        if (e.status === 'blocked_malware') malware++;
        if (e.status === 'blocked_spam') spam++;
      }
      summary = 'Threat trend overview for selected period.';
      rows.push(
        { label: 'Malware detections', value: malware, unit: 'events' },
        { label: 'Spam blocks', value: spam, unit: 'events' }
      );
    } else if (report_type === 'alert_activity') {
      const alert_rules = this._getFromStorage('alert_rules', []);
      summary = 'Alert configuration overview (activity not persisted).';
      rows.push({ label: 'Configured alert rules', value: alert_rules.length, unit: 'rules' });
    } else {
      summary = 'Report generated.';
    }

    return {
      report_type,
      generated_at: this._nowISO(),
      summary,
      rows
    };
  }

  // getScheduledReports()
  getScheduledReports() {
    const scheduled = this._getFromStorage('scheduled_reports', []);
    return scheduled;
  }

  // getScheduledReportEditorOptions()
  getScheduledReportEditorOptions() {
    const report_type_options = ['quarantine_summary', 'threat_trends', 'policy_changes', 'alert_activity'];
    const frequency_options = ['daily', 'weekly', 'monthly', 'hourly'];
    const format_options = ['html_email_body', 'pdf_attachment', 'csv_attachment'];
    const default_time_of_day = '09:00';

    return {
      report_type_options,
      frequency_options,
      format_options,
      default_time_of_day
    };
  }

  // createScheduledReport(name, report_type, frequency, time_of_day, recipient_emails, format, is_active)
  createScheduledReport(name, report_type, frequency, time_of_day, recipient_emails, format, is_active) {
    if (!name) {
      return { success: false, message: 'Report name is required.', scheduled_report_id: null };
    }

    const report_type_options = ['quarantine_summary', 'threat_trends', 'policy_changes', 'alert_activity'];
    const frequency_options = ['daily', 'weekly', 'monthly', 'hourly'];
    const format_options = ['html_email_body', 'pdf_attachment', 'csv_attachment'];

    if (report_type_options.indexOf(report_type) === -1) {
      return { success: false, message: 'Invalid report_type.', scheduled_report_id: null };
    }
    if (frequency_options.indexOf(frequency) === -1) {
      return { success: false, message: 'Invalid frequency.', scheduled_report_id: null };
    }
    if (format_options.indexOf(format) === -1) {
      return { success: false, message: 'Invalid format.', scheduled_report_id: null };
    }
    if (!Array.isArray(recipient_emails) || recipient_emails.length === 0) {
      return { success: false, message: 'recipient_emails must be a non-empty array.', scheduled_report_id: null };
    }

    const scheduled_reports = this._getFromStorage('scheduled_reports', []);
    const id = this._generateId('scheduled_report');

    const scheduled = {
      id,
      name,
      report_type,
      frequency,
      time_of_day,
      recipient_emails,
      format,
      is_active: typeof is_active === 'boolean' ? is_active : true,
      created_at: this._nowISO(),
      updated_at: null
    };

    scheduled_reports.push(scheduled);
    this._saveToStorage('scheduled_reports', scheduled_reports);

    return {
      success: true,
      message: 'Scheduled report created.',
      scheduled_report_id: id
    };
  }

  // updateScheduledReport(scheduledReportId, ...)
  updateScheduledReport(scheduledReportId, name, report_type, frequency, time_of_day, recipient_emails, format, is_active) {
    const scheduled_reports = this._getFromStorage('scheduled_reports', []);
    const index = scheduled_reports.findIndex(r => r.id === scheduledReportId);
    if (index === -1) {
      return { success: false };
    }

    const scheduled = scheduled_reports[index];

    const report_type_options = ['quarantine_summary', 'threat_trends', 'policy_changes', 'alert_activity'];
    const frequency_options = ['daily', 'weekly', 'monthly', 'hourly'];
    const format_options = ['html_email_body', 'pdf_attachment', 'csv_attachment'];

    if (typeof name !== 'undefined') scheduled.name = name;
    if (typeof report_type !== 'undefined') {
      if (report_type_options.indexOf(report_type) === -1) return { success: false };
      scheduled.report_type = report_type;
    }
    if (typeof frequency !== 'undefined') {
      if (frequency_options.indexOf(frequency) === -1) return { success: false };
      scheduled.frequency = frequency;
    }
    if (typeof time_of_day !== 'undefined') scheduled.time_of_day = time_of_day;
    if (typeof recipient_emails !== 'undefined') {
      if (!Array.isArray(recipient_emails) || recipient_emails.length === 0) return { success: false };
      scheduled.recipient_emails = recipient_emails;
    }
    if (typeof format !== 'undefined') {
      if (format_options.indexOf(format) === -1) return { success: false };
      scheduled.format = format;
    }
    if (typeof is_active !== 'undefined') scheduled.is_active = !!is_active;

    scheduled.updated_at = this._nowISO();
    scheduled_reports[index] = scheduled;
    this._saveToStorage('scheduled_reports', scheduled_reports);

    return { success: true };
  }

  // deleteScheduledReport(scheduledReportId)
  deleteScheduledReport(scheduledReportId) {
    const scheduled_reports = this._getFromStorage('scheduled_reports', []);
    const newReports = scheduled_reports.filter(r => r.id !== scheduledReportId);
    const success = newReports.length !== scheduled_reports.length;
    if (success) {
      this._saveToStorage('scheduled_reports', newReports);
    }
    return { success };
  }

  // -------------------- Email Logs --------------------

  // getEmailLogFilterOptions()
  getEmailLogFilterOptions() {
    const last24 = this._computeDateRange('last_24_hours');
    const last7 = this._computeDateRange('last_7_days');

    const date_range_presets = [
      { id: 'last_24_hours', label: 'Last 24 hours', from: last24.from, to: last24.to },
      { id: 'last_7_days', label: 'Last 7 days', from: last7.from, to: last7.to }
    ];

    const status_options = [
      { value: 'delivered', label: 'Delivered' },
      { value: 'quarantined', label: 'Quarantined' },
      { value: 'blocked_malware', label: 'Blocked - Malware' },
      { value: 'blocked_spam', label: 'Blocked - Spam' },
      { value: 'blocked_policy', label: 'Blocked - Policy' }
    ];

    const sender_type_options = ['internal', 'external'];
    const group_by_options = ['none', 'sender_domain', 'sender_email', 'recipient_email'];

    return {
      date_range_presets,
      status_options,
      sender_type_options,
      group_by_options
    };
  }

  // searchEmailLogs(date_range, status, sender_type, sender_email, recipient_email, subject_query, page, page_size)
  searchEmailLogs(date_range, status, sender_type, sender_email, recipient_email, subject_query, page, page_size) {
    const range = this._computeDateRange(date_range);
    const fromTime = new Date(range.from).getTime();
    const toTime = new Date(range.to).getTime();

    const logs = this._getFromStorage('email_log_entries', []);

    let filtered = logs.filter(entry => {
      const ts = new Date(entry.timestamp).getTime();
      if (ts < fromTime || ts > toTime) return false;
      if (status && entry.status !== status) return false;
      if (sender_type && entry.sender_type !== sender_type) return false;
      if (sender_email && entry.sender_email.toLowerCase().indexOf(sender_email.toLowerCase()) === -1) return false;
      if (recipient_email && entry.recipient_email.toLowerCase().indexOf(recipient_email.toLowerCase()) === -1) return false;
      if (subject_query && entry.subject && entry.subject.toLowerCase().indexOf(subject_query.toLowerCase()) === -1) return false;
      if (subject_query && !entry.subject) return false;
      return true;
    });

    // Sort by timestamp desc
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const p = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 50;

    const start = (p - 1) * ps;
    const end = start + ps;
    const results = filtered.slice(start, end).map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      sender_email: e.sender_email,
      sender_domain: e.sender_domain,
      sender_type: e.sender_type,
      recipient_email: e.recipient_email,
      subject: e.subject,
      status: e.status,
      malware_detected: e.malware_detected,
      spam_score: typeof e.spam_score === 'number' ? e.spam_score : null
    }));

    return {
      total_count: filtered.length,
      page: p,
      page_size: ps,
      results
    };
  }

  // getEmailLogsAggregatedBySenderDomain(date_range, status, sender_type, limit)
  getEmailLogsAggregatedBySenderDomain(date_range, status, sender_type, limit) {
    const range = this._computeDateRange(date_range);
    const fromTime = new Date(range.from).getTime();
    const toTime = new Date(range.to).getTime();
    const logs = this._getFromStorage('email_log_entries', []);

    const domainMap = {};

    for (const entry of logs) {
      const ts = new Date(entry.timestamp).getTime();
      if (ts < fromTime || ts > toTime) continue;
      if (status && entry.status !== status) continue;
      if (sender_type && entry.sender_type !== sender_type) continue;

      const domain = entry.sender_domain || '';
      if (!domain) continue;

      if (!domainMap[domain]) {
        domainMap[domain] = {
          sender_domain: domain,
          message_count: 0,
          blocked_malware_count: 0,
          quarantined_count: 0
        };
      }

      domainMap[domain].message_count += 1;
      if (entry.status === 'blocked_malware') domainMap[domain].blocked_malware_count += 1;
      if (entry.status === 'quarantined') domainMap[domain].quarantined_count += 1;
    }

    const arr = Object.values(domainMap);
    arr.sort((a, b) => b.message_count - a.message_count);
    const lim = typeof limit === 'number' && limit > 0 ? limit : 100;
    return arr.slice(0, lim);
  }

  // blockSenderDomainFromLogsAction(domain, reason)
  blockSenderDomainFromLogsAction(domain, reason) {
    if (!domain) {
      return { success: false, message: 'Domain is required.', blocked_domain_id: null };
    }

    const blocked_domains = this._getFromStorage('blocked_domains', []);
    const existing = blocked_domains.find(d => d.domain === domain.toLowerCase());
    if (existing) {
      if (!existing.active) {
        existing.active = true;
        this._saveToStorage('blocked_domains', blocked_domains);
      }
      return {
        success: true,
        message: 'Domain already blocked.',
        blocked_domain_id: existing.id
      };
    }

    const id = this._generateId('blocked_domain');
    const entry = {
      id,
      domain: domain.toLowerCase(),
      reason: reason || 'high_malware_volume',
      source: 'from_log',
      active: true,
      created_at: this._nowISO()
    };

    blocked_domains.push(entry);
    this._saveToStorage('blocked_domains', blocked_domains);

    return {
      success: true,
      message: 'Domain blocked from logs action.',
      blocked_domain_id: id
    };
  }

  // -------------------- Users / Mailboxes --------------------

  // getMailboxesList()
  getMailboxesList() {
    const mailboxes = this._getFromStorage('mailboxes', []);
    const policies = this._getFromStorage('protection_policies', []);

    return mailboxes.map(mb => {
      const policy = policies.find(p => p.id === mb.protection_policy_id) || null;
      return {
        id: mb.id,
        email_address: mb.email_address,
        display_name: mb.display_name,
        protection_policy_id: mb.protection_policy_id || null,
        protection_policy_name: policy ? policy.name : null,
        protection_policy: policy,
        mfa_enabled: mb.mfa_enabled,
        mfa_method: mb.mfa_method,
        is_active: mb.is_active,
        created_at: mb.created_at
      };
    });
  }

  // searchMailboxes(query)
  searchMailboxes(query) {
    const q = (query || '').toLowerCase();
    if (!q) return [];

    const mailboxes = this._getFromStorage('mailboxes', []);
    return mailboxes
      .filter(m => {
        return (
          (m.email_address && m.email_address.toLowerCase().indexOf(q) !== -1) ||
          (m.display_name && m.display_name.toLowerCase().indexOf(q) !== -1)
        );
      })
      .map(m => ({ id: m.id, email_address: m.email_address, display_name: m.display_name }));
  }

  // getMailboxEditorOptions()
  getMailboxEditorOptions() {
    const protection_policies = this._getFromStorage('protection_policies', []);
    const mfa_method_options = ['none', 'sms_code', 'authenticator_app', 'email_code'];
    return {
      protection_policies,
      mfa_method_options
    };
  }

  // createMailbox(email_address, display_name, protection_policy_id, mfa_enabled, mfa_method, mfa_phone_number, is_active)
  createMailbox(email_address, display_name, protection_policy_id, mfa_enabled, mfa_method, mfa_phone_number, is_active) {
    if (!email_address || email_address.indexOf('@') === -1) {
      return { success: false, message: 'Valid email_address is required.', mailbox_id: null, email_address: null, display_name: null };
    }
    if (!display_name) {
      return { success: false, message: 'Display name is required.', mailbox_id: null, email_address: null, display_name: null };
    }

    const mailboxes = this._getFromStorage('mailboxes', []);
    if (mailboxes.some(m => m.email_address.toLowerCase() === email_address.toLowerCase())) {
      return { success: false, message: 'A mailbox with this email already exists.', mailbox_id: null, email_address: null, display_name: null };
    }

    const policies = this._getFromStorage('protection_policies', []);
    if (protection_policy_id) {
      const policy = policies.find(p => p.id === protection_policy_id);
      if (!policy) {
        return { success: false, message: 'Specified protection_policy_id does not exist.', mailbox_id: null, email_address: null, display_name: null };
      }
    }

    const mfaMethods = ['none', 'sms_code', 'authenticator_app', 'email_code'];
    const enabled = !!mfa_enabled;
    let method = mfa_method || (enabled ? 'sms_code' : 'none');
    if (mfaMethods.indexOf(method) === -1) {
      return { success: false, message: 'Invalid mfa_method.', mailbox_id: null, email_address: null, display_name: null };
    }

    let phone = mfa_phone_number || null;
    if (enabled && method === 'sms_code' && !phone) {
      return { success: false, message: 'mfa_phone_number is required when mfa_method is sms_code and mfa is enabled.', mailbox_id: null, email_address: null, display_name: null };
    }

    if (!enabled) {
      method = 'none';
      phone = null;
    }

    const id = this._generateId('mailbox');
    const mailbox = {
      id,
      email_address,
      display_name,
      protection_policy_id: protection_policy_id || null,
      mfa_enabled: enabled,
      mfa_method: method,
      mfa_phone_number: phone,
      is_active: typeof is_active === 'boolean' ? is_active : true,
      created_at: this._nowISO()
    };

    mailboxes.push(mailbox);
    this._saveToStorage('mailboxes', mailboxes);

    return {
      success: true,
      message: 'Mailbox created.',
      mailbox_id: id,
      email_address,
      display_name
    };
  }

  // updateMailbox(mailboxId, ...)
  updateMailbox(mailboxId, display_name, protection_policy_id, mfa_enabled, mfa_method, mfa_phone_number, is_active) {
    const mailboxes = this._getFromStorage('mailboxes', []);
    const index = mailboxes.findIndex(m => m.id === mailboxId);
    if (index === -1) {
      return { success: false };
    }

    const mailbox = mailboxes[index];

    if (typeof display_name !== 'undefined') mailbox.display_name = display_name;

    const policies = this._getFromStorage('protection_policies', []);
    if (typeof protection_policy_id !== 'undefined') {
      if (protection_policy_id) {
        const policy = policies.find(p => p.id === protection_policy_id);
        if (!policy) return { success: false };
        mailbox.protection_policy_id = protection_policy_id;
      } else {
        mailbox.protection_policy_id = null;
      }
    }

    const mfaMethods = ['none', 'sms_code', 'authenticator_app', 'email_code'];

    if (typeof mfa_enabled !== 'undefined') {
      mailbox.mfa_enabled = !!mfa_enabled;
    }

    if (typeof mfa_method !== 'undefined') {
      if (mfaMethods.indexOf(mfa_method) === -1) return { success: false };
      mailbox.mfa_method = mfa_method;
    }

    if (typeof mfa_phone_number !== 'undefined') {
      mailbox.mfa_phone_number = mfa_phone_number || null;
    }

    // Enforce consistency
    if (!mailbox.mfa_enabled) {
      mailbox.mfa_method = 'none';
      mailbox.mfa_phone_number = null;
    } else if (mailbox.mfa_method === 'sms_code' && !mailbox.mfa_phone_number) {
      return { success: false };
    }

    if (typeof is_active !== 'undefined') mailbox.is_active = !!is_active;

    mailboxes[index] = mailbox;
    this._saveToStorage('mailboxes', mailboxes);

    return { success: true };
  }

  // -------------------- Allow & Block Lists --------------------

  // getAllowBlockListsOverview()
  getAllowBlockListsOverview() {
    const allowed_domains = this._getFromStorage('allowed_domains', []);
    const blocked_email_addresses = this._getFromStorage('blocked_email_addresses', []);
    const blocked_domains = this._getFromStorage('blocked_domains', []);

    return {
      allowed_domains,
      blocked_email_addresses,
      blocked_domains
    };
  }

  // addAllowedDomain(domain, description)
  addAllowedDomain(domain, description) {
    if (!domain) {
      return { success: false, message: 'Domain is required.', allowed_domain_id: null, domain: null };
    }
    const allowed_domains = this._getFromStorage('allowed_domains', []);
    const normalized = domain.toLowerCase();
    const existing = allowed_domains.find(d => d.domain === normalized);
    if (existing) {
      if (!existing.active) existing.active = true;
      this._saveToStorage('allowed_domains', allowed_domains);
      return {
        success: true,
        message: 'Domain already allowed.',
        allowed_domain_id: existing.id,
        domain: existing.domain
      };
    }

    const id = this._generateId('allowed_domain');
    const entry = {
      id,
      domain: normalized,
      description: description || '',
      source: 'manual',
      active: true,
      created_at: this._nowISO()
    };

    allowed_domains.push(entry);
    this._saveToStorage('allowed_domains', allowed_domains);

    return {
      success: true,
      message: 'Allowed domain added.',
      allowed_domain_id: id,
      domain: normalized
    };
  }

  // removeAllowedDomain(allowedDomainId)
  removeAllowedDomain(allowedDomainId) {
    const allowed_domains = this._getFromStorage('allowed_domains', []);
    const newList = allowed_domains.filter(d => d.id !== allowedDomainId);
    const success = newList.length !== allowed_domains.length;
    if (success) {
      this._saveToStorage('allowed_domains', newList);
    }
    return { success };
  }

  // addBlockedEmailAddress(email_address, reason)
  addBlockedEmailAddress(email_address, reason) {
    if (!email_address || email_address.indexOf('@') === -1) {
      return { success: false, message: 'Valid email_address is required.', blocked_email_address_id: null };
    }

    const blocked_email_addresses = this._getFromStorage('blocked_email_addresses', []);
    const normalized = email_address.toLowerCase();
    const existing = blocked_email_addresses.find(e => e.email_address === normalized);
    if (existing) {
      if (!existing.active) existing.active = true;
      this._saveToStorage('blocked_email_addresses', blocked_email_addresses);
      return {
        success: true,
        message: 'Email address already blocked.',
        blocked_email_address_id: existing.id
      };
    }

    const id = this._generateId('blocked_email');
    const entry = {
      id,
      email_address: normalized,
      reason: reason || 'phishing_suspected',
      source: 'manual',
      active: true,
      created_at: this._nowISO()
    };

    blocked_email_addresses.push(entry);
    this._saveToStorage('blocked_email_addresses', blocked_email_addresses);

    return {
      success: true,
      message: 'Blocked email address added.',
      blocked_email_address_id: id
    };
  }

  // removeBlockedEmailAddress(blockedEmailAddressId)
  removeBlockedEmailAddress(blockedEmailAddressId) {
    const blocked_email_addresses = this._getFromStorage('blocked_email_addresses', []);
    const newList = blocked_email_addresses.filter(e => e.id !== blockedEmailAddressId);
    const success = newList.length !== blocked_email_addresses.length;
    if (success) {
      this._saveToStorage('blocked_email_addresses', newList);
    }
    return { success };
  }

  // -------------------- Temporary Allow Rules --------------------

  // getTemporaryAllowRules()
  getTemporaryAllowRules() {
    const rules = this._getFromStorage('temporary_allow_rules', []);
    const mailboxes = this._getFromStorage('mailboxes', []);

    return rules.map(r => {
      const mailbox = r.mailbox_id ? mailboxes.find(m => m.id === r.mailbox_id) || null : null;
      return Object.assign({}, r, { mailbox });
    });
  }

  // getTemporaryAllowRuleEditorOptions()
  getTemporaryAllowRuleEditorOptions() {
    const applies_to_scope_options = ['all_recipients', 'specific_recipient', 'recipient_domain'];
    const behavior_options = [
      'bypass_spam_filtering_only',
      'bypass_all_filtering',
      'scan_for_malware_only',
      'normal_processing'
    ];
    const duration_presets = [
      { label: '1 hour', hours: 1 },
      { label: '24 hours', hours: 24 },
      { label: '7 days', hours: 168 }
    ];

    return {
      applies_to_scope_options,
      behavior_options,
      duration_presets
    };
  }

  // createTemporaryAllowRule(name, sender_domain, applies_to_scope, mailbox_id, recipient_email, duration_hours, behavior, is_active, source)
  createTemporaryAllowRule(name, sender_domain, applies_to_scope, mailbox_id, recipient_email, duration_hours, behavior, is_active, source) {
    if (!name) {
      return { success: false, message: 'Rule name is required.', temporary_allow_rule_id: null };
    }
    if (!sender_domain) {
      return { success: false, message: 'sender_domain is required.', temporary_allow_rule_id: null };
    }

    const scopeOptions = ['all_recipients', 'specific_recipient', 'recipient_domain'];
    const behaviorOptions = [
      'bypass_spam_filtering_only',
      'bypass_all_filtering',
      'scan_for_malware_only',
      'normal_processing'
    ];

    if (scopeOptions.indexOf(applies_to_scope) === -1) {
      return { success: false, message: 'Invalid applies_to_scope.', temporary_allow_rule_id: null };
    }
    if (behaviorOptions.indexOf(behavior) === -1) {
      return { success: false, message: 'Invalid behavior.', temporary_allow_rule_id: null };
    }
    if (typeof duration_hours !== 'number' || duration_hours <= 0) {
      return { success: false, message: 'duration_hours must be positive.', temporary_allow_rule_id: null };
    }

    const mailboxes = this._getFromStorage('mailboxes', []);
    let resolvedMailboxId = null;
    let resolvedRecipientEmail = recipient_email || null;

    if (applies_to_scope === 'specific_recipient') {
      const mailbox = mailboxes.find(m => m.id === mailbox_id || m.email_address === mailbox_id);
      if (!mailbox) {
        return { success: false, message: 'Mailbox for specific_recipient scope not found.', temporary_allow_rule_id: null };
      }
      resolvedMailboxId = mailbox.id;
      if (!resolvedRecipientEmail) {
        resolvedRecipientEmail = mailbox.email_address;
      }
    } else {
      resolvedMailboxId = null;
    }

    const rules = this._getFromStorage('temporary_allow_rules', []);
    const id = this._generateId('temporary_allow_rule');

    const created_at = this._nowISO();
    const expires_at = new Date(new Date(created_at).getTime() + duration_hours * 60 * 60 * 1000).toISOString();

    const rule = {
      id,
      name,
      sender_domain,
      applies_to_scope,
      mailbox_id: resolvedMailboxId,
      recipient_email: resolvedRecipientEmail,
      duration_hours,
      created_at,
      expires_at,
      behavior,
      is_active: typeof is_active === 'boolean' ? is_active : true,
      source: source || 'manual'
    };

    rules.push(rule);
    this._saveToStorage('temporary_allow_rules', rules);

    return {
      success: true,
      message: 'Temporary allow rule created.',
      temporary_allow_rule_id: id
    };
  }

  // updateTemporaryAllowRule(temporaryAllowRuleId, ...)
  updateTemporaryAllowRule(temporaryAllowRuleId, name, sender_domain, applies_to_scope, mailbox_id, recipient_email, duration_hours, behavior, is_active) {
    const rules = this._getFromStorage('temporary_allow_rules', []);
    const index = rules.findIndex(r => r.id === temporaryAllowRuleId);
    if (index === -1) {
      return { success: false };
    }

    const rule = rules[index];

    const scopeOptions = ['all_recipients', 'specific_recipient', 'recipient_domain'];
    const behaviorOptions = [
      'bypass_spam_filtering_only',
      'bypass_all_filtering',
      'scan_for_malware_only',
      'normal_processing'
    ];

    if (typeof name !== 'undefined') rule.name = name;
    if (typeof sender_domain !== 'undefined') rule.sender_domain = sender_domain;

    const mailboxes = this._getFromStorage('mailboxes', []);

    if (typeof applies_to_scope !== 'undefined') {
      if (scopeOptions.indexOf(applies_to_scope) === -1) return { success: false };
      rule.applies_to_scope = applies_to_scope;

      if (applies_to_scope !== 'specific_recipient') {
        rule.mailbox_id = null;
        if (typeof recipient_email !== 'undefined') {
          rule.recipient_email = recipient_email || null;
        }
      } else {
        const mailbox = mailboxes.find(m => m.id === mailbox_id || m.email_address === mailbox_id);
        if (!mailbox) return { success: false };
        rule.mailbox_id = mailbox.id;
        rule.recipient_email = recipient_email || mailbox.email_address;
      }
    } else if (rule.applies_to_scope === 'specific_recipient') {
      if (typeof mailbox_id !== 'undefined') {
        const mailbox = mailboxes.find(m => m.id === mailbox_id || m.email_address === mailbox_id);
        if (!mailbox) return { success: false };
        rule.mailbox_id = mailbox.id;
      }
      if (typeof recipient_email !== 'undefined') {
        rule.recipient_email = recipient_email || (rule.mailbox_id ? (mailboxes.find(m => m.id === rule.mailbox_id) || {}).email_address : null);
      }
    } else {
      if (typeof recipient_email !== 'undefined') {
        rule.recipient_email = recipient_email || null;
      }
    }

    if (typeof duration_hours !== 'undefined') {
      if (typeof duration_hours !== 'number' || duration_hours <= 0) return { success: false };
      rule.duration_hours = duration_hours;
      const now = this._nowISO();
      rule.created_at = now;
      rule.expires_at = new Date(new Date(now).getTime() + duration_hours * 60 * 60 * 1000).toISOString();
    }

    if (typeof behavior !== 'undefined') {
      if (behaviorOptions.indexOf(behavior) === -1) return { success: false };
      rule.behavior = behavior;
    }

    if (typeof is_active !== 'undefined') rule.is_active = !!is_active;

    rules[index] = rule;
    this._saveToStorage('temporary_allow_rules', rules);

    return { success: true };
  }

  // deleteTemporaryAllowRule(temporaryAllowRuleId)
  deleteTemporaryAllowRule(temporaryAllowRuleId) {
    const rules = this._getFromStorage('temporary_allow_rules', []);
    const newRules = rules.filter(r => r.id !== temporaryAllowRuleId);
    const success = newRules.length !== rules.length;
    if (success) {
      this._saveToStorage('temporary_allow_rules', newRules);
    }
    return { success };
  }

  // -------------------- Help & Support / About / Contact --------------------

  // getHelpTopics()
  getHelpTopics() {
    return {
      popular_topics: [
        {
          topic_id: 'creating-spam-policies',
          title: 'Creating spam filtering policies',
          summary: 'Learn how to create and tune spam policies by sender, subject and folder.'
        },
        {
          topic_id: 'configuring-alerts',
          title: 'Configuring alerts for quarantine spikes',
          summary: 'Set up alerts when quarantine volumes exceed your thresholds.'
        },
        {
          topic_id: 'managing-allow-block-lists',
          title: 'Managing allow & block lists',
          summary: 'Whitelist trusted partners and block known bad senders.'
        }
      ],
      categories: [
        { category_id: 'policies', category_name: 'Policies & Rules', article_count: 10 },
        { category_id: 'alerts', category_name: 'Alerts & Reporting', article_count: 6 },
        { category_id: 'getting-started', category_name: 'Getting Started', article_count: 8 }
      ]
    };
  }

  // getHelpArticle(topic_id)
  getHelpArticle(topic_id) {
    const articles = {
      'creating-spam-policies': {
        title: 'Creating spam filtering policies',
        content_html:
          '<h1>Creating spam filtering policies</h1><p>Use the Policies &gt; Spam Filtering section to create rules based on subject keywords, sender scope and actions like moving to folders or quarantining.</p>',
        last_updated: this._nowISO()
      },
      'configuring-alerts': {
        title: 'Configuring alerts for quarantine spikes',
        content_html:
          '<h1>Configuring quarantine alerts</h1><p>Navigate to Alerts and create a rule on the "quarantined_messages_count" metric with your desired threshold.</p>',
        last_updated: this._nowISO()
      },
      'managing-allow-block-lists': {
        title: 'Managing allow &amp; block lists',
        content_html:
          '<h1>Managing allow &amp; block lists</h1><p>Use Settings &gt; Allow &amp; Block Lists to add trusted domains and block suspicious senders.</p>',
        last_updated: this._nowISO()
      }
    };

    const fallback = {
      title: 'Help article',
      content_html: '<h1>Help article</h1><p>Content is not available.</p>',
      last_updated: this._nowISO()
    };

    const article = articles[topic_id] || fallback;

    return {
      topic_id,
      title: article.title,
      content_html: article.content_html,
      last_updated: article.last_updated
    };
  }

  // getSupportContactInfo()
  getSupportContactInfo() {
    return {
      support_email: 'support@example-security.com',
      support_phone: '+1 800 555 0100',
      support_hours: '24x7 for critical issues, business days for standard tickets',
      expected_response_time: 'Within 4 business hours for standard tickets'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    return {
      company_mission: 'Make email the safest place in every organization.',
      background:
        'Our team has decades of experience building large-scale security systems that protect millions of mailboxes worldwide.',
      experience_highlights: [
        '10+ years building cloud email security products',
        'Protecting customers in over 30 countries',
        'Petabyte-scale threat telemetry and analysis'
      ],
      certifications: ['ISO 27001', 'SOC 2 Type II'],
      security_commitments: [
        'Data encrypted in transit and at rest',
        'Privacy by design in every feature',
        'Transparent incident communication'
      ]
    };
  }

  // getContactInfo()
  getContactInfo() {
    return {
      sales_email: 'sales@example-security.com',
      support_email: 'support@example-security.com',
      phone_numbers: ['+1 800 555 0100'],
      office_locations: ['San Francisco, CA', 'London, UK'],
      support_hours: 'Mon–Fri, 09:00–18:00 (customer local time)',
      expected_response_time: 'Within 1 business day for sales, 4 hours for critical support'
    };
  }

  // submitContactRequest(full_name, email, topic, message)
  submitContactRequest(full_name, email, topic, message) {
    if (!full_name || !email || email.indexOf('@') === -1 || !message) {
      return { success: false, message: 'Missing or invalid fields.', ticket_id: null };
    }

    const contact_requests = this._getFromStorage('contact_requests', []);
    const id = this._generateId('contact_request');
    const entry = {
      id,
      full_name,
      email,
      topic: topic || 'other',
      message,
      created_at: this._nowISO()
    };

    contact_requests.push(entry);
    this._saveToStorage('contact_requests', contact_requests);

    return {
      success: true,
      message: 'Your request has been received.',
      ticket_id: id
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return {
      last_updated: this._nowISO(),
      content_html:
        '<h1>Privacy Policy</h1><p>This is placeholder privacy policy content. In production, replace with your full policy text.</p>'
    };
  }

  // getTermsOfServiceContent()
  getTermsOfServiceContent() {
    return {
      last_updated: this._nowISO(),
      content_html:
        '<h1>Terms of Service</h1><p>This is placeholder terms of service content. In production, replace with your full terms.</p>'
    };
  }

  // getFaqEntries()
  getFaqEntries() {
    return [
      {
        question_id: 'plans-advanced-phishing',
        question: 'Which plans include advanced phishing protection?',
        answer_html:
          '<p>Advanced phishing protection is available on selected plans. Check the Pricing page for details of each plan.</p>',
        category: 'plans'
      },
      {
        question_id: 'features-marketing-folder',
        question: 'Can I route marketing emails into a separate folder?',
        answer_html:
          '<p>Yes. Create a spam filtering policy with subject keywords and choose the Marketing folder as the target.</p>',
        category: 'features'
      },
      {
        question_id: 'configuration-alerts',
        question: 'How do I get alerts when quarantine volume spikes?',
        answer_html:
          '<p>Use the Alerts section to create a rule on the quarantined_messages_count metric with your chosen threshold and time window.</p>',
        category: 'configuration'
      }
    ];
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
