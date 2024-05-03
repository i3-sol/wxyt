import systemPath from 'node:path';
import normalize from 'normalize-path';

/**
 * Converts system paths to normalized bundler path. On windows and unix, this returns paths with /
 * instead of \.
 */
export function normalizePath(path: string): string {
  return normalize(path);
}

/**
 * Given a normalized path, convert it to the system path style. On Windows, switch to \, otherwise use /.
 */
export function unnormalizePath(path: string): string {
  return systemPath.normalize(path);
}

export const CSS_EXTENSIONS = ['css', 'scss', 'sass', 'less', 'styl', 'stylus'];

// .module.css files are not supported because these are global CSS files, so using CSS modules doesn't make sense.
export const CSS_EXTENSIONS_PATTERN = `+(${CSS_EXTENSIONS.join('|')})`;
