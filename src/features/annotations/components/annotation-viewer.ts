/**
 * @file src/features/annotations/components/annotation-viewer.ts
 * Purpose: src / features / annotations / components / annotation viewer module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Exports
 */

import { buildAnnotationViewerMessages } from '../../../i18n/annotation-viewer';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import state from '../../../platform/mediawiki/context';
import type { AnnotationGroup } from '../../../app/annotations';
import {
    groupAnnotations,
    groupAnnotationsByTime,
    sortGroupsByPosition,
} from '../../../domain/annotation-order';
import {
    formatAnnotationTimestamp,
    getAnnotationTimeRange,
} from '../../../domain/annotation-time';
import { closeDialogAfterTransition } from '../../../platform/mediawiki/dialog';
import { copyWritingReview } from '../../../app/copy-review';
import { useStackedDialogActions } from '../responsive-actions';
import { ref, computed, onMounted, onUnmounted } from 'vue';

export default defineComponent({
    props: {
        pageName: { type: String, required: true },
        initialGroups: {
            type: Array as PropType<AnnotationGroup[]>,
            required: false,
            default: () => [],
        },
        initialCanUndoClear: { type: Boolean, required: false, default: false },
        onEditAnnotation: {
            type: Function as PropType<
                (annotationId: string, sectionPath: string) => void
            >,
            required: false,
            default: undefined,
        },
        onDeleteAnnotation: {
            type: Function as PropType<
                (
                    annotationId: string,
                    sectionPath: string,
                ) => Promise<void> | void
            >,
            required: false,
            default: undefined,
        },
        onClearAllAnnotations: {
            type: Function as PropType<
                () => Promise<boolean | void> | boolean | void
            >,
            required: false,
            default: undefined,
        },
        onUndoClearAnnotations: {
            type: Function as PropType<() => boolean | void>,
            required: false,
            default: undefined,
        },
        onImportAnnotations: {
            type: Function as PropType<
                (json: string) => Promise<number> | number
            >,
            required: false,
            default: undefined,
        },
        onClosed: {
            type: Function as PropType<() => void>,
            required: false,
            default: undefined,
        },
    },
    setup(props) {
        const i18n = buildAnnotationViewerMessages(state.convByVar);
        const open = ref(true);
        const groups = ref<AnnotationGroup[]>(props.initialGroups);
        const canUndoClear = ref(props.initialCanUndoClear);
        const deletingAnnotationId = ref<string | null>(null);
        const clearingAll = ref(false);
        const copyingReview = ref(false);
        const importing = ref(false);
        const importInput = ref<HTMLInputElement | null>(null);
        const fileAction = ref<string | null>(null);
        const reviewAction = ref<string | null>(null);
        const sortMethod = ref('position');
        const actionError = ref('');
        const stackedActions = useStackedDialogActions();
        const footerActions = computed(() =>
            stackedActions.value
                ? ['go', 'copy', 'file', 'close']
                : ['close', 'file', 'copy', 'go'],
        );
        const now = ref(Date.now());
        let timeRefreshInterval: number | undefined;
        onMounted(() => {
            timeRefreshInterval = window.setInterval(() => {
                now.value = Date.now();
            }, 60_000);
        });
        onUnmounted(() => window.clearInterval(timeRefreshInterval));

        const talkPageTitle = mw.Title.newFromText(props.pageName)
            ?.getTalkPage()
            ?.getPrefixedText();
        const reviewDestinations = [
            {
                value: 'Wikipedia:典范条目评选/提名区',
                label: state.convByVar({
                    hant: '典範條目評選',
                    hans: '典范条目评选',
                }),
            },
            {
                value: 'Wikipedia:特色列表评选/提名区',
                label: state.convByVar({
                    hant: '特色列表評選',
                    hans: '特色列表评选',
                }),
            },
            {
                value: 'Wikipedia:優良條目評選/提名區',
                label: state.convByVar({
                    hant: '優良條目評選',
                    hans: '优良条目评选',
                }),
            },
            {
                value: 'Wikipedia:同行评审/提案区',
                label: state.convByVar({ hant: '同行評審', hans: '同行评审' }),
            },
            ...(talkPageTitle
                ? [
                      {
                          value: talkPageTitle,
                          label: state.convByVar({
                              hant: '討論頁',
                              hans: '讨论页',
                          }),
                      },
                  ]
                : []),
        ];

        const canClearAll = computed(() =>
            Boolean(props.onClearAllAnnotations),
        );
        const isEmpty = computed(() =>
            groups.value.every((group) => !group.annotations.length),
        );

        const busy = computed(
            () =>
                importing.value ||
                copyingReview.value ||
                clearingAll.value ||
                deletingAnnotationId.value !== null,
        );
        const pendingLabel = computed(() =>
            importing.value
                ? i18n.importing
                : copyingReview.value
                  ? i18n.copying
                  : clearingAll.value
                    ? i18n.clearing
                    : deletingAnnotationId.value
                      ? i18n.deleting
                      : '',
        );
        const fileMenuItems = computed(() => [
            {
                value: 'import',
                label: i18n.import,
                disabled: !props.onImportAnnotations,
            },
            { value: 'export', label: i18n.export, disabled: isEmpty.value },
        ]);

        const flattenedAnnotations = computed(() =>
            groups.value.flatMap((group) => group.annotations),
        );
        const timeRange = computed(() =>
            getAnnotationTimeRange(flattenedAnnotations.value),
        );

        const sortingOptions = computed(() => [
            { value: 'position', label: i18n.sortPosition },
            { value: 'created-desc', label: i18n.sortCreatedDesc },
            { value: 'created-asc', label: i18n.sortCreatedAsc },
        ]);

        const selectedSortLabel = computed(
            () =>
                sortingOptions.value.find(
                    (option) => option.value === sortMethod.value,
                )?.label,
        );

        const sortedGroups = computed(() => {
            const annotations = flattenedAnnotations.value;
            if (sortMethod.value === 'created-desc')
                return groupAnnotationsByTime(annotations, 'desc');
            if (sortMethod.value === 'created-asc')
                return groupAnnotationsByTime(annotations, 'asc');
            return sortGroupsByPosition(groupAnnotations(annotations));
        });

        function formatTimestamp(ts: number): string {
            return formatAnnotationTimestamp(ts, now.value, state.convByVar);
        }

        function handleEdit(annotationId: string, sectionPath: string) {
            if (busy.value) return;
            props.onEditAnnotation?.(annotationId, sectionPath);
        }

        async function handleDelete(
            annotationId: string,
            sectionPath: string,
        ): Promise<void> {
            if (
                busy.value ||
                !props.onDeleteAnnotation ||
                !window.confirm(i18n.deleteConfirm)
            )
                return;
            actionError.value = '';
            deletingAnnotationId.value = annotationId;
            try {
                await props.onDeleteAnnotation(annotationId, sectionPath);
            } catch (error) {
                console.error(
                    '[ReviewTool] Failed to delete annotation',
                    error,
                );
                actionError.value = i18n.deleteError;
            } finally {
                deletingAnnotationId.value = null;
            }
        }

        async function handleClearAll(): Promise<void> {
            if (
                busy.value ||
                !props.onClearAllAnnotations ||
                isEmpty.value ||
                !window.confirm(i18n.clearAllConfirm)
            )
                return;
            actionError.value = '';
            clearingAll.value = true;
            try {
                const cleared = await props.onClearAllAnnotations();
                if (!cleared)
                    mw.notify(i18n.clearAllNothing, { tag: 'review-tool' });
            } catch (error) {
                console.error(
                    '[ReviewTool] Failed to clear annotations',
                    error,
                );
                actionError.value = i18n.clearAllError;
            } finally {
                clearingAll.value = false;
            }
        }

        function handleUndoClear(): void {
            if (busy.value || !props.onUndoClearAnnotations) return;
            actionError.value = '';
            try {
                if (props.onUndoClearAnnotations() === false)
                    actionError.value = i18n.undoClearError;
            } catch (error) {
                console.error(
                    '[ReviewTool] Failed to restore annotations',
                    error,
                );
                actionError.value = i18n.undoClearError;
            }
        }

        async function handleCopyReview(action: string | number | null) {
            reviewAction.value = null;
            if (isEmpty.value || busy.value) return;
            const destination = reviewDestinations.find(
                (item) => item.value === action,
            );
            if (action !== 'copy' && !destination) return;
            let url = destination ? mw.util.getUrl(destination.value) : null;
            if (url && destination && destination.value !== talkPageTitle) {
                url += `#${mw.util.escapeIdForLink(props.pageName.replace(/_/g, ' '))}`;
            }
            copyingReview.value = true;
            actionError.value = '';
            try {
                const copied = await copyWritingReview(groups.value);
                if (!copied) actionError.value = i18n.copyError;
                if (copied && url && open.value) window.location.assign(url);
            } catch (error) {
                console.error('[ReviewTool] Failed to copy review', error);
                actionError.value = i18n.copyError;
            } finally {
                copyingReview.value = false;
            }
        }

        function handleFileAction(action: string | number | null): void {
            fileAction.value = null;
            if (busy.value) return;
            if (action === 'import' && props.onImportAnnotations) {
                importInput.value?.click();
            } else if (action === 'export') {
                handleExport();
            }
        }

        function handleExport() {
            if (isEmpty.value || busy.value) return;
            actionError.value = '';
            try {
                const payload = {
                    pageName: props.pageName,
                    exportedAt: Date.now(),
                    groups: groups.value,
                };
                const json = JSON.stringify(payload, null, 2);
                const blob = new Blob([json], {
                    type: 'application/json;charset=utf-8',
                });
                const filename = `review-tool-annotations-${new Date().toISOString().replace(/[:.]/g, '')}.json`;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                mw.notify(i18n.exportDone, { tag: 'review-tool' });
            } catch (error) {
                console.error(
                    '[ReviewTool] Failed to export annotations',
                    error,
                );
                actionError.value = i18n.exportError;
            }
        }

        async function handleImport(event: Event): Promise<void> {
            const input = event.target as HTMLInputElement;
            const file = input.files?.[0];
            if (!file || !props.onImportAnnotations || busy.value) return;
            actionError.value = '';
            importing.value = true;
            try {
                const json = await file.text();
                if (!open.value) return;
                const imported = await props.onImportAnnotations(json);
                mw.notify(
                    imported
                        ? i18n.importDone.replace('$1', String(imported))
                        : i18n.importNothing,
                    { tag: 'review-tool' },
                );
            } catch (error) {
                console.error(
                    '[ReviewTool] Failed to import annotations',
                    error,
                );
                actionError.value = i18n.importError;
            } finally {
                input.value = '';
                importing.value = false;
            }
        }

        function onUpdateOpen(newValue: boolean) {
            if (!newValue) {
                closeDialog();
            }
        }

        function closeDialog() {
            open.value = false;
            closeDialogAfterTransition(props.onClosed);
        }

        return {
            props,
            i18n,
            open,
            groups,
            canUndoClear,
            deletingAnnotationId,
            clearingAll,
            copyingReview,
            importing,
            importInput,
            fileAction,
            reviewAction,
            sortMethod,
            actionError,
            stackedActions,
            footerActions,
            now,
            get timeRefreshInterval() {
                return timeRefreshInterval;
            },
            set timeRefreshInterval(v) {
                timeRefreshInterval = v;
            },
            talkPageTitle,
            reviewDestinations,
            canClearAll,
            isEmpty,
            busy,
            pendingLabel,
            fileMenuItems,
            flattenedAnnotations,
            timeRange,
            sortingOptions,
            selectedSortLabel,
            sortedGroups,
            formatTimestamp,
            handleEdit,
            handleDelete,
            handleClearAll,
            handleUndoClear,
            handleCopyReview,
            handleFileAction,
            handleExport,
            handleImport,
            onUpdateOpen,
            closeDialog,
        };
    },
});
