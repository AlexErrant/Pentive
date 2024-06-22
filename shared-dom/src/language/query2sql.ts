import { type SyntaxNodeRef, type SyntaxNode } from '@lezer/common'
import { parser } from './queryParser'
import {
	assertNever,
	dayInMs,
	escapeRegExp,
	ftsNormalize,
	throwExp,
} from 'shared'
import { sql, type RawBuilder, type SqlBool } from 'kysely'
import * as qt from './queryParser.terms'
import {
	stringLabels,
	labels,
	tag,
	template,
	templateId,
	setting,
	settingId,
	kind,
	type kindEnums,
} from './stringLabels'

type JoinTable = Array<{
	sql: RawBuilder<SqlBool>
	name: string
}>

class Context {
	constructor(now: Date) {
		this.now = now
		this.sql = []
		this.root = new Group(null, false)
		this.current = this.root
		this.joinCardTags = []
		this.joinNoteTags = []
		this.joinCardTagsFts = []
		this.joinNoteTagsFts = []
		this.joinNoteValueFts = []
		this.joinNoteFieldValue = []
		this.joinTemplateNameFts = false
		this.joinCardSettingNameFts = false
		this.joinLatestReview = false
		this.fieldValueHighlight = []
		this.joinTableName = 0
	}

	sql: Array<string | RawBuilder<unknown>>
	root: Group
	current: Group
	joinCardTags: JoinTable
	joinNoteTags: JoinTable
	joinCardTagsFts: JoinTable
	joinNoteTagsFts: JoinTable
	joinNoteValueFts: JoinTable
	joinNoteFieldValue: JoinTable
	joinTemplateNameFts: boolean
	joinCardSettingNameFts: boolean
	joinLatestReview: boolean
	fieldValueHighlight: FieldValueHighlight[]
	joinTableName: number
	now: Date

	trustedSql(trustedSql: string) {
		this.sql.push(sql.raw(` ${trustedSql} `))
	}

	parameterizeSql(parameter: RawBuilder<unknown>) {
		this.sql.push(parameter)
	}

	like(
		qs: QueryString,
		table: Table,
		sourceColumn: string,
		forcePositive?: true,
	) {
		this.sql.push(glob(qs, table, sourceColumn, forcePositive))
	}

	regexpWithFlags(node: QueryRegex, column: string) {
		this.sql.push(regexpWithFlags(node, column))
	}
}

export interface FieldValueHighlight {
	pattern: string
	flags: string
	boundLeft: boolean
	boundRight: boolean
}

export function convert(input: string, now: Date) {
	const tree = parser.parse(input)
	const context = new Context(now)
	tree.cursor().iterate(
		(node) => astEnter(input, node, context),
		(node) => {
			astLeave(input, node, context)
		},
	)
	distributeNegate(context.root, false)
	serialize(context.root, context)
	return {
		sql:
			context.sql.length === 0
				? null
				: (sql.join(context.sql, sql``) as RawBuilder<SqlBool>),
		joinCardTag: context.joinCardTags,
		joinNoteTag: context.joinNoteTags,
		joinCardTagFts: context.joinCardTagsFts,
		joinNoteTagFts: context.joinNoteTagsFts,
		joinNoteValueFts: context.joinNoteValueFts,
		joinNoteFieldValue: context.joinNoteFieldValue,
		joinCardSettingNameFts: context.joinCardSettingNameFts,
		joinTemplateNameFts: context.joinTemplateNameFts,
		joinLatestReview: context.joinLatestReview,
		fieldValueHighlight: context.fieldValueHighlight,
	}
}

// https://stackoverflow.com/a/28798479
export function unique(str: string) {
	return Array.from(str)
		.filter((item, i, ar) => ar.indexOf(item) === i)
		.join('')
}

export function getLabel(node: SyntaxNodeRef) {
	if (node.type.is(qt.Group) || node.type.isTop) return undefined
	let child = node.node.firstChild
	while (child != null && !stringLabels.includes(child.type.name)) {
		child = child.nextSibling
	}
	const label = child?.name
	console.assert(
		labels.includes(label as never),
		`Expected Label but got ${label}.`,
	)
	return label as Label
}

