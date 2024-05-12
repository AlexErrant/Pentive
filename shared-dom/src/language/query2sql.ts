import { type SyntaxNodeRef, type SyntaxNode } from '@lezer/common'
import { parser } from './queryParser'
import { assertNever, escapeRegExp, throwExp } from 'shared'
import { sql, type RawBuilder, type SqlBool } from 'kysely'
import { Is, Regex } from './queryParser.terms'
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

class Context {
	constructor() {
		this.sql = []
		this.root = new Group(null, false)
		this.current = this.root
		this.joinTags = false
		this.joinFts = false
		this.joinTemplateFts = false
		this.joinCardSettingFts = false
		this.joinLatestReview = false
		this.fieldValueHighlight = []
	}

	sql: Array<string | RawBuilder<unknown>>
	root: Group
	current: Group
	joinTags: boolean
	joinFts: boolean
	joinTemplateFts: boolean
	joinCardSettingFts: boolean
	joinLatestReview: boolean
	fieldValueHighlight: string[]

	trustedSql(trustedSql: string) {
		this.sql.push(sql.raw(` ${trustedSql} `))
	}

	parameterizeSql(parameter: RawBuilder<unknown>) {
		this.sql.push(parameter)
	}
}

export function convert(input: string) {
	const tree = parser.parse(input)
	const context = new Context()
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
		joinTags: context.joinTags,
		joinFts: context.joinFts,
		joinCardSettingFts: context.joinCardSettingFts,
		joinTemplateFts: context.joinTemplateFts,
		joinLatestReview: context.joinLatestReview,
		fieldValueHighlight: context.fieldValueHighlight,
	}
}

