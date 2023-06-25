import { InlineConfig, InternalConfig, UserConfig } from '../types';
import path, { resolve } from 'node:path';
import * as vite from 'vite';
import { consola } from 'consola';
import { importTsFile } from './importTsFile';
import * as plugins from '../vite-plugins';
import { createFsCache } from './createFsCache';
import { getGlobals } from './globals';

/**
 * Given an inline config, discover the config file if necessary, merge the results, resolve any
 * relative paths, and apply any defaults.
 */
export async function getInternalConfig(
  config: InlineConfig,
  command: 'build' | 'serve',
): Promise<InternalConfig> {
  // Apply defaults to a base config
  const root = config.root ? path.resolve(config.root) : process.cwd();
  const mode =
    config.mode ?? (command === 'build' ? 'production' : 'development');
  const browser = config.browser ?? 'chromium';
  const manifestVersion =
    config.manifestVersion ?? (browser === 'chromium' ? 3 : 2);
  const outBaseDir = path.resolve(root, '.output');
  const outDir = path.resolve(outBaseDir, `${browser}-mv${manifestVersion}`);
  const logger = config.logger ?? consola;

  const baseConfig: InternalConfigNoUserDirs = {
    root,
    outDir,
    outBaseDir,
    storeIds: config.storeIds ?? {},
    browser,
    manifestVersion,
    mode,
    command,
    logger,
    vite: config.vite ?? {},
    manifest: config.manifest ?? {},
    imports: config.imports ?? {},
  };

  // Load user config from file
  let userConfig: UserConfig = {
    mode: config.mode,
  };
  if (config.configFile !== false) {
    userConfig = await importTsFile<UserConfig>(
      path.resolve(config.configFile ?? 'exvite.config.ts'),
    );
  }

  // Merge inline and user configs
  const merged = vite.mergeConfig(
    baseConfig,
    userConfig,
  ) as InternalConfigNoUserDirs;

  // Apply user config and create final config
  const srcDir = userConfig.srcDir ? resolve(root, userConfig.srcDir) : root;
  const entrypointsDir = resolve(
    srcDir,
    userConfig.entrypointsDir ?? 'entrypoints',
  );
  const publicDir = resolve(srcDir, userConfig.publicDir ?? 'public');
  const exviteDir = resolve(srcDir, '.exvite');
  const typesDir = resolve(exviteDir, 'types');

  const finalConfig: InternalConfig = {
    ...merged,
    srcDir,
    entrypointsDir,
    publicDir,
    exviteDir,
    typesDir,
    fsCache: createFsCache(exviteDir),
  };

  // Ensure user customized directories are absolute

  // Customize the default vite config
  finalConfig.vite.root = root;
  finalConfig.vite.configFile = false;
  finalConfig.vite.logLevel = 'silent';

  finalConfig.vite.build ??= {};
  finalConfig.vite.build.outDir = outDir;
  finalConfig.vite.build.emptyOutDir = false;

  finalConfig.vite.plugins ??= [];
  finalConfig.vite.plugins.push(plugins.download(finalConfig));
  finalConfig.vite.plugins.push(plugins.devHtmlPrerender(finalConfig));
  finalConfig.vite.plugins.push(plugins.unimport(finalConfig));
  finalConfig.vite.plugins.push(plugins.virtualEntrypoin('background'));
  finalConfig.vite.plugins.push(plugins.virtualEntrypoin('content-script'));

  finalConfig.vite.define ??= {};
  getGlobals(finalConfig).forEach((global) => {
    finalConfig.vite.define![global.name] = JSON.stringify(global.value);
  });

  return finalConfig;
}

/**
 * Helper type for defining a base config, since user-configurable directories must be set after
 * reading in the user config.
 */
type InternalConfigNoUserDirs = Omit<
  InternalConfig,
  | 'srcDir'
  | 'publicDir'
  | 'entrypointsDir'
  | 'exviteDir'
  | 'typesDir'
  | 'fsCache'
>;
