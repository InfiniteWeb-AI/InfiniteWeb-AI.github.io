// --- State ---
let miniSearch = null;
let siteIndex = {};
let allPages = [];
let allResults = [];
let filteredResults = [];
let currentQuery = '';
let currentPage = 1;
let indexReady = false;
const RESULTS_PER_PAGE = 10;

// --- DOM refs ---
const $ = (sel) => document.querySelector(sel);

const homeView = $('#home-view');
const resultsView = $('#results-view');
const loadingOverlay = $('#loading-overlay');

const homeInput = $('#home-search-input');
const resultsInput = $('#results-search-input');
const homeSearchBtn = $('#home-search-btn');
const resultsSearchBtn = $('#results-search-btn');
const homeClearBtn = $('#home-clear-btn');
const resultsClearBtn = $('#results-clear-btn');

const resultsList = $('#results-list');
const resultsInfo = $('#results-info');
const pagination = $('#pagination');
const logoLink = $('#logo-link');

const homeSuggestions = $('#home-suggestions');
const resultsSuggestions = $('#results-suggestions');
const homeSearchBox = $('#home-search-box');
const resultsSearchBox = $('#results-search-box');
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
    allPages = data.pages;

    indexReady = true;
    homeStats.textContent = data.metadata.totalSites + ' websites \u00B7 ' + data.metadata.totalPages + ' pages indexed';
    loadingOverlay.hidden = true;

    // Check URL for query
    var params = new URLSearchParams(window.location.search);
    var q = params.get('q');
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
  if (!query || !query.trim()) return;
  if (!indexReady) return;

  currentQuery = query.trim();

  try {
    allResults = miniSearch.search(currentQuery, { combineWith: 'OR' });
  } catch (e) {
    console.error('Search error:', e);
    allResults = [];
  }

  // If no results, show all pages in random order
  if (allResults.length === 0) {
    allResults = allPages.slice().sort(function() { return Math.random() - 0.5; });
  }

  filteredResults = allResults.slice();
  currentPage = 1;

  showView('results');
  resultsInput.value = currentQuery;
  renderResults();
  renderPagination();

  try {
    history.replaceState(null, '', '?q=' + encodeURIComponent(currentQuery));
  } catch (e) { /* ignore */ }
}

