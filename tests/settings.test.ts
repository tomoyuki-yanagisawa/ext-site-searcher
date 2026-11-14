import { describe, expect, it, vi } from 'vitest';

vi.mock('wxt/browser', () => ({ browser: {} }));

import { normalizeSettings } from '../src/utils/settings';

describe('normalizeSettings', () => {
  it('uses defaults for missing or invalid values', () => {
    expect(normalizeSettings({ sites: null, openIn: 'other', copyQuery: 'true' })).toEqual({ sites: [], openIn: 'newTab', copyQuery: false });
    expect(normalizeSettings({})).toEqual({ sites: [], openIn: 'newTab', copyQuery: false });
  });

  it('keeps valid sites and the current-tab setting', () => {
    const site = { name: 'Example', url: 'https://example.com/?q={query}' };
    expect(normalizeSettings({ sites: [site, null, { name: 1 }, 'bad'], openIn: 'currentTab', copyQuery: true }))
      .toEqual({ sites: [site], openIn: 'currentTab', copyQuery: true });
  });

  it('keeps the background-tab setting', () => {
    expect(normalizeSettings({ openIn: 'backgroundTab' }).openIn).toBe('backgroundTab');
  });
});
