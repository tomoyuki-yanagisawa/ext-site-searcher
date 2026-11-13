import { getSettings, saveSettings, type Site } from '../../utils/settings';
import { validateSite } from '../../utils/search-url';
import './style.css';

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

async function loadSettings(): Promise<void> {
  const { sites, openIn } = await getSettings();
  const openInInput = form.querySelector<HTMLInputElement>(
    `input[name="openIn"][value="${openIn}"]`,
  );
  if (openInInput) {
    openInInput.checked = true;
  }

  sitesContainer.replaceChildren();
  sites.forEach((site) => appendRow(site));
  updateEmptyState();
  form.inert = false;
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
    const openInSelected = form.querySelector<HTMLInputElement>(
      'input[name="openIn"]:checked',
    );
    const openIn = openInSelected?.value === 'currentTab' ? 'currentTab' : 'newTab';
    await saveSettings({ sites, openIn });
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

loadSettings().catch((error: unknown) => {
  form.querySelectorAll('input, button').forEach((element) => {
    (element as HTMLInputElement | HTMLButtonElement).disabled = true;
  });
  form.inert = false;
  const detail = error instanceof Error ? error.message : String(error);
  showMessage(`設定の読み込みに失敗しました: ${detail}`, true);
});
