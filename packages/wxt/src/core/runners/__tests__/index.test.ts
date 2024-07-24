import { describe, expect, it, vi } from 'vitest';
import { createExtensionRunner } from '..';
import { setFakeWxt } from '../../utils/testing/fake-objects';
import { mock } from 'vitest-mock-extended';
import { createSafariRunner } from '../safari';
import { createWslRunner } from '../wsl';
import { createManualRunner } from '../manual';
import { isWsl } from '../../utils/wsl';
import { createWebExtRunner } from '../web-ext';
import { ExtensionRunner } from '../../../types';

vi.mock('../../utils/wsl');
const isWslMock = vi.mocked(isWsl);

vi.mock('../safari');
const createSafariRunnerMock = vi.mocked(createSafariRunner);

vi.mock('../wsl');
const createWslRunnerMock = vi.mocked(createWslRunner);

vi.mock('../manual');
const createManualRunnerMock = vi.mocked(createManualRunner);

vi.mock('../web-ext');
const createWebExtRunnerMock = vi.mocked(createWebExtRunner);

describe('createExtensionRunner', () => {
  it('should return a Safari runner when browser is "safari"', async () => {
    setFakeWxt({
      config: {
        browser: 'safari',
      },
    });
    const safariRunner = mock<ExtensionRunner>();
    createSafariRunnerMock.mockReturnValue(safariRunner);

    await expect(createExtensionRunner()).resolves.toBe(safariRunner);
  });

  it('should return a WSL runner when `is-wsl` is true', async () => {
    isWslMock.mockResolvedValueOnce(true);
    setFakeWxt({
      config: {
        browser: 'chrome',
      },
    });
    const wslRunner = mock<ExtensionRunner>();
    createWslRunnerMock.mockReturnValue(wslRunner);

    await expect(createExtensionRunner()).resolves.toBe(wslRunner);
  });

  it('should return a manual runner when `runner.disabled` is true', async () => {
    isWslMock.mockResolvedValueOnce(false);
    setFakeWxt({
      config: {
        browser: 'chrome',
        runnerConfig: {
          config: {
            disabled: true,
          },
        },
      },
    });
    const manualRunner = mock<ExtensionRunner>();
    createManualRunnerMock.mockReturnValue(manualRunner);

    await expect(createExtensionRunner()).resolves.toBe(manualRunner);
  });

  it('should return a web-ext runner otherwise', async () => {
    setFakeWxt({
      config: {
        browser: 'chrome',
        runnerConfig: {
          config: {
            disabled: undefined,
          },
        },
      },
    });
    const manualRunner = mock<ExtensionRunner>();
    createWebExtRunnerMock.mockReturnValue(manualRunner);

    await expect(createExtensionRunner()).resolves.toBe(manualRunner);
  });
});
