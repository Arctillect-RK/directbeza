<?php

function dbz_str_cut(string $s, int $max): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($s, 0, $max);
    }
    return substr($s, 0, $max);
}

function dbz_config(): array
{
    static $cfg;
    if ($cfg === null) {
        $cfg = require __DIR__ . '/config.php';
    }
    return $cfg;
}

function dbz_yookassa(): array
{
    static $cfg;
    if ($cfg === null) {
        $cfg = require __DIR__ . '/yookassa-config.php';
    }
    return $cfg;
}

function dbz_site_url(string $path = ''): string
{
    $cfg = dbz_config();
    $base = rtrim((string) ($cfg['site_url'] ?? ''), '/');
    if ($base === '') {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443)
            || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
        $host = $_SERVER['HTTP_HOST'] ?? 'directbeza.ru';
        $base = ($https ? 'https' : 'http') . '://' . $host;
    }
    if ($path === '' || $path === '/') {
        return $base . '/';
    }
    return $base . '/' . ltrim($path, '/');
}

function dbz_campaigns_path(): string
{
    return dirname(__DIR__) . '/data/campaigns.json';
}

function dbz_load_campaigns(): array
{
    $path = dbz_campaigns_path();
    if (!is_file($path)) {
        return [];
    }
    $raw = file_get_contents($path);
    $data = json_decode($raw ?: '[]', true);
    if (!is_array($data)) {
        return [];
    }
    return array_values(array_filter(
        isset($data[0]) || $data === [] ? $data : ($data['items'] ?? $data['campaigns'] ?? []),
        static function ($c) {
            if (!is_array($c)) {
                return false;
            }
            if (array_key_exists('active', $c) && $c['active'] === false) {
                return false;
            }
            if (array_key_exists('is_active', $c) && ($c['is_active'] === 0 || $c['is_active'] === false)) {
                return false;
            }
            return true;
        }
    ));
}

function dbz_find_campaign($id): ?array
{
    foreach (dbz_load_campaigns() as $c) {
        if ((string) ($c['id'] ?? '') === (string) $id) {
            return $c;
        }
    }
    return null;
}

function dbz_payments_log_path(): string
{
    return dirname(__DIR__) . '/data/payments.json';
}

function dbz_log_payment(array $row): void
{
    $path = dbz_payments_log_path();
    $list = [];
    if (is_file($path)) {
        $list = json_decode(file_get_contents($path) ?: '[]', true) ?: [];
    }
    // de-dup by payment_id
    $pid = (string) ($row['payment_id'] ?? '');
    if ($pid !== '') {
        foreach ($list as $item) {
            if (($item['payment_id'] ?? '') === $pid && ($item['status'] ?? '') === ($row['status'] ?? '')) {
                return;
            }
        }
    }
    $list[] = $row;
    // keep last 500
    if (count($list) > 500) {
        $list = array_slice($list, -500);
    }
    file_put_contents($path, json_encode($list, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);
}

function dbz_notify_emails(string $subject, string $body): bool
{
    $cfg = dbz_config();
    $emails = $cfg['notify_emails'] ?? [];
    if (!$emails) {
        return false;
    }
    $to = implode(', ', $emails);
    $from = $cfg['mail_from'] ?? 'noreply@directbeza.ru';
    $fromName = $cfg['mail_from_name'] ?? 'ДиректБезАгенств';
    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'From: ' . sprintf('%s <%s>', '=?UTF-8?B?' . base64_encode($fromName) . '?=', $from),
        'Reply-To: ' . ($emails[0] ?? $from),
    ];
    $ok = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers));

    // Fallback: FormSubmit (если mail() отключён на хостинге)
    if (!$ok && !empty($emails[0])) {
        $payload = [
            '_subject' => $subject,
            '_template' => 'table',
            '_captcha' => 'false',
            'message' => $body,
        ];
        if (!empty($emails[1])) {
            $payload['_cc'] = $emails[1];
        }
        $ch = curl_init('https://formsubmit.co/ajax/' . rawurlencode($emails[0]));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 12,
        ]);
        $res = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $ok = $code >= 200 && $code < 300;
        if (!$ok) {
            error_log('[directbeza] notify fail: ' . ($res ?: 'no response'));
        }
    }

    return (bool) $ok;
}

