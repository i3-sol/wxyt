import path from 'node:path';
import * as vite from 'vite';
import { InternalConfig } from '~/types';

/**
 * Creates an alias to redirect "webextension-polyfill" imports to WXT's `fakeBrowser`.
 *
 * This should only be used during tests.
 */
export function webextensionPolyfillAlias(
  config: InternalConfig,
): vite.PluginOption {
  return {
    name: 'wxt:webextension-polyfill-test-alias',
    config() {
      return {
        resolve: {
          alias: {
            'webextension-polyfill': path.resolve(
              config.root,
              'node_modules/wxt/dist/virtual/mock-browser',
            ),
          },
        },
      };
    },
  };
}
