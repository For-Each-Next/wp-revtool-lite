/**
 * @file src/app/article-controller.ts
 * Purpose: src / app / article controller module.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. sanitizePlainText
 * 4. getArticleContentContainer
 * 5. restoreInlineAnnotationBubbles
 * 6. clearAllInlineAnnotationBubbles
 * 7. createInlineAnnotationBubbleElement
 * 8. insertInlineAnnotationBubble
 * 9. updateInlineAnnotationBubble
 * 10. removeInlineAnnotationBubble
 * 11. AnnotationDialogOptions
 * 12. openAnnotationDialog
 * 13. refreshAnnotationViewer
 * 14. restoreClearedPageAnnotations
 * 15. clearPageAnnotations
 * 16. showAnnotationViewer
 * 17. addMainPageReviewToolButtonsToDOM
 * 18. addGlobalAnnotationViewerButton
 * 19. toggleArticleAnnotationMode
 * 20. installArticleInteractions
 * 21. getReviewToolPortletLabel
 * 22. syncAnnotationModeMenuState
 */

import { addPortletTrigger } from '../platform/mediawiki/portlet';
import state from '../platform/mediawiki/context';
import { confirmClearOnFirstActivation } from './annotation-session';
import { installReferenceLinkTips } from '../platform/browser/dom/reference-links';
import { collectRelatedSources } from '../platform/browser/dom/related-sources';
import {
    createAnnotation,
    deleteAnnotation,
    getAnnotation,
    importAnnotations,
    loadAnnotations,
    updateAnnotation,
    buildAnnotationGroups,
    clearAnnotations,
    canUndoClearAnnotations,
    undoClearAnnotations,
} from './annotations';
import { openAnnotationEditorDialog } from '../features/annotations/annotation-editor';
import {
    closeAnnotationViewerDialog,
    isAnnotationViewerDialogOpen,
    openAnnotationViewerDialog,
    updateAnnotationViewerDialogGroups,
} from '../features/annotations/annotation-viewer';
import { computeSectionPathFromNode } from '../platform/browser/dom/article-text';
import { installArticleSelection } from '../platform/browser/dom/article-selection';
import {
    wrapArticleSentences,
    clearWrappedSentences,
} from '../platform/browser/dom/sentence-wrapping';
import {
    buildArticleTextIndex,
    captureAnnotationAnchor,
    findAnnotationRange,
} from '../platform/browser/dom/annotation-anchor';

const inlineAnnotationBubbles = new Map<string, HTMLElement>();
let removeArticleInteractions: (() => void) | null = null;
let annotationModeActive = false;
let annotationActivationPending = false;
const REVIEWTOOL_PORTLET_ID = 'ca-reviewtool-toggle';

// Sanitize plain text (e.g. from Range#toString) by stripping obvious citation markers
function sanitizePlainText(text?: string | null): string {
    if (!text) return '';
    // remove bracketed numeric references like [1], [23]
    let s = text.replace(/\[\s*\d+\s*\]/g, '');
    // remove superscript numbers commonly copied as plain digits
    s = s.replace(/[\u00B9\u00B2\u00B3\u2070-\u2079]+/g, '');
    // collapse whitespace
    return s.replace(/\s+/g, ' ').trim();
}

function getArticleContentContainer(): Element | null {
    const selectors = [
        '#mw-content-text .mw-parser-output',
        '#mw-content-text',
        '.mw-parser-output',
        '#content',
        '#bodyContent',
    ];
    for (const selector of selectors) {
        const container = document.querySelector(selector);
        if (container) return container;
    }
    return null;
}

function restoreInlineAnnotationBubbles(pageName: string): void {
    const container = getArticleContentContainer();
    if (!container) return;
    const annotations = loadAnnotations(pageName).annotations;
    const ids = new Set(annotations.map((annotation) => annotation.id));
    inlineAnnotationBubbles.forEach((bubble, id) => {
        if (!container.contains(bubble) || !ids.has(id))
            removeInlineAnnotationBubble(id);
    });
    const missing = annotations.filter(
        (annotation) => !inlineAnnotationBubbles.has(annotation.id),
    );
    if (!missing.length) return;
    const index = buildArticleTextIndex(container);
    // Resolve all ranges before inserting icons, which splits existing text nodes.
    const placements = missing.map((annotation) => ({
        annotation,
        range: findAnnotationRange(
            index,
            annotation,
            computeSectionPathFromNode,
        ),
    }));
    for (const { annotation, range } of placements) {
        if (!range) continue;
        insertInlineAnnotationBubble(
            range,
            pageName,
            annotation.sectionPath,
            annotation.id,
            annotation.opinion,
        );
    }
}

