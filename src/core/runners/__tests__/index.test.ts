import { describe, expect, it, vi } from 'vitest';
import { createExtensionRunner } from '..';
import { fakeInternalConfig } from '../../../testing-utils/fake-objects';
import { mock } from 'vitest-mock-extended';
import { createSafariRunner } from '../safari';
import { ExtensionRunner } from '../extension-runner';
import { createWslRunner } from '../wsl';
import { createManualRunner } from '../manual';
import { isWsl } from '../../utils/wsl';
import { createWebExtRunner } from '../web-ext';

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
    const config = fakeInternalConfig({
      browser: 'safari',
    });
    const safariRunner = mock<ExtensionRunner>();
    createSafariRunnerMock.mockReturnValue(safariRunner);

    await expect(createExtensionRunner(config)).resolves.toBe(safariRunner);
  });

  it('should return a WSL runner when `is-wsl` is true', async () => {
    isWslMock.mockResolvedValueOnce(true);
    const config = fakeInternalConfig({
      browser: 'chrome',
    });
    const wslRunner = mock<ExtensionRunner>();
    createWslRunnerMock.mockReturnValue(wslRunner);

    await expect(createExtensionRunner(config)).resolves.toBe(wslRunner);
  });

  it('should return a manual runner when `runner.disabled` is true', async () => {
    isWslMock.mockResolvedValueOnce(false);
    const config = fakeInternalConfig({
      browser: 'chrome',
      runnerConfig: {
        config: {
          disabled: true,
        },
      },
    });
    const manualRunner = mock<ExtensionRunner>();
    createManualRunnerMock.mockReturnValue(manualRunner);

    await expect(createExtensionRunner(config)).resolves.toBe(manualRunner);
  });

  it('should return a web-ext runner otherwise', async () => {
    const config = fakeInternalConfig({
      browser: 'chrome',
      runnerConfig: {
        config: {
          disabled: undefined,
        },
      },
    });
    const manualRunner = mock<ExtensionRunner>();
    createWebExtRunnerMock.mockReturnValue(manualRunner);

    await expect(createExtensionRunner(config)).resolves.toBe(manualRunner);
  });
});
