/* global TrelloPowerUp */

const t = TrelloPowerUp.iframe();

// State
let allItems = [];
let filteredItems = [];
let currentSettings = {
  colWidth: 280,
  gapH: 16,
  gapV: 16,
  visibilityMode: 'always', // 'always' | 'hover'
  titleSource: 'attachment' // 'attachment' | 'card' | 'both'
};

// DOM References
const boardNameSpan = document.getElementById('gv-board-name');
const cardsGrid = document.getElementById('gv-cards-grid');
const emptyState = document.getElementById('gv-empty-state');
const filterList = document.getElementById('gv-filter-list');
const filterLabel = document.getElementById('gv-filter-label');
const searchInput = document.getElementById('gv-search-input');
const showingCountSpan = document.getElementById('gv-showing-count');

// Stats strip elements
const statCount = document.getElementById('gv-stat-count');
const statCol = document.getElementById('gv-stat-col');
const statGapH = document.getElementById('gv-stat-gap-h');
const statGapV = document.getElementById('gv-stat-gap-v');
const statTitleSrc = document.getElementById('gv-stat-title-src');
const statVisibilityMode = document.getElementById('gv-stat-visibility-mode');

// Settings Drawer Elements
const settingsDrawer = document.getElementById('gv-settings-drawer');
const btnAdjustSettings = document.getElementById('btn-adjust-settings');
const btnOpenSettings = document.getElementById('btn-open-settings');
const btnCloseDrawer = document.getElementById('btn-close-drawer');
const btnDrawerDone = document.getElementById('btn-drawer-done');
const btnDrawerReset = document.getElementById('btn-drawer-reset');

const sliderColWidth = document.getElementById('drawer-slider-col-width');
const valColWidth = document.getElementById('drawer-val-col-width');
const sliderGapH = document.getElementById('drawer-slider-gap-h');
const valGapH = document.getElementById('drawer-val-gap-h');
const sliderGapV = document.getElementById('drawer-slider-gap-v');
const valGapV = document.getElementById('drawer-val-gap-v');

const btnGapFlush = document.getElementById('btn-gap-flush');
const btnGapDefault = document.getElementById('btn-gap-default');
const colPresetBtns = document.querySelectorAll('.gv-preset-btn[data-col]');
const visibilityCards = document.querySelectorAll('.gv-toggle-card[data-mode]');
const titleSourceBtns = document.querySelectorAll('.gv-preset-btn[data-source]');
const visibilityDesc = document.getElementById('drawer-visibility-desc');

const btnAttachImage = document.getElementById('btn-attach-image');
const fileInput = document.getElementById('gv-file-input');

// Initialize
t.render(function () {
  return Promise.all([
    t.board('name', 'lists', 'labels'),
    t.cards('id', 'name', 'idList', 'labels', 'attachments'),
    t.get('member', 'private', 'galleryLayoutSettings')
  ]).then(function ([board, cards, savedSettings]) {
    if (savedSettings) {
      currentSettings = Object.assign(currentSettings, savedSettings);
    }
    applyLayoutSettings();

    if (board && board.name) {
      boardNameSpan.textContent = `| ${board.name}`;
    }

    // Populate Filters
    populateFilterDropdowns(board, cards);

    // Process Cards & Attachments
    processBoardData(board, cards);

    renderGallery();
  });
});

function populateFilterDropdowns(board, cards) {
  const lists = board.lists || [];
  const listCounts = {};

  // Count items per list
  (cards || []).forEach(c => {
    if (c.attachments && c.attachments.some(window.GalleryAPI.isImageAttachment)) {
      listCounts[c.idList] = (listCounts[c.idList] || 0) + 1;
    }
  });

  filterList.innerHTML = `<option value="ALL">All Lists (${lists.length})</option>`;
  lists.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.id;
    opt.textContent = `${l.name} (${listCounts[l.id] || 0})`;
    filterList.appendChild(opt);
  });

  // Extract all labels
  const uniqueLabels = new Set();
  (cards || []).forEach(c => {
    (c.labels || []).forEach(lb => {
      if (lb.name) uniqueLabels.add(lb.name);
    });
  });

  filterLabel.innerHTML = '<option value="ALL">All Labels</option>';
  uniqueLabels.forEach(lbl => {
    const opt = document.createElement('option');
    opt.value = lbl;
    opt.textContent = lbl;
    filterLabel.appendChild(opt);
  });
}

