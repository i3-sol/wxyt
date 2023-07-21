import { dirname, join, relative, resolve } from 'path';
import fs from 'fs-extra';
import glob from 'fast-glob';
import { execSync } from 'child_process';
import { InlineConfig, UserConfig, build } from '../src';
import { normalizePath } from '../src/core/utils/paths';

export class TestProject {
  files: Array<[string, string]> = [];
  config: UserConfig | undefined;
  private readonly root: string;

  constructor(root = 'e2e/project') {
    // We can't put each test's project inside e2e/project directly, otherwise the wxt.config.ts
    // file is cached and cannot be different between each test. Instead, we add a random ID to the
    // end to make each test's path unique.
    const id = Math.random().toString(32).substring(3);
    this.root = join(root, id);
    this.files.push([
      'package.json',
      JSON.stringify(
        {
          name: 'E2E Extension',
          description: 'Example description',
          version: '0.0.0-test',
          dependencies: {
            wxt: '../../..',
          },
        },
        null,
        2,
      ),
    ]);
  }

  /**
   * Add a `wxt.config.ts` to the project with specific contents.
   */
  setConfigFileConfig(config: UserConfig = {}) {
    this.config = config;
    this.files.push([
      'wxt.config.ts',
      `import { defineConfig } from 'wxt'\n\nexport default defineConfig(${JSON.stringify(
        config,
        null,
        2,
      )})`,
    ]);
  }

  /**
   * Adds the file to the project. Stored in memory until `.build` is called.
   *
   * @param filename Filename relative to the project's root.
   * @param content File content.
   */
  addFile(filename: string, content?: string) {
    this.files.push([filename, content ?? '']);
    if (filename === 'wxt.config.ts') this.config = {};
  }

  /**
   * Write the files to the test directory install dependencies, and build the project.
   */
  async build(config: InlineConfig = {}) {
    if (this.config == null) this.setConfigFileConfig();

    for (const file of this.files) {
      const [name, content] = file;
      const filePath = resolve(this.root, name);
      const fileDir = dirname(filePath);
      await fs.ensureDir(fileDir);
      await fs.writeFile(filePath, content ?? '', 'utf-8');
    }
    execSync('npm i --ignore-scripts', { cwd: this.root });

    await build({ ...config, root: this.root });
  }

  /**
   * Read all the files from the test project's `.output` directory and combine them into a string
   * that can be used in a snapshot.
   */
  serializeOutput(): Promise<string> {
    return this.serializeDir('.output');
  }

  /**
   * Read all the files from the test project's `.wxt` directory and combine them into a string
   * that can be used in a snapshot.
   */
  serializeWxtDir(): Promise<string> {
    return this.serializeDir(
      resolve(this.config?.srcDir ?? this.root, '.wxt/types'),
    );
  }

  private async serializeDir(dir: string): Promise<string> {
    const outputFiles = await glob('**/*', {
      cwd: resolve(this.root, dir),
    });
    outputFiles.sort();
    const fileContents = [];
    for (const file of outputFiles) {
      const path = resolve(this.root, dir, file);
      fileContents.push(await this.serializeFile(path));
    }
    return fileContents.join(`\n${''.padEnd(80, '=')}\n`);
  }

  /**
   * @param path An abosolute path to a file or a path relative to the root.
   */
  async serializeFile(path: string): Promise<string> {
    const absolutePath = resolve(this.root, path);
    return [
      normalizePath(relative(this.root, absolutePath)),
      await fs.readFile(absolutePath),
    ].join(`\n${''.padEnd(40, '-')}\n`);
  }

  fileExists(path: string): Promise<boolean> {
    return fs.exists(resolve(this.root, path));
  }

  async getOutputManifest(
    path: string = '.output/chrome-mv3/manifest.json',
  ): Promise<any> {
    return await fs.readJson(resolve(this.root, path));
  }
}
