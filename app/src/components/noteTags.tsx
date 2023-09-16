import { createResource, type VoidComponent } from 'solid-js'
import { db } from '../db'
import { createOptions, Select } from '@thisbeyond/solid-select'
import { type NoteCardView } from '../pages/cards'
import '@thisbeyond/solid-select/style.css'
import './solidSelect.css'

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
			class='bg-white'
			multiple
			{...selectProps()}
			initialValue={Array.from(props.noteCard.note.tags)}
		/>
	)
}

export default NoteTags
