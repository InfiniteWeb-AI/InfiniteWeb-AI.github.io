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
    this.idCounter = this._getNextIdCounter();
  }

  // ---------------------- Initialization & Core Helpers ----------------------

  _initStorage() {
    const entityKeys = [
      'vm_plans',
      'operating_systems',
      'vm_configurations',
      'vm_instances',
      'auto_scaling_groups',
      'backup_policies',
      'backup_policy_attachments',
      'managed_database_plans',
      'load_balancer_plans',
      'services',
      'alert_rules',
      'dashboards',
      'dashboard_widgets',
      'favorite_plans',
      'pricing_estimates',
      'pricing_estimate_line_items',
      'log_streams',
      'anomaly_detection_rules',
      'teams',
      'incident_rules',
      'contact_requests'
    ];

    entityKeys.forEach((key) => {
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

  // ---------------------- Label / Enum Helpers ----------------------

  _getRegionLabel(region) {
    const map = {
      us_east: 'US-East',
      eu_west: 'EU-West',
      us_west: 'US-West',
      ap_southeast: 'AP-Southeast'
    };
    return map[region] || region || null;
  }

  _getVmCategoryLabel(category) {
    const map = {
      general_purpose: 'General Purpose',
      compute_optimized: 'Compute Optimized',
      memory_optimized: 'Memory Optimized',
      storage_optimized: 'Storage Optimized'
    };
    return map[category] || category || null;
  }

  _getDbTierLabel(tier) {
    const map = {
      dev: 'Dev',
      standard: 'Standard',
      high_availability: 'High Availability',
      enterprise: 'Enterprise'
    };
    return map[tier] || tier || null;
  }

  _getEngineLabel(engine) {
    const map = {
      postgresql: 'PostgreSQL',
      mysql: 'MySQL',
      mongodb: 'MongoDB',
      redis: 'Redis',
      sql_server: 'SQL Server'
    };
    return map[engine] || engine || null;
  }

  _clone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : obj;
  }

  // ---------------------- Private Helpers (spec-defined) ----------------------

  // Favorites for managed DB plans (single-user collection)
  _getOrCreateFavoritesCollection() {
    let favorites = this._getFromStorage('favorite_plans');
    if (!Array.isArray(favorites)) {
      favorites = [];
      this._saveToStorage('favorite_plans', favorites);
    }
    return favorites;
  }

  // Active pricing estimate (single-user)
  _getOrCreateActivePricingEstimate() {
    let estimates = this._getFromStorage('pricing_estimates');
    let active = estimates.find((e) => e && e.isSaved === false);
    if (!active) {
      active = {
        id: this._generateId('estimate'),
        name: null,
        defaultRegion: null,
        totalMonthlyCostUsd: 0,
        createdAt: this._now(),
        updatedAt: this._now(),
        isSaved: false
      };
      estimates.push(active);
      this._saveToStorage('pricing_estimates', estimates);
    }
    const allLineItems = this._getFromStorage('pricing_estimate_line_items');
    const lineItems = allLineItems.filter((li) => li.estimateId === active.id);
    return { estimate: active, lineItems };
  }

  _recalculatePricingEstimateTotals(estimateId) {
    const estimates = this._getFromStorage('pricing_estimates');
    const lineItems = this._getFromStorage('pricing_estimate_line_items');
    const estimate = estimates.find((e) => e.id === estimateId);
    if (!estimate) {
      return { estimate: null, lineItems: [] };
    }

    const vmPlans = this._getFromStorage('vm_plans');
    const dbPlans = this._getFromStorage('managed_database_plans');
    const lbPlans = this._getFromStorage('load_balancer_plans');

    let total = 0;
    const updatedLineItems = lineItems.map((li) => {
      if (li.estimateId !== estimateId) return li;

      let unitPrice = li.pricePerUnitMonthlyUsd || 0;
      if (li.serviceType === 'virtual_machine' && li.vmPlanId) {
        const plan = vmPlans.find((p) => p.id === li.vmPlanId);
        if (plan) unitPrice = plan.priceMonthlyUsd;
      } else if (li.serviceType === 'managed_database' && li.managedDatabasePlanId) {
        const plan = dbPlans.find((p) => p.id === li.managedDatabasePlanId);
        if (plan) unitPrice = plan.priceMonthlyUsd;
      } else if (li.serviceType === 'load_balancer' && li.loadBalancerPlanId) {
        const plan = lbPlans.find((p) => p.id === li.loadBalancerPlanId);
        if (plan) unitPrice = plan.priceMonthlyUsd;
      }

      const usageHours = typeof li.usageHoursPerMonth === 'number' ? li.usageHoursPerMonth : 730;
      const usageFactor = usageHours / 730;
      const quantity = typeof li.quantity === 'number' && li.quantity > 0 ? li.quantity : 1;
      const subtotal = unitPrice * usageFactor * quantity;

      const updated = {
        ...li,
        pricePerUnitMonthlyUsd: unitPrice,
        subtotalMonthlyUsd: Number(subtotal.toFixed(2))
      };

      if (updated.estimateId === estimateId) {
        total += updated.subtotalMonthlyUsd;
      }

      return updated;
    });

    estimate.totalMonthlyCostUsd = Number(total.toFixed(2));
    estimate.updatedAt = this._now();

    this._saveToStorage('pricing_estimates', estimates);
    this._saveToStorage('pricing_estimate_line_items', updatedLineItems);

    const estimateLineItems = updatedLineItems.filter((li) => li.estimateId === estimateId);
    return { estimate, lineItems: estimateLineItems };
  }

  _getOrCreateBackupPolicyForVm(vmInstanceId) {
    const policies = this._getFromStorage('backup_policies');
    const attachments = this._getFromStorage('backup_policy_attachments');
    let attachment = attachments.find((a) => a.vmInstanceId === vmInstanceId);
    let policy = null;

    if (attachment) {
      policy = policies.find((p) => p.id === attachment.backupPolicyId) || null;
    }

    if (!attachment || !policy) {
      const policyId = this._generateId('bkp');
      policy = {
        id: policyId,
        name: null,
        frequency: 'daily',
        timeOfDay: '00:00',
        timezone: null,
        retentionDays: 7,
        isActive: true,
        createdAt: this._now(),
        updatedAt: this._now()
      };
      policies.push(policy);
      attachment = {
        id: this._generateId('bkpatt'),
        backupPolicyId: policyId,
        vmInstanceId,
        attachedAt: this._now()
      };
      attachments.push(attachment);
      this._saveToStorage('backup_policies', policies);
      this._saveToStorage('backup_policy_attachments', attachments);
    }

    return { policy, attachment };
  }

  _validateScalingConfiguration(minInstances, maxInstances, desiredInstances, scaleOutThresholdPercent, scaleInThresholdPercent) {
    if (typeof minInstances !== 'number' || typeof maxInstances !== 'number') {
      return { valid: false, message: 'minInstances and maxInstances must be numbers' };
    }
    if (minInstances < 0 || maxInstances < 0) {
      return { valid: false, message: 'Instance counts must be non-negative' };
    }
    if (minInstances > maxInstances) {
      return { valid: false, message: 'minInstances cannot be greater than maxInstances' };
    }
    if (typeof desiredInstances === 'number') {
      if (desiredInstances < minInstances || desiredInstances > maxInstances) {
        return { valid: false, message: 'desiredInstances must be between minInstances and maxInstances' };
      }
    }
    if (typeof scaleOutThresholdPercent === 'number') {
      if (scaleOutThresholdPercent <= 0 || scaleOutThresholdPercent > 100) {
        return { valid: false, message: 'scaleOutThresholdPercent must be between 0 and 100' };
      }
    }
    if (typeof scaleInThresholdPercent === 'number') {
      if (scaleInThresholdPercent < 0 || scaleInThresholdPercent >= 100) {
        return { valid: false, message: 'scaleInThresholdPercent must be between 0 and 100' };
      }
    }
    return { valid: true, message: 'OK' };
  }

  _validateAlertCondition(metric, conditionOperator, thresholdValue, evaluationWindowMinutes) {
    const allowedMetrics = ['cpu_utilization', 'http_5xx_error_rate', 'p95_latency', 'error_count', 'response_time'];
    const allowedOps = ['greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'equal'];

    if (!allowedMetrics.includes(metric)) {
      return { valid: false, message: 'Invalid metric' };
    }
    if (!allowedOps.includes(conditionOperator)) {
      return { valid: false, message: 'Invalid condition operator' };
    }
    if (typeof thresholdValue !== 'number') {
      return { valid: false, message: 'thresholdValue must be a number' };
    }
    if (typeof evaluationWindowMinutes !== 'number' || evaluationWindowMinutes <= 0) {
      return { valid: false, message: 'evaluationWindowMinutes must be a positive number' };
    }
    return { valid: true, message: 'OK' };
  }

  _validateIncidentRuleCondition(triggerType, metric, conditionOperator, thresholdValue, thresholdUnit, evaluationWindowMinutes) {
    if (triggerType !== 'metric') {
      // For non-metric triggers, we do not enforce metric-based validation
      return { valid: true, message: 'OK' };
    }
    const allowedMetrics = ['cpu_utilization', 'http_5xx_error_rate', 'p95_latency', 'error_count', 'response_time'];
    const allowedOps = ['greater_than', 'less_than', 'greater_or_equal', 'less_or_equal', 'equal'];
    const allowedUnits = ['percent', 'count', 'milliseconds'];

    if (!allowedMetrics.includes(metric)) {
      return { valid: false, message: 'Invalid metric' };
    }
    if (!allowedOps.includes(conditionOperator)) {
      return { valid: false, message: 'Invalid condition operator' };
    }
    if (typeof thresholdValue !== 'number') {
      return { valid: false, message: 'thresholdValue must be a number' };
    }
    if (thresholdUnit && !allowedUnits.includes(thresholdUnit)) {
      return { valid: false, message: 'Invalid threshold unit' };
    }
    if (typeof evaluationWindowMinutes === 'number' && evaluationWindowMinutes <= 0) {
      return { valid: false, message: 'evaluationWindowMinutes must be positive' };
    }
    return { valid: true, message: 'OK' };
  }

  // ---------------------- Interface Implementations ----------------------

  // 1. getHomepageOverview
  getHomepageOverview() {
    // Static homepage structure; does not depend on entity data
    const productAreas = [
      {
        key: 'compute',
        title: 'Compute',
        summary: 'Virtual machines and auto-scaling for your applications.'
      },
      {
        key: 'data_storage',
        title: 'Data & Storage',
        summary: 'Managed databases and storage optimized for performance.'
      },
      {
        key: 'monitoring_aiops',
        title: 'Monitoring & AIOps',
        summary: 'Dashboards, alerts, incidents, and AI-driven analytics.'
      },
      {
        key: 'pricing',
        title: 'Pricing',
        summary: 'Transparent pricing and calculators to estimate your costs.'
      }
    ];

    const quickActions = [
      {
        id: 'qa_create_vm',
        label: 'Create a Virtual Machine',
        description: 'Browse VM plans and start a new instance configuration.',
        targetPageKey: 'virtual_machines'
      },
      {
        id: 'qa_view_databases',
        label: 'Browse Managed Databases',
        description: 'Compare managed database plans with backups included.',
        targetPageKey: 'managed_databases'
      },
      {
        id: 'qa_open_dashboards',
        label: 'Open Dashboards',
        description: 'Visualize CPU, error rate, and latency for your services.',
        targetPageKey: 'dashboards'
      },
      {
        id: 'qa_pricing_calculator',
        label: 'Open Pricing Calculator',
        description: 'Estimate monthly costs for your multi-service setup.',
        targetPageKey: 'pricing_calculator'
      }
    ];

    return { productAreas, quickActions };
  }

  // 2. getVMPlanFilterOptions
  getVMPlanFilterOptions() {
    const plans = this._getFromStorage('vm_plans');

    const vcpuOptionsSet = new Set();
    const memoryOptionsSet = new Set();
    const regionsSet = new Set();
    const categoriesSet = new Set();

    plans.forEach((p) => {
      if (typeof p.vcpuCount === 'number') vcpuOptionsSet.add(p.vcpuCount);
      if (typeof p.memoryGb === 'number') memoryOptionsSet.add(p.memoryGb);
      if (p.region) regionsSet.add(p.region);
      if (p.category) categoriesSet.add(p.category);
    });

    const vcpuOptions = Array.from(vcpuOptionsSet).sort((a, b) => a - b);
    const memoryOptionsGb = Array.from(memoryOptionsSet).sort((a, b) => a - b);

    const regions = Array.from(regionsSet).map((value) => ({
      value,
      label: this._getRegionLabel(value)
    }));

    const categories = Array.from(categoriesSet).map((value) => ({
      value,
      label: this._getVmCategoryLabel(value)
    }));

    const priceSuggestionsUsd = [];
    const prices = plans.map((p) => p.priceMonthlyUsd).filter((v) => typeof v === 'number');
    if (prices.length) {
      const min = Math.min.apply(null, prices);
      const max = Math.max.apply(null, prices);
      const mid = (min + max) / 2;
      priceSuggestionsUsd.push({ label: `Under $${Math.ceil(mid)}`, maxPrice: Math.ceil(mid) });
      priceSuggestionsUsd.push({ label: `Under $${Math.ceil(max)}`, maxPrice: Math.ceil(max) });
    }

    const sortOptions = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'vcpu_desc', label: 'vCPUs: High to Low' }
    ];

    return {
      vcpuOptions,
      memoryOptionsGb,
      priceSuggestionsUsd,
      regions,
      categories,
      sortOptions
    };
  }

  // 3. searchVMPlans(filters, sortBy, page, pageSize)
  searchVMPlans(filters, sortBy, page, pageSize) {
    filters = filters || {};
    sortBy = sortBy || 'price_asc';
    page = page || 1;
    pageSize = pageSize || 20;

    let plans = this._getFromStorage('vm_plans');

    plans = plans.filter((p) => {
      if (filters.vcpuMin != null && p.vcpuCount < filters.vcpuMin) return false;
      if (filters.memoryMinGb != null && p.memoryGb < filters.memoryMinGb) return false;
      if (filters.priceMaxMonthlyUsd != null && p.priceMonthlyUsd > filters.priceMaxMonthlyUsd) return false;
      if (filters.region && p.region !== filters.region) return false;
      if (filters.category && p.category !== filters.category) return false;
      if (filters.onlyActive && !p.isActive) return false;
      return true;
    });

    if (sortBy === 'price_asc') {
      plans.sort((a, b) => (a.priceMonthlyUsd || 0) - (b.priceMonthlyUsd || 0));
    } else if (sortBy === 'price_desc') {
      plans.sort((a, b) => (b.priceMonthlyUsd || 0) - (a.priceMonthlyUsd || 0));
    } else if (sortBy === 'vcpu_desc') {
      plans.sort((a, b) => (b.vcpuCount || 0) - (a.vcpuCount || 0));
    }

    const totalCount = plans.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = plans.slice(start, end).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || null,
      vcpuCount: p.vcpuCount,
      memoryGb: p.memoryGb,
      priceMonthlyUsd: p.priceMonthlyUsd,
      region: p.region,
      regionLabel: this._getRegionLabel(p.region),
      category: p.category,
      categoryLabel: this._getVmCategoryLabel(p.category),
      defaultStorageGb: p.defaultStorageGb != null ? p.defaultStorageGb : null,
      maxStorageGb: p.maxStorageGb != null ? p.maxStorageGb : null,
      networkBandwidthGbps: p.networkBandwidthGbps != null ? p.networkBandwidthGbps : null,
      isSpotEligible: !!p.isSpotEligible,
      isActive: !!p.isActive
    }));

    return { totalCount, items: pageItems };
  }

  // 4. listVMInstances(search, filters, page, pageSize)
  listVMInstances(search, filters, page, pageSize) {
    search = search || '';
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;

    let instances = this._getFromStorage('vm_instances');

    instances = instances.filter((vm) => {
      if (search) {
        const s = search.toLowerCase();
        if (!vm.name || vm.name.toLowerCase().indexOf(s) === -1) {
          if (!vm.id || vm.id.toLowerCase().indexOf(s) === -1) {
            return false;
          }
        }
      }
      if (filters.status && vm.status !== filters.status) return false;
      if (filters.region && vm.region !== filters.region) return false;
      if (filters.nameContains) {
        const n = (vm.name || '').toLowerCase();
        if (n.indexOf(filters.nameContains.toLowerCase()) === -1) return false;
      }
      return true;
    });

    const totalCount = instances.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const pageItems = instances.slice(start, end).map((vm) => ({
      id: vm.id,
      name: vm.name,
      status: vm.status,
      region: vm.region,
      regionLabel: this._getRegionLabel(vm.region),
      vcpuCount: vm.vcpuCount,
      memoryGb: vm.memoryGb,
      createdAt: vm.createdAt || null,
      backupEnabled: !!vm.backupEnabled
    }));

    return { totalCount, items: pageItems };
  }

  // 5. getVMInstanceDetails(vmInstanceId)
  getVMInstanceDetails(vmInstanceId) {
    const instances = this._getFromStorage('vm_instances');
    const vm = instances.find((i) => i.id === vmInstanceId) || null;
    if (!vm) {
      return { instance: null, planSummary: null, operatingSystemName: null };
    }

    const plans = this._getFromStorage('vm_plans');
    const osList = this._getFromStorage('operating_systems');

    const plan = plans.find((p) => p.id === vm.vmPlanId) || null;
    const os = osList.find((o) => o.id === vm.operatingSystemId) || null;

    const instance = {
      id: vm.id,
      name: vm.name,
      vmPlanId: vm.vmPlanId,
      operatingSystemId: vm.operatingSystemId,
      region: vm.region,
      regionLabel: this._getRegionLabel(vm.region),
      vcpuCount: vm.vcpuCount,
      memoryGb: vm.memoryGb,
      status: vm.status,
      ipAddress: vm.ipAddress || null,
      createdAt: vm.createdAt || null,
      backupEnabled: !!vm.backupEnabled,
      notes: vm.notes || null,
      vmPlan: plan ? this._clone(plan) : null,
      operatingSystem: os ? this._clone(os) : null
    };

    const planSummary = plan
      ? {
          name: plan.name,
          categoryLabel: this._getVmCategoryLabel(plan.category),
          priceMonthlyUsd: plan.priceMonthlyUsd
        }
      : null;

    const operatingSystemName = os ? os.name : null;

    return { instance, planSummary, operatingSystemName };
  }

  // 6. getVMPlanDetails(vmPlanId)
  getVMPlanDetails(vmPlanId) {
    const plans = this._getFromStorage('vm_plans');
    const plan = plans.find((p) => p.id === vmPlanId) || null;
    if (!plan) {
      return { plan: null, recommendedOperatingSystems: [] };
    }

    const osList = this._getFromStorage('operating_systems');
    // Simple heuristic: recommend LTS or default Linux OSs
    const recommendedOperatingSystems = osList.filter((os) => {
      if (os.family !== 'linux') return false;
      if (os.isLts) return true;
      if (os.isDefault) return true;
      return false;
    });

    const resultPlan = {
      id: plan.id,
      name: plan.name,
      description: plan.description || null,
      vcpuCount: plan.vcpuCount,
      memoryGb: plan.memoryGb,
      priceMonthlyUsd: plan.priceMonthlyUsd,
      region: plan.region,
      regionLabel: this._getRegionLabel(plan.region),
      category: plan.category,
      categoryLabel: this._getVmCategoryLabel(plan.category),
      defaultStorageGb: plan.defaultStorageGb != null ? plan.defaultStorageGb : null,
      maxStorageGb: plan.maxStorageGb != null ? plan.maxStorageGb : null,
      networkBandwidthGbps: plan.networkBandwidthGbps != null ? plan.networkBandwidthGbps : null,
      isSpotEligible: !!plan.isSpotEligible,
      isActive: !!plan.isActive
    };

    return { plan: resultPlan, recommendedOperatingSystems };
  }

  // 7. listOperatingSystems(filters)
  listOperatingSystems(filters) {
    filters = filters || {};
    const osList = this._getFromStorage('operating_systems');

    return osList.filter((os) => {
      if (filters.family && os.family !== filters.family) return false;
      if (typeof filters.isLts === 'boolean' && !!os.isLts !== filters.isLts) return false;
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const composite = ((os.name || '') + ' ' + (os.version || '')).toLowerCase();
        if (composite.indexOf(s) === -1) return false;
      }
      return true;
    });
  }

  // 8. createVMConfiguration(vmPlanId, operatingSystemId, name, region)
  createVMConfiguration(vmPlanId, operatingSystemId, name, region) {
    const plans = this._getFromStorage('vm_plans');
    const osList = this._getFromStorage('operating_systems');
    const configs = this._getFromStorage('vm_configurations');

    const plan = plans.find((p) => p.id === vmPlanId) || null;
    const os = osList.find((o) => o.id === operatingSystemId) || null;

    if (!plan) {
      return { success: false, configuration: null, message: 'VM plan not found' };
    }
    if (!os) {
      return { success: false, configuration: null, message: 'Operating system not found' };
    }

    const cfg = {
      id: this._generateId('vmcfg'),
      vmPlanId,
      name,
      operatingSystemId,
      region: region || plan.region,
      status: 'review',
      createdAt: this._now(),
      updatedAt: this._now()
    };

    configs.push(cfg);
    this._saveToStorage('vm_configurations', configs);

    return { success: true, configuration: cfg, message: 'VM configuration created' };
  }

  // 9. getVMBackupPolicyForInstance(vmInstanceId)
  getVMBackupPolicyForInstance(vmInstanceId) {
    const policies = this._getFromStorage('backup_policies');
    const attachments = this._getFromStorage('backup_policy_attachments');

    const attachment = attachments
      .filter((a) => a.vmInstanceId === vmInstanceId)
      .sort((a, b) => {
        const da = a.attachedAt ? Date.parse(a.attachedAt) : 0;
        const db = b.attachedAt ? Date.parse(b.attachedAt) : 0;
        return db - da;
      })[0];

    if (!attachment) {
      return { hasPolicy: false, policy: null };
    }

    const policy = policies.find((p) => p.id === attachment.backupPolicyId) || null;
    if (!policy) {
      return { hasPolicy: false, policy: null };
    }

    const policyWrapper = {
      backupPolicyId: policy.id,
      name: policy.name || null,
      frequency: policy.frequency,
      timeOfDay: policy.timeOfDay,
      timezone: policy.timezone || null,
      retentionDays: policy.retentionDays,
      isActive: !!policy.isActive,
      backupPolicy: this._clone(policy)
    };

    return { hasPolicy: true, policy: policyWrapper };
  }

  // 10. upsertVMBackupPolicyForInstance(vmInstanceId, frequency, timeOfDay, timezone, retentionDays, isActive)
  upsertVMBackupPolicyForInstance(vmInstanceId, frequency, timeOfDay, timezone, retentionDays, isActive) {
    if (typeof isActive !== 'boolean') {
      isActive = true;
    }

    const policies = this._getFromStorage('backup_policies');
    const attachments = this._getFromStorage('backup_policy_attachments');
    const vms = this._getFromStorage('vm_instances');

    const vm = vms.find((v) => v.id === vmInstanceId) || null;
    if (!vm) {
      return { success: false, backupPolicy: null, attachment: null, message: 'VM instance not found' };
    }

    // find or create existing policy attachment
    let attachment = attachments.find((a) => a.vmInstanceId === vmInstanceId) || null;
    let policy = null;

    if (attachment) {
      policy = policies.find((p) => p.id === attachment.backupPolicyId) || null;
    }

    if (!policy) {
      const policyId = this._generateId('bkp');
      policy = {
        id: policyId,
        name: null,
        frequency,
        timeOfDay,
        timezone: timezone || null,
        retentionDays,
        isActive,
        createdAt: this._now(),
        updatedAt: this._now()
      };
      policies.push(policy);
      attachment = {
        id: this._generateId('bkpatt'),
        backupPolicyId: policyId,
        vmInstanceId,
        attachedAt: this._now()
      };
      attachments.push(attachment);
    } else {
      policy.frequency = frequency;
      policy.timeOfDay = timeOfDay;
      policy.timezone = timezone || null;
      policy.retentionDays = retentionDays;
      policy.isActive = isActive;
      policy.updatedAt = this._now();
    }

    // enable backup flag on VM
    vm.backupEnabled = true;
    this._saveToStorage('vm_instances', vms);
    this._saveToStorage('backup_policies', policies);
    this._saveToStorage('backup_policy_attachments', attachments);

    return {
      success: true,
      backupPolicy: this._clone(policy),
      attachment: this._clone(attachment),
      message: 'Backup policy applied to VM instance'
    };
  }

  // 11. listAutoScalingGroups(filters, page, pageSize)
  listAutoScalingGroups(filters, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;

    const groups = this._getFromStorage('auto_scaling_groups');
    const services = this._getFromStorage('services');

    let filtered = groups.filter((g) => {
      if (filters.region && g.region !== filters.region) return false;
      if (filters.status && g.status !== filters.status) return false;
      if (filters.nameContains) {
        const s = filters.nameContains.toLowerCase();
        if (!g.name || g.name.toLowerCase().indexOf(s) === -1) return false;
      }
      return true;
    });

    const totalCount = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const items = filtered.slice(start, end).map((g) => {
      const service = services.find((s) => s.id === g.serviceId) || null;
      return {
        id: g.id,
        name: g.name,
        region: g.region,
        regionLabel: this._getRegionLabel(g.region),
        minInstances: g.minInstances,
        maxInstances: g.maxInstances,
        desiredInstances: g.desiredInstances != null ? g.desiredInstances : null,
        scaleMetric: g.scaleMetric,
        scaleOutThresholdPercent: g.scaleOutThresholdPercent,
        status: g.status,
        serviceName: service ? service.name : null
      };
    });

    return { totalCount, items };
  }

  // 12. getAutoScalingGroupDetails(autoScalingGroupId)
  getAutoScalingGroupDetails(autoScalingGroupId) {
    const groups = this._getFromStorage('auto_scaling_groups');
    const services = this._getFromStorage('services');
    const vmPlans = this._getFromStorage('vm_plans');

    const group = groups.find((g) => g.id === autoScalingGroupId) || null;
    if (!group) {
      return { group: null, serviceName: null, instanceTemplatePlanName: null };
    }

    const service = services.find((s) => s.id === group.serviceId) || null;
    const plan = vmPlans.find((p) => p.id === group.instanceTemplatePlanId) || null;

    const enrichedGroup = {
      ...group,
      service: service ? this._clone(service) : null,
      instanceTemplatePlan: plan ? this._clone(plan) : null
    };

    return {
      group: enrichedGroup,
      serviceName: service ? service.name : null,
      instanceTemplatePlanName: plan ? plan.name : null
    };
  }

  // 13. createAutoScalingGroup(...)
  createAutoScalingGroup(
    name,
    region,
    minInstances,
    maxInstances,
    desiredInstances,
    instanceTemplatePlanId,
    scaleMetric,
    scaleOutThresholdPercent,
    scaleInThresholdPercent,
    evaluationPeriodMinutes,
    serviceId
  ) {
    const vmPlans = this._getFromStorage('vm_plans');
    const services = this._getFromStorage('services');
    const groups = this._getFromStorage('auto_scaling_groups');

    const plan = vmPlans.find((p) => p.id === instanceTemplatePlanId) || null;
    if (!plan) {
      return { success: false, group: null, message: 'Instance template VM plan not found' };
    }

    if (serviceId) {
      const svc = services.find((s) => s.id === serviceId);
      if (!svc) {
        return { success: false, group: null, message: 'Service not found' };
      }
    }

    const validation = this._validateScalingConfiguration(
      minInstances,
      maxInstances,
      typeof desiredInstances === 'number' ? desiredInstances : minInstances,
      scaleOutThresholdPercent,
      scaleInThresholdPercent
    );
    if (!validation.valid) {
      return { success: false, group: null, message: validation.message };
    }

    const group = {
      id: this._generateId('asg'),
      name,
      region,
      minInstances,
      maxInstances,
      desiredInstances: typeof desiredInstances === 'number' ? desiredInstances : minInstances,
      instanceTemplatePlanId,
      scaleMetric,
      scaleOutThresholdPercent,
      scaleInThresholdPercent: scaleInThresholdPercent != null ? scaleInThresholdPercent : null,
      evaluationPeriodMinutes: evaluationPeriodMinutes != null ? evaluationPeriodMinutes : null,
      status: 'active',
      serviceId: serviceId || null,
      createdAt: this._now()
    };

    groups.push(group);
    this._saveToStorage('auto_scaling_groups', groups);

    return { success: true, group, message: 'Auto-scaling group created' };
  }

  // 14. updateAutoScalingGroup(...)
  updateAutoScalingGroup(
    autoScalingGroupId,
    name,
    region,
    minInstances,
    maxInstances,
    desiredInstances,
    instanceTemplatePlanId,
    scaleMetric,
    scaleOutThresholdPercent,
    scaleInThresholdPercent,
    evaluationPeriodMinutes,
    status
  ) {
    const groups = this._getFromStorage('auto_scaling_groups');
    const vmPlans = this._getFromStorage('vm_plans');

    const group = groups.find((g) => g.id === autoScalingGroupId) || null;
    if (!group) {
      return { success: false, group: null, message: 'Auto-scaling group not found' };
    }

    if (name != null) group.name = name;
    if (region != null) group.region = region;
    if (typeof minInstances === 'number') group.minInstances = minInstances;
    if (typeof maxInstances === 'number') group.maxInstances = maxInstances;
    if (typeof desiredInstances === 'number') group.desiredInstances = desiredInstances;
    if (instanceTemplatePlanId) {
      const plan = vmPlans.find((p) => p.id === instanceTemplatePlanId) || null;
      if (!plan) {
        return { success: false, group: null, message: 'Instance template VM plan not found' };
      }
      group.instanceTemplatePlanId = instanceTemplatePlanId;
    }
    if (scaleMetric != null) group.scaleMetric = scaleMetric;
    if (typeof scaleOutThresholdPercent === 'number') group.scaleOutThresholdPercent = scaleOutThresholdPercent;
    if (typeof scaleInThresholdPercent === 'number') group.scaleInThresholdPercent = scaleInThresholdPercent;
    if (typeof evaluationPeriodMinutes === 'number') group.evaluationPeriodMinutes = evaluationPeriodMinutes;
    if (status != null) group.status = status;

    const validation = this._validateScalingConfiguration(
      group.minInstances,
      group.maxInstances,
      group.desiredInstances,
      group.scaleOutThresholdPercent,
      group.scaleInThresholdPercent
    );
    if (!validation.valid) {
      return { success: false, group: null, message: validation.message };
    }

    this._saveToStorage('auto_scaling_groups', groups);

    return { success: true, group, message: 'Auto-scaling group updated' };
  }

  // 15. listAlertRules(filters, page, pageSize)
  listAlertRules(filters, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;

    const rules = this._getFromStorage('alert_rules');
    const services = this._getFromStorage('services');

    let filtered = rules.filter((r) => {
      if (filters.serviceId && r.serviceId !== filters.serviceId) return false;
      if (filters.metric && r.metric !== filters.metric) return false;
      if (filters.severity && r.severity !== filters.severity) return false;
      if (typeof filters.isEnabled === 'boolean' && !!r.isEnabled !== filters.isEnabled) return false;
      return true;
    });

    const totalCount = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const items = filtered.slice(start, end).map((r) => {
      const service = services.find((s) => s.id === r.serviceId) || null;
      return {
        id: r.id,
        name: r.name,
        serviceName: service ? service.name : null,
        metric: r.metric,
        conditionOperator: r.conditionOperator,
        thresholdValue: r.thresholdValue,
        evaluationWindowMinutes: r.evaluationWindowMinutes,
        severity: r.severity,
        isEnabled: !!r.isEnabled
      };
    });

    return { totalCount, items };
  }

  // 16. getAlertRuleDetails(alertRuleId)
  getAlertRuleDetails(alertRuleId) {
    const rules = this._getFromStorage('alert_rules');
    const services = this._getFromStorage('services');

    const rule = rules.find((r) => r.id === alertRuleId) || null;
    if (!rule) {
      return { rule: null, serviceName: null };
    }

    const service = services.find((s) => s.id === rule.serviceId) || null;

    const enrichedRule = {
      ...rule,
      service: service ? this._clone(service) : null
    };

    return { rule: enrichedRule, serviceName: service ? service.name : null };
  }

  // 17. searchServices(query, tags, primaryRegion, isProduction, page, pageSize)
  searchServices(query, tags, primaryRegion, isProduction, page, pageSize) {
    query = query || '';
    tags = tags || [];
    page = page || 1;
    pageSize = pageSize || 20;

    let services = this._getFromStorage('services');

    services = services.filter((s) => {
      if (query) {
        const q = query.toLowerCase();
        const composite = ((s.name || '') + ' ' + (s.description || '')).toLowerCase();
        if (composite.indexOf(q) === -1) return false;
      }
      if (primaryRegion && s.primaryRegion !== primaryRegion) return false;
      if (typeof isProduction === 'boolean' && !!s.isProduction !== isProduction) return false;
      if (tags && tags.length) {
        const svcTags = Array.isArray(s.tags) ? s.tags : [];
        for (let i = 0; i < tags.length; i++) {
          if (!svcTags.includes(tags[i])) return false;
        }
      }
      return true;
    });

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return services.slice(start, end).map((s) => this._clone(s));
  }

  // 18. createAlertRule(...)
  createAlertRule(
    name,
    serviceId,
    filterTags,
    metric,
    conditionOperator,
    thresholdValue,
    evaluationWindowMinutes,
    severity,
    isEnabled
  ) {
    if (typeof isEnabled !== 'boolean') {
      isEnabled = true;
    }

    const services = this._getFromStorage('services');
    const rules = this._getFromStorage('alert_rules');

    const svc = services.find((s) => s.id === serviceId) || null;
    if (!svc) {
      return { success: false, rule: null, message: 'Service not found' };
    }

    const validation = this._validateAlertCondition(metric, conditionOperator, thresholdValue, evaluationWindowMinutes);
    if (!validation.valid) {
      return { success: false, rule: null, message: validation.message };
    }

    const rule = {
      id: this._generateId('alert'),
      name,
      serviceId,
      filterTags: Array.isArray(filterTags) ? filterTags : [],
      metric,
      conditionOperator,
      thresholdValue,
      evaluationWindowMinutes,
      severity,
      isEnabled,
      createdAt: this._now()
    };

    rules.push(rule);
    this._saveToStorage('alert_rules', rules);

    return { success: true, rule, message: 'Alert rule created' };
  }

  // 19. updateAlertRule(...)
  updateAlertRule(
    alertRuleId,
    name,
    filterTags,
    metric,
    conditionOperator,
    thresholdValue,
    evaluationWindowMinutes,
    severity,
    isEnabled
  ) {
    const rules = this._getFromStorage('alert_rules');
    const rule = rules.find((r) => r.id === alertRuleId) || null;
    if (!rule) {
      return { success: false, rule: null, message: 'Alert rule not found' };
    }

    if (name != null) rule.name = name;
    if (Array.isArray(filterTags)) rule.filterTags = filterTags;
    if (metric != null) rule.metric = metric;
    if (conditionOperator != null) rule.conditionOperator = conditionOperator;
    if (typeof thresholdValue === 'number') rule.thresholdValue = thresholdValue;
    if (typeof evaluationWindowMinutes === 'number') rule.evaluationWindowMinutes = evaluationWindowMinutes;
    if (severity != null) rule.severity = severity;
    if (typeof isEnabled === 'boolean') rule.isEnabled = isEnabled;

    const validation = this._validateAlertCondition(
      rule.metric,
      rule.conditionOperator,
      rule.thresholdValue,
      rule.evaluationWindowMinutes
    );
    if (!validation.valid) {
      return { success: false, rule: null, message: validation.message };
    }

    this._saveToStorage('alert_rules', rules);

    return { success: true, rule, message: 'Alert rule updated' };
  }

  // 20. listDashboards(search, serviceId, page, pageSize)
  listDashboards(search, serviceId, page, pageSize) {
    search = search || '';
    page = page || 1;
    pageSize = pageSize || 20;

    let dashboards = this._getFromStorage('dashboards');
    const widgets = this._getFromStorage('dashboard_widgets');

    if (serviceId) {
      const dashboardIds = new Set(
        widgets
          .filter((w) => w.serviceId === serviceId)
          .map((w) => w.dashboardId)
      );
      dashboards = dashboards.filter((d) => dashboardIds.has(d.id));
    }

    if (search) {
      const s = search.toLowerCase();
      dashboards = dashboards.filter((d) => {
        const composite = ((d.name || '') + ' ' + (d.description || '')).toLowerCase();
        return composite.indexOf(s) !== -1;
      });
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return dashboards.slice(start, end).map((d) => this._clone(d));
  }

  // 21. createDashboard(name, description)
  createDashboard(name, description) {
    const dashboards = this._getFromStorage('dashboards');
    const now = this._now();
    const dashboard = {
      id: this._generateId('dash'),
      name,
      description: description || null,
      createdAt: now,
      updatedAt: now
    };
    dashboards.push(dashboard);
    this._saveToStorage('dashboards', dashboards);
    return { success: true, dashboard, message: 'Dashboard created' };
  }

  // 22. getDashboardDetails(dashboardId)
  getDashboardDetails(dashboardId) {
    const dashboards = this._getFromStorage('dashboards');
    const widgets = this._getFromStorage('dashboard_widgets');
    const services = this._getFromStorage('services');

    const dashboard = dashboards.find((d) => d.id === dashboardId) || null;
    if (!dashboard) {
      return { dashboard: null, widgets: [] };
    }

    const dashWidgets = widgets.filter((w) => w.dashboardId === dashboardId).map((w) => {
      const service = services.find((s) => s.id === w.serviceId) || null;
      return {
        ...w,
        dashboard: this._clone(dashboard),
        service: service ? this._clone(service) : null
      };
    });

    return { dashboard: this._clone(dashboard), widgets: dashWidgets };
  }

  // 23. addDashboardWidget(...)
  addDashboardWidget(
    dashboardId,
    title,
    type,
    serviceId,
    metric,
    timeRange,
    positionX,
    positionY,
    width,
    height
  ) {
    const dashboards = this._getFromStorage('dashboards');
    const services = this._getFromStorage('services');
    const widgets = this._getFromStorage('dashboard_widgets');

    const dashboard = dashboards.find((d) => d.id === dashboardId) || null;
    if (!dashboard) {
      return { success: false, widget: null, message: 'Dashboard not found' };
    }

    const service = services.find((s) => s.id === serviceId) || null;
    if (!service) {
      return { success: false, widget: null, message: 'Service not found' };
    }

    const widget = {
      id: this._generateId('dw'),
      dashboardId,
      title,
      type,
      serviceId,
      metric,
      timeRange,
      positionX: positionX != null ? positionX : null,
      positionY: positionY != null ? positionY : null,
      width: width != null ? width : null,
      height: height != null ? height : null
    };

    widgets.push(widget);
    this._saveToStorage('dashboard_widgets', widgets);

    const enrichedWidget = {
      ...widget,
      dashboard: this._clone(dashboard),
      service: this._clone(service)
    };

    return { success: true, widget: enrichedWidget, message: 'Widget added to dashboard' };
  }

  // 24. updateDashboardLayout(dashboardId, widgetsLayout)
  updateDashboardLayout(dashboardId, widgetsLayout) {
    const widgets = this._getFromStorage('dashboard_widgets');
    const dashboards = this._getFromStorage('dashboards');
    const dashboard = dashboards.find((d) => d.id === dashboardId) || null;

    widgetsLayout = Array.isArray(widgetsLayout) ? widgetsLayout : [];

    widgetsLayout.forEach((layout) => {
      const w = widgets.find((x) => x.id === layout.widgetId && x.dashboardId === dashboardId);
      if (w) {
        if (typeof layout.positionX === 'number') w.positionX = layout.positionX;
        if (typeof layout.positionY === 'number') w.positionY = layout.positionY;
        if (typeof layout.width === 'number') w.width = layout.width;
        if (typeof layout.height === 'number') w.height = layout.height;
      }
    });

    if (dashboard) {
      dashboard.updatedAt = this._now();
    }

    this._saveToStorage('dashboard_widgets', widgets);
    this._saveToStorage('dashboards', dashboards);

    return { success: true, dashboardId };
  }

  // 25. removeDashboardWidget(widgetId)
  removeDashboardWidget(widgetId) {
    let widgets = this._getFromStorage('dashboard_widgets');
    const before = widgets.length;
    widgets = widgets.filter((w) => w.id !== widgetId);
    this._saveToStorage('dashboard_widgets', widgets);
    const success = widgets.length < before;
    return { success };
  }

  // 26. getManagedDatabaseFilterOptions()
  getManagedDatabaseFilterOptions() {
    const plans = this._getFromStorage('managed_database_plans');

    const engineSet = new Set();
    const vcpuSet = new Set();
    const storageSet = new Set();
    const tierSet = new Set();
    const regionSet = new Set();

    plans.forEach((p) => {
      if (p.engine) engineSet.add(p.engine);
      if (typeof p.vcpuCount === 'number') vcpuSet.add(p.vcpuCount);
      if (typeof p.storageGb === 'number') storageSet.add(p.storageGb);
      if (p.tier) tierSet.add(p.tier);
      if (p.region) regionSet.add(p.region);
    });

    const engines = Array.from(engineSet).map((value) => ({
      value,
      label: this._getEngineLabel(value)
    }));

    const vcpuOptions = Array.from(vcpuSet).sort((a, b) => a - b);
    const storageOptionsGb = Array.from(storageSet).sort((a, b) => a - b);

    const tiers = Array.from(tierSet).map((value) => ({
      value,
      label: this._getDbTierLabel(value)
    }));

    const regions = Array.from(regionSet).map((value) => ({
      value,
      label: this._getRegionLabel(value)
    }));

    const backupOptions = [
      {
        key: 'automatic_daily_backups',
        label: 'Automatic Daily Backups'
      }
    ];

    return { engines, vcpuOptions, storageOptionsGb, tiers, regions, backupOptions };
  }

  // 27. searchManagedDatabasePlans(filters, sortBy, page, pageSize)
  searchManagedDatabasePlans(filters, sortBy, page, pageSize) {
    filters = filters || {};
    sortBy = sortBy || 'price_asc';
    page = page || 1;
    pageSize = pageSize || 20;

    let plans = this._getFromStorage('managed_database_plans');

    plans = plans.filter((p) => {
      if (filters.engine && p.engine !== filters.engine) return false;
      if (filters.vcpuMin != null && p.vcpuCount < filters.vcpuMin) return false;
      if (filters.storageMinGb != null && p.storageGb < filters.storageMinGb) return false;
      if (typeof filters.automaticDailyBackupsRequired === 'boolean') {
        if (!!p.automaticDailyBackupsIncluded !== filters.automaticDailyBackupsRequired) return false;
      }
      if (filters.priceMaxMonthlyUsd != null && p.priceMonthlyUsd > filters.priceMaxMonthlyUsd) return false;
      if (filters.region && p.region !== filters.region) return false;
      if (filters.tier && p.tier !== filters.tier) return false;
      return true;
    });

    if (sortBy === 'price_asc') {
      plans.sort((a, b) => (a.priceMonthlyUsd || 0) - (b.priceMonthlyUsd || 0));
    } else if (sortBy === 'price_desc') {
      plans.sort((a, b) => (b.priceMonthlyUsd || 0) - (a.priceMonthlyUsd || 0));
    }

    const totalCount = plans.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const items = plans.slice(start, end).map((p) => ({
      id: p.id,
      name: p.name,
      engine: p.engine,
      engineLabel: this._getEngineLabel(p.engine),
      version: p.version || null,
      vcpuCount: p.vcpuCount,
      memoryGb: p.memoryGb != null ? p.memoryGb : null,
      storageGb: p.storageGb,
      priceMonthlyUsd: p.priceMonthlyUsd,
      region: p.region,
      regionLabel: this._getRegionLabel(p.region),
      tier: p.tier,
      tierLabel: this._getDbTierLabel(p.tier),
      automaticDailyBackupsIncluded: !!p.automaticDailyBackupsIncluded,
      description: p.description || null
    }));

    return { totalCount, items };
  }

  // 28. getManagedDatabasePlanDetails(managedDatabasePlanId)
  getManagedDatabasePlanDetails(managedDatabasePlanId) {
    const plans = this._getFromStorage('managed_database_plans');
    const p = plans.find((x) => x.id === managedDatabasePlanId) || null;
    if (!p) {
      return { plan: null };
    }
    return { plan: this._clone(p) };
  }

  // 29. addManagedDatabasePlanToFavorites(managedDatabasePlanId, note)
  addManagedDatabasePlanToFavorites(managedDatabasePlanId, note) {
    let favorites = this._getOrCreateFavoritesCollection();
    const plans = this._getFromStorage('managed_database_plans');

    const plan = plans.find((p) => p.id === managedDatabasePlanId) || null;
    if (!plan) {
      return { success: false, favorite: null, totalFavorites: favorites.length, message: 'Managed database plan not found' };
    }

    let favorite = favorites.find((f) => f.managedDatabasePlanId === managedDatabasePlanId) || null;
    if (!favorite) {
      favorite = {
        id: this._generateId('favdb'),
        managedDatabasePlanId,
        addedAt: this._now(),
        note: note || null
      };
      favorites.push(favorite);
      this._saveToStorage('favorite_plans', favorites);
    } else if (note != null) {
      favorite.note = note;
      this._saveToStorage('favorite_plans', favorites);
    }

    return {
      success: true,
      favorite: this._clone(favorite),
      totalFavorites: favorites.length,
      message: 'Plan added to favorites'
    };
  }

  // 30. getFavoritePlans()
  getFavoritePlans() {
    const favorites = this._getFromStorage('favorite_plans');
    const dbPlans = this._getFromStorage('managed_database_plans');

    return favorites.map((f) => {
      const plan = dbPlans.find((p) => p.id === f.managedDatabasePlanId) || null;
      return {
        favoriteId: f.id,
        managedDatabasePlanId: f.managedDatabasePlanId,
        name: plan ? plan.name : null,
        engineLabel: plan ? this._getEngineLabel(plan.engine) : null,
        vcpuCount: plan ? plan.vcpuCount : null,
        memoryGb: plan ? plan.memoryGb : null,
        storageGb: plan ? plan.storageGb : null,
        priceMonthlyUsd: plan ? plan.priceMonthlyUsd : null,
        regionLabel: plan ? this._getRegionLabel(plan.region) : null,
        tierLabel: plan ? this._getDbTierLabel(plan.tier) : null,
        automaticDailyBackupsIncluded: plan ? !!plan.automaticDailyBackupsIncluded : null,
        note: f.note || null,
        managedDatabasePlan: plan ? this._clone(plan) : null
      };
    });
  }

  // 31. removeFavoritePlan(favoritePlanId)
  removeFavoritePlan(favoritePlanId) {
    let favorites = this._getFromStorage('favorite_plans');
    const before = favorites.length;
    favorites = favorites.filter((f) => f.id !== favoritePlanId);
    this._saveToStorage('favorite_plans', favorites);
    const remainingCount = favorites.length;
    const success = remainingCount < before;
    return { success, remainingCount };
  }

  // 32. getActivePricingEstimate()
  getActivePricingEstimate() {
    const { estimate, lineItems } = this._getOrCreateActivePricingEstimate();
    // Ensure totals are up to date
    const recalced = this._recalculatePricingEstimateTotals(estimate.id);
    const vmPlans = this._getFromStorage('vm_plans');
    const dbPlans = this._getFromStorage('managed_database_plans');
    const lbPlans = this._getFromStorage('load_balancer_plans');

    const enrichedItems = recalced.lineItems.map((li) => {
      const vmPlan = li.vmPlanId ? vmPlans.find((p) => p.id === li.vmPlanId) || null : null;
      const managedDatabasePlan = li.managedDatabasePlanId
        ? dbPlans.find((p) => p.id === li.managedDatabasePlanId) || null
        : null;
      const loadBalancerPlan = li.loadBalancerPlanId
        ? lbPlans.find((p) => p.id === li.loadBalancerPlanId) || null
        : null;
      return {
        ...li,
        vmPlan: vmPlan ? this._clone(vmPlan) : null,
        managedDatabasePlan: managedDatabasePlan ? this._clone(managedDatabasePlan) : null,
        loadBalancerPlan: loadBalancerPlan ? this._clone(loadBalancerPlan) : null
      };
    });

    return { estimate: this._clone(recalced.estimate), lineItems: enrichedItems };
  }

  // 33. addPricingEstimateLineItem(...)
  addPricingEstimateLineItem(
    serviceType,
    vmPlanId,
    managedDatabasePlanId,
    loadBalancerPlanId,
    description,
    quantity,
    region,
    usageHoursPerMonth
  ) {
    const { estimate } = this._getOrCreateActivePricingEstimate();
    let lineItems = this._getFromStorage('pricing_estimate_line_items');
    const vmPlans = this._getFromStorage('vm_plans');
    const dbPlans = this._getFromStorage('managed_database_plans');
    const lbPlans = this._getFromStorage('load_balancer_plans');

    // Validate referenced plan
    let planPrice = 0;
    if (serviceType === 'virtual_machine') {
      const plan = vmPlans.find((p) => p.id === vmPlanId) || null;
      if (!plan) {
        return this.getActivePricingEstimate();
      }
      planPrice = plan.priceMonthlyUsd;
    } else if (serviceType === 'managed_database') {
      const plan = dbPlans.find((p) => p.id === managedDatabasePlanId) || null;
      if (!plan) {
        return this.getActivePricingEstimate();
      }
      planPrice = plan.priceMonthlyUsd;
    } else if (serviceType === 'load_balancer') {
      const plan = lbPlans.find((p) => p.id === loadBalancerPlanId) || null;
      if (!plan) {
        return this.getActivePricingEstimate();
      }
      planPrice = plan.priceMonthlyUsd;
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const usageHours = typeof usageHoursPerMonth === 'number' ? usageHoursPerMonth : 730;
    const usageFactor = usageHours / 730;
    const subtotal = planPrice * usageFactor * qty;

    const lineItem = {
      id: this._generateId('pli'),
      estimateId: estimate.id,
      serviceType,
      vmPlanId: serviceType === 'virtual_machine' ? vmPlanId : null,
      managedDatabasePlanId: serviceType === 'managed_database' ? managedDatabasePlanId : null,
      loadBalancerPlanId: serviceType === 'load_balancer' ? loadBalancerPlanId : null,
      description: description || null,
      quantity: qty,
      region: region || null,
      usageHoursPerMonth: usageHours,
      pricePerUnitMonthlyUsd: planPrice,
      subtotalMonthlyUsd: Number(subtotal.toFixed(2))
    };

    lineItems.push(lineItem);
    this._saveToStorage('pricing_estimate_line_items', lineItems);

    const recalced = this._recalculatePricingEstimateTotals(estimate.id);

    const vmPlans2 = this._getFromStorage('vm_plans');
    const dbPlans2 = this._getFromStorage('managed_database_plans');
    const lbPlans2 = this._getFromStorage('load_balancer_plans');

    const enrichedItems = recalced.lineItems.map((li) => {
      const vmPlan = li.vmPlanId ? vmPlans2.find((p) => p.id === li.vmPlanId) || null : null;
      const managedDatabasePlan = li.managedDatabasePlanId
        ? dbPlans2.find((p) => p.id === li.managedDatabasePlanId) || null
        : null;
      const loadBalancerPlan = li.loadBalancerPlanId
        ? lbPlans2.find((p) => p.id === li.loadBalancerPlanId) || null
        : null;
      return {
        ...li,
        vmPlan: vmPlan ? this._clone(vmPlan) : null,
        managedDatabasePlan: managedDatabasePlan ? this._clone(managedDatabasePlan) : null,
        loadBalancerPlan: loadBalancerPlan ? this._clone(loadBalancerPlan) : null
      };
    });

    return { estimate: this._clone(recalced.estimate), lineItems: enrichedItems };
  }

  // 34. updatePricingEstimateLineItem(...)
  updatePricingEstimateLineItem(
    lineItemId,
    vmPlanId,
    managedDatabasePlanId,
    loadBalancerPlanId,
    quantity,
    region,
    usageHoursPerMonth
  ) {
    let lineItems = this._getFromStorage('pricing_estimate_line_items');
    const vmPlans = this._getFromStorage('vm_plans');
    const dbPlans = this._getFromStorage('managed_database_plans');
    const lbPlans = this._getFromStorage('load_balancer_plans');

    const li = lineItems.find((x) => x.id === lineItemId) || null;
    if (!li) {
      return this.getActivePricingEstimate();
    }

    if (vmPlanId && li.serviceType === 'virtual_machine') li.vmPlanId = vmPlanId;
    if (managedDatabasePlanId && li.serviceType === 'managed_database') li.managedDatabasePlanId = managedDatabasePlanId;
    if (loadBalancerPlanId && li.serviceType === 'load_balancer') li.loadBalancerPlanId = loadBalancerPlanId;
    if (typeof quantity === 'number' && quantity > 0) li.quantity = quantity;
    if (region != null) li.region = region;
    if (typeof usageHoursPerMonth === 'number') li.usageHoursPerMonth = usageHoursPerMonth;

    // Update price per unit based on possibly changed plan
    if (li.serviceType === 'virtual_machine' && li.vmPlanId) {
      const plan = vmPlans.find((p) => p.id === li.vmPlanId) || null;
      if (plan) li.pricePerUnitMonthlyUsd = plan.priceMonthlyUsd;
    } else if (li.serviceType === 'managed_database' && li.managedDatabasePlanId) {
      const plan = dbPlans.find((p) => p.id === li.managedDatabasePlanId) || null;
      if (plan) li.pricePerUnitMonthlyUsd = plan.priceMonthlyUsd;
    } else if (li.serviceType === 'load_balancer' && li.loadBalancerPlanId) {
      const plan = lbPlans.find((p) => p.id === li.loadBalancerPlanId) || null;
      if (plan) li.pricePerUnitMonthlyUsd = plan.priceMonthlyUsd;
    }

    this._saveToStorage('pricing_estimate_line_items', lineItems);

    const recalced = this._recalculatePricingEstimateTotals(li.estimateId);

    const vmPlans2 = this._getFromStorage('vm_plans');
    const dbPlans2 = this._getFromStorage('managed_database_plans');
    const lbPlans2 = this._getFromStorage('load_balancer_plans');

    const enrichedItems = recalced.lineItems.map((item) => {
      const vmPlan = item.vmPlanId ? vmPlans2.find((p) => p.id === item.vmPlanId) || null : null;
      const managedDatabasePlan = item.managedDatabasePlanId
        ? dbPlans2.find((p) => p.id === item.managedDatabasePlanId) || null
        : null;
      const loadBalancerPlan = item.loadBalancerPlanId
        ? lbPlans2.find((p) => p.id === item.loadBalancerPlanId) || null
        : null;
      return {
        ...item,
        vmPlan: vmPlan ? this._clone(vmPlan) : null,
        managedDatabasePlan: managedDatabasePlan ? this._clone(managedDatabasePlan) : null,
        loadBalancerPlan: loadBalancerPlan ? this._clone(loadBalancerPlan) : null
      };
    });

    return { estimate: this._clone(recalced.estimate), lineItems: enrichedItems };
  }

  // 35. removePricingEstimateLineItem(lineItemId)
  removePricingEstimateLineItem(lineItemId) {
    let lineItems = this._getFromStorage('pricing_estimate_line_items');
    const target = lineItems.find((li) => li.id === lineItemId) || null;
    if (!target) {
      return this.getActivePricingEstimate();
    }

    const estimateId = target.estimateId;
    lineItems = lineItems.filter((li) => li.id !== lineItemId);
    this._saveToStorage('pricing_estimate_line_items', lineItems);

    const recalced = this._recalculatePricingEstimateTotals(estimateId);

    const vmPlans = this._getFromStorage('vm_plans');
    const dbPlans = this._getFromStorage('managed_database_plans');
    const lbPlans = this._getFromStorage('load_balancer_plans');

    const enrichedItems = recalced.lineItems.map((item) => {
      const vmPlan = item.vmPlanId ? vmPlans.find((p) => p.id === item.vmPlanId) || null : null;
      const managedDatabasePlan = item.managedDatabasePlanId
        ? dbPlans.find((p) => p.id === item.managedDatabasePlanId) || null
        : null;
      const loadBalancerPlan = item.loadBalancerPlanId
        ? lbPlans.find((p) => p.id === item.loadBalancerPlanId) || null
        : null;
      return {
        ...item,
        vmPlan: vmPlan ? this._clone(vmPlan) : null,
        managedDatabasePlan: managedDatabasePlan ? this._clone(managedDatabasePlan) : null,
        loadBalancerPlan: loadBalancerPlan ? this._clone(loadBalancerPlan) : null
      };
    });

    return { estimate: this._clone(recalced.estimate), lineItems: enrichedItems };
  }

  // 36. saveCurrentPricingEstimate(name)
  saveCurrentPricingEstimate(name) {
    const estimates = this._getFromStorage('pricing_estimates');
    let estimate = estimates.find((e) => e.isSaved === false) || null;

    if (!estimate) {
      // Fallback to last estimate if none unsaved
      if (estimates.length) {
        estimate = estimates[estimates.length - 1];
      } else {
        const created = this._getOrCreateActivePricingEstimate().estimate;
        estimate = created;
      }
    }

    if (name != null) estimate.name = name;
    estimate.isSaved = true;
    estimate.updatedAt = this._now();

    this._saveToStorage('pricing_estimates', estimates);

    return { estimate: this._clone(estimate) };
  }

  // 37. listLoadBalancerPlans(filters)
  listLoadBalancerPlans(filters) {
    filters = filters || {};
    let plans = this._getFromStorage('load_balancer_plans');

    plans = plans.filter((p) => {
      if (filters.region && p.region !== filters.region) return false;
      if (filters.tier && p.tier !== filters.tier) return false;
      return true;
    });

    return plans.map((p) => this._clone(p));
  }

  // 38. searchLogStreams(query, tags, page, pageSize)
  searchLogStreams(query, tags, page, pageSize) {
    query = query || '';
    tags = tags || [];
    page = page || 1;
    pageSize = pageSize || 20;

    const streams = this._getFromStorage('log_streams');
    const services = this._getFromStorage('services');

    let filtered = streams.filter((ls) => {
      if (query) {
        const q = query.toLowerCase();
        const composite = ((ls.name || '') + ' ' + (ls.description || '')).toLowerCase();
        if (composite.indexOf(q) === -1) return false;
      }
      if (tags && tags.length) {
        const lsTags = Array.isArray(ls.tags) ? ls.tags : [];
        for (let i = 0; i < tags.length; i++) {
          if (!lsTags.includes(tags[i])) return false;
        }
      }
      return true;
    });

    const totalCount = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const items = filtered.slice(start, end).map((ls) => {
      const service = services.find((s) => s.id === ls.serviceId) || null;
      return {
        id: ls.id,
        name: ls.name,
        description: ls.description || null,
        tags: Array.isArray(ls.tags) ? ls.tags : [],
        serviceName: service ? service.name : null,
        createdAt: ls.createdAt || null
      };
    });

    return { totalCount, items };
  }

  // 39. getLogStreamDetails(logStreamId)
  getLogStreamDetails(logStreamId) {
    const streams = this._getFromStorage('log_streams');
    const services = this._getFromStorage('services');

    const ls = streams.find((s) => s.id === logStreamId) || null;
    if (!ls) {
      return {
        logStream: null,
        serviceName: null,
        summaryMetrics: null,
        hasAnomalyDetectionRule: false
      };
    }

    const service = services.find((s) => s.id === ls.serviceId) || null;
    const rules = this._getFromStorage('anomaly_detection_rules');
    const hasRule = !!rules.find((r) => r.logStreamId === logStreamId);

    const summaryMetrics = {
      eventCountLastHour: 0,
      errorCountLastHour: 0,
      averageResponseTimeMs: 0,
      lastEventAt: null
    };

    const logStream = {
      ...ls,
      service: service ? this._clone(service) : null
    };

    return {
      logStream,
      serviceName: service ? service.name : null,
      summaryMetrics,
      hasAnomalyDetectionRule: hasRule
    };
  }

  // 40. getAnomalyDetectionRuleForLogStream(logStreamId)
  getAnomalyDetectionRuleForLogStream(logStreamId) {
    const rules = this._getFromStorage('anomaly_detection_rules');
    const streams = this._getFromStorage('log_streams');

    const rule = rules.find((r) => r.logStreamId === logStreamId) || null;
    if (!rule) {
      return { exists: false, rule: null };
    }

    const logStream = streams.find((s) => s.id === logStreamId) || null;

    return {
      exists: true,
      rule: {
        ...rule,
        logStream: logStream ? this._clone(logStream) : null
      }
    };
  }

  // 41. createOrUpdateAnomalyDetectionRule(...)
  createOrUpdateAnomalyDetectionRule(logStreamId, trainingWindowDays, sensitivity, metricField, isEnabled) {
    if (typeof isEnabled !== 'boolean') {
      isEnabled = true;
    }

    const rules = this._getFromStorage('anomaly_detection_rules');
    const streams = this._getFromStorage('log_streams');

    const ls = streams.find((s) => s.id === logStreamId) || null;
    if (!ls) {
      return { rule: null, message: 'Log stream not found' };
    }

    let rule = rules.find((r) => r.logStreamId === logStreamId) || null;

    if (!rule) {
      rule = {
        id: this._generateId('adr'),
        logStreamId,
        name: null,
        trainingWindowDays,
        sensitivity,
        metricField,
        isEnabled,
        createdAt: this._now()
      };
      rules.push(rule);
    } else {
      rule.trainingWindowDays = trainingWindowDays;
      rule.sensitivity = sensitivity;
      rule.metricField = metricField;
      rule.isEnabled = isEnabled;
    }

    this._saveToStorage('anomaly_detection_rules', rules);

    return {
      rule: {
        ...rule,
        logStream: this._clone(ls)
      },
      message: 'Anomaly detection rule saved'
    };
  }

  // 42. listIncidentRules(filters, page, pageSize)
  listIncidentRules(filters, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;

    const rules = this._getFromStorage('incident_rules');
    const teams = this._getFromStorage('teams');

    let filtered = rules.filter((r) => {
      if (filters.metric && r.metric !== filters.metric) return false;
      if (filters.incidentPriority && r.incidentPriority !== filters.incidentPriority) return false;
      if (filters.assignedTeamId && r.assignedTeamId !== filters.assignedTeamId) return false;
      if (typeof filters.isEnabled === 'boolean' && !!r.isEnabled !== filters.isEnabled) return false;
      return true;
    });

    const totalCount = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    const items = filtered.slice(start, end).map((r) => {
      const team = teams.find((t) => t.id === r.assignedTeamId) || null;
      return {
        id: r.id,
        name: r.name,
        triggerType: r.triggerType,
        metric: r.metric || null,
        conditionOperator: r.conditionOperator || null,
        thresholdValue: r.thresholdValue != null ? r.thresholdValue : null,
        thresholdUnit: r.thresholdUnit || null,
        evaluationWindowMinutes: r.evaluationWindowMinutes != null ? r.evaluationWindowMinutes : null,
        incidentPriority: r.incidentPriority,
        assignedTeamName: team ? team.name : null,
        isEnabled: !!r.isEnabled
      };
    });

    return { totalCount, items };
  }

  // 43. getIncidentRuleDetails(incidentRuleId)
  getIncidentRuleDetails(incidentRuleId) {
    const rules = this._getFromStorage('incident_rules');
    const teams = this._getFromStorage('teams');
    const services = this._getFromStorage('services');

    const rule = rules.find((r) => r.id === incidentRuleId) || null;
    if (!rule) {
      return { rule: null, assignedTeamName: null, serviceName: null };
    }

    const team = teams.find((t) => t.id === rule.assignedTeamId) || null;
    const service = rule.serviceId ? services.find((s) => s.id === rule.serviceId) || null : null;

    const enrichedRule = {
      ...rule,
      assignedTeam: team ? this._clone(team) : null,
      service: service ? this._clone(service) : null
    };

    return {
      rule: enrichedRule,
      assignedTeamName: team ? team.name : null,
      serviceName: service ? service.name : null
    };
  }

  // 44. listTeams()
  listTeams() {
    const teams = this._getFromStorage('teams');
    return teams.map((t) => this._clone(t));
  }

  // 45. createIncidentRule(...)
  createIncidentRule(
    name,
    triggerType,
    metric,
    conditionOperator,
    thresholdValue,
    thresholdUnit,
    evaluationWindowMinutes,
    scopeType,
    serviceId,
    tagFilter,
    incidentPriority,
    assignedTeamId,
    isEnabled
  ) {
    if (typeof isEnabled !== 'boolean') {
      isEnabled = true;
    }

    const teams = this._getFromStorage('teams');
    const services = this._getFromStorage('services');

    const team = teams.find((t) => t.id === assignedTeamId) || null;
    if (!team) {
      return { rule: null, message: 'Assigned team not found' };
    }

    let service = null;
    if (serviceId) {
      service = services.find((s) => s.id === serviceId) || null;
      if (!service) {
        return { rule: null, message: 'Service not found' };
      }
    }

    const validation = this._validateIncidentRuleCondition(
      triggerType,
      metric,
      conditionOperator,
      thresholdValue,
      thresholdUnit,
      evaluationWindowMinutes
    );
    if (!validation.valid) {
      return { rule: null, message: validation.message };
    }

    const rules = this._getFromStorage('incident_rules');

    const rule = {
      id: this._generateId('irule'),
      name,
      triggerType,
      metric: metric || null,
      conditionOperator: conditionOperator || null,
      thresholdValue: thresholdValue != null ? thresholdValue : null,
      thresholdUnit: thresholdUnit || null,
      evaluationWindowMinutes: evaluationWindowMinutes != null ? evaluationWindowMinutes : null,
      scopeType: scopeType || null,
      serviceId: serviceId || null,
      tagFilter: Array.isArray(tagFilter) ? tagFilter : [],
      incidentPriority,
      assignedTeamId,
      isEnabled,
      createdAt: this._now()
    };

    rules.push(rule);
    this._saveToStorage('incident_rules', rules);

    const enrichedRule = {
      ...rule,
      assignedTeam: this._clone(team),
      service: service ? this._clone(service) : null
    };

    return { rule: enrichedRule, message: 'Incident rule created' };
  }

  // 46. updateIncidentRule(...)
  updateIncidentRule(
    incidentRuleId,
    name,
    metric,
    conditionOperator,
    thresholdValue,
    thresholdUnit,
    evaluationWindowMinutes,
    scopeType,
    serviceId,
    tagFilter,
    incidentPriority,
    assignedTeamId,
    isEnabled
  ) {
    const rules = this._getFromStorage('incident_rules');
    const teams = this._getFromStorage('teams');
    const services = this._getFromStorage('services');

    const rule = rules.find((r) => r.id === incidentRuleId) || null;
    if (!rule) {
      return { rule: null, message: 'Incident rule not found' };
    }

    if (name != null) rule.name = name;
    if (metric != null) rule.metric = metric;
    if (conditionOperator != null) rule.conditionOperator = conditionOperator;
    if (thresholdValue != null) rule.thresholdValue = thresholdValue;
    if (thresholdUnit != null) rule.thresholdUnit = thresholdUnit;
    if (evaluationWindowMinutes != null) rule.evaluationWindowMinutes = evaluationWindowMinutes;
    if (scopeType != null) rule.scopeType = scopeType;
    if (Array.isArray(tagFilter)) rule.tagFilter = tagFilter;
    if (incidentPriority != null) rule.incidentPriority = incidentPriority;
    if (typeof isEnabled === 'boolean') rule.isEnabled = isEnabled;

    let team = null;
    if (assignedTeamId) {
      team = teams.find((t) => t.id === assignedTeamId) || null;
      if (!team) {
        return { rule: null, message: 'Assigned team not found' };
      }
      rule.assignedTeamId = assignedTeamId;
    } else {
      team = teams.find((t) => t.id === rule.assignedTeamId) || null;
    }

    let service = null;
    if (serviceId) {
      service = services.find((s) => s.id === serviceId) || null;
      if (!service) {
        return { rule: null, message: 'Service not found' };
      }
      rule.serviceId = serviceId;
    } else if (rule.serviceId) {
      service = services.find((s) => s.id === rule.serviceId) || null;
    }

    const validation = this._validateIncidentRuleCondition(
      rule.triggerType,
      rule.metric,
      rule.conditionOperator,
      rule.thresholdValue,
      rule.thresholdUnit,
      rule.evaluationWindowMinutes
    );
    if (!validation.valid) {
      return { rule: null, message: validation.message };
    }

    this._saveToStorage('incident_rules', rules);

    const enrichedRule = {
      ...rule,
      assignedTeam: team ? this._clone(team) : null,
      service: service ? this._clone(service) : null
    };

    return { rule: enrichedRule, message: 'Incident rule updated' };
  }

  // 47. getDocumentationSections()
  getDocumentationSections() {
    // No persisted documentation structure; return empty sections list
    return [];
  }

  // 48. getDocumentationPage(slug)
  getDocumentationPage(slug) {
    // No documentation content persisted; return a minimal placeholder
    return {
      slug,
      title: null,
      contentMarkdown: '',
      relatedProductLinks: []
    };
  }

  // 49. getAboutContent()
  getAboutContent() {
    return {
      mission: 'Provide reliable cloud computing and AIOps tooling for modern teams.',
      platformOverview:
        'This platform offers compute, data, and monitoring capabilities designed for scalability and operational excellence.',
      keyCapabilities: [
        'Virtual machines and auto-scaling',
        'Managed databases with automated backups',
        'Monitoring dashboards and alerting',
        'AIOps features including anomaly detection and incident automation'
      ],
      targetUsers: ['SRE teams', 'DevOps engineers', 'Developers', 'IT operations']
    };
  }

  // 50. getContactInfo()
  getContactInfo() {
    return {
      supportEmail: 'support@example.com',
      salesEmail: 'sales@example.com',
      phoneNumbers: [
        { label: 'Support', number: '+1-000-000-0000' },
        { label: 'Sales', number: '+1-000-000-0001' }
      ],
      officeHours: '24/7 support for critical issues; business hours for sales inquiries.',
      docsQuickLinks: []
    };
  }

  // 51. submitContactRequest(contactType, name, email, subject, message)
  submitContactRequest(contactType, name, email, subject, message) {
    const requests = this._getFromStorage('contact_requests');
    const ticketId = this._generateId('ticket');

    const record = {
      id: ticketId,
      contactType,
      name,
      email,
      subject,
      message,
      createdAt: this._now()
    };

    requests.push(record);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      ticketId,
      message: 'Your request has been received.'
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