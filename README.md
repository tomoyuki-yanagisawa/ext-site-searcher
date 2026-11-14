# Site Search

[![CI](https://github.com/tomoyuki-yanagisawa/ext-site-searcher/actions/workflows/build.yml/badge.svg)](https://github.com/tomoyuki-yanagisawa/ext-site-searcher/actions/workflows/build.yml)

Webページ上で選択した文字列を、右クリックメニューから登録したサイトで検索する Chrome・Firefox 用のブラウザ拡張機能です。検索先は設定画面で自由に追加・編集・削除できます。

表示言語はブラウザの設定に従い、日本語と英語に対応します。その他の言語では英語を使用します。

仕様の詳細は [docs/DESIGN.v1.md](docs/DESIGN.v1.md) を参照してください。

## 動作環境

- Chrome 157 以上（Manifest V3）
- Firefox 115 以上（Manifest V3）
- ビルドには Node.js 22 以上

> Windows 7 で使える Firefox は 115 ESR が最後です。115 ESR はサポートが終了しており、セキュリティ更新は提供されません。Windows 7 での利用は自己責任で行い、可能であれば新しい環境への移行を検討してください。

## 構成

```text
.
├── src/
│   ├── assets/icon.svg
│   ├── entrypoints/
│   │   ├── background.ts
│   │   └── options/
│   │       ├── index.html
│   │       ├── main.ts
│   │       └── style.css
│   └── utils/     # 設定と検索 URL の共通処理
├── tests/         # 単体・連携テスト
├── public/_locales/ # 英語・日本語の翻訳
├── .github/       # CI とリリース判定スクリプト
├── dist/          # ビルド成果物（gitignore）
├── .wxt/          # 型定義キャッシュ（gitignore）
├── docs/
├── package.json
├── tsconfig.json
└── wxt.config.ts
```

## インストール

ストアでは配布していません。GitHub Releases や Actions のビルド成果物を使うか、手元でビルドします。

### ビルド済みパッケージを使う

安定版は [Releases](https://github.com/tomoyuki-yanagisawa/ext-site-searcher/releases) からダウンロードできます。Chrome 用・Firefox 用の zip と、未署名の Firefox 用 XPI が添付されています。

Actions の成果物を使う場合は次の手順です。

1. GitHub の [Actions](https://github.com/tomoyuki-yanagisawa/ext-site-searcher/actions) で最新の `CI` を開く
2. Artifacts の `site-search-chrome-zip` または `site-search-firefox-zip` をダウンロードする
3. Chrome は zip を展開して使う。Firefox は zip のまま読み込める

バージョンを上げて `main` にマージすると Release が自動作成されます。

### 自分でビルドする

```sh
git clone https://github.com/tomoyuki-yanagisawa/ext-site-searcher.git
cd ext-site-searcher
npm install
```

```sh
npm run zip                  # Chrome 用
npm run zip:firefox          # Firefox 用
```

ビルド結果は `dist/chrome-mv3/` と `dist/firefox-mv3/` に、zip は `dist/site-search-*-chrome.zip` と `dist/site-search-*-firefox.zip` に出力されます。

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
3. Firefox 用 zip（`dist/site-search-*-firefox.zip`）を指定する

一時的なアドオンはブラウザを再起動すると削除されます。

#### 常時使う

Firefox ESR では署名チェックを無効にして未署名 XPI をインストールできます。この設定はプロファイル内のすべての拡張機能に適用されるため、信頼できるファイルだけをインストールしてください。通常版 Firefox では未署名の拡張機能を常用できません。

1. `about:config` を開き、`xpinstall.signatures.required` を `false` にする
2. Release の未署名 `.xpi` を Firefox で開き、インストールを確認する
3. 開けない場合は、ダウンロードした `.xpi` を Firefox にドラッグするか、`about:addons` の「ファイルからアドオンをインストール」で指定する

Actions の Firefox 用 zip を使う場合は、拡張子を `.xpi` に変更してインストールできます。

## リリース（GitHub Actions）

`main` への push と PR では、`test` ジョブが Chrome / Firefox の zip をビルドして Artifacts に保存します。PR ではここまでです。`main` では `version` ジョブが未リリースか確認し、必要なら `release` ジョブが Firefox 用 zip から未署名 XPI を作り、`v<version>` タグと Release を自動作成します。AMO への署名申請やシークレットは不要です。

### リリース手順

1. バージョンを上げる
2. コミットして `main` にマージする
3. Actions が完了すると `v<version>` タグと Release が自動作成される

```sh
npm version patch --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore: bump version"
```

`package.json` の version がすでにリリース済みの場合、ビルドと Artifacts のみ行われ、Release はスキップされます。新しい Release にはバージョンを上げてください。

`main` の CI は同時に実行せず、最大100件まで待機します。待機上限を超えた run はキャンセルされ、GitHub Actions は実行順も保証しないため、連続してリリースする場合は各 run の結果と対象コミットを確認してください。

手動でタグを push する必要はありません。`workflow_dispatch` はビルド確認用で、Release は作成しません。

作成される XPI は未署名です。AMO での一般公開や Chrome Web Store への公開は別途手続きが必要です。

## 使い方

1. Webページ上で文字列を選択して右クリックする
2. 「サイトで検索」から登録したサイトを選ぶ
3. 設定した開き方で検索結果が開く（初期値は現在のタブの右隣の新しいタブ）

Firefox では文字列を選択していなくても、リンクを右クリックしてその表示文字列を検索できます。文字列を選択している場合は選択文字列を優先します。リンクに文字がない場合、Firefox はリンク先 URL を返します。

検索結果の開き方は、設定画面で「新しいタブ（現在のタブの右隣）」または「現在のタブ」から選べます。

設定画面で「検索語をクリップボードにコピーする」を有効にすると、検索時に選択文字列をコピーします（初期値はオフ）。既存のクリップボード内容は上書きされます。拡張機能は書き込み権限のみを使用し、クリップボードを読み取りません。コピーに失敗しても検索は行います。

検索先は初期状態では空です。「サイトで検索」→「検索サイトを設定…」を開き、名前と検索URLを入力して保存してください。

検索URLには `{query}` を含めます。`{query}` が選択文字列に置き換わります。

```text
https://www.google.com/search?q={query}
```

`http://` または `https://` で始まるURLのみ登録できます。

## 開発

```sh
npm run dev                  # Chrome で起動
npm run dev -- -b firefox    # Firefox で起動
npm run typecheck            # TypeScript の型検査
npm test                     # 単体テスト
npm run zip                  # Chrome 用 zip を作成
npm run zip:firefox          # Firefox 用 zip を作成
```

`npm install` 時に `wxt prepare` が実行され、型検査に必要な `.wxt/` の型定義が生成されます。

アイコンは `src/assets/icon.svg` をもとにビルド時に PNG が生成されます（Chrome は manifest のアイコンに SVG を使えないため）。リポジトリには SVG のみをコミットします。

`dist/` と `.wxt/` はビルド生成物のためコミットしません。`.wxt/` は型定義と `tsconfig` の生成キャッシュです。
