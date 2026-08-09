/** Загрузка и фильтр каталога из статичного JSON (без сервера) */

function catalogConfig() {
  return window.SITE_CONFIG || {};
}

function money(n) {
  return (Number(n) || 0).toLocaleString('ru-RU') + ' ₽';
}

function formatDate(iso) {
  if (!iso) return '';
  const s = String(iso).slice(0, 10);
  const d = new Date(s.includes('T') ? s : s + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('ru-RU');
}

function placeholderPreview(sphere, title) {
  const label = (sphere || title || 'РК').slice(0, 48);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1a1a"/><stop offset="100%" stop-color="#3d3500"/>
    </linearGradient></defs>
    <rect width="640" height="400" fill="url(#g)"/>
    <circle cx="520" cy="80" r="90" fill="#FFCC00" opacity="0.25"/>
    <text x="40" y="200" fill="#FFCC00" font-family="Inter,Arial,sans-serif" font-size="28" font-weight="800">Готовая РК</text>
    <text x="40" y="250" fill="#ffffff" font-family="Inter,Arial,sans-serif" font-size="22">${String(label).replace(/[<>&]/g, '')}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

function previewUrl(item) {
  return item.preview || item.preview_url || placeholderPreview(item.sphere, item.title);
}

function isActive(item) {
  if (item.active === false || item.is_active === 0 || item.is_active === false) return false;
  return true;
}

async function fetchCampaigns() {
  const url = (catalogConfig().CATALOG_URL || 'data/campaigns.json') + '?t=' + Date.now();
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Не удалось загрузить каталог (data/campaigns.json)');
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.items || data.campaigns || [];
  return list.filter(isActive);
}

/** Нормализация числа из input (пустая строка → null) */
function parsePrice(v) {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Поиск: все слова должны встретиться в title/sphere/description */
function matchesQuery(item, q) {
  if (!q) return true;
  const hay = [item.sphere, item.title, item.description]
    .map((x) => String(x || '').toLowerCase())
    .join(' ');
  const words = String(q)
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return true;
  return words.every((w) => hay.includes(w));
}

function uniqueSpheres(items) {
  const set = new Set();
  (items || []).forEach((c) => {
    const s = String(c.sphere || '').trim();
    if (s) set.add(s);
  });
  return [...set].sort((a, b) => a.localeCompare(b, 'ru'));
}

/**
 * @param {Array} items
 * @param {{ q?: string, sort?: string, minPrice?: string|number, maxPrice?: string|number, sphere?: string }} opts
 */
function filterCampaigns(items, opts = {}) {
  const {
    q = '',
    sort = 'date_desc',
    minPrice = '',
    maxPrice = '',
    sphere = '',
  } = opts;

  let out = (items || []).slice();
  const qq = String(q || '').trim();
  const sphereQ = String(sphere || '').trim();

  if (qq) {
    out = out.filter((c) => matchesQuery(c, qq));
  }

  if (sphereQ) {
    const sLow = sphereQ.toLowerCase();
    out = out.filter((c) => String(c.sphere || '').toLowerCase() === sLow);
  }

  let minN = parsePrice(minPrice);
  let maxN = parsePrice(maxPrice);

  // если «от» > «до» — меняем местами, не обнуляем выдачу
  if (minN != null && maxN != null && minN > maxN) {
    const t = minN;
    minN = maxN;
    maxN = t;
  }

  if (minN != null) {
    out = out.filter((c) => (Number(c.price) || 0) >= minN);
  }
  if (maxN != null) {
    out = out.filter((c) => (Number(c.price) || 0) <= maxN);
  }

  out.sort((a, b) => {
    switch (sort) {
      case 'date_asc':
        return String(a.created_at || '').localeCompare(String(b.created_at || ''));
      case 'price_asc':
        return (Number(a.price) || 0) - (Number(b.price) || 0);
      case 'price_desc':
        return (Number(b.price) || 0) - (Number(a.price) || 0);
      case 'sphere':
        return String(a.sphere || '').localeCompare(String(b.sphere || ''), 'ru');
      case 'title':
        return String(a.title || '').localeCompare(String(b.title || ''), 'ru');
      default:
        return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    }
  });

  return out;
}

async function getCampaignById(id) {
  const items = await fetchCampaigns();
  return items.find((c) => String(c.id) === String(id)) || null;
}

window.CatalogData = {
  money,
  formatDate,
  placeholderPreview,
  previewUrl,
  escapeHtml,
  escapeAttr,
  fetchCampaigns,
  filterCampaigns,
  uniqueSpheres,
  parsePrice,
  getCampaignById,
};
