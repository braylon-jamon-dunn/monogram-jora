# monogram-jora

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

Syntax-highlighting artifacts for the [Jora](https://github.com/discoveryjs/jora)
query language, derived from a single grammar definition with
[Monogram](https://github.com/johnsoncodehk/monogram).

You write the grammar once in Monogram's combinator API
([`grammar/jora.ts`](./grammar/jora.ts)); Monogram derives the TextMate grammar,
a VS Code language configuration, a Monaco Monarch tokenizer, and a tree-sitter
grammar from it.

> **Status:** early setup. `grammar/jora.ts` is currently a **stub** covering
> only part of Jora's surface syntax — enough to prove the generation pipeline
> end-to-end. Fleshing it out into a complete, conformance-proven grammar is
> follow-up work.

## Layout

- [`monogram/`](./monogram) — the Monogram engine, pinned as a **git submodule**.
  Clone with `git clone --recurse-submodules`, or run
  `git submodule update --init` in an existing checkout.
- [`grammar/jora.ts`](./grammar/jora.ts) — the Jora grammar definition (the
  source of truth). It imports Monogram's API from the submodule.
- `grammar/jora.tmLanguage.json`, `grammar/jora.language-configuration.json`,
  `grammar/jora.monarch.json`, `grammar/jora.cst-match.ts`,
  `grammar/tree-sitter/jora/*` — **generated** artifacts, committed to the repo.

## Regenerating

Requires **Node 24+** (Monogram runs `.ts` directly).

```bash
pnpm run regen   # node monogram/src/cli.ts grammar/jora.ts
```

`pnpm run build` regenerates before building, and CI fails if the committed
artifacts drift from `grammar/jora.ts`. Edit the grammar, run `regen`, and
commit the resulting diff.

## Usage

The generated files are re-exported from the package:

```ts
import { languageConfiguration, monarch, tmLanguage } from 'monogram-jora'
```

## Note for Developers

This starter recommands using [npm Trusted Publisher](https://github.com/e18e/ecosystem-issues/issues/201), where the release is done on CI to ensure the security of the packages.

To do so, you need to run `pnpm publish` manually for the very first time to create the package on npm, and then go to `https://www.npmjs.com/package/<your-package-name>/access` to set the connection to your GitHub repo.

Then for the future releases, you can run `pnpm run release` to do the release and the GitHub Actions will take care of the release process.

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg">
    <img src="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg" alt="Sponsors"/>
  </a>
</p>

## License

[MIT](./LICENSE) License © [Anthony Fu](https://github.com/antfu)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/monogram-jora?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmx.dev/package/monogram-jora
[npm-downloads-src]: https://img.shields.io/npm/dm/monogram-jora?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmx.dev/package/monogram-jora
[bundle-src]: https://img.shields.io/bundlephobia/minzip/monogram-jora?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=monogram-jora
[license-src]: https://img.shields.io/github/license/antfu/monogram-jora.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/antfu/monogram-jora/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/monogram-jora
