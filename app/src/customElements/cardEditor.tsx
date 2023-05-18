import { For, type VoidComponent } from "solid-js"
import ResizingIframe from "../customElements/resizingIframe"
import { type NoteCard } from "shared"
import { FieldEditor } from "./fieldEditor"
import { CardRemote } from "./cardRemote"

export const CardEditor: VoidComponent<{
  readonly noteCard: NoteCard
}> = (props) => {
  return (
    <>
      <CardRemote noteCard={props.noteCard} />
      <For each={Array.from(props.noteCard.note.fieldValues.entries() ?? [])}>
        {([field, value]) => FieldEditor({ field, value })}
      </For>
      <ResizingIframe
        i={{
          tag: "card",
          side: "front",
          templateId: props.noteCard.template.id,
          noteId: props.noteCard.note.id,
          cardId: props.noteCard.card.id,
        }}
      />
      <ResizingIframe
        i={{
          tag: "card",
          side: "back",
          templateId: props.noteCard.template.id,
          noteId: props.noteCard.note.id,
          cardId: props.noteCard.card.id,
        }}
      />
    </>
  )
}
