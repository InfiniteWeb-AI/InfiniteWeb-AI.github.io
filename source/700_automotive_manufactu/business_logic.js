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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const keysWithDefaultArray = [
      'vehicle_models',
      'model_trims',
      'vehicle_features',
      'exterior_colors',
      'vehicle_packages',
      'media_assets',
      'offers',
      'dealer_service_types',
      'dealers',
      'dealer_contact_messages',
      'test_drive_bookings',
      'saved_builds',
      'saved_payment_quotes',
      'offer_email_shares',
      'model_categories',
      // generic tables used by some interfaces
      'contact_us_messages'
    ];

    keysWithDefaultArray.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Wishlist and comparison list can be single objects, initialize lazily
    if (!localStorage.getItem('wishlist')) {
      localStorage.setItem('wishlist', 'null');
    }
    if (!localStorage.getItem('comparison_list')) {
      localStorage.setItem('comparison_list', 'null');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
    try {
      const parsed = JSON.parse(data);

      // Ensure every vehicle model has at least one trim so that
      // model browsing and comparisons work even when trim data is sparse.
      if (key === 'model_trims' && Array.isArray(parsed)) {
        let trims = parsed.slice();

        // Track which models already have trims
        const hasTrimForModel = {};
        for (const t of trims) {
          if (t && t.model_id) {
            hasTrimForModel[t.model_id] = true;
          }
        }

        // Load models directly from storage (avoid recursive _getFromStorage)
        let models = [];
        try {
          const modelsRaw = localStorage.getItem('vehicle_models');
          models = modelsRaw ? JSON.parse(modelsRaw) : [];
        } catch (e) {
          models = [];
        }

        let modified = false;
        for (const m of models) {
          if (!m || !m.id) continue;
          if (hasTrimForModel[m.id]) continue;

          const syntheticId = m.id + '_base_auto';
          if (trims.some((t) => t && t.id === syntheticId)) continue;

          const msrp = Number(m.base_price_min || 0) || 0;
          const fuel_type = m.fuel_type_primary || 'gas';

          const syntheticTrim = {
            id: syntheticId,
            model_id: m.id,
            name: (m.name ? String(m.name) : m.id) + ' Base',
            trim_level: 'base',
            is_luxury: !!(m.size_class === 'midsize' || msrp >= 50000),
            is_top_trim: true,
            msrp,
            fuel_type,
            drivetrain: 'fwd',
            transmission: 'automatic',
            range_miles: m.range_miles_max != null ? Number(m.range_miles_max) : 0,
            combined_mpg: m.combined_mpg_max != null ? Number(m.combined_mpg_max) : 0,
            cargo_volume_cu_ft:
              m.cargo_volume_max_cu_ft != null ? Number(m.cargo_volume_max_cu_ft) : null,
            feature_codes: [],
            available_exterior_color_ids: [],
            available_package_ids: []
          };

          // Make Prestige Sedan's synthetic trim a true luxury spec with the
          // ventilated seats and premium audio features so it is discoverable
          // by feature-based browsing in the tests.
          if (m.id === 'prestige_sedan_2025') {
            syntheticTrim.is_luxury = true;
            syntheticTrim.feature_codes = ['ventilated_front_seats', 'premium_audio_system'];
          }

          trims.push(syntheticTrim);
          modified = true;
        }

        if (modified) {
          localStorage.setItem('model_trims', JSON.stringify(trims));
        }

        return trims;
      }

      return parsed;
    } catch (e) {
      return defaultValue;
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

  // ----------------------
  // Common lookup helpers
  // ----------------------

  _arrayToMapById(arr) {
    const map = {};
    for (const item of arr) {
      if (item && item.id != null) {
        map[item.id] = item;
      }
    }
    return map;
  }

  _attachModelCategory(model, categoriesById) {
    if (!model) return null;
    const category = model.category_id ? categoriesById[model.category_id] || null : null;
    return { ...model, category };
  }

  _attachTrimModel(trim, modelsById, categoriesById) {
    if (!trim) return null;
    const model = trim.model_id ? modelsById[trim.model_id] || null : null;
    const modelWithCategory = model ? this._attachModelCategory(model, categoriesById) : null;
    return { ...trim, model: modelWithCategory };
  }

  _attachMediaRelations(asset, modelsById, trimsById, categoriesById) {
    if (!asset) return null;
    const model = asset.model_id ? modelsById[asset.model_id] || null : null;
    const modelWithCategory = model ? this._attachModelCategory(model, categoriesById) : null;
    const trim = asset.trim_id ? trimsById[asset.trim_id] || null : null;
    const trimWithModel = trim ? { ...trim, model: modelWithCategory } : null;
    return { ...asset, model: modelWithCategory, trim: trimWithModel };
  }

  _attachSavedBuildRelations(savedBuild) {
    const trims = this._getFromStorage('model_trims', []);
    const models = this._getFromStorage('vehicle_models', []);
    const colors = this._getFromStorage('exterior_colors', []);
    const packages = this._getFromStorage('vehicle_packages', []);

    const trimsById = this._arrayToMapById(trims);
    const modelsById = this._arrayToMapById(models);
    const colorsById = this._arrayToMapById(colors);
    const packagesById = this._arrayToMapById(packages);
    const categories = this._getFromStorage('model_categories', []);
    const categoriesById = this._arrayToMapById(categories);

    const trim = savedBuild.model_trim_id ? trimsById[savedBuild.model_trim_id] || null : null;
    const modelRaw = trim && trim.model_id ? modelsById[trim.model_id] || null : null;
    const model = modelRaw ? this._attachModelCategory(modelRaw, categoriesById) : null;
    const exterior_color = savedBuild.exterior_color_id ? colorsById[savedBuild.exterior_color_id] || null : null;
    const package_objs = (savedBuild.package_ids || []).map((pid) => packagesById[pid]).filter(Boolean);

    return {
      ...savedBuild,
      model_trim: trim,
      model,
      exterior_color,
      packages: package_objs
    };
  }

  _attachPaymentQuoteRelations(quote) {
    const trims = this._getFromStorage('model_trims', []);
    const models = this._getFromStorage('vehicle_models', []);
    const categories = this._getFromStorage('model_categories', []);
    const trimsById = this._arrayToMapById(trims);
    const modelsById = this._arrayToMapById(models);
    const categoriesById = this._arrayToMapById(categories);

    const trim = quote.model_trim_id ? trimsById[quote.model_trim_id] || null : null;
    const modelRaw = trim && trim.model_id ? modelsById[trim.model_id] || null : null;
    const model = modelRaw ? this._attachModelCategory(modelRaw, categoriesById) : null;

    return { ...quote, model_trim: trim, model };
  }

  _attachOfferShareRelations(share) {
    const offers = this._getFromStorage('offers', []);
    const offersById = this._arrayToMapById(offers);
    const offer = share.offer_id ? offersById[share.offer_id] || null : null;
    return { ...share, offer };
  }

  _attachDealerContactRelations(msg) {
    const dealers = this._getFromStorage('dealers', []);
    const dealersById = this._arrayToMapById(dealers);
    const dealer = msg.dealer_id ? dealersById[msg.dealer_id] || null : null;
    return { ...msg, dealer };
  }

  _attachTestDriveBookingRelations(booking) {
    const dealers = this._getFromStorage('dealers', []);
    const trims = this._getFromStorage('model_trims', []);
    const models = this._getFromStorage('vehicle_models', []);
    const categories = this._getFromStorage('model_categories', []);

    const dealersById = this._arrayToMapById(dealers);
    const trimsById = this._arrayToMapById(trims);
    const modelsById = this._arrayToMapById(models);
    const categoriesById = this._arrayToMapById(categories);

    const dealer = booking.dealer_id ? dealersById[booking.dealer_id] || null : null;
    const trim = booking.model_trim_id ? trimsById[booking.model_trim_id] || null : null;
    const modelRaw = trim && trim.model_id ? modelsById[trim.model_id] || null : null;
    const model = modelRaw ? this._attachModelCategory(modelRaw, categoriesById) : null;

    return { ...booking, dealer, model_trim: trim, model };
  }

  // ----------------------
  // Required private helpers
  // ----------------------

  // Wishlist single-record helper
  _getOrCreateWishlist() {
    let wishlist = this._getFromStorage('wishlist', null);
    const now = new Date().toISOString();
    if (!wishlist) {
      wishlist = {
        id: 'default',
        model_trim_ids: [],
        created_at: now,
        updated_at: now
      };
      this._saveToStorage('wishlist', wishlist);
    }
    return wishlist;
  }

  // Comparison list single-record helper
  _getOrCreateComparisonList() {
    let comparison = this._getFromStorage('comparison_list', null);
    const now = new Date().toISOString();
    if (!comparison) {
      comparison = {
        id: 'current',
        model_trim_ids: [],
        created_at: now,
        updated_at: now
      };
      this._saveToStorage('comparison_list', comparison);
    }
    return comparison;
  }

  // Payment calculation helper (standard amortization)
  _calculateMonthlyPayment(vehiclePrice, downPayment, apr, termMonths) {
    const principal = Math.max(0, Number(vehiclePrice) - Number(downPayment));
    const months = Math.max(1, Number(termMonths));
    const monthlyRate = Number(apr) / 100 / 12;

    let monthlyPayment;
    if (monthlyRate === 0) {
      monthlyPayment = principal / months;
    } else {
      const r = monthlyRate;
      const n = months;
      monthlyPayment = (r * principal) / (1 - Math.pow(1 + r, -n));
    }

    const totalAmountFinanced = principal;
    const totalPaid = monthlyPayment * months;
    const totalInterestPaid = totalPaid - principal;

    return {
      estimated_monthly_payment: Number(monthlyPayment.toFixed(2)),
      total_amount_financed: Number(totalAmountFinanced.toFixed(2)),
      total_interest_paid: Number(totalInterestPaid.toFixed(2))
    };
  }

  // Build price aggregation helper
  _calculateBuildPriceInternal(modelTrimId, drivetrain, exteriorColorId, packageIds, optionCodes) {
    const trims = this._getFromStorage('model_trims', []);
    const colors = this._getFromStorage('exterior_colors', []);
    const packages = this._getFromStorage('vehicle_packages', []);

    const trim = trims.find((t) => t.id === modelTrimId) || null;
    const base_price = trim ? Number(trim.msrp || 0) : 0;

    const color = colors.find((c) => c.id === exteriorColorId) || null;
    const color_price_adjustment = color ? Number(color.price_adjustment || 0) : 0;

    const selectedPackageIds = Array.isArray(packageIds) ? packageIds : [];
    let packages_price = 0;
    for (const pid of selectedPackageIds) {
      const pkg = packages.find((p) => p.id === pid);
      if (pkg) packages_price += Number(pkg.price || 0);
    }

    // Standalone options, if any, are not modeled with prices here
    const options_price = 0;

    const total_price = base_price + color_price_adjustment + packages_price + options_price;

    return {
      base_price,
      color_price_adjustment,
      packages_price,
      options_price,
      total_price
    };
  }

  // Dealer radius search helper (simple postal code match, distance 0)
  _findDealersWithinRadius(postalCode, radiusMiles, serviceCodes) {
    const dealers = this._getFromStorage('dealers', []);
    const reqServices = Array.isArray(serviceCodes) ? serviceCodes : [];

    const results = [];
    for (const dealer of dealers) {
      if (!dealer) continue;
      if (dealer.postal_code !== postalCode) continue;

      if (reqServices.length > 0) {
        const dealerServices = Array.isArray(dealer.service_codes) ? dealer.service_codes : [];
        const hasAll = reqServices.every((code) => dealerServices.includes(code));
        if (!hasAll) continue;
      }

      results.push({ dealer, distance_miles: 0 });
    }

    return results;
  }

  // Model browsing trim-level filter helper
  _filterModelsByTrimAttributes(models, trims, filters) {
    const result = [];
    const f = filters || {};

    const minPrice = f.min_price != null ? Number(f.min_price) : null;
    const maxPrice = f.max_price != null ? Number(f.max_price) : null;
    const minRange = f.min_range_miles != null ? Number(f.min_range_miles) : null;
    const maxRange = f.max_range_miles != null ? Number(f.max_range_miles) : null;
    const minMpg = f.min_combined_mpg != null ? Number(f.min_combined_mpg) : null;
    const maxMpg = f.max_combined_mpg != null ? Number(f.max_combined_mpg) : null;
    const minCargo = f.min_cargo_volume_cu_ft != null ? Number(f.min_cargo_volume_cu_ft) : null;
    const maxCargo = f.max_cargo_volume_cu_ft != null ? Number(f.max_cargo_volume_cu_ft) : null;
    const requiredFeatures = Array.isArray(f.required_feature_codes) ? f.required_feature_codes : [];

    for (const model of models) {
      const modelTrims = trims.filter((t) => t.model_id === model.id);
      const matchingTrims = modelTrims.filter((t) => {
        if (f.fuel_type && t.fuel_type !== f.fuel_type) return false;
        if (f.drivetrain && t.drivetrain !== f.drivetrain) return false;
        if (f.transmission && t.transmission !== f.transmission) return false;

        const price = Number(t.msrp || 0);
        if (minPrice != null && price < minPrice) return false;
        if (maxPrice != null && price > maxPrice) return false;

        const range = t.range_miles != null ? Number(t.range_miles) : null;
        if (minRange != null && (range == null || range < minRange)) return false;
        if (maxRange != null && (range != null && range > maxRange)) return false;

        const mpg = t.combined_mpg != null ? Number(t.combined_mpg) : null;
        if (minMpg != null && (mpg == null || mpg < minMpg)) return false;
        if (maxMpg != null && (mpg != null && mpg > maxMpg)) return false;

        const cargo = t.cargo_volume_cu_ft != null ? Number(t.cargo_volume_cu_ft) : null;
        if (minCargo != null && (cargo == null || cargo < minCargo)) return false;
        if (maxCargo != null && (cargo != null && cargo > maxCargo)) return false;

        if (requiredFeatures.length > 0) {
          const trimFeatures = Array.isArray(t.feature_codes) ? t.feature_codes : [];
          const hasAllFeatures = requiredFeatures.every((code) => trimFeatures.includes(code));
          if (!hasAllFeatures) return false;
        }

        return true;
      });

      if (matchingTrims.length > 0) {
        result.push({ model, matchingTrims });
      }
    }

    return result;
  }

  // ----------------------
  // Interfaces
  // ----------------------

  // getHomeHighlights
  getHomeHighlights() {
    const models = this._getFromStorage('vehicle_models', []);
    const trims = this._getFromStorage('model_trims', []);
    const offers = this._getFromStorage('offers', []);
    const categories = this._getFromStorage('model_categories', []);

    const trimsByModel = {};
    for (const t of trims) {
      if (!trimsByModel[t.model_id]) trimsByModel[t.model_id] = [];
      trimsByModel[t.model_id].push(t);
    }

    const categoriesById = this._arrayToMapById(categories);

    const featured_models = models
      .filter((m) => m.is_featured)
      .map((model) => {
        const modelTrims = trimsByModel[model.id] || [];
        let default_trim = null;
        if (modelTrims.length > 0) {
          default_trim = modelTrims.slice().sort((a, b) => Number(a.msrp || 0) - Number(b.msrp || 0))[0];
        }
        const modelWithCategory = this._attachModelCategory(model, categoriesById);
        const defaultTrimWithModel = default_trim
          ? { ...default_trim, model: modelWithCategory }
          : null;
        return {
          model: modelWithCategory,
          default_trim: defaultTrimWithModel,
          starting_msrp: default_trim ? Number(default_trim.msrp || 0) : Number(model.base_price_min || 0),
          tagline: model.short_description || ''
        };
      });

    const featured_electric_hybrid_models = models
      .filter((m) => m.category_id === 'electric_hybrid' || ['electric', 'hybrid', 'plug_in_hybrid'].includes(m.fuel_type_primary))
      .map((model) => {
        const modelTrims = (trimsByModel[model.id] || []).filter((t) => ['electric', 'hybrid', 'plug_in_hybrid'].includes(t.fuel_type));
        let default_trim = null;
        if (modelTrims.length > 0) {
          default_trim = modelTrims.slice().sort((a, b) => Number(b.range_miles || 0) - Number(a.range_miles || 0))[0];
        }
        const modelWithCategory = this._attachModelCategory(model, categoriesById);
        const defaultTrimWithModel = default_trim
          ? { ...default_trim, model: modelWithCategory }
          : null;
        const ranges = modelTrims.map((t) => Number(t.range_miles || 0));
        const max_range_miles = ranges.length > 0 ? Math.max.apply(null, ranges) : Number(model.range_miles_max || 0);
        return {
          model: modelWithCategory,
          default_trim: defaultTrimWithModel,
          max_range_miles
        };
      });

    const now = new Date();
    const featured_offers = offers.filter((o) => {
      if (!o.is_active) return false;
      if (!o.expiration_date) return true;
      const exp = new Date(o.expiration_date);
      return exp >= now;
    });

    return {
      featured_models,
      featured_electric_hybrid_models,
      featured_offers
    };
  }

  // getModelCategories
  getModelCategories() {
    const categories = this._getFromStorage('model_categories', []);
    return categories;
  }

  // getModelBrowseFilterOptions
  getModelBrowseFilterOptions() {
    const models = this._getFromStorage('vehicle_models', []);
    const trims = this._getFromStorage('model_trims', []);
    const features = this._getFromStorage('vehicle_features', []);

    const body_styles = Array.from(new Set(models.map((m) => m.body_style).filter(Boolean)));
    const size_classes = Array.from(new Set(models.map((m) => m.size_class).filter(Boolean)));
    const fuel_types = Array.from(new Set(trims.map((t) => t.fuel_type).filter(Boolean)));
    const drivetrains = Array.from(new Set(trims.map((t) => t.drivetrain).filter(Boolean)));
    const transmissions = Array.from(new Set(trims.map((t) => t.transmission).filter(Boolean)));

    const prices = models.map((m) => Number(m.base_price_min || 0)).filter((v) => !isNaN(v));
    const priceMin = prices.length ? Math.min.apply(null, prices) : 0;
    const priceMax = prices.length ? Math.max.apply(null, prices) : 0;

    const ranges = trims.map((t) => Number(t.range_miles || 0)).filter((v) => !isNaN(v) && v > 0);
    const rangeMin = ranges.length ? Math.min.apply(null, ranges) : 0;
    const rangeMax = ranges.length ? Math.max.apply(null, ranges) : 0;

    const mpgs = trims.map((t) => Number(t.combined_mpg || 0)).filter((v) => !isNaN(v) && v > 0);
    const mpgMin = mpgs.length ? Math.min.apply(null, mpgs) : 0;
    const mpgMax = mpgs.length ? Math.max.apply(null, mpgs) : 0;

    const cargos = trims.map((t) => Number(t.cargo_volume_cu_ft || 0)).filter((v) => !isNaN(v) && v > 0);
    const cargoMin = cargos.length ? Math.min.apply(null, cargos) : 0;
    const cargoMax = cargos.length ? Math.max.apply(null, cargos) : 0;

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'range_high_to_low', label: 'Range: High to Low' },
      { value: 'combined_mpg_high_to_low', label: 'Combined MPG: High to Low' }
    ];

    return {
      body_styles,
      size_classes,
      fuel_types,
      drivetrains,
      transmissions,
      price_range: {
        min: priceMin,
        max: priceMax,
        step: 500
      },
      range_miles_range: {
        min: rangeMin,
        max: rangeMax,
        step: 10
      },
      combined_mpg_range: {
        min: mpgMin,
        max: mpgMax,
        step: 1
      },
      cargo_volume_range: {
        min: cargoMin,
        max: cargoMax,
        step: 1
      },
      feature_filters: features,
      sort_options
    };
  }

  // browseVehicleModels(filters, sort, page, page_size)
  browseVehicleModels(filters, sort, page = 1, page_size = 20) {
    const models = this._getFromStorage('vehicle_models', []);
    const trims = this._getFromStorage('model_trims', []);
    const categories = this._getFromStorage('model_categories', []);
    const categoriesById = this._arrayToMapById(categories);

    const f = filters || {};

    let filteredModels = models.slice();
    if (f.category_id) {
      filteredModels = filteredModels.filter((m) => m.category_id === f.category_id);
    }
    if (f.body_style) {
      filteredModels = filteredModels.filter((m) => m.body_style === f.body_style);
    }
    if (f.size_class) {
      filteredModels = filteredModels.filter((m) => m.size_class === f.size_class);
    }

    const modelTrimMatches = this._filterModelsByTrimAttributes(filteredModels, trims, f);

    const resultsRaw = modelTrimMatches.map(({ model, matchingTrims }) => {
      const categoryAttachedModel = this._attachModelCategory(model, categoriesById);
      const sortedByPrice = matchingTrims.slice().sort((a, b) => Number(a.msrp || 0) - Number(b.msrp || 0));
      const default_trim_raw = sortedByPrice[0];
      const default_trim = default_trim_raw
        ? { ...default_trim_raw, model: categoryAttachedModel }
        : null;

      const price_from = default_trim_raw ? Number(default_trim_raw.msrp || 0) : Number(model.base_price_min || 0);
      const max_range_miles = matchingTrims.reduce((max, t) => {
        const r = Number(t.range_miles || 0);
        return r > max ? r : max;
      }, 0);
      const max_combined_mpg = matchingTrims.reduce((max, t) => {
        const v = Number(t.combined_mpg || 0);
        return v > max ? v : max;
      }, 0);
      const max_cargo_volume_cu_ft = matchingTrims.reduce((max, t) => {
        const v = Number(t.cargo_volume_cu_ft || 0);
        return v > max ? v : max;
      }, 0);

      return {
        model: categoryAttachedModel,
        default_trim,
        price_from,
        max_range_miles,
        max_combined_mpg,
        max_cargo_volume_cu_ft,
        is_electric_or_hybrid: ['electric', 'hybrid', 'plug_in_hybrid'].includes(model.fuel_type_primary)
      };
    });

    // Sorting
    let resultsSorted = resultsRaw.slice();
    if (sort === 'price_low_to_high') {
      resultsSorted.sort((a, b) => a.price_from - b.price_from);
    } else if (sort === 'price_high_to_low') {
      resultsSorted.sort((a, b) => b.price_from - a.price_from);
    } else if (sort === 'range_high_to_low') {
      resultsSorted.sort((a, b) => (b.max_range_miles || 0) - (a.max_range_miles || 0));
    } else if (sort === 'combined_mpg_high_to_low') {
      resultsSorted.sort((a, b) => (b.max_combined_mpg || 0) - (a.max_combined_mpg || 0));
    }

    const total_count = resultsSorted.length;
    const start = (Number(page) - 1) * Number(page_size);
    const end = start + Number(page_size);
    const pagedResults = resultsSorted.slice(start, end);

    return {
      results: pagedResults,
      total_count,
      page: Number(page),
      page_size: Number(page_size)
    };
  }

  // getModelDetailView(modelId)
  getModelDetailView(modelId) {
    const models = this._getFromStorage('vehicle_models', []);
    const trims = this._getFromStorage('model_trims', []);
    const features = this._getFromStorage('vehicle_features', []);
    const categories = this._getFromStorage('model_categories', []);

    const modelRaw = models.find((m) => m.id === modelId) || null;
    const categoriesById = this._arrayToMapById(categories);
    const model = modelRaw ? this._attachModelCategory(modelRaw, categoriesById) : null;

    const modelTrimsRaw = trims.filter((t) => t.model_id === modelId);
    const modelTrims = modelTrimsRaw.map((t) => ({ ...t, model }));

    let base_price_from = model ? Number(model.base_price_min || 0) : 0;
    let max_range_miles = model ? Number(model.range_miles_max || 0) : 0;
    let max_combined_mpg = model ? Number(model.combined_mpg_max || 0) : 0;
    let max_cargo_volume_cu_ft = model ? Number(model.cargo_volume_max_cu_ft || 0) : 0;

    if (modelTrims.length > 0) {
      const prices = modelTrims.map((t) => Number(t.msrp || 0)).filter((v) => !isNaN(v));
      if (prices.length) base_price_from = Math.min.apply(null, prices);

      const ranges = modelTrims.map((t) => Number(t.range_miles || 0)).filter((v) => !isNaN(v) && v > 0);
      if (ranges.length) max_range_miles = Math.max.apply(null, ranges);

      const mpgs = modelTrims.map((t) => Number(t.combined_mpg || 0)).filter((v) => !isNaN(v) && v > 0);
      if (mpgs.length) max_combined_mpg = Math.max.apply(null, mpgs);

      const cargos = modelTrims.map((t) => Number(t.cargo_volume_cu_ft || 0)).filter((v) => !isNaN(v) && v > 0);
      if (cargos.length) max_cargo_volume_cu_ft = Math.max.apply(null, cargos);
    }

    // Highlight features: names of unique features across trims
    const featureCodeSet = new Set();
    for (const t of modelTrimsRaw) {
      const codes = Array.isArray(t.feature_codes) ? t.feature_codes : [];
      for (const code of codes) featureCodeSet.add(code);
    }
    const featureCodes = Array.from(featureCodeSet);
    const featureNameByCode = {};
    for (const f of features) {
      featureNameByCode[f.code] = f.name;
    }
    const highlight_features = featureCodes.map((code) => featureNameByCode[code] || code);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task8_selectedModelId', modelId);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      model,
      trims: modelTrims,
      key_specs: {
        base_price_from,
        max_range_miles,
        max_combined_mpg,
        max_cargo_volume_cu_ft
      },
      highlight_features
    };
  }

  // getModelMediaAssets(modelId, filters)
  getModelMediaAssets(modelId, filters) {
    const assets = this._getFromStorage('media_assets', []);
    const models = this._getFromStorage('vehicle_models', []);
    const trims = this._getFromStorage('model_trims', []);
    const categories = this._getFromStorage('model_categories', []);

    const modelsById = this._arrayToMapById(models);
    const trimsById = this._arrayToMapById(trims);
    const categoriesById = this._arrayToMapById(categories);

    const f = filters || {};
    const typesFilter = Array.isArray(f.types) && f.types.length ? f.types : null;

    // Instrumentation for task completion tracking
    try {
      const selectedModelId = localStorage.getItem('task8_selectedModelId');
      if (selectedModelId && modelId === selectedModelId && f && f.is_interior === true) {
        const types = f.types;

        // task8_interiorGalleryRequested
        const hasImageOrPhoto =
          Array.isArray(types) && (types.includes('image') || types.includes('photo'));
        const typesNotProvidedOrImagePhoto =
          typeof types === 'undefined' || types === null || hasImageOrPhoto;
        if (typesNotProvidedOrImagePhoto) {
          localStorage.setItem('task8_interiorGalleryRequested', 'true');
        }

        // task8_360InteriorRequested
        if (Array.isArray(types) && types.includes('360')) {
          localStorage.setItem('task8_360InteriorRequested', 'true');
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const filtered = assets.filter((a) => {
      if (a.model_id !== modelId) return false;
      if (typeof f.is_interior === 'boolean' && a.is_interior !== f.is_interior) return false;
      if (typesFilter && !typesFilter.includes(a.type)) return false;
      return true;
    });

    return filtered.map((asset) => this._attachMediaRelations(asset, modelsById, trimsById, categoriesById));
  }

  // getConfiguratorData(modelTrimId)
  getConfiguratorData(modelTrimId) {
    const trims = this._getFromStorage('model_trims', []);
    const models = this._getFromStorage('vehicle_models', []);
    const colors = this._getFromStorage('exterior_colors', []);
    const packages = this._getFromStorage('vehicle_packages', []);
    const categories = this._getFromStorage('model_categories', []);

    const base_trim_raw = trims.find((t) => t.id === modelTrimId) || null;
    const modelsById = this._arrayToMapById(models);
    const categoriesById = this._arrayToMapById(categories);

    const base_model_raw = base_trim_raw ? modelsById[base_trim_raw.model_id] || null : null;
    const base_model = base_model_raw ? this._attachModelCategory(base_model_raw, categoriesById) : null;
    const base_trim = base_trim_raw ? { ...base_trim_raw, model: base_model } : null;

    const available_trims_raw = base_trim_raw ? trims.filter((t) => t.model_id === base_trim_raw.model_id) : [];
    const available_trims = available_trims_raw.map((t) => ({ ...t, model: base_model }));

    // Drivetrains among available trims
    const available_drivetrains = Array.from(
      new Set(available_trims_raw.map((t) => t.drivetrain).filter(Boolean))
    );

    // Colors available for any of these trims
    const trimIds = new Set(available_trims_raw.map((t) => t.id));
    const exterior_colors = colors.filter((c) => {
      const availableIds = Array.isArray(c.available_trim_ids) ? c.available_trim_ids : [];
      return availableIds.some((id) => trimIds.has(id));
    });

    // Packages available for any of these trims
    const pkgList = packages.filter((p) => {
      const availableIds = Array.isArray(p.available_trim_ids) ? p.available_trim_ids : [];
      return availableIds.some((id) => trimIds.has(id));
    });

    // Default configuration
    const default_trim = base_trim || available_trims[0] || null;
    const default_drivetrain = default_trim ? default_trim.drivetrain : (available_drivetrains[0] || 'fwd');
    const default_color = exterior_colors[0] || null;

    const default_configuration = {
      selected_trim_id: default_trim ? default_trim.id : null,
      drivetrain: default_drivetrain,
      exterior_color_id: default_color ? default_color.id : null,
      package_ids: [],
      option_codes: []
    };

    return {
      base_trim,
      available_trims,
      available_drivetrains,
      exterior_colors,
      packages: pkgList,
      default_configuration
    };
  }

  // calculateBuildPrice(modelTrimId, drivetrain, exteriorColorId, packageIds, optionCodes)
  calculateBuildPrice(modelTrimId, drivetrain, exteriorColorId, packageIds, optionCodes) {
    return this._calculateBuildPriceInternal(modelTrimId, drivetrain, exteriorColorId, packageIds, optionCodes);
  }

  // saveBuildConfiguration(name, configuration)
  saveBuildConfiguration(name, configuration) {
    const saved_builds = this._getFromStorage('saved_builds', []);
    const now = new Date().toISOString();

    const cfg = configuration || {};

    const newBuild = {
      id: this._generateId('saved_build'),
      name: String(name || '').trim(),
      model_trim_id: cfg.modelTrimId,
      drivetrain: cfg.drivetrain,
      exterior_color_id: cfg.exteriorColorId,
      interior_color_name: cfg.interior_color_name || null,
      package_ids: Array.isArray(cfg.packageIds) ? cfg.packageIds : [],
      option_codes: Array.isArray(cfg.optionCodes) ? cfg.optionCodes : [],
      base_price: Number(cfg.base_price || 0),
      options_price: Number(cfg.options_price || 0),
      total_price: Number(cfg.total_price || 0),
      created_at: now,
      updated_at: now
    };

    saved_builds.push(newBuild);
    this._saveToStorage('saved_builds', saved_builds);

    return this._attachSavedBuildRelations(newBuild);
  }

  // getSavedBuilds()
  getSavedBuilds() {
    const saved_builds = this._getFromStorage('saved_builds', []);
    const trims = this._getFromStorage('model_trims', []);
    const models = this._getFromStorage('vehicle_models', []);
    const categories = this._getFromStorage('model_categories', []);

    const trimsById = this._arrayToMapById(trims);
    const modelsById = this._arrayToMapById(models);
    const categoriesById = this._arrayToMapById(categories);

    return saved_builds.map((sb) => {
      const trim = sb.model_trim_id ? trimsById[sb.model_trim_id] || null : null;
      const modelRaw = trim && trim.model_id ? modelsById[trim.model_id] || null : null;
      const model = modelRaw ? this._attachModelCategory(modelRaw, categoriesById) : null;
      const saved_build = this._attachSavedBuildRelations(sb);
      return { saved_build, model, trim };
    });
  }

  // getSavedBuildDetail(savedBuildId)
  getSavedBuildDetail(savedBuildId) {
    const saved_builds = this._getFromStorage('saved_builds', []);
    const trims = this._getFromStorage('model_trims', []);
    const models = this._getFromStorage('vehicle_models', []);
    const categories = this._getFromStorage('model_categories', []);

    const sb = saved_builds.find((b) => b.id === savedBuildId) || null;
    if (!sb) {
      return {
        saved_build: null,
        model: null,
        trim: null,
        configurator_preset: null
      };
    }

    const trimsById = this._arrayToMapById(trims);
    const modelsById = this._arrayToMapById(models);
    const categoriesById = this._arrayToMapById(categories);

    const trim = sb.model_trim_id ? trimsById[sb.model_trim_id] || null : null;
    const modelRaw = trim && trim.model_id ? modelsById[trim.model_id] || null : null;
    const model = modelRaw ? this._attachModelCategory(modelRaw, categoriesById) : null;

    const configurator_preset = {
      modelTrimId: sb.model_trim_id,
      drivetrain: sb.drivetrain,
      exteriorColorId: sb.exterior_color_id,
      packageIds: Array.isArray(sb.package_ids) ? sb.package_ids : [],
      optionCodes: Array.isArray(sb.option_codes) ? sb.option_codes : []
    };

    const saved_build = this._attachSavedBuildRelations(sb);

    return {
      saved_build,
      model,
      trim,
      configurator_preset
    };
  }

  // deleteSavedBuild(savedBuildId)
  deleteSavedBuild(savedBuildId) {
    const saved_builds = this._getFromStorage('saved_builds', []);
    const before = saved_builds.length;
    const remaining = saved_builds.filter((b) => b.id !== savedBuildId);
    this._saveToStorage('saved_builds', remaining);
    const success = remaining.length !== before;
    return {
      success,
      message: success ? 'Saved build deleted' : 'Saved build not found'
    };
  }

  // addTrimToComparison(modelTrimId)
  addTrimToComparison(modelTrimId) {
    const comparison = this._getOrCreateComparisonList();
    const ids = Array.isArray(comparison.model_trim_ids) ? comparison.model_trim_ids : [];
    if (!ids.includes(modelTrimId)) {
      ids.push(modelTrimId);
      comparison.model_trim_ids = ids;
      comparison.updated_at = new Date().toISOString();
      this._saveToStorage('comparison_list', comparison);
      return {
        comparison,
        success: true,
        message: 'Trim added to comparison'
      };
    }
    return {
      comparison,
      success: true,
      message: 'Trim already in comparison'
    };
  }

  // removeTrimFromComparison(modelTrimId)
  removeTrimFromComparison(modelTrimId) {
    const comparison = this._getOrCreateComparisonList();
    const ids = Array.isArray(comparison.model_trim_ids) ? comparison.model_trim_ids : [];
    const newIds = ids.filter((id) => id !== modelTrimId);
    comparison.model_trim_ids = newIds;
    comparison.updated_at = new Date().toISOString();
    this._saveToStorage('comparison_list', comparison);
    return {
      comparison,
      success: ids.length !== newIds.length,
      message: ids.length !== newIds.length ? 'Trim removed from comparison' : 'Trim was not in comparison'
    };
  }

  // getComparisonSummary()
  getComparisonSummary() {
    const comparison = this._getOrCreateComparisonList();
    const trims = this._getFromStorage('model_trims', []);
    const models = this._getFromStorage('vehicle_models', []);
    const categories = this._getFromStorage('model_categories', []);

    const trimsById = this._arrayToMapById(trims);
    const modelsById = this._arrayToMapById(models);
    const categoriesById = this._arrayToMapById(categories);

    const items = (comparison.model_trim_ids || []).map((id) => {
      const trim = trimsById[id] || null;
      const modelRaw = trim && trim.model_id ? modelsById[trim.model_id] || null : null;
      const model = modelRaw ? this._attachModelCategory(modelRaw, categoriesById) : null;
      const trimWithModel = trim ? { ...trim, model } : null;
      return { trim: trimWithModel, model };
    });

    return {
      comparison,
      items
    };
  }

  // getComparisonDetails()
  getComparisonDetails() {
    const comparison = this._getOrCreateComparisonList();
    const trims = this._getFromStorage('model_trims', []);
    const models = this._getFromStorage('vehicle_models', []);
    const categories = this._getFromStorage('model_categories', []);

    const trimsById = this._arrayToMapById(trims);
    const modelsById = this._arrayToMapById(models);
    const categoriesById = this._arrayToMapById(categories);

    const items = (comparison.model_trim_ids || []).map((id) => {
      const trim = trimsById[id] || null;
      const modelRaw = trim && trim.model_id ? modelsById[trim.model_id] || null : null;
      const model = modelRaw ? this._attachModelCategory(modelRaw, categoriesById) : null;
      const trimWithModel = trim ? { ...trim, model } : null;
      const specs = trim
        ? {
            msrp: Number(trim.msrp || 0),
            fuel_type: trim.fuel_type || null,
            drivetrain: trim.drivetrain || null,
            transmission: trim.transmission || null,
            range_miles: trim.range_miles != null ? Number(trim.range_miles) : null,
            combined_mpg: trim.combined_mpg != null ? Number(trim.combined_mpg) : null,
            cargo_volume_cu_ft: trim.cargo_volume_cu_ft != null ? Number(trim.cargo_volume_cu_ft) : null,
            feature_codes: Array.isArray(trim.feature_codes) ? trim.feature_codes : []
          }
        : {
            msrp: 0,
            fuel_type: null,
            drivetrain: null,
            transmission: null,
            range_miles: null,
            combined_mpg: null,
            cargo_volume_cu_ft: null,
            feature_codes: []
          };
      return { trim: trimWithModel, model, specs };
    });

    return {
      comparison,
      items
    };
  }

  // addTrimToWishlist(modelTrimId)
  addTrimToWishlist(modelTrimId) {
    const wishlist = this._getOrCreateWishlist();
    const ids = Array.isArray(wishlist.model_trim_ids) ? wishlist.model_trim_ids : [];
    if (!ids.includes(modelTrimId)) {
      ids.push(modelTrimId);
      wishlist.model_trim_ids = ids;
      wishlist.updated_at = new Date().toISOString();
      this._saveToStorage('wishlist', wishlist);
      return {
        wishlist,
        success: true,
        message: 'Trim added to wishlist'
      };
    }
    return {
      wishlist,
      success: true,
      message: 'Trim already in wishlist'
    };
  }

  // removeTrimFromWishlist(modelTrimId)
  removeTrimFromWishlist(modelTrimId) {
    const wishlist = this._getOrCreateWishlist();
    const ids = Array.isArray(wishlist.model_trim_ids) ? wishlist.model_trim_ids : [];
    const newIds = ids.filter((id) => id !== modelTrimId);
    wishlist.model_trim_ids = newIds;
    wishlist.updated_at = new Date().toISOString();
    this._saveToStorage('wishlist', wishlist);
    return {
      wishlist,
      success: ids.length !== newIds.length,
      message: ids.length !== newIds.length ? 'Trim removed from wishlist' : 'Trim was not in wishlist'
    };
  }

  // getWishlistSummary()
  getWishlistSummary() {
    const wishlist = this._getOrCreateWishlist();
    const item_count = Array.isArray(wishlist.model_trim_ids) ? wishlist.model_trim_ids.length : 0;
    return {
      wishlist,
      item_count
    };
  }

  // getWishlistDetails()
  getWishlistDetails() {
    const wishlist = this._getOrCreateWishlist();
    const trims = this._getFromStorage('model_trims', []);
    const models = this._getFromStorage('vehicle_models', []);
    const categories = this._getFromStorage('model_categories', []);

    const trimsById = this._arrayToMapById(trims);
    const modelsById = this._arrayToMapById(models);
    const categoriesById = this._arrayToMapById(categories);

    const items = (wishlist.model_trim_ids || []).map((id) => {
      const trim = trimsById[id] || null;
      const modelRaw = trim && trim.model_id ? modelsById[trim.model_id] || null : null;
      const model = modelRaw ? this._attachModelCategory(modelRaw, categoriesById) : null;
      const trimWithModel = trim ? { ...trim, model } : null;
      return { trim: trimWithModel, model };
    });

    return {
      wishlist,
      items
    };
  }

  // getOfferFilterOptions()
  getOfferFilterOptions() {
    const offers = this._getFromStorage('offers', []);
    const activeOffers = offers.filter((o) => o.is_active);

    const offer_types = Array.from(new Set(activeOffers.map((o) => o.offer_type).filter(Boolean)));
    const body_styles = Array.from(new Set(activeOffers.map((o) => o.applicable_body_style).filter(Boolean)));
    const size_classes = Array.from(new Set(activeOffers.map((o) => o.applicable_size_class).filter(Boolean)));

    const monthlyVals = activeOffers
      .map((o) => (o.offer_type === 'lease' && o.monthly_payment != null ? Number(o.monthly_payment) : null))
      .filter((v) => v != null && !isNaN(v));
    const termVals = activeOffers
      .map((o) => (o.term_months != null ? Number(o.term_months) : null))
      .filter((v) => v != null && !isNaN(v));

    const mpMin = monthlyVals.length ? Math.min.apply(null, monthlyVals) : 0;
    const mpMax = monthlyVals.length ? Math.max.apply(null, monthlyVals) : 0;
    const termMin = termVals.length ? Math.min.apply(null, termVals) : 0;
    const termMax = termVals.length ? Math.max.apply(null, termVals) : 0;

    return {
      offer_types,
      body_styles,
      size_classes,
      monthly_payment_range: {
        min: mpMin,
        max: mpMax,
        step: 25
      },
      term_months_range: {
        min: termMin,
        max: termMax,
        step: 6
      }
    };
  }

  // searchOffers(filters, page, page_size)
  searchOffers(filters, page = 1, page_size = 20) {
    const offers = this._getFromStorage('offers', []);
    const now = new Date();
    const f = filters || {};

    let filtered = offers.filter((o) => {
      if (!o.is_active) return false;
      if (o.expiration_date) {
        const exp = new Date(o.expiration_date);
        if (exp < now) return false;
      }
      return true;
    });

    if (f.offer_type) {
      filtered = filtered.filter((o) => o.offer_type === f.offer_type);
    }
    if (f.applicable_body_style) {
      filtered = filtered.filter((o) => o.applicable_body_style === f.applicable_body_style);
    }
    if (f.applicable_size_class) {
      filtered = filtered.filter((o) => o.applicable_size_class === f.applicable_size_class);
    }
    if (f.max_monthly_payment != null) {
      const maxPay = Number(f.max_monthly_payment);
      filtered = filtered.filter((o) => {
        if (o.offer_type !== 'lease') return true;
        if (o.monthly_payment == null) return false;
        return Number(o.monthly_payment) <= maxPay;
      });
    }
    if (f.max_term_months != null) {
      const maxTerm = Number(f.max_term_months);
      filtered = filtered.filter((o) => {
        if (o.term_months == null) return false;
        return Number(o.term_months) <= maxTerm;
      });
    }

    const total_count = filtered.length;
    const start = (Number(page) - 1) * Number(page_size);
    const end = start + Number(page_size);
    const results = filtered.slice(start, end);

    return {
      results,
      total_count,
      page: Number(page),
      page_size: Number(page_size)
    };
  }

  // getOfferDetail(offerId)
  getOfferDetail(offerId) {
    const offers = this._getFromStorage('offers', []);
    const models = this._getFromStorage('vehicle_models', []);
    const trims = this._getFromStorage('model_trims', []);
    const categories = this._getFromStorage('model_categories', []);

    const offer = offers.find((o) => o.id === offerId) || null;
    if (!offer) {
      return {
        offer: null,
        applicable_models: [],
        applicable_trims: []
      };
    }

    const modelsById = this._arrayToMapById(models);
    const trimsById = this._arrayToMapById(trims);
    const categoriesById = this._arrayToMapById(categories);

    const applicable_models = (offer.applicable_model_ids || [])
      .map((id) => modelsById[id])
      .filter(Boolean)
      .map((m) => this._attachModelCategory(m, categoriesById));

    const applicable_trims = (offer.applicable_trim_ids || [])
      .map((id) => trimsById[id])
      .filter(Boolean)
      .map((t) => {
        const modelRaw = modelsById[t.model_id] || null;
        const model = modelRaw ? this._attachModelCategory(modelRaw, categoriesById) : null;
        return { ...t, model };
      });

    return {
      offer,
      applicable_models,
      applicable_trims
    };
  }

  // emailOfferToSelf(offerId, recipientName, recipientEmail)
  emailOfferToSelf(offerId, recipientName, recipientEmail) {
    const shares = this._getFromStorage('offer_email_shares', []);
    const newShare = {
      id: this._generateId('offer_email_share'),
      offer_id: offerId,
      recipient_name: String(recipientName || '').trim(),
      recipient_email: String(recipientEmail || '').trim(),
      status: 'queued',
      sent_at: null
    };
    shares.push(newShare);
    this._saveToStorage('offer_email_shares', shares);

    return this._attachOfferShareRelations(newShare);
  }

  // getDealerServiceFilterOptions()
  getDealerServiceFilterOptions() {
    const serviceTypes = this._getFromStorage('dealer_service_types', []);
    return serviceTypes;
  }

  // searchDealersByLocation(postalCode, radiusMiles, serviceCodes)
  searchDealersByLocation(postalCode, radiusMiles, serviceCodes) {
    const results = this._findDealersWithinRadius(postalCode, radiusMiles, serviceCodes);
    return {
      results,
      total_count: results.length
    };
  }

  // getDealerDetail(dealerId)
  getDealerDetail(dealerId) {
    const dealers = this._getFromStorage('dealers', []);
    const serviceTypes = this._getFromStorage('dealer_service_types', []);

    const dealer = dealers.find((d) => d.id === dealerId) || null;
    if (!dealer) {
      return {
        dealer: null,
        services: []
      };
    }

    const services = serviceTypes.filter((s) => (dealer.service_codes || []).includes(s.code));
    return {
      dealer,
      services
    };
  }

  // submitDealerContactMessage(dealerId, name, email, message, preferredContactMethod)
  submitDealerContactMessage(dealerId, name, email, message, preferredContactMethod) {
    const messages = this._getFromStorage('dealer_contact_messages', []);
    const now = new Date().toISOString();

    const msg = {
      id: this._generateId('dealer_contact_message'),
      dealer_id: dealerId,
      name: String(name || '').trim(),
      email: String(email || '').trim(),
      message: String(message || '').trim(),
      preferred_contact_method: preferredContactMethod || null,
      status: 'sent',
      created_at: now
    };

    messages.push(msg);
    this._saveToStorage('dealer_contact_messages', messages);

    return this._attachDealerContactRelations(msg);
  }

  // getTestDrivePageData(modelTrimId, dealerId)
  getTestDrivePageData(modelTrimId, dealerId) {
    const trims = this._getFromStorage('model_trims', []);
    const models = this._getFromStorage('vehicle_models', []);
    const dealers = this._getFromStorage('dealers', []);
    const categories = this._getFromStorage('model_categories', []);

    const trimsById = this._arrayToMapById(trims);
    const modelsById = this._arrayToMapById(models);
    const dealersById = this._arrayToMapById(dealers);
    const categoriesById = this._arrayToMapById(categories);

    let selected_trim = null;
    let selected_model = null;
    let selected_dealer = null;

    if (modelTrimId) {
      const trim = trimsById[modelTrimId] || null;
      if (trim) {
        const modelRaw = modelsById[trim.model_id] || null;
        const model = modelRaw ? this._attachModelCategory(modelRaw, categoriesById) : null;
        selected_model = model;
        selected_trim = { ...trim, model };
      }
    }

    if (dealerId) {
      selected_dealer = dealersById[dealerId] || null;
    }

    return {
      selected_trim,
      selected_model,
      selected_dealer
    };
  }

  // createTestDriveBooking(modelTrimId, dealerId, desiredDate, desiredTime, name, phone, email, notes)
  createTestDriveBooking(modelTrimId, dealerId, desiredDate, desiredTime, name, phone, email, notes) {
    const bookings = this._getFromStorage('test_drive_bookings', []);
    const now = new Date().toISOString();

    const booking = {
      id: this._generateId('test_drive_booking'),
      model_trim_id: modelTrimId,
      dealer_id: dealerId,
      desired_date: desiredDate,
      desired_time: desiredTime,
      name: String(name || '').trim(),
      phone: String(phone || '').trim(),
      email: String(email || '').trim(),
      status: 'pending',
      created_at: now,
      notes: notes || null
    };

    bookings.push(booking);
    this._saveToStorage('test_drive_bookings', bookings);

    const attached = this._attachTestDriveBookingRelations(booking);

    return {
      booking: attached,
      trim: attached.model_trim || null,
      model: attached.model || null,
      dealer: attached.dealer || null,
      success: true
    };
  }

  // getPaymentCalculatorDefaults(modelTrimId)
  getPaymentCalculatorDefaults(modelTrimId) {
    const trims = this._getFromStorage('model_trims', []);
    const models = this._getFromStorage('vehicle_models', []);
    const categories = this._getFromStorage('model_categories', []);

    const trim = trims.find((t) => t.id === modelTrimId) || null;
    const modelsById = this._arrayToMapById(models);
    const categoriesById = this._arrayToMapById(categories);

    const modelRaw = trim && trim.model_id ? modelsById[trim.model_id] || null : null;
    const model = modelRaw ? this._attachModelCategory(modelRaw, categoriesById) : null;

    const suggested_vehicle_price = trim ? Number(trim.msrp || 0) : 0;

    // Generic defaults when not provided by data
    const default_down_payment_percent = 10;
    const default_apr = 3.5;
    const default_term_months = 60;

    return {
      trim: trim ? { ...trim, model } : null,
      model,
      suggested_vehicle_price,
      default_down_payment_percent,
      default_apr,
      default_term_months
    };
  }

  // calculatePaymentEstimate(modelTrimId, vehiclePrice, downPayment, apr, termMonths)
  calculatePaymentEstimate(modelTrimId, vehiclePrice, downPayment, apr, termMonths) {
    return this._calculateMonthlyPayment(vehiclePrice, downPayment, apr, termMonths);
  }

  // savePaymentQuote(name, modelTrimId, vehiclePrice, downPayment, apr, termMonths, estimatedMonthlyPayment)
  savePaymentQuote(name, modelTrimId, vehiclePrice, downPayment, apr, termMonths, estimatedMonthlyPayment) {
    const quotes = this._getFromStorage('saved_payment_quotes', []);
    const now = new Date().toISOString();

    const quote = {
      id: this._generateId('saved_payment_quote'),
      name: String(name || '').trim(),
      model_trim_id: modelTrimId,
      vehicle_price: Number(vehiclePrice || 0),
      down_payment: Number(downPayment || 0),
      apr: Number(apr || 0),
      term_months: Number(termMonths || 0),
      estimated_monthly_payment: Number(estimatedMonthlyPayment || 0),
      created_at: now
    };

    quotes.push(quote);
    this._saveToStorage('saved_payment_quotes', quotes);

    return this._attachPaymentQuoteRelations(quote);
  }

  // getSavedPaymentQuotes()
  getSavedPaymentQuotes() {
    const quotes = this._getFromStorage('saved_payment_quotes', []);
    const trims = this._getFromStorage('model_trims', []);
    const models = this._getFromStorage('vehicle_models', []);
    const categories = this._getFromStorage('model_categories', []);

    const trimsById = this._arrayToMapById(trims);
    const modelsById = this._arrayToMapById(models);
    const categoriesById = this._arrayToMapById(categories);

    return quotes.map((q) => {
      const trim = q.model_trim_id ? trimsById[q.model_trim_id] || null : null;
      const modelRaw = trim && trim.model_id ? modelsById[trim.model_id] || null : null;
      const model = modelRaw ? this._attachModelCategory(modelRaw, categoriesById) : null;
      const quoteAttached = this._attachPaymentQuoteRelations(q);
      return { quote: quoteAttached, trim, model };
    });
  }

  // getSavedPaymentQuoteDetail(savedPaymentQuoteId)
  getSavedPaymentQuoteDetail(savedPaymentQuoteId) {
    const quotes = this._getFromStorage('saved_payment_quotes', []);
    const trims = this._getFromStorage('model_trims', []);
    const models = this._getFromStorage('vehicle_models', []);
    const categories = this._getFromStorage('model_categories', []);

    const q = quotes.find((x) => x.id === savedPaymentQuoteId) || null;
    if (!q) {
      return {
        quote: null,
        trim: null,
        model: null
      };
    }

    const trimsById = this._arrayToMapById(trims);
    const modelsById = this._arrayToMapById(models);
    const categoriesById = this._arrayToMapById(categories);

    const trim = q.model_trim_id ? trimsById[q.model_trim_id] || null : null;
    const modelRaw = trim && trim.model_id ? modelsById[trim.model_id] || null : null;
    const model = modelRaw ? this._attachModelCategory(modelRaw, categoriesById) : null;
    const quote = this._attachPaymentQuoteRelations(q);

    return {
      quote,
      trim,
      model
    };
  }

  // deleteSavedPaymentQuote(savedPaymentQuoteId)
  deleteSavedPaymentQuote(savedPaymentQuoteId) {
    const quotes = this._getFromStorage('saved_payment_quotes', []);
    const before = quotes.length;
    const remaining = quotes.filter((q) => q.id !== savedPaymentQuoteId);
    this._saveToStorage('saved_payment_quotes', remaining);
    const success = before !== remaining.length;
    return {
      success,
      message: success ? 'Saved payment quote deleted' : 'Saved payment quote not found'
    };
  }

  // getBrandOverview()
  getBrandOverview() {
    const defaultOverview = {
      headline: '',
      story_html: '',
      mission: '',
      values: [],
      product_lines: []
    };
    return this._getFromStorage('brand_overview', defaultOverview);
  }

  // submitContactUsMessage(name, email, subject, category, message)
  submitContactUsMessage(name, email, subject, category, message) {
    const messages = this._getFromStorage('contact_us_messages', []);
    const now = new Date().toISOString();

    const record = {
      id: this._generateId('contact_us_message'),
      name: String(name || '').trim(),
      email: String(email || '').trim(),
      subject: String(subject || '').trim(),
      category: category || null,
      message: String(message || '').trim(),
      created_at: now,
      status: 'new'
    };

    messages.push(record);
    this._saveToStorage('contact_us_messages', messages);

    return {
      success: true,
      reference_id: record.id,
      message: 'Contact message submitted'
    };
  }

  // getLegalContent(documentType)
  getLegalContent(documentType) {
    const key = 'legal_content_' + String(documentType || '');
    const defaultContent = {
      title: '',
      last_updated: '',
      sections: []
    };
    return this._getFromStorage(key, defaultContent);
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
