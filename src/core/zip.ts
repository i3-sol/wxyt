import { InlineConfig } from '~/types';
import path from 'node:path';
import fs from 'fs-extra';
import { kebabCaseAlphanumeric } from '~/core/utils/strings';
import { getPackageJson } from '~/core/utils/package';
import { minimatch } from 'minimatch';
import { formatDuration } from '~/core/utils/time';
import { printFileList } from '~/core/utils/log/printFileList';
import { internalBuild } from '~/core/utils/building';
import { registerWxt, wxt } from './wxt';
import JSZip from 'jszip';
import glob from 'fast-glob';
import { normalizePath } from './utils/paths';

/**
 * Build and zip the extension for distribution.
 * @param config Optional config that will override your `<root>/wxt.config.ts`.
 * @returns A list of all files included in the ZIP.
 */
export async function zip(config?: InlineConfig): Promise<string[]> {
  await registerWxt('build', config);
  const output = await internalBuild();

  const start = Date.now();
  wxt.logger.info('Zipping extension...');
  const zipFiles: string[] = [];

  const projectName =
    wxt.config.zip.name ??
    kebabCaseAlphanumeric(
      (await getPackageJson())?.name || path.dirname(process.cwd()),
    );
  const applyTemplate = (template: string): string =>
    template
      .replaceAll('{{name}}', projectName)
      .replaceAll('{{browser}}', wxt.config.browser)
      .replaceAll(
        '{{version}}',
        output.manifest.version_name ?? output.manifest.version,
      )
      .replaceAll('{{mode}}', wxt.config.mode)
      .replaceAll('{{manifestVersion}}', `mv${wxt.config.manifestVersion}`);

  await fs.ensureDir(wxt.config.outBaseDir);

  // ZIP output directory

  const outZipFilename = applyTemplate(wxt.config.zip.artifactTemplate);
  const outZipPath = path.resolve(wxt.config.outBaseDir, outZipFilename);
  await zipDir(wxt.config.outDir, outZipPath);
  zipFiles.push(outZipPath);

  // ZIP sources for Firefox

  if (wxt.config.browser === 'firefox') {
    const { overrides, files: downloadedPackages } =
      await downloadPrivatePackages();
    const sourcesZipFilename = applyTemplate(wxt.config.zip.sourcesTemplate);
    const sourcesZipPath = path.resolve(
      wxt.config.outBaseDir,
      sourcesZipFilename,
    );
    await zipDir(wxt.config.zip.sourcesRoot, sourcesZipPath, {
      include: wxt.config.zip.includeSources,
      exclude: wxt.config.zip.excludeSources,
      transform(absolutePath, zipPath, content) {
        if (zipPath.endsWith('package.json')) {
          return addOverridesToPackageJson(absolutePath, content, overrides);
        }
      },
      additionalFiles: downloadedPackages,
    });
    zipFiles.push(sourcesZipPath);
  }

  await printFileList(
    wxt.logger.success,
    `Zipped extension in ${formatDuration(Date.now() - start)}`,
    wxt.config.outBaseDir,
    zipFiles,
  );

  return zipFiles;
}
async function zipDir(
  directory: string,
  outputPath: string,
  options?: {
    include?: string[];
    exclude?: string[];
    transform?: (
      absolutePath: string,
      zipPath: string,
      content: string,
    ) => Promise<string | undefined | void> | string | undefined | void;
    additionalWork?: (archive: JSZip) => Promise<void> | void;
    additionalFiles?: string[];
  },
): Promise<void> {
  const archive = new JSZip();
  const files = (
    await glob('**/*', {
      cwd: directory,
      // Ignore node_modules, otherwise this glob step takes forever
      ignore: ['**/node_modules'],
      onlyFiles: true,
    })
  ).filter((relativePath) => {
    return (
      wxt.config.zip.includeSources.some((pattern) =>
        minimatch(relativePath, pattern),
      ) ||
      !wxt.config.zip.excludeSources.some((pattern) =>
        minimatch(relativePath, pattern),
      )
    );
  });
  const filesToZip = [
    ...files,
    ...(options?.additionalFiles ?? []).map((file) =>
      path.relative(directory, file),
    ),
  ];
  for (const file of filesToZip) {
    const absolutePath = path.resolve(directory, file);
    if (file.endsWith('.json')) {
      const content = await fs.readFile(absolutePath, 'utf-8');
      archive.file(
        file,
        (await options?.transform?.(absolutePath, file, content)) || content,
      );
    } else {
      const content = await fs.readFile(absolutePath);
      archive.file(file, content);
    }
  }
  await options?.additionalWork?.(archive);
  const buffer = await archive.generateAsync({ type: 'base64' });
  await fs.writeFile(outputPath, buffer, 'base64');
}

async function downloadPrivatePackages() {
  const overrides: Record<string, string> = {};
  const files: string[] = [];

  if (wxt.config.zip.downloadPackages.length > 0) {
    const _downloadPackages = new Set(wxt.config.zip.downloadPackages);
    const allPackages = await wxt.pm.listDependencies({
      all: true,
      cwd: wxt.config.root,
    });
    const downloadPackages = allPackages.filter((pkg) =>
      _downloadPackages.has(pkg.name),
    );

    for (const pkg of downloadPackages) {
      wxt.logger.info(`Downloading package: ${pkg.name}@${pkg.version}`);
      const id = `${pkg.name}@${pkg.version}`;
      const tgzPath = await wxt.pm.downloadDependency(
        id,
        wxt.config.zip.downloadedPackagesDir,
      );
      files.push(tgzPath);
      overrides[id] = tgzPath;
    }
  }

  return { overrides, files };
}

function addOverridesToPackageJson(
  absolutePackageJsonPath: string,
  content: string,
  overrides: Record<string, string>,
): string {
  if (Object.keys(overrides).length === 0) return content;

  const packageJsonDir = path.dirname(absolutePackageJsonPath);
  const oldPackage = JSON.parse(content);
  const newPackage = {
    ...oldPackage,
    [wxt.pm.overridesKey]: { ...oldPackage[wxt.pm.overridesKey] },
  };
  Object.entries(overrides).forEach(([key, absolutePath]) => {
    newPackage[wxt.pm.overridesKey][key] =
      'file://./' + normalizePath(path.relative(packageJsonDir, absolutePath));
  });
  return JSON.stringify(newPackage, null, 2);
}
