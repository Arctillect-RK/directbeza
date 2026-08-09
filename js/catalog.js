/* Каталог — статический JSON на хосте */

let _allCampaigns = [];
let _filterTimer = null;

function cardHtml(item) {
  const img = CatalogData.previewUrl(item);
  const href = 'campaign.html?id=' + encodeURIComponent(item.id);
  return `
    <article class="catalog-card" data-id="${item.id}">
      <a class="catalog-card-link" href="${href}">
        <div class="catalog-card-media">
          <img src="${img}" alt="${CatalogData.escapeAttr(item.title)}" loading="lazy" />
          <span class="catalog-card-date">${CatalogData.formatDate(item.created_at)}</span>
        </div>
        <div class="catalog-card-body">
          <p class="catalog-card-sphere">${CatalogData.escapeHtml(item.sphere)}</p>
          <h3>${CatalogData.escapeHtml(item.title)}</h3>
          <p class="catalog-card-desc">${CatalogData.escapeHtml(item.description || 'Готовая структура кампаний для загрузки в Директ.')}</p>
          <div class="catalog-card-footer">
            <div class="catalog-card-price">${CatalogData.money(item.price)}</div>
            <span class="btn catalog-buy-btn">Подробнее →</span>
          </div>
        </div>
      </a>
    </article>`;
}

function getFilterState() {
  return {
    q: document.getElementById('filterQ')?.value?.trim() || '',
    sort: document.getElementById('filterSort')?.value || 'date_desc',
    minPrice: document.getElementById('filterMin')?.value ?? '',
    maxPrice: document.getElementById('filterMax')?.value ?? '',
    sphere: document.getElementById('filterSphere')?.value || '',
  };
}

function hasActiveFilters(state) {
  return !!(
    state.q ||
    state.sphere ||
    String(state.minPrice).trim() !== '' ||
    String(state.maxPrice).trim() !== '' ||
    (state.sort && state.sort !== 'date_desc')
  );
}

function updateFilterUi(state, total, found) {
  const count = document.getElementById('catalogCount');
  const resetBtn = document.getElementById('filterReset');
  const bar = document.getElementById('filterActiveBar');
  const tags = document.getElementById('filterActiveTags');
  const filtersBox = document.querySelector('.catalog-filters');

  if (count) {
    if (!found) {
      count.textContent = hasActiveFilters(state)
        ? `Ничего не найдено · всего в каталоге ${total}`
        : 'Пока пусто';
    } else if (hasActiveFilters(state) && found < total) {
      count.textContent = `Показано ${found} из ${total}`;
    } else {
      count.textContent = `В каталоге: ${found}`;
    }
  }

  if (resetBtn) {
    resetBtn.classList.toggle('is-visible', hasActiveFilters(state));
    resetBtn.disabled = !hasActiveFilters(state);
  }

  if (filtersBox) {
    filtersBox.classList.toggle('has-active-filters', hasActiveFilters(state));
  }

  if (bar && tags) {
    const chips = [];
    if (state.q) chips.push({ label: 'Поиск: «' + state.q + '»', key: 'q' });
    if (state.sphere) chips.push({ label: 'Сфера: ' + state.sphere, key: 'sphere' });
    if (String(state.minPrice).trim() !== '') {
      chips.push({ label: 'от ' + CatalogData.money(state.minPrice), key: 'min' });
    }
    if (String(state.maxPrice).trim() !== '') {
      chips.push({ label: 'до ' + CatalogData.money(state.maxPrice), key: 'max' });
    }
    if (state.sort && state.sort !== 'date_desc') {
      const sortLabels = {
        date_asc: 'Сначала старые',
        price_asc: 'Цена ↑',
        price_desc: 'Цена ↓',
        sphere: 'По сфере',
        title: 'По названию',
      };
      chips.push({ label: sortLabels[state.sort] || state.sort, key: 'sort' });
    }

    if (chips.length) {
      bar.classList.remove('hidden');
      tags.innerHTML = chips
        .map(
          (c) =>
            `<button type="button" class="filter-chip" data-clear="${c.key}">${CatalogData.escapeHtml(c.label)} <span aria-hidden="true">×</span></button>`
        )
        .join('');
    } else {
      bar.classList.add('hidden');
      tags.innerHTML = '';
    }
  }

  // подсветка чипов сфер
  document.querySelectorAll('.sphere-chip').forEach((btn) => {
    const v = btn.getAttribute('data-sphere') || '';
    btn.classList.toggle('is-active', v === (state.sphere || ''));
  });
}

function syncUrl(state) {
  try {
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.sphere) params.set('sphere', state.sphere);
    if (String(state.minPrice).trim() !== '') params.set('min', state.minPrice);
    if (String(state.maxPrice).trim() !== '') params.set('max', state.maxPrice);
    if (state.sort && state.sort !== 'date_desc') params.set('sort', state.sort);
    const qs = params.toString();
    const url = qs ? location.pathname + '?' + qs : location.pathname;
    history.replaceState(null, '', url);
  } catch (_) {
    /* ignore */
  }
}

function applyUrlToFilters() {
  try {
    const p = new URLSearchParams(location.search);
    const map = {
      q: 'filterQ',
      sphere: 'filterSphere',
      min: 'filterMin',
      max: 'filterMax',
      sort: 'filterSort',
    };
    Object.entries(map).forEach(([key, id]) => {
      if (!p.has(key)) return;
      const el = document.getElementById(id);
      if (el) el.value = p.get(key) || '';
    });
  } catch (_) {
    /* ignore */
  }
}

