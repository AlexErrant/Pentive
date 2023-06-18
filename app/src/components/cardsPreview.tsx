import { type VoidComponent } from "solid-js"
import ResizingIframe from "./resizingIframe"
import { toNoteCard, type NoteCardView } from "../pages/cards"

export const CardsPreview: VoidComponent<{
  readonly noteCard: NoteCardView
}> = (props) => {
  const noteCard = () => toNoteCard(props.noteCard)
  return (
    <>
      <ResizingIframe
        i={{
          tag: "manualCard",
          side: "front",
        }}
        noteCard={noteCard()}
      />
      <ResizingIframe
        i={{
          tag: "manualCard",
          side: "back",
        }}
        noteCard={noteCard()}
      />
    </>
  )
}
