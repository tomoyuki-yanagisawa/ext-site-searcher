import { browser, type Browser } from 'wxt/browser';
import type { OpenIn } from './settings';

export async function openSearch(
  url: string,
  openIn: OpenIn,
  middleClick: boolean,
  tab?: Browser.tabs.Tab,
): Promise<void> {
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
