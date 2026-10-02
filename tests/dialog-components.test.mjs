/**
 * @file tests/dialog-components.test.mjs
 * Purpose: tests / dialog components.test module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. Test scenarios
 * 4. mount
 * 5. button
 */

import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import vm from 'node:vm';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { vueSfcPlugin } from '../scripts/build-plugins.mjs';

// Load Vue after the DOM is installed: its renderer captures document at import time.
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://example.test/wiki/Article',
});
for (const key of [
    'window',
    'document',
    'HTMLElement',
    'HTMLInputElement',
    'HTMLTextAreaElement',
    'SVGElement',
    'Element',
    'Node',
    'Event',
    'KeyboardEvent',
    'MutationObserver',
]) {
    globalThis[key] = dom.window[key];
}
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
globalThis.cancelAnimationFrame = clearTimeout;
window.requestAnimationFrame = globalThis.requestAnimationFrame;
window.cancelAnimationFrame = globalThis.cancelAnimationFrame;
HTMLElement.prototype.scrollIntoView = () => {};
const Vue = await import('vue');
const Codex = await import('@wikimedia/codex');

globalThis.mw = {
    config: { get: (key) => (key === 'wgUserName' ? 'Test user' : 123) },
    Title: {
        newFromText: () => ({
            getTalkPage: () => ({ getPrefixedText: () => 'Talk:Article' }),
        }),
    },
    util: {
        getUrl: (title) => `/wiki/${title}`,
        escapeIdForLink: (text) => text,
    },
    notify() {},
};
after(() => dom.window.close());

const components = {};
for (const name of ['annotation-editor', 'annotation-viewer']) {
    const result = await build({
        stdin: {
            contents: `export { default } from './src/features/annotations/components/${name}.vue'; export { setVueRuntime } from './src/platform/mediawiki/vue-runtime';`,
            resolveDir: process.cwd(),
            loader: 'ts',
        },
        bundle: true,
        write: false,
        format: 'iife',
        globalName: 'dialogComponent',
        plugins: [vueSfcPlugin],
    });
    const context = vm.createContext({
        window,
        document,
        mw,
        console,
        Event,
        HTMLElement,
        navigator: {},
        URL,
        Blob,
        crypto: globalThis.crypto,
    });
    vm.runInContext(result.outputFiles[0].text, context);
    context.dialogComponent.setVueRuntime(Vue);
    components[name] = context.dialogComponent.default;
}

const flush = async () => {
    await Vue.nextTick();
    await new Promise((resolve) => setImmediate(resolve));
    await Vue.nextTick();
};

async function mount(t, name, props = {}, { narrow = false } = {}) {
    const listeners = new Set();
    const media = {
        matches: narrow,
        addEventListener: (_type, listener) => listeners.add(listener),
        removeEventListener: (_type, listener) => listeners.delete(listener),
    };
    window.matchMedia = () => media;
    window.confirm = () => true;
    const host = document.createElement('div');
    document.body.append(host);
    const app = Vue.createApp(components[name], props);
    for (const component of [
        'Dialog',
        'Button',
        'MenuButton',
        'Select',
        'TextArea',
        'Field',
        'Message',
        'ProgressBar',
    ]) {
        const tag = component.replace(
            /[A-Z]/g,
            (letter, index) => `${index ? '-' : ''}${letter.toLowerCase()}`,
        );
        app.component(`cdx-${tag}`, Codex[`Cdx${component}`]);
    }
    app.mount(host);
    t.after(() => {
        app.unmount();
        host.remove();
        assert.equal(
            listeners.size,
            0,
            'responsive listener is released on unmount',
        );
    });
    await flush();
    return {
        root: [...document.querySelectorAll('.review-tool-dialog')].at(-1),
        media,
        resize: async (matches) => {
            media.matches = matches;
            listeners.forEach((listener) => listener());
            await flush();
        },
    };
}

