import { Select } from '@thisbeyond/solid-select'
import '@thisbeyond/solid-select/style.css'
import './solidSelect.css'
import {
	Show,
	Suspense,
	createEffect,
	createResource,
	createSignal,
	on,
} from 'solid-js'
import { FieldsEditor } from '../components/fieldsEditor'
import {
	type Note,
	type Card,
	type CardId,
	type NoteId,
	type Template,
} from 'shared'
import { ulidAsBase64Url } from '../domain/utility'
import { createStore } from 'solid-js/store'
import { type NoteCardView } from '../pages/cards'
import { C } from '../pluginManager'
import { CardsPreview } from '../components/cardsPreview'
import { db } from '../db'

function toView(template: Template): NoteCardView {
	const now = new Date()
	const note: NoteCardView['note'] = {
		id: ulidAsBase64Url() as NoteId,
		templateId: template.id,
		created: now,
		updated: now,
		tags: new Set(),
		fieldValues: template.fields.map((f) => [f.name, ''] as const),
		remotes: new Map(),
	}
	return { template, note, cards: [] }
}

function toNote(note: NoteCardView['note']) {
	return {
		...note,
		fieldValues: new Map(note.fieldValues),
	} satisfies Note
}

export default function AddNote() {
	const [templates] = createResource(db.getTemplates, { initialValue: [] })
	const templateNames = () => templates()?.map((t) => t.name) ?? []
	const [template, setTemplate] = createSignal<Template>()
	const [wip, setWip] = createStore<{ noteCard?: NoteCardView }>({})
	createEffect(() => {
		if (template() != null) {
			const t = template()!
			setWip('noteCard', toView(t))
		}
	})
	createEffect(
		on(
			() => [
				wip.noteCard?.template,
				wip.noteCard?.note.fieldValues.map((x) => x[1]),
			],
			() => {
				const note = wip.noteCard?.note
				const template = wip.noteCard?.template
				if (note != null && template != null) {
					const ords = C().noteOrds(toNote(note), template)
					const now = new Date()
					const cards = ords.map((ord) => {
						return {
							id: ulidAsBase64Url() as CardId,
							ord,
							noteId: note.id,
							tags: new Set(),
							created: now,
							updated: now,
							due: now,
						} satisfies Card
					})
					setWip('noteCard', 'cards', cards)
				}
			},
		),
	)

	return (
		<>
			<Suspense fallback={<span>Loading...</span>}>
				<Select
					class='bg-white'
					initialValue={templateNames().at(0)}
					options={templateNames()}
					onChange={(value: string) =>
						setTemplate(templates()?.find((t) => t.name === value))
					}
				/>
				<Show when={wip.noteCard}>
					<FieldsEditor setNoteCard={setWip} noteCard={wip.noteCard!} />
					<CardsPreview noteCard={wip.noteCard!} />
				</Show>
			</Suspense>
		</>
	)
}
