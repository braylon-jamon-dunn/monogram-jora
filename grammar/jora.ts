// Jora grammar for Monogram.
//
// A definition of the Jora query language (https://github.com/discoveryjs/jora)
// written with Monogram's combinator API. Monogram runs this as a parser and
// derives the TextMate grammar, VS Code language configuration, Monaco Monarch
// tokenizer, and tree-sitter grammar from it.
//
// Modelled after Jora's own hand-written tokenizer + recursive-descent parser
// (src/lang/parser/{tokenizer,tokens,parser}.js). The parser here is intentionally
// a little more permissive than Jora's in places where over-acceptance costs the
// highlighter nothing (e.g. a call `(...)` on any expression, a space between a
// method name and its `(`), but every real Jora query it is validated against
// parses (see test/grammar-corpus.test.ts).

import {
  alt,
  altPattern,
  anyChar,
  defineGrammar,
  left,
  many,
  many1,
  none,
  noneOf,
  notFollowedBy,
  oneOf,
  op,
  opt,
  optPattern,
  plus,
  prefix,
  range,
  repeat,
  right,
  rule,
  sep,
  seq,
  star,
  token,
} from '../monogram/src/api.ts'

// ── Pattern building blocks ──
const digit = range('0', '9')
const hexDigit = oneOf(digit, range('a', 'f'), range('A', 'F'))
const digitOrSep = oneOf(digit, '_')
const uEscape = seq('\\u', repeat(hexDigit, 4, 4))
const identStart = altPattern(oneOf(range('a', 'z'), range('A', 'Z'), '_'), uEscape)
const identPart = altPattern(oneOf(range('a', 'z'), range('A', 'Z'), digit, '_', '$'), uEscape)
const stringEscape = seq('\\', anyChar())

// ── Tokens ──

// Comments — skipped, but scoped so the derived highlighter dims them. Listed
// before the regex token so `//` and `/*` win the maximal-munch tie against `/`.
const LineComment = token(seq('//', star(noneOf('\n', '\r', '\u2028', '\u2029'))), {
  skip: true,
  scope: 'comment.line.double-slash.jora',
})
// An unterminated block comment runs to end-of-input (Jora's COMMENT_RX allows
// `…$`), so the closing `*/` is optional.
const BlockComment = token(
  seq('/*', star(altPattern(noneOf('*'), seq('*', notFollowedBy('/')))), optPattern(seq(plus('*'), '/'))),
  { skip: true, scope: 'comment.block.jora' },
)

// Decimal (with `_` separators, optional leading dot, optional exponent) or hex.
const Number_ = token(
  altPattern(
    seq('0', oneOf('x', 'X'), plus(oneOf(hexDigit, '_'))),
    seq(
      optPattern(seq(star(digitOrSep), '.')),
      plus(digitOrSep),
      optPattern(seq(oneOf('e', 'E'), optPattern(oneOf('+', '-')), plus(digitOrSep))),
    ),
  ),
  { scope: 'constant.numeric.jora' },
)

// Single- and double-quoted strings; may span newlines (Jora uses the `s` flag).
const String_ = token(
  altPattern(
    seq('"', star(altPattern(noneOf('"', '\\'), stringEscape)), '"'),
    seq('\'', star(altPattern(noneOf('\'', '\\'), stringEscape)), '\''),
  ),
  { string: true },
)

// Regular expression literal, `/…/flags`. `regexContext` reproduces Jora's
// `preventPrimitive` rule: after a value-producing token (or `)`/`]`/`}`/`.`),
// a `/` is division; otherwise it opens a regex.
const Regex_ = token(
  seq('/', plus(altPattern(seq('\\', anyChar()), noneOf('/', '\n'))), '/', star(oneOf('g', 'i', 'm', 's', 'u'))),
  {
    regex: true,
    regexContext: {
      divisionAfterTypes: ['Number', 'String', 'Template', 'Regex', 'Ident', 'Variable', 'Current', 'Arg1', 'Data', 'Context'],
      divisionAfterTexts: [')', ']', '}', '.', 'true', 'false', 'null', 'undefined', 'NaN', 'Infinity'],
    },
  },
)

// Template literal with `${…}` interpolation.
const Template = token(
  seq('`', star(altPattern(noneOf('`', '\\', '$'), stringEscape, seq('$', notFollowedBy('{')))), '`'),
  { template: { open: '`', interpOpen: '${', interpClose: '}' } },
)

