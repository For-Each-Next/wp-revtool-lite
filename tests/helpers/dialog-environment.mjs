/**
 * @file tests/helpers/dialog-environment.mjs
 * Purpose: tests / helpers / dialog environment module.
 *
 * Table of contents:
 * 1. Imports
 * 2. createDialogEnvironment
 */

import assert from 'node:assert/strict';

export function createDialogEnvironment({ onDialog, loadError } = {}) {
    const elements = new Map();
    const timers = new Map();
    const apps = [];
    const CdxDialog = {};
    let onUnmounted;
    const Vue = {
        ref: (value) => ({ value }),
        h: (component, props, children) => ({ component, props, children }),
        onUnmounted: (callback) => {
            onUnmounted = callback;
        },
        createMwApp: (options) => {
            const app = {
                mount() {
                    app.render = options.setup();
                    app.onUnmounted = onUnmounted;
                    onDialog?.(app.render());
                },
                unmount: () => app.onUnmounted?.(),
                component() {},
            };
            apps.push(app);
            return app;
        },
    };
    return {
        apps,
        elements,
        CdxDialog,
        flush: () => {
            const pending = [...timers.values()];
            timers.clear();
            pending.forEach((callback) => callback());
        },
        globals: {
            document: {
                getElementById: (id) => elements.get(id) ?? null,
                createElement: () => ({
                    id: '',
                    remove() {
                        elements.delete(this.id);
                    },
                }),
                body: {
                    appendChild: (element) => elements.set(element.id, element),
                },
            },
            window: {
                confirm: () =>
                    assert.fail('browser confirmation must not be used'),
                addEventListener() {},
                removeEventListener() {},
                setTimeout: (callback) => {
                    const id = {};
                    timers.set(id, callback);
                    return id;
                },
                clearTimeout: (id) => timers.delete(id),
            },
            mw: {
                config: { get: () => 'Test user' },
                loader: {
                    using: async (module) => {
                        assert.equal(module, '@wikimedia/codex');
                        if (loadError) throw loadError;
                        return (name) => (name === 'vue' ? Vue : { CdxDialog });
                    },
                },
            },
        },
    };
}
