/**
 * @file src/platform/browser/dom/annotation-anchor.ts
 * Purpose: src / platform / browser / dom / annotation anchor module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. TextSegment
 * 4. ArticleTextIndex
 * 5. buildArticleTextIndex
 * 6. captureAnnotationAnchor
 * 7. rangeAt
 * 8. findAnnotationRange
 */

import type {
    Annotation,
    AnnotationTextAnchor,
} from '../../../domain/annotations';

// Sentence wrappers are transparent; citations and gadget controls are not article text.
const EXCLUDED_TEXT = [
    'script',
    'style',
    'noscript',
    'textarea',
    'button',
    'input',
    'select',
    '.reference',
    '.mw-ref',
    '.citation',
    '.ref',
    '.reference-text',
    '.reference-note',
    '[data-reference]',
    '[data-ref]',
    '.mw-editsection',
    '.qeec-ref-tag-copy-btn',
    'ipe-quick-edit',
    '.ipe__in-article-link',
    '.ipe-quick-edit',
    '.ipe-quick-edit--create-only',
    '.review-tool-inline-annotation',
    '.floating-button',
    '.review-tool-global-button',
    '.review-tool-dialog',
    '.review-tool-reference-tip',
].join(',');

interface TextSegment {
    node: Text;
    start: number;
    offsets: number[];
}

export interface ArticleTextIndex {
    text: string;
    segments: TextSegment[];
}

export function buildArticleTextIndex(root: Element): ArticleTextIndex {
    const segments: TextSegment[] = [];
    let text = '';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) =>
            node.parentElement?.closest(EXCLUDED_TEXT)
                ? NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_ACCEPT,
    });
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
        const value = node.data;
        const offsets: number[] = [];
        // Ignore layout whitespace so wrapping/unwrapping sentences keeps anchors stable.
        const characters = value.replace(/\s/g, '');
        if (!characters) continue;
        for (let i = 0; i < value.length; i++) {
            if (!/\s/.test(value[i])) offsets.push(i);
        }
        segments.push({ node, start: text.length, offsets });
        text += characters;
    }
    return { text, segments };
}

export function captureAnnotationAnchor(
    index: ArticleTextIndex,
    range: Range,
): AnnotationTextAnchor | undefined {
    let start: number | undefined;
    let end = 0;
    for (const { node, start: segmentStart, offsets } of index.segments) {
        if (!range.intersectsNode(node)) continue;
        for (const [characterIndex, offset] of offsets.entries()) {
            if (range.comparePoint(node, offset) < 0) continue;
            if (range.comparePoint(node, offset + 1) > 0) break;
            if (start === undefined) start = segmentStart + characterIndex;
            end = segmentStart + characterIndex + 1;
        }
    }
    return start === undefined
        ? undefined
        : { start, end, quote: index.text.slice(start, end) };
}

function rangeAt(
    index: ArticleTextIndex,
    start: number,
    end: number,
): Range | null {
    const first = index.segments.find(
        (segment) =>
            start >= segment.start &&
            start < segment.start + segment.offsets.length,
    );
    const last = index.segments.find(
        (segment) =>
            end > segment.start &&
            end <= segment.start + segment.offsets.length,
    );
    if (!first || !last) return null;
    const range = document.createRange();
    range.setStart(first.node, first.offsets[start - first.start]);
    range.setEnd(last.node, last.offsets[end - last.start - 1] + 1);
    return range;
}

export function findAnnotationRange(
    index: ArticleTextIndex,
    annotation: Annotation,
    sectionPathForNode: (node: Node) => string,
): Range | null {
    const anchor = annotation.textAnchor;
    if (anchor) {
        // Do not attach a saved position to text that has changed.
        return index.text.slice(anchor.start, anchor.end) === anchor.quote
            ? rangeAt(index, anchor.start, anchor.end)
            : null;
    }

    // Older annotations have only a quote. Restore only an unambiguous match.
    const quote = annotation.sentenceText.replace(/\s/g, '');
    if (!quote) return null;
    const matches: Range[] = [];
    let start = index.text.indexOf(quote);
    while (start !== -1) {
        const range = rangeAt(index, start, start + quote.length);
        if (range) matches.push(range);
        start = index.text.indexOf(quote, start + 1);
    }
    if (matches.length === 1) return matches[0];
    const inSection = matches.filter(
        (range) =>
            sectionPathForNode(range.startContainer) === annotation.sectionPath,
    );
    return inSection.length === 1 ? inSection[0] : null;
}
