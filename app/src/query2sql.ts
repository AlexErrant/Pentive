import { type SyntaxNodeRef, type SyntaxNode } from '@lezer/common'
import { parser } from './queryParser'

class Context {
	constructor() {
		this.sql = ''
		this.indent = 0
	}

	sql: string
	indent: number
}

export function convert(input: string) {
	const tree = parser.parse(input)
	const context = new Context()
	tree.cursor().iterate(
		(node) => {
			enter(input, node, context)
		},
		(node) => {
			leave(input, node, context)
		},
	)
	return context.sql
}

function enter(input: string, node: SyntaxNodeRef, context: Context) {
	const spaces = '  '.repeat(context.indent)
	if (node.name === 'SimpleString') {
		const separator = andOrNothing(node.node)
		if (separator !== '') {
			context.sql += '\n' + spaces + separator + '\n'
		}
		const snippet = input.slice(node.from, node.to)
		const query = `(noteFtsFv.rowid ${maybeNot(
			node,
		)}IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH '${snippet}'))`
		context.sql += spaces + query
	} else if (node.name === 'ParenthesizedExpression') {
		context.sql += spaces + '(\n'
	}

	if (node.name !== 'Program') {
		++context.indent
	}
}

function leave(input: string, node: SyntaxNodeRef, context: Context) {
	if (node.name !== 'Program') {
		--context.indent
	}

	if (node.name === 'ParenthesizedExpression') {
		const spaces = '  '.repeat(context.indent)
		context.sql += '\n' + spaces + ')'
	}
}

function maybeNot(node: SyntaxNodeRef): '' | 'NOT ' {
	if (node.node.prevSibling?.name === 'Not' || hasNegatedParens(node.node)) {
		return 'NOT '
	}
	return ''
}

function hasNegatedParens(node: SyntaxNode) {
	let n: SyntaxNode | null = node
	let count = 0
	while (n != null && n.name !== 'Program') {
		if (
			n.node.name === 'ParenthesizedExpression' &&
			n.node.prevSibling?.name === 'Not'
		) {
			count++
		}
		n = n.node.parent
	}
	return !(count % 2 === 0)
}

function andOrNothing(node: SyntaxNode): '' | 'AND' | 'OR' {
	let left = node.prevSibling
	while (left != null) {
		if (left.name === 'Or') {
			if (hasNegatedParens(node)) return 'AND'
			return 'OR'
		}
		if (
			left.name === 'SimpleString' ||
			left.name === 'QuotedString' ||
			left.name === 'ParenthesizedExpression' ||
			left.name === 'Tag' ||
			left.name === 'Deck'
		) {
			if (hasNegatedParens(node)) return 'OR'
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
