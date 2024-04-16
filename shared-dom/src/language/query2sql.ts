import { type SyntaxNodeRef, type SyntaxNode } from '@lezer/common'
import { parser } from './queryParser'
import { assertNever } from 'shared'
import { sql, type RawBuilder, type SqlBool } from 'kysely'
import { Regex, Wildcard } from './queryParser.terms'
import { queryTerms as qt } from '..'

class Context {
	constructor() {
		this.sql = []
		this.root = new Group(null, false)
		this.current = this.root
		this.joinTags = false
		this.joinFts = false
	}

	sql: Array<string | RawBuilder<unknown>>
	root: Group
	current: Group
	joinTags: boolean
	joinFts: boolean

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
		strings: findStrings(context.root),
	}
}

// https://stackoverflow.com/a/28798479
function unique(str: string) {
	return Array.from(str)
		.filter((item, i, ar) => ar.indexOf(item) === i)
		.join('')
}

function getLabel(node: SyntaxNodeRef) {
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

function astEnter(input: string, node: SyntaxNodeRef, context: Context) {
	if (node.type.isError) return
	if (node.name === simpleString || node.name === quotedString) {
		maybeAddSeparator(node.node, context)
		const label = getLabel(node.node.parent!)
		const value = node.type.is(qt.SimpleString)
			? input.slice(node.from, node.to)
			: unescapeQuoted(
					input.slice(node.from + 1, node.to - 1), // don't include quotes
			  )
		const negate = isNegated(node.node)
		const wildcard = node.node.nextSibling?.type.is(Wildcard) === true
		context.current.attach({
			type: node.name,
			value,
			negate,
			wildcard,
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

function getValue(qs: QueryString) {
	// https://stackoverflow.com/a/46918640 https://blog.haroldadmin.com/posts/escape-fts-queries
	let r = `"${qs.value.replaceAll('"', '""')}"`
	if (qs.wildcard) r = r + ' * '
	return r
}

function serialize(node: Node, context: Context) {
	if (node.type === simpleString || node.type === quotedString) {
		if (node.label == null) {
			context.joinFts = true
			const value = getValue(node)
			const not = getNot(node.negate)
			context.parameterizeSql(
				sql`noteFtsFv.rowid ${not} IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH ${value})`,
			)
		} else if (node.label === tag) {
			buildTagSearch(node, context)
		} else if (node.label === template) {
			const equals = sql.raw(node.negate ? '!=' : '=')
			context.parameterizeSql(sql`note.templateId ${equals} ${node.value}`)
		}
	} else if (node.type === regex) {
		context.joinFts = true
		const not = getNot(node.negate)
		context.parameterizeSql(
			sql`${not} regexp_with_flags(${node.pattern}, ${node.flags}, noteFtsFv.value)`,
		)
	} else if (node.type === group) {
		if (!node.isRoot) {
			context.trustedSql('(')
		}
		for (const child of node.children) {
			serialize(child, context)
		}
		if (!node.isRoot) {
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

function buildTagSearch(qs: QueryString, context: Context) {
	context.joinTags = true
	const not = getNot(qs.negate)
	const value = getValue(qs)
	context.parameterizeSql(
		sql`(
cardFtsTag.rowid ${not} IN (SELECT "rowid" FROM "cardFtsTag" WHERE "cardFtsTag"."tags" match ${value})
${sql.raw(qs.negate ? 'AND' : 'OR')}
noteFtsTag.rowid ${not} IN (SELECT "rowid" FROM "noteFtsTag" WHERE "noteFtsTag"."tags" match ${value})
)`,
	)
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
		if (stringLabels.includes(left.name)) {
			return ''
		}
		if (
			left.type.is(qt.SimpleString) ||
			left.type.is(qt.QuotedString) ||
			left.type.is(qt.Regex) ||
			left.type.is(qt.Html) ||
			left.type.is(qt.Group) ||
			left.type.is(qt.Label)
		) {
			return and
		}
		throw Error('Unhandled node:' + left.node.name)
	}
	return ''
}

interface QueryString {
	type: typeof simpleString | typeof quotedString
	label?: Label
	value: string
	negate: boolean
	wildcard: boolean
}

type Leaf =
	| { type: typeof or | typeof and }
	| QueryString
	| {
			type: typeof regex
			pattern: string
			flags: string
			negate: boolean
	  }

export type Node = Group | Leaf

// labels
const tag = 'Tag' as const
const template = 'Template' as const
const labels = [tag, template] as const
const stringLabels = labels as readonly string[]
type Label = (typeof labels)[number]

// types
const group = 'Group' as const
const simpleString = 'SimpleString' as const
const quotedString = 'QuotedString' as const
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
		node.type === quotedString ||
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

function findStrings(root: Node) {
	const r: string[] = []
	const queue = [root]
	while (queue.length > 0) {
		const i = queue.shift()!
		if (i.type === group && i.label == null) {
			queue.push(...i.children)
		} else if (i.type === simpleString || i.type === quotedString) {
			if (!i.negate) {
				r.push(i.value)
			}
		}
	}
	return r
}

export function escapedQuoted(str: string) {
	return str.replaceAll('\\', '\\\\').replaceAll('"', '\\"') // the order here is important
}
export function unescapeQuoted(str: string) {
	return str.replaceAll('\\\\', '\\').replaceAll('\\"', '"')
}
