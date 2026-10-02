/**
 * @file scripts/check-dist.mjs
 * Purpose: Verify syntax, license, version, and integrity of the generated distribution.
 *
 * Table of contents:
 * 1. Imports
 * 2. checkDistribution
 * 3. Initialization and execution
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
    artifactNames,
    createManifest,
    validateArtifact,
} from './artifacts.mjs';
import { projectRoot } from './build.mjs';

export async function checkDistribution({
    root = projectRoot,
    outputDirectory = join(root, 'dist'),
} = {}) {
    const { version } = JSON.parse(
        await readFile(join(root, 'package.json'), 'utf8'),
    );
    const sources = await Promise.all(
        artifactNames.map((name) =>
            readFile(join(outputDirectory, name), 'utf8'),
        ),
    );
    const artifacts = new Map(
        artifactNames.map((name, index) => [name, sources[index]]),
    );
    for (const [name, source] of artifacts)
        validateArtifact(name, source, version);
    const actual = JSON.parse(
        await readFile(join(outputDirectory, 'manifest.json'), 'utf8'),
    );
    const expected = createManifest(artifacts, version);
    if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new Error(
            'Distribution manifest does not match the generated files.',
        );
    const [license, distributedLicense] = await Promise.all([
        readFile(join(root, 'LICENSE'), 'utf8'),
        readFile(join(outputDirectory, 'LICENSE.txt'), 'utf8'),
    ]);
    if (license.trim() !== distributedLicense.trim())
        throw new Error(
            'Distribution license differs from the project license.',
        );
    if (Buffer.byteLength(sources[1]) >= Buffer.byteLength(sources[0])) {
        throw new Error(
            'The compact bundle must be smaller than the readable bundle.',
        );
    }
    return expected;
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    try {
        const { version } = await checkDistribution();
        console.log(
            `Verified ReviewToolLite ${version}: syntax, attribution, license, and SHA-256 checksums.`,
        );
    } catch (error) {
        console.error('[ReviewTool distribution] Verification failed:', error);
        process.exitCode = 1;
    }
}