function dbz_yoo_request(string $method, string $path, ?array $body = null, ?string $idempotence = null): array
{
    $yoo = dbz_yookassa();
    $url = 'https://api.yookassa.ru/v3' . $path;
    $ch = curl_init($url);
    $headers = ['Content-Type: application/json'];
    if ($idempotence) {
        $headers[] = 'Idempotence-Key: ' . $idempotence;
    }
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_USERPWD => $yoo['shop_id'] . ':' . $yoo['secret_key'],
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20,
    ];
    $m = strtoupper($method);
    if ($m === 'POST') {
        $opts[CURLOPT_POST] = true;
        $opts[CURLOPT_POSTFIELDS] = json_encode($body ?? new stdClass(), JSON_UNESCAPED_UNICODE);
    } elseif ($m === 'PATCH') {
        $opts[CURLOPT_CUSTOMREQUEST] = 'PATCH';
        $opts[CURLOPT_POSTFIELDS] = json_encode($body ?? new stdClass(), JSON_UNESCAPED_UNICODE);
    }
    curl_setopt_array($ch, $opts);
    $raw = curl_exec($ch);
    $err = curl_error($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($raw === false) {
        return ['_error' => $err ?: 'curl failed', '_http' => $code];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return ['_error' => 'bad json', '_http' => $code, '_raw' => $raw];
    }
    $data['_http'] = $code;
    return $data;
}

function dbz_course_path(): string
{
    // Полный контент — только private (не отдаётся по HTTP)
    $private = dirname(__DIR__) . '/data/private/course.json';
    if (is_file($private)) {
        return $private;
    }
    return dirname(__DIR__) . '/data/course.json';
}

function dbz_course_public_path(): string
{
    return dirname(__DIR__) . '/data/course.json';
}

function dbz_course_access_path(): string
{
    $private = dirname(__DIR__) . '/data/private/course-access.json';
    if (is_dir(dirname($private))) {
        return $private;
    }
    return dirname(__DIR__) . '/data/course-access.json';
}

/** Секрет для подписи cookie кабинета (из ключа ЮKassa) */
function dbz_course_cookie_secret(): string
{
    $yoo = dbz_yookassa();
    $raw = (string) ($yoo['secret_key'] ?? '') . '|' . (string) ($yoo['shop_id'] ?? 'dbz');
    return hash('sha256', $raw . '|course_sess_v1');
}

function dbz_course_cookie_name(): string
{
    return 'dbz_learn';
}

