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
		<fieldset class='border-black border p-1'>
			<legend>
				<span class='p-2 px-4 font-bold'>{props.title}</span>
			</legend>
			<For each={props.changes}>
				{({ added, removed, value }) => (
					<span
						classList={{ 'text-red-500': removed, 'text-green-500': added }}
					>
						{value}
					</span>
				)}
			</For>
		</fieldset>
	</Show>
)

export default Diff
