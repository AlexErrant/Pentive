import { For, type VoidComponent } from "solid-js"
import { type NoteCard } from "shared"
import { FieldEditor } from "./fieldEditor"

export const FieldsEditor: VoidComponent<{
  readonly noteCard: NoteCard
}> = (props) => {
  return (
    <>
      <For each={Array.from(props.noteCard.note.fieldValues.entries() ?? [])}>
        {([field, value]) => FieldEditor({ field, value })}
      </For>
    </>
  )
}
