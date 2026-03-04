// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    const keys = [
      'membership_plans',
      'membership_addons',
      'membership_accounts',
      'payment_methods',
      'membership_renewal_orders',
      'membership_renewal_line_items',
      'webinars',
      'webinar_registrations',
      'on_demand_courses',
      'learning_plans',
      'learning_plan_items',
      'articles',
      'bookmarks',
      'templates',
      'favorite_templates',
      'member_benefit_offers',
      'benefit_enrollments',
      'forum_categories',
      'forum_threads',
      'forum_posts',
      'notification_settings',
      'member_profiles'
    ];

    keys.forEach((key) => {
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _daysBetween(start, end) {
    const ms = end.getTime() - start.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  _getCurrentMemberContext() {
    // Single-member portal; keep for future extension
    return { memberId: 'member_singleton' };
  }

  _getSingleRecord(storageKey) {
    const arr = this._getFromStorage(storageKey);
    return arr.length > 0 ? arr[0] : null;
  }

  // ----------------------
  // Helper: Learning Plan
  // ----------------------
  _getOrCreateLearningPlan() {
    let plans = this._getFromStorage('learning_plans');
    if (plans.length > 0) {
      return plans[0];
    }
    const now = this._nowIso();
    const plan = {
      id: this._generateId('learning_plan'),
      name: 'My Learning Plan',
      total_credits: 0,
      total_estimated_cost: 0,
      created_at: now,
      updated_at: null
    };
    plans.push(plan);
    this._saveToStorage('learning_plans', plans);
    return plan;
  }

  _recalculateLearningPlanTotals(learningPlanId) {
    let plans = this._getFromStorage('learning_plans');
    const planIndex = plans.findIndex((p) => p.id === learningPlanId);
    if (planIndex === -1) return null;

    const plan = plans[planIndex];
    const items = this._getFromStorage('learning_plan_items').filter(
      (i) => i.learning_plan_id === learningPlanId
    );
    const courses = this._getFromStorage('on_demand_courses');

    let totalCredits = 0;
    let totalCost = 0;
    items.forEach((item) => {
      const course = courses.find((c) => c.id === item.course_id);
      const credits = item.credits_at_add != null ? item.credits_at_add : (course ? course.cpe_credits : 0);
      const price = item.price_at_add != null ? item.price_at_add : (course ? course.price : 0);
      totalCredits += credits || 0;
      totalCost += price || 0;
    });

    plan.total_credits = totalCredits;
    plan.total_estimated_cost = totalCost;
    plan.updated_at = this._nowIso();
    plans[planIndex] = plan;
    this._saveToStorage('learning_plans', plans);
    return plan;
  }

  // ----------------------
  // Helper: Membership renewal draft
  // ----------------------
  _getOrCreateMembershipRenewalDraft() {
    let orders = this._getFromStorage('membership_renewal_orders');
    let lineItems = this._getFromStorage('membership_renewal_line_items');
    let draft = orders.find((o) => o.status === 'draft');

    if (!draft) {
      const now = this._nowIso();
      const membership = this._getSingleRecord('membership_accounts');
      const plans = this._getFromStorage('membership_plans');

      let membershipPlanId = membership ? membership.current_plan_id : null;
      const plan = membershipPlanId
        ? plans.find((p) => p.id === membershipPlanId)
        : null;

      const currentYear = new Date().getFullYear();
      const membershipYear = currentYear + 1;

      draft = {
        id: this._generateId('membership_renewal_order'),
        membership_plan_id: membershipPlanId,
        membership_year: membershipYear,
        billing_option: plan && plan.default_billing_option ? plan.default_billing_option : 'pay_in_full',
        auto_renew_enabled: membership ? !!membership.auto_renew_enabled : false,
        selected_payment_method_id: membership ? membership.auto_renew_payment_method_id || null : null,
        subtotal_amount: 0,
        tax_amount: 0,
        total_amount: 0,
        currency: 'usd',
        status: 'draft',
        created_at: now,
        submitted_at: null,
        completed_at: null,
        notes: null
      };
      orders.push(draft);
      this._saveToStorage('membership_renewal_orders', orders);
    }

    const draftLineItems = lineItems.filter((li) => li.order_id === draft.id);
    return { order: draft, lineItems: draftLineItems };
  }

  _recalculateMembershipRenewalTotals(order, lineItemsForOrder) {
    let orders = this._getFromStorage('membership_renewal_orders');
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx === -1) return order;

    let subtotal = 0;
    (lineItemsForOrder || []).forEach((li) => {
      subtotal += li.line_total || 0;
    });

    order.subtotal_amount = subtotal;
    order.tax_amount = 0; // no tax logic provided
    order.total_amount = subtotal;

    orders[idx] = order;
    this._saveToStorage('membership_renewal_orders', orders);
    return order;
  }

  // ----------------------
  // Helper: Foreign-key resolution util
  // ----------------------
  _attachMembershipOrderForeign(order) {
    if (!order) return null;
    const plans = this._getFromStorage('membership_plans');
    const paymentMethods = this._getFromStorage('payment_methods');
    const membership_plan = order.membership_plan_id
      ? plans.find((p) => p.id === order.membership_plan_id) || null
      : null;
    const selected_payment_method = order.selected_payment_method_id
      ? paymentMethods.find((pm) => pm.id === order.selected_payment_method_id) || null
      : null;
    return {
      ...order,
      membership_plan,
      selected_payment_method
    };
  }

  _attachMembershipLineItemForeign(lineItem, order, plans, addons) {
    if (!lineItem) return null;
    let membership_plan = null;
    let addon = null;
    if (lineItem.item_type === 'membership_plan') {
      membership_plan = plans.find((p) => p.id === lineItem.item_ref_id) || null;
    } else if (lineItem.item_type === 'addon') {
      addon = addons.find((a) => a.id === lineItem.item_ref_id) || null;
    }
    return {
      ...lineItem,
      order,
      membership_plan,
      addon
    };
  }

  // ==============================
  // MEMBERSHIP & RENEWAL (task_1)
  // ==============================

  getMembershipOverview() {
    let membership = this._getSingleRecord('membership_accounts');
    const plans = this._getFromStorage('membership_plans');
    const paymentMethods = this._getFromStorage('payment_methods');

    let current_plan = null;
    let auto_renew_payment_method = null;
    let days_until_expiration = null;
    let renewal_status_text = 'no_membership';

    // Ensure there is always a membership account for the single-member portal
    if (!membership) {
      const nowIso = this._nowIso();
      const currentYear = new Date().getFullYear();
      const expirationDate = new Date(currentYear, 11, 31).toISOString();
      membership = {
        id: this._generateId('membership_account'),
        membership_number: null,
        current_plan_id: null,
        current_status: 'active',
        expiration_date: expirationDate,
        auto_renew_enabled: false,
        auto_renew_payment_method_id: null,
        last_renewed_at: null,
        created_at: nowIso,
        updated_at: nowIso
      };
      this._saveToStorage('membership_accounts', [membership]);
    }

    if (membership) {
      if (membership.current_plan_id) {
        current_plan = plans.find((p) => p.id === membership.current_plan_id) || null;
      }
      if (membership.auto_renew_payment_method_id) {
        auto_renew_payment_method =
          paymentMethods.find((pm) => pm.id === membership.auto_renew_payment_method_id) || null;
      }

      const now = new Date();
      const expDate = this._parseDate(membership.expiration_date);
      if (expDate) {
        days_until_expiration = this._daysBetween(now, expDate);
      }

      if (membership.current_status === 'active') {
        if (days_until_expiration != null && days_until_expiration <= 30) {
          renewal_status_text = 'renewal_due_soon';
        } else {
          renewal_status_text = 'active';
        }
      } else if (membership.current_status === 'lapsed') {
        renewal_status_text = 'lapsed';
      } else if (membership.current_status === 'pending_renewal') {
        renewal_status_text = 'pending_renewal';
      } else if (membership.current_status === 'canceled') {
        renewal_status_text = 'canceled';
      }
    }

    const membership_with_fk = membership
      ? {
          ...membership,
          current_plan,
          auto_renew_payment_method
        }
      : null;

    return {
      membership_account: membership_with_fk,
      current_plan,
      auto_renew_payment_method,
      days_until_expiration,
      renewal_status_text
    };
  }

  getSavedPaymentMethods() {
    const methods = this._getFromStorage('payment_methods');
    return methods.filter((m) => m.is_active);
  }

  getMembershipRenewalContext() {
    const membership = this._getSingleRecord('membership_accounts');
    const plans = this._getFromStorage('membership_plans');
    const addons = this._getFromStorage('membership_addons');
    const paymentMethods = this._getFromStorage('payment_methods');

    const { order, lineItems } = this._getOrCreateMembershipRenewalDraft();

    const current_plan = membership && membership.current_plan_id
      ? plans.find((p) => p.id === membership.current_plan_id) || null
      : null;

    const available_plans = plans.filter((p) => p.is_active);
    const available_addons = addons.filter((a) => a.is_active);
    const saved_payment_methods = paymentMethods.filter((pm) => pm.is_active);

    const addon_ids = lineItems
      .filter((li) => li.item_type === 'addon')
      .map((li) => li.item_ref_id);

    const current_selection = {
      membership_plan_id: order.membership_plan_id,
      addon_ids,
      billing_option: order.billing_option,
      auto_renew_enabled: order.auto_renew_enabled,
      selected_payment_method_id: order.selected_payment_method_id
    };

    const orderWithFk = this._attachMembershipOrderForeign(order);
    const draft_line_items = lineItems.map((li) =>
      this._attachMembershipLineItemForeign(li, orderWithFk, plans, addons)
    );

    const membership_with_fk = membership
      ? {
          ...membership,
          current_plan,
          auto_renew_payment_method: membership.auto_renew_payment_method_id
            ? paymentMethods.find((pm) => pm.id === membership.auto_renew_payment_method_id) || null
            : null
        }
      : null;

    return {
      current_membership: membership_with_fk,
      current_plan,
      available_plans,
      available_addons,
      saved_payment_methods,
      current_selection,
      draft_order: orderWithFk,
      draft_line_items
    };
  }

  updateMembershipRenewalSelection(
    membershipPlanId,
    addonIds,
    billingOption,
    autoRenewEnabled,
    selectedPaymentMethodId
  ) {
    const addonsArray = Array.isArray(addonIds) ? addonIds : [];
    const plans = this._getFromStorage('membership_plans');
    const addons = this._getFromStorage('membership_addons');
    const paymentMethods = this._getFromStorage('payment_methods');

    const selectedPlan = plans.find((p) => p.id === membershipPlanId) || null;

    const { order, lineItems } = this._getOrCreateMembershipRenewalDraft();

    // Update order core fields
    order.membership_plan_id = membershipPlanId;
    order.billing_option = billingOption;
    order.auto_renew_enabled = !!autoRenewEnabled;
    order.selected_payment_method_id = selectedPaymentMethodId || null;

    // Rebuild line items for this order
    let allLineItems = this._getFromStorage('membership_renewal_line_items');
    allLineItems = allLineItems.filter((li) => li.order_id !== order.id);

    const newLineItems = [];
    let sortOrder = 1;

    if (selectedPlan) {
      const planLine = {
        id: this._generateId('membership_renewal_line_item'),
        order_id: order.id,
        item_type: 'membership_plan',
        item_ref_id: selectedPlan.id,
        description: selectedPlan.name,
        quantity: 1,
        unit_price: selectedPlan.base_price,
        line_total: selectedPlan.base_price,
        sort_order: sortOrder++
      };
      newLineItems.push(planLine);
    }

    addonsArray.forEach((addonId) => {
      const addon = addons.find((a) => a.id === addonId);
      if (!addon) return;
      const addonLine = {
        id: this._generateId('membership_renewal_line_item'),
        order_id: order.id,
        item_type: 'addon',
        item_ref_id: addon.id,
        description: addon.name,
        quantity: 1,
        unit_price: addon.price,
        line_total: addon.price,
        sort_order: sortOrder++
      };
      newLineItems.push(addonLine);
    });

    allLineItems = allLineItems.concat(newLineItems);
    this._saveToStorage('membership_renewal_line_items', allLineItems);

    // Recalculate totals
    const updatedOrder = this._recalculateMembershipRenewalTotals(order, newLineItems);

    const addon_ids = newLineItems
      .filter((li) => li.item_type === 'addon')
      .map((li) => li.item_ref_id);

    const current_selection = {
      membership_plan_id: updatedOrder.membership_plan_id,
      addon_ids,
      billing_option: updatedOrder.billing_option,
      auto_renew_enabled: updatedOrder.auto_renew_enabled,
      selected_payment_method_id: updatedOrder.selected_payment_method_id
    };

    const pricing_summary = {
      subtotal_amount: updatedOrder.subtotal_amount,
      tax_amount: updatedOrder.tax_amount,
      total_amount: updatedOrder.total_amount,
      currency: updatedOrder.currency
    };

    const orderWithFk = this._attachMembershipOrderForeign(updatedOrder);
    const draft_line_items = newLineItems.map((li) =>
      this._attachMembershipLineItemForeign(li, orderWithFk, plans, addons)
    );

    return {
      draft_order: orderWithFk,
      draft_line_items,
      current_selection,
      pricing_summary
    };
  }

  getMembershipRenewalSummary() {
    const plans = this._getFromStorage('membership_plans');
    const addonsAll = this._getFromStorage('membership_addons');

    const { order, lineItems } = this._getOrCreateMembershipRenewalDraft();
    const plan = order.membership_plan_id
      ? plans.find((p) => p.id === order.membership_plan_id) || null
      : null;

    const addonIds = lineItems
      .filter((li) => li.item_type === 'addon')
      .map((li) => li.item_ref_id);

    const addons = addonsAll.filter((a) => addonIds.includes(a.id));

    const orderWithFk = this._attachMembershipOrderForeign(order);
    const line_items = lineItems.map((li) =>
      this._attachMembershipLineItemForeign(li, orderWithFk, plans, addonsAll)
    );

    return {
      draft_order: orderWithFk,
      line_items,
      plan,
      addons
    };
  }

  submitMembershipRenewal() {
    let orders = this._getFromStorage('membership_renewal_orders');
    const lineItems = this._getFromStorage('membership_renewal_line_items');

    const draftIndex = orders.findIndex((o) => o.status === 'draft');
    if (draftIndex === -1) {
      return {
        success: false,
        message: 'No draft renewal order to submit.',
        renewal_order: null,
        line_items: [],
        updated_membership: null
      };
    }

    const now = this._nowIso();
    const draft = orders[draftIndex];

    if (!draft.membership_plan_id) {
      return {
        success: false,
        message: 'Membership plan not selected for renewal.',
        renewal_order: null,
        line_items: [],
        updated_membership: null
      };
    }

    // Mark order as submitted & completed
    draft.status = 'completed';
    draft.submitted_at = now;
    draft.completed_at = now;
    orders[draftIndex] = draft;
    this._saveToStorage('membership_renewal_orders', orders);

    const thisLineItems = lineItems.filter((li) => li.order_id === draft.id);

    // Update membership account
    let memberships = this._getFromStorage('membership_accounts');
    let membership = memberships.length > 0 ? memberships[0] : null;
    const expYear = draft.membership_year || new Date().getFullYear() + 1;
    const newExpiration = new Date(expYear, 11, 31).toISOString();

    if (!membership) {
      membership = {
        id: this._generateId('membership_account'),
        membership_number: null,
        current_plan_id: draft.membership_plan_id,
        current_status: 'active',
        expiration_date: newExpiration,
        auto_renew_enabled: draft.auto_renew_enabled,
        auto_renew_payment_method_id: draft.selected_payment_method_id || null,
        last_renewed_at: now,
        created_at: now,
        updated_at: now
      };
      memberships.push(membership);
    } else {
      membership.current_plan_id = draft.membership_plan_id;
      membership.current_status = 'active';
      membership.expiration_date = newExpiration;
      membership.auto_renew_enabled = draft.auto_renew_enabled;
      membership.auto_renew_payment_method_id = draft.selected_payment_method_id || null;
      membership.last_renewed_at = now;
      membership.updated_at = now;
      memberships[0] = membership;
    }

    this._saveToStorage('membership_accounts', memberships);

    // Attach foreign key data
    const plans = this._getFromStorage('membership_plans');
    const paymentMethods = this._getFromStorage('payment_methods');
    const addons = this._getFromStorage('membership_addons');

    const orderWithFk = this._attachMembershipOrderForeign(draft);
    const line_items = thisLineItems.map((li) =>
      this._attachMembershipLineItemForeign(li, orderWithFk, plans, addons)
    );

    const current_plan = membership.current_plan_id
      ? plans.find((p) => p.id === membership.current_plan_id) || null
      : null;
    const auto_renew_payment_method = membership.auto_renew_payment_method_id
      ? paymentMethods.find((pm) => pm.id === membership.auto_renew_payment_method_id) || null
      : null;

    const updated_membership = {
      ...membership,
      current_plan,
      auto_renew_payment_method
    };

    return {
      success: true,
      message: 'Membership renewal completed.',
      renewal_order: orderWithFk,
      line_items,
      updated_membership
    };
  }

  getMembershipRenewalHistory() {
    const orders = this._getFromStorage('membership_renewal_orders');
    const nonDraft = orders.filter((o) => o.status !== 'draft');
    const plans = this._getFromStorage('membership_plans');
    const paymentMethods = this._getFromStorage('payment_methods');

    const enriched = nonDraft
      .sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      })
      .map((order) => {
        const membership_plan = order.membership_plan_id
          ? plans.find((p) => p.id === order.membership_plan_id) || null
          : null;
        const selected_payment_method = order.selected_payment_method_id
          ? paymentMethods.find((pm) => pm.id === order.selected_payment_method_id) || null
          : null;
        return {
          ...order,
          membership_plan,
          selected_payment_method
        };
      });

    return enriched;
  }

  // ==============================
  // WEBINARS (task_2)
  // ==============================

  getWebinarFilterOptions() {
    const webinars = this._getFromStorage('webinars');
    const creditSet = new Set();
    webinars.forEach((w) => {
      creditSet.add(w.cpe_credits);
    });

    const cpe_credit_options = Array.from(creditSet).sort((a, b) => a - b);

    const format_options = ['live_webinar', 'on_demand', 'in_person'];

    const sort_options = [
      { id: 'price_low_to_high', label: 'Price: Low to High' },
      { id: 'date_soonest', label: 'Date: Soonest' },
      { id: 'date_latest', label: 'Date: Latest' }
    ];

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const nextMonthStart = new Date(year, month + 1, 1);
    const nextMonthEnd = new Date(year, month + 2, 0);

    const date_presets = [
      {
        id: 'next_calendar_month',
        label: 'Next Calendar Month',
        start_date: nextMonthStart.toISOString().slice(0, 10),
        end_date: nextMonthEnd.toISOString().slice(0, 10)
      }
    ];

    return {
      cpe_credit_options,
      format_options,
      sort_options,
      date_presets
    };
  }

  searchWebinars(query, startDate, endDate, cpeCredits, format, sortBy, page, pageSize) {
    const webinars = this._getFromStorage('webinars');
    let results = webinars.slice();

    if (query) {
      const q = query.toLowerCase();
      results = results.filter((w) => {
        const inTitle = w.title && w.title.toLowerCase().includes(q);
        const inDesc = w.description && w.description.toLowerCase().includes(q);
        const inTags = Array.isArray(w.topic_tags)
          ? w.topic_tags.some((t) => String(t).toLowerCase().includes(q))
          : false;
        return inTitle || inDesc || inTags;
      });
    }

    if (startDate) {
      const start = new Date(startDate);
      results = results.filter((w) => {
        const d = this._parseDate(w.start_datetime);
        return d && d >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      results = results.filter((w) => {
        const d = this._parseDate(w.start_datetime);
        return d && d <= end;
      });
    }

    if (typeof cpeCredits === 'number') {
      results = results.filter((w) => w.cpe_credits === cpeCredits);
    }

    if (format) {
      results = results.filter((w) => w.format === format);
    }

    if (sortBy === 'price_low_to_high') {
      results.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'date_latest') {
      results.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return db - da;
      });
    } else {
      // default or 'date_soonest'
      results.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      });
    }

    const total_count = results.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIdx = (p - 1) * ps;
    const paged = results.slice(startIdx, startIdx + ps);

    return {
      results: paged,
      total_count,
      page: p,
      page_size: ps
    };
  }

  getWebinarDetail(webinarId) {
    const webinars = this._getFromStorage('webinars');
    const webinar = webinars.find((w) => w.id === webinarId) || null;

    const registrations = this._getFromStorage('webinar_registrations');
    const reg = registrations.find((r) => r.webinar_id === webinarId && r.registration_status !== 'canceled');

    return {
      webinar,
      is_registered: !!reg,
      registration_status: reg ? reg.registration_status : null
    };
  }

  registerForWebinar(webinarId, useProfileInfo) {
    const webinars = this._getFromStorage('webinars');
    const webinar = webinars.find((w) => w.id === webinarId);

    if (!webinar) {
      return {
        success: false,
        message: 'Webinar not found.',
        registration: null
      };
    }

    const registrations = this._getFromStorage('webinar_registrations');

    const registration = {
      id: this._generateId('webinar_registration'),
      webinar_id: webinarId,
      registration_status: 'confirmed',
      registered_at: this._nowIso(),
      use_profile_info: !!useProfileInfo,
      price_paid: webinar.price,
      payment_method_id: null,
      confirmation_code: 'WR-' + Math.random().toString(36).substring(2, 10).toUpperCase()
    };

    registrations.push(registration);
    this._saveToStorage('webinar_registrations', registrations);

    const registrationWithFk = {
      ...registration,
      webinar
    };

    return {
      success: true,
      message: 'Webinar registration completed.',
      registration: registrationWithFk
    };
  }

  // ==================================
  // ON-DEMAND COURSES & LEARNING PLAN (task_3)
  // ==================================

  getOnDemandCourseFilterOptions() {
    const courses = this._getFromStorage('on_demand_courses');
    const priceSet = new Set();
    const creditSet = new Set();
    const stateSet = new Set();

    courses.forEach((c) => {
      priceSet.add(c.price);
      creditSet.add(c.cpe_credits);
      if (c.state_focus) {
        stateSet.add(c.state_focus);
      }
    });

    const price_max_options = Array.from(priceSet)
      .sort((a, b) => a - b)
      .filter((v) => typeof v === 'number');

    const credit_options = Array.from(creditSet)
      .sort((a, b) => a - b)
      .filter((v) => typeof v === 'number');

    const format_options = ['on_demand', 'live_webinar', 'self_study'];

    const state_options = Array.from(stateSet).sort();

    return {
      price_max_options,
      credit_options,
      format_options,
      state_options
    };
  }

  searchOnDemandCourses(query, maxPrice, minCredits, format, state, page, pageSize) {
    let results = this._getFromStorage('on_demand_courses');

    if (query) {
      const q = query.toLowerCase();
      results = results.filter((c) => {
        const inTitle = c.title && c.title.toLowerCase().includes(q);
        const inDesc = c.description && c.description.toLowerCase().includes(q);
        const inTags = Array.isArray(c.topic_tags)
          ? c.topic_tags.some((t) => String(t).toLowerCase().includes(q))
          : false;
        const inBadge = Array.isArray(c.badge_labels)
          ? c.badge_labels.some((b) => String(b).toLowerCase().includes(q))
          : false;
        return inTitle || inDesc || inTags || inBadge;
      });
    }

    if (typeof maxPrice === 'number') {
      results = results.filter((c) => c.price <= maxPrice);
    }

    if (typeof minCredits === 'number') {
      results = results.filter((c) => c.cpe_credits >= minCredits);
    }

    if (format) {
      results = results.filter((c) => c.format === format);
    }

    if (state) {
      results = results.filter((c) => c.state_focus === state);
    }

    const total_count = results.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIdx = (p - 1) * ps;
    const paged = results.slice(startIdx, startIdx + ps);

    return {
      results: paged,
      total_count,
      page: p,
      page_size: ps
    };
  }

  getOnDemandCourseDetail(courseId) {
    const courses = this._getFromStorage('on_demand_courses');
    return courses.find((c) => c.id === courseId) || null;
  }

  addCourseToLearningPlan(courseId) {
    const courses = this._getFromStorage('on_demand_courses');
    const course = courses.find((c) => c.id === courseId);

    if (!course) {
      return {
        success: false,
        message: 'Course not found.',
        learning_plan: null,
        plan_item: null
      };
    }

    const plan = this._getOrCreateLearningPlan();

    let items = this._getFromStorage('learning_plan_items');
    let existing = items.find(
      (i) => i.learning_plan_id === plan.id && i.course_id === courseId
    );

    if (!existing) {
      const item = {
        id: this._generateId('learning_plan_item'),
        learning_plan_id: plan.id,
        course_id: courseId,
        added_at: this._nowIso(),
        status: 'not_started',
        price_at_add: course.price,
        credits_at_add: course.cpe_credits
      };
      items.push(item);
      this._saveToStorage('learning_plan_items', items);
      existing = item;
    }

    const updatedPlan = this._recalculateLearningPlanTotals(plan.id) || plan;

    const plan_item = {
      ...existing,
      course
    };

    return {
      success: true,
      message: 'Course added to learning plan.',
      learning_plan: updatedPlan,
      plan_item
    };
  }

  removeCourseFromLearningPlan(learningPlanItemId) {
    let items = this._getFromStorage('learning_plan_items');
    const idx = items.findIndex((i) => i.id === learningPlanItemId);

    if (idx === -1) {
      return {
        success: false,
        message: 'Learning plan item not found.',
        learning_plan: null
      };
    }

    const item = items[idx];
    items.splice(idx, 1);
    this._saveToStorage('learning_plan_items', items);

    const updatedPlan = this._recalculateLearningPlanTotals(item.learning_plan_id);

    return {
      success: true,
      message: 'Course removed from learning plan.',
      learning_plan: updatedPlan
    };
  }

  reorderLearningPlanItems(orderedItemIds) {
    if (!Array.isArray(orderedItemIds)) {
      return {
        success: false,
        message: 'orderedItemIds must be an array.'
      };
    }

    let items = this._getFromStorage('learning_plan_items');
    const idToItem = new Map(items.map((i) => [i.id, i]));

    orderedItemIds.forEach((id, index) => {
      const item = idToItem.get(id);
      if (item) {
        item.sort_order = index + 1;
      }
    });

    this._saveToStorage('learning_plan_items', items);

    return {
      success: true,
      message: 'Learning plan items reordered.'
    };
  }

  getLearningPlan() {
    const plans = this._getFromStorage('learning_plans');
    if (plans.length === 0) {
      // No plan yet
      return {
        learning_plan: null,
        items: []
      };
    }

    const plan = plans[0];
    const itemsAll = this._getFromStorage('learning_plan_items');
    const courses = this._getFromStorage('on_demand_courses');

    const planItems = itemsAll
      .filter((i) => i.learning_plan_id === plan.id)
      .sort((a, b) => {
        if (a.sort_order != null && b.sort_order != null) {
          return a.sort_order - b.sort_order;
        }
        const da = this._parseDate(a.added_at) || new Date(0);
        const db = this._parseDate(b.added_at) || new Date(0);
        return da - db;
      });

    const items = planItems.map((pi) => {
      const course = courses.find((c) => c.id === pi.course_id) || null;
      return {
        plan_item: pi,
        course
      };
    });

    return {
      learning_plan: plan,
      items
    };
  }

  getLearningPlanOverview(maxItems) {
    const plans = this._getFromStorage('learning_plans');
    if (plans.length === 0) {
      return {
        learning_plan: null,
        preview_items: []
      };
    }

    const plan = plans[0];
    const limit = typeof maxItems === 'number' && maxItems > 0 ? maxItems : 3;

    const itemsAll = this._getFromStorage('learning_plan_items');
    const courses = this._getFromStorage('on_demand_courses');

    const planItems = itemsAll
      .filter((i) => i.learning_plan_id === plan.id)
      .sort((a, b) => {
        if (a.sort_order != null && b.sort_order != null) {
          return a.sort_order - b.sort_order;
        }
        const da = this._parseDate(a.added_at) || new Date(0);
        const db = this._parseDate(b.added_at) || new Date(0);
        return da - db;
      })
      .slice(0, limit);

    const preview_items = planItems.map((pi) => {
      const course = courses.find((c) => c.id === pi.course_id) || null;
      return {
        plan_item: pi,
        course
      };
    });

    return {
      learning_plan: plan,
      preview_items
    };
  }

  // ==============================
  // ARTICLES & BOOKMARKS (task_4)
  // ==============================

  getArticleFilterOptions() {
    const content_type_options = ['article', 'video', 'podcast'];

    const published_date_presets = [
      { id: 'last_7_days', label: 'Last 7 days', days_back: 7 },
      { id: 'last_30_days', label: 'Last 30 days', days_back: 30 },
      { id: 'last_90_days', label: 'Last 90 days', days_back: 90 }
    ];

    const sort_options = [
      { id: 'newest_first', label: 'Newest First' },
      { id: 'oldest_first', label: 'Oldest First' },
      { id: 'relevance', label: 'Relevance' }
    ];

    return {
      content_type_options,
      published_date_presets,
      sort_options
    };
  }

  _getPresetDaysBack(presetId) {
    if (!presetId) return null;
    if (presetId === 'last_7_days') return 7;
    if (presetId === 'last_30_days') return 30;
    if (presetId === 'last_90_days') return 90;
    return null;
  }

  searchArticles(query, contentType, publishedDatePresetId, sortBy, page, pageSize) {
    let results = this._getFromStorage('articles');

    // Only published content
    results = results.filter((a) => a.status === 'published');

    if (query) {
      const q = query.toLowerCase();
      results = results.filter((a) => {
        const inTitle = a.title && a.title.toLowerCase().includes(q);
        const inSummary = a.summary && a.summary.toLowerCase().includes(q);
        const inBody = a.body && a.body.toLowerCase().includes(q);
        const inTags = Array.isArray(a.topic_tags)
          ? a.topic_tags.some((t) => String(t).toLowerCase().includes(q))
          : false;
        // Treat IRS enforcement update flag as matching "irs enforcement" queries
        const inEnforcementFlag =
          a.is_irs_enforcement_update && q.includes('irs enforcement');
        return inTitle || inSummary || inBody || inTags || inEnforcementFlag;
      });
    }

    if (contentType) {
      results = results.filter((a) => a.content_type === contentType);
    }

    const daysBack = this._getPresetDaysBack(publishedDatePresetId);
    if (daysBack != null) {
      const now = new Date();
      const threshold = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      results = results.filter((a) => {
        const d = this._parseDate(a.published_date);
        return d && d >= threshold;
      });
    }

    if (sortBy === 'oldest_first') {
      results.sort((a, b) => {
        const da = this._parseDate(a.published_date) || new Date(0);
        const db = this._parseDate(b.published_date) || new Date(0);
        return da - db;
      });
    } else if (sortBy === 'relevance') {
      // no additional sorting, keep existing order
    } else {
      // default or 'newest_first'
      results.sort((a, b) => {
        const da = this._parseDate(a.published_date) || new Date(0);
        const db = this._parseDate(b.published_date) || new Date(0);
        return db - da;
      });
    }

    const total_count = results.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIdx = (p - 1) * ps;
    const paged = results.slice(startIdx, startIdx + ps);

    return {
      results: paged,
      total_count,
      page: p,
      page_size: ps
    };
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;

    const bookmarks = this._getFromStorage('bookmarks');
    const bm = bookmarks.find((b) => b.article_id === articleId) || null;

    return {
      article,
      is_bookmarked: !!bm,
      bookmark_id: bm ? bm.id : null
    };
  }

  bookmarkArticle(articleId, sourcePage) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId);

    if (!article) {
      return {
        success: false,
        message: 'Article not found.',
        bookmark: null
      };
    }

    let bookmarks = this._getFromStorage('bookmarks');
    let existing = bookmarks.find((b) => b.article_id === articleId);
    if (!existing) {
      existing = {
        id: this._generateId('bookmark'),
        article_id: articleId,
        created_at: this._nowIso(),
        source_page: sourcePage || 'article_library'
      };
      bookmarks.push(existing);
      this._saveToStorage('bookmarks', bookmarks);
    }

    const bookmarkWithFk = {
      ...existing,
      article
    };

    return {
      success: true,
      message: 'Article bookmarked.',
      bookmark: bookmarkWithFk
    };
  }

  unbookmarkArticle(articleId) {
    let bookmarks = this._getFromStorage('bookmarks');
    const initialLength = bookmarks.length;
    bookmarks = bookmarks.filter((b) => b.article_id !== articleId);
    this._saveToStorage('bookmarks', bookmarks);

    const removed = initialLength !== bookmarks.length;

    return {
      success: removed,
      message: removed ? 'Bookmark removed.' : 'Bookmark not found.'
    };
  }

  getBookmarkedArticles() {
    const bookmarks = this._getFromStorage('bookmarks');
    const articles = this._getFromStorage('articles');

    return bookmarks.map((b) => {
      const article = articles.find((a) => a.id === b.article_id) || null;
      return {
        bookmark: b,
        article
      };
    });
  }

  getRelatedArticles(articleId) {
    const articles = this._getFromStorage('articles');
    const current = articles.find((a) => a.id === articleId);
    if (!current) return [];

    const currentTags = new Set((current.topic_tags || []).map((t) => String(t)));

    const related = articles
      .filter((a) => a.id !== articleId && a.status === 'published')
      .map((a) => {
        const tags = new Set((a.topic_tags || []).map((t) => String(t)));
        let shared = 0;
        currentTags.forEach((t) => {
          if (tags.has(t)) shared += 1;
        });
        return { article: a, shared };
      })
      .filter((x) => x.shared > 0)
      .sort((a, b) => {
        if (b.shared !== a.shared) return b.shared - a.shared;
        const da = this._parseDate(a.article.published_date) || new Date(0);
        const db = this._parseDate(b.article.published_date) || new Date(0);
        return db - da;
      })
      .map((x) => x.article);

    return related;
  }

  // ==============================
  // PRACTICE TEMPLATES (task_7)
  // ==============================

  getTemplateCategories() {
    return [
      {
        id: 'engagement_letters',
        label: 'Engagement Letters',
        description: 'Templates for client engagement letters.'
      },
      {
        id: 'tax_organizers',
        label: 'Tax Organizers',
        description: 'Client tax organizer templates.'
      },
      {
        id: 'invoices_billing',
        label: 'Invoices & Billing',
        description: 'Invoice and billing templates.'
      },
      {
        id: 'other',
        label: 'Other Templates',
        description: 'Miscellaneous practice templates.'
      }
    ];
  }

  listTemplates(category, clientType, query, page, pageSize) {
    let results = this._getFromStorage('templates');

    results = results.filter((t) => t.category === category && t.is_active);

    if (clientType) {
      results = results.filter((t) => {
        return (
          t.client_type === clientType ||
          t.client_type === 'both' ||
          t.client_type === 'unspecified'
        );
      });
    }

    if (query) {
      const q = query.toLowerCase();
      results = results.filter((t) => {
        const inName = t.name && t.name.toLowerCase().includes(q);
        const inDesc = t.description && t.description.toLowerCase().includes(q);
        const inLabel = t.label && t.label.toLowerCase().includes(q);
        const inTags = Array.isArray(t.tags)
          ? t.tags.some((tg) => String(tg).toLowerCase().includes(q))
          : false;
        return inName || inDesc || inLabel || inTags;
      });
    }

    const total_count = results.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIdx = (p - 1) * ps;
    const paged = results.slice(startIdx, startIdx + ps);

    return {
      results: paged,
      total_count,
      page: p,
      page_size: ps
    };
  }

  getTemplateDetail(templateId) {
    const templates = this._getFromStorage('templates');
    const template = templates.find((t) => t.id === templateId) || null;

    const favorites = this._getFromStorage('favorite_templates');
    const is_favorite = !!favorites.find((f) => f.template_id === templateId);

    return {
      template,
      is_favorite
    };
  }

  favoriteTemplate(templateId, sourcePage) {
    const templates = this._getFromStorage('templates');
    const template = templates.find((t) => t.id === templateId);

    if (!template) {
      return {
        success: false,
        message: 'Template not found.',
        favorite: null
      };
    }

    let favorites = this._getFromStorage('favorite_templates');
    let existing = favorites.find((f) => f.template_id === templateId);

    if (!existing) {
      existing = {
        id: this._generateId('favorite_template'),
        template_id: templateId,
        created_at: this._nowIso(),
        source_page: sourcePage || 'template_detail'
      };
      favorites.push(existing);
      this._saveToStorage('favorite_templates', favorites);
    }

    const favoriteWithFk = {
      ...existing,
      template
    };

    return {
      success: true,
      message: 'Template added to favorites.',
      favorite: favoriteWithFk
    };
  }

  unfavoriteTemplate(templateId) {
    let favorites = this._getFromStorage('favorite_templates');
    const initialLength = favorites.length;
    favorites = favorites.filter((f) => f.template_id !== templateId);
    this._saveToStorage('favorite_templates', favorites);

    const removed = initialLength !== favorites.length;

    return {
      success: removed,
      message: removed ? 'Template removed from favorites.' : 'Favorite not found.'
    };
  }

  getFavoriteTemplates() {
    const favorites = this._getFromStorage('favorite_templates');
    const templates = this._getFromStorage('templates');

    return favorites.map((f) => {
      const template = templates.find((t) => t.id === f.template_id) || null;
      return {
        favorite: f,
        template
      };
    });
  }

  // ==============================
  // MEMBER BENEFIT OFFERS (task_9)
  // ==============================

  searchMemberBenefitOffers(category, minCoverageAmount, maxCoverageAmount, sortBy, page, pageSize) {
    let results = this._getFromStorage('member_benefit_offers');

    results = results.filter((o) => o.category === category && o.is_active);

    if (typeof minCoverageAmount === 'number') {
      results = results.filter((o) => {
        const min = typeof o.coverage_amount_min === 'number' ? o.coverage_amount_min : 0;
        const max = typeof o.coverage_amount_max === 'number' ? o.coverage_amount_max : Infinity;
        return max >= minCoverageAmount || min >= minCoverageAmount;
      });
    }

    if (typeof maxCoverageAmount === 'number') {
      results = results.filter((o) => {
        const min = typeof o.coverage_amount_min === 'number' ? o.coverage_amount_min : 0;
        const max = typeof o.coverage_amount_max === 'number' ? o.coverage_amount_max : Infinity;
        return min <= maxCoverageAmount || max <= maxCoverageAmount;
      });
    }

    if (sortBy === 'price_high_to_low') {
      results.sort((a, b) => b.annual_premium - a.annual_premium);
    } else if (sortBy === 'coverage_high_to_low') {
      results.sort((a, b) => {
        const aMax = typeof a.coverage_amount_max === 'number' ? a.coverage_amount_max : a.coverage_amount_min || 0;
        const bMax = typeof b.coverage_amount_max === 'number' ? b.coverage_amount_max : b.coverage_amount_min || 0;
        return bMax - aMax;
      });
    } else {
      // default or 'price_low_to_high'
      results.sort((a, b) => a.annual_premium - b.annual_premium);
    }

    const total_count = results.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIdx = (p - 1) * ps;
    const paged = results.slice(startIdx, startIdx + ps);

    return {
      results: paged,
      total_count,
      page: p,
      page_size: ps
    };
  }

  getMemberBenefitOfferDetail(benefitOfferId) {
    const offers = this._getFromStorage('member_benefit_offers');
    const offer = offers.find((o) => o.id === benefitOfferId) || null;

    const enrollments = this._getFromStorage('benefit_enrollments');
    const current_enrollment = enrollments.find((e) => e.benefit_offer_id === benefitOfferId) || null;

    return {
      offer,
      current_enrollment
    };
  }

  enrollInBenefitOffer(benefitOfferId, coverageLevelSelected) {
    const offers = this._getFromStorage('member_benefit_offers');
    const offer = offers.find((o) => o.id === benefitOfferId);

    if (!offer) {
      return {
        success: false,
        message: 'Benefit offer not found.',
        enrollment: null
      };
    }

    let enrollments = this._getFromStorage('benefit_enrollments');

    const enrollment = {
      id: this._generateId('benefit_enrollment'),
      benefit_offer_id: benefitOfferId,
      coverage_level_selected: coverageLevelSelected,
      annual_premium: offer.annual_premium,
      status: 'active',
      enrolled_at: this._nowIso(),
      confirmation_number: 'BE-' + Math.random().toString(36).substring(2, 10).toUpperCase()
    };

    enrollments.push(enrollment);
    this._saveToStorage('benefit_enrollments', enrollments);

    const enrollmentWithFk = {
      ...enrollment,
      offer
    };

    return {
      success: true,
      message: 'Enrolled in benefit offer.',
      enrollment: enrollmentWithFk
    };
  }

  // ==============================
  // FORUMS & COMMUNITY (task_6)
  // ==============================

  getForumCategories() {
    const categories = this._getFromStorage('forum_categories');
    return categories.filter((c) => c.is_active);
  }

  getForumThreads(categoryId, sortBy, page, pageSize) {
    const categories = this._getFromStorage('forum_categories');
    const category = categories.find((c) => c.id === categoryId) || null;

    let threads = this._getFromStorage('forum_threads');
    threads = threads.filter((t) => t.category_id === categoryId);

    if (sortBy === 'created_desc') {
      threads.sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      });
    } else {
      // default or 'last_activity_desc'
      threads.sort((a, b) => {
        const da = this._parseDate(a.last_activity_at || a.created_at) || new Date(0);
        const db = this._parseDate(b.last_activity_at || b.created_at) || new Date(0);
        return db - da;
      });
    }

    const total_count = threads.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIdx = (p - 1) * ps;
    const paged = threads.slice(startIdx, startIdx + ps).map((t) => ({
      ...t,
      category
    }));

    return {
      category,
      threads: paged,
      total_count,
      page: p,
      page_size: ps
    };
  }

  getForumThread(threadId) {
    const threads = this._getFromStorage('forum_threads');
    const postsAll = this._getFromStorage('forum_posts');

    const thread = threads.find((t) => t.id === threadId) || null;
    const posts = postsAll
      .filter((p) => p.thread_id === threadId)
      .sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return da - db;
      })
      .map((p) => ({
        ...p,
        thread
      }));

    return {
      thread,
      posts
    };
  }

  createForumThread(categoryId, subject, body, tags, subscribe) {
    const categories = this._getFromStorage('forum_categories');
    const category = categories.find((c) => c.id === categoryId);

    if (!category) {
      return {
        success: false,
        message: 'Forum category not found.',
        thread: null
      };
    }

    const now = this._nowIso();
    let threads = this._getFromStorage('forum_threads');
    let posts = this._getFromStorage('forum_posts');

    const thread = {
      id: this._generateId('forum_thread'),
      category_id: categoryId,
      subject,
      body,
      created_at: now,
      tags: Array.isArray(tags) ? tags : [],
      is_subscribed: !!subscribe,
      status: 'open',
      reply_count: 0,
      last_activity_at: now
    };

    threads.push(thread);

    const originalPost = {
      id: this._generateId('forum_post'),
      thread_id: thread.id,
      body,
      created_at: now,
      is_original_post: true
    };

    posts.push(originalPost);

    this._saveToStorage('forum_threads', threads);
    this._saveToStorage('forum_posts', posts);

    const threadWithFk = {
      ...thread,
      category
    };

    return {
      success: true,
      message: 'Forum thread created.',
      thread: threadWithFk
    };
  }

  replyToForumThread(threadId, body) {
    let threads = this._getFromStorage('forum_threads');
    let posts = this._getFromStorage('forum_posts');

    const threadIndex = threads.findIndex((t) => t.id === threadId);
    if (threadIndex === -1) {
      return {
        success: false,
        message: 'Thread not found.',
        post: null
      };
    }

    const now = this._nowIso();
    const post = {
      id: this._generateId('forum_post'),
      thread_id: threadId,
      body,
      created_at: now,
      is_original_post: false
    };

    posts.push(post);
    this._saveToStorage('forum_posts', posts);

    const thread = threads[threadIndex];
    thread.reply_count = (thread.reply_count || 0) + 1;
    thread.last_activity_at = now;
    threads[threadIndex] = thread;
    this._saveToStorage('forum_threads', threads);

    const postWithFk = {
      ...post,
      thread
    };

    return {
      success: true,
      message: 'Reply posted.',
      post: postWithFk
    };
  }

  setForumThreadSubscription(threadId, subscribed) {
    let threads = this._getFromStorage('forum_threads');
    const categories = this._getFromStorage('forum_categories');

    const idx = threads.findIndex((t) => t.id === threadId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Thread not found.',
        thread: null
      };
    }

    const thread = threads[idx];
    thread.is_subscribed = !!subscribed;
    threads[idx] = thread;
    this._saveToStorage('forum_threads', threads);

    const category = categories.find((c) => c.id === thread.category_id) || null;

    const threadWithFk = {
      ...thread,
      category
    };

    return {
      success: true,
      message: subscribed ? 'Subscribed to thread.' : 'Unsubscribed from thread.',
      thread: threadWithFk
    };
  }

  // ==============================
  // NOTIFICATION SETTINGS (task_5)
  // ==============================

  getNotificationSettings() {
    let settingsArr = this._getFromStorage('notification_settings');
    if (settingsArr.length === 0) {
      const now = this._nowIso();
      const settings = {
        id: this._generateId('notification_settings'),
        event_reminders_email: false,
        event_reminders_in_portal: false,
        event_reminders_sms: false,
        forum_replies_email: false,
        forum_replies_in_portal: false,
        forum_replies_sms: false,
        newsletters_email: false,
        newsletters_in_portal: false,
        newsletters_sms: false,
        promotional_offers_email: false,
        promotional_offers_in_portal: false,
        promotional_offers_sms: false,
        surveys_email: false,
        surveys_in_portal: false,
        surveys_sms: false,
        digest_emails_mode: 'none',
        updated_at: now
      };
      settingsArr.push(settings);
      this._saveToStorage('notification_settings', settingsArr);
      return settings;
    }
    return settingsArr[0];
  }

  updateNotificationSettings(settings) {
    if (!settings || typeof settings !== 'object') {
      return {
        success: false,
        message: 'Invalid settings object.',
        settings: null
      };
    }

    let settingsArr = this._getFromStorage('notification_settings');
    let current = settingsArr.length > 0 ? settingsArr[0] : this.getNotificationSettings();

    const updated = { ...current };

    Object.keys(settings).forEach((key) => {
      if (settings[key] !== undefined) {
        updated[key] = settings[key];
      }
    });

    updated.updated_at = this._nowIso();
    settingsArr[0] = updated;
    this._saveToStorage('notification_settings', settingsArr);

    return {
      success: true,
      message: 'Notification settings updated.',
      settings: updated
    };
  }

  // ==============================
  // MEMBER PROFILE (task_8)
  // ==============================

  getMemberProfile() {
    let profiles = this._getFromStorage('member_profiles');
    if (profiles.length === 0) {
      const now = this._nowIso();
      const profile = {
        id: this._generateId('member_profile'),
        full_name: '',
        display_title: null,
        specialties: [],
        licensed_states: [],
        years_of_experience: null,
        directory_visible: false,
        bio: null,
        firm_name: null,
        avatar_url: null,
        created_at: now,
        updated_at: now
      };
      profiles.push(profile);
      this._saveToStorage('member_profiles', profiles);
      return profile;
    }
    return profiles[0];
  }

  updateMemberProfile(profile) {
    if (!profile || typeof profile !== 'object') {
      return {
        success: false,
        message: 'Invalid profile object.',
        profile: null
      };
    }

    let profiles = this._getFromStorage('member_profiles');
    const now = this._nowIso();
    let current = profiles.length > 0 ? profiles[0] : null;

    if (!current) {
      current = {
        id: this._generateId('member_profile'),
        full_name: '',
        display_title: null,
        specialties: [],
        licensed_states: [],
        years_of_experience: null,
        directory_visible: false,
        bio: null,
        firm_name: null,
        avatar_url: null,
        created_at: now,
        updated_at: now
      };
      profiles.push(current);
    }

    const updatableKeys = [
      'display_title',
      'specialties',
      'licensed_states',
      'years_of_experience',
      'directory_visible',
      'bio',
      'firm_name'
    ];

    updatableKeys.forEach((key) => {
      if (profile[key] !== undefined) {
        current[key] = profile[key];
      }
    });

    current.updated_at = now;
    profiles[0] = current;
    this._saveToStorage('member_profiles', profiles);

    return {
      success: true,
      message: 'Member profile updated.',
      profile: current
    };
  }

  // ==============================
  // DASHBOARD HELPERS (tasks 1,2,3,6)
  // ==============================

  getDashboardAlerts() {
    const alerts = [];

    // Membership renewal alerts
    const membership = this._getSingleRecord('membership_accounts');
    if (membership) {
      const expDate = this._parseDate(membership.expiration_date);
      if (expDate) {
        const now = new Date();
        const daysLeft = this._daysBetween(now, expDate);
        if (membership.current_status === 'active' && daysLeft <= 30 && daysLeft >= 0) {
          alerts.push({
            id: 'alert_membership_renewal',
            type: 'membership_renewal',
            title: 'Membership renewal due soon',
            message: `Your membership expires in ${daysLeft} day(s).`,
            severity: 'warning',
            related_page: 'my_membership',
            related_entity_type: 'membership_account',
            related_entity_id: membership.id
          });
        } else if (membership.current_status === 'lapsed') {
          alerts.push({
            id: 'alert_membership_lapsed',
            type: 'membership_renewal',
            title: 'Membership has lapsed',
            message: 'Your membership has lapsed. Renew to restore benefits.',
            severity: 'critical',
            related_page: 'my_membership',
            related_entity_type: 'membership_account',
            related_entity_id: membership.id
          });
        }
      }
    }

    // Upcoming webinar alerts (registered)
    const webinars = this._getFromStorage('webinars');
    const registrations = this._getFromStorage('webinar_registrations');
    const now = new Date();
    const soon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const upcomingRegistered = registrations
      .filter((r) => r.registration_status !== 'canceled')
      .map((r) => {
        const w = webinars.find((w) => w.id === r.webinar_id);
        return { registration: r, webinar: w };
      })
      .filter((rw) => rw.webinar && this._parseDate(rw.webinar.start_datetime))
      .filter((rw) => {
        const d = this._parseDate(rw.webinar.start_datetime);
        return d >= now && d <= soon;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.webinar.start_datetime);
        const db = this._parseDate(b.webinar.start_datetime);
        return da - db;
      });

    if (upcomingRegistered.length > 0) {
      const first = upcomingRegistered[0];
      const start = this._parseDate(first.webinar.start_datetime);
      const days = start ? this._daysBetween(now, start) : null;
      alerts.push({
        id: 'alert_upcoming_webinar',
        type: 'upcoming_webinar',
        title: 'Upcoming webinar reminder',
        message: days != null
          ? `You have a webinar starting in ${days} day(s): ${first.webinar.title}`
          : `You have an upcoming webinar: ${first.webinar.title}`,
        severity: 'info',
        related_page: 'live_webinars',
        related_entity_type: 'webinar',
        related_entity_id: first.webinar.id
      });
    }

    // Learning plan alert
    const plans = this._getFromStorage('learning_plans');
    if (plans.length > 0) {
      const plan = plans[0];
      const items = this._getFromStorage('learning_plan_items').filter(
        (i) => i.learning_plan_id === plan.id
      );
      const notStarted = items.filter((i) => i.status === 'not_started').length;
      if (notStarted > 0) {
        alerts.push({
          id: 'alert_learning_plan',
          type: 'learning_plan',
          title: 'CPE learning plan pending',
          message: `You have ${notStarted} course(s) not yet started in your learning plan.`,
          severity: 'info',
          related_page: 'learning_plan',
          related_entity_type: 'learning_plan',
          related_entity_id: plan.id
        });
      }
    }

    return alerts;
  }

  getUpcomingWebinars(limit) {
    const webinars = this._getFromStorage('webinars');
    const registrations = this._getFromStorage('webinar_registrations');

    const now = new Date();

    const upcoming = webinars
      .filter((w) => w.status === 'scheduled')
      .filter((w) => {
        const d = this._parseDate(w.start_datetime);
        return d && d >= now;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime);
        const db = this._parseDate(b.start_datetime);
        return da - db;
      });

    const lim = typeof limit === 'number' && limit > 0 ? limit : 5;

    const result = upcoming.slice(0, lim).map((w) => {
      const reg = registrations.find(
        (r) => r.webinar_id === w.id && r.registration_status !== 'canceled'
      );
      return {
        webinar: w,
        registration_status: reg ? reg.registration_status : null
      };
    });

    return result;
  }

  getRecentForumActivity(limit) {
    const threads = this._getFromStorage('forum_threads');
    const posts = this._getFromStorage('forum_posts');

    const sortedThreads = threads
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.last_activity_at || a.created_at) || new Date(0);
        const db = this._parseDate(b.last_activity_at || b.created_at) || new Date(0);
        return db - da;
      });

    const lim = typeof limit === 'number' && limit > 0 ? limit : 5;

    const activity = [];

    for (let i = 0; i < sortedThreads.length && activity.length < lim; i++) {
      const thread = sortedThreads[i];
      const threadPosts = posts
        .filter((p) => p.thread_id === thread.id)
        .sort((a, b) => {
          const da = this._parseDate(a.created_at) || new Date(0);
          const db = this._parseDate(b.created_at) || new Date(0);
          return db - da;
        });
      const latest_post = threadPosts[0] || null;
      if (latest_post) {
        activity.push({
          thread,
          latest_post
        });
      }
    }

    return activity;
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
