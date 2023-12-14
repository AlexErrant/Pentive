import { type SyntaxNodeRef, type SyntaxNode } from '@lezer/common'
import { parser } from './queryParser'
import { assertNever } from 'shared'

class Context {
	constructor() {
		this.sql = ''
		this.indent = 0
		this.root = new Group(null, false)
		this.current = this.root
	}

	sql: string
	indent: number
	root: Group
	current: Group
}

export function convert(input: string) {
	const tree = parser.parse(input)
	const context = new Context()
	tree.cursor().iterate(
		(node) => {
			astEnter(input, node, context)
		},
		(node) => {
			astLeave(input, node, context)
		},
	)
	distributeNegate(context.root, false)
	serialize(context.root, context)
	return context.sql.trim()
}

function astEnter(input: string, node: SyntaxNodeRef, context: Context) {
	if (node.type.isError) return
	if (node.name === 'SimpleString' || node.name === 'QuotedString') {
		maybeAddSeparator(node.node, context)
		const value = input.slice(node.from, node.to)
		const negate = isNegated(node.node)
		context.current.attach({ type: node.name, value, negate })
	} else if (node.name === 'ParenthesizedExpression') {
		maybeAddSeparator(node.node, context)
		const negate = isNegated(node.node)
		const group = new Group(context.current, negate)
		context.current.attach(group)
		context.current = group
	}
}

function isNegated(node: SyntaxNode) {
	return node.node.prevSibling?.name === 'Not'
}

function astLeave(_input: string, node: SyntaxNodeRef, context: Context) {
	if (node.name === 'ParenthesizedExpression') {
		if (!context.current.isRoot) {
			context.current = context.current.parent!
		}
	}
}

function serialize(node: Node, context: Context) {
	const spaces = '  '.repeat(context.indent)
	if (node.type === 'SimpleString' || node.type === 'QuotedString') {
		const query = `(noteFtsFv.rowid ${
			node.negate ? 'NOT ' : ''
		}IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH '${
			node.value
		}'))`
		context.sql += '\n' + spaces + query
	} else if (node.type === 'Group') {
		if (!node.isRoot) {
			context.sql += '\n' + spaces + '('
			context.indent++
		}
		for (const child of node.children) {
			serialize(child, context)
		}
		if (!node.isRoot) {
			context.indent--
			context.sql += '\n' + spaces + ')'
		}
	} else if (node.type === 'AND') {
		context.sql += '\n' + spaces + 'AND'
	} else if (node.type === 'OR') {
		context.sql += '\n' + spaces + 'OR'
	} else {
		assertNever(node.type)
	}
}

function maybeAddSeparator(node: SyntaxNode, context: Context) {
	const separator = andOrNothing(node.node)
	if (separator !== '') context.current.attach({ type: separator })
}

function andOrNothing(node: SyntaxNode): '' | 'AND' | 'OR' {
	let left = node.prevSibling
	while (left != null) {
		if (left.type.isError) continue
		if (left.name === 'Or') return 'OR'
		if (
			left.name === 'SimpleString' ||
			left.name === 'QuotedString' ||
			left.name === 'ParenthesizedExpression' ||
			left.name === 'Tag' ||
			left.name === 'Deck'
		) {
			return 'AND'
		}
		if (left.name === 'Not') {
			left = left.prevSibling
			continue
		}
		throw Error('Unhandled node:' + left.node.name)
	}
	return ''
}

type Leaf =
	| { type: 'OR' | 'AND' }
	| {
			type: 'SimpleString' | 'QuotedString'
			value: string
			negate: boolean
	  }

type Node = Group | Leaf

class Group {
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
	}
}

function distributeNegate(node: Node, negate: boolean) {
	if (node.type === 'Group') {
		if (negate) node.negate = !node.negate
		for (const child of node.children) {
			distributeNegate(child, node.negate)
		}
	} else if (node.type === 'SimpleString' || node.type === 'QuotedString') {
		if (negate) node.negate = !node.negate
	} else if (node.type === 'AND') {
		if (negate) node.type = 'OR'
	} else if (node.type === 'OR') {
		if (negate) node.type = 'AND'
	} else {
		assertNever(node.type)
	}
}
