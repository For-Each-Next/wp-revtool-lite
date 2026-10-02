/**
 * @file src/platform/browser/dom/article-selection.ts
 * Purpose: src / platform / browser / dom / article selection module.
 *
 * Table of contents:
 * 1. Imports
 * 2. AnnotateSelection
 * 3. installArticleSelection
 */

import state from '../../mediawiki/context';
import { getCleanTextFromRange } from './article-text';
import { getElementOrderKey } from './numeric-pos';
import {
    REFERENCE_MARKER_SELECTOR,
    REFERENCE_CONTROLS_SELECTOR,
} from './reference-links';
import { SENTENCE_SELECTOR } from './sentence-wrapping';

type AnnotateSelection = (range: Range, text: string, position: string) => void;

/** Own the listeners, timers and button for one rendered article. */
export function installArticleSelection(
    root: Element,
    annotate: AnnotateSelection,
): () => void {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'review-tool-annotation-ui floating-button';
    button.textContent = state.convByVar({ hant: '批註', hans: '批注' });
    button.style.display = 'none';
    document.body.appendChild(button);

    let selecting = false;
    let dragged = false;
    let pressPosition: { x: number; y: number } | null = null;
    let selectionTimer: number | undefined;
    let hideTimer: number | undefined;

    const hide = () => {
        window.clearTimeout(hideTimer);
        button.style.display = 'none';
        button.onclick = null;
    };
    const insideButton = (event: Event) =>
        event.target instanceof Node && button.contains(event.target);
    const selectedRange = (): Range | null => {
        const selection = document.getSelection();
        if (!selection?.rangeCount || selection.isCollapsed) return null;
        const range = selection.getRangeAt(0);
        return root.contains(range.startContainer) &&
            root.contains(range.endContainer)
            ? range
            : null;
    };
    const show = (range: Range) => {
        const text = getCleanTextFromRange(range);
        if (!text) {
            hide();
            return;
        }
        const savedRange = range.cloneRange();
        const node = range.startContainer;
        const element = node instanceof Element ? node : node.parentElement;
        const sentence = element?.closest(SENTENCE_SELECTOR) ?? element;
        const position = getElementOrderKey(sentence) ?? '';
        const rect = range.getBoundingClientRect();
        const centerX = Math.max(
            40,
            Math.min(window.innerWidth - 40, rect.left + rect.width / 2),
        );
        window.clearTimeout(hideTimer);
        button.style.left = `${centerX + window.scrollX}px`;
        button.style.top = `${Math.max(8, rect.top + window.scrollY - 8)}px`;
        button.style.display = 'block';
        button.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            hide();
            window.clearTimeout(selectionTimer);
            if (
                !root.isConnected ||
                !root.contains(savedRange.commonAncestorContainer)
            )
                return;
            document.getSelection()?.removeAllRanges();
            annotate(savedRange, text, position);
        };
    };
    const onSelectionChange = () => {
        window.clearTimeout(selectionTimer);
        if (selecting) return;
        selectionTimer = window.setTimeout(() => {
            const range = selectedRange();
            if (root.isConnected && range) show(range);
            else hide();
        }, 120);
    };
    const onPress = (event: MouseEvent | TouchEvent) => {
        if (insideButton(event)) return;
        dragged = false;
        pressPosition =
            event instanceof MouseEvent
                ? { x: event.clientX, y: event.clientY }
                : null;
        selecting = true;
        window.clearTimeout(selectionTimer);
        document.documentElement.classList.add('rt-selecting');
        hide();
    };
    const onRelease = (event: MouseEvent | TouchEvent) => {
        dragged =
            event instanceof MouseEvent &&
            pressPosition !== null &&
            (Math.abs(event.clientX - pressPosition.x) > 3 ||
                Math.abs(event.clientY - pressPosition.y) > 3);
        pressPosition = null;
        selecting = false;
        document.documentElement.classList.remove('rt-selecting');
        if (!insideButton(event)) onSelectionChange();
    };
    const onClick = (event: Event) => {
        if (
            !(event.target instanceof Element) ||
            event.target.closest(
                `${REFERENCE_MARKER_SELECTOR}, ${REFERENCE_CONTROLS_SELECTOR}, .review-tool-inline-annotation`,
            )
        )
            return;
        const sentence = event.target.closest(SENTENCE_SELECTOR);
        if (
            !sentence ||
            !root.contains(sentence) ||
            dragged ||
            !document.getSelection()?.isCollapsed
        )
            return;
        event.preventDefault();
        event.stopPropagation();
        const range = document.createRange();
        range.selectNodeContents(sentence);
        const selection = document.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        show(range);
    };
    button.onmouseenter = () => window.clearTimeout(hideTimer);
    button.onmouseleave = () => {
        hideTimer = window.setTimeout(hide, 180);
    };
    root.addEventListener('click', onClick);
    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('mousedown', onPress);
    document.addEventListener('mouseup', onRelease);
    document.addEventListener('touchstart', onPress, { passive: true });
    document.addEventListener('touchend', onRelease);
    document.addEventListener('touchcancel', onRelease);

    return () => {
        window.clearTimeout(selectionTimer);
        window.clearTimeout(hideTimer);
        document.documentElement.classList.remove('rt-selecting');
        root.removeEventListener('click', onClick);
        document.removeEventListener('selectionchange', onSelectionChange);
        document.removeEventListener('mousedown', onPress);
        document.removeEventListener('mouseup', onRelease);
        document.removeEventListener('touchstart', onPress);
        document.removeEventListener('touchend', onRelease);
        document.removeEventListener('touchcancel', onRelease);
        button.remove();
    };
}
