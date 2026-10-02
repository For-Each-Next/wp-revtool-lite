/**
 * @file src/platform/mediawiki/context.ts
 * Purpose: src / platform / mediawiki / context module.
 *
 * Table of contents:
 * 1. Imports
 * 2. State
 * 3. Exports
 */

import type { TranslateVariants } from '../../shared/translation';
import { translateVariants } from '../../i18n/language';

/** MediaWiki page context and interface-language selection. */
class State {
    convByVar: TranslateVariants = (variants) =>
        translateVariants(
            variants,
            mw.config.get('wgUserVariant') || mw.config.get('wgUserLanguage'),
        );

    // 當前條目標題
    articleTitle = '';

    // 用戶名
    get userName(): string {
        return mw.config.get('wgUserName') || 'Example';
    }
}

export default new State();
