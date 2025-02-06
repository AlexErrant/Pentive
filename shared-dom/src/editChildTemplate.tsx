import { EditorState, type Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
	createEffect,
	on,
	onCleanup,
	onMount,
	type VoidComponent,
} from 'solid-js'
import { type Template } from 'shared/domain/template'
import { oneDark } from '@codemirror/theme-one-dark'
import { html } from '@codemirror/lang-html'
import { getOk } from './cardHtml'
import { htmlTemplateLanguage } from './language/htmlTemplateParser'
import { templateLinter } from './language/templateLinter'
import { type RenderContainer } from './renderContainer'
import { basicSetup } from './codemirror'
import { disposeObserver } from './utility'
import { type ChildTemplate } from 'shared/schema'

const EditChildTemplate: VoidComponent<{
	template: Template
	childTemplate: ChildTemplate
	i: number
	setTemplate: (
		key: keyof ChildTemplate,
		val: ChildTemplate[keyof ChildTemplate],
	) => void
	renderContainer: RenderContainer
	theme: 'light' | 'dark'
}> = (props) => {
	let frontRef: HTMLDivElement
	let backRef: HTMLDivElement
	let frontView: EditorView
	let backView: EditorView
	let frontRo: ResizeObserver
	let backRo: ResizeObserver
	onMount(() => {
		frontView = new EditorView({
			parent: frontRef,
			dispatch: (tr) => {
				dispatch('front', tr, frontView, props.setTemplate)
			},
			state: createEditorState(props.childTemplate.front, props.theme),
		})
		backView = new EditorView({
			parent: backRef,
			dispatch: (tr) => {
				dispatch('back', tr, backView, props.setTemplate)
			},
			state: createEditorState(props.childTemplate.back, props.theme),
		})
		frontRo = new ResizeObserver(() => {
			frontView.requestMeasure()
		})
		frontRo.observe(frontRef)
		backRo = new ResizeObserver(() => {
			backView.requestMeasure()
		})
		backRo.observe(backRef)
	})
	createEffect(
		on(
			// Only run this effect when the theme changes!
			// i.e. Don't run when childTemplate.front/back changes - it resets the cursor position.
			() => props.theme,
			(t) => {
				frontView.setState(createEditorState(props.childTemplate.front, t))
				backView.setState(createEditorState(props.childTemplate.back, t))
			},
			{ defer: true },
		),
	)
	onCleanup(() => {
		frontView.destroy()
		backView.destroy()
		disposeObserver(frontRo, frontRef)
		disposeObserver(backRo, backRef)
	})
	const short = () =>
		getOk(props.renderContainer.renderTemplate(props.template, true)[props.i])
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
						ref={frontRef!}
					/>
					<props.renderContainer.resizingIframe
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
						ref={backRef!}
					/>
					<props.renderContainer.resizingIframe
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
					class='form-textarea flex-1'
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
					class='form-textarea flex-1'
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
		extensions: [
			[...basicSetup],
			...maybeDark,
			htmlTemplateLanguage,
			html().support,
			templateLinter,
		],
	})
}
