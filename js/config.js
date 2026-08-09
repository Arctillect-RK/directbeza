/**
 * Настройки сайта (статика на хостинге).
 *
 * Заявки: LEADS_EMAIL (+ LEADS_EMAIL_CC) через FormSubmit.
 * Оплата готовых РК: PHP buy.php + ЮKassa (includes/yookassa-config.php).
 */
window.SITE_CONFIG = {
  // Основные почты для заявок и уведомлений об оплате
  LEADS_EMAIL: 'zakaz@directbeza.ru',
  LEADS_EMAIL_CC: 'info@directbeza.ru',

  // Telegram (без @) — кнопки связи + запасной канал заявок
  TELEGRAM_USER: 'MagnitOtvetTovarovedBot',

  // Путь к каталогу (JSON на хосте)
  CATALOG_URL: 'data/campaigns.json',

  // Курс (редактируемый контент)
  COURSE_URL: 'data/course.json',
  COURSE_PRICE: 3500,
  COURSE_PRICE_SUPPORT: 5900,
  COURSE_SUPPORT_EXTEND_PRICE: 2500,

  // Публичный URL сайта (для return_url ЮKassa; на проде можно оставить auto)
  SITE_URL: 'https://directbeza.ru',

  // Онлайн-оплата РК и курса (buy.php + ЮKassa)
  PAYMENT_ENABLED: true,
  PAYMENT_ENDPOINT: 'buy.php',
};