function buildContent(node: SyntaxNodeRef, input: string, negate: boolean) {
	let valueFrom
	let valueTo
	const regex: string[] = []
	if (node.node.firstChild == null) throwExp('How did you get this error?')
	let child = node.node.firstChild.nextSibling
	let close = null
	while (child != null) {
		if (
			child.type.id === qt.Content_1 ||
			child.type.id === qt.Content_2 ||
			child.type.id === qt.Content_3 ||
			child.type.id === qt.RawQuoted1Content ||
			child.type.id === qt.RawQuoted2Content ||
			child.type.id === qt.RawHtmlContent
		) {
			const value = input.slice(child.from, child.to)
			regex.push(escapeRegExp(value))
			valueFrom ??= child.from
			valueTo = child.to
		} else if (
			child.type.id === qt.Squared_1 ||
			child.type.id === qt.Squared_2 ||
			child.type.id === qt.Squared_3
		) {
			valueFrom ??= child.from
			valueTo = child.to
			regex.push(input.slice(child.from, child.to))
		} else if (
			child.type.id === qt.Wildcard_1 ||
			child.type.id === qt.Wildcard_2 ||
			child.type.id === qt.Wildcard_3
		) {
			valueFrom ??= child.from
			valueTo = child.to
			regex.push('.*')
		} else if (
			child.type.id === qt.Wildcard1_1 ||
			child.type.id === qt.Wildcard1_2 ||
			child.type.id === qt.Wildcard1_3
		) {
			valueFrom ??= child.from
			valueTo = child.to
			regex.push('.')
		} else if (
			child.type.id === qt.Quoted1Close ||
			child.type.id === qt.Quoted2Close ||
			child.type.id === qt.RawQuoted1Close ||
			child.type.id === qt.RawQuoted2Close ||
			child.type.id === qt.HtmlClose ||
			child.type.id === qt.RawHtmlClose
		) {
			close = input.slice(child.from, child.to)
			break
		}
		child = child.nextSibling
	}
	const open = input.slice(node.node.firstChild.from, node.node.firstChild.to)
	const wildcardLeft = !open.includes('##')
	const wildcardRight = close == null ? true : !close.includes('##')
	const boundLeft = wildcardLeft && open.includes('#')
	const boundRight =
		close == null ? false : wildcardRight && close.includes('#')
	const pattern = regex.join('')
	const caseSensitive = open.includes('^') || close?.includes('^') === true
	const removeCombiningCharacters =
		open.includes('%') || close?.includes('%') === true
	return {
		value: input.slice(valueFrom, valueTo),
		wildcardLeft,
		wildcardRight,
		boundLeft,
		boundRight,
		removeCombiningCharacters,
		caseSensitive,
		fieldValueHighlight: negate
			? undefined // if negate, don't highlight, since it won't be in the search
			: {
					pattern,
					flags: caseSensitive ? 'v' : 'vi', // regex flag 31C731B0-41F5-46A5-93B4-D00D9A6064EA
					boundRight,
					boundLeft,
			  },
	} satisfies Content
}

interface Content {
	value: string
	wildcardLeft: boolean
	wildcardRight: boolean
	boundLeft: boolean
	boundRight: boolean
	removeCombiningCharacters: boolean
	caseSensitive: boolean
	fieldValueHighlight?: FieldValueHighlight
}

