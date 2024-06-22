import { describe, expect, test } from 'vitest'
import { type Node, Group, convert as actualConvert } from 'shared-dom'
import {
	type CompiledQuery,
	Kysely,
	type SqlBool,
	type RawBuilder,
} from 'kysely'
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

function unparameterize(i: { i: number }, query: CompiledQuery<SqlBool>) {
	let parameterizedSql = query.sql
	const parameters = query.parameters
	let j = 0
	while (parameterizedSql.includes('?')) {
		const p = parameters[j]
		parameterizedSql =
			typeof p === 'string'
				? parameterizedSql.replace(
						'?',
						"'" +
							// We need to escape single quote when un-parameterizing the sql.
							// This SHOULD NOT be done in business code!
							p.replaceAll("'", "''") +
							"'",
				  )
				: typeof p === 'number'
				? parameterizedSql.replace('?', p.toString())
				: p == null
				? parameterizedSql.replace('?', 'NULL')
				: throwExp(`Unhandled type: ${typeof p}`)
		i.i++
		j++
	}
	return parameterizedSql
}

async function assertEqual(
	actual: string,
	expected: string,
	joinsOrArgCount: Record<string, string> | number,
	argCount?: number,
) {
	const i = { i: 0 }
	const expected2 = await format(expected)
	const ky = new Kysely<DB>({
		// @ts-expect-error don't actually use CRDialect
		dialect: new CRDialect(),
	})
	const converted = actualConvert(actual, new Date())
	const compile = converted.sql!.compile(ky)
	const actual2 = unparameterize(i, compile)
	expect(await format(actual2)).toBe(expected2)
	if (typeof joinsOrArgCount === 'number') {
		expect(i.i).toBe(joinsOrArgCount)
	} else {
		// eslint-disable-next-line no-inner-declarations
		async function testJoin(
			list: Array<{
				sql: RawBuilder<SqlBool>
				name: string
			}>,
		) {
			for await (const x of list) {
				const compile = x.sql.compile(ky)
				const p = unparameterize(i, compile)
				const expected =
					(joinsOrArgCount as Record<string, string>)[x.name] ??
					throwExp(x.name + " can't be null dude")
				expect(await format(p)).toEqual(await format(expected))
			}
		}
		await testJoin(converted.joinNoteValueFts)
		await testJoin(converted.joinNoteFieldValue)
		await testJoin(converted.joinCardTagFts)
		await testJoin(converted.joinNoteTagFts)
		await testJoin(converted.joinCardTag)
		await testJoin(converted.joinNoteTag)
		expect(argCount).not.toBeUndefined()
		expect(i.i).toBe(argCount)
	}
}

test('empty string is null', () => {
	const sql = actualConvert('', new Date()).sql
	expect(sql).toBeNull()
})

test('whitespace is null', () => {
	const sql = actualConvert(' \t\r\n', new Date()).sql
	expect(sql).toBeNull()
})

test('SimpleString is fts', async () => {
	await assertEqual(
		String.raw`a`,
		String.raw`x1.z IS NOT NULL`,
		{ x1: String.raw`(noteValueFts.normalized GLOB '*a*')` },
		1,
	)
})

describe('delimiter special characters', () => {
	async function x(actual: string, expected: string) {
		await assertEqual(
			actual,
			String.raw`x1.z IS NOT NULL`,
			{ x1: String.raw`(noteValueFts.normalized GLOB '${expected}')` },
			1,
		)
	}
	test('normal', async () => {
		await x(
			String.raw`"foo"`, //
			String.raw`*foo*`,
		)
	})
	test('left', async () => {
		await x(
			String.raw`##"foo"`, //
			String.raw`foo*`,
		)
	})
	test('right', async () => {
		await x(
			String.raw`"foo"##`, //
			String.raw`*foo`,
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
			String.raw`foo*`,
		)
	})
})

describe('not a', () => {
	const expected = String.raw`(noteValueFts.normalized GLOB '*a*')`

	test('together', async () => {
		await assertEqual('-a', String.raw`x1.z IS NULL`, { x1: expected }, 1)
	})

	test('separated', async () => {
		await assertEqual('- a', String.raw`x1.z IS NULL`, { x1: expected }, 1)
	})
})

