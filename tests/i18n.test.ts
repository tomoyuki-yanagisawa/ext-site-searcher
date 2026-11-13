import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const en = JSON.parse(readFileSync('public/_locales/en/messages.json', 'utf8'));
const ja = JSON.parse(readFileSync('public/_locales/ja/messages.json', 'utf8'));

describe('extension translations', () => {
  it('provides the same nonempty messages and placeholders in both languages', () => {
    expect(Object.keys(ja).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en)) {
      expect(en[key].message).toBeTruthy();
      expect(ja[key].message).toBeTruthy();
      expect(ja[key].placeholders ?? {}).toEqual(en[key].placeholders ?? {});
      for (const locale of [en, ja]) {
        const referenced = [...locale[key].message.matchAll(/\$([A-Za-z][A-Za-z0-9_]*)\$/g)]
          .map((match) => match[1]!.toLowerCase()).sort();
        expect(referenced).toEqual(Object.keys(locale[key].placeholders ?? {}).sort());
      }
    }
  });

  it('defines every message referenced by the options HTML and validation', () => {
    const html = readFileSync('src/entrypoints/options/index.html', 'utf8');
    const keys = [...html.matchAll(/data-i18n(?:-label)?="([^"]+)"/g)].map((match) => match[1]);
    keys.push('nameRequired', 'urlRequired', 'queryRequired', 'urlInvalid', 'urlProtocol');
    for (const key of keys) expect(en).toHaveProperty(key!);
  });

  it('defines the manifest and dynamic UI messages', () => {
    for (const key of ['extensionDescription', 'menuSearch', 'menuSettings', 'saved', 'saveFailed', 'loadFailed', 'rowError']) {
      expect(en).toHaveProperty(key);
    }
  });
});
