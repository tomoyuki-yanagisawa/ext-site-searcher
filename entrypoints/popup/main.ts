import { browser, type Browser } from 'wxt/browser';
import { getSettings, type OpenIn, type Site } from '../../utils/settings';
import { searchUrl } from '../../utils/search-url';
import { getMessage, localize } from '../../utils/i18n';
import { normalizeClipboardText, previewClipboardText } from '../../utils/clipboard';
import { openSearch } from '../../utils/open-search';
import { requiredElement } from '../../utils/dom';
import './style.css';

const closeButton = requiredElement<HTMLButtonElement>(document, '#close');
const settingsButton = requiredElement<HTMLButtonElement>(document, '#settings');
const preview = requiredElement<HTMLElement>(document, '#preview');
const empty = requiredElement<HTMLElement>(document, '#empty');
const siteList = requiredElement<HTMLUListElement>(document, '#sites');
const separator = requiredElement<HTMLHRElement>(document, '#separator');
const retry = requiredElement<HTMLElement>(document, '#retry');
const retryButton = requiredElement<HTMLButtonElement>(document, '#retry-button');

localize(document);

function showEmpty(messageKey: 'popupEmpty' | 'popupReadFailed' | 'popupNoSites'): void {
  preview.hidden = true;
  siteList.hidden = true;
  separator.hidden = false;
  empty.textContent = getMessage(messageKey);
  empty.toggleAttribute('data-error', messageKey === 'popupReadFailed');
  empty.hidden = false;
  retry.hidden = messageKey !== 'popupReadFailed';
}

function showSites(sites: Site[], query: string, openIn: OpenIn, tab?: Browser.tabs.Tab): void {
  preview.textContent = previewClipboardText(query);
  preview.hidden = false;
  empty.hidden = true;
  retry.hidden = true;
  separator.hidden = false;
  siteList.hidden = false;
  siteList.replaceChildren();

  for (const site of sites) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = site.name;
    button.addEventListener('click', async () => {
      try {
        await openSearch(searchUrl(site.url, query), openIn, false, tab);
      } catch (error) {
        console.error('Failed to open search', error);
        return;
      }
      window.close();
    });
    item.append(button);
    siteList.append(item);
  }
}

async function readClipboard(): Promise<string> {
  if (!document.hasFocus()) {
    window.focus();
    await new Promise<void>((resolve) => {
      const done = () => {
        window.removeEventListener('focus', done);
        resolve();
      };
      window.addEventListener('focus', done);
      setTimeout(done, 500);
    });
  }
  return navigator.clipboard.readText();
}

async function initialize(): Promise<void> {
  preview.hidden = true;
  empty.hidden = true;
  retry.hidden = true;
  siteList.hidden = true;
  separator.hidden = true;

  const { sites, openIn } = await getSettings();

  if (sites.length === 0) {
    showEmpty('popupNoSites');
    return;
  }

  let text: string;
  try {
    text = await readClipboard();
  } catch (error) {
    console.error('Failed to read clipboard', error);
    showEmpty('popupReadFailed');
    return;
  }

  const query = normalizeClipboardText(text);
  if (!query) {
    showEmpty('popupEmpty');
    return;
  }

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  showSites(sites, query, openIn, tab);
}

closeButton.addEventListener('click', () => window.close());
settingsButton.addEventListener('click', async () => {
  try {
    await browser.runtime.openOptionsPage();
  } catch (error) {
    console.error('Failed to open options', error);
    return;
  }
  window.close();
});

function runInitialize(): void {
  initialize().catch((error: unknown) => {
    console.error('Failed to initialize popup', error);
    showEmpty('popupReadFailed');
  });
}

retryButton.addEventListener('click', runInitialize);
runInitialize();
