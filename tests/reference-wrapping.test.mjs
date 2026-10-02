/**
 * @file tests/reference-wrapping.test.mjs
 * Purpose: tests / reference wrapping.test module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. Test scenarios
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const { outputFiles } = await build({
    stdin: {
        contents: `export { wrapArticleSentences, clearWrappedSentences } from './src/platform/browser/dom/sentence-wrapping';
            export { getReferenceLinkData, installReferenceLinkTips } from './src/platform/browser/dom/reference-links';
            export { collectRelatedSources } from './src/platform/browser/dom/related-sources';`,
        resolveDir: process.cwd(),
        loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'articleTest',
});

for (const lang of ['zh-Hant', 'en']) {
    test(`source and archive survive annotation-mode wrapping, copying and reactivation (${lang})`, async (t) => {
        const source =
            'https://www.shacknews.com/article/118258/scorn-game-director-ljubomir-peklar-talks-sexual-imagery-weird-organic-structures';
        const archive = `https://web.archive.org/web/20231210013259/${source}`;
        const markerId = 'cite_ref-Vincent@200525_20-0';
        const noteId = 'cite_note-Vincent@200525-20';
        const expected = `[[Special:Permalink/12345#${markerId}|19]] <small>([${source} shacknews.com], [${archive} 存檔於2023年12月])</small>`;
        const expectedComment = `[[Special:Permalink/12345#${markerId}|Ref. 19]]<small>（[${source} shacknews.com]，[${archive} 2023年12月存]）</small>`;
        // Retain the article's inline markup and separate access/archive dates:
        // the old sentence wrapper split this citation before the archive anchor.
        const dom = new JSDOM(
            `<!doctype html><html lang="${lang}"><body><main>
            <p>這個訪談介紹了遊戲的世界觀。<sup class="reference" id="${markerId}"><a href="#${noteId}">[19]</a></sup></p>
            <ol><li id="${noteId}"><span class="mw-cite-backlink"><b><a href="#${markerId}">^</a></b></span>
                <span class="reference-text"><link rel="mw-deduplicated-inline-style" href="mw-data:TemplateStyles:r92366446">
                    <cite id="CITEREFVincent2020" class="citation web">Vincent, Brittany.
                        <a rel="nofollow" class="external text" href="${source}">Scorn interview<span style="padding-right:0.2em;">"</span></a>.
                        Shacknews. 2020-05-25 <span class="reference-accessdate"> [<span class="nowrap">2024-07-10</span>]</span>.
                        （原始内容<a rel="nofollow" class="external text" href="${archive}">存档</a>于2023-12-10） <span>（英语）</span>.
                    </cite><span class="Z3988"><span style="display:none;">&nbsp;</span></span>
                </span></li></ol>
            </main></body></html>`.replace(/\n\s*/g, ''),
            {
                url: 'https://zh.wikipedia.org/wiki/蔑視_(遊戲)',
                runScripts: 'outside-only',
            },
        );
        t.after(() => dom.window.close());
        const { window } = dom;
        const { document } = window;
        const copies = [];
        window.mw = {
            config: {
                get: (key) => (key === 'wgRevisionId' ? 12345 : 'Reviewer'),
            },
            notify: () => {},
        };
        Object.defineProperty(window.navigator, 'clipboard', {
            value: { writeText: async (text) => copies.push(text) },
        });
        window.eval(outputFiles[0].text);
        const {
            wrapArticleSentences,
            clearWrappedSentences,
            getReferenceLinkData,
            installReferenceLinkTips,
            collectRelatedSources,
        } = window.articleTest;
        const root = document.querySelector('main');
        const note = document.getElementById(noteId);
        const originalCitation = note.outerHTML;
        assert.equal(
            getReferenceLinkData(root, document.getElementById(markerId))
                .footnote,
            expected,
        );
        const cleanup = installReferenceLinkTips(root);

        for (let activation = 0; activation < 2; activation++) {
            wrapArticleSentences(root);
            assert.ok(
                root.querySelector('p .sentence'),
                'article sentences should still be wrapped',
            );
            const marker = document.getElementById(markerId);
            assert.equal(
                getReferenceLinkData(root, marker).footnote,
                expected,
                'wrapping must not hide the archive',
            );
            assert.equal(
                note.outerHTML,
                originalCitation,
                'citation links and IDs should remain intact',
            );
            const selection = document.createRange();
            selection.selectNodeContents(root.querySelector('p .sentence'));
            assert.equal(
                collectRelatedSources(root, selection)[0].wikitext,
                expectedComment,
            );
            marker
                .querySelector('a')
                .dispatchEvent(
                    new window.MouseEvent('mouseover', { bubbles: true }),
                );
            document.querySelector('[role="menuitem"]').click();
            await new Promise((resolve) => setImmediate(resolve));
            assert.equal(
                copies.at(-1),
                expected,
                'the clipboard should include both links',
            );
            clearWrappedSentences(root);
            assert.equal(note.outerHTML, originalCitation);
        }
        cleanup();
    });
}

test('annotation wrapping preserves tables, styles and controls, including existing event handlers', () => {
    const { window } = new JSDOM(
        `<!doctype html><html lang="zh-Hant"><body><main>
        <style>.wikitable { table-layout: fixed; width: 100%; }</style>
        <p>表格前的正文。<code>const value = "保持原樣。";</code></p>
        <div><table class="wikitable sortable" style="width:80%">
            <caption>原有表格標題</caption><colgroup><col style="width:40%"><col></colgroup>
            <thead><tr><th rowspan="2" scope="col">項目</th><th scope="col"><button type="button">排序</button></th></tr><tr><th>評分</th></tr></thead>
            <tbody><tr><td><a href="#details">遊戲資料</a></td><td data-sort-value="10">十分。值得一看。</td></tr>
                <tr><td colspan="2"><table><tbody><tr><td>巢狀表格。</td></tr></tbody></table></td></tr></tbody>
            <tfoot><tr><td colspan="2">說明文字。</td></tr></tfoot>
        </table></div>
        <p>表格後的正文。</p><pre>保留  空白\n以及換行。</pre>
        <select><option>原有選項。</option></select><textarea>原有內容。</textarea>
        </main></body></html>`,
        {
            url: 'https://zh.wikipedia.org/wiki/Test',
            runScripts: 'outside-only',
        },
    );
    try {
        const { document } = window;
        window.mw = { config: { get: () => 'Reviewer' } };
        window.eval(outputFiles[0].text);
        const { wrapArticleSentences, clearWrappedSentences } =
            window.articleTest;
        const root = document.querySelector('main');
        const protectedElements = [
            ...root.querySelectorAll(
                'table, table *, style, code, pre, select, option, textarea',
            ),
        ];
        const originalHtml = protectedElements.map(
            (element) => element.outerHTML,
        );
        let clicks = 0;
        document
            .querySelector('button')
            .addEventListener('click', () => clicks++);
        for (let activation = 0; activation < 2; activation++) {
            wrapArticleSentences(root);
            assert.ok(root.querySelector('p .sentence'));
            protectedElements.forEach((element, index) => {
                assert.ok(
                    root.contains(element),
                    'existing elements must retain their identity',
                );
                assert.equal(element.outerHTML, originalHtml[index]);
            });
            document.querySelector('button').click();
            assert.equal(
                clicks,
                activation + 1,
                'existing controls must still work',
            );
            clearWrappedSentences(root);
        }
    } finally {
        window.close();
    }
});