function clearAllInlineAnnotationBubbles() {
    inlineAnnotationBubbles.forEach((bubble) => bubble.remove());
    inlineAnnotationBubbles.clear();
    // Remove stray nodes that might not be tracked in the map
    document
        .querySelectorAll('.review-tool-inline-annotation')
        .forEach((bubble) => {
            bubble.remove();
        });
}

function createInlineAnnotationBubbleElement(
    pageName: string,
    sectionPath: string,
    annotationId: string,
    opinion: string,
): HTMLElement {
    const bubble = document.createElement('span');
    bubble.className = 'review-tool-inline-annotation';
    bubble.dataset.annoId = annotationId;
    bubble.title = opinion;

    const icon = document.createElement('button');
    icon.type = 'button';
    icon.className = 'review-tool-inline-annotation__icon';
    icon.textContent = '💬';
    icon.title = opinion;
    icon.setAttribute(
        'aria-label',
        state.convByVar({ hant: '編輯批註', hans: '编辑批注' }),
    );
    icon.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        void openAnnotationDialog(pageName, annotationId, sectionPath);
    };

    bubble.appendChild(icon);
    return bubble;
}

function insertInlineAnnotationBubble(
    range: Range | null,
    pageName: string,
    sectionPath: string,
    annotationId: string,
    opinion: string,
) {
    if (!range) {
        console.warn(
            '[ReviewTool] Cannot insert inline annotation bubble without a selection range.',
        );
        return;
    }

    removeInlineAnnotationBubble(annotationId);

    const bubble = createInlineAnnotationBubbleElement(
        pageName,
        sectionPath,
        annotationId,
        opinion,
    );
    inlineAnnotationBubbles.set(annotationId, bubble);

    const insertionRange = range.cloneRange();
    insertionRange.collapse(false);
    insertionRange.insertNode(bubble);
}

function updateInlineAnnotationBubble(annotationId: string, opinion: string) {
    const bubble = inlineAnnotationBubbles.get(annotationId);
    if (!bubble) return;
    bubble.title = opinion;
    if (bubble.firstElementChild) {
        (bubble.firstElementChild as HTMLElement).title = opinion;
    }
}

function removeInlineAnnotationBubble(annotationId: string) {
    const bubble = inlineAnnotationBubbles.get(annotationId);
    if (!bubble) return;
    bubble.remove();
    inlineAnnotationBubbles.delete(annotationId);
}

interface AnnotationDialogOptions {
    sentenceText?: string;
    selectionRange?: Range | null;
    sentencePos?: string;
}

