<?php

require __DIR__ . '/includes/helpers.php';

/**
 * Создание платежа ЮKassa.
 * product_type: ready_campaign | course
 * Для РК: campaign_id, name, phone, email, website?
 * Для курса: product_type=course, name, phone, email
 */
function dbz_input(string $key, string $default = ''): string
{
    if (isset($_POST[$key])) {
        return trim((string) $_POST[$key]);
    }
    if (isset($_GET[$key])) {
        return trim((string) $_GET[$key]);
    }
    return $default;
}

$raw = file_get_contents('php://input');
$json = null;
$rawTrim = ltrim((string) $raw);
if ($rawTrim !== '' && isset($rawTrim[0]) && $rawTrim[0] === '{') {
    $json = json_decode($raw, true);
    if (is_array($json)) {
        foreach (['campaign_id', 'name', 'phone', 'email', 'website', 'product_type', 'product', 'plan_id', 'access_token', 'extend_token'] as $k) {
            if (!isset($_POST[$k]) && isset($json[$k])) {
                $_POST[$k] = $json[$k];
            }
        }
    }
}

$productType = dbz_input('product_type');
if ($productType === '') {
    $productType = dbz_input('product');
}
if ($productType === '') {
    $productType = dbz_input('campaign_id') !== '' ? 'ready_campaign' : 'course';
}
// aliases
if (in_array($productType, ['course', 'kurs'], true)) {
    $productType = 'course';
} elseif (in_array($productType, ['course_support_extend', 'support_extend'], true)) {
    $productType = 'course_support_extend';
} elseif ($productType !== 'course') {
    $productType = 'ready_campaign';
}

$name = dbz_input('name');
$phone = dbz_input('phone');
$email = dbz_input('email');
$website = dbz_input('website');
$campaignId = dbz_input('campaign_id');
$planId = dbz_input('plan_id');
if ($planId === '') {
    $planId = 'solo';
}
$extendToken = dbz_input('extend_token');
if ($extendToken === '') {
    $extendToken = dbz_input('access_token');
}

$wantsJson = (
    (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)
    || (isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false)
    || isset($_GET['json'])
    || is_array($json)
);

function dbz_fail(string $msg, int $code = 400, bool $asJson = false): void
{
    http_response_code($code);
    if ($asJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
        exit;
    }
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>Ошибка оплаты</title>';
    echo '<link rel="stylesheet" href="css/style.css"></head><body style="padding:40px;font-family:Inter,sans-serif">';
    echo '<h1>Не удалось создать платёж</h1><p>' . htmlspecialchars($msg, ENT_QUOTES, 'UTF-8') . '</p>';
    echo '<p><a href="course.html">← К курсу</a> · <a href="catalog.html">Каталог</a></p></body></html>';
    exit;
}

if ($name === '' || $phone === '' || $email === '') {
    dbz_fail('Укажите имя, телефон и email', 400, $wantsJson);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    dbz_fail('Некорректный email', 400, $wantsJson);
}

$orderToken = bin2hex(random_bytes(8));
$accessToken = bin2hex(random_bytes(16));
$metaExtra = [];

if ($productType === 'course_support_extend') {
    if ($extendToken === '') {
        dbz_fail('Нет ключа доступа для продления поддержки', 400, $wantsJson);
    }
    $access = dbz_find_course_access($extendToken);
    if (!$access) {
        dbz_fail('Доступ к курсу не найден. Войдите в кабинет и попробуйте снова.', 404, $wantsJson);
    }
    $plan = dbz_course_plan('support_extend');
    if (!$plan || $plan['price'] < 1) {
        dbz_fail('Продление поддержки временно недоступно', 400, $wantsJson);
    }
    $price = (float) $plan['price'];
    $title = (string) $plan['title'];
    $description = dbz_str_cut('[directbeza.ru] ' . $title, 128);
    $metaType = 'course_support_extend';
    $campaignId = 'course_support_extend';
    if ($email === '' && !empty($access['email'])) {
        $email = (string) $access['email'];
    }
    if ($name === '' && !empty($access['name'])) {
        $name = (string) $access['name'];
    }
    if ($phone === '' && !empty($access['phone'])) {
        $phone = (string) $access['phone'];
    }
    if ($name === '' || $phone === '' || $email === '') {
        dbz_fail('Укажите имя, телефон и email для продления', 400, $wantsJson);
    }
    $metaExtra = [
        'extend_token' => $extendToken,
        'plan_id' => 'support_extend',
        'support_days' => (string) (int) ($plan['support_days'] ?? 30),
    ];
    $accessToken = '';
} elseif ($productType === 'course') {
    $course = dbz_load_course();
    if (!$course || empty($course['active'])) {
        dbz_fail('Курс временно недоступен', 404, $wantsJson);
    }
    if (!in_array($planId, ['solo', 'support'], true)) {
        $planId = 'solo';
    }
    $plan = dbz_course_plan($planId);
    if (!$plan || $plan['price'] < 1) {
        dbz_fail('Тариф курса не найден', 400, $wantsJson);
    }
    $price = (float) $plan['price'];
    $courseTitle = (string) ($course['title'] ?? 'Курс ДиректБезАгентств');
    $title = $courseTitle . ' — ' . $plan['title'];
    $description = dbz_str_cut('[directbeza.ru] Курс: ' . $plan['title'], 128);
    $metaType = 'course';
    $campaignId = 'course_' . $planId;
    $metaExtra = [
        'access_token' => $accessToken,
        'plan_id' => $planId,
        'support_days' => (string) (int) ($plan['support_days'] ?? 0),
    ];
} else {
    if ($campaignId === '') {
        dbz_fail('Укажите кампанию', 400, $wantsJson);
    }
    $campaign = dbz_find_campaign($campaignId);
    if (!$campaign) {
        dbz_fail('Кампания не найдена или скрыта', 404, $wantsJson);
    }
    $price = (float) ($campaign['price'] ?? 0);
    if ($price < 1) {
        dbz_fail('У кампании не задана цена', 400, $wantsJson);
    }
    $title = (string) ($campaign['title'] ?? 'Готовая РК');
    $description = dbz_str_cut('[directbeza.ru] Готовая РК: ' . $title, 128);
    $metaType = 'ready_campaign';
    $metaExtra = [];
    $accessToken = '';
}

