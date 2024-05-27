import { describe, expect, test } from 'vitest'
import { type Node, Group, convert as actualConvert } from 'shared-dom'
import { Kysely } from 'kysely'
import { CRDialect } from '../src/sqlite/dialect'
import { format as actualFormat } from 'prettier'
import * as plugin from 'prettier-plugin-sql-cst'
import { type DB } from '../src/sqlite/database'
import { throwExp } from 'shared'

async function format(sql: string) {
	return await actualFormat('select * from x where ' + sql, {
		parser: 'sqlite',
		plugins: [plugin],
	})
}

async function assertEqual(actual: string, expected: string, argCount: number) {
	const expected2 = await format(expected)
	const ky = new Kysely<DB>({
		// @ts-expect-error don't actually use CRDialect
		dialect: new CRDialect(),
	})
	const compile = actualConvert(actual).sql!.compile(ky)
	let actual2 = compile.sql
	const parameters = compile.parameters
	let i = 0
	while (actual2.includes('?')) {
		const p = parameters[i]
		actual2 =
			typeof p === 'string'
				? actual2.replace(
						'?',
						"'" +
							// We need to escape single quote when un-parameterizing the sql.
							// This SHOULD NOT be done in business code!
							p.replaceAll("'", "''") +
							"'",
				  )
				: typeof p === 'number'
				? actual2.replace('?', p.toString())
				: p == null
				? actual2.replace('?', 'NULL')
				: throwExp(`Unhandled type: ${typeof p}`)
		i++
	}
	expect(await format(actual2)).toBe(expected2)
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
		String.raw`a`,
		String.raw`noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a%')`,
		1,
	)
})

describe('special characters', () => {
	async function x(actual: string, expected: string, regex = '') {
		await assertEqual(
			actual,
			String.raw`noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '${expected}'${regex})`,
			regex === '' ? 1 : 2,
		)
	}
	test('*', async () => {
		await x(
			String.raw`"a*b"`, //
			String.raw`%a%b%`,
		)
	})
	test('_', async () => {
		await x(
			String.raw`"a_b"`, //
			String.raw`%a_b%`,
		)
	})
	// eslint-disable-next-line no-useless-escape
	test(`\*`, async () => {
		await x(
			String.raw`"a\*b"`, //
			String.raw`%a*b%`,
		)
	})
	// eslint-disable-next-line no-useless-escape
	test(`\_`, async () => {
		await x(
			String.raw`"a\_b"`, //
			String.raw`%a_b%`,
			String.raw`AND regexp_with_flags('a_b', 'i', noteValueFts.normalized)`,
		)
	})
	test(`\\`, async () => {
		await x(
			String.raw`"a\\b"`, //
			String.raw`%a\b%`,
		)
	})
	test('%', async () => {
		await x(
			String.raw`"a%b"`, //
			String.raw`%a_b%`,
			String.raw`AND regexp_with_flags('a%b', 'i', noteValueFts.normalized)`,
		)
	})
	test('* is escaped when regexed', async () => {
		await x(
			String.raw`"a\*b\_c"`, //
			String.raw`%a*b_c%`,
			String.raw`AND regexp_with_flags('a\*b_c', 'i', noteValueFts.normalized)`,
		)
	})
})

describe('delimiter special characters', () => {
	async function x(actual: string, expected: string) {
		await assertEqual(
			actual,
			String.raw`noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '${expected}')`,
			1,
		)
	}
	test('normal', async () => {
		await x(
			String.raw`"foo"`, //
			String.raw`%foo%`,
		)
	})
	test('left', async () => {
		await x(
			String.raw`##"foo"`, //
			String.raw`foo%`,
		)
	})
	test('right', async () => {
		await x(
			String.raw`"foo"##`, //
			String.raw`%foo`,
		)
	})
	test('both', async () => {
		await x(
			String.raw`##"foo"##`, //
			String.raw`foo`,
		)
	})
	test('missing trailing delimiter', async () => {
		await x(
			String.raw`##"foo`, //
			String.raw`foo%`,
		)
	})
})

describe('not a', () => {
	const expected = String.raw`noteValueFts.rowid NOT IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a%')`

	test('together', async () => {
		await assertEqual('-a', expected, 1)
	})

	test('separated', async () => {
		await assertEqual('- a', expected, 1)
	})
})

test('Quoted1 is fts', async () => {
	await assertEqual(
		String.raw`'a \' \\ b'`,
		String.raw`noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a '' \ b%')`,
		1,
	)
})

