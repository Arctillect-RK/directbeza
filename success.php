<?php

require __DIR__ . '/includes/helpers.php';

$pid = trim((string) ($_GET['pid'] ?? ''));
$token = trim((string) ($_GET['token'] ?? ''));
$productHint = trim((string) ($_GET['product'] ?? ''));
$status = 'unknown';
$payment = null;
$title = '';
$amount = '';
$email = '';
$type = $productHint === 'course' ? 'course' : '';
$accessToken = '';
$learnUrl = '';

if ($pid !== '') {
    $payment = dbz_yoo_request('GET', '/payments/' . rawurlencode($pid));
    if (!empty($payment['status'])) {
        $status = (string) $payment['status'];
        $meta = $payment['metadata'] ?? [];
        $title = (string) ($meta['campaign_title'] ?? $payment['description'] ?? '');
        $amount = (string) (($payment['amount']['value'] ?? '') . ' ' . ($payment['amount']['currency'] ?? ''));
        $email = (string) ($meta['email'] ?? '');
        $type = (string) ($meta['type'] ?? $type);
        $accessToken = (string) ($meta['access_token'] ?? '');

        if ($status === 'succeeded') {
            dbz_handle_paid_payment($payment, 'success_page');
            if ($type === 'course' && $accessToken !== '') {
                // Сразу открыть кабинет в этом браузере (cookie) + ссылка с token
                dbz_set_course_session($accessToken);
                $learnUrl = dbz_site_url('learn.php?token=' . rawurlencode($accessToken));
            }
        }
    }
}

$ok = $status === 'succeeded';
$pending = in_array($status, ['pending', 'waiting_for_capture'], true);
$isCourse = $type === 'course';
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= $ok ? 'Оплата прошла' : ($pending ? 'Оплата обрабатывается' : 'Статус оплаты') ?> | ДиректБезАгенств</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/style.css" />
  <link rel="icon" href="favicon.svg" type="image/svg+xml" />
</head>
<body class="page-catalog">
  <header class="header">
    <div class="container header-inner">
      <a href="index.html" class="logo">Директ<span>БезАгенств</span></a>
      <div class="nav-wrapper">
        <nav class="nav">
          <a href="index.html">Главная</a>
          <a href="catalog.html">Каталог</a>
          <a href="course.html">Курс</a>
          <a href="rules.html">Правила</a>
        </nav>
      </div>
    </div>
  </header>

  <main class="catalog-main">
    <div class="container" style="max-width:640px;padding:48px 16px 80px;">
      <?php if ($ok && $isCourse): ?>
        <h1 style="margin-bottom:12px;">Оплата курса прошла ✅</h1>
        <p style="color:#444;line-height:1.55;">
          Спасибо<?= $title !== '' ? ' за покупку «' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '»' : '' ?>.
          <?php if ($amount !== ''): ?>
            Сумма: <strong><?= htmlspecialchars(trim($amount), ENT_QUOTES, 'UTF-8') ?></strong>.
          <?php endif; ?>
        </p>
        <?php if ($learnUrl !== ''): ?>
          <div class="course-magnet" style="margin:24px 0;text-align:left;">
            <div class="course-magnet-badge">Личный кабинет</div>
            <h3 style="margin:0 0 10px;font-size:1.2rem;">Доступ к урокам открыт</h3>
            <p style="margin:0 0 16px;color:#555;">
              Нажмите кнопку — откроется кабинет. В этом браузере сессия сохранится (cookie).
              <strong>Сохраните ссылку</strong> — она нужна, чтобы войти с другого устройства.
              <?= $email !== '' ? 'Email в заказе: <strong>' . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . '</strong>.' : '' ?>
            </p>
            <a class="btn" href="<?= htmlspecialchars($learnUrl, ENT_QUOTES, 'UTF-8') ?>">Войти в кабинет →</a>
            <p class="muted" style="margin-top:14px;font-size:0.85rem;word-break:break-all;">
              <?= htmlspecialchars($learnUrl, ENT_QUOTES, 'UTF-8') ?>
            </p>
            <p class="muted" style="margin-top:10px;font-size:0.82rem;">
              Материалы в кабинете защищены от простого копирования. Передавать ссылку третьим лицам нельзя — доступ ваш персональный.
            </p>
          </div>
        <?php else: ?>
          <p style="color:#444;">Напишите на <a href="mailto:zakaz@directbeza.ru">zakaz@directbeza.ru</a> — вышлем ссылку доступа вручную.</p>
        <?php endif; ?>

      <?php elseif ($ok): ?>
        <h1 style="margin-bottom:12px;">Оплата прошла успешно ✅</h1>
        <p style="color:#444;line-height:1.55;">
          Спасибо<?= $title !== '' ? ' за покупку «' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '»' : '' ?>.
          Мы получили платёж<?= $amount !== '' ? ' на сумму <strong>' . htmlspecialchars(trim($amount), ENT_QUOTES, 'UTF-8') . '</strong>' : '' ?>
          и передадим файлы на<?= $email !== '' ? ' <strong>' . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . '</strong>' : ' вашу почту' ?>
          (обычно в течение 1 рабочего дня, часто быстрее).
        </p>

      <?php elseif ($pending): ?>
        <h1 style="margin-bottom:12px;">Платёж обрабатывается…</h1>
        <p style="color:#444;line-height:1.55;">
          ЮKassa ещё не подтвердила оплату. Если списание прошло — статус обновится автоматически.
          Обновите эту страницу через минуту.
        </p>
      <?php else: ?>
        <h1 style="margin-bottom:12px;">Не видим подтверждённой оплаты</h1>
        <p style="color:#444;line-height:1.55;">
          Если вы только что оплатили — подождите минуту и обновите страницу, либо напишите нам:
          <a href="mailto:zakaz@directbeza.ru">zakaz@directbeza.ru</a>
          / <a href="mailto:info@directbeza.ru">info@directbeza.ru</a>
          <?php if ($pid !== ''): ?>
            <br><span class="muted" style="font-size:0.9rem;">ID платежа: <?= htmlspecialchars($pid, ENT_QUOTES, 'UTF-8') ?></span>
          <?php endif; ?>
        </p>
      <?php endif; ?>

      <div class="hero-actions" style="justify-content:flex-start;margin-top:28px;">
        <?php if ($ok && $isCourse && $learnUrl !== ''): ?>
          <a class="btn" href="<?= htmlspecialchars($learnUrl, ENT_QUOTES, 'UTF-8') ?>">В курс</a>
        <?php endif; ?>
        <a class="btn <?= ($ok && $isCourse) ? 'btn-outline' : '' ?>" href="catalog.html">В каталог</a>
        <a class="btn btn-outline" href="course.html">О курсе</a>
      </div>
    </div>
  </main>

  <footer id="contacts" class="site-footer">
    <div class="container">
      <p>
        <a href="mailto:info@directbeza.ru">info@directbeza.ru</a>
        ·
        <a href="mailto:zakaz@directbeza.ru">zakaz@directbeza.ru</a>
      </p>
      <p>© 2026 ДиректБезАгенств</p>
    </div>
  </footer>
</body>
</html>
