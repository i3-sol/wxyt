# Defining Entrypoints

An "entrypoint" is any HTML, JS, or CSS file that needs to be bundled and included with the extension.

Entrypoints may or may not be listed in the extension's `manifest.json`.

## `/entrypoints` Directory

In WXT, entrypoints are defined by adding a file to the `entrypoints/` directory.

For example, a project that looks like this:

```
<rootDir>
└─ entrypoints/
   ├─ background.ts
   ├─ content.ts
   ├─ injected.ts
   └─ popup.html
```

would result in the following `manifest.json`:

```json
{
  // ...
  "manifest_version": 3,
  "action": {
    // ...
    "default_popup": "popup.html"
  },
  "background": {
    // ...
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      // ...
      "js": ["content-scripts/content.js"]
    }
  ]
}
```

If a file uses a special name recognized by WXT, it will be added to the manifest. In this case:

- `popup.html` &rarr; `action.default_popup`
- `content.ts` &rarr; `content_scripts.0.js.0`
- `background.ts` &rarr; `background.service_worker`

But not all entrypoints are added to the `manifest.json`. If the filename is not recognized by WXT, they are still built and included in the extension, but they are considered "unlisted" and are not apart of the manifest.

In this case, `injected.ts` gets output to `<outdir>/injected.js` and is accessible via `browser.runtime.getURL("/injected.js")`.

:::info
See [`/entrypoints` folder](/entrypoints/background) documentation for a full list of recognized entrypoint filenames.
:::

## Entrypoint Options

Some entrypoints, like content scripts, actions, or the background, can recieve additional options.

In HTML files, options are listed as `meta` tags:

```html
<html>
  <head>
    <!-- Defining the popup's "default_icon" field -->
    <meta name="manifest.default_icon" content="{ '16': '/icon/16.png' }" />
  </head>
</html>
```

In TS files, options are apart of the file's default export:

```ts
export default defineContentScript({
  matches: ['*://*.google.com/*'],
  runAt: 'document_start',
  main() {
    // ...
  },
});
```

:::info
For a full list of entrypoints and each of their options, see the [`/entrypoints` folder](/entrypoints/background) documentation.
:::
