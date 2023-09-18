import { createResource, createSignal, type VoidComponent } from 'solid-js'
import { db } from '../db'
import { createOptions, Select } from '@thisbeyond/solid-select'
import { type NoteCardView } from '../pages/cards'
import '@thisbeyond/solid-select/style.css'
import './solidSelect.css'

const NoteTags: VoidComponent<{
	readonly noteCard: NoteCardView
}> = (props) => {
	const [dbTags] = createResource(db.getTags, {
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
					await db.saveTags(props.noteCard.note.id, tags())
				}}
			>
				Save
			</button>
		</>
	)
}

export default NoteTags
