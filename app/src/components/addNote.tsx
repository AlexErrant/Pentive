import { Select } from '@thisbeyond/solid-select'
import '@thisbeyond/solid-select/style.css'
import 'shared-dom/solidSelect.css'
import {
	Show,
	type VoidComponent,
	createEffect,
	createSignal,
	on,
} from 'solid-js'
import { FieldsEditor } from '../components/fieldsEditor'
import { ulidAsBase64Url } from '../domain/utility'
import { createStore } from 'solid-js/store'
import { C, tx } from '../topLevelAwait'
import { CardsPreview } from '../components/cardsPreview'
import { toNoteCards, type NoteCardView } from '../uiLogic/cards'
import { type Template } from 'shared/domain/template'
import { type Card } from 'shared/domain/card'
import { type NoteId, type CardId, type MediaId } from 'shared/brand'
import { assertNever, objEntries, objValues } from 'shared/utility'
import { CardsRemote } from './cardsRemote'
import { createMutation } from '@tanstack/solid-query'
import { useTableCountContext } from './tableCountContext'
import { parseHtml } from 'shared-dom/utility'
import { createAsync } from '@solidjs/router'

function toView(template: Template): NoteCardView {
	const now = C.getDate()
	const note: NoteCardView['note'] = {
		id: ulidAsBase64Url() as NoteId,
		templateId: template.id,
		created: now,
		edited: now,
		tags: new Set(),
		fieldValues: Object.fromEntries(
			template.fields.map((f) => [f.name, ''] as const),
		),
		remotes: {},
	}
	return { template, note, cards: [] }
}

type AddEdit = 'add' | 'edit'

export const AddNote: VoidComponent<{
	readonly noteCard?: NoteCardView
	readonly type: AddEdit
}> = (props) => {
	const [, setNoteRowDelta] = useTableCountContext().noteRowDelta
	const templates = createAsync(async () => await C.db.getTemplates(), {
		initialValue: [],
	})
	const templateNames = () => templates().map((t) => t.name)
	const [template, setTemplate] = createSignal<Template>()
	const [wip, setWip] = createStore<{ noteCard?: NoteCardView }>({})
	createEffect(() => {
		setWip('noteCard', props.noteCard)
	})
	createEffect(() => {
		const t = template()
		if (t != null && props.noteCard == null) {
			setWip('noteCard', toView(t))
		}
	})
	createEffect(
		on(
			() => [
				wip.noteCard?.template,
				objValues(wip.noteCard?.note.fieldValues ?? {}),
			],
			() => {
				const note = wip.noteCard?.note
				const template = wip.noteCard?.template
				if (note != null && template != null) {
					const ords = C.noteOrds(note, template)
					const now = C.getDate()
					const cards = ords.map(
						(ord) =>
							({
								id: ulidAsBase64Url() as CardId,
								ord,
								noteId: note.id,
								tags: new Set(),
								created: now,
								edited: now,
								due: now,
								lapses: 0,
								repCount: 0,
							}) satisfies Card,
					)
					setWip('noteCard', 'cards', cards)
				}
			},
		),
	)
	const upsert = createMutation(() => ({
		mutationFn: async () => {
			const noteCard = wip.noteCard!
			if (noteCard.cards.length === 0)
				C.toastFatal('There must be at least 1 card')
			await tx(async () => {
				const fieldValues = await Promise.all(
					objEntries(noteCard.note.fieldValues).map(async ([f, v]) => {
						const doc = parseHtml(v)
						await Promise.all(
							Array.from(doc.images).map(async (i) => {
								await mutate(i)
							}),
						)
						return [f, doc.body.innerHTML] as const
					}),
				)
				const noteCards = toNoteCards({
					...noteCard,
					note: {
						...noteCard.note,
						fieldValues: Object.fromEntries(fieldValues),
					},
				})
				await C.db.upsertNote(noteCards[0]!.note)
				await C.db.bulkUpsertCards(noteCards.map((nc) => nc.card))
			})
		},
		onSuccess: () => {
			switch (props.type) {
				case 'add':
					setWip('noteCard', toView(wip.noteCard!.template)) // reset wip (to a "default" using the template)
					setNoteRowDelta(1)
					break
				case 'edit':
					setNoteRowDelta(0)
					break
				default:
					assertNever(props.type)
			}
		},
		onError: () => {
			C.toastError('Error occurred while saving, see console for details.')
		},
	}))
	return (
		<>
			<Select
				class='bg-white'
				initialValue={templateNames().at(0)}
				options={templateNames()}
				onChange={(value: string) =>
					setTemplate(templates().find((t) => t.name === value))
				}
			/>
			<Show when={wip.noteCard}>
				<FieldsEditor setNoteCard={setWip} noteCard={wip.noteCard!} />
				<CardsRemote setNoteCard={setWip} noteCard={wip.noteCard!} />
				<CardsPreview noteCard={wip.noteCard!} />
				<div>
					<button
						class='text-white bg-green-600 rounded p-2 px-4 font-bold hover:bg-green-700'
						disabled={upsert.isPending}
						onClick={async () => {
							await upsert.mutateAsync()
						}}
					>
						{upsert.isPending ? 'Saving...' : 'Save'}
					</button>
				</div>
			</Show>
		</>
	)
}

export default AddNote

async function mutate(img: HTMLImageElement) {
	const src = img.getAttribute('src')
	if (src == null || src === '') {
		// do nothing
	} else if (src.startsWith('data:')) {
		const now = C.getDate()
		const data = await (await fetch(src)).arrayBuffer()
		const id = ulidAsBase64Url() as string as MediaId
		await C.db.insertMedia({
			id,
			created: now,
			edited: now,
			data,
		})
		img.setAttribute('src', id)
	} else {
		// do nothing, is a regular URL
	}
}
