/* global TrelloPowerUp */

const t = TrelloPowerUp.iframe();

const thumbnailsGrid = document.getElementById('thumbnails-grid');
const emptyState = document.getElementById('empty-state');
const btnViewAll = document.getElementById('btn-view-all');

const MAX_PREVIEW_COUNT = 6;

t.render(function () {
  return t.card('attachments')
    .then(function (card) {
      const images = window.GalleryAPI.getImageAttachmentsFromCard(card);
      renderCardSection(images);
    })
    .then(function () {
      return t.sizeTo('#thumbnails-grid');
    });
});

function openGalleryModal() {
  return t.modal({
    title: 'Image Gallery',
    url: './gallery-modal.html',
    accentColor: '#1d2125',
    fullscreen: true
  });
}

function renderCardSection(images) {
  if (!images || images.length === 0) {
    emptyState.style.display = 'block';
    thumbnailsGrid.style.display = 'none';
    btnViewAll.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  thumbnailsGrid.style.display = 'grid';
  btnViewAll.style.display = 'inline-block';
  thumbnailsGrid.innerHTML = '';

  const displayImages = images.slice(0, MAX_PREVIEW_COUNT);
  const remainingCount = images.length - MAX_PREVIEW_COUNT;

  displayImages.forEach((img, idx) => {
    const item = document.createElement('div');
    item.className = 'card-thumb-item';
    
    if (idx === MAX_PREVIEW_COUNT - 1 && remainingCount > 0) {
      item.innerHTML = `
        <img src="${img.url}" alt="${img.name}" />
        <div class="card-thumb-count-overlay">+${remainingCount}</div>
      `;
    } else {
      item.innerHTML = `<img src="${img.url}" alt="${img.name}" />`;
    }

    item.addEventListener('click', openGalleryModal);
    thumbnailsGrid.appendChild(item);
  });
}

btnViewAll.addEventListener('click', openGalleryModal);
