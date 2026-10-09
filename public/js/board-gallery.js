/* global TrelloPowerUp */

(function () {
  const t = TrelloPowerUp.iframe();

  // Color mapping for Trello label colors
  const LABEL_COLORS = {
    green: '#2ab38a',
    yellow: '#e5a21a',
    orange: '#f06595',
    red: '#f5655a',
    purple: '#8f7ee7',
    blue: '#339af0',
    sky: '#22b8cf',
    lime: '#94d82d',
    pink: '#da77f2',
    black: '#495057',
    default: '#8d98b1'
  };

  let allBoardItems = [];
  let allLists = [];
  let availableLabels = {};
  let visibleItems = [];
  let currentIndex = -1;

  const state = {
    date: 'all',
    list: 'all',
    label: 'all',
    q: '',
    col: 260,
    gx: 16,
    gy: 16,
    title: 'both',
    reveal: 'always'
  };

  const DEF = { col: 260, gx: 16, gy: 16, title: 'both', reveal: 'always' };

  const $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function getDaysAgo(dateString) {
    if (!dateString) return 0;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 0;
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    if (diffTime <= 0) return 0;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  function formatTimeAgo(days) {
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return days + ' days ago';
  }

  // Trello Power-Up Render
  t.render(function () {
    return Promise.all([
      t.board('id', 'name'),
      t.lists('id', 'name'),
      t.cards('id', 'name', 'idList', 'labels', 'attachments', 'badges', 'cover', 'dateLastActivity'),
      t.get('member', 'private', 'galleryDisplaySettings')
    ]).then(function ([board, lists, cards, savedSettings]) {
      // Ensure filter state always defaults to show all images when opened
      state.date = 'all';
      state.list = 'all';
      state.label = 'all';
      state.q = '';

      if (savedSettings) {
        if (typeof savedSettings.col === 'number') state.col = savedSettings.col;
        if (typeof savedSettings.gx === 'number') state.gx = savedSettings.gx;
        if (typeof savedSettings.gy === 'number') state.gy = savedSettings.gy;
        if (savedSettings.title) state.title = savedSettings.title;
        if (savedSettings.reveal) state.reveal = savedSettings.reveal;
      }

      if (board && board.name) {
        $('boardTitle').textContent = board.name;
      }

      allLists = lists || [];
      processTrelloData(lists, cards);
      populateListDropdown();
      populateLabelDropdown();
      syncSettings();
      render();
    }).catch(function () {
      // Fail gracefully if board data cannot be fetched
    });
  });

  function processTrelloData(lists, cards) {
    const listMap = {};
    (lists || []).forEach(l => { listMap[l.id] = l.name; });

    allBoardItems = [];
    availableLabels = {};

    (cards || []).forEach(c => {
      // Determine primary label and all card labels
      let primaryLabel = 'General';
      let primaryColor = LABEL_COLORS.default;
      const cardLabelsList = [];

      if (c.labels && c.labels.length > 0) {
        const lb = c.labels[0];
        primaryLabel = lb.name && lb.name.trim().length > 0 ? lb.name : (lb.color ? capitalize(lb.color) : 'Label');
        primaryColor = LABEL_COLORS[lb.color] || LABEL_COLORS.default;
        
        c.labels.forEach(l => {
          const name = l.name && l.name.trim().length > 0 ? l.name : (l.color ? capitalize(l.color) : 'Label');
          availableLabels[name] = { c: LABEL_COLORS[l.color] || LABEL_COLORS.default };
          cardLabelsList.push(name);
        });
      }

      const imgAttachments = (c.attachments || []).filter(window.GalleryAPI.isImageAttachment);

      if (imgAttachments.length > 0) {
        imgAttachments.forEach(att => {
          const days = getDaysAgo(att.date || c.dateLastActivity);
          allBoardItems.push({
            id: att.id,
            f: att.name || 'image_attachment.png',
            url: att.url,
            card: c.name || 'Untitled Card',
            cardId: c.id,
            listId: c.idList,
            listName: listMap[c.idList] || 'List',
            l: primaryLabel,
            labels: cardLabelsList.length > 0 ? cardLabelsList : [primaryLabel],
            color: primaryColor,
            d: days,
            date: att.date || c.dateLastActivity
          });
        });
      } else if (c.cover && c.cover.sharedSourceUrl) {
        const days = getDaysAgo(c.dateLastActivity);
        allBoardItems.push({
          id: 'cover-' + c.id,
          f: c.name + ' (Cover)',
          url: c.cover.sharedSourceUrl,
          card: c.name || 'Untitled Card',
          cardId: c.id,
          listId: c.idList,
          listName: listMap[c.idList] || 'List',
          l: primaryLabel,
          labels: cardLabelsList.length > 0 ? cardLabelsList : [primaryLabel],
          color: primaryColor,
          d: days,
          date: c.dateLastActivity
        });
      }
    });

    // If completely empty board or fallback mode, add helpful demo cards
    if (allBoardItems.length === 0) {
      allBoardItems = getMockItems();
      if (!allLists || allLists.length === 0) {
        allLists = [
          { id: 'list-1', name: 'In Progress' },
          { id: 'list-2', name: 'Done' },
          { id: 'list-3', name: 'Backlog' }
        ];
      }
      availableLabels = {
        Design: { c: '#8f7ee7' },
        Bug: { c: '#f5655a' },
        Marketing: { c: '#e5a21a' },
        Docs: { c: '#2ab38a' }
      };
    }
  }

  function populateListDropdown() {
    const listCounts = {};
    allBoardItems.forEach(it => {
      if (it.listId) listCounts[it.listId] = (listCounts[it.listId] || 0) + 1;
    });

    let html = `<option value="all" ${state.list === 'all' ? 'selected' : ''}>All lists</option>`;
    allLists.forEach(l => {
      const cnt = listCounts[l.id] || 0;
      html += `<option value="${l.id}" ${state.list === l.id ? 'selected' : ''}>${esc(l.name)} (${cnt})</option>`;
    });
    const sel = $('listSelect');
    sel.innerHTML = html;
    sel.value = state.list;
  }

  function populateLabelDropdown() {
    const labelCounts = {};
    allBoardItems.forEach(it => {
      if (it.labels && it.labels.length > 0) {
        it.labels.forEach(lb => {
          labelCounts[lb] = (labelCounts[lb] || 0) + 1;
          if (!availableLabels[lb]) {
            availableLabels[lb] = { c: it.color || LABEL_COLORS.default };
          }
        });
      } else if (it.l) {
        labelCounts[it.l] = (labelCounts[it.l] || 0) + 1;
        if (!availableLabels[it.l]) {
          availableLabels[it.l] = { c: it.color || LABEL_COLORS.default };
        }
      }
    });

    let html = `<option value="all" ${state.label === 'all' ? 'selected' : ''}>All labels</option>`;
    Object.keys(labelCounts).sort().forEach(k => {
      const cnt = labelCounts[k] || 0;
      html += `<option value="${esc(k)}" ${state.label === k ? 'selected' : ''}>${esc(k)} (${cnt})</option>`;
    });
    const sel = $('labelSelect');
    sel.innerHTML = html;
    sel.value = state.label;
  }

  function match(it) {
    if (state.list !== 'all' && it.listId !== state.list) return false;
    if (state.label && state.label !== 'all') {
      const hasLabel = (it.labels && it.labels.includes(state.label)) || it.l === state.label;
      if (!hasLabel) return false;
    }
    if (state.date === 'today' && it.d > 0) return false;
    if (state.date === 'week' && it.d > 7) return false;
    if (state.date === 'month' && it.d > 30) return false;
    const q = state.q.trim().toLowerCase();
    if (q) {
      const target = [
        it.f,
        it.card,
        it.listName,
        ...(it.labels || []),
        it.l
      ].filter(Boolean).join(' ').toLowerCase();
      if (target.indexOf(q) < 0) return false;
    }
    return true;
  }

  function render() {
    visibleItems = allBoardItems.filter(match);
    const isFiltered = state.date !== 'all' || state.list !== 'all' || (state.label && state.label !== 'all') || state.q.trim();
    $('reset').hidden = !isFiltered;
    $('count').innerHTML = `<b>${visibleItems.length}</b> of ${allBoardItems.length} images`;

    const s = $('scroll');
    if (!visibleItems.length) {
      const noBoard = allBoardItems.length === 0;
      s.innerHTML = `
        <div class="empty">
          <div class="empty-in">
            <div class="empty-ic">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.6"/><path d="m21 15-4.5-4.5L6 21"/>
              </svg>
            </div>
            <h2>${noBoard ? 'No images on this board yet' : 'No images match these filters'}</h2>
            <p>${noBoard ? 'Attach an image to any card and it will show up here.' : 'Try clearing your list or label filter.'}</p>
            <div class="empty-actions">
              ${noBoard ? '<button class="btn primary" data-act="attach">Attach image</button>' : '<button class="btn primary" data-act="reset">Clear filters</button>'}
            </div>
          </div>
        </div>`;
      return;
    }

    let html = `<div class="grid" id="grid" data-title="${state.title}" data-reveal="${state.reveal}" style="--col:${state.col}px;--gx:${state.gx}px;--gy:${state.gy}px">`;
    visibleItems.forEach((it, i) => {
      const dotColor = (availableLabels[it.l] && availableLabels[it.l].c) || it.color || '#8d98b1';
      html += `
        <button class="tile" data-i="${i}" aria-label="Preview ${esc(it.f)}, on card ${esc(it.card)}">
          <span class="ph">
            <img src="${it.url}" alt="${esc(it.f)}" loading="lazy" />
          </span>
          <span class="over">
            <span class="tag">
              <span class="dot" style="--c:${dotColor}"></span>${esc(it.l)}
            </span>
            <span class="cap">
              <strong>${esc(it.card)}</strong>
              <span>${esc(it.f)} · ${formatTimeAgo(it.d)}</span>
            </span>
          </span>
        </button>`;
    });
    s.innerHTML = html + '</div>';
  }

  function applyLayout() {
    const g = $('grid');
    if (!g) return;
    g.style.setProperty('--col', state.col + 'px');
    g.style.setProperty('--gx', state.gx + 'px');
    g.style.setProperty('--gy', state.gy + 'px');
    g.dataset.title = state.title;
    g.dataset.reveal = state.reveal;
    t.set('member', 'private', 'galleryDisplaySettings', {
      col: state.col,
      gx: state.gx,
      gy: state.gy,
      title: state.title,
      reveal: state.reveal
    });
  }

  function setSeg(id, v) {
    Array.prototype.forEach.call($(id).querySelectorAll('button'), function (b) {
      b.setAttribute('aria-checked', String(b.dataset.v === v));
    });
  }

  function syncSettings() {
    $('col').value = state.col; $('colOut').textContent = state.col + ' px';
    $('gx').value = state.gx;   $('gxOut').textContent = state.gx + ' px';
    $('gy').value = state.gy;   $('gyOut').textContent = state.gy + ' px';
    setSeg('titleSeg', state.title);
    setSeg('revealSeg', state.reveal);
  }

  function openLb(i) {
    currentIndex = i;
    const it = visibleItems[i];
    $('lbPic').innerHTML = `<img class="big" src="${it.url}" alt="${esc(it.f)}" />`;
    $('lbTitle').textContent = it.card;
    $('lbMeta').textContent = `${it.f} · ${it.l} · ${formatTimeAgo(it.d)}`;
    
    // Set download link
    const dlBtn = $('lbDl');
    dlBtn.href = it.url;
    dlBtn.setAttribute('download', it.f);

    $('lb').classList.add('open');
    $('lbClose').focus();
  }

  function closeLb() { $('lb').classList.remove('open'); }
  function step(n) {
    if (!visibleItems.length) return;
    openLb((currentIndex + n + visibleItems.length) % visibleItems.length);
  }

  function resetFilters() {
    state.date = 'all';
    state.list = 'all';
    state.label = 'all';
    state.q = '';
    $('q').value = '';
    $('listSelect').value = 'all';
    $('labelSelect').value = 'all';
    setSeg('dateSeg', 'all');
    render();
  }

  // Event Listeners
  $('listSelect').addEventListener('change', function (e) {
    state.list = e.target.value;
    render();
  });

  $('labelSelect').addEventListener('change', function (e) {
    state.label = e.target.value;
    render();
  });

  $('dateSeg').addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (!b) return;
    state.date = b.dataset.v;
    setSeg('dateSeg', state.date);
    render();
  });

  $('q').addEventListener('input', function (e) {
    state.q = e.target.value;
    render();
  });

  $('reset').addEventListener('click', resetFilters);

  $('scroll').addEventListener('click', function (e) {
    const tile = e.target.closest('.tile');
    if (tile) return openLb(+tile.dataset.i);
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'reset') resetFilters();
    if (act.dataset.act === 'attach') $('fileInput').click();
  });

  $('attach').addEventListener('click', function () {
    $('fileInput').click();
  });

  $('fileInput').addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = function (event) {
        allBoardItems.unshift({
          id: 'upload-' + Date.now(),
          f: file.name,
          url: event.target.result,
          card: 'New Upload',
          listName: 'Attachments',
          l: 'Upload',
          labels: ['Upload'],
          color: '#339af0',
          d: 0
        });
        availableLabels['Upload'] = { c: '#339af0' };
        populateLabelDropdown();
        render();
      };
      reader.readAsDataURL(file);
    }
  });

  $('settingsBtn').addEventListener('click', function () {
    const open = $('drawer').classList.toggle('open');
    this.setAttribute('aria-pressed', String(open));
  });

  ['col', 'gx', 'gy'].forEach(function (k) {
    $(k).addEventListener('input', function (e) {
      state[k] = +e.target.value;
      $(k + 'Out').textContent = state[k] + ' px';
      applyLayout();
    });
  });

  $('titleSeg').addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (!b) return;
    state.title = b.dataset.v;
    setSeg('titleSeg', state.title);
    applyLayout();
  });

  $('revealSeg').addEventListener('click', function (e) {
    const b = e.target.closest('button');
    if (!b) return;
    state.reveal = b.dataset.v;
    setSeg('revealSeg', state.reveal);
    applyLayout();
  });

  $('defaults').addEventListener('click', function () {
    Object.keys(DEF).forEach(function (k) { state[k] = DEF[k]; });
    syncSettings();
    applyLayout();
  });

  $('lbClose').addEventListener('click', closeLb);
  $('prev').addEventListener('click', function () { step(-1); });
  $('next').addEventListener('click', function () { step(1); });
  $('lb').addEventListener('click', function (e) { if (e.target === this) closeLb(); });

  $('lbOpen').addEventListener('click', function () {
    if (currentIndex >= 0 && visibleItems[currentIndex] && visibleItems[currentIndex].cardId) {
      t.showCard(visibleItems[currentIndex].cardId);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (!$('lb').classList.contains('open')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function getMockItems() {
    return [
      { f: 'hero-banner-v3.png', card: 'Landing page refresh', l: 'Design', labels: ['Design'], listId: 'list-1', listName: 'In Progress', d: 0, url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80', color: '#8f7ee7' },
      { f: 'checkout-error.png', card: 'Fix payment timeout', l: 'Bug', labels: ['Bug'], listId: 'list-1', listName: 'In Progress', d: 1, url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80', color: '#f5655a' },
      { f: 'campaign-poster.jpg', card: 'Diwali campaign', l: 'Marketing', labels: ['Marketing'], listId: 'list-2', listName: 'Done', d: 2, url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80', color: '#e5a21a' },
      { f: 'api-diagram.png', card: 'API reference update', l: 'Docs', labels: ['Docs'], listId: 'list-3', listName: 'Backlog', d: 3, url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80', color: '#2ab38a' },
      { f: 'onboarding-flow.png', card: 'Onboarding redesign', l: 'Design', labels: ['Design'], listId: 'list-1', listName: 'In Progress', d: 4, url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&auto=format&fit=crop&q=80', color: '#8f7ee7' },
      { f: 'social-card.jpg', card: 'Launch announcement', l: 'Marketing', labels: ['Marketing'], listId: 'list-2', listName: 'Done', d: 8, url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop&q=80', color: '#e5a21a' }
    ];
  }
})();
