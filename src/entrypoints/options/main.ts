import { browser } from 'wxt/browser';
import './style.css';

const STORAGE_KEY = 'sites';
const QUERY_PLACEHOLDER = '{query}';
const TEST_QUERY = 'test';

interface Site {
  name: string;
  url: string;
}

function isSite(value: unknown): value is Site {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const site = value as Record<string, unknown>;
  return typeof site.name === 'string' && typeof site.url === 'string';
}

const form = document.querySelector<HTMLFormElement>('#site-form')!;
const sitesContainer = document.querySelector<HTMLElement>('#sites')!;
const emptyState = document.querySelector<HTMLElement>('#empty')!;
const addButton = document.querySelector<HTMLButtonElement>('#add')!;
const message = document.querySelector<HTMLElement>('#message')!;

function updateEmptyState(): void {
  emptyState.hidden = sitesContainer.querySelector('li') !== null;
}

function showMessage(text: string, isError = false): void {
  message.textContent = text;
  if (isError) {
    message.setAttribute('data-error', '');
  } else {
    message.removeAttribute('data-error');
  }
}

function createRow(site: Site = { name: '', url: '' }): HTMLLIElement {
  const row = document.createElement('li');

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.name = 'name';
  nameInput.value = site.name;
  nameInput.placeholder = 'Google';
  nameInput.setAttribute('aria-label', '名前');

  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.name = 'url';
  urlInput.value = site.url;
  urlInput.placeholder = 'https://www.google.com/search?q={query}';
  urlInput.setAttribute('aria-label', '検索URL');

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.dataset.action = 'delete';
  deleteButton.textContent = '削除';
  deleteButton.setAttribute('aria-label', '削除');

  row.append(nameInput, urlInput, deleteButton);
  return row;
}

function appendRow(site?: Site): HTMLLIElement {
  const row = createRow(site);
  sitesContainer.append(row);
  return row;
}

function validateSite(site: Site): string | null {
  const name = site.name.trim();
  const url = site.url.trim();

  if (!name) {
    return '名前を入力してください。';
  }
  if (!url) {
    return '検索URLを入力してください。';
  }
  if (!url.includes(QUERY_PLACEHOLDER)) {
    return `検索URLには ${QUERY_PLACEHOLDER} を含めてください。`;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(
      url.split(QUERY_PLACEHOLDER).join(encodeURIComponent(TEST_QUERY)),
    );
  } catch {
    return '検索URLの形式が正しくありません。';
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return '検索URLは http:// または https:// で始めてください。';
  }

  return null;
}

async function loadSites(): Promise<void> {
  const { [STORAGE_KEY]: sites } = await browser.storage.local.get(STORAGE_KEY);
  const list = Array.isArray(sites) ? sites.filter(isSite) : [];

  sitesContainer.replaceChildren();
  list.forEach((site) => appendRow(site));
  updateEmptyState();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const rows = [...sitesContainer.querySelectorAll('li')];
  const sites: Site[] = [];

  for (const [index, row] of rows.entries()) {
    const nameInput = row.querySelector<HTMLInputElement>('input[name="name"]')!;
    const urlInput = row.querySelector<HTMLInputElement>('input[name="url"]')!;
    const site = { name: nameInput.value, url: urlInput.value };
    const error = validateSite(site);

    if (error) {
      showMessage(`${index + 1}件目: ${error}`, true);
      (nameInput.value.trim() ? urlInput : nameInput).focus();
      return;
    }

    sites.push({ name: site.name.trim(), url: site.url.trim() });
  }

  try {
    await browser.storage.local.set({ [STORAGE_KEY]: sites });
    showMessage('保存しました。');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    showMessage(`保存に失敗しました: ${detail}`, true);
  }
});

addButton.addEventListener('click', () => {
  showMessage('');
  appendRow().querySelector('input')?.focus();
  updateEmptyState();
});

sitesContainer.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const button = event.target.closest('button[data-action="delete"]');
  if (!button) {
    return;
  }

  button.closest('li')?.remove();
  showMessage('');
  updateEmptyState();
});

loadSites().catch((error: unknown) => {
  const detail = error instanceof Error ? error.message : String(error);
  showMessage(`設定の読み込みに失敗しました: ${detail}`, true);
});