test('Quoted1 is fts', async () => {
	await assertEqual(
		String.raw`'a ['] \ b'`,
		String.raw`x1.z IS NOT NULL`,
		{ x1: String.raw`(noteValueFts.normalized GLOB '*a [''] \ b*')` },
		1,
	)
})

test('Quoted2 is fts', async () => {
	await assertEqual(
		String.raw`"a ["] \ b"`,
		String.raw`x1.z IS NOT NULL`,
		{ x1: String.raw`(noteValueFts.normalized GLOB '*a ["] \ b*')` },
		1,
	)
})

test('RawQuoted1 is fts', async () => {
	await assertEqual(
		String.raw`x '''a '' \ b''' y`,
		String.raw`x1.z IS NOT NULL AND x2.z IS NOT NULL AND x3.z IS NOT NULL`,
		{
			x1: String.raw`(noteValueFts.normalized GLOB '*x*')`,
			x2: String.raw`(noteValueFts.normalized GLOB '*a '''' \ b*')`,
			x3: String.raw`(noteValueFts.normalized GLOB '*y*')`,
		},
		3,
	)
})

test('RawQuoted2 is fts', async () => {
	await assertEqual(
		String.raw`x """a "" \ b""" y`,
		String.raw`x1.z IS NOT NULL AND x2.z IS NOT NULL AND x3.z IS NOT NULL`,
		{
			x1: String.raw`(noteValueFts.normalized GLOB '*x*')`,
			x2: String.raw`(noteValueFts.normalized GLOB '*a "" \ b*')`,
			x3: String.raw`(noteValueFts.normalized GLOB '*y*')`,
		},
		3,
	)
})

describe('regex', () => {
	test('plain', async () => {
		await assertEqual(
			String.raw`/foo/`,
			String.raw`x1.z IS NOT NULL`,
			{ x1: String.raw`regexp_with_flags('foo', '', noteFieldValue.value)` },
			2,
		)
	})

	test('with flag', async () => {
		await assertEqual(
			String.raw`/foo/i`,
			String.raw`x1.z IS NOT NULL`,
			{ x1: String.raw`regexp_with_flags('foo', 'i', noteFieldValue.value)` },
			2,
		)
	})

	test('with flags', async () => {
		await assertEqual(
			String.raw`/foo/is`,
			String.raw`x1.z IS NOT NULL`,
			{ x1: String.raw`regexp_with_flags('foo', 'is', noteFieldValue.value)` },
			2,
		)
	})

	test('flags are deduped', async () => {
		await assertEqual(
			String.raw`/foo/suuvvyys`,
			String.raw`x1.z IS NOT NULL`,
			{
				x1: String.raw`regexp_with_flags('foo', 'suvy', noteFieldValue.value)`,
			},
			2,
		)
	})

	test('two are anded', async () => {
		await assertEqual(
			String.raw`/foo/ /bar/`,
			String.raw`x1.z IS NOT NULL AND x2.z IS NOT NULL`,
			{
				x1: String.raw`regexp_with_flags('foo', '', noteFieldValue.value)`,
				x2: String.raw`regexp_with_flags('bar', '', noteFieldValue.value)`,
			},
			4,
		)
	})

	test('NOT works', async () => {
		await assertEqual(
			String.raw`-/foo/y`,
			String.raw`x1.z IS NULL`,
			{ x1: String.raw`regexp_with_flags('foo', 'y', noteFieldValue.value)` },
			2,
		)
	})
})

test('2 SimpleStrings are ANDed', async () => {
	await assertEqual(
		String.raw`a b`,
		String.raw`x1.z IS NOT NULL AND x2.z IS NOT NULL`,
		{
			x1: String.raw`(noteValueFts.normalized GLOB '*a*')`,
			x2: String.raw`(noteValueFts.normalized GLOB '*b*')`,
		},
		2,
	)
})

