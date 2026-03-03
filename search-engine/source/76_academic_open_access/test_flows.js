// Test runner for business logic
// NOTE: Designed for Node.js with a BusinessLogic SDK that uses localStorage.

class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear storage and initialize
    this.clearStorage();
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for a clean test environment
    localStorage.clear();
    // Reinitialize storage structure as production code would
    if (typeof this.logic._initStorage === 'function') {
      this.logic._initStorage();
    }
  }

  setupTestData() {
    // Setup initial test data directly in localStorage
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      submission_guidelines: [
        {
          id: 'sg_jmls',
          journalId: 'journal_jmls',
          journalTitle: 'Journal of Machine Learning Systems',
          contentHtml: '<h1>Submission Guidelines \u2013 Journal of Machine Learning Systems</h1>\n<p>The <strong>Journal of Machine Learning Systems (JMLS)</strong> publishes high-quality research in machine learning, applied AI, and scalable ML systems. All submissions undergo rigorous peer review.</p>\n\n<h2>1. Scope</h2>\n<p>We welcome original work on supervised, unsupervised, and reinforcement learning, scalable and distributed ML systems, MLOps, fairness and interpretability, and real-world deployments in any domain.</p>\n\n<h2>2. Article Types</h2>\n<ul>\n  <li><strong>Research Articles</strong> (6,000\u201310,000 words) reporting original empirical or theoretical work.</li>\n  <li><strong>Review Articles</strong> (up to 12,000 words) offering systematic or critical overviews of the literature.</li>\n  <li><strong>Short Communications</strong> (up to 4,000 words) presenting concise results or negative findings.</li>\n  <li><strong>Methods Articles</strong> describing novel algorithms, libraries, or benchmarks.</li>\n  <li><strong>Perspectives</strong> providing opinionated views on emerging trends.</li>\n</ul>\n\n<h2>3. Manuscript Preparation</h2>\n<ul>\n  <li>Prepare your manuscript in clear English using a standard word processor or LaTeX.</li>\n  <li>Include a structured abstract (max 250 words) and 4\u20138 keywords.</li>\n  <li>Follow the IMRaD structure where appropriate: Introduction, Methods, Results, Discussion.</li>\n  <li>All figures and tables must be cited in the text and provided as separate high-resolution files.</li>\n  <li>Use a recognized reference style (APA, IEEE, or Vancouver). References must be complete and accurate.</li>\n</ul>\n\n<h2>4. Open Science and Data</h2>\n<p>Authors are strongly encouraged to make code, models, and datasets openly available via trusted repositories. Include a <strong>Code and Data Availability</strong> statement explicitly describing how readers can access supporting materials.</p>\n\n<h2>5. Ethical and Reproducibility Requirements</h2>\n<ul>\n  <li>For datasets involving human subjects, confirm that institutional review board (IRB) or ethics approval was obtained.</li>\n  <li>Disclose all sources of funding and any potential conflicts of interest.</li>\n  <li>Provide sufficient methodological detail to allow replication, including hyperparameters and training procedures.</li>\n</ul>\n\n<h2>6. Licensing and Open Access</h2>\n<p>JMLS is a fully open access journal. By default, articles are published under the <strong>Creative Commons Attribution (CC BY)</strong> license. Authors may alternatively select <strong>CC BY-SA</strong> or <strong>CC0</strong> where mandated by funders or institutions.</p>\n\n<h2>7. Article Processing Charges (APCs)</h2>\n<p>An APC is payable upon acceptance. Waivers and discounts are available for authors from low- and middle-income countries. See the APC section on our website and your acceptance letter for details.</p>\n\n<h2>8. Peer Review and Timelines</h2>\n<p>The journal operates a <strong>single-anonymized</strong> peer review process. We aim to provide an initial decision within 6\u20138 weeks of submission. Revised manuscripts are usually assessed within 3\u20134 weeks.</p>\n\n<h2>9. How to Submit</h2>\n<p>All manuscripts must be submitted via our online submission system. Please create an author account, complete all required metadata, and upload your files according to the system prompts.</p>\n\n<h2>10. Contact</h2>\n<p>For questions about suitability or format, contact the editorial office using the support link in the submission system.</p>',
          apcSummary: 'This journal charges an article processing charge of approximately USD 1,800 for standard research articles, with waivers and discounts available for authors from low- and middle-income countries.',
          reviewTimeSummary: 'Initial editorial decisions are typically issued within 6\u20138 weeks of submission, with full peer review normally completed within 45 days.',
          acceptedArticleTypes: [
            'research_article',
            'review_article',
            'short_communication',
            'methods_article',
            'perspective'
          ],
          acceptedLicenses: [
            'cc_by',
            'cc_by_sa',
            'cc0'
          ],
          externalSubmissionUrl: 'https://www.editorialmanager.com/jmls',
          createdAt: '2024-01-15T10:20:00Z',
          updatedAt: '2025-10-01T09:00:00Z'
        },
        {
          id: 'sg_ijcsa',
          journalId: 'journal_ijcsa',
          journalTitle: 'International Journal of Computer Science Advances',
          contentHtml: '<h1>Submission Guidelines \u2013 International Journal of Computer Science Advances</h1>\n<p>The <strong>International Journal of Computer Science Advances (IJCSA)</strong> publishes theoretical and applied research across all areas of computer science, with a focus on algorithms, networks, security, and software engineering.</p>\n\n<h2>1. Scope</h2>\n<p>Topics include, but are not limited to, algorithms and complexity, distributed and cloud computing, networked systems, cybersecurity and cryptography, software engineering methods, and human\u2013computer interaction.</p>\n\n<h2>2. Article Types</h2>\n<ul>\n  <li><strong>Research Articles</strong>: full-length original contributions.</li>\n  <li><strong>Review Articles</strong>: narrative or systematic literature reviews.</li>\n  <li><strong>Short Communications</strong>: brief reports of novel findings.</li>\n  <li><strong>Editorials</strong>: invited pieces only.</li>\n</ul>\n\n<h2>3. Manuscript Structure</h2>\n<p>Manuscripts should be formatted with clearly labeled sections, including Abstract, Introduction, Related Work, Methods, Results, Discussion, and Conclusion where applicable.</p>\n\n<h2>4. Formatting and References</h2>\n<ul>\n  <li>Submissions may be prepared in LaTeX or Word using our downloadable templates.</li>\n  <li>Include line numbers to facilitate peer review.</li>\n  <li>Use a numbered reference style consistent throughout the manuscript.</li>\n</ul>\n\n<h2>5. Open Access and Licensing</h2>\n<p>IJCSA is an open access journal. Authors choose between <strong>CC BY</strong> and <strong>CC BY-NC</strong> licenses at acceptance. Funders that require more permissive terms may be accommodated upon request.</p>\n\n<h2>6. APC Policy</h2>\n<p>An article processing charge is payable for accepted manuscripts. Limited fee waivers are available for corresponding authors who demonstrate financial need.</p>\n\n<h2>7. Peer Review</h2>\n<p>The journal uses <strong>single-anonymized</strong> peer review with at least two independent reviewers. The editorial office strives to provide decisions as quickly as possible while maintaining review quality.</p>\n\n<h2>8. Submission Process</h2>\n<p>Submissions must be made through the online system. Ensure that all required metadata, author affiliations, and ORCID iDs are provided.</p>',
          apcSummary: 'The standard APC for IJCSA is USD 1,400 per article, with partial waivers considered on a case-by-case basis for authors lacking institutional support.',
          reviewTimeSummary: 'Most manuscripts receive an initial decision within approximately 10\u201312 weeks, although complex reviews may require additional time.',
          acceptedArticleTypes: [
            'research_article',
            'review_article',
            'short_communication',
            'editorial'
          ],
          acceptedLicenses: [
            'cc_by',
            'cc_by_nc'
          ],
          externalSubmissionUrl: 'https://submit.ijcsa-journal.org',
          createdAt: '2023-06-10T08:00:00Z',
          updatedAt: '2025-09-20T12:30:00Z'
        },
        {
          id: 'sg_ojci',
          journalId: 'journal_ojci',
          journalTitle: 'Open Journal of Computational Intelligence',
          contentHtml: '<h1>Submission Guidelines \u2013 Open Journal of Computational Intelligence</h1>\n<p>The <strong>Open Journal of Computational Intelligence (OJCI)</strong> is a fully open access journal covering fuzzy systems, evolutionary computing, neural networks, and hybrid intelligent systems.</p>\n\n<h2>1. Aims and Scope</h2>\n<p>We publish original research, comprehensive reviews, and application-focused papers that advance the theory or practice of computational intelligence.</p>\n\n<h2>2. Article Categories</h2>\n<ul>\n  <li><strong>Research Articles</strong> (5,000\u20139,000 words)</li>\n  <li><strong>Review Articles</strong> (up to 11,000 words)</li>\n  <li><strong>Short Communications</strong> (up to 3,500 words)</li>\n  <li><strong>Methods Articles</strong> focusing on algorithms, toolkits, or benchmarks</li>\n</ul>\n\n<h2>3. Manuscript Preparation</h2>\n<p>Authors should prepare manuscripts following our LaTeX or Word templates. Include an abstract, 3\u20136 keywords, and a concise conclusion summarizing key contributions.</p>\n\n<h2>4. Open Access License</h2>\n<p>All content in OJCI is published under the <strong>Creative Commons Attribution (CC BY)</strong> license. This license permits unrestricted reuse, distribution, and reproduction in any medium, provided the original work is properly cited.</p>\n\n<h2>5. APCs and Waivers</h2>\n<p>The journal charges a moderate article processing fee to cover the costs of open access publication. Waivers and discounts are widely available, particularly for early-career researchers and authors from under-resourced institutions.</p>\n\n<h2>6. Peer Review</h2>\n<p>OJCI uses <strong>double-anonymized</strong> peer review. Authors should remove identifying information from the main manuscript and upload a separate title page with author details.</p>\n\n<h2>7. Data and Code Availability</h2>\n<p>We strongly encourage authors to deposit code and datasets in public repositories and to include persistent identifiers (e.g., DOIs) in their manuscripts.</p>\n\n<h2>8. Submission</h2>\n<p>All submissions must be made via the online submission platform. Carefully select the appropriate article type and section to ensure efficient handling.</p>',
          apcSummary: 'OJCI levies an APC of approximately USD 1,200 per accepted article, with generous waivers for authors from low-income regions and for high-quality open datasets or software contributions.',
          reviewTimeSummary: 'The editorial office aims to provide an initial peer review decision within 4\u20136 weeks and final acceptance, where applicable, within 60 days of submission.',
          acceptedArticleTypes: [
            'research_article',
            'review_article',
            'short_communication',
            'methods_article'
          ],
          acceptedLicenses: [
            'cc_by'
          ],
          externalSubmissionUrl: 'https://submit.ojci-open.org',
          createdAt: '2024-03-05T11:10:00Z',
          updatedAt: '2025-11-15T14:45:00Z'
        }
      ],
      dataset_files: [
        {
          id: 'df_tge_2023_sc_main',
          datasetId: 'ds_tge_2023_scRNAseq_heart_failure',
          filename: 'hf_scRNAseq_expression_matrix.csv',
          format: 'csv',
          sizeBytes: 48234496,
          downloadUrl: 'https://arxiv.org/pdf/2404.07972',
          isPrimary: true,
          createdAt: '2023-07-15T10:20:00Z'
        },
        {
          id: 'df_tge_2023_sc_meta',
          datasetId: 'ds_tge_2023_scRNAseq_heart_failure',
          filename: 'hf_scRNAseq_cell_metadata.tsv',
          format: 'tsv',
          sizeBytes: 8935424,
          downloadUrl: 'https://arxiv.org/pdf/2404.07972',
          isPrimary: false,
          createdAt: '2023-07-15T10:21:00Z'
        },
        {
          id: 'df_tge_2023_sc_readme',
          datasetId: 'ds_tge_2023_scRNAseq_heart_failure',
          filename: 'README_scRNAseq_heart_failure.txt',
          format: 'text',
          sizeBytes: 32768,
          downloadUrl: 'https://arxiv.org/pdf/2404.07972',
          isPrimary: false,
          createdAt: '2023-07-15T10:22:00Z'
        }
      ],
      datasets: [
        {
          id: 'ds_tge_2023_scRNAseq_heart_failure',
          articleId: 'art_tge_2023_scHF',
          articleTitle: 'Single-cell transcriptomic profiling of human heart failure ventricles',
          title: 'Single-cell RNA-seq expression matrix and metadata for human heart failure ventricles',
          description: 'Primary count matrix and accompanying cell-level annotations from single-cell RNA sequencing of left ventricular tissue from patients with advanced heart failure and non-failing controls. Includes gene-by-cell expression counts and detailed cell type, sample, and quality control metadata.',
          license: 'cc0',
          primaryFormat: 'csv',
          isOpenData: true,
          createdAt: '2023-07-15T10:15:00Z',
          updatedAt: '2024-02-01T09:30:00Z',
          fileIds: [
            'df_tge_2023_sc_main',
            'df_tge_2023_sc_meta',
            'df_tge_2023_sc_readme'
          ],
          fileCount: 3,
          hasCsvFiles: true
        },
        {
          id: 'ds_tge_2022_bulkRNA_brain_tumor',
          articleId: 'art_tge_2022_gbm',
          articleTitle: 'Bulk RNA sequencing identifies prognostic gene signatures in glioblastoma',
          title: 'Bulk RNA-seq counts and clinical annotations for glioblastoma cohort',
          description: 'Gene-level raw and normalized bulk RNA sequencing counts for glioblastoma tumor samples with matched clinical and survival data. Provided alongside a methods text file detailing processing and quality control steps.',
          license: 'cc_by',
          primaryFormat: 'csv',
          isOpenData: true,
          createdAt: '2022-11-03T09:00:00Z',
          updatedAt: '2023-06-12T11:45:00Z',
          fileIds: [
            'df_tge_2022_bulk_counts',
            'df_tge_2022_bulk_clinical',
            'df_tge_2022_bulk_methods'
          ],
          fileCount: 3,
          hasCsvFiles: true
        },
        {
          id: 'ds_cto_2021_rct_stentx',
          articleId: 'art_cto_2021_stentx',
          articleTitle: 'STENT-X randomized trial: biodegradable versus durable polymer stents in coronary artery disease',
          title: 'Patient-level outcomes dataset for the STENT-X randomized controlled trial',
          description: 'De-identified patient-level dataset for the STENT-X multicenter randomized trial comparing biodegradable and durable polymer coronary stents. Includes baseline characteristics, procedural details, follow-up outcomes, and adjudicated adverse events.',
          license: 'cc_by_nc',
          primaryFormat: 'csv',
          isOpenData: true,
          createdAt: '2021-09-20T14:05:00Z',
          updatedAt: '2022-01-10T10:20:00Z',
          fileIds: [
            'df_cto_2021_rct_patientlevel',
            'df_cto_2021_rct_adverse',
            'df_cto_2021_rct_protocol'
          ],
          fileCount: 3,
          hasCsvFiles: true
        }
      ],
      journals: [
        {
          id: 'journal_jmls',
          title: 'Journal of Machine Learning Systems',
          issnPrint: '2764-1182',
          issnElectronic: '2764-1190',
          aimsScope: 'The Journal of Machine Learning Systems publishes research on algorithms, scalable ML infrastructure, deployment, and real-world machine learning applications across domains.',
          subjectAreas: ['computer_science'],
          impactFactor: 7.3,
          apcAmount: 1800,
          apcCurrency: 'USD',
          medianReviewTimeDays: 45,
          isOpenAccess: true,
          defaultLicense: 'cc_by',
          submissionEmail: 'jmls-editorial@openjournals.org',
          websiteUrl: 'https://journals.open-access-science.org/jmls',
          createdAt: '2021-01-15T10:00:00Z',
          updatedAt: '2025-10-01T09:00:00Z'
        },
        {
          id: 'journal_ijcsa',
          title: 'International Journal of Computer Science Advances',
          issnPrint: '2049-7841',
          issnElectronic: '2049-785X',
          aimsScope: 'International Journal of Computer Science Advances covers theoretical and applied computer science including algorithms, networking, security, and software engineering.',
          subjectAreas: ['computer_science'],
          impactFactor: 3.5,
          apcAmount: 1400,
          apcCurrency: 'USD',
          medianReviewTimeDays: 77,
          isOpenAccess: true,
          defaultLicense: 'cc_by',
          submissionEmail: 'ijcsa-office@openjournals.org',
          websiteUrl: 'https://journals.open-access-science.org/ijcsa',
          createdAt: '2019-06-10T08:00:00Z',
          updatedAt: '2025-09-20T12:30:00Z'
        },
        {
          id: 'journal_ojci',
          title: 'Open Journal of Computational Intelligence',
          issnPrint: '2399-6635',
          issnElectronic: '2399-6643',
          aimsScope: 'Open Journal of Computational Intelligence publishes research on fuzzy systems, evolutionary computation, neural networks, and hybrid intelligent systems.',
          subjectAreas: ['computer_science'],
          impactFactor: 3.2,
          apcAmount: 1200,
          apcCurrency: 'USD',
          medianReviewTimeDays: 42,
          isOpenAccess: true,
          defaultLicense: 'cc_by',
          submissionEmail: 'ojci-editors@openjournals.org',
          websiteUrl: 'https://journals.open-access-science.org/ojci',
          createdAt: '2020-03-05T11:00:00Z',
          updatedAt: '2025-11-15T14:45:00Z'
        }
      ],
      journal_issues: [
        {
          id: 'issue_jes_2023_v12i4',
          journalId: 'journal_jes',
          journalTitle: 'Journal of Environmental Studies',
          year: 2023,
          volume: '12',
          issueNumber: '4',
          label: 'Volume 12, Issue 4',
          publicationDate: '2023-12-01T00:00:00Z',
          description: 'Late-year 2023 issue featuring review and research articles on climate change impacts, environmental policy, and sustainability, including long-form review articles suitable for literature overviews.',
          createdAt: '2023-10-15T09:00:00Z',
          updatedAt: '2024-01-05T11:30:00Z',
          articleIds: [
            'art_jes_2023_climate_water_review',
            'art_jes_2023_climate_policy_urban'
          ]
        },
        {
          id: 'issue_jes_2023_v12i1',
          journalId: 'journal_jes',
          journalTitle: 'Journal of Environmental Studies',
          year: 2023,
          volume: '12',
          issueNumber: '1',
          label: 'Volume 12, Issue 1',
          publicationDate: '2023-03-15T00:00:00Z',
          description: 'Opening 2023 issue focusing on environmental governance, ecosystem services, and early-year climate adaptation studies.',
          createdAt: '2023-01-20T10:00:00Z',
          updatedAt: '2023-06-01T08:20:00Z',
          articleIds: []
        },
        {
          id: 'issue_jes_2022_v11i3',
          journalId: 'journal_jes',
          journalTitle: 'Journal of Environmental Studies',
          year: 2022,
          volume: '11',
          issueNumber: '3',
          label: 'Volume 11, Issue 3',
          publicationDate: '2022-09-10T00:00:00Z',
          description: 'Issue highlighting climate mitigation policies, land-use change, and environmental justice case studies.',
          createdAt: '2022-07-01T09:30:00Z',
          updatedAt: '2023-02-14T12:10:00Z',
          articleIds: ['art_jes_2022_urban_air_policy']
        }
      ],
      articles: [
        {
          id: 'art_tge_2023_scHF',
          title: 'Single-cell transcriptomic profiling of human heart failure ventricles',
          abstract: 'Single-cell RNA sequencing of left ventricular tissue from patients with advanced heart failure and non-failing controls reveals cell-type-specific transcriptional remodeling, immune activation, and fibroblast expansion. We provide an open expression matrix and cell-level annotations to facilitate secondary analyses and method development.',
          authors: ['Lopez M.', 'Khan A.', 'Richards J.', 'Wei L.', 'Patel R.'],
          journalId: 'journal_tge',
          journalTitle: 'Translational Genomics & Expression',
          issueId: 'issue_tge_2023_v4i1',
          publicationDate: '2023-04-01T00:00:00Z',
          publicationYear: 2023,
          volume: '4',
          issueNumber: '1',
          pageStart: 1,
          pageEnd: 18,
          pageCount: 18,
          articleType: 'research_article',
          subjectAreas: ['medicine', 'neuroscience'],
          keywords: [
            'single-cell RNA-seq',
            'heart failure',
            'ventricle',
            'cardiac remodeling',
            'gene expression dataset',
            'open data'
          ],
          accessType: 'open_access',
          license: 'cc_by',
          isOpenAccess: true,
          citationCount: 85,
          sampleSize: 68,
          downloadCount: 1450,
          doi: '10.1234/tge.2023.0001',
          pdfUrl: 'https://arxiv.org/pdf/2404.07972',
          htmlUrl: 'https://journals.open-access-science.org/tge/articles/4/1/tge-2023-0001.html',
          createdAt: '2023-03-10T09:00:00Z',
          updatedAt: '2024-02-01T09:30:00Z',
          datasetIds: ['ds_tge_2023_scRNAseq_heart_failure'],
          hasOpenData: true,
          dataTabAvailable: true,
          openDataBadgeLabel: 'Open Data'
        },
        {
          id: 'art_tge_2022_gbm',
          title: 'Bulk RNA sequencing identifies prognostic gene signatures in glioblastoma',
          abstract: 'We perform bulk RNA sequencing of glioblastoma tumors and integrate gene expression with clinical outcomes to identify robust prognostic signatures. The accompanying open dataset includes gene-level counts and harmonized clinical annotations.',
          authors: ['Singh P.', 'Armitage H.', 'Chen Y.', 'Garcia N.', 'Olsen K.'],
          journalId: 'journal_tge',
          journalTitle: 'Translational Genomics & Expression',
          issueId: 'issue_tge_2022_v3i2',
          publicationDate: '2022-10-10T00:00:00Z',
          publicationYear: 2022,
          volume: '3',
          issueNumber: '2',
          pageStart: 45,
          pageEnd: 62,
          pageCount: 18,
          articleType: 'research_article',
          subjectAreas: ['neuroscience', 'medicine'],
          keywords: [
            'glioblastoma',
            'bulk RNA-seq',
            'prognostic signatures',
            'survival analysis',
            'gene expression dataset',
            'open data'
          ],
          accessType: 'open_access',
          license: 'cc_by',
          isOpenAccess: true,
          citationCount: 140,
          sampleSize: 210,
          downloadCount: 1820,
          doi: '10.1234/tge.2022.0035',
          pdfUrl: 'https://arxiv.org/pdf/2404.07972',
          htmlUrl: 'https://journals.open-access-science.org/tge/articles/3/2/tge-2022-0035.html',
          createdAt: '2022-08-22T11:20:00Z',
          updatedAt: '2023-06-12T11:45:00Z',
          datasetIds: ['ds_tge_2022_bulkRNA_brain_tumor'],
          hasOpenData: true,
          dataTabAvailable: true,
          openDataBadgeLabel: 'Open Data'
        },
        {
          id: 'art_cto_2021_stentx',
          title: 'STENT-X randomized trial: biodegradable versus durable polymer stents in coronary artery disease',
          abstract: 'In this multicenter randomized controlled trial, 8,200 patients with coronary artery disease were assigned to receive either a biodegradable or durable polymer drug-eluting stent. The primary endpoint was target-lesion failure at 2 years. We report comparable safety with reduced late adverse events in the biodegradable stent arm. De-identified patient-level data are shared under controlled open-access terms.',
          authors: ['Miller D.', 'Rossi F.', 'Kobayashi T.', 'Nguyen P.', 'Hernandez L.'],
          journalId: 'journal_cto',
          journalTitle: 'Cardiology Trials & Outcomes',
          issueId: 'issue_cto_2021_v9i2',
          publicationDate: '2021-09-15T00:00:00Z',
          publicationYear: 2021,
          volume: '9',
          issueNumber: '2',
          pageStart: 101,
          pageEnd: 130,
          pageCount: 30,
          articleType: 'clinical_trial',
          subjectAreas: ['cardiology', 'medicine'],
          keywords: [
            'randomized controlled trial',
            'coronary stents',
            'biodegradable polymer',
            'cardiovascular',
            'clinical outcomes'
          ],
          accessType: 'open_access',
          license: 'cc_by_nc',
          isOpenAccess: true,
          citationCount: 190,
          sampleSize: 8200,
          downloadCount: 2650,
          doi: '10.5678/cto.2021.0203',
          pdfUrl: 'https://arxiv.org/pdf/2404.07972',
          htmlUrl: 'https://journals.open-access-science.org/cto/articles/9/2/cto-2021-0203.html',
          createdAt: '2021-06-20T08:30:00Z',
          updatedAt: '2022-01-10T10:20:00Z',
          datasetIds: ['ds_cto_2021_rct_stentx'],
          hasOpenData: true,
          dataTabAvailable: true,
          openDataBadgeLabel: 'Open Data'
        }
      ]
    };

    // Persist Generated Data into localStorage using storage_key mapping
    localStorage.setItem('submission_guidelines', JSON.stringify(generatedData.submission_guidelines));
    localStorage.setItem('dataset_files', JSON.stringify(generatedData.dataset_files));
    localStorage.setItem('datasets', JSON.stringify(generatedData.datasets));
    localStorage.setItem('journals', JSON.stringify(generatedData.journals));
    localStorage.setItem('journal_issues', JSON.stringify(generatedData.journal_issues));
    localStorage.setItem('articles', JSON.stringify(generatedData.articles));

    // Initialize empty storages for list/collection/alerts entities
    if (!localStorage.getItem('reading_lists')) {
      localStorage.setItem('reading_lists', JSON.stringify([]));
    }
    if (!localStorage.getItem('reading_list_items')) {
      localStorage.setItem('reading_list_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('collections')) {
      localStorage.setItem('collections', JSON.stringify([]));
    }
    if (!localStorage.getItem('collection_items')) {
      localStorage.setItem('collection_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('saved_search_alerts')) {
      localStorage.setItem('saved_search_alerts', JSON.stringify([]));
    }
  }

  // Run all flow tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_MostCitedNeuroPdf();
    this.testTask2_ReadingListHighlyCitedRecentMedicine();
    this.testTask3_SelectCsJournalByApcAndReviewTime();
    this.testTask4_TwoLargestSampleStudiesApaCitations();
    this.testTask5_2023ArticleHtmlToReadingList();
    this.testTask6_CreateWeeklyMlHealthAlert();
    this.testTask7_OpenCsvDatasetFromGeneExpressionArticle();
    this.testTask8_BuildBibliographyCollectionThreeArticles();

    return this.results;
  }

  // Task 1 (adapted): Open the most cited CC BY neuroscience article from 2021-2022 and verify PDF link
  testTask1_MostCitedNeuroPdf() {
    const testName = 'Task 1: Most cited CC BY neuroscience article 2021-2022 PDF flow';
    console.log('Testing:', testName);

    try {
      // Get search filter options to ensure citations sort is available
      const filterOptions = this.logic.getSearchFilterOptions();
      const hasCitationsSort = (filterOptions.sortOptions || []).some(s => s.key === 'citations_desc');
      this.assert(hasCitationsSort, 'Search should support sort by citations_desc');

      // Simulate search with filters and sorting
      const searchResult = this.logic.searchArticles(
        'neuroscience',      // queryString
        2021,                // publicationYearMin
        2022,                // publicationYearMax
        ['neuroscience'],    // subjectAreas
        undefined,           // articleTypes
        ['open_access'],     // accessTypes
        ['cc_by'],           // licenses
        undefined,           // hasOpenData
        'citations_desc',    // sortOption
        1,                   // pageNumber
        10                   // pageSize
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Search should return results array');
      this.assert(searchResult.results.length > 0, 'Should find at least one matching neuroscience article');

      const topArticle = searchResult.results[0];

      // Open article details
      const details = this.logic.getArticleDetails(topArticle.id);
      this.assert(details && details.article, 'getArticleDetails should return article');
      const article = details.article;

      // Verify business conditions directly from returned data
      this.assert(article.isOpenAccess === true, 'Article should be open access');
      this.assert(article.license === 'cc_by', 'Article should have CC BY license');
      this.assert(
        Array.isArray(article.subjectAreas) && article.subjectAreas.includes('neuroscience'),
        'Article should be tagged as neuroscience'
      );
      this.assert(
        article.publicationYear >= 2021 && article.publicationYear <= 2022,
        'Article should be between 2021 and 2022'
      );

      // "View PDF" step: ensure a PDF URL is present and matches from search result
      this.assert(typeof article.pdfUrl === 'string' && article.pdfUrl.length > 0, 'Article should have a PDF URL');
      this.assert(article.pdfUrl === topArticle.pdfUrl, 'PDF URL from details should match search result');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2 (adapted): Create a reading list of 3 highly cited medicine articles from the last ~5 years
  testTask2_ReadingListHighlyCitedRecentMedicine() {
    const testName = 'Task 2: Reading list of 3 highly cited recent medicine articles';
    console.log('Testing:', testName);

    try {
      // Use a broad query and filter to medicine; sort by citations high->low
      const searchResult = this.logic.searchArticles(
        'a',          // very generic query to match all articles
        2019,         // publicationYearMin
        2026,         // publicationYearMax
        ['medicine'], // subjectAreas
        undefined,    // articleTypes
        undefined,    // accessTypes
        undefined,    // licenses
        undefined,    // hasOpenData
        'citations_desc', // sortOption
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Search should return results array');
      this.assert(searchResult.results.length >= 3, 'Should have at least 3 medicine articles');

      const targetListName = 'Climate Impact Review'; // Reuse original task name
      let readingListId = null;
      let addedCount = 0;

      for (let i = 0; i < searchResult.results.length && addedCount < 3; i++) {
        const art = searchResult.results[i];
        // Only take highly cited articles (citationCount > 50)
        if (typeof art.citationCount === 'number' && art.citationCount > 50) {
          const addResult = this.logic.addArticleToReadingList(
            art.id,
            readingListId,                    // existing list or null
            readingListId ? undefined : targetListName // create list on first add
          );

          this.assert(addResult && addResult.success === true, 'addArticleToReadingList should succeed');
          this.assert(addResult.readingListId, 'addArticleToReadingList should return a readingListId');

          if (!readingListId) {
            readingListId = addResult.readingListId;
            this.assert(addResult.readingListName === targetListName, 'Reading list should have the requested name');
          }

          addedCount++;
        }
      }

      this.assert(addedCount === 3, 'Should add exactly 3 highly cited articles to reading list');
      this.assert(readingListId, 'Reading list ID should be set');

      // Verify via Reading Lists summary
      const listsSummary = this.logic.getReadingListsSummary();
      this.assert(Array.isArray(listsSummary), 'getReadingListsSummary should return an array');

      const listSummary = listsSummary.find(x => x.readingList && x.readingList.id === readingListId);
      this.assert(listSummary, 'Created reading list should appear in summary');
      this.assert(listSummary.itemCount >= 3, 'Reading list should report at least 3 items');

      // Verify items in the list
      const listItemsResult = this.logic.getReadingListItems(readingListId);
      this.assert(listItemsResult && listItemsResult.readingList, 'getReadingListItems should return reading list metadata');
      this.assert(Array.isArray(listItemsResult.items), 'getReadingListItems.items should be an array');
      this.assert(listItemsResult.items.length >= 3, 'Reading list should contain at least 3 items');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Choose a CS journal with APC <= 1500 and review time <= 60 days and open its submission guidelines
  testTask3_SelectCsJournalByApcAndReviewTime() {
    const testName = 'Task 3: Select CS journal by APC and review time and open submission guidelines';
    console.log('Testing:', testName);

    try {
      // Ensure journal sort options include impact_factor_desc
      const jFilterOptions = this.logic.getJournalSearchFilterOptions();
      const hasImpactSort = (jFilterOptions.sortOptions || []).some(s => s.key === 'impact_factor_desc');
      this.assert(hasImpactSort, 'Journal search should support impact_factor_desc sort');

      // List computer science journals sorted by impact factor high->low
      const jSearch = this.logic.searchJournals(
        undefined,                 // queryString
        ['computer_science'],      // subjectAreas
        'impact_factor_desc',      // sortOption
        1,                         // pageNumber
        10                         // pageSize
      );

      this.assert(jSearch && Array.isArray(jSearch.results), 'searchJournals should return results array');
      this.assert(jSearch.results.length >= 1, 'Should have at least one CS journal');

      const toInspect = jSearch.results.slice(0, 3);
      const inspected = [];

      toInspect.forEach(j => {
        const details = this.logic.getJournalDetails(j.id);
        this.assert(details && details.journal, 'getJournalDetails should return journal');
        this.assert(details.journal.id === j.id, 'Journal ID in details should match list ID');
        inspected.push({ journal: j, details: details });
      });

      const apcLimit = 1500;
      const reviewLimit = 60;
      let selected = null;

      for (let i = 0; i < inspected.length; i++) {
        const jd = inspected[i].details.journal;
        if (typeof jd.apcAmount === 'number' && typeof jd.medianReviewTimeDays === 'number') {
          if (jd.apcAmount <= apcLimit && jd.medianReviewTimeDays <= reviewLimit) {
            selected = inspected[i];
            break;
          }
        }
      }

      this.assert(selected !== null, 'Should find at least one journal meeting APC and review time thresholds');

      // Open submission guidelines for the selected journal
      const guidelines = this.logic.getSubmissionGuidelines(selected.journal.id);
      this.assert(guidelines, 'getSubmissionGuidelines should return a guidelines object');
      this.assert(guidelines.journalId === selected.journal.id, 'Guidelines journalId should match selected journal');
      this.assert(
        typeof guidelines.contentHtml === 'string' && guidelines.contentHtml.length > 0,
        'Submission guidelines should have HTML content'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4 (adapted): Export APA citations for the two largest-sample studies (ensures sample-size sort + APA citation)
  testTask4_TwoLargestSampleStudiesApaCitations() {
    const testName = 'Task 4: APA citations for two largest-sample studies (sample size sort + citation export)';
    console.log('Testing:', testName);

    try {
      // Sort all articles by sample size high->low
      const searchResult = this.logic.searchArticles(
        'a',                 // broad query
        undefined,
        undefined,
        undefined,           // subjectAreas
        undefined,           // articleTypes
        undefined,           // accessTypes
        undefined,           // licenses
        undefined,           // hasOpenData
        'sample_size_desc',  // sortOption
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Search should return results array');
      this.assert(searchResult.results.length >= 2, 'Should have at least 2 articles with sampleSize');

      const first = searchResult.results[0];
      const second = searchResult.results[1];

      if (typeof first.sampleSize === 'number' && typeof second.sampleSize === 'number') {
        this.assert(first.sampleSize >= second.sampleSize, 'First article should have sampleSize >= second (sorted desc)');
      }

      // Optionally verify that the largest study is cardiology (to stay close to original task)
      const firstDetails = this.logic.getArticleDetails(first.id);
      this.assert(firstDetails && firstDetails.article, 'getArticleDetails should return article for largest study');
      if (Array.isArray(firstDetails.article.subjectAreas)) {
        this.assert(
          firstDetails.article.subjectAreas.includes('cardiology') ||
            firstDetails.article.subjectAreas.includes('medicine'),
          'Largest study should be in medicine/cardiology domain'
        );
      }

      // Export APA citations for the two largest-sample studies
      const citation1 = this.logic.getArticleCitation(first.id, 'apa');
      this.assert(citation1 && citation1.style === 'apa', 'First citation should be in APA style');
      this.assert(
        typeof citation1.formattedCitation === 'string' && citation1.formattedCitation.length > 0,
        'First APA citation text should be non-empty'
      );

      const citation2 = this.logic.getArticleCitation(second.id, 'apa');
      this.assert(citation2 && citation2.style === 'apa', 'Second citation should be in APA style');
      this.assert(
        typeof citation2.formattedCitation === 'string' && citation2.formattedCitation.length > 0,
        'Second APA citation text should be non-empty'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5 (adapted): From a 2023 article, open its HTML full text and save to a reading list
  testTask5_2023ArticleHtmlToReadingList() {
    const testName = 'Task 5: 2023 article HTML full text added to reading list';
    console.log('Testing:', testName);

    try {
      // Find 2023 articles and sort by newest first
      const searchResult = this.logic.searchArticles(
        'a',                  // broad query
        2023,                 // publicationYearMin
        2023,                 // publicationYearMax
        undefined,            // subjectAreas
        undefined,            // articleTypes
        undefined,            // accessTypes
        undefined,            // licenses
        undefined,            // hasOpenData
        'publication_date_newest', // sortOption
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Search should return results array');
      this.assert(searchResult.results.length >= 1, 'Should find at least one 2023 article');

      const articleFromIssue = searchResult.results[0];

      // Open article details
      const details = this.logic.getArticleDetails(articleFromIssue.id);
      this.assert(details && details.article, 'getArticleDetails should return article');
      const article = details.article;
      this.assert(article.publicationYear === 2023, 'Selected article should be from 2023');
      this.assert(typeof article.htmlUrl === 'string' && article.htmlUrl.length > 0, 'Article should have an HTML URL');

      // Load HTML full text
      const fullText = this.logic.getArticleFullTextHtml(article.id);
      this.assert(fullText && fullText.article, 'getArticleFullTextHtml should return article metadata');
      this.assert(fullText.article.id === article.id, 'Full text article ID should match');
      this.assert(
        typeof fullText.htmlContent === 'string' && fullText.htmlContent.length > 0,
        'Full text HTML content should be non-empty'
      );

      // Save to dedicated reading list
      const listName = 'Env Studies Reviews 2023';
      const addResult = this.logic.addArticleToReadingList(article.id, null, listName);
      this.assert(addResult && addResult.success === true, 'addArticleToReadingList should succeed');
      this.assert(addResult.readingListId, 'Reading list ID should be returned');

      const readingListId = addResult.readingListId;

      // Verify via reading list items
      const listItemsResult = this.logic.getReadingListItems(readingListId);
      this.assert(listItemsResult && listItemsResult.readingList, 'getReadingListItems should return reading list');
      this.assert(
        listItemsResult.readingList.name === listName,
        'Reading list should have the configured name'
      );
      const hasArticle = (listItemsResult.items || []).some(item => item.articleId === article.id);
      this.assert(hasArticle, 'Reading list should contain the 2023 article we added');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Create a weekly search alert for recent ML in healthcare articles
  testTask6_CreateWeeklyMlHealthAlert() {
    const testName = 'Task 6: Weekly search alert for machine learning in healthcare';
    console.log('Testing:', testName);

    try {
      const query = 'machine learning healthcare patient outcomes';

      // Run a search with filters (result count may be 0 in this dataset; that's fine)
      const searchResult = this.logic.searchArticles(
        query,
        2020,                 // publicationYearMin
        undefined,            // publicationYearMax
        ['medicine', 'computer_science'], // subjectAreas
        undefined,            // articleTypes
        undefined,            // accessTypes
        undefined,            // licenses
        undefined,            // hasOpenData
        'publication_date_newest', // sortOption
        1,
        10
      );

      this.assert(searchResult && typeof searchResult.totalCount === 'number', 'Search should return a totalCount');

      // Create a saved search alert matching the above filters
      const alert = this.logic.createSavedSearchAlert(
        'ML Health Weekly',           // name
        query,                        // queryString
        2020,                         // publicationYearMin
        undefined,                    // publicationYearMax
        ['medicine', 'computer_science'], // subjectAreas
        undefined,                    // articleTypes
        undefined,                    // accessTypes
        undefined,                    // licenses
        undefined,                    // hasOpenData
        'publication_date_newest',    // sortOption
        'weekly'                      // frequency
      );

      this.assert(alert && alert.id, 'createSavedSearchAlert should return an alert with ID');
      this.assert(alert.name === 'ML Health Weekly', 'Alert should have the correct name');
      this.assert(alert.queryString === query, 'Alert queryString should match search query');
      this.assert(alert.publicationYearMin === 2020, 'Alert should store publicationYearMin');
      this.assert(Array.isArray(alert.subjectAreas), 'Alert should have subjectAreas array');
      this.assert(alert.sortOption === 'publication_date_newest', 'Alert should store sort option');
      this.assert(alert.frequency === 'weekly', 'Alert should have weekly frequency');

      const alertId = alert.id;

      // Verify alert appears in alerts list
      const alerts = this.logic.getSavedSearchAlerts();
      this.assert(Array.isArray(alerts), 'getSavedSearchAlerts should return an array');
      const found = alerts.find(a => a.id === alertId);
      this.assert(found, 'Created alert should appear in alerts list');

      // Run the alert
      const runResult = this.logic.runSavedSearchAlert(alertId, 1, 10);
      this.assert(runResult && runResult.alert, 'runSavedSearchAlert should return alert metadata');
      this.assert(runResult.alert.id === alertId, 'runSavedSearchAlert alert ID should match');
      this.assert(runResult.results && Array.isArray(runResult.results.articles), 'runSavedSearchAlert should return articles array');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Find and open the details page of an open CSV dataset linked from a gene expression article
  testTask7_OpenCsvDatasetFromGeneExpressionArticle() {
    const testName = 'Task 7: Open CSV dataset details from gene expression article';
    console.log('Testing:', testName);

    try {
      // Search for gene expression dataset articles with open data
      const searchResult = this.logic.searchArticles(
        'gene expression dataset',
        undefined,
        undefined,
        undefined,                // subjectAreas
        ['research_article'],      // articleTypes
        undefined,                // accessTypes
        undefined,                // licenses
        true,                     // hasOpenData
        'relevance',              // sortOption
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Search should return results array');
      this.assert(searchResult.results.length >= 1, 'Should find at least one article with open gene expression data');

      // Choose the first result with an Open Data badge / flag
      const openDataArticle = searchResult.results.find(a => a.hasOpenData === true);
      this.assert(openDataArticle, 'Should find an article with hasOpenData === true');

      const details = this.logic.getArticleDetails(openDataArticle.id);
      this.assert(details && details.article, 'getArticleDetails should return article');
      const article = details.article;
      this.assert(article.hasOpenData === true, 'Details article should indicate open data');
      this.assert(article.dataTabAvailable === true, 'Data tab should be available for article');
      this.assert(Array.isArray(article.datasetIds) && article.datasetIds.length > 0, 'Article should list associated dataset IDs');

      // List datasets in the Data & Materials tab
      const datasets = this.logic.getArticleDatasets(article.id);
      this.assert(Array.isArray(datasets), 'getArticleDatasets should return an array');
      this.assert(datasets.length > 0, 'Article should have at least one dataset');

      // Find a CSV-format dataset
      const csvDataset = datasets.find(d => d.primaryFormat === 'csv' || d.hasCsvFiles === true);
      this.assert(csvDataset, 'Should find a dataset with CSV files');

      // Open dataset details
      const dsDetails = this.logic.getDatasetDetails(csvDataset.id);
      this.assert(dsDetails && dsDetails.dataset, 'getDatasetDetails should return dataset');
      this.assert(dsDetails.dataset.id === csvDataset.id, 'Dataset ID should match in details');
      this.assert(dsDetails.article && dsDetails.article.id === article.id, 'Dataset details should reference the source article');
      this.assert(dsDetails.dataset.isOpenData === true, 'Dataset should be marked as open data');

      // View file list and ensure at least one CSV file
      const files = this.logic.getDatasetFiles(csvDataset.id);
      this.assert(Array.isArray(files), 'getDatasetFiles should return an array');
      this.assert(files.length > 0, 'Dataset should have at least one file');
      const hasCsvFile = files.some(f => f.format === 'csv');
      this.assert(hasCsvFile, 'Dataset files should include at least one CSV file');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8 (adapted): Build a bibliography collection of 3 articles from at least 2 different journals
  testTask8_BuildBibliographyCollectionThreeArticles() {
    const testName = 'Task 8: Build bibliography collection of 3 articles from >=2 journals';
    console.log('Testing:', testName);

    try {
      // Broad search between 2018-2023, sorted by relevance
      const searchResult = this.logic.searchArticles(
        'a',         // broad query
        2018,
        2023,
        undefined,   // subjectAreas
        undefined,   // articleTypes
        undefined,   // accessTypes
        undefined,   // licenses
        undefined,   // hasOpenData
        'relevance', // sortOption
        1,
        10
      );

      this.assert(searchResult && Array.isArray(searchResult.results), 'Search should return results array');
      this.assert(searchResult.results.length >= 3, 'Should have at least 3 articles between 2018-2023');

      const targetCollectionName = 'Urban Air 2018-23'; // Keep original naming
      let collectionId = null;
      let addedCount = 0;
      const usedJournalIds = new Set();

      for (let i = 0; i < searchResult.results.length && addedCount < 3; i++) {
        const art = searchResult.results[i];
        const addResult = this.logic.addArticleToCollection(
          art.id,
          collectionId,                     // existing collection or null
          collectionId ? undefined : targetCollectionName // create on first add
        );

        this.assert(addResult && addResult.success === true, 'addArticleToCollection should succeed');
        this.assert(addResult.collectionId, 'Collection ID should be returned');

        if (!collectionId) {
          collectionId = addResult.collectionId;
          this.assert(addResult.collectionName === targetCollectionName, 'Collection name should match requested');
        }

        addedCount++;
        if (art.journalId) {
          usedJournalIds.add(art.journalId);
        }
      }

      this.assert(collectionId, 'Collection ID should be set');
      this.assert(addedCount === 3, 'Should add exactly 3 articles to collection');

      // Verify via collections summary (including distinctJournalCount)
      const collectionsSummary = this.logic.getCollectionsSummary();
      this.assert(Array.isArray(collectionsSummary), 'getCollectionsSummary should return an array');

      const summary = collectionsSummary.find(c => c.collection && c.collection.id === collectionId);
      this.assert(summary, 'Created collection should appear in collections summary');
      this.assert(summary.itemCount >= 3, 'Collection should contain at least 3 items');
      this.assert(
        typeof summary.distinctJournalCount === 'number' && summary.distinctJournalCount >= 2,
        'Collection should contain articles from at least 2 distinct journals'
      );

      // Verify collection items and metadata
      const itemsResult = this.logic.getCollectionItems(collectionId);
      this.assert(itemsResult && itemsResult.collection, 'getCollectionItems should return collection metadata');
      this.assert(itemsResult.collection.name === targetCollectionName, 'Collection should have the correct name');
      this.assert(Array.isArray(itemsResult.items), 'Collection items should be an array');
      this.assert(itemsResult.items.length >= 3, 'Collection should have at least 3 items');

      // Optional: export bibliography as APA plain text to simulate bibliography building
      const exportResult = this.logic.exportCollectionBibliography(collectionId, 'apa_plain_text');
      this.assert(exportResult && exportResult.format === 'apa_plain_text', 'Export format should be apa_plain_text');
      this.assert(
        typeof exportResult.contentText === 'string' && exportResult.contentText.length > 0,
        'Exported bibliography content should be non-empty'
      );

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Simple assertion helper
  assert(condition, message) {
    if (!condition) {
      throw new Error('Assertion failed: ' + message);
    }
  }

  recordSuccess(testName) {
    this.results.push({ test: testName, success: true });
    console.log('\u2713 ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('\u2717 ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