// Identifier (property / method / keyword-assertion name). `\uXXXX` escapes are
// allowed anywhere an identifier char is, matching Jora's IDENTIFIER_RX.
const Ident = token(seq(identStart, star(identPart)), { identifier: true })

// `$name` — a variable reference.
const Variable = token(seq('$', identStart, star(identPart)), { scope: 'variable.other.jora' })

// The special references. Order relative to `Variable`/`Current` is resolved by
// maximal munch: `$$` (2 chars) beats `$`, and `$name` needs an ident after `$`.
const Arg1 = token(seq('$', '$'), { scope: 'variable.language.jora' }) // $$  — first argument
const Current = token('$', { scope: 'variable.language.jora' }) //         $   — current value
const Data = token('@', { scope: 'variable.language.jora' }) //            @   — root data
const Context = token('#', { scope: 'variable.language.jora' }) //         #   — query context

// Sorting order keywords: `asc`/`desc` with optional N/A null/absent tie-break
// variants. They are postfix operators that also chain into multi-key compare
// lists (`foo asc, bar desc`), so they are modelled as explicit led connectors.
const ORDER_KEYWORDS = ['asc', 'ascN', 'ascA', 'ascNA', 'ascAN', 'desc', 'descN', 'descA', 'descNA', 'descAN']

// ── Precedence (loosest → tightest) ──
const joraPrec = [
  left('or'),
  left('and'),
  left('??'), //         nullish coalescing
  left('in', 'has'), //  membership (`not in` / `has no` are handled as explicit arms)
  none('=', '!=', '~='),
  none('<', '<=', '>', '>='),
  left('+', '-'),
  left('*', '/', '%'),
  right(prefix('not', 'no', '-', '+')),
]

// `?` (ternary) and `is` (assertion) bind between pipeline and the boolean operators.
const joraLedPrec = [
  { connector: '|', below: 'or' }, // pipeline (its RHS is a Block: definitions + expression)
  { connector: '?', below: 'or' },
  { connector: 'is', below: 'or' },
  // Order keywords bind loosely (anchored to the loosest ladder operator).
  ...ORDER_KEYWORDS.map(kw => ({ connector: kw, below: 'or' })),
]

// ── Rules ──

// A `$name:` / `$:` local variable definition, e.g. `$x: 1; $y;`.
const Definition = rule(() => [
  [alt(Variable, Current), opt(':', Expr), ';'],
])

// The `is <assertion>` operand grammar: an optionally-negated identifier, literal,
// `$variable`, or a parenthesised `and`/`or` combination of assertions.
const Assertion = rule($ => [
  ['not', $],
  Ident,
  'true',
  'false',
  'null',
  'undefined',
  'NaN',
  'Infinity',
  Variable,
  ['(', $, many(alt('and', 'or'), $), ')'],
])

// A function/arrow: `=> body`, `$x => body`, `() => body`, `($x, $y) => body`.
// Parameters may only be `$variable`s.
const Fn = rule(() => [
  ['=>', Expr],
  [Variable, '=>', Expr],
  ['(', ')', '=>', Expr],
  ['(', sep(Variable, ','), ')', '=>', Expr],
])

// An object entry: spread, computed key, `key: value`, or a shorthand/value form.
const Property = rule(() => [
  ['...', opt(Expr)], //               spread:        ...expr  (or bare `...`)
  ['[', Expr, ']', ':', Expr], //      computed key:  [expr]: value
  [PropertyKey, ':', Expr], //         key: value
  // Shorthand / shorthand-with-continuation. Juxtaposed expressions form an
  // implicit pipeline here (`{ size() bool() }` ≡ `{ size: size() | bool() }`).
  [many1(Expr)],
])

const PropertyKey = rule(() => [
  Ident,
  String_,
  Number_,
  Variable,
  Current,
])

// A block: leading definitions followed by an optional expression. This is the
// query entry point and also the body of maps `.( )`, filters `.[ ]`, recursive
// maps `..( )`, and parentheses.
const Block = rule(() => [
  [many(Definition), opt(Expr)],
])

