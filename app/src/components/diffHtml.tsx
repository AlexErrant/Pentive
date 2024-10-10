import { type VoidComponent, Match, Show, Switch } from 'solid-js'
import ResizingIframe from './resizingIframe'
import diffHtml from 'node-htmldiff'
import { useDiffModeContext } from './diffModeContext'

const DiffHtml: VoidComponent<{
	before: string
	after: string
	css: string
	title: string
}> = (props) => {
	const [diffMode] = useDiffModeContext()
	return (
		<div class='border-black m-2 border p-1'>
			<h3>
				{props.title}
				<Show when={props.before === props.after}>
					{' '}
					- <em>No changes</em>
				</Show>
			</h3>
			<Switch>
				<Match when={diffMode() === 'pretty'}>
					<ResizingIframe
						i={{
							tag: 'raw',
							html: diffHtml(props.before, props.after),
							css: props.css + 'ins{background:palegreen}del{background:pink}',
						}}
					/>
				</Match>
				<Match when={diffMode() === 'split'}>TODO</Match>
			</Switch>
		</div>
	)
}

export default DiffHtml
