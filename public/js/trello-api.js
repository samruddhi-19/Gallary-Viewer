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

  // Clean filename and ensure valid image extension
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

  // Strategy 0: Handle Data URLs directly
  if (url.startsWith('data:')) {
    try {
      const parts = url.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      triggerBlobDownload(blob, safeFilename);
      return true;
    } catch (e) {
      console.warn('Data URL parsing failed:', e);
    }
  }

  // Strategy 1: Server proxy download (guarantees attachment header & bypasses browser CORS)
  try {
    const proxyUrl = `${window.location.origin}/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(safeFilename)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const blob = await response.blob();
      triggerBlobDownload(blob, safeFilename);
      return true;
    }
  } catch (e) {
    console.warn('Server proxy fetch failed, trying direct fetch / canvas:', e);
  }

  // Strategy 2: Direct fetch with CORS
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

  // Strategy 3: HTML5 Canvas Blob conversion
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
    console.warn('Canvas download fallback failed:', e);
  }

  // Strategy 4: Silent iframe trigger to proxy URL (triggers download dialog without opening new tab)
  try {
    const proxyUrl = `${window.location.origin}/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(safeFilename)}`;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = proxyUrl;
    document.body.appendChild(iframe);
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 10000);
    return true;
  } catch (e) {
    console.warn('Iframe download trigger failed:', e);
  }

  // Strategy 5: Direct anchor click (no target="_blank" to prevent opening in a new tab)
  const fallbackLink = document.createElement('a');
  fallbackLink.style.display = 'none';
  fallbackLink.href = url;
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