function renderFiltered(opts = {}) {
  const grid = document.getElementById('catalogGrid');
  const empty = document.getElementById('catalogEmpty');
  if (!grid) return;

  const state = getFilterState();
  const items = CatalogData.filterCampaigns(_allCampaigns, state);

  updateFilterUi(state, _allCampaigns.length, items.length);
  if (!opts.skipUrl) syncUrl(state);

  grid.innerHTML = items.map(cardHtml).join('');
  if (empty) empty.classList.toggle('hidden', items.length > 0);

  // анимация карточек
  requestAnimationFrame(() => {
    grid.querySelectorAll('.catalog-card').forEach((card, i) => {
      card.style.animationDelay = Math.min(i * 30, 300) + 'ms';
      card.classList.add('catalog-card-in');
    });
  });
}

function scheduleFilter() {
  clearTimeout(_filterTimer);
  _filterTimer = setTimeout(() => renderFiltered(), 180);
}

function clearFilterKey(key) {
  if (key === 'q') {
    const el = document.getElementById('filterQ');
    if (el) el.value = '';
  } else if (key === 'sphere') {
    const el = document.getElementById('filterSphere');
    if (el) el.value = '';
  } else if (key === 'min') {
    const el = document.getElementById('filterMin');
    if (el) el.value = '';
  } else if (key === 'max') {
    const el = document.getElementById('filterMax');
    if (el) el.value = '';
  } else if (key === 'sort') {
    const el = document.getElementById('filterSort');
    if (el) el.value = 'date_desc';
  }
  renderFiltered();
}

function resetFilters() {
  ['filterQ', 'filterMin', 'filterMax'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const sphere = document.getElementById('filterSphere');
  if (sphere) sphere.value = '';
  const s = document.getElementById('filterSort');
  if (s) s.value = 'date_desc';
  renderFiltered();
}

function fillSphereSelect(items) {
  const sel = document.getElementById('filterSphere');
  if (!sel) return;
  const current = sel.value;
  const spheres = CatalogData.uniqueSpheres(items);
  const opts =
    '<option value="">Все сферы</option>' +
    spheres
      .map((s) => `<option value="${CatalogData.escapeAttr(s)}">${CatalogData.escapeHtml(s)}</option>`)
      .join('');
  sel.innerHTML = opts;
  if (current && spheres.includes(current)) sel.value = current;

  // популярные чипы — сферы с ≥2 карточками, максимум 10
  const chipsHost = document.getElementById('sphereChips');
  if (!chipsHost) return;
  const counts = {};
  items.forEach((c) => {
    const s = String(c.sphere || '').trim();
    if (!s) return;
    counts[s] = (counts[s] || 0) + 1;
  });
  const popular = Object.entries(counts)
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
    .slice(0, 10);

  if (!popular.length) {
    chipsHost.innerHTML = '';
    chipsHost.classList.add('hidden');
    return;
  }

  chipsHost.classList.remove('hidden');
  chipsHost.innerHTML =
    `<button type="button" class="sphere-chip is-active" data-sphere="">Все</button>` +
    popular
      .map(
        ([s, n]) =>
          `<button type="button" class="sphere-chip" data-sphere="${CatalogData.escapeAttr(s)}">${CatalogData.escapeHtml(s)} <em>${n}</em></button>`
      )
      .join('');
}

async function loadCatalog() {
  const err = document.getElementById('catalogError');
  const empty = document.getElementById('catalogEmpty');
  if (err) {
    err.classList.add('hidden');
    err.textContent = '';
  }

  try {
    _allCampaigns = await CatalogData.fetchCampaigns();
    fillSphereSelect(_allCampaigns);
    applyUrlToFilters();
    // если sphere из URL не в select — всё равно применится через value
    renderFiltered();
  } catch (e) {
    if (err) {
      err.textContent =
        e.message + ' Залейте на хост файл data/campaigns.json рядом с index.html.';
      err.classList.remove('hidden');
    }
    const grid = document.getElementById('catalogGrid');
    if (grid) grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    const count = document.getElementById('catalogCount');
    if (count) count.textContent = 'Ошибка загрузки';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('filterApply')?.addEventListener('click', () => renderFiltered());
  document.getElementById('filterQ')?.addEventListener('input', scheduleFilter);
  document.getElementById('filterQ')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(_filterTimer);
      renderFiltered();
    }
  });
  document.getElementById('filterSort')?.addEventListener('change', () => renderFiltered());
  document.getElementById('filterSphere')?.addEventListener('change', () => renderFiltered());
  document.getElementById('filterMin')?.addEventListener('input', scheduleFilter);
  document.getElementById('filterMax')?.addEventListener('input', scheduleFilter);
  document.getElementById('filterReset')?.addEventListener('click', resetFilters);

  document.getElementById('sphereChips')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.sphere-chip');
    if (!btn) return;
    const sphere = btn.getAttribute('data-sphere') || '';
    const sel = document.getElementById('filterSphere');
    if (sel) sel.value = sphere;
    renderFiltered();
  });

  document.getElementById('filterActiveTags')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-clear]');
    if (!btn) return;
    clearFilterKey(btn.getAttribute('data-clear'));
  });

  loadCatalog();
});
