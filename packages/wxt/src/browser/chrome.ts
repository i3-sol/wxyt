/// <reference types="chrome" />
import type { WxtRuntime, WxtI18n } from './index';

/**
 * EXPERIMENTAL
 *
 * Includes the `chrome` API and types when using `extensionApi: 'chrome'`.
 *
 * @module wxt/browser/chrome
 */

export type Chrome = typeof chrome;
export type WxtBrowser = Omit<Chrome, 'runtime' | 'i18n'> & {
  runtime: WxtRuntime & Omit<Chrome['runtime'], 'getURL'>;
  i18n: WxtI18n & Omit<Chrome['i18n'], 'getMessage'>;
};

export const browser: WxtBrowser =
  // @ts-expect-error
  globalThis.browser?.runtime?.id == null
    ? globalThis.chrome
    : // @ts-expect-error
      globalThis.browser;
