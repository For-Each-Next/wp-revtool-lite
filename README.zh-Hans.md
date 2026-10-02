# ReviewToolLite

[English](README.md) · [繁體中文](README.zh-Hant.md) · [简体中文](README.zh-Hans.md)

ReviewToolLite 帮助你逐句评审中文维基百科条目。选取原文、保存私人批注，
再将意见整理成维基语法，粘贴到讨论页或评审页。

<!-- toc:start -->

## 目录

- [功能](#功能)
- [安装](#安装)
- [使用方式](#使用方式)
  - [数据保存](#数据保存)
- [截图](#截图)
- [帮助](#帮助)
- [许可](#许可)

<!-- toc:end -->

## 功能

- 选取文本或点击整句添加批注，从原文旁的图标重新编辑意见。
- 查看相关脚注，复制来源、脚注与存档链接。
- 按条目位置或时间整理批注，复制附有条目版本永久链接的评审文本。
- 导出、导入 JSON 备份，并撤销最近一次清除。

## 安装

选择一种安装方式；以下链接均指向本项目最新的发布文件。

| 方式         | 最新文件                                                                                                                   | 使用方式                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Tampermonkey | [ReviewToolLite.user.js](https://github.com/For-Each-Next/wp-revtool-lite/releases/download/latest/ReviewToolLite.user.js) | 使用 Tampermonkey 打开链接并安装。       |
| 个人维基脚本 | [bundled.min.js](https://github.com/For-Each-Next/wp-revtool-lite/releases/download/latest/bundled.min.js)                 | 将下载的压缩程序粘贴到个人 `common.js`。 |
| 可读程序     | [bundled.js](https://github.com/For-Each-Next/wp-revtool-lite/releases/download/latest/bundled.js)                         | 阅读代码，或粘贴到浏览器控制台单次执行。 |

个人维基安装方式：打开下载的 `bundled.min.js`，将完整内容粘贴到中文维基百科的个人 `common.js`，然后保存页面。

请使用当前版本的浏览器。本工具只在中文维基百科条目的阅读页面启用；
复制操作需要剪贴板权限。用户脚本包含可读代码与 Tampermonkey 安装头部。

如需移除，请停用或卸载 Tampermonkey 中的 ReviewToolLite，或删除 `common.js` 中的代码，然后重新加载页面。如果还要清除浏览器数据，请先导出批注备份。

## 使用方式

1. 打开条目，在页面工具菜单选择「开启批注模式」。
2. 点击句子或选取文本，然后点击「批注」。
3. 输入意见，点击「新增」。
4. 打开「查看批注」，编辑、备份或复制评审文本。
5. 将文本粘贴到目标页面，核对后自行提交。

界面按你的中文语言变体显示。来源链接、输入快捷方式、排序与评审目标页面的
详细操作见[使用说明](docs/usage.md)。

### 数据保存

批注仅保存在此网站、此浏览器中。清除浏览器数据或换用浏览器前，请先导出 JSON 备份。
导入会把批注合并到当前条目。「清除全部」可撤销一次；删除单条批注无法撤销。
保存与复制操作不会提交维基编辑。

详见[存储与备份](docs/storage.md)。

## 截图

![ReviewToolLite 显示 BanG Dream! 条目的批注](docs/images/annotation-viewer.png)

画面取材自 [BanG Dream! 少女樂團派對第 94028176 号修订](https://zh.wikipedia.org/w/index.php?oldid=94028176)，
在离线页面中搭配示范评语。详见[截图来源与重制方法](docs/screenshots.md)。

## 帮助

查看[故障排除](docs/troubleshooting.md)、[适用页面](docs/configuration.md)、
[变更记录](CHANGELOG.md)，或[反馈问题](https://github.com/For-Each-Next/wp-revtool-lite/issues)。
开发信息见[贡献指南](CONTRIBUTING.md)。

## 许可

本工具源自 [SuperGrey 开发的 ReviewTool](https://zh.wikipedia.org/wiki/User:SuperGrey/gadgets/ReviewTool)，
保留 Quinn Gao 的版权声明与 [MIT 许可](LICENSE)。
条目摘录另按 [CC BY-SA 4.0 许可标注来源](docs/screenshots.md)。
