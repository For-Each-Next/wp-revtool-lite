/**
 * @file src/features/annotations/components/annotation-editor.ts
 * Purpose: src / features / annotations / components / annotation editor module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Exports
 */

import { buildAnnotationEditorMessages } from '../../../i18n/annotation-editor';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import state from '../../../platform/mediawiki/context';
import { closeDialogAfterTransition } from '../../../platform/mediawiki/dialog';
import { commentShortcuts as vCommentShortcuts } from '../comment-shortcuts';
import { copyText } from '../../../platform/browser/clipboard';
import type { RelatedSource } from '../../../platform/browser/dom/related-sources';
import { useStackedDialogActions } from '../responsive-actions';
import { ref, computed, watch } from 'vue';

export default defineComponent({
    directives: { 'comment-shortcuts': vCommentShortcuts },
    props: {
        mode: {
            type: String as PropType<'create' | 'edit'>,
            required: false,
            default: 'create',
        },
        sectionPath: { type: String, required: false, default: '' },
        sentenceText: { type: String, required: false, default: '' },
        relatedSources: {
            type: Array as PropType<RelatedSource[]>,
            required: false,
            default: () => [],
        },
        initialOpinion: { type: String, required: false, default: '' },
        allowDelete: { type: Boolean, required: false, default: false },
        onResolve: {
            type: Function as PropType<
                (
                    result:
                        | { action: 'save'; opinion: string }
                        | { action: 'delete' }
                        | { action: 'cancel' },
                ) => void
            >,
            required: false,
            default: undefined,
        },
    },
    setup(props) {
        const i18n = buildAnnotationEditorMessages(state.convByVar);
        const quickInputs = [
            { label: i18n.smallText, openTag: '<small>', closeTag: '</small>' },
            {
                label: i18n.joking,
                openTag:
                    '<span title="開玩笑的" style="color: grey; text-decoration: line-through">',
                closeTag: '</span>',
            },
        ];
        const open = ref(true);
        const opinionField = ref<HTMLElement | null>(null);
        const opinion = ref(
            typeof props.initialOpinion === 'string'
                ? props.initialOpinion
                : '',
        );
        const showValidationError = ref(false);
        const sourceCopyStatus = ref('');
        const failedSourceWikitext = ref('');
        const copyingSource = ref(false);
        const stackedActions = useStackedDialogActions();

        function insertCommentMarkup(openTag: string, closeTag: string) {
            const textarea = opinionField.value?.querySelector('textarea');
            if (!textarea) return;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const direction = textarea.selectionDirection;
            const selectedText = textarea.value.slice(start, end);
            textarea.focus();
            textarea.setRangeText(
                `${openTag}${selectedText}${closeTag}`,
                start,
                end,
                'select',
            );
            textarea.setSelectionRange(
                start + openTag.length,
                end + openTag.length,
                direction,
            );
            // Update the Codex text area and Vue model through the existing input handler.
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        async function copySource(source: RelatedSource) {
            if (copyingSource.value) return;
            copyingSource.value = true;
            failedSourceWikitext.value = '';
            sourceCopyStatus.value = '';
            try {
                await copyText(source.wikitext);
                sourceCopyStatus.value = `${source.label} ${i18n.sourceCopied}`;
            } catch {
                failedSourceWikitext.value = source.wikitext;
                sourceCopyStatus.value = i18n.sourceCopyFailed;
            } finally {
                copyingSource.value = false;
            }
        }

        const dialogTitle = computed(() =>
            props.mode === 'edit' ? i18n.titleEdit : i18n.titleCreate,
        );
        const primaryLabel = computed(() =>
            props.mode === 'edit' ? i18n.save : i18n.create,
        );
        const canSave = computed(() => Boolean((opinion.value || '').trim()));
        const footerActions = computed(() =>
            stackedActions.value ? ['save', 'cancel'] : ['cancel', 'save'],
        );

        watch(opinion, () => {
            if (showValidationError.value && canSave.value) {
                showValidationError.value = false;
            }
        });

        function closeDialog() {
            open.value = false;
            closeDialogAfterTransition();
        }

        function onPrimaryAction() {
            if (!canSave.value) {
                showValidationError.value = true;
                opinionField.value?.querySelector('textarea')?.focus();
                return;
            }
            props.onResolve?.({
                action: 'save',
                opinion: opinion.value.trim(),
            });
            closeDialog();
        }

        function onCancelAction() {
            props.onResolve?.({ action: 'cancel' });
            closeDialog();
        }

        function onDeleteClick() {
            if (!props.allowDelete) return;
            const ok = window.confirm(i18n.deleteConfirm);
            if (!ok) return;
            props.onResolve?.({ action: 'delete' });
            closeDialog();
        }

        function onUpdateOpen(newValue: boolean) {
            if (!newValue) {
                onCancelAction();
            }
        }

        return {
            props,
            i18n,
            quickInputs,
            open,
            opinionField,
            opinion,
            showValidationError,
            sourceCopyStatus,
            failedSourceWikitext,
            copyingSource,
            stackedActions,
            insertCommentMarkup,
            copySource,
            dialogTitle,
            primaryLabel,
            canSave,
            footerActions,
            closeDialog,
            onPrimaryAction,
            onCancelAction,
            onDeleteClick,
            onUpdateOpen,
            get vCommentShortcuts() {
                return vCommentShortcuts;
            },
        };
    },
});
