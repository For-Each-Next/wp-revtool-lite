/**
 * @file scripts/release-notes.mjs
 * Purpose: Validate a version tag and extract the matching reviewed changelog entry.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. extractReleaseNotes
 * 4. writeReleaseNotes
 * 5. Initialization and execution
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectRoot } from './build.mjs';

const releaseVersion =
    /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?$/;

export function extractReleaseNotes(changelog, version, tag) {
    if (!releaseVersion.test(version) || tag !== `v${version}`) {
        throw new Error(
            `Release tag ${tag} must match package version v${version}.`,
        );
    }
    const section = changelog
        .split(/^##\s+/m)
        .slice(1)
        .find((entry) => {
            const heading = entry.split(/\r?\n/, 1)[0].trim();
            const match = heading.match(
                /^(?:\[([^\]\s]+)\]|([^\[\]\s]+))(?:\s+[-—–]\s+.*)?$/,
            );
            return (match?.[1] ?? match?.[2]) === version;
        });
    const notes = section?.split(/\r?\n/).slice(1).join('\n').trim();
    if (!notes)
        throw new Error(
            `CHANGELOG.md must contain release notes for ${version}.`,
        );
    return `${notes}\n`;
}

export async function writeReleaseNotes(
    tag,
    { root = projectRoot, outputDirectory = join(root, 'dist') } = {},
) {
    const [{ version }, changelog] = await Promise.all([
        readFile(join(root, 'package.json'), 'utf8').then(JSON.parse),
        readFile(join(root, 'CHANGELOG.md'), 'utf8'),
    ]);
    const notes = extractReleaseNotes(changelog, version, tag);
    await mkdir(outputDirectory, { recursive: true });
    const output = join(outputDirectory, 'release-notes.md');
    await writeFile(output, notes);
    return output;
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    try {
        const output = await writeReleaseNotes(process.argv[2]);
        console.log(`Release notes written to ${output}.`);
    } catch (error) {
        console.error('[ReviewTool release] Validation failed:', error);
        process.exitCode = 1;
    }
}
