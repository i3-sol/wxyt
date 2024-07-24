import type * as vite from 'vite';
import { ResolvedConfig } from '../../../../types';
import { getGlobals } from '../../../utils/globals';

export function globals(config: ResolvedConfig): vite.PluginOption {
  return {
    name: 'wxt:globals',
    config() {
      const define: vite.InlineConfig['define'] = {};
      for (const global of getGlobals(config)) {
        define[`import.meta.env.${global.name}`] = JSON.stringify(global.value);
      }
      return {
        define,
      };
    },
  };
}
