import { EditorState } from '@codemirror/state'
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
import { sql, SQLite } from '@codemirror/lang-sql'
import {
	createEffect,
	on,
	onCleanup,
	onMount,
	type VoidComponent,
} from 'solid-js'
import { oneDark } from '@codemirror/theme-one-dark'
import { useThemeContext } from 'shared-dom/themeSelector'

const EditSql: VoidComponent<{
	run: (sql: string) => Promise<void>
}> = (props) => {
	let ref: HTMLDivElement | undefined
	let view: EditorView
	const [theme] = useThemeContext()
	onMount(() => {
		view = new EditorView({
			parent: ref,
			state: createEditorState(
				localStorage.getItem('sql') ?? '',
				theme(),
				props.run,
			),
		})
	})
	createEffect(
		on(theme, (t) => {
			view.setState(createEditorState(view.state.doc.toString(), t, props.run))
		}),
	)
	onCleanup(() => {
		view?.destroy()
	})
	return (
		<fieldset class='border-black border p-2'>
			<legend>
				<span class='p-2 px-4 font-bold'>SQL(ite)</span>
			</legend>
			<div class='h-[300px] resize-y overflow-auto' ref={ref} />
		</fieldset>
	)
}

export default EditSql

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

function createEditorState(
	doc: string,
	theme: 'light' | 'dark',
	run: (sql: string) => Promise<void>,
) {
	const maybeDark = theme === 'dark' ? [oneDark] : []
	return EditorState.create({
		doc,
		extensions: [
			keymap.of([
				{
					key: 'Ctrl-l',
					run: () => {
						console.clear()
						return true
					},
				},
				{
					key: 'Ctrl-Enter',
					run: (x) => {
						const selection = x.state.selection.ranges[0]
						let sql
						if (selection == null || selection.from === selection.to) {
							sql = x.state.doc.toString()
							localStorage.setItem('sql', sql)
						} else {
							sql = x.state.sliceDoc(selection.from, selection.to)
						}
						run(sql).catch(console.error)
						return true
					},
				},
			]),
			[...basicSetup],
			sql({ dialect: SQLite }),
			...maybeDark,
		],
	})
}
