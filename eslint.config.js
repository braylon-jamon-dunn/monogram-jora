// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    pnpm: true,
    ignores: [
      // Vendored Monogram engine (git submodule) — not ours to lint.
      'monogram',
      // Generated Monogram artifacts (regenerate via `pnpm run regen`).
      'grammar/**/*.json',
      'grammar/jora.cst-match.ts',
      'grammar/tree-sitter',
    ],
  },
)
