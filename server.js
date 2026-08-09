const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const {
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
} = require('./db');

const PORT = Number(process.env.PORT) || 3080;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'directbeza-admin';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// static site
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(__dirname, { index: 'index.html' }));

function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token || '';
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Нужен admin-токен' });
  }
  next();
}

const previewStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PREVIEWS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, FILES_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.xlsx';
    const safe = (file.originalname || 'campaign')
      .replace(/[^\w.\-а-яА-ЯёЁ ]+/g, '')
      .slice(0, 60);
    cb(null, `f_${Date.now()}_${safe || 'file'}${ext}`);
  },
});
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === 'preview') cb(null, PREVIEWS_DIR);
      else cb(null, FILES_DIR);
    },
    filename: (req, file, cb) => {
      if (file.fieldname === 'preview') {
        previewStorage.filename(req, file, cb);
      } else {
        fileStorage.filename(req, file, cb);
      }
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// ---------- Public API ----------
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'directbeza' });
});

app.get('/api/campaigns', (req, res) => {
  try {
    const items = listCampaigns({
      q: req.query.q || '',
      sort: req.query.sort || 'date_desc',
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      activeOnly: true,
    });
    res.json({ items, total: items.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/campaigns/:id', (req, res) => {
  const item = getCampaign(Number(req.params.id));
  if (!item || !item.is_active) return res.status(404).json({ error: 'Не найдено' });
  res.json(item);
});

app.get('/api/spheres', (_req, res) => {
  res.json({ items: spheres() });
});

app.post('/api/leads', (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const email = String(body.email || '').trim();
    if (!name || !phone || !email) {
      return res.status(400).json({ error: 'Укажите имя, телефон и email' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Некорректный email' });
    }

    let campaignTitle = body.campaign_title || '';
    let campaignId = body.campaign_id ? Number(body.campaign_id) : null;
    if (campaignId) {
      const c = getCampaign(campaignId);
      if (c) campaignTitle = c.title;
    }

    const lead = createLead({
      type: body.type || 'custom_campaign',
      name,
      phone,
      email,
      website: String(body.website || '').trim(),
      promote_what: String(body.promote_what || '').trim(),
      city: String(body.city || '').trim(),
      campaign_id: campaignId,
      campaign_title: campaignTitle,
      message: String(body.message || '').trim(),
    });

    // log for ops without external mail
    console.log('[lead]', lead.id, lead.type, lead.name, lead.phone, lead.email, lead.website || campaignTitle);

    res.json({ ok: true, id: lead.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Admin API ----------
app.get('/api/admin/leads', requireAdmin, (req, res) => {
  res.json({ items: listLeads(req.query.limit) });
});

app.get('/api/admin/campaigns', requireAdmin, (req, res) => {
  res.json({
    items: listCampaigns({
      q: req.query.q || '',
      sort: req.query.sort || 'date_desc',
      activeOnly: false,
    }),
  });
});

app.post(
  '/api/admin/campaigns',
  requireAdmin,
  upload.fields([
    { name: 'preview', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  (req, res) => {
    try {
      const title = String(req.body.title || '').trim();
      const sphere = String(req.body.sphere || '').trim();
      if (!title || !sphere) {
        return res.status(400).json({ error: 'Нужны название и сфера' });
      }
      const previewFile = req.files?.preview?.[0];
      const dataFile = req.files?.file?.[0];
      const item = createCampaign({
        title,
        sphere,
        description: String(req.body.description || '').trim(),
        price: req.body.price,
        preview_url: previewFile ? `/uploads/previews/${previewFile.filename}` : '',
        file_name: dataFile ? dataFile.filename : '',
        is_active: req.body.is_active !== '0' && req.body.is_active !== 'false',
      });
      res.json({ ok: true, item });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
);

app.put(
  '/api/admin/campaigns/:id',
  requireAdmin,
  upload.fields([
    { name: 'preview', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  (req, res) => {
    try {
      const id = Number(req.params.id);
      const cur = getCampaign(id);
      if (!cur) return res.status(404).json({ error: 'Не найдено' });

      const patch = {};
      ['title', 'sphere', 'description', 'price', 'is_active'].forEach((k) => {
        if (req.body[k] != null && req.body[k] !== '') patch[k] = req.body[k];
      });
      const previewFile = req.files?.preview?.[0];
      const dataFile = req.files?.file?.[0];
      if (previewFile) patch.preview_url = `/uploads/previews/${previewFile.filename}`;
      if (dataFile) patch.file_name = dataFile.filename;

      const item = updateCampaign(id, patch);
      res.json({ ok: true, item });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
);

app.delete('/api/admin/campaigns/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const cur = getCampaign(id);
  if (!cur) return res.status(404).json({ error: 'Не найдено' });
  // remove files if present
  if (cur.preview_url) {
    const p = path.join(__dirname, cur.preview_url.replace(/^\//, ''));
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  if (cur.file_name) {
    const p = path.join(FILES_DIR, cur.file_name);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  deleteCampaign(id);
  res.json({ ok: true });
});

app.get('/api/admin/campaigns/:id/file', requireAdmin, (req, res) => {
  const item = getCampaign(Number(req.params.id));
  if (!item || !item.file_name) return res.status(404).json({ error: 'Файл не найден' });
  const p = path.join(FILES_DIR, item.file_name);
  if (!fs.existsSync(p)) return res.status(404).json({ error: 'Файл отсутствует на диске' });
  res.download(p, item.file_name);
});

// SPA-ish fallbacks for clean urls
app.get(['/catalog', '/catalog/'], (_req, res) => {
  res.sendFile(path.join(__dirname, 'catalog.html'));
});
app.get(['/campaign', '/campaign/'], (_req, res) => {
  res.sendFile(path.join(__dirname, 'campaign.html'));
});
app.get(['/rules', '/rules/'], (_req, res) => {
  res.sendFile(path.join(__dirname, 'rules.html'));
});
app.get(['/admin', '/admin/'], (_req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`ДиректБезАгенств: http://127.0.0.1:${PORT}`);
  console.log(`Каталог: http://127.0.0.1:${PORT}/catalog`);
  console.log(`Админка: http://127.0.0.1:${PORT}/admin  (токен: ${ADMIN_TOKEN})`);
});
