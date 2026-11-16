import { describe, expect, it } from 'vitest';
import { normalizeClipboardText, previewClipboardText } from '../utils/clipboard';

describe('normalizeClipboardText', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeClipboardText('  hello\n\tworld  ')).toBe('hello world');
  });

  it('returns an empty string for whitespace only', () => {
    expect(normalizeClipboardText(' \n\t ')).toBe('');
  });

  it('keeps Japanese and emoji', () => {
    expect(normalizeClipboardText(' 猫 😀 ')).toBe('猫 😀');
  });

  it('caps long text without splitting surrogate pairs', () => {
    const value = normalizeClipboardText('😀'.repeat(2500));
    expect([...value]).toHaveLength(2000);
    expect(value.endsWith('😀')).toBe(true);
  });
});

describe('previewClipboardText', () => {
  it('returns short text unchanged', () => {
    expect(previewClipboardText('hello')).toBe('hello');
  });

  it('shortens long text with an ellipsis', () => {
    const preview = previewClipboardText('a'.repeat(200));
    expect([...preview]).toHaveLength(161);
    expect(preview.endsWith('…')).toBe(true);
  });
});
