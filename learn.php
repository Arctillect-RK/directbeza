<?php

require __DIR__ . '/includes/helpers.php';

// Выход
if (isset($_GET['logout'])) {
    dbz_clear_course_session();
    header('Location: course.html');
    exit;
}

$tokenGet = trim((string) ($_GET['token'] ?? ''));
// Можно вставить целиком ссылку learn.php?token=... или только token
if ($tokenGet !== '' && (strpos($tokenGet, 'token=') !== false || strpos($tokenGet, 'http') !== false)) {
    if (preg_match('/[?&]token=([a-fA-F0-9]+)/', $tokenGet, $m)) {
        $tokenGet = $m[1];
    } elseif (preg_match('/\b([a-fA-F0-9]{24,})\b/', $tokenGet, $m)) {
        $tokenGet = $m[1];
    }
}
$auth = dbz_resolve_course_access($tokenGet !== '' ? $tokenGet : null);

// Первый заход с ?token= — ставим cookie и убираем token из URL (сложнее шарить ссылку из адресной строки)
if ($auth['ok'] && $tokenGet !== '') {
    dbz_set_course_session($auth['token']);
    header('Location: learn.php');
    exit;
}

$ok = !empty($auth['ok']);
$errCode = $auth['error'] ?? '';
$errMap = [
    'no_token' => 'Нет активной сессии. Откройте персональную ссылку после оплаты (из письма или со страницы «Оплата прошла») — после входа доступ сохранится в этом браузере.',
    'invalid' => 'Ссылка недействительна или доступ отозван. Напишите на zakaz@directbeza.ru с email покупки.',
    'unpaid' => 'Оплата ещё не подтверждена. Обновите страницу через минуту после оплаты или откройте ссылку со страницы успеха.',
];
$err = $errMap[$errCode] ?? 'Нет доступа к кабинету.';

$access = $auth['access'] ?? null;
$buyerName = (string) ($access['name'] ?? '');
$buyerEmail = (string) ($access['email'] ?? '');
$paidAt = (string) ($access['paid_at'] ?? '');
$outline = $ok ? dbz_course_outline() : null;
$courseTitle = $outline['title'] ?? 'Личный кабинет курса';
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <meta name="referrer" content="no-referrer" />
  <title><?= htmlspecialchars($ok ? $courseTitle : 'Вход в кабинет', ENT_QUOTES, 'UTF-8') ?> | ДиректБезАгенств</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/style.css" />
  <link rel="icon" href="favicon.svg" type="image/svg+xml" />
