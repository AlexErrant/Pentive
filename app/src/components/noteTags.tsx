import { createResource, type VoidComponent } from 'solid-js'
import { db } from '../db'
import { createOptions, Select } from '@thisbeyond/solid-select'
import { type NoteCardView } from '../pages/cards'

const NoteTags: VoidComponent<{
	readonly noteCard: NoteCardView
}> = (props) => {
	const [tags] = createResource(db.getTags, {
		initialValue: [],
	})
	const selectProps = () =>
		createOptions(tags(), {
			createable: true,
		})
	return (
		<Select
			multiple
			{...selectProps()}
			initialValue={Array.from(props.noteCard.note.tags)}
		/>
	)
}

export default NoteTags
