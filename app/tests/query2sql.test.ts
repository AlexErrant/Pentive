import { describe, expect, test } from 'vitest'
import { type Node, Group, convert as actualConvert } from 'shared-dom'
import { Kysely } from 'kysely'
import { CRDialect } from '../src/sqlite/dialect'
import { format as actualFormat } from 'prettier'
import * as plugin from 'prettier-plugin-sql-cst'
import { type DB } from '../src/sqlite/database'

async function format(sql: string) {
	return await actualFormat('select * from x where ' + sql, {
		parser: 'sqlite',
		plugins: [plugin],
	})
}

async function assertEqual(actual: string, expected: string) {
	const ky = new Kysely<DB>({
		// @ts-expect-error don't actually use CRDialect
		dialect: new CRDialect(),
	})
	const compile = actualConvert(actual).compile(ky)
	let actual2 = compile.sql
	const parameters = compile.parameters
	let i = 0
	while (actual2.includes('?')) {
		actual2 = actual2.replace('?', "'" + (parameters[i]! as string) + "'")
		i++
	}
	expect(await format(actual2)).toBe(await format(expected))
}

test('SimpleString is fts', async () => {
	await assertEqual(
		'a',
		"(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))",
	)
})

describe('not a', () => {
	const expected =
		"(noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))"

	test('together', async () => {
		await assertEqual('-a', expected)
	})

	test('separated', async () => {
		await assertEqual('- a', expected)
	})
})

test('QuotedString is fts', async () => {
	await assertEqual(
		'"a b"',
		`(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH '"a b"'))`,
	)
})

test('2 SimpleStrings are ANDed', async () => {
	await assertEqual(
		'a b',
		`(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))
AND
(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'b'))`,
	)
})

test('2 SimpleStrings can be ORed', async () => {
	await assertEqual(
		'a OR b',
		`(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))
OR
(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'b'))`,
	)
})

test('2 SimpleStrings can be grouped', async () => {
	await assertEqual(
		'(a b)',
		`(
  (noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))
  AND
  (noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'b'))
)`,
	)
})

test('not distributes over AND', async () => {
	await assertEqual(
		'-(a b)',
		`(
  (noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))
  OR
  (noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'b'))
)`,
	)
})

test('not distributes over OR', async () => {
	await assertEqual(
		'-(a OR b)',
		`(
  (noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))
  AND
  (noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'b'))
)`,
	)
})

test('double negative grouping does nothing', async () => {
	await assertEqual(
		'-(-(a OR b))',
		`(
  (
    (noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))
    OR
    (noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'b'))
  )
)`,
	)
})

test('2 groups', async () => {
	await assertEqual(
		'(a b) OR c (d OR e)',
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

// https://stackoverflow.com/a/20552239
test('!(p && !q || r) is (!p || q) && !r', async () => {
	await assertEqual(
		'-(p -q OR r)',
		`(
  (
    (noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'p'))
    OR
    (noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'q'))
  )
  AND
  (noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'r'))
)`,
	)
})

describe('skip error nodes', () => {
	const expected = `(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'foo'))`
	const negatedExpected = `(noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'foo'))`

	test('plain', async () => {
		await assertEqual('" foo', expected)
	})

	test('negated', async () => {
		await assertEqual('- " foo', negatedExpected)
	})

	test('double error', async () => {
		await assertEqual(`) " foo`, expected)
	})

	test('double error, negated', async () => {
		await assertEqual(`- ) " foo`, negatedExpected)
	})
})

describe('template', () => {
	test('1', async () => {
		await assertEqual(
			'template:foo',
			`note.templateId IN (SELECT value FROM json_each('["foo"]'))`,
		)
	})

	test('2', async () => {
		await assertEqual(
			'template:foo,bar',
			`note.templateId IN (SELECT value FROM json_each('["foo","bar"]'))`,
		)
	})

	test('can contain comma', async () => {
		await assertEqual(
			'template:"foo,bar"',
			`note.templateId IN (SELECT value FROM json_each('["foo,bar"]'))`,
		)
	})

	test('simple string ANDed with template', async () => {
		await assertEqual(
			'a template:t b',
			`
(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'a'))
AND
note.templateId IN (SELECT value FROM json_each('["t"]'))
AND
(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH 'b'))`,
		)
	})

	test('quoted string ORed with template', async () => {
		await assertEqual(
			'"a b" OR template:t OR "c d"',
			`
(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH '"a b"'))
OR
note.templateId IN (SELECT value FROM json_each('["t"]'))
OR
(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH '"c d"'))`,
		)
	})

	test('quoted', async () => {
		await assertEqual(
			'template:"foo bar",biz,"baz quz"',
			`note.templateId IN (SELECT value FROM json_each('["foo bar","biz","baz quz"]'))`,
		)
	})

	test('spaces', async () => {
		await assertEqual(
			' template : "foo bar" , biz      , "baz quz" ',
			`note.templateId IN (SELECT value FROM json_each('["foo bar","biz","baz quz"]'))`,
		)
	})

	test('neg', async () => {
		await assertEqual(
			'-template:foo,bar',
			`note.templateId NOT IN (SELECT value FROM json_each('["foo","bar"]'))`,
		)
	})
})
