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

  // ---------------------- STORAGE HELPERS ----------------------

  _initStorage() {
    const keys = [
      'studios',
      'studio_bookings',
      'voice_artists',
      'voice_artist_packages',
      'services',
      'service_packages',
      'service_bundles',
      'bundle_items',
      'demo_tracks',
      'playlists',
      'playlist_items',
      'instant_quotes',
      'project_inquiries',
      'blog_posts',
      'newsletter_subscriptions',
      'client_profiles',
      'subscription_plans',
      'subscription_orders',
      'add_ons',
      'voice_session_bookings',
      // optional internal tables
      'artist_project_briefs',
      'playlist_state'
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

  _getFromStorage(key, fallback) {
    const data = localStorage.getItem(key);
    if (!data) return fallback !== undefined ? fallback : [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return fallback !== undefined ? fallback : [];
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

  // ---------------------- TIME HELPERS ----------------------

  _timeStrToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  _minutesToTimeStr(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const hh = h.toString().padStart(2, '0');
    const mm = m.toString().padStart(2, '0');
    return hh + ':' + mm;
  }

  _combineDateTime(dateStr, timeStr) {
    // dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM'
    return dateStr + 'T' + timeStr + ':00.000Z';
  }

  _addMinutesToTime(timeStr, minutesToAdd) {
    const mins = this._timeStrToMinutes(timeStr) + minutesToAdd;
    return this._minutesToTimeStr(mins);
  }

  // ---------------------- ENUM LABEL MAPPER ----------------------

  _mapEnumsToDisplayLabels(type, value) {
    if (!value) return '';
    const map = {
      project_type: {
        audiobook: 'Audiobook',
        commercial_online: 'Online Commercial',
        commercial_broadcast: 'Broadcast Commercial',
        podcast_episode: 'Podcast Episode',
        podcast_production: 'Podcast Production',
        podcast_editing: 'Podcast Editing',
        mixing_mastering: 'Mixing & Mastering',
        elearning: 'eLearning',
        studio_rental: 'Studio Rental',
        narration: 'Narration',
        other: 'Other'
      },
      usage_type: {
        non_broadcast_online_only: 'Non-broadcast / Online only',
        broadcast: 'Broadcast',
        internal_use_only: 'Internal use only',
        other: 'Other'
      },
      delivery_time: {
        '24_hours': '24 hours',
        '48_hours': '48 hours',
        '3_business_days': '3 business days',
        '5_business_days': '5 business days',
        '7_business_days': '7 business days'
      }
    };
    const group = map[type] || {};
    return group[value] || value;
  }

  // ---------------------- INTERNAL HELPERS (from spec) ----------------------

  // Merge StudioBooking records with basic working hours to derive available time slots
  _calculateStudioAvailability(studioId, date) {
    const bookings = this._getFromStorage('studio_bookings');
    const dayBookings = bookings.filter(b => b.studio_id === studioId && b.start_datetime && b.start_datetime.startsWith(date));

    const opening = this._timeStrToMinutes('09:00');
    const closing = this._timeStrToMinutes('21:00');

    const busy = dayBookings
      .map(b => {
        const timePart = b.start_datetime.split('T')[1] || '00:00:00Z';
        const start = this._timeStrToMinutes(timePart.substring(0, 5));
        const durationMinutes = Math.round((b.duration_hours || 0) * 60) || Math.round((this._timeStrToMinutes(timePart.substring(0, 5)) - this._timeStrToMinutes(timePart.substring(0, 5))));
        const endTimeStr = b.end_datetime ? b.end_datetime.split('T')[1] : null;
        const end = endTimeStr ? this._timeStrToMinutes(endTimeStr.substring(0, 5)) : start + durationMinutes;
        return { start, end };
      })
      .sort((a, b) => a.start - b.start);

    const slots = [];
    let cursor = opening;

    for (const interval of busy) {
      if (interval.start > cursor) {
        const start = cursor;
        const end = Math.min(interval.start, closing);
        if (end > start) {
          const startStr = this._minutesToTimeStr(start);
          const endStr = this._minutesToTimeStr(end);
          const peakStart = this._timeStrToMinutes('18:00');
          const peakEnd = this._timeStrToMinutes('22:00');
          const isPeak = end > peakStart && start < peakEnd;
          slots.push({ startTime: startStr, endTime: endStr, isAvailable: true, isPeak });
        }
      }
      cursor = Math.max(cursor, interval.end);
      if (cursor >= closing) break;
    }

    if (cursor < closing) {
      const startStr = this._minutesToTimeStr(cursor);
      const endStr = this._minutesToTimeStr(closing);
      const peakStart = this._timeStrToMinutes('18:00');
      const peakEnd = this._timeStrToMinutes('22:00');
      const isPeak = closing > peakStart && cursor < peakEnd;
      slots.push({ startTime: startStr, endTime: endStr, isAvailable: true, isPeak });
    }

    return slots;
  }

  // Compute pricing for InstantQuote
  _computeInstantQuotePricing(scriptLengthWords, projectType, deliveryTime) {
    const words = scriptLengthWords || 0;
    const wpm = 150; // average words per minute
    const estimatedMinutes = words / wpm;

    let baseRatePerWord = 0.2; // default
    if (projectType === 'audiobook') baseRatePerWord = 0.08;
    else if (projectType === 'elearning') baseRatePerWord = 0.16;
    else if (projectType === 'podcast_episode' || projectType === 'podcast_production') baseRatePerWord = 0.1;

    let rushMultiplier = 1;
    if (deliveryTime === '24_hours') rushMultiplier = 1.5;
    else if (deliveryTime === '48_hours') rushMultiplier = 1.25;
    else if (deliveryTime === '3_business_days') rushMultiplier = 1.1;

    const subtotal = words * baseRatePerWord * rushMultiplier;
    let discountAmount = 0;

    // simple volume discount
    if (words >= 10000) {
      discountAmount = subtotal * 0.1;
    }

    const total = subtotal - discountAmount;

    return {
      estimatedDurationMinutes: estimatedMinutes,
      baseRatePerWord,
      rushMultiplier,
      subtotalPrice: subtotal,
      discountAmount,
      totalPrice: total
    };
  }

  // Determine bundle discount rules
  _applyBundleDiscountRules(itemSummaries, subtotalPrice) {
    let bundleDiscountEnabled = false;
    let bundleDiscountPercent = 0;
    let bundleDiscountAmount = 0;
    let totalPrice = subtotalPrice;

    if (itemSummaries.length >= 2 && subtotalPrice >= 300) {
      bundleDiscountEnabled = true;
      bundleDiscountPercent = 10;
      bundleDiscountAmount = subtotalPrice * (bundleDiscountPercent / 100);
      totalPrice = subtotalPrice - bundleDiscountAmount;
    }

    return {
      bundleDiscountEnabled,
      bundleDiscountPercent,
      bundleDiscountAmount,
      totalPrice
    };
  }

  // Manage playlist state (e.g., last created playlist id)
  _getOrCreatePlaylistState() {
    const existing = this._getFromStorage('playlist_state', null);
    if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
      return existing;
    }
    const state = { last_created_playlist_id: null };
    this._saveToStorage('playlist_state', state);
    return state;
  }

  _savePlaylistState(state) {
    this._saveToStorage('playlist_state', state);
  }

  // Filter VoiceArtistPackage records for live directed sessions
  _selectEligibleVoicePackagesForLiveSession(serviceId, language, gender, maxPrice, includeVideoCall) {
    const artists = this._getFromStorage('voice_artists');
    const packages = this._getFromStorage('voice_artist_packages');
    const addOns = this._getFromStorage('add_ons');

    const videoCallAddon = addOns.find(a => a.code === 'video_call' && a.applies_to === 'voice_session' && a.is_active);

    const results = [];

    for (const pkg of packages) {
      if (!pkg.is_active) continue;
      const isLiveSessionPackage =
        pkg.package_type === 'live_directed_session' ||
        (pkg.package_type === 'commercial_spot' && pkg.includes_live_direction && pkg.usage_type === 'commercial_online');
      if (!isLiveSessionPackage) continue;
      if (pkg.usage_type !== 'commercial_online') continue;

      const artist = artists.find(a => a.id === pkg.artist_id && a.is_active);
      if (!artist) continue;

      if (language && artist.primary_language !== language) continue;
      if (gender && artist.gender !== gender) continue;

      let estimatedTotal = pkg.base_price;
      if (includeVideoCall && videoCallAddon && pkg.supports_video_call_addon) {
        estimatedTotal += videoCallAddon.price;
      }

      if (typeof maxPrice === 'number' && estimatedTotal > maxPrice) continue;

      results.push({ artist, pkg, estimatedTotal });
    }

    // sort by price ascending
    results.sort((a, b) => a.estimatedTotal - b.estimatedTotal);

    return { results, videoCallAddon };
  }

  // ---------------------- INTERFACES IMPLEMENTATION ----------------------

  // 1) getHomePageHighlights
  getHomePageHighlights() {
    const services = this._getFromStorage('services');
    const blogPosts = this._getFromStorage('blog_posts');
    const demoTracks = this._getFromStorage('demo_tracks');

    const featuredServices = services.filter(s => s.is_active).slice(0, 4);

    const featuredBlogPosts = blogPosts
      .slice()
      .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
      .slice(0, 4);

    const featuredDemoTracks = demoTracks
      .filter(d => d.is_portfolio_piece)
      .slice()
      .sort((a, b) => {
        const rb = b.rating || 0;
        const ra = a.rating || 0;
        if (rb !== ra) return rb - ra;
        return (b.created_at || '').localeCompare(a.created_at || '');
      })
      .slice(0, 6);

    const promotions = [
      {
        id: 'promo_studio_rental',
        title: 'Need a voiceover booth tonight?',
        subtitle: 'Flexible evening studio rentals',
        description: 'Book pro voiceover booths with engineered acoustics and top-tier mics.',
        badgeText: 'Studios',
        ctaLabel: 'Browse Studios',
        ctaTargetPage: 'studio_rental',
        priority: 1
      },
      {
        id: 'promo_podcast',
        title: 'Podcast editing & mixing bundles',
        subtitle: 'Sound like a network show on an indie budget',
        description: 'Combine editing with mixing & mastering and save with bundle pricing.',
        badgeText: 'Bundles',
        ctaLabel: 'Build a Bundle',
        ctaTargetPage: 'services_bundle_builder',
        priority: 2
      },
      {
        id: 'promo_voice_roster',
        title: 'Hand-picked voice talent',
        subtitle: 'Commercial, eLearning, audiobooks & more',
        description: 'Browse curated US and UK English voices with transparent pricing.',
        badgeText: 'Voices',
        ctaLabel: 'Explore Voices',
        ctaTargetPage: 'voice_artists',
        priority: 3
      }
    ];

    return {
      featuredServices,
      featuredBlogPosts,
      featuredDemoTracks,
      promotions
    };
  }

  // 2) getStudioFilterOptions
  getStudioFilterOptions() {
    const studioTypes = [
      { value: 'voiceover_booth', label: 'Voiceover Booth' },
      { value: 'recording_studio', label: 'Recording Studio' },
      { value: 'mixing_suite', label: 'Mixing Suite' },
      { value: 'podcast_room', label: 'Podcast Room' },
      { value: 'other', label: 'Other' }
    ];

    const durationOptionsHours = [
      { hours: 1, label: '1 hour' },
      { hours: 2, label: '2 hours' },
      { hours: 3, label: '3 hours' },
      { hours: 4, label: '4 hours' }
    ];

    const maxPriceSuggestions = [50, 80, 100, 150];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    const timePickerStepMinutes = 30;

    return {
      studioTypes,
      durationOptionsHours,
      maxPriceSuggestions,
      sortOptions,
      timePickerStepMinutes
    };
  }

  // 3) searchStudiosForRental
  searchStudiosForRental(date, earliestStartTime, durationHours, studioType, maxHourlyRate, sortBy) {
    const studios = this._getFromStorage('studios');
    const durationMinutes = durationHours * 60;
    const earliestMinutes = this._timeStrToMinutes(earliestStartTime);

    const results = [];

    for (const studio of studios) {
      if (!studio.is_active) continue;
      if (studioType && studio.studio_type !== studioType) continue;
      if (typeof maxHourlyRate === 'number' && studio.hourly_rate > maxHourlyRate) continue;

      const availability = this._calculateStudioAvailability(studio.id, date);
      let nextAvailableStartTime = null;
      let supportsRequestedWindow = false;

      for (const slot of availability) {
        if (!slot.isAvailable) continue;
        const slotStart = this._timeStrToMinutes(slot.startTime);
        const slotEnd = this._timeStrToMinutes(slot.endTime);
        const candidateStart = Math.max(slotStart, earliestMinutes);
        if (slotEnd - candidateStart >= durationMinutes) {
          nextAvailableStartTime = this._minutesToTimeStr(candidateStart);
          supportsRequestedWindow = true;
          break;
        }
      }

      results.push({
        studio,
        nextAvailableStartTime,
        supportsRequestedWindow,
        estimatedTotalPrice: studio.hourly_rate * durationHours,
        currency: studio.currency || 'usd'
      });
    }

    const sortKey = sortBy || 'price_low_to_high';
    results.sort((a, b) => {
      if (sortKey === 'price_low_to_high') return a.studio.hourly_rate - b.studio.hourly_rate;
      if (sortKey === 'price_high_to_low') return b.studio.hourly_rate - a.studio.hourly_rate;
      if (sortKey === 'rating_high_to_low') return (b.studio.rating || 0) - (a.studio.rating || 0);
      return 0;
    });

    return results;
  }

  // 4) getStudioDetails
  getStudioDetails(studioId) {
    const studios = this._getFromStorage('studios');
    const studio = studios.find(s => s.id === studioId) || null;

    const typeLabels = {
      voiceover_booth: 'Voiceover Booth',
      recording_studio: 'Recording Studio',
      mixing_suite: 'Mixing Suite',
      podcast_room: 'Podcast Room',
      other: 'Other'
    };

    const studioTypeLabel = studio ? (typeLabels[studio.studio_type] || studio.studio_type) : '';
    const photoGallery = [];
    if (studio && studio.image_url) photoGallery.push(studio.image_url);

    const equipmentList = studio && Array.isArray(studio.equipment) ? studio.equipment : [];

    return { studio, studioTypeLabel, photoGallery, equipmentList };
  }

  // 5) getStudioAvailability
  getStudioAvailability(studioId, date) {
    return this._calculateStudioAvailability(studioId, date);
  }

  // 6) createStudioBooking
  createStudioBooking(studioId, date, startTime, durationHours, customerName, customerEmail, paymentMethod) {
    const studios = this._getFromStorage('studios');
    const bookings = this._getFromStorage('studio_bookings');
    const studio = studios.find(s => s.id === studioId);

    if (!studio) {
      return { success: false, booking: null, studio: null, confirmationMessage: 'Studio not found.' };
    }

    const durationMinutes = durationHours * 60;
    const endTime = this._addMinutesToTime(startTime, durationMinutes);

    const startDatetime = this._combineDateTime(date, startTime);
    const endDatetime = this._combineDateTime(date, endTime);

    const availability = this._calculateStudioAvailability(studioId, date);
    let fits = false;
    const startMins = this._timeStrToMinutes(startTime);
    const endMins = this._timeStrToMinutes(endTime);

    for (const slot of availability) {
      if (!slot.isAvailable) continue;
      const slotStart = this._timeStrToMinutes(slot.startTime);
      const slotEnd = this._timeStrToMinutes(slot.endTime);
      if (startMins >= slotStart && endMins <= slotEnd) {
        fits = true;
        break;
      }
    }

    if (!fits) {
      return { success: false, booking: null, studio, confirmationMessage: 'Requested time is not available.' };
    }

    const totalPrice = studio.hourly_rate * durationHours;

    const booking = {
      id: this._generateId('studio_booking'),
      studio_id: studio.id,
      studio_name_snapshot: studio.name,
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      duration_hours: durationHours,
      customer_name: customerName,
      customer_email: customerEmail,
      payment_method: paymentMethod,
      total_price: totalPrice,
      currency: studio.currency || 'usd',
      status: 'confirmed',
      created_at: this._nowIso()
    };

    bookings.push(booking);
    this._saveToStorage('studio_bookings', bookings);

    const confirmationMessage = 'Studio booking confirmed for ' + studio.name + ' on ' + date + ' from ' + startTime + ' to ' + endTime + '.';

    return { success: true, booking, studio, confirmationMessage };
  }

  // 7) getStudioBookingSummary
  getStudioBookingSummary(bookingId) {
    const bookings = this._getFromStorage('studio_bookings');
    const studios = this._getFromStorage('studios');
    const booking = bookings.find(b => b.id === bookingId) || null;
    const studio = booking ? (studios.find(s => s.id === booking.studio_id) || null) : null;

    const price = booking ? booking.total_price || 0 : 0;
    const totalPriceFormatted = '$' + price.toFixed(2) + ' USD';

    return { booking, studio, totalPriceFormatted };
  }

  // 8) getVoiceArtistFilterOptions
  getVoiceArtistFilterOptions() {
    const languages = [
      { value: 'english_us', label: 'English - US' },
      { value: 'english_uk', label: 'English - UK' },
      { value: 'spanish_es', label: 'Spanish - Spain' },
      { value: 'spanish_latam', label: 'Spanish - Latin America' },
      { value: 'french_fr', label: 'French - France' },
      { value: 'german_de', label: 'German' },
      { value: 'other_language', label: 'Other' }
    ];

    const genders = [
      { value: 'female', label: 'Female' },
      { value: 'male', label: 'Male' },
      { value: 'non_binary', label: 'Non-binary' },
      { value: 'other', label: 'Other' }
    ];

    const usageTypes = [
      { value: 'commercial_online', label: 'Commercial - Online' },
      { value: 'commercial_broadcast', label: 'Commercial - Broadcast' },
      { value: 'audiobook', label: 'Audiobook' },
      { value: 'elearning', label: 'eLearning' },
      { value: 'podcast', label: 'Podcast' },
      { value: 'internal_training', label: 'Internal / Training' },
      { value: 'other_usage', label: 'Other' }
    ];

    const ratingThresholds = [3, 4, 4.5, 5];
    const maxPriceSuggestionsFor60s = [50, 100, 150, 200, 250, 300];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return {
      languages,
      genders,
      usageTypes,
      ratingThresholds,
      maxPriceSuggestionsFor60s,
      sortOptions
    };
  }

  // 9) searchVoiceArtists
  searchVoiceArtists(primaryLanguage, gender, usageType, minRating, maxPriceFor60sCommercial, sortBy) {
    const artists = this._getFromStorage('voice_artists');
    const packages = this._getFromStorage('voice_artist_packages');

    let filtered = artists.filter(a => a.is_active);

    if (primaryLanguage) {
      filtered = filtered.filter(a => a.primary_language === primaryLanguage);
    }
    if (gender) {
      filtered = filtered.filter(a => a.gender === gender);
    }
    if (typeof minRating === 'number') {
      filtered = filtered.filter(a => (a.rating || 0) >= minRating);
    }
    if (typeof maxPriceFor60sCommercial === 'number') {
      filtered = filtered.filter(a => typeof a.price_60s_commercial === 'number' && a.price_60s_commercial <= maxPriceFor60sCommercial);
    }
    if (usageType) {
      filtered = filtered.filter(a => {
        const hasPackage = packages.some(p => p.artist_id === a.id && p.usage_type === usageType && p.is_active);
        return hasPackage;
      });
    }

    const sortKey = sortBy || 'price_low_to_high';
    filtered.sort((a, b) => {
      if (sortKey === 'price_low_to_high') {
        const pa = a.price_60s_commercial || Infinity;
        const pb = b.price_60s_commercial || Infinity;
        return pa - pb;
      }
      if (sortKey === 'rating_high_to_low') {
        return (b.rating || 0) - (a.rating || 0);
      }
      return 0;
    });

    return filtered;
  }

  // 10) getVoiceArtistProfile
  getVoiceArtistProfile(artistId) {
    const artists = this._getFromStorage('voice_artists');
    const packages = this._getFromStorage('voice_artist_packages');
    const demoTracks = this._getFromStorage('demo_tracks');

    const artist = artists.find(a => a.id === artistId) || null;
    const artistPackages = packages.filter(p => p.artist_id === artistId && p.is_active);
    const artistDemos = demoTracks.filter(d => d.artist_id === artistId);

    const averageRating = artist ? (artist.rating || 0) : 0;
    const reviewCount = artist ? (artist.review_count || 0) : 0;

    const reviewSnippets = [];

    return {
      artist,
      packages: artistPackages,
      demoTracks: artistDemos,
      averageRating,
      reviewCount,
      reviewSnippets
    };
  }

  // 11) createArtistProjectBrief
  createArtistProjectBrief(artistId, packageId, projectType, scriptLengthWords, durationSeconds, notes) {
    const artists = this._getFromStorage('voice_artists');
    const packages = this._getFromStorage('voice_artist_packages');
    const briefs = this._getFromStorage('artist_project_briefs');

    const artist = artists.find(a => a.id === artistId) || null;
    const selectedPackage = packages.find(p => p.id === packageId) || null;

    let estimatedPrice = selectedPackage ? selectedPackage.base_price : 0;
    const currency = selectedPackage ? selectedPackage.currency : 'usd';

    const briefId = this._generateId('artist_brief');

    const briefRecord = {
      id: briefId,
      artist_id: artistId,
      package_id: packageId,
      project_type: projectType,
      script_length_words: scriptLengthWords || null,
      duration_seconds: durationSeconds || null,
      notes: notes || '',
      created_at: this._nowIso()
    };

    briefs.push(briefRecord);
    this._saveToStorage('artist_project_briefs', briefs);

    const summaryTextParts = [];
    if (artist) summaryTextParts.push('Artist: ' + artist.name);
    if (selectedPackage) summaryTextParts.push('Package: ' + selectedPackage.name);
    if (scriptLengthWords) summaryTextParts.push('Script: ' + scriptLengthWords + ' words');
    if (durationSeconds && !scriptLengthWords) summaryTextParts.push('Duration: ' + durationSeconds + ' seconds');

    const summaryText = summaryTextParts.join(' · ');

    return {
      briefId,
      artist,
      selectedPackage,
      estimatedPrice,
      currency,
      summaryText
    };
  }

  // 12) getServicesOverview
  getServicesOverview() {
    const services = this._getFromStorage('services');
    const packages = this._getFromStorage('service_packages');

    const activeServices = services.filter(s => s.is_active);

    const productionServices = activeServices.filter(s => s.category === 'production');
    const voiceoverServices = activeServices.filter(s => s.category === 'voiceover');
    const postProductionServices = activeServices.filter(s => s.category === 'post_production');
    const subscriptionServices = activeServices.filter(s => s.category === 'subscription');
    const studioRentalServices = activeServices.filter(s => s.category === 'studio_rental');

    const featuredPackages = packages.filter(p => p.is_active && !p.is_subscription_plan_only).slice(0, 6);

    return {
      productionServices,
      voiceoverServices,
      postProductionServices,
      subscriptionServices,
      studioRentalServices,
      featuredPackages
    };
  }

  // 13) getServiceDetail
  getServiceDetail(serviceCode) {
    const services = this._getFromStorage('services');
    const packages = this._getFromStorage('service_packages');

    const service = services.find(s => s.code === serviceCode) || null;
    const servicePackages = service ? packages.filter(p => p.service_id === service.id && p.is_active) : [];

    const highlights = [];
    if (service && service.description) highlights.push(service.description);

    return { service, packages: servicePackages, highlights };
  }

  // 14) getLiveDirectedSessionOptions
  getLiveDirectedSessionOptions(serviceId) {
    const services = this._getFromStorage('services');
    const targetService = services.find(s => s.id === serviceId) || null;

    const artists = this._getFromStorage('voice_artists');
    const packages = this._getFromStorage('voice_artist_packages');
    const addOns = this._getFromStorage('add_ons');

    const livePackages = packages.filter(p =>
      p.is_active &&
      (p.package_type === 'live_directed_session' ||
        (p.package_type === 'commercial_spot' && p.includes_live_direction && p.usage_type === 'commercial_online'))
    );

    const languageSet = new Set();
    const genderSet = new Set();

    for (const pkg of livePackages) {
      const artist = artists.find(a => a.id === pkg.artist_id && a.is_active);
      if (!artist) continue;
      languageSet.add(artist.primary_language);
      genderSet.add(artist.gender);
    }

    const languageLabelMap = {
      english_us: 'English - US',
      english_uk: 'English - UK',
      spanish_es: 'Spanish - Spain',
      spanish_latam: 'Spanish - Latin America',
      french_fr: 'French - France',
      german_de: 'German',
      other_language: 'Other'
    };

    const supportedLanguages = Array.from(languageSet).map(v => ({ value: v, label: languageLabelMap[v] || v }));

    const genderLabelMap = {
      female: 'Female',
      male: 'Male',
      non_binary: 'Non-binary',
      other: 'Other'
    };

    const supportedGenders = Array.from(genderSet).map(v => ({ value: v, label: genderLabelMap[v] || v }));

    const prices = livePackages.map(p => p.base_price);
    const maxPriceSuggestions = [];
    if (prices.length) {
      const sorted = prices.slice().sort((a, b) => a - b);
      const step = Math.max(1, Math.floor(sorted.length / 3));
      maxPriceSuggestions.push(sorted[step - 1] || sorted[0]);
      maxPriceSuggestions.push(sorted[2 * step - 1] || sorted[sorted.length - 1]);
      maxPriceSuggestions.push(sorted[sorted.length - 1]);
    }

    const videoCallAddon = addOns.find(a => a.code === 'video_call' && a.applies_to === 'voice_session' && a.is_active) || null;

    return {
      supportedLanguages,
      supportedGenders,
      suggestedMaxPriceValues: maxPriceSuggestions,
      videoCallAddon
    };
  }

  // 15) searchLiveDirectedSessionArtists
  searchLiveDirectedSessionArtists(serviceId, language, gender, maxPrice, includeVideoCall) {
    const { results, videoCallAddon } = this._selectEligibleVoicePackagesForLiveSession(serviceId, language, gender, maxPrice, includeVideoCall);

    return results.map(entry => ({
      artist: entry.artist,
      package: entry.pkg,
      basePrice: entry.pkg.base_price,
      includesLiveDirection: entry.pkg.includes_live_direction,
      supportsVideoCallAddon: entry.pkg.supports_video_call_addon,
      estimatedTotalPriceWithVideoCall: includeVideoCall && videoCallAddon && entry.pkg.supports_video_call_addon
        ? entry.pkg.base_price + videoCallAddon.price
        : entry.pkg.base_price,
      currency: entry.pkg.currency || 'usd'
    }));
  }

  // 16) createVoiceSessionBooking
  createVoiceSessionBooking(serviceId, artistId, voiceArtistPackageId, language, gender, maxPriceConstraint, includeVideoCall, scheduledDate, startTime, durationMinutes, notes) {
    const services = this._getFromStorage('services');
    const artists = this._getFromStorage('voice_artists');
    const packages = this._getFromStorage('voice_artist_packages');
    const addOns = this._getFromStorage('add_ons');
    const bookings = this._getFromStorage('voice_session_bookings');

    const service = services.find(s => s.id === serviceId) || null;
    const artist = artists.find(a => a.id === artistId) || null;
    const pkg = packages.find(p => p.id === voiceArtistPackageId) || null;

    if (!service || !artist || !pkg) {
      return { success: false, booking: null, artist, service, confirmationMessage: 'Service, artist, or package not found.' };
    }

    let price = pkg.base_price;
    let videoCallAddonId = null;

    if (includeVideoCall) {
      const videoAddon = addOns.find(a => a.code === 'video_call' && a.applies_to === 'voice_session' && a.is_active);
      if (videoAddon && pkg.supports_video_call_addon) {
        price += videoAddon.price;
        videoCallAddonId = videoAddon.id;
      }
    }

    if (typeof maxPriceConstraint === 'number' && price > maxPriceConstraint) {
      return { success: false, booking: null, artist, service, confirmationMessage: 'Selected session exceeds maximum price constraint.' };
    }

    const startDatetime = this._combineDateTime(scheduledDate, startTime);
    const endTime = this._addMinutesToTime(startTime, durationMinutes);
    const endDatetime = this._combineDateTime(scheduledDate, endTime);

    const booking = {
      id: this._generateId('voice_session_booking'),
      service_id: service.id,
      artist_id: artist.id,
      voice_artist_package_id: pkg.id,
      language,
      gender,
      max_price_constraint: maxPriceConstraint || null,
      price,
      currency: pkg.currency || 'usd',
      scheduled_start_datetime: startDatetime,
      scheduled_end_datetime: endDatetime,
      duration_minutes: durationMinutes,
      include_video_call: !!includeVideoCall,
      video_call_addon_id: videoCallAddonId,
      status: 'confirmed',
      created_at: this._nowIso(),
      notes: notes || ''
    };

    bookings.push(booking);
    this._saveToStorage('voice_session_bookings', bookings);

    const confirmationMessage = 'Live directed session booked with ' + artist.name + ' on ' + scheduledDate + ' at ' + startTime + '.';

    return { success: true, booking, artist, service, confirmationMessage };
  }

  // 17) getVoiceSessionBookingSummary
  getVoiceSessionBookingSummary(bookingId) {
    const bookings = this._getFromStorage('voice_session_bookings');
    const artists = this._getFromStorage('voice_artists');
    const services = this._getFromStorage('services');
    const addOns = this._getFromStorage('add_ons');

    const booking = bookings.find(b => b.id === bookingId) || null;
    const artist = booking ? (artists.find(a => a.id === booking.artist_id) || null) : null;
    const service = booking ? (services.find(s => s.id === booking.service_id) || null) : null;
    const videoCallAddon = booking && booking.video_call_addon_id
      ? (addOns.find(a => a.id === booking.video_call_addon_id) || null)
      : null;

    return { booking, artist, service, videoCallAddon };
  }

  // 18) getBundleEligibleServices
  getBundleEligibleServices() {
    const services = this._getFromStorage('services');
    return services.filter(s => s.is_active && s.is_bundle_eligible);
  }

  // 19) getServicePackagesForService
  getServicePackagesForService(serviceId) {
    const services = this._getFromStorage('services');
    const packages = this._getFromStorage('service_packages');

    let result = packages.filter(p => p.service_id === serviceId && p.is_active);

    // If no packages exist for Mixing & Mastering, synthesize a sensible default
    if (!result.length) {
      const service = services.find(s => s.id === serviceId) || null;
      if (service && service.code === 'mixing_mastering') {
        const syntheticPackage = {
          id: this._generateId('service_package'),
          service_id: serviceId,
          name: 'Podcast Mixing & Mastering (48-hour, up to 60 minutes)',
          tier_code: 'standard',
          description:
            'Mixing and mastering for a single podcast episode up to 60 minutes with 48-hour delivery. Includes detailed balance, EQ, compression and loudness normalization.',
          base_price: 200,
          currency: 'usd',
          delivery_time: '48_hours',
          includes_mixing_mastering: true,
          max_episode_length_minutes: 60,
          max_tracks_included: 4,
          is_subscription_plan_only: false,
          is_active: true,
          image: service.image || ''
        };
        packages.push(syntheticPackage);
        this._saveToStorage('service_packages', packages);
        result = [syntheticPackage];
      }
    }

    return result;
  }

  // 20) previewServiceBundle
  previewServiceBundle(items, applyBundleDiscount) {
    const services = this._getFromStorage('services');
    const packages = this._getFromStorage('service_packages');

    const itemSummaries = [];

    for (const item of items || []) {
      const service = services.find(s => s.id === item.serviceId) || null;
      const pkg = packages.find(p => p.id === item.servicePackageId) || null;
      if (!service || !pkg) continue;

      const quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
      const price = (pkg.base_price || 0) * quantity;

      itemSummaries.push({
        serviceName: service.name,
        packageName: pkg.name,
        price,
        deliveryTime: pkg.delivery_time,
        episodeLengthMinutes: item.episodeLengthMinutes || null,
        trackCount: item.trackCount || null,
        trackChannelType: item.trackChannelType || null,
        quantity
      });
    }

    const subtotalPrice = itemSummaries.reduce((sum, it) => sum + it.price, 0);

    const discountData = applyBundleDiscount
      ? this._applyBundleDiscountRules(itemSummaries, subtotalPrice)
      : {
          bundleDiscountEnabled: false,
          bundleDiscountPercent: 0,
          bundleDiscountAmount: 0,
          totalPrice: subtotalPrice
        };

    return {
      items: itemSummaries,
      subtotalPrice,
      bundleDiscountEnabled: discountData.bundleDiscountEnabled,
      bundleDiscountPercent: discountData.bundleDiscountPercent,
      bundleDiscountAmount: discountData.bundleDiscountAmount,
      totalPrice: discountData.totalPrice,
      currency: 'usd'
    };
  }

  // 21) createServiceBundle
  createServiceBundle(name, items, applyBundleDiscount, notes) {
    const services = this._getFromStorage('services');
    const packages = this._getFromStorage('service_packages');
    const bundles = this._getFromStorage('service_bundles');
    const bundleItems = this._getFromStorage('bundle_items');

    const internalItems = [];

    for (let index = 0; index < (items || []).length; index++) {
      const item = items[index];
      const service = services.find(s => s.id === item.serviceId) || null;
      const pkg = packages.find(p => p.id === item.servicePackageId) || null;
      if (!service || !pkg) continue;

      const quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
      const price = (pkg.base_price || 0) * quantity;

      internalItems.push({
        service,
        pkg,
        episodeLengthMinutes: item.episodeLengthMinutes || null,
        trackCount: item.trackCount || null,
        trackChannelType: item.trackChannelType || null,
        quantity,
        position: typeof item.position === 'number' ? item.position : index + 1,
        price
      });
    }

    const subtotalPrice = internalItems.reduce((sum, it) => sum + it.price, 0);

    const discountData = applyBundleDiscount
      ? this._applyBundleDiscountRules(internalItems.map(it => ({ price: it.price })), subtotalPrice)
      : {
          bundleDiscountEnabled: false,
          bundleDiscountPercent: 0,
          bundleDiscountAmount: 0,
          totalPrice: subtotalPrice
        };

    const bundle = {
      id: this._generateId('service_bundle'),
      name: name || 'Custom Bundle',
      created_at: this._nowIso(),
      updated_at: this._nowIso(),
      subtotal_price: subtotalPrice,
      bundle_discount_enabled: discountData.bundleDiscountEnabled,
      bundle_discount_percent: discountData.bundleDiscountPercent,
      bundle_discount_amount: discountData.bundleDiscountAmount,
      total_price: discountData.totalPrice,
      currency: 'usd',
      notes: notes || ''
    };

    bundles.push(bundle);

    const createdItems = [];

    for (const it of internalItems) {
      const bundleItem = {
        id: this._generateId('bundle_item'),
        bundle_id: bundle.id,
        service_id: it.service.id,
        service_package_id: it.pkg.id,
        service_name_snapshot: it.service.name,
        package_name_snapshot: it.pkg.name,
        price: it.price,
        delivery_time: it.pkg.delivery_time,
        episode_length_minutes: it.episodeLengthMinutes,
        track_count: it.trackCount,
        track_channel_type: it.trackChannelType,
        quantity: it.quantity,
        position: it.position
      };
      bundleItems.push(bundleItem);
      createdItems.push(bundleItem);
    }

    this._saveToStorage('service_bundles', bundles);
    this._saveToStorage('bundle_items', bundleItems);

    return { bundle, items: createdItems };
  }

  // 22) getServiceBundleSummary
  getServiceBundleSummary(bundleId) {
    const bundles = this._getFromStorage('service_bundles');
    const bundleItems = this._getFromStorage('bundle_items');
    const services = this._getFromStorage('services');
    const packages = this._getFromStorage('service_packages');

    const bundle = bundles.find(b => b.id === bundleId) || null;
    const itemsForBundle = bundleItems.filter(i => i.bundle_id === bundleId);

    const items = itemsForBundle.map(bi => ({
      bundleItem: bi,
      service: services.find(s => s.id === bi.service_id) || null,
      servicePackage: packages.find(p => p.id === bi.service_package_id) || null
    }));

    return { bundle, items };
  }

  // 23) createProjectInquiryFromBundle
  createProjectInquiryFromBundle(bundleId, contactName, contactEmail, contactPhone, message) {
    const bundles = this._getFromStorage('service_bundles');
    const inquiries = this._getFromStorage('project_inquiries');

    const bundle = bundles.find(b => b.id === bundleId) || null;

    const inquiry = {
      id: this._generateId('project_inquiry'),
      source: 'bundle_summary',
      instant_quote_id: null,
      artist_id: null,
      service_bundle_id: bundle ? bundle.id : bundleId,
      subscription_order_id: null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      project_type: null,
      usage_type: null,
      script_length_words: null,
      estimated_duration_minutes: null,
      delivery_time: null,
      budget_min: null,
      budget_max: null,
      message: message || 'Inquiry about bundle ' + (bundle ? bundle.name : bundleId),
      status: 'new',
      created_at: this._nowIso()
    };

    inquiries.push(inquiry);
    this._saveToStorage('project_inquiries', inquiries);

    return { inquiry, bundle };
  }

  // 24) getDemoTrackFilterOptions
  getDemoTrackFilterOptions() {
    const categories = [
      { value: 'elearning', label: 'eLearning' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'audiobook', label: 'Audiobook' },
      { value: 'podcast', label: 'Podcast' },
      { value: 'promo', label: 'Promo' },
      { value: 'narration', label: 'Narration' },
      { value: 'corporate', label: 'Corporate' },
      { value: 'other', label: 'Other' }
    ];

    const durationMaxSuggestionsSeconds = [30, 60, 90, 120, 180];
    const ratingThresholds = [3, 4, 4.5, 5];

    const sortOptions = [
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'newest_first', label: 'Newest First' }
    ];

    return { categories, durationMaxSuggestionsSeconds, ratingThresholds, sortOptions };
  }

  // 25) searchDemoTracks
  searchDemoTracks(category, maxDurationSeconds, minRating, sortBy) {
    const demos = this._getFromStorage('demo_tracks');

    let filtered = demos.filter(d => d.is_portfolio_piece);

    if (category) {
      filtered = filtered.filter(d => d.category === category);
    }
    if (typeof maxDurationSeconds === 'number') {
      filtered = filtered.filter(d => d.duration_seconds <= maxDurationSeconds);
    }
    if (typeof minRating === 'number') {
      filtered = filtered.filter(d => (d.rating || 0) >= minRating);
    }

    const key = sortBy || 'rating_high_to_low';
    filtered.sort((a, b) => {
      if (key === 'rating_high_to_low') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (key === 'newest_first') {
        return (b.created_at || '').localeCompare(a.created_at || '');
      }
      return 0;
    });

    return filtered;
  }

  // 26) createPlaylist
  createPlaylist(name, markAsFavorite) {
    const playlists = this._getFromStorage('playlists');

    const playlist = {
      id: this._generateId('playlist'),
      name,
      created_at: this._nowIso(),
      updated_at: this._nowIso(),
      is_favorite: !!markAsFavorite
    };

    playlists.push(playlist);
    this._saveToStorage('playlists', playlists);

    const state = this._getOrCreatePlaylistState();
    state.last_created_playlist_id = playlist.id;
    this._savePlaylistState(state);

    return { playlist };
  }

  // 27) addTrackToPlaylist
  addTrackToPlaylist(playlistId, demoTrackId, position) {
    const playlists = this._getFromStorage('playlists');
    const playlistItems = this._getFromStorage('playlist_items');

    const playlist = playlists.find(p => p.id === playlistId) || null;

    const itemsForPlaylist = playlistItems.filter(pi => pi.playlist_id === playlistId);
    let newPosition;
    if (typeof position === 'number' && position > 0) {
      newPosition = position;
    } else {
      newPosition = itemsForPlaylist.length + 1;
    }

    const playlistItem = {
      id: this._generateId('playlist_item'),
      playlist_id: playlistId,
      demo_track_id: demoTrackId,
      position: newPosition,
      added_at: this._nowIso()
    };

    playlistItems.push(playlistItem);

    if (playlist) {
      playlist.updated_at = this._nowIso();
    }

    this._saveToStorage('playlist_items', playlistItems);
    this._saveToStorage('playlists', playlists);

    return { playlistItem, playlist };
  }

  // 28) removeTrackFromPlaylist
  removeTrackFromPlaylist(playlistItemId) {
    const playlists = this._getFromStorage('playlists');
    const playlistItems = this._getFromStorage('playlist_items');

    const index = playlistItems.findIndex(pi => pi.id === playlistItemId);
    if (index === -1) {
      return { success: false, playlist: null };
    }

    const playlistId = playlistItems[index].playlist_id;
    playlistItems.splice(index, 1);

    const playlist = playlists.find(p => p.id === playlistId) || null;
    if (playlist) {
      playlist.updated_at = this._nowIso();
    }

    this._saveToStorage('playlist_items', playlistItems);
    this._saveToStorage('playlists', playlists);

    return { success: true, playlist };
  }

  // 29) getPlaylists
  getPlaylists() {
    const playlists = this._getFromStorage('playlists');
    return playlists;
  }

  // 30) getPlaylistDetails
  getPlaylistDetails(playlistId) {
    const playlists = this._getFromStorage('playlists');
    const playlistItems = this._getFromStorage('playlist_items');
    const demoTracks = this._getFromStorage('demo_tracks');

    const playlist = playlists.find(p => p.id === playlistId) || null;
    const itemsForPlaylist = playlistItems
      .filter(pi => pi.playlist_id === playlistId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const items = itemsForPlaylist.map(pi => ({
      playlistItem: pi,
      demoTrack: demoTracks.find(d => d.id === pi.demo_track_id) || null
    }));

    return { playlist, items };
  }

  // 31) finalizePlaylist
  finalizePlaylist(playlistId) {
    const playlists = this._getFromStorage('playlists');
    const playlist = playlists.find(p => p.id === playlistId) || null;
    if (playlist) {
      playlist.updated_at = this._nowIso();
      this._saveToStorage('playlists', playlists);
    }
    return { playlist };
  }

  // 32) getInstantQuoteOptions
  getInstantQuoteOptions() {
    const projectTypes = [
      { value: 'audiobook', label: 'Audiobook' },
      { value: 'commercial_online', label: 'Online Commercial' },
      { value: 'commercial_broadcast', label: 'Broadcast Commercial' },
      { value: 'podcast_episode', label: 'Podcast Episode' },
      { value: 'podcast_production', label: 'Podcast Production' },
      { value: 'podcast_editing', label: 'Podcast Editing Only' },
      { value: 'mixing_mastering', label: 'Mixing & Mastering' },
      { value: 'elearning', label: 'eLearning' },
      { value: 'studio_rental', label: 'Studio Rental' },
      { value: 'narration', label: 'Narration' },
      { value: 'other', label: 'Other' }
    ];

    const usageTypes = [
      { value: 'non_broadcast_online_only', label: 'Non-broadcast / Online Only' },
      { value: 'broadcast', label: 'Broadcast' },
      { value: 'internal_use_only', label: 'Internal Use Only' },
      { value: 'other', label: 'Other' }
    ];

    const deliveryTimes = [
      { value: '24_hours', label: '24 hours' },
      { value: '48_hours', label: '48 hours' },
      { value: '3_business_days', label: '3 business days' },
      { value: '5_business_days', label: '5 business days' },
      { value: '7_business_days', label: '7 business days' }
    ];

    return { projectTypes, usageTypes, deliveryTimes };
  }

  // 33) createInstantQuote
  createInstantQuote(scriptLengthWords, projectType, usageType, deliveryTime, notes) {
    const quotes = this._getFromStorage('instant_quotes');

    const pricing = this._computeInstantQuotePricing(scriptLengthWords, projectType, deliveryTime);

    const quote = {
      id: this._generateId('instant_quote'),
      script_length_words: scriptLengthWords,
      estimated_duration_minutes: pricing.estimatedDurationMinutes,
      project_type: projectType,
      usage_type: usageType,
      delivery_time: deliveryTime,
      base_rate_per_word: pricing.baseRatePerWord,
      rush_multiplier: pricing.rushMultiplier,
      subtotal_price: pricing.subtotalPrice,
      discount_amount: pricing.discountAmount,
      total_price: pricing.totalPrice,
      currency: 'usd',
      notes: notes || '',
      created_at: this._nowIso()
    };

    quotes.push(quote);
    this._saveToStorage('instant_quotes', quotes);

    return { quote };
  }

  // 34) getInstantQuoteDetails
  getInstantQuoteDetails(quoteId) {
    const quotes = this._getFromStorage('instant_quotes');
    const quote = quotes.find(q => q.id === quoteId) || null;

    let summaryText = '';
    if (quote) {
      const projectLabel = this._mapEnumsToDisplayLabels('project_type', quote.project_type);
      const deliveryLabel = this._mapEnumsToDisplayLabels('delivery_time', quote.delivery_time);
      summaryText = projectLabel + ' · ' + quote.script_length_words + ' words · ' + deliveryLabel + ' · $' + quote.total_price.toFixed(2) + ' USD';
    }

    return { quote, summaryText };
  }

  // 35) getContactFormPrefill
  getContactFormPrefill(context) {
    const ctx = context || {};
    let suggestedMessage = '';
    let projectType = null;
    let usageType = null;
    let scriptLengthWords = null;
    let estimatedDurationMinutes = null;
    let deliveryTime = null;

    if (ctx.instantQuoteId) {
      const details = this.getInstantQuoteDetails(ctx.instantQuoteId);
      if (details.quote) {
        const q = details.quote;
        suggestedMessage = 'I would like to proceed with this quote: ' + details.summaryText;
        projectType = q.project_type;
        usageType = q.usage_type;
        scriptLengthWords = q.script_length_words;
        estimatedDurationMinutes = q.estimated_duration_minutes;
        deliveryTime = q.delivery_time;
      }
    } else if (ctx.bundleId) {
      const summary = this.getServiceBundleSummary(ctx.bundleId);
      if (summary.bundle) {
        suggestedMessage = 'I am interested in this service bundle (' + summary.bundle.name + ') and would like to discuss next steps.';
      }
    } else if (ctx.artistId) {
      const profile = this.getVoiceArtistProfile(ctx.artistId);
      if (profile.artist) {
        suggestedMessage = 'I would like to discuss a project with voice artist ' + profile.artist.name + '.';
      }
    } else if (ctx.subscriptionOrderId) {
      const subSummary = this.getSubscriptionOrderSummary(ctx.subscriptionOrderId);
      if (subSummary.order && subSummary.plan) {
        suggestedMessage = 'I have selected the ' + subSummary.plan.name + ' subscription plan and have a few questions before activating.';
      }
    }

    return {
      suggestedMessage,
      projectType,
      usageType,
      scriptLengthWords,
      estimatedDurationMinutes,
      deliveryTime
    };
  }

  // 36) createProjectInquiry
  createProjectInquiry(source, instantQuoteId, artistId, serviceBundleId, subscriptionOrderId, contactName, contactEmail, contactPhone, projectType, usageType, scriptLengthWords, estimatedDurationMinutes, deliveryTime, budgetMin, budgetMax, message) {
    const inquiries = this._getFromStorage('project_inquiries');

    const inquiry = {
      id: this._generateId('project_inquiry'),
      source,
      instant_quote_id: instantQuoteId || null,
      artist_id: artistId || null,
      service_bundle_id: serviceBundleId || null,
      subscription_order_id: subscriptionOrderId || null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      project_type: projectType || null,
      usage_type: usageType || null,
      script_length_words: scriptLengthWords || null,
      estimated_duration_minutes: estimatedDurationMinutes || null,
      delivery_time: deliveryTime || null,
      budget_min: typeof budgetMin === 'number' ? budgetMin : null,
      budget_max: typeof budgetMax === 'number' ? budgetMax : null,
      message: message || '',
      status: 'new',
      created_at: this._nowIso()
    };

    inquiries.push(inquiry);
    this._saveToStorage('project_inquiries', inquiries);

    const confirmationMessage = 'Your inquiry has been submitted. We will get back to you shortly.';

    return { inquiry, confirmationMessage };
  }

  // 37) getBlogPosts
  getBlogPosts(searchQuery, category, page, pageSize) {
    const posts = this._getFromStorage('blog_posts');

    let filtered = posts.slice();

    if (category) {
      filtered = filtered.filter(p => p.category === category);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const title = (p.title || '').toLowerCase();
        const content = (p.content || '').toLowerCase();
        const excerpt = (p.excerpt || '').toLowerCase();
        return title.includes(q) || content.includes(q) || excerpt.includes(q);
      });
    }

    filtered.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));

    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 10;
    const totalResults = filtered.length;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const paged = filtered.slice(start, end);

    return {
      posts: paged,
      totalResults,
      page: currentPage,
      pageSize: size
    };
  }

  // 38) getBlogPost
  getBlogPost(slug) {
    const posts = this._getFromStorage('blog_posts');
    const post = posts.find(p => p.slug === slug) || null;

    let relatedPosts = [];
    if (post) {
      relatedPosts = posts
        .filter(p => p.id !== post.id && p.category === post.category)
        .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
        .slice(0, 3);
    }

    // Instrumentation for task completion tracking (task_6)
    try {
      if (post) {
        const key = 'task6_viewedBlogPostIds';
        let existing = localStorage.getItem(key);
        let idsArray = [];
        if (existing) {
          try {
            const parsed = JSON.parse(existing);
            if (Array.isArray(parsed)) {
              idsArray = parsed;
            }
          } catch (e) {
            // Ignore JSON parse errors and reset to empty array
            idsArray = [];
          }
        }
        const postIdStr = String(post.id);
        if (!idsArray.includes(postIdStr)) {
          idsArray.push(postIdStr);
          localStorage.setItem(key, JSON.stringify(idsArray));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { post, relatedPosts };
  }

  // 39) createNewsletterSubscription
  createNewsletterSubscription(name, email, interestCategory, source, blogPostId) {
    const subs = this._getFromStorage('newsletter_subscriptions');

    const subscription = {
      id: this._generateId('newsletter_subscription'),
      name: name || null,
      email,
      interest_category: interestCategory || null,
      source,
      blog_post_id: blogPostId || null,
      subscribed_at: this._nowIso(),
      confirmed: false
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    const confirmationMessage = 'Subscription received. Please check your email to confirm.';

    return { subscription, confirmationMessage };
  }

  // 40) createClientProfile
  createClientProfile(role, fullName, email, password, primaryServiceInterest, preferredContactMethod, phoneNumber, typicalProjectBudgetRange, notes) {
    const clients = this._getFromStorage('client_profiles');

    const now = this._nowIso();

    const clientProfile = {
      id: this._generateId('client_profile'),
      role,
      full_name: fullName,
      email,
      password,
      primary_service_interest: primaryServiceInterest,
      preferred_contact_method: preferredContactMethod,
      phone_number: phoneNumber || null,
      typical_project_budget_range: typicalProjectBudgetRange || null,
      created_at: now,
      updated_at: now,
      notes: notes || ''
    };

    clients.push(clientProfile);
    this._saveToStorage('client_profiles', clients);

    const recommendedLinks = [];
    if (primaryServiceInterest === 'podcast_production') {
      recommendedLinks.push(
        { label: 'Podcast Services', targetPage: 'podcast_services' },
        { label: 'Create a Bundle', targetPage: 'bundle_builder' }
      );
    } else if (primaryServiceInterest === 'studio_rental') {
      recommendedLinks.push(
        { label: 'Studio Rental', targetPage: 'studio_rental' }
      );
    } else if (primaryServiceInterest === 'commercial_voiceover') {
      recommendedLinks.push(
        { label: 'Commercial Voiceover', targetPage: 'commercial_voiceover_service' },
        { label: 'Voice Artists', targetPage: 'voice_artists' }
      );
    }

    return { clientProfile, recommendedLinks };
  }

  // 41) getSubscriptionPlanFilterOptions
  getSubscriptionPlanFilterOptions() {
    const episodeVolumeOptions = [
      { maxEpisodes: 4, label: 'Up to 4 episodes per month' },
      { maxEpisodes: 8, label: 'Up to 8 episodes per month' },
      { maxEpisodes: 16, label: 'Up to 16 episodes per month' }
    ];

    const featureFlags = [
      { code: 'includes_mixing_mastering', label: 'Includes Mixing & Mastering' },
      { code: 'includes_editing', label: 'Includes Editing' },
      { code: 'includes_distribution', label: 'Includes Distribution' }
    ];

    const maxPriceSuggestions = [100, 150, 200, 300, 500];

    return { episodeVolumeOptions, featureFlags, maxPriceSuggestions };
  }

  // 42) searchSubscriptionPlans
  searchSubscriptionPlans(maxEpisodesPerMonth, requiresMixingMastering, maxMonthlyPrice, recommendedFor) {
    const plans = this._getFromStorage('subscription_plans');

    let filtered = plans.filter(p => p.is_active);

    if (typeof maxEpisodesPerMonth === 'number') {
      filtered = filtered.filter(p => p.episode_limit_per_month <= maxEpisodesPerMonth);
    }
    if (requiresMixingMastering) {
      filtered = filtered.filter(p => p.includes_mixing_mastering);
    }
    if (typeof maxMonthlyPrice === 'number') {
      filtered = filtered.filter(p => p.monthly_price <= maxMonthlyPrice);
    }
    if (recommendedFor) {
      filtered = filtered.filter(p => p.recommended_for === recommendedFor);
    }

    filtered.sort((a, b) => a.monthly_price - b.monthly_price);

    return filtered;
  }

  // 43) getSubscriptionPlanDetails
  getSubscriptionPlanDetails(planId) {
    const plans = this._getFromStorage('subscription_plans');
    const plan = plans.find(p => p.id === planId) || null;

    const featureList = [];
    if (plan) {
      if (plan.includes_mixing_mastering) featureList.push('Includes mixing & mastering');
      if (plan.includes_editing) featureList.push('Includes editing');
      if (plan.includes_distribution) featureList.push('Includes distribution to major platforms');
      featureList.push('Up to ' + plan.episode_limit_per_month + ' episodes per month');
    }

    return { plan, featureList };
  }

  // 44) createSubscriptionOrder
  createSubscriptionOrder(planId, billingCycle, contactEmail, podcastName) {
    const plans = this._getFromStorage('subscription_plans');
    const orders = this._getFromStorage('subscription_orders');

    const plan = plans.find(p => p.id === planId) || null;

    if (!plan) {
      const confirmationMessage = 'Subscription plan not found.';
      return { subscriptionOrder: null, plan: null, confirmationMessage };
    }

    const order = {
      id: this._generateId('subscription_order'),
      plan_id: plan.id,
      plan_name_snapshot: plan.name,
      billing_cycle: billingCycle,
      contact_email: contactEmail,
      podcast_name: podcastName,
      created_at: this._nowIso(),
      status: 'pending',
      start_date: null,
      end_date: null
    };

    orders.push(order);
    this._saveToStorage('subscription_orders', orders);

    const confirmationMessage = 'Subscription order created for ' + plan.name + ' (' + billingCycle + ').';

    return { subscriptionOrder: order, plan, confirmationMessage };
  }

  // 45) getSubscriptionOrderSummary
  getSubscriptionOrderSummary(orderId) {
    const orders = this._getFromStorage('subscription_orders');
    const plans = this._getFromStorage('subscription_plans');

    const order = orders.find(o => o.id === orderId) || null;
    const plan = order ? (plans.find(p => p.id === order.plan_id) || null) : null;

    return { order, plan };
  }

  // 46) getAboutPageContent
  getAboutPageContent() {
    const heroTitle = 'City Voices: Audio Production & Voiceover Studio';
    const heroSubtitle = 'From script to final master, we make your sound unforgettable.';

    const story = 'City Voices is a boutique audio production and voiceover studio built for modern content creators. From indie podcasters to global brands, we provide transparent pricing, curated talent, and engineer-led production in purpose-built rooms. Whether you need a treated voiceover booth, full podcast production, or audiobook narration, our team supports every step from casting to final delivery.';

    const teamMembers = [
      {
        name: 'Jamie Lee',
        role: 'Lead Engineer & Mixer',
        bio: 'Specialises in podcast dialogue, broadcast spots, and immersive sound design.',
        photoUrl: ''
      },
      {
        name: 'Morgan Cruz',
        role: 'Producer & Voice Director',
        bio: 'Guides clients from brief to performance, keeping sessions efficient and fun.',
        photoUrl: ''
      },
      {
        name: 'Riley Chen',
        role: 'Studio Manager',
        bio: 'Oversees bookings, schedules, and makes sure every session runs on time.',
        photoUrl: ''
      }
    ];

    const facilityHighlights = [
      'Dedicated voiceover booths with ultra-low noise floor',
      'Podcast rooms with producer talkback and remote guest support',
      'Mixing suites calibrated for accurate translation across devices',
      'Broadcast-ready signal chain from mic to final limiter'
    ];

    const differentiators = [
      'Transparent, menu-based pricing for studios and services',
      'Curated roster of voice talent with clear usage terms',
      'Fast turnarounds, including 24–48 hour options on many services',
      'Bundle discounts for podcasters combining editing and mixing'
    ];

    const primaryCtas = [
      { label: 'Book a Studio', targetPage: 'studio_rental' },
      { label: 'Browse Voice Artists', targetPage: 'voice_artists' },
      { label: 'View Services', targetPage: 'services' },
      { label: 'Get an Instant Quote', targetPage: 'instant_quote' }
    ];

    return {
      heroTitle,
      heroSubtitle,
      story,
      teamMembers,
      facilityHighlights,
      differentiators,
      primaryCtas
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
