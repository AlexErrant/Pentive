import { For, createSignal, type VoidComponent, Show } from 'solid-js'
import { FieldEditor } from './fieldEditor'
import { toNoteCards, type NoteCardView } from '../pages/cards'
import { type SetStoreFunction } from 'solid-js/store'
import { db } from '../db'
import { getKysely } from '../sqlite/crsqlite'
import { type MediaId } from 'shared'
import { type Transaction } from 'kysely'
import { type DB } from '../sqlite/database'
import { ulidAsBase64Url } from '../domain/utility'
import { toastFatal } from './toasts'
import FieldHtmlEditor from './fieldHtmlEditor'

export const FieldsEditor: VoidComponent<{
	readonly noteCard: NoteCardView
	readonly setNoteCard: SetStoreFunction<{
		noteCard?: NoteCardView
	}>
}> = (props) => {
	return (
		<>
			<For each={props.noteCard.note.fieldValues}>
				{(fv, i) => (
					<FieldValue
						css={props.noteCard.template.css}
						setNoteCard={props.setNoteCard}
						fieldValue={fv}
						i={i()}
					/>
				)}
			</For>
			<div>
				<button
					class='text-white bg-green-600 rounded p-2 px-4 font-bold hover:bg-green-700'
					onClick={async () => {
						if (props.noteCard.cards.length === 0)
							toastFatal('There must be at least 1 card')
						const kysely = await getKysely()
						const dp = new DOMParser()
						// eslint-disable-next-line solid/reactivity -- the fn isn't reactive
						await kysely.transaction().execute(async (trx) => {
							const fieldValues = await Promise.all(
								props.noteCard.note.fieldValues.map(async ([f, v]) => {
									const doc = dp.parseFromString(v, 'text/html')
									await Promise.all(
										Array.from(doc.images).map(async (i) => {
											await mutate(i, trx)
										}),
									)
									return [f, doc.body.innerHTML] as const
								}),
							)
							const noteCards = toNoteCards({
								...props.noteCard,
								note: { ...props.noteCard.note, fieldValues },
							})
							await db.upsertNote(noteCards[0]!.note, trx)
							await db.bulkUpsertCards(
								noteCards.map((nc) => nc.card),
								trx,
							)
						})
					}}
				>
					Save
				</button>
			</div>
		</>
	)
}

async function mutate(img: HTMLImageElement, trx: Transaction<DB>) {
	const src = img.getAttribute('src')
	if (src == null || src === '') {
		// do nothing
	} else if (src.startsWith('data:')) {
		const now = new Date()
		const data = await (await fetch(src)).arrayBuffer()
		const id = ulidAsBase64Url() as string as MediaId
		await db.insertMediaTrx(
			{
				id,
				created: now,
				updated: now,
				data,
			},
			trx,
		)
		img.setAttribute('src', id)
	} else {
		// do nothing, is a regular URL
	}
}

const FieldValue: VoidComponent<{
	fieldValue: readonly [string, string]
	css: string
	setNoteCard: SetStoreFunction<{
		noteCard?: NoteCardView
	}>
	i: number
}> = (props) => {
	const [isDev, setDev] = createSignal(false)
	return (
		<>
			<div
				onClick={() => {
					setDev((x) => !x)
				}}
			>
				{props.fieldValue[0]}
			</div>
			<Show
				when={isDev()}
				fallback={
					<FieldEditor
						field={props.fieldValue[0]}
						value={props.fieldValue[1]}
						setNoteCard={props.setNoteCard}
						i={props.i}
					/>
				}
			>
				<FieldHtmlEditor
					value={props.fieldValue[1]}
					css={props.css}
					setValue={(v) => {
						props.setNoteCard('noteCard', 'note', 'fieldValues', props.i, 1, v)
					}}
				/>
			</Show>
		</>
	)
}
