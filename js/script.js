const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const navMenu = document.getElementById('nav-menu');

function setMobileNavOpen(open) {
  if (!navMenu || !mobileMenuBtn) return;
  navMenu.classList.toggle('active', open);
  mobileMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  mobileMenuBtn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  document.body.classList.toggle('nav-open', open);
}

if (mobileMenuBtn && navMenu) {
  mobileMenuBtn.setAttribute('aria-controls', 'nav-menu');
  mobileMenuBtn.setAttribute('aria-expanded', 'false');

  mobileMenuBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMobileNavOpen(!navMenu.classList.contains('active'));
  });

  document.querySelectorAll('.nav a, .btn-header').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 900) setMobileNavOpen(false);
    });
  });

  // клик вне меню — закрыть
  document.addEventListener('click', (e) => {
    if (!navMenu.classList.contains('active')) return;
    if (mobileMenuBtn.contains(e.target) || navMenu.contains(e.target)) return;
    setMobileNavOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMobileNavOpen(false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) setMobileNavOpen(false);
  });
}

const modalOverlay = document.getElementById('buy-modal-overlay');
function openModal(tariff, price) {
  if (!modalOverlay) {
    openLeadModal({ type: 'custom_campaign', note: tariff });
    return;
  }
  const t = document.getElementById('modal-tariff');
  const p = document.getElementById('modal-price');
  if (t) t.textContent = tariff;
  if (p) p.textContent = price;
  modalOverlay.classList.add('active');
}
function closeModal() {
  if (modalOverlay) modalOverlay.classList.remove('active');
}
if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}

function siteConfig() {
  return window.SITE_CONFIG || {};
}

function telegramUrl() {
  const u = (siteConfig().TELEGRAM_USER || 'your_telegram').replace(/^@/, '');
  return 'https://t.me/' + u;
}

function openLeadModal(opts = {}) {
  const overlay = document.getElementById('lead-modal-overlay');
  if (!overlay) {
    window.location.href = 'catalog.html';
    return;
  }
  const type = opts.type || 'custom_campaign';
  document.getElementById('leadType').value = type;
  document.getElementById('leadCampaignId').value = opts.campaignId || '';

  // note — метка источника (курс, шаблон и т.д.), пишем в title если нет campaignTitle
  const noteLabels = {
    course_waitlist: 'Лист ожидания курса',
    course_interest: 'Интерес к курсу',
    media_plan_template: 'Шаблон медиаплана',
  };
  const noteTitle = opts.note ? noteLabels[opts.note] || opts.note : '';
  document.getElementById('leadCampaignTitle').value =
    opts.campaignTitle || noteTitle || '';

  const title = document.getElementById('lead-modal-title');
  const sub = document.getElementById('lead-modal-sub');
  const chip = document.getElementById('leadCampaignInfo');

  if (type === 'ready_campaign' && opts.campaignTitle) {
    if (title) title.textContent = 'Заявка на готовую кампанию';
    if (sub) sub.textContent = 'Свяжемся, согласуем оплату и передадим файлы';
    if (chip) {
      chip.textContent = '📦 ' + opts.campaignTitle;
      chip.classList.remove('hidden');
    }
  } else if (opts.note && noteTitle) {
    if (title) title.textContent = noteTitle;
    if (sub) sub.textContent = 'Оставьте контакты — ответим и пришлём детали';
    if (chip) {
      chip.textContent = '🎓 ' + noteTitle;
      chip.classList.remove('hidden');
    }
  } else {
    if (title) title.textContent = 'Заявка на сбор кампании';
    if (sub) sub.textContent = 'Расскажите о бизнесе — соберём структуру РК под вас';
    if (chip) {
      chip.textContent = '';
      chip.classList.add('hidden');
    }
  }

  const err = document.getElementById('leadFormError');
  const ok = document.getElementById('leadFormOk');
  if (err) {
    err.classList.add('hidden');
    err.textContent = '';
  }
  if (ok) {
    ok.classList.add('hidden');
    ok.textContent = '';
  }

  overlay.classList.add('active');
}

function closeLeadModal() {
  const overlay = document.getElementById('lead-modal-overlay');
  if (overlay) overlay.classList.remove('active');
}

const leadOverlay = document.getElementById('lead-modal-overlay');
if (leadOverlay) {
  leadOverlay.addEventListener('click', (e) => {
    if (e.target === leadOverlay) closeLeadModal();
  });
}

