/* ========== InfiniteWeb Project Page JavaScript ========== */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initScrollspy();
  initScrollReveal();
  initGallery();
  initModal();
  initLightbox();
  initBibtexCopy();
});

/* ---- Navbar burger toggle ---- */
function initNavbar() {
  const burger = document.querySelector('.navbar-burger');
  const menu = document.getElementById('mainNav');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('is-active');
      menu.classList.toggle('is-active');
    });
    menu.querySelectorAll('.navbar-item').forEach(item => {
      item.addEventListener('click', () => {
        burger.classList.remove('is-active');
        menu.classList.remove('is-active');
      });
    });
  }
}

/* ---- Scrollspy for navbar active state ---- */
function initScrollspy() {
  const sections = [...document.querySelectorAll('section[id]')];
  const navLinks = [...document.querySelectorAll('.navbar a.navbar-item[href^="#"]')];
  if (!sections.length || !navLinks.length) return;

  const setActive = (id) => {
    navLinks.forEach(a => a.classList.toggle('is-nav-active', a.getAttribute('href') === `#${id}`));
  };

  const io = new IntersectionObserver((entries) => {
    const best = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (best) setActive(best.target.id);
  }, { rootMargin: '-20% 0px -65% 0px', threshold: [0.1, 0.2, 0.35] });

  sections.forEach(s => io.observe(s));
}

/* ---- Scroll Reveal ---- */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => io.observe(el));
}

/* ---- Gallery Search ---- */
let galleryData = [];

async function initGallery() {
  try {
    const resp = await fetch('static/data/gallery.json');
    const data = await resp.json();
    galleryData = data.items || [];
  } catch (e) {
    console.warn('Could not load gallery data:', e);
    galleryData = [];
  }

  renderResults(galleryData);

  const input = document.getElementById('searchInput');
  const btn = document.getElementById('searchBtn');
  const chips = document.querySelectorAll('.chip');

  if (input) {
    input.addEventListener('input', () => {
      doSearch(input.value);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch(input.value);
    });
  }

  if (btn) {
    btn.addEventListener('click', () => {
      doSearch(input ? input.value : '');
    });
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const query = chip.dataset.query || '';
      if (input) input.value = query;
      chips.forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      doSearch(query);
    });
  });

  // Support URL params: ?q=... and ?demo=...
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q && input) {
    input.value = q;
    doSearch(q);
  }
  const demoId = params.get('demo');
  if (demoId) {
    const item = galleryData.find(i => i.id === demoId);
    if (item) {
      setTimeout(() => openPreview(item), 500);
    }
  }
}

function doSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    renderResults(galleryData);
    return;
  }

  const tokens = q.split(/\s+/);
  const filtered = galleryData.filter(item => {
    const searchable = [
      item.title,
      item.description,
      ...(item.tags || [])
    ].join(' ').toLowerCase();
    return tokens.every(t => searchable.includes(t));
  });

  renderResults(filtered);
}

function renderResults(items) {
  const grid = document.getElementById('resultsGrid');
  const empty = document.getElementById('emptyState');
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';

  grid.innerHTML = items.map(item => `
    <div class="column is-3-desktop is-4-tablet is-6-mobile">
      <div class="website-card" data-id="${item.id}">
        <div class="website-card-thumb-wrap">
          <img class="website-card-thumb" src="${item.thumbnail}"
               alt="${item.title}" loading="lazy">
        </div>
        <div class="website-card-body">
          <div class="website-card-title">${item.title}</div>
          <div class="website-card-desc">${item.description}</div>
          <div class="website-card-tags">
            ${(item.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
          </div>
          <div class="website-card-meta">
            <span><i class="fas fa-tasks"></i> ${item.taskCount || '?'} tasks</span>
            <span><i class="fas fa-file"></i> ${item.pageCount || '?'} pages</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Apply fallback gradients for broken/missing thumbnails
  grid.querySelectorAll('.website-card').forEach((card, i) => {
    const img = card.querySelector('.website-card-thumb');
    const applyFallback = () => {
      card.classList.add('is-fallback');
      const px = 18 + (i * 11) % 70;
      const py = 14 + (i * 17) % 70;
      card.style.setProperty('--px', px + '%');
      card.style.setProperty('--py', py + '%');
    };

    if (!img || !img.getAttribute('src')) { applyFallback(); return; }
    img.addEventListener('error', applyFallback, { once: true });

    // Attach click events
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const item = galleryData.find(i => i.id === id);
      if (item) openPreview(item);
    });
  });
}

/* ---- Preview Modal ---- */
function initModal() {
  const modal = document.getElementById('previewModal');
  if (!modal) return;

  const bg = modal.querySelector('.modal-background');
  const closeBtn = modal.querySelector('.modal-close');
  const resetBtn = document.getElementById('modalResetBtn');

  [bg, closeBtn].forEach(el => {
    if (el) el.addEventListener('click', () => closePreview());
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const iframe = document.getElementById('previewIframe');
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage({ type: 'RESET' }, '*');
        } catch (e) {
          iframe.src = iframe.src;
        }
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePreview();
  });
}

function openPreview(item) {
  const modal = document.getElementById('previewModal');
  const iframe = document.getElementById('previewIframe');
  const title = document.getElementById('modalTitle');
  const desc = document.getElementById('modalDesc');
  const tags = document.getElementById('modalTags');
  const openBtn = document.getElementById('modalOpenBtn');

  if (title) title.textContent = item.title;
  if (desc) desc.textContent = item.description;
  if (tags) {
    tags.innerHTML = (item.tags || []).map(t =>
      `<span class="tag is-primary is-light">${t}</span>`
    ).join('');
  }
  if (iframe) iframe.src = item.demoUrl;
  if (openBtn) openBtn.href = item.demoUrl;

  if (modal) modal.classList.add('is-active');
  document.documentElement.classList.add('is-clipped');
}

function closePreview() {
  const modal = document.getElementById('previewModal');
  const iframe = document.getElementById('previewIframe');

  if (modal) modal.classList.remove('is-active');
  document.documentElement.classList.remove('is-clipped');
  if (iframe) iframe.src = 'about:blank';
}

/* ---- Image Lightbox ---- */
function initLightbox() {
  document.querySelectorAll('.clickable-img').forEach(img => {
    img.addEventListener('click', () => {
      const overlay = document.createElement('div');
      overlay.className = 'lightbox-overlay';
      const clone = document.createElement('img');
      clone.src = img.src;
      clone.alt = img.alt;
      overlay.appendChild(clone);
      overlay.addEventListener('click', () => overlay.remove());
      document.body.appendChild(overlay);
    });
  });
}

/* ---- BibTeX Copy ---- */
function initBibtexCopy() {
  const btn = document.getElementById('copyBibtex');
  const code = document.getElementById('bibtexCode');
  if (!btn || !code) return;

  btn.addEventListener('click', () => {
    const text = code.textContent;
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '<span class="icon"><i class="fas fa-check"></i></span><span>Copied!</span>';
      btn.classList.add('is-success');
      btn.classList.remove('is-primary');
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.classList.remove('is-success');
        btn.classList.add('is-primary');
      }, 2000);
    });
  });
}
