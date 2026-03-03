// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage
    }
  } catch (e) {}
  // Simple in-memory polyfill
  let store = {}
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
    },
    setItem: function (key, value) {
      store[key] = String(value)
    },
    removeItem: function (key) {
      delete store[key]
    },
    clear: function () {
      store = {}
    },
    key: function (index) {
      return Object.keys(store)[index] || null
    },
    get length() {
      return Object.keys(store).length
    }
  }
})()

class BusinessLogic {
  constructor () {
    this._initStorage()
    this.idCounter = this._getNextIdCounter()
  }

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage () {
    // Initialize all array-based tables in localStorage if not exist
    const arrayKeys = [
      'service_categories',
      'services',
      'session_options',
      'package_categories',
      'packages',
      'addon_services',
      'package_configurations',
      'availability_slots',
      'bookings',
      'product_categories',
      'products',
      'product_variants',
      'shipping_methods',
      'promo_codes',
      'gift_card_products',
      'gift_card_designs',
      'gift_card_configurations',
      'blog_categories',
      'tags',
      'articles',
      'downloads',
      'reading_list_items',
      'assessment_requests',
      'cart_items',
      'orders',
      'order_items',
      'payment_methods',
      'payments'
    ]

    arrayKeys.forEach(key => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, '[]')
      }
    })

    // Global ID counter
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000')
    }
  }

  _getFromStorage (key, defaultValue) {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return defaultValue !== undefined ? defaultValue : []
    }
    try {
      return JSON.parse(raw)
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : []
    }
  }

  _saveToStorage (key, data) {
    localStorage.setItem(key, JSON.stringify(data))
  }

  _getNextIdCounter () {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10)
    const next = current + 1
    localStorage.setItem('idCounter', String(next))
    return next
  }

  _generateId (prefix) {
    return prefix + '_' + this._getNextIdCounter()
  }

  _nowIso () {
    return new Date().toISOString()
  }

  // ------------------------
  // Cart helpers
  // ------------------------

  _getOrCreateCart () {
    const raw = localStorage.getItem('cart')
    if (raw) {
      try {
        return JSON.parse(raw)
      } catch (e) {
        // fall through and recreate if corrupted
      }
    }
    const cart = {
      id: this._generateId('cart'),
      items: [],
      subtotal: 0,
      shipping_total: 0,
      discount_total: 0,
      total: 0,
      applied_promo_code: null,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    }
    this._saveToStorage('cart', cart)
    return cart
  }

  _recalculateCartTotals () {
    let cart = this._getFromStorage('cart', null)
    if (!cart) {
      return null
    }

    const cartItems = this._getFromStorage('cart_items', [])
    const shippingMethods = this._getFromStorage('shipping_methods', [])

    let subtotal = 0
    let shippingTotal = 0

    const itemsForCart = cart.items
      .map(id => cartItems.find(ci => ci.id === id))
      .filter(Boolean)

    itemsForCart.forEach(item => {
      if (!item.is_free) {
        subtotal += Number(item.line_subtotal || 0)
      }
      if (item.shipping_method_id) {
        const sm = shippingMethods.find(m => m.id === item.shipping_method_id)
        if (sm) {
          shippingTotal += Number(sm.price || 0) * Number(item.quantity || 1)
        }
      }
    })

    // Apply promo code, if any
    let discountTotal = 0
    if (cart.applied_promo_code) {
      const promoResult = this._validatePromoCode(cart.applied_promo_code, cart, itemsForCart)
      if (promoResult.isValid) {
        discountTotal = promoResult.discountTotal
      } else {
        // If no longer valid, clear it
        cart.applied_promo_code = null
      }
    }

    cart.subtotal = Number(subtotal.toFixed(2))
    cart.shipping_total = Number(shippingTotal.toFixed(2))
    cart.discount_total = Number(discountTotal.toFixed(2))
    let total = cart.subtotal + cart.shipping_total - cart.discount_total
    if (total < 0) total = 0
    cart.total = total
    cart.updated_at = this._nowIso()

    this._saveToStorage('cart', cart)
    return cart
  }

  _validatePromoCode (promoCode, cart, cartItems) {
    const result = {
      isValid: false,
      promo: null,
      discountTotal: 0,
      message: ''
    }

    if (!promoCode) {
      result.message = 'Promo code is empty.'
      return result
    }

    const promoCodes = this._getFromStorage('promo_codes', [])
    const codeUpper = String(promoCode).trim().toUpperCase()

    const promo = promoCodes.find(p => String(p.code || '').toUpperCase() === codeUpper && p.is_active)

    if (!promo) {
      result.message = 'Promo code not found or inactive.'
      return result
    }

    const now = new Date()
    if (promo.valid_from) {
      const from = new Date(promo.valid_from)
      if (now < from) {
        result.message = 'Promo code not yet valid.'
        return result
      }
    }
    if (promo.valid_to) {
      const to = new Date(promo.valid_to)
      if (now > to) {
        result.message = 'Promo code has expired.'
        return result
      }
    }

    // max_uses is not tracked per-user in this simple implementation; ignore unless 0 or negative
    if (typeof promo.max_uses === 'number' && promo.max_uses <= 0) {
      result.message = 'Promo code usage limit reached.'
      return result
    }

    const appliesTo = promo.applies_to || 'all'

    const eligibleItems = (cartItems || []).filter(item => {
      if (item.is_free) return false
      if (appliesTo === 'all') return true
      if (appliesTo === 'products') return item.item_type === 'product'
      if (appliesTo === 'services') return item.item_type === 'service_booking'
      if (appliesTo === 'packages') return item.item_type === 'package'
      return false
    })

    if (!eligibleItems.length) {
      result.message = 'Promo code does not apply to any items.'
      return result
    }

    const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + Number(item.line_subtotal || 0), 0)

    let discount = 0
    if (promo.discount_type === 'percentage') {
      discount = (eligibleSubtotal * Number(promo.discount_value || 0)) / 100
    } else if (promo.discount_type === 'fixed_amount') {
      discount = Math.min(Number(promo.discount_value || 0), eligibleSubtotal)
    }

    result.isValid = discount > 0
    result.promo = promo
    result.discountTotal = Number(discount.toFixed(2))
    result.message = result.isValid ? 'Promo code is valid.' : 'Promo code did not produce a discount.'
    return result
  }

  _calculatePackagePrice (pkg, bedrooms, selectedAddonIds) {
    const addonsAll = this._getFromStorage('addon_services', [])
    const selectedIds = Array.isArray(selectedAddonIds) ? selectedAddonIds : []

    const selectedAddons = addonsAll.filter(a => selectedIds.includes(a.id))

    const baseBedroomsIncluded = typeof pkg.base_bedrooms_included === 'number' ? pkg.base_bedrooms_included : (typeof bedrooms === 'number' ? bedrooms : 0)
    const configuredBedrooms = typeof bedrooms === 'number' ? bedrooms : baseBedroomsIncluded

    let extraBedroomsCount = 0
    if (typeof configuredBedrooms === 'number' && typeof baseBedroomsIncluded === 'number') {
      extraBedroomsCount = Math.max(0, configuredBedrooms - baseBedroomsIncluded)
    }

    const pricePerExtraBedroom = Number(pkg.price_per_additional_bedroom || 0)
    const extraBedroomsCost = extraBedroomsCount * pricePerExtraBedroom

    const basePrice = Number(pkg.base_price || 0) + extraBedroomsCost

    const addonsTotalPrice = selectedAddons.reduce((sum, addon) => sum + Number(addon.price || 0), 0)

    const totalPrice = basePrice + addonsTotalPrice

    return {
      package_id: pkg.id,
      bedrooms: configuredBedrooms,
      selected_addons: selectedAddons.map(a => ({
        addon_id: a.id,
        name: a.name,
        price: Number(a.price || 0),
        addon: a // foreign key resolution convenience
      })),
      addons_total_price: Number(addonsTotalPrice.toFixed(2)),
      base_price: Number(basePrice.toFixed(2)),
      total_price: Number(totalPrice.toFixed(2))
    }
  }

  _findAvailabilitySlots (serviceId, packageId, sessionOptionId, date, timeWindowStart, timeWindowEnd, maxPrice, sortBy) {
    let slots = this._getFromStorage('availability_slots', [])

    slots = slots.filter(s => s.is_available)

    if (serviceId) {
      slots = slots.filter(s => s.service_id === serviceId)
    }
    if (packageId) {
      slots = slots.filter(s => s.package_id === packageId)
    }
    if (sessionOptionId) {
      slots = slots.filter(s => s.session_option_id === sessionOptionId)
    }
    if (date) {
      slots = slots.filter(s => typeof s.start_datetime === 'string' && s.start_datetime.slice(0, 10) === date)
    }

    const withinTimeWindow = (slot, start, end) => {
      if (!start && !end) return true
      if (!slot.start_datetime) return false
      const time = slot.start_datetime.slice(11, 16) // HH:MM
      if (start && time < start) return false
      if (end && time > end) return false
      return true
    }

    if (timeWindowStart || timeWindowEnd) {
      slots = slots.filter(s => withinTimeWindow(s, timeWindowStart, timeWindowEnd))
    }

    if (typeof maxPrice === 'number') {
      slots = slots.filter(s => Number(s.price_total || 0) <= maxPrice)
    }

    if (sortBy === 'price_low_to_high') {
      slots.sort((a, b) => Number(a.price_total || 0) - Number(b.price_total || 0))
    } else if (sortBy === 'price_high_to_low') {
      slots.sort((a, b) => Number(b.price_total || 0) - Number(a.price_total || 0))
    } else if (sortBy === 'time_earliest') {
      slots.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    } else if (sortBy === 'time_latest') {
      slots.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime))
    }

    return slots
  }

  _createOrderFromCart (contactName, contactEmail) {
    const cart = this._getFromStorage('cart', null)
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return {
        success: false,
        order: null,
        message: 'Cart is empty.'
      }
    }

    const cartItems = this._getFromStorage('cart_items', [])
    const itemsForCart = cart.items
      .map(id => cartItems.find(ci => ci.id === id))
      .filter(Boolean)

    if (!itemsForCart.length) {
      return {
        success: false,
        order: null,
        message: 'Cart is empty.'
      }
    }

    const orders = this._getFromStorage('orders', [])
    const orderItems = this._getFromStorage('order_items', [])

    const orderId = this._generateId('order')
    const createdAt = this._nowIso()

    const newOrder = {
      id: orderId,
      cart_id: cart.id,
      items: [],
      contact_name: contactName,
      contact_email: contactEmail,
      promo_code: cart.applied_promo_code || null,
      subtotal: Number(cart.subtotal || 0),
      shipping_total: Number(cart.shipping_total || 0),
      discount_total: Number(cart.discount_total || 0),
      total: Number(cart.total || 0),
      status: 'pending_payment',
      created_at: createdAt
    }

    itemsForCart.forEach(ci => {
      const referenceId = ci.product_id || ci.package_id || ci.download_id || ci.gift_card_configuration_id || ci.booking_id || null
      const orderItemId = this._generateId('order_item')
      const oi = {
        id: orderItemId,
        order_id: orderId,
        item_type: ci.item_type,
        reference_id: referenceId,
        name: ci.name,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal: ci.line_subtotal,
        is_free: !!ci.is_free
      }
      orderItems.push(oi)
      newOrder.items.push(orderItemId)
    })

    orders.push(newOrder)
    this._saveToStorage('orders', orders)
    this._saveToStorage('order_items', orderItems)

    return {
      success: true,
      order: newOrder,
      message: 'Order created from cart.'
    }
  }

  _recordPayment (order, paymentMethodCode) {
    const payments = this._getFromStorage('payments', [])
    const orders = this._getFromStorage('orders', [])

    const paymentId = this._generateId('payment')
    const amount = Number(order.total || 0)
    const createdAt = this._nowIso()

    let paymentStatus = 'pending'
    let orderStatus = order.status || 'pending_payment'

    const onlineCodes = ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay']

    if (onlineCodes.includes(paymentMethodCode)) {
      paymentStatus = 'paid'
      orderStatus = 'paid'
    } else if (paymentMethodCode === 'pay_at_appointment') {
      paymentStatus = 'pending'
      orderStatus = 'pending_payment'
    } else if (paymentMethodCode === 'no_payment_required') {
      paymentStatus = 'paid'
      orderStatus = 'paid'
    } else {
      paymentStatus = 'failed'
      orderStatus = order.status || 'pending_payment'
    }

    const payment = {
      id: paymentId,
      order_id: order.id,
      payment_method_code: paymentMethodCode,
      amount,
      status: paymentStatus,
      created_at: createdAt,
      transaction_reference: null
    }

    payments.push(payment)

    // Update order status in storage
    const orderIndex = orders.findIndex(o => o.id === order.id)
    if (orderIndex !== -1) {
      orders[orderIndex].status = orderStatus
    }

    this._saveToStorage('payments', payments)
    this._saveToStorage('orders', orders)

    return { payment, orderStatus }
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // 1. getHomePageSummary
  getHomePageSummary () {
    const services = this._getFromStorage('services', [])
    const serviceCategories = this._getFromStorage('service_categories', [])
    const packages = this._getFromStorage('packages', [])
    const packageCategories = this._getFromStorage('package_categories', [])
    const products = this._getFromStorage('products', [])
    const productCategories = this._getFromStorage('product_categories', [])
    const articles = this._getFromStorage('articles', [])

    const aboutRaw = localStorage.getItem('about_page_content')
    let aboutContent = null
    if (aboutRaw) {
      try { aboutContent = JSON.parse(aboutRaw) } catch (e) { aboutContent = null }
    }

    const brandTitle = aboutContent && aboutContent.brand_title
      ? aboutContent.brand_title
      : 'Professional Home Decluttering & Organizing'
    const brandTagline = aboutContent && aboutContent.brand_tagline
      ? aboutContent.brand_tagline
      : 'Calm, clutter-free spaces tailored to your life.'

    const featuredServicesRaw = services
      .filter(s => s.status === 'active' && s.is_bookable)
      .sort((a, b) => Number(b.average_rating || 0) - Number(a.average_rating || 0))
      .slice(0, 3)

    const featuredServices = featuredServicesRaw.map(s => {
      const cat = serviceCategories.find(c => c.id === s.category_id) || null
      return {
        service_id: s.id,
        name: s.name,
        category_name: cat ? cat.name : s.category_id,
        is_virtual: !!s.is_virtual,
        starting_price: Number(s.base_rate_per_hour || 0),
        average_rating: Number(s.average_rating || 0),
        service: s,
        category: cat
      }
    })

    const featuredPackagesRaw = packages
      .filter(p => p.status === 'active')
      .sort((a, b) => Number(b.average_rating || 0) - Number(a.average_rating || 0))
      .slice(0, 3)

    const featuredPackages = featuredPackagesRaw.map(p => {
      const cat = packageCategories.find(c => c.id === p.category_id) || null
      return {
        package_id: p.id,
        name: p.name,
        category_name: cat ? cat.name : p.category_id,
        is_virtual: !!p.is_virtual,
        base_price: Number(p.base_price || 0),
        total_hours: typeof p.total_hours === 'number' ? p.total_hours : null,
        average_rating: Number(p.average_rating || 0),
        package: p,
        category: cat
      }
    })

    const featuredProductsRaw = products
      .filter(p => p.status === 'active')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 3)

    const featuredProducts = featuredProductsRaw.map(p => {
      const cat = productCategories.find(c => c.id === p.category_id) || null
      return {
        product_id: p.id,
        name: p.name,
        category_name: cat ? cat.name : p.category_id,
        price: Number(p.price || 0),
        average_rating: Number(p.average_rating || 0),
        image_url: p.image_url || null,
        product: p,
        category: cat
      }
    })

    const recentArticlesRaw = articles
      .slice()
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
      .slice(0, 3)

    const blogCategories = this._getFromStorage('blog_categories', [])

    const recentArticles = recentArticlesRaw.map(a => {
      const cat = blogCategories.find(c => c.id === a.category_id) || null
      return {
        article_id: a.id,
        title: a.title,
        category_name: cat ? cat.name : a.category_id,
        published_at: a.published_at,
        excerpt: a.excerpt || '',
        article: a,
        category: cat
      }
    })

    return {
      brand_title: brandTitle,
      brand_tagline: brandTagline,
      primary_cta: {
        label: 'Book Now',
        target_page: 'booking',
        default_context: 'home_office'
      },
      quick_links: [
        { label: 'Packages', target_page: 'packages' },
        { label: 'Virtual Services', target_page: 'virtual_services' },
        { label: 'Shop Products', target_page: 'shop_products' },
        { label: 'In-Home Assessment', target_page: 'assessment' },
        { label: 'Resources', target_page: 'resources' },
        { label: 'Gift Cards', target_page: 'gift_cards' }
      ],
      featured_services: featuredServices,
      featured_packages: featuredPackages,
      featured_products: featuredProducts,
      recent_articles: recentArticles
    }
  }

  // 2. getServiceCategories
  getServiceCategories () {
    const categories = this._getFromStorage('service_categories', [])
    return categories.map(c => ({
      category_id: c.id,
      name: c.name,
      description: c.description || '',
      is_virtual: !!c.is_virtual
    }))
  }

  // 3. listServicesAndPackages
  listServicesAndPackages (serviceCategoryId, packageCategoryId, minTotalHours, maxPrice, minRating, sortBy) {
    const servicesAll = this._getFromStorage('services', [])
    const serviceCategories = this._getFromStorage('service_categories', [])

    let services = servicesAll.filter(s => s.status === 'active')
    if (serviceCategoryId) {
      services = services.filter(s => s.category_id === serviceCategoryId)
    }
    if (typeof minRating === 'number') {
      services = services.filter(s => Number(s.average_rating || 0) >= minRating)
    }
    if (typeof maxPrice === 'number') {
      services = services.filter(s => Number(s.base_rate_per_hour || 0) <= maxPrice)
    }

    const packagesAll = this._getFromStorage('packages', [])
    const packageCategories = this._getFromStorage('package_categories', [])

    let packages = packagesAll.filter(p => p.status === 'active')
    if (packageCategoryId) {
      packages = packages.filter(p => p.category_id === packageCategoryId)
    }
    if (typeof minTotalHours === 'number') {
      packages = packages.filter(p => typeof p.total_hours === 'number' && p.total_hours >= minTotalHours)
    }
    if (typeof maxPrice === 'number') {
      packages = packages.filter(p => Number(p.base_price || 0) <= maxPrice)
    }
    if (typeof minRating === 'number') {
      packages = packages.filter(p => Number(p.average_rating || 0) >= minRating)
    }

    const sortServices = (arr) => {
      if (sortBy === 'rating_high_to_low') {
        arr.sort((a, b) => Number(b.average_rating || 0) - Number(a.average_rating || 0))
      } else if (sortBy === 'price_low_to_high') {
        arr.sort((a, b) => Number(a.base_rate_per_hour || 0) - Number(b.base_rate_per_hour || 0))
      } else if (sortBy === 'price_high_to_low') {
        arr.sort((a, b) => Number(b.base_rate_per_hour || 0) - Number(a.base_rate_per_hour || 0))
      }
    }

    const sortPackages = (arr) => {
      if (sortBy === 'rating_high_to_low') {
        arr.sort((a, b) => Number(b.average_rating || 0) - Number(a.average_rating || 0))
      } else if (sortBy === 'price_low_to_high') {
        arr.sort((a, b) => Number(a.base_price || 0) - Number(b.base_price || 0))
      } else if (sortBy === 'price_high_to_low') {
        arr.sort((a, b) => Number(b.base_price || 0) - Number(a.base_price || 0))
      }
    }

    sortServices(services)
    sortPackages(packages)

    const servicesOut = services.map(s => {
      const cat = serviceCategories.find(c => c.id === s.category_id) || null
      return {
        service_id: s.id,
        name: s.name,
        category_name: cat ? cat.name : s.category_id,
        description: s.description || '',
        is_virtual: !!s.is_virtual,
        starting_price_per_hour: Number(s.base_rate_per_hour || 0),
        default_duration_minutes: typeof s.default_duration_minutes === 'number' ? s.default_duration_minutes : null,
        average_rating: Number(s.average_rating || 0),
        review_count: Number(s.review_count || 0),
        is_bookable: !!s.is_bookable,
        category: cat
      }
    })

    const packagesOut = packages.map(p => {
      const cat = packageCategories.find(c => c.id === p.category_id) || null
      return {
        package_id: p.id,
        name: p.name,
        category_name: cat ? cat.name : p.category_id,
        description: p.description || '',
        is_virtual: !!p.is_virtual,
        base_price: Number(p.base_price || 0),
        total_hours: typeof p.total_hours === 'number' ? p.total_hours : null,
        session_count: typeof p.session_count === 'number' ? p.session_count : null,
        session_length_minutes: typeof p.session_length_minutes === 'number' ? p.session_length_minutes : null,
        average_rating: Number(p.average_rating || 0),
        review_count: Number(p.review_count || 0),
        can_be_booked: !!p.can_be_booked,
        can_be_added_to_cart: !!p.can_be_added_to_cart,
        category: cat
      }
    })

    return {
      services: servicesOut,
      packages: packagesOut
    }
  }

  // 4. getBookableServicesAndPackages
  getBookableServicesAndPackages () {
    const services = this._getFromStorage('services', [])
    const serviceCategories = this._getFromStorage('service_categories', [])
    const packages = this._getFromStorage('packages', [])
    const packageCategories = this._getFromStorage('package_categories', [])

    const servicesOut = services
      .filter(s => s.status === 'active' && s.is_bookable)
      .map(s => {
        const cat = serviceCategories.find(c => c.id === s.category_id) || null
        return {
          service_id: s.id,
          name: s.name,
          category_name: cat ? cat.name : s.category_id,
          is_virtual: !!s.is_virtual,
          service: s,
          category: cat
        }
      })

    const packagesOut = packages
      .filter(p => p.status === 'active' && p.can_be_booked)
      .map(p => {
        const cat = packageCategories.find(c => c.id === p.category_id) || null
        return {
          package_id: p.id,
          name: p.name,
          category_name: cat ? cat.name : p.category_id,
          is_virtual: !!p.is_virtual,
          total_hours: typeof p.total_hours === 'number' ? p.total_hours : null,
          package: p,
          category: cat
        }
      })

    return {
      services: servicesOut,
      packages: packagesOut
    }
  }

  // 5. getBookingOptions
  getBookingOptions (serviceId, packageId) {
    const services = this._getFromStorage('services', [])
    const serviceCategories = this._getFromStorage('service_categories', [])
    const packages = this._getFromStorage('packages', [])
    const packageCategories = this._getFromStorage('package_categories', [])
    const sessionOptions = this._getFromStorage('session_options', [])

    let contextType = null
    let service = null
    let pkg = null
    let sessionOptionsOut = []

    if (serviceId) {
      const s = services.find(x => x.id === serviceId) || null
      if (s) {
        const cat = serviceCategories.find(c => c.id === s.category_id) || null
        contextType = 'service'
        service = {
          service_id: s.id,
          name: s.name,
          description: s.description || '',
          is_virtual: !!s.is_virtual,
          category_name: cat ? cat.name : s.category_id,
          category: cat
        }
        const opts = sessionOptions.filter(o => o.service_id === s.id && o.is_active)
        sessionOptionsOut = opts.map(o => ({
          session_option_id: o.id,
          name: o.name,
          duration_minutes: o.duration_minutes,
          base_price: o.base_price,
          is_default: !!o.is_default
        }))
      }
    } else if (packageId) {
      const p = packages.find(x => x.id === packageId) || null
      if (p) {
        const cat = packageCategories.find(c => c.id === p.category_id) || null
        contextType = 'package'
        pkg = {
          package_id: p.id,
          name: p.name,
          description: p.description || '',
          is_virtual: !!p.is_virtual,
          category_name: cat ? cat.name : p.category_id,
          total_hours: typeof p.total_hours === 'number' ? p.total_hours : null,
          session_count: typeof p.session_count === 'number' ? p.session_count : null,
          session_length_minutes: typeof p.session_length_minutes === 'number' ? p.session_length_minutes : null,
          category: cat
        }
        sessionOptionsOut = []
      }
    }

    return {
      context_type: contextType,
      service,
      package: pkg,
      session_options: sessionOptionsOut
    }
  }

  // 6. getAvailabilitySlots
  getAvailabilitySlots (serviceId, packageId, sessionOptionId, date, timeWindowStart, timeWindowEnd, maxPrice, sortBy) {
    const slots = this._findAvailabilitySlots(serviceId, packageId, sessionOptionId, date, timeWindowStart, timeWindowEnd, maxPrice, sortBy)

    const slotsOut = slots.map(s => {
      const start = s.start_datetime
      const end = s.end_datetime
      const displayDate = start ? start.slice(0, 10) : null
      const displayTimeRange = start && end ? start.slice(11, 16) + ' - ' + end.slice(11, 16) : null
      return {
        availability_slot_id: s.id,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        duration_minutes: typeof s.duration_minutes === 'number' ? s.duration_minutes : null,
        price_total: Number(s.price_total || 0),
        location_type: s.location_type,
        is_available: !!s.is_available,
        display_date: displayDate,
        display_time_range: displayTimeRange
      }
    })

    const summary = {
      date: date || null,
      time_window_label: (timeWindowStart || '') + (timeWindowEnd ? ' - ' + timeWindowEnd : ''),
      total_slots: slotsOut.length
    }

    return { slots: slotsOut, summary }
  }

  // 7. getBookingPaymentOptions
  getBookingPaymentOptions () {
    // Booking-level payment options are conceptual; not tied to PaymentMethod rows
    return [
      {
        code: 'pay_at_appointment',
        label: 'Pay at appointment',
        description: 'Settle payment in person at the time of your session.'
      },
      {
        code: 'pay_online',
        label: 'Pay online',
        description: 'Complete payment securely online before your session.'
      },
      {
        code: 'no_payment_required',
        label: 'No payment required',
        description: 'For complimentary sessions or prepaid packages.'
      }
    ]
  }

  // 8. createBooking
  createBooking (availabilitySlotId, sessionOptionId, customerName, customerEmail, customerPhone, paymentOption, notes) {
    const allowedPaymentOptions = ['pay_at_appointment', 'pay_online', 'no_payment_required']
    if (!allowedPaymentOptions.includes(paymentOption)) {
      return {
        success: false,
        booking: null,
        message: 'Invalid payment option.'
      }
    }

    const slots = this._getFromStorage('availability_slots', [])
    const slotIndex = slots.findIndex(s => s.id === availabilitySlotId)
    if (slotIndex === -1) {
      return {
        success: false,
        booking: null,
        message: 'Availability slot not found.'
      }
    }

    const slot = slots[slotIndex]
    if (!slot.is_available) {
      return {
        success: false,
        booking: null,
        message: 'Selected slot is no longer available.'
      }
    }

    const bookings = this._getFromStorage('bookings', [])
    const bookingId = this._generateId('booking')
    const createdAt = this._nowIso()

    const booking = {
      id: bookingId,
      service_id: slot.service_id || null,
      package_id: slot.package_id || null,
      availability_slot_id: slot.id,
      session_option_id: sessionOptionId || slot.session_option_id || null,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone || null,
      payment_option: paymentOption,
      status: 'confirmed',
      created_at: createdAt,
      notes: notes || null
    }

    bookings.push(booking)
    slots[slotIndex].is_available = false
    this._saveToStorage('bookings', bookings)
    this._saveToStorage('availability_slots', slots)

    return {
      success: true,
      booking: {
        booking_id: booking.id,
        service_id: booking.service_id,
        package_id: booking.package_id,
        availability_slot_id: booking.availability_slot_id,
        session_option_id: booking.session_option_id,
        customer_name: booking.customer_name,
        customer_email: booking.customer_email,
        customer_phone: booking.customer_phone,
        payment_option: booking.payment_option,
        status: booking.status,
        created_at: booking.created_at
      },
      message: 'Booking confirmed.'
    }
  }

  // 9. getPackageCategories
  getPackageCategories () {
    const categories = this._getFromStorage('package_categories', [])
    return categories.map(c => ({
      category_id: c.id,
      name: c.name,
      description: c.description || '',
      is_virtual: !!c.is_virtual
    }))
  }

  // 10. listPackages
  listPackages (packageCategoryId, minBedrooms, maxBedrooms, minPrice, maxPrice, sortBy) {
    const packages = this._getFromStorage('packages', [])
    const packageCategories = this._getFromStorage('package_categories', [])

    let filtered = packages.filter(p => p.status === 'active')

    if (packageCategoryId) {
      filtered = filtered.filter(p => p.category_id === packageCategoryId)
    }

    if (typeof minBedrooms === 'number') {
      filtered = filtered.filter(p => {
        if (typeof p.max_bedrooms === 'number') {
          return p.max_bedrooms >= minBedrooms
        }
        return true
      })
    }

    if (typeof maxBedrooms === 'number') {
      filtered = filtered.filter(p => {
        if (typeof p.min_bedrooms === 'number') {
          return p.min_bedrooms <= maxBedrooms
        }
        return true
      })
    }

    if (typeof minPrice === 'number') {
      filtered = filtered.filter(p => Number(p.base_price || 0) >= minPrice)
    }
    if (typeof maxPrice === 'number') {
      filtered = filtered.filter(p => Number(p.base_price || 0) <= maxPrice)
    }

    if (sortBy === 'price_low_to_high') {
      filtered.sort((a, b) => Number(a.base_price || 0) - Number(b.base_price || 0))
    } else if (sortBy === 'price_high_to_low') {
      filtered.sort((a, b) => Number(b.base_price || 0) - Number(a.base_price || 0))
    } else if (sortBy === 'rating_high_to_low') {
      filtered.sort((a, b) => Number(b.average_rating || 0) - Number(a.average_rating || 0))
    }

    return filtered.map(p => {
      const cat = packageCategories.find(c => c.id === p.category_id) || null
      return {
        package_id: p.id,
        name: p.name,
        category_name: cat ? cat.name : p.category_id,
        description: p.description || '',
        base_price: Number(p.base_price || 0),
        total_hours: typeof p.total_hours === 'number' ? p.total_hours : null,
        min_bedrooms: typeof p.min_bedrooms === 'number' ? p.min_bedrooms : null,
        max_bedrooms: typeof p.max_bedrooms === 'number' ? p.max_bedrooms : null,
        base_bedrooms_included: typeof p.base_bedrooms_included === 'number' ? p.base_bedrooms_included : null,
        average_rating: Number(p.average_rating || 0),
        review_count: Number(p.review_count || 0),
        can_be_booked: !!p.can_be_booked,
        can_be_added_to_cart: !!p.can_be_added_to_cart,
        category: cat
      }
    })
  }

  // 11. getPackageDetails
  getPackageDetails (packageId) {
    const packages = this._getFromStorage('packages', [])
    const packageCategories = this._getFromStorage('package_categories', [])
    const addons = this._getFromStorage('addon_services', [])

    const pkg = packages.find(p => p.id === packageId) || null
    if (!pkg) {
      return null
    }

    const cat = packageCategories.find(c => c.id === pkg.category_id) || null

    const applicableAddonsRaw = addons.filter(a => a.is_active && Array.isArray(a.applicable_package_ids) && a.applicable_package_ids.includes(packageId))

    const applicableAddons = applicableAddonsRaw.map(a => ({
      addon_id: a.id,
      name: a.name,
      description: a.description || '',
      price: Number(a.price || 0),
      is_active: !!a.is_active,
      addon: a
    }))

    const addonPriceFilterMax = applicableAddons.length
      ? applicableAddons.reduce((max, a) => Math.max(max, Number(a.price || 0)), 0)
      : 0

    return {
      package_id: pkg.id,
      name: pkg.name,
      category_name: cat ? cat.name : pkg.category_id,
      description: pkg.description || '',
      is_virtual: !!pkg.is_virtual,
      base_price: Number(pkg.base_price || 0),
      total_hours: typeof pkg.total_hours === 'number' ? pkg.total_hours : null,
      session_count: typeof pkg.session_count === 'number' ? pkg.session_count : null,
      session_length_minutes: typeof pkg.session_length_minutes === 'number' ? pkg.session_length_minutes : null,
      min_bedrooms: typeof pkg.min_bedrooms === 'number' ? pkg.min_bedrooms : null,
      max_bedrooms: typeof pkg.max_bedrooms === 'number' ? pkg.max_bedrooms : null,
      base_bedrooms_included: typeof pkg.base_bedrooms_included === 'number' ? pkg.base_bedrooms_included : null,
      price_per_additional_bedroom: typeof pkg.price_per_additional_bedroom === 'number' ? pkg.price_per_additional_bedroom : null,
      average_rating: Number(pkg.average_rating || 0),
      review_count: Number(pkg.review_count || 0),
      status: pkg.status,
      can_be_booked: !!pkg.can_be_booked,
      can_be_added_to_cart: !!pkg.can_be_added_to_cart,
      applicable_addons: applicableAddons,
      addon_price_filter_max: addonPriceFilterMax,
      category: cat
    }
  }

  // 12. previewPackageConfiguration
  previewPackageConfiguration (packageId, bedrooms, selectedAddonIds) {
    const packages = this._getFromStorage('packages', [])
    const pkg = packages.find(p => p.id === packageId) || null
    if (!pkg) {
      return null
    }
    return this._calculatePackagePrice(pkg, bedrooms, selectedAddonIds)
  }

  // 13. addPackageToCartFromConfiguration
  addPackageToCartFromConfiguration (packageId, bedrooms, selectedAddonIds, quantity) {
    const packages = this._getFromStorage('packages', [])
    const pkg = packages.find(p => p.id === packageId) || null
    if (!pkg) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: null,
        package_configuration_id: null,
        message: 'Package not found.'
      }
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1

    const pricing = this._calculatePackagePrice(pkg, bedrooms, selectedAddonIds)

    const packageConfigurations = this._getFromStorage('package_configurations', [])
    const pcId = this._generateId('pkg_cfg')
    const createdAt = this._nowIso()

    const packageConfiguration = {
      id: pcId,
      package_id: packageId,
      bedrooms: pricing.bedrooms,
      selected_addon_ids: (Array.isArray(selectedAddonIds) ? selectedAddonIds : []),
      addons_total_price: pricing.addons_total_price,
      base_price: pricing.base_price,
      total_price: pricing.total_price,
      created_at: createdAt
    }

    packageConfigurations.push(packageConfiguration)
    this._saveToStorage('package_configurations', packageConfigurations)

    const cart = this._getOrCreateCart()
    const cartItems = this._getFromStorage('cart_items', [])

    const unitPrice = pricing.total_price
    const lineSubtotal = Number((unitPrice * qty).toFixed(2))

    const cartItemId = this._generateId('cart_item')
    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'package',
      product_id: null,
      package_id: packageId,
      package_configuration_id: pcId,
      download_id: null,
      gift_card_configuration_id: null,
      booking_id: null,
      name: pkg.name,
      quantity: qty,
      unit_price: unitPrice,
      line_subtotal: lineSubtotal,
      shipping_method_id: null,
      is_free: unitPrice === 0
    }

    cartItems.push(cartItem)
    cart.items.push(cartItemId)

    this._saveToStorage('cart_items', cartItems)
    this._saveToStorage('cart', cart)
    this._recalculateCartTotals()

    return {
      success: true,
      cart_id: cart.id,
      cart_item_id: cartItemId,
      package_configuration_id: pcId,
      message: 'Package added to cart.'
    }
  }

  // 14. getProductCategories
  getProductCategories () {
    const categories = this._getFromStorage('product_categories', [])
    return categories.map(c => ({
      category_id: c.id,
      name: c.name,
      description: c.description || ''
    }))
  }

  // 15. getProductFilterOptions
  getProductFilterOptions (categoryId) {
    const productsAll = this._getFromStorage('products', [])

    let products = productsAll.filter(p => p.status === 'active')
    if (categoryId) {
      products = products.filter(p => p.category_id === categoryId)
    }

    if (!products.length) {
      return {
        price_min: 0,
        price_max: 0,
        capacity_min: 0,
        capacity_max: 0,
        rating_options: [],
        color_options: [],
        material_options: [],
        style_options: [],
        shipping_filters: []
      }
    }

    let priceMin = Infinity
    let priceMax = -Infinity
    let capacityMin = Infinity
    let capacityMax = -Infinity

    const ratingsSet = new Set()
    const colorsSet = new Set()
    const materialsSet = new Set()
    const stylesSet = new Set()

    let hasFreeShipping = false
    let hasPaidShipping = false

    products.forEach(p => {
      const price = Number(p.price || 0)
      if (price < priceMin) priceMin = price
      if (price > priceMax) priceMax = price

      if (typeof p.capacity_liters === 'number') {
        const cap = p.capacity_liters
        if (cap < capacityMin) capacityMin = cap
        if (cap > capacityMax) capacityMax = cap
      }

      if (typeof p.average_rating === 'number') {
        ratingsSet.add(Math.floor(p.average_rating))
      }

      if (p.color) colorsSet.add(p.color)
      if (p.material) materialsSet.add(p.material)
      if (p.style) stylesSet.add(p.style)

      if (p.free_shipping) {
        hasFreeShipping = true
      } else {
        hasPaidShipping = true
      }
    })

    if (!isFinite(priceMin)) priceMin = 0
    if (!isFinite(priceMax)) priceMax = 0
    if (!isFinite(capacityMin)) capacityMin = 0
    if (!isFinite(capacityMax)) capacityMax = 0

    const ratingOptions = Array.from(ratingsSet).sort((a, b) => a - b)
    const colorOptions = Array.from(colorsSet).sort()
    const materialOptions = Array.from(materialsSet).sort()
    const styleOptions = Array.from(stylesSet).sort()

    const shippingFilters = []
    if (hasFreeShipping) shippingFilters.push('free_shipping')
    if (hasPaidShipping) shippingFilters.push('paid_shipping')

    return {
      price_min: priceMin,
      price_max: priceMax,
      capacity_min: capacityMin,
      capacity_max: capacityMax,
      rating_options: ratingOptions,
      color_options: colorOptions,
      material_options: materialOptions,
      style_options: styleOptions,
      shipping_filters: shippingFilters
    }
  }

  // 16. searchProducts
  searchProducts (categoryId, minPrice, maxPrice, minRating, minCapacityLiters, color, material, style, freeShippingOnly, sortBy) {
    const products = this._getFromStorage('products', [])
    const productCategories = this._getFromStorage('product_categories', [])

    let filtered = products.filter(p => p.status === 'active')

    if (categoryId) {
      filtered = filtered.filter(p => p.category_id === categoryId)
    }

    if (typeof minPrice === 'number') {
      filtered = filtered.filter(p => Number(p.price || 0) >= minPrice)
    }
    if (typeof maxPrice === 'number') {
      filtered = filtered.filter(p => Number(p.price || 0) <= maxPrice)
    }
    if (typeof minRating === 'number') {
      filtered = filtered.filter(p => Number(p.average_rating || 0) >= minRating)
    }
    if (typeof minCapacityLiters === 'number') {
      filtered = filtered.filter(p => typeof p.capacity_liters === 'number' && p.capacity_liters >= minCapacityLiters)
    }

    const normalize = v => (v || '').toString().toLowerCase()

    if (color) {
      const c = normalize(color)
      filtered = filtered.filter(p => normalize(p.color) === c)
    }
    if (material) {
      const m = normalize(material)
      filtered = filtered.filter(p => normalize(p.material) === m)
    }
    if (style) {
      const s = normalize(style)
      filtered = filtered.filter(p => normalize(p.style) === s)
    }

    if (freeShippingOnly) {
      filtered = filtered.filter(p => !!p.free_shipping)
    }

    if (sortBy === 'price_low_to_high') {
      filtered.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
    } else if (sortBy === 'price_high_to_low') {
      filtered.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
    } else if (sortBy === 'rating_high_to_low') {
      filtered.sort((a, b) => Number(b.average_rating || 0) - Number(a.average_rating || 0))
    }

    return filtered.map(p => {
      const cat = productCategories.find(c => c.id === p.category_id) || null
      return {
        product_id: p.id,
        name: p.name,
        category_name: cat ? cat.name : p.category_id,
        price: Number(p.price || 0),
        capacity_liters: typeof p.capacity_liters === 'number' ? p.capacity_liters : null,
        color: p.color || null,
        material: p.material || null,
        style: p.style || null,
        average_rating: Number(p.average_rating || 0),
        review_count: Number(p.review_count || 0),
        free_shipping: !!p.free_shipping,
        image_url: p.image_url || null,
        product: p,
        category: cat
      }
    })
  }

  // 17. getProductDetails
  getProductDetails (productId) {
    const products = this._getFromStorage('products', [])
    const productCategories = this._getFromStorage('product_categories', [])
    const variants = this._getFromStorage('product_variants', [])

    const product = products.find(p => p.id === productId) || null
    if (!product) {
      return null
    }

    const cat = productCategories.find(c => c.id === product.category_id) || null
    const productVariants = variants.filter(v => v.product_id === productId)

    return {
      product_id: product.id,
      name: product.name,
      category_name: cat ? cat.name : product.category_id,
      description: product.description || '',
      price: Number(product.price || 0),
      capacity_liters: typeof product.capacity_liters === 'number' ? product.capacity_liters : null,
      dimensions: product.dimensions || null,
      color: product.color || null,
      material: product.material || null,
      style: product.style || null,
      average_rating: Number(product.average_rating || 0),
      review_count: Number(product.review_count || 0),
      free_shipping: !!product.free_shipping,
      shipping_weight: typeof product.shipping_weight === 'number' ? product.shipping_weight : null,
      image_url: product.image_url || null,
      variants: productVariants.map(v => ({
        variant_id: v.id,
        name: v.name || null,
        color: v.color || null,
        material: v.material || null,
        style: v.style || null,
        price_override: typeof v.price_override === 'number' ? v.price_override : null,
        is_default: !!v.is_default,
        free_shipping_override: typeof v.free_shipping_override === 'boolean' ? v.free_shipping_override : null
      })),
      product,
      category: cat
    }
  }

  // 18. addProductToCart
  addProductToCart (productId, variantId, quantity) {
    const products = this._getFromStorage('products', [])
    const variants = this._getFromStorage('product_variants', [])

    const product = products.find(p => p.id === productId && p.status === 'active') || null
    if (!product) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: null,
        message: 'Product not found or inactive.'
      }
    }

    let unitPrice = Number(product.price || 0)
    if (variantId) {
      const variant = variants.find(v => v.id === variantId && v.product_id === productId) || null
      if (variant && typeof variant.price_override === 'number') {
        unitPrice = Number(variant.price_override)
      }
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1
    const lineSubtotal = Number((unitPrice * qty).toFixed(2))

    const cart = this._getOrCreateCart()
    const cartItems = this._getFromStorage('cart_items', [])

    const cartItemId = this._generateId('cart_item')
    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'product',
      product_id: productId,
      package_id: null,
      package_configuration_id: null,
      download_id: null,
      gift_card_configuration_id: null,
      booking_id: null,
      name: product.name,
      quantity: qty,
      unit_price: unitPrice,
      line_subtotal: lineSubtotal,
      shipping_method_id: null,
      is_free: unitPrice === 0
    }

    cartItems.push(cartItem)
    cart.items.push(cartItemId)

    this._saveToStorage('cart_items', cartItems)
    this._saveToStorage('cart', cart)
    this._recalculateCartTotals()

    return {
      success: true,
      cart_id: cart.id,
      cart_item_id: cartItemId,
      message: 'Product added to cart.'
    }
  }

  // 19. listVirtualCoachingBundles
  listVirtualCoachingBundles (sessionCount, sessionLengthMinutes, minPrice, maxPrice, sortBy) {
    const packages = this._getFromStorage('packages', [])

    let filtered = packages.filter(p => p.status === 'active' && p.category_id === 'virtual_decluttering_coaching')

    if (typeof sessionCount === 'number') {
      filtered = filtered.filter(p => typeof p.session_count === 'number' && p.session_count === sessionCount)
    }
    if (typeof sessionLengthMinutes === 'number') {
      filtered = filtered.filter(p => typeof p.session_length_minutes === 'number' && p.session_length_minutes === sessionLengthMinutes)
    }
    if (typeof minPrice === 'number') {
      filtered = filtered.filter(p => Number(p.base_price || 0) >= minPrice)
    }
    if (typeof maxPrice === 'number') {
      filtered = filtered.filter(p => Number(p.base_price || 0) <= maxPrice)
    }

    if (sortBy === 'price_low_to_high') {
      filtered.sort((a, b) => Number(a.base_price || 0) - Number(b.base_price || 0))
    } else if (sortBy === 'price_high_to_low') {
      filtered.sort((a, b) => Number(b.base_price || 0) - Number(a.base_price || 0))
    }

    return filtered.map(p => ({
      package_id: p.id,
      name: p.name,
      description: p.description || '',
      base_price: Number(p.base_price || 0),
      session_count: typeof p.session_count === 'number' ? p.session_count : null,
      session_length_minutes: typeof p.session_length_minutes === 'number' ? p.session_length_minutes : null,
      average_rating: Number(p.average_rating || 0),
      review_count: Number(p.review_count || 0),
      can_be_added_to_cart: !!p.can_be_added_to_cart,
      package: p
    }))
  }

  // 20. getAssessmentInfo
  getAssessmentInfo () {
    const raw = localStorage.getItem('assessment_info')
    if (raw) {
      try {
        const info = JSON.parse(raw)
        return {
          headline: info.headline || '',
          description: info.description || '',
          typical_duration_minutes: typeof info.typical_duration_minutes === 'number' ? info.typical_duration_minutes : 60,
          benefits: Array.isArray(info.benefits) ? info.benefits : []
        }
      } catch (e) {}
    }

    // Fallback generic content (not entity data)
    return {
      headline: 'In-Home Assessment',
      description: 'A focused walkthrough of your space to identify priorities, budget, and a clear organizing plan.',
      typical_duration_minutes: 60,
      benefits: [
        'Walkthrough of each room and storage area',
        'Customized decluttering and organizing recommendations',
        'Timeline and budget guidance for your first project'
      ]
    }
  }

  // 21. submitAssessmentRequest
  submitAssessmentRequest (name, email, phone, addressOrCity, homeType, bedrooms, squareFootage, preferredDay, preferredTimeWindow, notes, budgetAmount) {
    const requests = this._getFromStorage('assessment_requests', [])

    const id = this._generateId('assessment')
    const submittedAt = this._nowIso()

    const request = {
      id,
      name,
      email,
      phone: phone || null,
      address: addressOrCity || null,
      city: null,
      home_type: homeType,
      bedrooms: typeof bedrooms === 'number' ? bedrooms : null,
      square_footage: typeof squareFootage === 'number' ? squareFootage : null,
      preferred_day: preferredDay || null,
      preferred_time_window: preferredTimeWindow || null,
      notes: notes || null,
      budget_amount: typeof budgetAmount === 'number' ? budgetAmount : null,
      status: 'submitted',
      submitted_at: submittedAt
    }

    requests.push(request)
    this._saveToStorage('assessment_requests', requests)

    return {
      success: true,
      assessment_request_id: id,
      status: request.status,
      submitted_at: submittedAt,
      message: 'Assessment request submitted.'
    }
  }

  // 22. getBlogFilterOptions
  getBlogFilterOptions () {
    const categories = this._getFromStorage('blog_categories', [])
    const tags = this._getFromStorage('tags', [])

    return {
      categories: categories.map(c => ({ category_id: c.id, name: c.name })),
      tags: tags.map(t => ({ tag_id: t.id, name: t.name })),
      date_presets: ['last_30_days', 'last_3_months', 'last_6_months', 'last_12_months']
    }
  }

  // 23. listArticles
  listArticles (categoryId, tagId, datePreset, sortBy) {
    const articles = this._getFromStorage('articles', [])
    const blogCategories = this._getFromStorage('blog_categories', [])
    const tags = this._getFromStorage('tags', [])

    let filtered = articles.slice()

    if (categoryId) {
      filtered = filtered.filter(a => a.category_id === categoryId)
    }
    if (tagId) {
      filtered = filtered.filter(a => Array.isArray(a.tag_ids) && a.tag_ids.includes(tagId))
    }

    if (datePreset) {
      const now = new Date()
      let months = 0
      if (datePreset === 'last_30_days') {
        months = 0
      } else if (datePreset === 'last_3_months') {
        months = 3
      } else if (datePreset === 'last_6_months') {
        months = 6
      } else if (datePreset === 'last_12_months') {
        months = 12
      }
      if (months > 0) {
        const threshold = new Date(now)
        threshold.setMonth(threshold.getMonth() - months)
        filtered = filtered.filter(a => new Date(a.published_at) >= threshold)
      } else if (datePreset === 'last_30_days') {
        const threshold = new Date(now)
        threshold.setDate(threshold.getDate() - 30)
        filtered = filtered.filter(a => new Date(a.published_at) >= threshold)
      }
    }

    if (sortBy === 'oldest_first') {
      filtered.sort((a, b) => new Date(a.published_at) - new Date(b.published_at))
    } else {
      filtered.sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
    }

    return filtered.map(a => {
      const cat = blogCategories.find(c => c.id === a.category_id) || null
      const tagNames = Array.isArray(a.tag_ids)
        ? a.tag_ids.map(id => {
            const t = tags.find(x => x.id === id)
            return t ? t.name : id
          })
        : []
      return {
        article_id: a.id,
        title: a.title,
        category_name: cat ? cat.name : a.category_id,
        tag_names: tagNames,
        excerpt: a.excerpt || '',
        published_at: a.published_at,
        reading_time_minutes: typeof a.reading_time_minutes === 'number' ? a.reading_time_minutes : null,
        article: a,
        category: cat
      }
    })
  }

  // 24. getArticleDetails
  getArticleDetails (articleId) {
    const articles = this._getFromStorage('articles', [])
    const blogCategories = this._getFromStorage('blog_categories', [])
    const tags = this._getFromStorage('tags', [])
    const downloads = this._getFromStorage('downloads', [])
    const readingListItems = this._getFromStorage('reading_list_items', [])

    const article = articles.find(a => a.id === articleId) || null
    if (!article) {
      return null
    }

    const cat = blogCategories.find(c => c.id === article.category_id) || null

    const tagNames = Array.isArray(article.tag_ids)
      ? article.tag_ids.map(id => {
          const t = tags.find(x => x.id === id)
          return t ? t.name : id
        })
      : []

    const isSaved = readingListItems.some(r => r.article_id === articleId)

    const relatedResourcesRaw = Array.isArray(article.related_download_ids)
      ? article.related_download_ids.map(id => downloads.find(d => d.id === id)).filter(Boolean)
      : []

    const relatedResources = relatedResourcesRaw.map(d => ({
      download_id: d.id,
      title: d.title,
      type: d.type,
      price: Number(d.price || 0),
      is_free: !!d.is_free,
      download: d
    }))

    return {
      article_id: article.id,
      title: article.title,
      category_name: cat ? cat.name : article.category_id,
      tag_names: tagNames,
      content: article.content || '',
      hero_image_url: article.hero_image_url || null,
      published_at: article.published_at,
      reading_time_minutes: typeof article.reading_time_minutes === 'number' ? article.reading_time_minutes : null,
      is_saved_to_reading_list: isSaved,
      related_resources: relatedResources,
      article,
      category: cat
    }
  }

  // 25. saveArticleToReadingList
  saveArticleToReadingList (articleId) {
    const readingListItems = this._getFromStorage('reading_list_items', [])

    const existing = readingListItems.find(r => r.article_id === articleId)
    if (existing) {
      return {
        success: true,
        reading_list_item_id: existing.id,
        saved_at: existing.saved_at,
        message: 'Article already in reading list.'
      }
    }

    const id = this._generateId('reading_item')
    const savedAt = this._nowIso()

    const item = {
      id,
      article_id: articleId,
      saved_at: savedAt
    }

    readingListItems.push(item)
    this._saveToStorage('reading_list_items', readingListItems)

    return {
      success: true,
      reading_list_item_id: id,
      saved_at: savedAt,
      message: 'Article saved to reading list.'
    }
  }

  // 26. getReadingList
  getReadingList () {
    const readingListItems = this._getFromStorage('reading_list_items', [])
    const articles = this._getFromStorage('articles', [])
    const blogCategories = this._getFromStorage('blog_categories', [])

    return readingListItems.map(r => {
      const article = articles.find(a => a.id === r.article_id) || null
      const cat = article ? (blogCategories.find(c => c.id === article.category_id) || null) : null
      return {
        reading_list_item_id: r.id,
        article_id: r.article_id,
        title: article ? article.title : null,
        category_name: cat ? cat.name : (article ? article.category_id : null),
        saved_at: r.saved_at,
        article
      }
    })
  }

  // 27. removeReadingListItem
  removeReadingListItem (readingListItemId) {
    const readingListItems = this._getFromStorage('reading_list_items', [])
    const before = readingListItems.length
    const afterItems = readingListItems.filter(r => r.id !== readingListItemId)
    const removed = before !== afterItems.length
    this._saveToStorage('reading_list_items', afterItems)
    return {
      success: removed,
      message: removed ? 'Reading list item removed.' : 'Reading list item not found.'
    }
  }

  // 28. getDownloadDetails
  getDownloadDetails (downloadId) {
    const downloads = this._getFromStorage('downloads', [])
    const d = downloads.find(x => x.id === downloadId) || null
    if (!d) return null
    return {
      download_id: d.id,
      title: d.title,
      description: d.description || '',
      price: Number(d.price || 0),
      is_free: !!d.is_free,
      file_format: d.file_format,
      preview_image_url: d.preview_image_url || null,
      delivery_note: d.delivery_note || '',
      download: d
    }
  }

  // 29. addDownloadToCart
  addDownloadToCart (downloadId, quantity) {
    const downloads = this._getFromStorage('downloads', [])
    const d = downloads.find(x => x.id === downloadId) || null
    if (!d) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: null,
        message: 'Downloadable resource not found.'
      }
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1
    const unitPrice = d.is_free ? 0 : Number(d.price || 0)
    const lineSubtotal = Number((unitPrice * qty).toFixed(2))

    const cart = this._getOrCreateCart()
    const cartItems = this._getFromStorage('cart_items', [])

    const cartItemId = this._generateId('cart_item')
    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'download',
      product_id: null,
      package_id: null,
      package_configuration_id: null,
      download_id: downloadId,
      gift_card_configuration_id: null,
      booking_id: null,
      name: d.title,
      quantity: qty,
      unit_price: unitPrice,
      line_subtotal: lineSubtotal,
      shipping_method_id: null,
      is_free: !!d.is_free || unitPrice === 0
    }

    cartItems.push(cartItem)
    cart.items.push(cartItemId)

    this._saveToStorage('cart_items', cartItems)
    this._saveToStorage('cart', cart)
    this._recalculateCartTotals()

    return {
      success: true,
      cart_id: cart.id,
      cart_item_id: cartItemId,
      message: 'Downloadable resource added to cart.'
    }
  }

  // 30. getGiftCardOptions
  getGiftCardOptions () {
    const products = this._getFromStorage('gift_card_products', [])
    const designs = this._getFromStorage('gift_card_designs', [])

    return {
      gift_card_products: products.map(g => ({
        gift_card_product_id: g.id,
        type: g.type,
        name: g.name,
        description: g.description || '',
        min_amount: typeof g.min_amount === 'number' ? g.min_amount : null,
        max_amount: typeof g.max_amount === 'number' ? g.max_amount : null,
        predefined_amounts: Array.isArray(g.predefined_amounts) ? g.predefined_amounts : [],
        is_active: !!g.is_active,
        gift_card_product: g
      })),
      designs: designs.map(d => ({
        design_id: d.id,
        style: d.style,
        name: d.name,
        description: d.description || '',
        image_url: d.image_url || null,
        is_neutral: !!d.is_neutral,
        design: d
      }))
    }
  }

  // 31. addGiftCardToCart
  addGiftCardToCart (giftCardProductId, designId, amount, occasion, recipientName, senderName, message, quantity) {
    const products = this._getFromStorage('gift_card_products', [])
    const designs = this._getFromStorage('gift_card_designs', [])

    const product = products.find(p => p.id === giftCardProductId && p.is_active) || null
    if (!product) {
      return {
        success: false,
        gift_card_configuration_id: null,
        cart_id: null,
        cart_item_id: null,
        message: 'Gift card product not found or inactive.'
      }
    }

    const amt = Number(amount || 0)
    if (amt <= 0) {
      return {
        success: false,
        gift_card_configuration_id: null,
        cart_id: null,
        cart_item_id: null,
        message: 'Gift card amount must be greater than zero.'
      }
    }

    if (typeof product.min_amount === 'number' && amt < product.min_amount) {
      return {
        success: false,
        gift_card_configuration_id: null,
        cart_id: null,
        cart_item_id: null,
        message: 'Gift card amount is below the minimum allowed.'
      }
    }
    if (typeof product.max_amount === 'number' && amt > product.max_amount) {
      return {
        success: false,
        gift_card_configuration_id: null,
        cart_id: null,
        cart_item_id: null,
        message: 'Gift card amount exceeds the maximum allowed.'
      }
    }

    let design = null
    if (designId) {
      design = designs.find(d => d.id === designId) || null
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1

    const configs = this._getFromStorage('gift_card_configurations', [])
    const configId = this._generateId('gc_cfg')
    const createdAt = this._nowIso()

    const configuration = {
      id: configId,
      gift_card_product_id: giftCardProductId,
      design_id: design ? design.id : null,
      amount: amt,
      occasion,
      recipient_name: recipientName || null,
      sender_name: senderName || null,
      message: message || null,
      quantity: qty,
      shipping_method_id: null,
      created_at: createdAt
    }

    configs.push(configuration)
    this._saveToStorage('gift_card_configurations', configs)

    const cart = this._getOrCreateCart()
    const cartItems = this._getFromStorage('cart_items', [])

    const unitPrice = amt
    const lineSubtotal = Number((unitPrice * qty).toFixed(2))

    const cartItemId = this._generateId('cart_item')
    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      item_type: 'gift_card',
      product_id: null,
      package_id: null,
      package_configuration_id: null,
      download_id: null,
      gift_card_configuration_id: configId,
      booking_id: null,
      name: product.name,
      quantity: qty,
      unit_price: unitPrice,
      line_subtotal: lineSubtotal,
      shipping_method_id: null,
      is_free: unitPrice === 0
    }

    cartItems.push(cartItem)
    cart.items.push(cartItemId)

    this._saveToStorage('cart_items', cartItems)
    this._saveToStorage('cart', cart)
    this._recalculateCartTotals()

    return {
      success: true,
      gift_card_configuration_id: configId,
      cart_id: cart.id,
      cart_item_id: cartItemId,
      message: 'Gift card added to cart.'
    }
  }

  // 32. getCart
  getCart () {
    const cart = this._getFromStorage('cart', null)
    if (!cart) {
      return {
        cart_id: null,
        items: [],
        subtotal: 0,
        shipping_total: 0,
        discount_total: 0,
        total: 0,
        applied_promo_code: null,
        created_at: null,
        updated_at: null
      }
    }

    const cartItems = this._getFromStorage('cart_items', [])
    const shippingMethods = this._getFromStorage('shipping_methods', [])
    const products = this._getFromStorage('products', [])
    const packages = this._getFromStorage('packages', [])
    const downloads = this._getFromStorage('downloads', [])
    const giftConfigs = this._getFromStorage('gift_card_configurations', [])
    const giftProducts = this._getFromStorage('gift_card_products', [])
    const bookings = this._getFromStorage('bookings', [])

    const itemsOut = cart.items
      .map(id => cartItems.find(ci => ci.id === id))
      .filter(Boolean)
      .map(ci => {
        let reference = null
        let referenceId = null

        if (ci.product_id) {
          referenceId = ci.product_id
          reference = products.find(p => p.id === ci.product_id) || null
        } else if (ci.package_id) {
          referenceId = ci.package_id
          reference = packages.find(p => p.id === ci.package_id) || null
        } else if (ci.download_id) {
          referenceId = ci.download_id
          reference = downloads.find(d => d.id === ci.download_id) || null
        } else if (ci.gift_card_configuration_id) {
          referenceId = ci.gift_card_configuration_id
          const cfg = giftConfigs.find(g => g.id === ci.gift_card_configuration_id) || null
          if (cfg) {
            const gp = giftProducts.find(gp2 => gp2.id === cfg.gift_card_product_id) || null
            reference = { configuration: cfg, product: gp }
          }
        } else if (ci.booking_id) {
          referenceId = ci.booking_id
          reference = bookings.find(b => b.id === ci.booking_id) || null
        }

        let shippingMethod = null
        if (ci.shipping_method_id) {
          shippingMethod = shippingMethods.find(sm => sm.id === ci.shipping_method_id) || null
        }

        return {
          cart_item_id: ci.id,
          item_type: ci.item_type,
          reference_id: referenceId,
          name: ci.name,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_subtotal: ci.line_subtotal,
          is_free: !!ci.is_free,
          shipping_method_id: ci.shipping_method_id || null,
          shipping_method_name: shippingMethod ? shippingMethod.name : null,
          reference,
          shipping_method: shippingMethod
        }
      })

    return {
      cart_id: cart.id,
      items: itemsOut,
      subtotal: Number(cart.subtotal || 0),
      shipping_total: Number(cart.shipping_total || 0),
      discount_total: Number(cart.discount_total || 0),
      total: Number(cart.total || 0),
      applied_promo_code: cart.applied_promo_code || null,
      created_at: cart.created_at,
      updated_at: cart.updated_at
    }
  }

  // 33. updateCartItemQuantity
  updateCartItemQuantity (cartItemId, quantity) {
    const cart = this._getFromStorage('cart', null)
    if (!cart) {
      return {
        success: false,
        cart: null,
        message: 'Cart not found.'
      }
    }

    const cartItems = this._getFromStorage('cart_items', [])
    const idx = cartItems.findIndex(ci => ci.id === cartItemId && ci.cart_id === cart.id)
    if (idx === -1) {
      return {
        success: false,
        cart: null,
        message: 'Cart item not found.'
      }
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1
    cartItems[idx].quantity = qty
    cartItems[idx].line_subtotal = Number((Number(cartItems[idx].unit_price || 0) * qty).toFixed(2))

    this._saveToStorage('cart_items', cartItems)
    this._saveToStorage('cart', cart)
    const updatedCart = this._recalculateCartTotals()

    return {
      success: true,
      cart: {
        cart_id: updatedCart.id,
        subtotal: updatedCart.subtotal,
        shipping_total: updatedCart.shipping_total,
        discount_total: updatedCart.discount_total,
        total: updatedCart.total
      },
      message: 'Cart item quantity updated.'
    }
  }

  // 34. removeCartItem
  removeCartItem (cartItemId) {
    const cart = this._getFromStorage('cart', null)
    if (!cart) {
      return {
        success: false,
        cart: null,
        message: 'Cart not found.'
      }
    }

    let cartItems = this._getFromStorage('cart_items', [])
    const beforeLen = cartItems.length
    cartItems = cartItems.filter(ci => ci.id !== cartItemId)
    const removed = beforeLen !== cartItems.length

    const beforeItemsLen = cart.items.length
    cart.items = cart.items.filter(id => id !== cartItemId)
    const removedFromCart = beforeItemsLen !== cart.items.length

    this._saveToStorage('cart_items', cartItems)
    this._saveToStorage('cart', cart)

    if (!removed || !removedFromCart) {
      const updatedCartNoChange = this._recalculateCartTotals()
      return {
        success: false,
        cart: updatedCartNoChange
          ? {
              cart_id: updatedCartNoChange.id,
              subtotal: updatedCartNoChange.subtotal,
              shipping_total: updatedCartNoChange.shipping_total,
              discount_total: updatedCartNoChange.discount_total,
              total: updatedCartNoChange.total
            }
          : null,
        message: 'Cart item not found.'
      }
    }

    const updatedCart = this._recalculateCartTotals()

    return {
      success: true,
      cart: {
        cart_id: updatedCart.id,
        subtotal: updatedCart.subtotal,
        shipping_total: updatedCart.shipping_total,
        discount_total: updatedCart.discount_total,
        total: updatedCart.total
      },
      message: 'Cart item removed.'
    }
  }

  // 35. getShippingMethodsForCartItem
  getShippingMethodsForCartItem (cartItemId) {
    const cart = this._getFromStorage('cart', null)
    if (!cart) return []

    const cartItems = this._getFromStorage('cart_items', [])
    const item = cartItems.find(ci => ci.id === cartItemId && ci.cart_id === cart.id)
    if (!item) return []

    const shippingMethods = this._getFromStorage('shipping_methods', [])

    const type = item.item_type

    let applicable = []
    if (type === 'product') {
      applicable = shippingMethods.filter(sm => sm.is_available_for_products)
    } else if (type === 'gift_card') {
      applicable = shippingMethods.filter(sm => sm.is_available_for_gift_cards)
    } else {
      applicable = []
    }

    return applicable.map(sm => ({
      shipping_method_id: sm.id,
      code: sm.code,
      name: sm.name,
      description: sm.description || '',
      price: Number(sm.price || 0),
      is_default: !!sm.is_default,
      is_free: !!sm.is_free,
      shipping_method: sm
    }))
  }

  // 36. setCartItemShippingMethod
  setCartItemShippingMethod (cartItemId, shippingMethodId) {
    const cart = this._getFromStorage('cart', null)
    if (!cart) {
      return {
        success: false,
        cart: null,
        message: 'Cart not found.'
      }
    }

    const cartItems = this._getFromStorage('cart_items', [])
    const shippingMethods = this._getFromStorage('shipping_methods', [])

    const itemIndex = cartItems.findIndex(ci => ci.id === cartItemId && ci.cart_id === cart.id)
    if (itemIndex === -1) {
      return {
        success: false,
        cart: null,
        message: 'Cart item not found.'
      }
    }

    const shippingMethod = shippingMethods.find(sm => sm.id === shippingMethodId) || null
    if (!shippingMethod) {
      return {
        success: false,
        cart: null,
        message: 'Shipping method not found.'
      }
    }

    cartItems[itemIndex].shipping_method_id = shippingMethodId

    this._saveToStorage('cart_items', cartItems)
    this._saveToStorage('cart', cart)

    const updatedCart = this._recalculateCartTotals()

    return {
      success: true,
      cart: {
        cart_id: updatedCart.id,
        shipping_total: updatedCart.shipping_total,
        total: updatedCart.total
      },
      message: 'Shipping method updated.'
    }
  }

  // 37. applyPromoCodeToCart
  applyPromoCodeToCart (promoCode) {
    const cart = this._getFromStorage('cart', null)
    if (!cart) {
      return {
        success: false,
        cart: null,
        message: 'Cart not found.'
      }
    }

    const cartItems = this._getFromStorage('cart_items', [])
    const itemsForCart = cart.items
      .map(id => cartItems.find(ci => ci.id === id))
      .filter(Boolean)

    const validation = this._validatePromoCode(promoCode, cart, itemsForCart)
    if (!validation.isValid) {
      // Ensure any previous promo is still considered in totals
      const updatedCartNoChange = this._recalculateCartTotals()
      return {
        success: false,
        cart: updatedCartNoChange
          ? {
              cart_id: updatedCartNoChange.id,
              applied_promo_code: updatedCartNoChange.applied_promo_code,
              discount_total: updatedCartNoChange.discount_total,
              total: updatedCartNoChange.total
            }
          : null,
        message: validation.message || 'Invalid promo code.'
      }
    }

    cart.applied_promo_code = validation.promo.code
    this._saveToStorage('cart', cart)
    const updatedCart = this._recalculateCartTotals()

    return {
      success: true,
      cart: {
        cart_id: updatedCart.id,
        applied_promo_code: updatedCart.applied_promo_code,
        discount_total: updatedCart.discount_total,
        total: updatedCart.total
      },
      message: 'Promo code applied.'
    }
  }

  // 38. removePromoCodeFromCart
  removePromoCodeFromCart () {
    const cart = this._getFromStorage('cart', null)
    if (!cart) {
      return {
        success: false,
        cart: null,
        message: 'Cart not found.'
      }
    }

    cart.applied_promo_code = null
    this._saveToStorage('cart', cart)
    const updatedCart = this._recalculateCartTotals()

    return {
      success: true,
      cart: {
        cart_id: updatedCart.id,
        applied_promo_code: updatedCart.applied_promo_code,
        discount_total: updatedCart.discount_total,
        total: updatedCart.total
      },
      message: 'Promo code removed.'
    }
  }

  // 39. getCheckoutSummary
  getCheckoutSummary () {
    const cart = this._getFromStorage('cart', null)
    if (!cart) {
      return {
        cart_id: null,
        items: [],
        subtotal: 0,
        shipping_total: 0,
        discount_total: 0,
        total: 0,
        applied_promo_code: null
      }
    }

    const cartItems = this._getFromStorage('cart_items', [])
    const shippingMethods = this._getFromStorage('shipping_methods', [])

    const itemsOut = cart.items
      .map(id => cartItems.find(ci => ci.id === id))
      .filter(Boolean)
      .map(ci => {
        const sm = ci.shipping_method_id
          ? shippingMethods.find(s => s.id === ci.shipping_method_id) || null
          : null
        return {
          cart_item_id: ci.id,
          item_type: ci.item_type,
          name: ci.name,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_subtotal: ci.line_subtotal,
          is_free: !!ci.is_free,
          shipping_method_name: sm ? sm.name : null
        }
      })

    return {
      cart_id: cart.id,
      items: itemsOut,
      subtotal: Number(cart.subtotal || 0),
      shipping_total: Number(cart.shipping_total || 0),
      discount_total: Number(cart.discount_total || 0),
      total: Number(cart.total || 0),
      applied_promo_code: cart.applied_promo_code || null
    }
  }

  // 40. startCheckout
  startCheckout (contactName, contactEmail) {
    const result = this._createOrderFromCart(contactName, contactEmail)
    if (!result.success || !result.order) {
      return {
        success: false,
        order_id: null,
        status: null,
        subtotal: 0,
        shipping_total: 0,
        discount_total: 0,
        total: 0,
        promo_code: null,
        message: result.message || 'Unable to create order.'
      }
    }

    const order = result.order
    return {
      success: true,
      order_id: order.id,
      status: order.status,
      subtotal: order.subtotal,
      shipping_total: order.shipping_total,
      discount_total: order.discount_total,
      total: order.total,
      promo_code: order.promo_code || null,
      message: result.message
    }
  }

  // 41. getPaymentOptions
  getPaymentOptions () {
    const methods = this._getFromStorage('payment_methods', [])
    return methods
      .filter(m => m.is_active)
      .map(m => ({
        payment_method_code: m.code,
        name: m.name,
        description: m.description || '',
        is_online: !!m.is_online
      }))
  }

  // 42. getPaymentSummary
  getPaymentSummary (orderId) {
    const orders = this._getFromStorage('orders', [])
    const orderItems = this._getFromStorage('order_items', [])

    const order = orders.find(o => o.id === orderId) || null
    if (!order) {
      return null
    }

    const items = order.items
      .map(id => orderItems.find(oi => oi.id === id))
      .filter(Boolean)
      .map(oi => ({
        order_item_id: oi.id,
        item_type: oi.item_type,
        name: oi.name,
        quantity: oi.quantity,
        unit_price: oi.unit_price,
        line_subtotal: oi.line_subtotal,
        is_free: !!oi.is_free
      }))

    return {
      order_id: order.id,
      status: order.status,
      items,
      subtotal: Number(order.subtotal || 0),
      shipping_total: Number(order.shipping_total || 0),
      discount_total: Number(order.discount_total || 0),
      total: Number(order.total || 0),
      promo_code: order.promo_code || null
    }
  }

  // 43. submitPayment
  submitPayment (orderId, paymentMethodCode) {
    const orders = this._getFromStorage('orders', [])
    const order = orders.find(o => o.id === orderId) || null

    if (!order) {
      return {
        success: false,
        payment_id: null,
        payment_status: null,
        order_status: null,
        message: 'Order not found.'
      }
    }

    const { payment, orderStatus } = this._recordPayment(order, paymentMethodCode)

    return {
      success: payment.status !== 'failed',
      payment_id: payment.id,
      payment_status: payment.status,
      order_status: orderStatus,
      message: payment.status === 'failed' ? 'Payment failed.' : 'Payment recorded.'
    }
  }

  // 44. getAboutPageContent
  getAboutPageContent () {
    const raw = localStorage.getItem('about_page_content')
    if (raw) {
      try {
        const a = JSON.parse(raw)
        return {
          headline: a.headline || '',
          story: a.story || '',
          qualifications: Array.isArray(a.qualifications) ? a.qualifications : [],
          service_areas: Array.isArray(a.service_areas) ? a.service_areas : [],
          contact_email: a.contact_email || '',
          contact_phone: a.contact_phone || ''
        }
      } catch (e) {}
    }

    // Generic fallback content
    return {
      headline: 'About Our Home Organizing Services',
      story: 'We help busy people transform cluttered homes into calm, functional spaces through practical, sustainable organizing systems.',
      qualifications: [],
      service_areas: [],
      contact_email: '',
      contact_phone: ''
    }
  }

  // 45. getPoliciesContent
  getPoliciesContent () {
    const raw = localStorage.getItem('policies_content')
    if (raw) {
      try {
        const p = JSON.parse(raw)
        return {
          privacy_policy: p.privacy_policy || '',
          booking_policy: p.booking_policy || '',
          shipping_policy: p.shipping_policy || '',
          returns_refunds_policy: p.returns_refunds_policy || '',
          digital_usage_terms: p.digital_usage_terms || '',
          gift_card_terms: p.gift_card_terms || ''
        }
      } catch (e) {}
    }

    // Generic fallback content
    return {
      privacy_policy: '',
      booking_policy: '',
      shipping_policy: '',
      returns_refunds_policy: '',
      digital_usage_terms: '',
      gift_card_terms: ''
    }
  }
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic
  window.WebsiteSDK = new BusinessLogic()
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic
}
