# Site Search — 設計書

## 1. 概要

Webページ上で選択した文字列を、右クリックメニューから任意のサイトで検索するChrome・Firefox共通のブラウザ拡張機能。

検索先は設定画面で自由に追加・編集・削除でき、検索結果は新しいタブで開く。

## 2. 技術方針

| 項目 | 採用 |
|---|---|
| フレームワーク | WXT |
| 言語 | TypeScript |
| UI | Vanilla HTML/CSS/JS |
| Manifest | V3（両ブラウザ共通） |
| パッケージ管理 | npm |
| 保存先 | `browser.storage.local` |
| 開発依存 | WXT、TypeScript、@wxt-dev/auto-icons、web-ext |

React、Content Script、テストフレームワーク、独自の抽象化層は使わない。

## 3. 機能

### 3.1 右クリック検索

テキスト選択時に次のメニューを表示する。

```text
サイトで検索 ▶
  Google
  Wikipedia
  ─────────
  検索サイトを設定…
```

- サイトの項目はユーザーが登録した検索先から生成する（上記は例）。
- 検索サイトを選ぶと、選択文字列を検索URLに埋め込み、設定した開き方（現在のタブ / 右隣の新しいタブ）で開く。
- 検索サイトが0件でも「検索サイトを設定…」は表示する。
- 初期設定は空。設定画面から検索先を登録する。
- 「検索サイトを設定…」でOptions画面を開く。

### 3.2 設定画面

名前とURLテンプレートの一覧を表示する。

```text
検索サイトの設定

検索結果の開き方
(•) 新しいタブ（現在のタブの右隣）
( ) 現在のタブ

名前       検索URL
[Google]   [https://www.google.com/search?q={query}] [削除]

[追加]                                         [保存]

{query} は選択文字列に置き換わります。
```

- 追加・編集・削除・保存のみ。並び替えや有効/無効は作らない。
- 検索結果の開き方をラジオボタンで選択できる。初期値は「新しいタブ（現在のタブの右隣）」。
- 設定画面は埋め込みダイアログではなく、ブラウザのタブで開く（`options_ui.open_in_tab`）。
- 入力中は保存せず、「保存」でまとめて永続化する。
- 保存結果または入力エラーを画面に表示する。
- HTMLはクラスを使わず、フォーム部品はOS / ブラウザ標準の見た目をそのまま使う。
- CSSは `options/style.css` に記述し、`options/main.ts` から import する。

### 3.3 URLテンプレート

`{query}` を `encodeURIComponent(selectionText)` に置き換える。

| 名前 | URL例 |
|---|---|
| Google | `https://www.google.com/search?q={query}` |
| Wikipedia | `https://ja.wikipedia.org/w/index.php?search={query}` |
| GitHub | `https://github.com/search?q={query}` |

- HTTP(S) URLのみ許可する。
- `{query}` を1回以上含むことを必須とする。
- 名前・URLの空文字を禁止する。
- URL検証には、仮の検索語に置換して `new URL()` を利用する。
- POST検索、サイトのHTML解析、検索エンジン自動検出は対象外。

## 4. データ

`browser.storage.local` に `sites` と `openIn` を保存する。

```json
{
  "sites": [
    { "name": "Google", "url": "https://www.google.com/search?q={query}" }
  ],
  "openIn": "newTab"
}
```

- `sites` が未設定の場合は `[]` として扱う。
- `openIn` が未設定の場合は `"newTab"` として扱う。
- `openIn` は `"newTab"`（現在のタブの右隣）または `"currentTab"`（現在のタブ）を取る。
- メニューIDは `site-index-0`、`site-index-1` のように配列のインデックスを使用する。
- 親メニューは `site-search`、設定項目は `site-search-options`、区切り線は `site-search-separator` とする。
- 同期やサーバーへの送信は行わない（検索時の検索語は検索先サイトに渡される）。

## 5. 構成

```text
.
├── src/
│   ├── assets/
│   │   └── icon.svg
│   └── entrypoints/
│       ├── background.ts
│       └── options/
│           ├── index.html
│           ├── main.ts
│           └── style.css
├── tsconfig.json
├── wxt.config.ts
└── package.json
```

手書きのコードは**7ファイル**のみ。ソースは `src/`、ビルド成果物は `dist/`、型定義キャッシュは `.wxt/` に出力される（`dist/` と `.wxt/` はコミットしない）。アイコンは `src/assets/icon.svg` から `@wxt-dev/auto-icons` がビルド時にPNG（16/32/48/96/128）を生成する。`manifest.json` はWXTが生成し、`package-lock.json` はnpmが生成する。

| ファイル | 役割 |
|---|---|
| `src/entrypoints/background.ts` | メニュー作成、検索処理、設定変更の反映 |
| `src/entrypoints/options/index.html` | 設定画面のマークアップ |
| `src/entrypoints/options/main.ts` | 追加・編集・削除・バリデーション・保存 |
| `src/entrypoints/options/style.css` | 設定画面のスタイル（OS / ブラウザ標準に寄せる） |
| `src/assets/icon.svg` | 拡張機能アイコンの元データ（ビルド時にPNG生成） |
| `tsconfig.json` | TypeScript の型検査設定 |
| `wxt.config.ts` | Manifest V3、名前、権限、アイコン生成 |
| `package.json` | npm scripts、開発依存 |

## 6. 処理フロー

