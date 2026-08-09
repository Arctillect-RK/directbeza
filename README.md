# ДиректБезАгенств — сайт

Лендинг + каталог готовых РК + заявки + **онлайн-оплата (ЮKassa)**.

```
directbeza.ru/     ← на хост с PHP (Apache / Nginx+php-fpm)
```

## Что залить на хост

```
index.html
catalog.html
campaign.html
rules.html
success.php
buy.php
webhook.php
admin.html          (можно не публиковать)
css/
js/
img/
includes/           ← config.php, yookassa-config.php, helpers.php
data/campaigns.json
data/payments.json  ← должен быть доступен на запись для PHP
favicon.*
```

**Не обязательно:** `server.js`, `package.json`, `node_modules` (это локальный Node-режим).

## Почты (заявки + уведомления)

В `js/config.js` и `includes/config.php`:

- `zakaz@directbeza.ru` — заказы
- `info@directbeza.ru` — общая / копия

Заявки уходят через **FormSubmit** на обе почты (`LEADS_EMAIL` + `_cc`).  
Первая заявка — подтвердите FormSubmit письмом на `zakaz@…`.

Оплаты: `mail()` на хостинге и/или FormSubmit-fallback; лог в `data/payments.json`.

## ЮKassa (1 общий магазин)

Ключи те же, что у magnit/bristol (`includes/yookassa-config.php`).

В платеже всегда указан источник:
- **description:** `[directbeza.ru] Готовая РК: …`
- **metadata.product** = `directbeza`
- **metadata.site** = `directbeza.ru`

**HTTP-уведомления в кабинете ЮKassa** (один URL на весь магазин):

```
https://www.magnit-test.ru/webhook.php
```

Там webhook смотрит `metadata.product` / `site`:
- `directbeza` → письмо на zakaz@ + info@directbeza.ru (+ TG админам)
- иначе → magnit / bristol (токены)

Return URL после оплаты: `https://directbeza.ru/success.php` (файлы сайта).

Кнопка **«Оплатить картой»** на странице кампании (`campaign.html?id=…`).

## Контакты на сайте

Блок `#contacts` / footer: обе почты + Telegram (`TELEGRAM_USER` в config).

## Локальный просмотр

Статика:

```bash
npx --yes serve -l 3080
```

С Node API (без ЮKassa-PHP):

```bash
npm start
```

Оплата через `buy.php` нужна **на хостинге с PHP** (или настройте PHP локально).

## Права на запись

Папка `data/` — запись для веб-сервера (лог платежей):

```bash
chmod 775 data
chmod 664 data/payments.json
```
