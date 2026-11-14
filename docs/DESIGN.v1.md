# Site Search — 設計書

## 1. 概要

Webページ上で選択した文字列を、右クリックメニューから任意のサイトで検索するChrome・Firefox用のブラウザ拡張機能。Firefox ではリンクの表示文字列の検索にも対応する。

検索先は設定画面で自由に追加・編集・削除でき、検索結果は現在のタブまたは右隣の前面・バックグラウンドタブで開く。

## 2. 技術方針

| 項目 | 採用 |
|---|---|
| フレームワーク | WXT |
| 言語 | TypeScript |
| UI | Vanilla HTML/CSS/JS |
| Manifest | V3（両ブラウザ共通） |
| パッケージ管理 | npm |
| 保存先 | `browser.storage.local` |
| 開発依存 | WXT、TypeScript、@wxt-dev/auto-icons、web-ext、Vitest |

React や Content Script は使わず、必要な共通処理は小さなユーティリティとして実装する。

表示言語はブラウザの言語設定に従い、日本語と英語に対応する。その他の言語は英語を使う。翻訳は `public/_locales/` に置き、WebExtensions の i18n API を使用する。ユーザーが登録したサイト名や URL は翻訳しない。

## 3. 機能

### 3.1 Chrome・Firefox 共通機能

#### 3.1.1 選択文字列の検索

Chrome・Firefox 共通で、テキスト選択時に次のメニューを表示する。

```text
サイトで検索 ▶
  Google
  Wikipedia
  ─────────
  検索サイトを設定…
```

- サイトの項目はユーザーが登録した検索先から生成し、設定画面の順に表示する（上記は例）。
- 検索サイトを選ぶと、検索語を検索URLに埋め込み、設定した開き方（現在のタブ / 右隣の前面タブ / 右隣のバックグラウンドタブ）で開く。
- 検索サイトが0件でも「検索サイトを設定…」は表示する。
- 初期設定は空。設定画面から検索先を登録する。
- 「検索サイトを設定…」でOptions画面を開く。

#### 3.1.2 設定画面

名前とURLテンプレートの一覧を表示する。

```text
検索サイトの設定

検索結果の開き方
(•) 新しいタブ（現在のタブの右隣）
( ) 現在のタブ
( ) バックグラウンドのタブ（現在のタブの右隣）

名前       検索URL
[Google]   [https://www.google.com/search?q={query}] [↑] [↓] [削除]

[追加]                                         [保存]

{query} は選択文字列に置き換わります。
```

- 追加・編集・削除・並び替え・保存のみ。有効/無効は作らない。
- 「↑」「↓」で並び替えでき、その順序を保存して右クリックメニューに反映する。先頭は「↑」、末尾は「↓」を無効にする。
- 検索結果の開き方をラジオボタンで選択できる。初期値は「新しいタブ（現在のタブの右隣）」。
- 検索語のクリップボードへのコピーを設定できる。初期値はオフで、オンの場合は既存の内容を上書きする。
- 設定画面は埋め込みダイアログではなく、ブラウザのタブで開く（`options_ui.open_in_tab`）。
- 入力中は保存せず、「保存」でまとめて永続化する。設定の読み込み完了までは操作できない。
- 保存結果または入力エラーを画面に表示する。
- HTMLはクラスを使わず、フォーム部品はOS / ブラウザ標準の見た目をそのまま使う。
- CSSは `options/style.css` に記述し、`options/main.ts` から import する。

#### 3.1.3 URLテンプレート

`{query}` を `encodeURIComponent(検索語)` に置き換える。検索語は通常は選択文字列で、Firefox では選択文字列がない場合にリンク文字列も使う。

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

### 3.2 Firefox のみの機能

#### 3.2.1 リンク文字列の検索

文字列を選択せずにリンクを右クリックした場合も、共通の検索メニューを表示する。

- 検索語には Firefox の `linkText` を使う。選択文字列がある場合はそちらを優先する。
- リンクに文字がない場合、Firefox はリンク先 URL を返す。
- 検索結果の開き方とクリップボードへのコピーは共通の設定に従う。
- Chrome ではリンクのみの右クリックにはメニューを表示しない。

#### 3.2.2 ミドルクリックでバックグラウンド検索