1. `defineBackground()` 内で拡張機能のイベントリスナーを同期的に登録する。
2. インストール時・ブラウザ起動時に `sites` を読み、`contextMenus.removeAll()` からメニューを再構築する。
3. Optionsで保存すると `storage.onChanged` が発火し、メニューを再構築する。複数の再構築処理は直列化する。
4. サイトのメニューをクリックすると、`contextMenus.onClicked` で `selectionText` とメニューIDを取得する。
5. 最新の `sites` から対象URLを取得し、`{query}` をURLエンコード済みの選択文字列で置換する。
6. `openIn` が `"currentTab"` なら `browser.tabs.update()`、`"newTab"` なら `browser.tabs.create({ index: 現在のタブ + 1 })` で検索結果を開く。
7. 設定項目のクリックでは `browser.runtime.openOptionsPage()` を使う。

WXTの `browser` APIを使い、Chrome・Firefox固有の分岐は書かない。FirefoxのMV3バックグラウンド形式の違いはWXTに任せる。

## 7. 設定

### `wxt.config.ts`

```ts
/// <reference types="@wxt-dev/auto-icons" />
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: 'dist',
  manifestVersion: 3,
  modules: ['@wxt-dev/auto-icons'],
  autoIcons: {
    // Chrome は SVG アイコンを manifest で扱えないため、ビルド時に PNG を生成する
    baseIconPath: 'assets/icon.svg',
    sizes: [128, 96, 48, 32, 16],
  },
  manifest: ({ browser }) => ({
    name: 'Site Search',
    description: '選択した文字列を登録したサイトで検索',
    permissions: ['contextMenus', 'storage'],
    // Firefox 専用の設定は Chrome の manifest に含めない
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          id: 'site-search@tomoyuki-yanagisawa.github.io',
          // Windows 7 で使える最後の Firefox は 115 ESR のため下限を 115 にする
          strict_min_version: '115.0',
          data_collection_permissions: {
            // 選択文字列を検索語として外部サイトへ送信する。140 未満の Firefox では無視される
            required: ['searchTerms'],
          },
        },
      },
    }),
  }),
});
```

`host_permissions`、`tabs`、`activeTab`、`scripting` は不要。Firefox ではAMOの要件に合わせて `browser_specific_settings` を設定する。`strict_min_version` は Windows 7 で利用できる最後の Firefox 115 に合わせる。アイコンは `src/assets/icon.svg` から `@wxt-dev/auto-icons` がビルド時に生成する（Chrome は manifest のアイコンとして SVG を扱えないため）。`baseIconPath` は `srcDir` からの相対パスで指定する。

### `package.json`

```json
{
  "name": "site-search",
  "version": "0.1.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wxt",
    "build": "wxt build",
    "zip": "wxt zip",
    "zip:firefox": "wxt zip -b firefox",
    "sign:firefox": "web-ext sign --channel=unlisted --source-dir dist/firefox-mv3 --artifacts-dir dist/amo",
    "typecheck": "tsc --noEmit",
    "postinstall": "wxt prepare"
  },
  "devDependencies": {
    "@wxt-dev/auto-icons": "^1.1.2",
    "typescript": "^7.0.2",
    "web-ext": "^10.8.0",
    "wxt": "^0.21.0"
  }
}
```

`postinstall` で `wxt prepare` を実行し、`.wxt/` に型定義を生成する。実装時に利用するWXTの互換バージョンを確認し、`package-lock.json` をコミットする。

## 8. 開発コマンド

```sh
npm install
npm run dev                  # Chrome
npm run dev -- -b firefox   # Firefox
npm run build                # Chrome
npm run build -- -b firefox # Firefox
npm run zip                  # Chrome 用 zip
npm run zip:firefox          # Firefox 用 zip
npm run sign:firefox         # AMO で署名（要 API キー）
npm run typecheck            # 型検査
```

成果物は `dist/chrome-mv3/` と `dist/firefox-mv3/` に、配布用 zip は `dist/site-search-*-chrome.zip` と `dist/site-search-*-firefox.zip` に生成される。署名済み XPI は `dist/amo/` に出力される。

GitHub Actions（`.github/workflows/build.yml`）は `test` / `version` / `release` の3ジョブで構成する。PR では `test`（型検査と zip 作成）のみ、`main` では `version` で未リリースか確認し、必要なら `release` が `AMO_JWT_ISSUER` / `AMO_JWT_SECRET` を使って Firefox 用 XPI を署名し、`site-search-<version>-firefox-signed.xpi` にリネームして `v<version>` タグと Release を自動作成する。リリース済みのバージョンでは署名と Release をスキップする。

## 9. 完了条件

Chrome と Firefox（Windows 7 では 115 ESR）で以下を手動確認する。

- 検索サイトを追加・編集・削除・保存できる。
- 選択文字列を右クリックして登録サイトで検索できる。
- 日本語・空白・記号が正しくURLエンコードされる。
- 保存直後にメニューが更新され、ブラウザ再起動後も設定が残る。
- 登録0件でも設定画面を開ける。
- 無効なURL・空欄・`{query}` のないURLを保存できない。
- 必要以上の権限を要求しない。

## 10. 実装原則

小さな関数で実装し、Repository/Service層、クラス、共通ユーティリティ、追加のパッケージは作らない。規模が大きくなってから必要なものだけ追加する。

## 参考

- [WXT Entrypoints](https://wxt.dev/guide/essentials/entrypoints)
- [WXT Manifest](https://wxt.dev/guide/essentials/config/manifest.html)
- [WXT Extension APIs](https://wxt.dev/guide/essentials/extension-apis)
- [WXT Browser Targets](https://wxt.dev/guide/essentials/target-different-browsers.html)
