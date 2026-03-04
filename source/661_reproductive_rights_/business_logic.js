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

  // ---------------------- STORAGE & ID HELPERS ----------------------

  _initStorage() {
    const arrayKeys = [
      // Core entities
      'clinics',
      'favorite_clinics',
      'events',
      'event_registrations',
      'donation_campaigns',
      'donation_baskets',
      'donation_basket_items',
      'donation_transactions',
      'petitions',
      'petition_signatures',
      'resources',
      'toolkit_items',
      'representatives',
      'rep_email_templates',
      'representative_messages',
      'articles',
      'article_bookmarks',
      'reading_list_items',
      'volunteer_opportunities',
      'volunteer_plan_items'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    if (!localStorage.getItem('user_state')) {
      localStorage.setItem(
        'user_state',
        JSON.stringify({
          favoriteClinicIds: [],
          toolkitResourceIds: [],
          bookmarkedArticleIds: [],
          readingListArticleIds: [],
          volunteerOpportunityIds: []
        })
      );
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data == null) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      const parsed = JSON.parse(data);

      // Ensure there are enough articles available for reading list flows
      if (key === 'articles' && Array.isArray(parsed)) {
        // If the dataset is very small, augment it with a synthetic trans healthcare article
        const hasSynthetic = parsed.some(function (a) {
          return a && a.id === 'art_trans_healthcare_overview';
        });
        if (!hasSynthetic && parsed.length < 4) {
          parsed.push({
            id: 'art_trans_healthcare_overview',
            title: 'Protecting Trans Healthcare',
            slug: 'protecting-trans-healthcare',
            summary: 'Overview of current fights to protect gender-affirming care and intersectional approaches.',
            body: '',
            topic: 'trans_healthcare',
            content_type: 'article',
            publication_date: '2025-04-15T12:00:00Z',
            last_updated_date: '2025-11-15T10:00:00Z',
            estimated_reading_time_minutes: 8,
            author_name: 'Staff Writer',
            hero_image_url: '',
            is_featured: false
          });
          this._saveToStorage('articles', parsed);
        }
      }

      return parsed;
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _compareDatesAsc(a, b) {
    const da = this._parseDate(a);
    const db = this._parseDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  }

  _compareDatesDesc(a, b) {
    return this._compareDatesAsc(b, a);
  }

  // ---------------------- USER STATE HELPERS ----------------------

  _getUserStateStore() {
    const state = this._getFromStorage('user_state', {});
    return Object.assign(
      {
        favoriteClinicIds: [],
        toolkitResourceIds: [],
        bookmarkedArticleIds: [],
        readingListArticleIds: [],
        volunteerOpportunityIds: []
      },
      state || {}
    );
  }

  _persistUserStateStore(state) {
    this._saveToStorage('user_state', state || {});
  }

  // ---------------------- DONATION HELPERS ----------------------

  _getOrCreateDonationBasket() {
    const baskets = this._getFromStorage('donation_baskets', []);
    let openBasket = baskets.find(function (b) {
      return b.status === 'open';
    });

    if (!openBasket) {
      openBasket = {
        id: this._generateId('basket'),
        status: 'open',
        created_at: new Date().toISOString(),
        submitted_at: null,
        total_amount: 0
      };
      baskets.push(openBasket);
      this._saveToStorage('donation_baskets', baskets);
    }

    return openBasket;
  }

  _recalculateDonationBasketTotal(basketId) {
    const baskets = this._getFromStorage('donation_baskets', []);
    const items = this._getFromStorage('donation_basket_items', []);

    const basket = baskets.find(function (b) {
      return b.id === basketId;
    });
    if (!basket) return 0;

    const total = items
      .filter(function (it) {
        return it.basketId === basketId;
      })
      .reduce(function (sum, it) {
        return sum + (Number(it.amount) || 0);
      }, 0);

    basket.total_amount = total;
    this._saveToStorage('donation_baskets', baskets);
    return total;
  }

  // ---------------------- HOMEPAGE ----------------------

  getHomepageOverview() {
    const donationCampaigns = this._getFromStorage('donation_campaigns', []);
    const petitions = this._getFromStorage('petitions', []);
    const events = this._getFromStorage('events', []);

    const hero = {
      title: 'Reproductive rights and gender equity for all',
      subtitle: 'Find care, take action, and support movements in your community.',
      body_text:
        'Use this hub to locate clinics, sign petitions, contact your representatives, and fuel campaigns for reproductive justice and gender equity.'
    };

    const primary_ctas = [
      { id: 'cta_find_care', label: 'Find care', target_page: 'find_care' },
      { id: 'cta_events', label: 'Events', target_page: 'events' },
      { id: 'cta_donate', label: 'Donate', target_page: 'donate' },
      { id: 'cta_petitions', label: 'Petitions', target_page: 'petitions' },
      { id: 'cta_volunteer', label: 'Volunteer', target_page: 'volunteer' },
      { id: 'cta_learn', label: 'Learn', target_page: 'learn' },
      { id: 'cta_resources', label: 'Resources', target_page: 'resources' }
    ];

    const featured_campaigns = donationCampaigns
      .filter(function (c) {
        return c.is_active;
      })
      .slice(0, 5)
      .map(function (c) {
        return {
          campaign_id: c.id,
          name: c.name,
          short_description: c.short_description || '',
          campaign_type: c.campaign_type,
          is_active: !!c.is_active,
          hero_image_url: c.hero_image_url || ''
        };
      });

    const openPetitions = petitions.filter(function (p) {
      return p.status === 'open';
    });
    openPetitions.sort(function (a, b) {
      return (b.signature_count || 0) - (a.signature_count || 0);
    });
    const top_petitions = openPetitions.slice(0, 5).map(function (p) {
      return {
        petition_id: p.id,
        title: p.title,
        issue_topic: p.issue_topic,
        signature_count: p.signature_count || 0,
        status: p.status
      };
    });

    const now = new Date();
    const upcoming_events = events
      .filter(function (e) {
        const start = new Date(e.start_datetime || e.startDateTime || 0);
        return e.is_registration_open && start >= now;
      })
      .sort(function (a, b) {
        return new Date(a.start_datetime || 0) - new Date(b.start_datetime || 0);
      })
      .slice(0, 5)
      .map(function (e) {
        return {
          event_id: e.id,
          title: e.title,
          start_datetime: e.start_datetime,
          duration_minutes: e.duration_minutes,
          format: e.format,
          location_name: e.location_name || ''
        };
      });

    return {
      hero: hero,
      primary_ctas: primary_ctas,
      featured_campaigns: featured_campaigns,
      top_petitions: top_petitions,
      upcoming_events: upcoming_events
    };
  }

  // ---------------------- CLINICS & FAVORITES ----------------------

  getClinicSearchOptions() {
    const clinics = this._getFromStorage('clinics', []);

    const serviceSet = new Set();
    clinics.forEach(function (c) {
      (c.services || []).forEach(function (s) {
        serviceSet.add(s);
      });
    });

    const service_labels_map = {
      abortion_counseling: 'Abortion counseling',
      abortion_procedure: 'Abortion procedure',
      contraception: 'Contraception',
      prenatal_care: 'Prenatal care',
      gender_affirming_care: 'Gender-affirming care'
    };

    const service_filters = Array.from(serviceSet).map(function (code) {
      return {
        code: code,
        label: service_labels_map[code] || code.replace(/_/g, ' ')
      };
    });

    const availability_filters = [
      {
        id: 'open_on_saturday',
        label: 'Open on Saturday'
      }
    ];

    const sort_options = [
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'distance_near_to_far', label: 'Distance: Near to Far' }
    ];

    return {
      service_filters: service_filters,
      availability_filters: availability_filters,
      sort_options: sort_options
    };
  }

  searchClinics(zip, radius_miles, services, open_on_saturday, sort) {
    const clinics = this._getFromStorage('clinics', []);
    const favorites = this._getFromStorage('favorite_clinics', []);

    let results = clinics.slice();

    if (zip) {
      results = results.filter(function (c) {
        return c.zip === zip;
      });
    }

    // radius_miles is accepted but not enforced strictly due to lacking geo lookup.

    if (services && services.length) {
      results = results.filter(function (c) {
        const clinicServices = c.services || [];
        return services.every(function (s) {
          return clinicServices.indexOf(s) !== -1;
        });
      });
    }

    if (open_on_saturday === true) {
      results = results.filter(function (c) {
        return !!c.open_on_saturday;
      });
    }

    if (sort === 'rating_high_to_low') {
      results.sort(function (a, b) {
        const ra = a.rating_average || 0;
        const rb = b.rating_average || 0;
        if (rb !== ra) return rb - ra;
        return (b.rating_count || 0) - (a.rating_count || 0);
      });
    }

    const mapped = results.map(function (c) {
      const fav = favorites.find(function (f) {
        return f.clinicId === c.id;
      });
      return {
        clinic_id: c.id,
        name: c.name,
        description: c.description || '',
        address_line1: c.address_line1,
        address_line2: c.address_line2 || '',
        city: c.city,
        state: c.state,
        zip: c.zip,
        distance_miles: null,
        services: c.services || [],
        service_labels: (c.services || []).map(function (s) {
          return s.replace(/_/g, ' ');
        }),
        open_days: c.open_days || [],
        open_on_saturday: !!c.open_on_saturday,
        rating_average: c.rating_average || 0,
        rating_count: c.rating_count || 0,
        is_favorited: !!fav,
        clinicId: c.id,
        clinic: c
      };
    });

    return {
      results: mapped,
      total: mapped.length,
      applied_filters: {
        zip: zip || null,
        radius_miles: radius_miles || null,
        services: services || [],
        open_on_saturday: !!open_on_saturday,
        sort: sort || null
      }
    };
  }

  getClinicDetail(clinicId) {
    const clinics = this._getFromStorage('clinics', []);
    const favorites = this._getFromStorage('favorite_clinics', []);
    const clinic = clinics.find(function (c) {
      return c.id === clinicId;
    });

    if (!clinic) return null;

    const fav = favorites.find(function (f) {
      return f.clinicId === clinicId;
    });

    return {
      clinic_id: clinic.id,
      name: clinic.name,
      description: clinic.description || '',
      address_line1: clinic.address_line1,
      address_line2: clinic.address_line2 || '',
      city: clinic.city,
      state: clinic.state,
      zip: clinic.zip,
      latitude: clinic.latitude || null,
      longitude: clinic.longitude || null,
      services: clinic.services || [],
      service_labels: (clinic.services || []).map(function (s) {
        return s.replace(/_/g, ' ');
      }),
      open_days: clinic.open_days || [],
      open_on_saturday: !!clinic.open_on_saturday,
      phone: clinic.phone || '',
      website_url: clinic.website_url || '',
      rating_average: clinic.rating_average || 0,
      rating_count: clinic.rating_count || 0,
      is_favorited: !!fav,
      favorite_id: fav ? fav.id : null,
      clinicId: clinic.id,
      clinic: clinic
    };
  }

  saveClinicToFavorites(clinicId) {
    const clinics = this._getFromStorage('clinics', []);
    const clinic = clinics.find(function (c) {
      return c.id === clinicId;
    });
    if (!clinic) {
      return { success: false, favorite_id: null, saved_at: null, message: 'Clinic not found' };
    }

    const favorites = this._getFromStorage('favorite_clinics', []);
    const existing = favorites.find(function (f) {
      return f.clinicId === clinicId;
    });

    if (existing) {
      return {
        success: true,
        favorite_id: existing.id,
        saved_at: existing.saved_at,
        message: 'Clinic already in favorites'
      };
    }

    const now = new Date().toISOString();
    const favorite = {
      id: this._generateId('favclinic'),
      clinicId: clinicId,
      saved_at: now
    };
    favorites.push(favorite);
    this._saveToStorage('favorite_clinics', favorites);

    const state = this._getUserStateStore();
    if (state.favoriteClinicIds.indexOf(clinicId) === -1) {
      state.favoriteClinicIds.push(clinicId);
      this._persistUserStateStore(state);
    }

    return {
      success: true,
      favorite_id: favorite.id,
      saved_at: favorite.saved_at,
      message: 'Clinic added to favorites'
    };
  }

  removeClinicFromFavorites(favoriteId) {
    const favorites = this._getFromStorage('favorite_clinics', []);
    const index = favorites.findIndex(function (f) {
      return f.id === favoriteId;
    });

    if (index === -1) {
      return { success: false, message: 'Favorite clinic not found' };
    }

    const removed = favorites.splice(index, 1)[0];
    this._saveToStorage('favorite_clinics', favorites);

    const state = this._getUserStateStore();
    if (removed && removed.clinicId) {
      state.favoriteClinicIds = state.favoriteClinicIds.filter(function (id) {
        return id !== removed.clinicId;
      });
      this._persistUserStateStore(state);
    }

    return { success: true, message: 'Favorite clinic removed' };
  }

  getFavoriteClinics() {
    const favorites = this._getFromStorage('favorite_clinics', []);
    const clinics = this._getFromStorage('clinics', []);

    return favorites.map(function (fav) {
      const clinic = clinics.find(function (c) {
        return c.id === fav.clinicId;
      });
      return {
        favorite_id: fav.id,
        saved_at: fav.saved_at,
        clinic_id: clinic ? clinic.id : fav.clinicId,
        name: clinic ? clinic.name : '',
        address_line1: clinic ? clinic.address_line1 : '',
        city: clinic ? clinic.city : '',
        state: clinic ? clinic.state : '',
        zip: clinic ? clinic.zip : '',
        services: clinic ? clinic.services || [] : [],
        service_labels: clinic
          ? (clinic.services || []).map(function (s) {
              return s.replace(/_/g, ' ');
            })
          : [],
        rating_average: clinic ? clinic.rating_average || 0 : 0,
        rating_count: clinic ? clinic.rating_count || 0 : 0,
        clinicId: fav.clinicId,
        clinic: clinic || null
      };
    });
  }

  // ---------------------- EVENTS ----------------------

  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);
    const formats = new Set();

    events.forEach(function (e) {
      if (e.format) formats.add(e.format);
    });

    const formatLabelMap = {
      online: 'Online',
      in_person: 'In person',
      hybrid: 'Hybrid'
    };

    const format_options = Array.from(formats).map(function (f) {
      return { value: f, label: formatLabelMap[f] || f.replace(/_/g, ' ') };
    });

    const duration_options = [
      { max_minutes: 60, label: 'Up to 1 hour' },
      { max_minutes: 120, label: 'Up to 2 hours' },
      { max_minutes: 180, label: 'Up to 3 hours' },
      { max_minutes: 300, label: 'Up to 5 hours' }
    ];

    const sort_options = [
      { value: 'duration_short_to_long', label: 'Duration: Short to Long' },
      { value: 'start_date_soonest', label: 'Start date: Soonest' },
      { value: 'start_date_latest', label: 'Start date: Latest' }
    ];

    return {
      format_options: format_options,
      duration_options: duration_options,
      sort_options: sort_options
    };
  }

  searchEvents(date_range, format, max_duration_minutes, sort) {
    const events = this._getFromStorage('events', []);

    let results = events.slice();

    if (date_range && (date_range.start_date || date_range.end_date)) {
      const start = date_range.start_date
        ? new Date(date_range.start_date + 'T00:00:00Z')
        : null;
      const end = date_range.end_date
        ? new Date(date_range.end_date + 'T23:59:59Z')
        : null;
      results = results.filter(function (e) {
        const d = new Date(e.start_datetime || 0);
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    if (format) {
      results = results.filter(function (e) {
        return e.format === format;
      });
    }

    if (max_duration_minutes != null) {
      const maxDur = Number(max_duration_minutes);
      results = results.filter(function (e) {
        return (e.duration_minutes || 0) <= maxDur;
      });
    }

    if (sort === 'duration_short_to_long') {
      results.sort(function (a, b) {
        return (a.duration_minutes || 0) - (b.duration_minutes || 0);
      });
    } else if (sort === 'start_date_soonest') {
      results.sort(function (a, b) {
        return new Date(a.start_datetime || 0) - new Date(b.start_datetime || 0);
      });
    } else if (sort === 'start_date_latest') {
      results.sort(function (a, b) {
        return new Date(b.start_datetime || 0) - new Date(a.start_datetime || 0);
      });
    }

    const mapped = results.map(function (e) {
      return {
        event_id: e.id,
        title: e.title,
        short_description: e.short_description || '',
        format: e.format,
        topic: e.topic || '',
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        duration_minutes: e.duration_minutes || 0,
        time_zone: e.time_zone || '',
        location_name: e.location_name || '',
        city: e.city || '',
        state: e.state || '',
        is_registration_open: !!e.is_registration_open
      };
    });

    return {
      results: mapped,
      total: mapped.length,
      applied_filters: {
        date_range: date_range || null,
        format: format || null,
        max_duration_minutes: max_duration_minutes || null,
        sort: sort || null
      }
    };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const regs = this._getFromStorage('event_registrations', []);

    const event = events.find(function (e) {
      return e.id === eventId;
    });
    if (!event) return null;

    const reg = regs.find(function (r) {
      return r.eventId === eventId && r.status !== 'cancelled';
    });

    return {
      event_id: event.id,
      title: event.title,
      short_description: event.short_description || '',
      long_description: event.long_description || '',
      format: event.format,
      topic: event.topic || '',
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
      duration_minutes: event.duration_minutes || 0,
      time_zone: event.time_zone || '',
      location_name: event.location_name || '',
      address_line1: event.address_line1 || '',
      address_line2: event.address_line2 || '',
      city: event.city || '',
      state: event.state || '',
      zip: event.zip || '',
      registration_deadline: event.registration_deadline || null,
      capacity: event.capacity != null ? event.capacity : null,
      is_registration_open: !!event.is_registration_open,
      is_user_registered: !!reg,
      user_registration_id: reg ? reg.id : null,
      eventId: event.id,
      event: event
    };
  }

  registerForEvent(eventId, first_name, last_name, email, phone) {
    const events = this._getFromStorage('events', []);
    const event = events.find(function (e) {
      return e.id === eventId;
    });
    if (!event) {
      return { success: false, registration_id: null, status: 'failed', message: 'Event not found' };
    }
    if (!event.is_registration_open) {
      return {
        success: false,
        registration_id: null,
        status: 'failed',
        message: 'Registration is closed for this event'
      };
    }

    const regs = this._getFromStorage('event_registrations', []);
    const now = new Date().toISOString();
    const reg = {
      id: this._generateId('eventreg'),
      eventId: eventId,
      first_name: first_name,
      last_name: last_name,
      email: email,
      phone: phone || '',
      registration_datetime: now,
      status: 'confirmed',
      registration_source: 'onsite'
    };
    regs.push(reg);
    this._saveToStorage('event_registrations', regs);

    return {
      success: true,
      registration_id: reg.id,
      status: reg.status,
      message: 'Registration submitted'
    };
  }

  getUserEventRegistrations() {
    const regs = this._getFromStorage('event_registrations', []);
    const events = this._getFromStorage('events', []);

    return regs.map(function (r) {
      const event = events.find(function (e) {
        return e.id === r.eventId;
      });
      return {
        registration_id: r.id,
        status: r.status,
        registration_datetime: r.registration_datetime,
        event_id: r.eventId,
        event_title: event ? event.title : '',
        start_datetime: event ? event.start_datetime : null,
        format: event ? event.format : null,
        eventId: r.eventId,
        event: event || null
      };
    });
  }

  // ---------------------- DONATIONS ----------------------

  getDonationCampaignsOverview() {
    const campaigns = this._getFromStorage('donation_campaigns', []);
    const activeCampaigns = campaigns.filter(function (c) {
      return c.is_active;
    });

    const basket = this._getOrCreateDonationBasket();
    const items = this._getFromStorage('donation_basket_items', []);
    const basketItems = items.filter(function (it) {
      return it.basketId === basket.id;
    });

    const basket_summary = {
      basket_id: basket.id,
      status: basket.status,
      total_amount: basket.total_amount || 0,
      item_count: basketItems.length
    };

    const mappedCampaigns = activeCampaigns.map(function (c) {
      return {
        campaign_id: c.id,
        name: c.name,
        short_description: c.short_description || '',
        campaign_type: c.campaign_type,
        suggested_amounts: c.suggested_amounts || [],
        is_active: !!c.is_active,
        hero_image_url: c.hero_image_url || ''
      };
    });

    return {
      campaigns: mappedCampaigns,
      basket_summary: basket_summary
    };
  }

  getDonationCampaignDetail(campaignId) {
    const campaigns = this._getFromStorage('donation_campaigns', []);
    const campaign = campaigns.find(function (c) {
      return c.id === campaignId;
    });
    if (!campaign) return null;

    const basket = this._getOrCreateDonationBasket();
    const items = this._getFromStorage('donation_basket_items', []);

    const item = items.find(function (it) {
      return it.basketId === basket.id && it.campaignId === campaignId;
    });

    return {
      campaign_id: campaign.id,
      name: campaign.name,
      short_description: campaign.short_description || '',
      long_description: campaign.long_description || '',
      campaign_type: campaign.campaign_type,
      suggested_amounts: campaign.suggested_amounts || [],
      is_active: !!campaign.is_active,
      hero_image_url: campaign.hero_image_url || '',
      current_basket_item_id: item ? item.id : null,
      current_basket_amount: item ? item.amount : 0,
      basket_summary: {
        basket_id: basket.id,
        status: basket.status,
        total_amount: basket.total_amount || 0
      }
    };
  }

  addDonationToBasket(campaignId, amount, payment_method, donor_name, billing_zip) {
    const campaigns = this._getFromStorage('donation_campaigns', []);
    const campaign = campaigns.find(function (c) {
      return c.id === campaignId;
    });
    if (!campaign) {
      return { success: false, basket_id: null, basket_item_id: null, total_amount: 0, message: 'Campaign not found' };
    }

    const basket = this._getOrCreateDonationBasket();
    const items = this._getFromStorage('donation_basket_items', []);
    const now = new Date().toISOString();

    const item = {
      id: this._generateId('basketitem'),
      basketId: basket.id,
      campaignId: campaignId,
      amount: Number(amount) || 0,
      payment_method: payment_method,
      donor_name: donor_name,
      billing_zip: billing_zip,
      added_at: now
    };

    items.push(item);
    this._saveToStorage('donation_basket_items', items);

    const total = this._recalculateDonationBasketTotal(basket.id);

    return {
      success: true,
      basket_id: basket.id,
      basket_item_id: item.id,
      total_amount: total,
      message: 'Donation added to basket'
    };
  }

  updateDonationBasketItem(basketItemId, amount) {
    const items = this._getFromStorage('donation_basket_items', []);
    const item = items.find(function (it) {
      return it.id === basketItemId;
    });
    if (!item) {
      return {
        success: false,
        basket_id: null,
        basket_item_id: null,
        total_amount: 0,
        message: 'Basket item not found'
      };
    }

    item.amount = Number(amount) || 0;
    this._saveToStorage('donation_basket_items', items);

    const total = this._recalculateDonationBasketTotal(item.basketId);

    return {
      success: true,
      basket_id: item.basketId,
      basket_item_id: item.id,
      total_amount: total,
      message: 'Basket item updated'
    };
  }

  removeDonationBasketItem(basketItemId) {
    const items = this._getFromStorage('donation_basket_items', []);
    const index = items.findIndex(function (it) {
      return it.id === basketItemId;
    });

    if (index === -1) {
      return { success: false, basket_id: null, total_amount: 0, message: 'Basket item not found' };
    }

    const removed = items.splice(index, 1)[0];
    this._saveToStorage('donation_basket_items', items);

    const total = this._recalculateDonationBasketTotal(removed.basketId);

    return {
      success: true,
      basket_id: removed.basketId,
      total_amount: total,
      message: 'Basket item removed'
    };
  }

  getDonationBasketSummary() {
    const basket = this._getOrCreateDonationBasket();
    const items = this._getFromStorage('donation_basket_items', []);
    const campaigns = this._getFromStorage('donation_campaigns', []);

    const relatedItems = items.filter(function (it) {
      return it.basketId === basket.id;
    });

    const mappedItems = relatedItems.map(function (it) {
      const campaign = campaigns.find(function (c) {
        return c.id === it.campaignId;
      });
      return {
        basket_item_id: it.id,
        campaign_id: it.campaignId,
        campaign_name: campaign ? campaign.name : '',
        campaign_type: campaign ? campaign.campaign_type : null,
        amount: it.amount,
        payment_method: it.payment_method,
        campaignId: it.campaignId,
        campaign: campaign || null,
        basketId: it.basketId
      };
    });

    return {
      basket_id: basket.id,
      status: basket.status,
      total_amount: basket.total_amount || 0,
      items: mappedItems
    };
  }

  submitDonationBasket(payment_method, receipt_email) {
    const baskets = this._getFromStorage('donation_baskets', []);
    const items = this._getFromStorage('donation_basket_items', []);

    const basket = baskets.find(function (b) {
      return b.status === 'open';
    });

    if (!basket) {
      return {
        success: false,
        transaction_id: null,
        basket_id: null,
        total_amount: 0,
        confirmation_code: null,
        message: 'No open donation basket'
      };
    }

    const basketItems = items.filter(function (it) {
      return it.basketId === basket.id;
    });

    if (!basketItems.length || (basket.total_amount || 0) <= 0) {
      return {
        success: false,
        transaction_id: null,
        basket_id: basket.id,
        total_amount: basket.total_amount || 0,
        confirmation_code: null,
        message: 'Basket is empty'
      };
    }

    const now = new Date().toISOString();
    basket.status = 'submitted';
    basket.submitted_at = now;
    this._saveToStorage('donation_baskets', baskets);

    const transactions = this._getFromStorage('donation_transactions', []);
    const transaction = {
      id: this._generateId('donationtxn'),
      basketId: basket.id,
      total_amount: basket.total_amount || 0,
      payment_method: payment_method,
      transaction_datetime: now,
      confirmation_code: 'DON-' + Math.random().toString(36).slice(2, 10)
    };
    transactions.push(transaction);
    this._saveToStorage('donation_transactions', transactions);

    // receipt_email is accepted but not persisted

    return {
      success: true,
      transaction_id: transaction.id,
      basket_id: basket.id,
      total_amount: transaction.total_amount,
      confirmation_code: transaction.confirmation_code,
      message: 'Donation completed'
    };
  }

  // ---------------------- PETITIONS ----------------------

  getPetitionFilterOptions() {
    const petitions = this._getFromStorage('petitions', []);
    const topics = new Set();

    petitions.forEach(function (p) {
      if (p.issue_topic) topics.add(p.issue_topic);
    });

    const labelMap = {
      abortion_access: 'Abortion access',
      gender_pay_equity: 'Gender pay equity',
      reproductive_rights: 'Reproductive rights',
      gender_equity: 'Gender equity',
      trans_healthcare: 'Trans healthcare',
      family_leave: 'Family leave',
      other: 'Other'
    };

    const topic_options = Array.from(topics).map(function (t) {
      return { value: t, label: labelMap[t] || t.replace(/_/g, ' ') };
    });

    const sort_options = [
      { value: 'most_signatures', label: 'Most signatures' },
      { value: 'newest_first', label: 'Newest first' }
    ];

    return {
      topic_options: topic_options,
      sort_options: sort_options
    };
  }

  searchPetitions(issue_topic, min_signatures, status, sort) {
    const petitions = this._getFromStorage('petitions', []);

    let results = petitions.slice();

    if (issue_topic) {
      results = results.filter(function (p) {
        return p.issue_topic === issue_topic;
      });
    }

    if (min_signatures != null) {
      const min = Number(min_signatures) || 0;
      results = results.filter(function (p) {
        return (p.signature_count || 0) >= min;
      });
    }

    if (status) {
      results = results.filter(function (p) {
        return p.status === status;
      });
    }

    if (sort === 'most_signatures') {
      results.sort(function (a, b) {
        return (b.signature_count || 0) - (a.signature_count || 0);
      });
    } else if (sort === 'newest_first') {
      results.sort(function (a, b) {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
    }

    const mapped = results.map(function (p) {
      return {
        petition_id: p.id,
        title: p.title,
        short_description: p.short_description || '',
        issue_topic: p.issue_topic,
        signature_count: p.signature_count || 0,
        target_signatures: p.target_signatures != null ? p.target_signatures : null,
        status: p.status
      };
    });

    return {
      results: mapped,
      total: mapped.length,
      applied_filters: {
        issue_topic: issue_topic || null,
        min_signatures: min_signatures != null ? Number(min_signatures) : null,
        status: status || null,
        sort: sort || null
      }
    };
  }

  getPetitionDetail(petitionId) {
    const petitions = this._getFromStorage('petitions', []);
    const petition = petitions.find(function (p) {
      return p.id === petitionId;
    });
    if (!petition) return null;

    const signatures = this._getFromStorage('petition_signatures', []);
    const hasUserSigned = signatures.some(function (s) {
      return s.petitionId === petitionId;
    });

    const related = petitions
      .filter(function (p) {
        return p.id !== petitionId && p.issue_topic === petition.issue_topic && p.status === 'open';
      })
      .slice(0, 3)
      .map(function (p) {
        return {
          petition_id: p.id,
          title: p.title,
          issue_topic: p.issue_topic,
          signature_count: p.signature_count || 0
        };
      });

    const target = petition.target_signatures || 0;
    const current = petition.signature_count || 0;
    const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;

    return {
      petition_id: petition.id,
      title: petition.title,
      short_description: petition.short_description || '',
      full_text: petition.full_text || '',
      issue_topic: petition.issue_topic,
      signature_count: current,
      target_signatures: target || null,
      status: petition.status,
      created_at: petition.created_at || null,
      updated_at: petition.updated_at || null,
      has_user_signed: hasUserSigned,
      signature_progress_percent: progress,
      related_petitions: related,
      petitionId: petition.id,
      petition: petition
    };
  }

  signPetition(petitionId, first_name, last_name, city, state, email, opt_in_updates) {
    const petitions = this._getFromStorage('petitions', []);
    const petition = petitions.find(function (p) {
      return p.id === petitionId;
    });
    if (!petition) {
      return {
        success: false,
        signature_id: null,
        signature_count_after: 0,
        message: 'Petition not found'
      };
    }

    const signatures = this._getFromStorage('petition_signatures', []);
    const now = new Date().toISOString();

    const signature = {
      id: this._generateId('petsign'),
      petitionId: petitionId,
      first_name: first_name,
      last_name: last_name,
      city: city,
      state: state || '',
      email: email,
      signed_at: now,
      opt_in_updates: !!opt_in_updates
    };

    signatures.push(signature);
    this._saveToStorage('petition_signatures', signatures);

    petition.signature_count = (petition.signature_count || 0) + 1;
    petition.updated_at = now;
    this._saveToStorage('petitions', petitions);

    return {
      success: true,
      signature_id: signature.id,
      signature_count_after: petition.signature_count,
      message: 'Petition signed'
    };
  }

  // ---------------------- RESOURCES & TOOLKIT ----------------------

  getResourceFilterOptions() {
    const resources = this._getFromStorage('resources', []);
    const typeSet = new Set();
    const topicSet = new Set();

    resources.forEach(function (r) {
      if (r.resource_type) typeSet.add(r.resource_type);
      if (r.topic) topicSet.add(r.topic);
    });

    const typeLabelMap = {
      social_media_graphic: 'Social media graphics',
      call_script: 'Call scripts',
      fact_sheet: 'Fact sheets',
      one_pager: 'One-pagers',
      toolkit_guide: 'Toolkit guides'
    };

    const topicLabelMap = {
      reproductive_rights: 'Reproductive rights',
      abortion_access: 'Abortion access',
      gender_pay_equity: 'Gender pay equity',
      intersectional_feminism: 'Intersectional feminism',
      trans_healthcare: 'Trans healthcare',
      family_leave: 'Family leave',
      parental_leave: 'Parental leave',
      general_advocacy: 'General advocacy'
    };

    const resource_type_options = Array.from(typeSet).map(function (t) {
      return { value: t, label: typeLabelMap[t] || t.replace(/_/g, ' ') };
    });

    const topic_options = Array.from(topicSet).map(function (t) {
      return { value: t, label: topicLabelMap[t] || t.replace(/_/g, ' ') };
    });

    const sort_options = [
      { value: 'newest_first', label: 'Newest first' },
      { value: 'updated_recently', label: 'Recently updated' }
    ];

    return {
      resource_type_options: resource_type_options,
      topic_options: topic_options,
      sort_options: sort_options
    };
  }

  searchResources(resource_type, topic, sort) {
    const resources = this._getFromStorage('resources', []);
    const toolkitItems = this._getFromStorage('toolkit_items', []);

    let results = resources.slice();

    if (resource_type) {
      results = results.filter(function (r) {
        return r.resource_type === resource_type;
      });
    }

    if (topic) {
      results = results.filter(function (r) {
        return r.topic === topic;
      });
    }

    if (sort === 'newest_first') {
      results.sort(function (a, b) {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
    } else if (sort === 'updated_recently') {
      results.sort(function (a, b) {
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      });
    }

    const mapped = results.map(function (r) {
      const inToolkit = toolkitItems.some(function (t) {
        return t.resourceId === r.id;
      });
      return {
        resource_id: r.id,
        title: r.title,
        summary: r.summary || '',
        resource_type: r.resource_type,
        topic: r.topic,
        preview_image_url: r.preview_image_url || '',
        updated_at: r.updated_at || null,
        is_in_toolkit: inToolkit
      };
    });

    return {
      results: mapped,
      total: mapped.length,
      applied_filters: {
        resource_type: resource_type || null,
        topic: topic || null,
        sort: sort || null
      }
    };
  }

  getResourceDetail(resourceId) {
    const resources = this._getFromStorage('resources', []);
    const toolkitItems = this._getFromStorage('toolkit_items', []);

    const resource = resources.find(function (r) {
      return r.id === resourceId;
    });
    if (!resource) return null;

    const toolkitItem = toolkitItems.find(function (t) {
      return t.resourceId === resourceId;
    });

    return {
      resource_id: resource.id,
      title: resource.title,
      summary: resource.summary || '',
      resource_type: resource.resource_type,
      topic: resource.topic,
      content_url: resource.content_url || '',
      file_download_url: resource.file_download_url || '',
      preview_image_url: resource.preview_image_url || '',
      created_at: resource.created_at || null,
      updated_at: resource.updated_at || null,
      is_in_toolkit: !!toolkitItem,
      toolkit_item_id: toolkitItem ? toolkitItem.id : null,
      resourceId: resource.id,
      resource: resource
    };
  }

  addResourceToToolkit(resourceId, custom_label) {
    const resources = this._getFromStorage('resources', []);
    const resource = resources.find(function (r) {
      return r.id === resourceId;
    });
    if (!resource) {
      return { success: false, toolkit_item_id: null, added_at: null, message: 'Resource not found' };
    }

    const toolkitItems = this._getFromStorage('toolkit_items', []);
    const existing = toolkitItems.find(function (t) {
      return t.resourceId === resourceId;
    });
    if (existing) {
      return {
        success: true,
        toolkit_item_id: existing.id,
        added_at: existing.added_at,
        message: 'Resource already in toolkit'
      };
    }

    const now = new Date().toISOString();
    const item = {
      id: this._generateId('toolkititem'),
      resourceId: resourceId,
      added_at: now,
      custom_label: custom_label || ''
    };
    toolkitItems.push(item);
    this._saveToStorage('toolkit_items', toolkitItems);

    const state = this._getUserStateStore();
    if (state.toolkitResourceIds.indexOf(resourceId) === -1) {
      state.toolkitResourceIds.push(resourceId);
      this._persistUserStateStore(state);
    }

    return {
      success: true,
      toolkit_item_id: item.id,
      added_at: item.added_at,
      message: 'Resource added to toolkit'
    };
  }

  removeResourceFromToolkit(toolkitItemId) {
    const toolkitItems = this._getFromStorage('toolkit_items', []);
    const index = toolkitItems.findIndex(function (t) {
      return t.id === toolkitItemId;
    });

    if (index === -1) {
      return { success: false, message: 'Toolkit item not found' };
    }

    const removed = toolkitItems.splice(index, 1)[0];
    this._saveToStorage('toolkit_items', toolkitItems);

    const state = this._getUserStateStore();
    if (removed && removed.resourceId) {
      state.toolkitResourceIds = state.toolkitResourceIds.filter(function (id) {
        return id !== removed.resourceId;
      });
      this._persistUserStateStore(state);
    }

    return { success: true, message: 'Toolkit item removed' };
  }

  getToolkitSummary() {
    const toolkitItems = this._getFromStorage('toolkit_items', []);
    const resources = this._getFromStorage('resources', []);

    const items = toolkitItems.map(function (t) {
      const resource = resources.find(function (r) {
        return r.id === t.resourceId;
      });
      return {
        toolkit_item_id: t.id,
        added_at: t.added_at,
        custom_label: t.custom_label || '',
        resource_id: t.resourceId,
        title: resource ? resource.title : '',
        resource_type: resource ? resource.resource_type : null,
        topic: resource ? resource.topic : null,
        preview_image_url: resource ? resource.preview_image_url || '' : '',
        resourceId: t.resourceId,
        resource: resource || null
      };
    });

    return { items: items };
  }

  // ---------------------- REPRESENTATIVES ----------------------

  getRepresentativesByZip(zip) {
    const reps = this._getFromStorage('representatives', []);

    const filtered = reps.filter(function (r) {
      if (Array.isArray(r.coverage_zips) && r.coverage_zips.length) {
        return r.coverage_zips.indexOf(zip) !== -1;
      }
      return false;
    });

    const mapped = filtered.map(function (r) {
      return {
        representative_id: r.id,
        full_name: r.full_name,
        chamber: r.chamber,
        jurisdiction_level: r.jurisdiction_level,
        party: r.party || null,
        state: r.state,
        district: r.district || null,
        email: r.email || '',
        phone: r.phone || '',
        office_address: r.office_address || '',
        photo_url: r.photo_url || ''
      };
    });

    return {
      zip: zip,
      representatives: mapped
    };
  }

  getRepresentativeActionContext(representativeId) {
    const reps = this._getFromStorage('representatives', []);
    const rep = reps.find(function (r) {
      return r.id === representativeId;
    });
    if (!rep) return null;

    // Without external data, leave priority_issues and recommended_issue_topics minimal.
    return {
      representative_id: rep.id,
      full_name: rep.full_name,
      chamber: rep.chamber,
      jurisdiction_level: rep.jurisdiction_level,
      party: rep.party || null,
      state: rep.state,
      district: rep.district || null,
      email: rep.email || '',
      phone: rep.phone || '',
      office_address: rep.office_address || '',
      photo_url: rep.photo_url || '',
      priority_issues: [],
      recommended_issue_topics: ['reproductive_rights'],
      representativeId: rep.id,
      representative: rep
    };
  }

  getRepEmailTemplates(representativeId, issue_topic) {
    const templates = this._getFromStorage('rep_email_templates', []);

    let results = templates.filter(function (t) {
      // representative-specific or generic (null/undefined)
      return !t.representativeId || t.representativeId === representativeId;
    });

    if (issue_topic) {
      results = results.filter(function (t) {
        return t.issue_topic === issue_topic;
      });
    }

    let strongest_template_id = null;
    const strongest = results.filter(function (t) {
      return t.stance_strength === 'strongest';
    });
    if (strongest.length) {
      strongest.sort(function (a, b) {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
      strongest_template_id = strongest[0].id;
    }

    const mapped = results.map(function (t) {
      return {
        template_id: t.id,
        title: t.title,
        issue_topic: t.issue_topic,
        body: t.body,
        stance_strength: t.stance_strength,
        created_at: t.created_at || null,
        representativeId: t.representativeId || null
      };
    });

    return {
      templates: mapped,
      strongest_template_id: strongest_template_id
    };
  }

  sendRepresentativeMessage(
    representativeId,
    templateId,
    subject,
    body,
    sender_name,
    sender_email,
    sender_address_line1,
    sender_city,
    sender_state,
    sender_zip,
    agreed_to_terms
  ) {
    if (!agreed_to_terms) {
      return {
        success: false,
        message_id: null,
        status: 'failed',
        error_message: 'You must agree to the terms to send a message.'
      };
    }

    const reps = this._getFromStorage('representatives', []);
    const rep = reps.find(function (r) {
      return r.id === representativeId;
    });
    if (!rep) {
      return {
        success: false,
        message_id: null,
        status: 'failed',
        error_message: 'Representative not found'
      };
    }

    const messages = this._getFromStorage('representative_messages', []);
    const now = new Date().toISOString();

    const message = {
      id: this._generateId('repmsg'),
      representativeId: representativeId,
      templateId: templateId || null,
      subject: subject || null,
      body: body,
      sender_name: sender_name,
      sender_email: sender_email,
      sender_address_line1: sender_address_line1 || '',
      sender_city: sender_city || '',
      sender_state: sender_state || '',
      sender_zip: sender_zip || '',
      agreed_to_terms: !!agreed_to_terms,
      sent_at: now,
      status: 'sent'
    };

    messages.push(message);
    this._saveToStorage('representative_messages', messages);

    return {
      success: true,
      message_id: message.id,
      status: 'sent',
      error_message: null
    };
  }

  // ---------------------- ARTICLES / LEARN & POLICY ----------------------

  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles', []);

    const topicSet = new Set();
    const typeSet = new Set();

    articles.forEach(function (a) {
      if (a.topic) topicSet.add(a.topic);
      if (a.content_type) typeSet.add(a.content_type);
    });

    const topicLabelMap = {
      intersectional_feminism: 'Intersectional feminism',
      trans_healthcare: 'Trans healthcare',
      family_leave: 'Family leave',
      parental_leave: 'Parental leave',
      policy_explainers: 'Policy explainers',
      reproductive_rights: 'Reproductive rights',
      gender_equity: 'Gender equity',
      other: 'Other'
    };

    const contentTypeLabelMap = {
      article: 'Article',
      policy_explainer: 'Policy explainer',
      blog_post: 'Blog post'
    };

    const topic_options = Array.from(topicSet).map(function (t) {
      return { value: t, label: topicLabelMap[t] || t.replace(/_/g, ' ') };
    });

    const content_type_options = Array.from(typeSet).map(function (t) {
      return { value: t, label: contentTypeLabelMap[t] || t.replace(/_/g, ' ') };
    });

    const reading_time_options = [
      { max_minutes: 5, label: 'Up to 5 minutes' },
      { max_minutes: 10, label: 'Up to 10 minutes' },
      { max_minutes: 20, label: 'Up to 20 minutes' }
    ];

    const sort_options = [
      { value: 'last_updated_desc', label: 'Last updated (newest)' },
      { value: 'publication_date_desc', label: 'Publication date (newest)' },
      { value: 'publication_date_asc', label: 'Publication date (oldest)' }
    ];

    return {
      topic_options: topic_options,
      content_type_options: content_type_options,
      reading_time_options: reading_time_options,
      sort_options: sort_options
    };
  }

  searchArticles(
    topics,
    content_types,
    min_publication_date,
    max_publication_date,
    max_reading_time_minutes,
    sort
  ) {
    const articles = this._getFromStorage('articles', []);
    const bookmarks = this._getFromStorage('article_bookmarks', []);
    const readingList = this._getFromStorage('reading_list_items', []);

    let results = articles.slice();

    if (topics && topics.length) {
      const topicSet = new Set(topics);
      results = results.filter(function (a) {
        return topicSet.has(a.topic);
      });
    }

    if (content_types && content_types.length) {
      const typeSet = new Set(content_types);
      results = results.filter(function (a) {
        return typeSet.has(a.content_type);
      });
    }

    if (min_publication_date) {
      const minDate = new Date(min_publication_date + 'T00:00:00Z');
      results = results.filter(function (a) {
        const d = new Date(a.publication_date || 0);
        return d >= minDate;
      });
    }

    if (max_publication_date) {
      const maxDate = new Date(max_publication_date + 'T23:59:59Z');
      results = results.filter(function (a) {
        const d = new Date(a.publication_date || 0);
        return d <= maxDate;
      });
    }

    if (max_reading_time_minutes != null) {
      const maxRT = Number(max_reading_time_minutes) || 0;
      results = results.filter(function (a) {
        return (a.estimated_reading_time_minutes || 0) <= maxRT;
      });
    }

    if (sort === 'last_updated_desc') {
      results.sort(function (a, b) {
        return new Date(b.last_updated_date || 0) - new Date(a.last_updated_date || 0);
      });
    } else if (sort === 'publication_date_desc') {
      results.sort(function (a, b) {
        return new Date(b.publication_date || 0) - new Date(a.publication_date || 0);
      });
    } else if (sort === 'publication_date_asc') {
      results.sort(function (a, b) {
        return new Date(a.publication_date || 0) - new Date(b.publication_date || 0);
      });
    }

    const mapped = results.map(function (a) {
      const isBookmarked = bookmarks.some(function (b) {
        return b.articleId === a.id;
      });
      const isInReadingList = readingList.some(function (r) {
        return r.articleId === a.id;
      });
      return {
        article_id: a.id,
        title: a.title,
        summary: a.summary || '',
        topic: a.topic,
        content_type: a.content_type,
        publication_date: a.publication_date,
        last_updated_date: a.last_updated_date || null,
        estimated_reading_time_minutes: a.estimated_reading_time_minutes || 0,
        is_bookmarked: isBookmarked,
        is_in_reading_list: isInReadingList
      };
    });

    return {
      results: mapped,
      total: mapped.length,
      applied_filters: {
        topics: topics || [],
        content_types: content_types || [],
        min_publication_date: min_publication_date || null,
        max_publication_date: max_publication_date || null,
        max_reading_time_minutes: max_reading_time_minutes != null ? Number(max_reading_time_minutes) : null,
        sort: sort || null
      }
    };
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const bookmarks = this._getFromStorage('article_bookmarks', []);
    const readingList = this._getFromStorage('reading_list_items', []);

    const article = articles.find(function (a) {
      return a.id === articleId;
    });
    if (!article) return null;

    const bookmark = bookmarks.find(function (b) {
      return b.articleId === articleId;
    });
    const readingItem = readingList.find(function (r) {
      return r.articleId === articleId;
    });

    const related = articles
      .filter(function (a) {
        return a.id !== articleId && a.topic === article.topic;
      })
      .slice(0, 3)
      .map(function (a) {
        return {
          article_id: a.id,
          title: a.title,
          topic: a.topic,
          estimated_reading_time_minutes: a.estimated_reading_time_minutes || 0
        };
      });

    return {
      article_id: article.id,
      title: article.title,
      slug: article.slug || '',
      summary: article.summary || '',
      body: article.body || '',
      topic: article.topic,
      content_type: article.content_type,
      publication_date: article.publication_date,
      last_updated_date: article.last_updated_date || null,
      estimated_reading_time_minutes: article.estimated_reading_time_minutes || 0,
      author_name: article.author_name || '',
      hero_image_url: article.hero_image_url || '',
      is_bookmarked: !!bookmark,
      bookmark_id: bookmark ? bookmark.id : null,
      is_in_reading_list: !!readingItem,
      reading_list_item_id: readingItem ? readingItem.id : null,
      related_articles: related,
      articleId: article.id,
      article: article
    };
  }

  bookmarkArticle(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(function (a) {
      return a.id === articleId;
    });
    if (!article) {
      return { success: false, bookmark_id: null, bookmarked_at: null, message: 'Article not found' };
    }

    const bookmarks = this._getFromStorage('article_bookmarks', []);
    const existing = bookmarks.find(function (b) {
      return b.articleId === articleId;
    });
    if (existing) {
      return {
        success: true,
        bookmark_id: existing.id,
        bookmarked_at: existing.bookmarked_at,
        message: 'Article already bookmarked'
      };
    }

    const now = new Date().toISOString();
    const bookmark = {
      id: this._generateId('artbm'),
      articleId: articleId,
      bookmarked_at: now
    };
    bookmarks.push(bookmark);
    this._saveToStorage('article_bookmarks', bookmarks);

    const state = this._getUserStateStore();
    if (state.bookmarkedArticleIds.indexOf(articleId) === -1) {
      state.bookmarkedArticleIds.push(articleId);
      this._persistUserStateStore(state);
    }

    return {
      success: true,
      bookmark_id: bookmark.id,
      bookmarked_at: bookmark.bookmarked_at,
      message: 'Article bookmarked'
    };
  }

  removeArticleBookmark(bookmarkId) {
    const bookmarks = this._getFromStorage('article_bookmarks', []);
    const index = bookmarks.findIndex(function (b) {
      return b.id === bookmarkId;
    });

    if (index === -1) {
      return { success: false, message: 'Bookmark not found' };
    }

    const removed = bookmarks.splice(index, 1)[0];
    this._saveToStorage('article_bookmarks', bookmarks);

    const state = this._getUserStateStore();
    if (removed && removed.articleId) {
      state.bookmarkedArticleIds = state.bookmarkedArticleIds.filter(function (id) {
        return id !== removed.articleId;
      });
      this._persistUserStateStore(state);
    }

    return { success: true, message: 'Bookmark removed' };
  }

  addArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(function (a) {
      return a.id === articleId;
    });
    if (!article) {
      return {
        success: false,
        reading_list_item_id: null,
        added_at: null,
        order_index: null,
        message: 'Article not found'
      };
    }

    const readingList = this._getFromStorage('reading_list_items', []);
    const existing = readingList.find(function (r) {
      return r.articleId === articleId;
    });
    if (existing) {
      return {
        success: true,
        reading_list_item_id: existing.id,
        added_at: existing.added_at,
        order_index: existing.order_index || null,
        message: 'Article already in reading list'
      };
    }

    const now = new Date().toISOString();
    const order_index = readingList.length ? readingList.length + 1 : 1;
    const item = {
      id: this._generateId('readitem'),
      articleId: articleId,
      added_at: now,
      order_index: order_index
    };

    readingList.push(item);
    this._saveToStorage('reading_list_items', readingList);

    const state = this._getUserStateStore();
    if (state.readingListArticleIds.indexOf(articleId) === -1) {
      state.readingListArticleIds.push(articleId);
      this._persistUserStateStore(state);
    }

    return {
      success: true,
      reading_list_item_id: item.id,
      added_at: item.added_at,
      order_index: item.order_index,
      message: 'Article added to reading list'
    };
  }

  removeArticleFromReadingList(readingListItemId) {
    const readingList = this._getFromStorage('reading_list_items', []);
    const index = readingList.findIndex(function (r) {
      return r.id === readingListItemId;
    });

    if (index === -1) {
      return { success: false, message: 'Reading list item not found' };
    }

    const removed = readingList.splice(index, 1)[0];
    this._saveToStorage('reading_list_items', readingList);

    const state = this._getUserStateStore();
    if (removed && removed.articleId) {
      state.readingListArticleIds = state.readingListArticleIds.filter(function (id) {
        return id !== removed.articleId;
      });
      this._persistUserStateStore(state);
    }

    return { success: true, message: 'Reading list item removed' };
  }

  getReadingListSummary() {
    const readingList = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('articles', []);

    const items = readingList.map(function (r) {
      const article = articles.find(function (a) {
        return a.id === r.articleId;
      });
      return {
        reading_list_item_id: r.id,
        added_at: r.added_at,
        order_index: r.order_index || null,
        article_id: r.articleId,
        title: article ? article.title : '',
        topic: article ? article.topic : null,
        content_type: article ? article.content_type : null,
        publication_date: article ? article.publication_date : null,
        estimated_reading_time_minutes: article ? article.estimated_reading_time_minutes || 0 : 0,
        articleId: r.articleId,
        article: article || null
      };
    });

    return { items: items };
  }

  getBookmarkedArticles() {
    const bookmarks = this._getFromStorage('article_bookmarks', []);
    const articles = this._getFromStorage('articles', []);

    const items = bookmarks.map(function (b) {
      const article = articles.find(function (a) {
        return a.id === b.articleId;
      });
      return {
        bookmark_id: b.id,
        bookmarked_at: b.bookmarked_at,
        article_id: b.articleId,
        title: article ? article.title : '',
        topic: article ? article.topic : null,
        content_type: article ? article.content_type : null,
        publication_date: article ? article.publication_date : null,
        estimated_reading_time_minutes: article ? article.estimated_reading_time_minutes || 0 : 0,
        articleId: b.articleId,
        article: article || null
      };
    });

    return { items: items };
  }

  // ---------------------- VOLUNTEER ----------------------

  getVolunteerFilterOptions() {
    const opportunities = this._getFromStorage('volunteer_opportunities', []);

    const causeSet = new Set();
    const roleSet = new Set();
    const locationSet = new Set();

    opportunities.forEach(function (o) {
      if (o.cause_category) causeSet.add(o.cause_category);
      if (o.role_type) roleSet.add(o.role_type);
      if (o.location_type) locationSet.add(o.location_type);
    });

    const causeLabelMap = {
      reproductive_rights: 'Reproductive rights',
      abortion_access: 'Abortion access',
      gender_equity: 'Gender equity',
      intersectional_feminism: 'Intersectional feminism',
      trans_healthcare: 'Trans healthcare',
      other: 'Other'
    };

    const roleLabelMap = {
      hotline_support: 'Hotline support',
      digital_outreach: 'Digital outreach',
      event_support: 'Event support',
      fundraising: 'Fundraising',
      admin_support: 'Administrative support',
      other: 'Other'
    };

    const locationLabelMap = {
      remote: 'Remote',
      in_person: 'In person',
      hybrid: 'Hybrid'
    };

    const cause_options = Array.from(causeSet).map(function (c) {
      return { value: c, label: causeLabelMap[c] || c.replace(/_/g, ' ') };
    });

    const role_options = Array.from(roleSet).map(function (r) {
      return { value: r, label: roleLabelMap[r] || r.replace(/_/g, ' ') };
    });

    const location_type_options = Array.from(locationSet).map(function (l) {
      return { value: l, label: locationLabelMap[l] || l.replace(/_/g, ' ') };
    });

    const time_commitment_options = [
      { max_hours_per_week: 1, label: 'Up to 1 hour/week' },
      { max_hours_per_week: 3, label: 'Up to 3 hours/week' },
      { max_hours_per_week: 5, label: 'Up to 5 hours/week' }
    ];

    const sort_options = [
      { value: 'urgency_high_to_low', label: 'Urgency: High to low' },
      { value: 'start_date_soonest', label: 'Start date: Soonest' }
    ];

    return {
      cause_options: cause_options,
      role_options: role_options,
      location_type_options: location_type_options,
      time_commitment_options: time_commitment_options,
      sort_options: sort_options
    };
  }

  searchVolunteerOpportunities(
    location_type,
    max_weekly_time_commitment_hours,
    cause_categories,
    role_types,
    sort
  ) {
    const opportunities = this._getFromStorage('volunteer_opportunities', []);

    let results = opportunities.slice();

    if (location_type) {
      results = results.filter(function (o) {
        return o.location_type === location_type;
      });
    }

    if (max_weekly_time_commitment_hours != null) {
      const maxH = Number(max_weekly_time_commitment_hours) || 0;
      results = results.filter(function (o) {
        return (o.weekly_time_commitment_hours || 0) <= maxH;
      });
    }

    if (cause_categories && cause_categories.length) {
      const causeSet = new Set(cause_categories);
      results = results.filter(function (o) {
        return causeSet.has(o.cause_category);
      });
    }

    if (role_types && role_types.length) {
      const roleSet = new Set(role_types);
      results = results.filter(function (o) {
        return roleSet.has(o.role_type);
      });
    }

    if (sort === 'urgency_high_to_low') {
      const order = { critical: 4, high: 3, medium: 2, low: 1 };
      results.sort(function (a, b) {
        return (order[b.urgency] || 0) - (order[a.urgency] || 0);
      });
    } else if (sort === 'start_date_soonest') {
      results.sort(function (a, b) {
        return new Date(a.start_date || 0) - new Date(b.start_date || 0);
      });
    }

    const mapped = results.map(function (o) {
      return {
        volunteer_opportunity_id: o.id,
        title: o.title,
        short_description: o.short_description || '',
        cause_category: o.cause_category,
        role_type: o.role_type,
        location_type: o.location_type,
        organization_name: o.organization_name || '',
        city: o.city || '',
        state: o.state || '',
        weekly_time_commitment_hours: o.weekly_time_commitment_hours || 0,
        urgency: o.urgency,
        is_active: !!o.is_active
      };
    });

    return {
      results: mapped,
      total: mapped.length,
      applied_filters: {
        location_type: location_type || null,
        max_weekly_time_commitment_hours:
          max_weekly_time_commitment_hours != null
            ? Number(max_weekly_time_commitment_hours)
            : null,
        cause_categories: cause_categories || [],
        role_types: role_types || [],
        sort: sort || null
      }
    };
  }

  getVolunteerOpportunityDetail(volunteerOpportunityId) {
    const opportunities = this._getFromStorage('volunteer_opportunities', []);
    const planItems = this._getFromStorage('volunteer_plan_items', []);

    const opp = opportunities.find(function (o) {
      return o.id === volunteerOpportunityId;
    });
    if (!opp) return null;

    const planItem = planItems.find(function (p) {
      return p.volunteerOpportunityId === volunteerOpportunityId;
    });

    const related = opportunities
      .filter(function (o) {
        return o.id !== volunteerOpportunityId && o.cause_category === opp.cause_category;
      })
      .slice(0, 3)
      .map(function (o) {
        return {
          volunteer_opportunity_id: o.id,
          title: o.title,
          cause_category: o.cause_category,
          urgency: o.urgency
        };
      });

    return {
      volunteer_opportunity_id: opp.id,
      title: opp.title,
      short_description: opp.short_description || '',
      full_description: opp.full_description || '',
      cause_category: opp.cause_category,
      role_type: opp.role_type,
      location_type: opp.location_type,
      organization_name: opp.organization_name || '',
      city: opp.city || '',
      state: opp.state || '',
      zip: opp.zip || '',
      weekly_time_commitment_hours: opp.weekly_time_commitment_hours || 0,
      urgency: opp.urgency,
      start_date: opp.start_date || null,
      end_date: opp.end_date || null,
      is_active: !!opp.is_active,
      is_in_volunteer_plan: !!planItem,
      volunteer_plan_item_id: planItem ? planItem.id : null,
      related_opportunities: related,
      volunteerOpportunityId: opp.id,
      volunteerOpportunity: opp
    };
  }

  addVolunteerOpportunityToPlan(volunteerOpportunityId, status) {
    const opportunities = this._getFromStorage('volunteer_opportunities', []);
    const opp = opportunities.find(function (o) {
      return o.id === volunteerOpportunityId;
    });
    if (!opp) {
      return {
        success: false,
        volunteer_plan_item_id: null,
        status: null,
        added_at: null,
        message: 'Volunteer opportunity not found'
      };
    }

    const planItems = this._getFromStorage('volunteer_plan_items', []);
    const existing = planItems.find(function (p) {
      return p.volunteerOpportunityId === volunteerOpportunityId;
    });
    if (existing) {
      return {
        success: true,
        volunteer_plan_item_id: existing.id,
        status: existing.status,
        added_at: existing.added_at,
        message: 'Volunteer opportunity already in plan'
      };
    }

    const now = new Date().toISOString();
    const item = {
      id: this._generateId('volplan'),
      volunteerOpportunityId: volunteerOpportunityId,
      added_at: now,
      status: status || 'planned'
    };
    planItems.push(item);
    this._saveToStorage('volunteer_plan_items', planItems);

    const state = this._getUserStateStore();
    if (state.volunteerOpportunityIds.indexOf(volunteerOpportunityId) === -1) {
      state.volunteerOpportunityIds.push(volunteerOpportunityId);
      this._persistUserStateStore(state);
    }

    return {
      success: true,
      volunteer_plan_item_id: item.id,
      status: item.status,
      added_at: item.added_at,
      message: 'Volunteer opportunity added to plan'
    };
  }

  removeVolunteerPlanItem(volunteerPlanItemId) {
    const planItems = this._getFromStorage('volunteer_plan_items', []);
    const index = planItems.findIndex(function (p) {
      return p.id === volunteerPlanItemId;
    });

    if (index === -1) {
      return { success: false, message: 'Volunteer plan item not found' };
    }

    const removed = planItems.splice(index, 1)[0];
    this._saveToStorage('volunteer_plan_items', planItems);

    const state = this._getUserStateStore();
    if (removed && removed.volunteerOpportunityId) {
      state.volunteerOpportunityIds = state.volunteerOpportunityIds.filter(function (id) {
        return id !== removed.volunteerOpportunityId;
      });
      this._persistUserStateStore(state);
    }

    return { success: true, message: 'Volunteer plan item removed' };
  }

  getVolunteerPlanSummary() {
    const planItems = this._getFromStorage('volunteer_plan_items', []);
    const opportunities = this._getFromStorage('volunteer_opportunities', []);

    const items = planItems.map(function (p) {
      const opp = opportunities.find(function (o) {
        return o.id === p.volunteerOpportunityId;
      });
      return {
        volunteer_plan_item_id: p.id,
        status: p.status,
        added_at: p.added_at,
        volunteer_opportunity_id: p.volunteerOpportunityId,
        title: opp ? opp.title : '',
        cause_category: opp ? opp.cause_category : null,
        role_type: opp ? opp.role_type : null,
        location_type: opp ? opp.location_type : null,
        weekly_time_commitment_hours: opp ? opp.weekly_time_commitment_hours || 0 : 0,
        urgency: opp ? opp.urgency : null,
        volunteerOpportunityId: p.volunteerOpportunityId,
        volunteerOpportunity: opp || null
      };
    });

    return { items: items };
  }

  // ---------------------- MY SAVED & PLANS OVERVIEW ----------------------

  getMySavedAndPlansOverview() {
    const favoriteClinics = this._getFromStorage('favorite_clinics', []);
    const clinics = this._getFromStorage('clinics', []);

    const toolkitItems = this._getFromStorage('toolkit_items', []);
    const resources = this._getFromStorage('resources', []);

    const bookmarks = this._getFromStorage('article_bookmarks', []);
    const readingList = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('articles', []);

    const planItems = this._getFromStorage('volunteer_plan_items', []);
    const opportunities = this._getFromStorage('volunteer_opportunities', []);

    const eventRegs = this._getFromStorage('event_registrations', []);
    const events = this._getFromStorage('events', []);

    const favorite_clinics = favoriteClinics.map(function (fav) {
      const clinic = clinics.find(function (c) {
        return c.id === fav.clinicId;
      });
      return {
        favorite_id: fav.id,
        saved_at: fav.saved_at,
        clinic_id: fav.clinicId,
        name: clinic ? clinic.name : '',
        city: clinic ? clinic.city : '',
        state: clinic ? clinic.state : '',
        services: clinic ? clinic.services || [] : [],
        service_labels: clinic
          ? (clinic.services || []).map(function (s) {
              return s.replace(/_/g, ' ');
            })
          : [],
        rating_average: clinic ? clinic.rating_average || 0 : 0,
        clinicId: fav.clinicId,
        clinic: clinic || null
      };
    });

    const toolkit_items = toolkitItems.map(function (t) {
      const resource = resources.find(function (r) {
        return r.id === t.resourceId;
      });
      return {
        toolkit_item_id: t.id,
        added_at: t.added_at,
        resource_id: t.resourceId,
        title: resource ? resource.title : '',
        resource_type: resource ? resource.resource_type : null,
        topic: resource ? resource.topic : null,
        resourceId: t.resourceId,
        resource: resource || null
      };
    });

    const bookmarked_articles = bookmarks.map(function (b) {
      const article = articles.find(function (a) {
        return a.id === b.articleId;
      });
      return {
        bookmark_id: b.id,
        bookmarked_at: b.bookmarked_at,
        article_id: b.articleId,
        title: article ? article.title : '',
        topic: article ? article.topic : null,
        content_type: article ? article.content_type : null,
        estimated_reading_time_minutes: article ? article.estimated_reading_time_minutes || 0 : 0,
        articleId: b.articleId,
        article: article || null
      };
    });

    const reading_list = readingList.map(function (r) {
      const article = articles.find(function (a) {
        return a.id === r.articleId;
      });
      return {
        reading_list_item_id: r.id,
        added_at: r.added_at,
        order_index: r.order_index || null,
        article_id: r.articleId,
        title: article ? article.title : '',
        topic: article ? article.topic : null,
        estimated_reading_time_minutes: article ? article.estimated_reading_time_minutes || 0 : 0,
        articleId: r.articleId,
        article: article || null
      };
    });

    const volunteer_plan = planItems.map(function (p) {
      const opp = opportunities.find(function (o) {
        return o.id === p.volunteerOpportunityId;
      });
      return {
        volunteer_plan_item_id: p.id,
        status: p.status,
        added_at: p.added_at,
        volunteer_opportunity_id: p.volunteerOpportunityId,
        title: opp ? opp.title : '',
        cause_category: opp ? opp.cause_category : null,
        weekly_time_commitment_hours: opp ? opp.weekly_time_commitment_hours || 0 : 0,
        volunteerOpportunityId: p.volunteerOpportunityId,
        volunteerOpportunity: opp || null
      };
    });

    const event_registrations = eventRegs.map(function (r) {
      const event = events.find(function (e) {
        return e.id === r.eventId;
      });
      return {
        registration_id: r.id,
        event_id: r.eventId,
        event_title: event ? event.title : '',
        start_datetime: event ? event.start_datetime : null,
        format: event ? event.format : null,
        status: r.status,
        eventId: r.eventId,
        event: event || null
      };
    });

    return {
      favorite_clinics: favorite_clinics,
      toolkit_items: toolkit_items,
      bookmarked_articles: bookmarked_articles,
      reading_list: reading_list,
      volunteer_plan: volunteer_plan,
      event_registrations: event_registrations
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
