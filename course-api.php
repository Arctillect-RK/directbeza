<?php

/**
 * API кабинета курса.
 * Контент только при валидной cookie/session (или token при первом заходе).
 *
 * GET ?action=outline
 * GET ?action=lesson&id=m01-l01
 * GET ?action=me
 * POST ?action=logout
 */

require __DIR__ . '/includes/helpers.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

$action = trim((string) ($_GET['action'] ?? $_POST['action'] ?? 'outline'));

// logout — не требует paid
if ($action === 'logout') {
    dbz_clear_course_session();
    echo json_encode(['ok' => true]);
    exit;
}

$auth = dbz_resolve_course_access();
if (!$auth['ok']) {
    $map = [
        'no_token' => 'Войдите по ссылке из письма после оплаты',
        'invalid' => 'Доступ недействителен',
        'unpaid' => 'Оплата ещё не подтверждена',
    ];
    http_response_code(401);
    echo json_encode([
        'ok' => false,
        'error' => $map[$auth['error']] ?? 'Нет доступа',
        'code' => $auth['error'],
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$access = $auth['access'] ?? [];

function dbz_api_me_payload(array $access): array
{
    $until = (string) ($access['support_until'] ?? '');
    $has = !empty($access['has_support']) || $until !== '';
    $active = false;
    if ($until !== '') {
        $t = strtotime($until);
        $active = $t !== false && $t >= time();
    }
    $extend = dbz_course_plan('support_extend');
    return [
        'name' => (string) ($access['name'] ?? ''),
        'email' => (string) ($access['email'] ?? ''),
        'phone' => (string) ($access['phone'] ?? ''),
        'paid_at' => (string) ($access['paid_at'] ?? ''),
        'plan' => (string) ($access['plan'] ?? 'solo'),
        'has_support' => $has,
        'support_active' => $active,
        'support_until' => $until,
        'token' => (string) ($access['token'] ?? ''),
        'support_extend' => $extend ? [
            'price' => $extend['price'],
            'title' => $extend['title'],
            'support_days' => $extend['support_days'],
            'short' => $extend['short'] ?? '',
        ] : null,
    ];
}

if ($action === 'me') {
    echo json_encode([
        'ok' => true,
        'me' => dbz_api_me_payload($access),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'outline') {
    $outline = dbz_course_outline();
    if (!$outline) {
        http_response_code(503);
        echo json_encode(['ok' => false, 'error' => 'Курс недоступен'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    echo json_encode([
        'ok' => true,
        'outline' => $outline,
        'me' => dbz_api_me_payload($access),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'lesson') {
    $id = trim((string) ($_GET['id'] ?? ''));
    if ($id === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Не указан урок'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $lesson = dbz_course_lesson($id);
    if (!$lesson) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Урок не найден'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    // Лёгкая «обфускация»: не отдаём сырой JSON удобным для парсера полем text dump
    echo json_encode([
        'ok' => true,
        'lesson' => $lesson,
        'wm' => (string) ($access['email'] ?? $access['name'] ?? 'student'),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(['ok' => false, 'error' => 'Неизвестный action'], JSON_UNESCAPED_UNICODE);