$priceStr = number_format($price, 2, '.', '');

$payload = [
    'amount' => [
        'value' => $priceStr,
        'currency' => 'RUB',
    ],
    'confirmation' => [
        'type' => 'redirect',
        'return_url' => dbz_site_url('success.php?token=' . rawurlencode($orderToken)),
    ],
    'capture' => true,
    'description' => $description,
    'metadata' => array_merge([
        'product' => 'directbeza',
        'site' => 'directbeza.ru',
        'source' => 'directbeza.ru',
        'type' => $metaType,
        'campaign_id' => (string) $campaignId,
        'campaign_title' => dbz_str_cut($title, 200),
        'name' => dbz_str_cut($name, 120),
        'phone' => dbz_str_cut($phone, 40),
        'email' => dbz_str_cut($email, 120),
        'website' => dbz_str_cut($website, 200),
        'order_token' => $orderToken,
    ], $metaExtra),
];

$result = dbz_yoo_request('POST', '/payments', $payload, uniqid('dbz_', true));

if (!empty($result['_error']) || empty($result['id'])) {
    $msg = $result['description'] ?? $result['_error'] ?? 'Ошибка ЮKassa';
    dbz_fail($msg . (isset($result['code']) ? ' (' . $result['code'] . ')' : ''), 502, $wantsJson);
}

$paymentId = (string) $result['id'];
$confirmUrl = $result['confirmation']['confirmation_url'] ?? '';

$isCoursePay = ($productType === 'course' || $productType === 'course_support_extend');
$returnUrl = dbz_site_url(
    'success.php?token=' . rawurlencode($orderToken)
    . '&pid=' . rawurlencode($paymentId)
    . ($isCoursePay ? '&product=course' : '')
);

dbz_yoo_request('PATCH', '/payments/' . rawurlencode($paymentId), [
    'confirmation' => [
        'type' => 'redirect',
        'return_url' => $returnUrl,
    ],
], uniqid('dbz_ret_', true));

// Предварительно зарезервируем токен курса (активируется после succeeded)
if ($productType === 'course' && $accessToken !== '') {
    dbz_grant_course_access([
        'token' => $accessToken,
        'email' => $email,
        'name' => $name,
        'phone' => $phone,
        'payment_id' => $paymentId,
        'amount' => $priceStr,
        'product' => 'course',
        'plan' => $planId,
        'status' => 'pending',
        'source' => 'buy',
    ]);
}

dbz_log_payment([
    'at' => date('c'),
    'source' => 'buy',
    'status' => $result['status'] ?? 'pending',
    'type' => $metaType,
    'payment_id' => $paymentId,
    'amount' => $priceStr,
    'currency' => 'RUB',
    'campaign_id' => (string) $campaignId,
    'campaign_title' => $title,
    'name' => $name,
    'phone' => $phone,
    'email' => $email,
    'website' => $website,
    'order_token' => $orderToken,
    'access_token' => $accessToken,
]);

dbz_notify_emails(
    '[ДиректБезАгенств] Создан платёж: ' . $title,
    implode("\n", array_filter([
        'Создан платёж (ожидает оплаты)',
        'Тип: ' . $metaType,
        'ID: ' . $paymentId,
        'Сумма: ' . $priceStr . ' RUB',
        'Товар: ' . $title,
        'Имя: ' . $name,
        'Телефон: ' . $phone,
        'Email: ' . $email,
        $website !== '' ? 'Сайт: ' . $website : '',
        $accessToken !== '' ? 'Access token: ' . $accessToken : '',
    ]))
);

if ($wantsJson) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'ok' => true,
        'payment_id' => $paymentId,
        'confirmation_url' => $confirmUrl ?: null,
        'product_type' => $metaType,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($confirmUrl === '') {
    dbz_fail('ЮKassa не вернула ссылку на оплату', 502, false);
}

header('Location: ' . $confirmUrl);
exit;
