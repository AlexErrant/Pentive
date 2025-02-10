import { createSignal, type VoidComponent, Show } from 'solid-js'
import { FieldEditor } from './fieldEditor'
import type { SetStoreFunction } from 'solid-js/store'
import FieldHtmlEditor from './fieldHtmlEditor'
import { ToggleButton } from '@kobalte/core'
import { ChevronDown, Code, Quote } from 'shared-dom/icons'
import type { NoteCardView } from '../uiLogic/cards'
import type { NoteId } from 'shared/brand'
import { Entries } from '@solid-primitives/keyed'

export const FieldsEditor: VoidComponent<{
	readonly noteCard: NoteCardView
	readonly setNoteCard: SetStoreFunction<{
		noteCard?: NoteCardView
	}>
}> = (props) => {
	return (
		<Entries of={props.noteCard.note.fieldValues}>
			{(field, value) => (
				<FieldValue
					css={props.noteCard.template.css}
					setNoteCard={props.setNoteCard}
					field={field}
					value={value()}
					noteId={props.noteCard.note.id}
				/>
			)}
		</Entries>
	)
}

const FieldValue: VoidComponent<{
	field: string
	value: string
	css: string
	noteId: NoteId
	setNoteCard: SetStoreFunction<{
		noteCard?: NoteCardView
	}>
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
						{props.field}
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
							field={props.field}
							value={props.value}
							setNoteCard={props.setNoteCard}
							noteId={props.noteId}
						/>
					}
				>
					<FieldHtmlEditor
						value={props.value}
						css={props.css}
						noteId={props.noteId}
						setValue={(v) => {
							props.setNoteCard(
								'noteCard',
								'note',
								'fieldValues',
								props.field,
								v,
							)
						}}
					/>
				</Show>
			</Show>
		</>
	)
}
