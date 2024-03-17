import { type SyntaxNodeRef, type SyntaxNode } from '@lezer/common'
import { parser } from './queryParser'
import { assertNever } from 'shared'
import { sql, type RawBuilder, type SqlBool } from 'kysely'

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
		sql: sql.join(context.sql, sql``) as RawBuilder<SqlBool>,
		joinTags: context.joinTags,
		joinFts: context.joinFts,
	}
}

function astEnter(input: string, node: SyntaxNodeRef, context: Context) {
	if (node.type.isError) return
	if (node.name === 'SimpleString' || node.name === 'QuotedString') {
		maybeAddSeparator(node.node, context)
		const value =
			node.name === 'SimpleString'
				? input.slice(node.from, node.to)
				: input
						.slice(node.from + 1, node.to - 1) // don't include quotes
						.replaceAll('\\\\', '\\')
						.replaceAll('\\"', '"')
		const negate = isNegated(node.node)
		context.current.attach({ type: node.name, value, negate })
	} else if (node.name === 'Group') {
		maybeAddSeparator(node.node, context)
		const negate = isNegated(node.node)
		const group = new Group(context.current, negate)
		context.current.attach(group)
		context.current = group
	} else if (node.name === 'Template' || node.name === 'Tag') {
		maybeAddSeparator(node.node, context)
		const values = []
		let child = node.node.firstChild
		while (child != null) {
			const value =
				child.name === 'SimpleString'
					? input.slice(child.from, child.to)
					: input
							.slice(child.from + 1, child.to - 1) // don't include quotes
							.replaceAll('\\\\', '\\')
							.replaceAll('\\"', '"')
			values.push(value)
			child = child.nextSibling
		}
		const negate = isNegated(node.node)
		context.current.attach({ type: node.name, values, negate })
		return false
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
	if (node.name === 'Group') {
		if (!context.current.isRoot) {
			context.current = context.current.parent!
		}
	}
}

function serialize(node: Node, context: Context) {
	if (node.type === 'SimpleString' || node.type === 'QuotedString') {
		context.joinFts = true
		context.sql.push(sql.raw(' (noteFtsFv.rowid '))
		if (node.negate) context.sql.push(sql.raw(' NOT '))
		context.sql.push(
			sql.raw(
				' IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH ',
			),
		)
		if (node.type === 'SimpleString') {
			context.sql.push(node.value)
		} else {
			context.sql.push('"' + node.value + '"')
		}
		context.sql.push(sql.raw(`))`))
	} else if (node.type === 'Template') {
		context.sql.push(sql.raw(` note.templateId `))
		if (node.negate) context.sql.push(sql.raw(' NOT '))
		// https://ricardoanderegg.com/posts/sqlite-list-array-parameter-query/
		context.sql.push(sql.raw(` IN (SELECT value FROM json_each(`))
		context.sql.push(JSON.stringify(node.values))
		context.sql.push(sql.raw(`)) `))
	} else if (node.type === 'Tag') {
		context.joinTags = true
		context.sql.push(sql.raw(' ( '))
		buildTagSearch('card', node, context)
		context.sql.push(sql.raw(node.negate ? ' AND ' : ' OR '))
		buildTagSearch('note', node, context)
		context.sql.push(sql.raw(' ) '))
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
	node: TagLeaf,
	context: Context,
) {
	context.sql.push(sql.raw(` ${type}FtsTag.rowid `))
	if (node.negate) context.sql.push(sql.raw(' NOT '))
	context.sql.push(
		sql.raw(
			` IN (SELECT "rowid" FROM "${type}FtsTag" WHERE "${type}FtsTag"."tags" match `,
		),
	)
	context.sql.push(
		// https://stackoverflow.com/a/46918640 https://blog.haroldadmin.com/posts/escape-fts-queries
		node.values.map((x) => `"${x.replaceAll('"', '""')}"`).join(' OR '),
	)
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
		if (
			left.name === 'SimpleString' ||
			left.name === 'QuotedString' ||
			left.name === 'Group' ||
			left.name === 'Tag' ||
			left.name === 'Deck' ||
			left.name === 'Template'
		) {
			return 'AND'
		}
		throw Error('Unhandled node:' + left.node.name)
	}
	return ''
}

interface TagLeaf {
	type: 'Tag'
	values: string[]
	negate: boolean
}

type Leaf =
	| { type: 'OR' | 'AND' }
	| {
			type: 'SimpleString' | 'QuotedString'
			value: string
			negate: boolean
	  }
	| {
			type: 'Template'
			values: string[]
			negate: boolean
	  }
	| TagLeaf

export type Node = Group | Leaf

export class Group {
	constructor(parent: Group | null, negate: boolean) {
		this.parent = parent
		this.isRoot = parent == null
		this.children = []
		this.negate = negate
	}

	type = 'Group' as const
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
				const newGroup = new Group(this, false)
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
		node.type === 'Template' ||
		node.type === 'Tag'
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