/** Установить HttpOnly cookie с токеном доступа (180 дней) */
function dbz_set_course_session(string $token): void
{
    $token = trim($token);
    if ($token === '') {
        return;
    }
    $exp = time() + 86400 * 180;
    $sig = hash_hmac('sha256', $token . '|' . $exp, dbz_course_cookie_secret());
    $val = rtrim(strtr(base64_encode($token . '|' . $exp . '|' . $sig), '+/', '-_'), '=');
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['SERVER_PORT']) && (int) $_SERVER['SERVER_PORT'] === 443)
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    setcookie(dbz_course_cookie_name(), $val, [
        'expires' => $exp,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    $_COOKIE[dbz_course_cookie_name()] = $val;
}

function dbz_clear_course_session(): void
{
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    setcookie(dbz_course_cookie_name(), '', [
        'expires' => time() - 3600,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    unset($_COOKIE[dbz_course_cookie_name()]);
}

/** Достать токен из подписанной cookie */
function dbz_course_token_from_cookie(): string
{
    $raw = (string) ($_COOKIE[dbz_course_cookie_name()] ?? '');
    if ($raw === '') {
        return '';
    }
    $pad = 4 - (strlen($raw) % 4);
    if ($pad < 4) {
        $raw .= str_repeat('=', $pad);
    }
    $decoded = base64_decode(strtr($raw, '-_', '+/'), true);
    if ($decoded === false) {
        return '';
    }
    $parts = explode('|', $decoded);
    if (count($parts) !== 3) {
        return '';
    }
    [$token, $exp, $sig] = $parts;
    if (!ctype_digit((string) $exp) || (int) $exp < time()) {
        return '';
    }
    $expect = hash_hmac('sha256', $token . '|' . $exp, dbz_course_cookie_secret());
    if (!hash_equals($expect, $sig)) {
        return '';
    }
    return trim($token);
}

/**
 * Резолв доступа: ?token= или cookie. При валидном token ставит cookie.
 * @return array{ok:bool,token:string,access:?array,error:string}
 */
function dbz_resolve_course_access(?string $tokenParam = null): array
{
    $tokenParam = trim((string) ($tokenParam ?? ($_GET['token'] ?? '')));
    $token = $tokenParam !== '' ? $tokenParam : dbz_course_token_from_cookie();

    if ($token === '') {
        return ['ok' => false, 'token' => '', 'access' => null, 'error' => 'no_token'];
    }

    $access = dbz_find_course_access($token);
    if (!$access) {
        return ['ok' => false, 'token' => $token, 'access' => null, 'error' => 'invalid'];
    }

    $st = (string) ($access['status'] ?? '');
    $allowed = !empty($access['paid_at']) || $st === 'paid' || $st === 'active';

    if (!$allowed && !empty($access['payment_id'])) {
        $pay = dbz_yoo_request('GET', '/payments/' . rawurlencode((string) $access['payment_id']));
        if (($pay['status'] ?? '') === 'succeeded') {
            dbz_grant_course_access(array_merge($access, [
                'token' => $token,
                'status' => 'paid',
                'paid_at' => date('c'),
            ]));
            $access = dbz_find_course_access($token);
            $allowed = (bool) $access;
        }
    }

    if (!$allowed) {
        return ['ok' => false, 'token' => $token, 'access' => $access, 'error' => 'unpaid'];
    }

    // Обновим cookie (продление) и last_seen
    dbz_set_course_session($token);
    dbz_grant_course_access(array_merge($access, [
        'token' => $token,
        'last_seen' => date('c'),
        'last_ip' => (string) ($_SERVER['REMOTE_ADDR'] ?? ''),
    ]));

    return ['ok' => true, 'token' => $token, 'access' => $access, 'error' => ''];
}

/**
 * Оглавление без текстов уроков (для кабинета).
 * @return array<string,mixed>|null
 */
function dbz_course_outline(): ?array
{
    $c = dbz_load_course();
    if (!$c) {
        return null;
    }
    $modules = [];
    foreach ($c['modules'] ?? [] as $m) {
        if (!is_array($m)) {
            continue;
        }
        $lessons = [];
        foreach ($m['lessons'] ?? [] as $l) {
            if (!is_array($l)) {
                continue;
            }
            $lessons[] = [
                'id' => $l['id'] ?? '',
                'title' => $l['title'] ?? '',
            ];
        }
        $modules[] = [
            'id' => $m['id'] ?? '',
            'num' => $m['num'] ?? 0,
            'title' => $m['title'] ?? '',
            'summary' => $m['summary'] ?? '',
            'lessons' => $lessons,
        ];
    }
    return [
        'id' => $c['id'] ?? 'course',
        'title' => $c['title'] ?? 'Курс',
        'subtitle' => $c['subtitle'] ?? '',
        'modules' => $modules,
    ];
}

/**
 * Один урок по id (полный контент).
 * @return array<string,mixed>|null
 */
/**
 * Блоки для ученика: без todo/черновиков и без служебных placeholder-полей.
 * @param list<mixed> $blocks
 * @return list<array<string,mixed>>
 */
function dbz_course_blocks_for_student(array $blocks): array
{
    $out = [];
    foreach ($blocks as $b) {
        if (!is_array($b)) {
            continue;
        }
        $type = (string) ($b['type'] ?? 'text');
        if (in_array($type, ['todo', 'draft', 'editor'], true)) {
            continue;
        }
        if ($type === 'link' && (trim((string) ($b['href'] ?? '')) === '' || ($b['href'] ?? '') === '#')) {
            continue;
        }
        if ($type === 'image' || $type === 'video') {
            $src = trim((string) ($b['src'] ?? $b['url'] ?? ''));
            if ($src === '') {
                continue;
            }
            // Локальные пути: img/course/x → /img/course/x (внешние http(s) не трогаем)
            if (!preg_match('#^https?://#i', $src) && strpos($src, '/') !== 0) {
                $src = '/' . ltrim($src, './');
            }
            $item = [
                'type' => $type,
                'src' => $src,
                'caption' => (string) ($b['caption'] ?? ''),
            ];
            if ($type === 'video' && !empty($b['poster'])) {
                $poster = trim((string) $b['poster']);
                if ($poster !== '' && !preg_match('#^https?://#i', $poster) && strpos($poster, '/') !== 0) {
                    $poster = '/' . ltrim($poster, './');
                }
                $item['poster'] = $poster;
            }
            $out[] = $item;
            continue;
        }
        $clean = $b;
        unset($clean['placeholder'], $clean['editor_note'], $clean['_note']);
        $out[] = $clean;
    }
    return $out;
}

function dbz_course_lesson(string $lessonId): ?array
{
    $c = dbz_load_course();
    if (!$c) {
        return null;
    }
    foreach ($c['modules'] ?? [] as $m) {
        if (!is_array($m)) {
            continue;
        }
        foreach ($m['lessons'] ?? [] as $l) {
            if (!is_array($l)) {
                continue;
            }
            if ((string) ($l['id'] ?? '') === $lessonId) {
                return [
                    'moduleId' => $m['id'] ?? '',
                    'moduleNum' => $m['num'] ?? 0,
                    'moduleTitle' => $m['title'] ?? '',
                    'lessonId' => $l['id'] ?? '',
                    'lessonTitle' => $l['title'] ?? '',
                    'blocks' => dbz_course_blocks_for_student($l['blocks'] ?? []),
                ];
            }
        }
    }
    return null;
}

/** @return array<string,mixed>|null */
function dbz_load_course(): ?array
{
    $path = dbz_course_path();
    if (!is_file($path)) {
        return null;
    }
    $data = json_decode(file_get_contents($path) ?: '', true);
    return is_array($data) ? $data : null;
}

/**
 * Тариф курса: solo | support | support_extend
 * @return array{id:string,title:string,price:float,support_days:int,short?:string,features?:list}|null
 */
function dbz_course_plan(string $planId): ?array
{
    $c = dbz_load_course();
    if (!$c) {
        return null;
    }
    $planId = trim($planId);
    if ($planId === '' || $planId === 'course') {
        $planId = 'solo';
    }

    if ($planId === 'support_extend') {
        $ext = $c['support_extend'] ?? null;
        if (!is_array($ext)) {
            return null;
        }
        return [
            'id' => 'support_extend',
            'title' => (string) ($ext['title'] ?? 'Продление поддержки'),
            'price' => (float) ($ext['price'] ?? 0),
            'support_days' => (int) ($ext['support_days'] ?? 30),
            'short' => (string) ($ext['short'] ?? ''),
        ];
    }

    foreach ($c['plans'] ?? [] as $p) {
        if (!is_array($p)) {
            continue;
        }
        if ((string) ($p['id'] ?? '') === $planId) {
            return [
                'id' => (string) $p['id'],
                'title' => (string) ($p['title'] ?? $planId),
                'price' => (float) ($p['price'] ?? 0),
                'support_days' => (int) ($p['support_days'] ?? 0),
                'short' => (string) ($p['short'] ?? ''),
                'features' => is_array($p['features'] ?? null) ? $p['features'] : [],
                'badge' => (string) ($p['badge'] ?? ''),
            ];
        }
    }

    // fallback: старый формат с одной price
    if ($planId === 'solo') {
        $price = (float) ($c['price'] ?? 0);
        if ($price < 1) {
            return null;
        }
        return [
            'id' => 'solo',
            'title' => (string) ($c['title'] ?? 'Курс'),
            'price' => $price,
            'support_days' => 0,
            'short' => '',
            'features' => [],
        ];
    }
    return null;
}

/** Продлить support_until на N дней (от max(now, current)) */
function dbz_extend_support_until(?string $current, int $days): string
{
    $days = max(1, $days);
    $base = time();
    if ($current) {
        $t = strtotime($current);
        if ($t !== false && $t > $base) {
            $base = $t;
        }
    }
    return date('c', $base + $days * 86400);
}

/**
 * Публичные поля курса (без полного текста уроков — для лендинга).
 * @return array<string,mixed>|null
 */
function dbz_course_public_meta(): ?array
{
    $c = dbz_load_course();
    if (!$c || empty($c['active'])) {
        return null;
    }
    $modules = [];
    foreach ($c['modules'] ?? [] as $m) {
        if (!is_array($m)) {
            continue;
        }
        $modules[] = [
            'id' => $m['id'] ?? '',
            'num' => $m['num'] ?? 0,
            'title' => $m['title'] ?? '',
            'summary' => $m['summary'] ?? '',
            'free_preview' => !empty($m['free_preview']),
            'lessons_count' => is_array($m['lessons'] ?? null) ? count($m['lessons']) : 0,
        ];
    }
    return [
        'id' => $c['id'] ?? 'course',
        'title' => $c['title'] ?? 'Курс',
        'subtitle' => $c['subtitle'] ?? '',
        'price' => (float) ($c['price'] ?? 0),
        'currency' => $c['currency'] ?? 'RUB',
        'duration' => $c['duration'] ?? '',
        'level' => $c['level'] ?? '',
        'updated_at' => $c['updated_at'] ?? '',
        'cover' => $c['cover'] ?? '',
        'includes' => $c['includes'] ?? [],
        'bonus' => $c['bonus'] ?? null,
        'modules' => $modules,
        'preview_modules' => (int) ($c['preview_modules'] ?? 1),
    ];
}

/** @return list<array<string,mixed>> */
function dbz_load_course_access(): array
{
    $path = dbz_course_access_path();
    if (!is_file($path)) {
        return [];
    }
    $data = json_decode(file_get_contents($path) ?: '[]', true);
    return is_array($data) ? $data : [];
}

function dbz_save_course_access(array $list): void
{
    $path = dbz_course_access_path();
    file_put_contents(
        $path,
        json_encode(array_values($list), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
        LOCK_EX
    );
}

/**
 * Выдать / обновить доступ к курсу по токену.
 * @param array<string,mixed> $row
 */
function dbz_grant_course_access(array $row): void
{
    $token = trim((string) ($row['token'] ?? ''));
    if ($token === '') {
        return;
    }
    $list = dbz_load_course_access();
    foreach ($list as $i => $item) {
        if (($item['token'] ?? '') === $token) {
            $list[$i] = array_merge($item, $row, ['updated_at' => date('c')]);
            dbz_save_course_access($list);
            return;
        }
    }
    $row['created_at'] = $row['created_at'] ?? date('c');
    $list[] = $row;
    dbz_save_course_access($list);
}

/** @return array<string,mixed>|null */
function dbz_find_course_access(string $token): ?array
{
    $token = trim($token);
    if ($token === '') {
        return null;
    }
    foreach (dbz_load_course_access() as $row) {
        if (($row['token'] ?? '') === $token) {
            if (!empty($row['revoked'])) {
                return null;
            }
            if (!empty($row['expires_at']) && strtotime((string) $row['expires_at']) < time()) {
                return null;
            }
            return $row;
        }
    }
    return null;
}

function dbz_handle_paid_payment(array $payment, string $source = 'webhook'): void
{
    $meta = $payment['metadata'] ?? [];
    $status = (string) ($payment['status'] ?? '');
    if ($status !== 'succeeded') {
        return;
    }
    $paymentId = (string) ($payment['id'] ?? '');
    $amount = $payment['amount']['value'] ?? '';
    $currency = $payment['amount']['currency'] ?? 'RUB';
    $type = (string) ($meta['type'] ?? 'ready_campaign');
    $title = (string) ($meta['campaign_title'] ?? $payment['description'] ?? 'Заказ');
    $campaignId = (string) ($meta['campaign_id'] ?? '');
    $name = (string) ($meta['name'] ?? '');
    $phone = (string) ($meta['phone'] ?? '');
    $email = (string) ($meta['email'] ?? '');
    $website = (string) ($meta['website'] ?? '');
    $accessToken = (string) ($meta['access_token'] ?? $meta['order_token'] ?? '');
    $planId = (string) ($meta['plan_id'] ?? 'solo');
    $supportDays = (int) ($meta['support_days'] ?? 0);
    $extendToken = (string) ($meta['extend_token'] ?? '');

    // de-dup: если уже логировали succeeded с этим pid — не шлём письмо снова
    $already = false;
    $logPath = dbz_payments_log_path();
    if (is_file($logPath) && $paymentId !== '') {
        $prev = json_decode(file_get_contents($logPath) ?: '[]', true) ?: [];
        foreach ($prev as $item) {
            if (($item['payment_id'] ?? '') === $paymentId && ($item['status'] ?? '') === 'succeeded') {
                $already = true;
                break;
            }
        }
    }

    dbz_log_payment([
        'at' => date('c'),
        'source' => $source,
        'status' => 'succeeded',
        'type' => $type,
        'payment_id' => $paymentId,
        'amount' => $amount,
        'currency' => $currency,
        'campaign_id' => $campaignId,
        'campaign_title' => $title,
        'name' => $name,
        'phone' => $phone,
        'email' => $email,
        'website' => $website,
        'access_token' => $accessToken,
    ]);

    $learnUrl = '';
    if ($type === 'course' || $type === 'course_support_extend') {
        // Продление поддержки: token уже есть (extend_token)
        if ($type === 'course_support_extend' && $extendToken !== '') {
            $prev = dbz_find_course_access($extendToken);
            if ($prev) {
                $days = $supportDays > 0 ? $supportDays : 30;
                $until = dbz_extend_support_until(
                    isset($prev['support_until']) ? (string) $prev['support_until'] : null,
                    $days
                );
                dbz_grant_course_access(array_merge($prev, [
                    'token' => $extendToken,
                    'plan' => 'support',
                    'has_support' => true,
                    'support_until' => $until,
                    'support_extended_at' => date('c'),
                    'last_payment_id' => $paymentId,
                    'status' => 'paid',
                ]));
                $learnUrl = dbz_site_url('learn.php?token=' . rawurlencode($extendToken));
            }
        } elseif ($accessToken !== '') {
            $row = [
                'token' => $accessToken,
                'email' => $email,
                'name' => $name,
                'phone' => $phone,
                'payment_id' => $paymentId,
                'amount' => $amount,
                'product' => 'course',
                'plan' => $planId !== '' ? $planId : 'solo',
                'status' => 'paid',
                'paid_at' => date('c'),
                'source' => $source,
            ];
            if ($supportDays > 0 || $planId === 'support') {
                $days = $supportDays > 0 ? $supportDays : 30;
                $row['has_support'] = true;
                $row['support_until'] = dbz_extend_support_until(null, $days);
            } else {
                $row['has_support'] = false;
                $row['support_until'] = null;
            }
            dbz_grant_course_access($row);
            $learnUrl = dbz_site_url('learn.php?token=' . rawurlencode($accessToken));
        }
    }

    if ($already) {
        return;
    }

    $bodyLines = [
        '💰 Оплата на directbeza.ru',
        'Источник: ' . $source,
        'Тип: ' . $type,
        'Статус: succeeded',
        'ID платежа: ' . $paymentId,
        'Сумма: ' . $amount . ' ' . $currency,
        'Товар: ' . $title . ($campaignId !== '' ? ' (id ' . $campaignId . ')' : ''),
        'Имя: ' . $name,
        'Телефон: ' . $phone,
        'Email клиента: ' . $email,
        $website !== '' ? 'Сайт: ' . $website : '',
    ];
    if ($type === 'course') {
        $bodyLines[] = 'Доступ: ' . ($learnUrl !== '' ? $learnUrl : '(токен не создан)');
        $bodyLines[] = '';
        $bodyLines[] = 'Клиент может открыть курс по ссылке. Пришлите ссылку на email, если нужно дублировать.';
    } else {
        $bodyLines[] = '';
        $bodyLines[] = 'Передайте файлы клиенту на email / в Telegram.';
    }

    dbz_notify_emails('[ДиректБезАгенств] Оплата: ' . $title, implode("\n", array_filter($bodyLines)));
}
