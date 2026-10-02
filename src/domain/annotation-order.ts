/**
 * @file src/domain/annotation-order.ts
 * Purpose: src / domain / annotation order module.
 *
 * Table of contents:
 * 1. Imports
 * 2. groupAnnotations
 * 3. sortGroupsByPosition
 * 4. groupAnnotationsByTime
 */

import type { Annotation, AnnotationGroup } from './annotations';
import { compareOrderKeys } from './order-key';

export function groupAnnotations(annotations: Annotation[]): AnnotationGroup[] {
    const buckets = new Map<string, Annotation[]>();
    for (const annotation of annotations) {
        const sectionPath = annotation.sectionPath.trim();
        const bucket = buckets.get(sectionPath);
        if (bucket) bucket.push(annotation);
        else buckets.set(sectionPath, [annotation]);
    }
    return Array.from(buckets, ([sectionPath, entries]) => ({
        sectionPath,
        annotations: entries,
    }));
}

export function sortGroupsByPosition(
    groups: AnnotationGroup[],
): AnnotationGroup[] {
    return groups
        .filter(({ annotations }) => annotations.length)
        .map((group) => ({
            ...group,
            annotations: [...group.annotations].sort(
                (a, b) =>
                    compareOrderKeys(a.sentencePos, b.sentencePos) ||
                    a.createdAt - b.createdAt,
            ),
        }))
        .sort(
            (a, b) =>
                compareOrderKeys(
                    a.annotations[0].sentencePos,
                    b.annotations[0].sentencePos,
                ) || a.sectionPath.localeCompare(b.sectionPath),
        );
}

export function groupAnnotationsByTime(
    annotations: Annotation[],
    order: 'asc' | 'desc',
): AnnotationGroup[] {
    const direction = order === 'asc' ? 1 : -1;
    const sorted = [...annotations].sort(
        (a, b) => direction * (a.createdAt - b.createdAt),
    );
    const groups: AnnotationGroup[] = [];
    for (const annotation of sorted) {
        const sectionPath = annotation.sectionPath.trim();
        const previous = groups[groups.length - 1];
        if (previous?.sectionPath === sectionPath)
            previous.annotations.push(annotation);
        else groups.push({ sectionPath, annotations: [annotation] });
    }
    return groups;
}