function processBoardData(board, cards) {
  const listMap = {};
  (board.lists || []).forEach(l => { listMap[l.id] = l.name; });

  allItems = [];
  (cards || []).forEach(c => {
    if (c.attachments) {
      c.attachments.filter(window.GalleryAPI.isImageAttachment).forEach(att => {
        allItems.push({
          id: att.id,
          name: att.name || 'image_attachment.png',
          url: att.url,
          cardId: c.id,
          cardName: c.name || 'Untitled Card',
          listId: c.idList,
          listName: listMap[c.idList] || 'List',
          labels: c.labels || [],
          dimensions: att.previews && att.previews[0] ? `${att.previews[0].width}×${att.previews[0].height}` : '1600×1200'
        });
      });
    }
  });

  // If no items on board yet, provide rich demo items so UI is instantly previewable
  if (allItems.length === 0) {
    allItems = getMockGalleryItems();
  }
}

function renderGallery() {
  const query = (searchInput.value || '').toLowerCase().trim();
  const selectedList = filterList.value;
  const selectedLabel = filterLabel.value;

  filteredItems = allItems.filter(item => {
    const matchesList = selectedList === 'ALL' || item.listId === selectedList;
    const matchesLabel = selectedLabel === 'ALL' || (item.labels || []).some(l => l.name === selectedLabel);
    const matchesSearch = !query || 
      item.name.toLowerCase().includes(query) || 
      item.cardName.toLowerCase().includes(query) || 
      item.listName.toLowerCase().includes(query);

    return matchesList && matchesLabel && matchesSearch;
  });

  // Update Counters & Stats
  showingCountSpan.textContent = filteredItems.length;
  statCount.textContent = `${filteredItems.length} image${filteredItems.length !== 1 ? 's' : ''}`;

  if (filteredItems.length === 0) {
    cardsGrid.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  cardsGrid.style.display = 'grid';
  emptyState.style.display = 'none';
  cardsGrid.innerHTML = '';

  filteredItems.forEach((item, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = `gv-card ${currentSettings.visibilityMode === 'hover' ? 'hide-meta' : ''}`;

    // Header label badges HTML
    const labelsHtml = (item.labels || []).map(l => {
      const colorClass = getBadgeColorClass(l.color || l.name);
      return `<span class="gv-badge ${colorClass}">${l.name || 'Label'}</span>`;
    }).join('');

    // Title & subtitle logic based on setting
    let primaryTitle = item.name;
    let secondarySubtitle = item.cardName;
    if (currentSettings.titleSource === 'card') {
      primaryTitle = item.cardName;
      secondarySubtitle = item.listName;
    } else if (currentSettings.titleSource === 'both') {
      primaryTitle = `${item.cardName} • ${item.name}`;
      secondarySubtitle = item.listName;
    }

    cardEl.innerHTML = `
      <div class="gv-card-header">
        <div class="gv-card-title-group">
          <span class="gv-card-icon">${getIconForList(item.listName)}</span>
          <span class="gv-card-title" title="${item.cardName}">${item.cardName}</span>
        </div>
        <div class="gv-card-badges">
          ${labelsHtml}
        </div>
      </div>

      <div class="gv-card-image-wrap">
        <img class="gv-card-image" src="${item.url}" alt="${item.name}" loading="lazy" />
        <div class="gv-card-inner-overlay">
          <span>${item.name}</span>
        </div>
      </div>

      <div class="gv-card-footer">
        <div class="gv-card-meta-left">
          <div class="gv-card-filename" title="${primaryTitle}">${primaryTitle}</div>
          <div class="gv-card-subtitle" title="${secondarySubtitle}">${secondarySubtitle}</div>
        </div>
        <div class="gv-card-dims">${item.dimensions}</div>
      </div>
    `;

    // Click card to open in lightbox or show card
    cardEl.addEventListener('click', () => {
      if (item.cardId) {
        t.modal({
          title: item.cardName || 'Gallery Viewer',
          url: './gallery-modal.html',
          fullscreen: true
        });
      }
    });

    cardsGrid.appendChild(cardEl);
  });
}

function applyLayoutSettings() {
  const root = document.documentElement;
  root.style.setProperty('--col-width', `${currentSettings.colWidth}px`);
  root.style.setProperty('--gap-h', `${currentSettings.gapH}px`);
  root.style.setProperty('--gap-v', `${currentSettings.gapV}px`);

  // Update Summary Strip
  statCol.textContent = `${currentSettings.colWidth}px`;
  statGapH.textContent = `${currentSettings.gapH}px`;
  statGapV.textContent = `${currentSettings.gapV}px`;
  statTitleSrc.textContent = currentSettings.titleSource === 'card' ? 'Card Title' : currentSettings.titleSource === 'both' ? 'Both' : 'Attachment File';
  statVisibilityMode.textContent = currentSettings.visibilityMode === 'hover' ? 'Only on hover' : 'Always Visible';

  // Update Drawer Inputs
  sliderColWidth.value = currentSettings.colWidth;
  valColWidth.textContent = `${currentSettings.colWidth} px`;

  sliderGapH.value = currentSettings.gapH;
  valGapH.textContent = `${currentSettings.gapH} px`;

  sliderGapV.value = currentSettings.gapV;
  valGapV.textContent = `${currentSettings.gapV} px`;

  // Preset Buttons sync
  colPresetBtns.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.getAttribute('data-col')) === currentSettings.colWidth);
  });

  visibilityCards.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === currentSettings.visibilityMode);
  });

  titleSourceBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-source') === currentSettings.titleSource);
  });
}

