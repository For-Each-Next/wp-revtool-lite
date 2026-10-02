/**
 * @file src/i18n/annotation-editor.ts
 * Purpose: src / i18n / annotation editor module.
 *
 * Table of contents:
 * 1. Imports
 * 2. AnnotationEditorI18n
 * 3. buildAnnotationEditorMessages
 */

import type { TranslateVariants } from '../shared/translation';

type AnnotationEditorI18n = {
    titleCreate: string;
    titleEdit: string;
    sectionLabel: string;
    sentenceLabel: string;
    sourcesLabel: string;
    copySource: string;
    sourceCopied: string;
    sourceCopyFailed: string;
    opinionLabel: string;
    opinionPlaceholder: string;
    opinionRequired: string;
    opinionHint: string;
    quickInput: string;
    smallText: string;
    joking: string;
    cancel: string;
    save: string;
    create: string;
    delete: string;
    deleteConfirm: string;
};

export function buildAnnotationEditorMessages(
    translate: TranslateVariants,
): AnnotationEditorI18n {
    return {
        titleCreate: translate({
            hant: '新增批註',
            hans: '新增批注',
        }),
        titleEdit: translate({
            hant: '編輯批註',
            hans: '编辑批注',
        }),
        sectionLabel: translate({
            hant: '章節：',
            hans: '章节：',
        }),
        sentenceLabel: translate({
            hant: '句子：',
            hans: '句子：',
        }),
        sourcesLabel: translate({
            hant: '相關來源',
            hans: '相关来源',
        }),
        copySource: translate({ hant: '複製', hans: '复制' }),
        sourceCopied: translate({
            hant: '已複製。',
            hans: '已复制。',
        }),
        sourceCopyFailed: translate({
            hant: '無法複製，請選取連結文字手動複製。',
            hans: '无法复制，请选取链接文字手动复制。',
        }),
        opinionLabel: translate({
            hant: '批註內容',
            hans: '批注内容',
        }),
        opinionPlaceholder: translate({
            hant: '請輸入批註內容…',
            hans: '请输入批注内容…',
        }),
        opinionRequired: translate({
            hant: '批註內容不能為空',
            hans: '批注内容不能为空',
        }),
        opinionHint: translate({
            hant: '批註儲存於此瀏覽器；複製評審文字後，可自行貼到維基百科。',
            hans: '批注存储于此浏览器；复制评审文本后，可自行粘贴到维基百科。',
        }),
        quickInput: translate({
            hant: '快速輸入',
            hans: '快速输入',
        }),
        smallText: translate({ hant: '小字', hans: '小字' }),
        joking: translate({ hant: '開玩笑的', hans: '开玩笑的' }),
        cancel: translate({ hant: '取消', hans: '取消' }),
        save: translate({ hant: '儲存', hans: '保存' }),
        create: translate({ hant: '新增', hans: '新增' }),
        delete: translate({ hant: '刪除', hans: '删除' }),
        deleteConfirm: translate({
            hant: '確定要刪除這條批註？',
            hans: '确定要删除这条批注？',
        }),
    };
}
