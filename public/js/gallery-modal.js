/* global TrelloPowerUp */

const t = TrelloPowerUp.iframe();

let images = [];
let currentIndex = 0;
let isGridView = false;
let zoomLevel = 1;
let slideshowInterval = null;

// DOM Elements
const mainImage = document.getElementById('main-image');
const emptyState = document.getElementById('empty-state');
const galleryCounter = document.getElementById('gallery-counter');
const galleryCardName = document.getElementById('gallery-card-name');
const thumbnailStrip = document.getElementById('thumbnail-strip');
const lightboxView = document.getElementById('lightbox-view');
const gridView = document.getElementById('grid-view');

const btnPrev = document.getElementById('nav-prev');
const btnNext = document.getElementById('nav-next');
const btnToggleGrid = document.getElementById('btn-toggle-grid');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnSlideshow = document.getElementById('btn-slideshow');
const btnDownload = document.getElementById('btn-download');
const btnClose = document.getElementById('btn-close');

// Initialize
t.render(function () {
  return t.card('name', 'attachments')
    .then(function (card) {
      if (card.name) {
        galleryCardName.textContent = card.name;
      }
      images = window.GalleryAPI.getImageAttachmentsFromCard(card);
      initGallery();
    });
});

function initGallery() {
  if (images.length === 0) {
    emptyState.style.display = 'flex';
    mainImage.style.display = 'none';
    btnPrev.style.display = 'none';
    btnNext.style.display = 'none';
    thumbnailStrip.style.display = 'none';
    galleryCounter.textContent = '0 / 0';
    return;
  }

  emptyState.style.display = 'none';
  mainImage.style.display = 'block';
  btnPrev.style.display = images.length > 1 ? 'flex' : 'none';
  btnNext.style.display = images.length > 1 ? 'flex' : 'none';

  renderThumbnails();
  renderGridView();
  showImage(0);
}

function showImage(index) {
  if (index < 0) index = images.length - 1;
  if (index >= images.length) index = 0;

  currentIndex = index;
  const item = images[currentIndex];
  
  // Pick best preview or full url
  const imgUrl = item.url;
  mainImage.src = imgUrl;
  galleryCounter.textContent = `${currentIndex + 1} / ${images.length}`;

  // Reset zoom
  zoomLevel = 1;
  applyZoom();

  // Update active thumbnail
  const thumbs = thumbnailStrip.querySelectorAll('.thumb-item');
  thumbs.forEach((th, i) => {
    th.classList.toggle('active', i === currentIndex);
  });
}

function renderThumbnails() {
  thumbnailStrip.innerHTML = '';
  images.forEach((img, idx) => {
    const thumbDiv = document.createElement('div');
    thumbDiv.className = `thumb-item ${idx === currentIndex ? 'active' : ''}`;
    thumbDiv.innerHTML = `<img src="${img.url}" alt="${img.name}" loading="lazy" />`;
    thumbDiv.addEventListener('click', () => showImage(idx));
    thumbnailStrip.appendChild(thumbDiv);
  });
}

function renderGridView() {
  gridView.innerHTML = '';
  images.forEach((img, idx) => {
    const card = document.createElement('div');
    card.className = 'grid-card';
    card.innerHTML = `
      <img src="${img.url}" alt="${img.name}" loading="lazy" />
      <div class="grid-card-overlay">
        <span>${img.name}</span>
      </div>
    `;
    card.addEventListener('click', () => {
      toggleView(false);
      showImage(idx);
    });
    gridView.appendChild(card);
  });
}

function toggleView(forceGrid = null) {
  isGridView = forceGrid !== null ? forceGrid : !isGridView;
  if (isGridView) {
    lightboxView.style.display = 'none';
    thumbnailStrip.style.display = 'none';
    gridView.classList.add('active');
    btnToggleGrid.classList.add('active');
    stopSlideshow();
  } else {
    lightboxView.style.display = 'flex';
    thumbnailStrip.style.display = 'flex';
    gridView.classList.remove('active');
    btnToggleGrid.classList.remove('active');
  }
}

function applyZoom() {
  mainImage.style.transform = `scale(${zoomLevel})`;
}

function startSlideshow() {
  btnSlideshow.textContent = '⏸';
  btnSlideshow.classList.add('active');
  slideshowInterval = setInterval(() => {
    showImage(currentIndex + 1);
  }, 3500);
}

function stopSlideshow() {
  if (slideshowInterval) {
    clearInterval(slideshowInterval);
    slideshowInterval = null;
    btnSlideshow.textContent = '▶';
    btnSlideshow.classList.remove('active');
  }
}

// Event Listeners
btnPrev.addEventListener('click', () => showImage(currentIndex - 1));
btnNext.addEventListener('click', () => showImage(currentIndex + 1));
btnToggleGrid.addEventListener('click', () => toggleView());

btnZoomIn.addEventListener('click', () => {
  if (zoomLevel < 3) {
    zoomLevel += 0.25;
    applyZoom();
  }
});

btnZoomOut.addEventListener('click', () => {
  if (zoomLevel > 0.5) {
    zoomLevel -= 0.25;
    applyZoom();
  }
});

btnSlideshow.addEventListener('click', () => {
  if (slideshowInterval) {
    stopSlideshow();
  } else {
    startSlideshow();
  }
});

btnDownload.addEventListener('click', async () => {
  if (images[currentIndex]) {
    const item = images[currentIndex];
    const prevText = btnDownload.textContent;
    btnDownload.disabled = true;
    btnDownload.textContent = '⏳';
    btnDownload.title = 'Downloading...';
    try {
      if (window.GalleryAPI && window.GalleryAPI.downloadImage) {
        await window.GalleryAPI.downloadImage(item.url, item.name || 'trello-image');
      } else {
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = item.url;
        link.download = item.name || 'trello-image';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      btnDownload.disabled = false;
      btnDownload.textContent = prevText;
      btnDownload.title = 'Download Image';
    }
  }
});

btnClose.addEventListener('click', () => {
  t.closeModal();
});

// Keyboard navigation
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') {
    showImage(currentIndex - 1);
  } else if (e.key === 'ArrowRight') {
    showImage(currentIndex + 1);
  } else if (e.key === 'Escape') {
    t.closeModal();
  } else if (e.key === ' ') {
    e.preventDefault();
    if (slideshowInterval) stopSlideshow();
    else startSlideshow();
  }
});
