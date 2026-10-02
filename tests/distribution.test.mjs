/**
 * @file tests/distribution.test.mjs
 * Purpose: tests / distribution.test module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Test scenarios
 */

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Script } from 'node:vm';
import {
    artifactNames,
    createArtifacts,
    licenseNotice,
    validateArtifact,
} from '../scripts/artifacts.mjs';
import { assertLocalDependencies, buildProject } from '../scripts/build.mjs';
import { checkDistribution } from '../scripts/check-dist.mjs';

test('distribution includes deterministic readable, compact, and userscript artifacts', async () => {
    const application =
        'function startReview() { window.reviewToolMessage = "批註"; } startReview();';
    const artifacts = await createArtifacts(application, '1.2.3');
    assert.deepEqual(artifacts, await createArtifacts(application, '1.2.3'));
    for (const name of artifactNames) {
        const source = artifacts.get(name);
        assert.ok(source.includes(licenseNotice));
        assert.doesNotMatch(source, /Timestamp:/);
        assert.doesNotThrow(() => new Script(source, { filename: name }));
    }
    assert.ok(artifacts.get('bundled.js').includes('function startReview()'));
    assert.ok(
        artifacts
            .get('ReviewToolLite.user.js')
            .includes('function reviewToolApplication()'),
    );
    assert.ok(
        artifacts.get('bundled.min.js').length <
            artifacts.get('bundled.js').length,
    );
    const manifest = JSON.parse(artifacts.get('manifest.json'));
    assert.equal(manifest.version, '1.2.3');
    assert.deepEqual(Object.keys(manifest.files), artifactNames);
    for (const name of artifactNames) {
        assert.equal(
            manifest.files[name].bytes,
            Buffer.byteLength(artifacts.get(name)),
        );
        assert.match(manifest.files[name].sha256, /^[0-9a-f]{64}$/);
    }
});

test('distribution rejects invalid JavaScript before it can be published', async () => {
    await assert.rejects(createArtifacts('function broken( {', '1.2.3'));
});

test('artifact verification catches missing license and incorrect release metadata', async () => {
    const artifacts = await createArtifacts('window.ready = true;', '1.2.3');
    assert.throws(
        () =>
            validateArtifact(
                'bundled.js',
                artifacts.get('bundled.js').replace(licenseNotice, ''),
                '1.2.3',
            ),
        /license or attribution/,
    );
    assert.throws(
        () =>
            validateArtifact(
                'bundled.js',
                artifacts.get('bundled.js'),
                '1.2.4',
            ),
        /incorrect release version/,
    );
});

test('browser dependency check rejects bundled runtimes supplied by ResourceLoader', () => {
    assert.doesNotThrow(() =>
        assertLocalDependencies({ inputs: { 'src/app/browser.ts': {} } }),
    );
    for (const path of [
        'node_modules/vue/index.js',
        '/project/node_modules/vue/index.js',
        'C:\\project\\node_modules\\vue\\index.js',
    ]) {
        assert.throws(
            () => assertLocalDependencies({ inputs: { [path]: {} } }),
            /MediaWiki ResourceLoader/,
        );
    }
});

test('production build verifies every artifact and detects an altered bundle', async (t) => {
    const outputDirectory = await mkdtemp(join(tmpdir(), 'reviewtool-dist-'));
    t.after(() => rm(outputDirectory, { recursive: true, force: true }));
    await buildProject({ outputDirectory, logLevel: 'silent' });
    const manifest = await checkDistribution({ outputDirectory });
    assert.deepEqual(Object.keys(manifest.files), artifactNames);
    const original = await readFile(
        join(outputDirectory, 'bundled.js'),
        'utf8',
    );
    await writeFile(
        join(outputDirectory, 'bundled.js'),
        `${original}\n// Altered after build\n`,
    );
    await assert.rejects(
        checkDistribution({ outputDirectory }),
        /manifest does not match/,
    );
});
