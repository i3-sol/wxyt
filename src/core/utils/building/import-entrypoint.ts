import createJITI, { TransformOptions as JitiTransformOptions } from 'jiti';
import { InternalConfig } from '~/types';
import { createUnimport } from 'unimport';
import fs from 'fs-extra';
import { relative, resolve } from 'node:path';
import { getUnimportOptions } from '~/core/utils/unimport';
import { removeProjectImportStatements } from '~/core/utils/strings';
import { normalizePath } from '~/core/utils/paths';
import { TransformOptions, transformSync } from 'esbuild';
import { fileURLToPath } from 'node:url';

/**
 * Get the value from the default export of a `path`.
 *
 * It works by:
 *
 * 1. Reading the file text
 * 2. Stripping all imports from it via regex
 * 3. Auto-import only the client helper functions
 *
 * This prevents resolving imports of imports, speeding things up and preventing "xxx is not
 * defined" errors.
 *
 * Downside is that code cannot be executed outside of the main fucntion for the entrypoint,
 * otherwise you will see "xxx is not defined" errors for any imports used outside of main function.
 */
export async function importEntrypointFile<T>(
  path: string,
  config: InternalConfig,
): Promise<T> {
  config.logger.debug('Loading file metadata:', path);
  // JITI & Babel uses normalized paths.
  const normalPath = normalizePath(path);

  const unimport = createUnimport({
    ...getUnimportOptions(config),
    // Only allow specific imports, not all from the project
    dirs: [],
  });
  await unimport.init();

  const text = await fs.readFile(path, 'utf-8');
  const textNoImports = removeProjectImportStatements(text);
  const { code } = await unimport.injectImports(textNoImports);
  config.logger.debug(
    ['Text:', text, 'No imports:', textNoImports, 'Code:', code].join('\n'),
  );

  const jiti = createJITI(
    typeof __filename !== 'undefined'
      ? __filename
      : fileURLToPath(import.meta.url),
    {
      cache: false,
      debug: config.debug,
      esmResolve: true,
      alias: {
        'webextension-polyfill': resolve(
          config.root,
          'node_modules/wxt/dist/virtual/mock-browser.js',
        ),
      },
      // Continue using node to load TS files even if `bun run --bun` is detected. Jiti does not
      // respect the custom transform function when using it's native bun option.
      experimentalBun: false,
      // List of extensions to transform with esbuild
      extensions: [
        '.ts',
        '.cts',
        '.mts',
        '.tsx',
        '.js',
        '.cjs',
        '.mjs',
        '.jsx',
      ],
      transform(opts) {
        const isEntrypoint = opts.filename === normalPath;
        return transformSync(
          // Use modified source code for entrypoints
          isEntrypoint ? code : opts.source,
          getEsbuildOptions(opts),
        );
      },
    },
  );

  try {
    const res = await jiti(path);
    return res.default;
  } catch (err) {
    const filePath = relative(config.root, path);
    if (err instanceof ReferenceError) {
      // "XXX is not defined" - usually due to WXT removing imports
      const variableName = err.message.replace(' is not defined', '');
      throw Error(
        `${filePath}: Cannot use imported variable "${variableName}" outside the main function. See https://wxt.dev/guide/entrypoints.html#side-effects`,
        { cause: err },
      );
    } else {
      config.logger.error(err);
      throw Error(`Failed to load entrypoint: ${filePath}`, { cause: err });
    }
  }
}

function getEsbuildOptions(opts: JitiTransformOptions): TransformOptions {
  const isJsx = opts.filename?.endsWith('x');
  return {
    format: 'cjs',
    loader: isJsx ? 'tsx' : 'ts',
    jsx: isJsx ? 'automatic' : undefined,
  };
}
