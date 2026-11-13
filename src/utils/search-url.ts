import type { Site } from './settings';

const QUERY_PLACEHOLDER = '{query}';

export function searchUrl(template: string, query: string): string {
  return template.split(QUERY_PLACEHOLDER).join(encodeURIComponent(query));
}

export function validateSite(site: Site): string | null {
  const name = site.name.trim();
  const url = site.url.trim();
  if (!name) return '名前を入力してください。';
  if (!url) return '検索URLを入力してください。';
  if (!url.includes(QUERY_PLACEHOLDER)) {
    return `検索URLには ${QUERY_PLACEHOLDER} を含めてください。`;
  }

  try {
    const parsed = new URL(searchUrl(url, 'test'));
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '検索URLは http:// または https:// で始めてください。';
    }
  } catch {
    return '検索URLの形式が正しくありません。';
  }
  return null;
}
