class TestRunner {
  constructor(businessLogic) {
    // Polyfill localStorage for Node.js if needed
    if (typeof localStorage === 'undefined') {
      global.localStorage = {
        _data: {},
        setItem(key, value) {
          this._data[String(key)] = String(value);
        },
        getItem(key) {
          return Object.prototype.hasOwnProperty.call(this._data, String(key))
            ? this._data[String(key)]
            : null;
        },
        removeItem(key) {
          delete this._data[String(key)];
        },
        clear() {
          this._data = {};
        }
      };
    }

    this.logic = businessLogic || new BusinessLogic();
    this.results = [];

    // Clear storage and set up test data
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    localStorage.clear();
    if (this.logic && typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Generated Data - used ONLY here to populate initial storage
    const generatedData = {
      blog_tags: [
        {
          id: 'devops',
          name: 'DevOps',
          slug: 'devops',
          description: 'Articles on CI/CD, infrastructure as code, automation, and DevOps culture.'
        },
        {
          id: 'kubernetes',
          name: 'Kubernetes',
          slug: 'kubernetes',
          description: 'Guides and case studies about running workloads on Kubernetes.'
        },
        {
          id: 'monitoring',
          name: 'Monitoring & Observability',
          slug: 'monitoring',
          description: 'Posts on monitoring, logging, tracing, and observability practices.'
        }
      ],
      experience_roles: [
        {
          id: 'role_senior_devops_acme',
          title: 'Senior DevOps Engineer',
          company: 'Acme Cloud Systems',
          location: 'Berlin, Germany',
          role_type: 'devops',
          start_date: '2023-09-01T00:00:00Z',
          end_date: null,
          is_current: true,
          description: 'Leading the DevOps function for a multi-region SaaS platform with a strong focus on Kubernetes, CI/CD, and observability.',
          responsibilities: [
            'Designed and maintained GitOps-based delivery pipelines for over 40 microservices on Kubernetes.',
            'Owned the observability stack, standardizing metrics, logs, and traces across all services.',
            'Led migration of legacy Jenkins pipelines to GitHub Actions, improving deployment frequency and reliability.',
            'Collaborated with security to implement policy-as-code and continuous compliance checks.'
          ],
          technologies: [
            'Kubernetes',
            'Argo CD',
            'GitHub Actions',
            'Helm',
            'Terraform',
            'AWS',
            'Prometheus',
            'Grafana',
            'OpenTelemetry'
          ],
          order_index: 1
        },
        {
          id: 'role_devops_startupx',
          title: 'DevOps Engineer',
          company: 'StartupX Labs',
          location: 'Remote',
          role_type: 'devops',
          start_date: '2020-01-01T00:00:00Z',
          end_date: '2023-08-31T00:00:00Z',
          is_current: false,
          description: 'First DevOps hire, responsible for building CI/CD pipelines and managing the Kubernetes-based platform.',
          responsibilities: [
            'Implemented CI/CD pipelines that reduced average lead time to production from days to under one hour.',
            'Managed multi-tenant Kubernetes clusters used by development, staging, and production environments.',
            'Defined backup, disaster recovery, and incident response procedures.',
            'Automated infrastructure provisioning using Terraform and AWS modules.'
          ],
          technologies: [
            'Kubernetes',
            'AWS',
            'Terraform',
            'Jenkins',
            'GitLab CI',
            'Docker',
            'Elastic Stack',
            'Ansible'
          ],
          order_index: 2
        },
        {
          id: 'role_sre_cloudscale',
          title: 'Site Reliability Engineer',
          company: 'CloudScale Analytics',
          location: 'Munich, Germany',
          role_type: 'sre',
          start_date: '2018-06-01T00:00:00Z',
          end_date: '2019-12-31T00:00:00Z',
          is_current: false,
          description: 'SRE for a real-time analytics platform processing billions of events per day.',
          responsibilities: [
            'Defined SLOs and error budgets in partnership with product teams.',
            'Built alerting and on-call runbooks to reduce mean time to recovery.',
            'Optimized Kubernetes resource usage, cutting infrastructure spend by 20%.',
            'Introduced chaos engineering experiments to validate resilience.'
          ],
          technologies: [
            'Kubernetes',
            'GCP',
            'Prometheus',
            'Grafana',
            'Istio',
            'Python',
            'Go',
            'Terraform'
          ],
          order_index: 3
        }
      ],
      newsletter_topics: [
        {
          id: 'topic_devops',
          key: 'devops',
          label: 'DevOps',
          description: 'CI/CD, automation, infrastructure as code, and deployment strategies.',
          order_index: 1
        },
        {
          id: 'topic_cloud',
          key: 'cloud',
          label: 'Cloud',
          description: 'AWS, GCP, Azure, and cloud architecture best practices.',
          order_index: 2
        },
        {
          id: 'topic_software_engineering',
          key: 'software_engineering',
          label: 'Software Engineering',
          description: 'Design, architecture, and implementation topics for backend and full-stack engineers.',
          order_index: 3
        }
      ],
      pages: [
        {
          id: 'home',
          name: 'Home',
          filename: 'index.html',
          description: 'Homepage introducing the engineer, current role, and highlighted projects.',
          created_at: '2023-01-10T10:00:00Z',
          updated_at: '2026-02-20T09:15:00Z'
        },
        {
          id: 'projects',
          name: 'Projects',
          filename: 'projects.html',
          description: 'Filterable list of portfolio projects including DevOps, SRE, and software engineering work.',
          created_at: '2023-01-15T10:00:00Z',
          updated_at: '2026-02-20T09:20:00Z'
        },
        {
          id: 'skills',
          name: 'Skills',
          filename: 'skills.html',
          description: 'Skills overview with filters by category, provider (including AWS), and proficiency.',
          created_at: '2023-01-20T10:00:00Z',
          updated_at: '2026-02-18T14:30:00Z'
        }
      ],
      profiles: [
        {
          id: 'main_profile',
          full_name: 'Lena Hoffmann',
          headline: 'Senior DevOps & Platform Engineer | Kubernetes, AWS, CI/CD, Observability',
          summary: 'I am a Senior DevOps and Platform Engineer with over 10 years of experience designing, building, and operating cloud-native platforms. My focus is on reliable delivery pipelines, Kubernetes on AWS, and end-to-end observability. I enjoy working closely with product and engineering teams to ship features quickly without compromising on reliability or security.',
          current_role_title: 'Senior DevOps Engineer',
          current_location: 'Berlin, Germany',
          email: 'hello@lenahoffmann.dev',
          phone: '+49 30 12345678',
          website_url: 'https://lenahoffmann.dev',
          github_url: 'https://github.com/lenahoffmann',
          linkedin_url: 'https://www.linkedin.com/in/lenahoffmann',
          primary_specializations: [
            'DevOps',
            'Site Reliability Engineering (SRE)',
            'Kubernetes on AWS',
            'CI/CD & Automation',
            'Observability'
          ],
          avatar_url: 'https://i.ytimg.com/vi/vTNv2RKa5LU/maxresdefault.jpg',
          created_at: '2023-01-10T09:00:00Z',
          updated_at: '2026-02-23T10:30:00Z'
        }
      ],
      project_categories: [
        {
          id: 'devops',
          name: 'DevOps',
          slug: 'devops',
          description: 'Projects focused on CI/CD, infrastructure as code, and automation.',
          order_index: 1
        },
        {
          id: 'software_engineering',
          name: 'Software Engineering',
          slug: 'software-engineering',
          description: 'Backend and full-stack application development projects.',
          order_index: 2
        },
        {
          id: 'sre',
          name: 'Site Reliability Engineering',
          slug: 'sre',
          description: 'Projects focused on reliability, incident response, and SLOs.',
          order_index: 3
        }
      ],
      skill_categories: [
        {
          id: 'devops',
          name: 'DevOps',
          slug: 'devops',
          description: 'CI/CD, automation, and infrastructure as code skills.',
          order_index: 1
        },
        {
          id: 'cloud',
          name: 'Cloud',
          slug: 'cloud',
          description: 'Cloud provider skills including AWS, GCP, and Azure.',
          order_index: 2
        },
        {
          id: 'software_engineering',
          name: 'Software Engineering',
          slug: 'software-engineering',
          description: 'Programming languages, frameworks, and application design.',
          order_index: 3
        }
      ],
      blog_posts: [
        {
          id: 'post_gitops_kubernetes_argo_cd_github_actions',
          title: 'Practical Kubernetes GitOps with Argo CD and GitHub Actions',
          slug: 'practical-kubernetes-gitops-argo-cd-github-actions',
          summary: 'A step-by-step walkthrough of implementing GitOps on Kubernetes using Argo CD and GitHub Actions for reliable continuous delivery.',
          content: 'In this post, we build a complete GitOps workflow for a multi-service application on Kubernetes. We start by defining the desired state in a dedicated Git repository, then wire up GitHub Actions to build images and update Helm charts. Argo CD continuously reconciles the cluster against Git, providing a clear audit trail and easy rollbacks. We\'ll cover directory structure, promotion between environments, handling secrets, and common pitfalls when teams adopt GitOps at scale.',
          tag_slugs: ['devops', 'kubernetes'],
          primary_tag_slug: 'devops',
          published_at: '2025-11-10T09:00:00Z',
          updated_at: '2025-12-01T10:30:00Z',
          reading_time_minutes: 14,
          hero_image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&h=600&fit=crop&auto=format&q=80',
          is_published: true
        },
        {
          id: 'post_cicd_antipatterns_microservices',
          title: 'Seven CI/CD Anti-Patterns in Microservices Teams',
          slug: 'seven-cicd-anti-patterns-in-microservices-teams',
          summary: 'Common CI/CD pitfalls that slow down microservices teams and how to fix them with clearer contracts and better pipelines.',
          content: 'Microservices promise independent deployability, but many teams recreate monolithic deployment bottlenecks in their CI/CD pipelines. In this article, we look at seven recurring anti-patterns: giant shared pipelines, environment-specific scripting, long-lived feature branches, hidden manual approvals, test suites that don\'t map to risk, and more. For each anti-pattern, we propose concrete changes to pipeline design, repository layout, and team responsibilities that help restore confidence and speed.',
          tag_slugs: ['devops', 'microservices'],
          primary_tag_slug: 'devops',
          published_at: '2024-09-15T14:00:00Z',
          updated_at: '2024-09-20T09:45:00Z',
          reading_time_minutes: 10,
          hero_image_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=600&fit=crop&auto=format&q=80',
          is_published: true
        },
        {
          id: 'post_observability_stack_aws',
          title: 'Building a Production-Ready Observability Stack on AWS',
          slug: 'building-observability-stack-aws',
          summary: 'How to design and operate a metrics, logs, and traces stack on AWS that scales with your teams.',
          content: 'A good observability stack balances signal quality, cost, and ease of adoption. In this post we design a reference architecture using managed Prometheus, OpenSearch, and AWS X-Ray/OpenTelemetry collectors. We discuss cardinality budgets, log sampling strategies, and how to standardize telemetry across microservices. We also cover how to integrate dashboards into on-call workflows, and how to define SLOs using the collected data.',
          tag_slugs: ['devops', 'aws', 'monitoring'],
          primary_tag_slug: 'devops',
          published_at: '2024-06-05T10:30:00Z',
          updated_at: '2024-06-10T08:15:00Z',
          reading_time_minutes: 13,
          hero_image_url: 'https://www.solodev.com/_/images/aws-map.jpg',
          is_published: true
        }
      ],
      navigation_links: [
        {
          id: 'nav_header_home',
          text: 'Home',
          url: 'index.html',
          position: 'header',
          order_index: 1,
          description: 'Homepage introducing the engineer and key highlights.',
          page_filename: 'index.html'
        },
        {
          id: 'nav_header_projects',
          text: 'Projects',
          url: 'projects.html',
          position: 'header',
          order_index: 2,
          description: 'Browse and filter portfolio projects.',
          page_filename: 'projects.html'
        },
        {
          id: 'nav_header_skills',
          text: 'Skills',
          url: 'skills.html',
          position: 'header',
          order_index: 3,
          description: 'View and filter skills, including AWS DevOps/Cloud skills.',
          page_filename: 'skills.html'
        }
      ],
      projects: [
        {
          id: 'proj_gitops_k8s_platform',
          title: 'GitOps Kubernetes Platform for Multi-Region SaaS',
          slug: 'gitops-kubernetes-platform-multi-region-saas',
          category_id: 'devops',
          summary: 'Designed and operated a GitOps-driven Kubernetes platform on AWS for a multi-region SaaS product.',
          description: 'Led the design and implementation of a Kubernetes platform running in multiple AWS regions. We adopted GitOps with Argo CD and GitHub Actions, enabling teams to manage application and configuration changes through pull requests. The platform standardized observability, security policies, and deployment workflows across more than 40 microservices.',
          role_title: 'Senior DevOps Engineer',
          organization: 'Acme Cloud Systems',
          project_type: 'Client',
          technologies: [
            'Kubernetes',
            'Argo CD',
            'GitHub Actions',
            'Helm',
            'AWS',
            'Prometheus',
            'Grafana'
          ],
          tags: ['DevOps', 'GitOps', 'CI/CD', 'Kubernetes', 'AWS'],
          primary_backend_language: 'go',
          languages: ['go'],
          cloud_provider: 'aws',
          environment: 'production',
          is_microservices: true,
          has_ci_cd: true,
          uses_kubernetes: true,
          uses_terraform: false,
          uses_aws: true,
          responsibilities: [
            'Architected GitOps workflows using Argo CD and GitHub Actions.',
            'Defined Kubernetes multi-tenant cluster standards and base Helm charts.',
            'Implemented progressive delivery with canary and blue/green releases.',
            'Collaborated with SREs to embed SLOs and alerting in the platform.'
          ],
          outcomes: [
            'Reduced mean time to deploy from 2 hours to under 15 minutes.',
            'Enabled independent deployments for 12 product teams.',
            'Improved change failure rate by 40% through standardized rollout strategies.'
          ],
          start_date: '2024-02-01T00:00:00Z',
          end_date: null,
          last_updated: '2026-02-20T09:00:00Z',
          repo_url: '',
          live_url: 'https://acme-cloud-saas.example.com',
          is_featured: true,
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 'proj_k8s_ci_cd_modernization',
          title: 'Kubernetes CI/CD Modernization for Legacy Services',
          slug: 'kubernetes-ci-cd-modernization-legacy-services',
          category_id: 'devops',
          summary: 'Migrated legacy services from manual deployments to automated Kubernetes CI/CD pipelines.',
          description: 'Worked with a payments team to move legacy Java and Node.js services from manual VM-based deployments to Kubernetes. Introduced a standardized CI/CD pipeline using GitLab CI and Helm, integrating automated tests, security scans, and deployment approvals where required.',
          role_title: 'DevOps Engineer',
          organization: 'StartupX Labs',
          project_type: 'Client',
          technologies: ['Kubernetes', 'GitLab CI', 'Helm', 'Docker', 'AWS', 'SonarQube'],
          tags: ['DevOps', 'CI/CD', 'Kubernetes', 'Modernization'],
          primary_backend_language: 'node_js',
          languages: ['node_js', 'java'],
          cloud_provider: 'aws',
          environment: 'production',
          is_microservices: false,
          has_ci_cd: true,
          uses_kubernetes: true,
          uses_terraform: false,
          uses_aws: true,
          responsibilities: [
            'Designed GitLab CI templates for building, testing, and deploying services to Kubernetes.',
            'Implemented environment-specific Helm values and secrets management.',
            'Coached developers on writing pipeline-friendly tests and checks.'
          ],
          outcomes: [
            'Cut manual deployment work by 90%.',
            'Increased deployment frequency from monthly to multiple times per week.',
            'Improved rollback time from hours to minutes via Helm releases.'
          ],
          start_date: '2023-01-10T00:00:00Z',
          end_date: '2023-12-15T00:00:00Z',
          last_updated: '2025-06-01T10:00:00Z',
          repo_url: '',
          live_url: '',
          is_featured: false,
          created_at: '2023-01-05T09:00:00Z'
        },
        {
          id: 'proj_eks_terraform_argocd',
          title: 'AWS EKS Platform with Terraform and Argo CD',
          slug: 'aws-eks-platform-terraform-argo-cd',
          category_id: 'devops',
          summary: 'Built a production-grade AWS EKS platform using Terraform for infrastructure and Argo CD for GitOps deployments.',
          description: 'Implemented a new EKS-based platform for a greenfield product. Terraform was used to provision VPCs, EKS clusters, node groups, and supporting AWS services. Argo CD handled application deployments from a GitOps repository, enabling self-service onboarding for development teams.',
          role_title: 'Cloud DevOps Engineer',
          organization: 'MegaRetail Group',
          project_type: 'Client',
          technologies: ['AWS', 'EKS', 'Terraform', 'Argo CD', 'GitHub Actions', 'Prometheus', 'Grafana'],
          tags: ['DevOps', 'AWS', 'Terraform', 'Kubernetes', 'GitOps'],
          primary_backend_language: 'other',
          languages: ['other'],
          cloud_provider: 'aws',
          environment: 'production',
          is_microservices: true,
          has_ci_cd: true,
          uses_kubernetes: true,
          uses_terraform: true,
          uses_aws: true,
          responsibilities: [
            'Developed reusable Terraform modules for EKS clusters and networking.',
            'Integrated Argo CD with GitHub Actions for automated image updates.',
            'Implemented cluster-level observability and logging patterns.'
          ],
          outcomes: [
            'Provisioned new compliant EKS environments in under one hour.',
            'Standardized deployment workflows across 6 product teams.',
            'Reduced infrastructure drift incidents to near zero via GitOps.'
          ],
          start_date: '2025-04-01T00:00:00Z',
          end_date: null,
          last_updated: '2025-12-01T12:00:00Z',
          repo_url: '',
          live_url: '',
          is_featured: true,
          created_at: '2025-03-10T08:30:00Z'
        }
      ],
      skills: [
        {
          id: 'skill_aws_eks',
          name: 'AWS Elastic Kubernetes Service (EKS)',
          category_id: 'cloud',
          platform_provider: 'aws',
          proficiency: 5,
          years_experience: 4,
          description: 'Designing and operating production EKS clusters, including networking, IAM integration, and add-on management.',
          tags: ['AWS', 'Kubernetes', 'EKS', 'Production'],
          is_certification: false
        },
        {
          id: 'skill_aws_iam',
          name: 'AWS IAM & Security Best Practices',
          category_id: 'cloud',
          platform_provider: 'aws',
          proficiency: 4,
          years_experience: 6,
          description: 'Designing IAM roles, policies, and permission models for multi-account AWS environments.',
          tags: ['AWS', 'Security', 'IAM'],
          is_certification: false
        },
        {
          id: 'skill_aws_cloudwatch',
          name: 'AWS CloudWatch & CloudWatch Logs',
          category_id: 'devops',
          platform_provider: 'aws',
          proficiency: 4,
          years_experience: 5,
          description: 'Setting up metrics, logs, dashboards, and alarms in CloudWatch for application and infrastructure monitoring.',
          tags: ['AWS', 'Monitoring'],
          is_certification: false
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:15:29.615856'
      }
    };

    // Persist using storage keys from mapping
    localStorage.setItem('blog_tags', JSON.stringify(generatedData.blog_tags));
    localStorage.setItem('experience_roles', JSON.stringify(generatedData.experience_roles));
    localStorage.setItem('newsletter_topics', JSON.stringify(generatedData.newsletter_topics));
    localStorage.setItem('pages', JSON.stringify(generatedData.pages));
    localStorage.setItem('profiles', JSON.stringify(generatedData.profiles));
    localStorage.setItem('project_categories', JSON.stringify(generatedData.project_categories));
    localStorage.setItem('skill_categories', JSON.stringify(generatedData.skill_categories));
    localStorage.setItem('blog_posts', JSON.stringify(generatedData.blog_posts));
    localStorage.setItem('navigation_links', JSON.stringify(generatedData.navigation_links));
    localStorage.setItem('projects', JSON.stringify(generatedData.projects));
    localStorage.setItem('skills', JSON.stringify(generatedData.skills));
    localStorage.setItem('_metadata', JSON.stringify(generatedData._metadata));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_MostRecentK8sCiCdDevOpsProject();
    this.testTask2_ContactMessageMicroservices();
    this.testTask3_AwsSkillsShortlist();
    this.testTask4_ReadingListDevOpsShortAndLong();
    this.testTask5_EarliestDevopsSreYear();
    this.testTask6_CompareTerraformAwsProjects();
    this.testTask7_TailoredResumeSeniorDevopsGermany();
    this.testTask8_NewsletterSubscriptionK8sMonitoring();

    return this.results;
  }

  // Task 1: Identify the most recent Kubernetes CI/CD DevOps project and record its title
  testTask1_MostRecentK8sCiCdDevOpsProject() {
    const testName = 'Task 1: Most recent Kubernetes CI/CD DevOps project to recruiter evaluation';
    console.log('Testing:', testName);

    try {
      // Simulate navigating to home
      const homeOverview = this.logic.getHomeOverview();
      this.assert(homeOverview && homeOverview.profile, 'Home overview should include profile');

      // Simulate navigating to Projects & loading filter options
      const projectFilterOptions = this.logic.getProjectFilterOptions();
      this.assert(projectFilterOptions && Array.isArray(projectFilterOptions.categories), 'Should load project filter options');

      const devopsCategory = projectFilterOptions.categories.find(c => c.name === 'DevOps');
      this.assert(devopsCategory, 'DevOps category should exist');

      // Apply filters: category DevOps, technologies Kubernetes + CI/CD, usesKubernetes + hasCiCd, sort by last_updated_desc
      const searchResult = this.logic.searchProjects(
        null, // query
        [devopsCategory.id], // categoryIds
        ['Kubernetes', 'CI/CD'], // technologies
        null, // tags
        null, // languageKeys
        null, // cloudProviders
        null, // environments
        true, // usesKubernetes
        null, // usesTerraform
        null, // usesAws
        true, // hasCiCd
        null, // isMicroservices
        'last_updated_desc', // sortBy
        1, // page
        20 // pageSize
      );

      this.assert(searchResult && Array.isArray(searchResult.projects), 'Project search should return list');
      this.assert(searchResult.projects.length > 0, 'At least one matching DevOps Kubernetes CI/CD project expected');

      const firstEntry = searchResult.projects[0];
      const selectedProject = firstEntry.project;
      this.assert(selectedProject && selectedProject.id, 'Selected project should have ID');
      const selectedProjectId = selectedProject.id;
      const selectedTitle = selectedProject.title;

      // Simulate clicking into project detail
      const projectDetails = this.logic.getProjectDetails(selectedProjectId);
      this.assert(projectDetails && projectDetails.project, 'Project details should load');
      this.assert(projectDetails.project.title === selectedTitle, 'Detail title should match listing title');

      // Simulate opening recruiter evaluation and saving title
      const evaluationBefore = this.logic.getRecruiterEvaluation();
      this.assert(evaluationBefore && evaluationBefore.evaluation, 'Should get recruiter evaluation object');

      const updateResult = this.logic.updateRecruiterEvaluation(
        selectedTitle, // mostRelevantProject
        selectedProjectId, // mostRelevantProjectId
        undefined, // earliestDevopsSreYear
        evaluationBefore.evaluation.notes || '' // notes preserved or empty
      );

      this.assert(updateResult && updateResult.success === true, 'Recruiter evaluation update should succeed');

      const evaluationAfter = this.logic.getRecruiterEvaluation();
      const evalObj = evaluationAfter.evaluation;
      this.assert(evalObj.most_relevant_project === selectedTitle, 'Most relevant project title should match selected title');
      this.assert(evalObj.most_relevant_project_id === selectedProjectId, 'Most relevant project ID should match selected project ID');

      // Verify relationship: project referenced by most_relevant_project_id exists in projects storage
      const storedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
      const referencedProject = storedProjects.find(p => p.id === evalObj.most_relevant_project_id);
      this.assert(!!referencedProject, 'Referenced most_relevant_project_id should exist in projects storage');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 2: Prepare a contact message referencing two microservices projects
  testTask2_ContactMessageMicroservices() {
    const testName = 'Task 2: Contact message referencing two microservices projects and interview date';
    console.log('Testing:', testName);

    try {
      // Simulate navigating to Projects via searchProjects
      // First, search for microservices projects with Go or Node.js as primary backend
      const microservicesWithPreferredLang = this.logic.searchProjects(
        'microservices', // query
        null, // categoryIds
        null, // technologies
        null, // tags
        ['go', 'node_js'], // languageKeys
        null, // cloudProviders
        null, // environments
        null, // usesKubernetes
        null, // usesTerraform
        null, // usesAws
        null, // hasCiCd
        true, // isMicroservices
        'last_updated_desc', // sortBy
        1, // page
        20 // pageSize
      );

      const preferredProjects = (microservicesWithPreferredLang && microservicesWithPreferredLang.projects) || [];

      let firstProjectEntry = null;
      let secondProjectEntry = null;

      if (preferredProjects.length > 0) {
        firstProjectEntry = preferredProjects[0];
      }

      // If we did not get two projects with preferred language, fall back to any microservices projects for the second
      if (preferredProjects.length > 1) {
        secondProjectEntry = preferredProjects[1];
      } else {
        const allMicroservices = this.logic.searchProjects(
          'microservices',
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          true, // isMicroservices
          'last_updated_desc',
          1,
          20
        );
        this.assert(allMicroservices && Array.isArray(allMicroservices.projects), 'Should be able to search all microservices projects');
        this.assert(allMicroservices.projects.length >= 2, 'Need at least two microservices-related projects in data');

        if (!firstProjectEntry) {
          firstProjectEntry = allMicroservices.projects[0];
        }

        // Pick the next project with a different ID
        secondProjectEntry = allMicroservices.projects.find(entry => entry.project.id !== firstProjectEntry.project.id);
      }

      this.assert(firstProjectEntry && secondProjectEntry, 'Should have two distinct projects for contact message');

      const firstProject = firstProjectEntry.project;
      const secondProject = secondProjectEntry.project;

      const firstTitle = firstProject.title;
      const secondTitle = secondProject.title;

      // Simulate navigating to Contact page and submitting the form
      const email = 'recruiter@example-company.com';
      const subject = 'Microservices candidate inquiry';
      const interviewDateText = '15 August 2024';
      const messageBody =
        'I am interested in your microservices experience, especially the projects "' +
        firstTitle +
        '" and "' +
        secondTitle +
        '". I would like to schedule a 30-minute interview on ' +
        interviewDateText +
        '.';

      const submitResult = this.logic.submitContactMessage(email, subject, messageBody);

      this.assert(submitResult && submitResult.success === true, 'Contact message submission should succeed');
      this.assert(submitResult.contact_message && submitResult.contact_message.id, 'ContactMessage should have an ID');

      const storedMessage = submitResult.contact_message;
      this.assert(storedMessage.email === email, 'Stored email should match input');
      this.assert(storedMessage.subject === subject, 'Stored subject should match input');
      this.assert(storedMessage.message === messageBody, 'Stored message body should match input');

      // If metadata extraction is implemented, validate relationships
      if (Array.isArray(storedMessage.related_project_ids) && storedMessage.related_project_ids.length > 0) {
        const storedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
        const relatedProjects = storedMessage.related_project_ids.map(id => storedProjects.find(p => p.id === id)).filter(Boolean);
        this.assert(relatedProjects.length === storedMessage.related_project_ids.length, 'All related_project_ids should map to existing projects');
        // Check that at least one related project title is mentioned in message text
        const anyMentioned = relatedProjects.some(p => storedMessage.message.indexOf(p.title) !== -1);
        this.assert(anyMentioned, 'At least one related project title should appear in the message text');
      }

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 3: Shortlist exactly three AWS-related skills with proficiency >= 4 in DevOps/Cloud categories
  testTask3_AwsSkillsShortlist() {
    const testName = 'Task 3: Shortlist exactly three AWS skills with proficiency >= 4 in DevOps/Cloud';
    console.log('Testing:', testName);

    try {
      const skillFilterOptions = this.logic.getSkillFilterOptions();
      this.assert(skillFilterOptions && Array.isArray(skillFilterOptions.categories), 'Should load skill filter options');

      const devopsCategory = skillFilterOptions.categories.find(c => c.name === 'DevOps');
      const cloudCategory = skillFilterOptions.categories.find(c => c.name === 'Cloud');
      this.assert(devopsCategory && cloudCategory, 'DevOps and Cloud skill categories should exist');

      // Filter AWS skills in DevOps/Cloud with min proficiency 4
      const skillsResult = this.logic.searchSkills(
        [devopsCategory.id, cloudCategory.id], // categoryIds
        ['aws'], // platformProviders
        4, // minProficiency
        5, // maxProficiency
        null // query
      );

      this.assert(skillsResult && Array.isArray(skillsResult.skills), 'Skill search should return list');
      this.assert(skillsResult.skills.length >= 3, 'Expected at least three AWS skills with proficiency >= 4');

      // Pick first three matching skills
      const selectedEntries = skillsResult.skills.slice(0, 3);
      const selectedSkillIds = selectedEntries.map(e => e.skill.id);

      // Add each to shortlist
      selectedSkillIds.forEach(skillId => {
        const addResult = this.logic.addSkillToShortlist(skillId);
        this.assert(addResult && addResult.success === true, 'Adding skill ' + skillId + ' to shortlist should succeed');
      });

      const shortlistResult = this.logic.getSkillShortlist();
      this.assert(shortlistResult && shortlistResult.shortlist, 'Should retrieve skill shortlist');

      const shortlistSkills = (shortlistResult.skills || []).map(e => e.skill);
      this.assert(shortlistSkills.length === 3, 'Shortlist should contain exactly 3 skills, actual: ' + shortlistSkills.length);

      // Verify that all shortlisted skills are AWS platform and proficiency >= 4 and in DevOps/Cloud categories
      const categoryMap = JSON.parse(localStorage.getItem('skill_categories') || '[]').reduce((acc, cat) => {
        acc[cat.id] = cat;
        return acc;
      }, {});

      shortlistSkills.forEach(skill => {
        this.assert(skill.platform_provider === 'aws', 'Shortlisted skill ' + skill.id + ' should be AWS-related');
        this.assert(skill.proficiency >= 4, 'Shortlisted skill ' + skill.id + ' should have proficiency >= 4');
        const cat = categoryMap[skill.category_id];
        this.assert(!!cat, 'Skill ' + skill.id + ' should have a valid category');
        this.assert(cat.name === 'DevOps' || cat.name === 'Cloud', 'Skill ' + skill.id + ' category should be DevOps or Cloud');
      });

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 4: Create a reading list with one short and one long recent DevOps blog post
  testTask4_ReadingListDevOpsShortAndLong() {
    const testName = 'Task 4: Reading list with one short and one long recent DevOps blog post';
    console.log('Testing:', testName);

    try {
      // Load tag options (simulate opening Blog page and tag filters)
      const tagOptions = this.logic.getBlogTagFilterOptions();
      this.assert(tagOptions && Array.isArray(tagOptions.tags), 'Should load blog tag options');

      const devopsTag = tagOptions.tags.find(t => t.slug === 'devops');
      this.assert(devopsTag, 'DevOps blog tag should exist');

      const startDate = '2023-01-01';

      // Short post: in this dataset, adapt "short" to reading time <= 10 minutes
      const shortResult = this.logic.searchBlogPosts(
        ['devops'], // tagSlugs
        startDate, // startDate
        null, // endDate
        null, // minReadingTimeMinutes
        10, // maxReadingTimeMinutes (adapted short threshold)
        null, // query
        1,
        20
      );

      this.assert(shortResult && Array.isArray(shortResult.posts), 'Short post search should return list');
      this.assert(shortResult.posts.length > 0, 'At least one short DevOps post (<=10 min) expected');

      const shortPost = shortResult.posts[0].post;
      this.assert(shortPost && shortPost.id, 'Short post should have ID');
      this.assert(shortPost.reading_time_minutes <= 10, 'Short post reading time should be <= 10 minutes');

      // Long post: reading time >= 12 minutes
      const longResult = this.logic.searchBlogPosts(
        ['devops'],
        startDate,
        null,
        12, // minReadingTimeMinutes
        null, // maxReadingTimeMinutes
        null,
        1,
        20
      );

      this.assert(longResult && Array.isArray(longResult.posts), 'Long post search should return list');
      this.assert(longResult.posts.length > 0, 'At least one long DevOps post (>=12 min) expected');

      let longPost = longResult.posts[0].post;
      // Ensure long post is different from short post; if same, pick another if available
      if (longPost.id === shortPost.id && longResult.posts.length > 1) {
        longPost = longResult.posts[1].post;
      }
      this.assert(longPost.id !== shortPost.id, 'Short and long posts should be different');
      this.assert(longPost.reading_time_minutes >= 12, 'Long post reading time should be >= 12 minutes');

      // Simulate opening each post and adding to reading list
      const shortDetails = this.logic.getBlogPostDetails(shortPost.id);
      this.assert(shortDetails && shortDetails.post && shortDetails.post.id === shortPost.id, 'Short post details should load correctly');
      const addShortResult = this.logic.addBlogPostToReadingList(shortPost.id);
      this.assert(addShortResult && addShortResult.success === true, 'Adding short post to reading list should succeed');

      const longDetails = this.logic.getBlogPostDetails(longPost.id);
      this.assert(longDetails && longDetails.post && longDetails.post.id === longPost.id, 'Long post details should load correctly');
      const addLongResult = this.logic.addBlogPostToReadingList(longPost.id);
      this.assert(addLongResult && addLongResult.success === true, 'Adding long post to reading list should succeed');

      // Verify reading list contents
      const readingListResult = this.logic.getReadingListPosts();
      this.assert(readingListResult && readingListResult.reading_list, 'Reading list should be retrievable');

      const savedPosts = (readingListResult.posts || []).map(e => e.post);
      this.assert(savedPosts.length === 2, 'Reading list should contain exactly two posts');

      const savedIds = savedPosts.map(p => p.id);
      this.assert(savedIds.includes(shortPost.id), 'Reading list should include the short post');
      this.assert(savedIds.includes(longPost.id), 'Reading list should include the long post');

      // Validate date and tag criteria for both posts
      [shortPost, longPost].forEach(post => {
        const publishedAt = new Date(post.published_at || post.publishedAt);
        const start = new Date(startDate + 'T00:00:00Z');
        this.assert(publishedAt >= start, 'Post ' + post.id + ' should be published on or after ' + startDate);
        this.assert(Array.isArray(post.tag_slugs) && post.tag_slugs.includes('devops'), 'Post ' + post.id + ' should have devops tag');
      });

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 5: Record the earliest start year of any DevOps or SRE role in the experience timeline
  testTask5_EarliestDevopsSreYear() {
    const testName = 'Task 5: Earliest DevOps/SRE start year into recruiter evaluation';
    console.log('Testing:', testName);

    try {
      // Get experience timeline filtered to devops & sre
      const timelineResult = this.logic.getExperienceTimeline(['devops', 'sre']);
      this.assert(timelineResult && Array.isArray(timelineResult.roles), 'Experience timeline should return roles');
      this.assert(timelineResult.roles.length > 0, 'Expected at least one DevOps or SRE role');

      let earliestYear = null;
      timelineResult.roles.forEach(role => {
        const start = new Date(role.start_date || role.startDate);
        const year = start.getUTCFullYear();
        if (earliestYear === null || year < earliestYear) {
          earliestYear = year;
        }
      });

      this.assert(typeof earliestYear === 'number', 'Earliest year should be determined as number');

      // Update recruiter evaluation with earliest DevOps/SRE year
      const evalBefore = this.logic.getRecruiterEvaluation();
      this.assert(evalBefore && evalBefore.evaluation, 'Should get recruiter evaluation before update');

      const updateResult = this.logic.updateRecruiterEvaluation(
        undefined, // mostRelevantProject
        undefined, // mostRelevantProjectId
        earliestYear, // earliestDevopsSreYear
        evalBefore.evaluation.notes || '' // notes preserved or empty
      );

      this.assert(updateResult && updateResult.success === true, 'Updating earliest DevOps/SRE year should succeed');

      const evalAfter = this.logic.getRecruiterEvaluation();
      const evalObj = evalAfter.evaluation;
      this.assert(evalObj.earliest_devops_sre_year === earliestYear, 'Earliest DevOps/SRE year should match computed value');

      // Cross-check against raw experience_roles in storage
      const storedRoles = JSON.parse(localStorage.getItem('experience_roles') || '[]')
        .filter(r => r.role_type === 'devops' || r.role_type === 'sre');
      this.assert(storedRoles.length > 0, 'Stored experience roles should include DevOps/SRE roles');
      const minYearFromStorage = storedRoles
        .map(r => new Date(r.start_date).getUTCFullYear())
        .reduce((min, y) => (min === null || y < min ? y : min), null);
      this.assert(minYearFromStorage === earliestYear, 'Stored roles earliest year should match evaluation year');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 6: Compare two most recent production Terraform-on-AWS projects
  testTask6_CompareTerraformAwsProjects() {
    const testName = 'Task 6: Compare two most recent AWS production projects (including Terraform-on-AWS if available)';
    console.log('Testing:', testName);

    try {
      // First find Terraform-on-AWS production projects sorted by newest start_date
      const terraformAwsResult = this.logic.searchProjects(
        null, // query
        null, // categoryIds
        null, // technologies
        null, // tags
        null, // languageKeys
        ['aws'], // cloudProviders
        ['production'], // environments
        null, // usesKubernetes
        true, // usesTerraform
        true, // usesAws
        null, // hasCiCd
        null, // isMicroservices
        'start_date_desc', // sortBy
        1,
        20
      );

      this.assert(terraformAwsResult && Array.isArray(terraformAwsResult.projects), 'Terraform-on-AWS search should return list');
      this.assert(terraformAwsResult.projects.length >= 1, 'At least one Terraform-on-AWS production project expected');

      const firstTerraformProject = terraformAwsResult.projects[0].project;
      const firstId = firstTerraformProject.id;

      // Now, to get two projects for comparison, include other AWS production projects if needed
      const awsProdResult = this.logic.searchProjects(
        null,
        null,
        null,
        null,
        null,
        ['aws'],
        ['production'],
        null,
        null,
        true, // usesAws
        null,
        null,
        'start_date_desc',
        1,
        20
      );

      this.assert(awsProdResult && Array.isArray(awsProdResult.projects), 'AWS production search should return list');
      this.assert(awsProdResult.projects.length >= 2, 'Need at least two AWS production projects for comparison');

      // Choose second project as next most recent AWS production project with different ID
      const secondEntry = awsProdResult.projects.find(entry => entry.project.id !== firstId);
      this.assert(secondEntry && secondEntry.project, 'Second AWS production project should be found');

      const secondId = secondEntry.project.id;

      // Add both projects to comparison selection
      const addFirstResult = this.logic.addProjectToComparison(firstId);
      this.assert(addFirstResult && addFirstResult.success === true, 'Adding first project to comparison should succeed');

      const addSecondResult = this.logic.addProjectToComparison(secondId);
      this.assert(addSecondResult && addSecondResult.success === true, 'Adding second project to comparison should succeed');

      // Retrieve comparison view to simulate opening comparison page
      const comparisonView = this.logic.getProjectComparisonView();
      this.assert(comparisonView && Array.isArray(comparisonView.projects), 'Comparison view should return projects');
      this.assert(comparisonView.projects.length === 2, 'Comparison view should contain exactly two projects');

      const comparedIds = comparisonView.projects.map(p => p.project.id);
      this.assert(comparedIds.includes(firstId), 'Comparison should include first selected project');
      this.assert(comparedIds.includes(secondId), 'Comparison should include second selected project');

      // Validate that at least one compared project is Terraform-on-AWS in production
      const terraformFlags = comparisonView.projects.map(p => !!p.is_terraform_on_aws_production);
      const anyTerraformAws = terraformFlags.some(flag => flag);
      this.assert(anyTerraformAws, 'At least one compared project should be Terraform-on-AWS in production');

      // Cross-check that projects marked as Terraform-on-AWS in comparison have uses_terraform and uses_aws set in storage
      const storedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
      comparisonView.projects.forEach(p => {
        if (p.is_terraform_on_aws_production) {
          const sp = storedProjects.find(st => st.id === p.project.id);
          this.assert(!!sp, 'Terraform-on-AWS comparison project must exist in storage');
          this.assert(sp.uses_terraform === true, 'Terraform-on-AWS project should have uses_terraform = true');
          this.assert(sp.uses_aws === true, 'Terraform-on-AWS project should have uses_aws = true');
          this.assert(sp.environment === 'production', 'Terraform-on-AWS project should be in production environment');
        }
      });

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 7: Tailored resume for Senior DevOps role focused on CI/CD & Observability in Germany
  testTask7_TailoredResumeSeniorDevopsGermany() {
    const testName = 'Task 7: Tailored resume for Senior DevOps Engineer in Germany (CI/CD & Observability, last 4 years)';
    console.log('Testing:', testName);

    try {
      const options = this.logic.getResumeBuilderOptions();
      this.assert(options, 'Resume builder options should be available');

      // Find appropriate target role
      this.assert(Array.isArray(options.target_roles), 'Resume builder should expose target roles');
      let targetRoleOption = options.target_roles.find(r => r.label === 'Senior DevOps Engineer');
      if (!targetRoleOption) {
        targetRoleOption = options.target_roles.find(r => r.label.indexOf('DevOps') !== -1) || options.target_roles[0];
      }
      const targetRoleLabel = targetRoleOption.label;

      // Find experience timeframe for last 4 years
      this.assert(Array.isArray(options.experience_timeframes), 'Resume builder should expose experience timeframes');
      let timeframeOption = options.experience_timeframes.find(t => t.key === 'last_4_years');
      if (!timeframeOption) {
        timeframeOption = options.experience_timeframes.find(t => t.label.indexOf('4') !== -1) || options.experience_timeframes[0];
      }
      const experienceTimeframeKey = timeframeOption.key;

      // Find remote preference open_to_remote
      this.assert(Array.isArray(options.remote_preferences), 'Resume builder should expose remote preferences');
      let remotePrefOption = options.remote_preferences.find(r => r.key === 'open_to_remote');
      if (!remotePrefOption) {
        remotePrefOption = options.remote_preferences[0];
      }
      const remotePreferenceKey = remotePrefOption.key;

      const focusSkills = ['CI/CD', 'Observability'];

      // Generate tailored resume
      const generateResult = this.logic.generateTailoredResume(
        targetRoleLabel, // targetRole
        'Germany', // location
        experienceTimeframeKey, // experienceTimeframe
        focusSkills, // focusSkills
        remotePreferenceKey, // remotePreference
        true, // includeProjects
        true, // includeSkills
        true, // includeEducation
        true // includeCertifications
      );

      this.assert(generateResult && generateResult.configuration, 'Tailored resume generation should return configuration');
      const config = generateResult.configuration;
      this.assert(config.target_role === targetRoleLabel, 'Configuration target_role should match selected role');
      this.assert(config.location === 'Germany', 'Configuration location should be Germany');
      this.assert(config.experience_timeframe === experienceTimeframeKey, 'Configuration timeframe should match selection');
      this.assert(Array.isArray(config.focus_skills), 'Configuration focus_skills should be an array');
      this.assert(focusSkills.every(fs => config.focus_skills.includes(fs)), 'Configuration focus_skills should include CI/CD and Observability');
      this.assert(config.remote_preference === remotePreferenceKey, 'Configuration remote_preference should match selection');

      const preview = generateResult.resume_preview;
      this.assert(preview && preview.profile, 'Resume preview should include profile');
      this.assert(Array.isArray(preview.experience_roles), 'Resume preview should include experience roles array');

      // Now simulate opening print-friendly view
      const printView = this.logic.getTailoredResumePrintView();
      this.assert(printView && printView.configuration, 'Print view should return configuration');

      const printConfig = printView.configuration;
      this.assert(printConfig.target_role === config.target_role, 'Print view target_role should match generated configuration');
      this.assert(printConfig.location === config.location, 'Print view location should match generated configuration');
      this.assert(printConfig.experience_timeframe === config.experience_timeframe, 'Print view timeframe should match generated configuration');

      // Basic sanity check: experience roles in print view should not be empty
      this.assert(Array.isArray(printView.experience_roles), 'Print view should include experience roles array');
      this.assert(printView.experience_roles.length > 0, 'Print view should include at least one experience role');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Task 8: Subscribe to newsletter with topics based on Kubernetes & Monitoring articles
  testTask8_NewsletterSubscriptionK8sMonitoring() {
    const testName = 'Task 8: Newsletter subscription after verifying Kubernetes and Monitoring posts';
    console.log('Testing:', testName);

    try {
      // Verify at least one Kubernetes-tagged post exists
      const k8sTagOptions = this.logic.getBlogTagFilterOptions();
      this.assert(k8sTagOptions && Array.isArray(k8sTagOptions.tags), 'Should load blog tags for Kubernetes check');

      const k8sTag = k8sTagOptions.tags.find(t => t.slug === 'kubernetes');
      this.assert(k8sTag, 'Kubernetes tag should exist');

      const k8sPostsResult = this.logic.searchBlogPosts(
        ['kubernetes'], // tagSlugs
        null,
        null,
        null,
        null,
        null,
        1,
        20
      );
      this.assert(k8sPostsResult && Array.isArray(k8sPostsResult.posts), 'Kubernetes posts search should return list');
      this.assert(k8sPostsResult.posts.length > 0, 'At least one Kubernetes post expected');

      // Verify at least one Monitoring-tagged post exists
      const monitoringTag = k8sTagOptions.tags.find(t => t.slug === 'monitoring');
      this.assert(monitoringTag, 'Monitoring tag should exist');

      const monitoringPostsResult = this.logic.searchBlogPosts(
        ['monitoring'],
        null,
        null,
        null,
        null,
        null,
        1,
        20
      );
      this.assert(monitoringPostsResult && Array.isArray(monitoringPostsResult.posts), 'Monitoring posts search should return list');
      this.assert(monitoringPostsResult.posts.length > 0, 'At least one Monitoring post expected');

      // Simulate navigating to Newsletter page and subscribing
      const topicOptions = this.logic.getNewsletterTopics();
      this.assert(topicOptions && Array.isArray(topicOptions.topics), 'Newsletter topics should be available');

      const devopsTopic = topicOptions.topics.find(t => t.key === 'devops');
      const cloudTopic = topicOptions.topics.find(t => t.key === 'cloud');
      this.assert(devopsTopic && cloudTopic, 'DevOps and Cloud newsletter topics should exist');

      const email = 'hiring.manager@company.com';
      const frequency = 'weekly';
      const topicKeys = [devopsTopic.key, cloudTopic.key];

      const subscriptionResult = this.logic.subscribeToNewsletter(
        email,
        frequency,
        topicKeys
      );

      this.assert(subscriptionResult && subscriptionResult.success === true, 'Newsletter subscription should succeed');
      const subscription = subscriptionResult.subscription;
      this.assert(subscription && subscription.email === email, 'Subscription email should match input');
      this.assert(subscription.frequency === frequency, 'Subscription frequency should be weekly');
      this.assert(Array.isArray(subscription.topic_keys), 'Subscription topic_keys should be an array');
      this.assert(topicKeys.every(k => subscription.topic_keys.includes(k)), 'Subscription topics should include DevOps and Cloud');

      // Verify relationship: topic_keys map to actual NewsletterTopic entries
      const storedTopics = JSON.parse(localStorage.getItem('newsletter_topics') || '[]');
      const relatedTopics = subscription.topic_keys.map(k => storedTopics.find(t => t.key === k)).filter(Boolean);
      this.assert(relatedTopics.length === subscription.topic_keys.length, 'All subscription topics should map to existing NewsletterTopic records');

      this.recordSuccess(testName);
    } catch (err) {
      this.recordFailure(testName, err);
    }
  }

  // Assertion helper
  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('✓ ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('✗ ' + testName + ': ' + error.message);
  }
}

module.exports = TestRunner;
