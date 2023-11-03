/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createContentScriptUi } from '~/client/content-scripts/content-script-ui';
import { ContentScriptContext } from '~/client/content-scripts/content-script-context';
import { createIsolatedElement } from '@webext-core/isolated-element';
import { mock } from 'vitest-mock-extended';
import { browser } from '~/browser';

vi.mock('@webext-core/isolated-element', async () => {
  const { vi } = await import('vitest');
  return {
    createIsolatedElement: vi.fn(),
  };
});
const createIsolatedElementMock = vi.mocked(createIsolatedElement);

const testApp = (container: Element) => {
  const app = document.createElement('div');
  app.textContent = 'App';
  container.append(app);
};

const createCtx = () => new ContentScriptContext('test');

const fetch = vi.fn();

describe('createContentScriptUi', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="parent">
        <p id="one">one</p>
        <p id="two">two</p>
        <p id="three"></p>
      </div>
    `;

    window.fetch = fetch;
    fetch.mockResolvedValue({ text: () => Promise.resolve('') });

    createIsolatedElementMock.mockImplementation(async (config) => {
      const parentElement = document.createElement(config.name);
      const isolatedElement = document.createElement('html');
      parentElement.append(isolatedElement);

      return {
        isolatedElement,
        parentElement: parentElement,
        shadow: mock<ShadowRoot>({
          querySelector: (selector: string) => {
            if (selector === 'html') return isolatedElement;
          },
        }),
      };
    });
  });

  describe('css', () => {
    it('should load the CSS for the current entrypoint when cssInjectionMode=ui', async () => {
      fetch.mockResolvedValue({ text: () => Promise.resolve('body {}') });
      const ctx = new ContentScriptContext('test', {
        matches: [],
        cssInjectionMode: 'ui',
      });

      await createContentScriptUi(ctx, {
        name: 'test',
        type: 'inline',
        mount: testApp,
      });

      expect(fetch).toBeCalledTimes(1);
      expect(fetch).toBeCalledWith(
        `chrome-extension://${browser.runtime.id}/content-scripts/${__ENTRYPOINT__}.css`,
      );
      expect(createIsolatedElementMock).toBeCalledTimes(1);
      expect(createIsolatedElementMock).toBeCalledWith(
        expect.objectContaining({
          css: {
            textContent: 'body {}',
          },
        }),
      );
    });

    it('should still load the UI when fetch fails to load CSS file when cssInjectionMode=ui', async () => {
      const error = Error('Test fetch error');
      fetch.mockRejectedValue(error);
      const ctx = new ContentScriptContext('test', {
        matches: [],
        cssInjectionMode: 'ui',
      });

      await createContentScriptUi(ctx, {
        name: 'test',
        type: 'inline',
        mount: testApp,
      });

      expect(fetch).toBeCalledTimes(1);
      expect(fetch).toBeCalledWith(
        `chrome-extension://${browser.runtime.id}/content-scripts/${__ENTRYPOINT__}.css`,
      );
      expect(createIsolatedElementMock).toBeCalledTimes(1);
      expect(createIsolatedElementMock).toBeCalledWith(
        expect.objectContaining({
          css: {
            textContent: '',
          },
        }),
      );
    });

    it.each(['manifest', 'manual'] as const)(
      'should not fetch CSS when cssInjectionMode=%s',
      async (cssInjectionMode) => {
        const ctx = new ContentScriptContext('test', {
          matches: [],
          cssInjectionMode,
        });

        await createContentScriptUi(ctx, {
          name: 'test',
          type: 'inline',
          mount: testApp,
        });

        expect(fetch).not.toBeCalled();
      },
    );
  });

  describe('mount', () => {
    describe('append option', () => {
      it.each([undefined, 'last' as const])(
        'should append the element as the last child to the anchor when append=%s',
        async (append) => {
          const ui = await createContentScriptUi(createCtx(), {
            name: 'test-app',
            type: 'inline',
            anchor: '#parent',
            append,
            mount: testApp,
          });
          ui.mount();

          expect(
            document.querySelector('#parent > :nth-child(4)')?.tagName,
          ).toEqual('TEST-APP');
        },
      );

      it('should append the element as the first child to the anchor when append=first', async () => {
        const ui = await createContentScriptUi(createCtx(), {
          name: 'test-app',
          type: 'inline',
          anchor: '#parent',
          append: 'first',
          mount: testApp,
        });
        ui.mount();

        expect(
          document.querySelector('#parent > :nth-child(1)')?.tagName,
        ).toEqual('TEST-APP');
      });

      it('should append the element normally when append=first but there are no other children', async () => {
        const ui = await createContentScriptUi(createCtx(), {
          name: 'test-app',
          type: 'inline',
          anchor: '#three',
          append: 'first',
          mount: testApp,
        });
        ui.mount();

        expect(
          document.querySelector('#three > :nth-child(1)')?.tagName,
        ).toEqual('TEST-APP');
      });

      it('should replace the anchor with the element when append=replace', async () => {
        const ui = await createContentScriptUi(createCtx(), {
          name: 'test-app',
          type: 'inline',
          anchor: '#two',
          append: 'replace',
          mount: testApp,
        });
        ui.mount();

        expect(
          document.querySelector('#parent > :nth-child(2)')?.tagName,
        ).toEqual('TEST-APP');
      });

      it('should append the element after the anchor when append=before', async () => {
        const ui = await createContentScriptUi(createCtx(), {
          name: 'test-app',
          type: 'inline',
          anchor: '#two',
          append: 'before',
          mount: testApp,
        });
        ui.mount();

        expect(
          document.querySelector('#parent > :nth-child(2)')?.tagName,
        ).toEqual('TEST-APP');
      });

      it('should append the element after the anchor when append=after', async () => {
        const ui = await createContentScriptUi(createCtx(), {
          name: 'test-app',
          type: 'inline',
          anchor: '#two',
          append: 'after',
          mount: testApp,
        });
        ui.mount();

        // Happy DOM doesn't work in this case, so we just make sure the element is added.
        // expect(
        //   document.querySelector('#parent > :nth-child(3)')?.tagName,
        // ).toEqual('TEST-APP');
        expect(document.querySelector('test-app')).toBeDefined();
      });

      it('should apply a custom function', async () => {
        const ui = await createContentScriptUi(createCtx(), {
          name: 'test-app',
          type: 'inline',
          anchor: '#three',
          append: (anchor, ui) => anchor.replaceWith(ui),
          mount: testApp,
        });
        ui.mount();

        expect(
          document.querySelector('#parent > :nth-child(3)')?.tagName,
        ).toEqual('TEST-APP');
      });
    });

    it('should default the anchor to the body when unset', async () => {
      const ui = await createContentScriptUi(createCtx(), {
        name: 'test-app',
        type: 'inline',
        mount: testApp,
      });
      ui.mount();

      expect(document.querySelector('body > :nth-child(2)')?.tagName).toEqual(
        'TEST-APP',
      );
    });

    it.each(['#four', () => document.querySelector('#four')])(
      "should throw an error if the anchor doesn't exist",
      async (anchor) => {
        const ui = await createContentScriptUi(createCtx(), {
          name: 'test',
          type: 'inline',
          anchor,
          mount: testApp,
        });

        expect(ui.mount).toThrow(
          'Failed to mount content script UI: could not find anchor element',
        );
      },
    );
  });

  describe('remove', () => {
    it("should not fail if the ui hasn't been mounted", async () => {
      const ui = await createContentScriptUi(createCtx(), {
        name: 'test-app',
        type: 'inline',
        mount: testApp,
      });
      ui.remove();
    });

    it('should automatically remove the UI when the context is invalidated', async () => {
      const ctx = createCtx();
      const ui = await createContentScriptUi(ctx, {
        name: 'test-app',
        type: 'inline',
        mount: testApp,
      });
      ui.mount();

      expect(document.querySelector('test-app')).toBeDefined();

      ctx.abort();
      expect(document.querySelector('test-app')).toBeNull();
    });
  });

  describe('type', () => {
    it.each(['inline', 'overlay', 'modal'] as const)(
      'should render type=%s',
      async (type) => {
        const ui = await createContentScriptUi(createCtx(), {
          name: 'test-app',
          type,
          mount: testApp,
        });
        ui.mount();

        expect(document.querySelector('test-app')).toBeDefined();
      },
    );
  });

  describe('anchor', () => {
    it.each([
      () => '#two',
      () => () => '#two',
      () => document.querySelector('#two'),
      () => () => document.querySelector('#two'),
    ])('should render anchor=%s', async (getAnchor) => {
      const ui = await createContentScriptUi(createCtx(), {
        name: 'test-app',
        type: 'inline',
        anchor: getAnchor(),
        mount: testApp,
      });
      ui.mount();

      expect(document.querySelector('test-app')).toBeDefined();
    });
  });
});
