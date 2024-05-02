import { describe, expect, test } from 'vitest'
import { parser } from './queryParser'
import { testTree as testTreeOriginal } from '@lezer/generator/dist/test'
import { convert } from './query2sql'
import { type Tree } from '@lezer/common'

function testTree(tree: Tree, expect: string) {
	testTreeOriginal(tree, expect, () => false)
}

test('queryParser can parse standard test string', () => {
	const tree = parser.parse(
		`-(a) spider-man -a b -c -"(quote\\"d) str" OR "l o l" OR  a b c ((a "c") b) tag:what -setting:"x y" (template:d, e f)`,
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
  QuotedString2,
  Or,
  QuotedString2,
  Or,
  SimpleString,
  SimpleString,
  SimpleString,
  Group(
    Group(
      SimpleString,
      QuotedString2
    ),
    SimpleString
  ),
  Label(
    tag,
    Is,
    SimpleString
  ),
  Not,
  Label(
    setting,
    Is,
    QuotedString2
  ),
  Label(
    template,
    Is,
    SimpleString,
    Or,
    SimpleString,
    SimpleString
  )
)`
	testTree(tree, spec)
})

test('strings are returned in BFS order', () => {
	const query = `-(a) spider-man -a b -c -"(quote\\"d) str" OR "l o l" OR  a b c ((a "c") b) tag:what -setting:"x y" (template:d, e f)`
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

describe('labels', () => {
	test('state', () => {
		const tree = parser.parse(
			`(state:normal, buried, userBuried, schedulerBuried, suspended)`,
		)
		const spec = `Program(Label(state,Is,StateEnum,Or,StateEnum,Or,StateEnum,Or,StateEnum,Or,StateEnum))`
		testTree(tree, spec)
	})

	test('rating', () => {
		const tree = parser.parse(
			`reviewed:1:1 reviewed:1:2 reviewed:1:3 reviewed:1:4 reviewed:1:again reviewed:1:hard reviewed:1:good reviewed:1:easy`,
		)
		const spec = `Program(
  Label(reviewed,Comparison,Number,Comparison,RatingEnum),
  Label(reviewed,Comparison,Number,Comparison,RatingEnum),
  Label(reviewed,Comparison,Number,Comparison,RatingEnum),
  Label(reviewed,Comparison,Number,Comparison,RatingEnum),
  Label(reviewed,Comparison,Number,Comparison,RatingEnum),
  Label(reviewed,Comparison,Number,Comparison,RatingEnum),
  Label(reviewed,Comparison,Number,Comparison,RatingEnum),
  Label(reviewed,Comparison,Number,Comparison,RatingEnum)
)`
		testTree(tree, spec)
	})

	test('fieldValue', () => {
		const tree = parser.parse(`(field:someFieldName:exists,missing x,"exists")`)
		const spec = `Program(Label(
  field,
  Is,
  FieldName(SimpleString),
  Is,
  FieldValueEnum,
  Or,
  FieldValueEnum,
  SimpleString,
  Or,
  QuotedString2
))`
		testTree(tree, spec)
	})
})

describe('rawLiteral', () => {
	test('2', () => {
		const tree = parser.parse(`a "" foo bar "" b`)
		const spec = `Program(SimpleString,QuotedString2,SimpleString,SimpleString,QuotedString2,SimpleString)`
		testTree(tree, spec)
	})

	test('3', () => {
		const tree = parser.parse(`a """ foo "" bar """ 0`)
		const spec = `Program(SimpleString,RawQuoted(Open,Content,Close),Number)`
		testTree(tree, spec)
	})

	test('4', () => {
		const tree = parser.parse(`a """" foo """ bar """" 0`)
		const spec = `Program(SimpleString,RawQuoted(Open,Content,Close),Number)`
		testTree(tree, spec)
	})

	test('5', () => {
		const tree = parser.parse(`a """"" foo """" bar """"" 0`)
		const spec = `Program(SimpleString,RawQuoted(Open,Content,Close),Number)`
		testTree(tree, spec)
	})

	test('newline 1', () => {
		const tree = parser.parse(`a '''
'foo bar'
''' 0`)
		const spec = `Program(SimpleString,RawQuoted(Open,Content,Close),Number)`
		testTree(tree, spec)
	})

	test('newline 2', () => {
		const tree = parser.parse(`a """
"foo bar"
""" 0`)
		const spec = `Program(SimpleString,RawQuoted(Open,Content,Close),Number)`
		testTree(tree, spec)
	})

	test('extra trailing "', () => {
		const tree = parser.parse(`a """ foo "" bar """" 0`)
		const spec = `Program(SimpleString,RawQuoted(Open,Content,Close),⚠,Number)`
		testTree(tree, spec)
	})

	test('extra leading "', () => {
		const tree = parser.parse(`a """" foo "" bar """ 0`)
		const spec = `Program(SimpleString,RawQuoted(Open,⚠),SimpleString,QuotedString2,SimpleString,RawQuoted(Open,⚠),Number)`
		testTree(tree, spec)
	})

	test("'", () => {
		const tree = parser.parse(`a ''' foo '' bar ''' 0`)
		const spec = `Program(SimpleString,RawQuoted(Open,Content,Close),Number)`
		testTree(tree, spec)
	})

	test('html', () => {
		const tree = parser.parse('a ``` foo `` bar ``` 0')
		const spec = `Program(SimpleString,RawHtml(Open,Content,Close),Number)`
		testTree(tree, spec)
	})
})
