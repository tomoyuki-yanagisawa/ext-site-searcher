import type { Browser } from 'wxt/browser';
import { getSettings, type Site } from '../utils/settings';
import { searchUrl } from '../utils/search-url';

const MENU_ROOT_ID = 'site-search';
const MENU_OPTIONS_ID = 'site-search-options';
const SITE_MENU_PREFIX = 'site-index-';

type MenuItem = Browser.contextMenus.CreateProperties;

let menuUpdateQueue: Promise<void> = Promise.resolve();

function siteIdentity(site: Site): string {
  return encodeURIComponent(JSON.stringify([site.name, site.url]));
}

/**
 * Chrome・Firefoxとも `contextMenus.create` はPromiseを返さず、
 * 失敗はコールバック内の `runtime.lastError` で通知される。
 */
function createMenuItem(item: MenuItem): Promise<void> {
  return new Promise((resolve, reject) => {
    browser.contextMenus.create(item, () => {
      const error = browser.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
      } else {
        resolve();
      }
    });
  });
}

async function rebuildMenus(): Promise<void> {
  const { sites } = await getSettings();

  await browser.contextMenus.removeAll();
  await createMenuItem({
    id: MENU_ROOT_ID,
    title: browser.i18n.getMessage('menuSearch'),
    contexts: ['selection'],
  });

  for (const [index, site] of sites.entries()) {
    await createMenuItem({
      id: `${SITE_MENU_PREFIX}${index}-${siteIdentity(site)}`,
      parentId: MENU_ROOT_ID,
      title: site.name,
      contexts: ['selection'],
    });
  }

  if (sites.length > 0) {
    await createMenuItem({
      id: `${MENU_ROOT_ID}-separator`,
      parentId: MENU_ROOT_ID,
      type: 'separator',
      contexts: ['selection'],
    });
  }

  await createMenuItem({
    id: MENU_OPTIONS_ID,
    parentId: MENU_ROOT_ID,
    title: browser.i18n.getMessage('menuSettings'),
    contexts: ['selection'],
  });
}

function enqueueMenuUpdate(): Promise<void> {
  menuUpdateQueue = menuUpdateQueue
    .then(rebuildMenus)
    .catch((error) => console.error('Failed to update context menus', error));
  return menuUpdateQueue;
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(enqueueMenuUpdate);
  browser.runtime.onStartup.addListener(enqueueMenuUpdate);

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.sites) {
      enqueueMenuUpdate();
    }
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === MENU_OPTIONS_ID) {
      await browser.runtime.openOptionsPage();
      return;
    }

    if (typeof info.menuItemId !== 'string' || !info.menuItemId.startsWith(SITE_MENU_PREFIX)) {
      return;
    }

    const match = /^\d+-(.+)$/.exec(info.menuItemId.slice(SITE_MENU_PREFIX.length));
    if (!match?.[1]) {
      return;
    }

    const { sites, openIn, copyQuery } = await getSettings();
    const site = sites.find((item) => siteIdentity(item) === match[1]);
    if (!site || !info.selectionText) {
      return;
    }

    const url = searchUrl(site.url, info.selectionText);

    if (copyQuery) {
      try {
        await navigator.clipboard.writeText(info.selectionText);
      } catch (error) {
        console.error('Failed to copy search query', error);
      }
    }

    // Firefox exposes the mouse button for context menu clicks; Chrome does not.
    const background = import.meta.env.BROWSER === 'firefox' && (info as typeof info & { button?: number }).button === 1;
    if (!background && openIn === 'currentTab' && tab?.id !== undefined) {
      await browser.tabs.update(tab.id, { url });
      return;
    }

    // 現在のタブの右隣に開く
    await browser.tabs.create({
      url,
      windowId: tab?.windowId,
      index: tab ? tab.index + 1 : undefined,
      ...(background ? { active: false } : {}),
    });
  });
});