</head>
<body class="page-learn<?= $ok ? ' learn-protected' : '' ?>">
  <header class="header">
    <div class="container header-inner">
      <a href="index.html" class="logo">Директ<span>БезАгенств</span></a>
      <div class="nav-wrapper">
        <nav class="nav" id="nav-menu">
          <?php if ($ok): ?>
            <span class="learn-nav-user" title="<?= htmlspecialchars($buyerEmail, ENT_QUOTES, 'UTF-8') ?>">
              👤 <?= htmlspecialchars($buyerName !== '' ? $buyerName : ($buyerEmail ?: 'Ученик'), ENT_QUOTES, 'UTF-8') ?>
            </span>
            <a href="learn.php?logout=1">Выйти</a>
          <?php else: ?>
            <a href="course.html">О курсе</a>
            <a href="catalog.html">Каталог</a>
          <?php endif; ?>
          <a href="mailto:zakaz@directbeza.ru">Поддержка</a>
        </nav>
        <button class="menu-toggle" id="mobile-menu-btn" type="button" aria-label="Меню">☰</button>
      </div>
    </div>
  </header>

  <?php if (!$ok): ?>
  <main class="catalog-main">
    <div class="container learn-gate">
      <div class="learn-gate-card">
        <p class="course-badge">Личный кабинет</p>
        <h1>Вход для учеников</h1>
        <p class="learn-gate-text">
          <?= htmlspecialchars($err, ENT_QUOTES, 'UTF-8') ?>
        </p>
        <p class="learn-gate-hint muted">
          Уже оплатили курс? Вставьте <strong>ссылку целиком</strong> или только ключ <code>token</code>
          со страницы «Оплата прошла» / из сохранённых закладок.
        </p>
        <form class="learn-gate-form" method="get" action="learn.php">
          <label class="form-label" for="token">Ссылка или ключ доступа</label>
          <input type="text" name="token" id="token" placeholder="learn.php?token=… или сам token" autocomplete="off" spellcheck="false" />
          <button type="submit" class="btn" style="width:100%;">Войти в кабинет</button>
        </form>
        <p class="muted" style="margin-top:16px;font-size:0.9rem;">
          Ключ привязан к вашей оплате. Если потеряли — напишите с email покупки на
          <a href="mailto:zakaz@directbeza.ru">zakaz@directbeza.ru</a>, вышлем доступ вручную.
        </p>
        <div class="hero-actions" style="justify-content:flex-start;margin-top:20px;flex-wrap:wrap;gap:10px;">
          <a class="btn btn-outline" href="course.html">Ещё не покупал — к курсу</a>
        </div>
      </div>
    </div>
  </main>
  <?php else: ?>
  <div class="learn-wm" id="learnWm" aria-hidden="true"></div>
  <div class="learn-sidebar-backdrop" id="learnSidebarBackdrop" hidden></div>

  <!-- Увеличение картинки -->
  <div class="learn-lightbox" id="learnLightbox" hidden>
    <button type="button" class="learn-lightbox-close" id="learnLightboxClose" aria-label="Закрыть">×</button>
    <img src="" alt="" id="learnLightboxImg" draggable="false" />
    <p class="learn-lightbox-cap" id="learnLightboxCap"></p>
  </div>

  <div class="learn-shell">
    <aside class="learn-sidebar" id="learnSidebar">
      <div class="learn-sidebar-top">
        <p class="learn-kicker" style="margin:0">Личный кабинет</p>
        <button type="button" class="learn-sidebar-close" id="learnSidebarClose" aria-label="Закрыть меню">×</button>
      </div>
      <div class="learn-sidebar-head">
        <h1 class="learn-course-title" id="learnCourseTitle"><?= htmlspecialchars($courseTitle, ENT_QUOTES, 'UTF-8') ?></h1>
        <div class="learn-profile">
          <div class="learn-profile-row">
            <span class="muted">Ученик</span>
            <strong id="learnUserName"><?= htmlspecialchars($buyerName !== '' ? $buyerName : '—', ENT_QUOTES, 'UTF-8') ?></strong>
          </div>
          <div class="learn-profile-row">
            <span class="muted">Email</span>
            <strong id="learnUserEmail"><?= htmlspecialchars($buyerEmail !== '' ? $buyerEmail : '—', ENT_QUOTES, 'UTF-8') ?></strong>
          </div>
          <?php if ($paidAt !== ''): ?>
          <div class="learn-profile-row">
            <span class="muted">Оплата</span>
            <strong><?= htmlspecialchars(substr($paidAt, 0, 10), ENT_QUOTES, 'UTF-8') ?></strong>
          </div>
          <?php endif; ?>
        </div>
        <div class="learn-progress-wrap">
          <div class="learn-progress-bar"><span id="learnProgressFill"></span></div>
          <span id="learnProgressText" class="muted">0%</span>
        </div>
        <div class="learn-support-box" id="learnSupportBox">
          <div class="learn-support-label">Поддержка</div>
          <div class="learn-support-status" id="learnSupportStatus">Загрузка…</div>
          <button type="button" class="btn btn-outline learn-support-btn hidden" id="learnSupportExtendBtn">Продлить поддержку</button>
        </div>
      </div>
      <nav class="learn-toc" id="learnToc" aria-label="Содержание"></nav>
      <p class="learn-sidebar-note muted">
        Материалы защищены. Копирование и выгрузка ограничены.
        Доступ привязан к вашей оплате и этому браузеру (cookie).
      </p>
      <a class="learn-logout-link" href="learn.php?logout=1">Выйти из кабинета</a>
    </aside>

    <main class="learn-main">
      <button type="button" class="learn-toc-toggle btn btn-outline" id="learnTocToggle">☰ Модули</button>
      <article class="learn-article learn-nocopy" id="learnArticle">
        <p class="muted">Загрузка кабинета…</p>
      </article>
      <div class="learn-nav-btns">
        <button type="button" class="btn btn-outline" id="learnPrev" disabled>← Назад</button>
        <button type="button" class="btn" id="learnNext">Далее →</button>
      </div>
    </main>
  </div>

  <script>
    window.LEARN_BOOT = {
      title: <?= json_encode($courseTitle, JSON_UNESCAPED_UNICODE) ?>,
      name: <?= json_encode($buyerName, JSON_UNESCAPED_UNICODE) ?>,
      email: <?= json_encode($buyerEmail, JSON_UNESCAPED_UNICODE) ?>,
      SITE_URL: 'https://directbeza.ru',
      api: 'course-api.php'
    };
  </script>
  <!-- Оплата продления поддержки -->
  <div class="modal-overlay" id="pay-modal-overlay">
    <div class="modal-content modal-wide">
      <button class="modal-close" type="button" onclick="closePayModal()">×</button>
      <h3 id="pay-modal-title">Продление поддержки</h3>
      <p id="pay-modal-sub" style="color:#666;margin:0 0 8px;">Оплата картой через ЮKassa</p>
      <form class="modal-form" id="payForm">
        <input type="hidden" id="payProductType" value="course_support_extend" />
        <input type="hidden" id="payPlanId" value="support_extend" />
        <input type="hidden" id="payExtendToken" value="" />
        <input type="hidden" id="payCampaignId" value="course_support_extend" />
        <input type="hidden" id="payCampaignTitle" value="" />
        <input type="hidden" id="payPrice" value="" />
        <div id="payCampaignInfo" class="lead-campaign-chip hidden"></div>
        <p style="margin:0;font-weight:800;font-size:1.35rem;" id="payPriceLabel"></p>
        <label class="form-label">Имя *</label>
        <input type="text" id="payName" required />
        <label class="form-label">Телефон *</label>
        <input type="tel" id="payPhone" required />
        <label class="form-label">Email *</label>
        <input type="email" id="payEmail" required />
        <input type="hidden" id="payWebsite" value="" />
        <p id="payFormError" class="form-error hidden"></p>
        <p id="payFormOk" class="form-ok hidden"></p>
        <button type="submit" class="btn" style="width:100%;" id="paySubmitBtn">Оплатить</button>
      </form>
    </div>
  </div>

  <script src="js/config.js"></script>
  <script src="js/course-player.js"></script>
  <?php endif; ?>

  <script src="js/config.js"></script>
  <script src="js/script.js"></script>
</body>
</html>

