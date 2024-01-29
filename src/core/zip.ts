import { InlineConfig } from '~/types';
import zipdir from 'zip-dir';
import { dirname, relative, resolve } from 'node:path';
import fs from 'fs-extra';
import { kebabCaseAlphanumeric } from '~/core/utils/strings';
import { getPackageJson } from '~/core/utils/package';
import { minimatch } from 'minimatch';
import { formatDuration } from '~/core/utils/time';
import { printFileList } from '~/core/utils/log/printFileList';
import { getInternalConfig, internalBuild } from '~/core/utils/building';

/**
 * Build and zip the extension for distribution.
 * @param config Opitonal config that will override your `<root>/wxt.config.ts`.
 * @returns A list of all files included in the ZIP.
 */
export async function zip(config?: InlineConfig): Promise<string[]> {
  const internalConfig = await getInternalConfig(config ?? {}, 'build');
  const output = await internalBuild(internalConfig);

  const start = Date.now();
  internalConfig.logger.info('Zipping extension...');
  const zipFiles: string[] = [];

  const projectName =
    internalConfig.zip.name ??
    kebabCaseAlphanumeric(
      (await getPackageJson(internalConfig))?.name || dirname(process.cwd()),
    );
  const applyTemplate = (template: string): string =>
    template
      .replaceAll('{{name}}', projectName)
      .replaceAll('{{browser}}', internalConfig.browser)
      .replaceAll(
        '{{version}}',
        output.manifest.version_name ?? output.manifest.version,
      )
      .replaceAll('{{manifestVersion}}', `mv${internalConfig.manifestVersion}`);

  await fs.ensureDir(internalConfig.outBaseDir);

  // ZIP output directory

  const outZipFilename = applyTemplate(internalConfig.zip.artifactTemplate);
  const outZipPath = resolve(internalConfig.outBaseDir, outZipFilename);
  await zipdir(internalConfig.outDir, {
    saveTo: outZipPath,
  });
  zipFiles.push(outZipPath);

  // ZIP sources for Firefox

  if (internalConfig.browser === 'firefox') {
    const sourcesZipFilename = applyTemplate(
      internalConfig.zip.sourcesTemplate,
    );
    const sourcesZipPath = resolve(
      internalConfig.outBaseDir,
      sourcesZipFilename,
    );
    await zipdir(internalConfig.zip.sourcesRoot, {
      saveTo: sourcesZipPath,
      filter(path) {
        const relativePath = relative(internalConfig.zip.sourcesRoot, path);

        return (
          internalConfig.zip.includeSources.some((pattern) =>
            minimatch(relativePath, pattern),
          ) ||
          !internalConfig.zip.excludeSources.some((pattern) =>
            minimatch(relativePath, pattern),
          )
        );
      },
    });
    zipFiles.push(sourcesZipPath);
  }

  await printFileList(
    internalConfig.logger.success,
    `Zipped extension in ${formatDuration(Date.now() - start)}`,
    internalConfig.outBaseDir,
    zipFiles,
  );

  return zipFiles;
}
