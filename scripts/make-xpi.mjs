import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const zip = new URL(`../dist/site-search-${version}-firefox.zip`, import.meta.url);
const xpi = new URL(`../dist/site-search-${version}-firefox-unsigned.xpi`, import.meta.url);

if (!existsSync(zip)) {
  console.error(`Firefox 用 zip が見つかりません: ${fileURLToPath(zip)}`);
  process.exit(1);
}

copyFileSync(zip, xpi);
console.log(`Created ${fileURLToPath(xpi)}`);