function button(root, text) {
    const match = [...root.querySelectorAll('button')].find(
        (element) => element.textContent.trim() === text,
    );
    assert.ok(match, `Expected button: ${text}`);
    return match;
}

const groups = [
    {
        sectionPath: 'Overview',
        annotations: [
            {
                id: 'first',
                sectionPath: 'Overview',
                sentencePos: '1',
                sentenceText: '<img src=x onerror=alert(1)>',
                opinion: 'Improve this sentence',
                createdBy: 'Test user',
                createdAt: Date.now(),
                resolved: false,
            },
            {
                id: 'second',
                sectionPath: 'Overview',
                sentencePos: '2',
                sentenceText: 'Second sentence',
                opinion: 'Add a source',
                createdBy: 'Test user',
                createdAt: Date.now(),
                resolved: false,
            },
        ],
    },
];

test('editor reports empty input, focuses the field, and clears validation after typing', async (t) => {
    const results = [];
    const { root } = await mount(t, 'annotation-editor', {
        onResolve: (result) => results.push(result),
    });
    button(root, '新增').click();
    await flush();
    const textarea = root.querySelector('textarea');
    assert.equal(document.activeElement, textarea);
    assert.equal(textarea.getAttribute('aria-invalid'), 'true');
    assert.equal(
        textarea.getAttribute('aria-errormessage'),
        'annotation-opinion-error',
    );
    assert.match(
        document.getElementById(textarea.getAttribute('aria-describedby'))
            .textContent,
        /儲存於此瀏覽器/,
    );
    assert.equal(root.querySelector('label').htmlFor, textarea.id);
    assert.match(
        root.querySelector('#annotation-opinion-error').textContent,
        /不能為空/,
    );
    assert.equal(results.length, 0);
    textarea.value = '  Useful feedback  ';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    assert.equal(textarea.hasAttribute('aria-invalid'), false);
    button(root, '新增').click();
    assert.deepEqual(
        results.map((result) => ({ ...result })),
        [{ action: 'save', opinion: 'Useful feedback' }],
    );
});

test('stacked editor actions follow keyboard order and update when the viewport changes', async (t) => {
    const { root, resize } = await mount(
        t,
        'annotation-editor',
        {},
        { narrow: true },
    );
    const labels = () =>
        [
            ...root.querySelectorAll(
                '.review-tool-annotation-editor__actions button',
            ),
        ].map((element) => element.textContent.trim());
    assert.deepEqual(labels(), ['新增', '取消']);
    await resize(false);
    assert.deepEqual(labels(), ['取消', '新增']);
});

test('viewer explains the empty state and disables review actions', async (t) => {
    const { root } = await mount(t, 'annotation-viewer', {
        pageName: 'Article',
        onImportAnnotations: () => 0,
    });
    assert.match(
        root.querySelector('.review-tool-annotation-viewer__empty').textContent,
        /選取文字.*JSON/s,
    );
    assert.equal(button(root, '複製').disabled, true);
    assert.equal(button(root, '複製並前往').disabled, true);
    assert.equal(button(root, '匯入／匯出').disabled, false);
});

test('pending deletion disables other mutations and displays accessible progress and retryable errors', async (t) => {
    const errors = t.mock.method(console, 'error', () => {});
    let rejectDelete;
    let deletionCount = 0;
    let clearCount = 0;
    const { root } = await mount(t, 'annotation-viewer', {
        pageName: 'Article',
        initialGroups: groups,
        onEditAnnotation() {},
        onDeleteAnnotation: () => {
            deletionCount++;
            return new Promise((_resolve, reject) => {
                rejectDelete = reject;
            });
        },
        onClearAllAnnotations: () => {
            clearCount++;
            return true;
        },
    });
    assert.equal(
        root.querySelector('img'),
        null,
        'article text is rendered as text',
    );
    button(root, '刪除').click();
    await flush();
    assert.equal(deletionCount, 1);
    assert.equal(
        root
            .querySelector('.review-tool-annotation-viewer__list')
            .getAttribute('aria-busy'),
        'true',
    );
    assert.ok(root.querySelector('[role="progressbar"]'));
    for (const label of ['編輯', '刪除', '清除全部', '複製', '匯入／匯出']) {
        assert.equal(button(root, label).disabled, true, label);
        button(root, label).click();
    }
    assert.equal(deletionCount, 1);
    assert.equal(clearCount, 0);
    rejectDelete(new Error('Storage quota exceeded'));
    await flush();
    assert.equal(errors.mock.callCount(), 1);
    assert.match(
        root.querySelector('.cdx-message--error').textContent,
        /儲存空間.*重試/,
    );
    assert.equal(button(root, '刪除').disabled, false);
    assert.equal(root.querySelector('[role="progressbar"]'), null);
});

