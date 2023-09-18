import { EditorState, type Transaction } from '@codemirror/state'
import {
	EditorView,
	keymap,
	highlightSpecialChars,
	drawSelection,
	highlightActiveLine,
	dropCursor,
	rectangularSelection,
	crosshairCursor,
	lineNumbers,
	highlightActiveLineGutter,
} from '@codemirror/view'
import {
	defaultHighlightStyle,
	syntaxHighlighting,
	indentOnInput,
	bracketMatching,
	foldGutter,
	foldKeymap,
} from '@codemirror/language'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import {
	autocompletion,
	completionKeymap,
	closeBrackets,
	closeBracketsKeymap,
} from '@codemirror/autocomplete'
import { lintKeymap } from '@codemirror/lint'
import { html } from '@codemirror/lang-html'
import {
	createEffect,
	on,
	onCleanup,
	onMount,
	type VoidComponent,
} from 'solid-js'
import { oneDark } from '@codemirror/theme-one-dark'
import { theme } from '../globalState'

const FieldHtmlEditor: VoidComponent<{
	value: string
	setValue: (value: string) => void
}> = (props) => {
	let frontRef: HTMLDivElement | undefined
	let frontView: EditorView
	onMount(() => {
		const t = theme()
		frontView = new EditorView({
			parent: frontRef,
			dispatch: (tr) => {
				dispatch(tr, frontView, props.setValue)
			},
			state: createEditorState(props.value, t),
		})
		new ResizeObserver(() => {
			frontView.requestMeasure()
		}).observe(frontRef!)
	})
	createEffect(
		on(theme, (t) => {
			frontView.setState(createEditorState(props.value, t))
		}),
	)
	onCleanup(() => {
		frontView?.destroy()
	})
	return (
		<div
			class='flex-1 resize-y overflow-auto focus-within:border-black focus-within:border'
			ref={frontRef}
		/>
	)
}

export default FieldHtmlEditor

// from https://github.com/codemirror/basic-setup/blob/main/src/codemirror.ts
const basicSetup = [
	lineNumbers(),
	highlightActiveLineGutter(),
	highlightSpecialChars(),
	history(),
	foldGutter(),
	drawSelection(),
	dropCursor(),
	EditorState.allowMultipleSelections.of(true),
	EditorView.lineWrapping,
	indentOnInput(),
	syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
	bracketMatching(),
	closeBrackets(),
	autocompletion(),
	rectangularSelection(),
	crosshairCursor(),
	highlightActiveLine(),
	highlightSelectionMatches(),
	keymap.of([
		...closeBracketsKeymap,
		...defaultKeymap,
		...searchKeymap,
		...historyKeymap,
		...foldKeymap,
		...completionKeymap,
		...lintKeymap,
	]),
]

function dispatch(
	tr: Transaction,
	editorView: EditorView,
	setValue: (value: string) => void,
) {
	if (editorView == null) return
	editorView.update([tr])
	if (tr.docChanged) {
		const newCode = tr.newDoc.sliceString(0, tr.newDoc.length)
		setValue(newCode)
	}
}

function createEditorState(doc: string, theme: 'light' | 'dark') {
	const maybeDark = theme === 'dark' ? [oneDark] : []
	return EditorState.create({
		doc,
		extensions: [[...basicSetup], html(), ...maybeDark],
	})
}
