class TestRunner {
  constructor(businessLogic) {
    this.logic = businessLogic || new BusinessLogic();
    this.results = [];
    this.clearStorage();
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
    // and store it under the correct storage keys

    const categories = [
      {
        id: 'account_billing',
        code: 'account_billing',
        name: 'Account & Billing',
        description: 'Manage your subscription, payments, invoices, and billing details.',
        order: 1
      },
      {
        id: 'account_profiles',
        code: 'account_profiles',
        name: 'Account & Profiles',
        description: 'Profiles, parental controls, viewing restrictions, and PIN settings.',
        order: 2
      },
      {
        id: 'watching_on_tv',
        code: 'watching_on_tv',
        name: 'Watching on TV',
        description: 'Set up and troubleshoot the app on smart TVs and TV devices.',
        order: 3
      }
    ];

    const devices = [
      {
        id: 'android_phone_tablet',
        code: 'android_phone_tablet',
        name: 'Android phone or tablet',
        description: 'Using the streaming app on Android phones and tablets, including downloads and subtitles.'
      },
      {
        id: 'smart_tv',
        code: 'smart_tv',
        name: 'Smart TV',
        description: 'Watching on built-in smart TV apps and streaming sticks.'
      },
      {
        id: 'computer',
        code: 'computer',
        name: 'Computer',
        description: 'Streaming in web browsers and desktop apps on Windows, macOS, and Linux.'
      }
    ];

    const paymentSettingsState = [
      {
        id: 'default_account',
        billing_country: 'canada',
        payment_method_type: 'card',
        card_last4: '4242',
        updated_at: '2026-02-20T10:15:00Z'
      },
      {
        id: 'family_plan_account',
        billing_country: 'united_states',
        payment_method_type: 'card',
        card_last4: '1881',
        updated_at: '2026-02-28T18:45:00Z'
      },
      {
        id: 'paypal_user',
        billing_country: 'united_kingdom',
        payment_method_type: 'paypal',
        card_last4: '',
        updated_at: '2026-01-30T09:05:00Z'
      }
    ];

    const plans = [
      {
        id: 'basic',
        code: 'basic',
        name: 'Basic',
        description: 'Basic plan with SD streaming on one device at a time.',
        max_stream_devices: 1,
        max_download_devices: 1,
        download_limits_description: 'You can download videos on 1 phone or tablet at a time with the Basic plan.'
      },
      {
        id: 'standard',
        code: 'standard',
        name: 'Standard',
        description: 'Standard plan with HD and some 4K titles, plus downloads on multiple devices.',
        max_stream_devices: 2,
        max_download_devices: 2,
        download_limits_description: 'You can download videos on up to 2 phones or tablets at a time on the Standard plan; download limits also apply per title and per account.'
      },
      {
        id: 'premium',
        code: 'premium',
        name: 'Premium',
        description: 'Premium plan with 4K Ultra HD and HDR on supported devices, plus maximum download flexibility.',
        max_stream_devices: 4,
        max_download_devices: 4,
        download_limits_description: 'You can download videos on up to 4 phones or tablets at a time on the Premium plan, with higher limits for total downloadable titles.'
      }
    ];

    const profileSettingsState = [
      {
        id: 'kids_profile',
        profile_name: 'Kids',
        maturity_level: 'little_kids',
        maturity_min_age: 0,
        pin_required_for_profile: false,
        profile_pin_set: false,
        profile_pin_hint: '',
        updated_at: '2026-02-15T12:00:00Z'
      },
      {
        id: 'tween_profile',
        profile_name: 'Alex (13)',
        maturity_level: 'teens',
        maturity_min_age: 13,
        pin_required_for_profile: true,
        profile_pin_set: true,
        profile_pin_hint: 'favorite sport',
        updated_at: '2026-02-27T19:30:00Z'
      },
      {
        id: 'teen_profile',
        profile_name: 'Jordan',
        maturity_level: 'teens',
        maturity_min_age: 13,
        pin_required_for_profile: false,
        profile_pin_set: false,
        profile_pin_hint: '',
        updated_at: '2026-02-10T08:45:00Z'
      }
    ];

    const topics = [
      {
        id: 'streaming_quality',
        code: 'streaming_quality',
        name: 'Streaming quality',
        description: '4K and HD requirements, buffering fixes, and improving video quality.'
      },
      {
        id: 'downloads',
        code: 'downloads',
        name: 'Downloads',
        description: 'How to download videos, manage storage, and understand download limits by plan.'
      },
      {
        id: 'subtitles_captions_audio',
        code: 'subtitles_captions_audio',
        name: 'Subtitles, captions & audio',
        description: 'Turn subtitles on or off, change subtitle or audio language, and troubleshoot caption issues.'
      }
    ];

    const deviceTopics = [
      {
        id: 'android_streaming_quality',
        device_code: 'android_phone_tablet',
        topic_code: 'streaming_quality',
        order: 1
      },
      {
        id: 'android_downloads',
        device_code: 'android_phone_tablet',
        topic_code: 'downloads',
        order: 2
      },
      {
        id: 'android_subtitles_captions_audio',
        device_code: 'android_phone_tablet',
        topic_code: 'subtitles_captions_audio',
        order: 3
      }
    ];

    const subcategories = [
      {
        id: 'payment_methods_charges',
        category_code: 'account_billing',
        name: 'Payment methods & charges',
        slug: 'payment-methods-charges',
        description: 'Update your card, billing country, and review recent charges.',
        order: 1
      },
      {
        id: 'canceling_your_subscription',
        category_code: 'account_billing',
        name: 'Canceling your subscription',
        slug: 'canceling-your-subscription',
        description: 'Learn how to cancel your membership from different devices.',
        order: 2
      },
      {
        id: 'parental_controls_and_pins',
        category_code: 'account_profiles',
        name: 'Parental controls & PINs',
        slug: 'parental-controls-and-pins',
        description: 'Set maturity ratings, manage profile-level controls, and create or change PINs.',
        order: 1
      }
    ];

    const articleRelations = [];
    const articleDeviceSupport = [];
    const articlePlanApplicabilities = [];

    const articleSections = [
      {
        id: 'sec_4k_overview',
        article_id: 'article_4k_streaming_requirements_internet_speed',
        title: '4K streaming requirements overview',
        type: 'overview',
        order: 1,
        step_texts: [],
        step_count: 0,
        anchor: '4k-streaming-requirements-overview'
      },
      {
        id: 'sec_4k_internet_speed',
        article_id: 'article_4k_streaming_requirements_internet_speed',
        title: 'Check your internet speed for 4K',
        type: 'instructions',
        order: 2,
        step_texts: [
          'On a computer or mobile browser, go to a trusted internet speed test site.',
          'Run the test on the same network your streaming device uses.',
          'Check that your download speed is at least 25 Mbps for consistent 4K streaming.',
          'If your speed is lower, try moving closer to your router or connecting with an Ethernet cable, then run the test again.'
        ],
        step_count: 4,
        anchor: 'check-your-internet-speed-for-4k'
      },
      {
        id: 'sec_smart_tv_overview',
        article_id: 'article_smart_tv_buffering_poor_video_quality',
        title: 'About buffering and poor video quality on smart TVs',
        type: 'overview',
        order: 1,
        step_texts: [],
        step_count: 0,
        anchor: 'smart-tv-buffering-overview'
      }
    ];

    const articleTopics = [
      {
        id: 'atopic_4k_streaming_quality_primary',
        article_id: 'article_4k_streaming_requirements_internet_speed',
        topic_code: 'streaming_quality',
        primary: true
      },
      {
        id: 'atopic_4k_getting_started_secondary',
        article_id: 'article_4k_streaming_requirements_internet_speed',
        topic_code: 'getting_started',
        primary: false
      },
      {
        id: 'atopic_smart_tv_buffering_streaming_issues_primary',
        article_id: 'article_smart_tv_buffering_poor_video_quality',
        topic_code: 'streaming_issues',
        primary: true
      }
    ];

    const articleFeedback = [
      {
        id: 'feedback_cancel_tv_helpful',
        article_id: 'article_cancel_on_tv_app',
        helpful: true,
        created_at: '2026-03-02T20:15:00Z'
      },
      {
        id: 'feedback_cancel_web_not_helpful',
        article_id: 'article_cancel_on_web_browser',
        helpful: false,
        created_at: '2026-02-25T14:30:00Z'
      },
      {
        id: 'feedback_android_subtitles_helpful',
        article_id: 'article_android_change_subtitles_audio_language',
        helpful: true,
        created_at: '2026-02-27T09:05:00Z'
      }
    ];

    const articles = [
      {
        id: 'article_4k_streaming_requirements_internet_speed',
        title: '4K streaming requirements and recommended internet speed',
        slug: '4k-streaming-requirements-internet-speed',
        summary: 'Learn what internet speed, hardware, and account settings you need to stream in 4K Ultra HD.',
        body: '## 4K streaming requirements overview\n\nTo watch in 4K Ultra HD, your device, internet connection, and account must all meet certain requirements. This article explains the minimum and recommended internet speeds, compatible devices, and how to confirm you\'re watching in 4K.\n\n### What you need for 4K\n- A plan that includes 4K or Ultra HD streaming\n- A 4K-capable TV or monitor connected with HDMI 2.0 or later\n- The latest version of the streaming app or a supported browser\n- A stable high-speed internet connection\n\n## Check your internet speed for 4K\n\nUse the steps in the **Check your internet speed for 4K** section of this article to test your connection. In general, we recommend:\n\n- **Minimum 25 Mbps** downstream per 4K stream\n- **Higher speeds** if multiple devices are streaming at the same time\n\nIf your speed test shows less than 25 Mbps, follow the troubleshooting tips in this article or in the **buffering on smart TVs** help article.',
        category_code: 'watching_on_tv',
        subcategory_id: 'watching_on_tv_streaming_issues',
        default_language: 'en',
        available_languages: ['en', 'es'],
        last_updated_at: '2026-02-27T10:00:00Z',
        created_at: '2024-11-15T09:00:00Z',
        default_support_topic: 'streaming_quality',
        default_error_code: '',
        applicable_maturity_levels: [],
        estimated_read_time_minutes: 5,
        rating_count: 0,
        average_rating: 0.0,
        is_device_specific: false,
        has_contact_support_button: false
      },
      {
        id: 'article_smart_tv_buffering_poor_video_quality',
        title: 'Buffering or poor video quality on smart TVs',
        slug: 'buffering-poor-video-quality-smart-tvs',
        summary: 'Fix buffering, freezing, and low video quality when streaming on your smart TV.',
        body: '## About buffering and poor video quality on smart TVs\n\nIf your video pauses to buffer, looks blurry, or switches between resolutions on your smart TV, it usually points to a network or device performance issue. This article walks you through the most common fixes.\n\nPossible causes include:\n- Slow or unstable internet connection\n- Wi-Fi interference or weak signal\n- Outdated TV firmware or app version\n- Temporary issues with our service\n\n## Troubleshooting steps for smart TV buffering\n\nFollow the numbered steps in the **Troubleshooting steps for smart TV buffering** section to try quick fixes like restarting your TV and modem.\n\nIf you\'ve tried all of the steps and still have problems, scroll to the bottom of this article and select **Contact support about this issue**. On the contact form, choose **Streaming quality** as the topic and describe when the buffering happens (for example, *"happens every evening around 8 PM"*).',
        category_code: 'watching_on_tv',
        subcategory_id: 'watching_on_tv_streaming_issues',
        default_language: 'en',
        available_languages: ['en', 'es'],
        last_updated_at: '2026-02-20T16:30:00Z',
        created_at: '2024-10-05T12:15:00Z',
        default_support_topic: 'streaming_quality',
        default_error_code: '',
        applicable_maturity_levels: [],
        estimated_read_time_minutes: 6,
        rating_count: 0,
        average_rating: 0.0,
        is_device_specific: false,
        has_contact_support_button: true
      },
      {
        id: 'article_cancel_on_web_browser',
        title: 'Cancel your subscription on a web browser',
        slug: 'cancel-subscription-web-browser',
        summary: 'Learn how to cancel your streaming subscription using a web browser on your computer or mobile device.',
        body: '## Before you cancel on a web browser\n\nYou can cancel your subscription at any time from your Account page in a web browser. After canceling, you can keep watching until the end of your current billing period.\n\nWell save your profiles, viewing history, and preferences for a limited time in case you decide to come back.\n\n## Cancel using a web browser\n\nFollow the numbered steps in the **Cancel using a web browser** section of this article:\n\n1. Go to the streaming service website in a web browser.\n2. Sign in with the account you want to cancel.\n3. Open your **Account** page.\n4. Under **Membership & Billing**, choose **Cancel membership**.\n5. Review the details and confirm your cancellation.\n\nIf you signed up through a third party (such as an app store or TV provider), you may see a message telling you to cancel directly with that provider instead.',
        category_code: 'account_billing',
        subcategory_id: 'canceling_your_subscription',
        default_language: 'en',
        available_languages: ['en', 'es'],
        last_updated_at: '2026-02-18T09:45:00Z',
        created_at: '2024-08-22T14:10:00Z',
        default_support_topic: 'account_management',
        default_error_code: '',
        applicable_maturity_levels: [],
        estimated_read_time_minutes: 4,
        rating_count: 1,
        average_rating: 0.0,
        is_device_specific: false,
        has_contact_support_button: false
      }
    ];

    const articleCtas = [
      {
        id: 'cta_smart_tv_contact_support_issue',
        article_id: 'article_smart_tv_buffering_poor_video_quality',
        label: 'Contact support about this issue',
        target_type: 'contact_support',
        target_article_id: '',
        target_url: 'contact_support.html?fromArticleId=article_smart_tv_buffering_poor_video_quality',
        open_in_new_tab: false
      },
      {
        id: 'cta_update_card_payment_settings',
        article_id: 'article_update_card_for_subscription',
        label: 'Go to payment settings',
        target_type: 'payment_settings',
        target_article_id: '',
        target_url: 'payment_settings.html',
        open_in_new_tab: true
      },
      {
        id: 'cta_parental_profile_settings_new_tab',
        article_id: 'article_parental_controls_by_maturity_rating',
        label: 'Open profile settings in a new tab',
        target_type: 'profile_settings',
        target_article_id: '',
        target_url: 'profile_settings.html',
        open_in_new_tab: true
      }
    ];

    const contactOptions = [
      {
        id: 'contact_vc201_chat',
        article_id: 'article_error_vc_201_computers',
        label: 'Chat',
        type: 'chat',
        estimated_wait_minutes: 3,
        is_default: true,
        available: true
      },
      {
        id: 'contact_vc201_phone',
        article_id: 'article_error_vc_201_computers',
        label: 'Phone',
        type: 'phone',
        estimated_wait_minutes: 10,
        is_default: false,
        available: true
      },
      {
        id: 'contact_vc201_email',
        article_id: 'article_error_vc_201_computers',
        label: 'Email',
        type: 'email',
        estimated_wait_minutes: 60,
        is_default: false,
        available: true
      }
    ];

    // Persist to localStorage using storage keys from Storage Key Mapping
    localStorage.setItem('categories', JSON.stringify(categories));
    localStorage.setItem('devices', JSON.stringify(devices));
    localStorage.setItem('payment_settings_state', JSON.stringify(paymentSettingsState));
    localStorage.setItem('plans', JSON.stringify(plans));
    localStorage.setItem('profile_settings_state', JSON.stringify(profileSettingsState));
    localStorage.setItem('topics', JSON.stringify(topics));
    localStorage.setItem('device_topics', JSON.stringify(deviceTopics));
    localStorage.setItem('subcategories', JSON.stringify(subcategories));
    localStorage.setItem('article_relations', JSON.stringify(articleRelations));
    localStorage.setItem('article_device_support', JSON.stringify(articleDeviceSupport));
    localStorage.setItem('article_plan_applicabilities', JSON.stringify(articlePlanApplicabilities));
    localStorage.setItem('article_sections', JSON.stringify(articleSections));
    localStorage.setItem('article_topics', JSON.stringify(articleTopics));
    localStorage.setItem('article_feedback', JSON.stringify(articleFeedback));
    localStorage.setItem('articles', JSON.stringify(articles));
    localStorage.setItem('article_ctas', JSON.stringify(articleCtas));
    localStorage.setItem('contact_options', JSON.stringify(contactOptions));
  }