function astEnter(input: string, node: SyntaxNodeRef, context: Context) {
	if (node.type.isError) return
	if (
		node.type.is(qt.SimpleString) ||
		node.type.is(qt.KindEnum) ||
		node.type.is(qt.DueEnum) ||
		node.type.is(qt.Number) ||
		node.type.is(qt.Date) ||
		node.type.is(qt.Quoted1) ||
		node.type.is(qt.Quoted2) ||
		node.type.is(qt.Html) ||
		node.type.is(qt.RawHtml) ||
		node.type.is(qt.RawQuoted)
	) {
		maybeAddSeparator(node.node, context)
		const label = getLabel(node.node.parent!)
		const negate = isNegated(node.node)
		let comparison
		if (node.type.is(qt.Date)) {
			const prev = node.node.prevSibling!
			const maybe = input.slice(prev.from, prev.to) as Comparison
			if (comparisons.includes(maybe)) {
				comparison = maybe
			} else {
				throwExp('Unhandled comparison: ' + comparison)
			}
		}
		const {
			value,
			wildcardLeft,
			wildcardRight,
			boundLeft,
			boundRight,
			fieldValueHighlight,
			caseSensitive,
			removeCombiningCharacters,
		} =
			node.type.is(qt.SimpleString) ||
			node.type.is(qt.KindEnum) ||
			node.type.is(qt.DueEnum) ||
			node.type.is(qt.Date) ||
			node.type.is(qt.Number)
				? ({
						value:
							negate && node.type.is(qt.Number)
								? '-' + input.slice(node.from, node.to)
								: input.slice(node.from, node.to),
						wildcardLeft: true,
						wildcardRight: true,
						boundLeft: false,
						boundRight: false,
						caseSensitive: false,
						removeCombiningCharacters: false,
						fieldValueHighlight: {
							pattern: escapeRegExp(input.slice(node.from, node.to)),
							flags: 'vi', // regex flag 31C731B0-41F5-46A5-93B4-D00D9A6064EA
							boundLeft: false,
							boundRight: false,
						},
				  } satisfies Content)
				: node.type.is(qt.Quoted1) ||
				  node.type.is(qt.Quoted2) ||
				  node.type.is(qt.Html) ||
				  node.type.is(qt.RawHtml) ||
				  node.type.is(qt.RawQuoted)
				? buildContent(node, input, negate)
				: throwExp('You missed ' + node.type.name)
		context.current.attach({
			type:
				node.type.is(qt.Quoted1) ||
				node.type.is(qt.Quoted2) ||
				node.type.is(qt.RawQuoted)
					? 'Quoted'
					: node.type.is(qt.Html) || node.type.is(qt.RawHtml)
					? 'Html'
					: node.type.is(qt.Number)
					? 'Number'
					: node.type.is(qt.Date)
					? 'Date'
					: 'SimpleString',
			value,
			wildcardLeft,
			wildcardRight,
			boundLeft,
			boundRight,
			fieldValueHighlight,
			negate,
			label,
			comparison,
			caseSensitive,
			removeCombiningCharacters,
		})
	} else if (node.type.is(qt.Regex)) {
		maybeAddSeparator(node.node, context)
		const tailDelimiterIndex = input.lastIndexOf('/', node.to)
		const pattern = input.slice(node.from + 1, tailDelimiterIndex)
		const flags = unique(input.slice(tailDelimiterIndex + 1, node.to))
		context.current.attach({
			type: regex,
			pattern,
			flags,
			negate: isNegated(node.node),
			label: getLabel(node.node.parent!),
			fieldValueHighlight: {
				pattern,
				flags,
				boundLeft: false,
				boundRight: false,
			},
		})
		return false
	} else if (node.type.is(qt.Group) || node.type.is(qt.Label)) {
		maybeAddSeparator(node.node, context)
		let negate = isNegated(node.node)
		const label = getLabel(node)
		if (
			node.type.is(qt.Label) &&
			node.node.firstChild?.type.is(qt.Not) === true
		) {
			negate = !negate
		}
		const group = new Group(context.current, negate, label)
		context.current.attach(group)
		context.current = group
	}
}

function isNegated(node: SyntaxNode) {
	let left = node.node.prevSibling
	while (left?.type.isError === true) {
		left = left.prevSibling
	}
	return left?.type.is(qt.Not) === true
}

function astLeave(_input: string, node: SyntaxNodeRef, context: Context) {
	if (node.type.is(qt.Group) || node.type.is(qt.Label)) {
		if (!context.current.isRoot) {
			context.current = context.current.parent!
		}
	}
}

type Table =
	| 'cardTagFts'
	| 'noteTagFts'
	| 'cardSettingNameFts'
	| 'templateNameFts'
	| 'noteValueFts'

