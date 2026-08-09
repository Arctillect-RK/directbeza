# DirectBeza (ДиректБезАгенств)

Платформа продажи **готовых рекламных кампаний Яндекс.Директ** + курс/комбайн: каталог, заявка, **оплата**, выдача доступа.

**Live:** https://directbeza.ru/ · **ещё в проде**

---

## Зачем проект

Клиент выбирает готовую РК по нише (или оставляет заявку на сбор) → оплачивает → получает файлы/доступ.  
Без «агентства на каждый чих»: самообслуживание + автоматизация выдачи.

---

## Стек и что за что отвечает

| Часть | Технологии | Зачем |
|--------|------------|--------|
| **Лендинг / каталог** | HTML5, CSS, JavaScript | Витрина: главная, каталог РК, карточка кампании, курс, SEO-комбайн, правила, FAQ |
| **SEO** | `robots.txt`, `sitemap.xml`, Яндекс/Google verification, Метрика | Индексация и аналитика |
| **Бэкенд (локальный API)** | **Node.js + Express** (`server.js`) | Локальный режим: каталог, сиды, API без PHP |
| **Оплата** | **PHP** + **ЮKassa** (`buy.php`, `webhook.php`, `success.php`) | Создание платежа, webhook, return URL, выдача доступа |
| **Конфиг** | PHP `includes/config.php`, `yookassa-config.php` (в публичном репо — placeholders) | Почты, TG, ключи магазина |
| **Доступ после оплаты** | PHP `grant-access.php`, `learn.php`, токены | Разовая/ограниченная выдача материалов |
| **Админка** | `admin.html` | Управление (локально/на хосте) |
| **Данные** | JSON (`data/`), seed-скрипты | Каталог кампаний, лог платежей |

### Поток

```
Каталог / заявка → buy.php (ЮKassa) → webhook → grant access → Telegram/email уведомление
```

---

## Структура (кратко)

```
directbeza/
  index.html, catalog.html, campaign.html   # витрина
  buy.php, webhook.php, success.php         # оплата
  includes/                                 # конфиг, helpers, ЮKassa
  js/, css/, img/                           # фронт
  server.js, package.json                   # Node-режим для локалки
```

---

## Author

**Ruslan Kovalchuk** · [@Arctillect-RK](https://github.com/Arctillect-RK) · [Telegram](https://t.me/Arctillect)

Секреты (ЮKassa secret, токены) в репо **не** лежат — только placeholders / `.env.example`.
