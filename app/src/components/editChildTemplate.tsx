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
import { onCleanup, onMount, type VoidComponent } from 'solid-js'
import { type Template, type ChildTemplate } from 'shared'
import ResizingIframe from './resizingIframe'

const EditChildTemplate: VoidComponent<{
	template: Template
	childTemplate: ChildTemplate
	i: number
	setTemplate: (
		key: keyof ChildTemplate,
		val: ChildTemplate[keyof ChildTemplate],
	) => void
}> = (props) => {
	let frontRef: HTMLDivElement | undefined
	let backRef: HTMLDivElement | undefined
	let frontView: EditorView
	let backView: EditorView
	onMount(() => {
		frontView = new EditorView({
			parent: frontRef,
			dispatch: (tr) => {
				dispatch('front', tr, frontView, props.setTemplate)
			},
			state: createEditorState(props.childTemplate.front),
		})
		backView = new EditorView({
			parent: backRef,
			dispatch: (tr) => {
				dispatch('back', tr, backView, props.setTemplate)
			},
			state: createEditorState(props.childTemplate.back),
		})
		new ResizeObserver(() => {
			frontView.requestMeasure()
		}).observe(frontRef!)
		new ResizeObserver(() => {
			backView.requestMeasure()
		}).observe(backRef!)
	})
	onCleanup(() => {
		frontView?.destroy()
		backView?.destroy()
	})
	return (
		<fieldset class='border-black border p-2'>
			<legend>
				<input
					class='w-full border'
					type='text'
					value={props.childTemplate.name}
					onInput={(e) => {
						props.setTemplate('name', e.currentTarget.value)
					}}
				/>
			</legend>
			<div class='h-fit'>
				<div class='flex h-fit'>
					<div class='h-[500px] flex-1 resize-y overflow-auto' ref={frontRef} />
					<ResizingIframe
						class='flex-1'
						i={{
							tag: 'template',
							side: 'front',
							template: props.template,
							index: props.i,
						}}
					/>
				</div>
				<div class='flex h-fit'>
					<div class='h-[500px] flex-1 resize-y overflow-auto' ref={backRef} />
					<ResizingIframe
						class='flex-1'
						i={{
							tag: 'template',
							side: 'back',
							template: props.template,
							index: props.i,
						}}
					/>
				</div>
			</div>
		</fieldset>
	)
}

export default EditChildTemplate

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
	side: 'front' | 'back',
	tr: Transaction,
	editorView: EditorView,
	setTemplate: (
		key: keyof ChildTemplate,
		val: ChildTemplate[keyof ChildTemplate],
	) => void,
) {
	if (editorView == null) return
	editorView.update([tr])
	if (tr.docChanged) {
		const newCode = tr.newDoc.sliceString(0, tr.newDoc.length)
		setTemplate(side, newCode)
	}
}

function createEditorState(doc: string) {
	return EditorState.create({
		doc,
		extensions: [[...basicSetup], html()],
	})
}
