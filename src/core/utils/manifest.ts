import { Entrypoint } from '../..';
import { Manifest } from 'webextension-polyfill';
import {
  BackgroundEntrypoint,
  BuildOutput,
  ContentScriptEntrypoint,
  InternalConfig,
  OptionsEntrypoint,
  PopupEntrypoint,
} from '../types';
import fs from 'fs-extra';
import { resolve } from 'path';
import { getEntrypointBundlePath } from './entrypoints';
import { ContentSecurityPolicy } from './ContentSecurityPolicy';

/**
 * Writes the manifest to the output directory and the build output.
 */
export async function writeManifest(
  manifest: Manifest.WebExtensionManifest,
  output: BuildOutput,
  config: InternalConfig,
): Promise<void> {
  const str =
    config.mode === 'production'
      ? JSON.stringify(manifest)
      : JSON.stringify(manifest, null, 2);

  await fs.ensureDir(config.outDir);
  await fs.writeFile(resolve(config.outDir, 'manifest.json'), str, 'utf-8');

  output.publicAssets.unshift({
    type: 'asset',
    fileName: 'manifest.json',
    name: 'manifest',
    needsCodeReference: false,
    source: str,
  });
}

/**
 * Generates the manifest based on the config and entrypoints.
 */
export async function generateMainfest(
  entrypoints: Entrypoint[],
  buildOutput: Omit<BuildOutput, 'manifest'>,
  config: InternalConfig,
): Promise<Manifest.WebExtensionManifest> {
  const pkg = await getPackageJson(config);
  if (pkg.version == null)
    throw Error('package.json does not include a version');
  if (pkg.name == null) throw Error('package.json does not include a name');
  if (pkg.description == null)
    throw Error('package.json does not include a description');

  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: config.manifestVersion,
    name: pkg.name,
    short_name: pkg.shortName,
    version: simplifyVersion(pkg.version),
    version_name: config.browser === 'firefox' ? undefined : pkg.version,
    ...config.manifest,
  };

  addEntrypoints(manifest, entrypoints, buildOutput, config);

  if (config.command === 'serve') addDevModeCsp(manifest, config);

  return manifest;
}

/**
 * Read the package.json from the current directory.
 *
 * TODO: look in root and up directories until it's found
 */
async function getPackageJson(config: InternalConfig): Promise<any> {
  return await fs.readJson(resolve(config.root, 'package.json'));
}

/**
 * Removes suffixes from the version, like X.Y.Z-alpha1 (which brosers don't allow), so it's a
 * simple version number, like X or X.Y or X.Y.Z, which browsers allow.
 */
function simplifyVersion(versionName: string): string {
  // Regex adapted from here: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/version#version_format

  const version = /^((0|[1-9][0-9]{0,8})([.](0|[1-9][0-9]{0,8})){0,3}).*$/.exec(
    versionName,
  )?.[1];

  if (version == null)
    throw Error(
      `Cannot simplify package.json version "${versionName}" to a valid extension version, "X.Y.Z"`,
    );

  return version;
}

