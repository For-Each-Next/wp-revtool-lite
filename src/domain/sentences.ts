/**
 * @file src/domain/sentences.ts
 * Purpose: src / domain / sentences module.
 *
 * Table of contents:
 * 1. shouldTreatHalfWidthTerminators
 * 2. getSentenceTerminatorRegex
 * 3. splitTextToPartsSimple
 * 4. splitTextIntoRanges
 */

export function shouldTreatHalfWidthTerminators(lang: string | null): boolean {
    if (!lang) return false; // default to zh wiki behavior
    return !(lang.startsWith('zh') || lang.startsWith('ja'));
}

function getSentenceTerminatorRegex(allowHalfWidth: boolean): RegExp {
    const terminators = allowHalfWidth ? '。！？?!….' : '。！？…';
    return new RegExp(
        `[」』】〗〕\\)\\]\\}\\"'’”〉》]*[${terminators}]+[」』】〗〕\\)\\]\\}\\"'’”〉》]*`,
        'g',
    );
}

export function splitTextToPartsSimple(
    text: string,
    allowHalfWidth: boolean,
): string[] {
    const terminators = allowHalfWidth
        ? '。！？!?；;」』】〗〕\\]］}｝\\.'
        : '。！？；;」』】〗〕\\]］}｝';
    const re = new RegExp(`(?<=[${terminators}])\\s*`, 'g');
    return text.split(re).filter((p) => p.trim());
}

// Helper to split a block element's concatenated text into sentence ranges
export function splitTextIntoRanges(
    text: string,
    lang: string | null,
): Array<{ start: number; end: number }> {
    // Use a regex-based splitter that recognizes both Chinese and Western sentence terminators.
    // This is more robust for mixed-language content than single-character scanning.
    const ranges: Array<{ start: number; end: number }> = [];
    if (!text || !text.trim()) return ranges;

    // Match sentence-ending punctuation sequences including surrounding closing
    // quotes/brackets. This will include cases like:
    //  - "sentence."  (terminator before closing quote)
    //  - "sentence".  (terminator after closing quote)
    // and will recognise CJK terminators such as '。', '？', '！' and ellipsis '…'.
    const re = getSentenceTerminatorRegex(
        shouldTreatHalfWidthTerminators(lang),
    );
    let lastIndex = 0;
    while (re.exec(text) !== null) {
        const endPos = re.lastIndex;
        const part = text.slice(lastIndex, endPos);
        if (part.trim()) ranges.push({ start: lastIndex, end: endPos });
        lastIndex = endPos;
    }
    // trailing text
    if (lastIndex < text.length) {
        const tail = text.slice(lastIndex);
        if (tail.trim()) ranges.push({ start: lastIndex, end: text.length });
    }

    // If regex splitting produced only a single range but the text contains multiple segments
    // (e.g. sentences separated by newlines or missing terminal punctuation), try a fallback
    // splitter that also splits on newlines or multiple spaces.
    if (ranges.length <= 1) {
        const alt: Array<{ start: number; end: number }> = [];
        const altRe = new RegExp(
            `${getSentenceTerminatorRegex(shouldTreatHalfWidthTerminators(lang)).source}|(?:\\r?\\n)+|(?:\\s{2,})`,
            'g',
        );
        let last = 0;
        while (altRe.exec(text) !== null) {
            const endPos = altRe.lastIndex;
            const part = text.slice(last, endPos);
            if (part.trim()) alt.push({ start: last, end: endPos });
            last = endPos;
        }
        if (last < text.length) {
            const tail2 = text.slice(last);
            if (tail2.trim()) alt.push({ start: last, end: text.length });
        }
        if (alt.length > 1) {
            return alt;
        }
    }

    return ranges;
}
