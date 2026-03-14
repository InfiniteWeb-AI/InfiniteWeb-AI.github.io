// Test runner for business logic
class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    // Clear localStorage before tests
    this.clearStorage();
    // Initialize test data
    this.setupTestData();
  }

  clearStorage() {
    // Clear all localStorage data for clean test environment
    localStorage.clear();
    // Reinitialize storage structure
    this.logic._initStorage();
  }

  setupTestData() {
    // IMPORTANT: Use the Generated Data exactly as provided
    const generatedData = {
      labels: [
        {
          id: 'confidential',
          name: 'Confidential',
          color: '#DC2626',
          description: 'Use for files and folders containing sensitive or restricted information.',
          createdAt: '2024-01-10T09:15:00Z'
        },
        {
          id: 'finance',
          name: 'Finance',
          color: '#0F766E',
          description: 'Financial documents such as invoices, budgets, and reports.',
          createdAt: '2023-11-05T14:32:00Z'
        },
        {
          id: 'client_materials',
          name: 'Client Materials',
          color: '#2563EB',
          description: 'Assets and documents prepared for clients or prospects.',
          createdAt: '2024-03-18T11:05:00Z'
        }
      ],
      item_labels: [],
      incoming_shares: [
        {
          id: 'share_client_budget_q3',
          storageItemId: 'file_client_budget_q3.xlsx',
          ownerName: 'Alex Rivera',
          sharedDate: '2026-02-28T16:30:00Z',
          permission: 'viewer',
          allowDownload: true,
          message: 'Here is the latest Q3 budget draft for your review.'
        },
        {
          id: 'share_team_offsite_photos',
          storageItemId: 'folder_team_offsite_photos',
          ownerName: 'Jamie Chen',
          sharedDate: '2026-02-20T11:05:00Z',
          permission: 'editor',
          allowDownload: true,
          message: 'Feel free to add your own photos from the offsite here.'
        },
        {
          id: 'share_vendor_contract',
          storageItemId: 'file_vendor_contract_signed.pdf',
          ownerName: 'Legal Ops',
          sharedDate: '2026-01-15T09:00:00Z',
          permission: 'viewer',
          allowDownload: false,
          message: 'Final signed version for your records. Download is restricted per policy.'
        }
      ],
      collaborator_permissions: [
        {
          id: 'perm_project_alpha_alex_viewer',
          storageItemId: 'folder_project_alpha',
          collaboratorName: 'alex_viewer',
          role: 'viewer',
          allowDownload: true,
          addedAt: '2025-11-30T09:15:00Z',
          lastUpdatedAt: '2025-11-30T09:15:00Z'
        },
        {
          id: 'perm_project_alpha_jamie_editor',
          storageItemId: 'folder_project_alpha',
          collaboratorName: 'jamie_editor',
          role: 'editor',
          allowDownload: true,
          addedAt: '2025-11-30T09:20:00Z',
          lastUpdatedAt: '2025-11-30T09:20:00Z'
        },
        {
          id: 'perm_client_budget_q3_viewer',
          storageItemId: 'file_client_budget_q3.xlsx',
          collaboratorName: 'finance_analyst',
          role: 'viewer',
          allowDownload: true,
          addedAt: '2026-02-28T16:31:00Z',
          lastUpdatedAt: '2026-02-28T16:31:00Z'
        }
      ],
      share_links: [
        {
          id: 'link_project_alpha_restricted',
          storageItemId: 'folder_project_alpha',
          accessLevel: 'only_invited_people',
          permission: 'can_edit',
          allowDownload: true,
          expiresAt: '2025-12-31T23:59:59Z',
          url: 'https://app.cloudstorage.com/s/project-alpha-xt92fk',
          isEnabled: true,
          createdAt: '2025-11-30T09:10:00Z'
        },
        {
          id: 'link_team_handbook_public_view',
          storageItemId: 'file_team_handbook.pdf',
          accessLevel: 'anyone_with_link',
          permission: 'can_view',
          allowDownload: false,
          expiresAt: '2025-06-30T23:59:59Z',
          url: 'https://app.cloudstorage.com/s/team-handbook-4h7k2m',
          isEnabled: true,
          createdAt: '2025-05-20T10:00:00Z'
        },
        {
          id: 'link_vendor_contract_internal',
          storageItemId: 'file_vendor_contract_signed.pdf',
          accessLevel: 'only_invited_people',
          permission: 'can_view',
          allowDownload: false,
          url: 'https://app.cloudstorage.com/s/vendor-contract-q921lz',
          isEnabled: true,
          createdAt: '2026-01-15T08:50:00Z'
        }
      ],
      file_versions: [
        {
          id: 'ver_roadmap_1',
          storageItemId: 'file_roadmap.docx',
          versionNumber: 1,
          createdAt: '2024-01-05T09:30:00Z',
          sizeBytes: 245760,
          contentHash: '5f2a9c3b7d8e1f204b6c9d0e3a4f7b1289c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4',
          note: 'Initial draft of 2024 roadmap.',
          isCurrent: false
        },
        {
          id: 'ver_roadmap_2',
          storageItemId: 'file_roadmap.docx',
          versionNumber: 2,
          createdAt: '2024-01-15T10:00:00Z',
          sizeBytes: 262144,
          contentHash: '7a1b2c3d4e5f60718293a4b5c6d7e8f9012a3b4c5d6e7f8091a2b3c4d5e6f708',
          note: 'Updated after Q1 planning session.',
          isCurrent: false
        },
        {
          id: 'ver_roadmap_3',
          storageItemId: 'file_roadmap.docx',
          versionNumber: 3,
          createdAt: '2024-02-01T16:30:00Z',
          sizeBytes: 278528,
          contentHash: '9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c',
          note: 'Added dependency timelines and milestones.',
          isCurrent: false
        }
      ],
      storage_items: [
        {
          id: 'folder_documents',
          name: 'Documents',
          itemType: 'folder',
          extension: null,
          fileType: 'other',
          mimeType: null,
          sizeBytes: 0,
          parentId: null,
          createdAt: '2023-12-15T09:00:00Z',
          modifiedAt: '2026-01-10T10:00:00Z',
          lastOpenedAt: '2026-03-01T08:30:00Z',
          starred: false,
          isAvailableOffline: false,
          isDeleted: false,
          deletedAt: null,
          originalParentId: null,
          hasVersionHistory: false,
          currentVersionId: null,
          path: '/Documents'
        },
        {
          id: 'folder_projects',
          name: 'Projects',
          itemType: 'folder',
          extension: null,
          fileType: 'other',
          mimeType: null,
          sizeBytes: 0,
          parentId: null,
          createdAt: '2023-12-15T09:05:00Z',
          modifiedAt: '2026-02-20T11:00:00Z',
          lastOpenedAt: '2026-02-28T10:00:00Z',
          starred: false,
          isAvailableOffline: false,
          isDeleted: false,
          deletedAt: null,
          originalParentId: null,
          hasVersionHistory: false,
          currentVersionId: null,
          path: '/Projects'
        },
        {
          id: 'folder_videos',
          name: 'Videos',
          itemType: 'folder',
          extension: null,
          fileType: 'other',
          mimeType: null,
          sizeBytes: 0,
          parentId: null,
          createdAt: '2024-01-10T10:00:00Z',
          modifiedAt: '2025-11-16T10:30:00Z',
          lastOpenedAt: '2026-02-25T14:00:00Z',
          starred: false,
          isAvailableOffline: false,
          isDeleted: false,
          deletedAt: null,
          originalParentId: null,
          hasVersionHistory: false,
          currentVersionId: null,
          path: '/Videos'
        }
      ],
      _metadata: {
        baselineDate: '2026-03-03',
        generatedAt: '2026-03-03T03:15:58.093256'
      }
    };

    // Copy generated data into localStorage using correct storage keys
    localStorage.setItem('labels', JSON.stringify(generatedData.labels));
    localStorage.setItem('item_labels', JSON.stringify(generatedData.item_labels));
    localStorage.setItem('incoming_shares', JSON.stringify(generatedData.incoming_shares));
    localStorage.setItem('collaborator_permissions', JSON.stringify(generatedData.collaborator_permissions));
    localStorage.setItem('share_links', JSON.stringify(generatedData.share_links));
    localStorage.setItem('file_versions', JSON.stringify(generatedData.file_versions));

    // Augment storage_items to ensure relationships used in tasks are valid
    const storageItems = generatedData.storage_items.slice();

    // Add Reports special folder so getSpecialFolder('reports') can resolve
    storageItems.push({
      id: 'folder_reports',
      name: 'Reports',
      itemType: 'folder',
      extension: null,
      fileType: 'other',
      mimeType: null,
      sizeBytes: 0,
      parentId: null,
      createdAt: '2023-12-15T09:10:00Z',
      modifiedAt: '2026-02-10T09:00:00Z',
      lastOpenedAt: '2026-02-28T09:00:00Z',
      starred: false,
      isAvailableOffline: false,
      isDeleted: false,
      deletedAt: null,
      originalParentId: null,
      hasVersionHistory: false,
      currentVersionId: null,
      path: '/Reports'
    });

    // Project Alpha folder under Projects
    storageItems.push({
      id: 'folder_project_alpha',
      name: 'Project Alpha',
      itemType: 'folder',
      extension: null,
      fileType: 'other',
      mimeType: null,
      sizeBytes: 0,
      parentId: 'folder_projects',
      createdAt: '2024-01-20T09:00:00Z',
      modifiedAt: '2025-11-30T09:00:00Z',
      lastOpenedAt: '2026-02-28T10:30:00Z',
      starred: false,
      isAvailableOffline: false,
      isDeleted: false,
      deletedAt: null,
      originalParentId: null,
      hasVersionHistory: false,
      currentVersionId: null,
      path: '/Projects/Project Alpha'
    });

    // Client Pitch project folder under Projects
    storageItems.push({
      id: 'folder_client_pitch',
      name: 'Client Pitch',
      itemType: 'folder',
      extension: null,
      fileType: 'other',
      mimeType: null,
      sizeBytes: 0,
      parentId: 'folder_projects',
      createdAt: '2024-02-10T09:00:00Z',
      modifiedAt: '2026-02-20T11:30:00Z',
      lastOpenedAt: '2026-02-28T11:00:00Z',
      starred: false,
      isAvailableOffline: false,
      isDeleted: false,
      deletedAt: null,
      originalParentId: null,
      hasVersionHistory: false,
      currentVersionId: null,
      path: '/Projects/Client Pitch'
    });

    // Team Handbook file in root
    storageItems.push({
      id: 'file_team_handbook.pdf',
      name: 'Team Handbook.pdf',
      itemType: 'file',
      extension: 'pdf',
      fileType: 'pdf',
      mimeType: 'application/pdf',
      sizeBytes: 5 * 1024 * 1024,
      parentId: null,
      createdAt: '2024-05-01T12:00:00Z',
      modifiedAt: '2025-05-20T10:00:00Z',
      lastOpenedAt: '2026-03-02T09:00:00Z',
      starred: false,
      isAvailableOffline: false,
      isDeleted: false,
      deletedAt: null,
      originalParentId: null,
      hasVersionHistory: false,
      currentVersionId: null,
      path: '/Team Handbook.pdf'
    });

    // Vendor contract PDF in root
    storageItems.push({
      id: 'file_vendor_contract_signed.pdf',
      name: 'Vendor Contract Signed.pdf',
      itemType: 'file',
      extension: 'pdf',
      fileType: 'pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2 * 1024 * 1024,
      parentId: null,
      createdAt: '2026-01-15T08:45:00Z',
      modifiedAt: '2026-01-15T09:00:00Z',
      lastOpenedAt: '2026-02-20T11:30:00Z',
      starred: false,
      isAvailableOffline: false,
      isDeleted: false,
      deletedAt: null,
      originalParentId: null,
      hasVersionHistory: false,
      currentVersionId: null,
      path: '/Vendor Contract Signed.pdf'
    });

    // Client Budget Q3 spreadsheet (shared with me)
    storageItems.push({
      id: 'file_client_budget_q3.xlsx',
      name: 'Client Budget Q3.xlsx',
      itemType: 'file',
      extension: 'xlsx',
      fileType: 'spreadsheet',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: 350 * 1024,
      parentId: 'folder_documents',
      createdAt: '2026-02-25T10:00:00Z',
      modifiedAt: '2026-02-28T16:29:00Z',
      lastOpenedAt: '2026-02-28T16:31:00Z',
      starred: false,
      isAvailableOffline: false,
      isDeleted: false,
      deletedAt: null,
      originalParentId: null,
      hasVersionHistory: false,
      currentVersionId: null,
      path: '/Documents/Client Budget Q3.xlsx'
    });

    // Team offsite photos folder
    storageItems.push({
      id: 'folder_team_offsite_photos',
      name: 'Team Offsite Photos',
      itemType: 'folder',
      extension: null,
      fileType: 'other',
      mimeType: null,
      sizeBytes: 0,
      parentId: 'folder_documents',
      createdAt: '2024-09-01T12:00:00Z',
      modifiedAt: '2026-02-20T11:05:00Z',
      lastOpenedAt: '2026-02-21T09:00:00Z',
      starred: false,
      isAvailableOffline: false,
      isDeleted: false,
      deletedAt: null,
      originalParentId: null,
      hasVersionHistory: false,
      currentVersionId: null,
      path: '/Documents/Team Offsite Photos'
    });

    // Roadmap.docx with version history
    storageItems.push({
      id: 'file_roadmap.docx',
      name: 'Roadmap.docx',
      itemType: 'file',
      extension: 'docx',
      fileType: 'document',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sizeBytes: 278528,
      parentId: 'folder_documents',
      createdAt: '2024-01-05T09:30:00Z',
      modifiedAt: '2024-02-01T16:30:00Z',
      lastOpenedAt: '2026-02-01T10:00:00Z',
      starred: false,
      isAvailableOffline: false,
      isDeleted: false,
      deletedAt: null,
      originalParentId: null,
      hasVersionHistory: true,
      currentVersionId: null,
      path: '/Documents/Roadmap.docx'
    });

    // Large video files under Videos
    storageItems.push({
      id: 'file_video_launch_event.mp4',
      name: 'Launch Event.mp4',
      itemType: 'file',
      extension: 'mp4',
      fileType: 'video',
      mimeType: 'video/mp4',
      sizeBytes: 800 * 1024 * 1024,
      parentId: 'folder_videos',
      createdAt: '2025-11-01T10:00:00Z',
      modifiedAt: '2025-11-16T10:30:00Z',
      lastOpenedAt: '2026-02-20T14:00:00Z',
      starred: false,
      isAvailableOffline: false,
      isDeleted: false,
      deletedAt: null,
      originalParentId: null,
      hasVersionHistory: false,
      currentVersionId: null,
      path: '/Videos/Launch Event.mp4'
    });

    storageItems.push({
      id: 'file_video_product_demo.mp4',
      name: 'Product Demo.mp4',
      itemType: 'file',
      extension: 'mp4',
      fileType: 'video',
      mimeType: 'video/mp4',
      sizeBytes: 700 * 1024 * 1024,
      parentId: 'folder_videos',
      createdAt: '2025-10-15T10:00:00Z',
      modifiedAt: '2025-11-10T09:00:00Z',
      lastOpenedAt: '2026-02-18T13:00:00Z',
      starred: false,
      isAvailableOffline: false,
      isDeleted: false,
      deletedAt: null,
      originalParentId: null,
      hasVersionHistory: false,
      currentVersionId: null,
      path: '/Videos/Product Demo.mp4'
    });

    storageItems.push({
      id: 'file_video_team_allhands.mp4',
      name: 'Team All-Hands.mp4',
      itemType: 'file',
      extension: 'mp4',
      fileType: 'video',
      mimeType: 'video/mp4',
      sizeBytes: 550 * 1024 * 1024,
      parentId: 'folder_videos',
      createdAt: '2025-09-20T10:00:00Z',
      modifiedAt: '2025-11-01T09:00:00Z',
      lastOpenedAt: '2026-02-10T12:00:00Z',
      starred: false,
      isAvailableOffline: false,
      isDeleted: false,
      deletedAt: null,
      originalParentId: null,
      hasVersionHistory: false,
      currentVersionId: null,
      path: '/Videos/Team All-Hands.mp4'
    });

    // Additional Q3 spreadsheets for Task 5
    storageItems.push({
      id: 'file_sales_q3_summary.xlsx',
      name: 'Sales_Q3_Summary.xlsx',
      itemType: 'file',
      extension: 'xlsx',
      fileType: 'spreadsheet',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: 220 * 1024,
      parentId: 'folder_reports',
      createdAt: '2026-01-20T09:00:00Z',
      modifiedAt: '2026-02-10T12:00:00Z',
      lastOpenedAt: '2026-02-11T08:00:00Z',
      starred: false,
      isAvailableOffline: false,
      isDeleted: false,
      deletedAt: null,
      originalParentId: null,
      hasVersionHistory: false,
      currentVersionId: null,
      path: '/Reports/Sales_Q3_Summary.xlsx'
    });

    storageItems.push({
      id: 'file_q3_forecast.xlsx',
      name: 'Q3_Forecast.xlsx',
      itemType: 'file',
      extension: 'xlsx',
      fileType: 'spreadsheet',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: 260 * 1024,
      parentId: 'folder_reports',
      createdAt: '2026-01-25T09:00:00Z',
      modifiedAt: '2026-02-20T14:00:00Z',
      lastOpenedAt: '2026-02-21T09:30:00Z',
      starred: false,
      isAvailableOffline: false,
      isDeleted: false,
      deletedAt: null,
      originalParentId: null,
      hasVersionHistory: false,
      currentVersionId: null,
      path: '/Reports/Q3_Forecast.xlsx'
    });

    // Persist augmented storage_items
    localStorage.setItem('storage_items', JSON.stringify(storageItems));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_CollectInvoicesAndStarFolder();
    this.testTask2_ShareProjectAlphaWithExpiry();
    this.testTask3_ArchiveAndDeleteLargestVideos();
    this.testTask4_PublicTeamHandbookLink();
    this.testTask5_GatherQ3Reports();
    this.testTask6_RestoreRoadmapVersion();
    this.testTask7_OfflinePdfsAndClientPitch();
    this.testTask8_UpdateDownloadPermissionAndLabel();

    return this.results;
  }

  // Task 1: Collect 5 'Invoice_2024' PDFs into new folder and star it
  testTask1_CollectInvoicesAndStarFolder() {
    console.log('Testing: Task 1 - Collect Invoice PDFs and star folder');
    const testName = 'Task 1 - Collect 5 Invoice_2024 PDFs into Invoices 2024 and star it';

    try {
      const numInvoicesToCreate = 5;

      // Go to Documents via special folder resolution
      const documentsFolder = this.logic.getSpecialFolder('documents');
      this.assert(documentsFolder && documentsFolder.itemType === 'folder', 'Documents folder should resolve');

      // Create 'Invoices 2024' folder inside Documents
      const createFolderResult = this.logic.createFolder(documentsFolder.id, 'Invoices 2024');
      this.assert(createFolderResult && createFolderResult.success === true, 'Invoices 2024 folder should be created successfully');
      const invoicesFolder = createFolderResult.folder;
      this.assert(invoicesFolder && invoicesFolder.parentId === documentsFolder.id, 'Invoices 2024 should have Documents as parent');

      // Simulate 5 Invoice_2024 PDF files being present by uploading them into Documents
      const filesToUpload = [];
      for (let i = 1; i <= numInvoicesToCreate; i++) {
        const indexStr = String(i).padStart(3, '0');
        filesToUpload.push({
          clientFileId: 'tmp_invoice_' + indexStr,
          name: 'Invoice_2024_' + indexStr + '.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 50 * 1024 * i,
          extension: 'pdf'
        });
      }

      const uploadedInvoices = this.logic.uploadFilesToFolder(documentsFolder.id, filesToUpload);
      this.assert(Array.isArray(uploadedInvoices), 'uploadFilesToFolder should return an array of StorageItems');
      this.assert(uploadedInvoices.length === numInvoicesToCreate, 'Should upload exactly ' + numInvoicesToCreate + ' invoice PDFs');

      // Search within Documents for Invoice_2024 PDFs (local search bar)
      const searchResult = this.logic.searchFolderItems(
        documentsFolder.id,
        'Invoice_2024',
        { fileType: 'pdf' },
        'relevance',
        'asc'
      );
      this.assert(searchResult && Array.isArray(searchResult.items), 'searchFolderItems should return items array');
      this.assert(searchResult.items.length >= numInvoicesToCreate, 'Should find at least ' + numInvoicesToCreate + ' Invoice_2024 PDFs');

      const invoicesToMove = searchResult.items.slice(0, numInvoicesToCreate).map(item => item.id);

      // Move the first 5 matching PDFs into Invoices 2024 folder
      const moveResult = this.logic.moveItemsToFolder(invoicesToMove, invoicesFolder.id);
      this.assert(moveResult && moveResult.success === true, 'Move operation should succeed for invoice PDFs');

      // Verify Invoices 2024 now contains exactly those 5 invoice files
      const invoicesFolderContents = this.logic.getFolderContents(invoicesFolder.id, 'name', 'asc', null);
      this.assert(invoicesFolderContents && Array.isArray(invoicesFolderContents.items), 'Should be able to list Invoices 2024 contents');
      const movedInvoices = invoicesFolderContents.items.filter(item => item.name.indexOf('Invoice_2024') === 0);
      this.assert(movedInvoices.length === numInvoicesToCreate, 'Invoices 2024 should contain ' + numInvoicesToCreate + ' Invoice_2024 PDFs');

      // Star the Invoices 2024 folder
      const starResult = this.logic.setItemStarStatus(invoicesFolder.id, true);
      this.assert(starResult && starResult.success === true, 'Starring Invoices 2024 should succeed');
      this.assert(starResult.item && starResult.item.starred === true, 'Invoices 2024 folder should be starred');

      // Verify via Documents view filtered to starred items
      const docsStarred = this.logic.getFolderContents(
        documentsFolder.id,
        'name',
        'asc',
        { onlyStarred: true }
      );
      this.assert(docsStarred && Array.isArray(docsStarred.items), 'Should be able to list starred items in Documents');
      const starredInvoicesFolder = docsStarred.items.find(item => item.id === invoicesFolder.id);
      this.assert(!!starredInvoicesFolder, 'Invoices 2024 should appear when filtering Documents by starred');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Share the 'Project Alpha' folder with specific collaborators and expiry date
  testTask2_ShareProjectAlphaWithExpiry() {
    console.log('Testing: Task 2 - Share Project Alpha with collaborators and expiry');
    const testName = 'Task 2 - Share Project Alpha with viewer/editor and expiry date';

    try {
      // Locate Projects folder and then Project Alpha
      const projectsFolder = this.logic.getSpecialFolder('projects');
      this.assert(projectsFolder && projectsFolder.itemType === 'folder', 'Projects folder should resolve');

      const projectsContents = this.logic.getFolderContents(projectsFolder.id, 'name', 'asc', null);
      this.assert(projectsContents && Array.isArray(projectsContents.items), 'Should list Projects folder contents');

      let projectAlpha = projectsContents.items.find(item => item.name === 'Project Alpha' && item.itemType === 'folder');

      // If not present for some reason, create it to keep flow working
      if (!projectAlpha) {
        const createResult = this.logic.createFolder(projectsFolder.id, 'Project Alpha');
        this.assert(createResult && createResult.success === true, 'Should be able to create Project Alpha folder if missing');
        projectAlpha = createResult.folder;
      }

      this.assert(projectAlpha, 'Project Alpha folder should now be available');

      // Add/update collaborators: alex_viewer (viewer) and jamie_editor (editor)
      const collaboratorsToSet = [
        { collaboratorName: 'alex_viewer', role: 'viewer', allowDownload: true },
        { collaboratorName: 'jamie_editor', role: 'editor', allowDownload: true }
      ];

      const updatedCollaborators = this.logic.updateCollaboratorsForItem(projectAlpha.id, collaboratorsToSet);
      this.assert(Array.isArray(updatedCollaborators), 'updateCollaboratorsForItem should return collaborator list');

      const alexPerm = updatedCollaborators.find(c => c.collaboratorName === 'alex_viewer');
      const jamiePerm = updatedCollaborators.find(c => c.collaboratorName === 'jamie_editor');
      this.assert(alexPerm && alexPerm.role === 'viewer', 'alex_viewer should be a viewer on Project Alpha');
      this.assert(jamiePerm && jamiePerm.role === 'editor', 'jamie_editor should be an editor on Project Alpha');

      // Configure share link: only invited people, can_edit, expires Dec 31, 2025
      const expiryIso = new Date('2025-12-31T23:59:59Z').toISOString();
      const shareLink = this.logic.upsertShareLinkForItem(
        projectAlpha.id,
        'only_invited_people',
        'can_edit',
        true,
        expiryIso,
        true
      );

      this.assert(shareLink && shareLink.storageItemId === projectAlpha.id, 'Share link should target Project Alpha');
      this.assert(shareLink.accessLevel === 'only_invited_people', 'Share link access should be restricted to invited people');
      this.assert(shareLink.permission === 'can_edit', 'Share link permission should allow editing');
      this.assert(shareLink.expiresAt, 'Share link should have an expiration timestamp');

      // Verify via sharing settings
      const sharingSettings = this.logic.getSharingSettingsForItem(projectAlpha.id);
      this.assert(sharingSettings && sharingSettings.item && sharingSettings.item.id === projectAlpha.id, 'Sharing settings should be returned for Project Alpha');
      this.assert(Array.isArray(sharingSettings.collaborators), 'Sharing settings should include collaborators');
      this.assert(sharingSettings.collaborators.length >= 2, 'Project Alpha should have at least two collaborators configured');

      const linkFromSettings = sharingSettings.shareLinks.find(l => l.id === shareLink.id);
      this.assert(!!linkFromSettings, 'Configured share link should appear in sharing settings');
      this.assert(linkFromSettings.accessLevel === 'only_invited_people', 'Share link in settings should have restricted access');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 3: Archive two largest video files over 500MB and permanently delete third largest
  testTask3_ArchiveAndDeleteLargestVideos() {
    console.log('Testing: Task 3 - Archive two largest videos and delete third');
    const testName = 'Task 3 - Archive top 2 large videos and permanently delete 3rd';

    try {
      const minSizeBytes = 500 * 1024 * 1024;

      // Open Storage view and list video files, largest first
      const storageFileList = this.logic.getStorageFileList(
        { fileType: 'video', minSizeBytes: minSizeBytes },
        'size',
        'desc'
      );

      this.assert(storageFileList && Array.isArray(storageFileList.items), 'Storage file list for videos should be returned');
      this.assert(storageFileList.items.length >= 3, 'Should have at least three large video files for this test');

      const topThree = storageFileList.items.slice(0, 3);
      topThree.forEach(item => {
        this.assert(item.sizeBytes >= minSizeBytes, 'Each selected video should be at least 500 MB');
      });

      // Ensure Videos/Archive folder exists
      const videosFolder = this.logic.getSpecialFolder('videos');
      this.assert(videosFolder && videosFolder.itemType === 'folder', 'Videos folder should resolve');

      const videosContents = this.logic.getFolderContents(videosFolder.id, 'name', 'asc', null);
      this.assert(videosContents && Array.isArray(videosContents.items), 'Should list contents of Videos folder');

      let archiveFolder = videosContents.items.find(item => item.name === 'Archive' && item.itemType === 'folder');
      if (!archiveFolder) {
        const createArchiveResult = this.logic.createFolder(videosFolder.id, 'Archive');
        this.assert(createArchiveResult && createArchiveResult.success === true, 'Should be able to create Archive subfolder in Videos');
        archiveFolder = createArchiveResult.folder;
      }

      // Move the two largest videos into Videos/Archive
      const twoLargestIds = [topThree[0].id, topThree[1].id];
      const moveResult = this.logic.moveItemsToFolder(twoLargestIds, archiveFolder.id);
      this.assert(moveResult && moveResult.success === true, 'Moving top two videos to Archive should succeed');

      // Verify the two largest are now in Archive
      const archiveContents = this.logic.getFolderContents(archiveFolder.id, 'name', 'asc', null);
      this.assert(archiveContents && Array.isArray(archiveContents.items), 'Should list Archive folder contents');

      twoLargestIds.forEach(id => {
        const item = archiveContents.items.find(i => i.id === id);
        this.assert(!!item, 'Archived video ' + id + ' should be present in Archive folder');
      });

      // Soft-delete the third-largest video
      const thirdVideo = topThree[2];
      const softDeleteResult = this.logic.softDeleteItems([thirdVideo.id]);
      this.assert(softDeleteResult && softDeleteResult.success === true, 'Soft delete of third-largest video should succeed');

      // Verify it appears in Trash
      const trashAfterDelete = this.logic.getTrashItems(null, 'deleted_at', 'desc');
      this.assert(trashAfterDelete && Array.isArray(trashAfterDelete.items), 'Trash items list should be returned');

      const trashedItem = trashAfterDelete.items.find(i => i.id === thirdVideo.id);
      this.assert(trashedItem && trashedItem.isDeleted === true, 'Third-largest video should appear in Trash after soft delete');

      // Permanently delete it from Trash
      const permDeleteResult = this.logic.permanentlyDeleteItems([thirdVideo.id]);
      this.assert(permDeleteResult && permDeleteResult.success === true, 'Permanent delete of third-largest video should succeed');

      const trashAfterPerm = this.logic.getTrashItems(null, 'deleted_at', 'desc');
      const stillInTrash = trashAfterPerm.items.find(i => i.id === thirdVideo.id);
      this.assert(!stillInTrash, 'Third-largest video should no longer be present in Trash after permanent delete');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Create restricted public link for Team Handbook.pdf
  testTask4_PublicTeamHandbookLink() {
    console.log('Testing: Task 4 - Public view-only link for Team Handbook');
    const testName = 'Task 4 - Configure public view-only, no-download link with expiry for Team Handbook';

    try {
      // Get root (My Files) contents and locate Team Handbook.pdf
      const rootContents = this.logic.getRootFolderContents('name', 'asc', null);
      this.assert(rootContents && Array.isArray(rootContents.items), 'Root folder contents should be returned');

      const teamHandbook = rootContents.items.find(item => item.name === 'Team Handbook.pdf');
      this.assert(teamHandbook && teamHandbook.itemType === 'file', 'Team Handbook.pdf should exist in root');

      // Configure share link: anyone with link, view-only, no download, expires June 30, 2025
      const accessLevel = 'anyone_with_link';
      const permission = 'can_view';
      const allowDownload = false;
      const expiresIso = new Date('2025-06-30T23:59:59Z').toISOString();

      const shareLink = this.logic.upsertShareLinkForItem(
        teamHandbook.id,
        accessLevel,
        permission,
        allowDownload,
        expiresIso,
        true
      );

      this.assert(shareLink && shareLink.storageItemId === teamHandbook.id, 'Share link should target Team Handbook.pdf');
      this.assert(shareLink.accessLevel === accessLevel, 'Access level should be anyone_with_link');
      this.assert(shareLink.permission === permission, 'Permission should be can_view');
      this.assert(shareLink.allowDownload === allowDownload, 'Download should be disabled for public link');
      this.assert(shareLink.expiresAt, 'Share link should have an expiration timestamp');
      this.assert(typeof shareLink.url === 'string' && shareLink.url.length > 0, 'Share link URL should be generated');

      // Verify via file viewer context that this is the primary link
      const viewerContext = this.logic.getFileViewerContext(teamHandbook.id);
      this.assert(viewerContext && viewerContext.sharingSummary, 'File viewer context should include sharing summary');

      if (viewerContext.sharingSummary.primaryLink) {
        this.assert(
          viewerContext.sharingSummary.primaryLink.id === shareLink.id,
          'Primary link in viewer context should match configured share link'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Gather 3 most recently modified Q3 spreadsheets into Reports/Q3 Reports
  testTask5_GatherQ3Reports() {
    console.log('Testing: Task 5 - Gather Q3 spreadsheets into Q3 Reports');
    const testName = 'Task 5 - Move most recently modified Q3 spreadsheets into Reports/Q3 Reports';

    try {
      // Open Reports special folder
      const reportsFolder = this.logic.getSpecialFolder('reports');
      this.assert(reportsFolder && reportsFolder.itemType === 'folder', 'Reports folder should resolve');

      // Create Q3 Reports folder under Reports
      const createQ3Result = this.logic.createFolder(reportsFolder.id, 'Q3 Reports');
      this.assert(createQ3Result && createQ3Result.success === true, 'Q3 Reports folder should be created under Reports');
      const q3ReportsFolder = createQ3Result.folder;

      // Search globally for Q3 spreadsheets modified in last 60 days
      const now = new Date();
      const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
      const sixtyDaysAgoIso = new Date(now.getTime() - sixtyDaysMs).toISOString();

      const searchResults = this.logic.globalSearchItems(
        'Q3',
        { fileType: 'spreadsheet', modifiedFrom: sixtyDaysAgoIso },
        'modified_at',
        'desc'
      );

      this.assert(searchResults && Array.isArray(searchResults.items), 'Global search for Q3 spreadsheets should return items');
      this.assert(searchResults.items.length > 0, 'There should be at least one Q3 spreadsheet modified in last 60 days');

      const q3Items = searchResults.items.filter(item => item.name.indexOf('Q3') !== -1);
      const itemsToMoveCount = Math.min(3, q3Items.length);
      this.assert(itemsToMoveCount > 0, 'There should be at least one Q3 spreadsheet to move');

      const itemsToMove = q3Items.slice(0, itemsToMoveCount).map(item => item.id);

      // Move selected Q3 spreadsheets into Q3 Reports folder
      const moveResult = this.logic.moveItemsToFolder(itemsToMove, q3ReportsFolder.id);
      this.assert(moveResult && moveResult.success === true, 'Moving Q3 spreadsheets into Q3 Reports should succeed');

      // Verify that the selected items now appear in Q3 Reports
      const q3FolderContents = this.logic.getFolderContents(q3ReportsFolder.id, 'modified_at', 'desc', null);
      this.assert(q3FolderContents && Array.isArray(q3FolderContents.items), 'Should be able to list Q3 Reports folder contents');

      const movedIdsSet = new Set(itemsToMove);
      const actuallyInFolder = q3FolderContents.items.filter(item => movedIdsSet.has(item.id));
      this.assert(actuallyInFolder.length === itemsToMove.length, 'All selected Q3 spreadsheets should be present in Q3 Reports folder');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Restore Roadmap.docx to version from Jan 15, 2024 10:00 AM
  testTask6_RestoreRoadmapVersion() {
    console.log('Testing: Task 6 - Restore specific Roadmap.docx version');
    const testName = 'Task 6 - Restore Roadmap.docx to Jan 15, 2024 10:00 AM version';

    try {
      // Find Roadmap.docx via global search
      const searchResults = this.logic.globalSearchItems('Roadmap.docx', null, 'relevance', 'desc');
      this.assert(searchResults && Array.isArray(searchResults.items), 'Global search should return items');
      this.assert(searchResults.items.length > 0, 'Roadmap.docx should be found in search');

      const roadmapFile = searchResults.items[0];
      this.assert(roadmapFile && roadmapFile.itemType === 'file', 'Roadmap.docx search result should be a file');

      // Open file viewer context and verify it has version history
      const viewerContext = this.logic.getFileViewerContext(roadmapFile.id);
      this.assert(viewerContext && viewerContext.hasVersionHistory === true, 'Roadmap.docx should have version history enabled');

      // Get full version history
      const versionHistory = this.logic.getFileVersionHistory(roadmapFile.id);
      this.assert(Array.isArray(versionHistory) && versionHistory.length > 0, 'Version history list should not be empty');

      // Locate version with timestamp January 15, 2024, 10:00 AM
      const targetTimestampIso = new Date('2024-01-15T10:00:00Z').toISOString();
      const targetVersion = versionHistory.find(v => new Date(v.createdAt).toISOString() === targetTimestampIso);
      this.assert(targetVersion, 'Should find Roadmap version from January 15, 2024 10:00 AM');

      // Restore that version
      const restoreResult = this.logic.restoreFileVersion(targetVersion.id);
      this.assert(restoreResult && restoreResult.success === true, 'Restoring selected Roadmap version should succeed');
      this.assert(restoreResult.restoredVersion && restoreResult.restoredVersion.id === targetVersion.id, 'Restored version should match selected version');
      this.assert(restoreResult.item && restoreResult.item.id === roadmapFile.id, 'Restore result should reference Roadmap.docx item');

      // Verify file's current version reflects restored version
      const viewerContextAfter = this.logic.getFileViewerContext(roadmapFile.id);
      this.assert(viewerContextAfter && viewerContextAfter.versionSummary, 'Viewer context after restore should include version summary');

      if (viewerContextAfter.versionSummary.currentVersionId) {
        this.assert(
          viewerContextAfter.versionSummary.currentVersionId === targetVersion.id,
          'Roadmap currentVersionId should match restored version ID'
        );
      }

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Make 2 most recently opened PDFs and Client Pitch project folder available offline
  testTask7_OfflinePdfsAndClientPitch() {
    console.log('Testing: Task 7 - Offline 2 recent PDFs and Client Pitch folder');
    const testName = 'Task 7 - Mark 2 most recently opened PDFs and Client Pitch as available offline';

    try {
      // Recent view filtered to PDFs, sorted by last opened (newest first)
      const recentPdfResult = this.logic.getRecentItems({ fileType: 'pdf' }, 'last_opened_at', 'desc');
      this.assert(recentPdfResult && Array.isArray(recentPdfResult.items), 'Recent items for PDFs should be returned');
      this.assert(recentPdfResult.items.length >= 2, 'Should have at least two recent PDF items for this test');

      const topTwoPdfs = recentPdfResult.items.slice(0, 2);
      const pdfIds = topTwoPdfs.map(item => item.id);

      // Mark the two PDFs as available offline
      const offlinePdfResult = this.logic.setItemsOfflineStatus(pdfIds, true);
      this.assert(offlinePdfResult && offlinePdfResult.success === true, 'Setting PDFs as available offline should succeed');

      // Verify their offline status via Recent view again
      const recentPdfResultAfter = this.logic.getRecentItems({ fileType: 'pdf' }, 'last_opened_at', 'desc');
      const updatedPdfs = recentPdfResultAfter.items.filter(item => pdfIds.indexOf(item.id) !== -1);
      this.assert(updatedPdfs.length === pdfIds.length, 'Both selected PDFs should still appear in Recent after update');
      updatedPdfs.forEach(item => {
        this.assert(item.isAvailableOffline === true, 'Recent PDF ' + item.id + ' should be marked available offline');
      });

      // Navigate to Projects and locate Client Pitch folder
      const projectsFolder = this.logic.getSpecialFolder('projects');
      this.assert(projectsFolder && projectsFolder.itemType === 'folder', 'Projects folder should resolve');

      const projectsContents = this.logic.getFolderContents(projectsFolder.id, 'name', 'asc', null);
      this.assert(projectsContents && Array.isArray(projectsContents.items), 'Should list contents of Projects');

      let clientPitch = projectsContents.items.find(item => item.name === 'Client Pitch' && item.itemType === 'folder');
      if (!clientPitch) {
        const createResult = this.logic.createFolder(projectsFolder.id, 'Client Pitch');
        this.assert(createResult && createResult.success === true, 'Client Pitch folder should be creatable if missing');
        clientPitch = createResult.folder;
      }

      // Mark Client Pitch folder as available offline
      const offlineClientResult = this.logic.setItemsOfflineStatus([clientPitch.id], true);
      this.assert(offlineClientResult && offlineClientResult.success === true, 'Setting Client Pitch folder offline should succeed');

      // Verify via Projects contents
      const projectsContentsAfter = this.logic.getFolderContents(projectsFolder.id, 'name', 'asc', null);
      const refreshedClientPitch = projectsContentsAfter.items.find(item => item.id === clientPitch.id);
      this.assert(refreshedClientPitch && refreshedClientPitch.isAvailableOffline === true, 'Client Pitch folder should be marked available offline');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Update download permissions for newest shared file and label it 'Confidential'
  testTask8_UpdateDownloadPermissionAndLabel() {
    console.log('Testing: Task 8 - Update download permissions and apply Confidential label');
    const testName = 'Task 8 - Disable download for newest shared file and label Confidential';

    try {
      // Open 'Shared with me' list sorted by shared date newest first
      const sharedList = this.logic.getIncomingSharesList(null, 'shared_date', 'desc');
      this.assert(sharedList && Array.isArray(sharedList.items), 'Incoming shares list should be returned');
      this.assert(sharedList.items.length > 0, 'There should be at least one incoming share');

      // Find the most recently shared single file (not folder)
      let newestSharedFileEntry = null;
      for (let i = 0; i < sharedList.items.length; i++) {
        const entry = sharedList.items[i];
        const item = entry.item;
        if (item && item.itemType === 'file') {
          newestSharedFileEntry = entry;
          break;
        }
      }

      this.assert(newestSharedFileEntry && newestSharedFileEntry.item, 'Should find at least one shared file entry');
      const sharedFileItem = newestSharedFileEntry.item;

      // Open sharing settings for that file
      const sharingSettings = this.logic.getSharingSettingsForItem(sharedFileItem.id);
      this.assert(sharingSettings && sharingSettings.item && sharingSettings.item.id === sharedFileItem.id, 'Sharing settings should target the shared file');
      this.assert(Array.isArray(sharingSettings.collaborators), 'Sharing settings should include collaborators');

      // Locate a viewer collaborator to update
      const viewerCollaborator = sharingSettings.collaborators.find(c => c.role === 'viewer');
      this.assert(viewerCollaborator, 'There should be at least one viewer collaborator to update');

      // Disable downloading for that viewer
      const updatedCollaborators = this.logic.updateCollaboratorsForItem(sharedFileItem.id, [
        {
          collaboratorName: viewerCollaborator.collaboratorName,
          role: 'viewer',
          allowDownload: false
        }
      ]);

      this.assert(Array.isArray(updatedCollaborators), 'updateCollaboratorsForItem should return collaborators list');
      const updatedViewer = updatedCollaborators.find(c => c.collaboratorName === viewerCollaborator.collaboratorName);
      this.assert(updatedViewer && updatedViewer.allowDownload === false, 'Viewer collaborator should have downloading disabled');

      // Ensure Confidential label exists or create it
      const labels = this.logic.getLabelsList();
      this.assert(Array.isArray(labels), 'Labels list should be returned');

      let confidentialLabel = labels.find(label => label.name === 'Confidential');
      if (!confidentialLabel) {
        confidentialLabel = this.logic.createLabel('Confidential');
      }

      this.assert(confidentialLabel && confidentialLabel.id, 'Confidential label should exist or be created');

      // Apply Confidential label to the shared file
      const labelAssignment = this.logic.applyLabelToItem(sharedFileItem.id, confidentialLabel.id);
      this.assert(labelAssignment && labelAssignment.storageItemId === sharedFileItem.id, 'Label assignment should reference the shared file');
      this.assert(labelAssignment.labelId === confidentialLabel.id, 'Label assignment should reference Confidential label');

      // Verify via file viewer context that Confidential label is applied
      const viewerContext = this.logic.getFileViewerContext(sharedFileItem.id);
      this.assert(viewerContext && Array.isArray(viewerContext.labels), 'File viewer context should include labels list');

      const hasConfidential = viewerContext.labels.some(label => label.id === confidentialLabel.id || label.name === 'Confidential');
      this.assert(hasConfidential, 'Shared file should have Confidential label applied');

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
    console.log('✓ ' + testName);
  }

  recordFailure(testName, error) {
    this.results.push({ test: testName, success: false, error: error.message });
    console.log('✗ ' + testName + ': ' + error.message);
  }
}

// Export for Node.js ONLY (no AMD/UMD)
module.exports = TestRunner;
