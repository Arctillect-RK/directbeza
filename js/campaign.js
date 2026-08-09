function getId() {
  return new URLSearchParams(location.search).get('id') || '';
}

async function loadCampaign() {
  const id = getId();
  const err = document.getElementById('campaignError');
  const card = document.getElementById('campaignCard');
  const loading = document.getElementById('campaignLoading');

  if (!id) {
    loading.classList.add('hidden');
    err.textContent = 'Не указана кампания. Вернитесь в каталог.';
    err.classList.remove('hidden');
    return;
  }

  try {
    const data = await CatalogData.getCampaignById(id);
    if (!data) throw new Error('Кампания не найдена или скрыта');

    document.title = data.title + ' | ДиректБезАгенств';
    document.getElementById('crumbTitle').textContent = data.title;
    document.getElementById('cSphere').textContent = data.sphere || '';
    document.getElementById('cTitle').textContent = data.title || '';
    document.getElementById('cDesc').textContent =
      data.description || 'Готовая структура кампаний для загрузки в Директ.';
    document.getElementById('cPrice').textContent = CatalogData.money(data.price);
    document.getElementById('cDate').textContent =
      'В каталоге с ' + CatalogData.formatDate(data.created_at);
    const img = document.getElementById('cImg');
    img.src = CatalogData.previewUrl(data);
    img.alt = data.title || '';

    document.getElementById('cOrderBtn').onclick = () => {
      openLeadModal({
        type: 'ready_campaign',
        campaignId: data.id,
        campaignTitle: data.title,
      });
    };

    const payBtn = document.getElementById('cPayBtn');
    if (payBtn) {
      const payEnabled = (window.SITE_CONFIG || {}).PAYMENT_ENABLED !== false;
      if (payEnabled && Number(data.price) > 0) {
        payBtn.classList.remove('hidden');
        payBtn.onclick = () => {
          openPayModal({
            campaignId: data.id,
            campaignTitle: data.title,
            price: data.price,
          });
        };
      } else {
        payBtn.classList.add('hidden');
      }
    }

    loading.classList.add('hidden');
    card.classList.remove('hidden');
  } catch (e) {
    loading.classList.add('hidden');
    err.textContent = e.message;
    err.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', loadCampaign);
