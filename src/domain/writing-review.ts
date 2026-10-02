/**
 * @file src/domain/writing-review.ts
 * Purpose: src / domain / writing review module.
 *
 * Table of contents:
 * 1. Imports
 * 2. WritingReviewSuggestion
 * 3. WritingReviewChapter
 * 4. buildWritingReviewChapters
 * 5. formatSuggestion
 * 6. WritingReviewLinkContext
 * 7. formatRevisionLabel
 * 8. buildWritingReviewWikitext
 */

import type { AnnotationGroup } from './annotations';
import { sortGroupsByPosition } from './annotation-order';

type WritingReviewSuggestion = { quote: string; suggestion: string };
export type WritingReviewChapter = {
    title: string;
    suggestions: WritingReviewSuggestion[];
};

export function buildWritingReviewChapters(
    groups: AnnotationGroup[],
    fallbackTitle: string,
): WritingReviewChapter[] {
    return sortGroupsByPosition(groups).map((group) => ({
        title: group.sectionPath || fallbackTitle,
        suggestions: group.annotations.map((anno) => ({
            quote: anno.sentenceText || '',
            suggestion: anno.opinion || '',
        })),
    }));
}

function formatSuggestion(suggestion: string): string {
    return (
        suggestion
            .trim()
            .replace(/\r\n?/g, '\n')
            // Keep each bullet's continuation lines together when formatting line breaks.
            .split(/(?=^[ \t]*\*)/m)
            .map((block) => {
                const bullet = block.match(/^[ \t]*(\*+)[ \t]*/);
                const text = bullet ? block.slice(bullet[0].length) : block;
                const formatted = text
                    .trim()
                    .replace(/\n{2,}/g, '{{pb}}')
                    .replace(/\n/g, '<br>');
                return bullet ? `\n#${bullet[1]} ${formatted}` : formatted;
            })
            .join('')
    );
}

export type WritingReviewLinkContext = {
    articleTitle: string;
    revisionId: number;
    revisionTimestamp: string;
};

function formatRevisionLabel(timestamp: string): string {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime()))
        throw new Error('Invalid revision timestamp');
    return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日 ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

export function buildWritingReviewWikitext(
    chapters: WritingReviewChapter[],
    context: WritingReviewLinkContext,
): string {
    if (!chapters.length) return '';
    const revisionLabel = formatRevisionLabel(context.revisionTimestamp);
    let wikitext = '';
    for (const chapter of chapters) {
        const title = (chapter.title || '').trim();
        const sectionLink = `[[${context.articleTitle}#${title}|${title}]]`;
        const permalink = `[[Special:PermaLink/${context.revisionId}#${title}|${revisionLabel}]]`;
        wikitext += `'''${sectionLink}'''<small>（基于${permalink}版）</small>\n`;
        for (const item of chapter.suggestions) {
            const quote = (item.quote || '').trim();
            const suggestion = formatSuggestion(item.suggestion || '');
            wikitext += `# ${quote ? `{{rvw|1=${quote}}} —— ` : ''}${suggestion}\n`;
        }
        wikitext += '--~~~~\n\n';
    }
    return wikitext;
}
