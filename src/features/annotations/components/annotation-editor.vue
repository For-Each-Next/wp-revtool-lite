<!--
@file src/features/annotations/components/annotation-editor.vue
Purpose: src / features / annotations / components / annotation editor module.

Table of contents:
1. Template
-->

<template>
    <cdx-dialog
        v-model:open="open"
        :title="dialogTitle"
        :use-close-button="true"
        @update:open="onUpdateOpen"
        class="review-tool-dialog review-tool-annotation-editor-dialog"
    >
        <div class="review-tool-form-section">
            <div class="review-tool-annotation-editor__label">
                {{ i18n.sectionLabel }}
            </div>
            <div class="review-tool-annotation-editor__section">
                {{ props.sectionPath }}
            </div>
        </div>

        <div class="review-tool-form-section">
            <div
                id="annotation-sentence-label"
                class="review-tool-annotation-editor__label"
            >
                {{ i18n.sentenceLabel }}
            </div>
            <div
                class="review-tool-annotation-editor__quote"
                role="region"
                aria-labelledby="annotation-sentence-label"
                tabindex="0"
            >
                {{ props.sentenceText }}
            </div>
        </div>

        <div
            v-if="props.relatedSources.length"
            class="review-tool-form-section"
        >
            <div
                id="annotation-sources-label"
                class="review-tool-annotation-editor__label"
            >
                {{ i18n.sourcesLabel }}
            </div>
            <ul
                class="review-tool-annotation-editor__sources"
                aria-labelledby="annotation-sources-label"
            >
                <li
                    v-for="source in props.relatedSources"
                    :key="source.wikitext"
                >
                    <a
                        :href="source.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        >{{ source.title }}</a
                    >
                    <cdx-button
                        class="review-tool-source-copy"
                        type="button"
                        size="small"
                        weight="quiet"
                        :disabled="copyingSource"
                        :title="`${i18n.copySource}${source.label}`"
                        :aria-label="`${i18n.copySource}${source.label}`"
                        @click="copySource(source)"
                        >{{ i18n.copySource }}{{ source.label }}</cdx-button
                    >
                    <code v-if="failedSourceWikitext === source.wikitext">{{
                        source.wikitext
                    }}</code>
                </li>
            </ul>
            <cdx-message
                v-if="sourceCopyStatus"
                :type="failedSourceWikitext ? 'error' : 'success'"
                :inline="true"
                class="review-tool-annotation-editor__sources-hint"
                >{{ sourceCopyStatus }}</cdx-message
            >
        </div>

        <div
            ref="opinionField"
            class="review-tool-form-section"
            v-comment-shortcuts
        >
            <cdx-field :status="showValidationError ? 'error' : 'default'">
                <template #label>{{ i18n.opinionLabel }}</template>
                <template #description>{{ i18n.opinionHint }}</template>
                <div
                    class="review-tool-annotation-editor__quick-input"
                    role="group"
                    :aria-label="i18n.quickInput"
                >
                    <cdx-button
                        v-for="input in quickInputs"
                        :key="input.openTag"
                        type="button"
                        size="small"
                        weight="quiet"
                        :title="`${input.openTag}…${input.closeTag}`"
                        @mousedown.prevent
                        @click="
                            insertCommentMarkup(input.openTag, input.closeTag)
                        "
                        >{{ input.label }}</cdx-button
                    >
                </div>
                <cdx-text-area
                    v-model="opinion"
                    rows="5"
                    :aria-invalid="showValidationError ? 'true' : undefined"
                    :aria-errormessage="
                        showValidationError
                            ? 'annotation-opinion-error'
                            : undefined
                    "
                    :placeholder="i18n.opinionPlaceholder"
                ></cdx-text-area>
                <template #error
                    ><span id="annotation-opinion-error">{{
                        i18n.opinionRequired
                    }}</span></template
                >
            </cdx-field>
        </div>

        <template #footer>
            <div class="review-tool-annotation-editor__footer">
                <cdx-button
                    v-if="props.allowDelete"
                    weight="quiet"
                    action="destructive"
                    :title="i18n.delete"
                    class="review-tool-annotation-editor__delete"
                    @click.prevent="onDeleteClick"
                >
                    <span class="review-tool-control-label">{{
                        i18n.delete
                    }}</span>
                </cdx-button>
                <div class="review-tool-annotation-editor__actions">
                    <cdx-button
                        v-for="action in footerActions"
                        :key="action"
                        :action="action === 'save' ? 'progressive' : 'default'"
                        :weight="action === 'save' ? 'primary' : 'normal'"
                        :title="action === 'save' ? primaryLabel : i18n.cancel"
                        @click="
                            action === 'save'
                                ? onPrimaryAction()
                                : onCancelAction()
                        "
                    >
                        <span class="review-tool-control-label">{{
                            action === 'save' ? primaryLabel : i18n.cancel
                        }}</span>
                    </cdx-button>
                </div>
            </div>
        </template>
    </cdx-dialog>
</template>
