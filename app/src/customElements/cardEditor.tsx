import { type VoidComponent } from "solid-js"
import ResizingIframe from "../customElements/resizingIframe"
import { type NoteCard } from "shared"
import { CardRemote } from "./cardRemote"
import { FieldsEditor } from "./fieldsEditor"

export const CardEditor: VoidComponent<{
  readonly noteCard: NoteCard
}> = (props) => {
  return (
    <>
      <CardRemote noteCard={props.noteCard} />
      <FieldsEditor noteCard={props.noteCard} />
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