  // Run all tests
  runAllTests() {
    console.log('Starting flow tests...');

    this.testTask1_SaveMostRecent4KStreamingRequirementsArticle();
    this.testTask2_SubmitSupportRequestForSmartTvBuffering();
    this.testTask3_ChooseSimplerCancellationMethodAndMarkHelpful();
    this.testTask4_SaveHighRatedAndroidSubtitlesArticleInSpanish();
    this.testTask5_ParentalControlsForTeenAndOpenPinArticle();
    this.testTask6_NavigateToPaymentSettingsAndSetBillingCountry();
    this.testTask7_SaveDownloadLimitArticlesForStandardPlan();
    this.testTask8_StartSupportChatForErrorVC201WithFastestOption();

    return this.results;
  }

  // Task 1: Save the most recently updated 4K streaming requirements article
  testTask1_SaveMostRecent4KStreamingRequirementsArticle() {
    const testName = 'Task 1: Save most recently updated 4K streaming requirements article';
    try {
      const homeData = this.logic.getHelpCenterHomeData();
      this.assert(homeData && Array.isArray(homeData.categories) && homeData.categories.length > 0,
        'Help Center home should load categories');

      const filterOptions = this.logic.getHelpSearchFilterOptions();
      let streamingTopicCode = 'streaming_quality';
      if (filterOptions && Array.isArray(filterOptions.topics)) {
        const t = filterOptions.topics.find(x => (x.topicCode || '').toLowerCase() === 'streaming_quality');
        if (t) streamingTopicCode = t.topicCode;
      }

      const searchResult = this.logic.searchHelpArticles(
        '4K streaming requirements',
        { topicCodes: [streamingTopicCode] },
        'last_updated_newest',
        1,
        20
      );
      this.assert(searchResult && Array.isArray(searchResult.results), 'Search results should be returned');
      this.assert(searchResult.results.length > 0, 'Should return at least one 4K-related article');

      const fourKArticleSummary = searchResult.results.find(r => {
        const title = (r.title || '').toLowerCase();
        return title.includes('4k') && title.includes('internet');
      }) || searchResult.results[0];

      this.assert(fourKArticleSummary && fourKArticleSummary.articleId,
        'Should find a 4K streaming requirements article');
      const articleId = fourKArticleSummary.articleId;

      const detailBeforeSave = this.logic.getArticleDetail(articleId, 'en');
      this.assert(detailBeforeSave && detailBeforeSave.articleId === articleId,
        'Should load article detail before saving');

      const saveResult = this.logic.saveArticle(articleId);
      this.assert(saveResult && saveResult.success === true, 'Saving article should succeed');
      this.assert(typeof saveResult.savedAt === 'string', 'Saved timestamp should be provided');

      const detailAfterSave = this.logic.getArticleDetail(articleId, 'en');
      this.assert(detailAfterSave.isSaved === true, 'Article should be marked as saved');

      const savedList = this.logic.getSavedArticlesList('date_saved_newest');
      this.assert(savedList && Array.isArray(savedList.articles), 'Saved articles list should load');
      const savedEntry = savedList.articles.find(a => a.articleId === articleId);
      this.assert(!!savedEntry, 'Saved articles list should contain the 4K article');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 2: Submit a support request about smart TV buffering from an article
  testTask2_SubmitSupportRequestForSmartTvBuffering() {
    const testName = 'Task 2: Submit support request about smart TV buffering';
    try {
      // Find the smart TV buffering article via search
      const searchResult = this.logic.searchHelpArticles(
        'smart TV buffering',
        undefined,
        'relevance',
        1,
        20
      );
      this.assert(searchResult && Array.isArray(searchResult.results), 'Search results should be returned');
      this.assert(searchResult.results.length > 0, 'Should return buffering-related articles');

      const bufferingSummary = searchResult.results.find(r => {
        const title = (r.title || '').toLowerCase();
        return title.includes('smart tv') && title.includes('buffering');
      }) || searchResult.results[0];

      this.assert(bufferingSummary && bufferingSummary.articleId,
        'Should find buffering or poor video quality on smart TVs article');
      const articleId = bufferingSummary.articleId;

      const articleDetail = this.logic.getArticleDetail(articleId, 'en');
      this.assert(articleDetail && articleDetail.articleId === articleId,
        'Should load smart TV buffering article detail');

      // Open contact support configuration from this article (simulating CTA click)
      const contactConfig = this.logic.getContactSupportConfigForArticle(articleId);
      this.assert(contactConfig && contactConfig.sourceArticleId === articleId,
        'Contact config should be tied to the buffering article');

      const topic = contactConfig.defaultTopic || (contactConfig.topics && contactConfig.topics[0] && contactConfig.topics[0].topic);
      this.assert(!!topic, 'A default topic should be available for support request');

      // Choose a contact method, preferring web_form if available
      let contactMethodType = 'web_form';
      if (Array.isArray(contactConfig.contactMethods) && contactConfig.contactMethods.length > 0) {
        const webFormMethod = contactConfig.contactMethods.find(m => m.type === 'web_form' && m.available);
        const defaultMethod = contactConfig.contactMethods.find(m => m.isDefault && m.available);
        const firstAvailable = contactConfig.contactMethods.find(m => m.available) || contactConfig.contactMethods[0];
        contactMethodType = (webFormMethod && webFormMethod.type) || (defaultMethod && defaultMethod.type) || firstAvailable.type;
      }

      const subject = 'Frequent buffering on my smart TV';
      const description = 'My smart TV keeps buffering and it happens every evening around 8 PM.';

      const submitResult = this.logic.submitSupportRequest(
        topic,
        subject,
        description,
        contactMethodType,
        contactConfig.defaultErrorCode || '',
        contactConfig.sourcePageType || 'article',
        contactConfig.sourceArticleId || articleId
      );

      this.assert(submitResult && submitResult.success === true, 'Support request submission should succeed');
      this.assert(!!submitResult.requestId, 'Support request should return a requestId');
      this.assert(!!submitResult.status, 'Support request should have a status');

      // Verify persisted SupportRequest using actual returned requestId
      const supportRequests = JSON.parse(localStorage.getItem('support_requests') || '[]');
      const createdRequest = supportRequests.find(r => r.id === submitResult.requestId);
      this.assert(!!createdRequest, 'Support request should be stored');
      this.assert(createdRequest.topic === topic, 'Stored support request topic should match selected topic');
      this.assert((createdRequest.description || '').includes('8 PM'),
        'Stored support request description should mention "8 PM"');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Helper to count steps from article detail, using sections when available, otherwise parsing bodyHtml
  countInstructionSteps(articleDetail, keywordFragment) {
    if (!articleDetail) return 0;
    const keyword = (keywordFragment || '').toLowerCase();

    if (Array.isArray(articleDetail.sections)) {
      const section = articleDetail.sections.find(s => {
        const title = (s.title || '').toLowerCase();
        return title.includes(keyword) && (s.type === 'instructions' || s.type === 'payment_steps' || s.type === 'profile_controls');
      });
      if (section && typeof section.stepCount === 'number' && section.stepCount > 0) {
        return section.stepCount;
      }
      if (section && Array.isArray(section.stepTexts) && section.stepTexts.length > 0) {
        return section.stepTexts.length;
      }
    }

    if (typeof articleDetail.bodyHtml === 'string') {
      const lines = articleDetail.bodyHtml.split('\n');
      let count = 0;
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^\d+\./.test(trimmed)) {
          count += 1;
        }
      }
      return count;
    }

    return 0;
  }

  // Task 3: Choose simpler cancellation method and mark that article as helpful
  testTask3_ChooseSimplerCancellationMethodAndMarkHelpful() {
    const testName = 'Task 3: Choose simpler cancellation method and mark helpful';
    try {
      const categoryLanding = this.logic.getCategoryLandingData('account_billing');
      this.assert(categoryLanding && categoryLanding.category && categoryLanding.category.categoryCode === 'account_billing',
        'Account & Billing category should load');

      const cancelSubcat = (categoryLanding.subcategories || []).find(sc =>
        (sc.name || '').toLowerCase().includes('canceling your subscription') ||
        (sc.slug || '').toLowerCase().includes('canceling-your-subscription')
      ) || (categoryLanding.subcategories || []).find(sc => (sc.name || '').toLowerCase().includes('cancel'));

      this.assert(cancelSubcat && cancelSubcat.subcategoryId,
        'Canceling your subscription subcategory should exist');
      const subcategoryId = cancelSubcat.subcategoryId;

      const listResult = this.logic.getSubcategoryArticleList(
        subcategoryId,
        undefined,
        undefined,
        undefined,
        'last_updated_newest',
        1,
        20
      );
      this.assert(listResult && Array.isArray(listResult.articles), 'Cancellation articles should load');
      this.assert(listResult.articles.length > 0, 'There should be at least one cancellation article');

      const webArticleSummary = listResult.articles.find(a => (a.title || '').toLowerCase().includes('web browser'));
      const tvArticleSummary = listResult.articles.find(a => (a.title || '').toLowerCase().includes('tv app') || (a.title || '').toLowerCase().includes('your tv'));

      this.assert(webArticleSummary || tvArticleSummary,
        'Should have at least one cancellation article for comparison');

      let webSteps = Number.MAX_SAFE_INTEGER;
      let tvSteps = Number.MAX_SAFE_INTEGER;
      let webArticleId = null;
      let tvArticleId = null;

      if (webArticleSummary && webArticleSummary.articleId) {
        webArticleId = webArticleSummary.articleId;
        const webDetail = this.logic.getArticleDetail(webArticleId, 'en');
        this.assert(webDetail && webDetail.articleId === webArticleId,
          'Web browser cancellation article detail should load');
        webSteps = this.countInstructionSteps(webDetail, 'cancel using a web browser') ||
          this.countInstructionSteps(webDetail, 'cancel using');
      }

      if (tvArticleSummary && tvArticleSummary.articleId) {
        tvArticleId = tvArticleSummary.articleId;
        const tvDetail = this.logic.getArticleDetail(tvArticleId, 'en');
        this.assert(tvDetail && tvDetail.articleId === tvArticleId,
          'TV app cancellation article detail should load');
        tvSteps = this.countInstructionSteps(tvDetail, 'cancel using your tv') ||
          this.countInstructionSteps(tvDetail, 'cancel using');
      }

      // Determine which article has fewer steps (simpler method)
      let simplerArticleId = webArticleId || tvArticleId;
      if (webArticleId && tvArticleId) {
        simplerArticleId = tvSteps < webSteps ? tvArticleId : webArticleId;
      }

      this.assert(!!simplerArticleId, 'A simpler cancellation article should be identified');

      const feedbackResult = this.logic.submitArticleFeedback(simplerArticleId, true);
      this.assert(feedbackResult && feedbackResult.success === true, 'Submitting helpful feedback should succeed');

      // Verify feedback persisted
      const feedbackList = JSON.parse(localStorage.getItem('article_feedback') || '[]');
      const newFeedback = feedbackList.find(fb => fb.article_id === simplerArticleId && fb.helpful === true);
      this.assert(!!newFeedback, 'Helpful feedback record should be stored for simpler article');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 4: Save a high-rated Android subtitles article and view it in Spanish
  testTask4_SaveHighRatedAndroidSubtitlesArticleInSpanish() {
    const testName = 'Task 4: Save high-rated Android subtitles article and view in Spanish';
    try {
      const devicesOverview = this.logic.getDevicesOverview();
      this.assert(devicesOverview && Array.isArray(devicesOverview.devices) && devicesOverview.devices.length > 0,
        'Devices overview should load');

      const androidDevice = devicesOverview.devices.find(d =>
        (d.deviceCode || '').toLowerCase() === 'android_phone_tablet' ||
        (d.deviceName || '').toLowerCase().includes('android')
      ) || devicesOverview.devices[0];

      this.assert(androidDevice && androidDevice.deviceCode,
        'Android phone or tablet device entry should be available');
      const deviceCode = androidDevice.deviceCode;

      const deviceTopicsView = this.logic.getDeviceHelpTopics(deviceCode);
      this.assert(deviceTopicsView && Array.isArray(deviceTopicsView.topics) && deviceTopicsView.topics.length > 0,
        'Android device help topics should load');

      const subtitlesTopic = deviceTopicsView.topics.find(t =>
        (t.topicCode || '').toLowerCase() === 'subtitles_captions_audio' ||
        (t.topicName || '').toLowerCase().includes('subtitles')
      ) || deviceTopicsView.topics[0];

      this.assert(subtitlesTopic && subtitlesTopic.topicCode,
        'Subtitles, captions & audio topic should be present for Android');
      const topicCode = subtitlesTopic.topicCode;

      // Filter for high-rated subtitles articles (>= 4.5 stars) if available
      const listResult = this.logic.getDeviceTopicArticleList(
        deviceCode,
        topicCode,
        4.5,
        'highest_rated',
        1,
        20
      );

      this.assert(listResult && Array.isArray(listResult.articles), 'Android subtitles articles should load');
      this.assert(listResult.articles.length > 0, 'At least one subtitles article should be returned');

      const subtitlesSummary = listResult.articles.find(a =>
        (a.title || '').toLowerCase().includes('change subtitles or audio language')
      ) || listResult.articles[0];

      this.assert(subtitlesSummary && subtitlesSummary.articleId,
        'Should find an Android subtitles/article language article');
      const articleId = subtitlesSummary.articleId;

      const detailEn = this.logic.getArticleDetail(articleId, 'en');
      this.assert(detailEn && detailEn.articleId === articleId,
        'Should load subtitles article detail in English');

      const saveResult = this.logic.saveArticle(articleId);
      this.assert(saveResult && saveResult.success === true, 'Saving subtitles article should succeed');

      const detailAfterSave = this.logic.getArticleDetail(articleId, 'en');
      this.assert(detailAfterSave.isSaved === true, 'Subtitles article should be marked as saved');

      const detailEs = this.logic.getArticleDetail(articleId, 'es');
      this.assert(detailEs && detailEs.articleId === articleId,
        'Spanish version of subtitles article should load');
      this.assert(detailEs.language === 'es', 'Article language should be Spanish (es)');
      this.assert(Array.isArray(detailEs.availableLanguages) && detailEs.availableLanguages.indexOf('es') !== -1,
        'Spanish should be listed as an available language');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 5: Find parental control guidance for a 13-year-old and open related PIN article
  testTask5_ParentalControlsForTeenAndOpenPinArticle() {
    const testName = 'Task 5: Parental controls for teen and open PIN article';
    try {
      const categoryLanding = this.logic.getCategoryLandingData('account_profiles');
      this.assert(categoryLanding && categoryLanding.category && categoryLanding.category.categoryCode === 'account_profiles',
        'Account & Profiles category should load');

      const parentalSubcat = (categoryLanding.subcategories || []).find(sc =>
        (sc.name || '').toLowerCase().includes('parental controls & pins') ||
        (sc.slug || '').toLowerCase().includes('parental-controls-and-pins')
      ) || (categoryLanding.subcategories || []).find(sc => (sc.name || '').toLowerCase().includes('parental'));

      this.assert(parentalSubcat && parentalSubcat.subcategoryId,
        'Parental controls & PINs subcategory should exist');
      const subcategoryId = parentalSubcat.subcategoryId;

      // Filter for teen/13+ maturity
      const listResult = this.logic.getSubcategoryArticleList(
        subcategoryId,
        undefined,
        undefined,
        'teens',
        'last_updated_newest',
        1,
        20
      );
      this.assert(listResult && Array.isArray(listResult.articles), 'Parental controls articles should load');
      this.assert(listResult.articles.length > 0, 'There should be at least one teen-focused parental controls article');

      const parentalArticleSummary = listResult.articles.find(a =>
        (a.title || '').toLowerCase().includes('set parental controls by maturity rating') ||
        (a.title || '').toLowerCase().includes('maturity rating')
      ) || listResult.articles[0];

      this.assert(parentalArticleSummary && parentalArticleSummary.articleId,
        'Should find parental controls by maturity rating article');
      const articleId = parentalArticleSummary.articleId;

      const parentalDetail = this.logic.getArticleDetail(articleId, 'en');
      this.assert(parentalDetail && parentalDetail.articleId === articleId,
        'Parental controls article detail should load');

      // Simulate clicking "Open profile settings in a new tab" CTA
      const profileSettingsCta = (parentalDetail.ctas || []).find(c => c.targetType === 'profile_settings');
      this.assert(profileSettingsCta, 'Parental controls article should have a profile settings CTA');

      const profileSettingsView = this.logic.getProfileSettingsView();
      this.assert(profileSettingsView && Array.isArray(profileSettingsView.profiles),
        'Profile settings view should load');

      // Ensure there is at least one teen profile for 13+
      const teenProfile = profileSettingsView.profiles.find(p => p.maturityLevel === 'teens');
      this.assert(!!teenProfile, 'There should be a profile with teen maturity level');

      // Save the parental controls article
      const saveResult = this.logic.saveArticle(articleId);
      this.assert(saveResult && saveResult.success === true,
        'Saving parental controls article should succeed');

      // Open related PIN article from relatedArticles section
      const refreshedDetail = this.logic.getArticleDetail(articleId, 'en');
      const relatedPinArticle = (refreshedDetail.relatedArticles || []).find(ra =>
        (ra.title || '').toLowerCase().includes('set a pin to restrict changes') ||
        (ra.title || '').toLowerCase().includes('pin')
      );

      this.assert(!!relatedPinArticle && relatedPinArticle.articleId,
        'There should be a related article about setting a PIN');

      const pinArticleDetail = this.logic.getArticleDetail(relatedPinArticle.articleId, 'en');
      this.assert(pinArticleDetail && pinArticleDetail.articleId === relatedPinArticle.articleId,
        'PIN-related article detail should load');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 6: Use Help Center instructions to navigate to payment settings and select a billing country
  testTask6_NavigateToPaymentSettingsAndSetBillingCountry() {
    const testName = 'Task 6: Navigate to payment settings and select billing country';
    try {
      const categoryLanding = this.logic.getCategoryLandingData('account_billing');
      this.assert(categoryLanding && categoryLanding.category && categoryLanding.category.categoryCode === 'account_billing',
        'Account & Billing category should load');

      const paymentSubcat = (categoryLanding.subcategories || []).find(sc =>
        (sc.name || '').toLowerCase().includes('payment methods & charges') ||
        (sc.slug || '').toLowerCase().includes('payment-methods-charges')
      ) || (categoryLanding.subcategories || []).find(sc => (sc.name || '').toLowerCase().includes('payment'));

      this.assert(paymentSubcat && paymentSubcat.subcategoryId,
        'Payment methods & charges subcategory should exist');
      const subcategoryId = paymentSubcat.subcategoryId;

      // Internal search within the subcategory for "update card"
      const listResult = this.logic.getSubcategoryArticleList(
        subcategoryId,
        'update card',
        undefined,
        undefined,
        'last_updated_newest',
        1,
        20
      );
      this.assert(listResult && Array.isArray(listResult.articles), 'Payment method articles should load');
      this.assert(listResult.articles.length > 0, 'At least one payment/update card article should be found');

      const updateCardSummary = listResult.articles.find(a => {
        const title = (a.title || '').toLowerCase();
        return title.includes('update') && title.includes('card');
      }) || listResult.articles[0];

      this.assert(updateCardSummary && updateCardSummary.articleId,
        'Should find the article about updating the card used for subscription');
      const articleId = updateCardSummary.articleId;

      const updateCardDetail = this.logic.getArticleDetail(articleId, 'en');
      this.assert(updateCardDetail && updateCardDetail.articleId === articleId,
        'Update card article detail should load');

      // Use CTA "Go to payment settings"
      const paymentCta = (updateCardDetail.ctas || []).find(c => c.targetType === 'payment_settings');
      this.assert(paymentCta, 'Update card article should have a payment settings CTA');

      const paymentViewBefore = this.logic.getPaymentSettingsView();
      this.assert(paymentViewBefore && paymentViewBefore.currentSettings,
        'Payment settings view should load before change');

      // Find United States option from billingCountryOptions
      const usOption = (paymentViewBefore.billingCountryOptions || []).find(opt =>
        (opt.value || '').toLowerCase() === 'united_states' ||
        (opt.label || '').toLowerCase().includes('united states')
      );
      this.assert(!!usOption, 'United States should be an available billing country option');

      const setResult = this.logic.setBillingCountry(usOption.value || 'united_states');
      this.assert(setResult && setResult.success === true, 'Setting billing country should succeed');
      this.assert((setResult.billingCountry || '').toLowerCase() === 'united_states',
        'Billing country should be set to United States');

      const paymentViewAfter = this.logic.getPaymentSettingsView();
      this.assert(paymentViewAfter.currentSettings &&
        (paymentViewAfter.currentSettings.billingCountry || '').toLowerCase() === 'united_states',
        'Current billing country in view should be United States');

      // Simulate navigating back to Help Center home
      const homeData = this.logic.getHelpCenterHomeData();
      this.assert(homeData && Array.isArray(homeData.categories) && homeData.categories.length > 0,
        'Help Center home should be accessible after updating payment settings');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 7: Save two articles about download limits on the Standard plan
  testTask7_SaveDownloadLimitArticlesForStandardPlan() {
    const testName = 'Task 7: Save two download-limit articles for Standard plan';
    try {
      // Get plan filter options to find Standard plan code
      const filterOptions = this.logic.getHelpSearchFilterOptions();
      this.assert(filterOptions && Array.isArray(filterOptions.plans), 'Search filter plan options should load');

      const standardPlan = filterOptions.plans.find(p => (p.planName || '').toLowerCase() === 'standard') ||
        filterOptions.plans.find(p => (p.planCode || '').toLowerCase() === 'standard') ||
        filterOptions.plans[0];

      this.assert(standardPlan && (standardPlan.planCode || standardPlan.planName),
        'Standard plan should be available in plan filter options');

      const standardPlanCode = (standardPlan.planCode || 'standard');

      const searchResult = this.logic.searchHelpArticles(
        'download limits Standard plan',
        { topicCodes: ['downloads'], planCodes: [standardPlanCode] },
        'relevance',
        1,
        20
      );
      this.assert(searchResult && Array.isArray(searchResult.results), 'Download limit search results should load');
      this.assert(searchResult.results.length > 0, 'At least one download-limit article should be returned');

      const mainDownloadArticleSummary = searchResult.results.find(r => {
        const title = (r.title || '').toLowerCase();
        return title.includes('how many devices can download') || title.includes('download videos on my plan');
      }) || searchResult.results[0];

      this.assert(mainDownloadArticleSummary && mainDownloadArticleSummary.articleId,
        'Should find main article about how many devices can download on the plan');
      const mainArticleId = mainDownloadArticleSummary.articleId;

      const mainDetail = this.logic.getArticleDetail(mainArticleId, 'en');
      this.assert(mainDetail && mainDetail.articleId === mainArticleId,
        'Main download-limit article detail should load');

      // Find related article about download limits for other plans
      const relatedOtherPlans = (mainDetail.relatedArticles || []).find(ra =>
        (ra.title || '').toLowerCase().includes('download limits for other plans') ||
        (ra.title || '').toLowerCase().includes('other plans')
      );
      this.assert(!!relatedOtherPlans && relatedOtherPlans.articleId,
        'There should be a related article about download limits for other plans');

      const otherPlansArticleId = relatedOtherPlans.articleId;

      // Save the "other plans" article first
      const otherDetail = this.logic.getArticleDetail(otherPlansArticleId, 'en');
      this.assert(otherDetail && otherDetail.articleId === otherPlansArticleId,
        'Other-plans download-limit article detail should load');

      const saveOtherResult = this.logic.saveArticle(otherPlansArticleId);
      this.assert(saveOtherResult && saveOtherResult.success === true,
        'Saving other-plans download limit article should succeed');

      // Then save the main plan article
      const saveMainResult = this.logic.saveArticle(mainArticleId);
      this.assert(saveMainResult && saveMainResult.success === true,
        'Saving main download limit article should succeed');

      // Verify both articles appear in saved list
      const savedList = this.logic.getSavedArticlesList('date_saved_newest');
      this.assert(savedList && Array.isArray(savedList.articles), 'Saved articles list should load');

      const hasMain = savedList.articles.some(a => a.articleId === mainArticleId);
      const hasOther = savedList.articles.some(a => a.articleId === otherPlansArticleId);
      this.assert(hasMain && hasOther, 'Both download-limit articles should be saved');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Task 8: Start a support chat for error code VC_201 with the fastest available option
  testTask8_StartSupportChatForErrorVC201WithFastestOption() {
    const testName = 'Task 8: Start support chat for VC_201 with fastest option';
    try {
      // Search for VC_201 error article for computers
      const searchResult = this.logic.searchHelpArticles(
        'VC_201 error',
        { deviceCodes: ['computer'] },
        'relevance',
        1,
        20
      );
      this.assert(searchResult && Array.isArray(searchResult.results), 'VC_201 search results should load');
      this.assert(searchResult.results.length > 0, 'At least one VC_201 article should be returned');

      const vcArticleSummary = searchResult.results.find(r => {
        const title = (r.title || '').toLowerCase();
        return title.includes('vc_201') && title.includes('computer');
      }) || searchResult.results[0];

      this.assert(vcArticleSummary && vcArticleSummary.articleId,
        'Should find an article about fixing error VC_201 on computers');
      const articleId = vcArticleSummary.articleId;

      const articleDetail = this.logic.getArticleDetail(articleId, 'en');
      this.assert(articleDetail && articleDetail.articleId === articleId,
        'VC_201 article detail should load');
      this.assert(Array.isArray(articleDetail.contactOptions) && articleDetail.contactOptions.length > 0,
        'VC_201 article should expose contact options');

      // Choose contact option: chat if its wait time < 5 minutes; otherwise fastest available
      const availableOptions = articleDetail.contactOptions.filter(o => o.available !== false);
      this.assert(availableOptions.length > 0, 'There should be at least one available contact option');

      const chatOption = availableOptions.find(o => o.type === 'chat');
      let chosenOption = chatOption;
      if (!chosenOption || typeof chosenOption.estimatedWaitMinutes !== 'number' || chosenOption.estimatedWaitMinutes >= 5) {
        chosenOption = availableOptions.reduce((best, current) => {
          if (!best) return current;
          const bestWait = typeof best.estimatedWaitMinutes === 'number' ? best.estimatedWaitMinutes : Number.MAX_SAFE_INTEGER;
          const currentWait = typeof current.estimatedWaitMinutes === 'number' ? current.estimatedWaitMinutes : Number.MAX_SAFE_INTEGER;
          return currentWait < bestWait ? current : best;
        }, null);
      }

      this.assert(chosenOption && chosenOption.contactOptionId,
        'A fastest contact option should be chosen');

      // Get contact config for the chosen contact option
      const contactConfig = this.logic.getContactSupportConfigForArticle(articleId, chosenOption.contactOptionId);
      this.assert(contactConfig && contactConfig.sourceArticleId === articleId,
        'Contact config should be tied to VC_201 article');

      const topic = contactConfig.defaultTopic || (contactConfig.topics && contactConfig.topics[0] && contactConfig.topics[0].topic) || 'technical_issue';
      const errorCodeToUse = contactConfig.defaultErrorCode || 'VC_201';

      const chatResult = this.logic.startSupportChat(
        topic,
        'Issue with error code VC_201',
        'I am getting error VC_201 when streaming on my computer.',
        errorCodeToUse,
        contactConfig.sourcePageType || 'article',
        contactConfig.sourceArticleId || articleId
      );

      this.assert(chatResult && chatResult.success === true, 'Support chat should start successfully');
      this.assert(!!chatResult.requestId, 'Chat start should return a requestId');
      this.assert(!!chatResult.chatSessionId, 'Chat start should return a chatSessionId');

      // Verify SupportRequest persisted with correct error code and contact method
      const supportRequests = JSON.parse(localStorage.getItem('support_requests') || '[]');
      const createdRequest = supportRequests.find(r => r.id === chatResult.requestId);
      this.assert(!!createdRequest, 'Support chat request should be stored');
      this.assert((createdRequest.error_code || createdRequest.errorCode || '').toUpperCase() === 'VC_201',
        'Stored support request should contain error code VC_201');
      this.assert(createdRequest.contact_method === 'chat' || createdRequest.contactMethod === 'chat',
        'Stored support request contact method should be chat');

      this.recordSuccess(testName);
    } catch (error) {
      this.recordFailure(testName, error);
    }
  }

  // Assertion and result helpers
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
