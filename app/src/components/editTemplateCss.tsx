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
import { css } from '@codemirror/lang-css'
import {
	createEffect,
	on,
	onCleanup,
	onMount,
	type VoidComponent,
} from 'solid-js'
import { type Template } from 'shared'
import { type SetStoreFunction } from 'solid-js/store'
import { oneDark } from '@codemirror/theme-one-dark'
import { theme } from '../globalState'

const EditTemplateCss: VoidComponent<{
	template: Template
	setTemplate: SetStoreFunction<{
		template: Template
	}>
}> = (props) => {
	let ref: HTMLDivElement | undefined
	let view: EditorView
	onMount(() => {
		view = new EditorView({
			parent: ref,
			dispatch: (tr) => {
				dispatch(tr, view, props.setTemplate)
			},
			state: createEditorState(props.template.css, theme()),
		})
	})
	createEffect(
		on(
			() => props.template.id,
			() => {
				view.setState(createEditorState(props.template.css, theme()))
			},
		),
	)
	createEffect(
		on(theme, (t) => {
			view.setState(createEditorState(props.template.css, t))
		}),
	)
	onCleanup(() => {
		view?.destroy()
	})
	return (
		<fieldset class='border-black border p-2'>
			<legend>
				<span class='p-2 px-4 font-bold'>CSS</span>
			</legend>
			<div class='max-h-[500px] resize-y overflow-auto' ref={ref} />
		</fieldset>
	)
}

export default EditTemplateCss

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
	setTemplate: SetStoreFunction<{
		template: Template
	}>,
) {
	if (editorView == null) return
	editorView.update([tr])
	if (tr.docChanged) {
		const newCode = tr.newDoc.sliceString(0, tr.newDoc.length)
		setTemplate('template', 'css', newCode)
	}
}

function createEditorState(doc: string, theme: 'light' | 'dark') {
	const maybeDark = theme === 'dark' ? [oneDark] : []
	return EditorState.create({
		doc,
		extensions: [[...basicSetup], css(), ...maybeDark],
	})
}
