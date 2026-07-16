import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The Monogram engine is vendored as a git submodule (with its own nested
    // submodules and test files). Keep it out of our test discovery — CI checks
    // out submodules recursively, which would otherwise surface Monogram's own
    // *.test.ts (some importing `vscode`, which we don't install).
    exclude: [...configDefaults.exclude, 'monogram/**'],
  },
})