function glob(
	qs: QueryString,
	table: Table,
	sourceColumn: string,
	forcePositive?: true,
	stripHtml?: '0',
) {
	const tbl = sql.raw(table)
	const left = qs.wildcardLeft ? '*' : ''
	const right = qs.wildcardRight ? '*' : ''
	const normalizedValue = ftsNormalize(qs.value, false, true, false)
	const wildcardedValue = `${left}${normalizedValue}${right}`
	const not = getNot(qs.negate, forcePositive)
	const removeCombiningCharacters = qs.removeCombiningCharacters ? '1' : '0'
	const init = qs.removeCombiningCharacters
		? sql.raw(' (TRUE ') // gotta have something since there may be subsequent ANDs
		: sql`(${tbl}.normalized ${not} GLOB ${wildcardedValue}`
	const filterList = [init]
	const sHtml = stripHtml ?? '1'
	const caseFoldBool = qs.caseSensitive ? '0' : '1' // "if caseSensitive, do NOT case fold"
	const col = sql.raw(
		`ftsNormalize(${table}.${sourceColumn}, ${sHtml}, ${caseFoldBool}, ${removeCombiningCharacters})`,
	)
	let customNormalized
	if (qs.removeCombiningCharacters || qs.caseSensitive) {
		const caseFoldBool = !qs.caseSensitive
		customNormalized = ftsNormalize(
			qs.value,
			false,
			caseFoldBool,
			qs.removeCombiningCharacters,
		)
		const value = `${left}${customNormalized}${right}`
		filterList.push(sql` AND ${col} ${not} GLOB ${value}`)
	}
	const leftRightBoth = // 0 1 2 correspond to C3B5BEA8-3A89-40CB-971F-6FBA780A6487
		qs.boundLeft && qs.boundRight
			? 1
			: qs.boundLeft
			? 0
			: qs.boundRight
			? 2
			: null
	if (leftRightBoth != null) {
		const lrb = sql.raw(leftRightBoth.toString())
		const wordFilter =
			customNormalized === undefined
				? sql` AND ${not} word(${lrb}, ${normalizedValue}, normalized)`
				: sql` AND ${not} word(${lrb}, ${customNormalized}, ${col})`
		filterList.push(wordFilter)
	}
	filterList.push(sql.raw(`)`))
	return sql.join(filterList, sql``) as RawBuilder<SqlBool>
}

function regexpWithFlags(
	node: QueryRegex,
	column: string,
	forcePositive?: true,
) {
	const col = sql.raw(column)
	const not = getNot(node.negate, forcePositive)
	return sql<SqlBool>`${not} regexp_with_flags(${node.pattern}, ${node.flags}, ${col})`
}

function serialize(node: Node, context: Context) {
	if (
		node.type === simpleString ||
		node.type === quoted ||
		node.type === html ||
		node.type === number ||
		node.type === date ||
		node.type === regex
	) {
		const name = getJoinTableName(context)
		if (node.type === 'Regex') {
			context.joinNoteFieldValue.push({
				name,
				sql: regexpWithFlags(node, `noteFieldValue.value`, true),
			})
		} else if (node.type === 'Html') {
			context.joinNoteValueFts.push({
				name,
				sql: glob(node, `noteValueFts`, `value`, true, '0'),
			})
		} else {
			context.joinNoteValueFts.push({
				name,
				sql: glob(node, `noteValueFts`, `value`, true),
			})
		}
		context.trustedSql(`${name}.z IS ${node.negate ? '' : 'NOT'} NULL`) // `z` from 2DB5DD73-603E-4DF7-A366-A53375AF0093
		if (!node.negate && node.fieldValueHighlight != null) {
			context.fieldValueHighlight.push(node.fieldValueHighlight)
		}
	} else if (node.type === group) {
		const paren =
			!node.isRoot &&
			!(node.children.length === 1 && node.children[0]?.type === 'Group') // don't paren if the only child is a group, since that child will have its own parens
		if (paren) {
			context.trustedSql('(')
		}
		if (node.label == null) {
			for (const child of node.children) {
				serialize(child, context)
			}
		} else {
			for (const child of node.children) {
				if (
					child.type === 'SimpleString' ||
					child.type === 'Quoted' ||
					child.type === 'Number' ||
					child.type === 'Date' ||
					child.type === 'Html' ||
					child.type === 'Regex'
				) {
					handleLabel(child, context)
				} else {
					serialize(child, context)
				}
			}
		}
		if (paren) {
			context.trustedSql(')')
		}
	} else if (node.type === and) {
		context.trustedSql('AND')
	} else if (node.type === or) {
		context.trustedSql('OR')
	} else {
		assertNever(node.type)
	}
}