test('Quoted2 is fts', async () => {
	await assertEqual(
		String.raw`"a \" \\ b"`,
		String.raw`noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a " \ b%')`,
		1,
	)
})

test('RawQuoted1 is fts', async () => {
	await assertEqual(
		String.raw`x '''a '' \ b''' y`,
		String.raw`
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%x%')
AND
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a '''' \ b%')
AND
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%y%')`,
		3,
	)
})

test('RawQuoted2 is fts', async () => {
	await assertEqual(
		String.raw`x """a "" \ b""" y`,
		String.raw`
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%x%')
AND
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a "" \ b%')
AND
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%y%')`,
		3,
	)
})

describe('regex', () => {
	test('plain', async () => {
		await assertEqual(
			String.raw`/foo/`,
			String.raw`regexp_with_flags('foo', '', noteFieldValue.value)`,
			2,
		)
	})

	test('with flag', async () => {
		await assertEqual(
			String.raw`/foo/i`,
			String.raw`regexp_with_flags('foo', 'i', noteFieldValue.value)`,
			2,
		)
	})

	test('with flags', async () => {
		await assertEqual(
			String.raw`/foo/is`,
			String.raw`regexp_with_flags('foo', 'is', noteFieldValue.value)`,
			2,
		)
	})

	test('flags are deduped', async () => {
		await assertEqual(
			String.raw`/foo/suuvvyys`,
			String.raw`regexp_with_flags('foo', 'suvy', noteFieldValue.value)`,
			2,
		)
	})

	test('two are anded', async () => {
		await assertEqual(
			String.raw`/foo/ /bar/`,
			String.raw`
regexp_with_flags('foo', '', noteFieldValue.value)
AND
regexp_with_flags('bar', '', noteFieldValue.value)
`,
			4,
		)
	})

	test('NOT works', async () => {
		await assertEqual(
			String.raw`-/foo/y`,
			String.raw`NOT regexp_with_flags('foo', 'y', noteFieldValue.value)`,
			2,
		)
	})
})

test('2 SimpleStrings are ANDed', async () => {
	await assertEqual(
		String.raw`a b`,
		String.raw`noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a%')
AND
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%b%')`,
		2,
	)
})

test('2 SimpleStrings can be ORed', async () => {
	await assertEqual(
		String.raw`a OR b`,
		String.raw`noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a%')
OR
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%b%')`,
		2,
	)
})

test('2 SimpleStrings can be grouped', async () => {
	await assertEqual(
		String.raw`(a b)`,
		String.raw`(
  noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a%')
  AND
  noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%b%')
)`,
		2,
	)
})

test('not distributes over AND', async () => {
	await assertEqual(
		String.raw`-(a b)`,
		String.raw`(
  noteValueFts.rowid NOT IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a%')
  OR
  noteValueFts.rowid NOT IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%b%')
)`,
		2,
	)
})

test('not distributes over OR', async () => {
	await assertEqual(
		String.raw`-(a OR b)`,
		String.raw`(
  noteValueFts.rowid NOT IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a%')
  AND
  noteValueFts.rowid NOT IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%b%')
)`,
		2,
	)
})

test('double negative grouping does nothing', async () => {
	await assertEqual(
		String.raw`-(-(a OR b))`,
		String.raw`((
  noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a%')
  OR
  noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%b%')
))`,
		2,
	)
})

test('2 groups', async () => {
	await assertEqual(
		String.raw`(a b) OR c (d OR e)`,
		String.raw`(
  noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a%')
  AND
  noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%b%')
)
OR
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%c%')
AND
(
  noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%d%')
  OR
  noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%e%')
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
		fieldValueHighlight: {
			regex: 'x',
			boundLeft: false,
			boundRight: false,
		},
		negate: false,
		wildcardLeft: true,
		wildcardRight: true,
		boundLeft: true,
		boundRight: true,
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
		String.raw`-(p -q OR r)`,
		String.raw`(
  (
    noteValueFts.rowid NOT IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%p%')
    OR
    noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%q%')
  )
  AND
  noteValueFts.rowid NOT IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%r%')
)`,
		3,
	)
})

describe('skip error nodes', () => {
	const expected = String.raw`noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '% foo%')`
	const negatedExpected = String.raw`noteValueFts.rowid NOT IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '% foo%')`

	test('plain', async () => {
		await assertEqual(String.raw`" foo`, expected, 1)
	})

	test('negated', async () => {
		await assertEqual(String.raw`- " foo`, negatedExpected, 1)
	})

	test('double error', async () => {
		await assertEqual(String.raw`) " foo`, expected, 1)
	})

	test('double error, negated', async () => {
		await assertEqual(String.raw`- ) " foo`, negatedExpected, 1)
	})
})

