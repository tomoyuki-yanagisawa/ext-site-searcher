# Site Search

Webページ上で選択した文字列を、右クリックメニューから登録したサイトで検索する Chrome・Firefox 用のブラウザ拡張機能です。検索先は設定画面で自由に追加・編集・削除できます。

仕様の詳細は [docs/DESIGN.v1.md](docs/DESIGN.v1.md) を参照してください。

## 動作環境

- Chrome（Manifest V3）
- Firefox 140 以上（Manifest V3）
- ビルドには Node.js 22 以上

## インストール

ストアでは配布していないため、ソースからビルドしてブラウザに読み込みます。

### 1. ビルド

```sh
git clone https://github.com/tomoyuki-yanagisawa/ext-site-searcher.git
cd ext-site-searcher/site-search
npm install
```

```sh
npm run build                 # Chrome 用
npm run build -- -b firefox   # Firefox 用
```

ビルド結果は `site-search/.output/chrome-mv3/` と `site-search/.output/firefox-mv3/` に出力されます。

### 2. Chrome に読み込む

1. `chrome://extensions` を開く
2. 右上の「デベロッパー モード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」を選び、`site-search/.output/chrome-mv3` を指定する

### 3. Firefox に読み込む

1. `about:debugging#/runtime/this-firefox` を開く
2. 「一時的なアドオンを読み込む…」を選ぶ
3. `site-search/.output/firefox-mv3/manifest.json` を指定する

Firefox の一時的なアドオンはブラウザを再起動すると削除されます。常用する場合は AMO（addons.mozilla.org）での署名が必要です。なお、`site-search/wxt.config.ts` の gecko ID は暫定値（`site-search@example.com`）なので、公開前に一意な ID へ変更してください。

## 使い方

1. Webページ上で文字列を選択して右クリックする
2. 「サイトで検索」から登録したサイトを選ぶ
3. 新しいタブで検索結果が開く

検索先は初期状態では空です。「サイトで検索」→「検索サイトを設定…」を開き、名前と検索URLを入力して保存してください。

検索URLには `{query}` を含めます。`{query}` が選択文字列に置き換わります。

```text
https://www.google.com/search?q={query}
```

`http://` または `https://` で始まるURLのみ登録できます。

## 開発

```sh
cd site-search
npm run dev                  # Chrome で起動
npm run dev -- -b firefox    # Firefox で起動
npm run typecheck            # TypeScript の型検査
```

`npm install` 時に `wxt prepare` が実行され、型検査に必要な `.wxt/` の型定義が生成されます。

`.output/` と `.wxt/` はビルド生成物のためコミットしません。
