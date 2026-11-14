import type { Browser } from 'wxt/browser';
import { getSettings, type OpenIn, type Site } from '../utils/settings';
import { searchUrl } from '../utils/search-url';
import { supportsLinkText, supportsMenuClickButton } from '../utils/feature';

const MENU_ROOT_ID = 'site-search';
const MENU_OPTIONS_ID = 'site-search-options';
const SITE_MENU_PREFIX = 'site-index-';

type MenuItem = Browser.contextMenus.CreateProperties;

let menuUpdateQueue: Promise<void> = Promise.resolve();

function siteIdentity(site: Site): string {
  return encodeURIComponent(JSON.stringify([site.name, site.url]));
}

function siteMenuId(site: Site, index: number): string {
  return `${SITE_MENU_PREFIX}${index}-${siteIdentity(site)}`;
}

function findMenuSite(menuId: string | number, sites: Site[]): Site | undefined {
  if (typeof menuId !== 'string' || !menuId.startsWith(SITE_MENU_PREFIX)) return;
  const match = /^\d+-(.+)$/.exec(menuId.slice(SITE_MENU_PREFIX.length));
  return match ? sites.find((site) => siteIdentity(site) === match[1]) : undefined;
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
  const contexts: MenuItem['contexts'] = supportsLinkText ? ['selection', 'link'] : ['selection'];

  await browser.contextMenus.removeAll();
  await createMenuItem({
    id: MENU_ROOT_ID,
    title: browser.i18n.getMessage('menuSearch'),
    contexts,
  });

  for (const [index, site] of sites.entries()) {
    await createMenuItem({
      id: siteMenuId(site, index),
      parentId: MENU_ROOT_ID,
      title: site.name,
      contexts,
    });
  }

  if (sites.length > 0) {
    await createMenuItem({
      id: `${MENU_ROOT_ID}-separator`,
      parentId: MENU_ROOT_ID,
      type: 'separator',
      contexts,
    });
  }

  await createMenuItem({
    id: MENU_OPTIONS_ID,
    parentId: MENU_ROOT_ID,
    title: browser.i18n.getMessage('menuSettings'),
    contexts,
  });
}

function enqueueMenuUpdate(): Promise<void> {
  menuUpdateQueue = menuUpdateQueue
    .then(rebuildMenus)
    .catch((error) => console.error('Failed to update context menus', error));
  return menuUpdateQueue;
}

async function openSearch(url: string, openIn: OpenIn, middleClick: boolean, tab?: Browser.tabs.Tab): Promise<void> {
  const background = openIn === 'backgroundTab' || middleClick;
  if (!background && openIn === 'currentTab' && tab?.id !== undefined) {
    await browser.tabs.update(tab.id, { url });
  } else {
    await browser.tabs.create({
      url,
      windowId: tab?.windowId,
      index: tab ? tab.index + 1 : undefined,
      ...(background ? { active: false } : {}),
    });
  }
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

    const { sites, openIn, copyQuery } = await getSettings();
    const site = findMenuSite(info.menuItemId, sites);
    const query = info.selectionText || (supportsLinkText ? (info as typeof info & { linkText?: string }).linkText : undefined);
    if (!site || !query) {
      return;
    }

    const url = searchUrl(site.url, query);

    if (copyQuery) {
      try {
        await navigator.clipboard.writeText(query);
      } catch (error) {
        console.error('Failed to copy search query', error);
      }
    }

    const middleClick = supportsMenuClickButton && (info as typeof info & { button?: number }).button === 1;
    await openSearch(url, openIn, middleClick, tab);
  });
});
