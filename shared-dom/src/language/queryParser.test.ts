import { describe, test } from 'vitest'
import { parser } from './queryParser'
import { testTree as testTreeOriginal } from '@lezer/generator/dist/test'
import { type Tree } from '@lezer/common'

function testTree(tree: Tree, expect: string) {
	testTreeOriginal(tree, expect, () => false)
}

test('queryParser can parse standard test string', () => {
	const tree = parser.parse(
		`-(a) spider-man -a b -c OR "l o l" OR  a b c ((a "c") b) tag:what -setting:"x y" (template:d, e f)`,
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
  Or,
  Quoted2(Open,Content,Close),
  Or,
  SimpleString,
  SimpleString,
  SimpleString,
  Group(
    Group(
      SimpleString,
      Quoted2(Open,Content,Close)
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
    Quoted2(Open,Content,Close)
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

describe('glob', () => {
	test(`["'\`] 1`, () => {
		const tree = parser.parse(`-'(quote["'\`]d) str'`)
		const spec = `Program(Not,Quoted1(Open,Content,
Squared(
  SquareOpen,Char,Char,Char,SquareClose
),
Content,Close))`
		testTree(tree, spec)
	})

	test(`["'\`] 2`, () => {
		const tree = parser.parse(`-"(quote["'\`]d) str"`)
		const spec = `Program(Not,Quoted2(Open,Content,
Squared(
  SquareOpen,Char,Char,Char,SquareClose
),
Content,Close))`
		testTree(tree, spec)
	})

	test(`Quoted1 quotes`, () => {
		const tree = parser.parse(`'foo"\`bar'`)
		const spec = `Program(Quoted1(Open,Content,Close))`
		testTree(tree, spec)
	})

	test(`Quoted2 quotes`, () => {
		const tree = parser.parse(`"foo'\`bar"`)
		const spec = `Program(Quoted2(Open,Content,Close))`
		testTree(tree, spec)
	})

	test(`Html quotes`, () => {
		const tree = parser.parse('`foo\'"bar`')
		const spec = `Program(Html(Open,Content,Close))`
		testTree(tree, spec)
	})

	test(`empty 1`, () => {
		const tree = parser.parse(`''`)
		const spec = `Program(Quoted1(Open,Close))`
		testTree(tree, spec)
	})

	test(`empty 2`, () => {
		const tree = parser.parse(`""`)
		const spec = `Program(Quoted2(Open,Close))`
		testTree(tree, spec)
	})

	test(`two Squared's`, () => {
		const tree = parser.parse(`'a[b]c[d]e'`)
		const spec = `Program(Quoted1(
  Open,
  Content,
  Squared(
    SquareOpen,
    Char,
    SquareClose
  ),
  Content,
  Squared(
    SquareOpen,
    Char,
    SquareClose
  ),
  Content,
  Close
))`
		testTree(tree, spec)
	})

	test(`2 ranges`, () => {
		const tree = parser.parse(`'a[b-c]d[e-f]g'`)
		const spec = `Program(Quoted1(
  Open,
  Content,
  Squared(
    SquareOpen,
    RangeOpen(Char),
    Dash,
    RangeClose(Char),
    SquareClose,
  ),
  Content,
  Squared(
    SquareOpen,
    RangeOpen(Char),
    Dash,
    RangeClose(Char),
    SquareClose
  ),
  Content,
  Close
))`
		testTree(tree, spec)
	})

	test(`Not with char`, () => {
		const tree = parser.parse(`'a[^bc]d'`)
		const spec = `Program(Quoted1(
  Open,
  Content,
  Squared(
    SquareOpen,
    Char,
    Char,
    SquareClose,
  ),
  Content,
  Close
))`
		testTree(tree, spec)
	})

	test(`Not with range`, () => {
		const tree = parser.parse(`'a[^b-c]d'`)
		const spec = `Program(Quoted1(
  Open,
  Content,
  Squared(
    SquareOpen,
    RangeOpen(Char),
    Dash,
    RangeClose(Char),
    SquareClose,
  ),
  Content,
  Close
))`
		testTree(tree, spec)
	})

	test(`Not Not`, () => {
		const tree = parser.parse(`'[^^]'`)
		const spec = `Program(Quoted1(Open,Squared(
  SquareOpen,
  Char
  SquareClose
),Close))`
		testTree(tree, spec)
	})

	test(`Not Dash`, () => {
		const tree = parser.parse(`'[^-]'`)
		const spec = `Program(Quoted1(Open,Squared(
  SquareOpen,
  Dash,
  SquareClose
),Close))`
		testTree(tree, spec)
	})

	test(`Dash Char`, () => {
		const tree = parser.parse(`'[-a]'`)
		const spec = `Program(Quoted1(Open,Squared(
  SquareOpen,
  Dash,
  Char,
  SquareClose
),Close))`
		testTree(tree, spec)
	})

	test(`Not Dash Char`, () => {
		const tree = parser.parse(`'[^-a]'`)
		const spec = `Program(Quoted1(Open,Squared(
  SquareOpen,
  Dash,
  Char,
  SquareClose
),Close))`
		testTree(tree, spec)
	})
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
			`reviewed=1=1 reviewed=1=2 reviewed=1=3 reviewed=1=4 reviewed=1=again reviewed=1=hard reviewed=1=good reviewed=1=easy`,
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
  Quoted2(Open,Content,Close)
))`
		testTree(tree, spec)
	})
})

describe('rawLiteral', () => {
	test('2', () => {
		const tree = parser.parse(`a "" foo bar "" b`)
		const spec = `Program(SimpleString,Quoted2(Open,Close),SimpleString,SimpleString,Quoted2(Open,Close),SimpleString)`
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
		const spec = `Program(SimpleString,RawQuoted(Open,Content,Close),Quoted2(Open,Content,⚠))`
		testTree(tree, spec)
	})

	test('extra leading "', () => {
		const tree = parser.parse(`a """" foo "" bar """ 0`)
		const spec = `Program(SimpleString,RawQuoted(Open,⚠),SimpleString,Quoted2(Open,Close),SimpleString,RawQuoted(Open,⚠),Number)`
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
