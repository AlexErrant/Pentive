import { type SyntaxNodeRef, type SyntaxNode } from '@lezer/common'
import { parser } from './queryParser'
import { assertNever } from 'shared'
import { sql, type RawBuilder, type SqlBool } from 'kysely'
import { Regex, Wildcard } from './queryParser.terms'
import { queryTerms } from '..'

class Context {
	constructor() {
		this.sql = []
		this.root = new Group(null, false, 'Group')
		this.current = this.root
		this.joinTags = false
		this.joinFts = false
	}

	sql: Array<string | RawBuilder<unknown>>
	root: Group
	current: Group
	joinTags: boolean
	joinFts: boolean
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
	if (node.type.is(queryTerms.Group) || node.type.isTop) return 'Group'
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
	if (node.name === 'SimpleString' || node.name === 'QuotedString') {
		maybeAddSeparator(node.node, context)
		const label = getLabel(node.node.parent!)
		const value =
			node.name === 'SimpleString'
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
			type: 'Regex',
			pattern: input.slice(node.from + 1, tailDelimiterIndex),
			flags: unique(input.slice(tailDelimiterIndex + 1, node.to)),
			negate: isNegated(node.node),
		})
		return false
	} else if (node.name === 'Group' || node.name === 'LabeledGroup') {
		maybeAddSeparator(node.node, context)
		let negate = isNegated(node.node)
		const label = getLabel(node)
		if (
			node.type.is(queryTerms.LabeledGroup) &&
			node.node.firstChild?.type.is(queryTerms.Not) === true
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
	return left?.name === 'Not'
}

function astLeave(_input: string, node: SyntaxNodeRef, context: Context) {
	if (node.name === 'Group' || node.name === 'LabeledGroup') {
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
	if (node.type === 'SimpleString' || node.type === 'QuotedString') {
		if (node.label === 'Group') {
			context.joinFts = true
			context.sql.push(sql.raw(' (noteFtsFv.rowid '))
			if (node.negate) context.sql.push(sql.raw(' NOT '))
			context.sql.push(
				sql.raw(
					' IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.value MATCH ',
				),
			)
			context.sql.push(getValue(node))
			context.sql.push(sql.raw(`))`))
		} else if (node.label === 'Tag') {
			context.joinTags = true
			context.sql.push(sql.raw(' ( '))
			buildTagSearch('card', node, context)
			context.sql.push(sql.raw(node.negate ? ' AND ' : ' OR '))
			buildTagSearch('note', node, context)
			context.sql.push(sql.raw(' ) '))
		} else if (node.label === 'Template') {
			context.sql.push(sql.raw(` note.templateId `))
			context.sql.push(sql.raw(node.negate ? ' != ' : ' = '))
			context.sql.push(node.value)
		}
	} else if (node.type === 'Regex') {
		context.joinFts = true
		if (node.negate) context.sql.push(sql.raw(' NOT '))
		context.sql.push(sql.raw(' regexp_with_flags('))
		context.sql.push(node.pattern)
		context.sql.push(sql.raw(','))
		context.sql.push(node.flags)
		context.sql.push(sql.raw(', noteFtsFv.value)'))
	} else if (node.type === 'Group') {
		if (!node.isRoot) {
			context.sql.push(sql.raw(' ( '))
		}
		for (const child of node.children) {
			serialize(child, context)
		}
		if (!node.isRoot) {
			context.sql.push(sql.raw(' ) '))
		}
	} else if (node.type === 'AND') {
		context.sql.push(sql.raw(' AND '))
	} else if (node.type === 'OR') {
		context.sql.push(sql.raw(' OR '))
	} else {
		assertNever(node.type)
	}
}

function buildTagSearch(
	type: 'note' | 'card',
	qs: QueryString,
	context: Context,
) {
	context.sql.push(sql.raw(` ${type}FtsTag.rowid `))
	if (qs.negate) context.sql.push(sql.raw(' NOT '))
	context.sql.push(
		sql.raw(
			` IN (SELECT "rowid" FROM "${type}FtsTag" WHERE "${type}FtsTag"."tags" match `,
		),
	)
	context.sql.push(getValue(qs))
	context.sql.push(sql.raw(`) `))
}

function maybeAddSeparator(node: SyntaxNode, context: Context) {
	const separator = andOrNothing(node.node)
	if (separator !== '') context.current.attach({ type: separator })
}

function andOrNothing(node: SyntaxNode): '' | 'AND' | 'OR' {
	let left = node.prevSibling
	while (left != null) {
		if (left.type.isError || left.name === 'Not') {
			left = left.prevSibling
			continue
		}

		if (left.name === 'Or') return 'OR'
		if (stringLabels.includes(left.name)) {
			return ''
		}
		if (
			left.name === 'SimpleString' ||
			left.name === 'QuotedString' ||
			left.name === 'Regex' ||
			left.name === 'Group' ||
			left.name === 'LabeledGroup' ||
			left.name === 'Deck'
		) {
			return 'AND'
		}
		throw Error('Unhandled node:' + left.node.name)
	}
	return ''
}

interface QueryString {
	type: 'SimpleString' | 'QuotedString'
	label: Label
	value: string
	negate: boolean
	wildcard: boolean
}

type Leaf =
	| { type: 'OR' | 'AND' }
	| QueryString
	| {
			type: 'Regex'
			pattern: string
			flags: string
			negate: boolean
	  }

export type Node = Group | Leaf

const labels = ['Group', 'Tag', 'Template'] as const
const stringLabels = labels as readonly string[]
type Label = (typeof labels)[number]

export class Group {
	constructor(parent: Group | null, negate: boolean, label: Label) {
		this.parent = parent
		this.isRoot = parent == null
		this.children = []
		this.negate = negate
		this.label = label
	}

	type = 'Group' as const
	label: Label
	parent: Group | null
	isRoot: boolean
	children: Node[]
	negate: boolean

	attach(child: Node) {
		this.children.push(child)
		if (child.type === 'Group') child.parent = this
	}

	attachMany(children: Node[]) {
		this.children.push(...children)
		for (const child of children) {
			if (child.type === 'Group') child.parent = this
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
			if (start != null && (andOrNull == null || andOrNull.type === 'OR')) {
				const newGroup = new Group(this, false, 'Group')
				const newChildren = this.children.splice(start, length, newGroup) // remove a sequence of ANDs and replace with their Group
				newGroup.attachMany(newChildren)
				start = null
				length = 1
				cursor = cursor + 1 - newChildren.length // add 1 for the new group, and remove children's length
			} else if (andOrNull?.type === 'AND') {
				if (start == null) start = cursor
				length += 2
			}
			cursor += 2
		}
	}
}

function distributeNegate(node: Node, negate: boolean) {
	if (node.type === 'Group') {
		if (negate) node.negate = !node.negate
		if (
			node.negate &&
			node.children.some((c) => c.type === 'AND') &&
			node.children.some((c) => c.type === 'OR')
		) {
			node.groupAnds()
		}
		for (const child of node.children) {
			distributeNegate(child, node.negate)
		}
	} else if (
		node.type === 'SimpleString' ||
		node.type === 'QuotedString' ||
		node.type === 'Regex'
	) {
		if (negate) node.negate = !node.negate
	} else if (node.type === 'AND') {
		if (negate) node.type = 'OR'
	} else if (node.type === 'OR') {
		if (negate) node.type = 'AND'
	} else {
		assertNever(node.type)
	}
}

function findStrings(root: Node) {
	const r: string[] = []
	const queue = [root]
	while (queue.length > 0) {
		const i = queue.shift()!
		if (i.type === 'Group' && i.label === 'Group') {
			queue.push(...i.children)
		} else if (i.type === 'SimpleString' || i.type === 'QuotedString') {
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