test('2 SimpleStrings can be ORed', async () => {
	await assertEqual(
		String.raw`a OR b`,
		String.raw`x1.z IS NOT NULL OR x2.z IS NOT NULL`,
		{
			x1: String.raw`(noteValueFts.normalized GLOB '*a*')`,
			x2: String.raw`(noteValueFts.normalized GLOB '*b*')`,
		},
		2,
	)
})

test('2 SimpleStrings can be grouped', async () => {
	await assertEqual(
		String.raw`(a b)`,
		String.raw`(x1.z IS NOT NULL AND x2.z IS NOT NULL)`,
		{
			x1: String.raw`(noteValueFts.normalized GLOB '*a*')`,
			x2: String.raw`(noteValueFts.normalized GLOB '*b*')`,
		},
		2,
	)
})

test('not distributes over AND', async () => {
	await assertEqual(
		String.raw`-(a b)`,
		String.raw`(x1.z IS NULL OR x2.z IS NULL)`,
		{
			x1: String.raw`(noteValueFts.normalized GLOB '*a*')`,
			x2: String.raw`(noteValueFts.normalized GLOB '*b*')`,
		},
		2,
	)
})

test('not distributes over OR', async () => {
	await assertEqual(
		String.raw`-(a OR b)`,
		String.raw`(x1.z IS NULL AND x2.z IS NULL)`,
		{
			x1: String.raw`(noteValueFts.normalized GLOB '*a*')`,
			x2: String.raw`(noteValueFts.normalized GLOB '*b*')`,
		},
		2,
	)
})

test('double negative grouping does nothing', async () => {
	await assertEqual(
		String.raw`-(-(a OR b))`,
		String.raw`(x1.z IS NOT NULL OR x2.z IS NOT NULL)`,
		{
			x1: String.raw`(noteValueFts.normalized GLOB '*a*')`,
			x2: String.raw`(noteValueFts.normalized GLOB '*b*')`,
		},
		2,
	)
})

test('2 groups', async () => {
	await assertEqual(
		String.raw`(a b) OR c (d OR e)`,
		String.raw`
(x1.z IS NOT NULL AND x2.z IS NOT NULL)
OR x3.z IS NOT NULL
AND (x4.z IS NOT NULL OR x5.z IS NOT NULL)`,
		{
			x1: String.raw`(noteValueFts.normalized GLOB '*a*')`,
			x2: String.raw`(noteValueFts.normalized GLOB '*b*')`,
			x3: String.raw`(noteValueFts.normalized GLOB '*c*')`,
			x4: String.raw`(noteValueFts.normalized GLOB '*d*')`,
			x5: String.raw`(noteValueFts.normalized GLOB '*e*')`,
		},
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
			pattern: 'x',
			flags: '',
			boundLeft: false,
			boundRight: false,
		},
		negate: false,
		wildcardLeft: true,
		wildcardRight: true,
		boundLeft: true,
		boundRight: true,
		removeCombiningCharacters: false,
		caseSensitive: false,
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
		String.raw` ((x1.z IS NULL OR x2.z IS NOT NULL) AND x3.z IS NULL)`,
		{
			x1: String.raw`(noteValueFts.normalized GLOB '*p*')`,
			x2: String.raw`(noteValueFts.normalized GLOB '*q*')`,
			x3: String.raw`(noteValueFts.normalized GLOB '*r*')`,
		},
		3,
	)
})

describe('skip error nodes', () => {
	const expected = { x1: String.raw`(noteValueFts.normalized GLOB '* foo*')` }

	test('plain', async () => {
		await assertEqual(
			String.raw`" foo`,
			String.raw`x1.z IS NOT NULL`,
			expected,
			1,
		)
	})

	test('negated', async () => {
		await assertEqual(
			String.raw`- " foo`,
			String.raw`x1.z IS NULL`,
			expected,
			1,
		)
	})

	test('double error', async () => {
		await assertEqual(
			String.raw`) " foo`,
			String.raw`x1.z IS NOT NULL`,
			expected,
			1,
		)
	})

	test('double error, negated', async () => {
		await assertEqual(
			String.raw`- ) " foo`,
			String.raw`x1.z IS NULL`,
			expected,
			1,
		)
	})
})

