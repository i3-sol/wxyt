import { defineProject } from 'vitest/config';
import path from 'node:path';
import RandomSeed from 'vitest-plugin-random-seed';
import fs from 'fs-extra';

// Clear e2e test projects
await fs.rm(path.resolve(__dirname, 'e2e/dist'), {
  recursive: true,
  force: true,
});

export default defineProject({
  test: {
    mockReset: true,
    restoreMocks: true,
    setupFiles: ['vitest.setup.ts'],
    testTimeout: 120e3,
  },
  // @ts-expect-error
  plugins: [RandomSeed()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
      'wxt/testing': path.resolve('src/testing'),
      'webextension-polyfill': path.resolve('src/virtual/mock-browser'),
    },
  },
});
