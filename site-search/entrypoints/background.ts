const MENU_ROOT_ID = 'site-search';
const MENU_OPTIONS_ID = 'site-search-options';
const SITE_MENU_PREFIX = 'site-';

interface Site {
  name: string;
  url: string;
}

let menuUpdateQueue: Promise<void> = Promise.resolve();

async function getSites(): Promise<Site[]> {
  const { sites } = await browser.storage.local.get('sites');
  return Array.isArray(sites) ? sites : [];
}

async function rebuildMenus(): Promise<void> {
  const sites = await getSites();

  await browser.contextMenus.removeAll();
  await browser.contextMenus.create({
    id: MENU_ROOT_ID,
    title: 'サイトで検索',
    contexts: ['selection'],
  });

  for (const [index, site] of sites.entries()) {
    await browser.contextMenus.create({
      id: `${SITE_MENU_PREFIX}${index}`,
      parentId: MENU_ROOT_ID,
      title: site.name,
      contexts: ['selection'],
    });
  }

  if (sites.length > 0) {
    await browser.contextMenus.create({
      id: `${MENU_ROOT_ID}-separator`,
      parentId: MENU_ROOT_ID,
      type: 'separator',
      contexts: ['selection'],
    });
  }

  await browser.contextMenus.create({
    id: MENU_OPTIONS_ID,
    parentId: MENU_ROOT_ID,
    title: '検索サイトを設定…',
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

  browser.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId === MENU_OPTIONS_ID) {
      await browser.runtime.openOptionsPage();
      return;
    }

    if (typeof info.menuItemId !== 'string' || !info.menuItemId.startsWith(SITE_MENU_PREFIX)) {
      return;
    }

    const index = Number(info.menuItemId.slice(SITE_MENU_PREFIX.length));
    const site = (await getSites())[index];
    if (!site || typeof site.url !== 'string' || !info.selectionText) {
      return;
    }

    const url = site.url
      .split('{query}')
      .join(encodeURIComponent(info.selectionText));
    await browser.tabs.create({ url });
  });
});
