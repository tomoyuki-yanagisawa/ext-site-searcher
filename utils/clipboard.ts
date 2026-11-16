const MAX_QUERY_LENGTH = 2000;
const PREVIEW_LENGTH = 160;

export function normalizeClipboardText(text: string): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const chars = [...normalized];
  return chars.length > MAX_QUERY_LENGTH ? chars.slice(0, MAX_QUERY_LENGTH).join('') : normalized;
}

export function previewClipboardText(text: string): string {
  const chars = [...text];
  return chars.length > PREVIEW_LENGTH ? `${chars.slice(0, PREVIEW_LENGTH).join('')}…` : text;
}
