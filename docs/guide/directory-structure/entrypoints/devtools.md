# Devtools

[Chrome Docs](https://developer.chrome.com/docs/extensions/mv3/devtools/) &bull; [Firefox Docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/devtools_page)

## Filenames

<EntrypointPatterns
  :patterns="[
    ['devtools.html', 'devtools.html'],
    ['devtools/index.html', 'devtools.html'],
  ]"
/>

## Definition

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- Set include/exclude if the page should be removed from some builds -->
    <meta name="manifest.include" content="['chrome', ...]" />
    <meta name="manifest.exclude" content="['chrome', ...]" />
  </head>
  <body>
    <!-- ... -->
  </body>
</html>
```

## Adding UI Elements

Chrome extensions allow you to add panels and side panes to the devtools window.

![DevTools window showing Elements panel and Styles sidebar pane.](https://developer.chrome.com/static/docs/extensions/how-to/devtools/extend-devtools/image/devtools-window-showing-e-9051f7f0347cd_1920.png)

See the WXT's examples for a full walkthrough of extending the devtools window:

<ExampleList tag="devtools" />
