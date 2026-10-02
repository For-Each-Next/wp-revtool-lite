/**
 * @file src/index.ts
 * Purpose: Pure operations for offline consumers; importing this module never starts the gadget.
 *
 * Table of contents:
 * 1. Exports
 */

export type {
    Annotation,
    AnnotationGroup,
    AnnotationStore,
    AnnotationTextAnchor,
} from './domain/annotations';
export { normalizeAnnotation } from './domain/annotations';
export {
    groupAnnotations,
    groupAnnotationsByTime,
    sortGroupsByPosition,
} from './domain/annotation-order';
export {
    formatAnnotationTimestamp,
    getAnnotationTimeRange,
} from './domain/annotation-time';
export { compareOrderKeys } from './domain/order-key';
export {
    splitTextIntoRanges,
    splitTextToPartsSimple,
} from './domain/sentences';
export {
    buildWritingReviewChapters,
    buildWritingReviewWikitext,
} from './domain/writing-review';
