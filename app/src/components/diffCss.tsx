import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { css } from '@codemirror/lang-css'
import {
	createEffect,
	on,
	onCleanup,
	onMount,
	type VoidComponent,
	Show,
} from 'solid-js'
import { oneDark } from '@codemirror/theme-one-dark'
import { basicSetup } from 'shared-dom/codemirror'
import { MergeView } from '@codemirror/merge'
import { useThemeContext } from 'shared-dom/themeSelector'
import { disposeObserver } from 'shared-dom/utility'

const DiffCss: VoidComponent<{
	before?: string
	after?: string
}> = (props) => (
	<Show when={props.before !== props.after}>
		<MergeComp before={props.before ?? ''} after={props.after ?? ''} />
	</Show>
)

export default DiffCss

const MergeComp: VoidComponent<{
	before: string
	after: string
}> = (props) => {
	const [theme] = useThemeContext()
	let ref: HTMLDivElement
	let view: MergeView
	let ro: ResizeObserver
	onMount(() => {
		view = new MergeView({
			parent: ref,
			a: createConfig(props.before, theme()),
			b: createConfig(props.after, theme()),
		})
		ro = new ResizeObserver(() => {
			view.a.requestMeasure()
			view.b.requestMeasure()
		})
		ro.observe(ref)
	})
	createEffect(
		on(
			// Only run this effect when the theme changes
			theme,
			(t) => {
				view.a.setState(EditorState.create(createConfig(props.before, t)))
				view.b.setState(EditorState.create(createConfig(props.after, t)))
			},
			{ defer: true },
		),
	)
	onCleanup(() => {
		view.destroy()
		disposeObserver(ro, ref)
	})
	return (
		<fieldset class='border-black border p-2'>
			<legend>
				<span class='p-2 px-4 font-bold'>CSS</span>
			</legend>
			<div class='max-h-[500px] resize-y overflow-auto' ref={ref!} />
		</fieldset>
	)
}

function createConfig(doc: string, theme: 'light' | 'dark') {
	const maybeDark = theme === 'dark' ? [oneDark] : []
	return {
		doc,
		extensions: [
			[...basicSetup],
			EditorView.editable.of(false),
			EditorState.readOnly.of(true),
			css(),
			...maybeDark,
		],
	}
}
