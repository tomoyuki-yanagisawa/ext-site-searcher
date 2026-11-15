import { getSettings, normalizeOpenIn, saveSettings, type Site } from '../../utils/settings';
import { validateSite } from '../../utils/search-url';
import { browser } from 'wxt/browser';
import './style.css';

function requiredElement<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }
  return element;
}

const form = requiredElement<HTMLFormElement>(document, '#site-form');
const sitesContainer = requiredElement<HTMLElement>(document, '#sites');
const siteRow = requiredElement<HTMLTemplateElement>(document, '#site-row');
const copyQueryInput = requiredElement<HTMLInputElement>(document, '#copy-query');
const emptyState = requiredElement<HTMLElement>(document, '#empty');
const addButton = requiredElement<HTMLButtonElement>(document, '#add');
const saveButton = requiredElement<HTMLButtonElement>(document, '#save');
const message = requiredElement<HTMLElement>(document, '#message');

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

function updateRowState(): void {
  const rows = [...sitesContainer.querySelectorAll('li')];
  emptyState.hidden = rows.length > 0;
  rows.forEach((row, index) => {
    requiredElement<HTMLButtonElement>(row, '[data-action="move-up"]').disabled = index === 0;
    requiredElement<HTMLButtonElement>(row, '[data-action="move-down"]').disabled = index === rows.length - 1;
  });
}

function showMessage(text: string, isError = false): void {
  message.textContent = text;
  message.toggleAttribute('data-error', isError);
}

function setDirty(dirty: boolean): void {
  saveButton.disabled = !dirty;
}

function appendRow(site: Site = { name: '', url: '' }): HTMLLIElement {
  const row = siteRow.content.firstElementChild?.cloneNode(true);
  if (!(row instanceof HTMLLIElement)) {
    throw new Error('site-row template is missing');
  }
  requiredElement<HTMLInputElement>(row, 'input[name="name"]').value = site.name;
  requiredElement<HTMLInputElement>(row, 'input[name="url"]').value = site.url;
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
  updateRowState();
  setDirty(false);
  form.inert = false;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const rows = [...sitesContainer.querySelectorAll('li')];
  const sites: Site[] = [];

  for (const [index, row] of rows.entries()) {
    const nameInput = requiredElement<HTMLInputElement>(row, 'input[name="name"]');
    const urlInput = requiredElement<HTMLInputElement>(row, 'input[name="url"]');
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
    const openIn = normalizeOpenIn(openInSelected?.value);
    await saveSettings({ sites, openIn, copyQuery: copyQueryInput.checked });
    setDirty(false);
    showMessage(browser.i18n.getMessage('saved'));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    showMessage(browser.i18n.getMessage('saveFailed', detail), true);
  }
});

addButton.addEventListener('click', () => {
  showMessage('');
  appendRow().querySelector('input')?.focus();
  updateRowState();
  setDirty(true);
});

sitesContainer.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const button = event.target.closest('button[data-action]');
  const row = button?.closest('li');
  if (!(button instanceof HTMLButtonElement) || !(row instanceof HTMLLIElement)) {
    return;
  }

  if (button.dataset.action === 'delete') {
    row.remove();
  } else {
    const up = button.dataset.action === 'move-up';
    const sibling = up ? row.previousElementSibling : row.nextElementSibling;
    if (!(sibling instanceof HTMLLIElement)) {
      return;
    }
    if (up) {
      sibling.before(row);
    } else {
      sibling.after(row);
    }
  }

  showMessage('');
  updateRowState();
  setDirty(true);
});

form.addEventListener('input', () => setDirty(true));

loadSettings().catch((error: unknown) => {
  form.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button').forEach((element) => {
    element.disabled = true;
  });
  form.inert = false;
  const detail = error instanceof Error ? error.message : String(error);
  showMessage(browser.i18n.getMessage('loadFailed', detail), true);
});
