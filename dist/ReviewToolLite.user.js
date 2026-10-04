// ==UserScript==
// @name         ReviewToolLite
// @namespace    https://github.com/For-Each-Next/wp-revtool-lite
// @version      1.2.2
// @description  Annotate Chinese Wikipedia articles and copy review feedback as wikitext.
// @author       Quinn Gao (QZGao / SuperGrey) https://zh.wikipedia.org/wiki/User:SuperGrey
// @license      MIT
// @homepageURL  https://github.com/For-Each-Next/wp-revtool-lite
// @supportURL   https://github.com/For-Each-Next/wp-revtool-lite/issues
// @downloadURL  https://github.com/For-Each-Next/wp-revtool-lite/releases/download/latest/ReviewToolLite.user.js
// @updateURL    https://github.com/For-Each-Next/wp-revtool-lite/releases/download/latest/ReviewToolLite.user.js
// @match        https://zh.wikipedia.org/*
// @match        https://zh.m.wikipedia.org/*
// @run-at       document-end
// @grant        none
// @noframes
// ==/UserScript==
// <nowiki>
/**
 * ReviewToolLite
 *
 * Purpose: Review articles and provide feedback on Chinese Wikipedia.
 *
 * @name reviewtool
 * @version 1.2.2
 * @license MIT
 *
 * Table of contents:
 * 1. Metadata and license notices
 * 2. MediaWiki bootstrap and browser program
 */
// ReviewToolLite (based on [[User:SuperGrey/gadgets/ReviewTool]])
// Original project: https://github.com/QZGao/ReviewTool
// Modifications: For-Each-Next, with AI assistance
// Repository: https://github.com/For-Each-Next/wp-revtool-lite
// Release: 1.2.2
// License: MIT
/*!
 * MIT License
 *
 * Copyright (c) 2025 Quinn Gao
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
(() => {
  function reviewToolApplication() {
    var __defProp = Object.defineProperty;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __esm = (fn, res, err) => function __init() {
      if (err) throw err[0];
      try {
        return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
      } catch (e) {
        throw err = [e], e;
      }
    };
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    function translateVariants(variants, language) {
      return /^zh-(?:hans|cn|sg|my)$/i.test(language || "") ? variants.hans : variants.hant;
    }
    var init_language = __esm({
      "src/i18n/language.ts"() {
        "use strict";
      }
    });
    var State, context_default;
    var init_context = __esm({
      "src/platform/mediawiki/context.ts"() {
        "use strict";
        init_language();
        State = class {
          convByVar = (variants) => translateVariants(
            variants,
            mw.config.get("wgUserVariant") || mw.config.get("wgUserLanguage")
          );
          // 當前條目標題
          articleTitle = "";
          // 用戶名
          get userName() {
            return mw.config.get("wgUserName") || "Example";
          }
        };
        context_default = new State();
      }
    });
    var styles_default;
    var init_styles = __esm({
      "src/features/annotations/components/styles.css"() {
        "use strict";
        styles_default = `/**
 * @file src/features/annotations/components/styles.css
 * Purpose: src / features / annotations / styles module.
 *
 * Table of contents:
 * 1. Styles and responsive rules
 */

