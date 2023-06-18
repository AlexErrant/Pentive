import { For, type VoidComponent } from "solid-js"
import { FieldEditor } from "./fieldEditor"
import { toNoteCard, type NoteCardView } from "../pages/cards"
import { type SetStoreFunction } from "solid-js/store"
import { db } from "../db"

export const FieldsEditor: VoidComponent<{
  readonly noteCard: NoteCardView
  readonly setNoteCard: SetStoreFunction<{
    selected?: NoteCardView
  }>
}> = (props) => {
  return (
    <>
      <For each={props.noteCard.note.fieldValues}>
        {([field, value], i) => (
          <FieldEditor
            field={field}
            value={value}
            setNoteCard={props.setNoteCard}
            i={i()}
          />
        )}
      </For>
      <button
        onClick={async () => {
          await db.upsertNote(toNoteCard(props.noteCard).note)
        }}
      >
        Save
      </button>
    </>
  )
}
