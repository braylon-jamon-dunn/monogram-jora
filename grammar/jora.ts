// Jora grammar for Monogram — STUB.
//
// This is an intentionally minimal, first-pass definition of the Jora query
// language (https://github.com/discoveryjs/jora) written with Monogram's
// combinator API. It covers enough of the surface syntax — comments, literals,
// identifiers, `$`-variables, the common operators, and member/bracket/call
// access — to derive a genuine set of highlighter artifacts via Monogram's CLI.
//
// It is NOT a complete or conformance-proven Jora grammar. Whole areas are
// deliberately deferred (template & regex literals, object/array literals,
// slice notation `[a:b:c]`, mapping/filtering sugar `.(…)` / `.[…]` / `..(…)`,
// variable declarations `$x: expr;`, arrow functions `=> …`, the `is`/`in`/
// `has`/`has no`/`not in` word operators, and validation against Jora's real
// test corpus). Those are follow-up work; see the repo README.

import {
  altPattern,
  defineGrammar,
  left,
  none,
  noneOf,
  oneOf,
  op,
  optPattern,
  plus,
  prefix,
  range,
  right,
  rule,
  sep,
  seq,
  star,
  token,
} from '../monogram/src/api.ts'

// ── Pattern building blocks ──
const digit = range('0', '9')
const idStart = oneOf(range('a', 'z'), range('A', 'Z'), '_')
const idCont = oneOf(range('a', 'z'), range('A', 'Z'), digit, '_')

// ── Tokens ──

// Comments are skipped (they never reach the parser as structural nodes) but
// still carry a scope so the derived highlighter colours them.
const LineComment = token(seq('//', star(noneOf('\n'))), {
  skip: true,
  scope: 'comment.line.double-slash.jora',
})
const BlockComment = token(
  seq('/*', star(altPattern(noneOf('*'), seq('*', noneOf('/')))), star('*'), '*/'),
  { skip: true, scope: 'comment.block.jora' },
)

// A bare identifier (property name / method name).
const Ident = token(seq(idStart, star(idCont)), { identifier: true })

// A `$`-variable — `$` alone (the current value) or `$name`.
const Variable = token(seq('$', star(idCont)), { scope: 'variable.other.jora' })

// Decimal number: `42`, `3.14`, `6.022e23`. A leading `-` is the unary operator,
// not part of the literal.
const Number_ = token(
  seq(
    plus(digit),
    optPattern(seq('.', plus(digit))),
    optPattern(seq(oneOf('e', 'E'), optPattern(oneOf('+', '-')), plus(digit))),
  ),
  { scope: 'constant.numeric.jora' },
)

// String literals — double- and single-quoted, with `\`-escapes.
const escape = seq('\\', noneOf('\n'))
const String_ = token(
  altPattern(
    seq('"', star(altPattern(noneOf('"', '\\', '\n'), escape)), '"'),
    seq('\'', star(altPattern(noneOf('\'', '\\', '\n'), escape)), '\''),
  ),
  { string: true },
)

// ── Precedence (loosest → tightest) ──
const joraPrec = [
  left('or'),
  left('and'),
  left('??'),
  none('=', '!=', '~=', '<', '<=', '>', '>='),
  left('|'), // pipeline
  left('+', '-'),
  left('*', '/', '%'),
  right(prefix('not', '-')),
]

// ── Rules ──
const Expr = rule($ => [
  // Keyword-valued literals first, so a longest-match tie beats the bare Ident.
  'true',
  'false',
  'null',
  'undefined',
  'NaN',
  'Infinity',
  Variable,
  Ident,
  Number_,
  String_,
  [$, op, $], // infix operators (precedence declared above)
  [prefix, $], // prefix operators: `not`, `-`
  ['(', $, ')'], // grouping
  [$, '.', Ident], // member access
  [$, '[', $, ']'], // bracket access / filter
  [$, '(', sep($, ','), ')'], // method / function call
])

export default defineGrammar({
  name: 'jora',
  scopeName: 'source.jora',

  tokens: {
    LineComment,
    BlockComment,
    Variable,
    Ident,
    Number: Number_,
    String: String_,
  },

  prec: joraPrec,

  rules: {
    Expr,
  },

  scopes: {
    'keyword.operator.logical': ['and', 'or', 'not', '??'],
    'keyword.operator.comparison': ['=', '!=', '~='],
    'keyword.operator.relational': ['<', '<=', '>', '>='],
    'keyword.operator.arithmetic': ['+', '-', '*', '/', '%'],
    'keyword.operator.pipeline': ['|'],
    'punctuation.accessor': ['.'],
    'punctuation.bracket.round': ['(', ')'],
    'punctuation.bracket.square': ['[', ']'],
    'punctuation.separator.comma': [','],
    'constant.language.boolean.true': ['true'],
    'constant.language.boolean.false': ['false'],
    'constant.language.null': ['null', 'undefined'],
    'constant.language': ['NaN', 'Infinity'],
  },

  entry: Expr,
  expression: Expr,
})
