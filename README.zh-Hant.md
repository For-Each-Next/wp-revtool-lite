# ReviewToolLite

[English](README.md) · [繁體中文](README.zh-Hant.md) · [简体中文](README.zh-Hans.md)

ReviewToolLite 協助你逐句評審中文維基百科條目。選取原文、儲存私人批註，
再將意見整理成維基語法，貼到討論頁或評審頁。

<!-- toc:start -->

## 目錄

- [功能](#功能)
- [安裝](#安裝)
- [使用方式](#使用方式)
  - [資料保存](#資料保存)
- [截圖](#截圖)
- [協助](#協助)
- [授權](#授權)

<!-- toc:end -->

## 功能

- 選取文字或點選整句新增批註，從原文旁的圖示重新編輯意見。
- 檢視相關註腳，複製來源、註腳與存檔連結。
- 依條目位置或時間整理批註，複製附條目版本永久連結的評審文字。
- 匯出、匯入 JSON 備份，並復原最近一次清除。

## 安裝

選擇一種安裝方式；以下連結均指向本專案最新的發行檔案。

| 方式           | 最新檔案                                                                                                                   | 使用方式                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Tampermonkey   | [ReviewToolLite.user.js](https://github.com/For-Each-Next/wp-revtool-lite/releases/download/latest/ReviewToolLite.user.js) | 使用 Tampermonkey 開啟連結並安裝。       |
| 個人維基指令碼 | [bundled.min.js](https://github.com/For-Each-Next/wp-revtool-lite/releases/download/latest/bundled.min.js)                 | 將下載的壓縮程式貼入個人 `common.js`。   |
| 可閱讀程式     | [bundled.js](https://github.com/For-Each-Next/wp-revtool-lite/releases/download/latest/bundled.js)                         | 閱讀程式碼，或貼到瀏覽器主控台單次執行。 |

個人維基安裝方式：開啟下載的 `bundled.min.js`，將完整內容貼入中文維基百科的個人 `common.js`，再儲存頁面。

請使用目前版本的瀏覽器。本工具只在中文維基百科條目的閱讀頁面啟用；
複製操作需要剪貼簿權限。使用者指令碼包含可閱讀程式碼與 Tampermonkey 安裝標頭。

如要移除，請停用或解除安裝 Tampermonkey 中的 ReviewToolLite，或刪除 `common.js` 中的程式碼，再重新載入頁面。若也要清除瀏覽器資料，請先匯出批註備份。

## 使用方式

1. 開啟條目，在頁面工具選單選擇「啟用批註模式」。
2. 點選句子或選取文字，再按「批註」。
3. 輸入意見，按「新增」。
4. 開啟「查看批註」，編輯、備份或複製評審文字。
5. 將文字貼到目的頁面，核對後自行提交。

介面依你的中文語言變體顯示。來源連結、輸入捷徑、排序與評審目的地的
詳細操作見[使用說明](docs/usage.md)。

### 資料保存

批註僅保存在此網站、此瀏覽器中。清除瀏覽器資料或換用瀏覽器前，請先匯出 JSON 備份。
匯入會把批註合併到目前條目。「清除全部」可復原一次；刪除單則批註無法復原。
儲存與複製操作不會提交維基編輯。

詳見[儲存與備份](docs/storage.md)。

## 截圖

![ReviewToolLite 顯示 BanG Dream! 條目的批註](docs/images/annotation-viewer.png)

畫面取材自 [BanG Dream! 少女樂團派對第 94028176 號修訂](https://zh.wikipedia.org/w/index.php?oldid=94028176)，
在離線頁面中搭配示範評語。詳見[截圖來源與重製方法](docs/screenshots.md)。

## 協助

查看[疑難排解](docs/troubleshooting.md)、[適用頁面](docs/configuration.md)、
[變更紀錄](CHANGELOG.md)，或[回報問題](https://github.com/For-Each-Next/wp-revtool-lite/issues)。
開發資訊見[貢獻指南](CONTRIBUTING.md)。

## 授權

本工具源自 [SuperGrey 開發的 ReviewTool](https://zh.wikipedia.org/wiki/User:SuperGrey/gadgets/ReviewTool)，
保留 Quinn Gao 的著作權聲明與 [MIT 授權](LICENSE)。
條目摘錄另依 [CC BY-SA 4.0 授權標示來源](docs/screenshots.md)。
