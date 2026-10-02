/**
 * @file src/platform/mediawiki/dialog.ts
 * Purpose: src / platform / mediawiki / dialog module.
 *
 * Table of contents:
 * 1. Imports
 * 2. VueApp
 * 3. VueModule
 * 4. CodexModule
 * 5. Constants and state
 * 6. isEditableEventTarget
 * 7. onCompositionStart
 * 8. onCompositionEnd
 * 9. onCompositionInput
 * 10. isCompositionLikelyActive
 * 11. onEscapeKey
 * 12. onDialogCancel
 * 13. installImeEscGuard
 * 14. removeImeEscGuard
 * 15. loadCodexAndVue
 * 16. createDialogMountIfNeeded
 * 17. mountApp
 * 18. removeDialogMount
 * 19. closeDialogAfterTransition
 * 20. registerCodexComponents
 */

import type { App, Component } from 'vue';
import { setVueRuntime } from './vue-runtime';

export type VueApp = Pick<App, 'mount' | 'unmount' | 'component'>;
export type VueModule = typeof import('vue') & {
    createMwApp: (options: Component) => VueApp;
};

// The npm package supplies types; MediaWiki supplies the runtime via ResourceLoader.
type CodexModule = Partial<
    Pick<
        typeof import('@wikimedia/codex'),
        | 'CdxDialog'
        | 'CdxButton'
        | 'CdxMenuButton'
        | 'CdxSelect'
        | 'CdxTextArea'
        | 'CdxField'
        | 'CdxMessage'
        | 'CdxProgressBar'
    >
>;

let mountedApp: VueApp | null = null;
let imeListenersInstalled = false;
let isImeComposing = false;
let imeResetTimer: number | null = null;
let lastCompositionAt = 0;

/**
 * Helper to determine if an event target is an editable element that may be using IME, for the purpose of guarding Escape key behavior during composition.
 * @param {EventTarget | null} target - The event target to check.
 * @returns {boolean} True if the target is an editable element that may be using IME, false otherwise.
 */
function isEditableEventTarget(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    if (!target.closest('.review-tool-dialog')) return false;
    if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
    ) {
        return !target.disabled && !target.readOnly;
    }
    return target.isContentEditable;
}

/**
 * Mark IME composition as active.
 */
function onCompositionStart(event: Event): void {
    if (!isEditableEventTarget(event.target)) return;
    if (imeResetTimer !== null) {
        window.clearTimeout(imeResetTimer);
        imeResetTimer = null;
    }
    isImeComposing = true;
    lastCompositionAt = Date.now();
}

/**
 * Reset IME composition state when composition ends.
 */
function onCompositionEnd(event: Event): void {
    if (!isEditableEventTarget(event.target)) return;
    lastCompositionAt = Date.now();
    // Keep composition active briefly to absorb Esc cancel timing differences across browsers/IMEs.
    if (imeResetTimer !== null) {
        window.clearTimeout(imeResetTimer);
    }
    imeResetTimer = window.setTimeout(() => {
        isImeComposing = false;
        imeResetTimer = null;
    }, 80);
}

/**
 * Track composition-like input activity to handle browser/IME event-order differences.
 * @param {InputEvent} event - The beforeinput/input event.
 */
function onCompositionInput(event: Event): void {
    if (!(event instanceof InputEvent)) return;
    if (!isEditableEventTarget(event.target)) return;
    const inputType =
        typeof event.inputType === 'string' ? event.inputType : '';
    if (event.isComposing || inputType.startsWith('insertComposition')) {
        lastCompositionAt = Date.now();
        isImeComposing = true;
    }
}

/**
 * Check if IME composition is currently active or was active very recently.
 * @returns {boolean} True when composition should still suppress Escape-driven dialog close.
 */
function isCompositionLikelyActive(): boolean {
    if (isImeComposing) return true;
    return Date.now() - lastCompositionAt <= 500;
}

/**
 * Guard Escape key behavior during IME composition to prevent dialogs from closing when users intend to cancel IME input.
 * @param {KeyboardEvent} event - The key event to check.
 */
function onEscapeKey(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    const editableTarget =
        isEditableEventTarget(event.target) ||
        isEditableEventTarget(document.activeElement);
    // While IME composition is active, keep Escape for IME cancellation instead of dialog close.
    if (editableTarget && (event.isComposing || isCompositionLikelyActive())) {
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
    }
}