検索メニューのサイト項目をミドルクリックすると、検索結果をバックグラウンドで開く。

- 開き方の設定にかかわらず、現在のタブの右隣に開く。
- 選択文字列とリンク文字列のどちらの検索でも利用できる。
- Firefox が通知する `button` を判定する。Chrome はボタン情報を通知しないため対応しない。
- 実機でのミドルクリック動作は未検証。

## 4. データ

`browser.storage.local` に `sites`、`openIn`、`copyQuery` を保存する。

```json
{
  "sites": [
    { "name": "Google", "url": "https://www.google.com/search?q={query}" }
  ],
  "openIn": "newTab",
  "copyQuery": false
}
```

- `sites` が未設定の場合は `[]` として扱う。
- `openIn` が未設定の場合は `"newTab"` として扱う。
- `openIn` は `"newTab"`（右隣の前面タブ）、`"currentTab"`（現在のタブ）、`"backgroundTab"`（右隣のバックグラウンドタブ）を取る。
- `copyQuery` は検索語のコピーを有効にする真偽値。未設定や不正な値は `false` として扱う。
- サイトのメニューIDは `site-index-<インデックス>` とする。クリック時は最新の設定の同じインデックスのサイトを使う。設定変更直後は、更新前のメニューをクリックすると新しい並び順のサイトが開く可能性がある。
- 親メニューは `site-search`、設定項目は `site-search-options`、区切り線は `site-search-separator` とする。
- 同期やサーバーへの送信は行わない（検索時の検索語は検索先サイトに渡される）。

## 5. 構成

```text
.
├── src/
│   ├── assets/
│   │   └── icon.svg
│   ├── entrypoints/
│   │   ├── background.ts
│   │   └── options/
│   │       ├── index.html
│   │       ├── main.ts
│   │       └── style.css
│   └── utils/
│       ├── feature.ts
│       ├── search-url.ts
│       └── settings.ts
├── tests/
├── public/_locales/
├── .github/
│   ├── scripts/check-release.mjs
│   └── workflows/build.yml
├── tsconfig.json
├── wxt.config.ts
└── package.json
```

ソースは `src/`、テストは `tests/` に置く。ビルド成果物は `dist/`、型定義キャッシュは `.wxt/` に出力される（`dist/` と `.wxt/` はコミットしない）。アイコンは `src/assets/icon.svg` から `@wxt-dev/auto-icons` がビルド時にPNG（16/32/48/96/128）を生成する。`manifest.json` はWXTが生成し、`package-lock.json` はnpmが生成する。

| ファイル | 役割 |
|---|---|
| `src/entrypoints/background.ts` | メニュー作成、検索処理、設定変更の反映 |
| `src/entrypoints/options/index.html` | 設定画面のマークアップ |
| `src/entrypoints/options/main.ts` | 追加・編集・削除・バリデーション・保存 |
| `src/entrypoints/options/style.css` | 設定画面のスタイル（OS / ブラウザ標準に寄せる） |
| `src/utils/search-url.ts` | 検索URLの検証と生成 |
| `src/utils/feature.ts` | ビルド対象ブラウザに基づく機能対応フラグ |
| `src/utils/settings.ts` | 設定の型・読み書きと既定値 |
| `tests/` | 単体・連携テスト |
| `.github/` | CI ワークフローと Release 判定スクリプト |
| `src/assets/icon.svg` | 拡張機能アイコンの元データ（ビルド時にPNG生成） |
| `tsconfig.json` | TypeScript の型検査設定 |
| `wxt.config.ts` | Manifest V3、名前、権限、アイコン生成 |
| `package.json` | npm scripts、開発依存 |

## 6. 処理フロー

1. `defineBackground()` 内で拡張機能のイベントリスナーを同期的に登録する。
2. インストール時・ブラウザ起動時に `sites` を読み、`contextMenus.removeAll()` からメニューを再構築する。
3. Optionsで保存すると `storage.onChanged` が発火し、メニューを再構築する。複数の再構築処理は直列化する。
4. サイトのメニューをクリックすると、`contextMenus.onClicked` で `selectionText` とメニューIDを取得する。Firefox では選択文字列がなければ `linkText` を使う。
5. 最新の `sites` から対象URLを取得し、`{query}` をURLエンコード済みの検索語で置換する。
   `copyQuery` が有効な場合は、エンコード前の検索語をクリップボードに書き込む。書き込みが失敗しても検索を続ける。
