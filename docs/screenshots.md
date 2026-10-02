# Screenshot source and reproduction

<!-- toc:start -->

## Contents

- [Source and attribution](#source-and-attribution)
- [Reproduce](#reproduce)
- [Browser verification](#browser-verification)
- [Image inventory](#image-inventory)

<!-- toc:end -->

## Source and attribution

The four screenshots in `docs/images/` show the actual built ReviewToolLite interface
on selected lead paragraphs from **BanG Dream! 少女樂團派對**. The full pinned source is
[tests/fixtures/bang-dream.wikitext](../tests/fixtures/bang-dream.wikitext); its metadata
is [bang-dream.source.json](../tests/fixtures/bang-dream.source.json).

- Source: [Chinese Wikipedia, revision 94028176](https://zh.wikipedia.org/w/index.php?oldid=94028176).
- Revision date: 24 August 2026, 13:46:37 UTC.
- Attribution: [the article's Wikipedia contributors](https://zh.wikipedia.org/w/index.php?title=BanG%20Dream!%20%E5%B0%91%E5%A5%B3%E6%A8%82%E5%9C%98%E6%B4%BE%E5%B0%8D&action=history).
- Article text license: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Adaptations: selected paragraphs are converted into plain article text for the fixture; templates and wiki links are simplified. The local page layout, reviewer name, and feedback are illustrative.

The local fixture simulates MediaWiki configuration, ResourceLoader, notifications,
clipboard access, and the read-only revision timestamp response. It does not load
or edit a live wiki. Article-text licensing is separate from the project's MIT code license.

## Reproduce

Use the project Node.js version and install its locked dependencies and Chromium:

```sh
npm ci
npx playwright install chromium
npm run screenshots
```

On a Linux runner, install system browser dependencies with
`npx playwright install --with-deps chromium`.

The script builds the production distribution and runs Chromium at 1280 × 960 and
390 × 844 pixels. It opens annotation mode, selects an article sentence, adds a
comment, opens the list, copies feedback, and checks cleanup after disabling the mode.
It fixes the clock at 2 October 2026, 08:30 UTC and waits for dialog transitions before capturing the editor and list at both sizes.

## Browser verification

`npm run test:ui` runs these interactions without changing screenshots. The same
checks are included in `npm run verify`. Assertions cover saved feedback, the pinned
revision link, read-only API use, an unrelated Vue global remaining unchanged, and
removal of sentence wrappers and floating controls after disabling annotation mode.

## Image inventory

| Image                          | Viewport   | Interface                                          |
| ------------------------------ | ---------- | -------------------------------------------------- |
| `annotation-editor.png`        | 1280 × 960 | Article sentence and comment editor.               |
| `annotation-editor-mobile.png` | 390 × 844  | Stacked primary and cancel actions.                |
| `annotation-viewer.png`        | 1280 × 960 | Saved feedback, sorting, backup, and copy actions. |
| `annotation-viewer-mobile.png` | 390 × 844  | Responsive annotation list and footer.             |