describe('template', () => {
	test('1', async () => {
		await assertEqual(
			String.raw`template:foo`,
			String.raw`(template.rowid IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%foo%'))`,
			1,
		)
	})

	test('2', async () => {
		await assertEqual(
			String.raw`(template:foo,bar)`,
			String.raw`(
  template.rowid IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%foo%')
  OR
  template.rowid IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%bar%')
)`,
			2,
		)
	})

	test('regex', async () => {
		await assertEqual(
			String.raw`(template:/foo/i,-/bar/ qux /bix/suuvvyys)`,
			String.raw`(
  regexp_with_flags('foo', 'i', templateNameFts.name)
  OR NOT
  regexp_with_flags('bar', '', templateNameFts.name)
  AND
  template.rowid IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%qux%')
  AND
  regexp_with_flags('bix', 'suvy', templateNameFts.name)
)`,
			7,
		)
	})

	test('can contain doublequote and backslash', async () => {
		await assertEqual(
			String.raw`(template:"a\"b","c\\b")`,
			String.raw`(
  template.rowid IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%a"b%')
  OR
  template.rowid IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%c\b%')
)`,
			2,
		)
	})

	test('simple string ANDed with template', async () => {
		await assertEqual(
			String.raw`a template:t b`,
			String.raw`
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a%')
AND
(template.rowid IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%t%'))
AND
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%b%')`,
			3,
		)
	})

	test('quoted string ORed with template', async () => {
		await assertEqual(
			String.raw`"a b" OR template:t OR "c d"`,
			String.raw`
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a b%')
OR
(template.rowid IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%t%'))
OR
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%c d%')`,
			3,
		)
	})

	test('quoted', async () => {
		await assertEqual(
			String.raw`(template:"foo bar",biz,"baz quz")`,
			String.raw`(
  template.rowid IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%foo bar%')
  OR
  template.rowid IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%biz%')
  OR
  template.rowid IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%baz quz%')
)`,
			3,
		)
	})

	test('spaces', async () => {
		await assertEqual(
			String.raw` (template: "foo bar" , biz      , "baz quz") `,
			String.raw`(
  template.rowid IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%foo bar%')
  OR
  template.rowid IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%biz%')
  OR
  template.rowid IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%baz quz%')
)`,
			3,
		)
	})

	test('neg on group', async () => {
		await assertEqual(
			String.raw`-(template:foo,bar)`,
			String.raw`(
  template.rowid NOT IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%foo%')
  AND
  template.rowid NOT IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%bar%')
)`,
			2,
		)
	})

	test('neg on tag', async () => {
		await assertEqual(
			String.raw`(-template:foo,bar)`,
			String.raw`(
  template.rowid NOT IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%foo%')
  AND
  template.rowid NOT IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%bar%')
)`,
			2,
		)
	})

	test('double neg', async () => {
		await assertEqual(
			String.raw`-(-template:foo,bar)`,
			String.raw`(
  template.rowid IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%foo%')
  OR
  template.rowid IN (SELECT rowid FROM templateNameFts WHERE templateNameFts.name LIKE '%bar%')
)`,
			2,
		)
	})
})

describe('templateId', () => {
	test('1', async () => {
		await assertEqual(
			String.raw`templateId:foo`,
			String.raw`(note.templateId = 'foo')`,
			1,
		)
	})

	test('2', async () => {
		await assertEqual(
			String.raw`(templateId:foo,bar)`,
			String.raw`(note.templateId = 'foo' OR note.templateId = 'bar')`,
			2,
		)
	})

	test('simple string ANDed with template', async () => {
		await assertEqual(
			String.raw`a templateId:t b`,
			String.raw`
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a%')
AND
(note.templateId = 't')
AND
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%b%')`,
			3,
		)
	})

	test('quoted string ORed with template', async () => {
		await assertEqual(
			String.raw`"a b" OR templateId:t OR "c d"`,
			String.raw`
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a b%')
OR
(note.templateId = 't')
OR
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%c d%')`,
			3,
		)
	})

	test('quoted', async () => {
		await assertEqual(
			String.raw`(templateId:"foo bar",biz,"baz quz")`,
			String.raw`(note.templateId = 'foo bar' OR note.templateId = 'biz' OR note.templateId = 'baz quz')`,
			3,
		)
	})

	test('spaces', async () => {
		await assertEqual(
			String.raw` (templateId : "foo bar" , biz      , "baz quz") `,
			String.raw`(note.templateId = 'foo bar' OR note.templateId = 'biz' OR note.templateId = 'baz quz')`,
			3,
		)
	})

	test('neg on group', async () => {
		await assertEqual(
			String.raw`-(templateId:foo,bar)`,
			String.raw`(note.templateId != 'foo' AND note.templateId != 'bar')`,
			2,
		)
	})

	test('neg on tag', async () => {
		await assertEqual(
			String.raw`(-templateId:foo,bar)`,
			String.raw`(note.templateId != 'foo' AND note.templateId != 'bar')`,
			2,
		)
	})

	test('double neg', async () => {
		await assertEqual(
			String.raw`-(-templateId:foo,bar)`,
			String.raw`(note.templateId = 'foo' OR note.templateId = 'bar')`,
			2,
		)
	})
})

