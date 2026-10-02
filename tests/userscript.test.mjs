/**
 * @file tests/userscript.test.mjs
 * Purpose: tests / userscript.test module.
 *
 * Table of contents:
 * 1. Imports
 * 2. compileApplication
 * 3. setup
 * 4. Constants and state
 * 5. Test scenarios
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import esbuild from 'esbuild';
import { createUserscript } from '../scripts/artifacts.mjs';

async function compileApplication(body) {
    const { outputFiles } = await esbuild.build({
        entryPoints: [
            fileURLToPath(new URL('../src/app/browser.ts', import.meta.url)),
        ],
        bundle: true,
        write: false,
        format: 'esm',
        target: 'es2019',
        plugins: [
            {
                name: 'test-application',
                setup(build) {
                    build.onLoad({ filter: /\/main\.ts$/ }, () => ({
                        // Use the real state module to catch premature MediaWiki access.
                        contents: `import state from '../platform/mediawiki/context';
window.reviewToolModuleUser = state.userName;
export async function init() {
${body}
}`,
                        loader: 'ts',
                        resolveDir: fileURLToPath(
                            new URL('../src/app/', import.meta.url),
                        ),
                    }));
                },
            },
        ],
    });
    return outputFiles[0].text;
}

function setup(mode, { ready = false, dependencyError } = {}) {
    const errors = [];
    const requests = [];
    let removed = false;
    let resolveDependencies;
    const dependencies = new Promise((resolve) => {
        resolveDependencies = resolve;
    });
    const page = vm.createContext({
        console: { error: (...args) => errors.push(args) },
    });
    page.window = page;
    if (ready) page.RLQ = { push: (callback) => callback() };
    const loadMediaWiki = () => {
        page.mw = {
            loader: {
                using: (module) => {
                    requests.push(module);
                    return dependencyError
                        ? Promise.reject(dependencyError)
                        : dependencies;
                },
            },
            config: { get: () => 'Reviewer' },
        };
    };
    if (ready) loadMediaWiki();
    const sandbox = vm.createContext({
        document: {
            createElement: (tag) => {
                assert.equal(tag, 'script');
                return {
                    textContent: '',
                    remove: () => {
                        removed = true;
                    },
                };
            },
            documentElement: {
                appendChild: (script) =>
                    vm.runInContext(script.textContent, page),
            },
        },
    });
    return {
        page,
        requests,
        errors,
        loadMediaWiki,
        resolveDependencies: () => resolveDependencies(),
        run: async (body) => {
            const application = await compileApplication(body);
            if (mode === 'userscript') {
                vm.runInContext(
                    await createUserscript(application, '1.2.3'),
                    sandbox,
                );
                assert.equal(removed, true);
            } else {
                const { code } = await esbuild.transform(application, {
                    format: 'iife',
                    target: 'es2019',
                    minify: true,
                });
                vm.runInContext(code, page);
            }
        },
    };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('userscript metadata identifies the release and limits automatic execution to Chinese Wikipedia', async () => {
    const script = await createUserscript('', '1.2.3');
    assert.ok(
        script.startsWith(
            '// ==UserScript==\n// @name         ReviewToolLite\n',
        ),
    );
    const [metadata, body] = script.split('// ==/UserScript==');
    assert.ok(
        body.includes(
            '// ReviewToolLite (based on [[User:SuperGrey/gadgets/ReviewTool]])\n',
        ),
    );
    assert.ok(
        body.includes(
            '// Original project: https://github.com/QZGao/ReviewTool\n',
        ),
    );
    assert.ok(
        body.includes('// Modifications: For-Each-Next, with AI assistance\n'),
    );
    assert.match(
        metadata,
        /@homepageURL\s+https:\/\/github\.com\/For-Each-Next\/wp-revtool-lite\n/,
    );
    assert.match(metadata, /@version\s+1\.2\.3\n/);
    assert.deepEqual(
        [...metadata.matchAll(/@match\s+(\S+)/g)].map((match) => match[1]),
        ['https://zh.wikipedia.org/*', 'https://zh.m.wikipedia.org/*'],
    );
    assert.match(metadata, /@grant\s+none\n/);
    assert.match(metadata, /@run-at\s+document-end\n/);
    assert.ok(
        metadata
            .trimEnd()
            .split('\n')
            .slice(1)
            .every((line) => line.startsWith('// @')),
    );
    assert.equal(script.match(/\/\/ <nowiki>/g).length, 1);
    assert.equal(script.match(/\/\/ <\/nowiki>/g).length, 1);
    assert.ok(body.startsWith('\n// <nowiki>\n'));
    assert.ok(body.endsWith('// </nowiki>\n'));
});

test('userscript output is deterministic by default and includes the complete license', async () => {
    const script = await createUserscript(
        'window.reviewToolReady = true;',
        '1.2.3',
    );
    assert.equal(
        script,
        await createUserscript('window.reviewToolReady = true;', '1.2.3'),
    );
    assert.doesNotMatch(script, /Timestamp:/);
    assert.match(script, /Copyright \(c\) 2025 Quinn Gao/);
    assert.match(script, /THE SOFTWARE IS PROVIDED "AS IS"/);
});

for (const mode of ['userscript', 'bundle']) {
    test(`${mode} waits for MediaWiki and dependencies before evaluating application modules`, async () => {
        const {
            run,
            page,
            requests,
            errors,
            loadMediaWiki,
            resolveDependencies,
        } = setup(mode);
        await run('window.reviewToolUser = mw.config.get("wgUserName");');
        assert.equal(page.RLQ.length, 1);
        assert.equal(page.reviewToolModuleUser, undefined);
        assert.equal(page.reviewToolUser, undefined);
        assert.deepEqual(requests, []);
        loadMediaWiki();
        page.RLQ.shift()();
        await settle();
        assert.deepEqual(requests, ['mediawiki.util']);
        assert.equal(page.reviewToolModuleUser, undefined);
        assert.equal(page.reviewToolUser, undefined);
        resolveDependencies();
        await settle();
        assert.equal(page.reviewToolModuleUser, 'Reviewer');
        assert.equal(page.reviewToolUser, 'Reviewer');
        assert.deepEqual(errors, []);
    });

    test(`${mode} runs in the page context after startup and preserves embedded code characters`, async () => {
        const { run, page, errors, resolveDependencies } = setup(mode, {
            ready: true,
        });
        const text = '批註 "quoted" `template` ${literal} </script>\n\\';
        await run(`window.reviewToolText = ${JSON.stringify(text)};`);
        resolveDependencies();
        await settle();
        assert.equal(page.reviewToolModuleUser, 'Reviewer');
        assert.equal(page.reviewToolText, text);
        assert.deepEqual(errors, []);
    });

    test(`${mode} reports dependency failures without evaluating application modules`, async () => {
        const failure = new Error('ResourceLoader failed');
        const { run, page, errors } = setup(mode, {
            ready: true,
            dependencyError: failure,
        });
        await run('window.reviewToolStarted = true;');
        await settle();
        assert.equal(page.reviewToolModuleUser, undefined);
        assert.equal(page.reviewToolStarted, undefined);
        assert.equal(errors.length, 1);
        assert.equal(errors[0][1], failure);
    });

    test(`${mode} reports application initialization failures`, async () => {
        const { run, page, errors, resolveDependencies } = setup(mode, {
            ready: true,
        });
        await run('throw new Error("Application failed");');
        resolveDependencies();
        await settle();
        assert.equal(page.reviewToolModuleUser, 'Reviewer');
        assert.equal(errors.length, 1);
        assert.equal(errors[0][1].message, 'Application failed');
    });

    test(`${mode} initializes once when the script is evaluated twice`, async () => {
        const { run, page, requests, errors, resolveDependencies } = setup(
            mode,
            { ready: true },
        );
        const body =
            'window.reviewToolStarts = (window.reviewToolStarts || 0) + 1;';
        await run(body);
        const startup = page.reviewToolLite;
        await run(body);
        assert.equal(page.reviewToolLite, startup);
        assert.deepEqual(requests, ['mediawiki.util']);
        resolveDependencies();
        await settle();
        assert.equal(page.reviewToolStarts, 1);
        assert.deepEqual(errors, []);
    });

    test(`${mode} allows another startup after an initialization failure`, async () => {
        const { run, page, errors, resolveDependencies } = setup(mode, {
            ready: true,
        });
        resolveDependencies();
        await run('throw new Error("First attempt failed");');
        await settle();
        assert.equal(page.reviewToolLite, undefined);
        await run('window.reviewToolStarted = true;');
        await settle();
        assert.equal(page.reviewToolStarted, true);
        assert.equal(errors.length, 1);
    });
}
