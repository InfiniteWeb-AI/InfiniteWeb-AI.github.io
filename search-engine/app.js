// --- State ---
let miniSearch = null;
let siteIndex = {};
let allResults = [];
let filteredResults = [];
let currentQuery = '';
let currentPage = 1;
let indexReady = false;
let siteFilterExpanded = false;
const RESULTS_PER_PAGE = 10;
const SITE_FILTER_COLLAPSED = 8;

// --- DOM refs ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const homeView = $('#home-view');
const resultsView = $('#results-view');
const loadingOverlay = $('#loading-overlay');
const homeInput = $('#home-search-input');
const resultsInput = $('#results-search-input');
const homeForm = $('#home-search-form');
const resultsForm = $('#results-search-form');
const resultsList = $('#results-list');
const resultsInfo = $('#results-info');
const pagination = $('#pagination');
const siteFilterList = $('#site-filter-list');
const siteFilterToggle = $('#site-filter-toggle');
const logoLink = $('#logo-link');
const homeSuggestions = $('#home-suggestions');
const resultsSuggestions = $('#results-suggestions');
const homeStats = $('#home-stats-text');

// --- Index Loading ---
async function loadIndex() {
  try {
    const resp = await fetch('search_index.json');
    const data = await resp.json();

    data.sites.forEach(s => { siteIndex[s.id] = s; });

    miniSearch = new MiniSearch({
      fields: ['title', 'headings', 'body', 'metaDesc', 'linkTitles', 'siteName', 'dataKeywords'],
      storeFields: ['title', 'siteName', 'siteId', 'url', 'fileName', 'pageName', 'metaDesc', 'body'],
      searchOptions: {
        boost: { title: 3, siteName: 2, headings: 2, metaDesc: 1.5, dataKeywords: 1.2, body: 1, linkTitles: 0.8 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
    miniSearch.addAll(data.pages);

    indexReady = true;
    homeStats.textContent = `${data.metadata.totalSites} websites \u00B7 ${data.metadata.totalPages} pages indexed`;
    loadingOverlay.hidden = true;

    // Check URL for query
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      homeInput.value = q;
      resultsInput.value = q;
      executeSearch(q);
    }
  } catch (err) {
    loadingOverlay.querySelector('p').textContent = 'Failed to load search index.';
    console.error('Index load error:', err);
  }
}

// --- Search ---
function executeSearch(query) {
  if (!query.trim() || !indexReady) return;

  currentQuery = query.trim();
  allResults = miniSearch.search(currentQuery, { combineWith: 'OR' });
  filteredResults = [...allResults];
  currentPage = 1;

  buildSiteFilters(allResults);
  renderResults();
  renderPagination();
  showView('results');

  resultsInput.value = currentQuery;
  history.replaceState(null, '', `?q=${encodeURIComponent(currentQuery)}`);
}

// --- Snippet Generation ---
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function generateSnippet(result, query, maxLen) {
  maxLen = maxLen || 220;
  const text = result.body || result.metaDesc || '';
  if (!text) return escapeHtml(result.metaDesc || result.title || '');

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lowerText = text.toLowerCase();

  let bestStart = 0;
  let bestScore = -1;

  const step = 15;
  const limit = Math.min(text.length, 1800);
  for (let i = 0; i < limit; i += step) {
    const end = Math.min(i + maxLen, text.length);
    const window = lowerText.substring(i, end);
    let score = 0;
    terms.forEach(t => {
      if (window.includes(t)) score++;
    });
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
    if (score === terms.length) break;
  }

  let snippet = text.substring(bestStart, bestStart + maxLen).trim();
  if (bestStart > 0) snippet = '...' + snippet;
  if (bestStart + maxLen < text.length) snippet += '...';

  snippet = escapeHtml(snippet);

  terms.forEach(term => {
    const regex = new RegExp('(' + escapeRegex(term) + ')', 'gi');
    snippet = snippet.replace(regex, '<mark>$1</mark>');
  });

  return snippet;
}

function highlightTerms(text, query) {
  let safe = escapeHtml(text);
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  terms.forEach(term => {
    const regex = new RegExp('(' + escapeRegex(term) + ')', 'gi');
    safe = safe.replace(regex, '<mark>$1</mark>');
  });
  return safe;
}

// --- Rendering ---
function renderResults() {
  const start = (currentPage - 1) * RESULTS_PER_PAGE;
  const end = start + RESULTS_PER_PAGE;
  const pageResults = filteredResults.slice(start, end);

  if (filteredResults.length === 0) {
    resultsInfo.innerHTML = `<span class="results-count">No results found for "<strong>${escapeHtml(currentQuery)}</strong>"</span>`;
    resultsList.innerHTML = '<li class="no-results">Try different keywords or check your spelling.</li>';
    pagination.innerHTML = '';
    return;
  }

  resultsInfo.innerHTML = `<span class="results-count">${filteredResults.length} result${filteredResults.length !== 1 ? 's' : ''} for "<strong>${escapeHtml(currentQuery)}</strong>"</span>`;

  resultsList.innerHTML = pageResults.map(r => {
    const urlParts = r.url.split('/');
    const breadcrumb = urlParts.slice(1).join(' \u203A ');
    const snippet = generateSnippet(r, currentQuery);

    return `<li class="result-item">
      <cite class="result-breadcrumb">${escapeHtml(breadcrumb)}</cite>
      <h3 class="result-title"><a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">${highlightTerms(r.title || r.pageName, currentQuery)}</a></h3>
      <span class="result-site-badge">${escapeHtml(r.siteName)}</span>
      <p class="result-snippet">${snippet}</p>
    </li>`;
  }).join('');
}

function renderPagination() {
  const totalPages = Math.ceil(filteredResults.length / RESULTS_PER_PAGE);
  if (totalPages <= 1) { pagination.innerHTML = ''; return; }

  let html = '';
  if (currentPage > 1) {
    html += `<button class="page-btn" data-page="${currentPage - 1}">&lsaquo; Prev</button>`;
  }

  const range = getPageRange(currentPage, totalPages);
  range.forEach(p => {
    if (p === '...') {
      html += '<span class="page-ellipsis">...</span>';
    } else {
      html += `<button class="page-btn${p === currentPage ? ' active' : ''}" data-page="${p}">${p}</button>`;
    }
  });

  if (currentPage < totalPages) {
    html += `<button class="page-btn" data-page="${currentPage + 1}">Next &rsaquo;</button>`;
  }

  pagination.innerHTML = html;
}

function getPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

// --- Filters ---
function buildSiteFilters(results) {
  const counts = {};
  results.forEach(r => {
    counts[r.siteId] = (counts[r.siteId] || 0) + 1;
  });

  const sorted = Object.entries(counts)
    .map(([id, count]) => ({ id, name: siteIndex[id]?.name || id, count }))
    .sort((a, b) => b.count - a.count);

  siteFilterExpanded = false;
  renderSiteFilters(sorted);
}

function renderSiteFilters(sorted) {
  const show = siteFilterExpanded ? sorted : sorted.slice(0, SITE_FILTER_COLLAPSED);

  siteFilterList.innerHTML = show.map(s =>
    `<li><label><input type="checkbox" value="${escapeHtml(s.id)}" class="site-filter-cb"> ${escapeHtml(s.name)} <span class="filter-count">(${s.count})</span></label></li>`
  ).join('');

  if (sorted.length > SITE_FILTER_COLLAPSED) {
    siteFilterToggle.hidden = false;
    siteFilterToggle.textContent = siteFilterExpanded ? 'Show less' : `Show all (${sorted.length})`;
    siteFilterToggle.onclick = () => {
      siteFilterExpanded = !siteFilterExpanded;
      renderSiteFilters(sorted);
    };
  } else {
    siteFilterToggle.hidden = true;
  }

  $$('.site-filter-cb').forEach(cb => {
    cb.addEventListener('change', applyFilters);
  });
}

function applyFilters() {
  const selected = [...$$('.site-filter-cb:checked')].map(cb => cb.value);

  if (selected.length === 0) {
    filteredResults = [...allResults];
  } else {
    filteredResults = allResults.filter(r => selected.includes(r.siteId));
  }

  currentPage = 1;
  renderResults();
  renderPagination();
}

// --- Suggestions ---
let suggestTimer = null;

function showSuggestions(input, dropdown) {
  clearTimeout(suggestTimer);
  const q = input.value.trim();
  if (q.length < 2 || !indexReady) {
    dropdown.hidden = true;
    return;
  }

  suggestTimer = setTimeout(() => {
    const suggestions = miniSearch.autoSuggest(q, { fuzzy: 0.2, prefix: true })
      .slice(0, 6);

    if (suggestions.length === 0) {
      dropdown.hidden = true;
      return;
    }

    dropdown.innerHTML = suggestions.map(s =>
      `<div class="suggestion-item" data-query="${escapeHtml(s.suggestion)}">${escapeHtml(s.suggestion)}</div>`
    ).join('');
    dropdown.hidden = false;
  }, 150);
}

function setupSuggestions(input, dropdown) {
  input.addEventListener('input', () => showSuggestions(input, dropdown));
  input.addEventListener('focus', () => showSuggestions(input, dropdown));

  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.suggestion-item');
    if (!item) return;
    const q = item.dataset.query;
    input.value = q;
    dropdown.hidden = true;
    executeSearch(q);
  });

  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && e.target !== input) {
      dropdown.hidden = true;
    }
  });
}

// --- View Management ---
function showView(name) {
  if (name === 'home') {
    homeView.hidden = false;
    resultsView.hidden = true;
    homeInput.focus();
    history.replaceState(null, '', window.location.pathname);
  } else {
    homeView.hidden = true;
    resultsView.hidden = false;
  }
}

// --- Events ---
homeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  homeSuggestions.hidden = true;
  executeSearch(homeInput.value);
});

resultsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  resultsSuggestions.hidden = true;
  executeSearch(resultsInput.value);
});

logoLink.addEventListener('click', (e) => {
  e.preventDefault();
  showView('home');
});

pagination.addEventListener('click', (e) => {
  const btn = e.target.closest('.page-btn');
  if (!btn) return;
  currentPage = parseInt(btn.dataset.page, 10);
  renderResults();
  renderPagination();
  window.scrollTo(0, 0);
});

setupSuggestions(homeInput, homeSuggestions);
setupSuggestions(resultsInput, resultsSuggestions);

// --- Init ---
loadIndex();
