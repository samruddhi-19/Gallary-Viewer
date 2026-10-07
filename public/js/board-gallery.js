/* global TrelloPowerUp */

const t = TrelloPowerUp.iframe();

let allBoardImages = [];
const boardGridView = document.getElementById('board-grid-view');
const emptyState = document.getElementById('empty-state');
const galleryCounter = document.getElementById('gallery-counter');
const boardNameSpan = document.getElementById('board-name');
const listFilter = document.getElementById('list-filter');
const btnClose = document.getElementById('btn-close');

t.render(function () {
  return Promise.all([
    t.board('name', 'lists'),
    t.cards('id', 'name', 'idList', 'attachments')
  ]).then(function ([board, cards]) {
    if (board.name) {
      boardNameSpan.textContent = `${board.name} Gallery`;
    }

    // Populate List Filter
    if (board.lists) {
      listFilter.innerHTML = '<option value="ALL">All Lists</option>';
      board.lists.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.id;
        opt.textContent = l.name;
        listFilter.appendChild(opt);
      });
    }

    const listMap = {};
    (board.lists || []).forEach(l => { listMap[l.id] = l.name; });

    allBoardImages = [];
    cards.forEach(c => {
      const cardContext = {
        id: c.id,
        name: c.name,
        listName: listMap[c.idList] || 'List'
      };
      if (c.attachments) {
        c.attachments.filter(window.GalleryAPI.isImageAttachment).forEach(att => {
          allBoardImages.push(window.GalleryAPI.normalizeAttachment(att, cardContext));
        });
      }
    });

    renderBoardGrid('ALL');
  });
});

function renderBoardGrid(selectedListId) {
  boardGridView.innerHTML = '';

  const filtered = selectedListId === 'ALL'
    ? allBoardImages
    : allBoardImages.filter(img => img.listName === selectedListId);

  galleryCounter.textContent = `${filtered.length} image${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    emptyState.style.display = 'flex';
    boardGridView.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  boardGridView.style.display = 'grid';

  filtered.forEach(img => {
    const card = document.createElement('div');
    card.className = 'grid-card';
    card.innerHTML = `
      <img src="${img.url}" alt="${img.name}" loading="lazy" />
      <div class="grid-card-overlay">
        <div>
          <div style="font-weight: 600;">${img.cardName || 'Card'}</div>
          <div style="font-size: 10px; color: #a5b4fc;">${img.name}</div>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      // Open in card view
      if (img.cardId) {
        t.showCard(img.cardId);
      }
    });

    boardGridView.appendChild(card);
  });
}

listFilter.addEventListener('change', (e) => {
  renderBoardGrid(e.target.value);
});

btnClose.addEventListener('click', () => {
  t.closeModal();
});
