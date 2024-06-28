import { describe, it, vi, beforeEach, expect } from 'vitest';
import { build } from '~/core/build';
import { createServer } from '~/core/create-server';
import { zip } from '~/core/zip';
import { prepare } from '~/core/prepare';
import { clean } from '~/core/clean';
import { initialize } from '~/core/initialize';
import { mock } from 'vitest-mock-extended';
import consola from 'consola';

vi.mock('~/core/build');
const buildMock = vi.mocked(build);

vi.mock('~/core/create-server');
const createServerMock = vi.mocked(createServer);

vi.mock('~/core/zip');
const zipMock = vi.mocked(zip);

vi.mock('~/core/prepare');
const prepareMock = vi.mocked(prepare);

vi.mock('~/core/clean');
const cleanMock = vi.mocked(clean);

vi.mock('~/core/initialize');
const initializeMock = vi.mocked(initialize);

consola.wrapConsole();

const ogArgv = process.argv;

function mockArgv(...args: string[]) {
  process.argv = ['/bin/node', 'bin/wxt.mjs', ...args];
}

async function importCli() {
  await import('~/cli');
}

describe('CLI', () => {
  beforeEach(() => {
    vi.resetModules();
    process.argv = ogArgv;
    createServerMock.mockResolvedValue(mock());
  });

  describe('dev', () => {
    it('should not pass any config when no flags are passed', async () => {
      mockArgv();
      await importCli();

      expect(createServerMock).toBeCalledWith({});
    });

    it('should respect passing a custom root', async () => {
      mockArgv('path/to/root');
      await importCli();

      expect(createServerMock).toBeCalledWith({
        root: 'path/to/root',
      });
    });

    it('should respect a custom config file', async () => {
      mockArgv('-c', './path/to/config.ts');
      await importCli();

      expect(createServerMock).toBeCalledWith({
        configFile: './path/to/config.ts',
      });
    });

    it('should respect passing a custom mode', async () => {
      mockArgv('-m', 'development');
      await importCli();

      expect(createServerMock).toBeCalledWith({
        mode: 'development',
      });
    });

    it('should respect passing a custom browser', async () => {
      mockArgv('-b', 'firefox');
      await importCli();

      expect(createServerMock).toBeCalledWith({
        browser: 'firefox',
      });
    });

    it('should pass correct filtered entrypoints', async () => {
      mockArgv('-e', 'popup', '-e', 'options');
      await importCli();

      expect(createServerMock).toBeCalledWith({
        filterEntrypoints: ['popup', 'options'],
      });
    });

    it('should respect passing --mv2', async () => {
      mockArgv('--mv2');
      await importCli();

      expect(createServerMock).toBeCalledWith({
        manifestVersion: 2,
      });
    });

    it('should respect passing --mv3', async () => {
      mockArgv('--mv3');
      await importCli();

      expect(createServerMock).toBeCalledWith({
        manifestVersion: 3,
      });
    });

    it('should respect passing --port', async () => {
      const expectedPort = 3100;
      mockArgv('--port', String(expectedPort));
      await importCli();

      expect(createServerMock).toBeCalledWith({
        dev: {
          server: {
            port: expectedPort,
          },
        },
      });
    });

    it('should respect passing --debug', async () => {
      mockArgv('--debug');
      await importCli();

      expect(createServerMock).toBeCalledWith({
        debug: true,
      });
    });
  });

  describe('build', () => {
    it('should not pass any config when no flags are passed', async () => {
      mockArgv('build');
      await importCli();

      expect(buildMock).toBeCalledWith({});
    });

    it('should respect passing a custom root', async () => {
      mockArgv('build', 'path/to/root');
      await importCli();

      expect(buildMock).toBeCalledWith({
        root: 'path/to/root',
      });
    });

    it('should respect a custom config file', async () => {
      mockArgv('build', '-c', './path/to/config.ts');
      await importCli();

      expect(buildMock).toBeCalledWith({
        configFile: './path/to/config.ts',
      });
    });

    it('should respect passing a custom mode', async () => {
      mockArgv('build', '-m', 'development');
      await importCli();

      expect(buildMock).toBeCalledWith({
        mode: 'development',
      });
    });

    it('should respect passing a custom browser', async () => {
      mockArgv('build', '-b', 'firefox');
      await importCli();

      expect(buildMock).toBeCalledWith({
        browser: 'firefox',
      });
    });

    it('should pass correct filtered entrypoints', async () => {
      mockArgv('build', '-e', 'popup', '-e', 'options');
      await importCli();

      expect(buildMock).toBeCalledWith({
        filterEntrypoints: ['popup', 'options'],
      });
    });

    it('should respect passing --mv2', async () => {
      mockArgv('build', '--mv2');
      await importCli();

      expect(buildMock).toBeCalledWith({
        manifestVersion: 2,
      });
    });

    it('should respect passing --mv3', async () => {
      mockArgv('build', '--mv3');
      await importCli();

      expect(buildMock).toBeCalledWith({
        manifestVersion: 3,
      });
    });

    it('should include analysis in the build', async () => {
      mockArgv('build', '--analyze');
      await importCli();

      expect(buildMock).toBeCalledWith({
        analysis: {
          enabled: true,
        },
      });
    });

    it('should respect passing --debug', async () => {
      mockArgv('build', '--debug');
      await importCli();

      expect(buildMock).toBeCalledWith({
        debug: true,
      });
    });
  });

  describe('zip', () => {
    it('should not pass any config when no flags are passed', async () => {
      mockArgv('zip');
      await importCli();

      expect(zipMock).toBeCalledWith({});
    });

    it('should respect passing a custom root', async () => {
      mockArgv('zip', 'path/to/root');
      await importCli();

      expect(zipMock).toBeCalledWith({
        root: 'path/to/root',
      });
    });

    it('should respect a custom config file', async () => {
      mockArgv('zip', '-c', './path/to/config.ts');
      await importCli();

      expect(zipMock).toBeCalledWith({
        configFile: './path/to/config.ts',
      });
    });

    it('should respect passing a custom mode', async () => {
      mockArgv('zip', '-m', 'development');
      await importCli();

      expect(zipMock).toBeCalledWith({
        mode: 'development',
      });
    });

    it('should respect passing a custom browser', async () => {
      mockArgv('zip', '-b', 'firefox');
      await importCli();

      expect(zipMock).toBeCalledWith({
        browser: 'firefox',
      });
    });

    it('should respect passing --mv2', async () => {
      mockArgv('zip', '--mv2');
      await importCli();

      expect(zipMock).toBeCalledWith({
        manifestVersion: 2,
      });
    });

    it('should respect passing --mv3', async () => {
      mockArgv('zip', '--mv3');
      await importCli();

      expect(zipMock).toBeCalledWith({
        manifestVersion: 3,
      });
    });

    it('should respect passing --debug', async () => {
      mockArgv('zip', '--debug');
      await importCli();

      expect(zipMock).toBeCalledWith({
        debug: true,
      });
    });
  });

  describe('prepare', () => {
    it('should not pass any config when no flags are passed', async () => {
      mockArgv('prepare');
      await importCli();

      expect(prepareMock).toBeCalledWith({});
    });

    it('should respect passing a custom root', async () => {
      mockArgv('prepare', 'path/to/root');
      await importCli();

      expect(prepareMock).toBeCalledWith({
        root: 'path/to/root',
      });
    });

    it('should respect a custom config file', async () => {
      mockArgv('prepare', '-c', './path/to/config.ts');
      await importCli();

      expect(prepareMock).toBeCalledWith({
        configFile: './path/to/config.ts',
      });
    });

    it('should respect passing --debug', async () => {
      mockArgv('prepare', '--debug');
      await importCli();

      expect(prepareMock).toBeCalledWith({
        debug: true,
      });
    });
  });

  describe('clean', () => {
    it('should not pass any config when no flags are passed', async () => {
      mockArgv('clean');
      await importCli();

      expect(cleanMock).toBeCalledWith({});
    });

    it('should respect passing a custom root', async () => {
      mockArgv('clean', 'path/to/root');
      await importCli();

      expect(cleanMock).toBeCalledWith({ root: 'path/to/root' });
    });

    it('should respect a custom config file', async () => {
      mockArgv('clean', '-c', './path/to/config.ts');
      await importCli();

      expect(cleanMock).toBeCalledWith({
        configFile: './path/to/config.ts',
      });
    });

    it('should respect passing --debug', async () => {
      mockArgv('clean', '--debug');
      await importCli();

      expect(cleanMock).toBeCalledWith({
        debug: true,
      });
    });
  });

  describe('init', () => {
    it('should not pass any options when no flags are passed', async () => {
      mockArgv('init');
      await importCli();

      expect(initializeMock).toBeCalledWith({});
    });

    it('should respect the provided folder', async () => {
      mockArgv('init', 'path/to/folder');
      await importCli();

      expect(initializeMock).toBeCalledWith({
        directory: 'path/to/folder',
      });
    });

    it('should respect passing --template', async () => {
      mockArgv('init', '-t', 'vue');
      await importCli();

      expect(initializeMock).toBeCalledWith({
        template: 'vue',
      });
    });

    it('should respect passing --pm', async () => {
      mockArgv('init', '--pm', 'pnpm');
      await importCli();

      expect(initializeMock).toBeCalledWith({
        packageManager: 'pnpm',
      });
    });
  });
});
