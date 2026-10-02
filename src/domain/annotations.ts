/**
 * @file src/domain/annotations.ts
 * Purpose: src / domain / annotations module.
 *
 * Table of contents:
 * 1. AnnotationTextAnchor
 * 2. Annotation
 * 3. AnnotationStore
 * 4. AnnotationGroup
 * 5. createEmptyStore
 * 6. isRecord
 * 7. normalizeAnnotation
 */

export interface AnnotationTextAnchor {
    start: number;
    end: number;
    quote: string;
}

export interface Annotation {
    id: string;
    sectionPath: string;
    sentencePos: string;
    sentenceText: string;
    opinion: string;
    createdBy: string;
    createdAt: number;
    updatedAt?: number;
    resolved?: boolean;
    textAnchor?: AnnotationTextAnchor;
}

export interface AnnotationStore {
    pageName: string;
    createdAt: number;
    annotations: Annotation[];
    clearedAnnotations?: Annotation[];
}

export interface AnnotationGroup {
    sectionPath: string;
    annotations: Annotation[];
}

export function createEmptyStore(pageName: string): AnnotationStore {
    return {
        pageName,
        createdAt: Date.now(),
        annotations: [],
    };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeAnnotation(anno: unknown): Annotation | null {
    if (!isRecord(anno)) return null;
    if (typeof anno.id !== 'string' || !anno.id.trim()) return null;
    if (typeof anno.sectionPath !== 'string') return null;
    if (typeof anno.sentenceText !== 'string') return null;
    if (typeof anno.opinion !== 'string') return null;
    if (typeof anno.createdBy !== 'string') return null;
    if (
        typeof anno.createdAt !== 'number' ||
        !Number.isFinite(new Date(anno.createdAt).getTime())
    )
        return null;

    const sentencePos =
        typeof anno.sentencePos === 'string' ? anno.sentencePos : '';
    const resolved =
        typeof anno.resolved === 'boolean' ? anno.resolved : undefined;
    const anchor = isRecord(anno.textAnchor) ? anno.textAnchor : null;
    const textAnchor =
        anchor &&
        typeof anchor.start === 'number' &&
        Number.isInteger(anchor.start) &&
        anchor.start >= 0 &&
        typeof anchor.end === 'number' &&
        Number.isInteger(anchor.end) &&
        anchor.end > anchor.start &&
        typeof anchor.quote === 'string' &&
        anchor.quote.length === anchor.end - anchor.start
            ? { start: anchor.start, end: anchor.end, quote: anchor.quote }
            : undefined;

    return {
        id: anno.id,
        sectionPath: anno.sectionPath,
        sentencePos,
        sentenceText: anno.sentenceText,
        opinion: anno.opinion,
        createdBy: anno.createdBy,
        createdAt: anno.createdAt,
        updatedAt:
            typeof anno.updatedAt === 'number' &&
            Number.isFinite(new Date(anno.updatedAt).getTime()) &&
            anno.updatedAt >= anno.createdAt
                ? anno.updatedAt
                : undefined,
        resolved,
        textAnchor,
    };
}