function handleLabel(node: QueryString | QueryRegex, context: Context) {
	if (node.label === tag) {
		buildTagSearch(node, context)
	} else if (node.label === template) {
		if (node.type === 'Regex') {
			context.regexpWithFlags(node, `template.name`)
		} else {
			context.joinTemplateNameFts = true
			context.like(node, 'templateNameFts', 'name')
		}
	} else if (node.label === templateId) {
		if (node.type === 'Regex') throwExp("you can't regex templateId")
		const equals = sql.raw(node.negate ? '!=' : '=')
		context.parameterizeSql(sql`note.templateId ${equals} ${node.value}`)
	} else if (node.label === setting) {
		if (node.type === 'Regex') {
			context.regexpWithFlags(node, `cardSetting.name`)
		} else {
			context.joinCardSettingNameFts = true
			context.like(node, 'cardSettingNameFts', 'name')
		}
	} else if (node.label === settingId) {
		if (node.type === 'Regex') throwExp("you can't regex settingId")
		const equals = sql.raw(node.negate ? '!=' : '=')
		context.parameterizeSql(sql`card.cardSettingId ${equals} ${node.value}`)
	} else if (node.label === kind) {
		if (node.type === 'Regex') throwExp("you can't regex kind")
		context.joinLatestReview = true
		const value = node.value as (typeof kindEnums)[number]
		const n =
			value === 'new'
				? null
				: value === 'learn'
				? 0
				: value === 'review'
				? 1
				: value === 'relearn'
				? 2
				: 3
		const equals = sql.raw(node.negate ? 'IS NOT' : 'IS')
		context.parameterizeSql(sql`latestReview.kind ${equals} ${n}`)
	} else if (node.label === 'created') {
		handleCreatedEditedDue(node, context, undefined, 'created')
	} else if (node.label === 'edited') {
		handleCreatedEditedDue(node, context, undefined, 'edited')
	} else if (node.label === 'cardCreated') {
		handleCreatedEditedDue(node, context, 'card', 'created')
	} else if (node.label === 'noteCreated') {
		handleCreatedEditedDue(node, context, 'note', 'created')
	} else if (node.label === 'cardEdited') {
		handleCreatedEditedDue(node, context, 'card', 'edited')
	} else if (node.label === 'noteEdited') {
		handleCreatedEditedDue(node, context, 'note', 'edited')
	} else if (node.label === 'due') {
		handleCreatedEditedDue(node, context, 'card', 'due')
	} else {
		throwExp('Unhandled label: ' + node.label)
	}
}

function handleCreatedEditedDue(
	node: Node,
	context: Context,
	table: 'note' | 'card' | undefined,
	column: 'created' | 'edited' | 'due',
) {
	if (node.type === 'Number') {
		const val = context.now.getTime() - parseInt(node.value) * dayInMs
		handleComparison(val, context, table, column, '>')
	} else if (node.type === 'SimpleString') {
		const comp =
			node.value === 'true'
				? '<='
				: node.value === 'false'
				? '>'
				: throwExp('impossible')
		handleComparison(context.now.getTime(), context, table, column, comp)
	} else if (node.type === 'Date') {
		const [year, month, day] = node.value.split('-')
		if (year == null || month == null || day == null) throwExp('impossible')
		const local = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)) // `new Date("2009-01-01") != new Date("2009-1-1")` so I parseInt
		let comparison = node.comparison!
		if (comparison === ':') comparison = '>'
		if (comparison === '=') {
			context.trustedSql('(')
			handleComparison(local.getTime(), context, table, column, '>')
			context.trustedSql('AND')
			handleComparison(local.getTime() + dayInMs, context, table, column, '<')
			context.trustedSql(')')
		} else {
			handleComparison(local.getTime(), context, table, column, comparison)
		}
	} else {
		throwExp('impossible: ' + node.type)
	}
	node.fieldValueHighlight = undefined
}

