import { defineConfig } from 'tsdown'
import { StaleGuardRecorder } from 'tsdown-stale-guard'

export default defineConfig({
  entry: [
    'src/index.ts',
  ],
  dts: true,
  exports: {
    // Ship the raw, generated grammar JSON alongside the bundled JS re-exports,
    // so consumers that need an actual file on disk (VS Code extensions,
    // oniguruma/shiki-style highlighters, etc.) can resolve it directly
    // instead of only getting the values baked into dist/index.mjs.
    customExports(exports) {
      exports['./grammar/jora.tmLanguage.json'] = './grammar/jora.tmLanguage.json'
      exports['./grammar/jora.monarch.json'] = './grammar/jora.monarch.json'
      exports['./grammar/jora.language-configuration.json'] = './grammar/jora.language-configuration.json'
      return exports
    },
  },
  publint: true,
  plugins: [
    StaleGuardRecorder(),
  ],
})
