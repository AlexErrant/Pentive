import { expect, test } from 'vitest'
import { parser } from './queryParser'
import { testTree } from '@lezer/generator/dist/test'
import { convert } from './query2sql'

test('queryParser can parse standard test string', () => {
	const tree = parser.parse(
		`-(a) spider-man -a b -c -"(quote\\"d) str" OR "l o l" OR  a b c ((a "c") b) tag:what -deck:"x y" (template:d, e f)`,
	)
	const spec = `Program(
  Not,
  Group(
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
  Group(
    Group(
      SimpleString,
      QuotedString
    ),
    SimpleString
  ),
  LabeledGroup(
    Tag,
    SimpleString
  ),
  Not,
  LabeledGroup(
    Deck,
    QuotedString
  ),
  LabeledGroup(
    Template,
    SimpleString,
    Or,
    SimpleString,
    SimpleString
  )
)`
	testTree(tree, spec)
})

test('strings are returned in BFS order', () => {
	const query = `-(a) spider-man -a b -c -"(quote\\"d) str" OR "l o l" OR  a b c ((a "c") b) tag:what -deck:"x y" (template:d, e f)`
	const { strings } = convert(query)
	expect(strings).toEqual([
		'spider-man',
		'b',
		'l o l',
		'a',
		'b',
		'c',
		'b',
		'a',
		'c',
	])
})

test('OR must be a standalone keyword', () => {
	const tree = parser.parse(`a OR b ORc d`)
	const spec = `Program(SimpleString,Or,SimpleString,SimpleString,SimpleString)`
	testTree(tree, spec)
})

test('negation might be separated by space', () => {
	const tree = parser.parse(`-a - b`)
	const spec = `Program(Not,SimpleString,Not,SimpleString)`
	testTree(tree, spec)
})

test('empty string is valid program', () => {
	const tree = parser.parse(``)
	const spec = `Program()`
	testTree(tree, spec)
})

test("can't end with OR", () => {
	const tree = parser.parse(`a OR`)
	const spec = `Program(SimpleString,Or,⚠)`
	testTree(tree, spec)
})