function handleComparison(
	val: number,
	context: Context,
	table: 'note' | 'card' | undefined,
	column: 'created' | 'edited' | 'due',
	comparison: Comparison,
) {
	const comp = sql.raw(comparison)
	if (table == null) {
		const col = sql.raw(column)
		context.parameterizeSql(
			sql`(card.${col} ${comp} ${val} OR note.${col} ${comp} ${val})`,
		)
	} else {
		if (column === 'due') {
			context.parameterizeSql(sql`(card.due ${comp} ${val} AND card.due >= 0)`)
		} else {
			const tbl = sql.table(table)
			const col = sql.raw(column)
			context.parameterizeSql(sql`${tbl}.${col} ${comp} ${val}`)
		}
	}
}

function getJoinTableName(context: Context) {
	context.joinTableName++
	// x because sqlite doesn't like identifiers starting with numbers
	return 'x' + context.joinTableName
}

function buildTagSearch(node: QueryString | QueryRegex, context: Context) {
	const cardName = getJoinTableName(context)
	const noteName = getJoinTableName(context)
	if (node.type === 'Regex') {
		context.joinCardTags.push({
			name: cardName,
			sql: regexpWithFlags(node, `cardTag.tag`, true),
		})
		context.joinNoteTags.push({
			name: noteName,
			sql: regexpWithFlags(node, `noteTag.tag`, true),
		})
	} else {
		context.joinCardTagsFts.push({
			name: cardName,
			sql: glob(node, `cardTagFts`, `tag`, true),
		})
		context.joinNoteTagsFts.push({
			name: noteName,
			sql: glob(node, `noteTagFts`, `tag`, true),
		})
	}
	context.trustedSql(
		`(${cardName}.tag IS ${node.negate ? '' : 'NOT'} NULL ${
			node.negate ? 'AND' : 'OR'
		} ${noteName}.tag IS ${node.negate ? '' : 'NOT'} NULL)`,
	)
}

function getNot(negate: boolean, forcePositive?: true) {
	return forcePositive === true ? sql`` : sql.raw(negate ? 'NOT' : ``)
}

function maybeAddSeparator(node: SyntaxNode, context: Context) {
	const separator = andOrNothing(node.node)
	if (separator !== '') context.current.attach({ type: separator })
}

function andOrNothing(node: SyntaxNode): '' | typeof and | typeof or {
	let left = node.prevSibling
	while (left != null) {
		if (left.type.isError || left.type.is(qt.Not)) {
			left = left.prevSibling
			continue
		}

		if (left.type.is(qt.Or)) return or
		if (
			left.type.is(qt.Is) ||
			stringLabels.includes(left.name) ||
			left.type.is(qt.Comparison)
		) {
			return ''
		}
		if (
			left.type.is(qt.SimpleString) ||
			left.type.is(qt.Number) ||
			left.type.is(qt.Date) ||
			left.type.is(qt.Quoted1) ||
			left.type.is(qt.Quoted2) ||
			left.type.is(qt.RawQuoted) ||
			left.type.is(qt.RawHtml) ||
			left.type.is(qt.Regex) ||
			left.type.is(qt.Html) ||
			left.type.is(qt.Group) ||
			left.type.is(qt.Label) ||
			left.type.is(qt.KindEnum) ||
			left.type.is(qt.DueEnum)
		) {
			return and
		}
		throw Error('Unhandled node:' + left.node.name)
	}
	return ''
}