function buildLeadText(payload) {
  const lines = [
    'Заявка с directbeza.ru',
    'Тип: ' + (payload.type === 'ready_campaign' ? 'готовая РК' : 'сбор кампании'),
    payload.campaign_title ? 'Пакет: ' + payload.campaign_title : '',
    'Имя: ' + payload.name,
    'Телефон: ' + payload.phone,
    'Email: ' + payload.email,
    payload.website ? 'Сайт: ' + payload.website : '',
    payload.promote_what ? 'Продвигаем: ' + payload.promote_what : '',
    payload.city ? 'Город: ' + payload.city : '',
  ].filter(Boolean);
  return lines.join('\n');
}

function notifyEmails() {
  const cfg = siteConfig();
  const primary = (cfg.LEADS_EMAIL || '').trim();
  const cc = (cfg.LEADS_EMAIL_CC || '').trim();
  const list = [];
  if (primary && primary.includes('@') && !primary.includes('example')) list.push(primary);
  if (cc && cc.includes('@') && !cc.includes('example') && !list.includes(cc)) list.push(cc);
  // запасной набор, если config пустой
  if (!list.length) {
    list.push('zakaz@directbeza.ru', 'info@directbeza.ru');
  }
  return list;
}

/** Заявка: FormSubmit → обе почты + fallback в Telegram */
async function submitLead(payload) {
  const emails = notifyEmails();
  const tg = (siteConfig().TELEGRAM_USER || '').replace(/^@/, '');
  const primary = emails[0];
  const cc = emails.slice(1).join(',');

  if (primary) {
    const endpoint = 'https://formsubmit.co/ajax/' + encodeURIComponent(primary);
    const body = {
      _subject: '[ДиректБезАгенств] ' + (payload.campaign_title || payload.type),
      _template: 'table',
      _captcha: 'false',
      _replyto: payload.email || '',
      type: payload.type,
      campaign: payload.campaign_title || '',
      campaign_id: payload.campaign_id || '',
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      website: payload.website || '',
      promote_what: payload.promote_what || '',
      city: payload.city || '',
      message: buildLeadText(payload),
    };
    if (cc) body._cc = cc;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || 'Не удалось отправить. Напишите на zakaz@directbeza.ru');
    }
    return { ok: true, via: 'email', to: emails };
  }

  // Нет email — открываем Telegram с текстом заявки
  if (tg && tg !== 'your_telegram') {
    const text = encodeURIComponent(buildLeadText(payload));
    window.open('https://t.me/' + tg + '?text=' + text, '_blank', 'noopener');
    return { ok: true, via: 'telegram' };
  }

  throw new Error(
    'Настройте LEADS_EMAIL в js/config.js или напишите на zakaz@directbeza.ru / info@directbeza.ru'
  );
}

/** Онлайн-оплата готовой РК / курса → buy.php (ЮKassa) */
async function startPayment(payload) {
  const cfg = siteConfig();
  if (cfg.PAYMENT_ENABLED === false) {
    throw new Error('Онлайн-оплата временно отключена. Оставьте заявку или напишите на почту.');
  }
  const endpoint = cfg.PAYMENT_ENDPOINT || 'buy.php';
  const body = {
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    website: payload.website || '',
  };
  if (
    payload.product_type === 'course_support_extend' ||
    payload.plan_id === 'support_extend'
  ) {
    body.product_type = 'course_support_extend';
    body.plan_id = 'support_extend';
    body.extend_token = payload.extend_token || payload.access_token || '';
  } else if (payload.product_type === 'course' || payload.campaign_id === 'course' || String(payload.campaign_id || '').indexOf('course') === 0) {
    body.product_type = 'course';
    body.plan_id = payload.plan_id || 'solo';
  } else {
    body.product_type = 'ready_campaign';
    body.campaign_id = payload.campaign_id;
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Не удалось создать платёж. Напишите на zakaz@directbeza.ru');
  }
  if (!data.confirmation_url) {
    throw new Error('Нет ссылки на оплату от платёжной системы');
  }
  window.location.href = data.confirmation_url;
  return { ok: true };
}

