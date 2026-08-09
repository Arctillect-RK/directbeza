/**
 * Демо-кампании для каталога (можно удалить из админки).
 * Запуск: node seed.js
 */
const { listCampaigns, createCampaign } = require('./db');

const samples = [
  {
    title: 'Душевые перегородки — Москва',
    sphere: 'Душевые перегородки / стеклянные конструкции',
    description:
      'Готовая структура ЕПК: семантика, минуса, текстово-графические + комбинаторные объявления. Регион: Москва и область.',
    price: 9900,
    preview_url: '',
  },
  {
    title: 'Пластиковые окна — СПб',
    sphere: 'Окна ПВХ',
    description: '3 мастер-кампании: бренд, generic, ретаргет. Минус-площадки и быстрые ссылки.',
    price: 8900,
    preview_url: '',
  },
  {
    title: 'Ремонт квартир под ключ',
    sphere: 'Ремонт / отделка',
    description: 'Семантика + объявления под «под ключ», «дизайн», «новостройка». Без брендов конкурентов.',
    price: 11900,
    preview_url: '',
  },
  {
    title: 'Стоматология: имплантация',
    sphere: 'Медицина / стоматология',
    description: 'Горячие ключи, возрастные ограничения, аккуратные заголовки под модерацию.',
    price: 14900,
    preview_url: '',
  },
  {
    title: 'Юрист: банкротство физлиц',
    sphere: 'Юридические услуги',
    description: 'Узкая семантика, минуса «бесплатно/консультация/вакансия», регионы РФ.',
    price: 10900,
    preview_url: '',
  },
];

const existing = listCampaigns({ activeOnly: false });
if (existing.length) {
  console.log(`В БД уже ${existing.length} кампаний — seed пропущен.`);
  process.exit(0);
}

for (const s of samples) {
  const item = createCampaign({ ...s, is_active: 1 });
  console.log('+', item.id, item.sphere);
}
console.log('Готово. Откройте /catalog');
