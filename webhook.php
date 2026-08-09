<?php

require __DIR__ . '/includes/helpers.php';

$source = file_get_contents('php://input');
$data = json_decode($source ?: '', true);

if (is_array($data) && ($data['event'] ?? '') === 'payment.succeeded') {
    $payment = $data['object'] ?? [];
    $meta = $payment['metadata'] ?? [];
    $product = (string) ($meta['product'] ?? '');
    $type = (string) ($meta['type'] ?? '');

    // Обрабатываем только платежи directbeza (не чужие магазины/типы)
    if (
        $product === 'directbeza'
        || $type === 'ready_campaign'
        || $type === 'course'
        || $type === 'course_support_extend'
        || $type === 'directbeza'
    ) {
        dbz_handle_paid_payment(is_array($payment) ? $payment : [], 'webhook');
    }
}

http_response_code(200);
header('Content-Type: text/plain; charset=utf-8');
echo 'OK';
