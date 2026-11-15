import { browser } from 'wxt/browser';

type MessageKey = Exclude<Parameters<typeof browser.i18n.getMessage>[0], `@@${string}`>;

export function getMessage(key: MessageKey, substitutions?: string | string[]): string {
  return browser.i18n.getMessage(key, substitutions);
}

/**
 * `data-i18n` のテキストと `data-i18n-label` の aria-label を現在の言語に置き換える。
 * document を渡したときは、あわせて `<html lang>` を UI 言語に合わせる。
 */
export function localize(root: ParentNode = document): void {
  if (root === document) {
    const language = browser.i18n.getUILanguage().toLowerCase();
    document.documentElement.lang = language.startsWith('ja') ? 'ja' : 'en';
  }

  for (const element of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = element.dataset.i18n as MessageKey | undefined;
    if (key) {
      const text = getMessage(key);
      if (text) {
        element.textContent = text;
      }
    }
  }

  for (const element of root.querySelectorAll<HTMLElement>('[data-i18n-label]')) {
    const key = element.dataset.i18nLabel as MessageKey | undefined;
    if (key) {
      const label = getMessage(key);
      if (label) {
        element.setAttribute('aria-label', label);
      }
    }
  }
}
