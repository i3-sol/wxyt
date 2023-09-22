import * as vite from 'vite';
import { Manifest, Scripting } from 'webextension-polyfill';
import { UnimportOptions } from 'unimport';
import { EntrypointGroup } from '.';
import { LogLevel } from 'consola';
import { ContentScriptContext } from '../../client/utils/ContentScriptContext';

export interface InlineConfig {
  /**
   * Your project's root directory containing the `package.json` used to fill out the
   * `manifest.json`.
   *
   * @default process.cwd()
   */
  root?: string;
  /**
   * Directory containing all source code. Set to `"src"` to move all source code to a `src/`
   * directory.
   *
   * @default config.root
   */
  srcDir?: string;
  /**
   * Directory containing files that will be copied to the output directory as-is.
   *
   * @default "${config.root}/public"
   */
  publicDir?: string;
  /**
   * @default "${config.srcDir}/entrypoints"
   */
  entrypointsDir?: string;
  /**
   * > Only available when using the JS API. Not available in `wxt.config.ts` files
   *
   * Path to `wxt.config.ts` file or `false` to disable config file discovery.
   *
   * @default "wxt.config.ts"
   */
  configFile?: string | false;
  /**
   * Set to `true` to show debug logs. Overriden by the command line `--debug` option.
   *
   * @default false
   */
  debug?: boolean;
  /**
   * Explicitly set a mode to run in. This will override the default mode for each command, and can
   * be overridden by the command line `--mode` option.
   */
  mode?: string;
  /**
   * Customize auto-import options. Set to `false` to disable auto-imports.
   *
   * For example, to add a directory to auto-import from, you can use:
   *
   * ```ts
   * export default defineConfig({
   *   imports: {
   *     dirs: ["some-directory"]
   *   }
   * })
   * ```
   */
  imports?: Partial<UnimportOptions> | false;
  /**
   * Explicitly set a browser to build for. This will override the default browser for each command,
   * and can be overridden by the command line `--browser` option.
   *
   * @default
   * "chrome"
   */
  browser?: TargetBrowser;
  /**
   * Explicitly set a manifest version to target. This will override the default manifest version
   * for each command, and can be overridden by the command line `--mv2` or `--mv3` option.
   */
  manifestVersion?: TargetManifestVersion;
  /**
   * Override the logger used.
   *
   * @default
   * consola
   */
  logger?: Logger;
  /**
   * Return custom Vite options from a function. See
   * <https://vitejs.dev/config/shared-options.html>.
   *
   * [`root`](#root), [`configFile`](#configfile), and [`mode`](#mode) should be set in WXT's config
   * instead of Vite's.
   *
   * This is a function because any vite plugins added need to be recreated for each individual
   * build step, incase they have internal state causing them to fail when reused.
   */
  vite?: (env: ConfigEnv) => WxtViteConfig | Promise<WxtViteConfig>;
  /**
   * Customize the `manifest.json` output. Can be an object, promise, or function that returns an
   * object or promise.
   */
  manifest?: UserManifest | Promise<UserManifest> | UserManifestFn;
  /**
   * Custom runner options. Options set here can be overridden in a `web-ext.config.ts` file.
   */
  runner?: ExtensionRunnerConfig;
  zip?: {
    /**
     * Configure the filename output when zipping files.
     *
     * Available template variables:
     *
     * - `{name}` - The project's name converted to kebab-case
     * - `{version}` - The version_name or version from the manifest
     * - `{browser}` - The target browser from the `--browser` CLI flag
     * - `{manifestVersion}` - Either "2" or "3"
     *
     * @default "{name}-{version}-{browser}.zip"
     */
    artifactTemplate?: string;
    /**
     * Configure the filename output when zipping files.
     *
     * Available template variables:
     *
     * - `{name}` - The project's name converted to kebab-case
     * - `{version}` - The version_name or version from the manifest
     * - `{browser}` - The target browser from the `--browser` CLI flag
     * - `{manifestVersion}` - Either "2" or "3"
     *
     * @default "{name}-{version}-sources.zip"
     */
    sourcesTemplate?: string;
    /**
     * Override the artifactTemplate's `{name}` template variable. Defaults to the `package.json`'s
     * name, or if that doesn't exist, the current working directories name.
     */
    name?: string;
    /**
     * Root directory to ZIP when generating the sources ZIP.
     *
     * @default config.root
     */
    sourcesRoot?: string;
    /**
     * [Minimatch](https://www.npmjs.com/package/minimatch) patterns of files to exclude when
     * creating a ZIP of all your source code for Firfox. Patterns are relative to your
     * `config.zip.sourcesRoot`.
     *
     * Hidden files, node_modules, and tests are ignored by default.
     *
     * @example
     * [
     *   "coverage", // Ignore the coverage directory in the `sourcesRoot`
     * ]
     */
    ignoredSources?: string[];
  };
}

