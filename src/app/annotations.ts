/**
 * @file src/app/annotations.ts
 * Purpose: src / app / annotations module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Exports
 * 3. importAnnotations
 * 4. createAnnotation
 * 5. getAnnotation
 * 6. updateAnnotation
 * 7. deleteAnnotation
 * 8. clearAnnotations
 * 9. canUndoClearAnnotations
 * 10. undoClearAnnotations
 * 11. sortAnnotationsByTimestamp
 * 12. buildAnnotationGroups
 */

import type {
    Annotation,
    AnnotationGroup,
    AnnotationTextAnchor,
} from '../domain/annotations';
import { isRecord, normalizeAnnotation } from '../domain/annotations';
import { groupAnnotations } from '../domain/annotation-order';
import { loadAnnotations, saveAnnotations } from '../platform/browser/storage';
import state from '../platform/mediawiki/context';

export type {
    Annotation,
    AnnotationGroup,
    AnnotationTextAnchor,
} from '../domain/annotations';
export { loadAnnotations } from '../platform/browser/storage';

/** Import a JSON backup into the current article without replacing existing annotations. */
export function importAnnotations(pageName: string, json: string): number {
    const payload: unknown = JSON.parse(json.replace(/^\uFEFF/, ''));
    if (!isRecord(payload)) throw new Error('Invalid annotation backup');

    let entries: unknown[];
    if (Array.isArray(payload.groups)) {
        entries = [];
        for (const group of payload.groups) {
            if (!isRecord(group) || !Array.isArray(group.annotations)) {
                throw new Error('Invalid annotation group');
            }
            for (const entry of group.annotations as unknown[])
                entries.push(entry);
        }
    } else if (Array.isArray(payload.annotations)) {
        entries = payload.annotations;
    } else {
        throw new Error('Missing annotations in backup');
    }

    // Validate the whole backup before changing storage.
    const annotations = entries.map((entry) => {
        const annotation = normalizeAnnotation(entry);
        if (!annotation) {
            throw new Error('Invalid annotation in backup');
        }
        return annotation;
    });
    const store = loadAnnotations(pageName);
    const ids = new Set(store.annotations.map((annotation) => annotation.id));
    let imported = 0;
    for (const annotation of annotations) {
        if (ids.has(annotation.id)) continue;
        ids.add(annotation.id);
        store.annotations.push(annotation);
        imported++;
    }
    if (imported && !saveAnnotations({ ...store, pageName })) {
        throw new Error('Unable to save imported annotations');
    }
    return imported;
}

export function createAnnotation(
    pageName: string,
    sectionPath: string,
    sentenceText: string,
    opinion: string,
    sentencePos = '',
    textAnchor?: AnnotationTextAnchor,
): Annotation {
    const store = loadAnnotations(pageName);
    const normalizedSectionPath = sectionPath === '目次' ? '序言' : sectionPath;
    const anno: Annotation = {
        id: crypto.randomUUID(),
        sectionPath: normalizedSectionPath,
        sentencePos,
        sentenceText,
        opinion,
        createdBy: state.userName || 'unknown',
        createdAt: Date.now(),
        resolved: false,
        textAnchor,
    };
    store.annotations.push(anno);
    if (!saveAnnotations(store)) throw new Error('Unable to save annotation');
    return anno;
}

export function getAnnotation(pageName: string, id: string): Annotation | null {
    const store = loadAnnotations(pageName);
    return store.annotations.find((a) => a.id === id) || null;
}

export function updateAnnotation(
    pageName: string,
    id: string,
    updates: Partial<
        Pick<
            Annotation,
            'opinion' | 'sentenceText' | 'resolved' | 'sentencePos'
        >
    >,
): Annotation | null {
    const store = loadAnnotations(pageName);
    const idx = store.annotations.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    const updated = {
        ...store.annotations[idx],
        ...updates,
        updatedAt: Date.now(),
    };
    store.annotations[idx] = updated;
    if (!saveAnnotations(store)) throw new Error('Unable to update annotation');
    return updated;
}

export function deleteAnnotation(pageName: string, id: string): boolean {
    const store = loadAnnotations(pageName);
    const before = store.annotations.length;
    store.annotations = store.annotations.filter((a) => a.id !== id);
    if (store.annotations.length !== before) {
        if (!saveAnnotations(store))
            throw new Error('Unable to delete annotation');
        return true;
    }
    return false;
}

export function clearAnnotations(pageName: string): boolean {
    const store = loadAnnotations(pageName);
    if (!store.annotations.length) return false;
    // Save the empty list and its undo copy together; a failed write leaves comments intact.
    if (
        !saveAnnotations({
            ...store,
            pageName,
            annotations: [],
            clearedAnnotations: store.annotations,
        })
    ) {
        throw new Error('Unable to clear annotations');
    }
    return true;
}

export function canUndoClearAnnotations(pageName: string): boolean {
    return Boolean(loadAnnotations(pageName).clearedAnnotations?.length);
}

export function undoClearAnnotations(pageName: string): number {
    const store = loadAnnotations(pageName);
    if (!store.clearedAnnotations?.length) return 0;
    const ids = new Set(store.annotations.map((annotation) => annotation.id));
    const restored = store.clearedAnnotations.filter((annotation) => {
        if (ids.has(annotation.id)) return false;
        ids.add(annotation.id);
        return true;
    });
    if (
        !saveAnnotations({
            ...store,
            pageName,
            annotations: [...store.annotations, ...restored],
            clearedAnnotations: undefined,
        })
    ) {
        throw new Error('Unable to restore cleared annotations');
    }
    return restored.length;
}

function sortAnnotationsByTimestamp(list: Annotation[]): Annotation[] {
    return [...list].sort((a, b) => a.createdAt - b.createdAt);
}

export function buildAnnotationGroups(pageName: string): AnnotationGroup[] {
    const store = loadAnnotations(pageName);
    if (!store.annotations.length) {
        return [];
    }

    const groups = groupAnnotations(store.annotations).map((group) => ({
        ...group,
        annotations: sortAnnotationsByTimestamp(group.annotations),
    }));

    groups.sort((a, b) => {
        const aTs = a.annotations[0]?.createdAt ?? Number.MAX_SAFE_INTEGER;
        const bTs = b.annotations[0]?.createdAt ?? Number.MAX_SAFE_INTEGER;
        if (aTs === bTs) {
            return a.sectionPath.localeCompare(b.sectionPath);
        }
        return aTs - bTs;
    });

    return groups;
}
