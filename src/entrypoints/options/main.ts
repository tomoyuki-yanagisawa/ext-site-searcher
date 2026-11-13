import { getSettings, saveSettings, type Site } from '../../utils/settings';
import { validateSite } from '../../utils/search-url';
import { browser } from 'wxt/browser';
import './style.css';

const form = document.querySelector<HTMLFormElement>('#site-form')!;
const sitesContainer = document.querySelector<HTMLElement>('#sites')!;
const siteRow = document.querySelector<HTMLTemplateElement>('#site-row')!;
const copyQueryInput = document.querySelector<HTMLInputElement>('#copy-query')!;
const emptyState = document.querySelector<HTMLElement>('#empty')!;
const addButton = document.querySelector<HTMLButtonElement>('#add')!;
const message = document.querySelector<HTMLElement>('#message')!;

function translate(root: ParentNode): void {
  type MessageKey = Parameters<typeof browser.i18n.getMessage>[0];
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    element.textContent = browser.i18n.getMessage(element.dataset.i18n as MessageKey);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-label]').forEach((element) => {
    element.setAttribute('aria-label', browser.i18n.getMessage(element.dataset.i18nLabel as MessageKey));
  });
}

document.documentElement.lang = browser.i18n.getUILanguage().toLowerCase().startsWith('ja') ? 'ja' : 'en';
translate(document);
translate(siteRow.content);

function updateEmptyState(): void {
  emptyState.hidden = sitesContainer.querySelector('li') !== null;
}

function showMessage(text: string, isError = false): void {
  message.textContent = text;
  message.toggleAttribute('data-error', isError);
}

function createRow(site: Site = { name: '', url: '' }): HTMLLIElement {
  const row = siteRow.content.firstElementChild!.cloneNode(true) as HTMLLIElement;
  row.querySelector<HTMLInputElement>('input[name="name"]')!.value = site.name;
  row.querySelector<HTMLInputElement>('input[name="url"]')!.value = site.url;
  return row;
}

function appendRow(site?: Site): HTMLLIElement {
  const row = createRow(site);
  sitesContainer.append(row);
  return row;
}

async function loadSettings(): Promise<void> {
  const { sites, openIn, copyQuery } = await getSettings();
  copyQueryInput.checked = copyQuery;
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
      showMessage(browser.i18n.getMessage('rowError', [String(index + 1), browser.i18n.getMessage(error)]), true);
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
    await saveSettings({ sites, openIn, copyQuery: copyQueryInput.checked });
    showMessage(browser.i18n.getMessage('saved'));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    showMessage(browser.i18n.getMessage('saveFailed', detail), true);
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
  showMessage(browser.i18n.getMessage('loadFailed', detail), true);
});
