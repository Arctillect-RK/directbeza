<?php

/**
 * Выдача тестового / ручного доступа к курсу (личный кабинет).
 * Защита: секрет из includes/config.php → course_grant_secret
 *
 * Откройте: /grant-access.php
 * После выдачи — сохраните ссылку learn.php?token=…
 *
 * На проде смените course_grant_secret или поставьте '' чтобы отключить.
 */

require __DIR__ . '/includes/helpers.php';

$cfg = dbz_config();
$secret = trim((string) ($cfg['course_grant_secret'] ?? ''));

if ($secret === '') {
    http_response_code(404);
    echo 'Grant disabled (course_grant_secret empty in includes/config.php)';
    exit;
}

$error = '';
$okLink = '';
$okToken = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $pass = trim((string) ($_POST['secret'] ?? ''));
    $email = trim((string) ($_POST['email'] ?? 'editor@directbeza.ru'));
    $name = trim((string) ($_POST['name'] ?? 'Editor'));
    $note = trim((string) ($_POST['note'] ?? 'manual grant'));

    if (!hash_equals($secret, $pass)) {
        $error = 'Неверный секрет';
    } else {
        $token = bin2hex(random_bytes(24));
        dbz_grant_course_access([
            'token' => $token,
            'email' => $email !== '' ? $email : 'editor@directbeza.ru',
            'name' => $name !== '' ? $name : 'Editor',
            'status' => 'paid',
            'paid_at' => date('c'),
            'product' => 'course',
            'test' => true,
            'note' => $note,
            'source' => 'grant-access',
        ]);
        $okToken = $token;
        $okLink = dbz_site_url('learn.php?token=' . rawurlencode($token));
    }
}

$list = dbz_load_course_access();
$tests = array_values(array_filter($list, static function ($r) {
    return !empty($r['test']) || (($r['source'] ?? '') === 'grant-access');
}));
// last 10
$tests = array_slice(array_reverse($tests), 0, 10);
?>
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Выдать доступ к курсу | ДиректБезАгенств</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="css/style.css" />
</head>
<body class="page-admin">
  <header class="header">
    <div class="container header-inner">
      <a href="index.html" class="logo">Директ<span>БезАгенств</span></a>
      <a href="admin.html" class="btn btn-header">Админ-заметки</a>
    </div>
  </header>
  <main class="admin-main">
    <div class="container" style="max-width:560px;">
      <p class="solutions-kicker">Только для владельца</p>
      <h1>Тестовый доступ к курсу</h1>
      <p class="rules-intro">
        Создаёт запись в <code>data/private/course-access.json</code> со статусом paid —
        можно сразу открыть кабинет и править контент, сверяя с <code>data/private/course.json</code>.
      </p>

      <?php if ($error !== ''): ?>
        <p class="form-error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p>
      <?php endif; ?>

      <?php if ($okLink !== ''): ?>
        <div class="course-magnet" style="text-align:left;margin-bottom:24px;">
          <div class="course-magnet-badge">Готово</div>
          <h3 style="margin:0 0 10px;font-size:1.15rem;">Ссылка в кабинет</h3>
          <p style="word-break:break-all;margin:0 0 12px;">
            <a href="<?= htmlspecialchars($okLink, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($okLink, ENT_QUOTES, 'UTF-8') ?></a>
          </p>
          <p class="muted" style="font-size:0.85rem;margin:0;">token: <code><?= htmlspecialchars($okToken, ENT_QUOTES, 'UTF-8') ?></code></p>
          <p style="margin:16px 0 0;">
            <a class="btn" href="<?= htmlspecialchars($okLink, ENT_QUOTES, 'UTF-8') ?>">Открыть кабинет →</a>
          </p>
        </div>
      <?php endif; ?>

      <form method="post" class="card-box" style="display:flex;flex-direction:column;gap:12px;">
        <label class="form-label">Секрет (course_grant_secret из config.php) *</label>
        <input type="password" name="secret" required autocomplete="off" placeholder="••••••••" />

        <label class="form-label">Имя в кабинете</label>
        <input type="text" name="name" value="Редактор" />

        <label class="form-label">Email (водяной знак)</label>
        <input type="email" name="email" value="editor@directbeza.ru" />

        <label class="form-label">Заметка</label>
        <input type="text" name="note" value="test edit access" />

        <button type="submit" class="btn">Выдать доступ</button>
      </form>

      <?php if ($tests): ?>
        <h2 style="margin-top:32px;font-size:1.15rem;">Недавние тестовые доступы</h2>
        <ul style="padding-left:1.1em;color:#555;font-size:0.9rem;line-height:1.5;">
          <?php foreach ($tests as $t): ?>
            <li style="margin-bottom:10px;">
              <?= htmlspecialchars((string) ($t['name'] ?? ''), ENT_QUOTES, 'UTF-8') ?>
              · <?= htmlspecialchars((string) ($t['email'] ?? ''), ENT_QUOTES, 'UTF-8') ?>
              <br>
              <a href="learn.php?token=<?= htmlspecialchars(rawurlencode((string) ($t['token'] ?? '')), ENT_QUOTES, 'UTF-8') ?>">
                learn.php?token=<?= htmlspecialchars(substr((string) ($t['token'] ?? ''), 0, 12), ENT_QUOTES, 'UTF-8') ?>…
              </a>
            </li>
          <?php endforeach; ?>
        </ul>
      <?php endif; ?>

      <p class="muted" style="margin-top:28px;font-size:0.85rem;">
        Редактирование текстов: <code>data/private/course.json</code>.
        Инструкция: <code>data/COURSE-EDIT.md</code>.
        Чтобы отключить эту страницу — очистите <code>course_grant_secret</code> в config.
      </p>
    </div>
  </main>
</body>
</html>
