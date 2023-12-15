import { describe, expect, test } from 'vitest'
import { type Node, Group, convert } from './query2sql'

test('SimpleString is fts', () => {
	const actual = convert('a')
	expect(actual).toEqual(
		"(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))",
	)
})

test('not a', () => {
	const actual = convert('-a')
	expect(actual).toEqual(
		"(noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))",
	)
})

test('QuotedString is fts', () => {
	const actual = convert('"a b"')
	expect(actual).toEqual(
		`(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH '"a b"'))`,
	)
})

test('2 SimpleStrings are ANDed', () => {
	const actual = convert('a b')
	expect(actual).toEqual(
		`(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))
AND
(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'b'))`,
	)
})

test('2 SimpleStrings can be ORed', () => {
	const actual = convert('a OR b')
	expect(actual).toEqual(
		`(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))
OR
(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'b'))`,
	)
})

test('2 SimpleStrings can be grouped', () => {
	const actual = convert('(a b)')
	expect(actual).toEqual(
		`(
  (noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))
  AND
  (noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'b'))
)`,
	)
})

test('not distributes over AND', () => {
	const actual = convert('-(a b)')
	expect(actual).toEqual(
		`(
  (noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))
  OR
  (noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'b'))
)`,
	)
})

test('not distributes over OR', () => {
	const actual = convert('-(a OR b)')
	expect(actual).toEqual(
		`(
  (noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))
  AND
  (noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'b'))
)`,
	)
})

test('double negative grouping does nothing', () => {
	const actual = convert('-(-(a OR b))')
	expect(actual).toEqual(
		`(
  (
    (noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))
    OR
    (noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'b'))
  )
)`,
	)
})

test('2 groups', () => {
	const actual = convert('(a b) OR c (d OR e)')
	expect(actual).toEqual(
		`(
  (noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))
  AND
  (noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'b'))
)
OR
(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'c'))
AND
(
  (noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'd'))
  OR
  (noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'e'))
)`,
	)
})

function stringify(node: Node) {
	if (node.type === 'Group') {
		let r = '('
		for (const child of node.children) {
			r += stringify(child)
		}
		r += ')'
		return r
	} else {
		const value = node.type === 'SimpleString' ? 'x' : node.type
		return value + ' '
	}
}

describe('groupAnds', () => {
	const x = { type: 'SimpleString' as const, value: 'x', negate: false }
	const or = { type: 'OR' as const }
	const and = { type: 'AND' as const }

	function testGroupAnds(children: Node[], expected: string) {
		const group = new Group(null, false)
		group.attachMany(children)
		group.groupAnds()
		expect(stringify(group)).toEqual(expected)
	}

	test('OR AND', () => {
		testGroupAnds(
			[x, or, x, and, x], //
			`(x OR (x AND x ))`,
		)
	})

	test('AND OR AND', () => {
		testGroupAnds(
			[x, and, x, or, x, and, x], //
			`((x AND x )OR (x AND x ))`,
		)
	})

	test('AND OR OR AND', () => {
		testGroupAnds(
			[x, and, x, or, x, or, x, and, x],
			`((x AND x )OR x OR (x AND x ))`,
		)
	})

	test('AND OR', () => {
		testGroupAnds(
			[x, and, x, or, x], //
			`((x AND x )OR x )`,
		)
	})

	test('OR AND OR', () => {
		testGroupAnds(
			[x, or, x, and, x, or, x], //
			`(x OR (x AND x )OR x )`,
		)
	})

	test('OR AND AND OR', () => {
		testGroupAnds(
			[x, or, x, and, x, and, x, or, x],
			`(x OR (x AND x AND x )OR x )`,
		)
	})
})
