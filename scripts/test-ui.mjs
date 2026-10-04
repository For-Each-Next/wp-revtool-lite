/**
 * @file scripts/test-ui.mjs
 * Purpose: Exercise the production bundle against an offline article fixture and capture documentation images.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. plainText
 * 4. Initialization and execution
 */

import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../', import.meta.url));
const capture = process.argv.includes('--screenshots');
const source = await readFile(
    new URL('../tests/fixtures/bang-dream.wikitext', import.meta.url),
    'utf8',
);
const provenance = JSON.parse(
    await readFile(
        new URL('../tests/fixtures/bang-dream.source.json', import.meta.url),
        'utf8',
    ),
);
const paragraphs = source
    .slice(source.indexOf("《'''BanG Dream!"))
    .split('\n\n')
    .slice(0, 3);

function plainText(wikitext) {
    let text = wikitext.replace(
        /\{\{(?:lj|lang)\|([^{}|]+)(?:\|([^{}]+))?\}\}/g,
        (match, first, second) =>
            match.startsWith('{{lang|') ? second || first : first,
    );
    while (/\{\{[^{}]*\}\}/.test(text))
        text = text.replace(/\{\{[^{}]*\}\}/g, '');
    return text
        .replace(
            /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
            (_match, title, label) => label || title,
        )
        .replace(/'{2,3}/g, '')
        .replace(/-\{zh-cn:[^;]+; zh-hk:[^;]+; zh-tw:([^}]+)\}-/g, '$1');
}
const escapeHtml = (text) =>
    text.replace(
        /[&<>"']/g,
        (character) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
            })[character],
    );
const article = paragraphs
    .map((paragraph) => `<p>${escapeHtml(plainText(paragraph))}</p>`)
    .join('\n');
