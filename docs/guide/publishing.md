---
outline: deep
---

# Publishing

WXT will help you ZIP your extensions and submit them to the stores for review.

## First Time Publishing

If you're publishing an extension to a store for the first time, you must manually navigate the process. WXT doesn't help you create listings, each store has unique steps and requirements that you need to familiarize yourself with.

For specific details about each store, see the stores sections below.

- [Chrome Web Store](#chrome-web-store)
- [Firefox Addon Store](#firefox-addon-store)
- [Edge Addons](#edge-addons)

## Automation

WXT provides two commands to help automate the release process:

- `wxt submit`: Submit new versions of your extension for review (and publish them automatically once approved)
- `wxt submit init`: Help setup all the required secrets and options for the `wxt submit` command

To get started, run `wxt submit init` and follow the prompts. Once finished, you should have a `.env.submit` file! WXT will use this file to submit your updates.

> In CI, make sure you add all the environment variables to the submit step.

To release an update, build all the ZIPs you plan on releasing:

```sh
wxt zip
wxt zip -b firefox
```

Then run the `wxt submit` command, passing in all the ZIP files you want to release. In this case, we'll do a release for all 3 major stores: Chrome Web Store, Edge Addons, and Firefox Addons Store.

If it's your first time running the command, you'll want to test your secrets by passing the `--dry-run` flag:

```sh
wxt submit --dry-run \
  --chrome-zip .output/<your-extension>-<version>-chrome.zip \
  --firefox-zip .output/<your-extension>-<version>-firefox.zip --firefox-sources-zip .output/<your-extension>-<version>-sources.zip \
  --edge-zip .output/<your-extension>-<version>-chrome.zip
```

If the dry run passes, remove the flag and do the actual release:

```sh
wxt submit \
  --chrome-zip .output/<your-extension>-<version>-chrome.zip \
  --firefox-zip .output/<your-extension>-<version>-firefox.zip --firefox-sources-zip .output/<your-extension>-<version>-sources.zip \
  --edge-zip .output/<your-extension>-<version>-chrome.zip
```

:::tip
If you only need to release to a single store, only pass that store's ZIP flag.
:::

:::tip
See the [Firefox Addon Store](#firefox-addon-store) section for more details about the `--firefox-sources-zip` option.
:::

## GitHub Action

Here's an example of a GitHub Action to automate submitting new versions of your extension for review. Ensure that you've added all required secrets used in the workflow to the repo's settings.

```yml
# TODO
```

## Stores

### Chrome Web Store

> ✅ Supported &bull; [Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard) &bull; [Publishing Docs](https://developer.chrome.com/docs/webstore/publish/)

To create a ZIP for Chrome:

```sh
wxt zip
```

### Firefox Addon Store

> ✅ Supported &bull; [Developer Dashboard](https://addons.mozilla.org/developers/) &bull; [Publishing Docs](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)

Firefox requires you to upload a ZIP of your source code. This allows them to rebuild your extension and review the code in a readable way. More details can be found in [Firefox's docs](https://extensionworkshop.com/documentation/publish/source-code-submission/).

WXT fully supports generating and automatically submitting a source code ZIP.

When you run `wxt zip -b firefox`, your sources are zipped into the `.output` directory alongside the extension. WXT will automatically exclude certain files such as config files, hidden files, and tests. However, it's important to manually check the ZIP to ensure it only contains the files necessary to rebuild your extension.

To customize which files are zipped, add the `zip` option to your config file.

```ts
// wxt.config.ts
import { defineConfig } from 'wxt';

export default defineConfig({
  zip: {
    // ...
  },
});
```

If it's your first time submitting to the Firefox Addon Store, or if you've updated your project layout, always test your sources ZIP! The commands below should allow you to rebuild your extension from inside the extracted ZIP.

:::code-group

```sh [pnpm]
pnpm i
pnpm zip:firefox
```

```sh [npm]
npm i
npm run zip:firefox
```

```sh [yarn]
yarn
yarn zip:firefox
```

:::

Make sure the build output is the exact same when running `wxt build -b firefox` in your main project and inside the zipped sources.

:::warning
If you use a `.env` files, they can effect the chunk hashes in the output directory. Either delete the .env file before running `wxt zip -b firefox`, or include it in your sources zip with the [`zip.includeSources`](/api/wxt/interfaces/InlineConfig#includesources) option. Be careful to not include any secrets in your `.env` files.

See Issue [#377](https://github.com/wxt-dev/wxt/issues/377) for more details.
:::

Ensure that you have a `README.md` or `SOURCE_CODE_REVIEW.md` file with the above commands so that the Firefox team knows how to build your extension.

### Safari

> 🚧 Not supported yet

WXT does not currently support automated publishing for Safari. Safari extensions require a native MacOS or iOS app wrapper, which WXT does not create yet. For now, if you want to publish to Safari, follow this guide:

- [Converting a web extension for Safari](https://developer.apple.com/documentation/safariservices/safari_web_extensions/converting_a_web_extension_for_safari) - "Convert your existing extension to a Safari web extension using Xcode’s command-line tool."

When running the `safari-web-extension-converter` CLI tool, pass the `.output/safari-mv2` or `.output/safari-mv3` directory, not your source code directory.

```sh
pnpm wxt build -b safari
xcrun safari-web-extension-converter .output/safari-mv2
```

### Edge Addons

> ✅ Supported &bull; [Developer Dashboard](https://aka.ms/PartnerCenterLogin) &bull; [Publishing Docs](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/publish-extension)

No need to create a specific ZIP for Edge. If you're already publishing to the Chrome Web Store, you can reuse your Chrome ZIP.

However, if you have features specifically for Edge, create a separate ZIP with:

```sh
wxt zip -b edge
```
