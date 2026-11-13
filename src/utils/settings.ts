import { browser } from 'wxt/browser';

export interface Site {
  name: string;
  url: string;
}

export type OpenIn = 'newTab' | 'currentTab';

export interface Settings {
  sites: Site[];
  openIn: OpenIn;
}

function isSite(value: unknown): value is Site {
  if (typeof value !== 'object' || value === null) return false;
  const site = value as Record<string, unknown>;
  return typeof site.name === 'string' && typeof site.url === 'string';
}

export function normalizeSettings(values: Record<string, unknown>): Settings {
  return {
    sites: Array.isArray(values.sites) ? values.sites.filter(isSite) : [],
    openIn: values.openIn === 'currentTab' ? 'currentTab' : 'newTab',
  };
}

export async function getSettings(): Promise<Settings> {
  return normalizeSettings(await browser.storage.local.get(['sites', 'openIn']));
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set(settings);
}
