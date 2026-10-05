const feed         = document.getElementById('feed');
const paginationEl = document.getElementById('pagination');
const toast        = document.getElementById('toast');

const PER_PAGE = 10;
let currentPage = 1;

/* ---------- Helpers ---------- */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// SQLite stores "YYYY-MM-DD HH:MM:SS" in UTC → parse as UTC
function parseDbDate(s) {
  return new Date(String(s).replace(' ', 'T') + 'Z');
}

// Show as Indian Standard Time
function formatIST(s) {
  const d = parseDbDate(s);
  try {
    const formatted = d.toLocaleString('ur-PK-u-nu-latn', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    return `${formatted} IST`;
  } catch {
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    }) + ' IST';
  }
}

function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.className = 'toast show' + (isError ? ' err' : '');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => (toast.className = 'toast'), 2600);
}

/* ---------- Render Posts ---------- */
function renderPosts(posts) {
  if (!posts.length) {
    feed.innerHTML = '<div class="empty">ابھی کوئی شاعری پوسٹ نہیں ہوئی۔</div>';
    return;
  }

  feed.innerHTML = posts.map(p => `
    <article class="card" data-id="${p.id}">
      ${p.title ? `<div class="title">${esc(p.title)}</div>` : ''}
      <div class="urdu">${esc(p.content)}</div>
      <div class="meta">
        <span class="time">🕒 ${esc(formatIST(p.created_at))}</span>
        <button class="like-btn ${p.liked ? 'liked' : ''}" data-like="${p.id}">
          <span class="heart">${p.liked ? '❤️' : '🤍'}</span>
          <span class="count">${p.like_count}</span>
        </button>
      </div>
    </article>
  `).join('');
}

/* ---------- Render Pagination ---------- */
function renderPagination({ page, totalPages, hasPrev, hasNext }) {
  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  let html = `<button class="page-btn nav" data-page="${page - 1}" ${hasPrev ? '' : 'disabled'}>‹ پچھلا</button>`;

  const start = Math.max(1, page - 2);
  const end   = Math.min(totalPages, page + 2);

  if (start > 1) {
    html += `<button class="page-btn" data-page="1">1</button>`;
    if (start > 2) html += `<span class="page-dots">…</span>`;
  }

  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  if (end < totalPages) {
    if (end < totalPages - 1) html += `<span class="page-dots">…</span>`;
    html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
  }

  html += `<button class="page-btn nav" data-page="${page + 1}" ${hasNext ? '' : 'disabled'}>اگلا ›</button>`;

  paginationEl.innerHTML = html;
}

/* ---------- Load Posts ---------- */
async function loadPosts(page = 1) {
  currentPage = page;

  if (page === 1 && !feed.querySelector('.card')) {
    feed.innerHTML = '<div class="empty">لوڈ ہو رہا ہے…</div>';
  }

  try {
    const res  = await fetch(`/api/posts?page=${page}&limit=${PER_PAGE}`);
    const data = await res.json();

    renderPosts(data.posts);
    renderPagination(data.pagination);
  } catch {
    feed.innerHTML = '<div class="empty">لوڈ کرنے میں مسئلہ ہوا۔</div>';
    paginationEl.innerHTML = '';
  }
}

/* ---------- Pagination clicks ---------- */
paginationEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.page-btn');
  if (!btn || btn.disabled || btn.classList.contains('active')) return;

  const target = Number(btn.dataset.page);
  if (Number.isNaN(target) || target === currentPage) return;

  loadPosts(target);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ---------- Like (event delegation) ---------- */
feed.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-like]');
  if (!btn) return;

  const id = btn.dataset.like;
  btn.disabled = true;

  try {
    const res  = await fetch(`/api/posts/${id}/like`, { method: 'POST' });
    const data = await res.json();

    btn.classList.toggle('liked', data.liked);
    btn.querySelector('.heart').textContent = data.liked ? '❤️' : '🤍';
    btn.querySelector('.count').textContent = data.like_count;
    showToast(data.liked ? 'شکریہ! پسند کیا گیا ❤️' : 'لائک ہٹا دیا گیا');
  } catch {
    showToast('کچھ غلط ہو گیا', true);
  } finally {
    btn.disabled = false;
  }
});

/* ---------- Track visit ---------- */
fetch('/api/track-visit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ page: location.pathname, referrer: document.referrer })
}).catch(() => {});

/* ---------- Boot ---------- */
loadPosts(1);