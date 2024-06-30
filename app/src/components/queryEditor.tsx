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
	type CloseBracketConfig,
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
	globQuery,
	queryLinter,
	queryCompletion,
} from 'shared-dom'
import { queryDecorations } from './queryDecorations'
import { db } from '../db'

let view: EditorView
const QueryEditor: VoidComponent<{
	value: string
	setValue: (value: string) => void
	// This exists so exernal callers can set the value.
	// We usually ignore changes to `value` to prevent unecessary `view.setState` calls
	externalValue: string
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
	createEffect(
		on(
			() => props.externalValue,
			(v) => {
				view.setState(createEditorState(v, theme(), props.setValue))
			},
		),
	)
	onCleanup(() => {
		view?.destroy()
	})
	return (
		<>
			<div class='query-editor max-h-40 flex-1 overflow-auto' ref={ref} />
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
	autocompletion({
		selectOnOpen: false,
		activateOnCompletion: ({ apply }) =>
			typeof apply === 'string' && apply.slice(-1) === ':',
	}),
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
						const value = x.state.doc.toString().trim()
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
			globQuery(getLanguageData(), getLanguageData(true)),
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
	const array = JSON.parse(
		localStorage.getItem('queryHistory') ?? '[]',
	) as string[]
	return new Set(array)
}

function appendHistory(value: string) {
	const history = getHistory()
	history.delete(value) // used to reorder and put `value` at the bottom if it's already in the set
	history.add(value)
	localStorage.setItem('queryHistory', JSON.stringify([...history].slice(-100)))
}

function getLanguageData(isSimpleString?: true) {
	return {
		closeBrackets: {
			brackets: ['(', "'", '"', '`', "'''", '"""', '```', '['],
			before: `)]'"\``,
		} satisfies CloseBracketConfig,
		autocomplete: queryCompletion(
			{
				getTags: db.getTags,
				getTemplates: async () =>
					await db.getTemplates().then((ts) => ts.map((t) => t.name)),
				getCardSettings: async () =>
					await db.getCardSettings().then((css) => css.map((cs) => cs.name)),
				getFields: db.getFields,
				getHistory,
			},
			isSimpleString,
		) satisfies CompletionSource,
	}
}

// why & https://codemirror.net/examples/styling
const prefix = '.query-editor &'

const baseTheme = EditorView.baseTheme({
	[`${prefix}light`]: {
		backgroundColor: 'white',
	},
	[`${prefix} .cm-content`]: {
		fontSize: '1rem',
	},
	// https://discuss.codemirror.net/t/changing-the-font-size-of-cm6/2935/11
	[`${prefix} .cm-scroller`]: { fontFamily: 'inherit' },
	[`${prefix} .query-active *`]: {
		color: 'red',
		fontWeight: 'bold',
	},
	[`${prefix} .cm-completionIcon-general`]: {
		'&:after': { content: "'🗂\uFE0F'" },
	},
	[`${prefix} .cm-completionIcon-tag`]: {
		'&:after': { content: "'🏷\uFE0F'" },
	},
	[`${prefix} .cm-completionIcon-history`]: {
		'&:after': { content: "'🕑\uFE0F'" },
	},
})

const blackBackground = EditorView.theme({
	[`${prefix}`]: {
		backgroundColor: 'black',
	},
})
