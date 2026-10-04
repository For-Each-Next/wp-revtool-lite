# 變更紀錄

<!-- toc:start -->

## Contents

- [Unreleased](#unreleased)
- [1.2.2 — 2026-10-04](#122--2026-10-04)
- [1.2.1 — 2026-10-03](#121--2026-10-03)
- [1.2.0 — 2026-09-25](#120--2026-09-25)

<!-- toc:end -->

## Unreleased

No unreleased changes.

## 1.2.2 — 2026-10-04

- Restore native MediaWiki menu links with `mw.util.addPortletLink` and keep Codex layout
  guidance scoped to gadget dialogs and forms.

## 1.2.1 — 2026-10-03

- Align source layers, user documentation, and installation headers across the project.
- Use native action buttons, private Vue runtime state, and Chinese interface selection without additional gadgets.
- Restrict startup to article view pages; remove obsolete clipboard/UUID fallbacks and build entry points while preserving stored data and backups.
- Recreate desktop and mobile screenshots from the pinned BanG Dream! article, with an offline browser regression workflow.

- 使用者指令碼中繼資料區塊只保留 Tampermonkey 參數，原作與修改者聲明移至區塊之後。
- 將啟動與條目操作、純資料規則、瀏覽器與 MediaWiki 整合分別整理至
  `app`、`domain` 與 `platform`，並提供不啟動介面的純操作匯出。
- 防止同頁重複載入建立額外的介面或事件；依網站使用者語言選擇中文變體。
- 統一來源與測試檔名，啟用嚴格 TypeScript 檢查；修正事件與空值型別，
  並驗證純操作可在沒有瀏覽器與 MediaWiki 的環境載入。
- 對話框沿用網站主題色彩，改善原文與批註卡片間距、空列表提示及批註總數。
  改用可由鍵盤操作的來源複製按鈕，為輸入欄位關聯提示與錯誤，
  並調整窄視窗的操作順序，使鍵盤順序與畫面一致。
- 批註列表顯示操作進度與可重試的錯誤提示，避免等待時執行衝突修改；
  關閉列表後不再執行尚未完成的「複製並前往」跳轉。
- 將建置工具拆分至 `scripts/`，移除舊建置入口；同時產生可閱讀程式、
  壓縮程式與可閱讀使用者指令碼，移除建置時間與本機路徑造成的產物差異。
- 發行檔加入完整 MIT 授權，附上檔案大小與 SHA-256 清單。
  新增共同驗證指令，串連程式檢查、離線測試、建置及發行檔檢查；
  CI 比較重建結果，標籤發行檢查套件版本並使用對應的變更紀錄。
- 精簡 README，新增使用、執行環境、儲存與備份、疑難排解、
  架構與貢獻說明，附上桌面與行動版介面畫面；
  變更紀錄統一使用 `CHANGELOG.md`。

## 1.2.0 — 2026-09-25

本版整理批註模式的程式結構，移除未使用的章節模式、樣式及輔助程式，
並修正停用模式、頁面內容更新、滑鼠拖曳及章節定位的處理。
儲存失敗時會回報錯誤；既有批註及 JSON 備份仍可使用。

- 將條目控制程式拆分為文字選取、文字與章節定位、句子包裝等獨立模組。
- 移除未使用的章節模式狀態、徽章樣式、逐句事件處理程式與中繼資料、輔助介面，
  以及多餘的 `@vue/runtime-dom` 直接相依套件。
- 停用批註模式或 MediaWiki 替換條目內容時，清理選取事件監聽器、計時器、游標狀態及浮動按鈕。
  直接處理已呈現的條目內容，移除可能在停用後繼續執行的延遲句子包裝重試。
- 修正滑鼠拖曳選取後的點擊處理，避免誤觸整句選取，並保留註腳連結的正常導覽行為。
- 修正章節路徑判定，避免將較早同層章節下的子章節誤列為目前章節的上層。
- 新增、編輯或刪除批註時，若儲存失敗，會回報錯誤，避免介面誤顯示為操作成功。
  同時確保修改寫入指定條目，並拒絕日期無效的備份資料。
- 統一處理對話框替換時的清理作業；編輯器對話框被替換時，結束仍在等待結果的非同步操作。
- Vue 元件標記或範本運算式無效時，立即中止建置；啟用 TypeScript 對未使用區域變數及參數的檢查。
- 新增條目互動、儲存失敗、對話框替換及 Vue 編譯的迴歸測試；
  編輯器畫面測試改用正式建置所使用的 Vue 編譯外掛。

既有批註的儲存鍵名稱與 JSON 備份欄位保持相容，包括復原紀錄及舊版批註中繼資料。
兩種發行檔案的版本號均更新為 `1.2.0`。
