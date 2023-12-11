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
	if (node.name === 'SimpleString') {
		const separator = andOrNothing(node.node)
		const spaces = '  '.repeat(context.indent)
		if (separator !== '') {
			context.sql += '\n' + spaces + separator + '\n'
		}
		const snippet = input.slice(node.from, node.to)
		const query = `(noteFtsFv.rowid ${maybeNot(
			node,
		)}IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH '${snippet}'))`
		context.sql += spaces + query
	} else if (node.name === 'ParenthesizedExpression') {
		context.sql += '(\n'
	}

	if (node.name !== 'Program') {
		++context.indent
	}
}

function leave(input: string, node: SyntaxNodeRef, context: Context) {
	if (node.name === 'ParenthesizedExpression') {
		context.sql += '\n)'
	}

	if (node.name !== 'Program') {
		--context.indent
	}
}

function maybeNot(node: SyntaxNodeRef): '' | 'NOT ' {
	if (node.node.prevSibling?.name === 'Not') return 'NOT '
	return ''
}

function andOrNothing(node: SyntaxNode): '' | 'AND' | 'OR' {
	let left = node.prevSibling
	while (left != null) {
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
