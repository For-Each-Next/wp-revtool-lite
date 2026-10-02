/**
 * @file tests/startup.test.mjs
 * Purpose: tests / startup.test module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. setup
 * 4. Test scenarios
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { compileModule } from './helpers/load-module.mjs';

const publicApi = await compileModule('index.ts');
const { outputFiles } = await build({
    entryPoints: ['src/app/main.ts'],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'startupTest',
    plugins: [
        {
            name: 'host-fixtures',
            setup(builder) {
                builder.onLoad({ filter: /article-controller\.ts$/ }, () => ({
                    contents:
                        'export function addMainPageReviewToolButtonsToDOM(page) { window.renderedPages.push(page); }',
                    loader: 'ts',
                }));
                builder.onLoad({ filter: /\.css$/ }, () => ({
                    contents: 'export default "body {}";',
                    loader: 'js',
                }));
            },
        },
    ],
});

function setup(t, { namespace = 0, action = 'view', hookError } = {}) {
    const dom = new JSDOM('<!doctype html><head></head><body></body>', {
        runScripts: 'outside-only',
    });
    t.after(() => dom.window.close());
    const { window } = dom;
    const requests = [];
    const hooks = [];
    const warnings = [];
    window.renderedPages = [];
    window.console.warn = (...args) => warnings.push(args);
    window.mw = {
        config: {
            get: (key) =>
                key === 'wgNamespaceNumber'
                    ? namespace
                    : key === 'wgAction'
                      ? action
                      : 'Test_article',
        },
        loader: {
            using: async (name) => {
                requests.push(name);
                return () => ({ convByVar: (variants) => variants.hans });
            },
        },
        hook: () => ({
            add: (callback) => {
                if (hookError && !hooks.length) {
                    hooks.push(null);
                    throw hookError;
                }
                hooks.push(callback);
                callback();
            },
        }),
    };
    vm.runInContext(outputFiles[0].text, dom.getInternalVMContext());
    return { window, hooks, requests, warnings, ...window.startupTest };
}

test('public operations import without browser or MediaWiki globals', () => {
    const api = publicApi({});
    assert.equal(api.normalizeAnnotation(null), null);
    assert.equal(api.compareOrderKeys('2.10', '2.2'), 8);
    assert.equal(api.buildWritingReviewWikitext([], {}), '');
    assert.equal(api.getAnnotationTimeRange([]), null);
});

test('parallel and repeated initialization install one stylesheet and one content hook', async (t) => {
    const { init, window, requests, hooks } = setup(t);
    await Promise.all([init(), init(), init()]);
    await init();
    assert.deepEqual(requests, []);
    assert.equal(hooks.length, 1);
    assert.equal(
        window.document.querySelectorAll('#review-tool-styles').length,
        1,
    );
    assert.deepEqual([...window.renderedPages], ['Test_article']);
    hooks[0]();
    assert.deepEqual(
        [...window.renderedPages],
        ['Test_article', 'Test_article'],
    );
});

test('ineligible pages have no stylesheet, module request or content hook', async (t) => {
    const { init, window, requests, hooks } = setup(t, { namespace: 1 });
    await init();
    assert.equal(window.document.getElementById('review-tool-styles'), null);
    assert.deepEqual(requests, []);
    assert.deepEqual(hooks, []);
});

test('a failed host hook can be retried without duplicating styles', async (t) => {
    const error = new Error('Host not ready');
    const { init, window, hooks } = setup(t, { hookError: error });
    await assert.rejects(init(), error);
    await init();
    assert.equal(hooks.length, 2);
    assert.equal(
        window.document.querySelectorAll('#review-tool-styles').length,
        1,
    );
    assert.deepEqual([...window.renderedPages], ['Test_article']);
});

test('source editing pages never install article controls or stylesheet', async (t) => {
    const { init, window, requests, hooks } = setup(t, { action: 'edit' });
    const editor = window.document.createElement('textarea');
    editor.id = 'wpTextbox1';
    editor.value = 'Unsaved source text';
    window.document.body.append(editor);
    await init();
    assert.equal(editor.value, 'Unsaved source text');
    assert.equal(window.document.getElementById('review-tool-styles'), null);
    assert.deepEqual(requests, []);
    assert.deepEqual(hooks, []);
});
