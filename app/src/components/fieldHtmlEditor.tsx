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
import ResizingIframe from './resizingIframe'
import { format } from 'prettier'
import * as prettierPluginHtml from 'prettier/plugins/html'
import { C, theme } from '../topLevelAwait'

let view: EditorView
const FieldHtmlEditor: VoidComponent<{
	value: string
	setValue: (value: string) => void
	css: string
}> = (props) => {
	let ref: HTMLDivElement | undefined
	onMount(async () => {
		view = new EditorView({
			parent: ref,
			dispatch: (tr) => {
				dispatch(tr, view, props.setValue)
			},
		})
		new ResizeObserver(() => {
			view.requestMeasure()
		}).observe(ref!)
		view.setState(
			createEditorState(
				// https://prettier.io/blog/2018/11/07/1.15.0#whitespace-sensitive-formatting https://prettier.io/docs/en/options.html#html-whitespace-sensitivity
				await format(props.value, htmlFormatOpts),
				theme(),
			),
		)
	})
	createEffect(
		on(theme, (t) => {
			view.setState(createEditorState(props.value, t))
		}),
	)
	onCleanup(() => {
		view?.destroy()
	})
	return (
		<>
			<ResizingIframe i={{ tag: 'raw', css: props.css, html: props.value }} />
			<div
				class='flex-1 resize-y overflow-auto focus-within:border-black focus-within:border'
				ref={ref}
			/>
		</>
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
		extensions: [
			keymap.of([
				{
					key: 'Shift-Alt-f',
					run: (x) => {
						format(x.state.doc.toString(), htmlFormatOpts)
							.then((v) => {
								view.setState(createEditorState(v, theme))
							})
							.catch((e) => {
								C.toastError('Error while formatting.', e)
							})
						return true
					},
				},
			]),
			[...basicSetup],
			html(),
			...maybeDark,
		],
	})
}

const htmlFormatOpts = {
	parser: 'html',
	plugins: [prettierPluginHtml],
	useTabs: true,
}
