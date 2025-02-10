import { type JSX, For, Show } from 'solid-js'
import { type Change } from 'diff'
import { throwExp } from 'shared/utility'

export default function Diff<T>(props: {
	title: string
	before: T | undefined
	after: T | undefined
	toChanges: (before?: T, after?: T) => Change[]
}): JSX.Element {
	return (
		<Show when={props.before !== props.after && props.before != null}>
			<fieldset class='border-black border p-1'>
				<legend>
					<span class='p-2 px-4 font-bold'>{props.title}</span>
				</legend>
				{props.before == null || props.after == null ? (
					<>{props.after ?? props.before ?? throwExp()}</>
				) : (
					<For each={props.toChanges(props.before, props.after)}>
						{({ added, removed, value }) => (
							<span
								classList={{
									'text-red-500': removed,
									'text-green-500': added,
								}}
							>
								{value}
							</span>
						)}
					</For>
				)}
			</fieldset>
		</Show>
	)
}