// https://stackoverflow.com/a/28798479
function unique(str: string) {
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

function buildContent(node: SyntaxNodeRef, input: string) {
	const r: string[] = []
	const regex: string[] = []
	let needsRegex = false // we need regex for % and _ because `ESCAPE` isn't supported https://sqlite.org/forum/forumpost/314bf902e0
	if (node.node.firstChild == null) throwExp('How did you get this error?')
	let child = node.node.firstChild.nextSibling
	let close = null
	while (child != null) {
		if (
			child.type.id === qt.Quoted1Content ||
			child.type.id === qt.Quoted2Content ||
			child.type.id === qt.HtmlContent ||
			child.type.id === qt.RawQuoted1Content ||
			child.type.id === qt.RawQuoted2Content ||
			child.type.id === qt.RawHtmlContent
		) {
			const value = input.slice(child.from, child.to)
			regex.push(escapeRegExp(value))
			if (input.includes('%')) {
				needsRegex = true
				r.push(value.replaceAll('%', '_'))
			} else {
				r.push(value)
			}
		} else if (
			child.type.id === qt.Quoted1Escape ||
			child.type.id === qt.Quoted2Escape ||
			child.type.id === qt.HtmlEscape
		) {
			const char = input.charAt(child.to - 1)
			r.push(char)
			regex.push(escapeRegExp(char))
			if (char === '_') needsRegex = true
		} else if (
			child.type.id === qt.HtmlWildcard ||
			child.type.id === qt.Quoted1Wildcard ||
			child.type.id === qt.Quoted2Wildcard
		) {
			r.push('%')
			regex.push('.*')
		} else if (
			child.type.id === qt.HtmlWildcard1 ||
			child.type.id === qt.Quoted1Wildcard1 ||
			child.type.id === qt.Quoted2Wildcard1
		) {
			r.push('_')
			regex.push('.')
		}
		if (
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
	const fieldValueHighlight = regex.join('')
	return {
		value: r.join(''),
		wildcardLeft,
		wildcardRight,
		boundLeft,
		boundRight,
		regexPattern: needsRegex ? fieldValueHighlight : undefined,
		fieldValueHighlight,
	} satisfies Content
}

interface Content {
	value: string
	wildcardLeft: boolean
	wildcardRight: boolean
	boundLeft: boolean
	boundRight: boolean
	regexPattern?: string
	fieldValueHighlight: string
}

function astEnter(input: string, node: SyntaxNodeRef, context: Context) {
	if (node.type.isError) return
	if (
		node.type.is(qt.SimpleString) ||
		node.type.is(qt.KindEnum) ||
		node.type.is(qt.Quoted1) ||
		node.type.is(qt.Quoted2) ||
		node.type.is(qt.RawQuoted)
	) {
		maybeAddSeparator(node.node, context)
		const label = getLabel(node.node.parent!)
		const {
			value,
			wildcardLeft,
			wildcardRight,
			boundLeft,
			boundRight,
			regexPattern,
			fieldValueHighlight,
		} =
			node.type.is(qt.SimpleString) || node.type.is(qt.KindEnum)
				? ({
						value: input.slice(node.from, node.to),
						wildcardLeft: true,
						wildcardRight: true,
						boundLeft: false,
						boundRight: false,
						regexPattern: undefined,
						fieldValueHighlight: input.slice(node.from, node.to),
				  } satisfies Content)
				: node.type.is(qt.Quoted1) ||
				  node.type.is(qt.Quoted2) ||
				  node.type.is(qt.RawQuoted)
				? buildContent(node, input)
				: throwExp('You missed ' + node.type.name)
		const negate = isNegated(node.node)
		context.current.attach({
			type:
				node.type.is(qt.Quoted1) ||
				node.type.is(qt.Quoted2) ||
				node.type.is(qt.RawQuoted)
					? 'Quoted'
					: 'SimpleString',
			value,
			wildcardLeft,
			wildcardRight,
			boundLeft,
			boundRight,
			regexPattern,
			fieldValueHighlight,
			negate,
			label,
		})
	} else if (node.type.is(Regex)) {
		maybeAddSeparator(node.node, context)
		const tailDelimiterIndex = input.lastIndexOf('/', node.to)
		context.current.attach({
			type: regex,
			pattern: input.slice(node.from + 1, tailDelimiterIndex),
			flags: unique(input.slice(tailDelimiterIndex + 1, node.to)),
			negate: isNegated(node.node),
			label: getLabel(node.node.parent!),
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

function buildFilter(qs: QueryString, column: string) {
	const col = sql.raw(column)
	const left = qs.wildcardLeft ? '%' : ''
	const right = qs.wildcardRight ? '%' : ''
	const value = `${left}${qs.value}${right}`
	const filterList = [sql`${col} LIKE ${value}`]
	if (qs.regexPattern != null) {
		filterList.push(
			sql` AND regexp_with_flags(${qs.regexPattern}, 'i', ${col})`,
		)
	}
	if (qs.boundLeft && qs.boundRight) {
		filterList.push(sql` AND word(1, ${qs.value}, ${col})`)
	} else if (qs.boundLeft) {
		filterList.push(sql` AND word(0, ${qs.value}, ${col})`)
	} else if (qs.boundRight) {
		filterList.push(sql` AND word(2, ${qs.value}, ${col})`)
	}
	return sql.join(filterList, sql``) as RawBuilder<SqlBool>
}

function serialize(node: Node, context: Context) {
	if (node.type === simpleString || node.type === quoted) {
		if (node.label == null) {
			context.joinFts = true
			const filter = buildFilter(node, 'noteFtsFv.text')
			if (!node.negate && node.fieldValueHighlight != null) {
				context.fieldValueHighlight.push(node.fieldValueHighlight)
			}
			const not = getNot(node.negate)
			context.parameterizeSql(
				sql`noteFtsFv.rowid ${not} IN (SELECT rowid FROM noteFtsFv WHERE ${filter})`,
			)
		}
	} else if (node.type === regex) {
		context.joinFts = true
		const not = getNot(node.negate)
		context.parameterizeSql(
			sql`${not} regexp_with_flags(${node.pattern}, ${node.flags}, noteFtsFv.html)`,
		)
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
		context.joinTemplateFts = true
		const not = getNot(node.negate)
		if (node.type === 'Regex') {
			context.parameterizeSql(
				sql`${not} regexp_with_flags(${node.pattern}, ${node.flags}, templateNameFts.name)`,
			)
		} else {
			const filter = buildFilter(node, 'templateNameFts.name')
			context.parameterizeSql(
				sql`template.rowid ${not} IN (SELECT rowid FROM templateNameFts WHERE ${filter})`,
			)
		}
	} else if (node.label === templateId) {
		if (node.type === 'Regex') throwExp("you can't regex templateId")
		const equals = sql.raw(node.negate ? '!=' : '=')
		context.parameterizeSql(sql`note.templateId ${equals} ${node.value}`)
	} else if (node.label === setting) {
		context.joinCardSettingFts = true
		const not = getNot(node.negate)
		if (node.type === 'Regex') {
			context.parameterizeSql(
				sql`${not} regexp_with_flags(${node.pattern}, ${node.flags}, cardSettingNameFts.name)`,
			)
		} else {
			const filter = buildFilter(node, 'cardSettingNameFts.name')
			context.parameterizeSql(
				sql`card.cardSettingId ${not} IN (SELECT rowid FROM cardSettingNameFts WHERE ${filter})`,
			)
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
	}
}

function buildTagSearch(node: QueryString | QueryRegex, context: Context) {
	context.joinTags = true
	const not = getNot(node.negate)
	if (node.type === 'Regex') {
		context.parameterizeSql(
			sql`(
${not} regexp_with_flags(${node.pattern}, ${node.flags}, "cardFtsTag"."tags")
${sql.raw(node.negate ? 'AND' : 'OR')}
${not} regexp_with_flags(${node.pattern}, ${node.flags}, "noteFtsTag"."tags")
)`,
		)
	} else {
		const cardFilter = buildFilter(node, `"cardFtsTag"."tags"`)
		const noteFilter = buildFilter(node, `"noteFtsTag"."tags"`)
		context.parameterizeSql(
			sql`(
cardFtsTag.rowid ${not} IN (SELECT "rowid" FROM "cardFtsTag" WHERE ${cardFilter})
${sql.raw(node.negate ? 'AND' : 'OR')}
noteFtsTag.rowid ${not} IN (SELECT "rowid" FROM "noteFtsTag" WHERE ${noteFilter})
)`,
		)
	}
}

function getNot(negate: boolean) {
	return sql.raw(negate ? 'NOT' : ``)
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
		if (left.type.is(Is) || stringLabels.includes(left.name)) {
			return ''
		}
		if (
			left.type.is(qt.SimpleString) ||
			left.type.is(qt.Quoted1) ||
			left.type.is(qt.Quoted2) ||
			left.type.is(qt.RawQuoted) ||
			left.type.is(qt.RawHtml) ||
			left.type.is(qt.Regex) ||
			left.type.is(qt.Html) ||
			left.type.is(qt.Group) ||
			left.type.is(qt.Label) ||
			left.type.is(qt.KindEnum)
		) {
			return and
		}
		throw Error('Unhandled node:' + left.node.name)
	}
	return ''
}

interface QueryString {
	type: typeof simpleString | typeof quoted
	label?: Label
	value: string
	regexPattern?: string // only intended for internal use. Specifically to supplement where FTS is lacking, like escaping, word boundaries, and case sensitivity.
	fieldValueHighlight: string
	negate: boolean
	wildcardLeft: boolean
	wildcardRight: boolean
	boundLeft: boolean
	boundRight: boolean
}

interface QueryRegex {
	type: typeof regex
	label?: Label
	pattern: string
	flags: string
	negate: boolean
}

type Leaf = { type: typeof or | typeof and } | QueryString | QueryRegex

export type Node = Group | Leaf

type Label = (typeof labels)[number]

// types
const group = 'Group' as const
const simpleString = 'SimpleString' as const
const quoted = 'Quoted' as const
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
