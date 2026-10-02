/**
 * @file scripts/build.mjs
 * Purpose: Build readable, compact, and userscript distributions from the browser entry point.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. assertLocalDependencies
 * 4. writeDistribution
 * 5. createBuildOptions
 * 6. buildProject
 * 7. runBuild
 * 8. Initialization and execution
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build, context } from 'esbuild';
import { createArtifacts, outputOptions } from './artifacts.mjs';
import { cssTextPlugin, vueSfcPlugin } from './build-plugins.mjs';

export const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

export function assertLocalDependencies(metafile) {
    const bundled = Object.keys(metafile.inputs).filter((path) =>
        /(?:^|[/\\])node_modules[/\\]/.test(path),
    );
    if (bundled.length) {
        throw new Error(
            `Browser dependencies must be supplied by MediaWiki ResourceLoader: ${bundled.join(', ')}`,
        );
    }
}

async function writeDistribution(result, root, outputDirectory) {
    if (result.errors.length) return;
    assertLocalDependencies(result.metafile);
    const application = result.outputFiles?.[0]?.text;
    if (application === undefined)
        throw new Error('esbuild did not return the browser bundle.');
    const { version } = JSON.parse(
        await readFile(join(root, 'package.json'), 'utf8'),
    );
    const artifacts = await createArtifacts(application, version);
    // Validate every complete artifact before replacing any previous deliverable.
    await mkdir(outputDirectory, { recursive: true });
    await Promise.all(
        Array.from(artifacts, ([name, source]) =>
            writeFile(join(outputDirectory, name), source),
        ),
    );
    for (const [name, source] of artifacts) {
        console.log(`Built ${name} (${Buffer.byteLength(source)} bytes)`);
    }
}

export function createBuildOptions({
    root = projectRoot,
    outputDirectory = join(root, 'dist'),
    logLevel = 'info',
} = {}) {
    return {
        absWorkingDir: root,
        entryPoints: ['src/app/browser.ts'],
        outfile: join(outputDirectory, 'bundled.js'),
        bundle: true,
        write: false,
        ...outputOptions,
        format: 'esm',
        minify: false,
        sourcemap: false,
        metafile: true,
        plugins: [
            vueSfcPlugin,
            cssTextPlugin,
            {
                name: 'distribution',
                setup(build) {
                    build.onEnd((result) =>
                        writeDistribution(result, root, outputDirectory),
                    );
                },
            },
        ],
        logLevel,
    };
}

export async function buildProject(options) {
    return build(createBuildOptions(options));
}

export async function runBuild(args = process.argv.slice(2)) {
    try {
        const unsupported = args.filter(
            (arg) => !['--watch', '--release'].includes(arg),
        );
        if (unsupported.length)
            throw new Error(`Unknown build option: ${unsupported.join(', ')}`);
        // Both ordinary and release builds always include readable and compact scripts.
        if (args.includes('--watch')) {
            const watcher = await context(createBuildOptions());
            await watcher.watch();
            console.log('[ReviewTool build] Watching for changes...');
        } else {
            await buildProject();
        }
    } catch (error) {
        console.error('[ReviewTool build] Build failed:', error);
        process.exitCode = 1;
    }
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    await runBuild();
}
