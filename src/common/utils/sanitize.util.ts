// src/common/utils/sanitize.util.ts

/**
 * Escapes HTML special characters in a string to prevent XSS.
 * Converts <, >, &, ', ", / to their HTML entities.
 */
export function escapeHtml(value: string): string {
  if (typeof value !== 'string') return value;
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
    .replace(/\//g, '&#x2F;');
}