async function openAnnotationDialog(
    pageName: string,
    annotationId: string | null,
    sectionPath: string,
    options: AnnotationDialogOptions = {},
) {
    const selectionRange = options.selectionRange?.cloneRange() ?? null;
    const isEdit = annotationId !== null;
    const existingAnnotation =
        isEdit && annotationId ? getAnnotation(pageName, annotationId) : null;
    const displaySentenceText = isEdit
        ? existingAnnotation?.sentenceText || ''
        : sanitizePlainText(options.sentenceText || '');
    const initialOpinion = isEdit ? existingAnnotation?.opinion || '' : '';
    let shouldReopenViewer = isAnnotationViewerDialogOpen();
    sectionPath = sectionPath === '目次' ? '序言' : sectionPath;

    try {
        const container = getArticleContentContainer();
        const sourceRange =
            selectionRange ??
            (container && existingAnnotation
                ? findAnnotationRange(
                      buildArticleTextIndex(container),
                      existingAnnotation,
                      computeSectionPathFromNode,
                  )
                : null);
        const relatedSources = container
            ? collectRelatedSources(container, sourceRange)
            : [];
        if (shouldReopenViewer) {
            closeAnnotationViewerDialog();
        }

        const result = await openAnnotationEditorDialog({
            sectionPath,
            sentenceText: displaySentenceText,
            relatedSources,
            initialOpinion,
            mode: isEdit ? 'edit' : 'create',
            allowDelete: isEdit,
        });

        if (result.action === 'replaced') {
            shouldReopenViewer = false;
            return;
        }
        if (result.action === 'cancel') {
            return;
        }

        if (result.action === 'delete' && isEdit && annotationId) {
            const removed = deleteAnnotation(pageName, annotationId);
            if (removed) {
                removeInlineAnnotationBubble(annotationId);
            }
            return;
        }

        if (result.action === 'save') {
            if (isEdit && annotationId) {
                const updated = updateAnnotation(pageName, annotationId, {
                    opinion: result.opinion,
                });
                if (updated) {
                    updateInlineAnnotationBubble(annotationId, result.opinion);
                }
            } else {
                const sentencePosKey = options.sentencePos || '';
                const container = getArticleContentContainer();
                const textAnchor =
                    container && selectionRange
                        ? captureAnnotationAnchor(
                              buildArticleTextIndex(container),
                              selectionRange,
                          )
                        : undefined;
                const created = createAnnotation(
                    pageName,
                    sectionPath,
                    displaySentenceText,
                    result.opinion,
                    sentencePosKey,
                    textAnchor,
                );
                insertInlineAnnotationBubble(
                    selectionRange,
                    pageName,
                    sectionPath,
                    created.id,
                    result.opinion,
                );
            }
        }
    } catch (error) {
        console.error('[ReviewTool] Annotation action failed', error);
        mw.notify(
            state.convByVar({
                hant: '無法完成批註操作，請檢查瀏覽器儲存空間後重試。',
                hans: '无法完成批注操作，请检查浏览器存储空间后重试。',
            }),
            { type: 'error', tag: 'review-tool' },
        );
    } finally {
        if (shouldReopenViewer) {
            showAnnotationViewer(pageName);
        }
    }
}

function refreshAnnotationViewer(pageName: string): void {
    updateAnnotationViewerDialogGroups(
        buildAnnotationGroups(pageName),
        canUndoClearAnnotations(pageName),
    );
}

function restoreClearedPageAnnotations(pageName: string): boolean {
    try {
        const restored = undoClearAnnotations(pageName);
        refreshAnnotationViewer(pageName);
        restoreInlineAnnotationBubbles(pageName);
        mw.notify(
            state.convByVar({
                hant: `已復原 ${restored} 則批註。`,
                hans: `已恢复 ${restored} 条批注。`,
            }),
            { tag: 'review-tool-clear' },
        );
        return true;
    } catch (error) {
        console.error(
            '[ReviewTool] Failed to restore cleared annotations',
            error,
        );
        mw.notify(
            state.convByVar({
                hant: '無法復原批註，請檢查瀏覽器儲存空間後重試。',
                hans: '无法恢复批注，请检查浏览器存储空间后重试。',
            }),
            { type: 'error', tag: 'review-tool' },
        );
        return false;
    }
}

function clearPageAnnotations(pageName: string): boolean {
    if (!clearAnnotations(pageName)) return false;
    clearAllInlineAnnotationBubbles();
    refreshAnnotationViewer(pageName);
    const message = document.createElement('span');
    message.textContent = state.convByVar({
        hant: '已清除本頁批註。',
        hans: '已清除本页批注。',
    });
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.className = 'review-tool-undo-clear';
    undo.textContent = state.convByVar({ hant: '復原清除', hans: '撤销清除' });
    undo.onclick = (event) => {
        event.stopPropagation();
        restoreClearedPageAnnotations(pageName);
    };
    message.appendChild(undo);
    mw.notify(message, { autoHide: false, tag: 'review-tool-clear' });
    return true;
}

function showAnnotationViewer(pageName: string) {
    if (isAnnotationViewerDialogOpen()) {
        closeAnnotationViewerDialog();
        return;
    }

    const groups = buildAnnotationGroups(pageName);
    void openAnnotationViewerDialog({
        pageName,
        groups,
        initialCanUndoClear: canUndoClearAnnotations(pageName),
        onEditAnnotation: (annotationId, sectionPath) => {
            void openAnnotationDialog(pageName, annotationId, sectionPath);
        },
        onDeleteAnnotation: (annotationId) => {
            const removed = deleteAnnotation(pageName, annotationId);
            if (removed) {
                removeInlineAnnotationBubble(annotationId);
                refreshAnnotationViewer(pageName);
            }
        },
        onClearAllAnnotations: () => clearPageAnnotations(pageName),
        onUndoClearAnnotations: () => restoreClearedPageAnnotations(pageName),
        onImportAnnotations: (json) => {
            const imported = importAnnotations(pageName, json);
            refreshAnnotationViewer(pageName);
            restoreInlineAnnotationBubbles(pageName);
            return imported;
        },
    });
}