// --- Snippet Generation ---
function escapeHtml(str) {
  if (str == null) return '';
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function generateSnippet(result, query, maxLen) {
  maxLen = maxLen || 200;
  var text = result.body || result.metaDesc || '';
  if (!text) return escapeHtml(result.metaDesc || result.title || '');

  var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  var lowerText = text.toLowerCase();

  var bestStart = 0;
  var bestScore = -1;

  var step = 15;
  var limit = Math.min(text.length, 1800);
  for (var i = 0; i < limit; i += step) {
    var end = Math.min(i + maxLen, text.length);
    var win = lowerText.substring(i, end);
    var score = 0;
    for (var j = 0; j < terms.length; j++) {
      if (win.indexOf(terms[j]) !== -1) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
    if (score === terms.length) break;
  }

  var snippet = text.substring(bestStart, bestStart + maxLen).trim();
  if (bestStart > 0) snippet = '... ' + snippet;
  if (bestStart + maxLen < text.length) snippet += ' ...';

  snippet = escapeHtml(snippet);

  for (var k = 0; k < terms.length; k++) {
    var regex = new RegExp('(' + escapeRegex(terms[k]) + ')', 'gi');
    snippet = snippet.replace(regex, '<mark>$1</mark>');
  }

  return snippet;
}

function highlightTerms(text, query) {
  var safe = escapeHtml(text);
  var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  for (var i = 0; i < terms.length; i++) {
    var regex = new RegExp('(' + escapeRegex(terms[i]) + ')', 'gi');
    safe = safe.replace(regex, '<mark>$1</mark>');
  }
  return safe;
}

// --- Rendering ---
function renderResults() {
  var start = (currentPage - 1) * RESULTS_PER_PAGE;
  var end = start + RESULTS_PER_PAGE;
  var pageResults = filteredResults.slice(start, end);

  if (filteredResults.length === 0) {
    resultsInfo.innerHTML = '<div class="results-count">No results found for <strong>"' + escapeHtml(currentQuery) + '"</strong></div>';
    resultsList.innerHTML = '<div class="no-results">Try different keywords or check your spelling.</div>';
    pagination.innerHTML = '';
    return;
  }

  var timeStr = (Math.random() * 0.4 + 0.1).toFixed(2);
  resultsInfo.innerHTML = '<div class="results-count">About ' + filteredResults.length + ' results (' + timeStr + ' seconds)</div>';

  var html = '';
  for (var i = 0; i < pageResults.length; i++) {
    var r = pageResults[i];
    var snippet = generateSnippet(r, currentQuery);
    var initials = (r.siteName || '?').charAt(0).toUpperCase();
    var hue = hashStr(r.siteId || r.siteName || '') % 340;
    var displayUrl = escapeHtml(r.url || r.fileName || '');

    var viewerHref = 'viewer.html?url=' + encodeURIComponent(r.url || '') +
      '&site=' + encodeURIComponent(r.siteName || '') +
      '&q=' + encodeURIComponent(currentQuery);

    html += '<div class="result-item">' +
      '<div class="result-cite">' +
        '<span class="result-favicon" style="background:hsl(' + hue + ',45%,92%);color:hsl(' + hue + ',40%,35%)">' + initials + '</span>' +
        '<div class="result-cite-text">' +
          '<span class="result-site-name">' + escapeHtml(r.siteName) + '</span>' +
          '<span class="result-url">' + displayUrl + '</span>' +
        '</div>' +
      '</div>' +
      '<h3 class="result-title"><a href="' + viewerHref + '">' + highlightTerms(r.title || r.pageName, currentQuery) + '</a></h3>' +
      '<div class="result-snippet">' + snippet + '</div>' +
    '</div>';
  }

  resultsList.innerHTML = html;
}

function renderPagination() {
  var totalPages = Math.ceil(filteredResults.length / RESULTS_PER_PAGE);
  if (totalPages <= 1) { pagination.innerHTML = ''; return; }

  var html = '';

  // Previous
  if (currentPage > 1) {
    html += '<button class="page-nav" data-page="' + (currentPage - 1) + '">&larr; Previous</button>';
  }

  // Page numbers
  var range = getPageRange(currentPage, totalPages);
  for (var i = 0; i < range.length; i++) {
    var p = range[i];
    if (p === '...') {
      html += '<span class="page-ellipsis">...</span>';
    } else {
      html += '<button class="page-btn' + (p === currentPage ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
    }
  }

  // Next
  if (currentPage < totalPages) {
    html += '<button class="page-nav" data-page="' + (currentPage + 1) + '">Next &rarr;</button>';
  }

  pagination.innerHTML = html;
}

function getPageRange(current, total) {
  if (total <= 7) {
    var arr = [];
    for (var i = 1; i <= total; i++) arr.push(i);
    return arr;
  }
  var pages = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  for (var j = Math.max(2, current - 1); j <= Math.min(total - 1, current + 1); j++) {
    pages.push(j);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

// --- Suggestions ---
var suggestTimer = null;

function showSuggestions(input, dropdown, searchBox) {
  clearTimeout(suggestTimer);
  var q = input.value.trim();
  if (q.length < 2 || !indexReady) {
    dropdown.hidden = true;
    searchBox.classList.remove('has-suggestions');
    return;
  }

  suggestTimer = setTimeout(function() {
    var suggestions = miniSearch.autoSuggest(q, { fuzzy: 0.2, prefix: true }).slice(0, 8);

    if (suggestions.length === 0) {
      dropdown.hidden = true;
      searchBox.classList.remove('has-suggestions');
      return;
    }

    var html = '<div class="divider"></div>';
    for (var i = 0; i < suggestions.length; i++) {
      html += '<div class="suggestion-item" data-query="' + escapeHtml(suggestions[i].suggestion) + '">' + escapeHtml(suggestions[i].suggestion) + '</div>';
    }
    dropdown.innerHTML = html;
    dropdown.hidden = false;
    searchBox.classList.add('has-suggestions');
  }, 120);
}

function hideSuggestions(dropdown, searchBox) {
  dropdown.hidden = true;
  searchBox.classList.remove('has-suggestions');
}

function setupInput(input, clearBtn) {
  function updateClear() {
    clearBtn.hidden = !input.value;
  }
  input.addEventListener('input', updateClear);
  clearBtn.addEventListener('click', function() {
    input.value = '';
    clearBtn.hidden = true;
    input.focus();
  });
}

function setupSuggestions(input, dropdown, searchBox) {
  input.addEventListener('input', function() { showSuggestions(input, dropdown, searchBox); });
  input.addEventListener('focus', function() { showSuggestions(input, dropdown, searchBox); });

  dropdown.addEventListener('click', function(e) {
    var item = e.target.closest('.suggestion-item');
    if (!item) return;
    var q = item.dataset.query;
    input.value = q;
    hideSuggestions(dropdown, searchBox);
    executeSearch(q);
  });

  document.addEventListener('click', function(e) {
    if (!searchBox.contains(e.target)) {
      hideSuggestions(dropdown, searchBox);
    }
  });
}

// --- View Management ---
function showView(name) {
  if (name === 'home') {
    homeView.hidden = false;
    resultsView.hidden = true;
    homeInput.focus();
    try { history.replaceState(null, '', window.location.pathname); } catch(e) {}
  } else {
    homeView.hidden = true;
    resultsView.hidden = false;
  }
}

// --- Events ---

// Home: search button click
homeSearchBtn.addEventListener('click', function(e) {
  e.preventDefault();
  hideSuggestions(homeSuggestions, homeSearchBox);
  executeSearch(homeInput.value);
});

// Home: Enter key in input
homeInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    hideSuggestions(homeSuggestions, homeSearchBox);
    executeSearch(homeInput.value);
  }
});

// Results: search button click
resultsSearchBtn.addEventListener('click', function(e) {
  e.preventDefault();
  hideSuggestions(resultsSuggestions, resultsSearchBox);
  executeSearch(resultsInput.value);
});

// Results: Enter key in input
resultsInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    hideSuggestions(resultsSuggestions, resultsSearchBox);
    executeSearch(resultsInput.value);
  }
});

// Logo click -> go home
logoLink.addEventListener('click', function(e) {
  e.preventDefault();
  showView('home');
});

// Pagination clicks
pagination.addEventListener('click', function(e) {
  var btn = e.target.closest('[data-page]');
  if (!btn) return;
  currentPage = parseInt(btn.dataset.page, 10);
  renderResults();
  renderPagination();
  window.scrollTo(0, 0);
});

// Setup clear buttons
setupInput(homeInput, homeClearBtn);
setupInput(resultsInput, resultsClearBtn);

// Setup suggestions
setupSuggestions(homeInput, homeSuggestions, homeSearchBox);
setupSuggestions(resultsInput, resultsSuggestions, resultsSearchBox);

// --- Helpers ---
function hashStr(str) {
  var h = 0;
  for (var i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// --- Init ---
loadIndex();
