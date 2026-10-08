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

// Export functions for browser
window.GalleryAPI = {
  isImageAttachment,
  normalizeAttachment,
  getImageAttachmentsFromCard
};
