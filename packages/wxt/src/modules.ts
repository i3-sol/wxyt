/**
 * Utilities for creating reusable, build-time modules for WXT.
 *
 * @module wxt/modules
 */
import type {
  Entrypoint,
  Wxt,
  WxtModule,
  WxtModuleOptions,
  WxtModuleSetup,
} from './types';
import * as vite from 'vite';
import glob from 'fast-glob';
import { resolve } from 'node:path';
import type { UnimportOptions } from 'unimport';

// Re-export to prevent TS2742 type errors
export { WxtModule };

export function defineWxtModule<TOptions extends WxtModuleOptions>(
  module: WxtModule<TOptions> | WxtModuleSetup<TOptions>,
): WxtModule<TOptions> {
  if (typeof module === 'function') return { setup: module };
  return module;
}

/**
 * Adds a TS/JS file as an entrypoint to the project. This file will be bundled
 * along with the other entrypoints.

 * If you're publishing the module to NPM, you should probably pre-build the
 * entrypoint and use `addPublicAssets` instead to copy pre-bundled assets into
 * the output directory. This will speed up project builds since it just has to
 * copy some files instead of bundling them.
 *
 * @param wxt The wxt instance provided by the module's setup function.
 * @param entrypoint The entrypoint to be bundled along with the extension.
 *
 * @example
 * export default defineWxtModule((wxt, options) => {
 *   addEntrypoint(wxt, {
 *     type: "unlisted-page",
 *     name: "changelog",
 *     inputPath: "wxt-module-changelog/index.html"
 *     outputDir: wxt.config.outputDir,
 *     options: {},
 *   });
 * });
 */
export function addEntrypoint(wxt: Wxt, entrypoint: Entrypoint): void {
  wxt.hooks.hook('entrypoints:resolved', (wxt, entrypoints) => {
    entrypoints.push(entrypoint);
  });
}

/**
 * Copy files inside a directory (as if it were the public directory) into the
 * extension's output directory. The directory itself is not copied, just the
 * files inside it. If a filename matches an existing one, it is ignored.
 *
 * @param wxt The wxt instance provided by the module's setup function.
 * @param dir The directory to copy.
 *
 * @example
 * export default defineWxtModule((wxt, options) => {
 *   addPublicAssets(wxt, "./dist/prebundled");
 * });
 */
export function addPublicAssets(wxt: Wxt, dir: string): void {
  wxt.hooks.hook('build:publicAssets', async (wxt, files) => {
    const moreFiles = await glob('**/*', { cwd: dir });
    if (moreFiles.length === 0) {
      wxt.logger.warn('No files to copy in', dir);
      return;
    }
    moreFiles.forEach((file) => {
      files.unshift({ absoluteSrc: resolve(dir, file), relativeDest: file });
    });
  });
}

/**
 * Merge additional vite config for one or more entrypoint "groups" that make
 * up individual builds. Config in the project's `wxt.config.ts` file takes
 * precedence over any config added by this function.
 *
 * @param wxt The wxt instance provided by the module's setup function.
 * @param viteConfig A function that returns the vite config the module is
                     adding. Same format as `vite` in `wxt.config.ts`.
 *
 * @example
 * export default defineWxtModule((wxt, options) => {
 *   addViteConfig(wxt, () => ({
 *     build: {
 *       sourceMaps: true,
 *     },
 *   });
 * });
 */
export function addViteConfig(
  wxt: Wxt,
  viteConfig: (env: vite.ConfigEnv) => vite.UserConfig | undefined,
): void {
  wxt.hooks.hook('ready', (wxt) => {
    const userVite = wxt.config.vite;
    wxt.config.vite = async (env) => {
      const fromUser = await userVite(env);
      const fromModule = viteConfig(env) ?? {};
      return vite.mergeConfig(fromModule, fromUser);
    };
  });
}

/**
 * Add a runtime plugin to the project. In each entrypoint, before executing
 * the `main` function, plugins are executed.
 *
 * @param wxt The wxt instance provided by the module's setup function.
 * @param plugin An import from an NPM module, or an absolute file path to the
 *               file to load at runtime.
 *
 * @example
 * export default defineWxtModule((wxt) => {
 *   addWxtPlugin(wxt, "wxt-module-analytics/client-plugin");
 * });
 */
export function addWxtPlugin(wxt: Wxt, plugin: string): void {
  wxt.hooks.hook('ready', (wxt) => {
    wxt.config.plugins.push(plugin);
  });
}

/**
 * Add an Unimport preset ([built-in](https://github.com/unjs/unimport?tab=readme-ov-file#built-in-presets),
 * [custom](https://github.com/unjs/unimport?tab=readme-ov-file#custom-presets),
 * or [auto-scanned](https://github.com/unjs/unimport?tab=readme-ov-file#exports-auto-scan)),
 * to the project's list of auto-imported utilities.
 *
 * Some things to note:
 * - This function will only de-duplicate built-in preset names. It will not
 *   stop you adding duplicate custom or auto-scanned presets.
 * - If the project has disabled imports, this function has no effect.
 *
 * @param wxt The wxt instance provided by the module's setup function.
 * @param preset The preset to add to the project.
 *
 * @example
 * export default defineWxtModule((wxt) => {
 *   // Built-in preset:
 *   addImportPreset(wxt, "vue");
 *   // Custom preset:
 *   addImportPreset(wxt, {
 *     from: "vue",
 *     imports: ["ref", "reactive", ...],
 *   });
 *   // Auto-scanned preset:
 *   addImportPreset(wxt, { package: "vue" });
 * });
 */
export function addImportPreset(
  wxt: Wxt,
  preset: UnimportOptions['presets'][0],
): void {
  wxt.hooks.hook('ready', (wxt) => {
    if (!wxt.config.imports) return;

    wxt.config.imports.presets ??= [];
    // De-dupelicate built-in named presets
    if (wxt.config.imports.presets.includes(preset)) return;

    wxt.config.imports.presets.push(preset);
  });
}
