# 程式架構

ReviewToolLite 將條目批註的應用流程、純資料規則及網站整合分開。
TypeScript 來源與 Vue 對話框會建置為不需模組載入器的瀏覽器程式；
MediaWiki 提供 Vue、Codex、ResourceLoader 與網站 API。

<!-- toc:start -->

## Contents

- [目錄責任](#目錄責任)
- [依賴方向](#依賴方向)
- [啟動與條目控制](#啟動與條目控制)
- [批註與儲存](#批註與儲存)
- [對話框與複製](#對話框與複製)
- [建置與閱讀路徑](#建置與閱讀路徑)

<!-- toc:end -->

## 目錄責任

| 路徑                                             | 責任                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `src/app/`                                       | 啟動、條目控制、批註操作、首次啟用確認及評審文字複製流程。       |
| `src/domain/`                                    | 批註型別與驗證、排序、時間格式、句子切分及評審維基語法。         |
| `src/platform/`                                  | MediaWiki 文字變體與狀態、瀏覽器儲存、剪貼簿及對話框載入與掛載。 |
| `src/platform/browser/dom/`                      | 條目文字與章節定位、選取、句子包裝、註腳與相關來源介面。         |
| `src/features/annotations/`                      | Vue 批註編輯器與列表、確認操作、輸入捷徑及對話框開啟介面。       |
| `src/i18n/`                                      | 中文介面訊息與語言變體選擇。                                     |
| `src/shared/`                                    | 不依賴網站的翻譯型別。                                           |
| `src/types/`                                     | 瀏覽器與建置宣告。                                               |
| `src/index.ts`                                   | 不啟動網站介面的純操作匯出。                                     |
| `src/features/annotations/components/styles.css` | 條目批註與對話框樣式。                                           |
| `scripts/`                                       | Node.js 建置、Vue/CSS 轉換及產物驗證工具。                       |
| `tests/`                                         | 離線邏輯、儲存、DOM、對話框及建置測試。                          |
| `docs/`                                          | 使用、執行環境、資料與維護說明。                                 |
| `dist/`                                          | 自動產生的三種安裝檔案、檔案清單與授權檔。                       |

新 TypeScript 模組使用小寫連字號檔名，依能力命名。
避免把無關程式累積到通用工具模組；例如批註排序規則屬於 `domain`，
章節標題辨識屬於 `platform/browser/dom/heading.ts`，
MediaWiki 工具選單建立屬於 `platform/mediawiki/portlet.ts`。

## 依賴方向

`domain` 不依賴 DOM、MediaWiki 全域變數、介面元件或應用啟動。
儲存介面使用 domain 的型別與驗證規則；app 協調儲存、文字定位及對話框。
Vue 檔案只保留模板，同目錄的 TypeScript 定義元件行為及輸入；
中文訊息位於 `i18n/`，透過回呼請求資料修改。
`src/index.ts` 僅匯出可刻意重用的純操作，匯入它不應讀取網站狀態或啟動工具。

`platform/mediawiki/context.ts` 保存目前條目與文字變體服務。
`i18n/language.ts` 依 MediaWiki 的使用者語言變體選擇 `hant` 或 `hans`；
翻譯型別由 `shared/translation.ts` 定義。
批註時間使用瀏覽器本機時區，版本連結的時間標籤使用 UTC。

## 啟動與條目控制

`app/browser.ts` 透過 ResourceLoader 等待 MediaWiki 就緒，
然後載入 `app/main.ts`。main 檢查主名字空間與閱讀操作、
注入一次 CSS，並註冊 `wikipage.content` 掛鉤。
`window.reviewToolLite` 防止重複載入建立第二份介面或事件處理。

`app/article-controller.ts` 協調工具選單、批註列表、原文圖示與批註模式。
內容掛鉤觸發時會更新目前條目節點與互動。
`platform/browser/dom/article-selection.ts` 處理拖曳及整句選取；
`article-text.ts` 與 `annotation-anchor.ts` 負責章節及文字範圍定位；
`sentence-wrapping.ts` 建立與移除句子包裝。

停用模式或替換條目內容時，釋放選取與註腳事件、計時器、浮動按鈕及句子包裝。
建立批註時記錄可用的文字定位資訊，恢復時先解析全部範圍，再插入原文圖示，
避免圖示切分文字節點影響後續定位。

## 批註與儲存

`domain/annotations.ts` 定義批註與儲存資料，驗證外部輸入。
`platform/browser/storage.ts` 讀寫瀏覽器資料及處理 sessionStorage 遷移。
`app/annotations.ts` 實作新增、修改、刪除、清除、復原與匯入等操作。
儲存成功後才更新相應介面；失敗會拋出或回報錯誤。

匯入先驗證全部批註，再按 ID 合併到指定條目。
清除將空列表與復原副本一起保存；復原保留清除後新增的批註。
儲存鍵及舊版 JSON 格式是相容性邊界，詳見[儲存與備份](storage.md)。

## 對話框與複製

`platform/mediawiki/dialog.ts` 透過 ResourceLoader 載入 Vue 與 Codex，
註冊使用的元件，管理掛載、替換、轉場與卸載。
編輯器被替換時必須結束仍在等待的操作，避免後續結果重新開啟舊介面。
元件卸載時清理輸入法事件與相對時間更新計時器。
非同步檔案讀取完成後，確認原對話框仍開啟再套用結果。

`app/copy-review.ts` 取得顯示版本的時間，使用
`domain/writing-review.ts` 產生維基語法，交由 `platform/clipboard.ts` 複製。
只有成功複製才記錄已附加工具說明，並允許「複製並前往」跳轉。
複製與評審頁導覽不執行任何維基寫入請求。

## 建置與閱讀路徑

從 `app/browser.ts`、`app/main.ts` 與 `app/article-controller.ts`
開始閱讀一個完整操作，再讀對應的 domain 規則、platform 介面與測試。
Vue 與 CSS 的建置外掛位於 `scripts/`。
正式產物保留網站提供的 Vue 與 Codex，不嵌入第二份執行階段。
`platform/mediawiki/vue-runtime.ts` 私有保存載入結果；不讀寫全域 `window.Vue`。
IME 與 Escape 處理只作用於本工具對話框中的輸入欄位。

修改邊界或生命週期時，依[貢獻指南](../CONTRIBUTING.md)執行驗證，
並以離線固定資料覆蓋實際使用行為。