export interface WxtInlineViteConfig
  extends Omit<vite.InlineConfig, 'root' | 'configFile' | 'mode' | 'build'> {
  build?: Omit<vite.BuildOptions, 'outDir'>;
}

export interface BuildOutput {
  manifest: Manifest.WebExtensionManifest;
  publicAssets: vite.Rollup.OutputAsset[];
  steps: BuildStepOutput[];
}

export interface BuildStepOutput {
  entrypoints: EntrypointGroup;
  chunks: (vite.Rollup.OutputChunk | vite.Rollup.OutputAsset)[];
}

export interface WxtDevServer extends vite.ViteDevServer {
  /**
   * Ex: `3000`
   */
  port: number;
  /**
   * Ex: `"localhost"`
   */
  hostname: string;
  /**
   * Ex: `"http://localhost:3000"`
   */
  origin: string;
  /**
   * Stores the current build output of the server.
   */
  currentOutput: BuildOutput;
  /**
   * Start the server on the first open port.
   */
  start(): Promise<void>;
  /**
   * Tell the extension to reload by running `browser.runtime.reload`.
   */
  reloadExtension: () => void;
  /**
   * Tell an extension page to reload.
   *
   * The path is the bundle path, not the input paths, so if the input paths is
   * "src/options/index.html", you would pass "options.html" because that's where it is written to
   * in the dist directory, and where it's available at in the actual extension.
   *
   * @example
   * server.reloadPage("popup.html")
   * server.reloadPage("sandbox.html")
   */
  reloadPage: (path: string) => void;
  /**
   * Tell the extension to restart a content script.
   *
   * @param contentScript The manifest definition for a content script
   */
  reloadContentScript: (
    contentScript: Omit<Scripting.RegisteredContentScript, 'id'>,
  ) => void;
}

export type TargetBrowser = string;
export type TargetManifestVersion = 2 | 3;

export type UserConfig = Omit<InlineConfig, 'configFile'>;