function saveSettings() {
  applyLayoutSettings();
  renderGallery();
  return t.set('member', 'private', 'galleryLayoutSettings', currentSettings);
}

// Drawer Controls
function openDrawer() { settingsDrawer.classList.add('open'); }
function closeDrawer() { settingsDrawer.classList.remove('open'); }

btnAdjustSettings.addEventListener('click', openDrawer);
btnOpenSettings.addEventListener('click', openDrawer);
btnCloseDrawer.addEventListener('click', closeDrawer);
btnDrawerDone.addEventListener('click', () => {
  saveSettings();
  closeDrawer();
});

btnDrawerReset.addEventListener('click', () => {
  currentSettings = {
    colWidth: 280,
    gapH: 16,
    gapV: 16,
    visibilityMode: 'always',
    titleSource: 'attachment'
  };
  saveSettings();
});

// Slider Listeners
sliderColWidth.addEventListener('input', (e) => {
  currentSettings.colWidth = parseInt(e.target.value);
  applyLayoutSettings();
  renderGallery();
});

sliderGapH.addEventListener('input', (e) => {
  currentSettings.gapH = parseInt(e.target.value);
  applyLayoutSettings();
});

sliderGapV.addEventListener('input', (e) => {
  currentSettings.gapV = parseInt(e.target.value);
  applyLayoutSettings();
});

btnGapFlush.addEventListener('click', () => {
  currentSettings.gapH = 0;
  currentSettings.gapV = 0;
  saveSettings();
});

btnGapDefault.addEventListener('click', () => {
  currentSettings.gapH = 16;
  currentSettings.gapV = 16;
  saveSettings();
});

colPresetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentSettings.colWidth = parseInt(btn.getAttribute('data-col'));
    saveSettings();
  });
});

