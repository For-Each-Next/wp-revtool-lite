/**
 * @file src/platform/browser/storage.ts
 * Purpose: src / platform / browser / storage module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. storageKeyForPage
 * 4. getStorage
 * 5. loadAnnotations
 * 6. saveAnnotations
 */

import type { Annotation, AnnotationStore } from '../../domain/annotations';
import {
    createEmptyStore,
    isRecord,
    normalizeAnnotation,
} from '../../domain/annotations';

const KEY_PREFIX = 'reviewtool:annotations:';

function storageKeyForPage(pageName: string): string {
    return `${KEY_PREFIX}${pageName || 'unknown'}`;
}

function getStorage(type: 'local' | 'session'): Storage | null {
    if (typeof window === 'undefined') return null;
    try {
        return type === 'local' ? window.localStorage : window.sessionStorage;
    } catch (e) {
        console.error(`[ReviewTool] ${type}Storage unavailable`, e);
        return null;
    }
}

export function loadAnnotations(pageName: string): AnnotationStore {
    const key = storageKeyForPage(pageName);
    const localStore = getStorage('local');
    const sessionStore = getStorage('session');
    let raw: string | null = null;
    let source: 'local' | 'session' | null = null;

    if (localStore) {
        try {
            raw = localStore.getItem(key);
            if (raw) source = 'local';
        } catch (e) {
            console.error(
                '[ReviewTool] failed to read annotations from localStorage',
                e,
            );
        }
    }

    if (!raw && sessionStore) {
        try {
            raw = sessionStore.getItem(key);
            if (raw) source = 'session';
        } catch (e) {
            console.error(
                '[ReviewTool] failed to read annotations from sessionStorage',
                e,
            );
        }
    }

    if (!raw) {
        return createEmptyStore(pageName);
    }

    let parsed: unknown = null;
    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        console.warn('[ReviewTool] failed to parse annotations payload', e);
        return createEmptyStore(pageName);
    }

    const parsedRecord = isRecord(parsed) ? parsed : null;
    const parsedAnnotations =
        parsedRecord && Array.isArray(parsedRecord.annotations)
            ? parsedRecord.annotations
            : [];
    const annotations = parsedAnnotations
        .map(normalizeAnnotation)
        .filter((anno): anno is Annotation => !!anno);

    const normalized: AnnotationStore = {
        pageName,
        createdAt:
            typeof parsedRecord?.createdAt === 'number' &&
            Number.isFinite(new Date(parsedRecord.createdAt).getTime())
                ? parsedRecord.createdAt
                : Date.now(),
        annotations,
        clearedAnnotations: Array.isArray(parsedRecord?.clearedAnnotations)
            ? parsedRecord.clearedAnnotations
                  .map(normalizeAnnotation)
                  .filter((anno): anno is Annotation => !!anno)
            : undefined,
    };

    if (source === 'session' && localStore) {
        try {
            localStore.setItem(key, JSON.stringify(normalized));
            sessionStore?.removeItem(key);
        } catch (e) {
            console.error(
                '[ReviewTool] failed to migrate annotations from sessionStorage to localStorage',
                e,
            );
        }
    }

    return normalized;
}

export function saveAnnotations(store: AnnotationStore): boolean {
    const key = storageKeyForPage(store.pageName);
    const payload = JSON.stringify(store);
    const localStore = getStorage('local');
    if (localStore) {
        try {
            localStore.setItem(key, payload);
            return true;
        } catch (e) {
            console.error(
                '[ReviewTool] failed to save annotations to localStorage',
                e,
            );
        }
    }

    const sessionStore = getStorage('session');
    if (sessionStore) {
        try {
            sessionStore.setItem(key, payload);
            // A stale local copy would otherwise take precedence over the fallback.
            localStore?.removeItem(key);
            return true;
        } catch (e) {
            console.error(
                '[ReviewTool] failed to save annotations to sessionStorage fallback',
                e,
            );
        }
    } else {
        console.error('[ReviewTool] no available storage to save annotations');
    }
    return false;
}
