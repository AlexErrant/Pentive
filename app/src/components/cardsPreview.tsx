import { type VoidComponent } from "solid-js"
import ResizingIframe from "./resizingIframe"
import { type NoteCardView } from "../pages/cards"

export const CardsPreview: VoidComponent<{
  readonly noteCard: NoteCardView
}> = (props) => {
  return (
    <>
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
