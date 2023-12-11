import { type SyntaxNode } from '@lezer/common'
import { parser } from './queryParser'

export function convert(input: string) {
	const tree = parser.parse(input)
	let r = ''
	let indent = 0
	tree.cursor().iterate(
		(node) => {
			if (node.name === 'SimpleString') {
				const separator = andOrNothing(node.node)
				if (separator !== '') {
					r += '\n' + separator + '\n'
				}
				const snippet = input.slice(node.from, node.to)
				const query = `(noteFtsFv.rowid IN (SELECT rowid FROM noteFtsFv WHERE noteFtsFv.fieldValues MATCH '${snippet}'))`
				r += '  '.repeat(indent) + query
			}
			if (node.name !== 'Program') {
				++indent
			}
		},
		(node): void => {
			if (node.name !== 'Program') {
				--indent
			}
		},
	)
	return r
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
