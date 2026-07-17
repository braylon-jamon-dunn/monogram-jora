// Regression test for the Jora grammar (grammar/jora.ts): every query below is
// valid Jora and must parse cleanly through Monogram's interpreter built from the
// grammar. This guards the grammar's *acceptance* — if a change stops recognising
// a construct, a query here starts throwing.
//
// The grammar was validated against the ~290 queries in Jora's own lang test suite
// (287 of 288 valid ones accepted); this file is a self-contained, construct-by-
// construct subset that runs without vendoring Jora.
//
// NOTE: this test imports Monogram's parser from the git submodule by relative
// `.ts` path, so it is excluded from `tsc` (see tsconfig.json) and run only by
// Vitest, which executes TypeScript directly.
import { describe, expect, it } from 'vitest'
import grammar from '../grammar/jora.ts'
import { createParser } from '../monogram/src/gen-parser.ts'

const QUERIES = [
  // literals
  '42',
  '-3.14',
  '6.022e23',
  '1_000_000',
  '0xff',
  '.5',
  '"hello"',
  '\'world\'',
  '"multi\\nline"',
  'true',
  'false',
  'null',
  'undefined',
  'NaN',
  'Infinity',
  '/foo/i',
  '`tpl ${foo} end`',
  '`plain`',
  // references
  '$',
  '$$',
  '@',
  '#',
  '$foo',
  'foo',
  'foo.bar.baz',
  // comments
  '// line\n42',
  '/* block */ 42',
  'foo /* mid */ .bar',
  '/* unterminated',
  // operators
  '1 + 2 * 3',
  'a and b or c',
  'a = b',
  'a != b',
  'a ~= /x/',
  'a < b',
  'a >= b',
  'a ?? b',
  'a in b',
  'a not in b',
  'a has b',
  'a has no b',
  'not a',
  'no a',
  '-x',
  '+x',
  'a | b | c',
  'foo | .bar',
  // ternary
  'a ? b : c',
  'a ? b',
  'a ?: c',
  'a ?',
  // assertions
  'is number',
  'is not number',
  'x is number',
  'x is not undefined',
  'x is (number or string)',
  // access / calls
  'foo[0]',
  'foo["key"]',
  'foo[]',
  'foo.method()',
  'method(a, b)',
  '$fn(x)',
  'foo.$fn(x)',
  // slice
  'arr[1:2]',
  'arr[1:10:2]',
  'arr[:10]',
  'arr[5:]',
  'arr[::2]',
  // map / filter / recursive
  'foo.(bar)',
  'foo.[bar > 1]',
  'foo.()',
  'foo.[]',
  '..deps',
  '..(children)',
  '.foo',
  '.[type="js"]',
  '.(deps)',
  '..name',
  // sort
  'foo asc',
  'foo desc',
  'foo asc, bar desc',
  'sort(a asc, b desc)',
  'foo descNA',
  // arrays / objects / spread
  '[1, 2, 3]',
  '[]',
  '[...foo, 1]',
  '[...]',
  '{ a: 1, b: 2 }',
  '{}',
  '{ foo, bar }',
  '{ ...base, x: 1 }',
  '{ [key]: value }',
  '{ size() }',
  // functions
  '=> foo',
  '$x => $x + 1',
  '($a, $b) => $a',
  '() => 42',
  'map(=> $ * 2)',
  // definitions / blocks
  '$x: 1; $x',
  '$a; $b; $a + $b',
  '($n: 5; $n * 2)',
  'foo | $x: $; $x.bar',
  // complex
  'errors.owner.[type="css"].type',
  'deps.group(=>name).({ name: key, versions: value.sort() }).[versions.size() > 1]',
]

describe('jora grammar corpus', () => {
  const { parse } = createParser(grammar)

  it.each(QUERIES)('parses %j', (query) => {
    expect(() => parse(query)).not.toThrow()
  })
})
