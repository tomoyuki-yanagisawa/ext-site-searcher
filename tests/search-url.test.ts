import { describe, expect, it } from 'vitest';
import { searchUrl, validateSite } from '../src/utils/search-url';

describe('searchUrl', () => {
  it('encodes the query in every placeholder', () => {
    expect(searchUrl('https://example.com/?q={query}&again={query}', '日本語 &'))
      .toBe('https://example.com/?q=%E6%97%A5%E6%9C%AC%E8%AA%9E%20%26&again=%E6%97%A5%E6%9C%AC%E8%AA%9E%20%26');
  });
});

describe('validateSite', () => {
  it.each([
    [{ name: '', url: 'https://example.com/?q={query}' }, '名前を入力してください。'],
    [{ name: 'Site', url: '' }, '検索URLを入力してください。'],
    [{ name: 'Site', url: 'https://example.com/' }, '検索URLには {query} を含めてください。'],
    [{ name: 'Site', url: 'invalid {query}' }, '検索URLの形式が正しくありません。'],
    [{ name: 'Site', url: 'javascript:{query}' }, '検索URLは http:// または https:// で始めてください。'],
    [{ name: ' Site ', url: ' https://example.com/?q={query} ' }, null],
  ])('validates %o', (site, expected) => {
    expect(validateSite(site)).toBe(expected);
  });
});