const codexStyles = await readFile(
    new URL(
        '../node_modules/@wikimedia/codex/dist/codex.style.css',
        import.meta.url,
    ),
    'utf8',
);
const application = await readFile(
    new URL('../dist/bundled.js', import.meta.url),
    'utf8',
);
const host = await build({
    stdin: {
        contents: `import * as Vue from 'vue'; import * as Codex from '@wikimedia/codex';
            window.reviewFixtureRuntime = { Vue: { ...Vue, createMwApp: Vue.createApp }, Codex };`,
        resolveDir: root,
        loader: 'js',
    },
    bundle: true,
    write: false,
    format: 'iife',
    define: {
        __VUE_OPTIONS_API__: 'true',
        __VUE_PROD_DEVTOOLS__: 'false',
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
});
const html = `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ReviewToolLite — BanG Dream!</title><link rel="icon" href="data:,"><style>${codexStyles}
body { margin:0; color:#202122; background:#fff; font:16px/1.7 system-ui,sans-serif; }
.fixture-header { padding:14px 28px; border-bottom:1px solid #a2a9b1; display:flex; justify-content:space-between; align-items:center; gap:16px; }
.fixture-header strong { font-size:20px; } .fixture-label { color:#54595d; font-size:13px; }
main { max-width:1040px; margin:auto; padding:20px 32px; } h1 { font-family:Georgia,serif; font-weight:400; font-size:30px; line-height:1.3; border-bottom:1px solid #a2a9b1; padding-bottom:12px; }
.fixture-tools { display:flex; justify-content:flex-end; list-style:none; margin:0 0 20px; padding:0; }
.fixture-note { font-size:13px; color:#54595d; border-top:1px solid #c8ccd1; margin-top:36px; padding-top:12px; }
@media(max-width:480px){ main {padding:12px 16px} h1{font-size:24px}.fixture-header{padding:12px 16px}.fixture-label{display:none} }
</style><body><header class="fixture-header"><strong>維基百科</strong><span class="fixture-label">ReviewToolLite · 離線示範</span></header>
<main><h1 id="firstHeading">${escapeHtml(provenance.title)}</h1><ul class="fixture-tools" id="p-cactions"></ul>
<div id="mw-content-text"><div class="mw-parser-output">${article}</div></div>
<p class="fixture-note">條目摘錄：修訂 ${provenance.revid} · CC BY-SA 4.0 · 批註為示範意見</p></main></body></html>`;

const browser = await chromium.launch({ headless: true });
try {
    for (const [variant, viewport] of [
        ['desktop', { width: 1280, height: 960 }],
        ['mobile', { width: 390, height: 844 }],
    ]) {
        const context = await browser.newContext({
            viewport,
            locale: 'zh-TW',
            timezoneId: 'Asia/Taipei',
        });
        const page = await context.newPage();
        const errors = [];
        const unexpectedRequests = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.route('**/*', (route) => {
            if (
                route.request().url() !==
                'https://reviewtool.test/wiki/BanG_Dream'
            ) {
                unexpectedRequests.push(route.request().url());
                return route.abort();
            }
            return route.fulfill({
                status: 200,
                contentType: 'text/html',
                body: html,
            });
        });
        await page.goto('https://reviewtool.test/wiki/BanG_Dream');
        await page.clock.setFixedTime(new Date('2026-10-02T08:30:00Z'));
        await page.addScriptTag({ content: host.outputFiles[0].text });
        await page.evaluate(({ title, revid, timestamp }) => {
            const values = {
                wgNamespaceNumber: 0,
                wgAction: 'view',
                wgPageName: title,
                wgUserName: '範例編者',
                wgUserVariant: 'zh-tw',
                wgRevisionId: revid,
            };
            window.Vue = { unrelatedRuntime: true };
            window.reviewFixtureCopied = [];
            window.reviewFixtureRequests = [];
            const hooks = new Map();
            window.RLQ = { push: (callback) => callback() };
            Object.defineProperty(navigator, 'clipboard', {
                value: {
                    writeText: async (text) =>
                        window.reviewFixtureCopied.push(text),
                },
            });
            window.mw = {
                config: { get: (name) => values[name] ?? null },
                loader: {
                    using: async () => (name) =>
                        name === 'vue'
                            ? window.reviewFixtureRuntime.Vue
                            : window.reviewFixtureRuntime.Codex,
                },
                hook: (name) => ({
                    add: (callback) => {
                        hooks.set(name, callback);
                        callback();
                    },
                }),
                util: {
                    addPortletLink: (target, href, text, id) => {
                        const list = document.getElementById(target);
                        if (!list) return null;
                        const item = document.createElement('li');
                        item.id = id;
                        const link = document.createElement('a');
                        link.href = href;
                        link.textContent = text;
                        item.append(link);
                        list.append(item);
                        return item;
                    },
                    getUrl: (pageTitle) =>
                        `/wiki/${encodeURIComponent(pageTitle)}`,
                    escapeIdForLink: (text) => text.replaceAll(' ', '_'),
                },
                Title: {
                    newFromText: (text) => ({
                        getTalkPage: () => ({
                            getPrefixedText: () => `Talk:${text}`,
                        }),
                    }),
                },
                Api: class {
                    async get(params) {
                        window.reviewFixtureRequests.push(params);
                        return {
                            query: { pages: [{ revisions: [{ timestamp }] }] },
                        };
                    }
                },
                notify() {},
            };
        }, provenance);
        await page.addScriptTag({ content: application });
        const toggle = page.locator('#ca-reviewtool-toggle a');
        await toggle.waitFor();
        await toggle.click();
        const sentence = page
            .locator('.mw-parser-output .sentence')
            .filter({ hasText: '游戏支持' })
            .first();
        await sentence.waitFor();
        await sentence.click();
        await page.locator('.floating-button').click();
        const editor = page.locator('.review-tool-annotation-editor-dialog');
        await editor.waitFor();
        await editor
            .locator('textarea')
            .fill('建議核對各平台發行日期，並補上對應來源，方便讀者確認。');
        await page.waitForFunction(() => {
            const dialog = document.querySelector(
                '.review-tool-annotation-editor-dialog',
            );
            let element = dialog;
            while (element) {
                if (getComputedStyle(element).opacity !== '1') return false;
                element = element.parentElement;
            }
            return Boolean(dialog);
        });
        if (capture) {
            await mkdir(new URL('../docs/images/', import.meta.url), {
                recursive: true,
            });
            await page.screenshot({
                animations: 'disabled',
                path: new URL(
                    `../docs/images/annotation-editor${variant === 'mobile' ? '-mobile' : ''}.png`,
                    import.meta.url,
                ).pathname,
            });
        }
        await editor.getByRole('button', { name: '新增', exact: true }).click();
        await editor.waitFor({ state: 'hidden' });
        await page
            .getByRole('button', { name: '查看批註', exact: true })
            .click();
        const viewer = page.locator('.review-tool-annotation-viewer-dialog');
        await viewer.waitFor();
        await page.waitForFunction(() => {
            const dialog = document.querySelector(
                '.review-tool-annotation-viewer-dialog',
            );
            let element = dialog;
            while (element) {
                if (getComputedStyle(element).opacity !== '1') return false;
                element = element.parentElement;
            }
            return Boolean(dialog);
        });
        assert.match(await viewer.innerText(), /建議核對各平台發行日期/);
        assert.equal(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
            true,
            'page fits the viewport',
        );
        assert.equal(
            await page.evaluate(() => window.Vue.unrelatedRuntime),
            true,
            'host runtime is untouched',
        );
        if (capture)
            await page.screenshot({
                animations: 'disabled',
                path: new URL(
                    `../docs/images/annotation-viewer${variant === 'mobile' ? '-mobile' : ''}.png`,
                    import.meta.url,
                ).pathname,
            });
        await viewer.getByRole('button', { name: '複製', exact: true }).click();
        await page.waitForFunction(
            () => window.reviewFixtureCopied.length === 1,
        );
        const copied = await page.evaluate(() => window.reviewFixtureCopied[0]);
        assert.match(copied, /94028176/);
        assert.match(copied, /建議核對各平台發行日期/);
        assert.equal(
            await page.evaluate(() => window.reviewFixtureRequests.length),
            1,
        );
        assert.equal(
            await page.evaluate(() => window.reviewFixtureRequests[0].action),
            'query',
        );
        await viewer.getByRole('button', { name: '關閉', exact: true }).click();
        await viewer.waitFor({ state: 'hidden' });
        await toggle.click();
        assert.equal(
            await page.locator('.mw-parser-output .sentence').count(),
            0,
            'sentence wrappers are released',
        );
        assert.equal(
            await page.locator('.floating-button').count(),
            0,
            'floating control is released',
        );
        assert.deepEqual(errors, []);
        assert.deepEqual(unexpectedRequests, []);
        await context.close();
        console.log(
            `Passed ${variant}: annotate, save, view, copy, isolated runtime, and cleanup${capture ? '; screenshots saved' : ''}.`,
        );
    }
} finally {
    await browser.close();
}
