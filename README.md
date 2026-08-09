# DirectBeza (ДиректБезАгенств)

| | |
|--|--|
| 🌐 Live | https://directbeza.ru/ |
| Status | **In production / в проде** |

---

## 🇷🇺 Русский

### О проекте
Платформа **готовых рекламных кампаний Яндекс.Директ**: каталог по нишам, заявка на сбор, **онлайн-оплата**, автоматическая **выдача доступа** к материалам. Плюс лендинги курса и SEO-комбайна.

### Что сделано
- Каталог готовых РК (60+ бизнес-ниш)
- Страницы кампании, курса, правил, FAQ
- Оплата через **ЮKassa** + webhook
- Выдача доступа / токены после оплаты
- Уведомления (email / Telegram)
- SEO: sitemap, robots, Метрика

### Стек: что за что

| Часть | Технологии | Для чего |
|--------|------------|----------|
| Витрина | HTML5, CSS, JavaScript | Главная, каталог, карточка РК, курс, FAQ |
| SEO | robots.txt, sitemap.xml, Метрика | Поиск и аналитика |
| Локальный API | **Node.js + Express** (`server.js`) | Локальный просмотр, seed, API без PHP |
| Оплата | **PHP** + **ЮKassa** (`buy.php`, `webhook.php`, `success.php`) | Платёж, webhook, return URL |
| Доступ | PHP (`grant-access.php`, `learn.php`) | Выдача материалов после оплаты |
| Конфиг | PHP `includes/` (placeholders в public) | Почты, TG, ключи магазина |
| Данные | JSON + seed-скрипты | Каталог кампаний, лог платежей |

### Поток
```
Каталог / заявка → buy.php (ЮKassa) → webhook → доступ → уведомление
```

### Важно
Секреты ЮKassa и токены в репо **не** лежат — только placeholders.

---

## 🇬🇧 English

### About
A self-serve platform for **ready-made Yandex Direct campaign packages**: niche catalog, custom-build requests, **online payment**, and automated **access delivery**. Also includes course / SEO-tool landing pages.

### What was built
- Catalog of ready campaigns (60+ niches)
- Campaign pages, course, rules, FAQ
- **YooKassa** checkout + webhooks
- Post-payment access / tokens
- Email / Telegram notifications
- SEO: sitemap, robots, analytics

### Stack: what each layer is for

| Layer | Tech | Purpose |
|--------|------|---------|
| Storefront | HTML5, CSS, JavaScript | Home, catalog, campaign page, course, FAQ |
| SEO | robots.txt, sitemap.xml, Metrika | Discovery & analytics |
| Local API | **Node.js + Express** | Local mode without PHP |
| Payments | **PHP** + **YooKassa** | Create payment, webhook, return URL |
| Access | PHP grant/learn endpoints | Deliver files after payment |
| Config | PHP `includes/` (placeholders) | Mail, Telegram, shop keys |
| Data | JSON + seed scripts | Campaign catalog, payment log |

### Flow
```
Catalog / lead → YooKassa → webhook → access grant → notify
```

### Notes
Production payment secrets are **not** in this public mirror.

---

**Author:** [Ruslan Kovalchuk](https://github.com/Arctillect-RK) · [Telegram](https://t.me/Arctillect)
