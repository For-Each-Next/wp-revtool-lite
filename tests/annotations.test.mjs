/**
 * @file tests/annotations.test.mjs
 * Purpose: tests / annotations.test module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. memoryStorage
 * 4. setup
 * 5. Test scenarios
 * 6. activationSession
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { build } from 'esbuild';
import { compileModule } from './helpers/load-module.mjs';
import { createDialogEnvironment } from './helpers/dialog-environment.mjs';

const createAnnotations = await compileModule('app/annotations.ts');
const createSession = await compileModule('app/annotation-session.ts');
const { outputFiles: sessionFixture } = await build({
    stdin: {
        contents: `export { confirmClearOnFirstActivation } from './src/app/annotation-session';
            export { default as state } from './src/platform/mediawiki/context';`,
        resolveDir: process.cwd(),
        loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'sessionTest',
});

function memoryStorage() {
    const values = new Map();
    return {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: (key) => values.delete(key),
    };
}

function setup(
    window = { localStorage: memoryStorage(), sessionStorage: memoryStorage() },
) {
    const api = createAnnotations({
        window,
        crypto: globalThis.crypto,
        mw: { config: { get: () => 'Test user' } },
        console: { error() {}, warn() {} },
    });
    return { api, ...window };
}

const pageName = '測試條目';
const key = `reviewtool:annotations:${pageName}`;
const annotation = {
    id: 'example',
    sectionPath: '序言',
    sentencePos: '1.2',
    sentenceText: '原文',
    opinion: '建議',
    createdBy: 'Reviewer',
    createdAt: 1234,
    updatedAt: 2345,
    resolved: false,
    textAnchor: { start: 5, end: 7, quote: '原文' },
};
const backup = (annotations) =>
    JSON.stringify({
        exportedAt: 5678,
        groups: [{ sectionPath: '序言', annotations }],
    });

test('imports an exported backup with author, positions and anchors intact', () => {
    const { api, localStorage } = setup();
    assert.equal(api.importAnnotations(pageName, backup([annotation])), 1);
    const stored = JSON.parse(localStorage.getItem(key));
    assert.equal(stored.pageName, pageName);
    assert.deepEqual(stored.annotations, [annotation]);
    assert.equal(
        api.buildAnnotationGroups(pageName)[0].annotations[0].opinion,
        '建議',
    );
});

test('merges without replacing local edits or duplicating repeated imports', () => {
    const { api } = setup();
    api.importAnnotations(
        pageName,
        backup([{ ...annotation, opinion: '本地修改' }]),
    );
    const json = backup([
        annotation,
        { ...annotation, id: 'new' },
        { ...annotation, id: 'new' },
    ]);
    assert.equal(api.importAnnotations(pageName, json), 1);
    assert.equal(api.importAnnotations(pageName, json), 0);
    assert.equal(api.loadAnnotations(pageName).annotations.length, 2);
    assert.equal(
        api.getAnnotation(pageName, annotation.id).opinion,
        '本地修改',
    );
});

test('accepts legacy exports without positions, UTF-8 BOMs, and stored annotation backups', () => {
    const { api } = setup();
    const { sentencePos, textAnchor, updatedAt, ...legacy } = annotation;
    assert.equal(
        api.importAnnotations(pageName, `\uFEFF${backup([legacy])}`),
        1,
    );
    assert.equal(api.getAnnotation(pageName, legacy.id).sentencePos, '');
    assert.equal(api.getAnnotation(pageName, legacy.id).textAnchor, undefined);
    assert.equal(api.getAnnotation(pageName, legacy.id).updatedAt, undefined);
    assert.equal(
        api.importAnnotations(
            pageName,
            JSON.stringify({
                pageName: '另一條目',
                annotations: [{ ...annotation, id: 'stored' }],
            }),
        ),
        1,
    );
    assert.equal(api.loadAnnotations(pageName).pageName, pageName);
});

for (const [name, json] of [
    ['malformed JSON', '{'],
    ['unrelated JSON', '{"hello":"world"}'],
    ['invalid groups', '{"groups":[null]}'],
    ['partially invalid entries', backup([annotation, { id: 'invalid' }])],
    ['empty IDs', backup([{ ...annotation, id: ' ' }])],
    ['non-finite timestamps', backup([annotation]).replace('1234', '1e400')],
    [
        'out-of-range dates',
        backup([{ ...annotation, createdAt: Number.MAX_VALUE }]),
    ],
]) {
    test(`rejects ${name} without changing saved annotations`, () => {
        const { api, localStorage } = setup();
        api.importAnnotations(
            pageName,
            backup([{ ...annotation, id: 'existing' }]),
        );
        const before = localStorage.getItem(key);
        assert.throws(() => api.importAnnotations(pageName, json));
        assert.equal(localStorage.getItem(key), before);
    });
}

test('empty backups leave existing annotations intact', () => {
    const { api, localStorage } = setup();
    api.importAnnotations(pageName, backup([annotation]));
    const before = localStorage.getItem(key);
    assert.equal(api.importAnnotations(pageName, backup([])), 0);
    assert.equal(localStorage.getItem(key), before);
});

test('editing records the latest edit without changing creation time and persists it across reloads', () => {
    const { api, localStorage, sessionStorage } = setup();
    api.importAnnotations(pageName, backup([annotation]));
    const before = Date.now();
    const edited = api.updateAnnotation(pageName, annotation.id, {
        opinion: '修改後',
    });
    assert.equal(edited.createdAt, annotation.createdAt);
    assert.ok(edited.updatedAt >= before && edited.updatedAt <= Date.now());
    const reloaded = setup({ localStorage, sessionStorage }).api;
    assert.equal(
        reloaded.getAnnotation(pageName, annotation.id).updatedAt,
        edited.updatedAt,
    );
    assert.equal(
        reloaded.buildAnnotationGroups(pageName)[0].annotations[0].updatedAt,
        edited.updatedAt,
    );
});

test('invalid or older edit timestamps do not override creation time', () => {
    for (const updatedAt of ['invalid', null, 1, Number.MAX_VALUE]) {
        const { api } = setup();
        api.importAnnotations(pageName, backup([{ ...annotation, updatedAt }]));
        assert.equal(
            api.getAnnotation(pageName, annotation.id).updatedAt,
            undefined,
        );
    }
});

test('uses session fallback without reading a stale local copy', () => {
    const { api, localStorage, sessionStorage } = setup();
    api.importAnnotations(pageName, backup([annotation]));
    localStorage.setItem = () => {
        throw new Error('Quota exceeded');
    };
    assert.equal(
        api.importAnnotations(pageName, backup([{ ...annotation, id: 'new' }])),
        1,
    );
    assert.equal(localStorage.getItem(key), null);
    assert.equal(JSON.parse(sessionStorage.getItem(key)).annotations.length, 2);
    assert.equal(api.loadAnnotations(pageName).annotations.length, 2);
});

test('reports failed persistence while preserving the existing backup', () => {
    const { api, localStorage, sessionStorage } = setup();
    api.importAnnotations(pageName, backup([annotation]));
    const before = localStorage.getItem(key);
    localStorage.setItem = sessionStorage.setItem = () => {
        throw new Error('Quota exceeded');
    };
    assert.throws(
        () =>
            api.importAnnotations(
                pageName,
                backup([{ ...annotation, id: 'new' }]),
            ),
        /Unable to save/,
    );
    assert.equal(localStorage.getItem(key), before);
});

for (const action of ['create', 'update', 'delete']) {
    test(`failed ${action} reports an error without changing the saved annotations`, () => {
        const { api, localStorage, sessionStorage } = setup();
        api.importAnnotations(pageName, backup([annotation]));
        const before = localStorage.getItem(key);
        localStorage.setItem = sessionStorage.setItem = () => {
            throw new Error('Quota exceeded');
        };
        const actions = {
            create: () =>
                api.createAnnotation(pageName, '序言', '新原文', '新建議'),
            update: () =>
                api.updateAnnotation(pageName, annotation.id, {
                    opinion: '修改',
                }),
            delete: () => api.deleteAnnotation(pageName, annotation.id),
        };
        assert.throws(actions[action], /Unable to/);
        assert.equal(localStorage.getItem(key), before);
        assert.equal(
            api.getAnnotation(pageName, annotation.id).opinion,
            annotation.opinion,
        );
    });
}

test('stored page metadata cannot redirect later edits into a different article', () => {
    const { api, localStorage } = setup();
    localStorage.setItem(
        key,
        JSON.stringify({ pageName: 'Wrong page', annotations: [annotation] }),
    );
    api.updateAnnotation(pageName, annotation.id, { opinion: '修改' });
    assert.equal(api.loadAnnotations(pageName).pageName, pageName);
    assert.equal(api.getAnnotation(pageName, annotation.id).opinion, '修改');
    assert.equal(
        localStorage.getItem('reviewtool:annotations:Wrong page'),
        null,
    );
});

test('clearing saves an undo copy that survives reload and restores author, positions and anchors', () => {
    const { api, localStorage, sessionStorage } = setup();
    api.importAnnotations(pageName, backup([annotation]));
    assert.equal(api.clearAnnotations(pageName), true);
    assert.equal(api.loadAnnotations(pageName).annotations.length, 0);
    const reloaded = setup({ localStorage, sessionStorage }).api;
    assert.equal(reloaded.canUndoClearAnnotations(pageName), true);
    assert.equal(reloaded.undoClearAnnotations(pageName), 1);
    assert.deepEqual(JSON.parse(localStorage.getItem(key)).annotations, [
        annotation,
    ]);
    assert.equal(reloaded.canUndoClearAnnotations(pageName), false);
    assert.equal(reloaded.undoClearAnnotations(pageName), 0);
});

test('undo merges with new comments and keeps newer edits to reimported comments', () => {
    const { api } = setup();
    api.importAnnotations(
        pageName,
        backup([annotation, { ...annotation, id: 'restore' }]),
    );
    api.clearAnnotations(pageName);
    api.importAnnotations(
        pageName,
        backup([
            { ...annotation, opinion: '新修改' },
            { ...annotation, id: 'new' },
        ]),
    );
    assert.equal(api.undoClearAnnotations(pageName), 1);
    assert.equal(api.loadAnnotations(pageName).annotations.length, 3);
    assert.equal(api.getAnnotation(pageName, annotation.id).opinion, '新修改');
});

test('clearing an empty list retains the undo copy and history is isolated by page', () => {
    const { api } = setup();
    api.importAnnotations(pageName, backup([annotation]));
    api.clearAnnotations(pageName);
    assert.equal(api.clearAnnotations(pageName), false);
    assert.equal(api.canUndoClearAnnotations('別頁'), false);
    assert.equal(api.undoClearAnnotations('別頁'), 0);
    assert.equal(api.undoClearAnnotations(pageName), 1);
});

test('only the most recent nonempty clear is undone', () => {
    const { api } = setup();
    api.importAnnotations(pageName, backup([annotation]));
    api.clearAnnotations(pageName);
    api.importAnnotations(pageName, backup([{ ...annotation, id: 'new' }]));
    api.clearAnnotations(pageName);
    assert.equal(api.undoClearAnnotations(pageName), 1);
    assert.equal(api.getAnnotation(pageName, annotation.id), null);
    assert.equal(api.getAnnotation(pageName, 'new').id, 'new');
});

test('failed clearing leaves current annotations intact', () => {
    const { api, localStorage, sessionStorage } = setup();
    api.importAnnotations(pageName, backup([annotation]));
    const before = localStorage.getItem(key);
    localStorage.setItem = sessionStorage.setItem = () => {
        throw new Error('Quota exceeded');
    };
    assert.throws(() => api.clearAnnotations(pageName), /Unable to clear/);
    assert.equal(localStorage.getItem(key), before);
    assert.equal(api.canUndoClearAnnotations(pageName), false);
});

test('failed undo retains both new comments and the undo copy for retry', () => {
    const { api, localStorage, sessionStorage } = setup();
    api.importAnnotations(pageName, backup([annotation]));
    api.clearAnnotations(pageName);
    api.importAnnotations(pageName, backup([{ ...annotation, id: 'new' }]));
    const before = localStorage.getItem(key);
    const saveLocal = localStorage.setItem;
    localStorage.setItem = sessionStorage.setItem = () => {
        throw new Error('Quota exceeded');
    };
    assert.throws(
        () => api.undoClearAnnotations(pageName),
        /Unable to restore/,
    );
    assert.equal(localStorage.getItem(key), before);
    localStorage.setItem = saveLocal;
    assert.equal(api.undoClearAnnotations(pageName), 1);
    assert.equal(api.loadAnnotations(pageName).annotations.length, 2);
});

test('clear and undo work with session storage fallback', () => {
    const { api, localStorage, sessionStorage } = setup();
    api.importAnnotations(pageName, backup([annotation]));
    localStorage.setItem = () => {
        throw new Error('Quota exceeded');
    };
    assert.equal(api.clearAnnotations(pageName), true);
    assert.equal(localStorage.getItem(key), null);
    assert.equal(api.undoClearAnnotations(pageName), 1);
    assert.deepEqual(JSON.parse(sessionStorage.getItem(key)).annotations, [
        annotation,
    ]);
});

function activationSession(storage, confirm) {
    const { globals } = createDialogEnvironment({
        onDialog: (dialog) => {
            void Promise.resolve(confirm(dialog)).then((accepted) => {
                if (accepted) dialog.props.onPrimary();
                else dialog.props.onDefault();
            });
        },
    });
    return createSession({
        ...globals,
        window: { ...globals.window, ...storage },
        console: { error() {}, warn() {} },
    });
}

test('new-review confirmation shows the latest annotation edit in its own paragraph', async () => {
    const { api, localStorage, sessionStorage } = setup();
    api.importAnnotations(
        pageName,
        backup([
            {
                ...annotation,
                createdAt: new Date(2026, 8, 20, 9, 0).getTime(),
                updatedAt: new Date(2026, 8, 23, 14, 30).getTime(),
            },
            {
                ...annotation,
                id: 'newer',
                createdAt: new Date(2026, 8, 21, 10, 0).getTime(),
                updatedAt: undefined,
            },
        ]),
    );
    const session = activationSession(
        { localStorage, sessionStorage },
        (dialog) => {
            const paragraphs = dialog.children.default();
            assert.equal(paragraphs.length, 2);
            assert.equal(paragraphs[1].component, 'p');
            assert.match(
                paragraphs[1].props,
                /^最後修改時間：2026年9月23日 14:30 \[.+\]$/,
            );
            return false;
        },
    );
    await session.confirmClearOnFirstActivation(pageName, () =>
        assert.fail('unexpected clear'),
    );
});

for (const accepted of [true, false]) {
    test(`first activation prompts once and ${accepted ? 'clears on confirmation' : 'preserves comments on cancel'}`, async () => {
        const { api, localStorage, sessionStorage } = setup();
        api.importAnnotations(pageName, backup([annotation]));
        let prompts = 0;
        const session = activationSession(
            { localStorage, sessionStorage },
            () => {
                prompts++;
                return accepted;
            },
        );
        const clear = () => api.clearAnnotations(pageName);
        await session.confirmClearOnFirstActivation(pageName, clear);
        await session.confirmClearOnFirstActivation(pageName, clear);
        assert.equal(prompts, 1);
        assert.equal(
            api.loadAnnotations(pageName).annotations.length,
            accepted ? 0 : 1,
        );
        assert.equal(api.canUndoClearAnnotations(pageName), accepted);
    });
}

test('activating an empty page skips the prompt even after adding comments during that visit', async () => {
    const { api, localStorage, sessionStorage } = setup();
    const session = activationSession({ localStorage, sessionStorage }, () =>
        assert.fail('unexpected prompt'),
    );
    await session.confirmClearOnFirstActivation(pageName, () =>
        assert.fail('unexpected clear'),
    );
    api.importAnnotations(pageName, backup([annotation]));
    await session.confirmClearOnFirstActivation(pageName, () =>
        assert.fail('unexpected clear'),
    );
});

test('another page and a fresh visit get their own first-activation prompt', async () => {
    const { api, localStorage, sessionStorage } = setup();
    api.importAnnotations(pageName, backup([annotation]));
    api.importAnnotations('別頁', backup([annotation]));
    let prompts = 0;
    const confirm = () => {
        prompts++;
        return false;
    };
    const storage = { localStorage, sessionStorage };
    const session = activationSession(storage, confirm);
    await session.confirmClearOnFirstActivation(pageName, () => {});
    await session.confirmClearOnFirstActivation('別頁', () => {});
    await activationSession(storage, confirm).confirmClearOnFirstActivation(
        pageName,
        () => {},
    );
    assert.equal(prompts, 3);
});

test('pending confirmation preserves comments and repeated activation does not open another dialog', async () => {
    const { api, localStorage, sessionStorage } = setup();
    api.importAnnotations(pageName, backup([annotation]));
    let respond;
    let prompts = 0;
    const session = activationSession({ localStorage, sessionStorage }, () => {
        prompts++;
        return new Promise((resolve) => {
            respond = resolve;
        });
    });
    const pending = session.confirmClearOnFirstActivation(pageName, () =>
        api.clearAnnotations(pageName),
    );
    await new Promise((resolve) => setImmediate(resolve));
    await session.confirmClearOnFirstActivation(pageName, () =>
        assert.fail('duplicate clear'),
    );
    assert.equal(prompts, 1);
    assert.equal(api.loadAnnotations(pageName).annotations.length, 1);
    respond(true);
    await pending;
    assert.equal(api.loadAnnotations(pageName).annotations.length, 0);
    assert.equal(api.canUndoClearAnnotations(pageName), true);
});

test('failed Codex loading preserves existing annotations', async () => {
    const { api, localStorage, sessionStorage } = setup();
    api.importAnnotations(pageName, backup([annotation]));
    const error = new Error('Loading failed');
    const { globals } = createDialogEnvironment({ loadError: error });
    const session = createSession({
        ...globals,
        window: { ...globals.window, localStorage, sessionStorage },
    });
    await assert.rejects(
        session.confirmClearOnFirstActivation(pageName, () =>
            assert.fail('unexpected clear'),
        ),
        error,
    );
    assert.equal(api.loadAnnotations(pageName).annotations.length, 1);
});

test('invalid store creation metadata is repaired while existing comments survive', () => {
    const { api, localStorage } = setup();
    localStorage.setItem(
        key,
        JSON.stringify({
            createdAt: Number.MAX_VALUE,
            annotations: [annotation],
        }),
    );
    const store = api.loadAnnotations(pageName);
    assert.ok(Number.isFinite(new Date(store.createdAt).getTime()));
    assert.equal(store.annotations[0].id, annotation.id);
});

test('new-review confirmation uses Simplified Chinese for the relative edit time', async () => {
    const { api, localStorage, sessionStorage } = setup();
    const editedAt = Date.now() - 45 * 60_000;
    api.importAnnotations(
        pageName,
        backup([{ ...annotation, createdAt: editedAt, updatedAt: editedAt }]),
    );
    let detail;
    const environment = createDialogEnvironment({
        onDialog: (dialog) => {
            detail = dialog.children.default()[1].props;
            dialog.props.onDefault();
        },
    });
    const context = vm.createContext({
        ...environment.globals,
        window: { ...environment.globals.window, localStorage, sessionStorage },
    });
    vm.runInContext(sessionFixture[0].text, context);
    context.sessionTest.state.convByVar = (variants) => variants.hans;
    await context.sessionTest.confirmClearOnFirstActivation(pageName, () =>
        assert.fail('unexpected clear'),
    );
    assert.match(detail, /最后修改时间：.*\[45分钟前\]/);
    assert.doesNotMatch(detail, /分鐘|小時|剛剛/);
});
