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

          // =========================
          // Storage helpers
          // =========================

          _initStorage() {
            const keys = [
              'boats',
              'policy_types',
              'coverage_features',
              'policy_type_features',
              'insurance_plans',
              'optional_coverages',
              'quotes',
              'quote_optional_coverages',
              'policies',
              'policy_documents',
              'discounts',
              'claims',
              'agents',
              'agent_consultation_requests',
              'help_articles'
            ];

            for (let i = 0; i < keys.length; i++) {
              const key = keys[i];
              if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify([]));
              }
            }

            if (!localStorage.getItem('idCounter')) {
              localStorage.setItem('idCounter', '1000');
            }
            if (!localStorage.getItem('activeQuoteId')) {
              localStorage.setItem('activeQuoteId', '');
            }
            if (!localStorage.getItem('activeClaimId')) {
              localStorage.setItem('activeClaimId', '');
            }
            if (!localStorage.getItem('currentUserUsername')) {
              localStorage.setItem('currentUserUsername', '');
            }
          }

          _getFromStorage(key, defaultValue) {
            const data = localStorage.getItem(key);
            if (!data) {
              if (typeof defaultValue === 'undefined') {
                return [];
              }
              // Return deep copy of defaultValue to avoid external mutation
              return JSON.parse(JSON.stringify(defaultValue));
            }
            try {
              return JSON.parse(data);
            } catch (e) {
              return typeof defaultValue === 'undefined' ? [] : JSON.parse(JSON.stringify(defaultValue));
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

          // =========================
          // Session helpers
          // =========================

          _setActiveQuoteId(quoteId) {
            localStorage.setItem('activeQuoteId', quoteId || '');
          }

          _getActiveQuoteId() {
            return localStorage.getItem('activeQuoteId') || '';
          }

          _getActiveQuote() {
            const quotes = this._getFromStorage('quotes');
            const activeId = this._getActiveQuoteId();
            if (!activeId) return null;
            const quote = quotes.find(function (q) { return q.id === activeId; }) || null;
            return quote || null;
          }

          _setActiveClaimId(claimId) {
            localStorage.setItem('activeClaimId', claimId || '');
          }

          _getActiveClaimId() {
            return localStorage.getItem('activeClaimId') || '';
          }

          _getCurrentUserUsername() {
            return localStorage.getItem('currentUserUsername') || '';
          }

          _setCurrentUserUsername(username) {
            localStorage.setItem('currentUserUsername', username || '');
          }

          // =========================
          // Domain helpers (private)
          // =========================

          _createNewQuote(entrySource, policyTypeId, preselectedDiscountCodes) {
            const boats = this._getFromStorage('boats');
            const discounts = this._getFromStorage('discounts');
            const now = new Date().toISOString();

            const boatId = this._generateId('boat');
            const boat = {
              id: boatId,
              type: 'other',
              lengthFeet: 0,
              value: 0,
              primaryZip: '',
              usage: 'pleasure_personal_use_only',
              year: null,
              make: '',
              model: '',
              hullMaterial: null
            };
            boats.push(boat);
            this._saveToStorage('boats', boats);

            let appliedDiscountIds = [];
            if (Array.isArray(preselectedDiscountCodes) && preselectedDiscountCodes.length > 0 && discounts.length > 0) {
              for (let i = 0; i < preselectedDiscountCodes.length; i++) {
                const code = preselectedDiscountCodes[i];
                const disc = discounts.find(function (d) { return d.code === code; });
                if (disc) {
                  appliedDiscountIds.push(disc.id);
                }
              }
            }

            const quoteId = this._generateId('quote');
            const quoteNumber = 'Q-' + quoteId;

            const quote = {
              id: quoteId,
              quoteNumber: quoteNumber,
              createdAt: now,
              updatedAt: now,
              entrySource: entrySource,
              status: 'in_progress',
              boatId: boatId,
              policyTypeId: policyTypeId || null,
              primaryZip: '',
              boatValue: 0,
              boatLengthFeet: 0,
              boatType: 'other',
              usage: 'pleasure_personal_use_only',
              liabilityLimit: 300000,
              deductible: 500,
              selectedPlanId: null,
              billingFrequency: null,
              appliedDiscountIds: appliedDiscountIds,
              discountsApplied: appliedDiscountIds.length > 0,
              totalPremiumMonthly: 0,
              totalPremiumAnnual: 0,
              optionalCoveragesTotalMonthly: 0,
              label: null,
              savedAt: null,
              referenceNumber: null
            };

            const quotes = this._getFromStorage('quotes');
            quotes.push(quote);
            this._saveToStorage('quotes', quotes);
            this._setActiveQuoteId(quoteId);

            // initial premium calculation
            this._recalculateQuotePremiums(quote);

            return quote;
          }

          _getOrCreateActiveQuote() {
            let quote = this._getActiveQuote();
            if (quote && quote.status !== 'expired') {
              return quote;
            }
            // Default entrySource when auto-creating
            quote = this._createNewQuote('homepage_cta', null, []);
            return quote;
          }

          _saveQuote(updatedQuote) {
            const quotes = this._getFromStorage('quotes');
            let found = false;
            for (let i = 0; i < quotes.length; i++) {
              if (quotes[i].id === updatedQuote.id) {
                quotes[i] = updatedQuote;
                found = true;
                break;
              }
            }
            if (!found) {
              quotes.push(updatedQuote);
            }
            this._saveToStorage('quotes', quotes);
          }

          _validateBoatEligibility(boatType, lengthFeet, boatValue, primaryZip, usage) {
            const helpArticles = this._getFromStorage('help_articles');
            let maxLen = null;
            for (let i = 0; i < helpArticles.length; i++) {
              const art = helpArticles[i];
              if ((art.slug === 'boat_eligibility_for_online_quotes' || art.slug === 'faq_maximum_boat_length') &&
                art.isPublished && typeof art.maxOnlineQuoteBoatLengthFeet === 'number') {
                if (maxLen === null || art.maxOnlineQuoteBoatLengthFeet < maxLen) {
                  maxLen = art.maxOnlineQuoteBoatLengthFeet;
                }
              }
            }

            let isEligibleOnline = true;
            let reason = '';

            if (maxLen !== null && lengthFeet > maxLen) {
              isEligibleOnline = false;
              reason = 'Boat length exceeds maximum online quote length of ' + maxLen + ' feet.';
            }

            // Additional simple checks
            if (boatValue <= 0) {
              isEligibleOnline = false;
              if (reason) {
                reason += ' ';
              }
              reason += 'Boat value must be greater than 0.';
            }

            if (!primaryZip || String(primaryZip).length < 5) {
              isEligibleOnline = false;
              if (reason) {
                reason += ' ';
              }
              reason += 'A valid 5-digit ZIP code is required.';
            }

            return {
              isEligibleOnline: isEligibleOnline,
              reason: reason
            };
          }

          _recalculateQuotePremiums(quote) {
            if (!quote) {
              quote = this._getActiveQuote();
              if (!quote) return null;
            }

            const insurancePlans = this._getFromStorage('insurance_plans');
            const policyTypes = this._getFromStorage('policy_types');
            const discounts = this._getFromStorage('discounts');
            const quoteOptionalCoverages = this._getFromStorage('quote_optional_coverages');

            let baseMonthly = 0;
            let baseAnnual = 0;

            if (quote.selectedPlanId) {
              const plan = insurancePlans.find(function (p) { return p.id === quote.selectedPlanId; });
              if (plan) {
                baseMonthly = plan.basePriceMonthly || 0;
                baseAnnual = plan.basePriceAnnual || (baseMonthly * 12 * 0.9);
              }
            }

            if (!quote.selectedPlanId || baseMonthly === 0) {
              // Generic estimate based on boat value, liability, deductible and policy type
              let factor = 1;
              if (quote.policyTypeId) {
                const pt = policyTypes.find(function (p) { return p.id === quote.policyTypeId; });
                if (pt && typeof pt.relativePriceRank === 'number') {
                  factor = 0.8 + 0.2 * pt.relativePriceRank;
                }
              }
              const boatValue = quote.boatValue || 0;
              const liability = quote.liabilityLimit || 300000;
              const deductible = quote.deductible || 500;

              baseMonthly = (boatValue / 1000) * 2 * factor + (liability / 100000) * 1 * factor;
              const deductibleFactor = 700 / (deductible || 700);
              baseMonthly = baseMonthly * deductibleFactor;
              baseAnnual = baseMonthly * 12 * 0.9;
            }

            // Optional coverages
            let optionalCoveragesTotalMonthly = 0;
            for (let i = 0; i < quoteOptionalCoverages.length; i++) {
              const qoc = quoteOptionalCoverages[i];
              if (qoc.quoteId === quote.id && qoc.selected && qoc.additionalCostMonthly) {
                optionalCoveragesTotalMonthly += qoc.additionalCostMonthly;
              }
            }

            // Discounts
            let discountFactor = 1;
            if (Array.isArray(quote.appliedDiscountIds) && quote.appliedDiscountIds.length > 0) {
              let totalPercent = 0;
              for (let i = 0; i < quote.appliedDiscountIds.length; i++) {
                const disc = discounts.find(function (d) { return d.id === quote.appliedDiscountIds[i]; });
                if (disc) {
                  const maxP = typeof disc.maxSavingsPercent === 'number' ? disc.maxSavingsPercent : 5;
                  // Use a conservative fraction of max savings
                  totalPercent += maxP * 0.5;
                }
              }
              if (totalPercent > 40) totalPercent = 40;
              discountFactor = 1 - totalPercent / 100;
            }

            const totalMonthly = Math.max(0, (baseMonthly + optionalCoveragesTotalMonthly) * discountFactor);
            const totalAnnual = Math.max(0, totalMonthly * 12);

            quote.totalPremiumMonthly = Math.round(totalMonthly * 100) / 100;
            quote.totalPremiumAnnual = Math.round(totalAnnual * 100) / 100;
            quote.optionalCoveragesTotalMonthly = Math.round(optionalCoveragesTotalMonthly * 100) / 100;
            quote.discountsApplied = Array.isArray(quote.appliedDiscountIds) && quote.appliedDiscountIds.length > 0;
            quote.updatedAt = new Date().toISOString();

            this._saveQuote(quote);
            return quote;
          }

          _getActiveClaim() {
            const claims = this._getFromStorage('claims');
            const activeId = this._getActiveClaimId();
            if (!activeId) return null;
            const claim = claims.find(function (c) { return c.id === activeId; }) || null;
            return claim || null;
          }

          _saveClaim(updatedClaim) {
            const claims = this._getFromStorage('claims');
            let found = false;
            for (let i = 0; i < claims.length; i++) {
              if (claims[i].id === updatedClaim.id) {
                claims[i] = updatedClaim;
                found = true;
                break;
              }
            }
            if (!found) {
              claims.push(updatedClaim);
            }
            this._saveToStorage('claims', claims);
          }

          _updateClaimStep(step) {
            const claim = this._getActiveClaim();
            if (!claim) return null;
            claim.formStep = step;
            this._saveClaim(claim);
            return claim;
          }

          _calculateAgentDistances(zipCode, agents) {
            // Without external geocoding, we cannot compute true distances.
            // We will preserve any existing distanceMiles or default to 0.
            const results = [];
            for (let i = 0; i < agents.length; i++) {
              const agent = agents[i];
              const distance = typeof agent.distanceMiles === 'number' ? agent.distanceMiles : 0;
              const copy = Object.assign({}, agent);
              copy.distanceMiles = distance;
              results.push(copy);
            }
            return results;
          }

          _getMaxOnlineBoatLengthFromArticles() {
            const helpArticles = this._getFromStorage('help_articles');
            let maxLen = null;
            for (let i = 0; i < helpArticles.length; i++) {
              const art = helpArticles[i];
              if ((art.slug === 'boat_eligibility_for_online_quotes' || art.slug === 'faq_maximum_boat_length') &&
                art.isPublished && typeof art.maxOnlineQuoteBoatLengthFeet === 'number') {
                if (maxLen === null || art.maxOnlineQuoteBoatLengthFeet < maxLen) {
                  maxLen = art.maxOnlineQuoteBoatLengthFeet;
                }
              }
            }
            return maxLen !== null ? maxLen : 40;
          }

          // =========================
          // Core interface implementations
          // =========================

          // getHomepageContent()
          getHomepageContent() {
            const coverageFeatures = this._getFromStorage('coverage_features');
            const coreSummaries = [];
            for (let i = 0; i < coverageFeatures.length; i++) {
              const f = coverageFeatures[i];
              if (f.category === 'core') {
                let iconKey = 'other';
                if (f.code === 'liability_coverage') iconKey = 'liability';
                else if (f.code === 'hull_damage') iconKey = 'hull';
                else if (f.code === 'medical_payments') iconKey = 'medical';
                coreSummaries.push({
                  title: f.name,
                  description: f.description || '',
                  iconKey: iconKey
                });
              }
            }

            return {
              heroTitle: 'Local Boat Insurance for Your Time on the Water',
              heroSubtitle: 'Get a customized quote for your boat in just a few minutes.',
              primaryCtaLabel: 'Get a Quote',
              secondaryCtas: [
                {
                  key: 'file_claim',
                  label: 'File a Claim',
                  description: 'Start or track a boat insurance claim online.',
                  targetPageKey: 'file_claim'
                },
                {
                  key: 'manage_policy',
                  label: 'Customer Login',
                  description: 'View ID cards, update address, and manage billing.',
                  targetPageKey: 'customer_login'
                },
                {
                  key: 'find_agent',
                  label: 'Find a Local Agent',
                  description: 'Work with a local expert near you.',
                  targetPageKey: 'find_agent'
                },
                {
                  key: 'view_discounts',
                  label: 'Discounts',
                  description: 'See ways to save on your boat insurance.',
                  targetPageKey: 'discounts'
                },
                {
                  key: 'help_center',
                  label: 'Help & FAQs',
                  description: 'Get answers to common questions.',
                  targetPageKey: 'help_center'
                }
              ],
              coverageSummary: coreSummaries
            };
          }

          // startNewQuote(entrySource, policyTypeId, preselectedDiscountCodes)
          startNewQuote(entrySource, policyTypeId, preselectedDiscountCodes) {
            const policyTypes = this._getFromStorage('policy_types');
            let validPolicyTypeId = null;
            let selectedPolicyType = null;
            if (policyTypeId) {
              const pt = policyTypes.find(function (p) { return p.id === policyTypeId; });
              if (pt) {
                validPolicyTypeId = pt.id;
                selectedPolicyType = {
                  id: pt.id,
                  code: pt.code,
                  name: pt.name,
                  description: pt.description || '',
                  relativePriceRank: pt.relativePriceRank,
                  includesOnWaterTowing: !!pt.includesOnWaterTowing,
                  includesUninsuredBoaterCoverage: !!pt.includesUninsuredBoaterCoverage
                };
              }
            }

            const quote = this._createNewQuote(entrySource, validPolicyTypeId, preselectedDiscountCodes || []);
            const boats = this._getFromStorage('boats');
            const boat = boats.find(function (b) { return b.id === quote.boatId; });

            let appliedDiscountCodes = [];
            if (Array.isArray(quote.appliedDiscountIds) && quote.appliedDiscountIds.length > 0) {
              const discounts = this._getFromStorage('discounts');
              for (let i = 0; i < quote.appliedDiscountIds.length; i++) {
                const disc = discounts.find(function (d) { return d.id === quote.appliedDiscountIds[i]; });
                if (disc) {
                  appliedDiscountCodes.push(disc.code);
                }
              }
            }

            return {
              success: true,
              quoteNumber: quote.quoteNumber,
              step: 'boat_details',
              message: 'Quote started successfully.',
              initialBoatDetails: boat ? {
                boatType: boat.type,
                boatLengthFeet: boat.lengthFeet,
                boatValue: boat.value,
                primaryZip: boat.primaryZip,
                usage: boat.usage
              } : null,
              selectedPolicyType: selectedPolicyType,
              appliedDiscountCodes: appliedDiscountCodes
            };
          }

          // getQuoteBoatDetailsFormConfig()
          getQuoteBoatDetailsFormConfig() {
            const quote = this._getOrCreateActiveQuote();
            const boats = this._getFromStorage('boats');
            const boat = boats.find(function (b) { return b.id === quote.boatId; }) || null;

            const maxLen = this._getMaxOnlineBoatLengthFromArticles();

            const boatTypeOptions = [
              { value: 'sailboat', label: 'Sailboat' },
              { value: 'motorboat', label: 'Motorboat' },
              { value: 'personal_watercraft', label: 'Personal Watercraft' },
              { value: 'fishing_boat', label: 'Fishing Boat' },
              { value: 'pontoon', label: 'Pontoon' },
              { value: 'other', label: 'Other' }
            ];

            const usageOptions = [
              { value: 'pleasure_personal_use_only', label: 'Pleasure / Personal use only' },
              { value: 'commercial', label: 'Commercial' },
              { value: 'rental', label: 'Rental' },
              { value: 'other', label: 'Other' }
            ];

            return {
              boatTypeOptions: boatTypeOptions,
              usageOptions: usageOptions,
              maxOnlineBoatLengthFeet: typeof maxLen === 'number' ? maxLen : null,
              minBoatValue: 1000,
              maxBoatValue: 500000,
              currentBoatDetails: boat ? {
                boatType: boat.type,
                boatLengthFeet: boat.lengthFeet,
                boatValue: boat.value,
                primaryZip: boat.primaryZip,
                usage: boat.usage,
                year: boat.year,
                make: boat.make,
                model: boat.model,
                hullMaterial: boat.hullMaterial
              } : null
            };
          }

          // updateQuoteBoatDetails(boatType, lengthFeet, boatValue, primaryZip, usage, year, make, model, hullMaterial)
          updateQuoteBoatDetails(boatType, lengthFeet, boatValue, primaryZip, usage, year, make, model, hullMaterial) {
            const quote = this._getOrCreateActiveQuote();
            const boats = this._getFromStorage('boats');
            const boatIndex = boats.findIndex(function (b) { return b.id === quote.boatId; });

            const errors = [];

            if (!boatType) {
              errors.push({ field: 'boatType', message: 'Boat type is required.' });
            }
            if (!lengthFeet || lengthFeet <= 0) {
              errors.push({ field: 'lengthFeet', message: 'Boat length must be greater than 0.' });
            }
            if (!boatValue || boatValue <= 0) {
              errors.push({ field: 'boatValue', message: 'Boat value must be greater than 0.' });
            }
            if (!primaryZip || String(primaryZip).length < 5) {
              errors.push({ field: 'primaryZip', message: 'A valid 5-digit ZIP code is required.' });
            }
            if (!usage) {
              errors.push({ field: 'usage', message: 'Usage is required.' });
            }

            const eligibility = this._validateBoatEligibility(boatType, lengthFeet, boatValue, primaryZip, usage);
            if (!eligibility.isEligibleOnline) {
              errors.push({ field: 'eligibility', message: eligibility.reason });
            }

            if (errors.length > 0) {
              return {
                success: false,
                quoteNumber: quote.quoteNumber,
                nextStep: 'boat_details',
                errors: errors,
                eligibility: eligibility,
                summaryPremiumEstimateMonthly: quote.totalPremiumMonthly,
                summaryPremiumEstimateAnnual: quote.totalPremiumAnnual
              };
            }

            if (boatIndex >= 0) {
              boats[boatIndex].type = boatType;
              boats[boatIndex].lengthFeet = lengthFeet;
              boats[boatIndex].value = boatValue;
              boats[boatIndex].primaryZip = primaryZip;
              boats[boatIndex].usage = usage;
              boats[boatIndex].year = typeof year === 'number' ? year : boats[boatIndex].year;
              boats[boatIndex].make = typeof make === 'string' ? make : boats[boatIndex].make;
              boats[boatIndex].model = typeof model === 'string' ? model : boats[boatIndex].model;
              boats[boatIndex].hullMaterial = hullMaterial || boats[boatIndex].hullMaterial;
            }
            this._saveToStorage('boats', boats);

            quote.boatType = boatType;
            quote.boatLengthFeet = lengthFeet;
            quote.boatValue = boatValue;
            quote.primaryZip = primaryZip;
            quote.usage = usage;

            this._recalculateQuotePremiums(quote);

            return {
              success: true,
              quoteNumber: quote.quoteNumber,
              nextStep: 'coverage_options',
              errors: [],
              eligibility: { isEligibleOnline: true, reason: '' },
              summaryPremiumEstimateMonthly: quote.totalPremiumMonthly,
              summaryPremiumEstimateAnnual: quote.totalPremiumAnnual
            };
          }

          // getQuoteCoverageOptions()
          getQuoteCoverageOptions() {
            const quote = this._getOrCreateActiveQuote();
            const policyTypes = this._getFromStorage('policy_types');
            const discounts = this._getFromStorage('discounts');

            let selectedPolicyType = null;
            let availablePolicyTypes = [];

            for (let i = 0; i < policyTypes.length; i++) {
              const pt = policyTypes[i];
              if (!pt.isActive) continue;
              const summary = {
                id: pt.id,
                code: pt.code,
                name: pt.name,
                relativePriceRank: pt.relativePriceRank,
                includesOnWaterTowing: !!pt.includesOnWaterTowing,
                includesUninsuredBoaterCoverage: !!pt.includesUninsuredBoaterCoverage
              };
              availablePolicyTypes.push(summary);
              if (quote.policyTypeId && pt.id === quote.policyTypeId) {
                selectedPolicyType = summary;
              }
            }

            if (!selectedPolicyType && availablePolicyTypes.length > 0) {
              // Default to lowest relativePriceRank, preferring options that include on-water towing
              availablePolicyTypes.sort(function (a, b) {
                return a.relativePriceRank - b.relativePriceRank;
              });
              // Prefer a policy type that includes on-water towing when available (e.g., Standard/Premium)
              var towingCapable = availablePolicyTypes.filter(function (pt) {
                return !!pt.includesOnWaterTowing;
              });
              selectedPolicyType = towingCapable.length > 0 ? towingCapable[0] : availablePolicyTypes[0];
              quote.policyTypeId = selectedPolicyType.id;
              this._saveQuote(quote);
            }

            // Liability and deductible options from selected policy type
            let liabilityLimitOptions = [];
            let deductibleOptions = [];

            if (selectedPolicyType) {
              const ptFull = policyTypes.find(function (p) { return p.id === selectedPolicyType.id; });
              if (ptFull && Array.isArray(ptFull.allowedLiabilityLimits)) {
                for (let i = 0; i < ptFull.allowedLiabilityLimits.length; i++) {
                  const val = ptFull.allowedLiabilityLimits[i];
                  liabilityLimitOptions.push({
                    value: val,
                    label: '$' + val.toLocaleString(),
                    isRecommended: val === ptFull.defaultLiabilityLimit
                  });
                }
              }
              if (ptFull && Array.isArray(ptFull.allowedDeductibles)) {
                for (let j = 0; j < ptFull.allowedDeductibles.length; j++) {
                  const dv = ptFull.allowedDeductibles[j];
                  deductibleOptions.push({
                    value: dv,
                    label: '$' + dv.toLocaleString(),
                    isRecommended: false
                  });
                }
              }
            }

            const discountEligibilityOptions = [];
            for (let i = 0; i < discounts.length; i++) {
              const d = discounts[i];
              if (!d.isActive) continue;
              const isSelected = Array.isArray(quote.appliedDiscountIds) && quote.appliedDiscountIds.indexOf(d.id) !== -1;
              discountEligibilityOptions.push({
                code: d.code,
                label: d.name,
                description: d.eligibilityDescription || d.shortDescription || '',
                isSelected: isSelected
              });
            }

            this._recalculateQuotePremiums(quote);

            return {
              quoteNumber: quote.quoteNumber,
              selectedPolicyType: selectedPolicyType,
              availablePolicyTypes: availablePolicyTypes,
              liabilityLimitOptions: liabilityLimitOptions,
              deductibleOptions: deductibleOptions,
              selectedLiabilityLimit: quote.liabilityLimit,
              selectedDeductible: quote.deductible,
              discountEligibilityOptions: discountEligibilityOptions,
              estimatedPremiumMonthly: quote.totalPremiumMonthly,
              estimatedPremiumAnnual: quote.totalPremiumAnnual
            };
          }

          // updateQuoteCoverageSelections(liabilityLimit, deductible, policyTypeId, discountSelections)
          updateQuoteCoverageSelections(liabilityLimit, deductible, policyTypeId, discountSelections) {
            const quote = this._getOrCreateActiveQuote();
            const policyTypes = this._getFromStorage('policy_types');
            const discounts = this._getFromStorage('discounts');
            const errors = [];

            let targetPolicyTypeId = quote.policyTypeId || null;
            if (policyTypeId) {
              const pt = policyTypes.find(function (p) { return p.id === policyTypeId; });
              if (!pt) {
                errors.push({ field: 'policyTypeId', message: 'Selected policy type is not available.' });
              } else {
                targetPolicyTypeId = pt.id;
              }
            }

            const ptFull = targetPolicyTypeId ? policyTypes.find(function (p) { return p.id === targetPolicyTypeId; }) : null;

            if (ptFull && Array.isArray(ptFull.allowedLiabilityLimits) && ptFull.allowedLiabilityLimits.length > 0) {
              if (ptFull.allowedLiabilityLimits.indexOf(liabilityLimit) === -1) {
                errors.push({ field: 'liabilityLimit', message: 'Selected liability limit is not allowed for this policy type.' });
              }
            }
            if (ptFull && Array.isArray(ptFull.allowedDeductibles) && ptFull.allowedDeductibles.length > 0) {
              if (ptFull.allowedDeductibles.indexOf(deductible) === -1) {
                errors.push({ field: 'deductible', message: 'Selected deductible is not allowed for this policy type.' });
              }
            }

            if (errors.length > 0) {
              return {
                success: false,
                quoteNumber: quote.quoteNumber,
                nextStep: 'coverage_options',
                errors: errors,
                selectedLiabilityLimit: quote.liabilityLimit,
                selectedDeductible: quote.deductible,
                appliedDiscountCodes: [],
                estimatedPremiumMonthly: quote.totalPremiumMonthly,
                estimatedPremiumAnnual: quote.totalPremiumAnnual
              };
            }

            quote.liabilityLimit = liabilityLimit;
            quote.deductible = deductible;
            if (targetPolicyTypeId) {
              quote.policyTypeId = targetPolicyTypeId;
            }

            let appliedDiscountIds = [];
            if (discountSelections && typeof discountSelections === 'object') {
              const codes = ['boating_safety_course', 'multi_policy', 'claims_free', 'early_quote', 'paid_in_full'];
              for (let i = 0; i < codes.length; i++) {
                const code = codes[i];
                if (discountSelections[code]) {
                  const disc = discounts.find(function (d) { return d.code === code; });
                  if (disc) appliedDiscountIds.push(disc.id);
                }
              }
            } else {
              appliedDiscountIds = quote.appliedDiscountIds || [];
            }

            quote.appliedDiscountIds = appliedDiscountIds;
            quote.discountsApplied = appliedDiscountIds.length > 0;

            this._recalculateQuotePremiums(quote);

            const appliedDiscountCodes = [];
            for (let i = 0; i < appliedDiscountIds.length; i++) {
              const disc = discounts.find(function (d) { return d.id === appliedDiscountIds[i]; });
              if (disc) appliedDiscountCodes.push(disc.code);
            }

            return {
              success: true,
              quoteNumber: quote.quoteNumber,
              nextStep: 'plans_list',
              errors: [],
              selectedLiabilityLimit: quote.liabilityLimit,
              selectedDeductible: quote.deductible,
              appliedDiscountCodes: appliedDiscountCodes,
              estimatedPremiumMonthly: quote.totalPremiumMonthly,
              estimatedPremiumAnnual: quote.totalPremiumAnnual
            };
          }

          // getQuotePlans(sortBy)
          getQuotePlans(sortBy) {
            const quote = this._getOrCreateActiveQuote();
            const insurancePlans = this._getFromStorage('insurance_plans');
            const policyTypes = this._getFromStorage('policy_types');

            // Ensure premiums are up to date for selected plan if any
            this._recalculateQuotePremiums(quote);

            const plansForQuote = [];
            for (let i = 0; i < insurancePlans.length; i++) {
              const plan = insurancePlans[i];

              if (!plan.isAvailableOnline) continue;

              if (quote.policyTypeId && plan.policyTypeId !== quote.policyTypeId) {
                continue;
              }


              const policyType = policyTypes.find(function (p) { return p.id === plan.policyTypeId; }) || null;

              // Build key features from policyType flags
              const keyFeatures = [];
              if (policyType) {
                keyFeatures.push({
                  code: 'on_water_towing',
                  label: 'On-water towing',
                  isIncluded: !!policyType.includesOnWaterTowing
                });
                keyFeatures.push({
                  code: 'uninsured_boater_coverage',
                  label: 'Uninsured boater coverage',
                  isIncluded: !!policyType.includesUninsuredBoaterCoverage
                });
              }

              let totalPriceMonthly = plan.basePriceMonthly || 0;
              let totalPriceAnnual = plan.basePriceAnnual || (totalPriceMonthly * 12 * 0.9);

              if (quote.selectedPlanId && quote.selectedPlanId === plan.id) {
                totalPriceMonthly = quote.totalPremiumMonthly;
                totalPriceAnnual = quote.totalPremiumAnnual;
              }

              const planItem = {
                planId: plan.id,
                name: plan.name,
                policyTypeName: policyType ? policyType.name : '',
                policyTypeCode: policyType ? policyType.code : '',
                isFeatured: !!plan.isFeatured,
                basePriceMonthly: plan.basePriceMonthly,
                basePriceAnnual: plan.basePriceAnnual,
                totalPriceMonthly: totalPriceMonthly,
                totalPriceAnnual: totalPriceAnnual,
                liabilityLimit: plan.liabilityLimit,
                deductible: plan.deductible,
                keyFeatures: keyFeatures,
                isAvailableOnline: !!plan.isAvailableOnline,
                displayOrder: plan.displayOrder
              };

              // Foreign key resolution: policyTypeId -> policyType
              if (plan.policyTypeId) {
                planItem.policyType = policyType || null;
              }

              plansForQuote.push(planItem);
            }

            // Sorting
            const sortKey = sortBy || 'recommended';
            if (sortKey === 'price_low_to_high') {
              plansForQuote.sort(function (a, b) { return a.totalPriceMonthly - b.totalPriceMonthly; });
            } else if (sortKey === 'price_high_to_low') {
              plansForQuote.sort(function (a, b) { return b.totalPriceMonthly - a.totalPriceMonthly; });
            } else if (sortKey === 'coverage_high_to_low') {
              plansForQuote.sort(function (a, b) {
                if (a.policyType && b.policyType) {
                  if (b.policyType.relativePriceRank !== a.policyType.relativePriceRank) {
                    return b.policyType.relativePriceRank - a.policyType.relativePriceRank;
                  }
                }
                return a.totalPriceMonthly - b.totalPriceMonthly;
              });
            } else {
              // recommended: featured first, then price
              plansForQuote.sort(function (a, b) {
                if (a.isFeatured && !b.isFeatured) return -1;
                if (!a.isFeatured && b.isFeatured) return 1;
                return a.totalPriceMonthly - b.totalPriceMonthly;
              });
            }

            return {
              quoteNumber: quote.quoteNumber,
              sortBy: sortKey,
              plans: plansForQuote
            };
          }

          // selectPlanForCurrentQuote(planId)
          selectPlanForCurrentQuote(planId) {
            const quote = this._getOrCreateActiveQuote();
            const insurancePlans = this._getFromStorage('insurance_plans');
            const policyTypes = this._getFromStorage('policy_types');

            const plan = insurancePlans.find(function (p) { return p.id === planId; });
            if (!plan) {
              return {
                success: false,
                quoteNumber: quote.quoteNumber,
                selectedPlanId: quote.selectedPlanId || null,
                message: 'Selected plan not found.',
                nextStep: 'plans_list',
                planSummary: null
              };
            }

            quote.selectedPlanId = plan.id;
            quote.liabilityLimit = plan.liabilityLimit;
            quote.deductible = plan.deductible;
            quote.policyTypeId = plan.policyTypeId;
            quote.status = 'plan_selected';

            this._recalculateQuotePremiums(quote);

            const policyType = policyTypes.find(function (p) { return p.id === plan.policyTypeId; }) || null;

            return {
              success: true,
              quoteNumber: quote.quoteNumber,
              selectedPlanId: plan.id,
              message: 'Plan selected.',
              nextStep: 'plan_summary',
              planSummary: {
                name: plan.name,
                policyTypeName: policyType ? policyType.name : '',
                liabilityLimit: plan.liabilityLimit,
                deductible: plan.deductible,
                totalPremiumMonthly: quote.totalPremiumMonthly,
                totalPremiumAnnual: quote.totalPremiumAnnual
              }
            };
          }

          // getSelectedPlanSummaryAndOptions()
          getSelectedPlanSummaryAndOptions() {
            const quote = this._getOrCreateActiveQuote();
            const insurancePlans = this._getFromStorage('insurance_plans');
            const optionalCoverages = this._getFromStorage('optional_coverages');
            const quoteOptionalCoverages = this._getFromStorage('quote_optional_coverages');
            const policyTypes = this._getFromStorage('policy_types');

            if (!quote.selectedPlanId) {
              return {
                quoteNumber: quote.quoteNumber,
                plan: null,
                billingOptions: [],
                optionalCoverages: [],
                optionalCoveragesTotalMonthly: quote.optionalCoveragesTotalMonthly || 0,
                canSaveQuote: false
              };
            }

            const plan = insurancePlans.find(function (p) { return p.id === quote.selectedPlanId; }) || null;
            const policyType = plan ? policyTypes.find(function (p) { return p.id === plan.policyTypeId; }) : null;

            this._recalculateQuotePremiums(quote);

            const planSummary = plan ? {
              id: plan.id,
              name: plan.name,
              description: plan.description || '',
              policyTypeName: policyType ? policyType.name : '',
              liabilityLimit: plan.liabilityLimit,
              deductible: plan.deductible,
              basePriceMonthly: plan.basePriceMonthly,
              basePriceAnnual: plan.basePriceAnnual,
              totalPremiumMonthly: quote.totalPremiumMonthly,
              totalPremiumAnnual: quote.totalPremiumAnnual
            } : null;

            const billingOptions = [];
            billingOptions.push({
              value: 'monthly',
              label: 'Pay Monthly',
              isSelected: quote.billingFrequency === 'monthly' || !quote.billingFrequency,
              amount: quote.totalPremiumMonthly
            });
            billingOptions.push({
              value: 'annually',
              label: 'Pay Annually',
              isSelected: quote.billingFrequency === 'annually',
              amount: quote.totalPremiumAnnual
            });

            // Build optional coverages list for this policy type
            const optionalList = [];
            for (let i = 0; i < optionalCoverages.length; i++) {
              const oc = optionalCoverages[i];
              if (!oc.isActive) continue;
              if (Array.isArray(oc.isAvailableForPolicyTypeIds) && quote.policyTypeId && oc.isAvailableForPolicyTypeIds.indexOf(quote.policyTypeId) === -1) {
                continue;
              }

              const existing = quoteOptionalCoverages.find(function (qoc) {
                return qoc.quoteId === quote.id && qoc.optionalCoverageId === oc.id;
              });

              const limitOptions = [];
              if (oc.hasLimit && Array.isArray(oc.limitOptions)) {
                for (let j = 0; j < oc.limitOptions.length; j++) {
                  const val = oc.limitOptions[j];
                  limitOptions.push({ value: val, label: '$' + val.toLocaleString() });
                }
              }

              const item = {
                optionalCoverageId: oc.id,
                code: oc.code,
                name: oc.name,
                description: oc.description || '',
                hasLimit: !!oc.hasLimit,
                limitOptions: limitOptions,
                selected: existing ? !!existing.selected : false,
                selectedLimit: existing ? existing.selectedLimit : null,
                additionalCostMonthly: existing && existing.additionalCostMonthly ? existing.additionalCostMonthly : 0
              };

              // Foreign key resolution: optionalCoverageId -> optionalCoverage
              item.optionalCoverage = oc;

              optionalList.push(item);
            }

            return {
              quoteNumber: quote.quoteNumber,
              plan: planSummary,
              billingOptions: billingOptions,
              optionalCoverages: optionalList,
              optionalCoveragesTotalMonthly: quote.optionalCoveragesTotalMonthly || 0,
              canSaveQuote: true
            };
          }

          // updateQuoteOptionalCoverage(optionalCoverageId, selected, selectedLimit)
          updateQuoteOptionalCoverage(optionalCoverageId, selected, selectedLimit) {
            const quote = this._getOrCreateActiveQuote();
            const optionalCoverages = this._getFromStorage('optional_coverages');
            const quoteOptionalCoverages = this._getFromStorage('quote_optional_coverages');

            const oc = optionalCoverages.find(function (o) { return o.id === optionalCoverageId; });
            if (!oc) {
              return {
                success: false,
                quoteNumber: quote.quoteNumber,
                updatedCoverage: null,
                optionalCoveragesTotalMonthly: quote.optionalCoveragesTotalMonthly || 0,
                totalPremiumMonthly: quote.totalPremiumMonthly,
                warnings: []
              };
            }

            let existingIndex = -1;
            for (let i = 0; i < quoteOptionalCoverages.length; i++) {
              if (quoteOptionalCoverages[i].quoteId === quote.id && quoteOptionalCoverages[i].optionalCoverageId === optionalCoverageId) {
                existingIndex = i;
                break;
              }
            }

            let additionalCostMonthly = 0;
            if (selected) {
              // Simple pricing logic based on coverage code and limit
              if (oc.code === 'towing_assistance') {
                additionalCostMonthly = 5;
              } else if (oc.code === 'personal_effects') {
                const limit = selectedLimit || (Array.isArray(oc.limitOptions) && oc.limitOptions[0]);
                if (limit) {
                  additionalCostMonthly = (limit / 1000) * 5;
                } else {
                  additionalCostMonthly = 5;
                }
              } else if (oc.code === 'medical_payments') {
                additionalCostMonthly = 4;
              } else {
                additionalCostMonthly = 3;
              }
            }

            const now = {
              id: existingIndex >= 0 ? quoteOptionalCoverages[existingIndex].id : this._generateId('qoc'),
              quoteId: quote.id,
              optionalCoverageId: optionalCoverageId,
              selected: !!selected,
              selectedLimit: oc.hasLimit ? (selectedLimit || null) : null,
              additionalCostMonthly: additionalCostMonthly
            };

            if (existingIndex >= 0) {
              quoteOptionalCoverages[existingIndex] = now;
            } else {
              quoteOptionalCoverages.push(now);
            }

            this._saveToStorage('quote_optional_coverages', quoteOptionalCoverages);

            this._recalculateQuotePremiums(quote);

            const updatedCoverage = {
              optionalCoverageId: now.optionalCoverageId,
              code: oc.code,
              name: oc.name,
              selected: now.selected,
              selectedLimit: now.selectedLimit,
              additionalCostMonthly: now.additionalCostMonthly
            };

            const warnings = [];
            if (quote.optionalCoveragesTotalMonthly > 20) {
              warnings.push({
                code: 'optional_cost_over_threshold',
                message: 'Total additional monthly cost for optional coverages exceeds $20.'
              });
            }

            return {
              success: true,
              quoteNumber: quote.quoteNumber,
              updatedCoverage: updatedCoverage,
              optionalCoveragesTotalMonthly: quote.optionalCoveragesTotalMonthly,
              totalPremiumMonthly: quote.totalPremiumMonthly,
              warnings: warnings
            };
          }

          // setQuoteBillingFrequency(billingFrequency)
          setQuoteBillingFrequency(billingFrequency) {
            const quote = this._getOrCreateActiveQuote();
            if (billingFrequency !== 'monthly' && billingFrequency !== 'annually') {
              return {
                success: false,
                quoteNumber: quote.quoteNumber,
                billingFrequency: quote.billingFrequency || null,
                totalPremiumMonthly: quote.totalPremiumMonthly,
                totalPremiumAnnual: quote.totalPremiumAnnual,
                message: 'Invalid billing frequency.'
              };
            }

            quote.billingFrequency = billingFrequency;
            this._recalculateQuotePremiums(quote);

            return {
              success: true,
              quoteNumber: quote.quoteNumber,
              billingFrequency: quote.billingFrequency,
              totalPremiumMonthly: quote.totalPremiumMonthly,
              totalPremiumAnnual: quote.totalPremiumAnnual,
              message: 'Billing frequency updated.'
            };
          }

          // saveCurrentQuote(label)
          saveCurrentQuote(label) {
            const quote = this._getOrCreateActiveQuote();
            quote.label = label;
            quote.status = 'saved';
            const now = new Date().toISOString();
            quote.savedAt = now;
            if (!quote.referenceNumber) {
              quote.referenceNumber = 'SQ-' + quote.id;
            }
            this._saveQuote(quote);

            return {
              success: true,
              quoteNumber: quote.quoteNumber,
              label: quote.label,
              referenceNumber: quote.referenceNumber,
              savedAt: quote.savedAt,
              message: 'Quote saved successfully.'
            };
          }

          // resumeQuote(quoteId)
          resumeQuote(quoteId) {
            const quotes = this._getFromStorage('quotes');
            const quote = quotes.find(function (q) { return q.id === quoteId; });
            if (!quote) {
              return {
                success: false,
                quoteNumber: null,
                currentStep: null,
                message: 'Quote not found.'
              };
            }

            this._setActiveQuoteId(quoteId);

            let currentStep = 'boat_details';
            if (quote.boatLengthFeet && quote.boatValue && quote.primaryZip) {
              currentStep = 'coverage_options';
            }
            if (quote.selectedPlanId) {
              currentStep = 'plan_summary';
            }

            return {
              success: true,
              quoteNumber: quote.quoteNumber,
              currentStep: currentStep,
              message: 'Quote resumed.'
            };
          }

          // beginApplicantInfoForCurrentQuote()
          beginApplicantInfoForCurrentQuote() {
            const quote = this._getOrCreateActiveQuote();
            if (!quote.selectedPlanId) {
              return {
                success: false,
                quoteNumber: quote.quoteNumber,
                step: 'plans_list',
                requiredFields: []
              };
            }

            const requiredFields = [
              { fieldName: 'firstName', label: 'First Name', required: true },
              { fieldName: 'lastName', label: 'Last Name', required: true },
              { fieldName: 'phone', label: 'Phone Number', required: true },
              { fieldName: 'email', label: 'Email Address', required: true },
              { fieldName: 'addressLine1', label: 'Address Line 1', required: true },
              { fieldName: 'city', label: 'City', required: true },
              { fieldName: 'state', label: 'State', required: true },
              { fieldName: 'zip', label: 'ZIP Code', required: true }
            ];

            return {
              success: true,
              quoteNumber: quote.quoteNumber,
              step: 'applicant_info',
              requiredFields: requiredFields
            };
          }

          // login(username, password)
          login(username, password) {
            if (username === 'demo_user' && password === 'DemoPass123!') {
              this._setCurrentUserUsername(username);
              const policies = this._getFromStorage('policies');
              return {
                success: true,
                message: 'Login successful.',
                userDisplayName: 'Demo User',
                hasActivePolicies: policies.some(function (p) { return p.status === 'active'; })
              };
            }

            this._setCurrentUserUsername('');
            return {
              success: false,
              message: 'Invalid username or password.',
              userDisplayName: '',
              hasActivePolicies: false
            };
          }

          // getAccountDashboardSummary()
          getAccountDashboardSummary() {
            const username = this._getCurrentUserUsername();
            const userDisplayName = username ? 'Demo User' : '';
            const policies = this._getFromStorage('policies');
            const boats = this._getFromStorage('boats');
            const policyTypes = this._getFromStorage('policy_types');
            const quotes = this._getFromStorage('quotes');

            const policiesSummary = [];
            for (let i = 0; i < policies.length; i++) {
              const p = policies[i];
              const boat = boats.find(function (b) { return b.id === p.boatId; }) || null;
              const policyType = policyTypes.find(function (pt) { return pt.id === p.policyTypeId; }) || null;

              const boatDesc = boat ? ((boat.year ? boat.year + ' ' : '') + (boat.lengthFeet ? boat.lengthFeet + ' ft ' : '') + (boat.type || 'boat')) : '';

              const item = {
                policyId: p.id,
                policyNumber: p.policyNumber,
                productType: 'boat_insurance',
                status: p.status,
                policyTypeName: policyType ? policyType.name : '',
                boatDescription: boatDesc.trim(),
                billingFrequency: p.billingFrequency,
                nextPaymentDueDate: ''
              };

              // Foreign key resolution: policyId -> policy
              item.policy = p;

              policiesSummary.push(item);
            }

            const savedQuotesSummary = [];
            for (let j = 0; j < quotes.length; j++) {
              const q = quotes[j];
              if (q.status === 'saved') {
                const item = {
                  quoteId: q.id,
                  quoteNumber: q.quoteNumber,
                  label: q.label || '',
                  referenceNumber: q.referenceNumber || '',
                  createdAt: q.createdAt,
                  lastUpdatedAt: q.updatedAt,
                  status: q.status
                };
                // Foreign key resolution: quoteId -> quote
                item.quote = q;
                savedQuotesSummary.push(item);
              }
            }

            return {
              userDisplayName: userDisplayName,
              policies: policiesSummary,
              savedQuotes: savedQuotesSummary
            };
          }

          // getPolicyDetail(policyId)
          getPolicyDetail(policyId) {
            const policies = this._getFromStorage('policies');
            const policyTypes = this._getFromStorage('policy_types');
            const boats = this._getFromStorage('boats');

            const p = policies.find(function (pl) { return pl.id === policyId; });
            if (!p) {
              return {
                policyId: policyId,
                policyNumber: '',
                status: '',
                policyTypeName: '',
                effectiveDate: '',
                expirationDate: '',
                liabilityLimit: 0,
                deductible: 0,
                usage: '',
                billingFrequency: '',
                primaryZip: '',
                boatDescription: '',
                mailingAddress: {
                  line1: '',
                  line2: '',
                  city: '',
                  state: '',
                  zip: '',
                  lastUpdatedAt: ''
                },
                availableSections: []
              };
            }

            const policyType = policyTypes.find(function (pt) { return pt.id === p.policyTypeId; }) || null;
            const boat = boats.find(function (b) { return b.id === p.boatId; }) || null;
            const boatDesc = boat ? ((boat.year ? boat.year + ' ' : '') + (boat.lengthFeet ? boat.lengthFeet + ' ft ' : '') + (boat.type || 'boat')) : '';

            const mailingAddress = {
              line1: p.mailingAddressLine1,
              line2: p.mailingAddressLine2 || '',
              city: p.mailingCity,
              state: p.mailingState,
              zip: p.mailingZip,
              lastUpdatedAt: p.lastAddressUpdatedAt || ''
            };

            const availableSections = [
              { code: 'overview', label: 'Overview' },
              { code: 'contact_details', label: 'Profile & Settings' },
              { code: 'documents', label: 'Documents & ID Cards' },
              { code: 'billing', label: 'Billing' },
              { code: 'claims', label: 'Claims' }
            ];

            const detail = {
              policyId: p.id,
              policyNumber: p.policyNumber,
              status: p.status,
              policyTypeName: policyType ? policyType.name : '',
              effectiveDate: p.effectiveDate,
              expirationDate: p.expirationDate,
              liabilityLimit: p.liabilityLimit,
              deductible: p.deductible,
              usage: p.usage,
              billingFrequency: p.billingFrequency,
              primaryZip: p.primaryZip,
              boatDescription: boatDesc.trim(),
              mailingAddress: mailingAddress,
              availableSections: availableSections
            };

            // Foreign key resolution: boatId -> boat, policyTypeId -> policyType
            detail.boat = boat;
            detail.policyType = policyType;

            return detail;
          }

          // updatePolicyMailingAddress(policyId, mailingAddressLine1, mailingAddressLine2, mailingCity, mailingState, mailingZip)
          updatePolicyMailingAddress(policyId, mailingAddressLine1, mailingAddressLine2, mailingCity, mailingState, mailingZip) {
            const policies = this._getFromStorage('policies');
            const idx = policies.findIndex(function (p) { return p.id === policyId; });
            if (idx === -1) {
              return {
                success: false,
                message: 'Policy not found.',
                policyId: policyId,
                mailingAddress: null
              };
            }

            const now = new Date().toISOString();
            policies[idx].mailingAddressLine1 = mailingAddressLine1;
            policies[idx].mailingAddressLine2 = mailingAddressLine2 || '';
            policies[idx].mailingCity = mailingCity;
            policies[idx].mailingState = mailingState;
            policies[idx].mailingZip = mailingZip;
            policies[idx].lastAddressUpdatedAt = now;

            this._saveToStorage('policies', policies);

            return {
              success: true,
              message: 'Mailing address updated.',
              policyId: policies[idx].id,
              mailingAddress: {
                line1: policies[idx].mailingAddressLine1,
                line2: policies[idx].mailingAddressLine2,
                city: policies[idx].mailingCity,
                state: policies[idx].mailingState,
                zip: policies[idx].mailingZip,
                lastUpdatedAt: policies[idx].lastAddressUpdatedAt
              }
            };
          }

          // getPolicyDocuments(policyId, type)
          getPolicyDocuments(policyId, type) {
            const policyDocuments = this._getFromStorage('policy_documents');
            const policies = this._getFromStorage('policies');

            const docs = [];
            for (let i = 0; i < policyDocuments.length; i++) {
              const d = policyDocuments[i];
              if (d.policyId !== policyId) continue;
              if (type && d.type !== type) continue;

              const policy = policies.find(function (p) { return p.id === d.policyId; }) || null;

              const item = {
                documentId: d.id,
                type: d.type,
                title: d.title,
                description: d.description || '',
                documentFormat: d.documentFormat,
                isCurrent: d.isCurrent,
                createdAt: d.createdAt
              };

              // Foreign key: policyId -> policy
              item.policy = policy;

              docs.push(item);
            }

            return {
              policyId: policyId,
              documents: docs
            };
          }

          // getPolicyIdCard(policyId)
          getPolicyIdCard(policyId) {
            const policyDocuments = this._getFromStorage('policy_documents');
            const idCards = [];
            for (let i = 0; i < policyDocuments.length; i++) {
              const d = policyDocuments[i];
              if (d.policyId === policyId && d.type === 'id_card') {
                idCards.push(d);
              }
            }

            let currentCard = null;
            for (let j = 0; j < idCards.length; j++) {
              if (idCards[j].isCurrent) {
                currentCard = idCards[j];
                break;
              }
            }
            if (!currentCard && idCards.length > 0) {
              currentCard = idCards[idCards.length - 1];
            }

            if (!currentCard) {
              return {
                policyId: policyId,
                documentId: '',
                title: 'Digital ID Card',
                documentFormat: 'html',
                viewUrl: '',
                htmlContent: ''
              };
            }

            // Instrumentation for task completion tracking
            try {
              localStorage.setItem(
                'task3_lastViewedIdCard',
                JSON.stringify({ policyId: policyId, documentId: currentCard.id, viewedAt: new Date().toISOString() })
              );
            } catch (e) {
              console.error('Instrumentation error:', e);
            }

            return {
              policyId: policyId,
              documentId: currentCard.id,
              title: currentCard.title,
              documentFormat: currentCard.documentFormat,
              viewUrl: currentCard.viewUrl,
              htmlContent: ''
            };
          }

          // getClaimStartOptions()
          getClaimStartOptions() {
            return {
              claimTypes: [
                {
                  claimTypeCode: 'boat_insurance',
                  label: 'Boat Insurance',
                  description: 'Damage or loss involving a boat policy.'
                },
                {
                  claimTypeCode: 'auto_insurance',
                  label: 'Auto Insurance',
                  description: 'Claims for auto policies.'
                },
                {
                  claimTypeCode: 'home_insurance',
                  label: 'Home Insurance',
                  description: 'Claims for homeowners or renters policies.'
                },
                {
                  claimTypeCode: 'other',
                  label: 'Other',
                  description: 'Other types of claims.'
                }
              ],
              instructions: 'Select your product type to start a new claim. You will be guided through incident details, contact information, and a final review before submission.'
            };
          }

          // startBoatClaim(policyNumber)
          startBoatClaim(policyNumber) {
            const policies = this._getFromStorage('policies');
            const boats = this._getFromStorage('boats');
            const policy = policies.find(function (p) { return p.policyNumber === policyNumber; });

            if (!policy) {
              return {
                success: false,
                message: 'Policy not found.',
                claimId: null,
                claimType: null,
                policySummary: null
              };
            }

            const claimId = this._generateId('claim');
            const claimNumber = 'C-' + claimId;
            const now = new Date().toISOString();

            const claim = {
              id: claimId,
              claimNumber: claimNumber,
              policyId: policy.id,
              claimType: 'boat_insurance',
              status: 'draft',
              createdAt: now,
              submittedAt: null,
              incidentDate: null,
              incidentLocation: '',
              causeOfDamage: 'other',
              estimatedDamageAmount: 0,
              injuriesStatus: 'unknown',
              policeReportStatus: 'not_reported',
              ownerFirstName: '',
              ownerLastName: '',
              ownerPhone: '',
              ownerEmail: '',
              incidentDescription: '',
              formStep: 'incident_details'
            };

            const claims = this._getFromStorage('claims');
            claims.push(claim);
            this._saveToStorage('claims', claims);
            this._setActiveClaimId(claimId);

            const boat = boats.find(function (b) { return b.id === policy.boatId; }) || null;
            const boatDesc = boat ? ((boat.year ? boat.year + ' ' : '') + (boat.lengthFeet ? boat.lengthFeet + ' ft ' : '') + (boat.type || 'boat')) : '';

            return {
              success: true,
              message: 'Boat claim started.',
              claimId: claimId,
              claimType: 'boat_insurance',
              policySummary: {
                policyId: policy.id,
                policyNumber: policy.policyNumber,
                policyTypeName: '',
                boatDescription: boatDesc.trim()
              }
            };
          }

          // getCurrentClaimFormState()
          getCurrentClaimFormState() {
            const claim = this._getActiveClaim();
            if (!claim) {
              return {
                hasActiveClaim: false,
                claimId: null,
                step: null,
                incidentDetails: null,
                ownerDetails: null,
                incidentDescription: ''
              };
            }

            return {
              hasActiveClaim: true,
              claimId: claim.id,
              step: claim.formStep || 'incident_details',
              incidentDetails: {
                incidentDate: claim.incidentDate,
                incidentLocation: claim.incidentLocation,
                causeOfDamage: claim.causeOfDamage,
                estimatedDamageAmount: claim.estimatedDamageAmount,
                injuriesStatus: claim.injuriesStatus,
                policeReportStatus: claim.policeReportStatus
              },
              ownerDetails: {
                firstName: claim.ownerFirstName,
                lastName: claim.ownerLastName,
                phone: claim.ownerPhone,
                email: claim.ownerEmail
              },
              incidentDescription: claim.incidentDescription
            };
          }

          // updateCurrentClaimIncidentDetails(incidentDate, incidentLocation, causeOfDamage, estimatedDamageAmount, injuriesStatus, policeReportStatus)
          updateCurrentClaimIncidentDetails(incidentDate, incidentLocation, causeOfDamage, estimatedDamageAmount, injuriesStatus, policeReportStatus) {
            const claim = this._getActiveClaim();
            if (!claim) {
              return {
                success: false,
                message: 'No active claim found.',
                nextStep: null
              };
            }

            claim.incidentDate = incidentDate;
            claim.incidentLocation = incidentLocation;
            claim.causeOfDamage = causeOfDamage;
            claim.estimatedDamageAmount = estimatedDamageAmount;
            claim.injuriesStatus = injuriesStatus;
            claim.policeReportStatus = policeReportStatus;

            claim.formStep = 'owner_details';
            this._saveClaim(claim);

            return {
              success: true,
              message: 'Incident details updated.',
              nextStep: 'owner_details'
            };
          }

          // updateCurrentClaimOwnerDetails(ownerFirstName, ownerLastName, ownerPhone, ownerEmail)
          updateCurrentClaimOwnerDetails(ownerFirstName, ownerLastName, ownerPhone, ownerEmail) {
            const claim = this._getActiveClaim();
            if (!claim) {
              return {
                success: false,
                message: 'No active claim found.',
                nextStep: null
              };
            }

            claim.ownerFirstName = ownerFirstName;
            claim.ownerLastName = ownerLastName;
            claim.ownerPhone = ownerPhone;
            claim.ownerEmail = ownerEmail;

            claim.formStep = 'description';
            this._saveClaim(claim);

            return {
              success: true,
              message: 'Owner details updated.',
              nextStep: 'description'
            };
          }

          // updateCurrentClaimIncidentDescription(incidentDescription)
          updateCurrentClaimIncidentDescription(incidentDescription) {
            const claim = this._getActiveClaim();
            if (!claim) {
              return {
                success: false,
                message: 'No active claim found.',
                nextStep: null
              };
            }

            claim.incidentDescription = incidentDescription;
            claim.formStep = 'review';
            this._saveClaim(claim);

            return {
              success: true,
              message: 'Incident description updated.',
              nextStep: 'review'
            };
          }

          // getCurrentClaimReviewSummary()
          getCurrentClaimReviewSummary() {
            const claim = this._getActiveClaim();
            if (!claim) {
              return {
                claimId: null,
                policySummary: null,
                incidentDetails: null,
                ownerDetails: null,
                incidentDescription: ''
              };
            }

            const policies = this._getFromStorage('policies');
            const boats = this._getFromStorage('boats');
            const policy = policies.find(function (p) { return p.id === claim.policyId; }) || null;
            const boat = policy ? boats.find(function (b) { return b.id === policy.boatId; }) : null;
            const boatDesc = boat ? ((boat.year ? boat.year + ' ' : '') + (boat.lengthFeet ? boat.lengthFeet + ' ft ' : '') + (boat.type || 'boat')) : '';

            return {
              claimId: claim.id,
              policySummary: policy ? {
                policyNumber: policy.policyNumber,
                policyTypeName: '',
                boatDescription: boatDesc.trim()
              } : null,
              incidentDetails: {
                incidentDate: claim.incidentDate,
                incidentLocation: claim.incidentLocation,
                causeOfDamage: claim.causeOfDamage,
                estimatedDamageAmount: claim.estimatedDamageAmount,
                injuriesStatus: claim.injuriesStatus,
                policeReportStatus: claim.policeReportStatus
              },
              ownerDetails: {
                firstName: claim.ownerFirstName,
                lastName: claim.ownerLastName,
                phone: claim.ownerPhone,
                email: claim.ownerEmail
              },
              incidentDescription: claim.incidentDescription
            };
          }

          // submitCurrentClaim()
          submitCurrentClaim() {
            const claim = this._getActiveClaim();
            if (!claim) {
              return {
                success: false,
                claimNumber: null,
                status: null,
                message: 'No active claim found.'
              };
            }

            claim.status = 'submitted';
            claim.submittedAt = new Date().toISOString();
            claim.formStep = 'submitted';
            this._saveClaim(claim);
            this._setActiveClaimId('');

            return {
              success: true,
              claimNumber: claim.claimNumber,
              status: 'submitted',
              message: 'Claim submitted successfully.'
            };
          }

          // searchAgents(zipCode, radiusMiles, sortBy)
          searchAgents(zipCode, radiusMiles, sortBy) {
            const agents = this._getFromStorage('agents');
            const withDistance = this._calculateAgentDistances(zipCode, agents);

            // Filter by radius; since our distances default to 0, all agents will match any positive radius
            const filtered = [];
            for (let i = 0; i < withDistance.length; i++) {
              const a = withDistance[i];
              if (typeof a.distanceMiles === 'number') {
                if (a.distanceMiles <= radiusMiles) {
                  filtered.push(a);
                }
              } else {
                filtered.push(a);
              }
            }

            const sortKey = sortBy || 'distance_asc';
            if (sortKey === 'distance_desc') {
              filtered.sort(function (a, b) { return (b.distanceMiles || 0) - (a.distanceMiles || 0); });
            } else if (sortKey === 'name_asc') {
              filtered.sort(function (a, b) {
                const an = a.name || '';
                const bn = b.name || '';
                return an.localeCompare(bn);
              });
            } else {
              filtered.sort(function (a, b) { return (a.distanceMiles || 0) - (b.distanceMiles || 0); });
            }

            const results = [];
            for (let j = 0; j < filtered.length; j++) {
              const a = filtered[j];
              const item = {
                agentId: a.id,
                name: a.name,
                officePhonePrimary: a.officePhonePrimary,
                officeAddressLine1: a.officeAddressLine1,
                officeCity: a.officeCity,
                officeState: a.officeState,
                officeZip: a.officeZip,
                distanceMiles: a.distanceMiles || 0
              };
              // Foreign key resolution: agentId -> agent
              item.agent = a;
              results.push(item);
            }

            return {
              searchLocation: zipCode,
              radiusMiles: radiusMiles,
              sortBy: sortKey,
              agents: results
            };
          }

          // getAgentDetail(agentId)
          getAgentDetail(agentId) {
            const agents = this._getFromStorage('agents');
            const a = agents.find(function (ag) { return ag.id === agentId; });
            if (!a) {
              return {
                agentId: agentId,
                name: '',
                officePhonePrimary: '',
                officePhoneSecondary: '',
                email: '',
                officeAddressLine1: '',
                officeAddressLine2: '',
                officeCity: '',
                officeState: '',
                officeZip: '',
                serviceRadiusMiles: null,
                bio: ''
              };
            }
            return {
              agentId: a.id,
              name: a.name,
              officePhonePrimary: a.officePhonePrimary,
              officePhoneSecondary: a.officePhoneSecondary || '',
              email: a.email || '',
              officeAddressLine1: a.officeAddressLine1,
              officeAddressLine2: a.officeAddressLine2 || '',
              officeCity: a.officeCity,
              officeState: a.officeState,
              officeZip: a.officeZip,
              serviceRadiusMiles: a.serviceRadiusMiles || null,
              bio: a.bio || ''
            };
          }

          // submitAgentConsultationRequest(agentId, fromName, fromEmail, fromPhone, message)
          submitAgentConsultationRequest(agentId, fromName, fromEmail, fromPhone, message) {
            const agents = this._getFromStorage('agents');
            const agent = agents.find(function (a) { return a.id === agentId; });
            if (!agent) {
              return {
                success: false,
                message: 'Agent not found.',
                requestId: null,
                createdAt: null,
                agentName: ''
              };
            }

            const requestId = this._generateId('agent_request');
            const now = new Date().toISOString();
            const requests = this._getFromStorage('agent_consultation_requests');

            const request = {
              id: requestId,
              agentId: agentId,
              createdAt: now,
              fromName: fromName,
              fromEmail: fromEmail,
              fromPhone: fromPhone || '',
              message: message,
              status: 'received'
            };

            requests.push(request);
            this._saveToStorage('agent_consultation_requests', requests);

            return {
              success: true,
              message: 'Consultation request submitted.',
              requestId: requestId,
              createdAt: now,
              agentName: agent.name
            };
          }

          // getCoverageOverview()
          getCoverageOverview() {
            const coverageFeatures = this._getFromStorage('coverage_features');
            const policyTypes = this._getFromStorage('policy_types');

            const coreCoverages = [];
            for (let i = 0; i < coverageFeatures.length; i++) {
              const f = coverageFeatures[i];
              if (f.category === 'core') {
                coreCoverages.push({
                  code: f.code,
                  name: f.name,
                  description: f.description || ''
                });
              }
            }

            const policyTypeSummaries = [];
            for (let j = 0; j < policyTypes.length; j++) {
              const pt = policyTypes[j];
              if (!pt.isActive) continue;
              policyTypeSummaries.push({
                policyTypeId: pt.id,
                code: pt.code,
                name: pt.name,
                description: pt.description || '',
                relativePriceRank: pt.relativePriceRank,
                includesOnWaterTowing: !!pt.includesOnWaterTowing,
                includesUninsuredBoaterCoverage: !!pt.includesUninsuredBoaterCoverage,
                highlightedBenefits: []
              });
            }

            return {
              introTitle: 'Boat Insurance Coverage Options',
              introBody: 'Learn about the coverages available for your boat and choose the policy type that fits how you use the water.',
              coreCoverages: coreCoverages,
              policyTypeSummaries: policyTypeSummaries
            };
          }

          // getPolicyComparison(highlightFeatureCodes, requireAllHighlightedFeatures)
          getPolicyComparison(highlightFeatureCodes, requireAllHighlightedFeatures) {
            const coverageFeatures = this._getFromStorage('coverage_features');
            const policyTypes = this._getFromStorage('policy_types');
            const policyTypeFeatures = this._getFromStorage('policy_type_features');

            const highlightSet = Array.isArray(highlightFeatureCodes) ? highlightFeatureCodes : [];
            const requireAll = !!requireAllHighlightedFeatures;

            const featuresList = [];
            for (let i = 0; i < coverageFeatures.length; i++) {
              const f = coverageFeatures[i];
              featuresList.push({
                code: f.code,
                name: f.name,
                description: f.description || '',
                isHighlighted: highlightSet.indexOf(f.code) !== -1
              });
            }

            const policyTypeRows = [];
            for (let j = 0; j < policyTypes.length; j++) {
              const pt = policyTypes[j];
              if (!pt.isActive) continue;

              const ptFeatures = [];
              for (let k = 0; k < coverageFeatures.length; k++) {
                const f = coverageFeatures[k];
                const rel = policyTypeFeatures.find(function (pf) {
                  return pf.policyTypeId === pt.id && pf.coverageFeatureId === f.id;
                });
                ptFeatures.push({
                  featureCode: f.code,
                  isIncluded: rel ? !!rel.included : false
                });
              }

              let meetsHighlighted = true;
              for (let h = 0; h < highlightSet.length; h++) {
                const code = highlightSet[h];
                if (code === 'on_water_towing') {
                  if (!pt.includesOnWaterTowing) {
                    meetsHighlighted = false;
                    if (requireAll) break;
                  }
                } else if (code === 'uninsured_boater_coverage') {
                  if (!pt.includesUninsuredBoaterCoverage) {
                    meetsHighlighted = false;
                    if (requireAll) break;
                  }
                } else {
                  const pf = ptFeatures.find(function (pf2) { return pf2.featureCode === code; });
                  if (!pf || !pf.isIncluded) {
                    meetsHighlighted = false;
                    if (requireAll) break;
                  }
                }
              }

              const row = {
                policyTypeId: pt.id,
                code: pt.code,
                name: pt.name,
                relativePriceRank: pt.relativePriceRank,
                includesOnWaterTowing: !!pt.includesOnWaterTowing,
                includesUninsuredBoaterCoverage: !!pt.includesUninsuredBoaterCoverage,
                features: ptFeatures,
                meetsHighlightedCriteria: highlightSet.length === 0 ? true : meetsHighlighted
              };

              policyTypeRows.push(row);
            }

            let recommendedPolicyTypeId = null;
            const eligible = policyTypeRows.filter(function (r) { return r.meetsHighlightedCriteria; });
            if (eligible.length > 0) {
              eligible.sort(function (a, b) { return a.relativePriceRank - b.relativePriceRank; });
              recommendedPolicyTypeId = eligible[0].policyTypeId;
            }

            return {
              features: featuresList,
              policyTypes: policyTypeRows,
              recommendedPolicyTypeId: recommendedPolicyTypeId
            };
          }

          // getPolicyTypeDetail(policyTypeId)
          getPolicyTypeDetail(policyTypeId) {
            const policyTypes = this._getFromStorage('policy_types');
            const optionalCoverages = this._getFromStorage('optional_coverages');
            const pt = policyTypes.find(function (p) { return p.id === policyTypeId; });
            if (!pt) {
              return {
                policyTypeId: policyTypeId,
                code: '',
                name: '',
                description: '',
                relativePriceRank: 0,
                includesOnWaterTowing: false,
                includesUninsuredBoaterCoverage: false,
                coverageHighlights: [],
                allowedLiabilityLimits: [],
                allowedDeductibles: [],
                availableOptionalCoverages: [],
                defaultLiabilityLimit: null
              };
            }

            const allowedLiabilityLimits = [];
            if (Array.isArray(pt.allowedLiabilityLimits)) {
              for (let i = 0; i < pt.allowedLiabilityLimits.length; i++) {
                const v = pt.allowedLiabilityLimits[i];
                allowedLiabilityLimits.push({ value: v, label: '$' + v.toLocaleString() });
              }
            }

            const allowedDeductibles = [];
            if (Array.isArray(pt.allowedDeductibles)) {
              for (let j = 0; j < pt.allowedDeductibles.length; j++) {
                const d = pt.allowedDeductibles[j];
                allowedDeductibles.push({ value: d, label: '$' + d.toLocaleString() });
              }
            }

            const availableOptionalCoverages = [];
            for (let k = 0; k < optionalCoverages.length; k++) {
              const oc = optionalCoverages[k];
              if (!oc.isActive) continue;
              if (Array.isArray(oc.isAvailableForPolicyTypeIds) && oc.isAvailableForPolicyTypeIds.indexOf(policyTypeId) === -1) {
                continue;
              }
              availableOptionalCoverages.push({
                optionalCoverageId: oc.id,
                code: oc.code,
                name: oc.name,
                description: oc.description || ''
              });
            }

            return {
              policyTypeId: pt.id,
              code: pt.code,
              name: pt.name,
              description: pt.description || '',
              relativePriceRank: pt.relativePriceRank,
              includesOnWaterTowing: !!pt.includesOnWaterTowing,
              includesUninsuredBoaterCoverage: !!pt.includesUninsuredBoaterCoverage,
              coverageHighlights: [],
              allowedLiabilityLimits: allowedLiabilityLimits,
              allowedDeductibles: allowedDeductibles,
              availableOptionalCoverages: availableOptionalCoverages,
              defaultLiabilityLimit: pt.defaultLiabilityLimit || null
            };
          }

          // startQuoteForPolicyType(policyTypeId, preferredLiabilityLimit, entrySource)
          startQuoteForPolicyType(policyTypeId, preferredLiabilityLimit, entrySource) {
            const policyTypes = this._getFromStorage('policy_types');
            const pt = policyTypes.find(function (p) { return p.id === policyTypeId; });
            if (!pt) {
              return {
                success: false,
                quoteNumber: null,
                message: 'Policy type not found.',
                selectedPolicyTypeName: '',
                selectedLiabilityLimit: null,
                step: null
              };
            }

            const quote = this._createNewQuote(entrySource, pt.id, []);

            let selectedLiabilityLimit = pt.defaultLiabilityLimit || null;
            if (preferredLiabilityLimit && Array.isArray(pt.allowedLiabilityLimits) && pt.allowedLiabilityLimits.indexOf(preferredLiabilityLimit) !== -1) {
              selectedLiabilityLimit = preferredLiabilityLimit;
            }
            if (selectedLiabilityLimit) {
              quote.liabilityLimit = selectedLiabilityLimit;
              this._recalculateQuotePremiums(quote);
            }

            return {
              success: true,
              quoteNumber: quote.quoteNumber,
              message: 'Quote started for policy type.',
              selectedPolicyTypeName: pt.name,
              selectedLiabilityLimit: selectedLiabilityLimit,
              step: 'boat_details'
            };
          }

          // getDiscountsOverview()
          getDiscountsOverview() {
            const discounts = this._getFromStorage('discounts');
            const activeDiscounts = [];
            for (let i = 0; i < discounts.length; i++) {
              const d = discounts[i];
              if (!d.isActive) continue;
              activeDiscounts.push({
                discountCode: d.code,
                name: d.name,
                shortDescription: d.shortDescription || '',
                eligibilityDescription: d.eligibilityDescription || '',
                maxSavingsPercent: typeof d.maxSavingsPercent === 'number' ? d.maxSavingsPercent : null
              });
            }

            return {
              introTitle: 'Boat Insurance Discounts',
              introBody: 'You may qualify for savings based on boating safety courses, multiple policies, and more.',
              discounts: activeDiscounts
            };
          }

          // getDiscountDetail(discountCode)
          getDiscountDetail(discountCode) {
            const discounts = this._getFromStorage('discounts');
            const d = discounts.find(function (disc) { return disc.code === discountCode; });
            if (!d) {
              return {
                discountCode: discountCode,
                name: '',
                shortDescription: '',
                eligibilityDescription: '',
                maxSavingsPercent: null,
                documentationRequired: '',
                howToApply: ''
              };
            }

            return {
              discountCode: d.code,
              name: d.name,
              shortDescription: d.shortDescription || '',
              eligibilityDescription: d.eligibilityDescription || '',
              maxSavingsPercent: typeof d.maxSavingsPercent === 'number' ? d.maxSavingsPercent : null,
              documentationRequired: '',
              howToApply: 'Select this discount during your online quote or mention it to your local agent.'
            };
          }

          // updateQuoteDiscountEligibility(discountSelections)
          updateQuoteDiscountEligibility(discountSelections) {
            const quote = this._getOrCreateActiveQuote();
            const discounts = this._getFromStorage('discounts');

            const appliedDiscountIds = [];
            const codes = ['boating_safety_course', 'multi_policy', 'claims_free', 'early_quote', 'paid_in_full'];
            for (let i = 0; i < codes.length; i++) {
              const code = codes[i];
              if (discountSelections[code]) {
                const disc = discounts.find(function (d) { return d.code === code; });
                if (disc) {
                  appliedDiscountIds.push(disc.id);
                }
              }
            }

            quote.appliedDiscountIds = appliedDiscountIds;
            quote.discountsApplied = appliedDiscountIds.length > 0;

            this._recalculateQuotePremiums(quote);

            const appliedDiscountCodes = [];
            for (let j = 0; j < appliedDiscountIds.length; j++) {
              const disc = discounts.find(function (d) { return d.id === appliedDiscountIds[j]; });
              if (disc) appliedDiscountCodes.push(disc.code);
            }

            return {
              success: true,
              appliedDiscountCodes: appliedDiscountCodes,
              estimatedPremiumMonthly: quote.totalPremiumMonthly,
              estimatedPremiumAnnual: quote.totalPremiumAnnual,
              message: 'Discount eligibility updated.'
            };
          }

          // getHelpCenterOverview()
          getHelpCenterOverview() {
            const helpArticles = this._getFromStorage('help_articles');
            const topicsMap = {};

            for (let i = 0; i < helpArticles.length; i++) {
              const a = helpArticles[i];
              if (!a.isPublished) continue;
              const topicCode = a.topic;
              if (!topicsMap[topicCode]) {
                topicsMap[topicCode] = {
                  topicCode: topicCode,
                  topicLabel: topicCode.charAt(0).toUpperCase() + topicCode.slice(1),
                  description: '',
                  featuredArticles: []
                };
              }
              const topic = topicsMap[topicCode];
              if (topic.featuredArticles.length < 3) {
                const excerpt = a.content ? a.content.substring(0, 160) : '';
                topic.featuredArticles.push({
                  helpArticleId: a.id,
                  slug: a.slug,
                  title: a.title,
                  excerpt: excerpt
                });
              }
            }

            const topics = [];
            for (const key in topicsMap) {
              if (Object.prototype.hasOwnProperty.call(topicsMap, key)) {
                topics.push(topicsMap[key]);
              }
            }

            return {
              introTitle: 'Help Center & FAQs',
              introBody: 'Browse common questions about eligibility, coverage, billing, and claims.',
              topics: topics
            };
          }

          // searchHelpArticles(query)
          searchHelpArticles(query) {
            const helpArticles = this._getFromStorage('help_articles');
            const q = (query || '').toLowerCase();
            const results = [];

            for (let i = 0; i < helpArticles.length; i++) {
              const a = helpArticles[i];
              if (!a.isPublished) continue;
              if (!q) continue;
              const haystack = ((a.title || '') + ' ' + (a.content || '')).toLowerCase();
              if (haystack.indexOf(q) !== -1) {
                const excerpt = a.content ? a.content.substring(0, 160) : '';
                results.push({
                  helpArticleId: a.id,
                  slug: a.slug,
                  title: a.title,
                  excerpt: excerpt,
                  topic: a.topic
                });
              }
            }

            return {
              query: query,
              results: results
            };
          }

          // getHelpArticleBySlug(slug)
          getHelpArticleBySlug(slug) {
            const helpArticles = this._getFromStorage('help_articles');
            const a = helpArticles.find(function (art) { return art.slug === slug; });
            if (!a) {
              return {
                helpArticleId: null,
                slug: slug,
                title: '',
                content: '',
                topic: '',
                maxOnlineQuoteBoatLengthFeet: null
              };
            }

            return {
              helpArticleId: a.id,
              slug: a.slug,
              title: a.title,
              content: a.content,
              topic: a.topic,
              maxOnlineQuoteBoatLengthFeet: typeof a.maxOnlineQuoteBoatLengthFeet === 'number' ? a.maxOnlineQuoteBoatLengthFeet : null
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