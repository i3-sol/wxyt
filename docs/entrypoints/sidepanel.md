# Side Panel

[Chrome Docs](https://developer.chrome.com/docs/extensions/reference/sidePanel/) &bull; [Firefox Docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Sidebars)

:::warning
Chrome added support for sidepanels in Manifest V3, they are not available in Manfiest V2.
:::

## Filenames

<EntrypointPatterns
  :patterns="[
    ['entrypoints/sidepanel.html', 'sidepanel.html'],
    ['entrypoints/sidepanel/index.html', 'sidepanel.html'],
    ['entrypoints/<name>.sidepanel.html', '<name>.html` '],
    ['entrypoints/<name>.sidepanel/index.html', '<name>.html` '],
  ]"
/>

## Definition

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Title</title>
    <!-- Set include/exclude if the page should be removed from some builds -->
    <meta name="manifest.include" content="['chrome', ...]" />
    <meta name="manifest.exclude" content="['chrome', ...]" />
  </head>
  <body>
    <!-- ... -->
  </body>
</html>
```
