import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Menu = { id: string; title?: string; contexts?: string[] };
type Click = (info: { menuItemId: string | number; selectionText?: string; linkText?: string; button?: number }, tab?: { id?: number; index: number; windowId: number }) => Promise<void>;

const google = { name: 'Google', url: 'https://google.com/search?q={query}' };
const other = { name: 'Other', url: 'https://example.com/?q={query}' };

describe('background menus', () => {
  let sites: typeof google[];
  let openIn: string;
  let copyQuery: boolean;
  let menus: Menu[];
  let click: Click;
  let changed: (changes: object, area: string) => void;
  let startup: () => Promise<void>;
  let createTab: ReturnType<typeof vi.fn>;
  let updateTab: ReturnType<typeof vi.fn>;
  let openOptions: ReturnType<typeof vi.fn>;
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('BROWSER', 'firefox');
    sites = [google, other];
    openIn = 'newTab';
    copyQuery = false;
    menus = [];
    createTab = vi.fn().mockResolvedValue(undefined);
    updateTab = vi.fn().mockResolvedValue(undefined);
    openOptions = vi.fn().mockResolvedValue(undefined);
    writeText = vi.fn().mockResolvedValue(undefined);
    const browser = {
      i18n: { getMessage: (key: string) => key },
      storage: {
        local: { get: vi.fn(async () => ({ sites, openIn, copyQuery })) },
        onChanged: { addListener: (listener: typeof changed) => { changed = listener; } },
      },
      runtime: {
        lastError: undefined,
        onInstalled: { addListener: (listener: typeof startup) => { startup = listener; } },
        onStartup: { addListener: vi.fn() },
        openOptionsPage: openOptions,
      },
      contextMenus: {
        removeAll: vi.fn(async () => { menus = []; }),
        create: vi.fn((item: Menu, callback: () => void) => { menus.push(item); callback(); }),
        onClicked: { addListener: (listener: Click) => { click = listener; } },
      },
      tabs: { create: createTab, update: updateTab },
    };
    vi.stubGlobal('browser', browser);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.stubGlobal('defineBackground', (callback: () => void) => ({ main: callback }));
    vi.doMock('wxt/browser', () => ({ browser }));
    await startBrowser('firefox');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.doUnmock('wxt/browser');
  });

  function menuId(title: string): string {
    const menu = menus.find((item) => item.title === title);
    if (!menu) throw new Error(`Missing menu ${title}`);
    return menu.id;
  }

  function siteMenuId(name: string, context: 'selection' | 'link'): string {
    const menu = menus.find((item) => item.title === name && item.id.startsWith(`site-index-${context}-`));
    if (!menu) throw new Error(`Missing ${context} site menu ${name}`);
    return menu.id;
  }

  async function startBrowser(name: string): Promise<void> {
    vi.stubEnv('BROWSER', name);
    vi.resetModules();
    const background = await import('../entrypoints/background');
    background.default.main();
    await startup();
  }

  it('registers a menu for each context with translated titles', () => {
    expect(menuId('menuSearchSelection')).toBe('site-search-selection');
    expect(menuId('menuSearchLink')).toBe('site-search-link');
    expect(menuId('menuSettings')).toBe('site-search-selection-options');
  });

  it('registers only the selection menu in Chrome', async () => {
    await startBrowser('chrome');
    expect(menus.some((menu) => menu.id === 'site-search-link')).toBe(false);
    expect(menus.every((menu) => menu.contexts?.length === 1 && menu.contexts[0] === 'selection')).toBe(true);
  });

  it('creates distinct menu IDs for duplicate sites', async () => {
    sites = [google, google];
    await startup();
    const ids = menus.filter((menu) => menu.title === 'Google').map((menu) => menu.id);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });

  it('searches with the link text from the link menu and copies it', async () => {
    copyQuery = true;
    await click({ menuItemId: siteMenuId('Google', 'link'), linkText: '猫 & 犬' }, { id: 5, index: 2, windowId: 8 });
    expect(createTab).toHaveBeenCalledWith({ url: 'https://google.com/search?q=%E7%8C%AB%20%26%20%E7%8A%AC', index: 3, windowId: 8 });
    expect(writeText).toHaveBeenCalledWith('猫 & 犬');
  });

  it('searches with the selected text from the selection menu', async () => {
    await click({ menuItemId: siteMenuId('Google', 'selection'), selectionText: 'selected', linkText: 'link' });
    expect(createTab).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://google.com/search?q=selected' }));
  });

  it('opens the selected site to the right in the source window', async () => {
    await click({ menuItemId: siteMenuId('Google', 'selection'), selectionText: '猫 & 犬' }, { id: 5, index: 2, windowId: 8 });
    expect(createTab).toHaveBeenCalledWith({ url: 'https://google.com/search?q=%E7%8C%AB%20%26%20%E7%8A%AC', index: 3, windowId: 8 });
    expect(updateTab).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the original text when enabled', async () => {
    copyQuery = true;
    await click({ menuItemId: siteMenuId('Google', 'selection'), selectionText: '猫 & 犬' }, { id: 5, index: 2, windowId: 8 });
    expect(writeText).toHaveBeenCalledWith('猫 & 犬');
    expect(createTab).toHaveBeenCalledOnce();
  });

  it('still searches when copying fails', async () => {
    copyQuery = true;
    writeText.mockRejectedValue(new Error('clipboard unavailable'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await click({ menuItemId: siteMenuId('Google', 'selection'), selectionText: 'test' }, { id: 5, index: 2, windowId: 8 });
      expect(createTab).toHaveBeenCalledWith({ url: 'https://google.com/search?q=test', index: 3, windowId: 8 });
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it('opens in the current tab when configured', async () => {
    openIn = 'currentTab';
    await click({ menuItemId: siteMenuId('Other', 'selection'), selectionText: 'test' }, { id: 5, index: 2, windowId: 8 });
    expect(updateTab).toHaveBeenCalledWith(5, { url: 'https://example.com/?q=test' });
    expect(createTab).not.toHaveBeenCalled();
  });

  it.each(['firefox', 'chrome'])('opens in a background tab when configured (%s)', async (browserName) => {
    await startBrowser(browserName);
    openIn = 'backgroundTab';
    await click({ menuItemId: siteMenuId('Other', 'selection'), selectionText: 'test' }, { id: 5, index: 2, windowId: 8 });
    expect(createTab).toHaveBeenCalledWith({ url: 'https://example.com/?q=test', index: 3, windowId: 8, active: false });
    expect(updateTab).not.toHaveBeenCalled();
  });

  it('opens Firefox middle clicks in a background tab regardless of the setting', async () => {
    openIn = 'currentTab';
    await click({ menuItemId: siteMenuId('Other', 'selection'), selectionText: 'test', button: 1 }, { id: 5, index: 2, windowId: 8 });
    expect(createTab).toHaveBeenCalledWith({ url: 'https://example.com/?q=test', index: 3, windowId: 8, active: false });
    expect(updateTab).not.toHaveBeenCalled();
  });

  it('does not apply the Firefox shortcut in Chrome', async () => {
    await startBrowser('chrome');
    openIn = 'currentTab';
    await click({ menuItemId: siteMenuId('Other', 'selection'), selectionText: 'test', button: 1 }, { id: 5, index: 2, windowId: 8 });
    expect(updateTab).toHaveBeenCalledWith(5, { url: 'https://example.com/?q=test' });
    expect(createTab).not.toHaveBeenCalled();
  });

  it('falls back to creating a tab when the source tab has no ID', async () => {
    openIn = 'currentTab';
    await click({ menuItemId: siteMenuId('Google', 'selection'), selectionText: 'test' }, { index: 2, windowId: 8 });
    expect(createTab).toHaveBeenCalledWith({ url: 'https://google.com/search?q=test', index: 3, windowId: 8 });
    expect(updateTab).not.toHaveBeenCalled();
  });

  it('opens options and ignores invalid clicks', async () => {
    await click({ menuItemId: 'site-search-selection-options' });
    await click({ menuItemId: 'site-search-link-options' });
    await click({ menuItemId: 'site-index-0-%broken', selectionText: 'test' });
    await click({ menuItemId: siteMenuId('Google', 'selection') });
    expect(openOptions).toHaveBeenCalledTimes(2);
    expect(createTab).not.toHaveBeenCalled();
  });

  it('creates site menus in settings order for each context', () => {
    const selectionIds = menus.filter((menu) => menu.id.startsWith('site-index-selection-')).map((menu) => menu.id);
    const linkIds = menus.filter((menu) => menu.id.startsWith('site-index-link-')).map((menu) => menu.id);
    expect(selectionIds).toEqual(['site-index-selection-0', 'site-index-selection-1']);
    expect(linkIds).toEqual(['site-index-link-0', 'site-index-link-1']);
  });

  it('opens the site at the clicked index from the current settings', async () => {
    const googleId = siteMenuId('Google', 'selection');
    sites = [other, google];
    changed({ sites: {} }, 'local');
    await click({ menuItemId: googleId, selectionText: 'test' }, { id: 5, index: 2, windowId: 8 });
    expect(createTab).toHaveBeenCalledWith({ url: 'https://example.com/?q=test', index: 3, windowId: 8 });
    await startup();
  });

  it('uses the edited URL for the clicked index', async () => {
    sites = [{ ...google, url: 'https://example.com/?q={query}' }, other];
    changed({ sites: {} }, 'local');
    await click({ menuItemId: siteMenuId('Google', 'selection'), selectionText: 'test' });
    expect(createTab).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://example.com/?q=test' }));
    await startup();
  });

  it('ignores a site index that no longer exists', async () => {
    const index = siteMenuId('Other', 'selection');
    sites = [google];
    changed({ sites: {} }, 'local');
    await click({ menuItemId: index, selectionText: 'test' }, { id: 5, index: 2, windowId: 8 });
    expect(createTab).not.toHaveBeenCalled();
    await startup();
  });
});