export interface Logger {
  debug(...args: any[]): void;
  log(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  fatal(...args: any[]): void;
  success(...args: any[]): void;
  level: LogLevel;
}

export interface BaseEntrypointOptions {
  include?: TargetBrowser[];
  exclude?: TargetBrowser[];
}

export interface BaseEntrypoint {
  /**
   * The entrypoint's name. This is the filename or dirname without the type suffix.
   *
   * Examples:
   * - `popup.html` &rarr; `popup`
   * - `options/index.html` &rarr; `options`
   * - `named.sandbox.html` &rarr; `named`
   * - `named.sandbox/index.html` &rarr; `named`
   * - `sandbox.html` &rarr; `sandbox`
   * - `sandbox.index.html` &rarr; `sandbox`
   * - `overlay.content.ts` &rarr; `overlay`
   * - `overlay.content/index.ts` &rarr; `overlay`
   *
   * The name is used when generating an output file:
   * `<entrypoint.outputDir>/<entrypoint.name>.<ext>`
   */
  name: string;
  /**
   * Absolute path to the entrypoint's input file.
   */
  inputPath: string;
  /**
   * Absolute path to the entrypoint's output directory. Can be the`InternalConfg.outDir` or a
   * subdirectory of it.
   */
  outputDir: string;
  options: BaseEntrypointOptions;
}

export interface GenericEntrypoint extends BaseEntrypoint {
  type:
    | 'sandbox'
    | 'bookmarks'
    | 'history'
    | 'newtab'
    | 'sidepanel'
    | 'devtools'
    | 'unlisted-page'
    | 'unlisted-script'
    | 'unlisted-style'
    | 'content-script-style';
}

export interface BackgroundEntrypoint extends BaseEntrypoint {
  type: 'background';
  options: {
    persistent?: boolean;
    type?: 'module';
  } & BaseEntrypointOptions;
}

export interface ContentScriptEntrypoint extends BaseEntrypoint {
  type: 'content-script';
  options: Omit<ContentScriptDefinition, 'main'> & BaseEntrypointOptions;
}

export interface PopupEntrypoint extends BaseEntrypoint {
  type: 'popup';
  options: {
    /**
     * Defaults to "browser_action" to be equivalent to MV3's "action" key
     */
    mv2Key?: 'browser_action' | 'page_action';
    defaultIcon?: Record<string, string>;
    defaultTitle?: string;
  } & BaseEntrypointOptions;
}

export interface OptionsEntrypoint extends BaseEntrypoint {
  type: 'options';
  options: {
    openInTab?: boolean;
    browserStyle?: boolean;
    chromeStyle?: boolean;
  } & BaseEntrypointOptions;
}

export type Entrypoint =
  | GenericEntrypoint
  | BackgroundEntrypoint
  | ContentScriptEntrypoint
  | PopupEntrypoint
  | OptionsEntrypoint;

export type OnContentScriptStopped = (cb: () => void) => void;

export interface ContentScriptDefinition extends ExcludableEntrypoint {
  matches: Manifest.ContentScript['matches'];
  /**
   * See https://developer.chrome.com/docs/extensions/mv3/content_scripts/
   * @default "documentIdle"
   */
  runAt?: Manifest.ContentScript['run_at'];
  /**
   * See https://developer.chrome.com/docs/extensions/mv3/content_scripts/
   * @default false
   */
  matchAboutBlank?: Manifest.ContentScript['match_about_blank'];
  /**
   * See https://developer.chrome.com/docs/extensions/mv3/content_scripts/
   * @default []
   */
  excludeMatches?: Manifest.ContentScript['exclude_matches'];
  /**
   * See https://developer.chrome.com/docs/extensions/mv3/content_scripts/
   * @default []
   */
  includeGlobs?: Manifest.ContentScript['include_globs'];
  /**
   * See https://developer.chrome.com/docs/extensions/mv3/content_scripts/
   * @default []
   */
  excludeGlobs?: Manifest.ContentScript['exclude_globs'];
  /**
   * See https://developer.chrome.com/docs/extensions/mv3/content_scripts/
   * @default false
   */
  allFrames?: Manifest.ContentScript['all_frames'];
  /**
   * See https://developer.chrome.com/docs/extensions/mv3/content_scripts/
   * @default false
   */
  matchOriginAsFallback?: boolean;
  /**
   * See https://developer.chrome.com/docs/extensions/mv3/content_scripts/
   * @default "ISOLATED"
   */
  world?: 'ISOLATED' | 'MAIN';
  /**
   * Main function executed when the content script is loaded.
   */
  main(ctx: ContentScriptContext): void | Promise<void>;
}

export interface BackgroundScriptDefintition extends ExcludableEntrypoint {
  type?: 'module';
  main(): void;
}

export interface ExcludableEntrypoint {
  /**
   * List of target browsers to include this entrypoint in. Defaults to being included in all
   * builds. Cannot be used with `exclude`. You must choose one of the two options.
   *
   * @default undefined
   */
  include?: TargetBrowser[];
  /**
   * List of target browsers to exclude this entrypoint from. Cannot be used with `include`. You
   * must choose one of the two options.
   *
   * @default undefined
   */
  exclude?: TargetBrowser[];
}

/**
 * Manifest customization available in the `wxt.config.ts` file. You cannot configure entrypoints
 * here, they are configured inline.
 */
export type UserManifest = Partial<
  Omit<
    Manifest.WebExtensionManifest,
    | 'action'
    | 'background'
    | 'browser_action'
    | 'chrome_url_overrides'
    | 'devtools_page'
    | 'manifest_version'
    | 'options_page'
    | 'options_ui'
    | 'sandbox'
    | 'page_action'
    | 'popup'
    | 'sidepanel'
    | 'sidebar_action'
  >
>;

export type UserManifestFn = (
  env: ConfigEnv,
) => UserManifest | Promise<UserManifest>;

export interface ConfigEnv {
  mode: string;
  command: 'build' | 'serve';
  /**
   * Browser passed in from the CLI
   */
  browser: TargetBrowser;
  /**
   * Manifest version passed in from the CLI
   */
  manifestVersion: 2 | 3;
}

/**
 * Configure how the browser starts up.
 */
export interface ExtensionRunnerConfig {
  /**
   * @see https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#browser-console
   */
  openConsole?: boolean;
  /**
   * @see https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#devtools
   */
  openDevtools?: boolean;
  /**
   * List of browser names and the binary that should be used to open the browser.
   *
   * @see https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#chromium-binary
   * @see https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#firefox
   */
  binaries?: Record<string, string>;
  /**
   * @see https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#firefox-profile
   */
  firefoxProfile?: string;
  /**
   * @see https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#chromium-profile
   */
  chromiumProfile?: string;
  /**
   * @see https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#pref
   */
  firefoxPrefs?: Record<string, string>;
  /**
   * @see https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#args
   */
  firefoxArgs?: string[];
  /**
   * @see https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#args
   */
  chromiumArgs?: string[];
  /**
   * @see https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#start-url
   */
  startUrls?: string[];
}

export type WxtViteConfig = Omit<
  vite.UserConfig,
  'root' | 'configFile' | 'mode'
>;
