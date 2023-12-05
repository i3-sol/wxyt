import * as vite from 'vite';
import { InternalConfig } from '~/types';
import { getGlobals } from '~/core/utils/globals';

export function globals(
  config: Omit<InternalConfig, 'builder'>,
): vite.PluginOption {
  return {
    name: 'wxt:globals',
    config() {
      const define: vite.InlineConfig['define'] = {};
      for (const global of getGlobals(config)) {
        define[global.name] = JSON.stringify(global.value);
      }
      return {
        define,
      };
    },
  };
}