.review-tool-dialog {
    /* Wrap prose and long URLs without hiding any of the annotation. */
    overflow-wrap: anywhere;
    color: var(--color-base, #202122);
    line-height: 1.6;
}

.review-tool-dialog .cdx-button,
.review-tool-dialog .cdx-menu-button {
    max-inline-size: 100%;
}

.review-tool-dialog .cdx-menu-button,
.review-tool-dialog .cdx-text-area,
.review-tool-dialog .cdx-select-vue__handle {
    /* Codex form controls otherwise have a 256px minimum width. */
    min-inline-size: 0;
}

.review-tool-dialog .cdx-menu-button > .cdx-button {
    inline-size: 100%;
}

/* Keep controls one line high; the full label remains in their text and title. */
.review-tool-control-label {
    display: block;
    min-inline-size: 0;
    max-inline-size: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.review-tool-dialog .review-tool-form-section:not(:first-child) {
    margin-block-start: var(--spacing-100, 16px);
}

.review-tool-dialog textarea {
    min-height: 32px;
    max-height: 160px;
    resize: vertical;
}

/* Annotation controls */
.review-tool-annotation-ui.floating-button {
    position: absolute;
    transform: translate(-50%, -100%);
    z-index: 300;
    pointer-events: auto;
    background: var(--background-color-progressive, #36c);
    color: #fff;
    border: none;
    padding: 6px 8px;
    border-radius: var(--border-radius-base, 2px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    font-size: 13px;
    line-height: 1.2;
    white-space: nowrap;
}

.review-tool-annotation-ui.floating-button:hover {
    background: var(--background-color-progressive--hover, #447ff5);
}

.review-tool-annotation-ui.floating-button:focus-visible,
.review-tool-global-button:focus-visible,
.review-tool-inline-annotation__icon:focus-visible,
.review-tool-reference-menu button:focus-visible,
.review-tool-reference-tip button:focus-visible {
    outline: 2px solid var(--color-progressive, #36c);
    outline-offset: 2px;
}

.review-tool-reference-tip {
    margin-inline-start: 0.25em;
    color: var(--color-subtle, #54595d);
    font-size: 0.75em;
    vertical-align: super;
    white-space: nowrap;
    user-select: none;
}

.review-tool-reference-tip button {
    appearance: none;
    padding: 0 0.15em;
    border: 0;
    background: transparent;
    color: var(--color-progressive, #36c);
    font: inherit;
    cursor: pointer;
}

.review-tool-reference-tip button:hover,
.review-tool-reference-tip button:focus-visible {
    text-decoration: underline;
}

.review-tool-reference-tip .review-tool-reference-trigger {
    padding: 1px 5px;
    border: 1px solid var(--border-color-base, #a2a9b1);
    border-radius: 2px;
    background: var(--background-color-base, #fff);
    color: var(--color-base, #202122);
}

.review-tool-reference-tip .review-tool-reference-trigger:hover {
    background: var(--background-color-interactive, #eaecf0);
    text-decoration: none;
}

.review-tool-reference-menu {
    position: fixed;
    z-index: 300;
    display: flex;
    flex-direction: column;
    min-width: 10em;
    max-width: calc(100vw - 8px);
    max-height: calc(100vh - 8px);
    overflow: auto;
    box-sizing: border-box;
    padding: 4px;
    border: 1px solid var(--border-color-base, #a2a9b1);
    border-radius: 4px;
    background: var(--background-color-base, #fff);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    font-size: 14px;
    line-height: 1.5;
    white-space: normal;
}

.review-tool-reference-menu button {
    padding: 6px 12px;
    text-align: start;
    color: var(--color-base, #202122);
}

.review-tool-reference-menu button:hover,
.review-tool-reference-menu button:focus-visible {
    background: var(--background-color-interactive, #eaecf0);
    text-decoration: none;
}

.review-tool-reference-menu button:disabled {
    color: var(--color-disabled, #72777d);
    cursor: default;
}

.review-tool-reference-tip[hidden],
.review-tool-reference-tip [hidden] {
    display: none;
}

.review-tool-undo-clear {
    margin-inline-start: 8px;
    cursor: pointer;
}

.review-tool-global-button {
    display: none;
    position: fixed;
    inset-block-end: 20px;
    inset-inline-end: 20px;
    z-index: 300;
    padding: 10px 16px;
    background: var(--background-color-progressive, #36c);
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.review-tool-global-button:hover {
    background: var(--background-color-progressive--hover, #447ff5);
}

.review-tool-annotation-mode .review-tool-global-button {
    display: block;
}

.review-tool-inline-annotation {
    display: none;
    align-items: center;
    margin-inline-start: 4px;
    vertical-align: baseline;
    gap: 2px;
}

.review-tool-annotation-mode .review-tool-inline-annotation {
    display: inline-flex;
}

.review-tool-inline-annotation__icon {
    background: var(--background-color-warning-subtle, #fff7d1);
    border: 1px solid var(--border-color-warning, #f5c400);
    border-radius: 999px;
    color: var(--color-base, #202122);
    cursor: pointer;
    font-size: 11px;
    line-height: 1.3;
    padding: 0 6px;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 16px;
}

.review-tool-inline-annotation__icon:hover {
    background: var(--background-color-warning, #ffe58f);
}

.review-tool-annotation-editor__label {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-base, #202122);
    margin-block-end: 4px;
}

.review-tool-annotation-editor__section {
    font-size: 14px;
    color: var(--color-base, #202122);
}

.review-tool-annotation-editor__quote {
    background: var(--background-color-neutral-subtle, #f8f9fa);
    border-inline-start: 3px solid var(--border-color-base, #a2a9b1);
    padding: 12px;
    white-space: pre-wrap;
    max-height: 160px;
    overflow-y: auto;
}

.review-tool-annotation-editor__quote:focus-visible {
    outline: 2px solid var(--color-progressive, #36c);
    outline-offset: 2px;
}

.review-tool-annotation-editor__error {
    margin-block-start: 8px;
}

.review-tool-annotation-editor__hint,
.review-tool-annotation-viewer__summary,
.review-tool-annotation-viewer__empty p {
    color: var(--color-subtle, #54595d);
    font-size: 14px;
    margin-block: 8px 0;
}

.review-tool-annotation-editor__quick-input {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-75, 12px);
    margin-block-end: 8px;
}

.review-tool-annotation-editor__footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-75, 12px);
    padding-block-start: 12px;
    border-block-start: 1px solid var(--border-color-subtle, #c8ccd1);
}

.review-tool-annotation-editor__sources-hint {
    margin: 4px 0;
    font-size: 12px;
    color: var(--color-subtle, #54595d);
}

.review-tool-annotation-editor__sources {
    margin: 0;
    padding-inline-start: 24px;
    max-height: 200px;
    overflow-y: auto;
}

.review-tool-annotation-editor__sources li {
    margin-bottom: 8px;
}

.review-tool-annotation-editor__sources a {
    overflow-wrap: anywhere;
}

.review-tool-source-copy {
    margin-inline-start: 12px;
    white-space: nowrap;
}

.review-tool-annotation-editor__sources code {
    display: block;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    user-select: text;
}

.review-tool-annotation-editor__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-75, 12px);
    margin-inline-start: auto;
}

.review-tool-annotation-viewer__empty {
    text-align: center;
    color: var(--color-base, #202122);
    padding-block: 32px;
}

.review-tool-annotation-viewer__empty strong {
    display: block;
    font-size: 18px;
}

.review-tool-annotation-viewer__feedback {
    margin-block-end: 16px;
}

.review-tool-annotation-viewer__progress {
    margin-block-start: 8px;
}

.review-tool-annotation-viewer__footer {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-75, 12px);
    padding-block-start: 12px;
    border-block-start: 1px solid var(--border-color-subtle, #c8ccd1);
}

.review-tool-annotation-viewer__footer-left {
    display: flex;
    align-items: center;
}

.review-tool-annotation-viewer__maintenance {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-75, 12px);
}

.review-tool-annotation-viewer__sort-select {
    inline-size: 220px;
    max-inline-size: 100%;
    min-inline-size: 0;
}

.review-tool-annotation-viewer__footer-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--spacing-75, 12px);
    flex-wrap: wrap;
}

.review-tool-annotation-viewer__footer-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-75, 12px);
    justify-content: flex-end;
    margin-inline-start: auto;
    flex-wrap: wrap;
}

.review-tool-annotation-editor__footer,
.review-tool-annotation-editor__actions,
.review-tool-annotation-viewer__footer,
.review-tool-annotation-viewer__footer-left,
.review-tool-annotation-viewer__footer-controls,
.review-tool-annotation-viewer__footer-actions {
    min-inline-size: 0;
    max-inline-size: 100%;
}

@media (max-width: 480px) {
    .review-tool-annotation-viewer__footer-controls,
    .review-tool-annotation-viewer__footer-actions,
    .review-tool-annotation-editor__footer,
    .review-tool-annotation-editor__actions {
        /* Components put primary actions first in DOM and keyboard order. */
        flex-direction: column;
        align-items: stretch;
    }

    .review-tool-annotation-viewer__footer-actions,
    .review-tool-annotation-editor__actions {
        margin-inline-start: 0;
    }

    .review-tool-annotation-viewer__sort-select {
        inline-size: 100%;
    }
}

@media (max-width: 480px) and (max-height: 480px) {
    /* Leave room for the content when a landscape screen or keyboard reduces height. */
    .review-tool-annotation-viewer__footer-controls,
    .review-tool-annotation-viewer__footer-actions,
    .review-tool-annotation-editor__footer,
    .review-tool-annotation-editor__actions {
        flex-direction: row;
        align-items: center;
    }

    .review-tool-annotation-viewer__footer-actions,
    .review-tool-annotation-editor__actions {
        margin-inline-start: auto;
    }
}

.review-tool-annotation-viewer__section {
    margin-block-end: 24px;
}

.review-tool-annotation-viewer__times {
    margin: 0 0 16px;
    font-size: 13px;
    color: var(--color-subtle, #54595d);
}

.review-tool-annotation-viewer__times > div {
    display: flex;
    flex-wrap: wrap;
    column-gap: 8px;
    margin-bottom: 4px;
}

.review-tool-annotation-viewer__times dt {
    font-weight: 600;
}

.review-tool-annotation-viewer__times dd {
    margin: 0;
}

.review-tool-annotation-viewer__section-title {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 6px;
}

.review-tool-annotation-viewer__items {
    list-style: none;
    padding: 0;
    margin: 0;
}

.review-tool-annotation-viewer__item {
    border: 1px solid var(--border-color-subtle, #c8ccd1);
    border-radius: var(--border-radius-base, 2px);
    padding: 12px;
    margin-block-end: 12px;
    background: var(--background-color-base, #fff);
}

.review-tool-annotation-viewer__quote {
    border-inline-start: 3px solid var(--border-color-subtle, #c8ccd1);
    padding-inline-start: 12px;
    color: var(--color-subtle, #54595d);
}

.review-tool-annotation-viewer__opinion {
    margin-block-start: 8px;
}

.review-tool-annotation-viewer__quote,
.review-tool-annotation-viewer__opinion {
    white-space: pre-wrap;
}

.review-tool-annotation-viewer__meta {
    font-size: 12px;
    color: var(--color-subtle, #54595d);
    margin-block-start: 8px;
}

.review-tool-annotation-viewer__actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-75, 12px);
    margin-block-start: 8px;
}

/* Sentence selection and hover states. */
.review-tool-annotation-ui.sentence {
    background: transparent;
    transition: background 120ms ease-in;
    cursor: pointer;
    pointer-events: auto;
}

.review-tool-annotation-ui.sentence:hover {
    background: var(
        --background-color-warning-subtle,
        rgba(255, 235, 59, 0.22)
    ) !important;
}

@media (prefers-reduced-motion: reduce) {
    .review-tool-annotation-ui.sentence {
        transition: none;
    }
}

html.rt-selecting .review-tool-annotation-ui.sentence {
    cursor: text;
}

/* While annotation mode is active, allow selection over known inline editor widgets
   that set \`user-select: none\`. This only applies
   while our mode is on to avoid changing page behavior permanently. */
.review-tool-annotation-mode .ipe__in-article-link,
.review-tool-annotation-mode .ipe-quick-edit,
.review-tool-annotation-mode .ipe-quick-edit--create-only,
.review-tool-annotation-mode .qeec-ref-tag-copy-btn {
    user-select: text !important;
    pointer-events: auto !important;
}
`;
      }
    });
    function addPortletTrigger(portletId, label, onClick) {
      let item = document.getElementById(portletId);
      if (!item) {
        for (const target of ["p-cactions", "p-tb"]) {
          item = mw.util.addPortletLink(target, "#", label, portletId, label);
          if (item) break;
        }
      }
      if (!item) return;
      const link = item.querySelector("a");
      if (!link) return;
      const text = document.createTreeWalker(link, NodeFilter.SHOW_TEXT).nextNode();
      if (text) text.nodeValue = label;
      else link.appendChild(document.createTextNode(label));
      link.title = label;
      link.onclick = (event) => {
        event.preventDefault();
        onClick();
      };
    }
    var init_portlet = __esm({
      "src/platform/mediawiki/portlet.ts"() {
        "use strict";
      }
    });
    function createEmptyStore(pageName) {
      return {
        pageName,
        createdAt: Date.now(),
        annotations: []
      };
    }
    function isRecord(value) {
      return value !== null && typeof value === "object" && !Array.isArray(value);
    }
    function normalizeAnnotation(anno) {
      if (!isRecord(anno)) return null;
      if (typeof anno.id !== "string" || !anno.id.trim()) return null;
      if (typeof anno.sectionPath !== "string") return null;
      if (typeof anno.sentenceText !== "string") return null;
      if (typeof anno.opinion !== "string") return null;
      if (typeof anno.createdBy !== "string") return null;
      if (typeof anno.createdAt !== "number" || !Number.isFinite(new Date(anno.createdAt).getTime()))
        return null;
      const sentencePos = typeof anno.sentencePos === "string" ? anno.sentencePos : "";
      const resolved = typeof anno.resolved === "boolean" ? anno.resolved : void 0;
      const anchor = isRecord(anno.textAnchor) ? anno.textAnchor : null;
      const textAnchor = anchor && typeof anchor.start === "number" && Number.isInteger(anchor.start) && anchor.start >= 0 && typeof anchor.end === "number" && Number.isInteger(anchor.end) && anchor.end > anchor.start && typeof anchor.quote === "string" && anchor.quote.length === anchor.end - anchor.start ? { start: anchor.start, end: anchor.end, quote: anchor.quote } : void 0;
      return {
        id: anno.id,
        sectionPath: anno.sectionPath,
        sentencePos,
        sentenceText: anno.sentenceText,
        opinion: anno.opinion,
        createdBy: anno.createdBy,
        createdAt: anno.createdAt,
        updatedAt: typeof anno.updatedAt === "number" && Number.isFinite(new Date(anno.updatedAt).getTime()) && anno.updatedAt >= anno.createdAt ? anno.updatedAt : void 0,
        resolved,
        textAnchor
      };
    }
    var init_annotations = __esm({
      "src/domain/annotations.ts"() {
        "use strict";
      }
    });
    function compareOrderKeys(a, b) {
      if (!a && !b) return 0;
      if (!a) return -1;
      if (!b) return 1;
      const partsA = a.split(".").map((part) => Number.parseInt(part, 10));
      const partsB = b.split(".").map((part) => Number.parseInt(part, 10));
      const len = Math.min(partsA.length, partsB.length);
      for (let i = 0; i < len; i++) {
        if (partsA[i] !== partsB[i]) {
          return partsA[i] - partsB[i];
        }
      }
      return partsA.length - partsB.length;
    }
    var init_order_key = __esm({
      "src/domain/order-key.ts"() {
        "use strict";
      }
    });
    function groupAnnotations(annotations) {
      const buckets = /* @__PURE__ */ new Map();
      for (const annotation of annotations) {
        const sectionPath = annotation.sectionPath.trim();
        const bucket = buckets.get(sectionPath);
        if (bucket) bucket.push(annotation);
        else buckets.set(sectionPath, [annotation]);
      }
      return Array.from(buckets, ([sectionPath, entries]) => ({
        sectionPath,
        annotations: entries
      }));
    }
    function sortGroupsByPosition(groups) {
      return groups.filter(({ annotations }) => annotations.length).map((group) => ({
        ...group,
        annotations: [...group.annotations].sort(
          (a, b) => compareOrderKeys(a.sentencePos, b.sentencePos) || a.createdAt - b.createdAt
        )
      })).sort(
        (a, b) => compareOrderKeys(
          a.annotations[0].sentencePos,
          b.annotations[0].sentencePos
        ) || a.sectionPath.localeCompare(b.sectionPath)
      );
    }
    function groupAnnotationsByTime(annotations, order) {
      const direction = order === "asc" ? 1 : -1;
      const sorted = [...annotations].sort(
        (a, b) => direction * (a.createdAt - b.createdAt)
      );
      const groups = [];
      for (const annotation of sorted) {
        const sectionPath = annotation.sectionPath.trim();
        const previous = groups[groups.length - 1];
        if (previous?.sectionPath === sectionPath)
          previous.annotations.push(annotation);
        else groups.push({ sectionPath, annotations: [annotation] });
      }
      return groups;
    }
    var init_annotation_order = __esm({
      "src/domain/annotation-order.ts"() {
        "use strict";
        init_order_key();
      }
    });
    function storageKeyForPage(pageName) {
      return `${KEY_PREFIX}${pageName || "unknown"}`;
    }
    function getStorage(type) {
      if (typeof window === "undefined") return null;
      try {
        return type === "local" ? window.localStorage : window.sessionStorage;
      } catch (e) {
        console.error(`[ReviewTool] ${type}Storage unavailable`, e);
        return null;
      }
    }
    function loadAnnotations(pageName) {
      const key = storageKeyForPage(pageName);
      const localStore = getStorage("local");
      const sessionStore = getStorage("session");
      let raw = null;
      let source = null;
      if (localStore) {
        try {
          raw = localStore.getItem(key);
          if (raw) source = "local";
        } catch (e) {
          console.error(
            "[ReviewTool] failed to read annotations from localStorage",
            e
          );
        }
      }
      if (!raw && sessionStore) {
        try {
          raw = sessionStore.getItem(key);
          if (raw) source = "session";
        } catch (e) {
          console.error(
            "[ReviewTool] failed to read annotations from sessionStorage",
            e
          );
        }
      }
      if (!raw) {
        return createEmptyStore(pageName);
      }
      let parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.warn("[ReviewTool] failed to parse annotations payload", e);
        return createEmptyStore(pageName);
      }
      const parsedRecord = isRecord(parsed) ? parsed : null;
      const parsedAnnotations = parsedRecord && Array.isArray(parsedRecord.annotations) ? parsedRecord.annotations : [];
      const annotations = parsedAnnotations.map(normalizeAnnotation).filter((anno) => !!anno);
      const normalized = {
        pageName,
        createdAt: typeof parsedRecord?.createdAt === "number" && Number.isFinite(new Date(parsedRecord.createdAt).getTime()) ? parsedRecord.createdAt : Date.now(),
        annotations,
        clearedAnnotations: Array.isArray(parsedRecord?.clearedAnnotations) ? parsedRecord.clearedAnnotations.map(normalizeAnnotation).filter((anno) => !!anno) : void 0
      };
      if (source === "session" && localStore) {
        try {
          localStore.setItem(key, JSON.stringify(normalized));
          sessionStore?.removeItem(key);
        } catch (e) {
          console.error(
            "[ReviewTool] failed to migrate annotations from sessionStorage to localStorage",
            e
          );
        }
      }
      return normalized;
    }
    function saveAnnotations(store) {
      const key = storageKeyForPage(store.pageName);
      const payload = JSON.stringify(store);
      const localStore = getStorage("local");
      if (localStore) {
        try {
          localStore.setItem(key, payload);
          return true;
        } catch (e) {
          console.error(
            "[ReviewTool] failed to save annotations to localStorage",
            e
          );
        }
      }
      const sessionStore = getStorage("session");
      if (sessionStore) {
        try {
          sessionStore.setItem(key, payload);
          localStore?.removeItem(key);
          return true;
        } catch (e) {
          console.error(
            "[ReviewTool] failed to save annotations to sessionStorage fallback",
            e
          );
        }
      } else {
        console.error("[ReviewTool] no available storage to save annotations");
      }
      return false;
    }
    var KEY_PREFIX;
    var init_storage = __esm({
      "src/platform/browser/storage.ts"() {
        "use strict";
        init_annotations();
        KEY_PREFIX = "reviewtool:annotations:";
      }
    });
    function importAnnotations(pageName, json) {
      const payload = JSON.parse(json.replace(/^\uFEFF/, ""));
      if (!isRecord(payload)) throw new Error("Invalid annotation backup");
      let entries;
      if (Array.isArray(payload.groups)) {
        entries = [];
        for (const group of payload.groups) {
          if (!isRecord(group) || !Array.isArray(group.annotations)) {
            throw new Error("Invalid annotation group");
          }
          for (const entry of group.annotations)
            entries.push(entry);
        }
      } else if (Array.isArray(payload.annotations)) {
        entries = payload.annotations;
      } else {
        throw new Error("Missing annotations in backup");
      }
      const annotations = entries.map((entry) => {
        const annotation = normalizeAnnotation(entry);
        if (!annotation) {
          throw new Error("Invalid annotation in backup");
        }
        return annotation;
      });
      const store = loadAnnotations(pageName);
      const ids = new Set(store.annotations.map((annotation) => annotation.id));
      let imported = 0;
      for (const annotation of annotations) {
        if (ids.has(annotation.id)) continue;
        ids.add(annotation.id);
        store.annotations.push(annotation);
        imported++;
      }
      if (imported && !saveAnnotations({ ...store, pageName })) {
        throw new Error("Unable to save imported annotations");
      }
      return imported;
    }
    function createAnnotation(pageName, sectionPath, sentenceText, opinion, sentencePos = "", textAnchor) {
      const store = loadAnnotations(pageName);
      const normalizedSectionPath = sectionPath === "目次" ? "序言" : sectionPath;
      const anno = {
        id: crypto.randomUUID(),
        sectionPath: normalizedSectionPath,
        sentencePos,
        sentenceText,
        opinion,
        createdBy: context_default.userName || "unknown",
        createdAt: Date.now(),
        resolved: false,
        textAnchor
      };
      store.annotations.push(anno);
      if (!saveAnnotations(store)) throw new Error("Unable to save annotation");
      return anno;
    }
    function getAnnotation(pageName, id) {
      const store = loadAnnotations(pageName);
      return store.annotations.find((a) => a.id === id) || null;
    }
    function updateAnnotation(pageName, id, updates) {
      const store = loadAnnotations(pageName);
      const idx = store.annotations.findIndex((a) => a.id === id);
      if (idx === -1) return null;
      const updated = {
        ...store.annotations[idx],
        ...updates,
        updatedAt: Date.now()
      };
      store.annotations[idx] = updated;
      if (!saveAnnotations(store)) throw new Error("Unable to update annotation");
      return updated;
    }
    function deleteAnnotation(pageName, id) {
      const store = loadAnnotations(pageName);
      const before = store.annotations.length;
      store.annotations = store.annotations.filter((a) => a.id !== id);
      if (store.annotations.length !== before) {
        if (!saveAnnotations(store))
          throw new Error("Unable to delete annotation");
        return true;
      }
      return false;
    }
    function clearAnnotations(pageName) {
      const store = loadAnnotations(pageName);
      if (!store.annotations.length) return false;
      if (!saveAnnotations({
        ...store,
        pageName,
        annotations: [],
        clearedAnnotations: store.annotations
      })) {
        throw new Error("Unable to clear annotations");
      }
      return true;
    }
    function canUndoClearAnnotations(pageName) {
      return Boolean(loadAnnotations(pageName).clearedAnnotations?.length);
    }
    function undoClearAnnotations(pageName) {
      const store = loadAnnotations(pageName);
      if (!store.clearedAnnotations?.length) return 0;
      const ids = new Set(store.annotations.map((annotation) => annotation.id));
      const restored = store.clearedAnnotations.filter((annotation) => {
        if (ids.has(annotation.id)) return false;
        ids.add(annotation.id);
        return true;
      });
      if (!saveAnnotations({
        ...store,
        pageName,
        annotations: [...store.annotations, ...restored],
        clearedAnnotations: void 0
      })) {
        throw new Error("Unable to restore cleared annotations");
      }
      return restored.length;
    }
    function sortAnnotationsByTimestamp(list) {
      return [...list].sort((a, b) => a.createdAt - b.createdAt);
    }
    function buildAnnotationGroups(pageName) {
      const store = loadAnnotations(pageName);
      if (!store.annotations.length) {
        return [];
      }
      const groups = groupAnnotations(store.annotations).map((group) => ({
        ...group,
        annotations: sortAnnotationsByTimestamp(group.annotations)
      }));
      groups.sort((a, b) => {
        const aTs = a.annotations[0]?.createdAt ?? Number.MAX_SAFE_INTEGER;
        const bTs = b.annotations[0]?.createdAt ?? Number.MAX_SAFE_INTEGER;
        if (aTs === bTs) {
          return a.sectionPath.localeCompare(b.sectionPath);
        }
        return aTs - bTs;
      });
      return groups;
    }
    var init_annotations2 = __esm({
      "src/app/annotations.ts"() {
        "use strict";
        init_annotations();
        init_annotation_order();
        init_storage();
        init_context();
        init_storage();
      }
    });
    function isValidTimestamp(value) {
      return Number.isFinite(value) && Number.isFinite(new Date(value).getTime());
    }
    function getAnnotationTimeRange(annotations) {
      let first = Infinity;
      let last = -Infinity;
      for (const annotation of annotations) {
        if (!isValidTimestamp(annotation.createdAt)) continue;
        first = Math.min(first, annotation.createdAt);
        const updatedAt = annotation.updatedAt ?? annotation.createdAt;
        last = Math.max(
          last,
          annotation.createdAt,
          isValidTimestamp(updatedAt) ? updatedAt : annotation.createdAt
        );
      }
      return Number.isFinite(first) ? { first, last } : null;
    }
    function formatAnnotationTimestamp(timestamp, now = Date.now(), translate = (variants) => variants.hant) {
      if (!isValidTimestamp(timestamp)) return "";
      const date = new Date(timestamp);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const absolute = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${hours}:${minutes}`;
      const elapsedMinutes = Math.floor(Math.abs(now - timestamp) / 6e4);
      let relative = translate({ hant: "剛剛", hans: "刚刚" });
      if (elapsedMinutes >= 1) {
        const amount = elapsedMinutes >= 1440 ? Math.floor(elapsedMinutes / 1440) : elapsedMinutes >= 60 ? Math.floor(elapsedMinutes / 60) : elapsedMinutes;
        const unit = elapsedMinutes >= 1440 ? "日" : elapsedMinutes >= 60 ? translate({ hant: "小時", hans: "小时" }) : translate({ hant: "分鐘", hans: "分钟" });
        const direction = now >= timestamp ? "前" : translate({ hant: "後", hans: "后" });
        relative = `${amount}${unit}${direction}`;
      }
      return `${absolute} [${relative}]`;
    }
    var init_annotation_time = __esm({
      "src/domain/annotation-time.ts"() {
        "use strict";
      }
    });
    function setVueRuntime(value) {
      runtime = value;
    }
    function getVueRuntime() {
      if (!runtime) throw new Error("The MediaWiki Vue runtime is not loaded.");
      return runtime;
    }
    var runtime;
    var init_vue_runtime = __esm({
      "src/platform/mediawiki/vue-runtime.ts"() {
        "use strict";
        runtime = null;
      }
    });
    function isEditableEventTarget(target) {
      if (!target || !(target instanceof HTMLElement)) return false;
      if (!target.closest(".review-tool-dialog")) return false;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return !target.disabled && !target.readOnly;
      }
      return target.isContentEditable;
    }
    function onCompositionStart(event) {
      if (!isEditableEventTarget(event.target)) return;
      if (imeResetTimer !== null) {
        window.clearTimeout(imeResetTimer);
        imeResetTimer = null;
      }
      isImeComposing = true;
      lastCompositionAt = Date.now();
    }
    function onCompositionEnd(event) {
      if (!isEditableEventTarget(event.target)) return;
      lastCompositionAt = Date.now();
      if (imeResetTimer !== null) {
        window.clearTimeout(imeResetTimer);
      }
      imeResetTimer = window.setTimeout(() => {
        isImeComposing = false;
        imeResetTimer = null;
      }, 80);
    }
    function onCompositionInput(event) {
      if (!(event instanceof InputEvent)) return;
      if (!isEditableEventTarget(event.target)) return;
      const inputType = typeof event.inputType === "string" ? event.inputType : "";
      if (event.isComposing || inputType.startsWith("insertComposition")) {
        lastCompositionAt = Date.now();
        isImeComposing = true;
      }
    }
    function isCompositionLikelyActive() {
      if (isImeComposing) return true;
      return Date.now() - lastCompositionAt <= 500;
    }
    function onEscapeKey(event) {
      if (event.key !== "Escape") return;
      const editableTarget = isEditableEventTarget(event.target) || isEditableEventTarget(document.activeElement);
      if (editableTarget && (event.isComposing || isCompositionLikelyActive())) {
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
      }
    }
    function onDialogCancel(event) {
      const target = event.target;
      if (!target || target.tagName !== "DIALOG") return;
      if (!isCompositionLikelyActive()) return;
      if (!isEditableEventTarget(document.activeElement)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
    }
    function installImeEscGuard() {
      if (imeListenersInstalled) return;
      window.addEventListener("compositionstart", onCompositionStart, true);
      window.addEventListener("compositionend", onCompositionEnd, true);
      window.addEventListener("beforeinput", onCompositionInput, true);
      window.addEventListener("input", onCompositionInput, true);
      window.addEventListener("keydown", onEscapeKey, true);
      window.addEventListener("keyup", onEscapeKey, true);
      window.addEventListener("cancel", onDialogCancel, true);
      imeListenersInstalled = true;
    }
    function removeImeEscGuard() {
      if (!imeListenersInstalled) return;
      window.removeEventListener("compositionstart", onCompositionStart, true);
      window.removeEventListener("compositionend", onCompositionEnd, true);
      window.removeEventListener("beforeinput", onCompositionInput, true);
      window.removeEventListener("input", onCompositionInput, true);
      window.removeEventListener("keydown", onEscapeKey, true);
      window.removeEventListener("keyup", onEscapeKey, true);
      window.removeEventListener("cancel", onDialogCancel, true);
      if (imeResetTimer !== null) {
        window.clearTimeout(imeResetTimer);
        imeResetTimer = null;
      }
      imeListenersInstalled = false;
      isImeComposing = false;
      lastCompositionAt = 0;
    }
    async function loadCodexAndVue() {
      const requireModule = await mw.loader.using("@wikimedia/codex");
      const Vue = requireModule("vue");
      const Codex = requireModule("@wikimedia/codex");
      setVueRuntime(Vue);
      return { Vue, Codex };
    }
    function createDialogMountIfNeeded() {
      const existing = document.getElementById(MOUNT_ID);
      if (existing) return existing;
      const mountPoint = document.createElement("div");
      mountPoint.id = MOUNT_ID;
      document.body.appendChild(mountPoint);
      return mountPoint;
    }
    function mountApp(app) {
      if (mountedApp) removeDialogMount();
      const mountPoint = createDialogMountIfNeeded();
      installImeEscGuard();
      mountedApp = app;
      return app.mount(mountPoint);
    }
    function removeDialogMount() {
      const app = mountedApp;
      mountedApp = null;
      app?.unmount();
      document.getElementById(MOUNT_ID)?.remove();
      removeImeEscGuard();
    }
    function closeDialogAfterTransition(onClosed) {
      const app = mountedApp;
      if (!app) return;
      window.setTimeout(() => {
        if (mountedApp !== app) return;
        removeDialogMount();
        onClosed?.();
      }, CLOSE_DELAY_MS);
    }
    function registerCodexComponents(app, Codex) {
      const components = {
        "cdx-dialog": Codex.CdxDialog,
        "cdx-text-area": Codex.CdxTextArea,
        "cdx-field": Codex.CdxField,
        "cdx-select": Codex.CdxSelect,
        "cdx-button": Codex.CdxButton,
        "cdx-menu-button": Codex.CdxMenuButton,
        "cdx-message": Codex.CdxMessage,
        "cdx-progress-bar": Codex.CdxProgressBar
      };
      for (const [name, component] of Object.entries(components)) {
        if (component) app.component(name, component);
      }
    }
    var mountedApp, imeListenersInstalled, isImeComposing, imeResetTimer, lastCompositionAt, MOUNT_ID, CLOSE_DELAY_MS;
    var init_dialog = __esm({
      "src/platform/mediawiki/dialog.ts"() {
        "use strict";
        init_vue_runtime();
        mountedApp = null;
        imeListenersInstalled = false;
        isImeComposing = false;
        imeResetTimer = null;
        lastCompositionAt = 0;
        MOUNT_ID = "review-tool-dialog-mount";
        CLOSE_DELAY_MS = 200;
      }
    });
    async function openConfirmationDialog(options) {
      const { Vue, Codex } = await loadCodexAndVue();
      if (!Codex.CdxDialog) throw new Error("Codex dialog is unavailable");
      return new Promise((resolve) => {
        const app = Vue.createMwApp({
          setup() {
            const open = Vue.ref(true);
            let settled = false;
            const settle = (confirmed) => {
              if (settled) return;
              settled = true;
              resolve(confirmed);
            };
            const close = (confirmed) => {
              if (settled) return;
              open.value = false;
              closeDialogAfterTransition();
              settle(confirmed);
            };
            Vue.onUnmounted(() => settle(false));
            return () => Vue.h(
              Codex.CdxDialog,
              {
                open: open.value,
                title: options.title,
                useCloseButton: true,
                primaryAction: {
                  label: options.confirmLabel,
                  actionType: "default"
                },
                defaultAction: { label: options.cancelLabel },
                class: "review-tool-dialog",
                onPrimary: () => close(true),
                onDefault: () => close(false),
                "onUpdate:open": (value) => {
                  if (!value) close(false);
                }
              },
              {
                default: () => [
                  Vue.h("p", options.message),
                  ...options.detail ? [Vue.h("p", options.detail)] : []
                ]
              }
            );
          }
        });
        mountApp(app);
      });
    }
    var init_confirmation = __esm({
      "src/features/annotations/confirmation.ts"() {
        "use strict";
        init_dialog();
      }
    });
    async function confirmClearOnFirstActivation(pageName, clear) {
      if (activatedPages.has(pageName)) return;
      activatedPages.add(pageName);
      const { annotations } = loadAnnotations(pageName);
      if (!annotations.length) return;
      const timeRange = getAnnotationTimeRange(annotations);
      const lastEdited = timeRange ? formatAnnotationTimestamp(timeRange.last, Date.now(), context_default.convByVar) : "";
      const confirmed = await openConfirmationDialog({
        title: context_default.convByVar({ hant: "開始新的評審", hans: "开始新的评审" }),
        message: context_default.convByVar({
          hant: "要清除本頁已有的批註，開始新的評審嗎？清除後可在批註列表按「復原清除」。按「取消」保留現有批註。",
          hans: "要清除本页已有的批注，开始新的评审吗？清除后可在批注列表按“撤销清除”。按“取消”保留现有批注。"
        }),
        detail: timeRange ? context_default.convByVar({
          hant: `最後修改時間：${lastEdited}`,
          hans: `最后修改时间：${lastEdited}`
        }) : void 0,
        confirmLabel: context_default.convByVar({ hant: "清除批註", hans: "清除批注" }),
        cancelLabel: context_default.convByVar({ hant: "取消", hans: "取消" })
      });
      if (confirmed) clear();
    }
    var activatedPages;
    var init_annotation_session = __esm({
      "src/app/annotation-session.ts"() {
        "use strict";
        init_annotations2();
        init_annotation_time();
        init_confirmation();
        init_context();
        activatedPages = /* @__PURE__ */ new Set();
      }
    });
    async function copyText(text) {
      await navigator.clipboard.writeText(text);
    }
    var init_clipboard = __esm({
      "src/platform/browser/clipboard.ts"() {
        "use strict";
      }
    });
    function buildFootnotePermalink(revisionId, footnoteId, label) {
      if (!validRevision(revisionId) || !/^cite_ref-.+/.test(footnoteId) || !label.trim())
        return null;
      return `[[Special:Permalink/${revisionId}#${escapeWikitext(footnoteId)}|${escapeWikitext(label.trim())}]]`;
    }
    function localFragment(link) {
      try {
        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || url.search && url.search !== window.location.search)
          return null;
        return decodeURIComponent(url.hash.slice(1));
      } catch {
        return null;
      }
    }
    function citationLink(marker) {
      return Array.from(marker.querySelectorAll("a[href]")).find(
        (link) => localFragment(link)?.startsWith("cite_note-")
      ) ?? null;
    }
    function isLocator(marker) {
      return marker.tagName === "SUP" && marker.matches(".reference") && marker.matches(".nowrap") && !marker.id.startsWith("cite_ref-") && !citationLink(marker);
    }
    function footnoteLabel(root, link, marker, citation) {
      const label = (link.innerText ?? link.textContent ?? "").trim().replace(/^\[\s*|\s*\]$/g, "");
      if (!/^\d+(?:\.\d+)*$/.test(label)) return label;
      let occurrences = Array.from(
        new Set(
          Array.from(citation.querySelectorAll("a[href]")).filter(
            (backlink) => backlink.closest(
              '.mw-cite-backlink, [rel~="mw:referencedBy"]'
            )
          ).map(localFragment).filter((id) => id?.startsWith("cite_ref-"))
        )
      );
      if (occurrences.length < 2 || !occurrences.includes(marker.id)) {
        occurrences = Array.from(
          new Set(
            Array.from(root.querySelectorAll(REFERENCE_MARKER_SELECTOR)).filter((item) => {
              const anchor = citationLink(item);
              return item.id.startsWith("cite_ref-") && anchor && localFragment(anchor) === citation.id;
            }).map((item) => item.id)
          )
        );
      }
      const index = occurrences.indexOf(marker.id);
      if (occurrences.length < 2 || index < 0) return label;
      let suffix = "";
      for (let number = index + 1; number > 0; number = Math.floor((number - 1) / 26)) {
        suffix = String.fromCharCode(97 + (number - 1) % 26) + suffix;
      }
      return label + suffix;
    }
    function webUrl(href) {
      try {
        const url = new URL(href, window.location.href);
        return /^https?:$/.test(url.protocol) ? url : null;
      } catch {
        return null;
      }
    }
    function archiveUrl(url) {
      return /(^|\.)(?:web\.archive\.org|archive\.(?:today|is|ph|vn|md|fo|li)|webcitation\.org|perma\.cc)$/.test(
        url.hostname
      );
    }
    function externalLink(url, label) {
      const href = url.href.replace(
        /[\s<>[\]{}|]/g,
        (character) => encodeURIComponent(character)
      );
      return `[${href} ${escapeWikitext(label)}]`;
    }
    function archiveMonth(text, url) {
      const numericDate = text.match(/存[檔档]\s*[於于]\s*(\d{4})(?:-|年\s*)(\d{1,2})/) ?? text.match(
        /archived(?:\s+from\s+the\s+original)?(?:\s*\([^)]*\))?\s+on\s+(\d{4})-(\d{1,2})/i
      );
      const englishDate = text.match(
        /archived(?:\s+from\s+the\s+original)?(?:\s*\([^)]*\))?\s+on\s+(?:\d{1,2}\s+)?([a-z]+)\.?\s+(?:\d{1,2},?\s+)?(\d{4})/i
      );
      const timestamp = url.pathname.match(
        /^\/(?:web\/)?(\d{4})(\d{2})\d{2}\d*(?:[a-z_]+)?\//
      );
      const dates = [
        numericDate && [Number(numericDate[1]), Number(numericDate[2])],
        englishDate && [
          Number(englishDate[2]),
          [
            "jan",
            "feb",
            "mar",
            "apr",
            "may",
            "jun",
            "jul",
            "aug",
            "sep",
            "oct",
            "nov",
            "dec"
          ].indexOf(englishDate[1].slice(0, 3).toLowerCase()) + 1
        ],
        timestamp && [Number(timestamp[1]), Number(timestamp[2])]
      ];
      const date = dates.find(
        (value) => value && value[0] > 0 && value[1] >= 1 && value[1] <= 12
      );
      return date ? `${date[0]}年${date[1]}月` : null;
    }
    function citationDetails(reference, format) {
      const content = reference.querySelector(
        ".reference-text, .mw-reference-text"
      ) ?? reference;
      const citation = content.querySelector(".citation") ?? content.querySelector("cite") ?? content;
      const links = Array.from(
        citation.querySelectorAll("a[href]")
      ).flatMap((link) => {
        if (!link.matches(".external") && !link.getAttribute("rel")?.split(/\s+/).includes("mw:ExtLink"))
          return [];
        if (link.closest(
          '.mw-cite-backlink, .cs1-maint, .cs1-visible-error, .mw-editsection, button, [role="button"], [role="menu"], [role="tooltip"], [data-gadget], [data-widget]'
        ) || link.matches(".extiw"))
          return [];
        const url = webUrl(link.href);
        return url && url.origin !== window.location.origin ? [{ link, url }] : [];
      });
      const archive = links.find(({ url }) => archiveUrl(url));
      const original = links.find(
        ({ link, url }) => !archiveUrl(url) && /^(?:原始(?:內容|内容|文獻|文献)|the original|original)(?:\s|$)/i.test(
          (link.textContent ?? "").trim()
        )
      ) ?? links.find(({ url }) => !archiveUrl(url));
      const embeddedOriginal = archive?.url.href.match(/\/(https?:\/\/.+)$/)?.[1];
      const source = original?.url ?? (embeddedOriginal ? webUrl(embeddedOriginal) : null);
      const details = [];
      if (source)
        details.push(
          externalLink(source, source.hostname.replace(/^www\./, ""))
        );
      if (archive) {
        const text = citation.innerText ?? citation.textContent ?? "";
        const archiveDate = archiveMonth(text, archive.url);
        const archiveLabel = format === "comment" ? `${archiveDate ?? ""}存` : context_default.convByVar({
          hant: archiveDate ? `存檔於${archiveDate}` : "存檔",
          hans: archiveDate ? `存档于${archiveDate}` : "存档"
        });
        details.push(externalLink(archive.url, archiveLabel));
      }
      const titleLink = [original, archive].find(
        (item) => item && !/^(?:原始(?:內容|内容|文獻|文献)|存[檔档]|the original|original|archived?)(?:\s|$)/i.test(
          (item.link.textContent ?? "").trim()
        )
      ) ?? original ?? archive;
      const title = (titleLink?.link.textContent || citation.textContent || "").replace(/\s+/g, " ").trim();
      const wikitext = !details.length ? "" : format === "comment" ? `<small>（${details.join("，")}）</small>` : ` <small>(${details.join(", ")})</small>`;
      return {
        wikitext,
        title,
        url: titleLink?.url.href ?? source?.href ?? null
      };
    }
    function getReferenceLinkData(root, marker, format = "footnote") {
      const link = citationLink(marker);
      const referenceId = link ? localFragment(link) : null;
      const target = referenceId ? document.getElementById(referenceId) : null;
      const revisionId = mw.config.get("wgRevisionId");
      if (!validRevision(revisionId) || !link || !referenceId || !/^cite_note-.+/.test(referenceId) || !root.contains(marker) || !target || !root.contains(target))
        return null;
      const label = footnoteLabel(root, link, marker, target);
      const footnote = buildFootnotePermalink(
        revisionId,
        marker.id,
        format === "comment" ? `Ref. ${label}` : label
      );
      const details = citationDetails(target, format);
      return {
        footnote: footnote ? footnote + details.wikitext : null,
        label,
        title: details.title || context_default.convByVar({ hant: `註腳 ${label}`, hans: `脚注 ${label}` }),
        url: details.url ?? new URL(`#${encodeURIComponent(referenceId)}`, window.location.href).href
      };
    }
    function installReferenceLinkTips(root) {
      const tip = document.createElement("span");
      tip.className = "review-tool-reference-tip";
      tip.hidden = true;
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "review-tool-reference-trigger";
      trigger.textContent = context_default.convByVar({ hant: "複製 ▾", hans: "复制 ▾" });
      trigger.title = context_default.convByVar({ hant: "複製", hans: "复制" });
      trigger.setAttribute("aria-haspopup", "menu");
      trigger.setAttribute("aria-expanded", "false");
      const menu = document.createElement("span");
      menu.className = "review-tool-reference-menu";
      menu.setAttribute("role", "menu");
      menu.setAttribute(
        "aria-label",
        context_default.convByVar({ hant: "註腳複製選單", hans: "脚注复制菜单" })
      );
      menu.hidden = true;
      let actionButtons = [];
      const makeAction = (label, text) => {
        const action = document.createElement("button");
        action.type = "button";
        action.textContent = label;
        action.setAttribute("role", "menuitem");
        action.tabIndex = -1;
        action.disabled = !text;
        action.title = text ?? "";
        action.onclick = (event) => copy(event, text);
        menu.appendChild(action);
        actionButtons.push(action);
      };
      tip.append(trigger, menu);
      let activeLink = null;
      let activeMarkers = [];
      const closeMenu = (restoreFocus = false) => {
        menu.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        if (restoreFocus) trigger.focus();
      };
      const hide = () => {
        closeMenu();
        tip.hidden = true;
        activeLink = null;
        activeMarkers = [];
        menu.replaceChildren();
        actionButtons = [];
      };
      const linkData = (link) => {
        const marker = link.closest(REFERENCE_MARKER_SELECTOR);
        return marker && citationLink(marker) === link ? getReferenceLinkData(root, marker) : null;
      };
      const adjacentMarker = (marker, direction) => {
        let node = marker;
        while (node) {
          while (!node[direction] && node.parentElement?.matches(".sentence"))
            node = node.parentElement;
          node = node[direction];
          while (node instanceof Element && node.matches(".sentence") && node.firstChild) {
            node = direction === "nextSibling" ? node.firstChild : node.lastChild;
          }
          if (!node) return null;
          if (node === tip || node.nodeType === Node.COMMENT_NODE || node.nodeType === Node.TEXT_NODE && !node.textContent?.trim() || node instanceof Element && node.matches(".sentence") && !node.firstChild)
            continue;
          return node instanceof Element && root.contains(node) && node.matches(REFERENCE_MARKER_SELECTOR) ? node : null;
        }
        return null;
      };
      const show = (event) => {
        if (!(event.target instanceof Element)) return;
        const link = event.target.closest("a[href]");
        const marker = link?.closest(REFERENCE_MARKER_SELECTOR);
        if (!link || !marker || !root.contains(link) || isLocator(marker))
          return;
        const data = linkData(link);
        if (!data) {
          hide();
          return;
        }
        const markers = [marker];
        let sibling = marker;
        while (sibling = adjacentMarker(sibling, "previousSibling"))
          markers.unshift(sibling);
        sibling = marker;
        while (sibling = adjacentMarker(sibling, "nextSibling"))
          markers.push(sibling);
        activeLink = link;
        if (!menu.hidden && markers.length === activeMarkers.length && markers.every((item, index) => item === activeMarkers[index]))
          return;
        const references = markers.filter((item) => !isLocator(item)).map((item) => {
          const anchor = citationLink(item);
          return anchor ? linkData(anchor) : null;
        });
        closeMenu();
        activeMarkers = markers;
        menu.replaceChildren();
        actionButtons = [];
        for (const reference of references) {
          if (!reference) continue;
          makeAction(
            context_default.convByVar({
              hant: `複製${reference.label}`,
              hans: `复制${reference.label}`
            }),
            reference.footnote
          );
        }
        const links = references.map((reference) => reference?.footnote);
        if (links.length > 1 && links.every(Boolean)) {
          makeAction(
            context_default.convByVar({ hant: "複製本組", hans: "复制本组" }),
            links.join(", ")
          );
        }
        trigger.setAttribute(
          "aria-label",
          references.length > 1 ? context_default.convByVar({
            hant: "複製本組",
            hans: "复制本组"
          }) : context_default.convByVar({
            hant: `複製${data.label}`,
            hans: `复制${data.label}`
          })
        );
        const lastMarker = markers[markers.length - 1];
        if (lastMarker.nextSibling !== tip) lastMarker.after(tip);
        tip.hidden = false;
      };
      const actions = () => actionButtons.filter((button) => !button.disabled);
      const positionMenu = () => {
        if (menu.hidden) return;
        const anchor = trigger.getBoundingClientRect();
        const bounds = menu.getBoundingClientRect();
        const gap = 4;
        const maxLeft = Math.max(gap, window.innerWidth - bounds.width - gap);
        const maxTop = Math.max(gap, window.innerHeight - bounds.height - gap);
        const previews = Array.from(
          document.querySelectorAll(".rt-tooltip, .mwe-popups")
        ).map((preview) => preview.getBoundingClientRect()).filter((rect) => rect.width && rect.height);
        const candidates = [
          { left: anchor.left, top: anchor.bottom + gap },
          { left: anchor.left, top: anchor.top - bounds.height - gap },
          ...previews.flatMap((rect) => [
            { left: rect.right + gap, top: anchor.bottom + gap },
            {
              left: rect.left - bounds.width - gap,
              top: anchor.bottom + gap
            },
            { left: anchor.left, top: rect.bottom + gap },
            { left: anchor.left, top: rect.top - bounds.height - gap }
          ])
        ].map((point) => ({
          left: Math.max(gap, Math.min(point.left, maxLeft)),
          top: Math.max(gap, Math.min(point.top, maxTop))
        }));
        const position = candidates.find(
          (point) => previews.every(
            (rect) => point.left + bounds.width <= rect.left || point.left >= rect.right || point.top + bounds.height <= rect.top || point.top >= rect.bottom
          )
        ) ?? candidates[0];
        menu.style.left = `${position.left}px`;
        menu.style.top = `${position.top}px`;
      };
      const openMenu = (last = false) => {
        menu.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
        positionMenu();
        const buttons = actions();
        buttons[last ? buttons.length - 1 : 0]?.focus();
      };
      trigger.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (menu.hidden) openMenu();
        else closeMenu(true);
      };
      trigger.onkeydown = (event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        event.stopPropagation();
        openMenu(event.key === "ArrowUp");
      };
      menu.onkeydown = (event) => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        event.stopPropagation();
        const buttons = actions();
        const current = buttons.indexOf(
          document.activeElement
        );
        const index = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
        buttons[index]?.focus();
      };
      const onKeyDown = (event) => {
        if (event.key === "Tab" && !menu.hidden) closeMenu(true);
        if (event.key !== "Escape" || tip.hidden) return;
        if (!menu.hidden) {
          closeMenu(true);
        } else {
          if (tip.contains(document.activeElement)) activeLink?.focus();
          hide();
        }
      };
      const onOutsidePointer = (event) => {
        if (!(event.target instanceof Node) || !tip.contains(event.target))
          closeMenu();
      };
      const onFocusOut = (event) => {
        if (!(event.relatedTarget instanceof Node) || !tip.contains(event.relatedTarget))
          closeMenu();
      };
      tip.onclick = (event) => event.stopPropagation();
      tip.addEventListener("focusout", onFocusOut);
      const copy = (event, text) => {
        event.preventDefault();
        event.stopPropagation();
        if (!text) return;
        closeMenu(true);
        void copyText(text).then(() => {
          mw.notify(
            context_default.convByVar({
              hant: "已複製永久連結。",
              hans: "已复制永久链接。"
            }),
            { tag: "review-tool-reference" }
          );
        }).catch((error) => {
          console.error(
            "[ReviewTool] Failed to copy reference link",
            error
          );
          mw.notify(
            context_default.convByVar({
              hant: "無法複製連結，請檢查剪貼簿權限後重試。",
              hans: "无法复制链接，请检查剪贴板权限后重试。"
            }),
            {
              type: "error",
              tag: "review-tool-reference"
            }
          );
        });
      };
      root.addEventListener("mouseover", show, { capture: true });
      root.addEventListener("focusin", show, { capture: true });
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("pointerdown", onOutsidePointer);
      window.addEventListener("scroll", positionMenu, { capture: true });
      window.addEventListener("resize", positionMenu);
      return () => {
        hide();
        root.removeEventListener("mouseover", show, { capture: true });
        root.removeEventListener("focusin", show, { capture: true });
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("pointerdown", onOutsidePointer);
        window.removeEventListener("scroll", positionMenu, { capture: true });
        window.removeEventListener("resize", positionMenu);
        tip.removeEventListener("focusout", onFocusOut);
        tip.remove();
      };
    }
    var REFERENCE_MARKER_SELECTOR, REFERENCE_CONTROLS_SELECTOR, escapeWikitext, validRevision;
    var init_reference_links = __esm({
      "src/platform/browser/dom/reference-links.ts"() {
        "use strict";
        init_clipboard();
        init_context();
        REFERENCE_MARKER_SELECTOR = ".reference, .mw-ref";
        REFERENCE_CONTROLS_SELECTOR = ".review-tool-reference-tip";
        escapeWikitext = (text) => text.replace(
          /[&<>[\]{}|\r\n]/g,
          (character) => `&#${character.charCodeAt(0)};`
        );
        validRevision = (revisionId) => Number.isSafeInteger(revisionId) && revisionId > 0;
      }
    });
    function buildArticleTextIndex(root) {
      const segments = [];
      let text = "";
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node2) => node2.parentElement?.closest(EXCLUDED_TEXT) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
      });
      let node;
      while (node = walker.nextNode()) {
        const value = node.data;
        const offsets = [];
        const characters = value.replace(/\s/g, "");
        if (!characters) continue;
        for (let i = 0; i < value.length; i++) {
          if (!/\s/.test(value[i])) offsets.push(i);
        }
        segments.push({ node, start: text.length, offsets });
        text += characters;
      }
      return { text, segments };
    }
    function captureAnnotationAnchor(index, range) {
      let start;
      let end = 0;
      for (const { node, start: segmentStart, offsets } of index.segments) {
        if (!range.intersectsNode(node)) continue;
        for (const [characterIndex, offset] of offsets.entries()) {
          if (range.comparePoint(node, offset) < 0) continue;
          if (range.comparePoint(node, offset + 1) > 0) break;
          if (start === void 0) start = segmentStart + characterIndex;
          end = segmentStart + characterIndex + 1;
        }
      }
      return start === void 0 ? void 0 : { start, end, quote: index.text.slice(start, end) };
    }
    function rangeAt(index, start, end) {
      const first = index.segments.find(
        (segment) => start >= segment.start && start < segment.start + segment.offsets.length
      );
      const last = index.segments.find(
        (segment) => end > segment.start && end <= segment.start + segment.offsets.length
      );
      if (!first || !last) return null;
      const range = document.createRange();
      range.setStart(first.node, first.offsets[start - first.start]);
      range.setEnd(last.node, last.offsets[end - last.start - 1] + 1);
      return range;
    }
    function findAnnotationRange(index, annotation, sectionPathForNode) {
      const anchor = annotation.textAnchor;
      if (anchor) {
        return index.text.slice(anchor.start, anchor.end) === anchor.quote ? rangeAt(index, anchor.start, anchor.end) : null;
      }
      const quote = annotation.sentenceText.replace(/\s/g, "");
      if (!quote) return null;
      const matches = [];
      let start = index.text.indexOf(quote);
      while (start !== -1) {
        const range = rangeAt(index, start, start + quote.length);
        if (range) matches.push(range);
        start = index.text.indexOf(quote, start + 1);
      }
      if (matches.length === 1) return matches[0];
      const inSection = matches.filter(
        (range) => sectionPathForNode(range.startContainer) === annotation.sectionPath
      );
      return inSection.length === 1 ? inSection[0] : null;
    }
    var EXCLUDED_TEXT;
    var init_annotation_anchor = __esm({
      "src/platform/browser/dom/annotation-anchor.ts"() {
        "use strict";
        EXCLUDED_TEXT = [
          "script",
          "style",
          "noscript",
          "textarea",
          "button",
          "input",
          "select",
          ".reference",
          ".mw-ref",
          ".citation",
          ".ref",
          ".reference-text",
          ".reference-note",
          "[data-reference]",
          "[data-ref]",
          ".mw-editsection",
          ".qeec-ref-tag-copy-btn",
          "ipe-quick-edit",
          ".ipe__in-article-link",
          ".ipe-quick-edit",
          ".ipe-quick-edit--create-only",
          ".review-tool-inline-annotation",
          ".floating-button",
          ".review-tool-global-button",
          ".review-tool-dialog",
          ".review-tool-reference-tip"
        ].join(",");
      }
    });
    function shouldTreatHalfWidthTerminators(lang) {
      if (!lang) return false;
      return !(lang.startsWith("zh") || lang.startsWith("ja"));
    }
    function getSentenceTerminatorRegex(allowHalfWidth) {
      const terminators = allowHalfWidth ? "。！？?!…." : "。！？…";
      return new RegExp(
        `[」』】〗〕\\)\\]\\}\\"'’”〉》]*[${terminators}]+[」』】〗〕\\)\\]\\}\\"'’”〉》]*`,
        "g"
      );
    }
    function splitTextToPartsSimple(text, allowHalfWidth) {
      const terminators = allowHalfWidth ? "。！？!?；;」』】〗〕\\]］}｝\\." : "。！？；;」』】〗〕\\]］}｝";
      const re = new RegExp(`(?<=[${terminators}])\\s*`, "g");
      return text.split(re).filter((p) => p.trim());
    }
    function splitTextIntoRanges(text, lang) {
      const ranges = [];
      if (!text || !text.trim()) return ranges;
      const re = getSentenceTerminatorRegex(
        shouldTreatHalfWidthTerminators(lang)
      );
      let lastIndex = 0;
      while (re.exec(text) !== null) {
        const endPos = re.lastIndex;
        const part = text.slice(lastIndex, endPos);
        if (part.trim()) ranges.push({ start: lastIndex, end: endPos });
        lastIndex = endPos;
      }
      if (lastIndex < text.length) {
        const tail = text.slice(lastIndex);
        if (tail.trim()) ranges.push({ start: lastIndex, end: text.length });
      }
      if (ranges.length <= 1) {
        const alt = [];
        const altRe = new RegExp(
          `${getSentenceTerminatorRegex(shouldTreatHalfWidthTerminators(lang)).source}|(?:\\r?\\n)+|(?:\\s{2,})`,
          "g"
        );
        let last = 0;
        while (altRe.exec(text) !== null) {
          const endPos = altRe.lastIndex;
          const part = text.slice(last, endPos);
          if (part.trim()) alt.push({ start: last, end: endPos });
          last = endPos;
        }
        if (last < text.length) {
          const tail2 = text.slice(last);
          if (tail2.trim()) alt.push({ start: last, end: text.length });
        }
        if (alt.length > 1) {
          return alt;
        }
      }
      return ranges;
    }
    var init_sentences = __esm({
      "src/domain/sentences.ts"() {
        "use strict";
      }
    });
    function collectRelatedSources(root, selection) {
      if (!selection || !root.contains(selection.startContainer) || !root.contains(selection.endContainer))
        return [];
      const blocks = /* @__PURE__ */ new Map();
      const sources = [];
      const seen = /* @__PURE__ */ new Set();
      for (const marker of Array.from(
        root.querySelectorAll(REFERENCE_MARKER_SELECTOR)
      )) {
        const block = marker.closest("p, li, td, th, dd, dt, blockquote") ?? marker.parentElement;
        if (!block || !root.contains(block) || !selection.intersectsNode(block))
          continue;
        let context = blocks.get(block);
        if (!context) {
          const index = buildArticleTextIndex(block);
          const anchor = captureAnnotationAnchor(index, selection);
          const lang = block.closest("[lang]")?.getAttribute("lang") ?? document.documentElement.lang;
          const sentences = anchor ? splitTextIntoRanges(index.text, lang).filter(
            (sentence) => sentence.start < anchor.end && sentence.end > anchor.start
          ) : [];
          context = { index, sentences };
          blocks.set(block, context);
        }
        let position = 0;
        for (const segment of context.index.segments) {
          if (!(marker.compareDocumentPosition(segment.node) & Node.DOCUMENT_POSITION_PRECEDING))
            break;
          position = segment.start + segment.offsets.length;
        }
        if (!context.sentences.some(
          (sentence) => position > sentence.start && position <= sentence.end
        ))
          continue;
        const data = getReferenceLinkData(root, marker, "comment");
        if (!data?.footnote || seen.has(marker.id)) continue;
        seen.add(marker.id);
        sources.push({
          label: data.label,
          title: data.title,
          url: data.url,
          wikitext: data.footnote
        });
      }
      return sources;
    }
    var init_related_sources = __esm({
      "src/platform/browser/dom/related-sources.ts"() {
        "use strict";
        init_annotation_anchor();
        init_reference_links();
        init_sentences();
      }
    });
    function buildAnnotationEditorMessages(translate) {
      return {
        titleCreate: translate({
          hant: "新增批註",
          hans: "新增批注"
        }),
        titleEdit: translate({
          hant: "編輯批註",
          hans: "编辑批注"
        }),
        sectionLabel: translate({
          hant: "章節：",
          hans: "章节："
        }),
        sentenceLabel: translate({
          hant: "句子：",
          hans: "句子："
        }),
        sourcesLabel: translate({
          hant: "相關來源",
          hans: "相关来源"
        }),
        copySource: translate({ hant: "複製", hans: "复制" }),
        sourceCopied: translate({
          hant: "已複製。",
          hans: "已复制。"
        }),
        sourceCopyFailed: translate({
          hant: "無法複製，請選取連結文字手動複製。",
          hans: "无法复制，请选取链接文字手动复制。"
        }),
        opinionLabel: translate({
          hant: "批註內容",
          hans: "批注内容"
        }),
        opinionPlaceholder: translate({
          hant: "請輸入批註內容…",
          hans: "请输入批注内容…"
        }),
        opinionRequired: translate({
          hant: "批註內容不能為空",
          hans: "批注内容不能为空"
        }),
        opinionHint: translate({
          hant: "批註儲存於此瀏覽器；複製評審文字後，可自行貼到維基百科。",
          hans: "批注存储于此浏览器；复制评审文本后，可自行粘贴到维基百科。"
        }),
        quickInput: translate({
          hant: "快速輸入",
          hans: "快速输入"
        }),
        smallText: translate({ hant: "小字", hans: "小字" }),
        joking: translate({ hant: "開玩笑的", hans: "开玩笑的" }),
        cancel: translate({ hant: "取消", hans: "取消" }),
        save: translate({ hant: "儲存", hans: "保存" }),
        create: translate({ hant: "新增", hans: "新增" }),
        delete: translate({ hant: "刪除", hans: "删除" }),
        deleteConfirm: translate({
          hant: "確定要刪除這條批註？",
          hans: "确定要删除这条批注？"
        })
      };
    }
    var init_annotation_editor = __esm({
      "src/i18n/annotation-editor.ts"() {
        "use strict";
      }
    });
    function continueCommentList(textarea) {
      const caret = textarea.selectionStart;
      const newline = caret - 1;
      if (textarea.value[newline] !== "\n") return;
      const lineStart = textarea.value.slice(0, newline).lastIndexOf("\n") + 1;
      const previousLine = textarea.value.slice(lineStart, newline);
      if (!previousLine.trim()) return;
      const bullet = previousLine.match(/^([ \t]*)(\*+)[ \t]*/);
      const marker = bullet ? `${bullet[1]}${bullet[2]} ` : "* ";
      const firstComment = bullet ? previousLine : `* ${previousLine}`;
      const nextCaret = caret + firstComment.length - previousLine.length + marker.length;
      textarea.value = `${textarea.value.slice(0, lineStart) + firstComment}
${marker}${textarea.value.slice(caret)}`;
      textarea.setSelectionRange(nextCaret, nextCaret);
    }
    function expandShortcuts(textarea) {
      const changes = [];
      const value = textarea.value.replace(
        /<<([^<>]+)>>/g,
        (match, content, offset) => {
          const replacement = `「{{仿宋体|1=${content}}}」`;
          changes.push({
            offset,
            length: match.length,
            replacementLength: replacement.length
          });
          return replacement;
        }
      );
      if (!changes.length) return false;
      const mapPosition = (position) => {
        let shift = 0;
        for (const change of changes) {
          if (position <= change.offset) break;
          if (position < change.offset + change.length) {
            return change.offset + shift + change.replacementLength;
          }
          shift += change.replacementLength - change.length;
        }
        return position + shift;
      };
      const start = mapPosition(textarea.selectionStart);
      const end = mapPosition(textarea.selectionEnd);
      const direction = textarea.selectionDirection;
      textarea.value = value;
      textarea.setSelectionRange(start, end, direction);
      return true;
    }
    var cleanupHandlers, commentShortcuts;
    var init_comment_shortcuts = __esm({
      "src/features/annotations/comment-shortcuts.ts"() {
        "use strict";
        cleanupHandlers = /* @__PURE__ */ new WeakMap();
        commentShortcuts = {
          mounted(element) {
            const textarea = element.querySelector("textarea");
            if (!textarea) return;
            let composing = false;
            const onCompositionStart2 = () => {
              composing = true;
            };
            const onInput = (event) => {
              const inputEvent = event;
              if (composing || inputEvent.isComposing) return;
              if (inputEvent.inputType === "insertLineBreak" || inputEvent.inputType === "insertParagraph") {
                continueCommentList(textarea);
              }
              expandShortcuts(textarea);
            };
            const onCompositionEnd2 = () => {
              composing = false;
              if (expandShortcuts(textarea)) {
                textarea.dispatchEvent(new Event("input", { bubbles: true }));
              }
            };
            textarea.addEventListener("input", onInput, true);
            textarea.addEventListener("compositionstart", onCompositionStart2);
            textarea.addEventListener("compositionend", onCompositionEnd2);
            cleanupHandlers.set(element, () => {
              textarea.removeEventListener("input", onInput, true);
              textarea.removeEventListener(
                "compositionstart",
                onCompositionStart2
              );
              textarea.removeEventListener("compositionend", onCompositionEnd2);
            });
          },
          unmounted(element) {
            cleanupHandlers.get(element)?.();
            cleanupHandlers.delete(element);
          }
        };
      }
    });
    function useStackedDialogActions() {
      const query = "(max-width: 480px) and (min-height: 481px)";
      const media = window.matchMedia?.(query);
      const { ref: ref3, onMounted: onMounted2, onUnmounted: onUnmounted2 } = getVueRuntime();
      const stacked = ref3(media?.matches ?? false);
      const update = () => {
        stacked.value = media?.matches ?? false;
      };
      onMounted2(() => media?.addEventListener("change", update));
      onUnmounted2(() => media?.removeEventListener("change", update));
      return stacked;
    }
    var init_responsive_actions = __esm({
      "src/features/annotations/responsive-actions.ts"() {
        "use strict";
        init_vue_runtime();
      }
    });
    var defineComponent, ref, computed, watch, annotation_editor_default;
    var init_annotation_editor2 = __esm({
      "src/features/annotations/components/annotation-editor.ts"() {
        "use strict";
        init_vue_runtime();
        init_annotation_editor();
        init_context();
        init_dialog();
        init_comment_shortcuts();
        init_clipboard();
        init_responsive_actions();
        defineComponent = (options) => options;
        ref = (...args) => getVueRuntime().ref(...args);
        computed = (...args) => getVueRuntime().computed(...args);
        watch = (...args) => getVueRuntime().watch(...args);
        annotation_editor_default = defineComponent({
          directives: { "comment-shortcuts": commentShortcuts },
          props: {
            mode: {
              type: String,
              required: false,
              default: "create"
            },
            sectionPath: { type: String, required: false, default: "" },
            sentenceText: { type: String, required: false, default: "" },
            relatedSources: {
              type: Array,
              required: false,
              default: () => []
            },
            initialOpinion: { type: String, required: false, default: "" },
            allowDelete: { type: Boolean, required: false, default: false },
            onResolve: {
              type: Function,
              required: false,
              default: void 0
            }
          },
          setup(props) {
            const i18n = buildAnnotationEditorMessages(context_default.convByVar);
            const quickInputs = [
              { label: i18n.smallText, openTag: "<small>", closeTag: "</small>" },
              {
                label: i18n.joking,
                openTag: '<span title="開玩笑的" style="color: grey; text-decoration: line-through">',
                closeTag: "</span>"
              }
            ];
            const open = ref(true);
            const opinionField = ref(null);
            const opinion = ref(
              typeof props.initialOpinion === "string" ? props.initialOpinion : ""
            );
            const showValidationError = ref(false);
            const sourceCopyStatus = ref("");
            const failedSourceWikitext = ref("");
            const copyingSource = ref(false);
            const stackedActions = useStackedDialogActions();
            function insertCommentMarkup(openTag, closeTag) {
              const textarea = opinionField.value?.querySelector("textarea");
              if (!textarea) return;
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const direction = textarea.selectionDirection;
              const selectedText = textarea.value.slice(start, end);
              textarea.focus();
              textarea.setRangeText(
                `${openTag}${selectedText}${closeTag}`,
                start,
                end,
                "select"
              );
              textarea.setSelectionRange(
                start + openTag.length,
                end + openTag.length,
                direction
              );
              textarea.dispatchEvent(new Event("input", { bubbles: true }));
            }
            async function copySource(source) {
              if (copyingSource.value) return;
              copyingSource.value = true;
              failedSourceWikitext.value = "";
              sourceCopyStatus.value = "";
              try {
                await copyText(source.wikitext);
                sourceCopyStatus.value = `${source.label} ${i18n.sourceCopied}`;
              } catch {
                failedSourceWikitext.value = source.wikitext;
                sourceCopyStatus.value = i18n.sourceCopyFailed;
              } finally {
                copyingSource.value = false;
              }
            }
            const dialogTitle = computed(
              () => props.mode === "edit" ? i18n.titleEdit : i18n.titleCreate
            );
            const primaryLabel = computed(
              () => props.mode === "edit" ? i18n.save : i18n.create
            );
            const canSave = computed(() => Boolean((opinion.value || "").trim()));
            const footerActions = computed(
              () => stackedActions.value ? ["save", "cancel"] : ["cancel", "save"]
            );
            watch(opinion, () => {
              if (showValidationError.value && canSave.value) {
                showValidationError.value = false;
              }
            });
            function closeDialog() {
              open.value = false;
              closeDialogAfterTransition();
            }
            function onPrimaryAction() {
              if (!canSave.value) {
                showValidationError.value = true;
                opinionField.value?.querySelector("textarea")?.focus();
                return;
              }
              props.onResolve?.({
                action: "save",
                opinion: opinion.value.trim()
              });
              closeDialog();
            }
            function onCancelAction() {
              props.onResolve?.({ action: "cancel" });
              closeDialog();
            }
            function onDeleteClick() {
              if (!props.allowDelete) return;
              const ok = window.confirm(i18n.deleteConfirm);
              if (!ok) return;
              props.onResolve?.({ action: "delete" });
              closeDialog();
            }
            function onUpdateOpen(newValue) {
              if (!newValue) {
                onCancelAction();
              }
            }
            return {
              props,
              i18n,
              quickInputs,
              open,
              opinionField,
              opinion,
              showValidationError,
              sourceCopyStatus,
              failedSourceWikitext,
              copyingSource,
              stackedActions,
              insertCommentMarkup,
              copySource,
              dialogTitle,
              primaryLabel,
              canSave,
              footerActions,
              closeDialog,
              onPrimaryAction,
              onCancelAction,
              onDeleteClick,
              onUpdateOpen,
              get vCommentShortcuts() {
                return commentShortcuts;
              }
            };
          }
        });
      }
    });
    function render(_ctx, _cache) {
      const { toDisplayString: _toDisplayString, createElementVNode: _createElementVNode, renderList: _renderList, Fragment: _Fragment, openBlock: _openBlock, createElementBlock: _createElementBlock, createTextVNode: _createTextVNode, resolveComponent: _resolveComponent, withCtx: _withCtx, createVNode: _createVNode, createCommentVNode: _createCommentVNode, createBlock: _createBlock, withModifiers: _withModifiers, resolveDirective: _resolveDirective, withDirectives: _withDirectives } = getVueRuntime();
      const _component_cdx_button = _resolveComponent("cdx-button");
      const _component_cdx_message = _resolveComponent("cdx-message");
      const _component_cdx_text_area = _resolveComponent("cdx-text-area");
      const _component_cdx_field = _resolveComponent("cdx-field");
      const _component_cdx_dialog = _resolveComponent("cdx-dialog");
      const _directive_comment_shortcuts = _resolveDirective("comment-shortcuts");
      return _openBlock(), _createBlock(_component_cdx_dialog, {
        open: _ctx.open,
        "onUpdate:open": [
          _cache[2] || (_cache[2] = ($event) => _ctx.open = $event),
          _ctx.onUpdateOpen
        ],
        title: _ctx.dialogTitle,
        "use-close-button": true,
        class: "review-tool-dialog review-tool-annotation-editor-dialog"
      }, {
        footer: _withCtx(() => [
          _createElementVNode("div", { class: "review-tool-annotation-editor__footer" }, [
            _ctx.props.allowDelete ? (_openBlock(), _createBlock(_component_cdx_button, {
              key: 0,
              weight: "quiet",
              action: "destructive",
              title: _ctx.i18n.delete,
              class: "review-tool-annotation-editor__delete",
              onClick: _withModifiers(_ctx.onDeleteClick, ["prevent"])
            }, {
              default: _withCtx(() => [
                _createElementVNode(
                  "span",
                  { class: "review-tool-control-label" },
                  _toDisplayString(_ctx.i18n.delete),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            }, 8, ["title", "onClick"])) : _createCommentVNode("v-if", true),
            _createElementVNode("div", { class: "review-tool-annotation-editor__actions" }, [
              (_openBlock(true), _createElementBlock(
                _Fragment,
                null,
                _renderList(_ctx.footerActions, (action) => {
                  return _openBlock(), _createBlock(_component_cdx_button, {
                    key: action,
                    action: action === "save" ? "progressive" : "default",
                    weight: action === "save" ? "primary" : "normal",
                    title: action === "save" ? _ctx.primaryLabel : _ctx.i18n.cancel,
                    onClick: ($event) => action === "save" ? _ctx.onPrimaryAction() : _ctx.onCancelAction()
                  }, {
                    default: _withCtx(() => [
                      _createElementVNode(
                        "span",
                        { class: "review-tool-control-label" },
                        _toDisplayString(action === "save" ? _ctx.primaryLabel : _ctx.i18n.cancel),
                        1
                        /* TEXT */
                      )
                    ]),
                    _: 2
                    /* DYNAMIC */
                  }, 1032, ["action", "weight", "title", "onClick"]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ])
          ])
        ]),
        default: _withCtx(() => [
          _createElementVNode("div", { class: "review-tool-form-section" }, [
            _createElementVNode(
              "div",
              { class: "review-tool-annotation-editor__label" },
              _toDisplayString(_ctx.i18n.sectionLabel),
              1
              /* TEXT */
            ),
            _createElementVNode(
              "div",
              { class: "review-tool-annotation-editor__section" },
              _toDisplayString(_ctx.props.sectionPath),
              1
              /* TEXT */
            )
          ]),
          _createElementVNode("div", { class: "review-tool-form-section" }, [
            _createElementVNode(
              "div",
              {
                id: "annotation-sentence-label",
                class: "review-tool-annotation-editor__label"
              },
              _toDisplayString(_ctx.i18n.sentenceLabel),
              1
              /* TEXT */
            ),
            _createElementVNode(
              "div",
              {
                class: "review-tool-annotation-editor__quote",
                role: "region",
                "aria-labelledby": "annotation-sentence-label",
                tabindex: "0"
              },
              _toDisplayString(_ctx.props.sentenceText),
              1
              /* TEXT */
            )
          ]),
          _ctx.props.relatedSources.length ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: "review-tool-form-section"
          }, [
            _createElementVNode(
              "div",
              {
                id: "annotation-sources-label",
                class: "review-tool-annotation-editor__label"
              },
              _toDisplayString(_ctx.i18n.sourcesLabel),
              1
              /* TEXT */
            ),
            _createElementVNode("ul", {
              class: "review-tool-annotation-editor__sources",
              "aria-labelledby": "annotation-sources-label"
            }, [
              (_openBlock(true), _createElementBlock(
                _Fragment,
                null,
                _renderList(_ctx.props.relatedSources, (source) => {
                  return _openBlock(), _createElementBlock("li", {
                    key: source.wikitext
                  }, [
                    _createElementVNode("a", {
                      href: source.url,
                      target: "_blank",
                      rel: "noopener noreferrer"
                    }, _toDisplayString(source.title), 9, ["href"]),
                    _createVNode(_component_cdx_button, {
                      class: "review-tool-source-copy",
                      type: "button",
                      size: "small",
                      weight: "quiet",
                      disabled: _ctx.copyingSource,
                      title: `${_ctx.i18n.copySource}${source.label}`,
                      "aria-label": `${_ctx.i18n.copySource}${source.label}`,
                      onClick: ($event) => _ctx.copySource(source)
                    }, {
                      default: _withCtx(() => [
                        _createTextVNode(
                          _toDisplayString(_ctx.i18n.copySource) + _toDisplayString(source.label),
                          1
                          /* TEXT */
                        )
                      ]),
                      _: 2
                      /* DYNAMIC */
                    }, 1032, ["disabled", "title", "aria-label", "onClick"]),
                    _ctx.failedSourceWikitext === source.wikitext ? (_openBlock(), _createElementBlock(
                      "code",
                      { key: 0 },
                      _toDisplayString(source.wikitext),
                      1
                      /* TEXT */
                    )) : _createCommentVNode("v-if", true)
                  ]);
                }),
                128
                /* KEYED_FRAGMENT */
              ))
            ]),
            _ctx.sourceCopyStatus ? (_openBlock(), _createBlock(_component_cdx_message, {
              key: 0,
              type: _ctx.failedSourceWikitext ? "error" : "success",
              inline: true,
              class: "review-tool-annotation-editor__sources-hint"
            }, {
              default: _withCtx(() => [
                _createTextVNode(
                  _toDisplayString(_ctx.sourceCopyStatus),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            }, 8, ["type"])) : _createCommentVNode("v-if", true)
          ])) : _createCommentVNode("v-if", true),
          _withDirectives((_openBlock(), _createElementBlock("div", {
            ref: "opinionField",
            class: "review-tool-form-section"
          }, [
            _createVNode(_component_cdx_field, {
              status: _ctx.showValidationError ? "error" : "default"
            }, {
              label: _withCtx(() => [
                _createTextVNode(
                  _toDisplayString(_ctx.i18n.opinionLabel),
                  1
                  /* TEXT */
                )
              ]),
              description: _withCtx(() => [
                _createTextVNode(
                  _toDisplayString(_ctx.i18n.opinionHint),
                  1
                  /* TEXT */
                )
              ]),
              error: _withCtx(() => [
                _createElementVNode(
                  "span",
                  { id: "annotation-opinion-error" },
                  _toDisplayString(_ctx.i18n.opinionRequired),
                  1
                  /* TEXT */
                )
              ]),
              default: _withCtx(() => [
                _createElementVNode("div", {
                  class: "review-tool-annotation-editor__quick-input",
                  role: "group",
                  "aria-label": _ctx.i18n.quickInput
                }, [
                  (_openBlock(true), _createElementBlock(
                    _Fragment,
                    null,
                    _renderList(_ctx.quickInputs, (input) => {
                      return _openBlock(), _createBlock(_component_cdx_button, {
                        key: input.openTag,
                        type: "button",
                        size: "small",
                        weight: "quiet",
                        title: `${input.openTag}…${input.closeTag}`,
                        onMousedown: _cache[0] || (_cache[0] = _withModifiers(() => {
                        }, ["prevent"])),
                        onClick: ($event) => _ctx.insertCommentMarkup(input.openTag, input.closeTag)
                      }, {
                        default: _withCtx(() => [
                          _createTextVNode(
                            _toDisplayString(input.label),
                            1
                            /* TEXT */
                          )
                        ]),
                        _: 2
                        /* DYNAMIC */
                      }, 1032, ["title", "onClick"]);
                    }),
                    128
                    /* KEYED_FRAGMENT */
                  ))
                ], 8, ["aria-label"]),
                _createVNode(_component_cdx_text_area, {
                  modelValue: _ctx.opinion,
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => _ctx.opinion = $event),
                  rows: "5",
                  "aria-invalid": _ctx.showValidationError ? "true" : void 0,
                  "aria-errormessage": _ctx.showValidationError ? "annotation-opinion-error" : void 0,
                  placeholder: _ctx.i18n.opinionPlaceholder
                }, null, 8, ["modelValue", "aria-invalid", "aria-errormessage", "placeholder"])
              ]),
              _: 1
              /* STABLE */
            }, 8, ["status"])
          ])), [
            [_directive_comment_shortcuts]
          ])
        ]),
        _: 1
        /* STABLE */
      }, 8, ["open", "title", "onUpdate:open"]);
    }
    var annotation_editor_default2;
    var init_annotation_editor3 = __esm({
      "src/features/annotations/components/annotation-editor.vue"() {
        "use strict";
        init_vue_runtime();
        init_annotation_editor2();
        annotation_editor_default.render = render;
        annotation_editor_default2 = annotation_editor_default;
      }
    });
    async function openAnnotationEditorDialog(options) {
      const dialogOptions = {
        sectionPath: options.sectionPath,
        sentenceText: options.sentenceText,
        relatedSources: options.relatedSources ?? [],
        initialOpinion: options.initialOpinion || "",
        mode: options.mode || "create",
        allowDelete: options.allowDelete ?? options.mode === "edit"
      };
      try {
        const { Vue, Codex } = await loadCodexAndVue();
        return await new Promise((resolve) => {
          const app = Vue.createMwApp({
            setup() {
              Vue.onUnmounted(() => resolve({ action: "replaced" }));
              return () => Vue.h(annotation_editor_default2, {
                ...dialogOptions,
                onResolve: resolve
              });
            }
          });
          registerCodexComponents(app, Codex);
          mountApp(app);
        });
      } catch (error) {
        console.error(
          "[ReviewTool] Failed to open annotation editor dialog",
          error
        );
        mw.notify(
          context_default.convByVar({
            hant: "無法開啟批註對話框。",
            hans: "无法开启批注对话框。"
          }),
          {
            type: "error",
            title: "[ReviewTool]"
          }
        );
        throw error;
      }
    }
    var init_annotation_editor4 = __esm({
      "src/features/annotations/annotation-editor.ts"() {
        "use strict";
        init_context();
        init_dialog();
        init_annotation_editor3();
      }
    });
    function buildAnnotationViewerMessages(translate) {
      return {
        title: translate({ hant: "批註列表", hans: "批注列表" }),
        empty: translate({ hant: "尚無批註", hans: "尚无批注" }),
        emptyHint: translate({
          hant: "開啟批註模式後，在文章中選取文字即可新增批註，也可匯入先前匯出的 JSON 檔案。",
          hans: "开启批注模式后，在文章中选取文字即可新增批注，也可导入先前导出的 JSON 文件。"
        }),
        summary: translate({
          hant: "$1 則批註 · 僅儲存於此瀏覽器",
          hans: "$1 条批注 · 仅存储于此浏览器"
        }),
        edit: translate({ hant: "編輯", hans: "编辑" }),
        delete: translate({ hant: "刪除", hans: "删除" }),
        deleteConfirm: translate({
          hant: "確定刪除？",
          hans: "确定删除？"
        }),
        deleteError: translate({
          hant: "無法刪除批註。請檢查瀏覽器儲存空間後重試。",
          hans: "无法删除批注。请检查浏览器存储空间后重试。"
        }),
        clearAll: translate({
          hant: "清除全部",
          hans: "清除全部"
        }),
        clearAllConfirm: translate({
          hant: "確定清除所有批註？清除後可按「復原清除」。",
          hans: "确定清除所有批注？清除后可按“撤销清除”。"
        }),
        undoClear: translate({
          hant: "復原清除",
          hans: "撤销清除"
        }),
        clearAllNothing: translate({
          hant: "沒有可清除的批註。",
          hans: "没有可清除的批注。"
        }),
        clearAllError: translate({
          hant: "無法清除批註。請檢查瀏覽器儲存空間後重試。",
          hans: "无法清除批注。请检查浏览器存储空间后重试。"
        }),
        undoClearError: translate({
          hant: "無法復原批註。請檢查瀏覽器儲存空間後重試。",
          hans: "无法撤销清除。请检查浏览器存储空间后重试。"
        }),
        sectionFallback: translate({
          hant: "（未指定章節）",
          hans: "（未指定章节）"
        }),
        close: translate({ hant: "關閉", hans: "关闭" }),
        export: translate({ hant: "匯出", hans: "导出" }),
        exportDone: translate({
          hant: "已匯出批註。",
          hans: "已导出批注。"
        }),
        exportError: translate({
          hant: "無法匯出批註。請檢查瀏覽器下載權限後重試。",
          hans: "无法导出批注。请检查浏览器下载权限后重试。"
        }),
        import: translate({ hant: "匯入", hans: "导入" }),
        importDone: translate({
          hant: "已匯入 $1 則批註。",
          hans: "已导入 $1 条批注。"
        }),
        importNothing: translate({
          hant: "沒有新的批註可匯入，已有的批註會略過。",
          hans: "没有新的批注可导入，已有的批注会跳过。"
        }),
        importError: translate({
          hant: "無法匯入批註。請檢查 ReviewTool 批註 JSON 檔案及瀏覽器儲存空間。",
          hans: "无法导入批注。请检查 ReviewTool 批注 JSON 文件及浏览器存储空间。"
        }),
        importExport: translate({
          hant: "匯入／匯出",
          hans: "导入／导出"
        }),
        copyReview: translate({ hant: "複製", hans: "复制" }),
        copyAndGo: translate({
          hant: "複製並前往",
          hans: "复制并前往"
        }),
        copyError: translate({
          hant: "無法複製評審文字。請檢查網路連線及剪貼簿權限後重試。",
          hans: "无法复制评审文本。请检查网络连接及剪贴板权限后重试。"
        }),
        copying: translate({
          hant: "正在準備評審文字…",
          hans: "正在准备评审文本…"
        }),
        importing: translate({
          hant: "正在匯入批註…",
          hans: "正在导入批注…"
        }),
        deleting: translate({
          hant: "正在刪除批註…",
          hans: "正在删除批注…"
        }),
        clearing: translate({
          hant: "正在清除批註…",
          hans: "正在清除批注…"
        }),
        sortLabel: translate({
          hant: "排序方式",
          hans: "排序方式"
        }),
        sortCreatedAsc: translate({
          hant: "最早時間優先",
          hans: "最早时间优先"
        }),
        sortCreatedDesc: translate({
          hant: "最新時間優先",
          hans: "最新时间优先"
        }),
        sortPosition: translate({
          hant: "頁面位置",
          hans: "页面位置"
        }),
        firstComment: translate({
          hant: "首次批註時間",
          hans: "首次批注时间"
        }),
        lastEdit: translate({
          hant: "最近編輯時間",
          hans: "最近编辑时间"
        })
      };
    }
    var init_annotation_viewer = __esm({
      "src/i18n/annotation-viewer.ts"() {
        "use strict";
      }
    });
    function buildWritingReviewChapters(groups, fallbackTitle) {
      return sortGroupsByPosition(groups).map((group) => ({
        title: group.sectionPath || fallbackTitle,
        suggestions: group.annotations.map((anno) => ({
          quote: anno.sentenceText || "",
          suggestion: anno.opinion || ""
        }))
      }));
    }
    function formatSuggestion(suggestion) {
      return suggestion.trim().replace(/\r\n?/g, "\n").split(/(?=^[ \t]*\*)/m).map((block) => {
        const bullet = block.match(/^[ \t]*(\*+)[ \t]*/);
        const text = bullet ? block.slice(bullet[0].length) : block;
        const formatted = text.trim().replace(/\n{2,}/g, "{{pb}}").replace(/\n/g, "<br>");
        return bullet ? `
#${bullet[1]} ${formatted}` : formatted;
      }).join("");
    }
    function formatRevisionLabel(timestamp) {
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime()))
        throw new Error("Invalid revision timestamp");
      return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日 ${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
    }
    function buildWritingReviewWikitext(chapters, context) {
      if (!chapters.length) return "";
      const revisionLabel = formatRevisionLabel(context.revisionTimestamp);
      let wikitext = "";
      for (const chapter of chapters) {
        const title = (chapter.title || "").trim();
        const sectionLink = `[[${context.articleTitle}#${title}|${title}]]`;
        const permalink = `[[Special:PermaLink/${context.revisionId}#${title}|${revisionLabel}]]`;
        wikitext += `'''${sectionLink}'''<small>（基于${permalink}版）</small>
`;
        for (const item of chapter.suggestions) {
          const quote = (item.quote || "").trim();
          const suggestion = formatSuggestion(item.suggestion || "");
          wikitext += `# ${quote ? `{{rvw|1=${quote}}} —— ` : ""}${suggestion}
`;
        }
        wikitext += "--~~~~\n\n";
      }
      return wikitext;
    }
    var init_writing_review = __esm({
      "src/domain/writing-review.ts"() {
        "use strict";
        init_annotation_order();
      }
    });
    function hasCopiedReview(key) {
      if (copiedReviews.has(key)) return true;
      for (const type of storageTypes) {
        try {
          if (window[type].getItem(key) === "1") return true;
        } catch {
        }
      }
      return false;
    }
    function rememberCopiedReview(key) {
      copiedReviews.add(key);
      for (const type of storageTypes) {
        try {
          window[type].setItem(key, "1");
          return;
        } catch {
        }
      }
    }
    async function copyWritingReview(groups) {
      const chapters = buildWritingReviewChapters(
        groups,
        context_default.convByVar({
          hant: "（未指定章節）",
          hans: "（未指定章节）"
        })
      );
      if (!chapters.length) {
        mw.notify(
          context_default.convByVar({
            hant: "目前沒有可複製的批註。",
            hans: "目前没有可复制的批注。"
          }),
          { type: "warn", tag: "review-tool" }
        );
        return false;
      }
      try {
        const revisionId = mw.config.get("wgRevisionId");
        if (!revisionId) throw new Error("Missing article revision ID");
        await mw.loader.using("mediawiki.api");
        const response = await new mw.Api().get({
          action: "query",
          prop: "revisions",
          revids: revisionId,
          rvprop: "timestamp",
          formatversion: 2
        });
        const revisionTimestamp = response.query?.pages?.[0]?.revisions?.[0]?.timestamp;
        if (!revisionTimestamp)
          throw new Error("Missing article revision timestamp");
        const articleTitle = mw.config.get("wgPageName") || context_default.articleTitle;
        const historyKey = `reviewtool:review-copied:${articleTitle.replace(/_/g, " ")}`;
        const reviewText = buildWritingReviewWikitext(chapters, {
          articleTitle,
          revisionId,
          revisionTimestamp
        }).trim();
        await copyText(
          hasCopiedReview(historyKey) ? reviewText : `${reviewIntroduction}

${reviewText}`
        );
        rememberCopiedReview(historyKey);
        mw.notify(
          context_default.convByVar({
            hant: "已複製評審文字，可貼到目標頁面。",
            hans: "已复制评审文本，可粘贴到目标页面。"
          }),
          { tag: "review-tool" }
        );
        return true;
      } catch (error) {
        console.error("[ReviewTool] Failed to copy review text", error);
        mw.notify(
          context_default.convByVar({
            hant: "無法複製評審文字，請檢查網路連線及剪貼簿權限後重試。",
            hans: "无法复制评审文本，请检查网络连接及剪贴板权限后重试。"
          }),
          { type: "error", tag: "review-tool" }
        );
        return false;
      }
    }
    var reviewIntroduction, copiedReviews, storageTypes;
    var init_copy_review = __esm({
      "src/app/copy-review.ts"() {
        "use strict";
        init_clipboard();
        init_context();
        init_writing_review();
        reviewIntroduction = "意見由[https://github.com/For-Each-Next/wp-revtool-lite ReviewToolLite]協助生成。";
        copiedReviews = /* @__PURE__ */ new Set();
        storageTypes = ["localStorage", "sessionStorage"];
      }
    });
    var defineComponent2, ref2, computed2, onMounted, onUnmounted, annotation_viewer_default;
    var init_annotation_viewer2 = __esm({
      "src/features/annotations/components/annotation-viewer.ts"() {
        "use strict";
        init_vue_runtime();
        init_annotation_viewer();
        init_context();
        init_annotation_order();
        init_annotation_time();
        init_dialog();
        init_copy_review();
        init_responsive_actions();
        defineComponent2 = (options) => options;
        ref2 = (...args) => getVueRuntime().ref(...args);
        computed2 = (...args) => getVueRuntime().computed(...args);
        onMounted = (...args) => getVueRuntime().onMounted(...args);
        onUnmounted = (...args) => getVueRuntime().onUnmounted(...args);
        annotation_viewer_default = defineComponent2({
          props: {
            pageName: { type: String, required: true },
            initialGroups: {
              type: Array,
              required: false,
              default: () => []
            },
            initialCanUndoClear: { type: Boolean, required: false, default: false },
            onEditAnnotation: {
              type: Function,
              required: false,
              default: void 0
            },
            onDeleteAnnotation: {
              type: Function,
              required: false,
              default: void 0
            },
            onClearAllAnnotations: {
              type: Function,
              required: false,
              default: void 0
            },
            onUndoClearAnnotations: {
              type: Function,
              required: false,
              default: void 0
            },
            onImportAnnotations: {
              type: Function,
              required: false,
              default: void 0
            },
            onClosed: {
              type: Function,
              required: false,
              default: void 0
            }
          },
          setup(props) {
            const i18n = buildAnnotationViewerMessages(context_default.convByVar);
            const open = ref2(true);
            const groups = ref2(props.initialGroups);
            const canUndoClear = ref2(props.initialCanUndoClear);
            const deletingAnnotationId = ref2(null);
            const clearingAll = ref2(false);
            const copyingReview = ref2(false);
            const importing = ref2(false);
            const importInput = ref2(null);
            const fileAction = ref2(null);
            const reviewAction = ref2(null);
            const sortMethod = ref2("position");
            const actionError = ref2("");
            const stackedActions = useStackedDialogActions();
            const footerActions = computed2(
              () => stackedActions.value ? ["go", "copy", "file", "close"] : ["close", "file", "copy", "go"]
            );
            const now = ref2(Date.now());
            let timeRefreshInterval;
            onMounted(() => {
              timeRefreshInterval = window.setInterval(() => {
                now.value = Date.now();
              }, 6e4);
            });
            onUnmounted(() => window.clearInterval(timeRefreshInterval));
            const talkPageTitle = mw.Title.newFromText(props.pageName)?.getTalkPage()?.getPrefixedText();
            const reviewDestinations = [
              {
                value: "Wikipedia:典范条目评选/提名区",
                label: context_default.convByVar({
                  hant: "典範條目評選",
                  hans: "典范条目评选"
                })
              },
              {
                value: "Wikipedia:特色列表评选/提名区",
                label: context_default.convByVar({
                  hant: "特色列表評選",
                  hans: "特色列表评选"
                })
              },
              {
                value: "Wikipedia:優良條目評選/提名區",
                label: context_default.convByVar({
                  hant: "優良條目評選",
                  hans: "优良条目评选"
                })
              },
              {
                value: "Wikipedia:同行评审/提案区",
                label: context_default.convByVar({ hant: "同行評審", hans: "同行评审" })
              },
              ...talkPageTitle ? [
                {
                  value: talkPageTitle,
                  label: context_default.convByVar({
                    hant: "討論頁",
                    hans: "讨论页"
                  })
                }
              ] : []
            ];
            const canClearAll = computed2(
              () => Boolean(props.onClearAllAnnotations)
            );
            const isEmpty = computed2(
              () => groups.value.every((group) => !group.annotations.length)
            );
            const busy = computed2(
              () => importing.value || copyingReview.value || clearingAll.value || deletingAnnotationId.value !== null
            );
            const pendingLabel = computed2(
              () => importing.value ? i18n.importing : copyingReview.value ? i18n.copying : clearingAll.value ? i18n.clearing : deletingAnnotationId.value ? i18n.deleting : ""
            );
            const fileMenuItems = computed2(() => [
              {
                value: "import",
                label: i18n.import,
                disabled: !props.onImportAnnotations
              },
              { value: "export", label: i18n.export, disabled: isEmpty.value }
            ]);
            const flattenedAnnotations = computed2(
              () => groups.value.flatMap((group) => group.annotations)
            );
            const timeRange = computed2(
              () => getAnnotationTimeRange(flattenedAnnotations.value)
            );
            const sortingOptions = computed2(() => [
              { value: "position", label: i18n.sortPosition },
              { value: "created-desc", label: i18n.sortCreatedDesc },
              { value: "created-asc", label: i18n.sortCreatedAsc }
            ]);
            const selectedSortLabel = computed2(
              () => sortingOptions.value.find(
                (option) => option.value === sortMethod.value
              )?.label
            );
            const sortedGroups = computed2(() => {
              const annotations = flattenedAnnotations.value;
              if (sortMethod.value === "created-desc")
                return groupAnnotationsByTime(annotations, "desc");
              if (sortMethod.value === "created-asc")
                return groupAnnotationsByTime(annotations, "asc");
              return sortGroupsByPosition(groupAnnotations(annotations));
            });
            function formatTimestamp(ts) {
              return formatAnnotationTimestamp(ts, now.value, context_default.convByVar);
            }
            function handleEdit(annotationId, sectionPath) {
              if (busy.value) return;
              props.onEditAnnotation?.(annotationId, sectionPath);
            }
            async function handleDelete(annotationId, sectionPath) {
              if (busy.value || !props.onDeleteAnnotation || !window.confirm(i18n.deleteConfirm))
                return;
              actionError.value = "";
              deletingAnnotationId.value = annotationId;
              try {
                await props.onDeleteAnnotation(annotationId, sectionPath);
              } catch (error) {
                console.error(
                  "[ReviewTool] Failed to delete annotation",
                  error
                );
                actionError.value = i18n.deleteError;
              } finally {
                deletingAnnotationId.value = null;
              }
            }
            async function handleClearAll() {
              if (busy.value || !props.onClearAllAnnotations || isEmpty.value || !window.confirm(i18n.clearAllConfirm))
                return;
              actionError.value = "";
              clearingAll.value = true;
              try {
                const cleared = await props.onClearAllAnnotations();
                if (!cleared)
                  mw.notify(i18n.clearAllNothing, { tag: "review-tool" });
              } catch (error) {
                console.error(
                  "[ReviewTool] Failed to clear annotations",
                  error
                );
                actionError.value = i18n.clearAllError;
              } finally {
                clearingAll.value = false;
              }
            }
            function handleUndoClear() {
              if (busy.value || !props.onUndoClearAnnotations) return;
              actionError.value = "";
              try {
                if (props.onUndoClearAnnotations() === false)
                  actionError.value = i18n.undoClearError;
              } catch (error) {
                console.error(
                  "[ReviewTool] Failed to restore annotations",
                  error
                );
                actionError.value = i18n.undoClearError;
              }
            }
            async function handleCopyReview(action) {
              reviewAction.value = null;
              if (isEmpty.value || busy.value) return;
              const destination = reviewDestinations.find(
                (item) => item.value === action
              );
              if (action !== "copy" && !destination) return;
              let url = destination ? mw.util.getUrl(destination.value) : null;
              if (url && destination && destination.value !== talkPageTitle) {
                url += `#${mw.util.escapeIdForLink(props.pageName.replace(/_/g, " "))}`;
              }
              copyingReview.value = true;
              actionError.value = "";
              try {
                const copied = await copyWritingReview(groups.value);
                if (!copied) actionError.value = i18n.copyError;
                if (copied && url && open.value) window.location.assign(url);
              } catch (error) {
                console.error("[ReviewTool] Failed to copy review", error);
                actionError.value = i18n.copyError;
              } finally {
                copyingReview.value = false;
              }
            }
            function handleFileAction(action) {
              fileAction.value = null;
              if (busy.value) return;
              if (action === "import" && props.onImportAnnotations) {
                importInput.value?.click();
              } else if (action === "export") {
                handleExport();
              }
            }
            function handleExport() {
              if (isEmpty.value || busy.value) return;
              actionError.value = "";
              try {
                const payload = {
                  pageName: props.pageName,
                  exportedAt: Date.now(),
                  groups: groups.value
                };
                const json = JSON.stringify(payload, null, 2);
                const blob = new Blob([json], {
                  type: "application/json;charset=utf-8"
                });
                const filename = `review-tool-annotations-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "")}.json`;
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                mw.notify(i18n.exportDone, { tag: "review-tool" });
              } catch (error) {
                console.error(
                  "[ReviewTool] Failed to export annotations",
                  error
                );
                actionError.value = i18n.exportError;
              }
            }
            async function handleImport(event) {
              const input = event.target;
              const file = input.files?.[0];
              if (!file || !props.onImportAnnotations || busy.value) return;
              actionError.value = "";
              importing.value = true;
              try {
                const json = await file.text();
                if (!open.value) return;
                const imported = await props.onImportAnnotations(json);
                mw.notify(
                  imported ? i18n.importDone.replace("$1", String(imported)) : i18n.importNothing,
                  { tag: "review-tool" }
                );
              } catch (error) {
                console.error(
                  "[ReviewTool] Failed to import annotations",
                  error
                );
                actionError.value = i18n.importError;
              } finally {
                input.value = "";
                importing.value = false;
              }
            }
            function onUpdateOpen(newValue) {
              if (!newValue) {
                closeDialog();
              }
            }
            function closeDialog() {
              open.value = false;
              closeDialogAfterTransition(props.onClosed);
            }
            return {
              props,
              i18n,
              open,
              groups,
              canUndoClear,
              deletingAnnotationId,
              clearingAll,
              copyingReview,
              importing,
              importInput,
              fileAction,
              reviewAction,
              sortMethod,
              actionError,
              stackedActions,
              footerActions,
              now,
              get timeRefreshInterval() {
                return timeRefreshInterval;
              },
              set timeRefreshInterval(v) {
                timeRefreshInterval = v;
              },
              talkPageTitle,
              reviewDestinations,
              canClearAll,
              isEmpty,
              busy,
              pendingLabel,
              fileMenuItems,
              flattenedAnnotations,
              timeRange,
              sortingOptions,
              selectedSortLabel,
              sortedGroups,
              formatTimestamp,
              handleEdit,
              handleDelete,
              handleClearAll,
              handleUndoClear,
              handleCopyReview,
              handleFileAction,
              handleExport,
              handleImport,
              onUpdateOpen,
              closeDialog
            };
          }
        });
      }
    });
    function render2(_ctx, _cache) {
      const { toDisplayString: _toDisplayString, createTextVNode: _createTextVNode, resolveComponent: _resolveComponent, withCtx: _withCtx, openBlock: _openBlock, createBlock: _createBlock, createCommentVNode: _createCommentVNode, createVNode: _createVNode, Fragment: _Fragment, createElementBlock: _createElementBlock, createElementVNode: _createElementVNode, renderList: _renderList, withModifiers: _withModifiers } = getVueRuntime();
      const _component_cdx_message = _resolveComponent("cdx-message");
      const _component_cdx_progress_bar = _resolveComponent("cdx-progress-bar");
      const _component_cdx_button = _resolveComponent("cdx-button");
      const _component_cdx_select = _resolveComponent("cdx-select");
      const _component_cdx_menu_button = _resolveComponent("cdx-menu-button");
      const _component_cdx_dialog = _resolveComponent("cdx-dialog");
      return _openBlock(), _createBlock(_component_cdx_dialog, {
        open: _ctx.open,
        "onUpdate:open": [
          _cache[5] || (_cache[5] = ($event) => _ctx.open = $event),
          _ctx.onUpdateOpen
        ],
        title: _ctx.i18n.title,
        "use-close-button": true,
        class: "review-tool-dialog review-tool-annotation-viewer-dialog"
      }, {
        footer: _withCtx(() => [
          _createElementVNode("div", { class: "review-tool-annotation-viewer__footer" }, [
            _createElementVNode("div", { class: "review-tool-annotation-viewer__footer-left" }, [
              _createVNode(_component_cdx_select, {
                selected: _ctx.sortMethod,
                "onUpdate:selected": _cache[0] || (_cache[0] = ($event) => _ctx.sortMethod = $event),
                "menu-items": _ctx.sortingOptions,
                disabled: _ctx.isEmpty,
                "aria-label": _ctx.i18n.sortLabel,
                title: _ctx.selectedSortLabel,
                class: "review-tool-annotation-viewer__sort-select"
              }, null, 8, ["selected", "menu-items", "disabled", "aria-label", "title"])
            ]),
            _createElementVNode("div", { class: "review-tool-annotation-viewer__footer-controls" }, [
              _createElementVNode("div", { class: "review-tool-annotation-viewer__maintenance" }, [
                _ctx.canUndoClear && _ctx.props.onUndoClearAnnotations ? (_openBlock(), _createBlock(_component_cdx_button, {
                  key: 0,
                  weight: "quiet",
                  disabled: _ctx.busy,
                  onClick: _ctx.handleUndoClear
                }, {
                  default: _withCtx(() => [
                    _createElementVNode(
                      "span",
                      { class: "review-tool-control-label" },
                      _toDisplayString(_ctx.i18n.undoClear),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                }, 8, ["disabled", "onClick"])) : _createCommentVNode("v-if", true),
                _createVNode(_component_cdx_button, {
                  weight: "quiet",
                  title: _ctx.i18n.clearAll,
                  disabled: !_ctx.canClearAll || _ctx.isEmpty || _ctx.busy,
                  onClick: _ctx.handleClearAll
                }, {
                  default: _withCtx(() => [
                    _createElementVNode(
                      "span",
                      { class: "review-tool-control-label" },
                      _toDisplayString(_ctx.i18n.clearAll),
                      1
                      /* TEXT */
                    )
                  ]),
                  _: 1
                  /* STABLE */
                }, 8, ["title", "disabled", "onClick"])
              ]),
              _createElementVNode("div", { class: "review-tool-annotation-viewer__footer-actions" }, [
                _createElementVNode(
                  "input",
                  {
                    ref: "importInput",
                    type: "file",
                    accept: ".json,application/json",
                    hidden: "",
                    onChange: _cache[1] || (_cache[1] = (...args) => _ctx.handleImport && _ctx.handleImport(...args))
                  },
                  null,
                  544
                  /* NEED_HYDRATION, NEED_PATCH */
                ),
                (_openBlock(true), _createElementBlock(
                  _Fragment,
                  null,
                  _renderList(_ctx.footerActions, (action) => {
                    return _openBlock(), _createElementBlock(
                      _Fragment,
                      { key: action },
                      [
                        action === "close" ? (_openBlock(), _createBlock(_component_cdx_button, {
                          key: 0,
                          weight: "normal",
                          title: _ctx.i18n.close,
                          onClick: _ctx.closeDialog
                        }, {
                          default: _withCtx(() => [
                            _createElementVNode(
                              "span",
                              { class: "review-tool-control-label" },
                              _toDisplayString(_ctx.i18n.close),
                              1
                              /* TEXT */
                            )
                          ]),
                          _: 1
                          /* STABLE */
                        }, 8, ["title", "onClick"])) : action === "file" ? (_openBlock(), _createBlock(_component_cdx_menu_button, {
                          key: 1,
                          selected: _ctx.fileAction,
                          "onUpdate:selected": [
                            _cache[2] || (_cache[2] = ($event) => _ctx.fileAction = $event),
                            _ctx.handleFileAction
                          ],
                          "menu-items": _ctx.fileMenuItems,
                          weight: "quiet",
                          title: _ctx.i18n.importExport,
                          disabled: _ctx.busy
                        }, {
                          default: _withCtx(() => [
                            _createElementVNode(
                              "span",
                              { class: "review-tool-control-label" },
                              _toDisplayString(_ctx.i18n.importExport),
                              1
                              /* TEXT */
                            )
                          ]),
                          _: 1
                          /* STABLE */
                        }, 8, ["selected", "menu-items", "title", "disabled", "onUpdate:selected"])) : action === "copy" ? (_openBlock(), _createBlock(_component_cdx_button, {
                          key: 2,
                          weight: "normal",
                          title: _ctx.i18n.copyReview,
                          disabled: _ctx.isEmpty || _ctx.busy,
                          onClick: _cache[3] || (_cache[3] = ($event) => _ctx.handleCopyReview("copy"))
                        }, {
                          default: _withCtx(() => [
                            _createElementVNode(
                              "span",
                              { class: "review-tool-control-label" },
                              _toDisplayString(_ctx.i18n.copyReview),
                              1
                              /* TEXT */
                            )
                          ]),
                          _: 1
                          /* STABLE */
                        }, 8, ["title", "disabled"])) : (_openBlock(), _createBlock(_component_cdx_menu_button, {
                          key: 3,
                          selected: _ctx.reviewAction,
                          "onUpdate:selected": [
                            _cache[4] || (_cache[4] = ($event) => _ctx.reviewAction = $event),
                            _ctx.handleCopyReview
                          ],
                          "menu-items": _ctx.reviewDestinations,
                          action: "progressive",
                          weight: "primary",
                          title: _ctx.i18n.copyAndGo,
                          disabled: _ctx.isEmpty || _ctx.busy
                        }, {
                          default: _withCtx(() => [
                            _createElementVNode(
                              "span",
                              { class: "review-tool-control-label" },
                              _toDisplayString(_ctx.i18n.copyAndGo),
                              1
                              /* TEXT */
                            )
                          ]),
                          _: 1
                          /* STABLE */
                        }, 8, ["selected", "menu-items", "title", "disabled", "onUpdate:selected"]))
                      ],
                      64
                      /* STABLE_FRAGMENT */
                    );
                  }),
                  128
                  /* KEYED_FRAGMENT */
                ))
              ])
            ])
          ])
        ]),
        default: _withCtx(() => [
          _createElementVNode("div", { class: "review-tool-annotation-viewer__feedback" }, [
            _ctx.actionError ? (_openBlock(), _createBlock(_component_cdx_message, {
              key: 0,
              type: "error",
              inline: true
            }, {
              default: _withCtx(() => [
                _createTextVNode(
                  _toDisplayString(_ctx.actionError),
                  1
                  /* TEXT */
                )
              ]),
              _: 1
              /* STABLE */
            })) : _createCommentVNode("v-if", true),
            _createElementVNode("div", {
              role: "status",
              "aria-live": "polite"
            }, [
              _ctx.busy ? (_openBlock(), _createElementBlock(
                _Fragment,
                { key: 0 },
                [
                  _createTextVNode(
                    _toDisplayString(_ctx.pendingLabel) + " ",
                    1
                    /* TEXT */
                  ),
                  _createVNode(_component_cdx_progress_bar, {
                    "aria-label": _ctx.pendingLabel,
                    class: "review-tool-annotation-viewer__progress"
                  }, null, 8, ["aria-label"])
                ],
                64
                /* STABLE_FRAGMENT */
              )) : _createCommentVNode("v-if", true)
            ])
          ]),
          _ctx.isEmpty ? (_openBlock(), _createElementBlock("div", {
            key: 0,
            class: "review-tool-annotation-viewer__empty"
          }, [
            _createElementVNode(
              "strong",
              null,
              _toDisplayString(_ctx.i18n.empty),
              1
              /* TEXT */
            ),
            _createElementVNode(
              "p",
              null,
              _toDisplayString(_ctx.i18n.emptyHint),
              1
              /* TEXT */
            )
          ])) : (_openBlock(), _createElementBlock("div", {
            key: 1,
            class: "review-tool-annotation-viewer__list",
            "aria-busy": _ctx.busy
          }, [
            _createElementVNode(
              "p",
              { class: "review-tool-annotation-viewer__summary" },
              _toDisplayString(_ctx.i18n.summary.replace(
                "$1",
                String(_ctx.flattenedAnnotations.length)
              )),
              1
              /* TEXT */
            ),
            _ctx.timeRange ? (_openBlock(), _createElementBlock("dl", {
              key: 0,
              class: "review-tool-annotation-viewer__times"
            }, [
              _createElementVNode("div", null, [
                _createElementVNode(
                  "dt",
                  null,
                  _toDisplayString(_ctx.i18n.firstComment),
                  1
                  /* TEXT */
                ),
                _createElementVNode("dd", null, [
                  _createElementVNode("time", {
                    datetime: new Date(_ctx.timeRange.first).toISOString()
                  }, _toDisplayString(_ctx.formatTimestamp(_ctx.timeRange.first)), 9, ["datetime"])
                ])
              ]),
              _createElementVNode("div", null, [
                _createElementVNode(
                  "dt",
                  null,
                  _toDisplayString(_ctx.i18n.lastEdit),
                  1
                  /* TEXT */
                ),
                _createElementVNode("dd", null, [
                  _createElementVNode("time", {
                    datetime: new Date(_ctx.timeRange.last).toISOString()
                  }, _toDisplayString(_ctx.formatTimestamp(_ctx.timeRange.last)), 9, ["datetime"])
                ])
              ])
            ])) : _createCommentVNode("v-if", true),
            (_openBlock(true), _createElementBlock(
              _Fragment,
              null,
              _renderList(_ctx.sortedGroups, (group) => {
                return _openBlock(), _createElementBlock("div", {
                  key: group.annotations[0].id,
                  class: "review-tool-annotation-viewer__section"
                }, [
                  _createElementVNode(
                    "h4",
                    { class: "review-tool-annotation-viewer__section-title" },
                    _toDisplayString(group.sectionPath || _ctx.i18n.sectionFallback),
                    1
                    /* TEXT */
                  ),
                  _createElementVNode("ul", { class: "review-tool-annotation-viewer__items" }, [
                    (_openBlock(true), _createElementBlock(
                      _Fragment,
                      null,
                      _renderList(group.annotations, (anno) => {
                        return _openBlock(), _createElementBlock("li", {
                          key: anno.id,
                          class: "review-tool-annotation-viewer__item"
                        }, [
                          _createElementVNode(
                            "div",
                            { class: "review-tool-annotation-viewer__quote" },
                            " “" + _toDisplayString(anno.sentenceText) + "” ",
                            1
                            /* TEXT */
                          ),
                          _createElementVNode(
                            "div",
                            { class: "review-tool-annotation-viewer__opinion" },
                            _toDisplayString(anno.opinion),
                            1
                            /* TEXT */
                          ),
                          _createElementVNode(
                            "div",
                            { class: "review-tool-annotation-viewer__meta" },
                            _toDisplayString(anno.createdBy) + " · " + _toDisplayString(_ctx.formatTimestamp(anno.createdAt)),
                            1
                            /* TEXT */
                          ),
                          _createElementVNode("div", { class: "review-tool-annotation-viewer__actions" }, [
                            _createVNode(_component_cdx_button, {
                              size: "small",
                              weight: "quiet",
                              title: _ctx.i18n.edit,
                              disabled: _ctx.busy || !_ctx.props.onEditAnnotation,
                              onClick: _withModifiers(($event) => _ctx.handleEdit(anno.id, group.sectionPath), ["prevent"])
                            }, {
                              default: _withCtx(() => [
                                _createElementVNode(
                                  "span",
                                  { class: "review-tool-control-label" },
                                  _toDisplayString(_ctx.i18n.edit),
                                  1
                                  /* TEXT */
                                )
                              ]),
                              _: 1
                              /* STABLE */
                            }, 8, ["title", "disabled", "onClick"]),
                            _createVNode(_component_cdx_button, {
                              size: "small",
                              weight: "quiet",
                              action: "destructive",
                              title: _ctx.i18n.delete,
                              disabled: _ctx.busy || !_ctx.props.onDeleteAnnotation,
                              onClick: _withModifiers(($event) => _ctx.handleDelete(anno.id, group.sectionPath), ["prevent"])
                            }, {
                              default: _withCtx(() => [
                                _createElementVNode(
                                  "span",
                                  { class: "review-tool-control-label" },
                                  _toDisplayString(_ctx.i18n.delete),
                                  1
                                  /* TEXT */
                                )
                              ]),
                              _: 1
                              /* STABLE */
                            }, 8, ["title", "disabled", "onClick"])
                          ])
                        ]);
                      }),
                      128
                      /* KEYED_FRAGMENT */
                    ))
                  ])
                ]);
              }),
              128
              /* KEYED_FRAGMENT */
            ))
          ], 8, ["aria-busy"]))
        ]),
        _: 1
        /* STABLE */
      }, 8, ["open", "title", "onUpdate:open"]);
    }
    var annotation_viewer_default2;
    var init_annotation_viewer3 = __esm({
      "src/features/annotations/components/annotation-viewer.vue"() {
        "use strict";
        init_vue_runtime();
        init_annotation_viewer2();
        annotation_viewer_default.render = render2;
        annotation_viewer_default2 = annotation_viewer_default;
      }
    });
    function isAnnotationViewerDialogOpen() {
      return Boolean(viewerAppInstance);
    }
    function closeAnnotationViewerDialog() {
      if (viewerAppInstance) {
        viewerAppInstance.open = false;
        closeDialogAfterTransition();
        viewerAppInstance = null;
      }
    }
    function updateAnnotationViewerDialogGroups(groups, canUndoClear) {
      if (viewerAppInstance) {
        viewerAppInstance.groups = groups;
        viewerAppInstance.canUndoClear = canUndoClear;
      }
    }
    async function openAnnotationViewerDialog(options) {
      try {
        const { Vue, Codex } = await loadCodexAndVue();
        await mw.loader.using("mediawiki.Title");
        const { groups: initialGroups = [], ...dialogOptions } = options;
        const app = Vue.createMwApp({
          render: () => Vue.h(annotation_viewer_default2, {
            ...dialogOptions,
            initialGroups,
            ref: (instance) => {
              viewerAppInstance = instance;
            },
            onClosed: () => {
              viewerAppInstance = null;
            }
          })
        });
        registerCodexComponents(app, Codex);
        mountApp(app);
      } catch (error) {
        console.error(
          "[ReviewTool] Failed to open annotation viewer dialog",
          error
        );
        mw.notify(
          context_default.convByVar({
            hant: "無法開啟批註列表。",
            hans: "无法开启批注列表。"
          }),
          {
            type: "error",
            title: "[ReviewTool]"
          }
        );
      }
    }
    var viewerAppInstance;
    var init_annotation_viewer4 = __esm({
      "src/features/annotations/annotation-viewer.ts"() {
        "use strict";
        init_context();
        init_dialog();
        init_annotation_viewer3();
        viewerAppInstance = null;
      }
    });
    function getHeadingTitle(heading) {
      if (!heading) return null;
      const htmlHeading = heading instanceof HTMLHeadingElement ? heading : heading.querySelector("h1, h2, h3, h4, h5, h6");
      if (!htmlHeading) return null;
      if (htmlHeading.id) return htmlHeading.id;
      const innerWithId = htmlHeading.querySelector("[id]");
      if (innerWithId?.id) return innerWithId.id;
      const threadId = htmlHeading.getAttribute("data-mw-thread-id");
      if (threadId) return threadId;
      const text = htmlHeading.textContent?.trim();
      return text || null;
    }
    var init_heading = __esm({
      "src/platform/browser/dom/heading.ts"() {
        "use strict";
      }
    });
    function cleanContainerText(container) {
      const selector = `${TEXT_DECORATIONS}, style, ipe-quick-edit`;
      container.querySelectorAll(selector).forEach((node) => node.remove());
      return (container.textContent ?? "").replace(/Copy permalink/g, "").replace(/\s+/g, " ").trim();
    }
    function getCleanTextFromRange(range) {
      if (!range) return "";
      const wrapper = document.createElement("div");
      wrapper.appendChild(range.cloneContents());
      return cleanContainerText(wrapper);
    }
    function previousNode(node) {
      if (!node) return null;
      if (node.previousSibling) {
        let p = node.previousSibling;
        while (p?.lastChild) p = p.lastChild;
        return p;
      }
      return node.parentNode;
    }
    function findHeadingElementFromNode(node) {
      let cur = node;
      while (cur) {
        if (cur instanceof Element) {
          const el = cur;
          const tag = el.tagName.toLowerCase();
          if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) return el;
          if (el.classList.contains("mw-heading")) return el;
        }
        cur = cur.parentNode;
      }
      return null;
    }
    function getHeadingLevelAndTitle(el) {
      if (!el) return { level: null, title: null };
      const tag = el.tagName.toLowerCase();
      if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
        const level = parseInt(tag.charAt(1), 10);
        const title = getHeadingTitle(el) || null;
        return { level, title };
      }
      const inner = el.querySelector("h1,h2,h3,h4,h5,h6");
      if (inner) {
        const lvl = parseInt(inner.tagName.charAt(1), 10);
        const title = getHeadingTitle(el) || getHeadingTitle(inner) || null;
        return { level: lvl, title };
      }
      const t = getHeadingTitle(el);
      return { level: null, title: t };
    }
    function computeSectionPathFromNode(startNode) {
      const pageFallback = context_default.articleTitle || context_default.convByVar({ hant: "導言", hans: "导言" });
      if (!startNode) return pageFallback;
      let anchor = startNode;
      if (anchor.nodeType === Node.TEXT_NODE) anchor = anchor.parentNode;
      if (!anchor) return pageFallback;
      const nearestByLevel = /* @__PURE__ */ new Map();
      let nextLevel = 7;
      let cur = anchor;
      while (cur) {
        cur = previousNode(cur);
        if (!cur) break;
        const hEl = findHeadingElementFromNode(cur);
        if (!hEl) continue;
        const info = getHeadingLevelAndTitle(hEl);
        if (!info.title || info.level === null) continue;
        if (info.level === 1) continue;
        if (info.level >= nextLevel) continue;
        nextLevel = info.level;
        nearestByLevel.set(info.level, info.title);
        if (info.level === 2) break;
      }
      if (nearestByLevel.size === 0) return pageFallback;
      const parts = [];
      for (let lvl = 2; lvl <= 6; lvl++) {
        const title = nearestByLevel.get(lvl);
        if (title) parts.push(title);
      }
      return parts.join("—");
    }
    var TEXT_DECORATIONS;
    var init_article_text = __esm({
      "src/platform/browser/dom/article-text.ts"() {
        "use strict";
        init_context();
        init_heading();
        init_reference_links();
        TEXT_DECORATIONS = [
          ".reference",
          ".mw-ref",
          ".citation",
          ".ref",
          ".reference-text",
          ".qeec-ref-tag-copy-btn",
          "[data-reference]",
          "[data-ref]",
          ".reference-note",
          ".review-tool-inline-annotation",
          REFERENCE_CONTROLS_SELECTOR
        ].join(",");
      }
    });
    function countPreviousElementSiblings(node) {
      let index = 0;
      let sibling = node?.previousElementSibling ?? null;
      while (sibling) {
        index++;
        sibling = sibling.previousElementSibling;
      }
      return index;
    }
    function getElementPathArray(element) {
      if (!element) return null;
      const rootEl = document.querySelector("#mw-content-text");
      if (!rootEl || !rootEl.contains(element)) return null;
      const path = [];
      let node = element;
      while (node && node !== rootEl) {
        path.push(countPreviousElementSiblings(node));
        node = node.parentElement;
      }
      if (node !== rootEl) {
        return null;
      }
      path.reverse();
      return path;
    }
    function getElementOrderKey(element) {
      return getElementPathArray(element)?.map((segment) => String(segment).padStart(6, "0")).join(".") ?? null;
    }
    var init_numeric_pos = __esm({
      "src/platform/browser/dom/numeric-pos.ts"() {
        "use strict";
      }
    });
    function wrapArticleSentences(container) {
      function getComputedLang(node) {
        let el = null;
        if (node instanceof Element) el = node;
        el = el ?? node?.parentElement ?? null;
        while (el) {
          const lang = el.getAttribute("lang") || el.getAttribute("xml:lang");
          if (lang) return lang.toLowerCase();
          el = el.parentElement;
        }
        const docLang = document.documentElement?.getAttribute("lang");
        return docLang?.toLowerCase() ?? null;
      }
      function shouldSkipElement(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) return false;
        const el = node;
        if (el.classList.contains(ANNOTATION_CONTAINER_CLASS) || el.classList.contains("review-tool-inline-annotation") || el.matches(REFERENCE_CONTROLS_SELECTOR))
          return true;
        if (el.matches(`${REFERENCE_MARKER_SELECTOR}, .reference-text, .mw-reference-text, .citation, .mw-cite-backlink,
            .references, .mw-references-wrap, .reflist, [id^="cite_note-"],
            table, pre, code, svg, math, script, style, noscript, button, input, select, textarea`))
          return true;
        if (el.hasAttribute("data-gadget") || el.hasAttribute("data-widget"))
          return true;
        const skipClasses = [
          "mw-editsection",
          "mw-indicator",
          "navbox",
          "infobox",
          "metadata",
          "noprint",
          "navigation",
          "catlinks",
          "printfooter",
          "mw-jump-link",
          "skin-",
          // prefix match for skin-specific elements
          "vector-",
          // prefix match for Vector skin elements
          "qeec-ref-tag-copy-btn",
          "ipe__in-article-link",
          "ipe-quick-edit",
          "ipe-quick-edit--create-only"
        ];
        for (const cls of skipClasses) {
          if (el.className && (el.classList.contains(cls) || typeof el.className === "string" && el.className.includes(cls))) {
            return true;
          }
        }
        if (el.id) {
          if (el.id.startsWith("mw-") || el.id.startsWith("footer-") || el.id.startsWith("p-") || el.id === "siteSub" || el.id === "contentSub") {
            return true;
          }
        }
        return false;
      }
      function createSentenceSpan(content) {
        const span = document.createElement("span");
        span.className = `${ANNOTATION_CONTAINER_CLASS} ${SENTENCE_CLASS}`;
        span.append(content);
        return span;
      }
      function wrapTextNode(node, parts) {
        const content = parts.length > 1 ? parts : [node.data];
        node.replaceWith(...content.map(createSentenceSpan));
      }
      function processElementRoot(root) {
        if (shouldSkipElement(root)) return;
        const allowHalfWidth = shouldTreatHalfWidthTerminators(
          getComputedLang(root)
        );
        const elementChildren = Array.from(root.children);
        const hasNonInlineElementChildren = elementChildren.some(
          (el) => !INLINE_TAGS.has(el.tagName.toLowerCase())
        );
        if (hasNonInlineElementChildren) {
          Array.from(root.childNodes).forEach((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
              const textNode = child;
              const text = textNode.nodeValue || "";
              if (!text.trim()) return;
              const parts = splitTextIntoRanges(
                text,
                getComputedLang(textNode)
              ).map((r) => text.slice(r.start, r.end)).filter((p) => p.trim());
              wrapTextNode(textNode, parts);
            } else if (child.nodeType === Node.ELEMENT_NODE) {
              processElementRoot(child);
            }
          });
          return;
        }
        const filterNode = (node) => {
          if (node.nodeType !== Node.TEXT_NODE) return NodeFilter.FILTER_SKIP;
          let parent = node.parentElement;
          while (parent && parent !== root) {
            if (shouldSkipElement(parent)) {
              return NodeFilter.FILTER_REJECT;
            }
            parent = parent.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        };
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode: filterNode
        });
        const segments = [];
        let acc = "";
        let tn = walker.nextNode();
        while (tn) {
          const t = tn.nodeValue || "";
          if (t) {
            segments.push({
              node: tn,
              start: acc.length,
              end: acc.length + t.length
            });
            acc += t;
          }
          tn = walker.nextNode();
        }
        if (!segments.length) return;
        const ranges = splitTextIntoRanges(acc, getComputedLang(root));
        const mapped = [];
        for (const r of ranges) {
          let startNode = null;
          let startOffset = 0;
          let endNode = null;
          let endOffset = 0;
          for (const seg of segments) {
            if (r.start >= seg.start && r.start <= seg.end) {
              startNode = seg.node;
              startOffset = r.start - seg.start;
            }
            if (r.end >= seg.start && r.end <= seg.end) {
              endNode = seg.node;
              endOffset = r.end - seg.start;
            }
            if (startNode && endNode) break;
          }
          if (startNode && endNode) {
            mapped.push({
              startNode,
              startOffset,
              endNode,
              endOffset,
              absStart: r.start,
              absEnd: r.end
            });
          }
        }
        if (!mapped.length) return;
        mapped.sort((a, b) => b.absStart - a.absStart);
        let successCount = 0;
        for (const m of mapped) {
          if (m.absStart >= m.absEnd) continue;
          try {
            if (!m.startNode.isConnected || !m.endNode.isConnected) {
              console.warn(
                "[ReviewTool] mapped nodes not connected, skipping",
                m
              );
              continue;
            }
            if (!root.contains(m.startNode) || !root.contains(m.endNode)) {
              console.warn(
                "[ReviewTool] mapped nodes no longer in root, skipping",
                m
              );
              continue;
            }
            const range = document.createRange();
            range.setStart(m.startNode, m.startOffset);
            range.setEnd(m.endNode, m.endOffset);
            const frag = range.extractContents();
            range.insertNode(createSentenceSpan(frag));
            successCount++;
          } catch (e) {
            console.warn(
              "[ReviewTool] range wrapping failed for one range, continuing",
              e,
              m
            );
          }
        }
        if (successCount === 0) {
          console.warn(
            "[ReviewTool] no mapped ranges wrapped successfully, performing fallback wrapping for this root"
          );
          const walker2 = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            { acceptNode: filterNode }
          );
          const nodes = [];
          let tn2;
          while (tn2 = walker2.nextNode()) nodes.push(tn2);
          for (const tn22 of nodes) {
            const text = tn22.nodeValue || "";
            if (!text.trim()) {
              continue;
            }
            const parts = splitTextToPartsSimple(text, allowHalfWidth);
            wrapTextNode(tn22, parts);
          }
        }
      }
      Array.from(container.childNodes).filter((node) => !shouldSkipElement(node)).forEach((rootNode) => {
        if (rootNode.nodeType === Node.ELEMENT_NODE) {
          processElementRoot(rootNode);
        } else if (rootNode.nodeType === Node.TEXT_NODE) {
          const textNode = rootNode;
          const text = textNode.textContent || "";
          if (!text.trim()) return;
          const parts = splitTextToPartsSimple(
            text,
            shouldTreatHalfWidthTerminators(getComputedLang(textNode))
          );
          wrapTextNode(textNode, parts);
        }
      });
    }
    function clearWrappedSentences(container) {
      container.querySelectorAll(SENTENCE_SELECTOR).forEach((el) => {
        const parent = el.parentNode;
        if (!parent) return;
        const frag = document.createDocumentFragment();
        while (el.firstChild) {
          frag.appendChild(el.firstChild);
        }
        parent.replaceChild(frag, el);
      });
    }
    var ANNOTATION_CONTAINER_CLASS, SENTENCE_CLASS, SENTENCE_SELECTOR, INLINE_TAGS;
    var init_sentence_wrapping = __esm({
      "src/platform/browser/dom/sentence-wrapping.ts"() {
        "use strict";
        init_sentences();
        init_reference_links();
        ANNOTATION_CONTAINER_CLASS = "review-tool-annotation-ui";
        SENTENCE_CLASS = "sentence";
        SENTENCE_SELECTOR = ".review-tool-annotation-ui.sentence";
        INLINE_TAGS = /* @__PURE__ */ new Set([
          "a",
          "span",
          "em",
          "strong",
          "b",
          "i",
          "small",
          "sup",
          "sub",
          "code",
          "cite",
          "abbr",
          "time",
          "mark",
          "var",
          "img",
          "kbd"
        ]);
      }
    });
    function installArticleSelection(root, annotate) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "review-tool-annotation-ui floating-button";
      button.textContent = context_default.convByVar({ hant: "批註", hans: "批注" });
      button.style.display = "none";
      document.body.appendChild(button);
      let selecting = false;
      let dragged = false;
      let pressPosition = null;
      let selectionTimer;
      let hideTimer;
      const hide = () => {
        window.clearTimeout(hideTimer);
        button.style.display = "none";
        button.onclick = null;
      };
      const insideButton = (event) => event.target instanceof Node && button.contains(event.target);
      const selectedRange = () => {
        const selection = document.getSelection();
        if (!selection?.rangeCount || selection.isCollapsed) return null;
        const range = selection.getRangeAt(0);
        return root.contains(range.startContainer) && root.contains(range.endContainer) ? range : null;
      };
      const show = (range) => {
        const text = getCleanTextFromRange(range);
        if (!text) {
          hide();
          return;
        }
        const savedRange = range.cloneRange();
        const node = range.startContainer;
        const element = node instanceof Element ? node : node.parentElement;
        const sentence = element?.closest(SENTENCE_SELECTOR) ?? element;
        const position = getElementOrderKey(sentence) ?? "";
        const rect = range.getBoundingClientRect();
        const centerX = Math.max(
          40,
          Math.min(window.innerWidth - 40, rect.left + rect.width / 2)
        );
        window.clearTimeout(hideTimer);
        button.style.left = `${centerX + window.scrollX}px`;
        button.style.top = `${Math.max(8, rect.top + window.scrollY - 8)}px`;
        button.style.display = "block";
        button.onclick = (event) => {
          event.preventDefault();
          event.stopPropagation();
          hide();
          window.clearTimeout(selectionTimer);
          if (!root.isConnected || !root.contains(savedRange.commonAncestorContainer))
            return;
          document.getSelection()?.removeAllRanges();
          annotate(savedRange, text, position);
        };
      };
      const onSelectionChange = () => {
        window.clearTimeout(selectionTimer);
        if (selecting) return;
        selectionTimer = window.setTimeout(() => {
          const range = selectedRange();
          if (root.isConnected && range) show(range);
          else hide();
        }, 120);
      };
      const onPress = (event) => {
        if (insideButton(event)) return;
        dragged = false;
        pressPosition = event instanceof MouseEvent ? { x: event.clientX, y: event.clientY } : null;
        selecting = true;
        window.clearTimeout(selectionTimer);
        document.documentElement.classList.add("rt-selecting");
        hide();
      };
      const onRelease = (event) => {
        dragged = event instanceof MouseEvent && pressPosition !== null && (Math.abs(event.clientX - pressPosition.x) > 3 || Math.abs(event.clientY - pressPosition.y) > 3);
        pressPosition = null;
        selecting = false;
        document.documentElement.classList.remove("rt-selecting");
        if (!insideButton(event)) onSelectionChange();
      };
      const onClick = (event) => {
        if (!(event.target instanceof Element) || event.target.closest(
          `${REFERENCE_MARKER_SELECTOR}, ${REFERENCE_CONTROLS_SELECTOR}, .review-tool-inline-annotation`
        ))
          return;
        const sentence = event.target.closest(SENTENCE_SELECTOR);
        if (!sentence || !root.contains(sentence) || dragged || !document.getSelection()?.isCollapsed)
          return;
        event.preventDefault();
        event.stopPropagation();
        const range = document.createRange();
        range.selectNodeContents(sentence);
        const selection = document.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        show(range);
      };
      button.onmouseenter = () => window.clearTimeout(hideTimer);
      button.onmouseleave = () => {
        hideTimer = window.setTimeout(hide, 180);
      };
      root.addEventListener("click", onClick);
      document.addEventListener("selectionchange", onSelectionChange);
      document.addEventListener("mousedown", onPress);
      document.addEventListener("mouseup", onRelease);
      document.addEventListener("touchstart", onPress, { passive: true });
      document.addEventListener("touchend", onRelease);
      document.addEventListener("touchcancel", onRelease);
      return () => {
        window.clearTimeout(selectionTimer);
        window.clearTimeout(hideTimer);
        document.documentElement.classList.remove("rt-selecting");
        root.removeEventListener("click", onClick);
        document.removeEventListener("selectionchange", onSelectionChange);
        document.removeEventListener("mousedown", onPress);
        document.removeEventListener("mouseup", onRelease);
        document.removeEventListener("touchstart", onPress);
        document.removeEventListener("touchend", onRelease);
        document.removeEventListener("touchcancel", onRelease);
        button.remove();
      };
    }
    var init_article_selection = __esm({
      "src/platform/browser/dom/article-selection.ts"() {
        "use strict";
        init_context();
        init_article_text();
        init_numeric_pos();
        init_reference_links();
        init_sentence_wrapping();
      }
    });
    function sanitizePlainText(text) {
      if (!text) return "";
      let s = text.replace(/\[\s*\d+\s*\]/g, "");
      s = s.replace(/[\u00B9\u00B2\u00B3\u2070-\u2079]+/g, "");
      return s.replace(/\s+/g, " ").trim();
    }
    function getArticleContentContainer() {
      const selectors = [
        "#mw-content-text .mw-parser-output",
        "#mw-content-text",
        ".mw-parser-output",
        "#content",
        "#bodyContent"
      ];
      for (const selector of selectors) {
        const container = document.querySelector(selector);
        if (container) return container;
      }
      return null;
    }
    function restoreInlineAnnotationBubbles(pageName) {
      const container = getArticleContentContainer();
      if (!container) return;
      const annotations = loadAnnotations(pageName).annotations;
      const ids = new Set(annotations.map((annotation) => annotation.id));
      inlineAnnotationBubbles.forEach((bubble, id) => {
        if (!container.contains(bubble) || !ids.has(id))
          removeInlineAnnotationBubble(id);
      });
      const missing = annotations.filter(
        (annotation) => !inlineAnnotationBubbles.has(annotation.id)
      );
      if (!missing.length) return;
      const index = buildArticleTextIndex(container);
      const placements = missing.map((annotation) => ({
        annotation,
        range: findAnnotationRange(
          index,
          annotation,
          computeSectionPathFromNode
        )
      }));
      for (const { annotation, range } of placements) {
        if (!range) continue;
        insertInlineAnnotationBubble(
          range,
          pageName,
          annotation.sectionPath,
          annotation.id,
          annotation.opinion
        );
      }
    }
    function clearAllInlineAnnotationBubbles() {
      inlineAnnotationBubbles.forEach((bubble) => bubble.remove());
      inlineAnnotationBubbles.clear();
      document.querySelectorAll(".review-tool-inline-annotation").forEach((bubble) => {
        bubble.remove();
      });
    }
    function createInlineAnnotationBubbleElement(pageName, sectionPath, annotationId, opinion) {
      const bubble = document.createElement("span");
      bubble.className = "review-tool-inline-annotation";
      bubble.dataset.annoId = annotationId;
      bubble.title = opinion;
      const icon = document.createElement("button");
      icon.type = "button";
      icon.className = "review-tool-inline-annotation__icon";
      icon.textContent = "💬";
      icon.title = opinion;
      icon.setAttribute(
        "aria-label",
        context_default.convByVar({ hant: "編輯批註", hans: "编辑批注" })
      );
      icon.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        void openAnnotationDialog(pageName, annotationId, sectionPath);
      };
      bubble.appendChild(icon);
      return bubble;
    }
    function insertInlineAnnotationBubble(range, pageName, sectionPath, annotationId, opinion) {
      if (!range) {
        console.warn(
          "[ReviewTool] Cannot insert inline annotation bubble without a selection range."
        );
        return;
      }
      removeInlineAnnotationBubble(annotationId);
      const bubble = createInlineAnnotationBubbleElement(
        pageName,
        sectionPath,
        annotationId,
        opinion
      );
      inlineAnnotationBubbles.set(annotationId, bubble);
      const insertionRange = range.cloneRange();
      insertionRange.collapse(false);
      insertionRange.insertNode(bubble);
    }
    function updateInlineAnnotationBubble(annotationId, opinion) {
      const bubble = inlineAnnotationBubbles.get(annotationId);
      if (!bubble) return;
      bubble.title = opinion;
      if (bubble.firstElementChild) {
        bubble.firstElementChild.title = opinion;
      }
    }
    function removeInlineAnnotationBubble(annotationId) {
      const bubble = inlineAnnotationBubbles.get(annotationId);
      if (!bubble) return;
      bubble.remove();
      inlineAnnotationBubbles.delete(annotationId);
    }
    async function openAnnotationDialog(pageName, annotationId, sectionPath, options = {}) {
      const selectionRange = options.selectionRange?.cloneRange() ?? null;
      const isEdit = annotationId !== null;
      const existingAnnotation = isEdit && annotationId ? getAnnotation(pageName, annotationId) : null;
      const displaySentenceText = isEdit ? existingAnnotation?.sentenceText || "" : sanitizePlainText(options.sentenceText || "");
      const initialOpinion = isEdit ? existingAnnotation?.opinion || "" : "";
      let shouldReopenViewer = isAnnotationViewerDialogOpen();
      sectionPath = sectionPath === "目次" ? "序言" : sectionPath;
      try {
        const container = getArticleContentContainer();
        const sourceRange = selectionRange ?? (container && existingAnnotation ? findAnnotationRange(
          buildArticleTextIndex(container),
          existingAnnotation,
          computeSectionPathFromNode
        ) : null);
        const relatedSources = container ? collectRelatedSources(container, sourceRange) : [];
        if (shouldReopenViewer) {
          closeAnnotationViewerDialog();
        }
        const result = await openAnnotationEditorDialog({
          sectionPath,
          sentenceText: displaySentenceText,
          relatedSources,
          initialOpinion,
          mode: isEdit ? "edit" : "create",
          allowDelete: isEdit
        });
        if (result.action === "replaced") {
          shouldReopenViewer = false;
          return;
        }
        if (result.action === "cancel") {
          return;
        }
        if (result.action === "delete" && isEdit && annotationId) {
          const removed = deleteAnnotation(pageName, annotationId);
          if (removed) {
            removeInlineAnnotationBubble(annotationId);
          }
          return;
        }
        if (result.action === "save") {
          if (isEdit && annotationId) {
            const updated = updateAnnotation(pageName, annotationId, {
              opinion: result.opinion
            });
            if (updated) {
              updateInlineAnnotationBubble(annotationId, result.opinion);
            }
          } else {
            const sentencePosKey = options.sentencePos || "";
            const container2 = getArticleContentContainer();
            const textAnchor = container2 && selectionRange ? captureAnnotationAnchor(
              buildArticleTextIndex(container2),
              selectionRange
            ) : void 0;
            const created = createAnnotation(
              pageName,
              sectionPath,
              displaySentenceText,
              result.opinion,
              sentencePosKey,
              textAnchor
            );
            insertInlineAnnotationBubble(
              selectionRange,
              pageName,
              sectionPath,
              created.id,
              result.opinion
            );
          }
        }
      } catch (error) {
        console.error("[ReviewTool] Annotation action failed", error);
        mw.notify(
          context_default.convByVar({
            hant: "無法完成批註操作，請檢查瀏覽器儲存空間後重試。",
            hans: "无法完成批注操作，请检查浏览器存储空间后重试。"
          }),
          { type: "error", tag: "review-tool" }
        );
      } finally {
        if (shouldReopenViewer) {
          showAnnotationViewer(pageName);
        }
      }
    }
    function refreshAnnotationViewer(pageName) {
      updateAnnotationViewerDialogGroups(
        buildAnnotationGroups(pageName),
        canUndoClearAnnotations(pageName)
      );
    }
    function restoreClearedPageAnnotations(pageName) {
      try {
        const restored = undoClearAnnotations(pageName);
        refreshAnnotationViewer(pageName);
        restoreInlineAnnotationBubbles(pageName);
        mw.notify(
          context_default.convByVar({
            hant: `已復原 ${restored} 則批註。`,
            hans: `已恢复 ${restored} 条批注。`
          }),
          { tag: "review-tool-clear" }
        );
        return true;
      } catch (error) {
        console.error(
          "[ReviewTool] Failed to restore cleared annotations",
          error
        );
        mw.notify(
          context_default.convByVar({
            hant: "無法復原批註，請檢查瀏覽器儲存空間後重試。",
            hans: "无法恢复批注，请检查浏览器存储空间后重试。"
          }),
          { type: "error", tag: "review-tool" }
        );
        return false;
      }
    }
    function clearPageAnnotations(pageName) {
      if (!clearAnnotations(pageName)) return false;
      clearAllInlineAnnotationBubbles();
      refreshAnnotationViewer(pageName);
      const message = document.createElement("span");
      message.textContent = context_default.convByVar({
        hant: "已清除本頁批註。",
        hans: "已清除本页批注。"
      });
      const undo = document.createElement("button");
      undo.type = "button";
      undo.className = "review-tool-undo-clear";
      undo.textContent = context_default.convByVar({ hant: "復原清除", hans: "撤销清除" });
      undo.onclick = (event) => {
        event.stopPropagation();
        restoreClearedPageAnnotations(pageName);
      };
      message.appendChild(undo);
      mw.notify(message, { autoHide: false, tag: "review-tool-clear" });
      return true;
    }
    function showAnnotationViewer(pageName) {
      if (isAnnotationViewerDialogOpen()) {
        closeAnnotationViewerDialog();
        return;
      }
      const groups = buildAnnotationGroups(pageName);
      void openAnnotationViewerDialog({
        pageName,
        groups,
        initialCanUndoClear: canUndoClearAnnotations(pageName),
        onEditAnnotation: (annotationId, sectionPath) => {
          void openAnnotationDialog(pageName, annotationId, sectionPath);
        },
        onDeleteAnnotation: (annotationId) => {
          const removed = deleteAnnotation(pageName, annotationId);
          if (removed) {
            removeInlineAnnotationBubble(annotationId);
            refreshAnnotationViewer(pageName);
          }
        },
        onClearAllAnnotations: () => clearPageAnnotations(pageName),
        onUndoClearAnnotations: () => restoreClearedPageAnnotations(pageName),
        onImportAnnotations: (json) => {
          const imported = importAnnotations(pageName, json);
          refreshAnnotationViewer(pageName);
          restoreInlineAnnotationBubbles(pageName);
          return imported;
        }
      });
    }
    function addMainPageReviewToolButtonsToDOM(pageName) {
      restoreInlineAnnotationBubbles(pageName);
      addGlobalAnnotationViewerButton(pageName);
      syncAnnotationModeMenuState(annotationModeActive, pageName);
      if (annotationModeActive) installArticleInteractions(pageName);
    }
    function addGlobalAnnotationViewerButton(pageName) {
      if (document.querySelector(".review-tool-global-button")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "review-tool-global-button";
      btn.textContent = context_default.convByVar({ hant: "查看批註", hans: "查看批注" });
      btn.title = context_default.convByVar({
        hant: "查看本頁所有批註",
        hans: "查看本页所有批注"
      });
      btn.onclick = () => showAnnotationViewer(context_default.articleTitle || pageName);
      document.body.appendChild(btn);
    }
    async function toggleArticleAnnotationMode(pageName) {
      if (annotationActivationPending) return;
      const container = getArticleContentContainer();
      if (!annotationModeActive) {
        if (!container) return;
        annotationActivationPending = true;
        try {
          await confirmClearOnFirstActivation(pageName, () => {
            clearPageAnnotations(pageName);
          });
        } catch (error) {
          console.error("[ReviewTool] Failed to clear annotations", error);
          mw.notify(
            context_default.convByVar({
              hant: "無法清除批註，已保留原有批註。",
              hans: "无法清除批注，已保留原有批注。"
            }),
            {
              type: "error",
              tag: "review-tool-clear"
            }
          );
        } finally {
          annotationActivationPending = false;
        }
      }
      annotationModeActive = !annotationModeActive;
      const isActive = annotationModeActive;
      syncAnnotationModeMenuState(isActive, pageName);
      document.documentElement.classList.toggle(
        "review-tool-annotation-mode",
        isActive
      );
      mw.notify(
        context_default.convByVar({
          hant: isActive ? "批註模式已啟用。" : "批註模式已停用。",
          hans: isActive ? "批注模式已启用。" : "批注模式已停用。"
        }),
        { tag: "review-tool" }
      );
      if (isActive) installArticleInteractions(pageName);
      else {
        removeArticleInteractions?.();
        removeArticleInteractions = null;
      }
    }
    function installArticleInteractions(pageName) {
      removeArticleInteractions?.();
      removeArticleInteractions = null;
      const container = getArticleContentContainer();
      if (!container) return;
      wrapArticleSentences(container);
      const removeSelection = installArticleSelection(
        container,
        (range, sentenceText, sentencePos) => {
          void openAnnotationDialog(
            pageName,
            null,
            computeSectionPathFromNode(range.startContainer),
            {
              sentenceText,
              selectionRange: range,
              sentencePos
            }
          );
        }
      );
      const removeReferences = installReferenceLinkTips(container);
      removeArticleInteractions = () => {
        removeSelection();
        removeReferences();
        clearWrappedSentences(container);
      };
    }
    function getReviewToolPortletLabel(isActive) {
      return context_default.convByVar({
        hant: isActive ? "關閉批註模式" : "啟用批註模式",
        hans: isActive ? "关闭批注模式" : "开启批注模式"
      });
    }
    function syncAnnotationModeMenuState(isActive, pageName) {
      addPortletTrigger(
        REVIEWTOOL_PORTLET_ID,
        getReviewToolPortletLabel(isActive),
        () => {
          void toggleArticleAnnotationMode(pageName);
        }
      );
      const portlet = document.getElementById(REVIEWTOOL_PORTLET_ID);
      if (portlet) {
        portlet.classList.toggle("selected", isActive);
      }
    }
    var inlineAnnotationBubbles, removeArticleInteractions, annotationModeActive, annotationActivationPending, REVIEWTOOL_PORTLET_ID;
    var init_article_controller = __esm({
      "src/app/article-controller.ts"() {
        "use strict";
        init_portlet();
        init_context();
        init_annotation_session();
        init_reference_links();
        init_related_sources();
        init_annotations2();
        init_annotation_editor4();
        init_annotation_viewer4();
        init_article_text();
        init_article_selection();
        init_sentence_wrapping();
        init_annotation_anchor();
        inlineAnnotationBubbles = /* @__PURE__ */ new Map();
        removeArticleInteractions = null;
        annotationModeActive = false;
        annotationActivationPending = false;
        REVIEWTOOL_PORTLET_ID = "ca-reviewtool-toggle";
      }
    });
    var main_exports = {};
    __export(main_exports, {
      init: () => init
    });
    function injectStyles(css) {
      if (!css || document.getElementById("review-tool-styles")) return;
      const style = document.createElement("style");
      style.id = "review-tool-styles";
      style.textContent = css;
      document.head.appendChild(style);
    }
    function initialize() {
      const namespace = mw.config.get("wgNamespaceNumber");
      const pageName = mw.config.get("wgPageName");
      if (namespace !== 0 || mw.config.get("wgAction") !== "view") {
        return;
      }
      injectStyles(styles_default);
      context_default.articleTitle = pageName;
      mw.hook("wikipage.content").add(
        () => addMainPageReviewToolButtonsToDOM(pageName)
      );
    }
    function init() {
      initialization ??= Promise.resolve().then(initialize).catch((error) => {
        initialization = null;
        throw error;
      });
      return initialization;
    }
    var initialization;
    var init_main = __esm({
      "src/app/main.ts"() {
        "use strict";
        init_context();
        init_styles();
        init_article_controller();
        initialization = null;
      }
    });
    function waitForMediaWiki() {
      return new Promise((resolve) => {
        const queue = window.RLQ ?? [];
        window.RLQ = queue;
        queue.push(() => resolve());
      });
    }
    async function startReviewTool() {
      await waitForMediaWiki();
      await mw.loader.using("mediawiki.util");
      const { init: init2 } = await Promise.resolve().then(() => (init_main(), main_exports));
      await init2();
    }
    if (!window.reviewToolLite) {
      const startup = startReviewTool();
      window.reviewToolLite = startup;
      void startup.catch((error) => {
        if (window.reviewToolLite === startup) delete window.reviewToolLite;
        console.error("[ReviewTool] Initialization failed", error);
      });
    }
  }
  function installInPage(application) {
    const script = document.createElement("script");
    script.textContent = "(" + application.toString() + ")();";
    document.documentElement.appendChild(script);
    script.remove();
  }
  installInPage(reviewToolApplication);
})();
// </nowiki>