describe('setting', () => {
	test('1', async () => {
		await assertEqual(
			String.raw`setting:foo`,
			String.raw`(card.cardSettingId IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%foo%'))`,
			1,
		)
	})

	test('2', async () => {
		await assertEqual(
			String.raw`(setting:foo,bar)`,
			String.raw`(
  card.cardSettingId IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%foo%')
  OR
  card.cardSettingId IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%bar%')
)`,
			2,
		)
	})

	test('regex', async () => {
		await assertEqual(
			String.raw`(setting:/foo/i,-/bar/ qux /bix/suuvvyys)`,
			String.raw`(
  regexp_with_flags('foo', 'i', cardSettingNameFts.name)
  OR NOT
  regexp_with_flags('bar', '', cardSettingNameFts.name)
  AND
  card.cardSettingId IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%qux%')
  AND
  regexp_with_flags('bix', 'suvy', cardSettingNameFts.name)
)`,
			7,
		)
	})

	test('can contain doublequote and backslash', async () => {
		await assertEqual(
			String.raw`(setting:"a\"b","c\\b")`,
			String.raw`(
  card.cardSettingId IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%a"b%')
  OR
  card.cardSettingId IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%c\b%')
)`,
			2,
		)
	})

	test('simple string ANDed with setting', async () => {
		await assertEqual(
			String.raw`a setting:t b`,
			String.raw`
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a%')
AND
(card.cardSettingId IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%t%'))
AND
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%b%')`,
			3,
		)
	})

	test('quoted string ORed with setting', async () => {
		await assertEqual(
			String.raw`"a b" OR setting:t OR "c d"`,
			String.raw`
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a b%')
OR
(card.cardSettingId IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%t%'))
OR
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%c d%')`,
			3,
		)
	})

	test('quoted', async () => {
		await assertEqual(
			String.raw`(setting:"foo bar",biz,"baz quz")`,
			String.raw`(
  card.cardSettingId IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%foo bar%')
  OR
  card.cardSettingId IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%biz%')
  OR
  card.cardSettingId IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%baz quz%')
)`,
			3,
		)
	})

	test('spaces', async () => {
		await assertEqual(
			String.raw` (setting: "foo bar" , biz      , "baz quz") `,
			String.raw`(
  card.cardSettingId IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%foo bar%')
  OR
  card.cardSettingId IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%biz%')
  OR
  card.cardSettingId IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%baz quz%')
)`,
			3,
		)
	})

	test('neg on group', async () => {
		await assertEqual(
			String.raw`-(setting:foo,bar)`,
			String.raw`(
  card.cardSettingId NOT IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%foo%')
  AND
  card.cardSettingId NOT IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%bar%')
)`,
			2,
		)
	})

	test('neg on tag', async () => {
		await assertEqual(
			String.raw`(-setting:foo,bar)`,
			String.raw`(
  card.cardSettingId NOT IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%foo%')
  AND
  card.cardSettingId NOT IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%bar%')
)`,
			2,
		)
	})

	test('double neg', async () => {
		await assertEqual(
			String.raw`-(-setting:foo,bar)`,
			String.raw`(
  card.cardSettingId IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%foo%')
  OR
  card.cardSettingId IN (SELECT rowid FROM cardSettingNameFts WHERE cardSettingNameFts.name LIKE '%bar%')
)`,
			2,
		)
	})
})

