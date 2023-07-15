# Popup

[Chrome Docs](https://developer.chrome.com/docs/extensions/reference/action/) &bull; [Firefox Docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/action)

## Filenames

- `entrypoints/popup.html`
- `entrypoints/popup/index.html`

## Definition

Plain old HTML file.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Default Popup Title</title>
    <meta
      name="manifest.default_icon"
      content="{
        16: '/icon-16.png',
        24: '/icon-24.png',
        ...
      }"
    />
    <meta name="manifest.type" content="page_action|browser_action" />
  </head>
  <body>
    <!-- ... -->
  </body>
</html>
```

> All manifest options default to `undefined` when the `meta` tag is not present.
