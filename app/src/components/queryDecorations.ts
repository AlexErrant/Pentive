import { Decoration, type DecorationSet, EditorView } from '@codemirror/view'
import { type Range, StateField, type EditorState } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { queryTerms } from 'shared-dom'

const activeDecorator = Decoration.mark({ class: 'query-active' })

function getDecorations(state: EditorState): DecorationSet {
	const decorations: Array<Range<Decoration>> = []
	let activeParenSet = false
	syntaxTree(state).iterate({
		enter: (node) => {
			if (
				node.type.isError ||
				state.selection.main.head < node.from ||
				state.selection.main.head > node.to
			) {
				return false
			}
			if (
				node.type.is(queryTerms.Quoted1) ||
				node.type.is(queryTerms.Quoted2) ||
				node.type.is(queryTerms.Html) ||
				node.type.is(queryTerms.RawQuoted) ||
				node.type.is(queryTerms.RawHtml)
			) {
				const open = node.node.getChild('Open')
				const close = node.node.getChild('Close')
				if (
					open !== null &&
					close !== null &&
					state.selection.main.head >= open.from &&
					state.selection.main.head <= close.to
				) {
					decorations.push(activeDecorator.range(open.from, open.to))
					decorations.push(activeDecorator.range(close.from, close.to))
				}
				return false
			}
		},
		leave: (node) => {
			// this is on the `leave` callback because we want to set `activeParenSet=true` on the most nested parens
			if (node.type.is(queryTerms.Group)) {
				if (
					state.selection.main.head >= node.from &&
					state.selection.main.head <= node.to &&
					!activeParenSet
				) {
					decorations.push(activeDecorator.range(node.from, node.from + 1))
					decorations.push(activeDecorator.range(node.to - 1, node.to))
					activeParenSet = true
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
