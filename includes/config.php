<?php

/**
 * Общие настройки ДиректБезАгенств.
 */
return [
    // Публичный URL (без слэша в конце). Пусто = авто из запроса.
    'site_url' => 'https://directbeza.ru',

    // Уведомления о заявках/оплатах
    'notify_emails' => [
        'zakaz@directbeza.ru',
        'info@directbeza.ru',
    ],

    // From для mail()
    'mail_from' => 'noreply@directbeza.ru',
    'mail_from_name' => 'ДиректБезАгенств',

    /**
     * Общий магазин ЮKassa с magnit/bristol.
     * HTTP-уведомления в кабинете ЮKassa → https://www.magnit-test.ru/webhook.php
     * (не на directbeza.ru). Локальный webhook.php на directbeza — запасной.
     */
    'yookassa_webhook_note' => 'https://www.magnit-test.ru/webhook.php',

    /**
     * Секрет для выдачи тестового доступа к курсу (grant-access.php).
     * Смените на свой длинный пароль. Пустая строка = страница grant отключена.
     */
    'course_grant_secret' => 'YOUR_API_SECRET',
];

