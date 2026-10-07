/* global TrelloPowerUp */

const t = TrelloPowerUp.iframe();

// State
let allItems = [];
let allLists = [];
let allLabels = [];
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

// Initialize Power-Up rendering
t.render(function () {
  return Promise.all([
    t.board('id', 'name'),
    t.lists('id', 'name'),
    t.cards('id', 'name', 'idList', 'labels', 'attachments', 'badges', 'cover'),
    t.get('member', 'private', 'galleryLayoutSettings')
  ]).then(function ([board, lists, cards, savedSettings]) {
    if (savedSettings) {
      currentSettings = Object.assign(currentSettings, savedSettings);
    }
    applyLayoutSettings();

    // Display real Board Name
    if (board && board.name) {
      boardNameSpan.textContent = `| ${board.name}`;
    } else {
      boardNameSpan.textContent = '';
    }

    allLists = lists || [];

    // Process Board Data
    processBoardData(lists, cards);

    // Populate Filters
    populateFilterDropdowns(lists, allItems);

    // Render cards
    renderGallery();
  }).catch(function (err) {
    console.error('Error loading Trello board data:', err);
  });
});

function processBoardData(lists, cards) {
  const listMap = {};
  (lists || []).forEach(l => { listMap[l.id] = l.name; });

  allItems = [];
  const labelMap = new Map();

  (cards || []).forEach(c => {
    // Process Card Labels
    const normalizedLabels = (c.labels || []).map(l => {
      const displayName = l.name && l.name.trim().length > 0
        ? l.name
        : (l.color ? capitalize(l.color) : 'Label');
      
      const labelObj = {
        id: l.id || displayName,
        name: displayName,
        color: l.color || 'blue'
      };

      if (!labelMap.has(displayName)) {
        labelMap.set(displayName, labelObj);
      }
      return labelObj;
    });

    // Check attachments
    if (c.attachments && c.attachments.length > 0) {
      c.attachments.filter(window.GalleryAPI.isImageAttachment).forEach(att => {
        allItems.push({
          id: att.id,
          name: att.name || 'Image Attachment',
          url: att.url,
          cardId: c.id,
          cardName: c.name || 'Untitled Card',
          listId: c.idList,
          listName: listMap[c.idList] || 'List',
          labels: normalizedLabels,
          dimensions: att.previews && att.previews[0] ? `${att.previews[0].width}×${att.previews[0].height}` : 'Original'
        });
      });
    } else if (c.cover && c.cover.sharedSourceUrl) {
      // Cover image fallback if attachment isn't listed directly
      allItems.push({
        id: 'cover-' + c.id,
        name: c.name + ' (Cover)',
        url: c.cover.sharedSourceUrl,
        cardId: c.id,
        cardName: c.name || 'Untitled Card',
        listId: c.idList,
        listName: listMap[c.idList] || 'List',
        labels: normalizedLabels,
        dimensions: 'Cover'
      });
    }
  });

  allLabels = Array.from(labelMap.values());
}

function populateFilterDropdowns(lists, items) {
  // Count items per list
  const listCounts = {};
  items.forEach(item => {
    listCounts[item.listId] = (listCounts[item.listId] || 0) + 1;
  });

  // 1. Lists dropdown
  const currentSelectedList = filterList.value;
  filterList.innerHTML = `<option value="ALL">All Lists (${lists.length})</option>`;
  lists.forEach(l => {
    const opt = document.createElement('option');
    opt.value = l.id;
    opt.textContent = `${l.name} (${listCounts[l.id] || 0})`;
    filterList.appendChild(opt);
  });
  if (currentSelectedList && filterList.querySelector(`option[value="${currentSelectedList}"]`)) {
    filterList.value = currentSelectedList;
  }

  // 2. Labels dropdown
  const currentSelectedLabel = filterLabel.value;
  filterLabel.innerHTML = `<option value="ALL">All Labels (${allLabels.length})</option>`;
  allLabels.forEach(lbl => {
    const opt = document.createElement('option');
    opt.value = lbl.name;
    opt.textContent = lbl.name;
    filterLabel.appendChild(opt);
  });
  if (currentSelectedLabel && filterLabel.querySelector(`option[value="${currentSelectedLabel}"]`)) {
    filterLabel.value = currentSelectedLabel;
  }
}