const leadForm = document.getElementById('leadForm');
if (leadForm) {
  leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('leadFormError');
    const ok = document.getElementById('leadFormOk');
    const btn = document.getElementById('leadSubmitBtn');
    err.classList.add('hidden');
    ok.classList.add('hidden');

    const payload = {
      type: document.getElementById('leadType').value || 'custom_campaign',
      website: document.getElementById('leadWebsite').value.trim(),
      promote_what: document.getElementById('leadPromote').value.trim(),
      city: document.getElementById('leadCity').value.trim(),
      name: document.getElementById('leadName').value.trim(),
      phone: document.getElementById('leadPhone').value.trim(),
      email: document.getElementById('leadEmail').value.trim(),
      campaign_id: document.getElementById('leadCampaignId').value || null,
      campaign_title: document.getElementById('leadCampaignTitle').value || '',
    };

    if (!payload.name || !payload.phone || !payload.email) {
      err.textContent = 'Укажите имя, телефон и email';
      err.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Отправка…';
    try {
      const result = await submitLead(payload);
      ok.textContent =
        result.via === 'telegram'
          ? 'Открыли Telegram — отправьте сообщение, если оно не ушло автоматически.'
          : 'Заявка отправлена. Мы свяжемся с вами.';
      ok.classList.remove('hidden');
      leadForm.reset();
      document.getElementById('leadType').value = payload.type;
      document.getElementById('leadCampaignId').value = payload.campaign_id || '';
      document.getElementById('leadCampaignTitle').value = payload.campaign_title || '';
      if (typeof ym === 'function') {
        try {
          ym(110027869, 'reachGoal', 'lead_submit');
        } catch (_) {}
      }
    } catch (ex) {
      err.classList.remove('hidden');
      const tg = (siteConfig().TELEGRAM_USER || '').replace(/^@/, '');
      const safe = String(ex.message || 'Ошибка').replace(/[<>&]/g, '');
      if (tg && tg !== 'your_telegram') {
        err.innerHTML =
          safe +
          ' <a href="' +
          telegramUrl() +
          '" target="_blank" rel="noopener">Написать в Telegram</a>';
      } else {
        err.textContent = ex.message;
      }
    } finally {
      btn.disabled = false;
      btn.textContent = 'Отправить заявку';
    }
  });
}

// Подставить ссылку Telegram в футере, если есть data-tg-link
document.querySelectorAll('[data-tg-link]').forEach((el) => {
  el.href = telegramUrl();
  if (el.dataset.tgText !== '0') {
    const u = (siteConfig().TELEGRAM_USER || 'your_telegram').replace(/^@/, '');
    if (el.tagName === 'A' && !el.querySelector('img')) {
      const onlyAt = el.textContent.trim().startsWith('@') || el.textContent.includes('your_telegram');
      if (onlyAt) el.textContent = '@' + u;
    }
  }
});

// Модалка оплаты готовой РК / курса
function openPayModal(opts = {}) {
  const overlay = document.getElementById('pay-modal-overlay');
  const isExtend =
    opts.productType === 'course_support_extend' ||
    opts.planId === 'support_extend' ||
    opts.plan_id === 'support_extend';
  const isCourse =
    isExtend ||
    opts.productType === 'course' ||
    opts.campaignId === 'course' ||
    String(opts.campaignId || '').indexOf('course') === 0;
  if (!overlay) {
    openLeadModal({
      type: isCourse ? 'custom_campaign' : 'ready_campaign',
      campaignId: opts.campaignId,
      campaignTitle: opts.campaignTitle,
      note: isCourse ? 'course_waitlist' : undefined,
    });
    return;
  }
  const planId = opts.planId || opts.plan_id || (isCourse ? 'solo' : '');
  document.getElementById('payCampaignId').value = isExtend
    ? 'course_support_extend'
    : isCourse
      ? 'course_' + (planId || 'solo')
      : opts.campaignId || '';
  document.getElementById('payCampaignTitle').value = opts.campaignTitle || '';
  document.getElementById('payPrice').value = opts.price != null ? String(opts.price) : '';
  const typeEl = document.getElementById('payProductType');
  if (typeEl) {
    typeEl.value = isExtend ? 'course_support_extend' : isCourse ? 'course' : 'ready_campaign';
  }
  let planEl = document.getElementById('payPlanId');
  if (!planEl && document.getElementById('payForm')) {
    planEl = document.createElement('input');
    planEl.type = 'hidden';
    planEl.id = 'payPlanId';
    document.getElementById('payForm').appendChild(planEl);
  }
  if (planEl) planEl.value = planId || '';
  let extEl = document.getElementById('payExtendToken');
  if (!extEl && document.getElementById('payForm')) {
    extEl = document.createElement('input');
    extEl.type = 'hidden';
    extEl.id = 'payExtendToken';
    document.getElementById('payForm').appendChild(extEl);
  }
  if (extEl) extEl.value = opts.extendToken || opts.access_token || '';

  const chip = document.getElementById('payCampaignInfo');
  const priceEl = document.getElementById('payPriceLabel');
  const modalTitle = document.getElementById('pay-modal-title');
  const modalSub = document.getElementById('pay-modal-sub');
  if (modalTitle) {
    modalTitle.textContent = isExtend
      ? 'Продление поддержки'
      : isCourse
        ? 'Оплата курса'
        : 'Оплата кампании';
  }
  if (modalSub) {
    modalSub.textContent = isExtend
      ? 'Добавим 30 дней поддержки к вашему доступу'
      : isCourse
        ? 'После оплаты откроется доступ к урокам'
        : 'После оплаты пришлём файлы на email';
  }
  if (chip) {
    const icon = isCourse ? '🎓 ' : '📦 ';
    chip.textContent =
      icon +
      (opts.campaignTitle || (isCourse ? 'Курс' : 'Готовая РК')) +
      (opts.price != null
        ? ' — ' + (window.CatalogData ? CatalogData.money(opts.price) : Number(opts.price).toLocaleString('ru-RU') + ' ₽')
        : '');
    chip.classList.remove('hidden');
  }
  if (priceEl) {
    priceEl.textContent =
      opts.price != null
        ? window.CatalogData
          ? CatalogData.money(opts.price)
          : Number(opts.price).toLocaleString('ru-RU') + ' ₽'
        : '';
  }

  const err = document.getElementById('payFormError');
  const ok = document.getElementById('payFormOk');
  if (err) {
    err.classList.add('hidden');
    err.textContent = '';
  }
  if (ok) {
    ok.classList.add('hidden');
    ok.textContent = '';
  }
  overlay.classList.add('active');
}