describe('template', () => {
	test('1', async () => {
		await assertEqual(
			String.raw`template:foo`,
			String.raw`(templateNameFts.normalized GLOB '*foo*')`,
			1,
		)
	})

	test('2', async () => {
		await assertEqual(
			String.raw`(template:foo,bar)`,
			String.raw`(
  (templateNameFts.normalized GLOB '*foo*')
  OR
  (templateNameFts.normalized GLOB '*bar*')
)`,
			2,
		)
	})

	test('regex', async () => {
		await assertEqual(
			String.raw`(template:/foo/i,-/bar/ qux /bix/suuvvyys)`,
			String.raw`(
  regexp_with_flags('foo', 'i', template.name)
  OR NOT
  regexp_with_flags('bar', '', template.name)
  AND
  (templateNameFts.normalized GLOB '*qux*')
  AND
  regexp_with_flags('bix', 'suvy', template.name)
)`,
			7,
		)
	})

	test('can contain doublequote and backslash', async () => {
		await assertEqual(
			String.raw`(template:"a["]b","c\b")`,
			String.raw`(
  (templateNameFts.normalized GLOB '*a["]b*')
  OR
  (templateNameFts.normalized GLOB '*c\b*')
)`,
			2,
		)
	})

	test('simple string ANDed with template', async () => {
		await assertEqual(
			String.raw`a template:t b`,
			String.raw`
x1.z IS NOT NULL
AND
(templateNameFts.normalized GLOB '*t*')
AND
x2.z IS NOT NULL`,
			{
				x1: String.raw`(noteValueFts.normalized GLOB '*a*')`,
				x2: String.raw`(noteValueFts.normalized GLOB '*b*')`,
			},
			3,
		)
	})

	test('quoted string ORed with template', async () => {
		await assertEqual(
			String.raw`"a b" OR template:t OR "c d"`,
			String.raw`
x1.z IS NOT NULL
OR
(templateNameFts.normalized GLOB '*t*')
OR
x2.z IS NOT NULL`,
			{
				x1: String.raw`(noteValueFts.normalized GLOB '*a b*')`,
				x2: String.raw`(noteValueFts.normalized GLOB '*c d*')`,
			},
			3,
		)
	})

	test('quoted', async () => {
		await assertEqual(
			String.raw`(template:"foo bar",biz,"baz quz")`,
			String.raw`(
  (templateNameFts.normalized GLOB '*foo bar*')
  OR
  (templateNameFts.normalized GLOB '*biz*')
  OR
  (templateNameFts.normalized GLOB '*baz quz*')
)`,
			3,
		)
	})

	test('spaces', async () => {
		await assertEqual(
			String.raw` (template: "foo bar" , biz      , "baz quz") `,
			String.raw`(
  (templateNameFts.normalized GLOB '*foo bar*')
  OR
  (templateNameFts.normalized GLOB '*biz*')
  OR
  (templateNameFts.normalized GLOB '*baz quz*')
)`,
			3,
		)
	})

	test('neg on group', async () => {
		await assertEqual(
			String.raw`-(template:foo,bar)`,
			String.raw`(
  (templateNameFts.normalized NOT GLOB '*foo*')
  AND
  (templateNameFts.normalized NOT GLOB '*bar*')
)`,
			2,
		)
	})

	test('neg on tag', async () => {
		await assertEqual(
			String.raw`(-template:foo,bar)`,
			String.raw`(
  (templateNameFts.normalized NOT GLOB '*foo*')
  AND
  (templateNameFts.normalized NOT GLOB '*bar*')
)`,
			2,
		)
	})

	test('double neg', async () => {
		await assertEqual(
			String.raw`-(-template:foo,bar)`,
			String.raw`(
  (templateNameFts.normalized GLOB '*foo*')
  OR
  (templateNameFts.normalized GLOB '*bar*')
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
x1.z IS NOT NULL
AND
(note.templateId = 't')
AND
x2.z IS NOT NULL`,
			{
				x1: String.raw`(noteValueFts.normalized GLOB '*a*')`,
				x2: String.raw`(noteValueFts.normalized GLOB '*b*')`,
			},
			3,
		)
	})

	test('quoted string ORed with template', async () => {
		await assertEqual(
			String.raw`"a b" OR templateId:t OR "c d"`,
			String.raw`
x1.z IS NOT NULL
OR
(note.templateId = 't')
OR
x2.z IS NOT NULL`,
			{
				x1: String.raw`(noteValueFts.normalized GLOB '*a b*')`,
				x2: String.raw`(noteValueFts.normalized GLOB '*c d*')`,
			},
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
			String.raw`(cardSettingNameFts.normalized GLOB '*foo*')`,
			1,
		)
	})

	test('2', async () => {
		await assertEqual(
			String.raw`(setting:foo,bar)`,
			String.raw`
(
  (cardSettingNameFts.normalized GLOB '*foo*')
  OR
  (cardSettingNameFts.normalized GLOB '*bar*')
)`,
			2,
		)
	})

	test('regex', async () => {
		await assertEqual(
			String.raw`(setting:/foo/i,-/bar/ qux /bix/suuvvyys)`,
			String.raw`(
  regexp_with_flags('foo', 'i', cardSetting.name)
  OR NOT
  regexp_with_flags('bar', '', cardSetting.name)
  AND
  (cardSettingNameFts.normalized GLOB '*qux*')
  AND
  regexp_with_flags('bix', 'suvy', cardSetting.name)
)`,
			7,
		)
	})

	test('can contain doublequote and backslash', async () => {
		await assertEqual(
			String.raw`(setting:"a["]b","c\b")`,
			String.raw`(
  (cardSettingNameFts.normalized GLOB '*a["]b*')
  OR
  (cardSettingNameFts.normalized GLOB '*c\b*')
)`,
			2,
		)
	})

	test('simple string ANDed with setting', async () => {
		await assertEqual(
			String.raw`a setting:t b`,
			String.raw`
x1.z IS NOT NULL
AND
(cardSettingNameFts.normalized GLOB '*t*')
AND
x2.z IS NOT NULL`,
			{
				x1: String.raw`(noteValueFts.normalized GLOB '*a*')`,
				x2: String.raw`(noteValueFts.normalized GLOB '*b*')`,
			},
			3,
		)
	})

	test('quoted string ORed with setting', async () => {
		await assertEqual(
			String.raw`"a b" OR setting:t OR "c d"`,
			String.raw`
x1.z IS NOT NULL
OR
(cardSettingNameFts.normalized GLOB '*t*')
OR
x2.z IS NOT NULL`,
			{
				x1: String.raw`(noteValueFts.normalized GLOB '*a b*')`,
				x2: String.raw`(noteValueFts.normalized GLOB '*c d*')`,
			},
			3,
		)
	})

	test('quoted', async () => {
		await assertEqual(
			String.raw`(setting:"foo bar",biz,"baz quz")`,
			String.raw`(
  (cardSettingNameFts.normalized GLOB '*foo bar*')
  OR
  (cardSettingNameFts.normalized GLOB '*biz*')
  OR
  (cardSettingNameFts.normalized GLOB '*baz quz*')
)`,
			3,
		)
	})

	test('spaces', async () => {
		await assertEqual(
			String.raw` (setting: "foo bar" , biz      , "baz quz") `,
			String.raw`(
  (cardSettingNameFts.normalized GLOB '*foo bar*')
  OR
  (cardSettingNameFts.normalized GLOB '*biz*')
  OR
  (cardSettingNameFts.normalized GLOB '*baz quz*')
)`,
			3,
		)
	})

	test('neg on group', async () => {
		await assertEqual(
			String.raw`-(setting:foo,bar)`,
			String.raw`(
  (cardSettingNameFts.normalized NOT GLOB '*foo*')
  AND
  (cardSettingNameFts.normalized NOT GLOB '*bar*')
)`,
			2,
		)
	})

	test('neg on tag', async () => {
		await assertEqual(
			String.raw`(-setting:foo,bar)`,
			String.raw`(
  (cardSettingNameFts.normalized NOT GLOB '*foo*')
  AND
  (cardSettingNameFts.normalized NOT GLOB '*bar*')
)`,
			2,
		)
	})

	test('double neg', async () => {
		await assertEqual(
			String.raw`-(-setting:foo,bar)`,
			String.raw`(
  (cardSettingNameFts.normalized GLOB '*foo*')
  OR
  (cardSettingNameFts.normalized GLOB '*bar*')
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
x1.z IS NOT NULL
AND
(card.cardSettingId = 't')
AND
x2.z IS NOT NULL`,
			{
				x1: String.raw`(noteValueFts.normalized GLOB '*a*')`,
				x2: String.raw`(noteValueFts.normalized GLOB '*b*')`,
			},
			3,
		)
	})

	test('quoted string ORed with setting', async () => {
		await assertEqual(
			String.raw`"a b" OR settingId:t OR "c d"`,
			String.raw`
x1.z IS NOT NULL
OR
(card.cardSettingId = 't')
OR
x2.z IS NOT NULL`,
			{
				x1: String.raw`(noteValueFts.normalized GLOB '*a b*')`,
				x2: String.raw`(noteValueFts.normalized GLOB '*c d*')`,
			},
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
		return String.raw`(cardTagFts.normalized GLOB '${x}')`
	}
	function noteQuery(x: string) {
		return String.raw`(noteTagFts.normalized GLOB '${x}')`
	}

	test('1', async () => {
		await assertEqual(
			String.raw`tag:foo`,
			String.raw`(x1.tag IS NOT NULL OR x2.tag IS NOT NULL)`,
			{ x1: cardQuery('*foo*'), x2: noteQuery('*foo*') },
			2,
		)
	})

	test('2', async () => {
		await assertEqual(
			String.raw`(tag:foo,bar)`,
			String.raw`(
  (x1.tag IS NOT NULL OR x2.tag IS NOT NULL)
  OR
  (x3.tag IS NOT NULL OR x4.tag IS NOT NULL)
)`,
			{
				x1: cardQuery('*foo*'),
				x2: noteQuery('*foo*'),
				x3: cardQuery('*bar*'),
				x4: noteQuery('*bar*'),
			},
			4,
		)
	})

	test('regex', async () => {
		await assertEqual(
			String.raw`(tag:/foo/i,-/bar/ qux /bix/suuvvyys)`,
			String.raw`(
      (x1.tag IS NOT NULL OR  x2.tag IS NOT NULL)
  OR  (x3.tag IS     NULL AND x4.tag IS     NULL)
  AND (x5.tag IS NOT NULL OR  x6.tag IS NOT NULL)
  AND (x7.tag IS NOT NULL OR  x8.tag IS NOT NULL)
)`,
			{
				x1: "regexp_with_flags('foo', 'i', cardTag.tag)",
				x2: "regexp_with_flags('foo', 'i', noteTag.tag)",
				x3: "regexp_with_flags('bar', '', cardTag.tag)",
				x4: "regexp_with_flags('bar', '', noteTag.tag)",
				x5: cardQuery('*qux*'),
				x6: noteQuery('*qux*'),
				x7: "regexp_with_flags('bix', 'suvy', cardTag.tag)",
				x8: "regexp_with_flags('bix', 'suvy', noteTag.tag)",
			},
			14,
		)
	})

	test('can contain doublequote and backslash', async () => {
		await assertEqual(
			String.raw`(tag:"a["]b","c\b")`,
			String.raw`(
  (x1.tag IS NOT NULL OR x2.tag IS NOT NULL)
  OR
  (x3.tag IS NOT NULL OR x4.tag IS NOT NULL)
)`,
			{
				x1: cardQuery('*a["]b*'),
				x2: noteQuery('*a["]b*'),
				x3: cardQuery(String.raw`*c\b*`),
				x4: noteQuery(String.raw`*c\b*`),
			},
			4,
		)
	})

	test('simple string ANDed with tag', async () => {
		await assertEqual(
			String.raw`a tag:t b`,
			String.raw`
x1.z IS NOT NULL
AND
(x2.tag IS NOT NULL OR x3.tag IS NOT NULL)
AND
x4.z IS NOT NULL`,
			{
				x1: String.raw`(noteValueFts.normalized GLOB '*a*')`,
				x2: cardQuery('*t*'),
				x3: noteQuery('*t*'),
				x4: String.raw`(noteValueFts.normalized GLOB '*b*')`,
			},
			4,
		)
	})

	test('quoted string ORed with tag', async () => {
		await assertEqual(
			String.raw`"a b" OR tag:t OR "c d"`,
			String.raw`
x1.z IS NOT NULL
OR
(x2.tag IS NOT NULL OR x3.tag IS NOT NULL)
OR
x4.z IS NOT NULL
`,
			{
				x1: String.raw`(noteValueFts.normalized GLOB '*a b*')`,
				x2: cardQuery('*t*'),
				x3: noteQuery('*t*'),
				x4: String.raw`(noteValueFts.normalized GLOB '*c d*')`,
			},
			4,
		)
	})

	test('quoted', async () => {
		await assertEqual(
			String.raw`(tag:"foo bar",biz,"baz quz")`,
			String.raw`(
  (x1.tag IS NOT NULL OR x2.tag IS NOT NULL)
  OR
  (x3.tag IS NOT NULL OR x4.tag IS NOT NULL)
  OR
  (x5.tag IS NOT NULL OR x6.tag IS NOT NULL)
)`,
			{
				x1: cardQuery('*foo bar*'),
				x2: noteQuery('*foo bar*'),
				x3: cardQuery('*biz*'),
				x4: noteQuery('*biz*'),
				x5: cardQuery('*baz quz*'),
				x6: noteQuery('*baz quz*'),
			},
			6,
		)
	})

	test('spaces', async () => {
		await assertEqual(
			String.raw`( tag : "foo bar" , biz      , "baz quz" )`,
			String.raw`(
  (x1.tag IS NOT NULL OR x2.tag IS NOT NULL)
  OR
  (x3.tag IS NOT NULL OR x4.tag IS NOT NULL)
  OR
  (x5.tag IS NOT NULL OR x6.tag IS NOT NULL)
)`,
			{
				x1: cardQuery('*foo bar*'),
				x2: noteQuery('*foo bar*'),
				x3: cardQuery('*biz*'),
				x4: noteQuery('*biz*'),
				x5: cardQuery('*baz quz*'),
				x6: noteQuery('*baz quz*'),
			},
			6,
		)
	})

	test('neg on group', async () => {
		await assertEqual(
			String.raw`-(tag:foo,bar)`,
			String.raw`(
  (x1.tag IS NULL AND x2.tag IS NULL)
  AND
  (x3.tag IS NULL AND x4.tag IS NULL)
)`,
			{
				x1: cardQuery('*foo*'),
				x2: noteQuery('*foo*'),
				x3: cardQuery('*bar*'),
				x4: noteQuery('*bar*'),
			},
			4,
		)
	})

	test('neg on tag', async () => {
		await assertEqual(
			String.raw`(-tag:foo,bar)`,
			String.raw`(
  (x1.tag IS NULL AND x2.tag IS NULL)
  AND
  (x3.tag IS NULL AND x4.tag IS NULL)
)`,
			{
				x1: cardQuery('*foo*'),
				x2: noteQuery('*foo*'),
				x3: cardQuery('*bar*'),
				x4: noteQuery('*bar*'),
			},
			4,
		)
	})

	test('double neg', async () => {
		await assertEqual(
			String.raw`-(-tag:foo,bar)`,
			String.raw`(
  (x1.tag IS NOT NULL OR x2.tag IS NOT NULL)
  OR
  (x3.tag IS NOT NULL OR x4.tag IS NOT NULL)
)`,
			{
				x1: cardQuery('*foo*'),
				x2: noteQuery('*foo*'),
				x3: cardQuery('*bar*'),
				x4: noteQuery('*bar*'),
			},
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