function renderGallery() {
  const query = (searchInput.value || '').toLowerCase().trim();
  const selectedList = filterList.value;
  const selectedLabel = filterLabel.value;

  const filteredItems = allItems.filter(item => {
    const matchesList = selectedList === 'ALL' || item.listId === selectedList;
    const matchesLabel = selectedLabel === 'ALL' || (item.labels || []).some(l => l.name === selectedLabel);
    const matchesSearch = !query || 
      item.name.toLowerCase().includes(query) || 
      item.cardName.toLowerCase().includes(query) || 
      item.listName.toLowerCase().includes(query) ||
      (item.labels || []).some(l => l.name.toLowerCase().includes(query));

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

  filteredItems.forEach((item) => {
    const cardEl = document.createElement('div');
    cardEl.className = `gv-card ${currentSettings.visibilityMode === 'hover' ? 'hide-meta' : ''}`;

    // Header label badges HTML
    const labelsHtml = (item.labels || []).map(l => {
      const colorClass = getBadgeColorClass(l.color || l.name);
      return `<span class="gv-badge ${colorClass}">${escapeHtml(l.name)}</span>`;
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
          <span class="gv-card-title" title="${escapeHtml(item.cardName)}">${escapeHtml(item.cardName)}</span>
        </div>
        <div class="gv-card-badges">
          ${labelsHtml}
        </div>
      </div>

      <div class="gv-card-image-wrap">
        <img class="gv-card-image" src="${item.url}" alt="${escapeHtml(item.name)}" loading="lazy" />
        <div class="gv-card-inner-overlay">
          <span>${escapeHtml(item.name)}</span>
        </div>
      </div>

      <div class="gv-card-footer">
        <div class="gv-card-meta-left">
          <div class="gv-card-filename" title="${escapeHtml(primaryTitle)}">${escapeHtml(primaryTitle)}</div>
          <div class="gv-card-subtitle" title="${escapeHtml(secondarySubtitle)}">${escapeHtml(secondarySubtitle)}</div>
        </div>
        <div class="gv-card-dims">${item.dimensions}</div>
      </div>
    `;

    // Click card to open in lightbox or show card
    cardEl.addEventListener('click', () => {
      if (item.cardId && t.showCard) {
        t.showCard(item.cardId);
      } else {
        window.open(item.url, '_blank');
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
        listId: allLists[0] ? allLists[0].id : 'uploaded',
        listName: allLists[0] ? allLists[0].name : 'Uploaded',
        labels: [{ name: 'New Upload', color: 'blue' }],
        dimensions: 'Original'
      });
      renderGallery();
    };
    reader.readAsDataURL(file);
  }
});

// Utilities
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getIconForList(listName) {
  const name = (listName || '').toLowerCase();
  if (name.includes('design') || name.includes('brand')) return '✈';
  if (name.includes('wireframe') || name.includes('arch') || name.includes('todo')) return '📐';
  if (name.includes('mood') || name.includes('inspire')) return '🎨';
  if (name.includes('market') || name.includes('product') || name.includes('done')) return '🚀';
  return '📁';
}

function getBadgeColorClass(labelStr) {
  const l = (labelStr || '').toLowerCase();
  if (l.includes('purple') || l.includes('brand')) return 'badge-purple';
  if (l.includes('red') || l.includes('priority')) return 'badge-red';
  if (l.includes('blue') || l.includes('ux') || l.includes('ui')) return 'badge-blue';
  if (l.includes('yellow') || l.includes('proto')) return 'badge-yellow';
  if (l.includes('green') || l.includes('market')) return 'badge-green';
  if (l.includes('orange')) return 'badge-orange';
  return 'badge-gray';
}
