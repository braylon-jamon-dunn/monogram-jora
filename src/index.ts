// Public entry point for `monogram-jora`.
//
// The portable, publishable artifacts are the files Monogram derives from
// `grammar/jora.ts` (see the repo README). They are committed under `grammar/`
// and re-exported here so consumers can `import { tmLanguage } from
// 'monogram-jora'` without pulling in Monogram itself (which is a git submodule,
// not an npm dependency).

import joraLanguageConfiguration from '../grammar/jora.language-configuration.json' with { type: 'json' }
import joraMonarch from '../grammar/jora.monarch.json' with { type: 'json' }
import joraTmLanguage from '../grammar/jora.tmLanguage.json' with { type: 'json' }

/** A TextMate grammar (`.tmLanguage.json`) suitable for VS Code / Sublime. */
export interface TextMateGrammar {
  name: string
  scopeName: string
  patterns: unknown[]
  repository?: Record<string, unknown>
  [key: string]: unknown
}

/** A VS Code language configuration (comments, brackets, auto-close, folding). */
export interface LanguageConfiguration {
  [key: string]: unknown
}

/** A Monaco Monarch tokenizer definition. */
export interface MonarchLanguage {
  [key: string]: unknown
}

/** The Jora TextMate grammar, derived from `grammar/jora.ts` by Monogram. */
export const tmLanguage: TextMateGrammar = joraTmLanguage as unknown as TextMateGrammar

/** The Jora VS Code language configuration, derived from `grammar/jora.ts`. */
export const languageConfiguration: LanguageConfiguration = joraLanguageConfiguration as unknown as LanguageConfiguration

/** The Jora Monaco Monarch tokenizer, derived from `grammar/jora.ts`. */
export const monarch: MonarchLanguage = joraMonarch as unknown as MonarchLanguage

export default tmLanguage
