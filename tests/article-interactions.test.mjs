/**
 * @file tests/article-interactions.test.mjs
 * Purpose: tests / article interactions.test module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. setup
 * 4. Test scenarios
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const { outputFiles } = await build({
    stdin: {
        contents: `export { installArticleSelection } from './src/platform/browser/dom/article-selection';
            export { wrapArticleSentences } from './src/platform/browser/dom/sentence-wrapping';
            export { computeSectionPathFromNode } from './src/platform/browser/dom/article-text';
            export { addMainPageReviewToolButtonsToDOM } from './src/app/article-controller';
            export { default as state } from './src/platform/mediawiki/context';`,
        resolveDir: process.cwd(),
        loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'articleTest',
    plugins: [
        {
            name: 'unused-dialogs',
            setup(builder) {
                builder.onLoad({ filter: /\.vue$/ }, () => ({
                    contents: 'export default {}',
                    loader: 'js',
                }));
            },
        },
    ],
});

function setup(t, content = '<p>第一句。第二句。</p>') {
    const { window } = new JSDOM(
        `<!doctype html><html lang="zh-Hant"><body>
        <ul id="p-cactions"></ul><div id="mw-content-text"><div class="mw-parser-output">${content}</div></div>
        <p id="outside">頁外文字。</p></body></html>`,
        {
            url: 'https://zh.wikipedia.org/wiki/Test',
            runScripts: 'outside-only',
        },
    );
    t.after(() => window.close());
    const { document } = window;
    const timers = new Map();
    let timerId = 0;
    window.setTimeout = (callback) => {
        const id = ++timerId;
        timers.set(id, callback);
        return id;
    };
    window.clearTimeout = (id) => timers.delete(id);
    window.Range.prototype.getBoundingClientRect = () => ({
        left: 100,
        top: 100,
        width: 100,
    });
    window.mw = {
        config: { get: (key) => (key === 'wgRevisionId' ? 123 : 'Reviewer') },
        notify() {},
        util: {
            addPortletLink: (target, href, label, id) => {
                const item = document.createElement('li');
                item.id = id;
                const link = document.createElement('a');
                link.href = href;
                link.textContent = label;
                item.append(link);
                document.getElementById(target).append(item);
                return item;
            },
        },
    };
    window.eval(outputFiles[0].text);
    window.articleTest.state.articleTitle = 'Test';
    const flush = () => {
        const callbacks = [...timers.values()];
        timers.clear();
        callbacks.forEach((callback) => callback());
    };
    const select = (start, end = start) => {
        const range = document.createRange();
        range.selectNodeContents(start);
        if (end !== start) range.setEndAfter(end);
        const selection = document.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new window.Event('selectionchange'));
        return range;
    };
    return {
        window,
        document,
        timers,
        flush,
        select,
        root: document.querySelector('.mw-parser-output'),
        ...window.articleTest,
    };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('delegated sentence clicks and text selection retain text, position and range', (t) => {
    const {
        document,
        root,
        flush,
        installArticleSelection,
        wrapArticleSentences,
    } = setup(t);
    wrapArticleSentences(root);
    const annotations = [];
    const cleanup = installArticleSelection(root, (range, text, position) =>
        annotations.push({ range, text, position }),
    );
    root.querySelector('.sentence').click();
    assert.equal(document.getSelection().toString(), '第一句。');
    const button = document.querySelector('.floating-button');
    assert.equal(button.style.display, 'block');
    button.click();
    flush();
    assert.equal(annotations.length, 1);
    assert.equal(annotations[0].text, '第一句。');
    assert.equal(annotations[0].range.toString(), '第一句。');
    assert.match(annotations[0].position, /^\d+(?:\.\d+)*$/);
    assert.equal(document.getSelection().isCollapsed, true);
    cleanup();
});

test('dragging without a remaining selection never turns into a sentence click', (t) => {
    const {
        window,
        document,
        root,
        flush,
        installArticleSelection,
        wrapArticleSentences,
    } = setup(t);
    wrapArticleSentences(root);
    const cleanup = installArticleSelection(root, () =>
        assert.fail('unexpected annotation'),
    );
    const sentence = root.querySelector('.sentence');
    sentence.dispatchEvent(
        new window.MouseEvent('mousedown', { bubbles: true, clientX: 10 }),
    );
    sentence.dispatchEvent(
        new window.MouseEvent('mouseup', { bubbles: true, clientX: 50 }),
    );
    sentence.click();
    flush();
    assert.equal(document.getSelection().isCollapsed, true);
    assert.equal(
        document.querySelector('.floating-button').style.display,
        'none',
    );
    sentence.dispatchEvent(
        new window.MouseEvent('mousedown', { bubbles: true, clientX: 10 }),
    );
    sentence.dispatchEvent(
        new window.MouseEvent('mouseup', { bubbles: true, clientX: 10 }),
    );
    sentence.click();
    assert.equal(document.getSelection().toString(), '第一句。');
    cleanup();
});

test('selection stays within the article and cleanup cancels pending work and drag state', (t) => {
    const {
        window,
        document,
        root,
        flush,
        select,
        timers,
        installArticleSelection,
    } = setup(t);
    const cleanup = installArticleSelection(root, () =>
        assert.fail('unexpected annotation'),
    );
    select(root.querySelector('p'), document.getElementById('outside'));
    flush();
    assert.equal(
        document.querySelector('.floating-button').style.display,
        'none',
    );
    select(root.querySelector('p'));
    assert.ok(timers.size);
    cleanup();
    flush();
    assert.equal(document.querySelector('.floating-button'), null);
    const cleanupAgain = installArticleSelection(root, () => {});
    document.dispatchEvent(
        new window.MouseEvent('mousedown', { bubbles: true }),
    );
    assert.ok(document.documentElement.classList.contains('rt-selecting'));
    cleanupAgain();
    assert.equal(
        document.documentElement.classList.contains('rt-selecting'),
        false,
    );
    document.dispatchEvent(new window.Event('selectionchange'));
    assert.equal(timers.size, 0);
});

test('footnote clicks retain native navigation while annotation mode is active', (t) => {
    const {
        window,
        document,
        root,
        installArticleSelection,
        wrapArticleSentences,
    } = setup(
        t,
        '<p>正文。<sup class="reference" id="cite_ref-1"><a href="#cite_note-1">[1]</a></sup></p>',
    );
    wrapArticleSentences(root);
    const cleanup = installArticleSelection(root, () =>
        assert.fail('unexpected annotation'),
    );
    const event = new window.MouseEvent('click', {
        bubbles: true,
        cancelable: true,
    });
    root.querySelector('.reference a').dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
    assert.equal(document.getSelection().isCollapsed, true);
    cleanup();
});

test('turning annotation mode off cancels pending work; rerendered content gets fresh listeners', async (t) => {
    const { document, root, flush, select, addMainPageReviewToolButtonsToDOM } =
        setup(t);
    addMainPageReviewToolButtonsToDOM('Test');
    const toggle = () =>
        document.querySelector('#ca-reviewtool-toggle button').click();
    toggle();
    await settle();
    assert.ok(root.querySelector('.sentence'));
    select(root.querySelector('p'));
    toggle();
    flush();
    assert.equal(root.querySelector('.sentence'), null);
    assert.equal(document.querySelector('.floating-button'), null);
    toggle();
    await settle();
    const replacement = root.cloneNode(false);
    replacement.innerHTML = '<p>更新的正文。</p>';
    root.replaceWith(replacement);
    addMainPageReviewToolButtonsToDOM('Test');
    assert.equal(
        root.querySelector('.sentence'),
        null,
        'old content is unwrapped during cleanup',
    );
    const sentence = replacement.querySelector('.sentence');
    assert.ok(sentence);
    document.getSelection().removeAllRanges();
    sentence.click();
    assert.equal(document.getSelection().toString(), '更新的正文。');
    addMainPageReviewToolButtonsToDOM('Test');
    assert.equal(document.querySelectorAll('.floating-button').length, 1);
    assert.equal(
        document.querySelectorAll('.review-tool-global-button').length,
        1,
    );
    toggle();
    flush();
    assert.equal(replacement.querySelector('.sentence'), null);
    assert.equal(document.querySelector('.floating-button'), null);
});

for (const wrapped of [false, true]) {
    test(`section paths skip subsections belonging to earlier siblings (wrapped headings: ${wrapped})`, (t) => {
        const heading = (level, title) => {
            const html = `<h${level} id="${title}">${title}</h${level}>`;
            return wrapped
                ? `<div class="mw-heading mw-heading${level}">${html}</div>`
                : html;
        };
        const { document, computeSectionPathFromNode } = setup(
            t,
            `<p id="lead">導言。</p>${heading(2, 'Parent')}${heading(3, 'Old')}${heading(4, 'OldChild')}
            <p>舊正文。</p>${heading(3, 'Current')}<p id="current">新正文。</p>
            ${heading(4, 'Child')}<p id="child">子節。</p>`,
        );
        assert.equal(
            computeSectionPathFromNode(
                document.getElementById('lead').firstChild,
            ),
            'Test',
        );
        assert.equal(
            computeSectionPathFromNode(
                document.getElementById('current').firstChild,
            ),
            'Parent—Current',
        );
        assert.equal(
            computeSectionPathFromNode(
                document.getElementById('child').firstChild,
            ),
            'Parent—Current—Child',
        );
    });
}
