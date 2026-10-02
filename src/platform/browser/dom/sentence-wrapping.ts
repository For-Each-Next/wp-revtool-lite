/**
 * @file src/platform/browser/dom/sentence-wrapping.ts
 * Purpose: src / platform / browser / dom / sentence wrapping module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. wrapArticleSentences
 * 4. clearWrappedSentences
 */

import {
    shouldTreatHalfWidthTerminators,
    splitTextIntoRanges,
    splitTextToPartsSimple,
} from '../../../domain/sentences';
import {
    REFERENCE_MARKER_SELECTOR,
    REFERENCE_CONTROLS_SELECTOR,
} from './reference-links';

const ANNOTATION_CONTAINER_CLASS = 'review-tool-annotation-ui';
const SENTENCE_CLASS = 'sentence';
export const SENTENCE_SELECTOR = '.review-tool-annotation-ui.sentence';
const INLINE_TAGS = new Set([
    'a',
    'span',
    'em',
    'strong',
    'b',
    'i',
    'small',
    'sup',
    'sub',
    'code',
    'cite',
    'abbr',
    'time',
    'mark',
    'var',
    'img',
    'kbd',
]);

// Wrap text nodes inside the section into sentence spans, handling nested markup (templates, references, etc.)
export function wrapArticleSentences(container: Element) {
    function getComputedLang(node: Node | null): string | null {
        let el: Element | null = null;
        if (node instanceof Element) el = node;
        el = el ?? node?.parentElement ?? null;
        while (el) {
            const lang = el.getAttribute('lang') || el.getAttribute('xml:lang');
            if (lang) return lang.toLowerCase();
            el = el.parentElement;
        }
        const docLang = document.documentElement?.getAttribute('lang');
        return docLang?.toLowerCase() ?? null;
    }

    // Helper to check if an element should be skipped (belongs to other scripts/widgets)
    function shouldSkipElement(node: Node): boolean {
        if (node.nodeType !== Node.ELEMENT_NODE) return false;
        const el = node as Element;

        // Skip elements that are already wrapped by us
        if (
            el.classList.contains(ANNOTATION_CONTAINER_CLASS) ||
            el.classList.contains('review-tool-inline-annotation') ||
            el.matches(REFERENCE_CONTROLS_SELECTOR)
        )
            return true;

        // Range extraction can split and clone inline citation markup, separating
        // its source and archive links. Keep reference nodes and tables intact;
        // text selection still permits annotations inside these structures.
        if (
            el.matches(`${REFERENCE_MARKER_SELECTOR}, .reference-text, .mw-reference-text, .citation, .mw-cite-backlink,
            .references, .mw-references-wrap, .reflist, [id^="cite_note-"],
            table, pre, code, svg, math, script, style, noscript, button, input, select, textarea`)
        )
            return true;

        // Skip elements with data attributes indicating they're from other scripts
        if (el.hasAttribute('data-gadget') || el.hasAttribute('data-widget'))
            return true;

        // Skip common script-inserted containers
        const skipClasses = [
            'mw-editsection',
            'mw-indicator',
            'navbox',
            'infobox',
            'metadata',
            'noprint',
            'navigation',
            'catlinks',
            'printfooter',
            'mw-jump-link',
            'skin-', // prefix match for skin-specific elements
            'vector-', // prefix match for Vector skin elements
            'qeec-ref-tag-copy-btn',
            'ipe__in-article-link',
            'ipe-quick-edit',
            'ipe-quick-edit--create-only',
        ];

        for (const cls of skipClasses) {
            if (
                el.className &&
                (el.classList.contains(cls) ||
                    (typeof el.className === 'string' &&
                        el.className.includes(cls)))
            ) {
                return true;
            }
        }

        // Skip elements with certain IDs that indicate non-content
        if (el.id) {
            if (
                el.id.startsWith('mw-') ||
                el.id.startsWith('footer-') ||
                el.id.startsWith('p-') ||
                el.id === 'siteSub' ||
                el.id === 'contentSub'
            ) {
                return true;
            }
        }

        return false;
    }

    function createSentenceSpan(
        content: string | DocumentFragment,
    ): HTMLSpanElement {
        const span = document.createElement('span');
        span.className = `${ANNOTATION_CONTAINER_CLASS} ${SENTENCE_CLASS}`;
        span.append(content);
        return span;
    }

    function wrapTextNode(node: Text, parts: string[]): void {
        const content = parts.length > 1 ? parts : [node.data];
        node.replaceWith(...content.map(createSentenceSpan));
    }

    // Process an element root - gather its text nodes and map offsets
    function processElementRoot(root: Element) {
        if (shouldSkipElement(root)) return;
        const allowHalfWidth = shouldTreatHalfWidthTerminators(
            getComputedLang(root),
        );
        // If this root has element children that are non-inline (block/boundary),
        // process each child separately to avoid creating ranges that span across
        // sibling block elements (which breaks lists, tables, etc.). However,
        // treat common inline elements (like <a>, <span>, <em>, <strong>) as
        // transparent so their text is included in the same sentence span.
        const elementChildren = Array.from(root.children);
        const hasNonInlineElementChildren = elementChildren.some(
            (el) => !INLINE_TAGS.has(el.tagName.toLowerCase()),
        );
        if (hasNonInlineElementChildren) {
            // process children individually so we don't span across block/boundary elements
            Array.from(root.childNodes).forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                    // simple inline text splitting for direct text nodes
                    const textNode = child as Text;
                    const text = textNode.nodeValue || '';
                    if (!text.trim()) return;
                    const parts = splitTextIntoRanges(
                        text,
                        getComputedLang(textNode),
                    )
                        .map((r) => text.slice(r.start, r.end))
                        .filter((p) => p.trim());
                    wrapTextNode(textNode, parts);
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    processElementRoot(child as Element);
                }
            });
            return;
        }

        // Custom filter to skip text nodes inside elements we want to preserve
        const filterNode = (node: Node): number => {
            if (node.nodeType !== Node.TEXT_NODE) return NodeFilter.FILTER_SKIP;

            // Check if any ancestor should be skipped
            let parent = node.parentElement;
            while (parent && parent !== root) {
                if (shouldSkipElement(parent)) {
                    return NodeFilter.FILTER_REJECT;
                }
                parent = parent.parentElement;
            }

            return NodeFilter.FILTER_ACCEPT;
        };

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: filterNode,
        });
        const segments: Array<{ node: Text; start: number; end: number }> = [];
        let acc = '';
        let tn = walker.nextNode() as Text | null;
        while (tn) {
            const t = tn.nodeValue || '';
            if (t) {
                segments.push({
                    node: tn,
                    start: acc.length,
                    end: acc.length + t.length,
                });
                acc += t;
            }
            tn = walker.nextNode() as Text | null;
        }

        if (!segments.length) return;
        const ranges = splitTextIntoRanges(acc, getComputedLang(root));

        // Map ranges to actual text node offsets first
        const mapped: Array<{
            startNode: Text;
            startOffset: number;
            endNode: Text;
            endOffset: number;
            absStart: number;
            absEnd: number;
        }> = [];

        for (const r of ranges) {
            let startNode: Text | null = null;
            let startOffset = 0;
            let endNode: Text | null = null;
            let endOffset = 0;
            for (const seg of segments) {
                if (r.start >= seg.start && r.start <= seg.end) {
                    startNode = seg.node;
                    startOffset = r.start - seg.start;
                }
                if (r.end >= seg.start && r.end <= seg.end) {
                    endNode = seg.node;
                    endOffset = r.end - seg.start;
                }
                if (startNode && endNode) break;
            }
            if (startNode && endNode) {
                mapped.push({
                    startNode,
                    startOffset,
                    endNode,
                    endOffset,
                    absStart: r.start,
                    absEnd: r.end,
                });
            }
        }

        if (!mapped.length) return;

        // Process mappings from end to start to avoid invalidating earlier offsets
        mapped.sort((a, b) => b.absStart - a.absStart);

        // Try each mapping individually; if none succeed, fall back
        let successCount = 0;
        for (const m of mapped) {
            // Skip empty ranges
            if (m.absStart >= m.absEnd) continue;
            try {
                // Skip if nodes are no longer in DOM or not under the same root
                if (!m.startNode.isConnected || !m.endNode.isConnected) {
                    console.warn(
                        '[ReviewTool] mapped nodes not connected, skipping',
                        m,
                    );
                    continue;
                }
                // Ensure both nodes are still descendants of the provided root
                if (!root.contains(m.startNode) || !root.contains(m.endNode)) {
                    console.warn(
                        '[ReviewTool] mapped nodes no longer in root, skipping',
                        m,
                    );
                    continue;
                }

                const range = document.createRange();
                range.setStart(m.startNode, m.startOffset);
                range.setEnd(m.endNode, m.endOffset);

                // extractContents and insert wrapped span at the collapsed range position
                const frag = range.extractContents();
                range.insertNode(createSentenceSpan(frag));

                successCount++;
            } catch (e) {
                console.warn(
                    '[ReviewTool] range wrapping failed for one range, continuing',
                    e,
                    m,
                );
            }
        }

        if (successCount === 0) {
            // If no ranges could be safely wrapped, fall back to naive wrapping for this root
            console.warn(
                '[ReviewTool] no mapped ranges wrapped successfully, performing fallback wrapping for this root',
            );
            const walker2 = document.createTreeWalker(
                root,
                NodeFilter.SHOW_TEXT,
                { acceptNode: filterNode },
            );
            const nodes: Text[] = [];
            let tn2: Text | null;
            while ((tn2 = walker2.nextNode() as Text | null)) nodes.push(tn2);
            for (const tn2 of nodes) {
                const text = tn2.nodeValue || '';
                if (!text.trim()) {
                    continue;
                }
                const parts = splitTextToPartsSimple(text, allowHalfWidth);
                wrapTextNode(tn2, parts);
            }
        }
    }

    // Process nodes: for element nodes, process the element; for text nodes, wrap simply
    Array.from(container.childNodes)
        .filter((node) => !shouldSkipElement(node))
        .forEach((rootNode) => {
            if (rootNode.nodeType === Node.ELEMENT_NODE) {
                processElementRoot(rootNode as Element);
            } else if (rootNode.nodeType === Node.TEXT_NODE) {
                const textNode = rootNode as Text;
                const text = textNode.textContent || '';
                if (!text.trim()) return;
                const parts = splitTextToPartsSimple(
                    text,
                    shouldTreatHalfWidthTerminators(getComputedLang(textNode)),
                );
                wrapTextNode(textNode, parts);
            }
        });
}

export function clearWrappedSentences(container: Element) {
    // select spans that have both classes and unwrap them preserving their child nodes
    container.querySelectorAll(SENTENCE_SELECTOR).forEach((el) => {
        const parent = el.parentNode;
        if (!parent) return;
        const frag = document.createDocumentFragment();
        // move all child nodes (including elements) into fragment to preserve structure
        while (el.firstChild) {
            frag.appendChild(el.firstChild);
        }
        parent.replaceChild(frag, el);
    });
}
