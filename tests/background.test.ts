import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Menu = { id: string; title?: string };
type Click = (info: { menuItemId: string | number; selectionText?: string }, tab?: { id?: number; index: number; windowId: number }) => Promise<void>;

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
    const background = await import('../src/entrypoints/background');
    background.default.main();
    await startup();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock('wxt/browser');
  });

  function menuId(name: string): string {
    const menu = menus.find((item) => item.title === name);
    if (!menu) throw new Error(`Missing menu ${name}`);
    return menu.id;
  }

  it('uses translated messages for built-in menu titles', () => {
    expect(menuId('menuSearch')).toBe('site-search');
    expect(menuId('menuSettings')).toBe('site-search-options');
  });

  it('opens the selected site to the right in the source window', async () => {
    await click({ menuItemId: menuId('Google'), selectionText: '猫 & 犬' }, { id: 5, index: 2, windowId: 8 });
    expect(createTab).toHaveBeenCalledWith({ url: 'https://google.com/search?q=%E7%8C%AB%20%26%20%E7%8A%AC', index: 3, windowId: 8 });
    expect(updateTab).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the original text when enabled', async () => {
    copyQuery = true;
    await click({ menuItemId: menuId('Google'), selectionText: '猫 & 犬' }, { id: 5, index: 2, windowId: 8 });
    expect(writeText).toHaveBeenCalledWith('猫 & 犬');
    expect(createTab).toHaveBeenCalledOnce();
  });

  it('still searches when copying fails', async () => {
    copyQuery = true;
    writeText.mockRejectedValue(new Error('clipboard unavailable'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await click({ menuItemId: menuId('Google'), selectionText: 'test' }, { id: 5, index: 2, windowId: 8 });
      expect(createTab).toHaveBeenCalledWith({ url: 'https://google.com/search?q=test', index: 3, windowId: 8 });
      expect(log).toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it('opens in the current tab when configured', async () => {
    openIn = 'currentTab';
    await click({ menuItemId: menuId('Other'), selectionText: 'test' }, { id: 5, index: 2, windowId: 8 });
    expect(updateTab).toHaveBeenCalledWith(5, { url: 'https://example.com/?q=test' });
    expect(createTab).not.toHaveBeenCalled();
  });

  it('falls back to creating a tab when the source tab has no ID', async () => {
    openIn = 'currentTab';
    await click({ menuItemId: menuId('Google'), selectionText: 'test' }, { index: 2, windowId: 8 });
    expect(createTab).toHaveBeenCalledWith({ url: 'https://google.com/search?q=test', index: 3, windowId: 8 });
    expect(updateTab).not.toHaveBeenCalled();
  });

  it('opens options and ignores invalid clicks', async () => {
    await click({ menuItemId: 'site-search-options' });
    await click({ menuItemId: 'site-index-0-%broken', selectionText: 'test' });
    await click({ menuItemId: menuId('Google') });
    expect(openOptions).toHaveBeenCalledOnce();
    expect(createTab).not.toHaveBeenCalled();
  });

  it('does not open a different site when an old menu is clicked after deletion', async () => {
    const staleId = menuId('Google');
    sites = [other];
    changed({ sites: {} }, 'local');
    await click({ menuItemId: staleId, selectionText: 'test' }, { id: 5, index: 2, windowId: 8 });
    expect(createTab).not.toHaveBeenCalled();
    await startup();
    expect(menuId('Other')).toBeTruthy();
  });

  it('keeps the same target when sites are reordered before a click', async () => {
    const staleId = menuId('Google');
    sites = [other, google];
    changed({ sites: {} }, 'local');
    await click({ menuItemId: staleId, selectionText: 'test' }, { id: 5, index: 2, windowId: 8 });
    expect(createTab).toHaveBeenCalledWith({ url: 'https://google.com/search?q=test', index: 3, windowId: 8 });
    await startup();
  });

  it('ignores an old menu when its URL has been edited', async () => {
    const staleId = menuId('Google');
    sites = [{ ...google, url: 'https://example.com/?q={query}' }, other];
    changed({ sites: {} }, 'local');
    await click({ menuItemId: staleId, selectionText: 'test' });
    expect(createTab).not.toHaveBeenCalled();
    await startup();
  });
});
