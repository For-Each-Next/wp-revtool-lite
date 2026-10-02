/**
 * @file src/platform/browser/dom/numeric-pos.ts
 * Purpose: src / platform / browser / dom / numeric pos module.
 *
 * Table of contents:
 * 1. countPreviousElementSiblings
 * 2. getElementPathArray
 * 3. getElementOrderKey
 */

function countPreviousElementSiblings(node: Element | null): number {
    let index = 0;
    let sibling = node?.previousElementSibling ?? null;
    while (sibling) {
        index++;
        sibling = sibling.previousElementSibling;
    }
    return index;
}

function getElementPathArray(element: Element | null): number[] | null {
    if (!element) return null;
    const rootEl = document.querySelector('#mw-content-text');
    if (!rootEl || !rootEl.contains(element)) return null;

    const path: number[] = [];
    let node: Element | null = element;

    while (node && node !== rootEl) {
        path.push(countPreviousElementSiblings(node));
        node = node.parentElement;
    }

    if (node !== rootEl) {
        return null;
    }

    path.reverse();
    return path;
}

export function getElementOrderKey(element: Element | null): string | null {
    return (
        getElementPathArray(element)
            ?.map((segment) => String(segment).padStart(6, '0'))
            .join('.') ?? null
    );
}
