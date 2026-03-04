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

  // -------------------------
  // Storage helpers
  // -------------------------

  _initStorage() {
    const keys = [
      "users", // not used but kept from template
      "products",
      "carts",
      "cart_items",
      "quotes",
      "quote_items",
      "resources",
      "distributors",
      "demo_requests",
      "configurator_bundles",
      "compare_lists",
      "knowledge_base_articles",
      "favorites",
      "events",
      "event_sessions",
      "event_registrations",
      "static_pages"
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Legacy keys from template (not used but initialized to avoid errors)
    if (!localStorage.getItem("cartItems")) {
      localStorage.setItem("cartItems", JSON.stringify([]));
    }

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }

    // Seed additional domain data needed for demo flows if not already present
    try {
      const products = JSON.parse(localStorage.getItem("products") || "[]");

      const ensureProduct = (id, factory) => {
        if (!products.find((p) => p.id === id)) {
          products.push(factory());
        }
      };

      // MX500 confocal microscope used in KB and compatibility tests
      ensureProduct("mx500_confocal", () => ({
        id: "mx500_confocal",
        name: "MX500 Confocal Microscope",
        sku: "MX500-CONF",
        category: "microscopes",
        subcategory: "microscope_system",
        short_description: "Laser scanning confocal microscope platform.",
        description: "ApexLab MX500 confocal microscope platform for neuroscience and general imaging.",
        image_url: "",
        data_sheet_url: "",
        status: "active",
        applications: ["neuroscience", "general_imaging"],
        imaging_modalities: ["confocal"],
        technologies: ["confocal"],
        illumination_type: "laser",
        resolution_score: 90,
        price: 75000,
        currency: "usd",
        is_configurable: true,
        objective_options: ["20x oil", "40x oil", "60x oil"],
        compatible_product_ids: [],
        search_keywords: ["mx500", "confocal", "apexlab mx500"],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      }));

      // Second surgical endoscopy / cellular imaging camera for comparison and configurator
      ensureProduct("surgicam_hd_plus", () => ({
        id: "surgicam_hd_plus",
        name: "SurgiCam HD+ Endoscopy Camera",
        sku: "SC-HDPLUS",
        category: "cameras",
        subcategory: "surgical_endoscopy_camera",
        short_description: "HD surgical endoscopy camera with high frame rate.",
        description: "SurgiCam HD+ provides high-frame-rate surgical endoscopy video for demanding procedures.",
        image_url: "",
        data_sheet_url: "",
        status: "active",
        applications: ["surgical_imaging", "cellular_imaging"],
        imaging_modalities: ["endoscopy"],
        technologies: ["endoscopy"],
        mount_type: "c_mount",
        max_frame_rate_fps: 90,
        resolution_score: 78,
        price: 7500,
        currency: "usd",
        is_configurable: false,
        objective_options: [],
        compatible_product_ids: [],
        search_keywords: ["surgical endoscopy camera", "endoscopy", "surgicam hd+"],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      }));

      // Retinal OCT system for demo requests
      ensureProduct("retinal_oct_xr300", () => ({
        id: "retinal_oct_xr300",
        name: "Retinal OCT System XR-300",
        sku: "XR-300",
        category: "oct_systems",
        subcategory: "retinal_oct",
        short_description: "Retinal OCT imaging system for ophthalmology clinics.",
        description: "High-resolution retinal OCT system XR-300 for advanced ophthalmology diagnostics.",
        image_url: "",
        data_sheet_url: "",
        status: "active",
        applications: ["ophthalmology"],
        imaging_modalities: ["oct"],
        technologies: ["optical_coherence_tomography_oct"],
        illumination_type: "oct",
        resolution_score: 85,
        price: 98000,
        currency: "usd",
        is_configurable: false,
        objective_options: [],
        compatible_product_ids: [],
        search_keywords: ["retinal oct system xr-300", "ophthalmology", "oct"],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      }));

      // Objective lenses compatible with MX500, also usable in configurator
      const lensIds = ["mx500_obj_50mm_na08", "mx500_obj_60mm_na09", "mx500_obj_70mm_na10"];
      ensureProduct(lensIds[0], () => ({
        id: lensIds[0],
        name: "MX500 50 mm Objective, NA 0.80",
        sku: "MX500-OBJ-50-080",
        category: "accessories",
        subcategory: "objective_lens",
        short_description: "50 mm objective lens for MX500, NA 0.80.",
        description: "High-quality 50 mm objective lens for MX500 confocal microscope.",
        image_url: "",
        data_sheet_url: "",
        status: "active",
        applications: ["neuroscience", "cellular_imaging"],
        imaging_modalities: ["confocal"],
        technologies: ["confocal"],
        mount_type: "c_mount",
        focal_length_mm: 50,
        numerical_aperture: 0.8,
        price: 450,
        currency: "usd",
        is_configurable: false,
        objective_options: [],
        compatible_product_ids: ["mx500_confocal"],
        search_keywords: ["objective", "mx500"],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      }));
      ensureProduct(lensIds[1], () => ({
        id: lensIds[1],
        name: "MX500 60 mm Objective, NA 0.90",
        sku: "MX500-OBJ-60-090",
        category: "accessories",
        subcategory: "objective_lens",
        short_description: "60 mm objective lens for MX500, NA 0.90.",
        description: "High-NA 60 mm objective lens for MX500 confocal microscope.",
        image_url: "",
        data_sheet_url: "",
        status: "active",
        applications: ["neuroscience", "cellular_imaging"],
        imaging_modalities: ["confocal"],
        technologies: ["confocal"],
        mount_type: "c_mount",
        focal_length_mm: 60,
        numerical_aperture: 0.9,
        price: 650,
        currency: "usd",
        is_configurable: false,
        objective_options: [],
        compatible_product_ids: ["mx500_confocal"],
        search_keywords: ["objective", "mx500"],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      }));
      ensureProduct(lensIds[2], () => ({
        id: lensIds[2],
        name: "MX500 70 mm Objective, NA 1.00",
        sku: "MX500-OBJ-70-100",
        category: "accessories",
        subcategory: "objective_lens",
        short_description: "70 mm objective lens for MX500, NA 1.00.",
        description: "Ultra high-NA 70 mm objective lens for MX500 confocal microscope.",
        image_url: "",
        data_sheet_url: "",
        status: "active",
        applications: ["neuroscience", "cellular_imaging"],
        imaging_modalities: ["confocal"],
        technologies: ["confocal"],
        mount_type: "c_mount",
        focal_length_mm: 70,
        numerical_aperture: 1.0,
        price: 850,
        currency: "usd",
        is_configurable: false,
        objective_options: [],
        compatible_product_ids: ["mx500_confocal"],
        search_keywords: ["objective", "mx500"],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      }));

      // LED illumination module for configurator
      ensureProduct("cell_imaging_led_illum", () => ({
        id: "cell_imaging_led_illum",
        name: "Cell Imaging LED Illumination Module",
        sku: "LED-ILLUM-CELL",
        category: "accessories",
        subcategory: "illumination_module",
        short_description: "LED illumination module for cellular imaging.",
        description: "High-stability LED illumination module optimized for cellular imaging experiments.",
        image_url: "",
        data_sheet_url: "",
        status: "active",
        applications: ["cellular_imaging", "general_imaging"],
        imaging_modalities: ["widefield", "fluorescence"],
        technologies: ["led"],
        illumination_type: "led",
        price: 1200,
        currency: "usd",
        is_configurable: false,
        objective_options: [],
        compatible_product_ids: [],
        search_keywords: ["led illumination", "cellular imaging"],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      }));

      localStorage.setItem("products", JSON.stringify(products));
    } catch (e) {
      // If seeding fails, proceed with basic initialization
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
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _toTitleCase(str) {
    if (!str) return "";
    return str
      .replace(/_/g, " ")
      .toLowerCase()
      .split(" ")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  }

  // -------------------------
  // Core internal helpers (required)
  // -------------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage("carts");
    let cart = carts[0] || null;
    if (!cart) {
      const now = this._nowIso();
      cart = {
        id: this._generateId("cart"),
        created_at: now,
        updated_at: now,
        item_count: 0,
        subtotal: 0,
        currency: "usd"
      };
      carts.push(cart);
      this._saveToStorage("carts", carts);
    }
    return cart;
  }

  _updateCartTotals(cartId) {
    const carts = this._getFromStorage("carts");
    const cartItems = this._getFromStorage("cart_items");
    const idx = carts.findIndex((c) => c.id === cartId);
    if (idx === -1) return;
    const items = cartItems.filter((ci) => ci.cart_id === cartId);
    let itemCount = 0;
    let subtotal = 0;
    items.forEach((it) => {
      itemCount += it.quantity || 0;
      subtotal += it.line_total || 0;
    });
    carts[idx].item_count = itemCount;
    carts[idx].subtotal = subtotal;
    carts[idx].updated_at = this._nowIso();
    this._saveToStorage("carts", carts);
  }

  _getOrCreateQuote() {
    let quotes = this._getFromStorage("quotes");
    let quote = quotes.find((q) => q.status === "draft") || null;
    if (!quote) {
      const now = this._nowIso();
      quote = {
        id: this._generateId("quote"),
        name: "",
        status: "draft",
        item_count: 0,
        total_estimated_price: 0,
        currency: "usd",
        contact_name: "",
        contact_email: "",
        contact_organization: "",
        notes: "",
        created_at: now,
        updated_at: now,
        submitted_at: null
      };
      quotes.push(quote);
      this._saveToStorage("quotes", quotes);
    }
    return quote;
  }

  _updateQuoteTotals(quoteId) {
    const quotes = this._getFromStorage("quotes");
    const quoteItems = this._getFromStorage("quote_items");
    const idx = quotes.findIndex((q) => q.id === quoteId);
    if (idx === -1) return;
    const items = quoteItems.filter((qi) => qi.quote_id === quoteId);
    let itemCount = 0;
    let total = 0;
    items.forEach((it) => {
      itemCount += it.quantity || 0;
      total += it.line_total || 0;
    });
    quotes[idx].item_count = itemCount;
    quotes[idx].total_estimated_price = total;
    quotes[idx].updated_at = this._nowIso();
    this._saveToStorage("quotes", quotes);
  }

  _getOrCreateCompareList() {
    let compareLists = this._getFromStorage("compare_lists");
    let list = compareLists[0] || null;
    if (!list) {
      const now = this._nowIso();
      list = {
        id: this._generateId("compare"),
        product_ids: [],
        created_at: now,
        updated_at: now
      };
      compareLists.push(list);
      this._saveToStorage("compare_lists", compareLists);
    }
    return list;
  }

  _getOrCreateFavoritesList() {
    let lists = this._getFromStorage("favorites");
    let list = lists[0] || null;
    if (!list) {
      const now = this._nowIso();
      list = {
        id: this._generateId("favorites"),
        article_ids: [],
        created_at: now,
        updated_at: now
      };
      lists.push(list);
      this._saveToStorage("favorites", lists);
    }
    return list;
  }

  _normalizeDateTime(dateStr, timeStr, timeZoneKey) {
    // Combine date and time into ISO; for simplicity ignore timezone offset and store as UTC-style string
    // dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM', timeZoneKey: e.g., 'cet'
    if (!dateStr || !timeStr) return null;
    const base = `${dateStr}T${timeStr}:00.000Z`;
    // We keep timeZoneKey separately in the entity; this is only a normalized timestamp string
    return base;
  }

  _validateBundleBudget(cameraPrice, lensPrice, illuminationPrice, budget) {
    const bundlePrice = (cameraPrice || 0) + (lensPrice || 0) + (illuminationPrice || 0);
    if (typeof budget === "number") {
      return {
        bundle_price: bundlePrice,
        within_budget: bundlePrice <= budget
      };
    }
    return {
      bundle_price: bundlePrice,
      within_budget: true
    };
  }

  // -------------------------
  // Template legacy method (not part of main interfaces)
  // -------------------------

  addToCart(userId, productId, quantity = 1) {
    // Kept for compatibility with the template; delegates to addProductToCart
    const result = this.addProductToCart(productId, quantity, []);
    return {
      success: result.success,
      cartId: result.cart ? result.cart.id : null
    };
  }

  // -------------------------
  // Homepage interfaces
  // -------------------------

  getHomepageHighlights() {
    const products = this._getFromStorage("products");
    const resources = this._getFromStorage("resources");
    const events = this._getFromStorage("events");

    const featured_products = products
      .filter((p) => p.status === "active")
      .slice(0, 5);

    let featured_resources = resources.filter((r) => r.is_featured);
    if (featured_resources.length === 0) {
      featured_resources = resources.slice(0, 5);
    }

    const featured_events = events.slice(0, 5);

    const solutionAreasMap = new Map();

    products.forEach((p) => {
      if (Array.isArray(p.applications)) {
        p.applications.forEach((app) => {
          if (!solutionAreasMap.has(app)) {
            solutionAreasMap.set(app, {
              id: app,
              name: this._toTitleCase(app),
              application_area: app,
              description: ""
            });
          }
        });
      }
    });

    resources.forEach((r) => {
      if (r.application_area && !solutionAreasMap.has(r.application_area)) {
        solutionAreasMap.set(r.application_area, {
          id: r.application_area,
          name: this._toTitleCase(r.application_area),
          application_area: r.application_area,
          description: ""
        });
      }
    });

    events.forEach((e) => {
      if (e.application_area && !solutionAreasMap.has(e.application_area)) {
        solutionAreasMap.set(e.application_area, {
          id: e.application_area,
          name: this._toTitleCase(e.application_area),
          application_area: e.application_area,
          description: ""
        });
      }
    });

    const solution_areas = Array.from(solutionAreasMap.values());

    return {
      featured_products,
      featured_resources,
      featured_events,
      solution_areas
    };
  }

  getHomepageCategorySummary() {
    const products = this._getFromStorage("products");
    const categoriesMap = new Map();

    products.forEach((p) => {
      if (!p.category) return;
      const key = p.category;
      if (!categoriesMap.has(key)) {
        categoriesMap.set(key, {
          category: key,
          display_name: this._toTitleCase(key),
          product_count: 0
        });
      }
      const entry = categoriesMap.get(key);
      entry.product_count += 1;
    });

    const categories = Array.from(categoriesMap.values());
    return { categories };
  }

  // -------------------------
  // Product search & details
  // -------------------------

  getProductFilterOptions(category, subcategory) {
    const products = this._getFromStorage("products");

    const filtered = products.filter((p) => {
      if (category && p.category !== category) return false;
      if (subcategory && p.subcategory !== subcategory) return false;
      return true;
    });

    const applicationsMap = new Map();
    const modalitiesMap = new Map();
    const technologiesMap = new Map();
    const mountsMap = new Map();
    const illumMap = new Map();
    const compatibilityProductsMap = new Map();

    let minNA = Infinity;
    let maxNA = -Infinity;
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    filtered.forEach((p) => {
      if (Array.isArray(p.applications)) {
        p.applications.forEach((app) => {
          if (!applicationsMap.has(app)) {
            applicationsMap.set(app, {
              value: app,
              label: this._toTitleCase(app)
            });
          }
        });
      }
      if (Array.isArray(p.imaging_modalities)) {
        p.imaging_modalities.forEach((im) => {
          if (!modalitiesMap.has(im)) {
            modalitiesMap.set(im, {
              value: im,
              label: this._toTitleCase(im)
            });
          }
        });
      }
      if (Array.isArray(p.technologies)) {
        p.technologies.forEach((t) => {
          if (!technologiesMap.has(t)) {
            technologiesMap.set(t, {
              value: t,
              label: this._toTitleCase(t)
            });
          }
        });
      }
      if (p.mount_type && !mountsMap.has(p.mount_type)) {
        mountsMap.set(p.mount_type, {
          value: p.mount_type,
          label: this._toTitleCase(p.mount_type)
        });
      }
      if (p.illumination_type && !illumMap.has(p.illumination_type)) {
        illumMap.set(p.illumination_type, {
          value: p.illumination_type,
          label: this._toTitleCase(p.illumination_type)
        });
      }

      if (typeof p.numerical_aperture === "number") {
        if (p.numerical_aperture < minNA) minNA = p.numerical_aperture;
        if (p.numerical_aperture > maxNA) maxNA = p.numerical_aperture;
      }
      if (typeof p.price === "number") {
        if (p.price < minPrice) minPrice = p.price;
        if (p.price > maxPrice) maxPrice = p.price;
      }
    });

    // Compatibility products: any product that others might be compatible with (e.g., microscopes)
    products.forEach((p) => {
      if (!compatibilityProductsMap.has(p.id)) {
        compatibilityProductsMap.set(p.id, {
          product_id: p.id,
          product_name: p.name
        });
      }
    });

    const numerical_aperture_ranges = [];
    if (isFinite(minNA) && isFinite(maxNA) && minNA < maxNA) {
      const mid = (minNA + maxNA) / 2;
      numerical_aperture_ranges.push({
        id: "low",
        label: `${minNA.toFixed(2)} - ${mid.toFixed(2)}`,
        min_value: minNA,
        max_value: mid
      });
      numerical_aperture_ranges.push({
        id: "high",
        label: `${mid.toFixed(2)} - ${maxNA.toFixed(2)}`,
        min_value: mid,
        max_value: maxNA
      });
    }

    const price_ranges = [];
    if (isFinite(minPrice) && isFinite(maxPrice) && minPrice < maxPrice) {
      const span = maxPrice - minPrice;
      const step = span / 3;
      const p1 = minPrice + step;
      const p2 = minPrice + step * 2;
      price_ranges.push({
        id: "low",
        label: `$${minPrice.toFixed(0)} - $${p1.toFixed(0)}`,
        min_price: minPrice,
        max_price: p1
      });
      price_ranges.push({
        id: "mid",
        label: `$${p1.toFixed(0)} - $${p2.toFixed(0)}`,
        min_price: p1,
        max_price: p2
      });
      price_ranges.push({
        id: "high",
        label: `$${p2.toFixed(0)} - $${maxPrice.toFixed(0)}`,
        min_price: p2,
        max_price: maxPrice
      });
    }

    return {
      applications: Array.from(applicationsMap.values()),
      imaging_modalities: Array.from(modalitiesMap.values()),
      technologies: Array.from(technologiesMap.values()),
      compatibility_products: Array.from(compatibilityProductsMap.values()),
      numerical_aperture_ranges,
      price_ranges,
      mount_types: Array.from(mountsMap.values()),
      illumination_types: Array.from(illumMap.values())
    };
  }

  searchProducts(search_query, category, subcategory, filters, sort, page = 1, page_size = 20) {
    const products = this._getFromStorage("products");
    const q = (search_query || "").toLowerCase();
    const f = filters || {};

    let result = products.filter((p) => p.status === "active");

    if (category) {
      result = result.filter((p) => p.category === category);
    }
    if (subcategory) {
      result = result.filter((p) => p.subcategory === subcategory);
    }

    if (q) {
      result = result.filter((p) => {
        const fields = [p.name, p.short_description, p.description];
        const kw = Array.isArray(p.search_keywords) ? p.search_keywords.join(" ") : "";
        return (
          fields.some((v) => v && String(v).toLowerCase().includes(q)) ||
          kw.toLowerCase().includes(q)
        );
      });
    }

    if (Array.isArray(f.application_areas) && f.application_areas.length > 0) {
      result = result.filter((p) => {
        if (!Array.isArray(p.applications)) return false;
        return p.applications.some((app) => f.application_areas.includes(app));
      });
    }

    if (Array.isArray(f.imaging_modalities) && f.imaging_modalities.length > 0) {
      result = result.filter((p) => {
        if (!Array.isArray(p.imaging_modalities)) return false;
        return p.imaging_modalities.some((im) => f.imaging_modalities.includes(im));
      });
    }

    if (Array.isArray(f.technologies) && f.technologies.length > 0) {
      result = result.filter((p) => {
        if (!Array.isArray(p.technologies)) return false;
        return p.technologies.some((t) => f.technologies.includes(t));
      });
    }

    if (f.compatibility_product_id) {
      const targetId = f.compatibility_product_id;
      result = result.filter((p) => Array.isArray(p.compatible_product_ids) && p.compatible_product_ids.includes(targetId));
    }

    if (f.mount_type) {
      result = result.filter((p) => p.mount_type === f.mount_type);
    }

    if (f.illumination_type) {
      result = result.filter((p) => p.illumination_type === f.illumination_type);
    }

    if (typeof f.min_price === "number") {
      result = result.filter((p) => typeof p.price === "number" && p.price >= f.min_price);
    }

    if (typeof f.max_price === "number") {
      result = result.filter((p) => typeof p.price === "number" && p.price <= f.max_price);
    }

    if (typeof f.min_numerical_aperture === "number") {
      result = result.filter(
        (p) => typeof p.numerical_aperture === "number" && p.numerical_aperture >= f.min_numerical_aperture
      );
    }

    if (typeof f.max_numerical_aperture === "number") {
      result = result.filter(
        (p) => typeof p.numerical_aperture === "number" && p.numerical_aperture <= f.max_numerical_aperture
      );
    }

    if (sort === "resolution_desc") {
      result.sort((a, b) => (b.resolution_score || 0) - (a.resolution_score || 0));
    } else if (sort === "price_asc") {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === "price_desc") {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    const total_count = result.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageItems = result.slice(start, end);

    return {
      products: pageItems,
      total_count,
      page,
      page_size
    };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage("products");
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category_name: "",
        subcategory_name: "",
        formatted_price: "",
        objective_options: [],
        related_applications: [],
        related_imaging_modalities: [],
        technical_documents: []
      };
    }

    const category_name = this._toTitleCase(product.category || "");
    const subcategory_name = this._toTitleCase(product.subcategory || "");
    const formatted_price = typeof product.price === "number" ? `$${product.price.toFixed(2)}` : "";
    const objective_options = Array.isArray(product.objective_options)
      ? product.objective_options.map((label) => ({ label }))
      : [];

    const related_applications = Array.isArray(product.applications) ? product.applications.slice() : [];
    const related_imaging_modalities = Array.isArray(product.imaging_modalities)
      ? product.imaging_modalities.slice()
      : [];

    const technical_documents = [];
    if (product.data_sheet_url) {
      technical_documents.push({
        doc_type: "datasheet",
        title: `${product.name} Datasheet`,
        url: product.data_sheet_url
      });
    }

    return {
      product,
      category_name,
      subcategory_name,
      formatted_price,
      objective_options,
      related_applications,
      related_imaging_modalities,
      technical_documents
    };
  }

  // -------------------------
  // Cart interfaces
  // -------------------------

  addProductToCart(productId, quantity = 1, selectedOptions = []) {
    const products = this._getFromStorage("products");
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { success: false, message: "Product not found", cart: null, cart_items: [] };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items");

    const now = this._nowIso();
    const cartItem = {
      id: this._generateId("cart_item"),
      cart_id: cart.id,
      product_id: product.id,
      product_name: product.name,
      product_category: product.category || null,
      quantity: quantity,
      unit_price: product.price || 0,
      line_total: (product.price || 0) * quantity,
      selected_options: Array.isArray(selectedOptions) ? selectedOptions : [],
      added_at: now
    };

    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);

    this._updateCartTotals(cart.id);
    const carts = this._getFromStorage("carts");
    const updatedCart = carts.find((c) => c.id === cart.id) || cart;

    const cart_items = cartItems
      .filter((ci) => ci.cart_id === cart.id)
      .map((ci) => ({
        ...ci,
        product: products.find((p) => p.id === ci.product_id) || null
      }));

    return {
      success: true,
      message: "Product added to cart",
      cart: updatedCart,
      cart_items
    };
  }

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const products = this._getFromStorage("products");
    const cartItems = this._getFromStorage("cart_items");

    const items = cartItems
      .filter((ci) => ci.cart_id === cart.id)
      .map((ci) => ({
        ...ci,
        product: products.find((p) => p.id === ci.product_id) || null
      }));

    return {
      cart,
      items
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage("cart_items");
    const products = this._getFromStorage("products");
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      return {
        success: false,
        message: "Cart item not found",
        cart: null,
        items: []
      };
    }

    const cartId = cartItems[itemIndex].cart_id;

    if (quantity <= 0) {
      cartItems.splice(itemIndex, 1);
    } else {
      const product = products.find((p) => p.id === cartItems[itemIndex].product_id) || null;
      const unitPrice = product ? product.price || 0 : cartItems[itemIndex].unit_price || 0;
      cartItems[itemIndex].quantity = quantity;
      cartItems[itemIndex].unit_price = unitPrice;
      cartItems[itemIndex].line_total = unitPrice * quantity;
    }

    this._saveToStorage("cart_items", cartItems);
    this._updateCartTotals(cartId);

    const carts = this._getFromStorage("carts");
    const cart = carts.find((c) => c.id === cartId) || null;

    const items = cartItems
      .filter((ci) => ci.cart_id === cartId)
      .map((ci) => ({
        ...ci,
        product: products.find((p) => p.id === ci.product_id) || null
      }));

    return {
      success: true,
      message: "Cart item updated",
      cart,
      items
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage("cart_items");
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      return {
        success: false,
        message: "Cart item not found",
        cart: null,
        items: []
      };
    }

    const cartId = cartItems[itemIndex].cart_id;
    cartItems.splice(itemIndex, 1);
    this._saveToStorage("cart_items", cartItems);
    this._updateCartTotals(cartId);

    const products = this._getFromStorage("products");
    const carts = this._getFromStorage("carts");
    const cart = carts.find((c) => c.id === cartId) || null;

    const items = cartItems
      .filter((ci) => ci.cart_id === cartId)
      .map((ci) => ({
        ...ci,
        product: products.find((p) => p.id === ci.product_id) || null
      }));

    return {
      success: true,
      message: "Cart item removed",
      cart,
      items
    };
  }

  clearCart() {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage("cart_items");
    cartItems = cartItems.filter((ci) => ci.cart_id !== cart.id);
    this._saveToStorage("cart_items", cartItems);

    this._updateCartTotals(cart.id);
    const carts = this._getFromStorage("carts");
    const updatedCart = carts.find((c) => c.id === cart.id) || cart;

    return {
      success: true,
      message: "Cart cleared",
      cart: updatedCart,
      items: []
    };
  }

  // -------------------------
  // Quote interfaces
  // -------------------------

  addProductToQuote(productId, quantity = 1, selectedOptions = [], configurationSummary = "") {
    const products = this._getFromStorage("products");
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { success: false, message: "Product not found", quote: null, quote_items: [] };
    }

    const quote = this._getOrCreateQuote();
    const quoteItems = this._getFromStorage("quote_items");
    const now = this._nowIso();

    const summary = configurationSummary || (Array.isArray(selectedOptions) ? selectedOptions.join("; ") : "");

    const quoteItem = {
      id: this._generateId("quote_item"),
      quote_id: quote.id,
      item_type: "product",
      product_id: product.id,
      bundle_id: null,
      description: product.name,
      quantity: quantity,
      unit_price: product.price || 0,
      line_total: (product.price || 0) * quantity,
      configuration_summary: summary,
      created_at: now
    };

    quoteItems.push(quoteItem);
    this._saveToStorage("quote_items", quoteItems);
    this._updateQuoteTotals(quote.id);

    const quotes = this._getFromStorage("quotes");
    const updatedQuote = quotes.find((q) => q.id === quote.id) || quote;

    const bundles = this._getFromStorage("configurator_bundles");

    const quote_items = quoteItems
      .filter((qi) => qi.quote_id === quote.id)
      .map((qi) => {
        const enriched = { ...qi };
        if (qi.item_type === "product" && qi.product_id) {
          enriched.product = products.find((p) => p.id === qi.product_id) || null;
        }
        if (qi.item_type === "bundle" && qi.bundle_id) {
          const bundle = bundles.find((b) => b.id === qi.bundle_id) || null;
          if (bundle) {
            const camera = products.find((p) => p.id === bundle.camera_product_id) || null;
            const lens = products.find((p) => p.id === bundle.lens_product_id) || null;
            const illumination = products.find((p) => p.id === bundle.illumination_product_id) || null;
            enriched.bundle = {
              ...bundle,
              camera,
              lens,
              illumination
            };
          } else {
            enriched.bundle = null;
          }
        }
        return enriched;
      });

    return {
      success: true,
      message: "Product added to quote",
      quote: updatedQuote,
      quote_items
    };
  }

  getQuoteSummary() {
    const quote = this._getOrCreateQuote();
    const quoteItems = this._getFromStorage("quote_items");
    const products = this._getFromStorage("products");
    const bundles = this._getFromStorage("configurator_bundles");

    const items = quoteItems
      .filter((qi) => qi.quote_id === quote.id)
      .map((qi) => {
        const enriched = { ...qi };
        if (qi.item_type === "product" && qi.product_id) {
          enriched.product = products.find((p) => p.id === qi.product_id) || null;
        }
        if (qi.item_type === "bundle" && qi.bundle_id) {
          const bundle = bundles.find((b) => b.id === qi.bundle_id) || null;
          if (bundle) {
            const camera = products.find((p) => p.id === bundle.camera_product_id) || null;
            const lens = products.find((p) => p.id === bundle.lens_product_id) || null;
            const illumination = products.find((p) => p.id === bundle.illumination_product_id) || null;
            enriched.bundle = {
              ...bundle,
              camera,
              lens,
              illumination
            };
          } else {
            enriched.bundle = null;
          }
        }
        return enriched;
      });

    return {
      quote,
      items
    };
  }

  updateQuoteMetadata(name, contact_name, contact_email, contact_organization, notes) {
    const quote = this._getOrCreateQuote();
    const quotes = this._getFromStorage("quotes");
    const idx = quotes.findIndex((q) => q.id === quote.id);
    if (idx === -1) {
      return { success: false, message: "Quote not found", quote: null };
    }

    if (typeof name === "string") quotes[idx].name = name;
    if (typeof contact_name === "string") quotes[idx].contact_name = contact_name;
    if (typeof contact_email === "string") quotes[idx].contact_email = contact_email;
    if (typeof contact_organization === "string") quotes[idx].contact_organization = contact_organization;
    if (typeof notes === "string") quotes[idx].notes = notes;
    quotes[idx].updated_at = this._nowIso();

    this._saveToStorage("quotes", quotes);

    return {
      success: true,
      message: "Quote updated",
      quote: quotes[idx]
    };
  }

  submitQuote() {
    const quote = this._getOrCreateQuote();
    const quotes = this._getFromStorage("quotes");
    const idx = quotes.findIndex((q) => q.id === quote.id);
    if (idx === -1) {
      return { success: false, message: "Quote not found", quote: null };
    }

    quotes[idx].status = "submitted";
    quotes[idx].submitted_at = this._nowIso();
    quotes[idx].updated_at = quotes[idx].submitted_at;
    this._saveToStorage("quotes", quotes);

    return {
      success: true,
      message: "Quote submitted",
      quote: quotes[idx]
    };
  }

  // -------------------------
  // Related products
  // -------------------------

  getRelatedProducts(productId) {
    const products = this._getFromStorage("products");
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { accessories: [], compatible_components: [] };
    }

    const accessories = products.filter((p) => p.category === "accessories");
    const compatible_components = products.filter(
      (p) => Array.isArray(p.compatible_product_ids) && p.compatible_product_ids.includes(productId)
    );

    return {
      accessories,
      compatible_components
    };
  }

  // -------------------------
  // Compare list
  // -------------------------

  addProductToCompareList(productId) {
    const products = this._getFromStorage("products");
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return { success: false, message: "Product not found", compare_list: null };
    }

    const list = this._getOrCreateCompareList();
    const compareLists = this._getFromStorage("compare_lists");
    const idx = compareLists.findIndex((cl) => cl.id === list.id);
    if (idx === -1) {
      return { success: false, message: "Compare list not found", compare_list: null };
    }

    if (!compareLists[idx].product_ids.includes(productId)) {
      compareLists[idx].product_ids.push(productId);
      compareLists[idx].updated_at = this._nowIso();
      this._saveToStorage("compare_lists", compareLists);
    }

    return {
      success: true,
      message: "Product added to compare list",
      compare_list: compareLists[idx]
    };
  }

  getCompareList() {
    const list = this._getOrCreateCompareList();
    const products = this._getFromStorage("products");
    const compareProducts = products.filter((p) => list.product_ids.includes(p.id));

    return {
      compare_list: list,
      products: compareProducts
    };
  }

  removeProductFromCompareList(productId) {
    const list = this._getOrCreateCompareList();
    const compareLists = this._getFromStorage("compare_lists");
    const idx = compareLists.findIndex((cl) => cl.id === list.id);
    if (idx === -1) {
      return { success: false, message: "Compare list not found", compare_list: null };
    }

    compareLists[idx].product_ids = compareLists[idx].product_ids.filter((id) => id !== productId);
    compareLists[idx].updated_at = this._nowIso();
    this._saveToStorage("compare_lists", compareLists);

    return {
      success: true,
      message: "Product removed from compare list",
      compare_list: compareLists[idx]
    };
  }

  clearCompareList() {
    const list = this._getOrCreateCompareList();
    const compareLists = this._getFromStorage("compare_lists");
    const idx = compareLists.findIndex((cl) => cl.id === list.id);
    if (idx === -1) {
      return { success: false, message: "Compare list not found", compare_list: null };
    }

    compareLists[idx].product_ids = [];
    compareLists[idx].updated_at = this._nowIso();
    this._saveToStorage("compare_lists", compareLists);

    return {
      success: true,
      message: "Compare list cleared",
      compare_list: compareLists[idx]
    };
  }

  // -------------------------
  // Resources (whitepapers, etc.)
  // -------------------------

  getResourceFilterOptions() {
    const resources = this._getFromStorage("resources");

    const contentTypesMap = new Map();
    const appAreasMap = new Map();
    const techMap = new Map();

    resources.forEach((r) => {
      if (r.content_type && !contentTypesMap.has(r.content_type)) {
        contentTypesMap.set(r.content_type, {
          value: r.content_type,
          label: this._toTitleCase(r.content_type)
        });
      }
      if (r.application_area && !appAreasMap.has(r.application_area)) {
        appAreasMap.set(r.application_area, {
          value: r.application_area,
          label: this._toTitleCase(r.application_area)
        });
      }
      if (r.technology && !techMap.has(r.technology)) {
        techMap.set(r.technology, {
          value: r.technology,
          label: this._toTitleCase(r.technology)
        });
      }
    });

    return {
      content_types: Array.from(contentTypesMap.values()),
      application_areas: Array.from(appAreasMap.values()),
      technologies: Array.from(techMap.values())
    };
  }

  listResources(search_query, filters, sort, page = 1, page_size = 20) {
    const resources = this._getFromStorage("resources");
    const q = (search_query || "").toLowerCase();
    const f = filters || {};

    let result = resources.slice();

    if (q) {
      result = result.filter((r) => {
        const fields = [r.title, r.abstract];
        const authors = Array.isArray(r.authors) ? r.authors.join(" ") : "";
        return (
          fields.some((v) => v && String(v).toLowerCase().includes(q)) ||
          authors.toLowerCase().includes(q)
        );
      });
    }

    if (Array.isArray(f.content_types) && f.content_types.length > 0) {
      result = result.filter((r) => f.content_types.includes(r.content_type));
    }

    if (Array.isArray(f.application_areas) && f.application_areas.length > 0) {
      result = result.filter((r) => f.application_areas.includes(r.application_area));
    }

    if (Array.isArray(f.technologies) && f.technologies.length > 0) {
      result = result.filter((r) => f.technologies.includes(r.technology));
    }

    if (f.publication_date_from) {
      const fromTs = Date.parse(f.publication_date_from);
      if (!isNaN(fromTs)) {
        result = result.filter((r) => {
          const ts = Date.parse(r.publication_date);
          return !isNaN(ts) && ts >= fromTs;
        });
      }
    }

    if (f.publication_date_to) {
      const toTs = Date.parse(f.publication_date_to);
      if (!isNaN(toTs)) {
        result = result.filter((r) => {
          const ts = Date.parse(r.publication_date);
          return !isNaN(ts) && ts <= toTs;
        });
      }
    }

    if (sort === "publication_date_desc") {
      result.sort((a, b) => Date.parse(b.publication_date) - Date.parse(a.publication_date));
    } else if (sort === "publication_date_asc") {
      result.sort((a, b) => Date.parse(a.publication_date) - Date.parse(b.publication_date));
    } else if (sort === "title_asc") {
      result.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    }

    const total_count = result.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageItems = result.slice(start, end);

    return {
      resources: pageItems,
      total_count,
      page,
      page_size
    };
  }

  getResourceDetails(resourceId) {
    const resources = this._getFromStorage("resources");
    const resource = resources.find((r) => r.id === resourceId) || null;
    return { resource };
  }

  startResourceDownload(resourceId) {
    const resources = this._getFromStorage("resources");
    const resource = resources.find((r) => r.id === resourceId) || null;
    if (!resource) {
      return { success: false, download_url: "", message: "Resource not found" };
    }

    // Instrumentation for task completion tracking (task_3)
    try {
      localStorage.setItem(
        "task3_downloadedResource",
        JSON.stringify({ resource_id: resourceId, downloaded_at: this._nowIso() })
      );
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      success: true,
      download_url: resource.download_url,
      message: "Download started"
    };
  }

  // -------------------------
  // Distributors
  // -------------------------

  getDistributorFilterOptions() {
    const distributors = this._getFromStorage("distributors");

    const countriesMap = new Map();
    const cities = [];
    const productLinesMap = new Map();

    distributors.forEach((d) => {
      if (d.country && !countriesMap.has(d.country)) {
        countriesMap.set(d.country, {
          code: d.country,
          name: d.country
        });
      }
      if (d.city && d.country) {
        cities.push({ country_code: d.country, city_name: d.city });
      }
      if (Array.isArray(d.product_line_specializations)) {
        d.product_line_specializations.forEach((pl) => {
          if (!productLinesMap.has(pl)) {
            productLinesMap.set(pl, {
              value: pl,
              label: this._toTitleCase(pl)
            });
          }
        });
      }
    });

    return {
      countries: Array.from(countriesMap.values()),
      cities,
      product_lines: Array.from(productLinesMap.values())
    };
  }

  listDistributors(filters) {
    const distributors = this._getFromStorage("distributors");
    const f = filters || {};

    let result = distributors.slice();

    if (f.country) {
      const countryLower = f.country.toLowerCase();
      result = result.filter((d) => d.country && d.country.toLowerCase() === countryLower);
    }

    if (f.city) {
      const cityLower = f.city.toLowerCase();
      result = result.filter((d) => d.city && d.city.toLowerCase() === cityLower);
    }

    if (f.region) {
      const regionLower = f.region.toLowerCase();
      result = result.filter((d) => d.region && d.region.toLowerCase() === regionLower);
    }

    if (Array.isArray(f.product_line_specializations) && f.product_line_specializations.length > 0) {
      result = result.filter((d) => {
        if (!Array.isArray(d.product_line_specializations)) return false;
        return d.product_line_specializations.some((pl) => f.product_line_specializations.includes(pl));
      });
    }

    if (typeof f.is_authorized === "boolean") {
      result = result.filter((d) => d.is_authorized === f.is_authorized);
    }

    return {
      distributors: result
    };
  }

  getDistributorDetails(distributorId) {
    const distributors = this._getFromStorage("distributors");
    const distributor = distributors.find((d) => d.id === distributorId) || null;
    return { distributor };
  }

  copyDistributorPhoneNumber(distributorId) {
    const distributors = this._getFromStorage("distributors");
    const distributor = distributors.find((d) => d.id === distributorId) || null;
    if (!distributor) {
      return { success: false, phone_number: "", message: "Distributor not found" };
    }

    // Instrumentation for task completion tracking (task_5)
    try {
      localStorage.setItem(
        "task5_copiedDistributorPhone",
        JSON.stringify({
          distributor_id: distributorId,
          phone_number: distributor.phone_number,
          copied_at: this._nowIso()
        })
      );
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      success: true,
      phone_number: distributor.phone_number,
      message: "Phone number copied"
    };
  }

  // -------------------------
  // Demo requests
  // -------------------------

  getDemoRequestFormOptions(application_area) {
    const products = this._getFromStorage("products");

    const appAreasMap = new Map();
    products.forEach((p) => {
      if (Array.isArray(p.applications)) {
        p.applications.forEach((app) => {
          if (!appAreasMap.has(app)) {
            appAreasMap.set(app, {
              value: app,
              label: this._toTitleCase(app)
            });
          }
        });
      }
    });

    const application_areas = Array.from(appAreasMap.values());

    let filteredProducts = products;
    if (application_area) {
      filteredProducts = products.filter((p) => Array.isArray(p.applications) && p.applications.includes(application_area));
    }

    const demo_types = [
      { value: "virtual_demo", label: "Virtual Demo" },
      { value: "onsite_demo", label: "Onsite Demo" }
    ];

    const time_zones = [
      { value: "cet", label: "CET (Central European Time)" },
      { value: "utc", label: "UTC" },
      { value: "gmt", label: "GMT" },
      { value: "est", label: "EST" },
      { value: "pst", label: "PST" },
      { value: "cst", label: "CST" },
      { value: "mst", label: "MST" }
    ];

    return {
      application_areas,
      products: filteredProducts,
      demo_types,
      time_zones
    };
  }

  submitDemoRequest(
    application_area,
    productId,
    demo_type,
    preferred_date,
    preferred_time,
    time_zone,
    contact_name,
    contact_email,
    contact_organization,
    contact_phone,
    additional_notes
  ) {
    const products = this._getFromStorage("products");
    const product = products.find((p) => p.id === productId) || null;

    const demo_requests = this._getFromStorage("demo_requests");
    const now = this._nowIso();
    const preferred_start_datetime = this._normalizeDateTime(preferred_date, preferred_time, time_zone);

    const demo_request = {
      id: this._generateId("demo"),
      application_area: application_area || null,
      product_id: product ? product.id : null,
      product_name: product ? product.name : null,
      demo_type: demo_type,
      preferred_start_datetime,
      time_zone,
      contact_name,
      contact_email,
      contact_organization: contact_organization || "",
      contact_phone: contact_phone || "",
      additional_notes: additional_notes || "",
      status: "submitted",
      created_at: now,
      submitted_at: now
    };

    demo_requests.push(demo_request);
    this._saveToStorage("demo_requests", demo_requests);

    const enriched = {
      ...demo_request,
      product
    };

    return {
      success: true,
      message: "Demo request submitted",
      demo_request: enriched
    };
  }

  // -------------------------
  // Configurator (camera/lens/illumination bundles)
  // -------------------------

  getConfiguratorCameraOptions(application, max_price, sort) {
    const products = this._getFromStorage("products");
    let cameras = products.filter((p) => p.category === "cameras");

    if (application) {
      cameras = cameras.filter((p) => Array.isArray(p.applications) && p.applications.includes(application));
    }

    if (typeof max_price === "number") {
      cameras = cameras.filter((p) => typeof p.price === "number" && p.price <= max_price);
    }

    if (sort === "resolution_desc") {
      cameras.sort((a, b) => (b.resolution_score || 0) - (a.resolution_score || 0));
    } else if (sort === "price_asc") {
      cameras.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === "price_desc") {
      cameras.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return {
      cameras
    };
  }

  getConfiguratorLensOptions(mount_type, max_price, min_focal_length_mm, max_focal_length_mm) {
    const products = this._getFromStorage("products");
    let lenses = products.filter((p) => p.category === "accessories" && p.subcategory === "objective_lens");

    if (mount_type) {
      lenses = lenses.filter((p) => p.mount_type === mount_type);
    }

    if (typeof max_price === "number") {
      lenses = lenses.filter((p) => typeof p.price === "number" && p.price <= max_price);
    }

    if (typeof min_focal_length_mm === "number") {
      lenses = lenses.filter(
        (p) => typeof p.focal_length_mm === "number" && p.focal_length_mm >= min_focal_length_mm
      );
    }

    if (typeof max_focal_length_mm === "number") {
      lenses = lenses.filter(
        (p) => typeof p.focal_length_mm === "number" && p.focal_length_mm <= max_focal_length_mm
      );
    }

    return {
      lenses
    };
  }

  getConfiguratorIlluminationOptions(illumination_type, max_price) {
    const products = this._getFromStorage("products");
    let illuminations = products.filter(
      (p) => p.category === "accessories" && p.subcategory === "illumination_module"
    );

    if (illumination_type) {
      illuminations = illuminations.filter((p) => p.illumination_type === illumination_type);
    }

    if (typeof max_price === "number") {
      illuminations = illuminations.filter((p) => typeof p.price === "number" && p.price <= max_price);
    }

    return {
      illuminations
    };
  }

  getConfiguratorBundleSummary(application, cameraProductId, lensProductId, illuminationProductId, budget) {
    const products = this._getFromStorage("products");
    const camera = products.find((p) => p.id === cameraProductId) || null;
    const lens = products.find((p) => p.id === lensProductId) || null;
    const illumination = products.find((p) => p.id === illuminationProductId) || null;

    const camera_price = camera ? camera.price || 0 : 0;
    const lens_price = lens ? lens.price || 0 : 0;
    const illumination_price = illumination ? illumination.price || 0 : 0;

    const { bundle_price, within_budget } = this._validateBundleBudget(
      camera_price,
      lens_price,
      illumination_price,
      budget
    );

    return {
      application,
      camera,
      lens,
      illumination,
      camera_price,
      lens_price,
      illumination_price,
      bundle_price,
      currency: "usd",
      within_budget,
      budget: typeof budget === "number" ? budget : null
    };
  }

  createBundleAndAddToQuote(
    application,
    cameraProductId,
    lensProductId,
    illuminationProductId,
    budget,
    project_name
  ) {
    const products = this._getFromStorage("products");
    const camera = products.find((p) => p.id === cameraProductId) || null;
    const lens = products.find((p) => p.id === lensProductId) || null;
    const illumination = products.find((p) => p.id === illuminationProductId) || null;

    if (!camera || !lens || !illumination) {
      return {
        success: false,
        within_budget: false,
        message: "One or more bundle components not found",
        bundle: null,
        quote: null,
        quote_item: null
      };
    }

    const camera_price = camera.price || 0;
    const lens_price = lens.price || 0;
    const illumination_price = illumination.price || 0;

    const { bundle_price, within_budget } = this._validateBundleBudget(
      camera_price,
      lens_price,
      illumination_price,
      budget
    );

    if (typeof budget === "number" && !within_budget) {
      return {
        success: false,
        within_budget: false,
        message: "Bundle exceeds budget",
        bundle: null,
        quote: null,
        quote_item: null
      };
    }

    const bundles = this._getFromStorage("configurator_bundles");
    const now = this._nowIso();

    const bundle = {
      id: this._generateId("bundle"),
      configurator_application: application,
      camera_product_id: camera.id,
      lens_product_id: lens.id,
      illumination_product_id: illumination.id,
      camera_price,
      lens_price,
      illumination_price,
      bundle_price,
      currency: "usd",
      project_name: project_name || "",
      status: "ready_to_quote",
      created_at: now,
      updated_at: now
    };

    bundles.push(bundle);
    this._saveToStorage("configurator_bundles", bundles);

    const quote = this._getOrCreateQuote();
    const quoteItems = this._getFromStorage("quote_items");

    const configuration_summary = `Camera: ${camera.name}; Lens: ${lens.name}; Illumination: ${illumination.name}`;

    const quote_item = {
      id: this._generateId("quote_item"),
      quote_id: quote.id,
      item_type: "bundle",
      product_id: null,
      bundle_id: bundle.id,
      description: project_name
        ? `Custom bundle – ${project_name}`
        : `Custom ${this._toTitleCase(application)} bundle`,
      quantity: 1,
      unit_price: bundle_price,
      line_total: bundle_price,
      configuration_summary,
      created_at: now
    };

    quoteItems.push(quote_item);
    this._saveToStorage("quote_items", quoteItems);
    this._updateQuoteTotals(quote.id);

    // Mark bundle as added_to_quote
    const bundlesAfter = this._getFromStorage("configurator_bundles");
    const bIdx = bundlesAfter.findIndex((b) => b.id === bundle.id);
    if (bIdx !== -1) {
      bundlesAfter[bIdx].status = "added_to_quote";
      bundlesAfter[bIdx].updated_at = this._nowIso();
      this._saveToStorage("configurator_bundles", bundlesAfter);
    }

    const quotes = this._getFromStorage("quotes");
    const updatedQuote = quotes.find((q) => q.id === quote.id) || quote;

    const finalBundle = bundlesAfter.find((b) => b.id === bundle.id) || bundle;
    const enrichedBundle = {
      ...finalBundle,
      camera,
      lens,
      illumination
    };

    return {
      success: true,
      within_budget: true,
      message: "Bundle created and added to quote",
      bundle: enrichedBundle,
      quote: updatedQuote,
      quote_item
    };
  }

  // -------------------------
  // Support & Knowledge Base
  // -------------------------

  getSupportOverview() {
    const articles = this._getFromStorage("knowledge_base_articles");

    let popular_articles = articles.filter((a) => a.is_popular);
    if (popular_articles.length === 0) {
      popular_articles = articles.slice(0, 5);
    }

    const categoryMap = new Map();
    articles.forEach((a) => {
      const app = a.application_area || "general_imaging";
      if (!categoryMap.has(app)) {
        categoryMap.set(app, {
          label: this._toTitleCase(app),
          article_count: 0
        });
      }
      const c = categoryMap.get(app);
      c.article_count += 1;
    });

    const popular_categories = Array.from(categoryMap.values());

    const contact_options = [
      {
        type: "email_support",
        label: "Email Support",
        description: "Contact technical support via email."
      },
      {
        type: "phone_support",
        label: "Phone Support",
        description: "Call our technical support line."
      }
    ];

    return {
      popular_articles,
      popular_categories,
      contact_options
    };
  }

  getKnowledgeBaseFilterOptions() {
    const products = this._getFromStorage("products");
    const articles = this._getFromStorage("knowledge_base_articles");

    const productMap = new Map();
    products.forEach((p) => {
      productMap.set(p.id, { product_id: p.id, product_name: p.name });
    });

    const articleTypesMap = new Map();
    const appAreasMap = new Map();

    articles.forEach((a) => {
      if (a.article_type && !articleTypesMap.has(a.article_type)) {
        articleTypesMap.set(a.article_type, {
          value: a.article_type,
          label: this._toTitleCase(a.article_type)
        });
      }
      if (a.application_area && !appAreasMap.has(a.application_area)) {
        appAreasMap.set(a.application_area, {
          value: a.application_area,
          label: this._toTitleCase(a.application_area)
        });
      }
    });

    return {
      products: Array.from(productMap.values()),
      article_types: Array.from(articleTypesMap.values()),
      application_areas: Array.from(appAreasMap.values())
    };
  }

  searchKnowledgeBaseArticles(search_query, filters, sort, page = 1, page_size = 20) {
    const articles = this._getFromStorage("knowledge_base_articles");
    const products = this._getFromStorage("products");
    const q = (search_query || "").toLowerCase();
    const f = filters || {};

    let result = articles.slice();

    if (q) {
      result = result.filter((a) => {
        const fields = [a.title, a.content, a.excerpt];
        const kw = Array.isArray(a.keywords) ? a.keywords.join(" ") : "";
        return (
          fields.some((v) => v && String(v).toLowerCase().includes(q)) ||
          kw.toLowerCase().includes(q)
        );
      });
    }

    if (f.productId) {
      const productId = f.productId;
      result = result.filter(
        (a) => Array.isArray(a.related_product_ids) && a.related_product_ids.includes(productId)
      );
    }

    if (Array.isArray(f.article_types) && f.article_types.length > 0) {
      result = result.filter((a) => f.article_types.includes(a.article_type));
    }

    if (Array.isArray(f.application_areas) && f.application_areas.length > 0) {
      result = result.filter((a) => f.application_areas.includes(a.application_area));
    }

    if (sort === "recent_first") {
      result.sort((a, b) => Date.parse(b.last_updated) - Date.parse(a.last_updated));
    }

    const total_count = result.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageItems = result.slice(start, end);

    // No foreign keys to resolve here besides related_product_ids, which are auxiliary
    // We keep articles as-is. Frontend can separately resolve related products if needed.

    return {
      articles: pageItems,
      total_count,
      page,
      page_size
    };
  }

  getKnowledgeBaseArticle(articleId) {
    const articles = this._getFromStorage("knowledge_base_articles");
    const article = articles.find((a) => a.id === articleId) || null;
    return { article };
  }

  addArticleToFavorites(articleId) {
    const articles = this._getFromStorage("knowledge_base_articles");
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return { success: false, message: "Article not found", favorites_list: null, favorite_articles: [] };
    }

    const list = this._getOrCreateFavoritesList();
    const lists = this._getFromStorage("favorites");
    const idx = lists.findIndex((l) => l.id === list.id);
    if (idx === -1) {
      return { success: false, message: "Favorites list not found", favorites_list: null, favorite_articles: [] };
    }

    if (!lists[idx].article_ids.includes(articleId)) {
      lists[idx].article_ids.push(articleId);
      lists[idx].updated_at = this._nowIso();
      this._saveToStorage("favorites", lists);
    }

    const favorites_list = lists[idx];
    const favorite_articles = favorites_list.article_ids
      .map((id) => articles.find((a) => a.id === id) || null)
      .filter((a) => a !== null);

    return {
      success: true,
      message: "Article added to favorites",
      favorites_list,
      favorite_articles
    };
  }

  removeArticleFromFavorites(articleId) {
    const list = this._getOrCreateFavoritesList();
    const lists = this._getFromStorage("favorites");
    const idx = lists.findIndex((l) => l.id === list.id);
    if (idx === -1) {
      return { success: false, message: "Favorites list not found", favorites_list: null, favorite_articles: [] };
    }

    lists[idx].article_ids = lists[idx].article_ids.filter((id) => id !== articleId);
    lists[idx].updated_at = this._nowIso();
    this._saveToStorage("favorites", lists);

    const articles = this._getFromStorage("knowledge_base_articles");
    const favorites_list = lists[idx];
    const favorite_articles = favorites_list.article_ids
      .map((id) => articles.find((a) => a.id === id) || null)
      .filter((a) => a !== null);

    return {
      success: true,
      message: "Article removed from favorites",
      favorites_list,
      favorite_articles
    };
  }

  getFavoriteArticles() {
    const list = this._getOrCreateFavoritesList();
    const articles = this._getFromStorage("knowledge_base_articles");
    const favorite_articles = list.article_ids
      .map((id) => articles.find((a) => a.id === id) || null)
      .filter((a) => a !== null);

    return {
      favorites_list: list,
      favorite_articles
    };
  }

  // -------------------------
  // Events & Training
  // -------------------------

  getEventFilterOptions() {
    const events = this._getFromStorage("events");

    const formatsMap = new Map();
    const levelsMap = new Map();
    const appAreasMap = new Map();

    events.forEach((e) => {
      if (e.format && !formatsMap.has(e.format)) {
        formatsMap.set(e.format, {
          value: e.format,
          label: this._toTitleCase(e.format)
        });
      }
      if (e.level && !levelsMap.has(e.level)) {
        levelsMap.set(e.level, {
          value: e.level,
          label: this._toTitleCase(e.level)
        });
      }
      if (e.application_area && !appAreasMap.has(e.application_area)) {
        appAreasMap.set(e.application_area, {
          value: e.application_area,
          label: this._toTitleCase(e.application_area)
        });
      }
    });

    return {
      formats: Array.from(formatsMap.values()),
      levels: Array.from(levelsMap.values()),
      application_areas: Array.from(appAreasMap.values())
    };
  }

  listEvents(search_query, filters, page = 1, page_size = 20) {
    const events = this._getFromStorage("events");
    const sessions = this._getFromStorage("event_sessions");
    const q = (search_query || "").toLowerCase();
    const f = filters || {};

    let result = events.slice();

    if (q) {
      result = result.filter((e) => {
        const fields = [e.title, e.description, e.primary_topic];
        const topics = Array.isArray(e.topics) ? e.topics.join(" ") : "";
        return (
          fields.some((v) => v && String(v).toLowerCase().includes(q)) ||
          topics.toLowerCase().includes(q)
        );
      });
    }

    if (Array.isArray(f.formats) && f.formats.length > 0) {
      result = result.filter((e) => f.formats.includes(e.format));
    }

    if (Array.isArray(f.levels) && f.levels.length > 0) {
      result = result.filter((e) => f.levels.includes(e.level));
    }

    if (Array.isArray(f.application_areas) && f.application_areas.length > 0) {
      result = result.filter((e) => f.application_areas.includes(e.application_area));
    }

    if (f.date_from || f.date_to) {
      const fromTs = f.date_from ? Date.parse(f.date_from) : null;
      const toTs = f.date_to ? Date.parse(f.date_to) : null;
      result = result.filter((e) => {
        const eventSessions = sessions.filter((s) => s.event_id === e.id);
        if (eventSessions.length === 0) return false;
        return eventSessions.some((s) => {
          const ts = Date.parse(s.start_datetime);
          if (isNaN(ts)) return false;
          if (fromTs !== null && ts < fromTs) return false;
          if (toTs !== null && ts > toTs) return false;
          return true;
        });
      });
    }

    const total_count = result.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;

    const pageItems = result.slice(start, end);

    return {
      events: pageItems,
      total_count,
      page,
      page_size
    };
  }

  getEventDetails(eventId) {
    const events = this._getFromStorage("events");
    const sessions = this._getFromStorage("event_sessions");

    const event = events.find((e) => e.id === eventId) || null;
    const eventSessions = sessions.filter((s) => s.event_id === eventId);

    // We return sessions as-is; they contain event_id foreign key.
    return {
      event,
      sessions: eventSessions
    };
  }

  registerForEventSession(sessionId, attendee_name, attendee_email, attendee_organization) {
    const sessions = this._getFromStorage("event_sessions");
    const events = this._getFromStorage("events");
    const session = sessions.find((s) => s.id === sessionId) || null;
    if (!session) {
      return { success: false, message: "Session not found", registration: null };
    }
    const event = events.find((e) => e.id === session.event_id) || null;

    const registrations = this._getFromStorage("event_registrations");
    const now = this._nowIso();

    const registration = {
      id: this._generateId("registration"),
      event_id: session.event_id,
      session_id: session.id,
      attendee_name,
      attendee_email,
      attendee_organization: attendee_organization || "",
      status: "registered",
      registered_at: now
    };

    registrations.push(registration);
    this._saveToStorage("event_registrations", registrations);

    const enriched = {
      ...registration,
      event,
      session
    };

    return {
      success: true,
      message: "Registration completed",
      registration: enriched
    };
  }

  // -------------------------
  // Static pages
  // -------------------------

  getStaticPageContent(page_key) {
    const pages = this._getFromStorage("static_pages");
    const page = pages.find((p) => p.page_key === page_key) || null;
    if (page) {
      return page;
    }

    // Fallback minimal content derived from key (does not persist)
    return {
      page_key,
      title: this._toTitleCase(page_key),
      body_html: "",
      last_updated: this._nowIso()
    };
  }
}

// Browser global + Node.js export
if (typeof window !== "undefined") {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = BusinessLogic;
}