// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const tables = [
      'ticket_types',
      'ticket_features',
      'ticket_type_features',
      'promo_codes',
      'payment_options',
      'live_sessions',
      'time_zone_options',
      'session_reservations',
      'agenda_sessions',
      'personal_agendas',
      'personal_agenda_items',
      'tracks',
      'testimonials',
      'coaching_plans',
      'coaching_registrations',
      'group_registrations',
      'ticket_registrations',
      'payments',
      'faq_categories',
      'faq_items',
      'contact_topics',
      'contact_messages',
      'prep_topics',
      'prep_subscriptions',
      'page_content_sections'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    if (!localStorage.getItem('active_personal_agenda_id')) {
      localStorage.setItem('active_personal_agenda_id', '');
    }
    if (!localStorage.getItem('current_ticket_registration_id')) {
      localStorage.setItem('current_ticket_registration_id', '');
    }
    if (!localStorage.getItem('current_coaching_registration_id')) {
      localStorage.setItem('current_coaching_registration_id', '');
    }
    if (!localStorage.getItem('current_group_registration_id')) {
      localStorage.setItem('current_group_registration_id', '');
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

  _nowISO() {
    return new Date().toISOString();
  }

  // ----------------------
  // Private helpers (specified)
  // ----------------------

  // Internal helper to create or retrieve the current draft TicketRegistration for the single-user session.
  _getOrCreateTicketRegistrationDraft() {
    const registrations = this._getFromStorage('ticket_registrations');
    const currentId = localStorage.getItem('current_ticket_registration_id') || '';
    if (currentId) {
      const existing = registrations.find(r => r.id === currentId && r.status === 'draft');
      if (existing) {
        return existing;
      }
    }
    // create a very bare draft (no ticket type yet)
    const newId = this._generateId('ticket_reg');
    const draft = {
      id: newId,
      ticket_type_id: null,
      session_reservation_id: null,
      track_id: null,
      quantity: 1,
      attendee_full_name: null,
      attendee_email: null,
      fitness_level: null,
      subscribe_to_reminders: false,
      payment_option_id: null,
      applied_promo_code_id: null,
      base_price: 0,
      discount_amount: 0,
      total_price: 0,
      currency: null,
      status: 'draft',
      created_at: this._nowISO()
    };
    registrations.push(draft);
    this._saveToStorage('ticket_registrations', registrations);
    localStorage.setItem('current_ticket_registration_id', newId);
    return draft;
  }

  // Internal helper to create or retrieve the current draft CoachingRegistration for the single-user session.
  _getOrCreateCoachingRegistration() {
    const regs = this._getFromStorage('coaching_registrations');
    const currentId = localStorage.getItem('current_coaching_registration_id') || '';
    if (currentId) {
      const existing = regs.find(r => r.id === currentId && r.status === 'draft');
      if (existing) return existing;
    }
    const newId = this._generateId('coach_reg');
    const draft = {
      id: newId,
      coaching_plan_id: null,
      num_attendees: 1,
      registering_with_friend: false,
      primary_attendee_name: '',
      primary_attendee_email: '',
      total_price: 0,
      currency: null,
      status: 'draft',
      created_at: this._nowISO()
    };
    regs.push(draft);
    this._saveToStorage('coaching_registrations', regs);
    localStorage.setItem('current_coaching_registration_id', newId);
    return draft;
  }

  // Internal helper to create or retrieve the current draft GroupRegistration for the single-user session.
  _getOrCreateGroupRegistration() {
    const regs = this._getFromStorage('group_registrations');
    const currentId = localStorage.getItem('current_group_registration_id') || '';
    if (currentId) {
      const existing = regs.find(r => r.id === currentId && r.status === 'draft');
      if (existing) return existing;
    }
    const newId = this._generateId('group_reg');
    const draft = {
      id: newId,
      ticket_type_id: null,
      num_attendees: 0,
      coordinator_role: 'team_coordinator',
      coordinator_name: '',
      coordinator_email: '',
      payment_arrangement: 'pay_once_for_all_attendees',
      total_price: 0,
      currency: null,
      status: 'draft',
      created_at: this._nowISO()
    };
    regs.push(draft);
    this._saveToStorage('group_registrations', regs);
    localStorage.setItem('current_group_registration_id', newId);
    return draft;
  }

  // Internal helper to load or create the PersonalAgenda for the current user context.
  _getActivePersonalAgenda() {
    const agendas = this._getFromStorage('personal_agendas');
    let activeId = localStorage.getItem('active_personal_agenda_id') || '';
    if (activeId) {
      const existing = agendas.find(a => a.id === activeId);
      if (existing) return existing;
    }
    const newId = this._generateId('personal_agenda');
    const agenda = {
      id: newId,
      name: 'My agenda',
      created_at: this._nowISO()
    };
    agendas.push(agenda);
    this._saveToStorage('personal_agendas', agendas);
    localStorage.setItem('active_personal_agenda_id', newId);
    return agenda;
  }

  // Internal helper to calculate ticket pricing totals, including discounts from applied promo codes.
  _calculateTicketPricing(registration) {
    const tickets = this._getFromStorage('ticket_types');
    const promos = this._getFromStorage('promo_codes');
    const ticket = tickets.find(t => t.id === registration.ticket_type_id) || null;
    const quantity = registration.quantity || 1;
    const basePricePer = ticket ? ticket.base_price || 0 : 0;
    const base_price = basePricePer * quantity;

    let discount_amount = 0;
    let appliedPromoCode = null;
    if (registration.applied_promo_code_id) {
      appliedPromoCode = promos.find(p => p.id === registration.applied_promo_code_id && p.is_active);
    }

    if (appliedPromoCode) {
      if (appliedPromoCode.discount_type === 'percentage') {
        discount_amount = (base_price * (appliedPromoCode.discount_value || 0)) / 100;
      } else if (appliedPromoCode.discount_type === 'fixed_amount') {
        discount_amount = appliedPromoCode.discount_value || 0;
      }
      if (discount_amount < 0) discount_amount = 0;
      if (discount_amount > base_price) discount_amount = base_price;
    }

    const total_price = base_price - discount_amount;
    const currency = (ticket && ticket.currency) || registration.currency || 'USD';

    return { base_price, discount_amount, total_price, currency };
  }

  // Internal helper to compute coaching registration totals based on plan, number of attendees, and billing type.
  _calculateCoachingPricing(coachingRegistration) {
    const plans = this._getFromStorage('coaching_plans');
    const plan = plans.find(p => p.id === coachingRegistration.coaching_plan_id) || null;
    if (!plan) {
      return {
        per_plan_price: 0,
        currency: 'USD',
        total_price: 0
      };
    }
    const num = coachingRegistration.num_attendees || 1;
    const per_plan_price = plan.price || 0;
    const total_price = per_plan_price * num;
    return {
      per_plan_price,
      currency: plan.currency || 'USD',
      total_price
    };
  }

  // Internal helper to validate a PromoCode and compute discount amounts for a given registration.
  _applyPromoCode(registration, promoCodeString) {
    const promos = this._getFromStorage('promo_codes');
    const tickets = this._getFromStorage('ticket_types');
    const code = (promoCodeString || '').trim();
    if (!code) {
      return { success: false, message: 'Promo code is empty.', promo: null };
    }

    const now = new Date();
    const ticket = tickets.find(t => t.id === registration.ticket_type_id) || null;

    const promo = promos.find(p =>
      p.is_active &&
      typeof p.code === 'string' &&
      p.code.toLowerCase() === code.toLowerCase()
    );

    if (!promo) {
      return { success: false, message: 'Promo code not found or inactive.', promo: null };
    }

    if (promo.valid_from && new Date(promo.valid_from) > now) {
      return { success: false, message: 'Promo code is not yet valid.', promo: null };
    }
    if (promo.valid_to && new Date(promo.valid_to) < now) {
      return { success: false, message: 'Promo code has expired.', promo: null };
    }

    if (promo.applies_to_ticket_type_ids && promo.applies_to_ticket_type_ids.length > 0) {
      if (!ticket || !promo.applies_to_ticket_type_ids.includes(ticket.id)) {
        return { success: false, message: 'Promo code does not apply to this ticket.', promo: null };
      }
    }

    const tempReg = Object.assign({}, registration);
    tempReg.applied_promo_code_id = promo.id;
    const pricing = this._calculateTicketPricing(tempReg);

    if (typeof promo.min_order_total === 'number' && pricing.base_price < promo.min_order_total) {
      return { success: false, message: 'Order total does not meet the minimum for this promo code.', promo: null };
    }

    return { success: true, message: 'Promo code applied.', promo };
  }

  // Internal helper to convert LiveSession UTC start times to the selected TimeZoneOption for display.
  _convertSessionTimesToTimeZone(liveSession, timeZoneIanaCode) {
    const date = new Date(liveSession.start_datetime_utc);
    const timeZone = timeZoneIanaCode || liveSession.base_time_zone || 'UTC';

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone
    });

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      timeZone
    });

    const parts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone
    }).formatToParts(date);

    const hourPart = parts.find(p => p.type === 'hour');
    const start_time_hour_24 = hourPart ? parseInt(hourPart.value, 10) : 0;

    return {
      start_time_formatted: timeFormatter.format(date),
      date_formatted: dateFormatter.format(date),
      start_time_hour_24
    };
  }

  // Internal helper for loading CMS-managed page content sections such as About, Terms, and Privacy.
  _loadPageContentSection(key) {
    const sections = this._getFromStorage('page_content_sections');
    const found = sections.find(s => s.key === key);
    return found ? (found.data || null) : null;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomePageHeroContent
  getHomePageHeroContent() {
    const section = this._loadPageContentSection('home_hero') || {};
    return {
      headline: section.headline || '',
      subheadline: section.subheadline || '',
      primary_benefits: Array.isArray(section.primary_benefits) ? section.primary_benefits : [],
      who_its_for: Array.isArray(section.who_its_for) ? section.who_its_for : [],
      primary_cta_label: section.primary_cta_label || ''
    };
  }

  // getTicketComparisonForHome
  getTicketComparisonForHome(maxAffordablePrice) {
    const ticketTypes = this._getFromStorage('ticket_types');
    const ticketTypeFeatures = this._getFromStorage('ticket_type_features');
    const ticketFeatures = this._getFromStorage('ticket_features');

    const tickets = ticketTypes
      .filter(t => t.is_active)
      .map(t => {
        const joins = ticketTypeFeatures.filter(j => j.ticket_type_id === t.id);
        const feature_labels = joins
          .map(j => ticketFeatures.find(f => f.id === j.ticket_feature_id))
          .filter(Boolean)
          .map(f => f.name);

        const is_affordable_under_max = typeof maxAffordablePrice === 'number'
          ? (t.base_price <= maxAffordablePrice)
          : false;

        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          description: t.description || '',
          base_price: t.base_price,
          currency: t.currency,
          is_standard_pass: !!t.is_standard_pass,
          includes_live_qa: !!t.includes_live_qa,
          is_active: !!t.is_active,
          is_highlighted: !!t.is_highlighted,
          display_order: typeof t.display_order === 'number' ? t.display_order : 0,
          feature_labels,
          is_affordable_under_max,
          is_cheapest_affordable_under_max: false
        };
      });

    // Determine the cheapest affordable ticket under max
    if (typeof maxAffordablePrice === 'number') {
      const affordable = tickets.filter(t => t.is_affordable_under_max);
      if (affordable.length > 0) {
        let cheapest = affordable[0];
        for (const t of affordable) {
          if (t.base_price < cheapest.base_price) {
            cheapest = t;
          }
        }
        tickets.forEach(t => {
          if (t.id === cheapest.id) {
            t.is_cheapest_affordable_under_max = true;
          }
        });
      }
    }

    tickets.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    return { tickets };
  }

  // startTicketRegistrationFromTicket
  startTicketRegistrationFromTicket(ticketTypeId, quantity) {
    const ticketTypes = this._getFromStorage('ticket_types');
    const ticketType = ticketTypes.find(t => t.id === ticketTypeId && t.is_active);
    if (!ticketType) {
      return {
        ticket_registration_id: null,
        ticket_summary: null,
        status: 'error',
        message: 'Ticket type not found or inactive.'
      };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const registrations = this._getFromStorage('ticket_registrations');
    const id = this._generateId('ticket_reg');
    const registration = {
      id,
      ticket_type_id: ticketType.id,
      session_reservation_id: null,
      track_id: null,
      quantity: qty,
      attendee_full_name: null,
      attendee_email: null,
      fitness_level: null,
      subscribe_to_reminders: false,
      payment_option_id: null,
      applied_promo_code_id: null,
      base_price: ticketType.base_price * qty,
      discount_amount: 0,
      total_price: ticketType.base_price * qty,
      currency: ticketType.currency,
      status: 'draft',
      created_at: this._nowISO()
    };

    registrations.push(registration);
    this._saveToStorage('ticket_registrations', registrations);
    localStorage.setItem('current_ticket_registration_id', id);

    return {
      ticket_registration_id: id,
      ticket_summary: {
        ticket_type_id: ticketType.id,
        ticket_name: ticketType.name,
        description: ticketType.description || '',
        includes_live_qa: !!ticketType.includes_live_qa,
        base_price: ticketType.base_price,
        currency: ticketType.currency,
        quantity: qty,
        // foreign key resolution for ticket_type_id
        ticket_type: ticketType
      },
      status: 'draft',
      message: 'Ticket registration created.'
    };
  }

  // getTimeZoneOptionsForSchedule
  getTimeZoneOptionsForSchedule() {
    const tzs = this._getFromStorage('time_zone_options');
    const time_zones = tzs
      .map(tz => ({
        id: tz.id,
        label: tz.label,
        iana_code: tz.iana_code,
        display_order: typeof tz.display_order === 'number' ? tz.display_order : 0
      }))
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    return { time_zones };
  }

  // getLiveSessionsForSchedule
  getLiveSessionsForSchedule(timeZoneOptionId) {
    const tzs = this._getFromStorage('time_zone_options');
    const tz = tzs.find(z => z.id === timeZoneOptionId);
    const iana = tz ? tz.iana_code : 'UTC';

    const liveSessions = this._getFromStorage('live_sessions');

    const sessions = liveSessions
      .filter(s => s.is_active)
      .map(s => {
        const converted = this._convertSessionTimesToTimeZone(s, iana);
        return {
          id: s.id,
          title: s.title,
          description: s.description || '',
          weekday_name: s.weekday_name,
          is_weekday: !!s.is_weekday,
          start_datetime_utc: s.start_datetime_utc,
          start_time_formatted: converted.start_time_formatted,
          start_time_hour_24: converted.start_time_hour_24,
          date_formatted: converted.date_formatted,
          duration_minutes: s.duration_minutes,
          seats_available: typeof s.seats_available === 'number' ? s.seats_available : null,
          is_active: !!s.is_active
        };
      });

    return { sessions };
  }

  // getSessionOptionsView
  getSessionOptionsView(liveSessionId, timeZoneOptionId) {
    const liveSessions = this._getFromStorage('live_sessions');
    const tzs = this._getFromStorage('time_zone_options');
    const session = liveSessions.find(s => s.id === liveSessionId);
    const tz = tzs.find(z => z.id === timeZoneOptionId);
    const iana = tz ? tz.iana_code : (session ? session.base_time_zone : 'UTC');

    if (!session) {
      return {
        session: null,
        notes: [],
        attendance_mode_options: [],
        default_attendance_mode: 'attend_live'
      };
    }

    const converted = this._convertSessionTimesToTimeZone(session, iana);

    const resultSession = {
      id: session.id,
      title: session.title,
      description: session.description || '',
      weekday_name: session.weekday_name,
      is_weekday: !!session.is_weekday,
      date_formatted: converted.date_formatted,
      start_time_formatted: converted.start_time_formatted,
      duration_minutes: session.duration_minutes,
      seats_available: typeof session.seats_available === 'number' ? session.seats_available : null
    };

    const attendance_mode_options = [
      {
        value: 'attend_live',
        label: 'Attend live',
        description: 'Join the webinar live at the scheduled time.'
      },
      {
        value: 'replay_only',
        label: 'Replay only',
        description: 'Get access to the replay recording without attending live.'
      }
    ];

    return {
      session: resultSession,
      notes: [],
      attendance_mode_options,
      default_attendance_mode: 'attend_live'
    };
  }

  // createSessionReservationAndStartTicketRegistration
  createSessionReservationAndStartTicketRegistration(liveSessionId, quantity, attendanceMode) {
    const liveSessions = this._getFromStorage('live_sessions');
    const ticketTypes = this._getFromStorage('ticket_types');
    const reservations = this._getFromStorage('session_reservations');
    const registrations = this._getFromStorage('ticket_registrations');

    const session = liveSessions.find(s => s.id === liveSessionId && s.is_active);
    if (!session) {
      return {
        session_reservation_id: null,
        ticket_registration_id: null,
        status: 'error',
        message: 'Live session not found or inactive.'
      };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const mode = attendanceMode === 'replay_only' ? 'replay_only' : 'attend_live';

    const reservationId = this._generateId('session_res');
    const reservation = {
      id: reservationId,
      live_session_id: session.id,
      quantity: qty,
      attendance_mode: mode,
      created_at: this._nowISO()
    };
    reservations.push(reservation);
    this._saveToStorage('session_reservations', reservations);

    // Choose default ticket type: prefer Standard Pass, else cheapest active
    let ticketType = ticketTypes.find(t => t.is_active && t.is_standard_pass);
    if (!ticketType) {
      const actives = ticketTypes.filter(t => t.is_active);
      if (actives.length > 0) {
        ticketType = actives.reduce((min, t) => (t.base_price < min.base_price ? t : min), actives[0]);
      }
    }
    if (!ticketType) {
      return {
        session_reservation_id: reservationId,
        ticket_registration_id: null,
        status: 'error',
        message: 'No active ticket types available.'
      };
    }

    const regId = this._generateId('ticket_reg');
    const registration = {
      id: regId,
      ticket_type_id: ticketType.id,
      session_reservation_id: reservationId,
      track_id: null,
      quantity: qty,
      attendee_full_name: null,
      attendee_email: null,
      fitness_level: null,
      subscribe_to_reminders: false,
      payment_option_id: null,
      applied_promo_code_id: null,
      base_price: ticketType.base_price * qty,
      discount_amount: 0,
      total_price: ticketType.base_price * qty,
      currency: ticketType.currency,
      status: 'draft',
      created_at: this._nowISO()
    };

    registrations.push(registration);
    this._saveToStorage('ticket_registrations', registrations);
    localStorage.setItem('current_ticket_registration_id', regId);

    return {
      session_reservation_id: reservationId,
      ticket_registration_id: regId,
      status: 'draft',
      message: 'Session reserved and ticket registration created.'
    };
  }

  // getAgendaSessions
  getAgendaSessions(skillLevel, equipmentRequirements) {
    const all = this._getFromStorage('agenda_sessions');
    const sessions = all
      .filter(s => s.is_active)
      .filter(s => {
        if (skillLevel && s.skill_level !== skillLevel) return false;
        if (Array.isArray(equipmentRequirements) && equipmentRequirements.length > 0) {
          return equipmentRequirements.includes(s.equipment_requirement);
        }
        return true;
      })
      .map(s => ({
        id: s.id,
        title: s.title,
        description: s.description || '',
        skill_level: s.skill_level,
        equipment_requirement: s.equipment_requirement,
        approximate_duration_minutes: s.approximate_duration_minutes,
        display_order: typeof s.display_order === 'number' ? s.display_order : 0,
        is_active: !!s.is_active
      }))
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    return { sessions };
  }

  // addAgendaSessionToPersonalAgenda
  addAgendaSessionToPersonalAgenda(agendaSessionId) {
    const agenda = this._getActivePersonalAgenda();
    const items = this._getFromStorage('personal_agenda_items');

    const existingItems = items.filter(i => i.personal_agenda_id === agenda.id);
    const already = existingItems.find(i => i.agenda_session_id === agendaSessionId);
    if (already) {
      return {
        personal_agenda_id: agenda.id,
        total_items: existingItems.length,
        added_session_id: already.agenda_session_id
      };
    }

    const id = this._generateId('agenda_item');
    const position = existingItems.length + 1;
    const item = {
      id,
      personal_agenda_id: agenda.id,
      agenda_session_id: agendaSessionId,
      added_at: this._nowISO(),
      position
    };

    items.push(item);
    this._saveToStorage('personal_agenda_items', items);

    return {
      personal_agenda_id: agenda.id,
      total_items: existingItems.length + 1,
      added_session_id: agendaSessionId
    };
  }

  // getPersonalAgendaView
  getPersonalAgendaView() {
    const agendaId = localStorage.getItem('active_personal_agenda_id') || '';
    const agendas = this._getFromStorage('personal_agendas');
    const sessions = this._getFromStorage('agenda_sessions');
    const itemsAll = this._getFromStorage('personal_agenda_items');

    const agenda = agendas.find(a => a.id === agendaId) || null;
    if (!agenda) {
      return {
        personal_agenda_id: null,
        name: '',
        items: []
      };
    }

    const items = itemsAll
      .filter(i => i.personal_agenda_id === agenda.id)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const resultItems = items.map(i => {
      const session = sessions.find(s => s.id === i.agenda_session_id) || null;
      return {
        agenda_session_id: i.agenda_session_id,
        position: i.position,
        added_at: i.added_at,
        session_title: session ? session.title : '',
        session_description: session ? (session.description || '') : '',
        skill_level: session ? session.skill_level : null,
        equipment_requirement: session ? session.equipment_requirement : null,
        approximate_duration_minutes: session ? session.approximate_duration_minutes : null,
        // foreign key resolution for agenda_session_id
        agenda_session: session
      };
    });

    return {
      personal_agenda_id: agenda.id,
      name: agenda.name || 'My agenda',
      items: resultItems
    };
  }

  // getTestimonials
  getTestimonials(personaSegment) {
    const testimonialsAll = this._getFromStorage('testimonials');
    const tracks = this._getFromStorage('tracks');

    const filtered = testimonialsAll
      .filter(t => t.is_active)
      .filter(t => (personaSegment ? t.persona_segment === personaSegment : true))
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    const testimonials = filtered.map(t => {
      const story = t.story_text || '';
      const preview = story.length > 160 ? story.slice(0, 157) + '...' : story;
      const track = tracks.find(tr => tr.id === t.recommended_track_id && tr.is_active);
      return {
        id: t.id,
        person_name: t.person_name,
        title: t.title || '',
        persona_segment: t.persona_segment,
        story_preview: preview,
        display_order: typeof t.display_order === 'number' ? t.display_order : 0,
        has_recommended_track: !!track,
        recommended_track_summary: track
          ? {
              track_id: track.id,
              track_name: track.name
            }
          : null
      };
    });

    return { testimonials };
  }

  // getTestimonialDetail
  getTestimonialDetail(testimonialId) {
    const testimonials = this._getFromStorage('testimonials');
    const tracks = this._getFromStorage('tracks');

    const t = testimonials.find(x => x.id === testimonialId && x.is_active);
    if (!t) {
      return {
        id: null,
        person_name: '',
        title: '',
        persona_segment: '',
        story_text: '',
        recommended_track: null
      };
    }

    const track = tracks.find(tr => tr.id === t.recommended_track_id && tr.is_active);

    return {
      id: t.id,
      person_name: t.person_name,
      title: t.title || '',
      persona_segment: t.persona_segment,
      story_text: t.story_text || '',
      recommended_track: track
        ? {
            track_id: track.id,
            track_name: track.name,
            track_description: track.description || ''
          }
        : null
    };
  }

  // getTrackSelectionContext
  getTrackSelectionContext(testimonialId) {
    const testimonials = this._getFromStorage('testimonials');
    const tracks = this._getFromStorage('tracks');

    const t = testimonials.find(x => x.id === testimonialId && x.is_active);
    const story_highlight = t && t.story_text ? (t.story_text.length > 140 ? t.story_text.slice(0, 137) + '...' : t.story_text) : '';

    const testimonial_summary = t
      ? {
          id: t.id,
          person_name: t.person_name,
          title: t.title || '',
          persona_segment: t.persona_segment,
          story_highlight
        }
      : {
          id: null,
          person_name: '',
          title: '',
          persona_segment: '',
          story_highlight: ''
        };

    const allTracks = tracks.filter(tr => tr.is_active);
    const default_track_id = t ? t.recommended_track_id || null : null;

    const resultTracks = allTracks.map(tr => ({
      id: tr.id,
      name: tr.name,
      slug: tr.slug,
      description: tr.description || '',
      focus_area: tr.focus_area || '',
      is_active: !!tr.is_active,
      is_recommended: default_track_id === tr.id
    }));

    // foreign key resolution for default_track_id
    const default_track = allTracks.find(tr => tr.id === default_track_id) || null;

    return {
      testimonial_summary,
      tracks: resultTracks,
      default_track_id,
      default_track
    };
  }

  // startTicketRegistrationFromTrackSelection
  startTicketRegistrationFromTrackSelection(trackId, sourceTestimonialId) {
    const tracks = this._getFromStorage('tracks');
    const ticketTypes = this._getFromStorage('ticket_types');
    const registrations = this._getFromStorage('ticket_registrations');

    const track = tracks.find(tr => tr.id === trackId && tr.is_active);
    if (!track) {
      return {
        ticket_registration_id: null,
        track_summary: null,
        ticket_summary: null
      };
    }

    // choose default ticket type as Standard Pass else cheapest
    let ticketType = ticketTypes.find(t => t.is_active && t.is_standard_pass);
    if (!ticketType) {
      const actives = ticketTypes.filter(t => t.is_active);
      if (actives.length > 0) {
        ticketType = actives.reduce((min, t) => (t.base_price < min.base_price ? t : min), actives[0]);
      }
    }

    if (!ticketType) {
      return {
        ticket_registration_id: null,
        track_summary: null,
        ticket_summary: null
      };
    }

    const regId = this._generateId('ticket_reg');
    const qty = 1;
    const registration = {
      id: regId,
      ticket_type_id: ticketType.id,
      session_reservation_id: null,
      track_id: track.id,
      quantity: qty,
      attendee_full_name: null,
      attendee_email: null,
      fitness_level: null,
      subscribe_to_reminders: false,
      payment_option_id: null,
      applied_promo_code_id: null,
      base_price: ticketType.base_price * qty,
      discount_amount: 0,
      total_price: ticketType.base_price * qty,
      currency: ticketType.currency,
      status: 'draft',
      created_at: this._nowISO(),
      source_testimonial_id: sourceTestimonialId || null
    };

    registrations.push(registration);
    this._saveToStorage('ticket_registrations', registrations);
    localStorage.setItem('current_ticket_registration_id', regId);

    return {
      ticket_registration_id: regId,
      track_summary: {
        track_id: track.id,
        track_name: track.name,
        focus_area: track.focus_area || ''
      },
      ticket_summary: {
        ticket_type_id: ticketType.id,
        ticket_name: ticketType.name,
        base_price: ticketType.base_price,
        currency: ticketType.currency,
        ticket_type: ticketType
      }
    };
  }

  // getPrepTopics
  getPrepTopics() {
    const topicsAll = this._getFromStorage('prep_topics');
    const topics = topicsAll
      .map(t => ({
        value: t.value,
        name: t.name,
        description: t.description || '',
        display_order: typeof t.display_order === 'number' ? t.display_order : 0
      }))
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    return { topics };
  }

  // createPrepSubscription
  createPrepSubscription(name, email, selected_topic_values) {
    const subs = this._getFromStorage('prep_subscriptions');
    const topics = this._getFromStorage('prep_topics');

    const validValues = Array.isArray(selected_topic_values) ? selected_topic_values : [];
    const allowedValues = topics.map(t => t.value);
    const filteredValues = validValues.filter(v => allowedValues.includes(v));

    const id = this._generateId('prep_sub');
    const sub = {
      id,
      name,
      email,
      selected_topic_values: filteredValues,
      created_at: this._nowISO(),
      confirmed: false
    };

    subs.push(sub);
    this._saveToStorage('prep_subscriptions', subs);

    return {
      subscription_id: id,
      success: true,
      message: 'Subscription created.'
    };
  }

  // getCoachingPackagesTeaser
  getCoachingPackagesTeaser() {
    const section = this._loadPageContentSection('coaching_packages_teaser') || {};
    const plansAll = this._getFromStorage('coaching_plans');
    const highlighted_plans = plansAll
      .filter(p => p.is_active)
      .map(p => ({
        coaching_plan_id: p.id,
        name: p.name,
        price: p.price,
        currency: p.currency,
        includes_one_on_one_coaching: !!p.includes_one_on_one_coaching,
        includes_personalized_meal_plan: !!p.includes_personalized_meal_plan
      }));

    return {
      headline: section.headline || '',
      description: section.description || '',
      highlighted_plans
    };
  }

  // getGroupRegistrationTeaserInfo
  getGroupRegistrationTeaserInfo() {
    const section = this._loadPageContentSection('group_registration_teaser') || {};
    return {
      headline: section.headline || '',
      description: section.description || '',
      min_seats_for_group: typeof section.min_seats_for_group === 'number' ? section.min_seats_for_group : 0,
      benefit_bullets: Array.isArray(section.benefit_bullets) ? section.benefit_bullets : []
    };
  }

  // getFaqForHome
  getFaqForHome() {
    const categoriesAll = this._getFromStorage('faq_categories');
    const itemsAll = this._getFromStorage('faq_items');

    const categories = categoriesAll
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map(cat => {
        const catItems = itemsAll
          .filter(i => i.faq_category_id === cat.id && i.is_active)
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          .map(i => ({
            id: i.id,
            question: i.question,
            answer_html: i.answer_html,
            anchor: i.anchor || '',
            display_order: typeof i.display_order === 'number' ? i.display_order : 0
          }));
        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          display_order: typeof cat.display_order === 'number' ? cat.display_order : 0,
          items: catItems
        };
      });

    return { categories };
  }

  // getTicketCheckoutState
  getTicketCheckoutState(ticketRegistrationId) {
    const registrations = this._getFromStorage('ticket_registrations');
    const tickets = this._getFromStorage('ticket_types');
    const tracks = this._getFromStorage('tracks');
    const sessions = this._getFromStorage('live_sessions');
    const reservations = this._getFromStorage('session_reservations');
    const promos = this._getFromStorage('promo_codes');

    const reg = registrations.find(r => r.id === ticketRegistrationId);
    if (!reg) {
      return {
        ticket_registration_id: ticketRegistrationId,
        status: 'not_found',
        ticket: null,
        track: null,
        session: null,
        attendee: null,
        pricing: null
      };
    }

    const ticketType = tickets.find(t => t.id === reg.ticket_type_id) || null;
    const track = tracks.find(tr => tr.id === reg.track_id) || null;

    let sessionInfo = null;
    if (reg.session_reservation_id) {
      const reservation = reservations.find(sr => sr.id === reg.session_reservation_id) || null;
      if (reservation) {
        const liveSession = sessions.find(s => s.id === reservation.live_session_id) || null;
        if (liveSession) {
          const converted = this._convertSessionTimesToTimeZone(liveSession, liveSession.base_time_zone || 'UTC');
          sessionInfo = {
            live_session_id: liveSession.id,
            title: liveSession.title,
            weekday_name: liveSession.weekday_name,
            date_formatted: converted.date_formatted,
            start_time_formatted: converted.start_time_formatted,
            live_session: liveSession
          };
        }
      }
    }

    const pricing = this._calculateTicketPricing(reg);
    const appliedPromo = reg.applied_promo_code_id
      ? promos.find(p => p.id === reg.applied_promo_code_id)
      : null;

    const ticketObj = ticketType
      ? {
          ticket_type_id: ticketType.id,
          ticket_name: ticketType.name,
          description: ticketType.description || '',
          includes_live_qa: !!ticketType.includes_live_qa,
          quantity: reg.quantity || 1,
          ticket_type: ticketType
        }
      : null;

    const trackObj = track
      ? {
          track_id: track.id,
          track_name: track.name,
          track: track
        }
      : null;

    return {
      ticket_registration_id: reg.id,
      status: reg.status,
      ticket: ticketObj,
      track: trackObj,
      session: sessionInfo,
      attendee: {
        full_name: reg.attendee_full_name || '',
        email: reg.attendee_email || '',
        fitness_level: reg.fitness_level || null,
        subscribe_to_reminders: !!reg.subscribe_to_reminders
      },
      pricing: {
        base_price: pricing.base_price,
        discount_amount: pricing.discount_amount,
        total_price: pricing.total_price,
        currency: pricing.currency,
        applied_promo_code: appliedPromo ? appliedPromo.code : null,
        promo_code: appliedPromo || null
      }
    };
  }

  // applyPromoCodeToTicketRegistration
  applyPromoCodeToTicketRegistration(ticketRegistrationId, promoCode) {
    const registrations = this._getFromStorage('ticket_registrations');
    const promos = this._getFromStorage('promo_codes');

    const regIndex = registrations.findIndex(r => r.id === ticketRegistrationId);
    if (regIndex === -1) {
      return {
        success: false,
        message: 'Ticket registration not found.',
        ticket_registration_id: ticketRegistrationId,
        pricing: null
      };
    }

    const reg = registrations[regIndex];
    const applyResult = this._applyPromoCode(reg, promoCode);
    if (!applyResult.success) {
      return {
        success: false,
        message: applyResult.message,
        ticket_registration_id: ticketRegistrationId,
        pricing: this._calculateTicketPricing(reg)
      };
    }

    const promo = applyResult.promo;
    reg.applied_promo_code_id = promo.id;
    const pricing = this._calculateTicketPricing(reg);
    reg.base_price = pricing.base_price;
    reg.discount_amount = pricing.discount_amount;
    reg.total_price = pricing.total_price;
    reg.currency = pricing.currency;

    registrations[regIndex] = reg;
    this._saveToStorage('ticket_registrations', registrations);

    return {
      success: true,
      message: 'Promo code applied.',
      ticket_registration_id: ticketRegistrationId,
      pricing: {
        base_price: pricing.base_price,
        discount_amount: pricing.discount_amount,
        total_price: pricing.total_price,
        currency: pricing.currency,
        applied_promo_code: promo.code
      }
    };
  }

  // getPaymentOptionsForTicketRegistration
  getPaymentOptionsForTicketRegistration(ticketRegistrationId) {
    const registrations = this._getFromStorage('ticket_registrations');
    const paymentOptions = this._getFromStorage('payment_options');

    const reg = registrations.find(r => r.id === ticketRegistrationId) || null;
    const optionsSorted = paymentOptions.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    let selected_payment_option_id = reg ? reg.payment_option_id : null;
    if (!selected_payment_option_id && optionsSorted.length > 0) {
      const defaultOption = optionsSorted.find(o => o.is_default) || optionsSorted[0];
      selected_payment_option_id = defaultOption.id;
    }

    const options = optionsSorted.map(o => ({
      id: o.id,
      label: o.label,
      billing_type: o.billing_type,
      description: o.description || '',
      is_default: !!o.is_default
    }));

    return {
      selected_payment_option_id,
      options
    };
  }

  // updateTicketRegistrationPaymentOption
  updateTicketRegistrationPaymentOption(ticketRegistrationId, paymentOptionId) {
    const registrations = this._getFromStorage('ticket_registrations');
    const paymentOptions = this._getFromStorage('payment_options');

    const regIndex = registrations.findIndex(r => r.id === ticketRegistrationId);
    if (regIndex === -1) {
      return {
        ticket_registration_id: ticketRegistrationId,
        selected_payment_option_id: null
      };
    }

    const option = paymentOptions.find(o => o.id === paymentOptionId);
    if (!option) {
      return {
        ticket_registration_id: ticketRegistrationId,
        selected_payment_option_id: registrations[regIndex].payment_option_id || null
      };
    }

    registrations[regIndex].payment_option_id = paymentOptionId;
    this._saveToStorage('ticket_registrations', registrations);

    return {
      ticket_registration_id: ticketRegistrationId,
      selected_payment_option_id: paymentOptionId
    };
  }

  // updateTicketRegistrationAttendeeInfo
  updateTicketRegistrationAttendeeInfo(ticketRegistrationId, fullName, email, fitnessLevel, subscribeToReminders) {
    const registrations = this._getFromStorage('ticket_registrations');
    const regIndex = registrations.findIndex(r => r.id === ticketRegistrationId);
    if (regIndex === -1) {
      return {
        ticket_registration_id: ticketRegistrationId,
        attendee: null
      };
    }

    const reg = registrations[regIndex];

    reg.attendee_full_name = typeof fullName === 'string' ? fullName : reg.attendee_full_name;
    reg.attendee_email = email;

    if (fitnessLevel === 'beginner' || fitnessLevel === 'intermediate' || fitnessLevel === 'advanced' || fitnessLevel === null || fitnessLevel === undefined) {
      reg.fitness_level = fitnessLevel || null;
    }

    if (typeof subscribeToReminders === 'boolean') {
      reg.subscribe_to_reminders = subscribeToReminders;
    }

    registrations[regIndex] = reg;
    this._saveToStorage('ticket_registrations', registrations);

    return {
      ticket_registration_id: ticketRegistrationId,
      attendee: {
        full_name: reg.attendee_full_name || '',
        email: reg.attendee_email || '',
        fitness_level: reg.fitness_level || null,
        subscribe_to_reminders: !!reg.subscribe_to_reminders
      }
    };
  }

  // proceedTicketRegistrationToPayment
  proceedTicketRegistrationToPayment(ticketRegistrationId) {
    const registrations = this._getFromStorage('ticket_registrations');
    const regIndex = registrations.findIndex(r => r.id === ticketRegistrationId);
    if (regIndex === -1) {
      return {
        context_type: 'ticket_registration',
        context_id: ticketRegistrationId,
        next_step: 'payment'
      };
    }

    registrations[regIndex].status = 'pending_payment';
    this._saveToStorage('ticket_registrations', registrations);

    return {
      context_type: 'ticket_registration',
      context_id: ticketRegistrationId,
      next_step: 'payment'
    };
  }

  // getCoachingPlansForComparison
  getCoachingPlansForComparison() {
    const plansAll = this._getFromStorage('coaching_plans');
    const activePlans = plansAll.filter(p => p.is_active);

    // Determine cheapest plan that includes both 1:1 coaching and personalized meal plan
    const withBoth = activePlans.filter(p => p.includes_one_on_one_coaching && p.includes_personalized_meal_plan);
    let cheapestId = null;
    if (withBoth.length > 0) {
      const cheapest = withBoth.reduce((min, p) => (p.price < min.price ? p : min), withBoth[0]);
      cheapestId = cheapest.id;
    }

    const plans = activePlans
      .map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description || '',
        price: p.price,
        currency: p.currency,
        includes_one_on_one_coaching: !!p.includes_one_on_one_coaching,
        includes_personalized_meal_plan: !!p.includes_personalized_meal_plan,
        max_attendees: typeof p.max_attendees === 'number' ? p.max_attendees : null,
        billing_type: p.billing_type,
        is_active: !!p.is_active,
        display_order: typeof p.display_order === 'number' ? p.display_order : 0,
        supports_multiple_attendees: typeof p.max_attendees === 'number' ? p.max_attendees > 1 : false,
        includes_both_core_features: !!(p.includes_one_on_one_coaching && p.includes_personalized_meal_plan),
        is_cheapest_with_both_core_features: p.id === cheapestId
      }))
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    return { plans };
  }

  // startCoachingRegistrationFromPlan
  startCoachingRegistrationFromPlan(coachingPlanId) {
    const plans = this._getFromStorage('coaching_plans');
    const regs = this._getFromStorage('coaching_registrations');

    const plan = plans.find(p => p.id === coachingPlanId && p.is_active);
    if (!plan) {
      return {
        coaching_registration_id: null,
        plan_summary: null
      };
    }

    const id = this._generateId('coach_reg');
    const reg = {
      id,
      coaching_plan_id: plan.id,
      num_attendees: 1,
      registering_with_friend: false,
      primary_attendee_name: '',
      primary_attendee_email: '',
      total_price: plan.price,
      currency: plan.currency,
      status: 'draft',
      created_at: this._nowISO()
    };

    regs.push(reg);
    this._saveToStorage('coaching_registrations', regs);
    localStorage.setItem('current_coaching_registration_id', id);

    return {
      coaching_registration_id: id,
      plan_summary: {
        coaching_plan_id: plan.id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        includes_one_on_one_coaching: !!plan.includes_one_on_one_coaching,
        includes_personalized_meal_plan: !!plan.includes_personalized_meal_plan,
        coaching_plan: plan
      }
    };
  }

  // getCoachingCheckoutState
  getCoachingCheckoutState(coachingRegistrationId) {
    const regs = this._getFromStorage('coaching_registrations');
    const plans = this._getFromStorage('coaching_plans');

    const reg = regs.find(r => r.id === coachingRegistrationId);
    if (!reg) {
      return {
        coaching_registration_id: coachingRegistrationId,
        status: 'not_found',
        plan: null,
        num_attendees: 0,
        registering_with_friend: false,
        primary_attendee_name: '',
        primary_attendee_email: '',
        pricing: null
      };
    }

    const plan = plans.find(p => p.id === reg.coaching_plan_id) || null;
    const pricing = this._calculateCoachingPricing(reg);

    const planObj = plan
      ? {
          coaching_plan_id: plan.id,
          name: plan.name,
          description: plan.description || '',
          includes_one_on_one_coaching: !!plan.includes_one_on_one_coaching,
          includes_personalized_meal_plan: !!plan.includes_personalized_meal_plan,
          coaching_plan: plan
        }
      : null;

    return {
      coaching_registration_id: reg.id,
      status: reg.status,
      plan: planObj,
      num_attendees: reg.num_attendees,
      registering_with_friend: !!reg.registering_with_friend,
      primary_attendee_name: reg.primary_attendee_name || '',
      primary_attendee_email: reg.primary_attendee_email || '',
      pricing: {
        per_plan_price: pricing.per_plan_price,
        currency: pricing.currency,
        total_price: pricing.total_price
      }
    };
  }

  // updateCoachingRegistrationDetails
  updateCoachingRegistrationDetails(coachingRegistrationId, numAttendees, registeringWithFriend, primaryAttendeeName, primaryAttendeeEmail) {
    const regs = this._getFromStorage('coaching_registrations');
    const idx = regs.findIndex(r => r.id === coachingRegistrationId);
    if (idx === -1) {
      return {
        coaching_registration_id: coachingRegistrationId,
        num_attendees: 0,
        registering_with_friend: false,
        primary_attendee_name: '',
        primary_attendee_email: '',
        pricing: null
      };
    }

    const reg = regs[idx];
    const n = typeof numAttendees === 'number' && numAttendees > 0 ? numAttendees : 1;
    reg.num_attendees = n;
    if (typeof registeringWithFriend === 'boolean') {
      reg.registering_with_friend = registeringWithFriend;
    }
    reg.primary_attendee_name = primaryAttendeeName;
    reg.primary_attendee_email = primaryAttendeeEmail;

    const pricing = this._calculateCoachingPricing(reg);
    reg.total_price = pricing.total_price;
    reg.currency = pricing.currency;

    regs[idx] = reg;
    this._saveToStorage('coaching_registrations', regs);

    return {
      coaching_registration_id: reg.id,
      num_attendees: reg.num_attendees,
      registering_with_friend: !!reg.registering_with_friend,
      primary_attendee_name: reg.primary_attendee_name,
      primary_attendee_email: reg.primary_attendee_email,
      pricing: {
        total_price: pricing.total_price,
        currency: pricing.currency
      }
    };
  }

  // proceedCoachingRegistrationToPayment
  proceedCoachingRegistrationToPayment(coachingRegistrationId) {
    const regs = this._getFromStorage('coaching_registrations');
    const idx = regs.findIndex(r => r.id === coachingRegistrationId);
    if (idx === -1) {
      return {
        context_type: 'coaching_registration',
        context_id: coachingRegistrationId,
        next_step: 'payment'
      };
    }

    regs[idx].status = 'pending_payment';
    this._saveToStorage('coaching_registrations', regs);

    return {
      context_type: 'coaching_registration',
      context_id: coachingRegistrationId,
      next_step: 'payment'
    };
  }

  // getGroupRegistrationPageContent
  getGroupRegistrationPageContent() {
    const section = this._loadPageContentSection('group_registration_page') || {};
    return {
      headline: section.headline || '',
      description: section.description || '',
      min_seats: typeof section.min_seats === 'number' ? section.min_seats : 0,
      benefit_bullets: Array.isArray(section.benefit_bullets) ? section.benefit_bullets : []
    };
  }

  // getGroupEligibleTicketTypes
  getGroupEligibleTicketTypes() {
    const ticketsAll = this._getFromStorage('ticket_types');
    const ticket_types = ticketsAll
      .filter(t => t.is_active)
      .map(t => ({
        id: t.id,
        name: t.name,
        is_standard_pass: !!t.is_standard_pass,
        base_price: t.base_price,
        currency: t.currency
      }));
    return { ticket_types };
  }

  // createGroupRegistration
  createGroupRegistration(ticketTypeId, numAttendees, coordinatorRole, coordinatorName, coordinatorEmail, paymentArrangement) {
    const tickets = this._getFromStorage('ticket_types');
    const regs = this._getFromStorage('group_registrations');

    const ticket = tickets.find(t => t.id === ticketTypeId && t.is_active);
    if (!ticket) {
      return {
        group_registration_id: null,
        status: 'error',
        ticket_type_id: ticketTypeId,
        num_attendees: 0,
        total_price: 0,
        currency: 'USD'
      };
    }

    const n = typeof numAttendees === 'number' && numAttendees > 0 ? numAttendees : 1;
    const id = this._generateId('group_reg');
    const total_price = ticket.base_price * n;

    const reg = {
      id,
      ticket_type_id: ticket.id,
      num_attendees: n,
      coordinator_role: coordinatorRole,
      coordinator_name: coordinatorName,
      coordinator_email: coordinatorEmail,
      payment_arrangement: paymentArrangement,
      total_price,
      currency: ticket.currency,
      status: 'draft',
      created_at: this._nowISO()
    };

    regs.push(reg);
    this._saveToStorage('group_registrations', regs);
    localStorage.setItem('current_group_registration_id', id);

    return {
      group_registration_id: id,
      status: reg.status,
      ticket_type_id: ticket.id,
      num_attendees: n,
      total_price,
      currency: ticket.currency
    };
  }

  // proceedGroupRegistrationToPayment
  proceedGroupRegistrationToPayment(groupRegistrationId) {
    const regs = this._getFromStorage('group_registrations');
    const idx = regs.findIndex(r => r.id === groupRegistrationId);
    if (idx === -1) {
      return {
        context_type: 'group_registration',
        context_id: groupRegistrationId,
        next_step: 'payment'
      };
    }

    regs[idx].status = 'pending_payment';
    this._saveToStorage('group_registrations', regs);

    return {
      context_type: 'group_registration',
      context_id: groupRegistrationId,
      next_step: 'payment'
    };
  }

  // getPaymentSummary
  getPaymentSummary(contextType, contextId) {
    const paymentOptions = this._getFromStorage('payment_options');

    let order_summary = {
      order_type: '',
      name: '',
      quantity: 1,
      attendees_count: 1,
      session_time_summary: '',
      track_name: ''
    };

    let base_amount = 0;
    let discount_amount = 0;
    let total_amount = 0;
    let currency = 'USD';
    let applied_promo_codes = [];
    let selected_payment_option_id = null;
    let context = null;

    if (contextType === 'ticket_registration') {
      const registrations = this._getFromStorage('ticket_registrations');
      const tickets = this._getFromStorage('ticket_types');
      const tracks = this._getFromStorage('tracks');
      const sessions = this._getFromStorage('live_sessions');
      const reservations = this._getFromStorage('session_reservations');
      const promos = this._getFromStorage('promo_codes');

      const reg = registrations.find(r => r.id === contextId);
      context = reg || null;
      if (reg) {
        const ticket = tickets.find(t => t.id === reg.ticket_type_id) || null;
        const track = tracks.find(tr => tr.id === reg.track_id) || null;
        let sessionSummary = '';
        if (reg.session_reservation_id) {
          const res = reservations.find(sr => sr.id === reg.session_reservation_id) || null;
          if (res) {
            const liveSession = sessions.find(s => s.id === res.live_session_id) || null;
            if (liveSession) {
              const converted = this._convertSessionTimesToTimeZone(liveSession, liveSession.base_time_zone || 'UTC');
              sessionSummary = `${converted.date_formatted} at ${converted.start_time_formatted}`;
            }
          }
        }

        const pricing = this._calculateTicketPricing(reg);
        base_amount = pricing.base_price;
        discount_amount = pricing.discount_amount;
        total_amount = pricing.total_price;
        currency = pricing.currency;

        if (reg.applied_promo_code_id) {
          const promo = promos.find(p => p.id === reg.applied_promo_code_id);
          if (promo) applied_promo_codes.push(promo.code);
        }

        selected_payment_option_id = reg.payment_option_id || null;

        order_summary = {
          order_type: 'ticket_registration',
          name: ticket ? ticket.name : '',
          quantity: reg.quantity || 1,
          attendees_count: reg.quantity || 1,
          session_time_summary: sessionSummary,
          track_name: track ? track.name : ''
        };
      }
    } else if (contextType === 'coaching_registration') {
      const regs = this._getFromStorage('coaching_registrations');
      const plans = this._getFromStorage('coaching_plans');

      const reg = regs.find(r => r.id === contextId);
      context = reg || null;
      if (reg) {
        const plan = plans.find(p => p.id === reg.coaching_plan_id) || null;
        const pricing = this._calculateCoachingPricing(reg);
        base_amount = pricing.total_price;
        discount_amount = 0;
        total_amount = pricing.total_price;
        currency = pricing.currency;
        selected_payment_option_id = null; // ticket-style payment option not stored here

        order_summary = {
          order_type: 'coaching_registration',
          name: plan ? plan.name : '',
          quantity: 1,
          attendees_count: reg.num_attendees || 1,
          session_time_summary: '',
          track_name: ''
        };
      }
    } else if (contextType === 'group_registration') {
      const regs = this._getFromStorage('group_registrations');
      const tickets = this._getFromStorage('ticket_types');

      const reg = regs.find(r => r.id === contextId);
      context = reg || null;
      if (reg) {
        const ticket = tickets.find(t => t.id === reg.ticket_type_id) || null;
        base_amount = reg.total_price || 0;
        discount_amount = 0;
        total_amount = base_amount;
        currency = reg.currency || (ticket ? ticket.currency : 'USD');
        selected_payment_option_id = null;

        order_summary = {
          order_type: 'group_registration',
          name: ticket ? ticket.name : '',
          quantity: reg.num_attendees || 1,
          attendees_count: reg.num_attendees || 1,
          session_time_summary: '',
          track_name: ''
        };
      }
    }

    const optionsSorted = paymentOptions.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    if (!selected_payment_option_id && optionsSorted.length > 0) {
      const def = optionsSorted.find(o => o.is_default) || optionsSorted[0];
      selected_payment_option_id = def.id;
    }

    const available_payment_options = optionsSorted.map(o => ({
      payment_option_id: o.id,
      label: o.label,
      billing_type: o.billing_type,
      description: o.description || '',
      is_default: !!o.is_default,
      payment_option: o
    }));

    const selected_payment_option = selected_payment_option_id
      ? (() => {
          const opt = paymentOptions.find(o => o.id === selected_payment_option_id);
          return opt
            ? {
                payment_option_id: opt.id,
                label: opt.label,
                billing_type: opt.billing_type,
                payment_option: opt
              }
            : {
                payment_option_id: null,
                label: '',
                billing_type: '',
                payment_option: null
              };
        })()
      : {
          payment_option_id: null,
          label: '',
          billing_type: '',
          payment_option: null
        };

    return {
      context_type: contextType,
      context_id: contextId,
      context,
      order_summary,
      pricing_breakdown: {
        base_amount,
        discount_amount,
        taxes_and_fees: 0,
        total_amount,
        currency,
        applied_promo_codes
      },
      selected_payment_option,
      available_payment_options
    };
  }

  // submitPayment
  submitPayment(contextType, contextId, paymentOptionId, cardholderName, cardNumber, cardExpiryMonth, cardExpiryYear, cardCvc, billingPostalCode, acceptedTerms) {
    if (!acceptedTerms) {
      return {
        payment_id: null,
        status: 'failed',
        amount: 0,
        currency: 'USD',
        card_brand: '',
        card_last4: '',
        registration_status: 'pending_payment',
        message: 'You must accept the terms to proceed.'
      };
    }

    const summary = this.getPaymentSummary(contextType, contextId);
    const total = summary.pricing_breakdown.total_amount || 0;
    const currency = summary.pricing_breakdown.currency || 'USD';

    // Choose payment option
    let finalPaymentOptionId = paymentOptionId || (summary.selected_payment_option && summary.selected_payment_option.payment_option_id) || null;

    // Very simple card validation
    const cardNumStr = (cardNumber || '').replace(/\s+/g, '');
    if (!cardNumStr || cardNumStr.length < 12 || !cardCvc) {
      return {
        payment_id: null,
        status: 'failed',
        amount: total,
        currency,
        card_brand: '',
        card_last4: '',
        registration_status: 'pending_payment',
        message: 'Invalid card details.'
      };
    }

    // Simulate card brand
    let card_brand = 'card';
    if (/^4/.test(cardNumStr)) card_brand = 'visa';
    else if (/^5[1-5]/.test(cardNumStr)) card_brand = 'mastercard';
    else if (/^3[47]/.test(cardNumStr)) card_brand = 'amex';

    const payments = this._getFromStorage('payments');
    const payment_id = this._generateId('pay');

    const payment = {
      id: payment_id,
      context_type: contextType,
      context_id: contextId,
      amount: total,
      currency,
      payment_method_type: 'card',
      cardholder_name: cardholderName,
      card_last4: cardNumStr.slice(-4),
      card_brand,
      status: 'succeeded',
      accepted_terms: !!acceptedTerms,
      payment_option_id: finalPaymentOptionId || null,
      created_at: this._nowISO()
    };

    payments.push(payment);
    this._saveToStorage('payments', payments);

    // Update registration status
    let registration_status = 'confirmed';
    if (contextType === 'ticket_registration') {
      const regs = this._getFromStorage('ticket_registrations');
      const idx = regs.findIndex(r => r.id === contextId);
      if (idx !== -1) {
        regs[idx].status = 'confirmed';
        this._saveToStorage('ticket_registrations', regs);
      }
    } else if (contextType === 'coaching_registration') {
      const regs = this._getFromStorage('coaching_registrations');
      const idx = regs.findIndex(r => r.id === contextId);
      if (idx !== -1) {
        regs[idx].status = 'confirmed';
        this._saveToStorage('coaching_registrations', regs);
      }
    } else if (contextType === 'group_registration') {
      const regs = this._getFromStorage('group_registrations');
      const idx = regs.findIndex(r => r.id === contextId);
      if (idx !== -1) {
        regs[idx].status = 'confirmed';
        this._saveToStorage('group_registrations', regs);
      }
    }

    return {
      payment_id,
      status: 'succeeded',
      amount: total,
      currency,
      card_brand,
      card_last4: cardNumStr.slice(-4),
      registration_status,
      message: 'Payment processed successfully.'
    };
  }

  // getContactTopics
  getContactTopics() {
    const topicsAll = this._getFromStorage('contact_topics');
    const topics = topicsAll
      .map(t => ({
        label: t.label,
        value: t.value,
        display_order: typeof t.display_order === 'number' ? t.display_order : 0
      }))
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    return { topics };
  }

  // submitContactMessage
  submitContactMessage(contactTopicValue, name, email, message) {
    const messages = this._getFromStorage('contact_messages');

    const id = this._generateId('contact_msg');
    const msg = {
      id,
      contact_topic_value: contactTopicValue,
      name,
      email,
      message,
      status: 'open',
      created_at: this._nowISO()
    };

    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      contact_message_id: id,
      status: 'open',
      success: true
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const section = this._loadPageContentSection('about_page') || {};
    return {
      coach_name: section.coach_name || '',
      coach_bio: section.coach_bio || '',
      qualifications: Array.isArray(section.qualifications) ? section.qualifications : [],
      specialties: Array.isArray(section.specialties) ? section.specialties : [],
      webinar_structure: section.webinar_structure || '',
      coaching_philosophy: section.coaching_philosophy || '',
      who_it_is_for: Array.isArray(section.who_it_is_for) ? section.who_it_is_for : [],
      expected_outcomes: Array.isArray(section.expected_outcomes) ? section.expected_outcomes : [],
      cta_summaries: Array.isArray(section.cta_summaries) ? section.cta_summaries : []
    };
  }

  // getTermsContent
  getTermsContent() {
    const section = this._loadPageContentSection('terms') || {};
    return {
      last_updated: section.last_updated || '',
      sections: Array.isArray(section.sections) ? section.sections : []
    };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const section = this._loadPageContentSection('privacy') || {};
    return {
      last_updated: section.last_updated || '',
      sections: Array.isArray(section.sections) ? section.sections : []
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