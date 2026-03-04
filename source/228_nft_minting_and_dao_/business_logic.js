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
      'tokens',
      'collections',
      'collection_trait_options',
      'nfts',
      'nft_listings',
      'nft_purchases',
      'staking_pools',
      'stake_positions',
      'governance_profiles',
      'proposals',
      'votes',
      'delegates',
      'delegations',
      'treasury_accounts',
      'treasury_transactions',
      'forum_categories',
      'forum_threads',
      'forum_posts'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
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

  _nowIso() {
    return new Date().toISOString();
  }

  _addDaysIso(dateIso, days) {
    const d = new Date(dateIso);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  }

  // ----------------------
  // Private helpers from spec
  // ----------------------

  // Filter and sort collections based on provided filters and sortBy
  _applyCollectionFiltersAndSort(collections, filters, sortBy) {
    let result = Array.isArray(collections) ? collections.slice() : [];

    if (filters) {
      const { type, minMintPriceEth, maxMintPriceEth } = filters;
      if (type) {
        result = result.filter((c) => c.type === type);
      }
      if (typeof minMintPriceEth === 'number') {
        result = result.filter((c) => typeof c.mintPriceEth === 'number' && c.mintPriceEth >= minMintPriceEth);
      }
      if (typeof maxMintPriceEth === 'number') {
        result = result.filter((c) => typeof c.mintPriceEth === 'number' && c.mintPriceEth <= maxMintPriceEth);
      }
    }

    switch (sortBy) {
      case 'mint_price_low_to_high':
        result.sort((a, b) => (a.mintPriceEth || 0) - (b.mintPriceEth || 0));
        break;
      case 'floor_price_low_to_high':
        result.sort((a, b) => (a.floorPriceEth || 0) - (b.floorPriceEth || 0));
        break;
      case 'created_newest':
      default:
        result.sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
        });
        break;
    }

    return result;
  }

  // Filter and sort NFTs & listings for marketplace
  _applyMarketplaceFiltersAndSort(listings, filters, sortBy) {
    let result = Array.isArray(listings) ? listings.slice() : [];

    if (filters) {
      const { maxPriceEth, minRating } = filters;

      if (typeof maxPriceEth === 'number') {
        result = result.filter((item) => item.listing && typeof item.listing.priceEth === 'number' && item.listing.priceEth <= maxPriceEth);
      }

      if (typeof minRating === 'number') {
        result = result.filter((item) => item.nft && typeof item.nft.rating === 'number' && item.nft.rating >= minRating);
      }
    }

    switch (sortBy) {
      case 'price_high_to_low':
        result.sort((a, b) => (b.listing.priceEth || 0) - (a.listing.priceEth || 0));
        break;
      case 'rating_high_to_low':
        result.sort((a, b) => (b.nft.rating || 0) - (a.nft.rating || 0));
        break;
      case 'price_low_to_high':
      default:
        result.sort((a, b) => (a.listing.priceEth || 0) - (b.listing.priceEth || 0));
        break;
    }

    return result;
  }

  // Governance profile loader/initializer
  _getOrCreateGovernanceProfile() {
    let profiles = this._getFromStorage('governance_profiles');
    if (!Array.isArray(profiles)) profiles = [];

    let profile = profiles[0] || null;
    if (!profile) {
      const now = this._nowIso();
      profile = {
        id: this._generateId('gov_profile'),
        displayName: null,
        govLiquidBalance: 0,
        govStakedBalance: 0,
        votingPowerTotal: 0,
        votingPowerAvailable: 0,
        votingPowerDelegatedOut: 0,
        lastUpdatedAt: now
      };
      profiles.push(profile);
      this._saveToStorage('governance_profiles', profiles);
    }
    return profile;
  }

  _saveGovernanceProfile(profile) {
    let profiles = this._getFromStorage('governance_profiles');
    if (!Array.isArray(profiles)) profiles = [];
    const idx = profiles.findIndex((p) => p.id === profile.id);
    if (idx >= 0) profiles[idx] = profile; else profiles.push(profile);
    this._saveToStorage('governance_profiles', profiles);
  }

  _updateVotingPowerAfterVote(governanceProfile, votingPowerUsed) {
    const gp = { ...governanceProfile };
    const used = typeof votingPowerUsed === 'number' && votingPowerUsed > 0 ? votingPowerUsed : 0;
    gp.votingPowerAvailable = Math.max(0, (gp.votingPowerAvailable || 0) - used);
    gp.lastUpdatedAt = this._nowIso();
    this._saveGovernanceProfile(gp);
    return gp;
  }

  _createNftPurchaseRecord(nft, price, currency, quantity, isPrimarySale, listingId) {
    const purchases = this._getFromStorage('nft_purchases');
    const now = this._nowIso();

    const purchase = {
      id: this._generateId('nft_purchase'),
      nftId: nft.id,
      listingId: listingId || null,
      collectionId: nft.collectionId,
      price: price,
      currency: currency,
      quantity: quantity,
      purchasedAt: now,
      isPrimarySale: !!isPrimarySale
    };

    purchases.push(purchase);
    this._saveToStorage('nft_purchases', purchases);
    return purchase;
  }

  _computeProposalDates() {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startDate = tomorrow.toISOString();
    const endDate = this._addDaysIso(startDate, 7);
    return { startDate, endDate };
  }

  _updateTreasuryTransactionWatchlistState(transaction, isWatchlisted, watchlistNote) {
    const updated = { ...transaction };
    const now = this._nowIso();

    updated.isWatchlisted = !!isWatchlisted;
    if (updated.isWatchlisted) {
      if (typeof watchlistNote === 'string') {
        updated.watchlistNote = watchlistNote;
      }
      if (!updated.watchlistedAt) {
        updated.watchlistedAt = now;
      }
    } else {
      updated.watchlistNote = watchlistNote || '';
      updated.watchlistedAt = null;
    }

    return updated;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomeOverview()
  getHomeOverview() {
    const collections = this._getFromStorage('collections');
    const proposals = this._getFromStorage('proposals');
    const stakePositions = this._getFromStorage('stake_positions');
    const treasuryAccounts = this._getFromStorage('treasury_accounts');
    const treasuryTransactions = this._getFromStorage('treasury_transactions');
    const forumCategories = this._getFromStorage('forum_categories');
    const forumThreads = this._getFromStorage('forum_threads');

    const activeProposalsCount = proposals.filter((p) => p.status === 'active').length;
    const totalProposalsCount = proposals.length;

    const totalStakedGov = stakePositions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    const treasuryGovBalance = treasuryAccounts
      .filter((a) => a.tokenSymbol === 'gov')
      .reduce((sum, a) => sum + (a.balance || 0), 0);

    const treasuryEthBalance = treasuryAccounts
      .filter((a) => a.tokenSymbol === 'eth')
      .reduce((sum, a) => sum + (a.balance || 0), 0);

    const totalForumThreads = forumThreads.length;

    const governanceCategory = forumCategories.find(
      (c) => (c.name || '').toLowerCase() === 'governance' || c.id === 'governance'
    );

    let governanceThreads = forumThreads;
    if (governanceCategory) {
      governanceThreads = forumThreads.filter((t) => t.categoryId === governanceCategory.id);
    }
    const governanceThreadsCount = governanceThreads.length;

    let latestGovernanceThread = null;
    if (governanceThreads.length > 0) {
      latestGovernanceThread = governanceThreads.slice().sort((a, b) => {
        const da = a.lastReplyAt ? new Date(a.lastReplyAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const db = b.lastReplyAt ? new Date(b.lastReplyAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return db - da;
      })[0];

      if (latestGovernanceThread) {
        latestGovernanceThread = {
          ...latestGovernanceThread,
          category: governanceCategory || null
        };
      }
    }

    const featuredCollections = collections.slice(0, 5).map((c) => ({
      collection: c,
      id: c.id,
      name: c.name,
      description: c.description,
      type: c.type,
      imageUrl: c.imageUrl,
      mintPriceEth: c.mintPriceEth,
      floorPriceEth: c.floorPriceEth,
      isMintingOpen: c.isMintingOpen,
      ratingAverage: c.ratingAverage
    }));

    return {
      hero: {
        headline: 'Mint, Govern, and Grow the Future of Digital Communities',
        subheadline: 'Create avatar NFTs, participate in the DAO, and shape the treasury together.',
        primaryCtaLabel: 'Explore Collections',
        primaryCtaTarget: 'collections'
      },
      featuredCollections,
      daoHighlights: {
        activeProposalsCount,
        totalProposalsCount,
        totalStakedGov,
        treasuryGovBalance,
        treasuryEthBalance
      },
      communityHighlights: {
        totalForumThreads,
        governanceThreadsCount,
        latestGovernanceThread
      }
    };
  }

  // searchSiteContent(query, filters, sortBy)
  searchSiteContent(query, filters, sortBy) {
    const q = (query || '').toLowerCase().trim();
    const includeTypes = (filters && Array.isArray(filters.types) && filters.types.length > 0)
      ? filters.types
      : ['collection', 'nft', 'forum_thread', 'delegate'];

    const collections = this._getFromStorage('collections');
    const nfts = this._getFromStorage('nfts');
    const forumThreads = this._getFromStorage('forum_threads');
    const forumCategories = this._getFromStorage('forum_categories');
    const delegates = this._getFromStorage('delegates');

    let matchedCollections = [];
    let matchedNfts = [];
    let matchedForumThreads = [];
    let matchedDelegates = [];

    const matches = (text) => {
      if (!q) return true;
      if (!text) return false;
      return String(text).toLowerCase().includes(q);
    };

    if (includeTypes.includes('collection')) {
      matchedCollections = collections.filter((c) => matches(c.name) || matches(c.description));
    }

    if (includeTypes.includes('nft')) {
      matchedNfts = nfts.filter((n) => matches(n.name) || matches(n.description));
      // Resolve collection foreign key
      matchedNfts = matchedNfts.map((n) => ({
        ...n,
        collection: collections.find((c) => c.id === n.collectionId) || null
      }));
    }

    if (includeTypes.includes('forum_thread')) {
      matchedForumThreads = forumThreads.filter((t) => matches(t.title) || matches(t.body));
      matchedForumThreads = matchedForumThreads.map((t) => ({
        ...t,
        category: forumCategories.find((c) => c.id === t.categoryId) || null
      }));
    }

    if (includeTypes.includes('delegate')) {
      matchedDelegates = delegates.filter((d) => matches(d.name) || matches(d.bio));
    }

    if (sortBy === 'name_asc') {
      matchedCollections.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      matchedNfts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      matchedDelegates.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      matchedForumThreads.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else {
      // 'relevance' (fallback: newest first where possible)
      const byDateDesc = (a, b, field) => {
        const da = a[field] ? new Date(a[field]).getTime() : 0;
        const db = b[field] ? new Date(b[field]).getTime() : 0;
        return db - da;
      };
      matchedCollections.sort((a, b) => byDateDesc(a, b, 'createdAt'));
      matchedNfts.sort((a, b) => byDateDesc(a, b, 'createdAt'));
      matchedDelegates.sort((a, b) => byDateDesc(a, b, 'createdAt'));
      matchedForumThreads.sort((a, b) => byDateDesc(a, b, 'lastReplyAt'));
    }

    return {
      collections: matchedCollections,
      nfts: matchedNfts,
      forumThreads: matchedForumThreads,
      delegates: matchedDelegates
    };
  }

  // getCollectionsFilterOptions()
  getCollectionsFilterOptions() {
    const collections = this._getFromStorage('collections');
    const typesSet = new Set(collections.map((c) => c.type).filter(Boolean));

    const enumTypes = ['avatar', 'art', 'collectible', 'game_item', 'membership', 'other'];
    enumTypes.forEach((t) => typesSet.add(t));

    const types = Array.from(typesSet).map((t) => ({ value: t, label: t.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) }));

    let min = 0;
    let max = 0;
    if (collections.length > 0) {
      const prices = collections.map((c) => c.mintPriceEth || 0);
      min = Math.min.apply(null, prices);
      max = Math.max.apply(null, prices);
    }

    const sortOptions = [
      { value: 'mint_price_low_to_high', label: 'Mint Price: Low to High' },
      { value: 'floor_price_low_to_high', label: 'Floor Price: Low to High' },
      { value: 'created_newest', label: 'Newest' }
    ];

    return {
      types,
      mintPriceRangeDefaults: { min, max },
      sortOptions
    };
  }

  // getCollections(filters, sortBy, page, pageSize)
  getCollections(filters, sortBy = 'created_newest', page = 1, pageSize = 20) {
    const collections = this._getFromStorage('collections');
    const filtered = this._applyCollectionFiltersAndSort(collections, filters || {}, sortBy);

    const p = page < 1 ? 1 : page;
    const size = pageSize < 1 ? 20 : pageSize;
    const start = (p - 1) * size;
    const end = start + size;

    // Instrumentation for task completion tracking (task_1 - task1_collectionFilterParams)
    try {
      if (
        filters &&
        filters.type === 'avatar' &&
        typeof filters.maxMintPriceEth === 'number' &&
        filters.maxMintPriceEth === 0.15 &&
        sortBy === 'mint_price_low_to_high'
      ) {
        localStorage.setItem(
          'task1_collectionFilterParams',
          JSON.stringify({
            type: filters.type,
            minMintPriceEth: filters.minMintPriceEth ?? null,
            maxMintPriceEth: filters.maxMintPriceEth ?? null,
            sortBy,
            page,
            pageSize,
            recordedAt: this._nowIso()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task1_collectionFilterParams):', e);
    }

    return {
      collections: filtered.slice(start, end),
      totalCount: filtered.length,
      page: p,
      pageSize: size
    };
  }

  // getCollectionDetail(collectionId)
  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('collections');
    const listings = this._getFromStorage('nft_listings');

    const collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) {
      return {
        collection: null,
        mintSummary: null,
        marketplaceSummary: null
      };
    }

    const collectionListings = listings.filter((l) => l.collectionId === collectionId && l.status === 'active');

    const mintSummary = {
      totalSupply: collection.totalSupply,
      mintedSupply: collection.mintedSupply,
      mintPriceEth: collection.mintPriceEth,
      isMintingOpen: collection.isMintingOpen
    };

    const marketplaceSummary = {
      activeListingsCount: collectionListings.length,
      floorPriceEth: collection.floorPriceEth,
      ratingAverage: collection.ratingAverage
    };

    return { collection, mintSummary, marketplaceSummary };
  }

  // getCollectionMintOptions(collectionId)
  getCollectionMintOptions(collectionId) {
    const collections = this._getFromStorage('collections');
    const traitOptionsAll = this._getFromStorage('collection_trait_options');

    const collection = collections.find((c) => c.id === collectionId) || null;
    const traitOptions = traitOptionsAll
      .filter((t) => t.collectionId === collectionId)
      .sort((a, b) => {
        if (a.traitType === b.traitType) {
          const ao = typeof a.order === 'number' ? a.order : 0;
          const bo = typeof b.order === 'number' ? b.order : 0;
          return ao - bo;
        }
        return a.traitType.localeCompare(b.traitType);
      })
      .map((t) => ({
        ...t,
        collection: collection
      }));

    return { collection, traitOptions };
  }

  // mintNft(collectionId, selectedTraits, quantity)
  mintNft(collectionId, selectedTraits, quantity = 1) {
    const collections = this._getFromStorage('collections');
    const traitOptionsAll = this._getFromStorage('collection_trait_options');
    const nfts = this._getFromStorage('nfts');

    const collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) {
      return { success: false, nft: null, purchase: null, message: 'Collection not found.' };
    }

    if (!collection.isMintingOpen) {
      return { success: false, nft: null, purchase: null, message: 'Minting is closed for this collection.' };
    }

    const qty = quantity < 1 ? 1 : quantity;
    if (typeof collection.totalSupply === 'number' && typeof collection.mintedSupply === 'number') {
      if (collection.mintedSupply + qty > collection.totalSupply) {
        return { success: false, nft: null, purchase: null, message: 'Not enough remaining supply to mint this quantity.' };
      }
    }

    const traitOptions = traitOptionsAll.filter((t) => t.collectionId === collectionId);
    const traitMapByType = {};
    traitOptions.forEach((t) => {
      if (!traitMapByType[t.traitType]) traitMapByType[t.traitType] = {};
      traitMapByType[t.traitType][t.value] = t;
    });

    const createdNfts = [];
    const firstPrice = collection.mintPriceEth || 0;

    for (let i = 0; i < qty; i++) {
      const nftId = this._generateId('nft');
      const tokenId = this._generateId('token');
      const traitsArray = [];

      if (selectedTraits && typeof selectedTraits === 'object') {
        for (const traitType in selectedTraits) {
          if (!selectedTraits.hasOwnProperty(traitType)) continue;
          const internalValue = selectedTraits[traitType];
          const optionsForType = traitMapByType[traitType];
          let label = internalValue;
          if (optionsForType && optionsForType[internalValue]) {
            label = optionsForType[internalValue].label;
          }
          const typeLabel = traitType.charAt(0).toUpperCase() + traitType.slice(1);
          traitsArray.push(typeLabel + ': ' + label);
        }
      }

      const now = this._nowIso();
      const nft = {
        id: nftId,
        tokenId: tokenId,
        collectionId: collectionId,
        name: (collection.name || 'NFT') + ' #' + nftId.split('_').pop(),
        imageUrl: null,
        description: collection.description || '',
        traits: traitsArray,
        rating: null,
        isOwnedByCurrentUser: true,
        isListedForSale: false,
        currentListingId: null,
        mintPricePaid: firstPrice,
        mintCurrency: 'eth',
        mintedAt: now,
        lastPurchasePrice: null,
        lastPurchaseCurrency: null,
        createdAt: now
      };

      nfts.push(nft);
      createdNfts.push(nft);
    }

    collection.mintedSupply = (collection.mintedSupply || 0) + createdNfts.length;

    const updatedCollections = collections.map((c) => (c.id === collection.id ? collection : c));
    this._saveToStorage('collections', updatedCollections);
    this._saveToStorage('nfts', nfts);

    const firstNft = createdNfts[0];
    const purchase = this._createNftPurchaseRecord(firstNft, firstPrice, 'eth', 1, true, null);

    // Instrumentation for task completion tracking (task_1 - task1_mintResult)
    try {
      const traits = (firstNft && Array.isArray(firstNft.traits)) ? firstNft.traits : [];
      const hasNeonCityBackground = traits.some((t) => typeof t === 'string' && t.includes('Background: Neon City'));
      const hasGlassesAccessory = traits.some((t) => typeof t === 'string' && t.includes('Glasses'));
      if (
        collection &&
        collection.type === 'avatar' &&
        (collection.mintPriceEth || 0) <= 0.15 &&
        hasNeonCityBackground &&
        hasGlassesAccessory
      ) {
        localStorage.setItem(
          'task1_mintResult',
          JSON.stringify({
            nftId: firstNft.id,
            collectionId: collection.id,
            collectionMintPriceEth: collection.mintPriceEth || 0,
            collectionType: collection.type || null,
            traits: firstNft.traits || [],
            mintedAt: firstNft.mintedAt
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task1_mintResult):', e);
    }

    return {
      success: true,
      nft: firstNft,
      purchase,
      message: 'Mint successful.'
    };
  }

  // getCollectionMarketplaceListings(collectionId, filters, sortBy, page, pageSize)
  getCollectionMarketplaceListings(collectionId, filters, sortBy = 'price_low_to_high', page = 1, pageSize = 20) {
    const listings = this._getFromStorage('nft_listings');
    const nfts = this._getFromStorage('nfts');
    const collections = this._getFromStorage('collections');

    // Instrumentation for task completion tracking (task_6 - task6_marketplaceFilterParams)
    try {
      const collectionResolved = collections.find((c) => c.id === collectionId) || null;
      const collectionNameNormalized = (collectionResolved && collectionResolved.name) ? collectionResolved.name.toLowerCase().trim() : '';
      if (
        collectionResolved &&
        collectionNameNormalized === 'cyber cats' &&
        filters &&
        typeof filters.maxPriceEth === 'number' &&
        filters.maxPriceEth === 0.5 &&
        typeof filters.minRating === 'number' &&
        filters.minRating >= 4 &&
        sortBy === 'price_low_to_high'
      ) {
        localStorage.setItem(
          'task6_marketplaceFilterParams',
          JSON.stringify({
            collectionId,
            collectionName: (collections.find(c => c.id === collectionId) || {}).name || null,
            filters: { maxPriceEth: filters.maxPriceEth, minRating: filters.minRating },
            sortBy,
            page,
            pageSize,
            recordedAt: this._nowIso()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task6_marketplaceFilterParams):', e);
    }

    const activeListings = listings.filter(
      (l) => l.collectionId === collectionId && l.status === 'active'
    );

    let items = activeListings.map((l) => {
      const nft = nfts.find((n) => n.id === l.nftId) || null;
      const collection = collections.find((c) => c.id === l.collectionId) || null;
      const listingWithRefs = {
        ...l,
        nft: nft,
        collection: collection
      };
      return { nft, listing: listingWithRefs };
    }).filter((item) => item.nft); // ensure NFT exists

    items = this._applyMarketplaceFiltersAndSort(items, filters || {}, sortBy);

    const p = page < 1 ? 1 : page;
    const size = pageSize < 1 ? 20 : pageSize;
    const start = (p - 1) * size;
    const end = start + size;

    return {
      items: items.slice(start, end),
      totalCount: items.length,
      page: p,
      pageSize: size
    };
  }

  // getNftDetail(nftId)
  getNftDetail(nftId) {
    const nfts = this._getFromStorage('nfts');
    const collections = this._getFromStorage('collections');
    const listings = this._getFromStorage('nft_listings');

    const nft = nfts.find((n) => n.id === nftId) || null;
    if (!nft) {
      return {
        nft: null,
        collection: null,
        activeListing: null,
        ownership: { isOwnedByCurrentUser: false },
        marketHints: { collectionFloorPriceEth: null }
      };
    }

    const collection = collections.find((c) => c.id === nft.collectionId) || null;
    const activeListing = listings.find((l) => l.nftId === nft.id && l.status === 'active') || null;
    const ownership = { isOwnedByCurrentUser: !!nft.isOwnedByCurrentUser };
    const marketHints = { collectionFloorPriceEth: collection ? collection.floorPriceEth : null };

    return { nft, collection, activeListing, ownership, marketHints };
  }

  // getNftListingFormContext(nftId)
  getNftListingFormContext(nftId) {
    const nfts = this._getFromStorage('nfts');
    const collections = this._getFromStorage('collections');

    const nft = nfts.find((n) => n.id === nftId) || null;
    if (!nft) {
      return {
        nft: null,
        collection: null,
        collectionFloorPriceEth: null,
        allowedDurationsDays: [],
        minListingPriceEth: 0
      };
    }

    const collection = collections.find((c) => c.id === nft.collectionId) || null;

    const contextNft = {
      ...nft,
      collection: collection
    };

    const allowedDurationsDays = [1, 3, 7, 30];
    const minListingPriceEth = 0.01;

    // Instrumentation for task completion tracking (task_2 - task2_listingContext)
    try {
      const collectionNameNormalized = (collection && collection.name) ? collection.name.toLowerCase().trim() : '';
      if (nft && collection && collectionNameNormalized === 'galactic guild') {
        localStorage.setItem(
          'task2_listingContext',
          JSON.stringify({
            nftId: nft.id,
            collectionId: nft.collectionId,
            collectionName: (collection && collection.name) || null,
            collectionFloorPriceEth: (collection && typeof collection.floorPriceEth === 'number')
              ? collection.floorPriceEth
              : (function () {
                  const listings = this._getFromStorage('nft_listings');
                  const active = listings.filter(
                    l =>
                      l.collectionId === nft.collectionId &&
                      l.status === 'active' &&
                      typeof l.priceEth === 'number'
                  );
                  if (!active.length) return null;
                  return active.reduce(
                    (min, l) => (l.priceEth < min ? l.priceEth : min),
                    active[0].priceEth
                  );
                }).call(this),
            minListingPriceEth,
            allowedDurationsDays,
            contextGeneratedAt: this._nowIso()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task2_listingContext):', e);
    }

    return {
      nft: contextNft,
      collection,
      collectionFloorPriceEth: (() => {
        if (collection && typeof collection.floorPriceEth === 'number') {
          return collection.floorPriceEth;
        }
        const listings = this._getFromStorage('nft_listings');
        if (!Array.isArray(listings)) {
          return null;
        }
        const activeListings = listings.filter(
          (l) =>
            l.collectionId === nft.collectionId &&
            l.status === 'active' &&
            typeof l.priceEth === 'number'
        );
        if (activeListings.length === 0) {
          return null;
        }
        return activeListings.reduce(
          (min, l) => (l.priceEth < min ? l.priceEth : min),
          activeListings[0].priceEth
        );
      })(),
      allowedDurationsDays,
      minListingPriceEth
    };
  }

  // createNftListing(nftId, priceEth, durationDays, isPrivateSale)
  createNftListing(nftId, priceEth, durationDays, isPrivateSale = false) {
    const nfts = this._getFromStorage('nfts');
    const listings = this._getFromStorage('nft_listings');

    const nftIndex = nfts.findIndex((n) => n.id === nftId);
    if (nftIndex === -1) {
      return { success: false, listing: null, updatedNft: null, message: 'NFT not found.' };
    }

    const nft = nfts[nftIndex];
    if (!nft.isOwnedByCurrentUser) {
      return { success: false, listing: null, updatedNft: null, message: 'You do not own this NFT.' };
    }

    const price = typeof priceEth === 'number' && priceEth > 0 ? priceEth : 0;
    if (price <= 0) {
      return { success: false, listing: null, updatedNft: null, message: 'Price must be greater than zero.' };
    }

    const duration = typeof durationDays === 'number' && durationDays > 0 ? durationDays : 7;
    const now = this._nowIso();
    const endTime = this._addDaysIso(now, duration);

    const listing = {
      id: this._generateId('nft_listing'),
      nftId: nft.id,
      collectionId: nft.collectionId,
      priceEth: price,
      currency: 'eth',
      status: 'active',
      createdAt: now,
      startTime: now,
      endTime: endTime,
      durationDays: duration,
      sellerType: 'current_user',
      isPrivateSale: !!isPrivateSale
    };

    listings.push(listing);

    const updatedNft = {
      ...nft,
      isListedForSale: true,
      currentListingId: listing.id
    };
    nfts[nftIndex] = updatedNft;

    this._saveToStorage('nft_listings', listings);
    this._saveToStorage('nfts', nfts);

    // Instrumentation for task completion tracking (task_2 - task2_listingResult)
    try {
      const collections = this._getFromStorage('collections');
      const collection = collections.find((c) => c.id === nft.collectionId) || null;
      const collectionNameNormalized = (collection && collection.name) ? collection.name.toLowerCase().trim() : '';
      if (collection && collectionNameNormalized === 'galactic guild') {
        localStorage.setItem(
          'task2_listingResult',
          JSON.stringify({
            listingId: listing.id,
            nftId: nft.id,
            collectionId: nft.collectionId,
            priceEth: listing.priceEth,
            durationDays: listing.durationDays,
            isPrivateSale: listing.isPrivateSale,
            createdAt: listing.createdAt
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task2_listingResult):', e);
    }

    return {
      success: true,
      listing,
      updatedNft,
      message: 'Listing created successfully.'
    };
  }

  // buyNftNow(nftId, quantity)
  buyNftNow(nftId, quantity = 1) {
    const nfts = this._getFromStorage('nfts');
    const listings = this._getFromStorage('nft_listings');

    const nftIndex = nfts.findIndex((n) => n.id === nftId);
    if (nftIndex === -1) {
      return { success: false, purchase: null, updatedNft: null, updatedListing: null, message: 'NFT not found.' };
    }

    const nft = nfts[nftIndex];
    let listing = null;
    if (nft.currentListingId) {
      listing = listings.find((l) => l.id === nft.currentListingId && l.status === 'active') || null;
    }
    if (!listing) {
      listing = listings.find((l) => l.nftId === nft.id && l.status === 'active') || null;
    }

    if (!listing) {
      return { success: false, purchase: null, updatedNft: null, updatedListing: null, message: 'No active listing for this NFT.' };
    }

    const qty = quantity < 1 ? 1 : quantity;
    const purchase = this._createNftPurchaseRecord(nft, listing.priceEth, listing.currency, qty, false, listing.id);

    const now = this._nowIso();
    const updatedListing = {
      ...listing,
      status: 'sold',
      endTime: listing.endTime || now
    };

    const listingIndex = listings.findIndex((l) => l.id === listing.id);
    if (listingIndex >= 0) {
      listings[listingIndex] = updatedListing;
    }

    const updatedNft = {
      ...nft,
      isOwnedByCurrentUser: true,
      isListedForSale: false,
      currentListingId: null,
      lastPurchasePrice: listing.priceEth,
      lastPurchaseCurrency: listing.currency
    };
    nfts[nftIndex] = updatedNft;

    this._saveToStorage('nft_listings', listings);
    this._saveToStorage('nfts', nfts);

    // Instrumentation for task completion tracking (task_6 - task6_purchaseResult)
    try {
      const collections = this._getFromStorage('collections');
      const collection = collections.find((c) => c.id === updatedNft.collectionId) || null;
      const collectionNameNormalized = (collection && collection.name) ? collection.name.toLowerCase().trim() : '';
      if (collection && collectionNameNormalized === 'cyber cats') {
        localStorage.setItem(
          'task6_purchaseResult',
          JSON.stringify({
            nftId: updatedNft.id,
            collectionId: updatedNft.collectionId,
            purchaseId: purchase.id,
            priceEth: purchase.price,
            quantity: purchase.quantity,
            purchasedAt: purchase.purchasedAt
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task6_purchaseResult):', e);
    }

    return {
      success: true,
      purchase,
      updatedNft,
      updatedListing,
      message: 'Purchase completed successfully.'
    };
  }

  // getMyNftsFilterOptions()
  getMyNftsFilterOptions() {
    const nfts = this._getFromStorage('nfts');
    const collections = this._getFromStorage('collections');

    const owned = nfts.filter((n) => n.isOwnedByCurrentUser);
    const map = new Map();

    owned.forEach((n) => {
      const cid = n.collectionId;
      if (!cid) return;
      if (!map.has(cid)) {
        map.set(cid, 0);
      }
      map.set(cid, map.get(cid) + 1);
    });

    const collectionFilters = [];
    map.forEach((count, cid) => {
      const col = collections.find((c) => c.id === cid);
      collectionFilters.push({
        collectionId: cid,
        collectionName: col ? col.name : cid,
        ownedCount: count
      });
    });

    const statusOptions = [
      { value: 'all', label: 'All' },
      { value: 'listed', label: 'Listed for Sale' },
      { value: 'unlisted', label: 'Not Listed' },
      { value: 'staked', label: 'Staked' }
    ];

    return {
      collections: collectionFilters,
      statusOptions
    };
  }

  // getMyNfts(filters, page, pageSize)
  getMyNfts(filters, page = 1, pageSize = 24) {
    const nfts = this._getFromStorage('nfts');
    const collections = this._getFromStorage('collections');

    let owned = nfts.filter((n) => n.isOwnedByCurrentUser);

    if (filters) {
      const { collectionId, status } = filters;
      if (collectionId) {
        owned = owned.filter((n) => n.collectionId === collectionId);
      }
      if (status) {
        if (status === 'listed') {
          owned = owned.filter((n) => n.isListedForSale);
        } else if (status === 'unlisted') {
          owned = owned.filter((n) => !n.isListedForSale);
        } else if (status === 'staked') {
          // No explicit stake flag on NFT; placeholder for future logic
          owned = [];
        }
      }
    }

    const withCollections = owned.map((n) => ({
      ...n,
      collection: collections.find((c) => c.id === n.collectionId) || null
    }));

    const p = page < 1 ? 1 : page;
    const size = pageSize < 1 ? 24 : pageSize;
    const start = (p - 1) * size;
    const end = start + size;

    // Instrumentation for task completion tracking (task_2 - task2_myNftsFilterParams)
    try {
      if (filters && filters.collectionId) {
        const collection = collections.find((c) => c.id === filters.collectionId) || null;
        const collectionName = collection && collection.name ? collection.name : null;
        const normalizedName = collectionName ? collectionName.toLowerCase().trim() : '';
        if (collection && (collectionName === 'Galactic Guild' || normalizedName === 'galactic guild')) {
          localStorage.setItem(
            'task2_myNftsFilterParams',
            JSON.stringify({
              collectionId: filters.collectionId,
              collectionName: (collections.find(c => c.id === filters.collectionId) || {}).name || null,
              status: filters.status || 'all',
              page,
              pageSize,
              recordedAt: this._nowIso()
            })
          );
        }
      }
    } catch (e) {
      console.error('Instrumentation error (task2_myNftsFilterParams):', e);
    }

    return {
      nfts: withCollections.slice(start, end),
      totalCount: withCollections.length,
      page: p,
      pageSize: size
    };
  }

  // getDaoOverview()
  getDaoOverview() {
    const governanceProfile = this._getOrCreateGovernanceProfile();
    const proposals = this._getFromStorage('proposals');
    const stakePositions = this._getFromStorage('stake_positions');
    const treasuryAccounts = this._getFromStorage('treasury_accounts');
    const treasuryTransactions = this._getFromStorage('treasury_transactions');

    const activeProposalsCount = proposals.filter((p) => p.status === 'active').length;
    const totalStakedGov = stakePositions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    const treasuryGovBalance = treasuryAccounts
      .filter((a) => a.tokenSymbol === 'gov')
      .reduce((sum, a) => sum + (a.balance || 0), 0);

    const treasuryEthBalance = treasuryAccounts
      .filter((a) => a.tokenSymbol === 'eth')
      .reduce((sum, a) => sum + (a.balance || 0), 0);

    const recentProposals = proposals.slice().sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    }).slice(0, 5);

    const accounts = treasuryAccounts;
    const recentTreasuryTransactions = treasuryTransactions.slice().sort((a, b) => {
      const da = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
      const db = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
      return db - da;
    }).slice(0, 5).map((tx) => ({
      ...tx,
      treasuryAccount: accounts.find((a) => a.id === tx.treasuryAccountId) || null,
      relatedProposal: proposals.find((p) => p.id === tx.relatedProposalId) || null
    }));

    return {
      governanceProfile,
      globalStats: {
        activeProposalsCount,
        totalStakedGov,
        treasuryGovBalance,
        treasuryEthBalance
      },
      recentProposals,
      recentTreasuryTransactions
    };
  }

  // getStakingPools(tokenSymbol, status)
  getStakingPools(tokenSymbol = 'gov', status) {
    const pools = this._getFromStorage('staking_pools');

    let filtered = pools.filter((p) => !tokenSymbol || p.tokenSymbol === tokenSymbol);
    if (status) {
      filtered = filtered.filter((p) => p.status === status);
    }

    return filtered;
  }

  // createStakePosition(stakingPoolId, amount, autoRestakeRewards)
  createStakePosition(stakingPoolId, amount, autoRestakeRewards = false) {
    const pools = this._getFromStorage('staking_pools');
    const stakePositions = this._getFromStorage('stake_positions');
    const pool = pools.find((p) => p.id === stakingPoolId) || null;
    if (!pool) {
      return { success: false, stakePosition: null, updatedGovernanceProfile: null, message: 'Staking pool not found.' };
    }

    if (pool.status !== 'active') {
      return { success: false, stakePosition: null, updatedGovernanceProfile: null, message: 'Staking pool is not active.' };
    }

    const amt = typeof amount === 'number' && amount > 0 ? amount : 0;
    if (amt <= 0) {
      return { success: false, stakePosition: null, updatedGovernanceProfile: null, message: 'Stake amount must be greater than zero.' };
    }

    if (typeof pool.minimumStakeAmount === 'number' && amt < pool.minimumStakeAmount) {
      return { success: false, stakePosition: null, updatedGovernanceProfile: null, message: 'Stake amount is below pool minimum.' };
    }

    if (typeof pool.maximumStakeAmount === 'number' && amt > pool.maximumStakeAmount) {
      return { success: false, stakePosition: null, updatedGovernanceProfile: null, message: 'Stake amount exceeds pool maximum.' };
    }

    const governanceProfile = this._getOrCreateGovernanceProfile();
    if ((governanceProfile.govLiquidBalance || 0) < amt) {
      return { success: false, stakePosition: null, updatedGovernanceProfile: null, message: 'Insufficient GOV liquid balance.' };
    }

    const now = this._nowIso();
    const lockEndAt = pool.lockPeriodDays ? this._addDaysIso(now, pool.lockPeriodDays) : null;

    const stakePosition = {
      id: this._generateId('stake_position'),
      stakingPoolId: pool.id,
      amount: amt,
      tokenSymbol: 'gov',
      autoRestakeRewards: !!autoRestakeRewards,
      stakedAt: now,
      lockEndAt: lockEndAt,
      status: 'active',
      rewardsAccrued: 0
    };

    stakePositions.push(stakePosition);
    this._saveToStorage('stake_positions', stakePositions);

    const updatedProfile = {
      ...governanceProfile,
      govLiquidBalance: (governanceProfile.govLiquidBalance || 0) - amt,
      govStakedBalance: (governanceProfile.govStakedBalance || 0) + amt
    };
    updatedProfile.votingPowerTotal = (updatedProfile.govLiquidBalance || 0) + (updatedProfile.govStakedBalance || 0);
    updatedProfile.votingPowerAvailable = updatedProfile.votingPowerTotal - (updatedProfile.votingPowerDelegatedOut || 0);
    updatedProfile.lastUpdatedAt = now;
    this._saveGovernanceProfile(updatedProfile);

    return {
      success: true,
      stakePosition,
      updatedGovernanceProfile: updatedProfile,
      message: 'Stake created successfully.'
    };
  }

  // getUserStakePositions()
  getUserStakePositions() {
    const stakePositions = this._getFromStorage('stake_positions');
    const pools = this._getFromStorage('staking_pools');

    return stakePositions.map((s) => ({
      ...s,
      stakingPool: pools.find((p) => p.id === s.stakingPoolId) || null
    }));
  }

  // getProposalsList(filters, sortBy, page, pageSize)
  getProposalsList(filters, sortBy = 'newest', page = 1, pageSize = 20) {
    const proposals = this._getFromStorage('proposals');

    let result = proposals.slice();
    if (filters) {
      const { status, category, tag, searchQuery } = filters;
      if (status) {
        result = result.filter((p) => p.status === status);
      }
      if (category) {
        result = result.filter((p) => p.category === category);
      }
      if (tag) {
        result = result.filter((p) => Array.isArray(p.tags) && p.tags.includes(tag));
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter((p) => (p.title && p.title.toLowerCase().includes(q)) || (p.description && p.description.toLowerCase().includes(q)));
      }
    }

    switch (sortBy) {
      case 'requested_amount_low_to_high':
        result.sort((a, b) => (a.requestedAmount || 0) - (b.requestedAmount || 0));
        break;
      case 'requested_amount_high_to_low':
        result.sort((a, b) => (b.requestedAmount || 0) - (a.requestedAmount || 0));
        break;
      case 'ending_soon':
        result.sort((a, b) => {
          const da = a.endDate ? new Date(a.endDate).getTime() : 0;
          const db = b.endDate ? new Date(b.endDate).getTime() : 0;
          return da - db;
        });
        break;
      case 'newest':
      default:
        result.sort((a, b) => {
          const da = a.startDate ? new Date(a.startDate).getTime() : 0;
          const db = b.startDate ? new Date(b.startDate).getTime() : 0;
          return db - da;
        });
        break;
    }

    const p = page < 1 ? 1 : page;
    const size = pageSize < 1 ? 20 : pageSize;
    const start = (p - 1) * size;
    const end = start + size;

    return {
      proposals: result.slice(start, end),
      totalCount: result.length,
      page: p,
      pageSize: size
    };
  }

  // getProposalDetail(proposalId)
  getProposalDetail(proposalId) {
    const proposals = this._getFromStorage('proposals');
    const votes = this._getFromStorage('votes');

    const proposal = proposals.find((p) => p.id === proposalId) || null;
    const governanceProfile = this._getOrCreateGovernanceProfile();
    const userVote = votes.find((v) => v.proposalId === proposalId) || null;

    return {
      proposal,
      governanceProfile,
      userVote
    };
  }

  // castVoteOnProposal(proposalId, choice, votingPowerPercent)
  castVoteOnProposal(proposalId, choice, votingPowerPercent) {
    const allowedChoices = ['for', 'against', 'abstain'];
    if (!allowedChoices.includes(choice)) {
      return { success: false, vote: null, updatedGovernanceProfile: null, message: 'Invalid vote choice.' };
    }

    const proposals = this._getFromStorage('proposals');
    const votes = this._getFromStorage('votes');
    const proposalIndex = proposals.findIndex((p) => p.id === proposalId);
    if (proposalIndex === -1) {
      return { success: false, vote: null, updatedGovernanceProfile: null, message: 'Proposal not found.' };
    }

    const proposal = proposals[proposalIndex];
    if (proposal.status !== 'active') {
      return { success: false, vote: null, updatedGovernanceProfile: null, message: 'Proposal is not active.' };
    }

    const governanceProfile = this._getOrCreateGovernanceProfile();
    const percent = Math.max(0, Math.min(100, Number(votingPowerPercent) || 0));
    if (percent <= 0) {
      return { success: false, vote: null, updatedGovernanceProfile: null, message: 'Voting power percent must be greater than zero.' };
    }

    const available = governanceProfile.votingPowerAvailable || 0;
    if (available <= 0) {
      return { success: false, vote: null, updatedGovernanceProfile: null, message: 'No available voting power.' };
    }

    const votingPowerUsed = (available * percent) / 100;
    if (votingPowerUsed <= 0) {
      return { success: false, vote: null, updatedGovernanceProfile: null, message: 'Calculated voting power used is zero.' };
    }

    const now = this._nowIso();
    const vote = {
      id: this._generateId('vote'),
      proposalId,
      choice,
      votingPowerUsed,
      castAt: now
    };

    votes.push(vote);
    this._saveToStorage('votes', votes);

    const updatedProfile = this._updateVotingPowerAfterVote(governanceProfile, votingPowerUsed);

    // Update proposal tallies
    const updatedProposal = { ...proposal };
    if (choice === 'for') {
      updatedProposal.totalVotesFor = (updatedProposal.totalVotesFor || 0) + votingPowerUsed;
    } else if (choice === 'against') {
      updatedProposal.totalVotesAgainst = (updatedProposal.totalVotesAgainst || 0) + votingPowerUsed;
    } else if (choice === 'abstain') {
      updatedProposal.totalVotesAbstain = (updatedProposal.totalVotesAbstain || 0) + votingPowerUsed;
    }

    const totalVotes = (updatedProposal.totalVotesFor || 0) + (updatedProposal.totalVotesAgainst || 0) + (updatedProposal.totalVotesAbstain || 0);
    const totalPower = updatedProfile.votingPowerTotal || 0;
    updatedProposal.votingPowerParticipationPercent = totalPower > 0 ? (totalVotes / totalPower) * 100 : 0;
    updatedProposal.updatedAt = now;

    proposals[proposalIndex] = updatedProposal;
    this._saveToStorage('proposals', proposals);

    return {
      success: true,
      vote,
      updatedGovernanceProfile: updatedProfile,
      message: 'Vote cast successfully.'
    };
  }

  // getNewProposalFormDefaults()
  getNewProposalFormDefaults() {
    const tokens = this._getFromStorage('tokens');
    const { startDate } = this._computeProposalDates();
    const defaultStartDate = startDate;
    const defaultDurationDays = 7;
    const defaultQuorumPercent = 5;

    const allowedCategories = [
      { value: 'treasury', label: 'Treasury' },
      { value: 'governance', label: 'Governance' },
      { value: 'community', label: 'Community' },
      { value: 'protocol', label: 'Protocol' },
      { value: 'other', label: 'Other' }
    ];

    return {
      allowedCategories,
      tokenOptions: tokens,
      defaultStartDate,
      defaultDurationDays,
      defaultQuorumPercent
    };
  }

  // createProposal(title, category, description, requestedAmount, requestedTokenSymbol, startDate, endDate, quorumPercent, tags)
  createProposal(title, category, description, requestedAmount, requestedTokenSymbol, startDate, endDate, quorumPercent, tags) {
    const proposals = this._getFromStorage('proposals');

    const now = this._nowIso();
    const start = startDate || now;
    const end = endDate || this._addDaysIso(start, 7);
    const requestedAmt = Number(requestedAmount) || 0;
    const quorum = Number(quorumPercent) || 0;

    const startMs = new Date(start).getTime();
    const nowMs = new Date(now).getTime();
    const status = startMs > nowMs ? 'pending' : 'active';

    const proposal = {
      id: this._generateId('proposal'),
      title,
      category,
      description,
      requestedAmount: requestedAmt,
      requestedTokenSymbol,
      status,
      startDate: start,
      endDate: end,
      quorumPercent: quorum,
      tags: Array.isArray(tags) ? tags : [],
      createdAt: now,
      updatedAt: now,
      totalVotesFor: 0,
      totalVotesAgainst: 0,
      totalVotesAbstain: 0,
      votingPowerParticipationPercent: 0
    };

    proposals.push(proposal);
    this._saveToStorage('proposals', proposals);

    return {
      success: true,
      proposal,
      message: 'Proposal created successfully.'
    };
  }

  // getTreasuryOverview()
  getTreasuryOverview() {
    const accounts = this._getFromStorage('treasury_accounts');
    const transactions = this._getFromStorage('treasury_transactions');
    const proposals = this._getFromStorage('proposals');

    const totals = {
      gov: accounts.filter((a) => a.tokenSymbol === 'gov').reduce((sum, a) => sum + (a.balance || 0), 0),
      eth: accounts.filter((a) => a.tokenSymbol === 'eth').reduce((sum, a) => sum + (a.balance || 0), 0)
    };

    const recentTransactions = transactions.slice().sort((a, b) => {
      const da = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
      const db = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
      return db - da;
    }).slice(0, 5).map((tx) => ({
      ...tx,
      treasuryAccount: accounts.find((a) => a.id === tx.treasuryAccountId) || null,
      relatedProposal: proposals.find((p) => p.id === tx.relatedProposalId) || null
    }));

    return {
      accounts,
      totals,
      recentTransactions
    };
  }

  // getTreasuryTransactions(filters, sortBy, page, pageSize)
  getTreasuryTransactions(filters, sortBy = 'date_newest_first', page = 1, pageSize = 25) {
    const transactions = this._getFromStorage('treasury_transactions');
    const accounts = this._getFromStorage('treasury_accounts');
    const proposals = this._getFromStorage('proposals');

    let result = transactions.slice();
    if (filters) {
      const { direction, minAmount, tokenSymbol, relatedProposalId } = filters;
      if (direction) {
        result = result.filter((t) => t.direction === direction);
      }
      if (typeof minAmount === 'number') {
        result = result.filter((t) => (t.amount || 0) >= minAmount);
      }
      if (tokenSymbol) {
        result = result.filter((t) => t.tokenSymbol === tokenSymbol);
      }
      if (relatedProposalId) {
        result = result.filter((t) => t.relatedProposalId === relatedProposalId);
      }
    }

    switch (sortBy) {
      case 'date_oldest_first':
        result.sort((a, b) => {
          const da = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
          const db = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
          return da - db;
        });
        break;
      case 'amount_high_to_low':
        result.sort((a, b) => (b.amount || 0) - (a.amount || 0));
        break;
      case 'date_newest_first':
      default:
        result.sort((a, b) => {
          const da = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
          const db = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
          return db - da;
        });
        break;
    }

    const enriched = result.map((tx) => ({
      ...tx,
      treasuryAccount: accounts.find((a) => a.id === tx.treasuryAccountId) || null,
      relatedProposal: proposals.find((p) => p.id === tx.relatedProposalId) || null
    }));

    const p = page < 1 ? 1 : page;
    const size = pageSize < 1 ? 25 : pageSize;
    const start = (p - 1) * size;
    const end = start + size;

    return {
      transactions: enriched.slice(start, end),
      totalCount: enriched.length,
      page: p,
      pageSize: size
    };
  }

  // getTreasuryTransactionDetail(transactionId)
  getTreasuryTransactionDetail(transactionId) {
    const transactions = this._getFromStorage('treasury_transactions');
    const accounts = this._getFromStorage('treasury_accounts');
    const proposals = this._getFromStorage('proposals');

    const tx = transactions.find((t) => t.id === transactionId) || null;
    if (!tx) {
      return { transaction: null, relatedProposal: null };
    }

    const enriched = {
      ...tx,
      treasuryAccount: accounts.find((a) => a.id === tx.treasuryAccountId) || null
    };

    const relatedProposal = proposals.find((p) => p.id === tx.relatedProposalId) || null;

    return { transaction: enriched, relatedProposal };
  }

  // updateTreasuryTransactionWatchlist(transactionId, isWatchlisted, watchlistNote)
  updateTreasuryTransactionWatchlist(transactionId, isWatchlisted, watchlistNote) {
    const transactions = this._getFromStorage('treasury_transactions');
    const idx = transactions.findIndex((t) => t.id === transactionId);
    if (idx === -1) {
      return { success: false, transaction: null, message: 'Transaction not found.' };
    }

    const tx = transactions[idx];
    const updated = this._updateTreasuryTransactionWatchlistState(tx, isWatchlisted, watchlistNote);

    transactions[idx] = updated;
    this._saveToStorage('treasury_transactions', transactions);

    return {
      success: true,
      transaction: updated,
      message: 'Watchlist updated.'
    };
  }

  // getDelegates(filters, sortBy, page, pageSize)
  getDelegates(filters, sortBy = 'reputation_high_to_low', page = 1, pageSize = 20) {
    const delegates = this._getFromStorage('delegates');

    let result = delegates.slice();
    if (filters) {
      const { minReputationScore, searchQuery } = filters;
      if (typeof minReputationScore === 'number') {
        result = result.filter((d) => (d.reputationScore || 0) >= minReputationScore);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter((d) => (d.name && d.name.toLowerCase().includes(q)) || (d.bio && d.bio.toLowerCase().includes(q)));
      }
    }

    switch (sortBy) {
      case 'reputation_low_to_high':
        result.sort((a, b) => (a.reputationScore || 0) - (b.reputationScore || 0));
        break;
      case 'delegated_power_high_to_low':
        result.sort((a, b) => (b.totalDelegatedPower || 0) - (a.totalDelegatedPower || 0));
        break;
      case 'reputation_high_to_low':
      default:
        result.sort((a, b) => (b.reputationScore || 0) - (a.reputationScore || 0));
        break;
    }

    const p = page < 1 ? 1 : page;
    const size = pageSize < 1 ? 20 : pageSize;
    const start = (p - 1) * size;
    const end = start + size;

    return {
      delegates: result.slice(start, end),
      totalCount: result.length,
      page: p,
      pageSize: size
    };
  }

  // getDelegateProfile(delegateId)
  getDelegateProfile(delegateId) {
    const delegates = this._getFromStorage('delegates');
    const delegations = this._getFromStorage('delegations');

    const delegate = delegates.find((d) => d.id === delegateId) || null;
    const currentDelegation = delegations.find((d) => d.delegateId === delegateId && d.isActive) || null;
    const governanceProfile = this._getOrCreateGovernanceProfile();

    return {
      delegate,
      currentDelegation,
      governanceProfile
    };
  }

  // createDelegation(delegateId, amount, delegationType)
  createDelegation(delegateId, amount, delegationType) {
    const delegates = this._getFromStorage('delegates');
    const delegations = this._getFromStorage('delegations');

    const delegate = delegates.find((d) => d.id === delegateId) || null;
    if (!delegate) {
      return { success: false, delegation: null, updatedGovernanceProfile: null, message: 'Delegate not found.' };
    }

    if (!['full_voting_rights', 'partial', 'custom'].includes(delegationType)) {
      return { success: false, delegation: null, updatedGovernanceProfile: null, message: 'Invalid delegation type.' };
    }

    const amt = Number(amount) || 0;
    if (amt <= 0) {
      return { success: false, delegation: null, updatedGovernanceProfile: null, message: 'Delegation amount must be greater than zero.' };
    }

    const governanceProfile = this._getOrCreateGovernanceProfile();
    if ((governanceProfile.votingPowerAvailable || 0) < amt) {
      return { success: false, delegation: null, updatedGovernanceProfile: null, message: 'Insufficient available voting power.' };
    }

    const now = this._nowIso();
    const delegation = {
      id: this._generateId('delegation'),
      delegateId,
      amount: amt,
      delegationType,
      createdAt: now,
      isActive: true
    };

    delegations.push(delegation);
    this._saveToStorage('delegations', delegations);

    const updatedProfile = {
      ...governanceProfile,
      votingPowerDelegatedOut: (governanceProfile.votingPowerDelegatedOut || 0) + amt,
      votingPowerAvailable: (governanceProfile.votingPowerAvailable || 0) - amt,
      lastUpdatedAt: now
    };
    this._saveGovernanceProfile(updatedProfile);

    return {
      success: true,
      delegation,
      updatedGovernanceProfile: updatedProfile,
      message: 'Delegation created successfully.'
    };
  }

  // getForumCategories()
  getForumCategories() {
    return this._getFromStorage('forum_categories');
  }

  // getForumThreads(categoryId, sortBy, page, pageSize)
  getForumThreads(categoryId, sortBy = 'newest', page = 1, pageSize = 20) {
    const threads = this._getFromStorage('forum_threads');
    const categories = this._getFromStorage('forum_categories');

    let result = threads.filter((t) => t.categoryId === categoryId);

    switch (sortBy) {
      case 'oldest':
        result.sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return da - db;
        });
        break;
      case 'most_replied':
        result.sort((a, b) => (b.replyCount || 0) - (a.replyCount || 0));
        break;
      case 'newest':
      default:
        result.sort((a, b) => {
          const da = a.lastReplyAt ? new Date(a.lastReplyAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const db = b.lastReplyAt ? new Date(b.lastReplyAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return db - da;
        });
        break;
    }

    const withCategory = result.map((t) => ({
      ...t,
      category: categories.find((c) => c.id === t.categoryId) || null
    }));

    // Instrumentation for task completion tracking (task_8 - task8_governanceThreadsSnapshot)
    try {
      const category = categories.find((c) => c.id === categoryId) || null;
      const isGovernanceCategory =
        category &&
        (
          (category.name && category.name.toLowerCase() === 'governance') ||
          category.id === 'governance'
        );
      if (isGovernanceCategory && sortBy === 'newest' && page === 1) {
        localStorage.setItem(
          'task8_governanceThreadsSnapshot',
          JSON.stringify({
            categoryId,
            categoryName: (categories.find(c => c.id === categoryId) || {}).name || null,
            sortBy,
            page,
            pageSize,
            threadIds: withCategory.map(t => t.id),
            recordedAt: this._nowIso()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task8_governanceThreadsSnapshot):', e);
    }

    const p = page < 1 ? 1 : page;
    const size = pageSize < 1 ? 20 : pageSize;
    const start = (p - 1) * size;
    const end = start + size;

    return {
      threads: withCategory.slice(start, end),
      totalCount: withCategory.length,
      page: p,
      pageSize: size
    };
  }

  // getForumThreadDetail(threadId)
  getForumThreadDetail(threadId) {
    const threads = this._getFromStorage('forum_threads');
    const posts = this._getFromStorage('forum_posts');
    const categories = this._getFromStorage('forum_categories');

    const thread = threads.find((t) => t.id === threadId) || null;
    if (!thread) {
      return { thread: null, posts: [], category: null };
    }

    const category = categories.find((c) => c.id === thread.categoryId) || null;

    const threadPosts = posts
      .filter((p) => p.threadId === threadId)
      .sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return da - db;
      })
      .map((p) => ({
        ...p,
        thread: thread
      }));

    return {
      thread,
      posts: threadPosts,
      category
    };
  }

  // createForumPost(threadId, body)
  createForumPost(threadId, body) {
    const threads = this._getFromStorage('forum_threads');
    const posts = this._getFromStorage('forum_posts');

    const threadIndex = threads.findIndex((t) => t.id === threadId);
    if (threadIndex === -1) {
      return { success: false, post: null, updatedThread: null, message: 'Thread not found.' };
    }

    const now = this._nowIso();
    const post = {
      id: this._generateId('forum_post'),
      threadId,
      body,
      createdAt: now,
      updatedAt: null,
      isOriginalPost: false
    };

    posts.push(post);
    this._saveToStorage('forum_posts', posts);

    const thread = threads[threadIndex];
    const updatedThread = {
      ...thread,
      replyCount: (thread.replyCount || 0) + 1,
      lastReplyAt: now,
      updatedAt: now
    };

    threads[threadIndex] = updatedThread;
    this._saveToStorage('forum_threads', threads);

    // Instrumentation for task completion tracking (task_8 - task8_replyPost)
    try {
      const categories = this._getFromStorage('forum_categories');
      const governanceCategory = categories.find(
        (c) =>
          (c.name && c.name.toLowerCase() === 'governance') ||
          c.id === 'governance'
      ) || null;
      const isGovernanceThread =
        governanceCategory &&
        (threads[threadIndex].categoryId === governanceCategory.id || threads[threadIndex].categoryId === 'governance');
      if (body === 'I support this direction.' && isGovernanceThread) {
        localStorage.setItem(
          'task8_replyPost',
          JSON.stringify({
            postId: post.id,
            threadId: threadId,
            body,
            createdAt: post.createdAt,
            categoryId: threads[threadIndex].categoryId
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task8_replyPost):', e);
    }

    const postWithThread = {
      ...post,
      thread: updatedThread
    };

    return {
      success: true,
      post: postWithThread,
      updatedThread,
      message: 'Reply posted successfully.'
    };
  }

  // createForumThread(categoryId, title, body, tags)
  createForumThread(categoryId, title, body, tags) {
    const threads = this._getFromStorage('forum_threads');
    const posts = this._getFromStorage('forum_posts');
    const categories = this._getFromStorage('forum_categories');

    const category = categories.find((c) => c.id === categoryId) || null;
    if (!category) {
      return { success: false, thread: null, message: 'Category not found.' };
    }

    const now = this._nowIso();
    const thread = {
      id: this._generateId('forum_thread'),
      categoryId,
      title,
      body,
      tags: Array.isArray(tags) ? tags : [],
      createdAt: now,
      updatedAt: now,
      replyCount: 0,
      lastReplyAt: now
    };

    threads.push(thread);
    this._saveToStorage('forum_threads', threads);

    const originalPost = {
      id: this._generateId('forum_post'),
      threadId: thread.id,
      body,
      createdAt: now,
      updatedAt: null,
      isOriginalPost: true
    };

    posts.push(originalPost);
    this._saveToStorage('forum_posts', posts);

    return {
      success: true,
      thread,
      message: 'Thread created successfully.'
    };
  }

  // getAboutContent()
  getAboutContent() {
    return {
      title: 'About Our NFT DAO Community',
      sections: [
        {
          heading: 'Mission',
          body: 'Our mission is to empower creators and collectors with transparent governance over NFT collections, staking, and treasury management.'
        },
        {
          heading: 'Minting',
          body: 'Mint avatar and art NFTs directly from curated collections. Each mint is recorded on-chain and in your account state for use across the platform.'
        },
        {
          heading: 'Governance & Staking',
          body: 'Stake GOV tokens to participate in proposals, delegate your voting power, and help steer treasury usage and protocol upgrades.'
        },
        {
          heading: 'Community',
          body: 'Use the forum to discuss proposals, share ideas, and coordinate community initiatives such as art bounties and onboarding improvements.'
        }
      ],
      roadmapItems: [
        {
          title: 'Expanded Staking Strategies',
          description: 'Introduce additional lock periods and boosted pools for long-term GOV holders.',
          status: 'planned'
        },
        {
          title: 'Advanced Proposal Analytics',
          description: 'Provide deeper insights into voting patterns and delegate performance.',
          status: 'in_progress'
        },
        {
          title: 'Cross-Collection Utility',
          description: 'Enable NFTs from multiple collections to unlock shared experiences and governance rights.',
          status: 'planned'
        }
      ]
    };
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    return {
      faqs: [
        {
          question: 'How do I mint an avatar NFT?',
          answer: 'Navigate to the Collections page, filter by avatar type, select a collection with open minting, configure your traits, and confirm the mint transaction.'
        },
        {
          question: 'How is my voting power calculated?',
          answer: 'Your voting power is derived from your GOV balance, including staked GOV, minus any amounts you have delegated out to other delegates.'
        },
        {
          question: 'What is a Treasury proposal?',
          answer: 'Treasury proposals request GOV from the DAO treasury for specific initiatives, such as community bounties or development milestones.'
        },
        {
          question: 'How do I delegate my votes?',
          answer: 'Open the DAO > Delegates page, filter and sort by reputation, choose a delegate, and specify how much voting power you want to delegate with full or partial rights.'
        }
      ],
      guides: [
        {
          slug: 'mint_avatar_nft',
          title: 'Mint an Avatar NFT',
          summary: 'Step-by-step guide to minting a new avatar NFT with custom traits under your preferred price.',
          relatedTasks: ['task_1']
        },
        {
          slug: 'stake_gov_tokens',
          title: 'Stake GOV Tokens',
          summary: 'Learn how to choose a staking pool, lock period, and enable auto-restake for your GOV.',
          relatedTasks: ['task_3']
        },
        {
          slug: 'vote_on_proposals',
          title: 'Vote on DAO Proposals',
          summary: 'Understand proposal details and cast votes using your available voting power.',
          relatedTasks: ['task_4']
        },
        {
          slug: 'create_treasury_proposal',
          title: 'Create a Treasury Proposal',
          summary: 'Draft and submit a funding proposal requesting GOV from the treasury.',
          relatedTasks: ['task_5']
        },
        {
          slug: 'delegate_voting_power',
          title: 'Delegate Your Voting Power',
          summary: 'Delegate votes to a high-reputation delegate with full voting rights.',
          relatedTasks: ['task_7']
        }
      ]
    };
  }

  // getLegalDocuments()
  getLegalDocuments() {
    return {
      termsOfUse: 'These Terms of Use govern your access to and use of the NFT minting, marketplace, and DAO governance features provided by this platform. By using the site, you agree to abide by all applicable laws and these terms.',
      privacyPolicy: 'We collect and process limited personal data necessary to provide the platform, such as wallet addresses and usage analytics. We do not sell your personal information to third parties.',
      riskNotices: 'Digital assets such as NFTs and tokens are highly volatile and can result in loss of funds. Nothing on this platform constitutes financial, investment, or legal advice. Always do your own research and only stake or spend what you can afford to lose.'
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