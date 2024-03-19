import { Decoration, type DecorationSet, EditorView } from '@codemirror/view'
import { type Range, StateField, type EditorState } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { queryTerms } from 'shared-dom'

const quoteDecorator = Decoration.mark({ class: 'query-quote' })
const parenDecorator = Decoration.mark({ class: 'query-paren' })
const escapeDecorator = Decoration.mark({ class: 'query-escape' })

function getDecorations(state: EditorState): DecorationSet {
	const decorations: Array<Range<Decoration>> = []
	syntaxTree(state).iterate({
		enter: (node) => {
			if (node.type.is(queryTerms.QuotedString)) {
				decorations.push(quoteDecorator.range(node.from, node.from + 1))
				decorations.push(quoteDecorator.range(node.to - 1, node.to))
				const s = state.sliceDoc(node.from + 1, node.to - 1)
				let i = s.indexOf('\\', 0)
				while (i !== -1) {
					decorations.push(
						escapeDecorator.range(i + node.from + 1, i + node.from + 2),
					)
					i = s.indexOf('\\', i + 2)
				}
			} else if (node.type.is(queryTerms.Group)) {
				decorations.push(parenDecorator.range(node.from, node.from + 1))
				decorations.push(parenDecorator.range(node.to - 1, node.to))
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
