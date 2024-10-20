import { For, createSignal, type VoidComponent, Show } from 'solid-js'
import { FieldEditor } from './fieldEditor'
import { type SetStoreFunction } from 'solid-js/store'
import { db } from '../db'
import { ulidAsBase64Url } from '../domain/utility'
import FieldHtmlEditor from './fieldHtmlEditor'
import { ToggleButton } from '@kobalte/core'
import { ChevronDown, Code, Quote } from 'shared-dom/icons'
import { C, tx } from '../topLevelAwait'
import { toNoteCards, type NoteCardView } from '../uiLogic/cards'
import { type MediaId } from 'shared/brand'

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
							C.toastFatal('There must be at least 1 card')
						const dp = new DOMParser()
						// eslint-disable-next-line solid/reactivity -- the fn isn't reactive
						await tx(async () => {
							const fieldValues = await Promise.all(
								props.noteCard.note.fieldValues.map(async ([f, v]) => {
									const doc = dp.parseFromString(v, 'text/html')
									await Promise.all(
										Array.from(doc.images).map(async (i) => {
											await mutate(i)
										}),
									)
									return [f, doc.body.innerHTML] satisfies [string, string]
								}),
							)
							const noteCards = toNoteCards({
								...props.noteCard,
								note: { ...props.noteCard.note, fieldValues },
							})
							await db.upsertNote(noteCards[0]!.note)
							await db.bulkUpsertCards(noteCards.map((nc) => nc.card))
						})
					}}
				>
					Save
				</button>
			</div>
		</>
	)
}

async function mutate(img: HTMLImageElement) {
	const src = img.getAttribute('src')
	if (src == null || src === '') {
		// do nothing
	} else if (src.startsWith('data:')) {
		const now = C.getDate()
		const data = await (await fetch(src)).arrayBuffer()
		const id = ulidAsBase64Url() as string as MediaId
		await db.insertMedia({
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

const FieldValue: VoidComponent<{
	fieldValue: readonly [string, string]
	css: string
	setNoteCard: SetStoreFunction<{
		noteCard?: NoteCardView
	}>
	i: number
}> = (props) => {
	const [isDev, setDev] = createSignal(false)
	const [isOpen, setOpen] = createSignal(true)
	return (
		<>
			<div class='flex items-center justify-between'>
				<ToggleButton.Root
					class='focus-visible:outline-offset-1'
					aria-label='Field Value editor toggle'
					pressed={isOpen()}
					onChange={setOpen}
				>
					<div class='flex items-center gap-2'>
						<ChevronDown
							class='h-3 w-3'
							classList={{ '-rotate-90': !isOpen() }}
						/>
						{props.fieldValue[0]}
					</div>
				</ToggleButton.Root>
				<Show when={isOpen()}>
					<ToggleButton.Root
						class='h-5 w-5 rounded-md focus-visible:outline-offset-1'
						aria-label='code and wysiwyg toggle'
						pressed={isDev()}
						onChange={setDev}
					>
						{isDev() ? <Quote /> : <Code />}
					</ToggleButton.Root>
				</Show>
			</div>
			<Show when={isOpen()}>
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
							props.setNoteCard(
								'noteCard',
								'note',
								'fieldValues',
								props.i,
								1,
								v,
							)
						}}
					/>
				</Show>
			</Show>
		</>
	)
}
