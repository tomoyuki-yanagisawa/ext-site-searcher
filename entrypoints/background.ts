import { browser, type Browser } from 'wxt/browser';
import { getSettings, type Site } from '../utils/settings';
import { searchUrl } from '../utils/search-url';
import { getMessage } from '../utils/i18n';
import { openSearch } from '../utils/open-search';

// ビルド対象ブラウザに基づく機能対応。ブラウザ名ではなく、提供される機能で分岐する。
// いずれも Firefox のみが提供する。
const supportsLinkText = import.meta.env.BROWSER === 'firefox';
const supportsMenuClickButton = import.meta.env.BROWSER === 'firefox';

const MENU_ROOT_PREFIX = 'site-search-';
const MENU_OPTIONS_SUFFIX = '-options';
const SITE_MENU_PREFIX = 'site-index-';
const SITE_MENU_PATTERN = /^site-index-(selection|link)-(\d+)$/;

const MENU_TITLES = {
  selection: 'menuSearchSelection',
  link: 'menuSearchLink',
} as const;

type MenuItem = Browser.contextMenus.CreateProperties;
type MenuContext = keyof typeof MENU_TITLES;
type FirefoxClickInfo = Browser.contextMenus.OnClickData & {
  /** Firefox のみ */
  linkText?: string;
  /** Firefox のみ */
  button?: number;
};

let menuUpdateQueue: Promise<void> = Promise.resolve();

function parseSiteMenuId(menuId: string | number): { context: MenuContext; index: number } | undefined {
  if (typeof menuId !== 'string') return;
  const match = SITE_MENU_PATTERN.exec(menuId);
  if (!match) return;
  return { context: match[1] === 'link' ? 'link' : 'selection', index: Number(match[2]) };
}

function isOptionsMenuId(menuId: string | number): boolean {
  return typeof menuId === 'string' && menuId.endsWith(MENU_OPTIONS_SUFFIX);
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

/**
 * `selection` のタイトルは `%s` を含み、選択文字列がブラウザ側で埋め込まれる。
 */
async function createSiteMenu(context: MenuContext, sites: Site[]): Promise<void> {
  const rootId = `${MENU_ROOT_PREFIX}${context}`;
  const contexts: MenuItem['contexts'] = [context];

  await createMenuItem({
    id: rootId,
    title: getMessage(MENU_TITLES[context]),
    contexts,
  });

  for (const [index, site] of sites.entries()) {
    await createMenuItem({
      id: `${SITE_MENU_PREFIX}${context}-${index}`,
      parentId: rootId,
      title: site.name,
      contexts,
    });
  }

  if (sites.length > 0) {
    await createMenuItem({
      id: `${rootId}-separator`,
      parentId: rootId,
      type: 'separator',
      contexts,
    });
  }

  await createMenuItem({
    id: `${rootId}${MENU_OPTIONS_SUFFIX}`,
    parentId: rootId,
    title: getMessage('menuSettings'),
    contexts,
  });
}

async function rebuildMenus(): Promise<void> {
  const { sites } = await getSettings();

  await browser.contextMenus.removeAll();
  await createSiteMenu('selection', sites);

  if (supportsLinkText) {
    await createSiteMenu('link', sites);
  }
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
    if (isOptionsMenuId(info.menuItemId)) {
      await browser.runtime.openOptionsPage();
      return;
    }

    const target = parseSiteMenuId(info.menuItemId);
    if (!target) {
      return;
    }

    const { sites, openIn, copyQuery } = await getSettings();
    const site = sites[target.index];
    const firefoxInfo = info as FirefoxClickInfo;
    const query = target.context === 'link' ? firefoxInfo.linkText : info.selectionText;
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

    const middleClick = supportsMenuClickButton && firefoxInfo.button === 1;
    await openSearch(url, openIn, middleClick, tab);
  });
});
