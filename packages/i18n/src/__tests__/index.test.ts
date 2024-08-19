import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createI18n } from '../index';
import { GetMessageOptions } from '../types';

const getMessageMock = vi.fn();

vi.stubGlobal('chrome', {
  i18n: {
    getMessage: getMessageMock,
  },
});

describe('createI18n', () => {
  beforeEach(() => {
    getMessageMock.mockReturnValue('Some text.');
  });

  it.each([
    ['key', 'key'],
    ['some_key', 'some_key'],
    ['some.nested.key', 'some_nested_key'],
  ])('should retrieve "%s" as "%s"', (input, expectedKey) => {
    const i18n = createI18n();
    const expectedValue = String(Math.random());
    getMessageMock.mockReturnValue(expectedValue);

    const actual = i18n.t(input);

    expect(actual).toBe(expectedValue);
    expect(getMessageMock).toBeCalledTimes(1);
    expect(getMessageMock).toBeCalledWith(expectedKey, undefined);
  });

  it.each([
    ['n items', 0, 'n items'],
    ['n items', 1, 'n items'],
    ['n items', 2, 'n items'],
    ['n items', 3, 'n items'],
    ['1 item | n items', 0, 'n items'],
    ['1 item | n items', 1, '1 item'],
    ['1 item | n items', 2, 'n items'],
    ['1 item | n items', 3, 'n items'],
    ['0 items | 1 item | n items', 0, '0 items'],
    ['0 items | 1 item | n items', 1, '1 item'],
    ['0 items | 1 item | n items', 2, 'n items'],
    ['0 items | 1 item | n items', 3, 'n items'],
  ])(
    'should retrieve plural forms correctly',
    (rawMessage, count, expected) => {
      const i18n = createI18n();
      getMessageMock.mockReturnValue(rawMessage);
      const key = 'items';

      const actual = i18n.t(key, count);

      expect(actual).toBe(expected);
      expect(getMessageMock).toBeCalledTimes(1);
      expect(getMessageMock).toBeCalledWith(key, [String(count)], undefined);
    },
  );

  it('should allow overriding the plural substitutions', () => {
    const i18n = createI18n();
    i18n.t('key', 3, ['custom']);
    expect(getMessageMock).toBeCalledWith('key', ['custom'], undefined);
  });

  it('should pass options into browser.i18n.getMessage', () => {
    const i18n = createI18n();
    const options: GetMessageOptions = {
      escapeLt: true,
    };

    i18n.t('key', options);
    i18n.t('key', [''], options);
    i18n.t('key', 1, options);
    i18n.t('key', 1, [''], options);
    getMessageMock.mock.calls.forEach((call) => {
      expect(call.pop()).toEqual(options);
    });
  });
});