6. `openIn` が `"currentTab"` なら `browser.tabs.update()`、`"newTab"` または `"backgroundTab"` なら `browser.tabs.create()` で右隣に開く。`"backgroundTab"` では `active: false` を指定する。
   Firefox で `button === 1` の場合は設定にかかわらず右隣のバックグラウンドタブで開く（実機でのミドルクリック動作は未検証）。
7. 設定項目のクリックでは `browser.runtime.openOptionsPage()` を使う。

WXTの `browser` APIを使い、リンク文字列の取得とミドルクリックの判定は Firefox に限る。FirefoxのMV3バックグラウンド形式の違いはWXTに任せる。

## 7. 設定

### `wxt.config.ts`

現在の設定は [`wxt.config.ts`](../wxt.config.ts) を参照する。クリップボードへの書き込みに `clipboardWrite` を使い、読み取り権限は要求しない。`host_permissions`、`tabs`、`activeTab`、`scripting` は不要。Chrome では Service Worker からの書き込みに対応した 157 以上を対象とする。Firefox ではAMOの要件に合わせて `browser_specific_settings` を設定する。`strict_min_version` は Windows 7 で利用できる最後の Firefox 115 に合わせる。アイコンは `src/assets/icon.svg` から `@wxt-dev/auto-icons` がビルド時に生成する（Chrome は manifest のアイコンとして SVG を扱えないため）。`baseIconPath` は `srcDir` からの相対パスで指定する。

### `package.json`

現在のスクリプトと依存関係は [`package.json`](../package.json) を参照する。`postinstall` で `wxt prepare` を実行し、`.wxt/` に型定義を生成する。`package-lock.json` をコミットする。

## 8. 開発コマンド

```sh
npm install
npm run dev                  # Chrome
npm run dev -- -b firefox   # Firefox
npm run build                # Chrome
npm run build -- -b firefox # Firefox
npm run zip                  # Chrome 用 zip
npm run zip:firefox          # Firefox 用 zip
npm run typecheck            # 型検査
npm test                     # 単体・連携テスト
```

成果物は `dist/chrome-mv3/` と `dist/firefox-mv3/` に、配布用 zip は `dist/site-search-*-chrome.zip` と `dist/site-search-*-firefox.zip` に生成される。

GitHub Actions（`.github/workflows/build.yml`）は `test` / `version` / `release` の3ジョブで構成する。PR では `test`（型検査・テスト・zip 作成）のみ、`main` では `version` で未リリースか確認し、必要なら `release` が Firefox 用 zip を `site-search-<version>-firefox-unsigned.xpi` としてコピーし、`v<version>` タグと Release を自動作成する。XPI は未署名で、AMO の認証情報は不要。リリース済みのバージョンでは Release をスキップする。

## 9. 完了条件

Chrome と Firefox（Windows 7 では 115 ESR）で以下を手動確認する。

- 検索サイトを追加・編集・削除・保存できる。
- 選択文字列を右クリックして登録サイトで検索できる。
- 日本語・空白・記号が正しくURLエンコードされる。
- 保存直後にメニューが更新され、ブラウザ再起動後も設定が残る。
- 登録0件でも設定画面を開ける。
- 無効なURL・空欄・`{query}` のないURLを保存できない。
- 検索サイトを並び替えられ、右クリックメニューにその順で表示される。
- 必要以上の権限を要求しない。

Firefox では加えて、文字列未選択のリンクを右クリックしてリンク文字列を検索できること、選択文字列が優先されること、サイト項目のミドルクリックでバックグラウンドに開くことを手動確認する。

## 10. 実装原則

小さな関数で実装し、共通処理やパッケージは必要なものだけ追加する。不要な抽象化は避ける。

## 参考

- [WXT Entrypoints](https://wxt.dev/guide/essentials/entrypoints)
- [WXT Manifest](https://wxt.dev/guide/essentials/config/manifest.html)
- [WXT Extension APIs](https://wxt.dev/guide/essentials/extension-apis)
- [WXT Browser Targets](https://wxt.dev/guide/essentials/target-different-browsers.html)
