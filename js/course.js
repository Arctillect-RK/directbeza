/** Лендинг курса: тарифы, программа, оплата */

async function loadCourseMeta() {
  const url = (window.SITE_CONFIG?.COURSE_URL || 'data/course.json') + '?t=' + Date.now();
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Не удалось загрузить data/course.json');
  return res.json();
}

function money(n) {
  return (Number(n) || 0).toLocaleString('ru-RU') + ' ₽';
}

function escape(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderProgram(modules) {
  const host = document.getElementById('courseProgram');
  if (!host || !modules) return;
  host.innerHTML = modules
    .map(
      (m) => `
    <article class="course-prog-item">
      <div class="course-prog-num">${m.num ?? ''}</div>
      <div>
        <h3>${escape(m.title)}</h3>
        <p>${escape(m.summary || '')}</p>
        ${m.free_preview ? '<span class="course-prog-badge">Вводный модуль</span>' : ''}
        <span class="muted" style="font-size:0.82rem;">${m.lessons ? m.lessons.length : m.lessons_count || 0} урок(ов)</span>
      </div>
    </article>`
    )
    .join('');
}

function defaultPlans() {
  return [
    {
      id: 'solo',
      title: 'Курс без поддержки',
      price: 3500,
      support_days: 0,
      short: 'Доступ к урокам. Без личных консультаций.',
      features: ['Полный доступ к курсу', 'Обновления модулей', 'Без персональной поддержки'],
    },
    {
      id: 'support',
      title: 'Курс + поддержка 1 месяц',
      price: 5900,
      support_days: 30,
      badge: 'С поддержкой',
      short: 'Всё из базового + месяц ответов.',
      features: [
        'Полный доступ к курсу',
        'Поддержка 30 дней',
        'Продление из кабинета',
      ],
    },
  ];
}

function renderPlans(course) {
  const host = document.getElementById('coursePlans');
  if (!host) return;
  const plans = Array.isArray(course.plans) && course.plans.length ? course.plans : defaultPlans();
  host.innerHTML = plans
    .map((p) => {
      const feats = (p.features || [])
        .map((f) => `<li>${escape(f)}</li>`)
        .join('');
      const featured = p.id === 'support' ? ' course-plan-card-featured' : '';
      const badge = p.badge
        ? `<span class="course-plan-badge">${escape(p.badge)}</span>`
        : '';
      return `
      <article class="course-plan-card${featured}" data-plan="${escape(p.id)}">
        ${badge}
        <h3>${escape(p.title)}</h3>
        <p class="course-plan-short">${escape(p.short || '')}</p>
        <div class="course-plan-price">${money(p.price)}</div>
        <ul class="course-plan-features">${feats}</ul>
        <button type="button" class="btn course-plan-buy" data-plan-id="${escape(p.id)}" data-plan-price="${Number(p.price) || 0}" data-plan-title="${escape(p.title)}">
          Купить · ${money(p.price)}
        </button>
      </article>`;
    })
    .join('');

  host.querySelectorAll('[data-plan-id]').forEach((btn) => {
    btn.addEventListener('click', () => buyPlan(btn.getAttribute('data-plan-id')));
  });
}

function buyPlan(planId) {
  const c = window.__COURSE__ || {};
  const plans = Array.isArray(c.plans) && c.plans.length ? c.plans : defaultPlans();
  const plan = plans.find((p) => p.id === planId) || plans[0];
  if (typeof openPayModal !== 'function') {
    alert('Оплата временно недоступна');
    return;
  }
  openPayModal({
    productType: 'course',
    planId: plan.id,
    campaignId: 'course_' + plan.id,
    campaignTitle: (c.title || 'Курс') + ' — ' + plan.title,
    price: plan.price,
  });
}

function fillPricing(course) {
  const plans = Array.isArray(course.plans) && course.plans.length ? course.plans : defaultPlans();
  const min = Math.min(...plans.map((p) => Number(p.price) || 0).filter((n) => n > 0));
  document.querySelectorAll('[data-course-price]').forEach((el) => {
    el.textContent = 'от ' + money(min || course.price || 3500);
  });
  document.querySelectorAll('[data-course-title]').forEach((el) => {
    el.textContent = course.title || 'Курс';
  });
  const includes = document.getElementById('courseIncludes');
  if (includes && Array.isArray(course.includes)) {
    includes.innerHTML = course.includes.map((x) => `<li>${escape(x)}</li>`).join('');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const course = await loadCourseMeta();
    window.__COURSE__ = course;
    fillPricing(course);
    renderPlans(course);
    renderProgram(course.modules || []);
  } catch (e) {
    const host = document.getElementById('courseProgram');
    if (host) host.innerHTML = `<p class="form-error">${escape(e.message)}</p>`;
    renderPlans({});
  }

  document.getElementById('courseBuyBtn')?.addEventListener('click', () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.querySelectorAll('[data-course-buy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
});
