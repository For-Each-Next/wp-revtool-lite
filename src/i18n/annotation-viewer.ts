/**
 * @file src/i18n/annotation-viewer.ts
 * Purpose: src / i18n / annotation viewer module.
 *
 * Table of contents:
 * 1. Imports
 * 2. AnnotationViewerI18n
 * 3. buildAnnotationViewerMessages
 */

import type { TranslateVariants } from '../shared/translation';

type AnnotationViewerI18n = {
    title: string;
    empty: string;
    emptyHint: string;
    summary: string;
    edit: string;
    delete: string;
    deleteConfirm: string;
    deleteError: string;
    clearAll: string;
    clearAllConfirm: string;
    undoClear: string;
    clearAllNothing: string;
    clearAllError: string;
    undoClearError: string;
    sectionFallback: string;
    close: string;
    export: string;
    exportDone: string;
    exportError: string;
    import: string;
    importDone: string;
    importNothing: string;
    importError: string;
    importExport: string;
    copyReview: string;
    copyAndGo: string;
    copyError: string;
    copying: string;
    importing: string;
    deleting: string;
    clearing: string;
    sortLabel: string;
    sortCreatedAsc: string;
    sortCreatedDesc: string;
    sortPosition: string;
    firstComment: string;
    lastEdit: string;
};

export function buildAnnotationViewerMessages(
    translate: TranslateVariants,
): AnnotationViewerI18n {
    return {
        title: translate({ hant: '批註列表', hans: '批注列表' }),
        empty: translate({ hant: '尚無批註', hans: '尚无批注' }),
        emptyHint: translate({
            hant: '開啟批註模式後，在文章中選取文字即可新增批註，也可匯入先前匯出的 JSON 檔案。',
            hans: '开启批注模式后，在文章中选取文字即可新增批注，也可导入先前导出的 JSON 文件。',
        }),
        summary: translate({
            hant: '$1 則批註 · 僅儲存於此瀏覽器',
            hans: '$1 条批注 · 仅存储于此浏览器',
        }),
        edit: translate({ hant: '編輯', hans: '编辑' }),
        delete: translate({ hant: '刪除', hans: '删除' }),
        deleteConfirm: translate({
            hant: '確定刪除？',
            hans: '确定删除？',
        }),
        deleteError: translate({
            hant: '無法刪除批註。請檢查瀏覽器儲存空間後重試。',
            hans: '无法删除批注。请检查浏览器存储空间后重试。',
        }),
        clearAll: translate({
            hant: '清除全部',
            hans: '清除全部',
        }),
        clearAllConfirm: translate({
            hant: '確定清除所有批註？清除後可按「復原清除」。',
            hans: '确定清除所有批注？清除后可按“撤销清除”。',
        }),
        undoClear: translate({
            hant: '復原清除',
            hans: '撤销清除',
        }),
        clearAllNothing: translate({
            hant: '沒有可清除的批註。',
            hans: '没有可清除的批注。',
        }),
        clearAllError: translate({
            hant: '無法清除批註。請檢查瀏覽器儲存空間後重試。',
            hans: '无法清除批注。请检查浏览器存储空间后重试。',
        }),
        undoClearError: translate({
            hant: '無法復原批註。請檢查瀏覽器儲存空間後重試。',
            hans: '无法撤销清除。请检查浏览器存储空间后重试。',
        }),
        sectionFallback: translate({
            hant: '（未指定章節）',
            hans: '（未指定章节）',
        }),
        close: translate({ hant: '關閉', hans: '关闭' }),
        export: translate({ hant: '匯出', hans: '导出' }),
        exportDone: translate({
            hant: '已匯出批註。',
            hans: '已导出批注。',
        }),
        exportError: translate({
            hant: '無法匯出批註。請檢查瀏覽器下載權限後重試。',
            hans: '无法导出批注。请检查浏览器下载权限后重试。',
        }),
        import: translate({ hant: '匯入', hans: '导入' }),
        importDone: translate({
            hant: '已匯入 $1 則批註。',
            hans: '已导入 $1 条批注。',
        }),
        importNothing: translate({
            hant: '沒有新的批註可匯入，已有的批註會略過。',
            hans: '没有新的批注可导入，已有的批注会跳过。',
        }),
        importError: translate({
            hant: '無法匯入批註。請檢查 ReviewTool 批註 JSON 檔案及瀏覽器儲存空間。',
            hans: '无法导入批注。请检查 ReviewTool 批注 JSON 文件及浏览器存储空间。',
        }),
        importExport: translate({
            hant: '匯入／匯出',
            hans: '导入／导出',
        }),
        copyReview: translate({ hant: '複製', hans: '复制' }),
        copyAndGo: translate({
            hant: '複製並前往',
            hans: '复制并前往',
        }),
        copyError: translate({
            hant: '無法複製評審文字。請檢查網路連線及剪貼簿權限後重試。',
            hans: '无法复制评审文本。请检查网络连接及剪贴板权限后重试。',
        }),
        copying: translate({
            hant: '正在準備評審文字…',
            hans: '正在准备评审文本…',
        }),
        importing: translate({
            hant: '正在匯入批註…',
            hans: '正在导入批注…',
        }),
        deleting: translate({
            hant: '正在刪除批註…',
            hans: '正在删除批注…',
        }),
        clearing: translate({
            hant: '正在清除批註…',
            hans: '正在清除批注…',
        }),
        sortLabel: translate({
            hant: '排序方式',
            hans: '排序方式',
        }),
        sortCreatedAsc: translate({
            hant: '最早時間優先',
            hans: '最早时间优先',
        }),
        sortCreatedDesc: translate({
            hant: '最新時間優先',
            hans: '最新时间优先',
        }),
        sortPosition: translate({
            hant: '頁面位置',
            hans: '页面位置',
        }),
        firstComment: translate({
            hant: '首次批註時間',
            hans: '首次批注时间',
        }),
        lastEdit: translate({
            hant: '最近編輯時間',
            hans: '最近编辑时间',
        }),
    };
}
