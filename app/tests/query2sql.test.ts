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

async function assertEqual(actual: string, expected: string, argCount: number) {
	const ky = new Kysely<DB>({
		// @ts-expect-error don't actually use CRDialect
		dialect: new CRDialect(),
	})
	const compile = actualConvert(actual).sql!.compile(ky)
	let actual2 = compile.sql
	const parameters = compile.parameters
	let i = 0
	while (actual2.includes('?')) {
		actual2 = actual2.replace('?', "'" + (parameters[i]! as string) + "'")
		i++
	}
	expect(await format(actual2)).toBe(await format(expected))
	expect(i).toBe(argCount)
}

test('empty string is null', () => {
	const sql = actualConvert('').sql
	expect(sql).toBeNull()
})

test('whitespace is null', () => {
	const sql = actualConvert(' \t\r\n').sql
	expect(sql).toBeNull()
})

test('SimpleString is fts', async () => {
	await assertEqual(
		'a',
		`noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"a"')`,
		1,
	)
})

test('SimpleString* is wildcarded', async () => {
	await assertEqual(
		'a*',
		`noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"a" * ')`,
		1,
	)
})

describe('not a', () => {
	const expected = `noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"a"')`

	test('together', async () => {
		await assertEqual('-a', expected, 1)
	})

	test('separated', async () => {
		await assertEqual('- a', expected, 1)
	})
})

test('QuotedString is fts', async () => {
	await assertEqual(
		'"a b"',
		`noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"a b"')`,
		1,
	)
})

test('QuotedString* is wildcarded', async () => {
	await assertEqual(
		'"a b"*',
		`noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"a b" * ')`,
		1,
	)
})

describe('regex', () => {
	test('plain', async () => {
		await assertEqual(
			'/foo/',
			`regexp_with_flags('foo', '', noteFtsFv.value)`,
			2,
		)
	})

	test('with flag', async () => {
		await assertEqual(
			'/foo/i',
			`regexp_with_flags('foo', 'i', noteFtsFv.value)`,
			2,
		)
	})

	test('with flags', async () => {
		await assertEqual(
			'/foo/is',
			`regexp_with_flags('foo', 'is', noteFtsFv.value)`,
			2,
		)
	})

	test('flags are deduped', async () => {
		await assertEqual(
			'/foo/suuvvyys',
			`regexp_with_flags('foo', 'suvy', noteFtsFv.value)`,
			2,
		)
	})

	test('two are anded', async () => {
		await assertEqual(
			'/foo/ /bar/',
			`
regexp_with_flags('foo', '', noteFtsFv.value)
AND
regexp_with_flags('bar', '', noteFtsFv.value)
`,
			4,
		)
	})

	test('NOT works', async () => {
		await assertEqual(
			'-/foo/y',
			`NOT regexp_with_flags('foo', 'y', noteFtsFv.value)`,
			2,
		)
	})
})

test('2 SimpleStrings are ANDed', async () => {
	await assertEqual(
		'a b',
		`noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"a"')
AND
noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"b"')`,
		2,
	)
})

test('2 SimpleStrings can be ORed', async () => {
	await assertEqual(
		'a OR b',
		`noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"a"')
OR
noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"b"')`,
		2,
	)
})

test('2 SimpleStrings can be grouped', async () => {
	await assertEqual(
		'(a b)',
		`(
  noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"a"')
  AND
  noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"b"')
)`,
		2,
	)
})

test('not distributes over AND', async () => {
	await assertEqual(
		'-(a b)',
		`(
  noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"a"')
  OR
  noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"b"')
)`,
		2,
	)
})

test('not distributes over OR', async () => {
	await assertEqual(
		'-(a OR b)',
		`(
  noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"a"')
  AND
  noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"b"')
)`,
		2,
	)
})

test('double negative grouping does nothing', async () => {
	await assertEqual(
		'-(-(a OR b))',
		`(
  (
    noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"a"')
    OR
    noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"b"')
  )
)`,
		2,
	)
})

test('2 groups', async () => {
	await assertEqual(
		'(a b) OR c (d OR e)',
		`(
  noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"a"')
  AND
  noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"b"')
)
OR
noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"c"')
AND
(
  noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"d"')
  OR
  noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"e"')
)`,
		5,
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
	const x: Node = {
		type: 'SimpleString' as const,
		value: 'x',
		negate: false,
		wildcard: false,
	}
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
    noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"p"')
    OR
    noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"q"')
  )
  AND
  noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"r"')
)`,
		3,
	)
})

describe('skip error nodes', () => {
	const expected = `noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"foo"')`
	const negatedExpected = `noteFtsFv.rowid NOT IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"foo"')`

	test('plain', async () => {
		await assertEqual('" foo', expected, 1)
	})

	test('negated', async () => {
		await assertEqual('- " foo', negatedExpected, 1)
	})

	test('double error', async () => {
		await assertEqual(`) " foo`, expected, 1)
	})

	test('double error, negated', async () => {
		await assertEqual(`- ) " foo`, negatedExpected, 1)
	})
})