/**
 * Prevent native dialog cancel (Esc) while IME composition is active/recent.
 * @param {Event} event - The cancel event dispatched by HTMLDialogElement.
 */
function onDialogCancel(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target || target.tagName !== 'DIALOG') return;
    if (!isCompositionLikelyActive()) return;
    if (!isEditableEventTarget(document.activeElement)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
}

/**
 * Install global event listeners to track IME composition state and guard Escape key behavior accordingly.
 * This should be called when any dialog is opened to ensure proper handling of Escape key during IME input.
 */
function installImeEscGuard(): void {
    if (imeListenersInstalled) return;
    window.addEventListener('compositionstart', onCompositionStart, true);
    window.addEventListener('compositionend', onCompositionEnd, true);
    window.addEventListener('beforeinput', onCompositionInput, true);
    window.addEventListener('input', onCompositionInput, true);
    window.addEventListener('keydown', onEscapeKey, true);
    window.addEventListener('keyup', onEscapeKey, true);
    window.addEventListener('cancel', onDialogCancel, true);
    imeListenersInstalled = true;
}

/**
 * Remove global event listeners for IME composition tracking and Escape key guarding.
 * This should be called when dialogs are closed to clean up event listeners.
 */
function removeImeEscGuard(): void {
    if (!imeListenersInstalled) return;
    window.removeEventListener('compositionstart', onCompositionStart, true);
    window.removeEventListener('compositionend', onCompositionEnd, true);
    window.removeEventListener('beforeinput', onCompositionInput, true);
    window.removeEventListener('input', onCompositionInput, true);
    window.removeEventListener('keydown', onEscapeKey, true);
    window.removeEventListener('keyup', onEscapeKey, true);
    window.removeEventListener('cancel', onDialogCancel, true);
    if (imeResetTimer !== null) {
        window.clearTimeout(imeResetTimer);
        imeResetTimer = null;
    }
    imeListenersInstalled = false;
    isImeComposing = false;
    lastCompositionAt = 0;
}

const MOUNT_ID = 'review-tool-dialog-mount';
const CLOSE_DELAY_MS = 200;

export async function loadCodexAndVue(): Promise<{
    Vue: VueModule;
    Codex: CodexModule;
}> {
    const requireModule = await mw.loader.using('@wikimedia/codex');
    const Vue = requireModule('vue') as VueModule;
    const Codex = requireModule('@wikimedia/codex') as CodexModule;
    setVueRuntime(Vue);
    return { Vue, Codex };
}

function createDialogMountIfNeeded(): HTMLElement {
    const existing = document.getElementById(MOUNT_ID);
    if (existing) return existing;
    const mountPoint = document.createElement('div');
    mountPoint.id = MOUNT_ID;
    document.body.appendChild(mountPoint);
    return mountPoint;
}

export function mountApp(app: VueApp): unknown {
    if (mountedApp) removeDialogMount();
    const mountPoint = createDialogMountIfNeeded();
    installImeEscGuard();
    mountedApp = app;
    return app.mount(mountPoint);
}

function removeDialogMount(): void {
    const app = mountedApp;
    mountedApp = null;
    app?.unmount();
    document.getElementById(MOUNT_ID)?.remove();
    removeImeEscGuard();
}

// A closing dialog must never remove a replacement opened during its transition.
export function closeDialogAfterTransition(onClosed?: () => void): void {
    const app = mountedApp;
    if (!app) return;
    window.setTimeout(() => {
        if (mountedApp !== app) return;
        removeDialogMount();
        onClosed?.();
    }, CLOSE_DELAY_MS);
}

export function registerCodexComponents(app: VueApp, Codex: CodexModule): void {
    const components = {
        'cdx-dialog': Codex.CdxDialog,
        'cdx-text-area': Codex.CdxTextArea,
        'cdx-field': Codex.CdxField,
        'cdx-select': Codex.CdxSelect,
        'cdx-button': Codex.CdxButton,
        'cdx-menu-button': Codex.CdxMenuButton,
        'cdx-message': Codex.CdxMessage,
        'cdx-progress-bar': Codex.CdxProgressBar,
    };
    for (const [name, component] of Object.entries(components)) {
        if (component) app.component(name, component as Component);
    }
}
