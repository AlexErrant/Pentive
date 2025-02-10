import {
	EditorState,
	type Extension,
	type Transaction,
} from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
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
import { C } from '../topLevelAwait'
import { useThemeContext } from 'shared-dom/themeSelector'
import { basicSetup } from 'shared-dom/codemirror'
import { disposeObserver } from 'shared-dom/utility'
import { type NoteId } from 'shared/brand'
import { formatHtml } from '../domain/utility'

const FieldHtmlEditor: VoidComponent<{
	noteId: NoteId
	value: string
	setValue: (value: string) => void
	css: string
}> = (props) => {
	const [theme] = useThemeContext()
	let ref!: HTMLDivElement
	onMount(() => {
		const view = new EditorView({
			parent: ref,
			state: createEditorState('', theme()),
			dispatch: (tr) => {
				dispatch(tr, view, props.setValue)
			},
		})
		const ro = new ResizeObserver(() => {
			view.requestMeasure()
		})
		ro.observe(ref)
		createEffect(
			on([theme, () => props.noteId], async ([t]) => {
				// we nuke the editor state when the noteId changes to prevent things like undo history from transferring between notes
				view.setState(createEditorState(await formatHtml(props.value), t))
			}),
		)
		onCleanup(() => {
			view.destroy()
			disposeObserver(ro, ref)
		})
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

function dispatch(
	tr: Transaction,
	editorView: EditorView,
	setValue: (value: string) => void,
) {
	editorView.update([tr])
	if (tr.docChanged) {
		const newCode = tr.newDoc.sliceString(0, tr.newDoc.length)
		setValue(newCode)
	}
}

function createEditorState(
	doc: string,
	theme: 'light' | 'dark',
	extensions: Extension[] = [],
) {
	const maybeDark = theme === 'dark' ? [oneDark] : []
	return EditorState.create({
		doc,
		extensions: [
			keymap.of([
				{
					key: 'Shift-Alt-f',
					run: (view) => {
						formatHtml(view.state.doc.toString())
							.then((v) => {
								view.dispatch({
									changes: {
										from: 0,
										to: view.state.doc.length,
										insert: v,
									},
								})
							})
							.catch((e: unknown) => {
								C.toastError('Error while formatting.', e)
							})
						return true
					},
				},
			]),
			[...basicSetup],
			html(),
			...maybeDark,
			...extensions,
		],
	})
}

export const ReadonlyHtmlEditor: VoidComponent<{
	value: string
}> = (props) => {
	let ref!: HTMLDivElement
	onMount(() => {
		const [theme] = useThemeContext()
		const extensions = [
			EditorView.editable.of(false),
			EditorState.readOnly.of(true),
		]
		const view = new EditorView({
			parent: ref,
			state: createEditorState('', theme(), extensions),
		})
		const ro = new ResizeObserver(() => {
			view.requestMeasure()
		})
		ro.observe(ref)
		createEffect(
			on([theme, () => props.value], async ([t, v]) => {
				// we nuke the editor state when the noteId changes to prevent things like undo history from transferring between notes
				view.setState(createEditorState(await formatHtml(v), t, extensions))
			}),
		)
		onCleanup(() => {
			view.destroy()
			disposeObserver(ro, ref)
		})
	})
	return (
		<div
			class='flex-1 resize-y overflow-auto focus-within:border-black focus-within:border'
			ref={ref}
		/>
	)
}
