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
    description: '__MSG_extensionDescription__',
    default_locale: 'en',
    permissions: ['contextMenus', 'storage', 'clipboardWrite'],
    ...(browser === 'chrome' && { minimum_chrome_version: '157' }),
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
