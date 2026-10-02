/**
 * @file src/features/annotations/comment-shortcuts.ts
 * Purpose: src / features / annotations / comment shortcuts module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. continueCommentList
 * 4. expandShortcuts
 */

import type { ObjectDirective } from 'vue';

const cleanupHandlers = new WeakMap<HTMLElement, () => void>();

function continueCommentList(textarea: HTMLTextAreaElement): void {
    const caret = textarea.selectionStart;
    const newline = caret - 1;
    if (textarea.value[newline] !== '\n') return;
    const lineStart = textarea.value.slice(0, newline).lastIndexOf('\n') + 1;
    const previousLine = textarea.value.slice(lineStart, newline);
    if (!previousLine.trim()) return;

    const bullet = previousLine.match(/^([ \t]*)(\*+)[ \t]*/);
    const marker = bullet ? `${bullet[1]}${bullet[2]} ` : '* ';
    const firstComment = bullet ? previousLine : `* ${previousLine}`;
    const nextCaret =
        caret + firstComment.length - previousLine.length + marker.length;
    textarea.value = `${textarea.value.slice(0, lineStart) + firstComment}\n${marker}${textarea.value.slice(caret)}`;
    textarea.setSelectionRange(nextCaret, nextCaret);
}

function expandShortcuts(textarea: HTMLTextAreaElement): boolean {
    const changes: {
        offset: number;
        length: number;
        replacementLength: number;
    }[] = [];
    const value = textarea.value.replace(
        /<<([^<>]+)>>/g,
        (match: string, content: string, offset: number) => {
            const replacement = `「{{仿宋体|1=${content}}}」`;
            changes.push({
                offset,
                length: match.length,
                replacementLength: replacement.length,
            });
            return replacement;
        },
    );
    if (!changes.length) return false;

    const mapPosition = (position: number) => {
        let shift = 0;
        for (const change of changes) {
            if (position <= change.offset) break;
            if (position < change.offset + change.length) {
                return change.offset + shift + change.replacementLength;
            }
            shift += change.replacementLength - change.length;
        }
        return position + shift;
    };
    const start = mapPosition(textarea.selectionStart);
    const end = mapPosition(textarea.selectionEnd);
    const direction = textarea.selectionDirection;
    textarea.value = value;
    textarea.setSelectionRange(start, end, direction);
    return true;
}

export const commentShortcuts: ObjectDirective<HTMLElement> = {
    mounted(element) {
        const textarea = element.querySelector('textarea');
        if (!textarea) return;
        let composing = false;
        const onCompositionStart = () => {
            composing = true;
        };
        const onInput = (event: Event) => {
            const inputEvent = event as InputEvent;
            if (composing || inputEvent.isComposing) return;
            if (
                inputEvent.inputType === 'insertLineBreak' ||
                inputEvent.inputType === 'insertParagraph'
            ) {
                continueCommentList(textarea);
            }
            expandShortcuts(textarea);
        };
        const onCompositionEnd = () => {
            composing = false;
            if (expandShortcuts(textarea)) {
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        };
        // Convert before the text area's input handler updates the Vue model.
        textarea.addEventListener('input', onInput, true);
        textarea.addEventListener('compositionstart', onCompositionStart);
        textarea.addEventListener('compositionend', onCompositionEnd);
        cleanupHandlers.set(element, () => {
            textarea.removeEventListener('input', onInput, true);
            textarea.removeEventListener(
                'compositionstart',
                onCompositionStart,
            );
            textarea.removeEventListener('compositionend', onCompositionEnd);
        });
    },
    unmounted(element) {
        cleanupHandlers.get(element)?.();
        cleanupHandlers.delete(element);
    },
};
