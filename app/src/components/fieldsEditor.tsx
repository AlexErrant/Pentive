import { For, type VoidComponent } from "solid-js"
import { FieldEditor } from "./fieldEditor"
import { type NoteCardView } from "../pages/cards"

export const FieldsEditor: VoidComponent<{
  readonly noteCard: NoteCardView
}> = (props) => {
  return (
    <>
      <For each={props.noteCard.note.fieldValues}>
        {([field, value]) => FieldEditor({ field, value })}
      </For>
    </>
  )
}
