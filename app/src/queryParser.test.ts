import { test } from 'vitest'
import { parser } from './queryParser'
import { testTree } from '@lezer/generator/dist/test'

test('queryParser can parse standard test string', () => {
	const tree = parser.parse(
		`-(a) spider-man -a b -c -"(quote\\"d) str" OR "l o l" OR  a b c ((a "c") b) tag:what -deck:"x y"`,
	)
	const spec = `Program(
  Not,
  ParenthesizedExpression(
    SimpleString
  ),
  SimpleString,
  Not,
  SimpleString,
  SimpleString,
  Not,
  SimpleString,
  Not,
  QuotedString,
  Or,
  QuotedString,
  Or,
  SimpleString,
  SimpleString,
  SimpleString,
  ParenthesizedExpression(
    ParenthesizedExpression(
      SimpleString,
      QuotedString
    ),
    SimpleString
  ),
  Tag(
    SimpleString
  ),
  Not,
  Deck(
    QuotedString
  )
)`
	testTree(tree, spec)
})
