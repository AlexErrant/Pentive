import { Decoration, type DecorationSet, EditorView } from '@codemirror/view'
import { type Range, StateField, type EditorState } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { getQuoteCount, queryTerms } from 'shared-dom'

const quoteDecorator = Decoration.mark({ class: 'query-quote' })
const parenDecorator = Decoration.mark({ class: 'query-paren' })
const escapeDecorator = Decoration.mark({ class: 'query-escape' })
const activeDecorator = Decoration.mark({ class: 'query-active' })

function getDecorations(state: EditorState): DecorationSet {
	const decorations: Array<Range<Decoration>> = []
	let activeParenSet = false
	syntaxTree(state).iterate({
		enter: (node) => {
			if (
				node.type.is(queryTerms.QuotedString1) ||
				node.type.is(queryTerms.QuotedString2) ||
				node.type.is(queryTerms.Html)
			) {
				if (
					state.selection.main.head > node.from &&
					state.selection.main.head < node.to
				) {
					decorations.push(activeDecorator.range(node.from, node.from + 1))
					decorations.push(activeDecorator.range(node.to - 1, node.to))
				} else {
					decorations.push(quoteDecorator.range(node.from, node.from + 1))
					decorations.push(quoteDecorator.range(node.to - 1, node.to))
				}
				const s = state.sliceDoc(node.from + 1, node.to - 1)
				let i = s.indexOf('\\', 0)
				while (i !== -1) {
					decorations.push(
						escapeDecorator.range(i + node.from + 1, i + node.from + 2),
					)
					i = s.indexOf('\\', i + 2)
				}
			} else if (
				node.type.is(queryTerms.RawStringLiteral) ||
				node.type.is(queryTerms.RawHtmlLiteral)
			) {
				const quoted = state.sliceDoc(node.from, node.to)
				const i = getQuoteCount(quoted)
				if (
					state.selection.main.head > node.from &&
					state.selection.main.head < node.to
				) {
					decorations.push(activeDecorator.range(node.from, node.from + i))
					decorations.push(activeDecorator.range(node.to - i, node.to))
				} else {
					decorations.push(quoteDecorator.range(node.from, node.from + i))
					decorations.push(quoteDecorator.range(node.to - i, node.to))
				}
			}
		},
		leave: (node) => {
			// this is on the `leave` callback because we want to set `activeParenSet=true` on the most nested parens
			if (node.type.is(queryTerms.Group)) {
				if (
					state.selection.main.head > node.from &&
					state.selection.main.head < node.to &&
					!activeParenSet
				) {
					decorations.push(activeDecorator.range(node.from, node.from + 1))
					decorations.push(activeDecorator.range(node.to - 1, node.to))
					activeParenSet = true
				} else {
					decorations.push(parenDecorator.range(node.from, node.from + 1))
					decorations.push(parenDecorator.range(node.to - 1, node.to))
				}
			}
		},
	})
	return Decoration.set(decorations, true)
}

export const queryDecorations = StateField.define<DecorationSet>({
	create: getDecorations,
	update(decorations, tr) {
		if (!tr.docChanged && tr.selection == null) return decorations
		return getDecorations(tr.state)
	},
	provide: (f) => EditorView.decorations.from(f),
})
