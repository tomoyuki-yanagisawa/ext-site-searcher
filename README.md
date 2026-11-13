# Site Search

[![Build](https://github.com/tomoyuki-yanagisawa/ext-site-searcher/actions/workflows/build.yml/badge.svg)](https://github.com/tomoyuki-yanagisawa/ext-site-searcher/actions/workflows/build.yml)

Webページ上で選択した文字列を、右クリックメニューから登録したサイトで検索する Chrome・Firefox 用のブラウザ拡張機能です。検索先は設定画面で自由に追加・編集・削除できます。

仕様の詳細は [docs/DESIGN.v1.md](docs/DESIGN.v1.md) を参照してください。

## 動作環境

- Chrome（Manifest V3）
- Firefox 115 以上（Manifest V3）
- ビルドには Node.js 22 以上

> Windows 7 で使える Firefox は 115 ESR が最後です。115 ESR はサポートが終了しており、セキュリティ更新は提供されません。Windows 7 での利用は自己責任で行い、可能であれば新しい環境への移行を検討してください。

## インストール

ストアでは配布していません。GitHub Actions のビルド成果物を使うか、手元でビルドします。

### ビルド済みパッケージを使う

1. GitHub の [Actions](https://github.com/tomoyuki-yanagisawa/ext-site-searcher/actions) で最新の `Build` を開く
2. Artifacts の `site-search-chrome` または `site-search-firefox` をダウンロードする
3. Chrome は zip を展開して使う。Firefox は zip のまま読み込める

`v*` タグを push すると [Releases](https://github.com/tomoyuki-yanagisawa/ext-site-searcher/releases) にも zip が添付されます。

### 自分でビルドする

```sh
git clone https://github.com/tomoyuki-yanagisawa/ext-site-searcher.git
cd ext-site-searcher/site-search
npm install
```

```sh
npm run zip                  # Chrome 用
npm run zip:firefox          # Firefox 用
```

ビルド結果は `.output/chrome-mv3/` と `.output/firefox-mv3/` に、zip は `.output/site-search-*-chrome.zip` と `.output/site-search-*-firefox.zip` に出力されます。

`npm run build` / `npm run build -- -b firefox` でも、zip を作らずにディレクトリだけを出力できます。

### Chrome（macOS）に読み込む

1. Chrome 用 zip を展開する
2. `chrome://extensions` を開く
3. 右上の「デベロッパー モード」をオンにする
4. 「パッケージ化されていない拡張機能を読み込む」を選び、展開したフォルダを指定する

### Firefox（Windows 7）に読み込む

Windows 7 で利用できる Firefox は 115 ESR が最後です。事前にインストールしてください。

#### 一時的に使う

1. `about:debugging#/runtime/this-firefox` を開く
2. 「一時的なアドオンを読み込む…」を選ぶ
3. Firefox 用 zip（`.output/site-search-*-firefox.zip`）を指定する

一時的なアドオンはブラウザを再起動すると削除されます。

#### 常時使う

Firefox ESR では署名チェックを無効にできます。

1. `about:config` を開き、`xpinstall.signatures.required` を `false` にする
2. Firefox 用 zip の拡張子を `.xpi` に変更する
3. `about:addons` の歯車メニューから「ファイルからアドオンをインストール」を選び、`.xpi` を指定する

AMO（addons.mozilla.org）で署名した xpi を使う場合、署名チェックを無効にする必要はありません。

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
npm run zip                  # Chrome 用 zip を作成
npm run zip:firefox          # Firefox 用 zip を作成
```

`npm install` 時に `wxt prepare` が実行され、型検査に必要な `.wxt/` の型定義が生成されます。

アイコンは `site-search/assets/icon.svg` をもとにビルド時に PNG が生成されます（Chrome は manifest のアイコンに SVG を使えないため）。リポジトリには SVG のみをコミットします。

`.output/` と `.wxt/` はビルド生成物のためコミットしません。
