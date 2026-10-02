/**
 * @file tests/copy-review.test.mjs
 * Purpose: tests / copy review.test module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. setup
 * 4. Test scenarios
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import { compileModule } from './helpers/load-module.mjs';

const createReview = await compileModule('app/copy-review.ts');
const introduction =
    '意見由[https://github.com/For-Each-Next/wp-revtool-lite ReviewToolLite]協助生成。\n\n';
const groups = [
    {
        sectionPath: '序言',
        annotations: [
            {
                id: 'test',
                sectionPath: '序言',
                sentencePos: '1',
                createdAt: 1,
                sentenceText: '原文',
                opinion: '建議',
            },
        ],
    },
];

function setup(
    window = new JSDOM('', { url: 'https://zh.wikipedia.org/' }).window,
) {
    const config = {
        wgPageName: '測試_條目',
        wgRevisionId: 123,
        wgUserName: 'Reviewer',
    };
    const copied = [];
    const failures = { api: false, clipboard: false };
    const api = createReview({
        window,
        document: window.document,
        HTMLElement: window.HTMLElement,
        navigator: {
            clipboard: {
                async writeText(text) {
                    if (failures.clipboard) throw new Error('Clipboard denied');
                    copied.push(text);
                },
            },
        },
        console: { error() {} },
        mw: {
            config: { get: (key) => config[key] },
            loader: { using: async () => {} },
            notify() {},
            Api: class {
                async get() {
                    if (failures.api) throw new Error('Network error');
                    return {
                        query: {
                            pages: [
                                {
                                    revisions: [
                                        { timestamp: '2026-01-02T03:04:00Z' },
                                    ],
                                },
                            ],
                        },
                    };
                }
            },
        },
    });
    return { api, window, config, copied, failures };
}

test('introduces the first copied review above its content and omits the line on later copies', async () => {
    const { api, window, copied } = setup();
    assert.equal(await api.copyWritingReview(groups), true);
    assert.ok(
        copied[0].startsWith(`${introduction}'''[[測試_條目#序言|序言]]'''`),
    );
    assert.match(copied[0], /# \{\{rvw\|1=原文\}\} —— 建議\n--~~~~$/);
    assert.equal(await api.copyWritingReview(groups), true);
    assert.equal(copied[1], copied[0].slice(introduction.length));

    const reloaded = setup(window);
    // MediaWiki page names with spaces or underscores identify the same page.
    reloaded.config.wgPageName = '測試 條目';
    reloaded.config.wgRevisionId = 124;
    assert.equal(await reloaded.api.copyWritingReview(groups), true);
    assert.ok(!reloaded.copied[0].includes(introduction));
});

test('another page receives its own first-use introduction', async () => {
    const { api, config, copied } = setup();
    await api.copyWritingReview(groups);
    config.wgPageName = '另一條目';
    await api.copyWritingReview(groups);
    assert.ok(copied[1].startsWith(introduction));
    config.wgPageName = '測試_條目';
    await api.copyWritingReview(groups);
    assert.ok(!copied[2].includes(introduction));
});

test('empty reviews and failed copies do not consume the first-use introduction', async () => {
    const { api, failures, copied } = setup();
    assert.equal(await api.copyWritingReview([]), false);
    failures.api = true;
    assert.equal(await api.copyWritingReview(groups), false);
    failures.api = false;
    failures.clipboard = true;
    assert.equal(await api.copyWritingReview(groups), false);
    assert.equal(copied.length, 0);
    failures.clipboard = false;
    assert.equal(await api.copyWritingReview(groups), true);
    assert.ok(copied[0].startsWith(introduction));
});

test('session storage remembers copies across reloads when local storage is blocked', async () => {
    const { window, api, copied } = setup();
    Object.defineProperty(window, 'localStorage', {
        get() {
            throw new Error('Storage access denied');
        },
    });
    assert.equal(await api.copyWritingReview(groups), true);
    assert.ok(copied[0].startsWith(introduction));
    const reloaded = setup(window);
    assert.equal(await reloaded.api.copyWritingReview(groups), true);
    assert.ok(!reloaded.copied[0].includes(introduction));
});

test('copying still works and remembers this visit when all storage writes fail', async () => {
    const { window, api, copied } = setup();
    window.Storage.prototype.setItem = () => {
        throw new Error('Storage quota exceeded');
    };
    assert.equal(await api.copyWritingReview(groups), true);
    assert.ok(copied[0].startsWith(introduction));
    assert.equal(await api.copyWritingReview(groups), true);
    assert.equal(copied[1], copied[0].slice(introduction.length));
});
