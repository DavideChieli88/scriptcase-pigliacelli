/** Escape text for safe textContent assignment helpers. Prefer textContent over innerHTML. */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strip tags from untrusted HTML strings coming from parsers.
 * Does not execute scripts; returns plain text only.
 */
export function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.textContent = html;
  // If parsers pass markup, parse as text nodes only via DOMParser + text extraction
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  } catch {
    return tmp.textContent || '';
  }
}

/** Never assign untrusted markup via innerHTML — use this for text nodes. */
export function setText(el: HTMLElement, text: string): void {
  el.textContent = text;
}
