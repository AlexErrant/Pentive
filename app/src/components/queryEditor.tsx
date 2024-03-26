import { EditorState } from '@codemirror/state'
import {
	EditorView,
	keymap,
	highlightSpecialChars,
	drawSelection,
	dropCursor,
} from '@codemirror/view'
import {
	defaultHighlightStyle,
	syntaxHighlighting,
	indentOnInput,
	bracketMatching,
	foldKeymap,
	LRLanguage,
} from '@codemirror/language'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import {
	autocompletion,
	completionKeymap,
	closeBrackets,
	closeBracketsKeymap,
	type CompletionSource,
	startCompletion,
} from '@codemirror/autocomplete'
import { lintKeymap } from '@codemirror/lint'
import {
	createEffect,
	on,
	onCleanup,
	onMount,
	type VoidComponent,
} from 'solid-js'
import { oneDark } from '@codemirror/theme-one-dark'
import { theme } from '../globalState'
import {
	queryLightHighlightStyle,
	queryDarkHighlightStyle,
	queryParser,
	queryLinter,
	queryCompletion,
} from 'shared-dom'
import { queryDecorations } from './queryDecorations'
import { db } from '../db'

let view: EditorView
const QueryEditor: VoidComponent<{
	value: string
	setValue: (value: string) => void
}> = (props) => {
	let ref: HTMLDivElement | undefined
	onMount(() => {
		view = new EditorView({
			parent: ref,
		})
		new ResizeObserver(() => {
			view.requestMeasure()
		}).observe(ref!)
	})
	createEffect(
		on(theme, (t) => {
			view.setState(createEditorState(props.value, t, props.setValue))
		}),
	)
	onCleanup(() => {
		view?.destroy()
	})
	return (
		<>
			<div class='flex-1 resize-y overflow-auto' ref={ref} />
		</>
	)
}

export default QueryEditor

const basicSetup = [
	highlightSpecialChars(),
	history(),
	drawSelection(),
	dropCursor(),
	EditorState.allowMultipleSelections.of(true),
	EditorView.lineWrapping,
	indentOnInput(),
	syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
	bracketMatching(),
	closeBrackets(),
	autocompletion(),
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
	setValue: (value: string) => void,
) {
	const maybeDark = theme === 'dark' ? [blackBackground, oneDark] : []
	return EditorState.create({
		doc,
		extensions: [
			keymap.of([
				{
					key: 'Enter',
					run: (x) => {
						const value = x.state.doc.toString()
						setValue(value)
						appendHistory(value)
						return true
					},
				},
				{
					key: 'ArrowDown',
					run: (x) => {
						if (x.state.doc.length === 0) {
							startCompletion(view)
							return true
						}
						return false
					},
				},
			]),
			[...basicSetup],
			queryLanguage,
			syntaxHighlighting(queryLightHighlightStyle),
			syntaxHighlighting(queryDarkHighlightStyle),
			queryDecorations,
			queryLinter,
			baseTheme,
			...maybeDark,
		],
	})
}

function getHistory() {
	return JSON.parse(localStorage.getItem('queryHistory') ?? '[]') as string[]
}

function appendHistory(value: string) {
	const history = getHistory()
	history.push(value)
	localStorage.setItem('queryHistory', JSON.stringify(history))
}

const queryLanguage = LRLanguage.define({
	parser: queryParser,
	languageData: {
		autocomplete: queryCompletion({
			getTags: db.getTags,
			getHistory,
		}) satisfies CompletionSource,
	},
})

const baseTheme = EditorView.baseTheme({
	'&light': {
		backgroundColor: 'white',
	},
	'& .cm-content': {
		fontSize: '1rem',
	},
	// https://discuss.codemirror.net/t/changing-the-font-size-of-cm6/2935/11
	'.cm-scroller': { fontFamily: 'inherit' },
	'.query-escape': {
		color: 'darkorange',
		fontWeight: 'bold',
	},
	'.query-paren': {
		color: 'darkorange',
		fontWeight: 'bold',
	},
	'.query-quote': {
		color: 'darkorange',
		fontWeight: 'bold',
	},
	'.query-active': {
		color: 'red',
		fontWeight: 'bold',
	},
	'.cm-completionIcon-general': {
		'&:after': { content: "'🗂\uFE0F'" },
	},
	'.cm-completionIcon-tag': {
		'&:after': { content: "'🏷\uFE0F'" },
	},
	'.cm-completionIcon-history': {
		'&:after': { content: "'🕑\uFE0F'" },
	},
})

const blackBackground = EditorView.theme({
	'&': {
		backgroundColor: 'black',
	},
})