const Expr = rule($ => [
  // ── Primaries (nud) ──
  Fn, //                            functions/arrows — tried first for `=>` detection
  Number_,
  String_,
  Regex_,
  Template,
  // Keyword-valued literals before the bare Ident so a longest-match tie records
  // the literal rather than the identifier fallback.
  'true',
  'false',
  'null',
  'undefined',
  'NaN',
  'Infinity',
  Data, //                          @
  Context, //                       #
  Arg1, //                          $$
  Current, //                       $
  Variable, //                      $name
  Ident, //                         property / bare name
  ['is', Assertion], //             prefix assertion: `is number`
  ['|', Block], //                  leading pipeline (on the implicit current value)
  [prefix, $], //                   prefix operators: not / no / - / +
  ['(', opt(Block), ')'], //        parentheses (may hold definitions + expression)
  ['[', opt(Expr), ':', opt(Expr), opt(':', opt(Expr)), ']'], // slice literal `[a:b:c]`
  ['[', sep(alt(['...', opt(Expr)], Expr), ','), ']'], //     array literal
  ['{', many(Definition), sep(Property, ','), '}'], //           object literal

  // Leading postfix forms operate on the implicit current value (`$`), e.g. a
  // query beginning `.foo`, `.[…]`, `.(…)`, `..foo`, `..(…)`.
  ['.', Ident],
  ['.(', opt(Block), ')'],
  ['.[', opt(Block), ']'],
  ['..', Ident],
  ['..(', opt(Block), ')'],

  // ── Operators & postfix chain (led) ──
  [$, op, $], //                    binary operators (precedence declared above)
  [$, '|', Block], //               pipeline (RHS is a Block: definitions + expression)
  [$, '?', opt(Expr), opt(':', opt(Expr))], // ternary (`a ? b : c`, `a ? b`, `a ?: c`, `a ?`)
  [$, 'not', 'in', $], //           `not in`
  [$, 'has', 'no', $], //           `has no`
  [$, 'is', Assertion], //          postfix assertion: `x is number`
  // Sort order, incl. multi-key compare lists (`x asc`, `x asc, y desc`). Each
  // trailing term is a full expression carrying its own order keyword.
  ...ORDER_KEYWORDS.map(kw => [$, kw, many(',', $)]),
  [$, '.', Ident], //               property access
  [$, '.', Variable, '(', sep(Expr, ','), ')'], // method via variable: `.$fn(args)`
  [$, '.(', opt(Block), ')'], //    map        .( … )
  [$, '.[', opt(Block), ']'], //    filter     .[ … ]
  [$, '..(', opt(Block), ')'], //   recursive map ..( … )
  [$, '..', Ident], //              recursive map ..prop
  [$, '(', sep(Expr, ','), ')'], // method / function call
  [$, '[', opt(Expr), ':', opt(Expr), opt(':', opt(Expr)), ']'], // slice access
  [$, '[', opt(Expr), ']'], //      bracket access / pick (`x[i]`, `x[]`)
])

export default defineGrammar({
  name: 'jora',
  scopeName: 'source.jora',

  tokens: {
    LineComment,
    BlockComment,
    Number: Number_,
    String: String_,
    Regex: Regex_,
    Template,
    Variable,
    Arg1,
    Current,
    Data,
    Context,
    Ident,
  },

  prec: joraPrec,
  ledPrec: joraLedPrec,

  rules: {
    Expr,
    Definition,
    Assertion,
    Fn,
    Property,
    PropertyKey,
    // NOTE: Monogram uses the LAST-declared rule as the parse entry point, so
    // `Block` (the query root: definitions + expression) must come last.
    Block,
  },

  scopes: {
    'keyword.operator.logical': ['and', 'or', 'not', 'no', '??', 'is', 'in', 'has'],
    'keyword.operator.comparison': ['=', '!=', '~='],
    'keyword.operator.relational': ['<', '<=', '>', '>='],
    'keyword.operator.arithmetic': ['+', '-', '*', '/', '%'],
    'keyword.operator.pipeline': ['|'],
    'keyword.operator.function': ['=>'],
    'keyword.operator.spread': ['...'],
    'keyword.operator.sort': [
      'asc',
      'ascN',
      'ascA',
      'ascNA',
      'ascAN',
      'desc',
      'descN',
      'descA',
      'descNA',
      'descAN',
    ],
    'punctuation.accessor': ['.', '..', '.(', '.[', '..('],
    'punctuation.bracket.round': ['(', ')'],
    'punctuation.bracket.square': ['[', ']'],
    'punctuation.bracket.curly': ['{', '}'],
    'punctuation.separator.comma': [','],
    'punctuation.separator.key-value': [':'],
    'punctuation.terminator.statement': [';'],
    'constant.language.boolean.true': ['true'],
    'constant.language.boolean.false': ['false'],
    'constant.language.null': ['null', 'undefined'],
    'constant.language': ['NaN', 'Infinity'],
  },

  entry: Block,
  expression: Expr,
})
