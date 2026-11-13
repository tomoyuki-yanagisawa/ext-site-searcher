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
    [{ name: '', url: 'https://example.com/?q={query}' }, 'nameRequired'],
    [{ name: 'Site', url: '' }, 'urlRequired'],
    [{ name: 'Site', url: 'https://example.com/' }, 'queryRequired'],
    [{ name: 'Site', url: 'invalid {query}' }, 'urlInvalid'],
    [{ name: 'Site', url: 'javascript:{query}' }, 'urlProtocol'],
    [{ name: ' Site ', url: ' https://example.com/?q={query} ' }, null],
  ])('validates %o', (site, expected) => {
    expect(validateSite(site)).toBe(expected);
  });
});
