<!--
@file src/features/annotations/components/annotation-viewer.vue
Purpose: src / features / annotations / components / annotation viewer module.

Table of contents:
1. Template
-->

<template>
    <cdx-dialog
        v-model:open="open"
        :title="i18n.title"
        :use-close-button="true"
        @update:open="onUpdateOpen"
        class="review-tool-dialog review-tool-annotation-viewer-dialog"
    >
        <div class="review-tool-annotation-viewer__feedback">
            <cdx-message v-if="actionError" type="error" :inline="true">{{
                actionError
            }}</cdx-message>
            <div role="status" aria-live="polite">
                <template v-if="busy">
                    {{ pendingLabel }}
                    <cdx-progress-bar
                        :aria-label="pendingLabel"
                        class="review-tool-annotation-viewer__progress"
                    />
                </template>
            </div>
        </div>
        <div v-if="isEmpty" class="review-tool-annotation-viewer__empty">
            <strong>{{ i18n.empty }}</strong>
            <p>{{ i18n.emptyHint }}</p>
        </div>
        <div
            v-else
            class="review-tool-annotation-viewer__list"
            :aria-busy="busy"
        >
            <p class="review-tool-annotation-viewer__summary">
                {{
                    i18n.summary.replace(
                        '$1',
                        String(flattenedAnnotations.length),
                    )
                }}
            </p>
            <dl v-if="timeRange" class="review-tool-annotation-viewer__times">
                <div>
                    <dt>{{ i18n.firstComment }}</dt>
                    <dd>
                        <time
                            :datetime="new Date(timeRange.first).toISOString()"
                            >{{ formatTimestamp(timeRange.first) }}</time
                        >
                    </dd>
                </div>
                <div>
                    <dt>{{ i18n.lastEdit }}</dt>
                    <dd>
                        <time
                            :datetime="new Date(timeRange.last).toISOString()"
                            >{{ formatTimestamp(timeRange.last) }}</time
                        >
                    </dd>
                </div>
            </dl>
            <div
                v-for="group in sortedGroups"
                :key="group.annotations[0].id"
                class="review-tool-annotation-viewer__section"
            >
                <h4 class="review-tool-annotation-viewer__section-title">
                    {{ group.sectionPath || i18n.sectionFallback }}
                </h4>
                <ul class="review-tool-annotation-viewer__items">
                    <li
                        v-for="anno in group.annotations"
                        :key="anno.id"
                        class="review-tool-annotation-viewer__item"
                    >
                        <div class="review-tool-annotation-viewer__quote">
                            “{{ anno.sentenceText }}”
                        </div>
                        <div class="review-tool-annotation-viewer__opinion">
                            {{ anno.opinion }}
                        </div>
                        <div class="review-tool-annotation-viewer__meta">
                            {{ anno.createdBy }} ·
                            {{ formatTimestamp(anno.createdAt) }}
                        </div>
                        <div class="review-tool-annotation-viewer__actions">
                            <cdx-button
                                size="small"
                                weight="quiet"
                                :title="i18n.edit"
                                :disabled="busy || !props.onEditAnnotation"
                                @click.prevent="
                                    handleEdit(anno.id, group.sectionPath)
                                "
                            >
                                <span class="review-tool-control-label">{{
                                    i18n.edit
                                }}</span>
                            </cdx-button>
                            <cdx-button
                                size="small"
                                weight="quiet"
                                action="destructive"
                                :title="i18n.delete"
                                :disabled="busy || !props.onDeleteAnnotation"
                                @click.prevent="
                                    handleDelete(anno.id, group.sectionPath)
                                "
                            >
                                <span class="review-tool-control-label">{{
                                    i18n.delete
                                }}</span>
                            </cdx-button>
                        </div>
                    </li>
                </ul>
            </div>
        </div>
        <template #footer>
            <div class="review-tool-annotation-viewer__footer">
                <div class="review-tool-annotation-viewer__footer-left">
                    <cdx-select
                        v-model:selected="sortMethod"
                        :menu-items="sortingOptions"
                        :disabled="isEmpty"
                        :aria-label="i18n.sortLabel"
                        :title="selectedSortLabel"
                        class="review-tool-annotation-viewer__sort-select"
                    />
                </div>
                <div class="review-tool-annotation-viewer__footer-controls">
                    <div class="review-tool-annotation-viewer__maintenance">
                        <cdx-button
                            v-if="canUndoClear && props.onUndoClearAnnotations"
                            weight="quiet"
                            :disabled="busy"
                            @click="handleUndoClear"
                        >
                            <span class="review-tool-control-label">{{
                                i18n.undoClear
                            }}</span>
                        </cdx-button>
                        <cdx-button
                            weight="quiet"
                            :title="i18n.clearAll"
                            :disabled="!canClearAll || isEmpty || busy"
                            @click="handleClearAll"
                        >
                            <span class="review-tool-control-label">{{
                                i18n.clearAll
                            }}</span>
                        </cdx-button>
                    </div>
                    <div class="review-tool-annotation-viewer__footer-actions">
                        <input
                            ref="importInput"
                            type="file"
                            accept=".json,application/json"
                            hidden
                            @change="handleImport"
                        />
                        <template v-for="action in footerActions" :key="action">
                            <cdx-button
                                v-if="action === 'close'"
                                weight="normal"
                                :title="i18n.close"
                                @click="closeDialog"
                                ><span class="review-tool-control-label">{{
                                    i18n.close
                                }}</span></cdx-button
                            >
                            <cdx-menu-button
                                v-else-if="action === 'file'"
                                v-model:selected="fileAction"
                                :menu-items="fileMenuItems"
                                weight="quiet"
                                :title="i18n.importExport"
                                :disabled="busy"
                                @update:selected="handleFileAction"
                                ><span class="review-tool-control-label">{{
                                    i18n.importExport
                                }}</span></cdx-menu-button
                            >
                            <cdx-button
                                v-else-if="action === 'copy'"
                                weight="normal"
                                :title="i18n.copyReview"
                                :disabled="isEmpty || busy"
                                @click="handleCopyReview('copy')"
                                ><span class="review-tool-control-label">{{
                                    i18n.copyReview
                                }}</span></cdx-button
                            >
                            <cdx-menu-button
                                v-else
                                v-model:selected="reviewAction"
                                :menu-items="reviewDestinations"
                                action="progressive"
                                weight="primary"
                                :title="i18n.copyAndGo"
                                :disabled="isEmpty || busy"
                                @update:selected="handleCopyReview"
                                ><span class="review-tool-control-label">{{
                                    i18n.copyAndGo
                                }}</span></cdx-menu-button
                            >
                        </template>
                    </div>
                </div>
            </div>
        </template>
    </cdx-dialog>
</template>