test('stacked viewer has one primary action first in its DOM order', async (t) => {
    const { root } = await mount(
        t,
        'annotation-viewer',
        { pageName: 'Article', initialGroups: groups },
        { narrow: true },
    );
    const actions = root.querySelector(
        '.review-tool-annotation-viewer__footer-actions',
    );
    assert.equal(
        actions.querySelector('button').textContent.trim(),
        '複製並前往',
    );
    assert.equal(
        actions.querySelectorAll('.cdx-button--weight-primary').length,
        1,
    );
    assert.equal(
        button(root, '清除全部').classList.contains(
            'cdx-button--action-destructive',
        ),
        false,
        'undoable clear is neutral',
    );
});

test('source-copy failure shows selectable wikitext and leaves the comment untouched', async (t) => {
    const source = {
        label: '3a',
        title: 'Related article',
        url: 'https://example.test/source',
        wikitext: '[[Special:Permalink/123#cite_ref-test|Ref. 3a]]',
    };
    const { root } = await mount(t, 'annotation-editor', {
        relatedSources: [source],
        initialOpinion: 'Existing feedback',
    });
    const copy = button(root, '複製3a');
    copy.focus();
    copy.click();
    await flush();
    assert.equal(root.querySelector('code').textContent, source.wikitext);
    assert.match(
        root.querySelector('.cdx-message--error').textContent,
        /手動複製/,
    );
    assert.equal(root.querySelector('textarea').value, 'Existing feedback');
    assert.equal(document.activeElement, copy);
    assert.equal(copy.disabled, false);
});

test('import failure remains visible and reenables the file action for retry', async (t) => {
    t.mock.method(console, 'error', () => {});
    let imports = 0;
    const { root } = await mount(t, 'annotation-viewer', {
        pageName: 'Article',
        onImportAnnotations: () => {
            imports++;
            throw new Error('Invalid backup');
        },
    });
    const input = root.querySelector('input[type="file"]');
    Object.defineProperty(input, 'files', {
        value: [{ text: async () => '{}' }],
        configurable: true,
    });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    assert.equal(imports, 1);
    assert.match(
        root.querySelector('.cdx-message--error').textContent,
        /JSON.*儲存空間/,
    );
    assert.equal(button(root, '匯入／匯出').disabled, false);
    assert.equal(input.value, '');
});

test('closing while a backup is being read prevents importing into a dismissed dialog', async (t) => {
    let finishRead;
    let imports = 0;
    const { root } = await mount(t, 'annotation-viewer', {
        pageName: 'Article',
        onImportAnnotations: () => {
            imports++;
            return 1;
        },
    });
    const input = root.querySelector('input[type="file"]');
    Object.defineProperty(input, 'files', {
        value: [
            {
                text: () =>
                    new Promise((resolve) => {
                        finishRead = resolve;
                    }),
            },
        ],
        configurable: true,
    });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    assert.match(root.querySelector('[role="status"]').textContent, /正在匯入/);
    button(root, '關閉').click();
    finishRead('{}');
    await flush();
    assert.equal(imports, 0);
    assert.equal(input.value, '');
});
