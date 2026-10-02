/**
 * @file tests/dialog.test.mjs
 * Purpose: tests / dialog.test module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. setup
 * 4. Test scenarios
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileModule } from './helpers/load-module.mjs';

const createDialog = await compileModule('platform/mediawiki/dialog.ts');

function setup() {
    const elements = new Map();
    const timers = new Map();
    const listeners = new Map();
    let timerId = 0;
    const document = {
        getElementById: (id) => elements.get(id) ?? null,
        createElement: () => ({
            id: '',
            remove() {
                elements.delete(this.id);
            },
        }),
        body: { appendChild: (element) => elements.set(element.id, element) },
    };
    const window = {
        addEventListener: (type, callback) => listeners.set(type, callback),
        removeEventListener: (type) => listeners.delete(type),
        setTimeout: (callback) => {
            timers.set(++timerId, callback);
            return timerId;
        },
        clearTimeout: (id) => timers.delete(id),
    };
    const api = createDialog({ document, window });
    const app = () => ({
        mount() {},
        unmounts: 0,
        unmount() {
            this.unmounts++;
        },
    });
    const flush = () => {
        const pending = [...timers.values()];
        timers.clear();
        pending.forEach((callback) => callback());
    };
    return { api, app, elements, listeners, flush };
}

test('closing a dialog unmounts Vue and removes its mount and IME listeners', () => {
    const { api, app, elements, listeners, flush } = setup();
    const current = app();
    let closed = 0;
    api.mountApp(current);
    assert.equal(elements.size, 1);
    assert.equal(listeners.size, 7);
    api.closeDialogAfterTransition(() => closed++);
    assert.equal(current.unmounts, 0);
    flush();
    assert.equal(current.unmounts, 1);
    assert.equal(elements.size, 0);
    assert.equal(listeners.size, 0);
    assert.equal(closed, 1);
});

test('a stale close timer cannot remove a replacement dialog or run its close callback', () => {
    const { api, app, elements, listeners, flush } = setup();
    const previous = app();
    const replacement = app();
    api.mountApp(previous);
    api.closeDialogAfterTransition(() => assert.fail('stale callback ran'));
    api.mountApp(replacement);
    flush();
    assert.equal(previous.unmounts, 1);
    assert.equal(replacement.unmounts, 0);
    assert.equal(elements.size, 1);
    assert.equal(listeners.size, 7);
});

test('repeated close requests only unmount and notify once', () => {
    const { api, app, flush } = setup();
    const current = app();
    let closed = 0;
    api.mountApp(current);
    api.closeDialogAfterTransition(() => closed++);
    api.closeDialogAfterTransition(() => closed++);
    flush();
    assert.equal(current.unmounts, 1);
    assert.equal(closed, 1);
});

test('IME protection is limited to inputs in this tool’s dialogs', async (t) => {
    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM(
        '<div class="review-tool-dialog"><textarea id="own"></textarea></div><textarea id="other"></textarea>',
    );
    t.after(() => dom.window.close());
    const { window } = dom;
    const {
        document,
        HTMLElement,
        HTMLInputElement,
        HTMLTextAreaElement,
        InputEvent,
    } = window;
    const api = createDialog({
        window,
        document,
        HTMLElement,
        HTMLInputElement,
        HTMLTextAreaElement,
        InputEvent,
    });
    api.mountApp({ mount() {}, unmount() {} });
    const own = document.getElementById('own');
    const other = document.getElementById('other');
    own.focus();
    own.dispatchEvent(
        new window.CompositionEvent('compositionstart', { bubbles: true }),
    );
    const ownEscape = new window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
        isComposing: true,
    });
    own.dispatchEvent(ownEscape);
    assert.equal(ownEscape.defaultPrevented, true);
    other.focus();
    const otherEscape = new window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
        isComposing: true,
    });
    other.dispatchEvent(otherEscape);
    assert.equal(otherEscape.defaultPrevented, false);
});
