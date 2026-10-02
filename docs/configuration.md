# 設定與執行環境

ReviewToolLite 目前沒有需要預先設定的全域選項。
從頁面工具選單啟用或停用批註模式，從批註列表選擇排序方式即可。
批註模式與列表排序屬於目前頁面的操作狀態；批註內容另行保存在瀏覽器中。

<!-- toc:start -->

## Contents

- [網站與頁面](#網站與頁面)
- [MediaWiki 提供的執行環境](#mediawiki-提供的執行環境)
- [瀏覽器](#瀏覽器)
- [安裝檔案](#安裝檔案)

<!-- toc:end -->

## 網站與頁面

工具以中文維基百科的條目頁為使用環境。
只在主名字空間（名字空間編號 `0`）且操作為 `view` 的閱讀頁面啟用。
來源編輯與預覽頁面不會建立批註控制項或修改編輯欄位。
討論頁及評審頁是複製後的目的地，不會開啟批註介面。

使用者指令碼涵蓋 `https://zh.wikipedia.org/*` 與
`https://zh.m.wikipedia.org/*`，但仍需符合上述頁面條件。
頁面選單、條目文字與註腳的解析依賴 MediaWiki 產生的結構，
其他網站或自訂外觀可能需要調整。

## MediaWiki 提供的執行環境

啟動程式透過 ResourceLoader 等待 MediaWiki 就緒，
再載入 `mediawiki.util`。介面使用 MediaWiki 提供的 Vue 與
Wikimedia Codex；不把另一份 Vue 或 Codex 執行階段放入發行檔。
中文文字依 `wgUserVariant` 與 `wgUserLanguage` 選擇繁簡變體。
不需要額外的語言轉換小工具。

打開批註列表時會載入 `mediawiki.Title`，用來取得對應討論頁。
複製評審文字時會載入 `mediawiki.api`，以唯讀請求取得顯示版本的時間。
相關模組或網路請求失敗時，請依[疑難排解](troubleshooting.md)檢查。

## 瀏覽器

使用目前穩定版瀏覽器與 HTTPS。批註 ID 使用 `crypto.randomUUID()`，
複製使用 Clipboard API；無權限時顯示錯誤，讓你檢查權限後重試。
不再支援已淘汰的瀏覽器、`execCommand` 剪貼簿或舊建置入口。
瀏覽器資料與 JSON 備份仍保持相容，以保護已儲存的意見。

## 安裝檔案

| 檔案                          | 用途                                                   |
| ----------------------------- | ------------------------------------------------------ |
| `dist/bundled.js`             | 可閱讀的完整程式，可貼入主控台或供小工具載入。         |
| `dist/bundled.min.js`         | 同功能的壓縮程式，適合常駐載入。                       |
| `dist/ReviewToolLite.user.js` | 含安裝中繼資料及頁面環境轉接程式的可閱讀使用者指令碼。 |

發行檔另附 `manifest.json`，記錄版本、檔案大小與 SHA-256，
以及完整 MIT 授權的 `LICENSE.txt`。
CSS 隨程式打包，在啟用工具的頁面注入。
版本以 `package.json` 為準，建置時寫入各安裝檔案。
自訂使用者指令碼管理器或網站小工具時，請保留發行檔的授權及原作者聲明。
