import {
	type VoidComponent,
	createEffect,
	Match,
	on,
	onCleanup,
	onMount,
	Show,
	Switch,
} from 'solid-js'
import ResizingIframe from './resizingIframe'
import diffHtml from 'node-htmldiff'
import { useDiffModeContext } from './diffModeContext'
import { MergeView } from '@codemirror/merge'
import { useThemeContext } from 'shared-dom/themeSelector'
import { EditorState, type Extension } from '@codemirror/state'
import { basicSetup } from 'shared-dom/codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import { type LRLanguage } from '@codemirror/language'
import { createAsync } from '@solidjs/router'
import { formatHtml } from '../domain/utility'
import { ReadonlyHtmlEditor } from './fieldHtmlEditor'
import { throwExp } from 'shared/utility'

const DiffHtml: VoidComponent<{
	extensions: Array<Extension | LRLanguage>
	before?: string
	after?: string
	css: string
	title: string
}> = (props) => {
	const [diffMode] = useDiffModeContext()
	const formatted = createAsync(
		async () =>
			await Promise.all([
				formatHtml(props.before ?? ''),
				formatHtml(props.after ?? ''),
			] as const),
	)
	const isChanged = () => Boolean(formatted()?.[0]) && Boolean(formatted()?.[1])
	return (
		<Show when={formatted()?.[0] !== formatted()?.[1]}>
			<fieldset class='border-black border p-1'>
				<legend>
					<span class='p-2 px-4 font-bold'>{props.title}</span>
				</legend>
				<Switch>
					<Match when={formatted()?.[0] === formatted()?.[1]}>
						<></>
					</Match>
					<Match when={diffMode() === 'pretty'}>
						<ResizingIframe
							i={{
								tag: 'raw',
								html: diffHtml(formatted()?.[0] ?? '', formatted()?.[1] ?? ''),
								css:
									props.css +
									(isChanged()
										? 'ins{background:palegreen}del{background:pink}'
										: ''),
							}}
						/>
					</Match>
					<Match when={diffMode() === 'split'}>
						<Show
							when={isChanged()}
							fallback={
								<ReadonlyHtmlEditor
									value={formatted()?.[1] ?? formatted()?.[0] ?? throwExp()}
								/>
							}
						>
							<MergeComp
								before={formatted()?.[0] ?? ''}
								after={formatted()?.[1] ?? ''}
								extensions={props.extensions}
							/>
						</Show>
					</Match>
				</Switch>
			</fieldset>
		</Show>
	)
}

export default DiffHtml

const MergeComp: VoidComponent<{
	extensions: Array<Extension | LRLanguage>
	before: string
	after: string
}> = (props) => {
	let ref!: HTMLDivElement
	onMount(() => {
		const [theme] = useThemeContext()
		const view = new MergeView({
			parent: ref,
			a: createConfig(props.before, theme(), props.extensions),
			b: createConfig(props.after, theme(), props.extensions),
		})
		createEffect(
			on(
				// Only run this effect when the theme changes
				theme,
				(t) => {
					view.a.setState(
						EditorState.create(createConfig(props.before, t, props.extensions)),
					)
					view.b.setState(
						EditorState.create(createConfig(props.after, t, props.extensions)),
					)
				},
				{ defer: true },
			),
		)
		onCleanup(() => {
			view.destroy()
		})
	})
	return <div class='max-h-[500px] resize-y overflow-auto' ref={ref} />
}

function createConfig(
	doc: string,
	theme: 'light' | 'dark',
	extensions: Array<Extension | LRLanguage>,
) {
	const maybeDark = theme === 'dark' ? [oneDark] : []
	return {
		doc,
		extensions: [
			[...basicSetup],
			EditorView.editable.of(false),
			EditorState.readOnly.of(true),
			...maybeDark,
			[...(doc === '' ? [] : extensions)], // no need for any extensions if template is empty
		],
	}
}
