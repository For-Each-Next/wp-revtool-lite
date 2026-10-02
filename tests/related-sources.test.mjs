/**
 * @file tests/related-sources.test.mjs
 * Purpose: tests / related sources.test module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. setup
 * 4. Test scenarios
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { vueSfcPlugin } from '../scripts/build-plugins.mjs';
import { JSDOM } from 'jsdom';
import { compileModule } from './helpers/load-module.mjs';

const createRelatedSources = await compileModule(
    'platform/browser/dom/related-sources.ts',
);
const createAnchors = await compileModule(
    'platform/browser/dom/annotation-anchor.ts',
);
const marker = (id, reference, label) =>
    `<sup class="reference" id="${id}"><a href="#${reference}">[${label}]</a></sup>`;
const citation = (id, anchors, source) =>
    `<li id="${id}"><span class="mw-cite-backlink">${anchors.map((anchor) => `<a href="#${anchor}">↑</a>`).join(' ')}</span><span class="reference-text"><cite>${source}</cite></span></li>`;

function setup(t) {
    const dom = new JSDOM(
        `<!doctype html><html lang="zh-Hant"><body><div id="app"></div><main id="article">
        <p><span class="sentence" id="first">這款遊戲於2023年正式發售。</span><span class="sentence" id="second-wrapper">${marker('cite_ref-test_3-0', 'cite_note-test-3', 3)}${marker('cite_ref-4', 'cite_note-4', 4)}<span id="second">遊戲採用全新的戰鬥系統。</span>${marker('cite_ref-5', 'cite_note-5', 5)}</span></p>
        <p id="no-source">這是沒有來源的段落。</p>
        <p>其他段落${marker('cite_ref-test_3-1', 'cite_note-test-3', 3)}</p>
        <ol>${citation('cite_note-test-3', ['cite_ref-test_3-0', 'cite_ref-test_3-1'], '<a class="external text" href="https://example.com/article">Article</a>. （<a class="external text" href="https://web.archive.org/web/20230901000000/https://example.com/article">原始內容</a>存檔於2023-09-01）.')}
        ${citation('cite_note-4', ['cite_ref-4'], '<a class="external text" href="https://news.example.org/story">Review</a>.')}
        ${citation('cite_note-5', ['cite_ref-5'], '<a class="external text" href="https://another.example.org/story">Other</a>.')}</ol>
        </main></body></html>`,
        {
            url: 'https://zh.wikipedia.org/wiki/Test',
            runScripts: 'outside-only',
        },
    );
    t.after(() => dom.window.close());
    const { window } = dom;
    const { document, Node, NodeFilter, Element, URL } = window;
    const mw = {
        config: { get: (key) => (key === 'wgRevisionId' ? 12345 : 'Reviewer') },
    };
    const globals = { window, document, Node, NodeFilter, Element, URL, mw };
    const { collectRelatedSources } = createRelatedSources(globals);
    const anchors = createAnchors(globals);
    const root = document.querySelector('#article');
    const select = (id, start = 0, end) => {
        const text = document.getElementById(id).firstChild;
        const range = document.createRange();
        range.setStart(text, start);
        range.setEnd(text, end ?? text.length);
        return range;
    };
    const sources = (range) =>
        Array.from(collectRelatedSources(root, range), (source) => ({
            ...source,
        }));
    return { window, document, root, mw, select, sources, ...anchors };
}

test('related sources match selected sentences across wrappers and exclude adjacent sentences', (t) => {
    const { document, root, select, sources } = setup(t);
    const firstRange = select('first', 2, 5);
    assert.deepEqual(
        sources(firstRange).map((source) => source.label),
        ['3a', '4'],
    );
    assert.deepEqual(
        sources(firstRange).map(({ title, url }) => ({ title, url })),
        [
            { title: 'Article', url: 'https://example.com/article' },
            { title: 'Review', url: 'https://news.example.org/story' },
        ],
    );
    assert.equal(
        sources(firstRange)[0].wikitext,
        '[[Special:Permalink/12345#cite_ref-test_3-0|Ref. 3a]]<small>（[https://example.com/article example.com]，[https://web.archive.org/web/20230901000000/https://example.com/article 2023年9月存]）</small>',
    );
    assert.deepEqual(
        sources(select('second', 0, 4)).map((source) => source.label),
        ['5'],
    );
    const sentenceClick = document.createRange();
    sentenceClick.selectNodeContents(document.getElementById('second-wrapper'));
    assert.deepEqual(
        sources(sentenceClick).map((source) => source.label),
        ['5'],
    );
    const spanning = select('first', 2, 5);
    spanning.setEnd(document.getElementById('second').firstChild, 4);
    assert.deepEqual(
        sources(spanning).map((source) => source.label),
        ['3a', '4', '5'],
    );

    const firstText = document.getElementById('first').firstChild;
    for (const wrapper of [...root.querySelectorAll('.sentence')])
        wrapper.replaceWith(...wrapper.childNodes);
    const unwrapped = document.createRange();
    unwrapped.setStart(firstText, 2);
    unwrapped.setEnd(firstText, 5);
    assert.deepEqual(
        sources(unwrapped).map((source) => source.label),
        ['3a', '4'],
    );
});

test('editing saved comments restores sources while missing or uncited selections stay empty', (t) => {
    const {
        document,
        root,
        select,
        sources,
        buildArticleTextIndex,
        findAnnotationRange,
    } = setup(t);
    const annotation = {
        sentenceText: document.getElementById('first').textContent,
        sectionPath: 'Test',
    };
    const restored = findAnnotationRange(
        buildArticleTextIndex(root),
        annotation,
        () => 'Test',
    );
    assert.deepEqual(
        sources(restored).map((source) => source.label),
        ['3a', '4'],
    );
    assert.deepEqual(sources(null), []);
    assert.deepEqual(sources(select('no-source')), []);
    document.getElementById('cite_note-4').remove();
    assert.deepEqual(
        sources(select('first')).map((source) => source.label),
        ['3a'],
    );
});

const editorBundle = await build({
    stdin: {
        contents: `import Editor from './src/features/annotations/components/annotation-editor.vue';
            import * as Vue from 'vue';
            export { Editor, Vue }; export { setVueRuntime } from './src/platform/mediawiki/vue-runtime';`,
        resolveDir: resolve('.'),
        loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'editorTest',
    define: {
        __VUE_OPTIONS_API__: 'true',
        __VUE_PROD_DEVTOOLS__: 'false',
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
    plugins: [vueSfcPlugin],
});

test('comment dialog shows source titles and copy buttons without changing the opinion', async (t) => {
    const { window, document, mw, select, sources } = setup(t);
    const copies = [];
    window.mw = mw;
    Object.defineProperty(window.navigator, 'clipboard', {
        value: { writeText: async (text) => copies.push(text) },
    });
    window.eval(editorBundle.outputFiles[0].text);
    const { Editor, Vue } = window.editorTest;
    window.editorTest.setVueRuntime(Vue);
    const { createApp, h, nextTick } = Vue;
    // Preserve letters and subreference numbering exactly as supplied by Cite.
    const relatedSources = sources(select('first')).map((source, index) => ({
        ...source,
        label: ['22a', '23.5b'][index],
        wikitext: source.wikitext.replace(
            `|Ref. ${source.label}]]`,
            `|Ref. ${['22a', '23.5b'][index]}]]`,
        ),
    }));
    const app = createApp(Editor, {
        sentenceText: '原文',
        relatedSources,
        initialOpinion: 'Existing comment',
    });
    const components = {
        CdxDialog: (_, { slots }) =>
            h('section', { role: 'dialog' }, slots.default?.()),
        CdxButton: (_, { attrs, slots }) =>
            h('button', { ...attrs, type: 'button' }, slots.default?.()),
        CdxField: (_, { slots }) => h('div', slots.default?.()),
        CdxMessage: (_, { slots }) =>
            h('div', { role: 'status' }, slots.default?.()),
        CdxTextArea: (props) => h('textarea', { value: props.modelValue }),
    };
    for (const [name, component] of Object.entries(components))
        app.component(name, component);
    app.mount('#app');
    t.after(() => app.unmount());
    const items = [
        ...document.querySelectorAll(
            '.review-tool-annotation-editor__sources li',
        ),
    ];
    assert.deepEqual(
        items.map((item) => item.querySelector('a').textContent),
        ['Article', 'Review'],
    );
    assert.deepEqual(
        items.map((item) => item.querySelector('a').href),
        relatedSources.map((source) => source.url),
    );
    assert.deepEqual(
        items.map(
            (item) =>
                item.querySelector('.review-tool-source-copy').textContent,
        ),
        ['複製22a', '複製23.5b'],
    );
    assert.equal(
        document.querySelectorAll(
            '.review-tool-annotation-editor__sources button',
        ).length,
        2,
    );
    assert.equal(
        document.querySelector('.review-tool-annotation-editor__sources code'),
        null,
    );
    const quote = document.querySelector(
        '.review-tool-annotation-editor__quote',
    );
    const input = document.querySelector('textarea');
    assert.ok(
        quote.compareDocumentPosition(items[0]) &
            window.Node.DOCUMENT_POSITION_FOLLOWING,
    );
    assert.ok(
        items.at(-1).compareDocumentPosition(input) &
            window.Node.DOCUMENT_POSITION_FOLLOWING,
    );
    const location = window.location.href;
    document.querySelector('[aria-label="複製22a"]').click();
    await nextTick();
    await nextTick();
    assert.deepEqual(copies, [relatedSources[0].wikitext]);
    // Native buttons own keyboard activation; copying is handled by their click event.
    document.querySelector('[aria-label="複製23.5b"]').click();
    await nextTick();
    await nextTick();
    assert.deepEqual(
        copies,
        relatedSources.map((source) => source.wikitext),
    );
    assert.equal(
        window.location.href,
        location,
        'copy links must not navigate the page',
    );
    assert.equal(input.value, 'Existing comment');
    assert.equal(
        document.querySelector('[role="status"]').textContent,
        '23.5b 已複製。',
    );
});