describe('template', () => {
	test('1', async () => {
		await assertEqual('template:foo', `(note.templateId = 'foo')`, 1)
	})

	test('2', async () => {
		await assertEqual(
			'(template:foo,bar)',
			`(note.templateId = 'foo' OR note.templateId = 'bar')`,
			2,
		)
	})

	test('simple string ANDed with template', async () => {
		await assertEqual(
			'a template:t b',
			`
noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"a"')
AND
(note.templateId = 't')
AND
noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"b"')`,
			3,
		)
	})

	test('quoted string ORed with template', async () => {
		await assertEqual(
			'"a b" OR template:t OR "c d"',
			`
noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"a b"')
OR
(note.templateId = 't')
OR
noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"c d"')`,
			3,
		)
	})

	test('quoted', async () => {
		await assertEqual(
			'(template:"foo bar",biz,"baz quz")',
			`(note.templateId = 'foo bar' OR note.templateId = 'biz' OR note.templateId = 'baz quz')`,
			3,
		)
	})

	test('spaces', async () => {
		await assertEqual(
			' (template : "foo bar" , biz      , "baz quz") ',
			`(note.templateId = 'foo bar' OR note.templateId = 'biz' OR note.templateId = 'baz quz')`,
			3,
		)
	})

	test('neg on group', async () => {
		await assertEqual(
			'-(template:foo,bar)',
			`(note.templateId != 'foo' AND note.templateId != 'bar')`,
			2,
		)
	})

	test('neg on tag', async () => {
		await assertEqual(
			'(-template:foo,bar)',
			`(note.templateId != 'foo' AND note.templateId != 'bar')`,
			2,
		)
	})
	test('double neg', async () => {
		await assertEqual(
			'-(-template:foo,bar)',
			`(note.templateId = 'foo' OR note.templateId = 'bar')`,
			2,
		)
	})
})

describe('tag', () => {
	test('1', async () => {
		await assertEqual(
			'tag:foo',
			`
(
cardFtsTag.rowid IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"foo"')
OR
noteFtsTag.rowid IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"foo"')
)`,
			2,
		)
	})

	test('2', async () => {
		await assertEqual(
			'(tag:foo,bar)',
			`
(
  (
    cardFtsTag.rowid IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"foo"')
    OR
    noteFtsTag.rowid IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"foo"')
  )
  OR
  (
    cardFtsTag.rowid IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"bar"')
    OR
    noteFtsTag.rowid IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"bar"')
  )
)`,
			4,
		)
	})

	test('wildcard', async () => {
		await assertEqual(
			'(tag:foo*,bar)',
			`
(
  (
    cardFtsTag.rowid IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"foo" * ')
    OR
    noteFtsTag.rowid IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"foo" * ')
  )
  OR
  (
    cardFtsTag.rowid IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"bar"')
    OR
    noteFtsTag.rowid IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"bar"')
  )
)`,
			4,
		)
	})

	test('can contain doublequote and backslash', async () => {
		await assertEqual(
			`(tag:"a\\"b","c\\\\b")`,
			`
(
  (
    cardFtsTag.rowid IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"a""b"')
    OR
    noteFtsTag.rowid IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"a""b"')
  )
  OR
  (
    cardFtsTag.rowid IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"c\\b"')
    OR
    noteFtsTag.rowid IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"c\\b"')
  )
)`,
			4,
		)
	})

	test('simple string ANDed with tag', async () => {
		await assertEqual(
			'a tag:t b',
			`
noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"a"')
AND
(
  cardFtsTag.rowid IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"t"')
  OR
  noteFtsTag.rowid IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"t"')
)
AND
noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"b"')`,
			4,
		)
	})

	test('quoted string ORed with tag', async () => {
		await assertEqual(
			'"a b" OR tag:t OR "c d"',
			`
noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"a b"')
OR
(
  cardFtsTag.rowid IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"t"')
  OR
  noteFtsTag.rowid IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"t"')
)
OR
noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH '"c d"')`,
			4,
		)
	})

	test('quoted', async () => {
		await assertEqual(
			'(tag:"foo bar",biz,"baz quz")',
			`
(
  (
    cardFtsTag.rowid IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"foo bar"')
    OR
    noteFtsTag.rowid IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"foo bar"')
  )
  OR
  (
    cardFtsTag.rowid IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"biz"')
    OR
    noteFtsTag.rowid IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"biz"')
  )
  OR
  (
    cardFtsTag.rowid IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"baz quz"')
    OR
    noteFtsTag.rowid IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"baz quz"')
  )
)`,
			6,
		)
	})

	test('spaces', async () => {
		await assertEqual(
			'( tag : "foo bar" , biz      , "baz quz" )',
			`
(
  (
    cardFtsTag.rowid IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"foo bar"')
    OR
    noteFtsTag.rowid IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"foo bar"')
  )
  OR
  (
    cardFtsTag.rowid IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"biz"')
    OR
    noteFtsTag.rowid IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"biz"')
  )
  OR
  (
    cardFtsTag.rowid IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"baz quz"')
    OR
    noteFtsTag.rowid IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"baz quz"')
  )
)`,
			6,
		)
	})

	test('neg on group', async () => {
		await assertEqual(
			'-(tag:foo,bar)',
			`
(
  (  
    cardFtsTag.rowid NOT IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"foo"')
    AND
    noteFtsTag.rowid NOT IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"foo"')
  )
  AND
  (
    cardFtsTag.rowid NOT IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"bar"')
    AND
    noteFtsTag.rowid NOT IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"bar"')
  )
)`,
			4,
		)
	})

	test('neg on tag', async () => {
		await assertEqual(
			'(-tag:foo,bar)',
			`
(
  (  
    cardFtsTag.rowid NOT IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"foo"')
    AND
    noteFtsTag.rowid NOT IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"foo"')
  )
  AND
  (
    cardFtsTag.rowid NOT IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"bar"')
    AND
    noteFtsTag.rowid NOT IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"bar"')
  )
)`,
			4,
		)
	})

	test('double neg', async () => {
		await assertEqual(
			'-(-tag:foo,bar)',
			`
(
  (
    cardFtsTag.rowid IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"foo"')
    OR
    noteFtsTag.rowid IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"foo"')
  )
  OR
  (
    cardFtsTag.rowid IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" MATCH '"bar"')
    OR
    noteFtsTag.rowid IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" MATCH '"bar"')
  )
)`,
			4,
		)
	})
})