describe('settingId', () => {
	test('1', async () => {
		await assertEqual(
			String.raw`settingId:foo`,
			String.raw`(card.cardSettingId = 'foo')`,
			1,
		)
	})

	test('2', async () => {
		await assertEqual(
			String.raw`(settingId:foo,bar)`,
			String.raw`(card.cardSettingId = 'foo' OR card.cardSettingId = 'bar')`,
			2,
		)
	})

	test('simple string ANDed with setting', async () => {
		await assertEqual(
			String.raw`a settingId:t b`,
			String.raw`
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a%')
AND
(card.cardSettingId = 't')
AND
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%b%')`,
			3,
		)
	})

	test('quoted string ORed with setting', async () => {
		await assertEqual(
			String.raw`"a b" OR settingId:t OR "c d"`,
			String.raw`
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a b%')
OR
(card.cardSettingId = 't')
OR
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%c d%')`,
			3,
		)
	})

	test('quoted', async () => {
		await assertEqual(
			String.raw`(settingId:"foo bar",biz,"baz quz")`,
			String.raw`(card.cardSettingId = 'foo bar' OR card.cardSettingId = 'biz' OR card.cardSettingId = 'baz quz')`,
			3,
		)
	})

	test('spaces', async () => {
		await assertEqual(
			String.raw` (settingId : "foo bar" , biz      , "baz quz") `,
			String.raw`(card.cardSettingId = 'foo bar' OR card.cardSettingId = 'biz' OR card.cardSettingId = 'baz quz')`,
			3,
		)
	})

	test('neg on group', async () => {
		await assertEqual(
			String.raw`-(settingId:foo,bar)`,
			String.raw`(card.cardSettingId != 'foo' AND card.cardSettingId != 'bar')`,
			2,
		)
	})

	test('neg on tag', async () => {
		await assertEqual(
			String.raw`(-settingId:foo,bar)`,
			String.raw`(card.cardSettingId != 'foo' AND card.cardSettingId != 'bar')`,
			2,
		)
	})

	test('double neg', async () => {
		await assertEqual(
			String.raw`-(-settingId:foo,bar)`,
			String.raw`(card.cardSettingId = 'foo' OR card.cardSettingId = 'bar')`,
			2,
		)
	})
})