function closePayModal() {
  const overlay = document.getElementById('pay-modal-overlay');
  if (overlay) overlay.classList.remove('active');
}

const payOverlay = document.getElementById('pay-modal-overlay');
if (payOverlay) {
  payOverlay.addEventListener('click', (e) => {
    if (e.target === payOverlay) closePayModal();
  });
}

const payForm = document.getElementById('payForm');
if (payForm) {
  payForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('payFormError');
    const ok = document.getElementById('payFormOk');
    const btn = document.getElementById('paySubmitBtn');
    err.classList.add('hidden');
    ok.classList.add('hidden');

    const productType =
      document.getElementById('payProductType')?.value ||
      (document.getElementById('payCampaignId').value.indexOf('course') === 0
        ? 'course'
        : 'ready_campaign');
    const payload = {
      product_type: productType,
      plan_id: document.getElementById('payPlanId')?.value || 'solo',
      extend_token: document.getElementById('payExtendToken')?.value || '',
      campaign_id: document.getElementById('payCampaignId').value,
      campaign_title: document.getElementById('payCampaignTitle').value,
      name: document.getElementById('payName').value.trim(),
      phone: document.getElementById('payPhone').value.trim(),
      email: document.getElementById('payEmail').value.trim(),
      website: (document.getElementById('payWebsite')?.value || '').trim(),
    };

    if (
      (!payload.campaign_id && productType !== 'course') ||
      !payload.name ||
      !payload.phone ||
      !payload.email
    ) {
      err.textContent = 'Укажите имя, телефон и email';
      err.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Переход к оплате…';
    try {
      await startPayment(payload);
      ok.textContent = 'Перенаправляем в ЮKassa…';
      ok.classList.remove('hidden');
      if (typeof ym === 'function') {
        try {
          ym(110027869, 'reachGoal', 'pay_start');
        } catch (_) {}
      }
    } catch (ex) {
      err.classList.remove('hidden');
      err.innerHTML =
        String(ex.message || 'Ошибка').replace(/[<>&]/g, '') +
        ' · <a href="mailto:zakaz@directbeza.ru">zakaz@directbeza.ru</a>';
      btn.disabled = false;
      btn.textContent = 'Оплатить картой';
    }
  });
}

// Подставить контакты в футере
document.querySelectorAll('[data-contact-emails]').forEach((el) => {
  el.innerHTML =
    '<a href="mailto:info@directbeza.ru">info@directbeza.ru</a>' +
    ' · ' +
    '<a href="mailto:zakaz@directbeza.ru">zakaz@directbeza.ru</a>';
});

window.openModal = openModal;
window.closeModal = closeModal;
window.openLeadModal = openLeadModal;
window.closeLeadModal = closeLeadModal;
window.openPayModal = openPayModal;
window.closePayModal = closePayModal;
window.startPayment = startPayment;
window.telegramUrl = telegramUrl;