function addEntrypoints(
  manifest: Manifest.WebExtensionManifest,
  entrypoints: Entrypoint[],
  buildOutput: Omit<BuildOutput, 'manifest'>,
  config: InternalConfig,
): void {
  const entriesByType = entrypoints.reduce<
    Partial<Record<Entrypoint['type'], Entrypoint[]>>
  >((map, entrypoint) => {
    map[entrypoint.type] ??= [];
    map[entrypoint.type]?.push(entrypoint);
    return map;
  }, {});

  const background = entriesByType['background']?.[0] as
    | BackgroundEntrypoint
    | undefined;
  const bookmarks = entriesByType['bookmarks']?.[0];
  const contentScripts = entriesByType['content-script'] as
    | ContentScriptEntrypoint[]
    | undefined;
  const devtools = entriesByType['devtools']?.[0];
  const history = entriesByType['history']?.[0];
  const newtab = entriesByType['newtab']?.[0];
  const options = entriesByType['options']?.[0] as
    | OptionsEntrypoint
    | undefined;
  const popup = entriesByType['popup']?.[0] as PopupEntrypoint | undefined;
  const sandboxes = entriesByType['sandbox'];
  const sidepanels = entriesByType['sidepanel'];

  if (background) {
    const script = getEntrypointBundlePath(background, config.outDir, '.js');
    if (manifest.manifest_version === 3) {
      manifest.background = {
        type: background.options.type,
        service_worker: script,
      };
    } else {
      manifest.background = {
        persistent: background.options.persistent,
        scripts: [script],
      };
    }
  }

  if (bookmarks) {
    if (config.browser === 'firefox') {
      config.logger.warn(
        'Bookmarks are not supported by Firefox. chrome_url_overrides.bookmarks was not added to the manifest',
      );
    } else {
      manifest.chrome_url_overrides ??= {};
      // @ts-expect-error: bookmarks is untyped in webextension-polyfill, but supported by chrome
      manifest.chrome_url_overrides.bookmarks = getEntrypointBundlePath(
        bookmarks,
        config.outDir,
        '.html',
      );
    }
  }

  if (history) {
    if (config.browser === 'firefox') {
      config.logger.warn(
        'Bookmarks are not supported by Firefox. chrome_url_overrides.history was not added to the manifest',
      );
    } else {
      manifest.chrome_url_overrides ??= {};
      // @ts-expect-error: history is untyped in webextension-polyfill, but supported by chrome
      manifest.chrome_url_overrides.history = getEntrypointBundlePath(
        history,
        config.outDir,
        '.html',
      );
    }
  }

  if (newtab) {
    manifest.chrome_url_overrides ??= {};
    manifest.chrome_url_overrides.newtab = getEntrypointBundlePath(
      newtab,
      config.outDir,
      '.html',
    );
  }

  if (popup) {
    const default_popup = getEntrypointBundlePath(
      popup,
      config.outDir,
      '.html',
    );
    const options: Manifest.ActionManifest = {
      default_icon: popup.options.defaultIcon,
      default_title: popup.options.defaultTitle,
    };
    if (manifest.manifest_version === 3) {
      manifest.action = {
        ...options,
        default_popup,
      };
    } else {
      manifest[popup.options.mv2Key ?? 'browser_action'] = {
        ...options,
        default_popup,
      };
    }
  }

  if (devtools) {
    manifest.devtools_page = getEntrypointBundlePath(
      devtools,
      config.outDir,
      '.html',
    );
  }

  if (options) {
    const page = getEntrypointBundlePath(options, config.outDir, '.html');
    manifest.options_ui = {
      open_in_tab: options.options.openInTab,
      browser_style:
        config.browser === 'firefox' ? options.options.browserStyle : undefined,
      chrome_style:
        config.browser !== 'firefox' ? options.options.chromeStyle : undefined,
      page,
    };
  }

  if (sandboxes?.length) {
    if (config.browser === 'firefox') {
      config.logger.warn(
        'Sandboxed pages not supported by Firefox. sandbox.pages was not added to the manifest',
      );
    } else {
      // @ts-expect-error: sandbox not typed
      manifest.sandbox = {
        pages: sandboxes.map((entry) =>
          getEntrypointBundlePath(entry, config.outDir, '.html'),
        ),
      };
    }
  }

  if (sidepanels?.length) {
    const defaultSidepanel =
      sidepanels.find((entry) => entry.name === 'sidepanel') ?? sidepanels[0];
    const page = getEntrypointBundlePath(
      defaultSidepanel,
      config.outDir,
      '.html',
    );

    if (config.browser === 'firefox') {
      manifest.sidebar_action = {
        // TODO: Add options to side panel
        // ...defaultSidepanel.options,
        default_panel: page,
      };
    } else if (config.manifestVersion === 3) {
      // @ts-expect-error: Untyped
      manifest.side_panel = {
        default_path: page,
      };
    } else {
      config.logger.warn(
        'Side panel not supported by Chromium using MV2. side_panel.default_path was not added to the manifest',
      );
    }
  }

  if (contentScripts?.length) {
    if (config.command === 'serve') {
      const permissionsKey =
        config.manifestVersion === 2 ? 'permissions' : 'host_permissions';
      const hostPermissions = new Set<string>(manifest[permissionsKey] ?? []);
      contentScripts.forEach((script) => {
        script.options.matches.forEach((matchPattern) => {
          hostPermissions.add(matchPattern);
        });
      });
      manifest[permissionsKey] = Array.from(hostPermissions).sort();
    } else {
      const hashToEntrypointsMap = contentScripts.reduce((map, script) => {
        const hash = JSON.stringify(script.options);
        if (!map.has(hash)) {
          map.set(hash, [script]);
        } else {
          map.get(hash)?.push(script);
        }
        return map;
      }, new Map<string, ContentScriptEntrypoint[]>());

      manifest.content_scripts = Array.from(hashToEntrypointsMap.entries()).map(
        ([, scripts]) => ({
          ...scripts[0].options,
          // TOOD: Sorting css and js arrays here so we get consistent test results... but we
          // shouldn't have to. Where is the inconsistency coming from?
          css: getContentScriptCssFiles(scripts, buildOutput)?.sort(),
          js: scripts
            .map((entry) =>
              getEntrypointBundlePath(entry, config.outDir, '.js'),
            )
            .sort(),
        }),
      );
    }
  }
}

function addDevModeCsp(
  manifest: Manifest.WebExtensionManifest,
  config: InternalConfig,
): void {
  const permission = `http://${config.server?.hostname ?? ''}/*`;
  const allowedCsp = config.server?.origin ?? 'http://localhost:*';

  if (manifest.manifest_version === 3) {
    manifest.host_permissions ??= [];
    if (!manifest.host_permissions.includes(permission))
      manifest.host_permissions.push(permission);
  } else {
    manifest.permissions ??= [];
    if (!manifest.permissions.includes(permission))
      manifest.permissions.push(permission);
  }

  const csp = new ContentSecurityPolicy(
    manifest.manifest_version === 3
      ? // @ts-expect-error: extension_pages is not typed
        manifest.content_security_policy?.extension_pages ??
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';" // default CSP for MV3
      : manifest.content_security_policy ??
        "script-src 'self'; object-src 'self';", // default CSP for MV2
  );

  if (config.server) csp.add('script-src', allowedCsp);

  if (manifest.manifest_version === 3) {
    manifest.content_security_policy ??= {};
    // @ts-expect-error: extension_pages is not typed
    manifest.content_security_policy.extension_pages = csp.toString();
  } else {
    manifest.content_security_policy = csp.toString();
  }
}

/**
 * Returns the bundle paths to CSS files associated with a list of content scripts, or undefined if
 * there is no associated CSS.
 */
function getContentScriptCssFiles(
  contentScripts: ContentScriptEntrypoint[],
  buildOutput: Omit<BuildOutput, 'manifest'>,
): string[] | undefined {
  const css: string[] = [];

  const allChunks = buildOutput.steps.flatMap((step) => step.chunks);

  contentScripts.forEach((script) => {
    const relatedCss = allChunks.find(
      (chunk) => chunk.fileName === `assets/${script.name}.css`,
    );
    if (relatedCss) css.push(relatedCss.fileName);
  });

  if (css.length > 0) return css;
  return undefined;
}