visibilityCards.forEach(btn => {
  btn.addEventListener('click', () => {
    currentSettings.visibilityMode = btn.getAttribute('data-mode');
    visibilityDesc.textContent = currentSettings.visibilityMode === 'always'
      ? 'Titles remain fixed as a permanent caption on every thumbnail.'
      : 'Titles and metadata reveal smoothly when hovering over cards.';
    saveSettings();
  });
});

titleSourceBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentSettings.titleSource = btn.getAttribute('data-source');
    saveSettings();
  });
});

// Search & Filter Events
searchInput.addEventListener('input', renderGallery);
filterList.addEventListener('change', renderGallery);
filterLabel.addEventListener('change', renderGallery);

// Attach Image button
btnAttachImage.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      allItems.unshift({
        id: 'upload-' + Date.now(),
        name: file.name,
        url: event.target.result,
        cardName: 'Uploaded Image',
        listName: 'Attachments',
        labels: [{ name: 'New Upload', color: 'blue' }],
        dimensions: 'Original'
      });
      renderGallery();
    };
    reader.readAsDataURL(file);
  }
});

// Helper Icon and Color Resolvers
function getIconForList(listName) {
  const name = (listName || '').toLowerCase();
  if (name.includes('design') || name.includes('brand')) return '✈';
  if (name.includes('wireframe') || name.includes('arch')) return '📐';
  if (name.includes('mood') || name.includes('inspire')) return '🎨';
  if (name.includes('market') || name.includes('product')) return '🚀';
  return '📁';
}

function getBadgeColorClass(labelStr) {
  const l = (labelStr || '').toLowerCase();
  if (l.includes('brand') || l.includes('purple')) return 'badge-purple';
  if (l.includes('priority') || l.includes('red')) return 'badge-red';
  if (l.includes('ux') || l.includes('ui') || l.includes('blue')) return 'badge-blue';
  if (l.includes('proto') || l.includes('yellow')) return 'badge-yellow';
  if (l.includes('market') || l.includes('green')) return 'badge-green';
  return 'badge-blue';
}

function getMockGalleryItems() {
  return [
    {
      id: 'demo-1',
      name: 'brand_palette_guide_v2.png',
      url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80',
      cardName: 'Visual Design & Branding',
      listName: 'Design Team Board',
      labels: [{ name: 'Brand Identity', color: 'purple' }, { name: 'High Priority', color: 'red' }],
      dimensions: '1600×1200'
    },
    {
      id: 'demo-2',
      name: 'mobile_dashboard_dark_mockup.png',
      url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
      cardName: 'Wireframes & Architecture',
      listName: 'Design Team Board',
      labels: [{ name: 'UI / UX', color: 'blue' }, { name: 'Prototype', color: 'yellow' }],
      dimensions: '1125×2436'
    },
    {
      id: 'demo-3',
      name: 'isometric_crypto_vault_icon.png',
      url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      cardName: 'Inspiration & Moodboard',
      listName: 'Design Team Board',
      labels: [{ name: 'Brand Identity', color: 'purple' }],
      dimensions: '1200×1200'
    },
    {
      id: 'demo-4',
      name: 'marketing_banner_hero_v3.png',
      url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
      cardName: 'Marketing & Production Assets',
      listName: 'Design Team Board',
      labels: [{ name: 'Marketing', color: 'green' }],
      dimensions: '1920×1080'
    },
    {
      id: 'demo-5',
      name: 'user_flow_onboarding_step1.png',
      url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80',
      cardName: 'Wireframes & Architecture',
      listName: 'Design Team Board',
      labels: [{ name: 'UI / UX', color: 'blue' }, { name: 'High Priority', color: 'red' }],
      dimensions: '1440×900'
    },
    {
      id: 'demo-6',
      name: 'landing_page_social_preview.png',
      url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop&q=80',
      cardName: 'Marketing & Production Assets',
      listName: 'Design Team Board',
      labels: [{ name: 'Marketing', color: 'green' }],
      dimensions: '1200×630'
    }
  ];
}
