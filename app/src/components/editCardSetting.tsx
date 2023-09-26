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
	hoverTooltip,
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
import { lintKeymap, linter, lintGutter } from '@codemirror/lint'
import { json, jsonLanguage, jsonParseLinter } from '@codemirror/lang-json'
import {
	createEffect,
	on,
	onCleanup,
	onMount,
	type VoidComponent,
} from 'solid-js'
import { type CardSetting } from 'shared'
import { oneDark } from '@codemirror/theme-one-dark'
import { theme } from '../globalState'
import {
	jsonSchemaLinter,
	jsonSchemaHover,
	jsonCompletion,
} from 'codemirror-json-schema'

const EditCardSetting: VoidComponent<{
	cardSetting: CardSetting
	setCardSetting: (_: CardSetting) => void
}> = (props) => {
	let ref: HTMLDivElement | undefined
	let view: EditorView
	const stringifiedCardSetting = () =>
		JSON.stringify(props.cardSetting, null, 2)
	onMount(() => {
		view = new EditorView({
			parent: ref,
			dispatch: (tr) => {
				dispatch(tr, view, props.setCardSetting)
			},
			state: createEditorState(stringifiedCardSetting(), theme()),
		})
	})
	createEffect(
		on(
			() => props.cardSetting.id,
			() => {
				view.setState(createEditorState(stringifiedCardSetting(), theme()))
			},
		),
	)
	createEffect(
		on(theme, (t) => {
			view.setState(createEditorState(stringifiedCardSetting(), t))
		}),
	)
	onCleanup(() => {
		view?.destroy()
	})
	return (
		<fieldset class='border-black border p-2'>
			<legend>
				<span class='p-2 px-4 font-bold'>JSON</span>
			</legend>
			<div class='h-full resize-y overflow-auto' ref={ref} />
		</fieldset>
	)
}

export default EditCardSetting

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

const schema = {
	type: 'object' as const,
	properties: {
		id: {
			type: 'string',
		},
		name: {
			type: 'string',
		},
	} as const,
	required: ['id', 'name'],
}

function dispatch(
	tr: Transaction,
	editorView: EditorView,
	setCardSetting: (_: CardSetting) => void,
) {
	if (editorView == null) return
	editorView.update([tr])
	if (tr.docChanged) {
		const newCode = tr.newDoc.sliceString(0, tr.newDoc.length)
		setCardSetting(JSON.parse(newCode) as CardSetting)
	}
}

function createEditorState(doc: string, theme: 'light' | 'dark') {
	const maybeDark = theme === 'dark' ? [oneDark] : []
	return EditorState.create({
		doc,
		extensions: [
			[...basicSetup],
			json(),
			...maybeDark,
			lintGutter(),
			linter(jsonParseLinter(), {
				delay: 300,
			}),
			linter(jsonSchemaLinter(schema), {
				delay: 300,
			}),
			jsonLanguage.data.of({
				autocomplete: jsonCompletion(schema),
			}),
			hoverTooltip(jsonSchemaHover(schema)),
		],
	})
}
