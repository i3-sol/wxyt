# Vite

Under the hood, WXT uses Vite to bundle your web extension.

## Basic Vite Configuration

All of Vite's config can be customized by setting the `vite` configuration in your `wxt.config.ts` file.

```ts
import { defineConfig } from 'wxt';

export default defineConfig({
  vite: () => ({
    // Same as `defineConfig({ ... })` inside vite.config.ts
  }),
});
```

## Using Plugins

Plugins can be passed into the `vite` configuration in your `wxt.config.ts` file, just like any other option.

```ts
import { defineConfig } from 'wxt';

export default defineConfig({
  vite: () => ({
    plugins: [
      // ...
    ],
  }),
});
```

:::warning UNEXPECTED BEHAVIOR
Due to the way WXT orchestrates Vite builds, some plugins may not work as expected. Search [GitHub issues](https://github.com/wxt-dev/wxt/issues?q=is%3Aissue+label%3A%22vite+plugin%22) if you run into issues with a specific plugin.

If one doesn't exist, please open a [new issue](https://github.com/wxt-dev/wxt/issues/new/choose)!
:::
