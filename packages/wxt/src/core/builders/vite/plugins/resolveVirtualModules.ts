import { Plugin } from 'vite';
import { ResolvedConfig } from '../../../../types';
import { normalizePath } from '../../../utils/paths';
import {
  VirtualModuleId,
  virtualModuleNames,
} from '../../../utils/virtual-modules';
import fs from 'fs-extra';
import { resolve } from 'path';

/**
 * Resolve all the virtual modules to the `node_modules/wxt/dist/virtual` directory.
 */
export function resolveVirtualModules(config: ResolvedConfig): Plugin[] {
  return virtualModuleNames.map((name) => {
    const virtualId: `${VirtualModuleId}?` = `virtual:wxt-${name}?`;
    const resolvedVirtualId = '\0' + virtualId;
    return {
      name: `wxt:resolve-virtual-${name}`,
      resolveId(id) {
        // Id doesn't start with prefix, it looks like this:
        // /path/to/project/virtual:wxt-background?/path/to/project/entrypoints/background.ts
        const index = id.indexOf(virtualId);
        if (index === -1) return;

        const inputPath = normalizePath(id.substring(index + virtualId.length));
        return resolvedVirtualId + inputPath;
      },
      async load(id) {
        if (!id.startsWith(resolvedVirtualId)) return;

        const inputPath = id.replace(resolvedVirtualId, '');
        const template = await fs.readFile(
          resolve(config.wxtModuleDir, `dist/virtual/${name}.mjs`),
          'utf-8',
        );
        return template.replace(`virtual:user-${name}`, inputPath);
      },
    };
  });
}
