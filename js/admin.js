const TOKEN_KEY = 'dbz_admin_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || document.getElementById('adminToken')?.value || '';
}

function setToken(t) {
  localStorage.setItem(TOKEN_KEY, t);
  const input = document.getElementById('adminToken');
  if (input) input.value = t;
}

async function adminFetch(url, options = {}) {
  const headers = Object.assign({}, options.headers || {}, {
    'x-admin-token': getToken(),
  });
  // FormData — don't force Content-Type
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function money(n) {
  return (Number(n) || 0).toLocaleString('ru-RU') + ' ₽';
}

async function loadLeads() {
  const box = document.getElementById('leadsList');
  const data = await adminFetch('/api/admin/leads');
  const items = data.items || [];
  document.getElementById('leadsCount').textContent = items.length;
  if (!items.length) {
    box.innerHTML = '<p class="form-note">Заявок пока нет</p>';
    return;
  }
  box.innerHTML = items
    .map(
      (l) => `
    <div class="admin-item">
      <div class="admin-item-top">
        <strong>#${l.id}</strong>
        <span class="badge-soft">${escapeHtml(l.type)}</span>
        <span class="muted">${escapeHtml(l.created_at)}</span>
      </div>
      <div><b>${escapeHtml(l.name)}</b> · ${escapeHtml(l.phone)} · ${escapeHtml(l.email)}</div>
      ${l.website ? `<div>🌐 ${escapeHtml(l.website)}</div>` : ''}
      ${l.city ? `<div>📍 ${escapeHtml(l.city)}</div>` : ''}
      ${l.promote_what ? `<div>📦 ${escapeHtml(l.promote_what)}</div>` : ''}
      ${l.campaign_title ? `<div>📁 ${escapeHtml(l.campaign_title)}</div>` : ''}
    </div>`
    )
    .join('');
}

async function loadCampaigns() {
  const box = document.getElementById('adminCampaigns');
  const data = await adminFetch('/api/admin/campaigns');
  const items = data.items || [];
  if (!items.length) {
    box.innerHTML = '<p class="form-note">Каталог пуст — добавьте первую кампанию</p>';
    return;
  }
  box.innerHTML = items
    .map(
      (c) => `
    <div class="admin-item">
      <div class="admin-item-top">
        <strong>#${c.id}</strong>
        <span class="badge-soft">${c.is_active ? 'active' : 'скрыта'}</span>
        <span>${money(c.price)}</span>
      </div>
      <div><b>${escapeHtml(c.title)}</b></div>
      <div class="muted">${escapeHtml(c.sphere)}</div>
      <div class="admin-item-actions">
        <button type="button" class="btn btn-outline btn-sm-admin" data-toggle="${c.id}" data-active="${c.is_active}">
          ${c.is_active ? 'Скрыть' : 'Показать'}
        </button>
        <button type="button" class="btn btn-outline btn-sm-admin danger-btn" data-del="${c.id}">Удалить</button>
      </div>
    </div>`
    )
    .join('');

  box.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Удалить кампанию #' + btn.dataset.del + '?')) return;
      try {
        await adminFetch('/api/admin/campaigns/' + btn.dataset.del, { method: 'DELETE' });
        await refreshAll();
      } catch (e) {
        alert(e.message);
      }
    });
  });
  box.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.toggle;
      const next = btn.dataset.active === '1' ? '0' : '1';
      const fd = new FormData();
      fd.append('is_active', next);
      try {
        await adminFetch('/api/admin/campaigns/' + id, { method: 'PUT', body: fd });
        await refreshAll();
      } catch (e) {
        alert(e.message);
      }
    });
  });
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function refreshAll() {
  await Promise.all([loadLeads(), loadCampaigns()]);
  document.getElementById('adminAuthMsg').textContent = 'Данные загружены';
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem(TOKEN_KEY) || 'directbeza-admin';
  setToken(saved);

  document.getElementById('adminSaveToken').onclick = async () => {
    setToken(document.getElementById('adminToken').value.trim());
    try {
      await refreshAll();
    } catch (e) {
      document.getElementById('adminAuthMsg').textContent = 'Ошибка: ' + e.message;
    }
  };

  document.getElementById('campaignForm').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const msg = document.getElementById('campaignFormMsg');
    msg.textContent = 'Загрузка…';
    const fd = new FormData(form);
    if (!form.is_active.checked) fd.set('is_active', '0');
    else fd.set('is_active', '1');
    try {
      await adminFetch('/api/admin/campaigns', { method: 'POST', body: fd });
      msg.textContent = 'Кампания добавлена в каталог';
      form.reset();
      form.is_active.checked = true;
      await refreshAll();
    } catch (err) {
      msg.textContent = 'Ошибка: ' + err.message;
    }
  };

  refreshAll().catch((e) => {
    document.getElementById('adminAuthMsg').textContent = 'Ошибка: ' + e.message;
  });
});
