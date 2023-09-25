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
import { type Template, type ChildTemplate } from 'shared'
import ResizingIframe from './resizingIframe'
import { C } from '../pluginManager'
import { oneDark } from '@codemirror/theme-one-dark'
import { theme } from '../globalState'

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
		const t = theme()
		frontView = new EditorView({
			parent: frontRef,
			dispatch: (tr) => {
				dispatch('front', tr, frontView, props.setTemplate)
			},
			state: createEditorState(props.childTemplate.front, t),
		})
		backView = new EditorView({
			parent: backRef,
			dispatch: (tr) => {
				dispatch('back', tr, backView, props.setTemplate)
			},
			state: createEditorState(props.childTemplate.back, t),
		})
		new ResizeObserver(() => {
			frontView.requestMeasure()
		}).observe(frontRef!)
		new ResizeObserver(() => {
			backView.requestMeasure()
		}).observe(backRef!)
	})
	createEffect(
		on(theme, (t) => {
			frontView.setState(createEditorState(props.childTemplate.front, t))
			backView.setState(createEditorState(props.childTemplate.back, t))
		}),
	)
	onCleanup(() => {
		frontView?.destroy()
		backView?.destroy()
	})
	const short = () => C.renderTemplate(props.template, true)[props.i]
	return (
		<fieldset class='border-black border p-2'>
			<legend>
				<input
					class='form-input w-full border'
					type='text'
					value={props.childTemplate.name}
					onInput={(e) => {
						props.setTemplate('name', e.currentTarget.value)
					}}
				/>
			</legend>
			<div class='h-fit'>
				<div class='flex h-fit'>
					<div
						class='max-h-[500px] flex-1 resize-y overflow-auto focus-within:border-black focus-within:border'
						ref={frontRef}
					/>
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
					<div
						class='max-h-[500px] flex-1 resize-y overflow-auto focus-within:border-black focus-within:border'
						ref={backRef}
					/>
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
			<div class='flex h-fit'>
				<textarea
					class='bg-white form-textarea flex-1'
					value={props.childTemplate.shortFront ?? ''}
					onInput={(e) => {
						props.setTemplate('shortFront', e.currentTarget.value)
					}}
				/>
				<div class='flex-1'>
					{short()?.at(0) ?? 'There is a problem with your template.'}
				</div>
			</div>
			<div class='flex h-fit'>
				<textarea
					class='bg-white form-textarea flex-1'
					value={props.childTemplate.shortBack ?? ''}
					onInput={(e) => {
						props.setTemplate('shortBack', e.currentTarget.value)
					}}
				/>
				<div class='flex-1'>
					{short()?.at(1) ?? 'There is a problem with your template.'}
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

function createEditorState(doc: string, theme: 'light' | 'dark') {
	const maybeDark = theme === 'dark' ? [oneDark] : []
	return EditorState.create({
		doc,
		extensions: [[...basicSetup], html(), ...maybeDark],
	})
}