describe('tag', () => {
	function cardQuery(x: string) {
		return String.raw`cardTagFts.tag LIKE '${x}'`
	}
	function noteQuery(x: string) {
		return String.raw`noteTagFts.tag LIKE '${x}'`
	}
	function cardNotQuery(x: string) {
		return String.raw`cardTagFts.tag NOT LIKE '${x}'`
	}
	function noteNotQuery(x: string) {
		return String.raw`noteTagFts.tag NOT LIKE '${x}'`
	}

	test('1', async () => {
		await assertEqual(
			String.raw`tag:foo`,
			String.raw`
(
  ${cardQuery('%foo%')}
  OR
  ${noteQuery('%foo%')}
)`,
			2,
		)
	})

	test('2', async () => {
		await assertEqual(
			String.raw`(tag:foo,bar)`,
			String.raw`(
  (
    ${cardQuery('%foo%')}
    OR
    ${noteQuery('%foo%')}
  )
  OR
  (
    ${cardQuery('%bar%')}
    OR
    ${noteQuery('%bar%')}
  )
)`,
			4,
		)
	})

	test('regex', async () => {
		await assertEqual(
			String.raw`(tag:/foo/i,-/bar/ qux /bix/suuvvyys)`,
			String.raw`(
  (
    regexp_with_flags('foo', 'i', cardTagFts.tag)
    OR
    regexp_with_flags('foo', 'i', noteTagFts.tag)
  )
  OR
  (
    NOT regexp_with_flags('bar', '', cardTagFts.tag)
    AND
    NOT regexp_with_flags('bar', '', noteTagFts.tag)
  )
  AND
  (
    ${cardQuery('%qux%')}
    OR
    ${noteQuery('%qux%')}
  )
  AND
  (
    regexp_with_flags('bix', 'suvy', cardTagFts.tag)
    OR
    regexp_with_flags('bix', 'suvy', noteTagFts.tag)
  )
)`,
			14,
		)
	})

	test('can contain doublequote and backslash', async () => {
		await assertEqual(
			String.raw`(tag:"a\"b","c\\b")`,
			String.raw`
(
  (
    ${cardQuery('%a"b%')}
    OR
    ${noteQuery('%a"b%')}
  )
  OR
  (
    ${cardQuery(String.raw`%c\b%`)}
    OR
    ${noteQuery(String.raw`%c\b%`)}
  )
)`,
			4,
		)
	})

	test('simple string ANDed with tag', async () => {
		await assertEqual(
			String.raw`a tag:t b`,
			String.raw`
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a%')
AND
(
  ${cardQuery('%t%')}
  OR
  ${noteQuery('%t%')}
)
AND
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%b%')`,
			4,
		)
	})

	test('quoted string ORed with tag', async () => {
		await assertEqual(
			String.raw`"a b" OR tag:t OR "c d"`,
			String.raw`
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%a b%')
OR
(
  ${cardQuery('%t%')}
  OR
  ${noteQuery('%t%')}
)
OR
noteValueFts.rowid IN (SELECT rowid FROM noteValueFts WHERE noteValueFts.normalized LIKE '%c d%')`,
			4,
		)
	})

	test('quoted', async () => {
		await assertEqual(
			String.raw`(tag:"foo bar",biz,"baz quz")`,
			String.raw`
(
  (
    ${cardQuery('%foo bar%')}
    OR
    ${noteQuery('%foo bar%')}
  )
  OR
  (
    ${cardQuery('%biz%')}
    OR
    ${noteQuery('%biz%')}
  )
  OR
  (
    ${cardQuery('%baz quz%')}
    OR
    ${noteQuery('%baz quz%')}
  )
)`,
			6,
		)
	})

	test('spaces', async () => {
		await assertEqual(
			String.raw`( tag : "foo bar" , biz      , "baz quz" )`,
			String.raw`
(
  (
    ${cardQuery('%foo bar%')}
    OR
    ${noteQuery('%foo bar%')}
  )
  OR
  (
    ${cardQuery('%biz%')}
    OR
    ${noteQuery('%biz%')}
  )
  OR
  (
    ${cardQuery('%baz quz%')}
    OR
    ${noteQuery('%baz quz%')}
  )
)`,
			6,
		)
	})

	test('neg on group', async () => {
		await assertEqual(
			String.raw`-(tag:foo,bar)`,
			String.raw`
(
  (  
    ${cardNotQuery('%foo%')}
    AND
    ${noteNotQuery('%foo%')}
  )
  AND
  (
    ${cardNotQuery('%bar%')}
    AND
    ${noteNotQuery('%bar%')}
  )
)`,
			4,
		)
	})

	test('neg on tag', async () => {
		await assertEqual(
			String.raw`(-tag:foo,bar)`,
			String.raw`
(
  (  
    ${cardNotQuery('%foo%')}
    AND
    ${noteNotQuery('%foo%')}
  )
  AND
  (
    ${cardNotQuery('%bar%')}
    AND
    ${noteNotQuery('%bar%')}
  )
)`,
			4,
		)
	})

	test('double neg', async () => {
		await assertEqual(
			String.raw`-(-tag:foo,bar)`,
			String.raw`
(
  (
    ${cardQuery('%foo%')}
    OR
    ${noteQuery('%foo%')}
  )
  OR
  (
    ${cardQuery('%bar%')}
    OR
    ${noteQuery('%bar%')}
  )
)`,
			4,
		)
	})
})

describe('kind', () => {
	test('new', async () => {
		await assertEqual(
			String.raw`kind:new`,
			String.raw`(latestReview.kind IS NULL)`,
			1,
		)
	})

	test('not new, on label', async () => {
		await assertEqual(
			String.raw`-kind:new`,
			String.raw`(latestReview.kind IS NOT NULL)`,
			1,
		)
	})

	test('not new, on value', async () => {
		await assertEqual(
			String.raw`kind:-new`,
			String.raw`(latestReview.kind IS NOT NULL)`,
			1,
		)
	})

	test('learn', async () => {
		await assertEqual(
			String.raw`kind:learn`,
			String.raw`(latestReview.kind IS 0)`,
			1,
		)
	})

	test('not review, on label', async () => {
		await assertEqual(
			String.raw`-kind:review`,
			String.raw`(latestReview.kind IS NOT 1)`,
			1,
		)
	})

	test('not review, on value', async () => {
		await assertEqual(
			String.raw`kind:-review`,
			String.raw`(latestReview.kind IS NOT 1)`,
			1,
		)
	})

	test('not review, on group', async () => {
		await assertEqual(
			String.raw`-(kind:review)`,
			String.raw`(latestReview.kind IS NOT 1)`,
			1,
		)
	})

	test('group', async () => {
		await assertEqual(
			String.raw`(kind:-new,review -relearn)`,
			String.raw`(
  latestReview.kind IS NOT NULL
  OR
  latestReview.kind IS 1
  AND
  latestReview.kind IS NOT 2
)`,
			3,
		)
	})
})
