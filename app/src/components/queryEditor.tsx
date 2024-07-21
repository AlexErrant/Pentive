import { EditorState, StateField } from '@codemirror/state'
import {
	EditorView,
	keymap,
	highlightSpecialChars,
	drawSelection,
	dropCursor,
	type Tooltip,
	showTooltip,
} from '@codemirror/view'
import {
	defaultHighlightStyle,
	syntaxHighlighting,
	indentOnInput,
	bracketMatching,
	foldKeymap,
	syntaxTree,
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
	isDateValuedLabel,
	isNumberValuedLabel,
	inLabels,
	dateValuedLabels,
	firstReviewed,
	reviewed,
	queryTerms as qt,
} from 'shared-dom'
import { queryDecorations } from './queryDecorations'
import { db } from '../db'
import { C } from '../topLevelAwait'
import { notEmpty } from 'shared'

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
		activateOnCompletion: ({ apply, label, type }) => {
			const x = typeof apply === 'string' ? apply : label
			const lastChar = x.slice(-1)
			return (
				lastChar === ':' ||
				lastChar === '=' ||
				lastChar === '>' ||
				lastChar === '<' ||
				isDateValuedLabel(x) ||
				isNumberValuedLabel(x) ||
				type === 'uglyhack' // grep 3D3FADF2-7338-49F8-9CAF-9CBC2E9C5137
			)
		},
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
			cursorTooltipField,
			cursorTooltipBaseTheme,
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
			brackets: ['(', "'", '"', '`', "'''", '"""', '```', '[', '/'],
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
				getDate: C.getDate,
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

// https://codemirror.net/examples/tooltip
const cursorTooltipField = StateField.define<readonly Tooltip[]>({
	create: getTooltip,
	update(tooltips, tr) {
		if (!tr.docChanged && tr.selection == null) return tooltips
		return getTooltip(tr.state)
	},
	provide: (f) => showTooltip.computeN([f], (state) => state.field(f)),
})

function getTooltip(state: EditorState): readonly Tooltip[] {
	const tree = syntaxTree(state)
	return state.selection.ranges
		.filter((range) => range.empty)
		.map((range) => {
			const nodeAfter = tree.resolveInner(range.head, 1)
			if (
				nodeAfter.type.is(qt.Quoted1Open) ||
				nodeAfter.type.is(qt.Quoted2Open) ||
				nodeAfter.type.is(qt.RawQuoted1Open) ||
				nodeAfter.type.is(qt.RawQuoted2Open) ||
				nodeAfter.type.is(qt.HtmlOpen) ||
				nodeAfter.type.is(qt.RawHtmlOpen)
			) {
				const modifiers = state.sliceDoc(nodeAfter.from, nodeAfter.to)
				return buildModifiersTooltip(range.head, modifiers, true)
			}
			const nodeBefore = tree.resolveInner(range.head, -1)
			if (
				nodeBefore.type.is(qt.Quoted1Close) ||
				nodeBefore.type.is(qt.Quoted2Close) ||
				nodeBefore.type.is(qt.RawQuoted1Close) ||
				nodeBefore.type.is(qt.RawQuoted2Close) ||
				nodeBefore.type.is(qt.HtmlClose) ||
				nodeBefore.type.is(qt.RawHtmlClose)
			) {
				const modifiers = state.sliceDoc(nodeBefore.from, nodeBefore.to)
				return buildModifiersTooltip(range.head, modifiers, false)
			}
			if (inLabels(nodeBefore, dateValuedLabels)) {
				const firstChar = state.sliceDoc(nodeBefore.from, nodeBefore.from + 1)
				const threeSibslingsBefore =
					nodeBefore.prevSibling?.prevSibling?.prevSibling?.type.name
				const isRatingEum =
					threeSibslingsBefore === firstReviewed ||
					threeSibslingsBefore === reviewed
				const textContent =
					firstChar === '<'
						? isRatingEum
							? 'Harder'
							: 'Before'
						: firstChar === '>'
						? isRatingEum
							? 'Easier'
							: 'After'
						: null
				if (textContent == null) return null
				return buildTooltip(range.head, textContent)
			} else {
				return null
			}
		})
		.filter(notEmpty)
}

function buildModifiersTooltip(
	pos: number,
	modifiers: string,
	isStart: boolean,
) {
	const textContent: string[] = []
	if (modifiers.includes('##'))
		textContent.push(`${isStart ? 'Starts' : 'Ends'} With`)
	else if (modifiers.includes('#')) textContent.push('Word Boundary')
	if (modifiers.includes('^')) textContent.push('Case Sensitive')
	if (modifiers.includes('%')) textContent.push('Remove Combining Characters')
	if (textContent.length === 0) return null
	return buildTooltip(pos, textContent.join(', '))
}

function buildTooltip(pos: number, textContent: string) {
	return {
		pos,
		above: true,
		strictSide: true,
		arrow: true,
		create: () => {
			const dom = document.createElement('div')
			dom.className = 'cm-tooltip-cursor'
			dom.textContent = textContent
			return { dom }
		},
	} satisfies Tooltip
}
const cursorTooltipBaseTheme = EditorView.baseTheme({
	'.cm-tooltip.cm-tooltip-cursor': {
		backgroundColor: '#66b',
		color: 'white',
		border: 'none',
		padding: '2px 7px',
		borderRadius: '4px',
		'& .cm-tooltip-arrow:before': {
			borderTopColor: '#66b',
		},
		'& .cm-tooltip-arrow:after': {
			borderTopColor: 'transparent',
		},
	},
})
