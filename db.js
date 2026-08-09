/**
 * Простое файловое хранилище (JSON) — без native-модулей.
 * Структура как у БД: campaigns + leads.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PREVIEWS_DIR = path.join(UPLOADS_DIR, 'previews');
const FILES_DIR = path.join(UPLOADS_DIR, 'files');
const DB_PATH = path.join(DATA_DIR, 'store.json');

for (const dir of [DATA_DIR, UPLOADS_DIR, PREVIEWS_DIR, FILES_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function emptyStore() {
  return { campaigns: [], leads: [], seq: { campaign: 0, lead: 0 } };
}

function load() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const s = emptyStore();
      save(s);
      return s;
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return emptyStore();
  }
}

function save(store) {
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function nowIso() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function listCampaigns({ q = '', sort = 'date_desc', minPrice, maxPrice, activeOnly = true } = {}) {
  const store = load();
  let items = store.campaigns.slice();

  if (activeOnly) items = items.filter((c) => c.is_active);
  if (q) {
    const qq = String(q).toLowerCase();
    items = items.filter(
      (c) =>
        (c.sphere || '').toLowerCase().includes(qq) ||
        (c.title || '').toLowerCase().includes(qq) ||
        (c.description || '').toLowerCase().includes(qq)
    );
  }
  if (minPrice != null && minPrice !== '') {
    const n = Number(minPrice) || 0;
    items = items.filter((c) => (Number(c.price) || 0) >= n);
  }
  if (maxPrice != null && maxPrice !== '') {
    const n = Number(maxPrice) || 0;
    items = items.filter((c) => (Number(c.price) || 0) <= n);
  }

  items.sort((a, b) => {
    switch (sort) {
      case 'date_asc':
        return String(a.created_at).localeCompare(String(b.created_at));
      case 'price_asc':
        return (Number(a.price) || 0) - (Number(b.price) || 0);
      case 'price_desc':
        return (Number(b.price) || 0) - (Number(a.price) || 0);
      case 'sphere':
        return String(a.sphere).localeCompare(String(b.sphere), 'ru');
      default:
        return String(b.created_at).localeCompare(String(a.created_at));
    }
  });

  return items;
}

function getCampaign(id) {
  const store = load();
  return store.campaigns.find((c) => c.id === Number(id)) || null;
}

function createCampaign(data) {
  const store = load();
  store.seq.campaign += 1;
  const item = {
    id: store.seq.campaign,
    title: data.title,
    sphere: data.sphere,
    description: data.description || '',
    price: Number(data.price) || 0,
    preview_url: data.preview_url || '',
    file_name: data.file_name || '',
    is_active: data.is_active == null ? 1 : Number(data.is_active) ? 1 : 0,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  store.campaigns.push(item);
  save(store);
  return item;
}

function updateCampaign(id, data) {
  const store = load();
  const idx = store.campaigns.findIndex((c) => c.id === Number(id));
  if (idx < 0) return null;
  const cur = store.campaigns[idx];
  const next = {
    ...cur,
    title: data.title != null ? data.title : cur.title,
    sphere: data.sphere != null ? data.sphere : cur.sphere,
    description: data.description != null ? data.description : cur.description,
    price: data.price != null ? Number(data.price) || 0 : cur.price,
    preview_url: data.preview_url != null ? data.preview_url : cur.preview_url,
    file_name: data.file_name != null ? data.file_name : cur.file_name,
    is_active: data.is_active != null ? (Number(data.is_active) ? 1 : 0) : cur.is_active,
    updated_at: nowIso(),
  };
  store.campaigns[idx] = next;
  save(store);
  return next;
}

function deleteCampaign(id) {
  const store = load();
  const before = store.campaigns.length;
  store.campaigns = store.campaigns.filter((c) => c.id !== Number(id));
  if (store.campaigns.length === before) return false;
  save(store);
  return true;
}

function createLead(data) {
  const store = load();
  store.seq.lead += 1;
  const lead = {
    id: store.seq.lead,
    type: data.type || 'custom_campaign',
    name: data.name,
    phone: data.phone,
    email: data.email,
    website: data.website || '',
    promote_what: data.promote_what || '',
    city: data.city || '',
    campaign_id: data.campaign_id || null,
    campaign_title: data.campaign_title || '',
    message: data.message || '',
    status: 'new',
    created_at: nowIso(),
  };
  store.leads.push(lead);
  save(store);
  return lead;
}

function listLeads(limit = 100) {
  const store = load();
  return store.leads
    .slice()
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, Math.min(Number(limit) || 100, 500));
}

function spheres() {
  const map = new Map();
  listCampaigns({ activeOnly: true }).forEach((c) => {
    map.set(c.sphere, (map.get(c.sphere) || 0) + 1);
  });
  return [...map.entries()]
    .map(([sphere, cnt]) => ({ sphere, cnt }))
    .sort((a, b) => a.sphere.localeCompare(b.sphere, 'ru'));
}

module.exports = {
  DATA_DIR,
  UPLOADS_DIR,
  PREVIEWS_DIR,
  FILES_DIR,
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  createLead,
  listLeads,
  spheres,
};
