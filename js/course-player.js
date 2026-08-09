/**
 * Кабинет курса:
 * - оглавление / уроки через course-api.php
 * - мобильное меню с закрытием
 * - лайтбокс картинок
 * - блоки image + video
 */

(function () {
  const boot = window.LEARN_BOOT || {};
  const API = boot.api || 'course-api.php';

  const article = document.getElementById('learnArticle');
  const toc = document.getElementById('learnToc');
  const prevBtn = document.getElementById('learnPrev');
  const nextBtn = document.getElementById('learnNext');
  const progressFill = document.getElementById('learnProgressFill');
  const progressText = document.getElementById('learnProgressText');
  const tocToggle = document.getElementById('learnTocToggle');
  const sidebar = document.getElementById('learnSidebar');
  const sidebarClose = document.getElementById('learnSidebarClose');
  const sidebarBackdrop = document.getElementById('learnSidebarBackdrop');
  const wmHost = document.getElementById('learnWm');
  const lightbox = document.getElementById('learnLightbox');
  const lightboxImg = document.getElementById('learnLightboxImg');
  const lightboxCap = document.getElementById('learnLightboxCap');
  const lightboxClose = document.getElementById('learnLightboxClose');

  if (!article) return;

  let flat = [];
  let index = 0;
  let loading = false;
  let me = { name: boot.name || '', email: boot.email || '' };

  const storageKey = 'dbz_learn_prog_v2_' + String(me.email || 'u').slice(0, 24);

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}') || {};
    } catch (_) {
      return {};
    }
  }
  function saveProgress(p) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(p));
    } catch (_) {}
  }

  let progress = loadProgress();

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function mediaUrl(src) {
    let s = String(src || '').trim();
    if (!s) return '';
    if (!/^https?:\/\//i.test(s) && s.charAt(0) !== '/') {
      s = '/' + s.replace(/^\.\//, '');
    }
    return s;
  }

  async function api(action, params) {
    const q = new URLSearchParams({ action, ...(params || {}) });
    const res = await fetch(API + '?' + q.toString(), {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || 'Ошибка загрузки');
    }
    return data;
  }

  /* ---------- mobile sidebar ---------- */
  function setSidebarOpen(open) {
    if (!sidebar) return;
    sidebar.classList.toggle('is-open', open);
    document.body.classList.toggle('learn-sidebar-open', open);
    if (sidebarBackdrop) {
      if (open) sidebarBackdrop.removeAttribute('hidden');
      else sidebarBackdrop.setAttribute('hidden', '');
    }
    if (tocToggle) {
      tocToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      tocToggle.textContent = open ? '✕ Закрыть' : '☰ Модули';
    }
  }

  function setupSidebar() {
    tocToggle?.addEventListener('click', () => {
      setSidebarOpen(!sidebar?.classList.contains('is-open'));
    });
    sidebarClose?.addEventListener('click', () => setSidebarOpen(false));
    sidebarBackdrop?.addEventListener('click', () => setSidebarOpen(false));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        closeLightbox();
      }
    });
  }

  /* ---------- lightbox ---------- */
  function openLightbox(src, cap) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = cap || '';
    if (lightboxCap) lightboxCap.textContent = cap || '';
    lightbox.removeAttribute('hidden');
    document.body.classList.add('learn-lightbox-open');
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.setAttribute('hidden', '');
    document.body.classList.remove('learn-lightbox-open');
    if (lightboxImg) lightboxImg.removeAttribute('src');
  }

  function setupLightbox() {
    lightboxClose?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeLightbox();
    });
    lightbox?.addEventListener('click', (e) => {
      // клик по фону — закрыть
      if (e.target === lightbox) closeLightbox();
    });
  }

  /* ---------- anti-copy ---------- */
  function setupAntiCopy() {
    document.body.classList.add('learn-protected');

    const block = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.learn-lightbox')) return;
      if (e.target.closest('.learn-nocopy, .learn-article, .learn-shell')) block(e);
    });
    document.addEventListener('copy', (e) => {
      if (e.target.closest('.learn-nocopy, .learn-article')) {
        e.clipboardData && e.clipboardData.setData('text/plain', '');
        block(e);
      }
    });
    document.addEventListener('cut', (e) => {
      if (e.target.closest('.learn-nocopy, .learn-article')) block(e);
    });
    document.addEventListener('dragstart', (e) => {
      if (e.target.closest('.learn-nocopy, .learn-article')) block(e);
    });

    document.addEventListener('keydown', (e) => {
      const key = (e.key || '').toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && ['c', 'a', 's', 'p', 'u', 'x'].includes(key)) {
        if (!e.target.closest('input, textarea')) block(e);
      }
      if (key === 'f12') block(e);
      if (ctrl && e.shiftKey && ['i', 'j', 'c'].includes(key)) block(e);
    });

    window.addEventListener('beforeprint', () => document.body.classList.add('learn-printing'));
    window.addEventListener('afterprint', () => document.body.classList.remove('learn-printing'));
  }

  function siteBrand() {
    const cfg = window.SITE_CONFIG || boot || {};
    let u = String(cfg.SITE_URL || cfg.site_url || 'https://directbeza.ru').trim();
    u = u.replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(u)) u = 'https://directbeza.ru';
    // localhost / file → всё равно бренд продакшена
    if (/localhost|127\.0\.0\.1|\.local/i.test(u)) u = 'https://directbeza.ru';
    return u;
  }

  function watermarkLabel() {
    const brand = siteBrand();
    let who = String(me.email || '').trim();
    // тестовые / local-адреса не показываем на фоне
    if (!who || /@local\b|\.local$|localhost|example\.|test@/i.test(who)) {
      return brand;
    }
    return who + ' · ' + brand;
  }

  function updateSupportUi(meData) {
    const statusEl = document.getElementById('learnSupportStatus');
    const btn = document.getElementById('learnSupportExtendBtn');
    if (!statusEl) return;
    const until = meData.support_until || '';
    const active = !!meData.support_active;
    const extend = meData.support_extend || null;
    const plan = meData.plan || 'solo';

    if (active && until) {
      const d = String(until).slice(0, 10);
      statusEl.innerHTML =
        '<span class="learn-support-ok">Активна до ' + escapeHtml(d) + '</span>';
    } else if (until) {
      statusEl.innerHTML = '<span class="learn-support-off">Истекла · можно продлить</span>';
    } else {
      statusEl.innerHTML =
        plan === 'support'
          ? '<span class="learn-support-off">Нет активной поддержки</span>'
          : '<span class="muted">Тариф без поддержки</span>';
    }

    if (btn && extend && extend.price) {
      btn.classList.remove('hidden');
      btn.textContent =
        'Продлить на ' +
        (extend.support_days || 30) +
        ' дн. · ' +
        (Number(extend.price) || 0).toLocaleString('ru-RU') +
        ' ₽';
      btn.onclick = () => {
        if (typeof openPayModal !== 'function') {
          alert('Напишите на zakaz@directbeza.ru для продления');
          return;
        }
        openPayModal({
          productType: 'course_support_extend',
          planId: 'support_extend',
          extendToken: meData.token || '',
          campaignTitle: extend.title || 'Продление поддержки',
          price: extend.price,
        });
        // подставить контакты из кабинета
        const name = document.getElementById('payName');
        const phone = document.getElementById('payPhone');
        const email = document.getElementById('payEmail');
        if (name && meData.name) name.value = meData.name;
        if (phone && meData.phone) phone.value = meData.phone;
        if (email && meData.email) email.value = meData.email;
      };
    } else if (btn) {
      btn.classList.add('hidden');
    }
  }

  function paintWatermark() {
    if (!wmHost) return;
    const label = watermarkLabel();
    const rows = [];
    for (let i = 0; i < 18; i++) {
      rows.push(`<span>${escapeHtml(label)} · курс · ${escapeHtml(label)}</span>`);
    }
    wmHost.innerHTML = rows.join('');
    wmHost.setAttribute('data-wm', label);
  }

  /* ---------- progress / toc ---------- */
  function updateProgressUi() {
    const doneN = Object.keys(progress.done || {}).length;
    const pct = flat.length ? Math.round((doneN / flat.length) * 100) : 0;
    if (progressFill) progressFill.style.width = pct + '%';
    if (progressText) progressText.textContent = pct + '% · ' + doneN + '/' + flat.length;
    toc?.querySelectorAll('[data-idx]').forEach((el) => {
      const i = Number(el.getAttribute('data-idx'));
      el.classList.toggle('is-current', i === index);
      el.classList.toggle('is-done', !!(progress.done && progress.done[flat[i]?.lessonId]));
    });
  }

  function markDone(i) {
    if (!flat[i]) return;
    progress.done = progress.done || {};
    progress.done[flat[i].lessonId] = true;
    progress.index = i;
    saveProgress(progress);
    updateProgressUi();
  }

  function buildToc() {
    if (!toc) return;
    let html = '';
    let lastMod = null;
    flat.forEach((item, i) => {
      if (item.moduleId !== lastMod) {
        if (lastMod !== null) html += '</div>';
        html += `<div class="learn-toc-mod">
          <div class="learn-toc-mod-title"><span>${escapeHtml(String(item.moduleNum))}</span> ${escapeHtml(item.moduleTitle)}</div>`;
        lastMod = item.moduleId;
      }
      html += `<button type="button" class="learn-toc-lesson" data-idx="${i}">${escapeHtml(item.lessonTitle)}</button>`;
    });
    if (lastMod !== null) html += '</div>';
    toc.innerHTML = html;
    toc.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-idx]');
      if (!btn || loading) return;
      index = Number(btn.getAttribute('data-idx'));
      loadLesson();
      setSidebarOpen(false);
    });
  }

  function youtubeId(url) {
    const m = String(url).match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{6,})/
    );
    return m ? m[1] : '';
  }

  function vimeoId(url) {
    const m = String(url).match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? m[1] : '';
  }

  function renderBlock(b) {
    const type = b.type || 'text';
    if (type === 'todo' || type === 'draft' || type === 'editor') return '';

    if (type === 'text') {
      return `<div class="learn-block learn-block-text">${b.html || ''}</div>`;
    }
    if (type === 'callout') {
      const tone = escapeHtml(b.tone || 'soft');
      return `<div class="learn-callout learn-callout-${tone}">
        ${b.title ? `<strong class="learn-callout-title">${escapeHtml(b.title)}</strong>` : ''}
        <div>${b.html || ''}</div>
      </div>`;
    }
    if (type === 'list') {
      const tag = b.ordered ? 'ol' : 'ul';
      const items = (b.items || []).map((it) => `<li>${escapeHtml(it)}</li>`).join('');
      return `<div class="learn-block"><${tag} class="learn-list">${items}</${tag}></div>`;
    }
    if (type === 'link') {
      const href = b.href || '#';
      if (!href || href === '#') return '';
      const label = escapeHtml(b.label || href);
      return `<div class="learn-block"><a class="learn-ext-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label} ↗</a></div>`;
    }
    if (type === 'image') {
      const src = mediaUrl(b.src);
      if (!src) return '';
      const cap = escapeHtml(b.caption || '');
      return `<figure class="learn-figure" data-img-src="${escapeHtml(src)}">
        <button type="button" class="learn-img-btn" data-full="${escapeHtml(src)}" data-cap="${cap}" aria-label="Увеличить">
          <img src="${escapeHtml(src)}" alt="${cap}" draggable="false" decoding="async" />
          <span class="learn-img-zoom-hint">🔍 Нажмите, чтобы увеличить</span>
        </button>
        ${cap ? `<figcaption>${cap}</figcaption>` : ''}
      </figure>`;
    }
    if (type === 'video') {
      // src: файл mp4/webm ИЛИ youtube/vimeo URL
      const src = String(b.src || b.url || '').trim();
      if (!src) return '';
      const cap = escapeHtml(b.caption || '');
      const poster = b.poster ? mediaUrl(b.poster) : '';
      const yt = youtubeId(src);
      const vm = vimeoId(src);

      if (yt) {
        return `<figure class="learn-video">
          <div class="learn-video-frame">
            <iframe src="https://www.youtube.com/embed/${escapeHtml(yt)}" title="${cap || 'Видео'}"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen loading="lazy"></iframe>
          </div>
          ${cap ? `<figcaption>${cap}</figcaption>` : ''}
        </figure>`;
      }
      if (vm) {
        return `<figure class="learn-video">
          <div class="learn-video-frame">
            <iframe src="https://player.vimeo.com/video/${escapeHtml(vm)}" title="${cap || 'Видео'}"
              allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>
          </div>
          ${cap ? `<figcaption>${cap}</figcaption>` : ''}
        </figure>`;
      }

      const file = mediaUrl(src);
      const ext = (file.split('?')[0].split('.').pop() || 'mp4').toLowerCase();
      const mime =
        ext === 'webm' ? 'video/webm' : ext === 'ogg' || ext === 'ogv' ? 'video/ogg' : 'video/mp4';
      return `<figure class="learn-video">
        <video class="learn-video-el" controls playsinline preload="metadata"${
          poster ? ` poster="${escapeHtml(poster)}"` : ''
        }>
          <source src="${escapeHtml(file)}" type="${mime}" />
          Ваш браузер не воспроизводит это видео.
        </video>
        ${cap ? `<figcaption>${cap}</figcaption>` : ''}
      </figure>`;
    }
    return `<div class="learn-block">${b.html || ''}</div>`;
  }

  function bindMedia(root) {
    root.querySelectorAll('.learn-figure').forEach((fig) => {
      const img = fig.querySelector('img');
      const btn = fig.querySelector('.learn-img-btn');
      if (!img) return;

      const onErr = () => {
        fig.classList.add('is-missing');
        fig.innerHTML =
          '<p class="muted" style="padding:16px;text-align:center;margin:0">Изображение временно недоступно</p>';
      };
      img.addEventListener('error', onErr);
      if (img.complete && img.naturalWidth === 0 && img.currentSrc) onErr();

      btn?.addEventListener('click', (e) => {
        e.preventDefault();
        const full = btn.getAttribute('data-full') || img.currentSrc || img.src;
        const cap = btn.getAttribute('data-cap') || img.alt || '';
        openLightbox(full, cap);
      });
    });
  }

  async function loadLesson() {
    const item = flat[index];
    if (!item || !article) return;
    loading = true;
    article.innerHTML = `<p class="muted">Загрузка урока…</p>`;
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;

    try {
      const data = await api('lesson', { id: item.lessonId });
      const lesson = data.lesson || {};
      if (data.wm) {
        me.email = me.email || data.wm;
        paintWatermark();
      }
      const blocksHtml = (lesson.blocks || []).map(renderBlock).filter(Boolean).join('');
      article.innerHTML = `
        <p class="learn-crumb">Модуль ${escapeHtml(String(lesson.moduleNum ?? item.moduleNum))} · ${escapeHtml(lesson.moduleTitle || item.moduleTitle)}</p>
        <h2 class="learn-lesson-title">${escapeHtml(lesson.lessonTitle || item.lessonTitle)}</h2>
        <div class="learn-blocks learn-nocopy">${blocksHtml || '<p class="muted">В этом уроке пока нет материалов — загляните в соседние модули.</p>'}</div>
        <p class="learn-footer-wm muted">${escapeHtml(watermarkLabel())} · материал курса ДиректБезАгенств</p>
      `;

      bindMedia(article);
      markDone(index);
    } catch (e) {
      article.innerHTML = `<div class="error-banner">${escapeHtml(e.message)}. <a href="learn.php?logout=1">Выйти</a> и войти по ссылке снова.</div>`;
    }

    loading = false;
    if (prevBtn) prevBtn.disabled = index <= 0;
    if (nextBtn) {
      nextBtn.disabled = index >= flat.length - 1;
      nextBtn.textContent = index >= flat.length - 1 ? 'Конец курса' : 'Далее →';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateProgressUi();
  }

  prevBtn?.addEventListener('click', () => {
    if (index > 0 && !loading) {
      index--;
      loadLesson();
    }
  });
  nextBtn?.addEventListener('click', () => {
    if (index < flat.length - 1 && !loading) {
      index++;
      loadLesson();
    }
  });

  async function bootApp() {
    setupAntiCopy();
    setupSidebar();
    setupLightbox();
    paintWatermark();
    try {
      const data = await api('outline');
      if (data.me) {
        me = Object.assign({}, me, data.me, {
          name: data.me.name || me.name,
          email: data.me.email || me.email,
        });
        const n = document.getElementById('learnUserName');
        const em = document.getElementById('learnUserEmail');
        if (n) n.textContent = me.name || '—';
        if (em) em.textContent = me.email || '—';
        paintWatermark();
        updateSupportUi(data.me);
      }
      const outline = data.outline || {};
      const titleEl = document.getElementById('learnCourseTitle');
      if (titleEl && outline.title) titleEl.textContent = outline.title;

      flat = [];
      (outline.modules || []).forEach((mod) => {
        (mod.lessons || []).forEach((lesson) => {
          flat.push({
            moduleId: mod.id,
            moduleNum: mod.num,
            moduleTitle: mod.title,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
          });
        });
      });

      if (!flat.length) {
        article.innerHTML = '<p class="form-error">В курсе пока нет уроков.</p>';
        return;
      }

      index = Math.min(Math.max(0, Number(progress.index) || 0), flat.length - 1);
      buildToc();
      await loadLesson();
    } catch (e) {
      article.innerHTML = `<div class="error-banner">${escapeHtml(e.message)}</div>
        <p><a class="btn" href="course.html">К курсу</a></p>`;
    }
  }

  bootApp();
})();