interface QueryString {
	type:
		| typeof simpleString
		| typeof quoted
		| typeof html
		| typeof number
		| typeof date
	label?: Label
	value: string
	caseSensitive: boolean
	fieldValueHighlight?: FieldValueHighlight
	negate: boolean
	wildcardLeft: boolean
	wildcardRight: boolean
	boundLeft: boolean
	boundRight: boolean
	removeCombiningCharacters: boolean
	comparison?: Comparison
}

const comparisons = [':', '=', '<', '>', '<=', '>='] as const
type Comparison = (typeof comparisons)[number]

interface QueryRegex {
	type: typeof regex
	label?: Label
	pattern: string
	flags: string
	negate: boolean
	fieldValueHighlight: FieldValueHighlight
}

type Leaf = { type: typeof or | typeof and } | QueryString | QueryRegex

export type Node = Group | Leaf

type Label = (typeof labels)[number]

// types
const group = 'Group' as const
const simpleString = 'SimpleString' as const
const quoted = 'Quoted' as const
const html = 'Html' as const
const number = 'Number' as const
const date = 'Date' as const
const or = 'OR' as const
const and = 'AND' as const
const regex = 'Regex' as const

export class Group {
	constructor(parent: Group | null, negate: boolean, label?: Label) {
		this.parent = parent
		this.isRoot = parent == null
		this.children = []
		this.negate = negate
		this.label = label
	}

	type = group
	label?: Label
	parent: Group | null
	isRoot: boolean
	children: Node[]
	negate: boolean

	attach(child: Node) {
		this.children.push(child)
		if (child.type === group) child.parent = this
	}

	attachMany(children: Node[]) {
		this.children.push(...children)
		for (const child of children) {
			if (child.type === group) child.parent = this
		}
	}

	// In boolean algebra, the order of operations from highest to lowest priority is: NOT, AND, OR.
	// We group ANDs to make negation propagation work.
	groupAnds() {
		let start: number | null = null
		let length = 1 // initialize to 1 to include the (eventual) ending node
		let cursor = 0
		while (cursor < this.children.length) {
			const andOrNull = this.children[cursor + 1]
			if (start != null && (andOrNull == null || andOrNull.type === or)) {
				const newGroup = new Group(this, false)
				const newChildren = this.children.splice(start, length, newGroup) // remove a sequence of ANDs and replace with their Group
				newGroup.attachMany(newChildren)
				start = null
				length = 1
				cursor = cursor + 1 - newChildren.length // add 1 for the new group, and remove children's length
			} else if (andOrNull?.type === and) {
				if (start == null) start = cursor
				length += 2
			}
			cursor += 2
		}
	}
}

// We don't use the db to handle negation distribution because handling negation of tags and fieldValues is complex.
// We need to know if they're positive or negative to build their negation logic, namely `NOT EXISTS (SELECT 1 FROM...`
function distributeNegate(node: Node, negate: boolean) {
	if (node.type === group) {
		if (negate) node.negate = !node.negate
		if (
			node.negate &&
			node.children.some((c) => c.type === and) &&
			node.children.some((c) => c.type === or)
		) {
			node.groupAnds()
		}
		for (const child of node.children) {
			distributeNegate(child, node.negate)
		}
	} else if (
		node.type === simpleString ||
		node.type === quoted ||
		node.type === html ||
		node.type === number ||
		node.type === date ||
		node.type === regex
	) {
		if (negate) node.negate = !node.negate
	} else if (node.type === and) {
		if (negate) node.type = or
	} else if (node.type === or) {
		if (negate) node.type = and
	} else {
		assertNever(node.type)
	}
}

// grep 36E8AC4E-5658-443C-96F1-E131B231861C
export function escapedQuoted1(str: string) {
	return str
		.replaceAll('\\', '\\\\') // this should be first
		.replaceAll("'", "\\'")
		.replaceAll('*', '\\*')
		.replaceAll('_', '\\_')
}
export function escapedQuoted2(str: string) {
	return str
		.replaceAll('\\', '\\\\') // this should be first
		.replaceAll('"', '\\"')
		.replaceAll('*', '\\*')
		.replaceAll('_', '\\_')
}
