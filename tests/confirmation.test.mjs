/**
 * @file tests/confirmation.test.mjs
 * Purpose: tests / confirmation.test module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. Test scenarios
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileModule } from './helpers/load-module.mjs';
import { createDialogEnvironment } from './helpers/dialog-environment.mjs';

const createConfirmation = await compileModule(
    'features/annotations/confirmation.ts',
);
const options = {
    title: '開始新的評審',
    message: '清除批註？',
    confirmLabel: '清除批註',
    cancelLabel: '取消',
};
const settle = () => new Promise((resolve) => setImmediate(resolve));

for (const [event, confirmed] of [
    ['onPrimary', true],
    ['onDefault', false],
    ['onUpdate:open', false],
]) {
    test(`Codex ${event} resolves ${confirmed} and cleans up after closing`, async () => {
        const { globals, apps, elements, CdxDialog, flush } =
            createDialogEnvironment();
        const api = createConfirmation(globals);
        const result = api.openConfirmationDialog(options);
        await settle();
        const dialog = apps[0].render();
        assert.equal(dialog.component, CdxDialog);
        assert.equal(dialog.props.title, options.title);
        assert.equal(dialog.props.primaryAction.label, options.confirmLabel);
        assert.equal(dialog.props.primaryAction.actionType, 'default');
        assert.equal(dialog.props.defaultAction.label, options.cancelLabel);
        assert.equal(dialog.children.default()[0].props, options.message);
        dialog.props[event](false);
        dialog.props.onPrimary(); // A second event cannot change the first decision.
        assert.equal(await result, confirmed);
        assert.equal(apps[0].render().props.open, false);
        flush();
        assert.equal(elements.size, 0);
    });
}

test('replacing a pending confirmation cancels it without closing its replacement', async () => {
    const { globals, apps, elements, flush } = createDialogEnvironment();
    const api = createConfirmation(globals);
    const first = api.openConfirmationDialog(options);
    await settle();
    const second = api.openConfirmationDialog(options);
    assert.equal(await first, false);
    flush();
    assert.equal(elements.size, 1);
    apps[1].render().props.onDefault();
    assert.equal(await second, false);
    flush();
    assert.equal(elements.size, 0);
});
