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
