/**
 * @file src/features/annotations/annotation-editor.ts
 * Purpose: src / features / annotations / annotation editor module.
 *
 * Table of contents:
 * 1. Imports
 * 2. AnnotationEditorDialogOptions
 * 3. AnnotationEditorDialogResult
 * 4. openAnnotationEditorDialog
 */

import state from '../../platform/mediawiki/context';
import {
    loadCodexAndVue,
    mountApp,
    registerCodexComponents,
} from '../../platform/mediawiki/dialog';
import AnnotationEditorDialog from './components/annotation-editor.vue';
import type { RelatedSource } from '../../platform/browser/dom/related-sources';

export interface AnnotationEditorDialogOptions {
    sectionPath: string;
    sentenceText: string;
    relatedSources?: RelatedSource[];
    initialOpinion?: string;
    mode?: 'create' | 'edit';
    allowDelete?: boolean;
}

export type AnnotationEditorDialogResult =
    | { action: 'save'; opinion: string }
    | { action: 'delete' }
    | { action: 'cancel' | 'replaced' };

export async function openAnnotationEditorDialog(
    options: AnnotationEditorDialogOptions,
): Promise<AnnotationEditorDialogResult> {
    const dialogOptions: Required<AnnotationEditorDialogOptions> = {
        sectionPath: options.sectionPath,
        sentenceText: options.sentenceText,
        relatedSources: options.relatedSources ?? [],
        initialOpinion: options.initialOpinion || '',
        mode: options.mode || 'create',
        allowDelete: options.allowDelete ?? options.mode === 'edit',
    };

    try {
        const { Vue, Codex } = await loadCodexAndVue();
        return await new Promise<AnnotationEditorDialogResult>((resolve) => {
            const app = Vue.createMwApp({
                setup() {
                    Vue.onUnmounted(() => resolve({ action: 'replaced' }));
                    return () =>
                        Vue.h(AnnotationEditorDialog, {
                            ...dialogOptions,
                            onResolve: resolve,
                        });
                },
            });
            registerCodexComponents(app, Codex);
            mountApp(app);
        });
    } catch (error) {
        console.error(
            '[ReviewTool] Failed to open annotation editor dialog',
            error,
        );
        mw.notify(
            state.convByVar({
                hant: '無法開啟批註對話框。',
                hans: '无法开启批注对话框。',
            }),
            {
                type: 'error',
                title: '[ReviewTool]',
            },
        );
        throw error;
    }
}
