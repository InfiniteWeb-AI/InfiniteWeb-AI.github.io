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

  // ------------------------
  // Storage & ID helpers
  // ------------------------

  _initStorage() {
    // Entity tables
    const arrayKeys = [
      'regions',
      'vm_sizes',
      'vpc_networks',
      'subnets',
      'virtual_machine_instances',
      'vm_provisioning_requests',
      'clusters',
      'metric_definitions',
      'notification_channels',
      'alert_rules',
      'projects',
      'services',
      'deployment_pipelines',
      'deployment_traffic_steps',
      'kubernetes_workloads',
      'autoscaling_policies',
      'roles',
      'permissions',
      'role_assignments',
      'database_clusters',
      'maintenance_windows',
      'service_cost_summaries',
      'storage_buckets',
      'backup_policies',
      'dashboards',
      'dashboard_widgets',
      // extra internal tables
      'users',
      'help_topics',
      'alert_events',
      'workload_scaling_events',
      'workload_pods',
      'workload_performance_summaries',
      'bucket_usage_metrics',
      'database_performance_summaries'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // user_settings as object
    if (!localStorage.getItem('user_settings')) {
      const defaultSettings = {
        timezone: 'UTC',
        defaultProjectId: null,
        defaultLandingPages: {
          monitoring: null,
          costManagement: null
        },
        notificationPreferences: {
          alerts: true,
          maintenanceReminders: true
        },
        tableDefaults: {
          pageSize: 25
        },
        chartDefaults: {
          timeRange: 'last_24_hours'
        }
      };
      localStorage.setItem('user_settings', JSON.stringify(defaultSettings));
    }

    // about_info as object
    if (!localStorage.getItem('about_info')) {
      const about = {
        platformName: '',
        description: '',
        ownerTeam: '',
        contactEmail: '',
        currentVersion: '',
        releaseNotes: [],
        documentationLinks: []
      };
      localStorage.setItem('about_info', JSON.stringify(about));
    }

    // id counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      if (typeof defaultValue !== 'undefined') {
        return JSON.parse(JSON.stringify(defaultValue));
      }
      return [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      if (typeof defaultValue !== 'undefined') {
        return JSON.parse(JSON.stringify(defaultValue));
      }
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

  _buildMapById(items) {
    const map = {};
    for (const item of items) {
      if (item && item.id) {
        map[item.id] = item;
      }
    }
    return map;
  }

  _paginate(items, page, pageSize) {
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 25;
    const start = (p - 1) * size;
    const end = start + size;
    return items.slice(start, end);
  }

  _filterBySearchQuery(items, fields, searchQuery) {
    if (!searchQuery) return items;
    const q = String(searchQuery).toLowerCase();
    return items.filter((item) => {
      return fields.some((field) => {
        const value = item && item[field];
        if (value === null || typeof value === 'undefined') return false;
        return String(value).toLowerCase().includes(q);
      });
    });
  }

  _getCurrentProjectId() {
    const settings = this._getFromStorage('user_settings', {});
    return settings && settings.defaultProjectId ? settings.defaultProjectId : null;
  }

  _persistUserSettings(settings) {
    this._saveToStorage('user_settings', settings);
  }

  _validateTimeRange(start, end) {
    // Accept ISO strings, ensure chronological order, but preserve original input format for equality checks
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date range');
    }
    if (endDate.getTime() < startDate.getTime()) {
      throw new Error('End time must be after start time');
    }
    return {
      start: typeof start === 'string' ? start : startDate.toISOString(),
      end: typeof end === 'string' ? end : endDate.toISOString()
    };
  }

  _mapMaintenanceTypeLabel(label) {
    if (!label) return 'other';
    const normalized = String(label).toLowerCase();
    if (normalized.includes('security')) return 'security_patching';
    if (normalized.includes('bug')) return 'bugfix';
    if (normalized.includes('migrat')) return 'data_migration';
    if (normalized.includes('upgrade')) return 'upgrade';
    return 'other';
  }

  _deepMerge(target, source) {
    if (!source) return target;
    const result = Array.isArray(target) ? target.slice() : Object.assign({}, target);
    Object.keys(source).forEach((key) => {
      const srcVal = source[key];
      const tgtVal = result[key];
      if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal)) {
        result[key] = this._deepMerge(tgtVal && typeof tgtVal === 'object' ? tgtVal : {}, srcVal);
      } else {
        result[key] = srcVal;
      }
    });
    return result;
  }

  // ------------------------
  // HOME INTERFACES
  // ------------------------

  getHomeSummaryTiles() {
    const vms = this._getFromStorage('virtual_machine_instances', []);
    const workloads = this._getFromStorage('kubernetes_workloads', []);
    const autoscalingPolicies = this._getFromStorage('autoscaling_policies', []);
    const dbClusters = this._getFromStorage('database_clusters', []);
    const maintenanceWindows = this._getFromStorage('maintenance_windows', []);
    const buckets = this._getFromStorage('storage_buckets', []);
    const backupPolicies = this._getFromStorage('backup_policies', []);
    const alertRules = this._getFromStorage('alert_rules', []);
    const alertEvents = this._getFromStorage('alert_events', []);

    const compute = {
      totalInstances: vms.length,
      runningInstances: vms.filter((vm) => vm.state === 'running').length,
      stoppedInstances: vms.filter((vm) => vm.state === 'stopped').length,
      criticalIssues: vms.filter((vm) => vm.state === 'error').length
    };

    const autoscaledWorkloadIds = new Set(
      autoscalingPolicies
        .filter((p) => p.isEnabled)
        .map((p) => p.workloadId)
    );

    const kubernetes = {
      totalWorkloads: workloads.length,
      workloadsWithIssues: workloads.filter((w) => w.status === 'error' || w.status === 'pending').length,
      autoscaledWorkloads: Array.from(autoscaledWorkloadIds).length
    };

    const now = new Date();
    const databases = {
      totalClusters: dbClusters.length,
      inMaintenance: dbClusters.filter((c) => c.status === 'maintenance').length,
      upcomingMaintenanceWindows: maintenanceWindows.filter((mw) => {
        if (mw.status !== 'scheduled') return false;
        const start = new Date(mw.startTime);
        return start.getTime() >= now.getTime();
      }).length
    };

    const bucketIdToHasActivePolicy = new Set(
      backupPolicies
        .filter((bp) => bp.isActive)
        .map((bp) => bp.bucketId)
    );

    const storage = {
      totalBuckets: buckets.length,
      bucketsWithBackups: buckets.filter((b) => bucketIdToHasActivePolicy.has(b.id)).length,
      bucketsWithoutBackups: buckets.filter((b) => !bucketIdToHasActivePolicy.has(b.id)).length
    };

    const monitoring = {
      activeAlertRules: alertRules.filter((r) => r.isEnabled).length,
      firingAlerts: alertEvents.filter((e) => e.status === 'firing').length,
      highSeverityAlerts: alertEvents.filter((e) => e.status === 'firing' && (e.severity === 'high' || e.severity === 'critical')).length
    };

    return { compute, kubernetes, databases, storage, monitoring };
  }

  getHomeImportantResources() {
    const clusters = this._getFromStorage('clusters', []);
    const dbClusters = this._getFromStorage('database_clusters', []);
    const services = this._getFromStorage('services', []);
    const buckets = this._getFromStorage('storage_buckets', []);
    const projects = this._getFromStorage('projects', []);
    const projectsById = this._buildMapById(projects);

    const resources = [];

    clusters.forEach((c) => {
      const project = projectsById[c.projectId] || null;
      resources.push({
        resourceType: 'cluster',
        resourceId: c.id,
        name: c.name,
        status: c.status,
        projectName: project ? project.name : null,
        environment: c.environment || null
      });
    });

    dbClusters.forEach((c) => {
      const project = projectsById[c.projectId] || null;
      resources.push({
        resourceType: 'database_cluster',
        resourceId: c.id,
        name: c.name,
        status: c.status,
        projectName: project ? project.name : null,
        environment: c.environment || null
      });
    });

    services.forEach((s) => {
      const project = projectsById[s.projectId] || null;
      resources.push({
        resourceType: 'service',
        resourceId: s.id,
        name: s.name,
        status: s.environment || null,
        projectName: project ? project.name : null,
        environment: s.environment || null
      });
    });

    buckets.forEach((b) => {
      const project = projectsById[b.projectId] || null;
      resources.push({
        resourceType: 'bucket',
        resourceId: b.id,
        name: b.name,
        status: b.storageClass,
        projectName: project ? project.name : null,
        environment: null
      });
    });

    // Optionally limit the list
    return resources.slice(0, 20);
  }

  getHomeKeyAlertsSummary() {
    const alertEvents = this._getFromStorage('alert_events', []);
    const alertRules = this._getFromStorage('alert_rules', []);
    const rulesById = this._buildMapById(alertRules);

    const firing = alertEvents.filter((e) => e.status === 'firing');
    const totalFiring = firing.length;

    const bySeverity = { info: 0, low: 0, medium: 0, high: 0, critical: 0 };
    firing.forEach((e) => {
      if (bySeverity.hasOwnProperty(e.severity)) {
        bySeverity[e.severity] += 1;
      }
    });

    const topAlerts = firing
      .slice() // clone
      .sort((a, b) => {
        const dateA = new Date(a.since || 0).getTime();
        const dateB = new Date(b.since || 0).getTime();
        return dateA - dateB; // oldest first
      })
      .slice(0, 10)
      .map((e) => {
        const rule = rulesById[e.alertRuleId] || null;
        return {
          alertRuleId: e.alertRuleId,
          alertRuleName: rule ? rule.name : null,
          severity: e.severity,
          resourceName: e.resourceName || null,
          resourceType: e.resourceType || (rule ? rule.resourceType : null),
          since: e.since || null
        };
      });

    return { totalFiring, bySeverity, topAlerts };
  }

  getHomeCostHighlights() {
    const summaries = this._getFromStorage('service_cost_summaries', []);
    const projects = this._getFromStorage('projects', []);
    const services = this._getFromStorage('services', []);
    const projectsById = this._buildMapById(projects);
    const servicesById = this._buildMapById(services);

    const projectAgg = {};
    const serviceAgg = {};

    summaries.forEach((s) => {
      if (!projectAgg[s.projectId]) {
        projectAgg[s.projectId] = { totalCost: 0, currency: s.currency };
      }
      projectAgg[s.projectId].totalCost += s.totalCost;

      if (!serviceAgg[s.serviceId]) {
        serviceAgg[s.serviceId] = { totalCost: 0, currency: s.currency, projectId: s.projectId };
      }
      serviceAgg[s.serviceId].totalCost += s.totalCost;
    });

    const topProjects = Object.keys(projectAgg)
      .map((projectId) => {
        const proj = projectsById[projectId] || null;
        const data = projectAgg[projectId];
        return {
          projectId,
          projectName: proj ? proj.name : null,
          totalCost: data.totalCost,
          currency: data.currency
        };
      })
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);

    const topServices = Object.keys(serviceAgg)
      .map((serviceId) => {
        const svc = servicesById[serviceId] || null;
        const data = serviceAgg[serviceId];
        const proj = projectsById[data.projectId] || null;
        return {
          serviceId,
          serviceName: svc ? svc.name : null,
          projectName: proj ? proj.name : null,
          totalCost: data.totalCost,
          currency: data.currency
        };
      })
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);

    return { topProjects, topServices };
  }

  // ------------------------
  // VIRTUAL MACHINES / COMPUTE
  // ------------------------

  getVirtualMachineList(filters, page, pageSize) {
    const vms = this._getFromStorage('virtual_machine_instances', []);
    const regions = this._getFromStorage('regions', []);
    const sizes = this._getFromStorage('vm_sizes', []);
    const vpcs = this._getFromStorage('vpc_networks', []);
    const subnets = this._getFromStorage('subnets', []);
    const projects = this._getFromStorage('projects', []);
    const requests = this._getFromStorage('vm_provisioning_requests', []);

    const regionsById = this._buildMapById(regions);
    const sizesById = this._buildMapById(sizes);
    const vpcsById = this._buildMapById(vpcs);
    const subnetsById = this._buildMapById(subnets);
    const projectsById = this._buildMapById(projects);
    const requestsById = this._buildMapById(requests);

    let items = vms.slice();
    const f = filters || {};

    if (f.regionId) {
      items = items.filter((vm) => vm.regionId === f.regionId);
    }
    if (f.projectId) {
      items = items.filter((vm) => vm.projectId === f.projectId);
    }
    if (f.status) {
      items = items.filter((vm) => vm.state === f.status);
    }
    if (f.environment) {
      items = items.filter((vm) => vm.environment === f.environment);
    }
    if (f.tagKey) {
      items = items.filter((vm) => {
        const tags = vm.tags || [];
        return tags.some((t) => t.key === f.tagKey && (!f.tagValue || t.value === f.tagValue));
      });
    }
    if (f.searchQuery) {
      items = this._filterBySearchQuery(items, ['name', 'id'], f.searchQuery);
    }

    const totalCount = items.length;
    const paged = this._paginate(items, page, pageSize);

    const resolvedItems = paged.map((vm) => {
      const region = regionsById[vm.regionId] || null;
      const size = sizesById[vm.sizeId] || null;
      const vpc = vpcsById[vm.vpcNetworkId] || null;
      const subnet = subnetsById[vm.subnetId] || null;
      const project = projectsById[vm.projectId] || null;
      const provisioningRequest = vm.provisioningRequestId ? requestsById[vm.provisioningRequestId] || null : null;
      return Object.assign({}, vm, {
        region,
        size,
        vpcNetwork: vpc,
        subnet,
        project,
        provisioningRequest
      });
    });

    return { items: resolvedItems, totalCount };
  }

  getVMFilterOptions() {
    const regions = this._getFromStorage('regions', []);
    const projectsRaw = this._getFromStorage('projects', []);
    const vms = this._getFromStorage('virtual_machine_instances', []);
    const regionsById = this._buildMapById(regions);

    const projects = projectsRaw.map((p) => {
      const defaultRegion = p.defaultRegionId ? regionsById[p.defaultRegionId] || null : null;
      return Object.assign({}, p, { defaultRegion });
    });

    const statusesSet = new Set(['provisioning', 'running', 'stopped', 'terminated', 'error']);
    vms.forEach((vm) => {
      if (vm.state) statusesSet.add(vm.state);
    });

    const envSet = new Set();
    const tagKeySet = new Set();
    vms.forEach((vm) => {
      if (vm.environment) envSet.add(vm.environment);
      (vm.tags || []).forEach((t) => {
        if (t.key) tagKeySet.add(t.key);
      });
    });

    return {
      regions,
      projects,
      statuses: Array.from(statusesSet),
      environments: Array.from(envSet),
      tagKeys: Array.from(tagKeySet)
    };
  }

  getVMProvisioningFormData() {
    const regions = this._getFromStorage('regions', []);
    const vmSizes = this._getFromStorage('vm_sizes', []);
    const vpcs = this._getFromStorage('vpc_networks', []);
    const subnets = this._getFromStorage('subnets', []);
    const projects = this._getFromStorage('projects', []);

    const regionsById = this._buildMapById(regions);
    const projectsById = this._buildMapById(projects);

    const vpcNetworks = vpcs.map((vpc) => {
      const region = regionsById[vpc.regionId] || null;
      const project = projectsById[vpc.projectId] || null;
      const vpcSubnets = subnets.filter((s) => s.vpcNetworkId === vpc.id);
      const vpcInfo = {
        id: vpc.id,
        name: vpc.name,
        projectName: project ? project.name : null,
        regionName: region ? region.name : null
      };
      return {
        vpc: vpcInfo,
        subnets: vpcSubnets
      };
    });

    const defaultTags = [];

    return { regions, vmSizes, vpcNetworks, defaultTags };
  }

  getRegionPricingForCompute(onlyActive) {
    const regions = this._getFromStorage('regions', []);
    const filtered = (onlyActive === false ? regions : regions.filter((r) => r.isActive));
    // Sort by baseHourlyPrice ascending for convenience
    return filtered.slice().sort((a, b) => (a.baseHourlyPrice || 0) - (b.baseHourlyPrice || 0));
  }

  createVMProvisioningRequestAndInstances(
    regionId,
    sizeId,
    vpcNetworkId,
    subnetId,
    projectId,
    environment,
    costCenter,
    tags,
    instanceCount
  ) {
    const vmRequests = this._getFromStorage('vm_provisioning_requests', []);
    const vms = this._getFromStorage('virtual_machine_instances', []);

    const now = new Date().toISOString();
    const requestId = this._generateId('vmpr');

    const provisioningRequest = {
      id: requestId,
      regionId,
      sizeId,
      vpcNetworkId,
      subnetId,
      projectId,
      environment: environment || null,
      costCenter: costCenter || null,
      tags: Array.isArray(tags) ? tags : [],
      instanceCount,
      status: 'submitted',
      createdInstanceIds: [],
      createdAt: now,
      completedAt: null
    };

    const createdInstances = [];
    for (let i = 0; i < instanceCount; i += 1) {
      const vmId = this._generateId('vmi');
      const vm = {
        id: vmId,
        name: null,
        regionId,
        sizeId,
        vpcNetworkId,
        subnetId,
        projectId,
        environment: environment || null,
        costCenter: costCenter || null,
        tags: Array.isArray(tags) ? tags.slice() : [],
        state: 'provisioning',
        provisioningRequestId: requestId,
        createdAt: now,
        updatedAt: null
      };
      vms.push(vm);
      provisioningRequest.createdInstanceIds.push(vmId);
      createdInstances.push(vm);
    }

    provisioningRequest.status = 'completed';
    provisioningRequest.completedAt = new Date().toISOString();

    vmRequests.push(provisioningRequest);

    this._saveToStorage('vm_provisioning_requests', vmRequests);
    this._saveToStorage('virtual_machine_instances', vms);

    return {
      provisioningRequest: { request: provisioningRequest },
      createdInstances,
      message: 'VM provisioning request created and instances are being provisioned.'
    };
  }

  // ------------------------
  // ALERT RULES / MONITORING
  // ------------------------

  getAlertRulesList(filters, page, pageSize) {
    const rules = this._getFromStorage('alert_rules', []);
    const clusters = this._getFromStorage('clusters', []);
    const services = this._getFromStorage('services', []);
    const metrics = this._getFromStorage('metric_definitions', []);
    const channels = this._getFromStorage('notification_channels', []);

    const clustersById = this._buildMapById(clusters);
    const servicesById = this._buildMapById(services);
    const metricsById = this._buildMapById(metrics);
    const channelsById = this._buildMapById(channels);

    let items = rules.slice();
    const f = filters || {};

    if (f.resourceType) {
      items = items.filter((r) => r.resourceType === f.resourceType);
    }
    if (f.clusterId) {
      items = items.filter((r) => r.clusterId === f.clusterId);
    }
    if (f.serviceId) {
      items = items.filter((r) => r.serviceId === f.serviceId);
    }
    if (typeof f.isEnabled === 'boolean') {
      items = items.filter((r) => r.isEnabled === f.isEnabled);
    }
    if (f.severity) {
      items = items.filter((r) => r.severity === f.severity);
    }
    if (f.searchQuery) {
      items = this._filterBySearchQuery(items, ['name'], f.searchQuery);
    }

    const totalCount = items.length;
    const paged = this._paginate(items, page, pageSize);

    const resolvedItems = paged.map((r) => {
      const cluster = r.clusterId ? clustersById[r.clusterId] || null : null;
      const service = r.serviceId ? servicesById[r.serviceId] || null : null;
      const metricDefinition = metricsById[r.metricDefinitionId] || null;
      const notificationChannel = channelsById[r.notificationChannelId] || null;
      return Object.assign({}, r, {
        cluster,
        service,
        metricDefinition,
        notificationChannel
      });
    });

    return { items: resolvedItems, totalCount };
  }

  getAlertRuleFilterOptions() {
    const clustersRaw = this._getFromStorage('clusters', []);
    const servicesRaw = this._getFromStorage('services', []);
    const projects = this._getFromStorage('projects', []);
    const regions = this._getFromStorage('regions', []);

    const projectsById = this._buildMapById(projects);
    const regionsById = this._buildMapById(regions);

    const clusters = clustersRaw.map((c) => {
      const project = projectsById[c.projectId] || null;
      const region = regionsById[c.regionId] || null;
      return Object.assign({}, c, { project, region });
    });

    const services = servicesRaw.map((s) => {
      const project = projectsById[s.projectId] || null;
      const defaultCluster = s.defaultClusterId ? clustersRaw.find((c) => c.id === s.defaultClusterId) || null : null;
      return Object.assign({}, s, { project, defaultCluster });
    });

    const resourceTypes = ['cluster', 'service', 'virtual_machine', 'database_cluster', 'bucket', 'workload'];
    const severities = ['info', 'low', 'medium', 'high', 'critical'];

    return { resourceTypes, severities, clusters, services };
  }

  getAlertRuleFormData(resourceType) {
    const allMetrics = this._getFromStorage('metric_definitions', []);
    const clustersRaw = this._getFromStorage('clusters', []);
    const servicesRaw = this._getFromStorage('services', []);
    const channels = this._getFromStorage('notification_channels', []);
    const projects = this._getFromStorage('projects', []);
    const regions = this._getFromStorage('regions', []);

    const projectsById = this._buildMapById(projects);
    const regionsById = this._buildMapById(regions);

    let metrics = allMetrics;
    if (resourceType) {
      metrics = metrics.filter((m) => m.resourceType === resourceType);
    }

    const clusters = clustersRaw.map((c) => {
      const project = projectsById[c.projectId] || null;
      const region = regionsById[c.regionId] || null;
      return Object.assign({}, c, { project, region });
    });

    const services = servicesRaw.map((s) => {
      const project = projectsById[s.projectId] || null;
      const defaultCluster = s.defaultClusterId ? clustersRaw.find((c) => c.id === s.defaultClusterId) || null : null;
      return Object.assign({}, s, { project, defaultCluster });
    });

    const severityOptions = ['info', 'low', 'medium', 'high', 'critical'];
    const evaluationWindowOptionsMinutes = [1, 5, 10, 15, 30, 60];

    return { metrics, clusters, services, notificationChannels: channels, severityOptions, evaluationWindowOptionsMinutes };
  }

  createAlertRule(
    name,
    resourceType,
    clusterId,
    serviceId,
    metricDefinitionId,
    conditionOperator,
    thresholdValue,
    evaluationWindowMinutes,
    severity,
    notificationChannelId,
    isEnabled
  ) {
    const rules = this._getFromStorage('alert_rules', []);
    const now = new Date().toISOString();

    const rule = {
      id: this._generateId('ar'),
      name,
      resourceType,
      clusterId: resourceType === 'cluster' ? clusterId || null : null,
      serviceId: resourceType === 'service' ? serviceId || null : null,
      metricDefinitionId,
      conditionOperator,
      thresholdValue,
      evaluationWindowMinutes,
      severity,
      notificationChannelId,
      isEnabled: typeof isEnabled === 'boolean' ? isEnabled : true,
      createdAt: now,
      updatedAt: now
    };

    rules.push(rule);
    this._saveToStorage('alert_rules', rules);

    return { alertRule: rule, message: 'Alert rule created.' };
  }

  // ------------------------
  // DEPLOYMENT PIPELINES
  // ------------------------

  getDeploymentPipelinesList(filters, page, pageSize) {
    const pipelines = this._getFromStorage('deployment_pipelines', []);
    const services = this._getFromStorage('services', []);
    const projects = this._getFromStorage('projects', []);

    const servicesById = this._buildMapById(services);
    const projectsById = this._buildMapById(projects);

    let items = pipelines.slice();
    const f = filters || {};

    if (f.serviceId) {
      items = items.filter((p) => p.serviceId === f.serviceId);
    }
    if (f.environment) {
      items = items.filter((p) => p.environment === f.environment);
    }
    if (f.strategy) {
      items = items.filter((p) => p.strategy === f.strategy);
    }
    if (typeof f.isActive === 'boolean') {
      items = items.filter((p) => p.isActive === f.isActive);
    }
    if (f.searchQuery) {
      items = this._filterBySearchQuery(items, ['name', 'version'], f.searchQuery);
    }

    const totalCount = items.length;
    const paged = this._paginate(items, page, pageSize);

    const resolvedItems = paged.map((p) => {
      const service = servicesById[p.serviceId] || null;
      const project = service ? projectsById[service.projectId] || null : null;
      return Object.assign({}, p, { service, project });
    });

    return { items: resolvedItems, totalCount };
  }

  getDeploymentPipelineFormData() {
    const servicesRaw = this._getFromStorage('services', []);
    const clusters = this._getFromStorage('clusters', []);
    const projects = this._getFromStorage('projects', []);

    const clustersById = this._buildMapById(clusters);
    const projectsById = this._buildMapById(projects);

    const services = servicesRaw.map((s) => {
      const project = projectsById[s.projectId] || null;
      const defaultCluster = s.defaultClusterId ? clustersById[s.defaultClusterId] || null : null;
      return Object.assign({}, s, { project, defaultCluster });
    });

    const envSet = new Set();
    servicesRaw.forEach((s) => {
      if (s.environment) envSet.add(s.environment);
    });

    const strategies = ['canary', 'rolling', 'blue_green', 'recreate'];

    return {
      services,
      environments: Array.from(envSet),
      strategies,
      defaultInitialTrafficPercent: 10,
      defaultWaitDurationMinutes: 30
    };
  }

  createDeploymentPipelineWithTrafficSteps(
    name,
    serviceId,
    environment,
    strategy,
    version,
    initialTrafficPercent,
    requiresManualApproval,
    trafficSteps
  ) {
    const pipelines = this._getFromStorage('deployment_pipelines', []);
    const stepsStorage = this._getFromStorage('deployment_traffic_steps', []);
    const now = new Date().toISOString();

    const pipeline = {
      id: this._generateId('dp'),
      name,
      serviceId,
      environment,
      strategy,
      version,
      initialTrafficPercent,
      requiresManualApproval: !!requiresManualApproval,
      isActive: true,
      notes: null,
      createdAt: now,
      updatedAt: now
    };

    pipelines.push(pipeline);

    const createdSteps = [];
    (trafficSteps || []).forEach((step, index) => {
      const s = {
        id: this._generateId('dts'),
        pipelineId: pipeline.id,
        stepOrder: index + 1,
        fromTrafficPercent: step.fromTrafficPercent,
        toTrafficPercent: step.toTrafficPercent,
        waitDurationMinutes: step.waitDurationMinutes,
        requiresApproval: !!step.requiresApproval
      };
      stepsStorage.push(s);
      createdSteps.push(s);
    });

    this._saveToStorage('deployment_pipelines', pipelines);
    this._saveToStorage('deployment_traffic_steps', stepsStorage);

    return { pipeline, trafficSteps: createdSteps, message: 'Deployment pipeline created.' };
  }

  updateDeploymentPipeline(pipelineId, updates) {
    const pipelines = this._getFromStorage('deployment_pipelines', []);
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    if (updates.name !== undefined) pipeline.name = updates.name;
    if (updates.version !== undefined) pipeline.version = updates.version;
    if (updates.strategy !== undefined) pipeline.strategy = updates.strategy;
    if (updates.notes !== undefined) pipeline.notes = updates.notes;
    pipeline.updatedAt = new Date().toISOString();

    this._saveToStorage('deployment_pipelines', pipelines);
    return { pipeline };
  }

  setDeploymentPipelineActiveState(pipelineId, isActive) {
    const pipelines = this._getFromStorage('deployment_pipelines', []);
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }
    pipeline.isActive = !!isActive;
    pipeline.updatedAt = new Date().toISOString();
    this._saveToStorage('deployment_pipelines', pipelines);
    return { pipeline };
  }

  // ------------------------
  // KUBERNETES WORKLOADS & AUTOSCALING
  // ------------------------

  getKubernetesWorkloadFilterOptions() {
    const workloads = this._getFromStorage('kubernetes_workloads', []);
    const clustersRaw = this._getFromStorage('clusters', []);
    const projects = this._getFromStorage('projects', []);
    const regions = this._getFromStorage('regions', []);

    const projectsById = this._buildMapById(projects);
    const regionsById = this._buildMapById(regions);

    const namespacesSet = new Set();
    workloads.forEach((w) => {
      if (w.namespace) namespacesSet.add(w.namespace);
    });

    const clusters = clustersRaw.map((c) => {
      const project = projectsById[c.projectId] || null;
      const region = regionsById[c.regionId] || null;
      return Object.assign({}, c, { project, region });
    });

    const workloadTypes = ['deployment', 'statefulset', 'daemonset', 'job', 'cronjob', 'other'];
    const statuses = ['running', 'paused', 'error', 'scaling', 'pending'];

    return {
      namespaces: Array.from(namespacesSet),
      clusters,
      workloadTypes,
      statuses
    };
  }

  getKubernetesWorkloadList(filters, page, pageSize) {
    const workloads = this._getFromStorage('kubernetes_workloads', []);
    const clustersRaw = this._getFromStorage('clusters', []);
    const servicesRaw = this._getFromStorage('services', []);
    const projects = this._getFromStorage('projects', []);
    const regions = this._getFromStorage('regions', []);

    const clustersById = this._buildMapById(clustersRaw);
    const servicesById = this._buildMapById(servicesRaw);
    const projectsById = this._buildMapById(projects);
    const regionsById = this._buildMapById(regions);

    let items = workloads.slice();
    const f = filters || {};

    if (f.namespace) {
      items = items.filter((w) => w.namespace === f.namespace);
    }
    if (f.clusterId) {
      items = items.filter((w) => w.clusterId === f.clusterId);
    }
    if (f.workloadType) {
      items = items.filter((w) => w.workloadType === f.workloadType);
    }
    if (f.status) {
      items = items.filter((w) => w.status === f.status);
    }
    if (f.searchQuery) {
      items = this._filterBySearchQuery(items, ['name', 'namespace'], f.searchQuery);
    }

    const totalCount = items.length;
    const paged = this._paginate(items, page, pageSize);

    const resolvedItems = paged.map((w) => {
      const cluster = clustersById[w.clusterId] || null;
      const service = w.serviceId ? servicesById[w.serviceId] || null : null;
      const clusterProject = cluster ? projectsById[cluster.projectId] || null : null;
      const clusterRegion = cluster ? regionsById[cluster.regionId] || null : null;
      const serviceProject = service ? projectsById[service.projectId] || null : null;
      return Object.assign({}, w, {
        cluster: cluster ? Object.assign({}, cluster, { project: clusterProject, region: clusterRegion }) : null,
        service: service ? Object.assign({}, service, { project: serviceProject }) : null
      });
    });

    return { items: resolvedItems, totalCount };
  }

  getWorkloadDetails(workloadId) {
    const workloads = this._getFromStorage('kubernetes_workloads', []);
    const workload = workloads.find((w) => w.id === workloadId) || null;
    if (!workload) {
      return { workload: null, currentPods: [], performanceSummary: null, autoscalingPolicy: null };
    }

    const clustersRaw = this._getFromStorage('clusters', []);
    const servicesRaw = this._getFromStorage('services', []);
    const projects = this._getFromStorage('projects', []);
    const regions = this._getFromStorage('regions', []);
    const autoscalingPolicies = this._getFromStorage('autoscaling_policies', []);
    const podsAll = this._getFromStorage('workload_pods', []);
    const perfSummaries = this._getFromStorage('workload_performance_summaries', []);

    const clustersById = this._buildMapById(clustersRaw);
    const servicesById = this._buildMapById(servicesRaw);
    const projectsById = this._buildMapById(projects);
    const regionsById = this._buildMapById(regions);

    const cluster = clustersById[workload.clusterId] || null;
    const service = workload.serviceId ? servicesById[workload.serviceId] || null : null;
    const clusterProject = cluster ? projectsById[cluster.projectId] || null : null;
    const clusterRegion = cluster ? regionsById[cluster.regionId] || null : null;
    const serviceProject = service ? projectsById[service.projectId] || null : null;

    const resolvedWorkload = Object.assign({}, workload, {
      cluster: cluster ? Object.assign({}, cluster, { project: clusterProject, region: clusterRegion }) : null,
      service: service ? Object.assign({}, service, { project: serviceProject }) : null
    });

    const currentPods = podsAll
      .filter((p) => p.workloadId === workloadId)
      .map((p) => Object.assign({}, p));

    const perf = perfSummaries.find((p) => p.workloadId === workloadId) || null;
    const performanceSummary = perf
      ? { cpuUtilizationPercent: perf.cpuUtilizationPercent, memoryUtilizationPercent: perf.memoryUtilizationPercent }
      : { cpuUtilizationPercent: null, memoryUtilizationPercent: null };

    const policyRaw = autoscalingPolicies.find((p) => p.workloadId === workloadId) || null;
    const metrics = this._getFromStorage('metric_definitions', []);
    const metricsById = this._buildMapById(metrics);

    const autoscalingPolicy = policyRaw
      ? Object.assign({}, policyRaw, {
          metricDefinition: policyRaw.metricDefinitionId ? metricsById[policyRaw.metricDefinitionId] || null : null
        })
      : null;

    return { workload: resolvedWorkload, currentPods, performanceSummary, autoscalingPolicy };
  }

  getAutoscalingFormOptions() {
    const metrics = this._getFromStorage('metric_definitions', []);
    let cpuMetricDefinition = null;
    let memoryMetricDefinition = null;

    metrics.forEach((m) => {
      if (!cpuMetricDefinition && m.category === 'cpu') cpuMetricDefinition = m;
      if (!memoryMetricDefinition && m.category === 'memory') memoryMetricDefinition = m;
    });

    const stabilizationWindowOptionsMinutes = [1, 5, 10, 15, 30, 60];
    return { cpuMetricDefinition, memoryMetricDefinition, stabilizationWindowOptionsMinutes };
  }

  updateAutoscalingPolicyForWorkload(
    workloadId,
    isEnabled,
    minPods,
    maxPods,
    metricType,
    targetValue,
    stabilizationWindowMinutes
  ) {
    const policies = this._getFromStorage('autoscaling_policies', []);
    const metrics = this._getFromStorage('metric_definitions', []);

    let policy = policies.find((p) => p.workloadId === workloadId) || null;
    const now = new Date().toISOString();

    let metricDefinitionId = null;
    if (metricType === 'cpu_utilization') {
      const m = metrics.find((md) => md.category === 'cpu');
      metricDefinitionId = m ? m.id : null;
    } else if (metricType === 'memory_utilization') {
      const m = metrics.find((md) => md.category === 'memory');
      metricDefinitionId = m ? m.id : null;
    }

    if (!policy) {
      policy = {
        id: this._generateId('hpa'),
        workloadId,
        isEnabled: !!isEnabled,
        minPods,
        maxPods,
        metricType,
        metricDefinitionId,
        targetValue,
        stabilizationWindowMinutes,
        lastScaledAt: null,
        createdAt: now,
        updatedAt: now
      };
      policies.push(policy);
    } else {
      policy.isEnabled = !!isEnabled;
      policy.minPods = minPods;
      policy.maxPods = maxPods;
      policy.metricType = metricType;
      policy.targetValue = targetValue;
      policy.stabilizationWindowMinutes = stabilizationWindowMinutes;
      policy.metricDefinitionId = metricDefinitionId;
      policy.updatedAt = now;
    }

    this._saveToStorage('autoscaling_policies', policies);

    const metricsById = this._buildMapById(metrics);
    const resolvedPolicy = Object.assign({}, policy, {
      metricDefinition: policy.metricDefinitionId ? metricsById[policy.metricDefinitionId] || null : null
    });

    return { autoscalingPolicy: resolvedPolicy, message: 'Autoscaling policy updated.' };
  }

  getWorkloadScalingEvents(workloadId, limit) {
    const eventsAll = this._getFromStorage('workload_scaling_events', []);
    const workloads = this._getFromStorage('kubernetes_workloads', []);
    const workload = workloads.find((w) => w.id === workloadId) || null;
    const events = eventsAll
      .filter((e) => e.workloadId === workloadId)
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    const sliced = events.slice(0, limit || 20);

    return sliced.map((e) => {
      return Object.assign({}, e, { workload });
    });
  }

  // ------------------------
  // ROLES & ACCESS CONTROL
  // ------------------------

  getRolesList(filters) {
    const roles = this._getFromStorage('roles', []);
    const projects = this._getFromStorage('projects', []);
    const projectsById = this._buildMapById(projects);

    let items = roles.slice();
    const f = filters || {};

    if (f.scopeType) {
      items = items.filter((r) => r.scopeType === f.scopeType);
    }
    if (f.projectId) {
      items = items.filter((r) => r.projectId === f.projectId);
    }
    if (f.searchQuery) {
      items = this._filterBySearchQuery(items, ['name', 'description'], f.searchQuery);
    }

    return items.map((r) => {
      const project = r.projectId ? projectsById[r.projectId] || null : null;
      return Object.assign({}, r, { project });
    });
  }

  getRoleFormOptions() {
    const projectsRaw = this._getFromStorage('projects', []);
    const permissions = this._getFromStorage('permissions', []);
    const regions = this._getFromStorage('regions', []);

    const regionsById = this._buildMapById(regions);
    const projects = projectsRaw.map((p) => {
      const defaultRegion = p.defaultRegionId ? regionsById[p.defaultRegionId] || null : null;
      return Object.assign({}, p, { defaultRegion });
    });

    const permissionsByResourceMap = {};
    permissions.forEach((perm) => {
      if (!permissionsByResourceMap[perm.resourceType]) {
        permissionsByResourceMap[perm.resourceType] = [];
      }
      permissionsByResourceMap[perm.resourceType].push(perm);
    });

    const permissionsByResource = Object.keys(permissionsByResourceMap).map((resourceType) => ({
      resourceType,
      permissions: permissionsByResourceMap[resourceType]
    }));

    return { projects, permissionsByResource };
  }

  createRole(name, description, scopeType, projectId, isReadOnly, permissionIds) {
    const roles = this._getFromStorage('roles', []);
    const now = new Date().toISOString();

    const role = {
      id: this._generateId('role'),
      name,
      description: description || '',
      scopeType,
      projectId: scopeType === 'project' ? projectId || null : null,
      isReadOnly: !!isReadOnly,
      permissionIds: Array.isArray(permissionIds) ? permissionIds.slice() : [],
      createdAt: now,
      updatedAt: now
    };

    roles.push(role);
    this._saveToStorage('roles', roles);

    return { role, message: 'Role created.' };
  }

  searchUsers(query) {
    const users = this._getFromStorage('users', []);
    if (!query) return users.slice();
    const q = String(query).toLowerCase();
    // If there are no users stored, synthesize a basic user that matches the query
    if (users.length === 0) {
      return [
        {
          username: query,
          displayName: query,
          email: query + '@example.com'
        }
      ];
    }
    return users.filter((u) => {
      return (
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    });
  }

  getUserDetailsWithRoles(username) {
    const users = this._getFromStorage('users', []);
    const roles = this._getFromStorage('roles', []);
    const projects = this._getFromStorage('projects', []);
    const assignments = this._getFromStorage('role_assignments', []);

    const user = users.find((u) => u.username === username) || { username, displayName: null, email: null };
    const rolesById = this._buildMapById(roles);
    const projectsById = this._buildMapById(projects);

    const assignedRoles = assignments
      .filter((ra) => ra.principalType === 'username' && ra.principalName === username)
      .map((ra) => {
        const role = rolesById[ra.roleId] || null;
        const project = ra.projectId ? projectsById[ra.projectId] || null : null;
        return {
          role,
          scopeType: ra.scopeType,
          project
        };
      });

    return {
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      assignedRoles
    };
  }

  assignRoleToUser(roleId, principalType, principalName, scopeType, projectId) {
    const assignments = this._getFromStorage('role_assignments', []);
    const now = new Date().toISOString();

    const ra = {
      id: this._generateId('ra'),
      roleId,
      principalType,
      principalName,
      scopeType,
      projectId: scopeType === 'project' ? projectId || null : null,
      assignedAt: now
    };

    assignments.push(ra);
    this._saveToStorage('role_assignments', assignments);

    return { roleAssignment: ra, message: 'Role assigned.' };
  }

  removeRoleAssignment(roleAssignmentId) {
    const assignments = this._getFromStorage('role_assignments', []);
    const index = assignments.findIndex((a) => a.id === roleAssignmentId);
    if (index === -1) {
      return { success: false };
    }
    assignments.splice(index, 1);
    this._saveToStorage('role_assignments', assignments);
    return { success: true };
  }

  // ------------------------
  // DATABASE CLUSTERS & MAINTENANCE
  // ------------------------

  getDatabaseClusterFilterOptions() {
    const regions = this._getFromStorage('regions', []);
    const clusters = this._getFromStorage('database_clusters', []);

    const enginesSet = new Set();
    const envSet = new Set();
    const statusesSet = new Set(['available', 'provisioning', 'maintenance', 'error', 'deleted']);

    clusters.forEach((c) => {
      if (c.engine) enginesSet.add(c.engine);
      if (c.environment) envSet.add(c.environment);
      if (c.status) statusesSet.add(c.status);
    });

    return {
      regions,
      engines: Array.from(enginesSet),
      environments: Array.from(envSet),
      statuses: Array.from(statusesSet)
    };
  }

  getDatabaseClustersList(filters) {
    const clustersRaw = this._getFromStorage('database_clusters', []);
    const regions = this._getFromStorage('regions', []);
    const projects = this._getFromStorage('projects', []);

    const regionsById = this._buildMapById(regions);
    const projectsById = this._buildMapById(projects);

    let items = clustersRaw.slice();
    const f = filters || {};

    if (f.regionId) items = items.filter((c) => c.regionId === f.regionId);
    if (f.projectId) items = items.filter((c) => c.projectId === f.projectId);
    if (f.engine) items = items.filter((c) => c.engine === f.engine);
    if (f.environment) items = items.filter((c) => c.environment === f.environment);
    if (f.status) items = items.filter((c) => c.status === f.status);
    if (f.searchQuery) items = this._filterBySearchQuery(items, ['name', 'engine'], f.searchQuery);

    const totalCount = items.length;

    const resolvedItems = items.map((c) => {
      const region = regionsById[c.regionId] || null;
      const project = projectsById[c.projectId] || null;
      return Object.assign({}, c, { region, project });
    });

    return { items: resolvedItems, totalCount };
  }

  getDatabaseClusterDetails(clusterId) {
    const clustersRaw = this._getFromStorage('database_clusters', []);
    const regions = this._getFromStorage('regions', []);
    const projects = this._getFromStorage('projects', []);
    const maintenanceWindows = this._getFromStorage('maintenance_windows', []);
    const dbPerf = this._getFromStorage('database_performance_summaries', []);

    const cluster = clustersRaw.find((c) => c.id === clusterId) || null;
    if (!cluster) {
      return {
        cluster: null,
        performanceSummary: null,
        nextMaintenanceWindows: [],
        recentMaintenanceHistory: []
      };
    }

    const regionsById = this._buildMapById(regions);
    const projectsById = this._buildMapById(projects);

    const region = regionsById[cluster.regionId] || null;
    const project = projectsById[cluster.projectId] || null;
    const resolvedCluster = Object.assign({}, cluster, { region, project });

    const perf = dbPerf.find((p) => p.clusterId === clusterId) || null;
    const performanceSummary = perf
      ? {
          cpuUtilizationPercent: perf.cpuUtilizationPercent,
          storageUsageGb: perf.storageUsageGb,
          connections: perf.connections
        }
      : { cpuUtilizationPercent: null, storageUsageGb: null, connections: null };

    const now = new Date();
    const windowsForCluster = maintenanceWindows.filter((mw) => mw.clusterId === clusterId);

    const nextMaintenanceWindows = windowsForCluster
      .filter((mw) => {
        if (mw.status !== 'scheduled') return false;
        const start = new Date(mw.startTime);
        return start.getTime() >= now.getTime();
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .map((mw) => Object.assign({}, mw, { cluster: resolvedCluster }));

    const recentMaintenanceHistory = windowsForCluster
      .filter((mw) => mw.status === 'completed' || mw.status === 'canceled' || mw.status === 'in_progress')
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .map((mw) => Object.assign({}, mw, { cluster: resolvedCluster }));

    return { cluster: resolvedCluster, performanceSummary, nextMaintenanceWindows, recentMaintenanceHistory };
  }

  getMaintenanceWindowFormOptions() {
    const timezones = ['UTC'];
    const maintenanceTypes = ['security_patching', 'bugfix', 'data_migration', 'upgrade', 'other'];
    return { timezones, maintenanceTypes };
  }

  createMaintenanceWindowForCluster(
    clusterId,
    title,
    startTime,
    endTime,
    timezone,
    maintenanceType,
    blockDeployments
  ) {
    const windows = this._getFromStorage('maintenance_windows', []);
    const { start, end } = this._validateTimeRange(startTime, endTime);
    const now = new Date().toISOString();

    const windowObj = {
      id: this._generateId('mw'),
      clusterId,
      title,
      startTime: start,
      endTime: end,
      timezone,
      maintenanceType,
      blockDeployments: !!blockDeployments,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now
    };

    windows.push(windowObj);
    this._saveToStorage('maintenance_windows', windows);

    const clustersRaw = this._getFromStorage('database_clusters', []);
    const regions = this._getFromStorage('regions', []);
    const projects = this._getFromStorage('projects', []);
    const regionsById = this._buildMapById(regions);
    const projectsById = this._buildMapById(projects);
    const cluster = clustersRaw.find((c) => c.id === clusterId) || null;
    let resolvedWindow = windowObj;
    if (cluster) {
      const region = regionsById[cluster.regionId] || null;
      const project = projectsById[cluster.projectId] || null;
      const resolvedCluster = Object.assign({}, cluster, { region, project });
      resolvedWindow = Object.assign({}, windowObj, { cluster: resolvedCluster });
    }

    return { maintenanceWindow: resolvedWindow, message: 'Maintenance window created.' };
  }

  updateMaintenanceWindowForCluster(maintenanceWindowId, updates) {
    const windows = this._getFromStorage('maintenance_windows', []);
    const windowObj = windows.find((mw) => mw.id === maintenanceWindowId);
    if (!windowObj) {
      throw new Error('Maintenance window not found');
    }

    if (updates.title !== undefined) windowObj.title = updates.title;
    if (updates.startTime !== undefined) windowObj.startTime = updates.startTime;
    if (updates.endTime !== undefined) windowObj.endTime = updates.endTime;
    if (updates.timezone !== undefined) windowObj.timezone = updates.timezone;
    if (updates.maintenanceType !== undefined) windowObj.maintenanceType = updates.maintenanceType;
    if (updates.blockDeployments !== undefined) windowObj.blockDeployments = updates.blockDeployments;
    if (updates.status !== undefined) windowObj.status = updates.status;
    windowObj.updatedAt = new Date().toISOString();

    this._saveToStorage('maintenance_windows', windows);

    const clustersRaw = this._getFromStorage('database_clusters', []);
    const regions = this._getFromStorage('regions', []);
    const projects = this._getFromStorage('projects', []);
    const regionsById = this._buildMapById(regions);
    const projectsById = this._buildMapById(projects);
    const cluster = clustersRaw.find((c) => c.id === windowObj.clusterId) || null;

    let resolvedWindow = windowObj;
    if (cluster) {
      const region = regionsById[cluster.regionId] || null;
      const project = projectsById[cluster.projectId] || null;
      const resolvedCluster = Object.assign({}, cluster, { region, project });
      resolvedWindow = Object.assign({}, windowObj, { cluster: resolvedCluster });
    }

    return { maintenanceWindow: resolvedWindow };
  }

  // ------------------------
  // COST ANALYTICS
  // ------------------------

  getCostAnalyticsFilterOptions() {
    const projectsRaw = this._getFromStorage('projects', []);
    const regions = this._getFromStorage('regions', []);
    const regionsById = this._buildMapById(regions);

    const projects = projectsRaw.map((p) => {
      const defaultRegion = p.defaultRegionId ? regionsById[p.defaultRegionId] || null : null;
      return Object.assign({}, p, { defaultRegion });
    });

    const dateRangePresets = ['this_month', 'last_month', 'last_3_months'];
    return { projects, dateRangePresets };
  }

  getServiceCostSummaries(projectId, periodStart, periodEnd, sortBy, sortDirection, minTotalCost) {
    const rawSummaries = this._getFromStorage('service_cost_summaries', []);
    const services = this._getFromStorage('services', []);
    const projects = this._getFromStorage('projects', []);

    const servicesById = this._buildMapById(services);
    const projectsById = this._buildMapById(projects);

    const range = this._validateTimeRange(periodStart, periodEnd);

    let summaries = rawSummaries.filter((s) => {
      if (s.projectId !== projectId) return false;
      const sStart = new Date(s.periodStart).getTime();
      const sEnd = new Date(s.periodEnd).getTime();
      const rStart = new Date(range.start).getTime();
      const rEnd = new Date(range.end).getTime();
      // include if summary period is within requested period
      return sStart >= rStart && sEnd <= rEnd;
    });

    if (typeof minTotalCost === 'number') {
      summaries = summaries.filter((s) => s.totalCost >= minTotalCost);
    }

    const sortField = sortBy || 'totalCost';
    const dir = sortDirection === 'asc' ? 1 : -1;

    summaries.sort((a, b) => {
      if (sortField === 'totalCost') {
        return (a.totalCost - b.totalCost) * dir;
      }
      return 0;
    });

    const results = summaries.map((summary) => {
      const service = servicesById[summary.serviceId] || null;
      const project = projectsById[summary.projectId] || null;
      return {
        summary,
        serviceName: service ? service.name : null,
        projectName: project ? project.name : null,
        service,
        project
      };
    });

    return results;
  }

  getCostAnalyticsChartsData(projectId, periodStart, periodEnd) {
    const rawSummaries = this._getFromStorage('service_cost_summaries', []);
    const range = this._validateTimeRange(periodStart, periodEnd);
    const rStart = new Date(range.start).getTime();
    const rEnd = new Date(range.end).getTime();

    const relevant = rawSummaries.filter((s) => {
      if (s.projectId !== projectId) return false;
      const sStart = new Date(s.periodStart).getTime();
      const sEnd = new Date(s.periodEnd).getTime();
      return sStart >= rStart && sEnd <= rEnd;
    });

    const aggregated = {};
    relevant.forEach((s) => {
      const key = s.periodEnd;
      if (!aggregated[key]) aggregated[key] = 0;
      aggregated[key] += s.totalCost;
    });

    const totalCostTimeseries = Object.keys(aggregated)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map((timestamp) => ({ timestamp, totalCost: aggregated[timestamp] }));

    return { totalCostTimeseries };
  }

  getServiceCostDetails(serviceId, periodStart, periodEnd) {
    const services = this._getFromStorage('services', []);
    const projects = this._getFromStorage('projects', []);
    const summaries = this._getFromStorage('service_cost_summaries', []);

    const firstSummary = summaries.find((s) => s.serviceId === serviceId) || null;
    let service = services.find((s) => s.id === serviceId) || null;

    // Some services (e.g., Marketing services) may only exist in cost summaries; synthesize a minimal record
    if (!service && firstSummary) {
      service = {
        id: serviceId,
        name: serviceId,
        projectId: firstSummary.projectId,
        tags: []
      };
    }

    const project = service ? projects.find((p) => p.id === service.projectId) || null : null;

    const range = this._validateTimeRange(periodStart, periodEnd);
    const rStart = new Date(range.start).getTime();
    const rEnd = new Date(range.end).getTime();

    const relevant = summaries.filter((s) => {
      if (s.serviceId !== serviceId) return false;
      const sStart = new Date(s.periodStart).getTime();
      const sEnd = new Date(s.periodEnd).getTime();
      return sStart >= rStart && sEnd <= rEnd;
    });

    let costSummary = null;
    if (relevant.length === 1) {
      costSummary = relevant[0];
    } else if (relevant.length > 1) {
      // aggregate into a new summary object
      const totalCost = relevant.reduce((sum, s) => sum + s.totalCost, 0);
      const currency = relevant[0].currency;
      costSummary = {
        id: this._generateId('scs'),
        serviceId,
        projectId: service
          ? service.projectId
          : (firstSummary ? firstSummary.projectId : null),
        periodStart: range.start,
        periodEnd: range.end,
        totalCost,
        currency
      };
    }

    const timeseries = relevant.map((s) => ({
      timestamp: s.periodEnd,
      cost: s.totalCost
    }));

    const tags = (service && service.tags) ? service.tags.slice() : [];

    const resolvedService = service ? Object.assign({}, service, { project }) : null;
    const resolvedSummary = costSummary
      ? Object.assign({}, costSummary, {
          service: resolvedService,
          project
        })
      : null;

    return { service: resolvedService, costSummary: resolvedSummary, timeseries, tags };
  }

  updateServiceCostTag(serviceId, key, value) {
    const services = this._getFromStorage('services', []);
    const projects = this._getFromStorage('projects', []);
    let service = services.find((s) => s.id === serviceId);
    if (!service) {
      // Create a placeholder service based on cost summaries if it doesn't exist yet
      const summaries = this._getFromStorage('service_cost_summaries', []);
      const firstSummary = summaries.find((s) => s.serviceId === serviceId) || null;
      const projectId = firstSummary ? firstSummary.projectId : null;
      service = {
        id: serviceId,
        name: serviceId,
        projectId,
        tags: []
      };
      services.push(service);
    }

    const tags = Array.isArray(service.tags) ? service.tags : [];
    const index = tags.findIndex((t) => t.key === key);
    if (index === -1) {
      tags.push({ key, value });
    } else {
      tags[index].value = value;
    }
    service.tags = tags;

    this._saveToStorage('services', services);

    const project = projects.find((p) => p.id === service.projectId) || null;
    const resolvedService = Object.assign({}, service, { project });

    return { service: resolvedService, message: 'Service cost tag updated.' };
  }

  // ------------------------
  // STORAGE & BACKUPS
  // ------------------------

  getStorageBucketFilterOptions() {
    const projectsRaw = this._getFromStorage('projects', []);
    const regions = this._getFromStorage('regions', []);
    const regionsById = this._buildMapById(regions);

    const projects = projectsRaw.map((p) => {
      const defaultRegion = p.defaultRegionId ? regionsById[p.defaultRegionId] || null : null;
      return Object.assign({}, p, { defaultRegion });
    });

    const storageClasses = ['standard', 'infrequent_access', 'archive'];

    return { projects, regions, storageClasses };
  }

  getStorageBucketsList(filters) {
    const buckets = this._getFromStorage('storage_buckets', []);
    const backupPolicies = this._getFromStorage('backup_policies', []);
    const projects = this._getFromStorage('projects', []);
    const regions = this._getFromStorage('regions', []);

    const projectsById = this._buildMapById(projects);
    const regionsById = this._buildMapById(regions);

    const bucketIdToHasPolicy = new Set(backupPolicies.map((bp) => bp.bucketId));

    let items = buckets.slice();
    const f = filters || {};

    if (f.projectId) items = items.filter((b) => b.projectId === f.projectId);
    if (f.regionId) items = items.filter((b) => b.regionId === f.regionId);
    if (f.storageClass) items = items.filter((b) => b.storageClass === f.storageClass);
    if (typeof f.hasBackupPolicy === 'boolean') {
      items = items.filter((b) => (f.hasBackupPolicy ? bucketIdToHasPolicy.has(b.id) : !bucketIdToHasPolicy.has(b.id)));
    }
    if (f.searchQuery) items = this._filterBySearchQuery(items, ['name'], f.searchQuery);

    return items.map((b) => {
      const project = projectsById[b.projectId] || null;
      const region = regionsById[b.regionId] || null;
      const bucket = Object.assign({}, b, { project, region });
      const hasBackupPolicy = bucketIdToHasPolicy.has(b.id);
      return { bucket, hasBackupPolicy };
    });
  }

  getBucketDetails(bucketId) {
    const buckets = this._getFromStorage('storage_buckets', []);
    const backupPoliciesRaw = this._getFromStorage('backup_policies', []);
    const usageMetricsAll = this._getFromStorage('bucket_usage_metrics', []);
    const projects = this._getFromStorage('projects', []);
    const regions = this._getFromStorage('regions', []);

    const bucketRaw = buckets.find((b) => b.id === bucketId) || null;
    if (!bucketRaw) {
      return { bucket: null, usageMetrics: null, backupPolicies: [] };
    }

    const projectsById = this._buildMapById(projects);
    const regionsById = this._buildMapById(regions);

    const project = projectsById[bucketRaw.projectId] || null;
    const region = regionsById[bucketRaw.regionId] || null;
    const bucket = Object.assign({}, bucketRaw, { project, region });

    const usage = usageMetricsAll.find((u) => u.bucketId === bucketId) || null;
    const usageMetrics = usage
      ? { totalSizeGb: usage.totalSizeGb, objectCount: usage.objectCount }
      : { totalSizeGb: null, objectCount: null };

    const policies = backupPoliciesRaw
      .filter((bp) => bp.bucketId === bucketId)
      .map((bp) => Object.assign({}, bp, { bucket }));

    return { bucket, usageMetrics, backupPolicies: policies };
  }

  getBackupPolicyFormOptions() {
    const regions = this._getFromStorage('regions', []);
    const destinationRegions = regions.map((r) => r.name);
    const scheduleFrequencies = ['hourly', 'daily', 'weekly', 'monthly', 'custom'];
    const retentionUnits = ['days', 'weeks', 'months', 'years'];

    return { scheduleFrequencies, retentionUnits, destinationRegions };
  }

  createOrUpdateBackupPolicyForBucket(
    bucketId,
    name,
    scheduleFrequency,
    scheduleTime,
    scheduleTimezone,
    retentionPeriodValue,
    retentionPeriodUnit,
    destinationRegion,
    compressionEnabled,
    isActive
  ) {
    const policies = this._getFromStorage('backup_policies', []);
    const now = new Date().toISOString();

    let policy = policies.find((bp) => bp.bucketId === bucketId && bp.name === name) || null;

    if (!policy) {
      policy = {
        id: this._generateId('bp'),
        bucketId,
        name,
        scheduleFrequency,
        scheduleTime,
        scheduleTimezone,
        retentionPeriodValue,
        retentionPeriodUnit,
        destinationRegion,
        compressionEnabled: !!compressionEnabled,
        isActive: !!isActive,
        createdAt: now,
        updatedAt: now
      };
      policies.push(policy);
    } else {
      policy.scheduleFrequency = scheduleFrequency;
      policy.scheduleTime = scheduleTime;
      policy.scheduleTimezone = scheduleTimezone;
      policy.retentionPeriodValue = retentionPeriodValue;
      policy.retentionPeriodUnit = retentionPeriodUnit;
      policy.destinationRegion = destinationRegion;
      policy.compressionEnabled = !!compressionEnabled;
      policy.isActive = !!isActive;
      policy.updatedAt = now;
    }

    this._saveToStorage('backup_policies', policies);

    return { backupPolicy: policy, message: 'Backup policy saved.' };
  }

  // ------------------------
  // DASHBOARDS & WIDGETS
  // ------------------------

  getDashboardsList(searchQuery) {
    const dashboards = this._getFromStorage('dashboards', []);
    const projects = this._getFromStorage('projects', []);
    const projectsById = this._buildMapById(projects);

    let items = dashboards.slice();
    if (searchQuery) {
      items = this._filterBySearchQuery(items, ['name', 'description'], searchQuery);
    }

    return items.map((d) => {
      const project = d.projectId ? projectsById[d.projectId] || null : null;
      return Object.assign({}, d, { project });
    });
  }

  createDashboard(name, description, projectId) {
    const dashboards = this._getFromStorage('dashboards', []);
    const now = new Date().toISOString();

    const dashboard = {
      id: this._generateId('db'),
      name,
      description: description || '',
      projectId: projectId || null,
      createdAt: now,
      updatedAt: now
    };

    dashboards.push(dashboard);
    this._saveToStorage('dashboards', dashboards);

    return { dashboard, message: 'Dashboard created.' };
  }

  cloneDashboard(dashboardId, newName) {
    const dashboards = this._getFromStorage('dashboards', []);
    const widgets = this._getFromStorage('dashboard_widgets', []);

    const src = dashboards.find((d) => d.id === dashboardId);
    if (!src) {
      throw new Error('Dashboard not found');
    }

    const now = new Date().toISOString();
    const clone = {
      id: this._generateId('db'),
      name: newName,
      description: src.description,
      projectId: src.projectId,
      createdAt: now,
      updatedAt: now
    };

    dashboards.push(clone);

    const srcWidgets = widgets.filter((w) => w.dashboardId === dashboardId);
    srcWidgets.forEach((w) => {
      const clonedWidget = Object.assign({}, w, {
        id: this._generateId('dw'),
        dashboardId: clone.id
      });
      widgets.push(clonedWidget);
    });

    this._saveToStorage('dashboards', dashboards);
    this._saveToStorage('dashboard_widgets', widgets);

    return { dashboard: clone };
  }

  deleteDashboard(dashboardId) {
    const dashboards = this._getFromStorage('dashboards', []);
    const widgets = this._getFromStorage('dashboard_widgets', []);

    const newDashboards = dashboards.filter((d) => d.id !== dashboardId);
    const newWidgets = widgets.filter((w) => w.dashboardId !== dashboardId);

    this._saveToStorage('dashboards', newDashboards);
    this._saveToStorage('dashboard_widgets', newWidgets);

    return { success: true };
  }

  getDashboardDetailsWithWidgets(dashboardId) {
    const dashboards = this._getFromStorage('dashboards', []);
    const widgetsRaw = this._getFromStorage('dashboard_widgets', []);
    const clusters = this._getFromStorage('clusters', []);
    const services = this._getFromStorage('services', []);
    const metrics = this._getFromStorage('metric_definitions', []);
    const projects = this._getFromStorage('projects', []);

    const dashboard = dashboards.find((d) => d.id === dashboardId) || null;
    if (!dashboard) {
      return { dashboard: null, widgets: [] };
    }

    const projectsById = this._buildMapById(projects);
    const clustersById = this._buildMapById(clusters);
    const servicesById = this._buildMapById(services);
    const metricsById = this._buildMapById(metrics);

    const project = dashboard.projectId ? projectsById[dashboard.projectId] || null : null;
    const resolvedDashboard = Object.assign({}, dashboard, { project });

    const widgets = widgetsRaw
      .filter((w) => w.dashboardId === dashboardId)
      .map((w) => {
        const cluster = w.clusterId ? clustersById[w.clusterId] || null : null;
        const service = w.serviceId ? servicesById[w.serviceId] || null : null;
        const metricDefinition = metricsById[w.metricDefinitionId] || null;
        return Object.assign({}, w, { cluster, service, metricDefinition });
      });

    return { dashboard: resolvedDashboard, widgets };
  }

  getDashboardWidgetFormOptions() {
    const metrics = this._getFromStorage('metric_definitions', []);
    const clustersRaw = this._getFromStorage('clusters', []);
    const servicesRaw = this._getFromStorage('services', []);
    const projects = this._getFromStorage('projects', []);
    const regions = this._getFromStorage('regions', []);

    const projectsById = this._buildMapById(projects);
    const regionsById = this._buildMapById(regions);

    const clusters = clustersRaw.map((c) => {
      const project = projectsById[c.projectId] || null;
      const region = regionsById[c.regionId] || null;
      return Object.assign({}, c, { project, region });
    });

    const services = servicesRaw.map((s) => {
      const project = projectsById[s.projectId] || null;
      return Object.assign({}, s, { project });
    });

    const timeRanges = ['last_1_hour', 'last_24_hours', 'last_7_days', 'custom'];
    const widgetTypes = ['time_series_chart', 'line_chart', 'single_metric_with_threshold', 'gauge', 'table'];

    return { metrics, clusters, services, timeRanges, widgetTypes };
  }

  addDashboardWidget(
    dashboardId,
    title,
    widgetType,
    resourceType,
    clusterId,
    serviceId,
    metricDefinitionId,
    timeRange,
    thresholdValue,
    positionX,
    positionY,
    width,
    height
  ) {
    const widgets = this._getFromStorage('dashboard_widgets', []);

    const widget = {
      id: this._generateId('dw'),
      dashboardId,
      title,
      widgetType,
      resourceType,
      clusterId: clusterId || null,
      serviceId: serviceId || null,
      metricDefinitionId,
      timeRange: timeRange || null,
      thresholdValue: typeof thresholdValue === 'number' ? thresholdValue : null,
      positionX,
      positionY,
      width,
      height
    };

    widgets.push(widget);
    this._saveToStorage('dashboard_widgets', widgets);

    return { widget };
  }

  updateDashboardWidgetLayout(dashboardId, widgetsLayout) {
    const widgets = this._getFromStorage('dashboard_widgets', []);

    widgetsLayout.forEach((layout) => {
      const w = widgets.find((widget) => widget.id === layout.widgetId && widget.dashboardId === dashboardId);
      if (w) {
        if (typeof layout.positionX === 'number') w.positionX = layout.positionX;
        if (typeof layout.positionY === 'number') w.positionY = layout.positionY;
        if (typeof layout.width === 'number') w.width = layout.width;
        if (typeof layout.height === 'number') w.height = layout.height;
      }
    });

    this._saveToStorage('dashboard_widgets', widgets);

    // Return updated widgets for the dashboard with FK resolution
    const clusters = this._getFromStorage('clusters', []);
    const services = this._getFromStorage('services', []);
    const metrics = this._getFromStorage('metric_definitions', []);

    const clustersById = this._buildMapById(clusters);
    const servicesById = this._buildMapById(services);
    const metricsById = this._buildMapById(metrics);

    const result = widgets
      .filter((w) => w.dashboardId === dashboardId)
      .map((w) => {
        const cluster = w.clusterId ? clustersById[w.clusterId] || null : null;
        const service = w.serviceId ? servicesById[w.serviceId] || null : null;
        const metricDefinition = metricsById[w.metricDefinitionId] || null;
        return Object.assign({}, w, { cluster, service, metricDefinition });
      });

    return result;
  }

  removeDashboardWidget(widgetId) {
    const widgets = this._getFromStorage('dashboard_widgets', []);
    const index = widgets.findIndex((w) => w.id === widgetId);
    if (index === -1) {
      return { success: false };
    }
    widgets.splice(index, 1);
    this._saveToStorage('dashboard_widgets', widgets);
    return { success: true };
  }

  // ------------------------
  // ABOUT & HELP
  // ------------------------

  getAboutInfo() {
    const about = this._getFromStorage('about_info', {});
    return about;
  }

  getHelpTopicsList(category) {
    const topics = this._getFromStorage('help_topics', []);
    let items = topics.slice();
    if (category) {
      items = items.filter((t) => t.category === category);
    }
    return items.map((t) => ({
      topicId: t.topicId,
      title: t.title,
      category: t.category,
      summary: t.summary
    }));
  }

  searchHelpContent(query) {
    const topics = this._getFromStorage('help_topics', []);
    if (!query) {
      return [];
    }
    const q = String(query).toLowerCase();
    return topics
      .filter((t) => {
        return (
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.summary && t.summary.toLowerCase().includes(q)) ||
          (t.contentHtml && t.contentHtml.toLowerCase().includes(q))
        );
      })
      .map((t) => ({
        topicId: t.topicId,
        title: t.title,
        snippet: t.summary || '',
        category: t.category
      }));
  }

  getHelpTopicDetails(topicId) {
    const topics = this._getFromStorage('help_topics', []);
    const topic = topics.find((t) => t.topicId === topicId) || null;
    if (!topic) {
      return { topicId: null, title: null, category: null, contentHtml: null };
    }
    return {
      topicId: topic.topicId,
      title: topic.title,
      category: topic.category,
      contentHtml: topic.contentHtml
    };
  }

  // ------------------------
  // USER SETTINGS
  // ------------------------

  getUserSettings() {
    const settings = this._getFromStorage('user_settings', {});
    return settings;
  }

  getSettingsOptions() {
    const projectsRaw = this._getFromStorage('projects', []);
    const regions = this._getFromStorage('regions', []);
    const regionsById = this._buildMapById(regions);

    const projects = projectsRaw.map((p) => {
      const defaultRegion = p.defaultRegionId ? regionsById[p.defaultRegionId] || null : null;
      return Object.assign({}, p, { defaultRegion });
    });

    const timezones = ['UTC'];
    const landingPageOptions = [
      'monitoring_dashboards',
      'monitoring_alert_rules',
      'cost_management_analytics'
    ];

    return { timezones, projects, landingPageOptions };
  }

  updateUserSettings(settings) {
    const current = this._getFromStorage('user_settings', {});
    const merged = this._deepMerge(current, settings || {});
    this._persistUserSettings(merged);
    return { settings: merged, message: 'User settings updated.' };
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