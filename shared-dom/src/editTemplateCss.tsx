import { EditorState, type Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { css } from '@codemirror/lang-css'
import {
	createEffect,
	on,
	onCleanup,
	onMount,
	type VoidComponent,
} from 'solid-js'
import { type Template } from 'shared/domain/template'
import { type SetStoreFunction } from 'solid-js/store'
import { oneDark } from '@codemirror/theme-one-dark'
import { basicSetup } from './codemirror'

export const EditTemplateCss: VoidComponent<{
	template: Template
	setTemplate: SetStoreFunction<{
		template: Template
	}>
	theme: 'light' | 'dark'
}> = (props) => {
	let ref!: HTMLDivElement
	let view: EditorView
	onMount(() => {
		view = new EditorView({
			parent: ref,
			dispatch: (tr) => {
				dispatch(tr, view, props.setTemplate)
			},
			state: createEditorState(props.template.css, props.theme),
		})
	})
	createEffect(
		on(
			() => props.template.id,
			() => {
				view.setState(createEditorState(props.template.css, props.theme))
			},
		),
	)
	createEffect(
		on(
			// Only run this effect when the theme changes!
			// i.e. Don't run when childTemplate.front/back changes - it resets the cursor position.
			() => props.theme,
			(t) => {
				view.setState(createEditorState(props.template.css, t))
			},
			{ defer: true },
		),
	)
	onCleanup(() => {
		view.destroy()
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

function dispatch(
	tr: Transaction,
	editorView: EditorView,
	setTemplate: SetStoreFunction<{
		template: Template
	}>,
) {
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
