import { For, type VoidComponent } from "solid-js"
import { FieldEditor } from "./fieldEditor"
import { type NoteCardView } from "../pages/cards"
import { type SetStoreFunction } from "solid-js/store"

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
    </>
  )
}
