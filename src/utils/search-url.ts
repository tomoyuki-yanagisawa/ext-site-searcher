import type { Site } from './settings';

const QUERY_PLACEHOLDER = '{query}';

export function searchUrl(template: string, query: string): string {
  return template.split(QUERY_PLACEHOLDER).join(encodeURIComponent(query));
}

export function validateSite(site: Site): 'nameRequired' | 'urlRequired' | 'queryRequired' | 'urlProtocol' | 'urlInvalid' | null {
  const name = site.name.trim();
  const url = site.url.trim();
  if (!name) return 'nameRequired';
  if (!url) return 'urlRequired';
  if (!url.includes(QUERY_PLACEHOLDER)) {
    return 'queryRequired';
  }

  try {
    const parsed = new URL(searchUrl(url, 'test'));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'urlProtocol';
    }
  } catch {
    return 'urlInvalid';
  }
  return null;
}
