/**
 * Utility functions for filtering and handling Trello attachments
 */

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif'];

/**
 * Checks if an attachment is an image based on mimeType or file extension
 */
function isImageAttachment(attachment) {
  if (!attachment) return false;
  if (attachment.mimeType && attachment.mimeType.toLowerCase().startsWith('image/')) {
    return true;
  }
  const name = (attachment.name || '').toLowerCase();
  const url = (attachment.url || '').toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => 
    name.endsWith(ext) || 
    url.endsWith(ext) || 
    url.includes(ext + '?') || 
    url.includes(ext + '#') || 
    url.includes(ext + '&')
  );
}

/**
 * Normalizes an attachment object into a standard Gallery item
 */
function normalizeAttachment(attachment, cardContext = null) {
  return {
    id: attachment.id,
    name: attachment.name || 'Untitled Image',
    url: attachment.url,
    previews: attachment.previews || [],
    mimeType: attachment.mimeType,
    cardId: cardContext ? cardContext.id : null,
    cardName: cardContext ? cardContext.name : null,
    listName: cardContext ? cardContext.listName : null,
    date: attachment.date
  };
}

/**
 * Extracts all image attachments from a Trello Card object
 */
function getImageAttachmentsFromCard(card) {
  if (!card || !card.attachments) return [];
  return card.attachments
    .filter(isImageAttachment)
    .map(att => normalizeAttachment(att, card));
}

/**
 * Triggers a real browser file download for an image URL across origins
 * Uses Blob object URL to ensure the browser saves the file instead of opening it in a tab.
 */
async function downloadImage(url, filename = 'image') {
  if (!url) return false;

  // Clean filename and ensure extension
  let safeFilename = (filename || 'image').trim();
  if (!/\.[a-zA-Z0-9]{2,5}$/.test(safeFilename)) {
    const match = url.match(/\.([a-zA-Z0-9]{3,4})(?:\?|#|$)/i);
    safeFilename += match ? '.' + match[1] : '.png';
  }

  function triggerBlobDownload(blob, name) {
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = blobUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 2000);
  }

  // Strategy 1: Direct fetch with CORS to create a Blob
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (response.ok) {
      const blob = await response.blob();
      triggerBlobDownload(blob, safeFilename);
      return true;
    }
  } catch (e) {
    console.warn('Direct fetch download failed, trying canvas fallback:', e);
  }

  // Strategy 2: HTML5 Canvas Blob fallback
  try {
    const blob = await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = function () {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          let mime = 'image/png';
          if (/\.jpe?g$/i.test(safeFilename)) mime = 'image/jpeg';
          else if (/\.webp$/i.test(safeFilename)) mime = 'image/webp';

          canvas.toBlob(b => {
            if (b) resolve(b);
            else reject(new Error('Canvas blob conversion failed'));
          }, mime);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = reject;
      img.src = url;
    });

    triggerBlobDownload(blob, safeFilename);
    return true;
  } catch (e) {
    console.warn('Canvas download fallback failed, trying proxy or fallback link:', e);
  }

  // Strategy 3: Server proxy endpoint (if hosted with backend)
  try {
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(safeFilename)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const blob = await response.blob();
      triggerBlobDownload(blob, safeFilename);
      return true;
    }
  } catch (e) {
    console.warn('Server proxy download failed:', e);
  }

  // Strategy 4: Fallback - standard download anchor / open
  const fallbackLink = document.createElement('a');
  fallbackLink.href = url;
  fallbackLink.target = '_blank';
  fallbackLink.rel = 'noopener noreferrer';
  fallbackLink.download = safeFilename;
  document.body.appendChild(fallbackLink);
  fallbackLink.click();
  setTimeout(() => {
    document.body.removeChild(fallbackLink);
  }, 1000);
  return false;
}

// Export functions for browser
window.GalleryAPI = {
  isImageAttachment,
  normalizeAttachment,
  getImageAttachmentsFromCard,
  downloadImage
};

