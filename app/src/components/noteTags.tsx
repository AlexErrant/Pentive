import { createSignal, type VoidComponent } from 'solid-js'
import { createOptions, Select } from '@thisbeyond/solid-select'
import '@thisbeyond/solid-select/style.css'
import 'shared-dom/solidSelect.css'
import { type NoteCardView } from '../uiLogic/cards'
import { C } from '../topLevelAwait'
import { createAsync } from '@solidjs/router'

const NoteTags: VoidComponent<{
	readonly noteCard: NoteCardView
}> = (props) => {
	const dbTags = createAsync(async () => await C.db.getTags(), {
		initialValue: [],
	})
	const selectProps = () =>
		createOptions(dbTags(), {
			createable: true,
		})
	const [tags, setTags] = createSignal<string[]>([])
	return (
		<>
			<Select
				class='bg-white'
				multiple
				{...selectProps()}
				initialValue={Array.from(props.noteCard.note.tags)}
				onChange={(newTags: string[]) => {
					setTags(newTags)
				}}
			/>
			<button
				onClick={async () => {
					await C.db.saveTags(props.noteCard.note.id, tags())
				}}
			>
				Save
			</button>
		</>
	)
}

export default NoteTags
