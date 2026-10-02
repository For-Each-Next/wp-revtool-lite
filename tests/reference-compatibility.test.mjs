/**
 * @file tests/reference-compatibility.test.mjs
 * Purpose: tests / reference compatibility.test module.
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

const createReferenceLinks = await compileModule(
    'platform/browser/dom/reference-links.ts',
);
const source = 'https://example.com/article';
const archive = `https://web.archive.org/web/20230901000000/${source}`;
const permalink = '[[Special:Permalink/12345#cite_ref-source_44-2|44c]]';

function setup(t, { backlinks = '', body = '', label = '[44]' } = {}) {
    const dom = new JSDOM(
        `<!doctype html><main><p>${[0, 1, 2]
            .map(
                (index) =>
                    `<sup class="reference" id="cite_ref-source_44-${index}"><a href="#cite_note-source-44">${label}</a></sup>`,
            )
            .join(
                '',
            )}</p><ol><li id="cite_note-source-44">${backlinks}<span class="reference-text">${body}</span></li></ol></main>`,
        {
            url: 'https://zh.wikipedia.org/wiki/Test',
        },
    );
    t.after(() => dom.window.close());
    const { window } = dom;
    const { document, Element, Node, URL } = window;
    const api = createReferenceLinks({
        window,
        document,
        Element,
        Node,
        URL,
        mw: {
            config: {
                get: (key) => (key === 'wgRevisionId' ? 12345 : 'Reviewer'),
            },
        },
    });
    const root = document.querySelector('main');
    const marker = document.getElementById('cite_ref-source_44-2');
    return { api, root, marker, document, window };
}

for (const [name, backlink] of [
    [
        'individual backlink wrappers',
        (index) =>
            `<span class="mw-cite-backlink"><a href="#cite_ref-source_44-${index}">↑</a></span>`,
    ],
    [
        'rel-based backlink wrappers',
        (index) =>
            `<span rel="mw:referencedBy"><a href="#cite_ref-source_44-${index}">↑</a></span>`,
    ],
    [
        'backlink anchors without wrappers',
        (index) =>
            `<a rel="mw:referencedBy" href="#cite_ref-source_44-${index}">↑</a>`,
    ],
    ['replaced or absent backlink markup', () => ''],
]) {
    test(`44c is retained in the menu and wikitext with ${name}`, (t) => {
        const { api, root, marker, document, window } = setup(t, {
            backlinks: [0, 1, 2].map(backlink).join(''),
        });
        assert.equal(api.getReferenceLinkData(root, marker).label, '44c');
        assert.equal(
            api.getReferenceLinkData(root, marker).footnote,
            permalink,
        );
        const cleanup = api.installReferenceLinkTips(root);
        marker.firstChild.dispatchEvent(
            new window.MouseEvent('mouseover', { bubbles: true }),
        );
        assert.ok(
            [...document.querySelectorAll('[role="menuitem"]')].some(
                (button) => button.textContent === '複製44c',
            ),
        );
        cleanup();
    });
}

test('duplicate backlink targets do not shift occurrence letters', (t) => {
    const backlinks = `<span class="mw-cite-backlink">${[0, 0, 1, 2].map((index) => `<a href="#cite_ref-source_44-${index}">↑</a>`).join('')}</span>`;
    const { api, root, marker } = setup(t, { backlinks });
    assert.equal(api.getReferenceLinkData(root, marker).label, '44c');
});

test('a rendered suffix is kept without appending a second letter', (t) => {
    const { api, root, marker } = setup(t, { label: '[44c]' });
    assert.equal(api.getReferenceLinkData(root, marker).label, '44c');
});

for (const archivedTitle of [false, true]) {
    test(`Cite Unseen icon links do not replace ${archivedTitle ? 'archived' : 'live'} source links`, (t) => {
        const body = `<cite class="citation web">
            <div class="cite-unseen-icons"><span class="cite-unseen-icon-container">
                <a class="cite-unseen-icon-link" href="//en.wikipedia.org/wiki/Wikipedia:Reliable_sources/Perennial_sources"><img alt="Source reliability"><span>EN</span></a>
            </span></div>
            <a class="external text" href="${archivedTitle ? archive : source}">Article title</a>.
            （<a class="external text" href="${archivedTitle ? source : archive}">原始內容</a>存檔於2023-09-01）.
        </cite>`;
        const { api, root, marker } = setup(t, { body });
        const before = root.innerHTML;
        assert.equal(
            api.getReferenceLinkData(root, marker).footnote,
            `${permalink} <small>([${source} example.com], [${archive} 存檔於2023年9月])</small>`,
        );
        assert.equal(
            api.getReferenceLinkData(root, marker).title,
            'Article title',
        );
        assert.equal(
            api.getReferenceLinkData(root, marker).url,
            archivedTitle ? archive : source,
        );
        assert.equal(root.innerHTML, before);
    });
}

test('source extraction uses the narrow citation body and ignores generic tool links', (t) => {
    const body = `<div><a class="external text" href="https://tool.example/nearby">Nearby link</a></div>
        <cite class="citation web">
            <div><a href="https://tool.example/help">Help</a></div>
            <span role="button"><a class="external text" href="https://tool.example/action">Action</a></span>
            <span data-widget="tool"><a class="external text" href="https://tool.example/settings">Settings</a></span>
            <span class="title"><b><a rel="mw:ExtLink" href="${source}">Article title</a></b></span>
        </cite>`;
    const { api, root, marker } = setup(t, { body });
    assert.equal(
        api.getReferenceLinkData(root, marker).footnote,
        `${permalink} <small>([${source} example.com])</small>`,
    );
});

test('unformatted references still supply marked source links', (t) => {
    const { api, root, marker } = setup(t, {
        body: `<div><a href="https://tool.example/help">Help</a></div><a class="external free" href="${source}">${source}</a>`,
    });
    assert.equal(
        api.getReferenceLinkData(root, marker).footnote,
        `${permalink} <small>([${source} example.com])</small>`,
    );
});

test('a tool link alone is never presented as the citation source', (t) => {
    const { api, root, marker } = setup(t, {
        body: '<cite class="citation book"><a href="https://tool.example/help">Help</a>Printed book title.</cite>',
    });
    assert.equal(api.getReferenceLinkData(root, marker).footnote, permalink);
});

test('the Scorn Vincent citation copies its domain with the archive link and month', (t) => {
    const source =
        'https://www.shacknews.com/article/118258/scorn-game-director-ljubomir-peklar-talks-sexual-imagery-weird-organic-structures';
    const archive = `https://web.archive.org/web/20231210013259/${source}`;
    // Structure of cite_note-Vincent@200525-20: the archive's anchor text is
    // 存档, while its date follows the anchor in a separate text node.
    const { api, root, marker } = setup(t, {
        body: `<cite id="CITEREFVincent2020" class="citation web">Vincent, Brittany.
            <a rel="nofollow" class="external text" href="${source}">Scorn interview</a>. Shacknews. 2020-05-25
            <span class="reference-accessdate"> [<span class="nowrap">2024-07-10</span>]</span>.
            （原始内容<a rel="nofollow" class="external text" href="${archive}">存档</a>于2023-12-10）
            <span title="连接到英语网页">（英语）</span>.</cite>`,
    });
    assert.equal(
        api.getReferenceLinkData(root, marker).footnote,
        `${permalink} <small>([${source} shacknews.com], [${archive} 存檔於2023年12月])</small>`,
    );
});
