import { type VoidComponent, For, Show } from 'solid-js'
import { type Change } from 'diff'

const Diff: VoidComponent<{
	changes: Change[]
	title: string
}> = (props) => (
	<Show
		when={
			!(
				props.changes.length === 1 &&
				props.changes[0]!.added !== true &&
				props.changes[0]!.removed !== true
			)
		}
	>
		<div class='border-black border p-1'>
			<h3>{props.title}</h3>
			<For each={props.changes}>
				{({ added, removed, value }) => (
					<span
						classList={{ 'text-red-500': removed, 'text-green-500': added }}
					>
						{value}
					</span>
				)}
			</For>
		</div>
	</Show>
)

export default Diff
