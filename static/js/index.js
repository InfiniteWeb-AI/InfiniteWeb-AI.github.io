/* ========== InfiniteWeb Project Page JavaScript ========== */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initScrollReveal();
  initFeaturedCards();
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

/* ---- Featured Cards (index.html explore teaser) ---- */
async function initFeaturedCards() {
  const grid = document.getElementById('featuredGrid');
  if (!grid) return;

  try {
    const resp = await fetch('static/data/gallery.json');
    const data = await resp.json();
    const items = (data.items || []).slice(0, 4);

    grid.innerHTML = items.map((item, i) => {
      const px = 18 + (i * 11) % 70;
      const py = 14 + (i * 17) % 70;
      return `
        <div class="column is-3-desktop is-6-tablet is-6-mobile">
          <a href="search.html?demo=${item.id}" class="website-card is-fallback" style="--px:${px}%;--py:${py}%;">
            <div class="website-card-thumb-wrap"></div>
            <div class="website-card-body">
              <div class="website-card-title">${item.title}</div>
              <div class="website-card-desc">${item.description}</div>
              <div class="website-card-tags">
                ${(item.tags || []).slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('')}
              </div>
            </div>
          </a>
        </div>
      `;
    }).join('');
  } catch (e) {
    console.warn('Could not load featured cards:', e);
  }
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
