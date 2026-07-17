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
  {
    // The grammar is a set of mutually-recursive rule thunks, so forward
    // references between rule consts are expected and safe (evaluated lazily).
    files: ['grammar/**/*.ts'],
    rules: {
      'ts/no-use-before-define': 'off',
      'no-use-before-define': 'off',
    },
  },
  {
    // The corpus holds Jora source strings that legitimately contain `${…}`.
    files: ['test/grammar-corpus.test.ts'],
    rules: {
      'no-template-curly-in-string': 'off',
    },
  },
)
