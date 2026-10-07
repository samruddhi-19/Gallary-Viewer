/* global TrelloPowerUp */

const ICON_URL = window.location.origin + '/assets/icon.svg';

window.TrelloPowerUp.initialize({
  // 1. Card Button to open Gallery Modal
  'card-buttons': function (t, options) {
    return [
      {
        icon: ICON_URL,
        text: 'Gallery Viewer',
        callback: function (t) {
          return t.modal({
            title: 'Image Gallery',
            url: './views/gallery-modal.html',
            fullscreen: true,
            actions: [
              {
                icon: ICON_URL,
                alt: 'Settings',
                position: 'right',
                url: './views/settings.html'
              }
            ]
          });
        }
      }
    ];
  },

  // 2. Board Button to open Board-Wide Gallery
  'board-buttons': function (t, options) {
    return [
      {
        icon: ICON_URL,
        text: 'Board Gallery',
        callback: function (t) {
          return t.modal({
            title: 'Board Media Gallery',
            url: './views/board-gallery.html',
            fullscreen: true
          });
        }
      }
    ];
  },

  // 3. Card Badges (shows image count on the front of the card)
  'card-badges': function (t, options) {
    return t.card('attachments')
      .then(function (card) {
        if (!card.attachments) return [];
        const imageCount = card.attachments.filter(window.GalleryAPI.isImageAttachment).length;
        if (imageCount === 0) return [];

        return [
          {
            icon: ICON_URL,
            text: `${imageCount} 📷`,
            color: 'light-gray'
          }
        ];
      });
  },

  // 4. Card Detail Badges (shows on the back of the card)
  'card-detail-badges': function (t, options) {
    return t.card('attachments')
      .then(function (card) {
        if (!card.attachments) return [];
        const imageCount = card.attachments.filter(window.GalleryAPI.isImageAttachment).length;
        if (imageCount === 0) return [];

        return [
          {
            title: 'Gallery Images',
            text: `${imageCount} image${imageCount > 1 ? 's' : ''}`,
            icon: ICON_URL,
            callback: function (t) {
              return t.modal({
                title: 'Image Gallery',
                url: './views/gallery-modal.html',
                fullscreen: true
              });
            }
          }
        ];
      });
  },

  // 5. Card Back Section (embedded thumbnail carousel/grid inside the card)
  'card-back-section': function (t, options) {
    return {
      title: 'Gallery Preview',
      icon: ICON_URL,
      content: {
        type: 'iframe',
        url: t.signUrl('./views/card-section.html'),
        height: 140
      }
    };
  },

  // 6. Power-Up Settings
  'show-settings': function (t, options) {
    return t.popup({
      title: 'Gallery Viewer Settings',
      url: './views/settings.html',
      height: 280
    });
  },

  // 7. Authorization Status Check
  'authorization-status': function (t, options) {
    return t.get('member', 'private', 'token')
      .then(function (token) {
        return {
          authorized: typeof token === 'string' && token.length > 0
        };
      });
  },

  // 8. Show Authorization Modal / Popup
  'show-authorization': function (t, options) {
    return t.popup({
      title: 'Authorize Gallery Viewer',
      url: './views/auth.html',
      height: 200
    });
  }
});