/**
 * Restore annotations and article controls after MediaWiki renders page content.
 * @param pageName {string} 條目標題
 */
export function addMainPageReviewToolButtonsToDOM(pageName: string): void {
    restoreInlineAnnotationBubbles(pageName);
    // add global viewer button (guard against duplicate)
    addGlobalAnnotationViewerButton(pageName);
    syncAnnotationModeMenuState(annotationModeActive, pageName);
    if (annotationModeActive) installArticleInteractions(pageName);
}

function addGlobalAnnotationViewerButton(pageName: string): void {
    if (document.querySelector('.review-tool-global-button')) return; // already added
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'review-tool-global-button';
    btn.textContent = state.convByVar({ hant: '查看批註', hans: '查看批注' });
    btn.title = state.convByVar({
        hant: '查看本頁所有批註',
        hans: '查看本页所有批注',
    });
    btn.onclick = () => showAnnotationViewer(state.articleTitle || pageName);
    document.body.appendChild(btn);
}

async function toggleArticleAnnotationMode(pageName: string): Promise<void> {
    if (annotationActivationPending) return;
    const container = getArticleContentContainer();
    if (!annotationModeActive) {
        if (!container) return;
        annotationActivationPending = true;
        try {
            await confirmClearOnFirstActivation(pageName, () => {
                clearPageAnnotations(pageName);
            });
        } catch (error) {
            console.error('[ReviewTool] Failed to clear annotations', error);
            mw.notify(
                state.convByVar({
                    hant: '無法清除批註，已保留原有批註。',
                    hans: '无法清除批注，已保留原有批注。',
                }),
                {
                    type: 'error',
                    tag: 'review-tool-clear',
                },
            );
        } finally {
            annotationActivationPending = false;
        }
    }
    annotationModeActive = !annotationModeActive;
    const isActive = annotationModeActive;
    syncAnnotationModeMenuState(isActive, pageName);
    document.documentElement.classList.toggle(
        'review-tool-annotation-mode',
        isActive,
    );
    mw.notify(
        state.convByVar({
            hant: isActive ? '批註模式已啟用。' : '批註模式已停用。',
            hans: isActive ? '批注模式已启用。' : '批注模式已停用。',
        }),
        { tag: 'review-tool' },
    );

    if (isActive) installArticleInteractions(pageName);
    else {
        removeArticleInteractions?.();
        removeArticleInteractions = null;
    }
}

function installArticleInteractions(pageName: string): void {
    removeArticleInteractions?.();
    removeArticleInteractions = null;
    const container = getArticleContentContainer();
    if (!container) return;
    wrapArticleSentences(container);
    const removeSelection = installArticleSelection(
        container,
        (range, sentenceText, sentencePos) => {
            void openAnnotationDialog(
                pageName,
                null,
                computeSectionPathFromNode(range.startContainer),
                {
                    sentenceText,
                    selectionRange: range,
                    sentencePos,
                },
            );
        },
    );
    const removeReferences = installReferenceLinkTips(container);
    removeArticleInteractions = () => {
        removeSelection();
        removeReferences();
        clearWrappedSentences(container);
    };
}

function getReviewToolPortletLabel(isActive: boolean): string {
    return state.convByVar({
        hant: isActive ? '關閉批註模式' : '啟用批註模式',
        hans: isActive ? '关闭批注模式' : '开启批注模式',
    });
}

function syncAnnotationModeMenuState(
    isActive: boolean,
    pageName: string,
): void {
    addPortletTrigger(
        REVIEWTOOL_PORTLET_ID,
        getReviewToolPortletLabel(isActive),
        () => {
            void toggleArticleAnnotationMode(pageName);
        },
    );
    const portlet = document.getElementById(REVIEWTOOL_PORTLET_ID);
    if (portlet) {
        portlet.classList.toggle('selected', isActive);
    }
}
