/**
 * @file scripts/artifacts.mjs
 * Purpose: Compose deterministic distributable scripts with attribution and the full license.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. Initialization and execution
 * 4. validateMetadata
 * 5. createDocumentationHeader
 * 6. createUserscript
 * 7. createBundle
 * 8. createManifest
 * 9. validateArtifact
 * 10. createArtifacts
 */

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';
import { transform } from 'esbuild';

export const repository = 'https://github.com/For-Each-Next/wp-revtool-lite';
export const upstreamRepository = 'https://github.com/QZGao/ReviewTool';
export const attribution =
    'ReviewToolLite (based on [[User:SuperGrey/gadgets/ReviewTool]])';
export const modifications = 'For-Each-Next, with AI assistance';
export const artifactNames = [
    'bundled.js',
    'bundled.min.js',
    'ReviewToolLite.user.js',
];
export const outputOptions = {
    charset: 'utf8',
    target: ['es2022'],
    format: 'iife',
};
const license = (
    await readFile(new URL('../LICENSE', import.meta.url), 'utf8')
).trim();
if (!license.startsWith('MIT License') || license.includes('*/')) {
    throw new Error('The project license cannot be embedded safely.');
}
export const licenseNotice = [
    '/*!',
    ...license.split(/\r?\n/).map((line) => (line ? ` * ${line}` : ' *')),
    ' */',
].join('\n');

function validateMetadata(value, name) {
    if (typeof value !== 'string' || !value || /[\r\n]/.test(value)) {
        throw new Error(`${name} must be a non-empty single line.`);
    }
}

/** The same documentation block appears in every installation artifact. */
export function createDocumentationHeader(version) {
    validateMetadata(version, 'Version');
    return [
        '// <nowiki>',
        '/**',
        ' * ReviewToolLite',
        ' *',
        ' * Purpose: Review articles and provide feedback on Chinese Wikipedia.',
        ' *',
        ' * @name reviewtool',
        ` * @version ${version}`,
        ' * @license MIT',
        ' *',
        ' * Table of contents:',
        ' * 1. Metadata and license notices',
        ' * 2. MediaWiki bootstrap and browser program',
        ' */',
        `// ${attribution}`,
        `// Original project: ${upstreamRepository}`,
        `// Modifications: ${modifications}`,
        `// Repository: ${repository}`,
        `// Release: ${version}`,
        '// License: MIT',
        licenseNotice,
    ].join('\n');
}

export async function createUserscript(application, version) {
    validateMetadata(version, 'Version');
    const header = [
        '// ==UserScript==',
        '// @name         ReviewToolLite',
        `// @namespace    ${repository}`,
        `// @version      ${version}`,
        '// @description  Annotate Chinese Wikipedia articles and copy review feedback as wikitext.',
        '// @author       Quinn Gao (QZGao / SuperGrey) https://zh.wikipedia.org/wiki/User:SuperGrey',
        '// @license      MIT',
        `// @homepageURL  ${repository}`,
        `// @supportURL   ${repository}/issues`,
        `// @downloadURL  ${repository}/releases/download/latest/ReviewToolLite.user.js`,
        `// @updateURL    ${repository}/releases/download/latest/ReviewToolLite.user.js`,
        '// @match        https://zh.wikipedia.org/*',
        '// @match        https://zh.m.wikipedia.org/*',
        '// @run-at       document-end',
        '// @grant        none',
        '// @noframes',
        '// ==/UserScript==',
        createDocumentationHeader(version),
    ].join('\n');
    // The application owns startup; this adapter crosses the userscript sandbox.
    const { code } = await transform(
        `
function reviewToolApplication() {
${application}
}

function installInPage(application) {
    const script = document.createElement('script');
    script.textContent = '(' + application.toString() + ')();';
    document.documentElement.appendChild(script);
    script.remove();
}

installInPage(reviewToolApplication);
`,
        {
            ...outputOptions,
            minify: false,
            banner: header,
            footer: '// </nowiki>',
        },
    );
    return code;
}

export async function createBundle(application, version, minify = false) {
    validateMetadata(version, 'Version');
    const banner = createDocumentationHeader(version);
    const { code } = await transform(application, {
        ...outputOptions,
        minify,
        legalComments: 'none',
        banner,
        footer: '// </nowiki>',
    });
    return code;
}

export function createManifest(artifacts, version) {
    return {
        name: 'ReviewToolLite',
        version,
        license: 'MIT',
        repository,
        files: Object.fromEntries(
            artifactNames.map((name) => {
                const source = artifacts.get(name);
                if (typeof source !== 'string')
                    throw new Error(`Missing artifact: ${name}`);
                return [
                    name,
                    {
                        bytes: Buffer.byteLength(source),
                        sha256: createHash('sha256')
                            .update(source)
                            .digest('hex'),
                    },
                ];
            }),
        ),
    };
}

export function validateArtifact(name, source, version) {
    new Script(source, { filename: name });
    if (
        !source.includes(licenseNotice) ||
        !source.includes(attribution) ||
        !source.includes(upstreamRepository)
    ) {
        throw new Error(`${name} is missing its license or attribution.`);
    }
    if (
        (source.match(/^\/\/ <nowiki>$/gm) ?? []).length !== 1 ||
        (source.match(/^\/\/ <\/nowiki>$/gm) ?? []).length !== 1
    ) {
        throw new Error(`${name} must contain one pair of nowiki guards.`);
    }
    const metadata = name.endsWith('.user.js')
        ? `// @version      ${version}\n`
        : `// Release: ${version}\n`;
    if (!source.includes(metadata))
        throw new Error(`${name} has an incorrect release version.`);
    if (
        name.endsWith('.user.js') &&
        !source.startsWith('// ==UserScript==\n')
    ) {
        throw new Error(`${name} is missing its userscript metadata header.`);
    }
}

export async function createArtifacts(application, version) {
    const sources = await Promise.all([
        createBundle(application, version),
        createBundle(application, version, true),
        createUserscript(application, version),
    ]);
    const artifacts = new Map(
        artifactNames.map((name, index) => [name, sources[index]]),
    );
    for (const [name, source] of artifacts)
        validateArtifact(name, source, version);
    artifacts.set(
        'manifest.json',
        `${JSON.stringify(createManifest(artifacts, version), null, 4)}\n`,
    );
    artifacts.set('LICENSE.txt', `${license}\n`);
    return artifacts;
}
