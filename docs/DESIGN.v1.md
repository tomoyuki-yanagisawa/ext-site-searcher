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
| 開発依存 | WXT、TypeScript |

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
- 検索サイトを選ぶと、選択文字列を検索URLに埋め込んで新しいタブで開く。
- 検索サイトが0件でも「検索サイトを設定…」は表示する。
- 初期設定は空。設定画面から検索先を登録する。
- 「検索サイトを設定…」でOptions画面を開く。

### 3.2 設定画面

名前とURLテンプレートの一覧を表示する。

```text
検索サイトの設定

名前       検索URL
[Google]   [https://www.google.com/search?q={query}] [削除]

[追加]                                         [保存]

{query} は選択文字列に置き換わります。
```

- 追加・編集・削除・保存のみ。並び替えや有効/無効は作らない。
- 入力中は保存せず、「保存」でまとめて永続化する。
- 保存結果または入力エラーを画面に表示する。
- CSSは `index.html` 内に記述し、別ファイルを増やさない。

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

`browser.storage.local` に `sites` という配列を1つ保存する。

```json
{
  "sites": [
    { "name": "Google", "url": "https://www.google.com/search?q={query}" }
  ]
}
```

- 未設定の場合は `[]` として扱う。
- メニューIDは `site-0`、`site-1` のように配列のインデックスを使用する。
- 同期やサーバーへの送信は行わない（検索時の検索語は検索先サイトに渡される）。

## 5. 構成

```text
site-search/
├── entrypoints/
│   ├── background.ts
│   └── options/
│       ├── index.html
│       └── main.ts
├── tsconfig.json
├── wxt.config.ts
└── package.json
```

手書きは**6ファイル**のみ。`manifest.json` はWXTが生成し、`package-lock.json` はnpmが生成する。

| ファイル | 役割 |
|---|---|
| `background.ts` | メニュー作成、検索処理、設定変更の反映 |
| `options/index.html` | 設定画面のマークアップとCSS |
| `options/main.ts` | 追加・編集・削除・バリデーション・保存 |
| `tsconfig.json` | TypeScript の型検査設定 |
| `wxt.config.ts` | Manifest V3、名前、権限 |
| `package.json` | npm scripts、開発依存 |

## 6. 処理フロー

1. `defineBackground()` 内で拡張機能のイベントリスナーを同期的に登録する。
2. インストール時・ブラウザ起動時に `sites` を読み、`contextMenus.removeAll()` からメニューを再構築する。
3. Optionsで保存すると `storage.onChanged` が発火し、メニューを再構築する。複数の再構築処理は直列化する。
4. サイトのメニューをクリックすると、`contextMenus.onClicked` で `selectionText` とメニューIDを取得する。
5. 最新の `sites` から対象URLを取得し、`{query}` をURLエンコード済みの選択文字列で置換する。
6. `browser.tabs.create({ url })` で検索結果を開く。
7. 設定項目のクリックでは `browser.runtime.openOptionsPage()` を使う。

WXTの `browser` APIを使い、Chrome・Firefox固有の分岐は書かない。FirefoxのMV3バックグラウンド形式の違いはWXTに任せる。

## 7. 設定

### `wxt.config.ts`

```ts
import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: 'Site Search',
    description: '選択した文字列を登録したサイトで検索',
    permissions: ['contextMenus', 'storage'],
    // Firefox 専用の設定は Chrome の manifest に含めない
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          // TODO: AMO 公開前に一意の ID へ変更する
          id: 'site-search@example.com',
          // Firefox 140 未満では組み込みのデータ同意が使えないため対象外にする
          strict_min_version: '140.0',
          data_collection_permissions: {
            // 選択文字列を検索語として外部サイトへ送信する
            required: ['searchTerms'],
          },
        },
      },
    }),
  }),
});
```

`host_permissions`、`tabs`、`activeTab`、`scripting` は不要。Firefox ではAMOの要件に合わせて `browser_specific_settings` を設定する。

### `package.json`

```json
{
  "name": "site-search",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wxt",
    "build": "wxt build",
    "typecheck": "tsc --noEmit",
    "postinstall": "wxt prepare"
  },
  "devDependencies": {
    "typescript": "^7.0.2",
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
npm run typecheck            # 型検査
```

成果物はWXTの `.output/chrome-mv3/` と `.output/firefox-mv3/` に生成される。

## 9. 完了条件

Chrome・Firefoxの両方で以下を手動確認する。

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
