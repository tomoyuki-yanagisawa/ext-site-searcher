import { browser } from 'wxt/browser';

const STORAGE_KEY = 'sites';
const QUERY_PLACEHOLDER = '{query}';
const TEST_QUERY = 'test';

const form = document.querySelector('#site-form');
const sitesContainer = document.querySelector('#sites');
const addButton = document.querySelector('#add');
const message = document.querySelector('#message');

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
}

function createRow(site = { name: '', url: '' }) {
  const row = document.createElement('div');
  row.className = 'site-row';

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

function appendRow(site) {
  const row = createRow(site);
  sitesContainer.append(row);
  return row;
}

function validateSite(site) {
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

  let parsedUrl;
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

async function loadSites() {
  const { [STORAGE_KEY]: sites } = await browser.storage.local.get(STORAGE_KEY);
  const list = Array.isArray(sites) ? sites : [];

  sitesContainer.replaceChildren();
  list.forEach(appendRow);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const rows = [...sitesContainer.querySelectorAll('.site-row')];
  const sites = [];

  for (const [index, row] of rows.entries()) {
    const nameInput = row.querySelector('input[name="name"]');
    const urlInput = row.querySelector('input[name="url"]');
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
    showMessage(`保存に失敗しました: ${error.message}`, true);
  }
});

addButton.addEventListener('click', () => {
  showMessage('');
  appendRow().querySelector('input').focus();
});

sitesContainer.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action="delete"]');
  if (!button) {
    return;
  }

  button.closest('.site-row').remove();
  showMessage('');
});

loadSites().catch((error) => {
  showMessage(`設定の読み込みに失敗しました: ${error.message}`, true);
});
