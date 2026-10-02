/**
 * @file src/platform/browser/dom/article-text.ts
 * Purpose: src / platform / browser / dom / article text module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. cleanContainerText
 * 4. getCleanTextFromRange
 * 5. previousNode
 * 6. findHeadingElementFromNode
 * 7. getHeadingLevelAndTitle
 * 8. computeSectionPathFromNode
 */

import state from '../../mediawiki/context';
import { getHeadingTitle } from './heading';
import { REFERENCE_CONTROLS_SELECTOR } from './reference-links';

const TEXT_DECORATIONS = [
    '.reference',
    '.mw-ref',
    '.citation',
    '.ref',
    '.reference-text',
    '.qeec-ref-tag-copy-btn',
    '[data-reference]',
    '[data-ref]',
    '.reference-note',
    '.review-tool-inline-annotation',
    REFERENCE_CONTROLS_SELECTOR,
].join(',');

function cleanContainerText(container: Element): string {
    const selector = `${TEXT_DECORATIONS}, style, ipe-quick-edit`;
    container.querySelectorAll(selector).forEach((node) => node.remove());
    return (container.textContent ?? '')
        .replace(/Copy permalink/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function getCleanTextFromRange(range: Range | null): string {
    if (!range) return '';
    const wrapper = document.createElement('div');
    wrapper.appendChild(range.cloneContents());
    return cleanContainerText(wrapper);
}

function previousNode(node: Node | null): Node | null {
    if (!node) return null;
    if (node.previousSibling) {
        let p: Node | null = node.previousSibling;
        while (p?.lastChild) p = p.lastChild;
        return p;
    }
    return node.parentNode;
}

function findHeadingElementFromNode(node: Node | null): Element | null {
    let cur: Node | null = node;
    while (cur) {
        if (cur instanceof Element) {
            const el = cur;
            const tag = el.tagName.toLowerCase();
            if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) return el;
            if (el.classList.contains('mw-heading')) return el;
        }
        cur = cur.parentNode;
    }
    return null;
}

function getHeadingLevelAndTitle(el: Element | null): {
    level: number | null;
    title: string | null;
} {
    if (!el) return { level: null, title: null };
    const tag = el.tagName.toLowerCase();
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
        const level = parseInt(tag.charAt(1), 10);
        const title = getHeadingTitle(el) || null;
        return { level, title };
    }
    const inner = el.querySelector('h1,h2,h3,h4,h5,h6');
    if (inner) {
        const lvl = parseInt(inner.tagName.charAt(1), 10);
        const title = getHeadingTitle(el) || getHeadingTitle(inner) || null;
        return { level: lvl, title };
    }
    const t = getHeadingTitle(el);
    return { level: null, title: t };
}

export function computeSectionPathFromNode(startNode: Node | null): string {
    const pageFallback =
        state.articleTitle || state.convByVar({ hant: '導言', hans: '导言' });
    if (!startNode) return pageFallback;
    let anchor: Node | null = startNode;
    if (anchor.nodeType === Node.TEXT_NODE) anchor = anchor.parentNode;
    if (!anchor) return pageFallback;

    // Walk strictly backwards from the start position and collect the nearest
    // heading for each level. This ensures we pick the closest H3 rather than
    // an earlier sibling H3 that appears before it.
    const nearestByLevel = new Map<number, string>();
    let nextLevel = 7;
    let cur: Node | null = anchor;
    while (cur) {
        cur = previousNode(cur);
        if (!cur) break;
        const hEl = findHeadingElementFromNode(cur);
        if (!hEl) continue;
        const info = getHeadingLevelAndTitle(hEl);
        if (!info.title || info.level === null) continue;
        // Skip h1: don't treat page title as a section
        if (info.level === 1) continue;
        // Earlier sibling subsections cannot be ancestors of the current section
        if (info.level >= nextLevel) continue;
        nextLevel = info.level;
        nearestByLevel.set(info.level, info.title);
        // Stop early when we have found an H2 (top-level section)
        if (info.level === 2) break;
    }

    if (nearestByLevel.size === 0) return pageFallback;

    // Build ordered parts from H2 -> H6 using nearest found titles
    const parts: string[] = [];
    for (let lvl = 2; lvl <= 6; lvl++) {
        const title = nearestByLevel.get(lvl);
        if (title) parts.push(title);
    }
    return parts.join('—');
}
