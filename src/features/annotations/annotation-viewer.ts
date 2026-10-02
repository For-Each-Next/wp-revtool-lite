/**
 * @file src/features/annotations/annotation-viewer.ts
 * Purpose: src / features / annotations / annotation viewer module.
 *
 * Table of contents:
 * 1. Imports
 * 2. AnnotationViewerDialogOptions
 * 3. AnnotationViewerDialogVm
 * 4. Constants and state
 * 5. isAnnotationViewerDialogOpen
 * 6. closeAnnotationViewerDialog
 * 7. updateAnnotationViewerDialogGroups
 * 8. openAnnotationViewerDialog
 */

import state from '../../platform/mediawiki/context';
import type { AnnotationGroup } from '../../app/annotations';
import {
    closeDialogAfterTransition,
    loadCodexAndVue,
    mountApp,
    registerCodexComponents,
} from '../../platform/mediawiki/dialog';
import AnnotationViewerDialog from './components/annotation-viewer.vue';

export interface AnnotationViewerDialogOptions {
    pageName: string;
    groups: AnnotationGroup[];
    initialCanUndoClear?: boolean;
    onEditAnnotation?: (annotationId: string, sectionPath: string) => void;
    onDeleteAnnotation?: (
        annotationId: string,
        sectionPath: string,
    ) => Promise<void> | void;
    onClearAllAnnotations?: () => Promise<boolean | void> | boolean | void;
    onUndoClearAnnotations?: () => boolean | void;
    onImportAnnotations?: (json: string) => Promise<number> | number;
}

type AnnotationViewerDialogVm = {
    open: boolean;
    groups: AnnotationGroup[];
    canUndoClear: boolean;
};

let viewerAppInstance: AnnotationViewerDialogVm | null = null;

export function isAnnotationViewerDialogOpen(): boolean {
    return Boolean(viewerAppInstance);
}

export function closeAnnotationViewerDialog(): void {
    if (viewerAppInstance) {
        viewerAppInstance.open = false;
        closeDialogAfterTransition();
        viewerAppInstance = null;
    }
}

export function updateAnnotationViewerDialogGroups(
    groups: AnnotationGroup[],
    canUndoClear: boolean,
): void {
    if (viewerAppInstance) {
        viewerAppInstance.groups = groups;
        viewerAppInstance.canUndoClear = canUndoClear;
    }
}

export async function openAnnotationViewerDialog(
    options: AnnotationViewerDialogOptions,
): Promise<void> {
    try {
        const { Vue, Codex } = await loadCodexAndVue();
        await mw.loader.using('mediawiki.Title');
        const { groups: initialGroups = [], ...dialogOptions } = options;
        const app = Vue.createMwApp({
            render: () =>
                Vue.h(AnnotationViewerDialog, {
                    ...dialogOptions,
                    initialGroups,
                    ref: (instance: unknown) => {
                        viewerAppInstance =
                            instance as AnnotationViewerDialogVm | null;
                    },
                    onClosed: () => {
                        viewerAppInstance = null;
                    },
                }),
        });
        registerCodexComponents(app, Codex);
        mountApp(app);
    } catch (error) {
        console.error(
            '[ReviewTool] Failed to open annotation viewer dialog',
            error,
        );
        mw.notify(
            state.convByVar({
                hant: '無法開啟批註列表。',
                hans: '无法开启批注列表。',
            }),
            {
                type: 'error',
                title: '[ReviewTool]',
            },
        );
    }
}
