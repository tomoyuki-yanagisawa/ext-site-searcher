const MAX_QUERY_LENGTH = 2000;
const PREVIEW_LENGTH = 160;

function truncate(text: string, maxLength: number, ellipsis = ''): string {
  const chars = [...text];
  return chars.length > maxLength ? `${chars.slice(0, maxLength).join('')}${ellipsis}` : text;
}

export function normalizeClipboardText(text: string): string {
  return truncate(text.replace(/\s+/g, ' ').trim(), MAX_QUERY_LENGTH);
}

export function previewClipboardText(text: string): string {
  return truncate(text, PREVIEW_LENGTH, '…');
}
