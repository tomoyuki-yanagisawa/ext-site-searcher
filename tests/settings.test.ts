import { describe, expect, it, vi } from 'vitest';

vi.mock('wxt/browser', () => ({ browser: {} }));

import { normalizeSettings } from '../src/utils/settings';

describe('normalizeSettings', () => {
  it('uses defaults for missing or invalid values', () => {
    expect(normalizeSettings({ sites: null, openIn: 'other' })).toEqual({ sites: [], openIn: 'newTab' });
    expect(normalizeSettings({})).toEqual({ sites: [], openIn: 'newTab' });
  });

  it('keeps valid sites and the current-tab setting', () => {
    const site = { name: 'Example', url: 'https://example.com/?q={query}' };
    expect(normalizeSettings({ sites: [site, null, { name: 1 }, 'bad'], openIn: 'currentTab' }))
      .toEqual({ sites: [site], openIn: 'currentTab' });
  });
});
