/**
 * @file src/platform/browser/dom/related-sources.ts
 * Purpose: src / platform / browser / dom / related sources module.
 *
 * Table of contents:
 * 1. Imports
 * 2. RelatedSource
 * 3. collectRelatedSources
 */

import {
    buildArticleTextIndex,
    captureAnnotationAnchor,
} from './annotation-anchor';
import {
    getReferenceLinkData,
    REFERENCE_MARKER_SELECTOR,
} from './reference-links';
import { splitTextIntoRanges } from '../../../domain/sentences';

export interface RelatedSource {
    label: string;
    title: string;
    url: string;
    wikitext: string;
}

/** Find the sources attached to the selected sentences, including trailing footnotes. */
export function collectRelatedSources(
    root: Element,
    selection: Range | null,
): RelatedSource[] {
    if (
        !selection ||
        !root.contains(selection.startContainer) ||
        !root.contains(selection.endContainer)
    )
        return [];
    const blocks = new Map<
        Element,
        {
            index: ReturnType<typeof buildArticleTextIndex>;
            sentences: Array<{ start: number; end: number }>;
        }
    >();
    const sources: RelatedSource[] = [];
    const seen = new Set<string>();
    for (const marker of Array.from(
        root.querySelectorAll(REFERENCE_MARKER_SELECTOR),
    )) {
        const block =
            marker.closest('p, li, td, th, dd, dt, blockquote') ??
            marker.parentElement;
        if (!block || !root.contains(block) || !selection.intersectsNode(block))
            continue;
        let context = blocks.get(block);
        if (!context) {
            const index = buildArticleTextIndex(block);
            const anchor = captureAnnotationAnchor(index, selection);
            const lang =
                block.closest('[lang]')?.getAttribute('lang') ??
                document.documentElement.lang;
            const sentences = anchor
                ? splitTextIntoRanges(index.text, lang).filter(
                      (sentence) =>
                          sentence.start < anchor.end &&
                          sentence.end > anchor.start,
                  )
                : [];
            context = { index, sentences };
            blocks.set(block, context);
        }
        // Footnote text is excluded from the index. Its position is the end of
        // the preceding text, so a marker after punctuation belongs to that sentence.
        let position = 0;
        for (const segment of context.index.segments) {
            if (
                !(
                    marker.compareDocumentPosition(segment.node) &
                    Node.DOCUMENT_POSITION_PRECEDING
                )
            )
                break;
            position = segment.start + segment.offsets.length;
        }
        if (
            !context.sentences.some(
                (sentence) =>
                    position > sentence.start && position <= sentence.end,
            )
        )
            continue;
        const data = getReferenceLinkData(root, marker, 'comment');
        if (!data?.footnote || seen.has(marker.id)) continue;
        seen.add(marker.id);
        sources.push({
            label: data.label,
            title: data.title,
            url: data.url,
            wikitext: data.footnote,
        });
    }
    return sources;
}
